/* ============================================================
   Hub WebSocket: autenticazione, subscribe a una stanza,
   applicazione mosse (broadcast viste filtrate), stale/resync,
   timer di turno con azione automatica.
   ============================================================ */
import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { GameState, Seat, Move } from '@burraco/shared';
import { buildView, TURN_MS } from '@burraco/shared';
import { verifyToken } from './auth.js';
import { getRoom, roomView, seatOf } from './rooms.js';
import { applyMoveTx, applyTimeoutTx, nextRoundTx, abandonTx, loadGame } from './game.js';
import { TurnTimers } from './timers.js';

interface Conn {
  ws: WebSocket;
  userId: string | null;
  roomId: string | null;
  seat: Seat | null;
}

type ClientMsg =
  | { t: 'auth'; token: string }
  | { t: 'subscribe'; roomId: string }
  | { t: 'resync'; roomId: string }
  | { t: 'move'; roomId: string; baseRev: number; move: Move }
  | { t: 'next_round'; roomId: string }
  | { t: 'abandon'; roomId: string };

const send = (ws: WebSocket, obj: unknown): void => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
};

export class GameHub {
  private wss: WebSocketServer;
  private rooms = new Map<string, Set<Conn>>();
  private timers = new TurnTimers();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws) => this.onConnection(ws));
  }

  private onConnection(ws: WebSocket): void {
    const conn: Conn = { ws, userId: null, roomId: null, seat: null };
    ws.on('message', (data) => {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return send(ws, { t: 'error', error: 'Messaggio non valido' });
      }
      this.onMessage(conn, msg).catch((e) => {
        send(ws, { t: 'error', error: e instanceof Error ? e.message : 'Errore interno' });
      });
    });
    ws.on('close', () => this.detach(conn));
  }

  private detach(conn: Conn): void {
    if (conn.roomId) {
      const set = this.rooms.get(conn.roomId);
      set?.delete(conn);
      if (set && set.size === 0) {
        this.rooms.delete(conn.roomId);
        this.timers.clear(conn.roomId);
      }
    }
  }

  private async onMessage(conn: Conn, msg: ClientMsg): Promise<void> {
    switch (msg.t) {
      case 'auth': {
        conn.userId = verifyToken(msg.token);
        if (!conn.userId) return send(conn.ws, { t: 'error', error: 'Token non valido' });
        return send(conn.ws, { t: 'hello' });
      }
      case 'subscribe':
        return this.subscribe(conn, msg.roomId);
      case 'resync':
        return this.sendState(conn);
      case 'move':
        return this.handleMove(conn, msg.baseRev, msg.move);
      case 'next_round':
        return this.handleNextRound(conn);
      case 'abandon':
        return this.handleAbandon(conn);
      default:
        return send(conn.ws, { t: 'error', error: 'Comando sconosciuto' });
    }
  }

  private async subscribe(conn: Conn, roomId: string): Promise<void> {
    if (!conn.userId) return send(conn.ws, { t: 'error', error: 'Non autenticato' });
    const room = await getRoom(roomId);
    if (!room) return send(conn.ws, { t: 'error', error: 'Stanza non trovata' });
    const seat = seatOf(room, conn.userId);
    if (!seat) return send(conn.ws, { t: 'error', error: 'Non fai parte di questa stanza' });

    this.detach(conn);
    conn.roomId = roomId;
    conn.seat = seat;
    let set = this.rooms.get(roomId);
    if (!set) {
      set = new Set();
      this.rooms.set(roomId, set);
    }
    set.add(conn);

    send(conn.ws, { t: 'room', room: await roomView(room) });
    await this.sendState(conn);
  }

  /** Invia al singolo conn la vista corrente (se la partita esiste). */
  private async sendState(conn: Conn): Promise<void> {
    if (!conn.roomId || !conn.seat) return;
    const game = await loadGame(conn.roomId);
    if (!game) return; // partita non ancora avviata
    send(conn.ws, { t: 'state', view: buildView(game.state, conn.seat) });
    this.scheduleFromState(conn.roomId, game.state);
  }

  private broadcastState(roomId: string, state: GameState): void {
    const set = this.rooms.get(roomId);
    if (!set) return;
    for (const c of set) {
      if (c.seat) send(c.ws, { t: 'state', view: buildView(state, c.seat) });
    }
    this.scheduleFromState(roomId, state);
  }

  private async broadcastRoom(roomId: string): Promise<void> {
    const room = await getRoom(roomId);
    if (!room) return;
    const view = await roomView(room);
    const set = this.rooms.get(roomId);
    if (!set) return;
    for (const c of set) send(c.ws, { t: 'room', room: view });
  }

  private async handleMove(conn: Conn, baseRev: number, move: Move): Promise<void> {
    if (!conn.roomId || !conn.seat) return send(conn.ws, { t: 'error', error: 'Non in una stanza' });
    const out = await applyMoveTx(conn.roomId, conn.seat, baseRev, move);
    if (out.status === 'ok') {
      this.broadcastOppAction(conn.roomId, conn.seat, move);
      return this.broadcastState(conn.roomId, out.state);
    }
    if (out.status === 'stale') {
      send(conn.ws, { t: 'stale', rev: out.rev });
      return this.sendState(conn);
    }
    return send(conn.ws, { t: 'error', error: out.error });
  }

  private async handleNextRound(conn: Conn): Promise<void> {
    if (!conn.roomId) return;
    const out = await nextRoundTx(conn.roomId);
    if (out.status === 'ok') return this.broadcastState(conn.roomId, out.state);
    if (out.status === 'error') send(conn.ws, { t: 'error', error: out.error });
  }

  private async handleAbandon(conn: Conn): Promise<void> {
    if (!conn.roomId || !conn.seat) return;
    const roomId = conn.roomId;
    const actor = conn.seat;
    const out = await abandonTx(roomId, actor);
    if (out.status !== 'ok') return;
    this.timers.clear(roomId);
    // avvisa SOLO l'avversario con il popup, poi aggiorna lo stato a tutti
    const set = this.rooms.get(roomId);
    if (set) {
      for (const c of set) {
        if (c.seat && c.seat !== actor) send(c.ws, { t: 'abandoned', by: actor });
      }
    }
    this.broadcastState(roomId, out.state);
  }

  private scheduleFromState(roomId: string, state: GameState): void {
    if (state.phase === 'draw' || state.phase === 'play') {
      const remaining = state.turnStart + TURN_MS - Date.now();
      this.timers.arm(roomId, remaining, () => void this.onTimeout(roomId));
    } else {
      this.timers.clear(roomId);
    }
  }

  /** Invia all'avversario un messaggio `opp_action` con il tipo di mossa appena effettuata. */
  private broadcastOppAction(roomId: string, actorSeat: Seat, move: Move): void {
    const set = this.rooms.get(roomId);
    if (!set) return;
    const type = move.type.toLowerCase();
    const payload = { t: 'opp_action', action: type, seat: actorSeat };
    for (const c of set) {
      if (c.seat && c.seat !== actorSeat) send(c.ws, payload);
    }
  }

  private async onTimeout(roomId: string): Promise<void> {
    const out = await applyTimeoutTx(roomId);
    if (out.status === 'ok') this.broadcastState(roomId, out.state);
  }

  // ── chiamate dal lato REST ──────────────────────────────
  /** Notifica un aggiornamento di stanza (es. il guest è entrato). */
  async pushRoom(roomId: string): Promise<void> {
    await this.broadcastRoom(roomId);
  }

  /** Notifica l'avvio della partita: invia stato + stanza e arma il timer. */
  async pushGameStart(roomId: string): Promise<void> {
    await this.broadcastRoom(roomId);
    const game = await loadGame(roomId);
    if (game) this.broadcastState(roomId, game.state);
  }
}
