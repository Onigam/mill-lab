# Polish rules: water ‖ scenery (3D only)

The owner asked (2026-10-30) for **a more realistic scenery** and **better fluid mechanics of the water** in the 3D worlds of the mill lab.
Two agents work **at the same time in the same checkout**, each on its own files. Read `BRIEF.md`, `docs/wave2-rules.md` (the contract,
honesty, no names), `docs/3d.md` (how the worlds are built, the animation mapping, the budgets) and `docs/physics.md` §1 and §4 (the model and
the `MillState` the 3D reads) first.

**What does not change.** The 32 part ids and their world (`src/part-ids.ts`), the hotspots and their labels (`src/lab.test.ts` ties them to
the part sheets), the camera poses and the framing, the kit's display modes (isolate, ghost, X-ray, section, explode, flows, labels), the
interface, the texts, the simulation (`src/sim/**` is read-only: if a quantity is missing, say so in the report), the guides and lessons. The
look stays readable rather than photographic, in the same family as the other labs (soft palette, paper-like light), but clearly richer.

## Who edits what

| Role        | Owns                                                                                                                                                                                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Water**   | new `src/three/water/**`; `src/three/site/water.ts`; `src/three/screw/water.ts`; in `src/three/site/parts.ts` the water meshes and materials of `buildRiver`, `buildWeir`, `buildNotch`, `buildFishPass`, `buildHeadrace`, `buildTailrace`, `PocketBuilder` and the chamber's water; `docs/water.md`; new tests `src/three/water/*.test.ts`                   |
| **Scenery** | new `src/three/site/terrain.ts`, `vegetation.ts`, `props.ts`, `materials.ts` (procedural stone, plaster, tiles, bark, grass, soil); `src/three/site/buildings.ts`; `src/three/site/sky.ts`; in `src/three/site/parts.ts` `buildGround` and the **materials** (not the geometry) of the masonry; `docs/scenery.md`; new tests `src/three/site/scenery.test.ts` |
| **Lead**    | `src/lab.ts`, `src/part-ids.ts`, the other docs, commits, integration, the final budget and screenshot comparison                                                                                                                                                                                                                                             |

`src/three/site/scene.ts` and `src/three/screw/scene.ts` are **shared**: the water role edits only the sections "river, weir, notch, fish pass",
"headrace, rack, gate", "tailrace", "the water dots" and the water parts of `update` (and in the screw scene the water of the pockets, the
pools and the flow dots); the scenery role edits only "scenery: the land", "buildings", "poles and the lines", the trees and props. **Make small,
localised `Edit`s, re-`Read` a shared file right before each edit, never rewrite a shared file with `Write`.**

Read-only for both: `src/three/common.ts`, `merge.ts`, `world.ts`, `framing.ts`, `cut.ts`, `index.ts`, `test-utils.ts`, all existing tests (a
legitimate geometry change that breaks one: say so in the report, do not weaken it), `src/sim/**`, `src/panels/**`, `src/data/**`,
`src/drawings/**`, `src/lab.ts`, `package.json`, `vite.config.ts`. `src/three/dims.ts`: **append-only**, each role in its own exported block at
the end (`WATER_FX` for the water, `SCENERY` for the scenery), every constant tagged `estimate`; existing constants are not changed (the sheets,
the data and the 3D agree on them). **Do not commit, push, stash, reset or checkout.**

## The contract between the two roles: the water and the land meet at the dims

- The river, the canal (headrace), the tailrace and the chamber have their positions, widths, bed and water levels in `dims.ts` (`SITE` block and
  the screw layout). The **terrain** leaves exactly those openings and slopes its banks down to them; the **water** fills exactly those openings
  (a few centimetres under the banks, so there is never a gap or a floating edge). The water level follows the state, so the terrain never rises
  above the highest water level (flood: `tailRise`), except on the real banks.
- The masonry that holds the water (weir body, canal walls, quay, chamber) keeps its geometry and part ids; the scenery role may give it a stone
  material; the water role may paint foam where water meets it.
