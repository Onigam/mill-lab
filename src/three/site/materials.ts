import * as THREE from 'three';
import { rng } from '@onigam/lab-kit/three';
import { smoothstep } from '../common';

// Procedural materials of the scenery of the `site` world: no texture file, every map is generated at start-up from a seeded lattice
// of noise and stored as a DataTexture (no canvas, so it also builds in Node under vitest). Stone with mortar and per-block variation,
// render, clay tiles, slate, corrugated sheet, planks, bark, the detail of the ground (grass, gravel, soil in the three channels of one
// map) and the alpha sprites of reeds, grass and flowers. The shader patches (`patchDetail`, `patchWind`) keep the materials plain
// `MeshStandardMaterial`s, so the kit's isolate, ghost and X-ray modes (which swap materials) and the shadows work as before.
// The generation is cached: the textures are made once per page.

// ------------------------------------------------------------------------------------------------ noise

const LN = 256;
const lattice = (() => {
  const r = rng(90210);
  const a = new Float32Array(LN * LN);
  for (let i = 0; i < a.length; i++) a[i] = r();
  return a;
})();

const sm = (t: number) => t * t * (3 - 2 * t);

/** Smooth value noise in 0..1 (any real x, y; the lattice repeats every 256 cells). */
export function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = sm(x - ix);
  const fy = sm(y - iy);
  const x0 = ix & 255;
  const x1 = (ix + 1) & 255;
  const y0 = (iy & 255) * LN;
  const y1 = ((iy + 1) & 255) * LN;
  const a = lattice[y0 + x0];
  const b = lattice[y0 + x1];
  const c = lattice[y1 + x0];
  const d = lattice[y1 + x1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Fractal noise in about 0..1. */
export function fbm(x: number, y: number, octaves = 4, gain = 0.5): number {
  let s = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    s += amp * vnoise(x * f + o * 17.3, y * f + o * 9.1);
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return s / norm;
}

/** Value noise that repeats every `px` cells in x and `py` in y (at most 256): for tileable textures. */
function tn(x: number, y: number, px: number, py: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = sm(x - ix);
  const fy = sm(y - iy);
  const x0 = ((ix % px) + px) % px;
  const x1 = (x0 + 1) % px;
  const y0 = (((iy % py) + py) % py) * LN;
  const y1 = (((((iy % py) + py) % py) + 1) % py) * LN;
  const a = lattice[y0 + x0];
  const b = lattice[y0 + x1];
  const c = lattice[y1 + x0];
  const d = lattice[y1 + x1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Tileable fractal noise: `cells` lattice cells across the unit square at the first octave, the next ones twice as many. */
function tf(u: number, v: number, cells: number, octaves = 3, cellsY = cells): number {
  let s = 0;
  let amp = 0.5;
  let norm = 0;
  let cx = cells;
  let cy = cellsY;
  for (let o = 0; o < octaves; o++) {
    s += amp * tn(u * cx + o * 3.7, v * cy + o * 1.9, cx, cy);
    norm += amp;
    amp *= 0.5;
    cx *= 2;
    cy *= 2;
  }
  return s / norm;
}

const hash1 = (a: number, b: number): number => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

// ------------------------------------------------------------------------------------------------ textures

export interface TextureStat {
  name: string;
  w: number;
  h: number;
  bytes: number;
}
const stats: TextureStat[] = [];
let genMs = 0;

function dataTexture(
  name: string,
  w: number,
  h: number,
  data: Uint8Array,
  srgb: boolean,
  repeat = true,
): THREE.DataTexture {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  else t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.name = name;
  t.needsUpdate = true;
  stats.push({ name, w, h, bytes: Math.round(w * h * 4 * (4 / 3)) });
  return t;
}

const b8 = (x: number): number => Math.max(0, Math.min(255, Math.round(x * 255)));
/** The sRGB components (0..1) of a hex colour: the maps hold sRGB bytes. */
const toLin = (hex: number): [number, number, number] => [
  ((hex >> 16) & 255) / 255,
  ((hex >> 8) & 255) / 255,
  (hex & 255) / 255,
];

/** Colour of the transparent texels of a sprite: the mipmaps would otherwise blend the edge with black. */
function bleed(data: Uint8Array, hex: number): void {
  const c = toLin(hex);
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] === 0) {
      data[i] = b8(c[0]);
      data[i + 1] = b8(c[1]);
      data[i + 2] = b8(c[2]);
    }
}

/** Mean of each of the three detail channels is 0.5: the shader multiplies by 4 · a · b so that the mean is neutral. */
function groundDetail(): THREE.DataTexture {
  const N = 192;
  const data = new Uint8Array(N * N * 4);
  // pebbles: jittered points on a 12 x 12 grid
  const G = 12;
  const px = new Float32Array(G * G);
  const py = new Float32Array(G * G);
  const tone = new Float32Array(G * G);
  const r = rng(31);
  for (let i = 0; i < G * G; i++) {
    px[i] = 0.2 + 0.6 * r();
    py[i] = 0.2 + 0.6 * r();
    tone[i] = r();
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const v = j / N;
      // grass: fine isotropic grain with short vertical blade streaks
      const blade = tn(u * 120, v * 40, 120, 40);
      const grass = 0.5 + 0.5 * ((tf(u, v, 28, 2) - 0.5) * 0.8 + (blade - 0.5) * 0.36 + (hash1(i, j) - 0.5) * 0.12);
      // gravel: distance to the nearest of the jittered points
      const gx = u * G;
      const gy = v * G;
      const cx = Math.floor(gx);
      const cy = Math.floor(gy);
      let best = 9;
      let id = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const wx = (((cx + dx) % G) + G) % G;
          const wy = (((cy + dy) % G) + G) % G;
          const k = wy * G + wx;
          const ex = cx + dx + px[k] - gx;
          const ey = cy + dy + py[k] - gy;
          const d = ex * ex + ey * ey;
          if (d < best) {
            best = d;
            id = k;
          }
        }
      const peb = 1 - smoothstep(0.16, 0.46, Math.sqrt(best));
      const gravel = 0.34 + 0.44 * peb * (0.72 + 0.28 * tone[id]) + 0.06 * (hash1(i * 3, j) - 0.5);
      // soil: clods and a little grain
      const soil = 0.5 + 0.62 * (tf(u, v, 9, 4) - 0.5) + 0.12 * (hash1(i, j * 7) - 0.5);
      const o = (j * N + i) * 4;
      data[o] = b8(Math.min(0.95, grass));
      data[o + 1] = b8(Math.min(0.95, gravel));
      data[o + 2] = b8(Math.min(0.95, soil));
      data[o + 3] = 255;
    }
  }
  return dataTexture('ground-detail', N, N, data, false);
}

