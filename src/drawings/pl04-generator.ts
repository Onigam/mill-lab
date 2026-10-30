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
import { GENERATOR_DESIGN as D, GENERATOR } from '../three/dims';
import {
  EDU_NOTE_GENERATOR,
  FILL,
  PHASE,
  RED,
  balloon,
  box,
  caption,
  grid,
  heading,
  marksLegend,
  modelTag,
  poly,
} from './draw';
import {
  BELL,
  FOOT_BOTTOM,
  FOOT_HALF_WIDTH,
  FOOT_TOP,
  LEN,
  PHASE_NAMES,
  POLE_PITCH,
  R,
  R_CORE,
  R_MAGNET,
  R_SLOT,
  SHAFT_BACK,
  SHAFT_FRONT,
  STACK,
  coilSidePoly,
  laminationHole,
  magnetPoly,
  polar,
  toothAngle,
  toothElectricalDeg,
  toothPhase,
} from './gen';
import { cat, dim, figLab, k, lab, labOf, num, scaleText } from './geom';
import { drivePoint } from './model';

const NUMBER = 'PL-04';
const TITLE = l('La génératrice en coupe', 'The generator in section');

/** The parts of the `generator` world that this sheet shows, in the order of its item numbers. */
export const ITEMS = [
  'gen-frame',
  'gen-stator',
  'gen-coils',
  'gen-rotor',
  'gen-magnets',
  'gen-shaft',
  'gen-bearings',
  'gen-terminals',
] as const;
const n = (id: (typeof ITEMS)[number]): number => ITEMS.indexOf(id) + 1;
const partOf = (id: string) => PARTS.find((p) => p.id === id)!;
/** What turns in the machine (blue outline), and what does not. */
const TURNS: Record<(typeof ITEMS)[number], boolean> = {
  'gen-frame': false,
  'gen-stator': false,
  'gen-coils': false,
  'gen-rotor': true,
  'gen-magnets': true,
  'gen-shaft': true,
  'gen-bearings': false,
  'gen-terminals': false,
};

/** Where the views stand on the sheet: the scale of each (1:n) and the paper position (mm) of the axis at the front face of the body (A), of the axis (B), of the centre of the machine (E); the developed view C. */
export const LAYOUT = {
  A: { scale: 3, ox: 86, oy: 108 },
  B: { scale: 3, ox: 272, oy: 108 },
  E: { scale: 1, ox: 366, oy: 180, from: 0, to: POLE_PITCH },
  C: { x: 48, y: 194, w: 184, degMm: 184 / 360 },
} as const;

const TURN = COLORS.acN;
const TINT = '#d9dde3';
const fixed = (fill: string = FILL.steel, hatch?: Stroke['hatch'], w: number = W.medium): Stroke => ({
  w,
  fill,
  hatch,
});
const turning = (fill: string = FILL.steel, hatch?: Stroke['hatch'], w: number = W.medium): Stroke => ({
  w,
  color: TURN,
  fill,
  hatch,
});

// ------------------------------------------------------------------------------------------------ A: the section through the axis

/** The geometry of the terminal box in the frame of the machine: x range, y of the floor (the tube), of the top of the cavity and of the lid, m. */
function boxFrame(): { x0: number; x1: number; cx: number; yTop: number; yLid: number; yBot: number } {
  const [bx, by] = GENERATOR.box;
  const cx = LEN * 0.55;
  return { x0: cx - bx / 2, x1: cx + bx / 2, cx, yTop: R + by - D.terminals.wall, yLid: R + by, yBot: R - D.shellWall };
}

