import { COLORS, Drawing, INK, INK_2, W, type DrawingSheet, type Pt, type View } from '@onigam/lab-kit/drawings';
import { getLang, l, type L } from '@onigam/lab-kit/i18n';
import { PARTS } from '../data/parts';
import { nEn, nFr } from '../data/units';
import { BUS_VOLTS } from '../sim/machine';
import {
  DESIGN,
  DRIVE,
  GENERATOR,
  SCREW,
  largeSprocketRadius,
  smallPulleyRadius,
  journalRadius,
  smallTeeth,
  sprocketRadius,
} from '../three/dims';
import { Chart } from './chart';
import { EDU_NOTE, FILL, RED, arrow, balloon, box, grid, heading, marksLegend, modelTag, poly } from './draw';
import { cat, dim, figLab, lab, labOf, num, scaleText } from './geom';
import { drivePoint, torqueCurve } from './model';
import { arcPoints, bandOutline, sprocketOutline } from './wheels';

const NUMBER = 'PL-03';
const TITLE = l('La transmission et la génératrice', 'The drive and the generator');

/** The parts of the `screw` world that this sheet shows, in the order of its item numbers. */
export const ITEMS = [
  'drive-sprocket',
  'chain',
  'counter-sprocket',
  'countershaft',
  'pulley-large',
  'belt',
  'pulley-small',
  'generator',
];
const n = (id: string): number => ITEMS.indexOf(id) + 1;
const partOf = (id: string) => PARTS.find((p) => p.id === id)!;

/** Where the views stand on the sheet: the scale of the drive view (1:n), the paper position (mm) of the screw axis in it, and the chart boxes. */
export const LAYOUT = {
  A: { scale: 8, ox: 43.5, oy: 56 },
  TORQUE: { x: 34, y: 152, w: 100, h: 62, yMax: 600, xMax: 150 },
  POWER: { x: 164, y: 152, w: 100, h: 62, yMax: 3, xMax: 150 },
} as const;

const m = (v: number): number => v * 1000;
const rad = (deg: number): number => deg * (Math.PI / 180);
const STEEL = FILL.steel;

const fmtNum =
  (digits: number) =>
  (v: number): string =>
    getLang() === 'fr' ? nFr(v, digits) : nEn(v, digits);

// ------------------------------------------------------------------------------------------------ A: the drive, seen along the axis

