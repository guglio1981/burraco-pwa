/* ============================================================
   Stanze (matchmaking pre-partita). Codice 4 lettere (no I/O).
   ============================================================ */
import type { Mode } from '@burraco/shared';
import { query } from './db.js';
import { AppError } from './errors.js';
import { getUser, type PublicUser } from './auth.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // niente I, O
const ROOM_TTL_MS = 30 * 60 * 1000;

export interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  status: 'waiting' | 'playing' | 'finished';
  game_mode: Mode;
  expires_at: string;
  created_at: string;
}

export interface RoomView {
  id: string;
  code: string;
  status: RoomRow['status'];
  gameMode: Mode;
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
    host: pub(host),
    guest: pub(guest),
    expiresAt: room.expires_at,
  };
}

export async function createRoom(hostId: string, mode: Mode): Promise<RoomRow> {
  if (!VALID_MODES.includes(mode)) throw new AppError(400, 'Modalità non valida');
  const expires = new Date(Date.now() + ROOM_TTL_MS).toISOString();
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