interface Courses {
  size: number; // pixels
  tile: number; // metres
  rowH: [number, number];
  stoneW: [number, number];
  mortar: number;
  palette: number[];
  mortarColour: number;
  seed: number;
  warp: number;
  bulge: number;
}

/** Courses of stones with mortar between: irregular rubble (random rows and lengths) or dressed ashlar (regular). Returns albedo and height. */
function coursedStone(name: string, o: Courses): { albedo: THREE.DataTexture; height: THREE.DataTexture } {
  const N = o.size;
  const r = rng(o.seed);
  const mpp = o.tile / N; // metres per pixel
  const rows: { y0: number; y1: number; stones: { x0: number; x1: number; id: number }[] }[] = [];
  let y = 0;
  const rh: number[] = [];
  while (y < o.tile - 0.05) {
    const h = o.rowH[0] + r() * (o.rowH[1] - o.rowH[0]);
    rh.push(h);
    y += h;
  }
  const kY = o.tile / rh.reduce((a, b) => a + b, 0);
  y = 0;
  let sid = 0;
  for (const h0 of rh) {
    const h = h0 * kY;
    const ws: number[] = [];
    let x = 0;
    while (x < o.tile - 0.05) {
      const w = o.stoneW[0] + r() * (o.stoneW[1] - o.stoneW[0]);
      ws.push(w);
      x += w;
    }
    const kX = o.tile / ws.reduce((a, b) => a + b, 0);
    const stones: { x0: number; x1: number; id: number }[] = [];
    let xx = r() * 0.3;
    for (const w0 of ws) {
      const w = w0 * kX;
      stones.push({ x0: xx, x1: xx + w, id: sid++ });
      xx += w;
    }
    rows.push({ y0: y, y1: y + h, stones });
    y += h;
  }
  const alb = new Uint8Array(N * N * 4);
  const hgt = new Uint8Array(N * N * 4);
  const pal = o.palette.map(toLin);
  const mort = toLin(o.mortarColour);
  // lookup tables: the row of a pixel row, and for each row the stone of a pixel column (the columns run over two tiles: the rows are offset)
  const rowOf = new Int16Array(N);
  for (let j = 0; j < N; j++) {
    const ym = ((j + 0.5) * mpp) % o.tile;
    rowOf[j] = Math.max(
      0,
      rows.findIndex((rw) => ym < rw.y1),
    );
  }
  const stoneOf = rows.map((rw) => {
    const t = new Int16Array(2 * N);
    for (let i = 0; i < 2 * N; i++) {
      const xs = (i + 0.5) * mpp;
      let k = rw.stones.findIndex((s) => xs < s.x1);
      if (k < 0) k = rw.stones.length - 1;
      t[i] = k;
    }
    return t;
  });
  for (let j = 0; j < N; j++) {
    const v = j / N;
    for (let i = 0; i < N; i++) {
      const u = i / N;
      // the mortar lines are not straight: warp the position with a little tileable noise
      const wx = (tn(u * 14, v * 14, 14, 14) - 0.5) * o.warp;
      const wy = (tn(u * 14 + 5.3, v * 14 + 2.1, 14, 14) - 0.5) * o.warp;
      const xm = (((u * o.tile + wx) % o.tile) + o.tile) % o.tile;
      const ym = (((v * o.tile + wy) % o.tile) + o.tile) % o.tile;
      const row = rows[rowOf[Math.min(N - 1, Math.floor(ym / mpp))]];
      let xs = xm;
      if (xs < row.stones[0].x0) xs += o.tile;
      const st =
        row.stones[stoneOf[rowOf[Math.min(N - 1, Math.floor(ym / mpp))]][Math.min(2 * N - 1, Math.floor(xs / mpp))]];
      const dx = Math.min(xs - st.x0, st.x1 - xs);
      const dy = Math.min(ym - row.y0, row.y1 - ym);
      const d = Math.min(dx, dy);
      const e = smoothstep(o.mortar * 0.6, o.mortar + 0.045, d);
      const inMortar = d < o.mortar ? 1 : 0;
      const hw = (st.x1 - st.x0) / 2;
      const hh = (row.y1 - row.y0) / 2;
      const nx = (xs - (st.x0 + st.x1) / 2) / hw;
      const ny = (ym - (row.y0 + row.y1) / 2) / hh;
      const dome = 1 - o.bulge * (nx * nx + ny * ny) * 0.5;
      const grain = tf(u, v, 40, 2);
      const base = pal[st.id % pal.length];
      const tv = 0.86 + 0.28 * hash1(st.id, 5);
      const shade = tv * (0.9 + 0.2 * grain);
      const k = (j * N + i) * 4;
      const m = 0.92 + 0.14 * grain;
      alb[k] = b8(inMortar ? mort[0] * m : base[0] * shade);
      alb[k + 1] = b8(inMortar ? mort[1] * m : base[1] * shade);
      alb[k + 2] = b8(inMortar ? mort[2] * m : base[2] * shade);
      alb[k + 3] = 255;
      const hv = inMortar ? 0.08 + 0.08 * grain : (0.45 + 0.5 * e) * (0.82 + 0.18 * dome) * (0.9 + 0.1 * grain);
      hgt[k] = hgt[k + 1] = hgt[k + 2] = b8(hv);
      hgt[k + 3] = 255;
    }
  }
  return {
    albedo: dataTexture(`${name}-albedo`, N, N, alb, true),
    height: dataTexture(`${name}-height`, N, N, hgt, false),
  };
}

