import {
  fill,
  h,
  icon,
  ICONS,
  LineChart,
  SERIES_COLORS,
  section as kitSection,
  select as kitSelect,
  slider as kitSlider,
  toggle as kitToggle,
  type AppContext,
  type PanelController,
} from '@onigam/lab-kit/ui';
import { months, num, t, type UiKey } from '../i18n/ui';
import { CHOOSER_BOX, POWER_LINES, TURBINE_TYPES } from '../sim/chooser';
import type { MillSim } from '../sim/engine';
import { multiplierLesson, rpmToRad } from '../sim/mech';
import { PRESET_IDS, RANGES, SCENARIO_IDS, riverFlowMax, riverFlowStep, type RangedKey } from '../sim/presets';
import { speedRuleRpm } from '../sim/screw';
import { SITE_IDS, dayOfMonth, medianFlow, monthOf, type SiteId } from '../sim/site';
import type { MachineId, MillParams, PresetId, ScenarioId } from '../sim/types';
import type { YearResult } from '../sim/year';
import {
  MACHINE_KEYS,
  PRESET_KEYS,
  SCENARIO_KEYS,
  SITE_KEYS,
  TYPE_COLORS,
  TYPE_KEYS,
  chooserChartData,
  compareChartData,
  linePowerLabel,
  liveChartData,
  lossSegments,
  mainReadouts,
  moreReadouts,
  niceCeil3,
  siteMarker,
  speedChartData,
  statusOf,
  torqueChartData,
  yearChartData,
  type Curve,
} from './model';

// Simulation mode: introduction, starting points and scenarios, a few live figures, where the power of the water goes, then
// everything else folded: the site, the machine, the drive, all the figures, and the charts (the machine against its speed,
// the torques, which turbine for my site, the same site with a wheel, a year, the last minute). Built only from the kit's
// widgets and charts.

type ChartOpts = ConstructorParameters<typeof LineChart>[0];
type Cell = (label: string, value: string, small?: string, colour?: string) => HTMLElement;

/** Real seconds the plant must stay unchanged before the curves and the year are recomputed. */
const CURVE_DELAY = 0.35;

/** A control the panel keeps in step with the simulation (a scenario can flip a switch or move a slider by itself). */
interface Control {
  key: keyof MillParams;
  el: HTMLElement;
  kind: 'slider' | 'toggle' | 'select';
  fmt?: (v: number) => string;
}

const dayLabel = (d: number): string => `${dayOfMonth(d)} ${months()[monthOf(d)]}`;

/** A flow written in L/s below one cubic metre per second, in m³/s above. */
const flowText = (q: number): string => (q < 1 ? `${num(q * 1000, q < 0.01 ? 1 : 0)} L/s` : `${num(q, 2)} m³/s`);

const MACHINES: MachineId[] = ['screw', 'overshot', 'breastshot', 'undershot'];

const MACHINE_COLORS: Record<MachineId, string> = {
  screw: TYPE_COLORS.screw,
  overshot: TYPE_COLORS.overshot,
  breastshot: TYPE_COLORS.breastshot,
  undershot: TYPE_COLORS.undershot,
};

export class SimPanel implements PanelController {
  readonly el = h('div', { class: 'sim' });
  private presetSelect: HTMLSelectElement | null = null;
  private status = h('div', {});
  private readouts = h('div', { class: 'readouts' });
  private more = h('div', { class: 'loss-legend' });
  private chain = h('div', { class: 'losses' });
  private dims = h('div', { class: 'loss-legend' });
  private drive = h('div', { class: 'loss-legend' });
  private candidates = h('div', { class: 'loss-legend' });
  private yearly = h('div', { class: 'loss-legend' });
  private yearFlowTitle = h('div', { class: 'eyebrow' }, '');
  private computing = h('p', { class: 'hint' });
  private controls: Control[] = [];

  private powerChart: LineChart;
  private effChart: LineChart;
  private torqueChart: LineChart;
  private chooserChart: LineChart;
  private compareChart: LineChart;
  private yearFlowChart: LineChart;
  private yearPowerChart: LineChart;
  private rpmChart: LineChart;
  private liveChart: LineChart;
  private powerOpts: ChartOpts;
  private torqueOpts: ChartOpts;
  private compareOpts: ChartOpts;
  private yearFlowOpts: ChartOpts;
  private yearPowerOpts: ChartOpts;
  private rpmOpts: ChartOpts;
  private liveOpts: ChartOpts;

