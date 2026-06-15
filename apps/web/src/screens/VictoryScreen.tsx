import React, { useEffect, useRef, useState } from 'react';
import type { Mode } from '@burraco/shared';
import { useStore } from '../lib/store.js';
import { Avatar, Icon } from '../components/Icon.js';
import { wsClient } from '../lib/ws.js';
import { gameClient } from '../lib/gameClient.js';
import { localGame } from '../lib/localGame.js';
import { clearLocalGame } from '../lib/saveGame.js';
import { clearActiveRoom } from '../lib/session.js';
import { sfx } from '../lib/sound.js';

const MODE_LABEL: Record<Mode, string> = { fast: 'Veloce', '1005': '1005', '2005': '2005' };
const MODES: Mode[] = ['fast', '1005', '2005'];

function FinalRow({ name, score, you, win }: { name: string; score: number; you?: boolean; win?: boolean; }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 16,
      background: win ? 'linear-gradient(120deg, var(--gold-soft), oklch(0.24 0.03 168 / 0.6))' : 'oklch(0.24 0.024 168 / 0.7)',
      border: '1px solid ' + (win ? 'oklch(0.81 0.125 86 / 0.55)' : 'var(--line)') }}>
      <Avatar name={name} you={you} size={40} ring={win} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'uppercase' }}>{name}{you && ' (tu)'}</div>
        {win && <div style={{ fontSize: 11.5, color: 'var(--gold)', fontWeight: 700 }}>★ Vincitore</div>}
      </div>
      <span className="tnum" style={{ fontFamily: 'var(--font-disp)', fontWeight: 800, fontSize: 26, color: win ? 'var(--gold)' : 'var(--ink-mut)' }}>{score}</span>
    </div>
  );
}

/** Selettore compatto del tipo di partita per la rivincita. */
function ModePicker({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%' }}>
      {MODES.map((m) => {
        const on = value === m;
        return (
          <button key={m} onClick={() => onChange(m)} style={{ cursor: 'pointer', borderRadius: 12, padding: '9px 4px',
            background: on ? 'var(--gold-soft)' : 'oklch(0.30 0.02 168 / 0.5)',
            border: '1.5px solid ' + (on ? 'oklch(0.81 0.125 86 / 0.7)' : 'var(--line)'),
            color: on ? 'var(--gold)' : 'var(--ink-mut)', fontFamily: 'var(--font-disp)', fontWeight: 700, fontSize: 15 }}>
            {MODE_LABEL[m]}
          </button>
        );
      })}
    </div>
  );
}

