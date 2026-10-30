import * as THREE from 'three';
import { PartRegistry, clamp } from '@onigam/lab-kit/three';
import type { SceneModule } from '@onigam/lab-kit/three';
import { partIds } from '../../part-ids';
import { BLADES } from '../../sim/machine';
import type { MillState } from '../../sim/types';
import { DESIGN_SHAPE, bladeThickness, defaultDriveRatios, shapeOf, type ScrewShape } from '../dims';
import { FlowDots, paperFloor, smoothstep } from '../common';
import { CutKit } from '../cut';
import { anchor, hotspots, workshopScene, type HotspotDef } from '../world';
import { buildDriveParts, buildScrewParts, emptyRig, type BuildCtx, type BandInfo, type Rig } from './build';
import { PocketBuilder, pocketSection, pocketShift } from './helix';
import { computeLayout, inletLevel, troughFloorY, worldPoint, type Layout } from './layout';
import { FLOOR_Y, BASE_Y } from './structure';
import { dashTexture } from './drive';
import { waterKit } from '../water/kit';
import { ScrewWaterFx } from './water';

// The "screw" world: the machine in its water chamber, at its true size, the lower end in the outlet pool on the left, the upper end and its
// drive on the right. Everything is drawn from the state: the screw turns by `angle`, the pockets of water descend by the same angle, the level
// of the pools follows `fill` and `tailRise`, the wheels turn at their ratios (capped against the wagon-wheel illusion), the lamp of the
// controller lights when the battery charges. The section tool (`view.cutaway`) cuts the vertical plane through the axis and shows the pockets
// as a staircase of water between the blades. When the visitor changes the design point the world is rebuilt at the new size.

const HOTSPOTS: HotspotDef[] = [
  { id: 'blade-module', fr: 'Module de pales', en: 'Blade module' },
  { id: 'trapped-water', fr: 'Poche d’eau', en: 'Water pocket' },
  { id: 'chain', fr: 'Chaîne', en: 'Chain' },
  { id: 'trough', fr: 'Auge', en: 'Trough' },
  { id: 'generator', fr: 'Génératrice', en: 'Generator', minor: true, goto: 'generator' },
  { id: 'screw-core', fr: 'Noyau central', en: 'Screw core', minor: true },
  { id: 'blade-fastener', fr: 'Fixations des pales', en: 'Blade fasteners', minor: true },
  { id: 'upper-bearing', fr: 'Palier haut', en: 'Upper bearing', minor: true },
  { id: 'lower-bearing', fr: 'Palier bas', en: 'Lower bearing', minor: true },
  { id: 'inlet-sill', fr: 'Seuil d’entrée', en: 'Inlet sill', minor: true },
  { id: 'outlet-pool', fr: 'Bassin de sortie', en: 'Outlet pool', minor: true },
  { id: 'drive-sprocket', fr: 'Pignon de la vis', en: 'Drive sprocket', minor: true },
  { id: 'counter-sprocket', fr: 'Pignon de renvoi', en: 'Counter sprocket', minor: true },
  { id: 'countershaft', fr: 'Arbre intermédiaire', en: 'Countershaft', minor: true },
  { id: 'pulley-large', fr: 'Grande poulie', en: 'Large pulley', minor: true },
  { id: 'belt', fr: 'Courroie', en: 'Belt', minor: true },
  { id: 'pulley-small', fr: 'Petite poulie', en: 'Small pulley', minor: true },
];

