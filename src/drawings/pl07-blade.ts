import {
  COLORS,
  Drawing,
  INK_2,
  W,
  type DrawingSheet,
  type Pt,
  type Stroke,
  type View,
} from '@onigam/lab-kit/drawings';
import { l, type L } from '@onigam/lab-kit/i18n';
import { PARTS } from '../data/parts';
import { GAP_COEFF } from '../sim/machine';
import {
  BOLT,
  BOLTS_PER_MODULE,
  CORE_PLATE,
  DESIGN_SHAPE,
  MODULES_PER_TURN,
  ROOT_STRIP,
  TROUGH,
  bladeThickness,
  coreWall,
  hardwareScale,
} from '../three/dims';
import { EDU_NOTE, FILL, RED, balloon, box, caption, gapDim, grid, heading, marksLegend, modelTag, poly } from './draw';
import { cat, dim, figLab, lab, labOf, num, scaleText } from './geom';

const NUMBER = 'PL-07';
const TITLE = l('Un module de pale et le noyau', 'A blade module and the core');

/** The parts of the `screw` world that this sheet shows, in the order of its item numbers. */
export const ITEMS = ['blade-module', 'blade-fastener', 'screw-core', 'trough', 'trapped-water'];
const n = (id: string): number => ITEMS.indexOf(id) + 1;
const partOf = (id: string) => PARTS.find((p) => p.id === id)!;

/** Where the views stand on the sheet: the scale of each (1:n) and the paper position (mm) of the origin of the view (A: the lower end of the flights on the axis; B: the axis; C: the root of the blade). */
export const LAYOUT = {
  A: { scale: 10, ox: 38, oy: 71 },
  B: { scale: 10, ox: 268, oy: 71 },
  C: { scale: 2, ox: 354, oy: 177 },
} as const;

const TAU = 2 * Math.PI;
const DEG = Math.PI / 180;
const m = (v: number): number => v * 1000;
const S = DESIGN_SHAPE;
const RO = S.outerDiameter / 2;
const RI = S.innerDiameter / 2;
const T = bladeThickness(S.outerDiameter);
const WALL = coreWall(S.outerDiameter);
const PITCH = S.pitch;
const THREADS = 3;
const WOOD_A = '#ecd8ae';
const WOOD_B = '#e0c28c';
const STEEL = FILL.steel;

// ------------------------------------------------------------------------------------------------ the modules, as the 3D cuts them

/** The azimuths (rad) between which thread k exists: the same formula as src/three/screw/helix.ts `threadSpan` (the test compares them). */
export function threadSpanPsi(k: number): [number, number] {
  const off = (TAU * k) / THREADS;
  return [off + (TAU * (T / 2 + 0.004)) / PITCH, off + (TAU * (S.length - T / 2 - 0.004)) / PITCH];
}

/** The modules of thread k: each a quarter of a turn, cut at the multiples of a quarter turn (the same lines for the three threads), with a 4 mm joint. */
export function modulesOf(k: number, psiMax = Infinity): { j: number; a: number; b: number }[] {
  const [lo, hi0] = threadSpanPsi(k);
  const hi = Math.min(hi0, psiMax);
  const dpsi = TAU / MODULES_PER_TURN;
  const joint = 0.002 / RO;
  const out: { j: number; a: number; b: number }[] = [];
  for (let j = Math.floor(lo / dpsi); j < Math.ceil(hi / dpsi); j++) {
    const a = Math.max(lo, j * dpsi + joint);
    const b = Math.min(hi, (j + 1) * dpsi - joint);
    if (b - a >= 0.05) out.push({ j, a, b });
  }
  return out;
}

/** How many modules and bolts the whole screw has (the 3D's `bladeGeometry` counts the same). */
export function counts(): { modules: number; bolts: number } {
  let modules = 0;
  for (let k = 0; k < THREADS; k++) modules += modulesOf(k).length;
  return { modules, bolts: modules * BOLTS_PER_MODULE };
}

