import * as THREE from 'three';
import { MAT, mesh } from '@onigam/lab-kit/three';
import { BLADES } from '../../sim/machine';
import { PSI_OPT } from '../../sim/machine';
import { COLOURS, DEG, SITE, TROUGH, WATER_FX, bladeThickness, type ScrewShape } from '../dims';
import { rng } from '@onigam/lab-kit/three';
import { noShadow, smoothstep } from '../common';
import { mergeStatic } from '../merge';
import { Prism } from '../screw/water';
import { PocketBuilder, bladeGeometry, coreGeometry, pocketCount, troughGeometry, trueGap } from '../screw/helix';
import { computeLayout, type Layout } from '../screw/layout';
import { worldPrism } from '../screw/structure';
import { WaterBody, bump, gridLines, plateau } from '../water/body';
import { Nappes } from '../water/nappe';
import type { WaterKit } from './water';
import { masonryMaterial } from './materials';

// The static geometry of the parts of the `site` world (the moving water is `water.ts`, the animation is in `scene.ts`). The site frame: X east,
// Y up (0 = design headwater), Z south; the water flows towards -X. See dims.SITE for the sizes and for what is compressed.

// The masonry that holds the water (weir body, canal and chamber walls, quay, gate posts, fish-pass walls, piers): a coursed stone with mortar and
// per-block variation, projected by the object-space position so that every geometry takes it (boxes, extrusions, the trough). Only the material is
// the scenery's: the geometry and the part ids of the structures do not change.
export const concrete = (): THREE.MeshStandardMaterial => masonryMaterial('wall', 0xdcd8cc);
export const concreteLight = (): THREE.MeshStandardMaterial => masonryMaterial('coping', 0xe4dfd3);
const gravel = () => new THREE.MeshStandardMaterial({ color: 0x8d8777, roughness: 1 });

