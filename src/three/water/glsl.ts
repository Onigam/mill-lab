// The GLSL injected into three's MeshStandardMaterial by `surface.ts` (`onBeforeCompile`): nothing here replaces the lighting, the shadows,
// the fog, the clipping planes or the tone mapping of the material; it only decides the albedo, the opacity, the roughness and the normal.
// Four kinds of water:
//   surface  an open sheet seen from above (river, canal, tailrace, pools of the fish pass): ripples that ride the flow, depth tint, Fresnel,
//            soft banks, painted foam, point sources of ripples and foam, standing waves
//   volume   a body of water with a free surface and walls (the pockets of the screw, the basins): the same on the faces that look up,
//            a clean tint on the others, and the thin bright line where the free surface meets a wall (the meniscus)
//   cap      the flat section of a body of water: a tint that deepens with the depth under the free surface, and the meniscus line
//   fall     a sheet of falling water (a nappe, a jet): thin and clear, with streaks of white that grow with the fall

export interface TileSizes {
  t1: number;
  t2: number;
  t3: number;
}

/** Declarations common to the vertex and fragment shaders. */
const COMMON = /* glsl */ `
uniform float uTime;
uniform float uMurk;
uniform vec4 uWave;
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec2 vUvW;
#ifdef WATER_ATTRS
  varying vec4 vFoam;
  varying vec4 vInfo;
#endif
// standing waves downstream of a toe at x = uWave.w: amplitude x, wavelength y, decay length z
float waveAmp( float x ) {
  float s = uWave.w - x;
  return uWave.x * smoothstep( 0.0, 0.7, s ) * exp( - max( s, 0.0 ) / max( uWave.z, 0.1 ) );
}
float waveK() { return 6.2831853 / max( uWave.y, 0.2 ); }
float waveH( float x, float mask ) {
  float s = uWave.w - x;
  return waveAmp( x ) * mask * ( 0.88 + 0.12 * sin( uTime * 2.3 + s * 0.35 ) ) * sin( waveK() * s );
}
float waveDH( float x, float mask ) {
  float s = uWave.w - x;
  return - waveAmp( x ) * mask * waveK() * cos( waveK() * s );
}
`;

export const VERTEX_PARS = /* glsl */ `
${COMMON}
#ifdef WATER_ATTRS
  attribute vec4 aFoam;
  attribute vec4 aInfo;
#endif
`;

/** After `#include <begin_vertex>`. */
export const VERTEX_BODY = /* glsl */ `
vLocal = position;
vUvW = uv;
{
  vec3 nObj = objectNormal;
  #ifdef USE_INSTANCING
    nObj = mat3( instanceMatrix ) * nObj;
  #endif
  vNormalW = normalize( mat3( modelMatrix ) * nObj );
}
#ifdef WATER_ATTRS
  vFoam = aFoam;
  vInfo = aInfo;
  #ifdef WATER_WAVES
    transformed.y += waveH( position.x, aFoam.y );
  #endif
#endif
`;

export const FRAGMENT_PARS = (t: TileSizes, c: Record<string, string>): string => /* glsl */ `
${COMMON}
uniform vec3 uPh;
uniform vec2 uDir;
uniform float uSpeed;
uniform float uAmp;
uniform float uDepth;
uniform float uTurb;
uniform vec4 uFoamK;
uniform vec4 uBox;
uniform vec4 uBank;
uniform vec4 uSrcA;
uniform vec4 uSrcB;
uniform vec3 uLevel;
uniform vec3 uTone;

#define WT1 ${t.t1.toFixed(3)}
#define WT2 ${t.t2.toFixed(3)}
#define WT3 ${t.t3.toFixed(3)}
const vec3 C_SHALLOW = ${c.shallow};
const vec3 C_DEEP = ${c.deep};
const vec3 C_SHALLOW_MURK = ${c.murkShallow};
const vec3 C_DEEP_MURK = ${c.murkDeep};
const vec3 C_FOAM = ${c.foam};
const vec3 C_FOAM_MURK = ${c.foamMurk};
const float W_ABSORB = ${c.absorb};

// a radial source: ripples that leave a point and fade, and the foam round it. s = (x, z, radius, strength)
void waterSource( vec4 s, vec2 p, inout vec2 slope, inout float foam ) {
  if ( s.w <= 0.001 ) return;
  vec2 d = p - s.xy;
  float r = length( d );
  float fade = s.w * exp( - r / max( s.z * 2.2, 0.05 ) );
  float k = 11.0;
  float ph = k * r - uTime * 3.4;
  slope += fade * 0.55 * cos( ph ) * ( d / max( r, 0.03 ) ) * smoothstep( 0.0, 0.25, r );
  foam += s.w * exp( - r / max( s.z * 0.55, 0.04 ) ) * 1.1;
}
`;

