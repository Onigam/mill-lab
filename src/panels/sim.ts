import { fill, h, slider, type AppContext, type PanelController } from '@onigam/lab-kit/ui';
import { t } from '../i18n/ui';
import type { DemoSim } from '../sim/engine';

// The simulation side panel: controls on the left of the kit's frame, owned by the lab. Use the kit's
// widgets (slider, select, toggle, section) and charts so every lab's panel looks the same.

export class SimPanel implements PanelController {
  readonly el = h('div', { class: 'sim' });

  constructor(private ctx: AppContext<DemoSim>) {}

  render(): void {
    const sim = this.ctx.sim;
    fill(
      this.el,
      h('div', { class: 'eyebrow eyebrow--accent' }, t('simTitle')),
      slider(
        t('targetRpm'),
        sim.params.targetRpm,
        0,
        200,
        5,
        (v) => `${v} rpm`,
        (v) => sim.set({ targetRpm: v }),
      ),
    );
  }

  /** Called every frame while the panel is open (refresh live readouts here). */
  tick(): void {}
}
