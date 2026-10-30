import { COLORS, Drawing, INK, INK_2, W, type DrawingSheet, type Pt } from '@onigam/lab-kit/drawings';
import { getLang, l, type L } from '@onigam/lab-kit/i18n';
import { PARTS } from '../data/parts';
import { nEn, nFr } from '../data/units';
import {
  CHOOSER_BOX,
  POWER_LINES,
  TURBINE_TYPES,
  ZONES,
  equalPowerFlow,
  powerLine,
  zonePolygon,
  type TurbineType,
} from '../sim/chooser';
import { PRESET_IDS, presetParams } from '../sim/presets';
import { EDU_NOTE_CHART, FILL, PAPER, box, grid, heading, marksLegend } from './draw';
import { cat, lab, type Status } from './geom';

const NUMBER = 'PL-08';
const TITLE = l('Quelle turbine pour mon site ?', 'Which turbine for my site?');

/** The parts of the `site` world that this sheet ties to the chart: where the head and the flow of a site come from. */
export const ITEMS = ['river', 'weir', 'headrace', 'water-chamber'];
const n = (id: string): number => ITEMS.indexOf(id) + 1;
const partOf = (id: string) => PARTS.find((p) => p.id === id)!;

/** The chart on the sheet (paper mm): its box, and the graduations of its two logarithmic axes. */
export const LAYOUT = {
  CHART: { x: 40, y: 24, w: 232, h: 174 },
  X_TICKS: [0.1, 1, 10, 100, 1000],
  Y_TICKS: [0.01, 0.1, 1, 10],
} as const;

/** The lines of equal power are drawn at this overall efficiency, as the chart of the simulation panel draws them (src/panels/model.ts). ESTIMATE. */
export const LINE_ETA = 0.75;
/** The two plants of the research notes (another video), the figures they report: head m, flow m³/s, power W. The flow of the mountain plant is not reported (derived below). */
export const PLANTS = {
  crossflow: { head: 9.22, flow: 0.45, power: 30000 },
  pelton: { head: 220, power: 987000 },
} as const;
/** Flow that the mountain plant needs for its power at the usual efficiency of a Pelton turbine: derived (an estimate: that efficiency is an estimate). */
export const peltonFlow = (): number => equalPowerFlow(PLANTS.pelton.power, PLANTS.pelton.head, ZONES.pelton.eta);

const TYPE_NAME: Record<TurbineType, L> = {
  undershot: l('roue par-dessous', 'undershot wheel'),
  breastshot: l('roue de poitrine', 'breastshot wheel'),
  overshot: l('roue par-dessus', 'overshot wheel'),
  screw: l('vis d’Archimède', 'Archimedes screw'),
  kaplan: l('Kaplan', 'Kaplan'),
  crossflow: l('flux traversant', 'crossflow'),
  francis: l('Francis', 'Francis'),
  pelton: l('Pelton', 'Pelton'),
};
/** One hue per type; the screw, the machine of the lab, is the strongest. */
const TYPE_COLOR: Record<TurbineType, string> = {
  undershot: '#6aa6cf',
  breastshot: '#3f9d93',
  overshot: '#7fae3c',
  screw: '#d99a1e',
  kaplan: '#a064c0',
  crossflow: '#e0714f',
  francis: '#5b78cf',
  pelton: '#c4536f',
};
const RED = COLORS.red;

const tick = (v: number): string => {
  const d = v < 1 ? Math.ceil(-Math.log10(v) - 1e-9) : 0;
  return getLang() === 'fr' ? nFr(v, d) : nEn(v, d);
};

// ------------------------------------------------------------------------------------------------ the chart

