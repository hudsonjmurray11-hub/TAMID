// The one game engine. Pure and deterministic given `now`, so the server,
// solo mode and demo mode all run exactly the same rules.
import { ALL_ROUNDS, DEFAULT_PACK_ID, RARITY, getPack } from '../content/game-content';
import { ALL_IN_GRACE_MS, DEFAULT_PRESET_ID, LATE_GRACE_MS, MAX_PLAYERS, getPreset } from '../content/timing';
import { answerId, matcherFor, normalize } from './matcher';
import type {
  FullAnswer,
  GameState,
  HostView,
  PlayerState,
  PlayerView,
  RevealInfo,
  RoundDef,
  Standing,
  SubmitResult,
  Tally,
  Tier,
  TimingPreset,
} from './types';
import { TIER_ORDER } from './types';

export interface EngineOptions {
  /** Tests can pin specific rounds; otherwise the chosen question set is used. */
  rounds?: RoundDef[];
  presetId?: string;
  packId?: string;
  /** Tests can pass custom timings; otherwise presets from content/timing.ts. */
  timing?: TimingPreset;
  maxPlayers?: number;
  allInGraceMs?: number;
}

export interface RoomMeta {
  code: string;
  roomName: string;
  demo?: boolean;
}

export type JoinError = 'name-empty' | 'name-taken' | 'name-blocked' | 'room-full' | 'game-started';

const BLOCKED = /(fuck|shit|cunt|nigg|fag|bitch|whore|slut|rape|nazi|hitler|penis|vagina|dick|cock|pussy|porn|kkk)/i;

export function cleanName(raw: string): string {
  return raw.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 18);
}

export function compareStandings(a: PlayerState, b: PlayerState): number {
  return b.total - a.total || b.accepted - a.accepted || a.responseMs - b.responseMs || a.joinedAt - b.joinedAt;
}

export class GameEngine {
  state: GameState;
  private fixedRounds?: RoundDef[];
  readonly maxPlayers: number;
  private timingOverride?: TimingPreset;
  private allInGraceMs: number;

  constructor(opts: EngineOptions = {}, now = Date.now(), restore?: GameState) {
    this.fixedRounds = opts.rounds;
    this.maxPlayers = opts.maxPlayers ?? MAX_PLAYERS;
    this.timingOverride = opts.timing;
    this.allInGraceMs = opts.allInGraceMs ?? ALL_IN_GRACE_MS;
    if (restore && !restore.packId) restore.packId = DEFAULT_PACK_ID;
    this.state = restore ?? {
      phase: 'lobby',
      roundIndex: -1,
      totalRounds: (opts.rounds ?? getPack(opts.packId).rounds).length,
      presetId: opts.presetId ?? DEFAULT_PRESET_ID,
      packId: getPack(opts.packId ?? DEFAULT_PACK_ID).id,
      phaseStartedAt: now,
      deadline: null,
      paused: false,
      remainingAtPause: null,
      players: {},
      order: [],
      revision: 0,
      allInAt: null,
    };
  }

  /** Rounds of the current question set. */
  get rounds(): RoundDef[] {
    return this.fixedRounds ?? getPack(this.state.packId).rounds;
  }

  get timing(): TimingPreset {
    return this.timingOverride ?? getPreset(this.state.presetId);
  }

  get round(): RoundDef | null {
    const i = this.state.roundIndex;
    return i >= 0 && i < this.rounds.length ? this.rounds[i] : null;
  }

  private bump() {
    this.state.revision++;
  }

  // ── players ────────────────────────────────────────────────
  addPlayer(rawName: string, now: number, opts: { isBot?: boolean; id?: string } = {}): { player?: PlayerState; error?: JoinError } {
    const name = cleanName(rawName);
    if (!name) return { error: 'name-empty' };
    if (!opts.isBot && BLOCKED.test(name.replace(/[^a-z]/gi, ''))) return { error: 'name-blocked' };
    if (this.state.phase !== 'lobby') return { error: 'game-started' };
    if (this.state.order.length >= this.maxPlayers) return { error: 'room-full' };
    const taken = Object.values(this.state.players).some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (taken) return { error: 'name-taken' };
    const id = opts.id ?? Math.random().toString(36).slice(2, 10);
    const player: PlayerState = {
      id,
      name,
      joinedAt: now,
      connected: true,
      isBot: !!opts.isBot,
      total: 0,
      accepted: 0,
      responseMs: 0,
      subs: this.rounds.map(() => null),
      misses: 0,
    };
    this.state.players[id] = player;
    this.state.order.push(id);
    this.bump();
    return { player };
  }