/** The surface block: replaces `#include <normal_fragment_maps>` (after `normal_fragment_begin`, before the lighting). */
export const SURFACE_BODY = /* glsl */ `
{
  vec2 p = vLocal.xz;
  vec2 dir = uDir;
  vec2 acr = vec2( - dir.y, dir.x );
  float aa = dot( p, dir );
  float bb = dot( p, acr );
  float st = 1.0 + 0.9 * clamp( uSpeed, 0.0, 1.5 );
  vec4 t1 = texture2D( map, vec2( aa / ( WT1 * st ) - uPh.x, bb / WT1 ) );
  vec4 t2 = texture2D( map, vec2( aa / ( WT2 * st ) - uPh.y, bb / WT2 + 0.31 ) );
  vec4 t3 = texture2D( map, vec2( aa / ( WT3 * st ) - uPh.z, bb / WT3 + 0.57 ) );
  vec2 g = ( ( t1.rg - 0.5 ) * 0.62 + ( t2.rg - 0.5 ) * 0.5 ) * 2.0 * uAmp;
  vec2 slope = g.x * dir + g.y * acr;

  float fs = 1.0;
  #if defined( WATER_VOLUME )
    fs = smoothstep( 0.8, 0.97, vNormalW.y );
  #endif
  float bed = 1.0;
  float shore = 1.0;
  float fm = 0.0;
  #ifdef WATER_ATTRS
    shore = vInfo.x;
    bed = vInfo.y;
    fm = dot( vFoam, uFoamK );
    slope.x += waveDH( p.x, vFoam.y );
  #endif
  // banks (the two long edges of a sheet): soft where the water meets the land, a thin line of foam where it meets a wall
  float dz = min( p.y - uBox.z, uBox.w - p.y );
  fm += uBank.x * ( 1.0 - smoothstep( 0.0, 0.12 + 0.5 * uTurb, dz ) ) * ( 0.35 + 0.65 * t3.a );
  waterSource( uSrcA, p, slope, fm );
  waterSource( uSrcB, p, slope, fm );
  fm += uTurb * 0.22 * t1.a;
  fm *= fs;
  slope *= fs;

  float pat = t3.a * 0.78 + t3.b * 0.26;
  float thr = 1.0 - 0.72 * clamp( fm, 0.0, 1.2 );
  float foam = smoothstep( thr - 0.2, thr + 0.22, pat ) * clamp( fm * 2.2, 0.0, 0.88 );
  foam *= 0.82 + 0.18 * t2.a;
  slope *= 1.0 - 0.7 * foam;

  vec3 nW = normalize( vec3( - slope.x, 1.0, - slope.y ) );
  vec3 nPert = normalize( mat3( viewMatrix ) * nW ) * faceDirection;
  #if defined( WATER_VOLUME )
    normal = normalize( mix( normal, nPert, fs ) );
  #else
    normal = nPert;
  #endif
  vec3 V = normalize( vViewPosition );
  float cosT = clamp( dot( normal, V ), 0.0, 1.0 );
  float F = 0.02 + 0.98 * pow( 1.0 - cosT, 5.0 );

  // what the water does to the light: the deeper, the more it is its own colour and the less the bed shows
  float depth = uDepth * ( 0.35 + 0.65 * bed ) * ( 0.8 + 0.4 * t1.a );
  float T = exp( - depth * W_ABSORB * ( 1.0 + 1.8 * uMurk ) );
  vec3 shallowC = mix( C_SHALLOW, C_SHALLOW_MURK, uMurk );
  vec3 deepC = mix( C_DEEP, C_DEEP_MURK, uMurk );
  vec3 body = mix( shallowC, deepC, smoothstep( 0.0, 0.9, 1.0 - T ) ) * uTone;
  float alphaBody = clamp( ( 1.0 - T ) * 0.95 + 0.12, 0.0, 0.97 );
  alphaBody = alphaBody + ( 1.0 - alphaBody ) * F;
  #if defined( WATER_VOLUME )
    // a volume keeps its own colour and opacity (the kit drives the opacity); its free surface only gains the Fresnel reflection
    body = mix( diffuseColor.rgb, mix( C_SHALLOW_MURK, C_DEEP_MURK, 0.5 ), uMurk * 0.8 );
    alphaBody = 1.0;
    diffuseColor.a += ( 1.0 - diffuseColor.a ) * F * fs * 0.8;
  #endif
  alphaBody *= mix( 0.35, 1.0, shore );

  vec3 foamC = mix( C_FOAM, C_FOAM_MURK, uMurk ) * uTone;
  diffuseColor.rgb = mix( body, foamC, foam );
  diffuseColor.a *= mix( alphaBody, 0.93, foam );
  roughnessFactor = mix( roughnessFactor, 0.9, foam );

  #if defined( WATER_VOLUME ) || defined( WATER_CAP )
    // the meniscus: the thin bright line where the free surface meets a wall, at a constant width on the screen
    float lvl = dot( vLocal.xy, uLevel.xy ) - uLevel.z;
    float wpx = fwidth( lvl );
    float men = 1.0 - smoothstep( 0.6 * wpx, 1.6 * wpx + 0.002, abs( lvl ) );
    #if defined( WATER_VOLUME )
      men *= 1.0 - fs;
    #endif
    men *= step( 0.5, uLevel.x * uLevel.x + uLevel.y * uLevel.y );
    diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.93, 0.99, 1.0 ), men );
    diffuseColor.a = max( diffuseColor.a, men * 0.7 );
    totalEmissiveRadiance += vec3( 0.26, 0.31, 0.33 ) * men;
  #endif
}
`;