/** Clay tiles in rows on a pitched roof: u along the ridge (0.9 m = five tiles), v down the slope (1.2 m = four rows). */
function clayTiles(): { albedo: THREE.DataTexture; height: THREE.DataTexture } {
  const N = 256;
  const alb = new Uint8Array(N * N * 4);
  const hgt = new Uint8Array(N * N * 4);
  const cols = 5;
  const rowsN = 4;
  const clay = [0xb0583a, 0xa84e33, 0xbd6443, 0x9f4a31, 0xb85d3c, 0xc0714c].map(toLin);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const v = j / N;
      const c = Math.floor(u * cols);
      const rr = Math.floor(v * rowsN);
      const cu = u * cols - c;
      let rv = v * rowsN - rr;
      // alternate rows are shifted by half a tile
      const shift = rr % 2 ? 0.5 : 0;
      const cu2 = (cu + shift) % 1;
      const c2 = (c + (cu + shift >= 1 ? 1 : 0)) % cols;
      // convex ridge of the tile and the step where the tile above overlaps the one below
      const ridge = Math.sin(Math.PI * cu2);
      rv = Math.min(1, rv);
      const lap = smoothstep(0, 0.16, rv) * (1 - 0.55 * smoothstep(0.82, 1, rv));
      const h = (0.3 + 0.55 * ridge) * (0.55 + 0.45 * lap) + 0.12 * lap;
      const tone = hash1(c2 + rr * 7, rr * 13 + 3);
      const base = clay[Math.floor(tone * clay.length) % clay.length];
      const dirt = tf(u, v, 24, 3);
      const moss = smoothstep(0.62, 0.8, tf(u + 0.2, v + 0.6, 7, 3)) * 0.35;
      const ao = (0.5 + 0.5 * ridge) * (0.55 + 0.45 * smoothstep(0, 0.22, rv)) * (0.9 + 0.1 * dirt);
      const k = (j * N + i) * 4;
      alb[k] = b8((base[0] * (1 - moss) + 0.34 * moss) * ao * 1.1);
      alb[k + 1] = b8((base[1] * (1 - moss) + 0.42 * moss) * ao * 1.1);
      alb[k + 2] = b8((base[2] * (1 - moss) + 0.25 * moss) * ao * 1.1);
      alb[k + 3] = 255;
      hgt[k] = hgt[k + 1] = hgt[k + 2] = b8(h);
      hgt[k + 3] = 255;
    }
  }
  return {
    albedo: dataTexture('tiles-albedo', N, N, alb, true),
    height: dataTexture('tiles-height', N, N, hgt, false),
  };
}

/** Slates in staggered rows: u along the ridge (1.2 m = four slates), v down the slope (1.0 m = five rows). */
function slateTiles(): { albedo: THREE.DataTexture; height: THREE.DataTexture } {
  const N = 192;
  const alb = new Uint8Array(N * N * 4);
  const hgt = new Uint8Array(N * N * 4);
  const cols = 4;
  const rowsN = 5;
  const slate = [0x4a5058, 0x535a63, 0x434950, 0x4d545c, 0x5a6068].map(toLin);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const v = j / N;
      const rr = Math.floor(v * rowsN);
      const rv = v * rowsN - rr;
      const sh = rr % 2 ? 0.5 : 0;
      const uu = (u * cols + sh) % cols;
      const c = Math.floor(uu);
      const cu = uu - c;
      const edge = Math.min(cu, 1 - cu) * 8;
      const gap = 1 - smoothstep(0.03, 0.14, Math.min(cu, 1 - cu));
      const lap = smoothstep(0, 0.12, rv);
      const h = (0.45 + 0.4 * lap) * (1 - 0.35 * gap) + 0.12 * Math.min(1, edge);
      const tone = hash1(c + rr * 5 + (rr % 2 ? 11 : 0), rr + 21);
      const base = slate[Math.floor(tone * slate.length) % slate.length];
      const n = tf(u, v, 30, 3);
      const stain = smoothstep(0.6, 0.78, tf(u + 0.4, v, 6, 3)) * 0.18;
      const ao = (0.62 + 0.38 * lap) * (1 - 0.4 * gap) * (0.88 + 0.2 * n) * (1 - stain);
      const k = (j * N + i) * 4;
      alb[k] = b8(base[0] * ao * 1.25);
      alb[k + 1] = b8(base[1] * ao * 1.25);
      alb[k + 2] = b8(base[2] * ao * 1.25);
      alb[k + 3] = 255;
      hgt[k] = hgt[k + 1] = hgt[k + 2] = b8(h);
      hgt[k + 3] = 255;
    }
  }
  return {
    albedo: dataTexture('slate-albedo', N, N, alb, true),
    height: dataTexture('slate-height', N, N, hgt, false),
  };
}

