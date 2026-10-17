import { COMPETENCIES, ECOSYSTEM_CAVEAT, FACTORS, GAME, ROUNDS, TEAM_ROLES } from '../../../content/game-content';
import type { FullAnswer, Standing, Tally } from '../../../shared/types';
import { Shield, TierTag } from '../ui/kit';

export function Podium({ standings, demo, compact }: { standings: Standing[]; demo?: boolean; compact?: boolean }) {
  const [first, ...rest] = standings;
  if (!first) return <p className="muted">Nobody made the trip this time.</p>;
  return (
    <div className="podium">
      <div className="winner-tag pop">
        <div className="tag-hole" aria-hidden="true" />
        <div>
          <div className="ticket-label">{demo ? 'Simulated winner' : 'Farthest traveller'}</div>
          <div className="winner-name">{first.name}</div>
          <div className="muted small">
            {first.accepted} answers · {(first.responseMs / 1000).toFixed(1)}s total answer time
          </div>
        </div>
        <Shield km={first.total} size={compact ? 70 : 96} />
      </div>
      <ol className="runners" start={2}>
        {rest.slice(0, compact ? 2 : 6).map((s) => (
          <li key={s.id} className="fade-up">
            <span className="rk tabular">#{s.rank}</span>
            <span className="nm">{s.name}</span>
            <span className="km tabular">{s.total} km</span>
          </li>
        ))}
      </ol>
      {demo ? <p className="note">Demo Mode: simulated passengers, not real audience results.</p> : null}
    </div>
  );
}

export function WhyItWorks() {
  return (
    <div className="why">
      <h2 className="why-q">{GAME.question}</h2>
      <ol className="exits">
        {FACTORS.map((f, i) => (
          <li key={f.id} className="exit sign green fade-up" style={{ animationDelay: `${i * 90}ms` }}>
            <span className="exit-no" aria-hidden="true">
              EXIT {i + 1}
            </span>
            <div>
              <b>{f.title}</b>
              <span className="exit-short">{f.short}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="caveat">{ECOSYSTEM_CAVEAT}</p>
    </div>
  );
}

export function Competencies() {
  return (
    <div className="comps">
      <h2 className="why-q">TAMID competencies on this trip</h2>
      {COMPETENCIES.map((c) => (
        <div key={c.id} className="comp card fade-up">
          <b>{c.title}</b>
          <span className="muted">{c.definition}</span>
          <span className="comp-where">
            <span className="eyebrow">In the game</span> {c.whereInGame}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Crew() {
  return (
    <div className="crew">
      <h2 className="why-q">Your crew · Group 3</h2>
      <div className="crew-grid">
        {TEAM_ROLES.map((t) => (
          <div key={t.role} className="crew-tag fade-up">
            <span className="ticket-label">{t.role}</span>
            <b>{t.name}</b>
            <span className="muted small">{t.owns}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SourcesDetails() {
  return (
    <div className="sources">
      <p className="muted">
        Distances are game points, not geography. Rarity tiers are a designer-assigned ranking of how obvious an answer feels — not survey data.
      </p>
      <h3>Five factors</h3>
      {FACTORS.map((f) => (
        <section key={f.id}>
          <b>{f.title}</b>
          <p>{f.detail}</p>
          <ul>
            {f.sources.map((s) => (
              <li key={s.url} className="src">
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <h3>Roadside facts</h3>
      {ROUNDS.map((r, i) => (
        <section key={r.id}>
          <b>
            Stop {i + 1}: {r.insight.headline}
          </b>
          <p>{r.insight.text}</p>
          <ul>
            {r.insight.sources.map((s) => (
              <li key={s.url} className="src">
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="muted">{ECOSYSTEM_CAVEAT}</p>
    </div>
  );
}

/** The complete ranked answer list for a round, marking room picks. */
export function FullAnswerList({ list, tallies, mine }: { list: FullAnswer[]; tallies?: Tally[]; mine?: string | null }) {
  const counts = new Map((tallies ?? []).map((t) => [t.label, t.count]));
  const tiers = ['gem', 'rare', 'uncommon', 'common'] as const;
  return (
    <div className="fulllist">
      <p className="fl-note muted">
        {list.length} accepted answers, rarest first.{tallies?.length ? ' Highlighted = picked this round (×count).' : ''}
      </p>
      {tiers.map((tier) => (
        <section key={tier}>
          <div className="fl-head">
            <TierTag tier={tier} />
          </div>
          <ul>
            {list
              .filter((a) => a.tier === tier)
              .map((a) => {
                const n = counts.get(a.label);
                return (
                  <li key={a.label} className={a.label === mine ? 'mine' : n ? 'picked' : ''}>
                    <span>{a.label}</span>
                    {a.label === mine ? <span className="chip">yours</span> : null}
                    {n ? <span className="cnt tabular">×{n}</span> : null}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
