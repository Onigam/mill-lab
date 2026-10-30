import { describe, expect, it } from 'vitest';
import type { GuideStep, PartCategory, PartInfo } from '@onigam/lab-kit/content';
import type { L } from '@onigam/lab-kit/i18n';
import { LAB_STRINGS } from '../i18n/ui';
import { PART_CATEGORIES, WORLDS, partIds, type WorldId } from '../part-ids';
import {
  BEARING_RADIUS_FRAC,
  BLADES,
  CANAL_SPEED,
  CHAIN_EFFICIENCY,
  BELT_EFFICIENCY,
  BUS_VOLTS,
  DIODE_DROP,
  FLOOD_GATE_FACTOR,
  FLOW_MIN_FRAC,
  GEN_HEADROOM,
  GEN_RATED_RPM,
  RESERVED_FRACTION,
  STAGE_RATIO_MAX,
  BRIDGE_FACTOR,
} from '../sim/machine';
import { cutInOmega, radToRpm } from '../sim/mech';
import { presetParams } from '../sim/presets';
import { runnerDiameter } from '../sim/chooser';
import { screwPoint } from '../sim/screw';
import { SITES, floodFlow, medianFlow, reservedFlow, tailRise } from '../sim/site';
import { plantFor, rackHeadLoss, solvePlant } from '../sim/system';
import { simulateYear } from '../sim/year';
import {
  BEARING,
  BOLT,
  BOLTS_PER_MODULE,
  DESIGN,
  DRIVE,
  ELECTRONICS,
  GENERATOR,
  GENERATOR_DESIGN,
  MODULES_PER_TURN,
  POOLS,
  POWERROOM,
  SCREW,
  SITE,
  TROUGH,
  electricalFrequency,
  largeSprocketRadius,
  smallPulleyRadius,
  smallTeeth,
  sprocketRadius,
} from '../three/dims';
import { ASSEMBLY } from './assembly';
import { CHAPTERS } from './chapters';
import { FIG, MODEL } from './figures';
import { INSTALL } from './install';
import { OVERVIEWS } from './overviews';
import { PARTS } from './parts';
import { DIM_SPECS } from './parts/dim-specs';
import { nEn } from './units';

// Content checks of the data role (four worlds since completion wave A: site, screw, generator, powerroom): the catalogue and the two guides
// against the frozen ids of src/part-ids.ts, FR/EN parity, the rules of the visitor texts (no research code, no internal word, no name, British English, French apostrophes), the timestamps of the main video, the
// numbers that the prose repeats against their sources, every model result quoted in a text against the simulation (a change of src/sim cannot
// go unnoticed), and the sheets against src/three/dims.ts, the single source of lengths.

const FROZEN: Record<string, { scene: WorldId; category: PartCategory }> = Object.fromEntries(
  WORLDS.flatMap((world) =>
    Object.entries(PART_CATEGORIES[world]).map(([id, category]) => [id, { scene: world, category }]),
  ),
);
const CATEGORIES: PartCategory[] = ['hydraulic', 'mechanical', 'electrical', 'structure', 'site'];
const VIDEO_SECONDS = 57 * 60 + 20; // the main video lasts 57 min 16 s

const isL = (v: unknown): v is L => typeof v === 'object' && v !== null && 'fr' in v && 'en' in v;
const seconds = (ts: string): number => {
  const [m, s] = ts.split(':').map(Number);
  return (m ?? 0) * 60 + (s ?? 0);
};
const words = (t: string): number => t.trim().split(/\s+/).length;
const sentences = (t: string): number => t.split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ0-9«“"(*])/).length;

/** Every bilingual text of a part, with a label for the failure message. */
function partTexts(p: PartInfo): [string, L][] {
  const out: [string, L][] = [
    ['name', p.name],
    ['short', p.short],
    ['description', p.description],
    ['material', p.material],
  ];
  if (p.maintenance) out.push(['maintenance', p.maintenance]);
  if (p.tip) out.push(['tip', p.tip]);
  if (p.design) out.push(['design', p.design]);
  p.specs.forEach((s, i) => {
    out.push([`specs[${i}].label`, s.label]);
    if (isL(s.value)) out.push([`specs[${i}].value`, s.value]);
    else out.push([`specs[${i}].value`, { fr: s.value, en: s.value }]);
  });
  return out;
}

function stepTexts(s: GuideStep): [string, L][] {
  const out: [string, L][] = [
    ['title', s.title],
    ['text', s.text],
  ];
  if (s.tip) out.push(['tip', s.tip]);
  if (s.warning) out.push(['warning', s.warning]);
  s.tools?.forEach((t, i) => out.push([`tools[${i}]`, t]));
  return out;
}

/** The interface strings added by the data role (src/i18n/ui.ts), visitor texts like the others. */
const UI_KEYS = [
  'labTagline',
  'sceneSite',
  'sceneScrew',
  'goSite',
  'goScrew',
  'goChamber',
  'groupSite',
  'groupScrew',
  'noticeGeneric',
  'safety',
  'legal',
  'chapters',
  'sourcesNoCopy',
  'sceneGenerator',
  'scenePowerroom',
  'goGenerator',
  'goPowerroom',
  'groupGenerator',
  'groupPowerroom',
  'noticeElectric',
  'safetyElectric',
] as const;

/** Every bilingual text of the data role, labelled. */
function allTexts(): [string, L][] {
  const out: [string, L][] = [];
  for (const p of PARTS) for (const [k, v] of partTexts(p)) out.push([`part ${p.id}.${k}`, v]);
  for (const [guide, steps] of [
    ['assembly', ASSEMBLY],
    ['install', INSTALL],
  ] as const)
    for (const s of steps) for (const [k, v] of stepTexts(s)) out.push([`${guide} ${s.id}.${k}`, v]);
  for (const [world, o] of Object.entries(OVERVIEWS)) {
    out.push([`overview ${world}.title`, o.title]);
    out.push([`overview ${world}.text`, o.text]);
  }
  for (const [ts, fr, en] of CHAPTERS) out.push([`chapter ${ts}`, { fr, en }]);
  for (const key of UI_KEYS) {
    const entry = LAB_STRINGS[key];
    if (entry) out.push([`ui ${key}`, { fr: entry[0], en: entry[1] }]);
  }
  return out;
}

