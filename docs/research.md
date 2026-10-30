# Research notes — Mill Lab

> Written by the lead (no agent team) before any modelling, 2026-10-30. Third-party transcripts are kept private in
> `docs/transcript-*.md` (git-ignored). Auto captions contain recognition errors, numbers especially: every figure below was
> read from the captions and is marked **check** when a caption looks cut or ambiguous.

## 0. Summary and decisions to validate

- **Device.** A small hydrodynamic **Archimedes screw** (3 threads, inclined, half-immersed, turning slowly) in the mill race of an old
  mill, driving a low-speed generator through a belt-and-pulley speed multiplier. The screw is fish-friendly, needs no trash rack
  and suits the tiny heads (1.5 to 2 m) of abandoned mills. A **water wheel** and the other turbines appear as comparison, not as a
  second machine.
- **The question the lab answers.** _"Which turbine for my site?"_ A head / flow chart with lines of equal power puts the wheel, the
  screw, the crossflow, the Kaplan, the Francis and the Pelton side by side, with a link to Pelton Lab for the high-head end.
- **Main source (proposed).** L'ArchiPelle × the Viseta association, a wooden screw in a brook mill (video `hM4cDkSSsrQ`, 57 min).
  Secondary: a 30 kW crossflow turbine in a mill (`YRPMVPFl5z4`), a DIY wheel and generator (`faqLmwqATMc`), a 987 kW Pelton plant in
  the mountains (`vumEzd2KRMA`), used for the chooser chart.
- **Level.** Lite as the roadmap says (2 worlds, about 28 parts, 3 sheets, 6 lessons). The owner may raise it to Full (§8, question 5).
- **Versions.** One (§6).
- **New physics module.** `sim/mech` (speed multiplier, torque, generator matching), built locally in the lab first, extracted to the
  kit only if another lab (gravity battery, Piggott) reuses it.
- **Honest limits to state in the lab.** The maker publishes **no dimensions** of the screw (no diameter, length, pitch) and no
  efficiency measurement; the machine drawn here is a generic screw sized by published design rules, not a copy of theirs.

## 1. Sources

