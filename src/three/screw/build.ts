import * as THREE from 'three';
import { MAT, mesh } from '@onigam/lab-kit/three';
import { BLADES } from '../../sim/machine';
import {
  BEARING,
  COLOURS,
  CORE_PLATE,
  DRIVE,
  ELECTRONICS,
  GENERATOR,
  coreWall,
  largeSprocketRadius,
  smallPulleyRadius,
  smallTeeth,
  sprocketRadius,
} from '../dims';
import { clearGroup, cylinderX, noShadow, v3 } from '../common';
import type { CutKit } from '../cut';
import { dynamic, mergeStatic } from '../merge';
import { PocketBuilder, bladeGeometry, coreGeometry, pocketCount, type BladeGeometry } from './helix';
import { worldPoint, type Layout } from './layout';
import {
  BASE_Y,
  buildInlet,
  buildOutletPool,
  buildPlatform,
  buildTrough,
  concrete,
  concreteDark,
  pillowBlock,
  wedge,
} from './structure';
import {
  bandGeometry,
  bandLoop,
  buildBattery,
  buildController,
  buildGenerator,
  buildRectifier,
  pulley,
  sprocket,
  type Wheel,
} from './drive';
import { Nappes } from '../water/nappe';
import type { WaterKit } from '../water/kit';
import { Prism, SectionCap, buildFish } from './water';

// Populates the parts of the `screw` world from a layout: each registered part is a group at the origin of the world (so that the explode
// offset is a world vector), holding a "tilt" group (the screw frame) for what follows the axis and plain world meshes for the concrete.
// What turns sits in a "rot" group inside the tilt group. Everything static is merged (`mergeStatic`) in its own frame; the parts the
// section tool cuts are merged WITHOUT baking colours (their materials are clipped, so they must stay their own).

export interface Wheelie {
  rot: THREE.Group;
  /** The registered part it belongs to. */
  part: string;
  /** `screw`: turns with the screw; `drive`: rebuilt with the ratios. */
  group: 'screw' | 'drive';
  /** Ratio of its speed to the screw's (the chain and belt stages), and its number of identical positions per turn. */
  ratio: number;
  symmetry: number;
  /** The disc that fades in when it turns too fast to read (wagon-wheel effect). */
  blur: THREE.Mesh | null;
  phase: number;
}

export interface BandInfo {
  texture: THREE.Texture;
  /** Length of one repeat of the pattern along the loop, and of the whole loop, m. */
  period: number;
  length: number;
  /** Radius of the wheel whose rim speed the band follows, m. */
  radius: number;
  /** Ratio of that wheel's speed to the screw's. */
  ratio: number;
}

export interface Rig {
  layout: Layout;
  wheels: Wheelie[];
  chain: BandInfo | null;
  belt: BandInfo | null;
  pockets: THREE.InstancedMesh | null;
  pocketCap: THREE.InstancedMesh | null;
  capShape: SectionCap;
  fish: THREE.Group | null;
  poolWater: Prism | null;
  inletWater: Prism | null;
  /** The sheet of water that falls into the inlet basin over the headwall (water). */
  inletSheet: Nappes | null;
  bladeCap: { geometry: THREE.BufferGeometry; quads: number } | null;
  controllerLed: THREE.MeshStandardMaterial | null;
  batterySegments: THREE.MeshStandardMaterial[];
  /** Unregistered scenery: the platform, the board and the cables (the supports of the "no floating part" test). */
  platform: THREE.Group;
  props: THREE.Group;
  /** Polylines for the flow dots, world frame: the current from the generator to the battery, and the line out of the controller. */
  paths: { current: THREE.Vector3[]; out: THREE.Vector3[] };
  /** The drive in numbers (tests). */
  drive: {
    bigSprocket: { c: THREE.Vector3; r: number };
    smallSprocket: { c: THREE.Vector3; r: number };
    largePulley: { c: THREE.Vector3; r: number };
    smallPulley: { c: THREE.Vector3; r: number };
    countershaft: { from: THREE.Vector3; to: THREE.Vector3; r: number };
    shaft: { from: THREE.Vector3; to: THREE.Vector3 };
    chainLength: number;
    beltLength: number;
    teeth: [number, number];
    ratios: { chain: number; belt: number };
  };
  /** Placement of the electronics (world), for the anchors and the cables. */
  places: {
    rect: THREE.Vector3;
    ctrl: THREE.Vector3;
    battery: THREE.Vector3;
    generator: THREE.Vector3;
    board: THREE.Vector3;
  };
}

