import * as THREE from 'three';
import type { PartRegistry, ViewOpts } from '@onigam/lab-kit/three';
import { clamp } from '@onigam/lab-kit/three';
import type { MillState } from '../../sim/types';
import { BLADES } from '../../sim/machine';
import { DESIGN, WATER_FX } from '../dims';
import type { CutKit } from '../cut';
import { follow, murkOf } from '../water/look';
import type { WaterKit } from '../water/kit';
import type { RibbonState } from '../water/nappe';
import { Spray, type Emitter } from '../water/spray';
import { waterOf } from '../water/surface';
import type { Rig } from './build';
import { inletLevel, worldPoint, type Layout } from './layout';
import { BASE_Y } from './structure';

// Water bodies whose shape follows the state every frame without allocating: a prism through a four-point polygon of the XY plane (the
// pools and the inlet basin), its cap at the section plane, the cap of a pocket, and the fish that rides a pocket.

/** Quad (or triangle, with a repeated point) polygon in the XY plane, extruded between z = -h and z = +h. Flat normals, non-indexed. */
export class Prism {
  readonly mesh: THREE.Mesh;
  readonly cap: THREE.Mesh;
  private readonly pos = new Float32Array(36 * 3);
  private readonly nor = new Float32Array(36 * 3);
  private readonly capPos = new Float32Array(6 * 3);
  readonly poly: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  halfWidth = 1;
  private readonly tmp = new THREE.Vector3();

  constructor(
    readonly material: THREE.Material,
    capMaterial: THREE.Material,
  ) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e3);
    g.boundingBox = new THREE.Box3();
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.mesh.castShadow = false;
    this.mesh.userData.noShadow = true;
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.BufferAttribute(this.capPos, 3));
    cg.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3),
    );
    cg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e3);
    cg.boundingBox = new THREE.Box3();
    this.cap = new THREE.Mesh(cg, capMaterial);
    this.cap.frustumCulled = false;
    this.cap.renderOrder = 4;
    this.cap.castShadow = false;
    this.cap.userData.noShadow = true;
    this.cap.userData.cap = true;
    this.cap.visible = false;
    this.set(this.poly, 1);
  }

  /** Set the polygon (counter-clockwise, four points) and the half width. */
  set(poly: readonly [number, number][], halfWidth: number): void {
    for (let i = 0; i < 4; i++) {
      this.poly[i][0] = poly[i][0];
      this.poly[i][1] = poly[i][1];
    }
    this.halfWidth = halfWidth;
    // true bounds, for the framing of the part that holds the water
    const box = this.mesh.geometry.boundingBox!;
    box.makeEmpty();
    for (const q of poly)
      box.expandByPoint(this.tmp.set(q[0], q[1], -halfWidth)).expandByPoint(this.tmp.set(q[0], q[1], halfWidth));
    this.cap.geometry.boundingBox!.copy(box);
    const p = this.pos;
    const n = this.nor;
    let v = 0;
    const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
      p[v * 3] = x;
      p[v * 3 + 1] = y;
      p[v * 3 + 2] = z;
      n[v * 3] = nx;
      n[v * 3 + 1] = ny;
      n[v * 3 + 2] = nz;
      v++;
    };
    const h = halfWidth;
    for (const [a, b, c] of [
      [0, 1, 2],
      [0, 2, 3],
    ]) {
      const A = poly[a];
      const B = poly[b];
      const C = poly[c];
      push(A[0], A[1], h, 0, 0, 1);
      push(B[0], B[1], h, 0, 0, 1);
      push(C[0], C[1], h, 0, 0, 1);
      push(A[0], A[1], -h, 0, 0, -1);
      push(C[0], C[1], -h, 0, 0, -1);
      push(B[0], B[1], -h, 0, 0, -1);
    }
    for (let i = 0; i < 4; i++) {
      const A = poly[i];
      const B = poly[(i + 1) % 4];
      const dx = B[0] - A[0];
      const dy = B[1] - A[1];
      const len = Math.hypot(dx, dy);
      const nx = len > 1e-9 ? dy / len : 0;
      const ny = len > 1e-9 ? -dx / len : 1;
      push(A[0], A[1], -h, nx, ny, 0);
      push(B[0], B[1], -h, nx, ny, 0);
      push(B[0], B[1], h, nx, ny, 0);
      push(A[0], A[1], -h, nx, ny, 0);
      push(B[0], B[1], h, nx, ny, 0);
      push(A[0], A[1], h, nx, ny, 0);
    }
    (this.mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.mesh.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    // the free surface is the top of the polygon: the meniscus of the volume and of its section follows it
    let top = -Infinity;
    for (const q of poly) top = Math.max(top, q[1]);
    waterOf(this.material)?.setLevel(0, 1, top);
    waterOf(this.cap.material)?.setLevel(0, 1, top);
    const c = this.capPos;
    const tri = [0, 1, 2, 0, 2, 3];
    tri.forEach((i, k) => {
      c[k * 3] = poly[i][0];
      c[k * 3 + 1] = poly[i][1];
      c[k * 3 + 2] = 0;
    });
    (this.cap.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Area of the polygon (m²), to tell an empty prism. */
  area(): number {
    const q = this.poly;
    let a = 0;
    for (let i = 0; i < 4; i++) a += q[i][0] * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * q[i][1];
    return Math.abs(a) / 2;
  }
}

/** Section of a pocket at the plane z = 0: strips between rows of (x', y') pairs; positions are written in place. */
export class SectionCap {
  readonly geometry = new THREE.BufferGeometry();
  private readonly tmp = new THREE.Vector3();
  private readonly pos: Float32Array;
  private readonly rows = 7;
  constructor() {
    this.pos = new Float32Array((this.rows - 1) * 6 * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(
        new Float32Array((this.rows - 1) * 6 * 3).map((_, i) => (i % 3 === 2 ? 1 : 0)),
        3,
      ),
    );
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e3);
    this.geometry.boundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  }

  /** Fill from a polygon of the form returned by `pocketSection` (left edge points, then the right edge from the tip to the core). */
  set(poly: [number, number][]): boolean {
    this.geometry.setDrawRange(0, 0);
    if (poly.length < 4) return false;
    // poly = [left-bottom, right edge ... (tip to core), left-top]: strips between the left edge x and the right edge points
    const xl = poly[0][0];
    const right = poly.slice(1, poly.length - 1);
    const n = Math.min(right.length - 1, this.rows - 1);
    let v = 0;
    const put = (x: number, y: number) => {
      this.pos[v * 3] = x;
      this.pos[v * 3 + 1] = y;
      this.pos[v * 3 + 2] = 0;
      v++;
    };
    for (let i = 0; i < n; i++) {
      const a = right[i];
      const b = right[i + 1];
      put(xl, a[1]);
      put(a[0], a[1]);
      put(b[0], b[1]);
      put(xl, a[1]);
      put(b[0], b[1]);
      put(xl, b[1]);
    }
    this.geometry.setDrawRange(0, v);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    const box = this.geometry.boundingBox!.makeEmpty();
    for (let i = 0; i < v; i++) box.expandByPoint(this.tmp.set(this.pos[i * 3], this.pos[i * 3 + 1], 0));
    return v > 0;
  }
}

