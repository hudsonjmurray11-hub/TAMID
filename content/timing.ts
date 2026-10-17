// ─────────────────────────────────────────────────────────────
//  TIMERS — edit freely. All values are milliseconds.
//  Six rounds × (answer + reveal) + lobby + finale ≈ preset length.
//  Lobby and finale are presentation allowances: the host starts the
//  game by hand and the finale stays on screen until restarted.
// ─────────────────────────────────────────────────────────────
import type { TimingPreset } from '../shared/types';

export const TIMING_PRESETS: TimingPreset[] = [
  // 20 + 6 × (18 + 7) + 10 = 180 s
  { id: '3min', label: '3 min sprint', lobbyMs: 20_000, answerMs: 18_000, revealMs: 7_000, finaleMs: 10_000 },
  // 20 + 6 × (25 + 10) + 10 = 240 s  ← default
  { id: '4min', label: '4 min (default)', lobbyMs: 20_000, answerMs: 25_000, revealMs: 10_000, finaleMs: 10_000 },
  // 20 + 6 × (28 + 12) + 10 = 270 s
  { id: '4.5min', label: '4½ min', lobbyMs: 20_000, answerMs: 28_000, revealMs: 12_000, finaleMs: 10_000 },
  // 20 + 6 × (32 + 13) + 10 = 300 s
  { id: '5min', label: '5 min scenic route', lobbyMs: 20_000, answerMs: 32_000, revealMs: 13_000, finaleMs: 10_000 },
];

export const DEFAULT_PRESET_ID = '4min';

/** When every connected player has locked in, close the round after this pause. */
export const ALL_IN_GRACE_MS = 1_500;

/** Network grace for submissions that arrive just after the buzzer. */
export const LATE_GRACE_MS = 300;

/** Solo mode closes the round this long after you lock in. */
export const SOLO_REVEAL_DELAY_MS = 900;

export const MAX_PLAYERS = 60;

export function getPreset(id: string): TimingPreset {
  return TIMING_PRESETS.find((p) => p.id === id) ?? TIMING_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!;
}

export function presetTotalMs(p: TimingPreset, rounds = 6): number {
  return p.lobbyMs + rounds * (p.answerMs + p.revealMs) + p.finaleMs;
}
