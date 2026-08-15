# Genesis

A civilization simulation engine with two operating modes and one enforced boundary between them.

**Rigor mode** runs a small, calibrated model against historical data and reports posteriors, not stories. **Sandbox mode** runs a large, uncalibrated model that is fun to watch and makes no scientific claim. The same kernel drives both. The difference is enforced in code, not in documentation.

---

## The core invariant

Every numeric parameter in Genesis carries a provenance tag:

| Tag | Meaning | Ships with |
|---|---|---|
| `CALIBRATED` | Fit to historical data via the calibration service | Posterior interval, dataset reference |
| `ESTIMATED` | Taken from published literature | Citation |
| `INVENTED` | Chosen because it produces good behavior | Nothing. It is a guess and is labeled as one. |

The kernel tracks which parameters contributed to which state change. Every state delta emits a `Factor[]` record naming its inputs and their provenance.

**Rigor mode refuses to emit any output whose dependency path touches an `INVENTED` parameter.** Not a warning — the run is blocked and the gate report names the offending parameter and the path. This is why both modes can coexist without the rigorous half being contaminated by the entertaining half.

If you find yourself wanting to bypass the gate, that is the signal that the thing you are trying to claim is not supported. Set `GENESIS_PROVENANCE_STRICT=false` only for local exploration; CI rejects any run record with `gateStatus = BYPASSED`.

## What Genesis does not do

- It does not produce probabilities for counterfactuals in Rigor mode. There is no reference class for "probability the Industrial Revolution happens before 1800." Rigor counterfactuals report parameter-uncertainty intervals over simulated quantities and nothing else.
- It does not simulate all of history. Rigor mode covers a deliberately narrow mechanism over a deliberately narrow window where data exists.
- It does not claim Sandbox output means anything. Sandbox is a toy with good physics-flavored bones.

## Architecture

```
genesis/
├── apps/
│   ├── web/          Next.js 14 — map, timeline scrubber, provenance inspector
│   ├── api/          Fastify 4 — run orchestration, replay, branching
│   └── calibrate/    Python FastAPI — identifiability + Bayesian inference
├── packages/
│   ├── kernel/       Deterministic core: tick loop, seeded PRNG, ledger. Zero deps.
│   ├── params/       Parameter registry + provenance gate
│   ├── models/       rigor/ and sandbox/ domain modules
│   ├── replay/       Seed + config → byte-identical state reconstruction
│   ├── schema/       Prisma + Postgres
│   └── shared/       Types shared across apps
├── data/             Calibration datasets (gitignored; see docs/datasets.md)
└── docs/
    ├── model-cards/  What each calibrated model can and cannot support
    └── decisions/    ADRs
```

## Determinism guarantees

These are locked invariants. Do not "fix" them.

- All stock quantities are fixed-point integers. No floats in state.
- Randomness comes only from a seeded xoshiro128\*\* stream owned by the kernel. `Math.random` is banned by lint rule.
- No `Date.now()`, no wall-clock, no locale-dependent formatting inside `@genesis/kernel`.
- `seed + configHash + paramSetId` uniquely determines the terminal state hash. Enforced by a unique constraint on `Run` and by a CI job that replays 1000 runs and asserts byte equality.
- Module execution order is fixed and explicit. Never derived from object key iteration.

