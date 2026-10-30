import * as THREE from 'three';
import { MAT, emissive, mesh } from '@onigam/lab-kit/three';
import { DRIVE, ELECTRONICS, GENERATOR } from '../dims';
import { TAU, cylinderX } from '../common';

// The drive, in the frame of the screw (X' along the axis, the wheels are discs perpendicular to it): sprockets, pulleys, the chain and the
// belt as bands that wrap two wheels, the generator and the three boxes of the electronics. All shapes are generic.

// ------------------------------------------------------------------------------------------------ wheels

export interface WheelOptions {
  /** Pitch radius (the chain or belt runs there), m. */
  radius: number;
  /** Plate thickness, m. */
  thickness: number;
  /** Teeth (a sprocket) or 0 (a pulley, a smooth rim). */
  teeth: number;
  /** Bore (shaft) radius, m. */
  bore: number;
  /** Lightening holes (0 for none). */
  holes: number;
  /** Rim width of a pulley (belt face), m. */
  rim?: number;
  /** Pitch of the chain this sprocket takes, m (the teeth are cut from it). */
  pitch?: number;
}

/** Outline of a sprocket in the (z, y) plane: z teeth between the root and the tip circles. */
function sprocketShape(o: WheelOptions): THREE.Shape {
  const z = o.teeth;
  const p = o.pitch ?? DRIVE.chainPitch;
  const root = o.radius - 0.42 * p;
  const tip = o.radius + 0.3 * p;
  const s = new THREE.Shape();
  for (let i = 0; i < z; i++) {
    const a = (TAU * i) / z;
    const da = TAU / z;
    const pts: [number, number][] = [
      [root, a - 0.38 * da],
      [tip, a - 0.1 * da],
      [tip, a + 0.1 * da],
      [root, a + 0.38 * da],
    ];
    for (const [r, ang] of pts) {
      const x = r * Math.cos(ang);
      const y = r * Math.sin(ang);
      if (i === 0 && r === pts[0][0] && ang === pts[0][1]) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
  }
  s.closePath();
  return s;
}

/** A plate (sprocket or pulley disc) as a mesh centred on x = 0, axis along X. */
function plate(o: WheelOptions): THREE.BufferGeometry {
  const shape = o.teeth > 0 ? sprocketShape(o) : new THREE.Shape();
  if (o.teeth === 0) shape.absarc(0, 0, o.radius, 0, TAU, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, o.bore, 0, TAU, true);
  shape.holes.push(hole);
  for (let i = 0; i < o.holes; i++) {
    const a = (TAU * (i + 0.5)) / o.holes;
    const h = new THREE.Path();
    h.absarc(0.58 * o.radius * Math.cos(a), 0.58 * o.radius * Math.sin(a), 0.21 * o.radius, 0, TAU, true);
    shape.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: o.thickness, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -o.thickness / 2);
  g.rotateY(Math.PI / 2); // (sx, sy, d) -> (d, sy, -sx)
  return g;
}

export interface Wheel {
  meshes: THREE.Mesh[];
  /** How many identical positions the wheel has per turn (teeth, holes): the wagon-wheel limit of its animation. */
  symmetry: number;
}

/** A sprocket: toothed plate on a hub with a key. */
export function sprocket(o: WheelOptions, hubLength: number): Wheel {
  const meshes: THREE.Mesh[] = [];
  meshes.push(mesh(plate(o), MAT.steel()));
  const hubR = Math.max(o.bore * 1.9, o.radius * 0.3);
  meshes.push(mesh(cylinderX(hubR, -hubLength / 2, hubLength / 2, 28), MAT.steel()));
  // the key: a small block on the hub, so that the turn reads
  meshes.push(
    mesh(new THREE.BoxGeometry(hubLength * 0.9, o.bore * 0.6, o.bore * 0.6), MAT.zinc(), [0, hubR + o.bore * 0.25, 0]),
  );
  return { meshes, symmetry: o.holes > 0 ? o.holes : Math.max(1, o.teeth) };
}

/** A flat-belt pulley: a crowned rim, a web with holes (or solid), a hub with a key. */
export function pulley(o: WheelOptions, hubLength: number): Wheel {
  const meshes: THREE.Mesh[] = [];
  const rim = o.rim ?? DRIVE.beltWidth + 0.02;
  const web = plate({ ...o, thickness: o.thickness * 0.8, radius: o.radius - 0.012 });
  meshes.push(mesh(web, MAT.steelBlack()));
  const drum = new THREE.CylinderGeometry(o.radius * 1.004, o.radius, rim, 40, 1, false);
  drum.rotateZ(Math.PI / 2);
  meshes.push(mesh(drum, MAT.aluDark()));
  for (const s of [-1, 1]) {
    meshes.push(
      mesh(
        cylinderX(o.radius + 0.006, s * rim * 0.5 - (s > 0 ? 0.004 : 0), s * rim * 0.5 + (s > 0 ? 0 : 0.004), 40),
        MAT.steel(),
      ),
    );
  }
  const hubR = Math.max(o.bore * 2, o.radius * 0.28);
  meshes.push(mesh(cylinderX(hubR, -hubLength / 2, hubLength / 2, 24), MAT.steel()));
  meshes.push(
    mesh(new THREE.BoxGeometry(hubLength * 0.9, o.bore * 0.6, o.bore * 0.6), MAT.zinc(), [0, hubR + o.bore * 0.25, 0]),
  );
  return { meshes, symmetry: Math.max(1, o.holes) };
}

// ------------------------------------------------------------------------------------------------ chain and belt

export interface BandLoop {
  /** Points of the loop in the (y', z) plane, closed (the first point is not repeated). */
  points: THREE.Vector2[];
  length: number;
}

/** The closed path of a band that wraps two circles of radii r1 (centre c1) and r2 (centre c2), open (outside) belt. */
export function bandLoop(c1: THREE.Vector2, r1: number, c2: THREE.Vector2, r2: number, step = 0.03): BandLoop {
  const e = c2.clone().sub(c1);
  const d = e.length();
  const phiE = Math.atan2(e.y, e.x);
  const alpha = Math.asin(Math.max(-1, Math.min(1, (r1 - r2) / d)));
  const half = Math.PI / 2 - alpha;
  const pts: THREE.Vector2[] = [];
  const dir = (a: number) => new THREE.Vector2(Math.cos(a), Math.sin(a));
  const arc = (c: THREE.Vector2, r: number, a0: number, a1: number) => {
    const n = Math.max(3, Math.ceil((Math.abs(a1 - a0) * r) / step));
    for (let i = 0; i <= n; i++) pts.push(c.clone().addScaledVector(dir(a0 + ((a1 - a0) * i) / n), r));
  };
  // arc on the second circle, from the upper tangent through the far side to the lower tangent
  arc(c2, r2, phiE + half, phiE - half);
  // arc on the first circle, from the lower tangent through the back side to the upper tangent
  arc(c1, r1, phiE + Math.PI * 1.5 + alpha, phiE + Math.PI * 0.5 - alpha);
  const length = pts.reduce((a, p, i) => a + p.distanceTo(pts[(i + 1) % pts.length]), 0);
  return { points: pts, length };
}

/**
 * A band along the loop: width along X', thickness radial, centred on x = 0. The outer face and the two edges carry u = distance along the
 * loop over `period` (the texture repeats `periods` times), v across the width; the inner face is plain.
 */
export function bandGeometry(
  loop: BandLoop,
  radialOffset: number,
  width: number,
  thickness: number,
  periods: number,
): THREE.BufferGeometry {
  const pts = loop.points;
  const n = pts.length;
  const cum: number[] = [0];
  for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + pts[i % n].distanceTo(pts[i - 1]));
  const total = cum[n];
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const centroid = pts.reduce((a, p) => a.add(p), new THREE.Vector2()).multiplyScalar(1 / n);
  const outward = (i: number): THREE.Vector2 => {
    const a = pts[(i + n - 1) % n];
    const b = pts[(i + 1) % n];
    const t = b.clone().sub(a).normalize();
    const nrm = new THREE.Vector2(t.y, -t.x);
    // choose the side that points away from the middle of the loop
    return nrm.dot(pts[i].clone().sub(centroid)) < 0 ? nrm.negate() : nrm;
  };
  const w = width / 2;
  const r0 = radialOffset;
  const r1 = radialOffset + thickness;
  const emit = (
    xa: number,
    ra: number,
    xb: number,
    rb: number,
    flip: boolean,
    nrmOf: (o: THREE.Vector2) => [number, number, number],
  ) => {
    const base = pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const o = outward(i % n);
      const p = pts[i % n];
      for (const [x, r, v] of [
        [xa, ra, 0],
        [xb, rb, 1],
      ] as const) {
        pos.push(x, p.x + o.x * r, p.y + o.y * r);
        const nv = nrmOf(o);
        nor.push(nv[0], nv[1], nv[2]);
        uv.push((cum[i] / total) * periods, v);
      }
      if (i < n) {
        const q = base + i * 2;
        if (flip) idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
        else idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
      }
    }
  };
  // outer face: from -w to +w at r1 ; inner face at r0 (reversed) ; edges
  emit(-w, r1, w, r1, true, (o) => [0, o.x, o.y]);
  emit(-w, r0, w, r0, false, (o) => [0, -o.x, -o.y]);
  emit(-w, r0, -w, r1, true, () => [-1, 0, 0]);
  emit(w, r0, w, r1, false, () => [1, 0, 0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** A texture of dashes along u (links of a chain, or the stitch marks of a belt), one period wide; DataTexture, so it also builds in Node. */
export function dashTexture(kind: 'chain' | 'belt'): THREE.DataTexture {
  const W = 256;
  const H = 16;
  const data = new Uint8Array(W * H * 4);
  const put = (x: number, y: number, c: [number, number, number]) => {
    const k = (y * W + x) * 4;
    data[k] = c[0];
    data[k + 1] = c[1];
    data[k + 2] = c[2];
    data[k + 3] = 255;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let c: [number, number, number];
      if (kind === 'chain') {
        const cell = Math.floor((x / W) * 8) % 2; // eight link plates and eight gaps per period
        const edge = y < 3 || y >= H - 3;
        c = cell === 0 ? [168, 172, 178] : [60, 64, 70];
        if (edge) c = [38, 40, 44];
        // one painted link per period
        if (x > W * 0.93 && x < W * 0.99 && !edge) c = [200, 52, 40];
        // pins
        const px = (x / W) * 8;
        if (Math.abs((px % 1) - 0.5) < 0.07 && Math.abs(y - H / 2) < 3) c = [26, 28, 31];
      } else {
        c = [32, 33, 36];
        if (y < 2 || y >= H - 2) c = [58, 60, 64];
        if (x > W * 0.45 && x < W * 0.55) c = [230, 226, 214];
        if (x > W * 0.9 && x < W * 0.93 && y > 2 && y < H - 2) c = [236, 190, 40];
      }
      put(x, y, c);
    }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// ------------------------------------------------------------------------------------------------ generator

export interface GeneratorBuild {
  /** Frame: axis X', the front (the shaft side) at x = 0 and the body going towards +x. Static meshes. */
  body: THREE.Mesh[];
  /** The shaft stub that turns, from x = -stub to 0 (front) and a short stub at the back. */
  shaft: THREE.Mesh[];
  /** Where the terminal box stands (frame of the generator) and the half length of the body. */
  terminal: THREE.Vector3;
}

export function buildGenerator(k: number): GeneratorBuild {
  const R = GENERATOR.bodyRadius * k;
  const len = GENERATOR.bodyLength * k;
  const bell = GENERATOR.bell * k;
  const body: THREE.Mesh[] = [];
  const paint = new THREE.MeshStandardMaterial({ color: 0x2f5d7c, metalness: 0.35, roughness: 0.5 });
  body.push(mesh(cylinderX(R, 0, len, 40), paint));
  // cooling ribs: thin rings round the body
  for (let i = 1; i < 6; i++)
    body.push(mesh(cylinderX(R + 0.006 * k, (len * i) / 6 - 0.004 * k, (len * i) / 6 + 0.004 * k, 40), paint));
  // end bells (cast aluminium)
  const bellMat = MAT.aluDark();
  body.push(mesh(cylinderX(R + GENERATOR.bellExtra * k, 0, bell, 40), bellMat));
  body.push(mesh(cylinderX(R + GENERATOR.bellExtra * k, len - bell, len, 40), bellMat));
  // bearing boss on the front bell
  body.push(mesh(cylinderX(GENERATOR.shaftRadius * k * 2.3, -0.02 * k, 0.001, 24), bellMat));
  // terminal box and its lid
  const [bx, by, bz] = GENERATOR.box;
  body.push(
    mesh(new THREE.BoxGeometry(bx * k, by * k, bz * k), MAT.enclosureGrey(), [
      len * 0.55,
      R + (by * k) / 2 - 0.004 * k,
      0,
    ]),
  );
  body.push(
    mesh(new THREE.BoxGeometry(bx * k * 1.06, 0.012 * k, bz * k * 1.06), MAT.aluDark(), [len * 0.55, R + by * k, 0]),
  );
  // mounting feet: two plates along the axis under the body
  const [fw, ft, fl] = GENERATOR.foot;
  for (const s of [-1, 1])
    body.push(
      mesh(new THREE.BoxGeometry(fl * k, ft * k, fw * k), MAT.steelBlack(), [
        len * 0.5,
        -R - (ft * k) / 2 + 0.002,
        s * (R * 0.78),
      ]),
    );
  body.push(mesh(new THREE.BoxGeometry(len * 0.9, R * 0.5, R * 0.9), paint, [len * 0.5, -R * 0.85, 0]));
  const shaft: THREE.Mesh[] = [];
  shaft.push(mesh(cylinderX(GENERATOR.shaftRadius * k, -GENERATOR.stub * k, 0.002, 20), MAT.inox()));
  shaft.push(mesh(cylinderX(GENERATOR.shaftRadius * k, len, len + 0.03 * k, 20), MAT.inox()));
  return { body, shaft, terminal: new THREE.Vector3(len * 0.55, R + by * k, 0) };
}

// ------------------------------------------------------------------------------------------------ electronics

export interface BoxBuild {
  meshes: THREE.Mesh[];
  /** Material of the LED(s) whose emissive intensity follows the state. */
  led?: THREE.MeshStandardMaterial;
  /** Where cables join (local frame). */
  inPort: THREE.Vector3;
  outPort: THREE.Vector3;
}

/** The bridge rectifier: a box with a finned heat sink on top, three AC terminals on one side, two DC on the other. Frame: base centre at the origin, facing +Z. */
export function buildRectifier(k: number): BoxBuild {
  const [w, h, d] = ELECTRONICS.rectifier.map((v) => v * k) as [number, number, number];
  const meshes: THREE.Mesh[] = [];
  meshes.push(mesh(new THREE.BoxGeometry(w, h * 0.55, d), MAT.printBlack(), [0, (h * 0.55) / 2, 0]));
  const fins = 9;
  for (let i = 0; i < fins; i++)
    meshes.push(
      mesh(new THREE.BoxGeometry((w * 0.92) / (fins * 1.6), h * 0.45, d * 0.9), MAT.alu(), [
        -w * 0.43 + (w * 0.86 * i) / (fins - 1),
        h * 0.55 + (h * 0.45) / 2,
        0,
      ]),
    );
  const term = (x: number, mat: THREE.MeshStandardMaterial) =>
    meshes.push(
      mesh(new THREE.CylinderGeometry(0.01 * k, 0.01 * k, 0.02 * k, 10), mat, [x, h * 0.4, d / 2 + 0.008 * k]),
    );
  for (let i = 0; i < 3; i++) term(-w * 0.38 + i * 0.035 * k, MAT.brass());
  term(w * 0.3, MAT.cableRed());
  term(w * 0.4, MAT.cableBlack());
  return {
    meshes,
    inPort: new THREE.Vector3(-w * 0.3, h * 0.4, d / 2 + 0.02 * k),
    outPort: new THREE.Vector3(w * 0.35, h * 0.4, d / 2 + 0.02 * k),
  };
}

/** The charge controller: an enclosure with a small screen and two LEDs (the green one is the "charging" lamp). */
export function buildController(k: number): BoxBuild {
  const [w, h, d] = ELECTRONICS.controller.map((v) => v * k) as [number, number, number];
  const meshes: THREE.Mesh[] = [];
  meshes.push(mesh(new THREE.BoxGeometry(w, h, d), MAT.victronBlue(), [0, h / 2, 0]));
  meshes.push(
    mesh(new THREE.BoxGeometry(w * 0.78, h * 0.26, 0.006 * k), MAT.printBlack(), [0, h * 0.68, d / 2 + 0.002 * k]),
  );
  const led = emissive(0x4fe07a, 0);
  led.userData.noShare = true;
  meshes.push(mesh(new THREE.SphereGeometry(0.011 * k, 12, 8), led, [-w * 0.18, h * 0.38, d / 2 + 0.006 * k]));
  meshes.push(mesh(new THREE.SphereGeometry(0.011 * k, 12, 8), MAT.cableRed(), [w * 0.0, h * 0.38, d / 2 + 0.006 * k]));
  for (let i = 0; i < 4; i++)
    meshes.push(
      mesh(new THREE.CylinderGeometry(0.01 * k, 0.01 * k, 0.025 * k, 10), MAT.brass(), [
        -w * 0.3 + i * w * 0.2,
        0.01 * k,
        d / 2 + 0.002 * k,
      ]),
    );
  return {
    meshes,
    led,
    inPort: new THREE.Vector3(-w * 0.3, 0.02 * k, d / 2 + 0.02 * k),
    outPort: new THREE.Vector3(w * 0.3, 0.02 * k, d / 2 + 0.02 * k),
  };
}

/** The 48 V battery: a block with a handle, two terminals and a row of charge segments (the number lit follows the state of charge of the strip). */
export function buildBattery(k: number): BoxBuild & { segments: THREE.MeshStandardMaterial[] } {
  const [w, h, d] = ELECTRONICS.battery.map((v) => v * k) as [number, number, number];
  const meshes: THREE.Mesh[] = [];
  meshes.push(
    mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: 0x38424a, roughness: 0.55, metalness: 0.2 }),
      [0, h / 2, 0],
    ),
  );
  meshes.push(mesh(new THREE.BoxGeometry(w * 0.9, 0.012 * k, d * 0.9), MAT.printBlack(), [0, h + 0.006 * k, 0]));
  const handle = new THREE.TorusGeometry(0.045 * k, 0.007 * k, 8, 16, Math.PI);
  meshes.push(mesh(handle, MAT.steelBlack(), [0, h + 0.012 * k, 0]));
  for (const s of [-1, 1]) {
    meshes.push(
      mesh(new THREE.CylinderGeometry(0.016 * k, 0.016 * k, 0.03 * k, 12), s > 0 ? MAT.cableRed() : MAT.cableBlack(), [
        s * w * 0.36,
        h + 0.02 * k,
        d * 0.28,
      ]),
    );
  }
  const segments: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 5; i++) {
    const m = emissive(0x6fe08a, 0);
    m.userData.noShare = true;
    segments.push(m);
    meshes.push(
      mesh(new THREE.BoxGeometry(w * 0.12, 0.02 * k, 0.004 * k), m, [
        -w * 0.28 + i * w * 0.14,
        h * 0.55,
        d / 2 + 0.002 * k,
      ]),
    );
  }
  return {
    meshes,
    segments,
    inPort: new THREE.Vector3(w * 0.36, h + 0.03 * k, d * 0.28),
    outPort: new THREE.Vector3(-w * 0.36, h + 0.03 * k, d * 0.28),
  };
}

/** Merge a list of meshes of one frame into a single geometry per material is left to `mergeStatic`; this only stacks them in a group. */
export function groupOf(name: string, meshes: THREE.Mesh[]): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  meshes.forEach((m) => g.add(m));
  return g;
}
