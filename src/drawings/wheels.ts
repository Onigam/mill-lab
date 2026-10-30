// Outlines of the wheels of the drive and of the chain and belt that go round them, for the view along the axis of PL-03. Model
// millimetres, Y up; every radius comes from src/three/dims.ts through the caller. The chain and the belt are the closed outlines of
// the 3D (`src/three/screw/drive.ts`): two straight runs tangent to both wheels and an arc round each.
import type { Pt } from '@onigam/lab-kit/drawings';

const TAU = 2 * Math.PI;

/** A toothed wheel: `teeth` teeth round a pitch circle of radius `rPitch`, tooth height about 0.6 of the pitch of the chain. */
export function sprocketOutline(c: Pt, teeth: number, rPitch: number, chainPitch: number): Pt[] {
  const out: Pt[] = [];
  const tip = rPitch + 0.3 * chainPitch;
  const root = rPitch - 0.35 * chainPitch;
  const step = TAU / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [da, r] of [
      [0.0, root],
      [0.2, tip],
      [0.55, tip],
      [0.75, root],
    ] as const)
      out.push([c[0] + r * Math.cos(a + da * step), c[1] + r * Math.sin(a + da * step)]);
  }
  return out;
}

/** Points of a circle of radius `r` about `c` from angle `a0` to `a1` (radians, counter-clockwise), `n` steps. */
export function arcPoints(c: Pt, r: number, a0: number, a1: number, n = 24): Pt[] {
  return Array.from({ length: n + 1 }, (_, i): Pt => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  });
}

/**
 * The closed outline of a chain or a belt round two wheels (c1, r1) and (c2, r2): the two outer tangents and the arc of each wheel on the
 * side away from the other. Returns the polygon and the two tangent segments (upper and lower run).
 */
export function bandOutline(c1: Pt, r1: number, c2: Pt, r2: number): { outline: Pt[]; runs: [Pt, Pt][] } {
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const dist = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);
  const alpha = Math.acos((r1 - r2) / dist);
  const n = (a: number): Pt => [Math.cos(a), Math.sin(a)];
  const at = (c: Pt, r: number, a: number): Pt => [c[0] + r * n(a)[0], c[1] + r * n(a)[1]];
  const upper: [Pt, Pt] = [at(c1, r1, phi + alpha), at(c2, r2, phi + alpha)];
  const lower: [Pt, Pt] = [at(c1, r1, phi - alpha), at(c2, r2, phi - alpha)];
  // round wheel 2 from phi + alpha down to phi - alpha (through phi, the side away from wheel 1), then back along the lower run,
  // then round wheel 1 from phi - alpha down to phi + alpha - 2 pi (through phi + pi)
  const outline: Pt[] = [
    ...arcPoints(c2, r2, phi + alpha, phi - alpha),
    ...arcPoints(c1, r1, phi - alpha, phi + alpha - TAU),
  ];
  return { outline, runs: [upper, lower] };
}
