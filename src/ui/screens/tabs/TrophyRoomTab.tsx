import { useProfile } from '../../store';

export function TrophyRoomTab() {
  const p = useProfile();
  const entries = p.filmography.flatMap(({ film }) => [
    ...(film.results?.wins ?? []).map((w) => ({ film: film.title, award: w, won: true })),
    ...(film.results?.nominations ?? [])
      .filter((n) => !film.results?.wins.includes(n))
      .map((n) => ({ film: film.title, award: n, won: false })),
  ]);
  return (
    <div>
      <h2>Trophy room</h2>
      {entries.length === 0 ? (
        <p className="muted">No festival awards or nominations yet.</p>
      ) : (
        <ul className="reqs">
          {entries.map((e, i) => (
            <li key={i}>
              {e.won ? '🏆' : '🎗️'} {e.award} — <em>{e.film}</em> {e.won ? '' : <span className="muted">(nominated)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
