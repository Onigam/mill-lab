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
import { POWERROOM } from '../three/dims';
import { EDU_NOTE_ROOM, FILL, arrow, balloon, box, caption, grid, heading, marksLegend, note, poly } from './draw';
import { cat, dim, figLab, lab, labOf, scaleText } from './geom';

const NUMBER = 'PL-05';
const TITLE = l('Le local technique : le mur des appareils', 'The powerhouse: the wall of equipment');

/** The parts of the `powerroom` world, in the order the current goes (the order of the 3D room, and of the item numbers). */
export const ITEMS = partIds('powerroom');
const n = (id: string): number => ITEMS.indexOf(id) + 1;
const partOf = (id: string) => PARTS.find((p) => p.id === id)!;

/** Where the views stand on the sheet: the scale of each (1:n), the paper position (mm) of the middle of the room at floor level (A) and of its back wall (B). */
export const LAYOUT = {
  A: { scale: 20, ox: 112, oy: 150 },
  B: { scale: 20, ox: 262, oy: 33 },
} as const;

const R = POWERROOM;
const m = (v: number): number => v * 1000;
/** Value of a dims.ts constant (and its status): `g('POWERROOM', 'breaker', 'x')`. */
const g = (...a: Parameters<typeof dim>): number => dim(...a).v;

// ------------------------------------------------------------------------------------------------ the room and the equipment, from dims.ts

const W_IN = R.width;
const D_IN = R.depth;
const H_IN = R.height;
const T = R.wall;
/** The face of the mounting plate stands this far from the back wall (its thickness). */
const FZ = R.board.thickness;

interface Device {
  id: string;
  /** Centre along the wall, bottom height, size (width, height, depth), distance of the back from the wall: m. */
  x: number;
  y0: number;
  w: number;
  h: number;
  d: number;
  z0: number;
  /** For a unit that does not hang on the board: the centre of its depth. */
  zc?: number;
}

function devices(): Device[] {
  const b = (key: 'breaker' | 'fuseBox' | 'dumpLoad' | 'inverter' | 'meter', id: string): Device => {
    const [w, h, d] = [g('POWERROOM', key, 'size', 0), g('POWERROOM', key, 'size', 1), g('POWERROOM', key, 'size', 2)];
    return { id, x: g('POWERROOM', key, 'x'), y0: g('POWERROOM', key, 'y') - h / 2, w, h, d, z0: FZ };
  };
  const e = (key: 'rectifier' | 'controller', id: string): Device => ({
    id,
    x: g('POWERROOM', key, 'x'),
    y0: g('POWERROOM', key, 'bottom'),
    w: g('ELECTRONICS', key, 0),
    h: g('ELECTRONICS', key, 1),
    d: g('ELECTRONICS', key, 2),
    z0: FZ + 0.004,
  });
  const [bw, bh, bd] = [g('ELECTRONICS', 'battery', 0), g('ELECTRONICS', 'battery', 1), g('ELECTRONICS', 'battery', 2)];
  const zb = g('POWERROOM', 'battery', 'z');
  return [
    b('breaker', 'dc-breaker'),
    b('fuseBox', 'fuse-box'),
    e('rectifier', 'rectifier'),
    e('controller', 'charge-controller'),
    {
      id: 'battery',
      x: g('POWERROOM', 'battery', 'x'),
      y0: g('POWERROOM', 'rack', 'shelf'),
      w: bw,
      h: bh,
      d: bd,
      z0: zb - bd / 2,
    },
    b('dumpLoad', 'dump-load'),
    b('inverter', 'inverter'),
    b('meter', 'energy-meter'),
  ];
}

/** The earth bar and the surge protector on the board, with the earth rod in the floor. */
function earthing(): { bar: Device; surge: Device } {
  const mk = (key: 'earthBar' | 'surge', id: string): Device => {
    const [w, h, d] = [g('POWERROOM', key, 'size', 0), g('POWERROOM', key, 'size', 1), g('POWERROOM', key, 'size', 2)];
    return { id, x: g('POWERROOM', key, 'x'), y0: g('POWERROOM', key, 'y') - h / 2, w, h, d, z0: FZ };
  };
  return { bar: mk('earthBar', 'earthing'), surge: mk('surge', 'earthing') };
}

