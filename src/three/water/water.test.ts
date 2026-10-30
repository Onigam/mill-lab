import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { G } from '../../sim/machine';
import { DESIGN, SITE, WATER_FX } from '../dims';
import { drawStats, finiteTree, stateWith, view } from '../test-utils';
import { createScrewScene } from '../screw/scene';
import { screwFlows } from '../screw/water';
import { createSiteScene, weirHead } from '../site/scene';
import { WaterBody, gridLines } from './body';
import { waterKit } from './kit';
import { Nappes } from './nappe';
import { NOISE_SIZE, noiseBytes, noiseFields, waterNoise } from './noise';
import {
  FREE_CREST,
  canalSpeed,
  headOver,
  lowWaterOf,
  murkOf,
  riverSpeed,
  toeFoam,
  unitDischarge,
  waveAmplitude,
} from './look';
import { Spray } from './spray';
import { createWaterMaterial, makeShared, waterOf } from './surface';

// The water: the noise texture, the grid sheets, the nappe, the spray, the look as a function of the state, and what the two worlds draw from it.
// Nothing here needs a GL context: the patch of the shaders is checked on the source of three's own program.

describe('the noise texture', () => {
  it('is a tileable 256 x 256 RGBA8 field of data, generated the same way every time, small on the card', () => {
    const t = waterNoise();
    expect(t.image.width).toBe(NOISE_SIZE);
    expect(t.image.height).toBe(NOISE_SIZE);
    expect(t.wrapS).toBe(THREE.RepeatWrapping);
    expect(t.colorSpace).toBe(THREE.NoColorSpace);
    expect((t.image.data as Uint8Array).length).toBe(NOISE_SIZE * NOISE_SIZE * 4);
    expect(Array.from((waterNoise().image.data as Uint8Array).slice(0, 64))).toEqual(
      Array.from((t.image.data as Uint8Array).slice(0, 64)),
    );
    expect(noiseBytes()).toBeLessThan(0.5 * 1024 * 1024);
  });

  it('wraps without a seam: the slope field has no jump from one edge to the other', () => {
    const { N, gx, gy } = noiseFields();
    let worst = 0;
    let typical = 0;
    for (let j = 0; j < N; j++) {
      worst = Math.max(worst, Math.abs(gx[j * N] - gx[j * N + N - 1]), Math.abs(gy[j] - gy[(N - 1) * N + j]));
      typical += Math.abs(gx[j * N + 1] - gx[j * N]);
    }
    expect(worst).toBeLessThan((6 * typical) / N + 0.05);
  });
});

describe('the grid of a sheet', () => {
  it('runs from end to end, refines inside its zones and never goes back', () => {
    const xs = gridLines(0, 40, [[10, 12, 0.25]], 8);
    expect(xs[0]).toBe(0);
    expect(xs[xs.length - 1]).toBe(40);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    const inside = xs.filter((x) => x > 10 && x < 12);
    expect(inside.length).toBeGreaterThanOrEqual(7);
    expect(Math.max(...xs.slice(1).map((x, i) => x - xs[i]))).toBeLessThanOrEqual(8 + 1e-9);
  });

  it('keeps its positions flat on the CPU (the standing waves are lifted in the shader), writes the level, the ramp and the foam channels', () => {
    const kit = waterKit();
    const b = new WaterBody(0, 10, 0, 4, kit.surface(), 'sheet', {
      xs: gridLines(0, 10, [[8, 10, 0.2]], 3),
      zs: gridLines(0, 4, [], 1),
    });
    b.set(1.5, 1.0);
    const pos = b.mesh.geometry.attributes.position;
    expect(pos.getY(0)).toBeCloseTo(1.0, 6);
    expect(pos.getY(pos.count - 1)).toBeCloseTo(1.5, 6);
    // a ramp of 0.5 m over 1 m at the east end lifts the end by exactly the drop
    b.set(1, 1, { len: 1, drop: 0.5 });
    expect(pos.getY(pos.count - 1)).toBeCloseTo(1.5, 6);
    expect(pos.getY(1)).toBeCloseTo(1, 6);
    b.paint(2, (x) => (x > 9 ? 1 : 0));
    const foam = b.mesh.geometry.attributes.aFoam;
    expect(foam.getZ(foam.count - 1)).toBe(1);
    expect(foam.getZ(0)).toBe(0);
    expect(b.mesh.geometry.boundingBox!.max.y).toBeCloseTo(1.5, 6);
  });
});

