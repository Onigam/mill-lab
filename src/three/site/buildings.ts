import * as THREE from 'three';
import { MAT, emissive, group } from '@onigam/lab-kit/three';
import { SITE } from '../dims';
import { dynamic, mergeStatic } from '../merge';
import {
  ashlarMaterial,
  metricUV,
  plasterMaterial,
  rubbleMaterial,
  sheetMaterial,
  slateMaterial,
  tileMaterial,
  woodMaterial,
} from './materials';
import { warning } from '../powerroom/parts';

// The three buildings of the site: the mill (rubble stone with dressed quoins, a clay-tile roof with a ridge, eaves, gutters and downpipes, framed
// windows with lintels, sills and shutters, a cart door and a loading hatch on the canal side, a hoist beam on the east gable, a chimney), the small
// powerhouse (render walls, a ribbed sheet roof, open on the front so that the cabinet, the battery and the inverter inside can be seen) and the house
// the electricity feeds (render with planked gables, a slate roof, windows whose panes glow, a hood over the door, a wall lamp). Frame of each: origin
// on the ground at the middle, +Z = south (the front, towards the visitor), the ridge along X. The bounds, the label anchors, the lamp, the panes, the
// LED and the points where the lines arrive are those of the plain boxes they replace: the labels and the framing depend on them. Every material is a
// `MeshStandardMaterial` (maps are fine: the kit swaps materials for isolate, ghost and X-ray).

type Face = 'S' | 'N' | 'E' | 'W';

const FACE_ROT: Record<Face, number> = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };

const std = (color: number, roughness = 0.8, metalness = 0): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

/** A box of size (sx, sy, sz) centred at (cx, cy, cz) in `parent`, UVs in metres for a `tile` texture. */
function bx(
  parent: THREE.Object3D,
  sx: number,
  sy: number,
  sz: number,
  cx: number,
  cy: number,
  cz: number,
  mat: THREE.Material,
  tile = 1,
): THREE.Mesh {
  const m = new THREE.Mesh(metricUV(new THREE.BoxGeometry(sx, sy, sz), tile, tile), mat);
  m.position.set(cx, cy, cz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

interface Gabled {
  length: number;
  width: number;
  wallHeight: number;
  ridge: number;
}

interface Kit {
  wall: THREE.Material;
  gable: THREE.Material;
  roof: THREE.Material;
  /** Light dressed stone (quoins, lintels, sills, plinth). */
  stone: THREE.Material;
  /** Dark wood for frames, bargeboards, fascia. */
  frame: THREE.Material;
  /** Painted shutters. */
  shutter: THREE.Material;
  glass: THREE.Material;
  iron: THREE.Material;
  zinc: THREE.Material;
  tileU: number;
  tileV: number;
}

/** Walls, gable ends, plinth, the two roof slabs with their fascia, gutter, ridge cap and bargeboards. */
function shell(g: THREE.Group, o: Gabled, k: Kit, base = 0.25): void {
  const { length: L, width: W, wallHeight: H, ridge } = o;
  bx(g, L, H, W, 0, base + H / 2, 0, k.wall, 2.4);
  // gable ends: a triangle prism a little thicker than before, the face on the wall plane
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, 0);
  shape.lineTo(W / 2, 0);
  shape.lineTo(0, ridge);
  shape.closePath();
  for (const sx of [-1, 1]) {
    const geo = metricUV(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }), 2.4, 2.4);
    const gm = new THREE.Mesh(geo, k.gable);
    gm.rotation.y = Math.PI / 2;
    gm.position.set(sx * (L / 2) - (sx > 0 ? 0.2 : 0), base + H, 0);
    gm.castShadow = true;
    gm.receiveShadow = true;
    g.add(gm);
  }
  const slope = Math.atan2(ridge, W / 2);
  const slab = Math.hypot(W / 2, ridge) + 0.5;
  for (const sz of [-1, 1]) {
    const side = new THREE.Group();
    side.position.set(0, base + H + ridge / 2 - 0.03, (sz * W) / 4 - sz * 0.12);
    side.rotation.x = sz * slope;
    g.add(side);
    const roof = new THREE.Mesh(metricUV(new THREE.BoxGeometry(L + 0.8, 0.14, slab), k.tileU, k.tileV), k.roof);
    roof.castShadow = true;
    roof.receiveShadow = true;
    side.add(roof);
    // fascia board along the eave and a half-round gutter under it
    bx(side, L + 0.8, 0.17, 0.035, 0, -0.06, sz * (slab / 2), k.frame);
    const gutter = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, L + 0.7, 8, 1).rotateZ(Math.PI / 2), k.zinc);
    gutter.position.set(0, -0.2, sz * (slab / 2 + 0.03));
    gutter.castShadow = true;
    side.add(gutter);
    // rafter feet under the eave
    for (let i = 0; i <= Math.floor(L / 0.7); i++) {
      const x = -L / 2 - 0.3 + (i * (L + 0.6)) / Math.floor(L / 0.7);
      bx(side, 0.07, 0.1, 0.4, x, -0.12, sz * (slab / 2 - 0.2), k.frame);
    }
    // the ridge cap: a thin tent along the top
    const cap = new THREE.Mesh(metricUV(new THREE.BoxGeometry(L + 0.9, 0.05, 0.34), k.tileU, k.tileV), k.roof);
    cap.position.set(0, 0.1, -sz * (slab / 2 - 0.1));
    cap.castShadow = true;
    side.add(cap);
  }
  // bargeboards on the gable rakes
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const rake = new THREE.Group();
      rake.position.set(sx * (L / 2 + 0.38), base + H + ridge / 2 - 0.03, (sz * W) / 4 - sz * 0.12);
      rake.rotation.x = sz * slope;
      g.add(rake);
      bx(rake, 0.035, 0.2, slab, 0, -0.04, 0, k.frame);
    }
  // plinth: a dressed stone course round the foot
  bx(g, L + 0.5, 0.3, W + 0.5, 0, 0.1, 0, k.stone, 1.2);
}

