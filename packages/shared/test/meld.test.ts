import { describe, it, expect } from 'vitest';
import { validateMeld, validateAddToMeld, canonicalizeMeld } from '../src/index.js';
import { C, J } from './helpers.js';

describe('canonicalizeMeld — posizione dell\'asso', () => {
  it('asso ALTO: J Q K A → asso in coda (non in testa)', () => {
    const ord = canonicalizeMeld([C('A', '♠'), C('J', '♠'), C('Q', '♠'), C('K', '♠')]).map((c) => c.rank);
    expect(ord).toEqual(['J', 'Q', 'K', 'A']);
  });
  it('asso ALTO con buco: Q K A → asso in coda', () => {
    const ord = canonicalizeMeld([C('A', '♦'), C('Q', '♦'), C('K', '♦')]).map((c) => c.rank);
    expect(ord).toEqual(['Q', 'K', 'A']);
  });
  it('asso BASSO: A 2 3 → asso in testa', () => {
    const ord = canonicalizeMeld([C('3', '♥'), C('A', '♥'), C('2', '♥')]).map((c) => c.rank);
    expect(ord).toEqual(['A', '2', '3']);
  });
});

describe('canonicalizeMeld — posizione del wild', () => {
  it('wild copre il buco interno: 5 _ 7 → 5 wild 7', () => {
    const ord = canonicalizeMeld([C('5', '♣'), C('7', '♣'), J()]).map((c) => c.rank);
    expect(ord).toEqual(['5', 'JK', '7']);
  });
  it('wild in fondo se NON copre buchi: 5 6 7 + wild → wild in fondo', () => {
    const ord = canonicalizeMeld([C('5', '♣'), C('6', '♣'), C('7', '♣'), J()]).map((c) => c.rank);
    expect(ord).toEqual(['JK', '5', '6', '7']);
  });
  it('asso basso minimo, nessun buco: il wild estende in ALTO (A 2 3 + wild)', () => {
    const ord = canonicalizeMeld([C('A', '♠'), C('2', '♠'), C('3', '♠'), J()]).map((c) => c.rank);
    expect(ord).toEqual(['A', '2', '3', 'JK']);
  });
  it('il 2 dello STESSO seme fa da matta nel buco, non resta in fondo: 2♥ 3 4 6 7 → 3 4 [2] 6 7', () => {
    const ord = canonicalizeMeld([
      C('2', '♥'), C('3', '♥'), C('4', '♥'), C('6', '♥'), C('7', '♥'),
    ]).map((c) => c.rank);
    expect(ord).toEqual(['3', '4', '2', '6', '7']);
  });
  it('2 naturale resta in fondo e il jolly riempie il buco: 2♥ 3 5 6 + jolly → 2 3 [JK] 5 6', () => {
    const ord = canonicalizeMeld([
      C('2', '♥'), C('3', '♥'), C('5', '♥'), C('6', '♥'), J(),
    ]).map((c) => c.rank);
    expect(ord).toEqual(['2', '3', 'JK', '5', '6']);
  });
});

describe('validateMeld — base', () => {
  it('rifiuta meno di 3 carte', () => {
    expect(validateMeld([C('7', '♠'), C('7', '♥')]).valid).toBe(false);
  });

  it('tris dello stesso rango', () => {
    expect(validateMeld([C('7', '♠'), C('7', '♥'), C('7', '♦')]).valid).toBe(true);
  });

  it('sequenza stesso seme', () => {
    const r = validateMeld([C('4', '♥'), C('5', '♥'), C('6', '♥')]);
    expect(r.valid).toBe(true);
    expect(r.kind).toBe('seq');
  });

  it('rifiuta seme misto in sequenza', () => {
    expect(validateMeld([C('4', '♥'), C('5', '♠'), C('6', '♥')]).valid).toBe(false);
  });

  it('rifiuta ranghi ripetiti nella sequenza', () => {
    expect(validateMeld([C('3', '♥'), C('3', '♥'), C('4', '♥')]).valid).toBe(false);
  });
});

describe('validateMeld — asso basso/alto, no circolare', () => {
  it('A-2-3 (asso basso, 2 naturale)', () => {
    expect(validateMeld([C('A', '♥'), C('2', '♥'), C('3', '♥')]).valid).toBe(true);
  });
  it('Q-K-A (asso alto)', () => {
    expect(validateMeld([C('Q', '♠'), C('K', '♠'), C('A', '♠')]).valid).toBe(true);
  });
  it('K-A-2 con pinella-matta vale come Q-K-A', () => {
    // il 2♠ qui è una pinella usata come matta (= Q) → Q-K-A valido
    expect(validateMeld([C('K', '♠'), C('A', '♠'), C('2', '♠')]).valid).toBe(true);
  });
  it('wrap-around con 2 e 3 naturali NON vale (no circolare)', () => {
    // Q-K-A (asso alto) + 2-3 bassi non è consecutivo e non c'è interpretazione valida
    expect(validateMeld([C('Q', '♠'), C('K', '♠'), C('A', '♠'), C('2', '♠'), C('3', '♠')]).valid).toBe(false);
  });
});

describe('validateMeld — wild (jolly e pinella)', () => {
  it('tris con un jolly', () => {
    expect(validateMeld([C('7', '♠'), C('7', '♥'), J()]).valid).toBe(true);
  });
  it('sequenza con jolly che riempie un buco', () => {
    expect(validateMeld([C('3', '♥'), C('4', '♥'), J(), C('6', '♥')]).valid).toBe(true);
  });
  it('rifiuta due jolly', () => {
    expect(validateMeld([C('3', '♥'), C('4', '♥'), J(), J()]).valid).toBe(false);
  });
  it('rifiuta scala di soli jolly', () => {
    expect(validateMeld([J(), J(), J()]).valid).toBe(false);
  });
  it('pinella come wild riempie un buco (seme diverso)', () => {
    // 2♠ usato come matta nella sequenza di ♥
    expect(validateMeld([C('3', '♥'), C('4', '♥'), C('2', '♠'), C('6', '♥')]).valid).toBe(true);
  });
  it('rifiuta jolly + pinella-wild insieme (2 matte)', () => {
    expect(validateMeld([C('3', '♥'), C('4', '♥'), J(), C('2', '♠'), C('7', '♥')]).valid).toBe(false);
  });
  it('tris di soli 2 (naturali)', () => {
    expect(validateMeld([C('2', '♠'), C('2', '♥'), C('2', '♦')]).valid).toBe(true);
  });
});

describe('validateAddToMeld', () => {
  it('aggiunta valida estende la sequenza', () => {
    const existing = [C('4', '♥'), C('5', '♥'), C('6', '♥')];
    expect(validateAddToMeld(existing, [C('7', '♥')]).valid).toBe(true);
  });
  it('aggiunta che rompe la regola è invalida', () => {
    const existing = [C('4', '♥'), C('5', '♥'), C('6', '♥')];
    expect(validateAddToMeld(existing, [C('8', '♠')]).valid).toBe(false);
  });
});
