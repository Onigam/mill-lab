import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Small shared helpers of the two worlds: the paper floor, flow dots, tubes, water material, rings along an axis. Ported from the
// Piggott and ram labs (docs/kit-requests.md says what should move to the kit). Geometry and materials only (no canvas, no GL
// context), so everything here also runs in Node under vitest.

export const TAU = Math.PI * 2;

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** A profile is a polyline of (radius, axial position) points, revolved around the X axis (`solidX`). */
export type Profile = [number, number][];

/** A cylinder around X from x0 to x1. */
export function cylinderX(r: number, x0: number, x1: number, segments = 24, rTop = r): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, r, Math.abs(x1 - x0), segments, 1);
  g.rotateZ(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, 0);
  return g;
}

/** A ring (outer radius, inner radius) around X from x0 to x1: four faces, so the bore and the rim read as crisp edges. */
export function ringX(outerR: number, innerR: number, x0: number, x1: number, segments = 40): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const lathe = (pts: [number, number][]) =>
    new THREE.LatheGeometry(
      pts.map(([r, y]) => new THREE.Vector2(r, y)),
      segments,
    );
  // walk the closed polygon so that the faces look outwards (profile points are (radius, y); the lathe turns about Y)
  parts.push(
    lathe([
      [innerR, x0],
      [outerR, x0],
    ]),
  );
  parts.push(
    lathe([
      [outerR, x0],
      [outerR, x1],
    ]),
  );
  parts.push(
    lathe([
      [outerR, x1],
      [innerR, x1],
    ]),
  );
  parts.push(
    lathe([
      [innerR, x1],
      [innerR, x0],
    ]),
  );
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  merged.rotateZ(-Math.PI / 2);
  return merged;
}

/** A solid disc around X: a cylinder from x0 to x1. */
export const discX = (r: number, x0: number, x1: number, segments = 40): THREE.BufferGeometry =>
  cylinderX(r, x0, x1, segments);

/**
 * Drafting-table floor: a paper disc with a grid, as a DataTexture (no canvas, so it also builds in Node). `tile` is the side of
 * one texture tile in metres (eight cells of one fifth each), `radius` the radius of the disc.
 */
export function paperFloor(radius = 12, tile = 8, y = 0): THREE.Mesh {
  const N = 512;
  const data = new Uint8Array(N * N * 4);
  const cell = N / 8;
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const k = (py * N + px) * 4;
      let a = 0;
      const mx = px % cell;
      const my = py % cell;
      if (mx < 2 || my < 2) a = 0.16;
      else if (mx % (cell / 5) < 1 || my % (cell / 5) < 1) a = 0.06;
      data[k] = Math.round(239 * (1 - a) + 40 * a);
      data[k + 1] = Math.round(230 * (1 - a) + 60 * a);
      data[k + 2] = Math.round(211 * (1 - a) + 90 * a);
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set((2 * radius) / tile, (2 * radius) / tile);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y;
  floor.receiveShadow = true;
  floor.name = 'floor';
  return floor;
}

/** Soft round sprite (white, alpha falling to the edge) for dots; a DataTexture, so no canvas is needed. */
export function softDotTexture(size = 32): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const d = Math.hypot((i + 0.5) / size - 0.5, (j + 0.5) / size - 0.5) * 2;
      const a = Math.max(0, 1 - d);
      const k = (j * size + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = 255;
      data[k + 3] = Math.round(255 * Math.min(1, a * 1.8) * (a > 0 ? 1 : 0));
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/** Translucent water (no transmission: cheap, and it sorts after the opaque parts). */
export function waterMaterial(opacity = 0.5, color = 0x4d9fd1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.25,
    metalness: 0,
    envMapIntensity: 0.35,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Flag a whole subtree as never casting shadows (water, overlays): the registry respects `userData.noShadow`. */
export function noShadow<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => {
    c.castShadow = false;
    c.userData.noShadow = true;
  });
  return o;
}

/** A tube along points (Catmull-Rom through them), for cables and wires. */
export function tubeGeometry(
  points: THREE.Vector3[],
  radius: number,
  segments = 24,
  radial = 6,
  closed = false,
): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return new THREE.TubeGeometry(curve, segments, radius, radial, closed);
}

/** Free the geometry of every mesh under `root` (materials are shared and stay). */
export function disposeGeometries(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !m.userData.sharedGeometry) m.geometry.dispose();
  });
}

