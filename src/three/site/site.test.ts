import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { partIds } from '../../part-ids';
import { rackHeadLoss } from '../../sim/system';
import { DESIGN, DESIGN_SHAPE, RACK_CLEAN_LOSS, SITE } from '../dims';
import { drawStats, finiteTree, floating, isolateOne, sceneBoxes, stateWith, touches, view } from '../test-utils';
import { EXPLODE, createSiteScene, rackBlocked, weirHead } from './scene';
import { sunDirection } from './sky';

// The `site` world by script: ids, labels, floating parts, the levels of the water that follow the state (pond, canal, tailwater, gate, rack), the
// screw in the chamber, the lamp of the house, the dots, explode, NaN-free animation over the whole range, and the budget of the picture.

const IDS = partIds('site');

describe('site world', () => {
  const mod = createSiteScene();
  const reg = mod.registry;
  const go = (over = {}, v = {}, frames = 2, params = {}) => {
    mod.settle();
    const s = stateWith(over, params);
    for (let i = 0; i < frames; i++) mod.update(s, 1 / 60, view({ time: 10 + i, ...v }));
    mod.scene.updateMatrixWorld(true);
    return s;
  };
  /** The land as tiles (plan rectangles at ground height), the supports of the "no floating part" test. */
  const land = (): THREE.Box3[] => {
    const { ground: G, river, canal, embankment: E, tailrace: T, chamber } = SITE;
    const tiles: [number, number, number, number][] = [
      [G.xMin, G.xMax, G.zMin, canal.zNorth],
      [G.xMin, G.xMax, river.zSouth, G.zMax],
      [-33.4, chamber.xWest, E.zNorth, E.zSouth],
      [chamber.xEast, canal.mouthX, E.zNorth, E.zSouth],
      [G.xMin, T.xEnd, canal.zNorth, river.zNorth],
      [canal.xMax, G.xMax, canal.zNorth, river.zNorth],
    ];
    return tiles.map(
      ([x0, x1, z0, z1]) =>
        new THREE.Box3(new THREE.Vector3(x0, G.bottomY, z0), new THREE.Vector3(x1, SITE.groundY, z1)),
    );
  };

  it('registers exactly the twelve frozen ids, each with meshes of its own', () => {
    go();
    expect([...reg.ids()].sort()).toEqual([...IDS].sort());
    for (const id of IDS) expect(reg.get(id)!.meshes.length, id).toBeGreaterThan(0);
  });

  it('has a hotspot for every part, five main labels; the water chamber opens the screw world and the powerhouse the powerroom world; anchors live in the scene', () => {
    expect(mod.hotspots.map((h) => h.partId).sort()).toEqual([...IDS].sort());
    expect(mod.hotspots.filter((h) => !h.minor).map((h) => h.partId)).toEqual([
      'water-chamber',
      'weir',
      'mill-building',
      'powerhouse',
      'house-load',
    ]);
    expect(mod.hotspots.find((h) => h.partId === 'water-chamber')!.goto).toBe('screw');
    expect(mod.hotspots.find((h) => h.partId === 'powerhouse')!.goto).toBe('powerroom');
    // the building carries the danger triangle that tells where the way in is
    expect(mod.registry.get('powerhouse')!.object.getObjectByName('sign')).toBeDefined();
    expect(mod.hotspots.filter((h) => h.goto).length).toBe(2);
    mod.scene.updateMatrixWorld(true);
    for (const h of mod.hotspots) {
      let o: THREE.Object3D | null = h.anchor;
      while (o && o !== mod.scene) o = o.parent;
      expect(o, h.partId).toBe(mod.scene);
      expect(h.label.fr.length).toBeGreaterThan(2);
      expect(h.label.en.length).toBeGreaterThan(2);
    }
  });

  it('has no floating part: every part touches the land or another part', () => {
    go();
    reg.setAllFactors(0);
    expect(floating(sceneBoxes(mod), 0.05, land())).toEqual([]);
  });

  it('stands the buildings on the ground, the gate and the rack on the bed of the canal, the weir across the whole river and the pass on its bank', () => {
    go();
    reg.setAllFactors(0);
    const b = sceneBoxes(mod);
    // (the plinth of each building is sunk a few centimetres in the ground)
    for (const id of ['mill-building', 'powerhouse', 'house-load']) {
      expect(b.get(id)!.min.y, id).toBeGreaterThan(SITE.groundY - 0.1);
      expect(b.get(id)!.min.y, id).toBeLessThan(SITE.groundY + 0.01);
    }
    expect(b.get('intake-gate')!.min.y).toBeCloseTo(SITE.canal.bedY, 2);
    // (the tilted bars are sunk a centimetre or two in the bed)
    expect(b.get('trash-rack')!.min.y).toBeGreaterThan(SITE.canal.bedY - 0.03);
    expect(b.get('trash-rack')!.min.y).toBeLessThan(SITE.canal.bedY + 0.01);
    // the weir spans the river from the north bank to the fish pass, which goes on to the south bank
    expect(b.get('weir')!.min.z).toBeCloseTo(SITE.river.zNorth, 2);
    expect(b.get('weir')!.max.z).toBeCloseTo(SITE.fishPass.z, 2);
    expect(b.get('fish-pass')!.min.z).toBeCloseTo(SITE.fishPass.z, 2);
    expect(b.get('fish-pass')!.max.z).toBeCloseTo(SITE.river.zSouth, 2);
    expect(touches(b.get('fish-pass')!, b.get('weir')!, 0.2)).toBe(true);
    // the notch is cut in the crest and touches the weir
    expect(touches(b.get('reserved-flow-notch')!, b.get('weir')!, 0.01)).toBe(true);
    expect(b.get('reserved-flow-notch')!.max.y).toBeGreaterThan(SITE.weir.crestY);
    // the tailrace is the compressed one: about 21 m and the turn, not 100
    const t = b.get('tailrace')!;
    expect(t.max.x - t.min.x).toBeCloseTo(SITE.tailrace.length, 1);
    expect(t.max.x - t.min.x).toBeLessThan(40);
    // the chamber holds the screw: the screw's upper end is at the canal, the lower end at the tailrace
    const c = b.get('water-chamber')!;
    expect(c.min.x).toBeCloseTo(SITE.chamber.xWest, 1);
    // (the part also holds the drive train at the top end of the screw: the shaft, the countershaft and the generator stand on the canal beyond the pit,
    // about 1.4 m further east: `drive.test.ts` checks them)
    expect(c.max.x).toBeGreaterThan(SITE.chamber.xEast);
    expect(c.max.x).toBeLessThan(SITE.chamber.xEast + 2);
    expect(mod.chamber().pit.x1).toBe(SITE.chamber.xEast);
  });

  describe('the water follows the state', () => {
    it('keeps the pond a hair under the crest when only the reserved flow is spilled, the tailwater at the design level', () => {
      const s = go();
      const over = weirHead(s.bypassFlow);
      expect(mod.levels.pond).toBeCloseTo(SITE.weir.crestY + (over > 0.004 ? over : -0.03), 6);
      expect(mod.levels.pond).toBeLessThan(SITE.weir.crestY + 0.02);
      expect(mod.levels.tail).toBeCloseTo(SITE.tailY, 9);
      // the pond is above the downstream water by the height of the weir; the canal is at the level of the pond
      expect(mod.levels.pond - mod.levels.tail).toBeGreaterThan(1.5);
      expect(mod.levels.canalUp).toBeCloseTo(mod.levels.pond, 2);
      expect(mod.levels.gate).toBe(1);
    });

    it('raises the pond with the flow over the weir (Q = C w H^3/2) and the tailwater with the flood', () => {
      for (const q of [0.5, 1.2, 1.7]) {
        go({ bypassFlow: q, stopped: 'closed', flow: 0 });
        expect(mod.levels.pond).toBeCloseTo(SITE.weir.crestY + weirHead(q), 9);
      }
      const w = SITE.fishPass.z - SITE.river.zNorth - SITE.notch.width;
      expect(SITE.weirCoeff * w * Math.pow(weirHead(1), 1.5)).toBeCloseTo(1, 9);
      for (const rise of [0, 0.4, 1.2, 1.5]) {
        go({ tailRise: rise });
        expect(mod.levels.tail).toBeCloseTo(SITE.tailY + rise, 9);
      }
    });

    it('draws the sheets of the water at those levels: the river, the pond, the canal, the tailrace, the pools of the fish pass step down', () => {
      go({ bypassFlow: 0.9, stopped: 'no', tailRise: 0.5 });
      const l = mod.levels;
      // read the heights off the meshes that are drawn
      const heightOf = (name: string) => {
        let y = NaN;
        mod.scene.traverse((o) => {
          if (o.name === name) y = (o as THREE.Mesh).geometry.attributes.position.getY(1);
        });
        return y;
      };
      expect(heightOf('river-up')).toBeCloseTo(l.pond, 6);
      expect(heightOf('river-down')).toBeCloseTo(l.tail, 6);
      expect(heightOf('tail-run')).toBeCloseTo(l.tail, 6);
      expect(heightOf('canal-mouth')).toBeCloseTo(l.pond, 6);
      expect(heightOf('canal-above-gate')).toBeCloseTo(l.canalUp, 6);
      const pools = [0, 1, 2, 3, 4].map((i) => heightOf(`pass-pool-${i}`));
      for (let i = 1; i < pools.length; i++) expect(pools[i]).toBeLessThan(pools[i - 1]);
      expect(pools[0]).toBeLessThanOrEqual(l.pond);
      expect(pools[4]).toBeGreaterThanOrEqual(l.tail);
    });

    it('lowers the canal across a clogged rack, and shows the debris in proportion to the clogging the simulation computes', () => {
      for (const b of [0, 0.3, 0.6, 0.9]) {
        const loss = rackHeadLoss(true, b);
        expect(rackBlocked(loss)).toBeCloseTo(b, 6);
      }
      expect(rackBlocked(0)).toBe(0);
      expect(rackBlocked(RACK_CLEAN_LOSS)).toBe(0);
      go({ rackLoss: 0 });
      const clean = mod.drawn.debris;
      expect(clean).toBe(0);
      expect(mod.levels.canalUp).toBeCloseTo(mod.levels.pond, 6);
      let prev = 0;
      for (const b of [0.3, 0.6, 0.9]) {
        go({ rackLoss: rackHeadLoss(true, b) });
        expect(mod.drawn.debris).toBeGreaterThan(prev);
        prev = mod.drawn.debris;
        // a visible drop across the rack, never more than the cap of the picture
        const drop = mod.levels.pond - mod.levels.canalUp;
        expect(drop).toBeLessThanOrEqual(SITE.rackDropMax + 1e-9);
        expect(drop).toBeCloseTo(Math.min(SITE.rackDropMax, rackHeadLoss(true, b) - RACK_CLEAN_LOSS), 6);
      }
      go({ rackLoss: 0 });
    });

    it('closes the head gate and lets the canal below it fall when the machine is stopped for low water, a flood or a closed gate; the gate moves to the level of the state', () => {
      const plate = () => {
        let y = NaN;
        reg.get('intake-gate')!.object.traverse((o) => {
          if (o.name === 'gate-plate') y = o.position.y;
        });
        return y;
      };
      go({ stopped: 'no' });
      const open = plate();
      expect(mod.levels.gate).toBe(1);
      for (const st of ['closed', 'flood', 'lowWater'] as const) {
        go({ stopped: st, flow: 0, fill: 0 });
        expect(mod.levels.gate, st).toBe(0);
        expect(plate(), st).toBeLessThan(open);
        expect(mod.levels.canalEnd, st).toBeCloseTo(SITE.deadCanalY, 9);
      }
      go({ stopped: 'noStart', omega: 0 });
      expect(mod.levels.gate).toBe(1);
      // the plate moves smoothly (it is damped, not jumped)
      go({ stopped: 'closed', flow: 0 });
      mod.update(stateWith({ stopped: 'no' }), 0.05, view({ time: 99 }));
      expect(mod.levels.gate).toBeGreaterThan(0);
      expect(mod.levels.gate).toBeLessThan(1);
      go();
    });

    it('lowers the end of the canal with the buckets: a half empty screw draws the pool down', () => {
      go({ fill: 1 });
      const full = mod.levels.canalEnd;
      go({ fill: 0.5 });
      expect(mod.levels.canalEnd).toBeLessThan(full);
      expect(full).toBeLessThanOrEqual(mod.levels.canalUp + 1e-9);
    });

    it('runs the streaks at the speed of the flow: the canal at 0.8 m/s for the design flow, nothing when the machine takes no water', () => {
      const phase = (name: string) => {
        let tex: THREE.Texture | undefined;
        mod.scene.traverse((o) => {
          if (o.name === name) tex = ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).map ?? undefined;
        });
        return tex!.offset.x;
      };
      go({ flow: DESIGN.flow, stopped: 'no' }, {}, 1);
      const a = phase('canal-below-gate');
      mod.update(stateWith({ flow: DESIGN.flow, stopped: 'no' }), 1, view({ time: 80 }));
      const moved = (phase('canal-below-gate') - a + 1) % 1;
      expect(moved * 5).toBeCloseTo(0.8, 1); // one second, tiles of 5 m
      const b = phase('canal-below-gate');
      mod.update(stateWith({ flow: 0, stopped: 'closed' }), 1, view({ time: 81 }));
      expect(phase('canal-below-gate')).toBeCloseTo(b, 9);
    });
  });

  describe('the screw in its chamber', () => {
    it('turns with the angle, carries water when there is some, and stands in the old pit between the canal and the tailrace', () => {
      go({ angle: 1, fill: 1 });
      const ch = mod.chamber();
      const rot0 = ch.rot.rotation.x;
      expect(ch.pockets.visible).toBe(true);
      mod.update({ ...stateWith({ fill: 1 }), angle: 1.05 }, 1 / 60, view({ time: 120 }));
      expect(ch.rot.rotation.x - rot0).toBeCloseTo(0.05, 9);
      go({ fill: 0 });
      expect(ch.pockets.visible).toBe(false);
      // the screw's axis at the upper end is at the level of the water in the canal (half immersed), the lower end at the tail
      const l = ch.layout;
      const top = ch.origin.y + l.L * l.sinB;
      expect(Math.abs(top - SITE.weir.crestY)).toBeLessThan(0.25);
      expect(ch.origin.y - l.Rt * l.cosB + 0.6 * l.shape.outerDiameter * l.cosB).toBeCloseTo(SITE.tailY, 9);
      // the screw lies in the pit: along X, between the chamber's two ends
      expect(ch.origin.x).toBeGreaterThan(SITE.chamber.xWest);
      expect(ch.origin.x + l.L * l.cosB).toBeLessThan(SITE.chamber.xEast);
      expect(ch.origin.z).toBeCloseTo((SITE.canal.zNorth + SITE.canal.zSouth) / 2, 9);
    });

    it('fills the pools of the chamber: the basin at the canal level, the pool at the tail level', () => {
      go({ fill: 1, tailRise: 0.6 });
      const ch = mod.chamber();
      const top = (poly: [number, number][]) => Math.max(...poly.map((p) => p[1]));
      expect(top(ch.pool.poly)).toBeCloseTo(SITE.tailY + 0.6, 9);
      expect(top(ch.basin.poly)).toBeCloseTo(mod.levels.canalEnd, 9);
      go({ stopped: 'closed', flow: 0, fill: 0 });
      expect(top(ch.basin.poly)).toBeCloseTo(SITE.deadCanalY, 6);
    });

    it('redraws the screw at the size of the state and leaves it alone in a wheel scenario', () => {
      const before = mod.drawn.rebuilds;
      const big = stateWith({}, { head: 3, designFlow: 2.2 });
      mod.update(big, 1 / 60, view({ time: 700 }));
      mod.scene.updateMatrixWorld(true);
      expect(mod.drawn.rebuilds).toBe(before + 1);
      expect(mod.chamber().layout.shape.outerDiameter).toBeCloseTo(big.outerDiameter, 9);
      expect([...reg.ids()].sort()).toEqual([...IDS].sort());
      expect(reg.get('water-chamber')!.meshes.length).toBeGreaterThan(0);
      const n = mod.drawn.rebuilds;
      const wheel = stateWith({}, { machine: 'overshot' });
      mod.update(wheel, 1 / 60, view({ time: 710 }));
      expect(mod.drawn.rebuilds).toBe(n);
      expect(mod.chamber().pockets.visible).toBe(false);
      mod.update(stateWith({}), 1 / 60, view({ time: 720 }));
      expect(mod.chamber().layout.shape.outerDiameter).toBeCloseTo(DESIGN_SHAPE.outerDiameter, 9);
    });
  });

  it('lights the lamp of the house, its windows and the lamp of the inverter when the battery charges, and puts them out otherwise', () => {
    go({ charging: true, electricPower: 2200 });
    expect(mod.lamp.bulb.emissiveIntensity).toBeGreaterThan(1);
    expect(mod.lamp.panes.emissiveIntensity).toBeGreaterThan(0.8);
    expect(mod.lamp.light.intensity).toBeGreaterThan(5);
    expect(mod.powerLed.emissiveIntensity).toBeGreaterThan(1);
    const bright = mod.lamp.light.intensity;
    go({ charging: true, electricPower: 150 });
    expect(mod.lamp.light.intensity).toBeLessThan(bright);
    go({ charging: false, electricPower: 0 });
    expect(mod.lamp.bulb.emissiveIntensity).toBe(0);
    expect(mod.lamp.panes.emissiveIntensity).toBe(0);
    expect(mod.lamp.light.intensity).toBe(0);
    expect(mod.powerLed.emissiveIntensity).toBe(0);
  });

  it('puts the sun where the clock says: up at noon, down at midnight, higher in summer', () => {
    const noon = sunDirection(13.9, 273);
    const night = sunDirection(1, 273);
    expect(noon.y).toBeGreaterThan(0.5);
    expect(night.y).toBeLessThan(0);
    expect(sunDirection(13.9, 172).y).toBeGreaterThan(sunDirection(13.9, 355).y + 0.3);
    // the sun is in the south at noon in the northern hemisphere: +Z is south
    expect(noon.z).toBeGreaterThan(0);
    go({ hour: 2, day: 273 });
    expect(mod.sun.intensity).toBeLessThan(1.5);
    go({ hour: 13, day: 273 });
    expect(mod.sun.intensity).toBeGreaterThan(2);
  });

  it('moves the dots in proportion to the flow and to the current, and only in the Flux view', () => {
    go({}, { schematic: false });
    expect(mod.flows.water.object.visible).toBe(false);
    expect(mod.flows.current.object.visible).toBe(false);
    const first = (f: typeof mod.flows.water, i = 80) =>
      new THREE.Vector3().fromBufferAttribute(f.object.geometry.attributes.position as THREE.BufferAttribute, i);
    const move = (over: object) => {
      const s = stateWith(over);
      mod.update(s, 1 / 60, view({ schematic: true, time: 900 }));
      const a = first(mod.flows.current, 20);
      const w = first(mod.flows.water);
      mod.update(s, 0.05, view({ schematic: true, time: 901 }));
      return [a.distanceTo(first(mod.flows.current, 20)), w.distanceTo(first(mod.flows.water))] as const;
    };
    const [c10] = move({ current: 10 });
    const [c20, w] = move({ current: 20 });
    expect(mod.flows.water.object.visible).toBe(true);
    expect(c20 / c10).toBeCloseTo(2, 1);
    expect(w).toBeGreaterThan(0.005);
    expect(move({ current: 0 })[0]).toBeCloseTo(0, 9);
    go({}, { schematic: false });
  });

  it('explodes every part by its own height and puts it back', () => {
    go();
    reg.setAllFactors(0);
    const before = sceneBoxes(mod);
    for (const id of IDS) expect(reg.get(id)!.explode.length(), id).toBeGreaterThan(0);
    reg.setAllFactors(1);
    go({}, {}, 1);
    const after = sceneBoxes(mod);
    reg.setAllFactors(0);
    for (const id of IDS) expect(after.get(id)!.min.y - before.get(id)!.min.y, id).toBeCloseTo(EXPLODE[id][1], 3);
    go();
  });

  it('isolates and ghosts every part without a NaN, and animates the whole range of the state', () => {
    for (const id of IDS)
      for (const mode of ['hidden', 'ghost'] as const) {
        isolateOne(reg, id, mode);
        go({});
        expect(reg.get(id)!.meshes.every((m) => m.visible)).toBe(true);
        expect(finiteTree(mod.scene)).toBe(true);
      }
    reg.setAllDisplay('solid');
    const cases: [object, object][] = [
      [{}, {}],
      [{}, { riverFlow: 1.9 }],
      [{}, { riverFlow: 0.03 }],
      [{}, { gateOpen: false }],
      [{}, { trashRack: true, debris: 0.95 }],
      [{}, { head: 0.3, designFlow: 0.01 }],
      [{}, { head: 6, designFlow: 5 }],
      [{}, { machine: 'undershot' }],
      [{ hour: 0, day: 0 }, {}],
      [{ hour: 23.9, day: 364.9, tailRise: 1.5, bypassFlow: 8, rackLoss: 3 }, {}],
      [{ tailRise: -0.3, fill: 0, omega: 0, charging: false, electricPower: 0 }, {}],
    ];
    for (const [over, params] of cases)
      for (const v of [{}, { schematic: true }]) {
        mod.settle();
        const s = stateWith(over, params);
        for (let i = 0; i < 3; i++)
          mod.update(
            { ...s, angle: (s.angle + i * 0.3) % (2 * Math.PI) },
            1 / 60,
            view({ time: 2000 + i + Math.random(), ...v }),
          );
        mod.scene.updateMatrixWorld(true);
        expect(finiteTree(mod.scene), JSON.stringify([over, params, v])).toBe(true);
        for (const id of IDS) {
          const b = reg.bounds(id);
          expect(Number.isFinite(b.min.x) && Number.isFinite(b.max.y) && Number.isFinite(b.max.z), id).toBe(true);
        }
      }
    go();
  });

  it('stays within the budget of a landscape: at most 300 draw calls and 250,000 triangles once merged', () => {
    go({}, { schematic: true });
    const st = drawStats(mod.scene);
    // eslint-disable-next-line no-console
    console.log(`site: ${st.calls} draw calls, ${Math.round(st.triangles)} triangles`);
    expect(st.calls).toBeLessThanOrEqual(300);
    expect(st.triangles).toBeLessThanOrEqual(250000);
  });
});
