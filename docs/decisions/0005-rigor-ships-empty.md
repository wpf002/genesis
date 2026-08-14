# ADR 0005 — Rigor mode ships empty

**Status:** accepted
**Date:** 2026-08-14
**Supersedes the open question left by** `identifiability-800-1500.md` and
`phase4-calibration.md`.

## Context

Phases 3 and 4 tested the two parameters the Rigor track was built around. Both
failed, in different ways and for different reasons:

- **`climate_sensitivity`** — non-identifiable at 16 observations, still
  non-identifiable at 232, and at 408 it clears the χ² threshold while its fitted
  value ranges from −10.2 to +0.07 and flips sign depending on whether a linear
  trend is removed. It is absorbing trend, not measuring a climate response.
- **`growth_rate`** — identifiable, tight posterior, clean convergence, passes
  all seven pre-registered validation tests, and loses to freezing every
  country's population at its year-1000 value by 56%. Its continental estimates
  are also mutually exclusive, so the single global value it reports is an
  average of groups the data says are different.

Four options were on the table. Three are now closed by evidence:

1. *Ship the narrow result.* There is no narrow result. `growth_rate` has no
   skill, so shipping it would mean publishing a calibrated parameter whose model
   is beaten by a constant.
2. *Change the observable.* Still the only route that could work, but it needs an
   annually-resolved population proxy that does not currently exist in hand.
   MADA and the Büntgen scPDSI series give annual *climate*; the binding
   constraint was never climate.
3. *Resolve the σ question.* Moves two nuisance carrying capacities. Rescues
   nothing that matters.
4. *Put everything in Sandbox.* Where the work already is.

## Decision

**Rigor mode ships with zero calibrated parameters, and stays open.**

Not deleted, not quietly disabled, not shipped with a caveat. Explicitly empty,
and enforced:

1. `RIGOR_PARAMS` is an empty set in `@genesis/params`, and a test asserts it.
2. No parameter anywhere in the registry carries `CALIBRATED`. A test asserts
   that too, so promoting one requires deliberately editing the assertion.
3. `assertRigorRunnable` throws when asked to start a Rigor run, naming the model
   cards. The API and CLI both go through it.
4. The interface states that Rigor mode has no model, rather than showing an
   empty chart that reads as "no data yet".

## Why empty rather than deleted

The machinery is the valuable part and all of it works: the provenance gate, the
registry, the identifiability pipeline verified against Ishigami and a
non-identifiable-by-construction model, and a validation battery that caught a
model no amount of internal comparison would have caught. Deleting the track
would throw that away to avoid admitting the model failed.

An empty Rigor mode is also the honest product statement. Genesis claims to
enforce a boundary between calibrated and invented. Right now everything is on
the invented side. Saying so is the boundary working, not the boundary failing.

## What it takes to fill it

Any parameter promoted to `CALIBRATED` must pass the Phase 4 battery **including
V-08**, the baseline comparison. That test was not pre-registered — it was added
after seven tests passed on a model with no skill — and it is now the load-bearing
one. A model that cannot beat persistence does not get a tag.

## Consequences

- Genesis is, today, a Sandbox simulator with a rigorous empty compartment.
- Sandbox and Projection are unaffected. Neither ever claimed skill.
- The roadmap's Phase 4 validation list should gain a baseline comparison. That
  is an edit to Will's document, not mine to make.
