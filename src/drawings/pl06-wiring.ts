import { COLORS, Drawing, INK_2, W, type DrawingSheet } from '@onigam/lab-kit/drawings';
import { l, type L } from '@onigam/lab-kit/i18n';
import { PARTS } from '../data/parts';
import { partIds } from '../part-ids';
import { BUS_VOLTS } from '../sim/machine';
import { EDU_NOTE_ROOM, FILL, PAPER, RED, box, grid, heading, marksLegend, modelTag } from './draw';
import { cat, figLab, lab } from './geom';
import { drivePoint } from './model';
import {
  battery,
  breaker,
  dot,
  earth,
  fuse,
  fuseV,
  house,
  machine,
  meter,
  rectifier,
  resistor,
  surge,
  switchV,
  threeWires,
  wire,
} from './symbols';

const NUMBER = 'PL-06';
const TITLE = l('Le local technique : le schéma de câblage', 'The powerhouse: the wiring diagram');

/** The parts of the `powerroom` world, in the order the current goes (the same numbers as PL-05). */
export const ITEMS = partIds('powerroom');
const n = (id: string): number => ITEMS.indexOf(id) + 1;
const partOf = (id: string) => PARTS.find((p) => p.id === id)!;

/** The colours of the links: three-phase, direct current, alternating current of the house, earth. */
const C3 = COLORS.acL;
const CDC = COLORS.dcPos;
const CAC = COLORS.acN;
const CPE = COLORS.pe;

/** Where the diagram stands on the sheet (paper mm): the main line, the box of the building, the earth line. */
export const LAYOUT = { main: 60, boxX0: 62, boxX1: 396, boxY0: 27, boxY1: 150, earthY: 136 } as const;

// ------------------------------------------------------------------------------------------------ the diagram

