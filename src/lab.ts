import { configureDrawings } from '@onigam/lab-kit/drawings';
import { strL } from '@onigam/lab-kit/i18n';
import { h, type AppContext, type LabDefinition } from '@onigam/lab-kit/ui';
import { ASSEMBLY } from './data/guide';
import { LESSONS } from './data/lessons';
import { PARTS } from './data/parts';
import { SHEETS } from './drawings';
import { t } from './i18n/ui';
import { SimPanel } from './panels/sim';
import { DemoSim } from './sim/engine';
import { createDeviceScene } from './three/device';

// The lab described to the kit. Edit the content here and in src/data, src/three, src/sim, src/drawings;
// the kit supplies the whole application frame (see BRIEF.md: the frame is locked).

configureDrawings({ project: { fr: 'LAB TEMPLATE — dispositif', en: 'LAB TEMPLATE — device' } });

export const lab: LabDefinition<DemoSim> = {
  id: 'lab-template',
  brand: { title: 'LAB TEMPLATE', tagline: strL('tagline'), icon: './favicon.svg' },
  sim: new DemoSim(),
  defaultScene: 'device',
  parts: PARTS,
  scenes: [
    {
      id: 'device',
      label: strL('sceneDevice'),
      module: createDeviceScene(),
      // text shown in the side panel while nothing is selected in this world
      overview: {
        title: { fr: 'Le dispositif', en: 'The device' },
        text: {
          fr: 'Un **volant** monté sur un **axe**, porté par un **socle** : cliquez une pièce pour l’étudier.',
          en: 'A **wheel** on an **axle**, carried by a **base**: click a part to study it.',
        },
      },
    },
  ],
  guides: { assembly: { scene: 'device', steps: ASSEMBLY } },
  lessons: { items: LESSONS, intro: strL('lessonsIntro') },
  plans: {
    sheets: SHEETS,
    groups: [{ id: 'device', label: strL('groupDevice') }],
    intro: strL('plansIntro'),
  },
  simPanel: (ctx: AppContext<DemoSim>) => new SimPanel(ctx),
  strip: {
    values: (sim) => [{ label: t('liveRpm'), value: String(Math.round(sim.state.rpm)), unit: 'rpm' }],
    clock: (sim) => {
      const s = Math.floor(sim.state.simTime);
      return { time: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, sub: '' };
    },
    alarms: () => [],
  },
  about: () => [h('div', { class: 'callout callout--tip' }, h('span', {}, t('disclaimer')))],
};