/** Axial position of thread k at azimuth ψ (the same as helix.ts), m. */
const xOf = (k: number, psi: number): number => (PITCH * (psi - (TAU * k) / THREADS)) / TAU;

// ------------------------------------------------------------------------------------------------ A: the core and its threads, seen from the side

function sideView(d: Drawing, v: View): void {
  const p = d.paper();
  const xMax = 2 * PITCH;
  const sx = (x: number): number => m(x);
  // the core tube and its end plate
  poly(
    v,
    [
      [sx(0), -m(RI)],
      [sx(xMax), -m(RI)],
      [sx(xMax), m(RI)],
      [sx(0), m(RI)],
    ],
    { w: W.medium, fill: '#f3ead4', hatch: 'wood' },
  );
  poly(
    v,
    [
      [-m(CORE_PLATE.thickness), -m(RI)],
      [0, -m(RI)],
      [0, m(RI)],
      [-m(CORE_PLATE.thickness), m(RI)],
    ],
    {
      w: W.medium,
      fill: STEEL,
      hatch: 'steel',
    },
  );
  v.center([-m(0.12), 0], [sx(xMax) + 10, 0], 0);

  // the modules of the three threads: the front half of the screw (z > 0) only, a quarter of a turn each, two tones in turn
  const psiMaxOf = (k: number): number => (TAU * xMax) / PITCH + (TAU * k) / THREADS;
  const bolts: Pt[] = [];
  const front: { k: number; j: number; a: number; b: number; i: number }[] = [];
  for (let k = 0; k < THREADS; k++) {
    modulesOf(k, psiMaxOf(k)).forEach((mod, i) => {
      if (Math.sin((mod.a + mod.b) / 2) > 0) front.push({ k, ...mod, i });
    });
  }
  for (const { k, j, a, b } of front) {
    const steps = 6;
    const hiPts: Pt[] = [];
    const loPts: Pt[] = [];
    for (let s = 0; s <= steps; s++) {
      const psi = a + ((b - a) * s) / steps;
      const c = Math.cos(psi);
      const x = xOf(k, psi);
      hiPts.push([m(x - T / 2), m(Math.max(RI * c, RO * c))]);
      loPts.push([m(x + T / 2), m(Math.min(RI * c, RO * c))]);
    }
    const xb = xOf(k, b);
    const cb = Math.cos(b);
    poly(v, [...hiPts, [m(xb + T / 2), m(Math.max(RI * cb, RO * cb))], ...loPts.reverse()], {
      w: W.thin,
      fill: j % 2 === 0 ? WOOD_A : WOOD_B,
      hatch: 'wood',
    });
    // the steel strip on the up-slope face of the module, along its root
    const strip: Pt[] = [];
    const strip2: Pt[] = [];
    for (let s = 0; s <= steps; s++) {
      const psi = a + ((b - a) * s) / steps;
      const x = xOf(k, psi) + T / 2;
      strip.push([m(x), m(RI * Math.cos(psi))]);
      strip2.push([m(x + ROOT_STRIP.width), m(RI * Math.cos(psi))]);
    }
    poly(v, [...strip, ...strip2.reverse()], { w: W.thin, fill: STEEL });
    // its bolts, evenly along the arc
    for (let i = 0; i < BOLTS_PER_MODULE; i++) {
      const psi = a + ((b - a) * (i + 0.5)) / BOLTS_PER_MODULE;
      bolts.push([m(xOf(k, psi) + T / 2 + ROOT_STRIP.width / 2), m((RI + ROOT_STRIP.thickness) * Math.cos(psi))]);
    }
  }
  for (const [bx, by] of bolts) v.circle([bx, by], m(BOLT.washer / 2), { w: W.thin, fill: STEEL });
  for (const [bx, by] of bolts) v.circle([bx, by], m(BOLT.acrossFlats / 2) * 0.9, { w: W.thin, fill: '#c9cdd2' });

  // the modules of one thread, numbered in the order they are met along the thread
  front
    .filter((f) => f.k === 0)
    .forEach((f) => {
      const mid = (f.a + f.b) / 2;
      const r = (RI + RO) / 2;
      const [qx, qy] = v.map([m(xOf(0, mid) - 0.02), m(r * Math.cos(mid))]);
      p.circle([qx, qy], 2, { w: W.thin, fill: COLORS.paper });
      p.text([qx, qy], String(f.i + 1), { size: 1.6, weight: 'bold', anchor: 'middle', baseline: 'middle' });
    });

  // ---- dimensions: the pitch (a thread's two successive tops), the spacing of the threads, the length of a module along the axis, the two diameters
  const topY = m(RO);
  v.dim([0, topY], [sx(PITCH), topY], -6, {
    dir: 'h',
    label: cat('S = ', labOf(dim('SCREW', 'pitch'), 2, '', ' m')),
    size: 1.9,
  });
  v.dim([sx(PITCH / 3), -topY], [sx((2 * PITCH) / 3), -topY], 5, {
    dir: 'h',
    label: cat('S/3 = ', labOf(dim('SCREW', 'bladeSpacing'), 2, '', ' m')),
    size: 1.9,
  });
  v.dim([sx(PITCH), -topY], [sx(PITCH + PITCH / MODULES_PER_TURN), -topY], 12, {
    dir: 'h',
    label: cat('S/', num(MODULES_PER_TURN), ' = ', lab(PITCH / MODULES_PER_TURN, 2, 'E', '', ' m')),
    size: 1.9,
  });
  v.dim([-m(0.1), -m(RI)], [-m(0.1), m(RI)], 0, {
    dir: 'v',
    label: cat('Ø', labOf(dim('SCREW', 'innerDiameter'), 2, '', ' m')),
    size: 1.9,
  });
  v.dim([-m(0.1), -m(RO)], [-m(0.1), m(RO)], -7, {
    dir: 'v',
    label: cat('Ø', labOf(dim('SCREW', 'outerDiameter'), 2, '', ' m')),
    size: 1.9,
  });

  // ---- balloons
  const first = front.find((f) => f.k === 0 && f.i >= 4)!;
  const mid = (first.a + first.b) / 2 + 0.25;
  const target: Pt = [m(xOf(0, mid)), m(((RI + RO) / 2) * Math.cos(mid))];
  const [fx, fy] = v.map(target);
  balloon(v, target, fx + 12, fy - 26, n('blade-module'));
  const bolt = bolts[Math.min(bolts.length - 1, 9)]!;
  const [bx, by] = v.map(bolt);
  balloon(v, bolt, bx - 8, by + 24, n('blade-fastener'));
  const [cx, cy] = v.map([m(0.5), -m(RI)]);
  balloon(v, [m(0.5), -m(RI) + 20], cx - 4, cy + 12, n('screw-core'));
}

