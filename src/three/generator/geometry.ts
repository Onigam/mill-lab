import * as THREE from 'three';
import { GENERATOR, GENERATOR_DESIGN } from '../dims';
import { TAU } from '../common';

// The shapes of the machine, in the frame of the `generator` world (dims.ts, GENERATOR_DESIGN): X along the shaft, the front face of the body at x = 0, Y up, Z towards
// the viewer, angles ψ from +Y towards +Z. Everything laminated or wound is a 2D shape in the plane across the axis, extruded along X: the same shape is the cap of the section
// across the axis, and the plane through the axis cuts it in rectangles (`SECTION`, below).

export const D = GENERATOR_DESIGN;
export const G = GENERATOR;
/** Outer radius of the frame, length of the body, m (the blue machine of the `screw` and `site` worlds). */
export const R = G.bodyRadius;
export const LEN = G.bodyLength;
/** The stack of the stator and the rotor, m along x: from, to, middle. */
export const STACK = { x0: (LEN - D.stator.stack) / 2, x1: (LEN + D.stator.stack) / 2, mid: LEN / 2 };
/** Radii of the active part, m: the slot bottom, the magnet face, the back of the magnets (the rotor core). */
export const R_SLOT = D.stator.outerRadius - D.stator.yoke;
export const R_MAGNET = D.stator.boreRadius - D.gap;
export const R_CORE = R_MAGNET - D.rotor.magnetThickness;
/** The pitch of the teeth and of the poles, rad. */
export const SLOT_PITCH = TAU / D.slots;
export const POLE_PITCH = TAU / D.poles;
/** Angle of tooth k: the slots are centred on ψ = 0 (the top), so the plane through the axis cuts a slot at the top and at the bottom. */
export const toothAngle = (k: number): number => (k + 0.5) * SLOT_PITCH;
/** The phase (0 = A, 1 = B, 2 = C) of the coil on tooth k: with 24 slots and 16 poles the teeth are 120 electrical degrees apart, so A, B, C follow each other round the stator. */
export const toothPhase = (k: number): number => k % D.phases;

/** A point at radius r and angle ψ, in shape coordinates (sx, sy) = (-z, y): a shape extruded by `extrudeX` is then drawn at the same ψ in the world. */
export const pol = (r: number, psi: number): [number, number] => [-r * Math.sin(psi), r * Math.cos(psi)];
/** A point (u along the tooth, v across it) of the tooth at angle ψ, in shape coordinates. */
export const toothPoint = (u: number, v: number, psi: number): [number, number] => {
  const y = u * Math.cos(psi) - v * Math.sin(psi);
  const z = u * Math.sin(psi) + v * Math.cos(psi);
  return [-z, y];
};

/** A shape extruded along +X from x0 to x1 (its plane is across the axis, shape coordinates (sx, sy) = (-z, y)). */
export function extrudeX(shape: THREE.Shape, x0: number, x1: number, segments = 24): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false, curveSegments: segments });
  g.rotateY(Math.PI / 2); // (sx, sy, d) -> (d, sy, -sx)
  g.translate(x0, 0, 0);
  return g;
}

/** The cap of a section across the axis: the shape drawn in the plane x = 0 (facing +x), to be placed at the plane of the section. */
export function capAcross(shapes: THREE.Shape | THREE.Shape[]): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(shapes, 24);
  g.rotateY(Math.PI / 2); // (sx, sy, 0) -> (0, sy, -sx)
  return g;
}

export const discShape = (r: number, holeR = 0): THREE.Shape => {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, TAU, false);
  if (holeR > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, holeR, 0, TAU, true);
    s.holes.push(h);
  }
  return s;
};

/** A closed polygon as a shape. */
export const polyShape = (pts: [number, number][]): THREE.Shape =>
  new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));

// ------------------------------------------------------------------------------------------------ the stator core

/**
 * The lamination: a disc of the outer radius with the star of the slots cut out of it, teeth centred on ψ_k. A tooth is a parallel-sided stem with a shoe at the bore; the slots
 * open to the air gap through a narrow mouth. Counterclockwise in ψ, so the points follow the shape of the machine, tooth after tooth.
 */
