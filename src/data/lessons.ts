import type { Lesson } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';

// Short lessons tied to the 3D view (and to a simulation scenario when the lab has some), with a quiz.

export const LESSONS: Lesson[] = [
  {
    id: 'flywheel',
    title: l('Pourquoi un volant ?', 'Why a flywheel?'),
    summary: l('Stocker de l’énergie pour lisser la vitesse.', 'Store energy to smooth the speed.'),
    body: [
      l(
        'Un volant stocke de l’énergie cinétique, **E = ½ · J · ω²** : elle croît avec le carré de la vitesse.',
        'A flywheel stores kinetic energy, **E = ½ · J · ω²**: it grows with the square of the speed.',
      ),
    ],
    formula: 'E = ½ · J · ω²',
    focus: { scene: 'device', part: 'wheel' },
    quiz: [
      {
        q: l('Si la vitesse double, l’énergie stockée…', 'If the speed doubles, the stored energy…'),
        choices: [l('double', 'doubles'), l('quadruple', 'quadruples'), l('ne change pas', 'is unchanged')],
        answer: 1,
        explain: l('L’énergie varie comme ω².', 'The energy varies as ω².'),
      },
    ],
  },
];
