import type { GuideStep } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';

// Assembly guide: parts fly into place one step at a time. `text` may use **bold** around part names.

export const ASSEMBLY: GuideStep[] = [
  {
    id: 'base',
    title: l('Poser le socle', 'Fit the base'),
    text: l(
      'Posez le **socle** sur un plan de travail et mettez-le de niveau dans les deux sens.',
      'Set the **base** on a bench and level it in both directions.',
    ),
    parts: ['base'],
    tools: [l('Niveau', 'Level')],
    duration: '5 min',
  },
  {
    id: 'axle',
    title: l('Monter l’axe', 'Mount the axle'),
    text: l(
      'Engagez l’**axe** dans les deux montants, sans forcer.',
      'Slide the **axle** through both posts, without force.',
    ),
    parts: ['axle'],
    torque: '2 N·m',
    duration: '10 min',
  },
  {
    id: 'wheel',
    title: l('Monter le volant', 'Mount the wheel'),
    text: l('Enfilez le **volant** sur l’axe puis bloquez-le.', 'Slide the **wheel** onto the axle, then lock it.'),
    parts: ['wheel'],
    warning: l('Équilibrez le volant avant de le faire tourner.', 'Balance the wheel before spinning it.'),
    duration: '10 min',
  },
];
