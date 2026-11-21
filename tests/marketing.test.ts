import { postProfile } from './helpers';
import type { Actor, Film } from '../src/engine/types';
import {
  editPoster, effectiveBoxOfficeTarget, knownDirector, marketingLevel, marketingSpend, posterEffect, posterOf, posterScore,
  regenerateFee, regeneratePoster, requestMarketing, type MarketingResult,
} from '../src/engine/marketing';
import { computeResults } from '../src/engine/premiere';
import { gradeFilm } from '../src/engine/grade';
import { createRng } from '../src/engine/rng';
import { spent } from '../src/engine/script';
import { weeksUsed } from '../src/engine/shooting';
import { TUNING } from '../src/engine/tuning';

const ok = (r: MarketingResult): Film => { if (!r.ok) throw new Error(r.reason); return r.film; };
const film = () => postProfile('thriller').activeFilm!;
/** Same film with chosen star power per role. */
const withStars = (f: Film, sp: number[]): Film => ({ ...f, roles: f.roles.map((r, i) => ({ ...r, actor: { ...(r.actor as Actor), starPower: sp[i] ?? 50 } })) });

describe('poster', () => {
  it('starts with a generated draft and regenerates for a rising fee', () => {
    const f = film();
    const d0 = posterOf(f);
    expect(d0.regenerations).toBe(0);
    const fee1 = regenerateFee(f);
    const g = ok(regeneratePoster(f));
    expect(posterOf(g).regenerations).toBe(1);
    expect(spent(g)).toBe(spent(f) + fee1);
    expect(regenerateFee(g)).toBe(fee1 * 2);
    expect(posterOf(g).seed).not.toBe(d0.seed);
  });

  it('rewards a style and font that suit the genre', () => {
    const f = film();
    const good = posterScore(f, [], { ...posterOf(f), style: 'skyline', titleFont: 'bold' });
    const bad = posterScore(f, [], { ...posterOf(f), style: 'confetti', titleFont: 'playful' });
    expect(good.total).toBeGreaterThan(bad.total);
    expect(bad.tips.join(' ')).toMatch(/doesn't sell thriller|doesn't suit thriller/);
  });

  it('stars billed big, unknowns small', () => {
    const f = withStars(film(), [90, 20, 50]);
    const [lead, nobody] = f.roles;
    const right = posterScore(f, [], { ...posterOf(f), billing: { [lead.id]: 'l', [nobody.id]: 'hidden' } });
    const wrong = posterScore(f, [], { ...posterOf(f), billing: { [lead.id]: 's', [nobody.id]: 'l' } });
    expect(right.billing).toBeGreaterThan(wrong.billing + 30);
    expect(wrong.tips.some((t) => t.includes('superstar'))).toBe(true);
    expect(wrong.tips.some((t) => t.includes('unknown'))).toBe(true);
  });

  it('faces: superstars yes, unknowns no, not too many', () => {
    const f = withStars(film(), [90, 20, 50]);
    const [lead, nobody] = f.roles;
    const star = posterScore(f, [], { ...posterOf(f), faces: [lead.id] }).faces;
    const none = posterScore(f, [], { ...posterOf(f), faces: [] }).faces;
    const nob = posterScore(f, [], { ...posterOf(f), faces: [nobody.id] }).faces;
    expect(star).toBeGreaterThan(none);
    expect(none).toBeGreaterThan(nob);
    expect(posterScore(f, [], { ...posterOf(f), style: 'portrait', faces: [] }).tips).toContain('A star-portrait poster needs faces on it');
  });

  it('director credit only pays once the director is known', () => {
    const f = film();
    const big = { ...posterOf(f), directorSize: 'l' as const };
    const unknown = posterScore(f, [], big).director;
    const history = Array.from({ length: TUNING.poster.knownDirectorFilms }, () => ({ film: f, completedAt: 0 }));
    expect(knownDirector(f, history)).toBe(true);
    expect(posterScore(f, history, big).director).toBeGreaterThan(unknown);
  });

  it('a better poster sells more tickets', () => {
    const f = withStars(film(), [90, 70, 50]);
    const [lead, two] = f.roles;
    const great = ok(editPoster(f, { titleFont: 'bold', titleSize: 'l', billing: { [lead.id]: 'l', [two.id]: 'm' }, faces: [lead.id], frame: 'neon' }));
    const poor = ok(editPoster(f, { titleFont: 'playful', titleSize: 's', billing: { [lead.id]: 'hidden' }, faces: [] }));
    expect(posterScore(great).total).toBeGreaterThan(posterScore(poor).total);
    expect(posterEffect(100).opening).toBeGreaterThan(posterEffect(0).opening);
    expect(computeResults(createRng(1), great).openingWeekend).toBeGreaterThan(computeResults(createRng(1), poor).openingWeekend);
  });
});

describe('marketing', () => {
  it('asking for more takes a week, raises the box office and the target', () => {
    const f = film();
    expect(marketingLevel(f)).toBe('standard');
    const push = ok(requestMarketing(f, 'push'));
    expect(weeksUsed(push)).toBe(weeksUsed(f) + 1);
    expect(marketingSpend(push)).toBeGreaterThan(marketingSpend(f));
    expect(effectiveBoxOfficeTarget(push)).toBeGreaterThan(f.contract.boxOfficeTarget);
    expect(computeResults(createRng(3), push).boxOffice).toBeGreaterThan(computeResults(createRng(3), f).boxOffice);
    expect(requestMarketing(push, 'push').ok).toBe(false);
  });

  it('asking for less lowers the target: a weak film grades better against it', () => {
    const f = film();
    const cut = ok(requestMarketing(f, 'cut'));
    expect(effectiveBoxOfficeTarget(cut)).toBeLessThan(f.contract.boxOfficeTarget);
    const r = { ...computeResults(createRng(5), f), boxOffice: f.contract.boxOfficeTarget * 0.6 };
    expect(gradeFilm(cut, r).components.boxOffice).toBeGreaterThan(gradeFilm(f, r).components.boxOffice);
  });

  it('only during editing', () => {
    expect(requestMarketing({ ...film(), phase: 'shooting' }, 'push').ok).toBe(false);
  });
});