/** The flat section of a body of water: deepens below the free surface. Used with the meniscus of the surface block. */
export const CAP_BODY = /* glsl */ `
{
  float lvl = dot( vLocal.xy, uLevel.xy ) - uLevel.z;
  float below = clamp( - lvl / 0.42, 0.0, 1.0 );
  vec3 top = mix( C_SHALLOW, C_SHALLOW_MURK, uMurk );
  vec3 bot = mix( C_DEEP, C_DEEP_MURK, uMurk );
  diffuseColor.rgb = mix( top, bot, smoothstep( 0.0, 1.0, below ) ) * uTone;
  float wpx = fwidth( lvl );
  float men = 1.0 - smoothstep( 0.6 * wpx, 1.6 * wpx + 0.002, abs( lvl ) );
  men *= step( 0.5, uLevel.x * uLevel.x + uLevel.y * uLevel.y );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.95, 1.0, 1.0 ), men );
  totalEmissiveRadiance += vec3( 0.34, 0.4, 0.42 ) * men;
}
`;

/** A falling sheet: `vUvW` is in metres (across, along the ribbon), `vInfo` = (thickness m, aeration 0..1, length of the fall m, arc position of the lip m). */
export const FALL_BODY = /* glsl */ `
{
  float thick = vInfo.x;
  if ( thick < 0.0008 ) discard;
  float aer = vInfo.y;
  float len = max( vInfo.z, 0.05 );
  float along = clamp( ( vUvW.y - vInfo.w ) / len, 0.0, 1.0 );
  vec4 t = texture2D( map, vec2( vUvW.x / 0.55, vUvW.y / 3.2 - uPh.x ) );
  vec4 u = texture2D( map, vec2( vUvW.x / 1.7 + 0.37, vUvW.y / 5.5 - uPh.y * 0.8 ) );
  float streak = t.b * 0.55 + t.a * 0.5 + u.a * 0.3 - 0.1;
  float aerated = clamp( aer * ( 0.12 + 1.05 * along ), 0.0, 1.0 );
  float white = smoothstep( 0.78 - 0.62 * aerated, 1.02 - 0.62 * aerated, streak );
  // thin water is nearly clear; a thick sheet shows its own colour; streaks of air are white
  float glass = clamp( thick * 16.0, 0.16, 0.72 );
  float lat = smoothstep( 0.0, 0.05, vUvW.x ) ;
  vec3 clearC = mix( vec3( 0.56, 0.82, 0.9 ), vec3( 0.52, 0.45, 0.33 ), uMurk * 0.8 );
  diffuseColor.rgb = mix( clearC, mix( C_FOAM, C_FOAM_MURK, uMurk ), white ) * uTone;
  diffuseColor.a *= mix( glass, 0.9, white ) * ( 1.0 - 0.15 * along * 0.0 );
  roughnessFactor = mix( 0.08, 0.7, white );
  // the lip of the sheet is smooth: fade the first few centimetres in
  diffuseColor.a *= smoothstep( 0.0, 0.03, vUvW.y );
  // a trace of ripple across the sheet so that the glint is not a mirror
  vec3 nn = normal;
  nn.xy += ( t.rg - 0.5 ) * 0.07;
  normal = normalize( nn );
}
`;

/** The vertex and fragment code of the spray (a PointsMaterial patched for a size and an alpha per particle). */
export const SPRAY_VERTEX_PARS = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
`;
export const SPRAY_VERTEX_BODY = /* glsl */ `
vAlpha = aAlpha;
gl_PointSize *= aSize;
`;
export const SPRAY_FRAGMENT_PARS = /* glsl */ `
varying float vAlpha;
`;
export const SPRAY_FRAGMENT_BODY = /* glsl */ `
diffuseColor.a *= vAlpha;
`;