function diagram(d: Drawing): void {
  const p = d.paper();
  const dp = drivePoint();
  const Y = LAYOUT.main;
  const red = (x: number, y: number, t: L, o: { anchor?: 'start' | 'middle' | 'end'; bold?: boolean } = {}): void => {
    p.text([x, y], t, {
      size: 1.7,
      color: RED,
      anchor: o.anchor ?? 'start',
      mono: true,
      weight: o.bold ? 'bold' : 'normal',
      baseline: 'middle',
    });
  };
  const label = (
    x: number,
    y: number,
    t: L,
    o: { anchor?: 'start' | 'middle' | 'end'; bold?: boolean; color?: string; size?: number } = {},
  ): void => {
    p.text([x, y], t, {
      size: o.size ?? 2,
      anchor: o.anchor ?? 'start',
      weight: o.bold ? 'bold' : 'normal',
      color: o.color,
      baseline: 'middle',
    });
  };
  const bl = (id: string, x: number, y: number): void => {
    p.circle([x, y], 3.2, { w: W.thin, fill: PAPER });
    p.text([x, y], String(n(id)), { size: 2.5, weight: 'bold', anchor: 'middle', baseline: 'middle' });
  };

  // ---- the building, the board that carries the devices
  p.rect([LAYOUT.boxX0, LAYOUT.boxY0], [LAYOUT.boxX1, LAYOUT.boxY1], { w: W.medium, color: INK_2, dash: 'phantom' });
  label(LAYOUT.boxX0 + 2, LAYOUT.boxY0 + 3, l('LOCAL TECHNIQUE · PL-05', 'POWERHOUSE · PL-05'), {
    bold: true,
    color: INK_2,
    size: 1.9,
  });
  p.rect([78, 35], [372, 144], { w: W.thin, color: INK_2, fill: '#eef0f2' });
  bl('switchboard', 364, 41);

  // ---- the generator, outside, and the cable that crosses the wall
  machine(p, 34, Y, 9, 'G', '3~');
  label(34, Y + 13, l('génératrice', 'generator'), { anchor: 'middle', bold: true });
  red(34, Y + 19, lab(dp.generator.rpm, 0, null, '', l(' tr/min', ' rpm')), { anchor: 'middle', bold: true });
  red(34, Y + 23.5, lab(dp.generator.torque, 0, null, '', ' N·m'), { anchor: 'middle', bold: true });
  wire(p, [43, Y], [84, Y], C3);
  threeWires(p, 52, Y, false, C3);
  threeWires(p, 70, Y, false, C3);
  p.circle([LAYOUT.boxX0, Y], 1.6, { w: W.thin, fill: PAPER, color: C3 });
  label(34, Y + 28, cat(figLab('genLineV', '', ' V'), l(' entre phases', ' between phases')), {
    anchor: 'middle',
    size: 1.75,
  });
  label(34, Y + 32, cat(figLab('genPhaseA', '', ' A'), l(' par phase', ' per phase')), {
    anchor: 'middle',
    size: 1.75,
  });

  // ---- 1 the breaker, 2 the fuses, 3 the rectifier, 4 the charge controller
  breaker(p, 84, 100, Y, C3);
  bl('dc-breaker', 92, 41);
  wire(p, [92, 47], [92, Y - 6.5], INK_2, W.thin);
  label(92, Y + 11, partOf('dc-breaker').name, { anchor: 'middle', bold: true, size: 1.9 });
  label(92, Y + 15, figLab('breakerA', '', ' A'), { anchor: 'middle' });
  wire(p, [100, Y], [109, Y], C3);
  threeWires(p, 105, Y, false, C3);
  fuse(p, 112, 128, Y, C3);
  bl('fuse-box', 120, 41);
  wire(p, [120, 47], [120, Y - 2.6], INK_2, W.thin);
  label(120, Y + 11, partOf('fuse-box').name, { anchor: 'middle', bold: true, size: 1.9 });
  label(120, Y + 15, figLab('fuseA', '', ' A'), { anchor: 'middle' });
  wire(p, [131, Y], [142, Y], C3);
  threeWires(p, 136, Y, false, C3);
  rectifier(p, 142, 172, Y);
  bl('rectifier', 157, 41);
  wire(p, [157, 47], [157, Y - 9], INK_2, W.thin);
  label(157, Y + 15, partOf('rectifier').name, { anchor: 'middle', bold: true, size: 1.9 });
  wire(p, [172, Y], [188, Y], CDC);
  red(180, Y - 4.5, lab(dp.voc, 1, null, '', ' V'), { anchor: 'middle', bold: true });
  red(180, Y + 4.5, lab(dp.current, 0, null, '', ' A'), { anchor: 'middle', bold: true });
  p.rect([188, Y - 9], [228, Y + 9], { w: W.medium, fill: PAPER });
  label(208, Y - 2, l('régulateur', 'charge'), { anchor: 'middle', bold: true, size: 1.9 });
  label(208, Y + 2.5, l('de charge', 'controller'), { anchor: 'middle', bold: true, size: 1.9 });
  bl('charge-controller', 208, 41);
  wire(p, [208, 47], [208, Y - 9], INK_2, W.thin);

  // ---- the direct-current bus of the bank: the battery, the inverter, the surge arrester; and the dump load that the controller feeds
  wire(p, [228, Y], [336, Y], CDC);
  const xBat = 262;
  const xDump = 208;
  const xInv = 336;
  const xSpd = 247;
  // the battery
  wire(p, [xBat, Y], [xBat, 78], CDC);
  dot(p, xBat, Y, CDC);
  battery(p, xBat, 78, CDC);
  bl('battery', xBat + 15, 82);
  label(xBat + 21, 79, partOf('battery').name, { bold: true, size: 1.9 });
  label(xBat + 21, 83, cat(lab(BUS_VOLTS, 0, 'E', '', ' V'), ' · ', figLab('batCableMm2', '', ' mm²')));
  red(xBat + 21, 87.5, cat(lab(dp.electric / 1000, 2, null, '', ' kW')), { bold: true });
  // the dump load, under the controller
  wire(p, [xDump, Y + 9], [xDump, 78], CDC);
  switchV(p, xDump, 78, CDC);
  resistor(p, xDump, 90, CDC);
  bl('dump-load', xDump - 9, 96);
  p.text([xDump - 14, 92], l('Charge de', 'Dump'), { size: 1.9, weight: 'bold', baseline: 'middle', anchor: 'end' });
  p.text([xDump - 14, 95.8], l('délestage', 'load'), { size: 1.9, weight: 'bold', baseline: 'middle', anchor: 'end' });
  label(xDump - 14, 100, figLab('dumpOhm', '', ' Ω'), { anchor: 'end' });
  label(xDump - 14, 104, l('non simulée', 'not simulated'), { color: INK_2, size: 1.75, anchor: 'end' });
  // the inverter
  wire(p, [xInv, Y], [xInv, 78], CDC);
  dot(p, xInv, Y, CDC);
  p.rect([xInv - 20, 78], [xInv + 20, 98], { w: W.medium, fill: PAPER });
  p.line([xInv - 20, 98], [xInv + 20, 78], { w: W.thin });
  p.text([xInv - 14, 83], '=', { size: 3.2, weight: 'bold', anchor: 'middle', baseline: 'middle' });
  p.text([xInv + 14, 93], '~', { size: 3.2, weight: 'bold', anchor: 'middle', baseline: 'middle' });
  bl('inverter', xInv - 26, 88);
  label(xInv + 23, 83, partOf('inverter').name, { bold: true, size: 1.9 });
  label(xInv + 23, 87, figLab('invKw', '', ' kW'));
  label(xInv + 23, 91, cat(figLab('invA', '', ' A'), l(' côté batterie', ' battery side')), { size: 1.75 });
  label(xInv + 23, 95, l('non simulé', 'not simulated'), { color: INK_2, size: 1.75 });
  // the supply to the house: the meter, then out of the building
  wire(p, [xInv, 98], [xInv, 108], CAC);
  meter(p, xInv, 114, 6, 'kWh');
  bl('energy-meter', xInv + 14, 114);
  label(xInv + 19, 114, partOf('energy-meter').name, { bold: true, size: 1.9 });
  wire(p, [xInv, 120], [xInv, 156], CAC);
  house(p, xInv, 156, 24, 13, CAC);
  label(xInv, 173, l('la maison · non simulée', 'the house · not simulated'), { anchor: 'middle', color: INK_2 });

  // ---- the surge arrester from the bus to the earth
  wire(p, [xSpd, Y], [xSpd, 98], CDC);
  dot(p, xSpd, Y, CDC);
  surge(p, xSpd, 98, CDC);
  wire(p, [xSpd, 116], [xSpd, LAYOUT.earthY], CPE);

  // ---- the earthing: the earth bar and its rod, tied to the cases of the devices and to the arrester
  const E = LAYOUT.earthY;
  wire(p, [96, E], [326, E], CPE, 0.9);
  p.rect([92, E - 2], [124, E + 2], { w: W.medium, color: CPE, fill: FILL.copper });
  bl('earthing', 108, E - 7);
  wire(p, [100, E + 2], [100, LAYOUT.boxY1], CPE, 0.9);
  wire(p, [100, LAYOUT.boxY1], [100, LAYOUT.boxY1 + 4], CPE, 0.9);
  earth(p, 100, LAYOUT.boxY1 + 4, CPE);
  label(108, LAYOUT.boxY1 + 8, l('tige de terre', 'earth rod'), { color: CPE });
  for (const x of [157, 224, xBat, 322]) {
    const top = x === 157 ? Y + 9 : x === 224 ? Y + 9 : x === xBat ? 106 : 98;
    wire(p, [x, top], [x, E], CPE, W.medium, 'hidden');
    dot(p, x, E, CPE);
  }
  label(168, E - 5, l('liaison de terre', 'bonding'), { color: CPE, size: 1.75 });
  label(168, E - 1.5, figLab('earthMm2', '', ' mm²'), { color: CPE, size: 1.75 });

  // ---- the usual place of the battery's fuse, against the battery (dashed): the lab draws its fuses at the head of the wall
  fuseV(p, xBat, 67, 73, INK_2, true);
  label(
    xBat + 5,
    70,
    l('fusible de batterie, ici dans une vraie installation', 'battery fuse, here in a real installation'),
    { color: INK_2, size: 1.9 },
  );
}

