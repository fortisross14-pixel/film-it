import type { Contract } from '../../engine/types';
import { ARCHETYPE_NAMES } from '../../engine/contracts';
import { genreName } from '../../engine/data/genres';
import { describeBonus, describeHardReq, money } from '../../engine/format';

const WEIGHT_LABELS = {
  schedule: 'On time',
  budget: 'On budget',
  boxOffice: 'Box office',
  public: 'Public',
  critics: 'Critics',
  awards: 'Awards',
} as const;

export function Stars({ n }: { n: number }) {
  return (
    <span className="stars" aria-label={`Difficulty ${n} of 5`}>
      {'★'.repeat(n)}
      <span className="dim">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export function ContractCard({ c, selected, onSelect }: { c: Contract; selected?: boolean; onSelect?: () => void }) {
  const weights = Object.entries(c.weights)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1]) as [keyof typeof WEIGHT_LABELS, number][];
  return (
    <div className={`card contract ${selected ? 'selected' : ''}`} onClick={onSelect} role={onSelect ? 'button' : undefined}>
      <div className="row between">
        <span className="tag">{ARCHETYPE_NAMES[c.archetype]}</span>
        <Stars n={c.difficulty} />
      </div>
      <h3>
        {genreName(c.genre)}
        {c.secondaryGenre && <span className="muted"> / {genreName(c.secondaryGenre)}</span>}
      </h3>
      <p className="muted">{c.studio.name} (tier {c.studio.tier})</p>
      <p className="brief-line">
        {c.runtime} min · {money(c.budget)} · {c.deadlineWeeks} weeks · {c.rating}
      </p>
      <div className="section-label">Must have</div>
      <ul className="reqs">
        {c.hardReqs.map((r, i) => (
          <li key={i}>{describeHardReq(r)}</li>
        ))}
      </ul>
      <div className="section-label">Bonus</div>
      <ul className="reqs bonus">
        {c.bonusGoals.map((b, i) => (
          <li key={i}>
            {describeBonus(b)} <span className="muted">+{b.points}</span>
          </li>
        ))}
      </ul>
      <div className="section-label">Graded on</div>
      <div className="weights">
        {weights.map(([k, w]) => (
          <div key={k} className="weight">
            <span>{WEIGHT_LABELS[k]}</span>
            <span className="bar"><span style={{ width: `${w * 100}%` }} /></span>
            <span className="muted">{Math.round(w * 100)}%</span>
          </div>
        ))}
      </div>
      <p className="muted small">Box office target {money(c.boxOfficeTarget)}</p>
      <p className="reward">Reward: {c.rewards.reputation} rep · {c.rewards.credits} credits</p>
    </div>
  );
}
