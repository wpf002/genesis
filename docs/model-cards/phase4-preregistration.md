# Pre-registration — Phase 4 calibration

**Written before the calibration was run.** Committed ahead of the results so the
tolerances cannot be adjusted to whatever the model happened to produce. The
roadmap requires this; git history is the evidence.

**Date:** 2026-08-14

## What is being calibrated

`growth_rate` only — the one parameter Phase 3 found robustly identifiable
(max Δ > 1600, interior optimum, stable across every σ assumption tested).

`climate_sensitivity` is **not** calibrated. Phase 3 and its global addendum both
found it non-identifiable, and at scale its fitted sign flips with preprocessing.
It is dropped from the Rigor model rather than pinned, because pinning implies a
value the data does not support.

Per-country carrying capacities are nuisance parameters. They are estimated but
are not findings, for the reason in the Phase 3 card: their verdicts move with
the σ assumption.

## Scope

- **Window:** 0–1700 CE, century steps. Climate is not in the model, so the
  800 CE floor imposed by asia2k no longer applies.
- **Regions:** every HYDE country clearing the minimum-population filter.
- **Model:** logistic growth, `P[t+1] = P[t] + r·P[t]·(1 − P[t]/K_i)`, shared `r`.
- **Observation model:** Gaussian on population with σ from HYDE's base/lower/upper
  envelope treated as ±1σ, the assumption documented in the Phase 3 card.

## Pre-registered tolerances

A test fails if the stated threshold is not met. These are the numbers, fixed now.

| # | Test | Metric | Tolerance |
|---|---|---|---|
| V-01 | Convergence | R-hat on `growth_rate` | ≤ 1.01 |
| V-02 | Convergence | ESS bulk on `growth_rate` | ≥ 400 |
| V-03 | Backcast | Fit 0–1000 CE, predict 1100–1700. Median absolute relative error on held-out population | ≤ 0.50 |
| V-04 | Regional holdout | Fit Europe+Asia, predict Africa+Americas. Median absolute relative error | ≤ 0.75 |
| V-05 | Prior predictive | Share of prior-predictive terminal populations inside 10³–10¹⁰ people | ≥ 0.80 |
| V-06 | Ablation | Remove the logistic ceiling (pure exponential growth). Held-out error must get **worse** by | ≥ 10% |
| V-07 | Posterior width | `growth_rate` 94% HDI width, relative to its posterior mean | ≤ 0.50 |

## Expected failures

Stated in advance, so a clean sweep is visibly suspicious rather than reassuring:

- **V-04 is expected to fail.** HYDE's country population series are themselves
  modelled, and its allocation method differs by region and by data availability.
  A holdout across continents is testing HYDE's internal consistency as much as
  the model's transferability. If V-04 passes cleanly, suspect the tolerance was
  loose rather than concluding the model transfers.
- **V-03 is expected to be marginal.** Century steps give few points and the
  window covers plague, collapse and recovery that a single shared growth rate
  cannot represent.

If every test passes, the roadmap's instruction applies: treat it as a bug,
tighten until something breaks, and record what was tightened.
