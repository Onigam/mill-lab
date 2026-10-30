import { describe, expect, it } from 'vitest';
import type { Lesson } from '@onigam/lab-kit/content';
import type { L } from '@onigam/lab-kit/i18n';
import { LAB_STRINGS } from '../i18n/ui';
import { partIds, WORLDS, type WorldId } from '../part-ids';
import {
  BELT_EFFICIENCY,
  CHAIN_EFFICIENCY,
  FLOOD_GATE_FACTOR,
  FLOW_MIN_FRAC,
  G,
  GEN_RATED_RPM,
  HOURS_PER_YEAR,
  RESERVED_FRACTION,
  RHO,
  STAGE_RATIO_MAX,
  SLOPE_DEG_DEFAULT,
} from '../sim/machine';
import { MillSim } from '../sim/engine';
import { candidatesFor, fits, ZONES } from '../sim/chooser';
import { cutInOmega, radToRpm, rpmToRad, stagesNeeded } from '../sim/mech';
import { hydraulicPower } from '../sim/physics';
import { PRESET_IDS, presetParams, SCENARIO_IDS, scenarioSetup } from '../sim/presets';
import { speedRuleRpm } from '../sim/screw';
import { SITE_IDS, SITES, floodFlow, medianFlow, reservedFlow, tailRise } from '../sim/site';
import { driveEfficiency, plantFor, solvePlant } from '../sim/system';
import { sizeWheel, wheelPoint, WHEEL_SOURCES, type WheelType } from '../sim/wheel';
import { simulateYear } from '../sim/year';
import { SCREW } from '../three/dims';
import { CHAPTERS } from './chapters';
import { FIG } from './figures';
import { figInfo, LESSON_FIG, rawOf, type Kind } from './lessons-fig';
import { LESSONS } from './lessons';

// The six lessons (the owner chose Lite): shape and length, French and English written together, the focus each one opens in the 3D
// view and in the simulation, the quiz, every number of every text (a typed number against an allow-list with its source, a
// placeholder against the simulation, the dimensions or the sources), what the lessons say will happen when the visitor runs their
// scenario, and the honest points the wave 1 findings ask to be said. Piggott Lab's lessons.test.ts is the model.

const VIDEO_SECONDS = 57 * 60 + 20; // the main video lasts 57 min 16 s

const seconds = (ts: string): number => {
  const [m, s] = ts.split(':').map(Number);
  return (m ?? 0) * 60 + (s ?? 0);
};
const plain = (t: string): string => t.replace(/\*\*/g, '');
const words = (t: string): number => plain(t).trim().split(/\s+/).length;
const sentenceList = (t: string): string[] => plain(t).split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ0-9«“"(])/);

