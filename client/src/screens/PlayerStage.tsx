import { useEffect, useRef, useState, type FormEvent } from 'react';
import { RARITY } from '../../../content/game-content';
import type { PlayerView, SubmitResult, Tier } from '../../../shared/types';
import { buzz, play, useSound } from '../lib/sound';
import { Journey } from '../scene/Journey';
import { Dialog, Icon, Shield, Stamp, TierTag, Timer, Wordmark, useMediaQuery, useRemaining } from '../ui/kit';
import { Competencies, Crew, FullAnswerList, Podium, SourcesDetails, WhyItWorks } from './Finale';
import { FactSign } from './HostStage';

interface Props {
  view: PlayerView;
  mode: 'live' | 'solo';
  submit: (text: string) => Promise<SubmitResult> | SubmitResult;
  banner?: { text: string; warn?: boolean } | null;
  onStart?: () => void;
  onNext?: () => void;
  onTogglePause?: () => void;
  onRestart?: () => void;
  onLeave?: () => void;
}

export function PlayerStage({ view, mode, submit, banner, onStart, onNext, onTogglePause, onRestart, onLeave }: Props) {
  const wide = useMediaQuery('(min-width: 900px)');
  const [sound, setSound] = useSound();
  const [dlg, setDlg] = useState<null | 'answers' | 'sources'>(null);
  const remaining = useRemaining(view.remainingMs, view.paused, view);
  const lastPhase = useRef(view.phase + view.roundIndex);
  const myTier = view.phase === 'reveal' ? view.mine?.tier ?? null : null;

  useEffect(() => {
    const key = view.phase + view.roundIndex;
    if (key === lastPhase.current) return;
    lastPhase.current = key;
    if (view.phase === 'answering') {
      play('tick');
      buzz(20);
    }
    if (view.phase === 'reveal') {
      if (view.mine?.tier) {
        play(view.mine.tier);
        buzz(view.mine.tier === 'gem' ? [40, 60, 40, 60, 120] : view.mine.tier === 'rare' ? [40, 50, 80] : 40);
      } else buzz([15, 30, 15]);
    }
    if (view.phase === 'finale') play('finale');
  }, [view.phase, view.roundIndex, view.mine?.tier]);

  const panel = (
    <>
      {view.phase === 'lobby' && <LobbyPanel view={view} mode={mode} onStart={onStart} onLeave={onLeave} />}
      {view.phase === 'answering' && <AnswerPanel view={view} submit={submit} remaining={remaining} mode={mode} />}
      {view.phase === 'reveal' && <RevealPanel view={view} remaining={remaining} mode={mode} onNext={onNext} onFull={() => setDlg('answers')} />}
      {view.phase === 'finale' && <FinalePanel view={view} mode={mode} onRestart={onRestart} onSources={() => setDlg('sources')} />}
    </>
  );

  const hud = (
    <>
      <div className="hud-left">
        {view.roundIndex >= 0 && view.phase !== 'finale' ? (
          <span className="chip">
            Stop {view.roundIndex + 1}/{view.totalRounds}
          </span>
        ) : (
          <Wordmark size={wide ? 20 : 14} />
        )}
      </div>
      <div className="hud-right">
        {mode === 'solo' && (view.phase === 'answering' || view.phase === 'reveal') ? (
          <button className="icon-btn" onClick={onTogglePause} aria-pressed={view.paused} aria-label={view.paused ? 'Resume' : 'Pause'}>
            <Icon name={view.paused ? 'play' : 'pause'} />
          </button>
        ) : null}
        <button className="icon-btn" onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? 'Sound on' : 'Sound off'}>
          <Icon name={sound ? 'soundOn' : 'soundOff'} />
        </button>
        <Shield km={view.me.total} size={wide ? 84 : 62} />
      </div>
    </>
  );

  const scene = (
    <Journey
      km={view.phase === 'finale' ? 300 : view.me.total}
      focusX={wide ? 0.68 : 0.5}
      horizon={wide ? 0.5 : 0.44}
      vanScale={wide ? 0.85 : 1.25}
      party={view.phase === 'finale'}
      celebrate={view.phase === 'reveal' ? { key: `r${view.roundIndex}`, tier: myTier } : null}
      label={`Your van: ${view.me.total} of 300 game kilometres to Tel Aviv.`}
    />
  );

  const overlays = (
    <>
      {banner ? <div className={`banner ${banner.warn ? 'warn' : ''}`}>{banner.text}</div> : null}
      {view.paused ? (
        <div className="pause-veil" role="status">
          <div className="ticket pause-card pop">
            <div className="ticket-label">Rest stop</div>
            <h2>{mode === 'solo' ? 'Trip paused' : 'Paused by the driver'}</h2>
            {mode === 'solo' ? (
              <button className="btn big" onClick={onTogglePause} autoFocus>
                <Icon name="play" /> Resume trip
              </button>
            ) : (
              <p className="muted">Hold that thought — the timer is frozen.</p>
            )}
          </div>
        </div>
      ) : null}
      <Dialog open={dlg === 'answers'} onClose={() => setDlg(null)} title={`Every accepted answer · Stop ${view.roundIndex + 1}`} wide>
        {view.reveal ? <FullAnswerList list={view.reveal.fullList} tallies={mode === 'live' ? view.reveal.tallies : undefined} mine={view.mine?.label} /> : null}
      </Dialog>
      <Dialog open={dlg === 'sources'} onClose={() => setDlg(null)} title="Sources & details" wide>
        <SourcesDetails />
      </Dialog>
    </>
  );

  if (wide) {
    return (
      <div className={`stage player wide phase-${view.phase}`}>
        {scene}
        <header className="topbar">{hud}</header>
        <aside className={`rail ${view.phase === 'finale' ? 'rail-finale' : ''}`} aria-live="polite">
          {panel}
        </aside>
        {overlays}
      </div>
    );
  }
  return (
    <div className={`phone phase-${view.phase}`}>
      <div className="phone-scene">
        {scene}
        <div className="phone-hud">{hud}</div>
      </div>
      <main className="phone-body" aria-live="polite">
        {panel}
      </main>
      {overlays}
    </div>
  );
}

