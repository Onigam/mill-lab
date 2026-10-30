// The water pocket ("bucket") of an Archimedes screw, computed numerically from the geometry (pure, no DOM).
//
// Frame (the one of Rorres 2000): the screw axis is z, tilted by the slope β from the horizontal. A blade is a helicoid
// z = S·φ/2π (+ k·S/N for the k-th blade); `φ` is the angle round the axis, φ = +π/2 at the top. The height of a point
// is h = r·sinφ·cosβ + z·sinβ. The floor of a chute (the lower of its two blades) is therefore
//   F(r, φ) = r·cosβ·(sinφ + κ·φ),   κ(r) = S·tanβ / (2π r),
// and the chute is S/N thick along z, i.e. Δh_b = (S/N)·sinβ thick in height. Water lies on the floor below the
// horizontal level `h`: its thickness along z is t = clamp((h − F)/sinβ, 0, S/N).
// At a radius where κ < 1 the floor has a minimum at φ = −c and a maximum (the saddle over which a full bucket spills into
// the bucket below) at φ = c − 2π, with c = acos(−κ). Where κ ≥ 1 the floor only climbs: there is no bucket at that radius.
// The level of a full bucket (fill f = 1) is the lowest saddle over all radii; the bucket is empty at the lowest point of
// the floor (f = 0): f = (h − h_min)/(h_pass − h_min), the definition of Simmons & Lubitz 2024, eq. 1.1.
// All lengths are for a screw of outer radius 1: volumes scale with R_o³, areas with R_o², lengths with R_o.

/** Shape ratios of a screw: everything else scales with the outer radius. */
export interface ScrewRatios {
  /** Inner / outer radius. */
  radiusRatio: number;
  /** Pitch / outer diameter. */
  pitchRatio: number;
  /** Number of threads. */
  blades: number;
  /** Inclination, rad. */
  slope: number;
}

/** What one bucket holds at a given fill, for R_o = 1 (see the scaling above). */
export interface BucketSample {
  /** Fill height ratio. */
  f: number;
  /** Volume of one bucket, R_o³. */
  volume: number;
  /** ∫ sqrt(clamp((h_A − F)/Δh_b, 0, 1)) dl along the blade tip under the bucket, R_o (the wetted tip weighted by the head across the blade). */
  tip: number;
  /** Wetted blade and core surface weighted by r³ (for the friction power ½ρ c_f ω³ ∫ r³ dA), R_o⁵. */
  wetR3: number;
  /** Wetted surface of blades and core, R_o². */
  wetArea: number;
}

export interface BucketTable {
  ratios: ScrewRatios;
  samples: BucketSample[];
  /** Vertical height between the empty and the full bucket, R_o. */
  depth: number;
  /** Δh_b = (S/N) sinβ, R_o: the head across one blade. */
  headStep: number;
  /** n = N·V_B / (π R_o² S): fraction of one pitch of the screw occupied by water at f = 1 (Rorres 2000, eq. 1). */
  volumeRatio: number;
  /** The inner radius at which the bucket starts, R_o (the inner radius itself unless the pitch is too long for it). */
  rLow: number;
}

const NR = 40; // radial nodes
const NP = 240; // angular nodes per radius
const NF = 21; // fill levels in the table (0, 0.05 … 1)

interface Level {
  hMin: number;
  hPass: number;
  rLow: number;
}

const floorHeight = (r: number, phi: number, kappaR: number, cosB: number): number =>
  r * cosB * (Math.sin(phi) + (kappaR / r) * phi);

/** Lowest point of the floor and lowest saddle for a screw of R_o = 1. */
function levels(q: ScrewRatios): Level {
  const cosB = Math.cos(q.slope);
  const pitch = 2 * q.pitchRatio; // S, for R_o = 1
  const kappaR = (pitch * Math.tan(q.slope)) / (2 * Math.PI); // κ·r, constant
  const rc = kappaR; // κ = 1 at r = κ·r
  const rLow = Math.max(q.radiusRatio, rc * 1.0000001);
  let hMin = Infinity;
  let hPass = Infinity;
  const nodes = 400;
  for (let i = 0; i <= nodes; i++) {
    const r = rLow + ((1 - rLow) * i) / nodes;
    const kappa = kappaR / r;
    if (kappa >= 1) continue;
    const c = Math.acos(-kappa);
    hMin = Math.min(hMin, floorHeight(r, -c, kappaR, cosB));
    hPass = Math.min(hPass, floorHeight(r, c - 2 * Math.PI, kappaR, cosB));
  }
  return { hMin, hPass, rLow };
}

