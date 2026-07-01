/* ============================================================
   Orchestrazione partita: creazione game_state, applicazione
   mosse con concorrenza ottimistica (rev) in transazione,
   timeout di turno, manche successiva.
   ============================================================ */
import type { GameState, Seat, Move, Mode } from '@burraco/shared';
import { newGame, applyMove, applyTimeout, startNextRound, buildView, otherSeat, type PublicView } from '@burraco/shared';
import { query, tx } from './db.js';
import type { RoomRow } from './rooms.js';

interface GameRow {
  id: string;
  room_id: string;
  state: GameState;
  rev: number;
  status: string;
}

export type MoveOutcome =
  | { status: 'ok'; state: GameState; rev: number }
  | { status: 'stale'; rev: number }
  | { status: 'error'; error: string };

export async function createGameForRoom(room: RoomRow, opts: { now?: number } = {}): Promise<GameRow> {
  const state = newGame(room.game_mode, { now: opts.now });
  const r = await query<GameRow>(
    `INSERT INTO games (room_id, state, rev, status) VALUES ($1, $2::jsonb, $3, 'playing') RETURNING *`,
    [room.id, JSON.stringify(state), state.rev],
  );
  return r.rows[0]!;
}

export async function loadGame(roomId: string): Promise<{ state: GameState; rev: number } | null> {
  const r = await query<{ state: GameState; rev: number }>(
    'SELECT state, rev FROM games WHERE room_id = $1',
    [roomId],
  );
  return r.rows[0] ?? null;
}

async function persist(
  client: import('pg').PoolClient,
  roomId: string,
  ns: GameState,
): Promise<void> {
  const status = ns.phase === 'finished' ? 'finished' : 'playing';
  await client.query(
    'UPDATE games SET state = $1::jsonb, rev = $2, status = $3, updated_at = now() WHERE room_id = $4',
    [JSON.stringify(ns), ns.rev, status, roomId],
  );
  if (ns.phase === 'finished') {
    await client.query("UPDATE rooms SET status = 'finished' WHERE id = $1", [roomId]);
  } else {
    // ritenzione scorrevole: la partita resta ripristinabile per 14 giorni dall'ultima mossa
    await client.query(
      "UPDATE rooms SET status = 'playing', expires_at = now() + interval '14 days' WHERE id = $1",
      [roomId],
    );
  }
}

/** Applica una mossa con lock di riga (FOR UPDATE) + confronto rev (spec §14). */
export async function applyMoveTx(
  roomId: string,
  seat: Seat,
  baseRev: number,
  move: Move,
  opts: { now?: number } = {},
): Promise<MoveOutcome> {
  return tx(async (client) => {
    const sel = await client.query<{ state: GameState; rev: number }>(
      'SELECT state, rev FROM games WHERE room_id = $1 FOR UPDATE',
      [roomId],
    );
    const row = sel.rows[0];
    if (!row) return { status: 'error', error: 'Partita non trovata' };
    if (row.rev !== baseRev) return { status: 'stale', rev: row.rev };
    const res = applyMove(row.state, seat, move, { now: opts.now });
    if (!res.ok || !res.state) return { status: 'error', error: res.error ?? 'Mossa non valida' };
    await persist(client, roomId, res.state);
    return { status: 'ok', state: res.state, rev: res.state.rev };
  });
}

/** Azione automatica allo scadere del timer del turno corrente. */
export async function applyTimeoutTx(roomId: string, opts: { now?: number } = {}): Promise<MoveOutcome> {
  return tx(async (client) => {
    const sel = await client.query<{ state: GameState; rev: number }>(
      'SELECT state, rev FROM games WHERE room_id = $1 FOR UPDATE',
      [roomId],
    );
    const row = sel.rows[0];
    if (!row) return { status: 'error', error: 'Partita non trovata' };
    if (row.state.phase !== 'draw' && row.state.phase !== 'play') {
      return { status: 'error', error: 'Partita non in corso' };
    }
    const res = applyTimeout(row.state, row.state.turn, { now: opts.now });
    if (!res.ok || !res.state) return { status: 'error', error: res.error ?? 'Timeout fallito' };
    await persist(client, roomId, res.state);
    return { status: 'ok', state: res.state, rev: res.state.rev };
  });
}

/** Prepara la manche successiva (solo se la precedente è conclusa). */
export async function nextRoundTx(roomId: string, opts: { now?: number } = {}): Promise<MoveOutcome> {
  return tx(async (client) => {
    const sel = await client.query<{ state: GameState; rev: number }>(
      'SELECT state, rev FROM games WHERE room_id = $1 FOR UPDATE',
      [roomId],
    );
    const row = sel.rows[0];
    if (!row) return { status: 'error', error: 'Partita non trovata' };
    if (row.state.phase !== 'inter_round') return { status: 'error', error: 'Manche non conclusa' };
    const ns = startNextRound(row.state, { now: opts.now });
    await persist(client, roomId, ns);
    return { status: 'ok', state: ns, rev: ns.rev };
  });
}

