import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BLADES } from '../../sim/machine';
import { nagelGap } from '../../sim/screw';
import {
  BOLT,
  BOLTS_PER_MODULE,
  CORE_PLATE,
  MODULES_PER_TURN,
  ROOT_STRIP,
  TROUGH,
  bladeThickness,
  coreWall,
  type ScrewShape,
} from '../dims';
import { TAU, cylinderX, ringX } from '../common';

// The geometry of the screw, in the SCREW FRAME: X' along the axis towards the upper end (the flights run from x' = 0 to x' = L),
// Y' up, Z across. The thread is RIGHT-HANDED: a blade is the helicoid x' = x0 + S ψ / 2π (ψ from +Y' towards +Z), and the turbine turns
// in the positive sense about +X' (see dims.ts). The water pockets use Rorres's frame (J. Hydraulic Eng. 2000, the same one as
// src/sim/bucket.ts): φ = ψ + π/2, the floor of a chute (the upper face of the lower blade) at radius r is F = r cosβ (sin φ + κ φ),
// κ = S tanβ / 2π r, the height of a point is h = r sin φ cosβ + x' sinβ.

export const DEG = Math.PI / 180;

/** A point of the screw frame at radius r and Rorres angle φ, axial position x'. */
export const at = (x: number, r: number, phi: number, out = new THREE.Vector3()): THREE.Vector3 =>
  out.set(x, r * Math.sin(phi), -r * Math.cos(phi));

/** Number of blade modules along one thread and the first/last angle of the thread, for a screw shape. */
export interface ThreadSpan {
  /** Axial position of the centre surface of thread k at azimuth ψ: x = pitch (ψ - 2πk/N) / 2π. */
  psiLo: number[];
  psiHi: number[];
}

export function threadSpan(shape: ScrewShape): ThreadSpan {
  const t = bladeThickness(shape.outerDiameter);
  const psiLo: number[] = [];
  const psiHi: number[] = [];
  for (let k = 0; k < BLADES; k++) {
    const off = (TAU * k) / BLADES;
    psiLo.push(off + (TAU * (t / 2 + 0.004)) / shape.pitch);
    psiHi.push(off + (TAU * (shape.length - t / 2 - 0.004)) / shape.pitch);
  }
  return { psiLo, psiHi };
}

