// Drawing helpers shared by the sheets: text wrapping, notes, tables, balloons, the legend of the dimension marks, dimension
// lines by model coordinate, silhouettes, arrows. Everything draws through the kit's View. Ported from the Piggott lab
// (src/drawings/draw.ts, itself from the ram lab) and adapted: the notice and the legend of the marks are the Mill lab's.
import {
  COLORS,
  INK,
  INK_2,
  W,
  type Drawing,
  type Pt,
  type Stroke,
  type Text,
  type View,
} from '@onigam/lab-kit/drawings';
import { l, tr, type L } from '@onigam/lab-kit/i18n';

export const PAPER = COLORS.paper;
export const HEAD_FILL = '#efe6d3';
/** Parts that turn, in the pose they are drawn in (the screw and the wheels of the drive). */
export const MOVING = COLORS.copper;
/** What the simulation gives is boxed and written in this red; a model result is never a measurement. */
export const RED = COLORS.red;
/** The three phases of the generator, as the 3D world sleeves them: red, yellow, blue (the yellow is darkened to read on paper). */
export const PHASE = { A: COLORS.red, B: '#b07d00', C: COLORS.acN } as const;

/** Light tints of the materials (the hatching, when there is one, is drawn on top). */
export const FILL = {
  steel: '#e6e4de',
  resin: '#f3dfb4',
  wood: '#f1e2c2',
  copper: '#f0d2ba',
  north: '#f4c9c4',
  south: '#c9d9ee',
  concrete: '#e4e0d6',
  water: COLORS.waterFill,
  earth: '#ece4d2',
  roof: '#e6d3c4',
} as const;

export const thin = (fill: string = PAPER): Stroke => ({ w: W.thin, fill });
export const med = (fill: string = PAPER): Stroke => ({ w: W.medium, fill });
export const thick = (fill: string = PAPER): Stroke => ({ w: W.thick, fill });
export const hatched = (hatch: NonNullable<Stroke['hatch']>, w: number = W.medium): Stroke => ({
  w,
  hatch,
  fill: PAPER,
});

// ------------------------------------------------------------------------------------------------ text

/** Width estimate of a text of the given cap height, in paper mm (a little pessimistic: sheets must not overflow). */
export function estW(s: string, size: number, mono = false, bold = false): number {
  return s.length * size * (mono ? 0.86 : bold ? 0.82 : 0.74);
}

