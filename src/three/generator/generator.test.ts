import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GHOST } from '@onigam/lab-kit/three';
import { partIds } from '../../part-ids';
import { GEN_RATED_RPM } from '../../sim/machine';
import { MillSim } from '../../sim/engine';
import { D, FOOT_BOTTOM, G, LEN, POLE_PITCH, R, R_CORE, R_MAGNET, toothAngle } from './geometry';
import { DESIGN, GENERATOR, GENERATOR_DESIGN, electricalFrequency } from '../dims';
import { buildGenerator } from '../screw/drive';
import { createScrewScene } from '../screw/scene';
import { createSiteScene } from '../site/scene';
import { drawStats, finiteTree, floating, isolateOne, sceneBoxes, stateWith, view } from '../test-utils';
import { BLUR_FROM, BLUR_FULL, BEARING_EXPLODE, EXPLODE, FLOOR_Y, createGeneratorScene } from './scene';
import { BLUR_FROM as SCREW_BLUR_FROM, BLUR_FULL as SCREW_BLUR_FULL } from '../screw/scene';

// The `generator` world by script: ids and labels, what is drawn follows dims.ts (16 magnets, 24 teeth and coils, the gap), nothing floats, it is the SAME machine as the blue
// generator of the screw and site worlds (the coherence test), the rotor turns at the generator's speed (capped against the wagon-wheel illusion), the section takes a quarter away
// (and follows an exploded part), explode, isolate and ghost for every part, a NaN-free animation over the state, the budget.

const IDS = partIds('generator');
const TOL = 0.004;

