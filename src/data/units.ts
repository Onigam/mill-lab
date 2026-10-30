// Number formatting shared by the data files, so that a figure is written once and shown the right way in each language:
// 7,5 in French, 7.5 in English. Ported from the ram lab (src/data/units.ts), trimmed to what this lab uses.

/** Round to `digits` decimals without the floating-point noise (0.1 + 0.2 -> 0.3). */
export function round(x: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

function group(int: string, sep: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** French number: decimal comma, space between thousands (5 700, 7,5). */
export function nFr(x: number, digits = 0): string {
  const [int, dec] = round(x, digits).toFixed(digits).split('.');
  return group(int ?? '', ' ') + (dec ? `,${dec}` : '');
}

/** English number: decimal point, comma between thousands (5,700, 7.5). */
export function nEn(x: number, digits = 0): string {
  const [int, dec] = round(x, digits).toFixed(digits).split('.');
  return group(int ?? '', ',') + (dec ? `.${dec}` : '');
}

/** `x` with at most two decimals and no trailing zero (2.0 -> "2", 0.55 -> "0,55" / "0.55"). */
export function nFrTrim(x: number): string {
  return nFr(x, 2).replace(/,?0+$/, '');
}

export function nEnTrim(x: number): string {
  return nEn(x, 2).replace(/\.?0+$/, '');
}

/** Decimals needed to show a length given in metres as millimetres without losing the tenth: 0.0186 -> 1, 0.075 -> 0. */
export function mmDigits(m: number): number {
  return Math.abs(m * 1000 - Math.round(m * 1000)) < 1e-6 ? 0 : 1;
}

/** One length in metres as millimetres, in both languages ("18,6" / "18.6"), without the unit. */
export function mm(m: number): { fr: string; en: string } {
  const d = mmDigits(m);
  return { fr: nFr(m * 1000, d), en: nEn(m * 1000, d) };
}

/** Several lengths in metres as "a × b × c" millimetres, in both languages, without the unit. */
export function mmBox(...m: number[]): { fr: string; en: string } {
  const parts = m.map(mm);
  return { fr: parts.map((p) => p.fr).join(' × '), en: parts.map((p) => p.en).join(' × ') };
}
