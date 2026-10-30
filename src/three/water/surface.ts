import * as THREE from 'three';
import { WATER_FX } from '../dims';
import { CAP_BODY, FALL_BODY, FRAGMENT_PARS, SURFACE_BODY, VERTEX_BODY, VERTEX_PARS } from './glsl';

// The water material. It is a MeshStandardMaterial (so the kit's isolate, ghost, X-ray and section modes drive it as they drive every part:
// they swap the material for the ghost one, and the section sets `clippingPlanes`, `side` and `needsUpdate`) patched through
// `onBeforeCompile`: the lighting, the shadows, the fog, the clipping and the tone mapping stay three's. The patch decides the albedo, the
// opacity (the kit's `opacity` still multiplies it), the roughness and the normal; see glsl.ts. The ripples come from the one procedural
// noise texture of the world (noise.ts), sampled at three scales and advected along the flow of the body, at its surface speed.

export type WaterKind = 'surface' | 'volume' | 'cap' | 'fall';

/** The uniforms shared by every water material of a world: the clock of the shaders and how murky the river is (a flood). */
export interface WaterShared {
  time: THREE.IUniform<number>;
  murk: THREE.IUniform<number>;
}

export const makeShared = (): WaterShared => ({ time: { value: 0 }, murk: { value: 0 } });

export interface WaterUniforms {
  uPh: THREE.IUniform<THREE.Vector3>;
  uDir: THREE.IUniform<THREE.Vector2>;
  uSpeed: THREE.IUniform<number>;
  uAmp: THREE.IUniform<number>;
  uDepth: THREE.IUniform<number>;
  uTurb: THREE.IUniform<number>;
  uFoamK: THREE.IUniform<THREE.Vector4>;
  uBox: THREE.IUniform<THREE.Vector4>;
  uBank: THREE.IUniform<THREE.Vector4>;
  uSrcA: THREE.IUniform<THREE.Vector4>;
  uSrcB: THREE.IUniform<THREE.Vector4>;
  uWave: THREE.IUniform<THREE.Vector4>;
  uLevel: THREE.IUniform<THREE.Vector3>;
  uTone: THREE.IUniform<THREE.Vector3>;
  uTime: THREE.IUniform<number>;
  uMurk: THREE.IUniform<number>;
}

export interface WaterOptions {
  kind?: WaterKind;
  /** The world's noise texture (noise.ts): the material takes a clone of it, so that its phase is its own. */
  noise: THREE.Texture;
  shared: WaterShared;
  /** Base colour (volumes show it on the faces that do not look up), opacity (kit's), roughness of calm water. */
  color?: number;
  opacity?: number;
  roughness?: number;
  /** The geometry has the `aFoam` and `aInfo` attributes (a sheet made by `WaterBody`, a nappe). */
  attrs?: boolean;
  /** Standing waves (the vertices are lifted in the vertex shader by `uWave`). */
  waves?: boolean;
  /** Draw order. */
  order?: number;
}

const tiles = WATER_FX.tiles;
const lspeed = WATER_FX.layerSpeed;

/** Tile of the legacy streak texture, m: the first layer's phase is exposed as `map.offset.x` in tiles of this size (the site tests read it). */
export const TILE = 5;

/** Everything the code of a world sets on one water material, with the maths of the advection. */
export class WaterHandle {
  readonly kind: WaterKind;
  readonly u: WaterUniforms;
  private legacy = 0;
  /** Metres the surface pattern has travelled along its flow. */
  travelled = 0;

  constructor(
    readonly material: THREE.MeshStandardMaterial,
    kind: WaterKind,
    uniforms: WaterUniforms,
    private readonly map: THREE.Texture,
  ) {
    this.kind = kind;
    this.u = uniforms;
  }

  /** The direction of the flow in the plan (x, z), and the speed of the surface, m/s. */
  setFlow(dx: number, dz: number, speed: number): void {
    const l = Math.hypot(dx, dz) || 1;
    this.u.uDir.value.set(dx / l, dz / l);
    this.u.uSpeed.value = speed;
  }

  /** Carry the ripples `d` metres along the flow. The stretch of the pattern along the flow grows with the speed, so the metres are divided by it. */
  advance(d: number): void {
    this.travelled += d;
    const st = 1 + 0.9 * Math.min(1.5, Math.max(0, this.u.uSpeed.value));
    const ph = this.u.uPh.value;
    ph.x = (((ph.x + (d / (tiles[0] * st)) * lspeed[0]) % 1) + 1) % 1;
    ph.y = (((ph.y + (d / (tiles[1] * st)) * lspeed[1]) % 1) + 1) % 1;
    ph.z = (((ph.z + (d / (tiles[2] * st)) * lspeed[2]) % 1) + 1) % 1;
    // the legacy phase of the first tile (5 m): the streak test of the site reads it
    this.legacy = (((this.legacy + d / TILE) % 1) + 1) % 1;
    this.map.offset.x = this.legacy;
  }

  /** The apparent depth of the water, m (the tint and the opacity), and the roughness of its surface (ripple slope scale). */
  setLook(depth: number, amp: number, turb = 0): void {
    this.u.uDepth.value = depth;
    this.u.uAmp.value = amp;
    this.u.uTurb.value = turb;
  }

