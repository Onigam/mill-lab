import * as THREE from 'three';
import { clamp } from '@onigam/lab-kit/three';
import type { MillState } from '../../sim/types';
import { BEARING, DRIVE, GENERATOR, SITE, SITE_DRIVE, defaultDriveRatios, type ScrewShape } from '../dims';
import { smoothstep } from '../common';
import { mergeStatic } from '../merge';
import { MACHINE_PARTS, buildDriveMachine, emptyRig, type BandInfo, type Rig } from '../screw/build';
import { inletLevel, worldPoint, type Layout } from '../screw/layout';
import { pillowBlock, wedge } from '../screw/structure';

// The drive train in the `site` world: the machine of the screw world (large sprocket on the screw's shaft, chain, small sprocket on the countershaft, the
// countershaft in its two pillow blocks, large pulley, belt, small pulley on the generator, the generator), built by the SAME builder (`buildDriveMachine`),
// at its true size, in its true place round the shaft: the screw world's frame, moved to the site by a pure translation (`siteFrame`). Only what carries
// it is drawn for the place, because the platform of the screw world cannot stand on the canal:
//   - the shaft goes on through the upper bearing to the large sprocket; the bearing stands on a BEAM across the end of the canal, whose south end rests on a
//     PIER on the quay at the east edge of the pit (the old pit and the quay end there);
//   - the countershaft is 0.78 m to the south of the shaft, that is over the south strip of the canal: its two pillow blocks stand on a SHELF that leaves the
//     south wall, over the water (the water passes under it, and the rest of the canal stays open);
//   - the generator is 1.62 m to the south, on the south wall and the bank: it stands on the bank on the wedge the screw world gives it.
// The electronics are not drawn here (the powerhouse houses them); the cable of the generator's terminal goes to the powerhouse.

/** Visible rate above which a wheel fades into a blur disc, in positions per second (the same numbers as the screw world, `screw/scene.ts`: a test ties them). */
export const BLUR_FROM = 14;
export const BLUR_FULL = 24;
/** The pattern of a chain or a belt never runs faster than this many repeats a second. */
export const BAND_PERIODS_MAX = 12;

export type DrivePartId = (typeof MACHINE_PARTS)[number];

/** The screw world's frame in the site: site = world + (dx, dy, dz). The screw is placed so that its pool stands at the design tail level of the site. */
export interface Frame {
  dx: number;
  dy: number;
  dz: number;
}

export function siteFrame(l: Layout): Frame {
  const ch = SITE.chamber;
  const c = SITE.canal;
  return {
    dx: ch.xWest + ch.lowerEnd,
    dy: SITE.tailY + (l.y0 - l.tailY) - l.y0,
    dz: (c.zNorth + c.zSouth) / 2,
  };
}

// ------------------------------------------------------------------------------------------------ the heights of the supports

export interface DriveLevels {
  /** The highest water the world draws at the end of the canal and in the basin: a full bucket stands at the lowest saddle (`inletLevel(l, 1)`). */
  waterTop: number;
  /** Top of the beam under the upper bearing. */
  beamTop: number;
  /** Top of the shelf under the countershaft. */
  shelfTop: number;
}

/** Height (site) of the plane y' = yp of the screw frame over the axial position s. */
const planeAt = (l: Layout, fr: Frame, s: number, yp: number): number => l.y0 + s * l.sinB + yp * l.cosB + fr.dy;
/** Abscissa (site) of the same plane's point. */
const planeX = (l: Layout, fr: Frame, s: number, yp: number): number => s * l.cosB - yp * l.sinB + fr.dx;

/** What the countershaft's pillow blocks are: their axial positions, the half length of their foot and its plane (y' of the screw frame). */
function countershaftBlocks(l: Layout) {
  const rjc = DRIVE.countershaftRadius * l.k;
  const pb = pillowBlock(rjc);
  pb.meshes.forEach((m) => m.geometry.dispose());
  const Lh = BEARING.housingLength * rjc;
  const Wh = BEARING.housingWidth * rjc;
  return {
    s: DRIVE.countershaftBearings.map((b) => l.L + b * l.k),
    halfS: Lh * 0.575,
    halfZ: Wh * 0.775,
    yp: l.counterAt[0] + pb.baseY,
  };
}

