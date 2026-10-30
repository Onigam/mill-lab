import * as THREE from 'three';
import { PartRegistry, clamp, damp, rng } from '@onigam/lab-kit/three';
import type { SceneModule } from '@onigam/lab-kit/three';
import { partIds } from '../../part-ids';
import type { MillState } from '../../sim/types';
import { CANAL_SPEED_MS, DESIGN, DESIGN_SHAPE, RACK_CLEAN_LOSS, SITE, shapeOf, type ScrewShape } from '../dims';
import { FlowDots, clearGroup } from '../common';
import { mergeStatic } from '../merge';
import { anchor, hotspots, type HotspotDef } from '../world';
import { PocketBuilder, pocketShift } from '../screw/helix';
import { buildHouse, buildMill, buildPowerhouse } from './buildings';
import {
  box,
  buildChamber,
  buildFishPass,
  buildGate,
  buildGround,
  buildHeadrace,
  buildNotch,
  buildRack,
  buildRiver,
  buildTailrace,
  buildWeir,
  type ChamberBuild,
} from './parts';
import { createSky } from './sky';
import { waterTexture } from './water';

// The "site" world: the mill race at the scale of the place. The river flows towards -X: the weir with its reserved-flow notch and its fish pass,
// the intake with its coarse trash rack and its head gate, the headrace canal, the old water chamber with the screw in it, the tailrace (COMPRESSED
// from about 100 m to about 25 m, see dims.SITE), the mill, the small powerhouse, the house the electricity feeds. Water levels follow the state: the
// pond above the weir rises with the flow that goes over it, the canal falls across a clogged rack, the gate closes when the machine stops, the
// tailwater rises in a flood, the pockets of the screw and its angle are those of the screw world, the lamp of the house lights with the
// electricity. No section tool here.

const HOTSPOTS: HotspotDef[] = [
  { id: 'water-chamber', fr: 'Chambre d’eau', en: 'Water chamber', goto: 'screw' },
  { id: 'weir', fr: 'Seuil', en: 'Weir' },
  { id: 'mill-building', fr: 'Moulin', en: 'Mill' },
  { id: 'powerhouse', fr: 'Local technique', en: 'Powerhouse' },
  { id: 'house-load', fr: 'Maison', en: 'House' },
  { id: 'headrace', fr: 'Bief d’amenée', en: 'Headrace', minor: true },
  { id: 'river', fr: 'Rivière', en: 'River', minor: true },
  { id: 'trash-rack', fr: 'Grille grossière', en: 'Coarse rack', minor: true },
  { id: 'intake-gate', fr: 'Vanne de tête', en: 'Head gate', minor: true },
  { id: 'reserved-flow-notch', fr: 'Échancrure du débit réservé', en: 'Reserved-flow notch', minor: true },
  { id: 'fish-pass', fr: 'Passe à poissons', en: 'Fish pass', minor: true },
  { id: 'tailrace', fr: 'Canal de fuite', en: 'Tailrace', minor: true },
];

/** Explode offsets, site frame, metres (every part rises by its own amount). */
export const EXPLODE: Record<string, [number, number, number]> = {
  river: [0, 1.5, 0],
  weir: [0, 3.2, 0],
  headrace: [0, 2.2, 0],
  'trash-rack': [0, 4.6, 0],
  'intake-gate': [0, 3.8, 0],
  'reserved-flow-notch': [0, 6, 0],
  'fish-pass': [0, 4.4, 0],
  'water-chamber': [0, 5, 0],
  tailrace: [0, 2.6, 0],
  'mill-building': [0, 7, 0],
  powerhouse: [0, 5.5, 0],
  'house-load': [0, 6, 0],
};

const IDS = partIds('site');
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Head over a broad crest for a flow, m: Q = C w H^(3/2). */
export const weirHead = (q: number): number => {
  const w = SITE.fishPass.z - SITE.river.zNorth - SITE.notch.width;
  return Math.pow(Math.max(0, q) / (SITE.weirCoeff * w), 2 / 3);
};

