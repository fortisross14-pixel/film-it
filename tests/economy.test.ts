// Economy simulation: what a first career earns, against shop prices.
// The report runs with  SIM=1 npx vitest run tests/economy.test.ts --reporter=verbose ; the guards at the end always run.
import { midStudio, playCareer, playStudio, veteranStudio, type CareerLog } from './sim/bots';
import { TUNING } from '../src/engine/tuning';
import { DIRECTORS } from '../src/engine/data/directors';
import { SETS } from '../src/engine/data/sets';
import { TOPIC_PACKS } from '../src/engine/data/topics';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const sim = env.SIM ? describe : describe.skip;
const q = (v: number[], f: number) => [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))];

sim('economy', () => {
  it('first careers', () => {
    const buyable = (xs: number[]) => xs.filter((x) => x > 0);
    const dirs = buyable(DIRECTORS.map((d) => (d.unlock.kind === 'buy' ? d.unlock.cost : 0)));
    const sets = buyable(SETS.map((s) => (s.unlock.kind === 'buy' ? s.unlock.cost : 0)));
    console.log(`prices: casting ${TUNING.talentPacks.casting.price} star ${TUNING.talentPacks.star.price} sets ${Math.min(...sets)}–${Math.max(...sets)} topics ${Math.min(...TOPIC_PACKS.filter((t) => t.cost).map((t) => t.cost))}–${Math.max(...TOPIC_PACKS.map((t) => t.cost))} directors ${Math.min(...dirs)}–${Math.max(...dirs)} start ${TUNING.startingMoney}`);
    for (const bot of ['careful', 'average', 'naive'] as const) {
      const earned: number[] = [], films: number[] = [], top: number[] = [], packs: number[] = [];
      const parts = { fee: 0, boxOffice: 0, rating: 0, awards: 0 };
      let n = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const { profile, logs } = playCareer(seed * 7919, bot, 10, seed % 2 ? 'starterA' : 'starterB');
        const c = profile.career ?? profile.careers[0];
        earned.push(c.earnings); films.push(c.films); top.push(c.topLevel); packs.push(c.packsEarned);
        for (const l of logs) { n++; parts.fee += l.pay.fee; parts.boxOffice += l.pay.boxOffice; parts.rating += l.pay.rating; parts.awards += l.pay.awards; }
      }
      const per = (k: keyof typeof parts) => Math.round(parts[k] / n);
      console.log(`${bot.padEnd(8)} earned p10/p50/p90 ${q(earned, 0.1)}/${q(earned, 0.5)}/${q(earned, 0.9)}  films ${q(films, 0.5)} top level ${q(top, 0.5)} packs earned ${q(packs, 0.5)}  per film: fee ${per('fee')} bo ${per('boxOffice')} rating ${per('rating')} awards ${per('awards')}`);
    }
  }, 600_000);
});

// Guards for the economy goal (always run): a first career buys a couple of talent packs and
// a little more, but never a director profile.
describe('first-career economy', () => {
  const cheapestDirector = Math.min(...DIRECTORS.filter((d) => d.unlock.kind === 'buy').map((d) => (d.unlock as { cost: number }).cost));
  const firstCareers = (bot: 'careful' | 'average') =>
    Array.from({ length: 12 }, (_, i) => {
      const { profile } = playCareer((i + 1) * 7919, bot, 10, i % 2 ? 'starterB' : 'starterA');
      return (profile.career ?? profile.careers[0]).earnings + TUNING.startingMoney;
    });
  it('a strong first career cannot afford a director', () => {
    const money = firstCareers('careful');
    expect(q(money, 0.9)).toBeLessThan(cheapestDirector);
    // …but it buys more than a pack or two.
    expect(q(money, 0.5)).toBeGreaterThan(4 * TUNING.talentPacks.casting.price);
  }, 120_000);
  it('an average first career buys a couple of casting calls', () => {
    expect(q(firstCareers('average'), 0.5)).toBeGreaterThanOrEqual(2 * TUNING.talentPacks.casting.price);
  }, 120_000);
});

