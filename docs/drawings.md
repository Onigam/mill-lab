# Drawings of the Mill lab (wave 3, drawings role)

Three A3 sheets of the "Plans" mode (the owner chose Lite, `docs/research.md` §8), generated from `src/three/dims.ts`, `src/sim` and `src/data/figures.ts`, never typed. Each is a kit
`DrawingSheet`, exported in reading order by `SHEETS` in `src/drawings/index.ts`. Every text is `l(fr, en)` in its own file; nothing is added to `src/i18n/ui.ts`. 64 tests in
`src/drawings/drawings.test.ts` (both languages).

## The sheets

| No    | Id                  | Group   | "See in 3D" | Items (`parts`)                                                                                                                                                 | What it shows                                                                                                                                                                                                                                                                                                                                                 |
| ----- | ------------------- | ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PL-01 | `mill-race`         | `site`  | `site`      | the 12 parts of the site                                                                                                                                        | A plan at 1:300 (north up, scale bar, the river, weir, notch, fish pass, the canal with its rack and gate, the pit and the screw in it, the tailrace shortened with its break, the mill, the powerhouse, the house, the power line), a profile along the water (levels at 1:100, so ×3), the weir and the fish pass in section at 1:200, tables of dimensions |
| PL-02 | `screw-section`     | `screw` | `screw`     | `trough`, `screw-core`, `blade-module`, `blade-fastener`, the two bearings, `inlet-sill`, `outlet-pool`, `trapped-water`, `drive-sprocket`                      | A: section through the axis at 1:35 and at the true slope (pockets, blades cut, bearings, headwall, pools, levels, L, H, S, 22°, tail depth, cut B–B); B: section across the middle of a pocket at 1:10 (three blades at 120°, core, trough, gap, rotation); C: one bucket at 1:5 (root angle, bolt); D: the design rules and their results                   |
| PL-03 | `drive-electricity` | `screw` | `screw`     | `drive-sprocket`, `chain`, `counter-sprocket`, `countershaft`, `pulley-large`, `belt`, `pulley-small`, `generator`, `rectifier`, `charge-controller`, `battery` | A: the drive seen along the axis at 1:8 (56 and 17 teeth, Ø0.40 and Ø0.12 m, centres 0.78 and 0.84 m, ratios 3.3 · 3.3 = 10.9) with speed, torque and power of the three shafts (model results); C: torque of the screw against what the generator asks, and shaft power, from the simulation; D: one-line diagram generator to house                         |

## For the lead: `plans` in `src/lab.ts`

```ts
import { SHEETS } from './drawings';
plans: {
  sheets: SHEETS,
  groups: [
    { id: 'site', label: strL('groupSite') },
    { id: 'screw', label: strL('groupScrew') },
  ],
  intro: l(
    'Trois plans A3 générés à partir des cotes du modèle 3D et de la simulation : le bief du moulin, la vis en coupe, la transmission et l’électricité. Reconstitution pédagogique d’une vis générique, pas un plan de construction.',
    'Three A3 drawings generated from the 3D model’s dimensions and the simulation: the mill race, the screw in section, the drive and the electricity. Educational reconstruction of a generic screw, not a construction plan.',
  ),
},
```

