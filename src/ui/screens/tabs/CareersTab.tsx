import { useState } from 'react';
import { useGame, useProfile } from '../../store';
import { DIRECTORS, directorById } from '../../../engine/data/directors';
import { genreName } from '../../../engine/data/genres';
import { buyDirector, directorCost, unlockProgress } from '../../../engine/progression';
import { bestGrade, retireCareer, retirementBonus, startCareer } from '../../../engine/career';
import { money } from '../../../engine/format';
import { TUNING } from '../../../engine/tuning';

const SPECIALTY_TEXT: Record<string, string> = {
  script: 'Script', casting: 'Casting', shooting: 'Shooting', post: 'Post', genre: 'Genre master',
  budget: 'Budget', schedule: 'Schedule', festival: 'Festivals',
};

export function CareersTab({ onGoTo }: { onGoTo?: (tab: string) => void }) {
  const p = useProfile();
  const { update } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  const c = p.career;
  const progress = unlockProgress(p);
  const act = (r: { ok: true; profile: typeof p } | { ok: false; reason: string }, then?: () => void) => {
    if (!r.ok) return setMsg(r.reason);
    update(() => r.profile);
    setMsg(null);
    then?.();
  };

  return (
    <div>
      {c ? (
        <div className="card career-now">
          <div className="row between wrap">
            <div>
              <h2>Current career: {directorById(c.directorId).name}</h2>
              <p className="muted">
                {c.films} films · level {c.level} · reputation {c.reputation} · earned {c.earnings} credits
                {c.grades.length > 0 && <> · grades {c.grades.join(' ')}</>}
                {c.fStreak > 0 && <span className="bad"> · {c.fStreak} F in a row (fired at {TUNING.career.firedAfterFs})</span>}
              </p>
            </div>
            <div className="row">
              <button className="primary" onClick={() => onGoTo?.('board')}>Contract board</button>
              <button
                className="danger"
                disabled={!!p.activeFilm}
                onClick={() => confirm(`Retire ${directorById(c.directorId).name}? You get ${retirementBonus(c)} credits from your reputation.`) && act(retireCareer(p))}
              >
                Retire (+{retirementBonus(c)} credits)
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>Start a career</h2>
          <p className="muted">Pick a director profile. Reputation and level start from zero; credits you earn go to the bank and unlock more profiles, topic packs and sets.</p>
        </div>
      )}
      {msg && <p className="bad">{msg}</p>}

      <div className="row between">
        <h2>Director profiles</h2>
        <span className="small muted">Unlocked {progress.owned}/{progress.total} items · {progress.remainingCost} credits to unlock everything</span>
      </div>
      <div className="grid">
        {DIRECTORS.map((d) => {
          const owned = p.unlocks.directors.includes(d.id);
          const cost = directorCost(d);
          const stats = p.directors[d.id];
          const careers = p.careers.filter((x) => x.directorId === d.id);
          return (
            <div key={d.id} className={`card profile-card ${owned ? '' : 'locked'} ${c?.directorId === d.id ? 'selected' : ''}`}>
              <div className="row between">
                <h3>{d.name}</h3>
                {owned ? <span className="tag">Owned</span> : <span className="tag">{cost} credits</span>}
              </div>
              <p>{d.blurb}</p>
              <p className="small muted">
                Genres: {d.genreAffinity.length ? d.genreAffinity.map(genreName).join(', ') : 'any'}
                {d.specialties.length > 0 && <> · {d.specialties.map((s) => SPECIALTY_TEXT[s]).join(', ')}</>}
              </p>
              {(stats?.films ?? 0) > 0 && <p className="small muted">{stats!.films} films over {careers.length + (c?.directorId === d.id ? 1 : 0)} career(s)</p>}
              {owned ? (
                !c && <button className="primary" onClick={() => act(startCareer(p, d.id), () => onGoTo?.('board'))}>Start career</button>
              ) : (
                <button disabled={p.credits < cost} onClick={() => act(buyDirector(p, d.id))}>Unlock for {cost} credits</button>
              )}
            </div>
          );
        })}
      </div>

      <h2>Hall of fame</h2>
      {p.careers.length === 0 ? (
        <p className="muted">No finished careers yet.</p>
      ) : (
        <table className="table">
          <thead><tr><th>Profile</th><th>Films</th><th>Grades</th><th>Best</th><th>Awards</th><th>Box office</th><th>Earned</th><th>Ended</th></tr></thead>
          <tbody>
            {[...p.careers].reverse().map((x) => (
              <tr key={x.id}>
                <td>{directorById(x.directorId).name}</td>
                <td>{x.films}</td>
                <td>{x.grades.join(' ')}</td>
                <td>{bestGrade(x) ?? '—'}</td>
                <td>{x.wins} 🏆 / {x.nominations}</td>
                <td>{money(x.boxOffice)}</td>
                <td>{x.earnings}</td>
                <td className={x.status === 'fired' ? 'bad' : ''}>{x.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