  removePlayer(id: string, now = Date.now()): boolean {
    if (!this.state.players[id]) return false;
    delete this.state.players[id];
    this.state.order = this.state.order.filter((x) => x !== id);
    this.checkAllIn(now);
    this.bump();
    return true;
  }

  setConnected(id: string, connected: boolean, now = Date.now()) {
    const p = this.state.players[id];
    if (!p || p.connected === connected) return;
    p.connected = connected;
    this.checkAllIn(now);
    this.bump();
  }

  /** Pick the question set (lobby only). */
  setPack(packId: string): boolean {
    if (this.state.phase !== 'lobby' || this.fixedRounds) return false;
    this.state.packId = getPack(packId).id;
    this.state.totalRounds = this.rounds.length;
    for (const p of Object.values(this.state.players)) p.subs = this.rounds.map(() => null);
    this.bump();
    return true;
  }

  setPreset(presetId: string): boolean {
    if (this.state.phase !== 'lobby') return false;
    this.state.presetId = getPreset(presetId).id;
    this.bump();
    return true;
  }

  // ── flow ───────────────────────────────────────────────────
  start(now: number): boolean {
    if (this.state.phase !== 'lobby') return false;
    this.beginRound(0, now);
    return true;
  }

  private beginRound(index: number, now: number) {
    const s = this.state;
    s.phase = 'answering';
    s.roundIndex = index;
    s.phaseStartedAt = now;
    s.deadline = now + this.timing.answerMs;
    s.allInAt = null;
    s.paused = false;
    s.remainingAtPause = null;
    for (const p of Object.values(s.players)) p.misses = 0;
    this.bump();
  }

  private beginReveal(now: number) {
    const s = this.state;
    const i = s.roundIndex;
    for (const p of Object.values(s.players)) {
      const sub = p.subs[i];
      if (sub) {
        p.total += sub.km;
        p.accepted += 1;
        p.responseMs += sub.ms;
      }
    }
    s.phase = 'reveal';
    s.phaseStartedAt = now;
    s.deadline = now + this.timing.revealMs;
    s.allInAt = null;
    this.bump();
  }

  private beginFinale(now: number) {
    const s = this.state;
    s.phase = 'finale';
    s.phaseStartedAt = now;
    s.deadline = null;
    s.paused = false;
    s.remainingAtPause = null;
    this.bump();
  }

  /** Host "next" / space bar: start, reveal early, or move on. */
  next(now: number): boolean {
    const s = this.state;
    if (s.phase === 'lobby') return this.start(now);
    if (s.phase === 'answering') {
      this.unpauseSilently(now);
      this.beginReveal(now);
      return true;
    }
    if (s.phase === 'reveal') {
      this.unpauseSilently(now);
      if (s.roundIndex + 1 < this.rounds.length) this.beginRound(s.roundIndex + 1, now);
      else this.beginFinale(now);
      return true;
    }
    return false;
  }

  private unpauseSilently(now: number) {
    if (this.state.paused) {
      this.state.paused = false;
      this.state.remainingAtPause = null;
    }
    void now;
  }

  /** Advance on deadlines. Returns true if anything changed. */
  tick(now: number): boolean {
    const s = this.state;
    if (s.paused) return false;
    if (s.phase === 'answering') {
      if (s.allInAt !== null && now >= s.allInAt + this.allInGraceMs) {
        this.beginReveal(now);
        return true;
      }
      if (s.deadline !== null && now >= s.deadline + LATE_GRACE_MS) {
        this.beginReveal(now);
        return true;
      }
    } else if (s.phase === 'reveal' && s.deadline !== null && now >= s.deadline) {
      return this.next(now);
    }
    return false;
  }

  pause(now: number): boolean {
    const s = this.state;
    if (s.paused || (s.phase !== 'answering' && s.phase !== 'reveal') || s.deadline === null) return false;
    s.paused = true;
    s.remainingAtPause = Math.max(0, s.deadline - now);
    s.deadline = null;
    this.bump();
    return true;
  }

