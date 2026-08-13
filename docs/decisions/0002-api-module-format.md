# ADR 0002 — `apps/api` is CommonJS, and that will collide with the ESM packages

**Status:** accepted, with a known expiry
**Date:** 2026-08-12

## Context

`bootstrap.sh` carries an explicit constraint inherited from an earlier project:

> NOTE: do NOT add `"type": "module"` to `apps/api` — same constraint as Crossbar.

Every workspace package (`@genesis/kernel`, `params`, `models`, `replay`, `shared`,
`schema`) is declared `"type": "module"` and emits ESM. Fastify 4 is CommonJS, so the
API app itself is coherent as CJS.

The collision is not visible in Phase 0 because `apps/api` does not yet import a
workspace package. It becomes visible the first time it does:

- Compiled CJS emits `require("@genesis/kernel")`.
- On Node 20 (the version CI pins), `require()` of an ESM module throws
  `ERR_REQUIRE_ESM`.
- On Node 22.12+, `require(esm)` is supported and the same code works — which is worse,
  because it means the failure is version-dependent and will not reproduce locally for
  anyone on a newer Node.

## Decision

Honour the constraint for now. `apps/api/tsconfig.json` sets `"module": "CommonJS"` and
`"moduleResolution": "Node10"` so the emitted `dist/` is actually runnable as CJS,
rather than emitting ESM syntax into a CJS package and failing at startup.

This decision expires the first time `apps/api` imports a workspace package —
that is, at Phase 1 when it wires up the kernel.

## Options at expiry

1. **Make `apps/api` ESM** (`"type": "module"`, `module: NodeNext`). Fastify 4 is
   importable from ESM, so this is mostly mechanical. Consistent with the rest of the
   tree. Recommended unless the Crossbar constraint has a reason not recorded here.
2. **Dual-emit the workspace packages** (ESM + CJS via package `exports`). More build
   surface, more ways to ship a subtly different artifact to two consumers — bad
   trade for a project whose whole premise is byte-identical reproducibility.
3. **Raise the Node floor to 22.12+** and rely on `require(esm)`. Cheapest, but it
   makes the module graph work by accident rather than by declaration.

Whoever hits this should record the resolution as ADR 0003 rather than editing this file.
