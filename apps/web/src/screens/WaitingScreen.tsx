import React, { useEffect, useRef, useState } from 'react';
import { api, type OnlineUser } from '../lib/api.js';
import { useStore } from '../lib/store.js';
import { wsClient } from '../lib/ws.js';
import { Avatar, Icon, IconBtn, Toast } from '../components/Icon.js';
import { enablePush, pushSupported } from '../lib/push.js';
import { clearActiveRoom } from '../lib/session.js';
import { sfx } from '../lib/sound.js';

const MODE_LABEL: Record<string, string> = { fast: 'Veloce', '1005': 'Punti 1005', '2005': 'Punti 2005' };

const WhatsAppIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function ShareBtn({ icon, iconEl, label, onClick }: { icon?: Parameters<typeof Icon>[0]['name']; iconEl?: React.ReactNode; label: string; onClick?: () => void; }) {
  return (
    <button onClick={onClick} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', minHeight: 44 }}>
      <div style={{ width: 50, height: 50, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(62, 75, 70, 0.5)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
        {iconEl ?? (icon ? <Icon name={icon} size={22} /> : null)}
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
    wsClient.leaveToHome(); // esco dalla stanza sul server (niente aggancio residuo)
    clearActiveRoom();
    store.setRoom(null);
    store.setScreen('home');
  }

  return (
    <div className="b-screen dark-bg">
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '58px 18px 6px' }}>
        <IconBtn name="back" onClick={cancel} />
        <span className="chip" style={{ background: 'var(--gold-soft)', color: 'var(--gold)', border: '1px solid rgba(229, 187, 89, 0.4)' }}>
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
                background: 'linear-gradient(160deg, var(--surface-2), var(--surface))', border: '1.5px solid rgba(229, 187, 89, 0.45)',
                fontFamily: 'var(--font-disp)', fontWeight: 800, fontSize: 38, color: 'var(--gold)', boxShadow: 'var(--sh-1)' }}>{c}</div>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-mut)', marginTop: 12 }}>Valido 30 minuti · condividilo con chi vuoi sfidare</div>
        </div>

        {/* condivisione */}
        <div style={{ display: 'flex', gap: 6, marginTop: 22 }}>
          <ShareBtn iconEl={<WhatsAppIcon />} label="WhatsApp" onClick={whatsApp} />
          <ShareBtn icon="link" label="Copia link" onClick={copyLink} />
          <ShareBtn icon="copy" label="Copia codice" onClick={copyCode} />
          <ShareBtn icon="users" label="Invita amici" onClick={() => setShowInvite(true)} />
        </div>

        {/* giocatori */}
        <div style={{ marginTop: 26, background: 'rgba(22, 39, 32, 0.7)', border: '1px solid var(--line)', borderRadius: 20, padding: 18 }}>
          <div className="t-label" style={{ marginBottom: 14 }}>Giocatori</div>
          {/* host */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Avatar name={room?.host?.nick ?? '?'} size={46} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'uppercase' }}>{room?.host?.nick ?? '?'}</div>
              <div style={{ fontSize: 12, color: 'var(--gold-2)', fontWeight: 600 }}>Host · pronto</div>
            </div>
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
              <div style={{ fontWeight: 700, fontSize: 15, color: guestHere ? 'var(--ink)' : 'var(--ink-dim)', textTransform: guestHere ? 'uppercase' : 'none' }}>
                {guestHere ? room!.guest!.nick : 'In attesa dell\'avversario…'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-mut)' }}>{guestHere ? 'Entrato · pronto' : 'Sta arrivando'}</div>
            </div>
          </div>
        </div>

        {!isHost && (
          <div style={{ textAlign: 'center', fontSize: 25, lineHeight: 1.25, color: 'var(--ink-mut)', marginTop: 22, fontWeight: 600 }}>
            In attesa che <span style={{ color: 'var(--gold-2)', fontWeight: 800, textTransform: 'uppercase' }}>{room?.host?.nick ?? 'l\'host'}</span> avvii la partita…
          </div>
        )}

        <div style={{ flex: 1 }} />

        {isHost && guestHere
          ? <button className="btn btn-gold" style={{ width: '100%', marginTop: 22, opacity: starting ? 0.7 : 1 }} onClick={startGame} disabled={starting}>
              <Icon name="cards" size={20} /> Inizia partita
            </button>
          : <button className="btn btn-ghost" style={{ width: '100%', marginTop: 22, opacity: cancelling ? 0.7 : 1 }} onClick={cancel}>
              {isHost ? 'Annulla' : 'Esci dalla stanza'}
            </button>}
      </div>

      {showInvite && room && (
        <InviteSheet
          roomCode={room.code}
          myId={user?.id ?? ''}
          onClose={() => setShowInvite(false)}
          onInvited={(nick) => { store.showToast(`Invito inviato a ${nick}`); setShowInvite(false); }}
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
      background: 'rgba(0, 5, 3, 0.55)', backdropFilter: 'blur(3px)',
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
                <div style={{ fontWeight: 700, fontSize: 14.5, textTransform: 'uppercase' }}>{u.nick}</div>
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
