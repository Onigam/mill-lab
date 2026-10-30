import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Fewer draw calls for the same picture: the static meshes of a model are baked into ONE mesh per material (and per shadow
// flags), in the frame of the object that is merged. A model is built from hundreds of small meshes (bolts, nuts, rings,
// bosses); the renderer pays a draw call for each of them in the colour pass and once more in the shadow pass.
//
// What is merged is decided by the model, not guessed: a subtree that moves or toggles at run time (a lever, an LED, a flap
// of the wind sock) is flagged with `dynamic()` and stays as it is. A group that turns (a spinning rotor) is merged INSIDE
// its own frame: the merged mesh is a child of the group, so it turns with it. Everything else must not change
// after the merge, apart from the transform of the merged root itself (the explode of a part, the relocation of a building).
// `merge.test.ts` proves it: it builds each world twice, with and without merging, drives both through the same states and
// compares every triangle in world space.

/** Tests switch merging off to build the reference model. */
export const MERGE = { enabled: true };

/** Flag a node (and its subtree) as moving, toggled or reshaped at run time: `mergeStatic` leaves it alone. */
export function dynamic<T extends THREE.Object3D>(o: T): T {
  o.userData.dynamic = true;
  return o;
}

export interface MergeOptions {
  /** True for a material the section tool clips (it has its own state: such materials are merged by identity only). */
  isClipped?: (m: THREE.Material) => boolean;
  /** Name given to the merged meshes. */
  name?: string;
  /**
   * Meshes whose materials differ only by their colour are merged too, their colours baked into vertex colours under one
   * shared material (the same pixels, fewer draw calls). Default true; materials the section tool clips are never baked.
   */
  colours?: boolean;
}

export interface MergeResult {
  /** Meshes that were merged away. */
  removed: number;
  /** Meshes that were created. */
  created: number;
}

const NOTHING: MergeResult = { removed: 0, created: 0 };

/** Two materials with the same signature draw the same pixels and may be shared; `undefined` = never share. */
export function materialSignature(m: THREE.Material): string | undefined {
  if (m.type !== 'MeshStandardMaterial') return undefined;
  const s = m as THREE.MeshStandardMaterial;
  if (s.transparent || s.wireframe || s.userData.noShare || s.vertexColors) return undefined;
  return [
    s.color.getHex(),
    s.roughness,
    s.metalness,
    s.emissive.getHex(),
    s.emissiveIntensity,
    s.envMapIntensity,
    s.flatShading,
    s.side,
    s.opacity,
    s.map?.uuid,
    s.normalMap?.uuid,
    s.roughnessMap?.uuid,
    s.metalnessMap?.uuid,
    s.emissiveMap?.uuid,
    s.bumpMap?.uuid,
    s.alphaMap?.uuid,
    s.aoMap?.uuid,
    s.alphaTest,
    s.polygonOffset,
    s.polygonOffsetFactor,
    s.polygonOffsetUnits,
    s.depthWrite,
    s.depthTest,
    s.clippingPlanes?.length ?? 0,
    s.clipShadows,
  ].join('|');
}

/**
 * What makes two opaque, untextured standard materials look alike apart from their colour: such materials can share one
 * material whose colour comes from the vertices. `undefined` = never baked.
 */
export function shapeKey(m: THREE.Material): string | undefined {
  if (m.type !== 'MeshStandardMaterial') return undefined;
  const s = m as THREE.MeshStandardMaterial;
  if (s.transparent || s.wireframe || s.userData.noShare) return undefined;
  if (s.vertexColors && !s.userData.baked) return undefined;
  if (s.map || s.normalMap || s.roughnessMap || s.metalnessMap || s.emissiveMap || s.bumpMap || s.alphaMap || s.aoMap) {
    return undefined;
  }
  if (s.emissive.getHex() !== 0 || s.alphaTest || s.opacity !== 1) return undefined;
  return [
    s.roughness,
    s.metalness,
    s.envMapIntensity,
    s.flatShading,
    s.side,
    s.polygonOffset,
    s.polygonOffsetFactor,
    s.polygonOffsetUnits,
    s.depthWrite,
    s.depthTest,
    s.clippingPlanes?.length ?? 0,
    s.clipShadows,
  ].join('|');
}

const coloured = new Map<string, THREE.MeshStandardMaterial>();

/** The material shared by every mesh of this shape: white, its colour comes from the vertices. */
export function colourMaterial(key: string, like: THREE.Material): THREE.MeshStandardMaterial {
  let m = coloured.get(key);
  if (!m) {
    m = (like as THREE.MeshStandardMaterial).clone();
    m.color.set(0xffffff);
    m.vertexColors = true;
    m.userData = { baked: true };
    m.name = 'baked';
    coloured.set(key, m);
  }
  return m;
}

const defaultBefore = THREE.Object3D.prototype.onBeforeRender;

function mergeable(m: THREE.Mesh): boolean {
  if ((m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.SkinnedMesh).isSkinnedMesh) return false;
  if (Array.isArray(m.material)) return false;
  const u = m.userData;
  if (u.cap || u.keep || u.ownerPart !== undefined) return false;
  if (u.dynamic) return false;
  const mat = m.material;
  if (mat.transparent || ((mat as THREE.MeshStandardMaterial).vertexColors && !mat.userData.baked)) return false;
  const g = m.geometry;
  if (!g.attributes.position || Object.keys(g.morphAttributes).length > 0) return false;
  if (m.onBeforeRender !== defaultBefore) return false;
  if (Object.prototype.hasOwnProperty.call(m, 'raycast')) return false;
  return true;
}

/** Walk down from `root`, skipping what is hidden, flagged dynamic or already registered as a part of its own. */
function collect(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  const visit = (o: THREE.Object3D) => {
    for (const c of o.children) {
      if (!c.visible) continue;
      if (c.userData.keep || c.userData.dynamic) continue;
      if (c !== root && c.userData.partId && c.userData.partId !== root.userData.partId) continue;
      if ((c as THREE.Mesh).isMesh && mergeable(c as THREE.Mesh)) out.push(c as THREE.Mesh);
      visit(c);
    }
  };
  visit(root);
  return out;
}

/**
 * A copy of the geometry with the transform `rel` applied, with the same attributes everywhere (position, normal, uv when `uv`
 * is set, and the vertex colours of `colour` when given) and an index: what `mergeGeometries` needs.
 */
export function bakedGeometry(
  src: THREE.BufferGeometry,
  uv: boolean,
  rel: THREE.Matrix4,
  colour?: THREE.Color,
): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const pos = src.attributes.position;
  g.setAttribute('position', pos.clone());
  if (src.attributes.normal) g.setAttribute('normal', src.attributes.normal.clone());
  if (uv) {
    if (src.attributes.uv) g.setAttribute('uv', src.attributes.uv.clone());
    else g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2));
  }
  if (src.attributes.color) g.setAttribute('color', src.attributes.color.clone());
  else if (colour) {
    // linear values, as the colour of a material is: the vertices then draw what the material drew
    const c = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      c[i * 3] = colour.r;
      c[i * 3 + 1] = colour.g;
      c[i * 3 + 2] = colour.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  if (src.index) g.setIndex(src.index.clone());
  else {
    const n = pos.count;
    const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  g.applyMatrix4(rel);
  if (rel.determinant() < 0) {
    // a mirrored mesh is drawn with the opposite winding by the renderer; baked, the triangles must be flipped
    const idx = g.index!;
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, b);
    }
  }
  return g;
}

