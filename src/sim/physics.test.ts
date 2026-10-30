import { describe, expect, it } from 'vitest';
import {
  beltRatio,
  bisect,
  clamp,
  flowForPower,
  headForPower,
  hoursPerYear,
  hydraulicPower,
  interp,
  overallEfficiency,
  pressureBar,
} from './physics';

// The hydraulic arithmetic of the sources (docs/research.md §2). Each test names the figure it retrieves.

describe('figures of the sources that are arithmetic', () => {
  it('K1: 100 L/s falling 1 m is about 1 kW (exactly 0.981 kW)', () => {
    expect(hydraulicPower(0.1, 1)).toBeCloseTo(981, 0);
    expect(Math.abs(hydraulicPower(0.1, 1) - 1000)).toBeLessThan(25);
  });
  it('K10: 450 L/s over 9.22 m carries 40.7 kW, so 30 kW is an overall efficiency of 0.74', () => {
    const p = hydraulicPower(0.45, 9.22);
    expect(p / 1000).toBeCloseTo(40.7, 1);
    expect(overallEfficiency(30000, 0.45, 9.22)).toBeCloseTo(0.737, 2);
    // with the draft tube the head is 9.20 m: the same plant
    expect(overallEfficiency(30000, 0.45, 9.2)).toBeCloseTo(0.739, 2);
  });
  it('K11: a 1 m flywheel on a belt to a pulley of 0.385 m, 380 rpm to 990 rpm, is a ratio of about 2.6', () => {
    expect(990 / 380).toBeCloseTo(2.6, 1);
    expect(beltRatio(1, 0.385)).toBeCloseTo(2.6, 1);
  });
  it('K12: the same 30 kW at 3 m needs about 1.5 m³/s; at 200 m 20 to 25 L/s are possible, 10 L/s is not (19.6 kW of water)', () => {
    const q3 = flowForPower(30000, 3, 0.68);
    expect(q3).toBeGreaterThan(1.4);
    expect(q3).toBeLessThan(1.6);
    expect(hydraulicPower(1.5, 3) / 1000).toBeCloseTo(44, 0);
    // 25 and 20 L/s are possible (efficiencies 0.61 and 0.76); FINDING: 10 L/s is not, it carries 19.6 kW of water for 30 kW
    for (const q of [0.02, 0.025]) {
      const eta = 30000 / hydraulicPower(q, 200);
      expect(eta).toBeGreaterThan(0.5);
      expect(eta).toBeLessThan(1);
    }
    expect(30000 / hydraulicPower(0.01, 200)).toBeGreaterThan(1);
    expect(flowForPower(30000, 200, 1)).toBeCloseTo(0.0153, 3);
    expect(hydraulicPower(0.02, 200) / 1000).toBeCloseTo(39, 0);
    expect(headForPower(30000, 0.02, 0.76)).toBeCloseTo(201, 0);
  });
  it('K13: 64,714 hours in ten years is 6,471 hours a year, 74 % of the year, and agrees with 2 to 4 months stopped', () => {
    expect(hoursPerYear(64714, 10)).toBeCloseTo(6471, 0);
    expect(hoursPerYear(64714, 10) / 8760).toBeCloseTo(0.739, 2);
    expect(8760 - 4 * 730).toBeLessThan(6471);
    expect(8760 - 2 * 730).toBeGreaterThan(6471);
  });
  it('K16: 987 kW at 90 % from 220 m needs 0.51 m³/s and 220 m of water is 21.6 bar (the video says about 23)', () => {
    expect(flowForPower(987000, 220, 0.9)).toBeCloseTo(0.508, 2);
    expect(pressureBar(220)).toBeCloseTo(21.6, 1);
    expect(Math.abs(pressureBar(220) - 23)).toBeLessThan(1.5);
  });
});

describe('helpers', () => {
  it('interp, clamp and bisect', () => {
    expect(interp([0, 1, 2], [0, 10, 40], 1.5)).toBeCloseTo(25, 6);
    expect(interp([0, 1], [3, 5], -1)).toBe(3);
    expect(clamp(5, 0, 2)).toBe(2);
    expect(bisect((x) => x * x - 2, 0, 3)).toBeCloseTo(Math.SQRT2, 9);
  });
});