  resume(now: number): boolean {
    const s = this.state;
    if (!s.paused) return false;
    const remaining = Math.max(s.remainingAtPause ?? 0, 1500);
    s.deadline = now + remaining;
    s.phaseStartedAt = now - Math.max(0, this.phaseLengthMs() - remaining);
    if (s.allInAt !== null) s.allInAt = now;
    s.paused = false;
    s.remainingAtPause = null;
    this.bump();
    return true;
  }

  togglePause(now: number): boolean {
    return this.state.paused ? this.resume(now) : this.pause(now);
  }

  /** Clear scores, keep remaining players, return to the lobby. */
  restart(now: number) {
    const s = this.state;
    s.phase = 'lobby';
    s.roundIndex = -1;
    s.phaseStartedAt = now;
    s.deadline = null;
    s.paused = false;
    s.remainingAtPause = null;
    s.allInAt = null;
    for (const p of Object.values(s.players)) {
      p.total = 0;
      p.accepted = 0;
      p.responseMs = 0;
      p.subs = this.rounds.map(() => null);
      p.misses = 0;
    }
    this.bump();
  }

  private phaseLengthMs(): number {
    return this.state.phase === 'answering' ? this.timing.answerMs : this.state.phase === 'reveal' ? this.timing.revealMs : 0;
  }

  /** Elapsed ms in the current phase, excluding pauses. */
  elapsed(now: number): number {
    if (this.state.paused && this.state.remainingAtPause !== null) return this.phaseLengthMs() - this.state.remainingAtPause;
    return now - this.state.phaseStartedAt;
  }

  remaining(now: number): number | null {
    const s = this.state;
    if (s.paused) return s.remainingAtPause;
    if (s.deadline === null) return null;
    return Math.max(0, s.deadline - now);
  }

  // ── answers ────────────────────────────────────────────────
  submit(playerId: string, roundIndex: number, text: string, now: number): SubmitResult {
    const s = this.state;
    const p = s.players[playerId];
    if (!p) return { status: 'no-player' };
    if (typeof text !== 'string' || !normalize(text)) return { status: 'invalid', message: 'Type an answer first.' };
    if (roundIndex !== s.roundIndex) return { status: 'stale', message: 'That round has already closed.' };
    if (s.phase !== 'answering') return { status: 'closed', message: 'This round is closed.' };
    if (s.paused) return { status: 'paused', message: 'Paused — hold that thought.' };
    if (s.deadline !== null && now > s.deadline + LATE_GRACE_MS) return { status: 'late', message: 'Just missed the buzzer.' };
    if (p.subs[roundIndex]) return { status: 'already', label: p.subs[roundIndex]!.label, message: 'You already locked in.' };
    const round = this.rounds[roundIndex];
    const hit = matcherFor(round, ALL_ROUNDS).match(text);
    if (!hit) {
      p.misses += 1;
      this.bump();
      return { status: 'unknown', message: 'Not on our map — try another!' };
    }
    const km = RARITY[hit.answer.tier].km;
    p.subs[roundIndex] = {
      answerId: hit.id,
      label: hit.answer.label,
      tier: hit.answer.tier,
      km,
      ms: Math.max(0, now - s.phaseStartedAt),
    };
    this.checkAllIn(now);
    this.bump();
    return { status: 'accepted', label: hit.answer.label };
  }

  private checkAllIn(now: number) {
    const s = this.state;
    if (s.phase !== 'answering') return;
    const active = Object.values(s.players).filter((p) => p.connected);
    const all = active.length > 0 && active.every((p) => p.subs[s.roundIndex]);
    if (all && s.allInAt === null) s.allInAt = now;
    if (!all) s.allInAt = null;
  }

  // ── read models ────────────────────────────────────────────
  standings(): Standing[] {
    const sorted = Object.values(this.state.players).sort(compareStandings);
    const out: Standing[] = [];
    sorted.forEach((p, i) => {
      const prev = sorted[i - 1];
      const tied = prev && prev.total === p.total && prev.accepted === p.accepted && prev.responseMs === p.responseMs;
      out.push({
        id: p.id,
        name: p.name,
        total: p.total,
        accepted: p.accepted,
        responseMs: p.responseMs,
        rank: tied ? out[i - 1].rank : i + 1,
        isBot: p.isBot,
      });
    });
    return out;
  }

