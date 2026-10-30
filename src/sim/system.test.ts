import { describe, expect, it } from 'vitest';
import {
  candidatesFor,
  equalPowerFlow,
  fits,
  powerLine,
  CHOOSER_BOX,
  runnerDiameter,
  TURBINE_TYPES,
  ZONES,
  zonePolygon,
} from './chooser';
import { presetParams } from './presets';
import { rpmToRad, multiplierLesson } from './mech';
import { SITES, dailyFlows, exceedanceFlow, floodFlow, medianFlow, reservedFlow, tailRise } from './site';
import { cutInGeneratorRpm, plantFor, solvePlant, type PlantParams } from './system';
import { sizeWheel, wheelPoint, WHEEL_SOURCES } from './wheel';
import { simulateYear } from './year';
import { hydraulicPower } from './physics';

const full = presetParams('full-size');
const proto = presetParams('prototype');
const run = (p: PlantParams, q: number) => solvePlant(p, q);

describe('the figures of the video that are ranges (never tuned: they are results)', () => {
  const o = run(full, full.riverFlow);
  const op = run(proto, proto.riverFlow);
  it('K2: the overall efficiency (water to battery) is 60 to 70 % hoped; the model gives 71 %, a point above', () => {
    expect(o.etaOverall).toBeGreaterThan(0.6);
    expect(o.etaOverall).toBeLessThan(0.75);
    expect(op.etaOverall).toBeGreaterThan(0.6);
    expect(op.etaOverall).toBeLessThan(0.7);
  });
  it('K3: the prototype of about 200 W (31 L/s over 1 m, the research example) gives 206 W', () => {
    expect(op.electricPower).toBeGreaterThan(150);
    expect(op.electricPower).toBeLessThan(300);
  });
  it('K5: the full-size screw of 180 L/s over 1.75 m gives about 2 kW (2.2 kW)', () => {
    expect(o.electricPower).toBeGreaterThan(1500);
    expect(o.electricPower).toBeLessThan(2500);
    expect(o.hydraulicPower).toBeCloseTo(hydraulicPower(0.18, 1.75), 0);
  });
  it('K7: the generator turns at several hundred rpm, ten times the screw, through two stages', () => {
    expect(o.generatorRpm).toBeGreaterThan(300);
    expect(o.generatorRpm).toBeLessThan(1000);
    expect(o.generatorRpm / o.rpm).toBeGreaterThan(8);
    expect(full.chainRatio).toBeGreaterThan(1);
    expect(full.beltRatio).toBeGreaterThan(1);
  });
  it('K9: for the same flow a Kaplan runner is several times smaller than the screw', () => {
    const plant = plantFor(full);
    expect(plant.screw!.outerDiameter / runnerDiameter(0.18)).toBeGreaterThan(3);
  });
  it('the generator starts to charge at 552 rpm when it is rated at 600 rpm (12 % headroom on the battery)', () => {
    expect(cutInGeneratorRpm(plantFor(full))).toBeGreaterThan(500);
    expect(cutInGeneratorRpm(plantFor(full))).toBeLessThan(600);
  });
  it('the multiplier lesson: 2 kW at the speed of the screw needs ten times the torque of the generator at 600 rpm', () => {
    const l = multiplierLesson(o.electricPower, rpmToRad(o.rpm), rpmToRad(o.generatorRpm));
    expect(l.torqueRatio).toBeGreaterThan(8);
  });
});

