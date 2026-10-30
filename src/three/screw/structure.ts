import * as THREE from 'three';
import { MAT, mesh, pmma } from '@onigam/lab-kit/three';
import { BEARING, COLOURS, PLATFORM, POOLS, TROUGH } from '../dims';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { troughGeometry } from './helix';
import type { Layout } from './layout';

// The concrete and the steel that carry the screw: the trough on its piers, the outlet pool at the lower end, the inlet basin and its
// headwall at the upper end, the platform of the drive, the pillow blocks. Builders return plain objects (groups, meshes) in the world
// frame or the screw frame as said; `scene.ts` puts them in the registered parts and `cut` clips what the section tool cuts.

/** Floor of the world and the top of the concrete pads (a hair above it, so the pads read and nothing fights the paper). */
export const FLOOR_Y = -0.01;
export const BASE_Y = 0.02;

export const concrete = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color: COLOURS.concrete, roughness: 0.95, metalness: 0 });
export const concreteDark = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color: COLOURS.concreteDark, roughness: 0.95, metalness: 0 });

/** A prism through a polygon of the XY plane (world), extruded along Z from z0 to z1. */
export function worldPrism(poly: [number, number][], z0: number, z1: number): THREE.BufferGeometry {
  // the outline must be counter-clockwise for the faces to look outwards
  const area = poly.reduce(
    (a, p, i) => a + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1],
    0,
  );
  const pts = area < 0 ? [...poly].reverse() : poly;
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false });
  g.translate(0, 0, z0);
  return g;
}

/** A box between two corners (world). */
export function boxBetween(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

// ------------------------------------------------------------------------------------------------ the trough

export interface TroughBuild {
  /** In the screw frame. */
  channel: THREE.Mesh;
  /** In the world frame, and the polygons of their section at z = 0. */
  piers: THREE.Mesh;
  pierCaps: [number, number][][];
  /** Section cap polygon of the channel at z = 0, screw frame (x', y'). */
  cap: [number, number][];
}

/** The y of the OUTER bottom line of the trough at the world x (the line the piers carry). */
const outerBottomY = (l: Layout, x: number): number => l.y0 - l.Ro * l.cosB + (x - l.Ro * l.sinB) * (l.sinB / l.cosB);

export function buildTrough(l: Layout): TroughBuild {
  const oh = TROUGH.overhang * l.k;
  const channel = mesh(troughGeometry(l.shape, -oh, l.L + oh), concrete());
  channel.name = 'trough-channel';
  // piers: wedges under the trough, with their top a hair inside the wall (the line of the outer bottom)
  const piers: THREE.BufferGeometry[] = [];
  const pierCaps: [number, number][][] = [];
  const half = 0.45 * l.Ro;
  const w = TROUGH.pierWidth * l.k;
  const sites = [0.9 * l.k, l.L * 0.5, l.L - 0.7 * l.k];
  for (const s of sites) {
    const xc = s * l.cosB + l.Ro * l.sinB;
    const xa = xc - w / 2;
    const xb = xc + w / 2;
    const top = (x: number) => outerBottomY(l, x) + 0.06 * l.k;
    const poly: [number, number][] = [
      [xa, BASE_Y],
      [xb, BASE_Y],
      [xb, top(xb)],
      [xa, top(xa)],
    ];
    pierCaps.push(poly);
    piers.push(worldPrism(poly, -half, half));
  }
  const merged = mergeGeometries(piers, false);
  piers.forEach((p) => p.dispose());
  const pierMesh = mesh(merged, concrete());
  pierMesh.name = 'trough-piers';
  return {
    channel,
    piers: pierMesh,
    pierCaps,
    cap: [
      [-oh, -l.Ro],
      [l.L + oh, -l.Ro],
      [l.L + oh, -l.Rt],
      [-oh, -l.Rt],
    ],
  };
}

// ------------------------------------------------------------------------------------------------ bearings

/** A pillow block with its base plate and two bolts, in a frame where the shaft is along X and up is +Y (centred on the shaft). */
export function pillowBlock(rj: number): { meshes: THREE.Mesh[]; baseY: number } {
  const Lh = BEARING.housingLength * rj;
  const Wh = BEARING.housingWidth * rj;
  const Hb = 1.7 * rj;
  const plate = Math.max(0.01, BEARING.plate * (rj / 0.043));
  const body = MAT.steel();
  const out: THREE.Mesh[] = [];
  out.push(mesh(new THREE.BoxGeometry(Lh * 1.15, plate, Wh * 1.55), MAT.steelBlack(), [0, -Hb - plate / 2, 0]));
  out.push(mesh(new THREE.BoxGeometry(Lh, Hb, Wh), body, [0, -Hb / 2, 0]));
  const dome = new THREE.CylinderGeometry(Wh / 2, Wh / 2, Lh, 24, 1, false, 0, Math.PI);
  dome.rotateZ(Math.PI / 2); // axis along X, the half above the shaft
  out.push(mesh(dome, body, [0, 0, 0]));
  // seal rings on both faces and the grease nipple
  for (const s of [-1, 1]) {
    const ring = new THREE.CylinderGeometry(rj * 1.3, rj * 1.3, Lh * 0.1, 20);
    ring.rotateZ(Math.PI / 2);
    out.push(mesh(ring, MAT.zinc(), [s * (Lh / 2 + Lh * 0.04), 0, 0]));
  }
  out.push(mesh(new THREE.CylinderGeometry(rj * 0.22, rj * 0.22, rj * 0.5, 8), MAT.brass(), [0, Wh / 2 + rj * 0.2, 0]));
  // two bolts on the ears of the base plate
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const bolt = new THREE.CylinderGeometry(rj * 0.28, rj * 0.28, rj * 0.35, 6);
      out.push(mesh(bolt, MAT.zinc(), [sx * Lh * 0.46, -Hb + rj * 0.17, sz * Wh * 0.64]));
    }
  return { meshes: out, baseY: -Hb - plate };
}

