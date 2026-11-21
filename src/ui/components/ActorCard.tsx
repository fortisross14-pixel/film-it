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

export function ActorCard({
  actor, needs, fit, pay, onCast, compact, budgetLeft, directorId,
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
  /** Shows the loyalty badge when this director discovered the actor. */
  directorId?: string;
}) {
  const tooExpensive = pay !== undefined && budgetLeft !== undefined && pay > budgetLeft;
  const top = needs ? SKILLS.filter((s) => needs[s] >= 0.2) : [];
  return (
    <div className={`card actor-card r-${actor.rarity} ${compact ? 'compact' : ''}`}>
      <div className="row">
        <Face actor={actor} size={compact ? 44 : 72} />
        <div>
          <div className="actor-name">{actor.name}</div>
          <div className="small muted">{actor.rarity} · {actor.age}</div>
          <div className="small">★ {actor.starPower} star · 🎭 {actor.acting} acting</div>
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
          {actor.traits.length > 0 && (
            <div className="row wrap">{actor.traits.map((t) => <span key={t} className="tag" title={TRAIT_TEXT[t]}>{t}</span>)}</div>
          )}
        </>
      )}
      {(fit !== undefined || pay !== undefined) && (
        <div className="row between small">
          {fit !== undefined && <span>Fit <strong className={fit >= 70 ? 'good' : fit < 45 ? 'bad' : ''}>{fit}</strong></span>}
          {pay !== undefined && <span>Pay <strong className={tooExpensive ? 'bad' : ''}>{money(pay)}</strong>{tooExpensive && <span className="bad"> over budget</span>}</span>}
        </div>
      )}
      {onCast && <button className="primary" onClick={onCast}>Cast</button>}
    </div>
  );
}