describe('the plant against the flow of the river', () => {
  it('below the reserved flow plus the smallest usable flow it stops (low water); above six times the median it stops (flood)', () => {
    expect(run(full, 0.05).stopped).toBe('lowWater');
    expect(run(full, 0.03).electricPower).toBe(0);
    expect(run(full, floodFlow('race') * 1.01).stopped).toBe('flood');
    expect(run({ ...full, gateOpen: false }, 0.22).stopped).toBe('closed');
  });
  it('K16-style reserved flow: the water that must stay in the river is never used', () => {
    const o = run(full, 0.22);
    expect(o.usableFlow).toBeCloseTo(0.22 - reservedFlow('race'), 9);
    expect(o.flow).toBeLessThanOrEqual(o.usableFlow);
  });
  it('above the median flow the tailwater rises and the head falls; the power falls with it', () => {
    expect(tailRise('race', medianFlow('race'))).toBe(0);
    const a = run(full, 0.22);
    const b = run(full, 0.7);
    expect(b.tailRise).toBeGreaterThan(0.3);
    expect(b.headNet).toBeLessThan(a.headNet);
    expect(b.electricPower).toBeLessThan(0.8 * a.electricPower);
  });
  it('a rack that clogs costs head; without a rack nothing is lost', () => {
    const clean = run({ ...full, trashRack: true, debris: 0 }, 0.22);
    const clogged = run({ ...full, trashRack: true, debris: 0.9 }, 0.22);
    const none = run({ ...full, trashRack: false, debris: 0.9 }, 0.22);
    expect(clogged.rackLoss).toBeGreaterThan(0.5);
    expect(clogged.electricPower).toBeLessThan(0.7 * clean.electricPower);
    expect(none.rackLoss).toBe(0);
  });
  it('the wrong ratio: too small never charges the battery and the screw runs fast; too large holds it slow', () => {
    const base = run(full, 0.22);
    const small = run({ ...full, beltRatio: full.beltRatio * 0.4 }, 0.22);
    const big = run({ ...full, beltRatio: full.beltRatio * 1.9 }, 0.22);
    expect(small.rpm).toBeGreaterThan(1.5 * base.rpm);
    expect(small.electricPower).toBeLessThan(0.75 * base.electricPower);
    expect(big.rpm).toBeLessThan(0.7 * base.rpm);
    expect(big.electricPower).toBeLessThan(0.75 * base.electricPower);
    expect(big.qOver).toBeGreaterThan(0);
  });
  it('the speed follows the load: a bit slower with less water, never above the speed of the design', () => {
    const rpms = [0.1, 0.14, 0.22].map((q) => run(full, q).rpm);
    expect(rpms[0]).toBeLessThan(rpms[1]);
    expect(rpms[1]).toBeLessThan(rpms[2]);
    expect(rpms[2]).toBeLessThan(60);
  });
  it('a speed imposed from outside: too fast and too slow both cost power (the scenarios)', () => {
    const rpm0 = plantFor(full).designRpm;
    const ref = run({ ...full, loadMode: 'fixed', fixedRpm: rpm0 }, 0.22).electricPower;
    expect(run({ ...full, loadMode: 'fixed', fixedRpm: 2.4 * rpm0 }, 0.22).electricPower).toBeLessThan(0.55 * ref);
    expect(run({ ...full, loadMode: 'fixed', fixedRpm: 0.3 * rpm0 }, 0.22).electricPower).toBeLessThan(0.45 * ref);
  });
  it('rust: a rough wall costs a few percent on a slow screw (the K14 loss of 10 % was a fast turbine)', () => {
    const a = run(full, 0.22).electricPower;
    const b = run({ ...full, roughness: 5 }, 0.22).electricPower;
    expect(b / a).toBeGreaterThan(0.88);
    expect(b / a).toBeLessThan(0.97);
  });
});

