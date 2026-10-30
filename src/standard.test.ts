import { describe, expect, it } from 'vitest';
import { lab } from './lab';
import { STANDARD, checkStandard, type LabFacts } from './standard';

// The automated part of the lab standard (docs/lab-standard.md). `public/lab.json` carries the state of the lab:
//   "status": "building"  -> the report is printed, the test passes (the lab is not on the showcase as delivered);
//   "status": "released"  -> every shortfall fails the test (and the CI), the only way to a green "livré".
// An exception the owner has accepted in writing is listed in `"exceptions"` with its date and reason; it lets that line pass.

const raw = import.meta.glob(['../public/lab.json', '../public/audio/*/manifest.json', '../README.md'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const json = JSON.parse(raw['../public/lab.json']!) as {
  status?: 'building' | 'released';
  tagline?: { fr?: string; en?: string };
  tags?: string[];
  exceptions?: { line: string; date: string; reason: string }[];
};

function segments(lang: 'fr' | 'en'): number | null {
  const text = raw[`../public/audio/${lang}/manifest.json`];
  if (text === undefined) return null;
  const m = JSON.parse(text) as { segments?: unknown };
  return Array.isArray(m.segments) ? m.segments.length : Object.keys((m.segments as object) ?? {}).length;
}

const readme = raw['../README.md'] ?? '';
const facts: LabFacts = {
  worlds: lab.scenes.map((s) => s.id),
  parts: lab.parts.length,
  assembly: lab.guides?.assembly?.steps.length ?? 0,
  install: lab.guides?.install?.steps.length ?? 0,
  lessons: lab.lessons?.items.length ?? 0,
  quiz: (lab.lessons?.items ?? []).reduce((n, l) => n + (l.quiz?.length ?? 0), 0),
  sheets: lab.plans?.sheets.length ?? 0,
  narration: { fr: segments('fr'), en: segments('en') },
  readmeBilingual: /^## Fran[cç]ais/m.test(readme),
  labJsonFilled:
    (json.tags?.length ?? 0) > 0 &&
    !/à remplacer|to replace/i.test(`${json.tagline?.fr ?? ''} ${json.tagline?.en ?? ''}`),
};

describe('the lab standard', () => {
  const missing = checkStandard(facts);
  const excused = new Set((json.exceptions ?? []).map((e) => e.line));
  const open = missing.filter((line) => ![...excused].some((e) => line.startsWith(e)));

  it('knows the state of the lab', () => {
    expect(['building', 'released', undefined]).toContain(json.status);
  });

  // one line per shortfall: a todo while the lab is being built (it shows in the report), a failure once the lab says it is released
  if (json.status === 'released') for (const line of open) it(line, () => expect.fail(line));
  else for (const line of open) it.todo(line);

  it('has thresholds that are not zero', () => {
    expect(STANDARD.worlds).toBeGreaterThan(0);
  });
});
