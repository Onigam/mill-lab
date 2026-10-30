# Mill Lab

An interactive 3D lab of a **small Archimedes screw in a mill race**: the water of an old mill falls through a head of 1.5 to 2 m,
turns a slow wooden screw, and a chain then a belt raise that slow turn up to a generator that charges a battery. A water wheel and
the other turbines are there for comparison: _which turbine for my site?_

**▶ https://mill-lab.vercel.app** · French and English · desktop, tablet and phone

It is the fourth lab of a series that started with [Pelton Lab](https://github.com/Onigam/pelton-lab) (micro-hydro electricity),
built on the same frame, [lab-kit](https://github.com/Onigam/lab-kit).

## What is in it

- **Two 3D worlds**: the **site** (the river, the weir, the canal with its coarse rack and head gate, the notch that leaves the
  reserved flow in the river, the fish pass, the water chamber, the tailrace, the mill, the powerhouse and the house) and the **screw
  in its chamber** (three wooden threads in a trough, bearings, the chain and belt drive, the generator and its electronics). Explode,
  X-ray, isolate, a section along the axis that shows the pockets of water going down like a slide, current-flow overlays, labels,
  slow motion.
- **Assembly and installation guides** (20 and 11 steps), a **catalogue of 32 parts**, and **six short lessons with a quiz**: from
  water to watts, why a screw works, why a speed multiplier, which turbine, a wheel or a screw, the year of the mill.
- **A simulation** (a pure, unit-tested physics model): the screw's geometry from published design rules, its filling, leakage and
  losses, the drive and a permanent-magnet generator on a 48 V battery, a water wheel for comparison, a head and flow chart that
  places each type of turbine with lines of equal power, and a yearly hydrology with low water and floods. Four presets, nine
  scenarios, a site that follows the seasons.
- **Three A3 design drawings** generated from the same dimensions as the 3D model: the mill race in plan and profile, the screw in
  section, the drive and the electricity.

## What is real and what is not

- This is an **independent educational reconstruction**: not an official drawing, not a product, no footage or image of the videos
  is reused.
- The main source is a video about a wooden Archimedes screw built by an association in an old mill. **That association publishes no
  dimension and no efficiency measurement of its screw**, so the machine drawn here is **generic**: its size comes from published
  design rules, applied to a head and a flow chosen by the lab, never presented as theirs. Three other videos (a crossflow plant in a
  mill, a home-made wheel, a mountain Pelton plant) and a few papers on screw design are credited in the app, in _Sources_.
- **The prototype's 200 W and the 2 kW target are hopes announced in the video, not results.** The model gives 2.2 kW at the
  full-size design point (1.75 m, 180 L/s), 71 % from the water to the battery (84.6 % for the screw alone, a point above the 60 to
  70 % hoped for), but the flows of the two design points were worked back from 200 W and 2 kW at 65 %, so that agreement is
  circular. Nothing was tuned to print a target. See [`docs/physics.md`](docs/physics.md) §7.
- The water wheel's efficiency has no equation in the sources, only ranges that disagree: the lab's wheel is anchored on those
  ranges and is not an independent result. The reserved flow of 10 %, the generator and the three yearly hydrologies are
  assumptions or drawn, not measured; the lab has no fish model; part of the design theory (friction and overflow) was not read.
- Every figure is tagged _reported_, _derived_, _model result_, _assumption_ or _estimate_; the sources are in
  [`docs/research.md`](docs/research.md).
- **Safety and law**: open canals and fast water drown, a turning screw takes an arm, a sleeve, hair; stop the machine and lock the
  gate before any work, never work alone in a chamber. A mill race is not free to use: a water right or a permit, a reserved flow
  and fish passage are required, and depend on the country. Nothing here is a plan to build from.

## Run it

```bash
npm install
npm run dev
```

`npm run typecheck && npm run format:check && npm test && npm run build` is what CI runs; every push to `main` deploys to
Vercel. `npm run kit:bump` moves to a newer lab-kit.

## Project layout

- `src/three/` the two worlds and `dims.ts`, the single source of dimensions (metres, each tagged); `src/sim/` the pure physics
  (including `mech.ts`, the speed multiplier and generator matching); `src/data/` parts, guides, chapters, lessons;
  `src/drawings/` the A3 sheets; `src/panels/` the simulation panel; `src/lab.ts` describes the lab to the kit;
  `src/part-ids.ts` freezes the 32 part ids shared by all of them.
- `docs/` research notes and sources, physics notes, 3D, data, drawings and lessons notes, requests to the kit; `BRIEF.md` is the
  brief the agent team works from.

Built with Three.js, TypeScript and Vite (MIT). Credits and links to every source are in the app, in _Sources_.

---

## Français

**Mill Lab** est un lab 3D interactif d'une **petite vis d'Archimède dans le bief d'un moulin** : l'eau d'un vieux moulin tombe de
1,5 à 2 m, fait tourner lentement une vis en bois, et une chaîne puis une courroie font monter ce tour lent jusqu'à une génératrice
qui charge une batterie. Une roue à aubes et les autres turbines servent de comparaison : _quelle turbine pour mon site ?_ Il est le
quatrième de la série commencée avec [Pelton Lab](https://github.com/Onigam/pelton-lab), sur le même socle,
[lab-kit](https://github.com/Onigam/lab-kit).

**▶ https://mill-lab.vercel.app** · français et anglais · ordinateur, tablette et téléphone

**Ce qu'il contient.** Deux mondes 3D (le **site** du moulin et la **vis dans sa chambre**) avec éclaté, rayons X, isolement, coupe le
long de l'axe qui montre les poches d'eau, flux ; des guides de **montage** (20 étapes) et d'**installation** (11 étapes) ; un
catalogue de **32 pièces** ; **six leçons** avec quiz ; une **simulation** (géométrie de la vis par des règles de conception
publiées, remplissage, fuites et pertes, transmission et génératrice sur batterie 48 V, roue pour comparaison, graphique chute et
débit qui place chaque type de turbine, année d'hydrologie avec basses eaux et crues ; quatre préréglages, neuf scénarios) ;
**trois plans A3** générés des cotes du modèle 3D.

**Ce qui est réel, ce qui ne l'est pas.** Reconstitution pédagogique indépendante, aucune image des vidéos reprise. La source
principale est une vidéo sur une vis d'Archimède en bois construite par une association dans un vieux moulin. **Cette association ne
publie ni cotes ni mesure de rendement de sa vis** : la machine dessinée ici est **générique**, dimensionnée par des règles de
conception publiées, et n'est jamais présentée comme la leur. **Les 200 W du prototype et les 2 kW visés sont des espoirs annoncés
dans la vidéo, pas des résultats** : le modèle donne 2,2 kW au point de calcul pleine taille (1,75 m, 180 L/s) et 71 % de l'eau à la
batterie, mais les débits des deux points de calcul ont été déduits de 200 W et 2 kW à 65 %, donc cet accord est circulaire. Rien n'a
été ajusté pour afficher une cible (voir [`docs/physics.md`](docs/physics.md) §7). Les rendements de la roue viennent de sources qui
divergent ; le débit réservé de 10 %, la génératrice et les trois années d'hydrologie sont des hypothèses ou des dessins. **Sécurité
et droit** : un canal et une eau vive noient, une vis qui tourne happe un bras, une manche, des cheveux ; arrêtez et verrouillez la
vanne avant tout travail, ne travaillez jamais seul dans une chambre. Un bief n'est pas libre d'usage : droit d'eau ou autorisation,
débit réservé et passage des poissons, selon le pays. Ce n'est pas un plan de construction.

**Lancer en local.** `npm install` puis `npm run dev` ; la CI lance `npm run typecheck && npm run format:check && npm test && npm
run build` ; chaque push sur `main` déploie sur Vercel.
