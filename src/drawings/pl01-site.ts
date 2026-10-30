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
import { partIds } from '../part-ids';
import { DESIGN_SHAPE } from '../three/dims';
import { EDU_NOTE, FILL, arrow, balloon, box, caption, grid, heading, marksLegend, poly } from './draw';
import { TAILRACE_REAL_M, cat, dim, figLab, lab, labOf, labX, num, scaleText } from './geom';
import { frameOf, world } from './frame';

const NUMBER = 'PL-01';
const TITLE = l('Le bief du moulin : plan et profil', 'The mill race: plan and profile');

/** The twelve parts of the `site` world, in the order of the catalogue (the item numbers of this sheet). */
export const ITEMS = partIds('site');
const n = (id: string): number => ITEMS.indexOf(id) + 1;
const partOf = (id: string) => PARTS.find((p) => p.id === id)!;

/** Where the views stand on the sheet: the horizontal scale (1:n), the paper position (mm) of the site origin, the window of the plan (m), and the scale of the levels. */
export const LAYOUT = {
  /** The plan: x = 0 and z = 0 of the site at (ox, oy). */
  PLAN: { scale: 300, ox: 156, oy: 108.3, x0: -42, x1: 30, z0: -26.5, z1: 14.5 },
  /** The profile of the race: same horizontal scale, aligned with the plan, the level 0 at paper y `oy`; 1 m of level is `mmPerM` paper mm. */
  PROFILE: { scale: 300, ox: 156, oy: 184, mmPerM: 10 },
  /** The weir and the fish pass: sections along the river at 1:200, the level 0 at paper y `oy`; 1 m of level is `mmPerM` paper mm; `x` is the site x at the left edge. */
  WEIR: { scale: 200, ox: 236, oy: 44, mmPerM: 10, x: 6 },
  PASS: { scale: 200, ox: 306, oy: 44, mmPerM: 10, x: 8 },
} as const;

const sx = (key: string, ...sub: (string | number)[]): number => dim('SITE', key, ...sub).v;
const RIVER = {
  zN: sx('river', 'zNorth'),
  zS: sx('river', 'zSouth'),
  bedUp: sx('river', 'bedUpY'),
  bedDown: sx('river', 'bedDownY'),
};
const WEIR = { x: sx('weir', 'x'), t: sx('weir', 'thickness'), crest: sx('weir', 'crestY') };
const NOTCH = { w: sx('notch', 'width'), d: sx('notch', 'depth'), z: sx('notch', 'z') };
const PASS = {
  z: sx('fishPass', 'z'),
  xW: sx('fishPass', 'xWest'),
  xE: sx('fishPass', 'xEast'),
  pools: sx('fishPass', 'pools'),
};
const CANAL = {
  xMax: sx('canal', 'xMax'),
  xMin: sx('canal', 'xMin'),
  zN: sx('canal', 'zNorth'),
  zS: sx('canal', 'zSouth'),
  bed: sx('canal', 'bedY'),
  mouth: sx('canal', 'mouthX'),
};
const RACK = {
  x: sx('rack', 'x'),
  spacing: sx('rack', 'spacing'),
  height: sx('rack', 'height'),
  tilt: sx('rack', 'tilt'),
};
const GATE = { x: sx('gate', 'x'), height: sx('gate', 'height') };
const CH = {
  xW: sx('chamber', 'xWest'),
  xE: sx('chamber', 'xEast'),
  floor: sx('chamber', 'floorY'),
  lowerEnd: sx('chamber', 'lowerEnd'),
};
const TAIL = {
  len: sx('tailrace', 'length'),
  width: sx('tailrace', 'width'),
  bed: sx('tailrace', 'bedY'),
  xEnd: sx('tailrace', 'xEnd'),
};
const GROUND = sx('groundY');
const TAIL_Y = sx('tailY');
const GROUND_BOTTOM = sx('ground', 'bottomY');
const MILL = { l: sx('mill', 'length'), w: sx('mill', 'width'), x: sx('mill', 'x'), z: sx('mill', 'z') };
const PH = {
  l: sx('powerhouse', 'length'),
  w: sx('powerhouse', 'width'),
  x: sx('powerhouse', 'x'),
  z: sx('powerhouse', 'z'),
};
const HOUSE = { l: sx('house', 'length'), w: sx('house', 'width'), x: sx('house', 'x'), z: sx('house', 'z') };
/** Height of each step of the fish pass, m: the weir crest to the tailwater over the number of pools (as the 3D builds it). */
const PASS_STEP = (WEIR.crest - TAIL_Y) / PASS.pools;

const concrete: Stroke = { w: W.medium, fill: FILL.concrete, hatch: 'earth' };
const waterFill: Stroke = { w: 0, fill: FILL.water, hatch: 'water' };
const levelL = (v: number): L => lab(v, 2, 'E', '', ' m');
/** The upstream level is the datum (0): a definition, no mark. */
const datumL = (): L => lab(0, 2, null, '', ' m');

// ------------------------------------------------------------------------------------------------ A: the plan

/** A point of the site (x east, z south, metres) as a model coordinate of the plan (north is up). */
const PL = (x: number, z: number): Pt => [x * 1000, -z * 1000];
const rectPlan = (v: View, x0: number, x1: number, z0: number, z1: number, s: Stroke): void => {
  v.rect(PL(x0, z0), PL(x1, z1), s);
};

