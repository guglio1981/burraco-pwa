/* ============================================================
   Tavolo di gioco — fedele al look v527
   Usa classi di table.css + componenti in TableComponents.tsx
   ============================================================ */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/table.css';
import type { Card } from '@burraco/shared';
import { validateMeld, validateAddToMeld } from '@burraco/shared';
import { wsClient } from '../lib/ws.js';
import { useStore } from '../lib/store.js';
import { Icon } from '../components/Icon.js';
import { LtCInner, LtMeldPile, LtPozzoPile } from '../components/TableComponents.tsx';
import { SettingsSheet } from '../components/Modals.js';
import { flyGhost, flyBlock, flipEl, glowEl, bounceEl, pingEl } from '../lib/animations.js';
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

  // Animazione + suono distribuzione carte all'inizio di ogni round
  const prevRoundRef = useRef<number | null>(null);
  useEffect(() => {
    if (!view || prevRoundRef.current === view.round) return;
    prevRoundRef.current = view.round;
    // Distribuzione "teatrale" (portata dal vecchio progetto):
    // Fase 1: 11 carte una a una dal mazzo alla mia mano
    // Fase 2: blocco ×11 → avversario · Fase 3: ×11 → mio pozzo · Fase 4: ×11 → pozzo avv · Fase 5: flip scarti
    requestAnimationFrame(() => {
      const deck = deckRef.current;
      if (!deck) return;
      for (let i = 0; i < 11; i++) {
        setTimeout(() => {
          sfx.dealCard(0.88 + i * 0.01);
          if (deck && handRef.current) flyGhost(deck, handRef.current, { dorso: true, duration: 520, arc: -50, rotate: 6 });
        }, i * 90);
      }
      setTimeout(() => { sfx.dealCard(0.92); if (deck && oppBarRef.current) flyBlock(deck, oppBarRef.current, '×11', 600); }, 1150);
      setTimeout(() => { sfx.dealCard(0.87); if (deck && myPozzoRef.current) flyBlock(deck, myPozzoRef.current, '×11', 500); }, 1750);
      setTimeout(() => { sfx.dealCard(0.96); if (deck && oppPozzoRef.current) flyBlock(deck, oppPozzoRef.current, '×11', 500); }, 2250);
      setTimeout(() => { sfx.dealCard(1.10); if (discardRef.current) flipEl(discardRef.current); }, 2800);
    });
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
        } else if (action === 'discard' && oppBarRef.current && discardRef.current) {
          flyGhost(oppBarRef.current, discardRef.current, { duration: 200 });
          if (discardRef.current) bounceEl(discardRef.current);
        } else if (action === 'meld' || action === 'add_to_meld') {
          if (oppBarRef.current) pingEl(oppBarRef.current, '♟');
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

  // Layout riga mano: senza sovrapposizione se le carte ci stanno, altrimenti
  // sovrapposizione che occupa esattamente tutta la larghezza disponibile.
  const CARD_W = 46, CARD_GAP = 3, MIN_VIS = 18;
  function rowLayout(n: number): { mr: number; justify: string } {
    if (n <= 1) return { mr: 0, justify: 'flex-start' };
    const avail = handW || 360;
    const fullW = n * CARD_W + (n - 1) * CARD_GAP;
    if (fullW <= avail) {
      // carte poche: completamente visibili, accostate da sinistra senza spazi
      return { mr: CARD_GAP, justify: 'flex-start' };
    }
    // carte molte: sovrapposizione che riempie tutta la riga
    const vis = Math.max(MIN_VIS, (avail - CARD_W) / (n - 1));
    return { mr: -(CARD_W - vis), justify: 'flex-start' };
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
    const el = document.querySelector<HTMLElement>(`[data-card-id="${sel[0]}"]`);
    if (el && discardRef.current) {
      flyGhost(el, discardRef.current, { duration: 220 });
      bounceEl(discardRef.current);
    }
    sfx.discard();
    wsClient.move({ type: 'DISCARD', cardId: sel[0]! });
    store.clearSelection();
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
    if (selCards.length >= 3) {
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
          <div className="lt-opp-badge" style={{ marginLeft: 8 }}>{view.oppHandCount}</div>
          <div className="lt-spacer" />
          <button className="lt-icon-btn" aria-label="Impostazioni" onClick={() => setShowSettings(true)}>
            <Icon name="gear" size={18} color="#fff" />
          </button>
        </div>

        {/* TAVOLO */}
        <div className="lt-table">
          {/* scale avversario */}
          <div className="lt-opp-melds">
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
            <div className="lt-pw" onClick={onDiscardZone}>
              <div ref={discardRef} className={'lt-disw lt-disw-fan' + (((myPhase === 'draw' && view.discard.length) || (myPhase === 'play' && sel.length === 1)) ? ' hot' : '')}>
                {view.discard.length === 0
                  ? <div className="lt-dis-empty">vuoto</div>
                  : (() => {
                      // TUTTE le carte a ventaglio: sovrapposizione adattiva per stare nel ventaglio
                      const all = view.discard;
                      const CARD_W = 46, FAN_MAX = 200;
                      const VIS = all.length <= 1 ? 0 : Math.min(20, (FAN_MAX - CARD_W) / (all.length - 1));
                      const totalW = CARD_W + VIS * (all.length - 1);
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
            </div>
            <div ref={handRef} className="lt-handscroll">
              {rows.map((row, ri) => {
                const { mr, justify } = rowLayout(row.length);
                return (
                  <div className="lt-hand-row" key={ri} style={{ justifyContent: justify }}>
                    {row.map((c, ci) => {
                      const isDrawn = c.id === drawnCardIdRef.current;
                      return (
                        <div key={c.id} data-card-id={c.id}
                          className={`lt-card ${suitCls(c)}${sel.includes(c.id) ? ' selected' : ''}${isDrawn ? ' drawn' : ''}`}
                          style={{ marginRight: ci === row.length - 1 ? 0 : mr }}
                          onClick={() => myPhase === 'play' && toggle(c.id)}>
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
            setShowSettings(false);
            store.setRoom(null);
            store.setScreen('home');
          }}
        />
      )}
    </div>
  );
}