  private lastReadouts = 0;
  private lastCharts = 0;
  private lastScope = 0;
  private key = '';
  private wait = 0;
  private jobs: ('curve' | 'year' | 'compare')[] = [];
  private curve: Curve | null = null;
  private yearData: YearResult | null = null;
  private compareData: ReturnType<MillSim['getCompare']> | null = null;

  constructor(private ctx: AppContext<MillSim>) {
    const sim = () => this.ctx.sim;
    const seconds = (v: number) => (v === 0 ? '0' : `${num(v)} s`);
    const rpmText = (v: number) => `${num(v)} ${t('unitRpm')}`;
    this.powerOpts = {
      height: 130,
      series: [{ key: 'power', label: () => t('seriesShaft'), color: SERIES_COLORS.hydro, bold: true }],
      yFmt: (v) => num(v),
      xFmt: rpmText,
      markers: () => {
        const s = sim().state;
        const out: ReturnType<NonNullable<ChartOpts['markers']>> = [
          { x: s.rpm, y: Math.max(0, s.shaftPower), label: t('markNow'), color: SERIES_COLORS.dump },
        ];
        const plant = sim().plant;
        if (plant.screw) out.push({ x: speedRuleRpm(plant.screw.outerDiameter), label: t('markRule') });
        return out;
      },
    };
    this.powerChart = new LineChart(this.powerOpts);
    this.effChart = new LineChart({
      height: 110,
      series: [
        { key: 'efficiency', label: () => t('seriesEfficiency'), color: SERIES_COLORS.load, bold: true },
        { key: 'fill', label: () => t('seriesFill'), color: SERIES_COLORS.pv, dash: true },
      ],
      yMin: 0,
      yMax: 120,
      yFmt: (v) => num(v),
      xFmt: rpmText,
      markers: () => [
        { x: sim().state.rpm, y: 100 * sim().state.etaMachine, label: t('markNow'), color: SERIES_COLORS.dump },
      ],
    });
    this.torqueOpts = {
      height: 130,
      series: [
        { key: 'machine', label: () => t('seriesMachineTorque'), color: SERIES_COLORS.hydro, bold: true },
        { key: 'load', label: () => t('seriesLoadTorque'), color: SERIES_COLORS.dump },
      ],
      yFmt: (v) => num(v),
      xFmt: rpmText,
      markers: () => {
        const s = sim().state;
        return [{ x: s.rpm, y: s.torque, label: t('markNow'), color: SERIES_COLORS.dump }];
      },
    };
    this.torqueChart = new LineChart(this.torqueOpts);
    const box = CHOOSER_BOX;
    this.chooserChart = new LineChart({
      height: 240,
      legend: false,
      series: [
        ...TURBINE_TYPES.map((type) => ({
          key: `zone-${type}`,
          label: () => t(TYPE_KEYS[type]),
          color: TYPE_COLORS[type],
        })),
        ...POWER_LINES.map((p, i) => ({
          key: `line-${i}`,
          label: () => `${linePowerLabel(p)} ${t('powerLine')}`,
          color: '#5b6878',
          dash: true,
        })),
      ],
      yMin: box.yMin,
      yMax: box.yMax,
      yFmt: (v) => num(Math.pow(10, v), v < 0 ? -v : 0),
      xFmt: (v) => `${num(Math.pow(10, v), v < 0 ? 1 : 0)} m`,
      markers: () => {
        const p = sim().params;
        const pt = siteMarker(p.head, p.designFlow);
        // only the visitor's site: the decade labels that stood here ("1 m", "10 m", "100 m") crowded the top of the zones
        return [{ x: pt.x, y: pt.y, label: t('markSite'), color: SERIES_COLORS.dump }];
      },
    });
    this.compareOpts = {
      height: 150,
      series: MACHINES.map((m) => ({
        key: m,
        label: () => t(MACHINE_KEYS[m]),
        color: MACHINE_COLORS[m],
        bold: m === 'screw',
      })),
      yFmt: (v) => num(v),
      xFmt: (v) => `${num(v, v < 10 ? 1 : 0)} L/s`,
      markers: () => [{ x: sim().state.riverFlow * 1000, label: t('markNow') }],
    };
    this.compareChart = new LineChart(this.compareOpts);
    this.yearFlowOpts = {
      height: 120,
      series: [
        { key: 'river', label: () => t('seriesRiver'), color: SERIES_COLORS.hydro, bold: true },
        { key: 'taken', label: () => t('seriesMachineFlow'), color: SERIES_COLORS.dump },
        { key: 'reserved', label: () => t('seriesReservedFlow'), color: SERIES_COLORS.pv, dash: true },
      ],
      yFmt: (v) => num(v, v < 10 && v !== Math.round(v) ? 1 : 0),
      xFmt: dayLabel,
      markers: () => [{ x: Math.floor(sim().state.day), label: dayLabel(sim().state.day) }],
    };
    this.yearFlowChart = new LineChart(this.yearFlowOpts);
    this.yearPowerOpts = {
      height: 90,
      series: [{ key: 'power', label: () => t('seriesYearPower'), color: SERIES_COLORS.load, bold: true }],
      yFmt: (v) => num(v),
      xFmt: dayLabel,
      markers: () => [{ x: Math.floor(sim().state.day), label: dayLabel(sim().state.day) }],
    };
    this.yearPowerChart = new LineChart(this.yearPowerOpts);
    this.rpmOpts = {
      height: 70,
      series: [{ key: 'rpm', label: () => t('chartLiveSpeed'), color: SERIES_COLORS.load }],
      yFmt: (v) => num(v),
      xFmt: seconds,
    };
    this.rpmChart = new LineChart(this.rpmOpts);
    this.liveOpts = {
      height: 90,
      series: [{ key: 'power', label: () => t('chartLivePower'), color: SERIES_COLORS.hydro, bold: true }],
      yFmt: (v) => num(v),
      xFmt: seconds,
    };
    this.liveChart = new LineChart(this.liveOpts);
  }

