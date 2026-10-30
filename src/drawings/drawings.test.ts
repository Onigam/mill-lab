import { beforeAll, describe, expect, it } from 'vitest';
import { COLORS, Drawing, configureDrawings } from '@onigam/lab-kit/drawings';
import { setLang } from '@onigam/lab-kit/i18n';
import dimsSource from '../three/dims.ts?raw';
import machineSource from '../sim/machine.ts?raw';
import { FIG, MODEL } from '../data/figures';
import { PARTS } from '../data/parts';
import { nEn, nFr } from '../data/units';
import modelPanelSource from '../panels/model.ts?raw';
import { PART_CATEGORIES, WORLDS, partIds, type WorldId } from '../part-ids';
import { MillSim } from '../sim/engine';
import {
  BELT_EFFICIENCY,
  BRIDGE_FACTOR,
  BUS_VOLTS,
  CHAIN_EFFICIENCY,
  DIODE_DROP,
  GAP_COEFF,
  RADIUS_RATIO,
  SPEED_RULE_RPM,
} from '../sim/machine';
import { CHOOSER_BOX, POWER_LINES, TURBINE_TYPES, ZONES, equalPowerFlow, powerLine, zonePolygon } from '../sim/chooser';
import { cutInOmega, loadTorqueAtSlowShaft, radToRpm, rpmToRad } from '../sim/mech';
import { PRESET_IDS, presetParams } from '../sim/presets';
import { screwPoint } from '../sim/screw';
import { driveEfficiency, plantFor, solvePlant } from '../sim/system';
import * as DIMS from '../three/dims';
import * as GEN3D from '../three/generator/geometry';
import { POWER_PARTS } from '../three/powerroom/parts';
import {
  bladeGeometry,
  bucketLevels as bucketLevels3d,
  pocketSection as pocketSection3d,
  threadSpan,
} from '../three/screw/helix';
import { computeLayout } from '../three/screw/layout';
import { bandOutline, sprocketOutline } from './wheels';
import { FROM_MACHINE, MARKED_LOWER, PRINTED, STATUS, TAILRACE_REAL_M, USED } from './geom';
import { bucketLevels, frameOf, pocketPolygon, world } from './frame';
import { SHEETS } from './index';
import { LAYOUT as L01, ITEMS as ITEMS01 } from './pl01-site';
import { LAYOUT as L02, ITEMS as ITEMS02 } from './pl02-screw';
import { LAYOUT as L03, ITEMS as ITEMS03 } from './pl03-drive';
import * as GEN from './gen';
import { LAYOUT as L04, ITEMS as ITEMS04 } from './pl04-generator';
import { LAYOUT as L05, ITEMS as ITEMS05 } from './pl05-layout';
import { ITEMS as ITEMS06 } from './pl06-wiring';
import { counts, modulesOf, threadSpanPsi, ITEMS as ITEMS07 } from './pl07-blade';
import { LAYOUT as L08, LINE_ETA, PLANTS, peltonFlow, ITEMS as ITEMS08 } from './pl08-chart';
import { drivePoint, torqueCurve } from './model';
import { FakeElement, installFakeDom, textBoxes, textExtent, type TextBox } from './test-dom';

// The eight A3 sheets of the "Plans" mode by script (the lab standard asks for eight): the contract (ids, numbers, groups, worlds, parts), a render in
// French and in English with no NaN and no text on text, every number printed (a dims.ts / simulation / figures.ts value, or an allowed
// constant with its source), the marks (reported, derived, estimate) against the comments of dims.ts and machine.ts, the geometry against the
// 3D world, and the MODEL RESULTS of PL-03, PL-04, PL-06 and PL-07 recomputed from src/sim (they fail loudly if the model is recalibrated).

const CONTRACT = [
  { id: 'mill-race', number: 'PL-01', group: 'site', scene: 'site', parts: ITEMS01 },
  { id: 'screw-section', number: 'PL-02', group: 'screw', scene: 'screw', parts: ITEMS02 },
  { id: 'drive-electricity', number: 'PL-03', group: 'screw', scene: 'screw', parts: ITEMS03 },
  { id: 'generator-section', number: 'PL-04', group: 'generator', scene: 'generator', parts: ITEMS04 },
  { id: 'powerroom-layout', number: 'PL-05', group: 'powerroom', scene: 'powerroom', parts: ITEMS05 },
  { id: 'powerroom-wiring', number: 'PL-06', group: 'powerroom', scene: 'powerroom', parts: ITEMS06 },
  { id: 'blade-module', number: 'PL-07', group: 'screw', scene: 'screw', parts: ITEMS07 },
  { id: 'turbine-chart', number: 'PL-08', group: 'site', scene: 'site', parts: ITEMS08 },
] as const;

const LANGS = ['fr', 'en'] as const;
type Lang = (typeof LANGS)[number];
const key = (id: string, lang: Lang) => `${id}/${lang}`;
const rendered = new Map<string, FakeElement>();
const root = (d: { svg: SVGSVGElement }): FakeElement => d.svg as unknown as FakeElement;

beforeAll(() => {
  installFakeDom();
  configureDrawings({ project: { fr: 'MILL LAB — moulin', en: 'MILL LAB — mill' }, date: '2026-10-30' });
  for (const lang of LANGS) {
    setLang(lang);
    for (const s of SHEETS) rendered.set(key(s.id, lang), root(s.render()));
  }
  setLang('fr');
});

const boxes = (id: string, lang: Lang): TextBox[] => textBoxes(rendered.get(key(id, lang)) as FakeElement);
const texts = (id: string, lang: Lang): string[] => boxes(id, lang).map((t) => t.content);
const blob = (id: string, lang: Lang): string => texts(id, lang).join(' | ').replace(/\s+/g, ' ');
/** The texts of a sheet run together, so that a sentence that wraps over two lines is one sentence. */
const flat = (id: string, lang: Lang): string => texts(id, lang).join(' ').replace(/\s+/g, ' ');
const num = (lang: Lang) => (lang === 'fr' ? nFr : nEn);

// ------------------------------------------------------------------------------------------------ the contract

