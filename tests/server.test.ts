// Live multiplayer: a full six-round game with 40 connected clients, plus
// reconnects, authorisation and edge cases — over real Socket.IO.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { ROUNDS } from '../content/game-content';
import type { ClientToServer, ServerToClient } from '../shared/protocol';
import type { HostView, PlayerView, SubmitResult, Tier, TimingPreset } from '../shared/types';
import { startServer } from '../server/index';

type C = Socket<ServerToClient, ClientToServer>;
const T: TimingPreset = { id: 't', label: 't', lobbyMs: 0, answerMs: 1600, revealMs: 500, finaleMs: 0 };
let srv: Awaited<ReturnType<typeof startServer>>;
let url = '';
const sockets: C[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function client(): Promise<C> {
  const s: C = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  sockets.push(s);
  return new Promise((res, rej) => {
    s.once('connect', () => res(s));
    s.once('connect_error', rej);
  });
}
function emitAck<T>(s: C, ev: string, ...args: unknown[]): Promise<T> {
  return new Promise((res) => (s.emit as (...a: unknown[]) => void)(ev, ...args, res));
}
function lastView<V>(s: C, ev: 'host:view' | 'player:view') {
  const box: { v: V | null } = { v: null };
  s.on(ev, (v: unknown) => (box.v = v as V));
  return box;
}
async function until(fn: () => boolean, ms = 8000) {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error('timed out waiting');
    await sleep(25);
  }
}
async function newRoom() {
  const host = await client();
  const hv = lastView<HostView>(host, 'host:view');
  const res = await emitAck<{ ok: true; code: string; hostToken: string }>(host, 'host:create');
  return { host, hv, code: res.code, hostToken: res.hostToken };
}

beforeAll(async () => {
  srv = await startServer({ port: 0, timing: T, allInGraceMs: 150, quiet: true, staticDir: '/nonexistent' });
  url = `http://localhost:${srv.port}`;
});
afterAll(async () => {
  sockets.forEach((s) => s.close());
  await srv.close();
});

describe('live room with 40 clients', () => {
  it('plays a complete six-round game with server-authoritative scoring', async () => {
    const { host, hv, code } = await newRoom();
    const N = 40;
    const players: { s: C; id: string; token: string; pv: { v: PlayerView | null }; expected: number }[] = [];
    await Promise.all(
      Array.from({ length: N }, async (_, i) => {
        const s = await client();
        const pv = lastView<PlayerView>(s, 'player:view');
        const r = await emitAck<{ ok: boolean; playerId: string; token: string; error?: string }>(s, 'player:join', { code, name: `Rider ${i}` });
        expect(r.ok, r.error).toBe(true);
        players.push({ s, id: r.playerId, token: r.token, pv, expected: 0 });
      }),
    );
    await until(() => hv.v?.playerCount === N);

    // players cannot use host controls
    const denied = await emitAck<{ ok: boolean; error: string }>(players[0].s, 'host:action', { type: 'start' });
    expect(denied).toEqual({ ok: false, error: 'not-host' });

    expect((await emitAck<{ ok: boolean }>(host, 'host:action', { type: 'start' })).ok).toBe(true);
    await until(() => hv.v?.phase === 'answering');

    // a late joiner is refused once the first prompt starts
    const late = await client();
    expect(await emitAck(late, 'player:join', { code, name: 'Latecomer' })).toEqual({ ok: false, error: 'game-started' });

    const tierKm: Record<Tier, number> = { common: 10, uncommon: 20, rare: 35, gem: 50 };
    for (let round = 0; round < 6; round++) {
      await until(() => hv.v?.phase === 'answering' && hv.v.roundIndex === round);
      const answers = ROUNDS[round].answers;
      await Promise.all(
        players.map(async (p, i) => {
          if (i % 13 === 5) return; // a few miss the round
          if (i % 7 === 0) {
            const miss = await emitAck<SubmitResult>(p.s, 'player:submit', { round, text: 'definitely not an answer' });
            expect(miss.status).toBe('unknown');
          }
          const a = answers[(i * 7 + round) % answers.length];
          const ok = await emitAck<SubmitResult>(p.s, 'player:submit', { round, text: a.label });
          expect(ok.status, `${round} ${a.label}`).toBe('accepted');
          const dup = await emitAck<SubmitResult>(p.s, 'player:submit', { round, text: answers[0].label });
          expect(dup.status).toBe('already');
          const stale = await emitAck<SubmitResult>(p.s, 'player:submit', { round: round - 1, text: answers[0].label });
          expect(stale.status).toBe('stale');
          p.expected += tierKm[a.tier];
        }),
      );
      // before the reveal nobody can see rarity
      const sample = players.find((_, i) => i % 13 !== 5)!;
      await until(() => !!sample.pv.v?.mine);
      if (sample.pv.v!.phase === 'answering') expect(sample.pv.v!.mine!.tier).toBeNull();
      await until(() => hv.v?.phase === 'reveal' && hv.v.roundIndex === round);
      expect(hv.v!.reveal!.tallies.reduce((n, t) => n + t.count, 0)).toBe(players.filter((_, i) => i % 13 !== 5).length);
    }
    await until(() => hv.v?.phase === 'finale', 10_000);
    const room = srv.rooms.rooms.get(code)!;
    for (const p of players) expect(room.engine.state.players[p.id].total).toBe(p.expected);
    const best = Math.max(...players.map((p) => p.expected));
    expect(hv.v!.standings[0].total).toBe(best);
    expect(hv.v!.leaderKm).toBe(best);
    await until(() => players.every((p) => p.pv.v?.phase === 'finale'));
    expect(players[0].pv.v!.podium).toHaveLength(3);
  });
});