function driveView(d: Drawing, v: View): void {
  const p = d.paper();
  const [cy0, cz0] = DRIVE.countershaftAt;
  const [gy0, gz0] = DRIVE.generatorAt;
  const S0: Pt = [0, 0];
  const C: Pt = [m(cz0), m(cy0)];
  const G: Pt = [m(gz0), m(gy0)];
  const Rs = m(largeSprocketRadius());
  const zs = smallTeeth(DESIGN.chainRatio);
  const rs = m(sprocketRadius(zs));
  const Rp = m(DRIVE.largePulleyRadius);
  const rp = m(smallPulleyRadius(DESIGN.beltRatio));
  const pitch = m(DRIVE.chainPitch);
  const Rg = m(GENERATOR.bodyRadius + GENERATOR.bellExtra);

  // ---- the generator, behind everything: end bell, body, terminal box on top, the stub of its shaft
  v.rect(
    [G[0] - m(GENERATOR.box[0]) / 2, G[1] + Rg - 8],
    [G[0] + m(GENERATOR.box[0]) / 2, G[1] + Rg + m(GENERATOR.box[1])],
    {
      w: W.medium,
      fill: STEEL,
    },
  );
  v.circle(G, Rg, { w: W.medium, fill: FILL.copper });
  v.circle(G, m(GENERATOR.bodyRadius), { w: W.thin, fill: 'none' });

  // ---- the belt plane: the large pulley on the countershaft, the small one on the generator, the flat belt round both
  const belt = bandOutline(C, Rp, G, rp);
  v.polyline(belt.outline, { closed: true, w: 0.75, color: '#3b4452', fill: 'none' });
  for (const [c, r] of [
    [C, Rp],
    [G, rp],
  ] as const) {
    v.circle(c, r - 4, { w: W.medium, fill: STEEL });
    v.circle(c, r * 0.3, { w: W.thin, fill: COLORS.paper });
  }
  for (let i = 0; i < 5; i++) {
    const a = rad(90 + i * 72);
    v.circle([C[0] + 0.62 * Rp * Math.cos(a), C[1] + 0.62 * Rp * Math.sin(a)], 0.17 * Rp, {
      w: W.thin,
      fill: COLORS.paper,
    });
  }

  // ---- the chain plane, in front: the chain between the two sprockets, the sprockets
  const chain = bandOutline(S0, Rs, C, rs);
  v.polyline(chain.outline, { closed: true, w: 0.9, color: INK_2, fill: 'none', dash: [1.3, 0.55] });
  poly(v, sprocketOutline(S0, DRIVE.largeTeeth, Rs, pitch), { w: W.medium, fill: STEEL });
  poly(v, sprocketOutline(C, zs, rs, pitch), { w: W.medium, fill: STEEL });
  v.circle(S0, Rs * 0.78, { w: W.thin, fill: 'none' });
  for (let i = 0; i < 6; i++) {
    const a = rad(i * 60);
    v.circle([0.5 * Rs * Math.cos(a), 0.5 * Rs * Math.sin(a)], 0.15 * Rs, { w: W.thin, fill: COLORS.paper });
  }
  v.circle(S0, 0.22 * Rs, { w: W.medium, fill: STEEL });

  // ---- the shafts: the screw's (centre), the countershaft's, the generator's stub
  v.circle(S0, m(journalRadius(SCREW.outerDiameter)), { w: W.medium, fill: STEEL, hatch: 'steel' });
  v.circle(C, m(DRIVE.countershaftRadius), { w: W.medium, fill: STEEL, hatch: 'steel' });
  v.circle(G, m(GENERATOR.shaftRadius), { w: W.medium, fill: STEEL, hatch: 'steel' });
  // the screw, behind the sprocket: only the arc of its blade tips that is inside the picture, in phantom lines
  const ro = m(SCREW.outerDiameter) / 2;
  v.polyline(arcPoints(S0, ro, rad(-46), rad(28), 24), { w: W.thin, color: INK_2, dash: 'phantom' });
  p.text(v.map([ro * 0.72 + 75, -ro * 0.72 + 10]), l('vis (traits mixtes)', 'screw (phantom lines)'), {
    size: 1.7,
    color: INK_2,
    baseline: 'middle',
  });

  // ---- centre lines and the two centre distances
  for (const c of [S0, C, G]) v.center([c[0], c[1] - 30], [c[0], 250], 0);
  const top = 250;
  v.dim([S0[0], top], [C[0], top], 0, { dir: 'h', label: labOf(dim('DRIVE', 'chainCentres'), 2, '', ' m'), size: 1.9 });
  v.dim([C[0], top], [G[0], top], 0, { dir: 'h', label: labOf(dim('DRIVE', 'beltCentres'), 2, '', ' m'), size: 1.9 });

  // ---- the sense of rotation, the same for every wheel: clockwise seen from the lower end of the screw
  for (const c of [S0, C, G]) {
    const r = c === S0 ? 70 : c === C ? 62 : 36;
    const pts = arcPoints([c[0], c[1]], r, rad(140), rad(40), 12);
    const e = v.polyline(pts, { w: W.medium, color: COLORS.copper });
    e.setAttribute('marker-end', 'url(#arrow)');
  }

  // ---- balloons
  const bl = (id: string, target: Pt, dx: number, dy: number): void => {
    const [tx, ty] = v.map(target);
    balloon(v, target, tx + dx, ty + dy, n(id));
  };
  const toward = (c: Pt, r: number, deg: number): Pt => [c[0] + r * Math.cos(rad(deg)), c[1] + r * Math.sin(rad(deg))];
  bl('drive-sprocket', toward(S0, Rs * 0.95, 215), -5, 6);
  const run = chain.runs[0]!;
  bl('chain', [run[0][0] + (run[1][0] - run[0][0]) * 0.45, run[0][1] + (run[1][1] - run[0][1]) * 0.45], 6, -12);
  bl('counter-sprocket', toward(C, rs * 0.85, 250), -2, 14);
  bl('countershaft', toward(C, m(DRIVE.countershaftRadius) * 0.5, 0), 22, 0);
  bl('pulley-large', toward(C, Rp * 0.9, 130), -10, -3);
  bl('belt', [(belt.runs[1]![0][0] + belt.runs[1]![1][0]) / 2, (belt.runs[1]![0][1] + belt.runs[1]![1][1]) / 2], 0, 12);
  bl('pulley-small', toward(G, rp * 0.8, 215), -4, 12);
  bl('generator', toward(G, Rg * 0.95, 35), 9, -5);
}