| Source                                                                                 | Link                                                                                                                                                  | What it gives                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 · L'ArchiPelle, hydropower in old mills (Viseta screw), 57 min, 2025-08             | https://www.youtube.com/watch?v=hM4cDkSSsrQ                                                                                                           | the wooden screw, its principle, the 1/2-scale prototype, power and efficiency orders of magnitude, the drive. Chapters: 0:34 the association, 5:06 principle, 12:36 water chamber, 15:01 the screw at work, 24:05 technique and drive, 38:52 water rights |
| S2 · L'ArchiPelle, a mill turned into a mini hydro plant (Moulin de Bru), 2 h, 2023-01 | https://www.youtube.com/watch?v=YRPMVPFl5z4                                                                                                           | crossflow turbine with draft tube, 30 kW, belt to an asynchronous generator, 10 years of figures, prices, water rights. Chapters: 1:25:17 the plant, 1:46:42 administrative difficulties and ecology                                                       |
| S3 · Paulygones, a water wheel for electricity, 7 min, 2022-11                         | https://www.youtube.com/watch?v=faqLmwqATMc                                                                                                           | induction in two minutes, the families of turbines, a DIY wheel (8 modules) with a gearbox and a motor as generator, rectifier and battery                                                                                                                 |
| S4 · Révolution Énergétique, a micro-hydro plant in the mountains, 45 min, 2025-09     | https://www.youtube.com/watch?v=vumEzd2KRMA                                                                                                           | the high-head end of the chooser: 220 m, 23 bar, 987 kW, Pelton at 750 rpm, reserved flow 64 L/s                                                                                                                                                           |
| S5 · Archimedes screw generator, encyclopaedia article                                 | https://en.wikipedia.org/wiki/Archimedes%27_screw                                                                                                     | head 0.1 to 10 m, flow 0.01 to 14.5 m³/s, design parameters, relation D_O ≈ η·Q^(3/7) (coefficient read on a graph, not given)                                                                                                                             |
| S6 · Water wheel, encyclopaedia article                                                | https://en.wikipedia.org/wiki/Water_wheel                                                                                                             | overshot / backshot 80 to 90 %, breastshot 50 to 60 %, undershot 50 to 60 % (about 20 % before the 18th century); overshot rule of thumb "more than a couple of metres" of head                                                                            |
| S7 · Review of gravity water wheels (Politecnico di Torino)                            | https://iris.polito.it/handle/11583/2712517                                                                                                           | maximum efficiency about 85 % (overshot, undershot), 75 to 80 % (breastshot); heads and flows per type                                                                                                                                                     |
| S8 · Water Power Magazine, "Back to the future"                                        | https://www.waterpowermagazine.com/analysis/back-to-the-future-722/                                                                                   | wheel heads (undershot 0.3 to 2 m, breastshot 1.5 to 3 m, overshot 2.5 to 10 m), flow per metre of width, payback compared with screws and Kaplans                                                                                                         |
| S9 · Small-hydro selection charts (several, e.g. JICA manual)                          | https://openjicareport.jica.go.jp/pdf/11734134_04.pdf                                                                                                 | head zones: Kaplan / propeller 2 to 40 m, crossflow 8 to 60 m, Francis 25 to 350 m, Pelton 75 to 500 m and above. The sources overlap and disagree at the edges: the chart draws **zones**, not lines                                                      |
| S10 · Viseta, press article                                                            | https://www.neozone.org/innovation/viseta-une-pico-centrale-hydroelectrique-low-tech-pour-transformer-les-moulins-en-generateur-denergie-4-a-10-kw/   | full-scale target 4 to 10 kW, 1/3-scale bench prototype in 2023, kits planned. No dimensions                                                                                                                                                               |
| S11 · Design theory (to read in wave 1, **not yet read**)                              | Rorres 2000 (J. Hydraulic Eng. 126), Nuernbergk & Rorres 2013, Lubitz, Lyons & Simmons 2014, Kozyn & Lubitz 2017, Dellinger 2015 (thesis, Strasbourg) | optimal geometry, inflow model, performance at variable fill, power-loss model. The physics role reads them and cites the equations it uses                                                                                                                |

The maker's site and funding page were not reachable by search; the owner may have their own contact (§8).

## 2. Key figures to reproduce

Timestamps are `m:ss` in S1, S3, S4 and `h:mm:ss` in S2. **check** = caption cut or ambiguous.