## Getting started

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres      # or point DATABASE_URL at Railway
pnpm db:migrate
pnpm dev
```

Python calibration service:

```bash
cd apps/calibrate
uv sync --extra dev
uv run uvicorn genesis_calibrate.main:app --reload --port 8300
```

Identifiability pipeline on synthetic data:

```bash
uv run python -m genesis_calibrate.cli dry-run --generated 2026-08-13
```

## Verification commands

```bash
pnpm typecheck     # tsc across the workspace
pnpm lint          # includes the kernel determinism lint rules
pnpm test          # unit + integration
pnpm determinism   # 1000 seeded replays must produce identical state hashes
pnpm gate          # provenance gate: no INVENTED params in any Rigor output path
```

The Python service is verified in its own CI job and is deliberately not wired into the
Turbo pipeline — a `pnpm test` should not have to resolve PyMC.

```bash
cd apps/calibrate
uv run pytest
uv run ruff check src
uv run mypy src
```

Both `determinism` and `gate` run in CI on every push. A red gate blocks merge.

## Preflight

```bash
pnpm preflight
```

Nine checks, locally, in one command: typecheck, lint, build, test, determinism,
gate, plus three CI does not run — it starts the API in process and reads
`/ready`, reproduces all eight scenario packs from their own permalinks, and runs
the Python suite. Pass step names to run a subset (`pnpm preflight gate readiness`).

Every step prints PASS or FAIL with its own timing, and the run does not stop at
the first failure — "3 of 9 failed" is more useful than "the second one failed".

A step that exits 0 without doing anything counts as a failure. This is not
hypothetical: the first version of the script filtered on `genesis-calibrate`,
which matches no workspace (the package is `@genesis/calibrate`), so pnpm printed
"No projects matched", exited 0, and preflight reported PASS in 0.1 seconds.

## Cost caps

The roadmap names Bayesian inference as the spend risk, not traffic. The cap is
enforced in `apps/calibrate/src/genesis_calibrate/budget.py`, priced in model
evaluations, and checked **before** a job starts:

- Sobol is costed at Saltelli's `n(2D+2)`, not `n`.
- Profile likelihood counts the inner optimiser, which is most of the cost.
- NUTS counts tuning and leapfrog steps, not just draws.

An over-budget job is refused, not trimmed — quietly dropping to 200 draws would
return a posterior that reads like the one that was asked for. `GENESIS_CALIBRATE_MAX_EVALS`
raises the cap on purpose; a typo in it is an error rather than a fallback to the
default, so a mistyped cap cannot become a bigger one. An **unattended** run
refuses to start on an inherited cap at all — somebody has to have chosen the
number. `GET /budget` reports the cap in force and whether it was set or inherited.

The default admits the whole Phase 3 identifiability pipeline (~22k evaluations)
and refuses a four-chain NUTS run (~1M). That asymmetry is the point; a default
high enough to wave a real inference job through is a decoration, not a cap.

## Status

Phases 0 through 8 complete. CI green. Phase 9's hardening is done and its
deployment is not started, on purpose — Genesis runs locally and nothing about
it assumes a host.

`/health` is a cheap liveness ping. `/ready` is the expensive one: it re-derives
the invariants that would make every answer this service gives worthless if they
broke — the kernel is deterministic, and the gate still blocks Rigor over
INVENTED — rather than reporting a flag set at boot. A gate that stops blocking
is reported as unhealthy, not as a pass.

**Rigor mode ships empty.** Phases 3 and 4 tested the two parameters the track
was built around and both failed. `climate_sensitivity` clears the identifiability
threshold at 408 observations while its fitted value ranges from −10.2 to +0.07
and flips sign depending on whether a trend is removed — it absorbs trend rather
than measuring climate. `growth_rate` calibrates cleanly across 110 countries,
passes all seven pre-registered validation tests, and loses to freezing every
country's population at its year-1000 value by 56%.

So `RIGOR_PARAMS` is an empty set, nothing carries `CALIBRATED`, and
`assertRigorRunnable` refuses to start a Rigor run rather than returning an empty
one. Enforced by tests and by `pnpm gate`. See
`docs/decisions/0005-rigor-ships-empty.md`.

Genesis today is a Sandbox simulator with a rigorous empty compartment. That is
the boundary working, not the boundary failing.

**What does work.** The kernel is fixed-point arithmetic, xoshiro128\*\* with
per-module substreams, the `Factor[]` ledger, canonical state encoding and a
from-scratch BLAKE3 verified against all 35 official test vectors. `pnpm
determinism` replays 1000 runs, checks snapshot/restore equivalence and no-op
module invariance, with a different-seed control so a constant hash cannot pass.
`pnpm gate` blocks an INVENTED ancestor anywhere upstream of a Rigor output,
names the full path, and cannot be relaxed under `NODE_ENV=production`.

Sandbox runs 18 subsystems over 5000 simulated years in 85ms, deterministic from
seed, no float in state, every output refused promotion to Rigor.

**Scenarios.** Eight authored Sandbox packs, each one a permalink that carries
the whole scenario — seed, ticks, regions, parameter overrides, interventions —
rather than a database key. `GET /scenario/:token` runs it and reports the
terminal hash, reading nothing from disk. Titles and notes are not hashed, so
renaming a published run leaves its config hash alone. See
`docs/decisions/0006-permalinks-carry-the-scenario.md`.

**Known debt.** 47 inline numeric constants across the subsystems are not in the
registry, so the gate cannot see them. A test pins the count and it only goes
down.

Model cards in `docs/model-cards/`, decisions in `docs/decisions/`, Phase 6
design target in `docs/interface-bar.md`.

See `ROADMAP.md`.

## License

TBD