function LobbyPanel({ view, mode, onStart, onLeave }: { view: PlayerView; mode: 'live' | 'solo'; onStart?: () => void; onLeave?: () => void }) {
  if (mode === 'solo') {
    return (
      <div className="stack">
        <div className="ticket">
          <div className="ticket-label">Solo road trip · 6 stops</div>
          <h1 className="phone-title">Name something. Go further.</h1>
          <p>Each stop asks for one everyday answer. Obvious answers move you a little; rare ones floor it.</p>
          <div className="tier-row">
            {(['common', 'uncommon', 'rare', 'gem'] as Tier[]).map((t) => (
              <TierTag key={t} tier={t} />
            ))}
          </div>
        </div>
        <button className="btn big block" onClick={onStart} autoFocus>
          Start driving <Icon name="play" />
        </button>
      </div>
    );
  }
  return (
    <div className="stack">
      <div className="ticket">
        <div className="ticket-label">Boarding pass · {view.roomName}</div>
        <h1 className="phone-title">You’re in, {view.me.name}!</h1>
        <p>
          Waiting for the driver to start. <b className="tabular">{view.playerCount}</b> {view.playerCount === 1 ? 'passenger' : 'passengers'} aboard.
        </p>
        <div className="perf" />
        <p className="small muted">Keep this page open. If you refresh, you’ll land back in your seat.</p>
      </div>
      <div className="tier-row">
        {(['common', 'uncommon', 'rare', 'gem'] as Tier[]).map((t) => (
          <TierTag key={t} tier={t} />
        ))}
      </div>
      {onLeave ? (
        <button className="btn small ghost-dark" onClick={onLeave}>
          Leave this trip
        </button>
      ) : null}
    </div>
  );
}

