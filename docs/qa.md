# QA of the picture work: kit 0.5.1, the paper studio, retuned wood and concrete

- Date: 2026-11-01
- Commit reviewed: `a62e064` (local, not pushed; the working tree was clean before and after the review)
- Reviewer: an independent review; the lead built the lab. Nothing in the repo was touched except this file. `public/lab.json` says `building` and was not changed.
- Shots, scripts and measures (outside the repo): `R = /Users/magino/.cache/lab-review/mill-lab/2026-11-01-a62e064/`. Scripts in `R/scripts/`, before/after pairs in `R/cmp*/pair-*.png`, heat maps in `R/cmp-heat-*.png`.
- « Before » is the scratch copy at `d149974` with kit 0.4.0 (`localhost:5912`, checked: the same nine source files differ, nothing else). « After » is `a62e064` (`localhost:5911`).

## What was walked

| What                                                                                                  | Result                                                                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Kit walk, 1280 px, FR and EN, every part at three distances, every display mode, every mode           | 198 shots each, 0 console errors (`R/1280-fr`, `R/1280-en`)                          |
| Kit walk, 768 px and 390 px, FR and EN, worlds, display modes and every mode (`PARTS=0`)              | 57 shots each, 4 runs, 0 console errors (`R/768-*`, `R/390-*`)                       |
| Before/after pairs at the same camera on pinned clocks, plus single-build shots                       | 68 pairs (136 shots) and 32 single shots in `R/cmp` to `R/cmp12`                     |
| Flicker: the kit's `flicker.mjs` at 1280×720 and at 390×844 with deviceScaleFactor 2, both builds     | 4 reports (`R/flicker-new`, `R/flicker-old`, `R/flicker390-new`, `R/flicker390-old`) |
| Per-pixel heat maps (frames in which \|second difference\| exceeds 12, 24 and 48 levels), both builds | 32 maps, 1280×720 and 390×844 at DPR 2 (`R/heat-*`, `R/heat390-*`)                   |
| Shimmer attributed to what is drawn (id pass and depth pass at mid-move), site, both builds           | `R/attrib-*`                                                                         |
| Isolation runs (MSAA, tone curve, exposure, environment, anisotropy, bump, shadows)                   | `R/iso`, `R/isosite`, `R/isosite2`                                                   |
| Spoken guide, introduction and the site segment, FR and EN, real playback, no audio generated         | 295 and 301 samples, 0 errors, 0 failed requests (`R/narr-fr`, `R/narr-en`)          |
| Camera pivot: 14 parts far from the centre, two ways of pressing, both builds                         | `R/pivot-*`                                                                          |

## Gates

