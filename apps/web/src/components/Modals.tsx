/* ============================================================
   Modali stile-sito: impostazioni in partita + popup abbandono
   ============================================================ */
import React, { useState } from 'react';
import { soundEnabled, setSoundEnabled, vibrationEnabled, setVibrationEnabled } from '../lib/sound.js';

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

export function AbandonedPopup({ onClose }: { onClose: () => void }) {
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