/** A box between two corners. */
export function box(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  mat: THREE.Material,
): THREE.Mesh {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const m = mesh(g, mat, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
  return m;
}

/** A thin concrete lining on the two sides of a channel that runs along X. */
export function lining(
  x0: number,
  x1: number,
  zN: number,
  zS: number,
  bedY: number,
  t = 0.15,
  topSouth: number = SITE.groundY,
): THREE.Mesh[] {
  const top = SITE.groundY;
  return [box(x0, bedY, zN, x1, top, zN + t, concrete()), box(x0, bedY, zS - t, x1, topSouth, zS, concrete())];
}

// ------------------------------------------------------------------------------------------------ river, weir, notch, fish pass

export interface RiverBuild {
  group: THREE.Group;
  up: WaterBody[];
  down: WaterBody[];
}

/** The zones of the river's plan where the grid is fine: along the two banks, where the opacity and the bed fall away. */
const bankZones = (z0: number, z1: number, north = true, south = true): [number, number, number][] => [
  ...(north ? ([[z0, z0 + 1.2, 0.3]] as [number, number, number][]) : []),
  ...(south ? ([[z1 - 1.2, z1, 0.3]] as [number, number, number][]) : []),
];

/** Opacity at the banks and depth of the bed of a sheet of the river (north and south banks, or only one of them). */
const bankShore = (z0: number, z1: number, north: boolean, south: boolean) => (_x: number, z: number) =>
  smoothstep(0, 0.9, Math.min(north ? z - z0 : 99, south ? z1 - z : 99));
const bankBed = (z0: number, z1: number, north: boolean, south: boolean) => (_x: number, z: number) =>
  0.4 + 0.6 * smoothstep(0, 2.6, Math.min(north ? z - z0 : 99, south ? z1 - z : 99));

/** The weir's plan: the two spans of the free crest (the notch and the fish pass break it), for the foam that follows them. */
export function weirSpans(): [number, number][] {
  const { river: r, notch: n, fishPass: fp } = SITE;
  return [
    [r.zNorth, n.z - n.width / 2],
    [n.z + n.width / 2, fp.z],
  ];
}

/** Bodies of the river: above and below the weir, leaving the fish pass its own water. */
export function buildRiver(wk: WaterKit): RiverBuild {
  const g = new THREE.Group();
  const r = SITE.river;
  const w = SITE.weir;
  const fp = SITE.fishPass;
  const n = SITE.notch;
  const xu = w.x + w.thickness / 2;
  const xd = w.x - w.thickness / 2;
  g.add(box(xu, SITE.ground.bottomY, r.zNorth, r.xEast, r.bedUpY, r.zSouth, gravel()));
  g.add(box(r.xWest, SITE.ground.bottomY, r.zNorth, xd, r.bedDownY, r.zSouth, gravel()));
  // a few boulders in the bed (scenery of the river, part of it)
  const rand = rng(11);
  for (let i = 0; i < 12; i++) {
    const x = r.xWest + 6 + rand() * (xd - r.xWest - 12);
    const z = r.zNorth + 1 + rand() * (r.zSouth - r.zNorth - 2);
    const s = 0.25 + rand() * 0.5;
    const rock = mesh(
      new THREE.IcosahedronGeometry(s, 0),
      new THREE.MeshStandardMaterial({ color: 0x7c776c, roughness: 1, flatShading: true }),
      [x, r.bedDownY + s * 0.3, z],
    );
    g.add(rock);
  }
  mergeStatic(g, { name: 'river-bed' });
  const zsAll = gridLines(r.zNorth, r.zSouth, bankZones(r.zNorth, r.zSouth), 2);
  const zsNear = gridLines(r.zNorth, fp.z, bankZones(r.zNorth, fp.z, true, false), 2);
  const up = [
    new WaterBody(fp.xEast, r.xEast, r.zNorth, r.zSouth, wk.surface(), 'river-up', {
      xs: gridLines(fp.xEast, r.xEast, [[fp.xEast, fp.xEast + 14, 1.2]], 18),
      zs: zsAll,
    })
      .shore(bankShore(r.zNorth, r.zSouth, true, true))
      .bed(bankBed(r.zNorth, r.zSouth, true, true)),
    new WaterBody(xu, fp.xEast, r.zNorth, fp.z, wk.surface(), 'river-up-near', {
      xs: gridLines(xu, fp.xEast, [], 0.5),
      zs: zsNear,
    })
      .shore(bankShore(r.zNorth, fp.z, true, false))
      .bed(bankBed(r.zNorth, fp.z, true, false)),
  ];
  // below the weir: the foam of the toe (channel 0), the trail and its standing waves (1), the plunge of the notch (2), the outlet of the pass (3)
  const spans = weirSpans();
  const inSpan = (z: number) => Math.max(...spans.map(([a, b]) => plateau(z, a, b, 0.45)));
  const toe = (x: number, z: number) => plateau(x, xd - 1.7, xd - 0.05, 0.9) * inSpan(z);
  const trail = (x: number, z: number) => {
    const s = xd - 1.0 - x;
    return (
      0.9 *
      (s <= 0 ? plateau(x, xd - 1.0, xd, 0.6) : Math.exp(-s / WATER_FX.foam.trail)) *
      plateau(z, r.zNorth, fp.z, 1.3)
    );
  };
  const plunge = (x: number, z: number) => bump(Math.hypot(x - (xd - 0.45), z - n.z), 0, 1.4);
  const passOut = (x: number, z: number) => bump(Math.hypot(x - (fp.xWest - 0.45), z - (fp.z + r.zSouth) / 2), 0, 1.5);
  const paint = (b: WaterBody) => b.paint(0, toe).paint(1, trail).paint(2, plunge).paint(3, passOut);
  const down = [
    paint(
      new WaterBody(r.xWest, fp.xWest, r.zNorth, r.zSouth, wk.surface({ waves: true }), 'river-down', {
        xs: gridLines(
          r.xWest,
          fp.xWest,
          [
            [-24, fp.xWest, 0.25],
            [-80, -24, 1.2],
          ],
          25,
        ),
        zs: zsAll,
      })
        .shore(bankShore(r.zNorth, r.zSouth, true, true))
        .bed(bankBed(r.zNorth, r.zSouth, true, true)),
    ),
    paint(
      new WaterBody(fp.xWest, xd, r.zNorth, fp.z, wk.surface({ waves: true }), 'river-down-near', {
        xs: gridLines(fp.xWest, xd, [], 0.15),
        zs: gridLines(r.zNorth, fp.z, bankZones(r.zNorth, fp.z, true, false), 0.25),
      })
        .shore(bankShore(r.zNorth, fp.z, true, false))
        .bed(bankBed(r.zNorth, fp.z, true, false)),
    ),
  ];
  for (const s of [...up, ...down]) g.add(s.mesh);
  return { group: g, up, down };
}

export interface WeirBuild {
  group: THREE.Group;
  /** The sheets of water over the crest: one ribbon per span of the free crest. */
  falls: Nappes;
}

export function buildWeir(wk: WaterKit): WeirBuild {
  const g = new THREE.Group();
  const { weir: w, notch: n, fishPass: fp, river: r } = SITE;
  const x0 = w.x - w.thickness / 2;
  const x1 = w.x + w.thickness / 2;
  const base = r.bedDownY - 0.3;
  const zn = n.z - n.width / 2;
  const zs = n.z + n.width / 2;
  g.add(box(x0, base, r.zNorth, x1, w.crestY, zn, concrete()));
  g.add(box(x0, base, zs, x1, w.crestY, fp.z, concrete()));
  g.add(box(x0, base, zn, x1, w.crestY - n.depth, zs, concrete()));
  // a rounded crest cap (a darker strip) so the line of the weir reads from far
  g.add(box(x0 - 0.04, w.crestY, r.zNorth, x1 + 0.04, w.crestY + 0.04, zn, concreteLight()));
  g.add(box(x0 - 0.04, w.crestY, zs, x1 + 0.04, w.crestY + 0.04, fp.z, concreteLight()));
  // apron: a slab at the foot of the downstream face
  g.add(box(x0 - 1.6, base, r.zNorth, x0, r.bedDownY + 0.04, fp.z, concrete()));
  mergeStatic(g, { name: 'weir' });
  const lip = x0 - 0.045;
  const falls = new Nappes(
    weirSpans().map(([z0, z1]) => ({ x: lip, z0, z1, film: w.thickness + 0.05 })),
    wk.fall(),
    'weir-fall',
  );
  g.add(falls.mesh);
  return { group: g, falls };
}

export interface NotchBuild {
  group: THREE.Group;
  fall: Nappes;
}

export function buildNotch(wk: WaterKit): NotchBuild {
  const g = new THREE.Group();
  const { weir: w, notch: n } = SITE;
  const x0 = w.x - w.thickness / 2;
  const steel = MAT.zinc();
  // two guide plates on the downstream face, a gauge board, and the lip of the notch
  for (const s of [-1, 1])
    g.add(
      box(
        x0 - 0.1,
        w.crestY - n.depth,
        n.z + s * (n.width / 2 + 0.04) - 0.03,
        x0,
        w.crestY + 0.3,
        n.z + s * (n.width / 2 + 0.04) + 0.03,
        steel,
      ),
    );
  g.add(
    box(
      x0 - 0.1,
      w.crestY - n.depth - 0.02,
      n.z - n.width / 2,
      x0,
      w.crestY - n.depth + 0.03,
      n.z + n.width / 2,
      steel,
    ),
  );
  mergeStatic(g, { name: 'notch' });
  const fall = new Nappes(
    [{ x: x0 - 0.11, z0: n.z - n.width / 2, z1: n.z + n.width / 2, film: w.thickness + 0.1 }],
    wk.fall(),
    'notch-fall',
  );
  g.add(fall.mesh);
  return { group: g, fall };
}

export interface FishPassBuild {
  group: THREE.Group;
  pools: WaterBody[];
  /** Floor tops of the pools, and the heights of the sills between them, upstream to downstream. */
  floors: number[];
  /** Tops of the sills (the one upstream of each pool, then the last one before the river) and the x of their downstream faces. */
  sills: number[];
  sillX: number[];
  /** The cascades over the sills: one ribbon per sill. */
  cascades: Nappes;
}

export function buildFishPass(wk: WaterKit): FishPassBuild {
  const g = new THREE.Group();
  const fp = SITE.fishPass;
  const n = fp.pools;
  const dx = (fp.xEast - fp.xWest) / n;
  const z0 = fp.z + 0.15;
  const z1 = SITE.river.zSouth;
  const top = SITE.weir.crestY;
  const step = (top - SITE.tailY) / n;
  const pools: WaterBody[] = [];
  const floors: number[] = [];
  const sills: number[] = [];
  const sillX: number[] = [];
  const sillT = 0.12;
  // north wall (the side towards the river)
  g.add(box(fp.xWest - sillT, SITE.river.bedDownY, fp.z, fp.xEast + sillT, top + 0.35, z0, concrete()));
  for (let i = 0; i < n; i++) {
    const xe = fp.xEast - i * dx; // east edge of pool i (pool 0 is the upstream one)
    const xw = xe - dx;
    const level = top - i * step - 0.02;
    const floor = level - 0.55;
    floors.push(floor);
    sills.push(level + 0.12);
    sillX.push(xe - sillT);
    g.add(box(xw, SITE.river.bedDownY, z0, xe, floor, z1, concrete()));
    g.add(box(xe - sillT, floor, z0, xe, level + 0.12, z1, concreteLight())); // the sill upstream of pool i
    // the foam of the plunge of the cascade, at the upstream end of the pool (channel 0), and along its walls
    const s = new WaterBody(xw + 0.02, xe - sillT, z0, z1, wk.surface(), `pass-pool-${i}`, {
      xs: gridLines(xw + 0.02, xe - sillT, [], 0.18),
      zs: gridLines(z0, z1, [], 0.2),
    });
    s.paint(0, (x) => plateau(x, xe - sillT - 0.6, xe - sillT - 0.05, 0.4));
    s.set(level);
    pools.push(s);
  }
  g.add(box(fp.xWest - sillT, SITE.river.bedDownY, z0, fp.xWest, top - n * step + 0.1, z1, concreteLight()));
  sills.push(top - n * step + 0.1);
  sillX.push(fp.xWest - sillT);
  mergeStatic(g, { name: 'pass' });
  for (const s of pools) g.add(s.mesh);
  const cascades = new Nappes(
    sillX.map((x) => ({ x, z0, z1, film: sillT + 0.04 })),
    wk.fall(),
    'pass-cascades',
  );
  g.add(cascades.mesh);
  return { group: g, pools, floors, sills, sillX, cascades };
}

// ------------------------------------------------------------------------------------------------ headrace, rack, gate

export interface HeadraceBuild {
  group: THREE.Group;
  mouth: WaterBody;
  above: WaterBody;
  below: WaterBody;
}

/** Length of the ramp over which the surface falls across the rack (the level step), m. */
export const RACK_RAMP = 0.9;

export function buildHeadrace(wk: WaterKit): HeadraceBuild {
  const g = new THREE.Group();
  const c = SITE.canal;
  g.add(box(c.xMin, SITE.ground.bottomY, c.zNorth, c.xMax, c.bedY, c.zSouth, gravel()));
  g.add(box(c.mouthX, SITE.ground.bottomY, c.zSouth, c.xMax, c.bedY, SITE.embankment.zSouth, gravel()));
  for (const m of lining(c.xMin, c.mouthX, c.zNorth, c.zSouth, c.bedY)) g.add(m);
  // wing walls at the mouth (the canal opens on the river)
  g.add(box(c.mouthX, c.bedY, c.zNorth, c.xMax, SITE.groundY, c.zNorth + 0.15, concrete()));
  mergeStatic(g, { name: 'headrace' });
  const inner = [c.zNorth + 0.15, c.zSouth - 0.15] as const;
  const rackX = c.mouthX;
  // the foam behind the bars of the rack (channel 0) and at the gate (channel 0 of the sheet below it)
  const mouth = new WaterBody(c.mouthX, c.xMax - 0.01, inner[0], SITE.embankment.zSouth, wk.surface(), 'canal-mouth', {
    xs: gridLines(c.mouthX, c.xMax - 0.01, [], 0.6),
    zs: gridLines(inner[0], SITE.embankment.zSouth, [[inner[0], inner[0] + 0.8, 0.25]], 1),
  });
  mouth
    .shore((_x, z) => smoothstep(0, 1, SITE.embankment.zSouth - z))
    .bed((_x, z) => 0.5 + 0.5 * smoothstep(0, 2, SITE.embankment.zSouth - z));
  const above = new WaterBody(SITE.gate.x, c.mouthX, inner[0], inner[1], wk.surface(), 'canal-above-gate', {
    xs: gridLines(SITE.gate.x, c.mouthX, [[rackX - RACK_RAMP, rackX, 0.15]], 1.5),
    zs: gridLines(inner[0], inner[1], [], 0.5),
  });
  above.paint(0, (x) => plateau(x, rackX - 1.5, rackX - 0.05, 0.9));
  const below = new WaterBody(c.xMin, SITE.gate.x, inner[0], inner[1], wk.surface(), 'canal-below-gate', {
    xs: gridLines(c.xMin, SITE.gate.x, [[SITE.gate.x - 2.4, SITE.gate.x, 0.3]], 3),
    zs: gridLines(inner[0], inner[1], [], 0.5),
  });
  below.paint(0, (x) => plateau(x, SITE.gate.x - 2.2, SITE.gate.x - 0.05, 1.2));
  for (const s of [mouth, above, below]) g.add(s.mesh);
  return { group: g, mouth, above, below };
}

export interface RackBuild {
  group: THREE.Group;
  /** The debris: instances shown in proportion to the clogging. */
  debris: THREE.InstancedMesh;
  maxDebris: number;
}

export function buildRack(): RackBuild {
  const g = new THREE.Group();
  const r = SITE.rack;
  const c = SITE.canal;
  const z0 = c.zNorth + 0.15;
  const z1 = c.zSouth - 0.15;
  const steel = MAT.steel();
  const tilt = new THREE.Group();
  tilt.rotation.z = r.tilt * DEG;
  tilt.position.set(r.x, c.bedY, 0);
  const pitch = r.spacing + r.bar;
  const n = Math.floor((z1 - z0) / pitch);
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(r.bar, r.height, 0.05), steel, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m.makeTranslation(0, r.height / 2, z0 + (z1 - z0) * ((i + 0.5) / n));
    bars.setMatrixAt(i, m);
  }
  bars.castShadow = true;
  tilt.add(bars);
  for (const y of [0.05, r.height * 0.5, r.height - 0.05])
    tilt.add(mesh(new THREE.BoxGeometry(0.08, 0.1, z1 - z0), steel, [0, y, (z0 + z1) / 2]));
  g.add(tilt);
  // the frame: two posts up to the ground, on the walls of the canal
  for (const z of [z0 + 0.05, z1 - 0.05])
    g.add(
      box(
        r.x - 0.1,
        c.bedY,
        z - 0.06,
        r.x + 0.1 + r.height * Math.sin(r.tilt * DEG) * 0,
        SITE.groundY + 0.2,
        z + 0.06,
        MAT.steelBlack(),
      ),
    );
  // debris: leaves and twigs (flat brown boxes) caught on the bars, shown by count
  const maxDebris = 90;
  const debris = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.22, 0.04, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x6b5230, roughness: 1 }),
    maxDebris,
  );
  const rand = rng(23);
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < maxDebris; i++) {
    // fills from the bottom up: the later instances sit higher (they appear as the rack clogs more)
    const level = i / maxDebris;
    const y = 0.1 + level * (r.height * 0.95);
    const px = r.x - Math.sin(r.tilt * DEG) * y + 0.07 + rand() * 0.06;
    const py = c.bedY + y * Math.cos(r.tilt * DEG);
    const pz = z0 + 0.1 + rand() * (z1 - z0 - 0.2);
    q.setFromEuler(e.set(rand() * 1.2, rand() * 3, rand() * 0.8));
    m.compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(0.6 + rand() * 0.9, 1, 0.8 + rand() * 0.9));
    debris.setMatrixAt(i, m);
  }
  void up;
  debris.count = 0;
  debris.frustumCulled = false;
  debris.castShadow = false;
  debris.userData.noShadow = true;
  debris.instanceMatrix.needsUpdate = true;
  g.add(debris);
  return { group: g, debris, maxDebris };
}

