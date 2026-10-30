import * as THREE from 'three';
import { MAT, emissive, group, mesh } from '@onigam/lab-kit/three';
import { SITE } from '../dims';
import { dynamic, mergeStatic } from '../merge';

// The three buildings of the site: the mill (stone, a tile roof), the small powerhouse (open on the front, so that the cabinet, the battery and the
// inverter inside can be seen) and the house the electricity feeds (windows and a wall lamp that light up). Frame of each: origin on the ground at
// the middle, +Z = south (the front, towards the visitor), the ridge along X.

interface Gabled {
  length: number;
  width: number;
  wallHeight: number;
  ridge: number;
}

/** Walls, gable ends and a two-slab roof over a footprint; returns the group (its meshes are not merged yet). */
function gabled(g: THREE.Group, o: Gabled, wall: THREE.Material, roof: THREE.Material, base = 0): void {
  const { length: L, width: W, wallHeight: H, ridge } = o;
  g.add(mesh(new THREE.BoxGeometry(L, H, W), wall, [0, base + H / 2, 0]));
  const gable = new THREE.Shape();
  gable.moveTo(-W / 2, 0);
  gable.lineTo(W / 2, 0);
  gable.lineTo(0, ridge);
  gable.closePath();
  for (const sx of [-1, 1]) {
    const gm = mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.04, bevelEnabled: false }), wall);
    gm.rotation.y = Math.PI / 2;
    gm.position.set(sx * (L / 2 - 0.02), base + H, 0);
    g.add(gm);
  }
  const slope = Math.atan2(ridge, W / 2);
  const slab = Math.hypot(W / 2, ridge) + 0.5;
  for (const sz of [-1, 1]) {
    const s = mesh(new THREE.BoxGeometry(L + 0.8, 0.12, slab), roof);
    s.position.set(0, base + H + ridge / 2 - 0.03, (sz * W) / 4 - sz * 0.12);
    s.rotation.x = sz * slope;
    g.add(s);
  }
}

export interface Building {
  group: THREE.Group;
  anchor: THREE.Object3D;
}

export function buildMill(): Building {
  const m = SITE.mill;
  const g = group('mill');
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.95 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x9a4b34, roughness: 0.85 });
  g.add(mesh(new THREE.BoxGeometry(m.length + 0.5, 0.3, m.width + 0.5), MAT.concrete(), [0, 0.1, 0]));
  gabled(g, m, stone, roof, 0.25);
  const frame = MAT.woodDark();
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c3a46, roughness: 0.3, metalness: 0.2 });
  // south front (towards the visitor): a cart door and two rows of windows
  const z = m.width / 2 + 0.03;
  g.add(mesh(new THREE.BoxGeometry(2.2, 3, 0.1), frame, [-m.length / 2 + 2.4, 0.25 + 1.5, z]));
  for (const x of [-1.2, 1.2, 3.6]) {
    for (const y of [1.6, 4.4]) {
      g.add(mesh(new THREE.BoxGeometry(1.05, 1.35, 0.1), frame, [x, 0.25 + y, z]));
      g.add(mesh(new THREE.BoxGeometry(0.85, 1.15, 0.12), dark, [x, 0.25 + y, z + 0.02]));
    }
  }
  // loading door and its hoist beam in the east gable (towards the powerhouse)
  g.add(mesh(new THREE.BoxGeometry(0.1, 1.5, 1.2), frame, [m.length / 2 + 0.03, 0.25 + m.wallHeight - 1.6, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.16, 0.16), frame, [m.length / 2 + 0.4, 0.25 + m.wallHeight + 0.9, 0]));
  // chimney on the ridge
  g.add(
    mesh(new THREE.BoxGeometry(0.9, 2.4, 0.9), stone, [
      -m.length / 2 + 2,
      0.25 + m.wallHeight + m.ridge * 0.7,
      -m.width / 4,
    ]),
  );
  mergeStatic(g, { name: 'mill' });
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 0.25 + m.wallHeight + m.ridge + 0.6, 0);
  g.add(anchor);
  return { group: g, anchor };
}

export interface Powerhouse extends Building {
  led: THREE.MeshStandardMaterial;
  /** Where the line to the house leaves, and where the cable of the chamber arrives (frame of the building). */
  out: THREE.Vector3;
  inn: THREE.Vector3;
}