sim('awards across the first careers', () => {
  it('report', () => {
    for (const bot of ['careful', 'average'] as const) {
      const N = 24;
      const runs = Array.from({ length: N }, (_, i) => playStudio((i + 1) * 104729, bot, 3, 10).byCareer);
      const vet = Array.from({ length: N }, (_, i) => playStudio((i + 1) * 15485863, bot, 1, 10, veteranStudio).byCareer);
      for (let k = 0; k < 4; k++) {
        const src = k < 3 ? runs : vet;
        const logs = src.flatMap((r) => r[k < 3 ? k : 0] ?? []);
        const early = logs.filter((l) => l.film <= 5), late = logs.filter((l) => l.film > 5);
        const rate = (ls: typeof logs, f: (l: (typeof logs)[0]) => number) => (ls.length ? (ls.reduce((a, l) => a + f(l), 0) / ls.length).toFixed(2) : '-');
        const fest = (l: (typeof logs)[0]) => l.awards.filter((a) => a.startsWith('Festival')).length;
        const main = (l: (typeof logs)[0]) => l.awards.filter((a) => !a.startsWith('Festival')).length;
        const mainWins = (l: (typeof logs)[0]) => l.winList.filter((a) => !a.startsWith('Festival')).length;
        const festWins = (l: (typeof logs)[0]) => l.winList.filter((a) => a.startsWith('Festival')).length;
        const lvl = rate(logs, (l) => l.level);
        console.log(`${bot} ${k < 3 ? `career ${k + 1}` : 'veteran'}: ${logs.length} films, avg level ${lvl} | per film, films 1-5: fest ${rate(early, fest)} (won ${rate(early, festWins)}) main noms ${rate(early, main)} wins ${rate(early, mainWins)} | films 6-10: fest ${rate(late, fest)} (won ${rate(late, festWins)}) main noms ${rate(late, main)} wins ${rate(late, mainWins)} | careers with any main win ${src.filter((r) => (r[k < 3 ? k : 0] ?? []).some((l) => mainWins(l) > 0)).length}/${N}`);
        const cats: Record<string, number> = {};
        for (const l of logs) for (const w of l.winList) { const k = w.replace(/:.*/, ''); cats[k] = (cats[k] ?? 0) + 1; }
        console.log('   wins by category', JSON.stringify(cats));
      }
    }
  }, 600_000);
});

sim('film quality by equipment', () => {
  it('report', () => {
    const stages = { starter: undefined, mid: midStudio, everything: veteranStudio };
    for (const bot of ['careful', 'average'] as const) {
      for (const [name, start] of Object.entries(stages)) {
        const logs = Array.from({ length: 16 }, (_, i) => playStudio((i + 1) * 7777, bot, 1, 10, start).byCareer[0]).flat();
        const g = (x: string) => Math.round((100 * logs.filter((l) => l.grade === x).length) / logs.length);
        const crit = logs.map((l) => l.critics), aud = logs.map((l) => l.audience);
        const acclaim = logs.filter((l) => l.critics >= 90 && l.audience >= 80).length;
        console.log(`${bot.padEnd(8)} ${name.padEnd(10)} films ${String(logs.length).padStart(3)} critics p50/p90/max ${q(crit, 0.5)}/${q(crit, 0.9)}/${Math.max(...crit)}  audience ${(q(aud, 0.5) / 10).toFixed(1)}/${(q(aud, 0.9) / 10).toFixed(1)}/${(Math.max(...aud) / 10).toFixed(1)}  A ${g('A')}% B ${g('B')}% C ${g('C')}% D ${g('D')}% F ${g('F')}%  acclaimed ${acclaim}  level ${(logs.reduce((a, l) => a + l.level, 0) / logs.length).toFixed(1)}`);
      }
    }
  }, 600_000);
});

