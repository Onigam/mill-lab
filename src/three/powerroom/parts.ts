import * as THREE from 'three';
import { MAT, emissive, mesh } from '@onigam/lab-kit/three';
import { ELECTRONICS, POWERROOM } from '../dims';
import { TAU, tubeGeometry } from '../common';
import { dynamic, mergeStatic } from '../merge';
import { buildBattery, buildController, buildRectifier, type BoxBuild } from '../screw/drive';

// The ten parts of the `powerroom` world, built in the frame of the room (dims.ts, POWERROOM): X along the back wall, Y up, Z into the room, the inner face of the back wall at
// z = 0 and the front of the mounting plate at z = `FZ`. The rectifier, the charge controller and the battery are built with the SAME builders as in the `screw` world (they
// moved here from it) so that they look as the visitor remembers them. Each device carries the numeral of its place in the order the current goes (seven-segment, so that no
// text is drawn in the 3D) and the short wires that arrive at it from the previous device.

export const POWER_PARTS = [
  'dc-breaker',
  'fuse-box',
  'rectifier',
  'charge-controller',
  'battery',
  'dump-load',
  'inverter',
  'energy-meter',
  'switchboard',
  'earthing',
] as const;
export type PowerId = (typeof POWER_PARTS)[number];

const P = POWERROOM;
/** The front of the mounting plate, and the height of the row of numerals (the order the current goes) above the devices. */
export const FZ = P.board.thickness;
export const NUMERAL_Y = 1.77;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const std = (color: number, roughness = 0.6, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const box = (sx: number, sy: number, sz: number, mat: THREE.Material, x: number, y: number, z: number) =>
  mesh(new THREE.BoxGeometry(sx, sy, sz), mat, [x, y, z]);
const cyl = (
  r: number,
  h: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  axis: 'x' | 'y' | 'z' = 'y',
  seg = 14,
) => {
  const m = mesh(new THREE.CylinderGeometry(r, r, h, seg), mat, [x, y, z]);
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  return m;
};

// ------------------------------------------------------------------------------------------------ the numerals and the warning sign

/** Which of the seven segments (a top, b top right, c bottom right, d bottom, e bottom left, f top left, g middle) a digit lights. */
const SEGMENTS: Record<number, string> = {
  1: 'bc',
  2: 'abged',
  3: 'abgcd',
  4: 'fgbc',
  5: 'afgcd',
  6: 'afgecd',
  7: 'abc',
  8: 'abcdefg',
};

/** A small black plate with a white seven-segment digit, facing +z, centred on (x, y) at the depth z. */
export function numeral(n: number, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.name = `numeral-${n}`;
  const plate = box(0.07, 0.06, 0.004, MAT.printBlack(), x, y, z + 0.002);
  g.add(plate);
  const w = 0.022;
  const h = 0.038;
  const t = 0.0058;
  const white = MAT.printWhite();
  const seg = (c: string, sx: number, sy: number, px: number, py: number) => {
    if (!SEGMENTS[n].includes(c)) return;
    g.add(box(sx, sy, 0.0016, white, x + px, y + py, z + 0.0048));
  };
  seg('a', w, t, 0, h / 2 - t / 2);
  seg('g', w, t, 0, 0);
  seg('d', w, t, 0, -h / 2 + t / 2);
  seg('f', t, h / 2 - t * 0.8, -w / 2 + t / 2, h / 4);
  seg('b', t, h / 2 - t * 0.8, w / 2 - t / 2, h / 4);
  seg('e', t, h / 2 - t * 0.8, -w / 2 + t / 2, -h / 4);
  seg('c', t, h / 2 - t * 0.8, w / 2 - t / 2, -h / 4);
  return g;
}

/** A warning triangle (yellow with a black border and a black bolt), facing +z, centred on (x, y) at depth z; `s` is the side. */
export function warning(s: number, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'warning';
  const tri = (k: number): THREE.Shape => {
    const r = (s * k) / Math.sqrt(3);
    const sh = new THREE.Shape();
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + (TAU * i) / 3;
      if (i === 0) sh.moveTo(r * Math.cos(a), r * Math.sin(a));
      else sh.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    sh.closePath();
    return sh;
  };
  const slab = (shape: THREE.Shape, depth: number, mat: THREE.Material, dz: number, dy = 0) => {
    const m = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), mat, [x, y + dy, z + dz]);
    g.add(m);
  };
  slab(tri(1), 0.002, MAT.printBlack(), 0);
  slab(tri(0.84), 0.002, MAT.warningYellow(), 0.002);
  const bolt = new THREE.Shape();
  const k = s * 0.3;
  const pts: [number, number][] = [
    [0.18, 0.5],
    [-0.28, -0.05],
    [-0.02, -0.05],
    [-0.18, -0.55],
    [0.3, 0.08],
    [0.04, 0.08],
  ];
  pts.forEach(([px, py], i) => (i === 0 ? bolt.moveTo(px * k, py * k) : bolt.lineTo(px * k, py * k)));
  bolt.closePath();
  slab(bolt, 0.001, MAT.printBlack(), 0.0045, -s * 0.06);
  return g;
}

