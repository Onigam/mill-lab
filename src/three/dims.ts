// The single source of dimensions of the 3D worlds, in metres (BRIEF §5). The two worlds (`site`, `screw`), the part sheets and the
// drawings all read these constants; nothing is retyped elsewhere. Whatever the simulation derives from the design point (outer and
// inner diameter, pitch, length, slope, gap, number of threads, the speed ratios of the drive) is IMPORTED from `src/sim`, never repeated:
// this file only adds geometry (the trough, the bearings, the drive frame, the site).
//
// The machine is GENERIC. The maker of the wooden screw in the video publishes no dimension (research §3): the screw is sized by the
// published design rules (Nagel, Rorres) at the lab's design point, and every number that is not a result of those rules is an
// estimate of ours. Provenance of every value, in its comment:
//   reported (Kn, Sn …)   stated in a source (K-number of research §2, S-number of §1)
//   derived (…)           computed from reported figures or from the simulation, the computation is given
//   sim                   read from src/sim (the simulation's own derived or estimated number)
//   estimate: …           the sources are silent: a guess with its reasoning. Part sheets and drawings must flag these.
//
// Frames
//   world frame     X horizontal, along the screw (the upper end of the screw is on the +X side, the water flows towards -X), Y up,
//                   Z towards the viewer. Origin on the floor under the lower end of the flights.
//   screw frame     the world frame tilted by the slope about Z and moved to A0 (the axis at the lower end of the flights): X' along the
//                   axis towards the UPPER end, Y' perpendicular to it in the vertical plane (up), Z across. The section plane is z = 0.
//                   Angles ψ are measured from +Y' towards +Z. The thread is RIGHT-HANDED: the axial position of a blade at the angle ψ
//                   is x' = x0 + pitch·ψ/2π (increasing with ψ), and the turbine turns in the positive sense about +X'.
//   site frame      X east, Y up, Z south (towards the viewer). The river and the canal flow towards -X; the datum Y = 0 is the design
//                   level of the headwater (the water upstream of the screw).
//
// The partition (docs/3d.md): the 12 parts of `site` and the 20 of `screw` are the ids of src/part-ids.ts.

import {
  BEARING_RADIUS_FRAC,
  BLADES,
  BLADE_THICKNESS_FRAC,
  BUS_VOLTS,
  CANAL_SPEED,
  CORE_WALL_FRAC,
  GEN_RATED_RPM,
  PITCH_RATIO,
  PSI_OPT,
  RACK_CLEAN_ZETA,
  RADIUS_RATIO,
  STAGE_RATIO_MAX,
} from '../sim/machine';
import { presetParams } from '../sim/presets';
import { speedRuleRpm } from '../sim/screw';
import { plantFor } from '../sim/system';

export const DEG = Math.PI / 180;

// ------------------------------------------------------------------------------------------------ the design point

const PRESET = presetParams('full-size');
const PLANT = plantFor(PRESET);
const SIZED = PLANT.screw!;

/** The design point the worlds are first drawn at: the lab's default preset (research §8, decision 3). Every field is read from the simulation. */
export const DESIGN = {
  /** Head of the site, m. derived: K5 (1.5 to 2 m on an abandoned mill), 1.75 m is the lab's choice. */
  head: PRESET.head,
  /** Flow the screw is sized for, m³/s. derived: 2 kW at 65 % over 1.75 m (research §2, sanity check of K5). */
  flow: PRESET.designFlow,
  slopeDeg: PRESET.slope,
  /** Chain (slow side) and belt (fast side) ratios that bring the generator to its rated speed. sim: derived. */
  chainRatio: PLANT.defaultChain,
  beltRatio: PLANT.defaultBelt,
  /** Speed of the screw at its design flow, rpm (Nagel's rule), and of the generator, rpm. sim. */
  screwRpm: PLANT.designRpm,
  generatorRpm: GEN_RATED_RPM,
  /** Bus voltage of the battery, V. sim: estimate (a 48 V bank). */
  busVolts: BUS_VOLTS,
} as const;

// ------------------------------------------------------------------------------------------------ the screw

/** What the 3D scene needs of a screw: the five numbers the state carries (`MillState`). */
export interface ScrewShape {
  outerDiameter: number;
  innerDiameter: number;
  pitch: number;
  length: number;
  slopeDeg: number;
}

/**
 * The screw at the design point, as the simulation sizes it. derived: outer diameter from the flow by Nagel's speed rule and
 * Rorres's bucket (D = 1.80 Q^(3/7)), inner diameter 0.5357 D (Rorres 2000 table 1, N = 3), pitch = D (Nagel), length = head / sin(slope),
 * gap 0.0045 √D (Nagel). None of these is a dimension of the association's machine.
 */
