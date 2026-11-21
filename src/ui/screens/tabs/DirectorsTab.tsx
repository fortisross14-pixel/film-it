import { useProfile } from '../../store';
import { DIRECTORS } from '../../../engine/data/directors';
import { genreName } from '../../../engine/data/genres';
import { directorUnlockText } from '../../../engine/progression';
import { TUNING } from '../../../engine/tuning';

export function DirectorsTab() {
  const p = useProfile();
  return (
    <div>
      <h2>Directors</h2>
      <div className="grid">
        {DIRECTORS.map((d) => {
          const unlocked = p.unlocks.directors.includes(d.id);
          const st = p.directors[d.id];
          return (
            <div key={d.id} className={`card ${unlocked ? '' : 'locked'}`}>
              <div className="row between">
                <h3>{d.name}</h3>
                {unlocked ? (
                  <span className="tag">Lvl {st?.level ?? 1}/{TUNING.directors.maxLevel}</span>
                ) : (
                  <span className="tag dim">Locked</span>
                )}
              </div>
              <p>{d.blurb}</p>
              <p className="small muted">
                Affinity: {d.genreAffinity.length ? d.genreAffinity.map(genreName).join(', ') : 'Any'}
                {d.specialties.length > 0 && <> · Specialty: {d.specialties.join(', ')}</>}
              </p>
              {unlocked ? (
                <p className="small muted">{st?.films ?? 0} films made</p>
              ) : (
                <p className="small">🔒 {directorUnlockText(d)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
