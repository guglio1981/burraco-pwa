/* ============================================================
   BURRACO — Motore autoritativo: applyMove (spec §3-§13)

   Unico punto che muta lo stato di gioco. Lavora su un CLONE
   (immutabilità verso il chiamante), valida turno/fase/regole,
   gestisce pozzetto automatico, chiusura, tallone esaurito,
   poi incrementa `rev` e verifica l'invariante di conservazione.
   ============================================================ */
import type {
  Card, GameState, Move, MoveResult, Seat, Mode, RoundResult,
} from './types.js';
import { otherSeat, isJoker, isPinella } from './types.js';
import { validateMeld, validateAddToMeld, canonicalizeMeld } from './meld.js';
import { isBurraco } from './burraco.js';
import { playerRoundBreakdown, isMatchOver } from './scoring.js';
import { checkConservation } from './conservation.js';
import { deal, type Rng } from './deck.js';

export interface MoveOpts {
  now?: number;
  rng?: Rng;
}

const err = (error: string): MoveResult => ({ ok: false, error });
const clone = (s: GameState): GameState => structuredClone(s);

const ACTIVE_PHASES = new Set(['draw', 'play']);

/** Crea lo stato iniziale di una partita (deal completo, host di turno). */
export function newGame(
  mode: Mode,
  opts: MoveOpts & { firstTurn?: Seat } = {},
): GameState {
  const d = deal(opts.rng);
  return {
    deck: d.deck,
    discard: d.discard,
    hands: d.hands,
    pozzo: d.pozzo,
    melds: { host: [], guest: [] },
    pozzoPicked: { host: false, guest: false },
    scores: { host: 0, guest: 0 },
    turn: opts.firstTurn ?? 'host',
    phase: 'draw',
    mode,
    round: 1,
    rev: 0,
    winner: null,
    turnStart: opts.now ?? Date.now(),
    mustDiscardDifferentId: null,
    lastRound: null,
  };
}

/** Prepara la manche successiva (modalità a punti): nuovo deal, punteggi cumulati. */
export function startNextRound(state: GameState, opts: MoveOpts = {}): GameState {
  const d = deal(opts.rng);
  const firstTurn: Seat = state.lastRound?.closer ? otherSeat(state.lastRound.closer) : 'host';
  return {
    deck: d.deck,
    discard: d.discard,
    hands: d.hands,
    pozzo: d.pozzo,
    melds: { host: [], guest: [] },
    pozzoPicked: { host: false, guest: false },
    scores: { ...state.scores },
    turn: firstTurn,
    phase: 'draw',
    mode: state.mode,
    round: state.round + 1,
    rev: state.rev + 1,
    winner: null,
    turnStart: opts.now ?? Date.now(),
    mustDiscardDifferentId: null,
    lastRound: null,
  };
}

/** Rimuove dalla mano le carte con gli id dati (devono esserci tutte e distinte). */
function takeFromHand(s: GameState, seat: Seat, ids: string[]): Card[] | null {
  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;
  const hand = s.hands[seat];
  const picked: Card[] = [];
  for (const id of ids) {
    const c = hand.find((x) => x.id === id);
    if (!c) return null;
    picked.push(c);
  }
  const idset = new Set(ids);
  s.hands[seat] = hand.filter((x) => !idset.has(x.id));
  return picked;
}

/** Dopo una rimozione dalla mano: gestisce il pozzetto automatico (spec §9).
 *  Ritorna errore se la mano resta vuota col pozzetto già preso (serve una
 *  carta da scartare per chiudere). */
function afterHandRemoval(s: GameState, seat: Seat): { ok: boolean; error?: string } {
  if (s.hands[seat].length > 0) return { ok: true };
  if (!s.pozzoPicked[seat]) {
    // prende automaticamente il proprio pozzetto e continua a giocare
    s.hands[seat] = s.pozzo[seat];
    s.pozzo[seat] = [];
    s.pozzoPicked[seat] = true;
    return { ok: true };
  }
  return { ok: false, error: 'Devi tenere almeno una carta da scartare' };
}

/** Condizioni di chiusura (spec §9). `discarded` è la carta scartata per chiudere. */
function canClose(s: GameState, seat: Seat, discarded: Card): { ok: boolean; error?: string } {
  if (!s.pozzoPicked[seat]) return { ok: false, error: 'Non puoi chiudere: devi prima prendere il pozzetto' };
  const hasBurraco = s.melds[seat].some((m) => isBurraco(m));
  if (!hasBurraco) return { ok: false, error: 'Non puoi chiudere: ti manca un burraco' };
  if (isJoker(discarded) || isPinella(discarded)) {
    return { ok: false, error: 'Non puoi chiudere scartando un jolly o una pinella' };
  }
  return { ok: true };
}

/** Conclude la manche, calcola i punteggi e decide inter_round / finished. */
function endRound(
  s: GameState,
  closer: Seat | null,
  reason: RoundResult['reason'],
): void {
  const host = playerRoundBreakdown(s, 'host', closer);
  const guest = playerRoundBreakdown(s, 'guest', closer);
  s.scores.host = host.cumulative;
  s.scores.guest = guest.cumulative;
  const matchOver = isMatchOver(s.scores.host, s.scores.guest, s.mode);
  let winner: Seat | null = null;
  if (matchOver) {
    winner = s.scores.host === s.scores.guest ? null : s.scores.host > s.scores.guest ? 'host' : 'guest';
    s.phase = 'finished';
    s.winner = winner;
  } else {
    s.phase = 'inter_round';
  }
  s.lastRound = { reason, closer, breakdown: { host, guest }, matchOver, winner };
  s.mustDiscardDifferentId = null;
}

