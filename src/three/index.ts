import { lazyModule } from '@onigam/lab-kit/three';
import type { SceneModule } from '@onigam/lab-kit/three';
import type { MillState } from '../sim/types';
import { createScrewScene as buildScrewScene, type ScrewOptions } from './screw/scene';
import { createSiteScene as buildSiteScene } from './site/scene';

// The two worlds. Both are `lazyModule`s: nothing is built until the visitor goes there (or something reads the module), so the start-up stays light.
// Use the result as the `module` of the `SceneDef` (do not wrap it again). The `screw` world takes the live ratios of the drive if the application can
// give them: `createScrewScene({ ratios: () => ({ chain: sim.params.chainRatio, belt: sim.params.beltRatio }) })`.

export const createSiteScene = (): SceneModule<MillState> => lazyModule<MillState>('site', () => buildSiteScene());
export const createScrewScene = (opts: ScrewOptions = {}): SceneModule<MillState> =>
  lazyModule<MillState>('screw', () => buildScrewScene(opts));

/**
 * What `src/lab.ts` needs to know about each world, as `SceneDef` fields (docs/3d.md, "For the lead"): spread it into the definition, e.g.
 * `{ id: 'screw', label: …, module: createScrewScene(…), ...WORLD.screw }`.
 */
export const WORLD = {
  site: {
    /** The kit treats this id as a landscape: authored home pose, far plane 4000 m. No section tool here. */
    cutaway: false,
    /** X-ray only makes sense around a selected part in a landscape. */
    xrayNeedsSelection: true,
    /** Camera padding when a part is framed: the long parts (the canal, the tailrace) need room. */
    partPadding: 3,
    /** Framing of a guide step: padding and smallest radius, metres. */
    stepFrame: { padding: 1.6, minRadius: 1.5 },
    /** Parts made transparent by X-ray while nothing is selected: the buildings hide the yard from above. */
    xrayShell: (id: string): boolean => id === 'mill-building' || id === 'house-load',
  },
  screw: {
    /** The section along the axis is the hero view of this world. */
    cutaway: true,
    partPadding: 2.4,
    stepFrame: { padding: 1.6, minRadius: 0.3 },
  },
} as const;