export interface GateBuild {
  group: THREE.Group;
  /** The plate and the height of its lowest point when closed and when fully raised. */
  plate: THREE.Group;
  closedY: number;
  openY: number;
}

export function buildGate(): GateBuild {
  const g = new THREE.Group();
  const gt = SITE.gate;
  const c = SITE.canal;
  const z0 = c.zNorth + 0.15;
  const z1 = c.zSouth - 0.15;
  const frame = MAT.steelBlack();
  const topY = SITE.groundY + 1.8;
  for (const z of [z0 - 0.02, z1 + 0.02])
    g.add(box(gt.x - 0.18, c.bedY, z - 0.14, gt.x + 0.18, topY, z + 0.14, concrete()));
  g.add(box(gt.x - 0.2, topY, z0 - 0.16, gt.x + 0.2, topY + 0.2, z1 + 0.16, concreteLight()));
  // a rack and a hand wheel on the beam
  g.add(box(gt.x - 0.04, topY + 0.2, (z0 + z1) / 2 - 0.04, gt.x + 0.04, topY + 0.9, (z0 + z1) / 2 + 0.04, frame));
  const wheel = mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 20), MAT.redPaint(), [gt.x, topY + 0.95, (z0 + z1) / 2]);
  wheel.rotation.y = Math.PI / 2;
  g.add(wheel);
  mergeStatic(g, { name: 'gate-frame' });
  const plate = new THREE.Group();
  plate.name = 'gate-plate';
  plate.add(box(gt.x - gt.thickness / 2, 0, z0, gt.x + gt.thickness / 2, gt.height, z1, MAT.steel()));
  plate.add(
    box(gt.x - 0.05, gt.height - 0.1, (z0 + z1) / 2 - 0.05, gt.x + 0.05, gt.height + 0.7, (z0 + z1) / 2 + 0.05, frame),
  );
  g.add(plate);
  const closedY = c.bedY;
  const openY = SITE.groundY + 0.1;
  plate.position.y = closedY;
  return { group: g, plate, closedY, openY };
}

