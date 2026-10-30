# Lessons of the Mill lab (wave 3, lessons role; completion wave B)

Eight lessons with their quizzes: the six of the owner's Lite plan (research §8) and, since completion wave B, **two more after "why a speed multiplier"**, so that the
order follows the energy: water, screw, multiplier, **generator**, **powerhouse**, then the choice of machine and the year. Content only: facts and figures, no text
copied from a source, sources named in words (the video, another video, a published sizing rule, an encyclopaedia, a review), never by research code. Nobody is named: the
one name in a lesson is the owner's own lab, **Pelton Lab**, once, in lesson 6 (it is credited in the Sources panel). The screw and the generator are **generic** (said in
lessons 2 and 4). Tests: `src/data/lessons.test.ts` (81); `npx vitest run src/data` is green with them.

## Files

| File                       | What                                                                                                                                                                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/lessons.ts`      | `LESSONS: Lesson[]`, eight lessons, 22 quiz questions.                                                                                                                                                                                                                        |
| `src/data/lessons-fig.ts`  | `LESSON_FIG` (the figures that `figures.ts` does not hold, each tagged `derived` or `model`; three added in wave B: `voltPer100`, `voltScrew`, `voltHalf`), `figInfo` (kind of any placeholder, including `FIG`'s: model, derived, assumed, estimate), `lx`, `chip`, `rawOf`. |
| `src/data/lessons.test.ts` | Shape, parity, focus, quiz, every number, the model results recomputed, what each scenario does, the honest points, the words shared with the interface and the part sheets.                                                                                                  |
| `src/i18n/ui.ts`           | One key of mine, `lessonsIntroMill` (its text changed in wave B: "Huit leçons…" / "Eight short lessons…"). Nothing else touched (`lessonsIntro`, the lead's, and the keys of the data role are untouched).                                                                    |

## The eight lessons

Every lesson has 4 paragraphs (3 or 4: lesson 4's third has 2 sentences), at most 85 words and 4 sentences each, no sentence over 36 words, 3 key-figure chips, 2 or 3 quiz
questions and a focus that opens a world, a part and a starting point (`full-size` except lesson 6), plus a scenario when there is one (a scenario makes the starting point
« custom », so the lessons that are about a starting point, or about parts the model does not move, offer none: 1, 4, 5 and 6). Length of the body (English / French; the French
count includes the loose `:` `;` `%` that French typography puts between spaces, up to 8 % more than the real words): 1 **235 / 257**, 2 **220 / 239**, 3 **236 / 246**,
4 **234 / 248**, 5 **244 / 255**, 6 **231 / 258**, 7 **228 / 255**, 8 **244 / 251**; mean 234 / 251 (the test caps a lesson at 260). Piggott's were about 283.

| #   | id                       | Title (EN)                 | Opens                                                      | Video | Formula                 | What it teaches                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------ | -------------------------- | ---------------------------------------------------------- | ----- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `water-to-watts`         | From water to watts        | `site` / `weir` / `full-size`                              | 31:47 | `P = ρ · g · Q · H`     | The one formula; 100 L/s over 1 m is about 1 kW; head and flow trade (30 kW at 3 m and at 200 m, from another video, spoken so rounded); the chain 3.09 → 2.61 → 2.20 kW, 84.6 % and 71 %; **the honest point**: 200 W and 2 kW are hopes, the lab's flow was worked back from them, the 71 % is a model                                                                                                                                 |
| 2   | `why-screw`              | Why a screw works          | `screw` / `trapped-water` / `full-size` / `too-fast`       | 05:06 | `n = 50 / D^(2/3)`      | The pocket and the 11 cm step between pockets that push each blade; 30 to 60 rpm (video) and the published rule (55 rpm for the 0.86 m generic screw); too fast (49 % full, 47 % of the power) and too slow (overflow); fish: **the lab has no fish model**, a coarse rack is still useful                                                                                                                                               |
| 3   | `speed-multiplier`       | Why a speed multiplier     | `screw` / `pulley-large` / `full-size` / `wrong-ratio`     | 35:43 | `T = P / ω`             | Torque and speed trade; 55 rpm at 453 N·m against 600 rpm at 39 N·m; ratio 3.3 × 3.3 = 10.9, two stages (94 %), chain slow side, belt fast side, guards; a bad ratio costs 1.3 or 1.2 kW instead of 2.2                                                                                                                                                                                                                                  |
| 4   | `rotation-to-volts`      | From rotation to volts     | `generator` / `gen-magnets` / `full-size`                  | 35:43 | `V = k · ω`             | A magnet passing a coil raises a **voltage** proportional to the speed (9 V per 100 rpm); why the generator needs hundreds of rpm: at the screw's 55 rpm the same machine gives 4.9 V, at 600 rpm 53.7 V open-circuit, it charges from 552 rpm; **three-phase** and the **rectifier** (six diodes); **poles** and **frequency** (`f = poles × rpm / 120`: 16 poles, 80 Hz, **the lab's estimates**; the video never opens the generator) |
| 5   | `protect-regulate-store` | Protect, regulate, store   | `powerroom` / `fuse-box` / `full-size`                     | 22:03 | `I = U / R`             | In the order of the current: **breaker**, **fuses**, a battery's **short circuit** (hundreds of amps) and why a DC arc does not go out; **charge controller**, **dump load** (1.05 Ω swallows the 2.2 kW; **not simulated**), the screw racing to 180 rpm and 176 V with no load; battery, inverter (lethal mains), meter; **earthing**; ratings are estimates, the work is an electrician's, **the lab is not a wiring plan**           |
| 6   | `which-turbine`          | Which turbine for my site? | `site` / `water-chamber` / `river`                         | 08:26 | `P = η · ρ · g · Q · H` | Zones that overlap and sources that disagree; the screw 0.1 to 10 m; the crossflow plant (9.22 m, 450 L/s, 30 kW, 74 %) and the Pelton plant (220 m, 987 kW) of other videos; Pelton Lab; how to read the chart, whose flows (except the screw's) and efficiencies are the lab's estimates                                                                                                                                               |
| 7   | `wheel-or-screw`         | A wheel or a screw?        | `screw` / `blade-module` / `full-size` / `wheel-instead`   | —     | —                       | Weight against momentum, the three wheels and their heads; both ranges of the two sources; **the lab's wheel is anchored on them, not independent**; 1.8 / 1.1 against 2.2 kW; 10 to 20 rpm and a ratio of 30 to 61 (a third stage)                                                                                                                                                                                                      |
| 8   | `mill-year`              | The year of the mill       | `site` / `reserved-flow-notch` / `full-size` / `low-water` | 20:36 | `CF = E / (P · 8760 h)` | Drawn, not measured years; water right, reserved flow, fish passage, said once; low water (57 days) and flood stop the machine; 9,800 kWh, 51 %, winter 28 % of the energy in 24.7 % of the days                                                                                                                                                                                                                                         |

Lesson 7 has no timestamp: the wheel is the subject of another video. The timestamps are the starts of the chapters of `src/data/chapters.ts`: lesson 4 shares 35:43 with lesson 3 (the
chapter "the generator, the belt and the compromises" is about both), lesson 5 takes 22:03 (a continuous production, which spares the batteries). The chapters for the protections
(28:04), the dump load (14:01) and the controller's electronics (30:31) exist too: the lesson takes the one where the visitor would hear about the battery, which is in its title.

The new lessons' terms, defined once in bold, in both languages: 4 **voltage / tension**, **three-phase / triphasé**, **rectifier / redresseur**, **pole / pôle**, **frequency / fréquence**; 5 **breaker /
disjoncteur**, **fuses / fusibles**, **short circuit / court-circuit**, **charge controller / régulateur de charge**, **dump load / charge de délestage**, **earthing / mise à la terre** (the names of the part
sheets; the inverter, the meter and the battery are explained in a clause, not in bold, because their sheets say the rest). The kilowatt-hour stays defined in lesson 8 (the meter's clause in lesson 5 does not use it).

## Where a number comes from

A number in a lesson is one of these (`lessons-fig.ts` explains it, `lessons.test.ts` enforces it):

- **reported**, typed in the text, with its source in the allow-list `TYPED` of the test (an entry no text uses fails the test): the video, another
  video, the encyclopaedia and the review of the wheels, the heads of the wheels, `ZONES` of `src/sim/chooser.ts`, the scenarios' inputs, the kit's
  `RHO` and `G`, and since wave B the `120` of `f = poles × rpm / 120` (physics of rotating machines; `data.test.ts` allows it too). The cross-reference to the wheel lesson is `7`;
- **derived**, a placeholder tagged `derived` (`FIG` or `LESSON_FIG`): the unit says « dérivé / calcul », and the test redoes the arithmetic. New in wave B: `voltPer100` (9 V per
  100 rpm: the generator's constant 0.856 V per rad/s times 2π/60 times 100), `voltScrew` (4.9 V: that constant times the screw's 55.1 rpm), `voltHalf` (27 V at half the rated speed), and from
  `FIG` the `dumpOhm` (1.05 Ω);
- **model result**, tagged `model`: the unit says « modèle / model ». `data.test.ts` recomputes every `FIG` figure; `lessons.test.ts` recomputes
  every `LESSON_FIG` figure and runs the scenarios in the engine (`too-fast`, `wrong-ratio`, `wheel-instead`, `low-water`), so a recalibration
  of `src/sim` fails loudly. Used by lessons 4 and 5: 53.7 V open-circuit, 552 rpm cut-in, 39 N·m, 46 A, 2.2 kW, and with no load 180 rpm and 176 V;
- **assumed** (`hypothèse / assumption`) and **estimate** (`estimation / estimate`): a constant of `machine.ts` or an order of magnitude no source
  gives; the unit must say so (head 1.75 m, generator 600 rpm, battery 48 V, stage limit 5, reserved flow 10 %, gate rules, the hydrology; **16 poles, 80 Hz, the 63 A breaker and the 80 A fuse**).

## The honest points, and where they are said

1. **200 W and 2 kW are hopes; the model's 2.2 kW is circular** (lesson 1, paragraph 4 and the quiz). The head (1.75 m, inside the video's 1.5 to 2 m)
   is an assumption, the flow (about 180 L/s) was derived from the 2 kW at 65 %; the model's 71 % is a point above the hoped 60 to 70 %, and good
   real plants reach about 75 % river to wire (published study, research §10). Tested: 179 L/s at 65 %, 71.1 %, 2.2 kW above 2 kW.
2. **No fish model** (lesson 2): the gentleness is the video's word; a quiz question has "how many survive" as a wrong choice.
3. **The generator is generic** (lesson 4, paragraph 4 and the third question): the video shows a bought generator and never opens it, so the poles, the frequency and everything inside are the
   lab's estimates; the sheet of the lesson's own part carries no video link (tested). The model takes the voltage as exactly proportional to the speed (it is, for a given field; it does not
   compute saturation, iron or friction losses: the 89 % of the generator is copper and diodes only).
4. **The model stops at an ideal battery** (lesson 5, paragraph 3 and the third question): no dump load, controller, inverter, fuse, breaker or meter in the state or the parameters (tested by the
   names of the keys); the battery takes any current. The 63 A and 80 A, the cable sections and the inverter's 3 kW are estimates; the order of the protections on the wall is the lab's, an electrician
   places them (the sheets say it). "Hundreds of amps" in a short circuit is an order of magnitude: the model's own circuit resistance (0.093 Ω) would let 48 V push about 500 A (tested as a plausibility
   check, not printed).
5. **The wheel is anchored on the sources** (lesson 7): the overshot wheel peaks at 82 % at 8 m, the breastshot at 75 % at 3 m, the flat-paddle
   undershot at 44 %, under both sources; all tested. The overshot wheel is outside its usual heads at 1.75 m (tested), so the lessons give the
   breastshot and undershot powers only, as the scenario does.
6. **The chooser's edges** (lesson 6): the heads of the zones are published, the flows (except the screw's) and the efficiencies are estimates.
7. **The year** (lesson 8): the three hydrologies are drawn, the reserved flow (10 %) is an assumption, the gate rules are assumptions.
8. The theory behind the friction and overflow models was partly not read (docs/physics.md §7.4): the lessons say "constants that the sources do
   not give" (lesson 1, quiz) and never quote a loss in watts.

## What the lead must wire in `src/lab.ts` (already done) and what is left

`lessons: { intro: strL('lessonsIntroMill'), items: LESSONS }` is wired. The text of `lessonsIntroMill` changed: « Huit leçons courtes, de l’eau aux watts jusqu’à l’année du moulin, en passant
par la génératrice et le local technique. Chacune ouvre la vue 3D sur la pièce dont elle parle, parfois avec un scénario à lancer dans la Simulation, et finit par un petit quiz. » / "Eight short
lessons, from water to watts to the year of the mill, by way of the generator and the powerhouse. Each one opens the 3D view on the part it talks about, sometimes with a scenario to run in the
Simulation, and ends with a small quiz." (« parfois », not « souvent »: four lessons of eight offer a scenario.) The test pins it (starts with "Huit", no digit, names the Simulation, the quiz, the generator
and the powerhouse).

**To update, not mine:** `README.md`, `public/lab.json` and the narration, if they count or name the lessons, say six (`src/lab.test.ts` already says eight and checks every focus against the registries of the
four worlds: `generator` / `gen-magnets` and `powerroom` / `fuse-box` exist).

## Findings for the physics and the lead

- **`wrong-ratio`**: the comment of `scenarioBase` (`src/sim/presets.ts`) and the table of `docs/physics.md` §5 say that with the belt ratio × 0.45 "the generator never
  charges". The engine says otherwise: the generator starts under its cut-in (289 rpm against 552), the screw races for about 0.6 s up to 117 rpm and the generator
  charges, at 1.3 kW with the pockets 52 % full (the strip's "no charge" alarm shows for about 0.6 s; the test pins that moment). The lesson says what the engine does. The scenario
  rounds the ratio to 1.5 (not 1.485), so the screw settles at 117 rpm, not the 118 of `FIG.beltLowRpm` (the lessons use their own `scenLowRpm` = 117).
- **`focus.preset` is applied each time a lesson opens** (kit behaviour): lesson 6 opens `river`, which stays applied when the visitor leaves the lesson (the strip
  then shows 47 kW and 27 rpm); a visitor who goes to Explore will see the river site's machine. Worth a line for the lead (a kit request if wanted: restore the
  previous state on leaving).
- **No scenario fits the generator or the powerhouse.** `too-fast` would drive the generator to 1,440 rpm and 129 V open-circuit, but it is the lesson-2 scenario (pockets) and its imposed-speed mode
  is a drive, not the generator on its battery; `wrong-ratio` is lesson 3's. Lessons 4 and 5 open the design point (`full-size`); the visitor can read the generator's speed and open-circuit voltage
  in the Simulation's folded figures, or impose a speed. A scenario "the battery is full" or "no load" would need a diversion load in `src/sim` (a kit of its own): not asked.

## Weak points and questions for the owner

- **Density.** 234 English words a lesson on average: lesson 5 (nine devices in four paragraphs) is the densest and the first to cut: the meter and the inverter are one clause each, the numbers are on
  the chips. Lesson 6 (four topics) and lesson 3 (torque, ratio, stages, a bad ratio) are next. The numbers are the first thing to cut (the chips carry the main ones).
- **Lesson 5 is a tour, not a method:** it says what each device is for, why a battery and a direct-current arc are dangerous, and sends the reader to an electrician; it gives no wiring order (the
  installation guide has one, for the powerhouse, and says it is not a plan). That is deliberate.
- **Lesson 4's "a third of a cycle apart" and "one swing per pair of poles"** are textbook facts, not read in a source of this lab's research (the physics role's `docs/physics.md` §1.8 gives `V = k·ω` and the bridge, not
  the phase angle). They are correct for any three-phase machine, but nobody has checked them against a source here.
- **Lesson 7 does not say when a screw wins**, only what a wheel needs and gives on the same water at 1.75 m: a sentence on size (a screw "is big for what it produces")
  is in the research but not in the lessons.
- **Lesson 6 is the chart's reading guide** and quotes the zones of `chooser.ts`; if the lead adds a zone or moves one, the test fails on the quoted limits.
- **Unverified on the video** (nobody listened to it): the lessons give the video's hopes and speeds as the research reads them (60 to 70 %, 200 W, 2 kW, 30 to 60
  rpm, 2 to 4 months of summer stop of the other plant); the timestamps are the chapters' starts, not where a figure is said.
- **Questions.** Keep the winter sentence of lesson 8 (28 % in 24.7 % of the days is a small effect, in a drawn year)? Keep the safety clauses (guards in lesson 3, "lethal" mains and "not a wiring plan" in
  lesson 5, "never go near a canal in flood" in lesson 8), the Sources panel carrying the full text? Is 22 quiz questions too many (2 per lesson would give 16)?
