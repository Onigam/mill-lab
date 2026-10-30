import { COLORS, Drawing, W, type DrawingSheet } from '@onigam/lab-kit/drawings';
import { l } from '@onigam/lab-kit/i18n';
import { D } from '../../three/device';

// One A3 sheet drawn from the same dimensions as the 3D model (src/three/device.ts `D`), in millimetres,
// model Y pointing up. A real lab has several: general arrangement, sections, diagrams, bill of materials.

const mm = (m: number) => Math.round(m * 1000);

export const generalArrangement: DrawingSheet = {
  id: 'general-arrangement',
  number: 'PL-D01',
  group: 'device',
  title: l('Plan d’ensemble', 'General arrangement'),
  description: l(
    'Vue de face du dispositif : socle, axe et volant, avec les cotes principales.',
    'Front view of the device: base, axle and wheel, with the main dimensions.',
  ),
  scene: 'device',
  parts: ['base', 'axle', 'wheel'],
  render() {
    const d = new Drawing();
    d.frame({
      title: l('Dispositif — plan d’ensemble', 'Device — general arrangement'),
      subtitle: l('Vue de face', 'Front view'),
      number: 'PL-D01',
      scale: '1:2.5',
    });
    const v = d.view(170, 232, 0.4);
    const cy = mm(D.baseH + D.axisY);
    v.rect([-mm(D.baseW) / 2, 0], [mm(D.baseW) / 2, mm(D.baseH)], { w: W.thick, fill: COLORS.paper });
    v.circle([0, cy], mm(D.wheelR), { w: W.thick });
    v.circle([0, cy], mm(D.axleR), { w: W.medium });
    v.center([-mm(D.wheelR) - 20, cy], [mm(D.wheelR) + 20, cy]);
    v.dim([-mm(D.baseW) / 2, 0], [mm(D.baseW) / 2, 0], -14, { dir: 'h' });
    v.dim([mm(D.baseW) / 2, 0], [mm(D.baseW) / 2, cy], 18, { dir: 'v' });
    v.dimDiameter([0, cy], mm(D.wheelR), 40, { label: `Ø${2 * mm(D.wheelR)}` });
    return d;
  },
};