const STEEL = FILL.steel;
const equip = (fill: string = '#e3e6e9', w: number = W.medium): Stroke => ({ w, fill });
const wallHatch: Stroke = { w: W.medium, fill: FILL.concrete, hatch: 'earth' };
const GREEN = COLORS.pe;
const ROUTE = { in: '#7a4a1f', dc: COLORS.dcPos, out: COLORS.acN, earth: GREEN } as const;

// ------------------------------------------------------------------------------------------------ A: the wall of the board

function elevation(d: Drawing, v: View): void {
  const p = d.paper();
  const devs = devices();
  const { bar, surge } = earthing();
  const half = W_IN / 2;
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
  const slab = 0.14;
  // the cut walls, the floor slab and the ceiling slab; the inside of the room is the back wall seen from the front
  rect(-half - T, -slab, half + T, 0, wallHatch);
  rect(-half - T, 0, -half, H_IN, wallHatch);
  rect(half, 0, half + T, H_IN, wallHatch);
  rect(-half - T, H_IN, half + T, H_IN + 0.12, wallHatch);
  rect(-half, 0, half, H_IN, { w: W.thin, fill: COLORS.paper });

  // the mounting plate of the switchboard and the cable trunking along its top
  const B = R.board;
  rect(-B.halfWidth, B.y0, B.halfWidth, B.y1, { w: W.medium, fill: '#d6dadf' });
  const margin = 0.05;
  rect(-B.halfWidth + margin, B.y1 - R.trunking.height - 0.005, B.halfWidth - margin, B.y1 - 0.005, {
    w: W.thin,
    fill: '#bfc3c4',
  });

  // the equipment, in the order the current goes
  for (const dv of devs) {
    if (dv.id === 'battery') continue;
    rect(dv.x - dv.w / 2, dv.y0, dv.x + dv.w / 2, dv.y0 + dv.h, equip(dv.id === 'dump-load' ? FILL.copper : '#e3e6e9'));
  }
  // the earth bar, the surge protector
  rect(bar.x - bar.w / 2, bar.y0, bar.x + bar.w / 2, bar.y0 + bar.h, { w: W.medium, fill: FILL.copper });
  rect(surge.x - surge.w / 2, surge.y0, surge.x + surge.w / 2, surge.y0 + surge.h, equip());
  // the battery on its rack, in front of the wall
  const bat = devs.find((x) => x.id === 'battery')!;
  const rack = R.rack;
  const sx = bat.w / 2 + 0.04;
  for (const s of [-1, 1])
    rect(bat.x + s * sx - rack.post / 2, 0, bat.x + s * sx + rack.post / 2, rack.shelf, equip(STEEL, W.thin));
  rect(bat.x - sx - rack.post / 2, rack.shelf - 0.02, bat.x + sx + rack.post / 2, rack.shelf, equip(STEEL, W.thin));
  rect(bat.x - bat.w / 2, bat.y0, bat.x + bat.w / 2, bat.y0 + bat.h, equip('#dfe9d8'));
  // the earth rod: a stub above the floor and the rest under it (a break, then its length)
  const rod = R.rod;
  rect(rod.x - rod.radius, 0, rod.x + rod.radius, rod.above, { w: W.thin, fill: FILL.copper });
  rect(rod.x - rod.radius, -0.3, rod.x + rod.radius, 0, { w: W.thin, fill: FILL.copper });
  // the insulating mat in front of the board
  const mat = R.mat;
  rect(-mat.width / 2, 0, mat.width / 2, mat.thickness, { w: W.thin, fill: '#3b4452' });

  // ---- the routes of the cables: the conduit from the west wall to the trunking, the links in the order of the current, the ladder to the east wall
  const yTrunk = B.y1 - R.trunking.height / 2;
  const yHigh = B.y1 + 0.14;
  const line = (pts: Pt[], color: string, w = W.medium, dash?: Stroke['dash']): void => {
    v.polyline(
      pts.map(([x, y]): Pt => [m(x), m(y)]),
      { w, color, dash },
    );
  };
  line(
    [
      [-half, yHigh],
      [-B.halfWidth + margin + 0.1, yHigh],
      [-B.halfWidth + margin + 0.1, yTrunk],
    ],
    ROUTE.in,
    0.7,
  );
  line(
    [
      [B.halfWidth - margin - 0.1, yTrunk],
      [B.halfWidth - margin - 0.1, yHigh + 0.08],
      [half, yHigh + 0.08],
    ],
    ROUTE.out,
    0.7,
  );
  // the links from one device to the next, at mid-height of the smaller of the two
  const mid = (dv: Device): number => dv.y0 + dv.h / 2;
  const link = (a: Device, b: Device, color: string, w = W.medium): void => {
    const ya = Math.min(mid(a), mid(b));
    const yb = ya;
    line(
      [
        [a.x + a.w / 2, ya],
        [b.x - b.w / 2, yb],
      ],
      color,
      w,
    );
  };
  const byId = (id: string): Device => devs.find((x) => x.id === id)!;
  link(byId('dc-breaker'), byId('fuse-box'), ROUTE.in);
  link(byId('fuse-box'), byId('rectifier'), ROUTE.in);
  link(byId('rectifier'), byId('charge-controller'), ROUTE.dc);
  link(byId('charge-controller'), byId('dump-load'), ROUTE.dc);
  link(byId('inverter'), byId('energy-meter'), ROUTE.out);
  // controller to battery, battery to inverter: the two thick cables
  const ctl = byId('charge-controller');
  const inv = byId('inverter');
  line(
    [
      [ctl.x, ctl.y0],
      [ctl.x, bat.y0 + bat.h + 0.1],
      [bat.x - 0.1, bat.y0 + bat.h + 0.1],
      [bat.x - 0.1, bat.y0 + bat.h],
    ],
    ROUTE.dc,
    1.0,
  );
  line(
    [
      [bat.x + 0.1, bat.y0 + bat.h],
      [bat.x + 0.1, bat.y0 + bat.h + 0.16],
      [inv.x, bat.y0 + bat.h + 0.16],
      [inv.x, inv.y0],
    ],
    ROUTE.dc,
    1.0,
  );
  // the earth conductor: the bar to the rod, the surge protector to the bar
  line(
    [
      [bar.x - bar.w / 2, bar.y0 + bar.h / 2],
      [rod.x, bar.y0 + bar.h / 2],
      [rod.x, rod.above],
    ],
    ROUTE.earth,
    0.9,
  );
  line(
    [
      [surge.x, surge.y0],
      [surge.x, bar.y0 + bar.h / 2],
    ],
    ROUTE.earth,
    0.9,
  );

  // ---- balloons under the devices of the board, the others where they have room
  const yb = 1.16;
  const bl = (id: string, x: number, y: number, tx: number, ty: number): void =>
    balloon(v, [m(tx), m(ty)], v.map([m(x), m(y)])[0], v.map([m(x), m(y)])[1], n(id));
  for (const dv of devs) {
    if (dv.id === 'battery') continue;
    bl(dv.id, dv.x, yb, dv.x, dv.y0);
  }
  bl('battery', bat.x + 0.45, 0.78, bat.x + bat.w / 2 - 0.05, bat.y0 + bat.h / 2);
  bl('switchboard', B.halfWidth - 0.3, 0.76, B.halfWidth - 0.3, B.y0);
  bl('earthing', rod.x + 0.5, 0.42, rod.x, 0.3);

  // ---- dimensions: the heights of the board and of the room on the left, the width of the room under the floor
  const left = -half - T;
  const hv = (y: number, off: number, text: L): void =>
    v.dim([m(left), m(y)], [m(left), m(0)], off, { dir: 'v', label: text, size: 1.8 });
  hv(B.y0, -9, labOf(dim('POWERROOM', 'board', 'y0'), 2, '', ' m'));
  hv(B.y1, -17, labOf(dim('POWERROOM', 'board', 'y1'), 2, '', ' m'));
  v.dim([m(left), m(H_IN)], [m(left), m(0)], -25, { dir: 'v', label: lab(H_IN, 2, 'E', '', ' m'), size: 1.8 });
  v.dim([m(-half - T), m(H_IN + 0.12)], [m(half + T), m(H_IN + 0.12)], -4.5, {
    dir: 'h',
    label: cat(l('largeur utile ', 'inside width '), lab(W_IN, 2, 'E', '', ' m')),
    size: 1.9,
  });
  v.dim([m(bat.x + sx + 0.2), m(rack.shelf)], [m(bat.x + sx + 0.2), 0], 6, {
    dir: 'v',
    label: labOf(dim('POWERROOM', 'rack', 'shelf'), 2, '', ' m'),
    size: 1.7,
  });
  p.text(
    v.map([m(rod.x + 0.1), m(-0.22)]),
    cat(l('tige de terre ', 'earth rod '), labOf(dim('POWERROOM', 'rod', 'length'), 1, '', ' m')),
    { size: 1.6, color: ROUTE.earth, baseline: 'middle' },
  );
  p.text(v.map([m(-half + 0.05), m(yHigh + 0.07)]), l('conduit', 'conduit'), { size: 1.6, color: ROUTE.in });
  p.text(v.map([m(half - 0.05), m(yHigh + 0.15)]), l('chemin de câbles', 'cable tray'), {
    size: 1.6,
    color: ROUTE.out,
    anchor: 'end',
  });
}

