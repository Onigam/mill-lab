import * as THREE from 'three';
import { MAT, emissive, mesh } from '@onigam/lab-kit/three';
import { POWERROOM } from '../dims';
import { tubeGeometry } from '../common';
import { mergeStatic } from '../merge';
import { fbm, vnoise } from '../site/materials';
import { warning } from './parts';

// The room round the equipment (scenery, nothing here is a part): a concrete floor with a rubber mat in front of the board, plaster walls, a door in the east wall (ajar), the
// conduit that brings the generator's cable in through the west wall and the cable ladder that takes the supply to the house out through the east wall, a louvre, a fire
// extinguisher, a lamp. The front wall and the ceiling fade out when the camera is outside them (the overview looks into the room from the front); the three others fade when
// the camera is behind them. Maps are small procedural DataTextures (no canvas, no file).

const P = POWERROOM;
const W = P.width;
const D = P.depth;
const H = P.height;
const T = P.wall;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------------------------------------ maps

function dataTexture(
  size: number,
  fill: (u: number, v: number) => [number, number, number],
  repeat = 1,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const [r, g, b] = fill(i / size, j / size);
      const k = (j * size + i) * 4;
      data[k] = Math.max(0, Math.min(255, r));
      data[k + 1] = Math.max(0, Math.min(255, g));
      data[k + 2] = Math.max(0, Math.min(255, b));
      data[k + 3] = 255;
    }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Painted plaster: a warm off-white, mottled, with the faint streaks of a roller. */
const plasterMap = (): THREE.DataTexture =>
  dataTexture(256, (u, w) => {
    const n = fbm(u * 6, w * 6, 4) - 0.5;
    const s = vnoise(u * 90, w * 3) - 0.5;
    const k = 1 + n * 0.16 + s * 0.04;
    return [206 * k, 198 * k, 184 * k];
  });

/** Power-floated concrete with the speckle of the aggregate and saw-cut joints. */
const concreteMap = (): THREE.DataTexture =>
  dataTexture(256, (u, w) => {
    const n = fbm(u * 5, w * 5, 5) - 0.5;
    const sp = vnoise(u * 160, w * 160) > 0.88 ? -22 : 0;
    const joint = Math.abs(u - 0.5) < 0.004 || Math.abs(w - 0.5) < 0.004 ? -28 : 0;
    const k = 1 + n * 0.22;
    return [128 * k + sp + joint, 125 * k + sp + joint, 119 * k + sp + joint];
  });

/** Timber boards for the door: vertical planks with a grain. */
const doorMap = (): THREE.DataTexture =>
  dataTexture(128, (u, w) => {
    const plank = Math.floor(u * 4);
    const edge = Math.abs(((u * 4) % 1) - 0.5) > 0.47 ? 0.6 : 1;
    const grain = fbm(u * 6 + plank * 3.1, w * 1.2, 3);
    const k = (0.75 + 0.4 * grain) * edge;
    return [150 * k, 108 * k, 66 * k];
  });

const std = (color: number, roughness = 0.7, metalness = 0, map?: THREE.Texture): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color: map ? 0xffffff : color, roughness, metalness, ...(map ? { map } : {}) });

// ------------------------------------------------------------------------------------------------ the room

export interface Room {
  group: THREE.Group;
  /** The surfaces that fade with the camera (their opacity is set every frame). */
  fading: THREE.Mesh[];
  lamp: THREE.MeshStandardMaterial;
  light: THREE.PointLight;
  /** Where the conduit and the ladder leave the room, for the flows: from the west gland to the trunking, and from the trunking to the east gland. */
  cableIn: THREE.Vector3[];
  lineOut: THREE.Vector3[];
  door: THREE.Object3D;
  /** The supports of the "no floating part" test: floor, walls, ceiling. */
  supports: THREE.Object3D[];
}

