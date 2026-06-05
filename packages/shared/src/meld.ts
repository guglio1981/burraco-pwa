/* ============================================================
   BURRACO — Validazione scale (spec §6) + interpretazioni
   per la classificazione burraco (spec §7).

   Porting fedele dello pseudocodice della spec, esteso per
   esporre, di ogni interpretazione valida, quante "matte" (wild)
   usa e quante carte naturali contiene — informazioni necessarie
   a distinguere pulito / semipulito / sporco.
   ============================================================ */
import type { Card, MeldKind, MeldInfo, Rank, Suit } from './types.js';
import { isJoker, isPinella } from './types.js';

/** Indice di rango per le sequenze (A basso = 1; A alto = 14 gestito a parte). */
export const RIDX: Record<string, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

/** Conta i "buchi" colmabili in una sequenza di indici ordinati e distinti.
 *  diff==1 → contiguo; diff==2 → 1 buco; diff>2 → impossibile (Infinity). (spec §6) */
export function countGaps(idxs: number[]): number {
  let g = 0;
  for (let i = 1; i < idxs.length; i++) {
    const d = idxs[i]! - idxs[i - 1]!;
    if (d === 1) continue;
    if (d === 2) { g += 1; continue; }
    return Infinity;
  }
  return g;
}

export interface MeldInterp {
  kind: MeldKind;
  wilds: number;     // matte usate (jolly + 2 usati come wild)
  naturals: number;  // carte naturali (non-matte) in questa interpretazione
  rank?: Rank;       // per i tris
  suit?: Suit;       // per le sequenze
}

function subsets<T>(arr: readonly T[]): T[][] {
  let res: T[][] = [[]];
  for (const x of arr) res = res.concat(res.map((s) => s.concat([x])));
  return res;
}

/** Tutte le interpretazioni VALIDE della scala (può essere vuoto). */
export function meldInterpretations(cards: Card[]): MeldInterp[] {
  const out: MeldInterp[] = [];
  if (cards.length < 3) return out;

  const jokers = cards.filter(isJoker);
  const twos = cards.filter(isPinella);
  const rest = cards.filter((c) => !isJoker(c) && !isPinella(c)); // naturali "fisse"

  // ───────── TRIS ─────────
  // (a) rest tutte stesso rango → i 2 fungono da matte
  if (rest.length > 0 && rest.every((c) => c.rank === rest[0]!.rank)) {
    const wilds = jokers.length + twos.length;
    if (jokers.length <= 1 && wilds <= 1) {
      out.push({ kind: 'tris', wilds, naturals: rest.length, rank: rest[0]!.rank });
    }
  }
  // (b) rest + twos tutte stesso rango (tris di 2, o rest vuoto con 2 naturali)
  const rt = rest.concat(twos);
  if (rt.length > 0 && rt.every((c) => c.rank === rt[0]!.rank) && jokers.length <= 1) {
    out.push({ kind: 'tris', wilds: jokers.length, naturals: rt.length, rank: rt[0]!.rank });
  }

  // ───────── SEQUENZA ─────────
  if (jokers.length <= 1) {
    for (const natSet of subsets(twos)) {
      const wild2 = twos.length - natSet.length;
      const totalWilds = jokers.length + wild2;
      if (totalWilds > 1) continue;
      const naturals = rest.concat(natSet);
      if (naturals.length === 0) continue;
      if (!naturals.every((c) => c.suit === naturals[0]!.suit)) continue;
      let idxs = naturals
        .map((c) => (c.rank === '2' ? 2 : RIDX[c.rank]!))
        .sort((a, b) => a - b);
      if (new Set(idxs).size !== idxs.length) continue; // niente ranghi ripetuti
      const suit = naturals[0]!.suit;
      if (countGaps(idxs) <= totalWilds) {
        out.push({ kind: 'seq', wilds: totalWilds, naturals: naturals.length, suit });
        continue;
      }
      // riprova con Asso alto (A=14)
      if (idxs[0] === 1) {
        const hi = idxs.slice(1).concat(14).sort((a, b) => a - b);
        if (countGaps(hi) <= totalWilds) {
          out.push({ kind: 'seq', wilds: totalWilds, naturals: naturals.length, suit });
        }
      }
    }
  }

  return out;
}

