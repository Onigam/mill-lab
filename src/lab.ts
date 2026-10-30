import { configureDrawings } from '@onigam/lab-kit/drawings';
import { l, strL } from '@onigam/lab-kit/i18n';
import { h, icon, ICONS, type AppContext, type LabDefinition } from '@onigam/lab-kit/ui';
import { ASSEMBLY } from './data/assembly';
import { CHAPTERS } from './data/chapters';
import { INSTALL } from './data/install';
import { LESSONS } from './data/lessons';
import { OVERVIEWS } from './data/overviews';
import { PARTS } from './data/parts';
import { SHEETS } from './drawings';
import { t } from './i18n/ui';
import { SimPanel } from './panels/sim';
import { STRIP_SPEEDS, stripAlarms, stripClock, stripValues } from './panels/strip';
import { MillSim } from './sim/engine';
import { createGeneratorScene, createPowerroomScene, createScrewScene, createSiteScene, WORLD } from './three';

// The lab described to the kit. Edit the content here and in src/data, src/three, src/sim, src/drawings;
// the kit supplies the whole application frame (see BRIEF.md: the frame is locked).
// The Lessons and Plans modes are not declared yet: the kit hides a mode that has no content (wave 3).

configureDrawings({ project: { fr: 'MILL LAB — moulin', en: 'MILL LAB — mill' } });

const sim = new MillSim();

/** The "Sources" panel: notice, warnings, credits and links, outline of the main video. */
function about(ctx: AppContext<MillSim>): HTMLElement[] {
  const fr = document.documentElement.lang !== 'en';
  const link = (href: string, label: string) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label);
  const li = (href: string, label: string, note: string) => h('li', {}, link(href, label), ' — ', note);
  return [
    h('div', { class: 'callout callout--tip' }, h('span', {}, t('disclaimer'))),
    h('div', { class: 'callout callout--tip' }, h('span', {}, t('noticeGeneric'))),
    h('div', { class: 'callout callout--tip' }, h('span', {}, t('noticeElectric'))),
    h('div', { class: 'callout callout--warn' }, icon(ICONS.warn, 16), h('span', {}, t('safety'))),
    h('div', { class: 'callout callout--warn' }, icon(ICONS.warn, 16), h('span', {}, t('safetyElectric'))),
    h('div', { class: 'callout callout--warn' }, icon(ICONS.warn, 16), h('span', {}, t('legal'))),
    h(
      'p',
      {},
      fr ? 'Source principale : ' : 'Main source: ',
      link(
        'https://www.youtube.com/watch?v=hM4cDkSSsrQ',
        'Autonomie : l’hydroélectricité du futur se trouve dans les vieux moulins d’hier',
      ),
      fr
        ? ' — L’ArchiPelle, chez l’association Viseta qui construit une vis d’Archimède en bois dans un moulin. Aucune image de la vidéo n’est reprise.'
        : ' — L’ArchiPelle, at the Viseta association that builds a wooden Archimedes screw in a mill. No footage from the video is reused.',
    ),
    h('h3', { class: 'section-title' }, t('chapters')),
    h(
      'ul',
      { class: 'chapters' },
      ...CHAPTERS.map(([ts, f, e]) => h('li', {}, link(ctx.videoUrl(ts), ts), ' ', fr ? f : e)),
    ),
    h(
      'ul',
      { class: 'links' },
      li(
        'https://www.youtube.com/watch?v=YRPMVPFl5z4',
        'L’ArchiPelle',
        fr
          ? 'un moulin transformé en mini-centrale : turbine à flux traversant, courroie vers la génératrice, chiffres de dix ans de service'
          : 'a mill turned into a mini hydro plant: crossflow turbine, belt to the generator, ten years of figures',
      ),
      li(
        'https://www.youtube.com/watch?v=faqLmwqATMc',
        'Paulygones',
        fr
          ? 'une roue à aubes de bricolage, un moteur en génératrice, un redresseur et une batterie'
          : 'a home-made water wheel, a motor used as a generator, a rectifier and a battery',
      ),
      li(
        'https://www.youtube.com/watch?v=vumEzd2KRMA',
        'Révolution Énergétique',
        fr
          ? 'une centrale de montagne à turbine Pelton : l’autre bout du tableau « quelle turbine pour mon site ? »'
          : 'a mountain plant with a Pelton turbine: the other end of the “which turbine for my site?” chart',
      ),
      li(
        'https://www.neozone.org/innovation/viseta-une-pico-centrale-hydroelectrique-low-tech-pour-transformer-les-moulins-en-generateur-denergie-4-a-10-kw/',
        'Neozone',
        fr
          ? 'un article sur le projet de l’association (cible de 4 à 10 kW, prototype à petite échelle)'
          : 'an article on the association’s project (4 to 10 kW target, small-scale prototype)',
      ),
      li(
        'https://math.nyu.edu/Archimedes/Screw/optimal/screw.pdf',
        'Rorres, 2000',
        fr
          ? 'The Turn of the Screw : la géométrie optimale d’une vis d’Archimède (les godets, le pas, le rayon intérieur)'
          : 'The Turn of the Screw: the optimal geometry of an Archimedes screw (the buckets, the pitch, the inner radius)',
      ),
      li(
        'https://doi.org/10.1017/flo.2024.29',
        'Simmons & Lubitz, 2024',
        fr
          ? 'la perte à la sortie de l’eau et les mesures de quatre vis en service'
          : 'the outlet power loss and the measurements of four screws in service',
      ),
      li(
        'https://ualberta.scholaris.ca/bitstreams/83f81fa9-ea34-44ba-b06c-24f28f73859c/download',
        'Simmons & Lubitz, 2022',
        fr ? 'les fuites entre la pale et l’auge' : 'the leakage between the blade and the trough',
      ),
      li(
        'https://publication-theses.unistra.fr/public/theses_doctorat/2015/Dellinger_Guilhem_2015_ED269.pdf',
        'Dellinger, 2015',
        fr
          ? 'thèse sur les vis d’Archimède en micro-centrale : règles de vitesse et de jeu'
          : 'thesis on Archimedes screws in micro hydro: the speed and gap rules',
      ),
      li(
        'https://en.wikipedia.org/wiki/Archimedes%27_screw',
        fr ? 'Encyclopédie, vis d’Archimède' : 'Encyclopaedia, Archimedes’ screw',
        fr ? 'têtes et débits d’emploi des vis génératrices' : 'heads and flows of screw generators',
      ),
      li(
        'https://en.wikipedia.org/wiki/Water_wheel',
        fr ? 'Encyclopédie, roue hydraulique' : 'Encyclopaedia, water wheel',
        fr ? 'les types de roues et leurs rendements' : 'the types of wheels and their efficiencies',
      ),
      li(
        'https://pelton-lab.vercel.app',
        'Pelton Lab',
        fr
          ? 'le laboratoire de la turbine Pelton, pour les très hautes chutes'
          : 'the Pelton turbine lab, for very high heads',
      ),
    ),
    h('p', { class: 'hint' }, t('sourcesNoCopy')),
    h('p', { class: 'hint' }, 'Three.js · TypeScript · Vite — MIT'),
  ];
}

