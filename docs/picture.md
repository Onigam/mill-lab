# The picture: kit 0.5.1, a look per world

Rule: `lab-kit/docs/lab-quality.md` §3, « A warm, full, stable picture ». Kit 0.5.1 gives every world MSAA 4 on the scene pass, soft
shadow edges and adaptive quality on weak devices; what each world does with it is set here.

## The look of each world

| World     | `scene.userData.look`                       | Why                                                                                                         |
| --------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| screw     | `{ ...PAPER_STUDIO }` (`world.ts`)          | A paper floor (`#efe6d3`) that stays paper: ACES drew it as a grey (`#f2f0ed` in the generator's close-up). |
| generator | `{ ...PAPER_STUDIO }` (`world.ts`)          | The same drafting-table floor.                                                                              |
| powerroom | `{ ...PAPER_STUDIO }` (`world.ts`)          | A room, not a floor: its palette was retuned (below).                                                       |
| site      | `{ toneMapping: 'neutral', exposure: 1.2 }` | The valley's own tone: Neutral keeps the colours of the light and the materials; no saturation pass.        |

The three paper worlds share `workshopScene()`, so one line sets all three.

## What the Neutral curve changed, and what was done

- **Wood** (`COLOURS.woodA`, `woodB` in `dims.ts`; the generator's skids): the warm timber turned orange-peach under Neutral
  (the generator's skids, measured in the close-up: `#edd59f` with kit 0.4.0, `#f1ac55` on kit 0.5.1 with the old colours). They are now
  a pale pine (`woodA` `#c9b790`, `woodB` `#bea980`; the skids use `woodB` instead of their own copy) that comes out `#f2ce90`.
- **Concrete** (`COLOURS.concrete`, `concreteDark`): `#9d988c` / `#86817a` → `#949699` / `#7e8083`, a cool grey the studio's warm
  light turns into a neutral grey concrete (it read cream).
- **Power room**: the plaster texture (`#cec6b8` base → `#c4c8cc`) and the door's boards (`#966c42` → `#8a7056`) were desaturated,
  for the same reason (peach walls, an orange door).
- **Site**: Neutral at 1.2 and nothing else; the meadow, the sky and the haze keep the look they had.

## Near detail (`src/three/detail.ts`)

The same code as the Pelton and ram pump labs', without their grass and stones: `applyWear` (a slow variation of colour and
roughness on the parts, `0.1` of roughness on metals, each pattern fading before a cell of it is under two pixels) on the generator,
and `contactShadow` under the generator's skids and under the pool and the platform of the screw world. The screw world's parts
and the site's are not worn (not tried: the site has its own textured materials, the screw's concrete is plain on purpose).

## Two defects of the 0.4.0 picture that MSAA and the new colours made visible

- **The outlet pool's water drew stripes through its glass** (screw world, from the overview): the water's bottom and its right
  side lay in the planes of the slab and of the wall, so two faces fought for the pixels (the stripes were in the picture with kit 0.4.0 too and crawled as the camera moved). The volume now
  goes 4 mm into the slab and into the wall, hidden by them; the section cap keeps the polygon (`Prism.set(poly, halfWidth, sink)`,
  `screw.test.ts`).
- **The site's ground bump** (`patchDetail` in `site/materials.ts`) was lit from 6 m to 110 m and its fine relief (the pebbles of
  the gravel, the grain of the grass) crawled as the camera moved: 4.45 % of shimmering pixels in an orbit, 14.3 % in a dolly with
  kit 0.5.1. It now fades from 6 m to 45 m (it was 20 m to 110 m): 2.64 % and 9.67 %. The texture's anisotropic filtering is 16
  (it was 4); that alone changed nothing.

## Measured (kit `flicker.mjs`, 1280 × 720, 150 frames a move, Metal, clocks pinned)

Shimmer = share of pixels whose change from frame to frame is not smooth. « 0.4.0 » is the lab at `d149974`; « now » is this work.

| World     | Move  |    0.4.0 |     now |
| --------- | ----- | -------: | ------: |
| site      | orbit |  3.971 % | 2.636 % |
| site      | dolly | 13.696 % | 9.670 % |
| screw     | orbit |  1.166 % | 1.236 % |
| screw     | dolly |  1.865 % | 1.873 % |
| generator | orbit |  0.093 % | 0.106 % |
| generator | dolly |  0.462 % | 0.457 % |
| powerroom | orbit |  0.500 % | 0.672 % |
| powerroom | dolly |  3.208 % | 3.371 % |

No spike over 1.5 (a pop is over 2).

**Where it is not better, said plainly**

- The **site** is better by a third but is still the shimmeriest picture of the labs: the trees (willows, poplars, oaks) and the
  grass cards account for part of the rest (measured with the first look, orbit: 4.45 % as it was, 3.63 % without the foliage,
  2.20 % without the ground; the ground is what was tamed).
- The **power room** is a little above 0.4.0 (+0.17 and +0.16 points): the same effect as on Pelton's technical room, more contrast
  on the same edge steps under Neutral, and MSAA turning one jump of an aliased edge into several smaller ones above the tool's
  12-level threshold. Not looked at beyond that.
- The screw and the generator are level with 0.4.0 (within 0.01 to 0.1 point). The screw's figure includes the water's motion.

## Findings for the kit

- `alphaToCoverage` on an alpha-tested card leaves a fractional alpha in the scene's render target and the page's paper shows
  through the canvas as pale specks (found on Pelton). Not used here.
- `src/three/detail.ts` is now in three labs: a candidate for `@onigam/lab-kit/three`.