// ------------------------------------------------------------------------------------------------ the chamber and the screw in it

export interface ChamberBuild {
  group: THREE.Group;
  layout: Layout;
  /** Site position of the screw frame (the axis at the lower end of the flights), and the frame itself. */
  origin: THREE.Vector3;
  tilt: THREE.Group;
  rot: THREE.Group;
  pockets: THREE.InstancedMesh;
  basin: Prism;
  pool: Prism;
  planes: THREE.Plane[];
  /** x of the upper end of the flights (axis) and of the vertical plane that closes the basin on the canal side. */
  xTop: number;
  /** Where the line of the drive box leaves (site). */
  driveBox: THREE.Vector3;
  /** The pit: x range and the floor. */
  pit: { x0: number; x1: number; floorY: number };
}

/** The old water chamber: a pit, the trough on piers, the screw (bladed, turning), the basin on the canal side and the pool on the tailrace side. */
export function buildChamber(shape: ScrewShape, pocket: PocketBuilder, wk: WaterKit): ChamberBuild {
  const ch = SITE.chamber;
  const c = SITE.canal;
  const l = computeLayout(shape);
  const g = new THREE.Group();
  const zc = (c.zNorth + c.zSouth) / 2;
  const xLow = ch.xWest + ch.lowerEnd;
  // the design tail level is pinned to the site's: the screw is placed so that its pool stands at SITE.tailY
  const y0 = SITE.tailY + (l.y0 - l.tailY);
  const origin = new THREE.Vector3(xLow, y0, zc);
  const sx = (x: number) => x + xLow;
  const sy = (y: number) => y - l.y0 + y0;
  const floor = ch.floorY;
  // pit: floor and the two walls
  g.add(box(ch.xWest, floor - 0.4, c.zNorth, ch.xEast, floor, c.zSouth, concrete()));
  for (const m of lining(ch.xWest, ch.xEast, c.zNorth, c.zSouth, floor, 0.2, ch.quayY)) g.add(m);
  // the quay in front of the pit, lowered so that the screw can be seen from the river side
  g.add(
    box(
      ch.xWest,
      SITE.ground.bottomY,
      c.zSouth,
      ch.xEast,
      ch.quayY - 0.05,
      SITE.embankment.zSouth,
      new THREE.MeshStandardMaterial({ color: 0x7b6548, roughness: 1 }),
    ),
  );
  g.add(box(ch.xWest, ch.quayY - 0.05, c.zSouth, ch.xEast, ch.quayY, SITE.embankment.zSouth, concreteLight()));
  // the trough (screw frame) and its piers (world)
  const tilt = new THREE.Group();
  tilt.position.copy(origin);
  tilt.rotation.z = l.beta;
  const oh = TROUGH.overhang * l.k;
  tilt.add(mesh(troughGeometry(shape, -oh, l.L + oh), concrete()));
  const w = TROUGH.pierWidth * l.k;
  for (const s of [0.9 * l.k, l.L * 0.5, l.L - 0.7 * l.k]) {
    const xc = sx(s * l.cosB + l.Ro * l.sinB);
    const outer = (x: number) => y0 - l.Ro * l.cosB + (x - xLow - l.Ro * l.sinB) * (l.sinB / l.cosB) + 0.06 * l.k;
    const half = 0.45 * l.Ro;
    g.add(
      mesh(
        worldPrism(
          [
            [xc - w / 2, floor],
            [xc + w / 2, floor],
            [xc + w / 2, outer(xc + w / 2)],
            [xc - w / 2, outer(xc - w / 2)],
          ],
          zc - half,
          zc + half,
        ),
        concrete(),
      ),
    );
  }
  // bearings on piers, and the drive box on a bridge over the end of the canal
  const rj = l.rj;
  const sLow = l.sLow;
  const lowerAt = new THREE.Vector3(sx(sLow * l.cosB), sy(l.y0 + sLow * l.sinB), zc);
  g.add(
    mesh(new THREE.BoxGeometry(0.2, lowerAt.y - floor, 0.3), concrete(), [
      lowerAt.x,
      (lowerAt.y + floor) / 2 - 0.05,
      zc,
    ]),
  );
  g.add(
    mesh(new THREE.BoxGeometry(0.3, 0.2, 0.34).translate(0, 0.1, 0), MAT.steel(), [lowerAt.x, lowerAt.y - 0.12, zc]),
  );
  // rotating screw: core and blades at a coarse detail
  const rot = new THREE.Group();
  rot.name = 'site-screw';
  const core = coreGeometry(shape, rj, l.sShaftStart, l.L + 0.85 * l.k);
  rot.add(mesh(core.tube, new THREE.MeshStandardMaterial({ color: 0xa9793f, roughness: 0.85 })));
  rot.add(mesh(core.plates, MAT.steel()));
  rot.add(mesh(core.journals, MAT.steel()));
  const b = bladeGeometry(shape, 0.7);
  rot.add(mesh(b.woodA, new THREE.MeshStandardMaterial({ color: COLOURS.woodA, roughness: 0.85 })));
  rot.add(mesh(b.woodB, new THREE.MeshStandardMaterial({ color: COLOURS.woodB, roughness: 0.85 })));
  tilt.add(rot);
  // the bridge over the end of the canal carries the upper bearing and the drive box; the box stands on the north bank
  const xTop = sx(l.L * l.cosB);
  const bx = sx((l.L + 0.85 * l.k) * l.cosB);
  const by = sy(l.y0 + (l.L + 0.85 * l.k) * l.sinB);
  g.add(box(bx - 0.18, by - 0.35, c.zNorth - 0.3, bx + 0.18, by - 0.2, c.zSouth + 0.3, concrete()));
  g.add(box(bx - 0.14, by - 0.2, zc - 0.14, bx + 0.14, by - 0.04, zc + 0.14, MAT.steel()));
  const box0 = new THREE.Vector3(bx, SITE.groundY, c.zNorth - 0.5);
  g.add(
    box(
      bx - 0.35,
      SITE.groundY,
      c.zNorth - 0.8,
      bx + 0.35,
      SITE.groundY + 0.7,
      c.zNorth - 0.2,
      new THREE.MeshStandardMaterial({ color: 0x2f5d7c, roughness: 0.5, metalness: 0.3 }),
    ),
  );
  g.add(box(bx - 0.04, by - 0.04, c.zNorth - 0.3, bx + 0.04, by + 0.04, c.zNorth - 0.2, MAT.steel()));
  mergeStatic(g, { name: 'chamber' });
  g.add(tilt);
  mergeStatic(rot, { name: 'site-screw', colours: false });
  // water: pockets (instanced, cut at the ends), the basin on the canal side, the pool on the tailrace side
  const n = pocketCount(shape);
  const planes = [new THREE.Plane(), new THREE.Plane()];
  const u = new THREE.Vector3(l.cosB, l.sinB, 0);
  planes[0].setFromNormalAndCoplanarPoint(u, origin);
  planes[1].setFromNormalAndCoplanarPoint(
    u.clone().negate(),
    new THREE.Vector3(origin.x + l.L * l.cosB, origin.y + l.L * l.sinB, zc),
  );
  const pm = wk.volume({ opacity: 0.5, color: COLOURS.water });
  pm.clippingPlanes = planes;
  const pockets = new THREE.InstancedMesh(pocket.geometry, pm, n);
  pockets.frustumCulled = false;
  pockets.userData.sharedGeometry = true;
  pockets.name = 'site-pockets';
  tilt.add(pockets);
  const basin = new Prism(wk.volume({ opacity: 0.5, color: COLOURS.water }), wk.cap());
  const pool = new Prism(wk.volume({ opacity: 0.5, color: COLOURS.water }), wk.cap());
  for (const p of [basin, pool]) {
    p.cap.visible = false;
    g.add(p.mesh);
  }
  noShadow(g.children[g.children.length - 1]);
  const tailGap = trueGap(shape);
  void tailGap;
  void PSI_OPT;
  void bladeThickness;
  void BLADES;
  return {
    group: g,
    layout: l,
    origin,
    tilt,
    rot,
    pockets,
    basin,
    pool,
    planes,
    xTop,
    driveBox: box0,
    pit: { x0: ch.xWest, x1: ch.xEast, floorY: floor },
  };
}