/** Validazione di gioco di una scala (spec §6). */
export function validateMeld(cards: Card[]): MeldInfo {
  if (cards.length < 3) return { valid: false, msg: 'Servono almeno 3 carte' };
  const jokers = cards.filter(isJoker);
  if (jokers.length > 1) return { valid: false, msg: 'Max 1 jolly per scala' };

  const interps = meldInterpretations(cards);
  if (interps.length === 0) {
    const onlyWild = cards.every((c) => isJoker(c) || isPinella(c));
    if (onlyWild) return { valid: false, msg: 'Non può essere fatta di soli jolly/pinelle' };
    return { valid: false, msg: 'Scala non valida' };
  }
  // preferisci l'interpretazione con meno matte (più "pulita")
  const best = interps.reduce((a, b) => (b.wilds < a.wilds ? b : a));
  const label = best.kind === 'tris' ? `Tris di ${best.rank}` : `Sequenza ${best.suit}`;
  return { valid: true, kind: best.kind, label };
}

/** Aggiunta a una scala esistente: la scala risultante dev'essere valida (spec §6). */
export function validateAddToMeld(existing: Card[], add: Card[]): MeldInfo {
  return validateMeld(existing.concat(add));
}

/**
 * Restituisce le carte della scala nell'ordine canonico di visualizzazione:
 * - sequenza: carte naturali ordinate per rango, il wild inserito nel buco
 *   (o in coda/testa se è a un estremo)
 * - tris: naturali prima, wild in fondo
 */
export function canonicalizeMeld(cards: Card[]): Card[] {
  if (cards.length < 2) return cards;

  const interps = meldInterpretations(cards);
  if (interps.length === 0) return cards;
  const best = interps.reduce((a, b) => (b.wilds < a.wilds ? b : a));

  const jokers  = cards.filter(isJoker);
  const twos    = cards.filter(isPinella);
  const rest    = cards.filter((c) => !isJoker(c) && !isPinella(c));

  // ── TRIS ──────────────────────────────────────────────────────────────────
  if (best.kind === 'tris') {
    // Identifica i 2 usati come naturali (stesso rango degli altri) vs wild
    const baseRank = rest[0]?.rank ?? twos[0]?.rank;
    const nat2 = twos.filter((c) => c.rank === baseRank);
    const wild2 = twos.filter((c) => c.rank !== baseRank);
    return [...rest, ...nat2, ...wild2, ...jokers];
  }

  // ── SEQUENZA ──────────────────────────────────────────────────────────────
  // Determina quali 2 sono naturali in questa sequenza
  // (scelgo il subset di twos con seme == seme della sequenza se c'è, altrimenti wild)
  const seqSuit = rest[0]?.suit;
  const nat2inSeq = seqSuit ? twos.filter((c) => c.suit === seqSuit) : [];
  const wild2inSeq = twos.filter((c) => !nat2inSeq.includes(c));

  const naturals = [...rest, ...nat2inSeq].sort((a, b) => {
    const ra = a.rank === 'A' ? 1 : (RIDX[a.rank] ?? 0);
    const rb = b.rank === 'A' ? 1 : (RIDX[b.rank] ?? 0);
    return ra - rb;
  });
  const wilds = [...jokers, ...wild2inSeq];

  if (wilds.length === 0) return naturals;

  // Trova l'eventuale buco tra le naturali (diff==2)
  const idxs = naturals.map((c) => (c.rank === 'A' ? 1 : (RIDX[c.rank] ?? 0)));
  let gapPos = -1;
  for (let i = 1; i < idxs.length; i++) {
    if ((idxs[i]! - idxs[i - 1]!) === 2) { gapPos = i; break; }
  }

  if (gapPos >= 0) {
    // wild nel buco: [nat0..gapPos-1, wild, natGapPos..]
    const result = [...naturals];
    result.splice(gapPos, 0, ...wilds);
    return result;
  }

  // Nessun buco: wild all'estremo basso (rappresenta la carta più piccola)
  return [...wilds, ...naturals];
}
