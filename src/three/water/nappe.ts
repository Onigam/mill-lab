import * as THREE from 'three';
import { G } from '../../sim/machine';
import { type WaterHandle, waterOf } from './surface';

// The nappe: the sheet of water that leaves a crest and falls free. One mesh holds several ribbons (the two spans of the weir, the jet of the
// notch, the little cascades of the fish pass), each a mid-surface of two columns that follows the real trajectory of the water:
//   the head over the sill H gives the critical depth y_c = 2/3 H and the speed at the lip v0 = sqrt(g y_c);
//   a drop of fall height d takes t = sqrt(2 d / g) and carries the water v0 t away from the face (x = lip - v0 t, y = y_lip - g t^2 / 2);
//   the unit discharge q (m²/s) over the speed gives the thickness of the sheet, which the material turns into its opacity and its air.
// The positions are rewritten when the state moves; nothing is allocated after the build.

export interface RibbonSpec {
  /** x of the lip (the downstream face of the sill) and the span in z. The water flows towards -X. */
  x: number;
  z0: number;
  z1: number;
  /** Length of the film that runs over the sill towards the lip, m. */
  film?: number;
}

export interface RibbonState {
  /** Level of the water over the sill (the pond), the level of the sill's top, and the level the sheet falls to (the water below), m. */
  top: number;
  sill: number;
  floor: number;
  /** Unit discharge, m²/s (flow over the width of the span). */
  q: number;
}

/** What the geometry of a ribbon says about its sheet (for the spray, the foam and the tests). */
export interface RibbonShape {
  /** Head over the sill, critical depth, speed at the lip, m, m, m/s. */
  head: number;
  depth: number;
  v0: number;
  /** x where the sheet lands, the height it falls, its thickness at the middle of the fall, m. */
  landX: number;
  fall: number;
  thickness: number;
  visible: boolean;
}

const TMP = new THREE.Vector3();
const FALL_ROWS = 14;
const ROWS = FALL_ROWS + 2;

export class Nappes {
  readonly mesh: THREE.Mesh;
  readonly water: WaterHandle;
  readonly shapes: RibbonShape[];
  private readonly pos: Float32Array;
  private readonly nor: Float32Array;
  private readonly uv: Float32Array;
  private readonly info: Float32Array;
  private readonly cache: number[][];
  private readonly px = new Float64Array(ROWS);
  private readonly py = new Float64Array(ROWS);
  private readonly arc = new Float64Array(ROWS);

  constructor(
    readonly specs: RibbonSpec[],
    material: THREE.MeshStandardMaterial,
    name = 'nappe',
  ) {
    const w = waterOf(material);
    if (!w) throw new Error('Nappes needs a water material');
    this.water = w;
    const n = specs.length * ROWS * 2;
    this.pos = new Float32Array(n * 3);
    this.nor = new Float32Array(n * 3);
    this.uv = new Float32Array(n * 2);
    this.info = new Float32Array(n * 4);
    this.cache = specs.map(() => [Number.NaN, 0, 0, 0]);
    this.shapes = specs.map((s) => ({
      head: 0,
      depth: 0,
      v0: 0,
      landX: s.x,
      fall: 0,
      thickness: 0,
      visible: false,
    }));
    const index = new Uint16Array(specs.length * (ROWS - 1) * 6);
    let k = 0;
    specs.forEach((_s, r) => {
      for (let i = 0; i + 1 < ROWS; i++) {
        const a = (r * ROWS + i) * 2;
        const b = a + 1;
        const d = a + 2;
        const c = d + 1;
        // facing downstream (-x) on the fall, up on the film
        index[k++] = a;
        index[k++] = c;
        index[k++] = b;
        index[k++] = a;
        index[k++] = d;
        index[k++] = c;
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2));
    g.setAttribute('aInfo', new THREE.BufferAttribute(this.info, 4));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    g.boundingBox = new THREE.Box3();
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e3);
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.name = name;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.userData.noShadow = true;
    this.mesh.userData.water = this;
    this.mesh.renderOrder = 3;
    this.mesh.frustumCulled = false;
    specs.forEach((_s, i) => this.set(i, { top: 0, sill: 0, floor: 0, q: 0 }));
  }