// ------------------------------------------------------------------------------------------------ B: one thread, seen from the end

function endView(d: Drawing, v: View): void {
  const p = d.paper();
  const at = (r: number, psi: number): Pt => [m(r * Math.sin(psi)), m(r * Math.cos(psi))];
  const arc = (r: number, a0: number, a1: number, nn = 12): Pt[] =>
    Array.from({ length: nn + 1 }, (_, i) => at(r, a0 + ((a1 - a0) * i) / nn));
  // the core: a wooden tube, its end plate and the shaft
  v.circle([0, 0], m(RI), { w: W.medium, fill: '#f3ead4', hatch: 'wood' });
  v.circle([0, 0], m(RI - WALL), { w: W.medium, fill: COLORS.paper });
  v.circle([0, 0], m(RI * 0.2), { w: W.medium, fill: STEEL, hatch: 'steel' });
  v.circle([0, 0], m(RO), { w: W.thin, color: INK_2, dash: 'phantom', fill: 'none' });
  // the four modules of one turn of thread 1, as the quarter rings that they cover: alternate tones, joints on the same four radii for the three threads
  const dpsi = TAU / MODULES_PER_TURN;
  for (let q = 0; q < MODULES_PER_TURN; q++) {
    const a = q * dpsi + 0.002 / RO;
    const b = (q + 1) * dpsi - 0.002 / RO;
    poly(v, [...arc(RO, a, b), ...arc(RI, b, a)], { w: W.medium, fill: q % 2 === 0 ? WOOD_A : WOOD_B, hatch: 'wood' });
    for (let i = 0; i < BOLTS_PER_MODULE; i++) {
      const psi = a + ((b - a) * (i + 0.5)) / BOLTS_PER_MODULE;
      v.circle(at(RI + ROOT_STRIP.thickness + 0.016, psi), m(BOLT.washer / 2), { w: W.thin, fill: STEEL });
    }
  }
  // the radii of the joints, shared by the three threads
  for (let q = 0; q < MODULES_PER_TURN; q++)
    v.polyline([at(RI * 0.5, q * dpsi), at(RO + 0.07, q * dpsi)], { w: W.thin, color: INK_2, dash: 'center' });
  // where the three threads start at the end of the core: 120° apart
  for (let k = 0; k < THREADS; k++) {
    const psi = (TAU * k) / THREADS;
    v.polyline([at(RI, psi), at(RO + 0.02, psi)], { w: W.thick, color: k === 0 ? COLORS.ink : COLORS.copper });
    const [tx, ty] = v.map(at(RO + 0.055, psi + 0.14));
    p.text([tx, ty], cat(l('filet ', 'thread '), num(k + 1)), {
      size: 1.7,
      anchor: 'middle',
      baseline: 'middle',
      color: k === 0 ? COLORS.ink : COLORS.copper,
      halo: true,
    });
  }
  // the angle of a module, and the sense of rotation
  const ea = v.polyline(arc(RO + 0.035, 0, dpsi, 16), { w: W.thin });
  ea.setAttribute('marker-start', 'url(#arrow)');
  ea.setAttribute('marker-end', 'url(#arrow)');
  const [lx, ly] = v.map(at(RO + 0.035, dpsi / 2));
  p.text([lx + 2, ly - 2], lab(360 / MODULES_PER_TURN, 0, 'E', '', '°'), { size: 1.9, mono: true, halo: true });
  const rot = v.polyline(arc(RI * 0.62, 20 * DEG, 100 * DEG, 16), { w: W.medium, color: COLORS.copper });
  rot.setAttribute('marker-end', 'url(#arrow)');
  // balloons
  const bl = (id: string, target: Pt, bx: number, by: number): void => balloon(v, target, bx, by, n(id));
  bl('blade-module', at((RI + RO) / 2, 1.2 * dpsi), 300, 118);
  bl('blade-fastener', at(RI + ROOT_STRIP.thickness + 0.016, (MODULES_PER_TURN - 1) * dpsi + dpsi * 0.75), 230, 112);
  bl('screw-core', at(RI - WALL / 2, 3.4 * dpsi), 232, 22);
}

