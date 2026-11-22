import { useState } from 'react';
import { useGame, useProfile } from '../store';
import { ActorCard } from '../components/ActorCard';
import { Face } from '../components/Face';
import { ActionBar, Hint, Sheet, useToast } from '../components/ui';
import { Requirements } from './ScriptEditor';
import { SKILLS } from '../../engine/data/actors';
import { directorById } from '../../engine/data/directors';
import { money, ROLE_TYPE_NAMES } from '../../engine/format';
import { checkRequirements, screenTime } from '../../engine/script';
import {
  actorFit, budgetLeft, castActor, castingBlockers, castingScore, drawCards, finishCasting, payroll, redrawFee, releaseRole,
  rolePay, roleSkillNeeds, type CastResult,
} from '../../engine/casting';

export function CastingScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const [roleId, setRoleId] = useState<string | null>(null);
  const toast = useToast();
  const st = screenTime(film);
  const score = castingScore(film, directorById(film.directorId));
  const blockers = castingBlockers(film);
  const left = budgetLeft(film);
  const cast = film.roles.filter((r) => r.actor).length;

  const apply = (r: CastResult) => {
    if (!r.ok) return toast.show(r.reason), false;
    update(() => r.profile);
    return true;
  };

  return (
    <div className="stack phase-screen">
      <div className="card budget-card">
        <div className="row between">
          <span>Budget left <strong className={left < 0 ? 'bad' : ''}>{money(left)}</strong></span>
          <span className="small muted">cast pay {money(payroll(film))}</span>
        </div>
        <span className="bar"><span style={{ width: `${Math.max(0, Math.min(100, (left / film.contract.budget) * 100))}%` }} /></span>
      </div>

      <div className="cast-grid">
        {film.roles.map((r) => (
          <button key={r.id} className={`cast-card ${r.actor ? `filled r-${r.actor.rarity}` : ''}`} onClick={() => setRoleId(r.id)}>
            {r.actor ? <Face actor={r.actor} size={84} /> : <span className="face-empty huge">?</span>}
            <strong>{r.name}</strong>
            <span className="small muted">{ROLE_TYPE_NAMES[r.type]} · {st[r.id]}′</span>
            {r.actor
              ? <span className="cc-actor"><span>{r.actor.name}</span><strong>{money(rolePay(film, r, r.actor))}</strong></span>
              : <span className="chip-cta">Cast ›</span>}
          </button>
        ))}
      </div>

      <details className="card fold">
        <summary>Must-haves</summary>
        <Requirements reqs={checkRequirements(film)} />
      </details>

      {roleId && <RoleSheet roleId={roleId} onApply={apply} onClose={() => setRoleId(null)} onNext={(next) => setRoleId(next)} />}
      {toast.node}

      <ActionBar>
        <span className="bar-stat"><span className="kicker">Casting</span><strong>{score.total}</strong></span>
        <span className="bar-stat"><span className="kicker">Cast</span><strong>{cast}/{film.roles.length}</strong></span>
        <button className="primary grow" disabled={blockers.length > 0} onClick={() => apply(finishCasting(p))}>
          {blockers.length ? blockers[0] : 'Sign the cast ›'}
        </button>
      </ActionBar>
    </div>
  );
}

function RoleSheet({ roleId, onApply, onClose, onNext }: {
  roleId: string; onApply: (r: CastResult) => boolean; onClose: () => void; onNext: (id: string | null) => void;
}) {
  const p = useProfile();
  const film = p.activeFilm!;
  const level = p.directors[film.directorId]?.level ?? 1;
  const role = film.roles.find((r) => r.id === roleId)!;
  const state = film.casting[roleId];
  const needs = roleSkillNeeds(film, role);
  const fee = redrawFee(film, roleId, level);
  const left = budgetLeft(film);
  const needList = SKILLS.filter((s) => needs[s] >= 0.2).sort((a, b) => needs[b] - needs[a]);
  const draw = () => onApply(drawCards(p, roleId));

  return (
    <Sheet
      wide
      title={role.name}
      kicker={`${ROLE_TYPE_NAMES[role.type]} · ${role.billing} billing`}
      onClose={onClose}
      footer={role.actor ? (
        <button className="danger" onClick={() => confirm(`Release ${role.actor!.name}? They are gone for this film.`) && onApply(releaseRole(p, roleId))}>Release &amp; recast</button>
      ) : (
        <button className={state?.offered.length ? '' : 'primary'} onClick={draw} disabled={fee > left}>
          {state?.draws ? `New cards · ${money(fee)}` : 'Draw 3 cards · free'}
        </button>
      )}
    >
      <p className="small">Needs <span className="chips-inline">{needList.map((s) => <span key={s} className="chip">{s}</span>)}</span></p>
      {role.actor ? (
        <div className="cards one">
          <ActorCard actor={role.actor} needs={needs} fit={actorFit(film, role, role.actor)} pay={rolePay(film, role, role.actor)} directorId={film.directorId} />
        </div>
      ) : state?.offered.length ? (
        <>
          <div className="cards carousel">
            {state.offered.map((a) => {
              const pay = rolePay(film, role, a);
              return (
                <ActorCard
                  key={a.id}
                  actor={a}
                  needs={needs}
                  fit={actorFit(film, role, a)}
                  pay={pay}
                  budgetAfter={left - pay}
                  directorId={film.directorId}
                  onCast={() => {
                    if (onApply(castActor(p, roleId, a.id))) onNext(film.roles.find((r) => !r.actor && r.id !== roleId)?.id ?? null);
                  }}
                />
              );
            })}
          </div>
          <p className="small muted center">Skipped cards are gone<Hint>Cards you skip are gone for this film. New cards cost more each time.</Hint></p>
        </>
      ) : (
        <div className="empty">
          <p className="muted">Draw to see 3 actors for this role.</p>
        </div>
      )}
    </Sheet>
  );
}
