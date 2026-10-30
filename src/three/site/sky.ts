import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { clamp, lerp } from '@onigam/lab-kit/three';
import { DEG, SCENERY } from '../dims';
import { smoothstep } from '../common';

// Sky dome (Preetham + clouds, stars at night), the sun and the moon as one directional light whose shadow box follows
// a point of the field, a hemisphere fill and the fog. The sun is driven by the simulated clock (MillState.hour and .day), at the
// declination of the day of the year and a latitude of 45.5 degrees north, a choice of the lab (the sources do not say where the
// mill is). Ported from the Piggott lab, itself from the ram lab (docs/kit-requests.md).

const LAT = 45.5 * DEG;
const NOON = 13.9; // local clock time of solar noon (summer time: the lab starts on 1 October)

/** Declination of the sun on a day of the year (0 = 1 January), radians. */
export const declination = (day: number): number => -23.44 * DEG * Math.cos((2 * Math.PI * (day + 10)) / 365);

/** Sun direction (unit; X east, Y up, Z south) for a clock hour and a day of the year. */
export function sunDirection(hour: number, day = 273, out = new THREE.Vector3()): THREE.Vector3 {
  const DECL = declination(day);
  const H = (hour - NOON) * 15 * DEG;
  const east = -Math.cos(DECL) * Math.sin(H);
  const north = Math.sin(DECL) * Math.cos(LAT) - Math.cos(DECL) * Math.sin(LAT) * Math.cos(H);
  const up = Math.sin(DECL) * Math.sin(LAT) + Math.cos(DECL) * Math.cos(LAT) * Math.cos(H);
  return out.set(east, up, -north).normalize();
}

function injectNight(sky: Sky): void {
  const m = sky.material;
  m.uniforms.uNight = { value: 0 };
  const hook = 'gl_FragColor = vec4( texColor, 1.0 );';
  if (!m.fragmentShader.includes(hook)) return;
  m.fragmentShader = m.fragmentShader.replace('void main() {', 'uniform float uNight;\nvoid main() {').replace(
    hook,
    /* glsl */ `
      {
        float up = max(direction.y, 0.0);
        vec3 nightCol = mix(vec3(0.010, 0.016, 0.040), vec3(0.0025, 0.004, 0.012), pow(up, 0.6));
        vec3 sd = direction * 260.0;
        vec3 cell = floor(sd);
        float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float star = step(0.9965, h) * smoothstep(0.45, 0.05, length(fract(sd) - 0.5));
        star *= smoothstep(0.02, 0.25, up) * (0.5 + 0.5 * fract(h * 91.7));
        texColor = mix(texColor, nightCol + vec3(star) * 0.9, uNight);
      }
      ${hook}`,
  );
}

