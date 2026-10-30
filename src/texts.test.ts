import { describe, expect, it } from 'vitest';
import { LAB_STRINGS } from './i18n/ui';
import { ASSEMBLY } from './data/assembly';
import { CHAPTERS } from './data/chapters';
import { INSTALL } from './data/install';
import { LESSONS } from './data/lessons';
import { OVERVIEWS } from './data/overviews';
import { PARTS } from './data/parts';
import { SHEETS } from './drawings';

// The lead's lint of every text a visitor can read, in both languages: nothing empty, nothing left over from the template, the
// typographic apostrophe, no doubled or stray spaces, no leaked code, and each French text paired with an English one.

type Pair = { where: string; fr: string; en: string };

/** Every `{ fr, en }` pair found anywhere in a data structure, with the path where it was found. */
function pairs(value: unknown, where: string, out: Pair[] = []): Pair[] {
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'string' && where.includes('ui.'))
      out.push({ where, fr: value[0], en: value[1] });
    else value.forEach((v, i) => pairs(v, `${where}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.fr === 'string' && typeof o.en === 'string') out.push({ where, fr: o.fr, en: o.en });
    else for (const [k, v] of Object.entries(o)) if (typeof v !== 'function') pairs(v, `${where}.${k}`, out);
  }
  return out;
}

const ALL: Pair[] = [
  ...pairs(PARTS, 'parts'),
  ...pairs(ASSEMBLY, 'assembly'),
  ...pairs(INSTALL, 'install'),
  ...pairs(LESSONS, 'lessons'),
  ...pairs(OVERVIEWS, 'overviews'),
  ...pairs(
    SHEETS.map((s) => ({ title: s.title, description: s.description })),
    'sheets',
  ),
  ...CHAPTERS.map(([ts, fr, en]) => ({ where: `chapters ${ts}`, fr, en })),
  ...pairs(LAB_STRINGS, 'ui.strings'),
];

const problems = (check: (t: string, p: Pair) => string | null): string[] =>
  ALL.flatMap((p) =>
    (['fr', 'en'] as const).flatMap((lang) => {
      const why = check(p[lang], p);
      return why ? [`${p.where} (${lang}): ${why}: “${p[lang].slice(0, 70)}”`] : [];
    }),
  );

describe('every visitor text, French and English', () => {
  it('finds the texts it is supposed to lint', () => {
    expect(ALL.length).toBeGreaterThan(1000);
  });

  it('has no empty text', () => {
    expect(problems((t) => (t.trim() === '' ? 'empty' : null))).toEqual([]);
  });

  it('writes apostrophes the typographic way (’), never the typewriter one', () => {
    expect(problems((t) => (/[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]/.test(t) ? 'straight apostrophe' : null))).toEqual([]);
  });

  it('has no doubled, leading or trailing space, and no space before a comma or a full stop', () => {
    expect(
      problems((t) => {
        if (/ {2,}/.test(t)) return 'doubled space';
        if (t !== t.trim()) return 'leading or trailing space';
        if (/\s[,.]($|\s)/.test(t)) return 'space before , or .';
        return null;
      }),
    ).toEqual([]);
  });

  it('leaks no code, no template marker and no research code', () => {
    expect(
      problems((t) => {
        if (/undefined|NaN|\[object|\{[a-zA-Z]+\}|\$\{/.test(t)) return 'leaked code or placeholder';
        if (/\b[KS]\d{1,2}\b/.test(t)) return 'research code';
        if (/flywheel|volant|template|TODO|lorem/i.test(t)) return 'template leftover';
        return null;
      }),
    ).toEqual([]);
  });

  it('pairs every French text with an English text of a similar length (no text left in one language only)', () => {
    const odd = ALL.filter((p) => {
      const a = p.fr.length;
      const b = p.en.length;
      return a > 40 && b > 40 && (a / b > 2.2 || b / a > 2.2);
    }).map((p) => `${p.where}: fr ${p.fr.length} / en ${p.en.length}`);
    expect(odd).toEqual([]);
  });
});
