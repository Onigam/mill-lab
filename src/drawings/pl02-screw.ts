import { COLORS, Drawing, INK_2, W, type DrawingSheet, type Pt, type View } from '@onigam/lab-kit/drawings';
import { l, type L } from '@onigam/lab-kit/i18n';
import { PARTS } from '../data/parts';
import { GAP_COEFF, RADIUS_RATIO, SPEED_RULE_RPM } from '../sim/machine';
import { DESIGN_SHAPE, bladeThickness } from '../three/dims';
import { EDU_NOTE, FILL, arrow, balloon, box, caption, gapDim, grid, heading, marksLegend, poly } from './draw';
import { cat, dim, figLab, lab, labOf, num, scaleText } from './geom';
import { bladeBottomX, bladeTopX, frameOf, pocketCentreX, pocketPolygon, world, type Frame } from './frame';

const NUMBER = 'PL-02';
const TITLE = l('La vis : coupe et géométrie', 'The screw: section and geometry');

/** The parts of the `screw` world that this sheet shows, in the order of its item numbers. */
export const ITEMS = [
  'trough',
  'screw-core',
  'blade-module',
  'blade-fastener',
  'upper-bearing',
  'lower-bearing',
  'inlet-sill',
  'outlet-pool',
  'trapped-water',
  'drive-sprocket',
];
const n = (id: string): number => ITEMS.indexOf(id) + 1;
const partOf = (id: string) => PARTS.find((p) => p.id === id)!;

const F: Frame = frameOf(DESIGN_SHAPE);

/** Where the views stand on the sheet: the scale of each (1:n) and the paper position (mm) of the model origin (the world origin for A, the axis for B and C). */
export const LAYOUT = {
  A: { scale: 35, ox: 75.1, oy: 138 },
  B: { scale: 10, ox: 336, oy: 78 },
  C: { scale: 5, ox: 64 - (-F.S / 4 + F.spacing / 2) * 200, oy: 127 },
} as const;

const m = (v: number): number => v * 1000;
/** A point of the screw frame, as a model coordinate (millimetres) of the side section A. */
const P = (xp: number, yp: number): Pt => {
  const [x, y] = world(F, xp, yp);
  return [m(x), m(y)];
};
const W2 = (x: number, y: number): Pt => [m(x), m(y)];

const STEEL = FILL.steel;
const WOOD = FILL.wood;

function strip(
  v: View,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  fill: string,
  hatch: 'wood' | 'steel' | 'earth',
): void {
  poly(v, [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], { w: W.medium, fill, hatch });
}

const concrete = { w: W.medium, fill: FILL.concrete, hatch: 'earth' } as const;
const waterFill = { w: 0, fill: FILL.water, hatch: 'water' } as const;

// ------------------------------------------------------------------------------------------------ A: longitudinal section