export const SCREW = {
  threads: BLADES,
  outerDiameter: SIZED.outerDiameter,
  innerDiameter: SIZED.innerDiameter,
  radiusRatio: RADIUS_RATIO,
  pitch: SIZED.pitch,
  pitchRatio: PITCH_RATIO,
  length: SIZED.length,
  slopeDeg: SIZED.slopeDeg,
  /** Gap between the blade tips and the trough, m. sim: derived (Nagel 1968, 4.2 mm at 0.86 m). */
  gap: SIZED.gap,
  /** Volume of one full bucket (pocket of water between two blades), m³, and the number of buckets in the screw. sim: derived. */
  bucketVolume: SIZED.bucketVolume,
  buckets: SIZED.buckets,
  /** Depth between an empty and a full bucket, m (the head lost when the screw is under-filled). sim: derived. */
  bucketDepth: SIZED.bucketDepth,
  /** Axial distance between two successive blades (pitch / threads), m. derived. */
  bladeSpacing: SIZED.pitch / BLADES,
  /** Optimal tailwater depth over the lowest point of the trough at the lower end, m: 0.60 D cos(slope). derived: Nuernbergk 2020 as quoted by Simmons & Lubitz 2024 (sim PSI_OPT). */
  tailDepth: PSI_OPT * SIZED.outerDiameter * Math.cos(SIZED.slope),
} as const;

/** The screw shape of the design point. */
export const DESIGN_SHAPE: ScrewShape = {
  outerDiameter: SCREW.outerDiameter,
  innerDiameter: SCREW.innerDiameter,
  pitch: SCREW.pitch,
  length: SCREW.length,
  slopeDeg: SCREW.slopeDeg,
};

/** Thickness of a blade (along the axis), m. sim: estimate, 2.5 % of the outer diameter (BLADE_THICKNESS_FRAC). */
export const bladeThickness = (d: number): number => BLADE_THICKNESS_FRAC * d;
/** Wall of the core tube, m. sim: estimate, 4 % of the outer diameter (CORE_WALL_FRAC). */
export const coreWall = (d: number): number => CORE_WALL_FRAC * d;
/** Radius of the bearing journal, m. sim: estimate, 5 % of the outer diameter (BEARING_RADIUS_FRAC). */
export const journalRadius = (d: number): number => BEARING_RADIUS_FRAC * d;

/**
 * Scale of the hardware (bearings, sprockets, generator, battery, platform, pools) of a screw of outer diameter `d` relative to the
 * design screw. estimate: the hardware of a bigger machine is bigger, but less than in proportion; clamped to 0.6 .. 2.2 so a 0.4 m prototype
 * and a 2.5 m river screw still read well. Purely visual.
 */
export function hardwareScale(d: number): number {
  const k = Math.pow(d / DESIGN_SHAPE.outerDiameter, 0.7);
  return Math.min(2.2, Math.max(0.6, k));
}

/** The shape to draw for a state: the state's five numbers, or the last valid shape (a wheel scenario carries zeros). */
export function shapeOf(s: ScrewShape, fallback: ScrewShape = DESIGN_SHAPE): ScrewShape {
  const ok = s.outerDiameter > 0.05 && s.innerDiameter > 0 && s.pitch > 0 && s.length > 0.3 && s.slopeDeg > 5;
  return ok ? { ...s } : { ...fallback };
}

/** The blades are cut in wooden modules bolted on the core: this many per turn of one blade. estimate: S1 shows modules, not their count. */
export const MODULES_PER_TURN = 4;
/** Bolts holding one module on the core (two, one near each end of its root). estimate. */
export const BOLTS_PER_MODULE = 2;
/** Hex bolt of the blade modules (M16: head 24 mm across flats, 10 mm high). estimate: catalogue size. */
export const BOLT = { shank: 0.016, acrossFlats: 0.024, head: 0.01, washer: 0.034, washerThickness: 0.003 } as const;
/** Root angle of the module (steel angle strip along the root of each module, bolted through the core wall). estimate. */
export const ROOT_STRIP = { width: 0.05, thickness: 0.006 } as const;
/** End plates of the core tube, m. estimate. */
export const CORE_PLATE = { thickness: 0.03 } as const;

/** The trough: a concrete channel of semicircular bottom and straight sides. estimate: no source gives it; the wall is a poured wall. */
export const TROUGH = {
  /** Wall thickness, m. */
  wall: 0.07,
  /** Height of the side walls over the axis, as a multiple of the outer radius (a half-pipe: the water level of a full bucket is about at the axis). */
  sideHeight: 0.3,
  /** The trough starts and ends this far beyond the flights, m. */
  overhang: 0.05,
  /** Concrete piers under the trough: how many beyond the two ends, their width (along the axis) and breadth, m. */
  piers: 2,
  pierWidth: 0.4,
} as const;

