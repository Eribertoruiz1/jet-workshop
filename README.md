# jet-workshop

A fighter-design workshop in the browser: every design decision shows its physical consequence, with measured wind-tunnel data drawn on top of the model curves.

## Status

Spike 1, the wing bench, is in progress. See `docs/briefs/001-spike-wing-bench.md` for the spec and `docs/cp/001.md` for the latest checkpoint.

The wing bench compares a fast drag model (Korn–Mason drag divergence with Lock's fourth-power drag rise) against three wing–body configurations measured by NACA in 1952 (R. P. Bielat, NACA RM L52B08, Langley 8-foot transonic tunnel).

## Requirements

- Node.js 24 or later, with Corepack (`corepack enable` once, so `pnpm` resolves to the version pinned in `package.json`)
- Python 3.12 or later, only for the digitization tools in `tools/digitize/`

## Commands

```bash
pnpm install
pnpm test
```

More commands (`validate`, `dev`, `typecheck`, `lint`) arrive with spike 1.

## License

License: not yet chosen. All rights reserved until a license is added.