// ------------------------------------------------------------------------------------------------ C: the section of a blade at its root

function sectionC(d: Drawing, v: View): void {
  const p = d.paper();
  const gap = S.outerDiameter > 0 ? dim('SCREW', 'gap').v : 0;
  const k = hardwareScale(S.outerDiameter);
  const wallT = TROUGH.wall * k;
  const xL = -0.045;
  const xR = 0.1;
  const rect = (x0: number, y0: number, x1: number, y1: number, s: Stroke): void => {
    poly(
      v,
      [
        [m(x0), m(y0)],
        [m(x1), m(y0)],
        [m(x1), m(y1)],
        [m(x0), m(y1)],
      ],
      s,
    );
  };
  // radial heights from the inner face of the core wall (y = 0) outwards
  const yCore0 = 0;
  const yCore1 = WALL;
  const yTip = WALL + (RO - RI);
  const yTrough0 = yTip + gap;
  const yTrough1 = yTrough0 + wallT;
  // the trough, the core wall, the blade, with the steel angle on its up-slope face
  rect(xL, yTrough0, xR, yTrough1, { w: W.medium, fill: FILL.concrete, hatch: 'earth' });
  rect(xL, yCore0, xR, yCore1, { w: W.medium, fill: '#f3ead4', hatch: 'wood' });
  rect(-T / 2, yCore1, T / 2, yTip, { w: W.medium, fill: WOOD_A, hatch: 'wood' });
  const rw = ROOT_STRIP.width;
  const tw = ROOT_STRIP.thickness;
  const x1 = T / 2;
  poly(
    v,
    [
      [m(x1), m(yCore1)],
      [m(x1 + rw), m(yCore1)],
      [m(x1 + rw), m(yCore1 + tw)],
      [m(x1 + tw), m(yCore1 + tw)],
      [m(x1 + tw), m(yCore1 + rw)],
      [m(x1), m(yCore1 + rw)],
    ],
    { w: W.medium, fill: STEEL, hatch: 'steel' },
  );
  // the bolt: a shank through the strip and the core wall, a washer and a hex head on the strip, a washer and a nut inside the tube
  const bx = T / 2 + rw / 2 + 0.006;
  const sh = BOLT.shank / 2;
  rect(bx - sh, yCore0 - BOLT.washerThickness - BOLT.head, bx + sh, yCore1 + tw + BOLT.washerThickness, {
    w: W.thin,
    fill: STEEL,
  });
  rect(bx - BOLT.washer / 2, yCore1 + tw, bx + BOLT.washer / 2, yCore1 + tw + BOLT.washerThickness, {
    w: W.thin,
    fill: STEEL,
  });
  rect(
    bx - BOLT.acrossFlats / 2,
    yCore1 + tw + BOLT.washerThickness,
    bx + BOLT.acrossFlats / 2,
    yCore1 + tw + BOLT.washerThickness + BOLT.head,
    { w: W.medium, fill: STEEL, hatch: 'steel' },
  );
  rect(bx - BOLT.washer / 2, yCore0 - BOLT.washerThickness, bx + BOLT.washer / 2, yCore0, { w: W.thin, fill: STEEL });
  rect(
    bx - BOLT.acrossFlats / 2,
    yCore0 - BOLT.washerThickness - BOLT.head,
    bx + BOLT.acrossFlats / 2,
    yCore0 - BOLT.washerThickness,
    { w: W.medium, fill: STEEL, hatch: 'steel' },
  );
  v.center([m(bx), m(yCore0 - 0.03)], [m(bx), m(yCore1 + 0.08)], 0);
  // the water on the up-slope side of the blade is the pocket
  rect(x1 + 0.0005, yCore1 + 0.0005, xR, yTip, { w: 0, fill: FILL.water, hatch: 'water', opacity: 0.55 });
  // dimensions: the thickness of the blade (arrows outside), the core wall, the height of the blade, the gap
  const [e0, ey] = v.map([-m(T / 2), m(yTip * 0.55)]);
  const [e1] = v.map([m(T / 2), 0]);
  gapDim(p, e0, e1, ey, lab(T * 1000, 1, 'E', '', ' mm'), 'left');
  v.dim([m(xL), m(yCore1)], [m(xL), m(yCore0)], -4, {
    dir: 'v',
    label: lab(WALL * 1000, 0, 'E', '', ' mm'),
    size: 1.7,
  });
  v.dim([m(xL), m(yTip)], [m(xL), m(yCore1)], -4, {
    dir: 'v',
    label: lab((RO - RI) * 1000, 0, 'D', '', ' mm'),
    size: 1.7,
  });
  const gx = 0.05;
  const [qx, qy] = v.map([m(gx), m(yTip + gap / 2)]);
  p.circle([qx, qy], 0.7, { w: W.thin, color: COLORS.red });
  p.line([qx, qy + 0.7], [qx, qy + 9], { w: W.thin, color: COLORS.red });
  p.text([qx, qy + 11], cat(l('jeu ', 'gap '), figLab('gapMm', '', ' mm')), {
    size: 1.7,
    anchor: 'middle',
    baseline: 'middle',
    color: COLORS.red,
    weight: 'bold',
    halo: true,
  });
  p.text([qx, qy + 14.5], cat(num(GAP_COEFF, 4), ' × √D'), {
    size: 1.4,
    anchor: 'middle',
    baseline: 'middle',
    color: COLORS.red,
    halo: true,
  });
  // balloons, on the right
  const bl = (id: string, target: Pt, x: number, y: number): void =>
    balloon(v, [m(target[0]), m(target[1])], x, y, n(id));
  bl('blade-module', [0.003, yTip * 0.78], 398, 62);
  bl('trough', [xR - 0.02, yTrough0 + wallT / 2], 398, 32);
  bl('trapped-water', [bx + 0.03, yTip * 0.55], 398, 96);
  bl('blade-fastener', [bx + 0.004, yCore1 + tw + BOLT.washerThickness + BOLT.head / 2], 398, 138);
  bl('screw-core', [xR - 0.02, yCore1 / 2], 398, 170);
}

