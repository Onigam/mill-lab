import * as THREE from 'three';
import { SCENERY, SITE } from '../dims';
import { smoothstep as ss } from '../common';
import { fbm, masonryMaterial, patchDetail, sceneryTextures, vnoise } from './materials';

// The land of the `site` world: a heightfield on a graded grid (fine where the action is, coarse towards the horizon), flat exactly where the
// buildings and the lines stand (SITE.groundY), with the openings of the water cut out of it. The contract with the water: the land leaves
// exactly the rectangles of dims.SITE (river, canal and tailrace in one run, the turn of the tailrace, the quay of the chamber) and the water
// fills them; where an edge is lined (canal, tailrace, chamber: concrete or stone linings up to groundY) the land is flat at groundY, where it
// is not (the river banks, the east bank of the mouth) the land slopes down to a lip that stays over the highest water level of the reach and ends
// in a short earth face; the face is a vertical skirt in the plane of the opening, so there is never a gap or a floating edge, and nothing of the
// land is ever inside an opening. Beyond the river's ends (x = ±160) the river goes on as a far channel under a road bridge and bends away.

const G = SITE.groundY;

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
const R = (x0: number, x1: number, z0: number, z1: number): Rect => ({ x0, x1, z0, z1 });

const c = SITE.canal;
const T = SITE.tailrace;
const ch = SITE.chamber;
const E = SITE.embankment;
const RV = SITE.river;

/** The openings of the water, in plan (the land is cut out of these). */
export const OPENINGS = {
  river: R(RV.xWest, RV.xEast, RV.zNorth, RV.zSouth),
  /** Tailrace, chamber and canal: one run. */
  run: R(T.xEnd, c.xMax, c.zNorth, c.zSouth),
  /** The turn of the tailrace towards the river. */
  turn: R(T.xEnd, T.xEnd + T.width, c.zSouth, E.zSouth),
  /** The mouth of the canal on the river. */
  mouth: R(c.mouthX, c.xMax, c.zSouth, E.zSouth),
  /** The quay in front of the chamber, lowered to SITE.chamber.quayY (a part of the chamber, not land). */
  quay: R(ch.xWest, ch.xEast, c.zSouth, E.zSouth),
} as const;
const HOLES: Rect[] = Object.values(OPENINGS);

const rectDist = (x: number, z: number, r: Rect): number =>
  Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
const inRect = (x: number, z: number, r: Rect, eps = 0): boolean =>
  x > r.x0 + eps && x < r.x1 - eps && z > r.z0 + eps && z < r.z1 - eps;

/** True when (x, z) is inside the plan of an opening of the water, `margin` metres in (negative: out). */
export function insideOpening(x: number, z: number, margin = 0): boolean {
  return HOLES.some((r) => inRect(x, z, r, margin));
}

/** Distance from (x, z) to the nearest opening of the water (0 inside). */
export function openingDistance(x: number, z: number): number {
  let d = Infinity;
  for (const r of HOLES) d = Math.min(d, rectDist(x, z, r));
  return d;
}

// Edges that are not lined: the river (both banks) and the east end of the canal's mouth. The others are lined up to groundY.
const MOUTH_EAST = R(c.xMax, c.xMax, c.zNorth, E.zSouth);
const LINED: Rect[] = [OPENINGS.run, OPENINGS.turn, OPENINGS.quay];

// The structures stand on flat pads at groundY (the buildings are placed there): footprint + margin, in plan.
export const PADS: Rect[] = [
  R(
    SITE.mill.x - SITE.mill.length / 2 - 2.4,
    SITE.mill.x + SITE.mill.length / 2 + 2.4,
    SITE.mill.z - SITE.mill.width / 2 - 2.4,
    SITE.mill.z + SITE.mill.width / 2 + 1.6,
  ),
  R(
    SITE.powerhouse.x - SITE.powerhouse.length / 2 - 1.8,
    SITE.powerhouse.x + SITE.powerhouse.length / 2 + 1.8,
    SITE.powerhouse.z - SITE.powerhouse.width / 2 - 1.8,
    SITE.powerhouse.z + SITE.powerhouse.width / 2 + 1.8,
  ),
  R(
    SITE.house.x - SITE.house.length / 2 - 2.4,
    SITE.house.x + SITE.house.length / 2 + 2.4,
    SITE.house.z - SITE.house.width / 2 - 2.4,
    SITE.house.z + SITE.house.width / 2 + 2.4,
  ),
];

/** Tracks (centre lines, width m): house door to the footbridge, the lane along the canal to the mill yard, the lane east to the road, a path behind the mill. */
export const TRACKS: { pts: [number, number][]; width: number }[] = [
  {
    pts: [
      [3.2, -19.1],
      [3.35, -15],
      [3.1, -11],
      [3.0, -9],
      [3.0, -7.8],
    ],
    width: 1.7,
  },
  {
    pts: [
      [3.0, -3.3],
      [3.0, -1.6],
    ],
    width: 1.5,
  },
  {
    pts: [
      [3.0, -9],
      [-2.5, -8.9],
      [-8.5, -9.2],
      [-12.4, -9.7],
    ],
    width: 2.1,
  },
  {
    pts: [
      [3.0, -9.2],
      [14, -9.6],
      [30, -11.4],
      [60, -15],
      [100, -20],
      [140, -25],
      [161, -31],
    ],
    width: 2.6,
  },
  {
    pts: [
      [-12.4, -9.7],
      [-12.0, -16.5],
      [-22, -17.6],
      [-40, -19.5],
      [-80, -24],
      [-120, -28],
      [-161, -31],
    ],
    width: 2.3,
  },
];

