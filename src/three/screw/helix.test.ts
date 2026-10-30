import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { bucketAt, bucketTable } from '../../sim/bucket';
import { BLADES, PITCH_RATIO, RADIUS_RATIO } from '../../sim/machine';
import { DESIGN_SHAPE, SCREW, bladeThickness, type ScrewShape } from '../dims';
import {
  DEG,
  PocketBuilder,
  bladeGeometry,
  bucketLevels,
  pocketCount,
  pocketSection,
  pocketShift,
  slab,
  threadSpan,
} from './helix';

// The geometry of the screw by script: right-handed blades whose faces look outwards, the number of modules, the pockets of water
// against the simulation's bucket (volume at a fill, the empty and the full level), and the translation of the pockets with the angle.

const shapeOf = (d: number, head: number, slopeDeg = 22): ScrewShape => ({
  outerDiameter: d,
  innerDiameter: RADIUS_RATIO * d,
  pitch: PITCH_RATIO * d,
  length: head / Math.sin(slopeDeg * DEG),
  slopeDeg,
});

/** Volume of one pocket at a fill by a fine integration of the same formulas (Rorres), m³. */
function fineVolume(shape: ScrewShape, fill: number): number {
  const ro = shape.outerDiameter / 2;
  const ri = shape.innerDiameter / 2;
  const t = bladeThickness(shape.outerDiameter);
  const beta = shape.slopeDeg * DEG;
  const lv = bucketLevels(shape);
  const h = lv.hMin + Math.min(1 - 1e-9, fill) * (lv.hPass - lv.hMin);
  const kr = (shape.pitch * Math.tan(beta)) / (2 * Math.PI);
  const th = shape.pitch / BLADES - t;
  let v = 0;
  const NR = 80;
  const NA = 720;
  for (let i = 0; i < NR; i++) {
    const r = ri + ((i + 0.5) * (ro - ri)) / NR;
    const k = kr / r;
    const c = Math.acos(-k);
    for (let j = 0; j < NA; j++) {
      const phi = c - 2 * Math.PI + ((j + 0.5) * 2 * Math.PI) / NA;
      const F = r * Math.cos(beta) * (Math.sin(phi) + k * phi) + (t / 2) * Math.sin(beta);
      const tw = Math.min(th, Math.max(0, (h - F) / Math.sin(beta)));
      v += tw * r * ((2 * Math.PI) / NA) * ((ro - ri) / NR);
    }
  }
  return v;
}

