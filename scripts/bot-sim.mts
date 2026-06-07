/* Smoke test: simula partite intere bot-vs-bot per i 3 livelli.
   Ogni mossa passa per applyMove (che valida regole + conservazione 108).
   Verifica: nessun errore del motore, le partite TERMINANO. */
import { newGame, startNextRound, applyMove, type GameState, type Seat } from '@burraco/shared';
import {
  botShouldTakeDiscard, findMeldCandidates, findAddCandidates, chooseDiscardId, type Difficulty,
} from '../apps/web/src/lib/bot.ts';

const isActive = (s: GameState) => s.phase === 'draw' || s.phase === 'play';

function botTurn(state: GameState, seat: Seat, diff: Difficulty): GameState {
  // ① pesca
  const take = state.discard.length > 0 && botShouldTakeDiscard(state, seat, diff);
  let r = applyMove(state, seat, take ? { type: 'TAKE_DISCARD' } : { type: 'DRAW_DECK' });
  if (!r.ok || !r.state) throw new Error('PESCA fallita: ' + r.error);
  state = r.state;
  if (!isActive(state)) return state;

  // ② cala / aggiungi
  let progressed = true, melds = 0;
  while (progressed && isActive(state)) {
    progressed = false;
    if (diff === 'easy' && (melds >= 2 || Math.random() < 0.3)) break;
    let did = false;
    for (const ids of findMeldCandidates(state, seat, diff)) {
      const rr = applyMove(state, seat, { type: 'MELD', cardIds: ids });
      if (rr.ok && rr.state) { state = rr.state; melds++; did = true; break; }
    }
    if (did) { progressed = true; continue; }
    if (!(diff === 'easy' && Math.random() < 0.5)) {
      for (const a of findAddCandidates(state, seat, diff)) {
        const rr = applyMove(state, seat, { type: 'ADD_TO_MELD', meldIndex: a.meldIndex, cardIds: a.cardIds });
        if (rr.ok && rr.state) { state = rr.state; did = true; break; }
      }
    }
    if (did) progressed = true;
  }
  if (!isActive(state)) return state;

  // ③ scarta (con rete anti-stallo)
  const id = chooseDiscardId(state, seat, diff);
  let dr = applyMove(state, seat, { type: 'DISCARD', cardId: id });
  if (!dr.ok) {
    for (const c of state.hands[seat]) {
      if (c.id === id) continue;
      dr = applyMove(state, seat, { type: 'DISCARD', cardId: c.id });
      if (dr.ok) break;
    }
  }
  if (!dr.ok) dr = applyMove(state, seat, { type: 'TIMEOUT_AUTO' });
  if (!dr.ok || !dr.state) throw new Error('SCARTO fallito: ' + dr.error);
  return dr.state;
}

function playGame(mode: 'fast' | '1005' | '2005', diff: Difficulty): { rounds: number; moves: number; winner: Seat | null } {
  let state = newGame(mode, { firstTurn: 'host' });
  let moves = 0, rounds = 1;
  const MOVE_CAP = 5000, ROUND_CAP = 40;
  while (state.phase !== 'finished') {
    while (isActive(state)) {
      state = botTurn(state, state.turn, diff);
      if (++moves > MOVE_CAP) throw new Error(`NON TERMINA (mode=${mode} diff=${diff}) dopo ${moves} mosse`);
    }
    if (state.phase === 'inter_round') {
      if (++rounds > ROUND_CAP) throw new Error(`troppe manche (mode=${mode})`);
      state = startNextRound(state);
    } else break;
  }
  return { rounds, moves, winner: state.winner };
}

let total = 0, fail = 0;
const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
const modes: ('fast' | '1005')[] = ['fast', '1005'];
for (const diff of diffs) {
  for (const mode of modes) {
    const N = mode === 'fast' ? 60 : 15;
    let movesSum = 0, roundsSum = 0;
    for (let i = 0; i < N; i++) {
      total++;
      try { const res = playGame(mode, diff); movesSum += res.moves; roundsSum += res.rounds; }
      catch (e) { fail++; console.error(`✗ ${diff}/${mode} #${i}:`, (e as Error).message); }
    }
    console.log(`✓ ${diff.padEnd(6)} ${mode.padEnd(5)} ${N} partite — media ${(movesSum / N).toFixed(0)} mosse, ${(roundsSum / N).toFixed(1)} manche`);
  }
}
console.log(`\n${total - fail}/${total} partite completate senza errori del motore.`);
if (fail > 0) process.exit(1);
