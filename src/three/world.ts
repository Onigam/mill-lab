import * as THREE from 'three';
import { l } from '@onigam/lab-kit/i18n';
import type { Hotspot } from '@onigam/lab-kit/three';

// What the two worlds share: the lighting of a workshop world (paper, soft shadows, like the other labs of the series), the
// hotspot declarations, and the helpers of the tests (positions of anchors).

export interface WorkshopOptions {
  name: string;
  /** Fog start and end, metres. */
  fog: [number, number];
  /** Position of the key light and the point it looks at. */
  key: [number, number, number];
  target: [number, number, number];
  /** Half size of the shadow box and its far plane. */
  shadowHalf: number;
  shadowFar: number;
}

export function workshopScene(o: WorkshopOptions): THREE.Scene {
  const scene = new THREE.Scene();
  scene.name = o.name;
  scene.background = new THREE.Color(0xefe6d3);
  scene.fog = new THREE.Fog(0xefe6d3, o.fog[0], o.fog[1]);
  // the stage fills scene.environment from a shared PMREM environment
  scene.userData.wantsEnv = true;
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xb6a68c, 1.1));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(...o.key);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -o.shadowHalf;
  sc.right = o.shadowHalf;
  sc.top = o.shadowHalf;
  sc.bottom = -o.shadowHalf;
  sc.near = 0.1;
  sc.far = o.shadowFar;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = o.shadowHalf * 0.0035;
  key.target.position.set(...o.target);
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.7);
  fill.position.set(-o.key[0], o.key[1] * 0.6, o.key[2] * 0.4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(o.key[0] * 0.2, o.key[1], -o.key[2]);
  scene.add(rim);
  return scene;
}

export interface HotspotDef {
  id: string;
  fr: string;
  en: string;
  minor?: boolean;
  /** World to open when the label is clicked. */
  goto?: string;
}

/** An empty marker at a position of `parent`: the label follows it, also during the explode. */
export function anchor(parent: THREE.Object3D, x: number, y: number, z: number, name = 'anchor'): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

export function hotspots(defs: HotspotDef[], anchors: Record<string, THREE.Object3D>): Hotspot[] {
  return defs.map((d) => ({
    partId: d.id.replace(/#.*$/, ''),
    anchor: anchors[d.id],
    label: l(d.fr, d.en),
    minor: d.minor,
    goto: d.goto,
  }));
}

/** Meshes of a sub-tree whose position is not finite: the tests and the animation share this guard. */
export function allFinite(root: THREE.Object3D): boolean {
  let ok = true;
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
  });
  return ok;
}