function plan(d: Drawing, v: View): void {
  const p = d.paper();
  const P = LAYOUT.PLAN;
  const zc = (CANAL.zN + CANAL.zS) / 2;
  const f = frameOf(DESIGN_SHAPE);
  // the land and the river
  rectPlan(v, P.x0, P.x1, P.z0, P.z1, { w: W.thin, fill: FILL.earth });
  rectPlan(v, P.x0, P.x1, RIVER.zN, RIVER.zS, { w: W.medium, fill: FILL.water });
  for (const x of [26, -6, -30]) {
    const [ax, ay] = v.map(PL(x, 2.2));
    arrow(p, [ax + 6, ay], [ax - 6, ay], COLORS.water, W.medium);
  }
  // headrace from the mouth to the chamber, its bay open on the river
  rectPlan(v, CANAL.xMin, CANAL.xMax, CANAL.zN, CANAL.zS, { w: W.medium, fill: FILL.water });
  rectPlan(v, CANAL.mouth, CANAL.xMax, CANAL.zS, RIVER.zN, { w: 0, fill: FILL.water });
  v.line(PL(CANAL.xMax, CANAL.zS), PL(CANAL.xMax, CANAL.zN), { w: W.medium });
  v.line(PL(CANAL.xMax, CANAL.zS), PL(CANAL.xMax, RIVER.zN), { w: W.thin });
  // the weir across the river, its notch, the fish pass against the south bank
  rectPlan(v, WEIR.x - WEIR.t / 2, WEIR.x + WEIR.t / 2, RIVER.zN, PASS.z, concrete);
  rectPlan(v, WEIR.x - WEIR.t / 2 - 0.1, WEIR.x + WEIR.t / 2 + 0.1, NOTCH.z - NOTCH.w / 2, NOTCH.z + NOTCH.w / 2, {
    w: W.thin,
    fill: FILL.water,
  });
  const dx = (PASS.xE - PASS.xW) / PASS.pools;
  rectPlan(v, PASS.xW, PASS.xE, PASS.z, PASS.z + 0.15, { w: W.thin, fill: FILL.concrete });
  for (let i = 0; i < PASS.pools; i++) {
    const xe = PASS.xE - i * dx;
    rectPlan(v, xe - dx, xe, PASS.z + 0.15, RIVER.zS, { w: W.thin, fill: FILL.water });
    v.line(PL(xe, PASS.z + 0.15), PL(xe, RIVER.zS), { w: W.medium });
  }
  // the trash rack at the head of the canal and the head gate
  const zr0 = CANAL.zN + 0.15;
  const zr1 = CANAL.zS - 0.15;
  v.line(PL(RACK.x, zr0), PL(RACK.x, zr1), { w: 1.3, dash: [0.5, 0.45], color: COLORS.ink });
  v.line(PL(GATE.x, zr0), PL(GATE.x, zr1), { w: W.thick * 1.6, color: COLORS.red });
  for (const z of [zr0 - 0.2, zr1 + 0.2])
    v.rect(PL(GATE.x - 0.3, z - 0.3), PL(GATE.x + 0.3, z + 0.3), { w: W.thin, fill: FILL.concrete });
  // the water chamber: the pit, the screw in it, its drive on the north bank
  const xLow = CH.xW + CH.lowerEnd;
  const xTop = xLow + f.L * f.cosB;
  rectPlan(v, CH.xW, CH.xE, CANAL.zN, CANAL.zS, { w: W.thick, fill: FILL.water });
  rectPlan(v, xLow - 0.05, xTop + 0.05, zc - f.Ro, zc + f.Ro, { w: W.medium, fill: FILL.concrete });
  rectPlan(v, xLow, xTop, zc - f.ro, zc + f.ro, { w: W.thin, fill: FILL.wood, hatch: 'wood' });
  const bx = xTop + 0.85;
  rectPlan(v, bx - 0.35, bx + 0.35, CANAL.zN - 0.8, CANAL.zN - 0.2, {
    w: W.medium,
    fill: '#2f5d7c',
    color: COLORS.ink,
  });
  v.line(PL(bx, zc), PL(bx, CANAL.zN - 0.2), { w: W.thin });
  // the tailrace, drawn shortened (with its break), then the turn to the river
  rectPlan(v, TAIL.xEnd, CH.xW, CANAL.zN, CANAL.zS, { w: W.medium, fill: FILL.water });
  rectPlan(v, TAIL.xEnd, TAIL.xEnd + TAIL.width, CANAL.zS, RIVER.zN, { w: W.medium, fill: FILL.water });
  const xb = (CH.xW + TAIL.xEnd) / 2;
  v.rect(PL(xb - 0.9, CANAL.zS + 0.15), PL(xb + 0.9, CANAL.zN - 0.15), { w: 0, fill: FILL.earth });
  for (const dxb of [-0.9, 0.9]) {
    const pts: Pt[] = [];
    [CANAL.zN - 0.3, zc - 1.1, zc + 1.1, CANAL.zS + 0.3].forEach((z, i) =>
      pts.push(PL(xb + dxb + (i % 2 ? 0.35 : -0.35), z)),
    );
    v.polyline(pts, { w: W.medium, color: COLORS.ink });
  }
  // the buildings and the line of the current (scenery of the 3D world)
  const bld = (b: { l: number; w: number; x: number; z: number }, fill: string, ridge = true): void => {
    rectPlan(v, b.x - b.l / 2, b.x + b.l / 2, b.z - b.w / 2, b.z + b.w / 2, { w: W.medium, fill });
    if (ridge) v.line(PL(b.x - b.l / 2, b.z), PL(b.x + b.l / 2, b.z), { w: W.thin });
  };
  bld(MILL, FILL.roof);
  bld(PH, FILL.steel, false);
  bld(HOUSE, FILL.roof);
  v.polyline(
    [PL(bx, CANAL.zN - 0.8), PL(PH.x, PH.z + PH.w / 2), PL(PH.x + PH.l / 2, PH.z), PL(HOUSE.x, HOUSE.z + HOUSE.w / 2)],
    {
      w: W.medium,
      color: COLORS.copper,
      dash: 'hidden',
    },
  );
  // the sense of the water: in the canal, at the notch
  const [cx, cy] = v.map(PL(1.5, zc));
  arrow(p, [cx + 9, cy], [cx - 9, cy], COLORS.water, W.medium);
  const [nx, ny] = v.map(PL(WEIR.x - 1.6, NOTCH.z));
  arrow(p, [nx + 6, ny], [nx - 1, ny], COLORS.water, W.medium);
  // the notice of the shortened tailrace, and the length drawn
  const [tx, ty] = v.map(PL(xb + 5, CANAL.zS + 2.1));
  p.text(
    [tx, ty],
    cat(
      l('abrégé : ', 'shortened: '),
      lab(TAIL.len, 1, 'E', '', ' m'),
      l(' ici, ≈ ', ' here, ≈ '),
      lab(TAILRACE_REAL_M, 0, null),
      l(' m en réalité', ' m in reality'),
    ),
    {
      size: 1.7,
      anchor: 'middle',
      baseline: 'middle',
      color: COLORS.red,
      halo: true,
    },
  );
  // the line of the current, from the drive of the screw to the powerhouse and the house
  const [lx, ly] = v.map(PL(PH.x + 7.4, PH.z - 0.9));
  p.text([lx, ly], l('ligne électrique', 'power line'), { size: 1.7, color: COLORS.copper, baseline: 'middle' });
  // the length of the canal, between the mouth and the chamber (north bank)
  v.dim(PL(CANAL.xMin, CANAL.zN), PL(CANAL.xMax, CANAL.zN), -6, {
    dir: 'h',
    label: lab(CANAL.xMax - CANAL.xMin, 1, 'E', '', ' m'),
    size: 1.9,
  });
  northAndScale(d, 24, 30);
  // the names of what is drawn large enough to carry one
  const name = (id: string, at: Pt, color: string = COLORS.ink): void => {
    const [qx, qy] = v.map(at);
    p.text([qx, qy], partOf(id).name, { size: 1.8, anchor: 'middle', baseline: 'middle', color, weight: 'bold' });
  };
  name('mill-building', PL(MILL.x + 2, MILL.z + 1.6));
  name('house-load', PL(HOUSE.x, HOUSE.z + 1.2));
  name('river', PL(-22, 7.6), COLORS.water);
  name('headrace', PL(9.6, zc), COLORS.water);
  name('tailrace', PL(-21, zc), COLORS.water);
  // balloons
  const bl = (id: string, target: Pt, dxp: number, dyp: number): void => {
    const [tx2, ty2] = v.map(target);
    balloon(v, target, tx2 + dxp, ty2 + dyp, n(id));
  };
  bl('river', PL(-14, 4.5), 0, 9);
  bl('weir', PL(WEIR.x, 3.2), 9, -4);
  bl('headrace', PL(2, zc), 0, 21);
  bl('trash-rack', PL(RACK.x, zc - 0.7), 6, -15);
  bl('intake-gate', PL(GATE.x, zc - 0.9), -5, 15);
  bl('reserved-flow-notch', PL(WEIR.x - WEIR.t / 2, NOTCH.z), -10, 7);
  bl('fish-pass', PL((PASS.xE + PASS.xW) / 2 + 2.2, RIVER.zS - 0.4), 12, 2);
  bl('water-chamber', PL(xLow + 2.1, zc + 1.0), 0, 14);
  bl('tailrace', PL(-35, -2), 10, 4);
  bl('mill-building', PL(MILL.x - 4, MILL.z), -8, -9);
  bl('powerhouse', PL(PH.x, PH.z - PH.w / 2), 7, -8);
  bl('house-load', PL(HOUSE.x - HOUSE.l / 2, HOUSE.z), -10, 0);
}