// ------------------------------------------------------------------------------------------------ the tailrace

export interface TailraceBuild {
  group: THREE.Group;
  sheets: WaterBody[];
}

export function buildTailrace(wk: WaterKit): TailraceBuild {
  const g = new THREE.Group();
  const c = SITE.canal;
  const T = SITE.tailrace;
  const ch = SITE.chamber;
  const wEnd = T.xEnd + T.width;
  g.add(box(T.xEnd, SITE.ground.bottomY, c.zNorth, ch.xWest, T.bedY, c.zSouth, gravel()));
  g.add(box(T.xEnd, SITE.ground.bottomY, c.zSouth, wEnd, T.bedY, SITE.embankment.zSouth, gravel()));
  for (const m of lining(T.xEnd, ch.xWest, c.zNorth, c.zSouth, T.bedY)) g.add(m);
  // the turn towards the river: a lining on the west side and on the east side of the last stretch
  g.add(box(T.xEnd, T.bedY, c.zSouth, T.xEnd + 0.15, SITE.groundY, SITE.embankment.zSouth, concrete()));
  g.add(box(wEnd - 0.15, T.bedY, c.zSouth, wEnd, SITE.groundY, SITE.embankment.zSouth, concrete()));
  // a small drop at the end of the compressed tailrace: a block sill where it meets the river
  g.add(
    box(
      T.xEnd + 0.15,
      T.bedY,
      SITE.embankment.zSouth - 0.4,
      wEnd - 0.15,
      SITE.tailY - 0.15,
      SITE.embankment.zSouth,
      concreteLight(),
    ),
  );
  mergeStatic(g, { name: 'tailrace' });
  // the wake of the screw's outlet runs down the race (channel 0: foam that thins out, channel 1 is its envelope for the ripples); the turn ends on the sill
  const along = new WaterBody(T.xEnd + 0.15, ch.xWest, c.zNorth + 0.15, c.zSouth - 0.15, wk.surface(), 'tail-run', {
    xs: gridLines(T.xEnd + 0.15, ch.xWest, [[ch.xWest - 12, ch.xWest, 0.5]], 3),
    zs: gridLines(c.zNorth + 0.15, c.zSouth - 0.15, [], 0.5),
  });
  along.paint(0, (x) => 0.75 * Math.exp(-(ch.xWest - x) / 3.2));
  const turn = new WaterBody(
    T.xEnd + 0.15,
    wEnd - 0.15,
    c.zSouth - 0.15,
    SITE.embankment.zSouth - 0.4,
    wk.surface(),
    'tail-turn',
    {
      xs: gridLines(T.xEnd + 0.15, wEnd - 0.15, [], 0.5),
      zs: gridLines(
        c.zSouth - 0.15,
        SITE.embankment.zSouth - 0.4,
        [[SITE.embankment.zSouth - 1.5, SITE.embankment.zSouth - 0.4, 0.25]],
        0.8,
      ),
    },
  );
  turn.paint(0, (_x, z) => 0.8 * plateau(z, SITE.embankment.zSouth - 1.2, SITE.embankment.zSouth - 0.4, 0.5));
  for (const s of [along, turn]) g.add(s.mesh);
  return { group: g, sheets: [along, turn] };
}
