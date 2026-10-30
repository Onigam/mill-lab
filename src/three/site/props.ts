import * as THREE from 'three';
import { SCENERY, SITE } from '../dims';
import { mergeStatic } from '../merge';
import { ashlarMaterial, masonryMaterial, metricUV, woodMaterial } from './materials';
import { terrainHeight, type Rect } from './terrain';

// The props of the `site` world: few, well placed, away from the labels. A dry-stone wall in front of the house and behind it, a paddock fence, the
// footbridge over the canal, the utility poles with their crossarms and insulators, lamps, a bench by the river, barrels and a stack of firewood in
// the mill yard, and the two road bridges under which the river goes on beyond the dims. Repeated pieces are instanced; the rest is merged by
// material (`mergeStatic`). Nothing stands in a water opening: the footbridge is over the canal, its deck above the water.

const G = SITE.groundY;

/** Zones the plants keep out of (the props stand there). */
export const PROP_ZONES: Rect[] = [
  { x0: 13.5, x1: 35, z0: -25.5, z1: -12.5 }, // the paddock
  { x0: -33, x1: 25, z0: -32.6, z1: -29.8 }, // the wall behind the house
  { x0: -0.6, x1: 13, z0: -16.4, z1: -14 }, // the wall in front of the house
  { x0: -13, x1: -10, z0: -15.5, z1: -11.5 }, // the firewood
  { x0: 4.5, x1: 9, z0: -4, z1: 0 }, // the bench by the river
];

const std = (color: number, roughness = 0.9, metalness = 0): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

/** A box between two corners, with its UVs in metres for `tileU` x `tileV` textures. */
function bx(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  mat: THREE.Material,
  tile = 1,
): THREE.Mesh {
  const g = metricUV(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), tile, tile);
  const m = new THREE.Mesh(g, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A cylinder along Y (a post, a pole), with metric UVs. */
function post(
  x: number,
  y0: number,
  z: number,
  y1: number,
  r0: number,
  r1: number,
  sides: number,
  mat: THREE.Material,
): THREE.Mesh {
  const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, sides, 1);
  metricUV(g, 0.8, 0.8);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, (y0 + y1) / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const quatY = (a: number): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);

// ------------------------------------------------------------------------------------------------ poles

/** Wooden poles with a crossarm, two braces and pin insulators; the wires of the scene end on the pole tops (`SITE.groundY + 5.1`). */
function buildPoles(g: THREE.Group, poles: THREE.Vector3[], wood: THREE.Material): void {
  const iron = std(0x2d3033, 0.55, 0.5);
  const ceramic = std(0xd9d2c1, 0.3);
  for (const p of poles) {
    const y0 = terrainHeight(p.x, p.z) - 0.2;
    g.add(post(p.x, y0, p.z, G + 5.2, 0.13, 0.085, 8, wood));
    // crossarm 0.35 m under the top, two braces, three insulators on it and one on the top
    const ya = G + 4.7;
    g.add(bx(p.x - 0.07, ya, p.z - 0.85, p.x + 0.07, ya + 0.1, p.z + 0.85, wood, 0.8));
    for (const s of [-1, 1]) {
      const b = bx(p.x - 0.03, ya - 0.5, p.z - 0.02, p.x + 0.03, ya + 0.04, p.z + 0.02, wood, 0.8);
      b.position.set(p.x, ya - 0.2, p.z + s * 0.35);
      b.rotation.x = -s * 0.75;
      g.add(b);
    }
    for (const z of [-0.78, 0, 0.78]) {
      g.add(post(p.x, ya + 0.1, p.z + z, ya + 0.3, 0.03, 0.045, 7, ceramic));
      g.add(post(p.x, ya + 0.22, p.z + z, ya + 0.26, 0.06, 0.06, 8, ceramic));
    }
    g.add(post(p.x, G + 5.2, p.z, G + 5.4, 0.03, 0.05, 7, ceramic));
    g.add(post(p.x, G + 5.3, p.z, G + 5.34, 0.07, 0.07, 8, ceramic));
    g.add(bx(p.x - 0.05, G + 1.8, p.z - 0.17, p.x + 0.05, G + 2.1, p.z - 0.09, iron)); // a small box on the pole
  }
}

// ------------------------------------------------------------------------------------------------ the footbridge