/** Corrugated sheet: ribs along v, ten ribs across the tile (0.76 m). */
function corrugated(): { albedo: THREE.DataTexture; height: THREE.DataTexture } {
  const N = 128;
  const alb = new Uint8Array(N * N * 4);
  const hgt = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const v = j / N;
      const rib = 0.5 + 0.5 * Math.sin(2 * Math.PI * u * 10);
      const streak = tf(u, v, 18, 3, 3);
      const tone = 0.62 + 0.18 * rib + 0.12 * (streak - 0.5);
      const k = (j * N + i) * 4;
      alb[k] = b8(tone * 0.86);
      alb[k + 1] = b8(tone * 0.9);
      alb[k + 2] = b8(tone * 0.94);
      alb[k + 3] = 255;
      hgt[k] = hgt[k + 1] = hgt[k + 2] = b8(0.2 + 0.7 * rib);
      hgt[k + 3] = 255;
    }
  return {
    albedo: dataTexture('sheet-albedo', N, N, alb, true),
    height: dataTexture('sheet-height', N, N, hgt, false),
  };
}

/** Render (lime plaster): a warm light surface with blotches and a fine grain. Tile 1.6 m. */
function plaster(): { albedo: THREE.DataTexture; height: THREE.DataTexture } {
  const N = 128;
  const alb = new Uint8Array(N * N * 4);
  const hgt = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const v = j / N;
      const blot = tf(u, v, 5, 3);
      const grain = hash1(i, j);
      const crack = smoothstep(0.48, 0.5, Math.abs(tf(u, v, 6, 2) - 0.5));
      const t = 0.9 + 0.16 * (blot - 0.5) + 0.05 * (grain - 0.5) - 0.04 * (1 - crack);
      const k = (j * N + i) * 4;
      alb[k] = b8(t);
      alb[k + 1] = b8(t * 0.985);
      alb[k + 2] = b8(t * 0.95);
      alb[k + 3] = 255;
      hgt[k] = hgt[k + 1] = hgt[k + 2] = b8(0.5 + 0.35 * (tf(u, v, 30, 3) - 0.5) + 0.2 * (grain - 0.5));
      hgt[k + 3] = 255;
    }
  return {
    albedo: dataTexture('plaster-albedo', N, N, alb, true),
    height: dataTexture('plaster-height', N, N, hgt, false),
  };
}

/** Planks with the grain along v: 0.8 m square, four planks across. */
function planks(): { albedo: THREE.DataTexture; height: THREE.DataTexture } {
  const N = 256;
  const alb = new Uint8Array(N * N * 4);
  const hgt = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const v = j / N;
      const p = Math.floor(u * 4);
      const pu = u * 4 - p;
      const gap = 1 - smoothstep(0.012, 0.05, Math.min(pu, 1 - pu));
      const g1 = tn(u * 4 * 3 + p * 5, v * 5 + p * 2, 12, 5);
      const ring = 0.5 + 0.5 * Math.sin((g1 * 9 + tn(u * 60, v * 3, 60, 3)) * Math.PI * 2);
      const tone = 0.66 + 0.2 * (hash1(p, 9) - 0.5) + 0.12 * (ring - 0.5) + 0.06 * (tn(u * 120, v * 4, 120, 4) - 0.5);
      const t = tone * (1 - 0.6 * gap);
      const k = (j * N + i) * 4;
      alb[k] = b8(t * 1.02);
      alb[k + 1] = b8(t * 0.9);
      alb[k + 2] = b8(t * 0.74);
      alb[k + 3] = 255;
      hgt[k] = hgt[k + 1] = hgt[k + 2] = b8((0.55 + 0.18 * (ring - 0.5)) * (1 - 0.8 * gap));
      hgt[k + 3] = 255;
    }
  return {
    albedo: dataTexture('planks-albedo', N, N, alb, true),
    height: dataTexture('planks-height', N, N, hgt, false),
  };
}

/** Bark: vertical furrows, a darker crevice between ridges. Tile 128 wide, 256 high. */
function bark(): THREE.DataTexture {
  const W = 128;
  const H = 256;
  const data = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const u = i / W;
      const v = j / H;
      const f = tn(u * 10, v * 3, 10, 3) * 0.7 + tn(u * 22 + 4, v * 9, 22, 9) * 0.3;
      const ridge = smoothstep(0.3, 0.7, f);
      const t = 0.32 + 0.68 * ridge;
      const k = (j * W + i) * 4;
      data[k] = b8(t * 0.95);
      data[k + 1] = b8(t * 0.9);
      data[k + 2] = b8(t * 0.86);
      data[k + 3] = 255;
    }
  return dataTexture('bark', W, H, data, true);
}

/** Leaves: a light speckle around 0.82, multiplied by the vertex and instance colours. Tile 1 m. */
function leaves(): THREE.DataTexture {
  const N = 128;
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const v = j / N;
      const t = 0.82 + 0.5 * ((tf(u, v, 22, 3) - 0.5) * 0.9 + (hash1(i, j) - 0.5) * 0.5);
      const k = (j * N + i) * 4;
      data[k] = b8(Math.min(1, t * 0.97));
      data[k + 1] = b8(Math.min(1, t));
      data[k + 2] = b8(Math.min(1, t * 0.92));
      data[k + 3] = 255;
    }
  return dataTexture('leaves', N, N, data, true);
}

