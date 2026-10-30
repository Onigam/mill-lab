// The figures of the lessons and the way a lesson text is built from them (lessons.ts uses both; lessons.test.ts checks them).
// Ported from the Piggott lab (src/data/lessons-fig.ts) and adapted to this lab's four kinds of figure.
//
// Who says what. A number in a lesson is one of these:
//   reported   stated by a source and written in the text itself (the video, another video, a published design rule, the
//              encyclopaedia, a review); lessons.test.ts keeps a list of them, each with its source;
//   derived    computed by us from reported figures (or from the sizing rules): the text says « dérivé / calcul / derived »;
//   model      an output of src/sim for the default machine: the text says « modèle / model »; the part sheets' table
//              (figures.ts) is recomputed by data.test.ts and the figures below by lessons.test.ts, which fail loudly if the
//              model is ever recalibrated;
//   assumed    a constant of src/sim/machine.ts that no source gives: the text says « hypothèse / assumption »;
//   estimate   an order of magnitude no source gives: the text says « estimation / estimate ».
// The figures that are derived, model results, assumptions or estimates are written once, in figures.ts or here, and put in the
// French and the English text through {name} placeholders, so that the two languages cannot drift apart.

import type { Spec } from '@onigam/lab-kit/content';
import { l, type L } from '@onigam/lab-kit/i18n';
import { ASSUMED_KEYS, DERIVED_KEYS, ESTIMATE_KEYS, FIG, MODEL_KEYS } from './figures';
import { nEn, nFr } from './units';

export type Kind = 'derived' | 'model' | 'assumed' | 'estimate';
type LessonFig = readonly [value: number, decimals: number, kind: Kind];

/** The figures of the lessons that the sheets' table (figures.ts) does not hold: [value as printed, decimals, kind]. */
export const LESSON_FIG = {
  // ---- derived (arithmetic on reported figures: the test redoes it)
  hydro1: [0.98, 2, 'derived'], // kW of water power of 100 L/s over 1 m: 1000 × 9.81 × 0.1 × 1 = 981 W (the video rounds to "1 kW")
  water3m: [44, 0, 'derived'], // kW of water power of 1.5 m³/s over 3 m (another video: 30 kW at 3 m)
  water200m: [39, 0, 'derived'], // kW of water power of 20 L/s over 200 m (another video: 30 kW at 200 m)
  crossWater: [40.7, 1, 'derived'], // kW of water power of the crossflow plant: 1000 × 9.81 × 0.45 × 9.22
  crossEta: [74, 0, 'derived'], // %: 30 kW out of those 40.7 kW (0.737)
  // the generator: its voltage is its constant times its speed (V = k·ω, k = 0.856 V per rad/s: the model's winding, docs/physics.md §1.8)
  voltPer100: [9, 0, 'derived'], // V of open-circuit voltage for every 100 rpm of the generator: k × 2π/60 × 100 = 8.96
  voltScrew: [4.9, 1, 'derived'], // V the same generator would give if the screw turned it directly, at the screw's 55.1 rpm (4.94)
  voltHalf: [27, 0, 'derived'], // V at half the rated speed, 300 rpm: half of the 53.7 V (26.9)
  // ---- model results (default machine, full-size preset, unless the comment says otherwise)
  elecKw1: [2.2, 1, 'model'], // kW into the battery, at one decimal, to stand beside the wheels' 1.8 and 1.1 and the wrong ratio's 1.3 and 1.2
  batt1: [700, 0, 'model'], // W into the battery out of 100 L/s over 1 m at the model's 71.1 %: 981 × 0.711 = 697
  ratedKw: [2.2, 1, 'model'], // kW: the rated electric power of the plant (the generator's rated point, 2 204 W)
  scenLowRpm: [117, 0, 'model'], // rpm of the screw in the wrong-ratio scenario with the belt ratio at 0.45 times the right one (the scenario rounds the ratio to 1.5: 117.4; unrounded it is 118)
  fastFill: [49, 0, 'model'], // % of the pockets filled when the screw is forced to 2.4 times its speed
  fastShaft: [47, 0, 'model'], // % of the shaft power left then (1 225 W of 2 614 W)
  wheelRpmLow: [10, 0, 'model'], // rpm of the slowest wheel at its design point (breastshot 9.8)
  wheelRpmHigh: [20, 0, 'model'], // rpm of the fastest wheel (overshot 19.8)
} as const satisfies Record<string, LessonFig>;

export type LessonFigName = keyof typeof LESSON_FIG;

export interface FigInfo {
  value: number;
  decimals: number;
  kind: Kind;
}

/** The value, the decimals and the kind of a placeholder: the lessons' own table first, then the part sheets' table. */
export function figInfo(key: string): FigInfo | undefined {
  const own = (LESSON_FIG as Record<string, LessonFig>)[key];
  if (own) return { value: own[0], decimals: own[1], kind: own[2] };
  const sheet = (FIG as Record<string, readonly [number, number]>)[key];
  if (!sheet) return undefined;
  const kind: Kind | undefined = MODEL_KEYS.has(key)
    ? 'model'
    : DERIVED_KEYS.has(key)
      ? 'derived'
      : ASSUMED_KEYS.has(key)
        ? 'assumed'
        : ESTIMATE_KEYS.has(key)
          ? 'estimate'
          : undefined;
  return kind ? { value: sheet[0], decimals: sheet[1], kind } : undefined;
}

function fill(text: string, lang: 'fr' | 'en'): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const info = figInfo(key);
    if (!info) throw new Error(`unknown figure {${key}} in "${text}"`);
    return lang === 'fr' ? nFr(info.value, info.decimals) : nEn(info.value, info.decimals);
  });
}

/** The templates (with their {placeholders}) of the texts built by `lx`, for the tests: the filled text alone cannot tell a figure from a typed number. */
const RAW = new WeakMap<object, { fr: string; en: string }>();

export function rawOf(text: L): { fr: string; en: string } {
  return RAW.get(text) ?? { fr: text.fr, en: text.en };
}

/** Bilingual text whose {placeholders} are figures of LESSON_FIG or of figures.ts, written the French way and the English way. */
export function lx(fr: string, en: string): L {
  const out = l(fill(fr, 'fr'), fill(en, 'en'));
  RAW.set(out, { fr, en });
  return out;
}

/** Key-figure chip: a short label and a short value (the kit shows the value in a monospace font). */
export function chip(labelFr: string, labelEn: string, valueFr: string, valueEn: string = valueFr): Spec {
  return { label: lx(labelFr, labelEn), value: lx(valueFr, valueEn) };
}
