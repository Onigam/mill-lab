# Claude Code notes

Read **BRIEF.md** first: it defines the lab, the locked frame, the versions policy, the team roles and the quality
gates. Short version:

- This repo is **content only**; the application frame comes from `@onigam/lab-kit` (never restyle it, never patch it).
- `src/lab.ts` describes the lab to the kit; the physics in `src/sim` is pure and unit-tested; dimensions live in
  `src/three/dims.ts` only; every text is bilingual `l(fr, en)`.
- One version by default. Ask before adding a second.
- Commands: `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format`.
- Move to a newer kit with `npm run kit:bump` (`--check` to only look).
- Pushing to `main` deploys to production.
