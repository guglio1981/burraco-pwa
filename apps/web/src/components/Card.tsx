/* Componenti carta — Sistema B premium (non tavolo) */
import React from 'react';
import type { Card as CardType } from '@burraco/shared';
import { burracoType } from '@burraco/shared';
import { BurracoBadge } from './Icon.js';

interface CardProps {
  card: CardType; w?: number; selected?: boolean; faded?: boolean; wild?: boolean;
  onClick?: () => void; style?: React.CSSProperties;
}
export function Card({ card, w = 64, selected, faded, wild, onClick, style = {} }: CardProps) {
  if (card.joker) return <JokerCard w={w} selected={selected} onClick={onClick} style={style} />;
  const isRed = card.suit === '♥' || card.suit === '♦';
  const h = w * 1.42;
  const idxSize = w * 0.30;
  const pipSize = w * 0.62;
  const isCourt = ['J', 'Q', 'K'].includes(card.rank);
  const suitColor = isRed ? 'var(--suit-red)' : 'var(--suit-blk)';
  return (
    <div onClick={onClick} style={{
      width: w, height: h, borderRadius: Math.max(6, w * 0.13),
      background: 'linear-gradient(150deg, var(--card-face), var(--card-edge))',
      boxShadow: selected ? '0 0 0 2.5px var(--gold), var(--sh-2)' : 'var(--sh-card)',
      position: 'relative', flexShrink: 0, cursor: onClick ? 'pointer' : 'default',
      opacity: faded ? 0.36 : 1, transition: 'transform .14s ease, box-shadow .14s ease, opacity .14s ease',
      transform: selected ? 'translateY(-14px)' : 'none',
      outline: wild ? '2px dashed var(--joker)' : 'none', outlineOffset: -5, ...style,
    }}>
      <div style={{ position: 'absolute', top: w * 0.07, left: w * 0.10, lineHeight: 0.92, textAlign: 'center', color: suitColor, fontFamily: 'var(--font-ui)', fontWeight: 800 }}>
        <div style={{ fontSize: idxSize }}>{card.rank}</div>
        <div style={{ fontSize: idxSize * 0.86 }}>{card.suit}</div>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: isCourt ? pipSize * 0.78 : pipSize, color: suitColor, fontWeight: isCourt ? 800 : 400, fontFamily: isCourt ? 'var(--font-disp)' : 'var(--font-ui)' }}>
          {isCourt ? card.rank : card.suit}
        </span>
      </div>
      <div style={{ position: 'absolute', bottom: w * 0.07, right: w * 0.10, lineHeight: 0.92, textAlign: 'center', color: suitColor, fontFamily: 'var(--font-ui)', fontWeight: 800, transform: 'rotate(180deg)' }}>
        <div style={{ fontSize: idxSize }}>{card.rank}</div>
        <div style={{ fontSize: idxSize * 0.86 }}>{card.suit}</div>
      </div>
      {card.rank === '2' && <span style={{ position: 'absolute', bottom: w * 0.06, left: '50%', transform: 'translateX(-50%)', fontSize: w * 0.13, fontWeight: 700, color: 'var(--joker)', letterSpacing: '.08em' }}>PINELLA</span>}
    </div>
  );
}

interface JokerProps { w?: number; selected?: boolean; onClick?: () => void; style?: React.CSSProperties; }
export function JokerCard({ w = 64, selected, onClick, style = {} }: JokerProps) {
  const h = w * 1.42;
  return (
    <div onClick={onClick} style={{
      width: w, height: h, borderRadius: Math.max(6, w * 0.13),
      background: 'linear-gradient(150deg, var(--card-face), var(--card-edge))',
      boxShadow: selected ? '0 0 0 2.5px var(--gold), var(--sh-2)' : 'var(--sh-card)',
      position: 'relative', flexShrink: 0, cursor: onClick ? 'pointer' : 'default',
      transition: 'transform .14s ease, box-shadow .14s ease',
      transform: selected ? 'translateY(-14px)' : 'none', ...style,
    }}>
      <div style={{ position: 'absolute', top: w * 0.08, left: w * 0.11, fontSize: w * 0.28, color: 'var(--joker)', fontWeight: 800 }}>★</div>
      <div style={{ position: 'absolute', bottom: w * 0.08, right: w * 0.11, fontSize: w * 0.28, color: 'var(--joker)', fontWeight: 800, transform: 'rotate(180deg)' }}>★</div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: w * 0.04 }}>
        <span style={{ fontSize: w * 0.66, color: 'var(--joker)', lineHeight: 1 }}>★</span>
        <span style={{ fontSize: w * 0.135, fontWeight: 800, letterSpacing: '.14em', color: 'var(--joker)', fontFamily: 'var(--font-disp)' }}>JOLLY</span>
      </div>
    </div>
  );
}

interface CardBackProps { w?: number; count?: number; style?: React.CSSProperties; }
export function CardBack({ w = 64, count, style = {} }: CardBackProps) {
  const h = w * 1.42;
  return (
    <div style={{
      width: w, height: h, borderRadius: Math.max(6, w * 0.13), flexShrink: 0, position: 'relative',
      background: 'linear-gradient(150deg, #1a4033, #03261b)',
      boxShadow: 'var(--sh-card)', overflow: 'hidden', ...style,
    }}>
      <div style={{ position: 'absolute', inset: w * 0.07, borderRadius: Math.max(4, w * 0.09),
        border: '1px solid rgba(229, 187, 89, 0.5)',
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(229, 187, 89, 0.1) 0 2px, transparent 2px 7px), repeating-linear-gradient(-45deg, rgba(229, 187, 89, 0.1) 0 2px, transparent 2px 7px)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: w * 0.42, height: w * 0.42, transform: 'rotate(45deg)',
          background: 'rgba(229, 187, 89, 0.16)', border: '1px solid rgba(229, 187, 89, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ transform: 'rotate(-45deg)', fontSize: w * 0.26, color: 'var(--gold)', fontFamily: 'var(--font-disp)', fontWeight: 700 }}>B</span>
        </div>
      </div>
      {count != null && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, textAlign: 'center', fontSize: w * 0.2, fontWeight: 800, color: 'var(--gold)', background: 'rgba(3, 25, 17, 0.7)', padding: '1px 0', fontVariantNumeric: 'tabular-nums' }}>{count}</div>}
    </div>
  );
}

interface MeldRowProps { cards: CardType[]; w?: number; type?: ReturnType<typeof burracoType>; }
export function MeldRow({ cards, w = 30, type }: MeldRowProps) {
  const overlap = w * 0.46;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {cards.map((c, i) => (
          <div key={c.id} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: i }}>
            <Card card={c} w={w} />
          </div>
        ))}
      </div>
      {type && <div style={{ paddingLeft: 2 }}><BurracoBadge type={type} small /></div>}
    </div>
  );
}
