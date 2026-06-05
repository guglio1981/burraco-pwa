/* ============================================================
   Tavolo di gioco — fedele al look v527
   Usa classi di table.css + componenti in TableComponents.tsx
   ============================================================ */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import '../styles/table.css';
import type { Card } from '@burraco/shared';
import { validateMeld, validateAddToMeld } from '@burraco/shared';
import { wsClient } from '../lib/ws.js';
import { useStore } from '../lib/store.js';
import { clearActiveRoom } from '../lib/session.js';
import { Icon } from '../components/Icon.js';
import { LtCInner, LtMeldPile, LtPozzoPile } from '../components/TableComponents.tsx';
import { SettingsSheet } from '../components/Modals.js';
import { DiscardPeekPopup, HandViewerSheet, useLongPress } from '../components/TableModals.js';
import { flyGhost, flyRect, flyBlock, flipEl, glowEl, bounceEl, pingEl } from '../lib/animations.js';
import { sfx } from '../lib/sound.js';

const MODE_LABELS: Record<string, string> = { fast: 'Mod. veloce', '1005': 'Punti 1005', '2005': 'Punti 2005' };

function suitCls(c: Card) {
  if (c.joker) return 'joker-c';
  return c.suit === '♥' || c.suit === '♦' ? 'red' : 'blk';
}