// ------------------------------------------------------------------------------------------------ the legend of the lines, the tables

function legendStrip(d: Drawing): void {
  const p = d.paper();
  const rows: [string, L, 'hidden' | undefined][] = [
    [C3, l('liaison triphasée', 'three-phase link'), undefined],
    [CDC, l('courant continu', 'direct current'), undefined],
    [CAC, l('alternatif vers la maison', 'alternating, to the house'), undefined],
    [CPE, l('terre et liaisons équipotentielles', 'earth and bonding'), 'hidden'],
  ];
  let x = 14;
  for (const [color, text, dash] of rows) {
    p.line([x, 21], [x + 10, 21], { w: 0.9, color, dash });
    p.text([x + 12, 21], text, { size: 1.7, baseline: 'middle' });
    x += 22 + text.fr.length * 1.35;
  }
}

/** What the lab simulates of each item, and the rating or size the lab gives it (an estimate). */
function itemsTable(d: Drawing, x: number, y: number): number {
  const dv = (id: string): L => {
    switch (id) {
      case 'dc-breaker':
        return figLab('breakerA', '', l(' A, au-dessus du courant de service', ' A, above the current of service'));
      case 'fuse-box':
        return figLab('fuseA', '', l(' A, au-dessus du disjoncteur', ' A, above the breaker'));
      case 'rectifier':
        return cat(l('pont de six diodes, chute ', 'six-diode bridge, drop '), figLab('diodeDrop', '', ' V'));
      case 'charge-controller':
        return l('réglage non fixé', 'setting not fixed');
      case 'battery':
        return cat(
          l('banc de ', 'bank of '),
          lab(BUS_VOLTS, 0, 'E', '', ' V'),
          l(' ; capacité non fixée', ' ; capacity not fixed'),
        );
      case 'dump-load':
        return cat(figLab('dumpOhm', '', ' Ω'), l(' : avale toute la puissance', ' : swallows the whole power'));
      case 'inverter':
        return cat(
          figLab('invKw', '', ' kW'),
          ' · ',
          figLab('invA', '', l(' A côté batterie', ' A on the battery side')),
        );
      case 'energy-meter':
        return l('compte l’énergie qui part', 'counts the energy that leaves');
      case 'switchboard':
        return l('plaque, goulotte, rails', 'plate, trunking, rails');
      default:
        return cat(
          l('liaison de ', 'bonding of '),
          figLab('earthMm2', '', ' mm²'),
          l(', tige, parafoudre', ', rod, arrester'),
        );
    }
  };
  const sim = (id: string): L => {
    switch (id) {
      case 'rectifier':
        return l('oui : pont triphasé et chute des diodes', 'yes: three-phase bridge and diode drop');
      case 'battery':
        return l('en partie : un bus idéal, sans capacité', 'in part: an ideal bus, no capacity');
      case 'energy-meter':
        return l('oui : l’énergie vient du modèle', 'yes: the energy comes from the model');
      case 'dump-load':
        return l('non : le modèle n’en a pas', 'no: the model has none');
      case 'inverter':
        return l('non, ni son rendement', 'no, nor its efficiency');
      default:
        return l('non', 'no');
    }
  };
  return grid(
    d,
    x,
    y,
    [
      { label: l('Rep.', 'Item'), w: 8, align: 'middle' },
      { label: l('Désignation', 'Part'), w: 38 },
      { label: l('Calibre ou taille (estimation du labo)', 'Rating or size (the lab’s estimate)'), w: 92 },
      { label: l('Dans le modèle ?', 'In the model?'), w: 76 },
    ],
    ITEMS.map((id, i) => [{ t: String(i + 1), bold: true }, partOf(id).name, dv(id), sim(id)]),
    { size: 1.65, pad: 0.4, lineH: 2.55 },
  );
}