export function driveLevels(l: Layout, fr: Frame): DriveLevels {
  const k = l.k;
  const S = SITE_DRIVE;
  const waterTop = inletLevel(l, 1) + fr.dy;
  // the beam: its top is a plinth under the lowest corner of the bearing's foot
  const rj = l.rj;
  const pbU = pillowBlock(rj);
  pbU.meshes.forEach((m) => m.geometry.dispose());
  const halfU = BEARING.housingLength * rj * 0.575;
  const beamTop = planeAt(l, fr, l.sUp - halfU, pbU.baseY) - S.beam.plinth;
  // the shelf: under the lowest point of the belt (on the large pulley) and of the feet of the pillow blocks, but over the water
  const cs = countershaftBlocks(l);
  const pulley = worldPoint(l, l.sBelt, l.counterAt[0], l.counterAt[1]);
  const lowBelt = pulley.y + fr.dy - (DRIVE.largePulleyRadius + 0.009) * k * l.cosB;
  const lowBlock = Math.min(...cs.s.map((s) => planeAt(l, fr, s - cs.halfS, cs.yp)));
  const shelfTop = Math.max(
    waterTop + S.waterClearance + S.shelf.thickness,
    Math.min(lowBelt - S.shelf.belowBelt, lowBlock - S.shelf.plinth),
  );
  return { waterTop, beamTop, shelfTop };
}

// ------------------------------------------------------------------------------------------------ the masonry

export interface DriveSupports {
  group: THREE.Group;
  /**
   * The pieces of masonry before they are merged (site frame, boxes): the supports of the "no floating part" test and of the one about the water. The design
   * screw has the first five; a bigger one lifts the drive over the walls, which then need the last two (a pier for the north end of the beam, one for the
   * generator on the bank).
   */
  pieces: Record<'beam' | 'pier' | 'bearingWedge' | 'shelf' | 'root', THREE.Box3> & {
    northPier?: THREE.Box3;
    generatorPier?: THREE.Box3;
  };
  levels: DriveLevels;
}

const boxMesh = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

/** The upper bearing on its beam and pier, and the shelf of the countershaft, in the site frame. `masonry` makes the material of the walls of the canal. */
export function buildSupports(l: Layout, fr: Frame, levels: DriveLevels, masonry: () => THREE.Material): DriveSupports {
  const c = SITE.canal;
  const ch = SITE.chamber;
  const S = SITE_DRIVE;
  const g = new THREE.Group();
  g.name = 'drive-supports';
  const mat = masonry();
  const pieces = {} as DriveSupports['pieces'];
  const keep = (name: keyof DriveSupports['pieces'], m: THREE.Mesh) => {
    m.name = `support-${name}`;
    g.add(m);
    pieces[name] = new THREE.Box3().setFromObject(m);
  };
  const groundY = SITE.groundY;

  // ---- the upper bearing: the pillow block on the shaft, its wedge, the beam across the canal, the pier on the quay
  const pbU = pillowBlock(l.rj);
  const tilt = new THREE.Group();
  tilt.position.set(fr.dx, l.y0 + fr.dy, fr.dz);
  tilt.rotation.z = l.beta;
  const at = new THREE.Group();
  at.position.set(l.sUp, 0, 0);
  pbU.meshes.forEach((m) => at.add(m));
  tilt.add(at);
  g.add(tilt);
  const halfS = BEARING.housingLength * l.rj * 0.575;
  const halfZ = BEARING.housingWidth * l.rj * 0.775;
  const wg = wedge(l, l.sUp, halfS, pbU.baseY, 0, halfZ, levels.beamTop - fr.dy);
  if (wg) {
    wg.translate(fr.dx, fr.dy, fr.dz);
    keep('bearingWedge', new THREE.Mesh(wg, mat));
  } else pieces.bearingWedge = new THREE.Box3();
  const xb = planeX(l, fr, l.sUp, pbU.baseY);
  const bx0 = xb - S.beam.breadth / 2;
  const bx1 = xb + S.beam.breadth / 2;
  keep(
    'beam',
    boxMesh(
      bx0,
      levels.beamTop - S.beam.depth,
      c.zNorth + S.beam.embed,
      bx1,
      levels.beamTop,
      c.zSouth - S.beam.embed,
      mat,
    ),
  );
  keep(
    'pier',
    boxMesh(bx0, ch.quayY - 0.05, c.zSouth - 0.15, bx1, levels.beamTop, c.zSouth - 0.15 + S.pier.reach, mat),
  );
  // a bigger screw lifts the bearing over the walls (their tops are at the ground): the north end of the beam then stands on a pier too
  if (levels.beamTop - S.beam.depth > groundY - 0.02)
    keep(
      'northPier',
      boxMesh(bx0, groundY - 0.05, c.zNorth + 0.15 - S.pier.reach, bx1, levels.beamTop, c.zNorth + 0.15, mat),
    );

  // ---- the shelf of the countershaft: it leaves the south wall over the water, as far as the blocks (and the generator, if a small machine puts it over the canal) need
  const cs = countershaftBlocks(l);
  const k = l.k;
  const items: { x0: number; x1: number; z0: number }[] = cs.s.map((s) => ({
    x0: planeX(l, fr, s - cs.halfS, cs.yp),
    x1: planeX(l, fr, s + cs.halfS, cs.yp),
    z0: fr.dz + l.counterAt[1] - cs.halfZ,
  }));
  const gen = {
    z0: fr.dz + l.generatorAt[1] - GENERATOR.bodyRadius * k * 1.05,
    z1: fr.dz + l.generatorAt[1] + GENERATOR.bodyRadius * k * 1.05,
    yp: l.generatorAt[0] - (GENERATOR.bodyRadius + GENERATOR.foot[1]) * k,
    s: l.sGenFront + (GENERATOR.bodyLength * k) / 2,
    half: GENERATOR.foot[2] * k * 0.5,
  };
  const genX0 = planeX(l, fr, gen.s - gen.half, gen.yp);
  const genX1 = planeX(l, fr, gen.s + gen.half, gen.yp);
  const genOnBank = gen.z0 >= c.zSouth - 0.15 - 1e-6;
  if (!genOnBank) items.push({ x0: genX0, x1: genX1, z0: gen.z0 });
  const x0 = Math.min(...items.map((i) => i.x0)) - S.shelf.endMargin;
  const x1 = Math.max(...items.map((i) => i.x1)) + S.shelf.endMargin;
  const zEdge = Math.min(...items.map((i) => i.z0)) - S.shelf.sideMargin;
  const zWall = c.zSouth - 0.05;
  const top = levels.shelfTop;
  keep('shelf', boxMesh(x0, top - S.shelf.thickness, zEdge, x1, top, zWall, mat));
  // the root is let into the wall; if the shelf is lifted over the top of the wall (a bigger screw, or west of the pit's end where the wall is the quay's), it goes down to it
  const wallTop = Math.min(x0, x1) < ch.xEast ? ch.quayY : groundY;
  keep(
    'root',
    boxMesh(
      x0,
      Math.min(top - S.shelf.rootDepth, wallTop - 0.05),
      c.zSouth - 0.15 - S.shelf.rootReach,
      x1,
      top - S.shelf.thickness,
      zWall,
      mat,
    ),
  );
  // the generator stands on the south wall and the bank: for a bigger screw its plinth is over the ground, and a pier takes it down (buried in the bank)
  if (genOnBank && top > groundY - 0.05)
    keep('generatorPier', boxMesh(genX0 - 0.04, groundY - 1, gen.z0 - 0.04, genX1 + 0.04, top, gen.z1 + 0.04, mat));
  mergeStatic(g, { name: 'drive-supports' });
  return { group: g, pieces, levels };
}