function paintBlade(
  data: Uint8Array,
  W: number,
  H: number,
  x0: number,
  lean: number,
  height: number,
  w0: number,
  col: [number, number, number],
): void {
  for (let j = 0; j < H; j++) {
    const t = j / H; // 0 at the bottom
    if (t > height) continue;
    const y = H - 1 - j;
    const k = t / height;
    const cx = x0 + lean * k * k * W;
    const hw = Math.max(0.35, w0 * (1 - k * 0.92));
    for (let i = Math.floor(cx - hw - 1); i <= Math.ceil(cx + hw + 1); i++) {
      if (i < 0 || i >= W) continue;
      const a = Math.min(1, Math.max(0, hw + 0.5 - Math.abs(i - cx)));
      if (a <= 0) continue;
      const o = (y * W + i) * 4;
      if (a * 255 < data[o + 3]) continue;
      const shade = 0.75 + 0.25 * k;
      data[o] = b8(col[0] * shade);
      data[o + 1] = b8(col[1] * shade);
      data[o + 2] = b8(col[2] * shade);
      data[o + 3] = b8(a);
    }
  }
}

/** A clump of reeds with a few cattails: RGBA sprite 64 x 128 (alpha cut out in the material). */
function reedSprite(): THREE.DataTexture {
  const W = 64;
  const H = 128;
  const data = new Uint8Array(W * H * 4);
  const r = rng(77);
  const green = toLin(0x6f9548);
  const green2 = toLin(0x86a652);
  for (let b = 0; b < 15; b++) {
    const x = 8 + r() * (W - 16);
    paintBlade(data, W, H, x, (r() - 0.5) * 0.5, 0.55 + r() * 0.42, 1.7 + r() * 0.9, r() < 0.5 ? green : green2);
  }
  // three cattails: a thin stem and a dark brown cylinder near the top
  for (const [x, top] of [
    [20, 0.9],
    [34, 0.8],
    [47, 0.7],
  ] as const) {
    paintBlade(data, W, H, x, (x - 32) * 0.004, top, 1.1, toLin(0x7f9b52));
    const yTop = Math.round(H * (1 - top));
    for (let j = yTop + 3; j < yTop + 20; j++)
      for (let i = x - 3; i <= x + 3; i++) {
        const o = (j * W + i) * 4;
        const e = Math.abs(i - x) / 3;
        if (e > 1) continue;
        const c = toLin(0x5a3a22);
        const s = 0.8 + 0.2 * (1 - e);
        data[o] = b8(c[0] * s);
        data[o + 1] = b8(c[1] * s);
        data[o + 2] = b8(c[2] * s);
        data[o + 3] = 255;
      }
  }
  bleed(data, 0x6f9548);
  return dataTexture('reeds', W, H, data, true, false);
}

/** A tuft of grass: RGBA sprite 64 x 64. */
function tuftSprite(): THREE.DataTexture {
  const W = 64;
  const H = 64;
  const data = new Uint8Array(W * H * 4);
  const r = rng(5);
  const cols = [toLin(0x7ea24a), toLin(0x93b158), toLin(0x6a8f3f), toLin(0xa3b45f)];
  for (let b = 0; b < 17; b++) {
    const x = 10 + r() * 44;
    paintBlade(data, W, H, x, (x - 32) * 0.006 + (r() - 0.5) * 0.3, 0.45 + r() * 0.5, 1.3 + r() * 0.8, cols[b % 4]);
  }
  bleed(data, 0x7ea24a);
  return dataTexture('tuft', W, H, data, true, false);
}

/** A wildflower head on a stem, white so that the instance colour paints it: RGBA 32 x 64. */
function flowerSprite(): THREE.DataTexture {
  const W = 32;
  const H = 64;
  const data = new Uint8Array(W * H * 4);
  paintBlade(data, W, H, 16, 0.02, 0.62, 0.9, toLin(0x6f9548));
  // the head: petals as a disc at the top, a yellow centre
  const cx = 16;
  const cy = 12;
  for (let j = 0; j < 24; j++)
    for (let i = 4; i < 28; i++) {
      const d = Math.hypot(i - cx, j - cy);
      const o = (j * W + i) * 4;
      if (d < 8.5) {
        const ang = Math.atan2(j - cy, i - cx);
        const petal = 0.82 + 0.18 * Math.cos(ang * 5);
        if (d < petal * 8.5) {
          const centre = d < 2.6;
          data[o] = centre ? 255 : 255;
          data[o + 1] = centre ? 214 : 255;
          data[o + 2] = centre ? 80 : 255;
          data[o + 3] = 255;
        }
      }
    }
  bleed(data, 0x6f9548);
  return dataTexture('flowers', W, H, data, true, false);
}

export interface SceneryTextures {
  ground: THREE.DataTexture;
  rubble: { albedo: THREE.DataTexture; height: THREE.DataTexture };
  ashlar: { albedo: THREE.DataTexture; height: THREE.DataTexture };
  coursed: { albedo: THREE.DataTexture; height: THREE.DataTexture };
  tiles: { albedo: THREE.DataTexture; height: THREE.DataTexture };
  slate: { albedo: THREE.DataTexture; height: THREE.DataTexture };
  sheet: { albedo: THREE.DataTexture; height: THREE.DataTexture };
  plaster: { albedo: THREE.DataTexture; height: THREE.DataTexture };
  planks: { albedo: THREE.DataTexture; height: THREE.DataTexture };
  bark: THREE.DataTexture;
  leaves: THREE.DataTexture;
  reeds: THREE.DataTexture;
  tuft: THREE.DataTexture;
  flowers: THREE.DataTexture;
}

