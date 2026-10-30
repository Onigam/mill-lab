// Numbers of the sheets: every length is read from the single source of dimensions (src/three/dims.ts, metres) or from the simulation
// (src/sim, through ./model.ts), and carries its status so that a sheet can mark it. Nothing is retyped. Every number that a label prints
// goes through `lab` / `figLab` here, which also records it in `PRINTED`, so that the test can tell a printed number from a typed one.
import { l, type L } from '@onigam/lab-kit/i18n';
import { ASSUMED_KEYS, DERIVED_KEYS, ESTIMATE_KEYS, FIG, MODEL_KEYS, type FigName } from '../data/figures';
import { nEn, nFr } from '../data/units';
import {
  BEARING,
  BOLT,
  CORE_PLATE,
  DESIGN,
  DRIVE,
  ELECTRONICS,
  GENERATOR,
  GENERATOR_DESIGN,
  PLATFORM,
  POOLS,
  POWERROOM,
  ROOT_STRIP,
  SCREW,
  SITE,
  TROUGH,
} from '../three/dims';

export const DEG = Math.PI / 180;

// ------------------------------------------------------------------------------------------------ status of a number

/**
 * What a sheet prints after a dimension: given by a published source (no mark), derived by the published design rules at the lab's design
 * point (†), or an estimate of the 3D model / an assumption of the model (*). A value computed from an estimate is an estimate. The model
 * results (src/sim at the design point) carry no mark: they sit in a box that says MODEL RESULT.
 */
export type Status = 'R' | 'D' | 'E';
export const MARK: Record<Status, string> = { R: '', D: '†', E: '*' };

/** The sections of dims.ts that the sheets read. */
const SECTIONS = {
  SCREW,
  DESIGN,
  TROUGH,
  BEARING,
  DRIVE,
  GENERATOR,
  GENERATOR_DESIGN,
  ELECTRONICS,
  PLATFORM,
  POWERROOM,
  POOLS,
  SITE,
  BOLT,
  ROOT_STRIP,
  CORE_PLATE,
} as const;
export type Section = keyof typeof SECTIONS;

/**
 * Constants of dims.ts that are NOT estimates: given by a published source (R) or derived by the design rules (D). Every other constant is an
 * estimate. The test (drawings.test.ts) reads the JSDoc of dims.ts and of machine.ts and fails when a sheet marks a dimension higher than the
 * comment says.
 */
export const STATUS: Record<string, Status> = {
  'SCREW.threads': 'R',
  'SCREW.radiusRatio': 'R',
  'SCREW.pitchRatio': 'R',
  'SCREW.slopeDeg': 'R',
  'SCREW.outerDiameter': 'D',
  'SCREW.innerDiameter': 'D',
  'SCREW.pitch': 'D',
  'SCREW.gap': 'D',
  'SCREW.bucketVolume': 'D',
  'SCREW.buckets': 'D',
  'SCREW.bucketDepth': 'D',
  'SCREW.bladeSpacing': 'D',
  'SCREW.tailDepth': 'D',
  'SCREW.length': 'D',
  'DESIGN.flow': 'D',
  'DESIGN.slopeDeg': 'R',
  'DESIGN.chainRatio': 'D',
  'DESIGN.beltRatio': 'D',
  'DESIGN.screwRpm': 'D',
  'DESIGN.head': 'D',
};

/**
 * Constants whose comment in dims.ts says "derived" but which a sheet prints as estimates (*): the head of the design point is an assumption
 * of the model (figures.ts: ASSUMED, inside the 1.5 to 2 m of the video) and the length of the screw rests on the assumption that the two
 * submerged ends cancel (docs/physics.md §1.2: estimate). `STATUS` stays the faithful copy that the test checks; this set only lowers a mark.
 */
export const MARKED_LOWER = new Set<string>(['SCREW.length', 'DESIGN.head']);

/** The constants whose status is the one of a constant of src/sim/machine.ts (reported there), not of the comment in dims.ts. */
export const FROM_MACHINE: Record<string, string> = {
  'SCREW.threads': 'BLADES',
  'SCREW.radiusRatio': 'RADIUS_RATIO',
  'SCREW.pitchRatio': 'PITCH_RATIO',
  'SCREW.slopeDeg': 'SLOPE_DEG_DEFAULT',
  'DESIGN.slopeDeg': 'SLOPE_DEG_DEFAULT',
};

/** Ids (`SECTION.key`) of the dims.ts constants the sheets have asked for: the test checks their marks against the comments. */
export const USED = new Set<string>();
/** The numbers the sheets have printed, in the English spelling (the test compares them with the rendered texts). */
export const PRINTED = new Set<string>();

