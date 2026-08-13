# ADR 0001 — `determinism` and `gate` are declared no-ops in Phase 0

**Status:** accepted
**Date:** 2026-08-12

## Context

The Phase 0 exit gate requires CI green on an empty tree. `bootstrap.sh` wires two
CI steps — `pnpm determinism` and `pnpm gate` — that cannot do their job yet: there
is no kernel to replay (Phase 1) and no parameter registry to walk (Phase 2).

Three options:

1. Delete the CI steps and add them back later. Rejected — the steps get forgotten,
   and the first PR that needs them is also the PR that adds them, so they land
   unreviewed and always-passing.
2. Have the stubs print `PASS`. Rejected outright. A gate that reports success
   before it can check anything is worse than no gate: it manufactures exactly the
   false assurance this project exists to avoid.
3. Have the stubs exit 0 with an explicit `NOT_IMPLEMENTED` marker, plus a tripwire.

## Decision

Option 3. Both stubs print `NOT_IMPLEMENTED` and name the phase that will implement
them. Neither prints `PASS`.

Each stub reads a `PHASE` constant from its own package and **fails** if that constant
has advanced past the phase the stub belongs to:

- `packages/kernel/src/bin/determinism-check.ts` fails if `@genesis/kernel` reports
  `PHASE >= 1`.
- `packages/params/src/bin/gate-check.ts` fails if `@genesis/params` reports
  `PHASE >= 2`.

So the stub cannot silently outlive its phase. The commit that lands the real kernel
must bump `PHASE` to 1, which turns CI red until the real determinism check replaces
the stub.

## Consequences

- CI is green in Phase 0 without any check claiming to have verified something.
- `grep -r NOT_IMPLEMENTED` names everything still outstanding.
- Whoever implements Phase 1 or 2 is forced to replace the stub in the same commit.
