# Model card — <name>

Fill this in from a REAL run. A DRY_RUN report may not be written into this
directory; `write_report` refuses.

- **Model**
- **Datasets** (name, version, checksum, license)
- **Window and regions**
- **Parameter set / posterior id**
- **Generated**

## Scope

What this model covers.

## What it may not be used for

## Identifiability

One row per free parameter. Verdicts come from the Phase 3 pipeline.

| Parameter | Total-order Sobol | Verdict | Action taken |
|---|---|---|---|

Non-identified parameters must be deleted, or pinned to a literature value and
retagged ESTIMATED. Say which, per parameter.

## Calibration

Method, priors, convergence diagnostics.

## Validation

Tolerances are pre-registered — written down before the run.

| Test | Tolerance (pre-registered) | Result | Pass |
|---|---|---|---|
| Backcast: fit 500 BCE–1000 CE, predict 1000–1500 CE | | | |
| Regional holdout: fit Nile, predict Yellow River | | | |
| Prior predictive check | | | |
| Ablation: remove climate coupling | | | |

Regional holdout performance is reported whether or not it is good.

## Failures

The exit gate requires at least one honest failure here. A clean sweep means the
tolerances were too loose or the model is overfit — treat it as a bug.

## Assumptions

## Known failure modes
