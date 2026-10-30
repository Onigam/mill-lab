import { group, mesh, MAT, PartRegistry } from '@onigam/lab-kit/three';
import type { Hotspot, SceneModule } from '@onigam/lab-kit/three';
import * as THREE from 'three';
import type { DemoState } from '../sim/engine';

// One 3D world: a flywheel on a base. Replace it with the lab's device. Rules the kit relies on:
//  - every selectable part is registered with `registry.add(id, object, explodeOffset)`; the id must
//    match an entry of src/data/parts.ts;
//  - `home` is the overview camera pose, `update` runs every frame with the simulation state;
//  - build from real dimensions kept in ONE place (a dims.ts, in metres) shared with the drawings.

/** Dimensions in metres (the single source of truth for the 3D model and the drawings). */
export const D = { baseW: 0.5, baseD: 0.3, baseH: 0.03, axisY: 0.22, wheelR: 0.16, wheelT: 0.03, axleR: 0.012 };

export function createDeviceScene(): SceneModule<DemoState> {
  const scene = new THREE.Scene();
  scene.name = 'device';
  scene.background = new THREE.Color(0xece6da);
  // the stage fills scene.environment from a shared PMREM environment
  scene.userData.wantsEnv = true;
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8d8273, 0.85));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2);
  key.position.set(1.6, 2.6, 2.4);
  key.castShadow = true;
  scene.add(key);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: 0xd9d2c4 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const registry = new PartRegistry();

  const base = group('base');
  base.add(mesh(new THREE.BoxGeometry(D.baseW, D.baseH, D.baseD), MAT.steelBlack(), [0, D.baseH / 2, 0]));
  base.add(mesh(new THREE.BoxGeometry(0.04, D.axisY, 0.04), MAT.steel(), [-0.12, D.axisY / 2 + D.baseH, 0]));
  base.add(mesh(new THREE.BoxGeometry(0.04, D.axisY, 0.04), MAT.steel(), [0.12, D.axisY / 2 + D.baseH, 0]));

  const axle = group('axle');
  const axleGeo = new THREE.CylinderGeometry(D.axleR, D.axleR, 0.34, 24);
  axleGeo.rotateZ(Math.PI / 2);
  axle.add(mesh(axleGeo, MAT.inox(), [0, D.axisY + D.baseH, 0]));

  // the wheel is a part that spins: its group sits on the axis
  const wheel = group('wheel', [0, D.axisY + D.baseH, 0]);
  const disk = new THREE.CylinderGeometry(D.wheelR, D.wheelR, D.wheelT, 48);
  disk.rotateZ(Math.PI / 2);
  wheel.add(mesh(disk, MAT.alu()));
  for (let i = 0; i < 6; i++) {
    const hole = mesh(new THREE.BoxGeometry(D.wheelT + 0.002, 0.03, 0.03), MAT.steelBlack(), [0, 0.1, 0]);
    hole.rotation.x = (i / 6) * Math.PI * 2;
    hole.position.set(0, Math.cos(hole.rotation.x) * 0.1, Math.sin(hole.rotation.x) * 0.1);
    wheel.add(hole);
  }

  scene.add(base, axle, wheel);
  registry.add('base', base, new THREE.Vector3(0, -0.08, 0));
  registry.add('axle', axle, new THREE.Vector3(0, 0.18, 0));
  registry.add('wheel', wheel, new THREE.Vector3(0.3, 0, 0));

  const anchor = (x: number, y: number, z: number) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    scene.add(o);
    return o;
  };
  const hotspots: Hotspot[] = [
    { partId: 'wheel', anchor: anchor(0, D.axisY + D.baseH + D.wheelR, 0), label: { fr: 'Volant', en: 'Wheel' } },
    { partId: 'axle', anchor: anchor(0.17, D.axisY + D.baseH, 0), label: { fr: 'Axe', en: 'Axle' } },
    { partId: 'base', anchor: anchor(0.25, D.baseH, 0.15), label: { fr: 'Socle', en: 'Base' } },
  ];

  return {
    id: 'device',
    scene,
    registry,
    hotspots,
    home: { position: new THREE.Vector3(0.9, 0.6, 0.9), target: new THREE.Vector3(0, 0.18, 0) },
    minDistance: 0.25,
    maxDistance: 4,
    update(state) {
      wheel.rotation.x = state.angle;
    },
  };
}