/** Compute one sample of the table at the level `h`. */
function sampleAt(q: ScrewRatios, h: number, rLow: number, f: number): BucketSample {
  const cosB = Math.cos(q.slope);
  const sinB = Math.sin(q.slope);
  const pitch = 2 * q.pitchRatio;
  const kappaR = (pitch * Math.tan(q.slope)) / (2 * Math.PI);
  const thick = pitch / q.blades; // S/N
  let volume = 0;
  let wetR3 = 0;
  let wetArea = 0;
  const dr = (1 - rLow) / NR;
  for (let i = 0; i < NR; i++) {
    const r = rLow + (i + 0.5) * dr;
    const kappa = kappaR / r;
    if (kappa >= 1) continue;
    const c = Math.acos(-kappa);
    const a = c - 2 * Math.PI;
    const dphi = (c - a) / NP;
    let sumT = 0;
    let sumFloor = 0;
    let sumCeil = 0;
    for (let j = 0; j < NP; j++) {
      const phi = a + (j + 0.5) * dphi;
      const fl = floorHeight(r, phi, kappaR, cosB);
      const t = Math.min(thick, Math.max(0, (h - fl) / sinB));
      sumT += t;
      if (h > fl) sumFloor += 1; // floor under water at this angle
      if (t >= thick) sumCeil += 1; // chute full here: the upper blade is wet too
    }
    // the wetted floor of the helicoid: dA = sqrt(r² + (S/2π)²) dr dφ ; the core (r = R_i) and the ceiling add to it
    const dA = Math.sqrt(r * r + (pitch / (2 * Math.PI)) ** 2);
    volume += sumT * dphi * r * dr;
    const floorArea = (sumFloor + sumCeil) * dphi * dA * dr;
    wetArea += floorArea;
    wetR3 += floorArea * r ** 3;
  }
  // the core: strip of height t at r = R_i, the trough being at rest
  const rIn = rLow;
  if (rIn <= q.radiusRatio * 1.0000001) {
    const kappa = kappaR / rIn;
    if (kappa < 1) {
      const c = Math.acos(-kappa);
      const a = c - 2 * Math.PI;
      const dphi = (c - a) / NP;
      let core = 0;
      for (let j = 0; j < NP; j++) {
        const phi = a + (j + 0.5) * dphi;
        const t = Math.min(thick, Math.max(0, (h - floorHeight(rIn, phi, kappaR, cosB)) / sinB));
        core += t * dphi * rIn;
      }
      wetArea += core;
      wetR3 += core * rIn ** 3;
    }
  }
  // the blade tip under the bucket, weighted by the head across the blade
  const deltaH = thick * sinB;
  const kO = kappaR / 1;
  let tip = 0;
  if (kO < 1) {
    const c = Math.acos(-kO);
    const a = c - 2 * Math.PI;
    const dphi = (c - a) / 2000;
    const dl = Math.sqrt(1 + (pitch / (2 * Math.PI)) ** 2) * dphi;
    for (let j = 0; j < 2000; j++) {
      const phi = a + (j + 0.5) * dphi;
      const head = (h - floorHeight(1, phi, kappaR, cosB)) / deltaH;
      if (head > 0) tip += Math.sqrt(Math.min(1, head)) * dl;
    }
  }
  return { f, volume, tip, wetR3, wetArea };
}

const cache = new Map<string, BucketTable>();

/** The table of a screw shape, computed once (about 5 ms) and cached. */
export function bucketTable(q: ScrewRatios): BucketTable {
  const key = [q.radiusRatio, q.pitchRatio, q.blades, q.slope].join('|');
  const hit = cache.get(key);
  if (hit) return hit;
  const lv = levels(q);
  const samples: BucketSample[] = [];
  for (let k = 0; k < NF; k++) {
    const f = k / (NF - 1);
    // stay a hair below the saddle at f = 1: exactly at the saddle the two buckets touch
    const h = lv.hMin + (lv.hPass - lv.hMin) * Math.min(f, 1 - 1e-9);
    samples.push(sampleAt(q, h, lv.rLow, f));
  }
  const pitch = 2 * q.pitchRatio;
  const full = samples[NF - 1];
  const table: BucketTable = {
    ratios: q,
    samples,
    depth: lv.hPass - lv.hMin,
    headStep: (pitch / q.blades) * Math.sin(q.slope),
    volumeRatio: (q.blades * full.volume) / (Math.PI * pitch),
    rLow: lv.rLow,
  };
  cache.set(key, table);
  return table;
}

/** Linear interpolation of the table at a fill f in [0, 1]. */
export function bucketAt(table: BucketTable, f: number): BucketSample {
  const x = Math.min(1, Math.max(0, f)) * (NF - 1);
  const i = Math.min(NF - 2, Math.floor(x));
  const w = x - i;
  const a = table.samples[i];
  const b = table.samples[i + 1];
  const mix = (u: number, v: number) => u + (v - u) * w;
  return {
    f: mix(a.f, b.f),
    volume: mix(a.volume, b.volume),
    tip: mix(a.tip, b.tip),
    wetR3: mix(a.wetR3, b.wetR3),
    wetArea: mix(a.wetArea, b.wetArea),
  };
}

/** Rorres's own check of the geometry: the angle where the bucket starts, cos φ0 = −λ/ρ (eq. 16), degrees. */
export function bucketStartAngle(q: ScrewRatios): number {
  const lambda = (q.pitchRatio * Math.tan(q.slope)) / Math.PI; // λ = K·L / (2π R_o)  with L = S, R_o = D_o/2
  return (Math.acos(-lambda / q.radiusRatio) * 180) / Math.PI;
}

/** One column of the table at a fill (no allocation: for the inner loops of the solvers). */
export function bucketField(table: BucketTable, f: number, field: 'volume' | 'tip'): number {
  const x = Math.min(1, Math.max(0, f)) * (NF - 1);
  const i = Math.min(NF - 2, Math.floor(x));
  const w = x - i;
  const a = table.samples[i][field];
  return a + (table.samples[i + 1][field] - a) * w;
}
