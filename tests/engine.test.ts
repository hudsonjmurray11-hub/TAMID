import { describe, expect, it } from 'vitest';
import { RARITY } from '../content/game-content';
import { LATE_GRACE_MS } from '../content/timing';
import { BotDriver } from '../shared/bots';
import { GameEngine } from '../shared/engine';
import type { TimingPreset } from '../shared/types';

const T: TimingPreset = { id: 'test', label: 'test', lobbyMs: 0, answerMs: 10_000, revealMs: 4_000, finaleMs: 0 };
const meta = { code: 'TEST', roomName: 'Test Room' };

function setup(n = 3) {
  const e = new GameEngine({ timing: T, allInGraceMs: 500 }, 0);
  const ids = Array.from({ length: n }, (_, i) => e.addPlayer(`P${i}`, 0).player!.id);
  return { e, ids };
}

describe('scoring', () => {
  it('awards each rarity tier its distance at reveal, not before', () => {
    const { e, ids } = setup(4);
    e.start(0);
    expect(e.submit(ids[0], 0, 'towel', 100).status).toBe('accepted');
    expect(e.submit(ids[1], 0, 'beach umbrella', 200).status).toBe('accepted');
    expect(e.submit(ids[2], 0, 'snorkel', 300).status).toBe('accepted');
    expect(e.submit(ids[3], 0, 'first aid kit', 400).status).toBe('accepted');
    expect(e.state.players[ids[0]].total).toBe(0);
    // hidden until reveal
    expect(e.playerView(ids[3], meta, 500)!.mine).toEqual({ label: 'First-aid kit', tier: null, km: null });
    expect(e.hostView(meta, 500).reveal).toBeNull();
    e.tick(1000); // everyone in → closes after grace
    expect(e.state.phase).toBe('reveal');
    expect(ids.map((id) => e.state.players[id].total)).toEqual([RARITY.common.km, RARITY.uncommon.km, RARITY.rare.km, RARITY.gem.km]);
    expect([10, 20, 35, 50]).toEqual(ids.map((id) => e.state.players[id].total));
    const v = e.playerView(ids[3], meta, 1000)!;
    expect(v.mine).toEqual({ label: 'First-aid kit', tier: 'gem', km: 50 });
  });

  it('lets several players share an answer without reducing its award', () => {
    const { e, ids } = setup(3);
    e.start(0);
    for (const id of ids) e.submit(id, 0, 'snorkel', 100);
    e.next(200);
    for (const id of ids) expect(e.state.players[id].total).toBe(35);
    expect(e.revealInfo()!.tallies).toEqual([{ answerId: 'beach:snorkel', label: 'Snorkel', tier: 'rare', km: 35, count: 3 }]);
  });
});

describe('submissions', () => {
  it('allows retries after unrecognised answers and locks the first accepted one', () => {
    const { e, ids } = setup(2);
    e.start(0);
    expect(e.submit(ids[0], 0, 'spaceship', 100).status).toBe('unknown');
    expect(e.submit(ids[0], 0, 'still nope', 200).status).toBe('unknown');
    expect(e.state.players[ids[0]].misses).toBe(2);
    expect(e.submit(ids[0], 0, 'towel', 300).status).toBe('accepted');
    const dup = e.submit(ids[0], 0, 'first aid kit', 400);
    expect(dup.status).toBe('already');
    expect(e.state.players[ids[0]].subs[0]!.label).toBe('Towel');
  });

  it('rejects stale, closed, late, paused and unknown-player submissions', () => {
    const { e, ids } = setup(2);
    expect(e.submit(ids[0], 0, 'towel', 0).status).toBe('stale'); // lobby, round -1
    e.start(0);
    expect(e.submit('ghost', 0, 'towel', 10).status).toBe('no-player');
    expect(e.submit(ids[0], 1, 'towel', 10).status).toBe('stale');
    expect(e.submit(ids[0], 0, '   ', 10).status).toBe('invalid');
    e.pause(100);
    expect(e.submit(ids[0], 0, 'towel', 200).status).toBe('paused');
    e.resume(300);
    const deadline = e.state.deadline!;
    expect(e.submit(ids[0], 0, 'towel', deadline + LATE_GRACE_MS + 1).status).toBe('late');
    expect(e.submit(ids[1], 0, 'towel', deadline + LATE_GRACE_MS - 1).status).toBe('accepted');
    e.next(deadline + 1000);
    expect(e.submit(ids[0], 0, 'towel', deadline + 1100).status).toBe('closed');
  });
});