/** Bearings: a pillow block on a pedestal at each end of the shaft. estimate: catalogue pillow blocks scaled to the shaft. */
export const BEARING = {
  /** Distance of the lower bearing beyond the lower end of the flights, m (a pier in the outlet pool). */
  lowerOffset: 0.42,
  /** Distance of the upper bearing beyond the upper end of the flights, m (on the platform). */
  upperOffset: 1.0,
  /** Housing: width across the shaft, height over the shaft axis, length along it, as multiples of the journal radius. */
  housingWidth: 5.2,
  housingLength: 4.4,
  housingHeight: 3.6,
  /** Foot plate thickness, m. */
  plate: 0.02,
} as const;

// ------------------------------------------------------------------------------------------------ the drive

/**
 * Chain stage (slow side) then belt stage (fast side), research §8 decision 7. The radii are those of the design machine; a
 * different ratio changes the small wheel only. All shafts are parallel to the screw axis.
 */
export const DRIVE = {
  /** Roller chain pitch, m. estimate: ISO 16B (1 in), a usual size for a few kW at low speed. */
  chainPitch: 0.0254,
  /** Teeth of the large sprocket on the screw shaft: pitch radius = pitch / (2 sin(π/z)) = 0.226 m. estimate. */
  largeTeeth: 56,
  /** Large pulley (on the countershaft), pitch radius, m. estimate: 0.40 m flat-belt pulley. */
  largePulleyRadius: 0.2,
  /** Centre distances in the plane perpendicular to the axis, m: chain stage and belt stage. estimate. */
  chainCentres: 0.78,
  beltCentres: 0.84,
  /** Axial positions beyond the upper end of the flights, m: the chain plane, the belt plane. estimate. */
  chainPlane: 1.45,
  beltPlane: 2.05,
  /** The countershaft runs in two pillow blocks at these axial positions beyond the upper end, m: one between the two wheels, one outboard. estimate. */
  countershaftBearings: [1.76, 2.34],
  /** Axial extent of the countershaft beyond the upper end, m: from, to. */
  countershaftFrom: 1.3,
  countershaftTo: 2.5,
  /** Radius of the countershaft, m. estimate: a 44 mm shaft. */
  countershaftRadius: 0.022,
  /** Face widths, m: chain sprocket plate, belt (and pulley). estimate. */
  sprocketThickness: 0.026,
  beltWidth: 0.07,
  beltThickness: 0.006,
  /** Where the centres lie in the section perpendicular to the axis: the countershaft and the generator, as (y', z) from the screw axis, m. estimate (the generator's height
   * puts its body on the bank of the `site` world, which the screw world's machine shares). */
  countershaftAt: [-0.1, 0.78],
  generatorAt: [-0.046, 1.62],
  /** Largest ratio of one stage before a second stage would be needed (sim STAGE_RATIO_MAX). */
  stageRatioMax: STAGE_RATIO_MAX,
} as const;

/** Radius of the large sprocket (pitch circle), m. derived: pitch / (2 sin(π/z)). */
export const largeSprocketRadius = (): number => DRIVE.chainPitch / (2 * Math.sin(Math.PI / DRIVE.largeTeeth));
/**
 * The ratios the simulation chooses when it sizes the drive for a screw of this diameter: the generator reaches its rated speed when the
 * screw turns at the speed of the rule. sim: the same arithmetic as `plantFor` (chain up to the stage limit, belt for the rest).
 */
export function defaultDriveRatios(outerDiameter: number): { chain: number; belt: number } {
  const total = Math.max(1, GEN_RATED_RPM / speedRuleRpm(outerDiameter));
  const chain = Math.max(1, Math.round(Math.min(STAGE_RATIO_MAX, Math.sqrt(total)) * 10) / 10);
  const belt = Math.max(1, Math.round((total / chain) * 10) / 10);
  return { chain, belt };
}

/** Teeth of the small sprocket for a chain ratio. derived: the integer number nearest to z_large / ratio, at least 9. */
export const smallTeeth = (chainRatio: number): number =>
  Math.max(9, Math.round(DRIVE.largeTeeth / Math.max(1, chainRatio)));
/** Pitch radius of a sprocket of z teeth, m. */
export const sprocketRadius = (teeth: number): number => DRIVE.chainPitch / (2 * Math.sin(Math.PI / teeth));
/** Radius of the small pulley for a belt ratio, m. derived: large radius / ratio. */
export const smallPulleyRadius = (beltRatio: number): number => DRIVE.largePulleyRadius / Math.max(1, beltRatio);

