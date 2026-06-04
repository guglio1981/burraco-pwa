/* Componenti del tavolo v527 — usano SOLO classi di table.css */
import React from 'react';
import type { Card } from '@burraco/shared';
import { burracoType } from '@burraco/shared';

/* ---- Inner di una carta tavolo ---- */
export function LtCInner({ c }: { c: Card }) {
  if (c.joker) {
    return <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#7b1fa2', fontWeight: 700 }}>★</div>;
  }
  return (
    <>
      <div className="lt-c-tl">
        <div className="lt-c-tl-top"><span className="lt-cr">{c.rank}</span><span className="lt-cs">{c.suit}</span></div>
        <span className="lt-cs">{c.suit}</span>
      </div>
      <div className="lt-c-br"><span className="lt-cs-lg">{c.suit}</span></div>
    </>
  );
}

function suitCls(c: Card): string {
  if (c.joker) return 'joker-c';
  return c.suit === '♥' || c.suit === '♦' ? 'red' : 'blk';
}

/* ---- Pila verticale compressa (scala) ---- */
export function LtMeldStack({ cards }: { cards: Card[] }) {
  const n = cards.length, CH = 66, SEMI = 18, COMP = 4;
  const special = new Set([n - 1]);
  cards.forEach((c, k) => {
    if (c.joker || c.rank === '2') {
      special.add(k);
      if (k + 1 <= n - 1) special.add(k + 1);
      if (k - 1 >= 1) special.add(k - 1);
    }
  });
  const allSemi = n <= 7;
  const tops: number[] = [];
  let acc = 0;
  for (let k = 0; k < n; k++) {
    if (k === 0) tops[0] = 0;
    else { acc += (allSemi || special.has(k)) ? SEMI : COMP; tops[k] = acc; }
  }
  const H = CH + (tops[n - 1] ?? 0);
  return (
    <div className="lt-meld-stack" style={{ height: H }}>
      <div className="lt-meld-badge" style={{ top: -10, left: '72%', transform: 'translateX(-50%)', zIndex: n + 5 }}>{n}</div>
      {cards.map((c, k) => (
        <div key={c.id} className={`lt-csm ${suitCls(c)}`} style={{ top: (H - CH) - (tops[k] ?? 0), zIndex: n - k }}>
          <LtCInner c={c} />
        </div>
      ))}
    </div>
  );
}

interface LtMeldPileProps { cards: Card[]; onClick?: (e: React.MouseEvent) => void; }
export function LtMeldPile({ cards, onClick }: LtMeldPileProps) {
  const t = cards.length >= 7 ? burracoType(cards) : null;
  const lblMap: Record<string, string> = { clean: 'Pulito', semi: 'Semi', dirty: 'Sporco' };
  return (
    <div className="lt-meld-pile" onClick={onClick}>
      <LtMeldStack cards={cards} />
      {t && <div className={`lt-meld-type lt-burraco-${t}`}>{lblMap[t]}</div>}
    </div>
  );
}

/* ---- Pozzetto mini-pila ---- */
interface LtPozzoPileProps { taken: boolean; count?: number; }
export function LtPozzoPile({ taken, count = 11 }: LtPozzoPileProps) {
  return (
    <div className={'lt-pozzo' + (taken ? ' taken' : '')} title="Pozzetto">
      <div className="lt-pp-card back" />
      <div className="lt-pp-card" />
      <div className="lt-pp-n">{count}</div>
    </div>
  );
}