function chart(d: Drawing): { X: (h: number) => number; Y: (q: number) => number } {
  const p = d.paper();
  const C = LAYOUT.CHART;
  const B = CHOOSER_BOX;
  const lx = (h: number): number => Math.log10(h);
  const gx = (lh: number): number => C.x + ((lh - B.xMin) / (B.xMax - B.xMin)) * C.w;
  const gy = (lq: number): number => C.y + C.h - ((lq - B.yMin) / (B.yMax - B.yMin)) * C.h;
  const X = (h: number): number => gx(lx(h));
  const Y = (q: number): number => gy(Math.log10(q));
  const pt = ([a, b]: [number, number]): Pt => [gx(a), gy(b)];

  // the grid: a faint line at 2 to 9 times a decade, a stronger one on the decades
  for (let e = B.xMin; e < B.xMax; e++)
    for (let k = 2; k <= 9; k++)
      p.line([X(k * 10 ** e), C.y], [X(k * 10 ** e), C.y + C.h], { w: 0.05, color: '#d8d2c4' });
  for (let e = B.yMin; e < B.yMax; e++)
    for (let k = 2; k <= 9; k++)
      p.line([C.x, Y(k * 10 ** e)], [C.x + C.w, Y(k * 10 ** e)], { w: 0.05, color: '#d8d2c4' });
  for (const h of LAYOUT.X_TICKS) p.line([X(h), C.y], [X(h), C.y + C.h], { w: 0.12, color: '#b9b2a2' });
  for (const q of LAYOUT.Y_TICKS) p.line([C.x, Y(q)], [C.x + C.w, Y(q)], { w: 0.12, color: '#b9b2a2' });

  // the zones: a light fill, then the outline; the screw last and strongest
  const order: TurbineType[] = [...TURBINE_TYPES.filter((t) => t !== 'screw'), 'screw'];
  for (const type of order) {
    const pts = zonePolygon(type, B).map(pt);
    p.polyline(pts, { closed: true, w: 0, fill: TYPE_COLOR[type], opacity: type === 'screw' ? 0.18 : 0.2 });
    p.polyline(pts, { closed: true, w: type === 'screw' ? 0.7 : 0.4, color: TYPE_COLOR[type], fill: 'none' });
  }

  // the lines of equal power
  for (const power of POWER_LINES) {
    const pts = powerLine(power, LINE_ETA, B, 80).filter(([, y]) => Number.isFinite(y));
    p.polyline(pts.map(pt), { w: 0.3, color: INK_2, dash: 'hidden' });
    const at = pts[Math.floor(pts.length * (power >= 1e6 ? 0.45 : power >= 1e5 ? 0.62 : power >= 1e4 ? 0.2 : 0.55))]!;
    const [qx, qy] = pt(at);
    p.text([qx, qy - 1.6], powerLabel(power), { size: 1.8, color: INK_2, anchor: 'middle', halo: true, mono: true });
  }

  // the frame and its graduations
  p.rect([C.x, C.y], [C.x + C.w, C.y + C.h], { w: W.medium, color: INK });
  for (const h of LAYOUT.X_TICKS) p.text([X(h), C.y + C.h + 4.4], tick(h), { size: 2, anchor: 'middle', mono: true });
  for (const q of LAYOUT.Y_TICKS)
    p.text([C.x - 2.2, Y(q)], tick(q), { size: 2, anchor: 'end', baseline: 'middle', mono: true });
  p.text([C.x + C.w / 2, C.y + C.h + 10.5], l('chute H (m), échelle logarithmique', 'head H (m), logarithmic scale'), {
    size: 2.2,
    anchor: 'middle',
    color: INK_2,
  });
  p.text([C.x - 14, C.y + C.h / 2], l('débit Q (m³/s), échelle logarithmique', 'flow Q (m³/s), logarithmic scale'), {
    size: 2.2,
    anchor: 'middle',
    rotate: 90,
    color: INK_2,
  });
  return { X, Y };
}

const powerLabel = (w: number): L => (w >= 1e6 ? lab(w / 1e6, 0, null, '', ' MW') : lab(w / 1e3, 0, null, '', ' kW'));