/**
 * Merge the static meshes under `root` into one mesh per material, in the frame of `root`. The merged meshes are children
 * of `root`; the groups they came from stay (anchors and animated frames live there). Merge a part BEFORE it is registered
 * (the registry collects the meshes of a part when it is added).
 */
export function mergeStatic(root: THREE.Object3D, opts: MergeOptions = {}): MergeResult {
  if (!MERGE.enabled) return NOTHING;
  root.updateWorldMatrix(true, true);
  const meshes = collect(root);
  if (meshes.length < 2) return NOTHING;
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const rel = new THREE.Matrix4();

  const buckets = new Map<string, { list: THREE.Mesh[]; shape?: string }>();
  for (const m of meshes) {
    const mat = m.material as THREE.Material;
    const clipped = opts.isClipped?.(mat) === true;
    const shape = !clipped && opts.colours !== false ? shapeKey(mat) : undefined;
    const sig = clipped || shape ? undefined : materialSignature(mat);
    const key = [
      shape ? `colour ${shape}` : (sig ?? mat.uuid),
      m.castShadow,
      m.receiveShadow,
      m.renderOrder,
      m.userData.noShadow === true,
      m.frustumCulled,
      m.layers.mask,
    ].join('#');
    const b = buckets.get(key);
    if (b) b.list.push(m);
    else buckets.set(key, { list: [m], shape });
  }

  let removed = 0;
  let created = 0;
  for (const { list, shape } of buckets.values()) {
    if (list.length < 2) continue;
    const uv = list.some((m) => m.geometry.attributes.uv);
    const geos = list.map((m) =>
      bakedGeometry(
        m.geometry,
        uv,
        rel.multiplyMatrices(inverse, m.matrixWorld),
        shape ? (m.material as THREE.MeshStandardMaterial).color : undefined,
      ),
    );
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const first = list[0];
    const out = new THREE.Mesh(
      merged,
      shape ? colourMaterial(shape, first.material as THREE.Material) : first.material,
    );
    out.name = `${opts.name ?? (root.name || 'part')}-merged`;
    out.castShadow = first.castShadow;
    out.receiveShadow = first.receiveShadow;
    out.renderOrder = first.renderOrder;
    out.frustumCulled = first.frustumCulled;
    out.layers.mask = first.layers.mask;
    if (first.userData.noShadow) out.userData.noShadow = true;
    out.userData.merged = list.length;
    for (const m of list) m.parent?.remove(m);
    root.add(out);
    removed += list.length;
    created++;
  }
  return { removed, created };
}
