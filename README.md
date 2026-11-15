# jet-workshop

A fighter-design workshop in the browser: every design decision shows its physical consequence, with measured wind-tunnel data drawn on top of the model curves.

## Status

Spike 1, the wing bench, is closed (`docs/briefs/001-spike-wing-bench.md`, checkpoint `docs/cp/001.md`). Work now runs in three parallel lanes, each with its own brief and checkpoint; `docs/PROCESS.md` describes them:

- A, the lesson (brief 002, `docs/cp/002.md`): a guided lesson on why fighters have swept wings, on top of the bench. In progress.
- B, held-out data (brief 003): a second NACA dataset, kept apart and scored once.
- C, wave-drag method study (brief 004): blind predictions before the transonic engine is built.

## Two modes

- **Lesson 1** (in progress): "Why do fighters have swept wings?" A cover and eight steps, using only the 1952 measurements, for someone who knows no aerodynamics.
- **Free bench**: the wing bench below, with every control, the model band and the reliability strip.

The interface is in Spanish and English (`docs/decisions/0003-bilingual-interface.md`).

## The wing bench

The wing bench compares a fast drag model (Korn–Mason drag divergence with Lock's fourth-power drag rise) against three wing–body configurations measured by NACA in 1952 (R. P. Bielat, NACA RM L52B08, Langley 8-foot transonic tunnel).

The model is shown and scored as a band: the spread of four textbook wing form factors and two boundary-layer states, none fitted to the data. Its transonic drag rise is computed but marked outside the model's range: the method is outside its demonstrated range on these thin, low-aspect-ratio wings. The body term is also checked against the body tested alone (NACA RM L51I04a).

Model and measurement are compared in the structure of ASME V&V 20, as adapted in `docs/decisions/0001-validation-criterion.md`: comparison error E = S − D and validation uncertainty u_val. A strip segment is `validated` when every symbol the chart draws has |E| ≤ u_val and the band's half-width is within 0.0020.

Every pull request and every push to `main` runs CI (`.github/workflows/ci.yml`): frozen install, tests, typecheck, lint, the validation report regenerated and checked unchanged, and the app build.

## Requirements

- Node.js 24 or later, with Corepack (`corepack enable` once, so `pnpm` resolves to the version pinned in `package.json`)
- Python 3.12 or later, only for the digitization tools in `tools/digitize/`

## Commands

```bash
pnpm install
pnpm test        # all tests (physics and validation)
pnpm validate    # writes packages/validation/report/validation-report.md
pnpm dev         # the app at http://localhost:5173
pnpm typecheck
pnpm lint
```

## Layout

- `packages/physics`: the drag model and the baseline it is compared with.
- `packages/validation`: the digitized NACA dataset (see its `README.md`, the dataset card), the scoring and the generated validation report.
- `apps/web`: the app: the lesson and the wing bench.
- `tools/digitize`: the Python tools that read the NACA figures, with the specs and results of both reading passes.

## License

License: not yet chosen. All rights reserved until a license is added.