// ------------------------------------------------------------------------------------------------ the three shafts: what the model gives

function cards(d: Drawing): void {
  const p = d.paper();
  const dp = drivePoint();
  const rpm = (v: number): L => lab(v, 0, null, '', l(' tr/min', ' rpm'));
  const nm = (v: number): L => lab(v, 0, null, '', ' N·m');
  const kw = (v: number): L => lab(v / 1000, 2, null, '', ' kW');
  const zs = smallTeeth(DESIGN.chainRatio);
  const wheel = (name: L, teeth: number | null, diam: number): L =>
    cat(
      name,
      ' · ',
      teeth !== null ? cat(lab(teeth, 0, 'E', '', l(' dents', ' teeth')), ' · ') : '',
      lab(diam, 2, 'E', 'Ø', ' m'),
    );
  const y0 = 99;
  const h = 27;
  type Card = { x: number; w: number; title: L; lines: L[]; r: { rpm: number; torque: number; power: number } };
  const list: Card[] = [
    {
      x: 14,
      w: 52,
      title: l('ARBRE DE LA VIS', 'SCREW SHAFT'),
      lines: [wheel(l('grand pignon', 'large sprocket'), dim('DRIVE', 'largeTeeth').v, 2 * largeSprocketRadius())],
      r: dp.screw,
    },
    {
      x: 96,
      w: 90,
      title: cat(
        l('ARBRE INTERMÉDIAIRE · ', 'COUNTERSHAFT · '),
        labOf(dim('DRIVE', 'countershaftRadius'), 0, 'Ø', ' mm', 2000),
      ),
      lines: [
        wheel(l('petit pignon', 'small sprocket'), zs, 2 * sprocketRadius(zs)),
        wheel(l('grande poulie', 'large pulley'), null, 2 * dim('DRIVE', 'largePulleyRadius').v),
      ],
      r: dp.counter,
    },
    {
      x: 216,
      w: 52,
      title: l('GÉNÉRATRICE', 'GENERATOR'),
      lines: [wheel(l('petite poulie', 'small pulley'), null, 2 * smallPulleyRadius(DESIGN.beltRatio))],
      r: dp.generator,
    },
  ];
  for (const c of list) {
    p.rect([c.x, y0], [c.x + c.w, y0 + h], { w: W.medium, fill: COLORS.paper });
    p.text([c.x + 2, y0 + 1.8], c.title, { size: 1.8, weight: 'bold', baseline: 'top' });
    c.lines.forEach((t, i) => p.text([c.x + 2, y0 + 5.6 + i * 3.3], t, { size: 1.7, baseline: 'top', color: INK_2 }));
    p.line([c.x, y0 + 12.4], [c.x + c.w, y0 + 12.4], { w: W.thin, color: RED });
    p.text([c.x + 2, y0 + 14], cat(rpm(c.r.rpm), ' · ', nm(c.r.torque)), {
      size: 2.1,
      mono: true,
      weight: 'bold',
      baseline: 'top',
      color: RED,
    });
    p.text([c.x + 2, y0 + 19.5], cat(kw(c.r.power), l(' sur l’arbre', ' at the shaft')), {
      size: 1.8,
      mono: true,
      baseline: 'top',
      color: RED,
    });
    p.text([c.x + c.w - 2, y0 + h - 1.2], l('résultat du modèle', 'model result'), {
      size: 1.6,
      anchor: 'end',
      color: RED,
    });
  }
  // the stages between the cards: the ratio and the efficiency of the stage
  const chip = (x0: number, x1: number, name: L, ratio: L, eff: L): void => {
    const xm = (x0 + x1) / 2;
    const ym = y0 + 12;
    arrow(p, [x0 + 1.5, ym], [x1 - 1.5, ym], INK_2, W.medium);
    p.text([xm, ym - 6.4], name, { size: 1.7, anchor: 'middle' });
    p.text([xm, ym - 2.2], ratio, { size: 2.2, anchor: 'middle', mono: true, weight: 'bold' });
    p.text([xm, ym + 2.2], eff, { size: 1.7, anchor: 'middle', baseline: 'top', color: INK_2 });
  };
  const effPct = (name: 'chainEff' | 'beltEff'): L => cat(l('rendement ', 'efficiency '), figLab(name, '', ' %'));
  chip(66, 96, l('chaîne', 'chain'), cat('× ', figLab('chain')), effPct('chainEff'));
  chip(186, 216, l('courroie', 'belt'), cat('× ', figLab('belt')), effPct('beltEff'));
  // the whole train
  const y = y0 + h + 4;
  p.polyline(
    [
      [40, y - 1.6],
      [40, y],
      [242, y],
      [242, y - 1.6],
    ],
    { w: W.thin, color: INK_2 },
  );
  p.text(
    [141, y + 1.6],
    cat(
      l('rapport total × ', 'total ratio × '),
      figLab('ratio'),
      l(' : la vis tourne lentement, la génératrice vite', ': the screw turns slowly, the generator fast'),
    ),
    {
      size: 1.9,
      anchor: 'middle',
      baseline: 'top',
      weight: 'bold',
    },
  );
}

