# ADR 0003 — `apps/api` is ESM

**Status:** accepted. Supersedes [ADR 0002](0002-api-module-format.md).
**Date:** 2026-08-13

## Context

ADR 0002 recorded that the CommonJS constraint on `apps/api` would expire the
first time the app imported a workspace package. Phase 1 is that moment: the API
now reports the kernel version on `/health`.

The failure ADR 0002 predicted is version-dependent, which is the worst kind.
Compiled CJS emits `require("@genesis/kernel")`; that throws `ERR_REQUIRE_ESM` on
Node 20, which CI pins, and silently succeeds on Node 22.12+, which most
development machines run. It would have been a CI-only failure that nobody could
reproduce locally.

## Decision

Option 1 from ADR 0002. `apps/api` declares `"type": "module"` and its tsconfig
drops the `module: CommonJS` / `moduleResolution: Node10` override, so it matches
every other package in the tree.

Fastify 4 and `@fastify/cors` are CommonJS, which is fine — a default import from
ESM resolves to `module.exports`. Verified by booting the built output and
hitting the endpoint, not only by typechecking:

```
$ node apps/api/dist/index.js
$ curl -s localhost:4300/health
{"status":"ok","phase":1,"kernel":"0.1.0","mode":null}
```

The one code change beyond config: `require.main === module` has no ESM
equivalent, so entrypoint detection is now
`process.argv[1] === fileURLToPath(import.meta.url)`.

## Consequences

- One module format across the whole workspace. Nothing dual-emits.
- The `bootstrap.sh` note "do NOT add `type: module` to apps/api — same
  constraint as Crossbar" no longer holds here. If that constraint has a reason
  that was never written down, this is the decision to revisit; the header of
  `bootstrap.sh` points at this file.
- Relative imports inside `apps/api` need explicit `.js` extensions, matching the
  packages.