/** The generator: a low-speed permanent-magnet machine of the size of the video's "like those of wind turbines" (K7). estimate. */
export const GENERATOR = {
  bodyRadius: 0.155,
  bodyLength: 0.34,
  /** End bell: a slightly larger disc at each end, thickness, extra radius. */
  bell: 0.018,
  bellExtra: 0.012,
  shaftRadius: 0.014,
  /** Length of the shaft stub in front of the body (it carries the small pulley), m. */
  stub: 0.19,
  /** Terminal box on top, m. */
  box: [0.14, 0.07, 0.11],
  /** Mounting feet: width, thickness, length along the axis. */
  foot: [0.07, 0.02, 0.28],
} as const;

/** Electronics on a small plywood board beside the generator, and the battery on the platform. estimate: catalogue sizes of a 48 V system. */
export const ELECTRONICS = {
  /** Board (plywood), m: width, height, thickness. */
  board: [0.9, 0.7, 0.018],
  /** Bridge rectifier in its heat-sink box, charge controller box, m: width, height, depth. */
  rectifier: [0.2, 0.17, 0.09],
  controller: [0.25, 0.3, 0.1],
  /** 48 V lithium battery pack, m: length, height, depth. */
  battery: [0.5, 0.22, 0.3],
  /** Height of the board over the platform (legs), m. */
  boardLift: 0.25,
} as const;

/** The platform that carries the bearing, the countershaft, the generator and the electronics, and the pools at the two ends. estimate. */
export const PLATFORM = {
  /** Slab thickness, posts' breadth, m. */
  slab: 0.16,
  post: 0.22,
  /** Distance from the headwall to the end of the platform, as a length along X (design size), m. */
  length: 4.2,
  /** Half width of the platform (Z), m. */
  halfWidth: 2.1,
  /** Back extension behind the shaft (towards -Z), m. */
  back: 1.1,
} as const;

/** The pool at the lower end (outlet pool) and the basin at the upper end (inlet). estimate: the sources give none. */
export const POOLS = {
  /** Outlet pool: length beyond the lower end of the flights (towards -X), width, wall, slab, m. */
  outletLength: 1.9,
  outletHalfWidth: 1.15,
  wall: 0.15,
  slab: 0.15,
  /** Floor clearance between the outer bottom of the trough at the lower end and the pool slab, m. */
  floorClearance: 0.55,
  /** Freeboard of the pool rim over the design tail level, m (room for a flood rise). */
  freeboard: 1.7,
  /** Length of the inlet basin beyond the upper end of the flights (along the axis), m. */
  inletLength: 0.78,
  /** Rim of the basin over the design inlet level, m. */
  inletFreeboard: 0.28,
} as const;

/** Wood tones of the screw (blade modules alternate the two, so that the module joints read). */
export const COLOURS = {
  woodA: 0xc79a5b,
  woodB: 0xb98a4a,
  concrete: 0x9d988c,
  concreteDark: 0x86817a,
  water: 0x4d9fd1,
  waterDeep: 0x2f7fb8,
} as const;

// ------------------------------------------------------------------------------------------------ the site

/**
 * The mill race at the scale of the place, in the site frame. The real tailrace is about 100 m long (S1 12:36, research §3): it is drawn
 * COMPRESSED to `tailraceLength` so that the whole race fits in one picture; the river, the weir, the canal and the buildings are at true
 * scale. Heights are measured from the design headwater level (Y = 0).
 */