/** The gravel yard round the mill, the powerhouse and in front of the house (rectangles, soft edges). */
export const YARDS: Rect[] = [
  R(-13.6, -6.6, -14.6, -7.9),
  R(-7.4, -2.0, -13.6, -8.2),
  R(0.6, 11.4, -18.7, -15.9),
  R(-24.8, -12.6, -7.7, -6.9),
];

const FAR = {
  east: [
    [160, 6],
    [205, 6.4],
    [255, 9],
    [320, 18],
    [395, 38],
    [480, 75],
    [580, 130],
    [700, 210],
    [840, 320],
    [1000, 470],
    [1190, 650],
    [1400, 880],
    [1650, 1150],
    [1950, 1500],
    [2400, 2000],
  ] as [number, number][],
  west: [
    [-160, 6],
    [-205, 5.6],
    [-255, 3],
    [-320, -6],
    [-395, -26],
    [-480, -62],
    [-580, -118],
    [-700, -198],
    [-840, -308],
    [-1000, -458],
    [-1190, -640],
    [-1400, -870],
    [-1650, -1140],
    [-1950, -1490],
    [-2400, -1990],
  ] as [number, number][],
};

/** The centre line of the far river on a side (+1 east, -1 west): the same points the water ribbon follows. */
export const farPath = (side: 1 | -1): [number, number][] => (side > 0 ? FAR.east : FAR.west);

/** Distance from (x, z) to the centre line of the far river, m. */
function farCentreDistance(x: number, z: number): number {
  const pts = x > 0 ? FAR.east : FAR.west;
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const ex = bx - ax;
    const ez = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
    const d = Math.hypot(ax + ex * t - x, az + ez * t - z);
    if (d < best) best = d;
  }
  return best;
}

/** Half width of the far river at x, m. */
export const farHalf = (x: number): number => SCENERY.farRiver.halfWidth * (1 - 0.35 * ss(200, 1800, Math.abs(x)));

/** Distance from (x, z) to the water: to the openings of the dims (|x| <= 160), to the far river beyond; negative inside the far channel, m. */
export function waterDistance(x: number, z: number): number {
  if (Math.abs(x) <= 160) return openingDistance(x, z);
  return farCentreDistance(x, z) - farHalf(x);
}