// ------------------------------------------------------------------------------------------------ the drive

/** The phase of the pattern of a chain or a belt after a step of the screw: at the rim speed of the wheel it follows, never faster than the eye can follow. */
function bandPhase(b: BandInfo | null, phase: number, dTheta: number, dt: number): number {
  if (!b) return phase;
  const inc = (dTheta * b.ratio * b.radius) / b.period;
  const cap = BAND_PERIODS_MAX * dt;
  return phase + (dt > 0 ? clamp(inc, -cap, cap) : inc);
}

export interface DriveRatios {
  chain: number;
  belt: number;
}

/**
 * The drive of the site: `machine` is the screw world's frame moved to the site, with one group per part of the machine (`roots`); `supports` is the masonry.
 * Both are children of `group`, which the chamber adds after its own merge. `update` turns the wheels and runs the chain and the belt as the screw world does.
 */
export class SiteDrive {
  readonly group = new THREE.Group();
  readonly machine = new THREE.Group();
  readonly roots = {} as Record<DrivePartId, THREE.Group>;
  readonly rig: Rig;
  readonly supports: DriveSupports;
  readonly frame: Frame;
  /** The layout the machine is built on: the screw's, with the wedges of the countershaft and the generator standing on the shelf. */
  readonly layout: Layout;
  readonly levels: DriveLevels;
  /** The terminal box of the generator, site frame: where the cable leaves. */
  readonly terminal = new THREE.Vector3();
  private readonly ctx: { roots: Record<string, THREE.Group>; ratios: DriveRatios; textures: DriveTextures };
  private phaseChain = 0;
  private phaseBelt = 0;