/** North arrow and a scale bar of 10 and 20 m at the scale of the plan. */
function northAndScale(d: Drawing, x: number, y: number): void {
  const p = d.paper();
  p.line([x, y + 11], [x, y], { w: W.medium });
  p.polyline(
    [
      [x - 2, y + 4],
      [x, y - 1],
      [x + 2, y + 4],
    ],
    { w: W.medium, closed: true, fill: COLORS.ink },
  );
  p.text([x, y - 4.2], 'N', { size: 3, weight: 'bold', anchor: 'middle' });
  const per10 = 10000 / LAYOUT.PLAN.scale;
  const x0 = x + 9;
  const y0 = y + 6;
  for (let i = 0; i < 2; i++)
    p.rect([x0 + i * per10, y0], [x0 + (i + 1) * per10, y0 + 1.6], {
      w: W.thin,
      fill: i % 2 ? COLORS.paper : COLORS.ink,
    });
  for (const [i, t] of [0, 10, 20].entries())
    p.text([x0 + i * per10, y0 + 5.4], String(t), { size: 1.8, anchor: 'middle', mono: true });
  p.text([x0 + 2 * per10 + 3.5, y0 + 5.4], 'm', { size: 1.8, mono: true });
}

// ------------------------------------------------------------------------------------------------ B: the profile of the race

