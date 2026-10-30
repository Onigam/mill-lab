import { describe, expect, it } from 'vitest';
import { bucketTable } from './bucket';
import {
  diameterForFlow,
  fullBucketFlow,
  gapLeakage,
  nagelGap,
  screwPoint,
  sizeScrew,
  speedRuleRpm,
  swallowingCapacity,
} from './screw';
import { rpmToRad } from './mech';

const deg = (d: number) => (d * Math.PI) / 180;
const design = sizeScrew({ designFlow: 0.18, head: 1.75, slopeDeg: 22 });
const at = (rpm: number, flow = 0.18, extra = {}) => screwPoint(design, { flow, omega: rpmToRad(rpm), ...extra });

describe('design rules', () => {
  it('K8: three threads, the inner radius ratio of Rorres (0.5357) and a pitch equal to the diameter', () => {
    expect(design.blades).toBe(3);
    expect(design.radiusRatio).toBeCloseTo(0.5357, 4);
    expect(design.pitch).toBeCloseTo(design.outerDiameter, 9);
  });
  it('K5 design point: head 1.75 m and 180 L/s give a screw of about 0.86 m turning at 55 rpm, 4.7 m long', () => {
    expect(design.outerDiameter).toBeGreaterThan(0.8);
    expect(design.outerDiameter).toBeLessThan(0.95);
    expect(design.designRpm).toBeGreaterThan(50);
    expect(design.designRpm).toBeLessThan(60);
    expect(design.length * Math.sin(design.slope)).toBeCloseTo(1.75, 9);
  });
  it('K6: the speed of the full-size screw is inside the 30 to 60 rpm of the video', () => {
    expect(design.designRpm).toBeGreaterThanOrEqual(30);
    expect(design.designRpm).toBeLessThanOrEqual(60);
  });
  it('the rule n = 50 / D^(2/3) is the speed of the four field screws of Simmons & Lubitz 2024 table 2, within 9 %', () => {
    const field = [
      [1.39, 4.26],
      [2.5, 3.01],
      [2.9, 2.8],
      [3.6, 2.34],
    ];
    for (const [d, w] of field) {
      const ratio = (w * 60) / (2 * Math.PI) / speedRuleRpm(d);
      expect(ratio).toBeGreaterThan(0.99);
      expect(ratio).toBeLessThan(1.1);
    }
  });
  it('D ∝ Q^(3/7) follows from the bucket volume (∝ D³) and the speed rule (∝ D^(-2/3)): D / Q^(3/7) stays within 3 % over three decades', () => {
    const c = [0.01, 0.1, 1, 10].map((q) => diameterForFlow(q) / Math.pow(q, 3 / 7));
    for (const x of c) expect(Math.abs(x / c[2] - 1)).toBeLessThan(0.03);
    expect(c[2]).toBeGreaterThan(1.7);
    expect(c[2]).toBeLessThan(1.9);
  });
  it('the largest screw built (5 m, Simmons & Lubitz 2024 table 3) passes about 10 m³/s: the model gives 10.7 within 6 %', () => {
    const t = bucketTable({ radiusRatio: 0.5357, pitchRatio: 1, blades: 3, slope: deg(22) });
    const q = fullBucketFlow(t, 5, speedRuleRpm(5));
    expect(Math.abs(q / 10.3 - 1)).toBeLessThan(0.06);
    // and S5 gives up to 14.5 m³/s for the biggest installations
    expect(diameterForFlow(14.5)).toBeLessThan(6);
  });
  it('the flow at full buckets matches the four field screws: +19, +6, −6 and +17 %, +9 % on average (each within 25 %, the mean within 12 %)', () => {
    const field = [
      // D, ri/ro, S/D, N, slope, omega, Q
      [1.39, 0.548, 1.0, 3, 22, 4.26, 0.462],
      [2.5, 0.488, 1.0, 4, 26, 3.01, 2.095],
      [2.9, 0.414, 1.059, 3, 22, 2.8, 3.754],
      [3.6, 0.5, 1.194, 3, 22, 2.34, 5.03],
    ];
    const errors = field.map(([d, rr, sp, n, sl, w, q]) => {
      const t = bucketTable({ radiusRatio: rr, pitchRatio: sp, blades: n, slope: deg(sl) });
      return fullBucketFlow(t, d, (w * 60) / (2 * Math.PI)) / q - 1;
    });
    for (const e of errors) expect(Math.abs(e)).toBeLessThan(0.25);
    expect(Math.abs(errors.reduce((a, e) => a + e, 0) / errors.length)).toBeLessThan(0.12);
  });
  it('the gap rule of Nagel: 4.5 mm at D = 1 m, and the leakage at full buckets is within 10 % of his law Q = 0.01125 D²', () => {
    expect(nagelGap(1)).toBeCloseTo(0.0045, 6);
    const d1 = sizeScrew({ designFlow: 0.2, head: 1.75, slopeDeg: 22 });
    const nagel = 2.5 * d1.gap * d1.outerDiameter * Math.sqrt(d1.outerDiameter);
    expect(Math.abs(gapLeakage(d1, 1) / nagel - 1)).toBeLessThan(0.1);
  });
});

