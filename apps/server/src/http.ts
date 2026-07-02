/* ============================================================
   REST: auth + stanze + avvio partita.
   ============================================================ */
import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import type { Mode } from '@burraco/shared';
import { buildView } from '@burraco/shared';
import { register, login, guest, getUser, verifyToken, recoverPassword } from './auth.js';
import { createRoom, joinRoom, getRoom, getRoomByCode, roomView,
  listRoomsForUser, setRoomTitle, deleteRoomForBoth, deleteOtherRoomsForPair, defaultRoomTitle } from './rooms.js';
import { createGameForRoom } from './game.js';
import { query } from './db.js';
import { AppError } from './errors.js';
import { sendPush } from './push.js';
import type { GameHub } from './ws.js';

const asyncH =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

function requireAuth(req: Request): string {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const uid = token ? verifyToken(token) : null;
  if (!uid) throw new AppError(401, 'Autenticazione richiesta');
  return uid;
}

export function createApiRouter(hub: GameHub): Router {
  const r = Router();

  // ── Auth ──
  r.post('/register', asyncH(async (req, res) => {
    res.json(await register(req.body));
  }));
  r.post('/login', asyncH(async (req, res) => {
    res.json(await login(req.body));
  }));
  r.post('/guest', asyncH(async (req, res) => {
    res.json(await guest(req.body ?? {}));
  }));
  r.post('/forgot-password', asyncH(async (req, res) => {
    res.json(await recoverPassword(req.body ?? {}));
  }));
  r.get('/me', asyncH(async (req, res) => {
    const u = await getUser(requireAuth(req));
    if (!u) throw new AppError(401, 'Utente non trovato');
    res.json({ user: { id: u.id, nick: u.nick, username: u.username, email: u.email, isGuest: u.is_guest } });
  }));

  // ── Stanze ──
  r.post('/create-room', asyncH(async (req, res) => {
    const userId = requireAuth(req);
    const mode = (req.body?.gameMode ?? '1005') as Mode;
    const room = await createRoom(userId, mode);
    res.json({ room: await roomView(room) });
  }));

  // anteprima stanza per codice (es. il guest vede host + modalità prima di entrare)
  r.get('/rooms/:code', asyncH(async (req, res) => {
    requireAuth(req);
    const room = await getRoomByCode(String(req.params.code ?? ''));
    if (!room) throw new AppError(404, 'Stanza non trovata');
    res.json({ room: await roomView(room) });
  }));

  r.post('/join-room', asyncH(async (req, res) => {
    const userId = requireAuth(req);
    const code = String(req.body?.code ?? '').trim().toUpperCase();
    if (code.length !== 4) throw new AppError(400, 'Inserisci un codice di 4 lettere');
    const room = await joinRoom(code, userId);
    await hub.pushRoom(room.id);
    res.json({ room: await roomView(room) });
  }));

  r.post('/start-game', asyncH(async (req, res) => {
    const userId = requireAuth(req);
    const roomId = String(req.body?.roomId ?? '');
    const room = await getRoom(roomId);
    if (!room) throw new AppError(404, 'Stanza non trovata');
    if (room.host_id !== userId) throw new AppError(403, 'Solo l’host può avviare la partita');
    if (!room.guest_id) throw new AppError(400, 'Manca l’avversario');
    // guard atomico contro doppio avvio
    const upd = await query(
      "UPDATE rooms SET status='playing', expires_at = now() + interval '14 days' WHERE id=$1 AND status='waiting' RETURNING *",
      [roomId],
    );
    if (!upd.rowCount) throw new AppError(409, 'La partita è già iniziata');
    const game = await createGameForRoom(room);
    // si tiene una sola partita salvata per coppia di giocatori: le eventuali
    // altre tra questi stessi due utenti vengono rimpiazzate da quella nuova
    const removedIds = await deleteOtherRoomsForPair(room.host_id, room.guest_id, roomId);
    for (const id of removedIds) hub.notifyDeleted(id);
    // titolo di default della partita: "nome host vs nome guest" (uguale per entrambi)
    const defaultTitle = await defaultRoomTitle(room);
    await query('UPDATE rooms SET title = COALESCE(title, $1) WHERE id = $2', [defaultTitle, roomId]);
    await hub.pushGameStart(roomId);
    res.json({ room: await roomView({ ...room, status: 'playing', title: defaultTitle }), view: buildView(game.state, 'host') });
  }));

  // ── Le mie partite (ripresa asincrona) ──
  r.get('/my-games', asyncH(async (req, res) => {
    const userId = requireAuth(req);
    const rows = await listRoomsForUser(userId);
    const items = await Promise.all(rows.map(async (row) => {
      const seat: 'host' | 'guest' = row.host_id === userId ? 'host' : 'guest';
      const oppId = seat === 'host' ? row.guest_id : row.host_id;
      const opp = oppId ? await getUser(oppId) : null;
      const st = row.state;
      return {
        id: row.id,
        code: row.code,
        title: row.title,
        mode: row.game_mode,
        status: row.status,
        oppNick: opp?.nick ?? null,
        round: st?.round ?? 1,
        phase: st?.phase ?? null,
        yourTurn: st ? st.turn === seat : false,
        myScore: st ? st.scores[seat] : 0,
        oppScore: st ? st.scores[seat === 'host' ? 'guest' : 'host'] : 0,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
      };
    }));
    res.json({ items });
  }));

  r.post('/rename-game', asyncH(async (req, res) => {
    const userId = requireAuth(req);
    const { roomId, title } = req.body as { roomId?: string; title?: string };
    if (!roomId) throw new AppError(400, 'roomId obbligatorio');
    const finalTitle = await setRoomTitle(roomId, userId, String(title ?? ''));
    await hub.pushRoom(roomId); // aggiorna eventuali giocatori connessi alla stanza
    // notifica l'ALTRO giocatore (magari in Home) di ri-aggiornare l'elenco in tempo reale
    const rm = await getRoom(roomId);
    if (rm) {
      const otherId = rm.host_id === userId ? rm.guest_id : rm.host_id;
      if (otherId) hub.notifyGamesChanged(otherId);
    }
    res.json({ ok: true, title: finalTitle });
  }));

  r.post('/delete-game', asyncH(async (req, res) => {
    const userId = requireAuth(req);
    const { roomId } = req.body as { roomId?: string };
    if (!roomId) throw new AppError(400, 'roomId obbligatorio');
    const rm = await getRoom(roomId);
    const otherId = rm ? (rm.host_id === userId ? rm.guest_id : rm.host_id) : null;
    await hub.notifyDeleted(roomId); // chi è dentro la stanza esce, poi cancella per entrambi
    await deleteRoomForBoth(roomId, userId);
    if (otherId) hub.notifyGamesChanged(otherId); // chi è in Home aggiorna l'elenco
    res.json({ ok: true });
  }));

  // ── Push notifications ──
  r.post('/push-subscribe', asyncH(async (req, res) => {
    const userId = requireAuth(req);
    const sub = req.body?.sub as { endpoint?: string } | undefined;
    if (!sub || typeof sub !== 'object') throw new AppError(400, 'Subscription mancante');
    // una subscription (endpoint = browser/dispositivo) appartiene a UN SOLO utente:
    // la stacco da eventuali altri utenti che l'avevano su questo stesso dispositivo,
    // così chi accede ora è raggiungibile e non arrivano notifiche all'account sbagliato.
    if (sub.endpoint) {
      await query(
        "UPDATE users SET push_subscription=NULL, notifications_enabled=false WHERE id <> $1 AND push_subscription->>'endpoint' = $2",
        [userId, sub.endpoint],
      );
    }
    await query(
      'UPDATE users SET push_subscription=$1::jsonb, notifications_enabled=true WHERE id=$2',
      [JSON.stringify(sub), userId],
    );
    res.json({ ok: true });
  }));

  r.get('/get-online-users', asyncH(async (req, res) => {
    const userId = requireAuth(req);
    const excludeId = String(req.query.excludeId ?? userId);
    const r2 = await query<{ id: string; nick: string }>(
      `SELECT id, nick FROM users
       WHERE push_subscription IS NOT NULL AND id != $1
       ORDER BY created_at DESC LIMIT 30`,
      [excludeId],
    );
    res.json({ items: r2.rows });
  }));

  r.post('/send-push', asyncH(async (req, res) => {
    const senderId = requireAuth(req);
    const { userId, roomCode } = req.body as { userId?: string; roomCode?: string };
    if (!userId || !roomCode) throw new AppError(400, 'userId e roomCode obbligatori');
    const sender = await getUser(senderId);
    const origin = req.headers.origin ?? req.headers.referer ?? 'https://burraco.app';
    const status = await sendPush(userId, {
      title: 'Burraco — Sei invitato!',
      body: `${sender?.nick ?? 'Un amico'} ti sfida a Burraco`,
      url: `${origin}/?join=${roomCode}`,
    });
    if (status === 'no_sub') res.status(404).json({ status });
    else if (status === 'expired') res.status(410).json({ status });
    else res.json({ status });
  }));

  return r;
}

/** Middleware di gestione errori (4 argomenti). */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // eslint-disable-next-line no-console
  console.error('Errore non gestito:', err);
  res.status(500).json({ error: 'Errore interno del server' });
}