export function statorShape(): THREE.Shape {
  const S = D.stator;
  const shape = discShape(S.outerRadius);
  const hs = S.stem / 2;
  const ua = S.boreRadius + S.shoe;
  const us = ua + S.slope;
  const phiTip = Math.asin(S.tipHalfWidth / S.boreRadius);
  const phiBottom = Math.asin(hs / R_SLOT);
  const ub = Math.sqrt(R_SLOT * R_SLOT - hs * hs);
  const pts: [number, number][] = [];
  for (let k = 0; k < D.slots; k++) {
    const psi = toothAngle(k);
    const T = (u: number, v: number) => pts.push(toothPoint(u, v, psi));
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
    // the bottom of the slot, an arc at R_SLOT to the next tooth
    const a0 = psi + phiBottom;
    const a1 = toothAngle(k + 1) - phiBottom;
    for (let i = 1; i <= 3; i++) pts.push(pol(R_SLOT, a0 + ((a1 - a0) * i) / 4));
  }
  const hole = new THREE.Path(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

// ------------------------------------------------------------------------------------------------ coils and magnets (built at ψ = 0, then turned by `rotation.x`)

/** The side of a coil in the slot, on the +v or -v side of its tooth, as a prism along x (tooth at ψ = 0, so u is y and v is z). */
export function coilSide(sign: 1 | -1, x0: number, x1: number): THREE.BufferGeometry {
  const C = D.coil;
  const v0 = D.stator.stem / 2 + C.insulation;
  const v1 = v0 + C.build;
  const p = (u: number, v: number): [number, number] => toothPoint(u, sign * v, 0);
  return extrudeX(polyShape([p(C.from, v0), p(C.to, v0), p(C.to, v1), p(C.from, v1)]), x0, x1);
}

/** The end turn of a coil, over the tooth: one block across both sides, beyond the stack. */
export function coilEnd(x0: number, x1: number): THREE.BufferGeometry {
  const C = D.coil;
  const v1 = D.stator.stem / 2 + C.insulation + C.build;
  const p = (u: number, v: number): [number, number] => toothPoint(u, v, 0);
  return extrudeX(polyShape([p(C.from, -v1), p(C.to, -v1), p(C.to, v1), p(C.from, v1)]), x0, x1);
}

/** The section of a coil side in the slot (for the section across the axis), tooth at ψ = k's angle. */
export function coilSidePoly(sign: 1 | -1, psi: number): [number, number][] {
  const C = D.coil;
  const v0 = D.stator.stem / 2 + C.insulation;
  const v1 = v0 + C.build;
  const p = (u: number, v: number) => toothPoint(u, sign * v, psi);
  return [p(C.from, v0), p(C.to, v0), p(C.to, v1), p(C.from, v1)];
}

/** One magnet: an arc of the face between the core and the gap, `magnetArc` of the pole pitch wide, at ψ = 0. */
export function magnetShape(): THREE.Shape {
  const half = (D.rotor.magnetArc * POLE_PITCH) / 2;
  const pts: [number, number][] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) pts.push(pol(R_MAGNET, -half + (2 * half * i) / n));
  for (let i = n; i >= 0; i--) pts.push(pol(R_CORE, -half + (2 * half * i) / n));
  return polyShape(pts);
}

// ------------------------------------------------------------------------------------------------ the section through the axis

/** An axis-aligned rectangle of the plane through the axis, as x0, x1, y0, y1 (the top half; the bottom half is its mirror image). */
export type Rect = [number, number, number, number];
/** A rectangle and its mirror image under the axis. */
export const both = (r: Rect): Rect[] => [r, [r[0], r[1], -r[3], -r[2]]];

/** The shaft's end beyond the body, front (the stub, x < 0) and back, m. */
export const SHAFT_FRONT = -G.stub;
export const SHAFT_BACK = LEN + 0.03;

/** Position of the foot plate under the body: top, bottom (y), m. */
export const FOOT_TOP = -R + 0.002;
export const FOOT_BOTTOM = -R - G.foot[1] + 0.002;
