# The water of the 3D worlds

The first version drew the water as flat translucent planes with a scrolling streak texture, a falling sheet at the weir, translucent boxes for the pockets of the screw and a few flow
dots. This note describes what replaced it (the polish wave of 2026-10-30, water role): what the water is made of, what each effect reads, and which effects are **physical** (a number
of the simulation or of the site, or a law of hydraulics applied to them) and which are **decorative** (a bounded picture of a physical number: the direction is right, the amount is a
choice). Nothing here is a measurement; `WATER_FX` at the end of `src/three/dims.ts` holds the art-direction constants, every one an `estimate`.

## What it is made of

| Piece                              | File                               | What it does                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| noise texture                      | `src/three/water/noise.ts`         | one procedural 256² RGBA8 field (341 KB with its mips), tileable, seeded, generated at start-up in about 20 ms: slopes of a fractal height field (R, G), bubbles (B), fine detail (A). No file, no network                                                                     |
| water material                     | `src/three/water/surface.ts`       | a `MeshStandardMaterial` patched through `onBeforeCompile` (the lighting, shadows, fog, clipping and tone mapping stay three's); four kinds: `surface`, `volume`, `cap`, `fall`; a handle per material to set its flow, depth, foam, sources, waves and meniscus               |
| shader code                        | `src/three/water/glsl.ts`          | the code that decides albedo, opacity, roughness and normal                                                                                                                                                                                                                    |
| bodies of water                    | `src/three/water/body.ts`          | a rectangle of the plan cut into a grid (finer where something happens), with a **foam channel** (`aFoam`, four masks) and an opacity/bed channel (`aInfo`) painted in vertex attributes; the level, the step across the rack and the advection are written without allocation |
| nappe                              | `src/three/water/nappe.ts`         | the sheet that leaves a crest and falls free: one mesh holds several ribbons (weir spans, notch, cascades, inlet of the screw); trajectory, thickness and aeration from the head and the unit discharge                                                                        |
| spray                              | `src/three/water/spray.ts`         | a fixed ring of at most 600 drops per world (`THREE.Points`, a patched `PointsMaterial`), emitters whose rate the world sets every frame from the state; nothing allocated after the build                                                                                     |
| the look as functions of the state | `src/three/water/look.ts`          | pure functions (weir law, speeds, murk, low water, foam gains), tested without a renderer                                                                                                                                                                                      |
| the kit of a world                 | `src/three/water/kit.ts`           | the noise texture, the uniforms shared by the materials of a world (clock, murk), the four material factories                                                                                                                                                                  |
| site: builders, `SiteWaterFx`      | `site/parts.ts`, `site/water.ts`   | the bodies of the river, canal, tailrace, pools of the fish pass; the class that gives them the state every frame                                                                                                                                                              |
| screw: `Prism`, `ScrewWaterFx`     | `screw/water.ts`, `screw/build.ts` | the pools (their meniscus follows the level), the pockets, the sheet over the headwall; the class for the meniscus, the splash, the wake, the leak, the overflow                                                                                                               |

### The material

- **Ripples that ride the flow.** Three taps of the noise texture at 5, 2.2 and 1.3 m per tile, advected along the direction of the body (`uDir`) at its surface speed (`uSpeed`): each layer's
  phase moves by `d / (tile × stretch)` for `d` metres of flow, the pattern is stretched along the flow as the water gets faster, and the slope scale (`uAmp`) is set by the roughness of the
  body. The first layer's phase is also `map.offset.x` of the material, in tiles of 5 m, as in the first version (a test reads it).
- **Depth tint.** `T = exp(-k · depth)`; the shallow colour mixes into the deep one as `1 - T`, and the bed shows through with `T`. The depth is the real one (`level - bed` of `SITE`),
  reduced at the banks (`aInfo.y`) and, at low water, by the apparent depth. The colour of a flood (`uMurk`) is brown and absorbs faster.
- **Fresnel.** `F = 0.02 + 0.98 (1 - cos θ)^5` on the rippled normal raises the opacity at grazing angles; the reflection of the sky is three's own image-based light from
  `scene.environment` (no planar reflection, no extra pass). Soft banks: the opacity falls to a third at the water's edge (`aInfo.x`).
- **Foam.** The painted channels (`aFoam`, each with its own gain uniform) plus the lines along walls and the radial sources give a coverage `fm`; the pattern (bubbles and fine detail,
  stretched along the flow, moving with it) is thresholded by `fm`. Foam is white, matte, flatter, and a little cream in a flood.
- **Standing waves.** The vertices of the river below the weir are lifted in the vertex shader (`uWave`: amplitude, wavelength, decay, x of the toe), the slope is added to the normal.
- **Radial sources** (`uSrcA`, `uSrcB`): ripples that leave a point and fade, and foam round it (the outlet of the screw, the splash of the inlet).
- **Volume and cap.** A pocket or a pool keeps its own colour and the kit's opacity; its free surface (faces that look up) gains the ripples and the Fresnel reflection. The **meniscus**
  is the thin bright line where the free surface meets a wall: `uLevel` is the line `a x + b y = c` of the free surface in the frame of the mesh, and the line is drawn where a face that does
  not look up crosses it, with a constant width on the screen (`fwidth`). For the pockets the line is `x' sin β + y' cos β = h`, which is a horizontal line of the world whatever the angle of
  the screw (a test checks it). The section's polygons use the same line, and shade from light at the free surface to deep below it.
- **Kit compatibility.** The materials are `MeshStandardMaterial`s with `transparent`, `opacity`, `side` and `clippingPlanes` honoured. The kit's ghost, wire and hidden modes swap the
  mesh's material for its own and back to `userData.solidMaterial`, which works on every water mesh because they are all registered in their part before the registry collects them; the
  section sets `clippingPlanes` and `side` on the materials it clips (`CutKit.clip`, the spray included). One shader program per kind, shared by all the materials of the kind.

## The site

| Body                                                | What is drawn                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pond and river above the weir (`river-up`, `-near`) | a grid sheet at the pond level; ripples at the surface speed of the river; depth tint from the real bed; soft banks                                                                                                                                                                            |
| weir (`weir-fall`)                                  | two ribbons (the two spans of the free crest): a film over the crest, the curved nappe, aerated streaks; thickness and speed from the head over the crest                                                                                                                                      |
| notch (`notch-fall`)                                | a small, clean jet                                                                                                                                                                                                                                                                             |
| river below the weir (`river-down`, `-near`)        | the plunge pool (foam at the toe, channel 0), a trail of foam that thins out (1), the plunge of the notch (2), the outlet of the pass (3); standing waves; spray from the landing line                                                                                                         |
| fish pass (`pass-pool-i`, `pass-cascades`)          | five pools that step from just under the pond to 0.34 m over the tailwater (and close up when the pass is drowned), a cascade over each sill (one mesh for the six), foam where each cascade plunges                                                                                           |
| canal (`canal-mouth`, `-above-gate`, `-below-gate`) | the level step across the rack as a ramp of 0.9 m at the east end of the sheet above the gate (no gap at the bars), foam behind the bars that grows with the clogging, a sheet below the gate that falls to the dead level and stills when the gate is closed, foam at the gate while it moves |
| tailrace (`tail-run`, `tail-turn`)                  | the current of the outflow at the speed of the canal, ripples radiating from the lower end of the screw that die out down the race, a line of foam on the sill at the turn                                                                                                                     |
| chamber                                             | the pool and the basin (volumes) ripple at the speed of the water through them, with the wake of the screw; the pockets (meniscus)                                                                                                                                                             |

## The screw

- **Pockets**: clean translucent volumes (the geometry is exact: the free surface is at the level of the bucket, horizontal in the world), a bright meniscus line, the Fresnel reflection on the
  free surface; their section (`pocket-sections`) is shaded from light to deep and has the same line. The pocket material is biased a few depth units towards the eye so that it does not
  cut through the faceted blades (the dither that the first version showed in the section is gone).
- **Inlet**: a sheet that runs over the headwall and falls into the basin; thickness and splash in proportion to `flow`. Splash: a radial source on the basin and a spray emitter.
- **Outlet**: ripples and foam leave the lower end of the flights, where the pockets empty into the pool, a second source downstream makes the wake; spray at the surface.
- **Leak**: short thin streams along the blade tips at the bottom of the trough, at a rate proportional to `qGap / flow` (visible in the section, where the front half is cut away).
- **Overflow**: drops spilled over the blade tips at the inlet, at a rate proportional to `qOver / flow`.

## What is physical, what is decorative

| Effect                                                                                                               | Reads                                                                  | Status                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| level of the pond, head over the crest                                                                               | `bypassFlow`, `Q = 1.7 w H^1.5` (`SITE.weirCoeff`, the free crest `w`) | **physical** (unchanged)                                                                                                    |
| nappe: critical depth `2/3 H`, speed at the lip `√(g y_c)`, landing `v0 √(2 d / g)` from the face, thickness `q / v` | `bypassFlow`, `SITE`, the level of the tailwater                       | **physical**: the free-fall hydraulics applied to the site's numbers                                                        |
| air in the sheet (white streaks)                                                                                     | `q`, the fall                                                          | decorative                                                                                                                  |
| spray at the weir, the notch                                                                                         | `bypassFlow × width of the span`, `reservedFlow`                       | the **amount** is proportional to the flow; where the drops go is decorative                                                |
| foam at the toe, trail, standing waves                                                                               | `toeFoam(q)`, `waveAmplitude(q)`                                       | decorative mapping of the unit discharge, capped; wavelength and decay are estimates                                        |
| surface speed of the canal and the tailrace                                                                          | `CANAL_SPEED × flow / design flow` (`src/sim/machine.ts`)              | **physical**: the simulation's own assumption                                                                               |
| surface speed of the river                                                                                           | `0.3 + 1.1 √riverFlow`                                                 | decorative (as in the first version: the real mean speed of a wide pond is a few centimetres a second, which does not read) |
| surface speed of the pools of the pass and of the basins                                                             | constants                                                              | decorative                                                                                                                  |
| level step across the rack                                                                                           | `rackLoss − clean loss`, capped at `SITE.rackDropMax` (1 m)            | **physical**, capped for the picture                                                                                        |
| foam behind the bars                                                                                                 | `rackLoss`                                                             | decorative mapping                                                                                                          |
| closed gate: the canal drains, the water stills                                                                      | `stopped`, `flow = 0`, `SITE.deadCanalY`                               | **physical** (the levels and the speed are the state's)                                                                     |
| depth of the water and tint                                                                                          | level minus bed (`SITE`)                                               | the depth is **physical**; the banks' shelving, the colours and the absorption are decorative                               |
| flood: browner, faster, rougher, foamier                                                                             | `tailRise`, `stopped`, `riverFlow`, `bypassFlow`                       | the levels are **physical**; the murk, ripple scale and foam are decorative mappings of the same numbers                    |
| low water: clearer, the bed shows                                                                                    | `usableFlow / riverFlow`, `stopped`                                    | decorative (the level does not drop below the crest-fixed pond: the apparent depth does)                                    |
| levels of the pools of the pass                                                                                      | pond and tail                                                          | spaced between them: decorative; the cascade's thickness is a constant                                                      |
| pockets: free surface horizontal, level of the bucket                                                                | `fill`, the bucket geometry of `src/sim/bucket.ts`                     | **physical** (the geometry of the model); the meniscus draws it                                                             |
| pools of the screw                                                                                                   | `fill`, `tailRise`                                                     | **physical** levels                                                                                                         |
| inlet sheet and splash                                                                                               | `flow / design flow`                                                   | proportional to `flow`; the fall is the height of the headwall over the water; thickness is decorative                      |
| outlet ripples, foam, wake, spray                                                                                    | `flow`, `omega`                                                        | proportional; shape decorative                                                                                              |
| leak through the gap                                                                                                 | `qGap / flow`                                                          | **proportional to the model's own number**; the streams' places are decorative                                              |
| overflow over the blade tips                                                                                         | `qOver / flow`                                                         | **proportional to the model's own number**; places decorative                                                               |

## Budgets (measured)

| Measure                                 | Value                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `site` water, draw calls and triangles  | 21 and about 9,500 (limit 50 and 70,000): 14 grid sheets, the pools and pockets of the chamber, three nappe meshes, the spray           |
| `screw` world, draw calls and triangles | 90 and about 47,700 with the section and the dots (limit 160 and 220,000); the existing test keeps its own ceiling of 140 and 120,000   |
| textures                                | the noise texture (256², 341 KB with its mips, shared by all the materials of a world) and the 32² sprite of the dots: well under 24 MB |
| first build                             | the water adds about 20 ms (the texture) and a few ms (the grids); the site builds in about 210 ms and the screw in about 45 ms in Node |
| bundle                                  | about 15 KB gzip for all the water code (the old water files were about 3 KB): a net growth of about 12 KB                              |
| per frame                               | no allocation: the grids, the ribbons and the ring of drops are written in place; fragment shaders: three texture taps, no loops        |

Not measured: the frame rate on a real phone (the checks ran in headless Chrome with a software renderer).

## Tests

`src/three/water/water.test.ts` (30): the noise texture (size, determinism, no seam), the grid, the patch of three's own program for each kind, the program shared per kind, the advection
and the legacy phase, the nappe (the parabola, the thickness, no water no sheet), the spray ring (never grows, no reallocation, proportional, hidden with its part), the functions of the
state (the weir law equal to the site's `weirHead`, the speeds, the right direction of a flood and of low water), the water of the site (every body is a water material registered in its
part, the head over the crest, the step across the rack, the still water at a closed gate, flood and low water, the budget), the water of the screw (the meniscus is horizontal at every
angle, the pools' level, the splash, the leak and the overflow in proportion to `qGap` and `qOver`, the inlet sheet, the section, the budget), the cost of a build.

## What is simplified, what is not drawn

- The nappe is a mid-surface ribbon with an opacity from its thickness, not a volume; the two faces of the sheet are not drawn separately. The jet of the notch does not contract.
- The standing waves are a train of sines in the direction of the flow, not the result of a hydraulic jump; the foam does not advect with the surface: it is a pattern thresholded by a
  painted mask, so the **extent** of the foam is fixed in space and its **intensity** follows the state.
- No refraction of the bed (the bed shows through by opacity), no caustics, no reflection of the buildings and trees (the reflection is the world's environment light), no real
  transparency of the foam.
- The river bed is flat (the banks' shelving is a trick of the opacity and of the apparent depth); the real river is deeper in the middle and shelves at the banks.
- The leak and the overflow are streams of drops placed along the blade tips; the real leak is a film in a 4 mm gap.
- The spray does not follow an explode: the drops of a part that is not in place are not drawn.
