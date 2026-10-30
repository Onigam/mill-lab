import * as THREE from 'three';
import { TILE, type WaterHandle, waterOf } from './surface';

// A body of open water seen from above: a rectangle of the plan cut into a grid (finer where something happens), with the foam painted
// in a vertex attribute. It replaces the four-vertex quad of the first version. The positions stay flat on the CPU (the tests and the
// frame of the parts read them); the standing waves are lifted in the vertex shader. The level is written by `set`, the ripples are
// advanced by `flow`. Nothing is allocated after the build.
//
// Vertex attributes (all `vec4`, written once, at the build):
//   aFoam   four foam channels, each a mask 0 .. 1 painted where water meets a structure or falls (the toe of a weir, a sill, a jet...);
//           the gain of each channel is a uniform (`WaterHandle.setFoam`), set every frame from the state
//   aInfo   x opacity at the banks (1 inside, small at the water's edge), y the depth factor (the bed rises towards the banks), z, w spare

/** Grid lines from `a` to `b`: a step of `coarse` m, refined to `step` inside each of the zones `[from, to, step]`. */
export function gridLines(a: number, b: number, zones: [number, number, number][], coarse: number): number[] {
  const key = new Set<number>([a, b]);
  for (const [f, t] of zones) {
    if (f > a && f < b) key.add(f);
    if (t > a && t < b) key.add(t);
  }
  const k = [...key].sort((p, q) => p - q);
  const out: number[] = [k[0]];
  for (let i = 0; i + 1 < k.length; i++) {
    const p = k[i];
    const q = k[i + 1];
    const mid = (p + q) / 2;
    let step = coarse;
    for (const [f, t, s] of zones) if (mid >= f && mid <= t) step = Math.min(step, s);
    const n = Math.max(1, Math.ceil((q - p) / step - 1e-9));
    for (let j = 1; j <= n; j++) out.push(p + ((q - p) * j) / n);
  }
  return out;
}

export interface BodyOptions {
  xs?: number[];
  zs?: number[];
  /** Largest number of grid lines per side (a guard against a runaway zone). */
  max?: number;
}

export class WaterBody {
  readonly mesh: THREE.Mesh;
  readonly water: WaterHandle;
  readonly xs: number[];
  readonly zs: number[];
  private readonly pos: Float32Array;
  private readonly foam: Float32Array;
  private readonly info: Float32Array;
  private cache = [Number.NaN, Number.NaN, 0, 0];
  yEast = 0;
  yWest = 0;

  constructor(
    readonly x0: number,
    readonly x1: number,
    readonly z0: number,
    readonly z1: number,
    readonly material: THREE.MeshStandardMaterial,
    name = 'water',
    opts: BodyOptions = {},
  ) {
    const w = waterOf(material);
    if (!w) throw new Error('WaterBody needs a water material');
    this.water = w;
    this.xs = opts.xs ?? [x0, x1];
    this.zs = opts.zs ?? [z0, z1];
    const nx = this.xs.length;
    const nz = this.zs.length;
    const n = nx * nz;
    this.pos = new Float32Array(n * 3);
    this.foam = new Float32Array(n * 4);
    this.info = new Float32Array(n * 4);
    const nor = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const v = j * nx + i;
        this.pos[v * 3] = this.xs[i];
        this.pos[v * 3 + 2] = this.zs[j];
        nor[v * 3 + 1] = 1;
        uv[v * 2] = this.xs[i] / TILE;
        uv[v * 2 + 1] = this.zs[j] / TILE;
        this.info[v * 4] = 1;
        this.info[v * 4 + 1] = 1;
        this.info[v * 4 + 2] = 1;
      }
    const index = new (n > 65535 ? Uint32Array : Uint16Array)((nx - 1) * (nz - 1) * 6);
    let k = 0;
    for (let j = 0; j + 1 < nz; j++)
      for (let i = 0; i + 1 < nx; i++) {
        const a = j * nx + i;
        const b = a + 1;
        const d = a + nx;
        const c = d + 1;
        index[k++] = a;
        index[k++] = c;
        index[k++] = b;
        index[k++] = a;
        index[k++] = d;
        index[k++] = c;
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aFoam', new THREE.BufferAttribute(this.foam, 4));
    g.setAttribute('aInfo', new THREE.BufferAttribute(this.info, 4));
    g.setIndex(new THREE.BufferAttribute(index, 1));
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
    this.mesh.userData.water = this;
    this.water.setBanks(x0, x1, z0, z1, 0);
  }

