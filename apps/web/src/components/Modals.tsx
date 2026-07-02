/* ============================================================
   Modali stile-sito: impostazioni in partita + popup abbandono
   ============================================================ */
import React, { useEffect, useRef, useState } from 'react';
import { soundEnabled, setSoundEnabled, vibrationEnabled, setVibrationEnabled } from '../lib/sound.js';
import { enablePush, pushSupported } from '../lib/push.js';
import { api, type AuthResp } from '../lib/api.js';
import { Avatar } from './Icon.js';

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 24,
  background: 'rgba(1, 8, 5, 0.72)', backdropFilter: 'blur(4px)',
};
const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 340, background: 'rgba(15, 30, 24, 0.98)',
  border: '1px solid var(--line)', borderRadius: 22, padding: 22,
  boxShadow: 'var(--sh-2)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
  background: 'rgba(36, 49, 44, 0.6)', border: '1.5px solid var(--line)',
  color: 'var(--ink)', fontFamily: 'var(--font-ui)', fontSize: 15, outline: 'none',
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 48, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
      background: on ? 'linear-gradient(168deg, var(--gold), var(--gold-2))' : 'rgba(46, 59, 54, 0.8)',
      position: 'relative', transition: 'background .15s',
    }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: '50%',
        background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }} />
    </button>
  );
}

