/* ============================================================
   BURRACO — Punteggio (spec §1, §8, §10, §11)
   ============================================================ */
import type { Card, GameState, Mode, Seat, PlayerRoundBreakdown } from './types.js';
import { burracoType } from './burraco.js';

/** Valore in punti per rango (jolly=30 gestito a parte). */
export const CARD_PTS: Record<string, number> = {
  A: 15, '2': 20, K: 10, Q: 10, J: 10, '10': 10, '9': 10, '8': 10,
  '7': 5, '6': 5, '5': 5, '4': 5, '3': 5, JK: 30,
};

export function cardPts(c: Card): number {
  return c.joker ? 30 : CARD_PTS[c.rank] ?? 0;
}

/** Solo punti delle carte di una scala (senza bonus). */
export function meldCardPoints(meld: Card[]): number {
  return meld.reduce((s, c) => s + cardPts(c), 0);
}

/** Bonus burraco: pulito +200, semi +150, sporco +100, altrimenti 0 (spec §8). */
export function burracoBonus(meld: Card[]): number {
  switch (burracoType(meld)) {
    case 'clean': return 200;
    case 'semi': return 150;
    case 'dirty': return 100;
    default: return 0;
  }
}

/** Punteggio completo di una scala = carte + bonus burraco (spec §8). */
export function calcMeldPts(meld: Card[]): number {
  return meldCardPoints(meld) + burracoBonus(meld);
}

/** Penalità: somma punti delle carte rimaste in mano. */
export function handPenalty(hand: Card[]): number {
  return hand.reduce((s, c) => s + cardPts(c), 0);
}

/** Fine partita? (spec §11) — veloce finisce dopo 1 manche. */
export function isMatchOver(me: number, opp: number, mode: Mode): boolean {
  const target = mode === '1005' ? 1005 : mode === '2005' ? 2005 : 0;
  if (target === 0) return true;
  return me >= target || opp >= target;
}

/** Dettaglio punteggio manche di un giocatore (spec §10). `closer` = chi ha chiuso (o null). */
export function playerRoundBreakdown(
  state: GameState,
  seat: Seat,
  closer: Seat | null,
): PlayerRoundBreakdown {
  const melds = state.melds[seat];
  let meldPoints = 0;
  let burracoBonusSum = 0;
  const burracos = { clean: 0, semi: 0, dirty: 0 };
  for (const m of melds) {
    meldPoints += meldCardPoints(m);
    const t = burracoType(m);
    if (t) {
      burracos[t] += 1;
      burracoBonusSum += t === 'clean' ? 200 : t === 'semi' ? 150 : 100;
    }
  }
  const closed = closer === seat;
  const closeBonus = closed ? 100 : 0;
  // Pozzetto "in attesa" (svuotò scartando ma deve ancora riceverlo): conta come
  // GIÀ preso → le sue 11 carte sono penalità in mano e niente penalità pozzetto.
  // Così differire la distribuzione non altera il punteggio.
  const pending = state.pozzoPending[seat];
  const handCards = pending ? state.hands[seat].concat(state.pozzo[seat]) : state.hands[seat];
  const handPen = handPenalty(handCards);
  // penalità pozzetto solo se NON l'ha preso/guadagnato e NON ha chiuso (chi chiude ha sempre preso il pozzetto)
  const pozzoPenalty = !state.pozzoPicked[seat] && !pending && !closed ? 100 : 0;
  const roundTotal = meldPoints + burracoBonusSum + closeBonus - handPen - pozzoPenalty;
  return {
    meldPoints,
    burracoBonus: burracoBonusSum,
    closeBonus,
    handPenalty: handPen,
    pozzoPenalty,
    roundTotal,
    cumulative: state.scores[seat] + roundTotal,
    burracos,
    meldCount: melds.length,
  };
}