/** A small fish (body, tail, eye) about `length` long, heading +X, centred on its body. Not registered: scenery riding a pocket. */
export function buildFish(length: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'fish';
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(length * 0.34, 14, 10).scale(1.5, 0.78, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xd9894a, roughness: 0.45, metalness: 0.15 }),
  );
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(length * 0.3, 12, 8).scale(1.4, 0.5, 0.46),
    new THREE.MeshStandardMaterial({ color: 0xf1e3c4, roughness: 0.5 }),
  );
  belly.position.set(0, -length * 0.07, 0);
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(length * 0.2, length * 0.3, 10).rotateZ(Math.PI / 2).scale(1, 1, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xc9702f, roughness: 0.5 }),
  );
  tail.position.set(-length * 0.5, 0, 0);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(length * 0.04, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x111111 }),
  );
  eye.position.set(length * 0.32, length * 0.06, length * 0.17);
  const eye2 = eye.clone();
  eye2.position.z = -eye.position.z;
  g.add(body, belly, tail, eye, eye2);
  g.traverse((o) => {
    o.castShadow = false;
    o.userData.noShadow = true;
  });
  return g;
}

// ------------------------------------------------------------------------------------------------ the moving water of the screw world

/** The flows the screw world draws, as shares of the flow (all from the state: physical numbers of the model). */
export interface ScrewFlows {
  /** `flow` over the design flow (0 .. 1.6): the splash at the inlet and the ripples of the pools. */
  flowK: number;
  /** Share of the flow that leaks through the gap (`qGap / flow`) and that spills over the blade tips (`qOver / flow`). */
  gap: number;
  over: number;
}

export function screwFlows(s: Pick<MillState, 'flow' | 'qGap' | 'qOver'>): ScrewFlows {
  const f = Math.max(1e-9, s.flow);
  return {
    flowK: clamp(s.flow / DESIGN.flow, 0, 1.6),
    gap: s.flow > 1e-6 ? clamp(s.qGap / f, 0, 1) : 0,
    over: s.flow > 1e-6 ? clamp(s.qOver / f, 0, 1) : 0,
  };
}

