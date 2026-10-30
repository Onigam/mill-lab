import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { SceneModule } from '@onigam/lab-kit/three';
import type { MillState } from '../sim/types';
import { createGeneratorScene } from './generator/scene';
import { MERGE } from './merge';
import { createPowerroomScene } from './powerroom/scene';
import { createScrewScene } from './screw/scene';
import { createSiteScene } from './site/scene';
import { drawStats, stateWith, view } from './test-utils';

// Merging the static meshes of a part into one per material must change the draw calls, not the picture: each world is built twice (merged and not),
// driven through the same state, and compared part by part: the same bounds and the same number of triangles.

function triangles(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.cap) return;
    const g = m.geometry;
    const c =
      g.drawRange.count === Infinity ? (g.index ? g.index.count : g.attributes.position.count) : g.drawRange.count;
    n += ((m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1) * (c / 3);
  });
  return n;
}

function compare(name: string, make: () => SceneModule<MillState>) {
  describe(`merge of ${name}`, () => {
    MERGE.enabled = false;
    const plain = make();
    MERGE.enabled = true;
    const merged = make();
    const s = stateWith({ angle: 1.3 });
    for (const m of [plain, merged]) {
      m.update(s, 1 / 60, view({ time: 1 }));
      m.update({ ...s, angle: 1.4 }, 1 / 60, view({ time: 2 }));
      m.scene.updateMatrixWorld(true);
    }

    it('keeps the bounds of every part', () => {
      for (const id of plain.registry.ids()) {
        const a = plain.registry.bounds(id);
        const b = merged.registry.bounds(id);
        for (const k of ['x', 'y', 'z'] as const) {
          expect(b.min[k], `${id} min ${k}`).toBeCloseTo(a.min[k], 5);
          expect(b.max[k], `${id} max ${k}`).toBeCloseTo(a.max[k], 5);
        }
      }
    });

    it('keeps the number of triangles of every part and saves draw calls', () => {
      for (const id of plain.registry.ids()) {
        const a = triangles(plain.registry.get(id)!.object);
        const b = triangles(merged.registry.get(id)!.object);
        expect(b, id).toBeGreaterThanOrEqual(a * 0.999);
        expect(b, id).toBeLessThanOrEqual(a * 1.001);
      }
      expect(drawStats(merged.scene).calls).toBeLessThan(drawStats(plain.scene).calls * 0.6);
    });
  });
}

compare('screw', () => createScrewScene());
compare('site', () => createSiteScene());
compare('generator', () => createGeneratorScene());
compare('powerroom', () => createPowerroomScene());