/** Where the label of each zone stands, in the chart's own units (head m, flow m³/s): the middle of the zone, moved by hand where zones overlap. */
const LABEL_AT: Record<TurbineType, [number, number, 'start' | 'middle' | 'end']> = {
  undershot: [0.52, 0.045, 'middle'],
  breastshot: [2.1, 0.022, 'middle'],
  overshot: [5.2, 0.011, 'start'],
  screw: [0.8, 0.9, 'middle'],
  kaplan: [3.4, 6, 'start'],
  crossflow: [20, 0.014, 'middle'],
  francis: [48, 6.5, 'middle'],
  pelton: [330, 0.04, 'middle'],
};

function labelsAndPoints(d: Drawing, X: (h: number) => number, Y: (q: number) => number): void {
  const p = d.paper();
  for (const type of TURBINE_TYPES) {
    const [h, q, anchor] = LABEL_AT[type];
    p.text([X(h), Y(q)], TYPE_NAME[type], {
      size: type === 'screw' ? 2.6 : 2.1,
      weight: 'bold',
      color: TYPE_COLOR[type],
      anchor,
      baseline: 'middle',
      halo: true,
    });
  }
  // the presets of the lab: the design point in red, the three others hollow
  const names: Record<string, L> = {
    'full-size': l('le bief du moulin, point de calcul', 'the mill race, design point'),
    prototype: l('le prototype', 'the prototype'),
    brook: l('le ruisseau', 'the brook'),
    river: l('la rivière', 'the river'),
  };
  const dx: Record<string, [number, number, 'start' | 'end']> = {
    'full-size': [3.4, 3.4, 'start'],
    prototype: [-3, 3.2, 'end'],
    brook: [-3, -2.4, 'end'],
    river: [3, -3, 'start'],
  };
  for (const id of PRESET_IDS) {
    const q = presetParams(id);
    const [x, y] = [X(q.head), Y(q.designFlow)];
    const main = id === 'full-size';
    p.circle([x, y], main ? 1.7 : 1.3, { w: W.medium, color: RED, fill: main ? RED : PAPER });
    const [ox, oy, a] = dx[id]!;
    p.text([x + ox, y + oy], names[id]!, {
      size: 1.8,
      anchor: a,
      weight: main ? 'bold' : 'normal',
      color: RED,
      baseline: 'middle',
      halo: true,
    });
  }
  // the two plants of another video
  const diamond = (x: number, y: number): void => {
    p.polyline(
      [
        [x, y - 2.1],
        [x + 2.1, y],
        [x, y + 2.1],
        [x - 2.1, y],
      ],
      { closed: true, w: W.medium, color: INK, fill: PAPER },
    );
  };
  const cf = PLANTS.crossflow;
  diamond(X(cf.head), Y(cf.flow));
  p.text([X(cf.head) + 3.2, Y(cf.flow) + 0.3], l('flux traversant d’une autre vidéo', 'crossflow of another video'), {
    size: 1.7,
    baseline: 'middle',
    halo: true,
  });
  const pe = PLANTS.pelton;
  diamond(X(pe.head), Y(peltonFlow()));
  p.text([X(pe.head) - 3.2, Y(peltonFlow()) + 0.3], l('Pelton d’une autre vidéo', 'Pelton of another video'), {
    size: 1.7,
    anchor: 'end',
    baseline: 'middle',
    halo: true,
  });
}

// ------------------------------------------------------------------------------------------------ a site: head and flow, and where they come from

