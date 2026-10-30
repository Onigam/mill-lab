import { lazyModule } from '@onigam/lab-kit/three';
import type { SceneModule } from '@onigam/lab-kit/three';
import type { MillState } from '../sim/types';
import { createGeneratorScene as buildGeneratorScene } from './generator/scene';
import { createPowerroomScene as buildPowerroomScene } from './powerroom/scene';
import { createScrewScene as buildScrewScene, type ScrewOptions } from './screw/scene';
import type { SiteOptions } from './site/drive';
import { createSiteScene as buildSiteScene } from './site/scene';

// The two worlds. Both are `lazyModule`s: nothing is built until the visitor goes there (or something reads the module), so the start-up stays light.
// Use the result as the `module` of the `SceneDef` (do not wrap it again). Both worlds draw the drive train (the `screw` world on its platform, the `site` world
// at the top end of the screw, on its own supports) and take the live ratios of the drive if the application can give them:
// `createScrewScene({ ratios: () => ({ chain: sim.params.chainRatio, belt: sim.params.beltRatio }) })`, the same for `createSiteScene`.

export const createSiteScene = (opts: SiteOptions = {}): SceneModule<MillState> =>
  lazyModule<MillState>('site', () => buildSiteScene(opts));
export const createScrewScene = (opts: ScrewOptions = {}): SceneModule<MillState> =>
  lazyModule<MillState>('screw', () => buildScrewScene(opts));
export const createGeneratorScene = (): SceneModule<MillState> =>
  lazyModule<MillState>('generator', () => buildGeneratorScene());
export const createPowerroomScene = (): SceneModule<MillState> =>
  lazyModule<MillState>('powerroom', () => buildPowerroomScene());

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
  generator: {
    /** The section (a quarter taken away: along the axis and across it) is the hero view of this world. */
    cutaway: true,
    partPadding: 2.2,
    stepFrame: { padding: 1.5, minRadius: 0.06 },
    /** Parts made transparent by X-ray while nothing is selected: the frame hides the machine. */
    xrayShell: (id: string): boolean => id === 'gen-frame',
  },
  powerroom: {
    /** No section here: the room is open to the eye (the front wall and the ceiling fade out), the devices come off the wall in the exploded view. */
    cutaway: false,
    partPadding: 1.8,
    stepFrame: { padding: 1.5, minRadius: 0.2 },
  },
} as const;
