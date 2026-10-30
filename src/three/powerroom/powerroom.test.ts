import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GHOST } from '@onigam/lab-kit/three';
import { partIds } from '../../part-ids';
import { ELECTRONICS, POWERROOM, SITE } from '../dims';
import { buildBattery, buildController, buildRectifier } from '../screw/drive';
import { createScrewScene } from '../screw/scene';
import { drawStats, finiteTree, floating, isolateOne, sceneBoxes, stateWith, touches, view } from '../test-utils';
import { EXPLODE, METER_REV_PER_KWH, createPowerroomScene } from './scene';
import { FZ, NUMERAL_Y } from './parts';

// The `powerroom` world by script: ids and labels, the equipment stands on the wall in the order the current goes, the three devices that moved from the screw world are
// drawn by the same builders, nothing floats, the room is the powerhouse of the site, the lamps, the bars and the meter follow the state, the dump load is not simulated (it is
// at rest and no dot goes to it), the walls fade with the camera, explode, isolate and ghost for every part, a NaN-free animation, the budget.

const IDS = partIds('powerroom');
const P = POWERROOM;
/** The order the current goes: the ids from the cable to the meter, the devices only (the board and the earthing carry them). */
const ORDER = [
  'dc-breaker',
  'fuse-box',
  'rectifier',
  'charge-controller',
  'battery',
  'dump-load',
  'inverter',
  'energy-meter',
] as const;

