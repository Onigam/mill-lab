import * as THREE from 'three';
import type { Hotspot, SceneModule } from '@onigam/lab-kit/three';
import type { MillState } from '../sim/types';

// Where the visitor's camera and the hotspot labels end up, without a browser. A replica of what the kit does when a world is
// shown: `Stage.frameAll()` (the overview pose of a device world, or the authored pose of a landscape backed off on a narrow
// view) and the CSS of `.hotspot` (a dot, then the name in 10.5 px capitals). Used by `labels.test.ts` to keep the labels of
// the default views apart and inside the picture at every size; if the kit changes either, change them here too.

export interface Size {
  w: number;
  h: number;
}

/** The camera of the kit's stage (vertical field of view in degrees). */
export const FOV = 40;

/** How narrow the canvas is, as the kit measures it: 0 at an aspect ratio of 1 or more, 1 at 0.7 or less. */
const narrowness = (size: Size): number => Math.min(1, Math.max(0, (1 - size.w / size.h) / 0.3));
/** The padding of the tight fit that the kit uses on a narrow view (the extents of the device, not its sphere). */
const TIGHT_PADDING = 1.1;

/**
 * The default view of a world in a canvas of `size`: the pose `Stage.frameAll()` flies to. On a narrow canvas the kit keeps `toolbar`
 * pixels free at the bottom for the floating toolbar and fits the real extents of the device in the rest; `free` says what is left
 * (the projection of the returned camera fills it, from its top left corner).
 */
export function homeCamera(
  mod: SceneModule<MillState>,
  size: Size,
  toolbar = 0,
): THREE.PerspectiveCamera & { free: Size } {
  const narrow = narrowness(size);
  const free = { w: size.w, h: size.h - toolbar * narrow };
  const half = Math.tan((FOV * Math.PI) / 360);
  const camera = new THREE.PerspectiveCamera(
    (2 * Math.atan((half * free.h) / size.h) * 180) / Math.PI,
    free.w / free.h,
    mod.id === 'site' ? 0.1 : 0.01,
    mod.id === 'site' ? 4000 : 60,
  ) as THREE.PerspectiveCamera & { free: Size };
  camera.free = free;
  mod.scene.updateMatrixWorld(true);
  const dir = mod.home.position.clone().sub(mod.home.target);
  if (mod.id === 'site') {
    // a landscape is framed by its authored pose; back off (and climb) on a narrow view
    const k = Math.max(1, 1.5 / camera.aspect);
    camera.position.copy(mod.home.target).addScaledVector(dir, k);
    camera.position.y += (k - 1) * dir.length() * 0.7;
    camera.lookAt(mod.home.target);
  } else {
    const box = new THREE.Box3();
    for (const p of mod.registry.parts.values()) if (p.display !== 'hidden') box.union(mod.registry.bounds(p.id));
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(0.03, box.getBoundingSphere(new THREE.Sphere()).radius);
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const fov = Math.min(vFov, hFov);
    const padding = mod.homePadding ?? 0.82;
    let dist = (radius * padding) / Math.sin(fov / 2);
    const d = dir.clone().normalize();
    if (narrow > 0) {
      // the extents of the box seen along d, in the free part of the view
      const right = new THREE.Vector3().crossVectors(camera.up, d).normalize();
      const up = new THREE.Vector3().crossVectors(d, right).normalize();
      const tanV = Math.tan(vFov / 2);
      const tanH = tanV * camera.aspect;
      const rel = new THREE.Vector3();
      let tight = 0;
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            rel.set(x, y, z).sub(center);
            const need = Math.max(
              (Math.abs(rel.dot(right)) * TIGHT_PADDING) / tanH,
              (Math.abs(rel.dot(up)) * TIGHT_PADDING) / tanV,
            );
            tight = Math.max(tight, need + rel.dot(d));
          }
      dist = dist + (tight - dist) * narrow;
    }
    dist = Math.min(mod.maxDistance, Math.max(mod.minDistance, dist));
    camera.position.copy(center).addScaledVector(d, dist);
    camera.lookAt(center);
  }
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

export interface LabelBox {
  id: string;
  /** Left, top, right, bottom in pixels of the canvas (y down). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** The anchor on the screen, and whether it is in front of the camera. */
  ax: number;
  ay: number;
  inFront: boolean;
  minor: boolean;
  text: string;
}

/** Width of a label: dot (14) + gap (6) + padding and border (18) + the text in a mono face at 10.5 px + 0.06 em of spacing. */
const CHAR = 0.6 * 10.5 + 0.06 * 10.5;
export const LABEL_HEIGHT = 22;
export const labelWidth = (text: string, goto: boolean): number => 38 + CHAR * (text.length + (goto ? 2 : 0));

/** The box of each label of the active world as the visitor sees it, in a canvas of `size`. */
export function labelBoxes(mod: SceneModule<MillState>, size: Size, lang: 'fr' | 'en', toolbar = 0): LabelBox[] {
  const camera = homeCamera(mod, size, toolbar);
  const free = camera.free;
  const p = new THREE.Vector3();
  return mod.hotspots.map((h: Hotspot) => {
    h.anchor.getWorldPosition(p);
    const ndc = p.clone().project(camera);
    const ax = ((ndc.x + 1) / 2) * free.w;
    const ay = ((1 - ndc.y) / 2) * free.h;
    const text = h.label[lang].toUpperCase();
    const w = labelWidth(text, !!h.goto);
    // the dot is centred on the anchor (the element is shifted 7 px left), the text follows it to the right
    return {
      id: h.partId,
      x0: ax - 7,
      y0: ay - LABEL_HEIGHT / 2,
      x1: ax - 7 + w,
      y1: ay + LABEL_HEIGHT / 2,
      ax,
      ay,
      inFront: ndc.z > -1 && ndc.z < 1,
      minor: !!h.minor,
      text,
    };
  });
}