function sectionA(v: View): void {
  const m = k;
  const S = D.stator;
  const rect = (x0: number, x1: number, y0: number, y1: number, s: Stroke): void => {
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
  const both = (x0: number, x1: number, r0: number, r1: number, s: Stroke): void => {
    rect(x0, x1, r0, r1, s);
    rect(x0, x1, -r1, -r0, s);
  };
  const seat = D.bearing.outerRadius;
  const rs = GENERATOR.shaftRadius;

  // ---- behind the plane: the teeth and the coils, seen through the slot that the plane cuts at the top and at the bottom
  for (const sg of [1, -1]) {
    rect(STACK.x0, STACK.x1, sg * S.boreRadius, sg * R_SLOT, { w: W.thin, fill: TINT });
    rect(STACK.x0, STACK.x1, sg * D.coil.from, sg * D.coil.to, { w: W.thin, fill: FILL.copper });
    for (const [a, b] of [
      [STACK.x0 - D.coil.overhang, STACK.x0],
      [STACK.x1, STACK.x1 + D.coil.overhang],
    ] as const)
      rect(a, b, sg * D.coil.from, sg * D.coil.to, { w: W.thin, fill: FILL.copper });
  }

  // ---- the frame: tube, cooling ribs, the two end bells (cast aluminium), the boss and the housings of the bearings, the base plate
  both(BELL, LEN - BELL, R - D.shellWall, R, fixed(FILL.steel, 'steel'));
  for (let i = 1; i <= D.ribs.count; i++) {
    const x = (LEN * i) / (D.ribs.count + 1);
    both(x - D.ribs.width / 2, x + D.ribs.width / 2, R, R + D.ribs.height, fixed(FILL.steel, 'steel', W.thin));
  }
  both(0, BELL, seat, R + GENERATOR.bellExtra, fixed(FILL.steel, 'alu'));
  both(LEN - BELL, LEN, seat, R + GENERATOR.bellExtra, fixed(FILL.steel, 'alu'));
  both(-D.seat.bossLength, 0, seat, D.seat.bossRadius, fixed(FILL.steel, 'alu'));
  both(BELL, BELL + D.seat.housingLength, seat, D.seat.housingRadius, fixed(FILL.steel, 'alu'));
  both(LEN - BELL - D.seat.housingLength, LEN - BELL, seat, D.seat.housingRadius, fixed(FILL.steel, 'alu'));
  const fl = GENERATOR.foot[2];
  rect(LEN / 2 - fl / 2, LEN / 2 + fl / 2, FOOT_BOTTOM, FOOT_TOP, fixed(FILL.steel, 'steel'));

  // ---- the stator: the yoke of the stack and its two clamping plates (the teeth are in front of or behind the plane)
  const clamp = 0.003;
  both(STACK.x0 - clamp, STACK.x1 + clamp, R_SLOT, S.outerRadius, fixed(FILL.steel, 'steel'));
  for (const x of [STACK.x0, STACK.x1]) {
    for (const sg of [1, -1]) {
      const [x0, x1] = x === STACK.x0 ? [x - clamp, x] : [x, x + clamp];
      rect(x0, x1, sg * R_SLOT, sg * S.outerRadius, { w: W.thin, fill: FILL.steel });
    }
  }

  // ---- the rotor: the steel core with its two end plates, the magnets (north at the top and at the bottom at rest)
  const plate = 0.004;
  both(STACK.x0, STACK.x1, rs, R_CORE, turning(FILL.steel, 'steel'));
  both(STACK.x0 - plate, STACK.x0, rs, R_CORE + 0.003, turning(FILL.steel, 'steel'));
  both(STACK.x1, STACK.x1 + plate, rs, R_CORE + 0.003, turning(FILL.steel, 'steel'));
  const e = D.rotor.magnetEndClearance;
  both(STACK.x0 + e, STACK.x1 - e, R_CORE, R_MAGNET, turning(FILL.north));
  for (const sg of [1, -1])
    v.text([m((STACK.x0 + STACK.x1) / 2), m(sg * ((R_CORE + R_MAGNET) / 2))], 'N', {
      size: 1.6,
      weight: 'bold',
      anchor: 'middle',
      baseline: 'middle',
    });

  // ---- the shaft: continuous, with its key on the stub and the retaining rings against the bearings
  rect(SHAFT_FRONT, SHAFT_BACK, -rs, rs, turning('#eef0f3', 'steel'));
  rect(
    SHAFT_FRONT + D.shaft.keyFrom,
    SHAFT_FRONT + D.shaft.keyFrom + D.shaft.keyLength,
    rs,
    rs + D.shaft.keyHeight,
    turning(FILL.steel),
  );
  for (const [a, b] of [
    [BELL, BELL + D.shaft.ringWidth],
    [LEN - BELL - D.shaft.ringWidth, LEN - BELL],
  ] as const)
    both(a, b, rs, D.shaft.ringRadius, turning(FILL.steel, undefined, W.thin));

  // ---- the two bearings, one in each bell: outer ring, inner ring, and the balls cut by the plane
  const B = D.bearing;
  const pitchR = (rs + B.ring + (B.outerRadius - B.ring)) / 2;
  for (const x0 of [BELL - B.width, LEN - BELL]) {
    both(x0, x0 + B.width, B.outerRadius - B.ring, B.outerRadius, fixed('#d9dde3', undefined, W.thin));
    both(x0, x0 + B.width, rs, rs + B.ring, turning('#d9dde3', undefined, W.thin));
    for (const sg of [1, -1])
      v.circle([m(x0 + B.width / 2), m(sg * pitchR)], m(B.ballRadius), { w: W.thin, fill: COLORS.paper });
  }

  // ---- the terminal box on the tube: the two end walls, the lid, the block with its three studs (phase A at the plane), the gland and the cable
  const bf = boxFrame();
  const T = D.terminals;
  const bx = GENERATOR.box[0];
  rect(bf.x0, bf.x0 + T.wall, bf.yBot, bf.yTop, fixed('#e6e8e5', 'plastic', W.thin));
  rect(bf.x1 - T.wall, bf.x1, bf.yBot, bf.yTop, fixed('#e6e8e5', 'plastic', W.thin));
  rect(
    bf.cx - (bx * 1.06) / 2,
    bf.cx + (bx * 1.06) / 2,
    bf.yLid - 0.006,
    bf.yLid + 0.006,
    fixed(FILL.steel, 'alu', W.thin),
  );
  const blockY = bf.yBot + 0.02;
  rect(bf.cx - 0.03, bf.cx + 0.03, blockY, blockY + 0.008, fixed('#3b4452', undefined, W.thin));
  rect(
    bf.cx - T.stud,
    bf.cx + T.stud,
    blockY + 0.008,
    blockY + 0.008 + T.studHeight,
    fixed('#d8b04a', undefined, W.thin),
  );
  const gy = blockY + 0.04;
  rect(bf.x1 - T.wall, bf.x1 + 0.015, gy - T.gland, gy + T.gland, fixed('#d8b04a', undefined, W.thin));
  rect(bf.x1 + 0.015, bf.x1 + 0.06, gy - 0.009, gy + 0.009, { w: W.thin, fill: '#2d3034' });
  v.polyline(
    [
      [m(bf.cx), m(blockY + 0.008 + T.studHeight)],
      [m(bf.cx), m(gy)],
      [m(bf.x1 - T.wall), m(gy)],
    ],
    {
      w: W.medium,
      color: PHASE.A,
    },
  );

  // ---- axis, and the plane of the section across the axis
  v.center([m(SHAFT_FRONT) - 12, 0], [m(SHAFT_BACK) + 12, 0], 0);
  v.sectionMark([m(D.section), m(FOOT_BOTTOM - 0.004)], [m(D.section), m(R + GENERATOR.box[1] + 0.014)], 'B', 1);

  // ---- dimensions: the stub and the body above the machine, the stack under it
  const up = (yPoint: number, yPaper: number): number => -(LAYOUT.A.oy - yPoint / LAYOUT.A.scale - yPaper);
  const top = m(R + GENERATOR.bellExtra);
  v.dim([m(SHAFT_FRONT), m(rs)], [0, m(rs)], up(m(rs), 21), {
    dir: 'h',
    label: labOf(dim('GENERATOR', 'stub'), 2, '', ' m'),
    size: 1.9,
  });
  v.dim([0, top], [m(LEN), top], up(top, 21), {
    dir: 'h',
    label: labOf(dim('GENERATOR', 'bodyLength'), 2, '', ' m'),
    size: 1.9,
  });
  v.dim([m(STACK.x0), m(FOOT_BOTTOM)], [m(STACK.x1), m(FOOT_BOTTOM)], 9, {
    dir: 'h',
    label: labOf(dim('GENERATOR_DESIGN', 'stator', 'stack'), 2, '', ' m'),
    size: 1.9,
  });

  // ---- balloons, at the paper positions where the drawing leaves room
  const bl = (id: (typeof ITEMS)[number], target: Pt, bx: number, by: number): void =>
    balloon(v, [m(target[0]), m(target[1])], bx, by, n(id));
  bl('gen-frame', [0.06, R - D.shellWall / 2], 112, 44);
  bl('gen-stator', [STACK.x1 - 0.015, (R_SLOT + S.outerRadius) / 2], 186, 50);
  bl('gen-coils', [STACK.x0 + 0.015, (D.coil.from + D.coil.to) / 2], 104, 70);
  bl('gen-rotor', [STACK.x0 + 0.015, -0.05], 104, 130);
  bl('gen-magnets', [STACK.x1 - 0.02, -(R_CORE + R_MAGNET) / 2], 186, 134);
  bl('gen-shaft', [-0.1, -0.006], 50, 126);
  bl('gen-bearings', [BELL - B.width / 2, -pitchR], 74, 130);
  bl('gen-terminals', [bf.x1 - 0.002, bf.yTop - 0.012], 186, 28);
}

// ------------------------------------------------------------------------------------------------ B: the section across the axis

function sectionB(d: Drawing, v: View): void {
  const m = k;
  const S = D.stator;
  const pts = (ps: Pt[]): Pt[] => ps.map(([x, y]): Pt => [m(x), m(y)]);
  const rs = GENERATOR.shaftRadius;
  const T = D.terminals;
  const [, by, bz] = GENERATOR.box;
  const bf = boxFrame();

  // ---- base plate and terminal box (its side walls and its lid are cut at this x)
  poly(
    v,
    pts([
      [-FOOT_HALF_WIDTH, FOOT_BOTTOM],
      [FOOT_HALF_WIDTH, FOOT_BOTTOM],
      [FOOT_HALF_WIDTH, FOOT_TOP],
      [-FOOT_HALF_WIDTH, FOOT_TOP],
    ]),
    {
      w: W.medium,
      fill: FILL.steel,
      hatch: 'steel',
    },
  );
  for (const sg of [-1, 1]) {
    const z = sg * (bz / 2 - T.wall / 2);
    poly(
      v,
      pts([
        [z - T.wall / 2, 0.14],
        [z + T.wall / 2, 0.14],
        [z + T.wall / 2, bf.yTop],
        [z - T.wall / 2, bf.yTop],
      ]),
      {
        w: W.thin,
        fill: '#e6e8e5',
        hatch: 'plastic',
      },
    );
  }
  poly(
    v,
    pts([
      [-(bz * 1.06) / 2, bf.yLid - 0.006],
      [(bz * 1.06) / 2, bf.yLid - 0.006],
      [(bz * 1.06) / 2, bf.yLid + 0.006],
      [-(bz * 1.06) / 2, bf.yLid + 0.006],
    ]),
    {
      w: W.thin,
      fill: FILL.steel,
      hatch: 'alu',
    },
  );
  void by;

  // ---- frame tube, then the lamination: a steel disc with the star of the slots cut out of it
  v.circle([0, 0], m(R), { w: W.medium, fill: FILL.steel, hatch: 'steel' });
  v.circle([0, 0], m(S.outerRadius), { w: W.thin, fill: FILL.steel, hatch: 'steel' });
  poly(v, pts(laminationHole()), { w: W.medium, fill: COLORS.paper });

  // ---- the coil sides in the slots (two per slot, one of each neighbouring coil), outlined in the colour of their phase
  for (let kk = 0; kk < D.slots; kk++) {
    const psi = toothAngle(kk);
    for (const sg of [1, -1] as const)
      poly(v, pts(coilSidePoly(sg, psi)), {
        w: W.thin,
        color: PHASE[PHASE_NAMES[toothPhase(kk)]!],
        fill: FILL.copper,
        hatch: 'copper',
      });
  }

  // ---- the rotor: the steel core, the magnets (north red, south blue), the shaft
  v.circle([0, 0], m(R_CORE), { w: W.medium, color: TURN, fill: FILL.steel, hatch: 'steel' });
  for (let kk = 0; kk < D.poles; kk++)
    poly(v, pts(magnetPoly(kk)), { w: W.thin, color: TURN, fill: kk % 2 === 0 ? FILL.north : FILL.south });
  v.circle([0, 0], m(rs), { w: W.medium, color: TURN, fill: '#eef0f3', hatch: 'steel' });
  for (let kk = 0; kk < D.poles; kk++) {
    const [tx, ty] = polar((R_CORE + R_MAGNET) / 2, kk * POLE_PITCH);
    v.text([m(tx), m(ty)], kk % 2 === 0 ? 'N' : 'S', {
      size: 1.3,
      weight: 'bold',
      anchor: 'middle',
      baseline: 'middle',
    });
  }
  v.center([-m(R) - 14, 0], [m(R) + 14, 0], 0);
  v.center([0, -m(R) - 12], [0, m(R + 0.056)], 0);

  // ---- the diameter of the frame under the base plate, and the sense of rotation (on the rotor core, clockwise)
  v.dim([-m(R), m(FOOT_BOTTOM)], [m(R), m(FOOT_BOTTOM)], 9, {
    dir: 'h',
    label: cat('Ø', labOf(dim('GENERATOR', 'bodyRadius'), 2, '', ' m', 2)),
    size: 1.9,
  });
  const arr = v.polyline(
    Array.from({ length: 21 }, (_, i): Pt => {
      const a = (30 + (i / 20) * 70) * (Math.PI / 180);
      return [m(0.055) * Math.sin(a), m(0.055) * Math.cos(a)];
    }),
    { w: W.thick, color: COLORS.copper },
  );
  arr.setAttribute('marker-end', 'url(#arrow)');
  const [cx, cy] = v.map([0, 0]);
  d.paper().text([cx + 2, cy - 22], l('tourne', 'turns'), {
    size: 1.7,
    color: COLORS.copper,
    weight: 'bold',
    halo: true,
  });

  // ---- balloons: on a circle round the section (radius 0.176 m), the terminal box on its own
  const toRad = (deg: number): number => deg * (Math.PI / 180);
  const at = (r: number, deg: number): Pt => v.map([m(polar(r, toRad(deg))[0]), m(polar(r, toRad(deg))[1])]);
  const bl = (id: (typeof ITEMS)[number], target: Pt, deg: number): void => {
    const [bx, by] = at(0.176, deg);
    balloon(v, [m(target[0]), m(target[1])], bx, by, n(id));
  };
  const coilMid = coilSidePoly(1, toothAngle(18)).reduce<Pt>((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0]);
  bl('gen-frame', polar(R - 0.004, toRad(228)), 228);
  bl('gen-stator', polar((R_SLOT + S.outerRadius) / 2, toRad(251)), 251);
  bl('gen-magnets', polar((R_CORE + R_MAGNET) / 2, 12 * POLE_PITCH), 272);
  bl('gen-coils', coilMid, 295);
  bl('gen-rotor', polar(0.07, toRad(120)), 120);
  bl('gen-shaft', [0.004, -0.004], 142);
  const [tbx, tby] = v.map([m(bz / 2 + 0.03), m(bf.yTop - 0.02)]);
  balloon(v, [m(bz / 2 - 0.002), m(bf.yTop - 0.03)], tbx, tby, n('gen-terminals'));
}

// ------------------------------------------------------------------------------------------------ E: one tooth, one pole, the air gap

/** The features of detail E that carry a letter, in the order of its key (the sizes are read from dims.ts). */
export const E_KEY = ['gap', 'magnet', 'stem', 'yoke', 'slot'] as const;

function detailE(d: Drawing, v: View): void {
  const m = k;
  const S = D.stator;
  const E = LAYOUT.E;
  const mid = (E.from + E.to) / 2;
  // the picture is turned so that the middle of the wedge is straight up: a point (r, ψ) is at (r sin(ψ − mid), r cos(ψ − mid))
  const P = (r: number, psi: number): Pt => [m(r) * Math.sin(psi - mid), m(r) * Math.cos(psi - mid)];
  const rot = (pt: Pt): Pt => {
    const c = Math.cos(mid);
    const s = Math.sin(mid);
    return [m(pt[0] * c - pt[1] * s), m(pt[0] * s + pt[1] * c)];
  };
  const arc = (r: number, a0: number, a1: number, nn = 12): Pt[] =>
    Array.from({ length: nn + 1 }, (_, i) => P(r, a0 + ((a1 - a0) * i) / nn));
  const hs = S.stem / 2;
  const ua = S.boreRadius + S.shoe;
  const us = ua + S.slope;
  const phiTip = Math.asin(S.tipHalfWidth / S.boreRadius);
  const phiBottom = Math.asin(hs / R_SLOT);
  const ub = Math.sqrt(R_SLOT * R_SLOT - hs * hs);
  const tp = (kk: number, u: number, w: number): Pt => {
    const psi = toothAngle(kk);
    return rot([u * Math.sin(psi) + w * Math.cos(psi), u * Math.cos(psi) - w * Math.sin(psi)]);
  };
  const tipArc = (kk: number, from: number, to: number, nn: number): Pt[] =>
    Array.from({ length: nn + 1 }, (_, i) => {
      const a = from + ((to - from) * i) / nn;
      return tp(kk, S.boreRadius * Math.cos(a), S.boreRadius * Math.sin(a));
    });
  const t0 = toothAngle(0);
  const t1 = toothAngle(1);

  // ---- the lamination in the wedge [0, pole pitch]: from the slot at ψ = 0 round tooth 0 and up to the axis of tooth 1
  const lam: Pt[] = [
    ...arc(S.outerRadius, 0, E.to),
    ...tipArc(1, 0, -phiTip, 3),
    tp(1, ua, -S.tipHalfWidth),
    tp(1, us, -hs),
    tp(1, ub, -hs),
    ...arc(R_SLOT, t1 - phiBottom, t0 + phiBottom, 4),
    tp(0, ub, hs),
    tp(0, us, hs),
    tp(0, ua, S.tipHalfWidth),
    ...tipArc(0, phiTip, -phiTip, 4),
    tp(0, ua, -S.tipHalfWidth),
    tp(0, us, -hs),
    tp(0, ub, -hs),
    ...arc(R_SLOT, t0 - phiBottom, 0, 3),
  ];
  poly(v, lam, { w: W.medium, fill: FILL.steel, hatch: 'steel' });

  // ---- the coil sides in the slots of the wedge
  const sideAt = (kk: number, sg: 1 | -1): Pt[] => {
    const C = D.coil;
    const v0 = hs + C.insulation;
    const v1 = v0 + C.build;
    return [tp(kk, C.from, sg * v0), tp(kk, C.to, sg * v0), tp(kk, C.to, sg * v1), tp(kk, C.from, sg * v1)];
  };
  const coilStroke = (ph: number): Stroke => ({
    w: W.thin,
    color: PHASE[PHASE_NAMES[ph]!],
    fill: FILL.copper,
    hatch: 'copper',
  });
  poly(v, sideAt(0, 1), coilStroke(0));
  poly(v, sideAt(0, -1), coilStroke(0));
  poly(v, sideAt(1, -1), coilStroke(1));

  // ---- the magnets in the wedge: the right half of the north magnet 0, the left half of the south magnet 1 (the wedge is one pole pitch)
  const half = (D.rotor.magnetArc * POLE_PITCH) / 2;
  const mag = (a0: number, a1: number, fill: string): void => {
    poly(v, [...arc(R_MAGNET, a0, a1, 8), ...arc(R_CORE, a1, a0, 8)], { w: W.thin, color: TURN, fill });
  };
  mag(Math.max(E.from, -half), Math.min(E.to, half), FILL.north);
  mag(Math.max(E.from, POLE_PITCH - half), Math.min(E.to, POLE_PITCH + half), FILL.south);
  // the rotor core under them, cut off where the wedge stops
  const coreIn = R_CORE - 0.014;
  poly(v, [...arc(R_CORE, E.from, E.to, 12), ...arc(coreIn, E.to, E.from, 12)], {
    w: W.medium,
    color: TURN,
    fill: FILL.steel,
    hatch: 'steel',
  });
  // the frame tube round the stack
  poly(v, [...arc(R, E.from, E.to, 12), ...arc(S.outerRadius, E.to, E.from, 12)], {
    w: W.medium,
    fill: FILL.steel,
    hatch: 'steel',
  });
  // the edges of the wedge, where the rest of the machine is cut away, and the line of the gap
  for (const psi of [E.from, E.to])
    v.polyline([P(coreIn, psi), P(R, psi)], { w: W.thin, color: INK_2, dash: 'phantom' });
  v.polyline(arc(S.boreRadius - D.gap / 2, E.from, E.to, 12), { w: W.thin, color: RED, dash: 'hidden' });

  // ---- the letters of the key and the numbers of the items, at the edges of the picture (absolute paper positions)
  const p = d.paper();
  const deg = (x: number): number => x * (Math.PI / 180);
  const letter = (key: (typeof E_KEY)[number], at: Pt, ex: number, ey: number): void => {
    const [qx, qy] = v.map(at);
    p.circle([qx, qy], 0.5, { w: 0, fill: INK_2 });
    p.line([qx, qy], [ex, ey], { w: W.thin, color: INK_2 });
    p.rect([ex - 1.7, ey - 1.7], [ex + 1.7, ey + 1.7], { w: W.thin, color: RED, fill: COLORS.paper });
    p.text([ex, ey], String.fromCharCode(97 + E_KEY.indexOf(key)), {
      size: 2,
      weight: 'bold',
      anchor: 'middle',
      baseline: 'middle',
      color: RED,
    });
  };
  letter('gap', P(S.boreRadius - D.gap / 2, deg(17)), 399, 80);
  letter('magnet', P((R_CORE + R_MAGNET) / 2, deg(19)), 399, 92);
  letter('stem', tp(0, (ub + us) / 2 + 0.004, 0), 334, 78);
  letter('yoke', P((R_SLOT + S.outerRadius) / 2, deg(20)), 399, 52);
  letter('slot', P((R_SLOT + ua) / 2 - 0.004, deg(15)), 399, 64);
  const bl = (id: (typeof ITEMS)[number], at: Pt, bx: number, by: number): void => balloon(v, at, bx, by, n(id));
  bl('gen-frame', P((R + S.outerRadius) / 2, deg(3)), 333, 29);
  bl('gen-stator', P(R_SLOT + 0.008, deg(21)), 400, 38);
  bl('gen-coils', tp(0, (D.coil.from + D.coil.to) / 2, -(hs + D.coil.insulation + D.coil.build / 2)), 333, 62);
  bl('gen-magnets', P((R_CORE + R_MAGNET) / 2, deg(4)), 333, 100);
  bl('gen-rotor', P(R_CORE - 0.006, deg(18)), 400, 106);
}

/** The key of detail E: the letter, the feature, its size (an estimate of dims.ts). */
function keyE(d: Drawing, x: number, y: number): number {
  const p = d.paper();
  const S = D.stator;
  const rows: [string, L, L][] = [
    ['gap', l('entrefer', 'air gap'), labOf(dim('GENERATOR_DESIGN', 'gap'), 1, '', ' mm', 1000)],
    [
      'magnet',
      l('épaisseur d’un aimant', 'magnet thickness'),
      labOf(dim('GENERATOR_DESIGN', 'rotor', 'magnetThickness'), 0, '', ' mm', 1000),
    ],
    [
      'stem',
      l('largeur d’une dent', 'width of a tooth'),
      labOf(dim('GENERATOR_DESIGN', 'stator', 'stem'), 1, '', ' mm', 1000),
    ],
    ['yoke', l('culasse', 'yoke'), labOf(dim('GENERATOR_DESIGN', 'stator', 'yoke'), 0, '', ' mm', 1000)],
    ['slot', l('profondeur d’encoche', 'slot depth'), lab((R_SLOT - S.boreRadius) * 1000, 1, 'E', '', ' mm')],
  ];
  rows.forEach(([key, name, val], i) => {
    const yy = y + i * 3.9;
    p.rect([x, yy - 1.5], [x + 3, yy + 1.5], { w: W.thin, color: RED });
    p.text([x + 1.5, yy], String.fromCharCode(97 + E_KEY.indexOf(key as (typeof E_KEY)[number])), {
      size: 1.8,
      weight: 'bold',
      anchor: 'middle',
      baseline: 'middle',
      color: RED,
    });
    p.text([x + 5, yy], name, { size: 1.7, baseline: 'middle' });
    p.text([x + 75, yy], val, { size: 1.7, anchor: 'end', baseline: 'middle', mono: true });
  });
  return y + rows.length * 3.9;
}

// ------------------------------------------------------------------------------------------------ C: magnets and teeth, developed flat

function developed(d: Drawing): void {
  const p = d.paper();
  const C = LAYOUT.C;
  const x0 = C.x;
  const sx = C.degMm;
  const deg = (rad: number): number => (rad * 180) / Math.PI;
  const X = (psi: number): number => x0 + deg(psi) * sx;
  const yM = C.y + 4;
  const hM = 7.5;
  const yT = yM + hM + 4;
  const hT = 9;
  // the scale of the mechanical angle
  for (const a of [0, 90, 180, 270, 360]) {
    p.line([x0 + a * sx, C.y], [x0 + a * sx, C.y + 2], { w: W.thin });
    p.text([x0 + a * sx, C.y - 0.6], lab(a, 0, null, '', '°'), {
      size: 1.6,
      anchor: 'middle',
      mono: true,
      color: INK_2,
    });
  }
  p.line([x0, C.y + 2], [x0 + 360 * sx, C.y + 2], { w: W.thin, color: INK_2 });
  // magnets
  const half = (D.rotor.magnetArc * POLE_PITCH) / 2;
  for (let kk = 0; kk < D.poles; kk++) {
    const c = kk * POLE_PITCH;
    const fill = kk % 2 === 0 ? FILL.north : FILL.south;
    // the magnet at 0° straddles the edge of the unrolled picture: its two halves are at the two ends
    const full = 2 * Math.PI;
    const spans: [number, number][] =
      c - half < 0
        ? [
            [0, c + half],
            [full + c - half, full],
          ]
        : [[c - half, c + half]];
    for (const [a0, a1] of spans) p.rect([X(a0), yM], [X(a1), yM + hM], { w: W.medium, color: TURN, fill });
    p.text([X(c - half < 0 ? (c + half) / 2 : c), yM + hM / 2], kk % 2 === 0 ? 'N' : 'S', {
      size: 2,
      weight: 'bold',
      anchor: 'middle',
      baseline: 'middle',
    });
  }
  // the gap, drawn as a dashed line
  p.line([x0, yM + hM + 2], [x0 + 360 * sx, yM + hM + 2], { w: W.thin, color: RED, dash: 'hidden' });
  // teeth with their coils
  const tw = 2 * Math.asin(D.stator.tipHalfWidth / D.stator.boreRadius);
  for (let kk = 0; kk < D.slots; kk++) {
    const c = toothAngle(kk);
    const col = PHASE[PHASE_NAMES[toothPhase(kk)]!];
    p.rect([X(c - tw / 2), yT], [X(c + tw / 2), yT + hT], { w: W.medium, color: col, fill: FILL.copper });
    p.text([X(c), yT + hT / 2 - 1.3], num(kk + 1), { size: 1.7, weight: 'bold', anchor: 'middle', baseline: 'middle' });
    p.text([X(c), yT + hT / 2 + 2.3], PHASE_NAMES[toothPhase(kk)]!, {
      size: 1.9,
      weight: 'bold',
      anchor: 'middle',
      baseline: 'middle',
      color: col,
    });
    // the electrical angle of the coil, below
    const el = (((deg(c) * (D.poles / 2)) % 360) + 360) % 360;
    p.text([X(c), yT + hT + 3], lab(el, 0, 'E', '', '°'), { size: 1.35, anchor: 'middle', mono: true, color: col });
  }
  // row names
  const row = (y: number, t: L): void => {
    p.text([C.x - 2, y], t, { size: 1.7, anchor: 'end', baseline: 'middle' });
  };
  row(yM + hM / 2 - 1.8, l('aimants', 'magnets'));
  row(yM + hM / 2 + 1.8, l('du rotor', 'of the rotor'));
  row(yT + hT / 2 - 1.8, l('dents et', 'teeth and'));
  row(yT + hT / 2 + 1.8, l('bobines', 'coils'));
  row(yT + hT + 3, l('angle électrique', 'electrical angle'));
}

// ------------------------------------------------------------------------------------------------ D: the winding of one phase

function onePhase(d: Drawing, y: number): void {
  const p = d.paper();
  const x0 = 50;
  const coils = D.slots / D.phases;
  const w = 20;
  const col = PHASE.A;
  const hump = (x: number): void => {
    // four half circles = a coil
    p.line([x, y], [x + 2, y], { w: W.medium, color: col });
    for (let i = 0; i < 4; i++) p.arc([x + 2 + 2.5 + i * 3.4, y], 1.7, 180, 0, { w: W.medium, color: col });
    p.line([x + 2 + 3.4 * 4 - 0.2, y], [x + w, y], { w: W.medium, color: col });
  };
  p.circle([x0 - 4, y], 1.2, { w: W.thin, fill: COLORS.ink });
  p.text([x0 - 4, y + 4.6], l('point neutre', 'star point'), { size: 1.6, anchor: 'middle', color: INK_2 });
  p.line([x0 - 3, y], [x0, y], { w: W.medium, color: col });
  for (let i = 0; i < coils; i++) {
    const x = x0 + i * w;
    hump(x);
    p.text([x + 8, y - 4.4], PHASE_NAMES[0] + String(i + 1), {
      size: 1.7,
      weight: 'bold',
      anchor: 'middle',
      color: col,
    });
    p.text([x + 8, y + 5.2], cat(l('dent ', 'tooth '), num(i * D.phases + 1)), {
      size: 1.45,
      anchor: 'middle',
      color: INK_2,
    });
  }
  const xe = x0 + coils * w;
  p.circle([xe + 3, y], 1.2, { w: W.thin, fill: COLORS.paper, color: col });
  p.text([xe + 6, y], l('borne A', 'terminal A'), { size: 1.7, baseline: 'middle', color: col });
  const first = (ph: number): number => ph + 1;
  p.text(
    [x0, y + 9.2],
    cat(
      l('B : les dents ', 'B: teeth '),
      num(first(1)),
      ', ',
      num(first(1) + D.phases),
      ', …, ',
      num(first(1) + (coils - 1) * D.phases),
      l(' · C : les dents ', ' · C: teeth '),
      num(first(2)),
      ', ',
      num(first(2) + D.phases),
      ', …, ',
      num(first(2) + (coils - 1) * D.phases),
      l(' · les trois phases se joignent au point neutre.', ' · the three phases meet at the star point.'),
    ),
    { size: 1.6, color: INK_2 },
  );
}

// ------------------------------------------------------------------------------------------------ the numbers of the model and of the estimates

/** The model's operating point of the generator (rated speed, torque, rectified voltage and current, power into the battery). */
function modelCard(d: Drawing, x: number, y: number, w: number): number {
  const p = d.paper();
  const dp = drivePoint();
  modelTag(d, x, y, w);
  const rows: [L, L][] = [
    [l('vitesse', 'speed'), lab(dp.generator.rpm, 0, null, '', l(' tr/min', ' rpm'))],
    [l('couple sur l’arbre', 'torque at the shaft'), lab(dp.generator.torque, 0, null, '', ' N·m')],
    [l('tension redressée, à vide', 'rectified voltage, open'), lab(dp.voc, 1, null, '', ' V')],
    [l('courant dans la batterie', 'current into the battery'), lab(dp.current, 0, null, '', ' A')],
    [l('puissance dans la batterie', 'power into the battery'), lab(dp.electric / 1000, 2, null, '', ' kW')],
  ];
  const yy = y + 8.5;
  rows.forEach(([name, val], i) => {
    p.text([x + 1.5, yy + i * 4.6], name, { size: 1.7, baseline: 'middle' });
    p.text([x + w - 1.5, yy + i * 4.6], val, {
      size: 2,
      anchor: 'end',
      baseline: 'middle',
      mono: true,
      weight: 'bold',
      color: RED,
    });
  });
  p.rect([x, y + 5.2], [x + w, yy + rows.length * 4.6 - 1.2], { w: W.thin, color: RED });
  return yy + rows.length * 4.6 - 1.2;
}

/** The design of the machine: what the lab chose, and what follows from it (all estimates, but for the derived voltages). */
function designTable(d: Drawing, x: number, y: number): number {
  const phase = (name: 'genPhaseV' | 'genPhaseA'): L => figLab(name, '', name === 'genPhaseV' ? ' V' : ' A');
  const rows: [L, L][] = [
    [l('pôles (aimants)', 'poles (magnets)'), figLab('genPoles')],
    [l('encoches (dents, bobines)', 'slots (teeth, coils)'), figLab('genSlots')],
    [l('bobines par phase, en série', 'coils per phase, in series'), figLab('genCoilsPerPhase')],
    [l('fréquence à la vitesse nominale', 'frequency at the rated speed'), figLab('genFreq', '', ' Hz')],
    [l('angle électrique entre dents', 'electrical angle between teeth'), lab(toothElectricalDeg(), 0, 'E', '', '°')],
    [l('tension d’une phase (étoile)', 'voltage of a phase (star)'), phase('genPhaseV')],
    [l('courant dans une phase', 'current in a phase'), phase('genPhaseA')],
  ];
  return grid(
    d,
    x,
    y,
    [
      { label: l('Le dessin du labo', 'The lab’s design'), w: 56 },
      { label: l('Valeur', 'Value'), w: 24, align: 'end', mono: true },
    ],
    rows.map(([a, b]) => [a, b]),
    { size: 1.7, pad: 0.45, lineH: 2.7 },
  );
}

// ------------------------------------------------------------------------------------------------ the sheet

function render(): Drawing {
  const d = new Drawing();
  const A = LAYOUT.A;
  const B = LAYOUT.B;
  const E = LAYOUT.E;
  d.frame({
    title: TITLE,
    subtitle: l(
      'Coupe par l’axe, coupe en travers, aimants et dents dépliés, une phase · modèle et estimations',
      'Section along the axis, cross-section, magnets and teeth unrolled, one phase · model, estimates',
    ),
    number: NUMBER,
    scale: `${scaleText(A.scale)} · ${scaleText(E.scale)}`,
  });

  heading(
    d,
    14,
    13,
    l('A · COUPE PAR L’AXE, au milieu d’une encoche', 'A · SECTION ALONG THE AXIS, through the middle of a slot'),
    {
      size: 2.2,
    },
  );
  sectionA(d.view(A.ox, A.oy, 1 / A.scale));
  caption(d, 130, 181, l('COUPE PAR L’AXE', 'SECTION ALONG THE AXIS'), scaleText(A.scale));

  heading(d, 214, 13, l('B · COUPE B–B, en travers', 'B · SECTION B–B, across the axis'), { size: 2.2 });
  sectionB(d, d.view(B.ox, B.oy, 1 / B.scale));
  caption(d, 272, 181, l('COUPE B–B', 'SECTION B–B'), scaleText(B.scale));

  heading(d, 330, 13, l('E · UNE DENT, UN PÔLE', 'E · ONE TOOTH, ONE POLE'), { size: 2.2 });
  detailE(d, d.view(E.ox, E.oy, 1 / E.scale));
  d.paper().text([366, 114], cat(l('DÉTAIL · ', 'DETAIL · '), scaleText(E.scale)), {
    size: 1.8,
    anchor: 'middle',
    color: INK_2,
  });
  keyE(d, 330, 122);
  modelCard(d, 330, 145, 76);

  heading(d, 14, 188, l('C · AIMANTS ET DENTS, dépliés sur un tour', 'C · MAGNETS AND TEETH, unrolled over one turn'), {
    size: 2.2,
  });
  developed(d);
  heading(d, 14, 227, l('D · UNE PHASE : les bobines en série', 'D · ONE PHASE: the coils in series'), { size: 2 });
  onePhase(d, 238);

  heading(d, 238, 186, l('REPÈRES · pièces représentées', 'ITEMS · parts shown'), { size: 2 });
  grid(
    d,
    238,
    190,
    [
      { label: l('Rep.', 'Item'), w: 8, align: 'middle' },
      { label: l('Désignation', 'Part'), w: 28 },
      { label: l('Mouvement', 'Motion'), w: 22 },
    ],
    ITEMS.map((id, i) => [
      { t: String(i + 1), bold: true },
      partOf(id).name,
      id === 'gen-bearings'
        ? l('bague intérieure', 'inner ring')
        : TURNS[id]
          ? { t: l('tourne', 'turns'), color: TURN, bold: true }
          : l('fixe', 'fixed'),
    ]),
    { size: 1.7, pad: 0.4, lineH: 2.6 },
  );
  designTable(d, 330, 188);
  marksLegend(d, 238, 224, 90, [], {
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
          'La coupe A passe par une encoche : les dents et les bobines, derrière le plan, sont teintées, et la culasse est coupée. La coupe B–B est vue du côté de la poulie ; les dents sont numérotées dans le sens horaire, celui où tourne le rotor. Ce qui tourne a un contour bleu ; au repos, un pôle nord est en haut et en bas.',
          'Section A passes through a slot: the teeth and the coils behind the plane are tinted, and the yoke is cut. Section B–B is seen from the pulley side; the teeth are numbered clockwise, the way the rotor turns. What turns has a blue outline; at rest, a north pole is at the top and at the bottom.',
        ),
      },
      {
        bullet: '2',
        t: cat(
          l(
            'Les nombres encadrés de rouge sont des résultats du modèle, pas des mesures. Le modèle ne connaît de la génératrice qu’une constante de tension de ',
            'The numbers boxed in red are model results, not measurements. All the model knows of the generator is a voltage constant of ',
          ),
          figLab('genK', '', l(' V par rad/s et une résistance de ', ' V per rad/s and a resistance of ')),
          figLab(
            'genResistance',
            '',
            l(
              ' Ω : pôles, encoches et entrefer sont dessinés par le labo.',
              ' Ω: poles, slots and air gap are drawn by the lab.',
            ),
          ),
        ),
      },
      {
        bullet: '3',
        t: cat(
          l(
            'Danger : de forts aimants se collent sur l’acier avec une force qui écrase les doigts. Génératrice débranchée, la vis s’emballe et la tension grimpe à ',
            'Danger: strong magnets snap onto steel with a force that crushes fingers. With the generator disconnected, the screw races and the voltage climbs to ',
          ),
          figLab(
            'freeRunVolts',
            '',
            l(' V à vide : jamais sans batterie.', ' V open-circuit: never without the battery.'),
          ),
        ),
      },
      { bullet: '4', t: EDU_NOTE_GENERATOR },
    ],
    { size: 1.7 },
  );
  return d;
}