/** Explode offsets at the design size, in the frame of the screw (u along the axis towards the upper end, n perpendicular and up, z towards the viewer), metres. */
export const EXPLODE: Record<string, { u: number; n: number; z: number }> = {
  'outlet-pool': { u: -1.5, n: 0, z: 0 },
  'lower-bearing': { u: -1.0, n: 0.5, z: 0 },
  trough: { u: 0, n: 0, z: 1.6 },
  'screw-core': { u: 0, n: 1.1, z: 0 },
  'blade-module': { u: 0, n: 2.0, z: 0 },
  'blade-fastener': { u: 0, n: 2.9, z: 0 },
  'trapped-water': { u: 0, n: 0, z: 3.2 },
  'inlet-sill': { u: 0.4, n: 0, z: -2.0 },
  'upper-bearing': { u: 0.5, n: 0.9, z: 0 },
  'drive-sprocket': { u: 0.9, n: 0.3, z: 0 },
  chain: { u: 0, n: 1.5, z: 0.4 },
  'counter-sprocket': { u: -0.7, n: 0.3, z: 0.5 },
  countershaft: { u: 0, n: 1.2, z: 0.4 },
  'pulley-large': { u: 0.5, n: 0.5, z: 0.5 },
  belt: { u: 0, n: 1.9, z: 0.5 },
  'pulley-small': { u: -0.7, n: 0.4, z: 0.6 },
  generator: { u: 0.7, n: 0.5, z: 0.8 },
};

const IDS = partIds('screw');
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Visible rate above which a wheel fades into a blur disc and stops following the true angle, in positions per second. */
export const BLUR_FROM = 14;
export const BLUR_FULL = 24;
/** The pattern of a chain or a belt never runs faster than this many repeats per second on the screen. */
export const BAND_PERIODS_MAX = 12;

export interface ScrewScene extends SceneModule<MillState> {
  rig: Rig;
  cut: CutKit;
  /** The layout and the shape the world is drawn at now. */
  readonly drawn: {
    shape: ScrewShape;
    layout: Layout;
    fill: number;
    rebuilds: number;
    ratios: { chain: number; belt: number };
    theta: number;
  };
  flows: { water: FlowDots; current: FlowDots };
  /** The moving water: meniscus, inlet sheet, outlet wake, leak, overflow, spray (src/three/screw/water.ts). */
  water(): ScrewWaterFx;
  /** Force the rebuild for a shape now (tests, and the first frame). */
  setShape(shape: ScrewShape): void;
  /** The scenery that is not a part: the supports of the "no floating part" test. */
  scenery(): THREE.Object3D[];
  /** The fish riding a pocket (scenery, not a part) and the key light (tests). */
  fish: THREE.Group;
  keyLight: THREE.DirectionalLight;
}

export interface ScrewOptions {
  /** The ratios of the chain and of the belt now, if the application knows them (`MillSim.params`); else they are read from the state. */
  ratios?: () => { chain: number; belt: number };
}

const sameShape = (a: ScrewShape, b: ScrewShape): boolean => {
  const eq = (x: number, y: number) => Math.abs(x - y) <= 0.004 * Math.max(Math.abs(x), Math.abs(y), 0.05);
  return (
    eq(a.outerDiameter, b.outerDiameter) &&
    eq(a.innerDiameter, b.innerDiameter) &&
    eq(a.pitch, b.pitch) &&
    eq(a.length, b.length) &&
    Math.abs(a.slopeDeg - b.slopeDeg) < 0.05
  );
};

