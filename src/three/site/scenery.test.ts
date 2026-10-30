import * as THREE from 'three';
import { GHOST } from '@onigam/lab-kit/three';
import { describe, expect, it } from 'vitest';
import { partIds } from '../../part-ids';
import { SCENERY, SITE } from '../dims';
import { drawStats, sceneBoxes, stateWith, view } from '../test-utils';
import { WIND, sceneryTextures, textureStats } from './materials';
import { createSiteScene } from './scene';
import {
  OPENINGS,
  PADS,
  TRACKS,
  buildTerrain,
  insideOpening,
  terrainHeight,
  trackMask,
  waterDistance,
  yardMask,
} from './terrain';
import { buildBridges } from './props';
import { buildVegetation, homeCorridorDistance, planVegetation, type Inst } from './vegetation';

// The scenery of the `site` world by script: the land (flat where the structures stand, the openings of the water cut out of it, banks that slope down
// to a lip over the highest water level, no edge of the world), the plants (standing on the land, outside the water, off the structures, clear of the home
// view), the buildings (same bounds and ids, materials the kit can drive), the wind, the sky and the budget.

const G = SITE.groundY;
const WATER = [OPENINGS.river, OPENINGS.run, OPENINGS.turn, OPENINGS.mouth];

/** The bounds the three buildings had as plain boxes (site frame): the labels and the framing depend on them. */
const BOUNDS: Record<string, number[]> = {
  'mill-building': [-23.9, 0.5, -15.25, -11.65, 10.22, -7.55],
  powerhouse: [-6.25, 0.55, -12.651, -2.95, 3.282, -9.749],
  'house-load': [1.6, 0.5, -25.05, 10.4, 6.6, -18.763],
};

