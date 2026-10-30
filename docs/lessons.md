# Lessons of the Mill lab (wave 3, lessons role)

Six lessons with their quizzes (the owner chose Lite, research §8). Content only: facts and figures, no text copied from a source, sources named in
words (the video, another video, a published sizing rule, an encyclopaedia, a review), never by research code. Nobody is named: the one name
in a lesson is the owner's own lab, **Pelton Lab**, once, in lesson 4 (it is credited in the Sources panel). The screw is **generic** (said in
lesson 2). Tests: `src/data/lessons.test.ts` (67); the whole suite (`npx vitest run`, 355 tests) is green with them.

## Files

| File                       | What                                                                                                                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/lessons.ts`      | `LESSONS: Lesson[]`, six lessons, 16 quiz questions.                                                                                                                                                                                           |
| `src/data/lessons-fig.ts`  | `LESSON_FIG` (the figures that `figures.ts` does not hold, each tagged `derived` or `model`), `figInfo` (kind of any placeholder, including `FIG`'s: model, derived, assumed, estimate), `lx` (a text with `{placeholders}`), `chip`, `rawOf`. |
| `src/data/lessons.test.ts` | Shape, parity, focus, quiz, every number, the model results recomputed, what each scenario does, the honest points, the words shared with the interface.                                                                                       |
| `src/i18n/ui.ts`           | One key added at the end: `lessonsIntroMill`. Nothing existing changed (`lessonsIntro`, the lead's, is untouched).                                                                                                                             |

## The six lessons

Every lesson has 4 paragraphs (55 to 82 words each, at most 4 sentences, no sentence over 36 words), 3 key-figure chips, 2 or 3 quiz questions and
a focus that opens a world, a part and a starting point (`full-size` except lesson 4), plus a scenario when there is one (a scenario makes the
starting point « custom », so the two lessons that are about a starting point offer none). Length: 220 to 251 English words a lesson (mean 234),
239 to 259 French (mean 253; the French count includes the loose `%` and `:` that French typography puts between spaces, about 8 % more than the
real words). Piggott's were about 283.

| #   | id                 | Title (EN)                 | Opens                                                      | Video | Formula                 | What it teaches                                                                                                                                                                                                                                                                                          |
| --- | ------------------ | -------------------------- | ---------------------------------------------------------- | ----- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `water-to-watts`   | From water to watts        | `site` / `weir` / `full-size`                              | 31:47 | `P = ρ · g · Q · H`     | The one formula; 100 L/s over 1 m is about 1 kW; head and flow trade (30 kW at 3 m and at 200 m, from another video, spoken so rounded); the chain 3.09 → 2.61 → 2.20 kW, 84.6 % and 71 %; **the honest point**: 200 W and 2 kW are hopes, the lab's flow was worked back from them, the 71 % is a model |
| 2   | `why-screw`        | Why a screw works          | `screw` / `trapped-water` / `full-size` / `too-fast`       | 05:06 | `n = 50 / D^(2/3)`      | The pocket and the 11 cm step between pockets that push each blade; 30 to 60 rpm (video) and the published rule (55 rpm for the 0.86 m generic screw); too fast (49 % full, 47 % of the power) and too slow (overflow); fish: **the lab has no fish model**, a coarse rack is still useful               |
| 3   | `speed-multiplier` | Why a speed multiplier     | `screw` / `pulley-large` / `full-size` / `wrong-ratio`     | 35:43 | `T = P / ω`             | Torque and speed trade; 55 rpm at 453 N·m against 600 rpm at 39 N·m; ratio 3.3 × 3.3 = 10.9, two stages (94 %), chain slow side, belt fast side, guards; a bad ratio costs 1.3 or 1.2 kW instead of 2.2                                                                                                  |
| 4   | `which-turbine`    | Which turbine for my site? | `site` / `water-chamber` / `river`                         | 08:26 | `P = η · ρ · g · Q · H` | Zones that overlap and sources that disagree; the screw 0.1 to 10 m; the crossflow plant (9.22 m, 450 L/s, 30 kW, 74 %) and the Pelton plant (220 m, 987 kW) of other videos; Pelton Lab; how to read the chart, whose flows (except the screw's) and efficiencies are the lab's estimates               |
| 5   | `wheel-or-screw`   | A wheel or a screw?        | `screw` / `blade-module` / `full-size` / `wheel-instead`   | —     | —                       | Weight against momentum, the three wheels and their heads; both ranges of the two sources; **the lab's wheel is anchored on them, not independent**; 1.8 / 1.1 against 2.2 kW; 10 to 20 rpm and a ratio of 30 to 61 (a third stage)                                                                      |
| 6   | `mill-year`        | The year of the mill       | `site` / `reserved-flow-notch` / `full-size` / `low-water` | 20:36 | `CF = E / (P · 8760 h)` | Drawn, not measured years; water right, reserved flow (one tenth, an assumption), fish passage, said once; low water (57 days) and flood stop the machine; 9,800 kWh, 51 %, winter 28 % of the energy in 24.7 % of the days                                                                              |

Lesson 5 has no timestamp: the wheel is the subject of another video. The timestamps are the starts of the chapters of `src/data/chapters.ts`.

## Where a number comes from

A number in a lesson is one of these (`lessons-fig.ts` explains it, `lessons.test.ts` enforces it):

- **reported**, typed in the text, with its source in the allow-list `TYPED` of the test (an entry no text uses fails the test): the video, another
  video, the encyclopaedia and the review of the wheels, the heads of the wheels, `ZONES` of `src/sim/chooser.ts`, the scenarios' inputs, the kit's
  `RHO` and `G`. The test also checks the typed zone limits, the wheel ranges and the scenario inputs against `src/sim`;
- **derived**, a placeholder tagged `derived` (`FIG` or `LESSON_FIG`): the unit says « dérivé / calcul », and the test redoes the arithmetic;
- **model result**, tagged `model`: the unit says « modèle / model ». `data.test.ts` recomputes every `FIG` figure; `lessons.test.ts` recomputes
  every `LESSON_FIG` figure and runs the scenarios in the engine (`too-fast`, `wrong-ratio`, `wheel-instead`, `low-water`), so a recalibration
  of `src/sim` fails loudly;
- **assumed** (`hypothèse / assumption`) and **estimate** (`estimation / estimate`): a constant of `machine.ts` or an order of magnitude no source
  gives; the unit must say so (head 1.75 m, generator 600 rpm, stage limit 5, reserved flow 10 %, gate rules, the hydrology).

## The honest points, and where they are said

1. **200 W and 2 kW are hopes; the model's 2.2 kW is circular** (lesson 1, paragraph 4 and the quiz). The head (1.75 m, inside the video's 1.5 to 2 m)
   is an assumption, the flow (about 180 L/s) was derived from the 2 kW at 65 %; the model's 71 % is a point above the hoped 60 to 70 %, and good
   real plants reach about 75 % river to wire (published study, research §10). Tested: 179 L/s at 65 %, 71.1 %, 2.2 kW above 2 kW.
2. **No fish model** (lesson 2): the gentleness is the video's word; a quiz question has "how many survive" as a wrong choice.
3. **The wheel is anchored on the sources** (lesson 5): the overshot wheel peaks at 82 % at 8 m, the breastshot at 75 % at 3 m, the flat-paddle
   undershot at 44 %, under both sources; all tested. The overshot wheel is outside its usual heads at 1.75 m (tested), so the lessons give the
   breastshot and undershot powers only, as the scenario does.
4. **The chooser's edges** (lesson 4): the heads of the zones are published, the flows (except the screw's) and the efficiencies are estimates.
5. **The year** (lesson 6): the three hydrologies are drawn, the reserved flow (10 %) is an assumption, the gate rules are assumptions.
6. The theory behind the friction and overflow models was partly not read (docs/physics.md §7.4): the lessons say "constants that the sources do
   not give" (lesson 1, quiz) and never quote a loss in watts.

## What the lead must wire in `src/lab.ts`

```ts
import { LESSONS } from './data/lessons';
// …in the LabDefinition:
lessons: { intro: strL('lessonsIntroMill'), items: LESSONS },
```

The Lessons mode then appears by itself (the rail shows "Leçons" between Simulation and Pièces). `lessonsIntro` ("Leçons courtes liées à la 3D.") is no
longer needed; the proposed text is `lessonsIntroMill`: « Six leçons courtes, de l’eau aux watts jusqu’à l’année du moulin. Chacune ouvre la vue 3D sur la
pièce dont elle parle, souvent avec un scénario à lancer dans la Simulation, et finit par un petit quiz. » / "Six short lessons, from water to watts to the
year of the mill. Each one opens the 3D view on the part it talks about, often with a scenario to run in the Simulation, and ends with a small quiz." The
test pins it (starts with "Six", no digit, names the Simulation and the quiz).

`src/lab.test.ts` (the lead's) checks that every focus exists; the lessons' own test already does. Pelton Lab is credited in `about()` of `src/lab.ts`.

## Findings for the physics and the lead

- **`wrong-ratio`**: the comment of `scenarioBase` (`src/sim/presets.ts`) and the table of `docs/physics.md` §5 say that with the belt ratio × 0.45 "the generator never
  charges". The engine says otherwise: the generator starts under its cut-in (289 rpm against 552), the screw races for about 0.6 s up to 117 rpm and the generator
  charges, at 1.3 kW with the pockets 52 % full (the strip's "no charge" alarm shows for about 0.6 s; the test pins that moment). The lesson says what the engine does. The scenario
  rounds the ratio to 1.5 (not 1.485), so the screw settles at 117 rpm, not the 118 of `FIG.beltLowRpm` (the lessons use their own `scenLowRpm` = 117).
- **`focus.preset` is applied each time a lesson opens** (kit behaviour): lesson 4 opens `river`, which stays applied when the visitor leaves the lesson (the strip
  then shows 47 kW and 27 rpm); a visitor who goes to Explore will see the river site's machine. Worth a line for the lead (a kit request if wanted: restore the
  previous state on leaving).

## Weak points and questions for the owner

- **Density.** 234 English words a lesson on average: lesson 6 (four topics) and lesson 3 (torque, ratio, stages, a bad ratio) are the densest. The numbers are the
  first thing to cut (the chips carry the main ones).
- **Lesson 5 does not say when a screw wins**, only what a wheel needs and gives on the same water at 1.75 m; a sentence on size (a screw "is big for what it produces")
  is in the research but not in the lessons.
- **Lesson 4 is the chart's reading guide** and quotes the zones of `chooser.ts`; if the lead adds a zone or moves one, the test fails on the quoted limits.
- **Unverified on the video** (nobody listened to it): the lessons give the video's hopes and speeds as the research reads them (60 to 70 %, 200 W, 2 kW, 30 to 60
  rpm, 2 to 4 months of summer stop of the other plant); the timestamps are the chapters' starts, not where a figure is said.
- **Questions.** Keep the winter sentence of lesson 6 (28 % in 24.7 % of the days is a small effect, in a drawn year)? Keep the safety clauses (guards in lesson 3,
  "never go near a canal in flood" in lesson 6), the Sources panel carrying the full text? Is 16 quiz questions too many (2 per lesson would give 12)?