/** A window on a wall face: a dark glass recessed in a frame, mullions, a lintel, a sill and (optionally) two open shutters. `at` is on the wall plane. */
function addWindow(
  g: THREE.Group,
  face: Face,
  x: number,
  y: number,
  plane: number,
  w: number,
  h: number,
  k: Kit,
  opts: { shutters?: boolean; transom?: boolean; glass?: THREE.Material } = {},
): void {
  const grp = new THREE.Group();
  grp.rotation.y = FACE_ROT[face];
  // local frame: wall plane z = plane, outwards +z; for E/W faces the position runs along z
  if (face === 'S' || face === 'N') grp.position.set(x, y, 0);
  else grp.position.set(0, y, x);
  g.add(grp);
  const p = plane;
  bx(grp, w + 0.18, h + 0.18, 0.05, 0, 0, p + 0.025, k.frame); // the frame (proud by 5 cm)
  bx(grp, w, h, 0.02, 0, 0, p + 0.045, opts.glass ?? k.glass); // the glass
  bx(grp, 0.045, h, 0.04, 0, 0, p + 0.06, k.frame); // central mullion
  bx(grp, w, 0.045, 0.04, 0, 0.1 * h, p + 0.06, k.frame); // transom
  if (opts.transom !== false) bx(grp, w, 0.04, 0.04, 0, -0.25 * h, p + 0.06, k.frame);
  bx(grp, w + 0.5, 0.2, 0.2, 0, h / 2 + 0.2, p + 0.07, k.stone, 1.2); // lintel
  bx(grp, w + 0.34, 0.09, 0.22, 0, -h / 2 - 0.12, p + 0.09, k.stone, 1.2); // sill
  if (opts.shutters) {
    for (const s of [-1, 1])
      bx(grp, w / 2 + 0.04, h + 0.2, 0.035, s * (w / 2 + 0.09 + (w / 2 + 0.04) / 2), 0, p + 0.02, k.shutter, 0.8);
  }
}