  setFoam(a: number, b = 0, c = 0, d = 0): void {
    this.u.uFoamK.value.set(a, b, c, d);
  }

  /** The rectangle of the sheet in the plan, for the banks, and the foam strength along its long edges. */
  setBanks(x0: number, x1: number, z0: number, z1: number, foam: number): void {
    this.u.uBox.value.set(x0, x1, z0, z1);
    this.u.uBank.value.x = foam;
  }

  /** A radial source of ripples and foam: slot 0 or 1, (x, z) in the frame of the mesh, radius m, strength 0 .. 1. */
  setSource(slot: 0 | 1, x: number, z: number, radius: number, strength: number): void {
    (slot === 0 ? this.u.uSrcA : this.u.uSrcB).value.set(x, z, radius, strength);
  }

  /** Standing waves behind a toe at x: amplitude m, wavelength m, decay length m. */
  setWaves(amplitude: number, x: number, wavelength = WATER_FX.waves.wavelength, decay = WATER_FX.waves.decay): void {
    this.u.uWave.value.set(amplitude, wavelength, decay, x);
  }

  /** The meniscus: the line of the free surface in the frame of the mesh, `dx x + dy y = c`. */
  setLevel(dx: number, dy: number, c: number): void {
    this.u.uLevel.value.set(dx, dy, c);
  }
}

const lin = (hex: number): string => {
  const c = new THREE.Color(hex);
  return `vec3( ${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)} )`;
};

const COLOURS = Object.fromEntries(Object.entries({ ...WATER_FX.colours }).map(([k, v]) => [k, lin(v)])) as Record<
  keyof typeof WATER_FX.colours,
  string
>;

const CONSTS: Record<string, string> = { ...COLOURS, absorb: WATER_FX.absorb.toFixed(3) };

/** The handle of a water material (a water material carries it in `userData.water`). */
export const waterOf = (m: THREE.Material | THREE.Material[] | undefined): WaterHandle | undefined =>
  m && !Array.isArray(m) ? (m.userData.water as WaterHandle | undefined) : undefined;

/** A patched MeshStandardMaterial for a body of water. The handle is `material.userData.water`. */
export function createWaterMaterial(
  o: WaterOptions,
): THREE.MeshStandardMaterial & { userData: { water: WaterHandle } } {
  const kind = o.kind ?? 'surface';
  const map = o.noise.clone();
  // a clone shares the pixels of the original (one upload for all); it only needs a version above zero to be bound
  map.version = Math.max(1, o.noise.version);
  const mat = new THREE.MeshStandardMaterial({
    color: o.color ?? 0x4d9fd1,
    roughness: o.roughness ?? 0.12,
    metalness: 0,
    envMapIntensity: 1,
    transparent: true,
    opacity: o.opacity ?? 1,
    depthWrite: false,
    side: THREE.DoubleSide,
    map,
  });
  const u: WaterUniforms = {
    uPh: { value: new THREE.Vector3() },
    uDir: { value: new THREE.Vector2(-1, 0) },
    uSpeed: { value: 0 },
    uAmp: { value: WATER_FX.ripple.quiet },
    uDepth: { value: 1 },
    uTurb: { value: 0 },
    uFoamK: { value: new THREE.Vector4() },
    uBox: { value: new THREE.Vector4(-1e5, 1e5, -1e5, 1e5) },
    uBank: { value: new THREE.Vector4(0, 0.4, 0, 0) },
    uSrcA: { value: new THREE.Vector4() },
    uSrcB: { value: new THREE.Vector4() },
    uWave: { value: new THREE.Vector4(0, WATER_FX.waves.wavelength, WATER_FX.waves.decay, 0) },
    uLevel: { value: new THREE.Vector3() },
    uTone: { value: new THREE.Vector3(1, 1, 1) },
    uTime: o.shared.time,
    uMurk: o.shared.murk,
  };
  const body = kind === 'fall' ? FALL_BODY : kind === 'cap' ? CAP_BODY : SURFACE_BODY;
  mat.defines = {
    ...mat.defines,
    ...(kind === 'volume' ? { WATER_VOLUME: '' } : {}),
    ...(kind === 'cap' ? { WATER_CAP: '' } : {}),
    ...(o.attrs ? { WATER_ATTRS: '' } : {}),
    ...(o.waves ? { WATER_WAVES: '' } : {}),
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\n${FRAGMENT_PARS({ t1: tiles[0], t2: tiles[1], t3: tiles[2] }, CONSTS)}`,
      )
      .replace('#include <map_fragment>', '')
      .replace('#include <normal_fragment_maps>', body);
  };
  mat.customProgramCacheKey = () => `water-${kind}${o.attrs ? '-a' : ''}${o.waves ? '-w' : ''}`;
  if (o.order !== undefined) mat.userData.order = o.order;
  const handle = new WaterHandle(mat, kind, u, map);
  mat.userData.water = handle;
  return mat as THREE.MeshStandardMaterial & { userData: { water: WaterHandle } };
}
