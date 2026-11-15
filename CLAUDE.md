# jet-workshop

A fighter-design workshop where every design decision shows its physical consequence, with measured data on top of the model curves. Current work: spike 1, the wing bench (`docs/briefs/001-spike-wing-bench.md`).

## Start here

- Read the latest checkpoint in `docs/cp/` before doing anything. It says what was done, what is next and what is open.
- The brief in `docs/briefs/` is the spec. Its gates are hard stops: wait for the owner's OK.

## Rules

- Public repository from the first commit: no secrets, no personal paths, no third-party PDFs. Downloaded sources go to `.cache/`, which is gitignored.
- No `LICENSE` file until the owner chooses one.
- One test command: `pnpm test`. The validation report comes from `pnpm validate` and is never written by hand.
- Data honesty: every value is labelled measured, model, or outside model range. Never tune a constant to make a test pass. Never smooth or interpolate measured points. Never present a computed value as measured.
- Branches and PRs: only the initial base commit lives directly on `main`. Everything else enters by PR. The owner merges.
- Python is allowed only in `tools/digitize/`.
- Code, commits and UI in English. Replies to the owner in Spanish.