export function VictoryScreen() {
  const store = useStore();
  const view = store.gameView;
  const user = store.user;
  const oppUser = store.room ? (store.room.host?.id === user?.id ? store.room.guest : store.room.host) : null;
  const oppName = gameClient.isLocal ? 'Computer' : (oppUser?.nick ?? 'Avversario');

  // tipo selezionato per (ri)proporre la rivincita — default = tipo della partita appena finita
  const [offerMode, setOfferMode] = useState<Mode>(view?.mode ?? '1005');

  // Suona una volta sola all'arrivo sulla schermata
  const soundedRef = useRef(false);
  const iWon = view ? view.winner === view.you : false;
  useEffect(() => {
    if (soundedRef.current || !view) return;
    soundedRef.current = true;
    setTimeout(() => iWon ? sfx.win() : sfx.lose(), 300);
  }, []);

  if (!view) return null;

  const myScore = view.scores[view.you];
  const oppScore = view.scores[view.you === 'host' ? 'guest' : 'host'];
  const modeLabel = view.mode === 'fast' ? 'Veloce' : view.mode === '1005' ? 'Punti 1005' : 'Punti 2005';
  const isHost = view.you === 'host';

  function goHome() {
    // se sono in una partita online, avviso l'avversario che esco dalla stanza
    if (!gameClient.isLocal) wsClient.leaveRoom();
    clearActiveRoom();
    clearLocalGame();
    store.setRoom(null);
    store.setVsComputer(false);
    store.setRematchIncoming(null);
    store.setRematchStatus('idle');
    store.setScreen('home');
  }

  // ── Rivincita contro il computer: ripartenza locale immediata ──
  function rematchLocal() {
    store.setRoom(null);
    localGame.start(view!.mode, localGame.difficulty);
  }

  // ── Rivincita online: solo l'host propone ──
  function sendOffer() {
    wsClient.rematchOffer(offerMode);
    store.setRematchStatus('waiting');
  }
  function acceptOffer() {
    if (!store.rematchIncoming) return;
    wsClient.rematchAccept(store.rematchIncoming);
    store.setRematchIncoming(null);
  }
  function declineOffer() {
    wsClient.rematchDecline();
    store.setRematchIncoming(null);
  }

  return (
    <div className="b-screen dark-bg" style={{ overflow: 'hidden' }}>
      {/* alone oro */}
      <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 460, height: 460,
        background: 'radial-gradient(circle, oklch(0.81 0.125 86 / 0.22), transparent 62%)', pointerEvents: 'none' }} />
      {/* coriandoli statici */}
      {Array.from({ length: 22 }).map((_, i) => {
        const cols = ['var(--gold)', 'var(--clean)', 'var(--suit-red)', 'var(--ink)'];
        return <div key={i} style={{ position: 'absolute', top: (8 + (i * 37) % 70) + '%', left: ((i * 53) % 96) + '%',
          width: 7, height: 11, borderRadius: 2, background: cols[i % 4], opacity: .8, transform: `rotate(${i * 41}deg)`, pointerEvents: 'none' }} />;
      })}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 26px 36px', position: 'relative', overflowY: 'auto' }}>
        <div style={{ width: 96, height: 96, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(160deg, var(--gold), var(--gold-deep))', boxShadow: '0 12px 40px oklch(0.81 0.125 86 / 0.4)', marginBottom: 20 }}>
          <Icon name="trophy" size={50} color="oklch(0.24 0.04 80)" stroke={2.2} />
        </div>
        <div className="t-label" style={{ color: 'var(--gold-2)' }}>Partita conclusa</div>
        <h1 className="t-brand" style={{ fontSize: 46, margin: '6px 0 4px', color: 'var(--ink)' }}>
          {iWon ? 'Hai vinto!' : 'Hai perso!'}
        </h1>
        <p className="t-mut" style={{ fontSize: 14.5, marginBottom: 26 }}>{modeLabel} · {view.round} manche</p>

        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {iWon
            ? <>
                <FinalRow name={user?.nick ?? 'Tu'} score={myScore} you win />
                <FinalRow name={oppName} score={oppScore} />
              </>
            : <>
                <FinalRow name={oppName} score={oppScore} win />
                <FinalRow name={user?.nick ?? 'Tu'} score={myScore} you />
              </>}
        </div>

        {/* ── Area azioni / rivincita ── */}
        <div style={{ width: '100%', maxWidth: 320, marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {gameClient.isLocal ? (
            // vs computer: ripartenza immediata
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={goHome}>Home</button>
              <button className="btn btn-gold" style={{ flex: 1.4 }} onClick={rematchLocal}>Rivincita</button>
            </div>
          ) : store.rematchStatus === 'left' ? (
            // l'avversario è uscito dalla stanza: niente rivincita possibile
            <>
              <div style={{ textAlign: 'center', padding: '12px', borderRadius: 14,
                background: 'oklch(0.255 0.026 168 / 0.85)', border: '1px solid var(--line)', color: 'var(--ink-mut)', fontSize: 14 }}>
                <b style={{ color: 'var(--ink)' }}>{oppName}</b> ha lasciato la partita.
              </div>
              <button className="btn btn-gold" style={{ width: '100%' }} onClick={goHome}>Home</button>
            </>
          ) : isHost ? (
            // HOST online: propone la rivincita scegliendo il tipo
            <>
              {store.rematchStatus === 'waiting' ? (
                <div style={{ textAlign: 'center', padding: '14px 12px', borderRadius: 14,
                  background: 'oklch(0.255 0.026 168 / 0.85)', border: '1px solid var(--line)', color: 'var(--ink-mut)', fontSize: 14 }}>
                  In attesa che <b style={{ color: 'var(--ink)' }}>{oppName}</b> accetti la rivincita…
                </div>
              ) : (
                <>
                  {store.rematchStatus === 'declined' && (
                    <div style={{ textAlign: 'center', padding: '10px 12px', borderRadius: 12,
                      background: 'oklch(0.52 0.18 25 / 0.14)', border: '1px solid oklch(0.52 0.18 25 / 0.45)', color: 'oklch(0.78 0.14 25)', fontSize: 13.5 }}>
                      {oppName} ha rifiutato. Riprova con un altro tipo di partita.
                    </div>
                  )}
                  <div className="t-label" style={{ textAlign: 'center' }}>Tipo di partita</div>
                  <ModePicker value={offerMode} onChange={setOfferMode} />
                </>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={goHome}>Home</button>
                <button className="btn btn-gold" onClick={sendOffer} disabled={store.rematchStatus === 'waiting'}
                  style={{ flex: 1.4, opacity: store.rematchStatus === 'waiting' ? 0.5 : 1 }}>
                  {store.rematchStatus === 'declined' ? 'Riproponi' : 'Chiedi rivincita'}
                </button>
              </div>
            </>
          ) : (
            // GUEST online: aspetta la proposta dell'host
            <>
              <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--ink-dim)' }}>
                {oppName} può proporre la rivincita.
              </div>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={goHome}>Home</button>
            </>
          )}
        </div>
      </div>

      {/* Popup proposta di rivincita (lato GUEST) */}
      {!gameClient.isLocal && !isHost && store.rematchIncoming && (
        <div style={{ position: 'absolute', inset: 0, background: 'oklch(0.12 0.02 168 / 0.7)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: 320, background: 'linear-gradient(160deg, oklch(0.31 0.04 168 / 0.97), oklch(0.22 0.03 168 / 0.97))',
            border: '1.5px solid oklch(0.81 0.125 86 / 0.5)', borderRadius: 22, padding: 22, boxShadow: 'var(--sh-1)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-disp)', fontWeight: 800, fontSize: 20, color: 'var(--ink)', marginBottom: 6 }}>Rivincita?</div>
            <div style={{ fontSize: 14, color: 'var(--ink-mut)', marginBottom: 18 }}>
              <b style={{ color: 'var(--ink)' }}>{oppName}</b> propone una nuova partita: <b style={{ color: 'var(--gold)' }}>{MODE_LABEL[store.rematchIncoming]}</b>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={declineOffer}>Rifiuta</button>
              <button className="btn btn-gold" style={{ flex: 1.2 }} onClick={acceptOffer}>Accetta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
