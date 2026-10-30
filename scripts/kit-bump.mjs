// Move this lab to the latest published release of @onigam/lab-kit (a Git dependency pinned to a tag).
//   node scripts/kit-bump.mjs           update, then typecheck and build
//   node scripts/kit-bump.mjs --check   only print the current and the latest version
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const REPO = 'https://github.com/Onigam/lab-kit.git';
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

const spec = JSON.parse(readFileSync('package.json', 'utf8')).dependencies['@onigam/lab-kit'] ?? '';
const current = spec.match(/#v?(\d+\.\d+\.\d+)$/)?.[1];

const tags = execSync(`git ls-remote --tags ${REPO}`, { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.match(/refs\/tags\/v(\d+\.\d+\.\d+)$/)?.[1])
  .filter(Boolean);
const cmp = (a, b) =>
  a
    .split('.')
    .map(Number)
    .reduce((r, n, i) => r || n - Number(b.split('.')[i]), 0);
const latest = tags.sort(cmp).at(-1);
if (!latest) throw new Error(`No release tag found on ${REPO}`);

console.log(`lab-kit: current ${current ?? spec}, latest ${latest}`);
if (process.argv.includes('--check') || current === latest) process.exit(0);

run(`npm install "@onigam/lab-kit@git+${REPO}#v${latest}"`);
run('npm run typecheck');
run('npm run build');
console.log(`\nNow on lab-kit v${latest}. Review the kit changelog, then commit.`);