function modelCard(d: Drawing, x: number, y: number, w: number): number {
  const p = d.paper();
  const dp = drivePoint();
  modelTag(d, x, y, w);
  const rows: [L, L][] = [
    [l('génératrice : vitesse', 'generator: speed'), lab(dp.generator.rpm, 0, null, '', l(' tr/min', ' rpm'))],
    [l('génératrice : couple', 'generator: torque'), lab(dp.generator.torque, 0, null, '', ' N·m')],
    [l('redresseur : tension à vide', 'rectifier: open-circuit voltage'), lab(dp.voc, 1, null, '', ' V')],
    [l('courant dans la batterie', 'current into the battery'), lab(dp.current, 0, null, '', ' A')],
    [l('puissance dans la batterie', 'power into the battery'), lab(dp.electric / 1000, 2, null, '', ' kW')],
    [l('vis emballée, sans charge', 'screw racing, no load'), figLab('freeRunVolts', '', ' V')],
  ];
  const yy = y + 8.5;
  rows.forEach(([name, val], i) => {
    p.text([x + 1.5, yy + i * 4.4], name, { size: 1.65, baseline: 'middle' });
    p.text([x + w - 1.5, yy + i * 4.4], val, {
      size: 1.9,
      anchor: 'end',
      baseline: 'middle',
      mono: true,
      weight: 'bold',
      color: RED,
    });
  });
  p.rect([x, y + 5.2], [x + w, yy + rows.length * 4.4 - 1.5], { w: W.thin, color: RED });
  return yy + rows.length * 4.4 - 1.5;
}

// ------------------------------------------------------------------------------------------------ the sheet

