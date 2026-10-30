import * as THREE from 'three';
import { MAT, mesh } from '@onigam/lab-kit/three';
import { TAU, cylinderX, ringX, tubeGeometry } from '../common';
import { dynamic, mergeStatic } from '../merge';
import { CAP, type QuarterCut, type Unit } from './cut';
import {
  D,
  FOOT_BOTTOM,
  FOOT_TOP,
  G,
  LEN,
  POLE_PITCH,
  R,
  R_CORE,
  R_MAGNET,
  R_SLOT,
  SHAFT_BACK,
  SHAFT_FRONT,
  STACK,
  both,
  coilEnd,
  coilSide,
  coilSidePoly,
  discShape,
  extrudeX,
  magnetShape,
  pol,
  polyShape,
  statorShape,
  toothAngle,
  toothPhase,
  type Rect,
} from './geometry';

// The eight parts of the `generator` world, each built into the (empty) group the scene registers for it. Every part owns its materials (a material shared by two parts could not
// follow its own part when it is exploded), so a builder makes them itself. The turning parts (rotor, magnets, shaft) keep what turns in a `rot` group. Each part also hands the
// section its caps: the rectangles of the plane through the axis and the shapes of the plane across it.

export const GEN_PARTS = [
  'gen-frame',
  'gen-stator',
  'gen-coils',
  'gen-rotor',
  'gen-magnets',
  'gen-shaft',
  'gen-bearings',
  'gen-terminals',
] as const;
export type GenId = (typeof GEN_PARTS)[number];

const std = (color: number, roughness: number, metalness: number): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

/**
 * The sheets of a laminated core: a map of fine bands along the stack (a DataTexture, no canvas) whose period is `LAMINATION_PITCH` of the stack: the sheets are drawn about eight times
 * thicker than the real ones (0.5 mm) so that they read at the size of the picture. The side faces of an extrusion have u across the sheet and v along the stack, in metres.
 */