sim('progression over 25 careers', () => {
  it('report', () => {
    for (const bot of ['careful', 'average'] as const) {
      const runs = Array.from({ length: 6 }, (_, i) => playStudio((i + 1) * 92821, bot, 25, 10).history);
      console.log(`--- ${bot} (6 studios) ---`);
      for (const k of [0, 1, 2, 4, 7, 9, 12, 14, 17, 19, 22, 24]) {
        const films = runs.flatMap((r) => r[k].films);
        const crit = films.map((l) => l.critics), aud = films.map((l) => l.audience);
        const acclaimed = films.filter((l) => l.critics >= 90 && l.audience >= 80).length;
        const wins = films.reduce((a, l) => a + l.winList.filter((w) => !w.startsWith('Festival')).length, 0);
        const noms = films.reduce((a, l) => a + l.awards.filter((w) => !w.startsWith('Festival')).length, 0);
        const g = (x: string) => Math.round((100 * films.filter((l) => l.grade === x).length) / films.length);
        console.log(`${bot} career ${String(k + 1).padStart(2)}: owned ${Math.round(100 * q(runs.map((r) => r[k].owned), 0.5))}%  earned ${q(runs.map((r) => r[k].earned), 0.5)}  films/career ${(films.length / runs.length).toFixed(1)}  critics p50/max ${q(crit, 0.5)}/${Math.max(...crit)}  audience ${(q(aud, 0.5) / 10).toFixed(1)}/${(Math.max(...aud) / 10).toFixed(1)}  A ${g('A')}% B ${g('B')}% C ${g('C')}%  acclaimed/career ${(acclaimed / runs.length).toFixed(1)}  noms ${(noms / runs.length).toFixed(1)} wins ${(wins / runs.length).toFixed(1)}  top level ${q(films.map((l) => l.level), 0.9)}`);
      }
    }
  }, 900_000);
});

// Progression guards (always run): unlocks must matter, careers must get better, and the
// shop should last about 20 careers for a skilled player and about 25 for an average one.
describe('progression across careers', () => {
  const med = (v: number[]) => q(v, 0.5);
  const critics = (runs: CareerLog[][], k: number) => med(runs.flatMap((r) => r[k].films.map((l) => l.critics)));
  const acclaimed = (runs: CareerLog[][], k: number) => runs.flatMap((r) => r[k].films).filter((l) => l.critics >= 90 && l.audience >= 80).length / runs.length;
  const owned = (runs: CareerLog[][], k: number) => med(runs.map((r) => r[k].owned));

  it('a skilled player: modest first careers, better every few careers, acclaim around career 20', () => {
    const runs = Array.from({ length: 4 }, (_, i) => playStudio((i + 1) * 92821, 'careful', 20, 10).history);
    expect(critics(runs, 0)).toBeLessThanOrEqual(72);
    expect(acclaimed(runs, 0)).toBe(0);
    expect(runs.flatMap((r) => [...r[0].films, ...r[1].films]).every((l) => l.awards.every((a) => a.startsWith('Festival')))).toBe(true);
    expect(critics(runs, 4)).toBeGreaterThan(critics(runs, 0));
    expect(critics(runs, 19)).toBeGreaterThan(critics(runs, 9));
    expect(acclaimed(runs, 19)).toBeGreaterThanOrEqual(2);
    expect(owned(runs, 9)).toBeLessThan(0.7);
    expect(owned(runs, 19)).toBeGreaterThanOrEqual(0.9);
  }, 120_000);

  it('an average player unlocks most of the shop by career 25', () => {
    const runs = Array.from({ length: 3 }, (_, i) => playStudio((i + 1) * 92821, 'average', 25, 10).history);
    expect(owned(runs, 14)).toBeLessThan(0.7);
    expect(owned(runs, 24)).toBeGreaterThanOrEqual(0.75);
    expect(critics(runs, 24)).toBeGreaterThan(critics(runs, 0) + 10);
  }, 120_000);
});