export function emptyRig(layout: Layout): Rig {
  const v = () => new THREE.Vector3();
  const w = () => ({ c: v(), r: 0 });
  return {
    layout,
    wheels: [],
    chain: null,
    belt: null,
    pockets: null,
    pocketCap: null,
    capShape: new SectionCap(),
    fish: null,
    poolWater: null,
    inletWater: null,
    inletSheet: null,
    bladeCap: null,
    controllerLed: null,
    batterySegments: [],
    platform: new THREE.Group(),
    props: new THREE.Group(),
    paths: { current: [], out: [] },
    drive: {
      bigSprocket: w(),
      smallSprocket: w(),
      largePulley: w(),
      smallPulley: w(),
      countershaft: { from: v(), to: v(), r: 0 },
      shaft: { from: v(), to: v() },
      chainLength: 0,
      beltLength: 0,
      teeth: [0, 0],
      ratios: { chain: 1, belt: 1 },
    },
    places: { rect: v(), ctrl: v(), battery: v(), generator: v(), board: v() },
  };
}

export interface BuildCtx {
  roots: Record<string, THREE.Group>;
  cut: CutKit;
  planes: THREE.Plane[];
  ratios: { chain: number; belt: number };
  pocket: PocketBuilder;
  textures: { chain: THREE.Texture; belt: THREE.Texture };
  /** The water of the world: noise texture and the four materials (src/three/water). */
  water: WaterKit;
}

export const tiltOf = (l: Layout): THREE.Group => {
  const g = new THREE.Group();
  g.name = 'tilt';
  g.position.set(0, l.y0, 0);
  g.rotation.z = l.beta;
  return g;
};

const woodMat = (hex: number) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.82, metalness: 0 });

/** Merge a turning group in its own frame and keep the parent from merging it again. */
function mergeRot(rot: THREE.Group, name: string, colours: boolean): void {
  mergeStatic(rot, { name, colours });
  dynamic(rot);
}

const rectCap = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

const SCREW_PARTS = [
  'trough',
  'screw-core',
  'blade-module',
  'blade-fastener',
  'upper-bearing',
  'lower-bearing',
  'inlet-sill',
  'outlet-pool',
  'trapped-water',
];
const DRIVE_PARTS = [
  'drive-sprocket',
  'chain',
  'counter-sprocket',
  'countershaft',
  'pulley-large',
  'belt',
  'pulley-small',
  'generator',
  'rectifier',
  'charge-controller',
  'battery',
];

