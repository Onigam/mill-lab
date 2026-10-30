import * as THREE from 'three';
import { PartRegistry, clamp } from '@onigam/lab-kit/three';
import type { SceneModule } from '@onigam/lab-kit/three';
import type { MillState } from '../../sim/types';
import { POWERROOM } from '../dims';
import { FlowDots, paperFloor } from '../common';
import { anchor, hotspots, workshopScene, type HotspotDef } from '../world';
import { POWER_PARTS, buildPowerParts, type PowerId, type PowerPieces } from './parts';
import { buildRoom, type Room } from './room';

// The "powerroom" world: the little electrical room of the powerhouse, seen from inside. On the back wall, in the order the current goes: the breaker, the fuse box, the
// rectifier, the charge controller, (the battery on its rack below), the dump load, the inverter and the meter, all on one switchboard; the earth bar, the surge protector and
// the rod at the foot of it. The rectifier, the controller and the battery are the ones of the `screw` world (same builders). The battery bars, the lamp of the controller, the
// lamp of the inverter, the disc and the pulse lamp of the meter follow the state; "Flows" draws the current along the wires, at the speed of the amperes. The dump load is NOT
// simulated (the model has no diversion load): it is drawn at rest and no dot goes to it.

const P = POWERROOM;

const HOTSPOTS: HotspotDef[] = [
  { id: 'dc-breaker', fr: 'Disjoncteur continu', en: 'DC breaker' },
  { id: 'rectifier', fr: 'Redresseur', en: 'Rectifier' },
  { id: 'charge-controller', fr: 'Régulateur de charge', en: 'Charge controller' },
  { id: 'battery', fr: 'Batterie', en: 'Battery' },
  { id: 'inverter', fr: 'Onduleur', en: 'Inverter' },
  { id: 'fuse-box', fr: 'Boîte à fusibles', en: 'Fuse box', minor: true },
  { id: 'dump-load', fr: 'Charge de délestage', en: 'Dump load', minor: true },
  { id: 'energy-meter', fr: 'Compteur d’énergie', en: 'Energy meter', minor: true },
  { id: 'switchboard', fr: 'Tableau électrique', en: 'Switchboard', minor: true },
  { id: 'earthing', fr: 'Mise à la terre', en: 'Earthing', minor: true },
];

/** Explode offsets, room frame, metres: the devices come off the board towards the viewer, alternately near and far, high and low. */
export const EXPLODE: Record<PowerId, [number, number, number]> = {
  'dc-breaker': [0, 0.38, 0.95],
  'fuse-box': [0, 0.12, 0.7],
  rectifier: [0, 0.38, 0.95],
  'charge-controller': [0, 0.12, 0.7],
  battery: [0, 0.6, 0.75],
  'dump-load': [0, 0.38, 0.95],
  inverter: [0, 0.12, 0.7],
  'energy-meter': [0, 0.38, 0.95],
  switchboard: [0, 0, 0],
  earthing: [-0.3, 0, 0.8],
};

/** Turns of the meter's disc per kWh. estimate: a usual constant of an electromechanical meter. */
export const METER_REV_PER_KWH = 600;

