/* ============================================================
   Modali stile-sito: impostazioni in partita + popup abbandono
   ============================================================ */
import React, { useEffect, useRef, useState } from 'react';
import { soundEnabled, setSoundEnabled, vibrationEnabled, setVibrationEnabled } from '../lib/sound.js';
import { enablePush, pushSupported } from '../lib/push.js';
import { Avatar } from './Icon.js';

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 24,
  background: 'oklch(0.12 0.02 168 / 0.72)', backdropFilter: 'blur(4px)',
};
const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 340, background: 'oklch(0.22 0.024 168 / 0.98)',
  border: '1px solid var(--line)', borderRadius: 22, padding: 22,
  boxShadow: 'var(--sh-2)',
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 48, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
      background: on ? 'linear-gradient(168deg, var(--gold), var(--gold-2))' : 'oklch(0.34 0.02 168 / 0.8)',
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

export function SettingsSheet({ onClose, onAbandon }: { onClose: () => void; onAbandon: () => void }) {
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

        {!confirming ? (
          <button className="btn" style={{ width: '100%', background: 'oklch(0.32 0.09 25 / 0.5)', border: '1px solid oklch(0.6 0.16 25 / 0.5)', color: 'oklch(0.85 0.10 25)' }}
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
              <button className="btn" style={{ flex: 1, background: 'oklch(0.52 0.18 25)', color: '#fff', border: 'none' }} onClick={onAbandon}>
                Abbandona
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfilePopup({ nick, username, isGuest, onLogout, onClose }: {
  nick: string; username: string | null; isGuest: boolean; onLogout: () => void; onClose: () => void;
}) {
  const supported = pushSupported();
  const [perm, setPerm] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  );
  const [busy, setBusy] = useState(false);
  const [snd, setSnd] = useState(soundEnabled());
  const [vib, setVib] = useState(vibrationEnabled());

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
              <button className="btn" style={{ padding: '6px 12px', fontSize: 12.5, background: 'var(--gold-soft)', color: 'var(--gold)', border: '1px solid oklch(0.81 0.125 86 / 0.4)' }}
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

        <div style={{ height: 1, background: 'var(--line-soft)', margin: '8px 0 16px' }} />

        <button className="btn" style={{ width: '100%', background: 'oklch(0.32 0.09 25 / 0.5)', border: '1px solid oklch(0.6 0.16 25 / 0.5)', color: 'oklch(0.85 0.10 25)' }}
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
