import { setLang } from '@onigam/lab-kit/i18n';
import type { AppContext, SeriesDef } from '@onigam/lab-kit/ui';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { MillSim } from '../sim/engine';
import { CHAIN_COLOURS, lossSegments, PALETTE, TYPE_COLOURS, type PanelColour } from './model';
import modelSource from './model.ts?raw';
import { SimPanel } from './sim';
import simSource from './sim.ts?raw';
import { FakeElement, installFakeDom } from './test-dom';

// The colours this lab writes into its panel, read on the kit's own card in both themes. None of them colours a word, so their bar is 3:1, for a graphic; the words are in the kit's inks, at 4.5:1.

// the stylesheet comes from disk: the test runner empties any import of a .css. No node types in this lab: the module is named at run time.
const load = (name: string): Promise<any> => import(/* @vite-ignore */ name);
let css = '';
beforeAll(async () => {
  installFakeDom();
  const fs = await load('node:fs');
  css = String(fs.readFileSync('node_modules/@onigam/lab-kit/dist/styles.css', 'utf8'));
});
afterEach(() => {
  delete document.documentElement.dataset.theme;
  setLang('fr');
});

/** The block of a selector in the stylesheet: its `--name: #value` tokens. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThan(-1);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1]!, m[2]!]));
}

const channels = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
const linear = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string): number => {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const hue = (hex: string): number => {
  const [r, g, b] = channels(hex);
  const top = Math.max(r, g, b);
  const d = top - Math.min(r, g, b);
  const h = top === r ? (g - b) / d : top === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
/** CIELAB, for how far apart two colours look. */
const lab = (hex: string): [number, number, number] => {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const apart = (a: string, b: string): number => {
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

const hexes = (text: string): string[] => [...text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
const THEMES = [
  ['light', ':root'],
  ['dark', ":root[data-theme='dark']"],
] as const;

describe('the colours of the panel', () => {
  for (const [theme, selector] of THEMES) {
    it(`hold 3:1 on the card, ${theme}`, () => {
      const card = tokens(selector)['--card']!;
      for (const [name, colour] of Object.entries(PALETTE[theme]))
        expect(contrast(colour, card), name).toBeGreaterThanOrEqual(3);
    });

    it(`set their words at 4.5:1 on the card, ${theme}: the panel writes no colour on a text, it uses the kit's three inks`, () => {
      const t = tokens(selector);
      for (const ink of ['--ink', '--ink-2', '--ink-3'])
        expect(contrast(t[ink]!, t['--card']!), ink).toBeGreaterThanOrEqual(4.5);
    });

    it(`stay apart where they are read together, ${theme}: the types of the chooser, the stages of the chain`, () => {
      for (const group of [Object.values(TYPE_COLOURS), Object.values(CHAIN_COLOURS)] as PanelColour[][]) {
        expect(new Set(group).size).toBe(group.length);
        for (const a of group)
          for (const b of group)
            if (a < b) expect(apart(PALETTE[theme][a], PALETTE[theme][b]), `${a} ${b}`).toBeGreaterThanOrEqual(25);
      }
    });

    it(`are the kit's own where it has one, ${theme}`, () => {
      const t = tokens(selector);
      const p = PALETTE[theme];
      expect([p.water, p.copper, p.violet]).toEqual([t['--water'], t['--copper'], t['--violet']]);
      if (theme === 'dark') expect([p.gold, p.green]).toEqual([t['--sun'], t['--leaf']]);
    });
  }

  it('say the same thing in both themes: a blue stays a blue, each name keeps its hue', () => {
    for (const name of Object.keys(PALETTE.light) as PanelColour[]) {
      const turn = Math.abs(hue(PALETTE.light[name]) - hue(PALETTE.dark[name]));
      expect(Math.min(turn, 360 - turn), name).toBeLessThanOrEqual(6);
    }
  });

  it('keep what each one meant: a type and a stage have the colour they had', () => {
    expect(TYPE_COLOURS).toEqual({
      undershot: 'grey',
      breastshot: 'copper',
      overshot: 'brown',
      screw: 'water',
      kaplan: 'green',
      crossflow: 'violet',
      francis: 'red',
      pelton: 'gold',
    });
    // light is what the panel showed, but for the gold, 2.5:1 on the kit's card
    const before = ['#2a7fb8', '#c4692c', '#6b4fd8', '#2f8f5b', '#b23a48', '#7a4a1e', '#6b7280', '#8a7a5c', '#5b6878'];
    expect(Object.values(PALETTE.light).filter((c) => c !== PALETTE.light.gold)).toEqual(before);
    expect(contrast('#c99700', tokens(':root')['--card']!)).toBeLessThan(3);
  });

  it('follow the theme when they are drawn: the bar and its legend, the charts, the list of the chooser', () => {
    const sim = new MillSim();
    const ctx = { sim, ui: { scene: 'site' }, gotoScene: () => undefined } as unknown as AppContext<MillSim>;
    const panel = new SimPanel(ctx);
    const charts = panel as unknown as Record<string, { opts: { series: SeriesDef[] } }>;
    const swatches = (el: unknown) => (el as FakeElement).find('i').map((i) => i.getAttribute('style'));
    const seriesColour = (chart: string, key: string) => charts[chart]!.opts.series.find((s) => s.key === key)!.color;
    for (const [theme] of THEMES) {
      document.documentElement.dataset.theme = theme;
      const p = PALETTE[theme];
      panel.render();
      expect(lossSegments(sim.state).map((s) => s.colour)).toEqual(Object.values(CHAIN_COLOURS).map((name) => p[name]));
      const chain = swatches(panel.el).filter((style) => style?.includes(p.khaki));
      expect(chain).toHaveLength(1); // only the friction, and only in this theme's colour
      expect(seriesColour('chooserChart', 'zone-overshot')).toBe(p.brown);
      expect(seriesColour('chooserChart', 'zone-pelton')).toBe(p.gold);
      expect(seriesColour('chooserChart', 'line-0')).toBe(p.slate);
      expect(seriesColour('compareChart', 'screw')).toBe(p.water);
      expect(seriesColour('effChart', 'fill')).toBe(p.gold);
      expect(seriesColour('yearFlowChart', 'reserved')).toBe(p.gold);
    }
  });

  it('are written in one place, and none is the kit’s gold', () => {
    expect(hexes(simSource)).toEqual([]);
    expect(hexes(modelSource)).toEqual([...Object.values(PALETTE.light), ...Object.values(PALETTE.dark)]);
    for (const source of [simSource, modelSource]) expect(source).not.toMatch(/SERIES_COLORS\.pv|var\(--sun\)/);
  });
});
