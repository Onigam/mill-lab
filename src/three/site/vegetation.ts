import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '@onigam/lab-kit/three';
import { SCENERY } from '../dims';
import { smoothstep as ss } from '../common';
import { fbm, patchWind, sceneryTextures, vnoise } from './materials';
import { PROP_ZONES } from './props';
import {
  PADS,
  TRACKS,
  forestMask,
  terrainHeight,
  trackDistance,
  waterDistance,
  yardMask,
  type ShadeBlob,
} from './terrain';

// The plants of the `site` world, all instanced and cheap: willows that lean over the water, poplars along the lanes, oaks, conifers on the hill and a
// far forest of crude cones, shrubs, reeds and cattails along the water, tufts of grass, wildflowers and rounded rocks. Each species is one geometry
// (a unit tree: height 1, the foot at the origin) with its colours in the vertices (darker at the foot and under the branches: a cheap ambient
// occlusion) and a per-vertex `aSway` for the wind; an instance sets the size, the lean and a tint. The placement is deterministic (a seeded
// generator) and stands every plant on the land (`terrainHeight`), outside the openings of the water, off the tracks, the yards and the pads of the
// buildings; the tall plants keep out of the corridor of the home view so that the labels stay readable.

export interface Inst {
  x: number;
  y: number;
  z: number;
  /** Height (trees) or size (shrubs, cards, rocks), m. */
  s: number;
  /** Width relative to the height. */
  w: number;
  rot: number;
  /** Lean from the vertical, radians, towards `leanDir`. */
  lean: number;
  leanDir: number;
  /** A number in 0..1 that picks the tint. */
  tint: number;
}

export interface VegetationPlan {
  willows: Inst[];
  poplars: Inst[];
  oaks: Inst[];
  conifers: Inst[];
  forest: Inst[];
  shrubs: Inst[];
  reeds: Inst[];
  tufts: Inst[];
  flowers: Inst[];
  rocks: Inst[];
  /** Dark discs under the crowns, for the terrain's vertex colours. */
  shade: ShadeBlob[];
}

const CAM = { x: 30, z: 50 };
const TGT = { x: -6, z: -9 };

/** Distance from a point to the line of sight of the home view (from the target backwards past the camera, a narrow view backs off), m. */
export function homeCorridorDistance(x: number, z: number): number {
  const dx = CAM.x - TGT.x;
  const dz = CAM.z - TGT.z;
  const len = Math.hypot(dx, dz);
  const ex = (dx / len) * len * 1.9;
  const ez = (dz / len) * len * 1.9;
  const t = Math.min(1, Math.max(0, ((x - TGT.x) * ex + (z - TGT.z) * ez) / (ex * ex + ez * ez)));
  return Math.hypot(TGT.x + ex * t - x, TGT.z + ez * t - z);
}

const slopeAt = (x: number, z: number): number => {
  const e = 1.2;
  const dx = terrainHeight(x + e, z) - terrainHeight(x - e, z);
  const dz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
};

const padDistance = (x: number, z: number): number => {
  let d = Infinity;
  for (const p of PADS) d = Math.min(d, Math.hypot(Math.max(p.x0 - x, 0, x - p.x1), Math.max(p.z0 - z, 0, z - p.z1)));
  return d;
};

const nearRoad = (x: number, z: number): boolean =>
  Math.abs(Math.abs(x) - SCENERY.farRiver.bridgeX) < 7 + Math.max(0, Math.abs(z) - 20) * 0.0 && z > -48 && z < 52;

/** Everything a plant needs of the place: off the water, the tracks, the yards, the pads, the roads. `r` is the radius of its foot (and of its crown if it is wide). */
function spotOk(x: number, z: number, r: number, wide = 0): boolean {
  if (waterDistance(x, z) < r + 1.0) return false;
  if (padDistance(x, z) < wide * 0.6 + 0.4) return false;
  if (trackDistance(x, z).d < r + 0.6 + wide * 0.35) return false;
  if (yardMask(x, z) > 0.02) return false;
  if (nearRoad(x, z)) return false;
  for (const zn of PROP_ZONES) if (x > zn.x0 - r && x < zn.x1 + r && z > zn.z0 - r && z < zn.z1 + r) return false;
  return true;
}

// ------------------------------------------------------------------------------------------------ geometry

class Mesher {
  pos: number[] = [];
  col: number[] = [];
  uv: number[] = [];
  sway: number[] = [];
  nor: number[] = [];
  idx: number[] = [];
  get n(): number {
    return this.pos.length / 3;
  }
  vert(
    x: number,
    y: number,
    z: number,
    c: THREE.Color,
    u: number,
    v: number,
    sw: number,
    nx = 0,
    ny = 0,
    nz = 0,
  ): number {
    this.pos.push(x, y, z);
    this.col.push(c.r, c.g, c.b);
    this.uv.push(u, v);
    this.sway.push(sw);
    this.nor.push(nx, ny, nz);
    return this.n - 1;
  }
  tri(a: number, b: number, c: number): void {
    this.idx.push(a, b, c);
  }
  build(normals: 'smooth' | 'given' = 'smooth'): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sway, 1));
    g.setIndex(this.idx);
    if (normals === 'given') g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    else g.computeVertexNormals();
    return g;
  }
}