  fullList(round: RoundDef): FullAnswer[] {
    return [...round.answers]
      .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.label.localeCompare(b.label))
      .map((a) => ({ label: a.label, tier: a.tier, km: RARITY[a.tier].km }));
  }

  revealInfo(): RevealInfo | null {
    const s = this.state;
    const round = this.round;
    if (!round || (s.phase !== 'reveal' && s.phase !== 'finale')) return null;
    const i = s.roundIndex;
    const counts = new Map<string, Tally>();
    let missed = 0;
    for (const p of Object.values(s.players)) {
      const sub = p.subs[i];
      if (!sub) {
        missed++;
        continue;
      }
      const t = counts.get(sub.answerId) ?? { answerId: sub.answerId, label: sub.label, tier: sub.tier, km: sub.km, count: 0 };
      t.count++;
      counts.set(sub.answerId, t);
    }
    const tallies = [...counts.values()].sort(
      (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || b.count - a.count || a.label.localeCompare(b.label),
    );
    const bestTier = (TIER_ORDER.find((t) => tallies.some((x) => x.tier === t)) ?? null) as Tier | null;
    return { tallies, insight: round.insight, fullList: this.fullList(round), bestTier, missed };
  }

  hostView(meta: RoomMeta, now: number): HostView {
    const s = this.state;
    const standings = this.standings();
    const leader = standings[0] ? s.players[standings[0].id] : null;
    const leaderSub = leader && s.phase === 'reveal' ? leader.subs[s.roundIndex] : null;
    const answeredCount = s.phase === 'answering' ? Object.values(s.players).filter((p) => p.subs[s.roundIndex]).length : 0;
    return {
      kind: 'host',
      code: meta.code,
      roomName: meta.roomName,
      demo: !!meta.demo,
      phase: s.phase,
      roundIndex: s.roundIndex,
      totalRounds: s.totalRounds,
      prompt: this.round?.prompt ?? null,
      remainingMs: this.remaining(now),
      phaseMs: this.phaseLengthMs() || null,
      paused: s.paused,
      presetId: s.presetId,
      packId: s.packId,
      players: s.order
        .map((id) => s.players[id])
        .filter(Boolean)
        .map((p) => ({
          id: p.id,
          name: p.name,
          connected: p.connected,
          answered: s.phase === 'answering' && !!p.subs[s.roundIndex],
          total: p.total,
          isBot: p.isBot,
        })),
      playerCount: s.order.length,
      answeredCount,
      maxPlayers: this.maxPlayers,
      standings: standings.slice(0, 10),
      leaderKm: standings[0]?.total ?? 0,
      leaderLastAward: leaderSub ? { tier: leaderSub.tier, km: leaderSub.km } : null,
      reveal: this.revealInfo(),
      revision: s.revision,
    };
  }

  playerView(playerId: string, meta: RoomMeta, now: number): PlayerView | null {
    const s = this.state;
    const p = s.players[playerId];
    if (!p) return null;
    const standings = this.standings();
    const mine = s.roundIndex >= 0 ? p.subs[s.roundIndex] : null;
    const revealed = s.phase === 'reveal' || s.phase === 'finale';
    const round = this.round;
    return {
      kind: 'player',
      code: meta.code,
      roomName: meta.roomName,
      packId: s.packId,
      phase: s.phase,
      roundIndex: s.roundIndex,
      totalRounds: s.totalRounds,
      prompt: round?.prompt ?? null,
      remainingMs: this.remaining(now),
      phaseMs: this.phaseLengthMs() || null,
      paused: s.paused,
      me: {
        id: p.id,
        name: p.name,
        total: p.total,
        accepted: p.accepted,
        rank: standings.find((x) => x.id === p.id)?.rank ?? 0,
      },
      mine: mine ? { label: mine.label, tier: revealed ? mine.tier : null, km: revealed ? mine.km : null } : null,
      misses: p.misses,
      hints: round ? round.answers.filter((a) => a.tier === 'common').slice(0, 3).map((a) => a.label) : [],
      playerCount: s.order.length,
      answeredCount: s.phase === 'answering' ? Object.values(s.players).filter((x) => x.subs[s.roundIndex]).length : 0,
      podium: revealed ? standings.slice(0, 3) : [],
      reveal: this.revealInfo(),
      revision: s.revision,
    };
  }

  /** Ids for answers — exported for tests/bots. */
  static answerId = answerId;
}
