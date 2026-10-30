# Wave 3 rules (drawings role ‖ lessons role)

Read `BRIEF.md`, `docs/wave2-rules.md` (still applies: contract, single source of numbers, texts, honesty, safety), `docs/research.md`
(§2 figures, §5 physics plan, §6 versions, §8 decisions, §10 wave 1 findings), `docs/physics.md` (§6 results, §7 findings),
`docs/3d.md` and `docs/data.md`. Two agents work **at the same time in the same checkout**, each on its own files.

## What the owner decided (research §8): Lite

**3 A3 sheets** and **6 lessons**, no more. The water wheel is a comparison only (curves, the chooser, one lesson): no sheet of a wheel.

## Who edits what

| Role         | Owns                                                                                                                                          | Reads only                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Drawings** | `src/drawings/**` (sheets, helpers, tests), `docs/drawings.md`, new entries at the end of `docs/kit-requests.md`                              | everything else                            |
| **Lessons**  | `src/data/lessons.ts` (and the files it splits into, `src/data/lessons*.test.ts`), new keys at the end of `src/i18n/ui.ts`, `docs/lessons.md` | everything else, `src/sim/**` is read-only |
| **Lead**     | `src/lab.ts`, `src/lab.test.ts`, `src/part-ids.ts`, `README.md`, `public/lab.json`, `docs/research.md`, commits                               | —                                          |

Never touch `src/sim/**` (a missing quantity: say so in your report), `src/three/**`, `src/panels/**`, `src/data/parts/**`,
`src/data/assembly.ts`, `src/data/install.ts`, `src/data/figures.ts`, `src/data/part-helpers.ts` (you may import from them),
`src/part-ids.ts`, `src/lab.ts`, `package.json`, `vite.config.ts`. **Do not commit, push, stash or reset.** The drawings role adds
nothing to `src/i18n/ui.ts` (every text of a sheet is bilingual `l(fr, en)` in its own file). The lessons role adds keys, never changes
an existing one.

## The contract

- **Sheets** (`src/drawings/index.ts` exports `SHEETS: DrawingSheet[]`, currently empty): groups `site` and `screw` (the lead declares
  them in `src/lab.ts` with the existing UI strings `groupSite`, `groupScrew`). `scene` is `'site'` or `'screw'` and `parts` are ids of
  `src/part-ids.ts` in that world ("see in 3D").
- **Lessons** (`src/data/lessons.ts` exports `LESSONS: Lesson[]`, currently one template lesson about a flywheel to replace):
  `focus.scene` is `'site'` or `'screw'`, `focus.part` an id of that world, `focus.preset` one of `PRESET_IDS` and `focus.scenario` one of
  `SCENARIO_IDS` (`src/sim/presets.ts`). The lead's `src/lab.test.ts` checks that every focus exists.

## Checks while the other agent works

Same as wave 2: judge your work by your own files (`npx vitest run src/drawings` or `npx vitest run src/data/lessons`;
`npx tsc --noEmit -p . 2>&1 | grep '^src/drawings'` or `'^src/data/lessons'`). Another role's transient errors are not yours.
`npx prettier --write` on your own files before the report. Do not run `npm run build`.

## Looking at the result

Headless Chrome with puppeteer-core is the reliable way to see the app (copy the scripts, do not edit the originals): an install is in
`/private/tmp/claude-501/-Users-magino-Dev-mrcarve-m1-pro-macos/39e81513-2a30-42b9-ad5b-fe1e506a4552/scratchpad/shots/node_modules`
(`NODE_PATH=…`), Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, args `--use-gl=angle --use-angle=swiftshader
--enable-unsafe-swiftshader --hide-scrollbars`. **Start your own dev server on your own port** (drawings: `npx vite --port 5601`,
lessons: `npx vite --port 5602`), stop it at the end. Until the lead wires `plans` and `lessons` in `src/lab.ts` the modes are hidden:
mount your own harness page OUTSIDE the tracked files (the sheets render to SVG: render them in a tiny page of your own), or read
`window.__lab` (dev only). Wait 6 to 9 s after a load (software GL is slow). Look at 1280×800, 768×1024 and 390×844, in French and in
English, with the Read tool on the PNGs; fix what you see (clipped text, overlapping dimensions, an unreadable chart).

## Content rules

- A number in a text or on a sheet is a reported figure (untagged, its source in `docs/research.md`), a value read from `dims.ts`
  (`src/three/dims.ts`) or from `src/sim`, or a **model result** tagged as such and recomputed from `src/sim` by a test (the figures move
  if the model is ever recalibrated: the test must fail loudly, as `src/data/data.test.ts` does). Reuse `src/data/figures.ts` (`MODEL`, `FIG`)
  and `src/data/part-helpers.ts` (the tag helpers `tf`, `lf`) instead of recomputing or retyping.
- Honesty (wave 1 findings): the screw is **generic**; the prototype's 200 W and the 2 kW target are hopes, and the model's 206 W and
  2.2 kW at those flows are a circular derivation; the efficiency (screw 84.6 %, overall 71 % at the design point) is a model result
  one point above the hoped 60 to 70 %; the wheel efficiencies come from sources that disagree and the lab's wheel is anchored on their
  ranges; the reserved flow of 10 % is an estimate; the theory behind the friction and overflow models was partly not read.
- Never put research codes (K12, S3…) or internal words (world, id, preset) in a visitor text or on a sheet. The association and the
  authors are credited in the Sources panel (lead); texts say "the video", "published design rules".
- Safety stays prominent where it matters (open canals, the rotating screw, the 48 V battery); the lab is not a construction plan: no
  dimension beyond what `dims.ts` marks as derived or estimate, and the sheets say so.
- No text, drawing or image copied from a source; no quotation of the private transcripts.

## Final report (at most 350 words)

What you delivered (files, counts, tests), what you could not verify, every estimate or unknown that matters, what the lead must wire
in `src/lab.ts`, what looks weakest, kit requests added.