function siteSketch(d: Drawing, x: number, y: number): void {
  const p = d.paper();
  const w = 110;
  // ground, the pond above the weir, the weir, the canal to the chamber, the tailwater below
  p.polyline(
    [
      [x, y + 18],
      [x + 36, y + 18],
      [x + 36, y + 22],
      [x + 70, y + 22],
      [x + 70, y + 31],
      [x + w, y + 31],
    ],
    { w: W.medium },
  );
  p.rect([x, y + 12], [x + 34, y + 18], { w: 0, fill: FILL.water });
  p.line([x, y + 12], [x + 34, y + 12], { w: W.medium, color: COLORS.water });
  p.rect([x + 34, y + 11], [x + 37, y + 22], { w: W.medium, fill: FILL.concrete, hatch: 'earth' });
  p.rect([x + 37, y + 12], [x + 70, y + 22], { w: 0, fill: FILL.water });
  p.line([x + 37, y + 12], [x + 62, y + 12], { w: W.medium, color: COLORS.water });
  p.rect([x + 62, y + 12], [x + 76, y + 31], { w: W.medium, fill: '#e3e6e9' });
  p.rect([x + 76, y + 27], [x + w, y + 31], { w: 0, fill: FILL.water });
  p.line([x + 76, y + 27], [x + w, y + 27], { w: W.medium, color: COLORS.water });
  // the head, and the flow
  p.line([x + 80, y + 12], [x + 86, y + 12], { w: W.thin, color: COLORS.water });
  p.line([x + 86, y + 12], [x + 86, y + 27], { w: W.thin, color: INK });
  p.polyline(
    [
      [x + 84.4, y + 14],
      [x + 86, y + 12],
      [x + 87.6, y + 14],
    ],
    { w: W.thin },
  );
  p.polyline(
    [
      [x + 84.4, y + 25],
      [x + 86, y + 27],
      [x + 87.6, y + 25],
    ],
    { w: W.thin },
  );
  p.text([x + 88.5, y + 19.5], 'H', { size: 2.6, weight: 'bold', baseline: 'middle' });
  p.line([x + 6, y + 8], [x + 28, y + 8], { w: W.medium, color: COLORS.water });
  p.polyline(
    [
      [x + 25.5, y + 6.4],
      [x + 28, y + 8],
      [x + 25.5, y + 9.6],
    ],
    { w: W.medium, color: COLORS.water },
  );
  p.text([x + 17, y + 4.6], 'Q', { size: 2.6, weight: 'bold', anchor: 'middle', color: COLORS.water });
  p.line([x + 40, y + 8], [x + 58, y + 8], { w: W.medium, color: COLORS.water });
  p.polyline(
    [
      [x + 55.5, y + 6.4],
      [x + 58, y + 8],
      [x + 55.5, y + 9.6],
    ],
    { w: W.medium, color: COLORS.water },
  );
  const bl = (id: string, bx: number, by: number, tx: number, ty: number): void => {
    p.line([tx, ty], [bx, by], { w: W.thin });
    p.circle([bx, by], 3, { w: W.thin, fill: PAPER });
    p.text([bx, by], String(n(id)), { size: 2.3, weight: 'bold', anchor: 'middle', baseline: 'middle' });
  };
  bl('river', x + 12, y + 28, x + 12, y + 16);
  bl('weir', x + 35.5, y + 3.5, x + 35.5, y + 11);
  bl('headrace', x + 56, y + 28, x + 56, y + 21);
  bl('water-chamber', x + 69, y + 6.5, x + 69, y + 13);
}

// ------------------------------------------------------------------------------------------------ the tables

function zonesTable(d: Drawing, x: number, y: number): number {
  const rows = TURBINE_TYPES.map((t) => {
    const [a, b] = ZONES[t].head;
    const digits = (v: number): number => (Number.isInteger(v) ? 0 : 1);
    return [
      { t: TYPE_NAME[t], bold: true, color: TYPE_COLOR[t] },
      cat(lab(a, digits(a), null), l(' à ', ' to '), lab(b, digits(b), null, '', ' m')),
    ];
  });
  return grid(
    d,
    x,
    y,
    [
      { label: l('Type', 'Type'), w: 52 },
      { label: l('Chute habituelle', 'Usual head'), w: 62, align: 'end', mono: true },
    ],
    rows,
    { size: 1.7, pad: 0.35, lineH: 2.7 },
  );
}