/** Everything but the parts that depend on the ratios of the drive. */
export function buildScrewParts(l: Layout, ctx: BuildCtx, rig: Rig): void {
  const { roots, cut } = ctx;
  const shape = l.shape;
  for (const id of SCREW_PARTS) clearGroup(roots[id]);
  rig.wheels = rig.wheels.filter((w) => w.group !== 'screw');
  clearGroup(rig.platform);
  rig.platform.add(...buildPlatform(l).children);
  const rtint = COLOURS.concrete;

  // ---- trough on its piers (cut: the bottom strip of the half-pipe and the piers)
  {
    const root = roots.trough;
    const tilt = tiltOf(l);
    const b = buildTrough(l);
    tilt.add(b.channel);
    root.add(tilt, b.piers);
    mergeStatic(root, { name: 'trough', colours: false });
    cut.clip(root);
    cut.cap('trough', tilt, [b.cap], 0, rtint);
    cut.cap('trough', root, b.pierCaps, 0, rtint);
  }

  // ---- screw core: tube, plates, journals (turns with the screw)
  {
    const root = roots['screw-core'];
    const tilt = tiltOf(l);
    const rot = new THREE.Group();
    rot.name = 'rot-core';
    const core = coreGeometry(shape, l.rj, l.sShaftStart, l.sShaftEnd);
    rot.add(mesh(core.tube, woodMat(0xa9793f)));
    rot.add(mesh(core.plates, MAT.steel()));
    rot.add(mesh(core.journals, MAT.steel()));
    tilt.add(rot);
    root.add(tilt);
    mergeRot(rot, 'core', false);
    mergeStatic(root, { name: 'core', colours: false });
    cut.clip(root);
    rig.wheels.push({ rot, part: 'screw-core', group: 'screw', ratio: 1, symmetry: 1, blur: null, phase: 0 });
    // the section of a body of revolution does not depend on the angle: static caps
    const wall = coreWall(shape.outerDiameter);
    const ri = l.ri;
    const pl = CORE_PLATE.thickness;
    cut.cap(
      'screw-core',
      tilt,
      [
        rectCap(0, ri - wall, l.L, ri),
        rectCap(0, -ri, l.L, -(ri - wall)),
        rectCap(0, -(ri - wall), pl, ri - wall),
        rectCap(l.L - pl, -(ri - wall), l.L, ri - wall),
      ],
      0,
      0xa9793f,
    );
    cut.cap('screw-core', tilt, [rectCap(l.sShaftStart, -l.rj, l.sShaftEnd, l.rj)], 0, 0x8d949b);
  }

  // ---- blades: three threads of wooden modules (turn with the screw), their section caps move with the angle
  let blades: BladeGeometry;
  {
    const root = roots['blade-module'];
    const tilt = tiltOf(l);
    const rot = new THREE.Group();
    rot.name = 'rot-blades';
    blades = bladeGeometry(shape);
    rot.add(mesh(blades.woodA, woodMat(COLOURS.woodA)));
    rot.add(mesh(blades.woodB, woodMat(COLOURS.woodB)));
    tilt.add(rot);
    root.add(tilt);
    mergeRot(rot, 'blades', false);
    mergeStatic(root, { name: 'blades', colours: false });
    cut.clip(root);
    rig.wheels.push({ rot, part: 'blade-module', group: 'screw', ratio: 1, symmetry: 1, blur: null, phase: 0 });
    // caps: a radial rectangle where each thread crosses the plane z = 0, above and below the axis; at most one per spacing per side
    const quads = Math.ceil(l.L / (shape.pitch / BLADES)) * 2 + 8;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(quads * 6 * 3), 3));
    g.setAttribute(
      'normal',
      new THREE.BufferAttribute(
        new Float32Array(quads * 6 * 3).map((_, i) => (i % 3 === 2 ? 1 : 0)),
        3,
      ),
    );
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e3);
    g.boundingBox = new THREE.Box3(new THREE.Vector3(0, -l.ro, 0), new THREE.Vector3(l.L, l.ro, 0));
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xd9a35e,
      roughness: 0.7,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    cut.capGeometry('blade-module', tilt, g, capMat);
    rig.bladeCap = { geometry: g, quads };
  }

  // ---- fasteners: the steel strip at the root of each module and its bolts (turn with the screw)
  {
    const root = roots['blade-fastener'];
    const tilt = tiltOf(l);
    const rot = new THREE.Group();
    rot.name = 'rot-fasteners';
    rot.add(
      mesh(
        blades.strips,
        new THREE.MeshStandardMaterial({ color: 0x5b6168, metalness: 0.8, roughness: 0.45, side: THREE.DoubleSide }),
      ),
    );
    rot.add(mesh(blades.bolts, MAT.zinc()));
    tilt.add(rot);
    root.add(tilt);
    mergeRot(rot, 'fasteners', false);
    mergeStatic(root, { name: 'fasteners', colours: false });
    cut.clip(root);
    rig.wheels.push({ rot, part: 'blade-fastener', group: 'screw', ratio: 1, symmetry: 1, blur: null, phase: 0 });
  }

  // ---- bearings: pillow blocks on the shaft, the upper one on a wedge of the platform, the lower one on a pier in the outlet pool
  for (const [id, s, bottom] of [
    ['upper-bearing', l.sUp, l.platTop],
    ['lower-bearing', l.sLow, BASE_Y],
  ] as const) {
    const root = roots[id];
    const tilt = tiltOf(l);
    const pb = pillowBlock(l.rj);
    const g = new THREE.Group();
    g.position.set(s, 0, 0);
    pb.meshes.forEach((m) => g.add(m));
    tilt.add(g);
    root.add(tilt);
    const Lh = BEARING.housingLength * l.rj;
    const Wh = BEARING.housingWidth * l.rj;
    const w = wedge(l, s, Lh * 0.575, pb.baseY, 0, Wh * 0.775, bottom);
    if (w) root.add(mesh(w, concrete()));
    mergeStatic(root, { name: id });
  }

  // ---- inlet sill: the trough goes on to the headwall; the basin holds the water of the upper pool
  {
    const root = roots['inlet-sill'];
    const tilt = tiltOf(l);
    const b = buildInlet(l);
    tilt.add(b.extension);
    root.add(tilt, b.head);
    mergeStatic(root, { name: 'inlet', colours: false });
    cut.clip(root);
    cut.cap('inlet-sill', tilt, [b.extensionCap], 0, rtint);
    cut.cap('inlet-sill', root, [b.headCap], 0, rtint);
    const water = new Prism(ctx.water.volume({ opacity: 0.5, color: COLOURS.water }), ctx.water.cap());
    water.mesh.name = 'inlet-water';
    root.add(water.mesh, water.cap);
    cut.clip(water.mesh);
    cut.registerCap('inlet-sill', water.cap);
    rig.inletWater = water;
    // the sheet that pours over the headwall into the basin (a ribbon whose size the water code sets from the flow)
    const sheet = new Nappes(
      [{ x: l.headX, z0: -0.85 * l.Rt, z1: 0.85 * l.Rt, film: 0.3 * l.k }],
      ctx.water.fall(),
      'inlet-sheet',
    );
    root.add(sheet.mesh);
    cut.clip(sheet.mesh);
    rig.inletSheet = sheet;
  }

  // ---- outlet pool
  {
    const root = roots['outlet-pool'];
    const b = buildOutletPool(l);
    root.add(b.slab, b.back, b.wallRight, b.glass);
    mergeStatic(root, { name: 'pool', colours: false });
    cut.clip(root);
    cut.cap('outlet-pool', root, b.caps, 0, rtint);
    const water = new Prism(ctx.water.volume({ opacity: 0.5, color: COLOURS.water }), ctx.water.cap());
    water.mesh.name = 'pool-water';
    root.add(water.mesh, water.cap);
    cut.clip(water.mesh);
    cut.registerCap('outlet-pool', water.cap);
    rig.poolWater = water;
  }

  // ---- trapped water: the pockets (instances of one bucket), their section, a fish
  {
    const root = roots['trapped-water'];
    const tilt = tiltOf(l);
    root.add(tilt);
    const n = pocketCount(shape);
    const mat = ctx.water.volume({ opacity: 0.5, color: COLOURS.water });
    mat.userData.noShare = true;
    // the pocket lies a millimetre off the faceted blade: bias it towards the eye so that the facets do not cut through it
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -4;
    mat.polygonOffsetUnits = -4;
    const pockets = new THREE.InstancedMesh(ctx.pocket.geometry, mat, n);
    pockets.name = 'pockets';
    pockets.frustumCulled = false;
    pockets.renderOrder = 2;
    pockets.userData.sharedGeometry = true;
    tilt.add(pockets);
    const pocketCap = new THREE.InstancedMesh(rig.capShape.geometry, ctx.water.cap(), n);
    pocketCap.name = 'pocket-sections';
    pocketCap.frustumCulled = false;
    pocketCap.renderOrder = 4;
    pocketCap.userData.sharedGeometry = true;
    tilt.add(pocketCap);
    // the pockets are cut at the two ends of the flights (the water goes on in the pools)
    cut.clip(pockets, ctx.planes);
    cut.clip(pocketCap, ctx.planes);
    cut.registerCap('trapped-water', pocketCap);
    rig.pockets = pockets;
    rig.pocketCap = pocketCap;
    const fish = buildFish(0.2 * Math.min(1.6, Math.max(0.5, l.k)));
    fish.traverse((o) => (o.userData.ownerPart = 'scenery'));
    tilt.add(fish);
    rig.fish = fish;
    noShadow(root);
  }
}

