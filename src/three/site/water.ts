import type { PartRegistry, ViewOpts } from '@onigam/lab-kit/three';
import { clamp } from '@onigam/lab-kit/three';
import type { MillState } from '../../sim/types';
import { RACK_CLEAN_LOSS, SITE, WATER_FX } from '../dims';
import { smoothstep } from '../common';
import { type WaterBody } from '../water/body';
import type { RibbonState } from '../water/nappe';
import { Spray, type Emitter } from '../water/spray';
import {
  canalSpeed,
  follow,
  lowWaterOf,
  murkOf,
  riverSpeed,
  rippleOf,
  toeFoam,
  unitDischarge,
  waveAmplitude,
} from '../water/look';
import { waterOf } from '../water/surface';
import { waterKit, type WaterKit } from '../water/kit';
import type {
  ChamberBuild,
  FishPassBuild,
  HeadraceBuild,
  NotchBuild,
  RiverBuild,
  TailraceBuild,
  WeirBuild,
} from './parts';
import { RACK_RAMP } from './parts';
import type { Levels } from './scene';

export { waterKit };
export type { WaterKit };

// The water of the site, frame by frame. The builders (`parts.ts`) make the bodies of water, this class gives them the state: the levels the scene
// damped, the flow of the river over the weir (the head over the crest and the unit discharge of `docs/3d.md`), the speed of each body, the
// foam where water falls or meets a structure, the drop across the rack, the standing waves below the weir, the spray. `docs/water.md` says which
// of these are physical (a number of the model or of the site) and which are decorative (a bounded picture of a physical number).

export interface SiteBodies {
  river: RiverBuild;
  weir: WeirBuild;
  notch: NotchBuild;
  pass: FishPassBuild;
  head: HeadraceBuild;
  tail: TailraceBuild;
  chamber: () => ChamberBuild;
}

/** The speed of the water in a fish pass, m/s (decorative: the pools are slow). */
const POOL_SPEED = 0.28;

export class SiteWaterFx {
  readonly spray = new Spray({ max: WATER_FX.spray.max, seed: 4242 });
  /** What the picture shows now, for the tests: murkiness and lowness (0 .. 1), the unit discharge, the speeds of the river and the canal. */
  readonly now = { murk: 0, low: 0, q: 0, head: 0, vRiver: 0, vCanal: 0, rackStep: 0, poolLevels: [] as number[] };
  private readonly weirEm: Emitter[];
  private readonly notchEm: Emitter;
  private readonly passEm: Emitter[];
  private first = true;
  private readonly rs: RibbonState = { top: 0, sill: 0, floor: 0, q: 0 };

  constructor(
    readonly kit: WaterKit,
    private readonly b: SiteBodies,
    private readonly registry: PartRegistry,
  ) {
    const banks = (bodies: WaterBody[], foam: number) =>
      bodies.forEach((s) => s.water.setBanks(s.x0, s.x1, s.z0, s.z1, foam));
    banks([...b.river.up, ...b.river.down], 0.3);
    banks([b.head.mouth], 0.2);
    banks([b.head.above, b.head.below, ...b.tail.sheets, ...b.pass.pools], 0.3);
    this.weirEm = b.weir.falls.specs.map(() =>
      this.spray.add({ owner: 0, size: WATER_FX.spray.size, life: WATER_FX.spray.life, scatter: 0.55, alpha: 0.75 }),
    );
    this.notchEm = this.spray.add({ owner: 1, size: WATER_FX.spray.size * 0.6, life: 0.8, scatter: 0.35, alpha: 0.7 });
    this.passEm = b.pass.cascades.specs.map(() =>
      this.spray.add({ owner: 2, size: WATER_FX.spray.size * 0.45, life: 0.6, scatter: 0.3, alpha: 0.6 }),
    );
  }

  /** The level of pool `i` of the fish pass for a pond and a tail: evenly spaced from just under the pond to 0.34 m over the tailwater, closing up when the pass is drowned. */
  static poolLevel(i: number, pond: number, tail: number, n: number, floor: number): number {
    const span = Math.max(0, pond - tail - 0.34);
    return Math.max(floor + 0.12, pond - 0.01 - (i * span) / Math.max(1, n - 1));
  }

  /** The drops of a part are drawn while it is solid and in its place: they do not follow an explode, so they go with it. */
  private solid(id: string): boolean {
    const e = this.registry.get(id);
    return !e || (e.display === 'solid' && e.factor < 0.02);
  }

  /** Jump the look to its targets at the next frame (the first frame, tests). */
  settle(): void {
    this.first = true;
  }

