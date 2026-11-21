import { useState } from 'react';
import { useGame, useProfile } from '../store';
import { ActorCard } from '../components/ActorCard';
import { Face } from '../components/Face';
import { Requirements } from './ScriptEditor';
import { SKILLS } from '../../engine/data/actors';
import { directorById } from '../../engine/data/directors';
import { money, ROLE_TYPE_NAMES } from '../../engine/format';
import { checkRequirements, screenTime, spent } from '../../engine/script';
import {
  actorFit, budgetLeft, castActor, castingBlockers, castingScore, drawCards, finishCasting, payroll, redrawFee, releaseRole,
  rolePay, roleSkillNeeds, type CastResult,
} from '../../engine/casting';

export function CastingScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const level = p.directors[film.directorId]?.level ?? 1;
  const [roleId, setRoleId] = useState(film.roles.find((r) => !r.actor)?.id ?? film.roles[0].id);
  const [msg, setMsg] = useState<string | null>(null);
  const role = film.roles.find((r) => r.id === roleId)!;
  const state = film.casting[roleId];
  const st = screenTime(film);
  const needs = roleSkillNeeds(film, role);
  const fee = redrawFee(film, roleId, level);
  const score = castingScore(film, directorById(film.directorId));
  const blockers = castingBlockers(film);

  const apply = (r: CastResult) => {
    if (!r.ok) return setMsg(r.reason), false;
    update(() => r.profile);
    setMsg(null);
    return true;
  };

  const needText = SKILLS.filter((s) => needs[s] >= 0.2).sort((a, b) => needs[b] - needs[a]).join(', ');

  return (
    <div className="script-grid">
      <div className="script-main">
        <div className="card">
          <h3>Roles</h3>
          <div className="role-list">
            {film.roles.map((r) => (
              <button key={r.id} className={`role-row ${r.id === roleId ? 'selected' : ''}`} onClick={() => setRoleId(r.id)}>
                {r.actor ? <Face actor={r.actor} size={40} /> : <span className="face-empty">?</span>}
                <span className="role-text">
                  <strong>{r.name}</strong> <span className="muted small">{ROLE_TYPE_NAMES[r.type]} · {st[r.id]} min</span>
                  <br />
                  <span className="small">{r.actor ? `${r.actor.name} · ${money(rolePay(film, r, r.actor))}` : <span className="muted">Not cast</span>}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="row between wrap">
            <div>
              <h3>{role.name} <span className="muted small">{ROLE_TYPE_NAMES[role.type]} · {role.billing} billing · {st[roleId]} min on screen</span></h3>
              <p className="small">Needs: <strong>{needText}</strong> <span className="muted">(from the actions in the script)</span></p>
            </div>
            {role.actor ? (
              <button className="danger" onClick={() => confirm(`Release ${role.actor!.name}? They are gone for this film.`) && apply(releaseRole(p, roleId))}>
                Release &amp; recast
              </button>
            ) : (
              <button className="primary" onClick={() => apply(drawCards(p, roleId))}>
                {state?.draws ? `Redraw (${money(fee)})` : 'Draw 3 cards (free)'}
              </button>
            )}
          </div>
          {msg && <p className="bad">{msg}</p>}
          {role.actor ? (
            <div className="cards">
              <ActorCard actor={role.actor} needs={needs} fit={actorFit(film, role, role.actor)} pay={rolePay(film, role, role.actor)} />
            </div>
          ) : state?.offered.length ? (
            <>
              <div className="cards">
                {state.offered.map((a) => (
                  <ActorCard
                    key={a.id}
                    actor={a}
                    needs={needs}
                    fit={actorFit(film, role, a)}
                    pay={rolePay(film, role, a)}
                    budgetLeft={budgetLeft(film)}
                    directorId={film.directorId}
                    onCast={() => {
                      if (apply(castActor(p, roleId, a.id))) {
                        const next = film.roles.find((r) => !r.actor && r.id !== roleId);
                        if (next) setRoleId(next.id);
                      }
                    }}
                  />
                ))}
              </div>
              <p className="small muted">Cards you pass on are gone for this film. Redraws cost more each time.</p>
            </>
          ) : (
            <p className="muted">Draw to see 3 actor cards for this role.</p>
          )}
        </div>
      </div>

      <aside className="script-side">
        <div className="card">
          <div className="row between">
            <h3>Casting score</h3>
            <span className="big">{score.total}</span>
          </div>
          <div className="weight"><span>Role fit</span><span className="bar"><span style={{ width: `${score.fit}%` }} /></span><span className="muted">{score.fit}</span></div>
          <div className="weight"><span>Star power</span><span className="bar"><span style={{ width: `${score.star}%` }} /></span><span className="muted">{score.star}</span></div>
        </div>
        <div className="card">
          <h3>Budget</h3>
          <p className="small">Spent {money(spent(film))} · Cast pay {money(payroll(film))}</p>
          <p>Left <strong className={budgetLeft(film) < 0 ? 'bad' : ''}>{money(budgetLeft(film))}</strong> <span className="muted">of {money(film.contract.budget)}</span></p>
          <p className="small muted">Shooting and post still need money.</p>
        </div>
        <Requirements reqs={checkRequirements(film)} />
        <button className="primary wide" disabled={blockers.length > 0} onClick={() => apply(finishCasting(p))}>
          Sign the cast → Shooting
        </button>
        {blockers.length > 0 && <p className="small bad">{blockers[0]}</p>}
      </aside>
    </div>
  );
}
