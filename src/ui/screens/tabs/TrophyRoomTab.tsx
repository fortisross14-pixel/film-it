import { useProfile } from '../../store';
import { art } from '../../art';

export function TrophyRoomTab() {
  const p = useProfile();
  const entries = p.filmography.flatMap(({ film }) => [
    ...(film.results?.wins ?? []).map((w) => ({ film: film.title, award: w, won: true })),
    ...(film.results?.nominations ?? []).filter((n) => !film.results?.wins.includes(n)).map((n) => ({ film: film.title, award: n, won: false })),
  ]);
  const wins = entries.filter((e) => e.won).length;
  return (
    <div>
      <p className="muted">{wins} won · {entries.length - wins} nominations</p>
      {entries.length === 0 ? (
        <p className="muted">No festival awards or nominations yet. Great films get noticed.</p>
      ) : (
        <div className="trophy-shelf">
          {entries.map((e, i) => (
            <div key={i} className={`card trophy-card ${e.won ? 'won' : 'nominated'}`}>
              <img src={art('trophy')} alt="" />
              <strong>{e.award.replace('Festival: ', '')}</strong>
              <span className="small muted"><em>{e.film}</em></span>
              <span className={`chip ${e.won ? 'win' : ''}`}>{e.won ? 'Winner' : 'Nominated'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