describe('powerroom world', () => {
  const t0 = performance.now();
  const mod = createPowerroomScene();
  const firstBuildMs = performance.now() - t0;
  const reg = mod.registry;
  const go = (over = {}, v = {}, frames = 2, params = {}) => {
    const s = stateWith(over, params);
    for (let i = 0; i < frames; i++) mod.update(s, 1 / 60, view({ time: 1 + i, ...v }));
    mod.scene.updateMatrixWorld(true);
    return s;
  };
  const supports = () => mod.scenery().map((o) => new THREE.Box3().setFromObject(o, true));
  /** The box of what a part is made of, without the wires that come to it and the numeral. */
  const bodyBox = (id: string) => new THREE.Box3().setFromObject(reg.get(id)!.object, true);

  it('registers exactly the ten frozen ids, each with meshes of its own', () => {
    go();
    expect(IDS).toHaveLength(10);
    expect([...reg.ids()].sort()).toEqual([...IDS].sort());
    for (const id of IDS) expect(reg.get(id)!.meshes.length, id).toBeGreaterThan(0);
  });

  it('has a hotspot for every part, five main labels, and anchors that live in the scene', () => {
    expect(mod.hotspots.map((h) => h.partId).sort()).toEqual([...IDS].sort());
    expect(mod.hotspots.filter((h) => !h.minor).map((h) => h.partId)).toEqual([
      'dc-breaker',
      'rectifier',
      'charge-controller',
      'battery',
      'inverter',
    ]);
    mod.scene.updateMatrixWorld(true);
    for (const h of mod.hotspots) {
      let o: THREE.Object3D | null = h.anchor;
      while (o && o !== mod.scene) o = o.parent;
      expect(o, h.partId).toBe(mod.scene);
      expect(h.label.fr.length).toBeGreaterThan(2);
      expect(h.label.en.length).toBeGreaterThan(2);
    }
  });

  it('has no floating part: every part touches another part or the room (floor, walls)', () => {
    go();
    reg.setAllFactors(0);
    expect(floating(sceneBoxes(mod), 0.003, supports())).toEqual([]);
    // the battery stands on its shelf (the rack is the switchboard's), the rod comes out of the floor, the rack stands on the floor
    const b = sceneBoxes(mod);
    expect(mod.pieces.built.at.battery.y).toBeCloseTo(P.rack.shelf, 9);
    expect(b.get('earthing')!.min.y).toBeLessThan(0.002);
    expect(b.get('switchboard')!.min.y).toBeLessThan(0.002);
    // every device on the wall touches the mounting plate (the switchboard), the battery its rack
    for (const id of ORDER.filter((o) => o !== 'battery'))
      expect(touches(b.get(id)!, b.get('switchboard')!, 0.002), id).toBe(true);
    expect(touches(b.get('battery')!, b.get('switchboard')!, 0.002)).toBe(true);
  });

  it('is the little building of the site seen from inside: the same width, depth and height, the equipment inside the room', () => {
    expect(P.width).toBeCloseTo(SITE.powerhouse.length - 2 * P.wall, 9);
    expect(P.depth).toBeCloseTo(SITE.powerhouse.width - 2 * P.wall, 9);
    expect(P.height).toBe(SITE.powerhouse.wallHeight);
    go();
    reg.setAllFactors(0);
    for (const id of IDS) {
      const bx = sceneBoxes(mod).get(id)!;
      expect(bx.min.x, id).toBeGreaterThanOrEqual(-P.width / 2 - 0.02);
      expect(bx.max.x, id).toBeLessThanOrEqual(P.width / 2 + 0.02);
      expect(bx.min.z, id).toBeGreaterThanOrEqual(-0.001);
      expect(bx.max.z, id).toBeLessThanOrEqual(P.depth);
      expect(bx.max.y, id).toBeLessThanOrEqual(P.height + 0.001);
    }
  });

  describe('in the order the current goes', () => {
    it('puts the devices from the cable to the meter in order along the wall, the battery below, and numbers them 1 to 8', () => {
      go();
      reg.setAllFactors(0);
      const xs = ORDER.map((id) => {
        const d = {
          'dc-breaker': P.breaker.x,
          'fuse-box': P.fuseBox.x,
          rectifier: P.rectifier.x,
          'charge-controller': P.controller.x,
          battery: P.battery.x,
          'dump-load': P.dumpLoad.x,
          inverter: P.inverter.x,
          'energy-meter': P.meter.x,
        };
        return d[id];
      });
      for (let i = 1; i < xs.length; i++) expect(xs[i], ORDER[i]).toBeGreaterThan(xs[i - 1]);
      // the row on the wall: in front of the plate (the wires that come to a device make its box taller, so only the depth is checked); the battery is the one on the floor
      for (const id of ORDER.filter((o) => o !== 'battery')) {
        expect(bodyBox(id).min.z, id).toBeGreaterThanOrEqual(FZ - 0.005);
      }
      expect(bodyBox('battery').min.y).toBeLessThan(0.4);
      // eight numerals, one in each device (white segments on a black plate), in order, the ones on the wall in a row at one height
      ORDER.forEach((id, i) =>
        expect(reg.get(id)!.object.getObjectByName(`numeral-${i + 1}`), `${id} carries ${i + 1}`).toBeDefined(),
      );
      let count = 0;
      mod.scene.traverse((o) => o.name.startsWith('numeral-') && count++);
      expect(count).toBe(8);
      expect(NUMERAL_Y).toBeGreaterThan(1.7);
    });

    it('follows the wires: one path from the cable in to the line out, through the devices in order, the pieces joined end to end', () => {
      const [cableIn, dc, out, lineOut] = mod.path;
      const paths = [...cableIn, ...dc, ...out, ...lineOut];
      expect(paths.length).toBeGreaterThan(100);
      // each piece ends where the next begins (a few centimetres)
      expect(cableIn[cableIn.length - 1].distanceTo(dc[0])).toBeLessThan(0.1);
      expect(dc[dc.length - 1].distanceTo(out[0])).toBeLessThan(0.05);
      expect(out[out.length - 1].distanceTo(lineOut[0])).toBeLessThan(0.1);
      // inside a piece no step is longer than the run of the conduit along the west wall (a metre) and nothing jumps through the room
      let longest = 0;
      for (let i = 1; i < paths.length; i++) longest = Math.max(longest, paths[i].distanceTo(paths[i - 1]));
      expect(longest).toBeLessThan(1.1);
      // it starts outside the west wall and ends outside the east wall
      expect(paths[0].x).toBeLessThan(-P.width / 2 - P.wall);
      expect(paths[paths.length - 1].x).toBeGreaterThan(P.width / 2 + P.wall);
      // it visits the devices in their order: the first point near each device's box, in increasing order along the path
      const near = (id: string) => {
        const bx = bodyBox(id).expandByScalar(0.12);
        return paths.findIndex((p) => bx.containsPoint(p));
      };
      const idx = ORDER.filter((id) => id !== 'dump-load').map(near);
      for (const i of idx) expect(i).toBeGreaterThanOrEqual(0);
      for (let i = 1; i < idx.length; i++) expect(idx[i], ORDER[i]).toBeGreaterThan(idx[i - 1]);
    });
  });

  describe('the rectifier, the charge controller and the battery are the ones of the screw world (same builders)', () => {
    it('are made of what buildRectifier, buildController and buildBattery return, at their ELECTRONICS sizes, and placed on the wall and its rack', () => {
      const { built } = mod.pieces;
      const size = (ms: THREE.Mesh[]) => {
        const g = new THREE.Group();
        const ref = ms.map((m) => m.clone());
        ref.forEach((m) => g.add(m));
        return new THREE.Box3().setFromObject(g, true).getSize(new THREE.Vector3());
      };
      // what the builders return today is what was drawn: same boxes (the meshes themselves moved into the parts)
      for (const [name, fresh, dims] of [
        ['rectifier', buildRectifier(1), ELECTRONICS.rectifier],
        ['controller', buildController(1), ELECTRONICS.controller],
        ['battery', buildBattery(1), ELECTRONICS.battery],
      ] as const) {
        const a = size(fresh.meshes);
        expect(a.x, name).toBeGreaterThanOrEqual(dims[0] - 1e-6);
        expect(a.x, name).toBeLessThan(dims[0] * 1.1);
        expect(a.z, name).toBeGreaterThanOrEqual(dims[2] - 1e-6);
      }
      expect(built.rectifier.meshes.length).toBe(buildRectifier(1).meshes.length);
      expect(built.controller.meshes.length).toBe(buildController(1).meshes.length);
      expect(built.battery.meshes.length).toBe(buildBattery(1).meshes.length);
      expect(built.battery.segments).toHaveLength(5);
      expect(built.controller.led).toBe(mod.pieces.controllerLed);
      // they are in the room: the box of each part contains the builder's box moved to its place
      go();
      reg.setAllFactors(0);
      const b = sceneBoxes(mod);
      const at = built.at;
      expect(
        b
          .get('rectifier')!
          .containsPoint(at.rectifier.clone().add(new THREE.Vector3(0, ELECTRONICS.rectifier[1] / 2, 0))),
      ).toBe(true);
      expect(
        b
          .get('charge-controller')!
          .containsPoint(at.controller.clone().add(new THREE.Vector3(0, ELECTRONICS.controller[1] / 2, 0))),
      ).toBe(true);
      expect(
        b.get('battery')!.containsPoint(at.battery.clone().add(new THREE.Vector3(0, ELECTRONICS.battery[1] / 2, 0))),
      ).toBe(true);
      // the screw world no longer has them
      const screw = createScrewScene();
      for (const id of ['rectifier', 'charge-controller', 'battery'])
        expect(screw.registry.get(id), id).toBeUndefined();
    });
  });

  describe('follows the state', () => {
    it('lights the lamp of the controller, the lamp of the inverter and the bars of the battery while charging, and nothing otherwise', () => {
      go({ charging: true, electricPower: 2200 });
      expect(mod.pieces.controllerLed.emissiveIntensity).toBeGreaterThan(1);
      expect(mod.pieces.inverterLed.emissiveIntensity).toBeGreaterThan(1);
      expect(mod.pieces.batterySegments[0].emissiveIntensity).toBeGreaterThan(0.5);
      const lit = (e: number) => mod.pieces.batterySegments.map((m) => m.emissiveIntensity).filter((x) => x > e).length;
      expect(lit(0.3)).toBeGreaterThan(0);
      go({ charging: false, electricPower: 0 });
      expect(mod.pieces.controllerLed.emissiveIntensity).toBe(0);
      expect(mod.pieces.inverterLed.emissiveIntensity).toBe(0);
      // the lowest bar stays on a little (the battery is not empty), the others go out
      expect(mod.pieces.batterySegments[0].emissiveIntensity).toBeLessThan(0.4);
      for (const m of mod.pieces.batterySegments.slice(1)) expect(m.emissiveIntensity).toBe(0);
    });

    it('turns the disc of the meter at 600 turns per kWh, with a flash once a turn, and stops it when nothing is produced', () => {
      const run = (power: number, seconds: number, slowMo = 1) => {
        (mod.drawn as { disc: number }).disc = 0;
        const s = stateWith({ electricPower: power, charging: power > 0 });
        for (let i = 0; i < seconds * 60; i++) mod.update(s, 1 / 60, view({ time: 1 + i / 60, slowMo }));
        return mod.drawn.disc / (2 * Math.PI);
      };
      expect(METER_REV_PER_KWH).toBe(600);
      expect(run(2200, 10)).toBeCloseTo((600 * 2.2 * 10) / 3600, 1);
      expect(run(1100, 10) / run(2200, 10)).toBeCloseTo(0.5, 2);
      expect(run(0, 10)).toBe(0);
      expect(run(2200, 10, 0.1)).toBeCloseTo(0.1 * ((600 * 2.2 * 10) / 3600), 1);
      // the disc turns about its own axis (the plane of the wall) and the sense is the same all the time
      expect(mod.pieces.meterDisc.rotation.x).toBe(0);
      expect(mod.pieces.meterDisc.rotation.y).toBe(0);
      // the lamp flashes once a turn: on for a short part of it
      let on = 0;
      const s = stateWith({ electricPower: 2200, charging: true });
      (mod.drawn as { disc: number }).disc = 0;
      const N = 600;
      for (let i = 0; i < N; i++) {
        mod.update(s, 1 / 60, view({ time: 1 + i / 60 }));
        if (mod.pieces.meterLed.emissiveIntensity > 1) on++;
      }
      expect(on).toBeGreaterThan(0);
      expect(on).toBeLessThan(0.3 * N);
      go({ electricPower: 0, charging: false });
      expect(mod.pieces.meterLed.emissiveIntensity).toBeLessThan(0.2);
    });

    it('draws the dots of the current at the speed of the amperes, in the order of the wires', () => {
      go({}, { schematic: false });
      expect(mod.flows.object.visible).toBe(false);
      const first = () =>
        new THREE.Vector3().fromBufferAttribute(
          mod.flows.object.geometry.attributes.position as THREE.BufferAttribute,
          1,
        );
      const move = (current: number) => {
        const s = stateWith({ current });
        mod.update(s, 1 / 60, view({ schematic: true, time: 500 }));
        const a = first();
        mod.update(s, 0.05, view({ schematic: true, time: 501 }));
        return a.distanceTo(first());
      };
      const d = move(10);
      expect(mod.flows.object.visible).toBe(true);
      expect(d).toBeGreaterThan(0.005);
      expect(move(20) / d).toBeGreaterThan(1.7);
      expect(move(20) / d).toBeLessThan(2.1);
      expect(move(0)).toBeCloseTo(0, 9);
      go({}, { schematic: false });
    });

    it('does not simulate the dump load: it is drawn at rest, nothing of it lights, and no dot goes through it', () => {
      go({ charging: true, electricPower: 2200, current: 46 }, { schematic: true });
      const dump = reg.get('dump-load')!;
      for (const m of dump.meshes)
        expect((m.material as THREE.MeshStandardMaterial).emissive.getHex(), 'dump load emissive').toBe(0);
      const box = bodyBox('dump-load').clone();
      box.min.y += 0.04; // leave the wires that come to it
      const path = mod.path.flat();
      const inside = path.filter((p) => box.containsPoint(p) && p.z > FZ + 0.01);
      expect(inside).toHaveLength(0);
      go({}, { schematic: false });
    });
  });

  it('fades the front wall and the ceiling when the camera is outside them, the other walls when it is behind them', () => {
    const fade = (cam: THREE.Vector3) => {
      const camera = new THREE.PerspectiveCamera();
      camera.position.copy(cam);
      return mod.room.fading.map((m) => {
        m.onBeforeRender(
          null as never,
          null as never,
          camera,
          null as never,
          m.material as THREE.Material,
          null as never,
        );
        return (m.material as THREE.Material).opacity;
      });
    };
    const inside = fade(new THREE.Vector3(0, 1.4, 1.2));
    expect(inside.every((o) => o === 1)).toBe(true);
    const front = fade(new THREE.Vector3(0, 1.4, 5));
    expect(front.filter((o) => o < 0.1)).toHaveLength(1); // the front wall only
    const above = fade(new THREE.Vector3(0, 6, 1.2));
    expect(above.filter((o) => o < 0.1)).toHaveLength(1); // the ceiling only
    const behind = fade(new THREE.Vector3(0, 1.4, -4));
    expect(behind.filter((o) => o < 0.1)).toHaveLength(1);
    const east = fade(new THREE.Vector3(5, 1.4, 1.2));
    expect(east.filter((o) => o < 0.1)).toHaveLength(3); // the three pieces of the east wall
    for (const m of mod.room.fading) expect((m.material as THREE.Material).transparent).toBe(true);
    fade(new THREE.Vector3(0, 1.4, 1.2));
  });

  it('explodes every part by its own path and returns it to its place', () => {
    reg.setAllFactors(0);
    go();
    const before = sceneBoxes(mod);
    reg.setAllFactors(1);
    mod.scene.updateMatrixWorld(true);
    const after = sceneBoxes(mod);
    for (const id of IDS) {
      const d = after.get(id)!.getCenter(new THREE.Vector3()).sub(before.get(id)!.getCenter(new THREE.Vector3()));
      expect(d.x, id).toBeCloseTo(EXPLODE[id as keyof typeof EXPLODE][0], 6);
      expect(d.y, id).toBeCloseTo(EXPLODE[id as keyof typeof EXPLODE][1], 6);
      expect(d.z, id).toBeCloseTo(EXPLODE[id as keyof typeof EXPLODE][2], 6);
    }
    // the devices come off the wall towards the viewer, the board stays
    for (const id of IDS.filter((i) => i !== 'switchboard'))
      expect(EXPLODE[id as keyof typeof EXPLODE][2], id).toBeGreaterThan(0.5);
    expect(EXPLODE.switchboard).toEqual([0, 0, 0]);
    reg.setAllFactors(0);
    mod.scene.updateMatrixWorld(true);
    const back = sceneBoxes(mod);
    for (const id of IDS) expect(back.get(id)!.min.y, id).toBeCloseTo(before.get(id)!.min.y, 6);
  });

  it('isolates and ghosts every part, and shows its meshes again', () => {
    for (const id of IDS)
      for (const mode of ['hidden', 'ghost'] as const) {
        isolateOne(reg, id, mode);
        go();
        expect(
          reg.get(id)!.meshes.every((m) => m.visible && m.material !== GHOST),
          `${id} ${mode}`,
        ).toBe(true);
        for (const other of IDS.filter((o) => o !== id))
          expect(
            reg.get(other)!.meshes.every((m) => (mode === 'hidden' ? !m.visible : m.material === GHOST)),
            `${other} ${mode}`,
          ).toBe(true);
        expect(finiteTree(mod.scene)).toBe(true);
      }
    reg.setAllDisplay('solid');
    go();
    expect(reg.get('inverter')!.meshes.every((m) => m.visible)).toBe(true);
    // every part keeps a material the kit can drive (the one see-through cover of the fuse box is a standard material too)
    for (const id of IDS)
      for (const m of reg.get(id)!.meshes) expect((m.material as THREE.Material).type, id).toBe('MeshStandardMaterial');
  });

  it('animates the whole range of the state without a NaN: stopped, charging, full power, flood, wheel, slow motion, exploded', () => {
    const cases: [object, object][] = [
      [{}, {}],
      [{}, { riverFlow: 0.03 }],
      [{}, { chainRatio: 1, beltRatio: 8 }],
      [{}, { machine: 'overshot' }],
      [{ electricPower: 0, current: 0, charging: false, omega: 0 }, {}],
      [{ electricPower: 9000, current: 80, charging: true, angle: 6.2 }, {}],
      [{ electricPower: -5, current: -3 }, {}],
    ];
    for (const [over, params] of cases)
      for (const v of [{}, { schematic: true }, { slowMo: 0.02 }])
        for (const f of [0, 1]) {
          reg.setAllFactors(f);
          const s = stateWith(over, params);
          for (let i = 0; i < 4; i++)
            mod.update(
              { ...s, angle: (s.angle + i * 0.4) % (2 * Math.PI) },
              1 / 60,
              view({ time: 1000 + i * 0.2, ...v }),
            );
          mod.scene.updateMatrixWorld(true);
          expect(finiteTree(mod.scene), JSON.stringify([over, params, v, f])).toBe(true);
          expect(Number.isFinite(mod.drawn.disc)).toBe(true);
          for (const id of IDS) {
            const b = reg.bounds(id);
            expect(Number.isFinite(b.min.x) && Number.isFinite(b.max.y) && Number.isFinite(b.max.z), id).toBe(true);
          }
        }
    reg.setAllFactors(0);
  });

  it('stays inside the budget of a new world: at most 120 draw calls and 150,000 triangles, built in a few hundred milliseconds', () => {
    go({}, { schematic: true });
    const s = drawStats(mod.scene);
    // eslint-disable-next-line no-console
    console.info(
      `[powerroom] ${s.calls} draw calls, ${s.triangles} triangles, first build ${Math.round(firstBuildMs)} ms`,
    );
    expect(s.calls).toBeLessThanOrEqual(120);
    expect(s.triangles).toBeLessThanOrEqual(150000);
    expect(firstBuildMs).toBeLessThan(1000);
  });
});
