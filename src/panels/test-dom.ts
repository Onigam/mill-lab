// A small stand-in for the DOM calls the kit's builders (`h`, `fill`, `icon`, `rich`, the form widgets and the canvas charts)
// make, so that the simulation panel can be rendered and driven in Node by sim.test.ts without a browser. It keeps the
// element tree, so a test can read the texts, find the buttons and click them. Not imported by the application.

export class FakeNode {}

export class FakeText extends FakeNode {
  constructor(public data: string) {
    super();
  }
}

type Listener = (ev: unknown) => void;

/** A canvas 2D context that accepts every call and every assignment (the charts draw into it). */
const context = new Proxy(
  {},
  {
    get: () => () => ({ width: 10 }),
    set: () => true,
  },
);

export class FakeElement extends FakeNode {
  children: FakeNode[] = [];
  readonly attrs = new Map<string, string>();
  readonly listeners = new Map<string, Listener[]>();
  readonly style: Record<string, string> = {};
  className = '';
  title = '';
  value = '';
  checked = false;
  width = 0;
  height = 0;
  clientWidth = 320;

  constructor(readonly tagName: string) {
    super();
  }

  /** `disabled` and `open` reflect their attribute, as in a browser. */
  get disabled(): boolean {
    return this.attrs.has('disabled');
  }
  set disabled(on: boolean) {
    if (on) this.attrs.set('disabled', '');
    else this.attrs.delete('disabled');
  }
  get open(): boolean {
    return this.attrs.has('open');
  }
  set open(on: boolean) {
    if (on) this.attrs.set('open', '');
    else this.attrs.delete('open');
  }

  readonly classList = {
    toggle: (name: string, force?: boolean): boolean => {
      const set = new Set(this.className.split(/\s+/).filter(Boolean));
      const on = force ?? !set.has(name);
      if (on) set.add(name);
      else set.delete(name);
      this.className = [...set].join(' ');
      return on;
    },
    add: (name: string): void => void this.classList.toggle(name, true),
    remove: (name: string): void => void this.classList.toggle(name, false),
    contains: (name: string): boolean => this.className.split(/\s+/).includes(name),
  };

  setAttribute(name: string, value: unknown): void {
    this.attrs.set(name, String(value));
    if (name === 'class') this.className = String(value);
  }
  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
  addEventListener(type: string, fn: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  /** Fire the listeners of an event, as the browser would. */
  dispatch(type: string, ev: unknown = { target: this }): void {
    for (const fn of this.listeners.get(type) ?? []) fn(ev);
  }
  click(): void {
    if (!this.disabled) this.dispatch('click');
  }
  append(...nodes: (FakeNode | string)[]): void {
    for (const n of nodes) {
      if (typeof n === 'string') this.children.push(new FakeText(n));
      else if (n instanceof FakeFragment) this.children.push(...n.children);
      else this.children.push(n);
    }
  }
  prepend(...nodes: (FakeNode | string)[]): void {
    const before = this.children;
    this.children = [];
    this.append(...nodes);
    this.children.push(...before);
  }
  replaceChildren(...nodes: (FakeNode | string)[]): void {
    this.children = [];
    this.append(...nodes);
  }
  get textContent(): string {
    return this.children
      .map((c) => (c instanceof FakeText ? c.data : c instanceof FakeElement ? c.textContent : ''))
      .join('');
  }
  set textContent(v: string) {
    this.children = v ? [new FakeText(v)] : [];
  }
  getBoundingClientRect(): { left: number } {
    return { left: 0 };
  }
  getContext(): unknown {
    return context;
  }
  /** Every descendant element, depth first. */
  all(): FakeElement[] {
    return this.children.flatMap((c) => (c instanceof FakeElement ? [c, ...c.all()] : []));
  }
  /** The first descendant matching a simple selector (a tag and/or a class), as in the browser. */
  querySelector(selector: string): FakeElement | null {
    return this.find(selector)[0] ?? null;
  }
  /** Descendants with a tag and/or a class: `find('button')`, `find('.readout')`, `find('details.sim-section')`. */
  find(selector: string): FakeElement[] {
    const [, tag = '', cls = ''] = /^([a-z0-9]*)(?:\.([\w-]+))?$/.exec(selector) ?? [];
    return this.all().filter((e) => (!tag || e.tagName === tag) && (!cls || e.classList.contains(cls)));
  }
}

export class FakeFragment extends FakeElement {
  constructor() {
    super('#fragment');
  }
}

export const fakeDocument = {
  createElement: (tag: string): FakeElement => new FakeElement(tag),
  createElementNS: (_ns: string, tag: string): FakeElement => new FakeElement(tag),
  createTextNode: (data: string): FakeText => new FakeText(data),
  createDocumentFragment: (): FakeFragment => new FakeFragment(),
  documentElement: { lang: '' },
};

/** Install the stand-ins on `globalThis`. */
export function installFakeDom(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g.document = fakeDocument;
  g.Node = FakeNode;
  g.window = { devicePixelRatio: 1 };
  // the kit's charts redraw when their panel is resized: nothing resizes here
  g.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
