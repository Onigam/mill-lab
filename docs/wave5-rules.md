# Completion wave A: 3D ‖ data (two new worlds)

**Why.** Mill Lab was called finished with 2 3D worlds and no spoken guide; the lab standard (`docs/lab-standard.md` of lab-kit, checked by
`src/standard.test.ts`) asks for **4 worlds, 36 parts, 8 drawings and a spoken guide in French and English**. The owner said "Oui, complète".
This wave adds the two worlds and their parts, guides and texts. Wave B (drawings, lessons, narration scripts) follows once this one is
integrated. Read `BRIEF.md`, `docs/wave2-rules.md` (the single source of numbers, texts, honesty, safety; it still applies), `docs/3d.md`,
`docs/data.md`, `docs/water.md`, `docs/scenery.md` (the finish of the existing worlds: new worlds must look as finished) and `docs/physics.md`
(§1.8 `sim/mech` and the generator, §4 the state, §6 results) first.

## The contract: `src/part-ids.ts` (47 ids in 4 worlds, frozen)

`site` 12, `screw` **17**, `generator` **8**, `powerroom` **10**. A world's `registry.add(id, …)` registers exactly the ids of `partIds(world)`;
the catalogue has one entry per id with the same `scene` and `category`. An id you think is missing or wrong: say so in the report, never add one.

- **`generator` world** (reached from the `generator` part of the `screw` world): the permanent-magnet generator in section and exploded, a
  three-phase **radial-flux machine with an inner rotor and surface magnets**: `gen-frame`, `gen-stator`, `gen-coils`, `gen-rotor`, `gen-magnets`,
  `gen-shaft`, `gen-bearings`, `gen-terminals`. It is the **same machine** as the blue generator of the `screw` and `site` worlds (same body length,
  diameter, shaft height, terminal box): see "coherence" below. Its numbers: 600 rpm at the design point, 39 N·m, 2.2 kW to the battery (model
  results of `src/sim`, `docs/physics.md` §1.8 and §6); the number of poles and the electrical frequency (`f = poles × rpm / 120`), the slot
  count, the magnet size and the air gap are **estimates** (tag them; nothing in the sources gives them).
- **`powerroom` world** (reached from the `powerhouse` part of the `site` world): the wall of the little building where the current goes through
  protection, rectification, regulation, storage and use, **in the order the current goes**: `dc-breaker`, `fuse-box`, `rectifier`,
  `charge-controller`, `battery`, `dump-load`, `inverter`, `energy-meter`, with the `switchboard` (the board and enclosure that carry them) and
  `earthing` (earth rod, bonding and surge protection). **`rectifier`, `charge-controller` and `battery` move here from the `screw` world**:
  the `screw` world no longer draws the electronics board, only the generator at the end of the belt and a cable leaving towards the
  powerhouse (like the `site` world). The `dump-load` is **not simulated** (the model has no diversion load): its sheet says so; real
  small hydro plants have one. No brand or product name anywhere.
- **Links** (the 3D role wires them in `src/lab.ts`): `generator` (screw) opens `generator`; `powerhouse` (site) opens `powerroom`; the new
  worlds' overviews have a way back (`goScrew`, `goSite`) and the screw's and the site's overviews have the new shortcuts (`goGenerator`,
  `goPowerroom`, already in `src/i18n/ui.ts` with `sceneGenerator`, `scenePowerroom`, `groupGenerator`, `groupPowerroom`). `src/data/overviews.ts` has
  **placeholder** texts for the two worlds: the data role replaces them.

## Who edits what

| Role     | Owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3D**   | new `src/three/generator/**` and `src/three/powerroom/**`; `src/three/index.ts` (`createGeneratorScene`, `createPowerroomScene`, `WORLD.generator`, `WORLD.powerroom`); `src/three/dims.ts` (append-only blocks `GENERATOR` and `POWERROOM`, every constant tagged); `src/three/screw/**` (remove the electronics board, keep the generator and the cable out); `src/three/site/**` (the `powerhouse` hotspot `goto`, a door or sign on the building); `src/lab.ts` (only the two scenes, `partLinks`, overview actions); `src/lab.test.ts` (only the expected list of scenes); their tests; `docs/3d.md` (a section) |
| **Data** | `src/data/**` except `lessons.ts`; `src/i18n/ui.ts` (add keys, never change existing ones); `docs/data.md` (a section)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Lead** | `src/part-ids.ts`, `docs/research.md`, `README.md`, `public/lab.json`, wave B, integration, commits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Never touch `src/sim/**`, `src/panels/**`, `src/drawings/**`, `src/data/lessons*`, `package.json`, `vite.config.ts`, the water files (`src/three/water/**`,
`site/water.ts`, `screw/water.ts`). **Do not commit, push, stash, reset or checkout.** The other role's transient errors (the contract changed under
both of you: `data.test.ts` and `lab.test.ts` fail until you both deliver) are not yours: judge your work by your own files
(`npx vitest run src/three`, `npx vitest run src/data`; `npx tsc --noEmit -p . 2>&1 | grep '^src/three'` / `'^src/data'`), `npx prettier --write` on your files.

