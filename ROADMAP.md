# Genesis — Roadmap

Nine phases. Each phase has an exit gate. A gate is a binary condition, not a vibe. Do not start phase N+1 until phase N's gate is green in CI.

The ordering is deliberate: the kernel and the provenance system come before any domain modeling. Building civilization models first and adding rigor later is how the Trident spec failed — by the time you notice the invented constants, they are load-bearing.

## Phase 0 — Repo and bootstrap

Run `bootstrap.sh`, wire GitHub, get CI green on an empty tree.

**Exit gate:** `pnpm install && pnpm build && pnpm test` passes on a clean clone. CI green.

## Phase 1 — Deterministic kernel

No domain logic whatsoever. Tick loop, state store, seeded PRNG, event ledger, snapshot/restore.

- Fixed-point integer arithmetic module (`Fixed` type, explicit scale, no implicit float coercion)
- xoshiro128\*\* PRNG, kernel-owned, substream-per-module so adding a module does not shift another module's draws
- `Factor[]` ledger: every state delta records `{ key, provenance, contribution }`
- Snapshot serialization + `stateHash` (BLAKE3 over canonical byte encoding)
- ESLint rule banning `Math.random`, `Date.now`, `Object.keys` iteration over state in `@genesis/kernel`

**Exit gate:** 1000 runs at the same seed produce byte-identical terminal state hashes. Restore-from-snapshot at tick k and continue produces the same terminal hash as an uninterrupted run. Adding a no-op module does not change any hash.

## Phase 2 — Parameter registry and provenance gate

The thing that makes "both tracks" honest.

- `ParamRegistry`: every parameter declared with key, unit, provenance, source, bounds
- Dependency tracking: kernel records which param keys touched which outputs
- `GateCheck`: given a run mode and an output set, returns PASS or BLOCKED with the offending path
- CLI: `pnpm gate` fails the build if any Rigor-declared output has an INVENTED ancestor
- Seed the registry with ~30 deliberately-INVENTED params and prove the gate blocks all of them

**Exit gate:** A Rigor run containing one INVENTED parameter anywhere in its output path is refused, with a report naming the parameter and the full path. A test asserts the gate cannot be disabled by config in `NODE_ENV=production`.

## Phase 3 — Rigor Track: identifiability first

This phase is the one that decides whether the project is real. Do the identifiability analysis before fitting anything.

Scope: population–yield–climate coupling. Two regions: Nile Valley (primary) and Yellow River (holdout). Window: 500 BCE – 1500 CE. Target: ~12 free parameters. If the count exceeds 15, cut scope.

- Ingest HYDE (population, land use) and NOAA paleoclimate reconstructions into `data/processed`
- Encode observation uncertainty explicitly — these are reconstructions, not measurements
- Python service: Sobol global sensitivity analysis + profile-likelihood over the 12 params
- Publish which parameters are estimable, which are weakly identified, which are not identified at all
- Delete or fix every non-identified parameter before proceeding. Fixing means pinning to a literature value and retagging as ESTIMATED.

**Exit gate:** A written identifiability report in `docs/model-cards/` stating, for each of the 12 parameters, whether the available data can constrain it. At least one parameter must be found non-identifiable and handled. If everything comes back cleanly identifiable on the first pass, the analysis is wrong — rerun it.

## Phase 4 — Rigor Track: calibration and validation

- ABC-SMC or PyMC inference over the surviving identifiable parameters
- Posteriors persisted to `ParamValue` with intervals, not point estimates
- Validation battery, each with a pre-registered tolerance written before the run:
  - Backcast: fit 500 BCE–1000 CE, predict 1000–1500 CE
  - Regional holdout: fit Nile, predict Yellow River
  - Prior predictive check: does the model generate plausible worlds before seeing data?
  - Ablation: remove the climate coupling, measure the loss in predictive skill
- Model card documenting scope, assumptions, failure modes, and what the model may not be used for