  constructor(l: Layout, textures: DriveTextures, ratios: DriveRatios, masonry: () => THREE.Material, theta = 0) {
    this.frame = siteFrame(l);
    this.levels = driveLevels(l, this.frame);
    this.layout = { ...l, platTop: this.levels.shelfTop - this.frame.dy };
    this.group.name = 'site-drive';
    this.machine.name = 'site-drive-machine';
    this.machine.position.set(this.frame.dx, this.frame.dy, this.frame.dz);
    for (const id of MACHINE_PARTS) {
      const r = new THREE.Group();
      r.name = `site-${id}`;
      this.roots[id] = r;
      this.machine.add(r);
    }
    this.ctx = { roots: this.roots, ratios: { ...ratios }, textures };
    this.rig = emptyRig(this.layout);
    this.supports = buildSupports(l, this.frame, this.levels, masonry);
    this.group.add(this.machine, this.supports.group);
    this.build(theta);
  }

  /** The ratios drawn now. */
  get ratios(): DriveRatios {
    return this.ctx.ratios;
  }

  private build(theta: number): void {
    const t = buildDriveMachine(this.layout, this.ctx, this.rig);
    this.terminal.copy(t).add(new THREE.Vector3(this.frame.dx, this.frame.dy, this.frame.dz));
    // a wheel on the shaft or on a shaft driven by it stands where the screw's angle puts it
    for (const w of this.rig.wheels) w.phase = theta * w.ratio;
    this.phaseChain = 0;
    this.phaseBelt = 0;
  }

  /** Redraw the small wheels, the chain and the belt for other ratios (the screw's own parts, the supports and the shelf stay). */
  rebuild(ratios: DriveRatios, theta: number): void {
    this.ctx.ratios = { ...ratios };
    this.build(theta);
  }

  /**
   * One frame: every wheel turns by the screw's step times its ratio (the wagon-wheel guard: above `BLUR_FROM` positions a second the wheel stops following the
   * true angle and a disc fades in), the patterns of the chain and the belt run at the rim speed of their wheel, never faster than the eye can follow.
   * `rps` is the visible rate of the screw, `solid` whether the part is drawn solid (the discs are not drawn in the ghost or hidden mode).
   */
  update(dTheta: number, rps: number, dt: number, solid: boolean): void {
    for (const w of this.rig.wheels) {
      const dI = dTheta * w.ratio;
      const passes = rps * w.ratio * w.symmetry;
      const blur = smoothstep(BLUR_FROM, BLUR_FULL, passes);
      if (blur > 0.5 && dt > 0) {
        const cap = (2 * Math.PI * BLUR_FROM * dt) / w.symmetry;
        w.phase += clamp(dI, -cap, cap);
      } else w.phase += dI;
      w.rot.rotation.x = w.phase;
      if (w.blur) {
        w.blur.visible = blur > 0.02 && solid;
        (w.blur.material as THREE.MeshBasicMaterial).opacity = 0.62 * blur;
      }
    }
    this.phaseChain = bandPhase(this.rig.chain, this.phaseChain, dTheta, dt);
    this.phaseBelt = bandPhase(this.rig.belt, this.phaseBelt, dTheta, dt);
    if (this.rig.chain) this.rig.chain.texture.offset.x = this.phaseChain;
    if (this.rig.belt) this.rig.belt.texture.offset.x = this.phaseBelt;
  }
}

export interface DriveTextures {
  chain: THREE.Texture;
  belt: THREE.Texture;
}

// ------------------------------------------------------------------------------------------------ the ratios

export interface SiteOptions {
  /** The ratios of the chain and of the belt now, if the application knows them (`MillSim.params`); else they are read from the state, as in the screw world. */
  ratios?: () => DriveRatios;
}

/**
 * The ratios to draw for a state, written into `out`: the application's live ones, or the simulation's default for the diameter and the belt for the rest
 * (as `createScrewScene` does). Without the option the drawn ratios are kept when the state has no speeds.
 */
export function driveRatiosNow(
  opts: SiteOptions,
  shape: ScrewShape,
  state: MillState,
  drawn: DriveRatios,
  out: DriveRatios,
): DriveRatios {
  if (opts.ratios) {
    const r = opts.ratios();
    out.chain = clamp(r.chain, 1, 6);
    out.belt = clamp(r.belt, 1, 8);
  } else if (state.rpm > 1 && state.generatorRpm > 1) {
    const def = defaultDriveRatios(shape.outerDiameter);
    out.chain = def.chain;
    out.belt = clamp(Math.round((state.generatorRpm / state.rpm / def.chain) * 10) / 10, 1, 8);
  } else {
    out.chain = drawn.chain;
    out.belt = drawn.belt;
  }
  return out;
}

/** True when the drawn ratios differ from the wanted ones by more than a redraw is worth (as the screw world). */
export const ratiosChanged = (a: DriveRatios, b: DriveRatios): boolean =>
  Math.abs(a.chain - b.chain) > 0.04 || Math.abs(a.belt - b.belt) > 0.04;
