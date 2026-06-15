/* ============================================================
   BURRACO — Tipi del modello di gioco (autorità server)
   Riferimento: BURRACO_SPEC_COMPLETA.md §1, §3, §15
   ============================================================ */

export type Suit = '♠' | '♣' | '♥' | '♦' | '★';
export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
  | 'JK';

/**
 * Una carta fisica del mazzo. Ogni carta ha un `id` univoco all'interno della
 * partita: questo è la chiave dell'invariante di conservazione (108 id distinti)
 * e serve alle animazioni. La "pinella" (2) NON è marcata `joker`: la sua natura
 * (naturale o matta) è decisa dinamicamente nella validazione delle scale.
 */
export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
  joker: boolean; // true solo per i jolly (JK), sempre wild
}

export type Seat = 'host' | 'guest';

export type Phase =
  | 'draw'        // il giocatore di turno deve pescare
  | 'play'        // ha pescato: può calare/aggiungere e poi scartare
  | 'wait'        // turno dell'avversario
  | 'paused'
  | 'inter_round' // fine manche (modalità a punti), si prepara la successiva
  | 'finished'    // partita conclusa
  | 'abandoned';

export type Mode = 'fast' | '1005' | '2005';

/** Mossa inviata dal client. Le carte sono referenziate per `id` (anti-cheat:
 *  il server le risolve nella mano reale del seat di turno). */
export type Move =
  | { type: 'DRAW_DECK' }
  | { type: 'TAKE_DISCARD' }
  | { type: 'MELD'; cardIds: string[] }
  | { type: 'ADD_TO_MELD'; meldIndex: number; cardIds: string[] }
  | { type: 'DISCARD'; cardId: string }
  | { type: 'TIMEOUT_AUTO' }; // azione automatica allo scadere del timer

export type MoveType = Move['type'];

/** Tipi di scala riconosciuti dalla validazione. */
export type MeldKind = 'tris' | 'seq';
/** Classificazione di un burraco (scala ≥7). */
export type BurracoType = 'clean' | 'semi' | 'dirty';

export interface MeldInfo {
  valid: boolean;
  kind?: MeldKind;
  label?: string;
  msg?: string;
}

/** Stato di gioco condiviso — unico record autoritativo (spec §15). */
export interface GameState {
  deck: Card[];                       // tallone (coperto)
  discard: Card[];                    // pila scarti (la cima è l'ultimo elemento)
  hands: Record<Seat, Card[]>;        // mano host / guest
  pozzo: Record<Seat, Card[]>;        // pozzetto host / guest (11 carte)
  melds: Record<Seat, Card[][]>;      // scale calate host / guest
  pozzoPicked: Record<Seat, boolean>; // pozzetto già preso?
  /** Pozzetto "in attesa di distribuzione": hai svuotato la mano SCARTANDO senza
   *  averlo ancora preso → lo ricevi all'inizio del tuo turno successivo, cioè
   *  DOPO il turno dell'avversario (spec §9, variante). */
  pozzoPending: Record<Seat, boolean>;
  scores: Record<Seat, number>;       // punteggio cumulativo
  turn: Seat;
  phase: Phase;
  mode: Mode;
  round: number;                      // 1-based
  rev: number;                        // concorrenza ottimistica
  winner: Seat | null;
  turnStart: number;                  // epoch ms (per il timer 60s)
  /** Se hai pescato una pila scarti di UNA sola carta, non puoi riscartare
   *  quella carta nello stesso turno: qui ne teniamo l'id (spec §4). */
  mustDiscardDifferentId: string | null;
  /** Snapshot del risultato dell'ultima manche conclusa (per la schermata fine manche). */
  lastRound: RoundResult | null;
}

/** Dettaglio punteggio di un giocatore a fine manche (spec §10). */
export interface PlayerRoundBreakdown {
  meldPoints: number;   // punti delle sole carte calate (senza bonus)
  burracoBonus: number; // somma dei bonus burraco (pulito 200 / semi 150 / sporco 100)
  closeBonus: number;   // +100 se ha chiuso, altrimenti 0
  handPenalty: number;  // punti delle carte rimaste in mano (valore positivo)
  pozzoPenalty: number; // 100 se non ha preso il pozzetto e non ha chiuso, altrimenti 0
  roundTotal: number;   // netto della manche
  cumulative: number;   // cumulativo dopo questa manche
  burracos: { clean: number; semi: number; dirty: number };
  meldCount: number;
}

export interface RoundResult {
  reason: 'close' | 'deck_exhausted' | 'forced';
  closer: Seat | null;
  breakdown: Record<Seat, PlayerRoundBreakdown>;
  matchOver: boolean;
  winner: Seat | null;
}

export interface MoveResult {
  ok: boolean;
  state?: GameState;
  error?: string;
}

export const SEATS: readonly Seat[] = ['host', 'guest'] as const;
export const otherSeat = (s: Seat): Seat => (s === 'host' ? 'guest' : 'host');
export const isJoker = (c: Card): boolean => c.joker || c.rank === 'JK';
export const isPinella = (c: Card): boolean => c.rank === '2' && !isJoker(c);
