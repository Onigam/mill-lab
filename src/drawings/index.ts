import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { millRace } from './pl01-site';
import { screwSection } from './pl02-screw';
import { driveElectricity } from './pl03-drive';
import { generatorSection } from './pl04-generator';
import { powerroomLayout } from './pl05-layout';
import { powerroomWiring } from './pl06-wiring';
import { bladeModule } from './pl07-blade';
import { turbineChart } from './pl08-chart';

/** Every drawing of the "Plans" mode, in reading order (the numbers of the title blocks). */
export const SHEETS: DrawingSheet[] = [
  millRace,
  screwSection,
  driveElectricity,
  generatorSection,
  powerroomLayout,
  powerroomWiring,
  bladeModule,
  turbineChart,
];