function profile(d: Drawing, v: View): void {
  const p = d.paper();
  const P = LAYOUT.PROFILE;
  const k = P.mmPerM * P.scale; // model mm per metre of level: 1 m of level is `mmPerM` paper mm
  const Q = (x: number, lv: number): Pt => [x * 1000, lv * k];
  const f = frameOf(DESIGN_SHAPE);
  const x0 = LAYOUT.PLAN.x0;
  const x1 = LAYOUT.PLAN.x1;
  const R = (a: number, b: number, c: number, e: number, s: Stroke): void => {
    v.rect(Q(a, c), Q(b, e), s);
  };
  // the ground, cut by the channels
  R(x0, x1, GROUND_BOTTOM, GROUND, { w: W.thin, fill: FILL.earth, hatch: 'earth' });
  R(CANAL.xMin, CANAL.xMax, CANAL.bed, GROUND + 0.02, { w: 0, fill: COLORS.paper });
  R(CH.xW, CH.xE, CH.floor, GROUND + 0.02, { w: 0, fill: COLORS.paper });
  R(TAIL.xEnd, CH.xW, TAIL.bed, GROUND + 0.02, { w: 0, fill: COLORS.paper });
  R(x0, TAIL.xEnd, RIVER.bedDown, GROUND + 0.02, { w: 0, fill: COLORS.paper });
  // the water: the canal at the upstream level (0), the tailwater in the outlet pool, the tailrace and the river below
  R(CANAL.xMin, CANAL.xMax, CANAL.bed, 0, waterFill);
  R(x0, TAIL.xEnd, RIVER.bedDown, TAIL_Y, waterFill);
  R(TAIL.xEnd, CH.xW, TAIL.bed, TAIL_Y, waterFill);
  R(CH.xW, CH.xW + CH.lowerEnd + 0.6, CH.floor, TAIL_Y, waterFill);
  // the screw in its chamber: its trough, its envelope and its axis, at the true slope of the world frame and the levels exaggerated like the rest
  const y0s = TAIL_Y + (f.y0 - f.tailY);
  const xLow = CH.xW + CH.lowerEnd;
  const at = (s: number, yp: number): Pt => {
    const [wx, wy] = world(f, s, yp);
    return Q(xLow + wx, wy - f.y0 + y0s);
  };
  // the water of the inlet basin: between the upper end of the flights and the east wall of the pit, at the level of the canal
  const xTop = xLow + f.L * f.cosB;
  poly(v, [at(f.L, -f.Rt), at(f.sInletEnd, -f.Rt), Q(CH.xE, 0), Q(xTop, 0)], waterFill);
  poly(v, [at(-0.05, -f.Ro), at(f.L + 0.05, -f.Ro), at(f.L + 0.05, -f.Rt), at(-0.05, -f.Rt)], concrete);
  poly(v, [at(f.L + 0.05, -f.Ro), at(f.sInletEnd, -f.Ro), at(f.sInletEnd, -f.Rt), at(f.L + 0.05, -f.Rt)], concrete);
  poly(v, [at(0, -f.ro), at(f.L, -f.ro), at(f.L, f.ro), at(0, f.ro)], { w: W.medium, fill: FILL.wood, hatch: 'wood' });
  v.line(at(-0.5, 0), at(f.L + 0.9, 0), { w: W.thin, dash: 'center', color: INK_2 });
  // outlines of the channels and of the ground
  v.polyline(
    [
      Q(CANAL.xMax, GROUND),
      Q(CANAL.xMax, CANAL.bed),
      Q(CANAL.xMin, CANAL.bed),
      Q(CANAL.xMin, CH.floor),
      Q(CH.xW, CH.floor),
      Q(CH.xW, TAIL.bed),
      Q(TAIL.xEnd, TAIL.bed),
    ],
    {
      w: W.thick,
      color: COLORS.ink,
    },
  );
  v.line(Q(x0, RIVER.bedDown), Q(TAIL.xEnd, RIVER.bedDown), { w: W.thick });
  v.line(Q(TAIL.xEnd, TAIL.bed), Q(TAIL.xEnd, RIVER.bedDown), { w: W.thin });
  v.line(Q(x0, GROUND), Q(CH.xW, GROUND), { w: W.medium });
  v.line(Q(CH.xW, GROUND), Q(CANAL.xMax, GROUND), { w: W.medium, dash: 'hidden', color: INK_2 });
  v.line(Q(CANAL.xMax, GROUND), Q(x1, GROUND), { w: W.medium });
  // the free surfaces
  v.line(Q(CANAL.xMin, 0), Q(CANAL.xMax, 0), { w: W.medium, color: COLORS.water });
  v.line(Q(x0, TAIL_Y), Q(CH.xW + CH.lowerEnd + 0.6, TAIL_Y), { w: W.medium, color: COLORS.water });
  // the rack and the gate, in the canal (the gate is drawn open: its plate is raised out of the water)
  const tilt = RACK.tilt * (Math.PI / 180);
  v.line(Q(RACK.x, CANAL.bed), Q(RACK.x + RACK.height * Math.sin(tilt), CANAL.bed + RACK.height * Math.cos(tilt)), {
    w: 1.1,
    dash: [0.5, 0.45],
  });
  R(GATE.x - 0.25, GATE.x + 0.25, CANAL.bed, 0.9, concrete);
  R(GATE.x - 0.04, GATE.x + 0.04, 0.2, 0.2 + GATE.height, { w: W.medium, fill: COLORS.red, color: COLORS.red });
  // the breaks of the shortened tailrace
  const xb = (CH.xW + TAIL.xEnd) / 2;
  v.rect(Q(xb - 0.9, GROUND + 0.1), Q(xb + 0.9, RIVER.bedDown - 0.1), { w: 0, fill: COLORS.paper });
  for (const dxb of [-0.9, 0.9])
    v.polyline(
      [
        Q(xb + dxb - 0.35, GROUND + 0.1),
        Q(xb + dxb + 0.35, (GROUND + TAIL.bed) / 2),
        Q(xb + dxb - 0.35, TAIL.bed - 0.1),
      ],
      { w: W.medium, color: COLORS.ink },
    );
  // the head, between the upstream level and the tailwater, west of the chamber
  const xh = CH.xW - 2.4;
  p.line(v.map(Q(xTop, 0)), v.map(Q(xh - 0.5, 0)), { w: W.thin, dash: 'center', color: INK_2 });
  v.dim(Q(xh, 0), Q(xh, TAIL_Y), 0, {
    dir: 'v',
    label: cat('H = ', labOf(dim('DESIGN', 'head'), 2, '', ' m')),
    size: 2,
  });
  // labels of the levels
  const lbl = (
    x: number,
    lv: number,
    t: L,
    o: { anchor?: 'start' | 'end' | 'middle'; dy?: number; color?: string } = {},
  ): void => {
    const [qx, qy] = v.map(Q(x, lv));
    p.text([qx, qy + (o.dy ?? 0)], t, {
      size: 1.8,
      anchor: o.anchor ?? 'start',
      color: o.color ?? COLORS.water,
      weight: 'bold',
      baseline: 'middle',
      halo: true,
    });
  };
  lbl(CANAL.xMax - 11, 0.0, cat(l('niveau amont ', 'upstream level '), datumL()), { dy: -2.6, anchor: 'end' });
  lbl(x0 + 1.2, TAIL_Y, cat(l('niveau aval ', 'tailwater level '), levelL(TAIL_Y)), { dy: -2.6 });
  lbl(CANAL.xMax - 11, CANAL.bed, cat(l('fond du bief ', 'canal bed '), levelL(CANAL.bed)), {
    dy: 3,
    anchor: 'end',
    color: COLORS.ink,
  });
  lbl(x0 + 1.2, RIVER.bedDown, cat(l('fond de la rivière ', 'river bed '), levelL(RIVER.bedDown)), {
    dy: 3.2,
    color: COLORS.ink,
  });
  lbl(CH.xW - 0.5, CH.floor - 0.12, cat(l('plancher de la chambre ', 'chamber floor '), levelL(CH.floor)), {
    anchor: 'end',
    color: COLORS.ink,
  });
  lbl(x1 - 0.5, GROUND, cat(l('sol ', 'ground '), levelL(GROUND)), { dy: -2.8, anchor: 'end', color: COLORS.ink });
  // balloons of the parts that the profile cuts
  const bq = (id: string, target: Pt, dxp: number, dyp: number): void => {
    const [tx, ty] = v.map(target);
    balloon(v, target, tx + dxp, ty + dyp, n(id));
  };
  bq('trash-rack', Q(RACK.x + 0.3, 0.1), 7, -9);
  bq('intake-gate', Q(GATE.x, 1.0), -9, -2);
  bq('headrace', Q(-3, CANAL.bed / 2), 0, 22);
  bq('water-chamber', at(f.L * 0.5, f.ro), -4, -17);
  bq('tailrace', Q(-26, TAIL.bed + 0.4), 0, 0);
  caption(
    d,
    120,
    229,
    l('PROFIL EN LONG par l’axe du bief', 'LONGITUDINAL PROFILE along the race'),
    `${scaleText(P.scale)} · ${scaleText(1000 / P.mmPerM)}`,
  );
}

