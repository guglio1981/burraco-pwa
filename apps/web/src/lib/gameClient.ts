/* ============================================================
   Dispatcher unico delle azioni di gioco: instrada le mosse al
   server (WebSocket) per le partite online, o al motore locale
   (localGame) per le partite contro il computer.
   La sorgente di verità è store.vsComputer.
   ============================================================ */
import type { Move } from '@burraco/shared';
import { wsClient, type WsHandler } from './ws.js';
import { localGame } from './localGame.js';
import { useStore } from './store.js';

export const gameClient = {
  get isLocal(): boolean { return useStore.getState().vsComputer; },

  move(move: Move): void {
    if (this.isLocal) localGame.move(move); else wsClient.move(move);
  },
  nextRound(): void {
    if (this.isLocal) localGame.nextRound(); else wsClient.nextRound();
  },
  abandon(): void {
    if (this.isLocal) localGame.abandon(); else wsClient.abandon();
  },
  updateHandlers(partial: Partial<WsHandler>): void {
    if (this.isLocal) localGame.updateHandlers(partial); else wsClient.updateHandlers(partial);
  },
};
