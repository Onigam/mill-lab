# Narration scripts (French and English)

`fr.json` and `en.json` follow `lab-kit/docs/narration.md`: **52 segments each** (`intro`, 4 worlds, 47 parts: site 12, screw 17, generator 8, powerroom 10), ids `intro`,
`scene-<world>`, `part-<id>`, no lesson segments. **No audio exists yet**: the owner's yes comes first, then a sample (the introduction and one world), then the rest.

Check the cost without spending anything (`HOME=<empty dir>` keeps the tool from even opening the key file):
`node <lab-kit>/tools/narration/generate.mjs --src narration/fr.json --out /tmp/mill-audio-fr --dry-run`.

## Budget (spoken characters, cues removed; 1 character is about 1 credit)

- French **22 968** (intro 1 955, worlds 2 568, parts 18 445), English **21 858** (intro 1 767, worlds 2 630, parts 17 461): about 44 800 credits for the two languages. The
  owner's ceiling is 30 000 per language (`src/narration.test.ts`).
- Ordinary part 320 to 400 characters (French); the longest are `generator` (527), `battery` (491), `trapped-water` (489), `house-load` (481), then `trash-rack`, `dump-load`,
  `inverter`, `earthing`, `energy-meter`, `gen-stator` (430 to 450); the shortest `tailrace` (319), `mill-building` (334), `headrace` (335).

## Register

Pelton Lab's tone (`lab-kit/docs/narration-style.md`): a warm, slightly mischievous storyteller, « vous » / « on », short sentences, a question now and then, rare exclamations.
The thread is **one pocket of water**: river, weir, canal, rack, gate, chamber, the screw (it leans on a blade and turns it), chain, belt, generator, then the current through
the powerhouse to the battery and the lamp of the house (the intro, `part-water-chamber`, `part-generator`, `part-battery` and `part-house-load` call it back).
`node <lab-kit>/tools/narration/tone-stats.mjs narration/fr.json`: average sentence 71 (Pelton 79), 3 sentences over 120 characters (Pelton 35), exclamations 0.78 per 1 000
(0.8), questions 0.44 (0.29), no « tu », no symbol. English against Pelton's English: 66 (69), 1 over 120 (2), 0.82 (0.83), 0.46 (0.35).
The English is an adaptation (British spelling and units, « un droit d'eau » becomes « a legal right » and « check your local rules »), with the same cues at the matching point.

- **Anonymous**: no person, channel, association, company, brand or institution in a text or a title, **not even the name that gives the screw its usual name** (the sheets say
  « vis d'Archimède »; the narration says « la vis »). « la vidéo », « l'association de la vidéo », « les constructeurs de la vidéo » at most. A test refuses the names of the sources.
- **Honesty, said once** (`src/narration.test.ts` counts it): the intro says it is an independent educational reconstruction, that the screw is generic (the association
  publishes no dimension) and that the figures come from the simulation unless the video is quoted; the video's **200 W and 2 kW hopes** only in `part-house-load`; the dump load
  **is not simulated** only in `part-dump-load`; the generator's inside is a generic picture only in `scene-generator`; the order of the protections is an electrician's choice only
  in `scene-powerroom`; « dans le modèle » never. « La vidéo » only where a sheet says so (hedged figures are « environ »).
- **Safety and law, one sentence each**: padlock the gate (`intake-gate`), never go down the chamber alone (`water-chamber`), never step into the trough of a turning screw
  (`trough`), guard the chain (`chain`), never disconnect the battery with the screw running (`generator`), magnets pinch and shatter (`gen-magnets`), live terminals while the shaft
  turns (`gen-terminals`), the DC arc does not go out (`dc-breaker`), battery terminals (`battery`), lethal mains output (`inverter`), earthing measured by a qualified electrician
  (`earthing`), a water right and a reserved flow (`scene-site`, French wording only in French).

## Cues (122 in each language, the same in both)

- Totals: home 10, frame 40, scene 5, mode 6, select 1, flows 28, cutaway 18, explode 10, xray 4 (every « on » has its « off » before the end of the segment).
- Intro (23): `home`, `frame` on river, weir, headrace and rack, chamber, then `scene` hops screw, generator, powerroom, site with frames on the pocket, chain, belt, battery and house;
  then `mode` hops assembly, install, sim, lessons, plans, explore, `scene:site`, `select:none`.
- Worlds: `home`, one `frame` per element named, `flows` in the site, the screw and the powerhouse, `cutaway` and `explode` in the screw and the generator, `xray` and `flows` in
  the generator, `explode` in the powerhouse.
- Parts (a part starts framed and selected, so none moves the camera): `flows` on river, headrace, tailrace, gen-coils, rectifier, charge-controller, battery, dump-load, inverter;
  `cutaway` on trapped-water, trough, screw-core, inlet-sill, outlet-pool, gen-frame, gen-stator; `explode` on blade-module, blade-fastener; `xray` on gen-magnets.
- Spacing: camera cues (`home`, `scene`, `frame`, `select`) at least 35 spoken characters apart. Section only in the screw and the generator, X-ray only in the screw and the
  generator, never in the site or the powerhouse. No `lab:` cue: the lab defines no `narration.onCue` hook.

## Checked

`npx vitest run src/narration.test.ts` (38 tests, 1 skipped until a manifest exists): contract (4 worlds, 47 parts, 52 segments), ids, scopes and starting worlds, known cues on
parts and worlds of the current world, everything switched on is switched off, camera spacing, section and X-ray rules, no camera cue in a part, the intro's hops, disclaimers and
safety lines once, anonymity, no digit, symbol or abbreviation, sentence length, no « tu », budget, no seven-word run copied from `docs/transcript-*.md` (skipped where they are
absent), same segments and same cues at the same place in both languages, and (once `public/audio/<lang>/manifest.json` exists) the manifest and the audio files.
`scripts/check-narration.mjs` (for `npm run build`) tolerates the absence of audio; it refuses a partial manifest.

## Next, in this order

1. The owner reads or listens to a sample (the intro and one world) and says yes: credits are never spent before.
2. Generate (`generate.mjs --src narration/fr.json --out public/audio/fr`, same for English), declare `narration: { manifest: 'audio/{lang}/manifest.json' }` in `src/lab.ts`,
   add `node scripts/check-narration.mjs` to the build script, listen in the browser (the cues follow the voice, the 3D worlds being final by then).

## Words the voice may stumble on

presse-étoupe, parafoudres, clavette, flasque, cosse, brin, carter, redresseur, délestage, kilowattheures, quiz; in English: sprocket, countershaft, rectifier, earthing, lug, gland.
