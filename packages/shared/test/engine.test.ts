import { describe, it, expect } from 'vitest';
import {
  newGame, applyMove, buildDeck, checkConservation, seededRng,
  type GameState, type Card, type Rank, type Suit,
} from '../src/index.js';

const rng = seededRng(12345);

describe('newGame + distribuzione', () => {
  it('rispetta i conteggi e la conservazione', () => {
    const s = newGame('1005', { rng, now: 0 });
    expect(s.deck.length).toBe(63);
    expect(s.discard.length).toBe(1);
    expect(s.hands.host.length).toBe(11);
    expect(s.hands.guest.length).toBe(11);
    expect(s.pozzo.host.length).toBe(11);
    expect(s.pozzo.guest.length).toBe(11);
    expect(checkConservation(s).ok).toBe(true);
    expect(s.phase).toBe('draw');
    expect(s.turn).toBe('host');
  });
});

describe('mosse base e turni', () => {
  it('pesca dal mazzo: mano +1, mazzo -1, fase play', () => {
    const s = newGame('1005', { rng, now: 0 });
    const r = applyMove(s, 'host', { type: 'DRAW_DECK' }, { now: 1 });
    expect(r.ok).toBe(true);
    expect(r.state!.hands.host.length).toBe(12);
    expect(r.state!.deck.length).toBe(62);
    expect(r.state!.phase).toBe('play');
    expect(r.state!.rev).toBe(s.rev + 1);
    expect(checkConservation(r.state!).ok).toBe(true);
  });

  it("rifiuta la mossa se non è il tuo turno", () => {
    const s = newGame('1005', { rng, now: 0 });
    expect(applyMove(s, 'guest', { type: 'DRAW_DECK' }).ok).toBe(false);
  });

  it('non puoi pescare due volte', () => {
    const s = newGame('1005', { rng, now: 0 });
    const r = applyMove(s, 'host', { type: 'DRAW_DECK' }, { now: 1 });
    expect(applyMove(r.state!, 'host', { type: 'DRAW_DECK' }).ok).toBe(false);
  });

  it('scarto: passa il turno e conserva 108', () => {
    const s = newGame('1005', { rng, now: 0 });
    const drawn = applyMove(s, 'host', { type: 'DRAW_DECK' }, { now: 1 }).state!;
    const card = drawn.hands.host[0]!;
    const r = applyMove(drawn, 'host', { type: 'DISCARD', cardId: card.id }, { now: 2 });
    expect(r.ok).toBe(true);
    expect(r.state!.turn).toBe('guest');
    expect(r.state!.phase).toBe('draw');
    expect(checkConservation(r.state!).ok).toBe(true);
  });
});

describe('pesca scarti da 1 carta → obbligo scarto diverso (spec §4)', () => {
  it('non puoi riscartare la carta appena raccolta', () => {
    const s = newGame('1005', { rng, now: 0 });
    // garantiamo 1 sola carta negli scarti
    s.discard = [s.discard[0]!];
    const picked = s.discard[0]!;
    const taken = applyMove(s, 'host', { type: 'TAKE_DISCARD' }, { now: 1 }).state!;
    expect(taken.mustDiscardDifferentId).toBe(picked.id);
    // riscartare la stessa è vietato
    expect(applyMove(taken, 'host', { type: 'DISCARD', cardId: picked.id }).ok).toBe(false);
    // scartarne un'altra è ok
    const other = taken.hands.host.find((c) => c.id !== picked.id)!;
    expect(applyMove(taken, 'host', { type: 'DISCARD', cardId: other.id }, { now: 2 }).ok).toBe(true);
  });
});

describe('tallone esaurito (spec §13)', () => {
  it('pescare a mazzo vuoto conclude la manche', () => {
    const s = newGame('1005', { rng, now: 0 });
    s.deck = [];
    // le 63 carte del tallone le spostiamo negli scarti per mantenere 108
    // (ricostruiamo uno stato coerente)
    const moved = newGame('1005', { rng: seededRng(7), now: 0 });
    moved.discard = moved.discard.concat(moved.deck);
    moved.deck = [];
    expect(checkConservation(moved).ok).toBe(true);
    const r = applyMove(moved, 'host', { type: 'DRAW_DECK' }, { now: 1 });
    expect(r.ok).toBe(true);
    expect(r.state!.lastRound?.reason).toBe('deck_exhausted');
    expect(['inter_round', 'finished']).toContain(r.state!.phase);
    expect(checkConservation(r.state!).ok).toBe(true);
  });
});

/** Costruisce uno stato 108-coerente in cui l'host può chiudere:
 *  pozzetto già preso, un burraco pulito calato, una sola carta in mano. */
function closingScenario(): { state: GameState; handCard: Card } {
  const pool = buildDeck();
  const used = new Set<string>();
  const grab = (rank: Rank, suit: Suit): Card => {
    const c = pool.find((x) => x.rank === rank && x.suit === suit && !used.has(x.id))!;
    used.add(c.id);
    return c;
  };
  const burraco = (['A', '2', '3', '4', '5', '6', '7'] as Rank[]).map((r) => grab(r, '♠')); // pulito
  const handCard = grab('K', '♥'); // non-wild
  const rest = pool.filter((c) => !used.has(c.id)); // 100 carte
  const state: GameState = {
    deck: rest.slice(23),
    discard: rest.slice(22, 23),
    hands: { host: [handCard], guest: rest.slice(0, 11) },
    pozzo: { host: [], guest: rest.slice(11, 22) },
    melds: { host: [burraco], guest: [] },
    pozzoPicked: { host: true, guest: false },
    scores: { host: 0, guest: 0 },
    turn: 'host',
    phase: 'play',
    mode: 'fast',
    round: 1,
    rev: 5,
    winner: null,
    turnStart: 0,
    mustDiscardDifferentId: null,
    lastRound: null,
  };
  return { state, handCard };
}

