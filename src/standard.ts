// The lab standard: what a lab must contain before it may be called "livré" (docs/lab-standard.md). The numbers are the least of the
// three labs that were delivered first (Pelton, the ram pump, Piggott): a new lab may not be thinner than them. `checkStandard` is pure,
// `src/standard.test.ts` gathers the facts from the lab and its files.

export interface LabFacts {
  /** Ids of the 3D worlds. */
  worlds: string[];
  parts: number;
  assembly: number;
  install: number;
  lessons: number;
  quiz: number;
  sheets: number;
  /** Segments of the spoken guide manifest per language (null: no manifest). */
  narration: Record<'fr' | 'en', number | null>;
  /** README.md has an English part first and a French part. */
  readmeBilingual: boolean;
  /** public/lab.json: the tagline and tags are really filled. */
  labJsonFilled: boolean;
}

export const STANDARD = {
  worlds: 4,
  parts: 36,
  assembly: 20,
  install: 10,
  lessons: 6,
  quiz: 12,
  sheets: 8,
} as const;

/** What is missing, one line each (empty: the lab meets the automated part of the standard). */
export function checkStandard(f: LabFacts, std = STANDARD): string[] {
  const out: string[] = [];
  const atLeast = (what: string, have: number, need: number) => {
    if (have < need) out.push(`${what}: ${have}, the standard asks for at least ${need} (${need - have} missing)`);
  };
  atLeast('3D worlds', f.worlds.length, std.worlds);
  atLeast('parts with a sheet', f.parts, std.parts);
  atLeast('assembly guide steps', f.assembly, std.assembly);
  atLeast('installation guide steps', f.install, std.install);
  atLeast('lessons', f.lessons, std.lessons);
  atLeast('quiz questions', f.quiz, std.quiz);
  atLeast('A3 design drawings', f.sheets, std.sheets);
  // the spoken guide: French and English, one segment for the introduction, one per world, one per part
  const needed = 1 + f.worlds.length + f.parts;
  for (const lang of ['fr', 'en'] as const) {
    const n = f.narration[lang];
    if (n === null) out.push(`spoken guide in ${lang}: no manifest (no audio)`);
    else if (n < needed)
      out.push(`spoken guide in ${lang}: ${n} segments for ${needed} needed (introduction, worlds, parts)`);
  }
  if (!f.readmeBilingual) out.push('README: English first and a French part are required');
  if (!f.labJsonFilled) out.push('public/lab.json: tagline and tags must be filled');
  return out;
}