  /** Lay ribbon `i` for a state: the trajectory, the thickness, the aeration. Returns the shape. */
  set(i: number, s: RibbonState): RibbonShape {
    const spec = this.specs[i];
    const shape = this.shapes[i];
    const c = this.cache[i];
    if (
      Math.abs(c[0] - s.top) < 1e-6 &&
      Math.abs(c[1] - s.sill) < 1e-6 &&
      Math.abs(c[2] - s.floor) < 1e-6 &&
      Math.abs(c[3] - s.q) < 1e-7
    )
      return shape;
    c[0] = s.top;
    c[1] = s.sill;
    c[2] = s.floor;
    c[3] = s.q;
    const head = Math.max(0, s.top - s.sill);
    const yc = (2 / 3) * head;
    const v0 = Math.sqrt(G * yc);
    const yLip = s.sill + 0.5 * yc;
    const fall = Math.max(0, yLip - s.floor);
    const visible = head > 0.006 && fall > 0.03 && s.q > 1e-5;
    const T = Math.sqrt((2 * fall) / G);
    const film = spec.film ?? 0.9;
    const px = this.px;
    const py = this.py;
    const arc = this.arc;
    for (let k = 0; k < ROWS; k++) {
      if (k === 0) {
        px[0] = spec.x + film;
        py[0] = Math.max(s.top - 0.15 * yc, yLip);
      } else if (k === 1) {
        px[1] = spec.x;
        py[1] = yLip;
      } else {
        const t = (T * (k - 1)) / (ROWS - 2);
        px[k] = spec.x - v0 * t;
        py[k] = yLip - 0.5 * G * t * t;
      }
      arc[k] = k === 0 ? 0 : arc[k - 1] + Math.hypot(px[k] - px[k - 1], py[k] - py[k - 1]);
    }
    // the thickness at the middle of the fall (the continuity q = v t) and the air the sheet takes in
    const vEnd = Math.sqrt(v0 * v0 + 2 * G * fall);
    const vMid = Math.sqrt(v0 * v0 + G * fall);
    const thickness = visible ? Math.min(0.6, s.q / Math.max(vMid, 0.3)) : 0;
    // air entrained: more where the sheet is thick and the fall long (a decorative law, bounded to 0 .. 1)
    const aer = visible ? Math.min(1, 0.25 + 1.6 * s.q + 0.18 * fall + (vEnd > 3 ? 0.1 : 0)) : 0;
    const lipS = arc[1];
    const fallLen = Math.max(0.05, arc[ROWS - 1] - lipS);
    for (let k = 0; k < ROWS; k++) {
      // tangent (central difference) and the normal that faces downstream
      const k0 = Math.max(0, k - 1);
      const k1 = Math.min(ROWS - 1, k + 1);
      let tx = px[k1] - px[k0];
      let ty = py[k1] - py[k0];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      for (let col = 0; col < 2; col++) {
        const v = (i * ROWS + k) * 2 + col;
        const z = col === 0 ? spec.z0 : spec.z1;
        this.pos[v * 3] = px[k];
        this.pos[v * 3 + 1] = py[k];
        this.pos[v * 3 + 2] = z;
        this.nor[v * 3] = ty;
        this.nor[v * 3 + 1] = -tx;
        this.nor[v * 3 + 2] = 0;
        this.uv[v * 2] = z - spec.z0;
        this.uv[v * 2 + 1] = arc[k];
        this.info[v * 4] = thickness;
        this.info[v * 4 + 1] = aer;
        this.info[v * 4 + 2] = fallLen;
        this.info[v * 4 + 3] = lipS;
      }
    }
    shape.head = head;
    shape.depth = yc;
    shape.v0 = v0;
    shape.landX = spec.x - v0 * T;
    shape.fall = fall;
    shape.thickness = thickness;
    shape.visible = visible;
    for (const name of ['position', 'normal', 'uv', 'aInfo'] as const)
      (this.mesh.geometry.attributes[name] as THREE.BufferAttribute).needsUpdate = true;
    this.bounds();
    return shape;
  }

  /** The box of the geometry, over the ribbons that are drawn (what the part that holds them is framed by). */
  private bounds(): void {
    const box = this.mesh.geometry.boundingBox!.makeEmpty();
    const p = this.pos;
    for (let i = 0; i < this.specs.length; i++) {
      if (!this.shapes[i].visible) continue;
      for (let v = i * ROWS * 2; v < (i + 1) * ROWS * 2; v++)
        box.expandByPoint(TMP.set(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]));
    }
    if (box.isEmpty()) {
      const sp = this.specs[0];
      box.set(new THREE.Vector3(sp.x, 0, sp.z0), new THREE.Vector3(sp.x, 0, sp.z1));
    }
  }

  /** True when any ribbon is drawn. */
  get any(): boolean {
    return this.shapes.some((s) => s.visible);
  }

  get triangles(): number {
    return this.specs.length * (ROWS - 1) * 2;
  }
}