// ------------------------------------------------------------------------------------------------ the tables

function geometryTable(d: Drawing, x: number, y: number): number {
  const slope = labOf(dim('SCREW', 'slopeDeg'), 0, '', '°');
  const rows: [L, L, L][] = [
    [l('Filets', 'Threads'), num(dim('SCREW', 'threads').v), l('trois, comme dans la vidéo', 'three, as in the video')],
    [
      l('Diamètre extérieur D', 'Outer diameter D'),
      labOf(dim('SCREW', 'outerDiameter'), 2, '', ' m'),
      l('poches pleines à la vitesse de la règle', 'full pockets at the rule speed'),
    ],
    [
      l('Diamètre du noyau d', 'Core diameter d'),
      labOf(dim('SCREW', 'innerDiameter'), 2, '', ' m'),
      l('l’optimum pour trois filets', 'the optimum for three threads'),
    ],
    [l('Pas S', 'Pitch S'), labOf(dim('SCREW', 'pitch'), 2, '', ' m'), l('égal à D', 'equal to D')],
    [l('Pente', 'Slope'), slope, l('l’angle le plus courant', 'the most common angle')],
    [l('Poche pleine', 'Full pocket'), figLab('bucketL', '', ' L'), l('entre deux pales', 'between two blades')],
    [
      l('Jeu pale-auge', 'Blade-trough gap'),
      figLab('gapMm', '', ' mm'),
      l('règle de calcul publiée', 'published design rule'),
    ],
    [
      l('Épaisseur d’une pale', 'Thickness of a blade'),
      lab(T * 1000, 1, 'E', '', ' mm'),
      l('choix du dessin', 'a choice of the drawing'),
    ],
    [
      l('Paroi du noyau', 'Core wall'),
      lab(WALL * 1000, 0, 'E', '', ' mm'),
      l('choix du dessin', 'a choice of the drawing'),
    ],
    [
      l('Longueur des filets', 'Length of the threads'),
      labOf(dim('SCREW', 'length'), 2, '', ' m'),
      l('la hauteur de chute sur le sinus de la pente', 'the head over the sine of the slope'),
    ],
  ];
  return grid(
    d,
    x,
    y,
    [
      { label: l('Grandeur', 'Quantity'), w: 38 },
      { label: l('Valeur', 'Value'), w: 22, align: 'end', mono: true },
      { label: l('D’où elle vient', 'Where it comes from'), w: 78 },
    ],
    rows.map(([a, b, c]) => [{ t: a, bold: true }, b, c]),
    { size: 1.65, pad: 0.4, lineH: 2.6 },
  );
}