export const SITE = {
  /** Top of the ground over the design headwater level, m. estimate. */
  groundY: 0.55,
  /** Design tailwater level: the headwater minus the head of the design point. derived. */
  tailY: -DESIGN.head,
  /** The world of the site is this wide and deep (the ground tiles), m. */
  ground: { xMin: -160, xMax: 160, zMin: -180, zMax: 110, bottomY: -3.6 },
  /** River: z span, x span, bed upstream (above the weir) and downstream. estimate (a small river). */
  river: { zNorth: 0, zSouth: 12, xWest: -160, xEast: 160, bedUpY: -1.5, bedDownY: -2.9 },
  /** Weir across the river: crest level, thickness along the flow, x position. The crest is 5 cm under the design headwater. estimate. */
  weir: { x: 12, thickness: 1.2, crestY: -0.05 },
  /** The notch in the crest that keeps the reserved flow in the river (the water over the notch is the flow that stays), m. estimate. */
  notch: { width: 0.5, depth: 0.2, z: 7.5 },
  /** Fish pass beside the weir, hugging the south bank: a stepped channel of pools, z span, x span, number of pools. estimate: ecological continuity (research §7). */
  fishPass: { z: 10.6, width: 1.4, pools: 5, xWest: 8.4, xEast: 15.6 },
  /** Headrace canal: x from the chamber to the intake, z span, bed level. The mouth opens on the river at x >= mouth. estimate. */
  canal: { xMax: 21.4, xMin: -8, zNorth: -7.2, zSouth: -4.0, bedY: -1.25, wall: 0.3, mouthX: 17.6 },
  /** Embankment between the canal and the river (the strip of land the canal is cut into), z span. */
  embankment: { zNorth: -4.0, zSouth: 0 },
  /** Trash rack at the head of the canal: x, bar spacing and thickness (a coarse rack, 8 cm clear spacing), height, tilt from the vertical. estimate. */
  rack: { x: 17.6, spacing: 0.08, bar: 0.012, height: 1.7, tilt: 20 },
  /** Head gate (sluice): x, plate height and thickness. estimate. */
  gate: { x: 14.6, height: 1.7, thickness: 0.08 },
  /** The old water chamber where the screw stands: x range of the pit, its floor and walls; the screw's lower end stands `lowerEnd` m from the west wall; the forecourt (quay) in front of the pit is lowered to `quayY` so that the screw can be seen. estimate. */
  chamber: { wall: 0.3, floorY: -3.2, xWest: -15.5, xEast: -8, lowerEnd: 2.1, quayY: -1.3 },
  /** Tailrace: COMPRESSED from about 100 m (S1 12:36) to this length (the west run, then the turn to the river), m; width, bed, x of the turn. estimate. */
  tailrace: { length: 21.1, width: 3.2, bedY: -2.9, xEnd: -36.6 },
  /** Mill building (stone, two storeys, a tile roof): footprint and heights. estimate. */
  mill: { length: 11, width: 7.2, wallHeight: 6.4, ridge: 2.6, x: -18, z: -11.4 },
  /** Small powerhouse by the chamber: ONE part (cabinet, battery, inverter inside). estimate. */
  powerhouse: { length: 2.8, width: 2.4, wallHeight: 2.4, ridge: 0.7, x: -4.6, z: -11.2 },
  /** The house the electricity feeds. estimate. */
  house: { length: 8, width: 5.6, wallHeight: 3.4, ridge: 2, x: 6, z: -22 },
  /** Level the canal falls to below a closed gate (dead water), m. estimate. */
  deadCanalY: -1.0,
  /** Largest drop shown across a clogged rack, m (the real loss can exceed the whole head; the picture is capped). */
  rackDropMax: 1.0,
  /** Flow over a weir, Q = C w H^(3/2): coefficient of a broad crest (SI), used only to draw the sheet over the crest. estimate. */
  weirCoeff: 1.7,
} as const;

/** Head loss of a clean rack at the canal speed, m. derived: ζ v²/2g with the sim's ζ = 0.3 at 0.8 m/s. */
export const RACK_CLEAN_LOSS = (RACK_CLEAN_ZETA * CANAL_SPEED * CANAL_SPEED) / (2 * 9.81);
/** Speed of the water in the canal, m/s (sim). */
export const CANAL_SPEED_MS = CANAL_SPEED;

// ------------------------------------------------------------------------------------------------ the look of the water (the water role)

/**
 * The look of the water: art direction, not measurements. Every value is an `estimate` (nothing here is a result of the simulation); what the
 * water SHOWS (the head over the crest, the unit discharge, the speed of the canal, the level step across the rack, the leak and the
 * overflow of the screw) is read from `MillState` and the SITE block above, see `docs/water.md` for which effect is physical and which is
 * decorative. Positive numbers only (`dims.test.ts` walks every export).
 */
export const WATER_FX = {
  /** Colours of the water, sRGB hex. estimate: shallow = what a film of water over a pale bed shows, deep = clear mill-race water in the shade of the banks, murk = the same in a flood (loaded with silt). */
  colours: {
    shallow: 0x9fd8dc,
    deep: 0x2a7f95,
    murkShallow: 0xb39a6c,
    murkDeep: 0x6e5738,
    foam: 0xf6f4ec,
    foamMurk: 0xdcd3c0,
  },
  /** Absorption of the light by clear water, per metre of depth (the red goes first). estimate: a clear river, a metre of it is already a colour. */
  absorb: 0.85,
  /** Metres of the plan per tile of the noise texture, for the three layers of ripples, and the speed of each layer relative to the surface current. estimate. */
  tiles: [5, 2.2, 1.3],
  layerSpeed: [1, 1.12, 0.88],
  /** Slope scale of the ripples (about the largest slope of a layer): quiet water, the river at its design speed, a flood. estimate. */
  ripple: { quiet: 0.05, river: 0.2, flood: 0.34 },
  /** Standing waves below the weir: amplitude at the design overflow and at the largest, wavelength, decay length, m. estimate: a plunge pool trails a train of waves that dies in a few wavelengths. */
  waves: { amplitude: 0.035, amplitudeMax: 0.09, wavelength: 1.5, decay: 7 },
  /** Gains of the foam at the weir: unit discharge q (m²/s) at which the foam of the toe is full, and the length it trails downstream, m. estimate. */
  foam: { toeFullQ: 0.2, trail: 5, rackFull: 0.9 },
  /** Largest number of particles of spray per world, size range (m) and lifetime (s) of a drop at the weir, at the screw. estimate. */
  spray: { max: 600, size: 0.13, sizeScrew: 0.04, life: 1.1 },
  /** Standing pools of the fish pass: unit discharge of the cascades (m²/s) and the depth of its pools' tint, m. estimate: the pass carries a fraction of the reserved flow. */
  pass: { q: 0.045, depth: 0.55 },
  /** Largest unit discharge the nappe is drawn for, m²/s (a flood: the picture is capped). estimate. */
  nappeMaxQ: 1.2,
} as const;