let cache: SceneryTextures | null = null;
const timings: Record<string, number> = {};
const timed = <T>(name: string, fn: () => T): T => {
  const t0 = performance.now();
  const r = fn();
  timings[name] = Math.round((performance.now() - t0) * 10) / 10;
  return r;
};

/** The textures of the scenery, made once (about 35 ms on a laptop). */
export function sceneryTextures(): SceneryTextures {
  if (cache) return cache;
  const t0 = performance.now();
  cache = {
    ground: timed('ground', groundDetail),
    rubble: timed('rubble', () =>
      coursedStone('rubble', {
        size: 384,
        tile: 2.4,
        rowH: [0.17, 0.36],
        stoneW: [0.22, 0.62],
        mortar: 0.016,
        palette: [0xa39a8a, 0x9a9183, 0xb0a590, 0x8d8576, 0xaa9b82, 0x938c80, 0xb3aa98, 0x978f7d],
        mortarColour: 0xc4bdab,
        seed: 4,
        warp: 0.04,
        bulge: 0.55,
      }),
    ),
    ashlar: timed('ashlar', () =>
      coursedStone('ashlar', {
        size: 256,
        tile: 1.2,
        rowH: [0.29, 0.31],
        stoneW: [0.5, 0.9],
        mortar: 0.008,
        palette: [0xc9c1ae, 0xd0c8b5, 0xc3bba8, 0xcdc4af],
        mortarColour: 0xd9d3c4,
        seed: 9,
        warp: 0.006,
        bulge: 0.12,
      }),
    ),
    coursed: timed('coursed', () =>
      coursedStone('coursed', {
        size: 256,
        tile: 2.4,
        rowH: [0.22, 0.3],
        stoneW: [0.4, 0.8],
        mortar: 0.014,
        palette: [0x9d9a92, 0xa5a198, 0x93908a, 0xa9a59a, 0x989489],
        mortarColour: 0xbcb8ac,
        seed: 14,
        warp: 0.02,
        bulge: 0.3,
      }),
    ),
    tiles: timed('tiles', clayTiles),
    slate: timed('slate', slateTiles),
    sheet: timed('sheet', corrugated),
    plaster: timed('plaster', plaster),
    planks: timed('planks', planks),
    bark: timed('bark', bark),
    leaves: timed('leaves', leaves),
    reeds: timed('reeds', reedSprite),
    tuft: timed('tuft', tuftSprite),
    flowers: timed('flowers', flowerSprite),
  };
  genMs = performance.now() - t0;
  return cache;
}

/** What the textures cost: count, the largest side, bytes with mipmaps, milliseconds of generation. */
export function textureStats(): {
  count: number;
  maxSide: number;
  bytes: number;
  ms: number;
  list: TextureStat[];
  timings: Record<string, number>;
} {
  return {
    count: stats.length,
    maxSide: stats.reduce((m, s) => Math.max(m, s.w, s.h), 0),
    bytes: stats.reduce((a, s) => a + s.bytes, 0),
    ms: genMs,
    list: [...stats],
    timings: { ...timings },
  };
}

// ------------------------------------------------------------------------------------------------ UV helpers