// ------------------------------------------------------------------------------------------------ C: the curves of the model

/** A polyline of a chart cut where it leaves the box at the top (the load climbs without limit). */
function clipped(xs: number[], ys: number[], yMax: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < xs.length; i++) {
    if (ys[i]! <= yMax) out.push([xs[i]!, ys[i]!]);
    else {
      if (i > 0 && ys[i - 1]! < yMax) {
        const t = (yMax - ys[i - 1]!) / (ys[i]! - ys[i - 1]!);
        out.push([xs[i - 1]! + t * (xs[i]! - xs[i - 1]!), yMax]);
      }
      break;
    }
  }
  return out;
}

function charts(d: Drawing): void {
  const p = d.paper();
  const dp = drivePoint();
  const c = torqueCurve();
  const T = LAYOUT.TORQUE;
  const ch = new Chart(
    p,
    { x: T.x, y: T.y, w: T.w, h: T.h },
    { min: 0, max: T.xMax, step: 25, label: l('vitesse de la vis (tr/min)', 'screw speed (rpm)') },
    {
      min: 0,
      max: T.yMax,
      step: 100,
      label: l('couple sur l’arbre de la vis (N·m)', 'torque on the screw shaft (N·m)'),
    },
  ).frame();
  ch.line(clipped(c.rpm, c.machine, T.yMax), { color: COLORS.water, w: 0.6 });
  ch.line(clipped(c.rpm, c.load, T.yMax), { color: COLORS.copper, w: 0.6 });
  ch.vline(dp.cutInScrewRpm, { dash: 'hidden', color: INK_2, w: W.thin });
  ch.marker(dp.screw.rpm, dp.screw.torque, 'circle', { color: RED, fill: RED, r: 1.1 });
  ch.text(dp.cutInScrewRpm, T.yMax * 0.04, cat(lab(dp.cutInScrewRpm, 0, null), l(' tr/min', ' rpm')), {
    size: 1.7,
    anchor: 'end',
    dx: -1.2,
    color: INK_2,
    baseline: 'middle',
  });
  ch.text(
    60,
    555,
    cat(l('point de fonctionnement : ', 'operating point: '), lab(dp.screw.rpm, 0, null), l(' tr/min', ' rpm')),
    {
      size: 1.8,
      color: RED,
      weight: 'bold',
    },
  );
  ch.text(60, 500, l('← ce que demande la génératrice', '← what the generator asks'), {
    size: 1.8,
    color: COLORS.copper,
    weight: 'bold',
  });
  ch.text(4, 540, l('la vis (l’eau)', 'the screw (the water)'), { size: 1.8, color: COLORS.water, weight: 'bold' });

  const Pw = LAYOUT.POWER;
  const cp = new Chart(
    p,
    { x: Pw.x, y: Pw.y, w: Pw.w, h: Pw.h },
    { min: 0, max: Pw.xMax, step: 25, label: l('vitesse de la vis (tr/min)', 'screw speed (rpm)') },
    {
      min: 0,
      max: Pw.yMax,
      step: 0.5,
      label: l('puissance sur l’arbre (kW)', 'power at the shaft (kW)'),
      fmt: fmtNum(1),
    },
  ).frame();
  cp.line(
    c.rpm.map((r, i): Pt => [r, c.power[i]! / 1000]),
    { color: COLORS.water, w: 0.6 },
  );
  cp.marker(dp.screw.rpm, dp.screw.power / 1000, 'circle', { color: RED, fill: RED, r: 1.1 });
  cp.text(dp.screw.rpm, dp.screw.power / 1000, cat(lab(dp.screw.power / 1000, 2, null), ' kW'), {
    size: 1.8,
    dx: 3,
    dy: -3.4,
    color: RED,
    weight: 'bold',
  });
  cp.text(82, 2.5, l('plus vite, les poches se vident', 'faster, the pockets empty'), { size: 1.8, color: INK_2 });
}