  /** Apply a change live; the panel is not rebuilt, so the dragged input survives. */
  private set(patch: Partial<MillParams>): void {
    this.ctx.sim.set(patch);
    this.renderStatus();
    this.renderReadouts();
  }

  render(): void {
    const sim = this.ctx.sim;
    const p = sim.params;
    this.controls = [];

    const presetSelect = h(
      'select',
      {
        'aria-label': t('preset'),
        onchange: (ev: Event) => {
          sim.applyPreset((ev.target as HTMLSelectElement).value as PresetId);
          this.render();
        },
      },
      ...PRESET_IDS.map((id) => h('option', { value: id, selected: p.preset === id }, t(PRESET_KEYS[id]))),
      h('option', { value: 'custom', selected: p.preset === 'custom', disabled: true }, t('custom')),
    );
    this.presetSelect = presetSelect;

    const track = (key: keyof MillParams, el: HTMLElement, kind: Control['kind'], fmt?: (v: number) => string) => {
      this.controls.push({ key, el, kind, fmt });
      return el;
    };
    /** A slider on a ranged parameter. */
    const slider = (key: UiKey, field: RangedKey, fmt: (v: number) => string) => {
      const r = RANGES[field];
      const max = field === 'riverFlow' ? riverFlowMax(p.site) : r.max;
      const step = field === 'riverFlow' ? riverFlowStep(p.site) : r.step;
      return track(
        field,
        kitSlider(t(key), p[field], r.min, max, step, fmt, (v) => this.set({ [field]: v } as Partial<MillParams>)),
        'slider',
        fmt,
      );
    };
    const toggle = (key: UiKey, field: 'followYear' | 'gateOpen' | 'trashRack') =>
      track(
        field,
        kitToggle(t(key), p[field], (v) => this.set({ [field]: v } as Partial<MillParams>)),
        'toggle',
      );
    const hint = (key: UiKey) => h('p', { class: 'hint' }, t(key));
    /** A section that opens on request: the figures that matter stay in sight, the rest is one click away. */
    const folded = (title: string, ...children: (HTMLElement | null)[]) => {
      const d = kitSection(title, ...children) as HTMLDetailsElement;
      d.open = false;
      return d;
    };

    const metres = (v: number) => `${num(v, 2)} m`;
    const mm = (v: number) => `${num(v, v < 1 ? 2 : 1)} mm`;
    const times = (v: number) => `× ${num(v, 1)}`;

    fill(
      this.el,
      h('div', { class: 'eyebrow eyebrow--accent' }, t('simTitle')),
      hint('simIntro'),
      h(
        'div',
        { class: 'sim-top' },
        presetSelect,
        h(
          'button',
          {
            class: 'btn',
            'aria-label': t('resetSim'),
            title: t('resetSim'),
            onclick: () => (sim.reset(), this.render()),
          },
          icon(ICONS.reset, 16),
        ),
      ),
      h('div', { class: 'eyebrow' }, t('scenarios')),
      h(
        'div',
        { class: 'part-chips' },
        ...SCENARIO_IDS.map((id: ScenarioId) =>
          h(
            'button',
            { class: 'part-chip', onclick: () => (sim.applyScenario(id), this.render()) },
            t(SCENARIO_KEYS[id]),
          ),
        ),
      ),
      hint('scenarioHint'),
      this.status,
      this.readouts,
      h('div', { class: 'eyebrow' }, t('chainTitle')),
      this.chain,
      hint('chainHint'),
      folded(
        t('secSite'),
        track(
          'site',
          kitSelect<SiteId>(
            t('siteSelect'),
            p.site,
            SITE_IDS.map((id) => [id, t(SITE_KEYS[id])] as [SiteId, string]),
            (v) => {
              this.set({ site: v, riverFlow: medianFlow(v) });
              this.render();
            },
          ),
          'select',
        ),
        hint('siteHint'),
        slider('head', 'head', metres),
        hint('headHint'),
        slider('designFlow', 'designFlow', flowText),
        hint('designFlowHint'),
        slider('riverFlow', 'riverFlow', flowText),
        toggle('followYear', 'followYear'),
        hint('riverFlowHint'),
        slider('tailwater', 'tailwater', metres),
        hint('tailwaterHint'),
        toggle('gateOpen', 'gateOpen'),
      ),
      folded(
        t('secMachine'),
        track(
          'machine',
          kitSelect<MachineId>(
            t('machineSelect'),
            p.machine,
            MACHINES.map((id) => [id, t(MACHINE_KEYS[id])] as [MachineId, string]),
            (v) => {
              this.set({ machine: v });
              this.render();
            },
          ),
          'select',
        ),
        hint('machineHint'),
        slider('slope', 'slope', (v) => `${num(v)}°`),
        hint('slopeHint'),
        slider('roughness', 'roughness', mm),
        hint('roughnessHint'),
        slider('gapScale', 'gapScale', times),
        hint('gapHint'),
        toggle('trashRack', 'trashRack'),
        slider('debris', 'debris', (v) => `${num(100 * v)} %`),
        hint('rackHint'),
        h('div', { class: 'eyebrow' }, t('dimsTitle')),
        this.dims,
        hint('dimsHint'),
        hint('dimRuleHint'),
      ),
      folded(
        t('secDrive'),
        slider('chainRatio', 'chainRatio', (v) => num(v, 1)),
        slider('beltRatio', 'beltRatio', (v) => num(v, 1)),
        this.drive,
        hint('driveHint'),
        track(
          'loadMode',
          kitSelect<MillParams['loadMode']>(
            t('loadMode'),
            p.loadMode,
            [
              ['generator', t('loadGenerator')],
              ['fixed', t('loadFixed')],
            ],
            (v) => this.set({ loadMode: v }),
          ),
          'select',
        ),
        slider('fixedRpm', 'fixedRpm', (v) => `${num(v)} ${t('unitRpm')}`),
        hint('loadHint'),
        h('div', { class: 'eyebrow' }, t('multiplierTitle')),
        hint('multiplierHint'),
      ),
      folded(t('secMore'), this.more),
      h('div', { class: 'eyebrow' }, t('chartSpeed')),
      this.powerChart.el,
      this.effChart.el,
      hint('chartSpeedHint'),
      h('div', { class: 'eyebrow' }, t('chartTorque')),
      this.torqueChart.el,
      hint('chartTorqueHint'),
      h('div', { class: 'eyebrow' }, t('chartChooser')),
      this.chooserChart.el,
      this.candidates,
      hint('chartChooserHint'),
      h('div', { class: 'eyebrow' }, t('chartCompare')),
      this.compareChart.el,
      hint('chartCompareHint'),
      hint('wheelSources'),
      this.yearFlowTitle,
      this.yearFlowChart.el,
      h('div', { class: 'eyebrow' }, t('chartYearPower')),
      this.yearPowerChart.el,
      hint('chartYearHint'),
      h('div', { class: 'eyebrow' }, t('yearlyTitle')),
      this.yearly,
      hint('yearlyHint'),
      h('div', { class: 'eyebrow' }, t('chartLive')),
      this.rpmChart.el,
      this.liveChart.el,
      hint('chartLiveHint'),
      this.computing,
    );
    this.key = this.curveKey();
    this.wait = 0;
    this.jobs = ['curve', 'year', 'compare'];
    while (this.jobs.length) this.runJob();
    this.drawChooser();
    this.refresh();
  }