// ------------------------------------------------------------------------------------------------ the scenery (polish wave)

/**
 * The land round the mill race (src/three/site/terrain.ts, docs/scenery.md): every number is an estimate of ours, nothing here is read from a source.
 * The land meets the water at the openings of `SITE` (river, canal, tailrace, chamber): lined edges stay at `SITE.groundY`, the banks of the river and
 * of the mouth slope down to a `lip` and stop in a short earth face over the water.
 */
export const SCENERY = {
  /** Half size of the land mesh, m: far enough that the fog (`fogDensity`) has swallowed the edge, and the hills end beyond the horizon. estimate. */
  extent: 2400,
  /** Density of the exponential-squared fog, 1/m: about 6 % at 200 m (the far views), 0.1 % left at the edge of the land. estimate. */
  fogDensity: 0.0012,
  /** Level of the land at the edge of an opening, over the datum, m: the pond reach (a little over the crest), the tailwater reach (a metre and more over the water: a flood rises 1.2 m), the fish pass (over its highest pool). estimate. */
  lip: { pondY: 0.12, tailY: -0.3, passY: 0.18 },
  /** Width over which a bank rises from its lip to the meadow, m. estimate. */
  bankWidth: 3.4,
  /** The meadow is flat at `SITE.groundY` here (the buildings, the yard, the lines): x0, x1, z0, z1, m; and a flat floodplain on the south bank. estimate. */
  plateau: { westX: -48, eastX: 28, northZ: -34, southZ: -4 },
  southFlat: { westX: -80, eastX: 90, northZ: 12, southZ: 36 },
  /** The river goes on beyond the dims (x = ±160): it runs under a road bridge, then bends away between hills. Half width of the far river, m, and the deck of the bridges over the datum. estimate. */
  farRiver: { halfWidth: 6, bedBelow: 0.5, bridgeX: 161, bridgeHalf: 3.1, deckY: 2.5, roadHalf: 2.6 },
  /** Levels of the water used to colour the banks (the design levels): pond (a few mm under the crest) and tailwater. */
  design: { pondY: -0.06, tailY: -DESIGN.head },
  /** Vegetation counts (instances), m of the home-view corridor kept free of tall plants. estimate. */
  trees: { willows: 10, poplars: 25, oaks: 16, conifersNear: 70, conifersFar: 1200, shrubs: 55 },
  homeCorridor: 11,
} as const;

// ------------------------------------------------------------------------------------------------ the drive train in the site world

/**
 * What carries the drive train in the `site` world (src/three/site/drive.ts, docs/3d.md). The machine itself is the screw world's, at its true size and in its
 * true place round the shaft; only the masonry under it is drawn for this place (the screw world's platform cannot stand on the canal). Every number is an
 * estimate of ours, the sources give none. The heights are not numbers here: they come from the layout (the base planes of the bearings, the lowest point of the
 * belt, the highest water of the end of the canal).
 */
export const SITE_DRIVE = {
  /** Beam across the canal under the upper bearing: breadth along the canal, depth, the plinth (a wedge of masonry) between its top and the base of the bearing, the length it is let into each wall, m. estimate. */
  beam: { breadth: 0.34, depth: 0.11, plinth: 0.05, embed: 0.05 },
  /** Pier that carries the south end of the beam, on the quay beside the pit: how far it reaches towards the south from the inner face of the canal's south wall, m. estimate. */
  pier: { reach: 0.6 },
  /** Shelf from the south wall that carries the countershaft's pillow blocks: thickness, depth and reach of the root against the wall, margin round the blocks (along the shaft, across it), the plinth under a block (smallest wedge), the clear space under the belt, m. estimate. */
  shelf: {
    thickness: 0.14,
    rootDepth: 0.22,
    rootReach: 0.3,
    endMargin: 0.12,
    sideMargin: 0.12,
    plinth: 0.04,
    belowBelt: 0.1,
  },
  /** Gap kept between the underside of any support over the water and the highest water the world draws at the end of the canal, m. estimate. */
  waterClearance: 0.1,
  /** The cable that leaves the generator's terminal for the powerhouse: height of its first rise over the terminal, m. estimate. */
  cableRise: 0.4,
} as const;