describe('the water material', () => {
  const kit = waterKit();
  const shaderOf = () => ({
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  });

  it('is a MeshStandardMaterial that the kit can drive (opacity, transparent, side, clipping planes), with a handle', () => {
    for (const m of [kit.surface(), kit.surface({ waves: true }), kit.fall(), kit.volume(), kit.cap()]) {
      expect(m).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(m.type).toBe('MeshStandardMaterial');
      expect(m.transparent).toBe(true);
      expect(m.side).toBe(THREE.DoubleSide);
      expect(m.depthWrite).toBe(false);
      expect(waterOf(m)).toBeDefined();
      m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
      m.opacity = 0.3;
      expect(m.opacity).toBe(0.3);
    }
  });

  it('patches the program of three: the ripples of the noise, the foam, the standing waves, the meniscus, the falls', () => {
    for (const [mat, marks] of [
      [kit.surface({ waves: true }), ['waterSource', 'waveH', 'WT1', 'aFoam', 'texture2D( map']],
      [kit.volume(), ['WATER_VOLUME', 'uLevel', 'fwidth']],
      [kit.cap(), ['uLevel', 'fwidth']],
      [kit.fall(), ['discard', 'vUvW']],
    ] as const) {
      const sh = shaderOf();
      (mat.onBeforeCompile as (s: unknown, r: unknown) => void)(sh, {});
      const all = sh.vertexShader + sh.fragmentShader;
      for (const k of marks) expect(all, k).toContain(k);
      // the colour of the texture is not used (it is data), the normal and the albedo are the water's own
      expect(sh.fragmentShader).not.toContain('#include <map_fragment>');
      expect(sh.fragmentShader).not.toContain('#include <normal_fragment_maps>');
      expect(Object.keys(sh.uniforms)).toEqual(expect.arrayContaining(['uPh', 'uDir', 'uTime', 'uMurk', 'uFoamK']));
    }
  });

  it('shares one program per kind, and the clock and the murk of the world between all its materials', () => {
    const a = kit.surface();
    const b = kit.surface();
    expect(a.customProgramCacheKey()).toBe(b.customProgramCacheKey());
    expect(a.customProgramCacheKey()).not.toBe(kit.volume().customProgramCacheKey());
    expect(a.customProgramCacheKey()).not.toBe(kit.surface({ waves: true }).customProgramCacheKey());
    expect(waterOf(a)!.u.uTime).toBe(waterOf(b)!.u.uTime);
    kit.shared.murk.value = 0.7;
    expect(waterOf(b)!.u.uMurk.value).toBe(0.7);
    kit.shared.murk.value = 0;
  });

  it('advects the ripples along the flow at the speed of the surface, and the legacy phase of the first tile at d / 5 m', () => {
    const m = kit.surface();
    const w = waterOf(m)!;
    w.setFlow(-1, 0, 0.8);
    const st = 1 + 0.9 * 0.8;
    w.advance(0.8);
    expect(w.u.uPh.value.x).toBeCloseTo(0.8 / (WATER_FX.tiles[0] * st), 9);
    expect(m.map!.offset.x).toBeCloseTo(0.8 / 5, 9);
    for (let i = 0; i < 1000; i++) w.advance(1.3);
    expect(w.u.uPh.value.x).toBeGreaterThanOrEqual(0);
    expect(w.u.uPh.value.x).toBeLessThan(1);
    expect(w.u.uDir.value.x).toBeCloseTo(-1, 9);
  });

  it('is built from one texture upload: the clones of the noise share their pixels', () => {
    const a = kit.surface().map!;
    const b = kit.surface().map!;
    expect(a.source).toBe(b.source);
    expect(a.source).toBe(kit.noise.source);
  });
});