describe('scenery of the site world', () => {
  const t0 = performance.now();
  const mod = createSiteScene();
  const buildMs = performance.now() - t0;
  const reg = mod.registry;
  const go = (over = {}, v = {}, params = {}) => {
    mod.settle();
    const s = stateWith(over, params);
    for (let i = 0; i < 2; i++) mod.update(s, 1 / 60, view({ time: 10 + i, ...v }));
    mod.scene.updateMatrixWorld(true);
    return s;
  };
  const child = (name: string) => mod.scene.children.find((c) => c.name === name)!;

  describe('the land', () => {
    const terrain = buildTerrain();
    const geo = terrain.land.geometry;
    const pos = geo.attributes.position;
    const index = geo.index!;

    it('is flat at groundY where the buildings, the yard, the poles and the footbridge stand, and along the lined walls', () => {
      for (const p of PADS)
        for (let i = 0; i <= 8; i++)
          for (let j = 0; j <= 8; j++) {
            const x = p.x0 + ((p.x1 - p.x0) * i) / 8;
            const z = p.z0 + ((p.z1 - p.z0) * j) / 8;
            expect(terrainHeight(x, z), `${x},${z}`).toBeCloseTo(G, 6);
          }
      // the footbridge (x 2.4 to 3.6), the poles (around the powerhouse and the house)
      for (const [x, z] of [
        [3, -8.4],
        [3, -3.7],
      ])
        expect(terrainHeight(x, z), `${x},${z}`).toBeCloseTo(G, 3);
      for (const [x, z] of [
        [2.8, -15.2],
        [8.8, -18.7],
        [-1, -21.4],
      ])
        expect(Math.abs(terrainHeight(x, z) - G), `${x},${z}`).toBeLessThan(0.01); // (the poles stand 20 cm in the ground)
      // a metre from the lined walls of the canal, the chamber and the tailrace the land is at the top of the lining
      for (const x of [-30, -20, -5, 5, 15]) expect(terrainHeight(x, SITE.canal.zNorth - 0.4)).toBeCloseTo(G, 3);
      // (the strip between the canal and the river starts its slope to the river a few centimetres under the lining)
      for (const x of [-30, -5, 10]) expect(Math.abs(terrainHeight(x, SITE.canal.zSouth + 0.4) - G)).toBeLessThan(0.02);
    });

    it('leaves exactly the openings of the water: no triangle of the land is inside one, no vertex either', () => {
      let tris = 0;
      for (let t = 0; t < index.count; t += 3) {
        let cx = 0;
        let cz = 0;
        for (let k = 0; k < 3; k++) {
          const v = index.getX(t + k);
          cx += pos.getX(v) / 3;
          cz += pos.getZ(v) / 3;
          expect(insideOpening(pos.getX(v), pos.getZ(v), 0.002), `vertex ${v}`).toBe(false);
        }
        if (insideOpening(cx, cz, 0.002))
          throw new Error(`a triangle of the land is inside an opening at ${cx}, ${cz}`);
        tris++;
      }
      expect(tris).toBeGreaterThan(20000);
      // and the openings are the rectangles of the dims
      expect(OPENINGS.river).toMatchObject({
        x0: SITE.river.xWest,
        x1: SITE.river.xEast,
        z0: SITE.river.zNorth,
        z1: SITE.river.zSouth,
      });
      expect(OPENINGS.run).toMatchObject({
        x0: SITE.tailrace.xEnd,
        x1: SITE.canal.xMax,
        z0: SITE.canal.zNorth,
        z1: SITE.canal.zSouth,
      });
      expect(OPENINGS.quay).toMatchObject({ x0: SITE.chamber.xWest, x1: SITE.chamber.xEast });
    });

    it('slopes the banks of the river down to a lip that stays over the highest water level of the reach, and never above the meadow', () => {
      expect(SCENERY.lip.pondY).toBeGreaterThan(SITE.weir.crestY);
      expect(SCENERY.lip.tailY).toBeGreaterThan(SITE.tailY + 1.2); // a flood rises 1.2 m over the tailwater
      const edge = 0.001;
      // north bank above the weir (x = 40), north bank below it (x = -60), south bank both sides
      const transect = (x: number, z0: number, z1: number) => {
        const out: number[] = [];
        for (let i = 0; i <= 24; i++) out.push(terrainHeight(x, z0 + ((z1 - z0) * i) / 24));
        return out;
      };
      for (const [x, from, to, lip] of [
        [40, -6, -edge, SCENERY.lip.pondY],
        [-60, -6, -edge, SCENERY.lip.tailY],
        [70, 12 + edge, 18, SCENERY.lip.pondY],
        [-70, 12 + edge, 18, SCENERY.lip.tailY],
      ] as const) {
        const h = transect(x, from, to);
        const down = from < 0 ? h : [...h].reverse(); // from the meadow to the water
        for (let i = 1; i < down.length; i++)
          expect(down[i], `x=${x} step ${i}`).toBeLessThanOrEqual(down[i - 1] + 0.02); // (the meadow undulates by a few centimetres)
        expect(Math.abs(down[down.length - 1] - lip)).toBeLessThan(0.01);
        expect(Math.max(...h)).toBeLessThan(G + 0.35);
      }
      // the water never rises over the lip at the design levels
      expect(SCENERY.lip.pondY).toBeGreaterThan(SCENERY.design.pondY);
      expect(SCENERY.lip.tailY).toBeGreaterThan(SCENERY.design.tailY);
    });

    it('has no edge of the world: the land and the fog reach past the horizon, hills stand at the rim, and the river goes on', () => {
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      expect(bb.min.x).toBeLessThanOrEqual(-SCENERY.extent * 0.99);
      expect(bb.max.x).toBeGreaterThanOrEqual(SCENERY.extent * 0.99);
      expect(bb.min.z).toBeLessThanOrEqual(-SCENERY.extent * 0.99);
      expect(bb.max.z).toBeGreaterThanOrEqual(SCENERY.extent * 0.99);
      const fog = mod.scene.fog as THREE.FogExp2;
      expect(fog.density).toBeCloseTo(SCENERY.fogDensity, 9);
      // what is left of the ground colour at the rim (a thousandth), and at the far views' distance (the world stays readable)
      expect(Math.exp(-((fog.density * SCENERY.extent) ** 2))).toBeLessThan(0.01);
      expect(Math.exp(-((fog.density * 220) ** 2))).toBeGreaterThan(0.9);
      // hills: the land rises a long way over the meadow towards the horizon
      let hill = 0;
      for (let a = 0; a < 360; a += 15)
        hill = Math.max(
          hill,
          terrainHeight(Math.cos((a * Math.PI) / 180) * 1500, Math.sin((a * Math.PI) / 180) * 1500),
        );
      expect(hill).toBeGreaterThan(60);
      // the river is not cut off at x = ±160: two ribbons of water go on under the road bridges
      const ribbons = terrain.group.getObjectByName('far-river') as THREE.Mesh;
      expect(ribbons).toBeTruthy();
      const rb = new THREE.Box3().setFromObject(ribbons);
      expect(rb.max.x).toBeGreaterThan(1000);
      expect(rb.min.x).toBeLessThan(-1000);
    });

    it('paints the tracks from the house door to the footbridge and the mill yard, and the gravel yards', () => {
      expect(TRACKS.length).toBeGreaterThanOrEqual(4);
      expect(trackMask(3.2, -17)).toBeGreaterThan(0.9); // the door of the house
      expect(trackMask(3.0, -8.6)).toBeGreaterThan(0.9); // at the footbridge
      expect(trackMask(-6, -9.05)).toBeGreaterThan(0.9); // along the canal to the mill
      expect(trackMask(20, -30)).toBe(0);
      expect(yardMask(-10, -11)).toBeGreaterThan(0.9);
      expect(yardMask(30, -40)).toBe(0);
    });
  });

  describe('the plants', () => {
    const plan = planVegetation();
    const all: [string, Inst[]][] = [
      ['willows', plan.willows],
      ['poplars', plan.poplars],
      ['oaks', plan.oaks],
      ['conifers', plan.conifers],
      ['forest', plan.forest],
      ['shrubs', plan.shrubs],
      ['reeds', plan.reeds],
      ['tufts', plan.tufts],
      ['flowers', plan.flowers],
      ['rocks', plan.rocks],
    ];

    it('has several species of trees, shrubs, reeds, tufts, flowers and rocks', () => {
      for (const [name, list] of all) expect(list.length, name).toBeGreaterThan(4);
      expect(plan.willows.length + plan.poplars.length + plan.oaks.length + plan.conifers.length).toBeGreaterThan(60);
    });

    it('stands every plant on the land, outside the openings of the water, off the buildings, the tracks and the yards', () => {
      for (const [name, list] of all)
        for (const p of list) {
          expect(p.y, `${name} on the land`).toBeCloseTo(terrainHeight(p.x, p.z), 6);
          expect(waterDistance(p.x, p.z), `${name} ${p.x},${p.z} out of the water`).toBeGreaterThan(0.2);
          expect(insideOpening(p.x, p.z), `${name} ${p.x},${p.z} inside an opening`).toBe(false);
          for (const r of PADS) {
            const d = Math.hypot(Math.max(r.x0 - p.x, 0, p.x - r.x1), Math.max(r.z0 - p.z, 0, p.z - r.z1));
            if (name !== 'tufts' && name !== 'flowers' && name !== 'forest')
              expect(d, `${name} ${p.x},${p.z} on a pad`).toBeGreaterThan(0.1);
          }
          if (name === 'tufts' || name === 'flowers') expect(yardMask(p.x, p.z), name).toBeLessThan(0.05);
        }
      for (const p of [...plan.willows, ...plan.poplars, ...plan.oaks, ...plan.conifers]) {
        for (const [x, z] of [
          [SITE.mill.x, SITE.mill.z],
          [SITE.house.x, SITE.house.z],
        ])
          expect(Math.hypot(p.x - x, p.z - z), 'no tree in the walls').toBeGreaterThan(6);
      }
    });

    it('keeps the tall plants out of the corridor of the home view, so that the labels stay readable', () => {
      for (const p of [...plan.willows, ...plan.poplars, ...plan.oaks, ...plan.conifers])
        expect(homeCorridorDistance(p.x, p.z), `${p.x},${p.z}`).toBeGreaterThan(SCENERY.homeCorridor);
      for (const p of plan.shrubs) expect(homeCorridorDistance(p.x, p.z)).toBeGreaterThan(SCENERY.homeCorridor * 0.6);
    });

    it('is instanced and cheap: a few draw calls, a modest number of triangles, a wind that follows one clock', () => {
      const veg = buildVegetation(plan);
      const st = drawStats(veg.group);
      // eslint-disable-next-line no-console
      console.log(
        `vegetation: ${st.calls} draw calls, ${Math.round(st.triangles)} triangles, ${veg.meshes.length} instanced meshes`,
      );
      expect(veg.meshes.every((m) => (m as THREE.InstancedMesh).isInstancedMesh)).toBe(true);
      expect(st.calls).toBeLessThanOrEqual(25);
      expect(st.triangles).toBeLessThanOrEqual(90000);
      for (const m of veg.meshes) expect(m.geometry.attributes.aSway, m.name).toBeTruthy();
      go({}, { time: 12.5 });
      expect(WIND.time.value).toBe(12.5);
    });
  });

  describe('the buildings', () => {
    it('keep their part ids and their bounds (the labels and the framing depend on them)', () => {
      go();
      reg.setAllFactors(0);
      const b = sceneBoxes(mod);
      for (const id of Object.keys(BOUNDS)) {
        expect(partIds('site')).toContain(id);
        const box = b.get(id)!;
        const got = [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z];
        got.forEach((v, i) => expect(Math.abs(v - BOUNDS[id][i]), `${id}[${i}]`).toBeLessThan(0.16));
      }
    });

    it('stay plain standard materials the kit can drive (maps are fine): ghost, X-ray and isolate swap them and give them back', () => {
      for (const id of Object.keys(BOUNDS)) {
        const e = reg.get(id)!;
        expect(e.meshes.length, id).toBeGreaterThan(2);
        for (const m of e.meshes) {
          const mat = m.userData.solidMaterial as THREE.Material;
          expect(mat.type, `${id} ${m.name}`).toBe('MeshStandardMaterial');
        }
        expect(
          e.meshes.some((m) => (m.userData.solidMaterial as THREE.MeshStandardMaterial).map),
          `${id} has maps`,
        ).toBe(true);
        reg.setDisplay(id, 'ghost');
        expect(e.meshes.every((m) => m.material === GHOST)).toBe(true);
        reg.setDisplay(id, 'hidden');
        expect(e.meshes.every((m) => !m.visible)).toBe(true);
        reg.setDisplay(id, 'solid');
        expect(e.meshes.every((m) => m.visible && m.material === m.userData.solidMaterial)).toBe(true);
      }
    });

    it('keep the windows of the house lit when it is dark (the lamp follows the electricity and the hour)', () => {
      go({ charging: true, electricPower: 2200, hour: 22 });
      const house = reg.get('house-load')!;
      expect(house.meshes.some((m) => m.userData.solidMaterial === mod.lamp.panes)).toBe(true);
      expect(mod.lamp.panes.emissiveIntensity).toBeGreaterThan(0.8);
      expect(mod.lamp.bulb.emissiveIntensity).toBeGreaterThan(1);
      expect(mod.sun.intensity).toBeLessThan(1.5);
      go({ charging: false, electricPower: 0, hour: 12 });
      expect(mod.lamp.panes.emissiveIntensity).toBe(0);
    });

    it('give the masonry that holds the water a stone material, through the materials only', () => {
      for (const id of ['weir', 'headrace', 'tailrace', 'water-chamber', 'intake-gate', 'fish-pass']) {
        const mats = reg.get(id)!.meshes.map((m) => m.userData.solidMaterial as THREE.MeshStandardMaterial);
        expect(
          mats.some((m) => m.map && m.type === 'MeshStandardMaterial'),
          id,
        ).toBe(true);
      }
    });
  });

  describe('the props and the sky', () => {
    it('has the road bridges of the far river: decks well over the water, at both ends of the dims', () => {
      const bridges = buildBridges();
      bridges.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(bridges);
      expect(box.min.x).toBeLessThan(-SCENERY.farRiver.bridgeX + 3);
      expect(box.max.x).toBeGreaterThan(SCENERY.farRiver.bridgeX - 3);
      // nothing of a bridge is in the water: the underside is more than a metre over the crest where it spans the river
      bridges.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
          if (Math.abs(v.x) <= 160 && v.z > 0 && v.z < 12) expect(v.y).toBeGreaterThan(SITE.weir.crestY + 1);
        }
      });
    });

    it('puts nothing of the props inside a water opening below the highest water of the picture (the footbridge is over the canal)', () => {
      const props = child('props');
      props.updateMatrixWorld(true);
      props.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh) return;
        const p = m.geometry.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < p.count; i += 1) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
          if (WATER.some((r) => v.x > r.x0 + 0.01 && v.x < r.x1 - 0.01 && v.z > r.z0 + 0.01 && v.z < r.z1 - 0.01))
            expect(v.y, `${m.name} ${v.x.toFixed(2)},${v.z.toFixed(2)}`).toBeGreaterThan(SITE.weir.crestY + 0.35);
        }
      });
    });

    it('keeps the day sky, adds clouds and softer shadows, and fades the far world into the haze', () => {
      go({ hour: 12 });
      const sky = mod.scene.getObjectByName('sky') as THREE.Mesh;
      const u = (sky.material as THREE.ShaderMaterial).uniforms;
      expect(u.cloudCoverage.value).toBeGreaterThan(0.2);
      expect(mod.sun.shadow.radius).toBeGreaterThan(1.5);
      expect(mod.sun.shadow.intensity).toBeLessThan(1);
      const day = (mod.scene.fog as THREE.FogExp2).color.clone();
      go({ hour: 1 });
      const night = (mod.scene.fog as THREE.FogExp2).color.clone();
      expect(day.getHex()).not.toBe(night.getHex());
      expect(day.r + day.g + day.b).toBeGreaterThan((night.r + night.g + night.b) * 3);
      go({ hour: 12 });
    });
  });

  describe('the budget (the numbers are logged)', () => {
    it('keeps the procedural textures small: none over 1024², under 24 MB together, generated at start-up', () => {
      sceneryTextures();
      const st = textureStats();
      // eslint-disable-next-line no-console
      console.log(
        `scenery textures: ${st.count} maps, largest ${st.maxSide}², ${(st.bytes / 1048576).toFixed(1)} MB, ${Math.round(st.ms)} ms`,
      );
      expect(st.maxSide).toBeLessThanOrEqual(1024);
      expect(st.bytes).toBeLessThanOrEqual(24 * 1048576);
      expect(st.count).toBeGreaterThan(10);
    });

    it('draws the scenery in at most 110 draw calls and 280,000 triangles, and builds the world in a few hundred milliseconds', () => {
      go({}, { schematic: true });
      const parts = new Set(['ground', 'vegetation', 'props', 'bridges', 'sky']);
      let calls = 0;
      let triangles = 0;
      for (const c of mod.scene.children) {
        if (parts.has(c.name)) {
          const s = drawStats(c);
          calls += s.calls;
          triangles += s.triangles;
        }
      }
      for (const id of ['mill-building', 'powerhouse', 'house-load']) {
        const s = drawStats(reg.get(id)!.object);
        calls += s.calls;
        triangles += s.triangles;
      }
      const total = drawStats(mod.scene);
      // eslint-disable-next-line no-console
      console.log(
        `scenery: ${calls} draw calls, ${Math.round(triangles)} triangles; the whole site: ${total.calls} draw calls, ${Math.round(total.triangles)} triangles; first build ${Math.round(buildMs)} ms`,
      );
      expect(calls).toBeLessThanOrEqual(110);
      expect(triangles).toBeLessThanOrEqual(280000);
      expect(buildMs).toBeLessThan(2500);
    });
  });
});