  /**
   * Set the two heights (east and west end; the water flows towards -X) and, at the east end, a drop of `ramp.drop` metres that
   * the surface climbs over `ramp.len` metres (the step across a clogged rack). The box of the geometry follows, so that the part
   * that holds the sheet is framed by what is drawn.
   */
  set(yEast: number, yWest = yEast, ramp?: { len: number; drop: number }): void {
    const len = ramp?.len ?? 0;
    const drop = ramp?.drop ?? 0;
    const c = this.cache;
    if (
      Math.abs(c[0] - yEast) < 1e-7 &&
      Math.abs(c[1] - yWest) < 1e-7 &&
      Math.abs(c[2] - drop) < 1e-7 &&
      Math.abs(c[3] - len) < 1e-7
    )
      return;
    c[0] = yEast;
    c[1] = yWest;
    c[2] = drop;
    c[3] = len;
    this.yEast = yEast;
    this.yWest = yWest;
    const nx = this.xs.length;
    const nz = this.zs.length;
    const span = this.x1 - this.x0 || 1;
    let lo = Math.min(yEast, yWest);
    let hi = Math.max(yEast, yWest);
    for (let i = 0; i < nx; i++) {
      const x = this.xs[i];
      let y = yWest + (yEast - yWest) * ((x - this.x0) / span);
      if (len > 0 && drop !== 0) {
        const t = Math.min(1, Math.max(0, 1 - (this.x1 - x) / len));
        y += drop * t * t * (3 - 2 * t);
      }
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
      for (let j = 0; j < nz; j++) this.pos[(j * nx + i) * 3 + 1] = y;
    }
    const a = this.mesh.geometry;
    (a.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    const box = a.boundingBox!;
    box.min.y = lo;
    box.max.y = hi;
  }

  /** Move the ripples along the flow by `d` metres. */
  flow(d: number): void {
    this.water.advance(d);
  }

  /** Paint foam channel `ch` (0 .. 3) with `f(x, z)` in 0 .. 1; where channels overlap the larger value stays. */
  paint(ch: 0 | 1 | 2 | 3, f: (x: number, z: number) => number): this {
    const nx = this.xs.length;
    for (let j = 0; j < this.zs.length; j++)
      for (let i = 0; i < nx; i++) {
        const k = (j * nx + i) * 4 + ch;
        this.foam[k] = Math.max(this.foam[k], Math.min(1, Math.max(0, f(this.xs[i], this.zs[j]))));
      }
    (this.mesh.geometry.attributes.aFoam as THREE.BufferAttribute).needsUpdate = true;
    return this;
  }

  /** Opacity factor at the water's edge (1 inside), per vertex. */
  shore(f: (x: number, z: number) => number): this {
    this.write(0, f);
    return this;
  }

  /** Depth factor (1 = the full depth of the bed, less where the bed rises), per vertex. */
  bed(f: (x: number, z: number) => number): this {
    this.write(1, f);
    return this;
  }

  private write(ch: number, f: (x: number, z: number) => number): void {
    const nx = this.xs.length;
    for (let j = 0; j < this.zs.length; j++)
      for (let i = 0; i < nx; i++)
        this.info[(j * nx + i) * 4 + ch] = Math.min(1, Math.max(0, f(this.xs[i], this.zs[j])));
    (this.mesh.geometry.attributes.aInfo as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Number of triangles (for the budget). */
  get triangles(): number {
    return (this.xs.length - 1) * (this.zs.length - 1) * 2;
  }
}

/** Soft bump, 1 at `c`, 0 beyond `w` on either side. */
export const bump = (x: number, c: number, w: number): number => {
  const t = Math.min(1, Math.abs(x - c) / w);
  return 1 - t * t * (3 - 2 * t);
};

/** 1 inside [a, b], falling to 0 over `w` outside it. */
export const plateau = (x: number, a: number, b: number, w: number): number => {
  const d = x < a ? a - x : x > b ? x - b : 0;
  const t = Math.min(1, d / w);
  return 1 - t * t * (3 - 2 * t);
};
