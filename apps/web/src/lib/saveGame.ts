/* ============================================================
   Salvataggio LOCALE della partita contro il computer.
   Lo stato del motore è puro plain-data → serializzabile in
   localStorage. Una sola partita salvata alla volta.
   ============================================================ */
import type { GameState } from '@burraco/shared';
import type { Difficulty } from './bot.js';

const KEY = 'burraco_local_save';

export interface LocalSave {
  v: 1;
  savedAt: number;
  difficulty: Difficulty;
  state: GameState;
}

export function saveLocalGame(state: GameState, difficulty: Difficulty): void {
  try {
    const data: LocalSave = { v: 1, savedAt: Date.now(), difficulty, state };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* quota/serialize: ignora */ }
}

export function loadLocalGame(): LocalSave | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LocalSave;
    if (p && p.v === 1 && p.state) return p;
  } catch { /* corrotto */ }
  return null;
}

export function clearLocalGame(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignora */ }
}

export function hasLocalGame(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}
