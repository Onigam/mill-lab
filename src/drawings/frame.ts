// The screw in its frame, as the 3D world places it (src/three/screw/layout.ts, helix.ts), without importing three.js: the drawings stay
// out of the 3D chunk. The same formulas, the same constants of dims.ts; drawings.test.ts compares every number with `computeLayout`,
// `bucketLevels` and `pocketSection` of the 3D, so a change there cannot go unnoticed.
//
// Frames (docs/3d.md): the WORLD frame has X horizontal along the screw (the upper end and the drive on the +X side, the water flows towards
// -X), Y up, the floor at y = 0. The SCREW frame is the world frame tilted by the slope and moved to A0, the axis at the lower end of the
// flights: x' along the axis towards the upper end, y' perpendicular to it (up). The section plane is z = 0.
import { BLADES, PSI_OPT } from '../sim/machine';
import { nagelGap } from '../sim/screw';
import {
  BEARING,
  DESIGN_SHAPE,
  DRIVE,
  POOLS,
  TROUGH,
  bladeThickness,
  coreWall,
  hardwareScale,
  journalRadius,
  type ScrewShape,
} from '../three/dims';

const DEG = Math.PI / 180;
const TAU = 2 * Math.PI;

export interface Frame {
  shape: ScrewShape;
  k: number;
  beta: number;
  cosB: number;
  sinB: number;
  /** Length of the flights, pitch, blade spacing along the axis (pitch / threads), blade thickness, core wall: m. */
  L: number;
  S: number;
  spacing: number;
  t: number;
  wall: number;
  /** Outer and inner radius of the blades; inner radius of the trough (blade tip + gap) and outer radius of its concrete; side walls over the axis: m. */
  ro: number;
  ri: number;
  gap: number;
  Rt: number;
  Ro: number;
  wallTop: number;
  rj: number;
  /** World height of the axis at the lower end of the flights, design tail level, rim of the outlet pool. */
  y0: number;
  tailY: number;
  poolRimY: number;
  /** Levels of an empty and of a full bucket in the frame of Rorres, m. */
  hMin: number;
  hPass: number;
  /** Axial positions (screw frame): the two bearings, the chain plane, the belt plane, the ends of the shaft. */
  sLow: number;
  sUp: number;
  sChain: number;
  sBelt: number;
  sShaftEnd: number;
  sShaftStart: number;
  /** Outlet pool: x of the open end and of the right wall, half width. */
  poolX0: number;
  poolX1: number;
  /** Inlet basin: end of the trough extension along the axis, x of the face of the headwall, top and thickness of it. */
  sInletEnd: number;
  headX: number;
  headTop: number;
  headThick: number;
  /** World height of the water of the inlet basin when the pockets are full. */
  inletY: number;
}

/** Levels of an empty and of a full bucket (src/three/screw/helix.ts `bucketLevels`, the formulas of src/sim/bucket.ts). */
export function bucketLevels(shape: ScrewShape): { hMin: number; hPass: number } {
  const ro = shape.outerDiameter / 2;
  const ri = shape.innerDiameter / 2;
  const beta = shape.slopeDeg * DEG;
  const cosB = Math.cos(beta);
  const kr = (shape.pitch * Math.tan(beta)) / TAU;
  const floor = (r: number, phi: number) => r * cosB * (Math.sin(phi) + (kr / r) * phi);
  const rLow = Math.max(ri, kr * 1.0000001);
  let hMin = Infinity;
  let hPass = Infinity;
  const nodes = 200;
  for (let i = 0; i <= nodes; i++) {
    const r = rLow + ((ro - rLow) * i) / nodes;
    const kappa = kr / r;
    if (kappa >= 1) continue;
    const c = Math.acos(-kappa);
    hMin = Math.min(hMin, floor(r, -c));
    hPass = Math.min(hPass, floor(r, c - TAU));
  }
  return { hMin, hPass };
}

