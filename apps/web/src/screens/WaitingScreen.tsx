import React, { useEffect, useRef, useState } from 'react';
import { api, type OnlineUser } from '../lib/api.js';
import { useStore } from '../lib/store.js';
import { Avatar, Icon, IconBtn, Toast } from '../components/Icon.js';
import { enablePush, pushSupported } from '../lib/push.js';
import { sfx } from '../lib/sound.js';

const MODE_LABEL: Record<string, string> = { fast: 'Veloce', '1005': 'Punti 1005', '2005': 'Punti 2005' };

function ShareBtn({ icon, label, tint, onClick }: { icon: Parameters<typeof Icon>[0]['name']; label: string; tint?: string; onClick?: () => void; }) {
  return (
    <button onClick={onClick} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', minHeight: 44 }}>
      <div style={{ width: 50, height: 50, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: tint || 'oklch(0.40 0.02 168 / 0.5)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
        <Icon name={icon} size={22} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--ink-mut)', fontWeight: 600 }}>{label}</span>
    </button>
  );
}

export function WaitingScreen() {
  const store = useStore();
  const room = store.room;
  const user = store.user;
  const isHost = room?.host?.id === user?.id;
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const guestHere = !!room?.guest;
  const code = room?.code ?? '----';

  // Suona quando l'avversario entra nella stanza (solo per l'host)
  const prevGuestRef = useRef(guestHere);
  useEffect(() => {
    if (isHost && guestHere && !prevGuestRef.current) sfx.guestJoined();
    prevGuestRef.current = guestHere;
  }, [guestHere, isHost]);
  const mode = room?.gameMode ?? '1005';
  const origin = window.location.origin;
  const deepLink = `${origin}/?join=${code}`;

  function copyCode() {
    void navigator.clipboard.writeText(code).then(() => store.showToast(`Codice ${code} copiato`));
  }
  function copyLink() {
    void navigator.clipboard.writeText(deepLink).then(() => store.showToast('Link copiato'));
  }
  function whatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Ti sfido a Burraco! Entra qui: ${deepLink}`)}`);
  }

  async function startGame() {
    if (!room || !isHost) return;
    setStarting(true);
    try {
      await api.startGame(room.id);
    } catch (e) {
      store.showToast(e instanceof Error ? e.message : 'Errore');
    } finally {
      setStarting(false);
    }
  }

  function cancel() {
    setCancelling(true);
    store.setRoom(null);
    store.setScreen('home');
  }

  return (
    <div className="b-screen dark-bg">
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '58px 18px 6px' }}>
        <IconBtn name="back" onClick={cancel} />
        <span className="chip" style={{ background: 'var(--gold-soft)', color: 'var(--gold)', border: '1px solid oklch(0.81 0.125 86 / 0.4)' }}>
          <Icon name={mode === 'fast' ? 'bolt' : 'trophy'} size={13} /> {MODE_LABEL[mode]}
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px', display: 'flex', flexDirection: 'column' }}>
        {/* codice */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <div className="t-label">Codice partita</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 9, marginTop: 12 }}>
            {code.split('').map((c, i) => (
              <div key={i} style={{ width: 56, height: 70, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(160deg, var(--surface-2), var(--surface))', border: '1.5px solid oklch(0.81 0.125 86 / 0.45)',
                fontFamily: 'var(--font-disp)', fontWeight: 800, fontSize: 38, color: 'var(--gold)', boxShadow: 'var(--sh-1)' }}>{c}</div>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-mut)', marginTop: 12 }}>Valido 30 minuti · condividilo con chi vuoi sfidare</div>
        </div>

        {/* condivisione */}
        <div style={{ display: 'flex', gap: 6, marginTop: 22 }}>
          <ShareBtn icon="chat" label="WhatsApp" tint="oklch(0.55 0.13 150 / 0.35)" onClick={whatsApp} />
          <ShareBtn icon="link" label="Copia link" onClick={copyLink} />
          <ShareBtn icon="copy" label="Copia codice" onClick={copyCode} />
          <ShareBtn icon="users" label="Invita amici" tint="var(--gold-soft)" onClick={() => setShowInvite(true)} />
        </div>

        {/* giocatori */}
        <div style={{ marginTop: 26, background: 'oklch(0.255 0.026 168 / 0.7)', border: '1px solid var(--line)', borderRadius: 20, padding: 18 }}>
          <div className="t-label" style={{ marginBottom: 14 }}>Giocatori</div>
          {/* host */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Avatar name={room?.host?.nick ?? '?'} you={isHost} size={46} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{room?.host?.nick ?? '?'}</div>
              <div style={{ fontSize: 12, color: 'var(--gold-2)', fontWeight: 600 }}>Host · pronto</div>
            </div>
            <Icon name="check" size={20} color="var(--clean)" />
          </div>
          <div className="divider" style={{ margin: '4px 0 14px' }} />
          {/* guest */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {guestHere
              ? <Avatar name={room?.guest?.nick ?? '?'} size={46} ring />
              : <div style={{ width: 46, height: 46, borderRadius: '50%', border: '2px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div className="b-spin" style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid var(--line)', borderTopColor: 'var(--gold)' }} />
                </div>}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: guestHere ? 'var(--ink)' : 'var(--ink-dim)' }}>
                {guestHere ? room!.guest!.nick : 'In attesa dell\'avversario…'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-mut)' }}>{guestHere ? 'Entrato · pronto' : 'Sta arrivando'}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {isHost && guestHere
          ? <button className="btn btn-gold" style={{ width: '100%', marginTop: 22, opacity: starting ? 0.7 : 1 }} onClick={startGame} disabled={starting}>
              <Icon name="cards" size={20} /> Inizia partita
            </button>
          : <button className="btn btn-ghost" style={{ width: '100%', marginTop: 22, opacity: cancelling ? 0.7 : 1 }} onClick={cancel}>
              {isHost ? 'Annulla' : 'Esci dalla stanza'}
            </button>}

        {!isHost && !guestHere && (
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-dim)', marginTop: 8 }}>
            In attesa che l'host avvii la partita…
          </div>
        )}
      </div>

      {showInvite && room && (
        <InviteSheet
          roomCode={room.code}
          myId={user?.id ?? ''}
          onClose={() => setShowInvite(false)}
          onInvited={(nick) => store.showToast(`Invito inviato a ${nick}`)}
        />
      )}
      <Toast text={store.toast} />
    </div>
  );
}

