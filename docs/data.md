# Data of the Mill lab (wave 2, data role)

The texts of the lab: 47 part sheets (32 from wave 2, 15 added in completion wave A, see the last section), two guides, the outline of the main video, the four overviews and the new interface strings. Everything is
bilingual `l(fr, en)`, written together. The screw is **generic**: nothing says or suggests that it is the machine of the video's builders, who
publish no dimension and no efficiency. No person, channel, company or brand is named in a visitor text (the credits live in the Sources panel
that the lead builds).

## Files

| File                          | What                                                                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/parts.ts`           | `PARTS`: the 47 sheets in the catalogue order of `src/part-ids.ts`, with the dimension rows of `parts/dim-specs.ts` appended to each                                                                                                  |
| `src/data/parts/site.ts`      | the 12 sheets of `site`                                                                                                                                                                                                               |
| `src/data/parts/machine.ts`   | 9 of `screw`: `trough`, `screw-core`, `blade-module`, `blade-fastener`, the two bearings, `inlet-sill`, `outlet-pool`, `trapped-water`                                                                                                |
| `src/data/parts/drive.ts`     | 7 of `screw`: the two-stage speed multiplier (sprocket, chain, counter sprocket, countershaft, large pulley, belt, small pulley)                                                                                                      |
| `src/data/parts/electric.ts`  | 1 of `screw`: `generator` (the three electronics sheets moved to `powerroom.ts`)                                                                                                                                                      |
| `src/data/parts/dim-specs.ts` | every length of a sheet, **read from `src/three/dims.ts`** (nothing typed), all tagged « estimation »                                                                                                                                 |
| `src/data/assembly.ts`        | `ASSEMBLY`: 34 steps (20 in wave 2, 34 since completion wave A): the screw as a kit on the spot, the generator opened, the powerhouse's wall; each id of `screw`, `generator` and `powerroom` installed once; 3 steps install nothing |
| `src/data/install.ts`         | `INSTALL`: 16 steps (11 in wave 2): `site` (each id once), 3 ids in `screw` (`inlet-sill`, `outlet-pool`, `trapped-water`) and `powerroom` (each id once), from the water right to the stop procedure                                 |
| `src/data/chapters.ts`        | `CHAPTERS`: 19 `[timestamp, fr, en]` of the 57-minute main video, neutral words                                                                                                                                                       |
| `src/data/overviews.ts`       | `OVERVIEWS`: title + text per world (`site`, `screw`, `generator`, `powerroom`), **bold** part names                                                                                                                                  |
| `src/data/figures.ts`         | `MODEL` and `FIG`: every derived / model / assumed / estimated number, written by `{placeholder}`                                                                                                                                     |
| `src/data/part-helpers.ts`    | `lf`, `tf`, `tagged`, `sp`, `maint`, `lenM`, `lenMm`: the helpers of Piggott Lab, adapted                                                                                                                                             |
| `src/data/units.ts`           | `nFr` / `nEn` (7,5 / 7.5)                                                                                                                                                                                                             |
| `src/data/data.test.ts`       | 93 tests                                                                                                                                                                                                                              |
| `src/data/guide.ts`           | **temporary** re-export of `ASSEMBLY` and `INSTALL` so that `src/lab.ts` still compiles: the lead imports `./data/assembly` and `./data/install` and deletes it                                                                       |
| `src/i18n/ui.ts`              | 13 keys added at the end in wave 2, 2 more in completion wave A (none existing changed): see below                                                                                                                                    |

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
64 (reserved flow of a mountain plant, another video); 80 and 90 (rack blocked, model input); 100 (tailrace of the video's mill); 120 (the constant of f = poles × rpm / 120, added in completion wave A); 200 and 300 (prototype, video). Everything else is a `FIG` figure or a number printed from `dims.ts`.
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

## Completion wave A (data role): the `generator` and `powerroom` worlds

### Names of the new parts (FR / EN): the 3D hotspot labels must equal these (`src/lab.test.ts` checks it)

| World       | Id                  | French               | English           |
| ----------- | ------------------- | -------------------- | ----------------- |
| `generator` | `gen-frame`         | Carcasse             | Frame             |
| `generator` | `gen-stator`        | Stator               | Stator            |
| `generator` | `gen-coils`         | Bobines              | Coils             |
| `generator` | `gen-rotor`         | Rotor                | Rotor             |
| `generator` | `gen-magnets`       | Aimants              | Magnets           |
| `generator` | `gen-shaft`         | Arbre                | Shaft             |
| `generator` | `gen-bearings`      | Roulements           | Bearings          |
| `generator` | `gen-terminals`     | Boîte à bornes       | Terminal box      |
| `powerroom` | `dc-breaker`        | Disjoncteur continu  | DC breaker        |
| `powerroom` | `fuse-box`          | Boîte à fusibles     | Fuse box          |
| `powerroom` | `rectifier`         | Redresseur           | Rectifier         |
| `powerroom` | `charge-controller` | Régulateur de charge | Charge controller |
| `powerroom` | `battery`           | Batterie             | Battery           |
| `powerroom` | `dump-load`         | Charge de délestage  | Dump load         |
| `powerroom` | `inverter`          | Onduleur             | Inverter          |
| `powerroom` | `energy-meter`      | Compteur d’énergie   | Energy meter      |
| `powerroom` | `switchboard`       | Tableau électrique   | Switchboard       |
| `powerroom` | `earthing`          | Mise à la terre      | Earthing          |

The three moved parts (`rectifier`, `charge-controller`, `battery`) keep their names. `generator` (screw) keeps « Génératrice » / « Generator ».

### The machine the sheets describe (estimates; they are the lab's, nothing in the sources gives them)

Three-phase radial-flux machine, inner rotor, surface magnets: **16 poles (16 magnets, north and south alternating), 24 slots (24 teeth, 24 coils, 8 per phase)**, so
`f = poles × rpm / 120` = **80 Hz at 600 rpm**. The 3D role draws those counts (`GENERATOR_DESIGN.poles` and `.slots` in `dims.ts`), and a test checks that the sheets' figures
(`genPoles`, `genSlots`, `genCoilsPerPhase`, `genFreq` in `figures.ts`) equal them: change one side and the test names the other.

### Files (supersedes the counts of the first section: 47 sheets, 34 assembly steps, 16 installation steps)

| File                          | What                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/parts/generator.ts` | the 8 sheets of `generator` (new)                                                                                                                                         |
| `src/data/parts/powerroom.ts` | the 10 sheets of `powerroom`: 7 new, and `rectifier`, `charge-controller`, `battery` moved from `electric.ts` (scene `powerroom`, texts say they stand in the powerhouse) |
| `src/data/parts/electric.ts`  | now only `generator` (screw); its sheet says that it can be opened                                                                                                        |
| `src/data/parts/site.ts`      | `powerhouse` rewritten: the room holds protections, rectifier, controller, battery, dump load, inverter, meter, board and earthing; go in to see them                     |
| `src/data/parts/dim-specs.ts` | the dimension rows of the new parts, **all read from `GENERATOR`, `GENERATOR_DESIGN` and `POWERROOM`** (`dims.ts`), tagged estimate                                       |
| `src/data/assembly.ts`        | **34 steps**: the 20 of the screw less the two electronics steps, plus 6 in `generator` and 10 in `powerroom` (below)                                                     |
| `src/data/install.ts`         | **16 steps**: the 11 of the site, the `powerhouse` step rewritten, plus 5 in `powerroom`                                                                                  |
| `src/data/overviews.ts`       | real texts for `generator` and `powerroom`; `screw` no longer lists the electronics and points at the generator, `site` points at the powerhouse                          |
| `src/data/chapters.ts`        | 3 chapters added where the electrics appear: 14:01, 22:03, 30:31 (19 in all)                                                                                              |
| `src/data/figures.ts`         | 17 figures added: 2 model results, 6 derived, 9 estimates (below)                                                                                                         |
| `src/i18n/ui.ts`              | 2 keys added at the end: `noticeElectric`, `safetyElectric` (existing keys untouched; `sceneGenerator`… `groupPowerroom` were already there)                              |
| `src/data/data.test.ts`       | 93 tests (the whole `npx vitest run src/data` is 160 with the lessons')                                                                                                   |

### Assembly: the order, and why

`bring-kit` (site) · the 14 screw steps up to `pulley-large` · **`generator` world**: `gen-frame`, `gen-bearings`, `gen-rotor-shaft` (shaft and rotor), `gen-magnets`, `gen-stator-coils`
(the wound stator and the rotor brought together), `gen-terminals` · `screw`: `generator` (the closed machine on its mount, with the small pulley), `belt` · **`powerroom`**: `board`,
`protections` (breaker and fuse box, open), `rectifier`, `controller`, `battery` (set, terminals covered, connected only at the first test), `dump-load`, `inverter`, `meter`, `earthing`,
`first-test` (installs nothing) · `screw`: `first-water`. Every id of `screw`, `generator` and `powerroom` is installed once; `site` has none. The video's generator is bought, not built:
the six steps say so and show what is inside what you buy and what can be repaired. The installation guide has the real order of a project: **earth and board first** (`earth-and-board`),
protections open, wiring in the order of the current with **the dump load before the battery** (the brake must exist before the power), the battery last of the sources, then the
inverter, the check (`electrical-check`, nothing installed), the first start, the stop (breaker, fuses, lock-out, test dead).

### Where the numbers come from

- **Reported** (the video, no tag): the generator is of the kind used on wind turbines and bought (35:43), slow to keep the transmission simple (36:06 to 36:48), a belt and pulleys (36:15);
  the generator was connected before the electrical load (14:31); with a load the turbine can be braked, without it the screw races (14:35 to 14:53); protections exist (28:22);
  batteries like a continuous production (22:21). Nothing else of the generator or of the room is in a source.
- **Model results** (`sim/mech`, recomputed by the tests): 600 rpm at the generator (an assumption), 39 N·m, 46 A, 2.2 kW, 53.7 V rectified at the open terminals, 176 V with the screw racing and
  1,960 rpm; new: the circuit resistance **0.09 Ω** (`genResistance`) and the constant **0.86 N·m per ampere = 0.86 V per rad/s** (`genK`).
- **Derived** (arithmetic on those, tested): the voltage between two phases 39.8 V (53.7 / 1.35), 23 V a phase, 37 A a phase (45.8 × √(2/3)), the centrifugal force on the rotor × 11 when the
  screw races (3.3²), the dump-load resistance 1.05 Ω (48 V / 45.8 A), the 63 A an inverter of 3 kW draws from 48 V.
- **Estimates** (the lab's, tagged `(estimation)` / `(estimate)`): 16 poles, 24 slots, 8 coils a phase, 80 Hz; every size of `GENERATOR_DESIGN` and `POWERROOM` (air gap 1.5 mm, magnets 6 mm,
  bearing 62 mm…); the ratings **breaker 63 A, fuse 80 A, inverter 3 kW**; the cable sections **25 mm²** (battery) and **16 mm²** (bonding); the magnet material, the bearing type, the sealed
  casing, the 48 V pack. Allowed typed numbers: only `120` was added (f = poles × rpm / 120).
- **Not in the model, and said on each sheet**: the **dump load** (`non simulée`), the charge controller, the inverter and its losses, the meter's accuracy, the battery's capacity, the generator's
  iron and friction losses (its 89 % is copper and diodes only), cogging, the short-circuit current of a battery.

### What to wire, what to decide

- `lab.ts` (3D role / lead): `guides.assembly` and `guides.install` keep their `scene` default but **every step names its own** (`site`, `screw`, `generator`, `powerroom`); the overviews
  `OVERVIEWS.generator` and `OVERVIEWS.powerroom` with the back actions; `about()`: add `t('noticeElectric')` after `noticeGeneric` and `t('safetyElectric')` after `safety` (they have no number, so
  `src/panels/strings.test.ts` stays green); plan groups `groupGenerator` / `groupPowerroom` if wave B draws sheets there.
- **The order of the protections.** The wall puts the DC breaker and the fuse box first, as the contract says, before the rectifier. A real board puts a switch on the alternating side, before the
  rectifier, and the DC breaker and fuses on the direct side, after it, the battery fuse right against the battery. The two sheets say it in one sentence (« le labo le dessine en tête du mur… »):
  if the 3D role draws the current as direct current from the first device, or if the lead prefers the real order, reorder the wall and reword those two sentences (`powerroom.ts`).
- The meter's sheet says the lab's meter follows the simulation (`MillState` energy counters); the dump load's, that it is not simulated (it must **not** be animated as if the model computed it, or
  say so on screen); the battery sheet says the model's battery is ideal and its capacity not modelled.
- Wave B (lessons, narration): the new sheets' video links are `gen-frame` 35:43, `gen-shaft` 36:15, `gen-terminals` 14:31, `dc-breaker` and `fuse-box` 28:22, `dump-load` 14:35 (and the old
  `charge-controller` 14:29 / 14:41, `battery` 22:21); `gen-stator`, `gen-coils`, `gen-rotor`, `gen-magnets`, `gen-bearings`, `rectifier`, `inverter`, `energy-meter`, `switchboard`,
  `earthing` have **no link** (the video never opens the generator and shows no cabinet), and a test keeps it so.