function pointsTable(d: Drawing, x: number, y: number): number {
  const names: Record<string, L> = {
    'full-size': l('Bief du moulin', 'Mill race'),
    prototype: l('Prototype', 'Prototype'),
    brook: l('Ruisseau', 'Brook'),
    river: l('Rivière', 'River'),
  };
  const flow = (q: number, st: Status | null): L =>
    q < 1 ? lab(q * 1000, 0, st, '', ' L/s') : lab(q, 1, st, '', l(' m³/s', ' m³/s'));
  const rows: (L | { t: L; bold?: boolean })[][] = PRESET_IDS.map((id) => {
    const q = presetParams(id);
    const main = id === 'full-size';
    return [
      { t: names[id]!, bold: main },
      lab(q.head, q.head % 1 === 0 ? 0 : 2, 'E', '', ' m'),
      flow(q.designFlow, main ? 'D' : 'E'),
    ];
  });
  const cf = PLANTS.crossflow;
  rows.push([
    l('Flux traversant, autre vidéo', 'Crossflow, another video'),
    lab(cf.head, 2, null, '', ' m'),
    lab(cf.flow * 1000, 0, null, '', ' L/s'),
  ]);
  rows.push([
    l('Pelton, autre vidéo', 'Pelton, another video'),
    lab(PLANTS.pelton.head, 0, null, '', ' m'),
    lab(peltonFlow() * 1000, 0, 'E', '', ' L/s'),
  ]);
  return grid(
    d,
    x,
    y,
    [
      { label: l('Point du graphique', 'Point of the chart'), w: 52 },
      { label: l('Chute', 'Head'), w: 24, align: 'end', mono: true },
      { label: l('Débit', 'Flow'), w: 30, align: 'end', mono: true },
    ],
    rows,
    { size: 1.65, pad: 0.35, lineH: 2.6 },
  );
}

// ------------------------------------------------------------------------------------------------ the legend of the chart

function legendRow(d: Drawing, x: number, y: number): void {
  const p = d.paper();
  let xx = x;
  const item = (sym: (cx: number, cy: number) => void, text: L, w: number): void => {
    sym(xx + 2.4, y);
    p.text([xx + 6, y], text, { size: 1.8, baseline: 'middle' });
    xx += w;
  };
  item(
    (cx, cy) => p.circle([cx, cy], 1.7, { w: W.medium, color: RED, fill: RED }),
    l('le point de calcul du labo', 'the lab’s design point'),
    54,
  );
  item(
    (cx, cy) => p.circle([cx, cy], 1.3, { w: W.medium, color: RED, fill: PAPER }),
    l('ses trois variantes', 'its three variants'),
    38,
  );
  item(
    (cx, cy) =>
      p.polyline(
        [
          [cx, cy - 2.1],
          [cx + 2.1, cy],
          [cx, cy + 2.1],
          [cx - 2.1, cy],
        ],
        { closed: true, w: W.medium, color: INK, fill: PAPER },
      ),
    l('une centrale d’une autre vidéo', 'a plant of another video'),
    52,
  );
  p.line([xx, y], [xx + 5, y], { w: 0.3, color: INK_2, dash: 'hidden' });
  p.text(
    [xx + 7, y],
    cat(
      l('même puissance, au rendement de ', 'equal power, at an efficiency of '),
      lab(LINE_ETA * 100, 0, 'E', '', ' %'),
    ),
    {
      size: 1.8,
      baseline: 'middle',
    },
  );
}

// ------------------------------------------------------------------------------------------------ the sheet