export interface PowerroomScene extends SceneModule<MillState> {
  pieces: PowerPieces;
  room: Room;
  flows: FlowDots;
  keyLight: THREE.DirectionalLight;
  /** The path of the dots of the current, in the order the current goes (cable in, DC side, inverter, meter, line out). */
  readonly path: THREE.Vector3[][];
  /** The scenery that is not a part: the supports of the "no floating part" test. */
  scenery(): THREE.Object3D[];
  /** The turn of the meter's disc (rad, unwrapped). */
  readonly drawn: { disc: number };
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function createPowerroomScene(): PowerroomScene {
  const scene = workshopScene({
    name: 'powerroom',
    fog: [12, 30],
    key: [-1.6, 5.6, 6.4],
    target: [0, 1.2, 0.8],
    shadowHalf: 3.4,
    shadowFar: 18,
  });
  scene.add(paperFloor(16, 8, -0.1405));
  // a room is not a workshop: a little less light than the drafting table (the walls are pale)
  for (const c of scene.children) {
    if ((c as THREE.HemisphereLight).isHemisphereLight) (c as THREE.HemisphereLight).intensity = 0.75;
    if ((c as THREE.DirectionalLight).isDirectionalLight && (c as THREE.DirectionalLight).castShadow)
      (c as THREE.DirectionalLight).intensity = 1.7;
  }
  const keyLight = scene.children.find(
    (c) => (c as THREE.DirectionalLight).isDirectionalLight && (c as THREE.DirectionalLight).castShadow,
  ) as THREE.DirectionalLight;

  const registry = new PartRegistry();
  const roots = {} as Record<PowerId, THREE.Group>;
  for (const id of POWER_PARTS) {
    const g = new THREE.Group();
    g.name = id;
    roots[id] = g;
    scene.add(g);
  }
  const pieces = buildPowerParts(roots);
  const trunkY = P.board.y1 - 0.005;
  const room = buildRoom({ left: -1.1, right: 1.07, y: trunkY });
  scene.add(room.group);

  // ---- anchors of the labels: a dot over each device, on levels so that the names (read to the right of the dot) do not meet
  const anchors: Record<string, THREE.Object3D> = {};
  const at = (id: PowerId, x: number, y: number, z: number) => {
    anchors[id] = anchor(roots[id], x, y, z, `${id}-label`);
    anchors[id].userData.keep = true;
  };
  const top = (id: PowerId) => pieces.tops[id];
  at('dc-breaker', P.breaker.x - 0.04, 2.12, 0.2);
  at('fuse-box', top('fuse-box').x, 1.8, 0.2);
  at('rectifier', top('rectifier').x - 0.03, 1.7, 0.2);
  at('charge-controller', top('charge-controller').x - 0.1, 1.9, 0.2);
  at('battery', top('battery').x - 0.2, top('battery').y + 0.1, top('battery').z + 0.12);
  at('dump-load', top('dump-load').x - 0.1, 1.8, 0.2);
  at('inverter', top('inverter').x - 0.1, 1.7, 0.2);
  at('energy-meter', top('energy-meter').x - 0.06, 1.8, 0.2);
  at('switchboard', 0.55, 0.98, 0.1);
  at('earthing', P.earthBar.x + 0.1, P.earthBar.y - 0.08, 0.1);

  // ---- "Flux": one path, in the order the current goes: the cable in, the breaker, the fuses, the rectifier, the controller, the battery, the inverter, the meter, the line out
  const flows = new FlowDots(130, { color: 0xff8a3d, size: 5, pixels: true, throughWalls: true, opacity: 0.95 });
  scene.add(flows.object);
  const pieces4 = [room.cableIn, pieces.paths.dc, pieces.paths.out, room.lineOut];
  const pathIndex = flows.addPath(pieces4.flat(), 120);

  for (const id of POWER_PARTS) registry.add(id, roots[id], V(...EXPLODE[id]));

  // The overview fits the parts, not the labels: an invisible point over the highest label gives the fit that room (docs/3d.md).
  const headroom = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([P.breaker.x, 2.3, 0.2], 3)),
  );
  headroom.visible = false;
  headroom.raycast = () => {};
  headroom.userData.ownerPart = 'scenery';
  roots['dc-breaker'].add(headroom);

  const drawn = { disc: 0 };
  const mod: PowerroomScene = {
    id: 'powerroom',
    scene,
    registry,
    hotspots: hotspots(HOTSPOTS, anchors),
    pieces,
    room,
    flows,
    keyLight,
    drawn,
    path: pieces4,
    scenery: () => [room.group],
    home: { position: V(-0.35, 1.65, 4.0), target: V(0.0, 1.05, 0.25) },
    minDistance: 0.2,
    maxDistance: 14,
    homePadding: 0.8,
    update(state, dt, view) {
      const lit = state.charging;
      pieces.controllerLed.emissiveIntensity = lit ? 2.2 : 0;
      const bars = lit ? clamp(state.electricPower / 2500, 0.2, 1) : 0;
      pieces.batterySegments.forEach((m, i) => {
        const chase = lit ? 0.5 + 0.5 * Math.sin(view.time * 3 - i * 0.9) : 0;
        m.emissiveIntensity = i === 0 ? 0.35 + 1.6 * bars * (lit ? 1 : 0) : 2 * bars * chase;
      });
      pieces.inverterLed.emissiveIntensity = lit && state.electricPower > 1 ? 2.2 : 0;
      // the meter: the disc turns at 600 turns per kWh, the lamp flashes once a turn
      const kW = Math.max(0, state.electricPower) / 1000;
      const turnsPerSecond = (METER_REV_PER_KWH * kW) / 3600;
      drawn.disc += 2 * Math.PI * turnsPerSecond * view.slowMo * dt;
      pieces.meterDisc.rotation.z = -drawn.disc;
      const phase = (drawn.disc / (2 * Math.PI)) % 1;
      pieces.meterLed.emissiveIntensity = kW > 0.001 && phase < 0.14 ? 2.6 : 0.05;
      // "Flux": the dots go at the speed of the amperes
      flows.object.visible = view.schematic;
      if (view.schematic) {
        flows.advance(pathIndex, 0.045 * clamp(state.current, 0, 80), dt);
        flows.place();
      }
    },
  };
  return mod;
}