describe('generator world', () => {
  const t0 = performance.now();
  const mod = createGeneratorScene();
  const firstBuildMs = performance.now() - t0;
  const reg = mod.registry;
  const go = (over = {}, v = {}, frames = 2, params = {}) => {
    const s = stateWith(over, params);
    for (let i = 0; i < frames; i++) mod.update(s, 1 / 60, view({ time: 1 + i, ...v }));
    mod.scene.updateMatrixWorld(true);
    return s;
  };
  const supports = () => [new THREE.Box3().setFromObject(mod.stand, true)];

  it('registers exactly the eight frozen ids, each with meshes of its own', () => {
    go();
    expect(IDS).toHaveLength(8);
    expect([...reg.ids()].sort()).toEqual([...IDS].sort());
    for (const id of IDS) expect(reg.get(id)!.meshes.length, id).toBeGreaterThan(0);
  });

  it('has a hotspot for every part, four main labels, and anchors that live in the scene', () => {
    expect(mod.hotspots.map((h) => h.partId).sort()).toEqual([...IDS].sort());
    expect(mod.hotspots.filter((h) => !h.minor).map((h) => h.partId)).toEqual([
      'gen-stator',
      'gen-rotor',
      'gen-magnets',
      'gen-terminals',
    ]);
    mod.scene.updateMatrixWorld(true);
    for (const h of mod.hotspots) {
      let o: THREE.Object3D | null = h.anchor;
      while (o && o !== mod.scene) o = o.parent;
      expect(o, h.partId).toBe(mod.scene);
      expect(h.label.fr.length).toBeGreaterThan(2);
      expect(h.label.en.length).toBeGreaterThan(2);
      expect(h.label.fr).not.toMatch(/gen-/);
    }
  });

  it('has no floating part: every part touches another part or the skids', () => {
    go();
    reg.setAllFactors(0);
    expect(floating(sceneBoxes(mod), 0.002, supports())).toEqual([]);
    // the base plate stands on the skids, the skids on the floor
    const stand = supports()[0];
    expect(stand.min.y).toBeCloseTo(FLOOR_Y, 6);
    expect(sceneBoxes(mod).get('gen-frame')!.min.y).toBeCloseTo(stand.max.y, 4);
  });

  describe('the numbers agree with the simulation and with dims.ts', () => {
    it("is wound for the simulation: the rated speed is the sim's, the frequency follows poles × rpm / 120, the model results are the ones the sheets quote", () => {
      expect(GENERATOR_DESIGN.ratedRpm).toBe(GEN_RATED_RPM);
      expect(D.poles).toBe(16);
      expect(D.slots).toBe(24);
      expect(electricalFrequency(GEN_RATED_RPM)).toBe(80);
      expect(electricalFrequency(600, 10)).toBe(50);
      // at the design point the sim gives about 600 rpm, 39 N·m, 2.2 kW to the battery
      const sim = new MillSim();
      for (let i = 0; i < 60 * 40; i++) sim.step(1 / 60);
      const s = sim.state;
      expect(s.generatorRpm).toBeGreaterThan(0.97 * D.ratedRpm);
      expect(s.generatorRpm).toBeLessThan(1.03 * D.ratedRpm);
      expect(s.generatorTorque).toBeGreaterThan(37);
      expect(s.generatorTorque).toBeLessThan(41);
      expect(s.electricPower).toBeGreaterThan(2100);
      expect(s.electricPower).toBeLessThan(2300);
      // the three-phase machine's electrical frequency at the speed the sim reached
      expect(electricalFrequency(s.generatorRpm)).toBeCloseTo((D.poles * s.generatorRpm) / 120, 9);
    });

    it('draws what dims.ts says: 16 magnets, 24 teeth and 24 coils, in a 1.5 mm air gap', () => {
      // count the clusters of vertices round the axis: each is one magnet, one tooth tip, one end turn
      const clusters = (id: string, rMin: number, rMax: number, gap: number): number => {
        const angles: number[] = [];
        reg.get(id)!.object.updateMatrixWorld(true);
        for (const m of reg.get(id)!.meshes) {
          const p = m.geometry.attributes.position;
          const v = new THREE.Vector3();
          for (let i = 0; i < p.count; i++) {
            v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
            const r = Math.hypot(v.y, v.z);
            if (r >= rMin && r <= rMax) angles.push((Math.atan2(v.z, v.y) + 2 * Math.PI) % (2 * Math.PI));
          }
        }
        angles.sort((a, b) => a - b);
        let n = 0;
        for (let i = 0; i < angles.length; i++) {
          const prev = i === 0 ? angles[angles.length - 1] - 2 * Math.PI : angles[i - 1];
          if (angles[i] - prev > gap) n++;
        }
        return n;
      };
      expect(clusters('gen-magnets', R_CORE - 0.001, R_MAGNET + 0.001, 0.065)).toBe(D.poles);
      expect(clusters('gen-stator', D.stator.boreRadius - 0.0005, D.stator.boreRadius + 0.0005, 0.056)).toBe(D.slots);
      // the coils: 24 of the same shape (the copper mesh has 48 triangles per coil), one coloured tab on each, eight of each phase
      const coils = reg.get('gen-coils')!.meshes;
      const triangles = (m: THREE.Mesh) =>
        (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
      const copper = coils.reduce((a, m) => (triangles(m) > triangles(a) ? m : a));
      expect(triangles(copper) / 48).toBe(D.slots);
      const tabs = coils.filter((m) => m !== copper);
      expect(tabs).toHaveLength(D.phases);
      for (const m of tabs) expect(triangles(m) / 12).toBe(D.slots / D.phases);
      // the gap between the tooth tips and the magnets
      expect(D.stator.boreRadius - R_MAGNET).toBeCloseTo(D.gap, 9);
      expect(D.gap).toBeCloseTo(0.0015, 9);
      // the poles are alternate: north and south magnets are different materials, as many of each
      const mats = new Set(
        reg.get('gen-magnets')!.meshes.map((m) => (m.material as THREE.MeshStandardMaterial).color.getHex()),
      );
      expect(mats.size).toBe(2);
      // the slots are centred on the top, so the plane through the axis cuts a slot at the top and the bottom
      expect(toothAngle(0)).toBeCloseTo(Math.PI / D.slots, 9);
      // the phases follow A, B, C round the stator: three different colours of tab
      expect(new Set(tabs.map((m) => (m.material as THREE.MeshStandardMaterial).color.getHex())).size).toBe(D.phases);
    });
  });

  describe('is the same machine as the blue generator of the screw and site worlds', () => {
    const ref = buildGenerator(1);
    const refBox = (ms: THREE.Mesh[]) => {
      const g = new THREE.Group();
      ms.forEach((m) => g.add(m));
      return new THREE.Box3().setFromObject(g, true);
    };
    const close = (a: THREE.Box3, b: THREE.Box3, what: string) => {
      for (const k of ['x', 'y', 'z'] as const) {
        expect(Math.abs(a.min[k] - b.min[k]), `${what} min ${k}`).toBeLessThan(TOL);
        expect(Math.abs(a.max[k] - b.max[k]), `${what} max ${k}`).toBeLessThan(TOL);
      }
    };

    it("has the frame, the shaft and the terminal box of buildGenerator (the screw world's builder) to within a few millimetres", () => {
      go();
      reg.setAllFactors(0);
      const frame = reg.bounds('gen-frame');
      const shaft = reg.bounds('gen-shaft');
      const box = new THREE.Box3().setFromObject(
        reg.get('gen-terminals')!.object.getObjectByName('terminal-box')!,
        true,
      );
      const body = refBox(ref.body);
      // the whole envelope of the body (frame, bells, feet, terminal box and lid) is the blue machine's
      close(frame.clone().union(box), body, 'body');
      close(shaft, refBox(ref.shaft), 'shaft');
      // the dimensions are GENERATOR's: length, diameter, shaft, box
      expect(frame.max.x - frame.min.x).toBeCloseTo(G.bodyLength + G.stub / 9.5 + 0.0, 1);
      expect(frame.max.z - frame.min.z).toBeCloseTo(2 * (G.bodyRadius + G.bellExtra), 2);
      expect(shaft.max.x - shaft.min.x).toBeCloseTo(G.stub + G.bodyLength + 0.03, 2);
      expect((shaft.max.y - shaft.min.y) / 2).toBeCloseTo(G.shaftRadius, 2);
      const [bx, , bz] = G.box;
      expect(box.max.x - box.min.x).toBeGreaterThan(bx);
      expect(box.max.x - box.min.x).toBeLessThan(bx * 1.1);
      expect(box.max.z - box.min.z).toBeGreaterThan(bz);
      expect(box.max.z - box.min.z).toBeLessThan(bz * 1.1);
      // the box stands where the screw world puts it: 0.55 of the length from the front face
      expect((box.min.x + box.max.x) / 2).toBeCloseTo(LEN * 0.55, 3);
      expect(Math.abs(box.max.y - (ref.terminal.y + 0.006))).toBeLessThan(TOL);
      // the shaft is at the axis, the foot at the same height under it
      expect(frame.min.y).toBeCloseTo(FOOT_BOTTOM, 4);
    });

    /** The generator of another world, seen in its own axis frame: terminal box (relative to the middle of the body) and width. */
    const inAxis = (beta: number, centre: THREE.Vector3, terminal: THREE.Vector3) => {
      const d = terminal.clone().sub(centre);
      return { x: d.x * Math.cos(beta) + d.y * Math.sin(beta), y: -d.x * Math.sin(beta) + d.y * Math.cos(beta) };
    };

    it('is the one drawn in the screw world: same width, same terminal box position over the middle of the body', () => {
      const screw = createScrewScene();
      screw.update(stateWith(), 1 / 60, view());
      screw.scene.updateMatrixWorld(true);
      const l = screw.drawn.layout;
      expect(l.k).toBeCloseTo(1, 9);
      const part = screw.registry.bounds('generator');
      expect((part.max.z - part.min.z) / 2).toBeCloseTo(G.bodyRadius + G.bellExtra, 2);
      const t = inAxis(l.beta, screw.rig.places.generator, screw.rig.paths.current[0]);
      const box = new THREE.Box3().setFromObject(
        reg.get('gen-terminals')!.object.getObjectByName('terminal-box')!,
        true,
      );
      expect(Math.abs(t.x - ((box.min.x + box.max.x) / 2 - LEN / 2))).toBeLessThan(TOL);
      // the cable's first point is 1 cm over the middle of the lid (R + the height of the box), 4 mm over its top face
      expect(Math.abs(t.y - (G.bodyRadius + G.box[1] + 0.01))).toBeLessThan(TOL);
      expect(Math.abs(t.y - 0.004 - box.max.y)).toBeLessThan(TOL);
    });

    it('is the one drawn in the site world: same width, same terminal box position over the middle of the body', () => {
      const site = createSiteScene();
      site.update(stateWith(), 1 / 60, view());
      site.scene.updateMatrixWorld(true);
      const drive = site.chamber().drive;
      const part = new THREE.Box3().setFromObject(drive.roots.generator, true);
      expect((part.max.z - part.min.z) / 2).toBeCloseTo(G.bodyRadius + G.bellExtra, 2);
      const centre = drive.rig.places.generator
        .clone()
        .add(new THREE.Vector3(drive.frame.dx, drive.frame.dy, drive.frame.dz));
      const t = inAxis(drive.layout.beta, centre, drive.terminal);
      const box = new THREE.Box3().setFromObject(
        reg.get('gen-terminals')!.object.getObjectByName('terminal-box')!,
        true,
      );
      expect(Math.abs(t.x - ((box.min.x + box.max.x) / 2 - LEN / 2))).toBeLessThan(TOL);
      expect(Math.abs(t.y - (G.bodyRadius + G.box[1] + 0.01))).toBeLessThan(TOL);
      expect(Math.abs(t.y - 0.004 - box.max.y)).toBeLessThan(TOL);
    });

    it('reads its numbers from GENERATOR (nothing retyped): the same constants the screw builder uses', () => {
      expect(G).toBe(GENERATOR);
      expect(R).toBe(GENERATOR.bodyRadius);
      expect(LEN).toBe(GENERATOR.bodyLength);
      expect(DESIGN.generatorRpm).toBe(D.ratedRpm);
    });
  });

  describe('the rotor, the magnets and the shaft turn', () => {
    const turning = () => [mod.pieces.rot.rotor, mod.pieces.rot.magnets, mod.pieces.rot.shaft];
    const frame = (angle: number, over: object = {}, v: object = {}, dt = 1 / 60) =>
      mod.update(stateWith({ angle, ...over }), dt, view({ time: 1, ...v }));
    const reset = () => {
      (mod.drawn as { phase: number }).phase = 0;
      frame(0, {}, { slowMo: 1 });
    };

    it("turn together at the generator's speed: the screw's step times the ratio of the drive, in the same sense", () => {
      reset();
      const s = stateWith({}, {}, 10);
      // two frames of the same state, the screw's angle a little further on (slow motion: no cap)
      const v = { slowMo: 0.01 };
      mod.update({ ...s, angle: 1 }, 1 / 60, view(v));
      const p0 = mod.drawn.phase;
      mod.update({ ...s, angle: 1.0003 }, 1 / 60, view(v));
      const ratio = s.generatorRpm / s.rpm;
      expect(ratio).toBeCloseTo(10.9, 0);
      expect(mod.drawn.phase - p0).toBeCloseTo(0.0003 * ratio, 6);
      for (const g of turning()) expect(g.rotation.x).toBeCloseTo(mod.drawn.phase, 9);
      // the same sense as the screw: positive about +X
      expect(mod.drawn.phase - p0).toBeGreaterThan(0);
    });

    it('stays still when the machine stands, and unwraps the angle when it passes 2π', () => {
      reset();
      const stopped = stateWith({ rpm: 0, omega: 0, generatorRpm: 0 });
      mod.update({ ...stopped, angle: 0.5 }, 1 / 60, view());
      const p = mod.drawn.phase;
      mod.update({ ...stopped, angle: 0.9 }, 1 / 60, view());
      expect(mod.drawn.phase).toBe(p);
      reset();
      const s = stateWith({}, {}, 10);
      mod.update({ ...s, angle: 2 * Math.PI - 0.0001 }, 1 / 60, view({ slowMo: 0.01 }));
      const a = mod.drawn.phase;
      mod.update({ ...s, angle: 0.0001 }, 1 / 60, view({ slowMo: 0.01 }));
      expect(mod.drawn.phase - a).toBeGreaterThan(0);
      expect(mod.drawn.phase - a).toBeLessThan(0.01);
    });

    it('is capped against the wagon-wheel illusion: above 14 positions a second it moves at most 14 positions a second', () => {
      expect(BLUR_FROM).toBe(SCREW_BLUR_FROM);
      expect(BLUR_FULL).toBe(SCREW_BLUR_FULL);
      reset();
      const s = stateWith({}, {}, 10);
      const dt = 1 / 60;
      // at 600 rpm the rotor passes 80 positions a second (16 poles, eight identical positions per turn): a screw step of 0.0153 rad is a rotor step of 0.17 rad
      mod.update({ ...s, angle: 0 }, dt, view({ slowMo: 1 }));
      let last = mod.drawn.phase;
      let worst = 0;
      for (let i = 1; i <= 30; i++) {
        mod.update({ ...s, angle: (i * s.omega * dt) % (2 * Math.PI) }, dt, view({ slowMo: 1 }));
        worst = Math.max(worst, Math.abs(mod.drawn.phase - last));
        last = mod.drawn.phase;
      }
      const cap = (2 * Math.PI * BLUR_FROM * dt) / (D.poles / 2);
      expect(mod.drawn.blur).toBeGreaterThan(0.99);
      expect(worst).toBeLessThanOrEqual(cap + 1e-9);
      expect(worst).toBeGreaterThan(0.9 * cap);
      // in slow motion the true angle is back
      reset();
      mod.update({ ...s, angle: 0 }, dt, view({ slowMo: 0.02 }));
      const p0 = mod.drawn.phase;
      mod.update({ ...s, angle: s.omega * dt * 0.02 }, dt, view({ slowMo: 0.02 }));
      expect(mod.drawn.blur).toBe(0);
      expect(mod.drawn.phase - p0).toBeCloseTo(s.omega * dt * 0.02 * (s.generatorRpm / s.rpm), 6);
    });

    it('shows the magnet that crosses the plane through the axis, with its own pole, at the top and the bottom', () => {
      reset();
      go({ angle: 0 }, { cutaway: true });
      const caps = mod.pieces.magnetCaps;
      // a magnet is centred on the top (north) at rest: both north caps are shown, no south one
      expect(caps.topN.visible && caps.bottomN.visible).toBe(true);
      expect(caps.topS.visible || caps.bottomS.visible).toBe(false);
      // half a pole pitch on, the plane runs between two magnets: no cap
      (mod.drawn as { phase: number }).phase = POLE_PITCH / 2;
      mod.update(stateWith({ angle: 0 }), 0, view({ cutaway: true }));
      expect(caps.topN.visible || caps.topS.visible || caps.bottomN.visible || caps.bottomS.visible).toBe(false);
      // one pole pitch on, the neighbour is at the top: a south pole
      (mod.drawn as { phase: number }).phase = POLE_PITCH;
      mod.update(stateWith({ angle: 0 }), 0, view({ cutaway: true }));
      expect(caps.topS.visible && caps.bottomS.visible).toBe(true);
      expect(caps.topN.visible || caps.bottomN.visible).toBe(false);
      // no section, no caps
      mod.update(stateWith({ angle: 0 }), 0, view({ cutaway: false }));
      expect(caps.topS.visible).toBe(false);
      reset();
    });
  });

  describe('the section takes a quarter away', () => {
    const solids = (id: string) => reg.get(id)!.meshes.map((m) => m.material as THREE.MeshStandardMaterial);
    const caps = () => {
      const out: THREE.Object3D[] = [];
      mod.scene.traverse((o) => o.userData.cap && o.visible && out.push(o));
      return out;
    };

    it('clips every part with two planes (in front of the axis and beyond the plane across it), and closes the cut with caps', () => {
      go({}, { cutaway: false });
      expect(caps()).toHaveLength(0);
      for (const id of IDS) for (const m of solids(id)) expect(m.clippingPlanes?.length ?? 0, id).toBe(0);
      go({}, { cutaway: true });
      expect(caps().length).toBeGreaterThan(20);
      for (const id of IDS)
        for (const m of solids(id)) {
          expect(m.clippingPlanes?.length, id).toBe(2);
          expect(m.clipIntersection, id).toBe(true);
        }
      // the quarter: a point in front and beyond is cut; in front but before the plane, or behind, it is not
      const p = (x: number, z: number) => new THREE.Vector3(x, 0, z);
      const m = solids('gen-stator')[0];
      const cuts = (q: THREE.Vector3) => (m.clippingPlanes as THREE.Plane[]).every((pl) => pl.distanceToPoint(q) < 0);
      expect(cuts(p(0.3, 0.1))).toBe(true);
      expect(cuts(p(0.05, 0.1))).toBe(false);
      expect(cuts(p(0.3, -0.1))).toBe(false);
      // the kit's picking asks `some(plane clips the point)`: for the quarter that is "both planes do"
      const some = (q: THREE.Vector3) => (m.clippingPlanes as THREE.Plane[]).some((pl) => pl.distanceToPoint(q) < 0);
      expect(some(p(0.3, 0.1))).toBe(true);
      expect(some(p(0.05, 0.1))).toBe(false);
      expect(some(p(0.3, -0.1))).toBe(false);
      go({}, { cutaway: false });
      expect(caps()).toHaveLength(0);
      expect(solids('gen-stator')[0].clippingPlanes?.length ?? 0).toBe(0);
    });

    it('hides the caps of a part that is ghosted or hidden', () => {
      go({}, { cutaway: true });
      const owned = (id: string) => caps().filter((c) => c.userData.ownerPart === id).length;
      expect(owned('gen-stator')).toBeGreaterThan(0);
      reg.setDisplay('gen-stator', 'ghost');
      go({}, { cutaway: true });
      expect(owned('gen-stator')).toBe(0);
      reg.setDisplay('gen-stator', 'hidden');
      go({}, { cutaway: true });
      expect(owned('gen-stator')).toBe(0);
      reg.setDisplay('gen-stator', 'solid');
      go({}, { cutaway: true });
      expect(owned('gen-stator')).toBeGreaterThan(0);
      go({}, { cutaway: false });
    });

    it('moves the planes with an exploded part, so that it is cut in the same place', () => {
      reg.setAllFactors(1);
      go({}, { cutaway: true });
      for (const id of ['gen-rotor', 'gen-stator', 'gen-coils', 'gen-shaft']) {
        const m = solids(id)[0];
        const xCut = (m.clippingPlanes as THREE.Plane[])[1];
        expect(xCut.constant, id).toBeCloseTo(D.section + EXPLODE[id as keyof typeof EXPLODE][0], 9);
      }
      // each bearing has its own plane: they come apart
      const front = mod.pieces.bearings.front;
      const rear = mod.pieces.bearings.rear;
      expect(front.position.x).toBeCloseTo(BEARING_EXPLODE.front[0], 9);
      expect(rear.position.x).toBeCloseTo(BEARING_EXPLODE.rear[0], 9);
      const mf = (front.children.find((c) => (c as THREE.Mesh).isMesh && !c.userData.cap) as THREE.Mesh)
        .material as THREE.MeshStandardMaterial;
      const mr = (rear.children.find((c) => (c as THREE.Mesh).isMesh && !c.userData.cap) as THREE.Mesh)
        .material as THREE.MeshStandardMaterial;
      expect((mf.clippingPlanes as THREE.Plane[])[1].constant).toBeCloseTo(
        D.section + EXPLODE['gen-bearings'][0] + BEARING_EXPLODE.front[0],
        9,
      );
      expect((mr.clippingPlanes as THREE.Plane[])[1].constant).toBeCloseTo(
        D.section + EXPLODE['gen-bearings'][0] + BEARING_EXPLODE.rear[0],
        9,
      );
      reg.setAllFactors(0);
      go({}, { cutaway: false });
    });
  });

  it('draws the three phases of the current as dots that go at the speed of the amperes, from the coils to the end of the cable', () => {
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
    const d10 = move(10);
    expect(mod.flows.object.visible).toBe(true);
    expect(d10).toBeGreaterThan(0.001);
    expect(move(20) / d10).toBeGreaterThan(1.7);
    expect(move(20) / d10).toBeLessThan(2.1);
    expect(move(0)).toBeCloseTo(0, 9);
    // three paths, each from a coil (inside the stator's radius) to the cable (beyond the terminal box)
    expect(mod.pieces.phasePaths).toHaveLength(3);
    for (const p of mod.pieces.phasePaths) {
      expect(Math.hypot(p[0].y, p[0].z)).toBeLessThan(D.coil.to + 0.005);
      expect(p[p.length - 1].x).toBeGreaterThan(0.4);
    }
    go({}, { schematic: false });
  });

  it('explodes every part by its own path and returns it to its place', () => {
    reg.setAllFactors(0);
    go();
    const before = sceneBoxes(mod);
    for (const id of IDS)
      expect(reg.get(id)!.explode.length() + (id === 'gen-bearings' ? 1 : 0), id).toBeGreaterThan(0);
    reg.setAllFactors(1);
    mod.scene.updateMatrixWorld(true);
    const after = sceneBoxes(mod);
    for (const id of IDS) {
      if (id === 'gen-bearings') continue;
      const dx = after.get(id)!.getCenter(new THREE.Vector3()).x - before.get(id)!.getCenter(new THREE.Vector3()).x;
      expect(dx, id).toBeCloseTo(EXPLODE[id as keyof typeof EXPLODE][0], 2);
    }
    // the rotor assembly goes the other way from the stator and the coils: shaft, magnets, rotor on the drive side, in that order
    const cx = (id: string) => after.get(id)!.getCenter(new THREE.Vector3()).x;
    expect(cx('gen-shaft')).toBeLessThan(cx('gen-magnets'));
    expect(cx('gen-magnets')).toBeLessThan(cx('gen-rotor'));
    expect(cx('gen-rotor')).toBeLessThan(cx('gen-frame'));
    expect(cx('gen-frame')).toBeLessThan(cx('gen-stator'));
    expect(cx('gen-stator')).toBeLessThan(cx('gen-coils'));
    // the box rises, the bearings come apart
    expect(after.get('gen-terminals')!.min.y).toBeGreaterThan(before.get('gen-terminals')!.min.y + 0.3);
    expect(after.get('gen-bearings')!.max.x - after.get('gen-bearings')!.min.x).toBeGreaterThan(0.8);
    reg.setAllFactors(0);
    mod.scene.updateMatrixWorld(true);
    const back = sceneBoxes(mod);
    for (const id of IDS) expect(back.get(id)!.min.x, id).toBeCloseTo(before.get(id)!.min.x, 6);
  });

  it('isolates and ghosts every part, and shows its meshes again', () => {
    for (const id of IDS)
      for (const mode of ['hidden', 'ghost'] as const) {
        isolateOne(reg, id, mode);
        go({}, { cutaway: true });
        expect(
          reg.get(id)!.meshes.every((m) => m.visible && m.material !== GHOST),
          `${id} ${mode}`,
        ).toBe(true);
        for (const other of IDS.filter((o) => o !== id)) {
          const e = reg.get(other)!;
          expect(
            e.meshes.every((m) => (mode === 'hidden' ? !m.visible : m.material === GHOST)),
            `${other} ${mode}`,
          ).toBe(true);
        }
        expect(finiteTree(mod.scene)).toBe(true);
      }
    reg.setAllDisplay('solid');
    go({}, { cutaway: false });
    expect(reg.get('gen-rotor')!.meshes.every((m) => m.visible)).toBe(true);
    // every part keeps a material the kit can drive
    for (const id of IDS)
      for (const m of reg.get(id)!.meshes) expect((m.material as THREE.Material).type, id).toBe('MeshStandardMaterial');
  });

  it('animates the whole range of the state without a NaN: speeds, stopped, runaway, the section, the exploded view, slow motion', () => {
    const cases: [object, object][] = [
      [{}, {}],
      [{}, { head: 0.3, designFlow: 0.01 }],
      [{}, { head: 6, designFlow: 5, slope: 15 }],
      [{}, { riverFlow: 0.03 }],
      [{}, { chainRatio: 1, beltRatio: 8 }],
      [{}, { machine: 'overshot' }],
      [{ fill: 0, omega: 0, rpm: 0, generatorRpm: 0, current: 0 }, {}],
      [{ omega: 400, current: 80, generatorRpm: 3000, angle: 6.2 }, {}],
      [{ rpm: 1e-9, generatorRpm: 600, omega: 1e-9 }, {}],
    ];
    for (const [over, params] of cases)
      for (const v of [{}, { cutaway: true }, { schematic: true }, { slowMo: 0.02 }])
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
          expect(Number.isFinite(mod.drawn.phase)).toBe(true);
          for (const id of IDS) {
            const b = reg.bounds(id);
            expect(Number.isFinite(b.min.x) && Number.isFinite(b.max.y) && Number.isFinite(b.max.z), id).toBe(true);
          }
        }
    reg.setAllFactors(0);
  });

  it('stays inside the budget of a new world: at most 120 draw calls and 150,000 triangles, built in a few hundred milliseconds', () => {
    go({}, { cutaway: true, schematic: true });
    const s = drawStats(mod.scene);
    // eslint-disable-next-line no-console
    console.info(
      `[generator] ${s.calls} draw calls, ${s.triangles} triangles, first build ${Math.round(firstBuildMs)} ms`,
    );
    expect(s.calls).toBeLessThanOrEqual(120);
    expect(s.triangles).toBeLessThanOrEqual(150000);
    expect(firstBuildMs).toBeLessThan(1000);
  });
});
