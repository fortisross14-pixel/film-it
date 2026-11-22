import { newProfile } from '../src/engine/profile';
import { buyUpgrade, upgradeForSale } from '../src/engine/progression';
import { UPGRADES, gear } from '../src/engine/data/upgrades';
import { autoPolish, setMusic, setPolish } from '../src/engine/post';
import { requestMarketing } from '../src/engine/marketing';
import { postProfile } from './helpers';

describe('studio upgrades', () => {
  it('are bought with money, in order', () => {
    let p = { ...newProfile('T', 1), money: 100_000 };
    expect(upgradeForSale(p, 'post2')).toMatchObject({ ok: false, reason: expect.stringMatching(/Post house/) });
    expect(buyUpgrade({ ...p, money: 0 }, 'post1').ok).toBe(false);
    for (const u of UPGRADES) {
      const r = buyUpgrade(p, u.id);
      if (!r.ok) throw new Error(r.reason);
      p = r.profile;
    }
    expect(p.unlocks.upgrades).toHaveLength(UPGRADES.length);
    expect(p.money).toBe(100_000 - UPGRADES.reduce((a, u) => a + u.cost, 0));
    expect(buyUpgrade(p, 'post1').ok).toBe(false);
  });

  it('a new studio has basic effects, library music and no push campaign', () => {
    expect(gear([])).toEqual({ polish: ['none', 'basic'], music: ['none', 'library'], marketing: ['cut', 'standard'], agency: 0 });
    expect(gear(['post1', 'composer']).polish).toEqual(['none', 'basic', 'pro']);
  });

  it('films keep the studio gear they started with', () => {
    const f = { ...postProfile().activeFilm!, upgrades: [] };
    const s = f.scenes[0].id;
    expect(setPolish(f, s, 'vfx', 'premium')).toMatchObject({ ok: false, reason: expect.stringMatching(/VFX studio/) });
    expect(setPolish(f, s, 'vfx', 'basic').ok).toBe(true);
    expect(setMusic(f, 'star').ok).toBe(false);
    expect(setMusic(f, 'library').ok).toBe(true);
    expect(requestMarketing(f, 'push').ok).toBe(false);
    const auto = autoPolish(f, 1e9);
    expect(auto.scenes.every((x) => x.vfx === 'none' || x.vfx === 'basic')).toBe(true);
    expect(['none', 'library']).toContain(auto.music);
    // Films from older saves (no record) allow everything.
    expect(setPolish({ ...f, upgrades: undefined }, s, 'vfx', 'premium').ok).toBe(true);
  });
});