function AnswerPanel({ view, submit, remaining, mode }: { view: PlayerView; submit: Props['submit']; remaining: number | null; mode: 'live' | 'solo' }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hints, setHints] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText('');
    setMsg(null);
    setHints(false);
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
  }, [view.roundIndex]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    const res = await submit(text);
    setBusy(false);
    if (res.status === 'accepted') {
      play('accept');
      buzz(30);
      setMsg(null);
    } else if (res.status === 'unknown') {
      play('reject');
      buzz([20, 40, 20]);
      setShake((x) => x + 1);
      setMsg(res.message ?? 'Not on our map — try another!');
      inputRef.current?.select();
    } else {
      setMsg(res.message ?? 'Couldn’t lock that in.');
    }
  };

  return (
    <div className="stack answer-panel">
      <div className="ticket prompt-ticket">
        <h1 className="prompt">{view.prompt}</h1>
        <Timer remaining={remaining} total={view.phaseMs} paused={view.paused} />
      </div>
      {view.mine ? (
        <div className="locked card pop" role="status">
          <span className="lock-icon" aria-hidden="true">
            <Icon name="check" />
          </span>
          <div>
            <div className="ticket-label">Locked in</div>
            <b className="locked-label">{view.mine.label}</b>
            <div className="muted small">
              {mode === 'solo' ? 'Revealing rarity…' : `Rarity revealed when the round closes · ${view.answeredCount}/${view.playerCount} in`}
            </div>
          </div>
        </div>
      ) : (
        <form className={`answer-form ${shake ? 'shake' : ''}`} key={shake} onSubmit={onSubmit}>
          <label htmlFor="answer" className="sr-only">
            Your answer
          </label>
          <input
            id="answer"
            ref={inputRef}
            className="answer-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type one answer…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={60}
            enterKeyHint="go"
            disabled={view.paused}
            aria-describedby="answer-msg"
          />
          <button className="btn big block" type="submit" disabled={busy || !text.trim() || view.paused}>
            Lock it in
          </button>
          <div id="answer-msg" className={`answer-msg ${msg ? 'show' : ''}`} role="alert">
            {msg ?? (view.misses ? 'Try another — you can retry until time runs out.' : '')}
          </div>
          <div className="hint-row">
            {hints ? (
              <div className="hints" aria-label="Some common answers (worth +10 km)">
                {view.hints.map((h) => (
                  <button
                    type="button"
                    key={h}
                    className="hint-chip"
                    onClick={() => {
                      setText(h);
                      inputRef.current?.focus();
                    }}
                  >
                    {h}
                  </button>
                ))}
                <span className="muted small">common · +{RARITY.common.km} km</span>
              </div>
            ) : (
              <button type="button" className="link-btn" onClick={() => setHints(true)}>
                Need an idea?
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function RevealPanel({ view, remaining, mode, onNext, onFull }: { view: PlayerView; remaining: number | null; mode: 'live' | 'solo'; onNext?: () => void; onFull: () => void }) {
  const r = view.reveal!;
  const mine = view.mine;
  return (
    <div className="stack reveal-panel">
      <div className="reveal-hero">
        {mine?.tier ? (
          <Stamp tier={mine.tier} size={132} />
        ) : (
          <div className="stamp missed stamp-in" style={{ ['--st' as string]: '132px' }}>
            <div>
              <div className="s-tier">Missed exit</div>
              <div className="s-km">+0km</div>
            </div>
          </div>
        )}
        <div className="reveal-copy">
          <div className="ticket-label">Stop {view.roundIndex + 1} · {mine ? 'your answer' : 'no answer'}</div>
          <b className="reveal-answer">{mine ? mine.label : 'Nothing locked in'}</b>
          <div className="muted small">
            {mine?.tier ? RARITY[mine.tier].blurb : 'No worries — next stop is a fresh start.'}
          </div>
          <div className="row small">
            <span className="chip tabular">{view.me.total} km total</span>
            {mode === 'live' ? <span className="chip tabular">#{view.me.rank} of {view.playerCount}</span> : null}
          </div>
        </div>
      </div>
      <FactSign insight={r.insight} compact />
      <div className="row wrap">
        <button className="btn small cream" onClick={onFull}>
          <Icon name="list" /> See all answers
        </button>
        {mode === 'solo' && onNext ? (
          <button className="btn small" onClick={onNext} autoFocus>
            {view.roundIndex + 1 >= view.totalRounds ? 'Drive into Tel Aviv' : 'Next stop'} <Icon name="next" />
          </button>
        ) : null}
      </div>
      <Timer remaining={remaining} total={view.phaseMs} paused={view.paused} />
    </div>
  );
}

function FinalePanel({ view, mode, onRestart, onSources }: { view: PlayerView; mode: 'live' | 'solo'; onRestart?: () => void; onSources: () => void }) {
  const pct = Math.round((view.me.total / 300) * 100);
  return (
    <div className="stack finale-phone">
      <div className="ticket arrival">
        <div className="ticket-label">Arrived · Tel Aviv</div>
        <h1 className="phone-title">
          {view.me.total} km{mode === 'live' ? ` · #${view.me.rank}` : ''}
        </h1>
        <p>
          {view.me.accepted} of {view.totalRounds} answers accepted · {pct}% of the way on rarity alone.
          {view.me.total >= 300 ? ' Six hidden gems. Legendary.' : ''}
        </p>
      </div>
      {mode === 'live' ? <Podium standings={view.podium} compact /> : null}
      <WhyItWorks />
      <Competencies />
      <Crew />
      <div className="row wrap">
        <button className="btn small cream" onClick={onSources}>
          <Icon name="info" /> Sources &amp; details
        </button>
        {onRestart ? (
          <button className="btn small" onClick={onRestart}>
            <Icon name="restart" /> Play again
          </button>
        ) : null}
      </div>
    </div>
  );
}
