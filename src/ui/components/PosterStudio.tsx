import type { Film, MarketingLevel, PosterSize } from '../../engine/types';
import { gear } from '../../engine/data/upgrades';
import { FilmPoster, FONT_FAMILY } from './Poster';
import { Face } from './Face';
import { Popcorn, Ticket } from './Icons';
import { money } from '../../engine/format';
import {
  POSTER_FONTS, POSTER_STYLES, editPoster, effectiveBoxOfficeTarget, marketingLevel, marketingSpend, posterOf, posterScore,
  regenerateFee, regeneratePoster, requestMarketing, type MarketingResult,
} from '../../engine/marketing';
import type { FilmRecord } from '../../engine/types';
import { TUNING } from '../../engine/tuning';

const SIZES: PosterSize[] = ['hidden', 's', 'm', 'l'];
const SIZE_LABEL: Record<PosterSize, string> = { hidden: 'Off', s: 'S', m: 'M', l: 'L' };
const starTag = (sp: number) => (sp >= TUNING.poster.superstarAt ? 'Superstar' : sp >= TUNING.poster.starAt ? 'Star' : sp < TUNING.poster.nobodyBelow ? 'Unknown' : 'Known');

export function PosterStudio({ film, history, onApply }: { film: Film; history: FilmRecord[]; onApply: (r: MarketingResult) => boolean }) {
  const d = posterOf(film);
  const score = posterScore(film, history, d);
  const cast = film.roles.filter((r) => r.actor);
  const set = (patch: Parameters<typeof editPoster>[1]) => onApply(editPoster(film, patch));
  const style = POSTER_STYLES.find((s) => s.id === d.style)!;

  return (
    <div className="card poster-studio">
      <h3 className="panel-title small-title">🖼 Poster studio</h3>
      <div className="poster-studio-grid">
        <div className="poster-preview">
          <FilmPoster film={{ ...film, poster: d }} width={250} />
          <div className="row">
            <button onClick={() => onApply(regeneratePoster(film))}>↻ New design ({money(regenerateFee(film))})</button>
          </div>
          <p className="small muted">Background: {style.name} · redesigns cost more each time</p>
        </div>
        <div className="poster-controls">
          <div className="poster-score">
            <span className="big">{score.total}</span>
            <span className="small">Poster score<br /><span className="muted">adds buzz and opening weekend</span></span>
          </div>
          {(['style', 'title', 'billing', 'faces', 'director'] as const).map((k) => (
            <div key={k} className="weight"><span>{k[0].toUpperCase() + k.slice(1)}</span><span className="bar"><span style={{ width: `${score[k]}%` }} /></span><span className="muted">{score[k]}</span></div>
          ))}
          {score.tips.length > 0 && <ul className="reqs small tips">{score.tips.slice(0, 5).map((t) => <li key={t}>{t}</li>)}</ul>}

          <div className="section-label">Title</div>
          <div className="row wrap">
            {POSTER_FONTS.map((f) => (
              <button key={f.id} className={`font-btn ${d.titleFont === f.id ? 'primary' : ''}`} style={{ fontFamily: FONT_FAMILY[f.id] }} onClick={() => set({ titleFont: f.id })} title={f.name}>
                {f.name.split(' ')[0]}
              </button>
            ))}
          </div>
          <div className="row">
            <span className="field-label">Size</span>
            {(['s', 'm', 'l'] as const).map((s) => <button key={s} className={d.titleSize === s ? 'primary' : ''} onClick={() => set({ titleSize: s })}>{SIZE_LABEL[s]}</button>)}
          </div>

          <div className="section-label">Billing · names and faces</div>
          {cast.map((r) => (
            <div key={r.id} className="billing-row">
              <Face actor={r.actor!} size={36} />
              <span className="billing-name"><strong>{r.actor!.name}</strong><span className="small muted">{starTag(r.actor!.starPower)} · ★{r.actor!.starPower}</span></span>
              <span className="seg">
                {SIZES.map((s) => (
                  <button key={s} className={(d.billing[r.id] ?? 'hidden') === s ? 'primary' : ''} onClick={() => set({ billing: { [r.id]: s } })} aria-label={`${r.actor!.name} name size ${SIZE_LABEL[s]}`}>{SIZE_LABEL[s]}</button>
                ))}
              </span>
              <label className="choice inline">
                <input type="checkbox" checked={d.faces.includes(r.id)} onChange={(e) => set({ faces: e.target.checked ? [...d.faces, r.id] : d.faces.filter((x) => x !== r.id) })} />
                Face
              </label>
            </div>
          ))}

          <div className="section-label">Director credit · {film.directorName}</div>
          <div className="row">
            {SIZES.map((s) => <button key={s} className={d.directorSize === s ? 'primary' : ''} onClick={() => set({ directorSize: s })}>{SIZE_LABEL[s]}</button>)}
          </div>

          <div className="section-label">Frame</div>
          <div className="row">
            {(['none', 'gold', 'film', 'neon'] as const).map((f) => <button key={f} className={d.frame === f ? 'primary' : ''} onClick={() => set({ frame: f })}>{f}</button>)}
          </div>
        </div>
      </div>
    </div>
  );
}

const LEVEL_TEXT: Record<MarketingLevel, { name: string; what: string }> = {
  cut: { name: 'Reduced', what: 'Smaller box office, but the studio lowers its target.' },
  standard: { name: 'Standard', what: 'The studio’s planned campaign.' },
  push: { name: 'Big push', what: 'Much bigger box office and a small awards campaign — the studio expects more.' },
};

export function MarketingCard({ film, onApply }: { film: Film; onApply: (r: MarketingResult) => boolean }) {
  const level = marketingLevel(film);
  return (
    <div className="card marketing">
      <h3 className="panel-title small-title"><Popcorn size={22} /> Marketing</h3>
      <p>Studio campaign: <strong>{money(marketingSpend(film))}</strong> · {LEVEL_TEXT[level].name}</p>
      <p className="small"><Ticket size={16} /> Box office target <strong>{money(effectiveBoxOfficeTarget(film))}</strong>{level !== 'standard' && <span className="muted"> (was {money(film.contract.boxOfficeTarget)})</span>}</p>
      <p className="small muted">{LEVEL_TEXT[level].what}</p>
      <div className="row">
        {(['cut', 'standard', 'push'] as const).filter((l) => l !== level).map((l) => {
          const locked = !gear(film.upgrades).marketing.includes(l);
          return (
            <button key={l} disabled={locked} className={l === 'push' ? 'primary' : ''} onClick={() => onApply(requestMarketing(film, l))}>
              {locked ? '🔒 ' : ''}{l === 'push' ? 'Ask for more' : l === 'cut' ? 'Ask to reduce' : 'Back to standard'} · 1 week
            </button>
          );
        })}
      </div>
      {!gear(film.upgrades).marketing.includes('push') && <p className="small muted">Pushing a film needs the Marketing department (Shop → Team).</p>}
    </div>
  );
}