function buildFootbridge(g: THREE.Group, wood: THREE.Material, darkWood: THREE.Material): void {
  const c = SITE.canal;
  const x0 = 2.4;
  const x1 = 3.6;
  const z0 = c.zNorth - 0.6;
  const z1 = c.zSouth + 0.6;
  const top = G + 0.07;
  // two stringers under the deck, resting on the linings, and the planks across them
  for (const x of [x0 + 0.12, x1 - 0.12]) g.add(bx(x - 0.07, G - 0.1, z0, x + 0.07, G + 0.0, z1, darkWood));
  const n = 17;
  const pitch = (z1 - z0) / n;
  for (let i = 0; i < n; i++)
    g.add(bx(x0, top - 0.06, z0 + i * pitch + 0.012, x1, top, z0 + (i + 1) * pitch - 0.012, wood));
  // handrails: posts every metre, a top rail and a middle rail, on both sides
  for (const x of [x0 + 0.05, x1 - 0.05]) {
    for (let i = 0; i <= 4; i++) {
      const z = z0 + 0.1 + (i * (z1 - z0 - 0.2)) / 4;
      g.add(bx(x - 0.04, top, z - 0.04, x + 0.04, top + 0.98, z + 0.04, darkWood));
    }
    g.add(bx(x - 0.04, top + 0.92, z0, x + 0.04, top + 1.0, z1, darkWood));
    g.add(bx(x - 0.025, top + 0.46, z0, x + 0.025, top + 0.5, z1, darkWood));
  }
  // a stone step at each end, against the linings
  const stone = masonryMaterial('coping', 0xd2ccbf);
  for (const [za, zb] of [
    [z0 - 0.5, z0],
    [z1, z1 + 0.5],
  ])
    g.add(bx(x0 - 0.15, G - 0.1, za, x1 + 0.15, G + 0.05, zb, stone, 1.2));
}

// ------------------------------------------------------------------------------------------------ walls and fences

/** A dry-stone wall along a polyline: stones in the wall, a cap, in segments that follow the land. */
function buildWall(
  g: THREE.Group,
  pts: [number, number][],
  stone: THREE.Material,
  cap: THREE.Material,
  height = 0.85,
): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bxx, bz] = pts[i + 1];
    const len = Math.hypot(bxx - ax, bz - az);
    const steps = Math.max(1, Math.round(len / 3));
    const ang = Math.atan2(bz - az, bxx - ax);
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      const cx = ax + ((bxx - ax) * (t0 + t1)) / 2;
      const cz = az + ((bz - az) * (t0 + t1)) / 2;
      const segLen = (len / steps) * 1.02;
      const y0 =
        Math.min(
          terrainHeight(ax + (bxx - ax) * t0, az + (bz - az) * t0),
          terrainHeight(ax + (bxx - ax) * t1, az + (bz - az) * t1),
        ) - 0.25;
      const body = bx(-segLen / 2, 0, -0.23, segLen / 2, height + 0.25, 0.23, stone, 2.4);
      const capm = bx(-segLen / 2 - 0.01, height + 0.25, -0.28, segLen / 2 + 0.01, height + 0.37, 0.28, cap, 1.2);
      for (const m of [body, capm]) {
        const w = new THREE.Group();
        w.position.set(cx, y0, cz);
        w.quaternion.copy(quatY(-ang));
        // meshes are built around their own centre: lift them to the right height inside the group
        m.position.y += 0;
        w.add(m);
        g.add(w);
      }
    }
  }
}

/** A post-and-rail fence along a polyline, with a gap (a gate opening) given as [from, to] distances along the first segment. */
function buildFence(
  g: THREE.Group,
  loop: [number, number][],
  wood: THREE.Material,
  gap?: { seg: number; from: number; to: number },
): void {
  const postGeo = new THREE.BoxGeometry(0.11, 1.25, 0.11);
  metricUV(postGeo, 0.8, 0.8);
  const posts: THREE.Vector3[] = [];
  for (let i = 0; i < loop.length; i++) {
    const [ax, az] = loop[i];
    const [bxx, bz] = loop[(i + 1) % loop.length];
    const len = Math.hypot(bxx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 2.4));
    const ang = Math.atan2(bz - az, bxx - ax);
    for (let s = 0; s < n; s++) {
      const t0 = s / n;
      const t1 = (s + 1) / n;
      const d0 = len * t0;
      const d1 = len * t1;
      if (gap && gap.seg === i && d1 > gap.from && d0 < gap.to) continue;
      const px = ax + (bxx - ax) * t0;
      const pz = az + (bz - az) * t0;
      posts.push(new THREE.Vector3(px, terrainHeight(px, pz) - 0.35, pz));
      const mx = ax + ((bxx - ax) * (t0 + t1)) / 2;
      const mz = az + ((bz - az) * (t0 + t1)) / 2;
      const segLen = (len / n) * 0.98;
      for (const yy of [0.55, 0.98]) {
        const rail = bx(-segLen / 2, -0.04, -0.025, segLen / 2, 0.04, 0.025, wood, 0.8);
        const grp = new THREE.Group();
        grp.position.set(mx, terrainHeight(mx, mz) + yy, mz);
        grp.quaternion.copy(quatY(-ang));
        grp.add(rail);
        g.add(grp);
      }
    }
    const lx = bxx;
    const lz = bz;
    if (!(gap && gap.seg === i && len <= gap.to)) posts.push(new THREE.Vector3(lx, terrainHeight(lx, lz) - 0.35, lz));
  }
  const im = new THREE.InstancedMesh(postGeo, wood, posts.length);
  const m4 = new THREE.Matrix4();
  posts.forEach((p, i) => {
    m4.makeTranslation(p.x, p.y + 0.625 + 0.35, p.z);
    im.setMatrixAt(i, m4);
  });
  im.castShadow = true;
  im.receiveShadow = true;
  im.frustumCulled = false;
  g.add(im);
}

