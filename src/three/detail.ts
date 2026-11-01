import * as THREE from 'three';

// Near detail that keeps a view from feeling empty, without adding shimmer (the picture rule of the lab kit, docs/lab-quality.md
// §3): wear on the parts and contact shadows on the paper floors. Procedural only (no texture file, no asset). Every pattern drawn
// in a shader fades out before a cell of it gets under about two pixels (its frequency is compared with the screen derivative of
// its coordinate): it adds detail close up and nothing that could crawl from afar. The same code as the Pelton and ram pump labs'
// `detail.ts`, without their grass and stones.

/** GLSL: value noise, a 3D blend of it, and the fade of a pattern by its size on screen. */
const NOISE_GLSL = /* glsl */ `
  float dtHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
  float dtNoise( vec2 p ) {
    vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
    float a = dtHash( i ), b = dtHash( i + vec2( 1.0, 0.0 ) ), c = dtHash( i + vec2( 0.0, 1.0 ) ), d = dtHash( i + vec2( 1.0, 1.0 ) );
    return mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y ) * 2.0 - 1.0;
  }
  float dtNoise3( vec3 p ) { return 0.35 * ( dtNoise( p.xy ) + dtNoise( p.yz + 17.3 ) ) + 0.3 * dtNoise( p.zx - 9.1 ); }
  // 1 while a cell of the pattern spans more than ~3 pixels, 0 once it is under ~1.2
  float dtKeep( float cellsPerPixel ) { return 1.0 - smoothstep( 0.33, 0.8, cellsPerPixel ); }
`;

/** Chain a shader edit after a material's own `onBeforeCompile`, and give the program its own cache key. */
function patch(
  mat: THREE.Material,
  key: string,
  edit: (shader: THREE.WebGLProgramParametersWithUniforms) => void,
): void {
  const before = mat.onBeforeCompile;
  const keyBefore = mat.customProgramCacheKey.bind(mat);
  mat.onBeforeCompile = (shader, renderer) => {
    before.call(mat, shader, renderer);
    edit(shader);
  };
  mat.customProgramCacheKey = () => `${keyBefore()}|${key}`;
  mat.needsUpdate = true;
}

// ------------------------------------------------------------------------------------------------ wear

/**
 * Wear on the solid parts under `root`: a slow variation of colour and roughness, as no made part is one flat colour. In each
 * mesh's own coordinates, so it moves with the part (explode, the rotor's turn). `freq`: cells per metre of the variation (a
 * hillside 3, a bench 60). Transparent materials and the ones `skip` names are left alone. A material may ask for its own wear
 * in `userData.wear`: `tint` (the colour of its stains) and `amount` (1 by default).
 */
export function applyWear(root: THREE.Object3D, freq: number, skip: (m: THREE.Mesh) => boolean = () => false): void {
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || skip(m)) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std.isMeshStandardMaterial || std.transparent || seen.has(std) || std.userData.worn) continue;
      seen.add(std);
      std.userData.worn = true;
      const metal = std.metalness > 0.5;
      const wear = (std.userData.wear ?? {}) as { tint?: [number, number, number]; amount?: number };
      const tint = wear.tint ?? [1.03, 0.99, 0.92];
      const amount = wear.amount ?? 1;
      const tintGlsl = `vec3( ${tint.map((v) => v.toFixed(3)).join(', ')} )`;
      patch(std, `wear-${freq}-${metal ? 'metal' : 'matte'}-${tint.join('-')}-${amount}`, (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vDtObj;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDtObj = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\nvarying vec3 vDtObj;\n${NOISE_GLSL}`)
          .replace(
            '#include <color_fragment>',
            /* glsl */ `#include <color_fragment>
            vec3 dtP = vDtObj * ${freq.toFixed(3)};
            float dtCpp = length( fwidth( dtP ) );
            float dtN = ${amount.toFixed(3)} * ( dtNoise3( dtP ) * dtKeep( dtCpp ) + 0.5 * dtNoise3( dtP * 3.1 + 5.0 ) * dtKeep( dtCpp * 3.1 ) );
            diffuseColor.rgb *= 1.0 + ${metal ? '0.05' : '0.08'} * dtN;
            diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * ${tintGlsl}, ${metal ? '0.10' : '0.18'} * smoothstep( 0.2, 0.8, dtN ) );`,
          )
          .replace(
            '#include <roughnessmap_fragment>',
            /* glsl */ `#include <roughnessmap_fragment>
            roughnessFactor = clamp( roughnessFactor * ( 1.0 + ${metal ? '0.1' : '0.12'} * dtN ), 0.04, 1.0 );`,
          );
      });
    }
  });
}

// ------------------------------------------------------------------------------------------------ contact shadows

/**
 * The darker border on a floor around what stands on it (the ambient light the floor does not get next to a body): a footprint
 * of `w` by `d` metres, centred, fading over `falloff`. Multiplied over the floor. Lay it between the floor and the body's
 * underside: in front of the floor by depth alone, behind the body's foot, so the body always covers it. Inside the footprint
 * it darkens nothing, so a pixel of the body's foot that it might reach is never darkened. Not a part: no shadow, no picking.
 */
export function contactShadow(w: number, d: number, falloff: number, strength = 0.45): THREE.Mesh {
  const N = 128;
  const W = w + 2 * falloff;
  const D = d + 2 * falloff;
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const dx = Math.max(0, Math.abs(((i + 0.5) / N - 0.5) * W) - w / 2);
      const dz = Math.max(0, Math.abs(((j + 0.5) / N - 0.5) * D) - d / 2);
      // 0 inside the footprint, rising over the first fifth of the falloff, then fading: no hard dark line at the body's foot,
      // which would draw a strong edge that crawls as the camera moves
      const t = dx > 0 || dz > 0 ? Math.hypot(dx, dz) / falloff : 0;
      const rise = Math.min(1, t / 0.2);
      const a = t > 0 ? rise * rise * (3 - 2 * rise) * Math.max(0, 1 - t) : 0;
      const v = strength * a;
      const k = (j * N + i) * 4;
      // a warm darkening, as the ink of the shadows (not a grey)
      data[k] = Math.round(255 * (1 - v));
      data[k + 1] = Math.round(255 * (1 - v * 0.96));
      data[k + 2] = Math.round(255 * (1 - v * 0.9));
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    blending: THREE.MultiplyBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    toneMapped: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  m.name = 'contact-shadow';
  m.userData.noShadow = true;
  m.raycast = () => {};
  return m;
}
