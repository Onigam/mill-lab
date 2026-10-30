# Data of the Mill lab (wave 2, data role)

The texts of the lab: 32 part sheets, two guides, the outline of the main video, the two overviews and the new interface strings. Everything is
bilingual `l(fr, en)`, written together. The screw is **generic**: nothing says or suggests that it is the machine of the video's builders, who
publish no dimension and no efficiency. No person, channel, company or brand is named in a visitor text (the credits live in the Sources panel
that the lead builds).

## Files

| File                          | What                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/parts.ts`           | `PARTS`: the 32 sheets in the catalogue order of `src/part-ids.ts`, with the dimension rows of `parts/dim-specs.ts` appended to each                                                  |
| `src/data/parts/site.ts`      | the 12 sheets of `site`                                                                                                                                                               |
| `src/data/parts/machine.ts`   | 9 of `screw`: `trough`, `screw-core`, `blade-module`, `blade-fastener`, the two bearings, `inlet-sill`, `outlet-pool`, `trapped-water`                                                |
| `src/data/parts/drive.ts`     | 7 of `screw`: the two-stage speed multiplier (sprocket, chain, counter sprocket, countershaft, large pulley, belt, small pulley)                                                      |
| `src/data/parts/electric.ts`  | 4 of `screw`: `generator`, `rectifier`, `charge-controller`, `battery`                                                                                                                |
| `src/data/parts/dim-specs.ts` | every length of a sheet, **read from `src/three/dims.ts`** (nothing typed), all tagged « estimation »                                                                                 |
| `src/data/assembly.ts`        | `ASSEMBLY`: 20 steps that build the screw as a kit on the spot (1 in `site`, 19 in `screw`); each `screw` id installed once; 2 steps install nothing (the delivery, the turn by hand) |
| `src/data/install.ts`         | `INSTALL`: 11 steps, 8 in `site` (each `site` id once) and 3 in `screw` (`inlet-sill`, `outlet-pool`, `trapped-water`), from the water right to the stop procedure                    |
| `src/data/chapters.ts`        | `CHAPTERS`: 16 `[timestamp, fr, en]` of the 57-minute main video, neutral words                                                                                                       |
| `src/data/overviews.ts`       | `OVERVIEWS`: title + text per world (`site`, `screw`), **bold** part names                                                                                                            |
| `src/data/figures.ts`         | `MODEL` and `FIG`: every derived / model / assumed / estimated number, written by `{placeholder}`                                                                                     |
| `src/data/part-helpers.ts`    | `lf`, `tf`, `tagged`, `sp`, `maint`, `lenM`, `lenMm`: the helpers of Piggott Lab, adapted                                                                                             |
| `src/data/units.ts`           | `nFr` / `nEn` (7,5 / 7.5)                                                                                                                                                             |
| `src/data/data.test.ts`       | 73 tests                                                                                                                                                                              |
| `src/data/guide.ts`           | **temporary** re-export of `ASSEMBLY` and `INSTALL` so that `src/lab.ts` still compiles: the lead imports `./data/assembly` and `./data/install` and deletes it                       |
| `src/i18n/ui.ts`              | 13 keys added at the end (none existing changed): see below                                                                                                                           |

`src/data/parts.ts` and `parts/*` do not import `src/three/device.ts` any more (only `src/three/dims.ts`, which imports `src/sim`).

## The tags (the same words in both languages, checked by `lf` and `tf`)

A figure with **no tag** is _reported_ by a source named in words ("the video", "published design rules", "another video"): never a research code.
A tagged figure is not reported:

- **dérivé / derived**: computed from reported or published figures (the sizing rules): diameter 0.86 m, core 0.46 m, pitch 0.86 m, gap 4.2 mm, a pocket of 62 L, 16 pockets,
  11 cm between two levels, 0.79 m/s down the screw, 5.9 s, drive ratio 3.3 × 3.3 = 10.9, 180 L/s (2 kW at 65 % over 1.75 m), 18 W per centimetre of head, the optimal depth at the outlet 0.48 m.
- **résultat du modèle / model result**: an output of `src/sim` at the design point, recomputed by the tests: water 3.09 kW, shaft 2.61 kW, battery 2.20 kW, screw 84.6 %, overall 71 %,
  55 rpm, 453 N·m (screw) and 39 N·m (generator), 182 rpm and 135 N·m on the countershaft, 46 A, 53.7 V, the screw that races to about 180 rpm (3.3 times) with no load, the rack at 80 and 90 %, the tailwater, a year of the mill race (9,800 kWh, 51 %, 57 days of low water), the wheels as a comparison.
- **hypothèse du modèle / model assumption**: a constant of `src/sim/machine.ts` that no source gives: head 1.75 m (inside the 1.5 to 2 m of the video), generator 600 rpm, battery 48 V, chain 98 %, belt 96 %, diodes 1.5 V,
  reserved flow one tenth of the mean flow (30 L/s), gate shut at 6 times the median flow and under 15 % of the design flow, canal at 0.8 m/s.
- **estimation / estimate**: a dimension of `dims.ts` (all of `dim-specs.ts`), the hydrology of the three watercourses (60 L/s, 300 L/s, 3 m³/s), the mass of the turning part (220 kg), the length of the screw (head / sin 22°).

The **prototype's 200 W** and the **2 kW target** are quoted as the video's announced hopes, never as results. The 206 W the model gives for the prototype is said to be a circular derivation (the head and flow were
derived from the 200 W). The wheel efficiencies are not quoted; the wheel powers (1.8 / 1.8 / 1.1 kW) are said to come from a model anchored on sources that disagree.

## Numbers allowed in a text (the test, with sources)

`REPORTED` in `data.test.ts`: 0.2 (bearing losses, model); 0.45 and 1.9 (belt-ratio scenario); 0.5 and 5 (roughness mm, model input); 0.5357, 0.0045, 22, 60, 95 (published rules: core ratio, gap, slope, 60 % submergence, 95 % multipliers);
0.01 (bearing friction, assumption); 1.5 and 2 (head of the small mills, video); 2.6, 380, 990 and 30 (another video: crossflow plant); 3 (threads, video); 10 and 20 (wheel speed, model); 30 to 60 (rpm, video);
64 (reserved flow of a mountain plant, another video); 80 and 90 (rack blocked, model input); 100 (tailrace of the video's mill); 200 and 300 (prototype, video). Everything else is a `FIG` figure or a number printed from `dims.ts`.
A test fails if a text carries a number that is in none of the three sets, or if an allow-listed number is unused.

## Sources used

The main video (chapters and timestamps in `chapters.ts`; the private transcript `docs/transcript-s1-*.md` was read for **structure and timestamps only**, never for a number: captions garble them; nothing is quoted);
`docs/research.md` §1 to §10 (K-figures read in words); `docs/physics.md` and `src/sim` (every model figure); `src/three/dims.ts` (every length); the published design rules through `docs/physics.md` §1.2 and §9 (Rorres 2000, Nagel via Rorres and Dellinger 2015,
Simmons & Lubitz 2022 and 2024, named only in this file and in the Sources panel the lead builds). The other three videos (crossflow plant, DIY wheel, mountain plant) are used only for K10, K11 and K16, as "another video".

## Interface strings added to `src/i18n/ui.ts` (the lead wires them in `src/lab.ts`)

`labTagline` (use instead of `tagline`, which is the template's and was left unchanged), `sceneSite`, `sceneScrew`, `goSite`, `goScrew`, `goChamber`, `groupSite`, `groupScrew`, `noticeGeneric` (the screw is generic, derived, not a plan: a second callout under the existing
`disclaimer`), `safety`, `legal` (water right, reserved flow, fish passage, said once and generally, French wording only in the French text), `chapters` (heading of the outline), `sourcesNoCopy`. They respect `src/panels/strings.test.ts` (no number outside its list).

## To wire in `src/lab.ts`

- `parts: PARTS` from `./data/parts` (already); `guides: { assembly: { scene: 'screw', steps: ASSEMBLY }, install: { scene: 'site', steps: INSTALL } }` from `./data/assembly` and `./data/install`; every step names its `scene`.
- `scenes[site].overview = { ...OVERVIEWS.site, actions: [{ label: strL('goChamber'), scene: 'screw', primary: true }] }`, `scenes[screw].overview = { ...OVERVIEWS.screw, actions: [{ label: strL('goSite'), scene: 'site', primary: true }] }`.
- `partLinks: { 'water-chamber': { scene: 'screw', label: strL('goChamber') } }`.
- `video: { id: 'hM4cDkSSsrQ' }` (every `video` timestamp of a sheet is in this video; `mm:ss`, shown two at most by the kit).
- `about()`: `disclaimer`, `noticeGeneric`, `safety`, `legal`, then the credits and links, `t('chapters')` and `CHAPTERS.map(([ts, fr, en]) => …ctx.videoUrl(ts)…)`, `sourcesNoCopy`.
- `brand.tagline: strL('labTagline')`, scene labels `sceneSite` / `sceneScrew`, plan groups `groupSite` / `groupScrew`.
- Delete `src/data/guide.ts` once `src/lab.ts` imports the two guides directly.

## To verify or decide (not used because unverified, or the owner's)

- The captions of the main video at 46:26 to 47:25 give "10 % of what you take" and "14 L/s" as the reserved flow of the video's own mill, and 1.40 m of head at 47:57, a 20 m headrace and a 75 m tailrace at 43:03 (research says about 100 m at 12:48). **None is used**; the sheets say "about 100 m" for the tailrace
  (research §3) and call the one tenth an assumption. Worth listening to before the owner reuses them as reported figures.
- `dims.ts` draws the trough as a **concrete** half-pipe (the video's is a hooped wooden tube), the battery as a 48 V **lithium** pack and the belt as a **flat** belt: the sheets say both (the video's and the drawing's) and tag the drawing's as an estimate.
- The contract has no id for the guards of the chain, belt and screw, the dump load, the supports and platform, or the inverter (it is in `powerhouse`). The sheets and steps say "guard" and "dump load" in words; if the 3D role draws them, they belong to `chain`, `belt`, `trough` and `charge-controller`.
