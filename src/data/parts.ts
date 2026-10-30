import type { PartInfo } from '@onigam/lab-kit/content';
import { DIM_SPECS } from './parts/dim-specs';
import { DRIVE_PARTS } from './parts/drive';
import { ELECTRIC_PARTS } from './parts/electric';
import { GENERATOR_PARTS } from './parts/generator';
import { MACHINE_PARTS } from './parts/machine';
import { POWERROOM_PARTS } from './parts/powerroom';
import { SITE_PARTS } from './parts/site';

// The parts catalogue: one entry per selectable 3D part, one file per group in ./parts, in the catalogue order of src/part-ids.ts
// (the ids are frozen there; data.test.ts checks that ids, scenes and categories agree with it). `site` has 12 parts, `screw` 17 (the water and
// the turning machine in ./parts/machine.ts, the speed multiplier in ./parts/drive.ts, the generator at the end of the belt in
// ./parts/electric.ts), `generator` 8 (the generator opened, ./parts/generator.ts) and `powerroom` 10 (the powerhouse's wall, ./parts/powerroom.ts).
// The dimension rows of every sheet are read from src/three/dims.ts in ./parts/dim-specs.ts and appended here, so that no length is typed twice.
export const PARTS: PartInfo[] = [
  ...SITE_PARTS,
  ...MACHINE_PARTS,
  ...DRIVE_PARTS,
  ...ELECTRIC_PARTS,
  ...GENERATOR_PARTS,
  ...POWERROOM_PARTS,
].map((p) => ({
  ...p,
  specs: [...p.specs, ...(DIM_SPECS[p.id] ?? [])],
}));
