import { clamp, damp } from '@onigam/lab-kit/three';
import type { MillState } from '../../sim/types';
import { CANAL_SPEED_MS, DESIGN, SITE, WATER_FX } from '../dims';
import { smoothstep } from '../common';

// What the water shows, as functions of the simulation's state. Each one says whether it is PHYSICAL (a number of the model or of the site, a
// law of hydraulics) or DECORATIVE (a bounded mapping of a physical number onto a picture: the direction is right, the amount is a choice);
// `docs/water.md` has the table. Pure functions of numbers, so they are tested without a renderer.

/** Width of the crest the flow goes over, m: the river from the north bank to the fish pass, less the notch. physical (SITE). */
export const FREE_CREST = SITE.fishPass.z - SITE.river.zNorth - SITE.notch.width;

/** Head over the crest for a flow over the weir, m: Q = C w H^(3/2) inverted. physical: the law of `docs/3d.md`, the same as `weirHead` of the site scene. */
export const headOver = (q: number): number => Math.pow(Math.max(0, q) / (SITE.weirCoeff * FREE_CREST), 2 / 3);

/** Unit discharge over the weir, m²/s. physical: the flow that goes by (`bypassFlow`) over the width of the free crest. */
export const unitDischarge = (bypassFlow: number): number => Math.max(0, bypassFlow) / FREE_CREST;

/** Speed of the streaks of the river, m/s. decorative: 0.3 + 1.1 √Q of the first version (the real mean speed of a wide pond is a few centimetres a second, which does not read). */
export const riverSpeed = (riverFlow: number): number => 0.3 + 1.1 * Math.sqrt(Math.max(0, riverFlow));

/** Speed of the water of the canal, m/s. physical: the simulation's own assumption (0.8 m/s at the design flow) scaled with the flow the machine takes. */
export const canalSpeed = (flow: number): number => CANAL_SPEED_MS * clamp(flow / DESIGN.flow, 0, 1.6);

/** How murky the river is, 0 .. 1: the silt of a high river. decorative: the rise of the tailwater (physical: the stage of the river) and the flood stop. */
export function murkOf(s: Pick<MillState, 'tailRise' | 'stopped'>): number {
  const stage = smoothstep(0.25, 1.3, s.tailRise);
  return s.stopped === 'flood' ? Math.max(0.85, stage) : stage;
}

/** How low the river is, 0 .. 1: the share of its flow that is not reserved is small. decorative: the picture is clearer and the bed shows more. */
export function lowWaterOf(s: Pick<MillState, 'usableFlow' | 'riverFlow' | 'stopped'>): number {
  const share = s.riverFlow > 1e-6 ? s.usableFlow / s.riverFlow : 0;
  const low = 1 - smoothstep(0.05, 0.6, share);
  return s.stopped === 'lowWater' ? Math.max(0.9, low) : low;
}

/** Slope scale of the ripples of the river: calm at low water, the design scale on a normal day, rough in a flood. decorative. */
export function rippleOf(murk: number, speed: number): number {
  const r = WATER_FX.ripple;
  const base = r.quiet + (r.river - r.quiet) * clamp(speed / 1.1, 0, 1);
  return base + (r.flood - r.river) * murk;
}

/** Amplitude of the standing waves below the weir, m, for a unit discharge. decorative: grows with q, capped. */
export function waveAmplitude(q: number): number {
  const w = WATER_FX.waves;
  const k = clamp(q / WATER_FX.foam.toeFullQ, 0, 1);
  return w.amplitude * k + (w.amplitudeMax - w.amplitude) * clamp((q - WATER_FX.foam.toeFullQ) / 0.5, 0, 1) * k;
}

/** Gain of the foam at the toe of the weir, 0 .. 1.1, from the unit discharge. decorative. */
export const toeFoam = (q: number): number => 1.1 * smoothstep(0.004, WATER_FX.foam.toeFullQ, q);

/** A first-order follower for a look value: moves towards `to` with a time constant (damp, so it does not depend on the frame rate). */
export const follow = (cur: number, to: number, dt: number, lambda = 1.6): number =>
  damp(cur, to, lambda, Math.min(dt, 0.1));