describe('the nappe', () => {
  const kit = waterKit();
  const mk = () => new Nappes([{ x: 0, z0: 0, z1: 4, film: 1 }], kit.fall(), 'n');
  const lay = (n: Nappes, head: number, q: number, fall = 1.7) => n.set(0, { top: head, sill: 0, floor: -fall, q });

  it('falls on the parabola of the water: the speed at the lip is the critical speed, the sheet lands v0 sqrt(2 d / g) from the face', () => {
    const n = mk();
    const s = lay(n, 0.12, 0.1);
    expect(s.visible).toBe(true);
    expect(s.depth).toBeCloseTo((2 / 3) * 0.12, 9);
    expect(s.v0).toBeCloseTo(Math.sqrt(G * s.depth), 9);
    const lipY = 0.5 * s.depth;
    expect(s.fall).toBeCloseTo(lipY + 1.7, 9);
    expect(-s.landX).toBeCloseTo(s.v0 * Math.sqrt((2 * s.fall) / G), 9);
    // the last row of the ribbon is where it lands, at the level of the water below
    const pos = n.mesh.geometry.attributes.position;
    expect(pos.getX(pos.count - 1)).toBeCloseTo(s.landX, 6);
    expect(pos.getY(pos.count - 1)).toBeCloseTo(-1.7, 6);
  });

  it('is thicker with the discharge (continuity q = v t) and with the head, and is not drawn without water', () => {
    const n = mk();
    const thin = lay(n, 0.05, 0.02).thickness;
    const thick = lay(n, 0.05, 0.2).thickness;
    expect(thick).toBeGreaterThan(5 * thin);
    expect(lay(n, 0.2, 0.2).v0).toBeGreaterThan(lay(n, 0.05, 0.2).v0);
    expect(lay(n, 0.001, 0.2).visible).toBe(false);
    expect(lay(n, 0.1, 0.2, -0.1).visible).toBe(false);
    const info = n.mesh.geometry.attributes.aInfo;
    expect(info.getX(0)).toBe(0);
  });

  it('keeps one draw call for all its ribbons and a few triangles', () => {
    const n = new Nappes(
      [0, 1, 2, 3, 4, 5].map((i) => ({ x: i, z0: 0, z1: 1 })),
      kit.fall(),
      'many',
    );
    expect(n.triangles).toBeLessThan(400);
    expect(n.mesh.geometry.index!.count / 3).toBe(n.triangles);
  });
});

describe('the spray', () => {
  it('is a ring of at most 600 drops that never grows or reallocates, and its drops fall and die', () => {
    const s = new Spray({ max: 600 });
    const arr = s.object.geometry.attributes.position.array;
    const e = s.add({ x: 0, y: 1, z: 0, vy: 2, vx: 0, vz: 0, scatter: 0.2, life: 0.8, floorY: 0.2, rate: 5000 });
    for (let i = 0; i < 60; i++) {
      s.update(1 / 60);
      expect(s.count).toBeLessThanOrEqual(600);
    }
    expect(s.object.geometry.attributes.position.array).toBe(arr);
    expect(s.count).toBeGreaterThan(100);
    e.rate = 0;
    for (let i = 0; i < 120; i++) s.update(1 / 60);
    expect(s.count).toBe(0);
  });

  it('emits in proportion to the rate and hides the drops of a part that is not drawn', () => {
    const count = (rate: number) => {
      const s = new Spray({ max: 600, seed: 3 });
      s.add({ y: 5, vy: 0, life: 5, rate, floorY: -100, gravity: 0 });
      for (let i = 0; i < 30; i++) s.update(1 / 60);
      return s.count;
    };
    expect(count(100) / count(50)).toBeGreaterThan(1.8);
    expect(count(100) / count(50)).toBeLessThan(2.2);
    const s = new Spray({ max: 50, seed: 3 });
    s.add({ y: 5, vy: 0, life: 5, rate: 100, floorY: -100, gravity: 0, owner: 1 });
    s.visible[1] = false;
    s.update(1 / 60);
    s.update(1 / 60);
    const a = s.object.geometry.attributes.aAlpha.array as Float32Array;
    expect(Math.max(...a)).toBe(0);
    s.visible[1] = true;
    s.update(1 / 60);
    expect(Math.max(...(s.object.geometry.attributes.aAlpha.array as Float32Array))).toBeGreaterThan(0);
  });
});