/** Box projection of the UVs in metres (the face's two longest axes by the normal): a texture of `tileU` x `tileV` metres tiles at its true size. */
export function metricUV(g: THREE.BufferGeometry, tileU: number, tileV = tileU): THREE.BufferGeometry {
  const pos = g.attributes.position;
  if (!g.attributes.normal) g.computeVertexNormals();
  const nor = g.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    let a: number;
    let b: number;
    if (ax >= ay && ax >= az) {
      a = pos.getZ(i);
      b = pos.getY(i);
    } else if (ay >= az) {
      a = pos.getX(i);
      b = pos.getZ(i);
    } else {
      a = pos.getX(i);
      b = pos.getY(i);
    }
    uv[i * 2] = a / tileU;
    uv[i * 2 + 1] = b / tileV;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// ------------------------------------------------------------------------------------------------ shader patches

export interface DetailOptions {
  /** Metres per tile (the UVs of the geometry are already in tiles, except in triplanar mode where the position is divided by it). */
  tile: number;
  /** Project the map by the object-space position and the dominant axis of the normal (geometry without UVs: boxes, extrusions, the trough). */
  triplanar?: boolean;
  /** Height map for the bump (its red channel). */
  height?: THREE.Texture;
  /** Strength of the bump. */
  bump?: number;
  /** Darkening of the foot of a wall (object-space height `h`, strength 0..1, damp green tint). */
  foot?: { h: number; dark: number };
  /** Darkening under the eaves: object-space height of the eave, the height of the shaded band under it, strength 0..1. */
  eave?: { y: number; h: number; dark: number };
  /** Second look at the map, at this scale and shifted, multiplied in: breaks the repetition (0 = none). */
  macro?: number;
  /** The three channels of the map are three kinds of ground, picked by the vertex attribute `aMix` (the terrain). */
  mix?: boolean;
}

const PERTURB = /* glsl */ `
vec3 perturbDetail( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
  vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
  vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
  vec3 vN = surf_norm;
  vec3 R1 = cross( vSigmaY, vN );
  vec3 R2 = cross( vN, vSigmaX );
  float fDet = dot( vSigmaX, R1 ) * faceDirection;
  vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
  return normalize( abs( fDet ) * surf_norm - vGrad );
}
`;

/**
 * Give a standard material a map that is sampled by its UVs or by the object-space position, a bump from a separate height map, an optional
 * second scale of the map, a damp foot, and (terrain) three kinds of ground mixed by a vertex attribute. The material stays a plain
 * `MeshStandardMaterial` (the kit swaps materials for isolate, ghost and X-ray and drives `opacity` and `transparent`).
 */
export function patchDetail(mat: THREE.MeshStandardMaterial, o: DetailOptions): THREE.MeshStandardMaterial {
  const key = `detail:${o.triplanar ? 't' : 'u'}:${o.height ? 'h' : '-'}:${o.foot ? 'f' : '-'}:${o.eave ? 'e' : '-'}:${o.macro ? 'm' : '-'}:${o.mix ? 'x' : '-'}`;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTile = { value: o.tile };
    shader.uniforms.uMacro = { value: o.macro ?? 0 };
    shader.uniforms.uBump = { value: o.bump ?? 1 };
    shader.uniforms.uFoot = { value: new THREE.Vector2(o.foot?.h ?? 1, o.foot?.dark ?? 0) };
    shader.uniforms.uEave = { value: new THREE.Vector3(o.eave?.y ?? 0, o.eave?.h ?? 1, o.eave?.dark ?? 0) };
    if (o.height) shader.uniforms.uHeight = { value: o.height };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vOP;\nvarying vec3 vON;${o.mix ? '\nattribute vec3 aMix;\nvarying vec3 vMix;' : ''}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvOP = position;\nvON = normal;${o.mix ? '\nvMix = aMix;' : ''}`,
      );
    const head = `#include <common>
varying vec3 vOP;
varying vec3 vON;
uniform float uTile;
uniform float uMacro;
uniform float uBump;
uniform vec2 uFoot;
uniform vec3 uEave;
${o.height ? 'uniform sampler2D uHeight;' : ''}
${o.mix ? 'varying vec3 vMix;' : ''}
${PERTURB}`;
    const uvExpr = o.triplanar
      ? `vec3 an = abs( vON );
  vec2 duv = ( an.x > an.y && an.x > an.z ) ? vOP.zy : ( an.y > an.z ? vOP.xz : vOP.xy );
  duv /= uTile;`
      : 'vec2 duv = vMapUv;';
    const sample = o.mix
      ? `vec3 t1 = texture2D( map, duv ).rgb;
  float d1 = dot( t1, vMix );
  float d2 = 0.5;
  if ( uMacro > 0.0 ) d2 = dot( texture2D( map, duv * uMacro + vec2( 0.37, 0.61 ), 3.0 ).rgb, vMix );
  float detailH = d1;
  diffuseColor.rgb *= clamp( d1 * ( uMacro > 0.0 ? d2 * 4.0 : 2.0 ), 0.0, 2.2 );`
      : `vec4 sc = texture2D( map, duv );
  float detailH = 0.5;
  diffuseColor *= sc;
  if ( uMacro > 0.0 ) diffuseColor.rgb *= 0.78 + 0.44 * texture2D( map, duv * uMacro + vec2( 0.37, 0.61 ), 2.0 ).r;
  ${o.height ? 'detailH = texture2D( uHeight, duv ).r;' : ''}`;
    const foot = o.foot
      ? `{ float fh = smoothstep( 0.0, uFoot.x, vOP.y );
    diffuseColor.rgb *= mix( 1.0 - uFoot.y, 1.0, fh );
    diffuseColor.rgb = mix( diffuseColor.rgb * vec3( 0.86, 0.98, 0.84 ), diffuseColor.rgb, smoothstep( 0.0, uFoot.x * 0.5, vOP.y ) ); }`
      : '';
    const eave = o.eave
      ? 'diffuseColor.rgb *= 1.0 - uEave.z * smoothstep( uEave.x - uEave.y, uEave.x, vOP.y ) * ( 1.0 - smoothstep( uEave.x, uEave.x + 0.3, vOP.y ) );'
      : '';
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', head)
      .replace('#include <map_fragment>', `${uvExpr}\n  ${sample}\n  ${foot}\n  ${eave}`)
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\n  ${
          o.height || o.mix
            ? 'normal = perturbDetail( - vViewPosition, normal, vec2( dFdx( detailH ), dFdy( detailH ) ) * uBump * ( 1.0 - smoothstep( 20.0, 110.0, length( vViewPosition ) ) ), faceDirection );'
            : ''
        }`,
      );
  };
  return mat;
}

/** The clock of the wind (seconds), one uniform shared by every patched material: set `WIND.time.value` once a frame. */
export const WIND = { time: { value: 0 } };

export interface WindOptions {
  /** Sway where the vertex attribute `aSway` is 1, metres in the local frame of the instance (the instance scale multiplies it). */
  amp: number;
  speed?: number;
  /** A faster flutter on top (leaves), local units, also scaled by `aSway`. */
  flutter?: number;
}

/**
 * Sway of instanced plants: a few sines of the position in the field, scaled by the per-vertex attribute `aSway` (0 at the foot, 1 at the tip of a
 * blade or a branch). One uniform clock for all (`WIND.time`); the shadow pass does not sway (a few centimetres). A geometry without `aSway` stays still.
 */