describe('timers', () => {
  it('advances answer → reveal → next round automatically, then finale', () => {
    const { e } = setup(1);
    e.start(0);
    expect(e.tick(T.answerMs - 1)).toBe(false);
    expect(e.tick(T.answerMs + LATE_GRACE_MS)).toBe(true);
    expect(e.state.phase).toBe('reveal');
    let now = T.answerMs + LATE_GRACE_MS;
    expect(e.tick(now + T.revealMs)).toBe(true);
    expect(e.state.phase).toBe('answering');
    expect(e.state.roundIndex).toBe(1);
    now += T.revealMs;
    for (let r = 1; r < 6; r++) {
      now += T.answerMs + LATE_GRACE_MS;
      e.tick(now);
      now += T.revealMs;
      e.tick(now);
    }
    expect(e.state.phase).toBe('finale');
    expect(e.tick(now + 999_999)).toBe(false); // finale stays
  });

  it('pause freezes the clock and resume restores the remaining time', () => {
    const { e } = setup(1);
    e.start(0);
    e.pause(4000);
    expect(e.remaining(4000)).toBe(6000);
    expect(e.tick(60_000)).toBe(false);
    expect(e.remaining(60_000)).toBe(6000);
    e.resume(60_000);
    expect(e.remaining(60_000)).toBe(6000);
    expect(e.tick(65_999)).toBe(false);
    expect(e.tick(66_000 + LATE_GRACE_MS)).toBe(true);
  });

  it('response time excludes paused time', () => {
    const { e, ids } = setup(1);
    e.start(0);
    e.pause(2000);
    e.resume(50_000);
    e.submit(ids[0], 0, 'towel', 51_000);
    expect(e.state.players[ids[0]].subs[0]!.ms).toBe(3000);
  });

  it('closes early once every connected player is in', () => {
    const { e, ids } = setup(2);
    e.start(0);
    e.setConnected(ids[1], false, 50);
    e.submit(ids[0], 0, 'towel', 100);
    expect(e.state.allInAt).toBe(100);
    expect(e.tick(599)).toBe(false);
    expect(e.tick(600)).toBe(true);
    expect(e.state.phase).toBe('reveal');
  });
});

describe('players & rooms', () => {
  it('allows joining only in the lobby, enforces unique names and the cap', () => {
    const e = new GameEngine({ timing: T, maxPlayers: 3 }, 0);
    expect(e.addPlayer('Ana', 0).player).toBeTruthy();
    expect(e.addPlayer('ana', 0).error).toBe('name-taken');
    expect(e.addPlayer('   ', 0).error).toBe('name-empty');
    expect(e.addPlayer('B', 0).player).toBeTruthy();
    expect(e.addPlayer('C', 0).player).toBeTruthy();
    expect(e.addPlayer('D', 0).error).toBe('room-full');
    e.start(0);
    const e2 = new GameEngine({ timing: T }, 0);
    e2.addPlayer('X', 0);
    e2.start(0);
    expect(e2.addPlayer('Late', 0).error).toBe('game-started');
  });

  it('restart clears scores but keeps remaining players, and new players may join again', () => {
    const { e, ids } = setup(3);
    e.start(0);
    e.submit(ids[0], 0, 'snorkel', 100);
    e.next(200);
    e.removePlayer(ids[2]);
    e.restart(300);
    expect(e.state.phase).toBe('lobby');
    expect(Object.keys(e.state.players)).toHaveLength(2);
    for (const id of ids.slice(0, 2)) {
      const p = e.state.players[id];
      expect([p.total, p.accepted, p.responseMs]).toEqual([0, 0, 0]);
      expect(p.subs.every((s) => s === null)).toBe(true);
    }
    expect(e.addPlayer('Newbie', 400).player).toBeTruthy();
  });

  it('breaks ties by distance, then accepted answers, then total response time', () => {
    const { e, ids } = setup(3);
    e.start(0);
    e.submit(ids[0], 0, 'towel', 3000); // 10 km, slow
    e.submit(ids[1], 0, 'sunscreen', 1000); // 10 km, fast
    e.submit(ids[2], 0, 'snorkel', 5000); // 35 km
    e.next(6000);
    const order = e.standings().map((s) => s.name);
    expect(order).toEqual(['P2', 'P1', 'P0']);
  });
});

describe('bots', () => {
  it('play a full game with a realistic mix of tiers and some misses', () => {
    const e = new GameEngine({ timing: T }, 0);
    const bots = new BotDriver(e, 42);
    bots.addBots(25, 0);
    e.start(0);
    let now = 0;
    const tiers: Record<string, number> = {};
    let misses = 0;
    while (e.state.phase !== 'finale') {
      now += 100;
      bots.tick(now);
      e.tick(now);
      if (e.state.phase === 'reveal' && e.elapsed(now) < 100) {
        const r = e.revealInfo()!;
        misses += r.missed;
        for (const t of r.tallies) tiers[t.tier] = (tiers[t.tier] ?? 0) + t.count;
      }
    }
    expect(Object.keys(tiers).sort()).toEqual(['common', 'gem', 'rare', 'uncommon']);
    expect(tiers.common).toBeGreaterThan(tiers.gem);
    expect(misses).toBeGreaterThan(0);
    expect(misses).toBeLessThan(40);
  });
});