function render(): Drawing {
  const d = new Drawing();
  d.frame({
    title: TITLE,
    subtitle: l(
      'Les zones d’emploi des turbines selon la chute et le débit, les points du labo · échelles logarithmiques',
      'Where each turbine is used, by head and flow, and the lab’s points · logarithmic scales',
    ),
    number: NUMBER,
    scale: '—',
  });
  heading(
    d,
    14,
    13,
    l(
      'A · CHUTE ET DÉBIT : les zones où chaque type de turbine est d’usage',
      'A · HEAD AND FLOW: the zones where each type of turbine is used',
    ),
    {
      size: 2.2,
    },
  );
  const { X, Y } = chart(d);
  labelsAndPoints(d, X, Y);
  legendRow(d, 40, 219);

  heading(d, 290, 13, l('B · UN SITE : sa chute H et son débit Q', 'B · A SITE: its head H and its flow Q'), {
    size: 2,
  });
  siteSketch(d, 292, 20);
  grid(
    d,
    292,
    58,
    [
      { label: l('Rep.', 'Item'), w: 8, align: 'middle' },
      { label: l('Désignation', 'Part'), w: 106 },
    ],
    ITEMS.map((id, i) => [{ t: String(i + 1), bold: true }, partOf(id).name]),
    { size: 1.7, pad: 0.35, lineH: 2.6 },
  );
  heading(d, 290, 82, l('C · LES ZONES', 'C · THE ZONES'), { size: 2 });
  zonesTable(d, 292, 87);
  heading(d, 290, 128, l('D · LES POINTS DU GRAPHIQUE', 'D · THE POINTS OF THE CHART'), { size: 2 });
  pointsTable(d, 292, 133);
  marksLegend(d, 292, 166, 114);
  box(
    d,
    292,
    196,
    114,
    l('POUR LES TRÈS HAUTES CHUTES', 'FOR VERY HIGH HEADS'),
    [
      l(
        'Au-delà des chutes d’une vis ou d’une roue, la turbine Pelton prend le relais : voir Pelton Lab, pelton-lab.vercel.app.',
        'Beyond the heads of a screw or a wheel, the Pelton turbine takes over: see Pelton Lab, pelton-lab.vercel.app.',
      ),
    ],
    { size: 1.7 },
  );
  box(
    d,
    40,
    226,
    236,
    l('LIRE LE GRAPHIQUE', 'READING THE CHART'),
    [
      l(
        'Une zone dit où un type est d’usage, pas où il est possible : les zones se chevauchent, et les sources ne s’accordent pas sur leurs bords. Le même site se prête donc à plusieurs machines ; la puissance, elle, suit la chute et le débit.',
        'A zone says where a type is used, not where it is possible: the zones overlap, and the sources disagree at their edges. The same site therefore suits several machines; the power follows the head and the flow.',
      ),
    ],
    { size: 1.7 },
  );
  box(
    d,
    14,
    248,
    192,
    l('NOTE', 'NOTE'),
    [
      l(
        'Les chutes des zones viennent de sources publiées ; les limites de débit des roues, des turbines et le rendement des lignes sont des estimations, et le débit de la centrale de montagne est calculé à partir de sa puissance.',
        'The heads of the zones come from published sources; the flow limits of the wheels and turbines and the efficiency of the lines are estimates, and the flow of the mountain plant is calculated from its power.',
      ),
      EDU_NOTE_CHART,
    ],
    { size: 1.7 },
  );
  return d;
}

export const turbineChart: DrawingSheet = {
  id: 'turbine-chart',
  number: NUMBER,
  group: 'site',
  title: TITLE,
  description: l(
    'Chute en abscisse, débit en ordonnée, deux échelles logarithmiques : chaque type de turbine ou de roue y occupe une zone où il est d’usage, et les lignes en pointillés relient les sites de même puissance. Les zones se chevauchent et les sources ne s’accordent pas sur leurs bords : le graphique dit où chercher, pas quoi choisir. Le point rouge est le site du labo, les trois autres points ses variantes, et deux centrales d’une autre vidéo servent de repères.',
    'Head across, flow up, two logarithmic scales: each type of turbine or wheel has a zone where it is used, and the dashed lines join the sites of equal power. The zones overlap and the sources disagree at their edges: the chart says where to look, not what to choose. The red dot is the lab’s site, the three other dots its variants, and two plants of another video serve as landmarks.',
  ),
  scene: 'site',
  parts: ITEMS,
  render,
};
