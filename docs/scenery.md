# Scenery of the `site` world

The polish wave of 2026-10-30 (rules: `docs/polish-rules.md`): the land, the plants, the buildings, the props and the sky of the `site` world, richer and
still readable. **Everything here is decoration**: nothing of the scenery follows the simulation, except the lamp of the house, which keeps its old
behaviour (`electricPower`, `charging`, the hour). No texture file, no model file, no name of a person, a channel, a company or a brand: every map is
generated at start-up from a seeded noise lattice, every number of size is an estimate of ours (`SCENERY` at the end of `src/three/dims.ts`).

| File                                     | What                                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/three/site/materials.ts`            | noise, the procedural maps (22), the shader patches `patchDetail` and `patchWind`, the material factories |
| `src/three/site/terrain.ts`              | the height field, the graded grid, the skirts, the vertex colours, the tracks, the far river              |
| `src/three/site/vegetation.ts`           | the placement plan and the instanced plants                                                               |
| `src/three/site/props.ts`                | poles, footbridge, walls, fence, lamps, bench, barrels, firewood, the two road bridges                    |
| `src/three/site/buildings.ts`            | the mill, the powerhouse and the house                                                                    |
| `src/three/site/sky.ts`                  | the Preetham sky of before, clouds, fog, softer shadows                                                   |
| `parts.ts` (`concrete`, `concreteLight`) | the masonry that holds the water takes a stone material; `buildGround` is gone (the land is `terrain.ts`) |
| `scene.ts` (scenery sections)            | the calls, the wind clock in `update`, `scenery()`, the build time logged once                            |
| `scenery.test.ts`                        | 18 tests: the land, the plants, the buildings, the props and the sky, the budget                          |

## The land and the water meet at the dims

The land is one mesh on a graded grid (fine near the race, 1.5 m, coarse towards the horizon, up to 140 m; about 22,000 vertices, 39,500 triangles). It
leaves **exactly** the rectangles of `dims.SITE` (`OPENINGS` in `terrain.ts`: the river, the run tailrace–chamber–canal, the turn of the tailrace, the
mouth of the canal, and the quay of the chamber, which is a part of the chamber and not land): the grid has a line on every edge, a cell is a hole when
its centre is inside one, and a test checks that no triangle and no vertex of the land is inside an opening.

- **Lined edges** (canal, chamber, tailrace: the concrete linings of the dims stand up to `groundY`): the land is flat at `SITE.groundY`, flush with
  the top of the lining, no face of its own. The quay and the west end wall of the tailrace get a stone face (a skirt with the masonry material).
- **Unlined edges** (both banks of the river, the east bank of the mouth): the land slopes down over 2.8 to 4.1 m to a **lip**, then ends in a short
  earth face, a vertical skirt in the plane of the opening (grass fringe, earth with roots, a dark wet band over the water, mud at the foot). The lip
  stays over the highest water level of its reach: `SCENERY.lip.pondY` 0.12 (the pond, a few centimetres over the crest), `tailY` −0.3 (the tailwater
  reach: a flood of the race site rises 1.2 m over −1.75, so the water stays under the lip), `passY` 0.18 (the south bank beside the fish pass). So
  there is never a gap or a floating edge: nothing of the land is ever inside an opening, and the water, which fills the openings, meets a face.
  An extreme flood (the river preset, 1.65 m) can pass the lip of the tailwater reach by 0.35 m.
- **The river goes on** beyond the dims (x = ±160): a far channel (same lips, a bed under the water) bends away between the hills, with a flat ribbon
  of water at the design level (`far-river`), under two road bridges at x = ±161 (`buildBridges`: a slab 1.8 m over the pond, stone parapets), so the
  river does not end in a cliff. The roads climb to the deck on embankments.
- **The edge of the world never shows**: the land reaches ±2,400 m, hills rise to 60 m and more at 1,500 m (mountains up to about 190 m beyond), the
  fog is exponential-squared with `SCENERY.fogDensity` 0.0012 (6 % at the 200 m of the far views, 0.1 % at the rim), its colour is the horizon's of
  `sky.ts`. A conifer forest of crude cones (1,200 instances) and farmland patches colour the far ground.
- **Flat** where the structures stand: pads (footprint + 2.4 m) and a 1.1 m strip along the lined walls are exactly `groundY`; a plateau and a floodplain
  keep the meadow flat round them; behind the mill the ground rises gently (4 m at 130 m), then wooded hills.
- **Colours** are vertex colours (grass, dry grass, clover, bloom, forest, rock, tracks, gravel yards, the wet band at the water, fields, hedges) with a
  fake ambient occlusion baked in (the foot of the walls, under the crowns). The detail is one map of three channels (fine grass, pebbles, soil), picked by
  a vertex attribute `aMix`, sampled twice (a blurred second scale breaks the repetition), with a bump that fades with the distance.
- **Tracks**: from the house door to the footbridge, along the canal to the mill yard, two lanes to the roads; gravel yards round the mill, the powerhouse
  and in front of the house.

## Materials and maps

22 `DataTexture`s (no canvas, so they build in Node too): 384² rubble masonry (rows of stones with mortar, per-stone colour, a warped mortar line),
256² dressed ashlar, 256² coursed wall stone, 256² clay tiles, 192² slate, 128² ribbed sheet, 128² render, 256² planks, bark, leaves, three alpha
sprites (reeds and cattails, grass, flowers). Largest 384², **5.4 MB with mipmaps** (24 MB allowed), generated in **about 75 to 115 ms**.
`patchDetail` keeps a plain `MeshStandardMaterial` (the kit swaps materials for isolate, ghost and X-ray and drives `opacity`, `transparent`): it
samples the map by the UVs or, for the masonry of the structures (which have no UVs: boxes, extrusions, the trough), by the object-space position and the
dominant axis of the normal; it adds a bump from a separate height map, a damp foot, and a darker band under the eaves.

## Plants (14 draw calls, about 69,500 triangles)

Instanced, one unit-tree geometry per species with its colours in the vertices; sway by `patchWind` (a few sines of the position, scaled by a per-vertex
`aSway`; one uniform clock, `WIND.time`, set once a frame): 10 willows leaning over the water (trunk, forks, a dome and hanging panels), 25 poplars along
the lanes, 14 oaks, 70 conifers on the hills, 1,200 far cones, 55 shrubs, 119 reeds and cattails (crossed alpha quads) along the water, 950 tufts, 520
wildflowers (four colours), 50 rocks. The placement (`planVegetation`) is deterministic, stands every plant on `terrainHeight`, keeps it out of the
openings (a test), off the pads, the tracks, the yards, the roads and the prop zones, and keeps the **tall plants out of a corridor of 11 m round the line
of sight of the home view** (and of the backed-off view of a narrow screen) so that the labels stay readable.

## Buildings

Same footprints, same part ids, same label anchors, same lamp, LED, panes and line points; the bounds are those of the boxes they replace within 6 cm
(a test). The mill: rubble masonry with dressed quoins in alternate long and short courses, a clay-tile roof with a ridge cap, eaves with rafter feet,
gutters and downpipes, framed windows with lintels, sills and open shutters on the four faces, a cart door with ledges, braces and strap hinges, a
loading hatch on the canal side with its short beam and pulley, the hoist beam on the east gable, a chimney with a cap. The powerhouse: render, a stone
foot, a ribbed sheet roof with fascia and gutter, a timber frame round the opening, louvres, a meter box, standoff insulators where the lines leave and
arrive, the cabinet, the battery and the inverter inside as before. The house: render, planked gables, a slate roof, windows with shutters, sills and
flower boxes (the panes are the same glowing material), a door with a hood and a step, the lamp, downpipes, a chimney.

## Props, sky

A dry-stone wall in front of the house and behind it, a post-and-rail paddock fence, the footbridge (stringers, planks, rails, stone steps), three poles
with crossarms, braces and pin insulators (the wires still end on their tops), two lamps, a bench by the river, barrels and a stack of firewood in the
mill yard. The sky keeps the day cycle of before (Preetham, stars, sun and moon), with the clouds of the shader tuned (coverage 0.36), shadows softer
(`shadow.radius` 2.2, intensity 0.86) and a fog that matches the horizon.

## Budget (measured; `scenery.test.ts` logs them)

| What                                              | Measured                                                                            | Allowed                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------- |
| scenery (land, plants, props, bridges, buildings) | **76 draw calls, 124,000 triangles** (+ shadow casters: trees, buildings, props)    | 110 and 280,000            |
| the whole site, water and screw included          | 131 draw calls, 156,000 triangles (the test allows 250,000 for the site: see below) | 220 and 400,000            |
| maps                                              | 22, largest 384², 5.4 MB, 75 to 115 ms                                              | 1024², 24 MB, about 150 ms |
| first build of the world (Chrome, software GL)    | about 250 to 340 ms, of which the scenery about 85 % (logged once: `[scenery] …`)   | about 400 ms               |
| per frame                                         | one number written (`WIND.time.value`); no allocation; no extra pass or target      |                            |

The existing test `site.test.ts` caps the whole site at 250,000 triangles (the rules table says 400,000): with the water role's growth (up to 70,000)
the site stays under it (156,000 now), so nothing needed to be raised.

## What is estimated, what is simplified, what looks weakest

- Every size is an estimate (`SCENERY`); the lips are consistent with the design levels and the flood of the race site, not with a survey.
- The tailrace is the compressed one of the dims; the far river and the roads are invented to hide the ends of the river.
- Weakest: the willows (a dome and flat hanging panels: fine from afar, flat when the camera is inside their curtain), the repetition of the grass
  detail on large flat areas seen from high, the emptiness of the south meadow (kept clear on purpose for the labels), the stone faces of the quay (no
  stones, the masonry texture only), and a pale band that the water role's sheets show at their far ends (x = ±160, under the bridges), to look at.
- Not done: a parapet along the quay (it would hide the screw), planted stones on the faces of the banks, trees overhanging the canal.