/** How clogged the rack is (0 .. 0.95) for the head it loses: the inverse of the simulation's loss ζ = 0.3 + (b / (1 - b))². derived. */
export function rackBlocked(rackLoss: number): number {
  const zeta = rackLoss / (RACK_CLEAN_LOSS / 0.3);
  const x = Math.sqrt(Math.max(0, zeta - 0.3));
  return clamp(x / (1 + x), 0, 0.95);
}

export interface Levels {
  pond: number;
  canalUp: number;
  canalEnd: number;
  tail: number;
  gate: number;
}

export interface SiteScene extends SceneModule<MillState> {
  /** The levels drawn now (m, site datum) and the shape of the screw in the chamber. */
  readonly levels: Levels;
  readonly drawn: { shape: ScrewShape; rebuilds: number; debris: number; theta: number };
  readonly chamber: () => ChamberBuild;
  flows: { water: FlowDots; current: FlowDots };
  /** Parts of the world that are not registered: the supports of the "no floating part" test. */
  scenery(): THREE.Object3D[];
  /** Jump the levels to their target at the next frame (tests, and the first frame). */
  settle(): void;
  lamp: { panes: THREE.MeshStandardMaterial; bulb: THREE.MeshStandardMaterial; light: THREE.PointLight };
  powerLed: THREE.MeshStandardMaterial;
  sun: THREE.DirectionalLight;
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

export function createSiteScene(): SiteScene {
  const scene = new THREE.Scene();
  scene.name = 'site';
  const registry = new PartRegistry();
  const sky = createSky(scene);
  sky.focusShadow(V(-4, 0, -6), 62);
  const tex = waterTexture();
  const roots: Record<string, THREE.Group> = {};
  for (const id of IDS) {
    const g = new THREE.Group();
    g.name = id;
    roots[id] = g;
    scene.add(g);
  }

  // ---- scenery: the land
  const ground = buildGround();
  scene.add(ground);
  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);

  // ---- river, weir, notch, fish pass
  const river = buildRiver(tex);
  roots.river.add(river.group);
  const weir = buildWeir(tex);
  roots.weir.add(weir.group);
  const notch = buildNotch(tex);
  roots['reserved-flow-notch'].add(notch.group);
  const pass = buildFishPass(tex);
  roots['fish-pass'].add(pass.group);

  // ---- headrace, rack, gate
  const head = buildHeadrace(tex);
  roots.headrace.add(head.group);
  const rack = buildRack();
  roots['trash-rack'].add(rack.group);
  const gate = buildGate();
  roots['intake-gate'].add(gate.group);

  // ---- tailrace
  const tail = buildTailrace(tex);
  roots.tailrace.add(tail.group);

  // ---- buildings
  const mill = buildMill();
  mill.group.position.set(SITE.mill.x, SITE.groundY, SITE.mill.z);
  roots['mill-building'].add(mill.group);
  const ph = buildPowerhouse();
  ph.group.position.set(SITE.powerhouse.x, SITE.groundY, SITE.powerhouse.z);
  roots.powerhouse.add(ph.group);
  const house = buildHouse();
  house.group.position.set(SITE.house.x, SITE.groundY, SITE.house.z);
  roots['house-load'].add(house.group);

  // ---- the chamber and the screw in it (rebuilt when the shape changes)
  const pocket = new PocketBuilder();
  let shape: ScrewShape = { ...DESIGN_SHAPE };
  let chamber: ChamberBuild = buildChamber(shape, pocket);
  roots['water-chamber'].add(chamber.group);

