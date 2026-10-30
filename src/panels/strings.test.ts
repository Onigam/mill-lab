import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setLang } from '@onigam/lab-kit/i18n';
import { LAB_STRINGS, months, num, t, type UiKey } from '../i18n/ui';
import { installFakeDom } from './test-dom';

// The lab's interface strings: French and English written together, same detail, no placeholder, no research code, no
// internal word, and no number in a text that does not come from docs/research.md or docs/physics.md.

beforeAll(() => installFakeDom()); // setLang writes the language on the document element
afterEach(() => setLang('fr'));

const entries = Object.entries(LAB_STRINGS);
/** The numbers of a text, decimal commas read as points: "3,5 m/s" and "3.5 m/s" give the same list. */
const numbers = (s: string): string[] => (s.replace(/(\d),(\d)/g, '$1.$2').match(/\d+(\.\d+)?/g) ?? []).sort();

/**
 * Every number a text may contain, with its source.
 * 200: K3 (the prototype); 30, 60: K6 (the speed of the screw in the video); 22: the usual inclination of installed screws
 * (docs/physics.md §1.2, Simmons & Lubitz 2024); 50: the speed rule n = 50 / D^(2/3) (docs/physics.md §1.2, Nagel 1968 as quoted by
 * Rorres 2000); 80, 90, 85, 50, 60, 75: the efficiency ranges of the wheels in the sources (docs/research.md §1, S6 and S7);
 * 365: days of a year.
 */
const ALLOWED = new Set(['22', '30', '50', '60', '75', '80', '85', '90', '200', '365']);

describe('interface strings', () => {
  it('never shows a research code (K12, S3…) or an internal word (world, id) to the visitor', () => {
    for (const [key, [fr, en]] of entries) {
      for (const text of [fr, en]) {
        expect(text, key).not.toMatch(/\b[KS]\d{1,2}\b/);
        expect(text, key).not.toMatch(/\bid\b|\bworld\b|\bpreset id\b|\bundefined\b/i);
      }
    }
  });
  it('there are strings to check', () => {
    expect(entries.length).toBeGreaterThan(150);
  });
  it('every string exists in both languages, non-empty, with no placeholder', () => {
    for (const [key, [fr, en]] of entries) {
      expect(fr.trim().length, `${key} fr`).toBeGreaterThan(0);
      expect(en.trim().length, `${key} en`).toBeGreaterThan(0);
      for (const text of [fr, en]) expect(text, key).not.toMatch(/TODO|FIXME|lorem|xxx|\[\[|\{\{/i);
    }
  });
  it('French and English carry the same numbers', () => {
    for (const [key, [fr, en]] of entries) expect(numbers(fr), key).toEqual(numbers(en));
  });
  it('French and English have the same level of detail: a long text is never far longer than its translation', () => {
    for (const [key, [fr, en]] of entries) {
      if (fr.length < 40 && en.length < 40) continue;
      expect(fr.length / en.length, key).toBeGreaterThan(0.6);
      expect(fr.length / en.length, key).toBeLessThan(1.7);
    }
  });
  it('only translated where it matters: the same text in both languages is a unit, a name or a single word', () => {
    for (const [key, [fr, en]] of entries) {
      if (fr === en) expect(fr.split(/\s+/).length, `${key}: ${fr}`).toBeLessThanOrEqual(2);
    }
  });
  it('no number in a text but those of the research (listed in this test, with their source)', () => {
    for (const [key, [, en]] of entries) {
      const text = en.replace(/\bA3\b|\b3D\b/g, '');
      for (const n of numbers(text)) expect(ALLOWED.has(n), `${key}: ${n} in « ${en} »`).toBe(true);
    }
  });
  it('the typographic spaces of French are the kit’s: a colon is followed by a space', () => {
    setLang('fr');
    for (const [key] of entries) expect(t(key as UiKey), key).not.toMatch(/:\S/);
  });
  it('twelve month names in each language', () => {
    for (const lang of ['fr', 'en'] as const) {
      setLang(lang);
      expect(months()).toHaveLength(12);
      for (const m of months()) expect(m.length).toBeGreaterThan(2);
    }
  });
});

describe('num', () => {
  it('writes the decimal separator of the language', () => {
    setLang('fr');
    expect(num(7.5, 1)).toBe('7,5');
    setLang('en');
    expect(num(7.5, 1)).toBe('7.5');
    expect(num(Number.NaN)).toBe('—');
    expect(num(-0.001, 1)).toBe('0.0');
  });
});
