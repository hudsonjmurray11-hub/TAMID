// Socket.IO event contract shared by server and client.
import type { HostView, PlayerView, SubmitResult } from './types';

export type HostAction =
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'kick'; playerId: string }
  | { type: 'preset'; presetId: string }
  | { type: 'pack'; packId: string };

export type Ack<T = {}> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ClientToServer {
  'host:create': (ack: Ack<{ code: string; hostToken: string }>) => void;
  'host:resume': (p: { code: string; hostToken: string }, ack: Ack) => void;
  'host:action': (a: HostAction, ack: Ack) => void;
  'player:join': (p: { code: string; name: string }, ack: Ack<{ playerId: string; token: string }>) => void;
  'player:resume': (p: { code: string; playerId: string; token: string }, ack: Ack) => void;
  'player:submit': (p: { round: number; text: string }, ack: (r: SubmitResult) => void) => void;
  'player:leave': () => void;
}

export interface ServerToClient {
  'host:view': (v: HostView) => void;
  'player:view': (v: PlayerView) => void;
  /** The player was removed or the room no longer exists. */
  'session:ended': (p: { reason: 'removed' | 'room-closed' }) => void;
}

export const ERROR_TEXT: Record<string, string> = {
  'no-room': 'We can’t find that room. Check the code on the big screen.',
  'bad-token': 'This session has expired. Join again with the room code.',
  'name-empty': 'Pick a nickname first.',
  'name-taken': 'Someone already called shotgun on that name.',
  'name-blocked': 'Let’s keep it classroom-friendly. Try another name.',
  'room-full': 'This van is full (60 passengers max).',
  'game-started': 'This trip already left the station. Ask the host to restart for a new trip.',
  'not-host': 'Only the host can do that.',
  'bad-request': 'Something went wrong. Try again.',
  'rate-limited': 'Slow down a little.',
};
