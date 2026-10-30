import * as THREE from 'three';
import { softDotTexture } from '../common';
import { SPRAY_FRAGMENT_BODY, SPRAY_FRAGMENT_PARS, SPRAY_VERTEX_BODY, SPRAY_VERTEX_PARS } from './glsl';

// Spray and foam particles: drops thrown where water lands or leaks (the toe of the weir, the jet of the notch, the cascades of the fish pass,
// the inlet and the outlet of the screw, the leak through the gap, the overflow over the blade tips). A fixed ring buffer of at most `max`
// particles (600 per world: the budget), written in place: nothing is allocated after the build. The number of drops a second of each emitter
// is set every frame by the code of the world from the state (the unit discharge over the weir, `flow`, `qGap`, `qOver`), so the spray is
// proportional to the model's own numbers; where each drop goes is decorative (a seeded scatter).
//
// The points are an unregistered `THREE.Points` (like the flow dots): the section tool clips them behind its plane (`CutKit.clip`), and the
// world hides the drops of a part that is not drawn solid (`visible[owner]`).

export interface Emitter {
  /** Centre and half extent of the box the drops start in, m (the frame of the scene). */
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
  /** The drops start along a segment from (x, y, z) to (x + sx, y + sy, z + sz), in the box above (a line of a tilted screw). */
  sx: number;
  sy: number;
  sz: number;
  /** When above 0: a drop dies this far under where it started (a short stream) instead of at `floorY`. */
  floorBelow: number;
  /** When above 0: the drops start at `slots` evenly spaced points of the segment (the tips of the blades), shifted by `phase` slots. */
  slots: number;
  phase: number;
  /** Mean velocity and scatter (m/s). */
  vx: number;
  vy: number;
  vz: number;
  scatter: number;
  /** Drops a second now: set by the caller every frame. */
  rate: number;
  /** Size of a drop (m), life (s), the level under which a drop dies, gravity (m/s²), peak opacity. */
  size: number;
  life: number;
  floorY: number;
  gravity: number;
  alpha: number;
  /** Which `visible` slot says whether the drops of this emitter are drawn. */
  owner: number;
  carry: number;
}

export type EmitterSpec = Partial<Emitter>;

const DEFAULT: Emitter = {
  x: 0,
  y: 0,
  z: 0,
  hx: 0,
  hy: 0,
  hz: 0,
  sx: 0,
  sy: 0,
  sz: 0,
  floorBelow: 0,
  slots: 0,
  phase: 0,
  vx: 0,
  vy: 1,
  vz: 0,
  scatter: 0.4,
  rate: 0,
  size: 0.05,
  life: 1,
  floorY: -1e9,
  gravity: 9.81,
  alpha: 0.8,
  owner: 0,
  carry: 0,
};

export interface SprayOptions {
  max?: number;
  color?: number;
  seed?: number;
}

export class Spray {
  readonly object: THREE.Points;
  readonly emitters: Emitter[] = [];
  /** One flag per owner slot: false hides the drops of the emitters that point at it. */
  readonly visible: boolean[] = [true];
  readonly max: number;
  private head = 0;
  private alive = 0;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly size: Float32Array;
  private readonly peak: Float32Array;
  private readonly owner: Uint8Array;
  private readonly floor: Float32Array;
  private readonly grav: Float32Array;
  private readonly aSize: Float32Array;
  private readonly aAlpha: Float32Array;
  private readonly geometry: THREE.BufferGeometry;
  private seed: number;