/** Greedy word wrap into lines no wider than `maxW`. The kit's typography keeps numbers and units together when the text is resolved. */
export function wrap(s: string, maxW: number, size: number, mono = false, bold = false): string[] {
  const out: string[] = [];
  for (const par of s.split('\n')) {
    let line = '';
    for (const word of par.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && estW(next, size, mono, bold) > maxW) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

export interface ParaOpts {
  size?: number;
  lineH?: number;
  color?: string;
  bold?: boolean;
  mono?: boolean;
  italic?: boolean;
  bullet?: string;
  anchor?: 'start' | 'middle' | 'end';
}

/** Wrapped paragraph in paper space. Returns the y below it. */
export function note(d: Drawing, x: number, y: number, w: number, text: Text, o: ParaOpts = {}): number {
  const size = o.size ?? 1.9;
  const lh = o.lineH ?? size * 1.62;
  const indent = o.bullet ? size * 2.2 : 0;
  const lines = wrap(tr(text), w - indent, size, o.mono, o.bold);
  const p = d.paper();
  if (o.bullet) p.text([x, y], o.bullet, { size, baseline: 'top', weight: 'bold', color: o.color });
  lines.forEach((ln, i) =>
    p.text([x + indent, y + i * lh], ln, {
      size,
      baseline: 'top',
      color: o.color,
      weight: o.bold ? 'bold' : 'normal',
      mono: o.mono,
      italic: o.italic,
    }),
  );
  return y + lines.length * lh + size * 0.55;
}

/** A small bold heading in paper space (a view or a block title). Returns the y below it. */
export function heading(
  d: Drawing,
  x: number,
  y: number,
  text: Text,
  o: { size?: number; color?: string } = {},
): number {
  const size = o.size ?? 2.3;
  d.paper().text([x, y], text, { size, weight: 'bold', baseline: 'top', color: o.color });
  return y + size * 1.9;
}

/** View caption (bold, centred) with its scale under it. */
export function caption(d: Drawing, x: number, y: number, title: Text, scale?: string): void {
  d.paper().text([x, y], title, { size: 2.8, weight: 'bold', anchor: 'middle' });
  if (scale) d.paper().text([x, y + 4], scale, { size: 2.1, anchor: 'middle', mono: true, color: INK_2 });
}

// ------------------------------------------------------------------------------------------------ tables

export interface Cell {
  t: Text;
  bold?: boolean;
  mono?: boolean;
  color?: string;
}
export interface Col {
  label: Text;
  w: number;
  align?: 'start' | 'middle' | 'end';
  mono?: boolean;
}

/** Table with word-wrapped cells. Returns its height. */
export function grid(
  d: Drawing,
  x: number,
  y: number,
  cols: Col[],
  rows: (Cell | Text)[][],
  o: { size?: number; pad?: number; lineH?: number; fills?: (string | undefined)[] } = {},
): number {
  const p = d.paper();
  const size = o.size ?? 1.9;
  const lh = o.lineH ?? size * 1.55;
  const pad = o.pad ?? 0.9;
  const total = cols.reduce((a, c) => a + c.w, 0);
  const cell = (c: Cell | Text): Cell =>
    typeof c === 'string' || 'fr' in (c as object) ? { t: c as Text } : (c as Cell);
  const lay = (t: Text, c: Col, ce: Cell) => wrap(tr(t), c.w - 2.8, size, ce.mono ?? c.mono, ce.bold);
  const headLines = cols.map((c) => lay(c.label, c, { t: c.label, bold: true }));
  const headH = Math.max(...headLines.map((x) => x.length)) * lh + pad * 2;
  const body = rows.map((r) => r.map((c, i) => ({ ce: cell(c), lines: lay(cell(c).t, cols[i]!, cell(c)) })));
  const heights = body.map((r) => Math.max(...r.map((c) => c.lines.length)) * lh + pad * 2);
  const h = headH + heights.reduce((a, b) => a + b, 0);
  p.rect([x, y], [x + total, y + h], { w: W.medium, fill: PAPER });
  p.rect([x, y], [x + total, y + headH], { w: W.thin, fill: HEAD_FILL });
  const put = (lines: string[], cx: number, cy: number, c: Col, ce: Cell) => {
    const align = c.align ?? 'start';
    const tx = align === 'start' ? cx + 1.3 : align === 'end' ? cx + c.w - 1.3 : cx + c.w / 2;
    lines.forEach((ln, i) =>
      p.text([tx, cy + pad + i * lh + lh * 0.1], ln, {
        size,
        anchor: align,
        baseline: 'top',
        mono: ce.mono ?? c.mono,
        weight: ce.bold ? 'bold' : 'normal',
        color: ce.color,
      }),
    );
  };
  let cx = x;
  cols.forEach((c, i) => {
    if (i) p.line([cx, y], [cx, y + h], { w: W.thin });
    put(headLines[i]!, cx, y, c, { t: c.label, bold: true });
    cx += c.w;
  });
  let ry = y + headH;
  body.forEach((r, ri) => {
    const fill = o.fills?.[ri];
    if (fill) p.rect([x + 0.2, ry], [x + total - 0.2, ry + heights[ri]!], { w: 0, color: fill, fill, opacity: 0.6 });
    p.line([x, ry], [x + total, ry], { w: W.thin });
    let rx = x;
    r.forEach((c, ci) => {
      put(c.lines, rx, ry, cols[ci]!, c.ce);
      rx += cols[ci]!.w;
    });
    ry += heights[ri]!;
  });
  return h;
}

// ------------------------------------------------------------------------------------------------ boxes, legends

/** A framed note box with a bold title; returns the y below it. */
export function box(
  d: Drawing,
  x: number,
  y: number,
  w: number,
  title: Text,
  lines: (Text | { t: Text; bullet: string })[],
  o: { size?: number; border?: string } = {},
): number {
  const size = o.size ?? 1.85;
  const p = d.paper();
  const inner = w - 4;
  let yy = y + 2.2;
  p.text([x + 2, yy], title, { size: size + 0.1, weight: 'bold', baseline: 'top' });
  yy += (size + 0.1) * 1.9;
  for (const ln of lines) {
    if (typeof ln === 'object' && 't' in ln && 'bullet' in ln)
      yy = note(d, x + 2, yy, inner, ln.t, { size, bullet: ln.bullet });
    else yy = note(d, x + 2, yy, inner, ln as Text, { size });
  }
  p.rect([x, y], [x + w, yy + 0.4], { w: W.thin, color: o.border ?? INK_2 });
  return yy + 0.4;
}

/** One extra row of a legend: a symbol drawn in paper space at (x, y) and its text. */
export interface LegendRow {
  sym: (p: View, x: number, y: number) => void;
  text: Text;
}

/** The legend of the marks that follow the dimensions (reported, derived, estimate), plus extra rows. Returns the y below it. */
export function marksLegend(
  d: Drawing,
  x: number,
  y: number,
  w: number,
  extra: LegendRow[] = [],
  words: { reported?: Text; derived?: Text; estimate?: Text } = {},
): number {
  const p = d.paper();
  const mark =
    (m: string): LegendRow['sym'] =>
    (q, sx, sy) =>
      q.text([sx, sy], m, { size: 1.9, baseline: 'middle', mono: true, weight: 'bold' });
  const rows: LegendRow[] = [
    { sym: mark('123'), text: words.reported ?? l('donnée par une source publiée', 'given by a published source') },
    {
      sym: mark('123†'),
      text:
        words.derived ??
        l(
          'dérivée des règles de calcul publiées, au point de fonctionnement du labo',
          'derived by the published design rules at the lab’s design point',
        ),
    },
    {
      sym: mark('123*'),
      text:
        words.estimate ??
        l('estimation de la maquette 3D ou hypothèse du modèle', 'estimate of the 3D model or model assumption'),
    },
    ...extra,
  ];
  const lh = 3.6;
  const tx = x + 14;
  const lines = rows.map((r) => wrap(tr(r.text), w - 16, 1.85));
  const h = 7.5 + lines.reduce((a, ln) => a + ln.length * lh, 0);
  p.rect([x, y], [x + w, y + h], { w: W.thin, fill: PAPER });
  p.text([x + 2, y + 2.1], l('COTES ET TRAITS', 'DIMENSIONS AND LINES'), {
    size: 1.9,
    weight: 'bold',
    baseline: 'top',
  });
  let yy = y + 8;
  rows.forEach((r, i) => {
    r.sym(p, x + 2, yy);
    lines[i]!.forEach((ln, j) => p.text([tx, yy + j * lh], ln, { size: 1.85, baseline: 'middle' }));
    yy += lines[i]!.length * lh;
  });
  return y + h + 1.5;
}

/** The notice every sheet carries: what these plans are and are not. */
export const EDU_NOTE: L = l(
  'Reconstitution pédagogique indépendante. La vis est générique : ses cotes sont dérivées de règles de calcul publiées, aucun constructeur ne publie les siennes. Ce n’est pas un plan de construction.',
  'Independent educational reconstruction. The screw is generic: its dimensions are derived from published design rules, since no maker publishes its own. This is not a construction plan.',
);

/** The notice of the sheets of the generator: it is generic and its design is the lab's estimate. */
export const EDU_NOTE_GENERATOR: L = l(
  'Reconstitution pédagogique indépendante. La génératrice est générique : ni le nombre de pôles et d’encoches, ni les aimants, ni l’entrefer ne sont donnés par une source, ce sont des estimations du labo. Ce n’est pas un plan de construction.',
  'Independent educational reconstruction. The generator is generic: no source gives the number of poles and slots, the magnets or the air gap, they are the lab’s estimates. This is not a construction plan.',
);

/** The notice of the sheets of the powerhouse: an example room, estimated ratings, a qualified electrician. */
export const EDU_NOTE_ROOM: L = l(
  'Reconstitution pédagogique indépendante. Le local est un exemple : les calibres, les sections de câble et les tailles sont des estimations du labo, à faire valider par un électricien qualifié. Ce n’est pas un plan de construction ni un schéma de câblage.',
  'Independent educational reconstruction. The room is an example: the ratings, the cable sizes and the dimensions are the lab’s estimates, to be checked by a qualified electrician. This is not a construction plan, nor a wiring plan.',
);

/** The notice of the chart of turbines: orders of magnitude from the literature, not a tool to size a plant. */
export const EDU_NOTE_CHART: L = l(
  'Reconstitution pédagogique indépendante. Les zones sont des ordres de grandeur tirés de la littérature publiée, elles se chevauchent et les sources divergent sur leurs bords. Ce n’est pas un outil de dimensionnement ni un plan de construction.',
  'Independent educational reconstruction. The zones are orders of magnitude taken from the published literature, they overlap and the sources disagree at their edges. This is not a tool for sizing a plant, nor a construction plan.',
);

/** The red tag of what the simulation gives, as the Piggott lab draws it: a box with its own words. */
export function modelTag(d: Drawing, x: number, y: number, w: number): void {
  const p = d.paper();
  p.rect([x, y], [x + w, y + 5.2], { w: W.medium, color: RED, fill: COLORS.paper });
  p.text([x + w / 2, y + 2.7], l('RÉSULTAT DU MODÈLE · pas une mesure', 'MODEL RESULT · not a measurement'), {
    size: 1.75,
    weight: 'bold',
    color: RED,
    anchor: 'middle',
    baseline: 'middle',
  });
}

// ------------------------------------------------------------------------------------------------ balloons

/** Balloon (item number) at paper position (bx, by), leader to the model point `at` of view `v`. */
export function balloon(v: View, at: Pt, bx: number, by: number, n: number | string): void {
  const [qx, qy] = v.map(at);
  v.leader(at, bx - qx, by - qy, String(n), { balloon: true });
}

// ------------------------------------------------------------------------------------------------ polygons, silhouettes, arrows

/** Closed polygon helper. */
export function poly(v: View, pts: Pt[], s: Stroke): SVGElement {
  return v.polyline(pts, { closed: true, ...s });
}

/** Polygon of a body of revolution about a horizontal axis at y = cy, from its upper profile [x, radius] (left to right). */
export function silH(profile: Pt[], cy = 0): Pt[] {
  return [...profile.map(([x, r]): Pt => [x, cy + r]), ...[...profile].reverse().map(([x, r]): Pt => [x, cy - r])];
}

/** An arrow from a to b ending in the kit's arrow marker (model or paper units, as the view says). */
export function arrow(
  v: View,
  a: Pt,
  b: Pt,
  color: string = INK,
  w: number = W.medium,
  dash?: Stroke['dash'],
): SVGElement {
  const e = v.line(a, b, { w, color, dash });
  e.setAttribute('marker-end', 'url(#arrow)');
  return e;
}

/** Rotate a point about a centre (degrees, counter-clockwise in the model). */
export function rot([x, y]: Pt, deg: number, [cx, cy]: Pt = [0, 0]): Pt {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}

// ------------------------------------------------------------------------------------------------ dimensions

/** Vertical dimension whose dimension line stands at model x = `xLine` (left or right of both points). */
export function dimV(v: View, a: Pt, b: Pt, xLine: number, label: Text, size = 2.2): void {
  const lo = Math.min(a[0], b[0]);
  const hi = Math.max(a[0], b[0]);
  const off = xLine < lo ? (xLine - lo) * v.scale : (xLine - hi) * v.scale;
  v.dim(a, b, off, { dir: 'v', label, size });
}

/** Horizontal dimension whose dimension line stands at model y = `yLine` (below or above both points). */
export function dimH(v: View, a: Pt, b: Pt, yLine: number, label: Text, size = 2.2): void {
  const lo = Math.min(a[1], b[1]);
  const hi = Math.max(a[1], b[1]);
  const off = yLine < lo ? (lo - yLine) * v.scale : (hi - yLine) * v.scale;
  v.dim(a, b, off, { dir: 'h', label, size });
}

/** Dimension of a short length with the arrows outside (the line and the text sit beside the gap). Paper units. */
export function gapDim(
  p: View,
  x0: number,
  x1: number,
  y: number,
  label: Text,
  side: 'left' | 'right' = 'right',
): void {
  const e0 = arrow(p, [x0 - 4, y], [x0, y]);
  const e1 = arrow(p, [x1 + 4, y], [x1, y]);
  void e0;
  void e1;
  p.text([side === 'right' ? x1 + 5 : x0 - 5, y], label, {
    size: 2,
    mono: true,
    baseline: 'middle',
    anchor: side === 'right' ? 'start' : 'end',
    halo: true,
  });
}

/** Tube between two projected points, as a closed polygon `r` thick on each side. */
export function tube2d(a: Pt, b: Pt, r: number): Pt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const n = Math.hypot(dx, dy) || 1;
  const nx = (-dy / n) * r;
  const ny = (dx / n) * r;
  return [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ];
}
