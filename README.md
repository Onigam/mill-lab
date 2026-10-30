# Lab Template

Template of an interactive 3D energy lab built on [`@onigam/lab-kit`](https://github.com/Onigam/lab-kit): a working
demo lab (a flywheel on a base) with a simulation, 3D world, parts catalogue, assembly guide, lesson, drawing sheet and
simulation panel, ready to be replaced by a real device. The app frame is shared by every lab and is not restyled here.

🇫🇷 [Version française plus bas](#français)

## Create a lab

```bash
# with the portfolio tooling's script: creates the GitHub repository (from this template), customises it,
# checks it, pushes, then creates the Vercel project, connects it to Git and deploys
node new-lab.mjs ram-pump-lab "Ram Pump Lab" --description "Interactive 3D lab of a hydraulic ram pump"
```

or, by hand: **Use this template** on GitHub, then `npm install` and replace `lab-template` in `package.json`,
`index.html`, `public/lab.json` and `src/lab.ts`.

## What is where

| Path                        | Content                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `BRIEF.md`                  | the brief for the lab team: locked frame, versions policy, roles, conventions, quality gates  |
| `docs/research.template.md` | the research notes to fill before modelling                                                   |
| `src/lab.ts`                | the lab definition handed to the kit (worlds, parts, guides, lessons, drawings, strip, about) |
| `src/sim/`                  | the simulation (pure, unit-tested)                                                            |
| `src/three/`                | the 3D worlds; `dims.ts` is the single source of dimensions                                   |
| `src/data/`                 | parts, guides, lessons (bilingual)                                                            |
| `src/drawings/`             | A3 sheets generated from the dimensions                                                       |
| `src/panels/sim.ts`         | the simulation side panel (kit widgets and charts)                                            |
| `tools/visual-regression`   | screenshots and pixel comparison of every world × mode                                        |
| `scripts/kit-bump.mjs`      | move to the latest release of the kit                                                         |
| `public/lab.json`           | metadata read by the portfolio hub (CORS header set in `vercel.json`)                         |

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck && npm run format:check && npm test && npm run build   # what CI runs
```

CI (`.github/workflows/ci.yml`) runs these on every push and pull request; Dependabot proposes tooling updates weekly.
The kit is a Git dependency pinned to a tag: `npm run kit:bump -- --check` tells whether a newer release exists.
Pushes to `main` deploy to Vercel.

## Licence

MIT.

---

## Français

Modèle d'un lab 3D interactif sur l'énergie, construit sur [`@onigam/lab-kit`](https://github.com/Onigam/lab-kit) : un
lab de démonstration qui fonctionne (un volant sur un socle) avec simulation, monde 3D, catalogue de pièces, guide de
montage, leçon, planche et panneau de simulation, à remplacer par un vrai dispositif. Le cadre de l'application est
commun à tous les labs et n'est pas modifié ici.

- **Créer un lab** : `node new-lab.mjs ram-pump-lab "Ram Pump Lab"` (script de l'outillage du portfolio : crée le dépôt GitHub et le projet Vercel),
  ou « Use this template » sur GitHub puis remplacer `lab-template` dans `package.json`, `index.html`,
  `public/lab.json` et `src/lab.ts`.
- **À lire d'abord** : `BRIEF.md` (cadre verrouillé, politique de versions, rôles de l'équipe, portes de qualité).
- **Développer** : `npm install`, `npm run dev`, puis `npm run typecheck`, `npm run format:check`, `npm test` et
  `npm run build` (ce que fait la CI). Un push sur `main` déploie sur Vercel.
- **Kit** : dépendance Git épinglée sur un tag ; `npm run kit:bump -- --check` indique si une version plus récente existe.
