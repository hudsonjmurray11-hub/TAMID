// Solo and Demo Mode: the same engine, run entirely in the browser.
// State is saved locally so a refresh restores the trip (paused).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SOLO_REVEAL_DELAY_MS } from '../../../content/timing';
import { BotDriver, roomName } from '../../../shared/bots';
import { GameEngine } from '../../../shared/engine';
import type { HostAction } from '../../../shared/protocol';
import type { GameState, HostView, PlayerView, SubmitResult } from '../../../shared/types';
import { store } from './storage';

export const SOLO_ID = 'you';

interface Saved {
  v: 1;
  state: GameState;
  savedAt: number;
  roomName: string;
}

function restoreState(saved: Saved | null): { state: GameState; restored: boolean } | null {
  if (!saved || saved.v !== 1 || !saved.state) return null;
  const s = saved.state;
  if ((s.phase === 'answering' || s.phase === 'reveal') && !s.paused && s.deadline !== null) {
    s.paused = true;
    s.remainingAtPause = Math.max(1500, s.deadline - saved.savedAt);
    s.deadline = null;
  }
  return { state: s, restored: s.phase !== 'lobby' };
}

export class LocalGame {
  engine: GameEngine;
  bots: BotDriver | null = null;
  roomName: string;
  restored = false;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRev = -1;

  constructor(readonly kind: 'solo' | 'demo') {
    const key = `nst:${kind}`;
    const saved = store.get<Saved>(key);
    const r = restoreState(saved);
    const opts = { allInGraceMs: kind === 'solo' ? SOLO_REVEAL_DELAY_MS : undefined };
    const now = Date.now();
    if (r) {
      this.engine = new GameEngine(opts, now, r.state);
      this.restored = r.restored;
      this.roomName = saved!.roomName;
    } else {
      this.engine = new GameEngine(opts, now);
      this.roomName = kind === 'demo' ? roomName() : 'Solo road trip';
    }
    if (kind === 'demo') {
      this.bots = new BotDriver(this.engine);
      if (!r) this.bots.addBots(25, now);
    } else if (!this.engine.state.players[SOLO_ID]) {
      this.engine.addPlayer('You', now, { id: SOLO_ID });
    }
  }

  get meta() {
    return { code: this.kind === 'demo' ? 'DEMO' : 'SOLO', roomName: this.roomName, demo: this.kind === 'demo' };
  }

  run() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 150);
    this.tick();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  subscribe(f: () => void) {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }

  private tick() {
    const now = Date.now();
    this.bots?.tick(now);
    this.engine.tick(now);
    this.emitIfChanged();
  }

  private emitIfChanged(force = false) {
    if (!force && this.engine.state.revision === this.lastRev) return;
    this.lastRev = this.engine.state.revision;
    this.save();
    this.listeners.forEach((f) => f());
  }

  save() {
    store.set(`nst:${this.kind}`, { v: 1, state: this.engine.state, savedAt: Date.now(), roomName: this.roomName } satisfies Saved);
  }

  act(a: HostAction) {
    const now = Date.now();
    const e = this.engine;
    switch (a.type) {
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
        this.restored = false;
        e.resume(now);
        break;
      case 'restart':
        e.restart(now);
        this.bots?.reset();
        this.restored = false;
        break;
      case 'kick':
        e.removePlayer(a.playerId, now);
        break;
      case 'preset':
        e.setPreset(a.presetId);
        break;
    }
    this.emitIfChanged(true);
  }

  submit(text: string): SubmitResult {
    const r = this.engine.submit(SOLO_ID, this.engine.state.roundIndex, text, Date.now());
    this.emitIfChanged(true);
    return r;
  }

  hostView(): HostView {
    return this.engine.hostView(this.meta, Date.now());
  }

  playerView(): PlayerView | null {
    return this.engine.playerView(SOLO_ID, this.meta, Date.now());
  }

  /** Throw away the saved trip and start a fresh one. */
  static reset(kind: 'solo' | 'demo') {
    store.del(`nst:${kind}`);
  }
}

export function useLocalGame(kind: 'solo' | 'demo') {
  const [game, setGame] = useState(() => new LocalGame(kind));
  const [, setRev] = useState(0);
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    const unsub = game.subscribe(() => setRev((x) => x + 1));
    game.run();
    return () => {
      unsub();
      game.stop();
      game.save();
    };
  }, [game]);

  const hostView = useMemo(() => (kind === 'demo' ? game.hostView() : null), [game, game.engine.state.revision, kind]);
  const playerView = useMemo(() => (kind === 'solo' ? game.playerView() : null), [game, game.engine.state.revision, kind]);

  const act = useCallback((a: HostAction) => gameRef.current.act(a), []);
  const submit = useCallback((text: string) => gameRef.current.submit(text), []);
  const fresh = useCallback(() => {
    gameRef.current.stop();
    LocalGame.reset(kind);
    setGame(new LocalGame(kind));
  }, [kind]);

  return { game, hostView, playerView, act, submit, fresh, restored: game.restored };
}