describe('what the water shows, as a function of the state', () => {
  it('has the weir law and the speed of the canal of the first version: nothing retyped', () => {
    expect(FREE_CREST).toBeCloseTo(SITE.fishPass.z - SITE.river.zNorth - SITE.notch.width, 12);
    for (const q of [0.05, 0.5, 1.7]) expect(headOver(q)).toBeCloseTo(weirHead(q), 12);
    expect(unitDischarge(1.01)).toBeCloseTo(0.1, 9);
    expect(SITE.weirCoeff * FREE_CREST * Math.pow(headOver(1), 1.5)).toBeCloseTo(1, 9);
    expect(canalSpeed(DESIGN.flow)).toBeCloseTo(0.8, 9);
    expect(canalSpeed(0)).toBe(0);
    expect(riverSpeed(0)).toBeCloseTo(0.3, 9);
  });

  it('goes the right way: a flood is browner, faster and foamier, low water clearer, nothing changes with nothing', () => {
    const base = stateWith();
    expect(murkOf(base)).toBeCloseTo(0, 2);
    const flood = { ...base, tailRise: 1.2, stopped: 'flood' as const, riverFlow: 1.9, bypassFlow: 1.5 };
    expect(murkOf(flood)).toBeGreaterThan(0.8);
    expect(riverSpeed(flood.riverFlow)).toBeGreaterThan(riverSpeed(base.riverFlow));
    expect(toeFoam(unitDischarge(flood.bypassFlow))).toBeGreaterThan(toeFoam(unitDischarge(0.05)));
    expect(waveAmplitude(0.5)).toBeGreaterThan(waveAmplitude(0.05));
    expect(waveAmplitude(10)).toBeLessThanOrEqual(WATER_FX.waves.amplitudeMax + 1e-9);
    const low = { ...base, riverFlow: 0.03, usableFlow: 0, stopped: 'lowWater' as const };
    expect(lowWaterOf(low)).toBeGreaterThan(0.85);
    expect(lowWaterOf(base)).toBeLessThan(0.2);
    expect(toeFoam(0)).toBe(0);
  });
});