/**
 * What the water of the screw world does, frame by frame: the meniscus of the pockets (the free surface stays horizontal because the level
 * is a line of the world, carried into the frame of the screw), the sheet that falls into the inlet basin and its splash, the ripples and the
 * foam that leave the lower end where the pockets empty into the pool, the thin streams of the leak through the gap (`qGap`) and the water
 * that spills over the blade tips at the inlet (`qOver`). Spray is proportional to those flows; where each drop goes is decorative.
 */
export class ScrewWaterFx {
  readonly spray = new Spray({ max: WATER_FX.spray.max, seed: 777 });
  readonly now = { murk: 0, leakRate: 0, overRate: 0, inletRate: 0, outletRate: 0, level: 0, sheetFall: 0 };
  private layout: Layout | null = null;
  private first = true;
  private readonly rs: RibbonState = { top: 0, sill: 0, floor: 0, q: 0 };
  private readonly inlet: Emitter;
  private readonly outlet: Emitter;
  private readonly leak: Emitter;
  private readonly over: Emitter;

  constructor(
    private readonly kit: WaterKit,
    private readonly registry: PartRegistry,
  ) {
    const size = WATER_FX.spray.sizeScrew;
    this.inlet = this.spray.add({ owner: 0, size, life: 0.7, scatter: 0.3, alpha: 0.85, gravity: 9.81 });
    this.outlet = this.spray.add({ owner: 1, size: size * 1.2, life: 0.8, scatter: 0.4, alpha: 0.8 });
    this.leak = this.spray.add({ owner: 2, size: size * 0.55, life: 0.35, scatter: 0.05, alpha: 0.95 });
    this.over = this.spray.add({ owner: 0, size: size * 0.8, life: 0.6, scatter: 0.12, alpha: 0.85 });
  }

  /** The layout changed (a new screw size): the static positions of the emitters follow. */
  setLayout(l: Layout): void {
    this.layout = l;
    const k = l.k;
    const p0 = worldPoint(l, 0.7 * k, -(l.ro - 0.03), -0.04);
    const p1 = worldPoint(l, l.L - 0.7 * k, -(l.ro - 0.03), -0.04);
    const e = this.leak;
    e.x = p0.x;
    e.y = p0.y;
    e.z = p0.z;
    e.sx = p1.x - p0.x;
    e.sy = p1.y - p0.y;
    e.sz = 0;
    e.hz = 0.035 * k;
    e.hx = 0.012 * k;
    e.vx = -0.3;
    e.vy = -0.1;
    e.gravity = 3.5;
    e.floorBelow = 0.1 * k;
    this.spray.clear();
  }

  /** Clip the spray with the section (call after every rebuild of the world: `CutKit.reset` forgets it). */
  clipWith(cut: CutKit): void {
    cut.clip(this.spray.object);
  }

  settle(): void {
    this.first = true;
  }

  /** The drops of a part are drawn while it is solid and in its place: they do not follow an explode, so they go with it. */
  private solid(id: string): boolean {
    const e = this.registry.get(id);
    return !e || (e.display === 'solid' && e.factor < 0.02);
  }