export const LAMINATION_PITCH = 0.004;
function laminationMap(): THREE.DataTexture {
  const rows = 8;
  const data = new Uint8Array(4 * rows * 4);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < 4; i++) {
      const edge = j === 0 ? 0.8 : j === rows - 1 ? 0.9 : 1;
      const k = (j * 4 + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = Math.round(255 * edge);
      data[k + 3] = 255;
    }
  const t = new THREE.DataTexture(data, 4, rows, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1 / LAMINATION_PITCH);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
const paint = () => std(0x2f5d7c, 0.5, 0.35);
const box = (sx: number, sy: number, sz: number, mat: THREE.Material, x: number, y: number, z: number) =>
  mesh(new THREE.BoxGeometry(sx, sy, sz), mat, [x, y, z]);
/** A rectangle of the plane through the axis from its two corners, and its mirror image under the axis. */
const rect = (x0: number, x1: number, y0: number, y1: number): Rect => [x0, x1, y0, y1];
/** The shape of a rectangle across the axis: z from z0 to z1, y from y0 to y1. */
const rectAcross = (z0: number, z1: number, y0: number, y1: number): THREE.Shape =>
  polyShape([
    [-z0, y0],
    [-z1, y0],
    [-z1, y1],
    [-z0, y1],
  ]);
const hexHead = (r: number, h: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
  const m = mesh(new THREE.CylinderGeometry(r, r, h, 6), mat, [x, y, z]);
  m.rotation.z = Math.PI / 2;
  return m;
};

export interface Pieces {
  /** The sub-groups the scene and the tests look at. */
  groups: Record<string, THREE.Group>;
  /** Everything the animation drives. */
  rot: { rotor: THREE.Group; magnets: THREE.Group; shaft: THREE.Group };
  /** The four caps of the magnets that turn through the plane of the section (top and bottom, north and south pole), shown by the animation. */
  magnetCaps: { topN: THREE.Mesh; topS: THREE.Mesh; bottomN: THREE.Mesh; bottomS: THREE.Mesh };
  /** The paths of the three phases from their coils to the end of the cable, for the dots of "Flux". */
  phasePaths: THREE.Vector3[][];
  /** The bearings' sub-groups (they come apart in the exploded view, one towards each end). */
  bearings: { front: THREE.Group; rear: THREE.Group };
}

/** Everything the scene needs to know to register the parts and animate them. */
export function buildParts(roots: Record<GenId, THREE.Group>, cut: QuarterCut): Pieces {
  const groups: Record<string, THREE.Group> = {};
  const sub = (parent: THREE.Object3D, name: string): THREE.Group => {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    groups[name] = g;
    return g;
  };
  const still = (id: GenId): Unit => cut.unit(id, roots[id], () => roots[id].position.x);

  // ---------------------------------------------------------------------------------------------------- frame
  {
    const root = roots['gen-frame'];
    const bell = G.bell;
    const wall = D.shellWall;
    const pa = paint();
    const al = MAT.aluDark();
    const dark = MAT.steelBlack();
    const zinc = MAT.zinc();
    const seat = D.bearing.outerRadius;
    const shell = sub(root, 'shell');
    shell.add(mesh(ringX(R, R - wall, bell, LEN - bell, 56), pa));
    for (let i = 1; i <= D.ribs.count; i++) {
      const x = (LEN * i) / (D.ribs.count + 1);
      shell.add(mesh(ringX(R + D.ribs.height, R, x - D.ribs.width / 2, x + D.ribs.width / 2, 56), pa));
    }
    // end bells (cast aluminium) with the seat of the bearing, the boss outside the front one, the housing inside both
    shell.add(mesh(ringX(R + G.bellExtra, seat, 0, bell, 56), al));
    shell.add(mesh(ringX(R + G.bellExtra, seat, LEN - bell, LEN, 56), al));
    shell.add(mesh(ringX(D.seat.bossRadius, seat, -D.seat.bossLength, 0, 32), al));
    shell.add(mesh(ringX(D.seat.housingRadius, seat, bell, bell + D.seat.housingLength, 32), al));
    shell.add(mesh(ringX(D.seat.housingRadius, seat, LEN - bell - D.seat.housingLength, LEN - bell, 32), al));
    // bolts of the bells
    for (let i = 0; i < 8; i++) {
      const a = (TAU * i) / 8;
      const [sx, sy] = pol(R - 0.014, a);
      shell.add(hexHead(0.006, 0.002, zinc, -0.001, sy, -sx));
      shell.add(hexHead(0.006, 0.002, zinc, LEN + 0.001, sy, -sx));
    }
    // the base plate welded under the tube (the feet of the blue machine: same footprint) and its four bolts
    const fl = G.foot[2];
    const fw = R * 0.78 + G.foot[0] / 2;
    shell.add(box(fl, G.foot[1], 2 * fw, dark, LEN / 2, (FOOT_TOP + FOOT_BOTTOM) / 2, 0));
    for (const sx of [0.06, LEN - 0.06])
      for (const sz of [-0.13, 0.13]) {
        const b = hexHead(0.009, 0.006, zinc, sx, FOOT_TOP + 0.003, sz);
        b.rotation.set(0, 0, 0);
        shell.add(b);
      }
    // the name plate on the front side of the tube, with its lines
    shell.add(box(0.07, 0.045, 0.003, MAT.alu(), 0.075, 0, R + 0.0005));
    for (let i = 0; i < 3; i++) shell.add(box(0.05, 0.002, 0.0008, dark, 0.075, 0.012 - i * 0.012, R + 0.0021));
    mergeStatic(shell, { name: 'gen-frame', colours: false });
    const u = still('gen-frame');
    const bottom = (r: Rect): Rect => [r[0], r[1], -r[3], -r[2]];
    const along: Rect[] = [
      ...both(rect(bell, LEN - bell, R - wall, R)),
      ...both(rect(0, bell, seat, R + G.bellExtra)),
      ...both(rect(LEN - bell, LEN, seat, R + G.bellExtra)),
      ...both(rect(-D.seat.bossLength, 0, seat, D.seat.bossRadius)),
      ...both(rect(bell, bell + D.seat.housingLength, seat, D.seat.housingRadius)),
      ...both(rect(LEN - bell - D.seat.housingLength, LEN - bell, seat, D.seat.housingRadius)),
      bottom(rect(LEN / 2 - fl / 2, LEN / 2 + fl / 2, -FOOT_TOP, -FOOT_BOTTOM)),
    ];
    for (let i = 1; i <= D.ribs.count; i++) {
      const x = (LEN * i) / (D.ribs.count + 1);
      along.push(...both(rect(x - D.ribs.width / 2, x + D.ribs.width / 2, R, R + D.ribs.height)));
    }
    u.along(root, along, CAP.frame);
    const tube = discShape(R, R - wall);
    u.across(root, [tube, rectAcross(-fw, fw, FOOT_BOTTOM, FOOT_TOP)], CAP.frame);
  }

  // ---------------------------------------------------------------------------------------------------- stator (laminated core and its clamping plates)
  {
    const root = roots['gen-stator'];
    const lam = new THREE.MeshStandardMaterial({
      color: 0x7b838b,
      roughness: 0.42,
      metalness: 0.8,
      map: laminationMap(),
    });
    const plates = MAT.steel();
    const S = D.stator;
    root.add(mesh(extrudeX(statorShape(), STACK.x0, STACK.x1, 40), lam));
    const clamp = 0.003;
    root.add(mesh(ringX(S.outerRadius, R_SLOT, STACK.x0 - clamp, STACK.x0, 56), plates));
    root.add(mesh(ringX(S.outerRadius, R_SLOT, STACK.x1, STACK.x1 + clamp, 56), plates));
    mergeStatic(root, { name: 'gen-stator', colours: false });
    const u = still('gen-stator');
    u.along(root, both(rect(STACK.x0 - clamp, STACK.x1 + clamp, R_SLOT, S.outerRadius)), CAP.lamination);
    u.across(root, statorShape(), CAP.lamination);
  }

  // ---------------------------------------------------------------------------------------------------- coils: one on every tooth, the phase marked by a coloured tab
  const coilTabs = new Map<number, THREE.Vector3>();
  {
    const root = roots['gen-coils'];
    const cu = MAT.copper();
    const C = D.coil;
    const x0 = STACK.x0;
    const x1 = STACK.x1;
    const phaseMats = [MAT.cableRed(), MAT.warningYellow(), MAT.cableBlue()];
    const sideP = coilSide(1, x0, x1);
    const sideN = coilSide(-1, x0, x1);
    const endF = coilEnd(x0 - C.overhang, x0);
    const endB = coilEnd(x1, x1 + C.overhang);
    const tabW = 2 * (D.stator.stem / 2 + C.insulation + C.build) * 0.8;
    const tabH = (C.to - C.from) * 0.8;
    for (let k = 0; k < D.slots; k++) {
      const psi = toothAngle(k);
      for (const geo of [sideP, sideN, endF, endB]) {
        const m = mesh(geo, cu);
        m.rotation.x = psi;
        root.add(m);
      }
      const tabGeo = new THREE.BoxGeometry(0.0016, tabH, tabW);
      tabGeo.translate(x1 + C.overhang + 0.0008, (C.from + C.to) / 2, 0);
      const tab = mesh(tabGeo, phaseMats[toothPhase(k)]);
      tab.rotation.x = psi;
      root.add(tab);
      const [sx, sy] = pol((C.from + C.to) / 2, psi);
      coilTabs.set(k, new THREE.Vector3(x1 + C.overhang + 0.0016, sy, -sx));
    }
    mergeStatic(root, { name: 'gen-coils', colours: false });
    const u = still('gen-coils');
    const shapes: THREE.Shape[] = [];
    for (let k = 0; k < D.slots; k++)
      for (const s of [1, -1] as const) shapes.push(polyShape(coilSidePoly(s, toothAngle(k))));
    u.across(root, shapes, CAP.copper);
  }

  // ---------------------------------------------------------------------------------------------------- rotor: a steel core and two end plates on the shaft, what holds the magnets
  const rot = {
    rotor: new THREE.Group(),
    magnets: new THREE.Group(),
    shaft: new THREE.Group(),
  };
  const magnetCapSets = {} as Pieces['magnetCaps'];
  {
    const root = roots['gen-rotor'];
    rot.rotor.name = 'rot-rotor';
    root.add(rot.rotor);
    const steel = std(0x78808a, 0.45, 0.55);
    const endMat = std(0x6a727b, 0.45, 0.55);
    const r = G.shaftRadius;
    const plate = 0.004;
    rot.rotor.add(mesh(extrudeX(discShape(R_CORE, r), STACK.x0, STACK.x1, 48), steel));
    rot.rotor.add(mesh(extrudeX(discShape(R_CORE + 0.003, r), STACK.x0 - plate, STACK.x0, 48), endMat));
    rot.rotor.add(mesh(extrudeX(discShape(R_CORE + 0.003, r), STACK.x1, STACK.x1 + plate, 48), endMat));
    mergeStatic(rot.rotor, { name: 'gen-rotor', colours: false });
    dynamic(rot.rotor);
    const u = still('gen-rotor');
    u.along(
      root,
      [
        ...both(rect(STACK.x0, STACK.x1, r, R_CORE)),
        ...both(rect(STACK.x0 - plate, STACK.x0, r, R_CORE + 0.003)),
        ...both(rect(STACK.x1, STACK.x1 + plate, r, R_CORE + 0.003)),
      ],
      CAP.steel,
    );
    u.across(rot.rotor, discShape(R_CORE, r), CAP.steel);
  }

  // ---------------------------------------------------------------------------------------------------- magnets: 16 on the face of the core, north and south alternating
  {
    const root = roots['gen-magnets'];
    rot.magnets.name = 'rot-magnets';
    root.add(rot.magnets);
    const mn = MAT.magnetN();
    const ms = MAT.magnetS();
    const e = D.rotor.magnetEndClearance;
    const xm0 = STACK.x0 + e;
    const xm1 = STACK.x1 - e;
    const geo = extrudeX(magnetShape(), xm0, xm1);
    for (let k = 0; k < D.poles; k++) {
      const m = mesh(geo, k % 2 === 0 ? mn : ms);
      m.rotation.x = k * POLE_PITCH;
      rot.magnets.add(m);
    }
    mergeStatic(rot.magnets, { name: 'gen-magnets', colours: false });
    dynamic(rot.magnets);
    const u = still('gen-magnets');
    const arc = (k: number): THREE.Shape => {
      const half = (D.rotor.magnetArc * POLE_PITCH) / 2;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 6; i++) pts.push(pol(R_MAGNET, k * POLE_PITCH - half + (2 * half * i) / 6));
      for (let i = 6; i >= 0; i--) pts.push(pol(R_CORE, k * POLE_PITCH - half + (2 * half * i) / 6));
      return polyShape(pts);
    };
    const north: THREE.Shape[] = [];
    const south: THREE.Shape[] = [];
    for (let k = 0; k < D.poles; k++) (k % 2 === 0 ? north : south).push(arc(k));
    u.across(rot.magnets, north, CAP.magnetN);
    u.across(rot.magnets, south, CAP.magnetS);
    const top = rect(xm0, xm1, R_CORE, R_MAGNET);
    const bottom = rect(xm0, xm1, -R_MAGNET, -R_CORE);
    magnetCapSets.topN = u.dynamic(root, [top], CAP.magnetN);
    magnetCapSets.topS = u.dynamic(root, [top], CAP.magnetS);
    magnetCapSets.bottomN = u.dynamic(root, [bottom], CAP.magnetN);
    magnetCapSets.bottomS = u.dynamic(root, [bottom], CAP.magnetS);
  }

  // ---------------------------------------------------------------------------------------------------- shaft: the stub that carries the small pulley, with its key; the rings that keep the bearings
  {
    const root = roots['gen-shaft'];
    rot.shaft.name = 'rot-shaft';
    root.add(rot.shaft);
    const inox = MAT.inox();
    const r = G.shaftRadius;
    const S = D.shaft;
    rot.shaft.add(mesh(cylinderX(r, SHAFT_FRONT, SHAFT_BACK, 32), inox));
    // chamfered ends
    rot.shaft.add(mesh(cylinderX(r * 0.8, SHAFT_FRONT - 0.002, SHAFT_FRONT, 24), inox));
    rot.shaft.add(mesh(cylinderX(r * 0.8, SHAFT_BACK, SHAFT_BACK + 0.002, 24), inox));
    const kx = SHAFT_FRONT + S.keyFrom;
    rot.shaft.add(
      box(
        S.keyLength,
        S.keyHeight + 0.0035,
        S.keyWidth,
        MAT.steel(),
        kx + S.keyLength / 2,
        r - 0.0035 / 2 + S.keyHeight / 2,
        0,
      ),
    );
    const ringMat = MAT.steel();
    const rings: [number, number][] = [
      [G.bell, G.bell + S.ringWidth],
      [LEN - G.bell - S.ringWidth, LEN - G.bell],
    ];
    for (const [a, b] of rings) rot.shaft.add(mesh(cylinderX(S.ringRadius, a, b, 28), ringMat));
    mergeStatic(rot.shaft, { name: 'gen-shaft', colours: false });
    dynamic(rot.shaft);
    const u = still('gen-shaft');
    u.along(root, [rect(SHAFT_FRONT, SHAFT_BACK, -r, r)], CAP.shaft);
    u.along(
      root,
      rings.flatMap(([a, b]) => both(rect(a, b, r, S.ringRadius))),
      CAP.steel,
    );
    u.across(rot.shaft, discShape(r), CAP.shaft);
  }

  // ---------------------------------------------------------------------------------------------------- bearings: one in each bell
  const bearings = { front: new THREE.Group(), rear: new THREE.Group() };
  {
    const root = roots['gen-bearings'];
    const B = D.bearing;
    const r = G.shaftRadius;
    const pitchR = (r + B.ring + (B.outerRadius - B.ring)) / 2;
    const xs = { front: G.bell - B.width, rear: LEN - G.bell };
    for (const side of ['front', 'rear'] as const) {
      const g = bearings[side];
      g.name = `bearing-${side}`;
      root.add(g);
      groups[g.name] = g;
      const x0 = xs[side];
      const x1 = x0 + B.width;
      const nickel = MAT.nickel();
      g.add(mesh(ringX(B.outerRadius, B.outerRadius - B.ring, x0, x1, 40), nickel));
      g.add(mesh(ringX(r + B.ring, r, x0, x1, 40), nickel));
      const ballMat = MAT.alu();
      for (let i = 0; i < B.balls; i++) {
        const a = (TAU * i) / B.balls;
        g.add(
          mesh(new THREE.SphereGeometry(B.ballRadius, 12, 8), ballMat, [
            (x0 + x1) / 2,
            pitchR * Math.cos(a),
            pitchR * Math.sin(a),
          ]),
        );
      }
      mergeStatic(g, { name: `bearing-${side}`, colours: false });
    }
    // the section needs each bearing's own plane: the two come apart in the exploded view
    for (const side of ['front', 'rear'] as const) {
      const g = bearings[side];
      const u = cut.unit('gen-bearings', g, () => roots['gen-bearings'].position.x + g.position.x);
      const x0 = xs[side];
      const x1 = x0 + B.width;
      u.along(g, both(rect(x0, x1, B.outerRadius - B.ring, B.outerRadius)), CAP.nickel);
      u.along(g, both(rect(x0, x1, r, r + B.ring)), CAP.nickel);
      const balls: THREE.Shape[] = [];
      for (const s of [1, -1]) {
        const ball = new THREE.Shape();
        ball.absarc((x0 + x1) / 2, s * pitchR, B.ballRadius, 0, TAU, false);
        balls.push(ball);
      }
      u.alongShapes(g, balls, CAP.shaft);
    }
  }

  // ---------------------------------------------------------------------------------------------------- terminal box: the box, the block with its three studs, the leads of the winding, the cable out
  const phasePaths: THREE.Vector3[][] = [];
  {
    const root = roots['gen-terminals'];
    const T = D.terminals;
    /** The leads rise through the tube at the end of the stack, inside the footprint of the box. */
    const xp = 0.249;
    const [bx, by, bz] = G.box;
    const cx = LEN * 0.55;
    const x0 = cx - bx / 2;
    const x1 = cx + bx / 2;
    const yTop = R + by - 0.004;
    const yBottom = 0.1445;
    const lidY = R + by;
    const grey = std(0xc6c9c5, 0.6, 0.15);
    const lidMat = MAT.aluDark();
    const casing = sub(root, 'terminal-box');
    casing.add(box(T.wall, yTop - yBottom, bz, grey, x0 + T.wall / 2, (yTop + yBottom) / 2, 0));
    casing.add(box(T.wall, yTop - yBottom, bz, grey, x1 - T.wall / 2, (yTop + yBottom) / 2, 0));
    for (const s of [-1, 1])
      casing.add(box(bx, yTop - 0.14, T.wall, grey, cx, (yTop + 0.14) / 2, s * (bz / 2 - T.wall / 2)));
    casing.add(box(bx * 1.06, 0.012, bz * 1.06, lidMat, cx, lidY, 0));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const s = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 8), MAT.zinc(), [
          cx + sx * bx * 0.45,
          lidY + 0.0075,
          sz * bz * 0.42,
        ]);
        casing.add(s);
      }
    // inside: the block, three studs with their nuts, brass; the cores of the cable run on to the gland in the end wall
    const inside = sub(root, 'terminal-inside');
    const brass = MAT.brass();
    const xs = cx + 0.013;
    const zs = [-0.033, 0, 0.033];
    const blockY0 = 0.163;
    const blockY1 = 0.171;
    inside.add(box(0.06, blockY1 - blockY0, 0.105, MAT.printBlack(), xs, (blockY0 + blockY1) / 2, 0));
    const studY0 = 0.1595;
    const studY1 = 0.19;
    for (const z of zs) {
      inside.add(
        mesh(new THREE.CylinderGeometry(T.stud, T.stud, studY1 - studY0, 14), brass, [xs, (studY0 + studY1) / 2, z]),
      );
      for (const ny of [0.176, 0.184])
        inside.add(mesh(new THREE.CylinderGeometry(T.nut, T.nut, 0.006, 6), brass, [xs, ny, z]));
      inside.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.002, 16), brass, [xs, studY0 + 0.001, z]));
    }
    // the gland through the end wall and the cable that leaves (it goes on to the powerhouse)
    const gy = 0.2;
    const glandX0 = x1 - T.wall;
    inside.add(mesh(cylinderX(T.gland, glandX0, x1 + 0.015, 20), brass));
    inside.children[inside.children.length - 1].position.y = gy;
    const cablePts = [
      new THREE.Vector3(x1 + 0.015, gy, 0),
      new THREE.Vector3(0.36, gy, 0),
      new THREE.Vector3(0.415, gy - 0.025, 0),
      new THREE.Vector3(0.455, 0.09, 0),
    ];
    inside.add(mesh(tubeGeometry(cablePts, 0.009, 40, 14), MAT.printBlack()));
    const colour = [MAT.cableRed(), MAT.warningYellow(), MAT.cableBlue()];
    // phase k (A, B, C): the coil tab of the teeth 0 (A), 1 (B) and 23 (C, just under the top on the other side), so that the three leads reach the studs without crossing;
    // the studs, seen from the viewer's side, are C, A, B
    const source = [0, 1, D.slots - 1];
    const studOf = [1, 2, 0];
    const rIn = R - D.shellWall - T.lead - 0.0005;
    for (let ph = 0; ph < 3; ph++) {
      const tab = coilTabs.get(source[ph])!;
      const studZ = zs[studOf[ph]];
      const psiD = Math.asin(studZ / rIn);
      const psiS = toothAngle(source[ph]) - (source[ph] > D.slots / 2 ? TAU : 0);
      const p = (r: number, psi: number, x: number) => {
        const [sx, sy] = pol(r, psi);
        return new THREE.Vector3(x, sy, -sx);
      };
      const lx = tab.x + T.lead;
      const path = [
        new THREE.Vector3(tab.x, tab.y, tab.z),
        p(R_SLOT + 0.004, psiS, lx),
        p(rIn, psiS, lx),
        p(rIn, (psiS + psiD) / 2, lx),
        p(rIn, psiD, lx),
        p(rIn, psiD, xp),
        new THREE.Vector3(xp, studY0, studZ),
        new THREE.Vector3(xs, studY0, studZ),
      ];
      inside.add(mesh(tubeGeometry(path, T.lead, 64, 8), colour[ph]));
      const cores = [
        new THREE.Vector3(xs, studY1 + 0.002, studZ),
        new THREE.Vector3(xs, gy, studZ),
        new THREE.Vector3(xs + 0.035, gy, studZ * 0.5),
        new THREE.Vector3(x1 - T.wall, gy, studZ * 0.12),
        new THREE.Vector3(x1 + 0.012, gy, 0),
      ];
      inside.add(mesh(tubeGeometry(cores, 0.0032, 40, 8), colour[ph]));
      phasePaths.push([
        ...new THREE.CatmullRomCurve3(path, false, 'centripetal').getPoints(40),
        ...new THREE.CatmullRomCurve3(cores, false, 'centripetal').getPoints(24),
        ...cablePts.slice(1),
      ]);
    }
    mergeStatic(casing, { name: 'terminal-box', colours: false });
    mergeStatic(inside, { name: 'terminal-inside', colours: false });
    const u = still('gen-terminals');
    const along: Rect[] = [
      rect(x1 - T.wall, x1, yBottom, yTop),
      rect(cx - (bx * 1.06) / 2, cx + (bx * 1.06) / 2, lidY - 0.006, lidY + 0.006),
      rect(xs - 0.03, xs + 0.03, blockY0, blockY1),
      rect(glandX0, x1 + 0.015, gy - T.gland, gy + T.gland),
      rect(x1 + 0.015, 0.36, gy - 0.009, gy + 0.009),
    ];
    u.along(root, along, CAP.enclosure);
    u.along(
      root,
      [
        rect(xs - T.stud, xs + T.stud, studY0, studY1),
        rect(xs - T.nut, xs + T.nut, 0.173, 0.179),
        rect(xs - T.nut, xs + T.nut, 0.181, 0.187),
        rect(xp - T.lead, xp + T.lead, 0.147, studY0 + T.lead),
        rect(xp, xs, studY0 - T.lead, studY0 + T.lead),
      ],
      CAP.brass,
    );
    // the sections of the leads that lie in the plane (phase A, the stud at z = 0): the cable core
    u.along(root, [rect(xs, x1, gy - 0.0032, gy + 0.0032)], CAP.lead);
  }

  return { groups, rot, magnetCaps: magnetCapSets, phasePaths, bearings };
}