// ------------------------------------------------------------------------------------------------ the generator, inside (completion wave A, 3D role)

/**
 * The permanent-magnet generator of the `generator` world, seen from the inside. NOTE for the data role: the lead's brief calls this block `GENERATOR`, but that name is the
 * outside of the blue machine (`GENERATOR`, above: body, bells, shaft, terminal box, feet) and is used by the drawings and the sheets, so the inside is `GENERATOR_DESIGN`.
 * It is the SAME machine: the frame, the shaft and the terminal box are `GENERATOR` and are not repeated here; this block only adds what is inside them. What the simulation
 * gives (rated speed 600 rpm, 39 N·m, 2.2 kW, see `docs/physics.md` §1.8 and §6) is a result, not a dimension: it is read from `MillState` and `src/sim`, never typed here.
 * Everything else is an estimate of ours: the sources give no pole count, slot count, magnet size or air gap. Frame of the world: X along the shaft, the front face of the
 * body at x = 0 and the body going towards +x (as in the `screw` world, whose small pulley sits on the stub at x < 0), Y up, Z towards the viewer, the axis through the origin.
 * Angles ψ are measured from +Y towards +Z (the top of the machine is ψ = 0).
 */
export const GENERATOR_DESIGN = {
  /** Three phases (derived: the three-phase bridge of `sim/mech`). */
  phases: 3,
  /** Number of magnet poles, north and south alternating, and of stator slots (teeth, coils). estimate: a 24-slot, 16-pole winding is a usual concentrated winding (slots per pole and phase = 1/2); it makes every tooth carry one coil and the phases follow A, B, C round the stator. */
  poles: 16,
  slots: 24,
  /** Rated shaft speed, rpm. sim (`GEN_RATED_RPM`): the electrical frequency is `poles × rpm / 120`, see `electricalFrequency`. */
  ratedRpm: GEN_RATED_RPM,
  /** The section: the front half of the machine (z > 0) is removed from this x on, so that the plane through the axis AND the plane across it (at `section`) both show. estimate: through the middle of the stack, between two cooling ribs. */
  section: 0.14,
  /** Steel tube of the frame under the cooling ribs: wall thickness, m (its outer face is `GENERATOR.bodyRadius`). estimate. */
  shellWall: 0.008,
  /** Cooling ribs round the body (as the blue machine draws them: 5, at sixths of the length), m. estimate. */
  ribs: { count: 5, width: 0.008, height: 0.006 },
  /** Bearing seat of each end bell: the front boss outside the bell, the housing tube inside it, m. estimate. */
  seat: { bossRadius: 0.04, bossLength: 0.02, housingRadius: 0.042, housingLength: 0.014 },
  /** Deep-groove ball bearings (one per bell): outer radius, width, ring thickness, balls (count, radius). The inner radius is the shaft's. estimate: a catalogue 62 mm bearing for a 28 mm shaft. */
  bearing: { outerRadius: 0.031, width: 0.016, ring: 0.0055, balls: 8, ballRadius: 0.003 },
  /** Shaft: key on the stub (length, width, height proud of the shaft), retaining rings against the bearings (radius, width), m. estimate. */
  shaft: { keyLength: 0.07, keyWidth: 0.008, keyHeight: 0.0022, keyFrom: 0.04, ringRadius: 0.0165, ringWidth: 0.003 },
  /** Laminated stator core, pressed in the tube: outer radius, bore (tooth tips), yoke thickness, stack length, tooth stem width, tooth tip half width, shoe thickness, slope from shoe to stem, m. estimate. */
  stator: {
    outerRadius: GENERATOR.bodyRadius - 0.008,
    boreRadius: 0.0925,
    yoke: 0.02,
    stack: 0.15,
    stem: 0.0105,
    tipHalfWidth: 0.0092,
    shoe: 0.006,
    slope: 0.004,
  },
  /** Radial air gap between the tooth tips and the magnets, m. estimate: a gap of 1 to 2 mm is usual for a machine of this size. */
  gap: 0.0015,
  /** Rotor: solid steel core on the shaft (same stack length as the stator), surface magnets (radial thickness, fraction of the pole pitch they cover, clearance at the ends), m. estimate. */
  rotor: { stack: 0.15, magnetThickness: 0.006, magnetArc: 0.8, magnetEndClearance: 0.002 },
  /** One coil per tooth: its build (thickness of a side in the slot), the insulation between the coil and the tooth, the radial extent (from the shoe to the slot bottom), the end turn beyond the stack (thickness along the axis), m. estimate. */
  coil: { build: 0.0058, insulation: 0.0012, from: 0.104, to: 0.1255, overhang: 0.014 },
  /** Terminal box inside: the walls of the sheet-steel box, the studs (radius, height over the block), the cable gland on the end wall and the leads' radius, m. The box itself is `GENERATOR.box`. estimate. */
  terminals: { wall: 0.004, stud: 0.0045, studHeight: 0.03, nut: 0.007, gland: 0.014, lead: 0.003 },
  /** Height of the skids that carry the feet (scenery of the world), m. estimate. */
  skid: 0.06,
} as const;

