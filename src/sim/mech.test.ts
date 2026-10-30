import { describe, expect, it } from 'vitest';
import {
  cutInOmega,
  designGenerator,
  driveTrain,
  generatorAt,
  loadTorqueAtSlowShaft,
  matchSpeed,
  multiplierLesson,
  radToRpm,
  rpmToRad,
  stageRatio,
  stagesNeeded,
  torque,
  totalEfficiency,
  totalRatio,
} from './mech';

describe('sim/mech', () => {
  it('K11: the crossflow plant turns the generator 2.6 times faster than the turbine', () => {
    expect(radToRpm(rpmToRad(380) * stageRatio(1, 0.385))).toBeCloseTo(990, -1);
  });
  it('stages in series multiply their ratios and their efficiencies', () => {
    expect(totalRatio([3.3, 3.3])).toBeCloseTo(10.89, 6);
    expect(totalEfficiency([0.98, 0.96])).toBeCloseTo(0.9408, 6);
  });
  it('torque is power over speed: 2 kW is 340 N·m at 56 rpm and 32 N·m at 600 rpm', () => {
    expect(torque(2000, rpmToRad(56))).toBeCloseTo(341, 0);
    expect(torque(2000, rpmToRad(600))).toBeCloseTo(31.8, 1);
    const lesson = multiplierLesson(2000, rpmToRad(56), rpmToRad(600));
    expect(lesson.torqueRatio).toBeCloseTo(600 / 56, 6);
  });
  it('a train divides the torque by ratio × efficiency and multiplies the speed by the ratio', () => {
    const [chain, belt] = driveTrain(5, 400, [
      { ratio: 3, efficiency: 0.98 },
      { ratio: 4, efficiency: 0.96 },
    ]);
    expect(chain.omegaOut).toBeCloseTo(15, 9);
    expect(belt.omegaOut).toBeCloseTo(60, 9);
    expect(belt.torqueOut).toBeCloseTo((400 * 0.98 * 0.96) / 12, 9);
    // the power that is left is the efficiency product
    expect(belt.omegaOut * belt.torqueOut).toBeCloseTo(5 * 400 * 0.98 * 0.96, 9);
  });
  it('a ratio above the largest of one stage needs another stage', () => {
    expect(stagesNeeded(4, 5)).toBe(1);
    expect(stagesNeeded(11, 5)).toBe(2);
    expect(stagesNeeded(30, 5)).toBe(3);
    expect(stagesNeeded(1, 5)).toBe(1);
  });
  it('generator: voltage proportional to speed, torque proportional to current, nothing below the cut-in', () => {
    const g = designGenerator(2000, rpmToRad(600), 48, 1.5, 0.12);
    const ci = cutInOmega(g);
    expect(generatorAt(g, ci * 0.99).current).toBe(0);
    expect(generatorAt(g, ci * 0.99).torque).toBe(0);
    const a = generatorAt(g, rpmToRad(600));
    expect(a.openCircuitVolts).toBeCloseTo(48 * 1.12, 6);
    expect(a.shaftPower).toBeCloseTo(2000, 6);
    expect(a.torque * a.omega).toBeCloseTo(a.shaftPower, 6);
    // the books close: shaft = bus + diodes + copper
    expect(a.shaftPower).toBeCloseTo(a.electricPower + a.diodeLoss + a.copperLoss, 6);
    expect(generatorAt(g, rpmToRad(300)).openCircuitVolts).toBeCloseTo((48 * 1.12) / 2, 6);
  });
  it('the operating speed follows the load: a stiffer load (a bigger ratio) holds the machine at a lower speed', () => {
    const g = designGenerator(2000, rpmToRad(600), 48, 1.5, 0.12);
    const supply = (w: number) => Math.max(0, 450 * (1 - w / 15)); // a machine whose torque falls with its speed
    const low = matchSpeed(supply, (w) => loadTorqueAtSlowShaft(g, w, 10.9, 0.94), 60);
    const high = matchSpeed(supply, (w) => loadTorqueAtSlowShaft(g, w, 16, 0.94), 60);
    expect(low).toBeGreaterThan(high);
    expect(high).toBeGreaterThan(0);
    // a ratio too small never reaches the cut-in: the machine runs away to the speed where its torque is nil
    const none = matchSpeed(supply, (w) => loadTorqueAtSlowShaft(g, w, 2, 0.94), 60);
    expect(none).toBeCloseTo(15, 1);
  });
  it('a machine with no torque does not start', () => {
    expect(
      matchSpeed(
        () => 0,
        () => 0,
        60,
      ),
    ).toBe(0);
  });
});
