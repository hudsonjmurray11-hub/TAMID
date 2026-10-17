// Live multiplayer client: host + player hooks with refresh/reconnect recovery.
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ERROR_TEXT, type ClientToServer, type HostAction, type ServerToClient } from '../../../shared/protocol';
import type { HostView, PlayerView, SubmitResult } from '../../../shared/types';
import { store } from './storage';

type Sock = Socket<ServerToClient, ClientToServer>;
let socket: Sock | null = null;

export function getSocket(): Sock {
  if (!socket) socket = io({ transports: ['websocket', 'polling'], reconnectionDelay: 600, reconnectionDelayMax: 3000 });
  return socket;
}

export type Conn = 'connecting' | 'online' | 'offline';

function useConn(s: Sock): Conn {
  const [conn, setConn] = useState<Conn>(s.connected ? 'online' : 'connecting');
  useEffect(() => {
    const on = () => setConn('online');
    const off = () => setConn('offline');
    s.on('connect', on);
    s.on('disconnect', off);
    s.io.on('reconnect_attempt', off);
    return () => {
      s.off('connect', on);
      s.off('disconnect', off);
      s.io.off('reconnect_attempt', off);
    };
  }, [s]);
  return conn;
}

export const errorText = (code: string) => ERROR_TEXT[code] ?? ERROR_TEXT['bad-request'];

// ── host ────────────────────────────────────────────────────
interface HostSession {
  code: string;
  hostToken: string;
}

export function useLiveHost() {
  const s = getSocket();
  const conn = useConn(s);
  const [view, setView] = useState<HostView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<HostSession | null>(store.get<HostSession>('nst:host'));

  const create = useCallback(() => {
    s.emit('host:create', (res) => {
      if (!res.ok) return setError(errorText(res.error));
      sessionRef.current = { code: res.code, hostToken: res.hostToken };
      store.set('nst:host', sessionRef.current);
      setError(null);
    });
  }, [s]);

  const attach = useCallback(() => {
    const sess = sessionRef.current;
    if (!sess) return create();
    s.emit('host:resume', sess, (res) => {
      if (res.ok) return setError(null);
      // Room is gone (server restarted) or token expired: start a fresh trip.
      store.del('nst:host');
      sessionRef.current = null;
      create();
    });
  }, [s, create]);

  useEffect(() => {
    const onView = (v: HostView) => setView(v);
    s.on('host:view', onView);
    s.on('connect', attach);
    if (s.connected) attach();
    return () => {
      s.off('host:view', onView);
      s.off('connect', attach);
    };
  }, [s, attach]);

  const act = useCallback(
    (a: HostAction) => {
      s.emit('host:action', a, (res) => {
        if (!res.ok) setError(errorText(res.error));
      });
    },
    [s],
  );

  const newRoom = useCallback(() => {
    store.del('nst:host');
    sessionRef.current = null;
    s.disconnect().connect();
  }, [s]);

  return { view, conn, error, act, newRoom };
}

// ── player ──────────────────────────────────────────────────
interface PlayerSession {
  code: string;
  playerId: string;
  token: string;
  name: string;
}

export function useLivePlayer() {
  const s = getSocket();
  const conn = useConn(s);
  const [view, setView] = useState<PlayerView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(() => store.get<PlayerSession>('nst:player'));
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const resume = useCallback(() => {
    const sess = sessionRef.current;
    if (!sess) return;
    s.emit('player:resume', { code: sess.code, playerId: sess.playerId, token: sess.token }, (res) => {
      if (res.ok) return setNotice(null);
      store.del('nst:player');
      setSession(null);
      setView(null);
      setNotice(errorText(res.error));
    });
  }, [s]);

  useEffect(() => {
    const onView = (v: PlayerView) => setView(v);
    const onEnded = (p: { reason: string }) => {
      store.del('nst:player');
      setSession(null);
      setView(null);
      setNotice(p.reason === 'removed' ? 'The host removed you from this trip.' : 'This trip has ended.');
    };
    s.on('player:view', onView);
    s.on('session:ended', onEnded);
    s.on('connect', resume);
    if (s.connected) resume();
    return () => {
      s.off('player:view', onView);
      s.off('session:ended', onEnded);
      s.off('connect', resume);
    };
  }, [s, resume]);

  const join = useCallback(
    (code: string, name: string) =>
      new Promise<string | null>((resolve) => {
        const doJoin = () =>
          s.emit('player:join', { code: code.toUpperCase(), name }, (res) => {
            if (!res.ok) return resolve(errorText(res.error));
            const sess = { code: code.toUpperCase(), playerId: res.playerId, token: res.token, name };
            store.set('nst:player', sess);
            setSession(sess);
            setNotice(null);
            resolve(null);
          });
        if (s.connected) doJoin();
        else {
          s.once('connect', doJoin);
          s.connect();
        }
      }),
    [s],
  );

  const submit = useCallback(
    (round: number, text: string) =>
      new Promise<SubmitResult>((resolve) => {
        if (!s.connected) return resolve({ status: 'invalid', message: 'You’re offline — reconnecting…' });
        const t = setTimeout(() => resolve({ status: 'invalid', message: 'No answer from the server. Try again.' }), 6000);
        s.emit('player:submit', { round, text }, (r) => {
          clearTimeout(t);
          resolve(r);
        });
      }),
    [s],
  );

  const leave = useCallback(() => {
    s.emit('player:leave');
    store.del('nst:player');
    setSession(null);
    setView(null);
  }, [s]);

  return { view, conn, notice, session, join, submit, leave };
}
