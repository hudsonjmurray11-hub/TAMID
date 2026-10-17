// Simulated passengers for Demo Mode (and load tests).
import { BOT_NAMES, ROOM_NAME_PARTS } from '../content/game-content';
import type { GameEngine } from './engine';
import type { AnswerDef, Tier } from './types';

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roomName(rand = Math.random): string {
  const a = ROOM_NAME_PARTS.adjectives[Math.floor(rand() * ROOM_NAME_PARTS.adjectives.length)];
  const n = ROOM_NAME_PARTS.nouns[Math.floor(rand() * ROOM_NAME_PARTS.nouns.length)];
  return `The ${a} ${n}`;
}

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O
export function roomCode(rand = Math.random): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_LETTERS[Math.floor(rand() * CODE_LETTERS.length)];
  return s;
}

interface Plan {
  botId: string;
  atMs: number;
  text: string;
  /** Sometimes a bot fumbles first, then retries (shows off retries). */
  fumble?: string;
  fumbleDone?: boolean;
  done: boolean;
}

/** Drives bot submissions round by round against any GameEngine. */
export class BotDriver {
  private rand: () => number;
  private skill = new Map<string, number>();
  private plans: Plan[] = [];
  private plannedRound = -1;

  constructor(private engine: GameEngine, seed = Date.now()) {
    this.rand = mulberry32(seed);
  }

  addBots(count: number, now: number) {
    const names = [...BOT_NAMES];
    for (let i = 0; i < count; i++) {
      const name = names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : '');
      const res = this.engine.addPlayer(name, now, { isBot: true });
      if (res.player) this.skill.set(res.player.id, this.rand());
    }
  }

  private pickTier(skill: number): Tier {
    const w: [Tier, number][] = [
      ['common', 0.46 - 0.24 * skill],
      ['uncommon', 0.3],
      ['rare', 0.16 + 0.12 * skill],
      ['gem', 0.08 + 0.12 * skill],
    ];
    const total = w.reduce((s, [, x]) => s + x, 0);
    let r = this.rand() * total;
    for (const [t, x] of w) {
      if ((r -= x) <= 0) return t;
    }
    return 'common';
  }

  private planRound(roundIndex: number) {
    const e = this.engine;
    const round = e.rounds[roundIndex];
    const answerMs = e.timing.answerMs;
    this.plans = [];
    for (const p of Object.values(e.state.players)) {
      if (!p.isBot) continue;
      if (this.rand() < 0.07) continue; // missed this round
      const skill = this.skill.get(p.id) ?? 0.5;
      const tier = this.pickTier(skill);
      const pool = round.answers.filter((a) => a.tier === tier);
      const ans: AnswerDef = pool[Math.floor(this.rand() * pool.length)] ?? round.answers[0];
      const useAlias = ans.aliases?.length && this.rand() < 0.3;
      const text = useAlias ? ans.aliases![Math.floor(this.rand() * ans.aliases!.length)] : ans.label;
      const span = Math.max(1000, answerMs - 4500);
      const atMs = 1800 + Math.pow(this.rand(), 1.4) * span;
      this.plans.push({
        botId: p.id,
        atMs,
        text,
        fumble: this.rand() < 0.1 ? 'something weird' : undefined,
        done: false,
      });
    }
    this.plannedRound = roundIndex;
  }

  /** Call often (e.g. every 200 ms). Returns true if any bot acted. */
  tick(now: number): boolean {
    const e = this.engine;
    const s = e.state;
    if (s.phase !== 'answering' || s.paused) return false;
    if (this.plannedRound !== s.roundIndex) this.planRound(s.roundIndex);
    const elapsed = e.elapsed(now);
    let acted = false;
    for (const plan of this.plans) {
      if (plan.done) continue;
      if (plan.fumble && !plan.fumbleDone && elapsed >= plan.atMs - 1500) {
        e.submit(plan.botId, s.roundIndex, plan.fumble, now);
        plan.fumbleDone = true;
        acted = true;
      }
      if (elapsed >= plan.atMs) {
        e.submit(plan.botId, s.roundIndex, plan.text, now);
        plan.done = true;
        acted = true;
      }
    }
    return acted;
  }

  reset() {
    this.plannedRound = -1;
    this.plans = [];
  }
}