/* ── InviteSheet ──────────────────────────────────────────── */
interface InviteSheetProps {
  roomCode: string;
  myId: string;
  onClose: () => void;
  onInvited: (nick: string) => void;
}

function InviteSheet({ roomCode, myId, onClose, onInvited }: InviteSheetProps) {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [pushEnabled, setPushEnabled] = useState(Notification.permission === 'granted');

  useEffect(() => {
    api.getOnlineUsers(myId).then(({ items }) => setUsers(items)).catch(() => {});
  }, [myId]);

  async function handleEnablePush() {
    const ok = await enablePush();
    setPushEnabled(ok);
    if (!ok) alert('Abilita le notifiche nelle impostazioni del browser per ricevere inviti.');
  }

  async function invite(u: OnlineUser) {
    if (sent[u.id]) return;
    setSent((s) => ({ ...s, [u.id]: true }));
    try {
      await api.sendPushInvite(u.id, roomCode);
      onInvited(u.nick);
    } catch {
      setSent((s) => ({ ...s, [u.id]: false }));
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 40,
      background: 'oklch(0.1 0.02 168 / 0.55)', backdropFilter: 'blur(3px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTop: '1px solid var(--line)',
        padding: '14px 18px 30px', maxHeight: '78%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 38, height: 4, borderRadius: 99, background: 'var(--line)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div className="t-h2">Invita amici</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-mut)', marginTop: 2 }}>
              {pushSupported() && !pushEnabled
                ? 'Abilita notifiche per inviare inviti'
                : 'Online con notifiche attive'}
            </div>
          </div>
          <IconBtn name="close" onClick={onClose} />
        </div>

        {pushSupported() && !pushEnabled && (
          <button className="btn btn-gold" style={{ width: '100%', marginBottom: 12, padding: '10px 16px', fontSize: 14 }} onClick={handleEnablePush}>
            <Icon name="bell" size={18} /> Abilita notifiche
          </button>
        )}

        <div style={{ overflowY: 'auto', marginTop: 4 }}>
          {users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-dim)', fontSize: 13 }}>
              Nessun amico disponibile al momento
            </div>
          )}
          {users.map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px',
              borderBottom: i < users.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
              <div style={{ position: 'relative' }}>
                <Avatar name={u.nick} size={44} />
                <span style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12,
                  borderRadius: '50%', background: 'var(--clean)', border: '2px solid var(--surface)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{u.nick}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mut)' }}>Disponibile</div>
              </div>
              <button className="btn btn-gold"
                style={{ padding: '9px 16px', fontSize: 13.5, opacity: sent[u.id] ? 0.7 : 1 }}
                onClick={() => void invite(u)} disabled={!!sent[u.id]}>
                {sent[u.id] ? <><Icon name="check" size={15} /> Invitato</> : 'Invita'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