const unitIco = new Map<number, THREE.BufferGeometry>();
function ico(detail: number): THREE.BufferGeometry {
  let g = unitIco.get(detail);
  if (!g) {
    const raw = new THREE.IcosahedronGeometry(1, detail);
    raw.deleteAttribute('normal');
    raw.deleteAttribute('uv');
    g = mergeVertices(raw, 1e-4);
    unitIco.set(detail, g);
  }
  return g;
}

const C = (hex: number): THREE.Color => new THREE.Color(hex);

interface LobeOptions {
  detail?: number;
  noise?: number;
  seed?: number;
  lo: THREE.Color;
  hi: THREE.Color;
  /** Metres of the instance's unit per tile of the leaf texture. */
  uvk?: number;
  swayK?: number;
}

/** A displaced ellipsoid of leaves: colours from dark at the bottom to light at the top and noisy, sway with the square of the height. */
function lobe(m: Mesher, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, o: LobeOptions): void {
  const g = ico(o.detail ?? 1);
  const p = g.attributes.position;
  const ix = g.index!;
  const base = m.n;
  const seed = o.seed ?? 0;
  const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i);
    const uy = p.getY(i);
    const uz = p.getZ(i);
    const f = 1 + (o.noise ?? 0.16) * (vnoise(ux * 2.3 + seed, uy * 2.3 + uz * 1.7 + seed * 0.7) - 0.5) * 2;
    const x = cx + ux * rx * f;
    const y = cy + uy * ry * f;
    const z = cz + uz * rz * f;
    const t = ss(-0.7, 0.95, uy);
    tmp.copy(o.lo).lerp(o.hi, t);
    const jit = 0.9 + 0.2 * vnoise(ux * 3.1 + seed * 1.3, uz * 3.1 + uy * 2);
    tmp.multiplyScalar(jit);
    const k = o.uvk ?? 8;
    m.vert(x, y, z, tmp, (x + 0.5 * z) * k, (y + 0.3 * z) * k, Math.min(1, Math.max(0, y)) ** 2 * (o.swayK ?? 1));
  }
  for (let i = 0; i < ix.count; i++) m.idx.push(base + ix.getX(i));
}

/** A tapered tube along a polyline (a trunk or a limb): rings of `sides` points, bark UVs, little sway. */
function tube(
  m: Mesher,
  pts: [number, number, number][],
  radii: number[],
  sides: number,
  ca: THREE.Color,
  cb: THREE.Color,
  uvk = 12,
): void {
  const rings: number[][] = [];
  const t = new THREE.Vector3();
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();
  const tmp = new THREE.Color();
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = new THREE.Vector3(...pts[Math.max(0, i - 1)]);
    const c = new THREE.Vector3(...pts[Math.min(pts.length - 1, i + 1)]);
    t.subVectors(c, a).normalize();
    const ref = Math.abs(t.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    n.crossVectors(t, ref).normalize();
    b.crossVectors(t, n).normalize();
    if (i > 0) len += new THREE.Vector3(...pts[i]).distanceTo(new THREE.Vector3(...pts[i - 1]));
    tmp.copy(ca).lerp(cb, i / Math.max(1, pts.length - 1));
    const ring: number[] = [];
    for (let s = 0; s <= sides; s++) {
      const ang = (s / sides) * Math.PI * 2;
      const cx = Math.cos(ang);
      const cz = Math.sin(ang);
      const r = radii[i];
      ring.push(
        m.vert(
          pts[i][0] + (n.x * cx + b.x * cz) * r,
          pts[i][1] + (n.y * cx + b.y * cz) * r,
          pts[i][2] + (n.z * cx + b.z * cz) * r,
          tmp,
          (s / sides) * 2,
          len * uvk,
          0.12 * Math.min(1, pts[i][1]) ** 2,
        ),
      );
    }
    rings.push(ring);
  }
  for (let i = 0; i < rings.length - 1; i++)
    for (let s = 0; s < sides; s++) {
      const a = rings[i][s];
      const b2 = rings[i][s + 1];
      const c = rings[i + 1][s];
      const d = rings[i + 1][s + 1];
      m.tri(a, c, b2);
      m.tri(b2, c, d);
    }
}

/**
 * A fine hanging strand: a thin ribbon that leaves `base` along `out` at an angle of (1 - arch) of a right angle below the horizontal,
 * bends under its weight and ends vertical, `length` long (a quarter-circle-like arc), narrowing and darkening towards its tip, with a
 * slight wave of its width so that it reads as a twig with leaves rather than a thread.
 */