function render(): Drawing {
  const d = new Drawing();
  d.frame({
    title: TITLE,
    subtitle: l(
      'De la génératrice à la maison : protections, redresseur, batterie, onduleur, terre · sans échelle',
      'From the generator to the house: protections, rectifier, battery, inverter, earth · not to scale',
    ),
    number: NUMBER,
    scale: '—',
  });
  heading(
    d,
    14,
    13,
    l(
      'A · SCHÉMA UNIFILAIRE · le courant dans l’ordre du mur',
      'A · SINGLE-LINE DIAGRAM · the current in the order of the wall',
    ),
    {
      size: 2.2,
    },
  );
  modelTag(d, 330, 11.5, 76);
  legendStrip(d);
  diagram(d);

  heading(
    d,
    14,
    177,
    l('REPÈRES · le local et ce que le modèle en sait', 'ITEMS · the room and what the model knows of it'),
    { size: 2 },
  );
  itemsTable(d, 14, 181);
  modelCard(d, 232 + 0, 181, 0 + 80);
  box(
    d,
    318,
    181,
    88,
    l('CE QUE LE LABO NE SIMULE PAS', 'WHAT THE LAB DOES NOT SIMULATE'),
    [
      l(
        'La charge de délestage, le régulateur, l’onduleur, la maison, la précision du compteur et les protections ne sont pas dans le modèle : sa batterie est un bus idéal, qui prend tout le courant.',
        'The dump load, the controller, the inverter, the house, the accuracy of the meter and the protections are not in the model: its battery is an ideal bus that takes any current.',
      ),
      l('Ce plan n’est pas un plan de câblage.', 'This sheet is not a wiring plan.'),
    ],
    { size: 1.6 },
  );
  marksLegend(d, 232, 222, 80, [], {
    reported: l('donnée par une source publiée', 'given by a published source'),
    derived: l('calculée à partir des résultats du modèle', 'calculated from the model results'),
    estimate: l('estimation du labo : aucune source ne la donne', 'the lab’s estimate: no source gives it'),
  });
  box(
    d,
    14,
    248,
    192,
    l('LIRE LA PLANCHE · SÉCURITÉ', 'READING THE SHEET · SAFETY'),
    [
      {
        bullet: '1',
        t: l(
          'Le labo met le disjoncteur et les fusibles en tête du mur, avant le redresseur, pour qu’on les trouve d’abord. Dans une installation réelle, le disjoncteur du côté continu et le fusible de la batterie se placent après le redresseur, tout contre la batterie (en pointillé), et la liaison alternative a son propre sectionneur.',
          'The lab puts the breaker and the fuses at the head of the wall, before the rectifier, so that they are found first. In a real installation, the direct-current breaker and the battery’s fuse go after the rectifier, right against the battery (dashed), and the alternating link has its own isolator.',
        ),
      },
      {
        bullet: '2',
        t: l(
          'Danger : une batterie peut débiter des centaines d’ampères en court-circuit, et un arc en continu ne s’éteint pas. La mise à la terre et les protections sont l’affaire d’un électricien qualifié.',
          'Danger: a battery can deliver hundreds of amperes in a short circuit, and a direct-current arc does not go out. The earthing and the protections are the work of a qualified electrician.',
        ),
      },
      { bullet: '3', t: EDU_NOTE_ROOM },
    ],
    { size: 1.6 },
  );
  return d;
}

export const powerroomWiring: DrawingSheet = {
  id: 'powerroom-wiring',
  number: NUMBER,
  group: 'powerroom',
  title: TITLE,
  description: l(
    'Le courant triphasé de la génératrice entre dans le local par un presse-étoupe, traverse le disjoncteur et les fusibles, devient continu dans le redresseur, puis passe par le régulateur de charge, qui le dirige vers la batterie et détourne le surplus vers la charge de délestage. De la batterie, l’onduleur fait de l’alternatif pour la maison, que le compteur mesure ; une tige de terre relie le tout. La tension et le courant viennent du modèle, les calibres et les sections de câble sont des estimations du labo, et la charge de délestage, l’onduleur et la maison ne sont pas simulés.',
    'The three-phase current of the generator enters the room through a gland, passes the breaker and the fuses, becomes direct current in the rectifier, then goes through the charge controller, which sends it to the battery and diverts the surplus to the dump load. From the battery, the inverter makes alternating current for the house, which the meter measures; an earth rod ties it all together. The voltage and the current come from the model, the ratings and the cable sizes are the lab’s estimates, and the dump load, the inverter and the house are not simulated.',
  ),
  scene: 'powerroom',
  parts: ITEMS,
  render,
};
