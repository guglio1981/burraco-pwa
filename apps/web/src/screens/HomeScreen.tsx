import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { wsClient } from '../lib/ws.js';
import { localGame } from '../lib/localGame.js';
import { loadLocalGame, clearLocalGame, type LocalSave } from '../lib/saveGame.js';
import type { Difficulty } from '../lib/bot.js';
import { useStore } from '../lib/store.js';
import { getToken, clearToken, setActiveRoom } from '../lib/session.js';
import { Avatar, Icon, Toast } from '../components/Icon.js';
import { ProfilePopup } from '../components/Modals.js';
import { APP_VERSION } from '../lib/version.js';

const DIFF_LABEL: Record<Difficulty, string> = { easy: 'Facile', medium: 'Medio', hard: 'Difficile' };
const DIFF_DESC: Record<Difficulty, string> = {
  easy: 'Pesca dal mazzo, cala poco e scarta senza strategia',
  medium: 'Avversario equilibrato (come nel vecchio Burraco)',
  hard: 'Sfrutta gli scarti, punta ai burraco e scarta con prudenza',
};

function DiffSeg({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
        const on = value === d;
        return (
          <button key={d} onClick={() => onChange(d)} style={{ cursor: 'pointer', borderRadius: 13, padding: '11px 6px',
            background: on ? 'var(--gold-soft)' : 'oklch(0.30 0.02 168 / 0.5)',
            border: '1.5px solid ' + (on ? 'oklch(0.81 0.125 86 / 0.7)' : 'var(--line)'),
            color: on ? 'var(--gold)' : 'var(--ink-mut)', fontFamily: 'var(--font-ui)', textAlign: 'center', transition: 'all .15s' }}>
            <div style={{ fontFamily: 'var(--font-disp)', fontWeight: 700, fontSize: 16 }}>{DIFF_LABEL[d]}</div>
          </button>
        );
      })}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      style={{ transition: 'transform .22s ease', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
      <path d="M6 9l6 6 6-6" stroke="var(--ink-mut)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'poco fa';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h fa`;
  return `${Math.floor(h / 24)} g fa`;
}

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
  const [botMode, setBotMode] = useState('1005');
  const [botDiff, setBotDiff] = useState<Difficulty>('medium');
  const [saved, setSaved] = useState<LocalSave | null>(() => loadLocalGame());
  const [open, setOpen] = useState<'new' | 'join' | 'bot' | null>(null);
  const user = store.user;

  function startComputer() {
    store.setRoom(null);
    localGame.start(botMode as 'fast' | '1005' | '2005', botDiff);
  }
  function resumeComputer() {
    const s = loadLocalGame();
    if (!s) { setSaved(null); return; }
    store.setRoom(null);
    localGame.resume(s);
  }
  function deleteSave() {
    clearLocalGame();
    setSaved(null);
  }

  async function createRoom() {
    setLoading(true);
    try {
      const { room } = await api.createRoom(mode);
      store.setRoom(room);
      setActiveRoom(room.id);
      const token = getToken()!;
      wsClient.connect(token, {
        onState: (v) => store.setGameView(v),
        onRoom: (r) => store.setRoom(r),
        onError: (e) => store.showToast(e),
        onAbandoned: () => store.notifyOpponentLeft(),
        onRematchOffer: (m) => store.setRematchIncoming(m),
        onRematchDecline: () => store.setRematchStatus('declined'),
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
      setActiveRoom(room.id);
      const token = getToken()!;
      wsClient.connect(token, {
        onState: (v) => store.setGameView(v),
        onRoom: (r) => store.setRoom(r),
        onError: (e) => store.showToast(e),
        onAbandoned: () => store.notifyOpponentLeft(),
        onRematchOffer: (m) => store.setRematchIncoming(m),
        onRematchDecline: () => store.setRematchStatus('declined'),
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

        {/* tre sezioni ad accordion: si apre una alla volta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {([
            { key: 'new',  icon: 'cards', title: 'Nuova partita',    sub: 'Crea un tavolo e invita un amico' },
            { key: 'join', icon: 'link',  title: 'Entra con codice', sub: 'Hai un codice a 4 lettere?' },
            { key: 'bot',  icon: 'bolt',  title: 'Sfida il computer', sub: 'Gioca offline contro il bot' },
          ] as const).map(({ key, icon, title, sub }) => {
            const isOpen = open === key;
            return (
              <div key={key} style={{ background: 'oklch(0.255 0.026 168 / 0.85)', borderRadius: 22, overflow: 'hidden',
                border: '1.5px solid ' + (isOpen ? 'oklch(0.81 0.125 86 / 0.5)' : 'var(--line)'),
                boxShadow: 'var(--sh-1)', backdropFilter: 'blur(6px)', transition: 'border-color .2s' }}>
                <button onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--gold-soft)', border: '1.5px solid oklch(0.81 0.125 86 / 0.4)', color: 'var(--gold)' }}>
                    <Icon name={icon} size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-disp)', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>{title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-mut)', marginTop: 1 }}>{sub}</div>
                  </div>
                  <Chevron open={isOpen} />
                </button>

                {isOpen && (
                  <div style={{ padding: '0 16px 18px', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                    {key === 'new' && (<>
                      <ModeSeg value={mode} onChange={setMode} />
                      <div style={{ fontSize: 12.5, color: 'var(--ink-mut)', margin: '11px 2px 16px', textAlign: 'center' }}>{MODE_DESC[mode]}</div>
                      <button className="btn btn-gold" style={{ width: '100%', opacity: loading ? 0.7 : 1 }} onClick={createRoom} disabled={loading}>
                        <Icon name="cards" size={20} /> Crea e invita un amico
                      </button>
                    </>)}

                    {key === 'join' && (<>
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
                    </>)}

                    {key === 'bot' && (<>
                      <DiffSeg value={botDiff} onChange={setBotDiff} />
                      <div style={{ fontSize: 12.5, color: 'var(--ink-mut)', margin: '11px 2px 14px', textAlign: 'center' }}>{DIFF_DESC[botDiff]}</div>
                      <ModeSeg value={botMode} onChange={setBotMode} />
                      <button className="btn btn-gold" style={{ width: '100%', marginTop: 16 }} onClick={startComputer}>
                        <Icon name="cards" size={20} /> Gioca col computer
                      </button>
                    </>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* riprendi partita salvata (vs computer) — in fondo */}
        {saved && (
          <div style={{ background: 'linear-gradient(160deg, oklch(0.31 0.04 168 / 0.92), oklch(0.24 0.03 168 / 0.92))',
            border: '1.5px solid oklch(0.81 0.125 86 / 0.5)', borderRadius: 22, padding: 16, marginTop: 18, boxShadow: 'var(--sh-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div className="t-label" style={{ color: 'var(--gold-2)' }}>Riprendi partita</div>
              <button onClick={deleteSave} aria-label="Elimina partita salvata"
                style={{ background: 'oklch(0.52 0.18 25 / 0.18)', border: '1px solid oklch(0.52 0.18 25 / 0.5)', borderRadius: 10, padding: '6px 8px', cursor: 'pointer', color: 'oklch(0.7 0.16 25)' }}>
                <Icon name="trash" size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>vs Computer · {DIFF_LABEL[saved.difficulty]}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mut)', marginTop: 2 }}>
                  {MODE_SHORT[saved.state.mode]} · Manche {saved.state.round} · {timeAgo(saved.savedAt)}
                </div>
              </div>
              <div className="tnum" style={{ fontFamily: 'var(--font-disp)', fontWeight: 800, fontSize: 18, color: 'var(--gold)' }}>
                {saved.state.scores.host} – {saved.state.scores.guest}
              </div>
            </div>
            <button className="btn btn-gold" style={{ width: '100%' }} onClick={resumeComputer}>
              <Icon name="cards" size={20} /> Continua
            </button>
          </div>
        )}

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