function fineStrand(
  m: Mesher,
  base: THREE.Vector3,
  out: THREE.Vector3,
  length: number,
  width: number,
  segs: number,
  arch: number,
  top: THREE.Color,
  bottom: THREE.Color,
): void {
  const tmp = new THREE.Color();
  const side = new THREE.Vector3(-out.z, 0, out.x).normalize();
  const th0 = (1 - Math.min(1, Math.max(0, arch))) * (Math.PI / 2);
  const R = length / (Math.PI / 2 - th0 + 1e-6);
  const row: [number, number][] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const th = th0 + t * (Math.PI / 2 - th0);
    const px = base.x + out.x * R * (Math.sin(th) - Math.sin(th0));
    const py = base.y + R * (Math.cos(th) - Math.cos(th0));
    const pz = base.z + out.z * R * (Math.sin(th) - Math.sin(th0));
    const w = width * (1 - 0.6 * t) * (1 + 0.45 * Math.sin(t * 17 + length * 40));
    tmp.copy(top).lerp(bottom, t);
    const sw = 0.5 + 1.5 * t ** 1.4;
    const a = m.vert(px - side.x * w, py, pz - side.z * w, tmp, 0, t * 6, sw);
    const b = m.vert(px + side.x * w, py, pz + side.z * w, tmp, 1, t * 6, sw);
    row.push([a, b]);
  }
  for (let i = 0; i < segs; i++) {
    const [a, b] = row[i];
    const [c, d] = row[i + 1];
    m.tri(a, c, b);
    m.tri(b, c, d);
  }
}

function willowGeometry(): { wood: THREE.BufferGeometry; leaves: THREE.BufferGeometry } {
  const wood = new Mesher();
  const bark = C(0x5c4a3a);
  const barkHi = C(0x7a6650);
  tube(
    wood,
    [
      [0, 0, 0],
      [0.01, 0.1, 0.005],
      [0.02, 0.22, 0],
      [0.03, 0.3, 0.01],
    ],
    [0.036, 0.031, 0.025, 0.021],
    7,
    C(0x4a3b2e),
    bark,
  );
  tube(
    wood,
    [
      [0.03, 0.29, 0],
      [0.08, 0.39, 0.03],
      [0.15, 0.52, 0.05],
    ],
    [0.019, 0.014, 0.008],
    5,
    bark,
    barkHi,
  );
  tube(
    wood,
    [
      [0.03, 0.29, 0],
      [-0.06, 0.4, -0.04],
      [-0.15, 0.52, -0.06],
    ],
    [0.018, 0.013, 0.007],
    5,
    bark,
    barkHi,
  );
  tube(
    wood,
    [
      [0.03, 0.29, 0],
      [0.02, 0.45, 0.09],
      [0.0, 0.6, 0.15],
    ],
    [0.015, 0.011, 0.006],
    5,
    bark,
    barkHi,
  );
  const lv = new Mesher();
  const lo = C(0x587a31);
  const hi = C(0x8fab4a);
  const r = rng(3);
  // a small, low dome of foliage at the top: the curtain of strands below does most of the work (a dome with a few broad hanging
  // panels read as a jellyfish)
  lobe(lv, 0, 0.7, 0, 0.2, 0.12, 0.2, { lo, hi, seed: 1, noise: 0.25 });
  lobe(lv, 0.11, 0.66, 0.04, 0.13, 0.09, 0.13, { lo, hi, seed: 2, noise: 0.25 });
  lobe(lv, -0.11, 0.65, -0.04, 0.13, 0.09, 0.13, { lo, hi, seed: 3, noise: 0.25 });
  // the curtain: many fine strands that start near the top, arch out and then hang, like the long, thin twigs of a weeping willow
  const palette = [C(0x86a444), C(0x93ad4e), C(0x7a9a3c)];
  const bottoms = [C(0x547530), C(0x5f7f33), C(0x6d8a3a)];
  const N = 175;
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2;
    const rho = 0.03 + 0.3 * Math.sqrt(r());
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const edge = rho / 0.33;
    const y = 0.76 - 0.2 * edge * edge;
    const arch = 0.85 - 0.7 * edge;
    const length = (0.36 + 0.22 * r()) * (0.85 + 0.3 * (1 - edge));
    const k = Math.floor(r() * palette.length);
    fineStrand(
      lv,
      new THREE.Vector3(out.x * rho, y, out.z * rho),
      out,
      length,
      0.0058 + 0.004 * r(),
      6,
      arch,
      palette[k],
      bottoms[k],
    );
  }
  return { wood: wood.build(), leaves: lv.build() };
}

function poplarGeometry(): { wood: THREE.BufferGeometry; leaves: THREE.BufferGeometry } {
  const wood = new Mesher();
  tube(
    wood,
    [
      [0, 0, 0],
      [0.003, 0.18, 0],
      [0, 0.38, 0.003],
    ],
    [0.014, 0.011, 0.008],
    6,
    C(0x4d4338),
    C(0x6b6254),
  );
  const lv = new Mesher();
  const lo = C(0x5f8132);
  const hi = C(0xa4bf4c);
  const r = rng(8);
  const ys = [0.31, 0.46, 0.61, 0.76, 0.91];
  ys.forEach((y, i) => {
    const prof = Math.sin(((y - 0.2) / 0.82) * Math.PI * 0.95 + 0.15);
    const rr = 0.045 + 0.075 * Math.max(0.15, prof);
    lobe(lv, (r() - 0.5) * 0.014, y, (r() - 0.5) * 0.014, rr, 0.085 + 0.02 * r(), rr * (0.95 + 0.1 * r()), {
      lo,
      hi,
      seed: 10 + i,
      noise: 0.22,
    });
  });
  return { wood: wood.build(), leaves: lv.build() };
}