function sectionA(d: Drawing, v: View): void {
  const f = F;
  const p = d.paper();
  const oh = 0.05 * f.k;
  const yEnd = f.hPass / f.cosB;

  // ---- ground, outlet pool (slab, right wall), water of the pool and of the lower end of the trough
  v.line(W2(-2.0, 0), W2(6.0, 0), { w: W.thick });
  v.rect(W2(-2.0, 0), W2(6.0, -0.25), { w: 0, fill: 'none', hatch: 'alu' });
  const slab = 0.15 * f.k;
  poly(v, [W2(f.poolX0, -slab), W2(f.poolX1 + 0.15, -slab), W2(f.poolX1 + 0.15, 0), W2(f.poolX0, 0)], concrete);
  poly(
    v,
    [W2(f.poolX1, 0), W2(f.poolX1 + 0.15, 0), W2(f.poolX1 + 0.15, f.poolRimY), W2(f.poolX1, f.poolRimY)],
    concrete,
  );
  poly(v, [W2(f.poolX0, 0), W2(f.poolX1, 0), W2(f.poolX1, f.tailY), W2(f.poolX0, f.tailY)], waterFill);
  // the pool water continues inside the trough, up to where its floor climbs out of the water
  const sOut = (f.tailY - f.y0 + f.Rt * f.cosB) / f.sinB;
  poly(
    v,
    [P(-oh, -f.Rt), P(sOut, -f.Rt), W2(world(f, sOut, -f.Rt)[0], f.tailY), W2(world(f, -oh, -f.Rt)[0] - 0.4, f.tailY)],
    waterFill,
  );

  // ---- piers under the trough (wedges of concrete) and the pier of the lower bearing
  const wp = 0.4 * f.k;
  for (const s of [0.9 * f.k, f.L * 0.5, f.L - 0.7 * f.k]) {
    const xc = world(f, s, -f.Ro)[0];
    const top = (x: number): number => f.y0 - f.Ro * f.cosB + (x - f.Ro * f.sinB) * (f.sinB / f.cosB) + 0.06 * f.k;
    poly(
      v,
      [W2(xc - wp / 2, 0), W2(xc + wp / 2, 0), W2(xc + wp / 2, top(xc + wp / 2)), W2(xc - wp / 2, top(xc - wp / 2))],
      concrete,
    );
  }
  const [lowX, lowY] = world(f, f.sLow, 0);
  poly(v, [W2(lowX - 0.1, 0), W2(lowX + 0.1, 0), W2(lowX + 0.1, lowY - 0.13), W2(lowX - 0.1, lowY - 0.13)], concrete);

  // ---- the inlet basin: water, headwall, the platform slab that carries the drive
  const sHeadBottom = (f.headX - f.Rt * f.sinB) / f.cosB;
  const yHeadBottom = world(f, sHeadBottom, -f.Rt)[1];
  poly(
    v,
    [P(f.L, -f.Rt), P(sHeadBottom, -f.Rt), W2(f.headX, yHeadBottom), W2(f.headX, f.inletY), P(f.L, yEnd)],
    waterFill,
  );
  poly(
    v,
    [W2(f.headX, 0), W2(f.headX + f.headThick, 0), W2(f.headX + f.headThick, f.headTop), W2(f.headX, f.headTop)],
    concrete,
  );
  poly(
    v,
    [
      W2(f.headX + f.headThick, f.headTop - 0.16),
      W2(6.0, f.headTop - 0.16),
      W2(6.0, f.headTop),
      W2(f.headX + f.headThick, f.headTop),
    ],
    concrete,
  );
  v.polyline([W2(5.9, f.headTop + 0.03), W2(5.97, f.headTop - 0.19)], { w: W.thin });

  // ---- pockets of water, one per blade spacing (fill 1: full buckets at the design flow)
  const pk = pocketPolygon(f, 1);
  const th = f.spacing - f.t;
  for (let i = -2; i < 24; i++) {
    const x0 = pk[0]![0] + i * f.spacing;
    const x1 = x0 + th;
    if (x1 < 0 || x0 > f.L) continue;
    const a = Math.max(0, x0);
    const b = Math.min(f.L, x1);
    poly(v, [P(a, -f.ro), P(b, -f.ro), P(b, -f.ri), P(a, -f.ri)], {
      w: W.thin,
      fill: FILL.water,
      hatch: 'water',
      color: COLORS.water,
    });
  }

  // ---- trough: the bottom strip under the flights and its extension to the headwall (the 4 mm gap is under a tenth of a millimetre here)
  strip(v, -oh, f.L + oh, -f.Rt, -f.Ro, FILL.concrete, 'earth');
  strip(v, f.L + oh, f.sInletEnd, -f.Rt, -f.Ro, FILL.concrete, 'earth');

  // ---- shaft (continuous), core tube, end plates
  strip(v, f.sShaftStart, f.sShaftEnd, -f.rj, f.rj, STEEL, 'steel');
  strip(v, 0, f.L, f.ri, f.ri - f.wall, WOOD, 'wood');
  strip(v, 0, f.L, -f.ri, -(f.ri - f.wall), WOOD, 'wood');
  const plate = 0.03 * f.k;
  for (const s of [0, f.L - plate]) strip(v, s, s + plate, -(f.ri - f.wall), f.ri - f.wall, STEEL, 'steel');
  v.line(P(f.sShaftStart - 0.1, 0), P(f.sShaftEnd + 0.15, 0), { w: W.thin, dash: 'center', color: INK_2 });

  // ---- blades cut by the plane: radial rectangles, the bottom ones and (half a pitch away) the top ones
  const inside = (x: number): boolean => x > f.t / 2 + 0.004 && x < f.L - f.t / 2 - 0.004;
  for (let j = -3; j < 30; j++) {
    const xb = bladeBottomX(f, j);
    if (inside(xb)) strip(v, xb - f.t / 2, xb + f.t / 2, -f.ro, -f.ri, WOOD, 'wood');
    const xt = bladeTopX(f, j);
    if (inside(xt)) strip(v, xt - f.t / 2, xt + f.t / 2, f.ro, f.ri, WOOD, 'wood');
  }

  // ---- bearings: pillow blocks on a pier (lower) and on a wedge of the headwall (upper)
  for (const s of [f.sLow, f.sUp]) {
    const Lh = 4.4 * f.rj;
    const Hb = 1.7 * f.rj;
    const Wh = 5.2 * f.rj;
    strip(v, s - Lh / 2, s + Lh / 2, -Hb, Wh / 2, STEEL, 'steel');
    strip(v, s - Lh * 0.575, s + Lh * 0.575, -Hb, -Hb - 0.02, STEEL, 'steel');
    v.circle(P(s, 0), f.rj, { w: W.thin, fill: COLORS.paper });
  }
  {
    const base = -1.7 * f.rj - 0.02;
    const a = world(f, f.sUp - 0.35, base);
    const b = world(f, f.sUp + 0.35, base);
    poly(v, [W2(a[0], f.headTop), W2(b[0], f.headTop), W2(b[0], b[1]), W2(a[0], a[1])], concrete);
  }

  // ---- the large sprocket, seen edge-on, at the chain plane
  const rs = 0.2265 * f.k;
  strip(v, f.sChain - 0.013, f.sChain + 0.013, -rs, rs, STEEL, 'steel');
  strip(v, f.sChain - 0.045, f.sChain + 0.045, -0.06, 0.06, STEEL, 'steel');

  // ---- free surfaces: tail level (outlet pool) and level of the inlet basin
  v.line(W2(f.poolX0, f.tailY), W2(f.poolX1, f.tailY), { w: W.medium, color: COLORS.water });
  v.line(W2(world(f, f.L, yEnd)[0], f.inletY), W2(f.headX, f.inletY), { w: W.medium, color: COLORS.water });
  for (const [x, y] of [
    [f.poolX0 + 0.35, f.tailY],
    [world(f, f.L, yEnd)[0] + 0.45, f.inletY],
  ] as const) {
    v.polyline([W2(x - 0.12, y + 0.2), W2(x, y), W2(x + 0.12, y + 0.2)], { w: W.thin, color: COLORS.water });
  }
  const [qx, qy] = v.map(W2(f.poolX0 + 0.05, f.tailY + 0.3));
  p.text([qx, qy], l('niveau aval', 'tailwater level'), { size: 1.9, color: COLORS.water, weight: 'bold' });
  v.leader(W2(f.headX - 0.15, f.inletY), 34, -9, l('niveau amont', 'upstream level'), {
    size: 1.9,
    color: COLORS.water,
  });

  // ---- dimensions: the length along the axis (above the blades), the rise of the axis, the slope, the pitch, the tail depth
  const L = dim('SCREW', 'length');
  v.dim(P(0, f.ro + 0.14), P(f.L, f.ro + 0.14), 9, {
    dir: 'aligned',
    label: cat('L = ', labOf(L, 2, '', ' m')),
    size: 2.1,
  });
  const xr = 6.5;
  const yLo = f.y0;
  const yHi = f.y0 + f.L * f.sinB;
  p.line(v.map(W2(0, yLo)), v.map(W2(xr + 0.1, yLo)), { w: W.thin, dash: 'center', color: INK_2 });
  p.line(v.map(W2(f.L * f.cosB, yHi)), v.map(W2(xr + 0.1, yHi)), { w: W.thin, dash: 'center', color: INK_2 });
  const H = dim('DESIGN', 'head');
  v.dim(W2(xr, yLo), W2(xr, yHi), 0, { dir: 'v', label: cat('H = ', labOf(H, 2, '', ' m')), size: 2.1 });
  const [ax, ay] = v.map(P(0, 0));
  p.line([ax - 14, ay], [ax + 26, ay], { w: W.thin, color: INK_2 });
  const sl = dim('SCREW', 'slopeDeg');
  p.polyline(
    Array.from({ length: 11 }, (_, i): Pt => [
      ax + 20 * Math.cos((i / 10) * f.beta),
      ay - 20 * Math.sin((i / 10) * f.beta),
    ]),
    { w: W.thin },
  );
  p.text([ax + 22, ay - 5.5], labOf(sl, 0, '', '°'), { size: 2.1, mono: true, halo: true });
  // the pitch: along the axis between a blade and the one three spacings further on (the same thread)
  const sp = 11;
  v.dim(P(bladeTopX(f, sp), f.ro + 0.04), P(bladeTopX(f, sp + 3), f.ro + 0.04), 2.5, {
    dir: 'aligned',
    label: cat('S = ', labOf(dim('SCREW', 'pitch'), 2, '', ' m')),
    size: 2,
  });
  // the tail depth: water over the lowest point of the trough at the lower end (an extension line to the left, in the pool)
  const [bx, by] = world(f, 0, -f.Rt);
  const dx = bx - 1.0;
  p.line(v.map(W2(bx, by)), v.map(W2(dx - 0.1, by)), { w: W.thin, color: INK_2 });
  v.dim(W2(dx, by), W2(dx, f.tailY), 0, { dir: 'v', label: figLab('tailDepth', '', ' m'), size: 2 });

  // ---- the cut B–B: through the middle of a pocket and through a blade at the top; seen from the upper end, looking down the axis
  const pc = pocketCentreX(f, 10);
  v.sectionMark(P(pc, -f.Ro - 0.2), P(pc, f.ro + 0.2), 'B', -1);

  // ---- balloons: the item numbers of the parts list, with their leaders
  const bl = (id: string, target: Pt, dxp: number, dyp: number): void => {
    const [tx, ty] = v.map(target);
    balloon(v, target, tx + dxp, ty + dyp, n(id));
  };
  bl('trough', P(3.154, -(f.Rt + f.Ro) / 2), 4, 28);
  bl('trapped-water', P(1.645, -0.33), -4, 30);
  bl('lower-bearing', P(f.sLow, 0.0), -12, -22);
  bl('outlet-pool', W2(-1.2, -0.07), 2, -16);
  bl('upper-bearing', P(f.sUp, 0), -5, -15);
  bl('drive-sprocket', P(f.sChain, 0.2), 9, -10);
  bl('inlet-sill', W2(5.3, 1.8), 13, -2);
  bl('blade-module', P(bladeTopX(f, 4), f.ro), -6, -27);
  bl('screw-core', P(0.65, f.ri - f.wall / 2), -28, 2);
  bl('blade-fastener', P(bladeTopX(f, 2) + f.t / 2, f.ri + 0.02), -30, -12);
}

