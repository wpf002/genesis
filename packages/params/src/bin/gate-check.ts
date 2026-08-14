// The Phase 2 exit gate, executable. Runs in CI on every push.
//
// It checks the gate itself, not just the current model set, because in Phase 2
// there are no Rigor models yet. When real ones land they get added to
// RIGOR_SUITES and this same CLI starts blocking on them.
//
// It does not print PASS unless every assertion below held.

import { PHASE } from '../index.js';
import { formatGateReport, gateCheck } from '../provenance/gate.js';
import { paramDeclSchema } from '../registry/registry.js';
import { assertRigorRunnable, RIGOR_PARAMS, RigorUnavailable } from '../registry/rigor.js';
import { SANDBOX_PARAMS } from '../registry/seed.js';
import {
  cleanFixture,
  inventedFixture,
  unregisteredFixture,
} from '../testing/fixtures.js';

const REQUIRED_PHASE = 3;

if (PHASE >= REQUIRED_PHASE) {
  console.error(`gate: params reports Phase ${PHASE}; this check covers Phase 2 only.`);
  process.exit(1);
}

const failures: string[] = [];
const notes: string[] = [];

// 1 — the seeded registry must be internally valid.
{
  let invalid = 0;
  const keys = new Set<string>();
  for (const decl of SANDBOX_PARAMS) {
    const parsed = paramDeclSchema.safeParse(decl);
    if (!parsed.success) {
      invalid += 1;
      failures.push(`registry: ${decl.key} is invalid — ${parsed.error.issues[0]?.message}`);
    }
    if (keys.has(decl.key)) failures.push(`registry: duplicate key ${decl.key}`);
    keys.add(decl.key);
  }
  const invented = SANDBOX_PARAMS.filter((d) => d.provenance === 'INVENTED').length;
  if (invented !== SANDBOX_PARAMS.length) {
    failures.push('registry: the sandbox seed set must be entirely INVENTED');
  }
  if (invalid === 0) notes.push(`registry: ${SANDBOX_PARAMS.length} INVENTED params valid`);
}

// 2 — a Rigor run with an INVENTED ancestor is refused, with the path named.
{
  const fixture = inventedFixture();
  const report = gateCheck({
    mode: 'RIGOR',
    graph: fixture.graph,
    registry: fixture.registry,
    outputs: [fixture.output],
  });
  const violation = report.violations[0];
  if (report.status !== 'BLOCKED') {
    failures.push(`gate: INVENTED ancestor produced ${report.status}, expected BLOCKED`);
  } else if (violation === undefined || violation.path.length < 3) {
    failures.push('gate: BLOCKED without naming a full path');
  } else {
    notes.push(`blocked: ${violation.path.join(' -> ')}`);
  }
}

// 3 — an unregistered parameter is refused too.
{
  const fixture = unregisteredFixture();
  const report = gateCheck({
    mode: 'RIGOR',
    graph: fixture.graph,
    registry: fixture.registry,
    outputs: [fixture.output],
  });
  if (report.status !== 'BLOCKED' || report.violations[0]?.reason !== 'UNREGISTERED') {
    failures.push(`gate: unregistered param produced ${report.status}, expected BLOCKED`);
  }
}

// 4 — a clean Rigor run passes. Without this the gate could block everything.
const RIGOR_SUITES = [{ name: 'clean-fixture', fixture: cleanFixture() }];
for (const suite of RIGOR_SUITES) {
  const report = gateCheck({
    mode: 'RIGOR',
    graph: suite.fixture.graph,
    registry: suite.fixture.registry,
  });
  if (report.status !== 'PASS') {
    failures.push(`gate: ${suite.name} produced ${report.status}\n${formatGateReport(report)}`);
  }
}

// 5 — the gate cannot be switched off in production.
{
  const fixture = inventedFixture();
  const report = gateCheck({
    mode: 'RIGOR',
    graph: fixture.graph,
    registry: fixture.registry,
    outputs: [fixture.output],
    env: { NODE_ENV: 'production', GENESIS_PROVENANCE_STRICT: 'false' },
  });
  if (report.status !== 'BLOCKED') {
    failures.push(
      `gate: GENESIS_PROVENANCE_STRICT=false relaxed the gate under NODE_ENV=production (${report.status})`,
    );
  }
  if (!report.productionLocked) {
    failures.push('gate: production did not report as locked');
  }
}

// 6 — Sandbox is never blocked, and never unmarked.
{
  const fixture = inventedFixture();
  const report = gateCheck({
    mode: 'SANDBOX',
    graph: fixture.graph,
    registry: fixture.registry,
  });
  if (report.status !== 'PASS' || !report.watermarkRequired) {
    failures.push(
      `gate: SANDBOX produced status=${report.status} watermark=${report.watermarkRequired}`,
    );
  }
}

// 7 — Rigor mode is empty and says so (ADR 0005).
{
  if (RIGOR_PARAMS.length !== 0) {
    failures.push('gate: RIGOR_PARAMS is non-empty but ADR 0005 says Rigor ships empty');
  }
  try {
    assertRigorRunnable();
    failures.push('gate: a Rigor run was allowed to start with no calibrated parameters');
  } catch (error) {
    if (!(error instanceof RigorUnavailable)) throw error;
    notes.push('rigor: 0 calibrated parameters, runs refused (ADR 0005)');
  }
}

if (failures.length > 0) {
  console.error('gate: FAILED');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('gate: PASS');
for (const note of notes) console.log(`  ${note}`);