/** Commit finale: rev++ e verifica conservazione 108. */
function commit(original: GameState, s: GameState): MoveResult {
  s.rev = original.rev + 1;
  const cons = checkConservation(s);
  if (!cons.ok) return err(cons.error ?? 'Conservazione violata');
  return { ok: true, state: s };
}

/**
 * Applica una mossa. Ritorna { ok:true, state } col nuovo stato (rev incrementata)
 * oppure { ok:false, error } senza modificare nulla.
 */
export function applyMove(
  state: GameState,
  seat: Seat,
  move: Move,
  opts: MoveOpts = {},
): MoveResult {
  const now = opts.now ?? Date.now();

  if (move.type === 'TIMEOUT_AUTO') return applyTimeout(state, seat, opts);

  if (!ACTIVE_PHASES.has(state.phase)) return err('La partita non è in corso');
  if (seat !== state.turn) return err('Non è il tuo turno');

  const s = clone(state);
  const opp = otherSeat(seat);

  switch (move.type) {
    case 'DRAW_DECK': {
      if (s.phase !== 'draw') return err('Hai già pescato');
      if (s.deck.length === 0) {
        // tallone esaurito senza chiusura → la manche termina contando le mani (spec §13)
        endRound(s, null, 'deck_exhausted');
        return commit(state, s);
      }
      const card = s.deck.shift()!;
      s.hands[seat].push(card);
      s.phase = 'play';
      break;
    }

    case 'TAKE_DISCARD': {
      if (s.phase !== 'draw') return err('Hai già pescato');
      if (s.discard.length === 0) return err('La pila scarti è vuota');
      // se prendi una pila di UNA sola carta, a fine turno dovrai scartarne una diversa (spec §4)
      const single = s.discard.length === 1 ? s.discard[0]!.id : null;
      s.hands[seat].push(...s.discard);
      s.discard = [];
      s.phase = 'play';
      s.mustDiscardDifferentId = single;
      break;
    }

    case 'MELD': {
      if (s.phase !== 'play') return err('Devi prima pescare');
      const cards = takeFromHand(s, seat, move.cardIds);
      if (!cards) return err('Carte non valide o non in mano');
      const v = validateMeld(cards);
      if (!v.valid) return err(v.msg ?? 'Scala non valida');
      s.melds[seat].push(canonicalizeMeld(cards));
      const after = afterHandRemoval(s, seat);
      if (!after.ok) return err(after.error!);
      break;
    }

    case 'ADD_TO_MELD': {
      if (s.phase !== 'play') return err('Devi prima pescare');
      const meld = s.melds[seat][move.meldIndex];
      if (!meld) return err('Scala inesistente');
      const cards = takeFromHand(s, seat, move.cardIds);
      if (!cards) return err('Carte non valide o non in mano');
      const v = validateAddToMeld(meld, cards);
      if (!v.valid) return err(v.msg ?? 'Aggiunta non valida');
      s.melds[seat][move.meldIndex] = canonicalizeMeld(meld.concat(cards));
      const after = afterHandRemoval(s, seat);
      if (!after.ok) return err(after.error!);
      break;
    }

    case 'DISCARD': {
      if (s.phase !== 'play') return err('Devi prima pescare');
      if (s.mustDiscardDifferentId && move.cardId === s.mustDiscardDifferentId) {
        return err('Devi scartare una carta diversa da quella appena raccolta');
      }
      const idx = s.hands[seat].findIndex((c) => c.id === move.cardId);
      if (idx < 0) return err('Carta non in mano');
      const card = s.hands[seat][idx]!;
      s.hands[seat].splice(idx, 1);
      s.discard.push(card);
      s.mustDiscardDifferentId = null;

      if (s.hands[seat].length === 0) {
        // scarto che svuota la mano = tentativo di chiusura
        const cc = canClose(s, seat, card);
        if (!cc.ok) return err(cc.error!);
        endRound(s, seat, 'close');
        return commit(state, s);
      }

      // turno all'avversario
      s.turn = opp;
      s.phase = 'draw';
      s.turnStart = now;
      break;
    }

    default:
      return err('Mossa sconosciuta');
  }

  return commit(state, s);
}

/**
 * Azione automatica allo scadere del timer (spec §12): se non hai pescato,
 * pesca dal mazzo; poi scarta una carta (preferendo una che non chiuda il
 * turno svuotando la mano). Caso limite stuck: si conclude la manche (forced).
 */
export function applyTimeout(state: GameState, seat: Seat, opts: MoveOpts = {}): MoveResult {
  if (!ACTIVE_PHASES.has(state.phase)) return err('La partita non è in corso');
  if (seat !== state.turn) return err('Non è il tuo turno');
  const rng = opts.rng ?? Math.random;

  let cur = state;
  // 1) pesca se serve
  if (cur.phase === 'draw') {
    const r = applyMove(cur, seat, { type: 'DRAW_DECK' }, opts);
    if (!r.ok || !r.state) return r;
    // se la pesca ha chiuso la manche (tallone esaurito), abbiamo finito
    if (r.state.phase !== 'play') return r;
    cur = r.state;
  }

  // 2) scarta: preferisci una carta che NON svuoti la mano e che sia consentita
  const hand = cur.hands[seat];
  const allowed = hand.filter((c) => c.id !== cur.mustDiscardDifferentId);
  const pool = allowed.length ? allowed : hand;
  const pick = pool[Math.floor(rng() * pool.length)]!;

  const discardRes = applyMove(cur, seat, { type: 'DISCARD', cardId: pick.id }, opts);
  if (discardRes.ok) return discardRes;

  // Caso limite: l'unica carta scartabile chiuderebbe la mano senza requisiti
  // (giocatore "incastrato" a 1 carta). Si conclude la manche contando le mani.
  const s = clone(cur);
  endRound(s, null, 'forced');
  return commit(cur, s);
}
