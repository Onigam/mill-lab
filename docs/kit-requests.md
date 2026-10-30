# Kit requests (what `@onigam/lab-kit` lacks, from the physics and panel work of Mill Lab)

Numbered, one paragraph each. Nothing here was worked around by patching the kit; each item says what the lab did instead.

1. **Tests of a panel need Node to import the kit.** The kit's `dist` uses extensionless relative imports (`./lang`, `./electric`), so a vitest file that imports
   `@onigam/lab-kit/i18n` or `/sim` fails in Node unless the lab adds `test.server.deps.inline: ['@onigam/lab-kit']` to its Vite config (Piggott Lab does; Mill Lab had to,
   in `vite.config.ts`, which is outside the physics role's files). Please publish ESM with extensions (or a build that Node resolves) so that no lab needs the line, and the
   barrel `@onigam/lab-kit/sim` can be imported (the lab imports `@onigam/lab-kit/sim/hydraulic` for now).
2. **A fake DOM for panel tests.** `src/panels/test-dom.ts` (a small stand-in for the DOM that the kit's `h`, `fill`, widgets and charts call) is copied from Piggott Lab; ram-pump-lab
   has its own. Ship one in the kit (for example `@onigam/lab-kit/testing`) with the same `installFakeDom()` so that panels are tested identically in every lab.
3. **`num(value, digits)` and `months()`.** Every lab writes the same locale-aware number formatter (`7,5` / `7.5`, no `-0,0`); Mill Lab also needs short month names. Put them in
   `@onigam/lab-kit/i18n`, with a `LAB_STRINGS` export convention for the parity test (every lab's `strings.test.ts` is the same file with a different list of allowed numbers).
4. **Charts: log axes, filled bands and polygons, custom ticks.** The chooser chart (head against flow, log-log, zones that overlap, lines of equal power) had to be faked with
   `LineChart`: log10 values on linear axes, every zone as a closed outline drawn by giving each series its own stretch of a shared list of abscissas (`NaN` elsewhere), `legend: false` and a
   hand-made legend. The four tick labels at thirds of the axis forced the lab to choose maxima divisible by three (`niceCeil3`). Please add: a log scale option, `fill` for a series
   (zones, bands), optional explicit ticks, and a tooltip that skips series with `NaN`.
5. **`section(title, …)` that can start closed.** The kit's `section` always opens (`open: true`); the panels that fold their secondary controls set `.open = false` on the returned
   element. An `open` argument would say it.
6. **A `readout` widget.** The `.readouts` grid of boxes (label, value, unit) is copied by every panel, and its label is cut with an ellipsis at about 14 characters, so the lab shows
   anything longer as a line in the `.loss-legend` grid instead. A kit widget could allow two-line labels and take a list of `{label, value, unit}`.
7. **`sim/mech` to move into the kit.** `src/sim/mech.ts` (chain and belt stages, torque `P/ω`, a permanent-magnet generator on a battery with voltage ∝ speed and torque ∝ current,
   `matchSpeed`) is pure, in SI, free of any lab import and tested (`mech.test.ts`): the gravity battery and Piggott's alternator can reuse it. Piggott's alternator and this one share the
   bridge factor 1.35 and the diode drop; a common `generatorAt` would remove the copy.
8. **Time controls beyond an hour.** The strip's default speeds stop at ×3600; a lab that follows the seasons wants a day or a week per second. The lab passes `speeds: [1, 3600, 86400, 604800]`
   to the strip; the label is fine, but a long clock (a date, not 00:00) deserves a kit helper for `clock()`.
9. **A shared yearly chart.** Piggott's Weibull year, the mill's flow year and the future labs' seasonal charts are all "365 values with a marker for today": a small kit component would also
   give the day-of-year axis labels in both languages.