/** Electrical frequency of a machine with `poles` poles at `rpm`, Hz. derived: f = poles × rpm / 120 (80 Hz at 16 poles and 600 rpm). */
export const electricalFrequency = (rpm: number, poles: number = GENERATOR_DESIGN.poles): number => (poles * rpm) / 120;

// ------------------------------------------------------------------------------------------------ the powerroom (completion wave A, 3D role)

/**
 * The little electrical room of the powerhouse, seen from inside: the wall of equipment in the order the current goes. The room is the building of `SITE.powerhouse` (the site
 * draws its front open so that the inside can be seen; here the front is a wall that fades when the camera is outside). Every size is an estimate: catalogue sizes of a 48 V system;
 * the three pieces moved from the `screw` world (rectifier, charge controller, battery) keep their `ELECTRONICS` sizes. The room is a place, not a wiring plan.
 * Frame: origin on the floor at the middle of the back wall, X along the wall (the cable from the generator comes in through the west wall, on the left; the supply to the
 * house leaves through the east wall, on the right), Y up, Z into the room (towards the viewer), the inner face of the back wall at z = 0. A `size` is [width, height, depth].
 */
export const POWERROOM = {
  /** Thickness of the walls, m (the site's powerhouse), and the inside of the room: width along the wall, depth, height. derived from `SITE.powerhouse`. */
  wall: 0.14,
  width: SITE.powerhouse.length - 0.28,
  depth: SITE.powerhouse.width - 0.28,
  height: SITE.powerhouse.wallHeight,
  /** The switchboard: a steel mounting plate on the back wall (half width, bottom, top, thickness), the cable trunking along its top and bottom (height, depth), the rails that carry the small devices, m. estimate. */
  board: { halfWidth: 1.2, y0: 0.92, y1: 2.02, thickness: 0.04 },
  trunking: { height: 0.09, depth: 0.075 },
  /** Steel rack that carries the battery (it stands on the floor, in front of the board): height of the shelf, depth, m. estimate. */
  rack: { shelf: 0.34, depth: 0.42, post: 0.04 },
  /** The row of devices on the board, in the order the current goes: centre x, centre y (bottom y for the two moved boxes), size. estimate. */
  breaker: { x: -1.05, y: 1.5, size: [0.14, 0.24, 0.1] },
  fuseBox: { x: -0.82, y: 1.5, size: [0.2, 0.26, 0.1] },
  rectifier: { x: -0.55, bottom: 1.36 },
  controller: { x: -0.22, bottom: 1.3 },
  battery: { x: -0.05, z: 0.3 },
  dumpLoad: { x: 0.24, y: 1.48, size: [0.3, 0.32, 0.14] },
  inverter: { x: 0.66, y: 1.42, size: [0.42, 0.4, 0.16] },
  meter: { x: 1.03, y: 1.5, size: [0.16, 0.22, 0.09] },
  /** Earthing: the earth bar and the surge protector on the lower rail of the board, the rod (radius, length above the floor), its distance from the west wall, m. estimate. */
  earthBar: { x: -1.05, y: 1.0, size: [0.2, 0.05, 0.04] },
  surge: { x: -0.78, y: 1.02, size: [0.07, 0.1, 0.07] },
  rod: { radius: 0.0085, above: 0.12, x: -1.12, z: 0.16, length: 2.4 },
  /** The doorway in the east wall (width, height, distance from the front wall) and the door, m. estimate. */
  door: { width: 0.9, height: 2.05, fromFront: 0.25 },
  /** Insulating mat in front of the board (the usual rule for a switchboard): width, depth, thickness, m. estimate. */
  mat: { width: 2.2, depth: 0.8, thickness: 0.01 },
} as const;
