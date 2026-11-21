import { useState } from 'react';
import { useGame, useProfile } from '../store';
import { Face } from '../components/Face';
import { FilmPoster } from '../components/Poster';
import { art } from '../art';
import { Laurels, Popcorn, Tomato, Ticket, Trophy, Star, Clapper } from '../components/Icons';
import { directorById } from '../../engine/data/directors';
import { audienceScore, criticsScore, money } from '../../engine/format';
import { deliverFilm, runPremiere } from '../../engine/premiere';
import { effectiveBoxOfficeTarget } from '../../engine/marketing';
import { TUNING } from '../../engine/tuning';
import type { Film, Grade, GradeComponent } from '../../engine/types';
import { careerName, levelAfter } from '../../engine/career';
import { genreName } from '../../engine/data/genres';

const STAGES = ['Red carpet', 'Audience', 'Critics', 'Box office', 'Awards', 'Studio verdict'];
const COMPONENT_LABEL: Record<GradeComponent, string> = { boxOffice: 'Box office', public: 'Audience', critics: 'Critics', awards: 'Awards' };
const VERDICT: Record<Grade, string> = { A: 'A hit!', B: 'A success', C: 'Solid', D: 'Disappointing', F: 'A flop' };
const FACTOR_LABEL: Record<string, string> = {
  script: 'Script', star: 'Star power', worst: 'Weakest scene', peak: 'Best scene', acting: 'Acting',
  chemistry: 'Chemistry', fx: 'VFX / SFX', originality: 'Originality', execution: 'Final cut',
};

