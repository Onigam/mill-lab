// A small stand-in for the few DOM calls the kit's `Drawing` makes (createElementNS, setAttribute, append, cloneNode,
// textContent, querySelector on the defs, XMLSerializer), so that the sheets can be rendered and checked in Node by
// `drawings.test.ts` without a browser. It keeps the element tree, so the checks can walk it (texts, numbers, boxes).
// Not imported by the application.

export class FakeElement {
  readonly attrs = new Map<string, string>();
  children: FakeElement[] = [];
  text = '';
  readonly style: Record<string, string> = {};
  readonly classList = { add: (): void => undefined };

  constructor(readonly tag: string) {}

  setAttribute(name: string, value: unknown): void {
    this.attrs.set(name, String(value));
  }
  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
  hasAttribute(name: string): boolean {
    return this.attrs.has(name);
  }
  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }
  append(...nodes: (FakeElement | string)[]): void {
    for (const n of nodes) {
      if (typeof n === 'string') this.text += n;
      else this.children.push(n);
    }
  }
  remove(): void {}
  cloneNode(deep = false): FakeElement {
    const c = new FakeElement(this.tag);
    for (const [k, v] of this.attrs) c.attrs.set(k, v);
    if (deep) {
      c.text = this.text;
      c.children = this.children.map((x) => x.cloneNode(true));
    }
    return c;
  }
  set textContent(v: string) {
    this.text = v;
    this.children = [];
  }
  get textContent(): string {
    return this.text + this.children.map((c) => c.textContent).join('');
  }
  /** The first descendant with the tag of a simple selector ('defs', 'pattern'), or null. */
  querySelector(sel: string): FakeElement | null {
    if (sel.startsWith('#')) {
      for (const c of this.children) {
        if (c.attrs.get('id') === sel.slice(1)) return c;
        const r = c.querySelector(sel);
        if (r) return r;
      }
      return null;
    }
    for (const c of this.children) {
      if (c.tag === sel) return c;
      const r = c.querySelector(sel);
      if (r) return r;
    }
    return null;
  }
  /** Every descendant (depth first). */
  all(): FakeElement[] {
    return this.children.flatMap((c) => [c, ...c.all()]);
  }
  toXML(): string {
    const attrs = [...this.attrs].map(([k, v]) => ` ${k}="${escapeXml(v)}"`).join('');
    const inner = escapeXml(this.text) + this.children.map((c) => c.toXML()).join('');
    return inner ? `<${this.tag}${attrs}>${inner}</${this.tag}>` : `<${this.tag}${attrs}/>`;
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const fakeDocument = {
  createElementNS: (_ns: string, tag: string): FakeElement => new FakeElement(tag),
  documentElement: { lang: '' },
};

export class FakeXMLSerializer {
  serializeToString(node: FakeElement): string {
    return node.toXML();
  }
}

/** Install the stand-ins on `globalThis` (idempotent). */
export function installFakeDom(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g.document = fakeDocument;
  g.XMLSerializer = FakeXMLSerializer;
}

/** One `<text>` of a rendered sheet, with the attributes the layout checks need (paper mm, transforms of its groups applied). */
export interface TextBox {
  x: number;
  y: number;
  /** font-size in paper mm (the kit draws 1.4 × the cap height asked for), scaled by its groups. */
  size: number;
  anchor: 'start' | 'middle' | 'end';
  baseline: 'alphabetic' | 'central' | 'hanging';
  bold: boolean;
  mono: boolean;
  /** Not horizontal on the sheet (its own rotation or the one of a group). */
  rotated: boolean;
  content: string;
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/** The `transform` attribute of the kit: a chain of translate(x y), rotate(a [x y]) and scale(s). */
function parseTransform(t: string | null): Matrix {
  let m = IDENTITY;
  if (!t) return m;
  for (const part of t.matchAll(/(translate|rotate|scale)\(([^)]*)\)/g)) {
    const args = (part[2] ?? '')
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (part[1] === 'translate') m = multiply(m, [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0]);
    else if (part[1] === 'scale') m = multiply(m, [args[0] ?? 1, 0, 0, args[1] ?? args[0] ?? 1, 0, 0]);
    else {
      const a = ((args[0] ?? 0) * Math.PI) / 180;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const [cx, cy] = [args[1] ?? 0, args[2] ?? 0];
      m = multiply(m, [1, 0, 0, 1, cx, cy]);
      m = multiply(m, [c, s, -s, c, 0, 0]);
      m = multiply(m, [1, 0, 0, 1, -cx, -cy]);
    }
  }
  return m;
}

export function textBoxes(svg: FakeElement): TextBox[] {
  const out: TextBox[] = [];
  const walk = (e: FakeElement, m: Matrix): void => {
    for (const c of e.children) {
      if (c.tag === 'defs') continue;
      const own = parseTransform(c.attrs.get('transform') ?? null);
      if (c.tag === 'text') {
        const full = multiply(m, own);
        const x = Number(c.attrs.get('x'));
        const y = Number(c.attrs.get('y'));
        const base = c.attrs.get('dominant-baseline');
        const angle = (Math.atan2(full[1], full[0]) * 180) / Math.PI;
        // text rotated about its own anchor: `rotate(a x y)` moves the anchor point onto itself, so the position is unchanged
        const p = multiply(m, [1, 0, 0, 1, x, y]);
        out.push({
          x: c.attrs.has('transform') ? p[4] : multiply(m, [1, 0, 0, 1, x, y])[4],
          y: c.attrs.has('transform') ? p[5] : multiply(m, [1, 0, 0, 1, x, y])[5],
          size: Number(c.attrs.get('font-size')) * Math.hypot(m[0], m[1]),
          anchor: (c.attrs.get('text-anchor') as TextBox['anchor']) ?? 'start',
          baseline: base === 'hanging' ? 'hanging' : base === 'central' ? 'central' : 'alphabetic',
          bold: c.attrs.get('font-weight') === '700',
          mono: (c.attrs.get('font-family') ?? '').includes('Mono'),
          rotated: Math.abs(((angle + 180) % 180) - 0) > 0.5 && Math.abs(((angle + 180) % 180) - 180) > 0.5,
          // the kit sets fixed spaces (typography): compare with plain ones
          content: c.textContent.replace(/[\u00a0\u202f]/g, ' '),
        });
      } else walk(c, multiply(m, own));
    }
  };
  walk(svg, IDENTITY);
  return out;
}

/** Estimated bounding box of a text (paper mm): width from the character count, generous like the layout helpers. */
export function textExtent(t: TextBox): { x0: number; x1: number; y0: number; y1: number } {
  const w = t.content.length * t.size * (t.mono ? 0.6 : t.bold ? 0.56 : 0.52);
  const x0 = t.anchor === 'start' ? t.x : t.anchor === 'middle' ? t.x - w / 2 : t.x - w;
  const h = t.size * 0.9;
  const y0 = t.baseline === 'hanging' ? t.y : t.baseline === 'central' ? t.y - h / 2 : t.y - h * 0.85;
  return { x0, x1: x0 + w, y0, y1: y0 + h };
}
