import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PACKS, RARITY } from '../../../content/game-content';
import type { Tier } from '../../../shared/types';

export function Wordmark({ size = 22, link = true }: { size?: number; link?: boolean }) {
  const inner = (
    <>
      <span className="wm-script" aria-hidden="true">
        Next Stop:
      </span>
      <span className="wm-sign" aria-hidden="true">
        TEL AVIV <small>תל אביב</small>
      </span>
      <span className="sr-only">Next Stop: Tel Aviv</span>
    </>
  );
  const style = { ['--wm-size' as string]: `${size}px` };
  return link ? (
    <a className="wordmark" href="/" style={style} aria-label="Next Stop: Tel Aviv — home">
      {inner}
    </a>
  ) : (
    <div className="wordmark" style={style}>
      {inner}
    </div>
  );
}

/** Choose which question set to play (lobby only). */
export function RoutePicker({ value, onChange }: { value: string; onChange: (packId: string) => void }) {
  return (
    <fieldset className="routes">
      <legend className="ticket-label">Choose your route</legend>
      <div className="route-options" role="radiogroup">
        {PACKS.map((p) => {
          const on = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`route ${on ? 'on' : ''}`}
              onClick={(e) => {
                onChange(p.id);
                if (e.detail > 0) e.currentTarget.blur();
              }}
            >
              <span className="route-name">
                {on ? <Icon name="check" /> : null}
                {p.name}
              </span>
              <span className="route-blurb">{p.blurb}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Highway-shield distance badge. */
export function Shield({ km, size = 92, label = 'KM' }: { km: number; size?: number; label?: string }) {
  return (
    <div className="shield" style={{ ['--sh' as string]: `${size}px` }} role="img" aria-label={`${km} kilometres`}>
      <svg viewBox="0 0 100 108" aria-hidden="true">
        <path d="M50 4 C64 12 80 12 94 6 C98 40 94 76 50 104 C6 76 2 40 6 6 C20 12 36 12 50 4 Z" fill="#13213F" stroke="#0B1530" strokeWidth="4" />
        <path d="M50 11 C62 17 76 18 88 13 C90 42 86 70 50 95 C14 70 10 42 12 13 C24 18 38 17 50 11 Z" fill="none" stroke="#FFF6E3" strokeWidth="3" />
        <path d="M14 26 H86" stroke="#FFC93C" strokeWidth="9" />
      </svg>
      <span className="unit">{label}</span>
      <span className="num tabular">{km}</span>
    </div>
  );
}

export function TierTag({ tier, km = true }: { tier: Tier; km?: boolean }) {
  const r = RARITY[tier];
  return (
    <span className={`tier tier-${tier}`}>
      <span className="sym" aria-hidden="true">
        {r.symbol}
      </span>
      {r.label}
      {km ? <span className="tabular"> +{r.km}</span> : null}
    </span>
  );
}

export function Stamp({ tier, size = 200, animate = true }: { tier: Tier; size?: number; animate?: boolean }) {
  const r = RARITY[tier];
  return (
    <div
      className={`stamp ${tier} ${animate ? 'stamp-in' : ''}`}
      style={{ ['--st' as string]: `${size}px` }}
      role="img"
      aria-label={`${r.label}: plus ${r.km} kilometres`}
    >
      <div>
        <div className="s-sym" aria-hidden="true">
          {r.symbol}
        </div>
        <div className="s-tier">{r.label}</div>
        <div className="s-km tabular">+{r.km}km</div>
      </div>
    </div>
  );
}

/** Remaining ms that keeps counting down between server updates. */
export function useRemaining(ms: number | null, paused: boolean, key: unknown): number | null {
  const base = useMemo(() => ({ ms, at: performance.now() }), [key, ms]);
  const [, force] = useState(0);
  useEffect(() => {
    if (ms === null || paused) return;
    const id = setInterval(() => force((x) => x + 1), 200);
    return () => clearInterval(id);
  }, [ms, paused, key]);
  if (base.ms === null) return null;
  if (paused) return base.ms;
  return Math.max(0, base.ms - (performance.now() - base.at));
}

export function Timer({ remaining, total, paused }: { remaining: number | null; total: number | null; paused?: boolean }) {
  if (remaining === null || !total) return null;
  const secs = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  return (
    <div className={`timer ${secs <= 5 ? 'low' : ''}`} role="timer" aria-label={paused ? `Paused with ${secs} seconds left` : `${secs} seconds left`}>
      <div className="timer-track" aria-hidden="true">
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="timer-num tabular" aria-hidden="true">
        {paused ? '❚❚' : secs}
      </div>
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dlg"
      style={wide ? { width: 'min(980px, calc(100vw - 32px))' } : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      {open ? (
        <>
          <div className="dlg-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          <div className="dlg-body">{children}</div>
        </>
      ) : null}
    </dialog>
  );
}

const PATHS: Record<string, ReactNode> = {
  x: <path d="M6 6l12 12M18 6L6 18" />,
  soundOn: (
    <>
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11" />
    </>
  ),
  soundOff: (
    <>
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M17 10l4 4M21 10l-4 4" />
    </>
  ),
  full: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="M7 5l12 7-12 7z" />,
  next: <path d="M5 5l9 7-9 7zM18 5v14" />,
  restart: <path d="M4 12a8 8 0 108-8H8M8 4L5 7l3 3" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.8c2 .8 3.2 2.6 3.6 5.2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.7-2.5 2-2.5 4M12 17.5v.5" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  wifiOff: <path d="M3 3l18 18M8.5 16.5a5 5 0 017 0M5 12.5a10 10 0 015.5-2.8M19 12.5a10 10 0 00-3-2M2 8.8a15 15 0 015.2-3M22 8.8a15 15 0 00-10-3.8M12 20h.01" />,
};

export function Icon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/** Shows "Offline ready" only after the service worker confirms the cache. */
export function OfflineBadge({ dark }: { dark?: boolean }) {
  const [state, setState] = useState<'checking' | 'ready' | 'unsupported' | 'not-ready' | 'failed'>('checking');
  useEffect(() => {
    let alive = true;
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      setState('unsupported');
      return;
    }
    const ask = async () => {
      if ((window as unknown as { __swFailed?: boolean }).__swFailed) return alive && setState('failed');
      try {
        const reg = await navigator.serviceWorker.ready;
        const sw = reg.active;
        if (!sw) return;
        const ch = new MessageChannel();
        ch.port1.onmessage = (e) => alive && setState(e.data?.ready ? 'ready' : 'not-ready');
        sw.postMessage({ type: 'status' }, [ch.port2]);
      } catch {
        /* ignore */
      }
    };
    ask();
    const id = setInterval(ask, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  if (state === 'ready')
    return (
      <span className={`chip ${dark ? 'dark' : ''}`} title="This page and the demo are cached on this device and will reload without internet or a server.">
        <span style={{ color: 'var(--palm)', display: 'inline-flex', width: 16 }}>
          <Icon name="check" />
        </span>
        Offline ready
      </span>
    );
  if (state === 'failed')
    return (
      <span className={`chip ${dark ? 'dark' : ''}`} title="This browser blocked the offline cache. Use Chrome, Edge or Safari on localhost or https.">
        Offline cache unavailable here
      </span>
    );
  if (state === 'checking' || state === 'not-ready')
    return <span className={`chip ${dark ? 'dark' : ''}`} title="Caching the app for offline use…">Caching for offline…</span>;
  return null;
}

export function useReducedMotion(): boolean {
  const [r, setR] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setR(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return r;
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}