/** Numbers of a text, normalised so that the French and English spellings compare equal (7,5 / 7.5, 5 700 / 5,700). */
function figures(text: string, lang: 'fr' | 'en'): string[] {
  let t = text.replace(/[−–]/g, ' ');
  if (lang === 'fr') t = t.replace(/(\d) (\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
  else t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  return (t.match(/\d+(?:\.\d+)?/g) ?? []).sort();
}

interface Unit {
  label: string;
  texts: L[];
}

/** Every text of the lessons, grouped the way a visitor reads it: a title and a summary, a paragraph, a chip, a quiz item. */
function units(): Unit[] {
  const out: Unit[] = [];
  for (const les of LESSONS) {
    out.push({ label: `${les.id} title+summary`, texts: [les.title, les.summary] });
    les.body.forEach((p, i) => out.push({ label: `${les.id} body ${i + 1}`, texts: [p] }));
    (les.figures ?? []).forEach((f, i) =>
      out.push({ label: `${les.id} chip ${i + 1}`, texts: [f.label, f.value as L] }),
    );
    (les.quiz ?? []).forEach((q, i) =>
      out.push({ label: `${les.id} quiz ${i + 1}`, texts: [q.q, ...q.choices, q.explain] }),
    );
  }
  return out;
}
const allTexts = (): { label: string; text: L }[] =>
  units().flatMap((u) => u.texts.map((text, i) => ({ label: `${u.label} #${i}`, text })));

/** Short choices ("×4", "Plus tôt") are a figure or a word: only the longer ones are judged on length. */
const isShort = (q: { choices: L[] }): boolean =>
  q.choices.reduce((n, c) => n + c.fr.length, 0) / q.choices.length < 30;

const lesson = (id: string): Lesson => LESSONS.find((x) => x.id === id)!;
const bodyEn = (id: string): string =>
  lesson(id)
    .body.map((p) => p.en)
    .join(' ');
const bodyFr = (id: string): string =>
  lesson(id)
    .body.map((p) => p.fr)
    .join(' ');
const quizEn = (id: string): string =>
  lesson(id)
    .quiz!.map((q) => [q.q.en, ...q.choices.map((c) => c.en), q.explain.en].join(' '))
    .join(' ');

// ------------------------------------------------------------------------------------------------ shape and parity

describe('the six lessons', () => {
  it('are six (the owner chose Lite), with unique kebab-case ids, in the order of the story', () => {
    expect(LESSONS.map((x) => x.id)).toEqual([
      'water-to-watts',
      'why-screw',
      'speed-multiplier',
      'which-turbine',
      'wheel-or-screw',
      'mill-year',
    ]);
    for (const les of LESSONS) expect(les.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('have a title, a one-line summary, 4 paragraphs, 3 key figures and 2 or 3 quiz questions', () => {
    for (const les of LESSONS) {
      for (const lang of ['fr', 'en'] as const) {
        expect(les.title[lang].length, `${les.id} title ${lang}`).toBeGreaterThan(10);
        expect(les.title[lang].length, `${les.id} title ${lang}`).toBeLessThanOrEqual(60);
        expect(les.summary[lang].length, `${les.id} summary ${lang}`).toBeGreaterThan(40);
        expect(les.summary[lang].length, `${les.id} summary ${lang}`).toBeLessThanOrEqual(190);
      }
      expect(les.body.length, les.id).toBeGreaterThanOrEqual(3);
      expect(les.body.length, les.id).toBeLessThanOrEqual(4);
      expect(les.figures?.length, les.id).toBe(3);
      expect(les.quiz?.length, les.id).toBeGreaterThanOrEqual(2);
      expect(les.quiz?.length, les.id).toBeLessThanOrEqual(3);
    }
    expect(LESSONS.reduce((n, x) => n + (x.quiz?.length ?? 0), 0)).toBe(16);
  });

  it('keep every paragraph short (2 to 4 sentences, at most 85 words, no sentence over 36 words) and a lesson near 250 words at most', () => {
    for (const les of LESSONS) {
      for (const lang of ['fr', 'en'] as const) {
        let total = 0;
        les.body.forEach((p, i) => {
          const n = sentenceList(p[lang]).length;
          expect(n, `${les.id} p${i + 1} ${lang}: ${n} sentences`).toBeGreaterThanOrEqual(2);
          expect(n, `${les.id} p${i + 1} ${lang}: ${n} sentences`).toBeLessThanOrEqual(4);
          expect(words(p[lang]), `${les.id} p${i + 1} ${lang}`).toBeLessThanOrEqual(85);
          for (const s of sentenceList(p[lang]))
            expect(words(s), `${les.id} p${i + 1} ${lang}: ${s}`).toBeLessThanOrEqual(36);
          total += words(p[lang]);
        });
        // the owner found Piggott's lessons dense at about 283 words: these aim at 200 to 250
        expect(total, `${les.id} ${lang}`).toBeLessThanOrEqual(260);
        expect(total, `${les.id} ${lang}`).toBeGreaterThanOrEqual(190);
      }
    }
  });

  it('have a non-empty French and English text everywhere, no placeholder left, no straight apostrophe, bold balanced', () => {
    const bad = /todo|tbd|lorem|xxx|placeholder|undefined|\{\w+\}|\bNaN\b/i;
    for (const { label, text } of allTexts()) {
      expect(text.fr.trim().length, `${label} fr`).toBeGreaterThan(0);
      expect(text.en.trim().length, `${label} en`).toBeGreaterThan(0);
      expect(text.fr + text.en, label).not.toMatch(bad);
      expect(text.fr + text.en, label).not.toMatch(/\p{L}'\p{L}/u);
      expect(text.fr.split('**').length % 2, `${label}: ** in fr`).toBe(1);
      expect(text.en.split('**').length % 2, `${label}: ** in en`).toBe(1);
    }
  });

  it('write the two languages differently, at the same level of detail, with the same figures and the same bold terms', () => {
    for (const { label, text } of allTexts()) {
      if (text.fr.length > 40) {
        expect(text.fr, label).not.toBe(text.en);
        expect(text.fr.length / text.en.length, label).toBeGreaterThan(0.75);
        expect(text.fr.length / text.en.length, label).toBeLessThan(1.5);
      }
      expect(figures(text.fr, 'fr'), label).toEqual(figures(text.en, 'en'));
      expect(text.fr.split('**').length, `${label} bold`).toBe(text.en.split('**').length);
      expect(text.en, label).not.toMatch(/[éèêëàâùûôîïç]/i);
    }
  });

  it('are in British English', () => {
    const american =
      /\b(colors?|centers?|meters?|liters?|gray|analyz\w*|behaviors?|fibers?|aluminum|favors?|honors?|labor|neighbors?|catalogs?|defense|license|plow|sulfur|gasoline|molds?|realiz\w*|organiz\w*|recogniz\w*|minimiz\w*|maximiz\w*|optimiz\w*|utiliz\w*|standardiz\w*)\b/i;
    for (const { label, text } of allTexts()) expect(text.en, label).not.toMatch(american);
    // …and the words that matter here are the British ones
    expect(bodyEn('water-to-watts')).toMatch(/litres/);
    expect(bodyEn('speed-multiplier')).toMatch(/newton-metres/);
    expect(bodyEn('which-turbine')).toMatch(/metres|\bm\b/);
  });

  it('follow the typography of French: a space before : ; ? ! (the kit makes it a fixed one), « » with spaces, a typographic apostrophe', () => {
    for (const { label, text } of allTexts()) {
      const fr = text.fr.replace(/\d:\d/g, '');
      expect(fr, `${label}: space before : ; ? !`).not.toMatch(/[^\s][:;?!]/);
      expect(fr, label).not.toMatch(/«\S|\S»/);
      expect(fr, label).not.toMatch(/ {2}|\.\.\./);
      expect(text.en, label).not.toMatch(/ {2}|\.\.\./);
    }
  });

  it('use no research code, no internal word and no path in visitor text: the sources are named in words', () => {
    for (const { label, text } of allTexts()) {
      expect(text.fr + text.en, label).not.toMatch(/\b(K\d{1,2}|S\d{1,2})\b/);
      expect(text.fr + ' ' + text.en, label).not.toMatch(
        /(?<!\p{L})(id|world|preset|scene|scène|undefined|dims\.ts)(?!\p{L})|\bsrc\//iu,
      );
      expect(text.fr + ' ' + text.en, label).not.toMatch(
        /\b(trapped-water|pulley-large|blade-module|reserved-flow-notch|water-chamber|wrong-ratio|low-water|too-fast|wheel-instead)\b/,
      );
    }
  });

  it('name nobody but the owner’s own lab, once: no person, channel, company, place or brand, no author of a paper', () => {
    const names =
      /\b(Viset+a|Vicetta|Archi-?Pelle|L’Archi|Archipel|Révél|Revel Futur|Paulygones|Énergétique|Energetique|Bru|Rorres|Nagel|Simmons|Lubitz|Dellinger|Brada|Muysken|Nuernbergk|Lashofer|Kozyn|Wikipedia|Wikipédia|YouTube|Google|Neozone|Piggott|Low-?tech|Thomas|Lo[iï]c?|Lo[iï]s|La[eé]titia|Bertrand|J[eé]r[eé]my|Greg|Maxime|Simon|Dupuit|Occitanie|Tarbes|Garonne|Pyr[eé]n[eé]es|Ari[eè]ge|Jean-Marie|Poncelet)\b/;
    for (const { label, text } of allTexts()) expect(text.fr + ' ' + text.en, label).not.toMatch(names);
    for (const lang of ['fr', 'en'] as const) {
      const all = allTexts()
        .map((x) => x.text[lang])
        .join('\n');
      expect(all.match(/Pelton Lab/g)?.length, `${lang}: Pelton Lab once`).toBe(1);
    }
    expect(bodyEn('which-turbine')).toMatch(/see Pelton Lab/);
    expect(bodyFr('which-turbine')).toMatch(/voyez Pelton Lab/);
  });

  it('define each term once: no bold phrase is repeated from one lesson to another, and every lesson defines some', () => {
    for (const lang of ['fr', 'en'] as const) {
      const seen = new Map<string, string>();
      for (const les of LESSONS)
        for (const p of les.body)
          for (const m of p[lang].matchAll(/\*\*([^*]+)\*\*/g)) {
            const term = m[1]!.toLowerCase();
            expect(
              seen.get(term),
              `${lang}: « ${term} » is bold in ${seen.get(term)} and in ${les.id}`,
            ).toBeUndefined();
            seen.set(term, les.id);
          }
      expect(seen.size, lang).toBeGreaterThanOrEqual(18);
      for (const les of LESSONS)
        expect([...seen.values()].filter((v) => v === les.id).length, `${lang}: ${les.id}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('give the formula as symbols only (it is not translated) and the key figures short', () => {
    for (const les of LESSONS) {
      if (les.formula !== undefined) {
        expect(les.formula.length, les.id).toBeLessThanOrEqual(40);
        expect(les.formula, les.id).toMatch(/[=∝≤]/);
      }
      for (const f of les.figures ?? []) {
        const label = f.label as L;
        const value = f.value as L;
        expect(label.fr.length, `${les.id} chip`).toBeLessThanOrEqual(55);
        expect(label.en.length, `${les.id} chip`).toBeLessThanOrEqual(55);
        expect(value.fr.length, `${les.id} chip`).toBeLessThanOrEqual(24);
        expect(value.en.length, `${les.id} chip`).toBeLessThanOrEqual(24);
      }
    }
    expect(LESSONS.filter((x) => x.formula).map((x) => x.id)).toEqual([
      'water-to-watts',
      'why-screw',
      'speed-multiplier',
      'which-turbine',
      'mill-year',
    ]);
  });
});

// ------------------------------------------------------------------------------------------------ the focus

describe('the focus of each lesson opens what it talks about', () => {
  it('names a world of src/part-ids.ts, a part of THAT world, a real starting point and a real scenario (or none)', () => {
    for (const les of LESSONS) {
      const f = les.focus;
      expect(WORLDS as string[], `${les.id} scene`).toContain(f.scene);
      expect(f.part, `${les.id} part`).toBeDefined();
      expect(partIds(f.scene as WorldId), `${les.id} part`).toContain(f.part);
      expect(PRESET_IDS as string[], `${les.id} preset`).toContain(f.preset);
      if (f.scenario !== undefined) expect(SCENARIO_IDS as string[], `${les.id} scenario`).toContain(f.scenario);
    }
  });

  it('is the one the brief gives: site / screw worlds, the part, the starting point and the scenario of each lesson', () => {
    const focus = Object.fromEntries(
      LESSONS.map((x) => [x.id, [x.focus.scene, x.focus.part, x.focus.preset, x.focus.scenario]]),
    );
    expect(focus).toEqual({
      'water-to-watts': ['site', 'weir', 'full-size', undefined],
      'why-screw': ['screw', 'trapped-water', 'full-size', 'too-fast'],
      'speed-multiplier': ['screw', 'pulley-large', 'full-size', 'wrong-ratio'],
      'which-turbine': ['site', 'water-chamber', 'river', undefined],
      'wheel-or-screw': ['screw', 'blade-module', 'full-size', 'wheel-instead'],
      'mill-year': ['site', 'reserved-flow-notch', 'full-size', 'low-water'],
    });
    // a scenario makes the preset « custom »: the two lessons that are about a starting point offer none
    expect(LESSONS.filter((x) => !x.focus.scenario).map((x) => x.id)).toEqual(['water-to-watts', 'which-turbine']);
    // every lesson opens something new
    expect(new Set(LESSONS.map((x) => `${x.focus.scene}/${x.focus.part}`)).size).toBe(6);
  });

  it('opens each starting point and runs each scenario in the engine without error, and the scenario makes the preset « custom »', () => {
    for (const les of LESSONS) {
      const sim = new MillSim();
      sim.applyPreset(les.focus.preset as (typeof PRESET_IDS)[number]);
      expect(sim.params.preset, les.id).toBe(les.focus.preset);
      if (les.focus.scenario) {
        sim.applyScenario(les.focus.scenario as (typeof SCENARIO_IDS)[number]);
        expect(sim.params.preset, `${les.id}: a scenario makes the preset « custom »`).toBe('custom');
      }
      for (let i = 0; i < 120; i++) sim.step(1 / 30);
      expect(Number.isFinite(sim.state.electricPower), les.id).toBe(true);
    }
  });

  it('points the video timestamp at the start of a chapter of the main video', () => {
    const starts = CHAPTERS.map(([ts]) => ts);
    for (const les of LESSONS) {
      if (les.video === undefined) continue;
      expect(les.video, les.id).toMatch(/^\d{2}:[0-5]\d$/);
      expect(seconds(les.video), les.id).toBeLessThanOrEqual(VIDEO_SECONDS);
      expect(starts, les.id).toContain(les.video);
    }
    // the wheel is the subject of another video, not of the main one: no timestamp for lesson 5
    expect(LESSONS.filter((x) => x.video).map((x) => x.id)).toEqual([
      'water-to-watts',
      'why-screw',
      'speed-multiplier',
      'which-turbine',
      'mill-year',
    ]);
  });
});

// ------------------------------------------------------------------------------------------------ the quiz

describe('the quiz', () => {
  const items = LESSONS.flatMap((les) => (les.quiz ?? []).map((q, i) => ({ id: `${les.id} Q${i + 1}`, les, q })));

  it('has 3 choices per question, an answer in range, a distinct text per choice, an explanation of 15 to 60 words', () => {
    expect(items).toHaveLength(16);
    for (const { id, q } of items) {
      expect(q.choices.length, id).toBe(3);
      expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, id).toBe(true);
      for (const lang of ['fr', 'en'] as const) {
        expect(new Set(q.choices.map((c) => c[lang])).size, `${id} ${lang}`).toBe(q.choices.length);
        expect(words(q.explain[lang]), `${id} explain ${lang}`).toBeLessThanOrEqual(60);
        expect(words(q.explain[lang]), `${id} explain ${lang}`).toBeGreaterThanOrEqual(15);
        expect(words(q.q[lang]), `${id} question ${lang}`).toBeLessThanOrEqual(40);
        for (const c of q.choices) expect(words(c[lang]), `${id} choice ${lang}`).toBeLessThanOrEqual(22);
      }
    }
  });

  it('does not put the right answer always at the same place: not in one lesson, and no place for more than 40 % of the questions', () => {
    for (const les of LESSONS) expect(new Set((les.quiz ?? []).map((q) => q.answer)).size, les.id).toBeGreaterThan(1);
    const count = [0, 1, 2].map((k) => items.filter((x) => x.q.answer === k).length);
    expect(count.filter((c) => c > 0).length, `places ${count}`).toBe(3);
    expect(Math.max(...count) / items.length, `places ${count}`).toBeLessThanOrEqual(0.4);
  });

  it('cannot be guessed from the length: the choices of a text question are within 1.6 of each other, the right one longest in at most a third', () => {
    const textual = items.filter((x) => !isShort(x.q));
    expect(textual.length).toBeGreaterThanOrEqual(10);
    for (const lang of ['fr', 'en'] as const) {
      let longest = 0;
      for (const { id, q } of textual) {
        const lengths = q.choices.map((c) => c[lang].length);
        expect(Math.max(...lengths) / Math.min(...lengths), `${id} ${lang}: ${lengths}`).toBeLessThanOrEqual(1.6);
        const right = lengths[q.answer]!;
        if (lengths.every((n, k) => k === q.answer || n < right)) longest++;
      }
      expect(
        longest / textual.length,
        `${lang}: the right choice is the longest in ${longest} of ${textual.length}`,
      ).toBeLessThanOrEqual(1 / 3);
    }
  });

  it('has a wrong choice for each misconception the lessons name', () => {
    const q = (id: string, k: number) => lesson(id).quiz![k]!;
    // lesson 1: the power depends on the machine only / the video measured 71 % / a screw will surely give 71 %
    expect(q('water-to-watts', 0).choices[0]!.en).toMatch(/depends only on the machine/);
    expect(q('water-to-watts', 2).choices[1]!.en).toMatch(/video has already measured/);
    expect(q('water-to-watts', 2).choices[2]!.en).toMatch(/surely give/);
    // lesson 2: a jet turns the screw / the screw slides / no fish model / a rack is never useful
    expect(q('why-screw', 0).choices[0]!.en).toMatch(/jet/);
    expect(q('why-screw', 0).choices[2]!.en).toMatch(/sliding/);
    expect(q('why-screw', 2).choices[0]!.en).toMatch(/How many survive/);
    expect(q('why-screw', 2).choices[1]!.en).toMatch(/never useful/);
    expect(q('why-screw', 2).choices[2]!.en).toMatch(/no fish model/);
    // lesson 3: faster means stronger / the chain multiplies the speed and the belt the torque / two stages lose less
    expect(q('speed-multiplier', 0).choices[1]!.en).toMatch(/faster means stronger/);
    expect(q('speed-multiplier', 1).choices[0]!.en).toMatch(/belt multiplies the torque/);
    expect(q('speed-multiplier', 1).choices[2]!.en).toMatch(/lose less power/);
    // lesson 4: the screw accepts any flow / a machine works anywhere if big enough
    expect(q('which-turbine', 0).choices[0]!.en).toMatch(/accepts any flow/);
    expect(q('which-turbine', 1).choices[2]!.en).toMatch(/works anywhere/);
    // lesson 5: take the higher / trust the model
    expect(q('wheel-or-screw', 0).choices[0]!.en).toMatch(/Take the higher/);
    expect(q('wheel-or-screw', 0).choices[2]!.en).toMatch(/Trust the lab’s model/);
    // lesson 6: the reserved flow is not the screw's capacity / a flood is not a matter of too much water for the screw
    expect(q('mill-year', 0).choices[0]!.en).toMatch(/largest flow the screw can swallow/);
    expect(q('mill-year', 1).choices[2]!.en).toMatch(/runs away/);
    expect(q('mill-year', 2).choices[0]!.en).toMatch(/runs a little over half the time/);
  });
});

// ------------------------------------------------------------------------------------------------ the numbers

/**
 * Every number that a text of the lessons types itself (a figure written by {placeholder} is checked against the model below, the
 * dimensions or the sources), with where it comes from. "video" = the main video (read in words, never in the garbled captions),
 * "another video" = the crossflow plant (research K10, K12), the mountain plant (K16); "published" = the design rules of the
 * literature the physics role read; "encyclopaedia" and "review" = the wheel sources of docs/research.md §1 (S6, S7); "magazine" =
 * the heads of the wheels (S8); ZONES = src/sim/chooser.ts. A number that is not here is a number nobody checked: add it WITH its
 * source, or write it by placeholder. An entry no text uses is an error.
 */
const TYPED: Record<string, string> = {
  '0.01': 'smallest flow of the screw zone, m³/s (encyclopaedia, ZONES.screw.flow)',
  '0.1': 'smallest head of the screw zone, m (encyclopaedia, ZONES.screw.head)',
  '0.3': 'smallest head of the undershot wheel, m (magazine, ZONES.undershot.head)',
  '0.45': 'belt ratio × 0.45 of the wrong-ratio scenario (presets.ts)',
  '1': '1 metre of fall, 1 kW, 1 kW for an hour (video: 100 L/s falling 1 m gives about 1 kW)',
  '1.5':
    '1.5 m³/s at 3 m for 30 kW (another video); 1.5 to 3 m of head of the breastshot wheel (magazine, ZONES.breastshot.head)',
  '1.9': 'belt ratio × 1.9 of the wrong-ratio scenario (presets.ts)',
  '2': 'the 2 kW aim (video); 2 m, smallest head of the Kaplan zone (ZONES.kaplan.head); 2 m, largest head of the undershot wheel',
  '2.2': 'flow of the « River with a weir » starting point, m³/s (presets.ts)',
  '2.4': 'the too-fast scenario forces the screw to 2.4 times its speed (presets.ts)',
  '2.5': '2.5 m, smallest head of the overshot wheel (magazine, ZONES.overshot.head)',
  '3': '3 m of head: the 30 kW plant of another video; the « River with a weir » starting point (presets.ts); breastshot wheel largest head',
  '5': 'cross-reference « leçon 5 / lesson 5 »',
  '8': 'smallest head of the crossflow zone, m (ZONES.crossflow.head)',
  '9.22': 'head of the 30 kW crossflow plant, m (another video)',
  '9.81': 'gravity, m/s² (the kit’s G)',
  '10': 'largest head of the screw zone and of the overshot wheel, m (ZONES.screw.head, ZONES.overshot.head); a quiz question: ten times the head',
  '14.5': 'largest flow of the screw zone, m³/s (encyclopaedia, ZONES.screw.flow)',
  '20': '20 L/s at 200 m for 30 kW (another video, rounded aloud); the 20 L/s of the quiz',
  '30': '30 to 60 rpm of the screw (video); the 30 kW plant (another video); 30 kW in the quiz of lesson 1 (water3m, water200m)',
  '50': 'the speed rule n = 50 / D^(2/3) (published, machine.ts SPEED_RULE_RPM); 50 to 60 % of the wheels (encyclopaedia)',
  '60': '30 to 60 rpm (video); 60 to 70 % hoped for the whole chain (video); 50 to 60 % of the wheels (encyclopaedia); 60 m, largest head of the crossflow zone (ZONES.crossflow.head)',
  '70': '60 to 70 % hoped for (video); the 70 W of a wrong choice of lesson 1 (a tenth of the 700 W)',
  '75': '75 to 80 % of the breastshot wheel (review); about 75 % river to wire of good plants (published study, docs/research.md §10); 75 m, smallest head of the Pelton zone (ZONES.pelton.head)',
  '80': '80 to 90 % of the overshot wheel (encyclopaedia); 75 to 80 % of the breastshot wheel (review)',
  '85': 'about 85 % of the overshot and undershot wheels (review)',
  '90': '80 to 90 % of the overshot wheel (encyclopaedia)',
  '100': '100 L/s falling 1 m (video)',
  '200': 'the 200 W of the prototype (video); 200 m of head of the 30 kW plant (another video)',
  '220': 'head of the mountain plant, m (another video)',
  '450': 'flow of the 30 kW crossflow plant, L/s (another video)',
  '750': 'speed of the mountain plant’s turbine, rpm (another video)',
  '987': 'power of the mountain plant, kW (another video)',
  '1000': 'density of the water, kg/m³ (the kit’s RHO)',
  '8760': 'hours in a year (machine.ts HOURS_PER_YEAR)',
};

describe('every number of every text', () => {
  const typedNumbers = (raw: string): string[] => figures(raw.replace(/\{\w+\}/g, ' '), 'en');

  it('is either a figure written by {placeholder} or in the allow-list, with its source', () => {
    const allowed = new Set(Object.keys(TYPED).map(Number));
    const unknown: string[] = [];
    for (const { label, text } of allTexts()) {
      const raw = rawOf(text);
      for (const n of typedNumbers(raw.en)) if (!allowed.has(Number(n))) unknown.push(`${label}: ${n}`);
    }
    expect(unknown).toEqual([]);
  });

  it('has a reason for every allow-listed number: none is unused', () => {
    const used = new Set<number>();
    for (const { text } of allTexts()) for (const n of typedNumbers(rawOf(text).en)) used.add(Number(n));
    const unused = Object.keys(TYPED).filter((k) => !used.has(Number(k)));
    expect(unused).toEqual([]);
  });

  it('writes the same placeholders in the two languages and only names figures that exist', () => {
    for (const { label, text } of allTexts()) {
      const raw = rawOf(text);
      const keys = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
      expect(keys(raw.fr), label).toEqual(keys(raw.en));
      for (const k of keys(raw.en)) expect(figInfo(k), `${label}: {${k}}`).toBeDefined();
    }
  });

  it('uses every figure of the lessons’ own table', () => {
    const used = new Set<string>();
    for (const { text } of allTexts()) for (const m of rawOf(text).en.matchAll(/\{(\w+)\}/g)) used.add(m[1]!);
    for (const k of Object.keys(LESSON_FIG)) expect(used.has(k), k).toBe(true);
  });

  it('gives every figure of figures.ts a kind (model, derived, assumed, estimate)', () => {
    for (const k of Object.keys(FIG)) expect(figInfo(k), k).toBeDefined();
  });

  it('says what a figure is, in the unit where it stands: model results say « modèle / model », derived ones « dérivé / calcul », assumed ones « hypothèse », estimates « estimation »', () => {
    const words: Record<Kind, [RegExp, RegExp]> = {
      model: [/modèle/i, /model/i],
      derived: [/calcul|dérivé/i, /calculat|derived/i],
      assumed: [/hypoth|suppos/i, /assum/i],
      estimate: [/estim/i, /estimat/i],
    };
    for (const u of units()) {
      const kinds = new Set<Kind>();
      for (const t of u.texts) for (const m of rawOf(t).en.matchAll(/\{(\w+)\}/g)) kinds.add(figInfo(m[1]!)!.kind);
      const fr = u.texts.map((t) => t.fr).join(' ');
      const en = u.texts.map((t) => t.en).join(' ');
      for (const kind of kinds) {
        expect(fr, `${u.label}: ${kind}`).toMatch(words[kind][0]);
        expect(en, `${u.label}: ${kind}`).toMatch(words[kind][1]);
      }
    }
  });

  it('says that 200 W and 2 kW are hopes of the video wherever they are quoted, and that 2.2 kW is the model’s', () => {
    for (const u of units()) {
      const fr = u.texts.map((t) => t.fr).join(' ');
      const en = u.texts.map((t) => t.en).join(' ');
      if (/(?<![\d.,])200 W\b/.test(fr)) expect(fr, u.label).toMatch(/prototype|annonc|espoir|visé|vidéo/i);
      if (/(?<![\d.,])200 W\b/.test(en)) expect(en, u.label).toMatch(/prototype|announced|hope|aim|video/i);
      if (/(?<![\d.,])2 kW\b/.test(fr)) expect(fr, u.label).toMatch(/annonc|espoir|visé|objectif|vidéo/i);
      if (/(?<![\d.,])2 kW\b/.test(en)) expect(en, u.label).toMatch(/announced|hope|aim|target|video/i);
    }
    const last = lesson('water-to-watts').body[3]!;
    expect(last.en).toMatch(/hopes too/);
    expect(last.fr).toMatch(/aussi des espoirs/);
    expect(last.fr).toMatch(/ne confirment donc pas la vidéo/);
    expect(last.en).toMatch(/therefore does not confirm the video/);
    expect(last.en).toMatch(/that the model is a point more generous than the hope/);
  });
});

// ------------------------------------------------------------------------------------------------ the model results

describe('the figures of the lessons are what the simulation finds', () => {
  const p = presetParams('full-size');
  const plant = plantFor(p);
  const screw = plant.screw!;
  const op = solvePlant(p, p.riverFlow);
  const value = (key: keyof typeof LESSON_FIG) => LESSON_FIG[key][0];
  /** The figure is what the text prints: the computed value rounded to the decimals of the table. */
  const printed = (key: keyof typeof LESSON_FIG, computed: number) => {
    const d = LESSON_FIG[key][1];
    expect(Math.round(computed * 10 ** d) / 10 ** d, `${key}: ${computed}`).toBe(value(key));
  };

  it('derived: the power of 100 L/s over 1 m, the 30 kW plant at 3 m and at 200 m, the crossflow plant', () => {
    printed('hydro1', hydraulicPower(0.1, 1) / 1000);
    expect(hydraulicPower(0.1, 1)).toBeCloseTo(981, 0);
    // the video rounds it to "1 kW"
    expect(Math.abs(hydraulicPower(0.1, 1) - 1000)).toBeLessThan(30);
    printed('water3m', hydraulicPower(1.5, 3) / 1000);
    printed('water200m', hydraulicPower(0.02, 200) / 1000);
    // both carry more than the 30 kW of the plant: efficiencies of 0.68 and 0.76, as the research checks
    expect(30 / value('water3m')).toBeGreaterThan(0.65);
    expect(30 / value('water3m')).toBeLessThan(0.7);
    expect(30 / value('water200m')).toBeGreaterThan(0.74);
    expect(30 / value('water200m')).toBeLessThan(0.78);
    printed('crossWater', hydraulicPower(0.45, 9.22) / 1000);
    printed('crossEta', (30 / (hydraulicPower(0.45, 9.22) / 1000)) * 100);
    expect(hydraulicPower(1, 1)).toBe(RHO * G);
    expect(RHO).toBe(1000);
    expect(G).toBe(9.81);
  });

  it('derived: ten times the head for the same power means a tenth of the flow', () => {
    expect(hydraulicPower(0.2, 10)).toBeCloseTo(hydraulicPower(2, 1), 6);
    expect(hydraulicPower(0.02, 100)).toBeCloseTo(hydraulicPower(0.2, 10), 6);
  });

  it('model: 100 L/s over 1 m with the model’s efficiency gives about 700 W, close to the 70 % hoped for', () => {
    expect(Math.round((hydraulicPower(0.1, 1) * op.etaOverall) / 100) * 100).toBe(value('batt1'));
    expect(value('batt1') / 1000 / FIG.etaAll[0]).toBeLessThan(1);
    // the choices of the quiz: 70 W and 1 kW are a tenth and the whole of it
    expect(value('batt1') / 10).toBe(70);
  });

  it('model: the electricity at the design point is 2.2 kW, and the rated electric power of the plant the year is compared with is the same', () => {
    printed('ratedKw', plant.ratedElectric / 1000);
    printed('elecKw1', op.electricPower / 1000);
  });

  it('model: at 2.4 times its speed the pockets are 49 % full and 47 % of the shaft power is left (the scenario forces a fixed speed)', () => {
    const rpm0 = plant.designRpm;
    const rpmFast = Math.round(2.4 * rpm0);
    const fast = solvePlant({ ...p, loadMode: 'fixed', fixedRpm: rpmFast }, p.riverFlow);
    printed('fastFill', fast.fill * 100);
    printed('fastShaft', (fast.shaftPower / op.shaftPower) * 100);
    // the speed of the point of calculation is the rule's, so "2.4 times the rule" is 2.4 times 55 rpm
    expect(rpmFast / rpm0).toBeGreaterThan(2.39);
    expect(rpmFast / rpm0).toBeLessThan(2.41);
    expect(op.rpm / speedRuleRpm(screw.outerDiameter)).toBeGreaterThan(0.99);
    expect(op.rpm / speedRuleRpm(screw.outerDiameter)).toBeLessThan(1.01);
    expect(Math.round(op.rpm)).toBe(FIG.rpm[0]);
    expect(speedRuleRpm(0.8)).toBeGreaterThan(55);
  });

  it('model: the wheels turn at 10 to 20 rpm', () => {
    const rpm = (m: WheelType) => plantFor(presetParams('full-size', m)).designRpm;
    printed('wheelRpmLow', Math.min(rpm('overshot'), rpm('breastshot'), rpm('undershot')));
    printed('wheelRpmHigh', Math.max(rpm('overshot'), rpm('breastshot'), rpm('undershot')));
  });
});

// ------------------------------------------------------------------------------------------------ what each lesson claims

describe('lesson 1 — from water to watts', () => {
  const p = presetParams('full-size');
  const op = solvePlant(p, p.riverFlow);

  it('says that the model is a point above the hoped 60 to 70 %, and the flow was worked out from the 2 kW at 65 %', () => {
    expect(op.etaOverall * 100).toBeGreaterThan(70);
    expect(op.etaOverall * 100).toBeLessThan(72);
    // 2 kW at 65 % over 1.75 m needs 0.179 m³/s: the 180 L/s of the design point
    const flow = 2000 / (0.65 * RHO * G * p.head);
    expect(flow).toBeGreaterThan(0.178);
    expect(flow).toBeLessThan(0.18);
    expect(Math.round(flow * 100) / 100).toBe(FIG.flowLs[0] / 1000);
    expect(p.designFlow).toBe(0.18);
    // the 1.75 m is inside the 1.5 to 2 m of the video
    expect(p.head).toBeGreaterThanOrEqual(1.5);
    expect(p.head).toBeLessThanOrEqual(2);
    expect(FIG.head[0]).toBe(p.head);
    // and the model gives more than the 2 kW aim: the circle, not a confirmation
    expect(op.electricPower).toBeGreaterThan(2000);
  });

  it('chains the figures it prints: water, shaft, battery, and the efficiency of the screw and of the whole', () => {
    expect(Math.abs(op.hydraulicPower / 1000 - FIG.waterKw[0])).toBeLessThan(0.005);
    expect(Math.abs(op.shaftPower / 1000 - FIG.shaftKw[0])).toBeLessThan(0.005);
    expect(Math.abs(op.electricPower / 1000 - FIG.elecKw[0])).toBeLessThan(0.005);
    expect(Math.abs(op.etaMachine * 100 - FIG.etaScrew[0])).toBeLessThan(0.05);
    expect(Math.abs(op.etaOverall * 100 - FIG.etaAll[0])).toBeLessThan(0.5);
  });

  it('gives the weir as the part that opens: the head starts there', () => {
    expect(partIds('site')).toContain(lesson('water-to-watts').focus.part);
  });
});

describe('lesson 2 — why a screw works', () => {
  const p = presetParams('full-size');
  const plant = plantFor(p);
  const screw = plant.screw!;

  it('has pockets one step lower than the one above, and 16 of them add up to the head', () => {
    const step = (screw.pitch / SCREW.threads) * Math.sin(screw.slope);
    expect(Math.round(step * 100)).toBe(FIG.stepCm[0]);
    expect(Math.round(screw.buckets)).toBe(FIG.buckets[0]);
    expect(Math.abs(screw.buckets * step - p.head)).toBeLessThan(0.1);
    expect(screw.slope).toBeCloseTo((SLOPE_DEG_DEFAULT * Math.PI) / 180, 6);
    expect(Math.round(screw.outerDiameter * 100) / 100).toBe(FIG.diameter[0]);
    expect(Math.round(screw.gap * 10000) / 10).toBe(FIG.gapMm[0]);
  });

  it('runs at the published rule: about 50 / D^(2/3), 55 rpm for 0.86 m; 30 to 60 rpm is the rule for screws of 0.8 to 2 m', () => {
    expect(speedRuleRpm(screw.outerDiameter)).toBeCloseTo(plant.designRpm, 6);
    expect(speedRuleRpm(screw.outerDiameter, 50)).toBeGreaterThan(55);
    expect(speedRuleRpm(screw.outerDiameter, 50)).toBeLessThan(56);
    expect(speedRuleRpm(0.8)).toBeLessThan(60);
    expect(speedRuleRpm(2)).toBeGreaterThan(30);
    expect(speedRuleRpm(2)).toBeLessThan(35);
  });

  it('too fast, in the scenario: the speed climbs to 2.4 times the rule, the pockets half empty, the power halved, the alarm "too fast"', () => {
    const setup = scenarioSetup('too-fast');
    expect(setup.params.loadMode).toBe('fixed');
    expect(setup.ramps[0]).toMatchObject({ key: 'fixedRpm', to: Math.round(2.4 * plant.designRpm) });
    const sim = new MillSim();
    sim.applyScenario('too-fast');
    for (let t = 0; t < 100; t += 1 / 30) sim.step(1 / 30);
    expect(sim.state.speedRatio).toBeGreaterThan(2.3);
    expect(sim.state.speedRatio).toBeLessThan(2.5);
    expect(sim.state.fill).toBeGreaterThan(0.45);
    expect(sim.state.fill).toBeLessThan(0.55);
    expect(sim.state.shaftPower / solvePlant(p, p.riverFlow).shaftPower).toBeGreaterThan(0.43);
    expect(sim.state.shaftPower / solvePlant(p, p.riverFlow).shaftPower).toBeLessThan(0.5);
    expect(sim.state.alarms).toContain('tooFast');
  });

  it('too slow: the pockets are full and the surplus overflows (the scenario of the Simulation, named in the text)', () => {
    const slow = solvePlant({ ...p, loadMode: 'fixed', fixedRpm: Math.round(0.3 * plant.designRpm) }, p.riverFlow);
    expect(slow.fill).toBeGreaterThanOrEqual(0.999);
    expect(slow.qOver / slow.flow).toBeGreaterThan(0.5);
    const sim = new MillSim();
    sim.applyScenario('too-slow');
    for (let t = 0; t < 100; t += 1 / 30) sim.step(1 / 30);
    expect(sim.state.alarms).toContain('tooSlow');
    expect(bodyEn('why-screw')).toMatch(/Too slow, the screw overflows/);
  });

  it('has no fish model, and says so: nothing in the state or the parameters is about fish', () => {
    const sim = new MillSim();
    for (const k of [...Object.keys(sim.state), ...Object.keys(sim.params)]) expect(k).not.toMatch(/fish|poisson/i);
    expect(bodyEn('why-screw')).toMatch(/no fish model/);
    expect(bodyFr('why-screw')).toMatch(/aucun modèle de poisson/);
    expect(bodyEn('why-screw')).toMatch(/repeats what the video says/);
    // …and a rack with wide bars is still useful against logs (the sheet of the coarse rack says the same)
    expect(bodyEn('why-screw')).toMatch(/wide bars is still useful against logs/);
  });

  it('says that the screw is generic: sized by a published rule, not the video’s machine', () => {
    expect(bodyEn('why-screw')).toMatch(/generic screw/);
    expect(bodyFr('why-screw')).toMatch(/vis générique/);
    expect(bodyEn('why-screw')).toMatch(/published sizing rule/);
  });
});

describe('lesson 3 — why a speed multiplier', () => {
  const p = presetParams('full-size');
  const plant = plantFor(p);
  const op = solvePlant(p, p.riverFlow);

  it('trades speed for torque: power = torque × speed on both shafts, and the generator’s torque is about the screw’s over the ratio', () => {
    expect(Math.abs(op.torque * op.omega - op.shaftPower)).toBeLessThan(1);
    expect(Math.abs(op.generatorTorque * rpmToRad(op.generatorRpm) - op.shaftPower * op.driveEfficiency)).toBeLessThan(
      5,
    );
    const ratio = p.chainRatio * p.beltRatio;
    expect(op.torque / op.generatorTorque).toBeGreaterThan(ratio);
    expect(op.torque / op.generatorTorque).toBeLessThan(1.15 * ratio);
    expect(Math.round(op.torque)).toBe(FIG.torqueScrew[0]);
    expect(Math.round(op.generatorTorque)).toBe(FIG.torqueGen[0]);
  });

  it('reaches the generator’s rated speed with two stages of 3.3: 55 rpm × 10.9 = 600 rpm, and a single stage cannot do it', () => {
    expect(p.chainRatio).toBeCloseTo(3.3, 6);
    expect(p.beltRatio).toBeCloseTo(3.3, 6);
    expect(Math.round(p.chainRatio * p.beltRatio * 10) / 10).toBe(FIG.ratio[0]);
    expect(op.generatorRpm).toBeCloseTo(GEN_RATED_RPM, -1);
    expect(p.chainRatio * p.beltRatio).toBeGreaterThan(STAGE_RATIO_MAX);
    expect(stagesNeeded(p.chainRatio * p.beltRatio, STAGE_RATIO_MAX)).toBe(2);
    expect(Math.round(driveEfficiency(p.chainRatio, p.beltRatio) * 100)).toBe(FIG.etaDrive[0]);
    expect(CHAIN_EFFICIENCY * 100).toBe(FIG.chainEff[0]);
    expect(BELT_EFFICIENCY * 100).toBe(FIG.beltEff[0]);
    expect(FIG.stageMax[0]).toBe(STAGE_RATIO_MAX);
  });

  it('wrong ratio, in the scenario: belt × 0.45 speeds the screw up to about twice its speed (pockets half empty, 1.3 kW), belt × 1.9 holds it at about half (overflow, 1.2 kW)', () => {
    const setup = scenarioSetup('wrong-ratio');
    expect(setup.events[0]!.patch.beltRatio).toBeCloseTo(0.45 * p.beltRatio, 1);
    expect(setup.events[1]!.patch.beltRatio).toBeCloseTo(1.9 * p.beltRatio, 1);
    const sim = new MillSim();
    sim.applyScenario('wrong-ratio');
    const at = (t0: number, t1: number) => {
      for (let t = t0; t < t1; t += 1 / 30) sim.step(1 / 30);
      return { ...sim.state };
    };
    const before = at(0, 14);
    // the change comes at 15 s: for a moment the generator is under its cut-in and nothing charges, then the screw has raced up to it
    const justAfter = at(14, 15.2);
    expect(justAfter.charging).toBe(false);
    expect(justAfter.generatorRpm).toBeLessThan(FIG.cutInRpm[0]);
    const low = at(15.2, 30);
    const high = at(30, 100);
    const back = at(100, 150);
    expect(Math.abs(before.electricPower / 1000 - FIG.elecKw[0])).toBeLessThan(0.02);
    // too small a ratio: the generator would sit under its cut-in at the old speed, so the screw races to the speed that reaches it
    expect(p.chainRatio * 0.45 * p.beltRatio * plant.designRpm).toBeLessThan(FIG.cutInRpm[0]);
    expect(low.rpm / plant.designRpm).toBeGreaterThan(1.9);
    expect(low.rpm / plant.designRpm).toBeLessThan(2.3);
    expect(low.generatorRpm).toBeGreaterThanOrEqual(FIG.cutInRpm[0]);
    expect(low.charging).toBe(true);
    expect(low.fill).toBeGreaterThan(0.45);
    expect(low.fill).toBeLessThan(0.6);
    expect(Math.round(low.rpm)).toBe(LESSON_FIG.scenLowRpm[0]);
    expect(Math.abs(low.rpm - FIG.beltLowRpm[0])).toBeLessThan(2);
    expect(Math.round(low.electricPower / 100) / 10).toBe(FIG.beltLowEl[0]);
    // too large: the screw is held back and overflows
    expect(high.rpm / plant.designRpm).toBeGreaterThan(0.45);
    expect(high.rpm / plant.designRpm).toBeLessThan(0.55);
    expect(high.qOver / high.flow).toBeGreaterThan(0.3);
    expect(Math.round(high.rpm)).toBe(FIG.beltHighRpm[0]);
    expect(Math.round(high.electricPower / 100) / 10).toBe(FIG.beltHighEl[0]);
    // and right again at the end
    expect(Math.abs(back.electricPower - before.electricPower)).toBeLessThan(5);
    // the generator starts to charge at the figure of the quiz
    expect(Math.round(radToRpm(cutInOmega(plant.generator)))).toBe(FIG.cutInRpm[0]);
  });
});

describe('lesson 4 — which turbine for my site', () => {
  it('quotes the zones of the chooser: the screw 0.1 to 10 m and 0.01 to 14.5 m³/s, wheels 0.3 to 10 m, Kaplan from 2 m, crossflow 8 to 60 m, Pelton from 75 m', () => {
    expect(ZONES.screw.head).toEqual([0.1, 10]);
    expect(ZONES.screw.flow).toEqual([0.01, 14.5]);
    const wheels = [ZONES.undershot.head, ZONES.breastshot.head, ZONES.overshot.head];
    expect(Math.min(...wheels.map((h) => h[0]))).toBe(0.3);
    expect(Math.max(...wheels.map((h) => h[1]))).toBe(10);
    expect(ZONES.undershot.head).toEqual([0.3, 2]);
    expect(ZONES.breastshot.head).toEqual([1.5, 3]);
    expect(ZONES.overshot.head).toEqual([2.5, 10]);
    expect(ZONES.kaplan.head[0]).toBe(2);
    expect(ZONES.crossflow.head).toEqual([8, 60]);
    expect(ZONES.pelton.head[0]).toBe(75);
  });

  it('says the flows of the zones are estimates except the screw’s: no other zone has a reported flow range', () => {
    for (const [type, z] of Object.entries(ZONES)) {
      if (type === 'screw') expect(z.flow, type).not.toBeNull();
      else expect(z.flow, type).toBeNull();
    }
    expect(bodyEn('which-turbine')).toMatch(
      /the flows, except the screw’s, and the typical efficiency of each machine are the lab’s estimates/,
    );
  });

  it('opens the « River with a weir » starting point, 3 m and 2.2 m³/s, where the site falls in four zones at once', () => {
    const river = presetParams('river');
    expect(river.head).toBe(3);
    expect(river.designFlow).toBe(2.2);
    const fitting = candidatesFor(river.head, river.designFlow).filter((c) => c.fits);
    expect(fitting.map((c) => c.type).sort()).toEqual(['breastshot', 'kaplan', 'overshot', 'screw']);
    expect(lesson('which-turbine').focus.preset).toBe('river');
    expect(bodyEn('which-turbine')).toMatch(/four zones at once/);
  });

  it('puts 200 m and 20 L/s in the Pelton zone only: the screw stops at 10 m, the crossflow zone at 60 m', () => {
    expect(fits('pelton', 200, 0.02)).toBe(true);
    expect(fits('screw', 200, 0.02)).toBe(false);
    expect(fits('crossflow', 200, 0.02)).toBe(false);
    expect(fits('francis', 200, 0.02)).toBe(false);
    expect(lesson('which-turbine').quiz![0]!.answer).toBe(2);
  });

  it('retrieves the plants of the other videos: the crossflow plant is at 74 % (30 of 40.7 kW), the Pelton plant needs about 0.5 m³/s at 90 %', () => {
    expect(hydraulicPower(0.45, 9.22) / 1000).toBeCloseTo(40.7, 1);
    expect(30 / (hydraulicPower(0.45, 9.22) / 1000)).toBeCloseTo(0.737, 2);
    expect(ZONES.crossflow.eta).toBeCloseTo(0.74, 2);
    expect(987e3 / (ZONES.pelton.eta * RHO * G * 220)).toBeCloseTo(0.508, 2);
  });

  it('names the chart and the starting point as the interface names them, in both languages', () => {
    expect(LAB_STRINGS.chartChooser![0]).toContain('Quelle turbine pour mon site ?');
    expect(LAB_STRINGS.chartChooser![1]).toContain('Which turbine for my site?');
    expect(bodyFr('which-turbine')).toContain('« Quelle turbine pour mon site ? »');
    expect(bodyEn('which-turbine')).toContain('“Which turbine for my site?”');
    expect(bodyFr('which-turbine')).toContain(`« ${LAB_STRINGS.presetRiver![0]} »`);
    expect(bodyEn('which-turbine')).toContain(`“${LAB_STRINGS.presetRiver![1]}”`);
    expect(LESSONS[3]!.title.fr).toBe(LAB_STRINGS.chartChooser![0].split(' (')[0]);
    expect(LESSONS[3]!.title.en).toBe(LAB_STRINGS.chartChooser![1].split(' (')[0]);
  });
});

describe('lesson 5 — a wheel or a screw', () => {
  const p = presetParams('full-size');

  it('quotes both ranges of every source as the model’s table holds them', () => {
    const t = bodyEn('wheel-or-screw');
    const range = (r: [number, number]) => (r[0] === r[1] ? `about ${r[0] * 100}%` : `${r[0] * 100} to ${r[1] * 100}%`);
    const s = WHEEL_SOURCES;
    expect(t).toContain(
      `Overshot: ${range(s.overshot.encyclopaedia)} (encyclopaedia) or ${range(s.overshot.review!)} (review)`,
    );
    expect(t).toContain(`breastshot: ${range(s.breastshot.encyclopaedia)} or ${range(s.breastshot.review!)}`);
    expect(t).toContain(`undershot: ${range(s.undershot.encyclopaedia)} or ${range(s.undershot.review!)}`);
    // …and the heads of the first paragraph
    expect(t).toContain(`(heads of ${s.overshot.head[0]} to ${s.overshot.head[1]} m, according to one source)`);
    expect(t).toContain(`(${s.undershot.head[0]} to ${s.undershot.head[1]} m)`);
    expect(t).toContain(`(${s.breastshot.head[0]} to ${s.breastshot.head[1]} m)`);
  });

  it('is honest about the wheel: its constants are set on the ranges (overshot 82 % at 8 m, breastshot 75 % at 3 m), and its undershot wheel stays under both sources', () => {
    const peak = (type: WheelType, head: number) => {
      const w = sizeWheel(type, head, p.designFlow);
      let best = 0;
      for (let rpm = 1; rpm < 80; rpm += 0.1)
        best = Math.max(best, wheelPoint(w, { flow: p.designFlow, omega: rpmToRad(rpm) }).efficiency);
      return best;
    };
    expect(peak('overshot', 8)).toBeGreaterThanOrEqual(WHEEL_SOURCES.overshot.encyclopaedia[0]);
    expect(peak('overshot', 8)).toBeLessThanOrEqual(WHEEL_SOURCES.overshot.encyclopaedia[1]);
    expect(peak('breastshot', 3)).toBeGreaterThan(WHEEL_SOURCES.breastshot.review![0] - 0.02);
    for (const head of [0.5, 1, 1.75, 2])
      expect(peak('undershot', head), `undershot at ${head} m`).toBeLessThan(WHEEL_SOURCES.undershot.encyclopaedia[0]);
    expect(bodyEn('wheel-or-screw')).toMatch(/not an independent result/);
    expect(bodyFr('wheel-or-screw')).toMatch(/pas un résultat indépendant/);
    expect(bodyEn('wheel-or-screw')).toMatch(/flat paddles, stays under both sources/);
  });

  it('on the same water, the screw beats the breastshot wheel, which beats the undershot wheel (1.85 and 1.15 kW against 2.2 kW)', () => {
    const kw = (m: WheelType | 'screw') => {
      const w = presetParams('full-size', m);
      return solvePlant(w, w.riverFlow).electricPower / 1000;
    };
    expect(kw('screw')).toBeGreaterThan(kw('breastshot'));
    expect(kw('breastshot')).toBeGreaterThan(kw('undershot'));
    expect(Math.round(kw('breastshot') * 10) / 10).toBe(FIG.wheelBreastKw[0]);
    expect(Math.round(kw('undershot') * 10) / 10).toBe(FIG.wheelUnderKw[0]);
    // the two wheels of the scenario are inside their usual heads at 1.75 m; the overshot wheel is not
    expect(solvePlant(presetParams('full-size', 'breastshot'), 0.22).inRange).toBe(true);
    expect(solvePlant(presetParams('full-size', 'undershot'), 0.22).inRange).toBe(true);
    expect(solvePlant(presetParams('full-size', 'overshot'), 0.22).inRange).toBe(false);
  });

  it('turns slowly and needs a third stage: ratios of 30 to 61 against 10.9, three stages against two, so a lower drive efficiency', () => {
    const ratios = (['overshot', 'breastshot', 'undershot'] as const).map((m) => {
      const w = presetParams('full-size', m);
      return { m, ratio: w.chainRatio * w.beltRatio, eff: driveEfficiency(w.chainRatio, w.beltRatio) };
    });
    // the ratio that brings the generator to its rated speed at the wheel's speed
    const needed = (['overshot', 'breastshot', 'undershot'] as const).map(
      (m) => GEN_RATED_RPM / plantFor(presetParams('full-size', m)).designRpm,
    );
    expect(Math.round(Math.min(...needed))).toBe(FIG.ratioWheelLow[0]);
    expect(Math.round(Math.max(...needed))).toBe(FIG.ratioWheelHigh[0]);
    // …and the preset’s two rounded stages multiply to within a unit of it
    expect(Math.abs(Math.min(...ratios.map((r) => r.ratio)) - FIG.ratioWheelLow[0])).toBeLessThan(1);
    expect(Math.abs(Math.max(...ratios.map((r) => r.ratio)) - FIG.ratioWheelHigh[0])).toBeLessThan(1);
    const screwEff = driveEfficiency(p.chainRatio, p.beltRatio);
    for (const r of ratios) {
      expect(stagesNeeded(r.ratio, STAGE_RATIO_MAX), r.m).toBe(3);
      expect(r.eff, r.m).toBeLessThan(screwEff);
    }
    expect(stagesNeeded(p.chainRatio * p.beltRatio, STAGE_RATIO_MAX)).toBe(2);
  });

  it('wheel-instead, in the scenario: the screw, then a breastshot wheel at 30 s, then an undershot wheel at 70 s, on the same water', () => {
    const setup = scenarioSetup('wheel-instead');
    expect(setup.events.map((e) => [e.at, e.patch.machine])).toEqual([
      [30, 'breastshot'],
      [70, 'undershot'],
    ]);
    const sim = new MillSim();
    sim.applyScenario('wheel-instead');
    const seen: string[] = [];
    for (let t = 0; t < 100; t += 1 / 30) {
      sim.step(1 / 30);
      if (seen[seen.length - 1] !== sim.params.machine) seen.push(sim.params.machine);
    }
    expect(seen).toEqual(['screw', 'breastshot', 'undershot']);
    expect(sim.state.riverFlow).toBeCloseTo(p.riverFlow, 6);
  });
});

describe('lesson 6 — the year of the mill', () => {
  const p = presetParams('full-size');
  const year = simulateYear(p);

  it('draws three typical years (a brook, a mill race, a river) and the mill race averages 300 L/s with a median of 224 L/s', () => {
    expect(SITE_IDS).toEqual(['brook', 'race', 'river']);
    expect(Math.round(SITES.race.meanFlow * 1000)).toBe(FIG.meanRaceLs[0]);
    expect(Math.round(medianFlow('race') * 1000)).toBe(FIG.medianLs[0]);
  });

  it('assumes a tenth of the mean flow as the reserved flow (30 L/s), gate shut under 15 % of the design flow and above 6 times the median', () => {
    expect(RESERVED_FRACTION).toBe(0.1);
    expect(Math.round(reservedFlow('race') * 1000)).toBe(FIG.reservedLs[0]);
    expect(FIG.reservedPct[0]).toBe(10);
    expect(FLOW_MIN_FRAC * 100).toBe(FIG.lowCutPct[0]);
    expect(FLOOD_GATE_FACTOR).toBe(FIG.floodFactor[0]);
    expect(Math.round(floodFlow('race') * 100) / 100).toBe(FIG.floodM3[0]);
  });

  it('stops for 57 days of low water in the drawn year, and a river in the flood stops when the gate closes at 6 times the median', () => {
    expect(year.daysLowWater).toBe(FIG.daysLow[0]);
    expect(solvePlant(p, 0.056).stopped).toBe('lowWater');
    expect(solvePlant(p, 0.06).stopped).toBe('no');
    expect(solvePlant(p, floodFlow('race') * 1.01).stopped).toBe('flood');
    expect(solvePlant(p, floodFlow('race') * 0.99).stopped).toBe('no');
  });

  it('shows why the flood stops it: at the flow where the gate closes the water downstream is 1.17 m higher and 0.58 m of the 1.75 m head is left', () => {
    const rise = tailRise('race', floodFlow('race'));
    expect(Math.round(rise * 100) / 100).toBe(FIG.tailGate[0]);
    expect(Math.round((p.head - rise) * 100) / 100).toBe(FIG.headLeft[0]);
    // the head falls as the river rises, before the gate closes
    expect(solvePlant(p, 1.0).headNet).toBeLessThan(solvePlant(p, 0.3).headNet);
  });

  it('retrieves the year: 9,800 kWh, 1.1 kW on average, capacity factor 51 % (mean over rated), 7,400 hours, 28 % of the energy in 24.7 % of the days', () => {
    expect(Math.abs(year.energy - FIG.yearKwh[0])).toBeLessThan(60);
    expect(Math.round(year.meanPower / 100) / 10).toBe(FIG.meanKw[0]);
    expect(Math.round(year.capacityFactor * 100)).toBe(FIG.cf[0]);
    expect(year.capacityFactor).toBeCloseTo(year.meanPower / year.ratedPower, 6);
    expect(Math.round(year.ratedPower / 100) / 10).toBe(LESSON_FIG.ratedKw[0]);
    expect(year.hoursRunning / HOURS_PER_YEAR).toBeGreaterThan(0.5);
    expect(Math.abs(year.hoursRunning - FIG.hours[0])).toBeLessThan(50);
    expect(Math.round(year.winterShare * 100)).toBe(FIG.winter[0]);
    expect(Math.round((year.winterDays / 365) * 1000) / 10).toBe(FIG.winterShare[0]);
    // winter helps a little, not a lot
    expect(year.winterShare * 100).toBeGreaterThan(FIG.winterShare[0]);
    expect(year.winterShare * 100 - FIG.winterShare[0]).toBeLessThan(8);
    expect(HOURS_PER_YEAR).toBe(8760);
  });

  it('low water, in the scenario: the river falls from 220 to 30 L/s, the power falls, the gate closes and the screw stops', () => {
    const setup = scenarioSetup('low-water');
    expect(setup.ramps[0]).toMatchObject({ key: 'riverFlow', from: 0.22, to: 0.03 });
    const sim = new MillSim();
    sim.applyScenario('low-water');
    const power: number[] = [];
    for (let t = 0; t < 160; t += 1 / 30) {
      sim.step(1 / 30);
      if (Math.abs(t - 60) < 1 / 60 || Math.abs(t - 100) < 1 / 60) power.push(sim.state.electricPower);
    }
    expect(power[0]!).toBeGreaterThan(power[1]!);
    expect(sim.state.stopped).toBe('lowWater');
    expect(sim.state.electricPower).toBe(0);
    expect(sim.state.alarms).toContain('lowWater');
  });

  it('says plainly that the years are drawn, not measured, and that the reserved flow is an assumption', () => {
    expect(bodyEn('mill-year')).toMatch(/they are not measurements/);
    expect(bodyFr('mill-year')).toMatch(/ce ne sont pas des mesures/);
    expect(bodyEn('mill-year')).toMatch(/the lab assumes a tenth of the mean flow/);
    expect(quizEn('mill-year')).toMatch(/none of its sources gives that rule/);
    expect(lesson('mill-year').summary.en).toMatch(/not measured/);
  });

  it('says the rules once, in general terms: a water right, a reserved flow, fish passage, depending on the country (the Sources panel has the full text)', () => {
    const t = bodyEn('mill-year');
    expect(t).toMatch(/\*\*water right\*\*/);
    expect(t).toMatch(/\*\*reserved flow\*\*/);
    expect(t).toMatch(/fish must be able to pass/);
    expect(t).toMatch(/paperwork can take years/);
    expect(LAB_STRINGS.legal![1]).toMatch(/reserved flow/);
    expect(LAB_STRINGS.legal![1]).toMatch(/paperwork can take years/);
    // the French legal wording (« fondé en titre ») stays in the Sources panel, not in a lesson
    expect(bodyFr('mill-year')).not.toMatch(/fondé en titre/);
    for (const les of LESSONS) expect(bodyEn(les.id)).not.toMatch(/fondé/);
  });
});

// ------------------------------------------------------------------------------------------------ the words the lessons share with the interface

describe('the lessons agree with the interface', () => {
  it('has an intro of the interface that does not promise what the lessons are not', () => {
    const intro = LAB_STRINGS.lessonsIntroMill!;
    expect(intro).toBeDefined();
    expect(intro[0]).toMatch(/^Six leçons courtes/);
    expect(intro[1]).toMatch(/^Six short lessons/);
    expect((intro[0] + intro[1]).replace(/\b3D\b/g, '')).not.toMatch(/\d/);
    expect(intro[1]).toMatch(/quiz/);
    expect(LESSONS).toHaveLength(6);
    // …and it names what the lessons open, as the kit does
    expect(intro[1]).toMatch(/Simulation/);
  });

  it('keeps the existing template intro unchanged (it is the lead’s)', () => {
    expect(LAB_STRINGS.lessonsIntro![0]).toBe('Leçons courtes liées à la 3D.');
    expect(LAB_STRINGS.lessonsIntro![1]).toBe('Short lessons tied to the 3D view.');
  });

  it('says that nothing in the lessons is a construction plan: the numbers are the model’s, derived, or the sources’', () => {
    // the safety text of the Sources panel is the lead’s; the lessons never give a dimension beyond the lab’s derived ones
    for (const les of LESSONS) {
      const t = bodyEn(les.id);
      expect(t, les.id).not.toMatch(/\b(build|weld|drill|bolt|cut the)\b/i);
    }
  });

  it('shares its terms with the part sheets: the pocket, the trough, the countershaft-free drive, the reserved flow', () => {
    // the term « pocket / poche » is the part sheet’s name for the water between two blades
    expect(bodyFr('why-screw')).toMatch(/\*\*poche\*\*/);
    expect(bodyEn('why-screw')).toMatch(/\*\*pocket\*\*/);
    expect(bodyEn('mill-year')).toMatch(/\*\*reserved flow\*\*/);
    expect(bodyEn('speed-multiplier')).toMatch(/\*\*torque\*\*/);
    expect(bodyEn('speed-multiplier')).toMatch(/\*\*ratio\*\*/);
    expect(bodyEn('water-to-watts')).toMatch(/\*\*efficiency\*\*/);
    // the chain is the slow stage and the belt the fast one, as in the drive’s sheets
    expect(bodyEn('speed-multiplier')).toMatch(/chain of .*then a belt of/);
  });
});