export const lab: LabDefinition<MillSim> = {
  id: 'mill-lab',
  brand: { title: 'MILL LAB', tagline: strL('labTagline'), icon: './favicon.svg' },
  sim,
  defaultScene: 'site',
  video: { id: 'hM4cDkSSsrQ' },
  parts: PARTS,
  scenes: [
    {
      id: 'site',
      label: strL('sceneSite'),
      module: createSiteScene({ ratios: () => ({ chain: sim.params.chainRatio, belt: sim.params.beltRatio }) }),
      ...WORLD.site,
      overview: {
        ...OVERVIEWS.site,
        actions: [
          { label: strL('goChamber'), scene: 'screw', primary: true },
          { label: strL('goPowerroom'), scene: 'powerroom' },
        ],
      },
    },
    {
      id: 'screw',
      label: strL('sceneScrew'),
      module: createScrewScene({ ratios: () => ({ chain: sim.params.chainRatio, belt: sim.params.beltRatio }) }),
      ...WORLD.screw,
      overview: {
        ...OVERVIEWS.screw,
        actions: [
          { label: strL('goSite'), scene: 'site', primary: true },
          { label: strL('goGenerator'), scene: 'generator' },
        ],
      },
    },
    {
      id: 'generator',
      label: strL('sceneGenerator'),
      module: createGeneratorScene(),
      ...WORLD.generator,
      overview: {
        ...OVERVIEWS.generator,
        actions: [{ label: strL('goScrew'), scene: 'screw', primary: true }],
      },
    },
    {
      id: 'powerroom',
      label: strL('scenePowerroom'),
      module: createPowerroomScene(),
      ...WORLD.powerroom,
      overview: {
        ...OVERVIEWS.powerroom,
        actions: [{ label: strL('goSite'), scene: 'site', primary: true }],
      },
    },
  ],
  partLinks: {
    'water-chamber': { scene: 'screw', label: strL('goChamber') },
    generator: { scene: 'generator', label: strL('goGenerator') },
    powerhouse: { scene: 'powerroom', label: strL('goPowerroom') },
  },
  guides: {
    // the assembly starts in the chamber of the site and then plays on the machine; the installation plays on the site
    assembly: { scene: 'screw', steps: ASSEMBLY },
    install: { scene: 'site', steps: INSTALL },
  },
  lessons: { intro: strL('lessonsIntroMill'), items: LESSONS },
  plans: {
    sheets: SHEETS,
    groups: [
      { id: 'site', label: strL('groupSite') },
      { id: 'screw', label: strL('groupScrew') },
      { id: 'generator', label: strL('groupGenerator') },
      { id: 'powerroom', label: strL('groupPowerroom') },
    ],
    intro: l(
      'Huit plans A3 générés à partir des cotes du modèle 3D et de la simulation : le bief du moulin et le choix de la turbine, la vis en coupe et son module de pale, la transmission, la génératrice en coupe, le plan et le câblage du local technique. Reconstitution pédagogique d’une vis et d’une génératrice génériques, pas un plan de construction.',
      'Eight A3 drawings generated from the 3D model’s dimensions and the simulation: the mill race and the choice of turbine, the screw in section and its blade module, the drive, the generator in section, the layout and the wiring of the powerhouse. Educational reconstruction of a generic screw and generator, not a construction plan.',
    ),
  },
  simPanel: (ctx: AppContext<MillSim>) => new SimPanel(ctx),
  strip: { values: stripValues, clock: stripClock, alarms: stripAlarms, speeds: STRIP_SPEEDS },
  about,
};
