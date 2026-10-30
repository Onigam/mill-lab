// Checks that every spoken segment of `public/audio/<lang>/manifest.json` has its audio file next to it and that the
// manifest matches the script it was generated from (`narration/<lang>.json`). Run by `npm run build`.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const audio = join(root, 'public/audio');
const problems = [];

// no audio yet (the script alone is written): nothing to check
for (const lang of existsSync(audio) ? readdirSync(audio) : []) {
  const dir = join(audio, lang);
  if (!statSync(dir).isDirectory()) continue;
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const scriptPath = join(root, 'narration', `${lang}.json`);
  const script = existsSync(scriptPath) ? JSON.parse(readFileSync(scriptPath, 'utf8')) : null;
  const ids = new Set();
  for (const seg of manifest.segments) {
    if (ids.has(seg.id)) problems.push(`${lang}: duplicate segment ${seg.id}`);
    ids.add(seg.id);
    if (!existsSync(join(dir, seg.file))) problems.push(`${lang}: missing audio file ${seg.file}`);
  }
  if (!ids.has('intro')) problems.push(`${lang}: no intro segment`);
  if (script) {
    for (const seg of script.segments)
      if (!ids.has(seg.id)) problems.push(`${lang}: ${seg.id} is in the script, not in the manifest`);
    for (const id of ids)
      if (!script.segments.some((s) => s.id === id))
        problems.push(`${lang}: ${id} is in the manifest, not in the script`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
