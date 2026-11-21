import { useState } from 'react';
import { useGame, useProfile } from '../store';
import { Face } from '../components/Face';
import { directorById } from '../../engine/data/directors';
import { money } from '../../engine/format';
import { deliverFilm, runPremiere } from '../../engine/premiere';
import type { GradeComponent } from '../../engine/types';
import { TUNING } from '../../engine/tuning';

const STAGES = ['Red carpet', 'Public', 'Critics', 'Box office', 'Awards', 'Studio verdict'];
const COMPONENT_LABEL: Record<GradeComponent, string> = { boxOffice: 'Box office', public: 'Public', critics: 'Critics', awards: 'Awards' };
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
  const r = film.results;
  const rep = film.report;

  if (!r || !rep) {
    return (
      <div className="card premiere-start">
        <h2>Premiere night</h2>
        <p className="muted">“{film.title}” is ready. The cast is getting dressed.</p>
        <button className="primary" onClick={() => {
          const res = runPremiere(p);
          if (res.ok) update(() => res.profile);
          else setMsg(res.reason);
        }}>
          Roll out the red carpet
        </button>
        {msg && <p className="bad">{msg}</p>}
      </div>
    );
  }

  const maxWeek = Math.max(...r.weekly);
  return (
    <div className="premiere">
      <ol className="stepper">
        {STAGES.map((s, i) => (
          <li key={s} className={i === stage ? 'active' : i < stage ? 'done' : ''}>{s}</li>
        ))}
      </ol>

      <div className={`card reveal ${stage === 5 ? 'verdict' : ''}`} key={stage}>
        {stage === 0 && (
          <>
            <h2>🎞️ The red carpet</h2>
            <div className="row wrap carpet">
              {film.roles.filter((x) => x.actor).map((x) => (
                <div key={x.id} className="arrival">
                  <Face actor={x.actor!} size={72} />
                  <strong>{x.actor!.name}</strong>
                  <span className="small muted">as {x.name} · ★{x.actor!.starPower}</span>
                </div>
              ))}
            </div>
            <Meter label="Press buzz" value={r.buzz} />
          </>
        )}
        {stage === 1 && <Rating title="🍿 The public" value={r.publicRating} factors={r.factors} note={`Filler ${r.boredom}% of the runtime`} />}
        {stage === 2 && (
          <Rating
            title="🧐 The critics" value={r.criticsRating} factors={r.factors}
            note={r.overproduction ? `Overproduction: −${r.overproduction} for too much CGI` : undefined}
          />
        )}
        {stage === 3 && (
          <>
            <h2>💰 Box office</h2>
            <p>Opening weekend <strong>{money(r.openingWeekend)}</strong></p>
            <div className="weekly">
              {r.weekly.map((w, i) => (
                <div key={i} className="wk-bar" title={`Week ${i + 1}: ${money(w)}`}>
                  <span style={{ height: `${(w / maxWeek) * 100}%` }} />
                  <small>W{i + 1}</small>
                </div>
              ))}
            </div>
            <p>Total <strong className="big">{money(r.boxOffice)}</strong> <span className="muted">· studio target {money(film.contract.boxOfficeTarget)} · budget {money(film.contract.budget)}</span></p>
            {r.boxOffice > film.contract.budget * 3 && film.contract.budget < 12000 && <p className="good">A sleeper hit!</p>}
            {r.boxOffice < film.contract.budget && <p className="bad">A flop: it didn't earn back its budget.</p>}
          </>
        )}
        {stage === 4 && (
          <>
            <h2>🏆 Festivals & awards</h2>
            {r.nominations.length === 0 ? (
              <p className="muted">No nominations this year.</p>
            ) : (
              <ul className="reqs">
                {r.nominations.map((n) => (
                  <li key={n}>{r.wins.includes(n) ? '🏆 Won' : '🎗️ Nominated'}: <strong>{n}</strong></li>
                ))}
              </ul>
            )}
            <details>
              <summary className="small muted">How close was each category?</summary>
              <ul className="reqs small">
                {Object.entries(r.awardDrivers).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
              </ul>
            </details>
          </>
        )}
        {stage === 5 && (
          <>
            <div className="row between">
              <h2>🎬 Studio verdict: {film.contract.studio.name}</h2>
              <span className={`grade grade-${rep.grade} stamp`}>{rep.grade}</span>
            </div>
            <table className="table">
              <tbody>
                {(Object.keys(rep.components) as GradeComponent[]).map((k) => (
                  <tr key={k}>
                    <td>{COMPONENT_LABEL[k]}</td>
                    <td>{rep.components[k]}</td>
                    <td className="muted">× {Math.round(film.contract.weights[k] * 100)}%</td>
                  </tr>
                ))}
                <tr><td><strong>Satisfaction</strong></td><td><strong>{rep.satisfaction}</strong></td><td /></tr>
                {rep.bonusPoints > 0 && <tr><td>Bonus goals ({rep.bonusMet.join(', ')})</td><td className="good">+{rep.bonusPoints}</td><td /></tr>}
                {rep.latePenalty > 0 && <tr><td>{rep.weeksLate} week{rep.weeksLate > 1 ? 's' : ''} late</td><td className="bad">−{rep.latePenalty}</td><td /></tr>}
                {rep.overBudgetPenalty > 0 && <tr><td>{rep.overBudgetPct}% over budget</td><td className="bad">−{rep.overBudgetPenalty}</td><td /></tr>}
                <tr><td><strong>Score</strong></td><td><strong>{rep.score}</strong></td><td className="muted">{rep.letterBeforeCaps}</td></tr>
                {rep.missedReqs.map((m) => <tr key={m}><td className="bad">Missed: {m}</td><td className="bad">−1 letter</td><td /></tr>)}
              </tbody>
            </table>
            <div className="card rewards">
              <h3>Rewards</h3>
              <p>
                +{rep.rewards.reputation + rep.rewards.awardRep} reputation
                {rep.rewards.awardRep > 0 && <span className="muted"> ({rep.rewards.awardRep} from awards)</span>}
                {' · '}+{rep.rewards.credits + rep.rewards.unspentCredits} credits
                {rep.rewards.unspentCredits > 0 && <span className="muted"> ({rep.rewards.unspentCredits} from unspent budget)</span>}
              </p>
              <p className="small muted">Credits go to the bank. {directorById(film.directorId).name} gains a level and reputation in this career.</p>
              {p.career && film.grade === 'F' && p.career.fStreak + 1 >= TUNING.career.firedAfterFs && <p className="bad">Another F: the studios will fire you.</p>}
            </div>
            <button
              className="primary"
              onClick={() => {
                const res = deliverFilm(p);
                if (!res.ok) return setMsg(res.reason);
                if (res.fired) alert(`${directorById(film.directorId).name} was fired after too many flops. The career is over: start a new one from Careers.`);
                update(() => res.profile);
              }}
            >
              Collect rewards → back to the studio board
            </button>
            {msg && <p className="bad">{msg}</p>}
          </>
        )}
      </div>

      <div className="row">
        <button disabled={stage === 0} onClick={() => setStage(stage - 1)}>◀ Back</button>
        {stage < STAGES.length - 1 && <button className="primary" onClick={() => setStage(stage + 1)}>Next: {STAGES[stage + 1]} ▶</button>}
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="weight big-meter">
      <span>{label}</span>
      <span className="bar"><span style={{ width: `${value}%` }} /></span>
      <span className="big">{value}</span>
    </div>
  );
}

function Rating({ title, value, factors, note }: { title: string; value: number; factors: Record<string, number>; note?: string }) {
  return (
    <>
      <div className="row between">
        <h2>{title}</h2>
        <span className="big rating">{value}</span>
      </div>
      {Object.entries(factors).map(([k, v]) => (
        <div key={k} className="weight">
          <span>{FACTOR_LABEL[k] ?? k}</span>
          <span className="bar"><span style={{ width: `${v}%` }} /></span>
          <span className="muted">{Math.round(v)}</span>
        </div>
      ))}
      {note && <p className="small muted">{note}</p>}
    </>
  );
}