// ------------------------------------------------------------------------------------------------ C: the weir, the notch and the fish pass

function weirSections(d: Drawing): void {
  const p = d.paper();
  const wz = LAYOUT.WEIR;
  const pz = LAYOUT.PASS;
  // C1: along the river through the notch
  const k1 = wz.mmPerM * wz.scale;
  const v1 = d.view(wz.ox, wz.oy, 1 / wz.scale);
  const Q1 = (x: number, lv: number): Pt => [x * 1000, lv * k1];
  const xa = wz.x;
  const xb = wz.x + 14;
  const baseW = RIVER.bedDown - 0.3;
  const x0 = WEIR.x - WEIR.t / 2;
  const x1 = WEIR.x + WEIR.t / 2;
  const R1 = (a: number, b: number, c: number, e: number, s: Stroke): void => {
    v1.rect(Q1(a, c), Q1(b, e), s);
  };
  R1(xa, xb, baseW, RIVER.bedDown, { w: W.thin, fill: FILL.earth, hatch: 'earth' });
  R1(x1, xb, RIVER.bedUp, 0, waterFill);
  R1(xa, x0, RIVER.bedDown, TAIL_Y, waterFill);
  R1(x1, xb, baseW, RIVER.bedUp, { w: W.thin, fill: FILL.earth, hatch: 'earth' });
  poly(v1, [Q1(x0, baseW), Q1(x1, baseW), Q1(x1, WEIR.crest - NOTCH.d), Q1(x0, WEIR.crest - NOTCH.d)], concrete);
  R1(x0 - 1.6, x0, baseW, RIVER.bedDown + 0.04, concrete);
  v1.line(Q1(x0, WEIR.crest), Q1(x1, WEIR.crest), { w: W.medium, dash: 'hidden', color: INK_2 });
  v1.line(Q1(x1, 0), Q1(xb, 0), { w: W.medium, color: COLORS.water });
  v1.line(Q1(xa, TAIL_Y), Q1(x0 - 0.2, TAIL_Y), { w: W.medium, color: COLORS.water });
  // the sheet of water over the notch
  v1.polyline(
    [
      Q1(x1, -0.02),
      Q1(x0, WEIR.crest - NOTCH.d + 0.04),
      Q1(x0 - 0.5, WEIR.crest - NOTCH.d - 0.2),
      Q1(x0 - 1.0, TAIL_Y),
    ],
    { w: W.medium, color: COLORS.water },
  );
  const lb1 = (x: number, lv: number, t: L, o: { anchor?: 'start' | 'end'; dy?: number } = {}): void => {
    const [qx, qy] = v1.map(Q1(x, lv));
    p.text([qx, qy + (o.dy ?? 0)], t, {
      size: 1.7,
      anchor: o.anchor ?? 'start',
      baseline: 'middle',
      halo: true,
      color: COLORS.ink,
    });
  };
  lb1(xb - 0.2, 0, cat(l('amont ', 'upstream '), datumL()), { anchor: 'end', dy: -2.4 });
  lb1(xa + 0.2, TAIL_Y, cat(l('aval ', 'downstream '), levelL(TAIL_Y)), { dy: -2.4 });
  lb1(xb - 0.2, RIVER.bedUp, cat(l('fond ', 'bed '), levelL(RIVER.bedUp)), { anchor: 'end', dy: 3 });
  lb1(xa + 0.2, RIVER.bedDown, cat(l('fond ', 'bed '), levelL(RIVER.bedDown)), { dy: 3 });
  lb1(x1 + 0.6, WEIR.crest - 0.3, cat(l('crête du seuil ', 'weir crest '), levelL(WEIR.crest)), {});
  // the notch: its width and depth
  lb1(x1 + 0.6, WEIR.crest - NOTCH.d - 0.55, cat(l('échancrure ', 'notch '), labX([NOTCH.w, NOTCH.d], 'E', ' m')), {});
  balloon(v1, Q1(WEIR.x, WEIR.crest - NOTCH.d - 0.6), v1.map(Q1(WEIR.x, 0))[0] + 4, v1.map(Q1(0, 1.1))[1], n('weir'));
  balloon(
    v1,
    Q1(x0 - 0.8, WEIR.crest - NOTCH.d - 0.1),
    v1.map(Q1(x0 - 3.4, 0))[0],
    v1.map(Q1(0, 1.1))[1],
    n('reserved-flow-notch'),
  );

  // C2: along the fish pass, five pools
  const k2 = pz.mmPerM * pz.scale;
  const v2 = d.view(pz.ox, pz.oy, 1 / pz.scale);
  const Q2 = (x: number, lv: number): Pt => [x * 1000, lv * k2];
  const dx = (PASS.xE - PASS.xW) / PASS.pools;
  const xa2 = PASS.xW - 0.8;
  const xb2 = PASS.xE + 1.0;
  v2.rect(Q2(xa2, baseW), Q2(xb2, RIVER.bedDown), { w: W.thin, fill: FILL.earth, hatch: 'earth' });
  v2.rect(Q2(PASS.xE, RIVER.bedDown), Q2(xb2, 0), { w: 0, fill: FILL.water, hatch: 'water' });
  v2.rect(Q2(xa2, RIVER.bedDown), Q2(PASS.xW, TAIL_Y), { w: 0, fill: FILL.water, hatch: 'water' });
  for (let i = 0; i < PASS.pools; i++) {
    const xe = PASS.xE - i * dx;
    const xw = xe - dx;
    const level = WEIR.crest - i * PASS_STEP - 0.02;
    const floor = level - 0.55;
    v2.rect(Q2(xw, RIVER.bedDown), Q2(xe, floor), concrete);
    v2.rect(Q2(xw + 0.02, floor), Q2(xe - 0.12, level), { w: 0, fill: FILL.water, hatch: 'water' });
    v2.line(Q2(xw + 0.02, level), Q2(xe - 0.12, level), { w: W.medium, color: COLORS.water });
    v2.rect(Q2(xe - 0.12, floor), Q2(xe, level + 0.12), { w: W.medium, fill: FILL.concrete });
  }
  v2.line(Q2(xb2, 0), Q2(PASS.xE, 0), { w: W.medium, color: COLORS.water });
  v2.line(Q2(xa2, TAIL_Y), Q2(PASS.xW, TAIL_Y), { w: W.medium, color: COLORS.water });
  const lb2 = (x: number, lv: number, t: L, o: { anchor?: 'start' | 'end' | 'middle'; dy?: number } = {}): void => {
    const [qx, qy] = v2.map(Q2(x, lv));
    p.text([qx, qy + (o.dy ?? 0)], t, {
      size: 1.7,
      anchor: o.anchor ?? 'start',
      baseline: 'middle',
      halo: true,
      color: COLORS.ink,
    });
  };
  lb2(xb2 - 0.1, 0, datumL(), { anchor: 'end', dy: -2.4 });
  lb2(xa2 + 0.1, TAIL_Y, levelL(TAIL_Y), { dy: -2.4 });
  const [stx, sty] = v2.map(Q2((PASS.xE + PASS.xW) / 2, 0.55));
  p.text(
    [stx, sty],
    cat(
      l('bassins : ', 'pools: '),
      lab(PASS.pools, 0, 'E'),
      l(', marche ', ', step '),
      lab(PASS_STEP, 2, 'E', '', ' m'),
    ),
    { size: 1.75, anchor: 'middle' },
  );
  balloon(
    v2,
    Q2((PASS.xE + PASS.xW) / 2 + dx, WEIR.crest - 2 * PASS_STEP - 0.9),
    v2.map(Q2(PASS.xE + 0.4, 0))[0],
    v2.map(Q2(0, -2.55))[1],
    n('fish-pass'),
  );
  p.text(
    [331, 84.5],
    cat(
      l(
        'coupes le long de la rivière, par l’échancrure (à gauche) et par la passe · ',
        'sections along the river, through the notch (left) and the fish pass · ',
      ),
      scaleText(wz.scale),
    ),
    {
      size: 1.7,
      anchor: 'middle',
      color: INK_2,
    },
  );
}

