import React, { useEffect, useRef } from 'react';
import { useStore } from '../lib/store.js';
import { Avatar, Icon } from '../components/Icon.js';
import { wsClient } from '../lib/ws.js';
import { api } from '../lib/api.js';
import { getToken } from '../lib/session.js';
import { sfx } from '../lib/sound.js';

function FinalRow({ name, score, you, win }: { name: string; score: number; you?: boolean; win?: boolean; }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 16,
      background: win ? 'linear-gradient(120deg, var(--gold-soft), oklch(0.24 0.03 168 / 0.6))' : 'oklch(0.24 0.024 168 / 0.7)',
      border: '1px solid ' + (win ? 'oklch(0.81 0.125 86 / 0.55)' : 'var(--line)') }}>
      <Avatar name={name} you={you} size={40} ring={win} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{name}{you && ' (tu)'}</div>
        {win && <div style={{ fontSize: 11.5, color: 'var(--gold)', fontWeight: 700 }}>★ Vincitore</div>}
      </div>
      <span className="tnum" style={{ fontFamily: 'var(--font-disp)', fontWeight: 800, fontSize: 26, color: win ? 'var(--gold)' : 'var(--ink-mut)' }}>{score}</span>
    </div>
  );
}

export function VictoryScreen() {
  const store = useStore();
  const view = store.gameView;
  const user = store.user;
  const oppUser = store.room ? (store.room.host?.id === user?.id ? store.room.guest : store.room.host) : null;
  const oppName = oppUser?.nick ?? 'Avversario';

  if (!view) return null;

  const iWon = view.winner === view.you;

  // Suona una volta sola all'arrivo sulla schermata
  const soundedRef = useRef(false);
  useEffect(() => {
    if (soundedRef.current) return;
    soundedRef.current = true;
    setTimeout(() => iWon ? sfx.win() : sfx.lose(), 300);
  }, []);
  const myScore = view.scores[view.you];
  const oppScore = view.scores[view.you === 'host' ? 'guest' : 'host'];
  const modeLabel = view.mode === 'fast' ? 'Veloce' : view.mode === '1005' ? 'Punti 1005' : 'Punti 2005';

  async function rematch() {
    if (!view) return;
    try {
      const { room } = await api.createRoom(view.mode);
      store.setRoom(room);
      const token = getToken()!;
      wsClient.connect(token, {
        onState: (v) => store.setGameView(v),
        onRoom: (r) => store.setRoom(r),
        onError: (e) => store.showToast(e),
        onAbandoned: () => store.notifyOpponentLeft(),
      });
      wsClient.subscribe(room.id);
      store.setScreen('waiting');
    } catch (e) {
      store.showToast(e instanceof Error ? e.message : 'Errore');
    }
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

        <div style={{ width: '100%', maxWidth: 320, display: 'flex', gap: 10, marginTop: 26 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { store.setRoom(null); store.setScreen('home'); }}>
            Home
          </button>
          <button className="btn btn-gold" style={{ flex: 1.4 }} onClick={rematch}>
            Rivincita
          </button>
        </div>
      </div>
    </div>
  );
}