`configureDrawings({ project })` is already in `lab.ts`. The sheets import `src/sim`, `src/data` and `src/three/dims.ts` only: **no three.js**, so the Plans mode does not pull the 3D chunk (`frame.ts` re-derives the screw's layout, the test compares it with `computeLayout`, `bucketLevels` and `pocketSection` of the 3D).

## Files

| File                              | What                                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                        | `SHEETS`                                                                                                                                                                                     |
| `pl01-site.ts … pl03-drive.ts`    | the three sheets, one file each, with their `LAYOUT` (scales and positions of the views)                                                                                                     |
| `geom.ts`                         | `dim(section, key)` reads a constant of dims.ts with its status; `lab`, `labOf`, `labX`, `figLab`, `num` build bilingual labels with their mark and record the number in `PRINTED`; `STATUS` |
| `frame.ts`                        | the screw in its world frame (the 3D's layout, bucket levels and pocket section), without three.js                                                                                           |
| `model.ts`                        | the design point of the simulation split into three shafts, and the curves of `MillSim.getSpeedCurve` (240 points), computed on first use                                                    |
| `wheels.ts`                       | the toothed outline, the chain or belt tangent to two wheels                                                                                                                                 |
| `draw.ts`, `chart.ts`             | helpers ported from Piggott Lab (balloons, tables, boxes, legend of the marks, SVG chart), see `docs/kit-requests.md` 14                                                                     |
| `test-dom.ts`, `drawings.test.ts` | a fake DOM for the kit's `Drawing` (text boxes with their extents), the tests                                                                                                                |

## Marks and sources of the numbers

- **Marks after a number.** none = given by a published source (3 threads, 22°, 0.5357, 0.0045, 50 rpm rule, 100 m tailrace of the video's mill); `†` = derived by the published design rules at the design point (diameters, pitch, gap, bucket,
  speed, ratios, 180 L/s); `*` = estimate of the 3D model or assumption of the model (every length of the site, the drive, the head, the length of the screw). A model result carries no mark: it sits in a red box "model result · not a measurement".
  `STATUS` and `MARKED_LOWER` in `geom.ts` hold the table; the test reads the comments of `dims.ts` (and the `REPORTED` of `machine.ts`) and fails if a sheet marks higher than the comment.
- **Lowered on purpose.** `DESIGN.head` (the comment says derived, `figures.ts` says assumed: inside the video's 1.5 to 2 m) and `SCREW.length` (head / sin 22° rests on the assumption that the two submerged ends cancel, `docs/physics.md` §1.2) are printed `*`.
  **Raised, with a reason**: `DESIGN.screwRpm` has no status word in its comment ("Nagel's rule, sim"); the published rule applied to the derived diameter is printed `†` (the test requires the comment to keep mentioning the rule).
- **Lengths**: `SITE`, `DRIVE`, `GENERATOR`, `TROUGH`, `BEARING`, `POOLS` of dims.ts (all estimates), `SCREW` and `DESIGN` (derived), through `dim()`. The tailrace is drawn at its 3D length (21.1 m\*) and the sheet says the real one is about 100 m.
- **Model results (PL-03)**: `drivePoint()` is the steady point of the preset `full-size` (1.75 m, 180 L/s, river 0.22 m³/s): screw 55 rpm · 453 N·m · 2.61 kW; countershaft (after the chain, 98 %) 182 rpm · 135 N·m · 2.56 kW; generator (after the belt, 96 %)
  600 rpm · 39 N·m · 2.46 kW; rectified open-circuit 53.7 V, 46 A into the 48 V bank, 2.20 kW, 69 W in the diodes, charging from 51 rpm; the no-load runaway (180 rpm, 176 V) is quoted from `figures.ts`. The test recomputes each of them by another route
  (`solvePlant`, `screwPoint`, `loadTorqueAtSlowShaft`, `cutInOmega`), asserts the rounded values, and compares them with `MODEL`. The curves are `MillSim.getSpeedCurve`, recomputed point by point in the test and found at their coordinates in the SVG.
- **Not printed anywhere**: the prototype's 200 W and the 2 kW target (a test fails if they appear).

## Estimated or unknown

Every dimension of the site and of the hardware is an estimate of the 3D model; the screw's dimensions are derived, none is the association's (the sheets say the screw is generic and that no maker publishes its own). The inverter, the house, the controller (and its dump load)
are drawn but **not simulated**: the diagram says so; the battery is the ideal 48 V bus of the model. The tailwater is assumed equal to the river below the weir (the 3D pins it so). The weir is not on the canal's axis: its section (PL-01 C) is along the river.

## Tests

Contract (three sheets, ids, numbers, groups, worlds, parts exist in `part-ids.ts` and belong to the world, 2 to 4 sentences, no research code, internal word or name), a render in both languages without NaN, every text inside the frame and outside the title block, no text on text (estimated boxes), decimal comma and point,
the same numbers in the same places in both languages, no French word in English and the reverse, the notice (not a construction plan, the screw is generic), **every number printed is registered by a helper or allowed with its source, and a typed number fails**, the marks against the comments, the screw's frame against the 3D's layout, PL-01's rectangles
against `SITE` (river, canal, pit, weir, notch, tailrace, three buildings), PL-02's labels against `SCREW`, `DESIGN` and `FIG`, PL-03's model results and curves against `src/sim`, the band round two wheels is tangent, the number of teeth.

## Weak or doubtful

- **Legibility at 1280 × 800** relies on the kit's zoom: the smallest text is 1.6 to 1.7 mm cap height (the tables and the cards of PL-03); the width estimates of the overlap test are not the real font (the sheets were also looked at in headless Chrome with Space Grotesk).
- **PL-01 B**: the heights are enlarged ×3, so the screw looks steeper than 22°; the pit is simplified (no headwall, no platform, the basin at the canal's level) and the river is not on the profile's axis (see C).
- **PL-02**: at the design point the pockets are full, so the free surface of a pocket is not visible in section (it stands at the axis); the staircase of levels (each pocket higher than the one below) is shown by the stepped rectangles; the 4.2 mm gap is invisible at 1:5 and said so; the cut B–B is exact at the middle of a pocket only.
- **PL-03**: chain and belt are bands (no links, no V), the generator a cylinder with a terminal box, the guards are not drawn (the sheet says they are needed); the single-line diagram has no fuse or dump-load symbol (words only), those two have no part id.
- The two views of the rotation differ by the side they are seen from (PL-02 B from the drive end: counter-clockwise; PL-03 A from the lower end: clockwise): each says so.