// ------------------------------------------------------------------------------------------------ B: the floor plan

function plan(v: View): void {
  const devs = devices();
  const { bar, surge } = earthing();
  const half = W_IN / 2;
  // plan coordinates: x along the wall, the model's y is minus the distance from the back wall (the back wall is at the top of the sheet)
  const rect = (x0: number, z0: number, x1: number, z1: number, s: Stroke): void => {
    poly(
      v,
      [
        [m(x0), -m(z0)],
        [m(x1), -m(z0)],
        [m(x1), -m(z1)],
        [m(x0), -m(z1)],
      ],
      s,
    );
  };
  const door = R.door;
  const zD1 = D_IN - door.fromFront;
  const zD0 = zD1 - door.width;
  // walls: back, west, front, east (with the doorway)
  rect(-half - T, -T, half + T, 0, wallHatch);
  rect(-half - T, -T, -half, D_IN + T, wallHatch);
  rect(-half - T, D_IN, half + T, D_IN + T, wallHatch);
  rect(half, -T, half + T, zD0, wallHatch);
  rect(half, zD1, half + T, D_IN + T, wallHatch);
  rect(-half, 0, half, D_IN, { w: W.thin, fill: COLORS.paper });
  // the door: the leaf in the doorway, and its swing outwards (dashed)
  v.line([m(half + T / 2), -m(zD0)], [m(half + T / 2), -m(zD1)], { w: W.medium, color: '#8a6a4f' });
  v.polyline(
    Array.from({ length: 13 }, (_, i): Pt => {
      const a = (i / 12) * (Math.PI / 2);
      return [m(half + T / 2 + door.width * Math.sin(a)), -m(zD0 + door.width * Math.cos(a))];
    }),
    { w: W.thin, color: '#8a6a4f', dash: 'hidden' },
  );
  // the insulating mat
  const mat = R.mat;
  rect(-mat.width / 2, 0.1, mat.width / 2, 0.1 + mat.depth, { w: W.thin, fill: '#e1e4ea', dash: 'hidden' });
  // the board and its devices
  const B = R.board;
  rect(-B.halfWidth, 0, B.halfWidth, FZ, { w: W.medium, fill: '#d6dadf' });
  for (const dv of devs) {
    if (dv.id === 'battery') continue;
    rect(dv.x - dv.w / 2, dv.z0, dv.x + dv.w / 2, dv.z0 + dv.d, equip(dv.id === 'dump-load' ? FILL.copper : '#e3e6e9'));
  }
  rect(bar.x - bar.w / 2, bar.z0, bar.x + bar.w / 2, bar.z0 + bar.d, { w: W.medium, fill: FILL.copper });
  rect(surge.x - surge.w / 2, surge.z0, surge.x + surge.w / 2, surge.z0 + surge.d, equip());
  // the battery on its rack
  const bat = devs.find((x) => x.id === 'battery')!;
  const rack = R.rack;
  const zb = R.battery.z;
  const sx = bat.w / 2 + 0.04;
  rect(bat.x - sx - rack.post / 2, zb - rack.depth / 2, bat.x + sx + rack.post / 2, zb + rack.depth / 2, {
    w: W.thin,
    fill: STEEL,
  });
  rect(bat.x - bat.w / 2, bat.z0, bat.x + bat.w / 2, bat.z0 + bat.d, equip('#dfe9d8'));
  // the earth rod
  const rod = R.rod;
  v.circle([m(rod.x), -m(rod.z)], m(0.03), { w: W.medium, fill: FILL.copper });
  v.circle([m(rod.x), -m(rod.z)], m(rod.radius), { w: W.thin, fill: GREEN });

  // ---- routes: the conduit in through the west wall, along it and along the back wall to the trunking; the ladder along the east wall to the east gland
  const zMid = D_IN / 2;
  const off = 0.034;
  const line = (pts: Pt[], color: string, w = 0.7, dash?: Stroke['dash']): void => {
    v.polyline(
      pts.map(([x, z]): Pt => [m(x), -m(z)]),
      { w, color, dash },
    );
  };
  const trunkL = -B.halfWidth + 0.15;
  const trunkR = B.halfWidth - 0.15;
  line(
    [
      [-half - T, zMid],
      [-half + off, zMid],
      [-half + off, off],
      [trunkL, off],
    ],
    ROUTE.in,
  );
  line(
    [
      [trunkR, off],
      [half - 0.1, off],
      [half - 0.1, zMid],
      [half + T, zMid],
    ],
    ROUTE.out,
  );
  rect(half - 0.16, 0.1, half - 0.04, zMid + 0.05, { w: W.thin, color: ROUTE.out, fill: 'none', dash: 'hidden' });
  line(
    [
      [bar.x, bar.z0 + bar.d],
      [rod.x, rod.z],
    ],
    ROUTE.earth,
    0.9,
  );
  const ctl = devs.find((x) => x.id === 'charge-controller')!;
  line(
    [
      [ctl.x, ctl.z0 + ctl.d],
      [bat.x - 0.1, bat.z0],
    ],
    ROUTE.dc,
    1.0,
  );

  // ---- balloons: the devices of the board above it is not possible (the wall): they are put in the room, in the order of the current
  const bl = (id: string, tx: number, tz: number, bx: number, bz: number): void =>
    balloon(v, [m(tx), -m(tz)], v.map([m(bx), -m(bz)])[0], v.map([m(bx), -m(bz)])[1], n(id));
  const row = [
    ...devs.filter((x) => x.id !== 'battery').map((dv) => ({ id: dv.id, tx: dv.x, tz: dv.z0 + dv.d })),
    { id: 'switchboard', tx: B.halfWidth - 0.1, tz: FZ },
  ];
  row.forEach((it, i) => {
    const bx = -B.halfWidth + 0.1 + (i * (2 * B.halfWidth - 0.2)) / (row.length - 1);
    bl(it.id, it.tx, it.tz, bx, 1.12);
  });
  bl('battery', bat.x, bat.z0 + bat.d, bat.x, 1.4);
  bl('earthing', rod.x, rod.z, rod.x + 0.28, rod.z + 0.55);

  // ---- dimensions: the room, the doorway, the mat
  v.dim([m(-half), -m(D_IN + T)], [m(half), -m(D_IN + T)], 5, {
    dir: 'h',
    label: lab(W_IN, 2, 'E', '', ' m'),
    size: 1.9,
  });
  v.dim([m(half + T), 0], [m(half + T), -m(D_IN)], 7, { dir: 'v', label: lab(D_IN, 2, 'E', '', ' m'), size: 1.9 });
  const [dx, dy] = v.map([m(half - 0.22), -m((zD0 + zD1) / 2)]);
  v.drawing
    .paper()
    .text([dx, dy], cat(l('porte ', 'door '), lab(door.width, 2, 'E'), ' × ', lab(door.height, 2, 'E', '', ' m')), {
      size: 1.7,
      anchor: 'end',
      baseline: 'middle',
      color: '#8a6a4f',
    });
}

