/* ============================================================
   BOT (avversario CPU) — decisioni di gioco, 3 livelli.
   Lavora sullo stato AUTORITATIVO completo (è la CPU: niente
   anti-cheat). Ogni funzione propone mosse che vengono poi
   VALIDATE dal motore (applyMove) in localGame: così il bot non
   può mai divergere dalle regole reali.

   - Medio  = port fedele del bot del vecchio Burraco.
   - Facile = pesca sempre dal mazzo, cala poco, scarto sbadato.
   - Difficile = prende gli scarti utili (anche matte), prioritizza
                 i burraco e scarta in modo sicuro (non regala carte
                 all'avversario).
   ============================================================ */
import type { Card, GameState, Seat } from '@burraco/shared';
import { validateMeld, validateAddToMeld, cardPts, isJoker, isPinella, otherSeat } from '@burraco/shared';

export type Difficulty = 'easy' | 'medium' | 'hard';

const isWild = (c: Card): boolean => isJoker(c) || isPinella(c);
function maxBy<T>(arr: T[], f: (x: T) => number): T {
  return arr.reduce((best, x) => (f(x) > f(best) ? x : best), arr[0]!);
}
function minBy<T>(arr: T[], f: (x: T) => number): T {
  return arr.reduce((best, x) => (f(x) < f(best) ? x : best), arr[0]!);
}

/** Prima combinazione valida di `size` carte (brute force con tetto di sicurezza). */
function firstValidCombo(hand: Card[], size: number): Card[] | null {
  const n = hand.length;
  if (size > n || size < 3) return null;
  const idx = Array.from({ length: size }, (_, i) => i);
  let guard = 0;
  for (;;) {
    if (++guard > 80000) return null; // tetto: evita esplosioni su mani enormi
    const cards = idx.map((i) => hand[i]!);
    if (validateMeld(cards).valid) return cards;
    let i = size - 1;
    while (i >= 0 && idx[i] === i + n - size) i--;
    if (i < 0) return null;
    idx[i] = idx[i]! + 1;
    for (let j = i + 1; j < size; j++) idx[j] = idx[j - 1]! + 1;
  }
}

/** Decide se prendere TUTTA la pila scarti invece di pescare dal mazzo. */
export function botShouldTakeDiscard(state: GameState, seat: Seat, diff: Difficulty): boolean {
  if (diff === 'easy') return false; // il principiante pesca sempre dal mazzo
  const disc = state.discard;
  if (!disc.length) return false;
  const top = disc[disc.length - 1]!;
  const hand = state.hands[seat];
  // la carta in cima forma una scala con 2 carte in mano
  for (let i = 0; i < hand.length - 1; i++)
    for (let j = i + 1; j < hand.length; j++)
      if (validateMeld([top, hand[i]!, hand[j]!]).valid) return true;
  // oppure si aggiunge a una mia scala già calata
  for (const m of state.melds[seat]) if (validateAddToMeld(m, [top]).valid) return true;
  // NB: niente "accaparramento" avido degli scarti — entrambi i bot a prendere
  //     sempre la pila impedirebbe al mazzo di esaurirsi (partita infinita).
  //     Il vantaggio del livello difficile sta nello scarto sicuro e nei burraco.
  return false;
}

/** Candidati MELD (nuove scale), in ordine di preferenza (migliore prima).
 *  localGame li prova uno a uno applicandoli col motore. */
export function findMeldCandidates(state: GameState, seat: Seat, _diff: Difficulty): string[][] {
  const hand = state.hands[seat];
  const out: string[][] = [];
  const maxSize = Math.min(7, hand.length);
  // dalla più grande (7 = burraco) alla più piccola (3): privilegia i burraco e i punti
  for (let size = maxSize; size >= 3; size--) {
    const found = firstValidCombo(hand, size);
    if (found) out.push(found.map((c) => c.id));
  }
  return out;
}

/** Candidati ADD_TO_MELD (aggiunta a scala esistente), in ordine di preferenza. */
export function findAddCandidates(
  state: GameState,
  seat: Seat,
  diff: Difficulty,
): { meldIndex: number; cardIds: string[] }[] {
  const hand = state.hands[seat];
  const melds = state.melds[seat];
  const out: { meldIndex: number; cardIds: string[] }[] = [];
  for (let mi = 0; mi < melds.length; mi++) {
    for (const c of hand) {
      if (validateAddToMeld(melds[mi]!, [c]).valid) out.push({ meldIndex: mi, cardIds: [c.id] });
    }
  }
  if (diff === 'hard') {
    // priorità: completare un burraco (scala da 6 → 7 carte)
    out.sort((a, b) => {
      const la = melds[a.meldIndex]!.length, lb = melds[b.meldIndex]!.length;
      const ca = la === 6 ? 0 : 1, cb = lb === 6 ? 0 : 1;
      if (ca !== cb) return ca - cb;
      return lb - la;
    });
  }
  return out;
}

/** Sceglie l'id della carta da scartare. */
export function chooseDiscardId(state: GameState, seat: Seat, diff: Difficulty): string {
  const hand = state.hands[seat];
  const blocked = state.mustDiscardDifferentId;
  const allowed = hand.filter((c) => c.id !== blocked);
  const pool = allowed.length ? allowed : hand;

  if (diff === 'easy') {
    // sbadato: scarta una carta a caso, preferendo le non-matte
    const nonWild = pool.filter((c) => !isWild(c));
    const arr = nonWild.length ? nonWild : pool;
    return arr[Math.floor(Math.random() * arr.length)]!.id;
  }

  // Carte "utili": parte di una possibile scala (3 carte) o aggiungibili a una mia scala
  const useful = new Set<string>();
  const n = hand.length;
  for (let i = 0; i < n - 2; i++)
    for (let j = i + 1; j < n - 1; j++)
      for (let k = j + 1; k < n; k++)
        if (validateMeld([hand[i]!, hand[j]!, hand[k]!]).valid) {
          useful.add(hand[i]!.id); useful.add(hand[j]!.id); useful.add(hand[k]!.id);
        }
  for (const c of hand)
    for (const m of state.melds[seat])
      if (validateAddToMeld(m, [c]).valid) useful.add(c.id);

  const candidates = pool.filter((c) => !useful.has(c.id));

  if (diff === 'hard') {
    // non regalare carte che l'avversario può aggiungere alle SUE scale
    const oppMelds = state.melds[otherSeat(seat)];
    const givesOpp = (c: Card) => oppMelds.some((m) => validateAddToMeld(m, [c]).valid);
    const safe = candidates.filter((c) => !givesOpp(c));
    if (safe.length) return maxBy(safe, cardPts).id;      // libera la più costosa, in sicurezza
    if (candidates.length) return minBy(candidates, cardPts).id; // se tutte rischiose, regala la meno cara
    // tutte utili: tieni il valore, scarta la più economica che non aiuti l'avversario
    const safePool = pool.filter((c) => !givesOpp(c));
    const fp = safePool.length ? safePool : pool;
    return minBy(fp, cardPts).id;
  }

  // MEDIO (vecchio bot): scarta la più costosa tra le non-utili; se tutte utili, la meno costosa
  if (candidates.length) return maxBy(candidates, cardPts).id;
  return minBy(pool, cardPts).id;
}