describe('the contract', () => {
  it('has exactly eight sheets, in reading order, with their ids, numbers, groups and worlds', () => {
    expect(SHEETS.map((s) => ({ id: s.id, number: s.number, group: s.group, scene: s.scene }))).toEqual(
      CONTRACT.map((c) => ({ id: c.id, number: c.number, group: c.group, scene: c.scene })),
    );
  });

  it('uses the four groups the lead declares, in the order of the numbers', () => {
    expect([...new Set(SHEETS.map((s) => s.group))]).toEqual(['site', 'screw', 'generator', 'powerroom']);
  });

  it('only shows frozen part ids of the world of the sheet, each once', () => {
    for (const s of SHEETS) {
      expect(WORLDS, s.id).toContain(s.scene);
      expect(s.parts?.length, s.id).toBeGreaterThan(0);
      expect(new Set(s.parts).size, `${s.id} lists a part twice`).toBe(s.parts!.length);
      for (const id of s.parts!) {
        expect(partIds(s.scene as WorldId), `${s.id}: ${id}`).toContain(id);
        expect(PART_CATEGORIES[s.scene as WorldId][id], id).toBeDefined();
        expect(PARTS.find((p) => p.id === id)?.scene, `${s.id}: ${id}`).toBe(s.scene);
      }
    }
    // PL-01 shows every part of the site, PL-03 the drive and the generator (the electronics are in the powerhouse), PL-04 and PL-05 every part of their world
    expect(SHEETS[0]!.parts).toEqual(partIds('site'));
    expect(
      SHEETS[2]!.parts!.map((id) => PART_CATEGORIES.screw[id]).every((c) => c === 'mechanical' || c === 'electrical'),
    ).toBe(true);
    for (const id of ['rectifier', 'charge-controller', 'battery']) expect(SHEETS[2]!.parts, id).not.toContain(id);
    expect(SHEETS[3]!.parts).toEqual(partIds('generator'));
    expect(SHEETS[4]!.parts).toEqual(partIds('powerroom'));
    expect(SHEETS[5]!.parts).toEqual(partIds('powerroom'));
  });

  it('writes a different title and description in French and in English, of 2 to 4 sentences', () => {
    for (const s of SHEETS) {
      expect(s.title.fr, s.id).not.toBe(s.title.en);
      expect(s.description.fr, s.id).not.toBe(s.description.en);
      for (const lang of LANGS) {
        expect(s.title[lang].length, `${s.id} ${lang}`).toBeGreaterThan(8);
        const sentences = s.description[lang].split(/(?<=[.!?])\s+/).filter(Boolean);
        expect(sentences.length, `${s.id} ${lang}`).toBeGreaterThanOrEqual(2);
        expect(sentences.length, `${s.id} ${lang}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('keeps research codes, internal words and names out of the titles and descriptions', () => {
    for (const s of SHEETS)
      for (const lang of LANGS) expect(forbidden(`${s.title[lang]} ${s.description[lang]}`), s.id).toEqual([]);
  });
});

/** What a visitor text must not contain: research codes (K12, S3), internal words (world, id, preset), the names of people, channels and brands. */
function forbidden(text: string): string[] {
  const out: string[] = [];
  for (const re of [
    /\b[KS]\d{1,2}\b/,
    /(?<!\p{L})(world|preset|monde|id)(?!\p{L})/iu,
    /Viseta|ArchiPelle|Paulygones|Révolution|Neozone|YouTube|Piggott|Rorres|Nagel|Dellinger|Lubitz|Simmons|Muysken|Brada|Wikipedia|Victron/i,
  ]) {
    const m = re.exec(text);
    if (m) out.push(m[0]);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ every sheet renders

describe('every sheet renders', () => {
  for (const c of CONTRACT) {
    for (const lang of LANGS) {
      it(`${c.number} (${lang}): a full A3 drawing with no NaN, no infinity and no empty text`, () => {
        const svg = rendered.get(key(c.id, lang)) as FakeElement;
        expect(svg.getAttribute('viewBox')).toBe('0 0 420 297');
        const nodes = svg.all();
        expect(nodes.length, 'elements').toBeGreaterThan(250);
        for (const e of nodes)
          for (const [k, v] of e.attrs)
            expect(/NaN|Infinity|undefined/.test(v), `${c.id} ${e.tag} ${k}="${v.slice(0, 60)}"`).toBe(false);
        const all = boxes(c.id, lang);
        expect(all.length).toBeGreaterThan(60);
        for (const t of all) {
          expect(t.content.trim().length, `${c.id}: empty text at ${t.x},${t.y}`).toBeGreaterThan(0);
          expect(/undefined|\[object|NaN/.test(t.content), `${c.id}: "${t.content}"`).toBe(false);
          expect(/'|\s\s/.test(t.content), `${c.id}: typographic apostrophes, no double space: "${t.content}"`).toBe(
            false,
          );
          expect(Number.isFinite(t.x) && Number.isFinite(t.y) && t.size > 0, `${c.id}: ${t.content}`).toBe(true);
        }
        expect(all.some((t) => t.content === c.number)).toBe(true);
      });

      it(`${c.number} (${lang}): every text stays inside the frame of the paper`, () => {
        for (const t of boxes(c.id, lang)) {
          if (t.rotated) continue;
          const b = textExtent(t);
          expect(b.x0, `${c.id}: "${t.content}"`).toBeGreaterThan(8.5);
          expect(b.x1, `${c.id}: "${t.content}"`).toBeLessThan(411.5);
          expect(b.y0, `${c.id}: "${t.content}"`).toBeGreaterThan(8.5);
          expect(b.y1, `${c.id}: "${t.content}"`).toBeLessThan(288.5);
        }
      });
    }
  }

  it('keeps every text of the sheet itself out of the title block (x 232–410, y 249–287)', () => {
    const frame = new Set<string>();
    for (const lang of LANGS) {
      setLang(lang);
      const blank = new Drawing();
      blank.frame({ title: 'x', number: 'x', scale: 'x' });
      for (const t of textBoxes(root(blank))) frame.add(t.content);
    }
    setLang('fr');
    for (const c of CONTRACT)
      for (const lang of LANGS) {
        const bad = boxes(c.id, lang)
          .filter((t) => !t.rotated && !frame.has(t.content) && textExtent(t).y1 > 249.5 && textExtent(t).x1 > 231.5)
          .filter((t) => !isTitleBlock(t))
          .map((t) => `${c.number} ${lang}: "${t.content}"`);
        expect(bad).toEqual([]);
      }
  });

  it('keeps the scale of the title block short enough for its cell', () => {
    for (const c of CONTRACT) {
      const t = texts(c.id, 'fr');
      const scale = t[t.indexOf('Échelle') + 1]!;
      expect(scale, c.id).toBeDefined();
      expect(scale.length, c.id).toBeLessThanOrEqual(12);
    }
  });

  it('writes the numbers the way of each language: decimal comma in French, decimal point in English', () => {
    for (const c of CONTRACT) {
      expect(
        texts(c.id, 'fr').filter((t) => /\d\.\d/.test(t) && !/\d{4}-\d{2}-\d{2}/.test(t)),
        `${c.id} fr`,
      ).toEqual([]);
      expect(
        texts(c.id, 'en').filter((t) => /\d,\d{1,2}(?!\d)/.test(t)),
        `${c.id} en`,
      ).toEqual([]);
    }
  });

  it('writes both languages with the same level of detail, the same numbers in the same places', () => {
    for (const c of CONTRACT) {
      const f = texts(c.id, 'fr');
      const e = texts(c.id, 'en');
      // a text may wrap over a different number of lines in each language: compare the sequence of numbers and the volume of text
      expect(Math.abs(f.length - e.length) / Math.max(f.length, e.length), c.id).toBeLessThan(0.05);
      // French: thousands by a space, decimals by a comma; English: thousands by a comma, decimals by a point. Both become 1000.5
      const normFr = (t: string): string => t.replace(/(\d)\s(\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
      const normEn = (t: string): string => t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
      const digitsOf = (ts: string[], norm: (t: string) => string): string[] =>
        norm(ts.join(' | ')).match(/\d+(?:\.\d+)?/g) ?? [];
      expect(digitsOf(f, normFr), c.id).toEqual(digitsOf(e, normEn));
      const cognates = new Set([
        'Notes',
        'Situation',
        'Dimensions',
        'Stator',
        'Francis',
        'Kaplan',
        'Pelton',
        'conduit',
        'Prototype',
      ]);
      const eSet = new Set(e);
      const same = f.filter(
        (t) => eSet.has(t) && /[a-zéèêàùç]{6,}/i.test(t) && !/^[A-Z0-9 .,·–-]+$/.test(t) && !cognates.has(t),
      );
      expect(same.slice(0, 6), `${c.id}: untranslated?`).toEqual([]);
    }
  });

  it('keeps each language to itself: no French word in the English texts, no English word in the French ones', () => {
    for (const c of CONTRACT) {
      const en = texts(c.id, 'en').join(' ');
      const fr = texts(c.id, 'fr').join(' ');
      expect(
        en.match(/(?<![\p{L}])(avec|dans|pour|sur|les|des|une|est|et|du|au|aux|vers|sous|par)(?![\p{L}])/giu) ?? [],
        `${c.id} en`,
      ).toEqual([]);
      expect(
        fr.match(/(?<![\p{L}])(the|and|of|with|for|from|into|at|is|are|to)(?![\p{L}])/giu) ?? [],
        `${c.id} fr`,
      ).toEqual([]);
    }
  });

  it('never lays a text on another text (estimated boxes; a rotated text is left out)', () => {
    const clashes: string[] = [];
    for (const c of CONTRACT)
      for (const lang of LANGS) {
        const ext = boxes(c.id, lang)
          .filter((t) => !t.rotated && t.content.trim().length > 1)
          .map((t) => ({ t, e: textExtent(t) }));
        for (let i = 0; i < ext.length; i++)
          for (let j = i + 1; j < ext.length; j++) {
            const a = ext[i]!;
            const b = ext[j]!;
            const sx = (e: ReturnType<typeof textExtent>): number => (e.x1 - e.x0) * 0.08;
            const sy = (e: ReturnType<typeof textExtent>): number => (e.y1 - e.y0) * 0.2;
            const ox = Math.min(a.e.x1 - sx(a.e), b.e.x1 - sx(b.e)) - Math.max(a.e.x0 + sx(a.e), b.e.x0 + sx(b.e));
            const oy = Math.min(a.e.y1 - sy(a.e), b.e.y1 - sy(b.e)) - Math.max(a.e.y0 + sy(a.e), b.e.y0 + sy(b.e));
            if (ox > 0.2 && oy > 0.2) clashes.push(`${c.number} ${lang}: "${a.t.content}" / "${b.t.content}"`);
          }
      }
    expect(clashes, clashes.slice(0, 15).join('\n')).toEqual([]);
  });

  it('carries the notice that the sheet is not a construction plan, what is generic on it (the screw, the generator, the room, the zones), and the legend of the marks', () => {
    const generic: Record<string, [RegExp, RegExp]> = {
      'mill-race': [/La vis est générique/, /The screw is generic/],
      'screw-section': [/La vis est générique/, /The screw is generic/],
      'drive-electricity': [/La vis est générique/, /The screw is generic/],
      'blade-module': [/La vis est générique/, /The screw is generic/],
      'generator-section': [/La génératrice est générique/, /The generator is generic/],
      'powerroom-layout': [/Le local est un exemple/, /The room is an example/],
      'powerroom-wiring': [/Le local est un exemple/, /The room is an example/],
      'turbine-chart': [/Les zones sont des ordres de grandeur/, /The zones are orders of magnitude/],
    };
    for (const c of CONTRACT)
      for (const lang of LANGS) {
        const t = flat(c.id, lang);
        expect(t, `${c.id} ${lang}`).toMatch(lang === 'fr' ? /plan de construction/ : /construction plan/);
        expect(t, `${c.id} ${lang}`).toMatch(generic[c.id]![lang === 'fr' ? 0 : 1]);
        expect(texts(c.id, lang), `${c.id} ${lang}`).toContain('123†');
        expect(texts(c.id, lang), `${c.id} ${lang}`).toContain('123*');
      }
  });

  it('says on PL-02 that the dimensions are derived by published design rules, and on PL-01 that the tailrace is drawn shortened', () => {
    expect(flat('screw-section', 'en')).toMatch(/derived from published design rules/);
    expect(flat('screw-section', 'fr')).toMatch(/dérivées de règles de calcul publiées/);
    expect(flat('mill-race', 'en')).toMatch(/shortened/);
    expect(flat('mill-race', 'fr')).toMatch(/abrégé/);
    expect(blob('mill-race', 'en')).toContain(`≈ ${TAILRACE_REAL_M} m in reality`);
    expect(blob('mill-race', 'fr')).toContain(`≈ ${TAILRACE_REAL_M} m en réalité`);
  });

  it('keeps research codes, internal words and the names of people, channels and brands off every sheet', () => {
    for (const c of CONTRACT)
      for (const lang of LANGS) expect(forbidden(texts(c.id, lang).join(' ')), `${c.id} ${lang}`).toEqual([]);
  });

  it('never presents the hoped powers (the prototype’s 200 W, the 2 kW target) as results: they do not appear', () => {
    for (const c of CONTRACT)
      for (const lang of LANGS) {
        const t = texts(c.id, lang).join(' ');
        expect(t, `${c.id} ${lang}`).not.toMatch(/\b200 W\b|\b2 kW\b|2,0 kW/);
      }
  });
});

/** A text that lies wholly inside the title block (the frame's own texts: title, subtitle, project, disclaimer, cells). */
function isTitleBlock(t: TextBox): boolean {
  const e = textExtent(t);
  return e.x0 > 231.5 && e.y0 > 249.5;
}

// ------------------------------------------------------------------------------------------------ the numbers

/**
 * Every number a sheet prints is one of three things: a value that a helper of geom.ts read from dims.ts, from the simulation or from figures.ts
 * (it is recorded in PRINTED when it is formatted), an item number of a parts list, or one of the constants below, with its source. A number typed
 * in a text that is none of them fails here.
 */
const ALLOWED: Record<string, string> = {
  '0': 'the first graduation of a scale bar and of an axis',
  '123': 'the example number of the legend of the marks (123, 123†, 123*)',
  '1': 'the numerator of a scale (1:n) and the first item',
  '2': 'the exponent 2/3 of the published speed rule, the second item',
  '3': 'the exponent 2/3 of the published speed rule, “3 L / S” buckets (threads), “3~” three-phase, the third item',
  '10': 'a graduation of the scale bar (10 m)',
  '20': 'a graduation of the scale bar (20 m)',
};

/** English thousands: 1,000 is the number 1000. */
const unthousand = (t: string): string => t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');

function tokens(text: string): string[] {
  return (
    unthousand(text)
      .replace(/PL-0\d/g, '')
      .replace(/\d{4}-\d{2}-\d{2}/g, '')
      .replace(/\b[AB]3\b/g, '')
      .match(/\d+(?:\.\d+)?/g) ?? []
  );
}

/** The graduations of the axes of the charts of PL-03: layout choices, not data. */
function axisTicks(): string[] {
  const out: string[] = [];
  const range = (max: number, step: number, d: number) => {
    for (let v = 0; v <= max + 1e-9; v += step) out.push(nEn(v, d));
  };
  range(L03.TORQUE.xMax, 25, 0);
  range(L03.TORQUE.yMax, 100, 0);
  range(L03.POWER.xMax, 25, 0);
  range(L03.POWER.yMax, 0.5, 1);
  // the logarithmic axes of PL-08: decades of head (m) and of flow (m³/s)
  for (const h of L08.X_TICKS) out.push(String(h));
  for (const q of L08.Y_TICKS) out.push(String(q));
  return out;
}

describe('the numbers printed on the sheets', () => {
  const printed = (): Set<string> => {
    const s = new Set<string>();
    for (const p of PRINTED) s.add(unthousand(p).replace(/^-/, ''));
    for (const k of Object.keys(ALLOWED)) s.add(k);
    for (const t of axisTicks()) s.add(t);
    for (let i = 1; i <= 12; i++) s.add(String(i));
    // the scales of the views (1:n) are recorded by scaleText
    return s;
  };

  it('has recorded numbers (the labels are generated, not typed)', () => {
    expect(PRINTED.size).toBeGreaterThan(40);
    expect(USED.size).toBeGreaterThan(20);
  });

  it('prints only numbers that are read from dims.ts, from the simulation or from figures.ts, or that are allowed with their source', () => {
    const ok = printed();
    const unknown: string[] = [];
    for (const c of CONTRACT) {
      const t = texts(c.id, 'en')
        .filter((x) => !/^\d{1,2}$/.test(x) || Number(x) > 12)
        .join(' | ');
      for (const tok of tokens(t)) if (!ok.has(tok)) unknown.push(`${c.number}: ${tok}`);
    }
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('has a reason for every allowed constant: none is unused', () => {
    const all = CONTRACT.flatMap((c) => texts(c.id, 'en')).join(' | ');
    const used = new Set(tokens(all));
    for (const k of Object.keys(ALLOWED)) expect(used.has(k), `allowed "${k}" is not on any sheet`).toBe(true);
  });

  it('types no number in a bilingual text of the sheets but the formulas of the rules', () => {
    const files = import.meta.glob('./pl0*.ts', { query: '?raw', import: 'default', eager: true }) as Record<
      string,
      string
    >;
    expect(Object.keys(files).length).toBe(8);
    const ok = ['S/3', 'S / 3', '3 L / S', 'D^(2/3)', '3~', '1:'];
    const bad: string[] = [];
    for (const [file, src] of Object.entries(files)) {
      // the strings given to l('fr', 'en'), to cat(…) and to text(…) that carry a digit
      for (const m of src.matchAll(/(['`])((?:\\.|(?!\1)[^\\\n])*?)\1/g)) {
        const text = m[2]!
          .replace(/\$\{[^}]*\}/g, '')
          .replace(/PL-0\d/g, '')
          .replace(/\b3D\b/g, '');
        if (!/[a-zA-Zéèêàùç]/.test(text) || !/\d/.test(text)) continue;
        if (/^(#|url\(|M\d|@|[0-9 .,-]+$)/.test(text) || /^\.\//.test(text) || /^[a-z-]+:/.test(text)) continue;
        // an identifier (the name of a figure or of a constant of dims.ts) is not a text
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(text)) continue;
        const rest = ok.reduce((t, w) => t.split(w).join(''), text);
        if (/\d/.test(rest)) bad.push(`${file}: "${text}"`);
      }
    }
    expect(bad).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------ the marks

describe('the marks (reported, derived, estimate) agree with the comments of dims.ts and machine.ts', () => {
  const RANK = { R: 2, D: 1, E: 0 } as const;
  type Rank = keyof typeof RANK;
  const first = (doc: string): Rank => {
    const m = /\b(reported|derived|estimate)\b/i.exec(doc);
    return m ? (m[1]!.toLowerCase() === 'reported' ? 'R' : m[1]!.toLowerCase() === 'derived' ? 'D' : 'E') : 'E';
  };
  /** The comment above `export const NAME` (the last comment before it), or ''. */
  function sectionDoc(source: string, name: string): string {
    const at = source.indexOf(`export const ${name} =`);
    const head = source.slice(0, at);
    const end = head.lastIndexOf('*/');
    const start = head.lastIndexOf('/**', end);
    return end > 0 && start >= 0 && head.slice(end).trim() === '*/' ? head.slice(start, end) : '';
  }
  /** The comment that stands directly above the top-level key `keyName` of an object `section`, or the one of the section. */
  function keyDoc(section: string, keyName: string): string {
    const at = dimsSource.indexOf(`export const ${section} = {`);
    const end = dimsSource.indexOf('\n} as const;', at);
    const body = dimsSource.slice(at, end).split('\n').slice(1);
    let doc = '';
    for (let i = 0; i < body.length; i++) {
      const line = body[i]!;
      if (/^ {2}\/\*\*/.test(line)) {
        let block = line;
        while (!block.includes('*/')) block += ' ' + body[++i]!;
        doc = block;
        continue;
      }
      const m = /^ {2}(\w+):/.exec(line);
      if (m) {
        if (m[1] === keyName) return doc || sectionDoc(dimsSource, section);
        doc = '';
      }
    }
    return sectionDoc(dimsSource, section);
  }
  /** Constants whose sheet mark is higher than the comment of dims.ts says, with the reason: the test fails if the comment changes meaning. */
  const RAISED: Record<string, RegExp> = {
    'DESIGN.screwRpm': /Nagel's rule/,
  };

  it('has used constants of dims.ts (the sheets are generated from it)', () => {
    expect([...USED].some((u) => u.startsWith('SITE.'))).toBe(true);
    expect([...USED].some((u) => u.startsWith('SCREW.'))).toBe(true);
    expect([...USED].some((u) => u.startsWith('DRIVE.'))).toBe(true);
  });

  it('never marks a dimension higher than the comment says (reported > derived > estimate)', () => {
    const wrong: string[] = [];
    for (const id of USED) {
      const [section, k] = id.split('.') as [string, string];
      const mark: Rank = MARKED_LOWER.has(id) ? 'E' : (STATUS[id] ?? 'E');
      let doc: Rank;
      if (FROM_MACHINE[id]) {
        const name = FROM_MACHINE[id]!;
        doc = first(
          sectionDoc(machineSource, name)
            .replace(/REPORTED/g, 'reported')
            .replace(/DERIVED/g, 'derived')
            .replace(/ESTIMATE/g, 'estimate'),
        );
      } else doc = first(keyDoc(section, k));
      if (RANK[mark] > RANK[doc]) {
        const reason = RAISED[id];
        if (!(reason && reason.test(keyDoc(section, k))))
          wrong.push(`${id}: the sheets say ${mark}, the comment says ${doc}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('only lowers a mark where the comment says derived or reported (a lowered mark is a real choice)', () => {
    for (const id of MARKED_LOWER) {
      const [section, k] = id.split('.') as [string, string];
      expect(RANK[first(keyDoc(section, k))], id).toBeGreaterThan(RANK.E);
      expect(USED.has(id), `${id} is not used`).toBe(true);
    }
  });

  it('marks the screw as the figures and the part sheets do: derived dimensions †, the length and the head *', () => {
    expect(STATUS['SCREW.outerDiameter']).toBe('D');
    expect(STATUS['SCREW.innerDiameter']).toBe('D');
    expect(STATUS['SCREW.pitch']).toBe('D');
    expect(STATUS['SCREW.gap']).toBe('D');
    expect(STATUS['SCREW.bucketVolume']).toBe('D');
    expect(STATUS['SCREW.slopeDeg']).toBe('R');
    expect(MARKED_LOWER.has('SCREW.length')).toBe(true);
    expect(MARKED_LOWER.has('DESIGN.head')).toBe(true);
  });
});

// ------------------------------------------------------------------------------------------------ the geometry is the 3D world's

describe('the screw in its frame is the one of the 3D world', () => {
  const f = frameOf(DIMS.DESIGN_SHAPE);
  const l3 = computeLayout(DIMS.DESIGN_SHAPE);

  it('has the same positions as src/three/screw/layout.ts', () => {
    for (const k of [
      'k',
      'beta',
      'L',
      'ro',
      'ri',
      'Rt',
      'Ro',
      'wallTop',
      'rj',
      'y0',
      'tailY',
      'poolRimY',
      'sLow',
      'sUp',
      'sChain',
      'sBelt',
      'sShaftEnd',
      'sShaftStart',
      'poolX0',
      'poolX1',
      'sInletEnd',
      'headX',
      'headTop',
      'headThick',
    ] as const)
      expect(f[k], k).toBeCloseTo((l3 as unknown as Record<string, number>)[k]!, 9);
    expect(f.inletY).toBeCloseTo(l3.y0 + l3.L * l3.sinB + l3.levels.hPass, 9);
  });

  it('has the same buckets: the levels of an empty and a full one, and the section of a pocket', () => {
    const lv = bucketLevels3d(DIMS.DESIGN_SHAPE);
    expect(bucketLevels(DIMS.DESIGN_SHAPE).hMin).toBeCloseTo(lv.hMin, 12);
    expect(bucketLevels(DIMS.DESIGN_SHAPE).hPass).toBeCloseTo(lv.hPass, 12);
    for (const fill of [1, 0.6, 0.2]) {
      const a = pocketPolygon(f, fill);
      const b = pocketSection3d(DIMS.DESIGN_SHAPE, fill);
      expect(a.length, `fill ${fill}`).toBe(b.length);
      a.forEach((p, i) => {
        expect(p[0], `fill ${fill} x${i}`).toBeCloseTo(b[i]![0], 9);
        expect(p[1], `fill ${fill} y${i}`).toBeCloseTo(b[i]![1], 9);
      });
    }
  });

  it('puts the world frame the way the 3D does: the axis rises by the head over the length of the flights', () => {
    const [x1, y1] = world(f, f.L, 0);
    const [x0, y0] = world(f, 0, 0);
    expect(y1 - y0).toBeCloseTo(DIMS.DESIGN.head, 9);
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(DIMS.SCREW.length, 9);
  });

  it('draws the section at a pocket and a top blade in the same plane (the cut B–B passes through both)', () => {
    // the pocket p has its centre at -S/4 + spacing (p + 1/2); the top blade j stands at S/4 + j spacing: they coincide for j = p - 1
    const p = 10;
    expect(-f.S / 4 + f.spacing * (p + 0.5)).toBeCloseTo(f.S / 4 + (p - 1) * f.spacing, 12);
  });
});

describe('PL-02 draws the screw with the dimensions of dims.ts, of figures.ts and of the rules', () => {
  for (const lang of LANGS) {
    const n = num(lang);
    const t = (): string[] => texts('screw-section', lang);
    it(`(${lang}) prints the diameters, the length, the head, the slope, the pitch and the bucket`, () => {
      const S = DIMS.SCREW;
      expect(t()).toContain(`Ø${n(S.outerDiameter, 2)} m†`);
      expect(t()).toContain(`Ø${n(S.innerDiameter, 2)} m†`);
      expect(t()).toContain(`L = ${n(S.length, 2)} m*`);
      expect(t()).toContain(`H = ${n(DIMS.DESIGN.head, 2)} m*`);
      expect(t()).toContain(`${n(S.slopeDeg, 0)}°`);
      expect(t()).toContain(`S = ${n(S.pitch, 2)} m†`);
      expect(t()).toContain(`S/3 = ${n(S.bladeSpacing, 2)} m†`);
      expect(t()).toContain(`${n(S.tailDepth, 2)} m†`);
      expect(t()).toContain(`${n(S.gap * 1000, 1)} mm†`);
      expect(blob('screw-section', lang)).toContain(`${n(S.bucketVolume * 1000, 0)} L†`);
      expect(blob('screw-section', lang)).toContain(`${n(S.buckets, 0)}`);
      expect(t()).toContain(`${n((S.outerDiameter - S.innerDiameter) / 2, 2)} m†`);
      expect(t()).toContain(`${n(DIMS.bladeThickness(S.outerDiameter) * 1000, 0)} mm*`);
    });
    it(`(${lang}) agrees with the figures the part sheets print (FIG), the rules and the model`, () => {
      const unit = lang === 'fr' ? ' tr/min†' : ' rpm†';
      expect(blob('screw-section', lang)).toContain(`${n(FIG.diameter[0], 2)} m†`);
      expect(blob('screw-section', lang)).toContain(`${n(FIG.inner[0], 2)} m†`);
      expect(blob('screw-section', lang)).toContain(`${n(FIG.length[0], 2)} m*`);
      expect(blob('screw-section', lang)).toContain(`${n(FIG.gapMm[0], 1)} mm†`);
      expect(blob('screw-section', lang)).toContain(`${n(FIG.bucketL[0], 0)} L†`);
      expect(blob('screw-section', lang)).toContain(`${n(FIG.buckets[0], 0)} ${lang === 'fr' ? 'poches' : 'pockets'}†`);
      expect(blob('screw-section', lang)).toContain(`${n(FIG.stepCm[0], 0)} cm†`);
      expect(blob('screw-section', lang)).toContain(`${n(FIG.tailDepth[0], 2)} m†`);
      expect(blob('screw-section', lang)).toContain(`${n(FIG.flowLs[0], 0)} L/s†`);
      expect(blob('screw-section', lang)).toContain(`${n(Math.round(DIMS.DESIGN.screwRpm), 0)}${unit}`);
      expect(blob('screw-section', lang)).toContain(`${n(RADIUS_RATIO, 4)} × D`);
      expect(blob('screw-section', lang)).toContain(`${n(GAP_COEFF, 4)} × √D`);
      expect(blob('screw-section', lang)).toContain(`${n(SPEED_RULE_RPM, 0)} / D^(2/3)`);
      expect(t()).toContain('123†');
    });
  }

  it('numbers the ten parts of the screw it shows, one balloon each, in the order of its list', () => {
    for (const lang of LANGS) {
      const names = ITEMS02.map((id) => PARTS.find((p) => p.id === id)!.name[lang].replace(/\s/g, ' '));
      for (const name of names) expect(blob('screw-section', lang), name).toContain(name);
    }
    expect(ITEMS02).toHaveLength(10);
  });

  it('draws the water of a full pocket in the rectangle between two blades, from the core to the tip (fill 1 at the design point)', () => {
    const f = frameOf(DIMS.DESIGN_SHAPE);
    const poly = pocketPolygon(f, 1);
    const xs = poly.map((p) => p[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(f.spacing - f.t, 9);
    expect(Math.min(...poly.map((p) => p[1]))).toBeCloseTo(-f.ro, 9);
    expect(Math.max(...poly.map((p) => p[1]))).toBeCloseTo(-f.ri, 9);
    expect(L02.A.scale).toBe(35);
  });
});

describe('PL-01 draws the site with the dimensions of dims.ts', () => {
  const S = DIMS.SITE;
  const P = L01.PLAN;
  /** A rect of the plan: its paper x, y, width and height, from the site coordinates (metres). */
  const planRect = (x0: number, x1: number, z0: number, z1: number) => ({
    x: P.ox + (x0 * 1000) / P.scale,
    y: P.oy + (z0 * 1000) / P.scale,
    width: ((x1 - x0) * 1000) / P.scale,
    height: ((z1 - z0) * 1000) / P.scale,
  });
  const rects = (lang: Lang) =>
    (rendered.get(key('mill-race', lang)) as FakeElement).all().filter((e) => e.tag === 'rect');
  const has = (lang: Lang, want: { x: number; y: number; width: number; height: number }, label: string): void => {
    const found = rects(lang).some((e) =>
      (['x', 'y', 'width', 'height'] as const).every((a) => Math.abs(Number(e.getAttribute(a)) - want[a]) < 0.01),
    );
    expect(found, `${label}: a rect at ${JSON.stringify(want)}`).toBe(true);
  };

  it('puts the river, the canal, the pit, the weir, the notch, the mill, the powerhouse and the house where the 3D world does', () => {
    for (const lang of LANGS) {
      has(lang, planRect(P.x0, P.x1, S.river.zNorth, S.river.zSouth), 'river');
      has(lang, planRect(S.canal.xMin, S.canal.xMax, S.canal.zNorth, S.canal.zSouth), 'canal');
      has(lang, planRect(S.chamber.xWest, S.chamber.xEast, S.canal.zNorth, S.canal.zSouth), 'pit');
      has(
        lang,
        planRect(S.weir.x - S.weir.thickness / 2, S.weir.x + S.weir.thickness / 2, S.river.zNorth, S.fishPass.z),
        'weir',
      );
      has(
        lang,
        planRect(
          S.weir.x - S.weir.thickness / 2 - 0.1,
          S.weir.x + S.weir.thickness / 2 + 0.1,
          S.notch.z - S.notch.width / 2,
          S.notch.z + S.notch.width / 2,
        ),
        'notch',
      );
      has(lang, planRect(S.tailrace.xEnd, S.chamber.xWest, S.canal.zNorth, S.canal.zSouth), 'tailrace');
      for (const [name, b] of [
        ['mill', S.mill],
        ['powerhouse', S.powerhouse],
        ['house', S.house],
      ] as const)
        has(lang, planRect(b.x - b.length / 2, b.x + b.length / 2, b.z - b.width / 2, b.z + b.width / 2), name);
    }
  });

  it('draws the tailrace as long as the 3D does (shortened) and says the real one is about 100 m', () => {
    expect(S.chamber.xWest - S.tailrace.xEnd).toBeCloseTo(S.tailrace.length, 9);
    for (const lang of LANGS) expect(blob('mill-race', lang)).toContain(`${num(lang)(S.tailrace.length, 1)} m*`);
  });

  it('prints the levels of dims.ts, with 0 at the upstream level, and the head of the design point', () => {
    for (const lang of LANGS) {
      const n = num(lang);
      const t = blob('mill-race', lang);
      for (const v of [
        S.weir.crestY,
        S.canal.bedY,
        S.tailY,
        S.river.bedUpY,
        S.river.bedDownY,
        S.chamber.floorY,
        S.groundY,
      ])
        expect(t, `${lang} level ${v}`).toContain(`${n(v, 2)} m*`);
      expect(t).toContain(`H = ${n(DIMS.DESIGN.head, 2)} m*`);
      expect(S.tailY).toBeCloseTo(-DIMS.DESIGN.head, 12);
      expect(t).toContain(`${n(0, 2)} m`);
      expect(t).not.toContain(`${n(0, 2)} m*`);
    }
  });

  it('prints the dimensions of the notch, the fish pass, the rack, the canal and the buildings', () => {
    for (const lang of LANGS) {
      const n = num(lang);
      const t = blob('mill-race', lang);
      const trim = (v: number): string => n(v, Math.abs(v - Math.round(v)) < 1e-9 ? 0 : 1);
      expect(t).toContain(`${trim(S.notch.width)} × ${trim(S.notch.depth)} m*`);
      expect(t).toContain(`${n(S.canal.zSouth - S.canal.zNorth, 1)} × ${n(S.canal.xMax - S.canal.xMin, 1)} m*`);
      expect(t).toContain(`${n(S.rack.spacing * 100, 0)} cm*`);
      expect(t).toContain(`${n((S.weir.crestY - S.tailY) / S.fishPass.pools, 2)} m*`);
      for (const b of [S.mill, S.powerhouse, S.house]) expect(t).toContain(`${trim(b.length)} × ${trim(b.width)} m*`);
      expect(t).toContain(`${n(DIMS.SCREW.length, 2)}* · ${n(DIMS.SCREW.outerDiameter, 2)} m†`);
    }
  });

  it('draws the 12 parts of the site, each numbered once in the plan, with the names of the catalogue', () => {
    expect(ITEMS01).toEqual(partIds('site'));
    for (const lang of LANGS) {
      const t = blob('mill-race', lang);
      for (const id of ITEMS01) expect(t, id).toContain(PARTS.find((p) => p.id === id)!.name[lang].replace(/\s/g, ' '));
    }
  });
});

// ------------------------------------------------------------------------------------------------ PL-03: the model results

describe('PL-03: the model results are recomputed from src/sim (they fail loudly if the model is recalibrated)', () => {
  const p = presetParams('full-size');
  const plant = plantFor(p);
  const op = solvePlant(p, p.riverFlow);
  const w = op.omega;
  const dp = drivePoint();

  it('reads the design point of the full-size preset: 1.75 m, 180 L/s, a screw of 0.86 m turning at 55 rpm', () => {
    expect(p.head).toBe(DIMS.DESIGN.head);
    expect(p.designFlow).toBe(DIMS.DESIGN.flow);
    expect(Math.round(plant.designRpm)).toBe(55);
    expect(p.chainRatio).toBe(DIMS.DESIGN.chainRatio);
    expect(p.beltRatio).toBe(DIMS.DESIGN.beltRatio);
  });

  it('gives the speeds, the torques and the powers of the three shafts by an independent route', () => {
    // the screw: the torque of the model at the speed where it meets the generator's
    expect(dp.screw.rpm).toBeCloseTo(op.rpm, 9);
    expect(dp.screw.torque).toBeCloseTo(
      screwPoint(plant.screw!, { flow: op.flow, omega: w, tailRise: op.tailRise }).torque,
      6,
    );
    expect(dp.screw.power).toBeCloseTo(dp.screw.torque * w, 6);
    // the countershaft: after the chain
    expect(dp.counter.rpm).toBeCloseTo(op.rpm * p.chainRatio, 9);
    expect(dp.counter.power).toBeCloseTo(dp.screw.power * CHAIN_EFFICIENCY, 6);
    expect(dp.counter.torque).toBeCloseTo(dp.counter.power / (w * p.chainRatio), 6);
    // the generator: after the belt
    expect(dp.generator.rpm).toBeCloseTo(op.rpm * p.chainRatio * p.beltRatio, 9);
    expect(dp.generator.power).toBeCloseTo(dp.screw.power * CHAIN_EFFICIENCY * BELT_EFFICIENCY, 6);
    expect(dp.generator.torque).toBeCloseTo(dp.generator.power / (w * p.chainRatio * p.beltRatio), 0);
    expect(dp.etaDrive).toBeCloseTo(driveEfficiency(p.chainRatio, p.beltRatio), 12);
    // the electricity
    expect(dp.bus).toBe(BUS_VOLTS);
    expect(dp.electric).toBeCloseTo(BUS_VOLTS * dp.current, 6);
    expect(dp.diodeLoss).toBeCloseTo(DIODE_DROP * dp.current, 9);
    expect(dp.cutInGenRpm).toBeCloseTo(radToRpm(cutInOmega(plant.generator)), 9);
    expect(dp.voc).toBeCloseTo(plant.generator.voltsPerRad * rpmToRad(dp.generator.rpm), 6);
  });

  it('FAILS IF THE MODEL IS RECALIBRATED: 55 rpm · 453 N·m · 2.61 kW, 182 rpm · 135 N·m · 2.56 kW, 600 rpm · 39 N·m · 2.46 kW, 53.7 V, 46 A, 2.20 kW, cut-in at 51 rpm', () => {
    expect(Math.round(dp.screw.rpm)).toBe(55);
    expect(Math.round(dp.screw.torque)).toBe(453);
    expect(dp.screw.power / 1000).toBeCloseTo(2.61, 2);
    expect(Math.round(dp.counter.rpm)).toBe(182);
    expect(Math.round(dp.counter.torque)).toBe(135);
    expect(dp.counter.power / 1000).toBeCloseTo(2.56, 2);
    expect(Math.round(dp.generator.rpm)).toBe(600);
    expect(Math.round(dp.generator.torque)).toBe(39);
    expect(dp.generator.power / 1000).toBeCloseTo(2.46, 2);
    expect(Math.round(dp.voc * 10) / 10).toBe(53.7);
    expect(Math.round(dp.current)).toBe(46);
    expect(Math.round((dp.electric / 1000) * 100) / 100).toBe(2.2);
    expect(Math.round(dp.diodeLoss)).toBe(69);
    expect(Math.round(dp.cutInScrewRpm)).toBe(51);
    expect(dp.chain).toBe(3.3);
    expect(dp.belt).toBe(3.3);
    expect(Math.round(dp.total * 10) / 10).toBe(10.9);
  });

  it('agrees with the rounded figures that the part sheets and the lessons print (MODEL, FIG)', () => {
    expect(Math.round(dp.screw.rpm)).toBe(MODEL.rpm);
    expect(Math.round(dp.screw.torque)).toBe(MODEL.torqueScrew);
    expect(Math.round(dp.counter.rpm)).toBe(MODEL.countershaftRpm);
    expect(Math.round(dp.counter.torque)).toBe(MODEL.countershaftTorque);
    expect(Math.round(dp.generator.torque)).toBe(MODEL.torqueGen);
    expect(Math.round(dp.screw.power / 10) / 100).toBe(MODEL.shaftKw);
    expect(Math.round(dp.generator.power / 10) / 100).toBe(MODEL.genShaftKw);
    expect(Math.round(dp.electric / 10) / 100).toBe(MODEL.elecKw);
    expect(Math.round(dp.voc * 10) / 10).toBe(MODEL.voc);
    expect(Math.round(dp.current)).toBe(MODEL.current);
    expect(Math.round(dp.diodeLoss)).toBe(MODEL.diodeLossW);
    expect(Math.round(dp.cutInScrewRpm)).toBe(MODEL.cutInScrewRpm);
  });

  for (const lang of LANGS) {
    it(`(${lang}) prints those results on the sheet, and the ratios, the teeth and the diameters of the 3D`, () => {
      const n = num(lang);
      const t = blob('drive-electricity', lang);
      const rpm = lang === 'fr' ? 'tr/min' : 'rpm';
      for (const [r, tq, kw] of [
        [dp.screw.rpm, dp.screw.torque, dp.screw.power],
        [dp.counter.rpm, dp.counter.torque, dp.counter.power],
        [dp.generator.rpm, dp.generator.torque, dp.generator.power],
      ] as const) {
        expect(t).toContain(`${n(r, 0)} ${rpm} · ${n(tq, 0)} N·m`);
        expect(t).toContain(`${n(kw / 1000, 2)} kW`);
      }
      expect(t).toContain(`${n(dp.voc, 1)} V`);
      expect(t).toContain(`${n(dp.current, 0)} A · ${n(dp.electric / 1000, 2)} kW`);
      expect(t).toContain(`${n(dp.diodeLoss, 0)} W`);
      expect(t).toContain(`${n(BUS_VOLTS, 0)} V*`);
      // ratios and wheels
      expect(t).toContain(`× ${n(FIG.chain[0], 1)}†`);
      expect(t).toContain(`× ${n(FIG.belt[0], 1)}†`);
      expect(t).toContain(`× ${n(FIG.ratio[0], 1)}†`);
      expect(t).toContain(`${n(DIMS.DRIVE.largeTeeth, 0)} ${lang === 'fr' ? 'dents' : 'teeth'}*`);
      expect(t).toContain(`${n(DIMS.smallTeeth(DIMS.DESIGN.chainRatio), 0)} ${lang === 'fr' ? 'dents' : 'teeth'}*`);
      expect(t).toContain(`Ø${n(2 * DIMS.largeSprocketRadius(), 2)} m*`);
      expect(t).toContain(`Ø${n(2 * DIMS.DRIVE.largePulleyRadius, 2)} m*`);
      expect(t).toContain(`Ø${n(2 * DIMS.smallPulleyRadius(DIMS.DESIGN.beltRatio), 2)} m*`);
      expect(t).toContain(`Ø${n(DIMS.DRIVE.countershaftRadius * 2000, 0)} mm*`);
      expect(t).toContain(`${n(DIMS.DRIVE.chainCentres, 2)} m*`);
      expect(t).toContain(`${n(DIMS.DRIVE.beltCentres, 2)} m*`);
      expect(t).toContain(`${n(FIG.chainEff[0], 0)} %`);
      expect(t).toContain(`${n(FIG.beltEff[0], 0)} %`);
      // the safety note quotes the runaway of the model
      expect(t).toContain(`${n(FIG.freeRunRpm[0], 0)} ${rpm}`);
      expect(t).toContain(`${n(FIG.freeRunVolts[0], 0)} V`);
    });
  }

  it('tags every model result: the box “MODEL RESULT” is on the sheet, and the model numbers are red', () => {
    for (const lang of LANGS) {
      expect(texts('drive-electricity', lang)).toContain(
        lang === 'fr' ? 'RÉSULTAT DU MODÈLE · pas une mesure' : 'MODEL RESULT · not a measurement',
      );
      const svg = rendered.get(key('drive-electricity', lang)) as FakeElement;
      const red = svg.all().filter((e) => e.tag === 'text' && e.getAttribute('fill') === COLORS.red);
      expect(red.length).toBeGreaterThan(15);
    }
  });

  it('draws the torque and the power curves of the simulation at their data coordinates', () => {
    // an independent route to what MillSim.getSpeedCurve gives: the plant at the speeds of the curve
    const c = torqueCurve();
    const ratio = p.chainRatio * p.beltRatio;
    const eff = driveEfficiency(p.chainRatio, p.beltRatio);
    for (const i of [0, 40, 80, 120, c.rpm.length - 1]) {
      const o = solvePlant(p, p.riverFlow, rpmToRad(c.rpm[i]!));
      expect(c.machine[i], `machine torque at ${c.rpm[i]} rpm`).toBeCloseTo(o.torque, 6);
      expect(c.power[i], `shaft power at ${c.rpm[i]} rpm`).toBeCloseTo(o.shaftPower, 6);
      expect(c.load[i], `load torque at ${c.rpm[i]} rpm`).toBeCloseTo(
        loadTorqueAtSlowShaft(plant.generator, rpmToRad(c.rpm[i]!), ratio, eff),
        6,
      );
    }
    expect(c.rpm.length).toBeGreaterThanOrEqual(120);
    const T = L03.TORQUE;
    const X = (v: number): number => T.x + (v / T.xMax) * T.w;
    const Y = (v: number): number => T.y + T.h - (v / T.yMax) * T.h;
    for (const lang of LANGS) {
      const svg = rendered.get(key('drive-electricity', lang)) as FakeElement;
      const line = svg
        .all()
        .find(
          (e) =>
            e.tag === 'polyline' &&
            e.getAttribute('stroke') === COLORS.water &&
            e.getAttribute('stroke-width') === '0.6',
        );
      expect(line, 'the torque of the screw').toBeDefined();
      const pts = (line!.getAttribute('points') as string)
        .split(' ')
        .map((q) => q.split(',').map(Number) as [number, number]);
      const inside = c.machine.filter((v) => v <= T.yMax).length;
      expect(pts.length).toBe(inside);
      for (const j of [0, Math.floor(inside / 2), inside - 1]) {
        expect(pts[j]![0], `x ${j}`).toBeCloseTo(X(c.rpm[j]!), 2);
        expect(pts[j]![1], `y ${j}`).toBeCloseTo(Y(c.machine[j]!), 2);
      }
    }
  });

  it('puts the operating point of the model on the crossing of the two curves', () => {
    const c = torqueCurve();
    // below the cut-in the generator asks nothing; the curves cross at the operating speed
    const k = c.rpm.findIndex((r) => r > dp.screw.rpm);
    const before = c.machine[k - 1]! - c.load[k - 1]!;
    const after = c.machine[k]! - c.load[k]!;
    expect(before).toBeGreaterThan(0);
    expect(after).toBeLessThan(0);
  });
});

describe('PL-03: the wheels, the chain and the belt', () => {
  const [cy, cz] = DIMS.DRIVE.countershaftAt;
  const [gy, gz] = DIMS.DRIVE.generatorAt;

  it('keeps the centres of the 3D: 0.78 m and 0.84 m between the shafts', () => {
    expect(Math.hypot(cz, cy)).toBeCloseTo(DIMS.DRIVE.chainCentres, 1);
    expect(Math.hypot(gz - cz, gy - cy)).toBeCloseTo(DIMS.DRIVE.beltCentres, 1);
  });

  it('puts the chain before the belt: the large sprocket on the screw, the large pulley on the countershaft, the small pulley on the generator', () => {
    expect(DIMS.largeSprocketRadius()).toBeGreaterThan(DIMS.sprocketRadius(DIMS.smallTeeth(DIMS.DESIGN.chainRatio)));
    expect(DIMS.DRIVE.largePulleyRadius).toBeGreaterThan(DIMS.smallPulleyRadius(DIMS.DESIGN.beltRatio));
    // the stages multiply: 56 / 17 and 0.20 / 0.0606 are 3.3
    expect(DIMS.DRIVE.largeTeeth / DIMS.smallTeeth(DIMS.DESIGN.chainRatio)).toBeCloseTo(DIMS.DESIGN.chainRatio, 1);
    expect(DIMS.DRIVE.largePulleyRadius / DIMS.smallPulleyRadius(DIMS.DESIGN.beltRatio)).toBeCloseTo(
      DIMS.DESIGN.beltRatio,
      9,
    );
  });

  it('draws a band tangent to both wheels (the chain and the belt of the 3D)', () => {
    const c1: [number, number] = [0, 0];
    const c2: [number, number] = [cz * 1000, cy * 1000];
    const r1 = DIMS.largeSprocketRadius() * 1000;
    const r2 = DIMS.sprocketRadius(DIMS.smallTeeth(DIMS.DESIGN.chainRatio)) * 1000;
    const { outline, runs } = bandOutline(c1, r1, c2, r2);
    for (const [a, b] of runs) {
      expect(Math.hypot(a[0] - c1[0], a[1] - c1[1])).toBeCloseTo(r1, 6);
      expect(Math.hypot(b[0] - c2[0], b[1] - c2[1])).toBeCloseTo(r2, 6);
      // the run is perpendicular to both radii
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      expect((dx * (a[0] - c1[0]) + dy * (a[1] - c1[1])) / Math.hypot(dx, dy) / r1).toBeCloseTo(0, 6);
      expect((dx * (b[0] - c2[0]) + dy * (b[1] - c2[1])) / Math.hypot(dx, dy) / r2).toBeCloseTo(0, 6);
    }
    expect(outline.length).toBeGreaterThan(40);
  });

  it('draws as many teeth as the 3D: 56 on the large sprocket, 17 on the small one', () => {
    expect(sprocketOutline([0, 0], DIMS.DRIVE.largeTeeth, 100, 25.4)).toHaveLength(4 * DIMS.DRIVE.largeTeeth);
    expect(sprocketOutline([0, 0], DIMS.smallTeeth(DIMS.DESIGN.chainRatio), 100, 25.4)).toHaveLength(4 * 17);
  });
});

describe('the model results are computed once', () => {
  it('keeps one copy of the drive point and of the curves', () => {
    expect(drivePoint()).toBe(drivePoint());
    expect(torqueCurve()).toBe(torqueCurve());
    expect(new MillSim().getSpeedCurve(10).rpm).toHaveLength(10);
  });
});

// ------------------------------------------------------------------------------------------------ the sheets of completion wave B (PL-04 to PL-08)

type Pt2 = [number, number];
const svgOf = (id: string, lang: Lang = 'en'): FakeElement => rendered.get(key(id, lang)) as FakeElement;
const polygonsOf = (id: string, lang: Lang = 'en'): Pt2[][] =>
  svgOf(id, lang)
    .all()
    .filter((e) => e.tag === 'polygon')
    .map((e) => (e.getAttribute('points') as string).split(' ').map((q) => q.split(',').map(Number) as Pt2));
const polylinesOf = (id: string, lang: Lang = 'en'): Pt2[][] =>
  svgOf(id, lang)
    .all()
    .filter((e) => e.tag === 'polyline')
    .map((e) => (e.getAttribute('points') as string).split(' ').map((q) => q.split(',').map(Number) as Pt2));
const circlesOf = (id: string, lang: Lang = 'en') =>
  svgOf(id, lang)
    .all()
    .filter((e) => e.tag === 'circle')
    .map((e) => ({ x: Number(e.getAttribute('cx')), y: Number(e.getAttribute('cy')), r: Number(e.getAttribute('r')) }));
const close = (a: Pt2, b: Pt2, tol = 0.02): boolean => Math.hypot(a[0] - b[0], a[1] - b[1]) <= tol;
/** A polygon with these corners (in any order of start, same order of walk) is on the sheet. */
const hasPolygon = (id: string, corners: Pt2[], tol = 0.02): boolean =>
  polygonsOf(id).some(
    (pts) => pts.length === corners.length && corners.every((c) => pts.some((p) => close(p, c, tol))),
  );
const redTexts = (id: string, lang: Lang = 'en'): string[] =>
  svgOf(id, lang)
    .all()
    .filter((e) => e.tag === 'text' && e.getAttribute('fill') === COLORS.red)
    .map((e) => e.textContent.replace(/[\u00a0\u202f]/g, ' '));

describe('the model results of PL-04, PL-06 and PL-07 are recomputed from src/sim (they fail loudly if the model is recalibrated)', () => {
  const p = presetParams('full-size');
  const op = solvePlant(p, p.riverFlow);
  const at = (patch: Partial<typeof p>) => solvePlant({ ...p, ...patch }, p.riverFlow);
  const dp = drivePoint();

  it('FAILS IF THE MODEL IS RECALIBRATED: 600 rpm, 39 N·m, 53.7 V, 46 A, 2.20 kW at the generator', () => {
    expect(Math.round(op.generatorRpm)).toBe(600);
    expect(Math.round(op.generatorTorque)).toBe(39);
    expect(Math.round(op.openCircuitVolts * 10) / 10).toBe(53.7);
    expect(Math.round(op.current)).toBe(46);
    expect(Math.round((op.electricPower / 1000) * 100) / 100).toBe(2.2);
    expect(Math.round(op.generatorRpm)).toBe(Math.round(dp.generator.rpm));
    expect(Math.round(dp.voc * 10) / 10).toBe(MODEL.voc);
    expect(Math.round(dp.current)).toBe(MODEL.current);
    expect(Math.round(dp.electric / 10) / 100).toBe(MODEL.elecKw);
    expect(Math.round(dp.generator.torque)).toBe(MODEL.torqueGen);
    expect(DIMS.GENERATOR_DESIGN.ratedRpm).toBe(600);
  });

  it('keeps the derived voltages and currents of a phase on the arithmetic of the model results', () => {
    const line = op.openCircuitVolts / BRIDGE_FACTOR;
    expect(Math.round(line * 10) / 10).toBe(FIG.genLineV[0]);
    expect(Math.round(line / Math.sqrt(3))).toBe(FIG.genPhaseV[0]);
    expect(Math.round(op.current * Math.sqrt(2 / 3))).toBe(FIG.genPhaseA[0]);
    // the inverter of 3 kW on a 48 V battery, and the resistance that swallows the electric power of the design point
    expect(Math.round((FIG.invKw[0] * 1000) / BUS_VOLTS)).toBe(FIG.invA[0]);
    expect(Math.round((BUS_VOLTS / op.current) * 100) / 100).toBe(FIG.dumpOhm[0]);
  });

  it('gives the screw its gap figures: the leak of 9 L/s and 155 W, 84.6 % with the gap of the rule, and the other three efficiencies', () => {
    const rounds = (name: keyof typeof FIG, exact: number) =>
      expect(Math.abs(FIG[name][0] - exact), name).toBeLessThanOrEqual(0.5 * 10 ** -FIG[name][1] + 1e-9);
    rounds('qGapLs', op.qGap * 1000);
    rounds('lossGapW', op.lossGap);
    rounds('etaScrew', op.etaMachine * 100);
    rounds('gap05Eff', at({ gapScale: 0.5 }).etaMachine * 100);
    rounds('gap2Eff', at({ gapScale: 2 }).etaMachine * 100);
    rounds('gap4Eff', at({ gapScale: 4 }).etaMachine * 100);
  });

  for (const lang of LANGS) {
    it(`(${lang}) prints the generator's point on PL-04 and PL-06 in red, as model results, and the figures that follow from them marked †`, () => {
      const n = num(lang);
      const rpm = lang === 'fr' ? 'tr/min' : 'rpm';
      for (const id of ['generator-section', 'powerroom-wiring']) {
        const red = redTexts(id, lang);
        for (const t of [
          `${n(op.generatorRpm, 0)} ${rpm}`,
          `${n(op.generatorTorque, 0)} N·m`,
          `${n(op.openCircuitVolts, 1)} V`,
          `${n(op.current, 0)} A`,
          `${n(op.electricPower / 1000, 2)} kW`,
        ])
          expect(red, `${id}: ${t}`).toContain(t);
        expect(texts(id, lang), id).toContain(
          lang === 'fr' ? 'RÉSULTAT DU MODÈLE · pas une mesure' : 'MODEL RESULT · not a measurement',
        );
      }
      expect(blob('generator-section', lang)).toContain(`${n(FIG.genPhaseV[0], 0)} V†`);
      expect(blob('generator-section', lang)).toContain(`${n(FIG.genPhaseA[0], 0)} A†`);
      expect(blob('powerroom-wiring', lang)).toContain(`${n(FIG.genLineV[0], 1)} V†`);
      expect(blob('powerroom-wiring', lang)).toContain(`${n(FIG.invA[0], 0)} A†`);
      expect(blob('powerroom-wiring', lang)).toContain(`${n(FIG.dumpOhm[0], 2)} Ω†`);
    });
  }
});

// ------------------------------------------------------------------------------------------------ PL-04: the generator drawn is the one of the 3D world

describe('PL-04 draws the generator of the 3D world, with the dimensions of dims.ts', () => {
  const D = DIMS.GENERATOR_DESIGN;
  it('has the same radii, stack, pitches, tooth angles and phases as src/three/generator/geometry.ts', () => {
    expect(GEN.R).toBeCloseTo(GEN3D.R, 12);
    expect(GEN.LEN).toBeCloseTo(GEN3D.LEN, 12);
    expect(GEN.STACK.x0).toBeCloseTo(GEN3D.STACK.x0, 12);
    expect(GEN.STACK.x1).toBeCloseTo(GEN3D.STACK.x1, 12);
    expect(GEN.R_SLOT).toBeCloseTo(GEN3D.R_SLOT, 12);
    expect(GEN.R_MAGNET).toBeCloseTo(GEN3D.R_MAGNET, 12);
    expect(GEN.R_CORE).toBeCloseTo(GEN3D.R_CORE, 12);
    expect(GEN.SLOT_PITCH).toBeCloseTo(GEN3D.SLOT_PITCH, 12);
    expect(GEN.POLE_PITCH).toBeCloseTo(GEN3D.POLE_PITCH, 12);
    expect(GEN.SHAFT_FRONT).toBeCloseTo(GEN3D.SHAFT_FRONT, 12);
    expect(GEN.SHAFT_BACK).toBeCloseTo(GEN3D.SHAFT_BACK, 12);
    expect(GEN.FOOT_TOP).toBeCloseTo(GEN3D.FOOT_TOP, 12);
    expect(GEN.FOOT_BOTTOM).toBeCloseTo(GEN3D.FOOT_BOTTOM, 12);
    for (let k = 0; k < D.slots; k++) {
      expect(GEN.toothAngle(k), `tooth ${k}`).toBeCloseTo(GEN3D.toothAngle(k), 12);
      expect(GEN.toothPhase(k), `phase ${k}`).toBe(GEN3D.toothPhase(k));
    }
  });

  it('cuts the lamination, the coil sides and the magnets as the 3D does (the section is seen from the pulley side: x is mirrored)', () => {
    const hole = GEN3D.statorShape()
      .holes[0]!.getPoints()
      .filter((_, i, a) => i < a.length);
    const mine = GEN.laminationHole();
    expect(Math.abs(hole.length - mine.length)).toBeLessThanOrEqual(1);
    mine.forEach(([x, y], i) => {
      expect(x, `point ${i}`).toBeCloseTo(-hole[i]!.x, 9);
      expect(y, `point ${i}`).toBeCloseTo(hole[i]!.y, 9);
    });
    for (const k of [0, 5, 23])
      for (const sg of [1, -1] as const) {
        const a = GEN.coilSidePoly(sg, GEN3D.toothAngle(k));
        const b = GEN3D.coilSidePoly(sg, GEN3D.toothAngle(k));
        a.forEach(([x, y], i) => {
          expect(x).toBeCloseTo(-b[i]![0], 9);
          expect(y).toBeCloseTo(b[i]![1], 9);
        });
      }
    const mag3 = GEN3D.magnetShape().getPoints();
    const mag = GEN.magnetPoly(0);
    expect(Math.abs(mag3.length - mag.length)).toBeLessThanOrEqual(1);
    mag.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(-mag3[i]!.x, 9);
      expect(y).toBeCloseTo(mag3[i]!.y, 9);
    });
  });

  it('draws the slots (one polygon of the lamination with all its points), 16 magnets and 48 coil sides in the section across the axis', () => {
    const hole = GEN.laminationHole().length;
    expect(polygonsOf('generator-section').some((p) => p.length === hole)).toBe(true);
    const inB = (p: Pt2[]): boolean => p.every(([x]) => Math.abs(x - L04.B.ox) < 60);
    const fillOf = (color: string): number =>
      svgOf('generator-section')
        .all()
        .filter((e) => e.tag === 'polygon' && e.getAttribute('fill') === color)
        .filter((e) => inB((e.getAttribute('points') as string).split(' ').map((q) => q.split(',').map(Number) as Pt2)))
        .length;
    expect(fillOf(FILL_NORTH)).toBe(D.poles / 2);
    expect(fillOf(FILL_SOUTH)).toBe(D.poles / 2);
    const copper = svgOf('generator-section')
      .all()
      .filter((e) => e.tag === 'polygon' && e.getAttribute('fill') === FILL_COPPER)
      .filter((e) => inB((e.getAttribute('points') as string).split(' ').map((q) => q.split(',').map(Number) as Pt2)));
    expect(copper.length).toBe(2 * D.slots);
  });

  for (const lang of LANGS) {
    it(`(${lang}) prints the frame, the stub, the stack, the bore and the sizes of the detail from dims.ts, all marked as estimates`, () => {
      const n = num(lang);
      const t = texts('generator-section', lang);
      const G = DIMS.GENERATOR;
      expect(t).toContain(`Ø${n(2 * G.bodyRadius, 2)} m*`);
      expect(t).toContain(`${n(G.stub, 2)} m*`);
      expect(t).toContain(`${n(G.bodyLength, 2)} m*`);
      expect(t).toContain(`${n(D.stator.stack, 2)} m*`);
      expect(t).toContain(`${n(D.gap * 1000, 1)} mm*`);
      expect(t).toContain(`${n(D.rotor.magnetThickness * 1000, 0)} mm*`);
      expect(t).toContain(`${n(D.stator.stem * 1000, 1)} mm*`);
      expect(t).toContain(`${n(D.stator.yoke * 1000, 0)} mm*`);
      expect(t).toContain(`${n((GEN.R_SLOT - D.stator.boreRadius) * 1000, 1)} mm*`);
      // no dimension of the machine is given without its asterisk: nothing on this sheet is reported or derived
      const lengths = t.filter((x) => /\d\s?(mm|m)(?![²a-z])/.test(x) && !/[*†]/.test(x) && !/^\d/.test(x));
      expect(
        lengths.filter((x) => /\bm\b|\bmm\b/.test(x) && /\d/.test(x)),
        `${lang}: a length without its mark`,
      ).toEqual([]);
    });
    it(`(${lang}) marks the poles, the slots, the coils of a phase, the frequency and the electrical angle as the lab's estimates`, () => {
      const n = num(lang);
      const t = texts('generator-section', lang);
      expect(t).toContain(`${n(D.poles, 0)}*`);
      expect(t).toContain(`${n(D.slots, 0)}*`);
      expect(t).toContain(`${n(D.slots / D.phases, 0)}*`);
      expect(t).toContain(`${n(DIMS.electricalFrequency(D.ratedRpm), 0)} Hz*`);
      expect(t).toContain(`${n((360 / D.slots) * (D.poles / 2), 0)}°*`);
      expect(texts('generator-section', lang)).toContain('123*');
    });
  }

  it('agrees with figures.ts on the counts and keeps the electrical frequency at poles × rpm / 120', () => {
    expect(FIG.genPoles[0]).toBe(D.poles);
    expect(FIG.genSlots[0]).toBe(D.slots);
    expect(FIG.genCoilsPerPhase[0]).toBe(D.slots / D.phases);
    expect(FIG.genFreq[0]).toBe(DIMS.electricalFrequency(D.ratedRpm));
    expect(DIMS.electricalFrequency(600)).toBe((D.poles * 600) / 120);
    expect(GEN.toothElectricalDeg()).toBeCloseTo(120, 9);
  });

  it('numbers the eight parts of the generator, in the order of the contract, with their names of the catalogue', () => {
    expect(ITEMS04).toEqual(partIds('generator'));
    for (const lang of LANGS)
      for (const id of ITEMS04)
        expect(blob('generator-section', lang), id).toContain(PARTS.find((q) => q.id === id)!.name[lang]);
  });
});

const FILL_NORTH = '#f4c9c4';
const FILL_SOUTH = '#c9d9ee';
const FILL_COPPER = '#f0d2ba';

// ------------------------------------------------------------------------------------------------ PL-05: the wall of the powerhouse

describe('PL-05 draws the powerhouse of the 3D world, with the dimensions of dims.ts', () => {
  const P = DIMS.POWERROOM;
  const E = DIMS.ELECTRONICS;
  const A = L05.A;
  const B = L05.B;
  /** The expected corners of a box of the elevation, in paper mm: x of its centre, bottom, size (w, h). */
  const elev = (x: number, y0: number, w: number, h: number): Pt2[] => {
    const X = (v: number): number => A.ox + (v * 1000) / A.scale;
    const Y = (v: number): number => A.oy - (v * 1000) / A.scale;
    return [
      [X(x - w / 2), Y(y0)],
      [X(x + w / 2), Y(y0)],
      [X(x + w / 2), Y(y0 + h)],
      [X(x - w / 2), Y(y0 + h)],
    ];
  };

  it('lists the ten parts in the order of the 3D room (the order of the current) and of the contract', () => {
    expect(ITEMS05).toEqual(partIds('powerroom'));
    expect([...POWER_PARTS]).toEqual(ITEMS05);
    expect(ITEMS05.slice(0, 8)).toEqual([
      'dc-breaker',
      'fuse-box',
      'rectifier',
      'charge-controller',
      'battery',
      'dump-load',
      'inverter',
      'energy-meter',
    ]);
  });

  it('puts every device of the elevation where dims.ts puts it, with its size', () => {
    const boxes: [string, Pt2[]][] = [
      ['breaker', elev(P.breaker.x, P.breaker.y - P.breaker.size[1] / 2, P.breaker.size[0], P.breaker.size[1])],
      ['fuses', elev(P.fuseBox.x, P.fuseBox.y - P.fuseBox.size[1] / 2, P.fuseBox.size[0], P.fuseBox.size[1])],
      ['rectifier', elev(P.rectifier.x, P.rectifier.bottom, E.rectifier[0], E.rectifier[1])],
      ['controller', elev(P.controller.x, P.controller.bottom, E.controller[0], E.controller[1])],
      ['battery', elev(P.battery.x, P.rack.shelf, E.battery[0], E.battery[1])],
      ['dump load', elev(P.dumpLoad.x, P.dumpLoad.y - P.dumpLoad.size[1] / 2, P.dumpLoad.size[0], P.dumpLoad.size[1])],
      ['inverter', elev(P.inverter.x, P.inverter.y - P.inverter.size[1] / 2, P.inverter.size[0], P.inverter.size[1])],
      ['meter', elev(P.meter.x, P.meter.y - P.meter.size[1] / 2, P.meter.size[0], P.meter.size[1])],
      ['board', elev(0, P.board.y0, 2 * P.board.halfWidth, P.board.y1 - P.board.y0)],
    ];
    for (const [name, corners] of boxes) expect(hasPolygon('powerroom-layout', corners), name).toBe(true);
  });

  it('puts the devices in the order of the current from the west wall to the east wall, and the battery in front of the board', () => {
    const xs = [P.breaker.x, P.fuseBox.x, P.rectifier.x, P.controller.x, P.dumpLoad.x, P.inverter.x, P.meter.x];
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(P.battery.z).toBeGreaterThan(P.board.thickness);
    // the room is the building of the site less its walls
    expect(P.width).toBeCloseTo(DIMS.SITE.powerhouse.length - 2 * P.wall, 12);
    expect(P.depth).toBeCloseTo(DIMS.SITE.powerhouse.width - 2 * P.wall, 12);
  });

  it('draws the plan: the walls, the doorway of the east wall, the board on the back wall, the battery on its rack, the earth rod', () => {
    const X = (v: number): number => B.ox + (v * 1000) / B.scale;
    const Z = (z: number): number => B.oy + (z * 1000) / B.scale;
    const half = P.width / 2;
    const walls: Pt2[][] = [
      [
        [X(-half - P.wall), Z(-P.wall)],
        [X(half + P.wall), Z(-P.wall)],
        [X(half + P.wall), Z(0)],
        [X(-half - P.wall), Z(0)],
      ],
      [
        [X(-half - P.wall), Z(P.depth)],
        [X(half + P.wall), Z(P.depth)],
        [X(half + P.wall), Z(P.depth + P.wall)],
        [X(-half - P.wall), Z(P.depth + P.wall)],
      ],
    ];
    for (const w of walls) expect(hasPolygon('powerroom-layout', w)).toBe(true);
    const zD1 = P.depth - P.door.fromFront;
    const zD0 = zD1 - P.door.width;
    expect(
      hasPolygon('powerroom-layout', [
        [X(half), Z(-P.wall)],
        [X(half + P.wall), Z(-P.wall)],
        [X(half + P.wall), Z(zD0)],
        [X(half), Z(zD0)],
      ]),
    ).toBe(true);
    expect(
      hasPolygon('powerroom-layout', [
        [X(half), Z(zD1)],
        [X(half + P.wall), Z(zD1)],
        [X(half + P.wall), Z(P.depth + P.wall)],
        [X(half), Z(P.depth + P.wall)],
      ]),
    ).toBe(true);
    expect(
      hasPolygon('powerroom-layout', [
        [X(-P.board.halfWidth), Z(0)],
        [X(P.board.halfWidth), Z(0)],
        [X(P.board.halfWidth), Z(P.board.thickness)],
        [X(-P.board.halfWidth), Z(P.board.thickness)],
      ]),
    ).toBe(true);
    const zb = P.battery.z;
    expect(
      hasPolygon('powerroom-layout', [
        [X(P.battery.x - E.battery[0] / 2), Z(zb - E.battery[2] / 2)],
        [X(P.battery.x + E.battery[0] / 2), Z(zb - E.battery[2] / 2)],
        [X(P.battery.x + E.battery[0] / 2), Z(zb + E.battery[2] / 2)],
        [X(P.battery.x - E.battery[0] / 2), Z(zb + E.battery[2] / 2)],
      ]),
    ).toBe(true);
    expect(circlesOf('powerroom-layout').some((c) => close([c.x, c.y], [X(P.rod.x), Z(P.rod.z)], 0.02))).toBe(true);
  });

  for (const lang of LANGS) {
    it(`(${lang}) prints the room, the board, the rack, the rod and the door from dims.ts as estimates, and the cable sections of the estimates of figures.ts`, () => {
      const n = num(lang);
      const t = texts('powerroom-layout', lang);
      const all = blob('powerroom-layout', lang);
      expect(all).toContain(`${n(P.width, 2)} m*`);
      expect(all).toContain(`${n(P.depth, 2)} m*`);
      expect(t).toContain(`${n(P.height, 2)} m*`);
      expect(t).toContain(`${n(P.board.y0, 2)} m*`);
      expect(t).toContain(`${n(P.board.y1, 2)} m*`);
      expect(t).toContain(`${n(P.rack.shelf, 2)} m*`);
      expect(all).toContain(`${n(P.rod.length, 1)} m*`);
      expect(all).toContain(`${n(P.door.width, 2)}* × ${n(P.door.height, 2)} m*`);
      expect(all).toContain(`${n(FIG.batCableMm2[0], 0)} mm²*`);
      expect(all).toContain(`${n(FIG.earthMm2[0], 0)} mm²*`);
      expect(all).toContain(`${n(P.breaker.size[0], 2)} × ${n(P.breaker.size[1], 2)} × ${n(P.breaker.size[2], 2)} m*`);
      expect(all).toContain(`${n(E.battery[0], 2)} × ${n(E.battery[1], 2)} × ${n(E.battery[2], 2)} m*`);
      for (const id of ITEMS05) expect(all, id).toContain(PARTS.find((q) => q.id === id)!.name[lang]);
    });
    it(`(${lang}) says that the cable routes are drawn without dimensions and that it is not a wiring plan`, () => {
      const all = flat('powerroom-layout', lang);
      expect(all).toMatch(lang === 'fr' ? /sans cote/ : /without dimensions/);
      expect(all).toMatch(lang === 'fr' ? /schéma de câblage/ : /wiring plan/);
      expect(all).toMatch(lang === 'fr' ? /conduit/ : /conduit/);
      expect(all).toMatch(lang === 'fr' ? /chemin de câbles/ : /cable tray/);
    });
  }
});

// ------------------------------------------------------------------------------------------------ PL-06: the wiring diagram

describe('PL-06 draws the one-line diagram of the powerhouse, with the estimates marked and the model results boxed', () => {
  for (const lang of LANGS) {
    it(`(${lang}) marks the ratings, the cable sections and the battery as estimates and the derived figures †`, () => {
      const n = num(lang);
      const all = blob('powerroom-wiring', lang);
      expect(all).toContain(`${n(FIG.breakerA[0], 0)} A*`);
      expect(all).toContain(`${n(FIG.fuseA[0], 0)} A*`);
      expect(all).toContain(`${n(FIG.invKw[0], 0)} kW*`);
      expect(all).toContain(`${n(FIG.batCableMm2[0], 0)} mm²*`);
      expect(all).toContain(`${n(FIG.earthMm2[0], 0)} mm²*`);
      expect(all).toContain(`${n(BUS_VOLTS, 0)} V*`);
      expect(all).toContain(`${n(FIG.diodeDrop[0], 1)} V*`);
      expect(all).toContain('123†');
      expect(all).toContain('123*');
    });
    it(`(${lang}) says what the lab does not simulate (the dump load, the inverter, the house) and that the sheet is not a wiring plan`, () => {
      const all = flat('powerroom-wiring', lang);
      const not = lang === 'fr' ? /non simulé/g : /not simulated/g;
      expect((all.match(not) ?? []).length).toBeGreaterThanOrEqual(3);
      expect(all).toMatch(lang === 'fr' ? /ne simule pas/i : /does not simulate/i);
      expect(all).toMatch(
        lang === 'fr'
          ? /charge de délestage, le régulateur, l’onduleur, la maison/
          : /dump load, the controller, the inverter, the house/,
      );
      expect(all).toMatch(lang === 'fr' ? /pas un plan de câblage/ : /not a wiring plan/);
      expect(all).toMatch(lang === 'fr' ? /plan de construction/ : /construction plan/);
    });
    it(`(${lang}) numbers the ten parts of the powerhouse as PL-05 does, and says that a real board puts its protections elsewhere`, () => {
      const all = blob('powerroom-wiring', lang);
      for (const id of ITEMS06) expect(all, id).toContain(PARTS.find((q) => q.id === id)!.name[lang]);
      expect(flat('powerroom-wiring', lang)).toMatch(
        lang === 'fr' ? /Dans une installation réelle/ : /In a real installation/,
      );
      for (let i = 1; i <= ITEMS06.length; i++)
        expect(texts('powerroom-wiring', lang), `balloon ${i}`).toContain(String(i));
    });
  }

  it('lists the same ten parts in the same order as PL-05', () => {
    expect(ITEMS06).toEqual(ITEMS05);
  });
});

// ------------------------------------------------------------------------------------------------ PL-07: the blade module

describe('PL-07 draws the modules of a thread as the 3D cuts them, with the dimensions of dims.ts and the published rules', () => {
  const S = DIMS.SCREW;
  it('cuts the threads where the 3D does and counts as many modules and bolts as the 3D builds', () => {
    const span = threadSpan(DIMS.DESIGN_SHAPE);
    for (let k = 0; k < S.threads; k++) {
      const [lo, hi] = threadSpanPsi(k);
      expect(lo, `thread ${k}`).toBeCloseTo(span.psiLo[k]!, 12);
      expect(hi, `thread ${k}`).toBeCloseTo(span.psiHi[k]!, 12);
    }
    const g = bladeGeometry(DIMS.DESIGN_SHAPE);
    expect(counts().modules).toBe(g.modules);
    expect(counts().bolts).toBe(g.boltCount);
    expect(counts().bolts).toBe(counts().modules * DIMS.BOLTS_PER_MODULE);
    // four modules to a turn, a quarter turn each, the joints on the same radii for the three threads
    const m0 = modulesOf(0);
    expect(m0[1]!.j - m0[0]!.j).toBe(1);
    expect(m0[2]!.a - m0[1]!.a).toBeCloseTo((2 * Math.PI) / DIMS.MODULES_PER_TURN, 9);
    expect(DIMS.MODULES_PER_TURN).toBe(4);
  });

  for (const lang of LANGS) {
    it(`(${lang}) prints the diameters, the pitch, the spacing, the gap and the pocket derived †, the thickness, the wall and the bolts estimated *`, () => {
      const n = num(lang);
      const t = texts('blade-module', lang);
      const all = blob('blade-module', lang);
      expect(t).toContain(`Ø${n(S.outerDiameter, 2)} m†`);
      expect(t).toContain(`Ø${n(S.innerDiameter, 2)} m†`);
      expect(t).toContain(`S = ${n(S.pitch, 2)} m†`);
      expect(t).toContain(`S/3 = ${n(S.bladeSpacing, 2)} m†`);
      expect(t).toContain(`S/${DIMS.MODULES_PER_TURN} = ${n(S.pitch / DIMS.MODULES_PER_TURN, 2)} m*`);
      expect(all).toContain(`${n(S.gap * 1000, 1)} mm†`);
      expect(all).toContain(`${n(S.bucketVolume * 1000, 0)} L†`);
      expect(all).toContain(`${n(DIMS.bladeThickness(S.outerDiameter) * 1000, 1)} mm*`);
      expect(all).toContain(`${n(DIMS.coreWall(S.outerDiameter) * 1000, 0)} mm*`);
      expect(all).toContain(`Ø${n(DIMS.BOLT.shank * 1000, 0)} mm*`);
      expect(all).toContain(`≈ ${n(counts().modules, 0)}*`);
      expect(all).toContain(`≈ ${n(counts().bolts, 0)}*`);
      expect(all).toContain(`${n(S.length, 2)} m*`);
      expect(all).toContain(`${n(GAP_COEFF, 4)} × √D`);
    });
  }

  it('shows the gap of the model: the leak, the loss and the four efficiencies, boxed as model results', () => {
    for (const lang of LANGS) {
      const n = num(lang);
      const all = blob('blade-module', lang);
      expect(all).toContain(`${n(FIG.qGapLs[0], 0)} L/s · ${n(FIG.lossGapW[0], 0)} W`);
      for (const name of ['etaScrew', 'gap05Eff', 'gap2Eff', 'gap4Eff'] as const)
        expect(all, name).toContain(`${n(FIG[name][0], FIG[name][1])} %`);
      expect(texts('blade-module', lang)).toContain(
        lang === 'fr' ? 'RÉSULTAT DU MODÈLE · pas une mesure' : 'MODEL RESULT · not a measurement',
      );
    }
  });

  it('only draws what the screw world has: the module, the fastener, the core, the trough and the water of a pocket', () => {
    expect(ITEMS07).toEqual(['blade-module', 'blade-fastener', 'screw-core', 'trough', 'trapped-water']);
    for (const id of ITEMS07) expect(PARTS.find((p) => p.id === id)?.scene).toBe('screw');
  });
});

// ------------------------------------------------------------------------------------------------ PL-08: which turbine for my site?

describe('PL-08 draws the chooser of the simulation: its zones, its lines of equal power, the presets and the plants of another video', () => {
  const C = L08.CHART;
  const B = CHOOSER_BOX;
  const X = (lh: number): number => C.x + ((lh - B.xMin) / (B.xMax - B.xMin)) * C.w;
  const Y = (lq: number): number => C.y + C.h - ((lq - B.yMin) / (B.yMax - B.yMin)) * C.h;
  const mapped = (pts: [number, number][]): Pt2[] => pts.map(([a, b]) => [X(a), Y(b)]);

  it('has one outline per type of src/sim/chooser.ts, at the coordinates of its zone polygon (log10 head, log10 flow in the box of the chooser)', () => {
    expect(TURBINE_TYPES).toHaveLength(8);
    const lines = polygonsOf('turbine-chart');
    for (const type of TURBINE_TYPES) {
      const want = mapped(zonePolygon(type, B));
      const found = lines.some(
        (pts) =>
          (pts.length === want.length && pts.every((p, i) => close(p, want[i]!, 0.01))) ||
          (pts.length === want.length && pts.every((p, i) => close(p, want[want.length - 1 - i]!, 0.01))),
      );
      expect(found, type).toBe(true);
    }
  });

  it('draws the lines of equal power at the efficiency of the panel, from powerLine of the chooser', () => {
    expect(modelPanelSource).toContain(`powerLine(p, ${LINE_ETA}, box)`);
    const lines = polylinesOf('turbine-chart');
    for (const power of POWER_LINES) {
      const want = mapped(powerLine(power, LINE_ETA, B, 80).filter(([, y]) => Number.isFinite(y)));
      expect(
        lines.some(
          (pts) =>
            pts.length === want.length &&
            close(pts[0]!, want[0]!, 0.01) &&
            close(pts[pts.length - 1]!, want[want.length - 1]!, 0.01),
        ),
        `${power} W`,
      ).toBe(true);
    }
  });

  it('puts the design point and the three other presets at their head and flow, and says which is which', () => {
    const circles = circlesOf('turbine-chart');
    for (const id of PRESET_IDS) {
      const q = presetParams(id);
      const c = [X(Math.log10(q.head)), Y(Math.log10(q.designFlow))] as Pt2;
      expect(
        circles.some((k) => close([k.x, k.y], c, 0.01)),
        id,
      ).toBe(true);
    }
    expect(PRESET_IDS).toHaveLength(4);
  });

  it('puts the two plants of another video where their numbers say: 9.22 m, 450 L/s and 30 kW; 220 m and 987 kW, the flow of the second derived at the efficiency of a Pelton turbine', () => {
    expect(PLANTS.crossflow).toEqual({ head: 9.22, flow: 0.45, power: 30000 });
    expect(PLANTS.pelton).toEqual({ head: 220, power: 987000 });
    expect(peltonFlow()).toBeCloseTo(equalPowerFlow(987000, 220, ZONES.pelton.eta), 12);
    expect(Math.round(peltonFlow() * 100) / 100).toBe(0.51);
    const diamonds = polygonsOf('turbine-chart').filter((p) => p.length === 4);
    const centre = (p: Pt2[]): Pt2 => [(p[0]![0] + p[2]![0]) / 2, (p[0]![1] + p[2]![1]) / 2];
    for (const [h, q] of [
      [PLANTS.crossflow.head, PLANTS.crossflow.flow],
      [PLANTS.pelton.head, peltonFlow()],
    ] as const)
      expect(
        diamonds.some((p) => close(centre(p), [X(Math.log10(h)), Y(Math.log10(q))], 0.01)),
        `${h} m`,
      ).toBe(true);
  });

  for (const lang of LANGS) {
    it(`(${lang}) prints the heads of the zones from the chooser, the reported numbers of the plants plain, the derived flow marked *, and names the plants "another video"`, () => {
      const n = num(lang);
      const all = blob('turbine-chart', lang);
      const to = lang === 'fr' ? 'à' : 'to';
      for (const type of TURBINE_TYPES) {
        const [a, b] = ZONES[type].head;
        const d = (v: number): number => (Number.isInteger(v) ? 0 : 1);
        expect(all, type).toContain(`${n(a, d(a))} ${to} ${n(b, d(b))} m`);
      }
      expect(all).toContain(`${n(PLANTS.crossflow.head, 2)} m`);
      expect(all).not.toContain(`${n(PLANTS.crossflow.head, 2)} m*`);
      expect(all).toContain(`${n(PLANTS.crossflow.flow * 1000, 0)} L/s`);
      expect(all).toContain(`${n(PLANTS.pelton.head, 0)} m`);
      expect(all).toContain(`${n(peltonFlow() * 1000, 0)} L/s*`);
      expect(all).toContain(lang === 'fr' ? 'autre vidéo' : 'another video');
      expect(all).toContain(`${n(LINE_ETA * 100, 0)} %*`);
      expect(all).toContain(`${n(FIG.head[0], 2)} m*`);
      expect(all).toContain(`${n(FIG.flowLs[0], 0)} L/s†`);
      expect((all.match(/Pelton Lab/g) ?? []).length, 'the link to Pelton Lab is a text note, once').toBe(1);
      expect(flat('turbine-chart', lang)).toMatch(lang === 'fr' ? /zones se chevauchent/ : /zones overlap/);
      expect(flat('turbine-chart', lang)).toMatch(lang === 'fr' ? /sources ne s’accordent pas/ : /sources disagree/);
      for (const v of L08.X_TICKS)
        expect(all, `${v}`).toContain(lang === 'fr' ? nFr(v, v < 1 ? 1 : 0) : nEn(v, v < 1 ? 1 : 0));
    });
  }

  it('ties the sheet to the parts of the site that carry the head and the flow: the river, the weir, the headrace and the water chamber', () => {
    expect(ITEMS08).toEqual(['river', 'weir', 'headrace', 'water-chamber']);
    for (const id of ITEMS08) expect(partIds('site')).toContain(id);
  });
});
