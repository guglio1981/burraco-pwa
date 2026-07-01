/* ============================================================
   Stanze (matchmaking pre-partita). Codice 4 lettere (no I/O).
   ============================================================ */
import type { Mode, GameState } from '@burraco/shared';
import { query } from './db.js';
import { AppError } from './errors.js';
import { getUser, type PublicUser } from './auth.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // niente I, O
// Finestra per unirsi con il codice quando la stanza è ancora in lobby.
const JOIN_TTL_MS = 30 * 60 * 1000;
// Ritenzione delle partite avviate: 14 giorni dall'ultima mossa (ripresa asincrona).
export const GAME_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  status: 'waiting' | 'playing' | 'finished';
  game_mode: Mode;
  title: string | null;
  expires_at: string;
  created_at: string;
}

export interface RoomView {
  id: string;
  code: string;
  status: RoomRow['status'];
  gameMode: Mode;
  title: string | null;
  host: PublicUser | null;
  guest: PublicUser | null;
  expiresAt: string;
}

function randomCode(): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

const VALID_MODES: Mode[] = ['fast', '1005', '2005'];

export async function roomView(room: RoomRow): Promise<RoomView> {
  const host = await getUser(room.host_id);
  const guest = room.guest_id ? await getUser(room.guest_id) : null;
  const pub = (u: typeof host): PublicUser | null =>
    u ? { id: u.id, nick: u.nick, username: u.username, email: u.email, isGuest: u.is_guest } : null;
  return {
    id: room.id,
    code: room.code,
    status: room.status,
    gameMode: room.game_mode,
    title: room.title,
    host: pub(host),
    guest: pub(guest),
    expiresAt: room.expires_at,
  };
}

export async function createRoom(hostId: string, mode: Mode): Promise<RoomRow> {
  if (!VALID_MODES.includes(mode)) throw new AppError(400, 'Modalità non valida');
  const expires = new Date(Date.now() + JOIN_TTL_MS).toISOString();
  // ritenta in caso di collisione del codice (UNIQUE)
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    try {
      const r = await query<RoomRow>(
        `INSERT INTO rooms (code, host_id, game_mode, status, expires_at)
         VALUES ($1, $2, $3, 'waiting', $4) RETURNING *`,
        [code, hostId, mode, expires],
      );
      return r.rows[0]!;
    } catch (e: unknown) {
      const code23505 = typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
      if (!code23505) throw e;
    }
  }
  throw new AppError(500, 'Impossibile generare un codice stanza');
}

export async function getRoomByCode(code: string): Promise<RoomRow | null> {
  const r = await query<RoomRow>('SELECT * FROM rooms WHERE code = $1', [code.toUpperCase()]);
  return r.rows[0] ?? null;
}

export async function getRoom(id: string): Promise<RoomRow | null> {
  const r = await query<RoomRow>('SELECT * FROM rooms WHERE id = $1', [id]);
  return r.rows[0] ?? null;
}

export async function joinRoom(code: string, guestId: string): Promise<RoomRow> {
  const room = await getRoomByCode(code);
  if (!room) throw new AppError(404, 'Stanza non trovata');
  if (new Date(room.expires_at).getTime() < Date.now()) throw new AppError(410, 'Stanza scaduta');
  if (room.status !== 'waiting') throw new AppError(409, 'La partita è già iniziata');
  if (room.host_id === guestId) throw new AppError(400, 'Sei già l’host di questa stanza');
  if (room.guest_id && room.guest_id !== guestId) throw new AppError(409, 'La stanza è piena');

  const r = await query<RoomRow>(
    `UPDATE rooms SET guest_id = $1 WHERE id = $2 RETURNING *`,
    [guestId, room.id],
  );
  return r.rows[0]!;
}

/** Quale posto (host/guest) occupa l'utente nella stanza, o null. */
export function seatOf(room: RoomRow, userId: string): 'host' | 'guest' | null {
  if (room.host_id === userId) return 'host';
  if (room.guest_id === userId) return 'guest';
  return null;
}

/** Riga usata dall'elenco "Le mie partite" (stanza + stato del gioco). */
export interface MyGameRow extends RoomRow {
  state: GameState | null;
  updated_at: string | null;
}

/** Partite in corso dell'utente (già avviate, non concluse, non scadute),
 *  ordinate dall'ultima mossa. Include lo stato per capire di chi è il turno. */
export async function listRoomsForUser(userId: string): Promise<MyGameRow[]> {
  const r = await query<MyGameRow>(
    `SELECT r.*, g.state, g.updated_at
       FROM rooms r
       JOIN games g ON g.room_id = r.id
      WHERE (r.host_id = $1 OR r.guest_id = $1)
        AND r.status <> 'finished'
        AND r.expires_at > now()
      ORDER BY g.updated_at DESC`,
    [userId],
  );
  return r.rows;
}

/** Cancella tutte le ALTRE partite tra la STESSA coppia di giocatori (in qualsiasi
 *  ordine host/guest), tenendo solo l'ultima appena avviata. Ritorna gli id delle
 *  stanze cancellate (per poter avvisare eventuali client ancora connessi). */
export async function deleteOtherRoomsForPair(hostId: string, guestId: string, exceptRoomId: string): Promise<string[]> {
  const r = await query<{ id: string }>(
    `SELECT id FROM rooms
      WHERE id <> $3
        AND ((host_id = $1 AND guest_id = $2) OR (host_id = $2 AND guest_id = $1))`,
    [hostId, guestId, exceptRoomId],
  );
  const ids = r.rows.map((row) => row.id);
  if (ids.length === 0) return ids;
  await query(`DELETE FROM games WHERE room_id = ANY($1::uuid[])`, [ids]);
  await query(`DELETE FROM rooms WHERE id = ANY($1::uuid[])`, [ids]);
  return ids;
}

/** Titolo di default di una partita: "nome host vs nome guest". */
export async function defaultRoomTitle(room: RoomRow): Promise<string> {
  const host = await getUser(room.host_id);
  const guest = room.guest_id ? await getUser(room.guest_id) : null;
  return `${host?.nick ?? 'Host'} vs ${guest?.nick ?? 'Avversario'}`;
}

/** Rinomina la partita (consentito a entrambi i giocatori). Se il titolo è vuoto
 *  torna al default "nome host vs nome guest". Ritorna il titolo effettivo salvato. */
export async function setRoomTitle(roomId: string, userId: string, title: string): Promise<string> {
  const room = await getRoom(roomId);
  if (!room || seatOf(room, userId) === null) throw new AppError(404, 'Partita non trovata');
  const clean = title.trim().slice(0, 60);
  const finalTitle = clean || await defaultRoomTitle(room);
  await query(
    `UPDATE rooms SET title = $1 WHERE id = $2 AND (host_id = $3 OR guest_id = $3)`,
    [finalTitle, roomId, userId],
  );
  return finalTitle;
}

/** Cancella la partita per ENTRAMBI i giocatori (stanza condivisa). */
export async function deleteRoomForBoth(roomId: string, userId: string): Promise<void> {
  const room = await getRoom(roomId);
  if (!room || seatOf(room, userId) === null) throw new AppError(404, 'Partita non trovata');
  await query('DELETE FROM games WHERE room_id = $1', [roomId]); // prima il game (FK)
  await query('DELETE FROM rooms WHERE id = $1', [roomId]);
}
