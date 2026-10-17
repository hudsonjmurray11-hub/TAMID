import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Tier } from '../../../shared/types';
import { useLocalGame } from '../lib/local';
import { errorText, useLiveHost, useLivePlayer } from '../lib/net';
import { store } from '../lib/storage';
import { Journey } from '../scene/Journey';
import { OfflineBadge, TierTag, Wordmark, useMediaQuery } from '../ui/kit';
import { HostStage } from './HostStage';
import { PlayerStage } from './PlayerStage';

// ── / Home ──────────────────────────────────────────────────
export function Home() {
  const wide = useMediaQuery('(min-width: 900px)');
  const [code, setCode] = useState('');
  const [km, setKm] = useState(30);
  const [cel, setCel] = useState<{ key: string; tier: Tier | null } | null>(null);

  // attract mode: the van keeps scoring
  useEffect(() => {
    const tiers: Tier[] = ['common', 'uncommon', 'rare', 'gem', 'uncommon', 'rare'];
    const awards: Record<Tier, number> = { common: 10, uncommon: 20, rare: 35, gem: 50 };
    let i = 0;
    const id = setInterval(() => {
      const tier = tiers[i % tiers.length];
      i++;
      setKm((k) => (k >= 260 ? 20 : k + awards[tier]));
      setCel({ key: String(i), tier });
    }, 3600);
    return () => clearInterval(id);
  }, []);

  const go = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length === 4) location.href = `/join?code=${c}`;
  };

  return (
    <div className={`stage home ${wide ? 'wide' : 'narrow'}`}>
      <Journey km={km} celebrate={cel} focusX={wide ? 0.66 : 0.5} horizon={wide ? 0.5 : 0.34} vanScale={wide ? 0.85 : 0.75} />
      <div className="home-panel">
        <Wordmark size={wide ? 44 : 32} link={false} />
        <p className="tagline">The rarer your answer, the further you go.</p>
        <div className="ticket home-ticket">
          <a className="btn big block" href="/host">
            Host a trip
          </a>
          <div className="home-row">
            <a className="btn blue" href="/play">
              Play solo
            </a>
            <a className="btn cream" href="/demo">
              Demo Mode
            </a>
          </div>
          <div className="perf" />
          <form className="join-inline" onSubmit={go}>
            <label htmlFor="code" className="ticket-label">
              Got a room code?
            </label>
            <div className="row">
              <input
                id="code"
                className="code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 4))}
                placeholder="ABCD"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                aria-label="Four-letter room code"
              />
              <button className="btn" type="submit" disabled={code.length !== 4}>
                Join
              </button>
            </div>
          </form>
        </div>
        <div className="home-foot">
          <div className="tier-row">
            {(['common', 'uncommon', 'rare', 'gem'] as Tier[]).map((t) => (
              <TierTag key={t} tier={t} />
            ))}
          </div>
          <span className="small">A TAMID Israel Connection project · Group 3</span>
        </div>
      </div>
    </div>
  );
}

// ── /host ───────────────────────────────────────────────────
function useJoinUrl(code: string | undefined) {
  const [base, setBase] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/info')
      .then((r) => r.json())
      .then((info: { publicUrl: string | null; lanUrls: string[] }) => {
        if (!alive) return;
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
        setBase(info.publicUrl || (local && info.lanUrls[0]) || location.origin);
      })
      .catch(() => alive && setBase(location.origin));
    return () => {
      alive = false;
    };
  }, []);
  return base && code ? `${base.replace(/\/$/, '')}/join?code=${code}` : null;
}

export function Host() {
  const { view, conn, error, act } = useLiveHost();
  const joinUrl = useJoinUrl(view?.code);
  if (!view) {
    return (
      <Splash
        title={conn === 'offline' ? 'Can’t reach the server' : 'Warming up the engine…'}
        body={
          conn === 'offline'
            ? 'Live rooms need the game server running (npm run play). Demo Mode works without it.'
            : error ?? 'Creating your room.'
        }
        showDemo
      />
    );
  }
  const banner =
    conn !== 'online' ? { text: 'Connection lost — reconnecting… (the room pauses while the host is away)', warn: true } : error ? { text: error, warn: true } : null;
  return <HostStage view={view} act={act} mode="live" joinUrl={joinUrl} banner={banner} />;
}