/** A wire: a tube along points, owned by the part it arrives at. */
function wire(group: THREE.Object3D, pts: THREE.Vector3[], r: number, mat: THREE.Material): THREE.Vector3[] {
  group.add(mesh(tubeGeometry(pts, r, Math.max(16, pts.length * 10), 6), mat));
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal').getPoints(Math.max(16, pts.length * 8));
}

// ------------------------------------------------------------------------------------------------ what the scene drives

export interface PowerPieces {
  groups: Record<PowerId, THREE.Group>;
  /** Materials the state drives. */
  controllerLed: THREE.MeshStandardMaterial;
  batterySegments: THREE.MeshStandardMaterial[];
  inverterLed: THREE.MeshStandardMaterial;
  meterLed: THREE.MeshStandardMaterial;
  /** The meter's disc, which turns about its own axis (z). */
  meterDisc: THREE.Object3D;
  /** The toggle of the breaker (on). */
  breakerToggle: THREE.Object3D;
  /** The path of the current, in the order it goes: the cable in, the DC side to the battery, the inverter, the meter, the line out. */
  paths: { dc: THREE.Vector3[]; out: THREE.Vector3[] };
  /** Where a label can be hung: the top centre of each device. */
  tops: Record<PowerId, THREE.Vector3>;
  /** What the shared builders of the `screw` world returned for the three devices that moved here (their meshes are in the parts), and where they were put. */
  built: {
    rectifier: BoxBuild;
    controller: BoxBuild;
    battery: BoxBuild & { segments: THREE.MeshStandardMaterial[] };
    at: { rectifier: THREE.Vector3; controller: THREE.Vector3; battery: THREE.Vector3 };
  };
}

/** The ports used by the room to join its conduits to the devices. */
export const PORTS = {
  /** Where the cable of the generator drops into the breaker, and where the supply to the house leaves the meter. */
  cableIn: v(P.breaker.x, P.breaker.y + P.breaker.size[1] / 2, FZ + 0.05),
  lineOut: v(P.meter.x, P.meter.y + P.meter.size[1] / 2, FZ + 0.045),
};