export function buildRoom(trunkTopX: { left: number; right: number; y: number }): Room {
  const group = new THREE.Group();
  group.name = 'room';
  const fading: THREE.Mesh[] = [];
  const supports: THREE.Object3D[] = [];
  const plaster = plasterMap();
  const wallMat = () => std(0xffffff, 0.92, 0, plaster);
  const slabMat = std(0xffffff, 0.95, 0, concreteMap());

  // ---- floor slab (the top of the slab is the floor of the room, y = 0), a plinth under the walls, a step outside the door
  const slab = mesh(new THREE.BoxGeometry(W + 2 * T, 0.14, D + 2 * T), slabMat, [0, -0.07, D / 2]);
  group.add(slab);
  supports.push(slab);
  const zD1 = D - P.door.fromFront;
  const zD0 = zD1 - P.door.width;
  const step = mesh(new THREE.BoxGeometry(0.4, 0.07, P.door.width + 0.2), slabMat.clone(), [
    W / 2 + T + 0.2,
    -0.035,
    (zD0 + zD1) / 2,
  ]);
  group.add(step);
  // skirting
  const skirt = MAT.steelBlack();
  for (const [sx, sz, px, pz] of [
    [W, 0.012, 0, 0.006],
    [0.012, D, -W / 2 + 0.006, D / 2],
  ] as const)
    group.add(mesh(new THREE.BoxGeometry(sx, 0.1, sz), skirt, [px, 0.05, pz]));
  group.add(mesh(new THREE.BoxGeometry(0.012, 0.1, zD0), skirt, [W / 2 - 0.006, 0.05, zD0 / 2]));
  group.add(mesh(new THREE.BoxGeometry(0.012, 0.1, D - zD1), skirt, [W / 2 - 0.006, 0.05, (D + zD1) / 2]));

  // ---- the insulating mat in front of the board, with a yellow edge
  const mat = P.mat;
  group.add(
    mesh(new THREE.BoxGeometry(mat.width, mat.thickness, mat.depth), MAT.rubber(), [
      0,
      mat.thickness / 2,
      0.1 + mat.depth / 2,
    ]),
  );
  for (const z of [0.1 + 0.012, 0.1 + mat.depth - 0.012])
    group.add(
      mesh(new THREE.BoxGeometry(mat.width, mat.thickness + 0.001, 0.02), MAT.warningYellow(), [
        0,
        mat.thickness / 2,
        z,
      ]),
    );

  // ---- walls: the back, west and east ones are plaster; each fades when the camera is behind it
  const wall = (
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    outside: (c: THREE.Vector3) => boolean,
    cast = true,
  ) => {
    const m = wallMat();
    m.transparent = true;
    const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    o.position.set(x, y, z);
    o.castShadow = cast;
    o.receiveShadow = true;
    o.onBeforeRender = (_r, _s, camera) => {
      const hide = outside(camera.position);
      m.opacity = hide ? 0.05 : 1;
      m.depthWrite = !hide;
    };
    group.add(o);
    fading.push(o);
    supports.push(o);
    return o;
  };
  const back = (c: THREE.Vector3) => c.z < 0;
  wall(W + 2 * T, H, T, 0, H / 2, -T / 2, back);
  wall(T, H, D, -W / 2 - T / 2, H / 2, D / 2, (c) => c.x < -W / 2);
  // the east wall with its doorway: a part behind the door, a part in front, the lintel over it
  const east = (c: THREE.Vector3) => c.x > W / 2;
  wall(T, H, zD0, W / 2 + T / 2, H / 2, zD0 / 2, east);
  wall(T, H, D - zD1, W / 2 + T / 2, H / 2, (D + zD1) / 2, east);
  wall(
    T,
    H - P.door.height,
    P.door.width,
    W / 2 + T / 2,
    P.door.height + (H - P.door.height) / 2,
    (zD0 + zD1) / 2,
    east,
  );
  // front wall and ceiling: faded when the camera is in front of the one or above the other (they never cast a shadow: the light comes in)
  wall(W + 2 * T, H, T, 0, H / 2, D + T / 2, (c) => c.z > D, false);
  const ceil = wall(W + 2 * T, 0.12, D + 2 * T, 0, H + 0.06, D / 2, (c) => c.y > H, false);
  ceil.receiveShadow = false;

  // ---- the lamp: a batten under the ceiling and a soft light
  const lamp = emissive(0xfff3d6, 1.1);
  lamp.userData.noShare = true;
  const batten = mesh(new THREE.BoxGeometry(1.2, 0.04, 0.09), lamp, [0, H - 0.02, 1.15]);
  batten.castShadow = false;
  batten.userData.noShadow = true;
  group.add(batten);
  group.add(mesh(new THREE.BoxGeometry(1.26, 0.012, 0.12), MAT.aluDark(), [0, H - 0.006, 1.15]));
  const light = new THREE.PointLight(0xfff0d8, 1.4, 7, 1.6);
  light.position.set(0, H - 0.3, 1.1);
  group.add(light);

  // ---- the doorway: frame, leaf ajar (pivot on the back edge, swinging out), a step, a warning triangle on the outside face
  const dm = std(0xffffff, 0.8, 0, doorMap());
  const frame = std(0x5f4a38, 0.8);
  group.add(
    mesh(new THREE.BoxGeometry(0.1, P.door.height, 0.06), frame, [W / 2 + T / 2, P.door.height / 2, zD0 + 0.03]),
  );
  group.add(
    mesh(new THREE.BoxGeometry(0.1, P.door.height, 0.06), frame, [W / 2 + T / 2, P.door.height / 2, zD1 - 0.03]),
  );
  group.add(
    mesh(new THREE.BoxGeometry(0.1, 0.06, P.door.width), frame, [W / 2 + T / 2, P.door.height + 0.03, (zD0 + zD1) / 2]),
  );
  const door = new THREE.Group();
  door.name = 'door';
  door.position.set(W / 2 + T / 2, 0, zD0);
  door.rotation.y = 0.95;
  const leafW = P.door.width - 0.02;
  door.add(
    mesh(new THREE.BoxGeometry(0.04, P.door.height - 0.03, leafW), dm, [
      0,
      (P.door.height - 0.03) / 2,
      leafW / 2 + 0.01,
    ]),
  );
  for (const y of [0.3, 1.0, 1.7])
    door.add(mesh(new THREE.BoxGeometry(0.01, 0.12, leafW * 0.96), frame, [-0.025, y, leafW / 2 + 0.01]));
  door.add(
    mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.05, 12).rotateZ(Math.PI / 2), MAT.steel(), [
      0.04,
      1.0,
      leafW - 0.07,
    ]),
  );
  door.add(mesh(new THREE.BoxGeometry(0.014, 0.18, 0.04), MAT.steelBlack(), [0.025, 1.0, leafW - 0.07]));
  for (const y of [0.3, 1.8])
    door.add(mesh(new THREE.BoxGeometry(0.012, 0.1, 0.18), MAT.steelBlack(), [0.026, y, 0.1]));
  const sign = warning(0.2, 0, 0, 0);
  sign.rotation.y = Math.PI / 2;
  sign.position.set(0.02, 1.52, leafW * 0.5);
  door.add(sign);
  group.add(door);

  // ---- the incoming cable: through the west wall, along the wall in a PVC conduit, round the corner and along the back wall, down into the trunking
  const pvc = MAT.pvcGrey();
  const yIn = 2.0;
  const zMid = D / 2;
  const conduitPts: THREE.Vector3[][] = [
    [v(-W / 2 + 0.03, yIn, zMid), v(-W / 2 + 0.03, yIn, 0.034)],
    [v(-W / 2 + 0.03, yIn, 0.034), v(trunkTopX.left, yIn, 0.034)],
    [v(trunkTopX.left, yIn, 0.034), v(trunkTopX.left, trunkTopX.y + 0.002, 0.04)],
  ];
  const tube = (a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) => {
    const len = a.distanceTo(b);
    const o = mesh(new THREE.CylinderGeometry(r, r, len, 14), m);
    o.position.copy(a).lerp(b, 0.5);
    o.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize());
    group.add(o);
  };
  for (const [a, b] of conduitPts) tube(a, b, 0.017, pvc);
  for (const c of [conduitPts[1][0], conduitPts[2][0]])
    group.add(mesh(new THREE.SphereGeometry(0.0215, 14, 10), pvc, [c.x, c.y, c.z]));
  // clips every half metre, and the gland flange on the wall
  for (let z = 0.45; z < zMid; z += 0.5)
    group.add(mesh(new THREE.BoxGeometry(0.02, 0.014, 0.034), MAT.steelBlack(), [-W / 2 + 0.014, yIn - 0.02, z]));
  for (let x = -W / 2 + 0.4; x < trunkTopX.left - 0.1; x += 0.5)
    group.add(mesh(new THREE.BoxGeometry(0.034, 0.014, 0.02), MAT.steelBlack(), [x, yIn - 0.02, 0.012]));
  group.add(
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.014, 20).rotateZ(Math.PI / 2), MAT.printGrey(), [
      -W / 2 + 0.007,
      yIn,
      zMid,
    ]),
  );
  group.add(
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 16).rotateZ(Math.PI / 2), MAT.brass(), [
      -W / 2 + 0.034,
      yIn,
      zMid,
    ]),
  );
  // outside: the black cable of the generator comes down along the wall and runs off to the west (it ends here: it goes on to the generator)
  const cablePts = [
    v(-W / 2 - T - 0.02, yIn + 0.0, zMid),
    v(-W / 2 - T - 0.2, yIn - 0.02, zMid),
    v(-W / 2 - T - 0.45, yIn - 0.2, zMid + 0.05),
    v(-W / 2 - T - 0.7, yIn - 0.4, zMid + 0.2),
  ];
  group.add(mesh(tubeGeometry(cablePts, 0.011, 24, 10), MAT.printBlack()));
  group.add(
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16).rotateZ(Math.PI / 2), MAT.brass(), [
      -W / 2 - T - 0.015,
      yIn,
      zMid,
    ]),
  );
  const cableIn = [
    v(-W / 2 - T - 0.7, yIn - 0.4, zMid + 0.2),
    ...cablePts.slice().reverse().slice(1),
    v(-W / 2 + 0.03, yIn, zMid),
    v(-W / 2 + 0.03, yIn, 0.034),
    v(trunkTopX.left, yIn, 0.034),
    v(trunkTopX.left, trunkTopX.y, 0.04),
  ];

  // ---- the line to the house: a cable ladder along the east wall (two rails and rungs) with the cable lying on it, out through the east wall above the door
  const yOut = 2.2;
  const rail = std(0x8e959b, 0.5, 0.7);
  const ladderZ0 = 0.1;
  const ladderZ1 = zMid + 0.05;
  const ladderX = W / 2 - 0.1;
  for (const sx of [-0.06, 0.06])
    group.add(
      mesh(new THREE.BoxGeometry(0.02, 0.03, ladderZ1 - ladderZ0), rail, [
        ladderX + sx,
        yOut - 0.03,
        (ladderZ0 + ladderZ1) / 2,
      ]),
    );
  for (let z = ladderZ0 + 0.03; z < ladderZ1; z += 0.13)
    group.add(mesh(new THREE.BoxGeometry(0.14, 0.012, 0.016), rail, [ladderX, yOut - 0.03, z]));
  for (const z of [0.3, 0.9])
    group.add(mesh(new THREE.BoxGeometry(0.02, 0.14, 0.02), rail, [W / 2 - 0.03, yOut - 0.1, z]));
  group.add(mesh(new THREE.BoxGeometry(0.12, 0.014, 0.03), rail, [W / 2 - 0.06, yOut - 0.1, 0.3]));
  // the cable from the trunking's right end, along the back wall, on to the ladder, out
  const outCable = [
    v(trunkTopX.right, trunkTopX.y, 0.04),
    v(trunkTopX.right + 0.06, yOut + 0.01, 0.05),
    v(ladderX, yOut + 0.0, 0.12),
    v(ladderX, yOut - 0.005, zMid),
    v(W / 2 - 0.01, yOut, zMid),
    v(W / 2 + T + 0.2, yOut - 0.04, zMid),
    v(W / 2 + T + 0.5, yOut - 0.3, zMid + 0.1),
  ];
  group.add(mesh(tubeGeometry(outCable, 0.011, 48, 10), MAT.printBlack()));
  group.add(
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16).rotateZ(Math.PI / 2), MAT.brass(), [
      W / 2 + T + 0.015,
      yOut,
      zMid,
    ]),
  );
  const lineOut = new THREE.CatmullRomCurve3(outCable, false, 'centripetal').getPoints(36);

  // ---- a louvre in the east wall (the ventilation of the battery), a fire extinguisher by the door, a sign on the wall
  const slatMat = MAT.aluDark();
  group.add(mesh(new THREE.BoxGeometry(0.03, 0.46, 0.4), MAT.printGrey(), [W / 2 - 0.015, 1.5, 0.52]));
  for (let i = 0; i < 8; i++) {
    const s = mesh(new THREE.BoxGeometry(0.04, 0.012, 0.36), slatMat, [W / 2 - 0.035, 1.32 + i * 0.05, 0.52]);
    s.rotation.z = -0.5;
    group.add(s);
  }
  const ex = v(W / 2 - 0.07, 0, zD1 + 0.13);
  group.add(mesh(new THREE.BoxGeometry(0.03, 0.4, 0.1), MAT.steelBlack(), [W / 2 - 0.015, 0.7, ex.z]));
  group.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 18), MAT.redPaint(), [ex.x, 0.7, ex.z]));
  group.add(
    mesh(new THREE.SphereGeometry(0.045, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.redPaint(), [ex.x, 0.88, ex.z]),
  );
  group.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), MAT.steelBlack(), [ex.x, 0.935, ex.z]));
  group.add(mesh(new THREE.BoxGeometry(0.05, 0.016, 0.02), MAT.steelBlack(), [ex.x, 0.96, ex.z + 0.02]));
  group.add(
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8).rotateX(Math.PI / 2), MAT.printBlack(), [
      ex.x - 0.04,
      0.8,
      ex.z - 0.06,
    ]),
  );
  const red = MAT.redPaint();
  group.add(mesh(new THREE.BoxGeometry(0.01, 0.22, 0.22), red, [W / 2 - 0.005, 1.35, ex.z]));
  group.add(mesh(new THREE.BoxGeometry(0.012, 0.1, 0.06), MAT.printWhite(), [W / 2 - 0.007, 1.35, ex.z]));

  mergeStatic(group, { name: 'room' });
  return { group, fading, lamp, light, cableIn, lineOut, door, supports };
}