// ------------------------------------------------------------------------------------------------ the order of the current

function order(d: Drawing, x: number, y: number): void {
  const p = d.paper();
  // the chain follows the numbers; the dump load (6) hangs on the controller and is drawn apart
  const chain = [
    'dc-breaker',
    'fuse-box',
    'rectifier',
    'charge-controller',
    'battery',
    'dump-load',
    'inverter',
    'energy-meter',
  ];
  const h = 11.5;
  const gap = 3.6;
  const w = 58;
  const at = (id: string): number => y + chain.indexOf(id) * (h + gap);
  for (const id of chain) {
    const yy = at(id);
    const dumped = id === 'dump-load';
    p.rect([x, yy], [x + w, yy + h], {
      w: W.medium,
      fill: dumped ? FILL.copper : COLORS.paper,
      dash: dumped ? 'hidden' : undefined,
    });
    p.circle([x + 5, yy + h / 2], 3.2, { w: W.thin, fill: COLORS.paper });
    p.text([x + 5, yy + h / 2], String(n(id)), { size: 2.6, weight: 'bold', anchor: 'middle', baseline: 'middle' });
    p.text([x + 11, yy + h / 2 - 2.2], partOf(id).name, { size: 1.9, weight: 'bold', baseline: 'middle' });
    p.text([x + 11, yy + h / 2 + 2.4], role(id), { size: 1.5, baseline: 'middle', color: INK_2 });
  }
  const link = (a: string, b: string): void => {
    arrow(p, [x + 5, at(a) + h], [x + 5, at(b)], COLORS.ink, W.medium);
  };
  link('dc-breaker', 'fuse-box');
  link('fuse-box', 'rectifier');
  link('rectifier', 'charge-controller');
  link('charge-controller', 'battery');
  link('inverter', 'energy-meter');
  // the battery feeds the inverter, the controller diverts the surplus to the dump load: both drawn on the right
  const xr = x + w + 2.5;
  p.polyline(
    [
      [x + w, at('charge-controller') + h / 2],
      [xr, at('charge-controller') + h / 2],
      [xr, at('dump-load') + h / 2],
    ],
    {
      w: W.medium,
      color: ROUTE.dc,
      dash: 'hidden',
    },
  );
  arrow(p, [xr, at('dump-load') + h / 2], [x + w, at('dump-load') + h / 2], ROUTE.dc, W.medium, 'hidden');
  const xl = x - 2.5;
  p.polyline(
    [
      [x, at('battery') + h / 2],
      [xl, at('battery') + h / 2],
      [xl, at('inverter') + h / 2],
    ],
    { w: W.medium, color: ROUTE.dc },
  );
  arrow(p, [xl, at('inverter') + h / 2], [x, at('inverter') + h / 2], ROUTE.dc, W.medium);
}

