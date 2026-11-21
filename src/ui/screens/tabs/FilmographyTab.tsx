import { useProfile } from '../../store';
import { genreName } from '../../../engine/data/genres';
import { directorById } from '../../../engine/data/directors';
import { money } from '../../../engine/format';

export function FilmographyTab() {
  const p = useProfile();
  return (
    <div>
      <h2>Filmography</h2>
      {p.filmography.length === 0 ? (
        <p className="muted">No films yet. Accept a contract to make your first one.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th><th>Genre</th><th>Director</th><th>Grade</th><th>Box office</th><th>Public</th><th>Critics</th><th>Awards</th>
            </tr>
          </thead>
          <tbody>
            {[...p.filmography].reverse().map(({ film }) => (
              <tr key={film.id}>
                <td>{film.title}</td>
                <td>{genreName(film.contract.genre)}</td>
                <td>{directorById(film.directorId).name}</td>
                <td>{film.grade ?? '—'}</td>
                <td>{film.results ? money(film.results.boxOffice) : '—'}</td>
                <td>{film.results?.publicRating ?? '—'}</td>
                <td>{film.results?.criticsRating ?? '—'}</td>
                <td>{film.results?.wins.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