/** Distance from a point to the nearest track centre line, m, and the track's half width there. */
export function trackDistance(x: number, z: number): { d: number; half: number } {
  let best = Infinity;
  let half = 1;
  for (const tr of TRACKS) {
    for (let i = 0; i < tr.pts.length - 1; i++) {
      const [ax, az] = tr.pts[i];
      const [bx, bz] = tr.pts[i + 1];
      const ex = bx - ax;
      const ez = bz - az;
      const t = Math.min(1, Math.max(0, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
      const d = Math.hypot(ax + ex * t - x, az + ez * t - z) - tr.width / 2;
      if (d < best) {
        best = d;
        half = tr.width / 2;
      }
    }
  }
  return { d: best, half };
}

/** 1 on a track (soft edge of about 0.6 m), 0 off it. */
export function trackMask(x: number, z: number): number {
  if (x < -170 || x > 170 || z < -42 || z > 1) return 0;
  const { d } = trackDistance(x, z);
  if (d > 1.4) return 0;
  return 1 - ss(-0.2 + 0.25 * (vnoise(x * 1.7, z * 1.7) - 0.5), 0.55, d);
}

/** 1 on the gravel yards (soft edges). */
export function yardMask(x: number, z: number): number {
  if (x < -30 || x > 14 || z < -22 || z > -5) return 0;
  let m = 0;
  for (const r of YARDS) m = Math.max(m, 1 - ss(0, 0.9 + 0.5 * vnoise(x * 1.3, z * 1.3), rectDist(x, z, r)));
  return m;
}

// ------------------------------------------------------------------------------------------------ the height

const rectPad = (x: number, z: number, r: Rect, feather: number): number => 1 - ss(0, feather, rectDist(x, z, r));

/** The ground away from the water: the meadow, rising behind the mill, the wooded hills and the mountains of the horizon. Over `SITE.groundY`, m. */
function relief(x: number, z: number): number {
  const dist = Math.hypot(x + 6, z + 6);
  const ax = Math.abs(x);
  const north = 4.2 * ss(-34, -130, z) + 62 * ss(-120, -720, z);
  const south = 2.4 * ss(36, 170, z) + 70 * ss(150, 820, z);
  const side = 2.6 * ss(180, 330, ax) + 64 * ss(320, 1150, ax);
  const mid = 7 * (fbm(x * 0.011 + 3, z * 0.011 - 5, 3) - 0.45) * 2 * ss(30, 160, dist);
  const rolling = 1.3 * (fbm(x * 0.04 + 8, z * 0.04 + 2, 3) - 0.5) * 2 * ss(10, 70, dist);
  const far = 190 * ss(520, 1900, dist) * (0.5 + 0.9 * fbm(x * 0.0016 + 1.3, z * 0.0016 - 2.2, 3));
  return Math.max(-0.6, north + south + side + mid + rolling + far);
}

/** Level of the land at the edge of an opening on the river's reach at `x`, over the datum. */
function lipAt(x: number, south: boolean): number {
  const w = SITE.weir;
  const toPond = ss(w.x - w.thickness / 2 - 3.4, w.x - w.thickness / 2 - 1.6, x); // 8.2 .. 9.8
  let lip = SCENERY.lip.tailY + (SCENERY.lip.pondY - SCENERY.lip.tailY) * toPond;
  if (south) {
    const p = SITE.fishPass;
    const near = ss(p.xWest - 2.4, p.xWest - 0.6, x) * (1 - ss(p.xEast + 0.6, p.xEast + 2.4, x));
    lip = Math.max(lip, SCENERY.lip.tailY + (SCENERY.lip.passY - SCENERY.lip.tailY) * near);
  }
  return lip;
}

/** Height of the road over the datum along z (the bridge deck between the abutments, ramps to the meadow either side). */
function roadY(z: number): number {
  const D = SCENERY.farRiver.deckY;
  const up = ss(-34, -2.5, z);
  const down = 1 - ss(14.5, 46, z);
  return G + (D - G) * Math.min(up, down);
}

/**
 * Height of the land at (x, z), m over the datum. Defined everywhere; inside an opening it is the lip (the faces under it are the skirts of the
 * mesh). Pure function of the position: the vegetation and the props stand on it.
 */
let lastRelief = 0;
export function terrainHeight(x: number, z: number): number {
  const ax = Math.abs(x);
  const rel = relief(x, z);
  lastRelief = rel;
  // ---- the free ground: relief on a meadow that is flat where the structures stand
  const plateau = Math.max(
    rectPad(x, z, R(SCENERY.plateau.westX, SCENERY.plateau.eastX, SCENERY.plateau.northZ, SCENERY.plateau.southZ), 12),
    rectPad(
      x,
      z,
      R(SCENERY.southFlat.westX, SCENERY.southFlat.eastX, SCENERY.southFlat.northZ, SCENERY.southFlat.southZ),
      22,
    ),
  );
  const micro = 0.14 * (fbm(x * 0.06 + 2, z * 0.06 - 7, 3) - 0.5) * 2;
  let pad = 0;
  for (const p of PADS) pad = Math.max(pad, rectPad(x, z, p, 2.6));
  let dLined = Infinity;
  for (const r of LINED) dLined = Math.min(dLined, rectDist(x, z, r));
  const strip = 1 - ss(1.1, 3.4, dLined);
  const flat = Math.max(pad, strip);
  let free = G + rel * (1 - plateau) + micro * (1 - flat);
  free += (G - free) * flat;

  // ---- the roads over the far river: an embankment either side of the bridge (raised after the banks: the road runs up to the channel)
  let roadH = -Infinity;
  if (ax > 148) {
    const xr = SCENERY.farRiver.bridgeX * Math.sign(x);
    const ry = roadY(z);
    const dxr = Math.abs(x - xr);
    if (ry - free > 0.02 && dxr < SCENERY.farRiver.roadHalf + 2 * (ry - G) + 1.5)
      roadH = ry - Math.max(0, dxr - SCENERY.farRiver.roadHalf) * 0.55;
  }

  // ---- the water: banks that slope down to a lip
  const W = SCENERY.bankWidth * (0.82 + 0.4 * vnoise(x * 0.31 + 4, z * 0.31));
  if (ax <= 160) {
    const south = z > 6;
    const dP = Math.min(rectDist(x, z, OPENINGS.river), rectDist(x, z, MOUTH_EAST));
    let h = free;
    if (dP < W) {
      const lip = lipAt(x, south);
      h = lip + (free - lip) * ss(0, W, dP);
    }
    return dP > 0.2 && roadH > h ? roadH : h;
  }
  // beyond the dims: the far channel (the same lips, a bed under the water, a gentle bank)
  const dc = farCentreDistance(x, z) - farHalf(x);
  const side = x > 0 ? 1 : -1;
  const lip = side > 0 ? SCENERY.lip.pondY : SCENERY.lip.tailY;
  const level = side > 0 ? SCENERY.design.pondY : SCENERY.design.tailY;
  const bed = level - SCENERY.farRiver.bedBelow;
  if (dc <= -2.4) return bed;
  if (dc < 0) return bed + (lip - bed) * ss(-2.4, 0, dc);
  const h = dc < W ? lip + (free - lip) * ss(0, W, dc) : free;
  return roadH > h ? roadH : h;
}

/** Forest cover of the hills, 0..1: the same field colours the land and decides where the trees stand. */
export function forestMask(x: number, z: number, rel = relief(x, z)): number {
  if (rel < 6) return 0;
  const patch = fbm(x * 0.0065 + 5.1, z * 0.0065 - 1.7, 3);
  const near = ss(14, 70, Math.hypot(x + 6, z + 6));
  return ss(6, 34, rel) * ss(0.33, 0.52, patch) * near;
}

// ------------------------------------------------------------------------------------------------ the grid

const FEATURES_X = [
  OPENINGS.turn.x0,
  OPENINGS.turn.x1,
  OPENINGS.quay.x0,
  OPENINGS.quay.x1,
  OPENINGS.mouth.x0,
  OPENINGS.mouth.x1,
  RV.xWest,
  RV.xEast,
  SITE.weir.x - SITE.weir.thickness / 2,
  SITE.weir.x + SITE.weir.thickness / 2,
  SITE.fishPass.xWest,
  SITE.fishPass.xEast,
  8.2,
  9.8,
];
const FEATURES_Z = [c.zNorth, c.zSouth, E.zSouth, RV.zSouth, 6];

function axisLines(
  features: number[],
  core: [number, number],
  coreStep: number,
  fine: number,
  grow: number,
  cap: number,
): number[] {
  const ext = SCENERY.extent;
  const step = (v: number): number => {
    const out = Math.max(core[0] - v, 0, v - core[1]);
    let s = Math.min(cap, coreStep + grow * out);
    let df = Infinity;
    for (const f of features) df = Math.min(df, Math.abs(v - f));
    s = Math.min(s, fine + 0.32 * df);
    return s;
  };
  const out: number[] = [];
  let v = -ext;
  while (v < ext) {
    out.push(v);
    v += step(v);
  }
  out.push(ext);
  // snap the mandatory lines: drop the lines that are too close to one, then add it
  const keep = out.filter((u) => features.every((f) => Math.abs(u - f) > 0.42 * step(f)));
  for (const f of features) keep.push(f);
  keep.sort((a, b) => a - b);
  return keep.filter((u, i) => i === 0 || u - keep[i - 1] > 1e-6);
}

// ------------------------------------------------------------------------------------------------ colours

const col = (hex: number): THREE.Color => new THREE.Color(hex);
const PAL = {
  grassA: col(0x95b65a),
  grassB: col(0x7da34a),
  clover: col(0x6a9444),
  dry: col(0xbdb571),
  bloom: col(0xa9bb62),
  forest: col(0x46623a),
  forestFar: col(0x3b5736),
  rock: col(0x8d8574),
  soil: col(0x8b6e4c),
  track: col(0x9c805b),
  gravel: col(0xb0aa99),
  mud: col(0x5e4c39),
  moss: col(0x58763a),
  road: col(0xa49c8a),
  hedge: col(0x4a6b36),
};
const FIELD_COLOURS = [
  col(0xc7b66b),
  col(0x86a84c),
  col(0x8d7552),
  col(0xa6b45a),
  col(0xd2c25a),
  col(0x76a04f),
  col(0xbfae72),
  col(0x9aa856),
];

export interface ShadeBlob {
  x: number;
  z: number;
  r: number;
  k: number;
}

interface VertexInfo {
  r: number;
  g: number;
  b: number;
  mx: number;
  my: number;
  mz: number;
}

const tmp = new THREE.Color();
const tmp2 = new THREE.Color();
const hash2 = (a: number, b: number): number => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** Colour and ground mix of the land at a point: meadow, dry grass, clover, forest, rock, tracks, yards, the wet band at the water. */
function landColour(
  x: number,
  z: number,
  h: number,
  slope: number,
  dP: number,
  rel: number,
  out: VertexInfo,
  shade: (x: number, z: number) => number,
): void {
  const n1 = fbm(x * 0.018 + 1, z * 0.018 + 9, 3);
  const n2 = fbm(x * 0.07 - 4, z * 0.07 + 3, 2);
  const dryM = ss(0.52, 0.72, fbm(x * 0.033 + 9, z * 0.033 - 3, 2));
  tmp.copy(PAL.grassA).lerp(PAL.grassB, ss(0.35, 0.65, n1));
  tmp.lerp(PAL.clover, ss(0.5, 0.78, n2) * 0.55);
  tmp.lerp(PAL.dry, dryM * 0.7);
  tmp.lerp(PAL.bloom, ss(0.62, 0.8, fbm(x * 0.09 + 20, z * 0.09, 2)) * 0.35);
  let wGrass = 1;
  let wGravel = 0;
  let wSoil = 0;
  // farmland: a patchwork of fields in rotated rectangles on the flat ground away from the site, hedges along their edges
  const fd = Math.hypot(x + 6, z + 6);
  if (fd > 50) {
    const fw = ss(50, 130, fd) * (1 - ss(5, 14, rel)) * (1 - ss(0.3, 0.6, slope));
    if (fw > 0) {
      const ca = Math.cos(0.29);
      const sa = Math.sin(0.29);
      const fu = (x * ca + z * sa) / 85;
      const fv = (-x * sa + z * ca) / 58;
      const iu = Math.floor(fu);
      const iv = Math.floor(fv);
      const h = hash2(iu, iv);
      const crop = FIELD_COLOURS[Math.floor(h * FIELD_COLOURS.length) % FIELD_COLOURS.length];
      if (h > 0.18) {
        tmp.lerp(crop, fw * 0.8);
        // stripes of the plough or the drill along the field
        const stripe = 0.5 + 0.5 * Math.sin((fu * Math.cos(h * 6) + fv * Math.sin(h * 6)) * 85 * 0.5);
        tmp.multiplyScalar(0.94 + 0.1 * stripe * fw);
      }
      const edge = Math.min(fu - iu, 1 - (fu - iu), (fv - iv) * 0.68, (1 - (fv - iv)) * 0.68);
      tmp.lerp(PAL.hedge, fw * (1 - ss(0.0, 0.02, edge)) * 0.85);
    }
  }
  // forest and hills
  const f = forestMask(x, z, rel);
  const far = ss(150, 900, Math.hypot(x, z));
  if (f > 0) {
    tmp2.copy(PAL.forest).lerp(PAL.forestFar, far);
    tmp.lerp(tmp2, f);
    wSoil += 0.0;
  }
  // steep ground: bare earth and rock
  const steep = ss(0.32, 0.62, slope);
  if (steep > 0) {
    tmp.lerp(PAL.rock, steep * 0.65);
    wGravel += steep * 0.7;
    wGrass *= 1 - steep * 0.7;
  }
  // tracks, yards, the road
  const tm = trackMask(x, z);
  if (tm > 0) {
    tmp.lerp(PAL.track, tm * 0.92);
    wSoil += tm;
    wGravel += tm * 0.35;
    wGrass *= 1 - tm;
  }
  const ym = yardMask(x, z);
  if (ym > 0) {
    tmp.lerp(PAL.gravel, ym * 0.95);
    wGravel += ym * 1.2;
    wGrass *= 1 - ym;
  }
  const ax = Math.abs(x);
  if (ax > 150 && Math.abs(x - SCENERY.farRiver.bridgeX * Math.sign(x)) < SCENERY.farRiver.roadHalf + 0.3) {
    const rm =
      1 -
      ss(
        SCENERY.farRiver.roadHalf - 0.4,
        SCENERY.farRiver.roadHalf + 0.5,
        Math.abs(x - SCENERY.farRiver.bridgeX * Math.sign(x)),
      );
    tmp.lerp(PAL.road, rm * 0.9);
    wGravel += rm;
    wGrass *= 1 - rm;
  }
  // the wet band along the water: mud, then moss
  if (dP < 1.6) {
    const wet = 1 - ss(0.05, 1.5, dP + 0.35 * (vnoise(x * 1.4, z * 1.4) - 0.5));
    tmp.lerp(PAL.mud, wet * 0.55);
    tmp.lerp(PAL.moss, ss(0.0, 0.5, dP) * (1 - ss(0.5, 1.5, dP)) * 0.25);
    wSoil += wet * 0.6;
    wGrass *= 1 - wet * 0.6;
  }
  // ambient occlusion: darker at the foot of a wall and under the trees
  const k = shade(x, z);
  const hf = Math.max(0, h);
  void hf;
  out.r = tmp.r * k;
  out.g = tmp.g * k;
  out.b = tmp.b * k;
  const s = wGrass + wGravel + wSoil || 1;
  out.mx = Math.max(0, wGrass) / s;
  out.my = wGravel / s;
  out.mz = wSoil / s;
}

// ------------------------------------------------------------------------------------------------ the mesh

/** The far river as two ribbons of water (a flat colour, the same levels as the design water) that start where the dims end, x = ±160, under the road bridges. */
function farRibbons(): THREE.Mesh {
  const pos: number[] = [];
  const idx: number[] = [];
  for (const side of [1, -1] as const) {
    const pts = farPath(side);
    const y = side > 0 ? SCENERY.design.pondY - 0.01 : SCENERY.design.tailY - 0.01;
    const base = pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const [x, z] = pts[i];
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0];
      let tz = b[1] - a[1];
      const tl = Math.hypot(tx, tz);
      tx /= tl;
      tz /= tl;
      const hw = farHalf(x) + 0.3;
      pos.push(x - tz * hw, y, z + tx * hw, x + tz * hw, y, z - tx * hw);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = base + i * 2;
      // the two points of a pair are the left and the right of the direction of travel; the face looks up
      if (side > 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({
      color: 0x5f97b8,
      roughness: 0.3,
      metalness: 0,
      envMapIntensity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  m.name = 'far-river';
  m.receiveShadow = true;
  m.castShadow = false;
  m.userData.noShadow = true;
  m.frustumCulled = false;
  return m;
}

export interface Terrain {
  group: THREE.Group;
  /** The mesh of the land and the mesh of the walls (stone faces at the quay and at the end of the tailrace). */
  land: THREE.Mesh;
  walls: THREE.Mesh;
  heightAt(x: number, z: number): number;
  vertices: number;
  triangles: number;
  /** Milliseconds of each stage of the build (the first call also makes the textures). */
  ms: Record<string, number>;
}

/** A skirt: a vertical face under an edge of the land, in the plane of the edge, looking into the opening. */
interface Skirt {
  /** Edge from (ax, az) to (bx, bz) on the boundary, with the outward normal pointing into the opening. */
  ax: number;
  az: number;
  bx: number;
  bz: number;
  nx: number;
  nz: number;
  kind: 'bank' | 'wall';
  bottom: number;
  /** Design water level of the reach (for the wet band). */
  water: number;
}

/** Build the land. `blobs` darken the ground under the trees (fake ambient occlusion, baked into the vertex colours). */
export function buildTerrain(blobs: ShadeBlob[] = []): Terrain {
  const t0 = performance.now();
  const tex = sceneryTextures();
  const tTex = performance.now();
  const xs = axisLines(FEATURES_X, [-54, 38], 1.5, 0.8, 0.2, 140);
  const zs = axisLines(FEATURES_Z, [-38, 22], 1.5, 0.8, 0.2, 140);
  const nx = xs.length;
  const nz = zs.length;

  // ---- shading: footprints of the buildings (a darker foot), the trees
  const footprints: Rect[] = [
    R(
      SITE.mill.x - SITE.mill.length / 2,
      SITE.mill.x + SITE.mill.length / 2,
      SITE.mill.z - SITE.mill.width / 2,
      SITE.mill.z + SITE.mill.width / 2,
    ),
    R(
      SITE.powerhouse.x - SITE.powerhouse.length / 2,
      SITE.powerhouse.x + SITE.powerhouse.length / 2,
      SITE.powerhouse.z - SITE.powerhouse.width / 2,
      SITE.powerhouse.z + SITE.powerhouse.width / 2,
    ),
    R(
      SITE.house.x - SITE.house.length / 2,
      SITE.house.x + SITE.house.length / 2,
      SITE.house.z - SITE.house.width / 2,
      SITE.house.z + SITE.house.width / 2,
    ),
  ];
  const shade = (x: number, z: number): number => {
    let k = 1;
    for (const f of footprints) {
      const d = rectDist(x, z, f);
      if (d < 3) k = Math.min(k, 0.66 + 0.34 * ss(0, 3, d));
    }
    for (const b of blobs) {
      const d = Math.hypot(x - b.x, z - b.z);
      if (d < b.r) k = Math.min(k, 1 - b.k * (1 - ss(0.2 * b.r, b.r, d)));
    }
    return k;
  };

  // ---- the lattice
  const tGrid = performance.now();
  const H = new Float32Array(nx * nz);
  const REL = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      H[j * nx + i] = terrainHeight(xs[i], zs[j]);
      REL[j * nx + i] = lastRelief;
    }
  const holeCell = (i: number, j: number): boolean => {
    if (i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) return false;
    const cx = (xs[i] + xs[i + 1]) / 2;
    const cz = (zs[j] + zs[j + 1]) / 2;
    return HOLES.some((r) => inRect(cx, cz, r));
  };
  const hole = new Uint8Array((nx - 1) * (nz - 1));
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) hole[j * (nx - 1) + i] = holeCell(i, j) ? 1 : 0;
  const isHole = (i: number, j: number): boolean =>
    i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1 ? false : hole[j * (nx - 1) + i] === 1;
  // a vertex is used when one of the (up to four) cells around it is land
  const used = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++)
      used[j * nx + i] = !isHole(i - 1, j - 1) || !isHole(i, j - 1) || !isHole(i - 1, j) || !isHole(i, j) ? 1 : 0;

  const tHeights = performance.now();
  // ---- skirts: the boundary edges between a land cell and a hole cell
  const skirts: Skirt[] = [];
  const waterOf = (x: number): number => (x > SITE.weir.x ? SCENERY.design.pondY : SCENERY.design.tailY);
  const classify = (
    mx: number,
    mz: number,
    nxd: number,
    nzd: number,
  ): { kind: 'bank' | 'wall'; bottom: number } | null => {
    const eps = 1e-3;
    const onX = (v: number) => Math.abs(mx - v) < eps;
    const onZ = (v: number) => Math.abs(mz - v) < eps;
    // the far ends of the river: the far channel goes on, no face
    if ((onX(RV.xWest) || onX(RV.xEast)) && mz > RV.zNorth && mz < RV.zSouth) return null;
    // the quay: stone faces down to its top
    if ((onX(OPENINGS.quay.x0) || onX(OPENINGS.quay.x1)) && mz > c.zSouth - eps && mz < E.zSouth)
      return { kind: 'wall', bottom: ch.quayY - 0.06 };
    // lined edges: the lining stands in the opening, the land is flush with its top
    if (onZ(c.zNorth) && mx > OPENINGS.run.x0 && mx < OPENINGS.run.x1) return null;
    if (onZ(c.zSouth) && mx < c.mouthX && nzd < 0) return null;
    // the west end of the tailrace's run is a wall of the land; the turn's two sides are lined
    if (onX(OPENINGS.run.x0) && mz < c.zSouth) return { kind: 'wall', bottom: SITE.ground.bottomY };
    if (onX(OPENINGS.turn.x0) || onX(OPENINGS.turn.x1)) return null;
    // the east end of the canal and its mouth, the banks of the river
    void nxd;
    return { kind: 'bank', bottom: SITE.ground.bottomY };
  };
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      if (isHole(i, j)) continue;
      // west, east, north (z-), south (z+) neighbours: a hole on that side makes a skirt on this cell's edge
      const sides: [number, number, number, number, number, number, number, number][] = [
        [i - 1, j, xs[i], zs[j], xs[i], zs[j + 1], -1, 0],
        [i + 1, j, xs[i + 1], zs[j], xs[i + 1], zs[j + 1], 1, 0],
        [i, j - 1, xs[i], zs[j], xs[i + 1], zs[j], 0, -1],
        [i, j + 1, xs[i], zs[j + 1], xs[i + 1], zs[j + 1], 0, 1],
      ];
      for (const [ni, nj, ax, az, bx, bz, ox, oz] of sides) {
        if (!isHole(ni, nj)) continue;
        const cl = classify((ax + bx) / 2, (az + bz) / 2, ox, oz);
        if (!cl) continue;
        skirts.push({
          ax,
          az,
          bx,
          bz,
          nx: ox,
          nz: oz,
          kind: cl.kind,
          bottom: cl.bottom,
          water: waterOf((ax + bx) / 2),
        });
      }
    }

  const tSk = performance.now();
  // ---- buffers: the lattice, then the skirts
  const info: VertexInfo = { r: 0, g: 0, b: 0, mx: 1, my: 0, mz: 0 };
  const pos: number[] = [];
  const nor: number[] = [];
  const colr: number[] = [];
  const uv: number[] = [];
  const mix: number[] = [];
  const idx: number[] = [];
  const remap = new Int32Array(nx * nz).fill(-1);
  const n = new THREE.Vector3();
  const UV_TILE = 3.6; // metres per tile of the ground detail
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (!used[k]) continue;
      const x = xs[i];
      const z = zs[j];
      const h = H[k];
      // normal: central differences on the lattice; a neighbour inside a hole is replaced by the vertex itself
      const hl = i > 0 && used[k - 1] && !(isHole(i - 1, j - 1) && isHole(i - 1, j)) ? H[k - 1] : h;
      const hr = i < nx - 1 && used[k + 1] && !(isHole(i, j - 1) && isHole(i, j)) ? H[k + 1] : h;
      const hu = j > 0 && used[k - nx] && !(isHole(i - 1, j - 1) && isHole(i, j - 1)) ? H[k - nx] : h;
      const hd = j < nz - 1 && used[k + nx] && !(isHole(i - 1, j) && isHole(i, j)) ? H[k + nx] : h;
      const xl = hl === h && i > 0 ? x : xs[Math.max(0, i - 1)];
      const xr = hr === h && i < nx - 1 ? x : xs[Math.min(nx - 1, i + 1)];
      const zu = hu === h && j > 0 ? z : zs[Math.max(0, j - 1)];
      const zd = hd === h && j < nz - 1 ? z : zs[Math.min(nz - 1, j + 1)];
      const dxs = (hr - hl) / Math.max(1e-6, xr - xl);
      const dzs = (hd - hu) / Math.max(1e-6, zd - zu);
      n.set(-dxs, 1, -dzs).normalize();
      const dP = Math.min(rectDist(x, z, OPENINGS.river), rectDist(x, z, MOUTH_EAST));
      landColour(x, z, h, 1 - n.y, dP, REL[k], info, shade);
      remap[k] = pos.length / 3;
      pos.push(x, h, z);
      nor.push(n.x, n.y, n.z);
      colr.push(info.r, info.g, info.b);
      uv.push(x / UV_TILE, z / UV_TILE);
      mix.push(info.mx, info.my, info.mz);
    }
  const tCol = performance.now();
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      if (isHole(i, j)) continue;
      const a = remap[j * nx + i];
      const b = remap[j * nx + i + 1];
      const cc = remap[(j + 1) * nx + i];
      const d = remap[(j + 1) * nx + i + 1];
      // the diagonal that follows the surface better (the one between the closer heights)
      const ha = H[j * nx + i];
      const hb = H[j * nx + i + 1];
      const hc = H[(j + 1) * nx + i];
      const hd = H[(j + 1) * nx + i + 1];
      if (Math.abs(ha - hd) <= Math.abs(hb - hc)) idx.push(a, cc, d, a, d, b);
      else idx.push(a, cc, b, b, cc, d);
    }

  // ---- skirts
  const wallPos: number[] = [];
  const wallNor: number[] = [];
  const wallIdx: number[] = [];
  const wallUv: number[] = [];
  const topOf = (x: number, z: number) => terrainHeight(x, z);
  const bankRows = (top: number, water: number, bottom: number): number[] => {
    const levels = [top, top - 0.28, water + 0.55, water + 0.22, water - 0.05, water - 0.5, bottom].filter(
      (y) => y < top - 1e-4 || y === top,
    );
    const rows = [...new Set(levels.map((y) => Math.max(bottom, Math.min(top, y))))].sort((p, q) => q - p);
    return rows;
  };
  const skirtColour = (y: number, top: number, water: number, x: number, z: number, o: VertexInfo): void => {
    // a fringe of grass at the lip, earth with roots below, a dark wet band over the water, mud and stones at the foot
    const fringe = 1 - ss(0.0, 0.32, top - y);
    const wet = 1 - ss(water + 0.08, water + 0.75, y);
    tmp.copy(PAL.soil).lerp(PAL.rock, 0.25 * vnoise(x * 2.1, z * 2.1 + y * 3));
    tmp.lerp(PAL.grassB, fringe * 0.85);
    tmp.lerp(PAL.mud, wet * 0.75);
    tmp.lerp(PAL.moss, (1 - ss(0.0, 0.3, Math.abs(y - (water + 0.3)))) * 0.35);
    tmp.multiplyScalar(0.82 + 0.28 * vnoise(x * 3.3 + y * 5, z * 3.3));
    o.r = tmp.r;
    o.g = tmp.g;
    o.b = tmp.b;
    o.mx = fringe * 0.7;
    o.my = 0.35 + 0.2 * wet;
    o.mz = 1 - o.mx;
  };
  for (const s of skirts) {
    const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
    const topA = topOf(s.ax, s.az);
    const topB = topOf(s.bx, s.bz);
    if (s.kind === 'wall') {
      const base = wallPos.length / 3;
      for (const [x, z, top] of [
        [s.ax, s.az, topA],
        [s.bx, s.bz, topB],
      ] as const)
        for (const y of [top, s.bottom]) {
          wallPos.push(x, y, z);
          wallNor.push(s.nx, 0, s.nz);
          wallUv.push(0, 0);
        }
      // order: a-top, a-bottom, b-top, b-bottom: the faces look into the opening
      const dot = -(s.bz - s.az) * s.nx + (s.bx - s.ax) * s.nz;
      const q = dot < 0 ? [0, 2, 1, 1, 2, 3] : [0, 1, 2, 2, 1, 3];
      for (const v of q) wallIdx.push(base + v);
      continue;
    }
    const rowsA = bankRows(topA, s.water, s.bottom);
    const rowsB = bankRows(topB, s.water, s.bottom);
    const rowsAll = [...new Set([...rowsA, ...rowsB])].sort((p, q) => q - p);
    const base = pos.length / 3;
    for (const [x, z, top] of [
      [s.ax, s.az, topA],
      [s.bx, s.bz, topB],
    ] as const)
      for (const y0 of rowsAll) {
        const y = Math.min(top, y0);
        skirtColour(y, top, s.water, x, z, info);
        pos.push(x, y, z);
        nor.push(s.nx, 0, s.nz);
        colr.push(info.r, info.g, info.b);
        const along = (x * Math.abs(s.nz) + z * Math.abs(s.nx)) / UV_TILE;
        uv.push(along, y / UV_TILE);
        mix.push(info.mx, info.my, info.mz);
      }
    const m = rowsAll.length;
    // vertex order: for each end, m rows from the top down
    const flip = -(s.bz - s.az) * s.nx + (s.bx - s.ax) * s.nz > 0 ? 1 : 0;
    for (let r = 0; r < m - 1; r++) {
      const a0 = base + r;
      const a1 = base + r + 1;
      const b0 = base + m + r;
      const b1 = base + m + r + 1;
      if (flip) idx.push(a0, a1, b0, b0, a1, b1);
      else idx.push(a0, b0, a1, a1, b0, b1);
    }
    void len;
  }

  // ---- geometry and materials
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aMix', new THREE.Float32BufferAttribute(mix, 3));
  geo.setIndex(
    pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1),
  );
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  const mat = patchDetail(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: tex.ground,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.35,
    }),
    { tile: UV_TILE, mix: true, macro: 0.113, bump: 2.6 },
  );
  const land = new THREE.Mesh(geo, mat);
  land.name = 'terrain';
  land.receiveShadow = true;
  land.castShadow = false;
  land.userData.noShadow = true;
  land.frustumCulled = false;

  const wgeo = new THREE.BufferGeometry();
  wgeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
  wgeo.setAttribute('normal', new THREE.Float32BufferAttribute(wallNor, 3));
  wgeo.setAttribute('uv', new THREE.Float32BufferAttribute(wallUv, 2));
  wgeo.setIndex(wallIdx);
  const wmat = masonryMaterial('wall', 0xb9b4a8);
  const walls = new THREE.Mesh(wgeo, wmat);
  walls.name = 'terrain-walls';
  walls.receiveShadow = true;
  walls.castShadow = false;
  walls.userData.noShadow = true;

  const group = new THREE.Group();
  group.name = 'ground';
  group.add(land, walls, farRibbons());
  const tEnd = performance.now();
  return {
    ms: {
      textures: tTex - t0,
      grid: tHeights - tGrid,
      edges: tSk - tHeights,
      colours: tCol - tSk,
      rest: tEnd - tCol,
      total: tEnd - t0,
    },
    group,
    land,
    walls,
    heightAt: terrainHeight,
    vertices: pos.length / 3 + wallPos.length / 3,
    triangles: (idx.length + wallIdx.length) / 3,
  };
}