// ------------------------------------------------------------------------------------------------ B: end view

/** The three blades of the cut at the middle of a pocket: 60° either side of the bottom, and straight up (angles from the bottom, counter-clockwise). */
const BLADE_ANGLES = [-60, 60, 180] as const;
const rad = (deg: number): number => deg * (Math.PI / 180);

function endViewB(d: Drawing, v: View): void {
  const f = F;
  const p = d.paper();
  const at = (r: number, deg: number): Pt => [m(r * Math.sin(rad(deg))), m(-r * Math.cos(rad(deg)))];
  const arc = (r: number, a0: number, a1: number, k: number): Pt[] =>
    Array.from({ length: k + 1 }, (_, i) => at(r, a0 + ((a1 - a0) * i) / k));
  // trough: a half pipe with side walls over the axis
  poly(
    v,
    [
      [m(-f.Ro), m(f.wallTop)],
      ...arc(f.Ro, -90, 90, 40),
      [m(f.Ro), m(f.wallTop)],
      [m(f.Rt), m(f.wallTop)],
      ...arc(f.Rt, 90, -90, 40),
      [m(-f.Rt), m(f.wallTop)],
    ],
    concrete,
  );
  // the pocket: water between the two blades at the bottom, from the core to the tip
  poly(v, [...arc(f.ro, -60, 60, 24), ...arc(f.ri, 60, -60, 24)], waterFill);
  // core: a wooden tube, hollow, with the shaft in it
  v.circle([0, 0], m(f.ri), { w: W.medium, fill: WOOD, hatch: 'wood' });
  v.circle([0, 0], m(f.ri - f.wall), { w: W.medium, fill: COLORS.paper });
  v.circle([0, 0], m(f.rj), { w: W.medium, fill: STEEL, hatch: 'steel' });
  v.center([-m(f.Ro) - 60, 0], [m(f.Ro) + 60, 0], 0);
  v.center([0, -m(f.Ro) - 60], [0, m(f.ro) + 60], 0);
  // blades: radial strips whose width grows with the radius (the cut of a helical plate of constant thickness along the axis)
  const wAt = (r: number): number => (f.t * 2 * Math.PI * r) / f.S;
  for (const a of BLADE_ANGLES) {
    const ux = Math.sin(rad(a));
    const uy = -Math.cos(rad(a));
    const corner = (r: number, s: number): Pt => [
      m(r * ux + (s * -uy * wAt(r)) / 2),
      m(r * uy + (s * ux * wAt(r)) / 2),
    ];
    poly(v, [corner(f.ri, -1), corner(f.ro, -1), corner(f.ro, 1), corner(f.ri, 1)], {
      w: W.medium,
      fill: WOOD,
      hatch: 'wood',
    });
    const rootW = 0.05 * f.k;
    poly(v, [corner(f.ri, 1), corner(f.ri + rootW, 1), corner(f.ri + rootW, 1.9), corner(f.ri, 1.9)], {
      w: W.thin,
      fill: STEEL,
    });
  }
  // dimensions: the blade tips and the core, the gap, the sense of rotation
  const dOut = dim('SCREW', 'outerDiameter');
  const dIn = dim('SCREW', 'innerDiameter');
  v.dimDiameter([0, 0], m(f.ro), 22, { label: labOf(dOut, 2, 'Ø', ' m'), size: 2 });
  const yd = 0.1;
  const xd = Math.sqrt(f.ri * f.ri - yd * yd);
  v.dim([-m(xd), m(yd)], [m(xd), m(yd)], 0, { dir: 'h', label: labOf(dIn, 2, 'Ø', ' m'), size: 2 });
  // the three blades are 360° / threads apart: the angle between the two blades of the pocket
  const third = lab(360 / dim('SCREW', 'threads').v, 0, 'R', '', '°');
  const arcA = arc(f.ri + 0.045, -60, 60, 30);
  const ea = v.polyline(arcA, { w: W.thin });
  ea.setAttribute('marker-start', 'url(#arrow)');
  ea.setAttribute('marker-end', 'url(#arrow)');
  p.text(v.map([0, -m(f.ri + 0.045) - 35]), third, {
    size: 1.9,
    mono: true,
    anchor: 'middle',
    baseline: 'top',
    halo: true,
  });
  // labels: the gap, and the sense of rotation seen from the drive end (counter-clockwise), drawn as a small symbol under the trough
  v.leader(at(f.ro, 60), 9, 12, cat(l('jeu ', 'gap '), figLab('gapMm', '', ' mm')), { size: 1.9 });
  const cx = 394;
  const cy = 124;
  const pts = Array.from({ length: 21 }, (_, i): Pt => {
    const a = rad(40 + (i / 20) * 270);
    return [cx + 6 * Math.cos(a), cy - 6 * Math.sin(a)];
  });
  const e = p.polyline(pts, { w: W.medium, color: COLORS.copper });
  e.setAttribute('marker-end', 'url(#arrow)');
  p.text([406, 134.5], l('sens de rotation', 'direction of rotation'), {
    size: 1.8,
    anchor: 'end',
    color: COLORS.copper,
  });
  p.text([406, 138], l('vu du côté entraînement', 'seen from the drive end'), {
    size: 1.7,
    anchor: 'end',
    color: INK_2,
  });
  // balloons
  const bl = (id: string, target: Pt, x: number, y: number): void => balloon(v, target, x, y, n(id));
  bl('trough', [-m(0.47), -m(0.1)], 276, 100);
  bl('screw-core', at(f.ri - f.wall / 2, -135), 292, 50);
  bl('blade-module', [0, m(0.34)], 354, 36);
  bl('blade-fastener', at(f.ri + 0.03, 60 + 6), 380, 66);
  bl('trapped-water', at(0.37, 22), 346, 137);
}

