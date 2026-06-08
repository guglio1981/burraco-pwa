/* ============================================================
   Partita LOCALE contro il computer (offline).
   Fa girare il motore @burraco/shared interamente lato client:
   - la mossa umana (seat 'host') passa per applyMove come sul server
   - il bot (seat 'guest') gioca a turno con ritardi "di riflessione"
   Espone la stessa superficie di wsClient (move/nextRound/abandon/
   updateHandlers) così TableScreen/RoundEnd non cambiano logica.
   Le viste vengono spinte nello store via buildView(state,'host').
   ============================================================ */
import type { GameState, Move, Mode, Seat } from '@burraco/shared';
import { newGame, startNextRound, applyMove, buildView, TURN_MS } from '@burraco/shared';
import { useStore } from './store.js';
import { saveLocalGame, clearLocalGame, type LocalSave } from './saveGame.js';
import {
  botShouldTakeDiscard, findMeldCandidates, findAddCandidates, chooseDiscardId, type Difficulty,
} from './bot.js';

const HUMAN: Seat = 'host';
const BOT: Seat = 'guest';

let state: GameState | null = null;
let difficulty: Difficulty = 'medium';
let oppActionCb: ((action: string) => void) | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];
let humanTimer: ReturnType<typeof setTimeout> | null = null;
let botRunning = false;

const isActive = (s: GameState): boolean => s.phase === 'draw' || s.phase === 'play';
const clearHumanTimer = (): void => { if (humanTimer) { clearTimeout(humanTimer); humanTimer = null; } };
const clearTimers = (): void => { timers.forEach(clearTimeout); timers = []; clearHumanTimer(); };
const delay = (ms: number): Promise<void> => new Promise((res) => { timers.push(setTimeout(res, ms)); });

/** Arma/azzera il timer del turno UMANO: allo scadere dei 60s scatta lo scarto
 *  automatico (come fa il server nell'online). Il bot non ha bisogno di timer:
 *  gioca da sé entro i suoi ritardi. */
function syncTurnTimer(): void {
  clearHumanTimer();
  if (!state || !isActive(state) || state.turn !== HUMAN) return;
  const remaining = Math.max(0, state.turnStart + TURN_MS - Date.now());
  humanTimer = setTimeout(() => { humanTimer = null; onHumanTimeout(); }, remaining);
}

function onHumanTimeout(): void {
  if (!state || state.turn !== HUMAN || !isActive(state)) return;
  const res = applyMove(state, HUMAN, { type: 'TIMEOUT_AUTO' });
  if (!res.ok || !res.state) return;
  state = res.state;
  pushView();
  persist();
  if (isActive(state) && state.turn === BOT) scheduleBot(700);
  else syncTurnTimer();
}

function pushView(): void {
  if (state) useStore.getState().setGameView(buildView(state, HUMAN));
}
function persist(): void {
  if (!state) return;
  if (state.phase === 'finished') clearLocalGame();
  else saveLocalGame(state, difficulty);
}

/** Applica una mossa del BOT e sincronizza vista/suoni/animazioni. */
function commitBot(move: Move, action: string): boolean {
  if (!state) return false;
  const res = applyMove(state, BOT, move);
  if (!res.ok || !res.state) return false;
  state = res.state;
  // per pesca/presa scarti l'animazione deve leggere il DOM PRIMA del re-render
  oppActionCb?.(action);
  pushView();
  persist();
  syncTurnTimer(); // durante il turno del bot azzera; al passaggio all'umano arma i 60s
  return true;
}

