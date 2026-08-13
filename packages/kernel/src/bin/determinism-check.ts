// The Phase 1 exit gate, executable. Runs in CI on every push.
//
//   1. 1000 runs at the same seed produce byte-identical terminal state hashes.
//   2. Restore-from-snapshot at tick k and continue matches an uninterrupted run.
//   3. Adding a no-op module does not change any hash.
//
// Check 4 is a control: different seeds must diverge. Without it, a kernel that
// returned a constant hash would pass the first three.

import { PHASE } from '../index.js';
import { Run, terminalHash, type RunOptions } from '../tick/loop.js';
import { noopModule, REFERENCE_MODULES } from '../testing/reference-model.js';

const REQUIRED_PHASE = 2;
const REPLAYS = 1000;
const TICKS = 200;
const SNAPSHOT_TICK = 73;
const SEED = 20260806n;

if (PHASE >= REQUIRED_PHASE) {
  console.error(
    `determinism: kernel reports Phase ${PHASE}; this check covers Phase 1 only.`,
  );
  process.exit(1);
}

const failures: string[] = [];
const options: RunOptions = { seed: SEED, modules: REFERENCE_MODULES };

// 1 — replay stability
const reference = terminalHash(options, TICKS);
let mismatches = 0;
for (let i = 1; i < REPLAYS; i++) {
  if (terminalHash(options, TICKS) !== reference) mismatches += 1;
}
if (mismatches > 0) {
  failures.push(`${mismatches}/${REPLAYS} replays diverged from ${reference}`);
}

// 2 — snapshot/restore equivalence
{
  const interrupted = new Run(options);
  interrupted.advanceTo(SNAPSHOT_TICK);
  const snapshot = interrupted.snapshot();
  interrupted.advanceTo(TICKS);
  const straightThrough = interrupted.stateHash();

  const restored = new Run(options);
  restored.advanceTo(TICKS); // deliberately overshoot, then rewind via restore
  restored.restore(snapshot);
  if (restored.tick !== SNAPSHOT_TICK) {
    failures.push(`restore left tick at ${restored.tick}, expected ${SNAPSHOT_TICK}`);
  }
  restored.advanceTo(TICKS);

  if (restored.stateHash() !== straightThrough) {
    failures.push(
      `restore-and-continue produced ${restored.stateHash()}, uninterrupted produced ${straightThrough}`,
    );
  }
  if (straightThrough !== reference) {
    failures.push('uninterrupted run disagreed with the replay reference');
  }
}

// 3 — a no-op module must not perturb anything
{
  const withNoop = terminalHash(
    { seed: SEED, modules: [...REFERENCE_MODULES, noopModule] },
    TICKS,
  );
  if (withNoop !== reference) {
    failures.push(`appending a no-op module changed the hash to ${withNoop}`);
  }

  const noopFirst = terminalHash(
    { seed: SEED, modules: [noopModule, ...REFERENCE_MODULES] },
    TICKS,
  );
  if (noopFirst !== reference) {
    failures.push(`prepending a no-op module changed the hash to ${noopFirst}`);
  }
}

// 4 — control: a different seed must produce a different hash
{
  const other = terminalHash({ seed: SEED + 1n, modules: REFERENCE_MODULES }, TICKS);
  if (other === reference) {
    failures.push('a different seed produced an identical hash; the run is not seeded');
  }
}

if (failures.length > 0) {
  console.error('determinism: FAILED');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `determinism: PASS — ${REPLAYS} replays x ${TICKS} ticks, snapshot at ${SNAPSHOT_TICK}, terminal ${reference}`,
);
