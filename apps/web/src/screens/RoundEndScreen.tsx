import React from 'react';
import type { PlayerRoundBreakdown } from '@burraco/shared';
import { gameClient } from '../lib/gameClient.js';
import { useStore } from '../lib/store.js';
import { Avatar, Icon } from '../components/Icon.js';

function ScoreLine({ label, value, sub, strong, neg }: { label: string; value: number; sub?: string; strong?: boolean; neg?: boolean; }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0' }}>
      <span style={{ flex: 1, fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 500, color: strong ? 'var(--ink)' : 'var(--ink-mut)' }}>
        {label}{sub && <span style={{ fontSize: 11, color: 'var(--ink-dim)', marginLeft: 6 }}>{sub}</span>}
      </span>
      <span className="tnum" style={{ fontSize: strong ? 16 : 14, fontWeight: 800, fontFamily: 'var(--font-disp)', color: neg ? 'var(--danger)' : value > 0 ? 'var(--clean)' : 'var(--ink-mut)' }}>
        {neg ? '−' : value > 0 ? '+' : ''}{Math.abs(value)}
      </span>
    </div>
  );
}

function PlayerCard({ nick, you, won, b }: { nick: string; you: boolean; won: boolean; b: PlayerRoundBreakdown; }) {
  return (
    <div style={{ background: won ? 'linear-gradient(160deg, rgba(26, 55, 44, 0.9), rgba(16, 36, 28, 0.9))' : 'rgba(20, 35, 29, 0.8)',
      border: '1px solid ' + (won ? 'rgba(229, 187, 89, 0.55)' : 'var(--line)'), borderRadius: 20, padding: 16, boxShadow: 'var(--sh-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
        <Avatar name={nick} you={you} size={42} ring={won} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'uppercase' }}>{nick}{you && ' (tu)'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--gold-2)', fontWeight: 600 }}>{won ? 'Ha chiuso la manche' : 'Mano residua'}</div>
        </div>
        {b.closeBonus > 0 && <span className="chip" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>+100 chiusura</span>}
      </div>
      <div className="divider" style={{ margin: '2px 0 6px' }} />
      <ScoreLine label="Punti scale" value={b.meldPoints} sub={`${b.meldCount} scale`} />
      {b.burracoBonus > 0 && (
        <ScoreLine label="Bonus burraco" value={b.burracoBonus}
          sub={[b.burracos.clean > 0 && `pulito×${b.burracos.clean}`, b.burracos.semi > 0 && `semi×${b.burracos.semi}`, b.burracos.dirty > 0 && `sporco×${b.burracos.dirty}`].filter(Boolean).join(' ')} />
      )}
      {b.closeBonus > 0 && <ScoreLine label="Bonus chiusura" value={b.closeBonus} />}
      {b.handPenalty > 0 && <ScoreLine label="Penalità mano" value={b.handPenalty} neg />}
      {b.pozzoPenalty > 0 && <ScoreLine label="Penalità pozzetto" value={b.pozzoPenalty} neg />}
      <div className="divider" style={{ margin: '6px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-mut)', fontWeight: 600 }}>Totale manche</span>
        <span className="tnum" style={{ fontFamily: 'var(--font-disp)', fontWeight: 800, fontSize: 22, color: 'var(--gold)' }}>
          {b.roundTotal >= 0 ? '+' : ''}{b.roundTotal}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 700 }}>Cumulativo</span>
        <span className="tnum" style={{ fontWeight: 800, fontSize: 18 }}>{b.cumulative}</span>
      </div>
    </div>
  );
}

export function RoundEndScreen() {
  const store = useStore();
  const view = store.gameView;
  const user = store.user;
  const oppUser = store.room ? (store.room.host?.id === user?.id ? store.room.guest : store.room.host) : null;
  const oppName = gameClient.isLocal ? 'Computer' : (oppUser?.nick ?? 'Avversario');

  if (!view?.lastRound) return null;

  const { breakdown, closer } = view.lastRound;
  const myBreakdown = breakdown[view.you];
  const oppSeat = view.you === 'host' ? 'guest' : 'host';
  const oppBreakdown = breakdown[oppSeat];
  const won = closer === view.you;

  const target = view.mode === '1005' ? 1005 : view.mode === '2005' ? 2005 : 0;
  const myCum = myBreakdown?.cumulative ?? 0;

  return (
    <div className="b-screen dark-bg">
      <div style={{ flex: 1, overflowY: 'auto', padding: '60px 18px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="t-label">
            {view.mode === 'fast' ? 'Veloce' : `Punti ${target}`} · Manche {view.round}
          </div>
          <h1 className="t-h1" style={{ fontSize: 28, marginTop: 6 }}>Fine manche</h1>
        </div>

        {/* barra progresso */}
        {target > 0 && (
          <div style={{ background: 'rgba(20, 35, 29, 0.7)', border: '1px solid var(--line)', borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-mut)', marginBottom: 8, fontWeight: 600 }}>
              <span>Obiettivo {target}</span>
              <span className="tnum">manca {Math.max(0, target - myCum)} punti</span>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: '#24312c', overflow: 'hidden', position: 'relative', marginBottom: 6 }}>
              <div style={{ position: 'absolute', inset: 0, width: Math.min(100, (myCum / target) * 100) + '%', background: 'linear-gradient(90deg, var(--gold-2), var(--gold))', borderRadius: 99 }} />
            </div>
            <div style={{ height: 8, borderRadius: 99, background: '#24312c', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: Math.min(100, ((oppBreakdown?.cumulative ?? 0) / target) * 100) + '%', background: '#447c7f', borderRadius: 99 }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myBreakdown && <PlayerCard nick={user?.nick ?? 'Tu'} you won={won} b={myBreakdown} />}
          {oppBreakdown && <PlayerCard nick={oppName} you={false} won={!won && !!closer} b={oppBreakdown} />}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { store.setRoom(null); store.setVsComputer(false); store.setScreen('home'); }}>Esci</button>
          <button className="btn btn-gold" style={{ flex: 2 }} onClick={() => gameClient.nextRound()}>
            <Icon name="cards" size={18} /> Manche successiva
          </button>
        </div>
      </div>
    </div>
  );
}
