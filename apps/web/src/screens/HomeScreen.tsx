import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { wsClient } from '../lib/ws.js';
import { useStore } from '../lib/store.js';
import { getToken, clearToken } from '../lib/session.js';
import { Avatar, Icon, Toast } from '../components/Icon.js';
import { ProfilePopup } from '../components/Modals.js';
import { APP_VERSION } from '../lib/version.js';

const MODE_SHORT: Record<string, string> = { fast: 'Veloce', '1005': '1005', '2005': '2005' };
const MODE_DESC: Record<string, string> = {
  fast: 'Una sola manche · vince chi fa più punti',
  '1005': 'Si gioca a manche fino a 1005 punti',
  '2005': 'Maratona a manche fino a 2005 punti',
};

function ModeSeg({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      {['fast', '1005', '2005'].map((m) => {
        const on = value === m;
        return (
          <button key={m} onClick={() => onChange(m)} style={{ cursor: 'pointer', borderRadius: 13, padding: '12px 6px',
            background: on ? 'var(--gold-soft)' : 'oklch(0.30 0.02 168 / 0.5)',
            border: '1.5px solid ' + (on ? 'oklch(0.81 0.125 86 / 0.7)' : 'var(--line)'),
            color: on ? 'var(--gold)' : 'var(--ink-mut)', fontFamily: 'var(--font-ui)', textAlign: 'center', transition: 'all .15s' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', opacity: .8 }}>
              {m === 'fast' ? 'Rapida' : 'A punti'}
            </div>
            <div style={{ fontFamily: 'var(--font-disp)', fontWeight: 700, fontSize: 19, marginTop: 2 }}>{MODE_SHORT[m]}</div>
          </button>
        );
      })}
    </div>
  );
}

export function HomeScreen() {
  const store = useStore();
  const [mode, setMode] = useState('1005');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const user = store.user;

  async function createRoom() {
    setLoading(true);
    try {
      const { room } = await api.createRoom(mode);
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
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    if (code.length !== 4) return;
    setLoading(true);
    try {
      const { room } = await api.joinRoom(code);
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
      store.showToast(e instanceof Error ? e.message : 'Codice non trovato');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="b-screen felt-bg">
      <div style={{ flex: 1, overflowY: 'auto', padding: '60px 20px 28px' }}>
        {/* top bar — avatar/nome utente in alto a destra, tocca per aprire il profilo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 26 }}>
          <button onClick={() => setShowProfile(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'right' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)', textTransform: 'uppercase' }}>{user?.nick ?? 'Ospite'}</div>
              {user?.isGuest && <div style={{ fontSize: 11.5, color: 'var(--gold-2)', fontWeight: 600 }}>Ospite</div>}
            </div>
            <Avatar name={user?.nick ?? '?'} size={42} />
          </button>
        </div>

        {/* brand */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, position: 'relative',
              background: 'linear-gradient(155deg, var(--felt-1), var(--felt-deep))',
              border: '1.5px solid oklch(0.81 0.125 86 / 0.55)', boxShadow: 'var(--sh-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-disp)', fontWeight: 800, fontSize: 30, color: 'var(--gold)', lineHeight: 1 }}>B</span>
              <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 11, color: 'var(--suit-red)' }}>♥</span>
              <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 11, color: 'var(--ink)' }}>♠</span>
            </div>
            <div>
              <div className="t-brand" style={{ fontSize: 30, color: 'var(--ink)', lineHeight: 0.95 }}>Burraco</div>
              <div style={{ fontSize: 11, letterSpacing: '.22em', color: 'var(--gold-2)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>Testa a testa</div>
            </div>
          </div>
        </div>

        {/* nuova partita */}
        <div style={{ background: 'oklch(0.255 0.026 168 / 0.85)', border: '1px solid var(--line)', borderRadius: 22, padding: 18, boxShadow: 'var(--sh-1)', backdropFilter: 'blur(6px)' }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Nuova partita</div>
          <ModeSeg value={mode} onChange={setMode} />
          <div style={{ fontSize: 12.5, color: 'var(--ink-mut)', margin: '11px 2px 16px', textAlign: 'center' }}>{MODE_DESC[mode]}</div>
          <button className="btn btn-gold" style={{ width: '100%', opacity: loading ? 0.7 : 1 }} onClick={createRoom} disabled={loading}>
            <Icon name="cards" size={20} /> Crea e invita un amico
          </button>
        </div>

        {/* entra con codice */}
        <div style={{ background: 'oklch(0.255 0.026 168 / 0.85)', border: '1px solid var(--line)', borderRadius: 22, padding: 18, marginTop: 14, boxShadow: 'var(--sh-1)' }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Entra con codice</div>
          {/* 4 caselle con input di sistema invisibile sopra (tastiera nativa) */}
          <label style={{ position: 'relative', display: 'block' }}>
            <div style={{ display: 'flex', gap: 7 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ flex: 1, aspectRatio: '1', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'oklch(0.30 0.02 168 / 0.6)', border: '1.5px solid ' + (code[i] ? 'oklch(0.81 0.125 86 / 0.6)' : 'var(--line)'),
                  fontFamily: 'var(--font-disp)', fontWeight: 700, fontSize: 24, color: 'var(--gold)' }}>
                  {code[i] ?? ''}
                </div>
              ))}
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              aria-label="Codice partita"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0,
                border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'transparent' }}
            />
          </label>
          <button className={'btn ' + (code.length === 4 ? 'btn-gold' : 'btn-ghost')}
            style={{ width: '100%', marginTop: 12, opacity: code.length === 4 && !loading ? 1 : .5 }}
            onClick={joinRoom} disabled={code.length !== 4 || loading}>
            <Icon name="cards" size={20} /> Entra in partita
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 12, color: 'var(--ink-dim)' }}>
          108 carte · 2 mazzi · 2 giocatori
        </div>
      </div>
      <Toast text={store.toast} />
      {showProfile && (
        <ProfilePopup
          nick={user?.nick ?? 'Ospite'}
          username={user?.username ?? null}
          isGuest={user?.isGuest ?? false}
          onClose={() => setShowProfile(false)}
          onLogout={() => { setShowProfile(false); clearToken(); store.logout(); }}
        />
      )}
      <div style={{ position: 'absolute', right: 10, bottom: 8, fontSize: 11, fontWeight: 700,
        color: 'var(--ink-dim)', letterSpacing: '.04em', opacity: 0.7, pointerEvents: 'none', userSelect: 'none' }}>
        {APP_VERSION}
      </div>
    </div>
  );
}
