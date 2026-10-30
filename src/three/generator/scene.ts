import * as THREE from 'three';
import { PartRegistry, clamp } from '@onigam/lab-kit/three';
import type { SceneModule } from '@onigam/lab-kit/three';
import type { MillState } from '../../sim/types';
import { FlowDots, paperFloor, smoothstep } from '../common';
import { mergeStatic } from '../merge';
import { anchor, hotspots, workshopScene, type HotspotDef } from '../world';
import { QuarterCut } from './cut';
import { D, FOOT_BOTTOM, LEN, POLE_PITCH } from './geometry';
import { GEN_PARTS, buildParts, type GenId, type Pieces } from './parts';

// The "generator" world: the permanent-magnet generator of the `screw` and `site` worlds (the same frame, the same shaft, the same terminal box: docs/3d.md) opened up. A
// three-phase radial-flux machine with an inner rotor: a laminated stator with 24 teeth, one coil on each (the phase marked by a coloured tab, A, B, C following each
// other round the stator), a rotor of solid steel with 16 magnets on its face, north and south alternating, a 1.5 mm air gap, a shaft on two ball bearings, a frame with
// two end bells, a terminal box where the three leads end on three studs. The hero view is the section: a QUARTER of the machine (in front of the plane through the axis,
// beyond the plane across it) is taken away, so that both planes of the cut show. The rotor, the magnets and the shaft turn at the generator's speed (capped against the
// wagon-wheel illusion), "Flows" draws the three-phase current from the coils to the end of the cable.

const HOTSPOTS: HotspotDef[] = [
  { id: 'gen-stator', fr: 'Stator', en: 'Stator' },
  { id: 'gen-rotor', fr: 'Rotor', en: 'Rotor' },
  { id: 'gen-magnets', fr: 'Aimants', en: 'Magnets' },
  { id: 'gen-terminals', fr: 'Boîte à bornes', en: 'Terminal box' },
  { id: 'gen-coils', fr: 'Bobines', en: 'Coils', minor: true },
  { id: 'gen-frame', fr: 'Carcasse', en: 'Frame', minor: true },
  { id: 'gen-shaft', fr: 'Arbre', en: 'Shaft', minor: true },
  { id: 'gen-bearings', fr: 'Roulements', en: 'Bearings', minor: true },
];

/** Explode offsets at rest, world frame, metres: the rotor assembly comes off towards the drive end, the stator and the coils towards the other, the box rises. */
export const EXPLODE: Record<GenId, [number, number, number]> = {
  'gen-frame': [0.08, 0, 0],
  'gen-stator': [0.46, 0, 0],
  'gen-coils': [0.8, 0, 0],
  'gen-rotor': [-0.26, 0, 0],
  'gen-magnets': [-0.5, 0, 0],
  'gen-shaft': [-0.8, 0, 0],
  'gen-bearings': [0.08, 0, 0],
  'gen-terminals': [0.08, 0.32, 0],
};
/** The bearings come apart too, one towards each end and up (relative to the frame), at the full explode, metres. */
export const BEARING_EXPLODE = { front: [-0.4, 0.27, 0], rear: [0.45, 0.27, 0] } as const;

/** The positions per second at which a wheel stops following the true angle and a disc blurs it (the same numbers as the screw world: a test ties them). */
export const BLUR_FROM = 14;
export const BLUR_FULL = 24;

/** The floor of the world: under the skids that carry the base plate. */
export const FLOOR_Y = FOOT_BOTTOM - D.skid;

