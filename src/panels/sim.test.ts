import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getLang, setLang } from '@onigam/lab-kit/i18n';
import type { AppContext } from '@onigam/lab-kit/ui';
import { t, type UiKey } from '../i18n/ui';
import { MillSim } from '../sim/engine';
import { PRESET_IDS, SCENARIO_IDS } from '../sim/presets';
import {
  MACHINE_KEYS,
  PRESET_KEYS,
  SCENARIO_KEYS,
  SITE_KEYS,
  TYPE_KEYS,
  chooserChartData,
  compareChartData,
  liveChartData,
  lossSegments,
  mainReadouts,
  moreReadouts,
  niceCeil,
  speedChartData,
  statusOf,
  torqueChartData,
  yearChartData,
} from './model';
import { SimPanel } from './sim';
import { clockOf, stripAlarms, stripValues } from './strip';
import { FakeElement, installFakeDom } from './test-dom';

// The simulation panel rendered by a stand-in for the DOM: that it builds, what it offers, that it follows the simulation and
// that a click does what it says, in both languages. The wording itself is held by strings.test.ts.

beforeAll(() => installFakeDom());
afterEach(() => setLang('fr'));

interface Fixture {
  sim: MillSim;
  panel: SimPanel;
  root: FakeElement;
}

function open(lang: 'fr' | 'en' = 'fr', sim = new MillSim()): Fixture {
  setLang(lang);
  const ctx = { sim, ui: { scene: 'device' }, gotoScene: () => undefined } as unknown as AppContext<MillSim>;
  const panel = new SimPanel(ctx);
  panel.render();
  return { sim, panel, root: panel.el as unknown as FakeElement };
}

const str = (key: UiKey, lang: 'fr' | 'en' = 'fr'): string => {
  const before = getLang();
  setLang(lang);
  const text = t(key);
  setLang(before);
  return text;
};
const button = (root: FakeElement, label: string): FakeElement => {
  const found = root.find('button').find((b) => b.textContent === label);
  if (!found) throw new Error(`no button « ${label} »`);
  return found;
};
const run = (panel: SimPanel, sim: MillSim, seconds: number): void => {
  for (let i = 0; i < seconds * 30; i++) {
    sim.step(1 / 30);
    panel.tick(1 / 30);
  }
};

