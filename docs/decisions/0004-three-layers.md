# ADR 0004 — Three layers: Rigor, Sandbox, Projection

**Status:** accepted
**Date:** 2026-08-13

## Context

The goal is comprehensive coverage — all of history, global geography, every
subsystem, plus something useful about the future. The Rigor track cannot deliver
that, and Phase 3 showed why with numbers rather than opinion:

- Annual regional climate reconstructions exist only for the Common Era, and
  mostly from 800 CE outside Europe.
- PAGES2k has no proxy within ~1500 km of the Nile Valley.
- Population and land use do cover 10,000 BCE onward (HYDE), but ship as
  base/lower/upper scenarios because they are themselves reconstructions.

So coverage and defensibility trade off directly. Forcing them into one artifact
is how the Trident spec failed: the invented constants become load-bearing before
anyone notices.

Genesis already has the mechanism to keep them apart. This ADR names the layers
and fixes their contracts.

## Decision

Three layers on one kernel. A layer is defined by the provenance it admits, the
claims it may make, and how it must be marked.

| | Rigor | Sandbox | Projection |
|---|---|---|---|
| Mode | `RIGOR` | `SANDBOX` | `PROJECTION` (not yet implemented) |
| Coverage | 800–1500 CE, Yellow River + Euro-Mediterranean | 10,000 BCE onward, global, 18 subsystems | Present to ~2100 |
| Provenance admitted | CALIBRATED, ESTIMATED | any | ESTIMATED (cited third-party projections) |
| Free parameters | ~6 | unbounded | none fitted here |
| Output | Posterior intervals over simulated quantities | Trajectories | Scenario trajectories, conditional on the cited scenario |
| Marking | Mode badge | Mode badge + hatch watermark on screen and every export | Mode badge + the scenario name, always |
| Gate behaviour | Blocks on INVENTED or unregistered ancestors | Never blocks | Blocks on INVENTED, same as Rigor |

### Rigor

Unchanged from the roadmap except in scope, which Phase 3 narrowed. Emits
intervals, never probabilities over historical counterfactuals.

### Sandbox

This is where comprehensive lives. Every subsystem, the whole timeline, the whole
map. Constants are INVENTED, labelled, and the gate keeps them out of Rigor.
Sandbox is not a lesser Rigor and is never described as provisional or
preliminary — those words imply it is on its way to being defensible. It is not.

There is no promotion path from Sandbox to Rigor other than calibration. A
parameter moves only by acquiring a posterior or a citation.

### Projection

New, and the one that needs the most discipline.

Genesis does not forecast. The Projection layer runs the kernel forward on
**published third-party projections supplied as inputs**, each registered
ESTIMATED with a citation — UN World Population Prospects for demography, the
SSP/CMIP6 scenario set for climate. Outputs are conditional on the named
scenario and must carry it: "under SSP2-4.5", never a bare number.

Rules:

1. No parameter is fitted in this layer. It consumes projections, it does not
   produce them.
2. Every output names its input scenario. A projection without its scenario is
   an unlabelled forecast.
3. No probability is attached to a scenario. SSPs are not weighted, and the
   model does not make them so.
4. The horizon is bounded by the cited source's horizon. Nothing extends past it.

Implementing this means adding `PROJECTION` to the `Mode` enum in
`packages/schema/prisma/schema.prisma` and to `MODE` in `@genesis/params`, and
extending `gateCheck`. Not done yet; Rigor and Sandbox come first.

## What crosses, and what does not

- Kernel, ledger, fixed-point arithmetic, snapshots: shared by all three.
- Parameter values: never cross upward. Calibration is the only route.
- A single run belongs to exactly one layer. There is no mixed run.
- Any export carries its layer. Sandbox and Projection exports are marked in the
  file itself, not only in the UI.

## Consequences

- "Comprehensive" is achievable, and honestly labelled, in Sandbox.
- Rigor stays small. That is the point, not a shortfall.
- The Projection layer is the most likely place for a claim to escape unlabelled,
  because its outputs look like predictions. Rule 2 is the load-bearing one.