  /** Called every frame while the panel is open: readouts at 5 Hz, the last minute at 4 Hz, the curves at 2 Hz. */
  tick(dt: number): void {
    this.lastReadouts += dt;
    this.lastCharts += dt;
    this.lastScope += dt;
    this.scheduleCurves(dt);
    if (this.lastReadouts > 0.2) {
      this.lastReadouts = 0;
      this.renderStatus();
      this.renderReadouts();
      this.followScript();
    }
    if (this.lastScope > 0.25) {
      this.lastScope = 0;
      this.drawLive();
    }
    if (this.lastCharts > 0.5) {
      this.lastCharts = 0;
      this.drawCurves();
    }
  }

  private refresh(): void {
    this.renderStatus();
    this.renderReadouts();
    this.drawLive();
    this.drawCurves();
  }

  // ------------------------------------------------------------------ the curves

  /** Everything the curves depend on (the river flow included: the speed curve is drawn at the flow of now). */
  private curveKey(): string {
    const p = this.ctx.sim.params;
    return JSON.stringify([
      p.site,
      p.head,
      p.designFlow,
      Math.round(p.riverFlow * 1e4),
      p.machine,
      p.slope,
      p.roughness,
      p.gapScale,
      p.tailwater,
      p.trashRack,
      Math.round(p.debris * 20),
      p.chainRatio,
      p.beltRatio,
      p.loadMode,
    ]);
  }