function modulesTable(d: Drawing, x: number, y: number): number {
  const c = counts();
  const mm = (v: number): L => lab(v * 1000, 0, 'E', '', ' mm');
  const rows: [L, L][] = [
    [l('Modules par tour d’un filet', 'Modules per turn of a thread'), num(MODULES_PER_TURN)],
    [l('Modules dans toute la vis', 'Modules in the whole screw'), lab(c.modules, 0, 'E', '≈ ')],
    [l('Boulons par module', 'Bolts per module'), lab(BOLTS_PER_MODULE, 0, 'E')],
    [l('Boulons dans toute la vis', 'Bolts in the whole screw'), lab(c.bolts, 0, 'E', '≈ ')],
    [l('Boulon : tige', 'Bolt: shank'), cat('Ø', mm(BOLT.shank))],
    [
      l('Boulon : tête (sur plats), hauteur', 'Bolt: head (across flats), height'),
      cat(mm(BOLT.acrossFlats), ' · ', mm(BOLT.head)),
    ],
    [
      l('Rondelle : diamètre, épaisseur', 'Washer: diameter, thickness'),
      cat('Ø', mm(BOLT.washer), ' · ', mm(BOLT.washerThickness)),
    ],
    [
      l('Cornière : largeur, épaisseur', 'Angle: width, thickness'),
      cat(mm(ROOT_STRIP.width), ' · ', mm(ROOT_STRIP.thickness)),
    ],
    [l('Plaque d’extrémité du noyau', 'End plate of the core'), mm(CORE_PLATE.thickness)],
  ];
  return grid(
    d,
    x,
    y,
    [
      { label: l('Découpage et fixation (le dessin)', 'Cutting and fastening (the drawing)'), w: 74 },
      { label: l('Valeur', 'Value'), w: 36, align: 'end', mono: true },
    ],
    rows.map(([a, b]) => [a, b]),
    { size: 1.65, pad: 0.4, lineH: 2.6 },
  );
}

