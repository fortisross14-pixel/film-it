import { useState } from 'react';
import { useGame, useProfile } from '../../store';
import { ContractCard } from '../../components/ContractCard';
import { Poster } from '../../components/Poster';
import { IsoSet } from '../../components/IsoSet';
import { Clapper, Masks, Ticket, Calendar, Box, Laurels, Star } from '../../components/Icons';
import { directorById } from '../../../engine/data/directors';
import { genreCloseness, genreName } from '../../../engine/data/genres';
import { GENRE_TONE, toneById } from '../../../engine/data/tones';
import { SETS } from '../../../engine/data/sets';
import { TOPIC_PACKS } from '../../../engine/data/topics';
import { ARCHETYPE_NAMES } from '../../../engine/contracts';
import { startFilm } from '../../../engine/profile';
import { packArt } from '../../art';
import { TUNING } from '../../../engine/tuning';
import type { Contract } from '../../../engine/types';

const label = (c: Contract) => `${genreName(c.genre)}${c.secondaryGenre ? ' ' + genreName(c.secondaryGenre) : ''}`;

export function ContractBoardTab({ onGoTo }: { onGoTo?: (tab: string) => void }) {
  const p = useProfile();
  const { update } = useGame();
  const [contractId, setContractId] = useState<string>(p.contractBoard[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const contract = p.contractBoard.find((c) => c.id === contractId) ?? p.contractBoard[0];
  const d = directorById(p.career!.directorId);
  const fit = (genre: Contract['genre']) =>
    d.masterGenre ? (d.masterGenre === genre ? 'Your genre!' : 'Small edge') :
    d.genreAffinity.length === 0 ? 'Any genre' :
    d.genreAffinity.some((g) => genreCloseness(g, genre) === 1) ? 'Genre match' :
    d.genreAffinity.some((g) => genreCloseness(g, genre) > 0) ? 'Close genre' : 'Far off genre';
  const sets = SETS.filter((s) => p.unlocks.sets.includes(s.id)).slice(0, 3);

  return (
    <div className="board">
      <section className="card board-list">
        <h2 className="panel-title"><Clapper size={26} /> Contracts</h2>
        {p.contractBoard.map((c) => (
          <button key={c.id} className={`contract-row ${c.id === contract?.id ? 'selected' : ''}`} onClick={() => setContractId(c.id)}>
            <Poster title={c.title ?? label(c)} genre={c.genre} seed={c.id} width={64} showTitle={false} />
            <span className="contract-row-text">
              <span className="kicker">{c.sequelOf ? `Sequel #${c.sequelOf.number} · ` : ''}{label(c)}</span>
              <strong>{c.title ?? label(c)}</strong>
              <span className="row small"><Ticket size={18} /> {c.rewards.credits} · <span className="stars">{'★'.repeat(c.difficulty)}</span></span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </section>

      {contract && (
        <section className="card board-detail">
          <div className="detail-top">
            <Poster title={contract.title ?? label(contract)} genre={contract.genre} seed={contract.id} width={190} />
            <div className="detail-facts">
              <h2 className="film-title">{contract.title}</h2>
              <p className="muted">{contract.studio.name} · {ARCHETYPE_NAMES[contract.archetype]}</p>
              {contract.sequelOf && <p className="sequel-badge">🎞 Sequel to your hit “{contract.sequelOf.franchise}”: a built-in fanbase, but critics expect something new.</p>}
              <div className="fact"><Clapper size={22} /><span><span className="kicker">Genre</span>{label(contract)}</span></div>
              <div className="fact"><Masks size={22} /><span><span className="kicker">Mood</span>{toneById(GENRE_TONE[contract.genre]).name}</span></div>
              <div className="fact"><Calendar size={22} /><span><span className="kicker">Runtime · deadline</span>{contract.runtime} min · {contract.deadlineWeeks} weeks</span></div>
              <p className={`small fit-${fit(contract.genre).replace(/\W/g, '')}`}>{d.name}: {fit(contract.genre)}</p>
            </div>
          </div>
          <button className="primary big-cta" onClick={() => {
            const r = startFilm(p, contract.id);
            if (r.ok) update(() => r.profile);
            else setError(r.reason);
          }}>
            <Clapper size={26} /> Start Production ▶
          </button>
          {error && <p className="bad">{error}</p>}
          <ContractCard c={contract} />
        </section>
      )}

      <aside className="board-side">
        <div className="card director-card">
          <Laurels size={92}><span className="avatar big"><Clapper size={34} /></span></Laurels>
          <div>
            <strong>{d.name}</strong>
            <div className="small muted">Lv. {p.career!.level} / {TUNING.directors.maxLevel}</div>
            <div className="small">{d.blurb}</div>
          </div>
        </div>
        <button className="card side-link" onClick={() => onGoTo?.('sets')}>
          <h3 className="panel-title small-title"><Box size={22} /> Set catalogue</h3>
          <span className="set-thumbs">
            {sets.map((s) => (
              <span key={s.id} className="set-thumb"><IsoSet set={s} height={70} /><span className="small">{s.name}</span></span>
            ))}
          </span>
        </button>
        <button className="card side-link" onClick={() => onGoTo?.('topics')}>
          <h3 className="panel-title small-title"><Star size={22} /> Topic packs</h3>
          <span className="pack-fan">
            {TOPIC_PACKS.filter((x) => x.id !== 'starter').slice(0, 3).map((x, i) => (
              <img key={x.id} src={packArt(x.id)} alt={`${x.name} pack`} className={`pack-card-img pk-${i}`} />
            ))}
          </span>
        </button>
      </aside>
    </div>
  );
}
