// Visual regression for a lab: walks every world × mode (and every drawing sheet) of the kit's frame, in
// headless Chrome, and compares two builds pixel by pixel (A = reference, B = candidate). With only B set,
// it just takes the screenshots for review.
//
//   npm i --no-save puppeteer-core pixelmatch pngjs        (in a scratch copy, never commit these)
//   B=http://localhost:5173/ node tools/visual-regression/run.mjs                       screenshots only
//   A=http://localhost:5400/ B=http://localhost:5173/ node tools/visual-regression/run.mjs   compare
//   MOBILE=1 …    390×844 instead of 1280×800;   THRESHOLD=0.5   fail above this % of differing pixels
//
// Both servers must run in dev mode (window.__lab exposes the stage). Needs Google Chrome.
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { A, B } = process.env;
if (!B) throw new Error('Set B to the URL of the build to check.');
const OUT = process.env.OUT ?? '/tmp/visual-regression';
const THRESHOLD = Number(process.env.THRESHOLD ?? 0.5);
const viewport = process.env.MOBILE ? { width: 390, height: 844, isMobile: true } : { width: 1280, height: 800 };
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(base, tag) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab && document.querySelector('.rail button'), { timeout: 90000 });
  const settle = async () => {
    await sleep(700);
    await page.waitForFunction(() => !window.__lab.stage.fly, { timeout: 90000 }).catch(() => {});
    await sleep(500);
  };
  await settle();
  await page.evaluate(() => window.__lab.engine.set({ running: false }));

  const files = {};
  const snap = async (name) => {
    await settle();
    files[name] = `${OUT}/${tag}-${name}.png`;
    await page.screenshot({ path: files[name] });
  };
  const click = (selector, i) => page.evaluate((s, n) => document.querySelectorAll(s)[n]?.click(), selector, i);
  const count = (selector) => page.evaluate((s) => document.querySelectorAll(s).length, selector);

  const scenes = await count('.scene-switch button');
  const modes = await page.evaluate(() =>
    [...document.querySelectorAll('.rail button')].map((b) => b.textContent.trim()),
  );
  for (let s = 0; s < scenes; s++) {
    await click('.scene-switch button', s);
    for (let m = 0; m < modes.length; m++) {
      await click('.rail button', m);
      const label = modes[m]
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/\W+/g, '-');
      await snap(`scene${s}-${label}`);
      if (/plans|drawings/i.test(modes[m]) && s === 0) {
        const sheets = await count('.sheet-row');
        for (let k = 0; k < sheets; k++) {
          await click('.sheet-row', k);
          await snap(`sheet${k}`);
        }
      }
    }
  }
  await click('.lang-switch button', 1);
  await click('.rail button', 0);
  await snap('en-explore');
  await browser.close();
  return { files, errors };
}

const b = await shoot(B, 'B');
console.log(`B: ${Object.keys(b.files).length} screenshots in ${OUT}, page errors: ${b.errors.length}`);
b.errors.slice(0, 3).forEach((e) => console.log('  ', e));
if (!A) process.exit(b.errors.length ? 1 : 0);

const { PNG } = await import('pngjs');
const { default: pixelmatch } = await import('pixelmatch');
const a = await shoot(A, 'A');
let worst = 0;
for (const name of Object.keys(a.files)) {
  if (!b.files[name]) continue;
  const pa = PNG.sync.read(fs.readFileSync(a.files[name]));
  const pb = PNG.sync.read(fs.readFileSync(b.files[name]));
  if (pa.width !== pb.width || pa.height !== pb.height) {
    console.log(name.padEnd(28), 'size differs');
    worst = 100;
    continue;
  }
  const diff = new PNG({ width: pa.width, height: pa.height });
  const n = pixelmatch(pa.data, pb.data, diff.data, pa.width, pa.height, { threshold: 0.15 });
  const pct = (100 * n) / (pa.width * pa.height);
  worst = Math.max(worst, pct);
  if (pct > 0.05) fs.writeFileSync(`${OUT}/DIFF-${name}.png`, PNG.sync.write(diff));
  console.log(name.padEnd(28), `${pct.toFixed(3)} %`);
}
console.log(
  `worst difference: ${worst.toFixed(3)} % (threshold ${THRESHOLD} %); page errors A/B: ${a.errors.length}/${b.errors.length}`,
);
process.exit(worst > THRESHOLD || b.errors.length ? 1 : 0);