function oakGeometry(): { wood: THREE.BufferGeometry; leaves: THREE.BufferGeometry } {
  const wood = new Mesher();
  const bark = C(0x5a4a3b);
  const barkHi = C(0x756150);
  tube(
    wood,
    [
      [0, 0, 0],
      [0.004, 0.09, 0.002],
      [0.01, 0.2, 0],
      [0.012, 0.3, 0.004],
    ],
    [0.046, 0.038, 0.032, 0.028],
    8,
    C(0x3f342a),
    bark,
  );
  const limbs: [number, number, number][][] = [
    [
      [0.012, 0.28, 0],
      [0.09, 0.4, 0.05],
      [0.17, 0.52, 0.09],
    ],
    [
      [0.012, 0.28, 0],
      [-0.08, 0.42, -0.02],
      [-0.18, 0.54, -0.07],
    ],
    [
      [0.012, 0.28, 0],
      [0.0, 0.42, -0.09],
      [0.04, 0.55, -0.17],
    ],
    [
      [0.012, 0.28, 0],
      [-0.02, 0.44, 0.09],
      [-0.05, 0.57, 0.16],
    ],
  ];
  for (const l of limbs) tube(wood, l, [0.024, 0.017, 0.01], 6, bark, barkHi);
  const lv = new Mesher();
  const lo = C(0x4a6e2c);
  const hi = C(0x95b251);
  const r = rng(21);
  const spots: [number, number, number, number, number][] = [
    [0, 0.68, 0, 0.3, 0.2],
    [0.2, 0.6, 0.08, 0.22, 0.16],
    [-0.21, 0.6, 0.0, 0.23, 0.16],
    [0.05, 0.62, -0.2, 0.22, 0.16],
    [-0.04, 0.6, 0.21, 0.22, 0.16],
    [0.12, 0.78, -0.06, 0.2, 0.13],
    [-0.12, 0.76, 0.07, 0.2, 0.13],
  ];
  spots.forEach(([x, y, z, rx, ry], i) =>
    lobe(lv, x, y, z, rx, ry, rx * (0.9 + 0.2 * r()), { lo, hi, seed: 30 + i, noise: 0.2, detail: 1 }),
  );
  return { wood: wood.build(), leaves: lv.build() };
}

/** A conifer of drooping tiers (jagged rim); `tiers` of `sides` sides, a trunk under it. */
function coniferGeometry(
  tiers: number,
  sides: number,
  trunk: boolean,
): { wood: THREE.BufferGeometry | null; leaves: THREE.BufferGeometry } {
  const lv = new Mesher();
  const r = rng(tiers * 7 + sides);
  const lo = C(0x2d4a2e);
  const hi = C(0x57794a);
  const tmp = new THREE.Color();
  for (let t = 0; t < tiers; t++) {
    const f = t / Math.max(1, tiers - 1);
    const y0 = 0.1 + f * 0.72;
    const h = (0.34 - 0.14 * f) * (tiers < 4 ? 1.5 : 1);
    const rad = 0.2 * (1 - 0.62 * f) + 0.02;
    const apex = lv.vert(0, y0 + h, 0, hi, 0.5, 1, (y0 + h) ** 2, 0, 0, 0);
    const ringTop: number[] = [];
    const ringBot: number[] = [];
    for (let s = 0; s < sides; s++) {
      const ang = (s / sides) * Math.PI * 2 + t * 0.4;
      const jag = 1 + 0.22 * (r() - 0.5) * 2;
      const rr = rad * jag;
      const droop = 0.03 + 0.03 * r();
      tmp.copy(lo).lerp(hi, 0.35 + 0.3 * f);
      ringTop.push(
        lv.vert(
          Math.cos(ang) * rr * 0.55,
          y0 + h * 0.42,
          Math.sin(ang) * rr * 0.55,
          tmp,
          s / sides,
          0.5,
          (y0 + h * 0.4) ** 2,
        ),
      );
      tmp.copy(lo).lerp(hi, 0.05 + 0.2 * f);
      ringBot.push(lv.vert(Math.cos(ang) * rr, y0 - droop, Math.sin(ang) * rr, tmp, s / sides, 0, (y0 - droop) ** 2));
    }
    for (let s = 0; s < sides; s++) {
      const s2 = (s + 1) % sides;
      lv.tri(apex, ringTop[s2], ringTop[s]);
      lv.tri(ringTop[s], ringTop[s2], ringBot[s]);
      lv.tri(ringTop[s2], ringBot[s2], ringBot[s]);
    }
  }
  let wood: THREE.BufferGeometry | null = null;
  if (trunk) {
    const w = new Mesher();
    tube(
      w,
      [
        [0, 0, 0],
        [0, 0.12, 0],
        [0, 0.3, 0],
      ],
      [0.012, 0.01, 0.008],
      5,
      C(0x3e3329),
      C(0x5a4a3b),
    );
    wood = w.build();
  }
  const g = lv.build();
  return { wood, leaves: g };
}