/** Thick slab of a helicoid between two azimuths: top (+x), bottom (-x), tip (r = ro), the two end faces. Indexed, flat-shaded per face. */
export function slab(
  shape: ScrewShape,
  k: number,
  psi0: number,
  psi1: number,
  rIn: number,
  rOut: number,
  thick: number,
  steps: number,
): THREE.BufferGeometry {
  const S = shape.pitch;
  const off = (TAU * k) / BLADES;
  const x = (psi: number) => (S * (psi - off)) / TAU;
  const P = (psi: number, r: number, dx: number) =>
    new THREE.Vector3(x(psi) + dx, r * Math.cos(psi), r * Math.sin(psi));
  const parts: THREE.BufferGeometry[] = [];
  const strip = (rowA: (i: number) => THREE.Vector3, rowB: (i: number) => THREE.Vector3, flip: boolean) => {
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = rowA(i);
      const b = rowB(i);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      if (i < steps) {
        const q = i * 2;
        if (flip) idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
        else idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    parts.push(g);
  };
  const psiAt = (i: number) => psi0 + ((psi1 - psi0) * i) / steps;
  const h = thick / 2;
  // faces are wound so that they look outwards for a right-handed thread (checked by the tests: normals point away from the blade)
  strip(
    (i) => P(psiAt(i), rIn, h),
    (i) => P(psiAt(i), rOut, h),
    false,
  );
  strip(
    (i) => P(psiAt(i), rIn, -h),
    (i) => P(psiAt(i), rOut, -h),
    true,
  );
  strip(
    (i) => P(psiAt(i), rOut, -h),
    (i) => P(psiAt(i), rOut, h),
    true,
  );
  // end faces: a thin radial rectangle at each end of the module
  for (const [psi, flip] of [
    [psi0, false],
    [psi1, true],
  ] as const) {
    const g = new THREE.BufferGeometry();
    const a = P(psi, rIn, -h);
    const b = P(psi, rOut, -h);
    const c = P(psi, rOut, h);
    const d = P(psi, rIn, h);
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [a, b, c, d].flatMap((p) => [p.x, p.y, p.z]),
        3,
      ),
    );
    g.setIndex(flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

export interface BladeGeometry {
  /** The two wood tones of the modules (they alternate so that the joints read). */
  woodA: THREE.BufferGeometry;
  woodB: THREE.BufferGeometry;
  /** Steel strip along the root of every module, and the bolts (heads and washers). */
  strips: THREE.BufferGeometry;
  bolts: THREE.BufferGeometry;
  /** Number of modules and of bolts. */
  modules: number;
  boltCount: number;
}

/**
 * The wooden blades: three threads, each cut in modules of a quarter turn (MODULES_PER_TURN), a 2 mm joint between them, bolted on the
 * core through a steel strip. Modules are cut where the thread meets the two ends of the flights.
 */
export function bladeGeometry(shape: ScrewShape, detail = 1): BladeGeometry {
  const ro = shape.outerDiameter / 2;
  const ri = shape.innerDiameter / 2;
  const t = bladeThickness(shape.outerDiameter);
  const span = threadSpan(shape);
  const dpsi = TAU / MODULES_PER_TURN;
  const joint = 0.002 / ro; // angular half joint at the tip, rad
  const steps = Math.max(2, Math.round(5 * detail));
  const A: THREE.BufferGeometry[] = [];
  const B: THREE.BufferGeometry[] = [];
  const strips: THREE.BufferGeometry[] = [];
  const bolts: THREE.BufferGeometry[] = [];
  let modules = 0;
  let boltCount = 0;
  const bolt = boltGeometry(shape);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  for (let k = 0; k < BLADES; k++) {
    const lo = span.psiLo[k];
    const hi = span.psiHi[k];
    // module boundaries at multiples of a quarter turn (global, so the three threads have their joints on the same radial lines)
    const first = Math.floor(lo / dpsi);
    const last = Math.ceil(hi / dpsi);
    for (let j = first; j < last; j++) {
      const a = Math.max(lo, j * dpsi + joint);
      const b = Math.min(hi, (j + 1) * dpsi - joint);
      if (b - a < 0.05) continue;
      const g = slab(shape, k, a, b, ri, ro, t, steps);
      (modules % 2 === 0 ? A : B).push(g);
      modules++;
      if (detail >= 1) {
        // the steel strip lies on the up-slope face of the module at the root, hugging the core
        strips.push(rootStrip(shape, k, a, b));
        if (bolt) {
          for (let i = 0; i < BOLTS_PER_MODULE; i++) {
            const psi = a + ((b - a) * (i + 0.5)) / BOLTS_PER_MODULE;
            const x = (shape.pitch * (psi - (TAU * k) / BLADES)) / TAU + t / 2 + ROOT_STRIP.width / 2;
            // the bolt axis is radial: the head stands on the strip at radius ri + strip thickness
            const dir = new THREE.Vector3(0, Math.cos(psi), Math.sin(psi));
            q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            m.compose(
              new THREE.Vector3(x, dir.y * (ri + ROOT_STRIP.thickness), dir.z * (ri + ROOT_STRIP.thickness)),
              q,
              s,
            );
            const bg = bolt.clone().applyMatrix4(m);
            bolts.push(bg);
            boltCount++;
          }
        }
      }
    }
  }
  bolt?.dispose();
  const merge = (list: THREE.BufferGeometry[]) => {
    if (!list.length) return new THREE.BufferGeometry();
    const out = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    return out;
  };
  return {
    woodA: merge(A),
    woodB: merge(B),
    strips: merge(strips),
    bolts: merge(bolts),
    modules,
    boltCount,
  };
}

/** A hex bolt head with its washer, standing on +Y from y = 0 (the head is the top), sized for the shape. */
function boltGeometry(shape: ScrewShape): THREE.BufferGeometry | null {
  const k = Math.min(1.6, Math.max(0.5, shape.outerDiameter / 0.86));
  const parts: THREE.BufferGeometry[] = [];
  const w = new THREE.CylinderGeometry((BOLT.washer / 2) * k, (BOLT.washer / 2) * k, BOLT.washerThickness * k, 12);
  w.translate(0, (BOLT.washerThickness * k) / 2, 0);
  parts.push(w);
  const hx = new THREE.CylinderGeometry(
    ((BOLT.acrossFlats / 2) * k) / Math.cos(Math.PI / 6),
    ((BOLT.acrossFlats / 2) * k) / Math.cos(Math.PI / 6),
    BOLT.head * k,
    6,
  );
  hx.translate(0, BOLT.washerThickness * k + (BOLT.head * k) / 2, 0);
  parts.push(hx);
  const out = mergeGeometries(
    parts.map((p) => p.toNonIndexed()),
    false,
  );
  parts.forEach((p) => p.dispose());
  return out;
}

/** A curved strip on the up-slope face of a module, along its root (r from ri to ri + the strip's thickness). */
function rootStrip(shape: ScrewShape, k: number, psi0: number, psi1: number): THREE.BufferGeometry {
  const ri = shape.innerDiameter / 2;
  const t = bladeThickness(shape.outerDiameter);
  const S = shape.pitch;
  const off = (TAU * k) / BLADES;
  const n = 4;
  const pos: number[] = [];
  const idx: number[] = [];
  const x = (psi: number) => (S * (psi - off)) / TAU;
  const rows: [number, number][] = [
    [0, 0],
    [ROOT_STRIP.width, 0],
    [ROOT_STRIP.width, ROOT_STRIP.thickness],
    [0, ROOT_STRIP.thickness],
  ]; // (dx from the blade face, dr from the core)
  for (let i = 0; i <= n; i++) {
    const psi = psi0 + ((psi1 - psi0) * i) / n;
    for (const [dx, dr] of rows) {
      const r = ri + dr;
      pos.push(x(psi) + t / 2 + dx, r * Math.cos(psi), r * Math.sin(psi));
    }
    if (i < n) {
      const base = i * 4;
      for (let e = 0; e < 4; e++) {
        const a = base + e;
        const b = base + ((e + 1) % 4);
        idx.push(a, a + 4, b, b, a + 4, b + 4);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------------------------------------ core and shaft

export interface CoreGeometry {
  /** Hollow wooden tube with its end plates; the journals (steel shaft stubs) beyond. */
  tube: THREE.BufferGeometry;
  plates: THREE.BufferGeometry;
  journals: THREE.BufferGeometry;
}

/** Core tube from x' = 0 to L, end plates, and the shaft: from `xLow` (lower end of the shaft) to `xHigh` (upper end). */
export function coreGeometry(shape: ScrewShape, journalR: number, xLow: number, xHigh: number): CoreGeometry {
  const ri = shape.innerDiameter / 2;
  const L = shape.length;
  const wall = coreWall(shape.outerDiameter);
  const tube = ringX(ri, ri - wall, 0, L, 56);
  const pl = CORE_PLATE.thickness;
  const plates = mergeGeometries(
    [cylinderX(ri - wall + 0.002, 0, pl, 40), cylinderX(ri - wall + 0.002, L - pl, L, 40)].map((g) => g.toNonIndexed()),
    false,
  );
  const hub = ri * 0.42;
  const journals = mergeGeometries(
    [
      cylinderX(journalR, xLow, xHigh, 28),
      cylinderX(hub, pl, pl + 0.05, 28), // hub flange on the plates (visible only in the section)
      cylinderX(hub, L - pl - 0.05, L - pl, 28),
    ].map((g) => g.toNonIndexed()),
    false,
  );
  return { tube, plates, journals };
}

// ------------------------------------------------------------------------------------------------ the trough

/** The half-pipe: the section (z, y') extruded along x' from -overhang to L + overhang. */
export function troughShape(shape: ScrewShape): THREE.Shape {
  const ro = shape.outerDiameter / 2;
  const gap = trueGap(shape);
  const Rt = ro + gap;
  const Ro = Rt + TROUGH.wall;
  const H = ro * TROUGH.sideHeight;
  const s = new THREE.Shape();
  // outline walked counter-clockwise in (z, y'): left rim, down the outside, round the bottom, up the right outside, rim, in, round the bottom
  s.moveTo(-Ro, H);
  s.lineTo(-Ro, 0);
  s.absarc(0, 0, Ro, Math.PI, TAU, false);
  s.lineTo(Ro, H);
  s.lineTo(Rt, H);
  s.lineTo(Rt, 0);
  s.absarc(0, 0, Rt, 0, -Math.PI, true);
  s.lineTo(-Rt, H);
  s.closePath();
  return s;
}

/** The gap between the blade tips and the trough for a shape: Nagel's rule, as the simulation sizes it. */
export const trueGap = (shape: ScrewShape): number => nagelGap(shape.outerDiameter);

/** The U extruded along X' from x0 to x1 (the section is symmetric, so the mirror of the rotation does not matter). */
export function troughGeometry(shape: ScrewShape, x0: number, x1: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(troughShape(shape), { depth: x1 - x0, bevelEnabled: false, curveSegments: 40 });
  g.rotateY(Math.PI / 2); // (sx, sy, d) -> (d, sy, -sx)
  g.translate(x0, 0, 0);
  return g;
}

// ------------------------------------------------------------------------------------------------ the pocket

export interface BucketLevels {
  /** Height of the lowest point of the chute floor (the empty bucket) and of the lowest saddle (the full bucket), in the frame of Rorres. */
  hMin: number;
  hPass: number;
}

/** Levels of an empty and of a full bucket, m (the formulas of src/sim/bucket.ts, scaled to the shape). */
export function bucketLevels(shape: ScrewShape): BucketLevels {
  const ro = shape.outerDiameter / 2;
  const ri = shape.innerDiameter / 2;
  const beta = shape.slopeDeg * DEG;
  const cosB = Math.cos(beta);
  const kr = (shape.pitch * Math.tan(beta)) / TAU; // κ·r, constant
  const floor = (r: number, phi: number) => r * cosB * (Math.sin(phi) + (kr / r) * phi);
  const rLow = Math.max(ri, kr * 1.0000001);
  let hMin = Infinity;
  let hPass = Infinity;
  const nodes = 200;
  for (let i = 0; i <= nodes; i++) {
    const r = rLow + ((ro - rLow) * i) / nodes;
    const kappa = kr / r;
    if (kappa >= 1) continue;
    const c = Math.acos(-kappa);
    hMin = Math.min(hMin, floor(r, -c));
    hPass = Math.min(hPass, floor(r, c - TAU));
  }
  return { hMin, hPass };
}

const NR = 5; // radial samples of a pocket
const NA = 61; // angular samples

/**
 * Builds the water of ONE pocket (a bucket) for a fill, into buffers that are allocated once. The pocket is the water that lies on the
 * floor of a chute (the up-slope face of a blade), under the horizontal level h, up to the next blade: for each radius and angle the
 * thickness along the axis is clamp((h - F) / sinβ, 0, S/N - t). Instances of this geometry, shifted along x', make the whole screw
 * (the pockets are translates of each other, each higher by one blade spacing times sinβ, which is the staircase of levels).
 */
export class PocketBuilder {
  readonly geometry = new THREE.BufferGeometry();
  private readonly pos: Float32Array;
  private readonly index: Uint16Array;
  private readonly floorV = NR * NA;
  private readonly nVert = NR * NA * 2 + 2 * NA * 2;
  fill = -1;
  /** Triangles in the last build, and the thickness of the water at the bottom of the trough (m), for the tests. */
  triangles = 0;
  volume = 0;

  constructor() {
    this.pos = new Float32Array(this.nVert * 3);
    this.index = new Uint16Array((NR - 1) * (NA - 1) * 12 + 2 * (NA - 1) * 6);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.nVert * 3), 3));
    this.geometry.setIndex(new THREE.BufferAttribute(this.index, 1));
    this.geometry.setDrawRange(0, 0);
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
  }

  /** Rebuild for a shape and a fill (0 .. 1). Returns false when there is no water. */
  build(shape: ScrewShape, fill: number): boolean {
    const ro = shape.outerDiameter / 2;
    const ri = shape.innerDiameter / 2;
    const S = shape.pitch;
    const t = bladeThickness(shape.outerDiameter);
    const beta = shape.slopeDeg * DEG;
    const cosB = Math.cos(beta);
    const sinB = Math.sin(beta);
    const kr = (S * Math.tan(beta)) / TAU;
    const th = S / BLADES - t; // free thickness of a chute
    const lv = bucketLevels(shape);
    const f = Math.min(1 - 1e-6, Math.max(0, fill));
    const h = lv.hMin + f * (lv.hPass - lv.hMin);
    const eps = Math.min(0.0015, th / 40);
    const pos = this.pos;
    const thick = new Float32Array(NR * NA);
    const index = this.index;
    let nIdx = 0;
    let volume = 0;
    for (let i = 0; i < NR; i++) {
      const r = ri + ((ro - ri) * i) / (NR - 1);
      const kappa = kr / r;
      const c = Math.acos(-Math.min(0.999, kappa));
      const phiA = c - TAU;
      for (let j = 0; j < NA; j++) {
        const phi = phiA + (TAU * j) / (NA - 1);
        const F = r * cosB * (Math.sin(phi) + kappa * phi) + (t / 2) * sinB;
        const tw = Math.min(th, Math.max(0, (h - F) / sinB));
        const zf = (S * phi) / TAU + t / 2;
        thick[i * NA + j] = tw;
        const lo = Math.min(zf + eps, zf + tw * 0.5);
        const hi = tw > 2 * eps ? zf + tw - eps : lo;
        const a = i * NA + j;
        const b = this.floorV + a;
        const sy = r * Math.sin(phi);
        const sz = -r * Math.cos(phi);
        pos[a * 3] = lo;
        pos[a * 3 + 1] = sy;
        pos[a * 3 + 2] = sz;
        pos[b * 3] = hi;
        pos[b * 3 + 1] = sy;
        pos[b * 3 + 2] = sz;
        const wr = i === 0 || i === NR - 1 ? 0.5 : 1;
        const wa = j === 0 || j === NA - 1 ? 0.5 : 1;
        volume += (tw * r * wr * wa * ((TAU / (NA - 1)) * (ro - ri))) / (NR - 1);
      }
    }
    // ribbons on the outer wall (i = NR - 1) and on the core (i = 0): floor to top at every angle
    const ribbon = (i: number, base: number) => {
      for (let j = 0; j < NA; j++) {
        const a = i * NA + j;
        const lowV = base + j * 2;
        const highV = lowV + 1;
        for (let c = 0; c < 3; c++) {
          pos[lowV * 3 + c] = pos[a * 3 + c];
          pos[highV * 3 + c] = pos[(this.floorV + a) * 3 + c];
        }
      }
    };
    const wallBase = 2 * this.floorV;
    ribbon(NR - 1, wallBase);
    ribbon(0, wallBase + 2 * NA);
    const T = (i: number, j: number) => thick[i * NA + j] > 1e-5;
    for (let i = 0; i < NR - 1; i++) {
      for (let j = 0; j < NA - 1; j++) {
        if (!(T(i, j) || T(i + 1, j) || T(i, j + 1) || T(i + 1, j + 1))) continue;
        const a = i * NA + j;
        const b = a + 1;
        const c = (i + 1) * NA + j;
        const d = c + 1;
        // floor sheet (looks towards +x'), top sheet (towards -x')
        index[nIdx++] = a;
        index[nIdx++] = b;
        index[nIdx++] = c;
        index[nIdx++] = b;
        index[nIdx++] = d;
        index[nIdx++] = c;
        const o = this.floorV;
        index[nIdx++] = o + a;
        index[nIdx++] = o + c;
        index[nIdx++] = o + b;
        index[nIdx++] = o + b;
        index[nIdx++] = o + c;
        index[nIdx++] = o + d;
      }
    }
    for (const [i, base] of [
      [NR - 1, wallBase],
      [0, wallBase + 2 * NA],
    ] as const) {
      for (let j = 0; j < NA - 1; j++) {
        if (!(T(i, j) || T(i, j + 1))) continue;
        const l0 = base + j * 2;
        const l1 = base + (j + 1) * 2;
        index[nIdx++] = l0;
        index[nIdx++] = l1;
        index[nIdx++] = l0 + 1;
        index[nIdx++] = l1;
        index[nIdx++] = l1 + 1;
        index[nIdx++] = l0 + 1;
      }
    }
    this.geometry.setDrawRange(0, nIdx);
    this.triangles = nIdx / 3;
    this.volume = volume;
    this.fill = fill;
    // normals: smooth inside each sheet (the four sets of vertices do not share), computed on the used part only
    this.geometry.index!.needsUpdate = true;
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.normals(nIdx);
    // the registry frames a part by the bounds of its geometry: keep them true to the water that is drawn
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    return nIdx > 0;
  }

  private normals(nIdx: number): void {
    const pos = this.pos;
    const nor = (this.geometry.attributes.normal as THREE.BufferAttribute).array as Float32Array;
    nor.fill(0);
    const idx = this.index;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let k = 0; k < nIdx; k += 3) {
      const i0 = idx[k];
      const i1 = idx[k + 1];
      const i2 = idx[k + 2];
      a.fromArray(pos, i0 * 3);
      b.fromArray(pos, i1 * 3).sub(a);
      c.fromArray(pos, i2 * 3).sub(a);
      b.cross(c);
      for (const i of [i0, i1, i2]) {
        nor[i * 3] += b.x;
        nor[i * 3 + 1] += b.y;
        nor[i * 3 + 2] += b.z;
      }
    }
    for (let i = 0; i < this.nVert; i++) {
      const l = Math.hypot(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]);
      if (l > 0) {
        nor[i * 3] /= l;
        nor[i * 3 + 1] /= l;
        nor[i * 3 + 2] /= l;
      } else nor[i * 3 + 1] = 1;
    }
    (this.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}

/** Where the pockets stand along the axis: translation of pocket `p` at the screw angle θ, and how many are needed. */
export function pocketShift(shape: ScrewShape, p: number, theta: number): number {
  const spacing = shape.pitch / BLADES;
  const m = Math.ceil(0.6 * BLADES);
  const start = -shape.pitch / 4 - m * spacing;
  // the pattern repeats every blade spacing: wrap the rotation into one spacing so the instances never run out
  const u = -(shape.pitch * theta) / TAU;
  const w = (((u % spacing) + spacing) % spacing) - spacing;
  return start + w + p * spacing;
}

export function pocketCount(shape: ScrewShape): number {
  const spacing = shape.pitch / BLADES;
  const m = Math.ceil(0.6 * BLADES);
  return Math.ceil((shape.length + 0.75 * shape.pitch + (m * spacing + shape.pitch / 4)) / spacing) + 2;
}

/**
 * The section of one pocket by the plane z = 0 (the section tool): a polygon in (x', y'), at the pocket shift 0. The blades cut by that
 * plane are radial rectangles (the helicoid is ruled), so the water at the bottom of the trough lies between two of them, under the
 * level line. Returns the polygon in x'-y' pairs (counter-clockwise), or [] without water.
 */
export function pocketSection(shape: ScrewShape, fill: number): [number, number][] {
  const ro = shape.outerDiameter / 2;
  const ri = shape.innerDiameter / 2;
  const S = shape.pitch;
  const t = bladeThickness(shape.outerDiameter);
  const beta = shape.slopeDeg * DEG;
  const cosB = Math.cos(beta);
  const sinB = Math.sin(beta);
  const lv = bucketLevels(shape);
  const f = Math.min(1 - 1e-6, Math.max(0, fill));
  const h = lv.hMin + f * (lv.hPass - lv.hMin);
  const xl = -S / 4 + t / 2; // up-slope face of the lower blade at the bottom of the trough (φ = -π/2)
  const th = S / BLADES - t;
  // right edge at radius r: the level line or the next blade
  const xr = (r: number) => Math.max(xl, Math.min(xl + th, (h + r * cosB) / sinB));
  const poly: [number, number][] = [];
  const n = 6;
  const pts = (from: number, to: number) => {
    for (let i = 0; i <= n; i++) {
      const r = from + ((to - from) * i) / n;
      poly.push([xr(r), -r]);
    }
  };
  if (xr(ri) <= xl + 1e-4 && xr(ro) <= xl + 1e-4) return [];
  poly.push([xl, -ro]);
  pts(ro, ri);
  poly.push([xl, -ri]);
  // drop degenerate repeated points
  return poly.filter((p, i) => i === 0 || Math.hypot(p[0] - poly[i - 1][0], p[1] - poly[i - 1][1]) > 1e-6);
}