  update(s: MillState, dt: number, view: ViewOpts, rig: Rig, fill: number, theta = 0): void {
    const l = this.layout;
    if (!l) return;
    const now = this.now;
    const snap = this.first;
    this.first = false;
    const { flowK, gap, over } = screwFlows(s);
    const sh = this.kit.shared;
    sh.time.value = view.time;
    now.murk = snap ? murkOf(s) : follow(now.murk, murkOf(s), dt, 1.4);
    sh.murk.value = now.murk;
    const k = l.k;
    const rpsK = clamp(Math.abs(s.omega) / (2 * Math.PI) / 1, 0, 3);

    // ---- the level of the free surface in the frame of the screw: a world line y = h becomes x' sinB + y' cosB = h - y0 (the pockets and their sections)
    const h = l.levels.hMin + clamp(fill, 0, 1) * (l.levels.hPass - l.levels.hMin);
    now.level = h;
    for (const m of [rig.pockets?.material, rig.pocketCap?.material]) {
      const w = waterOf(m as THREE.Material);
      if (!w) continue;
      w.setLevel(l.sinB, l.cosB, h);
      if (w.kind === 'volume') w.setLook(0.32, 0.03, 0);
    }

    // ---- the inlet: the basin and the sheet that pours over the headwall into it, the splash where it lands
    const yIn = inletLevel(l, fill);
    const basin = waterOf(rig.inletWater?.mesh.material);
    const xLand = l.headX - 0.32 * k;
    if (basin) {
      basin.setFlow(-1, 0, 0.18 * flowK);
      basin.setLook(0.7, 0.04 + 0.03 * flowK, 0.1);
      basin.setSource(0, xLand, 0, 0.35 * k, flowK > 0.02 ? 0.85 * clamp(flowK, 0, 1.2) : 0);
    }
    const sheet = rig.inletSheet;
    now.sheetFall = 0;
    if (sheet) {
      // the sheet runs over the top of the headwall and falls down its face into the basin: the fall is the height of the wall over the water
      const sill = l.headTop;
      const fallH = Math.max(0, sill - yIn);
      const head = flowK > 0.02 ? 0.035 + 0.04 * clamp(flowK, 0, 1.4) : 0;
      const rs = this.rs;
      rs.top = sill + head;
      rs.sill = sill;
      rs.floor = yIn;
      rs.q = head > 0 ? 0.06 * flowK : 0;
      const shape = sheet.set(0, rs);
      sheet.water.advance(3.6 * dt);
      sheet.mesh.visible = shape.visible;
      now.sheetFall = fallH;
    }
    const ie = this.inlet;
    ie.rate = flowK > 0.02 ? clamp(70 * flowK, 0, 110) : 0;
    ie.x = xLand;
    ie.y = yIn + 0.01;
    ie.z = 0;
    ie.hx = 0.1 * k;
    ie.hz = 0.7 * l.Rt;
    ie.vx = -0.35;
    ie.vy = 0.8 + 0.5 * flowK;
    ie.floorY = yIn - 0.005;
    now.inletRate = ie.rate;

    // ---- the outlet: ripples and foam leave the lower end, where the pockets empty into the pool; a wake that carries away
    const yPool = Math.max(BASE_Y + 0.01, l.tailY + s.tailRise);
    const pool = waterOf(rig.poolWater?.mesh.material);
    const xOut = l.Rt * l.sinB + 0.12 * k;
    const drive = flowK * (0.55 + 0.45 * clamp(rpsK * 2, 0, 1));
    if (pool) {
      pool.setFlow(-1, 0, 0.3 * flowK);
      pool.setLook(0.9, 0.05 + 0.1 * flowK, 0.15 + 0.4 * now.murk);
      pool.setSource(0, xOut, 0, 0.45 * k, 0.95 * drive);
      pool.setSource(1, xOut - 0.9 * k, 0, 0.7 * k, 0.45 * drive);
    }
    const oe = this.outlet;
    oe.rate = drive > 0.02 ? clamp(60 * drive, 0, 90) : 0;
    oe.x = xOut;
    oe.y = yPool + 0.01;
    oe.z = 0;
    oe.hx = 0.18 * k;
    oe.hz = 0.55 * l.Rt;
    oe.vx = -0.55;
    oe.vy = 0.85;
    oe.floorY = yPool - 0.005;
    now.outletRate = oe.rate;

    // ---- the leak through the gap: thin streams along the blade tips at the bottom of the trough, in proportion to qGap / flow
    const le = this.leak;
    le.rate = fill > 0.05 ? clamp(2600 * gap, 0, 320) * clamp(flowK, 0, 1.2) : 0;
    // one stream at the tip of every blade that crosses the bottom of the trough (they turn with the screw: a blade is at off + j spacing)
    {
      const sp = l.shape.pitch / BLADES;
      const s0 = 0.7 * k;
      const span = l.L - 1.4 * k;
      le.slots = Math.max(1, Math.round(span / sp));
      const off = -(l.shape.pitch * theta) / (2 * Math.PI) + l.shape.pitch / 2;
      le.phase = ((((off - s0) / sp) % 1) + 1) % 1;
      le.sx = span * l.cosB;
      le.sy = span * l.sinB;
    }
    now.leakRate = le.rate;
    // ---- the overflow: water that spills over the blade tips at the inlet, in proportion to qOver / flow
    const oo = this.over;
    oo.rate = fill > 0.05 ? clamp(900 * over, 0, 140) * clamp(flowK, 0, 1.2) : 0;
    const top = worldPoint(l, l.L - 0.25 * k, 0, 0);
    oo.x = top.x;
    oo.y = inletLevel(l, 1) + 0.015;
    oo.z = 0;
    oo.hx = 0.15 * k;
    oo.hz = 0.6 * l.Rt;
    oo.vx = -0.7;
    oo.vy = 0.7;
    oo.floorY = inletLevel(l, 1) - 0.1;
    now.overRate = oo.rate;

    // ---- the spray: only the drops of the parts that are drawn solid
    this.spray.visible[0] = this.solid('inlet-sill');
    this.spray.visible[1] = this.solid('outlet-pool');
    this.spray.visible[2] = this.solid('trapped-water');
    if (snap) this.spray.clear();
    this.spray.update(dt);
    void view;
  }
}
