import * as THREE from 'three';

// The one procedural texture of the water (no file, no network): a tileable 256 x 256 RGBA8 field, generated at start-up (about 20 ms) and
// shared by every water material of a world. It carries what the shaders would otherwise compute with several octaves of noise per pixel:
//   R, G  the slope (d height / du, d height / dv) of a fractal height field, normalised and encoded as 0.5 + slope / 2: the ripples
//   B     bubbles (inverted cellular distance): the lace of the foam
//   A     fine fractal detail in 0 .. 1: the breakup of the foam and of the streaks
// A water material samples it two or three times, at different scales and speeds, so the ripples of one body are advected along its
// own flow at its own surface speed. It is data, not colour (no colour space). 256^2 x 4 bytes = 256 KB, 341 KB with its mip chain.

export const NOISE_SIZE = 256;

/** A seeded generator (Park-Miller): the water looks the same at every visit. */
function seeded(seed: number): () => number {
  let s = Math.max(1, Math.floor(seed)) % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const quintic = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

/** Tileable value noise on a lattice of `period` x `period` cells; `u` and `v` in tile units (0 .. 1 = one tile). */
function lattice(period: number, rand: () => number): (u: number, v: number) => number {
  const g = new Float64Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  return (u, v) => {
    const x = (((u % 1) + 1) % 1) * period;
    const y = (((v % 1) + 1) % 1) * period;
    const i0 = Math.floor(x);
    const j0 = Math.floor(y);
    const fx = quintic(x - i0);
    const fy = quintic(y - j0);
    const i1 = (i0 + 1) % period;
    const j1 = (j0 + 1) % period;
    const a = g[j0 * period + i0];
    const b = g[j0 * period + i1];
    const c = g[j1 * period + i0];
    const d = g[j1 * period + i1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

/** Fractal sum of lattices of the given periods (amplitude halves with each), a tileable field in 0 .. 1. */
function fbm(periods: number[], rand: () => number): (u: number, v: number) => number {
  const layers = periods.map((p) => lattice(p, rand));
  const norm = periods.reduce((s, _p, i) => s + 0.5 ** i, 0);
  return (u, v) => layers.reduce((s, f, i) => s + 0.5 ** i * f(u, v), 0) / norm;
}

/** The raw fields of the texture (Float32, N x N each); exposed for the tests. */
export function noiseFields(size = NOISE_SIZE, seed = 7) {
  const rand = seeded(seed);
  const N = size;
  const height = fbm([3, 6, 12, 24], rand);
  const detail = fbm([8, 16, 32, 64], rand);
  const H = new Float32Array(N * N);
  const D = new Float32Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      H[j * N + i] = height(i / N, j / N);
      D[j * N + i] = detail(i / N, j / N);
    }
  // slopes by central differences on the periodic field, in height per tile
  const gx = new Float32Array(N * N);
  const gy = new Float32Array(N * N);
  let sum2 = 0;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const ip = (i + 1) % N;
      const im = (i + N - 1) % N;
      const jp = (j + 1) % N;
      const jm = (j + N - 1) % N;
      const dx = ((H[j * N + ip] - H[j * N + im]) * N) / 2;
      const dy = ((H[jp * N + i] - H[jm * N + i]) * N) / 2;
      gx[j * N + i] = dx;
      gy[j * N + i] = dy;
      sum2 += dx * dx + dy * dy;
    }
  // three standard deviations map to the full range, so a typical slope reads about a third of it
  const sigma = Math.sqrt(sum2 / (2 * N * N));
  const k = 1 / (3 * Math.max(sigma, 1e-9));
  for (let i = 0; i < N * N; i++) {
    gx[i] = Math.max(-1, Math.min(1, gx[i] * k));
    gy[i] = Math.max(-1, Math.min(1, gy[i] * k));
  }
  // bubbles: cellular noise (distance to the nearest of ~24 x 24 jittered points per tile, wrapped), inverted
  const C = 24;
  const px = new Float64Array(C * C);
  const py = new Float64Array(C * C);
  for (let j = 0; j < C; j++)
    for (let i = 0; i < C; i++) {
      px[j * C + i] = (i + 0.15 + 0.7 * rand()) / C;
      py[j * C + i] = (j + 0.15 + 0.7 * rand()) / C;
    }
  const B = new Float32Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N;
      const v = (j + 0.5) / N;
      const ci = Math.floor(u * C);
      const cj = Math.floor(v * C);
      let best = 1e9;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = (((ci + di) % C) + C) % C;
          const jj = (((cj + dj) % C) + C) % C;
          // the lattice point, shifted back by the wrap
          const x = px[jj * C + ii] + Math.floor((ci + di) / C);
          const y = py[jj * C + ii] + Math.floor((cj + dj) / C);
          const d2 = (x - u) * (x - u) + (y - v) * (y - v);
          if (d2 < best) best = d2;
        }
      // one cell is 1 / C wide: the nearest point is within about 0.7 / C
      const f = Math.min(1, Math.sqrt(best) * C * 1.35);
      B[j * N + i] = (1 - f) ** 1.6;
    }
  return { N, gx, gy, B, D };
}

/** The texture. Mipmapped (the gradients average to flat water at a distance, which is right), repeating, linear. */
export function waterNoise(seed = 7): THREE.DataTexture {
  const { N, gx, gy, B, D } = noiseFields(NOISE_SIZE, seed);
  const px = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    px[i * 4] = Math.round(127.5 + 127.5 * gx[i]);
    px[i * 4 + 1] = Math.round(127.5 + 127.5 * gy[i]);
    px[i * 4 + 2] = Math.round(255 * B[i]);
    px[i * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, (D[i] - 0.2) * 1.7)));
  }
  const tex = new THREE.DataTexture(px, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  tex.name = 'water-noise';
  return tex;
}

/** Bytes the texture takes on the card (with its mip chain), for the budget. */
export const noiseBytes = (size = NOISE_SIZE): number => Math.round(size * size * 4 * (4 / 3));