describe('the water of the site', () => {
  const mod = createSiteScene();
  const go = (over = {}, params = {}, frames = 3) => {
    mod.settle();
    const s = stateWith(over, params);
    for (let i = 0; i < frames; i++) mod.update(s, 1 / 60, view({ time: 20 + i }));
    mod.scene.updateMatrixWorld(true);
    return s;
  };
  const named = (name: string) => {
    let o: THREE.Mesh | undefined;
    mod.scene.traverse((c) => c.name === name && (o = c as THREE.Mesh));
    return o!;
  };

  it('makes every body of water a water material that the registry can swap, in the part it belongs to', () => {
    go();
    const reg = mod.registry;
    for (const [part, name] of [
      ['river', 'river-up'],
      ['river', 'river-down'],
      ['weir', 'weir-fall'],
      ['reserved-flow-notch', 'notch-fall'],
      ['fish-pass', 'pass-pool-2'],
      ['fish-pass', 'pass-cascades'],
      ['headrace', 'canal-above-gate'],
      ['tailrace', 'tail-run'],
    ]) {
      const m = named(name);
      expect(waterOf(m.material), name).toBeDefined();
      expect(reg.get(part)!.meshes, name).toContain(m);
      expect(m.userData.solidMaterial, name).toBe(m.material);
    }
  });

  it('draws the head over the crest and the unit discharge of the weir law, and a thicker sheet with the flow', () => {
    const t = (bypassFlow: number) => {
      go({ bypassFlow, stopped: 'closed', flow: 0 });
      const info = named('weir-fall').geometry.attributes.aInfo;
      return { thick: info.getX(2), head: mod.levels.pond - SITE.weir.crestY };
    };
    const a = t(0.3);
    const b = t(1.2);
    expect(a.head).toBeCloseTo(weirHead(0.3), 6);
    expect(b.head).toBeCloseTo(weirHead(1.2), 6);
    expect(b.thick).toBeGreaterThan(a.thick);
    // no overflow, no sheet
    expect(t(0).thick).toBe(0);
  });

  it('steps the canal across a clogged rack by the loss of the simulation, capped, with foam behind the bars that grows with the debris', () => {
    go({ rackLoss: 0 });
    const above = named('canal-above-gate') as THREE.Mesh;
    const lastY = () => above.geometry.attributes.position.getY(above.geometry.attributes.position.count - 1);
    expect(lastY()).toBeCloseTo(mod.levels.pond, 6);
    const foamAt = () => waterOf(above.material)!.u.uFoamK.value.x;
    const clean = foamAt();
    go({ rackLoss: 0.45 });
    const step = mod.levels.pond - mod.levels.canalUp;
    expect(step).toBeGreaterThan(0.1);
    expect(lastY()).toBeCloseTo(mod.levels.pond, 6); // the sheet climbs back to the pond over the ramp: no gap at the bars
    expect(above.geometry.attributes.position.getY(1)).toBeCloseTo(mod.levels.canalUp, 6);
    expect(foamAt()).toBeGreaterThan(clean);
    go({ rackLoss: 3 });
    expect(mod.levels.pond - mod.levels.canalUp).toBeLessThanOrEqual(SITE.rackDropMax + 1e-9);
  });

  it('stills the water at a closed gate and lets the canal drain: the speed falls to zero, the sheet below the gate falls to the dead level', () => {
    go({ flow: DESIGN.flow, stopped: 'no' });
    const below = waterOf(named('canal-below-gate').material)!;
    expect(below.u.uSpeed.value).toBeCloseTo(0.8, 6);
    go({ stopped: 'closed', flow: 0, fill: 0 }, {}, 120);
    expect(below.u.uSpeed.value).toBe(0);
    const pos = named('canal-below-gate').geometry.attributes.position;
    expect(pos.getY(1)).toBeCloseTo(SITE.deadCanalY, 1);
  });

  it('follows the state with the look: a flood is browner and rougher and spills more spray, low water is clearer', () => {
    go({}, {}, 4);
    const calm = { ...mod.water().now };
    const calmMurk = calm.murk;
    const calmSpray = mod.water().spray.count;
    go({ tailRise: 1.2, stopped: 'flood', riverFlow: 1.9, bypassFlow: 1.5 }, {}, 60);
    const flood = mod.water().now;
    expect(flood.murk).toBeGreaterThan(calmMurk + 0.5);
    expect(flood.vRiver).toBeGreaterThan(calm.vRiver);
    expect(flood.q).toBeGreaterThan(0.1);
    expect(mod.water().spray.count).toBeGreaterThan(calmSpray);
    go({ riverFlow: 0.03, usableFlow: 0, stopped: 'lowWater', bypassFlow: 0, flow: 0 }, {}, 120);
    expect(mod.water().now.low).toBeGreaterThan(0.8);
    expect(mod.water().now.murk).toBeLessThan(0.2);
    go();
  });

  it('keeps the spray inside its ring, hides it with its part, and keeps the registry able to isolate every part', () => {
    go({ bypassFlow: 1.5, stopped: 'closed', flow: 0 }, {}, 80);
    const sp = mod.water().spray;
    expect(sp.count).toBeGreaterThan(20);
    expect(sp.count).toBeLessThanOrEqual(WATER_FX.spray.max);
    expect(sp.object.userData.noShadow).toBe(true);
    mod.registry.setDisplay('weir', 'ghost');
    mod.update(stateWith({ bypassFlow: 1.5, stopped: 'closed', flow: 0 }), 1 / 60, view({ time: 400 }));
    expect(sp.visible[0]).toBe(false);
    mod.registry.setAllDisplay('solid');
    expect(finiteTree(mod.scene)).toBe(true);
    go();
  });

  it('stays in the budget of the water: at most 50 draw calls and 70,000 triangles', () => {
    go({}, {}, 2);
    const water = new THREE.Group();
    mod.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && waterOf(m.material)) water.add(new THREE.Mesh(m.geometry, m.material));
      else if ((o as THREE.Points).isPoints && o.name === 'spray')
        water.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()));
    });
    const st = drawStats(water);
    // eslint-disable-next-line no-console
    console.log(`site water: ${st.calls} draw calls, ${Math.round(st.triangles)} triangles`);
    expect(st.calls).toBeLessThanOrEqual(50);
    expect(st.triangles).toBeLessThanOrEqual(70000);
  });
});

