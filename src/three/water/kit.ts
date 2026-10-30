import * as THREE from 'three';
import { COLOURS } from '../dims';
import { waterNoise } from './noise';
import { createWaterMaterial, makeShared, type WaterHandle, type WaterShared } from './surface';

// What a world needs to make water: the noise texture (generated once per world, about 20 ms), the uniforms the materials share, and the four
// kinds of material. A world builds its kit first and hands it to its builders.

export type WaterMat = THREE.MeshStandardMaterial & { userData: { water: WaterHandle } };

export interface WaterKit {
  noise: THREE.Texture;
  shared: WaterShared;
  /** Open water seen from above (the grid sheets of the river, the canal, the pools). `waves` lifts the vertices for the standing waves. */
  surface(o?: { waves?: boolean }): WaterMat;
  /** A sheet of falling water (a nappe, a jet, a cascade). */
  fall(): WaterMat;
  /** A body of water with a free surface and walls (the pockets of the screw, the basins). */
  volume(o?: { opacity?: number; color?: number }): WaterMat;
  /** The flat section of a body of water. */
  cap(): WaterMat;
}

export function waterKit(): WaterKit {
  const noise = waterNoise();
  const shared = makeShared();
  return {
    noise,
    shared,
    surface: (o = {}) =>
      createWaterMaterial({ kind: 'surface', noise, shared, attrs: true, waves: o.waves, color: COLOURS.water }),
    fall: () => {
      const m = createWaterMaterial({ kind: 'fall', noise, shared, attrs: true, color: COLOURS.water });
      m.polygonOffset = true;
      m.polygonOffsetFactor = -1;
      m.polygonOffsetUnits = -1;
      return m;
    },
    volume: (o = {}) => {
      const m = createWaterMaterial({
        kind: 'volume',
        noise,
        shared,
        color: o.color ?? COLOURS.water,
        opacity: o.opacity ?? 0.5,
      });
      m.userData.noShare = true;
      return m;
    },
    cap: () => {
      const m = createWaterMaterial({ kind: 'cap', noise, shared, color: COLOURS.waterDeep, opacity: 0.85 });
      m.polygonOffset = true;
      m.polygonOffsetFactor = -3;
      m.polygonOffsetUnits = -3;
      m.userData.noShare = true;
      return m;
    },
  };
}
