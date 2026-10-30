import { beforeAll, describe, expect, it } from 'vitest';
import { COLORS, Drawing, configureDrawings } from '@onigam/lab-kit/drawings';
import { setLang } from '@onigam/lab-kit/i18n';
import dimsSource from '../three/dims.ts?raw';
import machineSource from '../sim/machine.ts?raw';
import { FIG, MODEL } from '../data/figures';
import { PARTS } from '../data/parts';
import { nEn, nFr } from '../data/units';
import { PART_CATEGORIES, WORLDS, partIds, type WorldId } from '../part-ids';
import { MillSim } from '../sim/engine';
import {
  BELT_EFFICIENCY,
  BUS_VOLTS,
  CHAIN_EFFICIENCY,
  DIODE_DROP,
  GAP_COEFF,
  RADIUS_RATIO,
  SPEED_RULE_RPM,
} from '../sim/machine';
import { cutInOmega, loadTorqueAtSlowShaft, radToRpm, rpmToRad } from '../sim/mech';
import { presetParams } from '../sim/presets';
import { screwPoint } from '../sim/screw';
import { driveEfficiency, plantFor, solvePlant } from '../sim/system';
import * as DIMS from '../three/dims';
import { bucketLevels as bucketLevels3d, pocketSection as pocketSection3d } from '../three/screw/helix';
import { computeLayout } from '../three/screw/layout';
import { bandOutline, sprocketOutline } from './wheels';
import { FROM_MACHINE, MARKED_LOWER, PRINTED, STATUS, TAILRACE_REAL_M, USED } from './geom';
import { bucketLevels, frameOf, pocketPolygon, world } from './frame';
import { SHEETS } from './index';
import { LAYOUT as L01, ITEMS as ITEMS01 } from './pl01-site';
import { LAYOUT as L02, ITEMS as ITEMS02 } from './pl02-screw';
import { LAYOUT as L03, ITEMS as ITEMS03 } from './pl03-drive';
import { drivePoint, torqueCurve } from './model';
import { FakeElement, installFakeDom, textBoxes, textExtent, type TextBox } from './test-dom';

// The three A3 sheets of the "Plans" mode by script (the owner chose Lite): the contract (ids, numbers, groups, worlds, parts), a render in
// French and in English with no NaN and no text on text, every number printed (a dims.ts / simulation / figures.ts value, or an allowed
// constant with its source), the marks (reported, derived, estimate) against the comments of dims.ts and machine.ts, the geometry against the
// 3D world, and the MODEL RESULTS of PL-03 recomputed from src/sim (they fail loudly if the model is recalibrated).

const CONTRACT = [
  { id: 'mill-race', number: 'PL-01', group: 'site', scene: 'site', parts: ITEMS01 },
  { id: 'screw-section', number: 'PL-02', group: 'screw', scene: 'screw', parts: ITEMS02 },
  { id: 'drive-electricity', number: 'PL-03', group: 'screw', scene: 'screw', parts: ITEMS03 },
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
  it('has exactly three sheets (Lite), in reading order, with their ids, numbers, groups and worlds', () => {
    expect(SHEETS.map((s) => ({ id: s.id, number: s.number, group: s.group, scene: s.scene }))).toEqual(
      CONTRACT.map((c) => ({ id: c.id, number: c.number, group: c.group, scene: c.scene })),
    );
  });

  it('uses the two groups the lead declares, in the order of the numbers', () => {
    expect([...new Set(SHEETS.map((s) => s.group))]).toEqual(['site', 'screw']);
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
    // PL-01 shows every part of the site, PL-03 the drive and the electronics
    expect(SHEETS[0]!.parts).toEqual(partIds('site'));
    expect(
      SHEETS[2]!.parts!.map((id) => PART_CATEGORIES.screw[id]).every((c) => c === 'mechanical' || c === 'electrical'),
    ).toBe(true);
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
    /Viseta|ArchiPelle|Archi|Paulygones|Révolution|Neozone|YouTube|Piggott|Rorres|Nagel|Dellinger|Lubitz|Simmons|Muysken|Brada|Wikipedia|Victron/i,
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
      const norm = (t: string) => t.replace(/(\d),(\d)/g, '$1.$2').replace(/(\d)\s(\d{3})/g, '$1,$2');
      const digitsOf = (ts: string[]): string[] => norm(ts.join(' ')).match(/\d+(?:\.\d+)?/g) ?? [];
      expect(digitsOf(f), c.id).toEqual(digitsOf(e));
      const cognates = new Set(['Notes', 'Situation', 'Dimensions']);
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

  it('carries the notice that the sheet is not a construction plan, that the screw is generic, and the legend of the marks', () => {
    for (const c of CONTRACT)
      for (const lang of LANGS) {
        const t = flat(c.id, lang);
        expect(t, `${c.id} ${lang}`).toMatch(lang === 'fr' ? /pas un plan de construction/ : /not a construction plan/);
        expect(t, `${c.id} ${lang}`).toMatch(lang === 'fr' ? /La vis est générique/ : /The screw is generic/);
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

function tokens(text: string): string[] {
  return (
    text
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
  return out;
}

describe('the numbers printed on the sheets', () => {
  const printed = (): Set<string> => {
    const s = new Set<string>();
    for (const p of PRINTED) s.add(p.replace(/^-/, ''));
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
    expect(Object.keys(files).length).toBe(3);
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