function role(id: string): L {
  switch (id) {
    case 'dc-breaker':
      return l('isole, coupe sur surcharge', 'isolates, trips on overload');
    case 'fuse-box':
      return l('dernier rempart : court-circuit', 'last rampart: short circuit');
    case 'rectifier':
      return l('alternatif triphasé vers continu', 'three-phase AC to DC');
    case 'charge-controller':
      return l('règle la charge, détourne le surplus', 'manages the charge, diverts the surplus');
    case 'battery':
      return l('stocke : un banc de quarante-huit volts', 'stores: a bank at forty-eight volts');
    case 'inverter':
      return l('continu vers alternatif, pour la maison', 'DC to AC, for the house');
    case 'dump-load':
      return l('absorbe le surplus · non simulée', 'absorbs the surplus · not simulated');
    default:
      return l('compte l’énergie qui part', 'counts the energy that leaves');
  }
}

// ------------------------------------------------------------------------------------------------ the tables

const box3 = (w: number, h: number, dd: number): L => {
  const f = (v: number): L => lab(v, 2, null);
  return cat(f(w), ' × ', f(h), ' × ', lab(dd, 2, 'E', '', ' m'));
};

function partsTable(d: Drawing, x: number, y: number): number {
  const devs = devices();
  const { bar, surge } = earthing();
  const half = W_IN / 2;
  const B = R.board;
  const size = (id: string): L => {
    const dv = devs.find((q) => q.id === id);
    if (dv) return box3(dv.w, dv.h, dv.d);
    if (id === 'switchboard') return box3(2 * B.halfWidth, B.y1 - B.y0, B.thickness);
    return cat(
      l('barre ', 'bar '),
      lab(bar.w, 2, null),
      ' × ',
      lab(bar.h, 2, null),
      l(' ; parafoudre ', ' ; surge arrester '),
      lab(surge.w, 2, null),
      ' × ',
      lab(surge.h, 2, null),
      ' m*',
    );
  };
  const place = (id: string): L => {
    const dv = devs.find((q) => q.id === id);
    if (dv) return cat(lab(half + dv.x, 2, null), ' ; ', lab(dv.y0 + dv.h / 2, 2, 'E', '', ' m'));
    if (id === 'switchboard') return cat(lab(half, 2, null), ' ; ', lab((B.y0 + B.y1) / 2, 2, 'E', '', ' m'));
    return cat(lab(half + R.rod.x, 2, null), ' ; ', lab(0, 2, 'E', '', ' m'));
  };
  const rows = ITEMS.map((id, i) => [{ t: String(i + 1), bold: true }, partOf(id).name, size(id), place(id)]);
  return grid(
    d,
    x,
    y,
    [
      { label: l('Rep.', 'Item'), w: 8, align: 'middle' },
      { label: l('Désignation', 'Part'), w: 40 },
      { label: l('Dimensions L × H × P (m)', 'Size W × H × D (m)'), w: 64, mono: true },
      { label: l('Centre : depuis le mur ouest ; hauteur', 'Centre: from the west wall; height'), w: 62, mono: true },
    ],
    rows.map((r) => r.map((c) => c)),
    { size: 1.7, pad: 0.4, lineH: 2.6 },
  );
}

