import * as THREE from 'three';
import type { PartRegistry } from '@onigam/lab-kit/three';
import { capAcross, type Rect } from './geometry';

// The section of the `generator` world ("Coupe"): a QUARTER of the machine is taken away, the part in front of the plane through the axis (z > 0) AND beyond the plane across it
// (x > x0). What is left shows both faces of the cut at once: the plane through the axis (z = 0, for x > x0) and the plane across the axis (x = x0, for z > 0). Both planes
// follow a part when it is exploded (they are moved with it, along x), so the exploded parts are cut in the same place.
//
// Clipping is three's own (`clippingPlanes` with `clipIntersection`, shadows included). The kit's picking skips a hit when ANY plane of the material clips it; for an
// intersection that is wrong (the front-left half of the machine would not be pickable), so the planes of a part are an array whose `some` is `every`: a hit is skipped
// only when the quarter takes it away. Flat caps close what is cut (a clipped solid would show its inside), drawn from the 2D sections of the parts, `docs/3d.md`.

class QuarterPlanes extends Array<THREE.Plane> {
  /** The kit asks `some(plane clips the point)`; the quarter clips a point that both planes clip. */
  override some(fn: (p: THREE.Plane, i: number, a: THREE.Plane[]) => unknown): boolean {
    return this.length > 0 && this.every(fn);
  }
}

/** Cap colours (the colour of the material the cap stands for, a little greyer: the steel of a section is bright). */
export const CAP = {
  frame: 0x6b8196,
  steel: 0x8b9199,
  lamination: 0x7d848c,
  copper: 0xd2792f,
  magnetN: 0xb6392f,
  magnetS: 0x3469b4,
  shaft: 0xe4e7ea,
  nickel: 0xcfd3d8,
  brass: 0xd8b04a,
  enclosure: 0xe6e8e5,
  insulation: 0x45484d,
  lead: 0x2d3034,
} as const;

export interface Unit {
  readonly partId: string;
  /** Add the section through the axis (rectangles x0, x1, y0, y1 in the plane z = 0) to `parent`. */
  along(parent: THREE.Object3D, rects: Rect[], colour: number): THREE.Mesh;
  /** Add arbitrary shapes of the plane through the axis (x, y), for the round things: a ball. */
  alongShapes(parent: THREE.Object3D, shapes: THREE.Shape[], colour: number): THREE.Mesh;
  /** Add a section across the axis (shapes in the plane of `extrudeX`) to `parent`, at x = `x`. */
  across(parent: THREE.Object3D, shapes: THREE.Shape | THREE.Shape[], colour: number, x?: number): THREE.Mesh;
  /** A cap that the animation shows and hides itself (a magnet that turns through the plane): along the axis, never shown by the tool on its own. */
  dynamic(parent: THREE.Object3D, rects: Rect[], colour: number): THREE.Mesh;
}

interface UnitState {
  partId: string;
  offset: () => number;
  /** Removes x > x0 + offset (with the z plane: the quarter); keeps x >= x0 + offset (the caps along the axis). */
  xCut: THREE.Plane;
  xKeep: THREE.Plane;
  planes: QuarterPlanes;
  materials: Map<THREE.Material, THREE.Side>;
  caps: { mesh: THREE.Mesh; dynamic: boolean }[];
}

export class QuarterCut {
  /** Removes z > 0, and keeps z >= 0 for the caps across the axis. */
  private readonly zCut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private readonly zKeep = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private readonly units: UnitState[] = [];
  private on: boolean | undefined;
  private readonly capMaterials = new Map<string, THREE.MeshStandardMaterial>();

  constructor(
    /** The plane across the axis, x, in the frame of the world at rest. */
    readonly x0: number,
  ) {}

