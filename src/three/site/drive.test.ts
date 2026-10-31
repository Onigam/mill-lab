import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { partIds } from '../../part-ids';
import { DESIGN, DESIGN_SHAPE, DRIVE, SITE, SITE_DRIVE, defaultDriveRatios } from '../dims';
import { MACHINE_PARTS } from '../screw/build';
import {
  BAND_PERIODS_MAX as SCREW_BAND_MAX,
  BLUR_FROM as SCREW_BLUR_FROM,
  BLUR_FULL as SCREW_BLUR_FULL,
  createScrewScene,
} from '../screw/scene';
import { computeLayout, type Layout } from '../screw/layout';
import { drawStats, finiteTree, isolateOne, stateWith, touches, view } from '../test-utils';
import { BAND_PERIODS_MAX, BLUR_FROM, BLUR_FULL, SiteDrive, siteFrame, type Frame } from './drive';
import { createSiteScene } from './scene';
import { dashTexture } from '../screw/drive';

// The drive train of the `site` world: the machine of the screw world, built by the same builder, at the same size and in the same place round the shaft, moved to
// the site by a translation; the shaft that goes through the upper bearing to the large sprocket; the chain and the belt that touch their wheels; the wheels that
// turn like the screw world's; the masonry under it (nothing floats, nothing stands in the water); the ratios; the cable to the powerhouse.

const IDS = partIds('site');
const RATIOS = () => ({ chain: DESIGN.chainRatio, belt: DESIGN.beltRatio });
const OTHER = { chain: 2.4, belt: 4.2 };

/** A point of the site in the frame of the screw (x' along the axis, y' perpendicular and up, z across). */
const toScrew = (l: Layout, fr: Frame, p: THREE.Vector3): THREE.Vector3 => {
  const x = p.x - fr.dx;
  const y = p.y - fr.dy - l.y0;
  return new THREE.Vector3(x * l.cosB + y * l.sinB, -x * l.sinB + y * l.cosB, p.z - fr.dz);
};