- A part that is registered keeps a material the kit can drive: `MeshStandardMaterial` (patched with `onBeforeCompile` if needed), never a bare
  `ShaderMaterial`, never a material that ignores `opacity`/`transparent`/`clippingPlanes`/`side`: the kit's isolate, ghost, X-ray and section
  modes act on those. The water meshes inside registered parts follow the same rule; unregistered scenery is free.

## Budgets (counted from the scene graph, as the existing tests do; say the numbers you get)

| World         | Draw calls  | Triangles       | Notes                                                                                                                                  |
| ------------- | ----------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `site` (both) | at most 220 | at most 400,000 | scenery at most 110 and 280,000, water at most 50 and 70,000 (now: 76 and 33,000 in all). Use instancing and the repo's `mergeStatic`. |
| `screw`       | at most 160 | at most 220,000 | the water role owns the growth (now: 83 and 47,000)                                                                                    |

No new network asset (every texture is procedural, generated at start-up, each at most 1024², all together at most 24 MB, generation under about
150 ms on a laptop), no post-processing, no extra render pass or render target (no planar reflection), fragment shaders cheap enough for a mid-range
phone (about 30 fps), the worlds stay `lazyModule`s (nothing is built until the visitor goes there), and the first build of a world stays under
about 400 ms on a laptop (log the number). A bundle growth of more than about 60 KB gzip must be justified in the report.

## Existing tests and checks

All 86 tests of `src/three` and the lead's `src/lab.test.ts` must keep passing: ids, no floating part, dimensions agree with the simulation, labels
apart and inside the view at the four replica sizes, budgets. Add your own tests (what you build exists, follows the state, stays inside the openings,
stays inside the budget). `npx prettier --write` on your files; keep `npx vitest run src/three` and `npx tsc --noEmit -p .` clean for your files
(the other role's transient errors are not yours: re-run later). Do not run `npm run build`.

## Looking at the result (the real app is wired now)

Headless Chrome with puppeteer-core: an install is in
`/private/tmp/claude-501/-Users-magino-Dev-mrcarve-m1-pro-macos/39e81513-2a30-42b9-ad5b-fe1e506a4552/scratchpad/shots/node_modules` (`NODE_PATH=…`),
Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, args `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader
--hide-scrollbars`. **Your own dev server on your own port** (water: `npx vite --port 5701`, scenery: `npx vite --port 5702`), stopped at the end; it
exposes `window.__lab`. Software GL is slow: wait 9 to 12 s after a load or a world change; the first frame in headless Chrome flings the camera
(kit request 13): wait or click "Vue d'ensemble". Scratch files only in your own folder under the scratchpad (water: `mill-polish-water/`, scenery:
`mill-polish-scenery/`), never in the repo. **The before pictures** are in
`/private/tmp/claude-501/-Users-magino-Dev-mrcarve-m1-pro-macos/39e81513-2a30-42b9-ad5b-fe1e506a4552/scratchpad/mill-polish-before/`
(`site-overview.png`, `site-weir.png`, `screw-overview.png`, `screw-cut.png`, 1280×800 French): take the same views after your work and compare
yourself. Look at 1280×800 and 390×844, and at least the overview, a close view of the structure you changed, the section of the screw, a flood
(`applyScenario('flood')`), low water and a closed gate, with the Read tool on the PNGs; fix what you see.

## Honesty and content

- The water follows the simulation: surface speeds, levels, overflow depth and the drop across a clogged rack come from `MillState` and `dims.ts`
  (the canal speed assumption is in `src/sim/machine.ts`); never invent a physical value. Say in `docs/water.md` which effects are physical
  (a number from the state) and which are decorative.
- No person, channel, company or brand name anywhere; no image or text copied from a source (procedural everything); the screw is generic.
- The picture must stay educational: foam, spray and ripples must not hide the parts; the pockets of water in the screw stay readable.

## Final report (at most 400 words)

What you delivered (files, tests), the budgets you measured (draw calls, triangles, first-build time, texture memory, bundle growth), what is
physical and what is decorative, before and after (what you compared and what changed), what you could not verify (real phones), what looks
weakest, anything for the lead to wire, kit requests added (append at the end of `docs/kit-requests.md` only if you are the water role; the scenery
role reports them to the lead).