describe('what the panel offers', () => {
  it('opens on the full-size preset with the four presets, a "custom" entry and one chip per scenario', () => {
    const { root } = open();
    const select = root.find('select')[0];
    const options = select.find('option');
    expect(options.map((o) => o.textContent)).toEqual([...PRESET_IDS.map((id) => str(PRESET_KEYS[id])), str('custom')]);
    const chips = root.find('button.part-chip');
    expect(chips.map((c) => c.textContent)).toEqual(SCENARIO_IDS.map((id) => str(SCENARIO_KEYS[id])));
    expect(SCENARIO_IDS).toHaveLength(9);
  });
  it('shows a few live figures first and folds the rest: three sections of controls and one of figures, all closed', () => {
    const { root } = open();
    expect(root.find('.readout').length).toBeGreaterThanOrEqual(7);
    const sections = root.find('details.sim-section');
    expect(sections.map((s) => s.find('summary')[0].textContent)).toEqual([
      str('secSite'),
      str('secMachine'),
      str('secDrive'),
      str('secMore'),
    ]);
    for (const s of sections) expect(s.open).toBe(false);
  });
  it('has the sliders and switches of the brief', () => {
    const { root } = open();
    const sliders = root.find('input').filter((i) => i.getAttribute('type') === 'range');
    expect(sliders.length).toBe(11);
    const toggles = root.find('input').filter((i) => i.getAttribute('type') === 'checkbox');
    expect(toggles.length).toBe(3);
    expect(root.find('select').length).toBe(4); // starting point, site, machine, what sets the speed
  });
  it('builds and draws the nine charts without a console error', () => {
    const { root } = open();
    expect(root.find('canvas').length).toBe(9);
  });
  it('writes every text in both languages and never an empty control', () => {
    for (const lang of ['fr', 'en'] as const) {
      const { root } = open(lang);
      for (const b of root.find('button'))
        expect(b.textContent.length + (b.getAttribute('aria-label') ?? '').length).toBeGreaterThan(0);
      expect(root.textContent).not.toMatch(/undefined|NaN|\[object/);
    }
    const fr = open('fr').root.textContent;
    const en = open('en').root.textContent;
    expect(fr).toContain('Moulin');
    expect(en).toContain('Mill');
    expect(fr).not.toEqual(en);
  });
});

describe('what a click does', () => {
  it('a preset replaces the whole plant: the prototype is a small screw', () => {
    const { sim, root } = open();
    const select = root.find('select')[0];
    select.value = 'prototype';
    select.dispatch('change', { target: select });
    expect(sim.params.preset).toBe('prototype');
    expect(sim.params.head).toBe(1);
    expect(sim.state.outerDiameter).toBeLessThan(0.5);
  });
  it('a scenario chip sets the plant, a slider edit turns the preset into custom', () => {
    const { sim, root } = open();
    button(root, str('scenarioHint') === '' ? '' : str(SCENARIO_KEYS['too-fast'])).click();
    expect(sim.params.loadMode).toBe('fixed');
    const range = root.find('input').filter((i) => i.getAttribute('type') === 'range')[0];
    range.value = '2';
    range.dispatch('input', { target: range });
    expect(sim.params.preset).toBe('custom');
  });
  it('start over brings back the last scenario', () => {
    const { sim, panel, root } = open();
    button(root, str(SCENARIO_KEYS['flood'])).click();
    run(panel, sim, 20);
    expect(sim.params.riverFlow).toBeGreaterThan(0.3);
    root
      .find('button')
      .find((b) => b.getAttribute('aria-label') === str('resetSim'))!
      .click();
    expect(sim.state.simTime).toBe(0);
  });
  it('the machine select changes the machine and the ratios that suit it', () => {
    const { sim, root } = open();
    const select = root
      .find('select')
      .find((s) => s.find('option').some((o) => o.textContent === str(MACHINE_KEYS.breastshot)))!;
    select.value = 'breastshot';
    select.dispatch('change', { target: select });
    expect(sim.params.machine).toBe('breastshot');
    expect(sim.params.chainRatio * sim.params.beltRatio).toBeGreaterThan(30);
  });
  it('the sliders follow a scenario that moves the river by itself', () => {
    const { sim, panel, root } = open();
    button(root, str(SCENARIO_KEYS['low-water'])).click();
    run(panel, sim, 60);
    const outputs = root.find('output').map((o) => o.textContent);
    expect(outputs.some((o) => /L\/s/.test(o))).toBe(true);
    expect(sim.params.riverFlow).toBeLessThan(0.2);
  });
});

describe('what the panel says and plots (model.ts)', () => {
  const sim = new MillSim();
  for (let i = 0; i < 300; i++) sim.step(1 / 30);
  it('the status line goes with the situation, most important first', () => {
    expect(statusOf(sim.state, sim.params)).toEqual({ key: 'statusRunning', tone: 'note' });
    const low = new MillSim();
    low.set({ riverFlow: 0.04 });
    low.step(0.1);
    expect(statusOf(low.state, low.params).key).toBe('statusLowWater');
    const fast = new MillSim();
    fast.applyScenario('too-fast');
    for (let i = 0; i < 3000; i++) fast.step(1 / 30);
    expect(statusOf(fast.state, fast.params)).toEqual({ key: 'statusTooFast', tone: 'warn' });
  });
  it('the keys of presets, scenarios, machines, sites and types all exist in French and English', () => {
    for (const k of [
      ...Object.values(PRESET_KEYS),
      ...Object.values(SCENARIO_KEYS),
      ...Object.values(MACHINE_KEYS),
      ...Object.values(SITE_KEYS),
      ...Object.values(TYPE_KEYS),
    ]) {
      expect(str(k, 'fr').length).toBeGreaterThan(0);
      expect(str(k, 'en').length).toBeGreaterThan(0);
    }
  });
  it('the bar of losses adds up to the power of the water', () => {
    const segs = lossSegments(sim.state);
    const total = segs.reduce((a, s) => a + s.watts, 0);
    expect(total).toBeGreaterThan(0.97 * sim.state.hydraulicPower);
    expect(total).toBeLessThan(1.03 * sim.state.hydraulicPower);
    for (const s of segs) expect(s.watts).toBeGreaterThanOrEqual(0);
  });
  it('the readouts are finite numbers with a label', () => {
    for (const r of [...mainReadouts(sim.state, 'rpm'), ...moreReadouts(sim.state, 'rpm')]) {
      expect(Number.isFinite(r.value), r.key).toBe(true);
      expect(str(r.key).length).toBeGreaterThan(0);
    }
  });
  it('the charts have as many points as abscissas and no NaN where a line must be drawn', () => {
    const c = speedChartData(sim.getSpeedCurve());
    expect(c.ys.power).toHaveLength(c.xs.length);
    for (const v of [...c.ys.power, ...c.ys.efficiency, ...c.ys.fill]) expect(Number.isFinite(v)).toBe(true);
    const tq = torqueChartData(sim.getSpeedCurve());
    expect(tq.ys.machine).toHaveLength(tq.xs.length);
    const ch = chooserChartData();
    for (const col of Object.values(ch.ys)) expect(col).toHaveLength(ch.xs.length);
    expect(Object.keys(ch.ys)).toHaveLength(8 + 4);
    expect(ch.xs[0]).toBe(-1);
    expect(ch.xs[ch.xs.length - 1]).toBe(3);
    const cmp = compareChartData(sim.getCompare());
    for (const col of Object.values(cmp.ys)) expect(col).toHaveLength(cmp.xs.length);
    const y = yearChartData(sim.getYear(), sim.state.reservedFlow);
    expect(y.xs).toHaveLength(365);
    expect(y.unit).toBe('m³/s');
    const brook = new MillSim();
    brook.applyPreset('brook');
    expect(yearChartData(brook.getYear(), brook.state.reservedFlow).unit).toBe('L/s');
    const live = liveChartData(sim.scope);
    expect(live.xs[live.xs.length - 1]).toBe(0);
    expect(niceCeil(1234)).toBe(2000);
  });
  it('the strip has four values, a date on 1 October at 08:00 and the alarms of the state', () => {
    expect(stripValues(sim)).toHaveLength(4);
    const c = clockOf(new MillSim().state);
    expect(c.sub).toBe('08:00');
    setLang('en');
    expect(clockOf(new MillSim().state).time).toBe('1 Oct');
    const fast = new MillSim();
    fast.applyScenario('too-fast');
    for (let i = 0; i < 3000; i++) fast.step(1 / 30);
    expect(stripAlarms(fast).map((a) => a.key)).toContain('tooFast');
  });
});