describe('blade geometry', () => {
  const shape = DESIGN_SHAPE;

  it('has faces that look outwards: the up-slope face towards +x, the down-slope face towards -x, the tip away from the axis', () => {
    const g = slab(
      shape,
      0,
      0.3,
      1.3,
      shape.innerDiameter / 2,
      shape.outerDiameter / 2,
      bladeThickness(shape.outerDiameter),
      6,
    );
    const pos = g.attributes.position;
    const idx = g.index!;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    let top = 0;
    let bottom = 0;
    let tip = 0;
    const ro = shape.outerDiameter / 2;
    for (let i = 0; i < idx.count; i += 3) {
      a.fromBufferAttribute(pos, idx.getX(i));
      b.fromBufferAttribute(pos, idx.getX(i + 1));
      c.fromBufferAttribute(pos, idx.getX(i + 2));
      const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      const centre = a.clone().add(b).add(c).divideScalar(3);
      const r = Math.hypot(centre.y, centre.z);
      if (r > ro * 0.99) {
        // the tip: outwards
        expect(n.y * centre.y + n.z * centre.z).toBeGreaterThan(0);
        tip++;
      } else if (Math.abs(n.x) > 0.5) {
        if (n.x > 0) top++;
        else bottom++;
      }
    }
    expect(tip).toBeGreaterThan(0);
    expect(top).toBe(bottom);
    expect(top).toBeGreaterThan(5);
  });

  it('cuts three threads of quarter-turn modules between the two ends of the flights', () => {
    const blades = bladeGeometry(shape);
    const turns = shape.length / shape.pitch;
    expect(blades.modules).toBeGreaterThan(BLADES * turns * 4 - 8);
    expect(blades.modules).toBeLessThan(BLADES * turns * 4 + 8);
    expect(blades.boltCount).toBe(blades.modules * 2);
    const box = new THREE.Box3();
    for (const g of [blades.woodA, blades.woodB]) {
      g.computeBoundingBox();
      box.union(g.boundingBox!);
    }
    expect(box.min.x).toBeGreaterThanOrEqual(-1e-6);
    expect(box.max.x).toBeLessThanOrEqual(shape.length + 1e-6);
    expect(box.max.y).toBeCloseTo(shape.outerDiameter / 2, 2);
    // every thread starts and ends inside the flights, a blade thick away from the end planes
    const span = threadSpan(shape);
    for (let k = 0; k < BLADES; k++) {
      const x0 = (shape.pitch * (span.psiLo[k] - (2 * Math.PI * k) / BLADES)) / (2 * Math.PI);
      const x1 = (shape.pitch * (span.psiHi[k] - (2 * Math.PI * k) / BLADES)) / (2 * Math.PI);
      expect(x0).toBeGreaterThan(0);
      expect(x1).toBeLessThan(shape.length);
    }
  });

  it('is right-handed: the axial position of a blade grows with the azimuth', () => {
    const span = threadSpan(shape);
    expect(span.psiHi[0]).toBeGreaterThan(span.psiLo[0]);
    // one turn of a thread advances one pitch
    const dx = (shape.pitch * (2 * Math.PI)) / (2 * Math.PI);
    expect(dx).toBeCloseTo(shape.pitch, 9);
  });
});

