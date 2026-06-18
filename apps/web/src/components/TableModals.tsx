/* ============================================================
   Popup tavolo (in React, sincronizzati con la pagina):
   - DiscardPeekPopup: rivedi le carte degli scarti — niente overlay,
     ancorato sopra la pila scarti, cresce verso l'alto.
   - HandViewerSheet: la tua mano ingrandita — niente overlay, trascinabile
     su/giù con maniglia, istruzioni+timer identici alla pagina, giocabile.
   ============================================================ */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Card } from '@burraco/shared';
import { LtCInner } from './TableComponents.tsx';

function suitCls(c: Card): string {
  if (c.joker) return 'joker-c';
  return c.suit === '♥' || c.suit === '♦' ? 'red' : 'blk';
}

/** Long-press (pointer): apre un popup dopo `ms` ms. `fired` per sopprimere il click. */
export function useLongPress(cb: () => void, ms = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = () => { fired.current = false; timer.current = setTimeout(() => { fired.current = true; cb(); }, ms); };
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  return { fired, handlers: { onPointerDown: start, onPointerUp: clear, onPointerLeave: clear, onPointerCancel: clear } };
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
  background: 'rgba(12, 25, 20, 0.98)', border: '1px solid var(--line)', borderRadius: 16,
  boxShadow: 'var(--sh-2)',
  userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' as React.CSSProperties['WebkitTouchCallout'],
};
const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(245,197,24,.15)', border: '1px solid var(--line)', borderRadius: 8,
  color: 'var(--ink)', fontSize: 16, lineHeight: 1, padding: '4px 10px', cursor: 'pointer', flexShrink: 0,
};

/* ── Popup scarti: niente overlay, ancorato SOPRA la pila scarti, cresce verso l'alto ── */
export function DiscardPeekPopup({ cards, anchorRef, onClose }: {
  cards: Card[]; anchorRef: React.RefObject<HTMLElement>; onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const [pos, setPos] = useState<{ bottom: number; maxH: number } | null>(null);

  useLayoutEffect(() => {
    const wh = window.innerHeight;
    const el = anchorRef.current;
    if (!el) { setPos({ bottom: Math.round(wh * 0.42), maxH: Math.round(wh * 0.42) }); return; }
    const r = el.getBoundingClientRect();
    const GAP = 10, MIN_TOP = 10;
    setPos({ bottom: Math.max(8, wh - r.top + GAP), maxH: Math.max(140, r.top - MIN_TOP - GAP) });
  }, [anchorRef, cards.length]);

  // chiusura su tap fuori dal box (niente overlay → ascolto i pointerdown globali)
  useEffect(() => {
    const onDown = (e: PointerEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) closeRef.current(); };
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 60);
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', onDown, true); };
  }, []);

  return (
    <div ref={boxRef} style={{
      ...boxStyle, position: 'fixed', left: '50%', transform: 'translateX(-50%)',
      bottom: pos?.bottom ?? '45%', maxHeight: pos?.maxH ?? '42vh',
      width: 'calc(100% - 24px)', maxWidth: 460, padding: 14, overflowY: 'auto', zIndex: 90,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Pile scarti — {cards.length} carte
        </span>
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
      </div>
      <CardRows cards={cards} />
    </div>
  );
}

/* ── Hand viewer: niente overlay, trascinabile su/giù, istruzioni+timer come la pagina ── */
export function HandViewerSheet(props: {
  hand: Card[]; selectedIds: string[]; drawnId: string | null; onToggle: (id: string) => void;
  sort: 'suit' | 'rank'; setSort: (s: 'suit' | 'rank') => void;
  msg: string; msgCls: string; myTurn: boolean;
  timerShow: boolean; timerFrac: number; timerOpp: boolean; timerAnimate: boolean;
  onClose: () => void;
}) {
  const { hand, selectedIds, drawnId, onToggle, sort, setSort, msg, msgCls, myTurn,
    timerShow, timerFrac, timerOpp, timerAnimate, onClose } = props;

  // trascinamento verticale con maniglia — può salire fino al bordo SUPERIORE dello schermo
  const boxRef = useRef<HTMLDivElement>(null);
  const dragYRef = useRef(0);
  const [dragY, setDragY] = useState(0);
  const setDrag = (v: number) => { dragYRef.current = v; setDragY(v); };
  const drag = useRef<{ startY: number; base: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { drag.current = { startY: e.clientY, base: dragYRef.current }; (e.currentTarget as Element).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    let ny = drag.current.base + (e.clientY - drag.current.startY);
    const box = boxRef.current;
    if (box) {
      const restTop = box.getBoundingClientRect().top - dragYRef.current; // posizione del top a dragY=0
      ny = Math.max(-restTop, Math.min(0, ny)); // top del box non oltre il bordo superiore (0)
    } else {
      ny = Math.max(-(window.innerHeight - 60), Math.min(0, ny));
    }
    setDrag(ny);
  };
  const onUp = (e: React.PointerEvent) => { drag.current = null; try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* noop */ } };

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 2000, transform: `translateY(${dragY}px)`,
      padding: '0 12px calc(12px + env(safe-area-inset-bottom,0px))', pointerEvents: 'none' }}>
      <div ref={boxRef} style={{ ...boxStyle, maxWidth: 460, margin: '0 auto', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
        {/* intera intestazione trascinabile (maniglia + titolo) — area ampia per afferrare facile */}
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ cursor: 'grab', touchAction: 'none', flexShrink: 0, padding: '6px 14px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <div style={{ width: 56, height: 6, borderRadius: 99, background: 'var(--gold-2)', opacity: 0.7 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>Le tue carte</span>
            <button onClick={onClose} onPointerDown={(e) => e.stopPropagation()} style={closeBtnStyle}>✕</button>
          </div>
        </div>
        {/* barra del tempo — identica alla pagina */}
        <div className="lt-timer-wrap" style={{ margin: '0 14px' }}>
          {timerShow && <div className={`lt-timer-fill${timerOpp ? ' opp' : ''}`}
            style={{ width: (timerFrac * 100) + '%', transition: timerAnimate ? 'width 1s linear' : 'none' }} />}
        </div>
        {/* istruzioni — stesso carattere/colore della pagina (.lt-msgbar) */}
        <div className="lt-msg-bar" style={{ borderBottom: 'none' }}>
          <span className={`lt-msgbar ${msgCls}`}>{msg}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px 8px' }}>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 9px', borderRadius: 7, color: '#fff',
            background: myTurn ? '#2e7d32' : '#c62828', textTransform: 'uppercase' }}>{myTurn ? 'Tuo turno' : 'Turno avv'}</span>
          <button className={'lt-sort-btn' + (sort === 'suit' ? ' active' : '')} style={{ marginLeft: 'auto' }} onClick={() => setSort('suit')}>Scala</button>
          <button className={'lt-sort-btn' + (sort === 'rank' ? ' active' : '')} onClick={() => setSort('rank')}>Poker</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '4px 14px 14px' }}>
          <CardRows cards={hand} selectedIds={selectedIds} drawnId={drawnId} onCardClick={onToggle} />
        </div>
      </div>
    </div>
  );
}