  constructor(opts: SprayOptions = {}) {
    const max = opts.max ?? 600;
    this.max = max;
    this.seed = opts.seed ?? 12345;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max);
    this.life = new Float32Array(max);
    this.size = new Float32Array(max);
    this.peak = new Float32Array(max);
    this.owner = new Uint8Array(max);
    this.floor = new Float32Array(max).fill(-1e9);
    this.grav = new Float32Array(max);
    this.aSize = new Float32Array(max);
    this.aAlpha = new Float32Array(max);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.aSize, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.aAlpha, 1));
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const mat = new THREE.PointsMaterial({
      color: opts.color ?? 0xffffff,
      size: 1, // the size of a drop is in metres in the `aSize` attribute
      sizeAttenuation: true,
      map: softDotTexture(),
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${SPRAY_VERTEX_PARS}`)
        .replace('#include <logdepthbuf_vertex>', `${SPRAY_VERTEX_BODY}\n#include <logdepthbuf_vertex>`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${SPRAY_FRAGMENT_PARS}`)
        .replace('#include <map_particle_fragment>', `#include <map_particle_fragment>\n${SPRAY_FRAGMENT_BODY}`);
    };
    mat.customProgramCacheKey = () => 'water-spray';
    this.object = new THREE.Points(this.geometry, mat);
    this.object.name = 'spray';
    this.object.frustumCulled = false;
    this.object.renderOrder = 6;
    this.object.userData.noShadow = true;
    this.object.castShadow = false;
  }

  private readonly r = (): number => {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  };

  /** Add an emitter (its rate is 0 until the caller sets it). */
  add(spec: EmitterSpec): Emitter {
    const e = { ...DEFAULT, ...spec };
    this.emitters.push(e);
    return e;
  }

  /** Drops alive now. */
  get count(): number {
    return this.alive;
  }

  private emit(e: Emitter): void {
    const i = this.head;
    this.head = (this.head + 1) % this.max;
    const r = this.r;
    const t = e.slots > 0 ? ((((Math.floor(r() * e.slots) + e.phase) / e.slots) % 1) + 1) % 1 : r();
    this.pos[i * 3] = e.x + t * e.sx + (r() * 2 - 1) * e.hx;
    this.pos[i * 3 + 1] = e.y + t * e.sy + (r() * 2 - 1) * e.hy;
    this.pos[i * 3 + 2] = e.z + t * e.sz + (r() * 2 - 1) * e.hz;
    this.vel[i * 3] = e.vx + (r() * 2 - 1) * e.scatter;
    this.vel[i * 3 + 1] = e.vy + (r() * 2 - 1) * e.scatter * 0.6;
    this.vel[i * 3 + 2] = e.vz + (r() * 2 - 1) * e.scatter;
    this.age[i] = 0;
    this.life[i] = e.life * (0.6 + 0.8 * r());
    this.size[i] = e.size * (0.6 + 0.8 * r());
    this.peak[i] = e.alpha * (0.6 + 0.4 * r());
    this.owner[i] = e.owner;
    this.floor[i] = e.floorBelow > 0 ? this.pos[i * 3 + 1] - e.floorBelow : e.floorY;
    this.grav[i] = e.gravity;
  }

  /** Emit what the emitters say, then move every drop. */
  update(dtIn: number): void {
    const dt = Math.min(Math.max(dtIn, 0), 0.05);
    for (const e of this.emitters) {
      e.carry += e.rate * dt;
      // never more than a third of the ring in one frame (a long frame must not wipe the older drops)
      let n = Math.min(Math.floor(e.carry), Math.floor(this.max / 3));
      e.carry -= n;
      if (!(e.rate > 0)) {
        e.carry = 0;
        n = 0;
      }
      while (n-- > 0) this.emit(e);
    }
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      const life = this.life[i];
      if (life <= 0) continue;
      this.age[i] += dt;
      const a = this.age[i];
      const p = i * 3;
      this.vel[p + 1] -= this.grav[i] * dt;
      this.pos[p] += this.vel[p] * dt;
      this.pos[p + 1] += this.vel[p + 1] * dt;
      this.pos[p + 2] += this.vel[p + 2] * dt;
      if (a >= life || this.pos[p + 1] < this.floor[i]) {
        this.life[i] = 0;
        this.aAlpha[i] = 0;
        this.aSize[i] = 0;
        continue;
      }
      const u = a / life;
      // quick in, slow out; the drop swells a little as it thins into foam
      const fade = Math.min(1, a / 0.07) * (1 - u * u);
      this.aAlpha[i] = this.visible[this.owner[i]] === false ? 0 : this.peak[i] * fade;
      this.aSize[i] = this.size[i] * (0.8 + 0.7 * u);
      alive++;
    }
    this.alive = alive;
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Forget every drop (a world that was rebuilt, a test). */
  clear(): void {
    this.life.fill(0);
    this.aAlpha.fill(0);
    this.aSize.fill(0);
    this.alive = 0;
  }
}