describe('the pockets of water', () => {
  const shape = DESIGN_SHAPE;
  const builder = new PocketBuilder();

  it('retrieves the simulation: the empty and the full level, the depth between them, and the volume of a full bucket', () => {
    const lv = bucketLevels(shape);
    const table = bucketTable({
      radiusRatio: RADIUS_RATIO,
      pitchRatio: PITCH_RATIO,
      blades: BLADES,
      slope: shape.slopeDeg * DEG,
    });
    expect(lv.hPass - lv.hMin).toBeCloseTo(table.depth * (shape.outerDiameter / 2), 6);
    expect(lv.hPass - lv.hMin).toBeCloseTo(SCREW.bucketDepth, 6);
    // volume of a full bucket: the same integral as the simulation's, to the thickness of the blades (which the simulation ignores)
    const full = fineVolume(shape, 1);
    expect(full).toBeCloseTo(SCREW.bucketVolume, 2);
    expect(Math.abs(full / SCREW.bucketVolume - 1)).toBeLessThan(0.1);
    for (const f of [0.2, 0.5, 0.8]) {
      const sim = bucketAt(table, f).volume * (shape.outerDiameter / 2) ** 3;
      expect(Math.abs(fineVolume(shape, f) / sim - 1)).toBeLessThan(0.12);
    }
  });

  it('builds the geometry for any fill in the buffers it owns, with the volume the formula gives (the coarse grid within 15 %)', () => {
    const positionArray = builder.geometry.attributes.position.array;
    for (const f of [0.05, 0.3, 0.6, 0.9, 1]) {
      expect(builder.build(shape, f)).toBe(true);
      expect(builder.geometry.attributes.position.array).toBe(positionArray);
      expect(builder.triangles).toBeGreaterThan(20);
      if (f >= 0.3) expect(Math.abs(builder.volume / fineVolume(shape, f) - 1)).toBeLessThan(0.15);
      const pos = builder.geometry.attributes.position.array as Float32Array;
      expect(pos.every(Number.isFinite)).toBe(true);
    }
    expect(builder.build(shape, 0)).toBe(false);
  });

  it('keeps the water between the core and the tips, and the free surface horizontal', () => {
    builder.build(shape, 0.5);
    const pos = builder.geometry.attributes.position;
    const ro = shape.outerDiameter / 2;
    const ri = shape.innerDiameter / 2;
    const beta = shape.slopeDeg * DEG;
    const idx = builder.geometry.index!;
    const used = new Set<number>();
    for (let i = 0; i < builder.triangles * 3; i++) used.add(idx.getX(i));
    // the level is the same for every vertex of the free surface: h = y' cosβ + x' sinβ
    const lv = bucketLevels(shape);
    const h = lv.hMin + 0.5 * (lv.hPass - lv.hMin);
    let surface = 0;
    for (const v of used) {
      const r = Math.hypot(pos.getY(v), pos.getZ(v));
      expect(r).toBeGreaterThan(ri - 1e-4);
      expect(r).toBeLessThan(ro + 1e-4);
      const height = pos.getY(v) * Math.cos(beta) + pos.getX(v) * Math.sin(beta);
      if (Math.abs(height - h) < 1e-3) surface++;
    }
    expect(surface).toBeGreaterThan(20);
  });

  it('lowers the pockets down the slope when the screw turns the right way, one blade spacing per third of a turn', () => {
    const spacing = shape.pitch / BLADES;
    const a = pocketShift(shape, 5, 0.3);
    const b = pocketShift(shape, 5, 0.3 + 0.1);
    // a small turn: the pocket moves towards the lower end (x' decreasing), never more than the turn gives
    expect(b).toBeLessThan(a);
    expect(a - b).toBeCloseTo((shape.pitch * 0.1) / (2 * Math.PI), 9);
    // a third of a turn brings the next pocket to where this one was
    const c = pocketShift(shape, 5, 0.3 + (2 * Math.PI) / BLADES);
    expect(Math.abs(c - a) < 1e-9 || Math.abs(Math.abs(c - a) - spacing) < 1e-9).toBe(true);
    expect(pocketCount(shape)).toBeGreaterThan(shape.length / spacing);
  });

  it('covers the whole length of the screw with pockets, whatever the angle', () => {
    const spacing = shape.pitch / BLADES;
    for (const theta of [0, 1, 3, 6]) {
      const xs = Array.from({ length: pocketCount(shape) }, (_, p) => pocketShift(shape, p, theta));
      expect(Math.min(...xs)).toBeLessThan(-0.55);
      expect(Math.max(...xs)).toBeGreaterThan(shape.length + 0.55);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(spacing, 9);
    }
  });

  it('draws the section at the bottom of the trough: a rectangle when the bucket is full, a wedge under a level line when it is not', () => {
    const full = pocketSection(shape, 1);
    expect(full.length).toBeGreaterThanOrEqual(4);
    const xs = full.map((p) => p[0]);
    const t = bladeThickness(shape.outerDiameter);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(shape.pitch / BLADES - t, 3);
    const half = pocketSection(shape, 0.3);
    expect(half.length).toBeGreaterThanOrEqual(4);
    const area = (poly: [number, number][]) =>
      Math.abs(
        poly.reduce((a, p, i) => a + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0),
      ) / 2;
    expect(area(half)).toBeLessThan(area(full) * 0.8);
    expect(area(half)).toBeGreaterThan(0);
    // the level line is horizontal in the world: from the tip to the core it climbs by (ro - ri) cosβ / sinβ ... in x', and ends at the core
    const ys = half.map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(-shape.outerDiameter / 2, 6);
    expect(Math.max(...ys)).toBeCloseTo(-shape.innerDiameter / 2, 6);
    expect(pocketSection(shape, 0)).toEqual([]);
  });

  it('follows another shape: the prototype and the river screws', () => {
    for (const s of [shapeOf(0.4, 1), shapeOf(2.5, 3), shapeOf(0.86, 1.75, 15), shapeOf(0.86, 1.75, 35)]) {
      const b = new PocketBuilder();
      expect(b.build(s, 0.8)).toBe(true);
      expect((b.geometry.attributes.position.array as Float32Array).every(Number.isFinite)).toBe(true);
      expect(Number.isFinite(bucketLevels(s).hPass)).toBe(true);
    }
  });
});