/** A crude conifer for the far forest: two stacked cones of six sides (12 triangles), dark at the foot. */
function farConiferGeometry(): THREE.BufferGeometry {
  const m = new Mesher();
  const lo = C(0x2c472d);
  const hi = C(0x587a4b);
  for (const [y0, y1, rad] of [
    [0.08, 0.62, 0.21],
    [0.38, 1.0, 0.15],
  ] as const) {
    const apex = m.vert(0, y1, 0, hi, 0.5, 1, y1 * y1);
    const ring: number[] = [];
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2 + y0;
      ring.push(m.vert(Math.cos(a) * rad, y0, Math.sin(a) * rad, lo, s / 6, 0, y0 * y0));
    }
    for (let s = 0; s < 6; s++) m.tri(apex, ring[(s + 1) % 6], ring[s]);
  }
  return m.build();
}

function shrubGeometry(): THREE.BufferGeometry {
  const m = new Mesher();
  const lo = C(0x4d6f2e);
  const hi = C(0x9ab552);
  lobe(m, 0, 0.42, 0, 0.5, 0.4, 0.5, { lo, hi, seed: 50, noise: 0.28, uvk: 3 });
  lobe(m, 0.22, 0.3, 0.18, 0.3, 0.26, 0.3, { lo, hi, seed: 51, noise: 0.25, uvk: 3, detail: 0 });
  return m.build();
}

function rockGeometry(): THREE.BufferGeometry {
  const m = new Mesher();
  lobe(m, 0, 0.3, 0, 0.5, 0.34, 0.42, { lo: C(0x6f6a60), hi: C(0xb5afa2), seed: 70, noise: 0.22, uvk: 2, swayK: 0 });
  return m.build();
}

/** Crossed cards (quads) of width `w` and height `h`, normals straight up so that they light like the ground, alpha cut out by the sprite. */
function cardGeometry(w: number, h: number, cards: number, tint = C(0xffffff)): THREE.BufferGeometry {
  const m = new Mesher();
  for (let k = 0; k < cards; k++) {
    const a = (k / cards) * Math.PI;
    const dx = Math.cos(a) * w * 0.5;
    const dz = Math.sin(a) * w * 0.5;
    const v0 = m.vert(-dx, 0, -dz, tint, 0, 0, 0, 0, 1, 0);
    const v1 = m.vert(dx, 0, dz, tint, 1, 0, 0, 0, 1, 0);
    const v2 = m.vert(dx, h, dz, tint, 1, 1, 1, 0, 1, 0);
    const v3 = m.vert(-dx, h, -dz, tint, 0, 1, 1, 0, 1, 0);
    m.tri(v0, v1, v2);
    m.tri(v0, v2, v3);
  }
  return m.build('given');
}

// ------------------------------------------------------------------------------------------------ placement

const inst = (x: number, z: number, s: number, w: number, r: () => number, lean = 0, leanDir = 0): Inst => ({
  x,
  y: terrainHeight(x, z),
  z,
  s,
  w,
  rot: r() * Math.PI * 2,
  lean,
  leanDir,
  tint: r(),
});