// ------------------------------------------------------------------------------------------------ C: one bucket

function bucketC(d: Drawing, v: View): void {
  const f = F;
  const p = d.paper();
  const x0 = bladeBottomX(f, 0);
  const x1 = bladeBottomX(f, 1);
  const xa = x0 - 0.06;
  const xb = x1 + 0.06;
  const R = (a: number, b: number, c: number, e: number, fill: string, hatch: 'wood' | 'steel' | 'earth') =>
    poly(
      v,
      [
        [m(a), m(c)],
        [m(b), m(c)],
        [m(b), m(e)],
        [m(a), m(e)],
      ],
      { w: W.medium, fill, hatch },
    );
  R(xa, xb, -f.Rt - 0.07 * f.k, -f.Rt, FILL.concrete, 'earth');
  poly(
    v,
    [
      [m(x0 + f.t / 2), m(-f.ro)],
      [m(x1 - f.t / 2), m(-f.ro)],
      [m(x1 - f.t / 2), m(-f.ri)],
      [m(x0 + f.t / 2), m(-f.ri)],
    ],
    waterFill,
  );
  R(xa, xb, -f.ri, -(f.ri - f.wall), WOOD, 'wood');
  const rw = 0.05 * f.k;
  const tw = 0.006 * f.k;
  for (const xc of [x0, x1]) {
    R(xc - f.t / 2, xc + f.t / 2, -f.ro, -f.ri, WOOD, 'wood');
    const x = xc + f.t / 2;
    poly(
      v,
      [
        [m(x), m(-f.ri)],
        [m(x + rw), m(-f.ri)],
        [m(x + rw), m(-f.ri - tw)],
        [m(x + tw), m(-f.ri - tw)],
        [m(x + tw), m(-f.ri - rw)],
        [m(x), m(-f.ri - rw)],
      ],
      { w: W.medium, fill: STEEL, hatch: 'steel' },
    );
  }
  const bolt = 0.016 * f.k;
  const bx = x1 + f.t / 2 + 0.03;
  v.rect([m(bx - bolt / 2), m(-f.ri + f.wall + 0.012)], [m(bx + bolt / 2), m(-f.ri - tw)], { w: W.thin, fill: STEEL });
  v.rect([m(bx - 0.012), m(-f.ri + f.wall + 0.012)], [m(bx + 0.012), m(-f.ri + f.wall + 0.024)], {
    w: W.thin,
    fill: STEEL,
  });
  v.center([m(bx), m(-f.ri + f.wall + 0.04)], [m(bx), m(-f.ri - 0.03)], 0);
  // dimensions: the spacing of the blades, the height of the pocket, the thickness of a blade (arrows outside), the gap
  v.dim([m(x0), m(-f.ro)], [m(x1), m(-f.ro)], -3.2, {
    dir: 'h',
    label: cat('S/3 = ', labOf(dim('SCREW', 'bladeSpacing'), 2, '', ' m')),
    size: 1.9,
  });
  const xr = x0 + f.t / 2 + 0.045;
  v.dim([m(xr), m(-f.ri)], [m(xr), m(-f.ro)], 0, { dir: 'v', label: lab(f.ro - f.ri, 2, 'D', '', ' m'), size: 1.9 });
  const [t0] = v.map([m(x0 - f.t / 2), 0]);
  const [t1] = v.map([m(x0 + f.t / 2), 0]);
  const [, ty] = v.map([0, m(-f.ro + 0.045)]);
  gapDim(p, t0, t1, ty, lab(bladeThickness(f.shape.outerDiameter) * 1000, 0, 'E', '', ' mm'), 'left');
  // the gap is too small to be seen at this scale: said, and measured
  const [gx, gy] = v.map([m(x0 + 0.1), m(-f.ro - 0.001)]);
  p.circle([gx, gy], 0.9, { w: W.thin, color: COLORS.red });
  p.polyline(
    [
      [gx, gy + 0.9],
      [gx, gy + 20],
      [gx + 3, gy + 20],
    ],
    { w: W.thin, color: COLORS.red },
  );
  p.text(
    [gx + 4, gy + 20],
    cat(
      l('jeu ', 'gap '),
      figLab('gapMm', '', ' mm'),
      l(' : trop petit pour se voir à cette échelle', ': too small to be seen at this scale'),
    ),
    { size: 1.7, baseline: 'middle', color: COLORS.red },
  );
  // the pocket slides down the slope
  const [ax, ay] = v.map([m((x0 + x1) / 2), m(-f.ri - 0.075)]);
  arrow(p, [ax + 9, ay], [ax - 9, ay], COLORS.water, W.medium);
  p.text([ax, ay - 2.6], l('la poche descend', 'the pocket goes down'), {
    size: 1.7,
    anchor: 'middle',
    color: COLORS.water,
  });
  p.text([ax, ay + 7.5], cat(l('poche pleine : ', 'full pocket: '), figLab('bucketL', '', ' L')), {
    size: 1.9,
    anchor: 'middle',
    weight: 'bold',
  });
  // balloons
  const bl = (id: string, target: Pt, x: number, y: number): void => balloon(v, target, x, y, n(id));
  bl('blade-module', [m(x0), m(-f.ro + 0.07)], 21, 190);
  bl('trough', [m(xa + 0.02), m(-f.Rt - 0.035)], 21, 222);
  bl('screw-core', [m(xa + 0.03), m(-f.ri + f.wall / 2)], 21, 170);
  bl('blade-fastener', [m(x1 + f.t / 2 + rw * 0.55), m(-f.ri - 0.004)], 105, 164);
  bl('trapped-water', [m(x1 - 0.1), m(-f.ro + 0.08)], 105, 196);
}

