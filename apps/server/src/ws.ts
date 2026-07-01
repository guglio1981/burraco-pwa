/* ============================================================
   Hub WebSocket: autenticazione, subscribe a una stanza,
   applicazione mosse (broadcast viste filtrate), stale/resync,
   timer di turno con azione automatica.
   ============================================================ */
import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { GameState, Seat, Move, Mode } from '@burraco/shared';
import { buildView, TURN_MS, otherSeat } from '@burraco/shared';
import { verifyToken, getUser } from './auth.js';
import { getRoom, roomView, seatOf } from './rooms.js';
import { applyMoveTx, applyTimeoutTx, nextRoundTx, abandonTx, rematchTx, resumeTurnTx, loadGame } from './game.js';
import { sendPush } from './push.js';
import { ENV } from './env.js';

const VALID_MODES: ReadonlySet<Mode> = new Set(['fast', '1005', '2005']);
// URL del frontend per i deep-link delle notifiche (in locale punta comunque alla PWA online)
const FRONTEND_ORIGIN = ENV.CLIENT_ORIGIN.startsWith('http://localhost')
  ? 'https://burraco-pwa-server.vercel.app'
  : ENV.CLIENT_ORIGIN;
import { TurnTimers } from './timers.js';

interface Conn {
  ws: WebSocket;
  userId: string | null;
  roomId: string | null;
  seat: Seat | null;
  /** La partita è in primo piano su questo client? (visibilità della pagina).
   *  Il timer di turno corre SOLO se entrambi i giocatori sono "attivi". */
  active: boolean;
}

