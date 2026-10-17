// Live rooms. State lives in this process's memory: restarting or
// redeploying the server ends every room (documented in the README).
import { randomBytes } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { BotDriver, roomCode, roomName } from '../shared/bots';
import { GameEngine } from '../shared/engine';
import type { ClientToServer, HostAction, ServerToClient } from '../shared/protocol';
import type { TimingPreset } from '../shared/types';

type IO = Server<ClientToServer, ServerToClient>;
type Sock = Socket<ClientToServer, ServerToClient>;

const token = () => randomBytes(18).toString('base64url');
const ROOM_IDLE_MS = 3 * 60 * 60 * 1000;

export interface RoomOptions {
  timing?: TimingPreset;
  allInGraceMs?: number;
}

export class Room {
  readonly code: string;
  readonly roomName: string;
  readonly hostToken = token();
  readonly engine: GameEngine;
  readonly tokens = new Map<string, string>();
  hostSockets = new Set<string>();
  playerSockets = new Map<string, Set<string>>();
  lastActivity = Date.now();
  private flushTimer: NodeJS.Timeout | null = null;
  bots: BotDriver | null = null;

  constructor(private io: IO, code: string, opts: RoomOptions) {
    this.code = code;
    this.roomName = roomName();
    this.engine = new GameEngine({ timing: opts.timing, allInGraceMs: opts.allInGraceMs }, Date.now());
  }

  get meta() {
    return { code: this.code, roomName: this.roomName };
  }

  /** Coalesce bursts (40 answers in a second) into one broadcast. */
  broadcast(immediate = false) {
    this.lastActivity = Date.now();
    if (immediate) return this.flush();
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flush(), 40);
  }

  flush() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    const now = Date.now();
    this.io.to(`host:${this.code}`).emit('host:view', this.engine.hostView(this.meta, now));
    for (const id of this.playerSockets.keys()) {
      const v = this.engine.playerView(id, this.meta, now);
      if (v) this.io.to(`p:${this.code}:${id}`).emit('player:view', v);
    }
  }

  dispose() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
  }
}

export class RoomManager {
  rooms = new Map<string, Room>();
  private ticker: NodeJS.Timeout;

  constructor(private io: IO, private opts: RoomOptions = {}) {
    this.ticker = setInterval(() => this.tick(), 200);
    io.on('connection', (s) => this.attach(s));
  }

  close() {
    clearInterval(this.ticker);
    for (const r of this.rooms.values()) r.dispose();
  }