// ------------------------------------------------------------------------------------------------ the tables

function partsList(d: Drawing, x: number, y: number): number {
  heading(d, x, y, l('REPÈRES · pièces représentées', 'ITEMS · parts shown'), { size: 2 });
  return (
    y +
    5 +
    grid(
      d,
      x,
      y + 5,
      [
        { label: l('Rep.', 'Item'), w: 9, align: 'middle' },
        { label: l('Désignation', 'Part'), w: 52 },
        { label: l('Matière ou rôle', 'Material or role'), w: 83 },
      ],
      ITEMS.map((id, i) => [{ t: String(i + 1), bold: true }, partOf(id).name, partOf(id).material]),
      { size: 1.75, pad: 0.5, lineH: 2.7 },
    )
  );
}

function rulesTable(d: Drawing, x: number, y: number): number {
  heading(d, x, y, l('D · COTES ET RÈGLES DE CALCUL', 'D · DIMENSIONS AND DESIGN RULES'), { size: 2 });
  const head = labOf(dim('DESIGN', 'head'), 2, '', ' m');
  const slope = labOf(dim('SCREW', 'slopeDeg'), 0, '', '°');
  const flow = labOf(dim('DESIGN', 'flow'), 0, '', ' L/s', 1000);
  const rows: [L, L, L][] = [
    [l('Filets', 'Threads'), num(dim('SCREW', 'threads').v), l('trois, comme dans la vidéo', 'three, as in the video')],
    [
      l('Diamètre extérieur D', 'Outer diameter D'),
      labOf(dim('SCREW', 'outerDiameter'), 2, '', ' m'),
      cat(l('poches pleines, à la vitesse de la règle : ', 'full pockets, at the rule speed: '), flow),
    ],
    [
      l('Diamètre du noyau d', 'Core diameter d'),
      labOf(dim('SCREW', 'innerDiameter'), 2, '', ' m'),
      cat(num(RADIUS_RATIO, 4), l(' × D, l’optimum pour trois filets', ' × D, the optimum for three threads')),
    ],
    [l('Pas S', 'Pitch S'), labOf(dim('SCREW', 'pitch'), 2, '', ' m'), l('égal à D', 'equal to D')],
    [
      l('Pente', 'Slope'),
      slope,
      l('l’angle le plus courant des vis installées', 'the most common angle of installed screws'),
    ],
    [
      l('Longueur L', 'Length L'),
      labOf(dim('SCREW', 'length'), 2, '', ' m'),
      cat('H / sin ', slope, l(' avec H = ', ' with H = '), head),
    ],
    [l('Jeu pale-auge', 'Blade-trough gap'), figLab('gapMm', '', ' mm'), cat(num(GAP_COEFF, 4), ' × √D')],
    [
      l('Vitesse de rotation', 'Rotation speed'),
      labOf(dim('DESIGN', 'screwRpm'), 0, '', l(' tr/min', ' rpm')),
      cat(num(SPEED_RULE_RPM), ' / D^(2/3)'),
    ],
    [
      l('Poche pleine', 'Full pocket'),
      cat(figLab('bucketL', '', ' L'), ' · ', figLab('buckets', '', l(' poches', ' pockets'))),
      l('un godet entre deux pales ; 3 L / S godets en tout', 'a bucket between two blades; 3 L / S buckets in all'),
    ],
    [
      l('Marche entre deux poches', 'Step between two pockets'),
      figLab('stepCm', '', ' cm'),
      cat('S / 3 × sin ', slope),
    ],
  ];
  return (
    y +
    5 +
    grid(
      d,
      x,
      y + 5,
      [
        { label: l('Grandeur', 'Quantity'), w: 36 },
        { label: l('Valeur', 'Value'), w: 31, align: 'end', mono: true },
        { label: l('Comment on la trouve', 'How it is found'), w: 73 },
      ],
      rows.map(([a, b, c]) => [{ t: a, bold: true }, b, c]),
      { size: 1.75, pad: 0.55, lineH: 2.75 },
    )
  );
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
      'Coupe par l’axe, coupe en travers et un godet · règles de calcul publiées',
      'Section along the axis, cross-section and one bucket · published design rules',
    ),
    number: NUMBER,
    scale: `${scaleText(A.scale)} · ${scaleText(B.scale)}`,
  });

  heading(d, 14, 13, l('A · COUPE LONGITUDINALE par l’axe', 'A · LONGITUDINAL SECTION through the axis'), {
    size: 2.2,
  });
  sectionA(d, d.view(A.ox, A.oy, 1 / A.scale));
  caption(d, 130, 146.5, l('COUPE PAR L’AXE', 'SECTION THROUGH THE AXIS'), scaleText(A.scale));

  heading(d, 268, 13, l('B · COUPE B–B au milieu d’une poche', 'B · SECTION B–B across the middle of a pocket'), {
    size: 2.2,
  });
  endViewB(d, d.view(B.ox, B.oy, 1 / B.scale));
  caption(d, 336, 146.5, l('COUPE B–B', 'SECTION B–B'), scaleText(B.scale));

  heading(d, 14, 152, l('C · UN GODET', 'C · ONE BUCKET'), { size: 2.2 });
  bucketC(d, d.view(C.ox, C.oy, 1 / C.scale));
  d.paper().text([64, 242], cat(l('COUPE EN LONG · détail · ', 'LONG SECTION · detail · '), scaleText(C.scale)), {
    size: 1.8,
    anchor: 'middle',
    color: INK_2,
  });

  partsList(d, 120, 152);
  rulesTable(d, 266, 152);
  marksLegend(d, 120, 210, 90);
  box(
    d,
    14,
    248,
    208,
    l('LIRE LA PLANCHE', 'READING THE SHEET'),
    [
      {
        bullet: '1',
        t: l(
          'La coupe A est à la pente réelle ; l’eau, en bleu, est celle des poches pleines, du bassin d’entrée et du bassin de sortie. Chaque poche est une marche : son niveau est plus haut que celui de la poche d’en dessous.',
          'Section A is at the true slope; the water, in blue, is that of the full pockets, the inlet basin and the outlet pool. Each pocket is a step: its level is higher than that of the pocket below.',
        ),
      },
      { bullet: '2', t: EDU_NOTE },
    ],
    { size: 1.8 },
  );
  return d;
}

export const screwSection: DrawingSheet = {
  id: 'screw-section',
  number: NUMBER,
  group: 'screw',
  title: TITLE,
  description: l(
    'Une coupe par l’axe de la vis, à sa pente réelle, montre l’auge, le noyau, les trois filets, les poches d’eau qui descendent comme sur un toboggan, les paliers, le seuil d’entrée et le bassin de sortie. La coupe en travers et le godet donnent la forme des pales et de la poche. Les cotes sont dérivées de règles de calcul publiées ; ce n’est pas un plan de construction.',
    'A section along the axis of the screw, at its true slope, shows the trough, the core, the three threads, the pockets of water that slide down like a slide, the bearings, the inlet sill and the outlet pool. The cross-section and the bucket give the shape of the blades and of a pocket. Dimensions are derived from published design rules; this is not a construction plan.',
  ),
  scene: 'screw',
  parts: ITEMS,
  render,
};

export type { L };