export function frameOf(shape: ScrewShape = DESIGN_SHAPE): Frame {
  const k = hardwareScale(shape.outerDiameter);
  const beta = shape.slopeDeg * DEG;
  const cosB = Math.cos(beta);
  const sinB = Math.sin(beta);
  const ro = shape.outerDiameter / 2;
  const ri = shape.innerDiameter / 2;
  const gap = nagelGap(shape.outerDiameter);
  const Rt = ro + gap;
  const Ro = Rt + TROUGH.wall * k;
  const rj = journalRadius(shape.outerDiameter);
  const y0 = POOLS.floorClearance * k + Ro * cosB;
  const { hMin, hPass } = bucketLevels(shape);
  const tailY = y0 - Rt * cosB + PSI_OPT * shape.outerDiameter * cosB;
  const L = shape.length;
  const sLow = -BEARING.lowerOffset * k;
  const sUp = L + BEARING.upperOffset * k;
  const sChain = L + DRIVE.chainPlane * k;
  const sBelt = L + DRIVE.beltPlane * k;
  const sShaftEnd = sChain + 0.2 * k;
  const sShaftStart = sLow - 0.1 * k;
  const poolRimY = tailY + 0.45 * k;
  const poolX0 = -POOLS.outletLength * k;
  const sOut = (poolRimY - 0.05 - y0 + Ro * cosB) / sinB;
  const poolX1 = sOut * cosB + Ro * sinB;
  const wallTop = ro * TROUGH.sideHeight;
  const sInletEnd = L + POOLS.inletLength * k;
  const headX = sInletEnd * cosB - wallTop * sinB + 0.02;
  const inletFull = y0 + L * sinB + hPass;
  const headTop = y0 + L * sinB + hPass + 0.18 * k;
  return {
    shape,
    k,
    beta,
    cosB,
    sinB,
    L,
    S: shape.pitch,
    spacing: shape.pitch / BLADES,
    t: bladeThickness(shape.outerDiameter),
    wall: coreWall(shape.outerDiameter),
    ro,
    ri,
    gap,
    Rt,
    Ro,
    wallTop,
    rj,
    y0,
    tailY,
    poolRimY,
    hMin,
    hPass,
    sLow,
    sUp,
    sChain,
    sBelt,
    sShaftEnd,
    sShaftStart,
    poolX0,
    poolX1,
    sInletEnd,
    headX,
    headTop,
    headThick: 0.55 * k,
    inletY: inletFull,
  };
}

/** The point (x', y') of the screw frame in the world (x, y), metres. */
export const world = (f: Frame, xp: number, yp: number): [number, number] => [
  xp * f.cosB - yp * f.sinB,
  f.y0 + xp * f.sinB + yp * f.cosB,
];

/**
 * The section of ONE pocket by the plane z = 0, in the screw frame at the pocket shift 0 (src/three/screw/helix.ts `pocketSection`): the water
 * between the up-slope face of the lower blade and the next blade (or the level line), from the core to the tip, at the bottom of the trough.
 * `fill` 1 is a full bucket (the level at the lowest saddle).
 */
export function pocketPolygon(f: Frame, fill: number): [number, number][] {
  const th = f.spacing - f.t;
  const level = f.hMin + Math.min(1 - 1e-6, Math.max(0, fill)) * (f.hPass - f.hMin);
  const xl = -f.S / 4 + f.t / 2;
  const xr = (r: number) => Math.max(xl, Math.min(xl + th, (level + r * f.cosB) / f.sinB));
  const poly: [number, number][] = [];
  const n = 6;
  const pts = (from: number, to: number) => {
    for (let i = 0; i <= n; i++) {
      const r = from + ((to - from) * i) / n;
      poly.push([xr(r), -r]);
    }
  };
  if (xr(f.ri) <= xl + 1e-4 && xr(f.ro) <= xl + 1e-4) return [];
  poly.push([xl, -f.ro]);
  pts(f.ro, f.ri);
  poly.push([xl, -f.ri]);
  return poly.filter((p, i) => i === 0 || Math.hypot(p[0] - poly[i - 1]![0], p[1] - poly[i - 1]![1]) > 1e-6);
}

/** Axial position (screw frame) of the centre of the lower blade at the bottom of pocket `p`, and of the pocket's own centre. */
export const bladeBottomX = (f: Frame, j: number): number => -f.S / 4 + j * f.spacing;
export const bladeTopX = (f: Frame, j: number): number => f.S / 4 + j * f.spacing;
export const pocketCentreX = (f: Frame, p: number): number => -f.S / 4 + f.spacing / 2 + p * f.spacing;