type ClientMsg =
  | { t: 'auth'; token: string }
  | { t: 'subscribe'; roomId: string }
  | { t: 'unsubscribe' }                                 // esco dalla partita (torno in Home) senza abbandonare
  | { t: 'resync'; roomId: string }
  | { t: 'presence'; active: boolean }                   // app in primo piano / in background
  | { t: 'move'; roomId: string; baseRev: number; move: Move }
  | { t: 'next_round'; roomId: string }
  | { t: 'abandon'; roomId: string }
  | { t: 'rematch_offer'; roomId: string; mode: Mode }   // SOLO host: propone la rivincita
  | { t: 'rematch_decline'; roomId: string }             // SOLO guest: rifiuta
  | { t: 'rematch_accept'; roomId: string; mode: Mode }  // SOLO guest: accetta → nuova partita
  | { t: 'rematch_leave'; roomId: string };              // esco dalla stanza a fine partita (avvisa l'altro)

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
    const conn: Conn = { ws, userId: null, roomId: null, seat: null, active: true };
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
      const roomId = conn.roomId;
      const set = this.rooms.get(roomId);
      set?.delete(conn);
      if (set && set.size === 0) {
        this.rooms.delete(roomId);
        this.timers.clear(roomId);
      } else if (set) {
        // un giocatore è uscito/disconnesso → chi resta va in pausa (timer fermo + overlay)
        void this.onPresenceChange(roomId);
      }
    }
  }

  /** Questo seat è presente E in primo piano (sta guardando la partita)? */
  private seatActive(roomId: string, seat: Seat): boolean {
    const set = this.rooms.get(roomId);
    if (!set) return false;
    for (const c of set) if (c.seat === seat && c.active) return true;
    return false;
  }

  /** Entrambi i giocatori hanno la partita in primo piano? (condizione per il timer) */
  private bothActive(roomId: string): boolean {
    return this.seatActive(roomId, 'host') && this.seatActive(roomId, 'guest');
  }

  /** Chiamata quando cambia la presenza (ingresso, uscita, primo piano/background):
   *  se ora entrambi guardano la partita e c'è un turno in corso, azzera l'orologio
   *  (nessuna penalità per l'assenza) e riparte il timer; altrimenti mette in pausa. */
  private async onPresenceChange(roomId: string): Promise<void> {
    const game = await loadGame(roomId);
    if (!game) { this.timers.clear(roomId); return; }
    const live = game.state.phase === 'draw' || game.state.phase === 'play';
    if (!live) { this.timers.clear(roomId); return; }
    if (this.bothActive(roomId)) {
      // entrambi presenti → riparte il turno (60s puliti) e la partita si sblocca
      const out = await resumeTurnTx(roomId);
      if (out.status === 'ok') this.broadcastState(roomId, out.state);
      this.broadcastPaused(roomId, false);
    } else {
      // manca un giocatore → partita CONGELATA: timer fermo, niente timeout
      this.timers.clear(roomId);
      this.broadcastPaused(roomId, true);
    }
  }

  /** Comunica ai client se la partita è in pausa (un giocatore assente/in background). */
  private broadcastPaused(roomId: string, paused: boolean): void {
    const set = this.rooms.get(roomId);
    if (!set) return;
    for (const c of set) if (c.seat) send(c.ws, { t: 'paused', paused });
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
      case 'unsubscribe': {
        // esco dalla partita mantenendola salvata: mi stacco dalla stanza (chi resta va in pausa)
        this.detach(conn);
        conn.roomId = null;
        conn.seat = null;
        return;
      }
      case 'resync':
        return this.sendState(conn);
      case 'presence':
        return this.handlePresence(conn, msg.active);
      case 'move':
        return this.handleMove(conn, msg.baseRev, msg.move);
      case 'next_round':
        return this.handleNextRound(conn);
      case 'abandon':
        return this.handleAbandon(conn);
      case 'rematch_offer':
        return this.handleRematchOffer(conn, msg.mode);
      case 'rematch_decline':
        return this.handleRematchDecline(conn);
      case 'rematch_accept':
        return this.handleRematchAccept(conn, msg.mode);
      case 'rematch_leave':
        return this.handleRematchLeave(conn);
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
    // se ora entrambi guardano la partita, riparte il turno (senza penalità per l'assenza)
    await this.onPresenceChange(roomId);
  }

  /** Il client segnala primo piano/background: aggiorna la presenza e (ri)valuta il timer. */
  private async handlePresence(conn: Conn, active: boolean): Promise<void> {
    conn.active = active;
    if (conn.roomId) await this.onPresenceChange(conn.roomId);
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
      // il turno è passato all'avversario? se è offline, avvisalo con una push
      if (out.state.turn !== conn.seat) {
        void this.notifyTurnIfAway(conn.roomId, out.state.turn, out.state);
      }
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

  /** Invia un payload all'altro occupante della stanza (l'avversario di `seat`). */
  private sendToOpponent(roomId: string, seat: Seat, payload: unknown): void {
    const set = this.rooms.get(roomId);
    if (!set) return;
    for (const c of set) {
      if (c.seat && c.seat !== seat) send(c.ws, payload);
    }
  }

  /** SOLO l'host può proporre la rivincita; l'offerta viene inoltrata al guest. */
  private async handleRematchOffer(conn: Conn, mode: Mode): Promise<void> {
    if (!conn.roomId || !conn.seat) return;
    if (conn.seat !== 'host') return send(conn.ws, { t: 'error', error: 'Solo l’host può proporre la rivincita' });
    if (!VALID_MODES.has(mode)) return send(conn.ws, { t: 'error', error: 'Modalità non valida' });
    this.sendToOpponent(conn.roomId, conn.seat, { t: 'rematch_offer', mode });
  }

  /** SOLO il guest rifiuta; l'host viene avvisato così può riproporre con altro tipo. */
  private async handleRematchDecline(conn: Conn): Promise<void> {
    if (!conn.roomId || !conn.seat) return;
    if (conn.seat !== 'guest') return;
    this.sendToOpponent(conn.roomId, conn.seat, { t: 'rematch_decline' });
  }

  /** SOLO il guest accetta → nuova partita nella stessa stanza, stato a entrambi. */
  private async handleRematchAccept(conn: Conn, mode: Mode): Promise<void> {
    if (!conn.roomId || !conn.seat) return;
    if (conn.seat !== 'guest') return;
    if (!VALID_MODES.has(mode)) return send(conn.ws, { t: 'error', error: 'Modalità non valida' });
    const out = await rematchTx(conn.roomId, mode);
    if (out.status !== 'ok') return send(conn.ws, { t: 'error', error: out.status === 'error' ? out.error : 'Rivincita non disponibile' });
    await this.broadcastRoom(conn.roomId);
    this.broadcastState(conn.roomId, out.state);
  }

  /** A fine partita esco dalla stanza: avviso l'avversario e mi stacco (così,
   *  se proponeva la rivincita, non resta in attesa all'infinito). */
  private handleRematchLeave(conn: Conn): void {
    if (!conn.roomId || !conn.seat) return;
    this.sendToOpponent(conn.roomId, conn.seat, { t: 'rematch_left' });
    this.detach(conn);
    conn.roomId = null;
    conn.seat = null;
  }

  private scheduleFromState(roomId: string, state: GameState): void {
    // il timer di turno corre SOLO quando entrambi guardano la partita in primo piano:
    // se uno è via o in background, la partita resta in pausa e ripristinabile (14 giorni)
    if ((state.phase === 'draw' || state.phase === 'play') && this.bothActive(roomId)) {
      const remaining = state.turnStart + TURN_MS - Date.now();
      this.timers.arm(roomId, remaining, () => void this.onTimeout(roomId));
    } else {
      this.timers.clear(roomId);
    }
  }

  /** Se il turno è passato a un giocatore che NON è connesso, mandagli una
   *  notifica push "tocca a te" (best-effort). */
  private async notifyTurnIfAway(roomId: string, turnSeat: Seat, state: GameState): Promise<void> {
    if (state.phase !== 'draw' && state.phase !== 'play') return;
    if (this.seatActive(roomId, turnSeat)) return; // sta guardando: lo vede da sé
    try {
      const room = await getRoom(roomId);
      if (!room) return;
      const targetId = turnSeat === 'host' ? room.host_id : room.guest_id;
      if (!targetId) return;
      const oppId = turnSeat === 'host' ? room.guest_id : room.host_id;
      const opp = oppId ? await getUser(oppId) : null;
      await sendPush(targetId, {
        title: 'Tocca a te! ♠',
        body: `${opp?.nick ?? 'Il tuo avversario'} ha giocato — è il tuo turno${room.title ? ` in "${room.title}"` : ''}`,
        url: `${FRONTEND_ORIGIN}/?resume=${roomId}`,
      });
    } catch { /* best-effort */ }
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

  /** La partita è stata cancellata da un giocatore: avvisa chi è connesso
   *  (così esce dalla stanza) e libera memoria + timer. */
  notifyDeleted(roomId: string): void {
    const set = this.rooms.get(roomId);
    if (set) {
      for (const c of set) {
        send(c.ws, { t: 'room_deleted' });
        c.roomId = null;
        c.seat = null;
      }
    }
    this.rooms.delete(roomId);
    this.timers.clear(roomId);
  }
}
