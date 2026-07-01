/* REST client — wrappa fetch verso il server */
import { getToken } from './session.js';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const body: unknown = await res.json();
  if (!res.ok) {
    const msg = typeof body === 'object' && body !== null && 'error' in body
      ? String((body as { error: unknown }).error)
      : `Errore ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export interface PublicUser { id: string; nick: string; username: string | null; email: string | null; isGuest: boolean; notificationsEnabled?: boolean; }
export interface OnlineUser { id: string; nick: string; busy?: boolean; }
export interface AuthResp { token: string; user: PublicUser; }
export interface RoomView {
  id: string; code: string; status: string; gameMode: string; title?: string | null;
  host: PublicUser | null; guest: PublicUser | null; expiresAt: string;
}

/** Riga dell'elenco "Le mie partite" (ripresa asincrona). */
export interface MyGame {
  id: string; code: string; title: string | null; mode: string; status: string;
  oppNick: string | null; round: number; phase: string | null;
  yourTurn: boolean; myScore: number; oppScore: number;
  updatedAt: string | null; expiresAt: string;
}

export const api = {
  register: (b: { username: string; password: string }) =>
    req<AuthResp>('/register', { method: 'POST', body: JSON.stringify(b) }),
  login: (b: { username: string; password: string }) =>
    req<AuthResp>('/login', { method: 'POST', body: JSON.stringify(b) }),
  forgotPassword: (username: string) =>
    req<{ password: string }>('/forgot-password', { method: 'POST', body: JSON.stringify({ username }) }),
  guest: (nick?: string) =>
    req<AuthResp>('/guest', { method: 'POST', body: JSON.stringify({ nick }) }),
  me: () => req<{ user: PublicUser }>('/me'),

  createRoom: (gameMode: string) =>
    req<{ room: RoomView }>('/create-room', { method: 'POST', body: JSON.stringify({ gameMode }) }),
  joinRoom: (code: string) =>
    req<{ room: RoomView }>('/join-room', { method: 'POST', body: JSON.stringify({ code }) }),
  getRoom: (code: string) => req<{ room: RoomView }>(`/rooms/${code}`),
  startGame: (roomId: string) =>
    req<{ room: RoomView; view: unknown }>('/start-game', { method: 'POST', body: JSON.stringify({ roomId }) }),

  savePushSubscription: (sub: Record<string, unknown>) =>
    req<{ ok: boolean }>('/push-subscribe', { method: 'POST', body: JSON.stringify({ sub }) }),
  getOnlineUsers: (excludeId: string) =>
    req<{ items: OnlineUser[] }>(`/get-online-users?excludeId=${excludeId}`),
  sendPushInvite: (userId: string, roomCode: string) =>
    req<{ status: string }>('/send-push', { method: 'POST', body: JSON.stringify({ userId, roomCode }) }),

  // ── Le mie partite (ripresa asincrona, 14 giorni) ──
  myGames: () => req<{ items: MyGame[] }>('/my-games'),
  renameGame: (roomId: string, title: string) =>
    req<{ ok: boolean }>('/rename-game', { method: 'POST', body: JSON.stringify({ roomId, title }) }),
  deleteGame: (roomId: string) =>
    req<{ ok: boolean }>('/delete-game', { method: 'POST', body: JSON.stringify({ roomId }) }),
};