export function buildPowerhouse(): Powerhouse {
  const p = SITE.powerhouse;
  const g = group('powerhouse');
  const L = p.length;
  const W = p.width;
  const H = p.wallHeight;
  const wall = new THREE.MeshStandardMaterial({ color: 0xb4ad9d, roughness: 0.95 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x4d5257, roughness: 0.8 });
  g.add(mesh(new THREE.BoxGeometry(L + 0.3, 0.14, W + 0.3), MAT.concrete(), [0, 0.07, 0]));
  // back wall and the two side walls (the front is open)
  g.add(mesh(new THREE.BoxGeometry(L, H, 0.14), wall, [0, 0.14 + H / 2, -W / 2 + 0.07]));
  for (const sx of [-1, 1])
    g.add(mesh(new THREE.BoxGeometry(0.14, H, W), wall, [sx * (L / 2 - 0.07), 0.14 + H / 2, 0]));
  // flat roof with a slight slope towards the front, a lintel over the opening
  const r = mesh(new THREE.BoxGeometry(L + 0.5, 0.12, W + 0.5), roof, [0, 0.14 + H + 0.06, 0]);
  r.rotation.x = 0.05;
  g.add(r);
  g.add(mesh(new THREE.BoxGeometry(L, 0.3, 0.14), wall, [0, 0.14 + H - 0.15, W / 2 - 0.07]));
  // inside: the cabinet on the back wall, the 48 V battery on the floor, the inverter on the wall
  g.add(mesh(new THREE.BoxGeometry(0.7, 1.7, 0.4), MAT.enclosureGrey(), [-L * 0.28, 0.14 + 0.85, -W / 2 + 0.34]));
  g.add(mesh(new THREE.BoxGeometry(0.04, 1.5, 0.02), MAT.printBlack(), [-L * 0.28, 0.14 + 0.9, -W / 2 + 0.55]));
  g.add(
    mesh(new THREE.BoxGeometry(0.7, 0.42, 0.45), new THREE.MeshStandardMaterial({ color: 0x38424a, roughness: 0.55 }), [
      0.05 * L,
      0.14 + 0.21,
      -W / 2 + 0.45,
    ]),
  );
  g.add(
    mesh(new THREE.BoxGeometry(0.7, 0.42, 0.45), new THREE.MeshStandardMaterial({ color: 0x38424a, roughness: 0.55 }), [
      0.05 * L,
      0.14 + 0.64,
      -W / 2 + 0.45,
    ]),
  );
  const inverter = mesh(new THREE.BoxGeometry(0.6, 0.45, 0.2), MAT.victronBlue(), [
    L * 0.3,
    0.14 + 1.25,
    -W / 2 + 0.24,
  ]);
  g.add(inverter);
  const led = emissive(0x4fe07a, 0);
  led.userData.noShare = true;
  const lamp = mesh(new THREE.SphereGeometry(0.03, 10, 8), led, [L * 0.3 + 0.2, 0.14 + 1.35, -W / 2 + 0.36]);
  dynamic(lamp);
  g.add(lamp);
  mergeStatic(g, { name: 'powerhouse' });
  const anchor = new THREE.Object3D();
  anchor.position.set(0.6, 0.14 + 2.0, W / 2 - 0.2);
  g.add(anchor);
  return {
    group: g,
    anchor,
    led,
    out: new THREE.Vector3(L / 2, 0.14 + H - 0.2, 0),
    inn: new THREE.Vector3(-L / 2, 0.14 + H - 0.4, 0),
  };
}

export interface House extends Building {
  /** Panes of the windows and the bulb of the lamp: `emissiveIntensity` is animated. */
  panes: THREE.MeshStandardMaterial;
  bulb: THREE.MeshStandardMaterial;
  light: THREE.PointLight;
  /** Where the line arrives (frame of the house). */
  inn: THREE.Vector3;
}

export function buildHouse(): House {
  const h = SITE.house;
  const g = group('house');
  const stone = new THREE.MeshStandardMaterial({ color: 0xa79f90, roughness: 0.95 });
  const roof = MAT.slate();
  const wood = MAT.woodDark();
  g.add(mesh(new THREE.BoxGeometry(h.length + 0.5, 0.3, h.width + 0.5), MAT.concrete(), [0, 0.1, 0]));
  gabled(g, h, stone, roof, 0.25);
  const panes = new THREE.MeshStandardMaterial({
    color: 0x8aa0b4,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0xffc46b,
    emissiveIntensity: 0,
  });
  panes.userData.noShare = true;
  const frame = MAT.woodLight();
  const z = h.width / 2 + 0.03;
  for (const x of [-2.6, 0.2, 2.8]) {
    g.add(mesh(new THREE.BoxGeometry(1.2, 1.4, 0.1), frame, [x, 0.25 + 1.8, z]));
    const p = mesh(new THREE.BoxGeometry(1.0, 1.2, 0.08), panes, [x, 0.25 + 1.8, z + 0.03]);
    p.castShadow = false;
    dynamic(p);
    g.add(p);
  }
  g.add(mesh(new THREE.BoxGeometry(1.1, 2.2, 0.1), wood, [-h.length / 2 + 1.2, 0.25 + 1.1, z]));
  // the wall lamp by the door: a bracket and a bulb that lights with the electricity
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), MAT.steelBlack(), [-h.length / 2 + 2.2, 0.25 + 2.3, z + 0.15]));
  const bulb = emissive(0xffe2a0, 0);
  bulb.userData.noShare = true;
  const bulbMesh = mesh(new THREE.SphereGeometry(0.11, 14, 10), bulb, [-h.length / 2 + 2.2, 0.25 + 2.18, z + 0.3]);
  bulbMesh.castShadow = false;
  dynamic(bulbMesh);
  g.add(bulbMesh);
  // chimney
  g.add(
    mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), stone, [
      h.length / 2 - 1.4,
      0.25 + h.wallHeight + h.ridge * 0.75,
      -h.width / 4,
    ]),
  );
  mergeStatic(g, { name: 'house' });
  const light = new THREE.PointLight(0xffd9a0, 0, 14, 1.6);
  light.position.set(-h.length / 2 + 2.2, 0.25 + 2.1, z + 0.9);
  light.castShadow = false;
  g.add(light);
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 0.25 + h.wallHeight + h.ridge + 2.4, 0);
  g.add(anchor);
  return { group: g, anchor, panes, bulb, light, inn: new THREE.Vector3(-h.length / 2, 0.25 + h.wallHeight - 0.3, 0) };
}