export function buildPowerParts(roots: Record<PowerId, THREE.Group>): PowerPieces {
  const groups = roots;
  const red = std(0xb42a1f, 0.55);
  const black = std(0x1b1d20, 0.55);
  const blue = std(0x2b5fa6, 0.55);
  const yellow = std(0xd6a912, 0.55);
  const tops = {} as Record<PowerId, THREE.Vector3>;
  const trunkTop = P.board.y1 - 0.045;
  const ac = [red, yellow, blue];

  // ---------------------------------------------------------------------------------------------------- 1. the breaker: a three-pole box with its lever; the cable comes down from the trunking
  let breakerToggle!: THREE.Object3D;
  {
    const g = groups['dc-breaker'];
    const [w, h, d] = P.breaker.size;
    const { x, y } = P.breaker;
    const z = FZ + d / 2;
    g.add(box(w, h, d, std(0xdadcd8, 0.55), x, y, z));
    g.add(box(w * 0.82, h * 0.62, 0.006, MAT.printBlack(), x, y + h * 0.04, FZ + d + 0.002));
    // three toggles joined by a bar, red, up = on
    breakerToggle = new THREE.Group();
    breakerToggle.position.set(x, y + h * 0.04, FZ + d + 0.006);
    for (let i = -1; i <= 1; i++) {
      breakerToggle.add(box(0.018, 0.075, 0.016, MAT.redPaint(), i * 0.034, 0.012, 0.006));
      breakerToggle.add(box(0.026, 0.01, 0.006, MAT.printBlack(), i * 0.034, -0.03, 0));
    }
    breakerToggle.add(box(0.1, 0.008, 0.01, MAT.redPaint(), 0, 0.044, 0.012));
    dynamic(breakerToggle);
    g.add(breakerToggle);
    for (let i = -1; i <= 1; i++) {
      for (const sy of [1, -1])
        g.add(cyl(0.005, 0.012, MAT.brass(), x + i * 0.034, y + sy * (h / 2 + 0.004), z, 'y', 10));
    }
    // the cores come down from the trunking onto the three top terminals
    for (let i = -1; i <= 1; i++) {
      const top = v(x + i * 0.034, y + h / 2 + 0.01, z);
      wire(
        g,
        [
          v(x + i * 0.034, trunkTop, FZ + 0.03),
          v(x + i * 0.034 + 0.004, trunkTop - 0.08, FZ + 0.045),
          top.clone().add(v(0, 0.1, 0.005)),
          top,
        ],
        0.0048,
        ac[i + 1],
      );
    }
    g.add(numeral(1, x, NUMERAL_Y, FZ));
    g.add(warning(0.045, x, y - h * 0.24, FZ + d + 0.006));
    mergeStatic(g, { name: 'dc-breaker' });
    tops['dc-breaker'] = v(x, y + h / 2, z);
  }

  // ---------------------------------------------------------------------------------------------------- 2. the fuse box: a box with a clear lid over three fuse holders
  {
    const g = groups['fuse-box'];
    const [w, h, d] = P.fuseBox.size;
    const { x, y } = P.fuseBox;
    const z = FZ + d / 2;
    g.add(box(w, h, d, std(0xe3e4e0, 0.55), x, y, z));
    g.add(box(w * 0.88, h * 0.76, 0.008, MAT.printBlack(), x, y, FZ + d + 0.003));
    // fuse carriers: a white holder with a yellow-banded cartridge each, standing in a row
    for (let i = -1; i <= 1; i++) {
      g.add(box(0.034, 0.12, 0.014, MAT.printWhite(), x + i * 0.054, y + 0.01, FZ + d + 0.014));
      g.add(cyl(0.01, 0.07, MAT.printCream(), x + i * 0.054, y + 0.016, FZ + d + 0.026, 'y', 12));
      g.add(cyl(0.0102, 0.012, MAT.brass(), x + i * 0.054, y + 0.016 + 0.03, FZ + d + 0.026, 'y', 12));
      g.add(cyl(0.0102, 0.012, MAT.brass(), x + i * 0.054, y + 0.016 - 0.03, FZ + d + 0.026, 'y', 12));
      g.add(box(0.034, 0.018, 0.006, MAT.warningYellow(), x + i * 0.054, y - 0.07, FZ + d + 0.011));
    }
    // the cover: smoked, see-through, one piece (kept apart from the merge: it is transparent)
    const cover = mesh(
      new THREE.BoxGeometry(w * 0.94, h * 0.88, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0x2c3237,
        roughness: 0.1,
        metalness: 0,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
      [x, y, FZ + d + 0.034],
    );
    cover.castShadow = false;
    cover.userData.noShadow = true;
    g.add(cover);
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        g.add(cyl(0.005, 0.01, MAT.zinc(), x + sx * (w / 2 - 0.012), y + sy * (h / 2 - 0.012), FZ + d + 0.062, 'z', 8));
    // the three links from the breaker's lower terminals
    const bx = P.breaker.x;
    const bBottom = P.breaker.y - P.breaker.size[1] / 2 - 0.006;
    for (let i = -1; i <= 1; i++) {
      const a = v(bx + i * 0.034, bBottom, FZ + P.breaker.size[2] / 2);
      const b = v(x - w / 2 - 0.004, y + i * 0.03 - 0.03, FZ + d + 0.01);
      wire(g, [a, a.clone().add(v(0, -0.04, 0.03)), b.clone().add(v(-0.03, 0.02, 0.05)), b], 0.0048, ac[i + 1]);
    }
    g.add(numeral(2, x, NUMERAL_Y, FZ));
    mergeStatic(g, { name: 'fuse-box' });
    tops['fuse-box'] = v(x, y + h / 2, z);
  }

  // ---------------------------------------------------------------------------------------------------- 3. the rectifier (the screw world's builder): AC in on the left, DC out on the right
  const rb = buildRectifier(1);
  const rectAt = v(P.rectifier.x, P.rectifier.bottom, FZ + ELECTRONICS.rectifier[2] / 2 + 0.004);
  {
    const g = groups.rectifier;
    const inner = new THREE.Group();
    inner.position.copy(rectAt);
    rb.meshes.forEach((m) => inner.add(m));
    g.add(inner);
    // the three AC cores from the fuse box
    const [fw] = P.fuseBox.size;
    for (let i = 0; i < 3; i++) {
      const a = v(P.fuseBox.x + fw / 2 + 0.004, P.fuseBox.y + (i - 1) * 0.03, FZ + P.fuseBox.size[2] + 0.01);
      const b = rectAt
        .clone()
        .add(
          v(
            -ELECTRONICS.rectifier[0] * 0.38 + i * 0.035,
            ELECTRONICS.rectifier[1] * 0.4,
            ELECTRONICS.rectifier[2] / 2 + 0.012,
          ),
        );
      wire(g, [a, a.clone().add(v(0.03, -0.01, 0.05)), b.clone().add(v(-0.01, 0.03, 0.05)), b], 0.0048, ac[i]);
    }
    g.add(numeral(3, P.rectifier.x, NUMERAL_Y, FZ));
    mergeStatic(g, { name: 'rectifier' });
    tops.rectifier = v(P.rectifier.x, P.rectifier.bottom + ELECTRONICS.rectifier[1], rectAt.z);
  }

  // ---------------------------------------------------------------------------------------------------- 4. the charge controller (the screw world's builder)
  const cb = buildController(1);
  const ctrlAt = v(P.controller.x, P.controller.bottom, FZ + ELECTRONICS.controller[2] / 2 + 0.004);
  {
    const g = groups['charge-controller'];
    const inner = new THREE.Group();
    inner.position.copy(ctrlAt);
    cb.meshes.forEach((m) => inner.add(m));
    g.add(inner);
    // DC from the rectifier: a red and a black core
    const rOut = rectAt.clone().add(rb.outPort);
    const cIn = ctrlAt.clone().add(cb.inPort);
    const cOutPort = ctrlAt.clone().add(cb.outPort);
    wire(g, [rOut, rOut.clone().add(v(0.01, -0.04, 0.05)), cIn.clone().add(v(-0.03, 0.06, 0.06)), cIn], 0.0055, red);
    wire(
      g,
      [
        rOut.clone().add(v(0.012, 0, 0)),
        rOut.clone().add(v(0.03, -0.07, 0.06)),
        cIn.clone().add(v(-0.016, 0.04, 0.05)),
        cIn.clone().add(v(0.02, 0, 0)),
      ],
      0.0055,
      black,
    );
    void cOutPort;
    g.add(numeral(4, P.controller.x, NUMERAL_Y, FZ));
    mergeStatic(g, { name: 'charge-controller' });
    tops['charge-controller'] = v(P.controller.x, P.controller.bottom + ELECTRONICS.controller[1], ctrlAt.z);
  }

  // ---------------------------------------------------------------------------------------------------- 5. the battery (the screw world's builder), on its rack on the floor
  const bb = buildBattery(1);
  const batAt = v(P.battery.x, P.rack.shelf, P.battery.z);
  let dcPath: THREE.Vector3[] = [];
  {
    const g = groups.battery;
    const inner = new THREE.Group();
    inner.position.copy(batAt);
    bb.meshes.forEach((m) => inner.add(m));
    g.add(inner);
    // the two thick cables from the controller's lower terminals to the battery's terminals
    const cOut = ctrlAt.clone().add(cb.outPort);
    const plus = batAt.clone().add(bb.inPort);
    const minus = batAt.clone().add(bb.outPort);
    const w1 = wire(
      g,
      [
        cOut,
        cOut.clone().add(v(0.02, -0.12, 0.08)),
        plus.clone().add(v(0.02, 0.4, 0.04)),
        plus.clone().add(v(0, 0.02, 0)),
        plus,
      ],
      0.0075,
      red,
    );
    wire(
      g,
      [
        cOut.clone().add(v(-0.04, 0, 0)),
        cOut.clone().add(v(-0.05, -0.16, 0.1)),
        minus.clone().add(v(-0.03, 0.4, 0.06)),
        minus.clone().add(v(0, 0.02, 0)),
        minus,
      ],
      0.0075,
      black,
    );
    dcPath = w1;
    // numeral on the front of the shelf
    g.add(numeral(5, P.battery.x, P.rack.shelf - 0.04, P.battery.z + P.rack.depth / 2));
    g.add(warning(0.06, batAt.x + 0.2, batAt.y + 0.12, batAt.z + ELECTRONICS.battery[2] / 2 + 0.0));
    mergeStatic(g, { name: 'battery' });
    tops.battery = v(P.battery.x, P.rack.shelf + ELECTRONICS.battery[1] + 0.03, P.battery.z);
  }

  // ---------------------------------------------------------------------------------------------------- 6. the dump load: a steel box with louvres; it is NOT simulated, so it is drawn at rest
  {
    const g = groups['dump-load'];
    const [w, h, d] = P.dumpLoad.size;
    const { x, y } = P.dumpLoad;
    const z = FZ + d / 2;
    g.add(box(w, h, d, MAT.steelBlack(), x, y, z));
    g.add(box(w * 1.04, 0.012, d * 1.04, MAT.steel(), x, y + h / 2 + 0.006, z));
    for (let i = 0; i < 9; i++)
      g.add(box(w * 0.8, 0.008, 0.016, MAT.aluDark(), x, y - h * 0.38 + i * ((h * 0.76) / 8), FZ + d + 0.004));
    for (const sx of [-1, 1]) g.add(box(0.012, h * 0.84, 0.012, MAT.steel(), x + sx * w * 0.44, y, FZ + d + 0.006));
    // two terminals at the bottom, a lug on the side, an idle lamp
    for (const sx of [-1, 1])
      g.add(cyl(0.007, 0.02, sx > 0 ? MAT.cableRed() : MAT.cableBlack(), x + sx * 0.05, y - h / 2 - 0.008, z, 'y', 10));
    g.add(
      mesh(new THREE.SphereGeometry(0.008, 10, 8), std(0x5a2f2a, 0.5), [
        x + w * 0.38,
        y + h / 2 - 0.03,
        FZ + d + 0.003,
      ]),
    );
    // the DC branch from the controller (red and black, thin)
    const cOut = ctrlAt.clone().add(cb.outPort);
    const a = cOut.clone().add(v(0.04, 0, 0));
    const b = v(x - 0.05, y - h / 2 - 0.016, z);
    wire(g, [a, a.clone().add(v(0.03, -0.05, 0.05)), b.clone().add(v(-0.03, -0.06, 0.05)), b], 0.0045, red);
    wire(
      g,
      [
        a.clone().add(v(0.012, 0, 0)),
        a.clone().add(v(0.04, -0.07, 0.07)),
        b.clone().add(v(0.07, -0.08, 0.05)),
        b.clone().add(v(0.1, 0, 0)),
      ],
      0.0045,
      black,
    );
    g.add(warning(0.05, x - w * 0.28, y + h * 0.28, FZ + d + 0.013));
    g.add(numeral(6, x, NUMERAL_Y, FZ));
    mergeStatic(g, { name: 'dump-load' });
    tops['dump-load'] = v(x, y + h / 2, z);
  }

  // ---------------------------------------------------------------------------------------------------- 7. the inverter: a blue case with a display and a lamp (lit while it works)
  const inverterLed = emissive(0x4fe07a, 0);
  inverterLed.userData.noShare = true;
  {
    const g = groups.inverter;
    const [w, h, d] = P.inverter.size;
    const { x, y } = P.inverter;
    const z = FZ + d / 2;
    g.add(box(w, h, d, MAT.victronBlue(), x, y, z));
    g.add(box(w * 1.12, 0.016, d * 0.9, MAT.aluDark(), x, y + h / 2 + 0.008, z)); // heat sink cap
    for (let i = 0; i < 4; i++) g.add(box(w * 0.96, 0.006, 0.008, MAT.aluDark(), x, y + h / 2 + 0.02 + i * 0.012, z));
    g.add(box(w * 0.7, h * 0.24, 0.006, MAT.printBlack(), x, y + h * 0.18, FZ + d + 0.002));
    g.add(box(w * 0.42, h * 0.12, 0.003, std(0x294a2a, 0.3), x - w * 0.08, y + h * 0.18, FZ + d + 0.0055));
    const lamp = mesh(new THREE.SphereGeometry(0.012, 12, 8), inverterLed, [
      x + w * 0.28,
      y + h * 0.18,
      FZ + d + 0.008,
    ]);
    dynamic(lamp);
    g.add(lamp);
    // a row of vents and the mains terminals underneath
    for (let i = 0; i < 6; i++)
      g.add(box(w * 0.5, 0.004, 0.004, MAT.printBlack(), x, y - h * 0.08 - i * 0.018, FZ + d + 0.002));
    for (let i = -2; i <= 2; i++)
      g.add(
        cyl(
          0.008,
          0.026,
          i < 0 ? MAT.cableRed() : i > 0 ? MAT.cableBlack() : MAT.brass(),
          x + i * 0.05,
          y - h / 2 - 0.01,
          z + 0.03,
          'y',
          10,
        ),
      );
    // the DC cables from the battery's + terminal and - terminal: thick, red and black
    const plus = batAt.clone().add(bb.inPort);
    const minus = batAt.clone().add(bb.outPort);
    const dcP = v(x - 0.1, y - h / 2 - 0.02, z + 0.03);
    const dcM = v(x - 0.15, y - h / 2 - 0.02, z + 0.03);
    wire(
      g,
      [
        plus.clone().add(v(0.03, 0, 0)),
        plus.clone().add(v(0.08, 0.2, 0.05)),
        dcP.clone().add(v(0.02, -0.34, 0.07)),
        dcP.clone().add(v(0, -0.02, 0)),
        dcP,
      ],
      0.0075,
      red,
    );
    wire(
      g,
      [
        minus.clone().add(v(0.0, 0.0, 0)),
        minus.clone().add(v(0.1, 0.28, 0.1)),
        dcM.clone().add(v(0.0, -0.4, 0.09)),
        dcM.clone().add(v(0, -0.02, 0)),
        dcM,
      ],
      0.0075,
      black,
    );
    g.add(warning(0.045, x - w * 0.34, y - h * 0.3, FZ + d + 0.0));
    g.add(numeral(7, x, NUMERAL_Y, FZ));
    mergeStatic(g, { name: 'inverter' });
    tops.inverter = v(x, y + h / 2 + 0.1, z);
  }

  // ---------------------------------------------------------------------------------------------------- 8. the energy meter: a window on a disc that turns with the power, a pulse lamp
  const meterLed = emissive(0xff5a3c, 0);
  meterLed.userData.noShare = true;
  const meterDisc = new THREE.Group();
  {
    const g = groups['energy-meter'];
    const [w, h, d] = P.meter.size;
    const { x, y } = P.meter;
    const z = FZ + d / 2;
    g.add(box(w, h, d, std(0xdedfdb, 0.5), x, y, z));
    g.add(box(w * 0.86, h * 0.5, 0.006, MAT.printBlack(), x, y + h * 0.17, FZ + d + 0.002));
    // the window: a dark glass with the disc behind it
    meterDisc.position.set(x, y + h * 0.17, FZ + d + 0.0055);
    meterDisc.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.002, 28).rotateX(Math.PI / 2), MAT.alu(), [0, 0, 0]));
    meterDisc.add(box(0.062, 0.008, 0.0015, MAT.redPaint(), 0, 0, 0.0016));
    meterDisc.add(box(0.008, 0.026, 0.0015, MAT.printBlack(), 0.018, 0.012, 0.0016));
    dynamic(meterDisc);
    g.add(meterDisc);
    g.add(
      mesh(
        new THREE.CylinderGeometry(0.038, 0.038, 0.003, 28).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: 0x1b2024,
          roughness: 0.05,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
        [x, y + h * 0.17, FZ + d + 0.0105],
      ),
    );
    // the digits (dark), the pulse lamp, the seal
    g.add(box(w * 0.6, h * 0.1, 0.004, std(0x2f3b2f, 0.3), x, y - h * 0.12, FZ + d + 0.002));
    const lamp = mesh(new THREE.SphereGeometry(0.006, 10, 8), meterLed, [x + w * 0.3, y - h * 0.3, FZ + d + 0.004]);
    dynamic(lamp);
    g.add(lamp);
    g.add(
      mesh(new THREE.SphereGeometry(0.006, 10, 8), MAT.warningYellow(), [x - w * 0.32, y - h * 0.3, FZ + d + 0.004]),
    );
    for (let i = -1; i <= 1; i++) g.add(cyl(0.006, 0.014, MAT.brass(), x + i * 0.036, y - h / 2 - 0.006, z, 'y', 10));
    // AC from the inverter's output: two cores (brown, blue); the supply to the house leaves from the top
    const [iw, ih, id] = P.inverter.size;
    const a = v(P.inverter.x + iw / 2 + 0.004, P.inverter.y - ih * 0.2, FZ + id + 0.01);
    for (let i = 0; i < 2; i++) {
      const b = v(x - 0.036 + i * 0.036, y - h / 2 - 0.014, z + 0.01);
      wire(
        g,
        [
          a.clone().add(v(0, -i * 0.012, 0)),
          a.clone().add(v(0.02, -0.06, 0.05)),
          b.clone().add(v(-0.01, -0.07, 0.06)),
          b,
        ],
        0.0048,
        i === 0 ? std(0x6b4a2a, 0.5) : blue,
      );
    }
    for (let i = 0; i < 2; i++) {
      const top = v(x - 0.018 + i * 0.036, y + h / 2 + 0.01, z);
      wire(
        g,
        [top, top.clone().add(v(0, 0.06, 0.012)), v(x - 0.018 + i * 0.036 + 0.02, trunkTop, FZ + 0.04)],
        0.0048,
        i === 0 ? std(0x6b4a2a, 0.5) : blue,
      );
    }
    g.add(numeral(8, x, NUMERAL_Y, FZ));
    mergeStatic(g, { name: 'energy-meter' });
    tops['energy-meter'] = v(x, y + h / 2, z);
  }

  // ---------------------------------------------------------------------------------------------------- 9. the switchboard: the mounting plate and its frame, the rails, the trunking, the rack of the battery
  {
    const g = groups.switchboard;
    const B = P.board;
    const cx = 0;
    const cy = (B.y0 + B.y1) / 2;
    const bw = 2 * B.halfWidth;
    const bh = B.y1 - B.y0;
    const dark = std(0x2e3439, 0.6, 0.12);
    g.add(box(bw, bh, B.thickness, dark, cx, cy, B.thickness / 2));
    const frame = std(0x8e959b, 0.55, 0.25);
    // a folded frame all round (flanges forward), screws at the corners
    g.add(box(bw + 0.02, 0.035, B.thickness + 0.03, frame, cx, B.y0 - 0.0175, (B.thickness + 0.03) / 2));
    g.add(box(bw + 0.02, 0.035, B.thickness + 0.03, frame, cx, B.y1 + 0.0175, (B.thickness + 0.03) / 2));
    for (const sx of [-1, 1])
      g.add(box(0.035, bh, B.thickness + 0.03, frame, sx * (B.halfWidth + 0.0175), cy, (B.thickness + 0.03) / 2));
    // DIN rails behind the rows
    for (const ry of [1.28, 1.7]) g.add(box(bw * 0.94, 0.035, 0.006, MAT.alu(), cx, ry, B.thickness + 0.003));
    // the cable trunking along the top: a grey duct with slots, open at the ends where the conduits come in
    const T = P.trunking;
    const trunk = std(0xbfc3c4, 0.6);
    g.add(box(bw * 0.96, T.height, T.depth, trunk, cx, B.y1 - T.height / 2 - 0.005, T.depth / 2 + 0.003));
    for (let i = 0; i < 28; i++)
      g.add(box(0.05, 0.005, 0.002, MAT.printBlack(), -1.1 + i * 0.0815, B.y1 - T.height / 2 - 0.005, T.depth + 0.004));
    // the rack of the battery: four posts and a shelf, standing on the floor in front of the board
    const R = P.rack;
    const rackMat = std(0x6f777d, 0.55, 0.2);
    const sx = (ELECTRONICS.battery[0] + 0.08) / 2;
    const z0 = P.battery.z - R.depth / 2;
    const z1 = P.battery.z + R.depth / 2;
    for (const px of [-1, 1])
      for (const pz of [z0 + R.post / 2, z1 - R.post / 2]) {
        g.add(box(R.post, R.shelf, R.post, rackMat, P.battery.x + px * (sx - R.post / 2), R.shelf / 2, pz));
        g.add(
          box(R.post * 2.2, 0.008, R.post * 2.2, MAT.steelBlack(), P.battery.x + px * (sx - R.post / 2), 0.004, pz),
        );
      }
    g.add(box(2 * sx, 0.02, R.depth, rackMat, P.battery.x, R.shelf - 0.01, P.battery.z));
    g.add(box(2 * sx, 0.04, 0.012, frame, P.battery.x, R.shelf - 0.04, z1 - 0.006));
    g.add(box(2 * sx, 0.04, 0.012, frame, P.battery.x, R.shelf - 0.04, z0 + 0.006));
    mergeStatic(g, { name: 'switchboard' });
    tops.switchboard = v(0.5, B.y1 + 0.02, 0.05);
  }

  // ---------------------------------------------------------------------------------------------------- 10. the earthing: the earth bar and the surge protector on the board, the rod in the floor, the green-yellow cables
  {
    const g = groups.earthing;
    const E = P.earthBar;
    const [bw, bh] = E.size;
    // bar on two insulators
    for (const sx of [-1, 1])
      g.add(cyl(0.012, 0.03, MAT.printBlack(), E.x + sx * (bw / 2 - 0.02), E.y, FZ + 0.015, 'z', 10));
    g.add(box(bw, bh * 0.55, 0.012, MAT.copperBright(), E.x, E.y, FZ + 0.036));
    for (let i = 0; i < 6; i++)
      g.add(
        cyl(
          0.0045,
          0.012,
          MAT.brass(),
          E.x - bw / 2 + 0.02 + i * ((bw - 0.04) / 5),
          E.y + bh * 0.1,
          FZ + 0.048,
          'z',
          8,
        ),
      );
    // the surge protector: a narrow box with two indicator windows
    const S = P.surge;
    const [sw, sh, sd] = S.size;
    g.add(box(sw, sh, sd, MAT.printGrey(), S.x, S.y, FZ + sd / 2));
    g.add(box(sw * 0.8, sh * 0.2, 0.004, MAT.printBlack(), S.x, S.y + sh * 0.22, FZ + sd + 0.002));
    g.add(box(sw * 0.35, sh * 0.1, 0.003, std(0x2fb25a, 0.4), S.x - sw * 0.2, S.y + sh * 0.22, FZ + sd + 0.0045));
    g.add(box(sw * 0.35, sh * 0.1, 0.003, std(0x2fb25a, 0.4), S.x + sw * 0.2, S.y + sh * 0.22, FZ + sd + 0.0045));
    for (const sx of [-1, 1])
      g.add(cyl(0.0045, 0.012, MAT.brass(), S.x + sx * sw * 0.28, S.y - sh / 2 - 0.004, FZ + sd / 2, 'y', 8));
    const gy = MAT.cableYellowGreen();
    const stripe = MAT.warningYellow();
    // surge protector to the bar, bar to the rod
    wire(
      g,
      [
        v(S.x - sw * 0.28, S.y - sh / 2 - 0.01, FZ + sd / 2),
        v(S.x - 0.07, S.y - 0.09, FZ + 0.06),
        v(E.x + bw / 2 - 0.03, E.y + 0.02, FZ + 0.052),
      ],
      0.0055,
      gy,
    );
    const rod = P.rod;
    const rodTop = v(rod.x, rod.above, rod.z);
    wire(
      g,
      [
        v(E.x - bw / 2 + 0.02, E.y - 0.02, FZ + 0.05),
        v(E.x - bw / 2 - 0.04, E.y - 0.1, FZ + 0.04),
        v(rod.x + 0.02, 1.0, 0.03),
        v(rod.x, 0.55, 0.035),
        v(rod.x - 0.01, 0.2, 0.1),
        rodTop.clone().add(v(0.0, -0.01, 0.0)),
      ],
      0.0065,
      gy,
    );
    wire(
      g,
      [
        v(E.x - bw / 2 + 0.02, E.y - 0.02, FZ + 0.05),
        v(E.x - bw / 2 - 0.02, E.y - 0.04, FZ + 0.07),
        v(E.x - bw / 2 - 0.01, E.y - 0.06, FZ + 0.09),
      ],
      0.0035,
      stripe,
    );
    // the rod: copper-clad steel coming out of an inspection plate in the floor, with its clamp
    g.add(cyl(rod.radius, rod.above, MAT.copperBright(), rod.x, rod.above / 2, rod.z, 'y', 14));
    g.add(box(0.22, 0.008, 0.22, MAT.steelBlack(), rod.x, 0.004, rod.z));
    g.add(box(0.2, 0.004, 0.2, MAT.zinc(), rod.x, 0.0095, rod.z));
    g.add(cyl(0.015, 0.03, MAT.brass(), rod.x, rod.above - 0.025, rod.z, 'y', 12));
    mergeStatic(g, { name: 'earthing' });
    tops.earthing = v(E.x, E.y + 0.1, FZ + 0.05);
  }

  // the path of the current: the cable in, the breaker, the fuses, the rectifier (the wires are the ones above, followed point by point), the DC side, the inverter, the meter, out
  const hop = (a: THREE.Vector3, b: THREE.Vector3, n = 6) =>
    Array.from({ length: n + 1 }, (_, i) => a.clone().lerp(b, i / n));
  const bz = FZ + P.breaker.size[2] / 2;
  const dc: THREE.Vector3[] = [
    ...hop(v(PORTS.cableIn.x, trunkTop, FZ + 0.03), v(P.breaker.x, P.breaker.y, bz + 0.05), 6),
    ...hop(v(P.breaker.x, P.breaker.y, bz + 0.05), v(P.fuseBox.x, P.fuseBox.y, FZ + P.fuseBox.size[2] + 0.04), 8),
    ...hop(v(P.fuseBox.x, P.fuseBox.y, FZ + P.fuseBox.size[2] + 0.04), rectAt.clone().add(v(-0.03, 0.06, 0.07)), 8),
    ...hop(rectAt.clone().add(v(-0.03, 0.06, 0.07)), rectAt.clone().add(rb.outPort), 5),
    ...hop(rectAt.clone().add(rb.outPort), ctrlAt.clone().add(cb.inPort), 6),
    ...hop(ctrlAt.clone().add(cb.inPort), ctrlAt.clone().add(cb.outPort), 4),
    ...dcPath,
  ];
  const [iw, ih, id] = P.inverter.size;
  const plus = batAt.clone().add(bb.inPort);
  const out: THREE.Vector3[] = [
    ...hop(plus, v(P.inverter.x - 0.1, P.inverter.y - ih / 2 - 0.02, FZ + id / 2 + 0.03), 14),
    ...hop(
      v(P.inverter.x - 0.1, P.inverter.y - ih / 2 - 0.02, FZ + id / 2 + 0.03),
      v(P.inverter.x, P.inverter.y, FZ + id + 0.02),
      6,
    ),
    ...hop(
      v(P.inverter.x, P.inverter.y, FZ + id + 0.02),
      v(P.inverter.x + iw / 2, P.inverter.y - ih * 0.2, FZ + id + 0.02),
      5,
    ),
    ...hop(
      v(P.inverter.x + iw / 2, P.inverter.y - ih * 0.2, FZ + id + 0.02),
      v(P.meter.x, P.meter.y - P.meter.size[1] / 2 - 0.02, FZ + P.meter.size[2] / 2),
      6,
    ),
    ...hop(
      v(P.meter.x, P.meter.y - P.meter.size[1] / 2 - 0.02, FZ + P.meter.size[2] / 2),
      PORTS.lineOut.clone().add(v(0, 0.04, 0)),
      6,
    ),
    ...hop(PORTS.lineOut.clone().add(v(0, 0.04, 0)), v(P.meter.x + 0.02, trunkTop, FZ + 0.04), 4),
  ];

  return {
    groups,
    controllerLed: cb.led!,
    batterySegments: bb.segments,
    inverterLed,
    meterLed,
    meterDisc,
    breakerToggle,
    paths: { dc, out },
    tops,
    built: {
      rectifier: rb,
      controller: cb,
      battery: bb,
      at: { rectifier: rectAt, controller: ctrlAt, battery: batAt },
    },
  };
}
