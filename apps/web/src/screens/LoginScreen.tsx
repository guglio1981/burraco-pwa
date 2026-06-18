import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { setToken } from '../lib/session.js';
import { useStore } from '../lib/store.js';
import { Toast } from '../components/Icon.js';
import { enablePush, pushSupported } from '../lib/push.js';

function BrandLogo() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
      <div style={{ width: 84, height: 84, borderRadius: 24, position: 'relative',
        background: 'linear-gradient(155deg, var(--felt-1), var(--felt-deep))',
        border: '2px solid rgba(229, 187, 89, 0.55)', boxShadow: 'var(--sh-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-disp)', fontWeight: 800, fontSize: 50, color: 'var(--gold)' }}>B</span>
        <span style={{ position: 'absolute', top: 11, right: 14, fontSize: 16, color: 'var(--suit-red)' }}>♥</span>
        <span style={{ position: 'absolute', bottom: 11, left: 14, fontSize: 16, color: 'var(--ink)' }}>♠</span>
      </div>
    </div>
  );
}

function Field({ label, placeholder, type = 'text', value, onChange }: {
  label: string; placeholder: string; type?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span className="t-label" style={{ display: 'block', marginBottom: 7, paddingLeft: 2 }}>{label}</span>
      <input type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '14px 15px', borderRadius: 13,
          background: 'rgba(36, 49, 44, 0.6)', border: '1.5px solid var(--line)',
          color: 'var(--ink)', fontFamily: 'var(--font-ui)', fontSize: 15.5, outline: 'none' }} />
    </label>
  );
}

export function LoginScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const store = useStore();

  const reg = tab === 'register';

  async function submit() {
    setErr(''); setLoading(true);
    try {
      let r;
      if (reg) {
        if (pass !== confirm) { setErr('Le password non coincidono'); return; }
        r = await api.register({ username, password: pass });
      } else {
        r = await api.login({ username, password: pass });
      }
      setToken(r.token);
      store.setUser(r.user);
      store.setScreen('home');
      if (pushSupported() && Notification.permission === 'default') {
        setTimeout(() => enablePush(), 800);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    setErr('');
    if (!username.trim()) { setErr('Scrivi il nome utente, poi tocca “Password dimenticata?”'); return; }
    setLoading(true);
    try {
      const { password } = await api.forgotPassword(username.trim());
      store.showToast(`La tua password è: ${password}`, 9000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }

  async function guestLogin() {
    setLoading(true);
    try {
      const r = await api.guest(username || undefined);
      setToken(r.token);
      store.setUser(r.user);
      store.setScreen('home');
      if (pushSupported() && Notification.permission === 'default') {
        setTimeout(() => enablePush(), 800);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="b-screen dark-bg">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '52px 26px 36px', overflowY: 'auto' }}>
        <BrandLogo />
        <h1 className="t-h1" style={{ textAlign: 'center', fontSize: 32, marginBottom: 6 }}>
          {reg ? 'Crea il tuo account' : 'Bentornato al Burraco'}
        </h1>
        <p className="t-mut" style={{ textAlign: 'center', fontSize: 14, marginBottom: 22, maxWidth: 290, marginInline: 'auto' }}>
          {reg ? 'Scegli nome utente e password e gioca con i tuoi amici.' : 'Accedi con nome utente e password.'}
        </p>

        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 13, background: 'rgba(36, 49, 44, 0.5)', border: '1px solid var(--line)', marginBottom: 18 }}>
          {(['login', 'register'] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '10px 0', borderRadius: 9, cursor: 'pointer', border: 'none', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 14,
              background: tab === k ? 'linear-gradient(168deg, var(--gold), var(--gold-2))' : 'transparent',
              color: tab === k ? '#291d07' : 'var(--ink-mut)', transition: 'all .15s' }}>
              {k === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nome utente" placeholder="Es. marco_r" value={username} onChange={setUsername} />
          <Field label="Password" placeholder={reg ? 'Almeno 6 caratteri' : '••••••'} type="password" value={pass} onChange={setPass} />
          {reg && <Field label="Conferma password" placeholder="Ripeti la password" type="password" value={confirm} onChange={setConfirm} />}

          {!reg && (
            <div style={{ textAlign: 'right', marginTop: -4 }}>
              <button onClick={forgotPassword} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--gold-2)', fontWeight: 600, cursor: 'pointer', fontSize: 12.5, padding: 0 }}>
                Password dimenticata?
              </button>
            </div>
          )}

          {err && <div style={{ fontSize: 13, color: 'var(--danger)', textAlign: 'center', padding: '4px 0' }}>{err}</div>}

          <button className="btn btn-gold" style={{ width: '100%', marginTop: 4, opacity: loading ? 0.7 : 1 }} onClick={submit} disabled={loading}>
            {loading ? '…' : reg ? 'Crea account' : 'Accedi'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-dim)', fontWeight: 600 }}>oppure</span>
            <span style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
          </div>

          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={guestLogin} disabled={loading}>
            Continua come ospite
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--ink-dim)' }}>
          {reg
            ? <span>Hai già un account? <button onClick={() => setTab('login')} style={{ background: 'none', border: 'none', color: 'var(--gold-2)', fontWeight: 700, cursor: 'pointer', fontSize: 12, padding: 0 }}>Accedi</button></span>
            : <span>Nuovo qui? <button onClick={() => setTab('register')} style={{ background: 'none', border: 'none', color: 'var(--gold-2)', fontWeight: 700, cursor: 'pointer', fontSize: 12, padding: 0 }}>Registrati</button></span>}
        </div>
      </div>
      <Toast text={store.toast} />
    </div>
  );
}