/** Where everything stands: a deterministic plan, made from the land and nothing else (the terrain takes its shade from it). */
export function planVegetation(): VegetationPlan {
  const r = rng(2026);
  const plan: VegetationPlan = {
    willows: [],
    poplars: [],
    oaks: [],
    conifers: [],
    forest: [],
    shrubs: [],
    reeds: [],
    tufts: [],
    flowers: [],
    rocks: [],
    shade: [],
  };
  const tallOk = (x: number, z: number): boolean => homeCorridorDistance(x, z) > SCENERY.homeCorridor;
  const blob = (i: Inst, rad: number, k: number) => plan.shade.push({ x: i.x, z: i.z, r: rad, k });

  // ---- willows over the water: trunks on the banks, leaning towards the river
  const willowSpots: [number, number][] = [
    [-52, 15.8],
    [-40, 16.6],
    [-72, 15.4],
    [58, 15.6],
    [72, 16.4],
    [88, 15.5],
    [31, -3.2],
    [47, -3.4],
    [-46, -2.8],
    [-60, -3.1],
  ];
  for (const [x, z] of willowSpots.slice(0, SCENERY.trees.willows)) {
    const south = z > 6;
    if (!spotOk(x, z, 0.5, 6) || !tallOk(x, z)) continue;
    const h = 8.5 + 2.4 * r();
    const w = inst(x, z, h, 0.95 + 0.2 * r(), r, 0.17 + 0.07 * r(), south ? -Math.PI / 2 : Math.PI / 2);
    plan.willows.push(w);
    blob(w, h * 0.42, 0.28);
  }

  // ---- poplars along the lanes (the east lane and the west lane), a few behind the house
  const lane = (track: number, x0: number, x1: number, step: number, off: number, count: number) => {
    let placed = 0;
    for (
      let x = x0;
      (x1 > x0 ? x < x1 : x > x1) && placed < count;
      x += (x1 > x0 ? 1 : -1) * (step * (0.8 + 0.5 * r()))
    ) {
      const z = laneZ(track, x) + off * (0.8 + 0.5 * r());
      if (!spotOk(x, z, 0.4, 2.2) || !tallOk(x, z)) continue;
      const h = 13 + 6 * r();
      const p = inst(x, z, h, 0.8 + 0.2 * r(), r);
      plan.poplars.push(p);
      blob(p, h * 0.1, 0.18);
      placed++;
    }
  };
  const np = SCENERY.trees.poplars;
  lane(3, 24, 152, 9.5, -5.6, Math.round(np * 0.44));
  lane(3, 28, 150, 11, 5.0, Math.round(np * 0.32));
  lane(4, -30, -150, 10, 5.6, Math.round(np * 0.24));

  // ---- oaks: a clump behind the mill, one by the house, a belt on the rise to the north
  const oakSpots: [number, number][] = [
    [-30, -27],
    [-37, -31],
    [-24, -34],
    [-44, -25],
    [16, -26],
    [19, -34],
    [-2, -34],
    [8, -40],
    [30, -30],
    [40, -22],
    [-14, -42],
    [-54, -38],
    [58, -34],
    [26, -46],
    [-70, -32],
    [66, -26],
  ];
  for (const [x0, z0] of oakSpots.slice(0, SCENERY.trees.oaks)) {
    const x = x0 + (r() - 0.5) * 3;
    const z = z0 + (r() - 0.5) * 3;
    if (!spotOk(x, z, 0.8, 8) || padDistance(x, z) < 3.2 || !tallOk(x, z)) continue;
    const h = 10 + 4.5 * r();
    const o = inst(x, z, h, 0.9 + 0.22 * r(), r);
    plan.oaks.push(o);
    blob(o, h * 0.42, 0.3);
  }

  // ---- conifers: on the hills and behind the house, near (full) and far (crude cones)
  let tries = 0;
  while (plan.conifers.length < SCENERY.trees.conifersNear && tries++ < 6000) {
    const ang = r() * Math.PI * 2;
    const d = 55 + r() * 320;
    const x = -6 + Math.cos(ang) * d * 1.3;
    const z = -20 + Math.sin(ang) * d;
    if (z > 40) continue; // the far south is the other bank of the valley: kept for the far forest
    if (
      r() > forestMask(x, z) * 1.6 + (z < -50 && Math.abs(x) < 120 ? 0.12 : 0) ||
      !spotOk(x, z, 0.5, 4) ||
      !tallOk(x, z)
    )
      continue;
    if (slopeAt(x, z) > 0.7) continue;
    const h = 12 + 10 * r();
    const c = inst(x, z, h, 0.55 + 0.12 * r(), r);
    plan.conifers.push(c);
    blob(c, h * 0.16, 0.25);
  }
  tries = 0;
  while (plan.forest.length < SCENERY.trees.conifersFar && tries++ < 16000) {
    const ang = r() * Math.PI * 2;
    const d = 160 + r() * 1100;
    const x = -6 + Math.cos(ang) * d * 1.25;
    const z = -20 + Math.sin(ang) * d;
    const f = forestMask(x, z);
    if (r() > f * 1.3 || waterDistance(x, z) < 12 || nearRoad(x, z)) continue;
    const h = 13 + 11 * r();
    plan.forest.push(inst(x, z, h, 0.62 + 0.15 * r(), r));
  }

  // ---- shrubs: along the lanes and the bank tops, in loose groups
  tries = 0;
  while (plan.shrubs.length < SCENERY.trees.shrubs && tries++ < 4000) {
    const x = -90 + r() * 200;
    const z = -42 + r() * 90;
    if (fbm(x * 0.05 + 3, z * 0.05 - 2, 2) < 0.52) continue;
    if (z > 22 || !spotOk(x, z, 0.8, 1) || padDistance(x, z) < 1.6) continue; // the open meadow of the south bank stays clear
    if (homeCorridorDistance(x, z) < SCENERY.homeCorridor * 0.6) continue;
    const s = 1.0 + 1.0 * r();
    const sh = inst(x, z, s, 1.3, r);
    plan.shrubs.push(sh);
    blob(sh, s * 0.7, 0.14);
  }

  // ---- reeds and cattails along the banks, outside the openings
  const bankReeds = (zEdge: number, dir: 1 | -1, x0: number, x1: number, n: number) => {
    for (let i = 0, t = 0; i < n && t < n * 14; t++) {
      const x = x0 + r() * (x1 - x0);
      const z = zEdge + dir * (0.3 + r() * 1.3);
      const wd = waterDistance(x, z);
      if (wd < 0.25 || wd > 1.8 || padDistance(x, z) < 0.2) continue;
      if (x > 6.5 && x < 17.5 && dir > 0) continue; // the fish pass
      if (x > 8 && x < 13.5 && dir < 0) continue; // the weir's abutment
      plan.reeds.push(inst(x, z, 0.9 + 0.7 * r(), 1, r));
      i++;
    }
  };
  bankReeds(12, 1, 18, 156, 34);
  bankReeds(0, -1, 22, 156, 30);
  bankReeds(12, 1, -156, 6, 28);
  bankReeds(0, -1, -156, -38, 22);
  bankReeds(0, -1, -4, 6, 5);

  // ---- tufts of grass and wildflowers in the meadows, rocks on the banks and the slopes
  tries = 0;
  while (plan.tufts.length < 950 && tries++ < 9000) {
    const x = -70 + r() * 150;
    const z = -45 + r() * 92;
    if (!spotOk(x, z, 0.1, 0) || padDistance(x, z) < 0.6 || trackDistance(x, z).d < 0.5) continue;
    if (fbm(x * 0.08 + 1, z * 0.08, 2) < 0.4 && r() > 0.3) continue;
    if (homeCorridorDistance(x, z) < 4 && r() > 0.5) continue;
    plan.tufts.push(inst(x, z, 0.5 + 0.5 * r(), 1, r));
  }
  tries = 0;
  while (plan.flowers.length < 520 && tries++ < 12000) {
    const x = -75 + r() * 160;
    const z = -45 + r() * 95;
    if (!spotOk(x, z, 0.1, 0) || padDistance(x, z) < 0.9 || trackDistance(x, z).d < 0.4) continue;
    const patch = fbm(x * 0.07 + 11, z * 0.07 - 4, 3);
    if (patch < 0.58) continue;
    const f = inst(x, z, 0.35 + 0.3 * r(), 1, r);
    f.tint = (Math.floor(patch * 17) % 4) / 3 + 0.04 * r();
    plan.flowers.push(f);
  }
  tries = 0;
  while (plan.rocks.length < 50 && tries++ < 6000) {
    const bank = r() < 0.6;
    let x: number;
    let z: number;
    if (bank) {
      x = -150 + r() * 300;
      const south = r() < 0.5;
      z = south ? 12 + 0.7 + r() * 0.6 : -0.7 - r() * 0.6;
      if (Math.abs(x) < 38 && !south && x > -38 && x < 22) z = -0.7 - r() * 0.6;
    } else {
      x = -90 + r() * 200;
      z = -60 + r() * 82;
    }
    const s = bank ? 0.3 + 0.5 * r() : 0.35 + 0.9 * r();
    if (waterDistance(x, z) < s * 0.9 + 0.1 || padDistance(x, z) < 1.2 || trackDistance(x, z).d < s) continue;
    if (x > 6.5 && x < 17.5 && z > 6) continue;
    if (!bank && fbm(x * 0.05, z * 0.05, 2) < 0.5) continue;
    if (nearRoad(x, z)) continue;
    const rk = inst(x, z, s, 1, r);
    plan.rocks.push(rk);
    blob(rk, s * 1.1, 0.12);
  }
  return plan;
}