function Row({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 2px' }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

export function SettingsSheet({ onClose, onAbandon, onLeave }: { onClose: () => void; onAbandon: () => void; onLeave?: () => void }) {
  const [snd, setSnd] = useState(soundEnabled());
  const [vib, setVib] = useState(vibrationEnabled());
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 className="t-h1" style={{ fontSize: 22 }}>Impostazioni</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-mut)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <Row label="Suoni" on={snd} onChange={(v) => { setSnd(v); setSoundEnabled(v); }} />
        <div style={{ height: 1, background: 'var(--line-soft)' }} />
        <Row label="Vibrazione" on={vib} onChange={(v) => { setVib(v); setVibrationEnabled(v); }} />

        <div style={{ height: 1, background: 'var(--line-soft)', margin: '6px 0 16px' }} />

        {onLeave && !confirming && (
          <>
            <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 6 }} onClick={onLeave}>
              Sospendi e torna alla Home
            </button>
            <p className="t-mut" style={{ fontSize: 12, textAlign: 'center', margin: '0 0 14px' }}>
              La partita resta salvata: la ritrovi in “Le mie partite”.
            </p>
          </>
        )}

        {!confirming ? (
          <button className="btn" style={{ width: '100%', background: 'rgba(88, 27, 26, 0.5)', border: '1px solid rgba(206, 81, 77, 0.5)', color: '#ffb4ad' }}
            onClick={() => setConfirming(true)}>
            Abbandona partita
          </button>
        ) : (
          <div>
            <p className="t-mut" style={{ fontSize: 13.5, textAlign: 'center', marginBottom: 12 }}>
              Sei sicuro? L'avversario vincerà la partita.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirming(false)}>Annulla</button>
              <button className="btn" style={{ flex: 1, background: '#ba2b2e', color: '#fff', border: 'none' }} onClick={onAbandon}>
                Abbandona
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfilePopup({ nick, username, isGuest, onLogout, onConverted, onClose }: {
  nick: string; username: string | null; isGuest: boolean;
  onLogout: () => void; onConverted?: (r: AuthResp) => void; onClose: () => void;
}) {
  const supported = pushSupported();
  const [perm, setPerm] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  );
  const [busy, setBusy] = useState(false);
  const [snd, setSnd] = useState(soundEnabled());
  const [vib, setVib] = useState(vibrationEnabled());

  // conversione ospite → account registrato (mantiene id e partite)
  const [showConvert, setShowConvert] = useState(false);
  const [cUser, setCUser] = useState('');
  const [cPass, setCPass] = useState('');
  const [cConfirm, setCConfirm] = useState('');
  const [cErr, setCErr] = useState('');
  const [cBusy, setCBusy] = useState(false);

  async function convert() {
    setCErr('');
    if (cPass !== cConfirm) { setCErr('Le password non coincidono'); return; }
    setCBusy(true);
    try {
      const r = await api.convertGuest({ username: cUser, password: cPass });
      onConverted?.(r);
    } catch (e) {
      setCErr(e instanceof Error ? e.message : 'Errore');
    } finally {
      setCBusy(false);
    }
  }

  async function activate() {
    setBusy(true);
    await enablePush();
    setPerm(Notification.permission);
    setBusy(false);
  }

  const notifLabel = !supported ? 'Non supportate'
    : perm === 'granted' ? 'Attive'
    : perm === 'denied' ? 'Bloccate'
    : 'Non attive';
  const notifColor = perm === 'granted' ? 'var(--clean, #43a047)' : 'var(--ink-mut)';

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="t-h1" style={{ fontSize: 22 }}>Profilo</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-mut)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Avatar name={nick} size={52} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)', textTransform: 'uppercase' }}>{nick}</div>
            {isGuest && <div style={{ fontSize: 12.5, color: 'var(--gold-2)', fontWeight: 600 }}>Ospite</div>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 2px' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Notifiche</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: notifColor }}>{notifLabel}</span>
            {supported && perm === 'default' && (
              <button className="btn" style={{ padding: '6px 12px', fontSize: 12.5, background: 'var(--gold-soft)', color: 'var(--gold)', border: '1px solid rgba(229, 187, 89, 0.4)' }}
                onClick={activate} disabled={busy}>
                {busy ? '…' : 'Attiva'}
              </button>
            )}
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--line-soft)' }} />
        <Row label="Suoni" on={snd} onChange={(v) => { setSnd(v); setSoundEnabled(v); }} />
        <div style={{ height: 1, background: 'var(--line-soft)' }} />
        <Row label="Vibrazione" on={vib} onChange={(v) => { setVib(v); setVibrationEnabled(v); }} />

        {isGuest && (
          <>
            <div style={{ height: 1, background: 'var(--line-soft)', margin: '8px 0 14px' }} />
            {!showConvert ? (
              <>
                <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => setShowConvert(true)}>
                  Crea un account
                </button>
                <div style={{ fontSize: 12, color: 'var(--ink-dim)', textAlign: 'center', margin: '8px 2px 0', lineHeight: 1.4 }}>
                  Da ospite le partite si perdono se cambi dispositivo o cancelli i dati. Crea un account per conservarle.
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-mut)', marginBottom: 10, lineHeight: 1.4 }}>
                  Scegli nome utente e password: <b style={{ color: 'var(--ink)' }}>mantieni tutte le tue partite</b> e potrai accedere anche da altri dispositivi.
                </div>
                <input placeholder="Nome utente" value={cUser} onChange={(e) => setCUser(e.target.value)}
                  autoCapitalize="none" autoCorrect="off" spellCheck={false} style={inputStyle} />
                <input type="password" placeholder="Password (min. 6)" value={cPass} onChange={(e) => setCPass(e.target.value)}
                  style={{ ...inputStyle, marginTop: 8 }} />
                <input type="password" placeholder="Conferma password" value={cConfirm} onChange={(e) => setCConfirm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void convert(); }} style={{ ...inputStyle, marginTop: 8 }} />
                {cErr && <div style={{ color: '#ff9189', fontSize: 12.5, marginTop: 8 }}>{cErr}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowConvert(false); setCErr(''); }}>Annulla</button>
                  <button className="btn btn-gold" style={{ flex: 1.4, opacity: cBusy ? 0.7 : 1 }} onClick={() => void convert()} disabled={cBusy}>
                    {cBusy ? '…' : 'Crea account'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ height: 1, background: 'var(--line-soft)', margin: '8px 0 16px' }} />

        <button className="btn" style={{ width: '100%', background: 'rgba(88, 27, 26, 0.5)', border: '1px solid rgba(206, 81, 77, 0.5)', color: '#ffb4ad' }}
          onClick={onLogout}>
          Esci
        </button>
      </div>
    </div>
  );
}

export function AbandonedPopup({ onClose }: { onClose: () => void }) {
  // dopo 2 secondi torna automaticamente alla home (una sola volta)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const id = setTimeout(() => closeRef.current(), 2000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🏳️</div>
          <h2 className="t-h1" style={{ fontSize: 22, marginBottom: 8 }}>Avversario uscito</h2>
          <p className="t-mut" style={{ fontSize: 14, marginBottom: 20 }}>
            Il tuo avversario ha abbandonato la partita. Hai vinto!
          </p>
          <button className="btn btn-gold" style={{ width: '100%' }} onClick={onClose}>
            Torna alla home
          </button>
        </div>
      </div>
    </div>
  );
}