export const generatorSection: DrawingSheet = {
  id: 'generator-section',
  number: NUMBER,
  group: 'generator',
  title: TITLE,
  description: l(
    'Une machine triphasée à rotor intérieur et aimants collés en surface : un stator feuilleté, avec une bobine sur chaque dent, entoure un rotor d’acier dont les aimants, nord et sud en alternance, passent à quelques millimètres des dents. La coupe par l’axe et la coupe en travers montrent la carcasse, le stator, les bobines, le rotor, les aimants, l’arbre, les roulements et la boîte à bornes ; les aimants et les dents sont aussi dépliés à plat, avec le bobinage d’une phase. Le point de fonctionnement vient du modèle ; le nombre de pôles et d’encoches, l’entrefer et les tailles sont des estimations du labo.',
    'A three-phase machine with an inner rotor and magnets bonded on its surface: a laminated stator, with a coil on every tooth, surrounds a steel rotor whose magnets, north and south in turn, pass a few millimetres from the teeth. The section along the axis and the section across it show the frame, the stator, the coils, the rotor, the magnets, the shaft, the bearings and the terminal box; the magnets and the teeth are also unrolled flat, with the winding of one phase. The operating point comes from the model; the number of poles and slots, the air gap and the sizes are the lab’s estimates.',
  ),
  scene: 'generator',
  parts: [...ITEMS],
  render,
};