| Gate                   | Result                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | pass                                                                                                      |
| `npm run format:check` | pass                                                                                                      |
| `npm test`             | pass: 26 files, 702 tests, 0 todo                                                                         |
| `npm run build`        | pass (built to `R/gates/dist` so that the repo's `dist/` was not touched); 1.6 MB chunk warning as before |

The standard's shortfalls (`npm test`, `src/standard.ts`, `lab.json` = `building`): **none**. The run prints no todo and the two standard tests pass. What I counted on screen and on disk: 4 worlds, 47 parts (12 + 17 + 8 + 10), 34 assembly and 16 installation steps, 8 lessons, 8 sheets, 52 audio clips and a manifest in each language folder, README English first. The `released` status is the owner's call.

## The rules of `lab-quality.md`, one line each

| Rule                                         | Result                                                                                                                                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Moving parts attached to what drives them | ✓ chain, sprockets, belt, pulleys, generator at close range in the screw world; bounding boxes of the chain and both sprockets overlap; the tests pass. Not touched by this change                                            |
| 1. Nothing floats, nothing sinks             | ✓ measured: screw-world generator 2.9251 m on a platform top at 2.9251 m; generator-world skids 0.5 mm above the floor; site generator body 0.551 m on a bank at 0.550 m; the pool's water 4 mm into slab and wall on purpose |
| 1. Right direction, readable speed           | not checked in depth (not touched): the screw turns at 55 rpm, slow enough to read                                                                                                                                            |
| 1. A part sits where it acts                 | not checked (not touched)                                                                                                                                                                                                     |
| 1. The maker's dimensions before the model   | not checked (not touched)                                                                                                                                                                                                     |
| 2. One machine, the same everywhere          | ✓ the site's drive has the same parts as the screw world's (big and small sprocket, countershaft, generator, in the same order); the shared-part tests pass                                                                   |
| 2. Every system has a place to look at it    | ✓ the powerroom world, 10 parts                                                                                                                                                                                               |
| 2. A tool that teaches nothing is left out   | ✓ the site has no cut or x-ray                                                                                                                                                                                                |
| 3. Props read as what they are               | ✓ mill, powerhouse, house, weir, rack, willows, poplars at 3 distances (`R/sheets/fr-site-parts-*.png`, `R/cmp7/series-willow.png`); the willow is no jellyfish at 3, 6, 12, 24 and 48 m                                      |
| 3. The setting has had its polish pass       | partly: the ground is plainer between 6 and 45 m (D7), the paper floors lost their grid (D5)                                                                                                                                  |
| 3. Water follows the physics                 | ✓ for what this change touches: the pool's right wall and floor no longer fight (D1 for the one case that still does). The levels and flows were not touched                                                                  |
| 3. The device can be found in its setting    | ✓ clicking « Seuil » flies to 50 m from the weir; clicking « Chaîne » to 4.2 m (`R/click`)                                                                                                                                    |
| 3. A warm, full, stable picture              | **defects D1 to D5, D7**; no pop (spike at most 1.47, rule: under 2)                                                                                                                                                          |
| 4. The camera turns around what you look at  | ✓ 14 parts: pressing in empty space orbits the selected part in 12 of 14; the other 2 (trash rack, lower bearing) move the grab pivot to the surface that was hit, identically on 0.4.0 (`R/pivot-*`)                         |
| 4. Nothing crushed at any width              | ✓ at 1280, 768, 390 in FR and EN for the modes and the isolated part sheet; « labels: all » crowds at 390 (D11); the Specs tab of each part at 768 and 390 not checked                                                        |
| 4. The spoken guide is the way in            | ✓ first visit shows the invitation « Commencer par la visite guidée · 2:00 » / « Start with the guided tour · 2:00 » on a pulsing speaker button                                                                              |
| 5. As much detail as Pelton                  | ✓ standard met; explode, isolate, x-ray, cut (screw, generator, powerroom), flows                                                                                                                                             |
| 5. Title and description in both languages   | ✓ tagline FR/EN differ; the title « Mill Lab » is the same in both (a name, as « Pelton Lab »)                                                                                                                                |
| 5. README English first                      | ✓ (`## Français` at line 81)                                                                                                                                                                                                  |
| 6. The simulation is never tuned             | not checked (not touched)                                                                                                                                                                                                     |
| 6. Warnings said once, no research reference | ✓ none seen on the screens walked; `texts.test.ts` guards the rest                                                                                                                                                            |
| 7. The spoken guide                          | ✓ the mechanics only (below); the voice and the tone are the owner's to judge                                                                                                                                                 |
| 8. The review                                | this file                                                                                                                                                                                                                     |

## Verdict

**Not ready for the owner's checkpoint.** 0 blockers, 5 majors, 6 minors. The first two majors are mistakes of this change and small to fix; the other three need a decision.

## Defects

### Major

**D1. The contact-shadow plane z-fights with the paper floor from about 5 m.** New with this change (`src/three/detail.ts`, `contactShadow`, laid at `FLOOR_Y + 0.0003` in `screw/scene.ts` and `generator/scene.ts`). With the camera at 0.01 m near and 60 m far the depth buffer resolves about 0.2 mm at 6 m and 0.9 mm at 12 m, so a plane 0.3 mm above the floor loses the depth test in bands (24-bit estimate, `z² / (near × 2²⁴)`).

- Screw world, looking down at the outlet pool from 6 m (camera `[0.4, 6, 0.8]`, target `[0.4, 0.3, 0]`): horizontal stripes across the floor left of the pool and **through the pool's water at its open left end**, the very look the commit says it removed. Evidence: `R/cmp12/zfight-top.png` (as shipped | shadow lifted 2 mm | shadow hidden). Row-to-row banding 0.68 as shipped, 0.21 with the shadow lifted by 2 mm, 0.19 with it hidden. The same faint streaks show at the default overview, lower left of the pool: `R/cmp4/ov-pool-left.png` (top: shipped, bottom: shadow hidden).
- Closer than about 5 m the water is clean in six angles (`R/cmp3/angles-new.png`).
- Generator world, camera zoomed out to 12 m: the shadow is no soft contact but a **hard-edged rectangle**, 0 to −10 levels within 4 px, flat at −10 to −12, then back to 0 (`R/cmp12/zg-zg-12-diff.png`). At the default close overview (1.2 m) it is soft and under 2 levels.
- Why I think so: lifting the plane 2 mm removes the stripes at 6 m. Not isolated for the generator.
- Way out: lift the plane 2 mm or more, or give the material a `polygonOffset`, or paint the shadow into the floor texture. A raised `camera.near` is the kit's call.

**D2. The screw core and its section caps were not retuned and turn orange.** `screw/build.ts:227` (`woodMat(0xa9793f)`) and `:250` (the cap tint `0xa9793f`). Under Neutral at 1.2 with the paper environment the core reads `#f9b878` (hue 30°, saturation 52 %) from above and `#efac62` (hue 32°, 59 %) as a cut face, next to blades at `#f2ce90`. On 0.4.0 it was `#e8c88c`, the same family as the blades. It shows in the screw overview, exploded, isolated, x-ray and cut: the screw looks made of two woods, one of them orange. This is the orange the commit says was removed (`docs/picture.md`, « Wood »). Evidence: `R/cmp/pair-screw-overview.png`, `R/cmp8/pair-m-screw-exploded.png`, `R/cmp8/pair-m-screw-cut-close.png`, `R/cmp2/pair-sc-pool-top.png`. Way out: take `0xa9793f` to the same pale-pine scale as `COLOURS.woodA/B` (add a `woodCore` to `dims.ts`).

**D3. The site is shimmerier than on 0.4.0 at phone size.** 390×844, deviceScaleFactor 2, kit tool: orbit 1.619 → 2.151 % (+33 %), dolly 10.111 → 12.784 % (+26 %). The commit's figures are for 1280×720 at pixel ratio 1 only. Isolation on this build at 390: anisotropy 4 instead of 16 changes nothing (2.147 / 12.744), bump off changes nothing (2.151 / 12.778), MSAA off changes nothing (2.161 / 12.880), but ACES at exposure 1 gives 1.615 / 10.057, the 0.4.0 level. So the cause is the Neutral curve at exposure 1.2 on the meadow's texture (82 % of the phone's frame is terrain beyond 45 m, where the bump fade does nothing). At 1280 the same switch (ACES at 1) takes the shipped 2.636 / 9.639 to 2.593 / 9.052, and Neutral at exposure 1.0 to 2.365 / 8.750. Files: `site/scene.ts` (`userData.look`). The tool counts display-space levels, so a more contrasty curve inflates it; whether a phone user sees it I did not judge. Adaptive pixel ratio on a real phone was not tested (below).

**D4. The site is still the shimmeriest picture, and the foliage is where it sits.** Not a regression, not fixed (the commit says so). The numbers are in « Where the site's shimmer sits » below. Short form: at 1280 the orbit is 2.636 % against 1.0 % for the ram pump site (the figure in `lab-quality.md` §3); taking every tree, reed, tuft, flower and shrub out of the scene brings the orbit to 1.011 % and the dolly from 9.644 to 7.023 %. The willow crowns alone: 13.2 % of their pixels shimmer in a 5° orbit, 31.8 % in the dolly, 18.7 % of all the orbit's shimmer on 3.7 % of the screen, the same as on 0.4.0 (13.6 % and 31.5 %). Thin hanging strips, reed cards and the poplar and conifer silhouettes are what is left; MSAA does not smooth them (I did not check whether they are alpha-tested). Shadow edges are not the cause (all shadow casting off: 2.708 / 9.565).

**D5. The paper floors lost their grid.** Screw and generator worlds. In the generator overview the floor's high-pass contrast is 4.6 levels at most on 0.4.0 and 1.0 level now (`R/cmp/pair-gen-overview.png`, `R/cmp2/pair-sc-ground-low.png`, `R/cmp2/pair-sc-ground-mid.png`, `R/cmp10/pair-w-skid-low.png`). The floor is lit to `#fdf0dc` at exposure 1.2, where the Neutral curve flattens the 16 % darker grid lines of `paperFloor` (`common.ts`) to nothing. The floor is now a featureless cream field with no horizon cue at ground level, the opposite of « a view never feels empty ». It also removes the grid's own shimmer, so it is a trade, and `docs/picture.md` does not mention it. A decision for the lead and the owner: draw the grid darker (a stronger `a` in `paperFloor`) or accept it.

### Minor

**D6. The screw's contact shadow is centred on z = 0, the tower is not.** The tower and platform of the full-size layout span z −0.92 to 1.92 (slab −1.1 to 2.1); the shadow covers z ±1.67, so the tower's +z foot has none and its +x side has 1.4 m of it (`R/cmp11/both-side.png`). The shadow does follow the layout (checked on four presets, extents in x −3.12..8.95, −1.88..5.26, −2.05..6.68, −6.35..16.97), and it is soft at the default overview (0 to −7 levels over about 100 px). Fix: centre it on the footprint's z midpoint (`screw/scene.ts`, `frameLight`).

**D7. The meadow is plainer between 6 and 45 m.** The pebble and grain relief that the bump gave at 15 to 45 m is gone (`R/crop-old-site-dolly-groundNear.png` against `R/crop-new-site-dolly-groundNear.png`, 1:1 crops of frames 60, 62, 64). It is the price of the fade and it is what removed the crawl: the improvement at 1280 is entirely in the 15 to 45 m band (rate 9.67 → 3.27 % in the orbit). At the overview and at 3 m the ground still reads as grass (`R/cmp7/series-grass.png`).

**D8. The power room is +0.17 / +0.16 points above 0.4.0 in the kit's metric.** The mechanism is more than MSAA and the Neutral curve (table below). Where it sits: the thin louvres of the dump-load, the DIN rail and trunking, the door frame and the extinguisher (`R/cmp-heat-powerroom-orbit.png`); the dolly's value is mostly real edge motion of high-contrast cables and rails, as before.

**D9. The power-room plaster reads cream, not plaster-grey.** Wall `#efe5d3` (saturation 11 %), the lower-left wall `#f8eedc`, against `#dbd8d0` (5 %) on 0.4.0 (`R/cmp/room-overview-new.png`). The `#c4c8cc` base was meant to come out neutral. It does not read peach; it reads as limewash. The door is a proper brown.

**D10. The site's sky is bluer, with lavender-tinged clouds at 24 to 48 m** (`R/cmp7/series-willow.png`, bottom rows). A colour shift to judge by eye; no hour looks wrong (8, 12, 18.5, 21 h, `R/cmp6`).

**D11. Seen, not from this change.** A flat green card near the willows at 3 m (visible on both builds, `R/cmp7/series-willow.png`, top row); « labels: all » crowds at 390 px in the generator and screw worlds and at 1280 on the site (`R/sheets/390-en-generator.png`, `R/sheets/fr-site-views.png`).

## Measures, before and after

Kit `flicker.mjs`, 150 frames per move, pinned clocks, Metal. I reproduced the lead's figures exactly.

### 1280×720, pixel ratio 1

| World     | Move  | 0.4.0 shimmer | after shimmer | 0.4.0 spike | after spike |
| --------- | ----- | ------------: | ------------: | ----------: | ----------: |
| site      | orbit |       3.971 % |       2.636 % |        1.35 |        1.35 |
| site      | dolly |      13.696 % |       9.670 % |        1.28 |        1.29 |
| screw     | orbit |       1.166 % |       1.236 % |        1.16 |        1.22 |
| screw     | dolly |       1.865 % |       1.873 % |        1.23 |        1.18 |
| generator | orbit |       0.093 % |       0.106 % |        1.51 |        1.38 |
| generator | dolly |       0.462 % |       0.457 % |        1.46 |        1.47 |
| powerroom | orbit |       0.500 % |       0.672 % |        1.40 |        1.38 |
| powerroom | dolly |       3.208 % |       3.371 % |        1.45 |        1.41 |

### 390×844, pixel ratio 2 (a phone)

| World     | Move  | 0.4.0 shimmer | after shimmer |    change | 0.4.0 spike | after spike |
| --------- | ----- | ------------: | ------------: | --------: | ----------: | ----------: |
| site      | orbit |       1.619 % |       2.151 % | **+33 %** |        1.33 |        1.34 |
| site      | dolly |      10.111 % |      12.784 % | **+26 %** |        1.24 |        1.24 |
| screw     | orbit |       0.765 % |       0.895 % |     +17 % |        1.20 |        1.28 |
| screw     | dolly |       1.206 % |       1.193 % |      −1 % |        1.22 |        1.20 |
| generator | orbit |       0.088 % |       0.099 % |     +13 % |        1.42 |        1.46 |
| generator | dolly |       0.422 % |       0.417 % |      −1 % |        1.47 |        1.49 |
| powerroom | orbit |       0.197 % |       0.377 % |     +91 % |        1.42 |        1.40 |
| powerroom | dolly |       2.475 % |       3.145 % |     +27 % |        1.71 |        1.44 |

### By the size of the jump (1280×720, share of pixels with a second difference over 12 / 24 / 48 levels)

| World · move      | 0.4.0                  | after                 |
| ----------------- | ---------------------- | --------------------- |
| site · orbit      | 3.971 / 1.894 / 0.977  | 2.636 / 0.937 / 0.219 |
| site · dolly      | 13.686 / 6.463 / 2.338 | 9.644 / 3.096 / 0.697 |
| screw · orbit     | 1.166 / 0.827 / 0.506  | 1.236 / 0.832 / 0.404 |
| screw · dolly     | 1.866 / 1.333 / 0.829  | 1.873 / 1.319 / 0.654 |
| generator · orbit | 0.093 / 0.077 / 0.047  | 0.106 / 0.036 / 0.017 |
| generator · dolly | 0.462 / 0.373 / 0.253  | 0.458 / 0.245 / 0.128 |
| powerroom · orbit | 0.500 / 0.340 / 0.236  | 0.672 / 0.377 / 0.163 |
| powerroom · dolly | 3.208 / 2.346 / 1.445  | 3.371 / 2.059 / 1.018 |

By the strict count (48 levels, the hard crawling edges) **all eight went down**; the screw, generator and powerroom increases are in the 12-level column only.

## The lead's questions

### Where the site's shimmer sits, and whether it is visible by eye

Per-pixel map of the frames in which the second difference exceeds the threshold, then each shimmering pixel given to what is drawn there (an id pass at mid-move). Before / after pairs: `R/cmp-heat-site-orbit.png`, `R/cmp-heat-site-dolly.png`; strong jumps only: `R/heat48/site-orbit-thr48.png`. Numbers in `R/attrib-*.txt`.

| 1280×720, site, 12-level count | share of screen | orbit: rate in its pixels | orbit: share of all shimmer | dolly: rate | dolly: share |
| ------------------------------ | --------------: | ------------------------: | --------------------------: | ----------: | -----------: |
| terrain (after)                |            65 % |                    2.28 % |                        56 % |     11.06 % |         71 % |
| terrain (0.4.0)                |            64 % |                    4.12 % |                        66 % |     16.24 % |       72.5 % |
| terrain 15 to 45 m (after)     |            20 % |                    3.27 % |                        25 % |     19.92 % |         50 % |
| terrain 15 to 45 m (0.4.0)     |            20 % |                    9.67 % |                        49 % |     31.78 % |         56 % |
| terrain beyond 45 m (after)    |            44 % |                    1.84 % |                        31 % |      5.34 % |         21 % |
| terrain beyond 45 m (0.4.0)    |            43 % |                    1.54 % |                        17 % |      6.00 % |         16 % |
| willow leaves (after)          |           3.7 % |                   13.21 % |                      18.7 % |     31.80 % |        6.3 % |
| willow leaves (0.4.0)          |           3.4 % |                   13.64 % |                      11.8 % |     31.47 % |        4.2 % |

- The other drawn things, orbit / dolly share of all shimmer: oak, poplar and conifer leaves, reeds and shrubs together about 11 % / 9 %; the mill and the house about 5 % / 6 % (their rate in the dolly: 12.4 and 15 % of their pixels).
- The gain is the ground at 15 to 45 m, and only there. Beyond 45 m the ground is a little worse than on 0.4.0 (1.54 → 1.84 % in the orbit), which is the exposure.
- At the 48-level count the terrain still holds 49 % of the strong orbit jumps and the willows 20 %; the houses and conifers 11 %.
- Removing the whole vegetation takes the orbit to 1.011 % and the dolly to 7.023 %; removing the ground only to 2.112 and 4.708 %; removing the willows only to 1.964 and 8.548 %.
- With a still camera (wind, water and screw turning only) the site shimmers 0.485 % after and 0.488 % before: the willows are 40 % of it.
- Visible by eye? I judged from 1:1 crops of three consecutive frames and from the amplitudes, not from motion. The meadow's shimmer is small: in the orbit 69 % of its shimmering pixels move by 12 to 24 levels (rate 2.28 % at 12, 0.71 % at 24), the crops of frames 60, 62 and 64 look identical, and the difference at six times gain is a fine dot pattern (`R/crop-new-site-orbit-groundNear.png`). In the dolly the ground is 11 % of its pixels at 12 levels and 3.1 % at 24 (`R/crop-new-site-dolly-groundNear.png`): faint grain. **The willow crowns are the visible part**: the difference image shows coloured fringes of 40 levels and more on the strips (`R/crop-new-site-orbit-willowL.png`). The owner should look at the willows and at the dolly on a phone.
- What fixed what, on this build: anisotropy 4 vs 16, changes −0.005 / −0.04 points (the lead is right: nothing); bump off, −0.01 / −0.11 (the fade has already done its work: on 0.4.0 bump off alone gives 2.412 / 8.942 against 3.971 / 13.686); MSAA off, −0.10 / +0.10, but the strong jumps (48 levels) go from 0.219 to 0.877 and from 0.697 to 1.642: MSAA is what flattens the hard edges; exposure, see D3.

### The power room, +0.17 / +0.16 (1280×720, orbit / dolly, 12 / 48 levels)

| Setup on the shipped build                            | Orbit 12 / 48 | Dolly 12 / 48 |
| ----------------------------------------------------- | ------------: | ------------: |
| shipped: Neutral 1.2, paper environment, MSAA 4       | 0.672 / 0.163 | 3.371 / 1.018 |
| ACES at 1, room environment, MSAA 4                   | 0.484 / 0.101 | 3.015 / 0.736 |
| ACES at 1, room environment, MSAA 0 (the 0.4.0 setup) | 0.501 / 0.236 | 3.212 / 1.447 |
| Neutral 1.2, paper environment, MSAA 0                | 0.380 / 0.277 | 2.791 / 1.812 |
| Neutral 1.2, room environment, MSAA 4                 | 0.607 / 0.120 | 3.178 / 0.932 |

The third row reproduces the 0.4.0 figures (0.500 / 3.208), so the harness is sound. **You are right on the mechanism, wrong on how it is put.** MSAA alone does not raise the shimmer (0.501 → 0.484, 3.212 → 3.015), and Neutral at 1.2 with the paper environment alone does not either (0.380, 2.791). Together they do (0.672, 3.371): MSAA turns the hard stair-steps (over 48 levels: 0.277 → 0.163) into several smaller changes that cross the tool's 12-level threshold. The paper environment adds 0.065 / 0.19 on top of the room environment (0.607 / 3.178), and the Neutral curve at 1.2 adds 0.12 / 0.16 on top of ACES (0.484 → 0.607 with the same environment and MSAA). By the 48-level count the power room improved (0.236 → 0.163, 1.445 → 1.018). I would not spend effort on it.

### Colours that shifted under Neutral (against the before server, same camera)

| Thing                                  | Reads as                                                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Blade wood (`woodA/B`), skids          | ✓ pale pine, not orange. The generator's skids sit with the blades                                                                              |
| Screw core, wood section caps          | ✗ orange, D2                                                                                                                                    |
| Concrete piers, platform, pool, trough | ✓ grey-beige, darker than before (`#b3aca0` against `#d4cfc9`), which separates them better from the paper                                      |
| Pale blades against the cream floor    | the same low contrast as before (about 1.33 : 1 against 1.36 : 1); the machine is legible by its shadows and the orange core, not by the blades |
| Generator blue, terminal box, cable    | ✓ blue kept; the terminal box is cream instead of white                                                                                         |
| Power room: door, battery, cabling     | ✓ door brown, battery and cables as before; walls cream, D9                                                                                     |
| Site: stone, roofs, grass, earth       | ✓ mill, powerhouse, house, weir, rack read as before, a little more contrast; water slightly more saturated                                     |
| Site at 8, 12, 18.5, 21 h              | ✓ haze, night and the lit windows as before; the lamp halos at night are a little smaller                                                       |
| Pool and trapped water in cut          | ✓ the same teal as before, more saturated                                                                                                       |

### The screw world on cream paper

Legible at the overview, at close range, exploded, isolated, in x-ray and cut (`R/sheets/fr-screw-views.png`, `R/cmp8/`). The concrete is better separated than before; the pale blades against the cream floor are as before. D2 is the one thing that jumps out. The pool's stripes: the 4 mm sink works (the jagged blocks at the pool's right wall and floor seen on 0.4.0 in `R/cmp2/pair-sc-pool-front-high.png` are gone; the inlet basin, the trapped water and the cut faces are clean in `R/cmp2/pair-sc-inlet-*.png`, `pair-sc-pool-cut*.png`), and a different cause draws stripes back from about 5 m (D1).

### The contact shadows and the wear

- Screw: follows the layout (four presets measured), soft at the overview, D1 and D6 apart.
- Generator: skids sit on the floor (0.5 mm); the shadow is soft at 1.2 m and a hard rectangle at 12 m (D1).
- Wear on the generator is not smudgy: at 15 cm a faint mottling on the blue body, nothing visible from 30 cm (`R/cmp10/pair-w-15cm.png`).

### The owner's test set (`lab-quality.md` §8)

| Find                              | This lab                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Spring in the void                | no spring in this lab; the chain, belt and generator are attached at close range                        |
| Wheel turning backwards           | not touched; not checked                                                                                |
| Crushed specs                     | the isolated part sheet is clean at 768 and 390; the Specs tab of each part not checked at those widths |
| Untranslated title                | ✓ the tagline is translated; the title is a name                                                        |
| Fixed camera pivot                | ✓ (see rule 4)                                                                                          |
| Missing equipment room            | ✓ the powerroom world                                                                                   |
| Chain not attached                | ✓ at close range (`R/click/click-screw.png`, `R/cmp2/pair-sc-inlet-high.png`)                           |
| Jellyfish tree                    | ✓ the willows are unchanged in shape and read as willows at 3, 6, 12, 24, 48 m                          |
| Sunk generator                    | ✓ measured on the three worlds (rule 1); the change did not touch the geometry                          |
| A lab called finished with 2 of 4 | ✓ four worlds; `lab.json` still says `building`                                                         |

### The spoken guide (mechanics only; no audio generated)

Played with `--autoplay-policy=no-user-gesture-required`, the introduction (2:00) and the site segment in both languages: subtitles visible in every one of the 295 and 301 samples, no empty caption while playing, the label « Voix de synthèse » / « Synthetic voice » shown, the camera moves 19 to 24 times along each segment (the 3D follows), all clips end, 0 console errors, 0 failed requests, 0 responses over 399. Screens: `R/narr-fr/013-intro-42.5s.png`, `R/narr-en/010-intro-34.5s.png`. The voice, the tone and the synchronisation by ear are the owner's.

## Not checked

- A real phone, Safari, Firefox: the pixel ratio governor (adaptive quality) of kit 0.5.1 never acts in an automated browser, so the picture on a slow phone, with FXAA instead of MSAA and a lower pixel ratio, was not seen. D3 was measured with the fixed full picture at ratio 2.
- Motion by eye: every shimmer judgement above comes from frame crops and amplitudes, not from watching the move.
- The voice itself, the audio of the other 50 segments in each language, the guide in the three other worlds.
- The Specs, Maintenance and Design tabs of each part at 768 and 390; the plans (A3 sheets) and the lessons beyond their first screen.
- The wheel's turn and blur, the simulation numbers, the seasons (the site was shown at four hours of one day, 1 October).
- Whether D1 is the whole story for the generator's 12 m rectangle (only the 2 mm lift was tried, in the screw world).
- The lowest point of the site's `site-generator` group is 0.306 m, under the body (0.551 m) and the bank (0.55 m): a support inside the wall, not identified.

## After the review: what was fixed, and what was not (lead; the reviewer wrote this report for `a62e064`)

The fixes are in the commit that follows `a62e064`, checked by the lead (shots and figures below), not yet re-walked by the reviewer.

| Defect                                                    | Status                         | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 contact shadows z-fight from 5 m                       | **Fixed**                      | The plane is laid 2 mm (generator) and 6 mm (screw) over the floor, with a polygon offset, and is **not fogged**: the hard-edged patch at 12 m was the plane fogged to cream and multiplied over the floor, not the depth test. Stripe energy of the floor from above at 6 m: 0.930 with the shadow, 0.911 without (the reviewer had 0.68 against 0.19). At 11 m the generator's shadow is a soft ring (`detail.ts`). The shadow's edge rises over two fifths of its falloff instead of one fifth. |
| D2 screw core and caps orange                             | **Fixed**                      | `COLOURS.woodCore` (`#ad9872`) for the core tube and its section cap, in `screw/build.ts`: the same pale pine as the blades, a little darker.                                                                                                                                                                                                                                                                                                                                                      |
| D3 site shimmerier at phone size                          | **Fixed by dropping the look** | The site keeps the tone of 0.4.0 (no `userData.look`). 390 × 844 at pixel ratio 2, orbit / dolly: 0.4.0 1.619 / 10.111 %, Neutral 1.2 2.151 / 12.785 %, Neutral 1.0 1.876 / 11.602 %, AgX 0.592 / 4.290 % (a grey, hazy picture), now 1.614 / 10.063 %. At 1280: 2.594 / 9.094 % (Neutral 1.2: 2.636 / 9.670).                                                                                                                                                                                     |
| D4 the site is still the shimmeriest                      | **Open**                       | A distance melt of the willows' strands into the colour of the crown was tried: 2.740 / 9.104 % at 1280, no gain, dropped. The shimmer of the crowns is their silhouette, not sub-pixel colour.                                                                                                                                                                                                                                                                                                    |
| D5 paper floors lost their grid                           | **For the owner**              | Not changed; the ram pump's floor is the same.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D6 the screw's contact shadow is not centred on the tower | **Fixed**                      | Centred on the footprint of the pool and of the platform (`screw/scene.ts`, `frameLight`).                                                                                                                                                                                                                                                                                                                                                                                                         |
| D7 the meadow is plainer between 6 and 45 m               | **Accepted**                   | It is the price of the bump fade, and what removed the crawl.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D8 power room +0.17 / +0.16                               | **Open**                       | MSAA with the Neutral curve and the paper environment together (the reviewer's isolation: MSAA alone 0.484, Neutral alone 0.380, both 0.672); by the 48-level count all eight world / move pairs went down.                                                                                                                                                                                                                                                                                        |
| D9 power-room plaster reads cream                         | **Open**                       | Reads as limewash; the door is a proper brown.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D10 the site's sky is bluer                               | **For the owner**              | A colour shift to judge by eye.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D11                                                       | **Not touched**                | Seen on both builds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Measurements after the fixes (`flicker.mjs`, 1280 × 720, 150 frames a move, Metal)

| World     | Move  |    0.4.0 | `a62e064` |     now |
| --------- | ----- | -------: | --------: | ------: |
| site      | orbit |  3.971 % |   2.636 % | 2.594 % |
| site      | dolly | 13.696 % |   9.670 % | 9.094 % |
| screw     | orbit |  1.166 % |   1.236 % | 1.219 % |
| screw     | dolly |  1.865 % |   1.873 % | 1.860 % |
| generator | orbit |  0.093 % |   0.106 % | 0.106 % |
| generator | dolly |  0.462 % |   0.457 % | 0.458 % |
| powerroom | orbit |  0.500 % |   0.672 % | 0.672 % |
| powerroom | dolly |  3.208 % |   3.371 % | 3.371 % |

No spike over 1.5. `npm test`: 702 tests pass; `npm run format:check` passes.

## Re-check of the fixes (`3515def`)

- Date: 2026-11-02. Reviewer: the same independent reviewer as above, narrow re-check, not a new full walk. Code and data untouched, nothing committed.
- Servers: AFTER `3515def` (`localhost:5931`), BEFORE kit 0.4.0 (`localhost:5932`). The probe confirms the state: the site has no `userData.look` and draws with ACES at exposure 1 (tone mapping 4); screw, generator and power room keep the paper studio (Neutral, 1.2, paper environment); both contact shadows have `fog: false`, `polygonOffset: true`, factor −2.
- Files: `R = /Users/magino/.cache/lab-review/mill-lab/2026-11-01-a62e064/recheck/` (scripts in `../scripts/`: `d1pair.mjs`, `cmpshots.mjs`, `flicker-dpr.mjs`, `contactfit.mjs`).
- Gates on `3515def`: `npm run typecheck`, `npm run format:check`, `npm test` (26 files, 702 tests) and `npm run build` all pass.
- Console: 0 errors in every run (narrow walk at 1280 FR with the modes, 57 shots; at 390 EN, 25 shots; every before/after run).

### Verdict

**The fixes hold. Ready for the owner's checkpoint, with the open items below listed and not hidden.** No new blocker, no new major, 3 new minors (D12 to D14), one of them pre-existing. The majors that remain are the ones you already listed: D4 (open) and D5 (for the owner). D8 is open and larger at phone size than the 1280 figure suggests (below).

### What holds

| Fix                                      | Result               | What I measured                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 screw: stripes from above at 6 m      | ✓ fixed              | Same camera as the first review, the floor and the pool's open left end: row-to-row banding **0.68 → 0.21** with the shadow on (0.19 with it hidden, 0.19 hidden on `a62e064`). High-pass p99 12.95 → 7.02 (5.98 hidden). `R/d1/pool-left-6m.png` (shipped then / fixed on / fixed off). No stripe at 4, 6, 8, 10, 12, 16 m from above, in two oblique views and at the overview (`R/d1/screw-shadow-sheet.png`); the high-pass energy of the shadow's own contribution is 0.13 to 0.32 (a smooth shadow) at every distance. |
| D1 generator: the hard rectangle at 12 m | ✓ your claim is true | The fogged plane was the cause. I switched the fog back on in the page (`R/d1fog/`): at 12 m the shadow is a flat −10 to −12 levels over the whole patch with a hard edge (0 → −5 → −10 within 4 px), as in the first review; with `fog: false` it is a ring that rises over about 20 px. A residual is D12 below.                                                                                                                                                                                                           |
| D2 screw core and caps                   | ✓ fixed              | Exploded, the core tube is `#fadcb0` (hue 36°, saturation 30 %) against `#ead09f` (39°, 32 %) on 0.4.0, and the orange `#f9b878` (30°, 52 %) on `a62e064`. In the cut, the core's section and the shaft's wall read pine, as the blades do: `R/d2/pair-d2-exploded.png`, `R/d2/pair-d2-cut-close.png`, and the overview, isolated, x-ray, top view and the inlet cut in the same folder.                                                                                                                                     |
| D3 site at phone size                    | ✓ fixed              | Kit tool, 390×844, pixel ratio 2, orbit / dolly: 0.4.0 **1.619 / 10.111 %**, now **1.614 / 10.063 %** (`R/flicker390-new`, `R/flicker390-old`). Spikes 1.33 and 1.24 (0.4.0: the same). At 1280×720: **2.594 / 9.094 %**, spikes 1.34 and 1.30. Your figures reproduce to the third decimal.                                                                                                                                                                                                                                 |
| D3 site tone by eye                      | ✓ identical to 0.4.0 | Four hours (8, 12, 18.5, 21 h, `R/hours/pair-*.png`) and the mill at three hours: the mean colour of the frame is within 1 level of 0.4.0 in every channel (for example the 12 h overview: mean RGB 135.8 / 155.2 / 99.0 against 136.5 / 155.9 / 99.3); saturation 0.414 against 0.414. So the site is exactly as warm as before: **no warmer** (the paper studio's warming is gone from it), no worse. The bluer sky of D10 is gone with it. The haze, the night and the lit windows are as before.                         |
| D6 screw shadow centred                  | ✓ fixed              | The shadow's z centre is now 0.475 m for the full-size layout (platform z −1.1 to 2.1, pool ±1.3): its footprint spans −1.3 to 2.25 m and its falloff reaches 2.68 m, so the tower's +z foot has a shadow (`R/d1/both-tower.png`). Four presets measured (`contactfit.mjs`): the z extents follow the layout, −1.73..2.68 (full-size), −1.11..1.68 (prototype), −1.12..1.70 (brook), −3.46..5.49 (river), and the x extents are unchanged.                                                                                   |
| Water: pool, outlet, cut                 | ✓ holds              | 22 views on `3515def` (`R/water/water-sheet.png`): the pool from above, from the left end, both walls, low and high, behind, and in cut (wide and low), the inlet basin and its cut, the trapped water. No stripe, no gap, no water edge floating, no jagged block at the right wall or the floor. The banding of the first review (0.68) is back at the floor level (0.21).                                                                                                                                                 |
| Four worlds, 1280 FR and 390 EN          | ✓                    | Overview, cut, x-ray, exploded (and isolated at 390): nothing broke (`R/walk/1280-fr-worlds.png`, `R/walk/390-en-worlds.png`). The screw's cut is clean: the pool in section, the core in pine, the wooden caps with the blades (`R/d2/pair-d2-cut-close.png`).                                                                                                                                                                                                                                                              |

### What does not hold, and what is new

| #       | Severity | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D12** | minor    | **A faint dark ring around the generator at 11 to 12 m.** The shadow is no longer a hard rectangle, but it stays at full strength while the generator fades into the fog (fog 5 to 14 m): at 12 m (the world's maximum distance) the ring peaks at −16 to −31 levels around skids that are almost invisible, and its high-pass p99 is 10 (at 3 m 0.5, at 6 m 0.8, at 9 m 2.4). `R/d1/gen-shadow-12.png`, `R/d1fog/`. It is the same fog trade as the fix: unfogged is soft, fogged is a patch. A cheap way: fade the plane's alpha with distance in the shader, or lower its strength; I did not try.                                                                                                                                     |
| **D13** | minor    | **The site's screw blades are washed out under ACES.** `COLOURS.woodA/B` (`#c9b790`, `#bea980`) were retuned for the paper studio's Neutral curve and `site/parts.ts:586` still uses them, but the site is back to ACES at 1: the blades measure `#b5a783` (hue 43°, saturation 28 %) against `#b28a47` (38°, 60 %) on 0.4.0, a grey-beige that sits close to the stone and the water, where the screw world has a warm pine. Visible when the water chamber is selected or the drive is looked at (`R/sitescrew/pair-ss-drive-near.png`, `pair-ss-chamber-close.png`). A cost of dropping the site's look; the commit does not mention it. A `woodSite` pair (the old `0xc79a5b` / `0xb98a4a`) used by `site/parts.ts` would restore it. |
| **D14** | minor    | **Pre-existing, found now: the screw world's machine disappears beyond about 60 m.** The zoom-out limit of the world is 90 m but the camera's far plane is 60 m (`near 0.01, far 60`), so at 70 m and 88 m only the floor's disc is left. Identical on 0.4.0 (`R/far/far-old-vs-new.png`). The kit sets `far` for the world; the lab's `maxDistance` for the screw world is what to lower (about 55 m), or the kit raises `far` there.                                                                                                                                                                                                                                                                                                    |

Also seen, not new: with the contact shadow unfogged, nothing shows at the screw world's far distances (0 pixels changed at 70 and 88 m, where everything is clipped; at 50 m a faint 2 565-pixel patch, minimum −29 levels, around a machine that is itself nearly fogged: `R/far/far-sheet.png`). The same trade as D12, less visible.

### What the fixes did not touch, said again

- **D4** (the site's shimmer, willows): open. At 1280 the site is 2.594 / 9.094 % against 3.971 / 13.696 % on 0.4.0, all of the gain coming from the ground at 15 to 45 m. **At phone size it is at the 0.4.0 level and no better** (1.614 / 10.063 against 1.619 / 10.111): there the ground is beyond 45 m and the bump fade does nothing.
- **D8** (the power room): unchanged, 0.672 / 3.371 at 1280 as before. At 390×844, pixel ratio 2 it is **0.377 / 3.145 % against 0.197 / 2.475 % on 0.4.0 (+91 % and +27 %)**, a larger relative step than at 1280 (+34 % and +5 %). The absolute orbit value is small; the dolly's 3.1 % is real edge motion of rails and cables.
- Screw and generator at 390: screw 0.887 / 1.184 % (0.4.0: 0.765 / 1.206), generator 0.099 / 0.418 % (0.088 / 0.422). All spikes at most 1.50 (the generator's phone dolly) and 1.47 at 1280.
- **D5** (the floors' grid): unchanged, for the owner. **D9, D10** as you listed (D10 is gone for the site, because its tone is 0.4.0's). **D7** accepted.

### Figures, `3515def` against 0.4.0 (kit tool, 150 frames, Metal)

| World · move       | 1280×720: 0.4.0 | 1280×720: now | 390×844 @2: 0.4.0 | 390×844 @2: now |
| ------------------ | --------------: | ------------: | ----------------: | --------------: |
| site · orbit       |         3.971 % |       2.594 % |           1.619 % |         1.614 % |
| site · dolly       |        13.696 % |       9.094 % |          10.111 % |        10.063 % |
| screw · orbit      |         1.166 % |       1.219 % |           0.765 % |         0.887 % |
| screw · dolly      |         1.865 % |       1.860 % |           1.206 % |         1.184 % |
| generator · orbit  |         0.093 % |       0.106 % |           0.088 % |         0.099 % |
| generator · dolly  |         0.462 % |       0.458 % |           0.422 % |         0.418 % |
| power room · orbit |         0.500 % |       0.672 % |           0.197 % |         0.377 % |
| power room · dolly |         3.208 % |       3.371 % |           2.475 % |         3.145 % |

### Not checked in this re-check

- A real phone and the adaptive pixel ratio (never acts in an automated browser), Safari, Firefox.
- Motion by eye; the shadows and shimmer were judged from frames and amplitudes.
- The wear's tighter fade (`dtKeep`) beyond the unchanged generator figures; the willow-strand melt and AgX were not looked at (the lead says they are out).
- The spoken guide (code not touched), the other modes and widths (768), the part sheets: the first report's results stand for them.

## After the re-check (lead)

| Defect                                                   | Status            | What was done                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D12 faint dark ring around the generator at 11 to 12 m   | **Open**          | The shadow is unfogged, so it keeps its strength while the generator fades into the fog. A fade of the shadow with the camera's distance in its shader would fix it (not done: the same `detail.ts` is in four labs; it is a change for the kit).        |
| D13 the site's screw blades washed out under ACES        | **Fixed**         | `COLOURS.siteWoodA`, `siteWoodB` (`#c79a5b`, `#b98a4a`, kit 0.4.0's pair) in `site/parts.ts`. Same camera as the reviewer's, the near still of the screw now matches kit 0.4.0's colours (`npm test` 702 pass, `format:check` passes, typecheck passes). |
| D14 the screw world's machine vanishes beyond about 60 m | **For the owner** | Pre-existing, identical on 0.4.0: the zoom-out limit is 90 m and the camera's far plane 60 m. Lowering the world's `maxDistance` to about 55 m, or raising `far` in the kit, would close it. Not changed.                                                |

## Kit 0.6.0: the frame walked again (2026-11-03)

Move only, `6fe5f1e` to `7061bf7`: the kit, the favicon, the font lines, `brand.icon`, the panel's colours. `src/sim`, `src/data`, `src/three`, `src/drawings`, `narration`, `public/audio` and `public/lab.json` are untouched, and the lab stays `building`. Walked by a session that did not build this lab. Shots and scripts: `K` = `/Users/magino/.cache/lab-review/mill-lab/kit-060/` (outside the repo).

| What                                                                                                                                                                                                                                                                | Result                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1280, 768, 390 px, FR and EN, light and dark, production build, Metal: 4 worlds, a part and its 4 tabs, both guides and a step on, the simulation and its charts, theme toggle, plans, lessons, parts, Sources, the spoken guide's bar (`K/after/`, 30 shots a run) | 12 runs: 0 console errors, 0 failed requests, 0 requests to another host, 0 horizontal overflow. The only warning is the walk's own (`getImageData`, reading the charts). The audio's clock moves, the manifest's first clip answers 206, captions and the « Voix de synthèse » label show                                                                 |
| The 3D, same camera, kit 0.5.1 against 0.6.0, under the films' stylesheet and on their pinned clocks (`K/canvas/`)                                                                                                                                                  | Home of the 4 worlds, exploded, x-ray and cut of the 3 paper worlds, 13 pictures at 1280 × 720 and at 390 × 844 at ratio 2: **0 pixels differ**, the cameras the same. Two runs of one build: 0 as well, so the clocks hold still what animates. Dark against light: 0                                                                                     |
| The way back, FR and EN                                                                                                                                                                                                                                             | Mark `labs.onigam.io/` and `/en/`, « Tous les labs » `#labs`, the block at the end of Sources with the privacy page. The links' landing pages were not opened                                                                                                                                                                                              |
| The theme                                                                                                                                                                                                                                                           | Follows the system, the toggle saves under `onigam-labs:theme`, its label follows. Toggled in front of the chooser, all the charts repaint at once: the same colours, to the pixel count, as a page opened in that theme                                                                                                                                   |
| Against the live site at 0.5.1 (`K/live-before/`, 1280 FR, 768 FR, 390 EN; `K/before-768en/`)                                                                                                                                                                       | Same layout, same figures. Every chart draws the same number of pixels of each colour as on 0.5.1, at all three widths, so the curves have not moved; only the gold's value changes. Better: the four tabs on one row at 1280 and in English at 768                                                                                                        |
| The colours this lab writes, on the kit's card (`src/panels/model.test.ts`)                                                                                                                                                                                         | Before, under 3:1: in light the gold 2.5:1; in dark the brown 2.0:1, the red 2.6:1, the slate 2.6:1, the violet of the bar and the swatches 2.7:1. Now 3.4 to 7.0:1 in light, 4.8 to 7.6:1 in dark. In the shots the card reads `#f7f8f5` and `#142939` at 1280 and 768 (the panel is 94 % opaque), so the gold is 3.41:1 there. No text colour is written |

Noted, none blocking; every one is the same on 0.5.1 or asked by the changelog:

- « Encombrement » stays unmarked: `envelopeMark` is not taken, for the reason of Piggott's note. This lab tags in words on a part's sheet, and only the A3 sheets carry a legend of their marks: nothing on screen would say what a star after the envelope means, and the size is that of the 3D model, not a source's. For the owner, with a word for the notice.
- At 768 and in French, the four tabs take two rows, as the changelog says up to 1100 px.
- At 768 in English the guide's bar cuts « Presentation of th… », as on 0.5.1.
- On a first visit at 390, the invitation covers part of the world switch until it is closed by its cross, as on 0.5.1.
- At 390, with a part of the screw world selected, the label of the trough is cut at the left edge, under the toolbar (« ROUGH »), as on 0.5.1.
- Second step of the assembly guide: around the bearing, the rest of the machine draws as a dense blue tangle of lines, as on 0.5.1. Seen, not looked into: for the reviewer.
- The drive sprocket's « Encombrement » reads 199 × 444 × 468 mm in some runs on 0.6.0 and 200 in others; the one shot of 0.5.1 read here says 200. Probably the box of a part that turns, not looked into.
- The paper worlds stay bright in a dark frame, as the kit says they do.

Not checked: real phones, Safari and Firefox; every part's sheet (one part, its 4 tabs); the guides beyond their second step; the lessons beyond one; the spoken guide beyond the start of the introduction; the links' landing pages. By eye, only the screenshots: no motion, and the voice is the owner's to judge.

**Live, `2189f54`, https://mill-lab.onigam.io/ (`K/live-after/`)**: CI green, Vercel's status a success, `index.html`, the script and the stylesheet are those of the local build, byte for byte. 6 runs (1280, 768, 390, each in both languages, each language in a theme): 0 console errors, 0 failed requests, 0 requests to another host, so none to Google; no font line in the page, `favicon.svg` is the showcase's byte for byte, `lab.json` says `building`. The spoken guide: both manifests are the repo's, 52 segments each (1 307.2 s in French, 1 392.24 s in English), all 104 clips answer 200 at the repo's size; the introduction played in Chrome in both languages, its clock moving, its captions showing. Clips other than the introduction were not played on the live site.