/** A plank door in a dressed-stone surround: two leaves, ledges, braces, strap hinges, a lintel and a threshold. */
function cartDoor(
  g: THREE.Group,
  x: number,
  w: number,
  h: number,
  plane: number,
  base: number,
  k: Kit,
  door: THREE.Material,
): void {
  const grp = new THREE.Group();
  grp.position.set(x, base, 0);
  g.add(grp);
  bx(grp, w + 0.5, 0.35, 0.22, 0, h + 0.17, plane + 0.08, k.stone, 1.2); // lintel
  for (const s of [-1, 1]) bx(grp, 0.28, h, 0.16, s * (w / 2 + 0.14), h / 2, plane + 0.06, k.stone, 1.2); // jambs
  bx(grp, w + 0.5, 0.1, 0.2, 0, 0.0, plane + 0.1, k.stone, 1.2); // threshold (a step 20 cm deep)
  for (const s of [-1, 1]) {
    const cx = s * (w / 4 + 0.005);
    bx(grp, w / 2 - 0.01, h - 0.02, 0.06, cx, h / 2, plane + 0.03, door, 0.8);
    for (const yy of [0.35, h / 2, h - 0.4]) bx(grp, w / 2 - 0.1, 0.12, 0.03, cx, yy, plane + 0.075, k.frame);
    const brace = bx(grp, 0.1, Math.hypot(w / 2 - 0.1, h / 2 - 0.4) * 0.96, 0.03, cx, h / 2, plane + 0.08, k.frame);
    brace.rotation.z = s * Math.atan2(w / 2 - 0.1, h / 2 - 0.4);
    for (const yy of [0.5, h - 0.5]) bx(grp, 0.55, 0.07, 0.02, s * (w / 2 - 0.3), yy, plane + 0.095, k.iron);
  }
}

export interface Building {
  group: THREE.Group;
  anchor: THREE.Object3D;
}

