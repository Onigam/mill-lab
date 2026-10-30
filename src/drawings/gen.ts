// The generator in its own frame, as the 3D world of the generator places it (src/three/generator/geometry.ts, parts.ts), without importing three.js:
// the drawings stay out of the 3D chunk. The same formulas, the same constants of dims.ts (`GENERATOR`, `GENERATOR_DESIGN`); drawings.test.ts compares every
// radius, the stack, the tooth angles and the outline of the lamination with the 3D, so that a change there cannot go unnoticed.
//
// Frame of the machine: x along the shaft, the front face of the body at x = 0 (the pulley side, the shaft stub goes to x < 0), the axis through the origin,
// metres. Angles ψ are measured from the top of the machine towards +z. The section ACROSS the axis is drawn as it is seen from the pulley side, looking
// along +x: the screen is (z, y), so a point at radius r and angle ψ is (r sin ψ, r cos ψ) and ψ grows clockwise, the sense the rotor turns in (PL-03).
import type { Pt } from '@onigam/lab-kit/drawings';
import { GENERATOR, GENERATOR_DESIGN as D } from '../three/dims';

export const TAU = 2 * Math.PI;
/** Outer radius of the frame, length of the body, thickness of an end bell, m. */
export const R = GENERATOR.bodyRadius;
export const LEN = GENERATOR.bodyLength;
export const BELL = GENERATOR.bell;
/** The stack of the stator and the rotor along x, m. */
export const STACK = { x0: (LEN - D.stator.stack) / 2, x1: (LEN + D.stator.stack) / 2 };
/** Radii of the active part, m: the slot bottom, the face of the magnets, the back of the magnets (the rotor core). */
export const R_SLOT = D.stator.outerRadius - D.stator.yoke;
export const R_MAGNET = D.stator.boreRadius - D.gap;
export const R_CORE = R_MAGNET - D.rotor.magnetThickness;
/** Pitch of the teeth and of the poles, rad. */
export const SLOT_PITCH = TAU / D.slots;
export const POLE_PITCH = TAU / D.poles;
/** Angle of tooth k: the slots are centred on ψ = 0, so the plane through the axis cuts a slot at the top and at the bottom. */
export const toothAngle = (k: number): number => (k + 0.5) * SLOT_PITCH;
/** The phase (0 = A, 1 = B, 2 = C) of the coil on tooth k: with 24 slots and 16 poles the teeth are 120 electrical degrees apart. */
export const toothPhase = (k: number): number => k % D.phases;
export const PHASE_NAMES = ['A', 'B', 'C'] as const;

/** The shaft ends this far behind the body (src/three/generator/geometry.ts `SHAFT_BACK`): a choice of the drawing, the test compares it with the 3D. */
export const SHAFT_BACK_EXTRA = 0.03;
export const SHAFT_FRONT = -GENERATOR.stub;
export const SHAFT_BACK = LEN + SHAFT_BACK_EXTRA;
/** The base plate under the tube: it overlaps the tube by 2 mm (geometry.ts `FOOT_TOP`, `FOOT_BOTTOM`); half its width is 0.78 R + half the foot (parts.ts). */
export const FOOT_TOP = -R + 0.002;
export const FOOT_BOTTOM = -R - GENERATOR.foot[1] + 0.002;
export const FOOT_HALF_WIDTH = R * 0.78 + GENERATOR.foot[0] / 2;

/** A point at radius r (m) and angle ψ (rad), as the screen sees the section across the axis. */
export const polar = (r: number, psi: number): Pt => [r * Math.sin(psi), r * Math.cos(psi)];

/** A point (u along the tooth, v across it towards the next tooth) of the tooth at angle ψ, in the same screen frame. */
export const toothPoint = (u: number, v: number, psi: number): Pt => [
  u * Math.sin(psi) + v * Math.cos(psi),
  u * Math.cos(psi) - v * Math.sin(psi),
];

/** The hole of the lamination, the star of the slots and of the bore, tooth after tooth (the points of src/three/generator/geometry.ts `statorShape`). */
export function laminationHole(): Pt[] {
  const S = D.stator;
  const hs = S.stem / 2;
  const ua = S.boreRadius + S.shoe;
  const us = ua + S.slope;
  const phiTip = Math.asin(S.tipHalfWidth / S.boreRadius);
  const phiBottom = Math.asin(hs / R_SLOT);
  const ub = Math.sqrt(R_SLOT * R_SLOT - hs * hs);
  const pts: Pt[] = [];
  for (let k = 0; k < D.slots; k++) {
    const psi = toothAngle(k);
    const T = (u: number, v: number): number => pts.push(toothPoint(u, v, psi));
    T(ub, -hs);
    T(us, -hs);
    T(ua, -S.tipHalfWidth);
    for (let i = 0; i <= 4; i++) {
      const a = -phiTip + (2 * phiTip * i) / 4;
      T(S.boreRadius * Math.cos(a), S.boreRadius * Math.sin(a));
    }
    T(ua, S.tipHalfWidth);
    T(us, hs);
    T(ub, hs);
    const a0 = psi + phiBottom;
    const a1 = toothAngle(k + 1) - phiBottom;
    for (let i = 1; i <= 3; i++) pts.push(polar(R_SLOT, a0 + ((a1 - a0) * i) / 4));
  }
  return pts;
}

/** The side of a coil in the slot, on the +v (sign 1) or -v side of its tooth, for the tooth at ψ: a quadrilateral across the axis. */
export function coilSidePoly(sign: 1 | -1, psi: number): Pt[] {
  const C = D.coil;
  const v0 = D.stator.stem / 2 + C.insulation;
  const v1 = v0 + C.build;
  const p = (u: number, v: number): Pt => toothPoint(u, sign * v, psi);
  return [p(C.from, v0), p(C.to, v0), p(C.to, v1), p(C.from, v1)];
}

/** An annular sector between two radii and two angles (rad), as a closed polygon. */
export function sector(r0: number, r1: number, a0: number, a1: number, n = 8): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) out.push(polar(r1, a0 + ((a1 - a0) * i) / n));
  for (let i = n; i >= 0; i--) out.push(polar(r0, a0 + ((a1 - a0) * i) / n));
  return out;
}

/** The outline of magnet k (centred on ψ = k × pole pitch, `magnetArc` of the pole pitch wide, from the core to the gap). */
export function magnetPoly(k: number): Pt[] {
  const half = (D.rotor.magnetArc * POLE_PITCH) / 2;
  return sector(R_CORE, R_MAGNET, k * POLE_PITCH - half, k * POLE_PITCH + half, 6);
}

/** Electrical degrees between the coils of two neighbouring teeth: the slot pitch times the pole pairs. */
export const toothElectricalDeg = (): number => ((SLOT_PITCH * (D.poles / 2)) / TAU) * 360;
