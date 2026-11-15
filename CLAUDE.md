# jet-workshop

A fighter-design workshop where every design decision shows its physical consequence, with measured data on top of the model curves. Spike 1, the wing bench, is closed. Current work runs in three lanes: see `docs/PROCESS.md`.

## Start here

- Read `docs/PROCESS.md`: roles, lanes, gates and the evidence rules.
- Read the checkpoint of your lane in `docs/cp/` before doing anything. It says what was done, what is next and what is open.
- The brief of your lane in `docs/briefs/` is the spec. Its gates are hard stops: wait for the owner's OK.

## Rules

- Public repository from the first commit: no secrets, no personal paths, no third-party PDFs. Downloaded sources go to `.cache/`, which is gitignored.
- No `LICENSE` file until the owner chooses one.
- One test command: `pnpm test`. The validation report comes from `pnpm validate` and is never written by hand.
- Data honesty: every value is labelled measured, NACA faired, computed, model, or outside model range. Never tune a constant to make a test pass. Never smooth or interpolate measured points. Never present a computed value as measured.
- Lanes: work only on the files your lane owns (`docs/PROCESS.md`). If you need a file of another lane, stop and say so.
- Branches and PRs: everything enters `main` by PR. The owner merges.
- Python is allowed only in `tools/digitize/` and `studies/`.
- Code and commits in English. The interface is bilingual, Spanish and English. Replies to the owner in Spanish.