export function createScrewScene(opts: ScrewOptions = {}): ScrewScene {
  const scene = workshopScene({
    name: 'screw',
    fog: [18, 48],
    key: [5, 11, 9],
    target: [4.5, 1.5, 0],
    shadowHalf: 9,
    shadowFar: 34,
  });
  const floor = paperFloor(30, 8, FLOOR_Y);
  scene.add(floor);
  const keyLight = scene.children.find(
    (c) => (c as THREE.DirectionalLight).isDirectionalLight && (c as THREE.DirectionalLight).castShadow,
  ) as THREE.DirectionalLight;

  const registry = new PartRegistry();
  const roots: Record<string, THREE.Group> = {};
  for (const id of IDS) {
    const g = new THREE.Group();
    g.name = id;
    roots[id] = g;
    scene.add(g);
  }
  const cut = new CutKit();
  const planes = [new THREE.Plane(), new THREE.Plane()];
  const pocket = new PocketBuilder();
  const textures = { chain: dashTexture('chain'), belt: dashTexture('belt') };

  let shape: ScrewShape = { ...DESIGN_SHAPE };
  let layout = computeLayout(shape);
  const ratios = defaultDriveRatios(shape.outerDiameter);
  const water0 = waterKit();
  const ctx: BuildCtx = { roots, cut, planes, ratios: { ...ratios }, pocket, textures, water: water0 };
  // the moving water: the meniscus, the inlet sheet, the outlet wake, the leak and the overflow (src/three/screw/water.ts)
  const fx = new ScrewWaterFx(water0, registry);
  const rig = emptyRig(layout);
  scene.add(rig.platform, rig.props);
  const drawn = { shape, layout, fill: -1, rebuilds: 0, ratios: { ...ratios }, theta: 0 };

  // ---- the water dots ("Flux"): the water first, then the current in the wires
  const water = new FlowDots(110, { color: 0x1c7fe0, size: 0.1, throughWalls: true, opacity: 0.95 });
  const current = new FlowDots(90, { color: 0xff8a3d, size: 5, pixels: true, throughWalls: true, opacity: 0.95 });
  scene.add(water.object, current.object, fx.spray.object);
  let waterPath = -1;
  let currentPath = -1;
  let outPath = -1;

  const waterPoints = (l: Layout): THREE.Vector3[] => {
    const ro = l.ro;
    const y = -0.72 * ro;
    return [
      V(l.headX - 0.12 * l.k, inletLevel(l, 1) - 0.08, 0),
      worldPoint(l, l.L + 0.1, y, 0),
      worldPoint(l, l.L * 0.5, y, 0),
      worldPoint(l, 0, y, 0),
      V(-0.45 * l.k, l.tailY - 0.12, 0),
      V(l.poolX0 + 0.15, l.tailY - 0.14, 0),
      V(l.poolX0 - 0.7 * l.k, l.tailY - 0.14, 0),
    ];
  };

  // ---- the tests of the bounds of the key light follow the world
  const frameLight = () => {
    const cx = (layout.poolX0 + layout.platX1 + 1) / 2;
    const half = Math.max(9, (layout.platX1 - layout.poolX0) / 2 + 2);
    keyLight.target.position.set(cx, 1.6, 0);
    keyLight.position.set(cx + 5, 11, 9);
    const cam = keyLight.shadow.camera;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.far = 2.2 * half + 20;
    cam.updateProjectionMatrix();
    keyLight.shadow.normalBias = half * 0.0035;
    // the haze that fades the floor follows the size of the world (a river screw is five times as long as the first)
    haze.near = Math.max(18, 1.7 * (layout.platX1 - layout.poolX0));
    haze.far = Math.max(48, 4.2 * (layout.platX1 - layout.poolX0));
    haze.cx = cx;
  };
  // ... and the distance of the camera: a narrow view (a tablet with the panel open) stands far from the machine and a haze that
  // fixed would wash it out, so the haze never starts nearer than 1.5 times the distance to the middle of the machine
  const haze = { near: 18, far: 48, cx: 4.5 };
  const hazeCentre = new THREE.Vector3();
  floor.onBeforeRender = (_renderer, _scene, camera) => {
    const fog = scene.fog as THREE.Fog;
    const d = camera.position.distanceTo(hazeCentre.set(haze.cx, 1.5, 0));
    fog.near = Math.max(haze.near, 1.5 * d);
    fog.far = Math.max(haze.far, 3.6 * d);
  };

  const anchors: Record<string, THREE.Object3D> = {};
  for (const id of IDS) {
    anchors[id] = anchor(roots[id], 0, 0, 0, `${id}-label`);
    anchors[id].userData.keep = true;
  }

  const placeAnchors = (l: Layout) => {
    const k = l.k;
    const W = (s: number, yp: number, z: number) => worldPoint(l, s, yp, z);
    const cC = l.counterAt;
    const cG = l.generatorAt;
    const R1 = rig.drive.bigSprocket.r;
    const set = (id: string, p: THREE.Vector3) => anchors[id].position.copy(p);
    set('trough', W(0.72 * l.L, l.wallTop + 0.02, l.Ro - 0.02 * k));
    set('screw-core', W(-0.02, 0.0, 0.0).add(V(0, 0.12 * k, 0)));
    set('blade-module', W(0.34 * l.L, -0.3 * l.ro, 0.95 * l.ro));
    set('blade-fastener', W(0.24 * l.L, l.ro * 0.55, l.ro * 0.8));
    set('upper-bearing', W(l.sUp, 2.3 * l.rj, 0));
    set('lower-bearing', W(l.sLow, 2.3 * l.rj, 0));
    set('inlet-sill', W(l.L + 0.55 * (l.sInletEnd - l.L), l.wallTop, l.Ro - 0.02 * k));
    set('outlet-pool', V(l.poolX0 + 0.55 * k, l.poolRimY, l.poolHalf));
    set('trapped-water', W(0.04 * l.L, -0.9 * l.ro, 0.2 * l.ro));
    set('drive-sprocket', W(l.sChain, R1, 0));
    set('chain', W(l.sChain, 0.5 * cC[0] - 0.2 * R1, 0.5 * cC[1] + 0.9 * R1));
    set('counter-sprocket', W(l.sChain, cC[0] + rig.drive.smallSprocket.r, cC[1]));
    set('countershaft', W(l.L + 1.9 * k, cC[0] + 0.05 * k, cC[1]));
    set('pulley-large', W(l.sBelt, cC[0] + rig.drive.largePulley.r, cC[1]));
    set('belt', W(l.sBelt, 0.5 * (cC[0] + cG[0]) + 0.12 * k, 0.5 * (cC[1] + cG[1])));
    set('pulley-small', W(l.sBelt, cG[0] + rig.drive.smallPulley.r, cG[1]));
    set('generator', W(l.sGenFront + 0.17 * k, cG[0] + 0.62 * k, cG[1]));
  };

  const setExplode = (l: Layout) => {
    for (const id of IDS) {
      const e = EXPLODE[id];
      const u = V(l.cosB, l.sinB, 0);
      const n = V(-l.sinB, l.cosB, 0);
      const entry = registry.get(id);
      if (!entry) continue;
      entry.explode
        .set(0, 0, 0)
        .addScaledVector(u, e.u * l.k)
        .addScaledVector(n, e.n * l.k)
        .add(V(0, 0, e.z * l.k));
    }
  };

  const refresh = (id: string) => {
    const e = registry.get(id);
    if (!e) return;
    const prev = e.display;
    e.meshes.length = 0;
    roots[id].traverse((o) => {
      if (o !== roots[id] && o.userData.partId && o.userData.partId !== id) return;
      const m = o as THREE.Mesh;
      if (m.isMesh && m.userData.ownerPart === undefined) {
        m.userData.ownerPart = id;
        m.userData.solidMaterial = m.material;
        e.meshes.push(m);
      }
    });
    e.display = 'solid';
    if (prev !== 'solid') registry.setDisplay(id, prev);
    e.factor = e.factor; // unchanged
  };

  const clipPlanes = (l: Layout) => {
    const u = V(l.cosB, l.sinB, 0);
    // keep s >= 0 : u . (p - A0) >= 0
    planes[0].setFromNormalAndCoplanarPoint(u, V(0, l.y0, 0));
    planes[1].setFromNormalAndCoplanarPoint(u.clone().negate(), worldPoint(l, l.L, 0, 0));
  };

  const rebuildAll = () => {
    cut.reset();
    layout = computeLayout(shape);
    rig.layout = layout;
    clipPlanes(layout);
    buildScrewParts(layout, ctx, rig);
    buildDriveParts(layout, ctx, rig);
    fx.setLayout(layout);
    fx.clipWith(cut);
    for (const id of IDS) if (registry.get(id)) refresh(id);
    placeAnchors(layout);
    setExplode(layout);
    // flow paths follow the geometry
    if (waterPath >= 0) water.setPath(waterPath, waterPoints(layout));
    if (currentPath >= 0) current.setPath(currentPath, rig.paths.current);
    if (outPath >= 0) current.setPath(outPath, rig.paths.out);
    frameLight();
    drawn.shape = shape;
    drawn.layout = layout;
    drawn.fill = -1;
    drawn.ratios = { ...ctx.ratios };
    drawn.rebuilds++;
  };
  rebuildAll();
  waterPath = water.addPath(waterPoints(layout), 90);
  currentPath = current.addPath(rig.paths.current, 50);
  outPath = current.addPath(rig.paths.out, 24);

  // ---- registration
  for (const id of IDS) registry.add(id, roots[id], V(0, 0, 0));
  setExplode(layout);
  const A: Record<string, THREE.Object3D> = anchors;

  // The overview fits the parts, not the labels: an invisible point over the highest label gives the fit that room (see docs/3d.md).
  const headroom = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)),
  );
  headroom.visible = false;
  headroom.raycast = () => {};
  headroom.userData.ownerPart = 'scenery';
  roots['generator'].add(headroom);
  const placeHeadroom = (l: Layout) => headroom.position.copy(rig.places.generator).add(V(0, 1.3 * l.k, 0));
  placeHeadroom(layout);

  // ---- update
  let lastAngle: number | null = null;
  let unwrapped = 0;
  let lastBuild = -10;
  let phaseChain = 0;
  let phaseBelt = 0;
  const tmpM = new THREE.Matrix4();
  const capPos = (g: THREE.BufferGeometry) => g.attributes.position.array as Float32Array;

  const driveRatiosNow = (state: MillState): { chain: number; belt: number } => {
    if (opts.ratios) {
      const r = opts.ratios();
      return { chain: clamp(r.chain, 1, 6), belt: clamp(r.belt, 1, 8) };
    }
    const def = defaultDriveRatios(shape.outerDiameter);
    if (state.rpm > 1 && state.generatorRpm > 1) {
      const total = state.generatorRpm / state.rpm;
      return { chain: def.chain, belt: clamp(Math.round((total / def.chain) * 10) / 10, 1, 8) };
    }
    return { chain: ctx.ratios.chain, belt: ctx.ratios.belt };
  };

  const mod: ScrewScene = {
    id: 'screw',
    scene,
    registry,
    hotspots: hotspots(HOTSPOTS, A),
    rig,
    cut,
    drawn,
    flows: { water, current },
    water: () => fx,
    fish: rig.fish!,
    keyLight,
    setShape(next) {
      shape = shapeOf(next, shape);
      rebuildAll();
    },
    scenery: () => [rig.platform, rig.props],
    home: { position: V(-3.6, 5.2, 12.5), target: V(4.5, 1.5, 0.3) },
    minDistance: 0.4,
    maxDistance: 90,
    homePadding: 0.8,
    update(state, dt, view) {
      const isScrew = state.outerDiameter > 0.05;
      const want = shapeOf(
        {
          outerDiameter: state.outerDiameter,
          innerDiameter: state.innerDiameter,
          pitch: state.pitch,
          length: state.length,
          slopeDeg: state.slopeDeg,
        },
        shape,
      );
      const ratiosNow = isScrew ? driveRatiosNow(state) : { ...ctx.ratios };
      const shapeChanged = !sameShape(want, shape);
      const ratioChanged =
        Math.abs(ratiosNow.chain - ctx.ratios.chain) > 0.04 || Math.abs(ratiosNow.belt - ctx.ratios.belt) > 0.04;
      if ((shapeChanged || ratioChanged) && view.time - lastBuild > 0.15) {
        lastBuild = view.time;
        if (shapeChanged) shape = want;
        const r = shapeChanged ? driveRatiosNow(state) : ratiosNow;
        ctx.ratios.chain = r.chain;
        ctx.ratios.belt = r.belt;
        rebuildAll();
        placeHeadroom(layout);
      }
      const l = layout;

      // ---- the angle, unwrapped so that nothing jumps when it passes 2π
      let dTheta = 0;
      if (isScrew) {
        if (lastAngle !== null) {
          const d = state.angle - lastAngle;
          dTheta = ((((d + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
        }
        lastAngle = state.angle;
      } else lastAngle = null;
      unwrapped += dTheta;
      drawn.theta = unwrapped;
      const rps = isScrew ? Math.abs(state.omega * view.slowMo) / (2 * Math.PI) : 0;

      // ---- what turns
      for (const w of rig.wheels) {
        const dI = dTheta * w.ratio;
        const passes = rps * w.ratio * w.symmetry;
        const blur = smoothstep(BLUR_FROM, BLUR_FULL, passes);
        if (blur > 0.5 && dt > 0) {
          const cap = (2 * Math.PI * BLUR_FROM * dt) / w.symmetry;
          w.phase += clamp(dI, -cap, cap);
        } else w.phase += dI;
        w.rot.rotation.x = w.phase;
        if (w.blur) {
          const part = registry.get(w.part);
          const show = blur > 0.02 && (!part || part.display === 'solid');
          w.blur.visible = show;
          (w.blur.material as THREE.MeshBasicMaterial).opacity = 0.62 * blur;
        }
      }

      // ---- the bands: the pattern runs at the rim speed of the wheel it follows, never faster than the eye can follow
      const bandPhase = (b: BandInfo | null, phase: number): number => {
        if (!b) return phase;
        const inc = (dTheta * b.ratio * b.radius) / b.period;
        const cap = BAND_PERIODS_MAX * dt;
        return phase + (dt > 0 ? clamp(inc, -cap, cap) : inc);
      };
      phaseChain = bandPhase(rig.chain, phaseChain);
      phaseBelt = bandPhase(rig.belt, phaseBelt);
      if (rig.chain) rig.chain.texture.offset.x = phaseChain;
      if (rig.belt) rig.belt.texture.offset.x = phaseBelt;

      // ---- the water of the pockets: rebuild the bucket when the fill moved, shift the instances with the angle
      const fill = isScrew ? clamp(state.fill, 0, 1) : 0;
      if (Math.abs(fill - drawn.fill) > 0.012 || drawn.fill < 0) {
        drawn.fill = fill;
        const has = fill > 0.015 && pocket.build(shape, fill);
        rig.pockets!.visible = has;
        rig.pocketCap!.visible = false;
        if (has) rig.capShape.set(pocketSection(shape, fill));
        rig.pockets!.userData.has = has;
      }
      const has = rig.pockets!.userData.has === true;
      const n = rig.pockets!.count;
      for (let p = 0; p < n; p++) {
        tmpM.makeTranslation(pocketShift(shape, p, unwrapped), 0, 0);
        rig.pockets!.setMatrixAt(p, tmpM);
        rig.pocketCap!.setMatrixAt(p, tmpM);
      }
      rig.pockets!.instanceMatrix.needsUpdate = true;
      rig.pocketCap!.instanceMatrix.needsUpdate = true;
      rig.pockets!.computeBoundingBox();
      rig.pockets!.computeBoundingSphere();
      rig.pocketCap!.computeBoundingBox();
      void has;

      // ---- the pools: the basin follows the fill (a full bucket stands at the saddle), the outlet pool follows the tailwater
      {
        const yIn = inletLevel(l, fill);
        const xL = l.L * l.cosB; // the tilted plane s = L at the axis
        const floorX = (s: number) => s * l.cosB + l.Rt * l.sinB;
        const floorY = (s: number) => troughFloorY(l, s);
        const xs = floorX(l.L);
        const ys = floorY(l.L);
        const slope = l.sinB / l.cosB;
        // end of the water on the floor: where the floor line meets the level
        const xStar = xs + (yIn - ys) / slope;
        const xEnd = Math.min(xStar, l.headX);
        const yEnd = ys + (xEnd - xs) * slope;
        // top left corner: on the plane s = L at the level
        const tau = (yIn - (l.y0 + l.L * l.sinB)) / l.cosB;
        const topLeft: [number, number] = [xL - tau * l.sinB, yIn];
        const empty = yIn <= ys + 0.004 || xEnd <= xs;
        const poly: [number, number][] = empty
          ? [
              [xs, ys],
              [xs, ys],
              [xs, ys],
              [xs, ys],
            ]
          : [[xs, ys], [xEnd, yEnd], [xEnd, yIn], topLeft];
        rig.inletWater!.set(poly, l.Rt * 0.97);
        rig.inletWater!.mesh.visible = !empty;
        const yPool = l.tailY + state.tailRise;
        const top = Math.max(BASE_Y + 0.01, yPool);
        rig.poolWater!.set(
          [
            [l.poolX0, BASE_Y],
            [l.poolX1, BASE_Y],
            [l.poolX1, top],
            [l.poolX0, top],
          ],
          l.poolHalf - 0.01,
        );
        // depth tint of the pool follows how deep it is (a flooded outlet is murkier)
        (rig.poolWater!.mesh.material as THREE.MeshStandardMaterial).opacity =
          0.42 + 0.1 * clamp(state.tailRise / 1.2, 0, 1);
      }

      // ---- the moving water: meniscus, inlet sheet, outlet wake, leak, overflow, spray
      fx.update(state, dt, view, rig, fill, unwrapped);

      // ---- the fish rides a pocket (visible in the section; in the whole view it shows through the water)
      {
        const sp = shape.pitch / BLADES;
        const t = bladeThickness(shape.outerDiameter);
        const u = -(shape.pitch * unwrapped) / (2 * Math.PI);
        const span = Math.max(2, Math.floor((l.L + 1.2) / sp)) * sp;
        // pockets satisfy T ≡ -S/4 + u (mod spacing); the bottom of a pocket starts S/4 + ... further, the fish sits 0.12 m inside the water
        const x0 = -shape.pitch / 2 + t / 2 + 0.12 * l.k + u + 0.3;
        const x = (((x0 % span) + span) % span) - 0.3;
        const fish = rig.fish!;
        const inside = x > 0.35 * l.k && x < l.L - 0.35 * l.k;
        fish.visible = inside && fill > 0.3 && (registry.get('trapped-water')?.display ?? 'solid') !== 'hidden';
        fish.position.set(x, -(l.ro - 0.13 * l.k) + 0.012 * Math.sin(view.time * 4.5), 0);
        fish.rotation.z = -l.beta + 0.12 * Math.sin(view.time * 3.1);
      }

      // ---- the section tool
      cut.update(scene, view.cutaway, registry);
      if (view.cutaway && rig.bladeCap) {
        const sp = shape.pitch / BLADES;
        const t = bladeThickness(shape.outerDiameter);
        const arr = capPos(rig.bladeCap.geometry);
        let v = 0;
        const put = (x: number, y: number) => {
          arr[v * 3] = x;
          arr[v * 3 + 1] = y;
          arr[v * 3 + 2] = 0;
          v++;
        };
        const margin = t / 2 + 0.004;
        const base = -(shape.pitch * unwrapped) / (2 * Math.PI);
        for (const side of [0, 1]) {
          // a thread crosses the plane above the axis at x = base + j sp, below at base + sp/2 + j sp
          const off = base + (side === 0 ? 0 : shape.pitch / 2);
          const j0 = Math.ceil((margin - off) / sp);
          for (let j = j0; v / 6 < rig.bladeCap.quads - 1; j++) {
            const x = off + j * sp;
            if (x > l.L - margin) break;
            const y0 = side === 0 ? l.ri : -l.ro;
            const y1 = side === 0 ? l.ro : -l.ri;
            put(x - t / 2, y0);
            put(x + t / 2, y0);
            put(x + t / 2, y1);
            put(x - t / 2, y0);
            put(x + t / 2, y1);
            put(x - t / 2, y1);
          }
        }
        rig.bladeCap.geometry.setDrawRange(0, v);
        (rig.bladeCap.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
      rig.pocketCap!.visible =
        view.cutaway &&
        (rig.pockets!.visible ?? false) &&
        (registry.get('trapped-water')?.display ?? 'solid') === 'solid';

      // ---- "Flux": the water rides the pockets, the current follows the amperes
      water.object.visible = view.schematic && fill > 0.05;
      current.object.visible = view.schematic;
      if (view.schematic) {
        const vWater = (shape.pitch * rps) / 1; // the pockets move down the axis by one pitch per turn
        water.advance(waterPath, vWater > 0 ? vWater : state.flow * 3, dt);
        water.place();
        const amps = clamp(state.current, 0, 80);
        current.advance(currentPath, 0.03 * amps, dt);
        current.advance(outPath, 0.022 * amps, dt);
        current.place();
      }
    },
  };
  return mod;
}
