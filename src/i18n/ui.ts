import { registerStrings, tx, type CommonKey } from '@onigam/lab-kit/i18n';

// The lab's own interface strings, `key: [fr, en]`. The ones every lab shares (modes, toolbar, panels,
// guides) live in the kit; add here only what is specific to this lab.

const LAB = {
  tagline: ['Explorer · Comprendre · Construire', 'Explore · Understand · Build'],
  sceneDevice: ['Dispositif', 'Device'],
  simTitle: ['Simulation', 'Simulation'],
  targetRpm: ['Vitesse cible', 'Target speed'],
  liveRpm: ['Vitesse', 'Speed'],
  plansIntro: [
    'Planches A3 générées à partir des cotes du modèle 3D.',
    'A3 sheets generated from the 3D model dimensions.',
  ],
  lessonsIntro: ['Leçons courtes liées à la 3D.', 'Short lessons tied to the 3D view.'],
  groupDevice: ['Dispositif', 'Device'],
  disclaimer: [
    'Reconstitution pédagogique indépendante. Ce n’est pas un plan officiel.',
    'Independent educational reconstruction. It is not an official drawing.',
  ],
} as const satisfies Record<string, readonly [string, string]>;

registerStrings(LAB);

export type UiKey = keyof typeof LAB | CommonKey;

export { colon } from '@onigam/lab-kit/i18n';

export function t(key: UiKey): string {
  return tx(key);
}
