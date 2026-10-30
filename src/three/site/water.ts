import * as THREE from 'three';
import { clamp } from '@onigam/lab-kit/three';

// The moving water of the site: a tileable texture of streaks (a DataTexture, so it also builds in Node), a horizontal sheet whose two ends can
// be at different heights (a canal that falls towards the chamber) and a vertical sheet that falls over a crest. Textures are scrolled, never
// rebuilt: nothing is allocated per frame.

/** Streaks of light on deep blue, tileable (every blob wraps round the edges). */
export function waterTexture(seed = 7): THREE.DataTexture {
  const N = 128;
  const data = new Float32Array(N * N);
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let b = 0; b < 70; b++) {
    const cx = rand() * N;
    const cy = rand() * N;
    const w = 6 + rand() * 18;
    const h = 0.9 + rand() * 1.5;
    const a = 0.25 + rand() * 0.45;
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -Math.ceil(w * 2); dx <= Math.ceil(w * 2); dx++) {
        const v = a * Math.exp(-((dx / w) ** 2) - (dy / h) ** 2);
        const x = (((Math.round(cx) + dx) % N) + N) % N;
        const y = (((Math.round(cy) + dy) % N) + N) % N;
        data[y * N + x] = Math.min(1, data[y * N + x] + v);
      }
  }
  const px = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const t = data[i];
    px[i * 4] = Math.round(70 + 150 * t);
    px[i * 4 + 1] = Math.round(130 + 100 * t);
    px[i * 4 + 2] = Math.round(165 + 70 * t);
    px[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** A material of the water for one sheet (it owns a clone of the texture, so that every sheet scrolls at its own speed). */
export function sheetMaterial(base: THREE.Texture, opacity = 1): THREE.MeshStandardMaterial {
  const map = base.clone();
  map.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    roughness: 0.28,
    metalness: 0,
    envMapIntensity: 0.5,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  });
}

/** Metres of the plan per tile of the texture. */
export const TILE = 5;

/** A horizontal quad x0..x1, z0..z1 with its east edge (x1) at height `yEast` and its west edge (x0) at `yWest`. The water flows towards -X. */
export class Sheet {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshStandardMaterial;
  private readonly pos: Float32Array;
  private phase = 0;
  yEast = 0;
  yWest = 0;
  constructor(
    readonly x0: number,
    readonly x1: number,
    readonly z0: number,
    readonly z1: number,
    material: THREE.MeshStandardMaterial,
    name = 'water',
  ) {
    this.material = material;
    this.pos = new Float32Array([x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    g.setAttribute(
      'uv',
      new THREE.BufferAttribute(
        new Float32Array([x0 / TILE, z0 / TILE, x1 / TILE, z0 / TILE, x1 / TILE, z1 / TILE, x0 / TILE, z1 / TILE]),
        2,
      ),
    );
    g.setIndex([0, 2, 1, 0, 3, 2]);
    g.boundingBox = new THREE.Box3(new THREE.Vector3(x0, -5, z0), new THREE.Vector3(x1, 3, z1));
    g.boundingSphere = new THREE.Sphere(
      new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2),
      Math.hypot(x1 - x0, z1 - z0, 8) / 2,
    );
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.name = name;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.userData.noShadow = true;
  }

  /** Set the two heights; the box of the geometry follows so that the part holding the sheet is framed by what is drawn. */
  set(yEast: number, yWest = yEast): void {
    this.yEast = yEast;
    this.yWest = yWest;
    const p = this.pos;
    p[1] = yWest;
    p[4] = yEast;
    p[7] = yEast;
    p[10] = yWest;
    const a = this.mesh.geometry;
    (a.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    const box = a.boundingBox!;
    box.min.y = Math.min(yEast, yWest);
    box.max.y = Math.max(yEast, yWest);
  }

  /** Move the streaks along the flow by `d` metres (towards -X). */
  flow(d: number): void {
    this.phase = (this.phase + d / TILE) % 1;
    (this.material.map as THREE.Texture).offset.x = this.phase;
  }
}

/** A vertical sheet of falling water in the plane x = `x`, between z0 and z1, from y = `top` down by `fall`. */
export class FallSheet {
  readonly mesh: THREE.Mesh;
  private phase = 0;
  constructor(
    readonly x: number,
    readonly z0: number,
    readonly z1: number,
    readonly material: THREE.MeshStandardMaterial,
    name = 'fall',
  ) {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateY(-Math.PI / 2); // faces -X (downstream)
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.name = name;
    this.mesh.castShadow = false;
    this.mesh.userData.noShadow = true;
    this.mesh.position.set(x, 0, (z0 + z1) / 2);
    this.mesh.scale.set(1, 1, z1 - z0);
  }

  set(top: number, fall: number, thickness: number): void {
    const f = Math.max(0.01, fall);
    this.mesh.position.y = top - f / 2;
    this.mesh.scale.y = f;
    this.mesh.visible = thickness > 0.002 && fall > 0.01;
    this.material.opacity = clamp(thickness / 0.04, 0.25, 0.9);
    (this.material.map as THREE.Texture).repeat.set(Math.max(1, (this.z1 - this.z0) / TILE), Math.max(0.5, f / TILE));
  }

  flow(d: number): void {
    this.phase = (this.phase + d / TILE) % 1;
    (this.material.map as THREE.Texture).offset.y = -this.phase;
  }
}
