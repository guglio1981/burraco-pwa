import React from 'react';

type IconName =
  | 'back' | 'close' | 'chevron' | 'plus' | 'bell' | 'gear' | 'clock'
  | 'copy' | 'link' | 'chat' | 'user' | 'users' | 'trophy' | 'cards'
  | 'bolt' | 'star' | 'check' | 'share' | 'sound' | 'flag' | 'info' | 'deck' | 'eye' | 'trash';

interface Props { name: IconName; size?: number; color?: string; stroke?: number; }

export function Icon({ name, size = 22, color = 'currentColor', stroke = 2 }: Props) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<IconName, React.ReactNode> = {
    back:    <path d="M15 5l-7 7 7 7" {...p} />,
    close:   <path d="M6 6l12 12M18 6L6 18" {...p} />,
    chevron: <path d="M9 5l7 7-7 7" {...p} />,
    plus:    <path d="M12 5v14M5 12h14" {...p} />,
    bell:    <g {...p}><path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 01-3.4 0"/></g>,
    gear:    <g {...p}><path d="M19.4 13a7.8 7.8 0 000-2l2-1.6-2-3.4-2.4 1a7.9 7.9 0 00-1.7-1L14.9 2H9.1l-.4 2.9a7.9 7.9 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.8 7.8 0 000 2l-2 1.6 2 3.4 2.4-1a7.9 7.9 0 001.7 1l.4 2.9h5.8l.4-2.9a7.9 7.9 0 001.7-1l2.4 1 2-3.4-2-1.6z"/><circle cx="12" cy="12" r="3"/></g>,
    clock:   <g {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g>,
    copy:    <g {...p}><rect x="9" y="9" width="11" height="11" rx="2.4"/><path d="M5 15V5a2 2 0 012-2h8"/></g>,
    link:    <g {...p}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7L11 7"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7L13 17"/></g>,
    chat:    <path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z" {...p} />,
    user:    <g {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></g>,
    users:   <g {...p}><circle cx="9" cy="8" r="3.6"/><path d="M2.5 20c0-3.5 3-5.2 6.5-5.2S15.5 16.5 15.5 20"/><path d="M16 5.2a3.6 3.6 0 010 5.6M21.5 20c0-3-2-4.7-4.6-5.1"/></g>,
    trophy:  <g {...p}><path d="M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M9 18h6M10 18l.5-3.5M14 18l-.5-3.5M8 21h8"/></g>,
    cards:   <g {...p}><rect x="3" y="6" width="11" height="14" rx="2"/><path d="M8 6l3-2 7 2.5a2 2 0 011.3 2.5L16 18"/></g>,
    deck:    <g {...p}><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 8h6M9 12h6"/></g>,
    bolt:    <path d="M13 3L5 13h6l-1 8 8-11h-6l1-7z" {...p} />,
    star:    <path d="M12 3l2.6 5.6L20.5 9l-4.5 4 1.3 6.2L12 16.2 6.7 19l1.3-6L3.5 9l5.9-.4L12 3z" {...p} />,
    check:   <path d="M5 12l5 5L20 6" {...p} />,
    share:   <g {...p}><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.4 10.7l7.2-4.2M8.4 13.3l7.2 4.2"/></g>,
    sound:   <g {...p}><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 8a5 5 0 010 8"/></g>,
    flag:    <g {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></g>,
    info:    <g {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></g>,
    eye:     <g {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></g>,
    trash:   <g {...p}><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13M10 11v6M14 11v6"/></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24">{paths[name]}</svg>;
}

interface AvatarProps { name?: string; size?: number; ring?: boolean; you?: boolean; }
export function Avatar({ name = '?', size = 44, ring }: AvatarProps) {
  // una sola lettera iniziale, il più grande possibile, su sfondo gold dell'app
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(150deg, var(--gold), var(--gold-2))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      color: 'oklch(0.24 0.04 80)', fontWeight: 800,
      fontFamily: 'var(--font-disp)', fontSize: size * 0.66, lineHeight: 1,
      boxShadow: 'var(--sh-1)',
      border: ring ? '2.5px solid var(--gold)' : '2px solid oklch(1 0 0 / 0.18)',
      boxSizing: 'border-box',
    }}>
      {initial}
    </div>
  );
}

interface IconBtnProps { name: Parameters<typeof Icon>[0]['name']; onClick?: () => void; size?: number; iconSize?: number; active?: boolean; }
export function IconBtn({ name, onClick, size = 40, iconSize = 21, active }: IconBtnProps) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: 12, cursor: 'pointer',
      background: active ? 'var(--gold-soft)' : 'oklch(0.40 0.02 168 / 0.4)',
      border: '1px solid ' + (active ? 'oklch(0.81 0.125 86 / 0.5)' : 'var(--line)'),
      color: active ? 'var(--gold)' : 'var(--ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)', flexShrink: 0,
    }}>
      <Icon name={name} size={iconSize} />
    </button>
  );
}

interface TimerRingProps { seconds: number; total?: number; size?: number; }
export function TimerRing({ seconds, total = 60, size = 40 }: TimerRingProps) {
  const r = size / 2 - 3, C = 2 * Math.PI * r, frac = Math.max(0, seconds / total);
  const col = seconds <= 10 ? 'var(--danger)' : seconds <= 20 ? 'var(--gold)' : 'var(--clean)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="oklch(1 0 0 / 0.12)" strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="3"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.34, fontWeight: 800, color: col, fontVariantNumeric: 'tabular-nums' }}>{seconds}</span>
    </div>
  );
}

interface ToastProps { text: string; }
export function Toast({ text }: ToastProps) {
  if (!text) return null;
  return (
    <div style={{ position: 'fixed', bottom: 54, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
      background: 'oklch(0.20 0.02 168 / 0.96)', color: 'var(--ink)', padding: '11px 18px', borderRadius: 999,
      border: '1px solid var(--line)', fontSize: 13.5, fontWeight: 600, boxShadow: 'var(--sh-2)',
      whiteSpace: 'nowrap', pointerEvents: 'none' }}>
      {text}
    </div>
  );
}

type BurracoType = 'clean' | 'semi' | 'dirty';
interface BurracoBadgeProps { type: BurracoType; small?: boolean; }
export function BurracoBadge({ type, small }: BurracoBadgeProps) {
  const map: Record<BurracoType, [string, string, string]> = {
    clean: ['PULITO', 'var(--clean)', '◆'],
    semi:  ['SEMI',   'var(--semi)',  '◈'],
    dirty: ['SPORCO', 'var(--dirty)', '◇'],
  };
  const [label, color, ic] = map[type];
  return (
    <span className="chip" style={{
      background: `color-mix(in oklab, ${color} 18%, transparent)`,
      color, border: `1px solid color-mix(in oklab, ${color} 45%, transparent)`,
      fontSize: small ? 9.5 : 11, padding: small ? '3px 7px' : '4px 9px', letterSpacing: '.08em',
    }}>
      <span>{ic}</span>{label}
    </span>
  );
}
