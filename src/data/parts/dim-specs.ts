// The dimension rows of the part sheets, ALL read from src/three/dims.ts (the single source of lengths, BRIEF §5): nothing in this file
// is a number typed here. They are appended to the specs of each sheet by ../parts.ts.
//
// Status: whatever the simulation derives from the design point (diameters, pitch, length, gap) is written by placeholder in the sheets
// themselves (« dérivé », figures.ts, checked against dims.ts by data.test.ts); every other length is an ESTIMATE of the 3D model (the
// sources give none) and is tagged « estimation » by `lenM` / `lenMm` / `tagged`. The screw is GENERIC: none of these is a dimension of the
// wooden screw of the video.
import type { Spec } from '@onigam/lab-kit/content';
import {
  BEARING,
  BOLT,
  BOLTS_PER_MODULE,
  DESIGN,
  DRIVE,
  ELECTRONICS,
  GENERATOR,
  GENERATOR_DESIGN,
  MODULES_PER_TURN,
  POOLS,
  POWERROOM,
  SCREW,
  SITE,
  TROUGH,
  bladeThickness,
  coreWall,
  journalRadius,
  largeSprocketRadius,
  smallPulleyRadius,
  smallTeeth,
  sprocketRadius,
} from '../../three/dims';
import { lenM, lenMm, sp, tagged } from '../part-helpers';
import { nEn, nFr } from '../units';

const D = SCREW.outerDiameter;
const chainSmallTeeth = smallTeeth(DESIGN.chainRatio);
const GD = GENERATOR_DESIGN;
/** Outer radius of the rotor, magnets included: the stator's bore less the air gap. derived from dims.ts. */
const rotorRadius = GD.stator.boreRadius - GD.gap;