describe('the water of the screw', () => {
  const mod = createScrewScene();
  const rig = mod.rig;
  const go = (over = {}, v = {}, frames = 3) => {
    const s = stateWith(over);
    for (let i = 0; i < frames; i++) mod.update(s, 1 / 60, view({ time: 30 + i, ...v }));
    mod.scene.updateMatrixWorld(true);
    return s;
  };

  it('keeps the free surface of the pockets horizontal as the screw turns: the meniscus line is a horizontal line of the world whatever the angle', () => {
    for (const angle of [0, 0.9, 2.4, 5]) {
      go({ fill: 0.7, angle });
      const l = mod.drawn.layout;
      const w = waterOf(rig.pockets!.material)!;
      const [a, b, c] = w.u.uLevel.value.toArray();
      // the normal of the line (a, b) in the frame of the screw, turned into the world by the slope: straight up
      expect(a * l.cosB - b * l.sinB).toBeCloseTo(0, 9);
      expect(a * l.sinB + b * l.cosB).toBeCloseTo(1, 9);
      expect(c).toBeCloseTo(l.levels.hMin + 0.7 * (l.levels.hPass - l.levels.hMin), 9);
      expect(waterOf(rig.pocketCap!.material)!.u.uLevel.value.z).toBeCloseTo(c, 9);
    }
  });

  it('follows the level of the pools with the meniscus of their walls', () => {
    go({ fill: 1, tailRise: 0.6 });
    const l = mod.drawn.layout;
    expect(waterOf(rig.poolWater!.mesh.material)!.u.uLevel.value.z).toBeCloseTo(l.tailY + 0.6, 6);
    expect(waterOf(rig.poolWater!.cap.material)!.u.uLevel.value.z).toBeCloseTo(l.tailY + 0.6, 6);
  });

  it('splashes at the inlet in proportion to the flow, ripples and foams the outlet when the screw turns, and does nothing with no water', () => {
    const rate = (over: object) => {
      go(over, {}, 2);
      return { inlet: mod.water().now.inletRate, outlet: mod.water().now.outletRate };
    };
    const full = rate({ flow: DESIGN.flow, omega: 5.5 });
    const half = rate({ flow: DESIGN.flow / 2, omega: 5.5 });
    expect(full.inlet).toBeGreaterThan(half.inlet * 1.5);
    expect(full.outlet).toBeGreaterThan(half.outlet);
    const none = rate({ flow: 0, omega: 0, fill: 0, qGap: 0, qOver: 0 });
    expect(none.inlet).toBe(0);
    expect(none.outlet).toBe(0);
    const pool = waterOf(rig.poolWater!.mesh.material)!;
    go({ flow: DESIGN.flow, omega: 5.5 }, {}, 2);
    expect(pool.u.uSrcA.value.w).toBeGreaterThan(0.3);
    expect(pool.u.uSrcA.value.y).toBe(0);
  });

  it('draws the leak through the gap and the overflow over the blade tips in proportion to qGap / flow and qOver / flow', () => {
    const f = screwFlows({ flow: 0.2, qGap: 0.01, qOver: 0.04 });
    expect(f.gap).toBeCloseTo(0.05, 9);
    expect(f.over).toBeCloseTo(0.2, 9);
    expect(f.flowK).toBeCloseTo(0.2 / DESIGN.flow, 9);
    const leak = (qGap: number) => {
      go({ flow: DESIGN.flow, qGap, qOver: 0, fill: 0.9 }, {}, 2);
      return mod.water().now.leakRate;
    };
    const a = leak(0.01);
    const b = leak(0.02);
    expect(b / a).toBeGreaterThan(1.8);
    expect(b / a).toBeLessThan(2.2);
    expect(leak(0)).toBe(0);
    const over = (qOver: number) => {
      go({ flow: DESIGN.flow, qGap: 0, qOver, fill: 1 }, {}, 2);
      return mod.water().now.overRate;
    };
    expect(over(0.01)).toBeGreaterThan(over(0.005) * 1.8);
    expect(over(0)).toBe(0);
  });

  it('lets a sheet fall into the inlet basin, thicker with the flow, and cuts it with the section like the rest of the water', () => {
    go({ flow: DESIGN.flow, fill: 0.8 });
    const sheet = rig.inletSheet!;
    expect(sheet.mesh.visible).toBe(true);
    const t = () => sheet.mesh.geometry.attributes.aInfo.getX(2);
    const full = t();
    go({ flow: DESIGN.flow / 4, fill: 0.8 });
    expect(t()).toBeLessThan(full);
    go({ flow: 0, fill: 0.8, stopped: 'closed' });
    expect(sheet.mesh.visible).toBe(false);
    go({ flow: DESIGN.flow, fill: 0.8 }, { cutaway: true });
    expect((sheet.mesh.material as THREE.Material).clippingPlanes?.length).toBeGreaterThan(0);
    const clipped = (id: string) =>
      mod.registry
        .get(id)!
        .meshes.filter((m) => waterOf(m.material) && (m.material as THREE.Material).clippingPlanes?.length);
    expect(clipped('trapped-water').length).toBeGreaterThan(0);
    expect(clipped('outlet-pool').length).toBeGreaterThan(0);
    expect(clipped('inlet-sill').length).toBeGreaterThan(1);
    go({}, { cutaway: false });
  });

  it('stays in the budget of the world: at most 160 draw calls and 220,000 triangles, with the section and the dots', () => {
    go({}, { cutaway: true, schematic: true });
    const st = drawStats(mod.scene);
    // eslint-disable-next-line no-console
    console.log(`screw: ${st.calls} draw calls, ${Math.round(st.triangles)} triangles`);
    expect(st.calls).toBeLessThanOrEqual(160);
    expect(st.triangles).toBeLessThanOrEqual(220000);
    expect(mod.water().spray.count).toBeLessThanOrEqual(WATER_FX.spray.max);
  });
});

describe('the cost of the water', () => {
  it('builds each world in well under a second and keeps its textures small', () => {
    const t0 = performance.now();
    const site = createSiteScene();
    const t1 = performance.now();
    const screw = createScrewScene();
    const t2 = performance.now();
    // eslint-disable-next-line no-console
    console.log(`first build: site ${Math.round(t1 - t0)} ms, screw ${Math.round(t2 - t1)} ms (node, no GL)`);
    expect(t1 - t0).toBeLessThan(2500);
    expect(t2 - t1).toBeLessThan(2500);
    expect(noiseBytes() * 2).toBeLessThan(24 * 1024 * 1024);
    void site;
    void screw;
    void makeShared;
    void createWaterMaterial;
  });
});
