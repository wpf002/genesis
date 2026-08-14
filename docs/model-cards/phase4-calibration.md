# Model card — worldwide logistic growth, 0–1700 CE

**Status:** complete. This is the Phase 4 exit report.
**Generated:** 2026-08-14
**Mode:** REAL
**Reproduce:** `uv run python -m genesis_calibrate.run_phase4 --generated 2026-08-14`
**Pre-registration:** `phase4-preregistration.md`, committed at `bece7bc` before this ran.

## Headline

`growth_rate` calibrates cleanly and means nothing. The posterior is tight
(0.1894, 94% interval [0.1748, 0.2028] per century) and every convergence and
validation test in the pre-registered battery passes — and the model is still
**56% worse than assuming population never changes**, and the single shared
growth rate it reports is contradicted by its own continental subsets.

Rigor mode has nothing to ship from this scope.

## Scope

| | |
|---|---|
| Window | 0–1700 CE, century steps |
| Countries | 110, worldwide |
| Observations | 1,980 |
| Model | `P[t+1] = P[t] + r·P[t]·(1 − P[t]/K_i)`, `r` shared, `K_i` hierarchical |
| Inference | PyMC NUTS, 4 chains, 2000 tune / 2000 draw |
| Climate | **not in the model.** Phase 3 found the coupling non-identifiable |

## Results against the pre-registered battery

| # | Test | Value | Tolerance | |
|---|---|---|---|---|
| V-01 | R-hat | 1.0036 | ≤ 1.01 | PASS |
| V-02 | ESS bulk | 1453 | ≥ 400 | PASS |
| V-03 | Backcast error, 1100–1700 | 0.4569 | ≤ 0.50 | PASS |
| V-04 | Cross-continent holdout | 0.2787 | ≤ 0.75 | PASS |
| V-05 | Prior predictive plausible | 0.85 | ≥ 0.80 | PASS |
| V-06 | Ablation degrades by | 0.2241 | ≥ 0.10 | PASS |
| V-07 | Posterior width / mean | 0.1477 | ≤ 0.50 | PASS |

All seven passed. The roadmap says to treat a clean sweep as a bug rather than a
result, so two further tests were added.

## The two tests that were not pre-registered

Added **after** the clean sweep, and stated as post-hoc so nobody reads them as
predictions. Both are harder than anything in the original battery, and the model
fails both.

| # | Test | Value | Tolerance | |
|---|---|---|---|---|
| V-08 | Backcast error ÷ persistence-baseline error | **1.5603** | < 1.0 | **FAIL** |
| V-09 | Share of continental pairs whose 94% intervals overlap | **0.3333** | 1.0 | **FAIL** |

### V-08 — the model has no skill

Predicting 1100–1700 CE:

- calibrated model: median absolute relative error **0.457**
- freezing every country's population at its year-1000 value: **0.293**

Doing nothing beats the model by a wide margin. Nothing in V-01 to V-07 could
detect this, because every one of them measures the model against itself or
against a worse version of itself. V-06's ablation compares logistic growth to
exponential growth — both are worse than a straight line.

### V-09 — one shared growth rate is not supported

Fitting `r` separately per continent:

| Continent | n | `growth_rate` 94% interval |
|---|---|---|
| Europe | 29 | [0.0724, 0.0885] |
| Asia | 35 | [0.0903, 0.1159] |
| Africa | 26 | [0.2072, 0.2403] |
| Americas | 12 | [0.0714, 0.1174] |

Two of six pairs overlap. Europe and Asia are disjoint. Africa overlaps nothing
and sits at roughly 2.5× the European rate. The pooled global value of 0.1894 is
an artifact of averaging groups the data says are different — it is not a
property of the world, and it is not equal to any continent's estimate.

## What this model may not be used for

- Predicting population anywhere. It is beaten by a constant.
- Any statement about a global human growth rate. V-09 refutes the premise.
- Anything involving climate. It is not in the model.
- Any period outside 0–1700 CE, and especially not forward.

## Honest assessment

The Phase 4 gate asks for at least one honest failure. There are two, and they
are not marginal — they invalidate the model rather than qualifying it.

Worth stating plainly: **a full Bayesian calibration with clean convergence,
tight posteriors and seven passing validation tests produced a model with no
predictive skill.** The battery was pre-registered in good faith and it was not
enough. What caught the problem was a baseline comparison, which costs three
lines and was not in the roadmap's list.

The lesson generalizes past this model: no set of tests that only compares a
model to itself can establish that the model is worth anything.

## Consequences

1. **V-08 and V-09 are now permanent.** They run on every Phase 4 execution.
2. **A baseline comparison belongs in every future validation battery.** The
   roadmap's Phase 4 list should be amended; that is Will's call, not mine.
3. **Rigor mode currently has no shippable model.** The honest options are the
   same four from the Phase 3 card, now with the added knowledge that the
   surviving parameter does not survive contact with a baseline.
4. **Sandbox and Projection are unaffected.** They never claimed skill.

## Provenance

`growth_rate` is **not** promoted to CALIBRATED. A parameter whose model cannot
beat a constant has not earned the tag, and the provenance gate exists precisely
to stop that promotion happening quietly.
