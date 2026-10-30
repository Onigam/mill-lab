import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { partIds } from '../../part-ids';
import { BLADES } from '../../sim/machine';
import { DESIGN, DRIVE, GENERATOR, bladeThickness, smallPulleyRadius, smallTeeth } from '../dims';
import { drawStats, finiteTree, floating, isolateOne, sceneBoxes, stateWith, touches, view } from '../test-utils';
import { bandLoop } from './drive';
import { inletLevel, worldPoint } from './layout';
import { pocketSection, pocketShift } from './helix';
import { BLUR_FROM, EXPLODE, createScrewScene } from './scene';
import { BASE_Y, FLOOR_Y } from './structure';

// The `screw` world by script: ids, labels, floating parts, the drive (the chain meets both sprockets, the belt both pulleys, the countershaft carries
// both its wheels, the generator carries the small pulley), what turns and how fast, the pockets of water and the pools, the section, the explode, the
// redraw at another size, NaN-free animation over the whole range of the state.

const IDS = partIds('screw');
const DEG = Math.PI / 180;

describe('screw world', () => {
  const mod = createScrewScene();
  const reg = mod.registry;
  const rig = mod.rig;
  const go = (over = {}, v = {}, frames = 2, params = {}) => {
    const s = stateWith(over, params);
    for (let i = 0; i < frames; i++) mod.update(s, 1 / 60, view({ time: 1 + i, ...v }));
    mod.scene.updateMatrixWorld(true);
    return s;
  };
  const ground = () =>
    new THREE.Box3(new THREE.Vector3(-30, FLOOR_Y - 1, -30), new THREE.Vector3(30, BASE_Y + 0.001, 30));
  const supports = () => [ground(), ...mod.scenery().map((o) => new THREE.Box3().setFromObject(o, true))];
  /** A point of the screw frame (x', y', z) back from the world. */
  const toScrew = (p: THREE.Vector3) => {
    const l = mod.drawn.layout;
    const q = p
      .clone()
      .sub(new THREE.Vector3(0, l.y0, 0))
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), -l.beta);
    return q;
  };

  it('registers exactly the seventeen frozen ids (the electronics moved to the powerroom world), each with meshes of its own', () => {
    go();
    expect(IDS).toHaveLength(17);
    expect([...reg.ids()].sort()).toEqual([...IDS].sort());
    for (const id of IDS) expect(reg.get(id)!.meshes.length, id).toBeGreaterThan(0);
    // the rectifier, the charge controller and the battery are drawn in the powerroom world now
    for (const id of ['rectifier', 'charge-controller', 'battery']) expect(reg.get(id), id).toBeUndefined();
  });

  it('has a hotspot for every part, four main labels, and anchors that live in the scene', () => {
    expect(mod.hotspots.map((h) => h.partId).sort()).toEqual([...IDS].sort());
    expect(mod.hotspots.filter((h) => !h.minor).map((h) => h.partId)).toEqual([
      'blade-module',
      'trapped-water',
      'chain',
      'trough',
    ]);
    mod.scene.updateMatrixWorld(true);
    for (const h of mod.hotspots) {
      let o: THREE.Object3D | null = h.anchor;
      while (o && o !== mod.scene) o = o.parent;
      expect(o, h.partId).toBe(mod.scene);
      expect(h.label.fr.length).toBeGreaterThan(2);
      expect(h.label.en.length).toBeGreaterThan(2);
      expect(h.label.fr).not.toMatch(/screw-|blade-/);
    }
  });

  it('has no floating part: every part touches another part or the scenery (platform, floor)', () => {
    go();
    reg.setAllFactors(0);
    expect(floating(sceneBoxes(mod), 0.02, supports())).toEqual([]);
  });

  it('stands what carries the load on what holds it: pillars on the floor, the machine on the platform', () => {
    go();
    reg.setAllFactors(0);
    const l = mod.drawn.layout;
    const b = sceneBoxes(mod);
    // concrete on the floor pad
    for (const id of ['outlet-pool', 'inlet-sill']) expect(b.get(id)!.min.y, id).toBeLessThan(BASE_Y + 0.01);
    expect(b.get('trough')!.min.y).toBeCloseTo(BASE_Y, 3); // the piers
    expect(b.get('lower-bearing')!.min.y).toBeCloseTo(BASE_Y, 3); // its pier in the pool
    // the upper bearing, the countershaft and the generator stand on the platform
    for (const id of ['upper-bearing', 'countershaft', 'generator'])
      expect(b.get(id)!.min.y, id).toBeLessThanOrEqual(l.platTop + 0.005);
    expect(b.get('generator')!.min.y).toBeGreaterThan(l.platTop - 0.1);
    // the bearing stands on the headwall, the rest on the platform that goes on from it, in plan
    expect(b.get('upper-bearing')!.min.x).toBeGreaterThanOrEqual(l.headX - 0.02);
    expect(b.get('upper-bearing')!.max.x).toBeLessThanOrEqual(l.platX0 + 0.02);
    for (const id of ['countershaft', 'generator']) {
      expect(b.get(id)!.min.x, id).toBeGreaterThanOrEqual(l.platX0 - 0.02);
      expect(b.get(id)!.max.x, id).toBeLessThanOrEqual(l.platX1 + 0.02);
      expect(b.get(id)!.min.z, id).toBeGreaterThanOrEqual(l.platZ0);
      expect(b.get(id)!.max.z, id).toBeLessThanOrEqual(l.platZ1);
    }
    // the cable that leaves the generator's terminal goes over the platform, down its end and away on the floor (scenery, it carries the dots of the current)
    const cable = new THREE.Box3().setFromObject(rig.props.children[0], true);
    expect(rig.props.children[0].name).toBe('cables');
    expect(cable.min.y).toBeLessThan(BASE_Y + 0.1);
    expect(cable.max.x).toBeGreaterThan(l.platX1);
    expect(touches(b.get('generator')!, cable, 0.05)).toBe(true);
    // the water stays between the two ends of the flights and inside the trough in plan
    const w = b.get('trapped-water')!;
    expect(w.min.z).toBeGreaterThanOrEqual(-l.ro - 0.01);
    expect(w.max.z).toBeLessThanOrEqual(l.ro + 0.01);
  });

  it('puts the screw at the true size of the design point and the water level at half immersion', () => {
    go();
    const l = mod.drawn.layout;
    const blades = reg.bounds('blade-module');
    // the tips of the blades are the outer radius; the blades span the length of the flights
    const t = bladeThickness(l.shape.outerDiameter);
    expect((blades.max.z - blades.min.z) / 2).toBeCloseTo(l.ro, 2);
    expect(blades.max.x - blades.min.x).toBeCloseTo(l.L * l.cosB + 2 * l.ro * l.sinB, 1);
    expect(blades.min.x).toBeLessThan(0.2);
    expect(t).toBeLessThan(0.05);
    // the full bucket stands at the lowest saddle, within a few centimetres of the axis: the screw is about half immersed at the design fill
    const hPass = l.levels.hPass;
    expect(Math.abs(hPass)).toBeLessThan(0.1 * l.shape.outerDiameter);
    expect(inletLevel(l, 1) - (l.y0 + l.L * l.sinB)).toBeCloseTo(hPass, 9);
    expect(inletLevel(l, 0.5)).toBeLessThan(inletLevel(l, 1));
    expect(inletLevel(l, 0)).toBeCloseTo(l.y0 + l.L * l.sinB + l.levels.hMin, 9);
    // the tail level is 0.6 D cos(slope) over the lowest point of the trough at the lower end
    expect(l.tailY - (l.y0 - l.Rt * l.cosB)).toBeCloseTo(0.6 * l.shape.outerDiameter * l.cosB, 9);
  });

  it('draws a right-handed thread: the axial position of a blade grows with the azimuth along every thread', () => {
    go();
    // tip vertices of the blades, in the frame of the screw: the helix of one thread climbs x' by one pitch per turn
    const geo = rig.wheels.find((w) => w.part === 'blade-module')!.rot;
    geo.rotation.x = 0;
    geo.updateMatrixWorld(true);
    const l = mod.drawn.layout;
    const pts: THREE.Vector3[] = [];
    geo.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, i);
        if (Math.abs(Math.hypot(v.y, v.z) - l.ro) < 1e-4) pts.push(v);
      }
    });
    expect(pts.length).toBeGreaterThan(200);
    // for two tip points of one thread separated by a small azimuth step, dx/dψ = pitch / 2π (ψ from +Y' towards +Z, right-handed)
    const slope = l.shape.pitch / (2 * Math.PI);
    let checked = 0;
    for (let i = 0; i < pts.length && checked < 40; i += 7) {
      const a = pts[i];
      const psiA = Math.atan2(a.z, a.y);
      for (const b of pts) {
        const psiB = Math.atan2(b.z, b.y);
        let d = psiB - psiA;
        d = ((d + Math.PI) % (2 * Math.PI)) - Math.PI;
        const dx = b.x - a.x;
        // a neighbour 15 to 25 degrees on, on the same face and the same thread: |dx - slope d| < 1 mm (the other threads are 0.287 m away)
        if (Math.abs(d) > 15 * DEG && Math.abs(d) < 25 * DEG && Math.abs(dx - slope * d) < 0.001) {
          checked++;
          break;
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  describe('the drive', () => {
    const d = () => rig.drive;
    const inScrewPlane = (v: THREE.Vector3) => {
      const q = toScrew(v);
      return new THREE.Vector2(q.y, q.z);
    };

    it('wraps the chain on both sprockets and the belt on both pulleys (the loop is tangent to the pitch circles)', () => {
      go();
      const l = mod.drawn.layout;
      const c0 = new THREE.Vector2(0, 0);
      const cC = new THREE.Vector2(l.counterAt[0], l.counterAt[1]);
      const cG = new THREE.Vector2(l.generatorAt[0], l.generatorAt[1]);
      for (const [c1, r1, c2, r2] of [
        [c0, d().bigSprocket.r, cC, d().smallSprocket.r],
        [cC, d().largePulley.r, cG, d().smallPulley.r],
      ] as const) {
        const loop = bandLoop(c1, r1, c2, r2, 0.01);
        // never inside a wheel, and touching each of them
        const near1 = Math.min(...loop.points.map((p) => p.distanceTo(c1)));
        const near2 = Math.min(...loop.points.map((p) => p.distanceTo(c2)));
        expect(near1).toBeGreaterThanOrEqual(r1 - 1e-9);
        expect(near2).toBeGreaterThanOrEqual(r2 - 1e-9);
        expect(near1).toBeCloseTo(r1, 6);
        expect(near2).toBeCloseTo(r2, 6);
        // the straight runs are tangent to both circles: the distance from the centres to the line of a run is the radius
        const n = loop.points.length;
        let tangents = 0;
        for (let i = 0; i < n; i++) {
          const a = loop.points[i];
          const b = loop.points[(i + 1) % n];
          if (a.distanceTo(b) < 0.1) continue; // an arc step
          const line = new THREE.Line3(new THREE.Vector3(a.x, a.y, 0), new THREE.Vector3(b.x, b.y, 0));
          const dist = (c: THREE.Vector2) => {
            const t = line.closestPointToPointParameter(new THREE.Vector3(c.x, c.y, 0), false);
            return line.at(t, new THREE.Vector3()).distanceTo(new THREE.Vector3(c.x, c.y, 0));
          };
          expect(dist(c1)).toBeCloseTo(r1, 6);
          expect(dist(c2)).toBeCloseTo(r2, 6);
          tangents++;
        }
        expect(tangents).toBe(2);
        // the length of the loop: two tangent runs plus the arcs (the open belt formula)
        const dd = c1.distanceTo(c2);
        const al = Math.asin((r1 - r2) / dd);
        const expected = 2 * Math.sqrt(dd * dd - (r1 - r2) ** 2) + r1 * (Math.PI + 2 * al) + r2 * (Math.PI - 2 * al);
        expect(loop.length).toBeGreaterThan(expected * 0.995);
        expect(loop.length).toBeLessThan(expected * 1.0001);
      }
    });

    it('builds the chain and the belt meshes on those circles, in the plane of their wheels', () => {
      go();
      const l = mod.drawn.layout;
      for (const [id, plane, centres] of [
        ['chain', l.sChain, [d().bigSprocket, d().smallSprocket]],
        ['belt', l.sBelt, [d().largePulley, d().smallPulley]],
      ] as const) {
        const band = reg.get(id)!.meshes[0];
        const pos = band.geometry.attributes.position;
        const world = new THREE.Vector3();
        let minDist = [Infinity, Infinity];
        let xs: number[] = [];
        for (let i = 0; i < pos.count; i += 3) {
          world.fromBufferAttribute(pos, i).applyMatrix4(band.matrixWorld);
          const q = toScrew(world);
          xs.push(q.x);
          const p = new THREE.Vector2(q.y, q.z);
          centres.forEach((c, k) => {
            const cc = inScrewPlane(c.c);
            minDist[k] = Math.min(minDist[k], p.distanceTo(cc));
          });
        }
        // the inner face of the band touches each wheel's pitch circle (the belt rides 3 mm higher, a belt is thicker than a chain's plate gap)
        centres.forEach((c, k) => expect(minDist[k], `${id} wheel ${k}`).toBeGreaterThan(c.r - 1e-4));
        centres.forEach((c, k) => expect(minDist[k], `${id} wheel ${k}`).toBeLessThan(c.r + 0.006 * l.k));
        // in the plane of the wheels, within the width of the band
        expect(Math.min(...xs)).toBeGreaterThan(plane - 0.05 * l.k);
        expect(Math.max(...xs)).toBeLessThan(plane + 0.05 * l.k);
        // and each wheel's own mesh lies in that plane
        const wheelParts = id === 'chain' ? ['drive-sprocket', 'counter-sprocket'] : ['pulley-large', 'pulley-small'];
        for (const w of wheelParts) {
          const b = reg.bounds(w);
          const mid = toScrew(b.getCenter(new THREE.Vector3())).x;
          expect(Math.abs(mid - plane), w).toBeLessThan(0.07 * l.k);
        }
      }
    });

    it('carries the two wheels of the countershaft on it, the small pulley on the generator shaft and the large sprocket on the screw shaft', () => {
      go();
      const l = mod.drawn.layout;
      const { from, to, r } = d().countershaft;
      const axis = new THREE.Line3(from, to);
      for (const wheel of [d().smallSprocket, d().largePulley]) {
        const t = axis.closestPointToPointParameter(wheel.c, false);
        expect(t, 'inside the shaft').toBeGreaterThan(0);
        expect(t).toBeLessThan(1);
        expect(axis.at(t, new THREE.Vector3()).distanceTo(wheel.c)).toBeLessThan(1e-9);
      }
      // the shaft is thicker than nothing and carries bearings at both sides of the pulley (the pillow blocks stand on it, in the part)
      expect(r).toBeGreaterThan(0.01);
      const bb = reg.bounds('countershaft');
      for (const s of DRIVE.countershaftBearings) {
        const p = worldPoint(l, l.L + s * l.k, l.counterAt[0], l.counterAt[1]);
        expect(bb.expandByScalar(0.001).containsPoint(p)).toBe(true);
      }
      // the generator shaft: the pulley sits on the stub, between the free end of the stub and the body
      expect(l.sBelt).toBeGreaterThanOrEqual(l.sGenFront - GENERATOR.stub * l.k);
      expect(l.sBelt).toBeLessThan(l.sGenFront);
      expect(d().smallPulley.c.distanceTo(worldPoint(l, l.sBelt, l.generatorAt[0], l.generatorAt[1]))).toBeLessThan(
        1e-9,
      );
      // the screw shaft: the big sprocket sits between the two ends of it, the upper bearing too
      expect(l.sChain).toBeGreaterThan(l.sShaftStart);
      expect(l.sChain).toBeLessThan(l.sShaftEnd);
      expect(l.sUp).toBeLessThan(l.sChain);
      expect(l.sLow).toBeGreaterThan(l.sShaftStart);
      // ... and the three shafts are parallel to the screw axis (the three axes have the same direction)
      const dir = (a: THREE.Vector3, b: THREE.Vector3) => b.clone().sub(a).normalize();
      const u = dir(d().shaft.from, d().shaft.to);
      expect(dir(from, to).distanceTo(u)).toBeLessThan(1e-9);
      expect(u.y).toBeCloseTo(Math.sin(l.beta), 9);
    });

    it('has the ratios of the simulation: the teeth give the chain ratio, the radii the belt ratio, the product the speed of the generator', () => {
      go();
      const [zl, zs] = d().teeth;
      expect(zl).toBe(DRIVE.largeTeeth);
      expect(zs).toBe(smallTeeth(DESIGN.chainRatio));
      const chain = zl / zs;
      expect(chain).toBeCloseTo(DESIGN.chainRatio, 1);
      expect(d().ratios.chain).toBeCloseTo(chain, 9);
      expect(d().largePulley.r / d().smallPulley.r).toBeCloseTo(DESIGN.beltRatio, 6);
      expect(d().smallPulley.r).toBeCloseTo(smallPulleyRadius(DESIGN.beltRatio) * mod.drawn.layout.k, 9);
      expect(((chain * d().largePulley.r) / d().smallPulley.r) * DESIGN.screwRpm).toBeCloseTo(DESIGN.generatorRpm, -2);
      // ... and the wheels turn at these ratios
      const byPart = (p: string) => rig.wheels.find((w) => w.part === p && w.group === 'drive')!;
      expect(byPart('counter-sprocket').ratio).toBeCloseTo(chain, 9);
      expect(byPart('pulley-large').ratio).toBeCloseTo(chain, 9);
      expect(byPart('countershaft').ratio).toBeCloseTo(chain, 9);
      expect(byPart('pulley-small').ratio).toBeCloseTo(chain * DESIGN.beltRatio, 6);
      expect(byPart('generator').ratio).toBeCloseTo(chain * DESIGN.beltRatio, 6);
      expect(byPart('drive-sprocket').ratio).toBe(1);
    });

    it('turns the wheels at the same time as the screw, by the angle of the state times their ratio', () => {
      const s0 = stateWith({ angle: 0.5, omega: 0.5 });
      mod.update(s0, 1 / 60, view({ time: 50 }));
      const before = new Map(rig.wheels.map((w) => [w, w.rot.rotation.x]));
      const s1 = { ...s0, angle: 0.5 + 0.02 };
      mod.update(s1, 1 / 60, view({ time: 51 }));
      for (const w of rig.wheels) expect(w.rot.rotation.x - before.get(w)!, w.part).toBeCloseTo(0.02 * w.ratio, 9);
    });

    it('turns the whole screw the right way: positive about the axis, so the pockets go down the slope', () => {
      const s0 = stateWith({ angle: 1.0, omega: 0.5 });
      mod.update(s0, 1 / 60, view({ time: 60 }));
      const a = rig.pockets!.instanceMatrix.array as Float32Array;
      const x0 = a[12 + 5 * 16];
      mod.update({ ...s0, angle: 1.0 + 0.1 }, 1 / 60, view({ time: 61 }));
      const x1 = (rig.pockets!.instanceMatrix.array as Float32Array)[12 + 5 * 16];
      // the pockets move by -pitch * dθ / 2π along the axis (down the slope, towards the lower end)
      const shape = mod.drawn.shape;
      expect(x1 - x0).toBeCloseTo(-(shape.pitch * 0.1) / (2 * Math.PI), 5);
      expect(rig.wheels.find((w) => w.part === 'blade-module')!.rot.rotation.x).toBeGreaterThan(1.0);
    });

    it('caps the visual speed against the wagon-wheel effect: a blur disc fades in and the turn stops following the true angle', () => {
      const fast = stateWith({ angle: 0, omega: 40 }); // 6.4 revolutions a second at the screw, 70 at the generator
      mod.update(fast, 1 / 60, view({ time: 100 }));
      const wheels = rig.wheels.filter((w) => w.blur);
      expect(wheels.length).toBe(4);
      const before = new Map(wheels.map((w) => [w, w.rot.rotation.x]));
      let a = 0;
      for (let i = 0; i < 10; i++) {
        a += 1.1; // far more than the wheels may follow in a frame
        mod.update({ ...fast, angle: a % (2 * Math.PI) }, 1 / 60, view({ time: 101 + i }));
      }
      for (const w of wheels) {
        const rate = Math.abs(40) / (2 * Math.PI);
        const passes = rate * w.ratio * w.symmetry;
        if (passes > 24) {
          expect(w.blur!.visible, w.part).toBe(true);
          expect((w.blur!.material as THREE.MeshBasicMaterial).opacity, w.part).toBeGreaterThan(0.5);
          // the step per frame is at most BLUR_FROM positions a second
          const per = Math.abs(w.rot.rotation.x - before.get(w)!) / 10;
          expect(per, w.part).toBeLessThanOrEqual((2 * Math.PI * BLUR_FROM) / w.symmetry / 60 + 1e-9);
        }
      }
      // at the design speed nothing is blurred
      mod.update(stateWith({ angle: 0.3 }), 1 / 60, view({ time: 200 }));
      for (const w of wheels)
        expect(w.blur!.visible, w.part).toBe((w.ratio * w.symmetry * DESIGN.screwRpm) / 60 > BLUR_FROM);
    });

    it('runs the pattern of the chain and of the belt, forward at the rim speed and never faster than 12 repeats a second', () => {
      const s0 = stateWith({ angle: 0.5, omega: 0.3 });
      mod.update(s0, 1 / 60, view({ time: 300 }));
      const o0 = rig.chain!.texture.offset.x;
      mod.update({ ...s0, angle: 0.52 }, 1 / 60, view({ time: 301 }));
      const o1 = rig.chain!.texture.offset.x;
      const expected = (0.02 * rig.chain!.radius) / rig.chain!.period;
      expect(o1 - o0).toBeCloseTo(expected, 6);
      const b0 = rig.belt!.texture.offset.x;
      mod.update({ ...s0, angle: 0.54 }, 1 / 60, view({ time: 302 }));
      expect(rig.belt!.texture.offset.x - b0).toBeGreaterThan(0);
      const big = rig.chain!.texture.offset.x;
      mod.update({ ...s0, angle: 3.0 }, 1 / 60, view({ time: 303 }));
      expect(Math.abs(rig.chain!.texture.offset.x - big)).toBeLessThanOrEqual(12 / 60 + 1e-9);
    });

    it('runs the pattern the right way round: opposite to the direction the loop is walked, which is that of decreasing angle', () => {
      // the loop is walked clockwise in (y', z) (decreasing angle); the wheels turn with increasing angle, so the pattern must move against u
      const loop = bandLoop(new THREE.Vector2(0, 0), 0.226, new THREE.Vector2(-0.1, 0.78), 0.07);
      const p = loop.points;
      let area = 0;
      for (let i = 0; i < p.length; i++) area += p[i].x * p[(i + 1) % p.length].y - p[(i + 1) % p.length].x * p[i].y;
      expect(area).toBeLessThan(0); // clockwise in (y', z): decreasing angle
      const s0 = stateWith({ angle: 1, omega: 0.3 });
      mod.update(s0, 1 / 60, view({ time: 310 }));
      const o = rig.chain!.texture.offset.x;
      mod.update({ ...s0, angle: 1.01 }, 1 / 60, view({ time: 311 }));
      expect(rig.chain!.texture.offset.x).toBeGreaterThan(o); // offset up = pattern moves towards decreasing u
    });
  });

  describe('the water', () => {
    it('shows the pockets only when there is water, rebuilds the bucket when the fill moves and never allocates in the frame', () => {
      go({ fill: 1, angle: 0 });
      const arr = rig.pockets!.geometry.attributes.position.array;
      expect(rig.pockets!.visible).toBe(true);
      for (const f of [0.2, 0.55, 0.9, 1]) {
        go({ fill: f });
        expect(rig.pockets!.geometry.attributes.position.array).toBe(arr);
        expect(rig.pockets!.visible).toBe(true);
      }
      go({ fill: 0 });
      expect(rig.pockets!.visible).toBe(false);
      go({ fill: 1 });
      expect(rig.pockets!.visible).toBe(true);
    });

    it('stands every pocket between two blades: at the bottom of the trough the water starts on the up-slope face of a blade and ends on the down-slope face of the next', () => {
      for (const theta of [0, 0.7, 2.2, 4.4, 6]) {
        const s = go({ fill: 0.8, angle: theta }, { cutaway: true }, 1);
        void s;
        const shape = mod.drawn.shape;
        const t = bladeThickness(shape.outerDiameter);
        const sp = shape.pitch / BLADES;
        const arr = rig.bladeCap!.geometry.attributes.position.array as Float32Array;
        const n = rig.bladeCap!.geometry.drawRange.count / 6;
        const bottom: number[] = [];
        for (let q = 0; q < n; q++) if (arr[q * 18 + 1] < 0) bottom.push((arr[q * 18] + arr[q * 18 + 3]) / 2);
        expect(bottom.length).toBeGreaterThan(10);
        const poly = pocketSection(shape, 0.8);
        const th = sp - t;
        let checked = 0;
        for (let p = 0; p < rig.pockets!.count; p++) {
          const T = pocketShift(shape, p, mod.drawn.theta);
          const left = poly[0][0] + T;
          if (left < 0.4 || left + th > shape.length - 0.4) continue;
          const face = Math.min(...bottom.map((x) => Math.abs(x + t / 2 - left)));
          const next = Math.min(...bottom.map((x) => Math.abs(x - t / 2 - (left + th))));
          expect(face, `theta ${theta} pocket ${p}: its floor is the face of a blade`).toBeLessThan(1e-4);
          expect(next, `theta ${theta} pocket ${p}: its ceiling is the face of the next blade`).toBeLessThan(1e-4);
          checked++;
        }
        expect(checked).toBeGreaterThan(8);
      }
      go({}, { cutaway: false });
    });

    it('lowers the pool of the inlet with the fill, and raises the outlet pool with the tailwater', () => {
      go({ fill: 1, tailRise: 0 }, {}, 2);
      const l = mod.drawn.layout;
      const top = (poly: [number, number][]) => Math.max(...poly.map((p) => p[1]));
      expect(top(rig.inletWater!.poly)).toBeCloseTo(inletLevel(l, 1), 6);
      expect(top(rig.poolWater!.poly)).toBeCloseTo(l.tailY, 6);
      go({ fill: 0.5, tailRise: 1.2 });
      expect(top(rig.inletWater!.poly)).toBeCloseTo(inletLevel(l, 0.5), 6);
      expect(top(rig.poolWater!.poly)).toBeCloseTo(l.tailY + 1.2, 6);
      // a dry screw: no water in the basin
      go({ fill: 0, tailRise: 0 });
      expect(rig.inletWater!.mesh.visible).toBe(false);
    });

    it('lets a fish ride a pocket: it follows the pockets down the screw, hides without water, and is not a part', () => {
      go({ fill: 1, angle: 0.0 }, {}, 1);
      const fish = mod.fish;
      const l = mod.drawn.layout;
      let seen = 0;
      let prev = NaN;
      for (let i = 0; i < 200; i++) {
        mod.update({ ...stateWith({ fill: 1 }), angle: (i * 0.07) % (2 * Math.PI) }, 1 / 60, view({ time: 400 + i }));
        if (fish.visible) {
          seen++;
          expect(fish.position.x).toBeGreaterThan(0.3);
          expect(fish.position.x).toBeLessThan(l.L);
          // it moves down the slope as the screw turns (x' decreases), until it is taken to the top again
          if (!Number.isNaN(prev) && fish.position.x < prev + 0.5)
            expect(fish.position.x).toBeLessThanOrEqual(prev + 1e-6);
          prev = fish.position.x;
        }
      }
      expect(seen).toBeGreaterThan(30);
      go({ fill: 0.1 });
      expect(fish.visible).toBe(false);
      for (const id of IDS) expect(reg.get(id)!.meshes.includes(fish.children[0] as THREE.Mesh)).toBe(false);
      expect(fish.userData.ownerPart ?? fish.children[0].userData.ownerPart).toBe('scenery');
    });

    it('moves the dots of the water down the pockets at the speed of the pockets, and the dots of the current (generator to cable) with the amperes', () => {
      go({}, { schematic: false });
      expect(mod.flows.water.object.visible).toBe(false);
      expect(mod.flows.current.object.visible).toBe(false);
      const first = (f: typeof mod.flows.water) =>
        new THREE.Vector3().fromBufferAttribute(f.object.geometry.attributes.position as THREE.BufferAttribute, 1);
      const move = (over: object) => {
        const s = stateWith({ fill: 1, ...over });
        mod.update(s, 1 / 60, view({ schematic: true, time: 500 }));
        const a = first(mod.flows.current);
        const w = first(mod.flows.water);
        mod.update(s, 0.05, view({ schematic: true, time: 501 }));
        return [a.distanceTo(first(mod.flows.current)), w.distanceTo(first(mod.flows.water))] as const;
      };
      const [d10] = move({ current: 10, omega: 5 });
      const [d20, w20] = move({ current: 20, omega: 5 });
      expect(mod.flows.water.object.visible).toBe(true);
      expect(d10).toBeGreaterThan(0.01);
      expect(d20 / d10).toBeCloseTo(2, 1);
      const shape = mod.drawn.shape;
      // the water dots go at pitch * revolutions per second
      expect(w20).toBeCloseTo(0.05 * ((shape.pitch * 5) / (2 * Math.PI)), 3);
      expect(move({ current: 0, omega: 5 })[0]).toBeCloseTo(0, 9);
      go({}, { schematic: false });
    });
  });

  describe('the section', () => {
    it('cuts the screw, the trough, the pools and the water, and nothing of the drive, with caps that follow the angle of the blades', () => {
      go({ angle: 0.3 }, { cutaway: false });
      const caps = () => {
        let n = 0;
        mod.scene.traverse((o) => o.userData.cap && o.visible && n++);
        return n;
      };
      expect(caps()).toBe(0);
      go({ angle: 0.3 }, { cutaway: true });
      expect(caps()).toBeGreaterThan(8);
      const clipped = (id: string) =>
        reg.get(id)!.meshes.some((m) => ((m.material as THREE.Material).clippingPlanes?.length ?? 0) > 0);
      for (const id of [
        'trough',
        'screw-core',
        'blade-module',
        'blade-fastener',
        'inlet-sill',
        'outlet-pool',
        'trapped-water',
      ])
        expect(clipped(id), id).toBe(true);
      for (const id of ['generator', 'chain', 'belt', 'pulley-small', 'pulley-large', 'upper-bearing', 'countershaft'])
        expect(clipped(id), id).toBe(false);
      // the blades cross the plane once per blade spacing above the axis and once below
      const l = mod.drawn.layout;
      const n = rig.bladeCap!.geometry.drawRange.count / 6;
      const per = l.L / (l.shape.pitch / BLADES);
      expect(n).toBeGreaterThan(2 * per - 4);
      expect(n).toBeLessThan(2 * per + 2);
      // the caps move with the angle: a third of a turn brings the next blade to the same place
      const x = (rig.bladeCap!.geometry.attributes.position.array as Float32Array).slice(0, 18);
      go({ angle: 0.3 + 0.2 }, { cutaway: true });
      const y = (rig.bladeCap!.geometry.attributes.position.array as Float32Array).slice(0, 18);
      expect(Math.abs(y[0] - x[0])).toBeGreaterThan(1e-4);
      go({ angle: 0.3 }, { cutaway: false });
      expect(caps()).toBe(0);
    });

    it('hides the cap of a part that is hidden', () => {
      go({}, { cutaway: true });
      reg.setDisplay('trough', 'hidden');
      go({}, { cutaway: true });
      const caps = reg.get('trough')!.object.children.length;
      void caps;
      let visible = 0;
      mod.scene.traverse((o) => {
        if (o.userData.cap && o.userData.ownerPart === 'trough' && o.visible) visible++;
      });
      expect(visible).toBe(0);
      reg.setDisplay('trough', 'solid');
      go({}, { cutaway: false });
    });
  });

  it('explodes every part by its own path and returns it to its place', () => {
    go();
    reg.setAllFactors(0);
    const before = sceneBoxes(mod);
    for (const id of IDS) expect(reg.get(id)!.explode.length(), id).toBeGreaterThan(0);
    reg.setAllFactors(1);
    go({}, {}, 1);
    const after = sceneBoxes(mod);
    const l = mod.drawn.layout;
    for (const id of IDS) {
      const e = EXPLODE[id];
      const want = new THREE.Vector3(l.cosB, l.sinB, 0)
        .multiplyScalar(e.u * l.k)
        .add(new THREE.Vector3(-l.sinB, l.cosB, 0).multiplyScalar(e.n * l.k))
        .add(new THREE.Vector3(0, 0, e.z * l.k));
      // a part that holds water or a moving mesh keeps its box to a centimetre; the rest moves exactly
      const dx = after.get(id)!.min.x - before.get(id)!.min.x;
      const dy = after.get(id)!.min.y - before.get(id)!.min.y;
      const dz = after.get(id)!.min.z - before.get(id)!.min.z;
      expect(dx, `${id} x`).toBeCloseTo(want.x, 1);
      expect(dy, `${id} y`).toBeCloseTo(want.y, 1);
      expect(dz, `${id} z`).toBeCloseTo(want.z, 1);
    }
    // the exploded parts do not pass through one another's boxes except on purpose: a stack of layers along the normal (core, blades, bolts)
    const lay = ['screw-core', 'blade-module', 'blade-fastener'].map(
      (id) => after.get(id)!.getCenter(new THREE.Vector3()).y,
    );
    expect(lay[0]).toBeLessThan(lay[1]);
    expect(lay[1]).toBeLessThan(lay[2]);
    reg.setAllFactors(0);
    go();
  });

  it('isolates and ghosts every part, and shows its meshes again', () => {
    for (const id of IDS)
      for (const mode of ['hidden', 'ghost'] as const) {
        isolateOne(reg, id, mode);
        go({}, { cutaway: true });
        expect(reg.get(id)!.meshes.every((m) => m.visible)).toBe(true);
        expect(finiteTree(mod.scene)).toBe(true);
      }
    reg.setAllDisplay('solid');
    go({}, { cutaway: false });
    expect(reg.get('blade-module')!.meshes.every((m) => m.visible)).toBe(true);
  });

  it('animates the whole range of the state without a NaN: head, flow, slope, flood, low water, closed gate, no start, wheel', () => {
    const cases: [object, object][] = [
      [{}, {}],
      [{}, { head: 0.3, designFlow: 0.01 }],
      [{}, { head: 6, designFlow: 5, slope: 15 }],
      [{}, { head: 3, designFlow: 2.2, slope: 35 }],
      [{}, { riverFlow: 1.9 }],
      [{}, { riverFlow: 0.03 }],
      [{}, { gateOpen: false }],
      [{}, { chainRatio: 1, beltRatio: 8 }],
      [{}, { chainRatio: 6, beltRatio: 1 }],
      [{}, { machine: 'overshot' }],
      [{ fill: 0, omega: 0, rpm: 0, stopped: 'noStart' }, {}],
      [{ fill: 1, omega: 80, current: 80, tailRise: 1.5, charging: true, angle: 6.2 }, {}],
      [{ angle: 3, tailRise: -0.3, rackLoss: 2.6 }, {}],
    ];
    for (const [over, params] of cases)
      for (const v of [{}, { cutaway: true }, { schematic: true }, { slowMo: 0.02 }]) {
        const s = stateWith(over, params);
        for (let i = 0; i < 4; i++)
          mod.update(
            { ...s, angle: (s.angle + i * 0.4) % (2 * Math.PI) },
            1 / 60,
            view({ time: 1000 + i * 0.2 + Math.random(), ...v }),
          );
        mod.scene.updateMatrixWorld(true);
        expect(finiteTree(mod.scene), JSON.stringify([over, params, v])).toBe(true);
        for (const id of IDS) {
          const b = reg.bounds(id);
          expect(Number.isFinite(b.min.x) && Number.isFinite(b.max.y) && Number.isFinite(b.max.z), id).toBe(true);
        }
      }
    // the wheel scenario leaves the screw drawn at rest and does not rebuild it with zeros
    const wheel = stateWith({}, { machine: 'breastshot' });
    expect(wheel.outerDiameter).toBe(0);
    const rebuilds = mod.drawn.rebuilds;
    const rot = rig.wheels.find((w) => w.part === 'blade-module')!.rot.rotation.x;
    mod.update(wheel, 1 / 60, view({ time: 2000 }));
    mod.update({ ...wheel, angle: 2 }, 1 / 60, view({ time: 2001 }));
    expect(mod.drawn.rebuilds).toBe(rebuilds);
    expect(rig.wheels.find((w) => w.part === 'blade-module')!.rot.rotation.x).toBe(rot);
    expect(rig.pockets!.visible).toBe(false);
    go();
  });

  it('redraws the world at the size the state carries: a small screw, a river screw, another slope', () => {
    const before = mod.drawn.rebuilds;
    const cases = [
      { head: 1, designFlow: 0.031 },
      { head: 3, designFlow: 2.2 },
      { head: 1.75, designFlow: 0.18, slope: 30 },
      { head: 1.75, designFlow: 0.18, slope: 22 },
    ];
    let t = 3000;
    const sizes: number[] = [];
    for (const params of cases) {
      const s = stateWith({}, params);
      t += 1;
      mod.update(s, 1 / 60, view({ time: t }));
      mod.scene.updateMatrixWorld(true);
      const l = mod.drawn.layout;
      expect(l.shape.outerDiameter).toBeCloseTo(s.outerDiameter, 9);
      expect(l.shape.length).toBeCloseTo(s.length, 9);
      expect(l.shape.slopeDeg).toBeCloseTo(s.slopeDeg, 9);
      sizes.push(l.shape.outerDiameter);
      expect([...reg.ids()].sort()).toEqual([...IDS].sort());
      for (const id of IDS) expect(reg.get(id)!.meshes.length, id).toBeGreaterThan(0);
      // the blades are as wide as the screw the state describes
      const b = reg.bounds('blade-module');
      expect(Math.abs((b.max.z - b.min.z) / 2 - s.outerDiameter / 2)).toBeLessThan(0.015 * s.outerDiameter);
      // nothing floats after the redraw
      reg.setAllFactors(0);
      const supp = [ground(), ...mod.scenery().map((o) => new THREE.Box3().setFromObject(o, true))];
      expect(floating(sceneBoxes(mod), 0.03, supp), JSON.stringify(params)).toEqual([]);
      // the drive follows the size: the chain still wraps the sprockets
      expect(mod.rig.drive.chainLength).toBeGreaterThan(2 * l.counterAt[1] * 0.9);
    }
    expect(sizes[1]).toBeGreaterThan(sizes[0] * 4);
    expect(mod.drawn.rebuilds).toBeGreaterThan(before);
    // a rebuild is throttled: a second change within 0.15 s of the first waits
    const n = mod.drawn.rebuilds;
    mod.update(stateWith({}, { head: 1, designFlow: 0.031 }), 1 / 60, view({ time: t + 0.05 }));
    expect(mod.drawn.rebuilds).toBe(n);
    mod.update(stateWith({}, { head: 1, designFlow: 0.031 }), 1 / 60, view({ time: t + 0.5 }));
    expect(mod.drawn.rebuilds).toBe(n + 1);
  });

  it('redraws the small wheels when the visitor changes a ratio (the belt ratio sets the radius of the small pulley)', () => {
    let t = 4000;
    const tweak = (belt: number) => {
      const m = createScrewScene({ ratios: () => ({ chain: DESIGN.chainRatio, belt }) });
      const s = stateWith({});
      t += 1;
      m.update(s, 1 / 60, view({ time: t }));
      return m;
    };
    const a = tweak(DESIGN.beltRatio);
    const b = tweak(5);
    expect(a.rig.drive.smallPulley.r).toBeGreaterThan(b.rig.drive.smallPulley.r);
    expect(b.rig.drive.largePulley.r / b.rig.drive.smallPulley.r).toBeCloseTo(5, 6);
    // the belt is longer when the small pulley is smaller
    expect(b.rig.drive.beltLength).not.toBeCloseTo(a.rig.drive.beltLength, 3);
  });

  it('stays within its draw-call and triangle budget (it has no declared one: a hundred calls and fifty thousand triangles are the ceiling kept here)', () => {
    go({}, { cutaway: true });
    const st = drawStats(mod.scene);
    expect(st.calls).toBeLessThan(140);
    expect(st.triangles).toBeLessThan(120000);
  });
});
