# Physics of the Mill lab

The simulation in `src/sim` (pure TypeScript, no DOM, no three.js, runs in Node under vitest). It models a small
hydrodynamic Archimedes screw in a mill race (research §2, K1–K17) with the published design rules: the water of a site, a
screw sized from a head and a flow, the water that fills its buckets, the leaks and losses, the shaft power, a chain and a belt,
a permanent-magnet generator on a battery, and a year of river flows. A water wheel and the other turbines are there for
comparison. The efficiency of the screw, the speed at which it settles, the power at the battery and the energy of the year are
**outcomes** of these equations, not curves drawn.

Words used for the status of a number: **verified** (the formula or number was read in a source, named with its address in §9),
**reported** (stated in a source of `docs/research.md`, K- or S-number), **derived** (computed from reported figures, the
computation is written next to it), **estimate** (the sources read are silent: a guess with its reasoning, labelled so in
`machine.ts`), **calibrated** (an estimate chosen so that the model retrieves a reported figure). **There is no calibrated
constant in this model**: the one that came close, the gap-leakage coefficient `C_LEAK`, is left at the ideal value 1 and the
model is compared with the law it could have been fitted to (§3).

**The model was not tuned to print 200 W, 700 W or 2 kW.** It prints 206 W for the prototype and 2.2 kW for the full-size
screw, and 71 % from the water to the battery; §6 and §7 give the numbers, what they depend on, and the honest limits.

Files: `machine.ts` (every constant, one file), `bucket.ts` (the water pocket of a screw, numerically), `screw.ts` (sizing and
steady performance of the screw), `wheel.ts` (the comparison wheels), `chooser.ts` (zones in head and flow, lines of equal power),
`mech.ts` (**the new `sim/mech` module**: chain and belt stages, torque, the permanent-magnet generator, speed matching; pure
and free of any lab import, written to move to the kit), `site.ts` (head, a year of river flows, reserved flow, tailwater),
`system.ts` (the whole plant at one instant), `year.ts` (the year), `physics.ts` (hydraulic arithmetic), `presets.ts`,
`types.ts`, `engine.ts` (`MillSim implements LabSim`). Tests next to the code; `src/panels/model.ts` holds what the panel plots,
as plain functions.

## 1. The model

All SI. ρ = 1000 kg/m³, g = 9.81 m/s² (the kit's `RHO` and `G`); the kit's `frictionFactor` is reused for the friction of the water.

### 1.1 The site (site.ts)

- **Head** `H`: the difference in level between the water upstream of the screw and the water downstream, at the design level of the
  tailwater. A slider (0.3 to 6 m); the screw covers it.
- **Three watercourses** (a small brook, a mill race, a river), each with a mean flow (0.06, 0.3, 3 m³/s), a seasonal swing, a
  correlated day-to-day weather and a few floods, **estimates of typical sites** (the sources give orders of magnitude only,
  research §3 and §5.6). A year of 365 daily flows is drawn once from a seeded generator (mulberry32: AR(1) weather in log units,
  seasonal cosine with its peak in February, floods as multiplicative bumps) and scaled so that its mean is the site's mean: it is
  the same at every visit. The mill race has a median flow of 0.224 m³/s, 0.667 exceeded 10 % of the year and 0.044 exceeded 90 %.
- **Reserved flow**: 10 % of the mean annual flow stays in the river (estimate: the usual French rule of thumb, **not found in a
  source read**; K16 gives 64 L/s on a mountain stream). The machine takes `usable = river − reserved`, up to its swallowing
  capacity; the rest goes over the weir.
- **Gate**: closed by the owner when the river exceeds six times its median flow (estimate), when it is closed by hand, and when the
  usable flow is under 15 % of the design flow (estimate; Brada's tests, Dellinger 2015 fig. 2.7, show the efficiency of a screw
  falling fast under about a third of its flow at a fixed speed).
- **Tailwater**: it rises with the river. Zero up to the median flow, then `tailPerDecade · log10(Q / Q_median)` metres (1.0, 1.5 and
  2.0 m per tenfold increase for brook, race and river: estimates). A slider adds a manual rise (a drowned outlet).
  The head net of it is what the machine gets.

### 1.2 The screw: geometry from the design point (screw.ts, bucket.ts)

Inputs: the design flow `Q_d`, the head `H` and the slope `β` (default 22°). Everything else is derived, none of it is a published
dimension of the association's machine (research §3).

| Quantity                 | Rule                                                                                                  | Status                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| threads                  | N = 3                                                                                                 | reported K8; also the usual number (Simmons & Lubitz 2024)                                                                                                                                                                                                                                                |
| inner / outer radius     | 0.5357                                                                                                | **verified**: Rorres 2000, table 1 (optimum for N = 3); field screws 0.41 to 0.55                                                                                                                                                                                                                         |
| pitch                    | S = D_o                                                                                               | **verified**: Nagel's simplifying choice L = 2.0 R_o for every angle (Rorres 2000 p. 78); field screws S/D_o = 1.0 to 1.19 (Simmons & Lubitz 2024, table 2). Rorres's own optimum for N = 3 at 22° would be 1.72 D_o (more water per turn, longer pitch); the lab takes the built proportion              |
| slope                    | 22° (15° to 35°)                                                                                      | **verified**: "the most common inclination angle for installed screws" (Simmons & Lubitz 2024, citing Lashofer 2018)                                                                                                                                                                                      |
| speed at the design flow | n = 50 / D^(2/3) rpm, D in m                                                                          | **verified**: Nagel 1968 as quoted by Rorres 2000 p. 73 and by Dellinger 2015 (eq. 2.19, Muysken 1932); Brada 1999 measured 56 / D^(2/3) for a turbine (Dellinger eq. 2.20)                                                                                                                               |
| gap blade-trough         | g = 0.0045 √D_o                                                                                       | **verified**: Nagel 1968 as quoted by Dellinger 2015 (eq. 2.30); Simmons & Lubitz 2024 use 2 mm at 0.32 m, 6 mm at 1 m                                                                                                                                                                                    |
| diameter D_o             | the one for which full buckets at the rule speed pass `Q_d` (bucket flow + gap leakage), by bisection | **derived**                                                                                                                                                                                                                                                                                               |
| length                   | L = H / sin β                                                                                         | **estimate**: the submerged ends of the screw (inlet and outlet levels above the trough) are assumed to cancel; three of the four field screws turn out to give 96 to 98 % of ρ g Q L sin β as shaft power, so their real heads exceeded L sin β by some 20 %; the sites' heads were not retrieved (§7.4) |
| mass, inertia            | wood 600 kg/m³, blades 2.5 % D_o thick, a tube core                                                   | **estimate** (bearing friction and the time scale of the speed only)                                                                                                                                                                                                                                      |

**The Wikipedia relation D_O ≈ η·Q^(3/7) is explained, not just quoted.** A bucket holds a volume ∝ D³ and the speed rule says
n ∝ D^(−2/3), so the flow of full buckets is ∝ D^(7/3) and D ∝ Q^(3/7). The lab's sizing gives **D = 1.80 · Q^(3/7)** (D in m, Q
in m³/s) with the coefficient varying by only 2 % between 10 L/s and 14.5 m³/s (test `D ∝ Q^(3/7)`). The coefficient η of the
encyclopaedia, "read on a graph", was not given in the text I read; the exponent is therefore verified by derivation, the coefficient is
this model's. The model gives a 5 m screw (the largest built) 10.7 m³/s against the 10.3 of Simmons & Lubitz 2024, table 3.

