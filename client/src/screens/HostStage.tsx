import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { RARITY } from '../../../content/game-content';
import { TIMING_PRESETS, presetTotalMs } from '../../../content/timing';
import type { HostAction } from '../../../shared/protocol';
import type { HostView, Insight, Tier } from '../../../shared/types';
import { play, useSound } from '../lib/sound';
import { Journey } from '../scene/Journey';
import { Dialog, Icon, OfflineBadge, Shield, Stamp, TierTag, Timer, Wordmark, useMediaQuery, useRemaining } from '../ui/kit';
import { Competencies, Crew, FullAnswerList, Podium, SourcesDetails, WhyItWorks } from './Finale';

interface Props {
  view: HostView;
  act: (a: HostAction) => void;
  mode: 'live' | 'demo';
  joinUrl?: string | null;
  banner?: { text: string; warn?: boolean } | null;
  onNewDemo?: () => void;
}

const FINALE_TABS = ['Podium', 'Why it works', 'Competencies', 'Crew'] as const;

export function HostStage({ view, act, mode, joinUrl, banner, onNewDemo }: Props) {
  const wide = useMediaQuery('(min-width: 900px)');
  const [sound, setSound] = useSound();
  const [dlg, setDlg] = useState<null | 'help' | 'restart' | 'players' | 'answers' | 'sources'>(null);
  const [finaleTab, setFinaleTab] = useState(0);
  const remaining = useRemaining(view.remainingMs, view.paused, view);
  const lastPhase = useRef(view.phase + view.roundIndex);

  // sounds on phase changes
  useEffect(() => {
    const key = view.phase + view.roundIndex;
    if (key === lastPhase.current) return;
    lastPhase.current = key;
    if (view.phase === 'answering') play('start');
    if (view.phase === 'reveal' && view.reveal?.bestTier) play(view.reveal.bestTier);
    if (view.phase === 'finale') {
      play('finale');
      setFinaleTab(0);
    }
  }, [view.phase, view.roundIndex, view.reveal?.bestTier]);

  // podium first, then the answer to the assignment question
  useEffect(() => {
    if (view.phase !== 'finale') return;
    const t = setTimeout(() => setFinaleTab((x) => (x === 0 ? 1 : x)), 9000);
    return () => clearTimeout(t);
  }, [view.phase]);

  const primary = (): { label: string; run: () => void } | null => {
    switch (view.phase) {
      case 'lobby':
        return { label: mode === 'demo' ? 'Start the demo trip' : 'Start the trip', run: () => act({ type: 'start' }) };
      case 'answering':
        return { label: 'Reveal now', run: () => act({ type: 'next' }) };
      case 'reveal':
        return { label: view.roundIndex + 1 >= view.totalRounds ? 'Drive into Tel Aviv' : 'Next stop', run: () => act({ type: 'next' }) };
      case 'finale':
        return { label: `Next: ${FINALE_TABS[(finaleTab + 1) % FINALE_TABS.length]}`, run: () => setFinaleTab((x) => (x + 1) % FINALE_TABS.length) };
    }
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (document.querySelector('dialog[open]')) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const onControl = !!t?.closest('button, a, summary');
      if (e.key === ' ' || e.code === 'Space') {
        if (onControl) return; // let the focused control handle Space
        e.preventDefault();
        primary()?.run();
      } else if (e.key === 'p' || e.key === 'P') {
        act({ type: view.paused ? 'resume' : 'pause' });
      } else if (e.key === 'r' || e.key === 'R') {
        setDlg('restart');
      } else if (e.key === '?') {
        setDlg('help');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const blurAfterClick = (run: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    run();
    if (e.detail > 0) e.currentTarget.blur();
  };

  const p = primary();
  const canPause = view.phase === 'answering' || view.phase === 'reveal';
  const celebrateTier: Tier | null = view.phase === 'reveal' ? view.leaderLastAward?.tier ?? view.reveal?.bestTier ?? null : null;

  return (
    <div className={`stage host ${wide ? 'wide' : 'narrow'} phase-${view.phase}`}>
      <Journey
        km={view.phase === 'finale' ? 300 : view.leaderKm}
        focusX={wide ? 0.68 : 0.5}
        horizon={wide ? 0.5 : 0.36}
        vanScale={wide ? 0.82 : 0.7}
        party={view.phase === 'finale'}
        celebrate={view.phase === 'reveal' ? { key: `r${view.roundIndex}`, tier: celebrateTier } : null}
        label={`Leader's van: ${view.leaderKm} of 300 game kilometres to Tel Aviv.`}
      />

      <header className="topbar">
        <div className="group">
          <Wordmark size={wide ? 20 : 15} />
          {wide ? <span className="chip dark">{view.roomName}</span> : null}
          {mode === 'demo' ? <span className="chip demo">DEMO · simulated passengers</span> : null}
        </div>
        <div className="group">
          {mode === 'demo' ? <OfflineBadge dark /> : wide ? <a className="chip" href="/demo">Demo Mode</a> : null}
          <button className="icon-btn" onClick={() => setDlg('players')} aria-label={`Passengers (${view.playerCount})`} title="Passengers">
            <Icon name="users" />
          </button>
          <button
            className="icon-btn"
            onClick={blurAfterClick(() => act({ type: view.paused ? 'resume' : 'pause' }))}
            disabled={!canPause}
            aria-pressed={view.paused}
            aria-label={view.paused ? 'Resume (P)' : 'Pause (P)'}
            title={view.paused ? 'Resume (P)' : 'Pause (P)'}
          >
            <Icon name={view.paused ? 'play' : 'pause'} />
          </button>
          <button className="icon-btn" onClick={() => setDlg('restart')} aria-label="Restart (R)" title="Restart (R)">
            <Icon name="restart" />
          </button>
          <button className="icon-btn" onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? 'Sound on' : 'Sound off'} title="Sound">
            <Icon name={sound ? 'soundOn' : 'soundOff'} />
          </button>
          {wide ? (
            <button
              className="icon-btn"
              onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}
              aria-label="Fullscreen"
              title="Fullscreen"
            >
              <Icon name="full" />
            </button>
          ) : null}
          <button className="icon-btn" onClick={() => setDlg('help')} aria-label="Keyboard shortcuts (?)" title="Shortcuts (?)">
            <Icon name="help" />
          </button>
        </div>
      </header>

      {banner ? <div className={`banner ${banner.warn ? 'warn' : ''}`}>{banner.text}</div> : null}

      <aside className={`rail ${view.phase === 'finale' ? 'rail-finale' : ''}`} aria-live="polite">
        {view.phase === 'lobby' && <LobbyPanel view={view} act={act} joinUrl={joinUrl} mode={mode} />}
        {view.phase === 'answering' && <AnsweringPanel view={view} remaining={remaining} />}
        {view.phase === 'reveal' && <RevealPanel view={view} remaining={remaining} onFull={() => setDlg('answers')} />}
        {view.phase === 'finale' && (
          <div className="finale-panel">
            <div className="tabs" role="tablist" aria-label="Finale">
              {FINALE_TABS.map((t, i) => (
                <button key={t} role="tab" aria-selected={finaleTab === i} className={finaleTab === i ? 'on' : ''} onClick={() => setFinaleTab(i)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="tab-body" key={finaleTab}>
              {finaleTab === 0 && (
                <>
                  <h1 className="arrived">Last stop: Tel Aviv!</h1>
                  <Podium standings={view.standings} demo={mode === 'demo'} />
                </>
              )}
              {finaleTab === 1 && <WhyItWorks />}
              {finaleTab === 2 && <Competencies />}
              {finaleTab === 3 && <Crew />}
            </div>
            <div className="row wrap">
              <button className="btn small cream" onClick={() => setDlg('sources')}>
                <Icon name="info" /> Sources &amp; details
              </button>
              <button className="btn small blue" onClick={() => setDlg('restart')}>
                <Icon name="restart" /> New trip
              </button>
            </div>
          </div>
        )}
        {p && view.phase !== 'finale' ? (
          <button className="btn big block primary-cta" onClick={blurAfterClick(p.run)} disabled={view.phase === 'lobby' && view.playerCount === 0}>
            {p.label} <kbd>Space</kbd>
          </button>
        ) : null}
      </aside>

      {view.phase !== 'lobby' && view.phase !== 'finale' && wide && view.leaderKm > 0 ? <Leaders view={view} /> : null}

      {view.phase === 'reveal' && view.reveal?.bestTier && wide ? (
        <div className="best-find">
          <Stamp tier={view.reveal.bestTier} size={150} />
          <div className="best-label">
            <span className="ticket-label">Best find this stop</span>
            <b>{view.reveal.tallies[0]?.label}</b>
          </div>
        </div>
      ) : null}

      {view.paused ? (
        <div className="pause-veil" role="status">
          <div className="ticket pause-card pop">
            <div className="ticket-label">Rest stop</div>
            <h2>Trip paused</h2>
            <button className="btn big" onClick={blurAfterClick(() => act({ type: 'resume' }))}>
              <Icon name="play" /> Resume <kbd>P</kbd>
            </button>
          </div>
        </div>
      ) : null}

      <Dialog open={dlg === 'help'} onClose={() => setDlg(null)} title="Driver’s controls">
        <dl className="keys">
          <dt><kbd>Space</kbd></dt><dd>Start · reveal now · next stop · next finale panel</dd>
          <dt><kbd>P</kbd></dt><dd>Pause / resume the timer</dd>
          <dt><kbd>R</kbd></dt><dd>Restart (asks first; keeps passengers, clears scores)</dd>
          <dt><kbd>?</kbd></dt><dd>This help</dd>
        </dl>
        <p className="muted">Shortcuts are ignored while you type or have a dialog open. Answer and reveal timers advance on their own.</p>
      </Dialog>

      <Dialog open={dlg === 'restart'} onClose={() => setDlg(null)} title="Restart the trip?">
        <p>Scores clear and everyone goes back to the boarding gate. Passengers stay aboard{mode === 'live' ? ', and new players can join again' : ''}.</p>
        <div className="row wrap">
          <button className="btn cream" onClick={() => setDlg(null)}>Keep driving</button>
          <button
            className="btn coral"
            onClick={() => {
              act({ type: 'restart' });
              setDlg(null);
            }}
          >
            Restart trip
          </button>
          {mode === 'demo' && onNewDemo ? (
            <button
              className="btn blue"
              onClick={() => {
                onNewDemo();
                setDlg(null);
              }}
            >
              New demo passengers
            </button>
          ) : null}
        </div>
      </Dialog>

      <Dialog open={dlg === 'players'} onClose={() => setDlg(null)} title={`Passengers · ${view.playerCount}/${view.maxPlayers}`}>
        <PassengerList view={view} act={act} />
      </Dialog>

      <Dialog open={dlg === 'answers'} onClose={() => setDlg(null)} title={`Every accepted answer · Stop ${view.roundIndex + 1}`} wide>
        {view.reveal ? <FullAnswerList list={view.reveal.fullList} tallies={view.reveal.tallies} /> : null}
      </Dialog>

      <Dialog open={dlg === 'sources'} onClose={() => setDlg(null)} title="Sources & details" wide>
        <SourcesDetails />
      </Dialog>
    </div>
  );
}

function LobbyPanel({ view, act, joinUrl, mode }: { view: HostView; act: (a: HostAction) => void; joinUrl?: string | null; mode: 'live' | 'demo' }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toString(joinUrl, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#13213F', light: '#FFF6E3' } }).then(setSvg);
  }, [joinUrl]);
  const shortUrl = joinUrl ? joinUrl.replace(/^https?:\/\//, '').replace(/\?code=.*/, '') : '';
  return (
    <>
      <div className="ticket boarding">
        <div className="spread">
          <span className="ticket-label">Boarding pass</span>
          <span className="ticket-label">{view.roomName}</span>
        </div>
        {mode === 'live' ? (
          <div className="board-main">
            <div className="qr" aria-label={`QR code for ${joinUrl}`} role="img" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="board-info">
              <div className="ticket-label">Scan, or go to</div>
              <div className="join-url">{shortUrl}</div>
              <div className="ticket-label">Room code</div>
              <div className="room-code tabular" aria-label={`Room code ${view.code.split('').join(' ')}`}>
                {view.code}
              </div>
            </div>
          </div>
        ) : (
          <div className="board-demo">
            <h1>Demo Mode</h1>
            <p>25 simulated passengers answer on their own — no phones, server or internet needed once this page has loaded. Scores are not real audience results.</p>
          </div>
        )}
        <div className="perf" />
        <div className="spread wrap">
          <b className="aboard tabular">
            {view.playerCount} {view.playerCount === 1 ? 'passenger' : 'passengers'} aboard
          </b>
          <label className="preset">
            <span className="sr-only">Game length</span>
            <select value={view.presetId} onChange={(e) => act({ type: 'preset', presetId: e.target.value })}>
              {TIMING_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {Math.round(presetTotalMs(p) / 1000)}s
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="card seats" aria-label="Passengers">
        {view.players.length === 0 ? (
          <p className="muted">Waiting for the first passenger… (phones join at the address above)</p>
        ) : (
          <ul className="name-chips">
            {view.players.map((pl) => (
              <li key={pl.id} className={`name-chip pop ${pl.connected ? '' : 'away'}`}>
                {pl.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="rules-intro">Everyone answers the same prompt. Rarer answers drive further:</p>
      <p className="rules">
        {(['common', 'uncommon', 'rare', 'gem'] as Tier[]).map((t) => (
          <TierTag key={t} tier={t} />
        ))}
      </p>
    </>
  );
}

function AnsweringPanel({ view, remaining }: { view: HostView; remaining: number | null }) {
  return (
    <>
      <div className="ticket prompt-ticket">
        <div className="spread">
          <span className="ticket-label">
            Stop {view.roundIndex + 1} of {view.totalRounds}
          </span>
          <span className="ticket-label tabular">
            {view.answeredCount}/{view.playerCount} locked in
          </span>
        </div>
        <h1 className="prompt" key={view.roundIndex}>
          {view.prompt}
        </h1>
        <Timer remaining={remaining} total={view.phaseMs} paused={view.paused} />
      </div>
      <div className="card seatmap">
        <div className="spread">
          <b>Seat map</b>
          <span className="muted small">Answers stay secret until the round closes</span>
        </div>
        <ul className="seats-grid" aria-label={`${view.answeredCount} of ${view.playerCount} passengers have locked in`}>
          {view.players.map((pl) => (
            <li key={pl.id} className={`seat ${pl.answered ? 'in' : ''} ${pl.connected ? '' : 'away'}`} title={pl.name}>
              <span className="sr-only">
                {pl.name} {pl.answered ? 'locked in' : 'thinking'}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="rules">
        {(['common', 'uncommon', 'rare', 'gem'] as Tier[]).map((t) => (
          <TierTag key={t} tier={t} />
        ))}
      </p>
    </>
  );
}

function RevealPanel({ view, remaining, onFull }: { view: HostView; remaining: number | null; onFull: () => void }) {
  const r = view.reveal!;
  const MAX = 6;
  const maxCount = Math.max(1, ...r.tallies.map((t) => t.count));
  return (
    <>
      <div className="ticket prompt-ticket small-prompt">
        <div className="spread">
          <span className="ticket-label">
            Stop {view.roundIndex + 1} of {view.totalRounds} · revealed
          </span>
          <span className="ticket-label tabular">{r.missed ? `${r.missed} missed the exit` : 'Everyone answered'}</span>
        </div>
        <h2 className="prompt">{view.prompt}</h2>
        <Timer remaining={remaining} total={view.phaseMs} paused={view.paused} />
      </div>
      <div className="card tallies">
        <div className="spread">
          <b>What the class said</b>
          <button className="btn small cream" onClick={onFull}>
            <Icon name="list" /> All {r.fullList.length} answers
          </button>
        </div>
        {r.tallies.length === 0 ? (
          <p className="muted">Nobody found an answer this stop. The van idles.</p>
        ) : (
          <ul className="tally-list">
            {r.tallies.slice(0, MAX).map((t, i) => (
              <li key={t.answerId} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <TierTag tier={t.tier} km={false} />
                <span className="t-label">{t.label}</span>
                <span className="t-bar" aria-hidden="true">
                  <span style={{ width: `${(t.count / maxCount) * 100}%` }} />
                </span>
                <span className="t-count tabular">×{t.count}</span>
                <span className="t-km tabular">+{RARITY[t.tier].km}</span>
              </li>
            ))}
          </ul>
        )}
        {r.tallies.length > MAX ? <div className="muted small">+{r.tallies.length - MAX} more answers in the full list</div> : null}
      </div>
      <FactSign insight={r.insight} />
    </>
  );
}

export function FactSign({ insight, compact }: { insight: Insight; compact?: boolean }) {
  return (
    <div className={`sign brown fact fade-up ${compact ? 'compact' : ''}`}>
      <div className="eyebrow">
        <span className="fact-pin" aria-hidden="true">
          ✶
        </span>{' '}
        Roadside fact · Israel
      </div>
      <b className="fact-head">{insight.headline}</b>
      <p>{insight.text}</p>
      <div className="fact-src">
        Source:{' '}
        <a href={insight.sources[0].url} target="_blank" rel="noreferrer">
          {insight.sources[0].label}
        </a>
      </div>
    </div>
  );
}

function Leaders({ view }: { view: HostView }) {
  return (
    <aside className="leaders card" aria-label="Leaderboard">
      <div className="ticket-label">Leaderboard</div>
      <ol>
        {view.standings.slice(0, 5).map((s) => (
          <li key={s.id}>
            <span className="rk tabular">{s.rank}</span>
            <span className="nm">{s.name}</span>
            <span className="km tabular">{s.total}</span>
          </li>
        ))}
      </ol>
      {view.standings[0] ? (
        <div className="lead-shield">
          <Shield km={view.leaderKm} size={58} />
          <span className="muted small">
            leader’s van
            <br />
            of 300 km
          </span>
        </div>
      ) : null}
    </aside>
  );
}

function PassengerList({ view, act }: { view: HostView; act: (a: HostAction) => void }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  if (view.players.length === 0) return <p className="muted">No passengers yet.</p>;
  return (
    <ul className="plist">
      {view.players.map((pl) => (
        <li key={pl.id}>
          <span className={`dot ${pl.connected ? 'on' : ''}`} aria-hidden="true" />
          <span className="nm">{pl.name}</span>
          <span className="muted small">{pl.connected ? 'online' : 'offline'}</span>
          <span className="tabular">{pl.total} km</span>
          {confirm === pl.id ? (
            <button
              className="btn small coral"
              onClick={() => {
                act({ type: 'kick', playerId: pl.id });
                setConfirm(null);
              }}
            >
              Confirm remove
            </button>
          ) : (
            <button className="btn small cream" onClick={() => setConfirm(pl.id)} aria-label={`Remove ${pl.name}`}>
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