  // ---- poles and the lines: chamber -> powerhouse -> house (scenery)
  const wire = (pts: THREE.Vector3[], r = 0.012): THREE.Vector3[] => {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3);
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(12, pts.length * 12), r, 5, false),
      new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.5 }),
    );
    m.castShadow = false;
    props.add(m);
    return curve.getPoints(40);
  };
  scene.updateMatrixWorld(true);
  const phOut = ph.group.localToWorld(ph.out.clone());
  const phIn = ph.group.localToWorld(ph.inn.clone());
  const houseIn = house.group.localToWorld(house.inn.clone());
  const box0 = chamber.driveBox;
  const lineA = wire([V(box0.x, box0.y + 0.6, box0.z - 0.1), V(box0.x - 1.2, SITE.groundY + 2.4, box0.z - 2.6), phIn]);
  const polesAt = [
    V(phOut.x + 6, 0, phOut.z - 4),
    V(phOut.x + 12, 0, phOut.z - 7.5),
    V(houseIn.x - 3, 0, houseIn.z + 0.6),
  ];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5e4129, roughness: 0.9 });
  for (const p of polesAt)
    props.add(box(p.x - 0.1, SITE.groundY, p.z - 0.1, p.x + 0.1, SITE.groundY + 5.2, p.z + 0.1, poleMat));
  const top = (p: THREE.Vector3) => V(p.x, SITE.groundY + 5.1, p.z);
  const lineB = wire([
    phOut,
    V(phOut.x + 1.2, SITE.groundY + 2.4, phOut.z - 0.8),
    top(polesAt[0]),
    top(polesAt[1]),
    top(polesAt[2]),
    V(houseIn.x - 0.4, houseIn.y + 0.3, houseIn.z),
    houseIn,
  ]);
  // the footbridge over the canal and the trees
  const planks = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 });
  props.add(
    box(2.4, SITE.groundY - 0.1, SITE.canal.zNorth - 0.6, 3.6, SITE.groundY + 0.04, SITE.canal.zSouth + 0.6, planks),
  );
  for (const z of [SITE.canal.zNorth - 0.55, SITE.canal.zSouth + 0.55])
    props.add(box(2.4, SITE.groundY + 0.04, z - 0.03, 3.6, SITE.groundY + 0.9, z + 0.03, poleMat));
  const rand = rng(5);
  const free = (x: number, z: number) => {
    const inRect = (cx: number, cz: number, hx: number, hz: number) => Math.abs(x - cx) < hx && Math.abs(z - cz) < hz;
    return !(
      inRect(SITE.mill.x, SITE.mill.z, SITE.mill.length / 2 + 3, SITE.mill.width / 2 + 3) ||
      inRect(SITE.house.x, SITE.house.z, SITE.house.length / 2 + 3, SITE.house.width / 2 + 3) ||
      inRect(SITE.powerhouse.x, SITE.powerhouse.z, 5, 4) ||
      inRect(-2, -5.6, 14, 7) ||
      (z > -9 && z < 14)
    );
  };
  const spots: { x: number; z: number; h: number }[] = [];
  for (let tries = 0; tries < 900 && spots.length < 70; tries++) {
    const x = -90 + rand() * 170;
    const z = -10 - rand() * 60; // north of the canal only: nothing stands between the visitor and the race
    if (free(x, z)) spots.push({ x, z, h: 4 + rand() * 4.5 });
  }
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.16, 0.22, 1, 6).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x5e4129, roughness: 1 }),
    spots.length,
  );
  const crowns = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x587a3c, roughness: 0.95, flatShading: true }),
    spots.length,
  );
  const m4 = new THREE.Matrix4();
  const q0 = new THREE.Quaternion();
  spots.forEach((t, i) => {
    m4.compose(V(t.x, SITE.groundY, t.z), q0, V(1, t.h * 0.45, 1));
    trunks.setMatrixAt(i, m4);
    m4.compose(V(t.x, SITE.groundY + t.h * 0.62, t.z), q0, V(t.h * 0.3, t.h * 0.38, t.h * 0.3));
    crowns.setMatrixAt(i, m4);
  });
  for (const m of [trunks, crowns]) {
    m.frustumCulled = false;
    m.castShadow = true;
    m.receiveShadow = true;
  }
  props.add(trunks, crowns);
  mergeStatic(props, { name: 'props' });

  // ---- anchors of the labels (children of the part, so that they follow the explode)
  const anchors: Record<string, THREE.Object3D> = {};
  const at = (id: string, x: number, y: number, z: number) => {
    anchors[id] = anchor(roots[id], x, y, z, `${id}-label`);
    anchors[id].userData.keep = true;
  };
  at('river', 36, 0.6, 5.5);
  at('weir', SITE.weir.x, SITE.weir.crestY + 0.6, 2.8);
  at('headrace', 4.5, 0.9, SITE.canal.zNorth + 1.6);
  at('trash-rack', SITE.rack.x, 1.6, -5.6);
  at('intake-gate', SITE.gate.x, SITE.groundY + 3.1, -5.6);
  at('reserved-flow-notch', SITE.weir.x - 0.7, SITE.weir.crestY + 0.2, SITE.notch.z);
  at('fish-pass', 12, 0.6, SITE.river.zSouth - 0.7);
  at('water-chamber', -11.8, SITE.chamber.quayY + 0.2, -0.2);
  at('tailrace', -27, SITE.groundY + 0.4, -5.6);
  mill.anchor.userData.keep = true;
  ph.anchor.userData.keep = true;
  house.anchor.userData.keep = true;
  anchors['mill-building'] = mill.anchor;
  anchors.powerhouse = ph.anchor;
  anchors['house-load'] = house.anchor;

  for (const id of IDS) registry.add(id, roots[id], V(...EXPLODE[id]));

  // ---- the water dots
  const waterDots = new FlowDots(150, { color: 0x1c7fe0, size: 0.32, throughWalls: true, opacity: 0.95 });
  const currentDots = new FlowDots(60, { color: 0xff8a3d, size: 5, pixels: true, throughWalls: true, opacity: 0.95 });
  scene.add(waterDots.object, currentDots.object);
  const levels: Levels = {
    pond: SITE.weir.crestY,
    canalUp: SITE.weir.crestY,
    canalEnd: SITE.weir.crestY,
    tail: SITE.tailY,
    gate: 1,
  };
  const waterPaths = (l: Levels): { river: THREE.Vector3[]; canal: THREE.Vector3[] } => {
    const ch = chamber.layout;
    const o = chamber.origin;
    const P = (s: number, yp: number) => V(o.x + s * ch.cosB - yp * ch.sinB, o.y + s * ch.sinB + yp * ch.cosB, o.z);
    const zc = (SITE.canal.zNorth + SITE.canal.zSouth) / 2;
    const dy = 0.18;
    return {
      river: [V(54, l.pond - dy, 6), V(13.3, l.pond - dy, 6), V(10.6, l.tail - dy, 6), V(-64, l.tail - dy, 6)],
      canal: [
        V(21, l.pond - dy, -2),
        V(19, l.pond - dy, zc),
        V(SITE.gate.x, l.canalUp - dy, zc),
        V(SITE.canal.xMin + 0.3, l.canalEnd - dy, zc),
        P(ch.L + 0.15, -0.72 * ch.ro),
        P(ch.L * 0.5, -0.72 * ch.ro),
        P(0, -0.72 * ch.ro),
        V(SITE.chamber.xWest + 0.6, l.tail - dy, zc),
        V(SITE.tailrace.xEnd + 1.6, l.tail - dy, zc),
        V(SITE.tailrace.xEnd + 1.6, l.tail - dy, -1.5),
        V(SITE.tailrace.xEnd + 1.6, l.tail - dy, 3),
      ],
    };
  };
  const pathsNow = waterPaths(levels);
  const pRiver = waterDots.addPath(pathsNow.river, 55);
  const pCanal = waterDots.addPath(pathsNow.canal, 90);
  const pLineA = currentDots.addPath(lineA, 14);
  const pLineB = currentDots.addPath(lineB, 36);

  // ---- update
  const drawn = { shape, rebuilds: 0, debris: 0, theta: 0 };
  let lastAngle: number | null = null;
  let unwrapped = 0;
  let lastBuild = -10;
  let first = true;
  let fillDrawn = -1;
  let pathsSig = Number.NaN;
  const tmpM = new THREE.Matrix4();

  const targets = (s: MillState): Levels => {
    const closed = s.stopped === 'closed' || s.stopped === 'flood' || s.stopped === 'lowWater';
    const over = weirHead(s.bypassFlow);
    const pond = SITE.weir.crestY + (over > 0.004 ? over : -0.03);
    const drop = closed ? 0 : Math.min(SITE.rackDropMax, Math.max(0, s.rackLoss - RACK_CLEAN_LOSS));
    const canalUp = pond - drop;
    const l = chamber.layout;
    // the buckets lower the pool at the end of the canal when they are not full: (1 - fill) times the depth of a bucket
    const basinNow = l.y0 + l.L * l.sinB + l.levels.hMin + clamp(s.fill, 0, 1) * (l.levels.hPass - l.levels.hMin);
    const inSite = basinNow - l.y0 + chamber.origin.y;
    return {
      pond,
      canalUp,
      canalEnd: closed ? SITE.deadCanalY : Math.min(canalUp, inSite),
      tail: SITE.tailY + s.tailRise,
      gate: closed ? 0 : 1,
    };
  };
  const follow = (cur: Levels, to: Levels, dt: number, snap: boolean) => {
    const k = (a: number, b: number, lambda: number) => (snap ? b : damp(a, b, lambda, Math.min(dt, 0.1)));
    cur.pond = k(cur.pond, to.pond, 5);
    cur.canalUp = k(cur.canalUp, to.canalUp, 5);
    cur.canalEnd = k(cur.canalEnd, to.canalEnd, 2.2);
    cur.tail = k(cur.tail, to.tail, 4);
    cur.gate = k(cur.gate, to.gate, 2);
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
  };

  const setShape = (next: ScrewShape) => {
    shape = shapeOf(next, shape);
    clearGroup(roots['water-chamber']);
    chamber = buildChamber(shape, pocket);
    roots['water-chamber'].add(chamber.group);
    refresh('water-chamber');
    drawn.shape = shape;
    drawn.rebuilds++;
    fillDrawn = -1;
    waterDots.setPath(pCanal, waterPaths(levels).canal);
    pathsSig = Number.NaN;
  };

  const mod: SiteScene = {
    id: 'site',
    scene,
    registry,
    hotspots: hotspots(HOTSPOTS, anchors),
    levels,
    drawn,
    chamber: () => chamber,
    flows: { water: waterDots, current: currentDots },
    scenery: () => [ground, props],
    settle() {
      first = true;
    },
    lamp: { panes: house.panes, bulb: house.bulb, light: house.light },
    powerLed: ph.led,
    sun: sky.sun,
    home: { position: V(30, 24, 50), target: V(-6, -2, -9) },
    minDistance: 1.5,
    maxDistance: 220,
    update(s, dt, view) {
      const isScrew = s.outerDiameter > 0.05;
      const want = shapeOf(
        {
          outerDiameter: s.outerDiameter,
          innerDiameter: s.innerDiameter,
          pitch: s.pitch,
          length: s.length,
          slopeDeg: s.slopeDeg,
        },
        shape,
      );
      if (!sameShape(want, shape) && view.time - lastBuild > 0.2) {
        lastBuild = view.time;
        setShape(want);
      }
      sky.update(s.hour, view.time, s.day);

      // ---- levels
      follow(levels, targets(s), dt, first);
      first = false;
      const { pond, canalUp, canalEnd, tail: tailY } = levels;
      for (const sh of river.up) sh.set(pond);
      for (const sh of river.down) sh.set(tailY);
      head.mouth.set(pond);
      head.above.set(canalUp);
      head.below.set(canalUp - 0.01, canalEnd);
      for (const sh of tail.sheets) sh.set(tailY);
      const n = pass.pools.length;
      pass.pools.forEach((p, i) => p.set(Math.max(pass.floors[i] + 0.12, pond - ((i + 0.5) * (pond - tailY)) / n)));
      // falls over the weir and through the notch
      const crest = SITE.weir.crestY;
      weir.falls.forEach((f) => f.set(Math.max(crest, pond), crest - tailY, pond - crest));
      notch.fall.set(pond, crest - SITE.notch.depth - tailY, pond - (crest - SITE.notch.depth));
      gate.plate.position.y = gate.closedY + (gate.openY - gate.closedY) * levels.gate;
      // the rack clogs
      const b = rackBlocked(s.rackLoss);
      rack.debris.count = Math.round((rack.maxDebris * b) / 0.95);
      drawn.debris = rack.debris.count;

      // ---- the water moves: the streaks run at a speed that follows the flow (the canal at its design speed, 0.8 m/s, when the machine takes its design flow)
      const flowK = clamp(s.flow / DESIGN.flow, 0, 1.6);
      const vCanal = CANAL_SPEED_MS * flowK;
      const vRiver = 0.3 + 1.1 * Math.sqrt(Math.max(0, s.riverFlow));
      river.up.forEach((sh) => sh.flow(vRiver * dt));
      river.down.forEach((sh) => sh.flow(vRiver * 1.3 * dt));
      head.mouth.flow(vRiver * 0.5 * dt);
      head.above.flow(vCanal * dt);
      head.below.flow(vCanal * dt);
      tail.sheets.forEach((sh) => sh.flow(vCanal * dt));
      pass.pools.forEach((sh) => sh.flow(0.4 * dt));
      weir.falls.forEach((f) => f.flow(2.5 * dt));
      notch.fall.flow(2.5 * dt);

      // ---- the screw in the chamber: angle, pockets, the pools on its two sides
      let dTheta = 0;
      if (isScrew) {
        if (lastAngle !== null) {
          const d = s.angle - lastAngle;
          dTheta = ((((d + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
        }
        lastAngle = s.angle;
      } else lastAngle = null;
      unwrapped += dTheta;
      drawn.theta = unwrapped;
      chamber.rot.rotation.x = unwrapped;
      const fill = isScrew ? clamp(s.fill, 0, 1) : 0;
      if (Math.abs(fill - fillDrawn) > 0.012 || fillDrawn < 0) {
        fillDrawn = fill;
        chamber.pockets.visible = fill > 0.015 && pocket.build(shape, fill);
      }
      const np = chamber.pockets.count;
      for (let p = 0; p < np; p++) {
        tmpM.makeTranslation(pocketShift(shape, p, unwrapped), 0, 0);
        chamber.pockets.setMatrixAt(p, tmpM);
      }
      chamber.pockets.instanceMatrix.needsUpdate = true;
      chamber.pockets.computeBoundingBox();
      chamber.pockets.computeBoundingSphere();
      const zc = (SITE.canal.zNorth + SITE.canal.zSouth) / 2;
      const hw = (SITE.canal.zSouth - SITE.canal.zNorth) / 2 - 0.22;
      const floor = chamber.pit.floorY;
      const yBasin = Math.max(floor + 0.01, canalEnd);
      chamber.basin.set(
        [
          [chamber.xTop, floor],
          [SITE.canal.xMin, floor],
          [SITE.canal.xMin, yBasin],
          [chamber.xTop, yBasin],
        ],
        hw,
      );
      chamber.basin.mesh.position.z = zc;
      chamber.basin.mesh.visible = canalEnd > floor + 0.05;
      const xPool = chamber.layout.poolX1 + chamber.origin.x;
      const yPool = Math.max(floor + 0.01, tailY);
      chamber.pool.set(
        [
          [chamber.pit.x0, floor],
          [xPool, floor],
          [xPool, yPool],
          [chamber.pit.x0, yPool],
        ],
        hw,
      );
      chamber.pool.mesh.position.z = zc;

      // ---- electricity: the lamp of the house, the lamp of the inverter
      const lit = s.charging && s.electricPower > 1;
      const k = lit ? clamp(0.5 + s.electricPower / 1500, 0.5, 1) : 0;
      house.panes.emissiveIntensity = lit ? 0.9 + 0.9 * k : 0;
      house.bulb.emissiveIntensity = lit ? 2.5 : 0;
      house.light.intensity = lit ? 25 * k : 0;
      ph.led.emissiveIntensity = lit ? 2.2 : 0;

      // ---- "Flux": the water, then the current
      const show = view.schematic;
      waterDots.object.visible = show;
      currentDots.object.visible = show;
      if (show) {
        // the paths follow the levels, but are rebuilt only when a level moved by more than 2 mm (no garbage in the frame otherwise)
        const sig = pond + 3 * canalUp + 5 * canalEnd + 7 * tailY;
        if (Number.isNaN(pathsSig) || Math.abs(sig - pathsSig) > 0.002) {
          pathsSig = sig;
          const pw = waterPaths(levels);
          waterDots.setPath(pRiver, pw.river);
          waterDots.setPath(pCanal, pw.canal);
        }
        waterDots.advance(pRiver, vRiver * 1.6, dt);
        waterDots.advance(pCanal, Math.max(0.05, vCanal), dt);
        waterDots.place();
        const amps = clamp(s.current, 0, 80);
        currentDots.advance(pLineA, 0.1 * amps, dt);
        currentDots.advance(pLineB, 0.12 * amps, dt);
        currentDots.place();
      }
    },
  };
  return mod;
}