export function PremiereScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const [stage, setStage] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const r = film.results;
  const rep = film.report;
  const shown = (i: number) => stage >= i;

  return (
    <div className="premiere-layout">
      <div className="carpet-col">
        <div className="carpet-art" style={{ backgroundImage: `url(${art('premiere-bg')})` }}>
          <span className="marquee-title">{film.title}</span>
          <div className="steps-poster"><FilmPoster film={film} width={180} /></div>
        </div>
        {r && (
          <div className="arrivals">
            {film.roles.filter((x) => x.actor).map((x) => (
              <span key={x.id} className="arrival" title={`${x.actor!.name} as ${x.name}`}><Face actor={x.actor!} size={44} /></span>
            ))}
            <div className="buzz"><span className="kicker light">Press buzz</span><span className="bar"><span style={{ width: `${r.buzz}%` }} /></span></div>
          </div>
        )}
      </div>

      <div className="results-col">
        <header className="premiere-head">
          <span className="kicker gold">✦ World premiere ✦</span>
          <h1 className="premiere-title">{film.title}</h1>
          <span className="kicker spaced">Premiere results</span>
        </header>

        {!r || !rep ? (
          <div className="card premiere-start">
            <p className="muted">The cast is getting dressed. The press is waiting.</p>
            <button className="primary big-cta" onClick={() => {
              const res = runPremiere(p);
              if (res.ok) update(() => res.profile);
              else setMsg(res.reason);
            }}>
              <Clapper size={24} /> Roll out the red carpet
            </button>
            {msg && <p className="bad">{msg}</p>}
          </div>
        ) : (
          <>
            <div className="stat-cards">
              <div className="card stat">
                <div className="stat-head"><Popcorn size={30} /><span>Audience<br />rating</span></div>
                {shown(1) ? (
                  <>
                    <div className="stat-value reveal">{audienceScore(r.publicRating)}<small>/10</small></div>
                    <span className="bar"><span style={{ width: `${r.publicRating}%` }} /></span>
                  </>
                ) : <div className="stat-value hidden">?</div>}
              </div>
              <div className="card stat">
                <div className="stat-head"><Tomato size={30} /><span>Critics<br />rating</span></div>
                {shown(2) ? (
                  <>
                    <div className="stat-value reveal">{criticsScore(r.criticsRating)}</div>
                    <span className="bar"><span style={{ width: `${r.criticsRating}%` }} /></span>
                  </>
                ) : <div className="stat-value hidden">?</div>}
              </div>
              <div className="card stat">
                <div className="stat-head"><Ticket size={30} /><span>Box office</span></div>
                {shown(3) ? (
                  <>
                    <div className="stat-value reveal">{money(r.boxOffice)}</div>
                    <span className="kicker muted-k">Total · target {money(effectiveBoxOfficeTarget(film))}</span>
                    <span className="small muted">Poster {r.posterScore ?? '—'} · marketing {r.marketing === 'push' ? 'big push' : r.marketing === 'cut' ? 'reduced' : 'standard'}</span>
                  </>
                ) : <div className="stat-value hidden">?</div>}
              </div>
              <div className="card stat verdict-card">
                <span className="kicker light">Studio verdict</span>
                {shown(5) ? (
                  <div className="verdict">
                    <Laurels size={110}><span className={`grade-letter stamp grade-${rep.grade}`}>{rep.grade}</span></Laurels>
                    <span className="ribbon">{VERDICT[rep.grade]}</span>
                  </div>
                ) : <div className="stat-value hidden light">?</div>}
              </div>
            </div>

            <div className="card awards-row">
              <span className="awards-label"><Laurels size={70}><span className="kicker">Awards</span></Laurels></span>
              {!shown(4) ? (
                <span className="muted">Nominations are announced after the run…</span>
              ) : r.nominations.length === 0 ? (
                <span className="muted">No nominations this year.</span>
              ) : (
                r.nominations.map((n) => (
                  <span key={n} className="award reveal">
                    <img src={art('trophy')} alt="" className="trophy-img" />
                    <span>
                      <strong>{n.replace('Festival: ', '')}</strong>
                      <span className={`chip ${r.wins.includes(n) ? 'win' : ''}`}>{r.wins.includes(n) ? <><Trophy size={14} /> Winner</> : <><Star size={14} /> Nominated</>}</span>
                      {(() => {
                        const d = r.awardDetails?.find((x) => x.category === n);
                        if (!d) return null;
                        const rivals = d.nominees.slice(1);
                        return (
                          <span className="small muted rivals" title={rivals.join(' · ')}>
                            {d.winner === film.title ? `beat ${rivals.length} rivals` : `won by ${d.winner}`}
                          </span>
                        );
                      })()}
                    </span>
                  </span>
                ))
              )}
            </div>

            <div className="card chart-card">
              <div className="row between">
                <span className="panel-title small-title">▮▮ Box office by week</span>
                {shown(3) && <span><span className="kicker muted-k">Total</span> <strong className="total">{money(r.boxOffice)}</strong></span>}
              </div>
              {shown(3) ? <WeekChart weekly={r.weekly} /> : <p className="muted small">Opening weekend coming up…</p>}
              {shown(3) && <p className="small muted">Opening weekend {money(r.openingWeekend)}{r.boxOffice < film.contract.budget ? ' · it did not earn back its budget' : ''}</p>}
            </div>

            {shown(5) && (
              <div className="card">
                <button className="link" onClick={() => setShowWhy(!showWhy)}>{showWhy ? 'Hide' : 'How the studio graded it'}</button>
                {showWhy && (
                  <>
                    <table className="table">
                      <tbody>
                        {(Object.keys(rep.components) as GradeComponent[]).map((k) => (
                          <tr key={k}><td>{COMPONENT_LABEL[k]}</td><td>{rep.components[k]}</td><td className="muted">× {Math.round(film.contract.weights[k] * 100)}%</td></tr>
                        ))}
                        <tr><td><strong>Satisfaction</strong></td><td><strong>{rep.satisfaction}</strong></td><td /></tr>
                        {rep.bonusPoints > 0 && <tr><td>Bonus goals ({rep.bonusMet.join(', ')})</td><td className="good">+{rep.bonusPoints}</td><td /></tr>}
                        {rep.latePenalty > 0 && <tr><td>{rep.weeksLate} week{rep.weeksLate > 1 ? 's' : ''} late</td><td className="bad">−{rep.latePenalty}</td><td /></tr>}
                        {rep.overBudgetPenalty > 0 && <tr><td>{rep.overBudgetPct}% over budget</td><td className="bad">−{rep.overBudgetPenalty}</td><td /></tr>}
                        <tr><td><strong>Score</strong></td><td><strong>{rep.score}</strong></td><td className="muted">{rep.letterBeforeCaps}</td></tr>
                        {rep.missedReqs.map((m) => <tr key={m}><td className="bad">Missed: {m}</td><td className="bad">−1 letter</td><td /></tr>)}
                      </tbody>
                    </table>
                    <div className="factor-grid">
                      {Object.entries(r.factors).map(([k, v]) => (
                        <div key={k} className="weight"><span>{FACTOR_LABEL[k] ?? k}</span><span className="bar"><span style={{ width: `${v}%` }} /></span><span className="muted">{Math.round(v)}</span></div>
                      ))}
                    </div>
                  </>
                )}
                <VerdictRewards film={film} />
                <button className="primary" onClick={() => {
                  const res = deliverFilm(p);
                  if (!res.ok) return setMsg(res.reason);
                  const o = res.outcome;
                  if (o?.genresOpened.length) alert(`New genre${o.genresOpened.length > 1 ? 's' : ''} for every career: ${o.genresOpened.map(genreName).join(', ')}.`);
                  if (o?.wrapped) alert(`${p.career ? careerName(p.career) : directorById(film.directorId).name} made ${TUNING.ladder.maxFilms} films: the career is complete and goes to the Hall of fame.`);
                  update(() => res.profile);
                }}>
                  {film.grade === 'F' ? 'End the career ›' : 'Collect rewards ›'}
                </button>
                {msg && <p className="bad">{msg}</p>}
              </div>
            )}

            {stage < STAGES.length - 1 && (
              <div className="row">
                <button className="primary" onClick={() => setStage(stage + 1)}>Reveal: {STAGES[stage + 1]} ▶</button>
                <button onClick={() => setStage(STAGES.length - 1)}>Reveal all</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** What this grade brings: money, a talent pack, a step on the ladder (or the end of the career). */
function VerdictRewards({ film }: { film: Film }) {
  const p = useProfile();
  const rep = film.report!;
  const c = p.career;
  const pack = rep.rewards.pack;
  if (film.grade === 'F') {
    return <p className="bad">An F: no fee, and the studios are done with {c ? careerName(c) : directorById(film.directorId).name}. This career ends here{c ? ` after ${c.films + 1} film${c.films ? 's' : ''}` : ''}.</p>;
  }
  const from = c?.level ?? 1;
  const to = levelAfter(from, film.grade!);
  const last = c && c.films + 1 >= TUNING.ladder.maxFilms;
  return (
    <div className="stack">
    <table className="table pay-table">
      <tbody>
        <tr><td>Fee for a {film.grade}</td><td>{money(rep.rewards.fee)}</td></tr>
        {rep.rewards.boxOfficeBonus > 0 && <tr><td>Box office beat the target</td><td className="good">+{money(rep.rewards.boxOfficeBonus)}</td></tr>}
        {rep.rewards.ratingBonus > 0 && <tr><td>Audience and critics</td><td className="good">+{money(rep.rewards.ratingBonus)}</td></tr>}
        {rep.rewards.awardBonus > 0 && <tr><td>Awards</td><td className="good">+{money(rep.rewards.awardBonus)}</td></tr>}
        <tr><td><strong>The studio earns</strong></td><td><strong>{money(rep.rewards.total)}</strong></td></tr>
      </tbody>
    </table>
    <div className="reward-row">
      {pack && <span>🎁 {TUNING.talentPacks[pack].name}</span>}
      {c && <span>{to > from ? `Level ${from} → ${to} ▲` : to < from ? `Level ${from} → ${to} ▼` : `Stays at level ${from}`}</span>}
      {last && <span>Film {TUNING.ladder.maxFilms} of {TUNING.ladder.maxFilms}: career complete</span>}
    </div>
    </div>
  );
}

function WeekChart({ weekly }: { weekly: number[] }) {
  const W = 520, H = 170, padL = 48, padB = 26, padT = 10;
  const max = Math.max(...weekly) * 1.15;
  const step = (W - padL - 10) / Math.max(1, weekly.length - 1);
  const pts = weekly.map((v, i) => [padL + i * step, padT + (H - padT - padB) * (1 - v / max)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${H - padB} L${padL},${H - padB} Z`;
  const ticks = [0, 0.33, 0.66, 1].map((f) => f * max);
  return (
    <svg className="week-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Box office by week: ${weekly.map((w) => money(w)).join(', ')}`}>
      <defs><linearGradient id="wk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b23a33" stopOpacity="0.45" /><stop offset="1" stopColor="#b23a33" stopOpacity="0.05" /></linearGradient></defs>
      {ticks.map((t, i) => {
        const y = padT + (H - padT - padB) * (1 - t / max);
        return <g key={i}><line x1={padL} x2={W - 6} y1={y} y2={y} stroke="#e2d2b6" /><text x={padL - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#6b5848">{money(t)}</text></g>;
      })}
      <path d={area} fill="url(#wk)" className="chart-area" />
      <path d={line} fill="none" stroke="#9e2f2a" strokeWidth="2.5" className="chart-line" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5" fill="#fbf5ea" stroke="#9e2f2a" strokeWidth="2" />
          <text x={x} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b5848">W{i + 1}</text>
        </g>
      ))}
    </svg>
  );
}