export interface GeneratorScene extends SceneModule<MillState> {
  pieces: Pieces;
  cut: QuarterCut;
  /** The dots of the current: one path per phase. */
  flows: FlowDots;
  /** The stand (skids, scenery) and the key light. */
  stand: THREE.Group;
  keyLight: THREE.DirectionalLight;
  /** What the animation has drawn: the angle of the rotor (rad, unwrapped), and the share of the blur. */
  readonly drawn: { phase: number; blur: number };
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function createGeneratorScene(): GeneratorScene {
  const scene = workshopScene({
    name: 'generator',
    fog: [5, 14],
    key: [1.3, 2.6, 2.0],
    target: [0.1, -0.1, 0],
    shadowHalf: 1.9,
    shadowFar: 10,
  });
  scene.add(paperFloor(12, 8, FLOOR_Y - 0.0005));
  const keyLight = scene.children.find(
    (c) => (c as THREE.DirectionalLight).isDirectionalLight && (c as THREE.DirectionalLight).castShadow,
  ) as THREE.DirectionalLight;

  const registry = new PartRegistry();
  const roots = {} as Record<GenId, THREE.Group>;
  for (const id of GEN_PARTS) {
    const g = new THREE.Group();
    g.name = id;
    roots[id] = g;
    scene.add(g);
  }
  const cut = new QuarterCut(D.section);
  const pieces = buildParts(roots, cut);

  // ---- the stand: two wooden skids across the base plate (scenery, unregistered)
  const stand = new THREE.Group();
  stand.name = 'stand';
  const wood = new THREE.MeshStandardMaterial({ color: 0xb98a4a, roughness: 0.85 });
  for (const x of [0.06, LEN - 0.06]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.09, D.skid, 0.42), wood);
    skid.position.set(x, FOOT_BOTTOM - D.skid / 2, 0);
    skid.castShadow = true;
    skid.receiveShadow = true;
    stand.add(skid);
  }
  mergeStatic(stand, { name: 'stand' });
  scene.add(stand);

  // ---- anchors of the labels (children of the part, so that they follow the explode)
  const anchors: Record<string, THREE.Object3D> = {};
  const at = (id: GenId, x: number, y: number, z: number) => {
    anchors[id] = anchor(roots[id], x, y, z, `${id}-label`);
    anchors[id].userData.keep = true;
  };
  /** A point of the face of the section across the axis (x = D.section), at height y and depth z: the labels of what the cut shows hang there, one over the other. */
  const cutFace = (y: number, z: number): [number, number, number] => [D.section, y, z];
  at('gen-frame', 0.05, 0.19, 0);
  at('gen-terminals', LEN * 0.55, 0.26, 0);
  at('gen-shaft', -0.15, 0.036, 0);
  at('gen-bearings', -0.01, -0.062, 0);
  at('gen-stator', ...cutFace(0.138, 0.03));
  at('gen-coils', ...cutFace(0.095, 0.06));
  at('gen-magnets', ...cutFace(0.052, 0.07));
  at('gen-rotor', 0.2, -0.05, 0);

  // ---- the dots of the current: the three phases from their coils to the end of the cable
  const flows = new FlowDots(60, { color: 0xff8a3d, size: 5, pixels: true, throughWalls: true, opacity: 0.95 });
  scene.add(flows.object);
  const phaseDots = pieces.phasePaths.map((p) => flows.addPath(p, 18));

  // ---- registration
  for (const id of GEN_PARTS) {
    const custom =
      id === 'gen-bearings'
        ? (f: number) => {
            pieces.bearings.front.position.set(...BEARING_EXPLODE.front).multiplyScalar(f);
            pieces.bearings.rear.position.set(...BEARING_EXPLODE.rear).multiplyScalar(f);
          }
        : undefined;
    registry.add(id, roots[id], V(...EXPLODE[id]), custom);
  }

  // The overview fits the parts, not the labels: an invisible point over the highest label gives the fit that room (docs/3d.md).
  const headroom = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([LEN * 0.55, 0.33, 0], 3)),
  );
  headroom.visible = false;
  headroom.raycast = () => {};
  headroom.userData.ownerPart = 'scenery';
  roots['gen-terminals'].add(headroom);

  // ---- update
  const drawn = { phase: 0, blur: 0 };
  let lastAngle: number | null = null;
  const SYMMETRY = D.poles / 2; // the rotor looks the same after two poles
  const half = (D.rotor.magnetArc * POLE_PITCH) / 2;
  const caps = pieces.magnetCaps;

  const mod: GeneratorScene = {
    id: 'generator',
    scene,
    registry,
    hotspots: hotspots(HOTSPOTS, anchors),
    pieces,
    cut,
    flows,
    stand,
    keyLight,
    drawn,
    home: { position: V(0.78, 0.52, 0.86), target: V(0.17, 0, 0) },
    minDistance: 0.06,
    maxDistance: 12,
    homePadding: 0.95,
    update(state, dt, view) {
      // ---- the rotor turns by the screw's step times the whole ratio of the drive (the generator's speed over the screw's), in the sense of the screw
      let dTheta = 0;
      if (lastAngle !== null) {
        const d = state.angle - lastAngle;
        dTheta = ((((d + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
      }
      lastAngle = state.angle;
      const ratio = state.rpm > 0.01 && state.generatorRpm > 0 ? state.generatorRpm / state.rpm : 0;
      const dI = dTheta * ratio;
      // wagon-wheel guard: above BLUR_FROM positions a second the rotor stops following the true angle and turns at that rate instead
      const rps = (Math.abs(state.omega * view.slowMo) / (2 * Math.PI)) * ratio;
      const blur = smoothstep(BLUR_FROM, BLUR_FULL, rps * SYMMETRY);
      drawn.blur = blur;
      if (blur > 0.5 && dt > 0) {
        const cap = (2 * Math.PI * BLUR_FROM * dt) / SYMMETRY;
        drawn.phase += clamp(dI, -cap, cap);
      } else drawn.phase += dI;
      pieces.rot.rotor.rotation.x = drawn.phase;
      pieces.rot.magnets.rotation.x = drawn.phase;
      pieces.rot.shaft.rotation.x = drawn.phase;

      // ---- the section
      cut.update(view.cutaway, registry);
      // the magnet that crosses the plane through the axis, at the top and at the bottom: the pole at the top is the pole at the bottom (16 poles: eight pitches apart)
      const a = (((0 - drawn.phase) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const k = Math.round(a / POLE_PITCH);
      const off = a - k * POLE_PITCH;
      const covered = Math.abs(off) < half;
      const north = ((k % D.poles) + D.poles) % 2 === 0;
      const show = cut.showing('gen-magnets', registry);
      caps.topN.visible = caps.bottomN.visible = show && covered && north;
      caps.topS.visible = caps.bottomS.visible = show && covered && !north;

      // ---- "Flux": the current of the three phases, at the speed of the amperes
      flows.object.visible = view.schematic;
      if (view.schematic) {
        const amps = clamp(state.current, 0, 80);
        for (const p of phaseDots) flows.advance(p, 0.012 * amps, dt);
        flows.place();
      }
    },
  };
  return mod;
}