| #   | Quantity                                                     | Value                                                                                                                                               | Conditions                                             | Source / timestamp                      |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| K1  | Available hydraulic power                                    | 100 L/s falling 1 m = "1 kW"                                                                                                                        | rule of thumb (exact: 0.981 kW)                        | S1 33:09                                |
| K2  | Overall efficiency hoped for the screw system                | 60 to 70 % ("on pense"), so 700 W from 1 kW                                                                                                         | not measured yet                                       | S1 33:40                                |
| K3  | Power of the installed prototype                             | about 200 W, 200 to 300 W possible; "between 150 W…" (**check**)                                                                                    | 1/2-scale screw in a small brook, flow variable        | S1 32:15, 20:44                         |
| K4  | Scale of the prototype                                       | "échelle 1 demi" (1/2); the press says 1/3 for the 2023 bench prototype (**check**)                                                                 |                                                        | S1 3:53, S10                            |
| K5  | Target power of a full-size screw, for self-consumption      | about 2 kW "nominal, at most"; press says 4 to 10 kW                                                                                                | head 1.5 to 2 m on abandoned small mills               | S1 11:08 to 11:22, 32:30; S10           |
| K6  | Rotation speed of the screw                                  | 30 to 60 rpm                                                                                                                                        | limited on purpose, fish-friendly                      | S1 36:24, 34:16                         |
| K7  | Generator speed                                              | "several hundred rpm" by belt and pulley; a low-speed generator "like those of wind turbines"                                                       |                                                        | S1 36:06 to 36:44                       |
| K8  | Threads and fill                                             | 3 threads; water trapped between two threads; screw half immersed                                                                                   | inclined; wooden parts bolted, repairable by the owner | S1 25:23, 23:09, 26:23                  |
| K9  | Size compared with a Kaplan                                  | "a screw is big for what it produces"; a Kaplan is much smaller because it turns faster                                                             |                                                        | S1 20:49 to 20:55                       |
| K10 | Crossflow plant: head, flow, power                           | 9.22 m (9.20 m with the draft tube), 450 L/s, 30 kW                                                                                                 | mill with an asynchronous generator                    | S2 1:33:32 (9.20 m), 1:42:36 to 1:42:54 |
| K11 | Crossflow plant: speeds                                      | turbine 380 rpm (1 m flywheel) → flat belt → generator about 990 rpm (ratio about 2.6)                                                              | grid-tied at 50 Hz                                     | S2 1:30:27, 1:35:51                     |
| K12 | Same 30 kW at other heads                                    | 3 m: about 1,500 L/s · 200 m: 10 to 25 L/s                                                                                                          | "the head counts more than the flow"                   | S2 1:43:00 to 1:43:39                   |
| K13 | Hours run in ten years                                       | 64,714 h (about 6,500 h a year); stopped 2 to 4 months in summer                                                                                    | low water                                              | S2 1:36:13, 1:37:45                     |
| K14 | Cost of rust                                                 | 3 kW lost to rust "pimples" in the turbine; 2 kW of them recovered by sandblasting and repainting                                                   |                                                        | S2 1:32:31                              |
| K15 | Price of the complete package (turbine, generator, cabinets) | 75,000 € against a 145,000 € quote in France                                                                                                        | 30 kW                                                  | S2 1:34:49 to 1:35:08                   |
| K16 | Mountain Pelton plant                                        | head about 220 m, about 23 bar, 987 kW, 750 rpm, reserved flow 64 L/s                                                                               | one turbine                                            | S4 21:22, 24:37, 27:06, 27:52, 5:15     |
| K17 | A DIY wheel                                                  | 8 modules, a skateboard motor as generator, a gearbox for torque, rectifier and battery; "a small wheel and a small motor will never power a house" |                                                        | S3 2:49 to 6:15                         |

**Sanity checks (done now, with ρ = 1000 kg/m³, g = 9.81 m/s²).**

- K1: 100 L/s × 1 m → 0.981 kW. The video rounds, fine.
- K3 against K1: 200 W at η = 0.65 needs 308 W of water power, for example 31 L/s over 1 m. Plausible for a small brook.
- K5: 2 kW at η = 0.65 and H = 1.75 m needs Q ≈ 0.18 m³/s (180 L/s). This is the design point that makes sense for a "mill race" site.
- K10: 1000 × 9.81 × 0.45 × 9.22 = 40.7 kW of water power, so 30 kW is an overall efficiency of 0.74. Plausible for a crossflow.
- K12: at 3 m and 1.5 m³/s the water power is 44 kW (30 kW is η 0.68). At 200 m and 20 L/s it is 39 kW (η 0.76). Consistent.
- K13: 64,714 h / 10 years = 6,471 h a year = 74 % of the year; with 2 to 4 months stopped (1,460 to 2,920 h) the range is 5,840 to 7,300 h. Consistent.
- K16: 987 kW at η 0.9 and 220 m needs Q ≈ 0.51 m³/s; 220 m of water is 21.6 bar (the video says about 23). Consistent.
- **Nothing in the sources measures the efficiency of the screw itself** (K2 is a hope, K3 a prototype with unknown flow). The wave 1 model must report the efficiency it finds from the published design theory (S11), never tune it to print 200 W or 700 W.
- Wheel efficiencies disagree between sources (S6 overshot 80 to 90 %, breastshot 50 to 60 %; S7 85 % and 75 to 80 %). The lab shows the **range** and says which source each end comes from.

## 3. Official dimensions and data