### 1.3 The bucket (bucket.ts) — verified against Rorres 2000

Frame of Rorres 2000. A blade is a helicoid; the floor of a chute (the lower of its two blades) at radius r and angle φ
(φ = +π/2 at the top) has height `F = r cosβ (sin φ + κ φ)`, `κ = S tanβ / (2π r)`, and the chute is S/N thick along the axis. The
water in a bucket lies on the floor below a horizontal level. At each radius with κ < 1 the floor has a minimum (the bottom of the
bucket) and, one turn lower, a saddle; the **full bucket (fill f = 1) has its level at the lowest saddle over all radii**, which is
the "level tangent to the inner edge of the lower blade" of Rorres (eq. 16). The fill height ratio is
`f = (level − lowest point) / (saddle − lowest point)` (Simmons & Lubitz 2024, eq. 1.1). The volume at any level is integrated on a
grid of 40 radii × 240 angles (about 3 ms for a whole table of 21 fills, computed once per shape and scaled with R_o³).

The numerical bucket **retrieves Rorres's table 1 to four digits**: the fraction of one pitch occupied by water at full buckets is
0.2698 (table: 0.2697) for the optimal 3-bladed screw, 0.2811 (0.2811) for one blade, 0.2746 (0.2747) for two, 0.2647 (0.2647) for
five, 0.2608 (0.2609) for eight, and 0.1703 (0.1703) for Vitruvius's eight-bladed screw; the start angle of his example bucket is 112.03°
(eq. 16). Tests: `bucket.test.ts`. For the lab's own proportions (S = D_o) the fraction is 0.373; one full bucket of the 0.86 m
screw holds 61.8 L.

### 1.4 Flow, fill and leakage (screw.ts)

At a flow `Q` arriving at a speed ω: `Q = Q_b + Q_g (+ Q_o)`, the bucket flow, the gap leakage and the overflow (Simmons & Lubitz 2024,
eq. 1.3; Dellinger 2015, eq. 2.21).

- **Bucket flow** `Q_b = N · V_B(f) · ω / 2π`, with `V_B(f)` from §1.3. Between the nodes of the table both flows are linear in f, so
  the fill is found exactly by walking the nodes.
- **Gap leakage** `Q_g = C · g · ∫ √(2 g Δh) dl` along the blade tip under the bucket, with `Δh_b = (S/N) sin β` the head across one blade
  (the levels of two successive buckets differ by that, since the pockets are translates of each other along the axis) and, along the
  tip, the head across the blade `Δh = clamp(h_bucket − tip height, 0, Δh_b)`. This is the Torricelli law of Muysken (1932) in the form
  quoted by Simmons & Lubitz 2022 (eq. 3, `Q = C·g·(l_w + l_e/1.5)·√(2 g h_b)`): the integral is its exact form, `l_w` being the tip under
  both levels (full head) and `l_e` the tip between them (a head falling to zero, which integrates to 2/3, hence the 1.5). **The
  figure that defines `l_e` was not readable in the text I had; this reading is mine.** `C = 1` (ideal orifice, **estimate**; their
  regression gives 0.70 for their laboratory screw and 1.0 to 1.1 for the field screws). With `C = 1` the model leaks **9 % more than
  Nagel's empirical law** `Q = 2.5·g·D·√D = 0.01125 D_o²` at D_o = 0.9 m (0.00990 against 0.00909 m³/s; both scale as D²). Test `gap rule of Nagel`.
- **Overflow**: when the flow exceeds what full buckets carry at that speed, `Q_o = Q − Q_b(1) − Q_g(1)` goes down the screw without
  doing work. The real overflow is a weir flow over the saddle with the fill rising a little above 1 (Aigner 2008, Songin & Lubitz
  2019, **not read**): the lab's version is sharper, so the efficiency falls faster below the optimal speed than in the experiments.

### 1.5 Power and losses (screw.ts)

```text
P_hyd    = ρ g Q (H_net − drawdown)            the water that arrives, head net of the tailwater and of the lowered pool
drawdown = (1 − f) · ΔZ                        ΔZ = height between an empty and a full bucket (0.46 m for the 0.86 m screw)
P_ideal  = ρ g Q_b · (H_captured − drawdown)   the water that goes through the buckets
P_shaft  = P_ideal − P_inlet − P_outlet − P_friction − P_bearing
η        = P_shaft / P_hyd
```

