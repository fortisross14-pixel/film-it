import type { Contract } from '../../engine/types';
import { ARCHETYPE_NAMES } from '../../engine/contracts';
import { genreName } from '../../engine/data/genres';
import { describeBonus, describeHardReq, money } from '../../engine/format';
import { Calendar, Clapper, Coins, Box } from './Icons';
import { TUNING } from '../../engine/tuning';
import { Difficulty } from './ui';

const WEIGHT_LABELS = { boxOffice: 'Box office', public: 'Audience', critics: 'Critics', awards: 'Awards' } as const;
const strictLabel = (s: number) => (s > 1.2 ? 'strict' : s < 0.9 ? 'lenient' : 'normal');

export const contractGenre = (c: Contract) => `${genreName(c.genre)}${c.secondaryGenre ? ' / ' + genreName(c.secondaryGenre) : ''}`;

/** Key numbers as chips (used in list rows and the detail sheet). */
export function ContractFacts({ c }: { c: Contract }) {
  return (
    <span className="facts">
      <span className="fact-chip"><Coins size={16} /> {money(c.budget)}</span>
      <span className="fact-chip"><Calendar size={16} /> {c.deadlineWeeks} wk</span>
      <span className="fact-chip"><Clapper size={16} /> {c.runtime}′ · {c.rating}</span>
    </span>
  );
}

/** The full brief: what is graded, what must be in the film, bonuses, rewards. */
export function ContractDetails({ c }: { c: Contract }) {
  const weights = (Object.entries(c.weights) as [keyof typeof WEIGHT_LABELS, number][]).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
  return (
    <div className="stack contract-details">
      <div className="row between">
        <span className="tag">{ARCHETYPE_NAMES[c.archetype]}</span>
        <Difficulty n={c.difficulty} />
      </div>
      <ContractFacts c={c} />
      <div className="reward-row">
        <span><Coins size={18} /> Fee {money(c.rewards.fee)} at a C, ×{TUNING.rewards.gradeMult.A} at an A, plus bonuses for box office, ratings and awards</span>
        <span><Box size={18} /> B: {TUNING.talentPacks.casting.name} · A: {TUNING.talentPacks.star.name}</span>
      </div>
      <p className="small muted">Level {c.level} brief. A +{TUNING.ladder.climb.A} levels · B +{TUNING.ladder.climb.B} · C stays · D {TUNING.ladder.climb.D} · F ends the career.</p>
      <section>
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
        <p className="small muted">Box office target {money(c.boxOfficeTarget)} · late {strictLabel(c.delivery.late)} · over budget {strictLabel(c.delivery.overBudget)}</p>
      </section>
      <section>
        <div className="section-label">Must have</div>
        <ul className="reqs">{c.hardReqs.map((r, i) => <li key={i}>{describeHardReq(r)}</li>)}</ul>
      </section>
      {c.bonusGoals.length > 0 && (
        <section>
          <div className="section-label">Bonus</div>
          <ul className="reqs bonus">{c.bonusGoals.map((b, i) => <li key={i}>{describeBonus(b)} <span className="muted">+{b.points}</span></li>)}</ul>
        </section>
      )}
      <p className="small muted">{c.studio.name} · {contractGenre(c)}</p>
    </div>
  );
}