// ------------------------------------------------------------------------------------------------ D: from the generator to the powerhouse

/** The generator and what leaves it: a small sketch that points to the sheets of the powerhouse (PL-05, PL-06), where the electronics stand now. */
function towardsPowerhouse(d: Drawing): void {
  const p = d.paper();
  const dp = drivePoint();
  const cx = 312;
  // the generator
  p.circle([cx, 36], 8.5, { w: W.thick, fill: COLORS.paper });
  p.text([cx, 34.4], 'G', { size: 3.6, weight: 'bold', anchor: 'middle', baseline: 'middle' });
  p.text([cx, 39.4], '3~', { size: 2, anchor: 'middle', baseline: 'middle' });
  const at = (y: number, t: L, o: { bold?: boolean; color?: string; mono?: boolean; size?: number } = {}): void => {
    p.text([338, y], t, {
      size: o.size ?? 1.75,
      baseline: 'middle',
      weight: o.bold ? 'bold' : 'normal',
      color: o.color ?? RED,
      mono: o.mono,
    });
  };
  at(33.5, cat(lab(dp.generator.rpm, 0, null), l(' tr/min', ' rpm')), { bold: true, mono: true, size: 2 });
  at(38.5, cat(lab(dp.generator.torque, 0, null), ' N·m'), { mono: true, size: 2 });
  // the three-phase cable leaves for the powerhouse
  p.line([cx, 44.5], [cx, 62], { w: W.medium, color: COLORS.acL });
  for (const dy of [-1.6, 0, 1.6])
    p.line([cx - 1.6, 52 + dy + 1.2], [cx + 1.6, 52 + dy - 1.2], { w: W.thin, color: COLORS.acL });
  arrow(p, [cx, 58], [cx, 66], COLORS.acL, W.medium);
  at(54, l('câble triphasé vers le local technique', 'three-phase cable to the powerhouse'), { color: INK_2 });
  // the powerhouse, dashed: what stands in it, in the order of the current
  p.rect([286, 66], [402, 132], { w: W.medium, color: INK_2, dash: 'phantom', fill: 'none' });
  p.text([290, 70.5], l('LOCAL TECHNIQUE', 'POWERHOUSE'), {
    size: 1.7,
    weight: 'bold',
    color: INK_2,
    baseline: 'middle',
  });
  const steps: L[] = [
    l('disjoncteur et fusibles', 'breaker and fuses'),
    l('redresseur', 'rectifier'),
    l('régulateur de charge', 'charge controller'),
    cat(l('batterie de ', 'battery of '), lab(BUS_VOLTS, 0, 'E', '', ' V')),
    l('onduleur', 'inverter'),
    l('compteur, puis la maison', 'meter, then the house'),
  ];
  steps.forEach((t, i) => {
    const y = 78 + i * 8.4;
    p.rect([292, y - 3], [352, y + 3], {
      w: W.medium,
      fill: COLORS.paper,
      dash: i === 4 || i === 5 ? 'hidden' : undefined,
    });
    p.text([322, y], t, { size: 1.6, anchor: 'middle', baseline: 'middle', weight: 'bold' });
    if (i < steps.length - 1) arrow(p, [322, y + 3], [322, y + 5.4], INK, W.thin);
  });
  // what the model gives at the rectifier and at the battery, beside the blocks
  p.text([358, 86.4], cat(lab(dp.voc, 1, null), l(' V à vide', ' V open-circuit')), {
    size: 1.75,
    mono: true,
    color: RED,
    baseline: 'middle',
    weight: 'bold',
  });
  p.text([358, 90.4], cat(l('pertes des diodes ', 'diode losses '), lab(dp.diodeLoss, 0, null, '', ' W')), {
    size: 1.5,
    color: RED,
    baseline: 'middle',
  });
  p.text([358, 94.4], l('après le redresseur', 'after the rectifier'), { size: 1.5, color: INK_2, baseline: 'middle' });
  p.text([358, 103.2], cat(lab(dp.current, 0, null), ' A · ', lab(dp.electric / 1000, 2, null), ' kW'), {
    size: 1.75,
    mono: true,
    color: RED,
    baseline: 'middle',
    weight: 'bold',
  });
  p.text([358, 111.6], l('dans la batterie', 'into the battery'), { size: 1.5, color: INK_2, baseline: 'middle' });
  p.text([358, 120], l('non simulés : onduleur, maison', 'not simulated: inverter, house'), {
    size: 1.5,
    color: INK_2,
    baseline: 'middle',
  });
  p.text(
    [290, 128.4],
    l(
      'le mur des appareils : PL-05 · le schéma de câblage : PL-06',
      'the wall of equipment: PL-05 · the wiring diagram: PL-06',
    ),
    {
      size: 1.55,
      color: INK_2,
      baseline: 'middle',
    },
  );
  balloon(p, [cx - 8.5, 36], 289, 36, n('generator'));
}

