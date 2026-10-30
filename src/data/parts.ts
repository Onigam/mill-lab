import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { D } from '../three/device';

// The parts catalogue: one entry per selectable 3D part (ids match registry.add in src/three).
// Every text is bilingual `l(fr, en)`; write both languages at the same time, same level of detail.

export const PARTS: PartInfo[] = [
  {
    id: 'base',
    scene: 'device',
    category: 'structure',
    name: l('Socle', 'Base'),
    short: l('Plaque et montants qui portent l’axe.', 'Plate and posts that carry the axle.'),
    description: l(
      'Le socle est la référence de tout l’assemblage : le niveau et l’équerrage se règlent ici avant de monter le reste.',
      'The base is the datum of the whole assembly: level and squareness are set here before anything else goes on.',
    ),
    material: l('Acier peint', 'Painted steel'),
    specs: [
      {
        label: l('Encombrement', 'Footprint'),
        value: `${D.baseW * 1000} × ${D.baseD * 1000} mm`,
      },
    ],
    tip: l('Mettez le socle de niveau avant de serrer quoi que ce soit.', 'Level the base before tightening anything.'),
  },
  {
    id: 'axle',
    scene: 'device',
    category: 'mechanical',
    name: l('Axe', 'Axle'),
    short: l('Arbre qui guide la rotation du volant.', 'Shaft that guides the wheel’s rotation.'),
    description: l(
      'L’axe est un arbre rectifié : sa rectitude fixe la qualité de la rotation et la durée de vie des paliers.',
      'The axle is a ground shaft: its straightness sets the quality of the rotation and the life of the bearings.',
    ),
    material: l('Inox 316L', '316L stainless steel'),
    specs: [{ label: l('Diamètre', 'Diameter'), value: `Ø${D.axleR * 2000} mm` }],
    maintenance: l('Graisser les paliers une fois par an.', 'Grease the bearings once a year.'),
    design: l(
      'Un axe rectifié se monte sans réglage : les paliers se centrent d’eux-mêmes.',
      'A ground axle fits without adjustment: the bearings centre themselves.',
    ),
  },
  {
    id: 'wheel',
    scene: 'device',
    category: 'mechanical',
    name: l('Volant', 'Wheel'),
    short: l('Disque qui stocke l’énergie de rotation.', 'Disc that stores rotational energy.'),
    description: l(
      'Le volant lisse les variations de vitesse en stockant de l’énergie cinétique : plus sa masse est loin de l’axe, plus il stocke.',
      'The wheel smooths speed variations by storing kinetic energy: the further its mass from the axis, the more it stores.',
    ),
    material: l('Aluminium', 'Aluminium'),
    specs: [
      { label: l('Diamètre', 'Diameter'), value: `Ø${D.wheelR * 2000} mm` },
      { label: l('Épaisseur', 'Thickness'), value: `${D.wheelT * 1000} mm` },
    ],
  },
];
