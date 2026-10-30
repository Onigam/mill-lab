// Electrical symbols in paper space for the single-line diagram of the powerhouse (PL-06): a generator, a three-pole breaker, a fuse, a rectifier, a battery,
// a resistor, an energy meter, a house, an earth rod, a surge arrester, the three slashes of a three-wire link. Each is drawn at a paper position through a kit
// `View` in paper space and returns nothing; sizes are in paper millimetres. Ported from the symbols of the Piggott lab (src/drawings/pl07-electrical.ts) and
// completed.
import { COLORS, INK_2, W, type View } from '@onigam/lab-kit/drawings';
import { PAPER } from './draw';

const INK = COLORS.ink;

/** A straight wire. */
export function wire(
  p: View,
  a: [number, number],
  b: [number, number],
  color: string = INK,
  w: number = W.medium,
  dash?: 'hidden' | 'center',
): void {
  p.line(a, b, { w, color, dash });
}

/** Three short slashes across a horizontal or vertical wire: it carries three conductors. */
export function threeWires(p: View, x: number, y: number, vertical = false, color: string = INK): void {
  for (const d of [-1.6, 0, 1.6]) {
    if (vertical) p.line([x - 1.5, y + d + 1], [x + 1.5, y + d - 1], { w: W.thin, color });
    else p.line([x + d - 1, y + 1.5], [x + d + 1, y - 1.5], { w: W.thin, color });
  }
}

/** A circle with a letter, as the symbol of a machine (G for the generator, 3~ for three-phase). */
export function machine(p: View, cx: number, cy: number, r: number, top: string, bottom: string): void {
  p.circle([cx, cy], r, { w: W.thick, fill: PAPER });
  p.text([cx, cy - 1.4], top, { size: 3.6, weight: 'bold', anchor: 'middle', baseline: 'middle' });
  p.text([cx, cy + 3.4], bottom, { size: 2, anchor: 'middle', baseline: 'middle' });
}

/** A three-pole breaker on a horizontal line: a box, an open contact and the cross of the thermal-magnetic trip. */
export function breaker(p: View, x0: number, x1: number, y: number, color: string = INK): void {
  const m = (x0 + x1) / 2;
  p.rect([x0, y - 6.5], [x1, y + 6.5], { w: W.medium, color, fill: PAPER });
  p.line([x0, y], [m - 3.4, y], { w: W.medium, color });
  p.line([m - 3.4, y], [m + 3, y - 4.2], { w: W.medium, color });
  p.line([m + 3.4, y], [x1, y], { w: W.medium, color });
  p.line([m - 1.2, y + 2.2], [m + 1.2, y + 4.6], { w: W.thin, color });
  p.line([m - 1.2, y + 4.6], [m + 1.2, y + 2.2], { w: W.thin, color });
}

/** A fuse on a horizontal line: a long box with the wire through it. */
export function fuse(p: View, x0: number, x1: number, y: number, color: string = INK, dashed = false): void {
  p.rect([x0, y - 2.6], [x1, y + 2.6], { w: W.medium, color, fill: PAPER, dash: dashed ? 'hidden' : undefined });
  p.line([x0 - 3, y], [x1 + 3, y], { w: W.thin, color, dash: dashed ? 'hidden' : undefined });
}

/** A fuse on a vertical line: a long box with the wire through it. */
export function fuseV(p: View, x: number, y0: number, y1: number, color: string = INK, dashed = false): void {
  p.rect([x - 2.6, y0], [x + 2.6, y1], { w: W.medium, color, fill: PAPER, dash: dashed ? 'hidden' : undefined });
  p.line([x, y0 - 3], [x, y1 + 3], { w: W.thin, color, dash: dashed ? 'hidden' : undefined });
}

/** A three-phase bridge: a box with a diagonal, the alternating side (~) at the upper left and the direct side (=) at the lower right. */
export function rectifier(p: View, x0: number, x1: number, y: number): void {
  const h = 9;
  p.rect([x0, y - h], [x1, y + h], { w: W.medium, fill: PAPER });
  p.line([x0, y + h], [x1, y - h], { w: W.thin });
  p.text([x0 + 5, y - h + 4.2], '~', { size: 3.4, weight: 'bold', anchor: 'middle', baseline: 'middle' });
  p.text([x1 - 5, y + h - 4], '=', { size: 3.4, weight: 'bold', anchor: 'middle', baseline: 'middle' });
}

