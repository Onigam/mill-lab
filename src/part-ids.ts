// The frozen part ids of every world, with their category (docs/research.md §4). THE CONTRACT between the roles: the
// catalogue (src/data/parts/*), the 3D registries (src/three/*), the guides, the lessons and the drawings all use these
// ids. Only the lead edits this file; a role that thinks an id is missing or wrong reports it, it never adds one.
import type { PartCategory } from '@onigam/lab-kit/content';

export type WorldId = 'site' | 'screw';

export const PART_CATEGORIES: Record<WorldId, Record<string, PartCategory>> = {
  // the mill race at the scale of the place: the river, the weir, the canal with its coarse rack and its head gate, the notch that
  // leaves the reserved flow in the river, the fish pass, the old water chamber where the screw stands (`water-chamber` opens
  // the `screw` world), the tailrace, the mill, the small powerhouse (cabinet, battery, inverter: ONE part) and the house it feeds
  site: {
    river: 'site',
    weir: 'structure',
    headrace: 'hydraulic',
    'trash-rack': 'hydraulic',
    'intake-gate': 'hydraulic',
    'reserved-flow-notch': 'hydraulic',
    'fish-pass': 'hydraulic',
    'water-chamber': 'structure',
    tailrace: 'hydraulic',
    'mill-building': 'site',
    powerhouse: 'electrical',
    'house-load': 'site',
  },
  // the machine in its chamber, in the order the energy goes: the water (`inlet-sill`, `trapped-water`, `outlet-pool`), the screw
  // (`trough`, `screw-core`, `blade-module` x3 threads, `blade-fastener`, the two bearings), the drive (slow chain stage on the
  // `countershaft`, then the fast belt stage), the generator and its electronics, the battery. `trapped-water` is the pocket of
  // water between two blades: the one part that is not solid (translucent, selectable, the heart of the lesson).
  screw: {
    trough: 'structure',
    'screw-core': 'mechanical',
    'blade-module': 'mechanical',
    'blade-fastener': 'mechanical',
    'upper-bearing': 'mechanical',
    'lower-bearing': 'mechanical',
    'inlet-sill': 'hydraulic',
    'outlet-pool': 'hydraulic',
    'trapped-water': 'hydraulic',
    'drive-sprocket': 'mechanical',
    chain: 'mechanical',
    'counter-sprocket': 'mechanical',
    countershaft: 'mechanical',
    'pulley-large': 'mechanical',
    belt: 'mechanical',
    'pulley-small': 'mechanical',
    generator: 'electrical',
    rectifier: 'electrical',
    'charge-controller': 'electrical',
    battery: 'electrical',
  },
};

export const WORLDS = Object.keys(PART_CATEGORIES) as WorldId[];

/** Ids of one world, in catalogue order. */
export const partIds = (world: WorldId): string[] => Object.keys(PART_CATEGORIES[world]);