describe('scarto ultima carta senza pozzetto → prende il pozzetto (spec §9)', () => {
  it('svuotare la mano scartando, pozzetto non ancora preso: prende pozzetto, passa il turno, NON chiude', () => {
    const pool = buildDeck();
    // host: 1 sola carta in mano, pozzetto NON preso (11 carte nel pozzo)
    const handCard = pool[0]!;
    const state: GameState = {
      deck: pool.slice(35),
      discard: pool.slice(34, 35),
      hands: { host: [handCard], guest: pool.slice(1, 12) },
      pozzo: { host: pool.slice(12, 23), guest: pool.slice(23, 34) },
      melds: { host: [], guest: [] },
      pozzoPicked: { host: false, guest: false },
      scores: { host: 0, guest: 0 },
      turn: 'host',
      phase: 'play',
      mode: '1005',
      round: 1,
      rev: 5,
      winner: null,
      turnStart: 0,
      mustDiscardDifferentId: null,
      lastRound: null,
    };
    expect(checkConservation(state).ok).toBe(true);
    const r = applyMove(state, 'host', { type: 'DISCARD', cardId: handCard.id }, { now: 1 });
    expect(r.ok).toBe(true);
    // pozzetto preso, mano ripristinata a 11
    expect(r.state!.pozzoPicked.host).toBe(true);
    expect(r.state!.hands.host.length).toBe(11);
    expect(r.state!.pozzo.host.length).toBe(0);
    // NON è una chiusura: la manche prosegue e il turno passa
    expect(r.state!.phase).toBe('draw');
    expect(r.state!.turn).toBe('guest');
    expect(r.state!.lastRound).toBeNull();
    expect(checkConservation(r.state!).ok).toBe(true);
  });
});

describe('calata che lascerebbe 1 carta non scartabile (anti-incastro)', () => {
  it('vieta la calata se resti con 1 carta, pozzetto preso e nessun burraco', () => {
    const pool = buildDeck();
    const grabbed = new Set<string>();
    const grab = (rank: Rank, suit: Suit): Card => {
      const c = pool.find((x) => x.rank === rank && x.suit === suit && !grabbed.has(x.id))!;
      grabbed.add(c.id);
      return c;
    };
    const tris = [grab('5', '♠'), grab('5', '♥'), grab('5', '♦')]; // tris valido
    const leftover = grab('K', '♣'); // resterebbe questa, da sola
    const hand = [...tris, leftover];
    const rest = pool.filter((c) => !grabbed.has(c.id)); // 104
    const state: GameState = {
      deck: rest.slice(23),
      discard: rest.slice(22, 23),
      hands: { host: hand, guest: rest.slice(0, 11) },
      pozzo: { host: [], guest: rest.slice(11, 22) },
      melds: { host: [], guest: [] }, // nessun burraco
      pozzoPicked: { host: true, guest: false }, // pozzetto GIÀ preso
      scores: { host: 0, guest: 0 },
      turn: 'host',
      phase: 'play',
      mode: '1005',
      round: 1,
      rev: 3,
      winner: null,
      turnStart: 0,
      mustDiscardDifferentId: null,
      lastRound: null,
    };
    expect(checkConservation(state).ok).toBe(true);
    const r = applyMove(state, 'host', { type: 'MELD', cardIds: tris.map((c) => c.id) }, { now: 1 });
    expect(r.ok).toBe(false); // calata rifiutata: resteresti incastrato
  });
});

describe('chiusura (spec §9, §10)', () => {
  it('chiusura valida: assegna bonus, conclude e conserva 108', () => {
    const { state, handCard } = closingScenario();
    expect(checkConservation(state).ok).toBe(true);
    const r = applyMove(state, 'host', { type: 'DISCARD', cardId: handCard.id }, { now: 1 });
    expect(r.ok).toBe(true);
    expect(r.state!.lastRound?.closer).toBe('host');
    // pulito A-2-3-4-5-6-7♠ = 60 carte (15+20+5+5+5+5+5) + 200 + 100 chiusura = 360
    expect(r.state!.scores.host).toBe(360);
    expect(r.state!.phase).toBe('finished'); // fast → match over
    expect(r.state!.winner).toBe('host');
    expect(checkConservation(r.state!).ok).toBe(true);
  });

  it('non puoi chiudere senza burraco', () => {
    const { state, handCard } = closingScenario();
    // togliamo il burraco e rimettiamo quelle carte nel mazzo (resta 108-coerente)
    state.deck = state.deck.concat(state.melds.host.flat());
    state.melds.host = [];
    expect(checkConservation(state).ok).toBe(true);
    const r = applyMove(state, 'host', { type: 'DISCARD', cardId: handCard.id }, { now: 1 });
    expect(r.ok).toBe(false);
  });
});
