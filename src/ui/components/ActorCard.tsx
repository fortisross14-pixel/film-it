import type { Actor, SkillMap } from '../../engine/types';
import { SKILLS } from '../../engine/data/actors';
import { Face } from './Face';
import { money } from '../../engine/format';

const TRAIT_TEXT = {
  method: 'Method: +acting, slower shoots',
  diva: 'Diva: costs more',
  charming: 'Charming: +public',
  oneTake: 'One-take: fewer retakes',
} as const;

const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' } as const;

export function ActorCard({
  actor, needs, fit, pay, onCast, compact, budgetLeft, budgetAfter, directorId,
}: {
  actor: Actor;
  /** Skill shares this role needs; the top ones are highlighted. */
  needs?: SkillMap;
  fit?: number;
  pay?: number;
  onCast?: () => void;
  compact?: boolean;
  /** When set, pay above this is flagged. */
  budgetLeft?: number;
  /** Budget left if this actor is hired (shown before hiring). */
  budgetAfter?: number;
  /** Shows the loyalty badge when this director discovered the actor. */
  directorId?: string;
}) {
  const tooExpensive = (pay !== undefined && budgetLeft !== undefined && pay > budgetLeft) || (budgetAfter !== undefined && budgetAfter < 0);
  const top = needs ? SKILLS.filter((s) => needs[s] >= 0.2) : [];
  return (
    <div className={`card actor-card r-${actor.rarity} ${compact ? 'compact' : ''}`}>
      <span className={`rarity-ribbon r-${actor.rarity}`}>{RARITY_LABEL[actor.rarity]}</span>
      <div className="row">
        <Face actor={actor} size={compact ? 44 : 72} />
        <div>
          <div className="actor-name">{actor.name}</div>
          <div className="small">★ {actor.starPower} star · 🎭 {actor.acting} acting</div>
          <div className="small muted">{actor.age}{actor.traits.length > 0 && <> · {actor.traits.join(', ')}</>}</div>
        </div>
      </div>
      {!compact && (
        <>
          <div className="skills">
            {SKILLS.map((s) => (
              <div key={s} className={`weight ${top.includes(s) ? 'need' : ''}`}>
                <span>{s}</span>
                <span className="bar"><span style={{ width: `${actor.skills[s]}%` }} /></span>
                <span className="muted">{actor.skills[s]}</span>
              </div>
            ))}
          </div>
          {(actor.films ?? 0) > 0 && (
            <p className="small muted career-line">
              {actor.films} film{actor.films === 1 ? '' : 's'}{actor.wins ? ` · ${actor.wins} award${actor.wins > 1 ? 's' : ''}` : ''}
              {actor.credits?.[0] && ` · last: ${actor.credits[0].title} (${actor.credits[0].grade})`}
            </p>
          )}
          {directorId && actor.discoveredBy?.includes(directorId) && <span className="chip win">Remembers you · fee −15%</span>}
          {actor.traits.length > 0 && <p className="small muted trait-line">{actor.traits.map((t) => TRAIT_TEXT[t]).join(' · ')}</p>}
        </>
      )}
      {(fit !== undefined || pay !== undefined) && (
        <div className="money-line">
          {fit !== undefined && <span className="fit-pill">Fit <strong className={fit >= 70 ? 'good' : fit < 45 ? 'bad' : ''}>{fit}</strong></span>}
          {pay !== undefined && <span>Pay <strong>{money(pay)}</strong></span>}
          {budgetAfter !== undefined && (
            <span className={`after ${tooExpensive ? 'bad' : ''}`}>Budget after <strong>{money(budgetAfter)}</strong></span>
          )}
          {tooExpensive && budgetAfter === undefined && <span className="bad">over budget</span>}
        </div>
      )}
      {onCast && <button className="primary" onClick={onCast}>Cast</button>}
    </div>
  );
}
