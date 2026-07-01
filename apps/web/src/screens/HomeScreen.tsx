import React, { useState, useEffect } from 'react';
import { api, type MyGame } from '../lib/api.js';
import { wsClient } from '../lib/ws.js';
import { localGame } from '../lib/localGame.js';
import { loadLocalGame, clearLocalGame, type LocalSave } from '../lib/saveGame.js';
import type { Difficulty } from '../lib/bot.js';
import { useStore } from '../lib/store.js';
import { getToken, clearToken, setActiveRoom, clearActiveRoom } from '../lib/session.js';
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
            background: on ? 'var(--gold-soft)' : 'rgba(36, 49, 44, 0.5)',
            border: '1.5px solid ' + (on ? 'rgba(229, 187, 89, 0.7)' : 'var(--line)'),
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
function timeAgoIso(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? timeAgo(t) : '';
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
            background: on ? 'var(--gold-soft)' : 'rgba(36, 49, 44, 0.5)',
            border: '1.5px solid ' + (on ? 'rgba(229, 187, 89, 0.7)' : 'var(--line)'),
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
  const [games, setGames] = useState<MyGame[]>([]);
  const [renaming, setRenaming] = useState<MyGame | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deleting, setDeleting] = useState<MyGame | null>(null);
  const user = store.user;

  // carica le partite online riprendibili (14 giorni)
  useEffect(() => {
    let alive = true;
    api.myGames().then(({ items }) => { if (alive) setGames(items); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // riprende una partita online dall'elenco: sottoscrive la stanza, la navigazione
  // al tavolo avviene tramite gli handler onRoom/onState registrati in App.
  function resumeGame(g: MyGame) {
    store.setVsComputer(false);
    setActiveRoom(g.id);
    wsClient.subscribe(g.id);
    store.setScreen('waiting');
  }
  function openRename(g: MyGame) {
    setRenaming(g);
    setRenameText(g.title ?? '');
  }
  async function saveRename() {
    if (!renaming) return;
    const g = renaming;
    const title = renameText;
    setRenaming(null);
    try {
      await api.renameGame(g.id, title);
      setGames((gs) => gs.map((x) => (x.id === g.id ? { ...x, title: title.trim() || null } : x)));
    } catch (e) {
      store.showToast(e instanceof Error ? e.message : 'Errore');
    }
  }
  async function confirmDelete() {
    if (!deleting) return;
    const g = deleting;
    setDeleting(null);
    try {
      await api.deleteGame(g.id);
      setGames((gs) => gs.filter((x) => x.id !== g.id));
      store.showToast('Partita cancellata');
    } catch (e) {
      store.showToast(e instanceof Error ? e.message : 'Errore');
    }
  }

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
      store.setVsComputer(false); // partita ONLINE: non è vs computer
      setActiveRoom(room.id);
      const token = getToken()!;
      wsClient.connect(token, {
        onState: (v) => store.setGameView(v),
        onRoom: (r) => store.setRoom(r),
        onError: (e) => store.showToast(e),
        onAbandoned: () => store.notifyOpponentLeft(),
        onRematchOffer: (m) => store.setRematchIncoming(m),
        onRematchDecline: () => store.setRematchStatus('declined'),
        onOpponentLeftRoom: () => { store.setRematchIncoming(null); store.setRematchStatus('left'); },
        onPaused: (p) => store.setPaused(p),
        onGameDeleted: () => { clearActiveRoom(); store.setRoom(null); store.setVsComputer(false); store.showToast('Partita cancellata'); store.setScreen('home'); },
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
      store.setVsComputer(false); // partita ONLINE: non è vs computer
      setActiveRoom(room.id);
      const token = getToken()!;
      wsClient.connect(token, {
        onState: (v) => store.setGameView(v),
        onRoom: (r) => store.setRoom(r),
        onError: (e) => store.showToast(e),
        onAbandoned: () => store.notifyOpponentLeft(),
        onRematchOffer: (m) => store.setRematchIncoming(m),
        onRematchDecline: () => store.setRematchStatus('declined'),
        onOpponentLeftRoom: () => { store.setRematchIncoming(null); store.setRematchStatus('left'); },
        onPaused: (p) => store.setPaused(p),
        onGameDeleted: () => { clearActiveRoom(); store.setRoom(null); store.setVsComputer(false); store.showToast('Partita cancellata'); store.setScreen('home'); },
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
              border: '1.5px solid rgba(229, 187, 89, 0.55)', boxShadow: 'var(--sh-1)',
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
              <div key={key} style={{ background: 'rgba(22, 39, 32, 0.85)', borderRadius: 22, overflow: 'hidden',
                border: '1.5px solid ' + (isOpen ? 'rgba(229, 187, 89, 0.5)' : 'var(--line)'),
                boxShadow: 'var(--sh-1)', backdropFilter: 'blur(6px)', transition: 'border-color .2s' }}>
                <button onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--gold-soft)', border: '1.5px solid rgba(229, 187, 89, 0.4)', color: 'var(--gold)' }}>
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
                              background: 'rgba(36, 49, 44, 0.6)', border: '1.5px solid ' + (code[i] ? 'rgba(229, 187, 89, 0.6)' : 'var(--line)'),
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

        {/* Le mie partite online (riprendibili per 14 giorni) */}
        {games.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="t-label" style={{ color: 'var(--gold-2)', margin: '0 4px 10px' }}>Le mie partite</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {games.map((g) => (
                <div key={g.id} style={{ background: 'rgba(22, 39, 32, 0.85)', border: '1.5px solid var(--line)',
                  borderRadius: 18, padding: '13px 14px', boxShadow: 'var(--sh-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <button onClick={() => resumeGame(g)} style={{ flex: 1, minWidth: 0, textAlign: 'left',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-disp)', fontWeight: 700, fontSize: 16, color: 'var(--ink)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.title || `vs ${g.oppNick ?? 'Avversario'}`}
                        </span>
                        {g.yourTurn && (
                          <span className="chip" style={{ flexShrink: 0, background: 'var(--gold-soft)', color: 'var(--gold)',
                            border: '1px solid rgba(229, 187, 89, 0.5)', fontSize: 10, padding: '2px 7px' }}>TOCCA A TE</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-mut)', marginTop: 3 }}>
                        {g.status === 'waiting'
                          ? 'In attesa dell’avversario'
                          : <>{MODE_SHORT[g.mode]} · Manche {g.round} · {g.myScore}–{g.oppScore}{timeAgoIso(g.updatedAt) && ` · ${timeAgoIso(g.updatedAt)}`}</>}
                      </div>
                    </button>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openRename(g)} aria-label="Rinomina partita"
                        style={{ background: 'rgba(36, 49, 44, 0.6)', border: '1px solid var(--line)', borderRadius: 10,
                          padding: '7px 8px', cursor: 'pointer', color: 'var(--ink-mut)' }}>
                        <Icon name="gear" size={15} />
                      </button>
                      <button onClick={() => setDeleting(g)} aria-label="Cancella partita"
                        style={{ background: 'rgba(186, 43, 46, 0.18)', border: '1px solid rgba(186, 43, 46, 0.5)', borderRadius: 10,
                          padding: '7px 8px', cursor: 'pointer', color: '#f2716a' }}>
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* riprendi partita salvata (vs computer) — in fondo */}
        {saved && (
          <div style={{ background: 'linear-gradient(160deg, rgba(26, 55, 44, 0.92), rgba(16, 36, 28, 0.92))',
            border: '1.5px solid rgba(229, 187, 89, 0.5)', borderRadius: 22, padding: 16, marginTop: 18, boxShadow: 'var(--sh-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div className="t-label" style={{ color: 'var(--gold-2)' }}>Riprendi partita</div>
              <button onClick={deleteSave} aria-label="Elimina partita salvata"
                style={{ background: 'rgba(186, 43, 46, 0.18)', border: '1px solid rgba(186, 43, 46, 0.5)', borderRadius: 10, padding: '6px 8px', cursor: 'pointer', color: '#f2716a' }}>
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
      {/* Dialog rinomina partita (stile app) */}
      {renaming && (
        <div onClick={() => setRenaming(null)} style={{ position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(1, 8, 5, 0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 340,
            background: 'linear-gradient(160deg, rgba(26, 55, 44, 0.98), rgba(16, 36, 28, 0.98))',
            border: '1.5px solid rgba(229, 187, 89, 0.5)', borderRadius: 22, padding: 20, boxShadow: 'var(--sh-2)' }}>
            <div className="t-label" style={{ color: 'var(--gold-2)', marginBottom: 10 }}>Titolo della partita</div>
            <input autoFocus value={renameText}
              onChange={(e) => setRenameText(e.target.value.slice(0, 60))}
              onKeyDown={(e) => { if (e.key === 'Enter') void saveRename(); }}
              placeholder={`vs ${renaming.oppNick ?? 'Avversario'}`} maxLength={60}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(36, 49, 44, 0.6)',
                border: '1.5px solid var(--line)', borderRadius: 12, padding: '12px 14px',
                color: 'var(--ink)', fontSize: 16, fontFamily: 'var(--font-ui)', outline: 'none' }} />
            <div style={{ fontSize: 11.5, color: 'var(--ink-dim)', margin: '8px 2px 0' }}>
              Lascia vuoto per usare il nome dell’avversario.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setRenaming(null)}>Annulla</button>
              <button className="btn btn-gold" style={{ flex: 1 }} onClick={() => void saveRename()}>Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog conferma cancellazione (stile app) */}
      {deleting && (
        <div onClick={() => setDeleting(null)} style={{ position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(1, 8, 5, 0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 340,
            background: 'linear-gradient(160deg, rgba(26, 55, 44, 0.98), rgba(16, 36, 28, 0.98))',
            border: '1.5px solid rgba(186, 43, 46, 0.5)', borderRadius: 22, padding: 22, boxShadow: 'var(--sh-2)', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(186, 43, 46, 0.18)', border: '1px solid rgba(186, 43, 46, 0.5)', color: '#f2716a' }}>
              <Icon name="trash" size={24} />
            </div>
            <div style={{ fontFamily: 'var(--font-disp)', fontWeight: 800, fontSize: 19, color: 'var(--ink)', marginBottom: 6 }}>
              Cancellare la partita?
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-mut)', marginBottom: 18, lineHeight: 1.4 }}>
              <b style={{ color: 'var(--ink)' }}>{deleting.title || `vs ${deleting.oppNick ?? 'Avversario'}`}</b> verrà eliminata
              anche per l’altro giocatore. L’azione non è reversibile.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleting(null)}>Annulla</button>
              <button className="btn" style={{ flex: 1, background: 'linear-gradient(168deg, #d24a44, #b02b2e)', color: '#fff' }}
                onClick={() => void confirmDelete()}>Cancella</button>
            </div>
          </div>
        </div>
      )}

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
