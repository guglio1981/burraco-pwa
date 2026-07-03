/* WebSocket client: connect/reconnect, move, stale→resync */
import type { Move, PublicView, Seat, Mode } from '@burraco/shared';
import type { RoomView } from './api.js';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8787';

export type WsHandler = {
  onState?: (view: PublicView) => void;
  onRoom?: (room: RoomView) => void;
  onError?: (msg: string) => void;
  onOppAction?: (action: string, seat: Seat) => void;
  onAbandoned?: () => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  /** L'host ha proposto la rivincita con questo tipo di partita (lato guest). */
  onRematchOffer?: (mode: Mode) => void;
  /** Il guest ha rifiutato la rivincita (lato host). */
  onRematchDecline?: () => void;
  /** L'avversario è uscito dalla stanza a fine partita. */
  onOpponentLeftRoom?: () => void;
  /** La partita è stata cancellata (da me o dall'altro giocatore). */
  onGameDeleted?: () => void;
  /** La partita è in pausa (un giocatore è assente/in background) o è ripresa.
   *  reason: 'away' = l'altro è in background/altra schermata; 'left' = ha sospeso/uscito. */
  onPaused?: (paused: boolean, reason?: 'away' | 'left') => void;
  /** L'elenco "Le mie partite" è cambiato (l'altro giocatore ha rinominato/cancellato). */
  onGamesChanged?: () => void;
};

interface ServerMsg {
  t: string;
  view?: PublicView;
  room?: RoomView;
  error?: string;
  rev?: number;
  action?: string;
  seat?: Seat;
  mode?: Mode;
  paused?: boolean;
  reason?: 'away' | 'left';
}

export class BurracoWS {
  private ws: WebSocket | null = null;
  private token = '';
  private roomId = '';
  private seat: Seat | null = null;
  private baseRev = 0;
  private handlers: WsHandler = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  /** La partita è in primo piano? (visibilità pagina) — inviato al server come presenza. */
  private active = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;

  connect(token: string, handlers: WsHandler): void {
    this.token = token;
    this.handlers = handlers;
    this.open();
  }

  private open(): void {
    if (this.destroyed) return;
    const ws = new WebSocket(`${WS_URL}/ws`);
    this.ws = ws;

    ws.onopen = () => {
      this.sendRaw({ t: 'auth', token: this.token });
      this.handlers.onConnected?.();
      if (this.roomId) {
        this.sendRaw({ t: 'subscribe', roomId: this.roomId });
        this.sendPresence();
      }
    };

    ws.onmessage = (e: MessageEvent) => {
      let msg: ServerMsg;
      try { msg = JSON.parse(String(e.data)) as ServerMsg; } catch { return; }
      this.onMsg(msg);
    };

    ws.onclose = () => {
      this.handlers.onDisconnected?.();
      if (!this.destroyed) {
        this.reconnectTimer = setTimeout(() => void this.open(), 2000);
      }
    };

    ws.onerror = () => ws.close();
  }

  private onMsg(msg: ServerMsg): void {
    switch (msg.t) {
      case 'state':
        // se ho lasciato la stanza (sono in Home) ignoro gli aggiornamenti: non
        // devo essere trascinato dentro una partita mentre non ci sono più.
        if (msg.view && this.roomId) {
          this.baseRev = msg.view.rev;
          this.seat = msg.view.you;
          this.handlers.onState?.(msg.view);
        }
        break;
      case 'room':
        if (msg.room && this.roomId) this.handlers.onRoom?.(msg.room);
        break;
      case 'stale':
        // rev non combaciante → chiedi resync
        this.sendRaw({ t: 'resync', roomId: this.roomId });
        break;
      case 'opp_action':
        if (msg.action && msg.seat) this.handlers.onOppAction?.(msg.action, msg.seat);
        break;
      case 'abandoned':
        this.handlers.onAbandoned?.();
        break;
      case 'rematch_offer':
        if (msg.mode) this.handlers.onRematchOffer?.(msg.mode);
        break;
      case 'rematch_decline':
        this.handlers.onRematchDecline?.();
        break;
      case 'rematch_left':
        this.handlers.onOpponentLeftRoom?.();
        break;
      case 'room_deleted':
        this.roomId = '';
        this.seat = null;
        this.handlers.onGameDeleted?.();
        break;
      case 'paused':
        this.handlers.onPaused?.(msg.paused === true, msg.reason);
        break;
      case 'games_changed':
        this.handlers.onGamesChanged?.();
        break;
      case 'error':
        if (msg.error) this.handlers.onError?.(msg.error);
        break;
    }
  }

  subscribe(roomId: string): void {
    this.roomId = roomId;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendRaw({ t: 'subscribe', roomId });
      this.sendPresence();
    }
  }

  /** Segnala se la partita è in primo piano. Il timer di turno corre solo se
   *  entrambi i giocatori sono attivi; in background si mette in pausa. */
  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.sendPresence();
  }

  private sendPresence(): void {
    if (this.roomId) this.sendRaw({ t: 'presence', active: this.active });
  }

  move(move: Move): void {
    this.sendRaw({ t: 'move', roomId: this.roomId, baseRev: this.baseRev, move });
  }

  nextRound(): void {
    this.sendRaw({ t: 'next_round', roomId: this.roomId });
  }

  abandon(): void {
    this.sendRaw({ t: 'abandon', roomId: this.roomId });
  }

  /** SOLO host: propone la rivincita con un tipo di partita. */
  rematchOffer(mode: Mode): void {
    this.sendRaw({ t: 'rematch_offer', roomId: this.roomId, mode });
  }

  /** SOLO guest: rifiuta la rivincita proposta dall'host. */
  rematchDecline(): void {
    this.sendRaw({ t: 'rematch_decline', roomId: this.roomId });
  }

  /** SOLO guest: accetta la rivincita → parte una nuova partita nella stessa stanza. */
  rematchAccept(mode: Mode): void {
    this.sendRaw({ t: 'rematch_accept', roomId: this.roomId, mode });
  }

  /** Esco dalla partita in corso tornando in Home, SENZA abbandonare: mi stacco
   *  dalla stanza (chi resta va in pausa) ma la partita resta salvata e riprendibile. */
  leaveToHome(): void {
    // l'unsubscribe da solo congela l'avversario e viene registrato come uscita
    // ESPLICITA (→ "Partita sospesa"). Niente presence:false, così non c'è il
    // breve flash "in pausa" prima di "sospesa".
    if (this.roomId) this.sendRaw({ t: 'unsubscribe' });
    this.roomId = '';
    this.seat = null;
  }

  /** Esco dalla stanza a fine partita: avviso l'avversario e dimentico la stanza
   *  (così un'eventuale riconnessione non mi riporta dentro la partita conclusa). */
  leaveRoom(): void {
    if (this.roomId) this.sendRaw({ t: 'rematch_leave', roomId: this.roomId });
    this.roomId = '';
    this.seat = null;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  /** Aggiorna solo gli handler specifici senza riconnettere. */
  updateHandlers(partial: Partial<WsHandler>): void {
    this.handlers = { ...this.handlers, ...partial };
  }

  get currentSeat(): Seat | null { return this.seat; }

  private sendRaw(obj: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }
}

export const wsClient = new BurracoWS();