describe('sessions & recovery', () => {
  it('restores the same player after a refresh and rejects bad tokens', async () => {
    const { code } = await newRoom();
    const a = await client();
    const r = await emitAck<{ ok: true; playerId: string; token: string }>(a, 'player:join', { code, name: 'Refresher' });
    a.close();
    const b = await client();
    const pv = lastView<PlayerView>(b, 'player:view');
    expect(await emitAck(b, 'player:resume', { code, playerId: r.playerId, token: 'forged' })).toEqual({ ok: false, error: 'bad-token' });
    expect(await emitAck(b, 'player:resume', { code, playerId: r.playerId, token: r.token })).toEqual({ ok: true });
    await until(() => pv.v?.me.id === r.playerId);
    expect(pv.v!.me.name).toBe('Refresher');
    expect(await emitAck(b, 'player:resume', { code: 'ZZZZ', playerId: r.playerId, token: r.token })).toEqual({ ok: false, error: 'no-room' });
  });

  it('pauses when the host disconnects and lets the host resume with its token', async () => {
    const { host, code, hostToken } = await newRoom();
    const p = await client();
    await emitAck(p, 'player:join', { code, name: 'Solo rider' });
    await emitAck(host, 'host:action', { type: 'start' });
    host.close();
    await until(() => srv.rooms.rooms.get(code)!.engine.state.paused);
    const intruder = await client();
    expect(await emitAck(intruder, 'host:resume', { code, hostToken: 'nope' })).toEqual({ ok: false, error: 'bad-token' });
    const host2 = await client();
    const hv = lastView<HostView>(host2, 'host:view');
    expect(await emitAck(host2, 'host:resume', { code, hostToken })).toEqual({ ok: true });
    await until(() => hv.v?.paused === true);
    await emitAck(host2, 'host:action', { type: 'resume' });
    await until(() => hv.v?.paused === false);
  });

  it('lets the host remove a player, ending that session', async () => {
    const { host, hv, code } = await newRoom();
    const p = await client();
    const ended = new Promise<{ reason: string }>((res) => p.once('session:ended', res));
    const r = await emitAck<{ ok: true; playerId: string; token: string }>(p, 'player:join', { code, name: 'Heckler' });
    await until(() => hv.v?.playerCount === 1);
    await emitAck(host, 'host:action', { type: 'kick', playerId: r.playerId });
    expect(await ended).toEqual({ reason: 'removed' });
    await until(() => hv.v?.playerCount === 0);
    const again = await client();
    expect(await emitAck(again, 'player:resume', { code, playerId: r.playerId, token: r.token })).toEqual({ ok: false, error: 'bad-token' });
  });

  it('restart clears scores, keeps players and reopens joining', async () => {
    const { host, hv, code } = await newRoom();
    const p = await client();
    await emitAck(p, 'player:join', { code, name: 'Keeper' });
    await emitAck(host, 'host:action', { type: 'start' });
    await emitAck(p, 'player:submit', { round: 0, text: 'farming' });
    await until(() => hv.v?.phase === 'reveal');
    expect(hv.v!.leaderKm).toBe(35);
    await emitAck(host, 'host:action', { type: 'restart' });
    await until(() => hv.v?.phase === 'lobby');
    expect(hv.v!.playerCount).toBe(1);
    expect(hv.v!.leaderKm).toBe(0);
    const q = await client();
    expect(await emitAck(q, 'player:join', { code, name: 'Second wave' })).toMatchObject({ ok: true });
  });

  it('rejects submissions after the buzzer', async () => {
    const { host, hv, code } = await newRoom();
    const p = await client();
    const q = await client();
    await emitAck(p, 'player:join', { code, name: 'On time' });
    await emitAck(q, 'player:join', { code, name: 'Too late' });
    await emitAck(host, 'host:action', { type: 'start' });
    await until(() => hv.v?.phase === 'reveal', 5000);
    const r = await emitAck<SubmitResult>(q, 'player:submit', { round: 0, text: 'shower' });
    expect(['closed', 'late']).toContain(r.status);
  });
});
