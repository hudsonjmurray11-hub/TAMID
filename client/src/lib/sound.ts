// Tiny synthesized sound kit (no audio files, works offline). Starts OFF.
import { useSyncExternalStore } from 'react';
import type { Tier } from '../../../shared/types';

let enabled = false;
let ctx: AudioContext | null = null;
const subs = new Set<() => void>();

export function soundEnabled() {
  return enabled;
}

export function setSound(on: boolean) {
  enabled = on;
  if (on && !ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      ctx = null;
    }
  }
  ctx?.resume?.();
  subs.forEach((f) => f());
  if (on) play('accept');
}

export function useSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => enabled,
  );
  return [on, setSound];
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'triangle', gain = 0.12) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export type Sfx = 'accept' | 'reject' | 'tick' | 'start' | 'horn' | 'finale' | Tier;

export function play(s: Sfx) {
  if (!enabled || !ctx) return;
  switch (s) {
    case 'accept':
      tone(660, 0, 0.12);
      tone(990, 0.08, 0.16);
      break;
    case 'reject':
      tone(220, 0, 0.16, 'square', 0.06);
      tone(180, 0.1, 0.18, 'square', 0.05);
      break;
    case 'tick':
      tone(1200, 0, 0.05, 'sine', 0.05);
      break;
    case 'start':
    case 'horn':
      tone(392, 0, 0.22, 'sawtooth', 0.07);
      tone(494, 0, 0.22, 'sawtooth', 0.05);
      tone(392, 0.28, 0.3, 'sawtooth', 0.07);
      tone(494, 0.28, 0.3, 'sawtooth', 0.05);
      break;
    case 'common':
      tone(523, 0, 0.18);
      break;
    case 'uncommon':
      tone(523, 0, 0.14);
      tone(659, 0.1, 0.2);
      break;
    case 'rare':
      tone(523, 0, 0.12);
      tone(659, 0.09, 0.12);
      tone(784, 0.18, 0.26);
      break;
    case 'gem':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.3, 'triangle', 0.1));
      break;
    case 'finale':
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.45, 'triangle', 0.1));
      break;
  }
}

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
