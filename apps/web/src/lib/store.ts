/* Stato globale (zustand) — router guidato da stato */
import { create } from 'zustand';
import type { PublicView } from '@burraco/shared';
import type { PublicUser, RoomView } from './api.js';
import { clearActiveRoom } from './session.js';

export type Screen =
  | 'login'
  | 'home'
  | 'waiting'   // host attende guest / guest attende avvio
  | 'table'
  | 'roundend'
  | 'victory';

export interface AppState {
  screen: Screen;
  user: PublicUser | null;
  room: RoomView | null;
  gameView: PublicView | null;
  /** Messaggio toast temporaneo */
  toast: string;
  /** Selezione carte in mano (id) */
  selectedIds: string[];
  /** L'avversario ha abbandonato la partita → mostra popup */
  opponentLeft: boolean;
  /** Partita in corso contro il computer (motore locale, non server) */
  vsComputer: boolean;
  /** Salta l'animazione di distribuzione al prossimo render del tavolo (es. ripresa partita) */
  suppressDeal: boolean;

  setScreen: (s: Screen) => void;
  setUser: (u: PublicUser | null) => void;
  setRoom: (r: RoomView | null) => void;
  setGameView: (v: PublicView) => void;
  showToast: (msg: string, ms?: number) => void;
  toggleCard: (id: string) => void;
  clearSelection: () => void;
  setOpponentLeft: (v: boolean) => void;
  setVsComputer: (v: boolean) => void;
  setSuppressDeal: (v: boolean) => void;
  /** Notifica abbandono avversario: mostra popup solo se sono ancora in partita */
  notifyOpponentLeft: () => void;
  logout: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  screen: 'login',
  user: null,
  room: null,
  gameView: null,
  toast: '',
  selectedIds: [],
  opponentLeft: false,
  vsComputer: false,
  suppressDeal: false,

  setScreen: (screen) => set({ screen }),
  setUser: (user) => set({ user }),
  setRoom: (room) => set({ room }),
  setGameView: (gameView) => {
    // naviga automaticamente in base alla fase
    const phase = gameView.phase;
    let screen: Screen = get().screen;
    if (phase === 'draw' || phase === 'play' || phase === 'wait' || phase === 'paused') {
      screen = 'table';
    } else if (phase === 'inter_round') {
      screen = 'roundend';
    } else if (phase === 'finished') {
      screen = 'victory';
    }
    set({ gameView, screen, selectedIds: [] });
  },
  showToast: (msg, ms = 1800) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: '' }), ms);
  },
  toggleCard: (id) => set((s) => ({
    selectedIds: s.selectedIds.includes(id)
      ? s.selectedIds.filter((x) => x !== id)
      : [...s.selectedIds, id],
  })),
  clearSelection: () => set({ selectedIds: [] }),
  setOpponentLeft: (opponentLeft) => set({ opponentLeft }),
  setVsComputer: (vsComputer) => set({ vsComputer }),
  setSuppressDeal: (suppressDeal) => set({ suppressDeal }),
  notifyOpponentLeft: () => {
    const s = get().screen;
    // ignora se sono già fuori dalla partita (login/home) — es. dopo aver abbandonato io
    if (s !== 'login' && s !== 'home') set({ opponentLeft: true });
  },
  logout: () => { clearActiveRoom(); set({ user: null, room: null, gameView: null, screen: 'login', selectedIds: [], opponentLeft: false, vsComputer: false, suppressDeal: false }); },
}));