This is the structure `P = P_s − P_L,f − P_L,o` of Simmons & Lubitz 2024 (eq. 1.2), with the lab's own, simpler, ideal power:
**the buckets carry the water through the whole head covered by the screw** (`ρ g Q_b L sin β`), instead of integrating the hydrostatic
pressure on the blades (Lubitz et al. 2014, **not read**). The leaking and overflowing water falls through the head and produces nothing.

- **Pool drawdown** (estimate). When the screw swallows less than it could (f < 1) the pool at the inlet is lower than at f = 1: the
  first bucket fills at the level of the pool. The head is lowered by `(1 − f)·ΔZ`. Counted against the head of the lowered pool this is not
  an efficiency loss (so the efficiency stays flat down to a third of the flow, as in Brada's tests); it is reported apart as the head
  lost at low fill. Hence the tests `Brada 1999` and `Dellinger 2015`.
- **Outlet** (verified, with a limit). The dynamic outlet loss of Simmons & Lubitz 2024, eq. 3.11 for N = 3,
  `P = ρ g Q_b D_o · (0.8373 x² − 0.2069 x + 0.06244)`, `x = ψ_L − ψ_L*`, the submergence of the lower water above the optimal one
  (`ψ_L* ≈ 0.60`, Nuernbergk 2020 as quoted). It is 3 % of the head at the optimum and grows with a drowned or a too low outlet.
  It was fitted to CFD of one family of proportions (S/D_o = 1, 24.5°, N = 3), on data that stop at x = +0.2 to +0.3: **the lab holds x
  at +0.4**. Their correction factors for the fill and the slope (eqs. 3.8 to 3.10, with a sign convention I could not settle from the text)
  **are not applied**. The head effect of the same paper is the head lost to the tailwater, which the lab already takes in `H_net`.
- **Inlet** `K_in · ½ρ Q_b (ω R_o)²` with `K_in = 0.05` (**estimate**: the splash of blades entering the pool; no source). It is 1 % of the
  water power at the design speed and grows with the square of the speed.
- **Friction** `½ρ c_f ω³ Σ ∫ r³ dA` over the wetted blade (floor and ceiling) and core surfaces of every bucket, the water being at
  rest in the frame of the trough and the blades moving at ω r (**estimate**; Dellinger 2015 lists the same three contributions, blades,
  core and trough, and Kozyn & Lubitz 2017, **not read**, a hydraulic friction model). `c_f = f_D / 4` with the kit's `frictionFactor`
  (Swamee–Jain) at the speed of the mid-radius and the width of the annulus; roughness 0.5 mm (planed wood) by default. It is 6 % of
  the water power at the design point; §7.3 shows what the answer does if it is halved or doubled. The friction of the trough is neglected.
- **Bearings** `μ m g r_b ω`, μ = 0.01, r_b = 5 % of D_o (estimate): under 0.2 %.
- **Speed limit** `n = 50 / D^(2/3)` is the speed at which the buckets are full at the design flow. The strip warns "too fast" above
  1.1 times it (the field screws run at 1.01 to 1.09; estimate). The rule is attributed by Rorres to practice ("if the screw is rotated
  much faster, turbulence and sloshing prevent the buckets from being filled") and the video says the association limited the speed
  on purpose for the fish (K6); **the lab has no model of fish injury**.

Resulting shape (the full-size screw at 0.18 m³/s): maximum efficiency at the design speed (the scan puts the best at 56 rpm against
55.3), 85 %; at 0.5 times the speed 45 % (overflow), at 1.6 times 73 % (the buckets 64 % full, friction × 2.6), the torque falling
with the speed. This is the shape reported by Dellinger 2015 (one maximum, near the nominal speed, a little over 80 %; the overflow
dominating below, the leakage and the friction above; fig. 3.24), by Brada 1999 (about 80 % over a wide range of flows) and by BOKU
(over 90 % in a laboratory), and the 69 % mean of 74 plants in Europe (Lashofer et al. 2012, in Dellinger 2015) is a plant, not a screw.

### 1.6 The wheel (wheel.ts) — comparison only

Overshot (weight of the water), breastshot (both) and undershot (momentum): `η = head utilisation × hydraulic factor × spill × speed factor × bearings`.

- Overshot and breastshot: the wheel loses a clearance of head (0.3 and 0.2 m: estimate); the buckets spill a quarter of the drop per
  unit of filling (a third full at the design flow, a usual design: estimate); the speed factor is `x(2 − x)`, `x = rim speed / best rim speed` (1.5 and
  1.8 m/s: estimates).
- Undershot: the sluice turns the head into a jet `v = C_v √(2 g H)`, `C_v = 0.95`; a paddle at speed u takes `4x(1 − x)` of the half of the jet's power
  (Borda–Carnot: flat paddles take at most half, `x = u / v`): **momentum, nothing from the weight**.
- **The sources disagree and the lab keeps both** (research §1): overshot 80 to 90 % (S6) and about 85 % (S7); breastshot 50 to 60 % and
  75 to 80 %; undershot 50 to 60 % (about 20 % before the 18th century) and about 85 %. Head ranges of S8: 0.3 to 2, 1.5 to 3 and 2.5 to 10 m.
  **The spill and hydraulic factors were set to plausible values that keep the peak of each type inside or near those ranges** (the research
  asks the model to reproduce them): the wheel is anchored on the sources, it is **not an independent result**. Where it falls
  (peak, at its best head): overshot 0.82 at 8 m (0.71 at 1.75 m); breastshot 0.75 at 3 m (S6 50 to 60 %: above; S7 75 to 80 %: inside);
  undershot 0.44 (flat paddles; the 50 to 60 % of S6 and the 85 % of S7 are curved Poncelet blades: **not modelled**).
- The wheel is flagged out of range when the head is outside the S8 range of its type. A wheel runs at 10 to 20 rpm: with its generator
  at 600 rpm it needs a ratio of 30 to 61 against 10.9 for the screw (§1.8).

### 1.7 The chooser (chooser.ts)

Eight zones in head and flow, drawn as outlines because **the zones overlap and the sources disagree at their edges** (research S5, S8,
S9). Heads: wheels (S8) 0.3 to 2, 1.5 to 3, 2.5 to 10 m; screw (S5) 0.1 to 10 m **and** 0.01 to 14.5 m³/s (the only reported flow range);
Kaplan (S9) 2 to 40 m, crossflow 8 to 60, Francis 25 to 350, Pelton 75 to 500 and above (the chart stops at 1,500 m: estimate). **Flow
limits other than the screw's are estimates**: each type is given a usual power window (100 W to 20 kW for an undershot wheel up to
5 kW to 30 MW for a Pelton), which gives the diagonal edges of a zone through `P = η ρ g Q H`. Typical peak efficiencies by type, used for the lines and
for the power expected on the site: undershot 0.45, breastshot 0.6, overshot 0.75, screw 0.75, Kaplan 0.88, crossflow 0.74 (derived from K10),
Francis 0.88, Pelton 0.9 (estimates). The lines of equal power (1, 10, 100 kW and 1 MW) are drawn at η = 0.75. Also `runnerDiameter(Q)` for K9
(axial speed 4 m/s through a propeller runner: estimate). The panel gives the link to Pelton Lab for high heads in its text.

### 1.8 `sim/mech`: the drive and the generator (mech.ts)

- A stage multiplies the speed by `D_large / D_small` and divides the torque by `ratio × efficiency`; stages in series multiply
  ratios and efficiencies. Chain 0.98 and belt 0.96 (estimates; Dellinger 2015, citing Nuernbergk 2012, reports multipliers of belts or
  gears above 95 %); a third stage (0.96) is added for every factor 5 beyond what two stages can do. Torque `T = P / ω`.
- **The generator** is the permanent-magnet machine of research §4 on a three-phase bridge and a 48 V battery (estimate): open-circuit
  voltage `V_oc = k·ω` with `k = 1.35 × (line voltage per rad/s)`, current `I = max(0, (V_oc − 1.5 − 48)/R)` (two diodes), torque `T = k·I`
  (so **torque is proportional to the current and voltage to the speed**), electrical power `48·I`, and the books close:
  `V_oc I = 48 I + 1.5 I + R I²`. The generator is **wound for the machine that was sized**: at its rated speed (600 rpm, K7 "several
  hundred rpm") it takes the design shaft power and its open-circuit voltage is 12 % above the battery's (estimates), which fixes `k` and `R`;
  its efficiency at the rated point, 89 %, is a result of that choice. It starts to charge at 552 rpm.
- **The speed follows the load**: the machine's torque falls with the speed and the generator's rises, `matchSpeed` finds where they meet;
  below the cut-in nothing brakes and a machine that cannot reach it runs to the speed where its own torque vanishes (it "runs away"
  and charges nothing). A "fixed speed" mode (a drive) skips the matching and charges with the generator's rated efficiency.
- **Why a multiplier.** The same 2.2 kW is 453 N·m at 55 rpm and 39 N·m at 600 rpm: a generator turned directly by the screw would have to
  carry 12 times the torque. The ratio is the product of the chain's and the belt's (3.3 × 3.3 for the screw, 10.9). Too small a ratio never
  reaches the cut-in; too large a ratio holds the screw slow, overflowing, and costs an extra stage (K11 retrieved: 1 m flywheel, 380 rpm →
  990 rpm, ratio 2.6).

### 1.9 The plant and its time (system.ts, engine.ts)

The plant is steady at every instant: the site gives the usable flow, the tailwater and the rack loss; the machine's torque curve
and the generator's load curve give the speed. The one thing that is not steady is the **rotation speed**: `J dω/dt = T_machine(ω) − T_load(ω)`, solved
**implicitly** each step (the right-hand side falls with ω, so the step is stable whatever dt is; test `the speed is stable whatever the step`). A
machine that has lost its water or is held by a drive follows a first-order lag (4 s to coast to a stop: estimate). The clock of the year advances at
`dt × timeScale` (the strip offers ×1, ×3600, ×86400, ×604800: a day per second, a week per second); scenarios run in real seconds; the
rotation uses `dt × slowMo`. Energy counters integrate the electric and hydraulic power on the slow clock (Wh); the books never
show more electricity than water. The visual angle is `∫ ω dt slowMo`, not capped (the fastest wheel of the lab, a screw at 150 rpm, turns 2.5 times a second
at most: the 3D role may blur it).

### 1.10 The year (year.ts)

One steady state per day over the 365 daily flows: the energy, the mean power, the capacity factor against the rated electric power
(the generator's rated point), the days stopped for low water and for flood, the hours run, the energy per month, the share produced from December to February
(compared with the 24.7 % of the year those 90 days are) and the share of the site's energy (`ρ g Q_usable H`) that was used.

## 2. Parameters (all editable live, `MillSim.set`)

| Parameter (`MillParams`)         | Unit      | Range                                  | Default (mill, full size) | Status                                                                  |
| -------------------------------- | --------- | -------------------------------------- | ------------------------- | ----------------------------------------------------------------------- |
| `site`                           | –         | brook, race, river                     | race                      | estimates (§1.1)                                                        |
| `head`                           | m         | 0.3–6                                  | 1.75                      | derived from K5 (§6)                                                    |
| `designFlow`                     | m³/s      | 0.01–5                                 | 0.18                      | derived from K5                                                         |
| `riverFlow`                      | m³/s      | 0 – 8 × median                         | 0.22                      | the median of the race                                                  |
| `followYear`                     | –         | on/off                                 | off                       | the river follows the clock                                             |
| `tailwater`                      | m         | −0.3–1.5                               | 0                         | a flooded outlet                                                        |
| `gateOpen`                       | –         | on/off                                 | on                        |                                                                         |
| `machine`                        | –         | screw, overshot, breastshot, undershot | screw                     | the ratios follow the machine                                           |
| `slope`                          | °         | 15–35                                  | 22                        | verified (§1.2)                                                         |
| `roughness`                      | mm        | 0.05–5                                 | 0.5                       | estimate (planed wood)                                                  |
| `gapScale`                       | ×         | 0.5–4                                  | 1                         | × Nagel's gap                                                           |
| `trashRack`, `debris`            | –, 0–0.95 |                                        | off, 0                    | a rack costs `(0.3 + (b/(1−b))²) · v²/2g` of head at 0.8 m/s (estimate) |
| `chainRatio`, `beltRatio`        | –         | 1–6, 1–8                               | 3.3, 3.3                  | derived: they bring the generator to 600 rpm                            |
| `loadMode`, `fixedRpm`           | –, rpm    | generator / fixed, 5–200               | generator, 50             |                                                                         |
| `slowMo`, `timeScale`, `running` | –         | kit                                    | 1, 1, true                | kit time controls                                                       |

Every value set is clamped to its range. Editing anything but the time controls makes the preset `custom`; a ramp of a scenario is
cancelled when the visitor edits the quantity it moves. Changing the machine resets the drive ratios to those that suit it.

## 3. Constants, their status and what was calibrated

All are in `src/sim/machine.ts` with their tag.

| Constant                                                   | Value                         | Status                                             | Source / reasoning                                                                       |
| ---------------------------------------------------------- | ----------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `BLADES`                                                   | 3                             | reported                                           | K8                                                                                       |
| `RADIUS_RATIO`                                             | 0.5357                        | verified                                           | Rorres 2000 table 1                                                                      |
| `PITCH_RATIO`                                              | 1.0                           | verified                                           | Nagel's rule via Rorres 2000; field screws (Simmons & Lubitz 2024)                       |
| `SPEED_RULE_RPM`                                           | 50                            | verified                                           | Nagel via Rorres 2000, Dellinger 2015                                                    |
| `GAP_COEFF`                                                | 0.0045                        | verified                                           | Nagel via Dellinger 2015                                                                 |
| `C_LEAK`                                                   | 1.0                           | estimate (not calibrated)                          | ideal orifice; fit of 0.7 to 1.1 in Simmons & Lubitz 2022; +9 % against Nagel at 0.9 m   |
| `OUTLET_PI`, `PSI_OPT`                                     | 0.8373, −0.2069, 0.06244; 0.6 | verified                                           | Simmons & Lubitz 2024 eq. 3.11 and text; held beyond x = 0.4 (estimate)                  |
| `K_INLET`                                                  | 0.05                          | estimate                                           | splash of the blades                                                                     |
| `ROUGHNESS_NEW_MM`                                         | 0.5                           | estimate                                           | planed wood                                                                              |
| friction model, bearings                                   | see §1.5                      | estimate                                           | ½ρ c_f (ωr)³ on the wetted surfaces                                                      |
| `FLOW_MIN_FRAC`                                            | 0.15                          | estimate                                           | Brada's curve (Dellinger fig. 2.7)                                                       |
| `RESERVED_FRACTION`                                        | 0.1                           | estimate                                           | rule of thumb, **not in the sources read**                                               |
| `FLOOD_GATE_FACTOR`                                        | 6                             | estimate                                           |                                                                                          |
| `CHAIN_EFFICIENCY`, `BELT_EFFICIENCY`                      | 0.98, 0.96                    | estimate                                           | multipliers above 95 % (Dellinger 2015)                                                  |
| `GEN_RATED_RPM`, `BUS_VOLTS`, `GEN_HEADROOM`, `DIODE_DROP` | 600, 48, 0.12, 1.5            | estimate                                           | K7 "several hundred rpm"; a 48 V battery bank; a design choice; the Piggott lab's bridge |
| wheel constants                                            | see `machine.ts`, `wheel.ts`  | estimate                                           | anchored on the ranges of S6, S7 (§1.6)                                                  |
| zones, η by type, power windows                            | see `chooser.ts`              | reported heads (S5, S8, S9), estimated flows and η |                                                                                          |

**No constant is calibrated.** The only candidate, `C_LEAK`, could have been fitted to Nagel's law (it would then be 0.92 at 1 m); it is left
at 1 and the 9 % difference is reported instead.

## 4. What the 3D role reads (`MillState`, every field is documented with units in `types.ts`)

The state is flat and read-only. The rotation is already slowed by `slowMo`.

| Field                                                                                                       | Meaning                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `angle` rad                                                                                                 | visual angle of the machine (increases with time; the 3D role chooses the sense)                                               |
| `rpm`, `omega`, `speedRatio`                                                                                | speed of the machine, and over the rule `50 / D^(2/3)`                                                                         |
| `outerDiameter`, `innerDiameter`, `pitch`, `length`, `slopeDeg`                                             | the derived screw, m and degrees (the 3D role reads these, it does not retype them); `wheelDiameter`, `wheelWidth` for a wheel |
| `riverFlow`, `reservedFlow`, `usableFlow`, `flow`, `bypassFlow`, `tailRise`, `rackLoss`, `headNet`          | water, m³/s and m                                                                                                              |
| `fill`, `qBucket`, `qGap`, `qOver`                                                                          | filling of the buckets (0..1) and the split of the flow: the 3D role can show the water level in the buckets and the leaks     |
| `hydraulicPower`, `shaftPower`, `torque`, `etaMachine`, `electricPower`, `etaOverall`                       | W, N·m, 0..1                                                                                                                   |
| `loss*` (Gap, Overflow, Drawdown, Inlet, Outlet, Friction, Bearing, Drive, Generator)                       | W                                                                                                                              |
| `generatorRpm`, `openCircuitVolts`, `current`, `generatorTorque`, `driveEfficiency`, `charging`             | the generator and the drive                                                                                                    |
| `stopped` (`no`, `lowWater`, `flood`, `closed`, `noStart`), `alarms`                                        | situation and strip alarms                                                                                                     |
| `simTime`, `day`, `hour`, `energy*`                                                                         | slow clock (starts on 1 October at 08:00), Wh counters                                                                         |
| `sim.scope`, `sim.getYear()`, `sim.getSpeedCurve()`, `sim.getCompare()`, `sim.getCandidates()`, `sim.plant` | last minute, the year, the curves, the other machines, the chooser, the sized machine                                          |

## 5. Presets and scenarios

| id          | What                                                                             |
| ----------- | -------------------------------------------------------------------------------- |
| `full-size` | the default: the mill race, 1.75 m, 180 L/s, a screw of 0.86 m turning at 55 rpm |
| `prototype` | the small brook, 1 m, 31 L/s: a screw of 0.40 m, 92 rpm, about 200 W             |
| `brook`     | the small brook, 1.5 m, 35 L/s                                                   |
| `river`     | a river with a weir, 3 m, 2.2 m³/s: a screw of 2.5 m, 27 rpm, 47 kW              |

The **mill race is the full-size preset** (one entry, not two): the three sites of the brief are the three watercourses of the `site` select.

| id                  | What                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `low-water`         | the river falls from 0.22 to 0.03 m³/s in 150 s: the fill falls, the power falls to a fifth, the gate closes (K13)                                                       |
| `flood`             | the river rises to 1.9 m³/s: the tailwater climbs by 1.2 m before the gate closes at six times the median (1.34 m³/s), the head collapses, the screw slows and overflows |
| `debris`            | a rack in the intake clogs to 90 %, costing most of the head; at 100 s the rack is taken out, as a screw allows                                                          |
| `too-fast`          | the speed is imposed and climbs to 2.4 times the rule: the buckets are half empty, the power falls by half                                                               |
| `too-slow`          | the speed falls to 0.3 times the rule: the buckets overflow                                                                                                              |
| `wrong-ratio`       | belt ratio × 0.45 (the generator never charges, the screw runs at twice its speed), then × 1.9 (the screw is held back), then right again                                |
| `rough-surface`     | the roughness rises from 0.5 to 5 mm: the friction loss rises 1.9 times and the power falls by 7 %                                                                       |
| `wheel-instead`     | the screw, then a breastshot wheel, then an undershot wheel, on the same water                                                                                           |
| `prototype-vs-full` | the prototype for 40 s, then the full-size machine                                                                                                                       |

## 6. Key figures → tests → results

"Model" is the value of the default machine. A test that retrieves a source figure asserts the figure; the test names carry the K-number.

| K   | Figure (source)                                       | Target                             | Model                                                                                                                                                                                                                                                                 | Test (`src/sim/…`)                               |
| --- | ----------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| K1  | 100 L/s × 1 m = "1 kW"                                | 981 W exactly                      | 981 W                                                                                                                                                                                                                                                                 | `physics.test.ts` › K1                           |
| K2  | overall 60 to 70 % hoped, not measured                | range                              | **71.1 %** water to battery (full size), 67.7 % (prototype): a point above the range; screw 84.6 %, chain and belt 94.1 %, generator 89.3 %. Field plants: about 75 % river to wire (Simmons & Lubitz 2024), mean 69 % of 74 European plants (Lashofer, in Dellinger) | `system.test.ts` › K2                            |
| K3  | about 200 W prototype                                 | range 150 to 300 W                 | **206 W** from the research's 31 L/s over 1 m. **Circular**: that flow was derived in the research from 200 W at 65 %, so this retrieves the efficiency, not the 200 W; the real flow is unknown                                                                      | `system.test.ts` › K3                            |
| K4  | prototype at 1/2 scale                                | –                                  | prototype D 0.40 m, full size 0.86 m: a linear ratio of 0.47, a coincidence of the derived flows; **not modelled** as a geometric scale                                                                                                                               | –                                                |
| K5  | about 2 kW full size                                  | range 1.5 to 2.5 kW                | **2.2 kW** from 180 L/s over 1.75 m (the same circularity); the press says 4 to 10 kW (needs 3 to 6 times the water)                                                                                                                                                  | `system.test.ts` › K5                            |
| K6  | 30 to 60 rpm                                          | range                              | 55 rpm (full size, D = 0.86 m); the rule gives 92 rpm for the 0.40 m prototype, 27 rpm for the 2.5 m river screw; 30 to 60 rpm is the rule for D = 0.8 to 2 m                                                                                                         | `screw.test.ts` › K6                             |
| K7  | generator "several hundred rpm" by belt and pulley    | 300 to 1,000 rpm                   | 600 rpm, ratio 10.9 (full size), 6.5 (prototype)                                                                                                                                                                                                                      | `system.test.ts` › K7                            |
| K8  | 3 threads, half-immersed, inclined                    | as reported                        | 3 threads, 22°, fill 1 at the design point                                                                                                                                                                                                                            | `screw.test.ts` › K8                             |
| K9  | "a screw is big for what it produces"                 | qualitative                        | a Kaplan runner for 180 L/s: 0.24 m, the screw 0.86 m (3.6 times)                                                                                                                                                                                                     | `system.test.ts` › K9                            |
| K10 | 9.22 m, 450 L/s, 30 kW                                | 40.7 kW of water, η 0.74           | 40.7 kW, 0.737                                                                                                                                                                                                                                                        | `physics.test.ts` › K10                          |
| K11 | 380 rpm → 990 rpm, 1 m flywheel                       | ratio about 2.6                    | 2.605 and 2.60 for 1 m / 0.385 m                                                                                                                                                                                                                                      | `physics.test.ts`, `mech.test.ts` › K11          |
| K12 | 30 kW at 3 m: about 1,500 L/s; at 200 m: 10 to 25 L/s | 44 kW at 1.5 m³/s; 39 kW at 20 L/s | 44.1 kW; 39.2 kW; **finding: 10 L/s is impossible** (19.6 kW of water for 30 kW, the minimum is 15.3 L/s at η = 1)                                                                                                                                                    | `physics.test.ts` › K12                          |
| K13 | 64,714 h in 10 years, 2 to 4 months stopped           | 6,471 h a year, 74 %               | exact; the model's race, not tuned to it: 57 days of low water, 7,368 h a year                                                                                                                                                                                        | `physics.test.ts` › K13; `system.test.ts` › year |
| K14 | 3 kW of 30 lost to rust pimples (crossflow turbine)   | –                                  | **not retrieved**: on the slow screw, 0.5 → 5 mm roughness costs 7 % of the power (friction 189 → 365 W)                                                                                                                                                              | `system.test.ts` › rust                          |
| K15 | price of the package                                  | –                                  | not physics                                                                                                                                                                                                                                                           | –                                                |
| K16 | 987 kW, 220 m, about 23 bar, reserved flow 64 L/s     | 0.508 m³/s at 90 %, 21.6 bar       | 0.508 m³/s, 21.6 bar; the reserved flow of the lab is 10 % of the mean (estimate)                                                                                                                                                                                     | `physics.test.ts` › K16                          |
| K17 | a small wheel and motor never power a house           | qualitative                        | wheel model at 0.5 m, 18 L/s: 34 to 48 % of 88 W, 30 to 42 W                                                                                                                                                                                                          | –                                                |

**Beyond the video, retrieved from the sources I read** (tests): Rorres 2000, table 1 and Vitruvius (`bucket.test.ts`, 4 digits); the speed rule on the four
field screws of Simmons & Lubitz 2024 table 2, 1.01 to 1.09 times it (`screw.test.ts`); D ∝ Q^(3/7) and the 5 m, 10.3 m³/s screw (+4 %); the flow of full
buckets on the four field screws with their own proportions, +19, +6, −6 and +17 %, +9 % on average (`screw.test.ts`); Nagel's leakage law (+9 %); the efficiency curve of Dellinger
and Brada (one maximum, near the nominal speed, torque falling with speed, flat down to a third of the flow); the multiplier ratio of K11; the books of the generator.

Other behaviours tested: energy conservation (the electricity of a run never exceeds the water; the books of the screw and the generator close); determinism; frame-rate
independence (30, 60 and 144 fps agree to 2 %); stable speed under a 0.25 s step; the slow motion slows the rotation, not the clock; fast-forward
(a year at 6 weeks per second gives the energy of the yearly calculation to 10 %); the nine scenarios; clamping of `set`; no NaN or infinite value over the whole range of every parameter
(a sweep over flow, speed, tailwater and roughness, one parameter at a time, and 300 random live edits); the panel and the FR/EN strings (`src/panels/*.test.ts`).

## 7. Findings and open points

### 7.1 The efficiency of the screw

At the design point the water-to-battery efficiency is **71.1 %** (screw 84.6 %). The losses of the 3.09 kW of water: gap leakage 155 W (5 %), outlet
90 W (3 %), friction and bearings 191 W (6 %), inlet 26 W (1 %), chain and belt 155 W (5 %), generator 263 W (9 %); electricity 2,196 W. K2 hoped 60 to 70 %: the model is a
point above, and 75 % river-to-wire is reported for good plants (Simmons & Lubitz 2024). With the plausible variants of §7.3 the screw ranges from 79 to 88 % and the whole chain from 66 to 74 %.

### 7.2 Which formulas were verified and which are the lab's own

| Verified in a source I read                                                                               | Estimate, written from general knowledge or by the lab                                    |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| bucket geometry and volume (Rorres 2000, eqs. 1–3, 9–18, table 1)                                         | ideal power `ρ g Q_b L sin β` and `L = H / sin β`                                         |
| r* = 0.5357, S = D_o, 22°, 3 threads                                                                      | pool drawdown `(1 − f) ΔZ`; overflow as the whole excess                                  |
| n = 50 / D^(2/3) (Nagel via Rorres, Dellinger), 56 / D^(2/3) (Brada)                                      | inlet loss, friction model, bearings, masses                                              |
| gap g = 0.0045 √D and Nagel's leakage law (Dellinger eqs. 2.29, 2.30)                                     | `C_LEAK = 1` and the reading of `l_w`, `l_e` as the tip under both levels / between them  |
| structure `Q = Q_b + Q_g + Q_o`, `P = P_s − P_L,f − P_L,o`, definition of f (Simmons & Lubitz 2024, 2022) | the wheel model; chooser flows and η; generator design; chain and belt efficiencies       |
| outlet loss N = 3 and ψ_L* ≈ 0.6 (Simmons & Lubitz 2024, eq. 3.11) — used as is, held beyond +0.4         | hydrology of the three sites; reserved flow 10 %; tailwater law; flood gate; minimum flow |
| efficiency of the curve against speed (Dellinger 2015; Brada), of plants (Lashofer; Simmons & Lubitz)     | speed alarm at 1.1 × rule; rack loss                                                      |

### 7.3 How much the answer depends on what no source gives

Efficiency of the machine at the design point (default 84.9 % in the scan, 84.6 % at the equilibrium), changing one assumption:

| Variant                       | machine              | note                                                                                                  |
| ----------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| friction × 0.5 / × 2          | 88.0 / 78.8 %        | the largest unknown of the model                                                                      |
| roughness 0.05 / 2 / 5 mm     | 86.9 / 82.2 / 79.2 % |                                                                                                       |
| outlet loss removed / doubled | 87.8 / 82.0 %        | Simmons & Lubitz's own uncertainty on a lab-sized screw is large                                      |
| inlet `K_in` 0 / × 4          | 85.8 / 82.4 %        |                                                                                                       |
| speed × 0.9 / × 1.1           | 77.6 / 83.5 %        | below the best speed the overflow is a cliff (§1.4)                                                   |
| gap leakage `C` 0.7 / 1.1     | 84.9 / 84.5 %        | at full buckets a leak is a swap against overflow: it moves the size of the screw, not its efficiency |

### 7.4 What is not retrieved, or not read

- **Not read (paywalled)**: Lubitz, Lyons & Simmons 2014 (the hydrostatic integration, the leakage model with fill), Kozyn & Lubitz 2017 (friction, outlet submersion),
  Nuernbergk & Rorres 2013 (the analytical inflow), Aigner 2008 and Songin & Lubitz 2019 (overflow). The ideal power, the friction, the inlet and the overflow of the lab are
  therefore its own simpler versions, not theirs. Rorres 2000, Simmons & Lubitz 2022 and 2024 (open access), and the thesis of Dellinger 2015 (chapter 2 read; chapters 3 to 5, which hold his
  semi-analytical model and his leakage model, not read in detail) were read. Muysken 1932 and Nagel 1968 are known only through those.
- **The efficiency against the slope is not retrieved.** The model gives 82.5 % at 15° and 85.4 % at 30° (a longer screw leaks less and rubs more); Dellinger reports, from the BOKU
  tests, an efficiency that rises as the slope falls, with 8 points between geometries. The friction estimate is the probable cause (halved, the trend is flat).
- **The overflow cliff** (§1.4) and the **flow of the field screws** (+9 % on average, −6 to +19 %; their flows were measured with difficulty, Simmons & Lubitz 2022) are the
  honest limits of the screw model. The power of the field screws could not be tested: their heads were not retrieved, and `P_exp` is close to ρ g Q L sin β (96 to 98 % for three
  of the four) which means the real heads exceeded `L sin β` by about 20 %. If the lab's `L = H / sin β` is conservative by that much, a real screw for 1.75 m would be 20 % shorter.
- **Fish**: the 30 to 60 rpm of K6 is "limited on purpose" for the fish; the lab uses the rule that fills the buckets and has no model of injury. The film is silent on the prototype's speed, which the
  rule would put at 92 rpm.
- **The wheel** has no equation in the sources, only ranges (§1.6); the model's flat-paddle undershot wheel reaches 44 %, below both sources.
- **The chooser flows** of the types other than the screw are estimates (a power window each), not read on a chart.
- **Not modelled**: unsteady filling of the buckets (the oscillation of the torque as buckets fill and empty), the grid-tied asynchronous generator of S2 (the lab has the battery
  of research §4), the cost of the machines, ice, sediment, the head lost in the canal, the stage–discharge curve of the river (a log law instead), the real losses of a cabled
  battery and inverter.

### 7.5 In `docs/research.md` (to correct or add; not edited)

- K12: "200 m: 10 to 25 L/s" is impossible for 30 kW (the water power of 10 L/s at 200 m is 19.6 kW; at η = 1 the minimum is 15.3 L/s); check the captions for "15 to 25" (S2 1:43:00).
- K3 and K5 give no flow. The 31 L/s and 180 L/s of §2 and §8 are **derived** from 200 W and 2 kW at 65 %: they make the "retrieval" of K3 and K5 circular. Say so, and keep them as the design points.
- §5.2: the relation D_O ≈ η·Q^(3/7) is the consequence of the speed rule n = 50 / D^(2/3) (Nagel 1968) and a bucket volume ∝ D³; the coefficient of the model is 1.80 (m, m³/s). The rule is **verified** (Rorres 2000 p. 73; Dellinger 2015
  eq. 2.19), as a pump rule; Brada's 56 is for a turbine.
- S11: Rorres 2000 (read in full, table 1 retrieved), Simmons & Lubitz 2022 and 2024 and Dellinger 2015 (thesis, open PDF) were read; Lubitz 2014, Kozyn & Lubitz 2017, Nuernbergk & Rorres 2013 are paywalled and were **not**
  read (§9). Add Simmons & Lubitz 2024 (open access, field data of four screws) as a source.
- §2 K6 / K7: the 30 to 60 rpm corresponds to screws of 0.8 to 2 m under the rule; the ½-scale prototype (about 0.4 m) is then allowed 92 rpm.
- §5.6: the reserved flow of 1/10 of the mean is not in a source I read.
- K14: the 10 % lost to rust was on a crossflow turbine; on the slow screw the same roughness costs 7 %.
- The names `K`-codes never appear in a visitor text; the sources are named in words (`src/panels/strings.test.ts`).

## 8. Known limits of the model

- **Pedagogical, not a design tool.** The shape of the curves (one best speed, overflow below, half-empty buckets above, a generator that holds the speed, the head that the tailwater eats) and the
  order of magnitude of the efficiency are what the model is for; the dimensions are derived, never the maker's, and the lab is not a construction plan.
- **Steady-state plant**: no unsteady filling of the buckets, no transient in the water; the only dynamics is the speed of the shaft.
- **One bucket shape for all fills**, from a quasi-static level in each bucket; no sloshing, no vortices at the inlet, no shock of the blades entering the water beyond one coefficient.
- **The generator** is quasi-static (no ripple, no inductance), wound by design; the battery is an ideal 48 V bus.
- **The year** is generic: three drawn years, not measured ones; one steady state per day.
- The lab must say, as the research does, that it is an educational model.

## 9. Sources read for the physics (addresses)

- Rorres, C. (2000), _The Turn of the Screw: Optimal Design of an Archimedes Screw_, J. Hydraulic Eng. 126(1), read in full: <https://math.nyu.edu/Archimedes/Screw/optimal/screw.pdf>
- Simmons, S. C. & Lubitz, W. D. (2024), _Modelling outlet power loss in Archimedes screw generators_, Flow 4, E32, open access, read in full: <https://doi.org/10.1017/flo.2024.29>
- Simmons, S. C. & Lubitz, W. D. (2022), _An updated model for gap leakage in Archimedes screw generators_, CSME Congress, read: <https://ualberta.scholaris.ca/bitstreams/83f81fa9-ea34-44ba-b06c-24f28f73859c/download>
- Dellinger, G. (2015), thesis, Université de Strasbourg, chapter 2 read (the state of the art): <https://publication-theses.unistra.fr/public/theses_doctorat/2015/Dellinger_Guilhem_2015_ED269.pdf>
- Encyclopaedia articles (S5, S6) re-read for the figures quoted: <https://en.wikipedia.org/wiki/Archimedes%27_screw>, <https://en.wikipedia.org/wiki/Water_wheel>
- Not read (paywalled): Lubitz, Lyons & Simmons 2014 (<https://doi.org/10.1061/(ASCE)HY.1943-7900.0000922>), Kozyn & Lubitz 2017 (Renewable Energy 108), Nuernbergk & Rorres 2013 (J. Hydraulic Eng. 139(2)).