/** The z of a track's centre line at x (the track is a polyline of terrain.ts that runs along x here). */
function laneZ(track: number, x: number): number {
  const pts = TRACKS[track].pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    if ((x - ax) * (x - bx) <= 0) return az + ((bz - az) * (x - ax)) / (bx - ax);
  }
  return pts[pts.length - 1][1];
}

// ------------------------------------------------------------------------------------------------ the meshes

export interface Vegetation {
  group: THREE.Group;
  /** Instanced meshes by species (for the tests and the budget). */
  meshes: THREE.InstancedMesh[];
  counts: Record<string, number>;
}

const tints = [C(0xf3f0dc), C(0xdfe8c2), C(0xffffff), C(0xe7efcf), C(0xd6e3b3), C(0xf0e6b8), C(0xcfe0b4)];

/** Alpha cards are lit like the ground: do not flip the normal on the back face. */
function keepNormalUp(mat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey();
  mat.customProgramCacheKey = () => `${prevKey}|up`;
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      '#include <normal_fragment_begin>\n  normal = normalize( vNormal );',
    );
  };
  return mat;
}

export function buildVegetation(plan: VegetationPlan): Vegetation {
  const tex = sceneryTextures();
  const group = new THREE.Group();
  group.name = 'vegetation';
  const meshes: THREE.InstancedMesh[] = [];
  const counts: Record<string, number> = {};
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qLean = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const colour = new THREE.Color();

  const barkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex.bark, vertexColors: true, roughness: 1 });
  const leafMat = (flutter = 0.004, amp = 0.014) =>
    patchWind(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.leaves,
        vertexColors: true,
        roughness: 0.95,
        side: THREE.DoubleSide,
      }),
      { amp, flutter, speed: 1.1 },
    );
  const strandMat = patchWind(
    new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }),
    { amp: 0.02, flutter: 0.0, speed: 0.9 },
  );

  const make = (
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    list: Inst[],
    opts: { shadow?: boolean; tint?: (i: Inst) => THREE.Color; size: (i: Inst, s: THREE.Vector3) => void },
  ): THREE.InstancedMesh | null => {
    if (list.length === 0) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    im.name = name;
    list.forEach((it, i) => {
      q.setFromAxisAngle(up, it.rot);
      if (it.lean > 0) {
        // lean towards leanDir: a turn about the horizontal axis up x d
        axis.set(Math.sin(it.leanDir), 0, -Math.cos(it.leanDir));
        qLean.setFromAxisAngle(axis, it.lean);
        q.premultiply(qLean);
      }
      opts.size(it, scl);
      pos.set(it.x, it.y - 0.05, it.z);
      m4.compose(pos, q, scl);
      im.setMatrixAt(i, m4);
      im.setColorAt(i, opts.tint ? opts.tint(it) : colour.set(0xffffff));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = opts.shadow ?? false;
    im.receiveShadow = true;
    im.frustumCulled = false;
    im.userData.noShadow = !opts.shadow;
    counts[name] = list.length;
    group.add(im);
    meshes.push(im);
    return im;
  };
  const treeSize = (it: Inst, s: THREE.Vector3) => s.set(it.s * it.w, it.s, it.s * it.w);
  const leafTint = (it: Inst) =>
    colour.copy(tints[Math.floor(it.tint * tints.length) % tints.length]).multiplyScalar(0.92 + 0.16 * it.tint);
  const woodTint = () => colour.set(0xffffff);

  const willow = willowGeometry();
  make('willow-wood', willow.wood, barkMat, plan.willows, { shadow: true, size: treeSize, tint: woodTint });
  make('willow-leaves', willow.leaves, strandMat, plan.willows, { shadow: true, size: treeSize, tint: leafTint });
  const poplar = poplarGeometry();
  make('poplar-wood', poplar.wood, barkMat, plan.poplars, { shadow: true, size: treeSize, tint: woodTint });
  make('poplar-leaves', poplar.leaves, leafMat(0.004, 0.012), plan.poplars, {
    shadow: true,
    size: treeSize,
    tint: leafTint,
  });
  const oak = oakGeometry();
  make('oak-wood', oak.wood, barkMat, plan.oaks, { shadow: true, size: treeSize, tint: woodTint });
  make('oak-leaves', oak.leaves, leafMat(), plan.oaks, { shadow: true, size: treeSize, tint: leafTint });
  const con = coniferGeometry(6, 7, true);
  make('conifer-wood', con.wood!, barkMat, plan.conifers, { shadow: true, size: treeSize, tint: woodTint });
  const coniferMat = patchWind(
    new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }),
    { amp: 0.008, flutter: 0.0, speed: 1.0 },
  );
  make('conifer-leaves', con.leaves, coniferMat, plan.conifers, {
    shadow: true,
    size: treeSize,
    tint: (it) => colour.setHSL(0.3 + 0.03 * it.tint, 0.28, 0.9 + 0.2 * it.tint),
  });
  make(
    'forest',
    farConiferGeometry(),
    new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1 }),
    plan.forest,
    {
      size: treeSize,
      tint: (it) => colour.setHSL(0.3 + 0.04 * it.tint, 0.22, 0.82 + 0.25 * it.tint),
    },
  );
  make('shrubs', shrubGeometry(), leafMat(0.003, 0.02), plan.shrubs, {
    shadow: false,
    size: (it, s) => s.set(it.s * it.w, it.s, it.s * it.w),
    tint: (it) => colour.copy(tints[Math.floor(it.tint * tints.length) % tints.length]).multiplyScalar(0.9),
  });
  make(
    'rocks',
    rockGeometry(),
    new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1 }),
    plan.rocks,
    {
      shadow: true,
      size: (it, s) =>
        s.set(it.s * (0.9 + 0.5 * it.tint), it.s * (0.7 + 0.4 * (1 - it.tint)), it.s * (0.8 + 0.5 * it.tint)),
      tint: (it) => colour.setHSL(0.09 + 0.03 * it.tint, 0.08, 0.5 + 0.22 * it.tint),
    },
  );
  const card = (map: THREE.Texture) =>
    keepNormalUp(
      patchWind(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map,
          vertexColors: true,
          alphaTest: 0.42,
          side: THREE.DoubleSide,
          roughness: 1,
        }),
        { amp: 0.09, speed: 1.6 },
      ),
    );
  make('reeds', cardGeometry(1.0, 1.25, 3), card(tex.reeds), plan.reeds, {
    size: (it, s) => s.set(it.s, it.s, it.s),
    tint: (it) => colour.setHSL(0.22 + 0.03 * it.tint, 0.2, 0.86 + 0.18 * it.tint),
  });
  make('tufts', cardGeometry(0.6, 0.5, 2), card(tex.tuft), plan.tufts, {
    size: (it, s) => s.set(it.s, it.s, it.s),
    tint: (it) => colour.setHSL(0.24 + 0.04 * it.tint, 0.2, 0.84 + 0.22 * it.tint),
  });
  const flowerColours = [0xffffff, 0xffd84a, 0xe9a6ff, 0xff9fb6];
  make('flowers', cardGeometry(0.26, 0.5, 2), card(tex.flowers), plan.flowers, {
    size: (it, s) => s.set(it.s, it.s, it.s),
    tint: (it) => colour.set(flowerColours[Math.min(3, Math.floor(it.tint * 4))]),
  });
  return { group, meshes, counts };
}