/** Sprockets, chain, countershaft, pulleys, belt, generator, electronics: depends on the two ratios. */
export function buildDriveParts(l: Layout, ctx: BuildCtx, rig: Rig): void {
  const { roots, ratios } = ctx;
  for (const id of DRIVE_PARTS) clearGroup(roots[id]);
  clearGroup(rig.props);
  rig.wheels = rig.wheels.filter((w) => w.group !== 'drive');
  const k = l.k;
  const th = DRIVE.sprocketThickness * k;
  const pitch = DRIVE.chainPitch * k;
  const R1 = largeSprocketRadius() * k;
  const z2 = smallTeeth(ratios.chain);
  const R2 = sprocketRadius(z2) * k;
  const chainRatio = DRIVE.largeTeeth / z2;
  const R3 = DRIVE.largePulleyRadius * k;
  const R4 = smallPulleyRadius(ratios.belt) * k;
  const c0 = new THREE.Vector2(0, 0);
  const cC = new THREE.Vector2(l.counterAt[0], l.counterAt[1]);
  const cG = new THREE.Vector2(l.generatorAt[0], l.generatorAt[1]);
  const rjc = DRIVE.countershaftRadius * k;

  /** A wheel at an axial position and a centre of the section, with its blur disc; returns nothing, registers the animation. */
  const place = (
    wheel: Wheel,
    part: string,
    name: string,
    tilt: THREE.Group,
    s: number,
    c: THREE.Vector2,
    ratio: number,
    radius: number,
  ) => {
    const at = new THREE.Group();
    at.position.set(s, c.x, c.y);
    const rot = new THREE.Group();
    rot.name = name;
    wheel.meshes.forEach((m) => rot.add(m));
    at.add(rot);
    tilt.add(at);
    mergeRot(rot, name, true);
    const blur = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 1.02, 40).rotateY(Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0xcfd4d8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    blur.visible = false;
    blur.castShadow = false;
    blur.userData.noShadow = true;
    blur.name = `${name}-blur`;
    blur.userData.ownerPart = 'scenery';
    blur.renderOrder = 6;
    dynamic(blur);
    at.add(blur);
    rig.wheels.push({ rot, part, group: 'drive', ratio, symmetry: wheel.symmetry, blur, phase: 0 });
  };

  // ---- large sprocket on the screw shaft
  {
    const root = roots['drive-sprocket'];
    const tilt = tiltOf(l);
    root.add(tilt);
    const w = sprocket({ radius: R1, thickness: th, teeth: DRIVE.largeTeeth, bore: l.rj, holes: 6, pitch }, 0.07 * k);
    place(w, 'drive-sprocket', 'rot-big-sprocket', tilt, l.sChain, c0, 1, R1);
    mergeStatic(root, { name: 'drive-sprocket' });
  }
  // ---- small sprocket on the countershaft
  {
    const root = roots['counter-sprocket'];
    const tilt = tiltOf(l);
    root.add(tilt);
    const w = sprocket({ radius: R2, thickness: th, teeth: z2, bore: rjc, holes: 0, pitch }, 0.06 * k);
    place(w, 'counter-sprocket', 'rot-small-sprocket', tilt, l.sChain, cC, chainRatio, R2);
    mergeStatic(root, { name: 'counter-sprocket' });
  }
  // ---- chain
  const chainTex = ctx.textures.chain.clone();
  chainTex.needsUpdate = true;
  {
    const root = roots.chain;
    const tilt = tiltOf(l);
    const loop = bandLoop(c0, R1, cC, R2, 0.025 * k);
    const periods = Math.max(2, Math.round(loop.length / (0.42 * k)));
    const geo = bandGeometry(loop, 0, 0.032 * k, 0.012 * k, periods);
    const m = mesh(geo, new THREE.MeshStandardMaterial({ map: chainTex, metalness: 0.6, roughness: 0.5 }));
    m.position.x = l.sChain;
    m.name = 'chain-band';
    tilt.add(m);
    root.add(tilt);
    rig.chain = { texture: chainTex, period: loop.length / periods, length: loop.length, radius: R1, ratio: 1 };
  }
  // ---- countershaft: the shaft (turns), two pillow blocks on wedges (static)
  {
    const root = roots.countershaft;
    const tilt = tiltOf(l);
    const at = new THREE.Group();
    at.position.set(0, cC.x, cC.y);
    const rot = new THREE.Group();
    rot.name = 'rot-countershaft';
    rot.add(mesh(cylinderX(rjc, l.L + DRIVE.countershaftFrom * k, l.L + DRIVE.countershaftTo * k, 20), MAT.inox()));
    at.add(rot);
    tilt.add(at);
    mergeRot(rot, 'countershaft', true);
    rig.wheels.push({
      rot,
      part: 'countershaft',
      group: 'drive',
      ratio: chainRatio,
      symmetry: 1,
      blur: null,
      phase: 0,
    });
    for (const sb of DRIVE.countershaftBearings) {
      const pb = pillowBlock(rjc);
      const g = new THREE.Group();
      g.position.set(l.L + sb * k, cC.x, cC.y);
      pb.meshes.forEach((m) => g.add(m));
      tilt.add(g);
      const Lh = BEARING.housingLength * rjc;
      const Wh = BEARING.housingWidth * rjc;
      const w = wedge(l, l.L + sb * k, Lh * 0.575, cC.x + pb.baseY, cC.y, Wh * 0.775, l.platTop);
      if (w) root.add(mesh(w, concreteDark()));
    }
    root.add(tilt);
    mergeStatic(root, { name: 'countershaft' });
  }
  // ---- large pulley, belt, small pulley
  {
    const root = roots['pulley-large'];
    const tilt = tiltOf(l);
    root.add(tilt);
    const w = pulley(
      { radius: R3, thickness: 0.03 * k, teeth: 0, bore: rjc, holes: 5, rim: (DRIVE.beltWidth + 0.02) * k },
      0.09 * k,
    );
    place(w, 'pulley-large', 'rot-large-pulley', tilt, l.sBelt, cC, chainRatio, R3);
    mergeStatic(root, { name: 'pulley-large' });
  }
  {
    const root = roots['pulley-small'];
    const tilt = tiltOf(l);
    root.add(tilt);
    const w = pulley(
      {
        radius: R4,
        thickness: 0.026 * k,
        teeth: 0,
        bore: GENERATOR.shaftRadius * k,
        holes: 0,
        rim: (DRIVE.beltWidth + 0.02) * k,
      },
      0.08 * k,
    );
    place(w, 'pulley-small', 'rot-small-pulley', tilt, l.sBelt, cG, chainRatio * ratios.belt, R4);
    mergeStatic(root, { name: 'pulley-small' });
  }
  const beltTex = ctx.textures.belt.clone();
  beltTex.needsUpdate = true;
  {
    const root = roots.belt;
    const tilt = tiltOf(l);
    const loop = bandLoop(cC, R3, cG, R4, 0.025 * k);
    const geo = bandGeometry(loop, 0.003 * k, DRIVE.beltWidth * k, DRIVE.beltThickness * k, 4);
    const m = mesh(geo, new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.8, metalness: 0.05 }));
    m.position.x = l.sBelt;
    m.name = 'belt-band';
    tilt.add(m);
    root.add(tilt);
    rig.belt = { texture: beltTex, period: loop.length / 4, length: loop.length, radius: R3, ratio: chainRatio };
  }
  // ---- generator: static body, turning shaft stub, on a wedge
  let genTerminal = new THREE.Vector3();
  {
    const root = roots.generator;
    const tilt = tiltOf(l);
    const gb = buildGenerator(k);
    const at = new THREE.Group();
    at.position.set(l.sGenFront, cG.x, cG.y);
    gb.body.forEach((m) => at.add(m));
    const rot = new THREE.Group();
    rot.name = 'rot-generator';
    gb.shaft.forEach((m) => rot.add(m));
    at.add(rot);
    tilt.add(at);
    mergeRot(rot, 'generator-shaft', true);
    rig.wheels.push({
      rot,
      part: 'generator',
      group: 'drive',
      ratio: chainRatio * ratios.belt,
      symmetry: 1,
      blur: null,
      phase: 0,
    });
    root.add(tilt);
    const R = GENERATOR.bodyRadius * k;
    const base = cG.x - R - GENERATOR.foot[1] * k;
    const w = wedge(
      l,
      l.sGenFront + (GENERATOR.bodyLength * k) / 2,
      GENERATOR.foot[2] * k * 0.5,
      base,
      cG.y,
      R * 1.05,
      l.platTop,
    );
    if (w) root.add(mesh(w, concreteDark()));
    mergeStatic(root, { name: 'generator' });
    genTerminal = worldPoint(l, l.sGenFront + gb.terminal.x, cG.x + gb.terminal.y + 0.01 * k, cG.y);
    rig.places.generator.copy(worldPoint(l, l.sGenFront + (GENERATOR.bodyLength * k) / 2, cG.x, cG.y));
  }

  // ---- electronics: a plywood board on legs at the far end of the platform, the battery on the platform in front of it
  const boardX = l.platX1 - 0.75 * k;
  const boardZ = l.platZ0 + 0.35 * k;
  const [bw, bh, bd] = ELECTRONICS.board.map((v) => v * k) as [number, number, number];
  const lift = ELECTRONICS.boardLift * k;
  const boardY = l.platTop + lift + bh / 2;
  const board = new THREE.Group();
  board.name = 'board';
  board.add(mesh(new THREE.BoxGeometry(bw, bh, bd), woodMat(0xc8a06a), [boardX, boardY, boardZ]));
  for (const sx of [-1, 1])
    board.add(
      mesh(new THREE.BoxGeometry(0.05 * k, lift + 0.02 * k, 0.05 * k), MAT.woodDark(), [
        boardX + sx * bw * 0.4,
        l.platTop + (lift + 0.02 * k) / 2,
        boardZ,
      ]),
    );
  mergeStatic(board, { name: 'board' });
  rig.props.add(board);
  rig.places.board.set(boardX, boardY, boardZ);
  const faceZ = boardZ + bd / 2;
  const rb = buildRectifier(k);
  const cb = buildController(k);
  const bb = buildBattery(k);
  const rectPos = v3(boardX - bw * 0.25, boardY - bh * 0.28, faceZ + (ELECTRONICS.rectifier[2] * k) / 2);
  const ctrlPos = v3(boardX + bw * 0.2, boardY - bh * 0.46, faceZ + (ELECTRONICS.controller[2] * k) / 2);
  const batPos = v3(boardX - 0.05 * k, l.platTop, faceZ + 0.5 * k);
  rig.places.rect.copy(rectPos);
  rig.places.ctrl.copy(ctrlPos);
  rig.places.battery.copy(batPos);
  const boxes: [string, { meshes: THREE.Mesh[] }, THREE.Vector3][] = [
    ['rectifier', rb, rectPos],
    ['charge-controller', cb, ctrlPos],
    ['battery', bb, batPos],
  ];
  for (const [id, b, pos] of boxes) {
    const g = new THREE.Group();
    g.position.copy(pos);
    b.meshes.forEach((m) => g.add(m));
    roots[id].add(g);
    mergeStatic(roots[id], { name: id });
  }
  rig.controllerLed = cb.led ?? null;
  rig.batterySegments = bb.segments;

  // ---- cables (scenery): generator -> rectifier -> controller -> battery, and the line out of the controller
  const cable = new THREE.Group();
  cable.name = 'cables';
  const at = (p: THREE.Vector3, o: THREE.Vector3) => p.clone().add(o);
  const rIn = at(rectPos, rb.inPort);
  const rOut = at(rectPos, rb.outPort);
  const cIn = at(ctrlPos, cb.inPort);
  const cOut = at(ctrlPos, cb.outPort);
  const bPlus = at(batPos, bb.inPort);
  const ac = [
    genTerminal,
    v3(genTerminal.x, genTerminal.y + 0.25 * k, genTerminal.z),
    v3(genTerminal.x + 0.9 * k, l.platTop + 0.5 * k, boardZ + 1.3 * k),
    v3(rIn.x - 0.12 * k, rIn.y + 0.3 * k, rIn.z + 0.3 * k),
    v3(rIn.x, rIn.y + 0.04 * k, rIn.z + 0.05 * k),
    rIn,
  ];
  const dc1 = [
    rOut,
    v3(rOut.x + 0.03 * k, rOut.y - 0.05 * k, rOut.z + 0.08 * k),
    v3((rOut.x + cIn.x) / 2, rOut.y - 0.16 * k, rOut.z + 0.11 * k),
    v3(cIn.x - 0.03 * k, cIn.y + 0.05 * k, cIn.z + 0.08 * k),
    cIn,
  ];
  const dc2 = [
    cOut,
    v3(cOut.x + 0.08 * k, cOut.y - 0.08 * k, cOut.z + 0.22 * k),
    v3(bPlus.x + 0.05 * k, bPlus.y + 0.32 * k, bPlus.z - 0.1 * k),
    bPlus,
  ];
  const tail = [
    v3(cOut.x, cOut.y + 0.02 * k, cOut.z),
    v3(cOut.x + 0.22 * k, cOut.y + 0.1 * k, cOut.z + 0.14 * k),
    v3(l.platX1 - 0.15 * k, l.platTop + 0.06 * k, cOut.z + 0.45 * k),
    v3(l.platX1 + 0.04 * k, l.platTop + 0.05 * k, cOut.z + 0.45 * k),
    v3(l.platX1 + 0.12 * k, BASE_Y + 0.04, cOut.z + 0.45 * k),
    v3(l.platX1 + 1.4 * k, BASE_Y + 0.04, cOut.z + 0.45 * k),
  ];
  const mats = [MAT.cableRed(), MAT.cableBlack(), MAT.cableRed(), MAT.cableBlack()];
  [ac, dc1, dc2, tail].forEach((pts, i) => {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3);
    const tube = mesh(new THREE.TubeGeometry(curve, 48, 0.008 * k, 6, false), mats[i]);
    tube.castShadow = false;
    cable.add(tube);
  });
  rig.props.add(cable);
  const sample = (pts: THREE.Vector3[], n: number) =>
    new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3).getPoints(n);
  rig.paths.current = [...sample(ac, 30), ...sample(dc1, 12).slice(1), ...sample(dc2, 14).slice(1)];
  rig.paths.out = sample(tail, 30);

  // ---- the drive in numbers (for the tests and the anchors)
  const P = (s: number, c: THREE.Vector2) => worldPoint(l, s, c.x, c.y);
  rig.drive = {
    bigSprocket: { c: P(l.sChain, c0), r: R1 },
    smallSprocket: { c: P(l.sChain, cC), r: R2 },
    largePulley: { c: P(l.sBelt, cC), r: R3 },
    smallPulley: { c: P(l.sBelt, cG), r: R4 },
    countershaft: { from: P(l.L + DRIVE.countershaftFrom * k, cC), to: P(l.L + DRIVE.countershaftTo * k, cC), r: rjc },
    shaft: { from: P(l.sShaftStart, c0), to: P(l.sShaftEnd, c0) },
    chainLength: rig.chain!.length,
    beltLength: rig.belt!.length,
    teeth: [DRIVE.largeTeeth, z2],
    ratios: { chain: chainRatio, belt: ratios.belt },
  };
}