/** Rivincita nella STESSA stanza: sostituisce la partita conclusa con una nuova
 *  (eventualmente con un tipo diverso). Il perdente inizia (pareggio → host).
 *  Rimette room.status='playing', aggiorna game_mode e ribumpa la scadenza. */
export async function rematchTx(roomId: string, mode: Mode, opts: { now?: number } = {}): Promise<MoveOutcome> {
  const now = opts.now ?? Date.now();
  return tx(async (client) => {
    const sel = await client.query<{ state: GameState; rev: number }>(
      'SELECT state, rev FROM games WHERE room_id = $1 FOR UPDATE',
      [roomId],
    );
    const row = sel.rows[0];
    if (!row) return { status: 'error', error: 'Partita non trovata' };
    if (row.state.phase !== 'finished') return { status: 'error', error: 'La partita non è conclusa' };
    // perdente di mano (chi NON ha vinto) inizia; pareggio o assente → host
    const firstTurn: Seat = row.state.winner ? otherSeat(row.state.winner) : 'host';
    const ns = newGame(mode, { now, firstTurn });
    await client.query(
      "UPDATE games SET state = $1::jsonb, rev = $2, status = 'playing', updated_at = now() WHERE room_id = $3",
      [JSON.stringify(ns), ns.rev, roomId],
    );
    const expires = new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString();
    await client.query(
      "UPDATE rooms SET game_mode = $1, status = 'playing', expires_at = $2 WHERE id = $3",
      [mode, expires, roomId],
    );
    return { status: 'ok', state: ns, rev: ns.rev };
  });
}

/** Ripresa asincrona: se è il turno di qualcuno, azzera l'orologio del turno
 *  (turnStart = adesso) SENZA cambiare rev — così chi rientra dopo ore/giorni
 *  non subisce il timeout maturato mentre non c'era. Ritorna lo stato aggiornato. */
export async function resumeTurnTx(roomId: string, opts: { now?: number } = {}): Promise<MoveOutcome> {
  const now = opts.now ?? Date.now();
  return tx(async (client) => {
    const sel = await client.query<{ state: GameState; rev: number }>(
      'SELECT state, rev FROM games WHERE room_id = $1 FOR UPDATE',
      [roomId],
    );
    const row = sel.rows[0];
    if (!row) return { status: 'error', error: 'Partita non trovata' };
    if (row.state.phase !== 'draw' && row.state.phase !== 'play') {
      return { status: 'ok', state: row.state, rev: row.rev }; // niente turno da azzerare
    }
    const ns: GameState = { ...row.state, turnStart: now };
    // NON tocco rev né updated_at: non è una mossa, solo il reset dell'orologio
    await client.query('UPDATE games SET state = $1::jsonb WHERE room_id = $2', [JSON.stringify(ns), roomId]);
    return { status: 'ok', state: ns, rev: ns.rev };
  });
}

/** Abbandono: il seat che abbandona perde. Rimozione IMMEDIATA di game+room dalla memoria. */
export async function abandonTx(roomId: string, seat: Seat): Promise<MoveOutcome> {
  return tx(async (client) => {
    const sel = await client.query<{ state: GameState; rev: number }>(
      'SELECT state, rev FROM games WHERE room_id = $1 FOR UPDATE',
      [roomId],
    );
    const row = sel.rows[0];
    // stato sintetizzato per il broadcast (anche se la partita non è in DB)
    const base = row?.state;
    const ns: GameState | null = base
      ? { ...base, phase: 'abandoned', winner: otherSeat(seat), rev: base.rev + 1 }
      : null;
    // eliminazione immediata: prima il game (FK), poi la room
    await client.query('DELETE FROM games WHERE room_id = $1', [roomId]);
    await client.query('DELETE FROM rooms WHERE id = $1', [roomId]);
    if (!ns) return { status: 'error', error: 'Partita non trovata' };
    return { status: 'ok', state: ns, rev: ns.rev };
  });
}

/** Pulizia periodica (best-effort):
 *  - partite scadute (nessuna mossa da 14 giorni → expires_at superato);
 *  - lobby mai avviate più vecchie di 30 minuti (codice scaduto). */
export async function cleanupStale(): Promise<void> {
  try {
    // 1) game di stanze scadute (i game referenziano le room → prima i game)
    await query(
      `DELETE FROM games WHERE room_id IN (SELECT id FROM rooms WHERE expires_at < now())`,
    );
    // 2) stanze scadute (partite oltre i 14 giorni o lobby col codice scaduto)
    await query(`DELETE FROM rooms WHERE expires_at < now()`);
  } catch { /* la pulizia è best-effort */ }
}

export { buildView };
export type { PublicView };