// ------------------------------------------------------------------------------------------------ the sheet

function render(): Drawing {
  const d = new Drawing();
  const A = LAYOUT.A;
  d.frame({
    title: TITLE,
    subtitle: l(
      'De l’arbre de la vis à la génératrice : chaîne, courroie · résultats du modèle',
      'From the screw’s shaft to the generator: chain, belt · model results',
    ),
    number: NUMBER,
    scale: scaleText(A.scale),
  });
  const p = d.paper();

  heading(
    d,
    14,
    13,
    l('A · LA TRANSMISSION, vue depuis le bas de la vis', 'A · THE DRIVE, seen from the lower end of the screw'),
    { size: 2.2 },
  );
  driveView(d, d.view(A.ox, A.oy, 1 / A.scale));
  p.text([266, 13], scaleText(A.scale), { size: 2.1, anchor: 'end', mono: true, color: INK_2 });
  cards(d);

  heading(
    d,
    14,
    140,
    l(
      'C · LE COUPLE ET LA PUISSANCE SELON LA VITESSE DE LA VIS',
      'C · TORQUE AND POWER AGAINST THE SPEED OF THE SCREW',
    ),
    { size: 2.2 },
  );
  modelTag(d, 14, 143.6, 64);
  charts(d);
  p.text(
    [34, 235],
    l(
      'Là où les deux courbes se croisent, la vis tourne. La génératrice ne freine qu’au-dessus de la vitesse où elle charge la batterie.',
      'Where the two curves cross, the screw turns. The generator only brakes above the speed at which it charges the battery.',
    ),
    { size: 1.7, color: INK_2 },
  );

  heading(d, 280, 13, l('D · VERS LE LOCAL TECHNIQUE', 'D · TOWARDS THE POWERHOUSE'), { size: 2.2 });
  modelTag(d, 338, 15.6, 68);
  towardsPowerhouse(d);

  // the parts list and the legend of the marks
  heading(d, 280, 148, l('REPÈRES · pièces représentées', 'ITEMS · parts shown'), { size: 2 });
  grid(
    d,
    280,
    153,
    [
      { label: l('Rep.', 'Item'), w: 9, align: 'middle' },
      { label: l('Désignation', 'Part'), w: 117 },
    ],
    ITEMS.map((id, i) => [{ t: String(i + 1), bold: true }, partOf(id).name]),
    { size: 1.75, pad: 0.5, lineH: 2.7 },
  );
  marksLegend(d, 280, 209, 126);
  box(
    d,
    14,
    248,
    208,
    l('LIRE LA PLANCHE · SÉCURITÉ', 'READING THE SHEET · SAFETY'),
    [
      {
        bullet: '1',
        t: cat(
          l(
            'Vue depuis le bas de la vis, tout tourne dans le même sens, celui des aiguilles d’une montre. Les nombres encadrés de rouge sont des résultats du modèle au point de fonctionnement du labo, pas des mesures. Sans charge, le modèle voit la vis s’emballer vers ',
            'Seen from the lower end of the screw, everything turns the same way, clockwise. The numbers boxed in red are model results at the lab’s design point, not measurements. With no load, the model sees the screw race to about ',
          ),
          figLab('freeRunRpm', '', l(' tr/min et la génératrice monter à ', ' rpm and the generator climb to ')),
          figLab(
            'freeRunVolts',
            '',
            l(' V à vide : jamais sans batterie.', ' V open-circuit: never without the battery.'),
          ),
        ),
      },
      {
        bullet: '2',
        t: l(
          `Chaîne et courroie sont carénées sur une vraie machine (ici, non dessiné). Batterie de ${num(BUS_VOLTS).fr} V : fusible, et un électricien qualifié pour le branchement.`,
          `Chain and belt are guarded on a real machine (not drawn here). ${num(BUS_VOLTS).en} V battery: fuse, and a qualified electrician for the wiring.`,
        ),
      },
      { bullet: '3', t: EDU_NOTE },
    ],
    { size: 1.75 },
  );
  return d;
}

export const driveElectricity: DrawingSheet = {
  id: 'drive-electricity',
  number: NUMBER,
  group: 'screw',
  title: TITLE,
  description: l(
    'Le bout de l’arbre de la vis porte un grand pignon, relié par une chaîne à un petit pignon sur un arbre intermédiaire ; une grande poulie du même arbre entraîne, par courroie, la petite poulie de la génératrice. Les vitesses, les couples et les puissances des trois arbres et la courbe de couple sont des résultats du modèle au point de fonctionnement du labo, pas des mesures. Le courant continue vers le local technique, dessiné sur deux autres planches.',
    'The end of the screw’s shaft carries a large sprocket, joined by a chain to a small sprocket on a countershaft; a large pulley on the same shaft drives the generator’s small pulley by belt. The speeds, torques and powers of the three shafts and the torque curve are model results at the lab’s design point, not measurements. The current goes on to the powerhouse, drawn on two other sheets.',
  ),
  scene: 'screw',
  parts: ITEMS,
  render,
};
