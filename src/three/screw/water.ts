import * as THREE from 'three';
import { COLOURS } from '../dims';
import { waterMaterial } from '../common';

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

/** The translucent water of the section, brighter than the volume so that the cut reads. */
export const capWater = (): THREE.MeshStandardMaterial => {
  const m = waterMaterial(0.8, COLOURS.waterDeep);
  m.polygonOffset = true;
  m.polygonOffsetFactor = -3;
  m.polygonOffsetUnits = -3;
  return m;
};

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