// ------------------------------------------------------------------------------------------------ small things

function buildLamp(g: THREE.Group, x: number, z: number): void {
  const iron = std(0x2b2e31, 0.5, 0.55);
  const glass = new THREE.MeshStandardMaterial({ color: 0xf1ead2, roughness: 0.2, emissive: 0x000000 });
  const y = terrainHeight(x, z);
  g.add(post(x, y - 0.1, z, y + 3.4, 0.07, 0.045, 8, iron));
  g.add(post(x, y, z, y + 0.35, 0.11, 0.08, 8, iron));
  g.add(bx(x - 0.05, y + 3.3, z - 0.02, x + 0.55, y + 3.36, z + 0.02, iron));
  g.add(bx(x + 0.36, y + 3.0, z - 0.14, x + 0.64, y + 3.3, z + 0.14, glass));
  g.add(bx(x + 0.32, y + 3.3, z - 0.18, x + 0.68, y + 3.4, z + 0.18, iron));
  g.add(bx(x + 0.34, y + 2.94, z - 0.16, x + 0.66, y + 3.0, z + 0.16, iron));
}

function buildBench(g: THREE.Group, x: number, z: number, wood: THREE.Material, darkWood: THREE.Material): void {
  const y = terrainHeight(x, z + 0.1);
  g.add(bx(x - 0.8, y + 0.42, z - 0.22, x + 0.8, y + 0.47, z + 0.2, wood));
  g.add(bx(x - 0.8, y + 0.72, z - 0.26, x + 0.8, y + 0.8, z - 0.2, wood));
  g.add(bx(x - 0.8, y + 0.88, z - 0.26, x + 0.8, y + 0.96, z - 0.2, wood));
  for (const s of [-1, 1]) {
    g.add(bx(x + s * 0.7 - 0.04, y - 0.1, z - 0.24, x + s * 0.7 + 0.04, y + 0.42, z + 0.2, darkWood));
    g.add(bx(x + s * 0.7 - 0.04, y + 0.45, z - 0.28, x + s * 0.7 + 0.04, y + 0.98, z - 0.2, darkWood));
  }
}

/** Barrels (one instanced mesh) and a stack of firewood (instanced logs) in the mill yard. */
function buildYardThings(g: THREE.Group, wood: THREE.Material): void {
  // a barrel: a lathe with a belly, iron hoops drawn as slightly bigger rings in the same mesh
  const pts: THREE.Vector2[] = [];
  const prof = [0.26, 0.3, 0.325, 0.33, 0.325, 0.3, 0.26];
  prof.forEach((r, i) => pts.push(new THREE.Vector2(r, (i / (prof.length - 1)) * 0.9)));
  const barrelGeo = new THREE.LatheGeometry(pts, 14);
  metricUV(barrelGeo, 0.8, 0.8);
  const barrels = new THREE.InstancedMesh(barrelGeo, wood, 4);
  const m4 = new THREE.Matrix4();
  const spots: [number, number][] = [
    [-11.2, -8.5],
    [-10.5, -8.7],
    [-11.0, -9.3],
    [-8.6, -13.2],
  ];
  spots.forEach(([x, z], i) => {
    m4.compose(new THREE.Vector3(x, terrainHeight(x, z), z), quatY(i * 1.3), new THREE.Vector3(1, 1, 1));
    barrels.setMatrixAt(i, m4);
  });
  barrels.castShadow = true;
  barrels.receiveShadow = true;
  barrels.frustumCulled = false;
  g.add(barrels);
  // firewood against the north-east corner of the mill: rows of logs, ends towards the visitor (south)
  const logGeo = new THREE.CylinderGeometry(0.075, 0.08, 0.9, 7, 1).rotateX(Math.PI / 2);
  metricUV(logGeo, 0.8, 0.8);
  const rows = 8;
  const cols = 9;
  const logs = new THREE.InstancedMesh(logGeo, wood, rows * cols);
  let k = 0;
  const x0 = -12.25;
  const z0 = -14.6;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * 0.155 + (r % 2) * 0.078 + 0.02 * Math.sin(r * 7 + c);
      const y = terrainHeight(x0, z0) + 0.085 + r * 0.145;
      m4.compose(
        new THREE.Vector3(x, y, z0 + 0.04 * Math.sin(c * 3 + r)),
        quatY(0.05 * Math.sin(r * 3 + c * 5)),
        new THREE.Vector3(1, 1, 1),
      );
      logs.setMatrixAt(k++, m4);
    }
  logs.castShadow = true;
  logs.receiveShadow = true;
  logs.frustumCulled = false;
  g.add(logs);
  // two uprights keep the stack
  const dark = std(0x5b4733);
  for (const x of [x0 - 0.1, x0 + cols * 0.155 + 0.05])
    g.add(bx(x - 0.04, terrainHeight(x0, z0), z0 - 0.4, x + 0.04, terrainHeight(x0, z0) + 1.3, z0 - 0.32, dark));
}