export function patchWind(mat: THREE.MeshStandardMaterial, o: WindOptions): THREE.MeshStandardMaterial {
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey();
  const key = `${prevKey}|wind:${o.amp}:${o.speed ?? 1.2}:${o.flutter ?? 0}`;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    shader.uniforms.uWind = WIND.time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWind;\nattribute float aSway;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  {
    #ifdef USE_INSTANCING
      vec3 ip = vec3( instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2] );
    #else
      vec3 ip = vec3( 0.0 );
    #endif
    float ph = uWind * ${(o.speed ?? 1.2).toFixed(2)} + ip.x * 0.37 + ip.z * 0.29;
    float k = ${o.amp.toFixed(4)} * aSway;
    transformed.x += ( sin( ph ) + 0.45 * sin( ph * 2.3 + 1.7 ) ) * k;
    transformed.z += cos( ph * 0.83 + 0.6 ) * k * 0.7;
    ${o.flutter ? `transformed += vec3( sin( ph * 7.0 + position.x * 9.0 ), sin( ph * 6.1 + position.z * 8.0 ), cos( ph * 5.3 + position.y * 7.0 ) ) * ${o.flutter.toFixed(4)} * aSway;` : ''}
  }`,
      );
  };
  return mat;
}

// ------------------------------------------------------------------------------------------------ material factories

const std = (p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial(p);

/** Stone masonry of the structures (weir, canal and chamber walls, quay): projected by the object-space position, so any geometry takes it. */
export function masonryMaterial(kind: 'wall' | 'coping' = 'wall', tint = 0xffffff): THREE.MeshStandardMaterial {
  const t = sceneryTextures();
  const tex = kind === 'wall' ? t.coursed : t.ashlar;
  return patchDetail(std({ color: tint, map: tex.albedo, roughness: 0.94, metalness: 0 }), {
    tile: kind === 'wall' ? 2.4 : 1.2,
    triplanar: true,
    height: tex.height,
    bump: 2.2,
    macro: 0.21,
  });
}

/** Walls of the mill: rubble stone with a damp foot. UVs in metres (`metricUV(g, 2.4)`). */
export function rubbleMaterial(eaveY?: number): THREE.MeshStandardMaterial {
  const t = sceneryTextures().rubble;
  return patchDetail(std({ color: 0xffffff, map: t.albedo, roughness: 0.96, metalness: 0 }), {
    tile: 2.4,
    height: t.height,
    bump: 3.2,
    macro: 0.23,
    foot: { h: 1.5, dark: 0.34 },
    eave: eaveY === undefined ? undefined : { y: eaveY, h: 0.9, dark: 0.3 },
  });
}

/** Dressed stone: quoins, lintels, sills, plinth. UVs in metres (`metricUV(g, 1.2)`). */
export function ashlarMaterial(tint = 0xffffff): THREE.MeshStandardMaterial {
  const t = sceneryTextures().ashlar;
  return patchDetail(std({ color: tint, map: t.albedo, roughness: 0.9, metalness: 0 }), {
    tile: 1.2,
    height: t.height,
    bump: 1.6,
    macro: 0.31,
    foot: { h: 0.9, dark: 0.22 },
  });
}

/** Lime render: UVs in metres (`metricUV(g, 1.6)`). */
export function plasterMaterial(tint = 0xffffff, eaveY?: number): THREE.MeshStandardMaterial {
  const t = sceneryTextures().plaster;
  return patchDetail(std({ color: tint, map: t.albedo, roughness: 0.97, metalness: 0 }), {
    tile: 1.6,
    height: t.height,
    bump: 1.2,
    macro: 0.27,
    foot: { h: 1.1, dark: 0.3 },
    eave: eaveY === undefined ? undefined : { y: eaveY, h: 0.7, dark: 0.26 },
  });
}

/** Clay tiles, UVs `metricUV(g, 0.9, 1.2)`. */
export function tileMaterial(): THREE.MeshStandardMaterial {
  const t = sceneryTextures().tiles;
  return patchDetail(std({ color: 0xffffff, map: t.albedo, roughness: 0.82, metalness: 0 }), {
    tile: 1,
    height: t.height,
    bump: 5,
    macro: 0.19,
  });
}

/** Slates, UVs `metricUV(g, 1.2, 1.0)`. */
export function slateMaterial(): THREE.MeshStandardMaterial {
  const t = sceneryTextures().slate;
  return patchDetail(std({ color: 0xffffff, map: t.albedo, roughness: 0.62, metalness: 0.05 }), {
    tile: 1,
    height: t.height,
    bump: 4,
    macro: 0.17,
  });
}

/** Corrugated sheet, UVs `metricUV(g, 0.76)`. */
export function sheetMaterial(tint = 0xffffff): THREE.MeshStandardMaterial {
  const t = sceneryTextures().sheet;
  return patchDetail(std({ color: tint, map: t.albedo, roughness: 0.5, metalness: 0.45 }), {
    tile: 1,
    height: t.height,
    bump: 3,
  });
}

/** Planks, UVs `metricUV(g, 0.8)`; the colour paints them (weathered grey, brown, a dull green). */
export function woodMaterial(tint = 0xffffff, roughness = 0.88): THREE.MeshStandardMaterial {
  const t = sceneryTextures().planks;
  return patchDetail(std({ color: tint, map: t.albedo, roughness, metalness: 0 }), {
    tile: 1,
    height: t.height,
    bump: 1.6,
    macro: 0.21,
  });
}