  private capMaterial(colour: number, kind: 'along' | 'across', u: UnitState): THREE.MeshStandardMaterial {
    const key = `${u.partId}|${kind}|${colour}|${this.units.indexOf(u)}`;
    let m = this.capMaterials.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
      m.polygonOffset = true;
      m.polygonOffsetFactor = -2;
      m.polygonOffsetUnits = -2;
      m.clippingPlanes = kind === 'along' ? [u.xKeep] : [this.zKeep];
      this.capMaterials.set(key, m);
    }
    return m;
  }

  /**
   * The materials under `root` are cut by the quarter. `offset()` is how far `root` has moved along x since the world at rest (an exploded part), so that its planes move
   * with it. Meshes of caps and dots are left alone. Call it after the merges, and register nothing twice.
   */
  unit(partId: string, root: THREE.Object3D, offset: () => number): Unit {
    const u: UnitState = {
      partId,
      offset,
      xCut: new THREE.Plane(new THREE.Vector3(-1, 0, 0), this.x0),
      xKeep: new THREE.Plane(new THREE.Vector3(1, 0, 0), -this.x0),
      planes: new QuarterPlanes(),
      materials: new Map(),
      caps: [],
    };
    u.planes.push(this.zCut, u.xCut);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.userData.cap) return;
      const mat = m.material as THREE.Material;
      if (!u.materials.has(mat)) u.materials.set(mat, mat.side);
    });
    this.units.push(u);
    const cap = (
      parent: THREE.Object3D,
      geo: THREE.BufferGeometry,
      kind: 'along' | 'across',
      colour: number,
      dynamic: boolean,
    ) => {
      const mesh = new THREE.Mesh(geo, this.capMaterial(colour, kind, u));
      mesh.userData.cap = true;
      mesh.userData.ownerPart = partId;
      mesh.userData.noShadow = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.visible = false;
      mesh.frustumCulled = false;
      parent.add(mesh);
      u.caps.push({ mesh, dynamic });
      return mesh;
    };
    const alongGeo = (rects: Rect[]) => {
      const shapes = rects.map(([x0, x1, y0, y1]) => {
        const s = new THREE.Shape();
        s.moveTo(x0, y0);
        s.lineTo(x1, y0);
        s.lineTo(x1, y1);
        s.lineTo(x0, y1);
        s.closePath();
        return s;
      });
      return new THREE.ShapeGeometry(shapes);
    };
    return {
      partId,
      along: (parent, rects, colour) => cap(parent, alongGeo(rects), 'along', colour, false),
      alongShapes: (parent, shapes, colour) => cap(parent, new THREE.ShapeGeometry(shapes, 12), 'along', colour, false),
      across: (parent, shapes, colour, x = this.x0) => {
        const g = capAcross(shapes);
        g.translate(x, 0, 0);
        return cap(parent, g, 'across', colour, false);
      },
      dynamic: (parent, rects, colour) => cap(parent, alongGeo(rects), 'along', colour, true),
    };
  }

  /** Apply the tool every frame: move the planes with their parts, switch the materials when the tool changes, show the caps of the parts that are drawn solid. */
  update(on: boolean, registry: PartRegistry | null): void {
    const change = on !== this.on;
    this.on = on;
    for (const u of this.units) {
      const dx = u.offset();
      u.xCut.constant = this.x0 + dx;
      u.xKeep.constant = -(this.x0 + dx);
      if (change) {
        for (const [mat, side] of u.materials) {
          mat.clippingPlanes = on ? u.planes : [];
          mat.clipIntersection = on;
          mat.clipShadows = on;
          mat.side = on ? THREE.DoubleSide : side;
          mat.needsUpdate = true;
        }
      }
      const part = registry?.get(u.partId);
      const solid = !part || part.display === 'solid';
      for (const c of u.caps) if (!c.dynamic) c.mesh.visible = on && solid;
    }
  }

  /** Whether the caps of a part may be shown now (the animation of the dynamic caps asks). */
  showing(partId: string, registry: PartRegistry | null): boolean {
    const part = registry?.get(partId);
    return this.on === true && (!part || part.display === 'solid');
  }
}