## What each role delivers

**3D**: `dims.ts` blocks first (names stable: the data role reads them); the two worlds with `registry.add` for exactly their ids, explode offsets,
hotspots (main and minor, bilingual: **the label equals the part sheet's name**, `src/lab.test.ts` checks it: the data role's names are the
authority, agree on them through the first lines of `docs/data.md` or keep the obvious name), home poses, section (the generator's section along
its axis and across it is the hero view; the powerroom needs no section), X-ray rules, flows (the current along the wires in the powerroom, driven by
`MillState.current` and `charging`), labels that never overlap at the four replica sizes (`labels.test.ts`), animation from the state (the rotor, shaft and
magnets turn at `generatorRpm` with the visual cap; the battery bars, the controller LED and the meter from `charging`, `electricPower`, `current`),
the finish of the existing worlds (procedural materials like `src/three/site/materials.ts`, soft light, a believable room: floor, walls, conduit,
cable trays, labels on the equipment: in the `powerroom` the visitor should feel inside a small electrical room). Tests: ids exact, no floating part,
dimensions agree with the simulation, budgets, the coherence test below, NaN sweep, explode and isolate for every part. docs/3d.md section.

**Data**: sheets for the 15 new parts and the three moved ones (their `scene` becomes `powerroom`; their texts say they stand in the powerhouse, not beside the
generator), same quality as the existing sheets (tags on every non-reported number in both languages, tips, maintenance, safety); the **assembly guide**
grows to at least **30 steps in all** (steps in the `generator` world: frame, bearings, shaft and rotor, magnets, stator and coils, terminals; steps in the
`powerroom` world: board, breaker and fuses, rectifier, controller, battery, dump load, inverter, meter, earthing, first test), the **installation guide** to at
least **13 steps** (the powerhouse: wiring order, earthing, protections, first start, what to check); **real texts** for `OVERVIEWS.generator` and
`OVERVIEWS.powerroom`; chapters of the main video where the generator or the electrics appear, if any (timestamps from the private transcript, no
sentence copied); extra UI keys if needed; `data.test.ts` updated (the contract, the tags, the guides, honesty checks: the dump load is not simulated,
the pole count is an estimate, no brand). docs/data.md section.

## Coherence (a test, as for the site's drive train)

The generator drawn in the `screw` and `site` worlds and the one of the `generator` world are the same machine: same frame length and diameter, same shaft,
same terminal box position (compare the bounds of the matching parts within a few millimetres, from the shared dims). The three electronics pieces in the
`powerroom` use the **same builders** as before (`buildRectifier`, `buildController`, `buildBattery` of `src/three/screw/drive.ts`) so that they look the
same as the visitor remembers them.

## Budgets and looking at the result

Each new world at most **120 draw calls and 150,000 triangles** (measure and report; merge static meshes, instance repeats); the `site` and `screw` budgets of
`docs/polish-rules.md` still hold; procedural textures only, no post-processing, no extra render pass, first build of a world under about 300 ms. Look at the
result for real in headless Chrome as in `docs/polish-rules.md` (puppeteer-core install, Chrome path and args, your own dev server on your own port: 3D
`5801`, data `5802`; scratch files only under the scratchpad in `mill-wave5-3d/` and `mill-wave5-data/`): overview, section/explode/X-ray, flows, at 1280×800
and 390×844, in both languages for the data role's panels, with the Read tool on the PNGs; fix what you see. Software GL is slow (about 6 fps): wait 15 to 25 s.

## Honesty

The screw and the generator are **generic**; the generator's design (poles, slots, magnets, gap) and the powerhouse's equipment ratings and cable sizes are
**estimates**; the model results (600 rpm, 39 N·m, 2.2 kW, 53.7 V, 46 A at the design point) are said as such; nothing is tuned; no brand, person or company
name; safety stays prominent (a battery bank can deliver a very large short-circuit current; isolate before touching; DC arcs do not extinguish; earthing and
protection are the work of a qualified electrician; the lab is not a wiring plan).

## Final report (at most 400 words)

What you delivered (files, tests and results), the budgets measured, the coherence test, what you saw in the browser, what is estimated, what looks weakest, what the
lead must wire or decide, kit requests (the 3D role appends to `docs/kit-requests.md`; the data role reports).