/** Numbers of a text, normalised so that the French and English spellings compare equal (7,5 / 7.5, 5 700 / 5,700). */
function figures(text: string, lang: 'fr' | 'en'): string[] {
  let t = text.replace(/[−–]/g, '-');
  if (lang === 'fr') t = t.replace(/(\d) (\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
  else t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  return (t.match(/\d+(?:\.\d+)?/g) ?? []).sort();
}

// ------------------------------------------------------------------------------------------------ the catalogue

describe('parts catalogue', () => {
  it('has exactly the frozen ids of src/part-ids.ts, each once, in the catalogue order of that file', () => {
    const ids = PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(WORLDS.flatMap((w) => partIds(w)));
    expect(ids.length).toBe(47);
  });

  it('gives every part the frozen scene and category', () => {
    for (const world of WORLDS) {
      expect(PARTS.filter((p) => p.scene === world).length, world).toBe(partIds(world).length);
    }
    expect(WORLDS).toEqual(['site', 'screw', 'generator', 'powerroom']);
    expect(partIds('site').length).toBe(12);
    expect(partIds('screw').length).toBe(17);
    expect(partIds('generator').length).toBe(8);
    expect(partIds('powerroom').length).toBe(10);
    for (const p of PARTS) {
      expect(CATEGORIES, p.id).toContain(p.category);
      expect(p.scene, p.id).toBe(FROZEN[p.id]?.scene);
      expect(p.category, p.id).toBe(FROZEN[p.id]?.category);
    }
  });

  it('has at least three specs per part, short one-line summaries, and descriptions of two to six sentences', () => {
    for (const p of PARTS) {
      expect(p.specs.length, p.id).toBeGreaterThanOrEqual(3);
      for (const lang of ['fr', 'en'] as const) {
        expect(p.short[lang].length, `${p.id} short ${lang}`).toBeLessThanOrEqual(170);
        expect(p.short[lang], `${p.id} short`).not.toMatch(/\n/);
        const n = sentences(p.description[lang]);
        expect(n, `${p.id}.description ${lang}: ${n} sentences`).toBeGreaterThanOrEqual(2);
        expect(n, `${p.id}.description ${lang}: ${n} sentences`).toBeLessThanOrEqual(7);
      }
    }
  });

  it('writes the maintenance in three labelled paragraphs, in the order failure, check, care; and gives every part a tip and a design note', () => {
    for (const p of PARTS) {
      expect(p.maintenance, p.id).toBeDefined();
      expect(p.tip, `${p.id} tip`).toBeDefined();
      expect(p.design, `${p.id} design`).toBeDefined();
      for (const [lang, labels] of [
        ['fr', ['**Panne à prévoir.**', '**À vérifier.**', '**Entretien.**']],
        ['en', ['**Typical failure.**', '**How to check.**', '**Maintenance.**']],
      ] as const) {
        const paragraphs = p.maintenance![lang].split('\n\n');
        expect(paragraphs.length, `${p.id} ${lang}`).toBe(3);
        labels.forEach((label, i) =>
          expect(paragraphs[i], `${p.id} ${lang}`).toMatch(new RegExp(`^${label.replace(/[*.]/g, '\\$&')}`)),
        );
      }
    }
  });

  it('gives video timestamps as mm:ss within the main video, in increasing order', () => {
    for (const p of PARTS) {
      let last = -1;
      for (const ts of p.video ?? []) {
        expect(ts, p.id).toMatch(/^\d{2}:[0-5]\d$/);
        expect(seconds(ts), `${p.id} ${ts}`).toBeLessThanOrEqual(VIDEO_SECONDS);
        expect(seconds(ts), `${p.id} ${ts}`).toBeGreaterThan(last);
        last = seconds(ts);
      }
    }
    // the parts the video neither shows nor discusses have no link: it is no source for them (it never opens the generator, and it shows no cabinet)
    expect(PARTS.filter((p) => !p.video).map((p) => p.id)).toEqual([
      'gen-stator',
      'gen-coils',
      'gen-rotor',
      'gen-magnets',
      'gen-bearings',
      'rectifier',
      'inverter',
      'energy-meter',
      'switchboard',
      'earthing',
    ]);
    // …and the new links are where the video speaks of the thing
    const at = (id: string) => PARTS.find((p) => p.id === id)!.video;
    expect(at('gen-frame')).toEqual(['35:43']); // the generator installed behind the turbine
    expect(at('gen-shaft')).toEqual(['36:15']); // the belt-and-pulley system
    expect(at('gen-terminals')).toEqual(['14:31']); // the generator connected, no load yet
    expect(at('dc-breaker')).toEqual(['28:22']); // "electrical protections, of course"
    expect(at('fuse-box')).toEqual(['28:22']);
    expect(at('dump-load')).toEqual(['14:35']); // an electrical load lets the turbine be braked
    expect(at('charge-controller')).toEqual(['14:29', '14:41']);
    expect(at('battery')).toEqual(['22:21']);
  });

  it('puts a timestamp on the parts that deserve one: the heart of the lesson and the whole drive', () => {
    for (const id of [
      'trapped-water',
      'blade-module',
      'drive-sprocket',
      'chain',
      'counter-sprocket',
      'pulley-large',
      'belt',
      'generator',
      'trash-rack',
      'fish-pass',
      'reserved-flow-notch',
      'intake-gate',
      'water-chamber',
      'powerhouse',
      'gen-frame',
      'gen-terminals',
      'dc-breaker',
      'charge-controller',
      'battery',
      'dump-load',
    ])
      expect(PARTS.find((p) => p.id === id)?.video?.length, id).toBeGreaterThan(0);
  });
});

describe('the sheets of the heart of the lesson say what they must', () => {
  const en = (id: string): string =>
    partTexts(PARTS.find((p) => p.id === id)!)
      .map(([, v]) => v.en)
      .join(' ');
  const fr = (id: string): string =>
    partTexts(PARTS.find((p) => p.id === id)!)
      .map(([, v]) => v.fr)
      .join(' ');

  it('trapped-water: the pocket between two blades, the staircase of water, the slide that turns, the fish in its pocket', () => {
    expect(en('trapped-water')).toMatch(/caught between two threads/);
    expect(en('trapped-water')).toMatch(/staircase/);
    expect(en('trapped-water')).toMatch(/fish/);
    expect(en('trapped-water')).toMatch(/slide/);
    expect(fr('trapped-water')).toMatch(/escalier d’eau/);
    expect(PARTS.find((p) => p.id === 'trapped-water')!.material.en).toMatch(/only part that is not solid/);
  });

  it('the drive says why a speed multiplier: 30 to 60 rpm against several hundred, torque against speed', () => {
    for (const id of ['countershaft', 'pulley-small']) {
      expect(en(id), id).toMatch(/30 to 60 rpm/);
      expect(en(id), id).toMatch(/several hundred/);
      expect(fr(id), id).toMatch(/30 à 60 tr\/min/);
      expect(fr(id), id).toMatch(/plusieurs centaines/);
    }
    expect(en('pulley-small')).toMatch(/more than ten times/);
    expect(en('drive-sprocket')).toMatch(/torque is greatest/);
    expect(en('counter-sprocket')).toMatch(/trade torque for speed/);
    expect(en('chain')).toMatch(/does not slip/i);
    expect(en('belt')).toMatch(/slips/);
  });

  it('trash-rack: why a screw needs no fine rack, and the honest caveat', () => {
    expect(en('trash-rack')).toMatch(/needs no fine rack/);
    expect(en('trash-rack')).toMatch(/thick/);
    expect(en('trash-rack')).toMatch(/Honestly, this does not mean “no protection at all”/);
    expect(en('trash-rack')).toMatch(/engineer’s judgement/);
    expect(en('trash-rack')).toMatch(/guard rail/);
    expect(en('trash-rack')).toMatch(/blocked at 80%/);
    expect(en('trash-rack')).toMatch(/more than the whole head/);
  });

  it('fish-pass: the screw helps the way down, the pass the way up, the lab does not simulate fish', () => {
    expect(en('fish-pass')).toMatch(/way down/);
    expect(en('fish-pass')).toMatch(/way up|swim up/);
    expect(en('fish-pass')).toMatch(/does not simulate fish/);
  });

  it('reserved-flow-notch, intake-gate, water-chamber, powerhouse: what each is for, and the hazard of each', () => {
    expect(en('reserved-flow-notch')).toMatch(/set by the authority/);
    expect(en('reserved-flow-notch')).toMatch(/assum/);
    expect(en('intake-gate')).toMatch(/lock it with a padlock/);
    expect(en('intake-gate')).toMatch(/race/);
    expect(en('water-chamber')).toMatch(/Confined space/);
    expect(en('water-chamber')).toMatch(/ladder/);
    expect(en('water-chamber')).toMatch(/kit/);
    expect(en('powerhouse')).toMatch(/single part/);
    expect(en('powerhouse')).toMatch(/rectifier/);
    expect(en('powerhouse')).toMatch(/inverter/);
    expect(en('powerhouse')).toMatch(/lethal voltage/);
  });

  it('generator, battery: the hazards that deserve the callout', () => {
    expect(en('generator')).toMatch(/Never disconnect the battery/);
    expect(en('battery')).toMatch(/short circuit/);
    expect(en('battery')).toMatch(/hydrogen/);
  });

  // ---- completion wave A: the generator opened
  const spec = (id: string, label: RegExp): L => {
    const row = PARTS.find((p) => p.id === id)!.specs.find((x) => label.test(x.label.en));
    expect(row, `${id}: a spec like ${label}`).toBeDefined();
    return isL(row!.value) ? row!.value : { fr: row!.value, en: row!.value };
  };

  it('the generator opened is generic, and says that the video shows a bought generator without opening it', () => {
    expect(en('gen-frame')).toMatch(/generic/);
    expect(fr('gen-frame')).toMatch(/générique/);
    expect(en('gen-frame')).toMatch(/The video shows the whole generator/);
    expect(en('gen-terminals')).toMatch(/The video says only that the generator was connected before the load was/);
    expect(en('gen-rotor')).toMatch(/slow machine was chosen to keep the transmission simple/);
    expect(LAB_STRINGS.noticeElectric![1]).toMatch(/generic/);
    expect(LAB_STRINGS.noticeElectric![1]).toMatch(/estimates/);
    expect(LAB_STRINGS.noticeElectric![1]).toMatch(/says nothing of its inside/);
    expect(LAB_STRINGS.noticeElectric![0]).toMatch(/génériques/);
    expect(LAB_STRINGS.noticeElectric![0]).toMatch(/estimations/);
  });

  it('the pole count, the slots and the electrical frequency are estimates, said in both languages on the sheets that give them', () => {
    for (const [id, label] of [
      ['gen-rotor', /^Poles$/],
      ['gen-rotor', /^Electrical frequency$/],
      ['gen-magnets', /^Number$/],
      ['gen-stator', /^Slots and teeth$/],
      ['gen-coils', /^Coils$/],
    ] as const) {
      const v = spec(id, label);
      expect(v.en, `${id}: ${label}`).toMatch(/\(estimate\)$/);
      expect(v.fr, `${id}: ${label}`).toMatch(/\(estimation\)$/);
    }
    expect(en('gen-rotor')).toMatch(/poles \(estimate\)/);
    expect(en('gen-rotor')).toMatch(/times a second \(estimate\)/);
    expect(en('gen-rotor')).toMatch(/the number of poles times the speed in rpm, divided by 120/);
    expect(fr('gen-rotor')).toMatch(/pôles \(estimation\)/);
    expect(en('gen-stator')).toMatch(/slots \(estimate\)/);
    expect(en('gen-magnets')).toMatch(/no source gives it/);
    expect(en('gen-magnets')).toMatch(/the sizes drawn are estimates/);
    expect(spec('gen-rotor', /^Rated speed$/).en).toMatch(/\(model assumption\)$/);
  });

  it('the model results of the generator are said to be the model’s: 39 N·m, 46 A, 53.7 V, a resistance of 0.09 ohm, 0.86 N·m per ampere', () => {
    expect(spec('gen-shaft', /^Torque transmitted$/).en).toMatch(/\(model result\)$/);
    expect(spec('gen-coils', /^Circuit resistance$/).en).toMatch(/\(model result\)$/);
    expect(spec('gen-magnets', /^Machine constant$/).en).toMatch(/\(model result\)$/);
    expect(en('gen-coils')).toMatch(/resistance of 0\.09 Ω/);
    expect(en('gen-coils')).toMatch(/\(model result\)/);
    expect(en('gen-magnets')).toMatch(/N·m per ampere, which is also 0\.86 V per rad\/s \(model result\)/);
    expect(en('gen-stator')).toMatch(/iron are not calculated/);
    expect(en('gen-bearings')).toMatch(/does not calculate their friction/);
  });

  it('a permanent-magnet generator cannot be switched off, and strong magnets are dangerous: both said where they matter', () => {
    expect(en('gen-terminals')).toMatch(/magnets cannot be switched off/);
    expect(en('gen-terminals')).toMatch(/live as soon as the shaft turns, even by hand/);
    expect(fr('gen-terminals')).toMatch(/sous tension dès que l’arbre tourne, même à la main/);
    expect(en('gen-magnets')).toMatch(/they cannot be switched off|cannot be switched off/);
    expect(en('gen-magnets')).toMatch(/pinches skin and can shatter/);
    expect(en('gen-magnets')).toMatch(/pacemakers/);
    expect(en('gen-rotor')).toMatch(/never to leave the generator without a load/);
    expect(en('gen-frame')).toMatch(/reaction torque/);
    expect(en('gen-shaft')).toMatch(/belt’s pull/);
    expect(en('gen-bearings')).toMatch(/sealed and greased for life \(estimate\)/);
  });

  // ---- completion wave A: the powerhouse
  it('the three pieces moved from the screw stand in the powerhouse now, and say so', () => {
    for (const id of ['rectifier', 'charge-controller', 'battery']) {
      expect(PARTS.find((p) => p.id === id)!.scene, id).toBe('powerroom');
      expect(en(id), id).not.toMatch(/by the generator|beside the generator|near the generator/);
      expect(fr(id), id).not.toMatch(/près de la génératrice|à côté de la génératrice/);
    }
    expect(en('rectifier')).toMatch(/into the powerhouse/);
    expect(en('rectifier')).toMatch(/cable leaving its terminal box/);
    expect(en('charge-controller')).toMatch(/between the rectifier and the battery/);
    expect(en('charge-controller')).toMatch(/dump load/);
    expect(en('battery')).toMatch(/In the room it rests on a solid, ventilated shelf/);
    expect(en('powerhouse')).toMatch(/go in to see each device/);
    expect(en('powerhouse')).toMatch(/dump load/);
  });

  it('the dump load is not simulated, and the sheet says so; real plants have one', () => {
    expect(spec('dump-load', /^In the model$/).en).toMatch(/^not simulated: the model has no dump load$/);
    expect(spec('dump-load', /^In the model$/).fr).toMatch(/^non simulée/);
    expect(en('dump-load')).toMatch(/The lab does not simulate it/);
    expect(en('dump-load')).toMatch(/its battery is ideal and takes everything; real plants have one/);
    expect(PARTS.find((p) => p.id === 'dump-load')!.short.en).toMatch(/Not simulated\.$/);
    expect(PARTS.find((p) => p.id === 'dump-load')!.short.fr).toMatch(/Non simulée\.$/);
    expect(en('dump-load')).toMatch(/keeps a brake|keep a brake|always keeps a brake/);
    expect(en('dump-load')).toMatch(/the screw does not race/);
    expect(en('dump-load')).toMatch(/a dump load that does not heat up|A dump load that does not heat up/);
    expect(spec('dump-load', /^To absorb/).en).toMatch(/\(model result\)$/);
    expect(spec('dump-load', /^Resistance$/).en).toMatch(/\(derived\).*\(assumption\)$/);
    // the other devices that the model does not have
    expect(spec('charge-controller', /^In the model$/).en).toMatch(/^not simulated/);
    expect(spec('inverter', /^In the model$/).en).toMatch(/^not modelled/);
    expect(en('energy-meter')).toMatch(/the lab’s meter follows the simulation/);
    expect(spec('battery', /^Capacity$/).en).toMatch(/not modelled/);
  });

  it('the powerhouse’s ratings and cable sections are estimates, in both languages; the protections say why they are made for direct current', () => {
    for (const [id, label] of [
      ['fuse-box', /^Section of the battery cable$/],
      ['earthing', /^Section of the conductor$/],
      ['inverter', /^Drawn power$/],
    ] as const) {
      expect(spec(id, label).en, id).toMatch(/\(estimate\)$/);
      expect(spec(id, label).fr, id).toMatch(/\(estimation\)$/);
    }
    expect(spec('dc-breaker', /^Rating$/).en).toMatch(/\(estimate\).*\(model result\)$/);
    expect(spec('fuse-box', /^Rating of the battery fuse$/).en).toMatch(/\(estimate\).*\(model result\)$/);
    expect(spec('inverter', /drawn from the battery/).en).toMatch(/\(derived\)$/);
    expect(en('dc-breaker')).toMatch(/arc does not go out/);
    expect(en('dc-breaker')).toMatch(/not only the battery’s/);
    expect(en('dc-breaker')).toMatch(/the place of each protection is an electrician’s choice/);
    expect(en('dc-breaker')).toMatch(
      /draws it at the head of the wall, before the rectifier, so that it is found first/,
    );
    expect(en('fuse-box')).toMatch(/in reality the battery’s sits right against it/);
    expect(fr('dc-breaker')).toMatch(/choix d’un électricien/);
    expect(en('dc-breaker')).toMatch(/not a restart button/);
    expect(en('fuse-box')).toMatch(/Never replace a blown fuse with a bigger one/);
    expect(en('fuse-box')).toMatch(/protects the cable, not the device/);
    expect(en('fuse-box')).toMatch(/hundreds of amps/);
    expect(en('fuse-box')).toMatch(/short as possible/);
    expect(en('inverter')).toMatch(/lethal/);
    expect(en('inverter')).toMatch(/qualified electrician/);
    expect(en('earthing')).toMatch(/qualified electrician/);
    expect(en('earthing')).toMatch(/depends on the installation and the country’s rules/);
    expect(en('earthing')).toMatch(/surge/);
    expect(en('earthing')).toMatch(/only a measurement says it exists/);
    expect(en('switchboard')).toMatch(/residual-current device/);
    expect(en('energy-meter')).toMatch(/kilowatt-hour is one kilowatt for one hour/);
    expect(en('battery')).toMatch(/hydrogen/);
  });

  it('no brand, product or company is named in the new sheets, guides and overviews', () => {
    const brands =
      /\b(Tesla|Victron|Schneider|Siemens|ABB|Enphase|Fronius|Morningstar|Outback|Xantrex|Renogy|EPEver|Bosch|Legrand|Hager|Eaton|Mersen|Anderson|Powerwall|Pylontech|Growatt|Huawei|Sungrow|Midnite|Studer|SMA|Mean Well|Arduino|Raspberry)\b/i;
    for (const [label, v] of allTexts()) expect(v.fr + ' ' + v.en, label).not.toMatch(brands);
  });
});

// ------------------------------------------------------------------------------------------------ the rules of the visitor texts

describe('the visitor texts', () => {
  it('have a non-empty French and English text everywhere, no placeholder, no straight apostrophe, balanced bold', () => {
    const bad = /todo|tbd|lorem|xxx|placeholder|\{\w+\}/i;
    for (const [label, v] of allTexts()) {
      expect(v.fr.trim().length, `${label} fr`).toBeGreaterThan(0);
      expect(v.en.trim().length, `${label} en`).toBeGreaterThan(0);
      expect(v.fr + v.en, label).not.toMatch(bad);
      expect(v.fr + v.en, label).not.toMatch(/\p{L}'\p{L}/u);
      expect(v.fr.split('**').length % 2, `${label}: unbalanced ** in fr`).toBe(1);
      expect(v.en.split('**').length % 2, `${label}: unbalanced ** in en`).toBe(1);
    }
  });

  it('are written differently in the two languages, at the same level of detail', () => {
    for (const [label, v] of allTexts()) {
      if (v.fr.length < 40 && v.en.length < 40) continue;
      expect(v.fr, label).not.toBe(v.en);
      expect(v.fr.length / v.en.length, label).toBeGreaterThan(0.6);
      expect(v.fr.length / v.en.length, label).toBeLessThan(1.7);
    }
  });

  it('keep the same figures in French and English', () => {
    for (const [label, v] of allTexts()) {
      expect(figures(v.fr, 'fr'), label).toEqual(figures(v.en, 'en'));
    }
  });

  it('tag a non-reported figure the same way in both languages', () => {
    const pairs: [string, string][] = [
      ['(estimation)', '(estimate)'],
      ['(dérivé)', '(derived)'],
      ['(hypothèse du modèle)', '(model assumption)'],
      ['(hypothèse)', '(assumption)'],
      ['(résultat du modèle)', '(model result)'],
    ];
    for (const [label, v] of allTexts()) {
      for (const [fr, en] of pairs) expect(v.fr.includes(fr), `${label}: ${v.fr}`).toBe(v.en.includes(en));
    }
  });

  it('leave no French in the English texts, and no word of a spec value that is the same in both languages', () => {
    for (const [label, v] of allTexts()) expect(v.en, label).not.toMatch(/[éèêëàâùûôîïç]/i);
    for (const p of PARTS)
      for (const spec of p.specs) {
        const fr = isL(spec.value) ? spec.value.fr : spec.value;
        const en = isL(spec.value) ? spec.value.en : spec.value;
        if (/\p{L}{4,}/u.test(en)) expect(fr, `${p.id}: ${spec.label.en}`).not.toBe(en);
      }
  });

  it('are in British English', () => {
    // "meter" is the measuring device in British English too (energy meter, multimeter); only a length in meters is American
    const american =
      /\b(colors?|centers?|(?<=\d[ \u00a0]?)meters?|liters?|grays?|analyz\w*|behaviors?|fibers?|aluminum|favors?|honors?|labor|neighbors?|catalogs?|defense|license|plow|sulfur|gasoline|molds?|tons|mom|realiz\w*|organiz\w*|recogniz\w*|minimiz\w*|maximiz\w*|optimiz\w*|utiliz\w*|standardiz\w*)\b/i;
    for (const [label, v] of allTexts()) expect(v.en, label).not.toMatch(american);
  });

  it('never cite the research notes by code: sources are named in words', () => {
    for (const [label, v] of allTexts()) {
      expect(v.fr + v.en, label).not.toMatch(/\b(K\d{1,2}|S\d{1,2})\b/);
      expect(v.fr + ' ' + v.en, label).not.toMatch(/(?<!\p{L})(id|world|preset|undefined|dims\.ts)(?!\p{L})|\bsrc\//iu);
    }
  });

  it('name nobody: no person, channel, company, place or brand of the video, no author of a paper', () => {
    const names =
      /\b(Viset+a|Vicetta|Archi-?Pelle|L’Archi|Archipel|Révél|Revel Futur|Paulygones|Énergétique|Energetique|Bru|Rorres|Nagel|Simmons|Lubitz|Dellinger|Brada|Muysken|Nuernbergk|Lashofer|Kozyn|Wikipedia|YouTube|Google|Thomas|Lo[iï]c?|Lo[iï]s|La[eé]titia|Latitia|Bertrand|J[eé]r[eé]my|Greg|Maxime|Simon|Dupuit|Occitanie|Tarbes|Garonne|Pyr[eé]n[eé]es|Ari[eè]ge|Jean-Marie)\b/;
    for (const [label, v] of allTexts()) expect(v.fr + ' ' + v.en, label).not.toMatch(names);
  });

  it('never say that the machine drawn is the video builders’: it is generic', () => {
    const claims =
      /\b(their screw|their machine|leur vis|leur machine|real dimensions of the video|dimensions réelles)\b/i;
    for (const [label, v] of allTexts()) expect(v.fr + ' ' + v.en, label).not.toMatch(claims);
    expect(LAB_STRINGS.noticeGeneric![1]).toMatch(/generic/);
    expect(LAB_STRINGS.noticeGeneric![1]).toMatch(/not a construction plan/);
    expect(LAB_STRINGS.noticeGeneric![0]).toMatch(/générique/);
    expect(LAB_STRINGS.noticeGeneric![0]).toMatch(/pas un plan de construction/);
  });

  it('say that 200 W and 2 kW are the video’s hopes, never results', () => {
    for (const [label, v] of allTexts()) {
      if (/(?<![\d.,])200 W\b/.test(v.fr)) expect(v.fr, label).toMatch(/prototype|annonc|espoir|visé|vidéo/i);
      if (/(?<![\d.,])200 W\b/.test(v.en)) expect(v.en, label).toMatch(/prototype|announced|hope|aimed|video/i);
      if (/(?<![\d.,])2 kW\b/.test(v.fr))
        expect(v.fr, label).toMatch(/annonc|espoir|visé|objectif|espère|nominal|vidéo/i);
      if (/(?<![\d.,])2 kW\b/.test(v.en)) expect(v.en, label).toMatch(/announced|hope|aimed|target|rated|video/i);
    }
    const house = PARTS.find((p) => p.id === 'house-load')!;
    expect(house.specs.map((s) => (isL(s.value) ? s.value.en : s.value)).join(' ')).toMatch(/a hope, not a result/);
  });

  it('say, wherever a power or an efficiency is quoted, that it is the model’s', () => {
    for (const [label, v] of allTexts()) {
      if (/\b(waterKw|shaftKw)\b/.test(v.en)) continue;
      if (/\b3[.,]09 kW|\b2[.,]20 kW|\b2[.,]61 kW|84[.,]6 ?%|\b71 ?%/.test(v.fr + v.en))
        expect(v.fr + v.en, label).toMatch(/modèle|model/i);
    }
  });
});

// ------------------------------------------------------------------------------------------------ the guides

const guideIds = (steps: GuideStep[]) => steps.flatMap((s) => s.parts);

describe('assembly guide', () => {
  const step = (id: string) => ASSEMBLY.find((s) => s.id === id)!;
  const at = (id: string) => ASSEMBLY.findIndex((s) => s.id === id);

  it('has at least 30 steps (34), unique ids, a world each: from the delivery of the kit in the site, through the screw, the generator opened, the screw again and the powerroom, to the first filling', () => {
    expect(ASSEMBLY.length).toBeGreaterThanOrEqual(30);
    expect(ASSEMBLY.length).toBe(34);
    expect(new Set(ASSEMBLY.map((s) => s.id)).size).toBe(ASSEMBLY.length);
    expect(ASSEMBLY.every((s) => typeof s.scene === 'string')).toBe(true);
    const runs = ASSEMBLY.map((s) => s.scene).filter((s, i, a) => s !== a[i - 1]);
    expect(runs).toEqual(['site', 'screw', 'generator', 'screw', 'powerroom', 'screw']);
    expect(ASSEMBLY[0]!.id).toBe('bring-kit');
    expect(ASSEMBLY[ASSEMBLY.length - 1]!.id).toBe('first-water');
    for (const w of ['generator', 'powerroom'] as const)
      expect(ASSEMBLY.filter((s) => s.scene === w).length, w).toBeGreaterThanOrEqual(6);
  });

  it('installs every id of the screw, the generator and the powerroom exactly once, nothing else, each in the world of its step', () => {
    const ids = (w: WorldId) => ASSEMBLY.filter((s) => s.scene === w).flatMap((s) => s.parts);
    expect(ids('site')).toEqual([]);
    for (const w of ['screw', 'generator', 'powerroom'] as const)
      expect(ids(w).sort(), w).toEqual([...partIds(w)].sort());
    expect(guideIds(ASSEMBLY).sort()).toEqual(
      [...partIds('screw'), ...partIds('generator'), ...partIds('powerroom')].sort(),
    );
    for (const s of ASSEMBLY) for (const id of s.parts) expect(FROZEN[id]?.scene, `${s.id}: ${id}`).toBe(s.scene);
  });

  it('has exactly three steps that install nothing: the delivery of the kit, the turn by hand and the first test of the room', () => {
    expect(ASSEMBLY.filter((s) => s.parts.length === 0).map((s) => s.id)).toEqual([
      'bring-kit',
      'turn-by-hand',
      'first-test',
    ]);
  });

  it('keeps every step text within 80 words in both languages, tips and warnings short, a tool list, a rough duration and no torque', () => {
    for (const s of ASSEMBLY) {
      for (const lang of ['fr', 'en'] as const) {
        expect(words(s.text[lang]), `${s.id} text ${lang}`).toBeLessThanOrEqual(80);
        if (s.tip) expect(words(s.tip[lang]), `${s.id} tip ${lang}`).toBeLessThanOrEqual(35);
        if (s.warning) expect(words(s.warning[lang]), `${s.id} warning ${lang}`).toBeLessThanOrEqual(60);
      }
      expect(s.duration, s.id).toMatch(/^≈ \d+ (h|min) \(est\.\)$/);
      expect(s.torque, s.id).toBeUndefined();
      expect(s.tools?.length ?? 0, s.id).toBeGreaterThan(0);
    }
  });

  it('puts a warning where the gesture is risky: ladder, weight, wood dust, the rotating screw, chain and belt, magnets, the electrician, the battery, the arc, the heat, the first water', () => {
    expect(step('bring-kit').warning?.en).toMatch(/Confined space/);
    expect(step('bring-kit').warning?.en).toMatch(/ladder/);
    expect(step('lower-bearing').warning?.en).toMatch(/dust/);
    expect(step('core').warning?.en).toMatch(/pinching/);
    expect(step('modules').warning?.en).toMatch(/dust/);
    expect(step('trough').warning?.en).toMatch(/Fingers/);
    expect(step('turn-by-hand').warning?.en).toMatch(/snatches/);
    expect(step('chain').warning?.en).toMatch(/snatches/);
    expect(step('belt').warning?.en).toMatch(/snatches/);
    // the generator opened
    expect(step('gen-magnets').warning?.en).toMatch(/Powerful magnets/);
    expect(step('gen-magnets').warning?.en).toMatch(/pacemakers/);
    expect(step('gen-stator-coils').warning?.en).toMatch(/snap shut/);
    expect(step('gen-terminals').warning?.en).toMatch(/cannot be switched off/);
    expect(step('gen-terminals').warning?.en).toMatch(/even by hand/);
    // the powerroom
    expect(step('board').warning?.en).toMatch(/no electrical line or pipe/);
    expect(step('protections').warning?.en).toMatch(/does not go out by itself/);
    expect(step('rectifier').warning?.en).toMatch(/qualified electrician/);
    expect(step('rectifier').warning?.en).toMatch(/even by hand/);
    expect(step('controller').warning?.en).toMatch(/overcharge/);
    expect(step('battery').warning?.en).toMatch(/short circuit/);
    expect(step('battery').warning?.en).toMatch(/hydrogen/);
    expect(step('dump-load').warning?.en).toMatch(/very hot/);
    expect(step('dump-load').warning?.en).toMatch(/no longer braked/);
    expect(step('inverter').warning?.en).toMatch(/lethal voltage/);
    expect(step('inverter').warning?.en).toMatch(/qualified electrician/);
    expect(step('meter').warning?.en).toMatch(/without a fuse/);
    expect(step('earthing').warning?.en).toMatch(/never during a storm/);
    expect(step('first-test').warning?.en).toMatch(/never alone/);
    expect(step('first-water').warning?.en).toMatch(/safety gate/);
    // a text, a tip or a warning, as the steps need
    expect(step('battery').text.en).toMatch(/the last connection is made only at the first test/);
    expect(step('dump-load').text.en).toMatch(/The lab does not simulate it/);
    expect(step('controller').text.en).toMatch(/which does not simulate the controller/);
  });

  it('runs through the machine in a sensible order: bearings, core, modules, trough, the drive, the generator built and mounted, the electrics, then the water', () => {
    for (const [a, b] of [
      ['bring-kit', 'lower-bearing'],
      ['lower-bearing', 'core'],
      ['upper-bearing', 'core'],
      ['core', 'modules'],
      ['modules', 'fasteners'],
      ['fasteners', 'trough'],
      ['trough', 'turn-by-hand'],
      ['turn-by-hand', 'drive-sprocket'],
      ['drive-sprocket', 'chain'],
      ['countershaft', 'counter-sprocket'],
      ['counter-sprocket', 'chain'],
      ['chain', 'pulley-large'],
      ['pulley-large', 'gen-frame'],
      // the generator opened: the frame and the bearings, the rotor, its magnets, the stator brought to it, the terminals
      ['gen-frame', 'gen-bearings'],
      ['gen-bearings', 'gen-rotor-shaft'],
      ['gen-rotor-shaft', 'gen-magnets'],
      ['gen-magnets', 'gen-stator-coils'],
      ['gen-stator-coils', 'gen-terminals'],
      ['gen-terminals', 'generator'],
      ['generator', 'belt'],
      ['pulley-large', 'belt'],
      // the powerroom: board, protections open, rectifier, controller, battery, dump load, inverter, meter, earthing, first test
      ['belt', 'board'],
      ['board', 'protections'],
      ['protections', 'rectifier'],
      ['rectifier', 'controller'],
      ['controller', 'battery'],
      ['battery', 'dump-load'],
      ['dump-load', 'inverter'],
      ['inverter', 'meter'],
      ['meter', 'earthing'],
      ['earthing', 'first-test'],
      ['first-test', 'first-water'],
    ] as const)
      expect(at(a), `${a} before ${b}`).toBeLessThan(at(b));
  });

  it('builds the generator in the order that makes sense: the magnets go on the rotor before it meets the stator, the protections go in open before anything is wired', () => {
    expect(step('gen-magnets').text.en).toMatch(/Check the polarity of each before the glue sets/);
    expect(step('gen-stator-coils').text.en).toMatch(/the gap is closed slowly, with a guide tube/);
    expect(step('gen-bearings').text.en).toMatch(/outer ring only/);
    expect(step('protections').text.en).toMatch(/with the breaker open and the fuses out/);
    expect(step('protections').text.en).toMatch(/not only the battery’s/);
    expect(step('battery').text.en).toMatch(/with the fuse out and the breaker open/);
    expect(step('first-test').text.en).toMatch(/the battery’s fuse, the breaker, the inverter last/);
    expect(step('first-test').text.en).toMatch(/The water goes in only if everything is right/);
    expect(step('earthing').tip?.en).toMatch(/the rod is driven before any wiring/);
  });

  it('says what each step is FOR: no step is a bare list of gestures', () => {
    for (const s of ASSEMBLY) expect(s.text.en.length, s.id).toBeGreaterThan(200);
  });

  it('keeps the screw generic and the generator a bought machine opened for the lesson', () => {
    expect(step('gen-frame').text.en).toMatch(/bought model, delivered assembled/);
    expect(step('gen-frame').text.fr).toMatch(/livré tout assemblé/);
    expect(step('generator').text.en).toMatch(/Closed again/);
  });
});

describe('installation guide', () => {
  const step = (id: string) => INSTALL.find((s) => s.id === id)!;
  const at = (id: string) => INSTALL.findIndex((s) => s.id === id);

  it('has at least 13 steps (16) with unique ids, each in a world, from the water right to the stop procedure', () => {
    expect(INSTALL.length).toBeGreaterThanOrEqual(13);
    expect(INSTALL.length).toBe(16);
    expect(new Set(INSTALL.map((s) => s.id)).size).toBe(INSTALL.length);
    expect(INSTALL.every((s) => s.scene === 'site' || s.scene === 'screw' || s.scene === 'powerroom')).toBe(true);
    expect(INSTALL[0]!.id).toBe('rights');
    expect(INSTALL[INSTALL.length - 1]!.id).toBe('stop');
    expect(INSTALL.filter((s) => s.scene === 'powerroom').length).toBeGreaterThanOrEqual(5);
  });

  it('installs every id of the site and of the powerroom exactly once, and in the screw only the three ids the site decides', () => {
    const of = (w: WorldId) => INSTALL.filter((s) => s.scene === w).flatMap((s) => s.parts);
    expect(of('site').sort()).toEqual([...partIds('site')].sort());
    expect(of('powerroom').sort()).toEqual([...partIds('powerroom')].sort());
    expect(of('screw').sort()).toEqual(['inlet-sill', 'outlet-pool', 'trapped-water']);
    expect(of('generator')).toEqual([]);
    for (const s of INSTALL) for (const id of s.parts) expect(FROZEN[id]?.scene, `${s.id}: ${id}`).toBe(s.scene);
  });

  it('has the steps of a real project in order: right first, the water works, the chamber, the levels, the drive, the building, the earth, the protections, the wiring, the battery last, the tailrace, the check, the start, the stop', () => {
    for (const [a, b] of [
      ['rights', 'flow-and-fish'],
      ['flow-and-fish', 'weir-canal'],
      ['weir-canal', 'gate-rack'],
      ['gate-rack', 'chamber'],
      ['chamber', 'levels'],
      ['levels', 'drive'],
      ['drive', 'powerhouse'],
      ['powerhouse', 'earth-and-board'],
      ['earth-and-board', 'protections'],
      ['protections', 'wire-chain'],
      ['wire-chain', 'battery-last'],
      ['battery-last', 'tailrace'],
      ['tailrace', 'electrical-check'],
      ['electrical-check', 'first-start'],
      ['first-start', 'stop'],
    ] as const)
      expect(at(a), `${a} before ${b}`).toBeLessThan(at(b));
    expect(INSTALL.filter((s) => s.parts.length === 0).map((s) => s.id)).toEqual(['drive', 'electrical-check', 'stop']);
  });

  it('keeps every step text within 80 words in both languages, tips and warnings short, a rough duration in hours and no torque', () => {
    for (const s of INSTALL) {
      for (const lang of ['fr', 'en'] as const) {
        expect(words(s.text[lang]), `${s.id} text ${lang}`).toBeLessThanOrEqual(80);
        if (s.tip) expect(words(s.tip[lang]), `${s.id} tip ${lang}`).toBeLessThanOrEqual(35);
        // a safety or legal warning is never shortened below what it must say
        if (s.warning) expect(words(s.warning[lang]), `${s.id} warning ${lang}`).toBeLessThanOrEqual(60);
      }
      // the duration is a plain string in the kit, so it is language-neutral: hours and minutes only
      if (s.duration) expect(s.duration, s.id).toMatch(/^≈ \d+ (h|min) \(est\.\)$/);
      expect(s.torque, s.id).toBeUndefined();
      expect(s.tools?.length ?? 0, s.id).toBeGreaterThan(0);
    }
    expect(INSTALL[0]!.duration, 'the paperwork takes months or years: no duration').toBeUndefined();
  });

  it('says first that a mill race is not free to use, and that it depends on the country', () => {
    const rights = INSTALL[0]!;
    expect(rights.text.en).toMatch(/not free to use/);
    expect(rights.text.en).toMatch(/depends on the country/);
    expect(rights.text.fr).toMatch(/dépend du pays/);
    expect(rights.warning?.en).toMatch(/no legal advice/);
    expect(rights.warning?.fr).toMatch(/fondé en titre/);
    expect(rights.warning?.en).not.toMatch(/fond/);
    expect(rights.text.en).toMatch(/years/);
  });

  it('puts safety where it matters: drowning, the confined space, the rotating parts, the battery, the arc, the lock-out and the stop order', () => {
    expect(step('weir-canal').warning?.en).toMatch(/never work alone/);
    expect(step('weir-canal').warning?.en).toMatch(/life jacket/);
    expect(step('chamber').warning?.en).toMatch(/Confined space/);
    expect(step('chamber').warning?.en).toMatch(/locked/);
    expect(step('drive').warning?.en).toMatch(/guard rail/);
    expect(step('powerhouse').warning?.en).toMatch(/qualified electrician/);
    expect(step('powerhouse').warning?.en).toMatch(/never short-circuited/);
    expect(step('tailrace').warning?.en).toMatch(/flood/);
    expect(step('first-start').warning?.en).toMatch(/race/);
    expect(step('gate-rack').tip?.en).toMatch(/hand operation/);
    // the powerhouse's own steps
    expect(step('earth-and-board').warning?.en).toMatch(/no buried cable or pipe/);
    expect(step('earth-and-board').warning?.en).toMatch(/never during a storm/);
    expect(step('protections').warning?.en).toMatch(/arc of a break does not go out by itself/);
    expect(step('protections').warning?.en).toMatch(/never a bigger fuse/);
    expect(step('protections').tip?.en).toMatch(/padlock and a tag/);
    expect(step('wire-chain').warning?.en).toMatch(/qualified electrician/);
    expect(step('wire-chain').warning?.en).toMatch(/live as soon as the shaft turns, even by hand/);
    expect(step('battery-last').warning?.en).toMatch(/spit molten metal/);
    expect(step('battery-last').warning?.en).toMatch(/lethal voltage/);
    expect(step('electrical-check').warning?.en).toMatch(/by two/);
    // the stop procedure: water first, load last, then isolate, lock and test dead
    expect(step('stop').text.en).toMatch(/shut the head gate.*then open the DC breaker/);
    expect(step('stop').text.en).toMatch(/if you cut the load first, the screw races/);
    expect(step('stop').text.en).toMatch(/Take out the fuses/);
    expect(step('stop').text.en).toMatch(/Check that nothing is live before touching anything/);
    expect(step('stop').warning?.en).toMatch(/lock the gate mechanically/);
  });

  it('wires the powerhouse in the right order: earth first, protections open, the dump load before the battery, the battery last of the sources, the inverter last of all', () => {
    expect(step('earth-and-board').text.en).toMatch(/Earth first/);
    expect(step('earth-and-board').text.en).toMatch(/Before any wire carries current/);
    expect(step('protections').text.en).toMatch(/open and with the fuses out/);
    expect(step('wire-chain').text.en).toMatch(/The battery, a source of energy, is left for last/);
    expect(step('wire-chain').text.en).toMatch(/the brake must exist before the power does/);
    expect(step('wire-chain').parts).toContain('dump-load');
    expect(step('wire-chain').parts).not.toContain('battery');
    expect(step('battery-last').parts[0]).toBe('battery');
    expect(step('battery-last').text.en).toMatch(/connected last of the sources/);
    expect(step('battery-last').text.en).toMatch(/the inverter, closed last/);
    expect(step('battery-last').text.en).toMatch(/The house is connected afterwards, by the electrician/);
    expect(step('electrical-check').tip?.en).toMatch(/the inverter last\. The order of stopping is the reverse/);
    expect(step('powerhouse').text.en).toMatch(/The house is connected last, by an electrician/);
  });

  it('says that no fine rack is needed for a screw, with the honest caveat', () => {
    const gate = INSTALL.find((s) => s.id === 'gate-rack')!;
    expect(gate.text.en).toMatch(/needs no fine rack/);
    expect(gate.text.en).toMatch(/jammed/);
  });

  it('says that the lab’s figures are not to be expected on site: the video’s hopes and the model differ', () => {
    const start = INSTALL.find((s) => s.id === 'first-start')!;
    expect(start.text.en).toMatch(/Do not expect the lab’s figures/);
    expect(start.text.en).toMatch(/hopes/);
    expect(start.text.en).toMatch(/model result/);
    expect(start.text.en).toMatch(/battery voltage/);
  });

  it('says that the electrical steps are the general rule, not a wiring plan: it names the qualified electrician', () => {
    for (const id of ['earth-and-board', 'protections', 'wire-chain', 'battery-last', 'powerhouse'])
      expect(step(id).warning?.en, id).toMatch(/qualified electrician/);
  });
});

// ------------------------------------------------------------------------------------------------ chapters, overviews, interface strings

describe('chapters and overviews', () => {
  it('lists the chapters of the 57-minute video, in increasing order, in both languages, from the first to the last', () => {
    expect(CHAPTERS.length).toBeGreaterThanOrEqual(12);
    expect(CHAPTERS.length).toBeLessThanOrEqual(20);
    let last = -1;
    for (const [ts, fr, en] of CHAPTERS) {
      expect(ts).toMatch(/^\d{2}:[0-5]\d$/);
      expect(seconds(ts)).toBeGreaterThan(last);
      expect(seconds(ts)).toBeLessThanOrEqual(VIDEO_SECONDS);
      last = seconds(ts);
      expect(fr.length).toBeGreaterThan(0);
      expect(en.length).toBeGreaterThan(0);
    }
    expect(CHAPTERS[0]![0]).toBe('00:00');
    // the six chapters of docs/research.md §1
    const stamps = CHAPTERS.map((c) => c[0]);
    for (const ts of ['00:34', '05:06', '12:36', '15:01', '24:05', '38:52']) expect(stamps, ts).toContain(ts);
    // completion wave A: where the generator or the electrics appear (read in the private transcript for the timestamps only)
    for (const ts of ['14:01', '22:03', '22:36', '30:31', '35:43', '49:37']) expect(stamps, ts).toContain(ts);
  });

  it('gives an overview to each world: a title and two or three short paragraphs with the parts in bold', () => {
    expect(Object.keys(OVERVIEWS).sort()).toEqual([...WORLDS].sort());
    for (const w of WORLDS) {
      const o = OVERVIEWS[w];
      for (const lang of ['fr', 'en'] as const) {
        expect(o.title[lang].length, `${w} title`).toBeGreaterThan(0);
        const paragraphs = o.text[lang].split('\n\n');
        expect(paragraphs.length, `${w} ${lang}`).toBeGreaterThanOrEqual(2);
        expect(paragraphs.length, `${w} ${lang}`).toBeLessThanOrEqual(3);
        expect(o.text[lang], `${w} ${lang}`).toMatch(/\*\*[^*]+\*\*/);
        expect(sentences(o.text[lang]), `${w} ${lang}`).toBeLessThanOrEqual(12);
      }
    }
  });

  it('names in bold the parts of each world in its overview, in the words of the part names', () => {
    for (const w of WORLDS) {
      const bold = [...OVERVIEWS[w].text.fr.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]!.toLowerCase());
      const boldEn = [...OVERVIEWS[w].text.en.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]!.toLowerCase());
      expect(bold.length, w).toBe(boldEn.length);
      // every part of the world is named by its bold name, or part of it
      const mustFr: Record<WorldId, string[]> = {
        site: [
          'rivière',
          'seuil',
          'bief',
          'grille',
          'vanne de tête',
          'chambre d’eau',
          'moulin',
          'échancrure',
          'passe à poissons',
          'canal de fuite',
          'local technique',
          'maison',
        ],
        screw: [
          'seuil d’entrée',
          'poches d’eau',
          'auge',
          'modules de pales',
          'noyau central',
          'fixations',
          'palier haut',
          'palier bas',
          'bassin de sortie',
          'chaîne',
          'courroie',
          'arbre intermédiaire',
          'génératrice',
        ],
        generator: [
          'génératrice',
          'carcasse',
          'stator',
          'bobines',
          'rotor',
          'arbre',
          'roulements',
          'aimants',
          'boîte à bornes',
        ],
        powerroom: [
          'local technique',
          'disjoncteur continu',
          'boîte à fusibles',
          'redresseur',
          'régulateur de charge',
          'batterie',
          'charge de délestage',
          'onduleur',
          'compteur d’énergie',
          'tableau électrique',
          'mise à la terre',
        ],
      };
      for (const word of mustFr[w]) expect(bold.join(' | '), `${w}: ${word}`).toContain(word);
    }
  });
});

describe('the overviews of the four worlds', () => {
  const en = (w: WorldId) => OVERVIEWS[w].text.en;
  const fr = (w: WorldId) => OVERVIEWS[w].text.fr;

  it('the generator overview names every part in the two languages, says where to start, and says what is estimated and what is dangerous', () => {
    const mustEn = ['generator', 'frame', 'stator', 'coils', 'rotor', 'shaft', 'bearings', 'magnets', 'terminal box'];
    const bold = [...en('generator').matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]!.toLowerCase()).join(' | ');
    for (const word of mustEn) expect(bold, word).toContain(word);
    expect(en('generator')).toMatch(/\*\*To start\*\*/);
    expect(en('generator')).toMatch(/\*\*Section\*\*/);
    expect(en('generator')).toMatch(/\*\*Explode\*\*/);
    expect(fr('generator')).toMatch(/\*\*Pour commencer\*\*/);
    expect(fr('generator')).toMatch(/\*\*Coupe\*\*/);
    expect(fr('generator')).toMatch(/\*\*Éclaté\*\*/);
    expect(en('generator')).toMatch(/the lab’s estimates, not those of a real machine/);
    expect(en('generator')).toMatch(/without opening it/);
    expect(en('generator')).toMatch(/poles \(estimate\)/);
    expect(en('generator')).toMatch(/\(model result\)/);
    expect(en('generator')).toMatch(/never off/);
    expect(fr('generator')).toMatch(/ne s’éteint jamais/);
  });

  it('the powerroom overview names every device in order, says where to start, and says what is not simulated and what is dangerous', () => {
    const mustEn = [
      'powerhouse',
      'dc breaker',
      'fuse box',
      'rectifier',
      'charge controller',
      'battery',
      'dump load',
      'inverter',
      'energy meter',
      'switchboard',
      'earthing',
    ];
    const bold = [...en('powerroom').matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]!.toLowerCase());
    for (const word of mustEn) expect(bold.join(' | '), word).toContain(word);
    // read in the order the current goes
    const order = [
      'dc breaker',
      'fuse box',
      'rectifier',
      'charge controller',
      'battery',
      'dump load',
      'inverter',
      'energy meter',
    ];
    const pos = order.map((w) => bold.indexOf(w));
    expect(pos.every((x) => x >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    expect(en('powerroom')).toMatch(/\*\*To start\*\*/);
    expect(en('powerroom')).toMatch(/\*\*Flows\*\*/);
    expect(fr('powerroom')).toMatch(/\*\*Flux\*\*/);
    expect(en('powerroom')).toMatch(/not a wiring diagram/);
    expect(fr('powerroom')).toMatch(/pas un schéma de câblage/);
    expect(en('powerroom')).toMatch(/the dump load, the controller, the inverter and the meter are not simulated/);
    expect(en('powerroom')).toMatch(/the ratings of the devices and the cable sections drawn are the lab’s estimates/);
    expect(en('powerroom')).toMatch(/hundreds of amps/);
    expect(en('powerroom')).toMatch(/qualified electrician/);
    expect(en('powerroom')).toMatch(/\(assumption\)/);
    expect(en('powerroom')).toMatch(/\(model result\)/);
  });

  it('the screw overview no longer draws the electronics (they moved to the powerhouse) and sends to the generator; the site overview sends to the powerhouse', () => {
    expect(en('screw')).not.toMatch(/rectifier|charge controller|battery/);
    expect(fr('screw')).not.toMatch(/redresseur|régulateur|batterie/);
    expect(en('screw')).toMatch(/a cable leaves for the powerhouse/);
    expect(en('screw')).toMatch(/Click the \*\*generator\*\* to open it/);
    expect(en('site')).toMatch(/or the \*\*powerhouse\*\* to see the electrics/);
    expect(fr('site')).toMatch(/ou le \*\*local technique\*\* pour voir l’électricité/);
  });
});

describe('interface strings added by the data role', () => {
  it('has the tagline, the scene names, the go buttons, the group names, the notices and the chapters heading, in both languages', () => {
    for (const key of UI_KEYS) {
      const entry = LAB_STRINGS[key];
      expect(entry, key).toBeDefined();
      expect(entry![0].length, key).toBeGreaterThan(0);
      expect(entry![1].length, key).toBeGreaterThan(0);
    }
  });

  it('says in the safety callout what must be said, and in the legal callout once and generally what depends on the country', () => {
    const safety = LAB_STRINGS.safety!;
    for (const re of [
      /drown/,
      /lock/,
      /snatch/,
      /ladder/,
      /battery/,
      /fuse/,
      /electrician/,
      /dust/,
      /not a construction plan/,
      /races/,
    ])
      expect(safety[1], String(re)).toMatch(re);
    for (const re of [
      /noyad|noie/,
      /verrouill/,
      /happent/,
      /échelle/,
      /batterie/,
      /fusible/,
      /électricien/,
      /poussière/,
      /pas un plan de construction/,
      /s’emballe/,
    ])
      expect(safety[0], String(re)).toMatch(re);
    const legal = LAB_STRINGS.legal!;
    expect(legal[0]).toMatch(/fondé en titre/);
    expect(legal[0]).toMatch(/débit réservé/);
    expect(legal[0]).toMatch(/dépendent du pays/);
    expect(legal[1]).toMatch(/reserved flow/);
    expect(legal[1]).toMatch(/depend on the country/);
    expect(legal[1]).not.toMatch(/fond/);
  });

  it('has the callouts of completion wave A, in both languages: the safety of the electrics and the honesty about the estimates', () => {
    const safety = LAB_STRINGS.safetyElectric!;
    for (const re of [
      /short circuit/,
      /does not go out by itself/,
      /lock/,
      /live/,
      /magnets/,
      /dump load/,
      /lethal/,
      /qualified electrician/,
      /not a wiring diagram/,
    ])
      expect(safety[1], String(re)).toMatch(re);
    for (const re of [
      /court-circuit/,
      /ne s’éteint pas de lui-même/,
      /verrouillez/,
      /sous tension/,
      /aimants/,
      /charge de délestage/,
      /mortelle/,
      /électricien qualifié/,
      /pas un schéma de câblage/,
    ])
      expect(safety[0], String(re)).toMatch(re);
    const notice = LAB_STRINGS.noticeElectric!;
    for (const re of [/generic/, /poles/, /air gap/, /estimates/, /not simulated/, /perfect battery/])
      expect(notice[1], String(re)).toMatch(re);
    for (const re of [/génériques/, /pôles/, /entrefer/, /estimations/, /ne sont pas simulés/, /batterie parfaite/])
      expect(notice[0], String(re)).toMatch(re);
    expect(LAB_STRINGS.scenePowerroom![1]).toBe('Powerhouse');
    expect(LAB_STRINGS.sceneGenerator![1]).toBe('Generator');
  });

  it('keeps the template keys that the panel and the lead use unchanged', () => {
    expect(LAB_STRINGS.tagline).toBeDefined();
    expect(LAB_STRINGS.disclaimer).toBeDefined();
    expect(LAB_STRINGS.sceneDevice).toBeDefined();
    expect(LAB_STRINGS.groupDevice).toBeDefined();
  });
});

// ------------------------------------------------------------------------------------------------ the numbers

/**
 * Every number a text may carry that is not a FIG figure (those are allowed by construction: derived, model results, assumptions or
 * estimates, checked below against the simulation and dims.ts), with where it comes from. A number that is not here is a number nobody
 * checked: add it WITH its source, or write it by placeholder from figures.ts. "video" = the main video (read in words, never in the
 * garbled captions); "published" = the design rules of the literature the physics role read (docs/physics.md §1, §9).
 */
const REPORTED: Record<string, string> = {
  // small integers: counts and words
  '0.2': '0.2 % of loss in the bearings: 5.4 W of 3,090 W (model result, quoted with the model)',
  '0.45': 'belt ratio × 0.45 of the wrong-ratio scenario (src/sim/presets.ts)',
  '0.5': '0.5 m of extra tailwater (model input) and 0.5 mm of roughness (machine.ts ROUGHNESS_NEW_MM)',
  '0.5357':
    'core / screw diameter ratio, published optimum for three threads (Rorres 2000, table 1; machine.ts RADIUS_RATIO)',
  '0.0045': 'the gap rule g = 0.0045 √D (published; machine.ts GAP_COEFF)',
  '0.01': 'bearing friction coefficient μ (assumption, machine.ts BEARING_MU)',
  '1': 'one tenth etc. in digits: 1 cm of head, 1 s',
  '1.5': 'the 1.5 to 2 m of head of the small abandoned mills (video, research K5); the 1.5 m of tail rise is FIG',
  '1.9': 'belt ratio × 1.9 of the wrong-ratio scenario (src/sim/presets.ts)',
  '2': 'the 1.5 to 2 m of head (video); 2 kW target (video, research K5); two stages',
  '2.6': 'ratio of about 2.6 of a 30 kW crossflow plant (another video, research K11)',
  '3': 'three threads (video, research K8); three phases; about 3 % of the water power lost at the outlet (model: 89.5 W of 3,090 W)',
  '5': 'the 0.5 to 5 mm of roughness of the scenario (presets.ts RANGES.roughness); 5 mm = max',
  '10': 'ten-litre bucket; 10 % reserved flow shown in FIG as reservedPct',
  '16': 'ISO 16B chain / M16 bolt: from dims.ts, in DIM_SPECS',
  '20': 'a wheel turns at 10 to 20 rpm: 9.8 to 19.8 rpm in the model (docs/physics.md §1.6, src/sim/wheel.ts)',
  '22': 'slope of 22°: the most common angle of installed screws (published, Simmons & Lubitz 2024; machine.ts SLOPE_DEG_DEFAULT)',
  '30': '30 to 60 rpm (video, research K6); a 30 kW crossflow plant (another video, research K10); thirty litres per second in words',
  '60': '30 to 60 rpm (video); 60 % of D cos 22° (published optimum submergence, machine.ts PSI_OPT)',
  '64': 'reserved flow of 64 L/s of a mountain plant (another video, research K16)',
  '80': 'rack blocked at 80 % (model input of the debris scenario, presets.ts)',
  '90': 'rack blocked at 90 % (model input of the debris scenario, presets.ts)',
  '95': 'multipliers above 95 % (published, Dellinger 2015 citing Nuernbergk 2012; machine.ts CHAIN_EFFICIENCY)',
  '100': 'the tailrace of the video’s mill is about 100 m (video, research §3)',
  '120':
    'the constant of the electrical frequency of a synchronous machine, f = poles × rpm / 120 (physics, not a source’s figure; GENERATOR_DESIGN in dims.ts has the same formula)',
  '200': 'the prototype’s 200 W (video, research K3), the 200 to 300 W possible',
  '300': 'the 200 to 300 W possible of the prototype (video, research K3)',
  '380': 'turbine of 380 rpm → generator 990 rpm of a 30 kW crossflow plant (another video, research K11)',
  '990': 'generator at 990 rpm of that plant (another video, research K11)',
};

function figNumbers(): Set<number> {
  const set = new Set<number>();
  for (const [value, digits] of Object.values(FIG)) {
    set.add(Number(value));
    set.add(Number(nEn(value, digits).replace(/,/g, '')));
  }
  return set;
}

/** The numbers printed by the dimension rows of DIM_SPECS: they are read from dims.ts by construction. */
function dimNumbers(): Set<number> {
  const set = new Set<number>();
  for (const specs of Object.values(DIM_SPECS))
    for (const s of specs) {
      const text = isL(s.value) ? s.value.en : s.value;
      for (const n of figures(text, 'en')) set.add(Number(n));
    }
  return set;
}

describe('numbers in the texts', () => {
  const allowed = new Set<number>([...Object.keys(REPORTED).map(Number), ...figNumbers(), ...dimNumbers()]);

  it('has every number of every text either in figures.ts (derived, model, assumed, estimated), read from dims.ts, or in the allow-list with its source', () => {
    const unknown: string[] = [];
    for (const [label, v] of allTexts()) {
      if (label.startsWith('ui ')) continue; // the interface strings are checked by src/panels/strings.test.ts
      for (const n of figures(v.en, 'en')) if (!allowed.has(Number(n))) unknown.push(`${label}: ${n}`);
    }
    expect(unknown).toEqual([]);
  });

  it('has a reason for every allow-listed number: none is unused', () => {
    const used = new Set<number>();
    for (const [, v] of allTexts()) for (const n of figures(v.en, 'en')) used.add(Number(n));
    const fig = figNumbers();
    const dim = dimNumbers();
    const unused = Object.keys(REPORTED).filter(
      (k) => !used.has(Number(k)) && !fig.has(Number(k)) && !dim.has(Number(k)),
    );
    expect(unused).toEqual([]);
  });

  it('uses every figure of figures.ts in at least one text', () => {
    const files = import.meta.glob(
      ['./parts/{site,machine,drive,electric,generator,powerroom}.ts', './{assembly,install,overviews}.ts'],
      { query: '?raw', import: 'default', eager: true },
    ) as Record<string, string>;
    expect(Object.keys(files).length).toBe(9);
    const sources = Object.values(files).join('\n');
    const unused = Object.keys(FIG).filter((k) => !sources.includes(`{${k}}`));
    expect(unused).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------ against the simulation

describe('the figures of the texts are what the simulation finds', () => {
  const p = presetParams('full-size');
  const plant = plantFor(p);
  const screw = plant.screw!;
  const op = solvePlant(p, p.riverFlow);
  const at = (patch: Partial<typeof p>, flow = p.riverFlow) => solvePlant({ ...p, ...patch }, flow);
  /** A figure is the exact value rounded to the digits the texts print. */
  const rounds = (name: keyof typeof FIG, exact: number, tolerance?: number) => {
    const [value, digits] = FIG[name];
    const tol = tolerance ?? 0.5 * 10 ** -digits + 1e-9;
    expect(Math.abs(value - exact), `${name}: ${value} against ${exact}`).toBeLessThanOrEqual(tol);
  };

  it('the design point of the lab is the full-size preset: 1.75 m, 180 L/s', () => {
    rounds('head', p.head);
    rounds('flowLs', p.designFlow * 1000);
    expect(DESIGN.head).toBe(p.head);
    expect(DESIGN.flow).toBe(p.designFlow);
  });

  it('the powers and efficiencies: water 3.09 kW, shaft 2.61 kW, battery 2.20 kW, screw 84.6 %, overall 71 %', () => {
    rounds('waterKw', op.hydraulicPower / 1000);
    rounds('shaftKw', op.shaftPower / 1000);
    rounds('elecKw', op.electricPower / 1000);
    rounds('etaScrew', op.etaMachine * 100);
    rounds('etaAll', op.etaOverall * 100);
    rounds('etaDrive', op.driveEfficiency * 100);
    rounds('etaGen', op.generatorEfficiency * 100);
    // the books close: the losses and the electricity add up to the water
    const sum =
      op.electricPower +
      op.lossGap +
      op.lossOverflow +
      op.lossDrawdown +
      op.lossInlet +
      op.lossOutlet +
      op.lossFriction +
      op.lossBearing +
      op.lossDrive +
      op.lossGenerator;
    expect(Math.abs(sum - op.hydraulicPower)).toBeLessThan(1);
  });

  it('the losses', () => {
    rounds('lossGapW', op.lossGap);
    rounds('lossOutletW', op.lossOutlet);
    rounds('lossFrictionW', op.lossFriction);
    rounds('lossInletW', op.lossInlet);
    rounds('lossDriveW', op.lossDrive);
    rounds('lossGenW', op.lossGenerator);
    rounds('lossBearingW', op.lossBearing);
    rounds('diodeLossW', DIODE_DROP * op.current);
    rounds('copperLossW', plant.generator.resistance * op.current ** 2);
    expect(Math.abs(FIG.diodeLossW[0] + FIG.copperLossW[0] - FIG.lossGenW[0])).toBeLessThanOrEqual(1);
  });

  it('the speeds, torques and currents along the drive', () => {
    rounds('rpm', op.rpm);
    rounds('torqueScrew', op.torque);
    rounds('torqueGen', op.generatorTorque);
    rounds('countershaftRpm', op.rpm * p.chainRatio);
    rounds('countershaftTorque', (op.shaftPower * CHAIN_EFFICIENCY) / (op.omega * p.chainRatio));
    rounds('genShaftKw', (op.shaftPower * op.driveEfficiency) / 1000);
    rounds('voc', op.openCircuitVolts);
    rounds('current', op.current);
    rounds('cutInRpm', radToRpm(cutInOmega(plant.generator)));
    rounds('cutInScrewRpm', radToRpm(cutInOmega(plant.generator)) / (p.chainRatio * p.beltRatio));
    expect(op.generatorRpm).toBeCloseTo(GEN_RATED_RPM, -1);
    rounds('chain', p.chainRatio);
    rounds('belt', p.beltRatio);
    rounds('ratio', p.chainRatio * p.beltRatio);
  });

  it('the generator opened: its constant, its resistance, its line and phase voltages and currents, the force when it races', () => {
    const g = plant.generator;
    rounds('genK', g.voltsPerRad);
    rounds('genResistance', g.resistance);
    expect(Math.abs(g.voltsPerRad * op.current - op.generatorTorque)).toBeLessThan(1e-6); // torque = k × current: 0.86 N·m per ampere
    const line = op.openCircuitVolts / BRIDGE_FACTOR; // the rectified 53.7 V is 1.35 × the voltage between two phases
    rounds('genLineV', line);
    rounds('genPhaseV', line / Math.sqrt(3));
    rounds('genPhaseA', op.current * Math.sqrt(2 / 3));
    expect(FIG.rectFactor[0]).toBeCloseTo(BRIDGE_FACTOR, 1);
    // the books of the generator close with the numbers of the sheets: Voc I = battery I + diodes I + R I²
    const closes =
      op.openCircuitVolts * op.current -
      (BUS_VOLTS * op.current + DIODE_DROP * op.current + g.resistance * op.current ** 2);
    expect(Math.abs(closes)).toBeLessThan(1e-6);
  });

  it('a screw with no load races: about 180 rpm, 3.3 times its speed, the generator near 1,960 rpm and 176 V open-circuit', () => {
    let lo = 1;
    let hi = 40;
    for (let i = 0; i < 60; i++) {
      const m = (lo + hi) / 2;
      if (screwPoint(screw, { flow: p.designFlow, omega: m }).torque > 0) lo = m;
      else hi = m;
    }
    const rpm = radToRpm(lo);
    rounds('freeRunRpm', rpm);
    rounds('freeRunFactor', rpm / plant.designRpm);
    rounds('freeRunGenRpm', rpm * p.chainRatio * p.beltRatio, 10);
    rounds('freeRunVolts', plant.generator.voltsPerRad * lo * p.chainRatio * p.beltRatio);
    // the centrifugal force on the rotor follows the square of the speed: 10.6 times, said "about 11"
    rounds('freeRunForce', (rpm / plant.designRpm) ** 2);
  });

  it('the gap and the roughness: a gap twice or four times the rule, a rougher wall', () => {
    rounds('gap2Eff', at({ gapScale: 2 }).etaMachine * 100);
    rounds('gap4Eff', at({ gapScale: 4 }).etaMachine * 100);
    rounds('gap05Eff', at({ gapScale: 0.5 }).etaMachine * 100);
    rounds('rough5Loss', (1 - at({ roughness: 5 }).electricPower / op.electricPower) * 100);
    rounds('gapMm', screw.gap * 1000);
  });

  it('the rack: 1 cm clean, 0.53 m at 80 %, more than the head at 90 %, and a third of the power gone at 80 %', () => {
    rounds('rackCleanCm', rackHeadLoss(true, 0) * 100);
    rounds('rack80Head', rackHeadLoss(true, 0.8));
    rounds('rack90Head', rackHeadLoss(true, 0.9));
    expect(FIG.rack90Head[0]).toBeGreaterThan(p.head);
    const blocked = at({ trashRack: true, debris: 0.8 });
    expect(blocked.electricPower / op.electricPower).toBeGreaterThan(0.62);
    expect(blocked.electricPower / op.electricPower).toBeLessThan(0.7);
    expect(at({ trashRack: true, debris: 0.9 }).electricPower).toBe(0);
  });

  it('the tailwater: +0.5 m costs a third of the electricity; at the flood gate the water downstream is 1.17 m higher and 0.58 m of head is left', () => {
    rounds('tail05Pct', (1 - at({ tailwater: 0.5 }).electricPower / op.electricPower) * 100);
    rounds('tailGate', tailRise('race', floodFlow('race')));
    rounds('headLeft', p.head - tailRise('race', floodFlow('race')));
    rounds('tailPerDecade', SITES.race.tailPerDecade);
  });

  it('a third of the flow: the screw keeps 80 % and its pockets are 43 % full; the pool can sink by 46 cm', () => {
    const third = solvePlant(p, reservedFlow('race') + p.designFlow / 3);
    rounds('third', third.etaMachine * 100);
    rounds('thirdFill', third.fill * 100);
    rounds('drawdown', screw.bucketDepth * 100);
  });

  it('the pockets: 62 L each, 16 of them, 11 cm between two levels, 0.79 m/s, 5.9 s from top to bottom, a tonne of water, 170 L/s through the pockets and 9 leaking', () => {
    rounds('bucketL', screw.bucketVolume * 1000);
    rounds('buckets', screw.buckets);
    rounds('bucketsM3', (screw.buckets * screw.bucketVolume * 1000) / 1000, 0.5);
    rounds('stepCm', (screw.pitch / BLADES) * Math.sin(screw.slope) * 100);
    const v = (screw.pitch * op.rpm) / 60;
    rounds('pocketSpeed', v);
    rounds('transit', screw.length / v);
    rounds('tipSpeed', (op.omega * screw.outerDiameter) / 2);
    rounds('qBucketLs', op.qBucket * 1000);
    rounds('qGapLs', op.qGap * 1000);
    // the staircase adds up to the head
    expect(Math.abs(screw.buckets * (screw.pitch / BLADES) * Math.sin(screw.slope) - screw.head)).toBeLessThan(0.1);
  });

  it('the geometry of the sizing: 0.86 m, core 0.46 m, pitch 0.86 m, 4.67 m long, the optimal depth of the outlet 0.48 m', () => {
    rounds('diameter', screw.outerDiameter);
    rounds('inner', screw.innerDiameter);
    rounds('pitch', screw.pitch);
    rounds('length', screw.length);
    rounds('tailDepth', SCREW.tailDepth);
    rounds('mass', screw.mass, 5);
    // …and dims.ts reads the same numbers
    expect(SCREW.outerDiameter).toBe(screw.outerDiameter);
    expect(SCREW.length).toBe(screw.length);
    expect(SCREW.threads).toBe(BLADES);
  });

  it('a wrong belt ratio: × 0.45 and × 1.9', () => {
    const low = at({ beltRatio: p.beltRatio * 0.45 });
    const high = at({ beltRatio: p.beltRatio * 1.9 });
    rounds('beltLowEl', low.electricPower / 1000);
    rounds('beltHighEl', high.electricPower / 1000);
    rounds('beltLowRpm', low.rpm, 1);
    rounds('beltHighRpm', high.rpm, 1);
  });

  it('a wheel instead of the screw: the drive ratio it needs and the electricity it gives (comparison only)', () => {
    const ratio = (m: 'overshot' | 'breastshot' | 'undershot') => {
      const w = presetParams('full-size', m);
      return w.chainRatio * w.beltRatio;
    };
    const kw = (m: 'overshot' | 'breastshot' | 'undershot') => {
      const w = presetParams('full-size', m);
      return solvePlant(w, w.riverFlow).electricPower / 1000;
    };
    rounds('ratioWheelLow', Math.min(ratio('overshot'), ratio('breastshot'), ratio('undershot')), 1);
    rounds('ratioWheelHigh', Math.max(ratio('overshot'), ratio('breastshot'), ratio('undershot')), 1);
    rounds('wheelOverKw', kw('overshot'));
    rounds('wheelBreastKw', kw('breastshot'));
    rounds('wheelUnderKw', kw('undershot'));
    rounds('kaplanM', runnerDiameter(p.designFlow));
    rounds('kaplanTimes', screw.outerDiameter / runnerDiameter(p.designFlow));
  });

  it('the year of the mill race: 9,800 kWh, 1.1 kW on average, 51 %, 57 days of low water, 7,400 hours, 28 % in winter against 24.7 % of the year', () => {
    const y = simulateYear(p);
    rounds('yearKwh', y.energy, 60);
    rounds('meanKw', y.meanPower / 1000);
    rounds('cf', y.capacityFactor * 100);
    rounds('daysLow', y.daysLowWater);
    rounds('hours', y.hoursRunning, 50);
    rounds('winter', y.winterShare * 100);
    rounds('winterShare', (y.winterDays / 365) * 100);
    rounds('used', (y.energy / y.siteEnergy) * 100);
    rounds('medianLs', medianFlow('race') * 1000);
  });

  it('the prototype of the video, at the research’s own derived head and flow, gives 206 W: a derivation, not a result about the video', () => {
    const proto = presetParams('prototype');
    rounds('protoW', solvePlant(proto, proto.riverFlow).electricPower);
  });

  it('the head lost per centimetre: 18 W of water at 180 L/s (derived)', () => {
    rounds('cmW', 1000 * 9.81 * p.designFlow * 0.01);
  });

  it('the assumptions of the model are those of src/sim/machine.ts', () => {
    rounds('genRpm', GEN_RATED_RPM);
    rounds('busVolts', BUS_VOLTS);
    rounds('diodeDrop', DIODE_DROP);
    rounds('chainEff', CHAIN_EFFICIENCY * 100);
    rounds('beltEff', BELT_EFFICIENCY * 100);
    rounds('headroom', GEN_HEADROOM * 100);
    rounds('stageMax', STAGE_RATIO_MAX);
    rounds('reservedPct', RESERVED_FRACTION * 100);
    rounds('reservedLs', reservedFlow('race') * 1000);
    rounds('floodFactor', FLOOD_GATE_FACTOR);
    rounds('floodM3', floodFlow('race'));
    rounds('lowCutPct', FLOW_MIN_FRAC * 100);
    rounds('lowCutLs', (FLOW_MIN_FRAC * p.designFlow + reservedFlow('race')) * 1000);
    rounds('canalSpeed', CANAL_SPEED);
    rounds('meanBrookLs', SITES.brook.meanFlow * 1000);
    rounds('meanRaceLs', SITES.race.meanFlow * 1000);
    rounds('meanRiverM3', SITES.river.meanFlow);
    rounds('rectFactor', BRIDGE_FACTOR);
    expect(Math.abs(FIG.rectFactor[0] - (3 * Math.SQRT2) / Math.PI)).toBeLessThan(0.005);
    expect(BEARING_RADIUS_FRAC).toBeCloseTo(0.05, 6);
  });

  it('the design of the generator and the ratings of the powerhouse (estimates) are those of dims.ts and are coherent with the model', () => {
    // the counts the 3D role draws are the counts the sheets give
    expect(FIG.genPoles[0]).toBe(GENERATOR_DESIGN.poles);
    expect(FIG.genSlots[0]).toBe(GENERATOR_DESIGN.slots);
    expect(FIG.genCoilsPerPhase[0]).toBe(GENERATOR_DESIGN.slots / GENERATOR_DESIGN.phases);
    expect(FIG.genFreq[0]).toBe(electricalFrequency(GEN_RATED_RPM));
    expect(FIG.genFreq[0]).toBe((GENERATOR_DESIGN.poles * GEN_RATED_RPM) / 120);
    // 24 slots on 16 poles is a usual concentrated winding: three phases share the teeth, and the magnets come in north-south pairs
    expect(GENERATOR_DESIGN.slots % GENERATOR_DESIGN.phases).toBe(0);
    expect(GENERATOR_DESIGN.poles % 2).toBe(0);
    // the ratings: the breaker above the service current with a margin, the fuse above the breaker, the inverter drawing more than the charge
    expect(FIG.breakerA[0]).toBeGreaterThan(1.25 * FIG.current[0]);
    expect(FIG.fuseA[0]).toBeGreaterThan(FIG.breakerA[0]);
    expect(FIG.invA[0]).toBe(Math.round((FIG.invKw[0] * 1000) / FIG.busVolts[0]));
    expect(FIG.invA[0]).toBeGreaterThan(FIG.current[0]);
    expect(FIG.batCableMm2[0]).toBeGreaterThanOrEqual(FIG.earthMm2[0]);
    // the dump load swallows the whole electric power at the bus voltage: R = V / I, and V² / P gives the same
    const pOut = op.electricPower;
    rounds('dumpOhm', (BUS_VOLTS * BUS_VOLTS) / pOut);
    rounds('dumpOhm', BUS_VOLTS / op.current);
  });

  it('the MODEL record holds only what FIG prints', () => {
    for (const [key, value] of Object.entries(MODEL)) expect(FIG[key as keyof typeof FIG][0], key).toBe(value);
  });
});

// ------------------------------------------------------------------------------------------------ against dims.ts

describe('the sheets agree with src/three/dims.ts, the single source of lengths', () => {
  const sheet = (id: string): PartInfo => PARTS.find((x) => x.id === id)!;
  const textOf = (id: string): string =>
    partTexts(sheet(id))
      .map(([, v]) => v.en)
      .join(' ');
  const digitsOf = (m: number) => (Math.abs(m * 1000 - Math.round(m * 1000)) < 1e-6 ? 0 : 1);
  const mmStr = (m: number) => nEn(m * 1000, digitsOf(m));
  const mStr = (m: number) => nEn(m, 2);
  const has = (id: string, ...strings: string[]) => {
    const t = textOf(id);
    for (const s of strings) expect(t, `${id}: ${s}`).toContain(s);
  };

  it('every dimension row of DIM_SPECS is on the sheet, tagged as an estimate', () => {
    for (const [id, specs] of Object.entries(DIM_SPECS)) {
      for (const s of specs) {
        expect(sheet(id).specs, `${id}: ${s.label.en}`).toContainEqual(s);
        const value = isL(s.value) ? s.value : { fr: s.value, en: s.value };
        expect(value.fr, `${id}: ${s.label.en}`).toContain('(estimation)');
        expect(value.en, `${id}: ${s.label.en}`).toContain('(estimate)');
      }
    }
    expect(Object.keys(DIM_SPECS).sort()).toEqual(
      PARTS.map((q) => q.id)
        .sort()
        .filter((id) => id in DIM_SPECS),
    );
    expect(Object.keys(DIM_SPECS).length).toBeGreaterThanOrEqual(30);
  });

  it('site: the river, weir, canal, rack, gate, notch, fish pass, chamber, tailrace, mill, powerhouse, house', () => {
    has('river', mStr(SITE.river.zSouth - SITE.river.zNorth));
    has('weir', mStr(SITE.weir.thickness), mmStr(-SITE.weir.crestY));
    has('headrace', mStr(SITE.canal.zSouth - SITE.canal.zNorth), mStr(-SITE.canal.bedY));
    has('trash-rack', mmStr(SITE.rack.spacing), mStr(SITE.rack.height));
    has('intake-gate', mStr(SITE.gate.height));
    has('reserved-flow-notch', `${mStr(SITE.notch.width)} × ${mStr(SITE.notch.depth)} m`);
    has('fish-pass', `${SITE.fishPass.pools} pools`);
    has('water-chamber', mStr(-SITE.chamber.floorY), mStr(SITE.chamber.wall));
    has('tailrace', mStr(SITE.tailrace.length), mStr(SITE.tailrace.width), 'about 100 m');
    has('mill-building', `${mStr(SITE.mill.length)} × ${mStr(SITE.mill.width)} m`, mStr(SITE.mill.wallHeight));
    has('powerhouse', `${mStr(SITE.powerhouse.length)} × ${mStr(SITE.powerhouse.width)} m`);
    has('house-load', `${mStr(SITE.house.length)} × ${mStr(SITE.house.width)} m`);
  });

  it('the tailrace says that the picture shortens it, and keeps the video’s length', () => {
    expect(SITE.tailrace.length).toBeLessThan(100);
    expect(textOf('tailrace')).toMatch(/shortened/);
  });

  it('screw: the sizing numbers of the sheets are those of dims.ts', () => {
    expect(FIG.diameter[0]).toBeCloseTo(SCREW.outerDiameter, 2);
    expect(FIG.inner[0]).toBeCloseTo(SCREW.innerDiameter, 2);
    expect(FIG.pitch[0]).toBeCloseTo(SCREW.pitch, 2);
    expect(FIG.length[0]).toBeCloseTo(SCREW.length, 2);
    expect(FIG.gapMm[0]).toBeCloseTo(SCREW.gap * 1000, 1);
    expect(FIG.bucketL[0]).toBeCloseTo(SCREW.bucketVolume * 1000, -0.5);
    expect(FIG.drawdown[0]).toBeCloseTo(SCREW.bucketDepth * 100, -0.5);
    expect(FIG.tailDepth[0]).toBeCloseTo(SCREW.tailDepth, 2);
    expect(FIG.stepCm[0]).toBeCloseTo(SCREW.bladeSpacing * Math.sin((SCREW.slopeDeg * Math.PI) / 180) * 100, -0.5);
    expect(SCREW.slopeDeg).toBe(22);
  });

  it('screw: the trough, the modules, the bolts, the bearings, the pool', () => {
    has('trough', mmStr(TROUGH.wall), 'concrete half-pipe');
    has('blade-module', `${MODULES_PER_TURN} modules per turn`);
    has('blade-fastener', `${BOLTS_PER_MODULE} bolts of ${nEn(BOLT.shank * 1000)} mm`);
    has('upper-bearing', `${nEn(BEARING.upperOffset, 2)} m beyond the top`);
    has('lower-bearing', `${nEn(BEARING.lowerOffset, 2)} m beyond the bottom`);
    has('inlet-sill', mStr(POOLS.inletLength));
    has('outlet-pool', `${mStr(POOLS.outletLength)} × ${mStr(2 * POOLS.outletHalfWidth)} m`);
  });

  it('the drive: teeth, pulleys, pitch and belt of dims.ts, with the ratios of the simulation', () => {
    const small = smallTeeth(DESIGN.chainRatio);
    has('drive-sprocket', `${DRIVE.largeTeeth} teeth`, nEn(2 * largeSprocketRadius(), 2));
    has('counter-sprocket', `${small} teeth`, nEn(2 * sprocketRadius(small), 2));
    // the ratio of the teeth is the ratio of the stage, to the nearest tooth
    expect(DRIVE.largeTeeth / small).toBeCloseTo(DESIGN.chainRatio, 0);
    has('chain', mmStr(DRIVE.chainPitch));
    has('pulley-large', mStr(2 * DRIVE.largePulleyRadius));
    has('pulley-small', mStr(2 * smallPulleyRadius(DESIGN.beltRatio)));
    expect((2 * DRIVE.largePulleyRadius) / (2 * smallPulleyRadius(DESIGN.beltRatio))).toBeCloseTo(DESIGN.beltRatio, 6);
    has('belt', `${nEn(DRIVE.beltWidth * 1000)} mm wide`, `${nEn(DRIVE.beltThickness * 1000)} mm thick`);
    has('countershaft', mStr(DRIVE.chainCentres), mStr(DRIVE.beltCentres));
    expect(DESIGN.chainRatio * DESIGN.beltRatio).toBeCloseTo(FIG.ratio[0], 1);
  });

  it('the electrical parts: generator, boxes, battery', () => {
    has('generator', `${mStr(0.31)} × ${mStr(0.34)} m`);
    has('rectifier', ELECTRONICS.rectifier.map((x) => nEn(x * 1000)).join(' × '));
    has('charge-controller', ELECTRONICS.controller.map((x) => nEn(x * 1000)).join(' × '));
    has('battery', ELECTRONICS.battery.map((x) => nEn(x * 1000)).join(' × '), `${DESIGN.busVolts} V lithium pack`);
  });

  it('the generator opened: the frame, the stator, the coils, the rotor, the magnets, the shaft, the bearings and the box are those of dims.ts', () => {
    const GD = GENERATOR_DESIGN;
    has(
      'gen-frame',
      `${mStr(2 * GENERATOR.bodyRadius)} × ${mStr(GENERATOR.bodyLength)} m`,
      mmStr(GD.shellWall),
      `${GD.ribs.count} round the body`,
    );
    has('gen-stator', mmStr(2 * GD.stator.outerRadius), mmStr(2 * GD.stator.boreRadius), mmStr(GD.stator.stack));
    has('gen-coils', mmStr(GD.coil.build), mmStr(GD.coil.overhang));
    has('gen-rotor', mmStr(2 * (GD.stator.boreRadius - GD.gap)), mmStr(GD.rotor.stack));
    has('gen-magnets', mmStr(GD.rotor.magnetThickness), mmStr(GD.gap), `${nEn(GD.rotor.magnetArc * 100)}%`);
    has(
      'gen-shaft',
      mmStr(2 * GENERATOR.shaftRadius),
      mStr(GENERATOR.stub),
      `${mmStr(GD.shaft.keyLength)} × ${mmStr(GD.shaft.keyWidth)} mm`,
    );
    has('gen-bearings', `${mmStr(2 * GD.bearing.outerRadius)} × ${mmStr(GD.bearing.width)} mm`);
    has('gen-terminals', GENERATOR.box.map((x) => nEn(x * 1000)).join(' × '));
    // the same machine as the blue generator of the screw: the same body, shaft and box, nothing retyped
    expect(
      sheet('generator').specs.some(
        (x) =>
          isL(x.value) && x.value.en.includes(`${mStr(2 * GENERATOR.bodyRadius)} × ${mStr(GENERATOR.bodyLength)} m`),
      ),
    ).toBe(true);
    // the bearings fit the shaft, the magnets sit inside the bore with a thin air gap, the rotor is shorter than nothing it should not be
    expect(GD.bearing.outerRadius).toBeGreaterThan(GENERATOR.shaftRadius);
    expect(GD.gap).toBeLessThan(0.005);
    expect(GD.rotor.stack).toBeLessThanOrEqual(GD.stator.stack);
  });

  it('the powerroom: the devices, the board, the room and the rod are those of dims.ts, the three moved pieces keep the sizes they had on the screw', () => {
    const box = (size: readonly number[]) => size.map((x) => nEn(x * 1000)).join(' × ');
    has('dc-breaker', box(POWERROOM.breaker.size));
    has('fuse-box', box(POWERROOM.fuseBox.size));
    has('dump-load', box(POWERROOM.dumpLoad.size));
    has('inverter', box(POWERROOM.inverter.size));
    has('energy-meter', box(POWERROOM.meter.size));
    has(
      'switchboard',
      `${mStr(2 * POWERROOM.board.halfWidth)} × ${mStr(POWERROOM.board.y1 - POWERROOM.board.y0)} m`,
      `${mStr(POWERROOM.width)} × ${mStr(POWERROOM.depth)} m`,
    );
    has('earthing', mStr(POWERROOM.rod.length), mmStr(2 * POWERROOM.rod.radius));
    // the wall is read in the order the current goes, from the cable of the generator on the left
    const xs = [
      POWERROOM.breaker.x,
      POWERROOM.fuseBox.x,
      POWERROOM.rectifier.x,
      POWERROOM.controller.x,
      POWERROOM.battery.x,
      POWERROOM.dumpLoad.x,
      POWERROOM.inverter.x,
      POWERROOM.meter.x,
    ];
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    // the room is the powerhouse of the site, less its walls
    expect(POWERROOM.width).toBeCloseTo(SITE.powerhouse.length - 2 * POWERROOM.wall, 6);
    expect(POWERROOM.depth).toBeCloseTo(SITE.powerhouse.width - 2 * POWERROOM.wall, 6);
  });

  it('the screw is generic: its sheets say that the video gives no dimension, once and where it matters', () => {
    expect(LAB_STRINGS.noticeGeneric![1]).toMatch(/no diameter, no length, no efficiency/);
    expect(textOf('screw-core')).toMatch(/published rule/);
    expect(textOf('trough')).toMatch(/published rule/);
  });
});