  update(s: MillState, dt: number, view: ViewOpts, lv: Levels): void {
    const { river, weir, notch, pass, head, tail } = this.b;
    const R = SITE.river;
    const now = this.now;
    const snap = this.first;
    this.first = false;
    const sh = this.kit.shared;
    sh.time.value = view.time;
    now.murk = snap ? murkOf(s) : follow(now.murk, murkOf(s), dt, 1.4);
    now.low = snap ? lowWaterOf(s) : follow(now.low, lowWaterOf(s), dt, 1.2);
    sh.murk.value = now.murk;
    const { murk, low } = now;
    const depthK = 1 - 0.5 * low;
    const crest = SITE.weir.crestY;
    const q = unitDischarge(s.bypassFlow);
    const vRiver = riverSpeed(s.riverFlow);
    const vCanal = canalSpeed(s.flow);
    now.q = q;
    now.vRiver = vRiver;
    now.vCanal = vCanal;
    const ripple = rippleOf(murk, vRiver);
    const pond = lv.pond;
    const tailY = lv.tail;
    const toeK = toeFoam(q);
    now.head = Math.max(0, pond - crest);

    // ---- the pond and the river above the weir: the surface speed of the river, ripples that follow it, the bed that shows less in a flood
    for (const b of river.up) {
      b.set(pond);
      b.flow(vRiver * dt);
      b.water.setFlow(-1, 0, vRiver);
      b.water.setLook((pond - R.bedUpY) * depthK, ripple, 0.05 + 0.4 * murk);
    }
    // ---- below the weir: the plunge pool, foam, a train of standing waves
    const xd = SITE.weir.x - SITE.weir.thickness / 2;
    const flat = tailY - R.bedDownY;
    for (const b of river.down) {
      b.set(tailY);
      b.flow(vRiver * 1.3 * dt);
      b.water.setFlow(-1, 0, vRiver * 1.3);
      b.water.setLook(flat * depthK, ripple * 1.1, 0.12 + 0.35 * toeK + 0.3 * murk);
      b.water.setFoam(
        toeK,
        0.5 * toeK + 0.12 * murk,
        smoothstep(0.01, 0.1, s.reservedFlow) * 0.85,
        0.5 * smoothstep(0.02, 0.15, s.riverFlow),
      );
      b.water.setWaves(waveAmplitude(q) * (1 + 0.5 * murk), xd - 0.9);
    }

    // ---- the falls over the weir, the jet of the notch, the cascades of the pass
    const spans = weir.falls.specs;
    const rs = this.rs;
    for (let i = 0; i < spans.length; i++) {
      const sp = spans[i];
      rs.top = pond;
      rs.sill = crest;
      rs.floor = tailY;
      rs.q = q;
      const shape = weir.falls.set(i, rs);
      const em = this.weirEm[i];
      const width = sp.z1 - sp.z0;
      const Q = q * width;
      em.rate = shape.visible ? Math.min(240, 160 * Q) : 0;
      em.x = shape.landX - 0.1;
      em.y = tailY + 0.03;
      em.z = (sp.z0 + sp.z1) / 2;
      em.hx = 0.3;
      em.hy = 0.02;
      em.hz = Math.max(0.1, width / 2 - 0.2);
      em.vx = -(0.5 + 0.7 * Math.sqrt(q));
      em.vy = 1.3 + 1.6 * Math.sqrt(q);
      em.floorY = tailY;
    }
    weir.falls.water.advance(3.9 * dt);
    const nSpec = notch.fall.specs[0];
    rs.top = pond;
    rs.sill = crest - SITE.notch.depth;
    rs.floor = tailY;
    rs.q = s.reservedFlow / SITE.notch.width;
    const nShape = notch.fall.set(0, rs);
    notch.fall.water.advance(3.9 * dt);
    this.notchEm.rate = nShape.visible ? Math.min(60, 450 * s.reservedFlow) : 0;
    this.notchEm.x = nShape.landX - 0.05;
    this.notchEm.y = tailY + 0.03;
    this.notchEm.z = (nSpec.z0 + nSpec.z1) / 2;
    this.notchEm.hz = 0.2;
    this.notchEm.hx = 0.15;
    this.notchEm.vx = -0.5;
    this.notchEm.vy = 1.1;
    this.notchEm.floorY = tailY;

    // ---- the pass: pools that step down from just under the pond to just over the tailwater; a cascade over each sill
    const n = pass.pools.length;
    const passK = smoothstep(0.02, 0.25, s.riverFlow);
    now.poolLevels.length = n;
    for (let i = 0; i < n; i++) {
      const p = pass.pools[i];
      const level = SiteWaterFx.poolLevel(i, pond, tailY, n, pass.floors[i]);
      now.poolLevels[i] = level;
      p.set(level);
      p.flow(POOL_SPEED * dt);
      p.water.setFlow(-1, 0, POOL_SPEED);
      p.water.setLook((level - pass.floors[i]) * depthK, 0.07 + 0.05 * murk, 0.3 + 0.4 * murk);
      p.water.setFoam(0.85 * passK);
    }
    const casc = pass.cascades.specs;
    for (let i = 0; i < casc.length; i++) {
      const sp = casc[i];
      const upper = i === 0 ? pond : now.poolLevels[i - 1];
      const lower = i < n ? now.poolLevels[i] : tailY;
      const head = upper - pass.sills[i];
      rs.top = upper;
      rs.sill = pass.sills[i];
      rs.floor = lower;
      rs.q = head > 0.006 ? WATER_FX.pass.q * passK : 0;
      const shape = pass.cascades.set(i, rs);
      const em = this.passEm[i];
      em.rate = shape.visible ? 14 : 0;
      em.x = shape.landX - 0.04;
      em.y = lower + 0.02;
      em.z = (sp.z0 + sp.z1) / 2;
      em.hz = (sp.z1 - sp.z0) / 2 - 0.1;
      em.hx = 0.1;
      em.vx = -0.3;
      em.vy = 0.9;
      em.floorY = lower;
    }
    pass.cascades.water.advance(3 * dt);

    // ---- the canal: the sheet at the mouth, the sheet above the gate with the step across the rack, the sheet below it
    const g = lv.gate;
    const rackLoss = Math.max(0, s.rackLoss - RACK_CLEAN_LOSS);
    const drop = pond - lv.canalUp;
    now.rackStep = drop;
    const blocked = clamp(rackLoss / SITE.rackDropMax, 0, 1);
    const canalBed = SITE.canal.bedY;
    head.mouth.set(pond);
    head.mouth.flow(vRiver * 0.5 * dt);
    head.mouth.water.setFlow(-1, 0, vRiver * 0.5);
    head.mouth.water.setLook((pond - canalBed) * depthK, ripple * 0.7, 0.08 + 0.3 * murk);
    head.above.set(lv.canalUp, lv.canalUp, { len: RACK_RAMP, drop });
    head.above.flow(vCanal * dt);
    head.above.water.setFlow(-1, 0, vCanal);
    head.above.water.setLook(
      (lv.canalUp - canalBed) * depthK,
      0.05 + 0.09 * clamp(vCanal, 0, 1.2),
      0.05 + 0.7 * blocked,
    );
    head.above.water.setFoam(0.12 + 0.95 * blocked);
    const yGate = lv.canalEnd + (lv.canalUp - 0.01 - lv.canalEnd) * g;
    head.below.set(yGate, lv.canalEnd);
    head.below.flow(vCanal * dt);
    head.below.water.setFlow(-1, 0, vCanal);
    head.below.water.setLook((yGate - canalBed) * depthK, 0.04 + 0.09 * clamp(vCanal, 0, 1.2), 0.05 + 0.5 * blocked);
    head.below.water.setFoam(0.55 * g * (1 - g) * 4 * clamp(vCanal / 0.4, 0, 1) + 0.1 * blocked);

    // ---- the tailrace: the outflow of the screw runs down it as a current with waves that die out; the turn ends over a sill into the river
    const ch = this.b.chamber();
    const flowK = clamp(vCanal / 0.8, 0, 1.3);
    const xOut = ch.origin.x + 0.35;
    const zc = (SITE.canal.zNorth + SITE.canal.zSouth) / 2;
    for (let i = 0; i < tail.sheets.length; i++) {
      const b = tail.sheets[i];
      b.set(tailY);
      b.flow(vCanal * dt);
      b.water.setFlow(i === 0 ? -1 : 0, i === 0 ? 0 : 1, Math.max(vCanal, 0.04));
      b.water.setLook(
        (tailY - SITE.tailrace.bedY) * depthK,
        0.05 + 0.1 * clamp(vCanal, 0, 1) + 0.12 * murk,
        0.1 + 0.4 * murk,
      );
      b.water.setFoam(0.4 * flowK + 0.15 * murk);
      if (i === 0) b.water.setSource(0, xOut, zc, 1.3, 0.8 * flowK);
    }

    // ---- the water of the chamber: the pool follows the tail, the basin the end of the canal, both ripple at the speed of the water through them
    const bw = waterOf(ch.basin.mesh.material);
    const pw = waterOf(ch.pool.mesh.material);
    if (bw) {
      bw.setFlow(-1, 0, vCanal * 0.3);
      bw.setLook(1.2 * depthK, 0.03 + 0.03 * clamp(vCanal, 0, 1), 0.05);
    }
    if (pw) {
      pw.setFlow(-1, 0, vCanal * 0.7);
      pw.setLook((tailY - ch.pit.floorY) * depthK, 0.05 + 0.1 * clamp(vCanal, 0, 1), 0.2);
      pw.setSource(0, xOut, 0, 1.3, 0.8 * flowK); // (the prism's own frame: its z = 0 is the axis of the canal)
    }
    const mw = waterOf(ch.pockets.material);
    if (mw) {
      mw.setLook(0.3, 0.025, 0);
      const l = ch.layout;
      mw.setLevel(l.sinB, l.cosB, l.levels.hMin + clamp(s.fill, 0, 1) * (l.levels.hPass - l.levels.hMin));
    }

    // ---- the spray: only the drops of parts that are drawn solid
    this.spray.visible[0] = this.solid('weir');
    this.spray.visible[1] = this.solid('reserved-flow-notch');
    this.spray.visible[2] = this.solid('fish-pass');
    if (snap) this.spray.clear();
    this.spray.update(dt);
  }
}
