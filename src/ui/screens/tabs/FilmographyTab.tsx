import { useState } from 'react';
import { useProfile } from '../../store';
import type { Film } from '../../../engine/types';
import { genreName } from '../../../engine/data/genres';
import { directorById } from '../../../engine/data/directors';
import { toneById } from '../../../engine/data/tones';
import { actionById } from '../../../engine/data/actions';
import { audienceScore, criticsScore, money } from '../../../engine/format';
import { Popcorn, Tomato } from '../../components/Icons';
import { sceneScores } from '../../../engine/post';
import { FilmPlayer } from '../PostScreen';
import { FilmPoster } from '../../components/Poster';
import { Sheet, Stat } from '../../components/ui';

/** Films as a tap-to-open list. `careerId` narrows it to one career. */
export function FilmographyTab({ careerId }: { careerId?: string }) {
  const p = useProfile();
  const [open, setOpen] = useState<Film | null>(null);
  const films = [...p.filmography].reverse().filter((r) => !careerId || r.careerId === careerId).map((r) => r.film);
  if (films.length === 0) return <p className="muted empty">No films yet.</p>;
  return (
    <>
      <div className="list">
        {films.map((film) => (
          <button key={film.id} className="list-row" onClick={() => setOpen(film)}>
            <FilmPoster film={film} width={46} />
            <span className="list-main">
              <strong>{film.title}</strong>
              <span className="small muted">{genreName(film.contract.genre)} · {directorById(film.directorId).name}</span>
            </span>
            <span className={`grade-badge grade-${film.grade}`}>{film.grade ?? '—'}</span>
          </button>
        ))}
      </div>
      {open && <FilmSheet film={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function FilmSheet({ film, onClose }: { film: Film; onClose: () => void }) {
  const [watching, setWatching] = useState(false);
  const r = film.results;
  const scores = sceneScores(film);
  return (
    <Sheet title={film.title} kicker={`${genreName(film.contract.genre)} · ${film.runtime} min`} onClose={onClose}>
      {watching ? <FilmPlayer film={film} onClose={() => setWatching(false)} /> : <button className="primary wide" onClick={() => setWatching(true)}>▶ Watch the final cut</button>}
      {r && (
        <div className="stat-row">
          <Stat label="Grade" value={film.grade ?? '—'} />
          <Stat label={<><Popcorn size={16} /> Audience</>} value={`${audienceScore(r.publicRating)}/10`} />
          <Stat label={<><Tomato size={16} /> Critics</>} value={criticsScore(r.criticsRating)} />
          <Stat label="Box office" value={money(r.boxOffice)} />
          <Stat label="Awards" value={`${r.wins.length} / ${r.nominations.length}`} />
        </div>
      )}
      <div className="section-label">Cast</div>
      <p className="small">{film.roles.map((x) => `${x.actor?.name ?? '?'} as ${x.name}`).join(' · ')}</p>
      <div className="section-label">Scenes</div>
      <ol className="reqs small">
        {film.scenes.map((s) => (
          <li key={s.id} className={s.cut ? 'muted' : ''}>
            {toneById(s.tone).name} · {s.beats.map((b) => actionById(b.actionId).verb).join(', ')} · {s.cut ? 'cut' : scores.find((x) => x.sceneId === s.id)?.total ?? '—'}
          </li>
        ))}
      </ol>
      {film.report && film.report.missedReqs.length > 0 && <p className="small bad">Missed: {film.report.missedReqs.join(', ')}</p>}
    </Sheet>
  );
}
