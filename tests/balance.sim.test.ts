// Balance simulation: run with  SIM=1 npx vitest run tests/balance.sim.test.ts
import { playCareer, type FilmLog } from './sim/bots';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const sim = env.SIM ? describe : describe.skip;

function report(logs: FilmLog[], label: string) {
  const n = logs.length;
  const avg = (k: keyof FilmLog) => (logs.reduce((s, l) => s + (l[k] as number), 0) / n);
  const pct = (pred: (l: FilmLog) => boolean) => `${Math.round((logs.filter(pred).length / n) * 100)}%`;
  const grades = Object.fromEntries(['A', 'B', 'C', 'D', 'F'].map((g) => [g, pct((l) => l.grade === g)]));
  const q = (k: keyof FilmLog, f: number) => { const v = logs.map((l) => l[k] as number).sort((a, b) => a - b); return v[Math.floor(f * (v.length - 1))]; };
  const comp = (k: string) => Math.round(logs.reduce((s, l) => s + l.components[k], 0) / n);
  console.log(`\n=== ${label} (${n} films) ===`);
  console.log('grades', grades, 'avg score', avg('score').toFixed(1), 'satisfaction', avg('satisfaction').toFixed(1));
  console.log('components  boxOffice', comp('boxOffice'), 'public', comp('public'), 'critics', comp('critics'), 'awards', comp('awards'));
  console.log(`audience p10/p50/p90 ${(q('audience', 0.1) / 10).toFixed(1)}/${(q('audience', 0.5) / 10).toFixed(1)}/${(q('audience', 0.9) / 10).toFixed(1)}  critics ${q('critics', 0.1)}/${q('critics', 0.5)}/${q('critics', 0.9)}`);
  console.log(`box office / target p10/p50/p90 ${q('boRatio', 0.1).toFixed(2)}/${q('boRatio', 0.5).toFixed(2)}/${q('boRatio', 0.9).toFixed(2)}`);
  console.log(`spent / budget p10/p50/p90 ${q('spentRatio', 0.1).toFixed(2)}/${q('spentRatio', 0.5).toFixed(2)}/${q('spentRatio', 0.9).toFixed(2)}  over budget ${pct((l) => l.spentRatio > 1)}  late ${pct((l) => l.weeksLate > 0)}`);
  console.log(`script ${avg('script').toFixed(0)} casting ${avg('casting').toFixed(0)} cut ${avg('cut').toFixed(0)} poster ${avg('poster').toFixed(0)}  missed reqs ${avg('missed').toFixed(2)}`);
  console.log(`nominated ${pct((l) => l.noms > 0)} won ${pct((l) => l.wins > 0)}  money/film $${avg('money').toFixed(0)}K  level ${avg('level').toFixed(1)}  sequels ${pct((l) => l.sequel)}`);
  const arches = [...new Set(logs.map((l) => l.archetype))];
  for (const a of arches) {
    const L = logs.filter((l) => l.archetype === a);
    const m = (f: (l: FilmLog) => number) => Math.round(L.reduce((s, l) => s + f(l), 0) / L.length);
    console.log(`  ${a.padEnd(11)} n=${L.length} score ${m((l) => l.score)} sat ${m((l) => l.satisfaction)} bo ${m((l) => l.components.boxOffice)} pub ${m((l) => l.components.public)} crit ${m((l) => l.components.critics)} aw ${m((l) => l.components.awards)} missed ${(L.reduce((s, l) => s + l.missed, 0) / L.length).toFixed(1)} spent ${(L.reduce((s, l) => s + l.spentRatio, 0) / L.length).toFixed(2)} late ${m((l) => l.weeksLate)}`);
  }
  const fk = Object.keys(logs[0].factors);
  console.log('  factors', Object.fromEntries(fk.map((k) => [k, Math.round(logs.reduce((s, l) => s + l.factors[k], 0) / n)])));
  const missedCount: Record<string, number> = {};
  for (const l of logs) for (const m of l.missedList) { const k = m.replace(/[0-9.]+/g, '#'); missedCount[k] = (missedCount[k] ?? 0) + 1; }
  console.log('  missed', missedCount);
  const awardCount: Record<string, number> = {};
  for (const l of logs) for (const a of l.awards) { const k = a.replace(/:.*/, ''); awardCount[k] = (awardCount[k] ?? 0) + 1; }
  console.log('  awards (noms)', awardCount);
  const byArch: Record<string, string[]> = {};
  for (const l of logs) (byArch[l.archetype] ??= []).push(l.grade);
  console.log('by archetype', Object.fromEntries(Object.entries(byArch).map(([k, v]) => [k, v.join('')])));
}

sim('balance simulation', () => {
  it('careful vs naive careers', () => {
    for (const bot of ['careful', 'average', 'naive'] as const) {
      const logs: FilmLog[] = [];
      for (let seed = 1; seed <= 10; seed++) logs.push(...playCareer(seed * 7919, bot, 6, seed % 2 ? 'starterA' : 'starterB').logs);
      report(logs, bot);
    }
  }, 300_000);
});