**Exit gate:** The model card reports at least one honest failure. A model that passes everything has tolerances set too loose or is overfit — treat a clean sweep as a bug and tighten until something breaks. Regional holdout performance must be reported whether or not it is good.

## Phase 5 — Sandbox Track: subsystem expansion

Now the fun part, on the same kernel, with everything correctly labeled.

- Port the useful models from the Trident spec: SEIRD with spatial coupling, gravity trade, Lanchester combat, cohort-component demography, replicator dynamics for sects
- Every constant not inherited from Phase 4 is tagged INVENTED with a one-line note on why it was chosen
- Subsystems ship in dependency order: agriculture → demography → economy → trade → disease → conflict → politics → culture → technology
- Each subsystem lands with a fixed-point implementation and a determinism test

**Exit gate:** Full 18-subsystem run, 5000 simulated years, reproducible from seed, no float in state, gate correctly reports the run as SANDBOX and refuses to promote any of it to Rigor.

## Phase 6 — Interface and the provenance inspector

Next.js. The differentiating feature is not the map, it is being able to click any event and see exactly why it happened.

- Map + timeline scrubber backed by snapshots
- Provenance inspector: click any state change → see the `Factor[]` breakdown, each factor's provenance tag color-coded, drill into contributing ticks
- Mode badge is permanent and unmissable. Sandbox output is watermarked in the UI and in every export.
- Run diff view for comparing two timelines

**Exit gate:** Any state value at any tick can be traced to its contributing factors in ≤3 clicks. No screen exists where Sandbox output could be mistaken for Rigor output.

## Phase 7 — Counterfactual engine

- Branch from any snapshot with a declared intervention
- Rigor branches: intervention must be a change to a CALIBRATED parameter within its posterior support, and the output is an interval over simulated quantities. No probability statements about historical outcomes. Ever. This is a hard product rule.
- Sandbox branches: anything goes, watermarked
- Diff engine: two runs → divergence timeline showing where and why they split

**Exit gate:** A Rigor counterfactual produces an interval and refuses to produce a narrative claim. Attempting `POST /counterfactual` with a Rigor run and an INVENTED-touching intervention returns 422 with the gate report.

## Phase 8 — Scenario packs and publishing

- Serializable scenario format: initial conditions + param set + interventions
- Shareable run permalinks (seed + config = anyone can reproduce byte-identically)
- 6–8 authored Sandbox scenario packs
- Public API for run submission

**Exit gate:** A third party can reproduce a published run from the permalink alone and get an identical state hash.

## Phase 9 — Deploy and harden

Railway: web, api, calibrate, Postgres. Spend caps on the calibration service before it ever runs unattended — Bayesian inference jobs are the cost risk here, not traffic.

**Exit gate:** Live, monitored, cost-capped, with the determinism and gate checks running on a schedule against production.

## Locked invariants

Never "fix" these. They are load-bearing.

1. No floats in simulation state. Fixed-point integers only.
2. All randomness from the kernel's seeded stream, substreamed per module.
3. Provenance is a required field on every parameter. There is no default.
4. Rigor mode blocks on INVENTED dependencies. The gate has no production bypass.
5. `seed + configHash + paramSetId` → deterministic terminal state hash.
6. Rigor mode emits intervals, never probabilities over historical counterfactuals.
7. Module execution order is explicit and fixed.
8. Sandbox output is watermarked everywhere it can leave the system.

## Known risks

**Scope creep in Phase 5.** The Sandbox subsystem list is where this project dies if it dies. Timebox it and ship an incomplete Sandbox rather than a delayed one.

**Phase 3 may kill the Rigor track.** If the identifiability analysis says twelve parameters cannot be constrained by the available data, that is a real finding and the correct response is to narrow to six, not to proceed anyway. Budget for the possibility that Rigor mode ends up smaller than planned. That outcome is still a success — a small defensible model beats a large indefensible one.

**Calibration cost.** PyMC on a coupled dynamical model is expensive. Cap spend before Phase 4, not during it.