describe('the wheel as a comparison', () => {
  it('weight against momentum: the undershot wheel gets nothing from the height, the overshot one nearly all', () => {
    const peak = (type: 'overshot' | 'undershot', head: number) => {
      const w = sizeWheel(type, head, 0.18);
      return wheelPoint(w, { flow: 0.18, omega: rpmToRad(w.designRpm) }).efficiency;
    };
    // an overshot wheel does better as the head grows (the fixed clearance matters less), the undershot one does not care
    expect(peak('overshot', 5)).toBeGreaterThan(peak('overshot', 1.75));
    expect(peak('undershot', 5)).toBeCloseTo(peak('undershot', 1.75), 6);
    // flat paddles take at most half of the jet (Borda–Carnot), so below the sources' 50 to 60 % (curved Poncelet blades)
    expect(peak('undershot', 1.75)).toBeLessThan(0.5);
  });
  it('the sources disagree and the lab keeps both: S6 80 to 90 % and S7 about 85 % for the overshot wheel, S6 50 to 60 % and S7 75 to 80 % for the breastshot', () => {
    expect(WHEEL_SOURCES.overshot.encyclopaedia).toEqual([0.8, 0.9]);
    expect(WHEEL_SOURCES.overshot.review).toEqual([0.85, 0.85]);
    expect(WHEEL_SOURCES.breastshot.encyclopaedia).toEqual([0.5, 0.6]);
    expect(WHEEL_SOURCES.breastshot.review).toEqual([0.75, 0.8]);
  });
  it('FINDING: at its best head the overshot wheel model peaks near 80 %, the breastshot near 74 %, the undershot at 44 %', () => {
    const peak = (type: 'overshot' | 'breastshot' | 'undershot', head: number) => {
      const w = sizeWheel(type, head, 0.18);
      return wheelPoint(w, { flow: 0.18, omega: rpmToRad(w.designRpm) }).efficiency;
    };
    expect(peak('overshot', 6)).toBeGreaterThan(0.75);
    expect(peak('overshot', 6)).toBeLessThan(0.9);
    expect(peak('breastshot', 2.5)).toBeGreaterThan(0.65);
    expect(peak('breastshot', 2.5)).toBeLessThan(0.8);
  });
  it('at the head of the full-size site (1.75 m) the screw gives more than any wheel, and the wheel needs a much bigger multiplier', () => {
    const screw = run(full, 0.22);
    const wheel = run(
      {
        ...full,
        machine: 'breastshot',
        ...(() => {
          const p = plantFor({ ...full, machine: 'breastshot' });
          return { chainRatio: p.defaultChain, beltRatio: p.defaultBelt };
        })(),
      },
      0.22,
    );
    expect(screw.electricPower).toBeGreaterThan(wheel.electricPower);
    expect(wheel.generatorRpm / wheel.rpm).toBeGreaterThan(3 * (screw.generatorRpm / screw.rpm));
    expect(screw.inRange).toBe(true);
  });
  it('an overshot wheel at 1.75 m is outside the heads of the sources (2.5 to 10 m)', () => {
    const p = plantFor({ ...full, machine: 'overshot' });
    const o = run({ ...full, machine: 'overshot', chainRatio: p.defaultChain, beltRatio: p.defaultBelt }, 0.22);
    expect(o.inRange).toBe(false);
  });
});