/** Remove every child of `root` and free its geometry (children flagged `userData.keep`, the label anchors, stay). */
export function clearGroup(root: THREE.Object3D): void {
  for (const c of [...root.children]) {
    if (c.userData.keep) continue;
    disposeGeometries(c);
    root.remove(c);
  }
}

// ------------------------------------------------------------------------------------------------ flow dots

/** A polyline with its cumulative length, to place a dot at a distance along it. */
export class DotPath {
  readonly cum: number[] = [0];
  constructor(readonly points: THREE.Vector3[]) {
    for (let i = 1; i < points.length; i++) this.cum.push(this.cum[i - 1] + points[i].distanceTo(points[i - 1]));
  }
  get length(): number {
    return this.cum[this.cum.length - 1];
  }
  at(u: number, out: THREE.Vector3): THREE.Vector3 {
    const L = this.length;
    if (L <= 0) return out.copy(this.points[0]);
    let d = u % L;
    if (d < 0) d += L;
    let lo = 0;
    let hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= d) lo = mid;
      else hi = mid;
    }
    const segLen = this.cum[hi] - this.cum[lo];
    const t = segLen > 0 ? (d - this.cum[lo]) / segLen : 0;
    return out.lerpVectors(this.points[lo], this.points[hi], t);
  }
}

export interface FlowDotsOptions {
  color: number;
  /** World size (metres) or, with `pixels`, screen size (pixels). */
  size: number;
  pixels?: boolean;
  opacity?: number;
  /** Draw through the walls (the "Flux" overlay). */
  throughWalls?: boolean;
}

/** Dots that travel along polylines: the speed of each path is set every frame (signed). Decoration of a size set by the simulation. */
export class FlowDots {
  readonly object: THREE.Points;
  private readonly paths: { path: DotPath; offset: number[]; first: number }[] = [];
  private readonly pos: Float32Array;
  private total = 0;
  private readonly tmp = new THREE.Vector3();
  private geometry: THREE.BufferGeometry;

  constructor(
    private readonly max: number,
    opts: FlowDotsOptions,
  ) {
    this.pos = new Float32Array(max * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const mat = new THREE.PointsMaterial({
      color: opts.color,
      size: opts.size,
      sizeAttenuation: !opts.pixels,
      map: softDotTexture(),
      transparent: true,
      opacity: opts.opacity ?? 0.9,
      depthWrite: false,
      depthTest: !opts.throughWalls,
    });
    this.object = new THREE.Points(this.geometry, mat);
    this.object.frustumCulled = false;
    this.object.renderOrder = opts.throughWalls ? 20 : 4;
    this.object.userData.noShadow = true;
    this.object.castShadow = false;
    this.object.visible = false;
    this.geometry.setDrawRange(0, 0);
  }

  /** Add a path with `count` dots spread evenly along it; returns its index. */
  addPath(points: THREE.Vector3[], count: number): number {
    const path = new DotPath(points);
    const n = Math.max(1, Math.min(count, this.max - this.total));
    const offset: number[] = [];
    for (let i = 0; i < n; i++) offset.push((path.length * i) / n);
    this.paths.push({ path, offset, first: this.total });
    this.total += n;
    this.geometry.setDrawRange(0, this.total);
    this.place();
    return this.paths.length - 1;
  }

  /** Replace the points of a path (a pipe that moved, a screw that was redrawn); the dots keep their share of the length. */
  setPath(index: number, points: THREE.Vector3[]): void {
    const p = this.paths[index];
    const old = p.path.length || 1;
    const path = new DotPath(points);
    for (let i = 0; i < p.offset.length; i++) p.offset[i] = (p.offset[i] / old) * path.length;
    p.path = path;
    this.place();
  }

  advance(index: number, speed: number, dt: number): void {
    const p = this.paths[index];
    const L = p.path.length;
    if (L <= 0) return;
    for (let i = 0; i < p.offset.length; i++) {
      let u = (p.offset[i] + speed * dt) % L;
      if (u < 0) u += L;
      p.offset[i] = u;
    }
  }

  /** Write the positions after all `advance` calls of a frame. */
  place(): void {
    for (const p of this.paths) {
      for (let i = 0; i < p.offset.length; i++) {
        p.path.at(p.offset[i], this.tmp);
        const k = (p.first + i) * 3;
        this.pos[k] = this.tmp.x;
        this.pos[k + 1] = this.tmp.y;
        this.pos[k + 2] = this.tmp.z;
      }
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  get material(): THREE.PointsMaterial {
    return this.object.material as THREE.PointsMaterial;
  }

  get count(): number {
    return this.total;
  }
}
