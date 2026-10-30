import { describe, expect, it } from 'vitest';
import { DemoSim, TAU } from './engine';

// A lab's physics is checked against the figures of its source video. Here: the spin-up law.

function run(sim: DemoSim, seconds: number): void {
  for (let t = 0; t < seconds; t += 0.05) sim.step(0.05);
}

describe('DemoSim', () => {
  it('reaches 63 % of the target after one time constant', () => {
    const sim = new DemoSim();
    run(sim, TAU);
    expect(sim.state.rpm / sim.params.targetRpm).toBeCloseTo(1 - Math.exp(-1), 2);
  });

  it('settles on the target speed', () => {
    const sim = new DemoSim();
    sim.set({ targetRpm: 120 });
    run(sim, 10 * TAU);
    expect(sim.state.rpm).toBeCloseTo(120, 1);
  });

  it('does nothing while paused', () => {
    const sim = new DemoSim();
    sim.set({ running: false });
    run(sim, 5);
    expect(sim.state.rpm).toBe(0);
  });
});
