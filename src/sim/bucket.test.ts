import { describe, expect, it } from 'vitest';
import { bucketAt, bucketStartAngle, bucketTable, type ScrewRatios } from './bucket';

const deg = (d: number) => (d * Math.PI) / 180;

/** Ratios of a screw from Rorres's dimensionless numbers (r = R_i/R_o, λ = K·L/(2π R_o)) and the slope. */
const fromRorres = (blades: number, r: number, lambda: number, slopeDeg: number): ScrewRatios => ({
  radiusRatio: r,
  pitchRatio: (lambda * Math.PI) / Math.tan(deg(slopeDeg)),
  blades,
  slope: deg(slopeDeg),
});

describe('bucket geometry against Rorres 2000', () => {
  it('table 1: the optimal 3-bladed screw holds 26.97 % of its volume as water', () => {
    const t = bucketTable(fromRorres(3, 0.5357, 0.2217, 22));
    expect(t.volumeRatio).toBeGreaterThan(0.2697 * 0.995);
    expect(t.volumeRatio).toBeLessThan(0.2697 * 1.005);
  });
  it('table 1: the same ratio for other slopes (n depends on N, r and λ only)', () => {
    const a = bucketTable(fromRorres(3, 0.5357, 0.2217, 15)).volumeRatio;
    const b = bucketTable(fromRorres(3, 0.5357, 0.2217, 30)).volumeRatio;
    expect(Math.abs(a - b)).toBeLessThan(0.004);
  });
  it('table 1: 1 and 8 blades', () => {
    expect(bucketTable(fromRorres(1, 0.5358, 0.1285, 22)).volumeRatio).toBeCloseTo(0.2811, 3);
    expect(bucketTable(fromRorres(2, 0.5369, 0.1863, 22)).volumeRatio).toBeCloseTo(0.2747, 3);
    expect(bucketTable(fromRorres(5, 0.5352, 0.263, 22)).volumeRatio).toBeCloseTo(0.2647, 3);
    expect(bucketTable(fromRorres(8, 0.5354, 0.2957, 22)).volumeRatio).toBeCloseTo(0.2609, 3);
  });
  it('Vitruvius: n(8, 1/2, 3/8) = 0.1703 with K = 3/4', () => {
    const slope = Math.atan(0.75);
    // λ = 3/8 with K = 3/4 and L = 2π R_i / K ... → pitch ratio S/D_o = λ·π/K
    const t = bucketTable({ radiusRatio: 0.5, pitchRatio: ((3 / 8) * Math.PI) / 0.75, blades: 8, slope });
    expect(t.volumeRatio).toBeGreaterThan(0.1703 * 0.995);
    expect(t.volumeRatio).toBeLessThan(0.1703 * 1.005);
  });
  it('eq. 16: the bucket of the 3-bladed example starts at 112.03° (r = 1/2, λ = 3/16)', () => {
    expect(bucketStartAngle(fromRorres(3, 0.5, 3 / 16, 22))).toBeCloseTo(112.03, 1);
  });
  it('the table is monotone and empty at f = 0', () => {
    const t = bucketTable({ radiusRatio: 0.5357, pitchRatio: 1, blades: 3, slope: deg(22) });
    expect(bucketAt(t, 0).volume).toBeCloseTo(0, 6);
    for (let k = 1; k < t.samples.length; k++) {
      expect(t.samples[k].volume).toBeGreaterThanOrEqual(t.samples[k - 1].volume);
      expect(t.samples[k].tip).toBeGreaterThanOrEqual(t.samples[k - 1].tip);
    }
  });
});