/** Equirectangular sky-and-ground gradient used as the environment (reflections on pipes, water, metal). */
function envTexture(): THREE.DataTexture {
  const W = 64;
  const H = 32;
  const data = new Uint8Array(W * H * 4);
  const stops: [number, [number, number, number]][] = [
    [0, [111, 156, 208]],
    [0.42, [188, 210, 230]],
    [0.5, [217, 226, 228]],
    [0.53, [110, 122, 82]],
    [1, [58, 58, 44]],
  ];
  for (let j = 0; j < H; j++) {
    const t = j / (H - 1);
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0] = stops[k];
    const [t1, c1] = stops[k + 1];
    const f = clamp((t - t0) / (t1 - t0), 0, 1);
    for (let i = 0; i < W; i++) {
      const o = (j * W + i) * 4;
      data[o] = lerp(c0[0], c1[0], f);
      data[o + 1] = lerp(c0[1], c1[1], f);
      data[o + 2] = lerp(c0[2], c1[2], f);
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export interface SkyRig {
  sun: THREE.DirectionalLight;
  /** 0 = full day, 1 = deep night. */
  night: number;
  update(hour: number, time: number, day?: number): void;
  /** Aim the shadow box at a point with a half-size (metres). */
  focusShadow(focus: THREE.Vector3, half: number): void;
}

export function createSky(scene: THREE.Scene): SkyRig {
  const sky = new Sky();
  sky.name = 'sky';
  sky.scale.setScalar(9000);
  sky.frustumCulled = false;
  const u = sky.material.uniforms;
  u.turbidity.value = 3.6;
  u.rayleigh.value = 1.3;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  if (u.cloudCoverage) {
    u.cloudCoverage.value = 0.36;
    u.cloudDensity.value = 0.55;
    u.cloudElevation.value = 0.45;
    u.cloudScale.value = 0.00022;
  }
  injectNight(sky);
  scene.add(sky);

  scene.environment = envTexture();
  scene.fog = new THREE.FogExp2(0xc6d4e0, SCENERY.fogDensity);

  const sun = new THREE.DirectionalLight(0xfff2e0, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 900;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.05;
  // softer shadows: a wider filter and a lighter shadow, as a paper-like light has
  sun.shadow.radius = 2.2;
  sun.shadow.intensity = 0.86;
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xbcd3ee, 0x4a4a32, 0.9);
  scene.add(hemi);

  const sunDir = new THREE.Vector3(0, 1, 0);
  const moonDir = new THREE.Vector3(-0.35, 0.8, 0.45).normalize();
  const warm = new THREE.Color(0xffa860);
  const white = new THREE.Color(0xfff3e2);
  const moonCol = new THREE.Color(0x9fb4d8);
  const fogDay = new THREE.Color(0xc4d3e2);
  const fogDusk = new THREE.Color(0xd8b49a);
  const fogNight = new THREE.Color(0x0b1222);
  const hemiDay = new THREE.Color(0xbcd3ee);
  const hemiNight = new THREE.Color(0x3a4f80);

  const focus = new THREE.Vector3(30, 20, -60);
  const lightDir = new THREE.Vector3(0, 1, 0);
  let half = 120;
  const right = new THREE.Vector3();
  const upv = new THREE.Vector3();
  const snapped = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);

  const place = () => {
    // snap the focus to the shadow texels in light space so the shadows do not swim while the camera orbits
    right.crossVectors(worldUp, lightDir).normalize();
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    upv.crossVectors(lightDir, right).normalize();
    const texel = (2 * half) / 2048;
    const a = Math.round(focus.dot(right) / texel) * texel;
    const b = Math.round(focus.dot(upv) / texel) * texel;
    const c = focus.dot(lightDir);
    snapped.set(0, 0, 0).addScaledVector(right, a).addScaledVector(upv, b).addScaledVector(lightDir, c);
    sun.target.position.copy(snapped);
    sun.position.copy(snapped).addScaledVector(lightDir, 400);
    sun.target.updateMatrixWorld();
  };

  const rig: SkyRig = {
    sun,
    night: 0,
    update(hour, time, dayOfYear = 273) {
      sunDirection(hour, dayOfYear, sunDir);
      const alt = Math.asin(clamp(sunDir.y, -1, 1));
      const day = smoothstep(-7 * DEG, 3 * DEG, alt);
      const low = 1 - smoothstep(4 * DEG, 25 * DEG, alt);
      rig.night = 1 - day;
      u.sunPosition.value.copy(sunDir);
      u.uNight.value = smoothstep(-2 * DEG, -10 * DEG, alt);
      if (u.time) u.time.value = time;
      const sunI = 3.3 * smoothstep(-1 * DEG, 6 * DEG, alt) * (1 - 0.45 * low);
      const moonI = 0.9 * (1 - day);
      if (sunI >= moonI) {
        lightDir.copy(sunDir);
        sun.color.copy(white).lerp(warm, low);
        sun.intensity = sunI;
      } else {
        lightDir.copy(moonDir);
        sun.color.copy(moonCol);
        sun.intensity = moonI;
      }
      place();
      hemi.intensity = lerp(0.42, 1.0, day) * lerp(1, 0.75, low * day);
      hemi.color.copy(hemiNight).lerp(hemiDay, day);
      scene.environmentIntensity = lerp(0.16, 0.55, day);
      (scene.fog as THREE.FogExp2).color
        .copy(fogNight)
        .lerp(fogDay, day)
        .lerp(fogDusk, low * day * 0.6);
    },
    focusShadow(f, h) {
      const level = Math.max(8, Math.pow(1.3, Math.round(Math.log(h) / Math.log(1.3))));
      focus.copy(f);
      if (level !== half) {
        half = level;
        const cam = sun.shadow.camera;
        cam.left = -half;
        cam.right = half;
        cam.top = half;
        cam.bottom = -half;
        cam.updateProjectionMatrix();
      }
      place();
    },
  };
  half = 120;
  const cam = sun.shadow.camera;
  cam.left = -half;
  cam.right = half;
  cam.top = half;
  cam.bottom = -half;
  rig.update(10, 0);
  return rig;
}