export const DIM_SPECS: Record<string, Spec[]> = {
  // ---- site
  river: [
    sp(
      'Largeur de la rivière dessinée',
      'Drawn width of the river',
      lenM('estimate', SITE.river.zSouth - SITE.river.zNorth),
    ),
  ],
  weir: [
    sp('Épaisseur de la crête dessinée', 'Drawn thickness of the crest', lenM('estimate', SITE.weir.thickness)),
    sp(
      'Crête sous le niveau de l’eau amont',
      'Crest below the upstream water level',
      lenMm('estimate', -SITE.weir.crestY),
    ),
  ],
  headrace: [
    sp('Largeur du canal dessiné', 'Drawn width of the canal', lenM('estimate', SITE.canal.zSouth - SITE.canal.zNorth)),
    sp('Fond sous le niveau amont', 'Bed below the upstream level', lenM('estimate', -SITE.canal.bedY)),
  ],
  'trash-rack': [
    sp('Écartement libre dessiné', 'Drawn clear spacing', lenMm('estimate', SITE.rack.spacing)),
    sp('Hauteur de la grille dessinée', 'Drawn height of the rack', lenM('estimate', SITE.rack.height)),
  ],
  'intake-gate': [sp('Hauteur de la vanne dessinée', 'Drawn height of the gate', lenM('estimate', SITE.gate.height))],
  'reserved-flow-notch': [
    sp(
      'Échancrure dessinée (largeur × hauteur)',
      'Drawn notch (width × height)',
      lenM('estimate', SITE.notch.width, SITE.notch.depth),
    ),
  ],
  'fish-pass': [
    sp(
      'Passe dessinée',
      'Drawn pass',
      tagged(
        'estimate',
        `${SITE.fishPass.pools} bassins de ${nFr(SITE.fishPass.width, 1)} m de large`,
        `${SITE.fishPass.pools} pools ${nEn(SITE.fishPass.width, 1)} m wide`,
      ),
    ),
  ],
  'water-chamber': [
    sp(
      'Fond sous le niveau amont (dessin)',
      'Floor below the upstream level (drawing)',
      lenM('estimate', -SITE.chamber.floorY),
    ),
    sp('Épaisseur des murs dessinés', 'Drawn wall thickness', lenM('estimate', SITE.chamber.wall)),
  ],
  tailrace: [
    sp('Longueur dessinée (raccourcie)', 'Drawn length (shortened)', lenM('estimate', SITE.tailrace.length)),
    sp('Largeur dessinée', 'Drawn width', lenM('estimate', SITE.tailrace.width)),
  ],
  'mill-building': [
    sp('Bâtiment dessiné (emprise)', 'Drawn building (footprint)', lenM('estimate', SITE.mill.length, SITE.mill.width)),
    sp('Hauteur des murs dessinés', 'Drawn wall height', lenM('estimate', SITE.mill.wallHeight)),
  ],
  powerhouse: [
    sp(
      'Local dessiné (emprise)',
      'Drawn room (footprint)',
      lenM('estimate', SITE.powerhouse.length, SITE.powerhouse.width),
    ),
  ],
  'house-load': [
    sp('Maison dessinée (emprise)', 'Drawn house (footprint)', lenM('estimate', SITE.house.length, SITE.house.width)),
  ],

  // ---- screw
  trough: [
    sp('Paroi dessinée', 'Drawn wall', lenMm('estimate', TROUGH.wall)),
    sp(
      'Auge dessinée',
      'Drawn trough',
      tagged(
        'estimate',
        'demi-gouttière de béton sur piliers (la vidéo : un tube de bois)',
        'concrete half-pipe on piers (the video: a wooden tube)',
      ),
    ),
  ],
  'screw-core': [sp('Paroi du tube', 'Wall of the tube', lenMm('estimate', coreWall(D)))],
  'blade-module': [
    sp('Épaisseur d’une pale', 'Thickness of a blade', lenMm('estimate', bladeThickness(D))),
    sp(
      'Découpage du dessin',
      'Drawn cutting',
      tagged(
        'estimate',
        `${MODULES_PER_TURN} modules par tour de filet`,
        `${MODULES_PER_TURN} modules per turn of a thread`,
      ),
    ),
  ],
  'blade-fastener': [
    sp(
      'Boulons du dessin',
      'Drawn bolts',
      tagged(
        'estimate',
        `${BOLTS_PER_MODULE} boulons de ${nFr(BOLT.shank * 1000)} mm par module`,
        `${BOLTS_PER_MODULE} bolts of ${nEn(BOLT.shank * 1000)} mm per module`,
      ),
    ),
  ],
  'upper-bearing': [
    sp(
      'Position dessinée',
      'Drawn position',
      tagged(
        'estimate',
        `${nFr(BEARING.upperOffset, 2)} m au-delà du haut des pales, sur la plate-forme`,
        `${nEn(BEARING.upperOffset, 2)} m beyond the top of the blades, on the platform`,
      ),
    ),
    sp('Diamètre de l’arbre au palier', 'Shaft diameter at the bearing', lenMm('estimate', 2 * journalRadius(D))),
  ],
  'lower-bearing': [
    sp(
      'Position dessinée',
      'Drawn position',
      tagged(
        'estimate',
        `${nFr(BEARING.lowerOffset, 2)} m au-delà du bas des pales, sur un pilier du bassin de sortie`,
        `${nEn(BEARING.lowerOffset, 2)} m beyond the bottom of the blades, on a pier of the outlet pool`,
      ),
    ),
  ],
  'inlet-sill': [sp('Bassin d’entrée dessiné', 'Drawn inlet basin', lenM('estimate', POOLS.inletLength))],
  'outlet-pool': [
    sp(
      'Bassin dessiné (longueur × largeur)',
      'Drawn pool (length × width)',
      lenM('estimate', POOLS.outletLength, 2 * POOLS.outletHalfWidth),
    ),
  ],
  'drive-sprocket': [
    sp(
      'Dents et diamètre primitif',
      'Teeth and pitch diameter',
      tagged(
        'estimate',
        `${DRIVE.largeTeeth} dents, Ø ${nFr(2 * largeSprocketRadius(), 2)} m`,
        `${DRIVE.largeTeeth} teeth, Ø ${nEn(2 * largeSprocketRadius(), 2)} m`,
      ),
    ),
  ],
  chain: [sp('Pas de la chaîne (type 16B)', 'Chain pitch (type 16B)', lenMm('estimate', DRIVE.chainPitch))],
  'counter-sprocket': [
    sp(
      'Dents et diamètre primitif',
      'Teeth and pitch diameter',
      tagged(
        'estimate',
        `${chainSmallTeeth} dents, Ø ${nFr(2 * sprocketRadius(chainSmallTeeth), 2)} m`,
        `${chainSmallTeeth} teeth, Ø ${nEn(2 * sprocketRadius(chainSmallTeeth), 2)} m`,
      ),
    ),
  ],
  countershaft: [
    sp('Entraxe de l’étage chaîne', 'Centre distance of the chain stage', lenM('estimate', DRIVE.chainCentres)),
    sp('Entraxe de l’étage courroie', 'Centre distance of the belt stage', lenM('estimate', DRIVE.beltCentres)),
  ],
  'pulley-large': [sp('Diamètre dessiné', 'Drawn diameter', lenM('estimate', 2 * DRIVE.largePulleyRadius))],
  belt: [
    sp(
      'Courroie dessinée',
      'Drawn belt',
      tagged(
        'estimate',
        `plate, ${nFr(DRIVE.beltWidth * 1000)} mm de large, ${nFr(DRIVE.beltThickness * 1000)} mm d’épaisseur`,
        `flat, ${nEn(DRIVE.beltWidth * 1000)} mm wide, ${nEn(DRIVE.beltThickness * 1000)} mm thick`,
      ),
    ),
  ],
  'pulley-small': [sp('Diamètre dessiné', 'Drawn diameter', lenM('estimate', 2 * smallPulleyRadius(DESIGN.beltRatio)))],
  generator: [
    sp(
      'Corps dessiné (diamètre × longueur)',
      'Drawn body (diameter × length)',
      lenM('estimate', 2 * GENERATOR.bodyRadius, GENERATOR.bodyLength),
    ),
  ],
  rectifier: [sp('Boîtier dessiné', 'Drawn box', lenMm('estimate', ...ELECTRONICS.rectifier))],
  'charge-controller': [sp('Boîtier dessiné', 'Drawn box', lenMm('estimate', ...ELECTRONICS.controller))],
  battery: [
    sp(
      'Bloc dessiné (longueur × hauteur × profondeur)',
      'Drawn pack (length × height × depth)',
      lenMm('estimate', ...ELECTRONICS.battery),
    ),
    sp(
      'Type dessiné',
      'Drawn type',
      tagged('estimate', `bloc au lithium de ${DESIGN.busVolts} V`, `${DESIGN.busVolts} V lithium pack`),
    ),
  ],

  // ---- generator (the machine opened: the frame, shaft and terminal box are the outside of the blue generator, GENERATOR; GENERATOR_DESIGN adds the inside)
  'gen-frame': [
    sp(
      'Corps dessiné (diamètre × longueur)',
      'Drawn body (diameter × length)',
      lenM('estimate', 2 * GENERATOR.bodyRadius, GENERATOR.bodyLength),
    ),
    sp('Paroi de la virole', 'Wall of the shell', lenMm('estimate', GD.shellWall)),
    sp(
      'Ailettes de refroidissement',
      'Cooling ribs',
      tagged('estimate', `${GD.ribs.count} autour du corps`, `${GD.ribs.count} round the body`),
    ),
  ],
  'gen-stator': [
    sp('Diamètre extérieur des tôles', 'Outer diameter of the plates', lenMm('estimate', 2 * GD.stator.outerRadius)),
    sp('Alésage (pointes des dents)', 'Bore (tooth tips)', lenMm('estimate', 2 * GD.stator.boreRadius)),
    sp('Longueur du paquet de tôles', 'Length of the stack', lenMm('estimate', GD.stator.stack)),
  ],
  'gen-coils': [
    sp('Épaisseur d’une bobine', 'Thickness of a coil', lenMm('estimate', GD.coil.build)),
    sp('Tête de bobine hors du paquet', 'End turn beyond the stack', lenMm('estimate', GD.coil.overhang)),
  ],
  'gen-rotor': [
    sp('Diamètre, aimants compris', 'Diameter, magnets included', lenMm('estimate', 2 * rotorRadius)),
    sp('Longueur du paquet', 'Length of the stack', lenMm('estimate', GD.rotor.stack)),
  ],
  'gen-magnets': [
    sp('Épaisseur radiale', 'Radial thickness', lenMm('estimate', GD.rotor.magnetThickness)),
    sp(
      'Part du pas polaire couverte',
      'Share of the pole pitch covered',
      tagged('estimate', `${nFr(GD.rotor.magnetArc * 100)} %`, `${nEn(GD.rotor.magnetArc * 100)}%`),
    ),
    sp('Entrefer dessiné', 'Drawn air gap', lenMm('estimate', GD.gap)),
  ],
  'gen-shaft': [
    sp('Diamètre', 'Diameter', lenMm('estimate', 2 * GENERATOR.shaftRadius)),
    sp('Bout d’arbre devant le corps', 'Shaft stub in front of the body', lenM('estimate', GENERATOR.stub)),
    sp(
      'Clavette (longueur × largeur)',
      'Key (length × width)',
      lenMm('estimate', GD.shaft.keyLength, GD.shaft.keyWidth),
    ),
  ],
  'gen-bearings': [
    sp(
      'Roulement dessiné (diamètre extérieur × largeur)',
      'Drawn bearing (outer diameter × width)',
      lenMm('estimate', 2 * GD.bearing.outerRadius, GD.bearing.width),
    ),
  ],
  'gen-terminals': [
    sp(
      'Boîte dessinée (largeur × hauteur × profondeur)',
      'Drawn box (width × height × depth)',
      lenMm('estimate', ...GENERATOR.box),
    ),
  ],

  // ---- powerroom (the wall of the powerhouse, in the order the current goes; the three pieces moved from the screw keep their sizes below)
  'dc-breaker': [
    sp(
      'Appareil dessiné (largeur × hauteur × profondeur)',
      'Drawn device (width × height × depth)',
      lenMm('estimate', ...POWERROOM.breaker.size),
    ),
  ],
  'fuse-box': [
    sp(
      'Boîte dessinée (largeur × hauteur × profondeur)',
      'Drawn box (width × height × depth)',
      lenMm('estimate', ...POWERROOM.fuseBox.size),
    ),
  ],
  'dump-load': [
    sp(
      'Appareil dessiné (largeur × hauteur × profondeur)',
      'Drawn device (width × height × depth)',
      lenMm('estimate', ...POWERROOM.dumpLoad.size),
    ),
  ],
  inverter: [
    sp(
      'Appareil dessiné (largeur × hauteur × profondeur)',
      'Drawn device (width × height × depth)',
      lenMm('estimate', ...POWERROOM.inverter.size),
    ),
  ],
  'energy-meter': [
    sp(
      'Appareil dessiné (largeur × hauteur × profondeur)',
      'Drawn device (width × height × depth)',
      lenMm('estimate', ...POWERROOM.meter.size),
    ),
  ],
  switchboard: [
    sp(
      'Plaque de montage dessinée (largeur × hauteur)',
      'Drawn mounting plate (width × height)',
      lenM('estimate', 2 * POWERROOM.board.halfWidth, POWERROOM.board.y1 - POWERROOM.board.y0),
    ),
    sp(
      'Local dessiné (largeur × profondeur)',
      'Drawn room (width × depth)',
      lenM('estimate', POWERROOM.width, POWERROOM.depth),
    ),
  ],
  earthing: [
    sp('Piquet dessiné (longueur)', 'Drawn rod (length)', lenM('estimate', POWERROOM.rod.length)),
    sp('Diamètre du piquet', 'Diameter of the rod', lenMm('estimate', 2 * POWERROOM.rod.radius)),
  ],
};