  /** The curves cost a few milliseconds and the year about 90: they start once the controls have been quiet for a moment. */
  private scheduleCurves(dt: number): void {
    const key = this.curveKey();
    if (key !== this.key) {
      this.key = key;
      this.wait = CURVE_DELAY;
      this.jobs = [];
    } else if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) this.jobs = ['curve', 'year', 'compare'];
    }
    this.runJob();
  }

  private runJob(): void {
    const job = this.jobs.shift();
    const sim = this.ctx.sim;
    if (job === 'curve') this.curve = sim.getSpeedCurve();
    else if (job === 'year') this.yearData = sim.getYear();
    else if (job === 'compare') this.compareData = sim.getCompare();
    if (job) this.lastCharts = 1; // draw at once
  }

  // ------------------------------------------------------------------ status and readouts

  private renderStatus(): void {
    const sim = this.ctx.sim;
    if (this.presetSelect && this.presetSelect.value !== sim.params.preset) this.presetSelect.value = sim.params.preset;
    const { key, tone } = statusOf(sim.state, sim.params);
    fill(
      this.status,
      tone === 'warn'
        ? h('div', { class: 'callout callout--warn' }, icon(ICONS.warn, 16), h('span', {}, t(key)))
        : h('p', { class: 'hint' }, t(key)),
    );
  }

  private renderReadouts(): void {
    const s = this.ctx.sim.state;
    const unit = t('unitRpm');
    const box = (label: string, value: string, small = '') =>
      h(
        'div',
        { class: 'readout' },
        h('span', {}, label),
        h('b', {}, value, small ? h('small', {}, ` ${small}`) : null),
      );
    /** A figure written as a line of text, for the lists whose labels are too long for a box. */
    const line: Cell = (label, value, small = '', colour = '') =>
      h(
        'span',
        {},
        colour ? h('i', { style: `background:${colour}` }) : null,
        `${label} `,
        h('b', {}, value),
        small ? h('small', {}, ` ${small}`) : null,
      );
    fill(this.readouts, ...mainReadouts(s, unit).map((r) => box(t(r.key), num(r.value, r.digits), r.unit)));
    fill(this.more, ...moreReadouts(s, unit).map((r) => line(t(r.key), num(r.value, r.digits), r.unit)));
    this.renderChain();
    this.renderDims(line);
    this.renderDrive(line);
    this.renderCandidates(line);
    this.renderYearly(line);
  }

  /** The power of the water split between the electricity and the losses of each stage, as one bar with its legend. */
  private renderChain(): void {
    const s = this.ctx.sim.state;
    if (s.hydraulicPower < 1) {
      fill(this.chain, h('p', { class: 'hint' }, '—'));
      return;
    }
    const rows = lossSegments(s);
    const total = rows.reduce((a, r) => a + r.watts, 0) || 1;
    fill(
      this.chain,
      h(
        'div',
        { class: 'loss-bar', role: 'img', 'aria-label': t('chainTitle') },
        ...rows.map((r) =>
          h('span', {
            style: `flex:${Math.max(r.watts, 0.0001)};background:${r.colour}`,
            title: `${t(r.key)} ${num(r.watts)} W`,
          }),
        ),
      ),
      h(
        'div',
        { class: 'loss-legend' },
        ...rows.map((r) =>
          h(
            'span',
            {},
            h('i', { style: `background:${r.colour}` }),
            `${t(r.key)} `,
            h('b', {}, `${num(r.watts, r.watts < 10 ? 1 : 0)} W`),
            h('small', {}, ` ${num((100 * r.watts) / total)} %`),
          ),
        ),
      ),
      h(
        'div',
        { class: 'loss-legend' },
        h('span', {}, `${t('chainMachineOfWater')} `, h('b', {}, `${num(100 * s.etaMachine)} %`)),
        h(
          'span',
          {},
          `${t('chainElectricOfShaft')} `,
          h('b', {}, `${num(s.shaftPower > 0 ? (100 * s.electricPower) / s.shaftPower : 0)} %`),
        ),
      ),
    );
  }

  private renderDims(cell: Cell): void {
    const sim = this.ctx.sim;
    const s = sim.state;
    if (sim.params.machine === 'screw') {
      const gap = sim.plant.screw?.gap ?? 0;
      fill(
        this.dims,
        cell(t('dimDiameter'), num(s.outerDiameter, 2), 'm'),
        cell(t('dimLength'), num(s.length, 2), 'm'),
        cell(t('dimPitch'), num(s.pitch, 2), 'm'),
        cell(t('dimGap'), num(gap * 1000, 1), 'mm'),
        cell(t('dimRule'), num(speedRuleRpm(s.outerDiameter)), t('unitRpm')),
      );
    } else {
      fill(
        this.dims,
        cell(t('dimWheel'), num(s.wheelDiameter, 2), 'm'),
        cell(t('dimWheelWidth'), num(s.wheelWidth, 2), 'm'),
      );
    }
  }

  private renderDrive(cell: Cell): void {
    const sim = this.ctx.sim;
    const p = sim.params;
    const plant = sim.plant;
    const s = sim.state;
    const lesson =
      s.omega > 0 && s.generatorRpm > 0
        ? multiplierLesson(Math.max(s.shaftPower, 1), s.omega, rpmToRad(s.generatorRpm))
        : null;
    fill(
      this.drive,
      cell(t('ratioTotal'), num(p.chainRatio * p.beltRatio, 1)),
      cell(t('ratioSuits'), num(plant.defaultChain * plant.defaultBelt, 1)),
      cell(t('liveGenSpeed'), num(s.generatorRpm), t('unitRpm')),
      cell(t('multiplierSlow'), num(lesson ? lesson.slowTorque : 0), 'N·m'),
      cell(t('multiplierFast'), num(lesson ? lesson.fastTorque : 0, lesson && lesson.fastTorque < 100 ? 1 : 0), 'N·m'),
      cell(t('multiplierRatio'), lesson ? `× ${num(lesson.torqueRatio, 1)}` : '—'),
    );
  }

  private renderCandidates(cell: Cell): void {
    const list = this.ctx.sim.getCandidates();
    fill(
      this.candidates,
      ...list.map((c) =>
        cell(
          t(TYPE_KEYS[c.type]),
          `${num(c.power / 1000, c.power < 10000 ? 2 : 1)} kW`,
          c.fits ? t('chooserFits') : c.headInRange ? t('chooserHeadOnly') : t('chooserNo'),
          TYPE_COLORS[c.type],
        ),
      ),
    );
  }

  private renderYearly(cell: Cell): void {
    const y = this.yearData;
    if (!y) return;
    fill(
      this.yearly,
      cell(t('yearlyEnergy'), num(y.energy), t('unitKwhYear')),
      cell(t('yearlyMean'), num(y.meanPower), 'W'),
      cell(t('yearlyRated'), num(y.ratedPower), 'W'),
      cell(t('yearlyCf'), num(100 * y.capacityFactor), '%'),
      cell(t('yearlyStopped'), num(y.daysLowWater)),
      cell(t('yearlyFlood'), num(y.daysFlood)),
      cell(t('yearlyHours'), num(y.hoursRunning), 'h'),
      cell(t('yearlyWinter'), num(100 * y.winterShare), '%'),
      cell(t('yearlyShare'), num(y.siteEnergy > 0 ? (100 * y.energy) / y.siteEnergy : 0), '%'),
    );
  }

  /** A scenario can move a slider or flip a switch by itself: the controls follow. */
  private followScript(): void {
    const p = this.ctx.sim.params;
    for (const c of this.controls) {
      const value = p[c.key];
      if (c.kind === 'select') {
        const sel = c.el.querySelector('select') as HTMLSelectElement | null;
        if (sel && sel.value !== String(value)) sel.value = String(value);
        continue;
      }
      const input = c.el.querySelector('input') as HTMLInputElement | null;
      if (!input) continue;
      if (c.kind === 'toggle') {
        if (input.checked !== value) input.checked = Boolean(value);
      } else if (typeof value === 'number' && Math.abs(Number(input.value) - value) > 1e-9) {
        input.value = String(value);
        const out = c.el.querySelector('output');
        if (out && c.fmt) out.textContent = c.fmt(value);
      }
    }
  }

  // ------------------------------------------------------------------ charts

  private drawLive(): void {
    const d = liveChartData(this.ctx.sim.scope);
    this.rpmOpts.yMax = niceCeil3(Math.max(1, ...d.rpm) * 1.15);
    this.liveOpts.yMax = niceCeil3(Math.max(1, ...d.power) * 1.15);
    this.rpmChart.setData(d.xs, { rpm: d.rpm });
    this.liveChart.setData(d.xs, { power: d.power });
    this.rpmChart.draw();
    this.liveChart.draw();
  }

  private drawChooser(): void {
    const d = chooserChartData();
    this.chooserChart.setData(d.xs, d.ys);
    this.chooserChart.draw();
  }

  private drawCurves(): void {
    if (this.curve) {
      const sp = speedChartData(this.curve);
      this.powerOpts.yMax = niceCeil3(Math.max(1, ...sp.ys.power) * 1.1);
      this.powerChart.setData(sp.xs, { power: sp.ys.power });
      this.effChart.setData(sp.xs, { efficiency: sp.ys.efficiency, fill: sp.ys.fill });
      this.powerChart.draw();
      this.effChart.draw();
      const tq = torqueChartData(this.curve);
      this.torqueOpts.yMax = tq.yMax;
      this.torqueChart.setData(tq.xs, tq.ys);
      this.torqueChart.draw();
    }
    this.chooserChart.draw();
    if (this.compareData) {
      const c = compareChartData(this.compareData);
      this.compareOpts.yMax = niceCeil3(Math.max(1, ...Object.values(c.ys).flat()) * 1.05);
      this.compareChart.setData(c.xs, c.ys);
      this.compareChart.draw();
    }
    if (this.yearData) {
      const y = yearChartData(this.yearData, this.ctx.sim.state.reservedFlow);
      fill(this.yearFlowTitle, `${t('chartYear')} (${y.unit})`);
      this.yearFlowOpts.yMax = niceCeil3(Math.max(...y.flows.river) * 1.05);
      this.yearPowerOpts.yMax = niceCeil3(Math.max(1, ...y.power) * 1.05);
      this.yearFlowChart.setData(y.xs, y.flows);
      this.yearFlowChart.draw();
      this.yearPowerChart.setData(y.xs, { power: y.power });
      this.yearPowerChart.draw();
    }
    this.computing.textContent = this.wait > 0 || this.jobs.length > 0 ? t('computing') : '';
  }
}