describe('the drive train of the site world', () => {
  const mod = createSiteScene({ ratios: RATIOS });
  const reg = mod.registry;
  const go = (over = {}, v = {}, frames = 2, params = {}) => {
    mod.settle();
    const s = stateWith(over, params);
    for (let i = 0; i < frames; i++) mod.update(s, 1 / 60, view({ time: 10 + i, ...v }));
    mod.scene.updateMatrixWorld(true);
    return s;
  };
  const drive = () => mod.chamber().drive;
  const l = () => drive().layout;
  const fr = () => drive().frame;
  /** What the supports stand on: the walls of the canal and of the pit, the quay, and the land north and south of the canal, as the chamber, the headrace and the land build them (site frame, boxes). */
  const ground = (): THREE.Box3[] => {
    const c = SITE.canal;
    const ch = SITE.chamber;
    const E = SITE.embankment;
    const G = SITE.ground;
    const B = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
      new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
    return [
      // the north wall of the pit and of the canal
      B(ch.xWest, ch.floorY, c.zNorth, c.xMax, SITE.groundY, c.zNorth + 0.15),
      // the south wall of the canal
      B(ch.xEast, c.bedY, c.zSouth - 0.15, c.mouthX, SITE.groundY, c.zSouth),
      // the south wall of the pit, lowered to the quay, and the quay itself
      B(ch.xWest, ch.floorY, c.zSouth - 0.2, ch.xEast, ch.quayY, c.zSouth),
      B(ch.xWest, G.bottomY, c.zSouth, ch.xEast, ch.quayY, E.zSouth),
      // the land: north of the canal, and the bank between the canal and the river
      B(G.xMin, G.bottomY, G.zMin, G.xMax, SITE.groundY, c.zNorth),
      B(ch.xEast, G.bottomY, E.zNorth, c.mouthX, SITE.groundY, E.zSouth),
    ];
  };
  /** The pieces that stand on nothing: neither on the ground nor on a piece that does. */
  const unsupported = (all: [string, THREE.Box3][]): string[] => {
    const solid = new Set<string>();
    const g = ground();
    let grew = true;
    while (grew) {
      grew = false;
      for (const [name, box] of all) {
        if (solid.has(name)) continue;
        if (g.some((b) => touches(box, b, 0.011)) || all.some(([o, ob]) => solid.has(o) && touches(box, ob, 0.011))) {
          solid.add(name);
          grew = true;
        }
      }
    }
    return all.map(([n]) => n).filter((n) => !solid.has(n));
  };

  describe('is the machine of the screw world', () => {
    /** The boxes of the parts of the machine in the screw world (without the invisible point that gives the overview its headroom), for ratios. */
    const screwBoxes = (ratios: { chain: number; belt: number }) => {
      const screw = createScrewScene({ ratios: () => ratios });
      screw.update(stateWith(), 1 / 60, view({ time: 10 }));
      for (const id of MACHINE_PARTS) {
        const root = screw.registry.get(id)!.object;
        for (const c of [...root.children]) if ((c as THREE.Points).isPoints) root.remove(c);
      }
      screw.scene.updateMatrixWorld(true);
      return new Map(MACHINE_PARTS.map((id) => [id, screw.registry.bounds(id)] as const));
    };
    const siteBoxes = () => {
      mod.scene.updateMatrixWorld(true);
      const d = new THREE.Vector3(-fr().dx, -fr().dy, -fr().dz);
      return new Map(
        MACHINE_PARTS.map((id) => [id, new THREE.Box3().setFromObject(drive().roots[id], true).translate(d)] as const),
      );
    };
    const same = (a: THREE.Box3, b: THREE.Box3, tol: number, skip: string[] = []) => {
      const axes = ['x', 'y', 'z'] as const;
      const out: string[] = [];
      for (const ax of axes)
        for (const side of ['min', 'max'] as const) {
          if (skip.includes(`${side}.${ax}`)) continue;
          if (Math.abs(a[side][ax] - b[side][ax]) > tol) out.push(`${side}.${ax}: ${a[side][ax]} vs ${b[side][ax]}`);
        }
      return out;
    };

    it('has the box of every part of the machine of the screw world, translated by the frame (a few millimetres), at the design ratios', () => {
      go();
      const ref = screwBoxes(RATIOS());
      const got = siteBoxes();
      for (const id of MACHINE_PARTS) {
        // the wedges under the countershaft and the generator stand on this place's own supports: their lower faces are not the screw world's
        const skip = id === 'countershaft' || id === 'generator' ? ['min.y'] : [];
        expect(same(got.get(id)!, ref.get(id)!, 0.003, skip), id).toEqual([]);
        if (skip.length)
          expect(got.get(id)!.min.y, `${id} lower face`).toBeGreaterThanOrEqual(ref.get(id)!.min.y - 1e-6);
      }
    });

    it('has them at other ratios too (the small wheels, the chain and the belt are redrawn)', () => {
      const m = createSiteScene({ ratios: () => OTHER });
      m.update(stateWith(), 1 / 60, view({ time: 10 }));
      m.scene.updateMatrixWorld(true);
      const ref = screwBoxes(OTHER);
      const d = m.chamber().drive;
      const t = new THREE.Vector3(-d.frame.dx, -d.frame.dy, -d.frame.dz);
      for (const id of MACHINE_PARTS) {
        const box = new THREE.Box3().setFromObject(d.roots[id], true).translate(t);
        const skip = id === 'countershaft' || id === 'generator' ? ['min.y'] : [];
        expect(same(box, ref.get(id)!, 0.003, skip), id).toEqual([]);
      }
      // and the numbers of the drive are the screw world's
      const screw = createScrewScene({ ratios: () => OTHER });
      screw.update(stateWith(), 1 / 60, view({ time: 10 }));
      expect(d.rig.drive.teeth).toEqual(screw.rig.drive.teeth);
      expect(d.rig.drive.ratios.chain).toBeCloseTo(screw.rig.drive.ratios.chain, 9);
      expect(d.rig.drive.beltLength).toBeCloseTo(screw.rig.drive.beltLength, 9);
      expect(d.rig.drive.chainLength).toBeCloseTo(screw.rig.drive.chainLength, 9);
    });

    it('is moved to the site by a translation that puts the screw where the chamber puts it (the pool at the design tail level)', () => {
      go();
      const ch = mod.chamber();
      const f = fr();
      const lay = ch.layout;
      expect(f.dx).toBeCloseTo(SITE.chamber.xWest + SITE.chamber.lowerEnd, 12);
      expect(f.dz).toBeCloseTo((SITE.canal.zNorth + SITE.canal.zSouth) / 2, 12);
      expect(ch.origin.x).toBeCloseTo(f.dx, 9);
      expect(ch.origin.y).toBeCloseTo(lay.y0 + f.dy, 9);
      expect(ch.origin.z).toBeCloseTo(f.dz, 9);
      expect(lay.tailY + f.dy).toBeCloseTo(SITE.tailY, 9);
      expect(siteFrame(computeLayout(DESIGN_SHAPE))).toEqual(f);
      // the drive stands on the layout of the chamber, apart from the plane its wedges stand on
      expect({ ...l(), platTop: 0 }).toEqual({ ...lay, platTop: 0 });
    });

    it('turns and blurs by the same rules as the screw world', () => {
      expect([BLUR_FROM, BLUR_FULL, BAND_PERIODS_MAX]).toEqual([SCREW_BLUR_FROM, SCREW_BLUR_FULL, SCREW_BAND_MAX]);
    });
  });

  describe('is connected', () => {
    it('carries the shaft of the screw through the upper bearing to the large sprocket (no gap, nothing floating)', () => {
      go();
      const lay = l();
      const f = fr();
      const axis = (s: number) => {
        const p = new THREE.Vector3(s * lay.cosB + f.dx, lay.y0 + s * lay.sinB + f.dy, f.dz);
        return p;
      };
      // the shaft is one cylinder of the turning screw, from its lower end to the end past the large sprocket
      const shaft = new THREE.Box3().setFromObject(mod.chamber().rot, true);
      const end = axis(lay.sShaftEnd);
      expect(shaft.expandByScalar(lay.rj + 0.001).containsPoint(end)).toBe(true);
      expect(lay.sShaftEnd).toBeGreaterThan(lay.sChain);
      expect(lay.sUp).toBeLessThan(lay.sChain);
      // the bearing stands on the shaft, the large sprocket is on it, the shaft is a continuous segment between them
      const supports = drive().supports.group;
      const bearing = new THREE.Box3().setFromObject(supports.children[0], true);
      expect(bearing.containsPoint(axis(lay.sUp))).toBe(true);
      const big = new THREE.Box3().setFromObject(drive().roots['drive-sprocket'], true);
      expect(big.containsPoint(axis(lay.sChain))).toBe(true);
      // the screw world's own check: the centre of the sprocket is on the axis of the shaft, within its length
      const c = drive()
        .rig.drive.bigSprocket.c.clone()
        .add(new THREE.Vector3(f.dx, f.dy, f.dz));
      expect(c.distanceTo(axis(lay.sChain))).toBeLessThan(1e-9);
      // the end of the shaft is no more than 0.2 m past the sprocket's plane (as in the screw world) and is the same shaft the screw's core carries
      expect(lay.sShaftEnd - lay.sChain).toBeCloseTo(0.2 * lay.k, 9);
    });

    it('wraps the chain on both sprockets and the belt on both pulleys, in their planes, as the screw world does', () => {
      go();
      const lay = l();
      const f = fr();
      const d = drive().rig.drive;
      for (const [id, plane, wheels] of [
        ['chain', lay.sChain, [d.bigSprocket, d.smallSprocket]],
        ['belt', lay.sBelt, [d.largePulley, d.smallPulley]],
      ] as const) {
        let band: THREE.Mesh | undefined;
        drive().roots[id].traverse((o) => {
          if (o.name === `${id}-band`) band = o as THREE.Mesh;
        });
        expect(band, id).toBeDefined();
        const pos = band!.geometry.attributes.position;
        const world = new THREE.Vector3();
        const near = [Infinity, Infinity];
        let xMin = Infinity;
        let xMax = -Infinity;
        for (let i = 0; i < pos.count; i += 3) {
          world.fromBufferAttribute(pos, i).applyMatrix4(band!.matrixWorld);
          const q = toScrew(lay, f, world);
          xMin = Math.min(xMin, q.x);
          xMax = Math.max(xMax, q.x);
          wheels.forEach((w, k) => {
            const c = toScrew(lay, f, w.c.clone().add(new THREE.Vector3(f.dx, f.dy, f.dz)));
            near[k] = Math.min(near[k], Math.hypot(q.y - c.y, q.z - c.z));
          });
        }
        // the inner face of the band touches the pitch circle of each wheel (the belt rides 3 mm higher), never inside it
        wheels.forEach((w, k) => {
          expect(near[k], `${id} wheel ${k}`).toBeGreaterThan(w.r - 1e-4);
          expect(near[k], `${id} wheel ${k}`).toBeLessThan(w.r + 0.006 * lay.k);
        });
        expect(xMin).toBeGreaterThan(plane - 0.05 * lay.k);
        expect(xMax).toBeLessThan(plane + 0.05 * lay.k);
      }
      // the wheels are the screw world's, on the same shafts: the countershaft carries the small sprocket and the large pulley, the generator the small pulley
      const bx = (id: (typeof MACHINE_PARTS)[number]) => new THREE.Box3().setFromObject(drive().roots[id], true);
      const shaft = bx('countershaft');
      for (const w of [d.smallSprocket, d.largePulley]) {
        const c = w.c.clone().add(new THREE.Vector3(f.dx, f.dy, f.dz));
        expect(shaft.clone().expandByScalar(0.002).containsPoint(c)).toBe(true);
      }
      const gen = bx('generator');
      const sp = d.smallPulley.c.clone().add(new THREE.Vector3(f.dx, f.dy, f.dz));
      expect(gen.clone().expandByScalar(0.002).containsPoint(sp)).toBe(true);
    });

    it('draws the train at its true size: the sizes of dims.ts times the hardware scale of the screw', () => {
      go();
      const lay = l();
      const d = drive().rig.drive;
      expect(d.bigSprocket.r).toBeCloseTo(0.2265 * lay.k, 3);
      expect(d.largePulley.r).toBeCloseTo(DRIVE.largePulleyRadius * lay.k, 9);
      expect(d.countershaft.r).toBeCloseTo(DRIVE.countershaftRadius * lay.k, 9);
      // the countershaft and the generator are where dims.ts says, from the axis of the screw, towards the south
      const cs = toScrew(lay, fr(), d.countershaft.from.clone().add(new THREE.Vector3(fr().dx, fr().dy, fr().dz)));
      expect(cs.y).toBeCloseTo(DRIVE.countershaftAt[0] * lay.k, 9);
      expect(cs.z).toBeCloseTo(DRIVE.countershaftAt[1] * lay.k, 9);
      const gz = d.smallPulley.c.z + fr().dz;
      expect(gz - fr().dz).toBeCloseTo(DRIVE.generatorAt[1] * lay.k, 9);
    });
  });

  describe('is built for the place: the masonry', () => {
    const pieces = () => Object.entries(drive().supports.pieces);
    it('leaves nothing floating: every piece stands on a wall or the quay, or on another piece that does', () => {
      go();
      expect(unsupported(pieces())).toEqual([]);
      // what the machine stands on: the bearing on its wedge on the beam, the countershaft on the shelf, the generator on the south wall and the bank
      const b = (id: string) =>
        new THREE.Box3().setFromObject(drive().roots[id as (typeof MACHINE_PARTS)[number]], true);
      const p = drive().supports.pieces;
      expect(touches(p.bearingWedge, p.beam, 0.011)).toBe(true);
      expect(touches(b('countershaft'), p.shelf, 0.011)).toBe(true);
      // ... on it: over the shelf, the lowest point of the countershaft part is the foot of its wedges, which stand on the shelf's top
      let low = Infinity;
      const v = new THREE.Vector3();
      drive().roots.countershaft.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const pos = m.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
          if (v.x > p.shelf.min.x && v.x < p.shelf.max.x && v.z > p.shelf.min.z && v.z < p.shelf.max.z)
            low = Math.min(low, v.y);
        }
      });
      expect(low).toBeCloseTo(p.shelf.max.y, 6);
      const land = [
        new THREE.Box3(
          new THREE.Vector3(SITE.chamber.xEast, SITE.ground.bottomY, SITE.embankment.zNorth),
          new THREE.Vector3(SITE.canal.mouthX, SITE.groundY, SITE.embankment.zSouth),
        ),
      ];
      expect(land.some((x) => touches(b('generator'), x, 0.011))).toBe(true);
      // ... on it, not sunk into it: the body rests on the bank (its cable goes down into the ground), and the small pulley turns clear of the ground
      const body = new THREE.Box3();
      drive().roots.generator.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o.name === 'generator-merged') body.union(new THREE.Box3().setFromObject(o));
      });
      expect(body.min.y).toBeGreaterThanOrEqual(SITE.groundY - 0.002);
      expect(body.min.y).toBeLessThan(SITE.groundY + 0.012);
      expect(b('pulley-small').min.y).toBeGreaterThan(SITE.groundY + 0.01);
      // the bearing sits on the plinth of the beam, within the beam in plan
      expect(p.bearingWedge.min.x).toBeGreaterThanOrEqual(p.beam.min.x);
      expect(p.bearingWedge.max.x).toBeLessThanOrEqual(p.beam.max.x);
    });

    it('keeps out of the water: nothing stands in the canal or the basin, the underside of every support is a hand over the highest water the world draws under it', () => {
      const c = SITE.canal;
      const ch = SITE.chamber;
      const { waterTop } = drive().levels;
      /** The surface of the canal below the gate at x, as the sheet is drawn now (a plane that rises from the end of the canal to the gate). */
      const surface = (x: number): number => {
        const at = new Map<number, number>();
        mod.scene.traverse((o) => {
          if (o.name !== 'canal-below-gate') return;
          const pos = (o as THREE.Mesh).geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) at.set(+pos.getX(i).toFixed(4), pos.getY(i));
        });
        const pts = [...at].sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < pts.length; i++)
          if (x <= pts[i][0])
            return pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (x - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]);
        return pts[pts.length - 1][1];
      };
      // every state of the world that moves the water of the end of the canal: the full bucket, the empty one, the gate closed, a flood, no start, a high pond, a clogged rack
      const sweep: object[] = [
        {},
        { fill: 1 },
        { fill: 0 },
        { stopped: 'closed', flow: 0, fill: 0 },
        { stopped: 'flood', flow: 0, tailRise: 1.5, bypassFlow: 8 },
        { stopped: 'noStart', omega: 0, fill: 1 },
        { bypassFlow: 8, rackLoss: 0 },
        { rackLoss: 3, fill: 1 },
        { tailRise: 1.5 },
      ];
      const pieceList = pieces();
      const worst = new Map<string, number>(pieceList.map(([n]) => [n, -Infinity]));
      for (const over of sweep) {
        go(over, {}, 3);
        const cb = mod.chamber();
        const basin = Math.max(...cb.basin.poly.map((q) => q[1]));
        for (const [name, box] of pieceList) {
          // in the basin (west of the end of the canal) the water is the basin's, east of it the sheet of the canal
          let w = box.min.x < c.xMin ? basin : -Infinity;
          if (box.max.x > c.xMin) w = Math.max(w, surface(Math.max(box.min.x, c.xMin)), surface(box.max.x));
          worst.set(name, Math.max(worst.get(name)!, w));
        }
        // the highest water at the end of the canal is the full bucket's, never higher
        expect(basin, JSON.stringify(over)).toBeLessThanOrEqual(waterTop + 1e-9);
        expect(mod.levels.canalEnd, JSON.stringify(over)).toBeLessThanOrEqual(waterTop + 1e-9);
      }
      const open = new THREE.Box3(
        new THREE.Vector3(ch.xWest, ch.floorY, c.zNorth + 0.2),
        new THREE.Vector3(c.xMax, waterTop + SITE_DRIVE.waterClearance - 1e-6, c.zSouth - 0.15 - 1e-4),
      );
      for (const [name, box] of pieceList) {
        const inPlan = box.min.z < c.zSouth - 0.15 - 1e-4 && box.max.z > c.zNorth + 0.2;
        expect(open.intersectsBox(box) && inPlan, `${name} in the water`).toBe(false);
        // over the water: a hand's width of air under what is over it (the pier is beside the water, on the quay, and has no water under it)
        if (name !== 'pier')
          expect(box.min.y - worst.get(name)!, `${name} clearance`).toBeGreaterThanOrEqual(
            SITE_DRIVE.waterClearance - 0.01,
          );
      }
      // the pier is on the south side of the south wall, out of the canal in plan (and out of the pit's water, which is 0.22 m inside its walls)
      expect(drive().supports.pieces.pier.min.z).toBeGreaterThanOrEqual(c.zSouth - 0.15 - 1e-4);
      // the water still reaches the basin: the shelf leaves at least 1.8 m of the canal open, and the beam and the shelf are above the water
      expect(drive().supports.pieces.shelf.min.z - (c.zNorth + 0.15)).toBeGreaterThan(1.8);
      go();
    });

    it('stands the shelf clear of the small sprocket and the chain, and under the belt and the large pulley', () => {
      go();
      const shelf = drive().supports.pieces.shelf;
      const box = (id: (typeof MACHINE_PARTS)[number]) => new THREE.Box3().setFromObject(drive().roots[id], true);
      for (const id of ['counter-sprocket', 'chain'] as const) {
        // the chain's box spans the loop; its part under the shelf's plan is the small sprocket's side, clear of it
        const b = box(id);
        if (id === 'counter-sprocket') expect(b.intersectsBox(shelf), id).toBe(false);
      }
      expect(box('pulley-large').min.y).toBeGreaterThan(shelf.max.y + 0.05);
      expect(box('belt').min.y).toBeGreaterThan(shelf.max.y + 0.05);
      // the shelf's top is the plane the wedges of the countershaft stand on
      expect(l().platTop + fr().dy).toBeCloseTo(shelf.max.y, 9);
    });

    it('does not move for another ratio (the supports depend on the screw, not on the small wheels)', () => {
      const a = createSiteScene({ ratios: () => ({ chain: 2, belt: 2 }) });
      const b = createSiteScene({ ratios: () => ({ chain: 4, belt: 5 }) });
      for (const m of [a, b]) m.update(stateWith(), 1 / 60, view({ time: 10 }));
      for (const [name, box] of Object.entries(a.chamber().drive.supports.pieces))
        expect(box.equals(b.chamber().drive.supports.pieces[name as 'beam']), name).toBe(true);
    });
  });

  describe('turns like the screw world', () => {
    const rig = () => drive().rig;
    const wheelOf = (part: string) => rig().wheels.find((w) => w.part === part)!;

    it('turns every wheel by the screw step times its ratio (slowly enough for the eye to follow)', () => {
      go({ angle: 1 }, { slowMo: 0.01 });
      const before = rig().wheels.map((w) => w.rot.rotation.x);
      mod.update({ ...stateWith(), angle: 1.05 }, 1 / 60, view({ time: 30, slowMo: 0.01 }));
      rig().wheels.forEach((w, i) => expect(w.rot.rotation.x - before[i], w.part).toBeCloseTo(0.05 * w.ratio, 9));
      expect(wheelOf('drive-sprocket').ratio).toBe(1);
      expect(wheelOf('counter-sprocket').ratio).toBeCloseTo(rig().drive.ratios.chain, 9);
      expect(wheelOf('pulley-small').ratio).toBeCloseTo(rig().drive.ratios.chain * rig().drive.ratios.belt, 9);
      expect(wheelOf('generator').ratio).toBeCloseTo(rig().drive.ratios.chain * rig().drive.ratios.belt, 9);
      // the large sprocket is on the screw's shaft: it is in step with the screw
      expect(wheelOf('drive-sprocket').rot.rotation.x).toBeCloseTo(mod.chamber().rot.rotation.x, 9);
      // the generator turns the generator's ratio times faster than the screw: the screw's rpm times it is the rated speed
      expect(rig().drive.ratios.chain * rig().drive.ratios.belt * DESIGN.screwRpm).toBeCloseTo(DESIGN.generatorRpm, -2);
    });

    it('fades a disc in over a wheel that turns too fast to read and stops it following the true angle (the wagon-wheel guard)', () => {
      go({ angle: 0, omega: 55 * ((2 * Math.PI) / 60) }, {}, 2);
      const small = wheelOf('counter-sprocket');
      expect(small.blur, 'the small sprocket has a disc').not.toBeNull();
      mod.update({ ...stateWith(), angle: 0.1, omega: 55 * ((2 * Math.PI) / 60) }, 1 / 60, view({ time: 40 }));
      const p0 = small.rot.rotation.x;
      mod.update({ ...stateWith(), angle: 0.2, omega: 55 * ((2 * Math.PI) / 60) }, 1 / 60, view({ time: 41 }));
      // the sprocket (17 teeth, 3 rev/s) is blurred and moves at most 14 positions a second
      expect(small.blur!.visible).toBe(true);
      expect(Math.abs(small.rot.rotation.x - p0)).toBeLessThanOrEqual((2 * Math.PI * 14) / 60 / small.symmetry + 1e-9);
      // the big sprocket (0.9 rev/s, six holes) and the countershaft are not
      expect(wheelOf('drive-sprocket').blur!.visible).toBe(false);
      // the discs are not drawn when the part is ghosted
      reg.setDisplay('water-chamber', 'ghost');
      mod.update({ ...stateWith(), angle: 0.3, omega: 55 * ((2 * Math.PI) / 60) }, 1 / 60, view({ time: 42 }));
      expect(small.blur!.visible).toBe(false);
      reg.setDisplay('water-chamber', 'solid');
    });

    it('runs the pattern of the chain and of the belt forward at the rim speed, never faster than 12 repeats a second', () => {
      go({ angle: 0 }, { slowMo: 0.01 });
      const chain = rig().chain!;
      const belt = rig().belt!;
      const o0 = chain.texture.offset.x;
      const b0 = belt.texture.offset.x;
      mod.update({ ...stateWith(), angle: 0.02 }, 1 / 60, view({ time: 50, slowMo: 0.01 }));
      expect(chain.texture.offset.x - o0).toBeCloseTo((0.02 * chain.radius) / chain.period, 9);
      expect(belt.texture.offset.x - b0).toBeGreaterThan(0);
      const big = chain.texture.offset.x;
      mod.update({ ...stateWith(), angle: 2 }, 1 / 60, view({ time: 51, slowMo: 0.01 }));
      expect(Math.abs(chain.texture.offset.x - big)).toBeLessThanOrEqual(12 / 60 + 1e-9);
    });

    it('leaves the train at rest when the machine is a wheel (nothing is drawn for it)', () => {
      go({ angle: 1 }, { slowMo: 0.01 });
      const before = rig().wheels.map((w) => w.rot.rotation.x);
      const wheel = stateWith({}, { machine: 'overshot' });
      mod.update(wheel, 1 / 60, view({ time: 60 }));
      rig().wheels.forEach((w, i) => expect(w.rot.rotation.x, w.part).toBe(before[i]));
      expect(rig().wheels.every((w) => !w.blur || !w.blur.visible)).toBe(true);
      mod.update(stateWith(), 1 / 60, view({ time: 70 }));
    });
  });

  describe('follows the ratios of the application', () => {
    it('redraws the small wheels, the chain and the belt when a ratio moves, without redrawing the screw, and keeps the part whole', () => {
      let ratios = { chain: DESIGN.chainRatio, belt: DESIGN.beltRatio };
      const m = createSiteScene({ ratios: () => ratios });
      m.update(stateWith(), 1 / 60, view({ time: 10 }));
      const d0 = m.chamber().drive;
      const rebuilds = m.drawn.rebuilds;
      const supports = m.chamber().drive.supports;
      const teeth0 = d0.rig.drive.teeth[1];
      const beltLen0 = d0.rig.drive.beltLength;
      ratios = OTHER;
      m.update(stateWith(), 1 / 60, view({ time: 11 }));
      m.scene.updateMatrixWorld(true);
      expect(m.chamber().drive).toBe(d0); // the same drive, redrawn
      expect(m.chamber().drive.supports).toBe(supports);
      expect(m.drawn.rebuilds).toBe(rebuilds); // the screw was not redrawn
      expect(m.drawn.ratios.chain).toBeCloseTo(OTHER.chain, 9);
      expect(d0.rig.drive.teeth[1]).not.toBe(teeth0);
      expect(d0.rig.drive.teeth[1]).toBe(Math.round(DRIVE.largeTeeth / OTHER.chain));
      expect(d0.rig.drive.beltLength).not.toBeCloseTo(beltLen0, 3);
      expect(d0.rig.drive.largePulley.r / d0.rig.drive.smallPulley.r).toBeCloseTo(OTHER.belt, 6);
      // every mesh of the chamber is in the part (so the isolate, ghost and X-ray modes act on the new meshes), and none of the old ones is left in it
      const root = m.registry.get('water-chamber')!;
      const inside = new Set<THREE.Mesh>();
      root.object.traverse((o) => {
        const x = o as THREE.Mesh;
        if (x.isMesh && x.userData.ownerPart === 'water-chamber') inside.add(x);
      });
      expect(new Set(root.meshes)).toEqual(inside);
      // the display of the part is kept for the new meshes
      m.registry.setDisplay('water-chamber', 'ghost');
      ratios = { chain: 3, belt: 3 };
      m.update(stateWith(), 1 / 60, view({ time: 12 }));
      expect(m.registry.get('water-chamber')!.display).toBe('ghost');
      expect(root.meshes.every((x) => x.material !== x.userData.solidMaterial)).toBe(true);
      m.registry.setDisplay('water-chamber', 'solid');
      expect(root.meshes.every((x) => x.material === x.userData.solidMaterial)).toBe(true);
    });

    it('draws the default ratios of the simulation without an option, like the screw world', () => {
      const m = createSiteScene();
      m.update(stateWith(), 1 / 60, view({ time: 10 }));
      const def = defaultDriveRatios(DESIGN_SHAPE.outerDiameter);
      expect(m.drawn.ratios.chain).toBeCloseTo(def.chain, 9);
      expect(m.chamber().drive.rig.drive.teeth[0]).toBe(DRIVE.largeTeeth);
    });
  });

  describe('belongs to the water chamber', () => {
    it('is a child of the part: bounds, isolate, ghost and explode act on it, with materials the kit can drive', () => {
      go();
      const part = reg.get('water-chamber')!;
      expect([...reg.ids()].sort()).toEqual([...IDS].sort());
      const box = reg.bounds('water-chamber');
      const gen = new THREE.Box3().setFromObject(drive().roots.generator, true);
      expect(box.containsBox(gen)).toBe(true);
      expect(box.max.x).toBeGreaterThan(SITE.chamber.xEast + 1);
      const meshes: THREE.Mesh[] = [];
      drive().group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.userData.ownerPart === 'water-chamber') meshes.push(m);
      });
      expect(meshes.length).toBeGreaterThan(15);
      for (const m of meshes) {
        expect(m.material, m.name).toBeInstanceOf(THREE.MeshStandardMaterial);
        expect((m.material as THREE.ShaderMaterial).isShaderMaterial).toBeFalsy();
        expect(part.meshes.includes(m), m.name).toBe(true);
      }
      // isolate another part: the train is hidden with the chamber; ghost it: the kit's own material replaces theirs
      isolateOne(reg, 'weir', 'hidden');
      expect(meshes.every((m) => !m.visible)).toBe(true);
      isolateOne(reg, 'weir', 'ghost');
      expect(meshes.every((m) => m.visible && m.material !== m.userData.solidMaterial)).toBe(true);
      reg.setAllDisplay('solid');
      expect(meshes.every((m) => m.visible && m.material === m.userData.solidMaterial)).toBe(true);
      // explode: the train rises with the chamber
      reg.setAllFactors(0);
      const g0 = new THREE.Box3().setFromObject(drive().roots.generator, true).min.y;
      reg.setAllFactors(1);
      go({}, {}, 1);
      const g1 = new THREE.Box3().setFromObject(drive().roots.generator, true).min.y;
      reg.setAllFactors(0);
      expect(g1 - g0).toBeCloseTo(5, 6);
      go();
    });

    it('is one part of the site world without a box, a rod or a bridge to it: the old drive box is gone', () => {
      go();
      const names: string[] = [];
      reg.get('water-chamber')!.object.traverse((o) => names.push(o.name));
      expect(names).toContain('site-drive');
      expect((mod.chamber() as unknown as Record<string, unknown>).driveBox).toBeUndefined();
      // nothing blue (the colour of the old box) is left on the north bank of the canal
      let blue = 0;
      reg.get('water-chamber')!.object.traverse((o) => {
        const m = o as THREE.Mesh;
        if (
          m.isMesh &&
          !Array.isArray(m.material) &&
          (m.material as THREE.MeshStandardMaterial).color?.getHex() === 0x2f5d7c
        ) {
          const b = new THREE.Box3().setFromObject(m, true);
          if (b.max.z < SITE.canal.zNorth) blue++;
        }
      });
      expect(blue).toBe(0);
    });
  });

  describe('sends its current to the powerhouse', () => {
    it('leaves the terminal of the generator and arrives at the powerhouse, and follows the machine when it is redrawn', () => {
      go();
      const line = mod.scene.getObjectByName('line-chamber') as THREE.Mesh;
      expect(line).toBeDefined();
      const t = drive().terminal;
      line.geometry.computeBoundingBox();
      const b = line.geometry.boundingBox!;
      expect(b.clone().expandByScalar(0.02).containsPoint(t)).toBe(true);
      // the terminal is on the generator's body
      expect(new THREE.Box3().setFromObject(drive().roots.generator, true).expandByScalar(0.02).containsPoint(t)).toBe(
        true,
      );
      // the line ends at the powerhouse: the insulator on its west wall, where the old line arrived
      const ph = SITE.powerhouse;
      const arrives = new THREE.Vector3(ph.x - ph.length / 2, SITE.groundY + 0.14 + ph.wallHeight - 0.4, ph.z);
      expect(b.clone().expandByScalar(0.02).containsPoint(arrives)).toBe(true);
      expect(b.max.z).toBeLessThan(SITE.canal.zSouth + 0.1);
      // another size: the machine moves, the line follows it
      mod.update(stateWith({}, { head: 3, designFlow: 2.2 }), 1 / 60, view({ time: 800 }));
      mod.scene.updateMatrixWorld(true);
      const t2 = drive().terminal;
      expect(t2.distanceTo(t)).toBeGreaterThan(0.1);
      line.geometry.computeBoundingBox();
      expect(line.geometry.boundingBox!.clone().expandByScalar(0.02).containsPoint(t2)).toBe(true);
      mod.update(stateWith(), 1 / 60, view({ time: 900 }));
      mod.scene.updateMatrixWorld(true);
      expect(finiteTree(mod.scene)).toBe(true);
    });
  });

  describe('costs little', () => {
    it('adds at most about 40 draw calls and 12,000 triangles to the site, which stays in its budget (220 and 400,000), and builds in a few tens of milliseconds', () => {
      go({}, { schematic: true });
      const part = drawStats(drive().group);
      const all = drawStats(mod.scene);
      // eslint-disable-next-line no-console
      console.log(
        `site drive: ${part.calls} draw calls, ${Math.round(part.triangles)} triangles; whole site ${all.calls}, ${Math.round(all.triangles)}`,
      );
      expect(part.calls).toBeLessThanOrEqual(40);
      expect(part.triangles).toBeLessThanOrEqual(12000);
      expect(all.calls).toBeLessThanOrEqual(220);
      expect(all.triangles).toBeLessThanOrEqual(400000);
      const lay = computeLayout(DESIGN_SHAPE);
      const tex = { chain: dashTexture('chain'), belt: dashTexture('belt') };
      new SiteDrive(lay, tex, RATIOS(), () => new THREE.MeshStandardMaterial()); // warm up
      const t0 = performance.now();
      new SiteDrive(lay, tex, RATIOS(), () => new THREE.MeshStandardMaterial());
      const ms = performance.now() - t0;
      // eslint-disable-next-line no-console
      console.log(`site drive built in ${ms.toFixed(1)} ms`);
      expect(ms).toBeLessThan(150);
    });

    it('allocates nothing in a frame: the wheels, the meshes and the bands are the same objects after many frames', () => {
      go();
      const wheels = drive().rig.wheels.slice();
      const bands = [drive().rig.chain, drive().rig.belt];
      let count = 0;
      drive().group.traverse(() => count++);
      for (let i = 0; i < 30; i++) mod.update({ ...stateWith(), angle: i * 0.1 }, 1 / 60, view({ time: 100 + i }));
      let after = 0;
      drive().group.traverse(() => after++);
      expect(after).toBe(count);
      expect(drive().rig.wheels).toEqual(wheels);
      expect([drive().rig.chain, drive().rig.belt]).toEqual(bands);
    });
  });

  describe('is valid for every screw the visitor can ask for', () => {
    it('keeps the shelf over the water, the supports touching and no NaN, from a small machine to a river screw', () => {
      for (const params of [
        { head: 0.5, designFlow: 0.05 },
        { head: 1, designFlow: 0.3 },
        { head: 3, designFlow: 2.2 },
        { head: 6, designFlow: 5 },
        {},
      ]) {
        mod.update(stateWith({}, params), 1 / 60, view({ time: 1000 + Math.random() * 1000 }));
        mod.scene.updateMatrixWorld(true);
        const d = drive();
        expect(finiteTree(mod.scene), JSON.stringify(params)).toBe(true);
        expect(d.levels.shelfTop, JSON.stringify(params)).toBeGreaterThanOrEqual(
          d.levels.waterTop + SITE_DRIVE.waterClearance + SITE_DRIVE.shelf.thickness - 1e-9,
        );
        for (const [name, box] of Object.entries(d.supports.pieces))
          expect(box.isEmpty() || Number.isFinite(box.min.x + box.max.y), name).toBe(true);
        // a bigger screw lifts the drive over the walls, a smaller one puts it over the basin: the masonry follows, and still stands on something
        expect(unsupported(Object.entries(d.supports.pieces)), JSON.stringify(params)).toEqual([]);
        // the beam rests on a wall or a pier at its two ends (not a cantilever over the canal), the root of the shelf is let into the south wall or rests on it
        const { beam, root, northPier, pier } = d.supports.pieces;
        const end = (box: THREE.Box3, north: boolean) =>
          north
            ? new THREE.Box3(box.min.clone(), new THREE.Vector3(box.max.x, box.max.y, box.min.z + 0.1))
            : new THREE.Box3(new THREE.Vector3(box.min.x, box.min.y, box.max.z - 0.1), box.max.clone());
        const holds = [...ground(), ...(northPier ? [northPier] : []), pier];
        expect(
          holds.some((b) => touches(end(beam, true), b, 0.011)),
          `north end of the beam ${JSON.stringify(params)}`,
        ).toBe(true);
        expect(
          holds.some((b) => touches(end(beam, false), b, 0.011)),
          `south end of the beam ${JSON.stringify(params)}`,
        ).toBe(true);
        expect(
          ground().some((b) => touches(end(root, false), b, 0.011)),
          `the root of the shelf at the wall ${JSON.stringify(params)}`,
        ).toBe(true);
        expect(reg.bounds('water-chamber').isEmpty()).toBe(false);
      }
    });
  });
});