/** Turno completo del bot: pesca → cala/aggiungi → scarta, con ritardi. */
async function runBotTurn(): Promise<void> {
  if (!state || botRunning || state.turn !== BOT) return;
  botRunning = true;
  try {
    await delay(700);
    if (!state || state.turn !== BOT) return;

    // ① PESCA
    const take = state.discard.length > 0 && botShouldTakeDiscard(state, BOT, difficulty);
    commitBot(take ? { type: 'TAKE_DISCARD' } : { type: 'DRAW_DECK' }, take ? 'take_discard' : 'draw_deck');
    if (!state || !isActive(state)) { pushView(); persist(); return; } // es. tallone esaurito
    await delay(650);

    // ② CALA e AGGIUNGI (loop finché fa progressi)
    let progressed = true;
    let meldsDone = 0;
    while (progressed && state && isActive(state)) {
      progressed = false;
      // il principiante cala poco e in modo incostante
      if (difficulty === 'easy' && (meldsDone >= 2 || Math.random() < 0.3)) break;

      let did = false;
      for (const ids of findMeldCandidates(state, BOT, difficulty)) {
        if (commitBot({ type: 'MELD', cardIds: ids }, 'meld')) { meldsDone++; did = true; break; }
      }
      if (did) { progressed = true; await delay(480); continue; }

      const skipAdds = difficulty === 'easy' && Math.random() < 0.5;
      if (!skipAdds && state) {
        for (const a of findAddCandidates(state, BOT, difficulty)) {
          if (commitBot({ type: 'ADD_TO_MELD', meldIndex: a.meldIndex, cardIds: a.cardIds }, 'add_to_meld')) { did = true; break; }
        }
      }
      if (did) { progressed = true; await delay(440); }
    }
    if (!state || !isActive(state)) { pushView(); persist(); return; }
    await delay(520);

    // ③ SCARTA (con rete di sicurezza anti-stallo)
    const id = chooseDiscardId(state, BOT, difficulty);
    if (!commitBot({ type: 'DISCARD', cardId: id }, 'discard')) {
      let done = false;
      for (const c of state.hands[BOT]) {
        if (c.id === id) continue;
        if (commitBot({ type: 'DISCARD', cardId: c.id }, 'discard')) { done = true; break; }
      }
      // davvero incastrato (1 sola matta): chiusura forzata della manche
      if (!done && state) commitBot({ type: 'TIMEOUT_AUTO' }, 'discard');
    }
  } finally {
    botRunning = false;
  }
}

function scheduleBot(initialDelay: number): void {
  clearHumanTimer(); // è il turno del bot: nessun timer umano pendente
  timers.push(setTimeout(() => { void runBotTurn(); }, initialDelay));
}

export const localGame = {
  get active(): boolean { return state !== null; },
  get difficulty(): Difficulty { return difficulty; },

  /** Avvia una nuova partita contro il computer (umano = host, gioca per primo). */
  start(mode: Mode, diff: Difficulty): void {
    clearTimers(); botRunning = false;
    difficulty = diff;
    state = newGame(mode, { firstTurn: HUMAN });
    const s = useStore.getState();
    s.setVsComputer(true);
    pushView();
    persist();
    syncTurnTimer();
  },

  /** Riprende una partita salvata. */
  resume(saved: LocalSave): void {
    clearTimers(); botRunning = false;
    state = saved.state;
    difficulty = saved.difficulty;
    const s = useStore.getState();
    s.setVsComputer(true);
    s.setSuppressDeal(true); // niente animazione di distribuzione: la partita è già in corso
    pushView();
    if (state && isActive(state) && state.turn === BOT) scheduleBot(900);
    else syncTurnTimer();
  },

  /** Mossa del giocatore umano. */
  move(move: Move): void {
    if (!state || state.turn !== HUMAN) return;
    const res = applyMove(state, HUMAN, move);
    if (!res.ok || !res.state) { useStore.getState().showToast(res.error ?? 'Mossa non valida'); return; }
    state = res.state;
    pushView();
    persist();
    if (isActive(state) && state.turn === BOT) scheduleBot(800);
    else syncTurnTimer(); // resto in gioco (calata/aggiunta): mantieni i 60s del turno
  },

  /** Manche successiva (modalità a punti). */
  nextRound(): void {
    if (!state) return;
    clearTimers(); botRunning = false;
    state = startNextRound(state);
    pushView();
    persist();
    if (isActive(state) && state.turn === BOT) scheduleBot(900);
    else syncTurnTimer();
  },

  /** Esce dalla partita: ferma il bot e salva (resta ripristinabile dalla Home). */
  abandon(): void {
    clearTimers(); botRunning = false;
    persist();
  },

  /** Salvataggio immediato (usato all'uscita dell'app / cambio scheda). */
  saveNow(): void { persist(); },

  /** Aggiorna gli handler (solo onOppAction serve, per le animazioni). */
  updateHandlers(h: { onOppAction?: (action: string, seat: Seat) => void }): void {
    if (h.onOppAction !== undefined) oppActionCb = (action) => h.onOppAction!(action, BOT);
  },
};