export function TableScreen() {
  const store = useStore();
  const view = store.gameView;
  const sel = store.selectedIds;
  const [sort, setSort] = useState<'suit' | 'rank'>('suit');
  const [showSettings, setShowSettings] = useState(false);
  const [showDiscardPeek, setShowDiscardPeek] = useState(false);
  const [showHandViewer, setShowHandViewer] = useState(false);
  const discardLP = useLongPress(() => { if (view && view.discard.length) setShowDiscardPeek(true); });
  const handLP = useLongPress(() => setShowHandViewer(true));

  // Re-render ogni secondo per far scorrere la barra del tempo
  const [, setTick] = useState(0);
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 60), 1000);
    return () => clearInterval(id);
  }, []);

  // Suono timer (dal vecchio progetto): solo nel MIO turno, cadenza che accelera
  // 1s sopra i 10s → 0.5s sotto i 10s → 0.25s sotto i 5s.
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    function loop() {
      const v = viewRef.current;
      let next = 1000;
      if (v && v.turn === v.you && (v.phase === 'draw' || v.phase === 'play')) {
        const remaining = Math.max(0, 60000 - (Date.now() - v.turnStart));
        const urgent = remaining <= 10000;
        sfx.tick(urgent);
        next = remaining > 10000 ? 1000 : remaining > 5000 ? 500 : 250;
      }
      id = setTimeout(loop, next);
    }
    id = setTimeout(loop, 1000);
    return () => clearTimeout(id);
  }, []);

  // Disabilita la transizione CSS del timer per un frame quando cambia il turno,
  // così il reset a 100% è istantaneo invece di animare la risalita
  const [timerAnimate, setTimerAnimate] = useState(false);
  const prevTurnKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!view) return;
    const key = `${view.turn}-${view.round}`;
    if (prevTurnKeyRef.current !== null && prevTurnKeyRef.current !== key) {
      setTimerAnimate(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setTimerAnimate(true)));
    } else if (prevTurnKeyRef.current === null) {
      setTimerAnimate(true);
    }
    prevTurnKeyRef.current = key;
  }, [view?.turn, view?.round]);

  // Larghezza disponibile per la mano (per calcolare la sovrapposizione delle carte)
  const [handW, setHandW] = useState(0);

  // Refs per le zone del tavolo (animazioni)
  const deckRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const myMeldsRef = useRef<HTMLDivElement>(null);
  const oppBarRef = useRef<HTMLDivElement>(null);
  const myPozzoRef = useRef<HTMLDivElement>(null);
  const oppPozzoRef = useRef<HTMLDivElement>(null);
  const oppMeldsRef = useRef<HTMLDivElement>(null);
  const oppCountRef = useRef<HTMLDivElement>(null);

  useEffect(() => { store.clearSelection(); }, [view?.phase, view?.turn]);

  // Traccia la carta pescata: quando la fase passa da draw→play salviamo gli id della mano
  // e confrontiamo con quelli precedenti per trovare la carta nuova
  const prevHandIdsRef = useRef<Set<string>>(new Set());
  const drawnCardIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!view) return;
    if (view.turn === view.you) {
      if (view.phase === 'play') {
        const nowIds = new Set(view.myHand.map((c) => c.id));
        const newId = [...nowIds].find((id) => !prevHandIdsRef.current.has(id)) ?? null;
        drawnCardIdRef.current = newId;
      } else if (view.phase === 'draw') {
        drawnCardIdRef.current = null;
      }
      prevHandIdsRef.current = new Set(view.myHand.map((c) => c.id));
    }
  }, [view?.phase, view?.turn, view?.rev]);

  // Misura la larghezza utile della mano (esclusi i padding) e aggiorna a ogni resize
  useEffect(() => {
    const el = handRef.current;
    if (!el) return;
    const update = () => setHandW(el.clientWidth - 16);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view !== null]);

  // Animazione + suono distribuzione carte all'inizio di ogni round.
  // useLayoutEffect: nasconde gli elementi PRIMA del paint (niente flash dello scarto iniziale).
  const prevRoundRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!view || prevRoundRef.current === view.round) return;
    prevRoundRef.current = view.round;
    const deck = deckRef.current;
    if (!deck) return;

    // Nascondi subito tutto ciò che "riceve" le carte: appare solo quando le riceve davvero
    const hide = (r: React.RefObject<HTMLElement>) => { if (r.current) r.current.style.visibility = 'hidden'; };
    const show = (r: React.RefObject<HTMLElement>) => { if (r.current) r.current.style.visibility = ''; };
    hide(handRef); hide(discardRef); hide(myPozzoRef); hide(oppPozzoRef); hide(oppCountRef);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    // ── Fase 1: 11 carte dal mazzo alla LORO posizione reale nella mano ──
    const cards = handRef.current ? [...handRef.current.querySelectorAll<HTMLElement>('.lt-card')] : [];
    for (let i = 0; i < 11; i++) {
      at(i * 90, () => {
        sfx.dealCard(0.88 + i * 0.01);
        const target = cards[i] ?? handRef.current;
        if (deck && target) flyGhost(deck, target, { dorso: true, duration: 520, arc: -50, rotate: 6 });
      });
    }
    at(11 * 90 + 230, () => show(handRef)); // rivela la mano quando l'ultima è arrivata

    // ── Fase 2: blocco ×11 → mano avversario (badge carte) ──
    at(1300, () => { sfx.dealCard(0.92); const t = oppCountRef.current ?? oppBarRef.current; if (deck && t) flyBlock(deck, t, '×11', 600); });
    at(1900, () => show(oppCountRef));
    // ── Fase 3: blocco ×11 → mio pozzo ──
    at(1900, () => { sfx.dealCard(0.87); if (deck && myPozzoRef.current) flyBlock(deck, myPozzoRef.current, '×11', 500); });
    at(2400, () => show(myPozzoRef));
    // ── Fase 4: blocco ×11 → pozzo avversario ──
    at(2400, () => { sfx.dealCard(0.96); if (deck && oppPozzoRef.current) flyBlock(deck, oppPozzoRef.current, '×11', 500); });
    at(2900, () => show(oppPozzoRef));
    // ── Fase 5: la prima carta scarti appare ORA, con flip 3D ──
    at(3000, () => { sfx.dealCard(1.10); if (discardRef.current) { show(discardRef); flipEl(discardRef.current); } });

    return () => { timers.forEach(clearTimeout); show(handRef); show(discardRef); show(myPozzoRef); show(oppPozzoRef); show(oppCountRef); };
  }, [view?.round]);

  // Suono "tuo turno" quando tocca a me
  const prevTurnRef = useRef<string | null>(null);
  useEffect(() => {
    if (view && view.turn === view.you && prevTurnRef.current !== view.you + view.rev) {
      sfx.yourTurn();
      prevTurnRef.current = view.you + view.rev;
    }
  }, [view?.turn, view?.rev]);

  // Animazioni azioni avversario
  useEffect(() => {
    wsClient.updateHandlers({
      onOppAction: (action) => {
        sfx.oppAction();
        if (action === 'draw_deck' && deckRef.current && oppBarRef.current) {
          flyGhost(deckRef.current, oppBarRef.current, { dorso: true, duration: 220 });
        } else if (action === 'take_discard' && discardRef.current && oppBarRef.current) {
          // l'avversario prende dalla pila scarti: scarti → sua mano
          flyGhost(discardRef.current, oppBarRef.current, { duration: 240, arc: -34 });
        } else if (action === 'discard' && oppBarRef.current && discardRef.current) {
          const t = discardLandingRect();
          if (t) flyRect(oppBarRef.current.getBoundingClientRect(), t, { duration: 220 });
          bounceEl(discardRef.current);
        } else if (action === 'meld' || action === 'add_to_meld') {
          // l'avversario cala: sua mano → sue scale
          if (oppBarRef.current && oppMeldsRef.current) flyGhost(oppBarRef.current, oppMeldsRef.current, { duration: 260, arc: -30 });
          else if (oppBarRef.current) pingEl(oppBarRef.current, '♟');
        }
      },
    });
  }, []);

  const toggle = useCallback((id: string) => store.toggleCard(id), []);

  if (!view) return <div className="legacy-table" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Caricamento…</div>;

  const isMyTurn = view.phase === 'draw' || view.phase === 'play';
  const myPhase = view.turn === view.you ? view.phase : 'wait';

  const selCards = sel.map((id) => view.myHand.find((c) => c.id === id)).filter(Boolean) as Card[];
  const meldVal = selCards.length >= 3 ? validateMeld(selCards) : { valid: false };
  // Carta che NON puoi riscartare: l'unica appena raccolta da una pila scarti di 1 carta (regola §4)
  const blockedDiscardId = view.mustDiscardDifferentId;
  const selIsBlocked = sel.length === 1 && sel[0] === blockedDiscardId;

  // Ordina mano
  const hand = [...view.myHand].sort((a, b) => {
    if (sort === 'suit') {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      const RIDX: Record<string, number> = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, JK: 14 };
      return (RIDX[a.rank] ?? 0) - (RIDX[b.rank] ?? 0);
    }
    const RIDX: Record<string, number> = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, JK: 14 };
    return (RIDX[a.rank] ?? 0) - (RIDX[b.rank] ?? 0);
  });

  // Fino a 15 carte: una sola riga. Oltre: due righe.
  const rows = hand.length <= 15
    ? [hand]
    : [hand.slice(0, Math.ceil(hand.length / 2)), hand.slice(Math.ceil(hand.length / 2))];

  // Layout riga mano. `vis` = striscia visibile per carta.
  // Le carte NON si tagliano mai a destra: se non ci stanno si sovrappongono di più
  // (anche fino a diventare illeggibili → in quel caso il tap apre il popup "Le tue carte").
  const CARD_W = 46, CARD_GAP = 3, READABLE_MIN = 17;
  function rowLayout(n: number): { mr: number; justify: string; vis: number } {
    if (n <= 1) return { mr: 0, justify: 'flex-start', vis: CARD_W };
    const avail = handW || 360;
    const fullW = n * CARD_W + (n - 1) * CARD_GAP;
    if (fullW <= avail) {
      // carte poche: completamente visibili, accostate da sinistra senza spazi
      return { mr: CARD_GAP, justify: 'flex-start', vis: CARD_W };
    }
    // carte molte: sovrapposizione che riempie ESATTAMENTE la riga (mai overflow/taglio)
    const vis = (avail - CARD_W) / (n - 1);
    return { mr: -(CARD_W - vis), justify: 'flex-start', vis };
  }

  // Azioni + animazioni + suoni
  function drawDeck() {
    if (myPhase !== 'draw') return;
    if (deckRef.current) glowEl(deckRef.current);
    if (deckRef.current && handRef.current) {
      flyGhost(deckRef.current, handRef.current, { dorso: true, duration: 230 });
    }
    sfx.draw();
    wsClient.move({ type: 'DRAW_DECK' });
  }
  function takeDiscard() {
    if (myPhase !== 'draw' || !view!.discard.length) return;
    if (discardRef.current && handRef.current) {
      flyGhost(discardRef.current, handRef.current, { duration: 200 });
    }
    sfx.draw();
    wsClient.move({ type: 'TAKE_DISCARD' });
  }
  function doMeld() {
    if (!meldVal.valid) return;
    if (myMeldsRef.current) {
      sel.forEach((id, i) => {
        const el = document.querySelector<HTMLElement>(`[data-card-id="${id}"]`);
        if (el && myMeldsRef.current) {
          flyGhost(el, myMeldsRef.current, { duration: 200, arc: -28, delay: i * 40 });
        }
      });
    }
    sfx.meld();
    wsClient.move({ type: 'MELD', cardIds: sel });
    store.clearSelection();
  }
  function doDiscard() {
    if (sel.length !== 1) return;
    if (selIsBlocked) {
      store.showToast('Non puoi riscartare la carta appena presa dagli scarti — scartane un\'altra', 2600);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-card-id="${sel[0]}"]`);
    const target = discardLandingRect();
    if (el && target) {
      flyRect(el.getBoundingClientRect(), target, { duration: 220 });
      if (discardRef.current) bounceEl(discardRef.current);
    }
    sfx.discard();
    wsClient.move({ type: 'DISCARD', cardId: sel[0]! });
    store.clearSelection();
  }
  // Rettangolo dove atterra la carta scartata = estremo DESTRO del ventaglio scarti (carta più recente)
  function discardLandingRect(): DOMRect | null {
    const el = discardRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const W = 46, H = 66;
    return new DOMRect(r.right - W, r.top + (r.height - H) / 2, W, H);
  }
  // Tap sull'area degli scarti: in pesca = prendi dagli scarti; in gioco = scarta la carta selezionata
  function onDiscardZone() {
    if (myPhase === 'draw') { takeDiscard(); return; }
    if (myPhase === 'play') {
      if (sel.length === 1) doDiscard();
      else store.showToast('Seleziona 1 carta da scartare');
    }
  }
  // Tap sull'area delle mie scale: cala una nuova scala/tris con le carte selezionate
  function onMeldsZone() {
    if (myPhase !== 'play' || selCards.length === 0) return;
    if (meldVal.valid) doMeld();
    else store.showToast(meldVal.msg ?? 'Servono almeno 3 carte valide per calare');
  }
  function addToMeld(meldIndex: number) {
    if (myPhase !== 'play' || !sel.length) return;
    const existing = view!.myMelds[meldIndex];
    if (!existing) return;
    const v = validateAddToMeld(existing, selCards);
    if (!v.valid) { store.showToast(v.msg ?? 'Aggiunta non valida'); return; }
    if (myMeldsRef.current) {
      sel.forEach((id, i) => {
        const el = document.querySelector<HTMLElement>(`[data-card-id="${id}"]`);
        if (el && myMeldsRef.current) flyGhost(el, myMeldsRef.current, { duration: 200, delay: i * 35 });
      });
    }
    sfx.meld();
    wsClient.move({ type: 'ADD_TO_MELD', meldIndex, cardIds: sel });
    store.clearSelection();
  }

  // Nomi reali dei giocatori (da room/user), non host/guest
  const room = store.room;
  const meUser = store.user;
  const oppUser = room ? (room.host?.id === meUser?.id ? room.guest : room.host) : null;
  const myName = meUser?.nick ?? 'Tu';
  const oppName = oppUser?.nick ?? 'Avversario';
  const initial = (n: string) => n.trim()[0]?.toUpperCase() ?? '?';

  // Messaggio barra
  let msg = 'Pesca dal mazzo o dagli scarti', msgCls = '';
  if (myPhase === 'wait') { msg = `Turno di ${oppName}`; }
  else if (myPhase === 'play') {
    if (selIsBlocked) {
      msg = 'Non puoi riscartare la carta appena presa dagli scarti — scartane un\'altra';
      msgCls = 'err';
    } else if (selCards.length >= 3) {
      msg = meldVal.valid ? `${meldVal.label ?? 'Scala valida'} — tocca le tue scale per calare` : (meldVal.msg ?? 'Scala non valida');
      msgCls = meldVal.valid ? 'ok' : 'err';
    } else if (selCards.length === 1) {
      msg = 'Tocca gli scarti per scartare e chiudere il turno';
    } else {
      msg = 'Seleziona le carte: cala toccando le tue scale, scarta toccando gli scarti';
    }
  }

  // Timer
  const elapsed = Math.floor((Date.now() - view.turnStart) / 1000);
  const timerSec = Math.max(0, 60 - elapsed);
  const timerFrac = timerSec / 60;

  const topCard = view.discard.length > 0 ? view.discard[view.discard.length - 1] : null;

  return (
    <div className="legacy-table">
      <div className="lt-safe" />
      <div className="lt-game">

        {/* TOPBAR avversario */}
        <div className="lt-topbar" ref={oppBarRef}>
          <div className="lt-av">{initial(oppName)}</div>
          <span className="lt-pname">{oppName}</span>
          <span className="lt-sbig">{view.scores[view.you === 'host' ? 'guest' : 'host']}</span>
          <div ref={oppPozzoRef} style={{ display: 'inline-flex' }}>
            <LtPozzoPile taken={view.oppPozzoPicked} count={view.oppPozzoCount} />
          </div>
          <div ref={oppCountRef} className="lt-opp-badge" style={{ marginLeft: 8 }}>{view.oppHandCount}</div>
          <div className="lt-spacer" />
          <button className="lt-icon-btn" aria-label="Impostazioni" onClick={() => setShowSettings(true)}>
            <Icon name="gear" size={18} color="#fff" />
          </button>
        </div>

        {/* TAVOLO */}
        <div className="lt-table">
          {/* scale avversario */}
          <div className="lt-opp-melds" ref={oppMeldsRef}>
            <div className="lt-melds-row">
              {view.oppMelds.length === 0
                ? <span className="lt-meld-empty">nessuna scala</span>
                : view.oppMelds.map((m, i) => <LtMeldPile key={i} cards={m} />)}
            </div>
          </div>

          {/* mazzo + scarti */}
          <div className="lt-center">
            <div className={'lt-pw' + (myPhase !== 'draw' ? ' dis' : '')} onClick={drawDeck}>
              <div ref={deckRef} className={'lt-deck' + (myPhase === 'draw' ? ' hot' : '')}>
                <span className="lt-deck-count">{view.deckCount}</span>
              </div>
              <div className="lt-plbl">Mazzo</div>
            </div>
            <div className="lt-pw" {...discardLP.handlers}
              onClick={() => { if (discardLP.fired.current) { discardLP.fired.current = false; return; } onDiscardZone(); }}>
              <div ref={discardRef} className={'lt-disw lt-disw-fan' + (((myPhase === 'draw' && view.discard.length) || (myPhase === 'play' && sel.length === 1 && !selIsBlocked)) ? ' hot' : '')}>
                {view.discard.length === 0
                  ? <div className="lt-dis-empty">vuoto</div>
                  : (() => {
                      // TUTTE le carte a ventaglio: usa tutto lo spazio fino al bordo destro
                      // (lasciando margine per il badge del numero totale).
                      const all = view.discard;
                      const DW = 46;
                      const FAN_MAX = Math.max(160, (typeof window !== 'undefined' ? window.innerWidth : 360) - 104);
                      const VIS = all.length <= 1 ? 0 : Math.min(20, (FAN_MAX - DW) / (all.length - 1));
                      const totalW = DW + VIS * (all.length - 1);
                      return (
                        <div style={{ position: 'relative', width: totalW, height: 66 }}>
                          {all.map((c, i) => (
                            <div key={c.id}
                              className={`lt-card ${suitCls(c)}`}
                              style={{ position: 'absolute', left: i * VIS, top: 0, zIndex: i + 1 }}>
                              <LtCInner c={c} />
                            </div>
                          ))}
                          <div className="lt-disbadge" style={{ zIndex: 100 }}>{all.length}</div>
                        </div>
                      );
                    })()
                }
              </div>
              <div className="lt-plbl">Scarti</div>
            </div>
          </div>

          {/* barra "Tu" */}
          <div className="lt-me-bar">
            <div className="lt-av">{initial(myName)}</div>
            <span className="lt-pname">{myName}</span>
            <span className="lt-sbig">{view.scores[view.you]}</span>
            <div ref={myPozzoRef} style={{ display: 'inline-flex' }}>
              <LtPozzoPile taken={view.myPozzoPicked} count={view.myPozzoCount} />
            </div>
          </div>

          {/* scale mie — tocca qui per calare una nuova scala/tris */}
          <div className={'lt-my-melds' + (myPhase === 'play' && meldVal.valid ? ' hot' : '')} ref={myMeldsRef} onClick={onMeldsZone}>
            <div className="lt-melds-row">
              {view.myMelds.length === 0
                ? <span className="lt-meld-empty">{myPhase === 'play' && selCards.length >= 3 ? 'tocca qui per calare' : 'nessuna scala'}</span>
                : view.myMelds.map((m, i) => (
                    <LtMeldPile key={i} cards={m}
                      onClick={(e) => { e.stopPropagation(); if (myPhase === 'play' && sel.length > 0) addToMeld(i); }} />
                  ))}
            </div>
          </div>
        </div>

        {/* HUD inferiore */}
        <div className="lt-bot">
          <div className="lt-bot-left">
            <div className="lt-turn-lbl">
              <span className={'lt-turn-badge' + (isMyTurn && view.turn === view.you ? ' my' : ' opp')}>
                {isMyTurn && view.turn === view.you ? 'Tuo turno' : 'Turno avv'}
              </span>
            </div>
            <div className="lt-bot-mode">{MODE_LABELS[view.mode]}</div>
            <div className="lt-bot-round">Round {view.round}</div>
            <div className="lt-sort-btns">
              <button className={'lt-sort-btn' + (sort === 'suit' ? ' active' : '')} onClick={() => setSort('suit')}>Scala</button>
              <button className={'lt-sort-btn' + (sort === 'rank' ? ' active' : '')} onClick={() => setSort('rank')}>Poker</button>
            </div>
          </div>
          <div className="lt-bot-center">
            <div className="lt-timer-wrap">
              {isMyTurn && (
                <div className={`lt-timer-fill${view.turn !== view.you ? ' opp' : ''}`}
                  style={{ width: (timerFrac * 100) + '%', transition: timerAnimate ? 'width 1s linear' : 'none' }} />
              )}
            </div>
            <div className="lt-msg-bar">
              <div className={`lt-msgbar ${msgCls}`}>{msg}</div>
              <button className="lt-icon-btn" aria-label="Le tue carte" onClick={() => setShowHandViewer(true)}>
                <Icon name="eye" size={20} color="#fff" />
              </button>
            </div>
            <div ref={handRef} className="lt-handscroll" {...handLP.handlers}>
              {rows.map((row, ri) => {
                const { mr, justify, vis } = rowLayout(row.length);
                const unreadable = vis < READABLE_MIN;
                return (
                  <div className="lt-hand-row" key={ri} style={{ justifyContent: justify }}>
                    {row.map((c, ci) => {
                      const isDrawn = c.id === drawnCardIdRef.current;
                      return (
                        <div key={c.id} data-card-id={c.id}
                          className={`lt-card ${suitCls(c)}${sel.includes(c.id) ? ' selected' : ''}${isDrawn ? ' drawn' : ''}`}
                          style={{ marginRight: ci === row.length - 1 ? 0 : mr }}
                          onClick={() => {
                            if (handLP.fired.current) { handLP.fired.current = false; return; }
                            if (unreadable) { setShowHandViewer(true); return; } // carte troppo sovrapposte → apri viewer
                            if (myPhase === 'play') toggle(c.id);
                          }}>
                          <LtCInner c={c} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
      {showSettings && (
        <SettingsSheet
          onClose={() => setShowSettings(false)}
          onAbandon={() => {
            wsClient.abandon();
            clearActiveRoom();
            setShowSettings(false);
            store.setRoom(null);
            store.setScreen('home');
          }}
        />
      )}
      {showDiscardPeek && (
        <DiscardPeekPopup cards={view.discard} anchorRef={discardRef} onClose={() => setShowDiscardPeek(false)} />
      )}
      {showHandViewer && (
        <HandViewerSheet
          hand={hand}
          selectedIds={sel}
          drawnId={drawnCardIdRef.current}
          onToggle={(id) => { if (myPhase === 'play') toggle(id); }}
          sort={sort}
          setSort={setSort}
          msg={msg}
          msgCls={msgCls}
          myTurn={myPhase !== 'wait'}
          timerShow={isMyTurn}
          timerFrac={timerFrac}
          timerOpp={view.turn !== view.you}
          timerAnimate={timerAnimate}
          onClose={() => setShowHandViewer(false)}
        />
      )}
    </div>
  );
}