/** A wedge of concrete or steel under a part whose base plate lies in the plane y' = yp of the screw frame (world frame prism). */
export function wedge(
  l: Layout,
  sCentre: number,
  halfS: number,
  yp: number,
  zCentre: number,
  halfZ: number,
  bottomY: number,
): THREE.BufferGeometry | null {
  const px = (s: number) => s * l.cosB - yp * l.sinB;
  const py = (s: number) => l.y0 + s * l.sinB + yp * l.cosB;
  const xa = px(sCentre - halfS);
  const xb = px(sCentre + halfS);
  const ya = py(sCentre - halfS);
  const yb = py(sCentre + halfS);
  const bottom = Math.min(bottomY, Math.min(ya, yb) - 0.03);
  if (Math.min(ya, yb) - bottom < 0.02) return null;
  return worldPrism(
    [
      [xa, bottom],
      [xb, bottom],
      [xb, yb],
      [xa, ya],
    ],
    zCentre - halfZ,
    zCentre + halfZ,
  );
}

// ------------------------------------------------------------------------------------------------ outlet pool

export interface PoolBuild {
  slab: THREE.Mesh;
  back: THREE.Mesh;
  wallRight: THREE.Mesh;
  glass: THREE.Mesh;
  /** Section caps at z = 0 (world): the slab strip and the right wall. */
  caps: [number, number][][];
}

export function buildOutletPool(l: Layout): PoolBuild {
  const wall = POOLS.wall * l.k;
  const slab = POOLS.slab * l.k;
  const x0 = l.poolX0;
  const x1 = l.poolX1 + wall;
  const zh = l.poolHalf;
  const rim = l.poolRimY;
  const mat = concrete();
  const floor = mesh(boxGeometry(x0, -slab, -zh - wall, x1, BASE_Y, zh + wall), mat);
  floor.name = 'pool-slab';
  const back = mesh(boxGeometry(x0, BASE_Y, -zh - wall, x1, rim, -zh), concreteDark());
  back.name = 'pool-back';
  const right = mesh(boxGeometry(l.poolX1, BASE_Y, -zh, x1, rim, zh), concrete());
  right.name = 'pool-right';
  const glass = mesh(boxGeometry(x0, BASE_Y, zh, x1, rim, zh + 0.02 * l.k), pmma(0.1));
  glass.castShadow = false;
  glass.userData.noShadow = true;
  glass.name = 'pool-glass';
  return {
    slab: floor,
    back,
    wallRight: right,
    glass,
    caps: [
      [
        [x0, -slab],
        [x1, -slab],
        [x1, BASE_Y],
        [x0, BASE_Y],
      ],
      [
        [l.poolX1, BASE_Y],
        [x1, BASE_Y],
        [x1, rim],
        [l.poolX1, rim],
      ],
    ],
  };
}

const boxGeometry = boxBetween;

// ------------------------------------------------------------------------------------------------ inlet basin

export interface InletBuild {
  /** U channel from the end of the trough to the headwall (screw frame). */
  extension: THREE.Mesh;
  /** Headwall block (world). */
  head: THREE.Mesh;
  /** Section caps: the bottom strip of the extension (screw frame) and the headwall (world). */
  extensionCap: [number, number][];
  headCap: [number, number][];
}

export function buildInlet(l: Layout): InletBuild {
  const oh = TROUGH.overhang * l.k;
  const x0 = l.L + oh;
  const ext = mesh(troughGeometry(l.shape, x0, l.sInletEnd), concrete());
  ext.name = 'inlet-extension';
  const head = mesh(
    boxGeometry(l.headX, BASE_Y, -l.headHalf, l.headX + l.headThick, l.headTop, l.headHalf),
    concreteDark(),
  );
  head.name = 'inlet-headwall';
  return {
    extension: ext,
    head,
    extensionCap: [
      [x0, -l.Ro],
      [l.sInletEnd, -l.Ro],
      [l.sInletEnd, -l.Rt],
      [x0, -l.Rt],
    ],
    headCap: [
      [l.headX, BASE_Y],
      [l.headX + l.headThick, BASE_Y],
      [l.headX + l.headThick, l.headTop],
      [l.headX, l.headTop],
    ],
  };
}

// ------------------------------------------------------------------------------------------------ platform (scenery)

/** The slab that carries the bearing, the countershaft, the generator and the electronics, on concrete posts. Unregistered scenery. */
export function buildPlatform(l: Layout): THREE.Group {
  const g = new THREE.Group();
  g.name = 'platform';
  const slab = PLATFORM.slab * l.k;
  const post = PLATFORM.post * l.k;
  const top = l.platTop;
  g.add(mesh(boxGeometry(l.platX0, top - slab, l.platZ0, l.platX1, top, l.platZ1), concrete()));
  const px = [l.platX0 + post / 2 + 0.05, (l.platX0 + l.platX1) / 2, l.platX1 - post / 2 - 0.05];
  for (const x of px)
    for (const z of [l.platZ0 + post / 2 + 0.05, l.platZ1 - post / 2 - 0.05])
      g.add(
        mesh(boxGeometry(x - post / 2, BASE_Y, z - post / 2, x + post / 2, top - slab, z + post / 2), concreteDark()),
      );
  return g;
}