  private tick() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      const botActed = room.bots?.tick(now) ?? false;
      if (room.engine.tick(now) || botActed) room.broadcast();
      const empty = room.hostSockets.size === 0 && [...room.playerSockets.values()].every((s) => s.size === 0);
      if (empty && now - room.lastActivity > ROOM_IDLE_MS) {
        room.dispose();
        this.rooms.delete(room.code);
      }
    }
  }

  createRoom(): Room {
    let code = roomCode();
    while (this.rooms.has(code)) code = roomCode();
    const room = new Room(this.io, code, this.opts);
    this.rooms.set(code, room);
    return room;
  }

  private attach(socket: Sock) {
    let role: 'host' | 'player' | null = null;
    let room: Room | null = null;
    let playerId: string | null = null;
    let lastSubmits: number[] = [];

    const bindHost = (r: Room) => {
      role = 'host';
      room = r;
      r.hostSockets.add(socket.id);
      socket.join(`host:${r.code}`);
    };
    const bindPlayer = (r: Room, id: string) => {
      role = 'player';
      room = r;
      playerId = id;
      let set = r.playerSockets.get(id);
      if (!set) r.playerSockets.set(id, (set = new Set()));
      set.add(socket.id);
      socket.join(`p:${r.code}:${id}`);
      r.engine.setConnected(id, true, Date.now());
    };
    const findRoom = (code: unknown) => (typeof code === 'string' ? this.rooms.get(code.trim().toUpperCase()) : undefined);

    socket.on('host:create', (ack) => {
      if (typeof ack !== 'function') return;
      if (role) return ack({ ok: false, error: 'bad-request' });
      const r = this.createRoom();
      bindHost(r);
      ack({ ok: true, code: r.code, hostToken: r.hostToken });
      r.broadcast(true);
    });

    socket.on('host:resume', (p, ack) => {
      if (typeof ack !== 'function') return;
      const r = findRoom(p?.code);
      if (!r) return ack({ ok: false, error: 'no-room' });
      if (p.hostToken !== r.hostToken) return ack({ ok: false, error: 'bad-token' });
      if (role === 'player') return ack({ ok: false, error: 'bad-request' });
      bindHost(r);
      ack({ ok: true });
      r.broadcast(true);
    });

    socket.on('host:action', (a: HostAction, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      if (role !== 'host' || !room) return reply({ ok: false, error: 'not-host' });
      const e = room.engine;
      const now = Date.now();
      switch (a?.type) {
        case 'start':
          e.start(now);
          break;
        case 'next':
          e.next(now);
          break;
        case 'pause':
          e.pause(now);
          break;
        case 'resume':
          e.resume(now);
          break;
        case 'restart':
          e.restart(now);
          room.bots?.reset();
          break;
        case 'preset':
          e.setPreset(String(a.presetId));
          break;
        case 'pack':
          e.setPack(String(a.packId));
          room.bots?.reset();
          break;
        case 'kick': {
          const id = String(a.playerId);
          if (e.removePlayer(id, now)) {
            room.tokens.delete(id);
            this.io.to(`p:${room.code}:${id}`).emit('session:ended', { reason: 'removed' });
            this.io.in(`p:${room.code}:${id}`).socketsLeave(`p:${room.code}:${id}`);
            room.playerSockets.delete(id);
          }
          break;
        }
        default:
          return reply({ ok: false, error: 'bad-request' });
      }
      reply({ ok: true });
      room.broadcast(true);
    });

    socket.on('player:join', (p, ack) => {
      if (typeof ack !== 'function') return;
      const r = findRoom(p?.code);
      if (!r) return ack({ ok: false, error: 'no-room' });
      if (role) return ack({ ok: false, error: 'bad-request' });
      const res = r.engine.addPlayer(String(p.name ?? ''), Date.now());
      if (!res.player) return ack({ ok: false, error: res.error ?? 'bad-request' });
      const t = token();
      r.tokens.set(res.player.id, t);
      bindPlayer(r, res.player.id);
      ack({ ok: true, playerId: res.player.id, token: t });
      r.broadcast();
    });

    socket.on('player:resume', (p, ack) => {
      if (typeof ack !== 'function') return;
      const r = findRoom(p?.code);
      if (!r) return ack({ ok: false, error: 'no-room' });
      const expected = r.tokens.get(String(p.playerId));
      if (!expected || expected !== p.token || !r.engine.state.players[p.playerId]) return ack({ ok: false, error: 'bad-token' });
      if (role === 'host') return ack({ ok: false, error: 'bad-request' });
      bindPlayer(r, p.playerId);
      ack({ ok: true });
      r.broadcast();
    });

    socket.on('player:submit', (p, ack) => {
      if (typeof ack !== 'function') return;
      if (role !== 'player' || !room || !playerId) return ack({ status: 'no-player' });
      const now = Date.now();
      lastSubmits = lastSubmits.filter((t) => now - t < 2000);
      if (lastSubmits.length >= 12) return ack({ status: 'invalid', message: 'Easy on the horn — slow down a little.' });
      lastSubmits.push(now);
      const text = typeof p?.text === 'string' ? p.text.slice(0, 80) : '';
      const res = room.engine.submit(playerId, Number(p?.round), text, now);
      ack(res);
      if (res.status === 'accepted' || res.status === 'unknown') room.broadcast();
    });

    socket.on('player:leave', () => {
      if (role !== 'player' || !room || !playerId) return;
      if (room.engine.state.phase === 'lobby') {
        room.engine.removePlayer(playerId);
        room.tokens.delete(playerId);
        room.playerSockets.delete(playerId);
      }
      socket.leave(`p:${room.code}:${playerId}`);
      role = null;
      room.broadcast();
    });

    socket.on('disconnect', () => {
      const r = room as Room | null;
      if (!r) return;
      const now = Date.now();
      if (role === 'host') {
        r.hostSockets.delete(socket.id);
        if (r.hostSockets.size === 0) r.engine.pause(now);
      } else if (role === 'player' && playerId) {
        const set = r.playerSockets.get(playerId);
        set?.delete(socket.id);
        if (!set || set.size === 0) r.engine.setConnected(playerId, false, now);
      }
      r.broadcast();
    });
  }
}
