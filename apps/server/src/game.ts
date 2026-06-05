/* ============================================================
   Orchestrazione partita: creazione game_state, applicazione
   mosse con concorrenza ottimistica (rev) in transazione,
   timeout di turno, manche successiva.
   ============================================================ */
import type { GameState, Seat, Move } from '@burraco/shared';
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

/** Abbandono: il seat che abbandona perde, l'avversario è dichiarato vincitore. */
export async function abandonTx(roomId: string, seat: Seat): Promise<MoveOutcome> {
  return tx(async (client) => {
    const sel = await client.query<{ state: GameState; rev: number }>(
      'SELECT state, rev FROM games WHERE room_id = $1 FOR UPDATE',
      [roomId],
    );
    const row = sel.rows[0];
    if (!row) return { status: 'error', error: 'Partita non trovata' };
    const ns: GameState = { ...row.state, phase: 'abandoned', winner: otherSeat(seat), rev: row.state.rev + 1 };
    await client.query(
      "UPDATE games SET state = $1::jsonb, rev = $2, status = 'finished', updated_at = now() WHERE room_id = $3",
      [JSON.stringify(ns), ns.rev, roomId],
    );
    await client.query("UPDATE rooms SET status = 'abandoned' WHERE id = $1", [roomId]);
    return { status: 'ok', state: ns, rev: ns.rev };
  });
}

export { buildView };
export type { PublicView };
