# Wave 2 rules (3D role ‖ data role)

Read `BRIEF.md`, `docs/research.md` (§2 figures, §3 dimensions, §4 worlds, §7 safety, §8 the owner's decisions, §10 wave 1 findings)
and `docs/physics.md` (§1 model, §4 the state the 3D reads, §7 findings) first. Two agents work **at the same time in the same
checkout**, each on its own files. Nothing here overrides `BRIEF.md`.

## The contract: `src/part-ids.ts`

32 ids in 2 worlds (`site` 12, `screw` 20), frozen. A world's `registry.add(id, …)` registers exactly the ids of `partIds(world)`,
no more, no fewer; the catalogue has one entry per id with the same `scene` and `category`. An id you think is missing or wrong:
say so in your report, never add one, never edit `src/part-ids.ts`.

Link between worlds (the lead wires it in `src/lab.ts`): `water-chamber` (site) opens `screw`. The electronics (`rectifier`,
`charge-controller`, `battery`) are drawn in the `screw` world beside the generator; in `site` the small `powerhouse` is ONE part that
houses them (its sheet says so). The water wheel is a comparison only: no part, no world (research §6, §8).

## Who edits what

| Role     | Owns                                                                                                        | Reads only                                  |
| -------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **3D**   | `src/three/**` (`dims.ts` first), `docs/3d.md`, new entries at the end of `docs/kit-requests.md`            | everything else                             |
| **Data** | `src/data/**` except `lessons.ts`, `src/i18n/ui.ts` (add keys, never change existing ones), `docs/data.md`  | `src/three/dims.ts`, `src/sim/**`, the docs |
| **Lead** | `src/lab.ts`, `src/main.ts`, `src/part-ids.ts`, `README.md`, `public/lab.json`, `docs/research.md`, commits | —                                           |

Never touch `src/sim/**`, `src/panels/**`, `src/drawings/**`, `src/data/lessons.ts` (wave 3), `package.json`, `vite.config.ts`.
**Do not commit, do not push, do not delete `src/three/device.ts`** (`src/lab.ts` and the old `src/data/parts.ts` still import it until
the lead rewires them). The data role replaces `src/data/parts.ts` and `src/data/guide.ts` by the new modules and stops importing
`device.ts`; the lead removes the placeholder at integration.

## Running checks while the other agent works

The other role is editing files you do not own, so `npm run typecheck` or `npm test` may show errors there, even transient ones.
**Do not fix files you do not own**: re-run later, and judge your work by your own files (`npx vitest run src/three` or
`npx vitest run src/data`; `npx tsc --noEmit -p . 2>&1 | grep '^src/three'` or `'^src/data'`). Run `npx prettier --write` on your own
files before reporting (CI checks `src/**/*.{ts,css}`, `*.md`, `docs/*.md`). Do not run `npm run build` (the lead does). A dev server is
allowed for your own browser checks on your own port (3D: 5192, data: 5193) and must be stopped when you finish.

## Single source of numbers

- The screw's geometry is **derived by the simulation** from the design point (`src/sim/screw.ts`, `src/sim/machine.ts`, tagged
  `reported` / `verified` / `derived` / `estimate`). `src/three/dims.ts` **imports** those numbers (outer and inner diameter, pitch, length,
  slope, gap, bucket volume, ratios of the drive) and only adds what is geometry (trough walls, bearings, frame, the site: weir, canal,
  chamber, mill, powerhouse, house). Never redeclare a number the simulation has; a test checks the agreement. The 3D scene redraws the
  screw at the size the state carries (`outerDiameter`, `innerDiameter`, `pitch`, `length`, `slopeDeg`) when the visitor changes the
  design point.
- `src/three/dims.ts` is written **first** by the 3D role (metres, every constant tagged), and its exported names are then kept stable.
  The data role takes lengths from `dims.ts` and results from `src/sim` (or `docs/physics.md`), never retypes a dimension. Until
  `dims.ts` exists (`ls src/three/dims.ts`), start with the work that does not need it.
- A number in a text is a reported figure (untagged, with its source in `docs/research.md`) or carries a tag in both languages: derived,
  model result, assumption, estimate (Piggott Lab's `src/data/part-helpers.ts` is the model).
- Honesty: the screw is **generic**, sized by published design rules; the association that builds a wooden screw publishes no dimensions
  and no efficiency. No text may suggest the drawn machine is theirs. Powers and efficiencies shown come from the model (design point
  1.75 m, 180 L/s: about 2.2 kW to the battery, 71 % overall) and say so; the prototype's 200 W and the 2 kW target are quoted as
  reported hopes, never as results.

## Texts

- Every text is bilingual `l(fr, en)`, written together, same detail, no placeholder. French with proper typographic apostrophes (’) and
  the conventions of `src/i18n/ui.ts`.
- Tone of the series: a curious, concrete explanation for a curious adult; no jargon without a definition; short paragraphs. **Never**
  put research codes (K12, S3…) or internal words (world, id, preset) in a visitor text (a guard test exists in `src/panels/strings.test.ts`;
  the data role adds the same guard for its texts).
- Credits and rights (`docs/research.md` §7): independent educational reconstruction; no text, drawing or image copied from a source
  (figures and facts are fine); never quote the private transcripts (`docs/transcript-*.md`, git-ignored: use them to find timestamps and
  structure, not for numbers, the captions garble them).
- Safety is prominent where it matters: open canals and fast water (drowning), the rotating screw (entanglement), lifting and carrying a
  heavy machine into a water chamber with a ladder, the 48 V battery, tools and wood dust; water rights, reserved flow and fish passage
  (said once, in general terms, French wording only in the French text). The lab is not a construction plan.

## What each role delivers

See the two briefs; both end with a short report (what is done, what is not, tests, anything for the lead, any kit request) and notes in
`docs/3d.md` / `docs/data.md`. Keep the notes short and factual: what a reader of the code needs.
