// Economy simulation: what a first career earns, against shop prices.
// The report runs with  SIM=1 npx vitest run tests/economy.test.ts --reporter=verbose ; the guards at the end always run.
import { playCareer } from './sim/bots';
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