describe('the screw at work', () => {
  it('at the design speed and flow the buckets are full, nothing overflows, the screw turns at the rule speed', () => {
    const p = at(design.designRpm);
    expect(p.fill).toBeGreaterThan(0.99);
    expect(p.qOver).toBeLessThan(1e-6);
    expect(p.speedRatio).toBeCloseTo(1, 6);
    expect(p.qBucket + p.qGap).toBeCloseTo(0.18, 6);
  });
  it('the books close: shaft power = ideal power − inlet − outlet − friction − bearings', () => {
    const p = at(design.designRpm);
    expect(p.shaftPower).toBeCloseTo(p.idealPower - p.inletLoss - p.outletLoss - p.frictionLoss - p.bearingLoss, 6);
    expect(p.idealPower).toBeLessThan(p.hydraulicPower);
  });
  it('efficiency is a result: 80 to 90 % at the best speed (Dellinger 2015: a little over 80 %, Brada 80 %, BOKU above 90 %)', () => {
    const p = at(design.designRpm);
    expect(p.efficiency).toBeGreaterThan(0.8);
    expect(p.efficiency).toBeLessThan(0.9);
  });
  it('efficiency has one maximum against speed: it falls when the screw is too slow (overflow) and too fast (half-empty buckets)', () => {
    const curve = [0.3, 0.5, 0.7, 0.85, 1, 1.2, 1.5, 2, 2.5].map((k) => at(design.designRpm * k).efficiency);
    const peak = curve.indexOf(Math.max(...curve));
    expect(peak).toBe(4);
    for (let i = 1; i <= peak; i++) expect(curve[i]).toBeGreaterThan(curve[i - 1]);
    for (let i = peak + 1; i < curve.length; i++) expect(curve[i]).toBeLessThan(curve[i - 1]);
  });
  it('too slow: the water that the buckets cannot carry overflows; too fast: the buckets are under-filled and the pool is drawn down', () => {
    const slow = at(design.designRpm * 0.5);
    expect(slow.fill).toBe(1);
    expect(slow.qOver).toBeGreaterThan(0.05);
    const fast = at(design.designRpm * 1.6);
    expect(fast.fill).toBeLessThan(0.7);
    expect(fast.drawdownLoss).toBeGreaterThan(100);
    expect(fast.frictionLoss).toBeGreaterThan(2 * at(design.designRpm).frictionLoss);
  });
  it('Dellinger 2015 fig. 3.24: the torque falls as the speed rises at constant flow', () => {
    const t = [0.3, 0.6, 1, 1.5, 2].map((k) => at(design.designRpm * k).torque);
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeLessThan(t[i - 1]);
  });
  it('Brada 1999: at a constant speed the efficiency stays high down to a third of the flow and then the fill falls', () => {
    const e = [1, 0.7, 0.5, 0.35, 0.2].map((k) => at(design.designRpm, 0.18 * k).efficiency);
    expect(e[0]).toBeGreaterThan(0.8);
    expect(e[3]).toBeGreaterThan(0.7);
    expect(at(design.designRpm, 0.18 * 0.2).fill).toBeLessThan(0.4);
  });
  it('the gap leakage grows with the gap and shows in the losses', () => {
    const a = at(design.designRpm);
    const b = at(design.designRpm, 0.18, { gapScale: 3 });
    // a bigger gap lets more through, but the buckets are then a little emptier, so a little less than three times
    expect(b.qGap).toBeGreaterThan(2.5 * a.qGap);
    expect(b.qGap).toBeLessThan(3 * a.qGap);
    expect(b.efficiency).toBeLessThan(a.efficiency);
  });
  it('a rougher wall costs power, a rise of the tailwater costs head and power', () => {
    const a = at(design.designRpm);
    expect(at(design.designRpm, 0.18, { roughnessMm: 5 }).frictionLoss).toBeGreaterThan(1.3 * a.frictionLoss);
    const flooded = at(design.designRpm, 0.18, { tailRise: 0.6 });
    expect(flooded.headNet).toBeCloseTo(1.15, 9);
    expect(flooded.shaftPower).toBeLessThan((1.15 / 1.75) * a.shaftPower);
    expect(flooded.outletLoss / flooded.qBucket).toBeGreaterThan(a.outletLoss / a.qBucket);
  });
  it('the swallowing capacity is the flow of full buckets at the design speed', () => {
    expect(swallowingCapacity(design)).toBeCloseTo(0.18, 6);
  });
  it('no number is NaN or negative where it must not be, over the whole range of flow, speed, tailwater and roughness', () => {
    for (const flow of [0, 0.001, 0.05, 0.18, 0.5, 2]) {
      for (const rpm of [0.01, 5, 30, 55, 120, 400]) {
        for (const tailRise of [-0.3, 0, 0.5, 1.5, 3]) {
          for (const roughnessMm of [0.05, 5]) {
            const p = screwPoint(design, { flow, omega: rpmToRad(rpm), tailRise, roughnessMm, gapScale: 4 });
            for (const [k, v] of Object.entries(p)) {
              if (typeof v === 'number') expect(Number.isFinite(v), `${k} at ${flow}, ${rpm}, ${tailRise}`).toBe(true);
            }
            expect(p.fill).toBeGreaterThanOrEqual(0);
            expect(p.fill).toBeLessThanOrEqual(1);
            expect(p.efficiency).toBeGreaterThanOrEqual(0);
            expect(p.efficiency).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
  it('every slope and every size can be built', () => {
    for (const slopeDeg of [15, 22, 35]) {
      for (const flow of [0.01, 0.18, 5]) {
        const d = sizeScrew({ designFlow: flow, head: 2, slopeDeg });
        const p = screwPoint(d, { flow, omega: rpmToRad(d.designRpm) });
        expect(p.efficiency).toBeGreaterThan(0.6);
        expect(p.efficiency).toBeLessThan(0.95);
      }
    }
  });
});
