// A small chart helper for the sheets (the kit has `LineChart` for the live canvas panels but nothing for an SVG drawing: see
// docs/kit-requests.md). Ported from the ram lab (src/drawings/hydraulic/chart.ts), trimmed. Everything is drawn in paper space
// inside a box (paper mm): axes with ticks and labels, a grid, polylines, markers. Values are in data units; `X` and `Y` map them.
import {
  COLORS,
  INK,
  INK_2,
  W,
  type Pt,
  type Stroke,
  type Text,
  type TextOpts,
  type View,
} from '@onigam/lab-kit/drawings';

export interface Axis {
  min: number;
  max: number;
  /** Distance between ticks. */
  step: number;
  /** Axis title (with its unit). */
  label?: Text;
  /** Label of a tick (default: the integer). */
  fmt?: (v: number) => string;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MarkerKind = 'circle' | 'diamond' | 'square';

export class Chart {
  constructor(
    readonly view: View,
    readonly box: Box,
    readonly xa: Axis,
    readonly ya: Axis,
  ) {}

  /** Data x to paper x. */
  X = (v: number): number => this.box.x + ((v - this.xa.min) / (this.xa.max - this.xa.min)) * this.box.w;
  /** Data y to paper y. */
  Y = (v: number): number => this.box.y + this.box.h - ((v - this.ya.min) / (this.ya.max - this.ya.min)) * this.box.h;

  private ticks(a: Axis): number[] {
    const out: number[] = [];
    for (let v = a.min; v <= a.max + a.step * 1e-6; v += a.step) out.push(Math.round(v / a.step) * a.step);
    return out;
  }

  /** The grid, the frame, the ticks with their labels and the titles of the axes. */
  frame(): this {
    const p = this.view;
    const { x, y, w, h } = this.box;
    const xf = this.xa.fmt ?? ((v: number) => String(Math.round(v)));
    const yf = this.ya.fmt ?? ((v: number) => String(Math.round(v)));
    for (const v of this.ticks(this.ya))
      if (v > this.ya.min && v < this.ya.max) p.line([x, this.Y(v)], [x + w, this.Y(v)], { w: 0.08, color: '#cfc8b8' });
    for (const v of this.ticks(this.xa))
      if (v > this.xa.min && v < this.xa.max) p.line([this.X(v), y], [this.X(v), y + h], { w: 0.08, color: '#cfc8b8' });
    p.rect([x, y], [x + w, y + h], { w: W.medium, color: INK });
    for (const v of this.ticks(this.xa)) {
      p.line([this.X(v), y + h], [this.X(v), y + h + 1.2], { w: W.thin });
      p.text([this.X(v), y + h + 4.6], xf(v), { size: 2, anchor: 'middle', mono: true });
    }
    for (const v of this.ticks(this.ya)) {
      p.line([x, this.Y(v)], [x - 1.2, this.Y(v)], { w: W.thin });
      p.text([x - 2.4, this.Y(v)], yf(v), { size: 2, anchor: 'end', baseline: 'middle', mono: true });
    }
    if (this.xa.label) p.text([x + w / 2, y + h + 10], this.xa.label, { size: 2.2, anchor: 'middle', color: INK_2 });
    if (this.ya.label)
      p.text([x - 14, y + h / 2], this.ya.label, { size: 2.2, anchor: 'middle', rotate: 90, color: INK_2 });
    return this;
  }

  line(pts: Pt[], s: Stroke = {}): void {
    this.view.polyline(
      pts.map(([a, b]): Pt => [this.X(a), this.Y(b)]),
      { w: W.medium, ...s },
    );
  }

  hline(v: number, s: Stroke = {}, x0 = this.xa.min, x1 = this.xa.max): void {
    this.view.line([this.X(x0), this.Y(v)], [this.X(x1), this.Y(v)], { w: W.thin, color: INK_2, ...s });
  }

  vline(v: number, s: Stroke = {}, y0 = this.ya.min, y1 = this.ya.max): void {
    this.view.line([this.X(v), this.Y(y0)], [this.X(v), this.Y(y1)], { w: W.thin, color: INK_2, ...s });
  }

  marker(
    x: number,
    y: number,
    kind: MarkerKind = 'circle',
    o: { r?: number; color?: string; fill?: string; w?: number } = {},
  ): void {
    const p = this.view;
    const c: Pt = [this.X(x), this.Y(y)];
    const r = o.r ?? 1.4;
    const st: Stroke = { w: o.w ?? W.medium, color: o.color ?? INK, fill: o.fill ?? COLORS.paper };
    if (kind === 'circle') p.circle(c, r, st);
    else if (kind === 'square') p.rect([c[0] - r, c[1] - r], [c[0] + r, c[1] + r], st);
    else
      p.polyline(
        [
          [c[0], c[1] - r * 1.3],
          [c[0] + r * 1.3, c[1]],
          [c[0], c[1] + r * 1.3],
          [c[0] - r * 1.3, c[1]],
        ],
        { ...st, closed: true },
      );
  }

  /** Text at a data position (offsets in paper mm). */
  text(x: number, y: number, str: Text, o: TextOpts & { dx?: number; dy?: number } = {}): void {
    this.view.text([this.X(x) + (o.dx ?? 0), this.Y(y) + (o.dy ?? 0)], str, { size: 2, ...o });
  }
}
