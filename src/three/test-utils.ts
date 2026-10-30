import * as THREE from 'three';
import type { PartRegistry, SceneModule, ViewOpts } from '@onigam/lab-kit/three';
import { MillSim } from '../sim/engine';
import type { MillState, MillParams } from '../sim/types';

// Helpers of the 3D tests: view options, simulation states, bounding boxes of the registered parts.

export const view = (patch: Partial<ViewOpts> = {}): ViewOpts => ({
  slowMo: 1,
  cutaway: false,
  schematic: false,
  time: 1,
  ...patch,
});

/** A state of the simulation after a second of running; `params` edits the simulation first, `over` overrides fields of the state (extreme poses). */
export function stateWith(over: Partial<MillState> = {}, params: Partial<MillParams> = {}, seconds = 1): MillState {
  const sim = new MillSim();
  sim.set(params);
  for (let i = 0; i < 60 * seconds; i++) sim.step(1 / 60);
  return { ...sim.state, ...over };
}

export const sceneBoxes = (mod: SceneModule<MillState>): Map<string, THREE.Box3> => {
  mod.scene.updateMatrixWorld(true);
  const out = new Map<string, THREE.Box3>();
  for (const id of mod.registry.ids()) out.set(id, mod.registry.bounds(id));
  return out;
};

export const touches = (a: THREE.Box3, b: THREE.Box3, tol: number): boolean =>
  a.clone().expandByScalar(tol).intersectsBox(b);

/** Parts whose box touches no other part's box (nor any extra support box) within `tol`. */
export function floating(boxes: Map<string, THREE.Box3>, tol: number, supports: THREE.Box3[] = []): string[] {
  const bad: string[] = [];
  for (const [id, box] of boxes) {
    const other = [...boxes].some(([oid, ob]) => oid !== id && touches(box, ob, tol));
    if (!other && !supports.some((s) => touches(box, s, tol))) bad.push(id);
  }
  return bad;
}

/** True when every object of the tree has finite transforms and finite first vertices. */
export function finiteTree(root: THREE.Object3D): boolean {
  let ok = true;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const v = [
      o.position.x,
      o.position.y,
      o.position.z,
      o.rotation.x,
      o.rotation.y,
      o.rotation.z,
      o.scale.x,
      o.scale.y,
      o.scale.z,
    ];
    if (!v.every(Number.isFinite)) ok = false;
    const m = (o as THREE.Mesh).geometry?.attributes?.position;
    if (m && !(Number.isFinite(m.array[0]) && Number.isFinite(m.array[m.array.length - 1]))) ok = false;
  });
  return ok;
}

export const worldBox = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o, true);

export function isolateOne(reg: PartRegistry, id: string, mode: 'hidden' | 'ghost'): void {
  for (const other of reg.ids()) reg.setDisplay(other, other === id ? 'solid' : mode);
}

/** Draw calls (visible meshes, each instanced mesh once) and triangles (instances counted) of a scene, as the colour pass would issue them. */
export function drawStats(root: THREE.Object3D): { calls: number; triangles: number } {
  let calls = 0;
  let triangles = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.visible) return;
    let visible = true;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) visible = false;
    if (!visible) return;
    const g = m.geometry;
    const n =
      (g.drawRange.count === Infinity ? (g.index ? g.index.count : g.attributes.position.count) : g.drawRange.count) /
      3;
    const inst = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
    calls++;
    triangles += n * inst;
  });
  return { calls, triangles };
}