// ------------------------------------------------------------------------------------------------ all of it

export interface Props {
  group: THREE.Group;
}

export function buildProps(opts: { poles: THREE.Vector3[] }): Props {
  const group = new THREE.Group();
  group.name = 'props-built';
  const wood = woodMaterial(0xb9ab92, 0.9);
  const darkWood = woodMaterial(0x7b6850, 0.9);
  const poleWood = woodMaterial(0x7a6a58, 0.95);
  const stone = masonryMaterial('wall', 0xcfcabd);
  const cap = masonryMaterial('coping', 0xd9d3c6);
  buildPoles(group, opts.poles, poleWood);
  buildFootbridge(group, wood, darkWood);
  buildWall(
    group,
    [
      [0.2, -15.2],
      [2.3, -15.2],
    ],
    stone,
    cap,
    0.8,
  );
  buildWall(
    group,
    [
      [4.4, -15.2],
      [12.4, -15.2],
    ],
    stone,
    cap,
    0.8,
  );
  buildWall(
    group,
    [
      [-32, -31.2],
      [-2.2, -31.2],
    ],
    stone,
    cap,
    0.95,
  );
  buildWall(
    group,
    [
      [0.6, -31.2],
      [24, -31.2],
    ],
    stone,
    cap,
    0.95,
  );
  buildFence(
    group,
    [
      [15, -14],
      [34, -14],
      [34, -24.5],
      [15, -24.5],
    ],
    wood,
    { seg: 0, from: 6.5, to: 8.4 },
  );
  buildLamp(group, 4.6, -9.9);
  buildLamp(group, -9.6, -9.9);
  buildBench(group, 6.4, -1.7, wood, darkWood);
  buildYardThings(group, darkWood);
  mergeStatic(group, { name: 'props' });
  return { group };
}

// ------------------------------------------------------------------------------------------------ the road bridges

/** The two road bridges under which the river goes on beyond the dims (x = ±bridgeX): a deck, stone parapets, a dark underside. */
export function buildBridges(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'bridges';
  const stone = masonryMaterial('wall', 0xc9c4b7);
  const cap = ashlarMaterial(0xd8d2c4);
  const road = std(0x8b867a, 1);
  const under = std(0x4a4742, 1);
  const { bridgeX, deckY, roadHalf } = SCENERY.farRiver;
  const z0 = -1.2;
  const z1 = SITE.river.zSouth + 1.2;
  for (const s of [-1, 1]) {
    const xr = s * bridgeX;
    const hw = roadHalf + 0.5;
    g.add(bx(xr - hw, deckY - 0.75, z0, xr + hw, deckY - 0.05, z1, under, 1.2)); // the slab
    g.add(bx(xr - roadHalf, deckY - 0.05, z0, xr + roadHalf, deckY + 0.0, z1, road));
    for (const t of [-1, 1]) {
      const px = xr + t * (roadHalf + 0.18);
      g.add(bx(px - 0.2, deckY - 0.3, z0 - 0.05, px + 0.2, deckY + 0.95, z1 + 0.05, stone, 2.4));
      g.add(bx(px - 0.26, deckY + 0.95, z0 - 0.1, px + 0.26, deckY + 1.07, z1 + 0.1, cap, 1.2));
    }
  }
  mergeStatic(g, { name: 'bridges' });
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}