export function buildMill(): Building {
  const m = SITE.mill;
  const g = group('mill');
  const L = m.length;
  const W = m.width;
  const H = m.wallHeight;
  const base = 0.25;
  const k: Kit = {
    wall: rubbleMaterial(base + H),
    gable: rubbleMaterial(),
    roof: tileMaterial(),
    stone: ashlarMaterial(0xcfc6b2),
    frame: woodMaterial(0x4a3a2b, 0.85),
    shutter: woodMaterial(0x6f8a72, 0.85),
    glass: new THREE.MeshStandardMaterial({ color: 0x2c3a46, roughness: 0.18, metalness: 0.25, envMapIntensity: 1 }),
    iron: std(0x2a2c2f, 0.55, 0.6),
    zinc: std(0x8a9096, 0.45, 0.7),
    tileU: 0.9,
    tileV: 1.2,
  };
  const door = woodMaterial(0x6a4a2e, 0.85);
  shell(g, m, k, base);
  const z = W / 2;
  const x = L / 2;
  // quoins: dressed stones in alternate long and short courses at the four corners
  const quoin = 0.33;
  for (let c = 0; c * quoin < H - 0.1; c++) {
    const y = base + quoin / 2 + c * quoin;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const long = (c + (sx > 0 ? 1 : 0) + (sz > 0 ? 1 : 0)) % 2 === 0;
        const a = long ? 0.62 : 0.34;
        const b = long ? 0.34 : 0.62;
        bx(g, a + 0.05, quoin - 0.015, 0.055, sx * (x - a / 2 + 0.025), y, sz * (z + 0.0275), k.stone, 1.2);
        bx(g, 0.055, quoin - 0.015, b, sx * (x + 0.0275), y, sz * (z - b / 2), k.stone, 1.2);
      }
  }
  // south front (towards the visitor and the canal): a cart door, a loading hatch above it, two rows of windows
  cartDoor(g, -x + 2.4, 2.2, 3.0, z, base, k, door);
  for (const wx of [-1.2, 1.2, 3.6])
    for (const wy of [1.6, 4.4]) addWindow(g, 'S', wx, base + wy, z, 0.85, 1.15, k, { shutters: true });
  // the loading hatch over the cart door: two leaves, a lintel, a short hoist beam with its pulley under the eave
  {
    const hx = -x + 2.4;
    const hy = base + 4.45;
    bx(g, 1.6, 0.2, 0.2, hx, hy + 1.0, z + 0.07, k.stone, 1.2);
    for (const s of [-1, 1]) {
      bx(g, 0.58, 1.75, 0.05, hx + s * 0.3, hy + 0.1, z + 0.03, door, 0.8);
      bx(g, 0.5, 0.1, 0.03, hx + s * 0.3, hy + 0.1, z + 0.06, k.frame);
    }
    bx(g, 0.14, 0.14, 0.24, hx, hy + 1.45, z + 0.09, k.frame);
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 12), k.iron);
    pulley.position.set(hx, hy + 1.45, z + 0.22);
    pulley.rotation.y = Math.PI / 2;
    g.add(pulley);
  }
  // north back: windows, a back door
  for (const wx of [-3.2, -0.2, 2.8, 4.7])
    for (const wy of [1.6, 4.4])
      if (!(wx === 4.7 && wy === 1.6)) addWindow(g, 'N', wx, base + wy, z, 0.85, 1.15, k, { shutters: wx !== 4.7 });
  {
    const grp = new THREE.Group();
    grp.rotation.y = Math.PI;
    grp.position.set(-4.7, 0, 0);
    g.add(grp);
    bx(grp, 1.5, 0.28, 0.2, 0, base + 2.3, z + 0.07, k.stone, 1.2);
    bx(grp, 0.95, 2.1, 0.06, 0, base + 1.05, z + 0.03, door, 0.8);
    bx(grp, 0.7, 0.1, 0.03, 0, base + 0.5, z + 0.065, k.frame);
    bx(grp, 0.7, 0.1, 0.03, 0, base + 1.7, z + 0.065, k.frame);
    bx(grp, 1.3, 0.1, 0.3, 0, base - 0.02, z + 0.15, k.stone, 1.2);
  }
  // west gable: a window on each floor, a small round window in the gable
  addWindow(g, 'W', -1.0, base + 1.6, x, 0.85, 1.15, k, { shutters: true });
  addWindow(g, 'W', 1.2, base + 4.4, x, 0.85, 1.15, k, { shutters: true });
  addWindow(g, 'W', 0, base + 7.4, x, 0.6, 0.7, k, { transom: false });
  // east gable (towards the powerhouse): a loading door on the upper floor and its hoist beam, a window below
  {
    const grp = new THREE.Group();
    grp.rotation.y = Math.PI / 2;
    g.add(grp);
    // the E-facing frame: outwards +z in `grp`, along z of the building = -x in `grp`
    const hy = base + H - 1.6;
    bx(grp, 1.7, 0.2, 0.2, 0, hy + 0.95, x + 0.06, k.stone, 1.2);
    for (const s of [-1, 1]) {
      bx(grp, 0.56, 1.5, 0.05, s * 0.29, hy, x + 0.03, door, 0.8);
      bx(grp, 0.5, 0.1, 0.03, s * 0.29, hy, x + 0.06, k.frame);
    }
    bx(grp, 1.3, 0.08, 0.2, 0, hy - 0.8, x + 0.12, k.stone, 1.2);
    // hoist beam out of the gable, with its brace, pulley and a rope
    const bm = bx(grp, 0.16, 0.16, 0.9, 0, base + H + 0.9, x + 0.4, k.frame);
    bm.castShadow = true;
    const brace = bx(grp, 0.1, 0.1, 0.8, 0, base + H + 0.4, x + 0.35, k.frame);
    brace.rotation.x = -0.6;
    const pul = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 14), k.iron);
    pul.position.set(0, base + H + 0.9, x + 0.78);
    pul.rotation.y = Math.PI / 2;
    grp.add(pul);
    bx(grp, 0.02, 1.7, 0.02, 0, base + H + 0.05, x + 0.78, std(0xb5a27a, 0.9));
  }
  addWindow(g, 'E', -2.0, base + 1.6, x, 0.85, 1.15, k, { shutters: true });
  // downpipes at the two south corners, a drain on the north
  for (const sx of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, H + 0.1, 8), k.zinc);
    pipe.position.set(sx * (x - 0.55), base + H / 2 - 0.1, z + 0.07);
    pipe.castShadow = true;
    g.add(pipe);
    bx(g, 0.2, 0.2, 0.14, sx * (x - 0.55), base + H - 0.1, z + 0.07, k.zinc);
  }
  // chimney on the ridge, a capped shaft in the same stone
  const chX = -x + 2;
  const chY = base + H + m.ridge * 0.7;
  bx(g, 0.9, 2.28, 0.9, chX, chY - 0.06, -W / 4, k.wall, 2.4);
  bx(g, 1.08, 0.12, 1.08, chX, chY + 1.14, -W / 4, k.stone, 1.2);
  bx(g, 1.0, 0.1, 1.0, chX, chY - 1.05, -W / 4, k.stone, 1.2);
  mergeStatic(g, { name: 'mill' });
  const anchor = new THREE.Object3D();
  anchor.position.set(0, base + H + m.ridge + 0.6, 0);
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
  const wall = plasterMaterial(0xd2ccbc, 0.14 + H);
  const roof = sheetMaterial(0xc4c9cf);
  const stone = ashlarMaterial(0xbdb7aa);
  const trim = woodMaterial(0x59493a, 0.85);
  const iron = std(0x2a2c2f, 0.55, 0.6);
  const zinc = std(0x8a9096, 0.45, 0.7);
  const b0 = 0.14;
  // the slab (a plinth), the back wall and the two side walls (the front is open)
  bx(g, L + 0.3, 0.14, W + 0.3, 0, 0.07, 0, stone, 1.2);
  bx(g, L, H, 0.14, 0, b0 + H / 2, -W / 2 + 0.07, wall, 1.6);
  for (const sx of [-1, 1]) bx(g, 0.14, H, W, sx * (L / 2 - 0.07), b0 + H / 2, 0, wall, 1.6);
  // a stone course at the foot of the walls
  bx(g, L + 0.04, 0.28, 0.18, 0, b0 + 0.14, -W / 2 + 0.07, stone, 1.2);
  for (const sx of [-1, 1]) bx(g, 0.18, 0.28, W + 0.04, sx * (L / 2 - 0.07), b0 + 0.14, 0, stone, 1.2);
  // roof: ribbed sheet with a slight fall towards the front, fascia, gutter on the low edge
  const side = new THREE.Group();
  side.position.set(0, b0 + H + 0.06, 0);
  side.rotation.x = 0.05;
  g.add(side);
  const sheet = new THREE.Mesh(metricUV(new THREE.BoxGeometry(L + 0.5, 0.12, W + 0.5), 0.76, 0.76), roof);
  sheet.castShadow = true;
  sheet.receiveShadow = true;
  side.add(sheet);
  bx(side, L + 0.5, 0.15, 0.03, 0, -0.05, (W + 0.5) / 2, trim);
  bx(side, 0.03, 0.15, W + 0.5, -(L + 0.5) / 2, -0.05, 0, trim);
  bx(side, 0.03, 0.15, W + 0.5, (L + 0.5) / 2, -0.05, 0, trim);
  const gut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, L + 0.4, 8, 1).rotateZ(Math.PI / 2), zinc);
  gut.position.set(0, -0.15, (W + 0.5) / 2 - 0.06);
  side.add(gut);
  // the lintel over the opening, in timber, and two posts framing it
  bx(g, L, 0.3, 0.14, 0, b0 + H - 0.15, W / 2 - 0.07, wall, 1.6);
  bx(g, L - 0.1, 0.12, 0.05, 0, b0 + H - 0.36, W / 2 + 0.02, trim);
  for (const sx of [-1, 1])
    bx(g, 0.1, H - 0.3, 0.05, sx * (L / 2 - 0.19), b0 + (H - 0.3) / 2 + 0.05, W / 2 + 0.02, trim);
  // a sign on the east wall, beside the louvres: the electrical danger triangle (the way into the `powerroom` world is this sign, the label and the open front)
  const sign = warning(0.4, 0, 0, 0);
  sign.name = 'sign';
  sign.rotation.y = Math.PI / 2;
  sign.position.set(L / 2, b0 + 1.45, -0.55);
  g.add(sign);
  // louvres on the east wall, a meter box on the west wall
  for (let i = 0; i < 5; i++) bx(g, 0.04, 0.05, 0.5, L / 2 + 0.01, b0 + 1.5 + i * 0.1, 0.3, zinc);
  bx(g, 0.1, 0.4, 0.3, -L / 2 - 0.03, b0 + 1.2, 0.5, iron);
  // standoff brackets and insulators where the lines leave and arrive
  for (const s of [-1, 1]) {
    bx(g, 0.24, 0.05, 0.05, s * (L / 2 + 0.1), b0 + H - (s > 0 ? 0.2 : 0.4), 0, iron);
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.14, 7), std(0xd9d2c1, 0.3));
    ins.position.set(s * (L / 2 + 0.2), b0 + H - (s > 0 ? 0.2 : 0.4) + 0.05, 0);
    g.add(ins);
  }
  // inside: the cabinet on the back wall, the 48 V battery on the floor, the inverter on the wall
  bx(g, 0.7, 1.7, 0.4, -L * 0.28, 0.14 + 0.85, -W / 2 + 0.34, MAT.enclosureGrey());
  bx(g, 0.04, 1.5, 0.02, -L * 0.28, 0.14 + 0.9, -W / 2 + 0.55, MAT.printBlack());
  const battery = std(0x38424a, 0.55);
  bx(g, 0.7, 0.42, 0.45, 0.05 * L, 0.14 + 0.21, -W / 2 + 0.45, battery);
  bx(g, 0.7, 0.42, 0.45, 0.05 * L, 0.14 + 0.64, -W / 2 + 0.45, battery);
  bx(g, 0.6, 0.45, 0.2, L * 0.3, 0.14 + 1.25, -W / 2 + 0.24, MAT.victronBlue());
  const led = emissive(0x4fe07a, 0);
  led.userData.noShare = true;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), led);
  lamp.position.set(L * 0.3 + 0.2, 0.14 + 1.35, -W / 2 + 0.36);
  lamp.castShadow = true;
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
  const L = h.length;
  const W = h.width;
  const H = h.wallHeight;
  const base = 0.25;
  const panes = new THREE.MeshStandardMaterial({
    color: 0x8aa0b4,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0xffc46b,
    emissiveIntensity: 0,
  });
  panes.userData.noShare = true;
  const k: Kit = {
    wall: plasterMaterial(0xe9e0cc, base + H),
    gable: woodMaterial(0x8a7457, 0.85),
    roof: slateMaterial(),
    stone: ashlarMaterial(0xd2cab8),
    frame: woodMaterial(0xe8e2d2, 0.8),
    shutter: woodMaterial(0x4f6f8a, 0.85),
    glass: panes,
    iron: std(0x2a2c2f, 0.55, 0.6),
    zinc: std(0x7d8389, 0.45, 0.7),
    tileU: 1.2,
    tileV: 1.0,
  };
  const door = woodMaterial(0x5b4330, 0.85);
  shell(g, h, k, base);
  const z = W / 2;
  const x = L / 2;
  // render corners: a stone course at the foot all round
  bx(g, L + 0.02, 0.5, W + 0.02, 0, base + 0.25, 0, k.stone, 1.2);
  // three windows on the south front, whose panes glow; shutters, sills, a flower box under two of them
  for (const wx of [-2.6, 0.2, 2.8]) addWindow(g, 'S', wx, base + 1.8, z, 1.0, 1.2, k, { shutters: true });
  const planter = std(0x6b5236, 0.9);
  const leaf = std(0x5f8a3a, 0.95);
  for (const wx of [0.2, 2.8]) {
    bx(g, 1.1, 0.16, 0.2, wx, base + 1.8 - 0.6 - 0.2, z + 0.16, planter, 0.8);
    bx(g, 1.0, 0.16, 0.16, wx, base + 1.8 - 0.6 - 0.04, z + 0.16, leaf);
    for (const s of [-0.35, 0, 0.35])
      bx(g, 0.14, 0.18, 0.14, wx + s, base + 1.8 - 0.6 + 0.0, z + 0.17, std(s ? 0xd8574a : 0xf1c34b, 0.9));
  }
  // north back: three windows (the same glass: they glow too), the gables: a window each
  for (const wx of [-2.6, 0.2, 2.8]) addWindow(g, 'N', wx, base + 1.8, z, 1.0, 1.2, k, { shutters: true });
  addWindow(g, 'E', 0.6, base + 1.8, x, 0.9, 1.1, k);
  addWindow(g, 'W', -0.6, base + 1.8, x, 0.9, 1.1, k);
  // the front door, its hood on two brackets, one step
  const dx = -x + 1.2;
  bx(g, 1.2, 0.18, 0.14, dx, base + 2.3, z + 0.05, k.stone, 1.2);
  bx(g, 1.1, 2.2, 0.06, dx, base + 1.1, z + 0.03, door, 0.8);
  for (const yy of [0.5, 1.1, 1.7]) bx(g, 1.0, 0.1, 0.03, dx, base + yy, z + 0.065, k.frame);
  bx(g, 0.3, 0.8, 0.03, dx - 0.27, base + 1.35, z + 0.075, panes);
  bx(g, 1.7, 0.07, 0.42, dx, base + 2.62, z + 0.21, k.roof, 1.2);
  for (const s of [-1, 1]) bx(g, 0.05, 0.05, 0.36, dx + s * 0.78, base + 2.5, z + 0.19, k.iron);
  bx(g, 1.5, 0.14, 0.34, dx, base + 0.0, z + 0.2, k.stone, 1.2);
  // the wall lamp by the door: a bracket, a shade and a bulb that lights with the electricity
  const lx = -x + 2.2;
  bx(g, 0.06, 0.06, 0.3, lx, base + 2.3, z + 0.15, MAT.steelBlack());
  bx(g, 0.18, 0.04, 0.18, lx, base + 2.33, z + 0.3, k.iron);
  const bulb = emissive(0xffe2a0, 0);
  bulb.userData.noShare = true;
  const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), bulb);
  bulbMesh.position.set(lx, base + 2.18, z + 0.3);
  bulbMesh.castShadow = false;
  dynamic(bulbMesh);
  g.add(bulbMesh);
  // downpipes, chimney (render with a cap)
  for (const sx of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, H + 0.1, 8), k.zinc);
    pipe.position.set(sx * (x - 0.4), base + H / 2 - 0.1, z + 0.07);
    pipe.castShadow = true;
    g.add(pipe);
  }
  const chX = x - 1.4;
  const chY = base + H + h.ridge * 0.75;
  bx(g, 0.7, 1.7, 0.7, chX, chY - 0.04, -W / 4, k.wall, 1.6);
  bx(g, 0.86, 0.1, 0.86, chX, chY + 0.86, -W / 4, k.stone, 1.2);
  mergeStatic(g, { name: 'house' });
  const light = new THREE.PointLight(0xffd9a0, 0, 14, 1.6);
  light.position.set(-x + 2.2, base + 2.1, z + 0.9);
  light.castShadow = false;
  g.add(light);
  const anchor = new THREE.Object3D();
  anchor.position.set(0, base + H + h.ridge + 2.4, 0);
  g.add(anchor);
  return { group: g, anchor, panes, bulb, light, inn: new THREE.Vector3(-x, base + H - 0.3, 0) };
}