/** A value of dims.ts (metres, degrees or a plain count, as the constant says) and its status. */
export interface Dim {
  v: number;
  status: Status;
  id: string;
}

type Indexable = Record<string, unknown>;

/** `dim('SITE', 'weir', 'thickness')` reads SITE.weir.thickness; the status is the one of `SITE.weir`. `sub` may be an array index too. */
export function dim(section: Section, key: string, ...sub: (string | number)[]): Dim {
  let v: unknown = (SECTIONS[section] as unknown as Indexable)[key];
  for (const s of sub) v = (v as Indexable)[s];
  if (typeof v !== 'number')
    throw new Error(`dims.ts ${section}.${key}${sub.map((s) => `.${s}`).join('')} is not a number`);
  const id = `${section}.${key}`;
  USED.add(id);
  const status = MARKED_LOWER.has(id) ? 'E' : (STATUS[id] ?? 'E');
  return { v, status, id };
}

// ------------------------------------------------------------------------------------------------ labels

/** Concatenation of bilingual pieces (plain strings stay as they are in both languages). */
export function cat(...parts: (string | L)[]): L {
  return l(
    parts.map((x) => (typeof x === 'string' ? x : x.fr)).join(''),
    parts.map((x) => (typeof x === 'string' ? x : x.en)).join(''),
  );
}

/** Label of a number with `digits` decimals in each language (7,5 / 7.5), a prefix, a unit suffix and the mark. */
export function lab(value: number, digits: number, status: Status | null, prefix = '', suffix: string | L = ''): L {
  PRINTED.add(nEn(value, digits));
  const mark = status ? MARK[status] : '';
  const [sf, se] = typeof suffix === 'string' ? [suffix, suffix] : [suffix.fr, suffix.en];
  return l(`${prefix}${nFr(value, digits)}${sf}${mark}`, `${prefix}${nEn(value, digits)}${se}${mark}`);
}

/** Label of a dims.ts value (`times` and `digits` rescale it: metres to millimetres is 1000). */
export const labOf = (d: Dim, digits: number, prefix = '', suffix: string | L = '', times = 1): L =>
  lab(d.v * times, digits, d.status, prefix, suffix);

/** A plain number in both languages (no mark): 7,5 / 7.5. */
export const num = (v: number, digits = 0): L => {
  PRINTED.add(nEn(v, digits));
  return l(nFr(v, digits), nEn(v, digits));
};

/** A figure of figures.ts, read by name: its value and the digits the texts print. */
export const fig = (name: FigName): readonly [number, number] => FIG[name];

/** The mark a figure of figures.ts carries when a sheet prints it: derived (†), assumed or estimated (*), a model result none. */
export function figStatus(name: FigName): Status | null {
  if (MODEL_KEYS.has(name)) return null;
  if (DERIVED_KEYS.has(name)) return 'D';
  if (ASSUMED_KEYS.has(name) || ESTIMATE_KEYS.has(name)) return 'E';
  return 'R';
}

/** Label of a figure of figures.ts with its mark (none for a model result). */
export const figLab = (name: FigName, prefix = '', suffix: string | L = ''): L => {
  const [value, digits] = FIG[name];
  return lab(value, digits, figStatus(name), prefix, suffix);
};

/** Metres to millimetres for a model coordinate (the Drawing views work in model millimetres). */
export const k = (m: number): number => m * 1000;

/** The scale of a view as the title block and the captions print it: "1:35". */
export function scaleText(n: number): string {
  PRINTED.add(String(n));
  return `1:${n}`;
}

/** The tailrace of the video's mill is about 100 m long (reported: research §3, the main video at 12:36): the one reported length of PL-01. */
export const TAILRACE_REAL_M = 100;

/** Several numbers of the same kind joined by " × " and followed by one unit and one mark ("11 × 7,2 m*"): the digits are those the value needs (at most one decimal). */
export function labX(values: number[], status: Status | null, suffix: string | L = ''): L {
  const digits = (v: number): number => (Math.abs(v - Math.round(v)) < 1e-9 ? 0 : 1);
  const parts = values.map((v) => {
    PRINTED.add(nEn(v, digits(v)));
    return { fr: nFr(v, digits(v)), en: nEn(v, digits(v)) };
  });
  const mark = status ? MARK[status] : '';
  const [sf, se] = typeof suffix === 'string' ? [suffix, suffix] : [suffix.fr, suffix.en];
  return l(`${parts.map((x) => x.fr).join(' × ')}${sf}${mark}`, `${parts.map((x) => x.en).join(' × ')}${se}${mark}`);
}
