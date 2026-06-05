/* ============================================================
   Popup tavolo (portati dal vecchio progetto, in React):
   - DiscardPeekPopup: rivedi tutte le carte degli scarti
   - HandViewerSheet: la tua mano ingrandita, ordinabile, selezionabile
   ============================================================ */
import React, { useRef } from 'react';
import type { Card } from '@burraco/shared';
import { LtCInner } from './TableComponents.tsx';

function suitCls(c: Card): string {
  if (c.joker) return 'joker-c';
  return c.suit === '♥' || c.suit === '♦' ? 'red' : 'blk';
}

/** Long-press (pointer): apre un popup dopo `ms` ms. `fired` segnala se è scattato (per sopprimere il click). */
export function useLongPress(cb: () => void, ms = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = () => { fired.current = false; timer.current = setTimeout(() => { fired.current = true; cb(); }, ms); };
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  return {
    fired,
    handlers: { onPointerDown: start, onPointerUp: clear, onPointerLeave: clear, onPointerCancel: clear },
  };
}

/** Divide le carte in MAX 3 righe bilanciate (≤15, ≤30, oltre = 3 righe). */
function balancedRows<T>(arr: T[], maxPerRow = 15): T[][] {
  const n = arr.length;
  if (n <= maxPerRow) return [arr];
  if (n <= maxPerRow * 2) { const h = Math.ceil(n / 2); return [arr.slice(0, h), arr.slice(h)]; }
  const t = Math.ceil(n / 3); return [arr.slice(0, t), arr.slice(t, t * 2), arr.slice(t * 2)];
}

function CardRows({ cards, selectedIds, drawnId, onCardClick }: {
  cards: Card[]; selectedIds?: string[]; drawnId?: string | null; onCardClick?: (id: string) => void;
}) {
  const CW = 46, CH = 66, MAX_PEEK = 52, MIN_PEEK = 8;
  const availW = Math.min((typeof window !== 'undefined' ? window.innerWidth : 380) - 64, 420);
  const rows = balancedRows(cards);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {rows.map((row, ri) => {
        const rn = row.length;
        const peek = rn > 1 ? Math.max(MIN_PEEK, Math.min(MAX_PEEK, (availW - CW) / (rn - 1))) : MAX_PEEK;
        const rowW = rn === 1 ? CW : Math.round(CW + (rn - 1) * peek);
        return (
          <div key={ri} style={{ position: 'relative', width: rowW, height: CH, flexShrink: 0 }}>
            {row.map((c, i) => {
              const sel = selectedIds?.includes(c.id);
              const drawn = c.id === drawnId;
              return (
                <div key={c.id}
                  className={`lt-card ${suitCls(c)}${sel ? ' selected' : ''}${drawn ? ' drawn' : ''}`}
                  style={{ position: 'absolute', left: Math.round(i * peek), top: 0, zIndex: i + 1, width: CW, height: CH, cursor: onCardClick ? 'pointer' : 'default' }}
                  onClick={onCardClick ? () => onCardClick(c.id) : undefined}>
                  <LtCInner c={c} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const boxStyle: React.CSSProperties = {
  background: 'oklch(0.20 0.022 168 / 0.98)', border: '1px solid var(--line)', borderRadius: 18,
  padding: 16, boxShadow: 'var(--sh-2)',
};

/* ── Popup scarti ─────────────────────────────────────────── */
export function DiscardPeekPopup({ cards, onClose }: { cards: Card[]; onClose: () => void }) {
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'oklch(0.12 0.02 168 / 0.66)', backdropFilter: 'blur(3px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...boxStyle, width: '100%', maxWidth: 420, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Pile scarti — {cards.length} carte
          </span>
          <button onClick={onClose} style={{ background: 'rgba(245,197,24,.15)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)', fontSize: 16, lineHeight: 1, padding: '4px 10px', cursor: 'pointer' }}>✕</button>
        </div>
        <CardRows cards={cards} />
      </div>
    </div>
  );
}

/* ── Hand viewer (bottom sheet, lascia visibile il tavolo sopra) ── */
export function HandViewerSheet({ hand, selectedIds, drawnId, onToggle, sort, setSort, msg, msgCls, myTurn, onClose }: {
  hand: Card[]; selectedIds: string[]; drawnId: string | null; onToggle: (id: string) => void;
  sort: 'suit' | 'rank'; setSort: (s: 'suit' | 'rank') => void;
  msg: string; msgCls: string; myTurn: boolean; onClose: () => void;
}) {
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 110, padding: '12px 12px calc(12px + env(safe-area-inset-bottom,0px))' }}>
      <div style={{ ...boxStyle, maxWidth: 460, margin: '0 auto', maxHeight: '58vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase' }}>Le tue carte</span>
          <button onClick={onClose} style={{ background: 'rgba(245,197,24,.15)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)', fontSize: 16, lineHeight: 1, padding: '4px 10px', cursor: 'pointer' }}>✕</button>
        </div>
        {msg && <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: msgCls === 'err' ? 'var(--danger)' : msgCls === 'ok' ? 'var(--clean)' : 'var(--gold)' }}>{msg}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 9px', borderRadius: 7, color: '#fff',
            background: myTurn ? '#2e7d32' : '#c62828', textTransform: 'uppercase' }}>{myTurn ? 'Tuo turno' : 'Turno avv'}</span>
          <button className={'lt-sort-btn' + (sort === 'suit' ? ' active' : '')} style={{ marginLeft: 'auto' }} onClick={() => setSort('suit')}>Scala</button>
          <button className={'lt-sort-btn' + (sort === 'rank' ? ' active' : '')} onClick={() => setSort('rank')}>Poker</button>
        </div>
        <CardRows cards={hand} selectedIds={selectedIds} drawnId={drawnId} onCardClick={onToggle} />
      </div>
    </div>
  );
}