// ------------------------------------------------------------------------------------------------ the sheet

function render(): Drawing {
  const d = new Drawing();
  d.frame({
    title: TITLE,
    subtitle: l(
      'Le seuil, la prise d’eau, la chambre de la vis, le canal de fuite, le moulin et la maison · niveaux',
      'The weir, the intake, the screw’s chamber, the tailrace, the mill and the house · levels',
    ),
    number: NUMBER,
    scale: scaleText(LAYOUT.PLAN.scale),
  });
  const PLAN = LAYOUT.PLAN;
  heading(
    d,
    14,
    13,
    l('A · PLAN · le nord est en haut, la rivière coule vers l’ouest', 'A · PLAN · north is up, the river flows west'),
    { size: 2.2 },
  );
  plan(d, d.view(PLAN.ox, PLAN.oy, 1 / PLAN.scale));
  const PR = LAYOUT.PROFILE;
  heading(
    d,
    14,
    162.5,
    l(
      'B · PROFIL EN LONG · la hauteur est agrandie trois fois',
      'B · LONGITUDINAL PROFILE · the height is enlarged three times',
    ),
    { size: 2.2 },
  );
  profile(d, d.view(PR.ox, PR.oy, 1 / PR.scale));

  heading(d, 266, 13, l('C · LE SEUIL ET LA PASSE', 'C · THE WEIR AND THE FISH PASS'), { size: 2.2 });
  weirSections(d);

  // legend of the items, in two columns
  heading(d, 266, 92, l('REPÈRES · pièces représentées', 'ITEMS · parts shown'), { size: 2 });
  for (const [c, ids] of [ITEMS.slice(0, 6), ITEMS.slice(6)].entries())
    grid(
      d,
      266 + c * 72,
      97,
      [
        { label: l('Rep.', 'Item'), w: 8, align: 'middle' },
        { label: l('Désignation', 'Part'), w: 64 },
      ],
      ids.map((id) => [{ t: String(n(id)), bold: true }, partOf(id).name]),
      { size: 1.7, pad: 0.5, lineH: 2.6 },
    );
  // the main dimensions (all estimates of the 3D model, but the screw's, which the design rules derive)
  heading(
    d,
    266,
    128,
    l('COTES PRINCIPALES · tout est estimé, sauf la vis', 'MAIN DIMENSIONS · all estimated, except the screw'),
    { size: 2 },
  );
  const w = (a: number, b: number): L => labX([a, b], 'E', ' m');
  const rows: [L, L][] = [
    [l('Chute', 'Fall'), labOf(dim('DESIGN', 'head'), 2, '', ' m')],
    [
      l('Bief : largeur · longueur', 'Race: width · length'),
      labX([CANAL.zS - CANAL.zN, CANAL.xMax - CANAL.xMin], 'E', ' m'),
    ],
    [l('Vitesse de l’eau dans le bief', 'Water speed in the race'), figLab('canalSpeed', '', ' m/s')],
    [l('Grille : écartement', 'Rack: clear spacing'), lab(RACK.spacing * 100, 0, 'E', '', ' cm')],
    [l('Seuil : épaisseur', 'Weir: thickness'), lab(WEIR.t, 1, 'E', '', ' m')],
    [l('Échancrure : largeur × creux', 'Notch: width × depth'), w(NOTCH.w, NOTCH.d)],
    [
      l('Passe : bassins · marche', 'Fish pass: pools · step'),
      cat(lab(PASS.pools, 0, 'E'), ' · ', lab(PASS_STEP, 2, 'E', '', ' m')),
    ],
    [l('Chambre d’eau : longueur', 'Water chamber: length'), lab(CH.xE - CH.xW, 1, 'E', '', ' m')],
    [
      l('Vis : longueur · diamètre', 'Screw: length · diameter'),
      cat(labOf(dim('SCREW', 'length'), 2), ' · ', labOf(dim('SCREW', 'outerDiameter'), 2, '', ' m')),
    ],
    [
      l('Canal de fuite : dessiné · réel', 'Tailrace: drawn · real'),
      cat(lab(TAIL.len, 1, 'E'), ' · ≈ ', lab(TAILRACE_REAL_M, 0, null, '', ' m')),
    ],
    [l('Moulin', 'Mill'), w(MILL.l, MILL.w)],
    [l('Local technique', 'Powerhouse'), w(PH.l, PH.w)],
    [l('Maison', 'House'), w(HOUSE.l, HOUSE.w)],
  ];
  for (const [c, part] of [rows.slice(0, 7), rows.slice(7)].entries())
    grid(
      d,
      266 + c * 72,
      133,
      [
        { label: l('Cote', 'Dimension'), w: 40 },
        { label: l('Valeur', 'Value'), w: 32, align: 'end', mono: true },
      ],
      part.map(([a, b]) => [a, b]),
      { size: 1.7, pad: 0.55, lineH: 2.75 },
    );
  marksLegend(d, 266, 176, 140);
  box(
    d,
    266,
    203,
    140,
    l('SÉCURITÉ ET DROITS', 'SAFETY AND RIGHTS'),
    [
      l(
        'Canaux ouverts, eau vive et grille : on ne s’approche pas seul, on ne descend jamais dans un canal. Le droit d’eau, le débit réservé et la passe à poissons dépendent du pays.',
        'Open canals, fast water and a rack: never go near alone, never go down into a canal. The water right, the reserved flow and the fish pass depend on the country.',
      ),
    ],
    { size: 1.8, border: COLORS.red },
  );
  box(
    d,
    14,
    248,
    208,
    l('LIRE LA PLANCHE', 'READING THE SHEET'),
    [
      {
        bullet: '1',
        t: cat(
          l(
            'Le profil suit l’eau : elle entre dans le bief, tombe dans la chambre de la vis, repart par le canal de fuite. Les hauteurs y sont agrandies trois fois ; la vis y paraît donc plus raide que ses ',
            'The profile follows the water: it enters the race, falls in the screw’s chamber and leaves by the tailrace. Heights are enlarged three times, so the screw looks steeper than its ',
          ),
          labOf(dim('SCREW', 'slopeDeg'), 0, '', '°'),
          l(
            '. Le niveau aval est supposé égal à celui de la rivière sous le seuil.',
            '. The tailwater is assumed to match the river below the weir.',
          ),
        ),
      },
      {
        bullet: '2',
        t: cat(
          l('Le canal de fuite réel mesure environ ', 'The real tailrace is about '),
          lab(TAILRACE_REAL_M, 0, null, '', ' m'),
          l(
            ' : il est dessiné raccourci. Les cotes du site sont des estimations de la maquette 3D. ',
            ': it is drawn shortened. The site’s dimensions are estimates of the 3D model. ',
          ),
          EDU_NOTE,
        ),
      },
    ],
    { size: 1.7 },
  );
  return d;
}

export const millRace: DrawingSheet = {
  id: 'mill-race',
  number: NUMBER,
  group: 'site',
  title: TITLE,
  description: l(
    `Un plan et un profil en long du bief du moulin : la rivière barrée par un seuil, la prise d’eau avec sa grille et sa vanne, la chambre où tourne la vis, le canal de fuite, puis le moulin, le local technique et la maison. Le profil donne les niveaux : l’eau en amont, la chute et l’eau en aval. Le canal de fuite réel mesure environ ${num(TAILRACE_REAL_M).fr} m : il est dessiné raccourci. Le nord est en haut du plan ; le profil se lit de droite à gauche, dans le sens de l’eau.`,
    `A plan and a longitudinal profile of the mill race: the river held by a weir, the intake with its rack and gate, the chamber where the screw turns, the tailrace, then the mill, the powerhouse and the house. The profile gives the levels: the water upstream, the fall and the water downstream. The real tailrace is about ${num(TAILRACE_REAL_M).en} m long: it is drawn shortened. North is up in the plan; the profile reads from right to left, the way the water flows.`,
  ),
  scene: 'site',
  parts: ITEMS,
  render,
};