function routesTable(d: Drawing, x: number, y: number): void {
  const p = d.paper();
  const rows: [string, L][] = [
    [
      ROUTE.in,
      l(
        'Câble de la génératrice : presse-étoupe du mur ouest, conduit en PVC le long du mur, goulotte du tableau, disjoncteur.',
        'Generator cable: gland in the west wall, PVC conduit along the wall, the board’s trunking, the breaker.',
      ),
    ],
    [
      ROUTE.dc,
      cat(
        l(
          'Liaisons continues entre appareils, dans l’ordre du courant ; câbles de batterie de ',
          'DC links between devices, in the order of the current; battery cables of ',
        ),
        figLab('batCableMm2', '', ' mm²'),
        l(', les plus gros du local.', ', the thickest of the room.'),
      ),
    ],
    [
      ROUTE.out,
      l(
        'Alimentation de la maison : compteur, chemin de câbles le long du mur est, presse-étoupe du mur est, au-dessus de la porte.',
        'Supply to the house: the meter, the cable tray along the east wall, the gland in the east wall, above the door.',
      ),
    ],
    [
      ROUTE.earth,
      cat(
        l(
          'Terre : barre de terre, tige dans le sol ; la liaison fait ',
          'Earth: the earth bar, the rod in the ground; the bonding is ',
        ),
        figLab('earthMm2', '', ' mm²'),
        l(', le parafoudre y est relié.', ', the surge arrester is tied to it.'),
      ),
    ],
  ];
  let yy = y;
  for (const [color, text] of rows) {
    p.line([x, yy + 1.4], [x + 11, yy + 1.4], { w: 1.0, color });
    yy = note(d, x + 14, yy, 130, text, { size: 1.7 });
  }
}