describe('the chooser', () => {
  it('the zones overlap and each head range is the one of the research (S5, S8, S9)', () => {
    expect(ZONES.undershot.head).toEqual([0.3, 2]);
    expect(ZONES.breastshot.head).toEqual([1.5, 3]);
    expect(ZONES.overshot.head).toEqual([2.5, 10]);
    expect(ZONES.screw.head).toEqual([0.1, 10]);
    expect(ZONES.screw.flow).toEqual([0.01, 14.5]);
    expect(ZONES.kaplan.head).toEqual([2, 40]);
    expect(ZONES.crossflow.head).toEqual([8, 60]);
    expect(ZONES.francis.head).toEqual([25, 350]);
    expect(ZONES.pelton.head[0]).toBe(75);
    // overlap: at 2 m a screw, a breastshot, an undershot wheel and a Kaplan all fit
    const at2 = candidatesFor(2, 1.5)
      .filter((c) => c.fits)
      .map((c) => c.type);
    expect(at2).toEqual(expect.arrayContaining(['screw', 'breastshot', 'undershot', 'kaplan']));
  });
  it('K10 is a crossflow site (9.22 m, 450 L/s) and K16 a Pelton site (220 m, 0.51 m³/s); the screw does not fit either', () => {
    expect(fits('crossflow', 9.22, 0.45)).toBe(true);
    expect(fits('pelton', 220, 0.51)).toBe(true);
    expect(fits('screw', 9.22, 0.45)).toBe(true); // head 0.1 to 10 m: the sources overlap here
    expect(fits('screw', 220, 0.51)).toBe(false);
    expect(fits('pelton', 1.75, 0.18)).toBe(false);
  });
  it('lines of equal power P = η ρ g Q H: 30 kW at 3 m with η = 0.68 needs 1.5 m³/s (K12)', () => {
    expect(equalPowerFlow(30000, 3, 0.68)).toBeCloseTo(1.5, 1);
    const line = powerLine(1e4, 0.75, CHOOSER_BOX);
    const inside = line.filter((p) => Number.isFinite(p[1]));
    expect(inside.length).toBeGreaterThan(20);
    for (const [x, y] of inside) expect(Math.pow(10, y) * 0.75 * 9810 * Math.pow(10, x)).toBeCloseTo(1e4, -1);
  });
  it('the zone outlines are closed and stay inside the chart', () => {
    for (const t of TURBINE_TYPES) {
      const poly = zonePolygon(t, CHOOSER_BOX);
      expect(poly[0]).toEqual(poly[poly.length - 1]);
      for (const [x, y] of poly) {
        expect(x).toBeGreaterThanOrEqual(CHOOSER_BOX.xMin);
        expect(x).toBeLessThanOrEqual(CHOOSER_BOX.xMax);
        expect(y).toBeGreaterThanOrEqual(CHOOSER_BOX.yMin);
        expect(y).toBeLessThanOrEqual(CHOOSER_BOX.yMax);
      }
    }
  });
});

describe('the sites and the year', () => {
  it('a year has 365 days, its mean is the mean flow of the site, it is the same every time', () => {
    for (const id of ['brook', 'race', 'river'] as const) {
      const q = dailyFlows(id);
      expect(q.length).toBe(365);
      expect(q.reduce((a, b) => a + b, 0) / 365).toBeCloseTo(SITES[id].meanFlow, 9);
      expect(Math.min(...q)).toBeGreaterThan(0);
    }
    expect(dailyFlows('race')).toBe(dailyFlows('race'));
  });
  it('low water exists: the lowest day of the brook and the race is below twice the reserved flow, and the flow-duration curve falls', () => {
    expect(Math.min(...dailyFlows('brook'))).toBeLessThan(2.5 * reservedFlow('brook'));
    expect(exceedanceFlow('race', 0.1)).toBeGreaterThan(exceedanceFlow('race', 0.5));
    expect(exceedanceFlow('race', 0.5)).toBeGreaterThan(exceedanceFlow('race', 0.9));
  });
  it('the full-size plant over a year: it stops in summer, produces more than a third of its rated power on average, and more in winter', () => {
    const y = simulateYear(full);
    expect(y.daysLowWater).toBeGreaterThan(20);
    expect(y.daysLowWater).toBeLessThan(130);
    expect(y.capacityFactor).toBeGreaterThan(0.3);
    expect(y.capacityFactor).toBeLessThan(0.8);
    expect(y.energy).toBeGreaterThan(5000);
    expect(y.winterShare).toBeGreaterThan(y.winterDays / 365);
    expect(y.monthly.reduce((a, b) => a + b, 0)).toBeCloseTo(y.energy, 6);
    // the year is energy conserving: never more than the site offers
    expect(y.energy).toBeLessThan(y.siteEnergy);
    expect(y.hoursRunning).toBeGreaterThan(5000);
  });
  it('the three sites give three different years', () => {
    const e = ['brook', 'race', 'river'].map((s) => dailyFlows(s as 'brook').reduce((a, b) => a + b, 0));
    expect(e[0]).toBeLessThan(e[1]);
    expect(e[1]).toBeLessThan(e[2]);
  });
});