/** What the model says about the gap (the figures of figures.ts, recomputed by the test from src/sim). */
function gapCard(d: Drawing, x: number, y: number, w: number): void {
  const p = d.paper();
  modelTag(d, x, y, w);
  const rows: [L, L][] = [
    [
      l('fuite par le jeu', 'leak through the gap'),
      cat(figLab('qGapLs', '', ' L/s'), ' · ', figLab('lossGapW', '', ' W')),
    ],
    [l('rendement de la vis, jeu de la règle', 'screw efficiency, gap of the rule'), figLab('etaScrew', '', ' %')],
    [l('avec un jeu moitié moindre', 'with half the gap'), figLab('gap05Eff', '', ' %')],
    [l('avec un jeu double', 'with twice the gap'), figLab('gap2Eff', '', ' %')],
    [l('avec un jeu quadruple', 'with four times the gap'), figLab('gap4Eff', '', ' %')],
  ];
  const yy = y + 8.5;
  rows.forEach(([name, val], i) => {
    p.text([x + 1.5, yy + i * 4.4], name, { size: 1.65, baseline: 'middle' });
    p.text([x + w - 1.5, yy + i * 4.4], val, {
      size: 1.9,
      anchor: 'end',
      baseline: 'middle',
      mono: true,
      weight: 'bold',
      color: RED,
    });
  });
  p.rect([x, y + 5.2], [x + w, yy + rows.length * 4.4 - 1.5], { w: W.thin, color: RED });
}

// ------------------------------------------------------------------------------------------------ the sheet

