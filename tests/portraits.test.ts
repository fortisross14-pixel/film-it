import { describe, expect, it } from 'vitest';
import { FAMOUS, generateActorPool } from '../src/engine/data/actors';
import { createRng } from '../src/engine/rng';
import { assignPortraits, expressionCol, parsePortrait, portraitOf } from '../src/engine/portraits';
import type { Actor } from '../src/engine/types';

const actor = (over: Partial<Actor> = {}): Actor => ({
  id: 'act-x', name: 'Zarvo Quillent', starPower: 40, acting: 60, rarity: 'rare', traits: [], age: 'adult', gender: 'm',
  skills: { action: 50, comedy: 50, drama: 50, romance: 50, menace: 50 }, ...over,
});

describe('portraits', () => {
  it('famous parodies get their own look-alike cell', () => {
    expect(portraitOf(actor({ name: FAMOUS[0].name }))).toBe('famous:0');
    const idris = FAMOUS.findIndex((f) => f.name === 'Idris Elbow');
    expect(parsePortrait(portraitOf(actor({ name: 'Idris Elbow' })))).toEqual({ sheet: 'famous', row: 5, col: 5 });
    expect(idris).toBe(35);
  });

  it('matches sheet to age, rows to gender, column to the strongest skill', () => {
    const villain = actor({ age: 'veteran', gender: 'f', skills: { action: 40, comedy: 30, drama: 50, romance: 20, menace: 90 } });
    const cell = parsePortrait(portraitOf(villain))!;
    expect(cell.sheet).toBe('veteran');
    expect(cell.row).toBeLessThan(3);
    expect(cell.col).toBe(4);
    expect(expressionCol(actor())).toBe(5); // nothing stands out → calm
    expect(parsePortrait(portraitOf(actor({ gender: undefined, name: 'Hannah Smith' })))!.row).toBeLessThan(3);
  });

  it('a generated pool has no two actors sharing a face', () => {
    const pool = generateActorPool(createRng(5));
    const keys = pool.map((a) => a.portrait);
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(pool.length);
    for (const a of pool) {
      const c = parsePortrait(a.portrait!)!;
      if (c.sheet !== 'famous') {
        expect(c.sheet).toBe(a.age);
        expect(c.row < 3).toBe(a.gender === 'f');
      }
    }
  });

  it('keeps stored portraits and fills the rest', () => {
    const pool = assignPortraits([actor({ id: 'a', portrait: 'adult:23' }), actor({ id: 'b' })]);
    expect(pool[0].portrait).toBe('adult:23');
    expect(pool[1].portrait).not.toBe('adult:23');
  });
});
