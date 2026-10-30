import { describe, expect, it } from 'vitest';
import { BLADES, BLADE_THICKNESS_FRAC, CORE_WALL_FRAC, GEN_RATED_RPM, PSI_OPT, RADIUS_RATIO } from '../sim/machine';
import { presetParams } from '../sim/presets';
import { nagelGap, sizeScrew, speedRuleRpm } from '../sim/screw';
import { plantFor } from '../sim/system';
import * as DIMS from './dims';

// The single source of dimensions: finite and positive, equal to the numbers of src/sim where both know one, the drive arithmetic, the scale of the
// hardware, the site's compressed tailrace.

describe('dimensions', () => {
  const SIGNED = new Set([
    'DRIVE.countershaftAt.0',
    'DRIVE.generatorAt.0',
    'SITE.tailY',
    'SITE.weir.crestY',
    'SITE.chamber.floorY',
    'SITE.chamber.quayY',
  ]);
  const walk = (obj: unknown, path: string, out: string[]) => {
    if (typeof obj === 'number') {
      if (!Number.isFinite(obj)) out.push(`${path} is not finite`);
      else if (
        obj <= 0 &&
        obj !== 0 &&
        !SIGNED.has(path) &&
        !/(Y|y|X|x|Z|z|At|at)$/.test(path.split('.').pop() ?? '') &&
        !path.includes('SITE.')
      )
        out.push(`${path} = ${obj} is not positive`);
    } else if (Array.isArray(obj)) obj.forEach((x, i) => walk(x, `${path}.${i}`, out));
    else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`, out);
  };

  it('exports finite numbers', () => {
    const out: string[] = [];
    for (const [name, v] of Object.entries(DIMS)) if (typeof v !== 'function') walk(v, name, out);
    expect(out).toEqual([]);
  });

  it('is the screw the simulation sizes for its default preset (nothing retyped)', () => {
    const p = presetParams('full-size');
    const sized = sizeScrew({ designFlow: p.designFlow, head: p.head, slopeDeg: p.slope });
    expect(DIMS.DESIGN.head).toBe(p.head);
    expect(DIMS.DESIGN.flow).toBe(p.designFlow);
    expect(DIMS.SCREW.outerDiameter).toBe(sized.outerDiameter);
    expect(DIMS.SCREW.innerDiameter).toBe(sized.innerDiameter);
    expect(DIMS.SCREW.pitch).toBe(sized.pitch);
    expect(DIMS.SCREW.length).toBe(sized.length);
    expect(DIMS.SCREW.slopeDeg).toBe(sized.slopeDeg);
    expect(DIMS.SCREW.gap).toBe(sized.gap);
    expect(DIMS.SCREW.bucketVolume).toBe(sized.bucketVolume);
    expect(DIMS.SCREW.threads).toBe(BLADES);
    expect(DIMS.SCREW.innerDiameter / DIMS.SCREW.outerDiameter).toBeCloseTo(RADIUS_RATIO, 9);
    expect(DIMS.SCREW.gap).toBe(nagelGap(DIMS.SCREW.outerDiameter));
    expect(DIMS.SCREW.bladeSpacing * BLADES).toBeCloseTo(DIMS.SCREW.pitch, 12);
    expect(DIMS.DESIGN.screwRpm).toBeCloseTo(speedRuleRpm(DIMS.SCREW.outerDiameter), 9);
    // the design point as the lead and the data role quote it: 0.86 m, 4.67 m, 22 degrees, 4.2 mm
    expect(DIMS.SCREW.outerDiameter).toBeCloseTo(0.86, 2);
    expect(DIMS.SCREW.length).toBeCloseTo(4.67, 2);
    expect(DIMS.SCREW.gap * 1000).toBeCloseTo(4.2, 1);
    expect(DIMS.SCREW.tailDepth).toBeCloseTo(
      PSI_OPT * DIMS.SCREW.outerDiameter * Math.cos((DIMS.SCREW.slopeDeg * Math.PI) / 180),
      12,
    );
  });

  it('keeps the estimates of the simulation for the blades, the core and the journal', () => {
    const d = DIMS.SCREW.outerDiameter;
    expect(DIMS.bladeThickness(d)).toBeCloseTo(BLADE_THICKNESS_FRAC * d, 12);
    expect(DIMS.coreWall(d)).toBeCloseTo(CORE_WALL_FRAC * d, 12);
    expect(DIMS.journalRadius(d)).toBeCloseTo(0.05 * d, 12);
    // the wall of the core is thinner than the core's radius, the blades are thinner than a blade spacing
    expect(DIMS.coreWall(d)).toBeLessThan(DIMS.SCREW.innerDiameter / 2);
    expect(DIMS.bladeThickness(d)).toBeLessThan(DIMS.SCREW.bladeSpacing);
  });

  it('makes the drive reach the generator speed: chain then belt, the two ratios multiply to the rated speed over the screw speed', () => {
    const p = presetParams('full-size');
    const plant = plantFor(p);
    expect(DIMS.DESIGN.chainRatio).toBe(plant.defaultChain);
    expect(DIMS.DESIGN.beltRatio).toBe(plant.defaultBelt);
    expect(DIMS.DESIGN.chainRatio * DIMS.DESIGN.beltRatio * DIMS.DESIGN.screwRpm).toBeCloseTo(GEN_RATED_RPM, -1);
    expect(DIMS.DESIGN.generatorRpm).toBe(GEN_RATED_RPM);
    // the same arithmetic for the other presets and for a river screw
    for (const [head, flow] of [
      [1, 0.031],
      [1.5, 0.035],
      [3, 2.2],
    ] as const) {
      const sized = sizeScrew({ designFlow: flow, head, slopeDeg: 22 });
      const r = DIMS.defaultDriveRatios(sized.outerDiameter);
      const q = plantFor({ machine: 'screw', head, designFlow: flow, slope: 22, roughness: 0.5 });
      expect(r.chain).toBe(q.defaultChain);
      expect(r.belt).toBe(q.defaultBelt);
    }
  });

  it('cuts a large sprocket of 56 teeth of 25.4 mm pitch (radius 0.226 m) and a small one whose teeth follow the ratio', () => {
    expect(DIMS.largeSprocketRadius()).toBeCloseTo(0.2263, 3);
    expect(DIMS.sprocketRadius(17)).toBeCloseTo(0.0691, 3);
    const z = DIMS.smallTeeth(DIMS.DESIGN.chainRatio);
    expect(DIMS.DRIVE.largeTeeth / z).toBeCloseTo(DIMS.DESIGN.chainRatio, 1);
    expect(DIMS.smallTeeth(1)).toBe(DIMS.DRIVE.largeTeeth);
    expect(DIMS.smallTeeth(6)).toBeGreaterThanOrEqual(9);
    expect(DIMS.DRIVE.largePulleyRadius / DIMS.smallPulleyRadius(DIMS.DESIGN.beltRatio)).toBeCloseTo(
      DIMS.DESIGN.beltRatio,
      9,
    );
    // the wheels of one stage never overlap: centre distance > sum of the radii
    const c1 = Math.hypot(DIMS.DRIVE.countershaftAt[0], DIMS.DRIVE.countershaftAt[1]);
    expect(c1).toBeCloseTo(DIMS.DRIVE.chainCentres, 1);
    expect(c1).toBeGreaterThan(DIMS.largeSprocketRadius() + DIMS.sprocketRadius(z));
    const c2 = Math.hypot(
      DIMS.DRIVE.generatorAt[0] - DIMS.DRIVE.countershaftAt[0],
      DIMS.DRIVE.generatorAt[1] - DIMS.DRIVE.countershaftAt[1],
    );
    expect(c2).toBeCloseTo(DIMS.DRIVE.beltCentres, 1);
    expect(c2).toBeGreaterThan(DIMS.DRIVE.largePulleyRadius + DIMS.smallPulleyRadius(DIMS.DESIGN.beltRatio));
    // the big wheels clear the platform: nothing is lower than the shaft minus its radius (checked in the scene tests with the real layout)
    expect(DIMS.largeSprocketRadius()).toBeLessThan(0.3);
  });

  it('scales the hardware with the screw, between 0.6 and 2.2', () => {
    expect(DIMS.hardwareScale(DIMS.SCREW.outerDiameter)).toBeCloseTo(1, 9);
    expect(DIMS.hardwareScale(0.1)).toBe(0.6);
    expect(DIMS.hardwareScale(5)).toBe(2.2);
    let prev = 0;
    for (const d of [0.2, 0.4, 0.86, 1.5, 2.5]) {
      const k = DIMS.hardwareScale(d);
      expect(k).toBeGreaterThanOrEqual(prev);
      prev = k;
    }
  });

  it('falls back to the last good shape when the state carries zeros (a wheel scenario)', () => {
    const last = { ...DIMS.DESIGN_SHAPE, length: 6 };
    expect(DIMS.shapeOf({ outerDiameter: 0, innerDiameter: 0, pitch: 0, length: 0, slopeDeg: 0 }, last)).toEqual(last);
    expect(DIMS.shapeOf({ ...DIMS.DESIGN_SHAPE, outerDiameter: 0.5 }, last).outerDiameter).toBe(0.5);
    expect(DIMS.shapeOf({ ...DIMS.DESIGN_SHAPE, outerDiameter: Number.NaN }, last)).toEqual(last);
  });

  it('draws the site with the head of the design point and a tailrace compressed from about 100 m', () => {
    expect(DIMS.SITE.tailY).toBeCloseTo(-DIMS.DESIGN.head, 12);
    // reported: the real tailrace is about 100 m (S1 12:36); the drawn one is the west run and the turn, a quarter of it
    const drawn = DIMS.SITE.tailrace.length + (DIMS.SITE.embankment.zSouth - DIMS.SITE.embankment.zNorth);
    expect(drawn).toBeLessThan(40);
    expect(drawn).toBeGreaterThan(15);
    expect(DIMS.SITE.tailrace.length).toBeCloseTo(DIMS.SITE.chamber.xWest - DIMS.SITE.tailrace.xEnd, 6);
    // the weir is lower than the ground and higher than the downstream water; the notch is a small part of the crest; the reserved flow
    // passes through it
    expect(DIMS.SITE.weir.crestY).toBeLessThan(DIMS.SITE.groundY);
    expect(DIMS.SITE.weir.crestY).toBeGreaterThan(DIMS.SITE.tailY);
    expect(DIMS.SITE.notch.width).toBeLessThan(0.1 * (DIMS.SITE.fishPass.z - DIMS.SITE.river.zNorth));
    // the canal flows at the simulation's speed, the rack loses the simulation's head
    expect(DIMS.CANAL_SPEED_MS).toBe(0.8);
    expect(DIMS.RACK_CLEAN_LOSS).toBeCloseTo((0.3 * 0.8 * 0.8) / (2 * 9.81), 12);
    // the fish pass climbs the whole height from the downstream water to the crest in its pools
    expect(DIMS.SITE.fishPass.pools).toBe(5);
  });
});