// ── /demo ───────────────────────────────────────────────────
export function Demo() {
  const { hostView, act, fresh } = useLocalGame('demo');
  if (!hostView) return null;
  return <HostStage view={hostView} act={act} mode="demo" onNewDemo={fresh} />;
}

// ── /play ───────────────────────────────────────────────────
export function Play() {
  const { playerView, act, submit, fresh } = useLocalGame('solo');
  if (!playerView) return null;
  return (
    <PlayerStage
      view={playerView}
      mode="solo"
      submit={submit}
      onStart={() => act({ type: 'start' })}
      onPack={(packId) => act({ type: 'pack', packId })}
      onNext={() => act({ type: 'next' })}
      onTogglePause={() => act({ type: playerView.paused ? 'resume' : 'pause' })}
      onRestart={fresh}
    />
  );
}

// ── /join ───────────────────────────────────────────────────
export function Join() {
  const { view, conn, notice, session, join, submit, leave } = useLivePlayer();
  const params = new URLSearchParams(location.search);
  const urlCode = (params.get('code') ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);

  // A QR code for a different room replaces an old seat.
  const dropped = useRef(false);
  useEffect(() => {
    if (!dropped.current && session && urlCode && session.code !== urlCode) {
      dropped.current = true;
      leave();
    }
  }, [session, urlCode, leave]);

  if (session && view) {
    const banner =
      conn !== 'online'
        ? { text: 'Connection lost — reconnecting…', warn: true }
        : null;
    return <PlayerStage view={view} mode="live" submit={(t) => submit(view.roundIndex, t)} banner={banner} onLeave={view.phase === 'lobby' ? leave : undefined} />;
  }
  if (session && !view) return <Splash title="Finding your seat…" body={conn === 'offline' ? 'Reconnecting to the game server…' : 'Hang tight.'} />;
  return <JoinForm initialCode={urlCode} notice={notice} join={join} />;
}

function JoinForm({ initialCode, notice, join }: { initialCode: string; notice: string | null; join: (code: string, name: string) => Promise<string | null> }) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(() => store.get<string>('nst:name') ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 4) return setErr('Room codes are four letters.');
    if (!name.trim()) return setErr(errorText('name-empty'));
    setBusy(true);
    store.set('nst:name', name.trim());
    const res = await join(code, name.trim());
    setBusy(false);
    setErr(res);
  };
  return (
    <div className="phone join-page">
      <div className="phone-scene short">
        <Journey km={40} horizon={0.46} vanScale={1.1} />
        <div className="phone-hud">
          <div className="hud-left">
            <Wordmark size={15} />
          </div>
        </div>
      </div>
      <main className="phone-body">
        <form className="ticket stack join-ticket" onSubmit={submit}>
          <div className="ticket-label">Boarding pass</div>
          <h1 className="phone-title">Hop in the van</h1>
          {notice ? <p className="answer-msg show">{notice}</p> : null}
          <label className="field">
            <span className="ticket-label">Room code</span>
            <input
              className="code-input big"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 4))}
              placeholder="ABCD"
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              required
            />
          </label>
          <label className="field">
            <span className="ticket-label">Nickname</span>
            <input
              className="answer-input"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 18))}
              placeholder="e.g. Captain Sunscreen"
              autoComplete="nickname"
              maxLength={18}
              required
              autoFocus={!!initialCode}
            />
          </label>
          <button className="btn big block" type="submit" disabled={busy}>
            {busy ? 'Boarding…' : 'Hop in'}
          </button>
          <div className={`answer-msg ${err ? 'show' : ''}`} role="alert">
            {err}
          </div>
        </form>
        <p className="small center muted-light">
          No room? <a href="/play">Play solo</a> or <a href="/">go home</a>.
        </p>
      </main>
    </div>
  );
}

function Splash({ title, body, showDemo }: { title: string; body: string; showDemo?: boolean }) {
  return (
    <div className="stage splash">
      <Journey km={0} horizon={0.5} vanScale={0.8} />
      <div className="splash-card ticket pop" role="status">
        <Wordmark size={24} link={false} />
        <h1>{title}</h1>
        <p>{body}</p>
        <div className="row wrap">
          {showDemo ? (
            <a className="btn" href="/demo">
              Open Demo Mode
            </a>
          ) : null}
          <a className="btn cream" href="/">
            Home
          </a>
          {showDemo ? <OfflineBadge /> : null}
        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return <Splash title="Wrong turn" body="That road doesn’t exist. Let’s get you back on the highway." showDemo />;
}
