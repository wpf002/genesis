# ADR 0006 — Permalinks carry the scenario, not a key

**Status:** accepted
**Date:** 2026-08-15
**Phase:** 8

## Context

Phase 8's exit gate is that a third party can reproduce a published run from the
permalink alone and get an identical state hash. "Alone" is the whole gate. A
link of the form `/run/8f21c` satisfies it only while this server is up, holds
that row, and is running the same code it was running when the row was written.
None of those are things a reader can check.

## Decision

**A permalink carries the entire scenario.** `g1.<base64url payload>.<checksum>`,
where the payload is the canonical JSON of the scenario: seed, ticks, region set,
parameter overrides and interventions. A pack token runs about 350–650 bytes,
which is long for a URL and short for a guarantee. Reproduction reads nothing
from disk and nothing from a database.

**Titles and notes are not hashed.** `configHash` covers only what determines the
run. Renaming a published scenario has to leave its config hash alone, or the
hash stops meaning "this exact run" and starts meaning "this exact row".

**The permalink checksum covers the payload, not the config.** They are different
questions. The config hash answers "is this the same run"; the checksum answers
"did this link arrive intact". A token with an edited byte is rejected rather
than decoded into a different valid scenario.

**`paramSetId` hashes the values, not the keys.** Two scenarios that override
their way to the same numbers get the same id, which is the property locked
invariant #5 actually needs.

**Overriding a parameter marks it INVENTED.** Whatever the registry says a number
was fitted to, a number somebody typed into a scenario is invented. The factor
stops claiming the calibration. This is inert today — Rigor has no calibrated
parameters, see ADR 0005 — and is written now because the moment it matters is
the moment it is easy to forget.

## The trap this exposed

The first draft of the `plague-arrival` pack intervened on
`disease_spatial.importPressure`. It ran, it reproduced, and it returned the
baseline hash to the digit.

`disease_spatial` recomputes `importPressure` from trade volume every tick
without reading its previous value, and it runs before `disease_seird`, the only
reader. An intervention on it is overwritten before anything sees it. The
scenario looked like it did something and did nothing.

Interventions on that class of key are silent no-ops, and a silent no-op that
still produces a valid signed permalink is worse than an error. There is no
static test for it — whether a write survives depends on module order and on
whether the owner carries its own previous value — so the guard is dynamic: every
pack that declares an override or an intervention is run against
`baselineOf(pack)`, and a pack that reproduces its own baseline fails the build.

The pack now seeds `disease_seird.infectious` directly, which is carried forward.

## Consequences

- Permalinks are long. Accepted; they are meant to be pasted, not typed.
- A kernel change moves every terminal hash. `PublishedRun` reports
  `kernelVersion` so a failed reproduction can be told from a real disagreement.
- Submission is open, so the public API caps a request at 20,000 tick-regions.
  The scenario format itself allows more — the cap belongs to the endpoint, not
  to the format, and anyone can run the same permalink locally without it.
- Fastify's default `maxParamLength` is 100 characters and 404s past it, which
  reads as "no such run". Raised to 8192 in `buildServer`.