None for the screw (S1 and S10 give no diameter, length, pitch or wood species). Dimensions in `src/three/dims.ts` will therefore be
**derived from the design rules** (S5 relation D_O ≈ η·Q^(3/7) and the optimal geometry of S11) for the chosen design point, each
marked `derived` or `estimate`. From the sources we can only take: 3 threads, inclined, half immersed, wooden modules bolted on a
core, a trough or channel, a drive at the top end, a low-speed generator, speed 30 to 60 rpm. Site orders of magnitude: head 1.5 to
2 m, flow 0.03 to 0.2 m³/s (K3, K5), a canal and a water chamber, a tailrace about 100 m long returning to the river (S1 12:36).

## 4. Worlds and parts (draft, ids to freeze before the 3D and data roles start)

Two worlds, about 28 parts (Lite). Names FR / EN to be written by the data role; here only the English working names.

**`site` — the mill race (about 11 parts).** `river`, `weir` (the small dam that raises the water), `headrace` (the canal to the mill),
`intake-gate` (head gate), `reserved-flow-notch` (the water that must stay in the river), `fish-pass`, `water-chamber` (opens the
`screw` world), `tailrace`, `mill-building`, `powerhouse` (cabinet, battery, inverter), `house-load` (what the electricity feeds).
Scenery: trees, footbridge. No trash rack is drawn in the screw bay: that is one of the points of the screw (a note says why).

**`screw` — the machine (about 17 parts).** `trough`, `screw-core` (the central tube), `blade-module` (the wooden kit pieces, 3
threads), `blade-fastener`, `upper-bearing`, `lower-bearing`, `inlet-sill`, `outlet-pool`, `trapped-water` (the water pocket, the one
"part" that is not solid), `drive-sprocket`, `chain`, `pulley-large`, `belt`, `pulley-small`, `generator`, `rectifier`,
`charge-controller`. Open point: the captions mention both a chain and a multiplier (S1 22:39) and a belt-and-pulley system
(S1 36:06): the lab draws chain (slow side) then belt (fast side), **check** in the video.

Explode, section and flow (water, then current) apply to `screw`; no section in `site`. The aha view: the section of the screw with
the pockets of water descending like a slide, a fish riding one of them.

## 5. Physics (for the physics role)

1. **Water power.** P_h = ρ g Q H. Net head H = upper level − lower level. Available flow Q = river flow − reserved flow (K16: 64 L/s),
   capped by the machine's swallowing capacity.
2. **Screw.** Geometry: outer radius R_o, inner radius R_i, pitch S, N = 3 threads, slope β. Pocket volume per thread and turn, flow
   Q = N · V_pocket · n · (fill factor) plus leakage through the gap between blades and trough. Losses: leakage, friction in the
   bearings, drag, inlet and outlet. Efficiency as a function of fill, speed and slope (S11). Speed limit for the fish and for
   the filling: take the limit given by S11 (to verify: n_max ≈ 50 / D^(2/3) rpm, D in metres) and compare with K6.
3. **Wheel (comparison).** Overshot: weight of water in the buckets at the top, η falls with fill and speed. Undershot: momentum,
   little head. Breastshot between the two. The model reproduces the ranges of S6 / S7 without claiming more.
4. **Chooser.** Zones in (H, Q) for each type (S5, S8, S9), lines of equal power P = η ρ g Q H (η by type), the user's site as a
   point, the types that fit highlighted, the specific speed for the curious. Link to Pelton Lab for H > 100 m and to the Archimedes
   screw world for H < 10 m.
5. **`sim/mech` (new).** Speed ratio i = n_gen / n_turbine = D_large / D_small for a belt, product of stages; torque T = P / ω, so a
   speed multiplier divides the torque by i·η; belt and chain efficiencies (to source). Generator matching: a permanent-magnet
   generator with voltage ∝ speed and torque ∝ current, a battery or grid load; the operating speed follows the load. Lessons:
   why the screw wants a multiplier (30 to 60 rpm against hundreds), what a bigger ratio costs, K11 as a check (ratio about 2.6).
6. **The year.** Flow-duration curve of a small brook, a mill race and a river (three sites, as in Piggott Lab); stop below the
   reserved flow (summer low water); annual energy and capacity factor; the winter production that complements solar (S1 21:13 to 21:52).
7. **Scenarios** (each shows one thing): low water (stop, reserved flow), flood (gate closed), debris, screw too fast (fish and
   efficiency), screw too slow (stall), wrong ratio, rust (K14), the same site with a wheel instead.