// ------------------------------------------------------------------------------------------------ the sheet

function render(): Drawing {
  const d = new Drawing();
  const A = LAYOUT.A;
  const B = LAYOUT.B;
  d.frame({
    title: TITLE,
    subtitle: l(
      'Le mur des appareils dans l’ordre du courant, le plan du local, le cheminement des câbles · estimations',
      'The wall of equipment in the order of the current, the plan of the room, the cable routes · estimates',
    ),
    number: NUMBER,
    scale: scaleText(A.scale),
  });

  heading(d, 14, 13, l('A · LE MUR DU FOND, vu de l’intérieur', 'A · THE BACK WALL, seen from inside'), { size: 2.2 });
  elevation(d, d.view(A.ox, A.oy, 1 / A.scale));
  caption(d, 112, 168, l('ÉLÉVATION DU MUR DU TABLEAU', 'ELEVATION OF THE BOARD WALL'), scaleText(A.scale));

  heading(d, 190, 13, l('B · LE PLAN DU LOCAL', 'B · THE FLOOR PLAN'), { size: 2.2 });
  plan(d.view(B.ox, B.oy, 1 / B.scale));
  caption(d, 262, 168, l('PLAN', 'PLAN'), scaleText(B.scale));

  heading(d, 348, 13, l('L’ORDRE DU COURANT', 'THE ORDER OF THE CURRENT'), { size: 2.2 });
  order(d, 348, 19);

  heading(d, 14, 178, l('REPÈRES · pièces du local', 'ITEMS · parts of the room'), { size: 2 });
  partsTable(d, 14, 183);
  heading(d, 252, 178, l('CÂBLES · les chemins du courant', 'CABLES · the routes of the current'), { size: 2 });
  routesTable(d, 252, 183);
  marksLegend(d, 252, 218, 100, [], {
    reported: l('donnée par une source publiée', 'given by a published source'),
    derived: l('calculée à partir des résultats du modèle', 'calculated from the model results'),
    estimate: l('estimation du labo : aucune source ne la donne', 'the lab’s estimate: no source gives it'),
  });
  box(
    d,
    14,
    248,
    192,
    l('LIRE LA PLANCHE · SÉCURITÉ', 'READING THE SHEET · SAFETY'),
    [
      {
        bullet: '1',
        t: l(
          'La plaque est à échelle ; les appareils sont des boîtes. Le plan montre le local vu d’en haut, avec la porte qui s’ouvre vers l’extérieur et le tapis isolant devant le tableau. Les chemins des câbles sont dessinés sans cote : leur hauteur dépend de l’installation.',
          'The plate is to scale; the devices are boxes. The plan shows the room from above, with the door that opens outwards and the insulating mat in front of the board. The cable routes are drawn without dimensions: their height depends on the installation.',
        ),
      },
      {
        bullet: '2',
        t: l(
          'Danger : une batterie peut débiter des centaines d’ampères en court-circuit. Isolez avant de toucher, ouvrez le disjoncteur et déposez les fusibles, et laissez la mise à la terre et les protections à un électricien qualifié.',
          'Danger: a battery can deliver hundreds of amperes in a short circuit. Isolate before touching, open the breaker and remove the fuses, and leave the earthing and the protections to a qualified electrician.',
        ),
      },
      { bullet: '3', t: EDU_NOTE_ROOM },
    ],
    { size: 1.65 },
  );
  return d;
}

export const powerroomLayout: DrawingSheet = {
  id: 'powerroom-layout',
  number: NUMBER,
  group: 'powerroom',
  title: TITLE,
  description: l(
    'Le mur du fond du petit local technique, vu de l’intérieur, porte les appareils dans l’ordre où le courant les traverse : disjoncteur, fusibles, redresseur, régulateur, batterie sur son support, charge de délestage, onduleur et compteur, avec la barre de terre et sa tige. Le plan du local montre le tableau, la batterie, la porte et le tapis isolant, et le cheminement des câbles : conduit venu de la génératrice, liaisons continues, chemin de câbles vers la maison, liaison de terre. Toutes les tailles et les positions sont des estimations du labo ; ce n’est pas un plan de câblage.',
    'The back wall of the little powerhouse, seen from inside, carries the devices in the order the current goes through them: breaker, fuses, rectifier, controller, battery on its rack, dump load, inverter and meter, with the earth bar and its rod. The plan of the room shows the board, the battery, the door and the insulating mat, and the cable routes: the conduit from the generator, the DC links, the cable tray to the house, the earth bonding. All sizes and positions are the lab’s estimates; this is not a wiring plan.',
  ),
  scene: 'powerroom',
  parts: ITEMS,
  render,
};
