import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { millRace } from './pl01-site';
import { screwSection } from './pl02-screw';
import { driveElectricity } from './pl03-drive';

/** Every drawing of the "Plans" mode, in reading order. */
export const SHEETS: DrawingSheet[] = [millRace, screwSection, driveElectricity];