Tests retrieve K1, K10 to K13 and K16 exactly (they are hydraulic arithmetic) and check K2, K3, K5 as ranges the model must fall in or
explain why not.

## 6. Versions

**One version.** The roadmap keeps the wheel as a comparison. A second machine would only be justified if the comparison needed a
second 3D world: it does not, the chooser and one lesson do the job with curves. If the owner wants the wheel in 3D, it becomes a
third world and a question for the checkpoint, not a version switch (§8, question 4).

## 7. Safety, legal, credits

- **Safety.** Open canals, fast water and a rotating machine: drowning and entanglement. The warning says never to enter the trough
  or the canal near a running screw, to stop and lock the gate before any work, and that the lab is not a construction plan
  (the dimensions are derived, not published by a maker). Electricity: the battery and the grid connection need a qualified person.
- **Legal.** A mill race is not free to use: a **water right** or a permit is needed, a **reserved flow** must stay in the river
  (K16 gives 64 L/s on a mountain stream), fish must be able to pass both ways (ecological continuity), and the paperwork can take years
  (S2 reports ten years of battle with administrations). Said once, in general terms, with the French wording kept only in the French text.
- **Credits.** The four videos and their authors, the association that builds the wooden screw, the encyclopaedia articles and the
  review papers are credited with links in the Sources panel. The narration text names nobody: "the video", "the association" at most
  in the panel. The lab is an _independent educational reconstruction_, not an official drawing or a product.

## 8. Decisions of the owner (2026-10-30)

The owner answered "Oui, tes choix": **all eight recommendations are accepted**. This is a decision on the content, not a go for any
agent (§9).

1. Main source = the wooden-screw video (S1); S2 to S4 secondary.
2. A **generic** screw sized by published design rules, never presented as the association's machine.
3. Default design point = **full size** (head 1.75 m, flow about 180 L/s, about 2 kW), with a switch for the 200 W prototype's head and flow.
4. The wheel = **comparison only** (curves, chooser, one lesson), no third world.
5. Level = **Lite** (2 worlds, about 28 parts, 3 sheets, 6 lessons).
6. The chooser covers wheels, screw, crossflow, Kaplan, Francis and Pelton, with a link to Pelton Lab.
7. The drive is drawn **chain (slow side) then belt (fast side)**.
8. No contact with the association is assumed: dimensions stay derived. If one turns up, the real values replace them in `dims.ts`,
   marked `reported`.

### Questions asked

1. Main source = the wooden-screw video (S1), with S2 to S4 as secondary sources. OK?
2. The machine is a **generic** screw sized by published design rules (the maker gives no dimensions), never presented as theirs. OK?
3. Default design point: the **full-size small-mill screw** (head 1.75 m, flow about 180 L/s, about 2 kW, K5) or the **200 W prototype**
   (K3)? Recommended: full size by default, a switch for the prototype's head and flow.
4. The wheel: **comparison only** (curves, chooser, one lesson), or a third 3D world? Recommended: comparison only.
5. Level: **Lite** (2 worlds, about 28 parts, 3 sheets, 6 lessons) or **Full** (more worlds and sheets, like Piggott)? Recommended: Lite.
6. The chooser covers wheels, screw, crossflow, Kaplan, Francis and Pelton with a link to Pelton Lab. OK?
7. The video at 22:39 and 36:06 mentions both a chain and a belt in the drive: do you read it as chain then belt? (Recommended: yes.)
8. Do you know the association, or have a way to ask for the real dimensions of their screw?

## 9. Next steps

Wave 1 (one physics agent, or me alone if you prefer): `src/sim/**` with the screw, the wheel, the chooser and `sim/mech`, tests on K1
and K10 to K16, `docs/physics.md`, the simulation panel. Then wave 2 (3D ‖ data), wave 3 (plans ‖ lessons), a light quality pass by
me, your checkpoint, and only then the spoken guide (decided per lab and per language, the credits being limited). The lab moved
to the current kit (v0.4.0) on 2026-10-30. I do not start any agent without your go.
