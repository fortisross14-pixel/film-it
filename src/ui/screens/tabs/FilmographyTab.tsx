import { Fragment, useState } from 'react';
import { useProfile } from '../../store';
import { genreName } from '../../../engine/data/genres';
import { directorById } from '../../../engine/data/directors';
import { toneById } from '../../../engine/data/tones';
import { setById } from '../../../engine/data/sets';
import { actionById } from '../../../engine/data/actions';
import { money } from '../../../engine/format';
import { sceneScores } from '../../../engine/post';

export function FilmographyTab() {
  const p = useProfile();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div>
      <h2>Filmography</h2>
      {p.filmography.length === 0 ? (
        <p className="muted">No films yet. Start a career and accept a contract to make your first one.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th><th>Profile</th><th>Genre</th><th>Grade</th><th>Box office</th><th>Public</th><th>Critics</th><th>Awards</th><th />
            </tr>
          </thead>
          <tbody>
            {[...p.filmography].reverse().map(({ film }) => (
              <Fragment key={film.id}>
                <tr>
                  <td>{film.title}</td>
                  <td>{directorById(film.directorId).name}</td>
                  <td>{genreName(film.contract.genre)}</td>
                  <td><strong className={`grade-${film.grade}`}>{film.grade ?? '—'}</strong></td>
                  <td>{film.results ? money(film.results.boxOffice) : '—'}</td>
                  <td>{film.results?.publicRating ?? '—'}</td>
                  <td>{film.results?.criticsRating ?? '—'}</td>
                  <td>{film.results ? `${film.results.wins.length} 🏆 / ${film.results.nominations.length}` : '—'}</td>
                  <td><button onClick={() => setOpen(open === film.id ? null : film.id)}>{open === film.id ? 'Hide' : 'Final cut'}</button></td>
                </tr>
                {open === film.id && (
                  <tr>
                    <td colSpan={9}>
                      <div className="cut-detail">
                        <p className="small muted">
                          {film.contract.studio.name} · {film.runtime} min · script {film.scriptQuality} · casting {film.castingScore} · music {film.music}
                          {film.report && <> · score {film.report.score}{film.report.missedReqs.length > 0 && ` · missed: ${film.report.missedReqs.join(', ')}`}</>}
                        </p>
                        <p className="small">Cast: {film.roles.map((r) => `${r.actor?.name ?? '?'} as ${r.name}`).join(' · ')}</p>
                        <ol className="reqs small">
                          {film.scenes.map((s) => {
                            const sc = sceneScores(film).find((x) => x.sceneId === s.id);
                            return (
                              <li key={s.id} className={s.cut ? 'muted' : ''}>
                                {toneById(s.tone).name} · {s.beats.map((b) => actionById(b.actionId).verb).join(', ')}
                                {s.cut ? ' · cut' : ` · final ${sc?.total ?? '—'}`}
                                <span className="muted"> · {s.takes.length} takes ({s.takes.map((t) => `${t.score}${t.id === s.chosenTakeId ? '✓' : ''}`).join(', ')})
                                  {s.setId && ` · ${setById(s.setId).name}`}</span>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