/** A battery of three cells, along a vertical line: the line comes from above at (x, y) and goes on below. */
export function battery(p: View, x: number, y: number, color: string = INK): void {
  p.line([x, y], [x, y + 3], { w: W.medium, color });
  for (let i = 0; i < 3; i++) {
    const yy = y + 3 + i * 5.4;
    p.line([x - 6, yy], [x + 6, yy], { w: W.thin * 1.6, color });
    p.line([x - 3, yy + 2.7], [x + 3, yy + 2.7], { w: W.thick * 1.6, color });
  }
  p.line([x, y + 3 + 3 * 5.4 - 2.7], [x, y + 3 + 3 * 5.4 + 3], { w: W.medium, color });
}

/** A resistor along a vertical line, from (x, y) down. */
export function resistor(p: View, x: number, y: number, color: string = INK): void {
  p.line([x, y], [x, y + 3.5], { w: W.medium, color });
  p.rect([x - 2.4, y + 3.5], [x + 2.4, y + 15.5], { w: W.medium, color, fill: PAPER });
  p.line([x, y + 15.5], [x, y + 19], { w: W.medium, color });
}

/** An energy meter: a circle with the unit inside. */
export function meter(p: View, cx: number, cy: number, r: number, unit: string): void {
  p.circle([cx, cy], r, { w: W.medium, fill: PAPER });
  p.text([cx, cy], unit, { size: 1.9, weight: 'bold', anchor: 'middle', baseline: 'middle', mono: true });
}

/** A house: a pitched roof over a box. */
export function house(p: View, cx: number, y: number, w: number, h: number, color: string = INK): void {
  p.polyline(
    [
      [cx - w / 2, y + h],
      [cx - w / 2, y + h * 0.45],
      [cx, y],
      [cx + w / 2, y + h * 0.45],
      [cx + w / 2, y + h],
    ],
    { w: W.medium, color, closed: true, fill: PAPER },
  );
}

/** The earth symbol: three bars of decreasing width, hanging from (x, y). */
export function earth(p: View, x: number, y: number, color: string = COLORS.pe): void {
  p.line([x, y], [x, y + 3], { w: W.medium, color });
  for (let i = 0; i < 3; i++)
    p.line([x - 4 + i * 1.3, y + 3 + i * 1.8], [x + 4 - i * 1.3, y + 3 + i * 1.8], { w: W.medium, color });
}

/** A surge arrester between a line and the earth, along a vertical line from (x, y): a box with an arrow. */
export function surge(p: View, x: number, y: number, color: string = INK): void {
  p.line([x, y], [x, y + 4], { w: W.medium, color });
  p.rect([x - 2.8, y + 4], [x + 2.8, y + 14], { w: W.medium, color, fill: PAPER });
  p.polyline(
    [
      [x - 1.4, y + 6],
      [x + 1.4, y + 9],
      [x - 1.4, y + 9],
      [x + 1.4, y + 12],
    ],
    { w: W.thin, color: COLORS.red },
  );
  p.line([x, y + 14], [x, y + 18], { w: W.medium, color });
}

/** A controlled switch (closed by the controller) along a vertical line from (x, y) down. */
export function switchV(p: View, x: number, y: number, color: string = INK): void {
  p.line([x, y], [x, y + 3], { w: W.medium, color });
  p.line([x, y + 3], [x + 2.8, y + 8.4], { w: W.medium, color });
  p.line([x, y + 9], [x, y + 12], { w: W.medium, color });
  p.circle([x, y + 3], 0.6, { w: W.thin, color, fill: color });
  p.circle([x, y + 9], 0.6, { w: W.thin, color, fill: color });
}

/** A dot on a junction. */
export function dot(p: View, x: number, y: number, color: string = INK): void {
  p.circle([x, y], 0.8, { w: W.thin, color, fill: color });
}

export { INK_2 };
