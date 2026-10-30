import * as THREE from 'three';
import { PSI_OPT } from '../../sim/machine';
import {
  BEARING,
  DEG,
  DRIVE,
  ELECTRONICS,
  GENERATOR,
  PLATFORM,
  POOLS,
  TROUGH,
  hardwareScale,
  journalRadius,
  type ScrewShape,
} from '../dims';
import { bucketLevels, trueGap, type BucketLevels } from './helix';

// Where everything stands in the `screw` world (world frame, see dims.ts): the screw frame is the world frame tilted by the slope about Z and
// moved to A0, the point of the axis at the lower end of the flights. `computeLayout` turns a screw shape into all the positions the
// builders need; it is recomputed when the shape changes. Hardware sizes scale with `k` (dims.hardwareScale).

export interface Layout {
  shape: ScrewShape;
  k: number;
  beta: number;
  cosB: number;
  sinB: number;
  L: number;
  ro: number;
  ri: number;
  /** Radius of the trough inside (blade tip + gap) and outside, m. */
  Rt: number;
  Ro: number;
  /** Height of the side walls of the trough over the axis, m. */
  wallTop: number;
  rj: number;
  /** World height of the axis at the lower end of the flights (the floor is at y = 0). */
  y0: number;
  /** Design tail level (world y), the pool rim, the pool slab thickness. */
  tailY: number;
  poolRimY: number;
  levels: BucketLevels;
  /** Axial positions (screw frame) of the bearings, the chain plane, the belt plane, the end of the shaft. */
  sLow: number;
  sUp: number;
  sChain: number;
  sBelt: number;
  sShaftEnd: number;
  sShaftStart: number;
  /** Outlet pool: x of the open left end and of the right wall, half width. */
  poolX0: number;
  poolX1: number;
  poolHalf: number;
  /** Inlet basin: end of the trough extension along the axis, x of the face of the headwall and its top, thickness. */
  sInletEnd: number;
  headX: number;
  headTop: number;
  headThick: number;
  headHalf: number;
  /** Platform: x range, z range, top height. */
  platX0: number;
  platX1: number;
  platZ0: number;
  platZ1: number;
  platTop: number;
  /** Drive: centres in the section (y', z) from the axis. */
  counterAt: [number, number];
  generatorAt: [number, number];
  /** Generator body: axial range (screw frame). */
  sGenFront: number;
  sGenBack: number;
}

export function computeLayout(shape: ScrewShape): Layout {
  const k = hardwareScale(shape.outerDiameter);
  const beta = shape.slopeDeg * DEG;
  const cosB = Math.cos(beta);
  const sinB = Math.sin(beta);
  const ro = shape.outerDiameter / 2;
  const ri = shape.innerDiameter / 2;
  const Rt = ro + trueGap(shape);
  const Ro = Rt + TROUGH.wall * k;
  const rj = journalRadius(shape.outerDiameter);
  const y0 = POOLS.floorClearance * k + Ro * cosB;
  const levels = bucketLevels(shape);
  const tailY = y0 - Rt * cosB + PSI_OPT * shape.outerDiameter * cosB;
  const L = shape.length;

  const sLow = -BEARING.lowerOffset * k;
  const sUp = L + BEARING.upperOffset * k;
  const sChain = L + DRIVE.chainPlane * k;
  const sBelt = L + DRIVE.beltPlane * k;
  const sGenFront = sBelt + 0.15 * k;
  const sGenBack = sGenFront + GENERATOR.bodyLength * k;
  const generatorY = DRIVE.generatorAt[0] * k;
  const sShaftEnd = sChain + 0.2 * k;
  const sShaftStart = sLow - 0.1 * k;

  // outlet pool: open on the left (the water leaves towards the tailrace), closed on the right by a wall under the trough
  const poolRimY = tailY + 0.45 * k;
  const poolX0 = -POOLS.outletLength * k;
  // where the outer bottom of the trough rises out of the pool: s such that y_bottom(s) = rim - 0.05
  const sOut = (poolRimY - 0.05 - y0 + Ro * cosB) / sinB;
  const poolX1 = sOut * cosB + Ro * sinB;
  const poolHalf = POOLS.outletHalfWidth * k;

  // inlet basin: the trough goes on to the headwall; the face of the wall is vertical, just beyond the top of the last side wall
  const wallTop = ro * TROUGH.sideHeight;
  const sInletEnd = L + POOLS.inletLength * k;
  const headX = sInletEnd * cosB - wallTop * sinB + 0.02;
  const inletFull = y0 + L * sinB + levels.hPass;
  const headTop = inletFull + 0.18 * k;
  const headThick = 0.55 * k;
  const headHalf = Ro + 0.3 * k;

  const platX0 = headX + headThick;
  // the platform carries the bearing, the countershaft and the generator, and lets the cable that leaves it run on to its edge: it ends a metre beyond the generator
  // (`PLATFORM.length`, the longer platform of the first version, had room for the board and the battery that now stand in the powerroom world)
  const xGenBack = (sGenBack + 0.03 * k) * cosB - generatorY * sinB;
  const platX1 = Math.min(platX0 + PLATFORM.length * k, xGenBack + 1.0 * k);
  const platZ0 = -PLATFORM.back * k;
  const platZ1 = PLATFORM.halfWidth * k;
  return {
    shape,
    k,
    beta,
    cosB,
    sinB,
    L,
    ro,
    ri,
    Rt,
    Ro,
    wallTop,
    rj,
    y0,
    tailY,
    poolRimY,
    levels,
    sLow,
    sUp,
    sChain,
    sBelt,
    sShaftEnd,
    sShaftStart,
    poolX0,
    poolX1,
    poolHalf,
    sInletEnd,
    headX,
    headTop,
    headThick,
    headHalf,
    platX0,
    platX1,
    platZ0,
    platZ1,
    platTop: headTop,
    counterAt: [DRIVE.countershaftAt[0] * k, DRIVE.countershaftAt[1] * k],
    generatorAt: [DRIVE.generatorAt[0] * k, DRIVE.generatorAt[1] * k],
    sGenFront,
    sGenBack,
  };
}

/** The point of the screw frame (x', y', z) in the world. */
export function worldPoint(l: Layout, xp: number, yp: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(xp * l.cosB - yp * l.sinB, l.y0 + xp * l.sinB + yp * l.cosB, z);
}

/** World height of the water of the inlet basin for a fill (0 .. 1): a full bucket stands at the lowest saddle; less water lowers the pool. */
export const inletLevel = (l: Layout, fill: number): number =>
  l.y0 + l.L * l.sinB + l.levels.hMin + Math.min(1, Math.max(0, fill)) * (l.levels.hPass - l.levels.hMin);

/** World height of the bottom of the trough (inside) at the axial position s. */
export const troughFloorY = (l: Layout, s: number): number => l.y0 + s * l.sinB - l.Rt * l.cosB;

/** Height of the line of the base plate of a part on the axis (the plane y' = yp of the screw frame) above the world x. */
export const planeY = (l: Layout, yp: number, x: number): number => {
  // the line through A(0) + yp n with the direction u: y = y0 + yp cosB + (x - (-yp sinB)) tanB
  const x0 = -yp * l.sinB;
  return l.y0 + yp * l.cosB + (x - x0) * (l.sinB / l.cosB);
};

export { ELECTRONICS };