function render(): Drawing {
  const d = new Drawing();
  const A = LAYOUT.A;
  const B = LAYOUT.B;
  const C = LAYOUT.C;
  d.frame({
    title: TITLE,
    subtitle: l(
      'Les modules d’un filet, les trois filets sur le noyau, la coupe d’une pale · règles de calcul publiées',
      'The modules of a thread, the three threads on the core, a blade in section · published design rules',
    ),
    number: NUMBER,
    scale: `${scaleText(A.scale)} · ${scaleText(C.scale)}`,
  });

  heading(
    d,
    14,
    13,
    l('A · LE NOYAU ET SES TROIS FILETS, vus de côté', 'A · THE CORE AND ITS THREE THREADS, from the side'),
    { size: 2.2 },
  );
  sideView(d, d.view(A.ox, A.oy, 1 / A.scale));
  caption(d, 118, 135, l('VUE DE CÔTÉ, DEMI-FACE AVANT', 'SIDE VIEW, FRONT HALF'), scaleText(A.scale));

  heading(d, 216, 13, l('B · UN TOUR DE FILET, vu du bout', 'B · ONE TURN OF A THREAD, from the end'), { size: 2.2 });
  endView(d, d.view(B.ox, B.oy, 1 / B.scale));
  caption(d, 268, 135, l('VUE DU BOUT', 'END VIEW'), scaleText(B.scale));

  heading(d, 322, 13, l('C · UNE PALE À SA RACINE', 'C · A BLADE AT ITS ROOT'), { size: 2.2 });
  sectionC(d, d.view(C.ox, C.oy, 1 / C.scale));
  caption(d, 366, 193, l('COUPE RADIALE', 'RADIAL SECTION'), scaleText(C.scale));

  heading(d, 14, 147, l('D · LA GÉOMÉTRIE DU FILET', 'D · THE GEOMETRY OF THE THREAD'), { size: 2 });
  geometryTable(d, 14, 152);
  heading(d, 160, 147, l('E · LES MODULES ET LEURS BOULONS', 'E · THE MODULES AND THEIR BOLTS'), { size: 2 });
  modulesTable(d, 160, 152);

  heading(d, 322, 199, l('REPÈRES · pièces représentées', 'ITEMS · parts shown'), { size: 2 });
  grid(
    d,
    322,
    203,
    [
      { label: l('Rep.', 'Item'), w: 8, align: 'middle' },
      { label: l('Désignation', 'Part'), w: 76 },
    ],
    ITEMS.map((id, i) => [{ t: String(i + 1), bold: true }, partOf(id).name]),
    { size: 1.7, pad: 0.4, lineH: 2.6 },
  );
  gapCard(d, 14, 198, 126);
  marksLegend(d, 146, 198, 84);
  box(
    d,
    14,
    248,
    192,
    l('LIRE LA PLANCHE', 'READING THE SHEET'),
    [
      {
        bullet: '1',
        t: l(
          'Le dessin coupe chaque filet en modules d’un quart de tour, vissés sur le noyau par une cornière d’acier ; dans la vidéo, un module porte les trois filets sur une tranche du noyau. Les joints sont sur les mêmes quatre rayons pour les trois filets. En A, on ne voit que la moitié avant de la vis : les modules du premier filet sont numérotés, ceux de derrière manquent.',
          'The drawing cuts each thread in modules of a quarter turn, bolted on the core through a steel angle; in the video, a module carries the three threads on one slice of the core. The joints are on the same four radii for the three threads. In A, only the front half of the screw is seen: the modules of the first thread are numbered, those behind are missing.',
        ),
      },
      { bullet: '2', t: EDU_NOTE },
    ],
    { size: 1.7 },
  );
  return d;
}

export const bladeModule: DrawingSheet = {
  id: 'blade-module',
  number: NUMBER,
  group: 'screw',
  title: TITLE,
  description: l(
    'Les trois filets de la vis sont découpés en modules de bois d’un quart de tour, chacun vissé sur le noyau par une cornière d’acier et deux boulons. La vue de côté montre les modules de chaque filet sur le noyau, la vue du bout un tour de filet et ses joints, la coupe radiale une pale à sa racine avec son boulon et son jeu avec l’auge. Les dimensions sont dérivées de règles de calcul publiées ou estimées ; ce n’est pas un plan de construction.',
    'The three threads of the screw are cut in wooden modules of a quarter turn, each bolted on the core through a steel angle and two bolts. The side view shows the modules of each thread on the core, the end view one turn of a thread and its joints, the radial section a blade at its root with its bolt and its gap to the trough. The dimensions are derived from published design rules or estimated; this is not a construction plan.',
  ),
  scene: 'screw',
  parts: ITEMS,
  render,
};
