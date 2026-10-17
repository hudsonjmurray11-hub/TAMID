// Shared types for live, solo and demo play.

export type Tier = 'common' | 'uncommon' | 'rare' | 'gem';

export const TIER_ORDER: Tier[] = ['gem', 'rare', 'uncommon', 'common'];

export interface AnswerDef {
  /** Display label, e.g. "Beach umbrella". */
  label: string;
  tier: Tier;
  /** Other spellings / synonyms that resolve to this exact answer and award. */
  aliases?: string[];
}

export interface Source {
  label: string;
  url: string;
}

export interface Insight {
  /** One short line shown on the reveal screen. */
  headline: string;
  text: string;
  sources: Source[];
}

export interface RoundDef {
  id: string;
  prompt: string;
  /** Which of the five finale factors this round's roadside fact supports. */
  factorId: string;
  /** Competency the round shows off (see content). */
  competencyId?: string;
  insight: Insight;
  answers: AnswerDef[];
}

export interface QuestionPack {
  id: string;
  name: string;
  blurb: string;
  rounds: RoundDef[];
}

export interface Factor {
  id: string;
  title: string;
  short: string;
  detail: string;
  sources: Source[];
}

export interface Competency {
  id: string;
  title: string;
  definition: string;
  whereInGame: string;
}

export interface TimingPreset {
  id: string;
  label: string;
  lobbyMs: number;
  answerMs: number;
  revealMs: number;
  finaleMs: number;
}

export type Phase = 'lobby' | 'answering' | 'reveal' | 'finale';

export interface Submission {
  answerId: string;
  label: string;
  tier: Tier;
  km: number;
  /** ms from round start to the accepted answer */
  ms: number;
}

export interface PlayerState {
  id: string;
  name: string;
  joinedAt: number;
  connected: boolean;
  isBot: boolean;
  total: number;
  accepted: number;
  responseMs: number;
  /** One slot per round; null = no accepted answer (yet). */
  subs: (Submission | null)[];
  /** Number of unrecognised attempts this round (for gentle feedback). */
  misses: number;
}

export interface GameState {
  phase: Phase;
  roundIndex: number; // -1 in lobby
  totalRounds: number;
  presetId: string;
  packId: string;
  phaseStartedAt: number;
  deadline: number | null;
  paused: boolean;
  remainingAtPause: number | null;
  players: Record<string, PlayerState>;
  order: string[];
  revision: number;
  /** Set when everyone has answered so the round closes a moment later. */
  allInAt: number | null;
}

export type SubmitStatus =
  | 'accepted'
  | 'unknown'
  | 'already'
  | 'closed'
  | 'late'
  | 'stale'
  | 'paused'
  | 'invalid'
  | 'no-player';

export interface SubmitResult {
  status: SubmitStatus;
  label?: string;
  /** For unknown answers: true when it looked like a near miss. */
  message?: string;
}

export interface Standing {
  id: string;
  name: string;
  total: number;
  accepted: number;
  responseMs: number;
  rank: number;
  isBot: boolean;
}

export interface Tally {
  answerId: string;
  label: string;
  tier: Tier;
  km: number;
  count: number;
}

export interface FullAnswer {
  label: string;
  tier: Tier;
  km: number;
}

export interface RevealInfo {
  tallies: Tally[];
  insight: Insight;
  fullList: FullAnswer[];
  /** Best tier anybody found this round (drives celebrations). */
  bestTier: Tier | null;
  missed: number;
}

export interface HostView {
  kind: 'host';
  code: string;
  roomName: string;
  demo: boolean;
  phase: Phase;
  roundIndex: number;
  totalRounds: number;
  prompt: string | null;
  remainingMs: number | null;
  phaseMs: number | null;
  paused: boolean;
  presetId: string;
  packId: string;
  players: { id: string; name: string; connected: boolean; answered: boolean; total: number; isBot: boolean }[];
  playerCount: number;
  answeredCount: number;
  maxPlayers: number;
  standings: Standing[];
  leaderKm: number;
  leaderLastAward: { tier: Tier; km: number } | null;
  reveal: RevealInfo | null;
  revision: number;
}

export interface PlayerView {
  kind: 'player';
  code: string;
  roomName: string;
  packId: string;
  phase: Phase;
  roundIndex: number;
  totalRounds: number;
  prompt: string | null;
  remainingMs: number | null;
  phaseMs: number | null;
  paused: boolean;
  me: { id: string; name: string; total: number; accepted: number; rank: number };
  /** This round's locked answer; tier/km only revealed after the round closes. */
  mine: { label: string; tier: Tier | null; km: number | null } | null;
  misses: number;
  hints: string[];
  playerCount: number;
  answeredCount: number;
  podium: Standing[];
  reveal: RevealInfo | null;
  revision: number;
}
