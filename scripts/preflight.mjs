#!/usr/bin/env node
//
// Everything that has to be true before a build is worth trusting, in one
// command, on this machine.
//
//   pnpm preflight
//
// It runs the same checks CI runs and then two CI does not: it starts the API in
// process and reads /ready, and it reproduces every scenario pack from its own
// permalink. Both of those are the kind of thing that passes in a unit test and
// fails once the pieces are assembled.
//
// Every step prints PASS or FAIL with its own timing. The first FAIL does not
// stop the run - a report that says "3 of 9 failed" is more useful than one that
// says "the second thing failed", and the exit code still reflects the worst of
// them.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv.slice(2);

const steps = [
  ['typecheck', () => run('pnpm', ['typecheck'])],
  ['lint', () => run('pnpm', ['lint'])],
  ['build', () => run('pnpm', ['build'])],
  // @genesis/schema and @genesis/shared genuinely have no tests and say so, so
  // "nothing ran" is only a failure if no package ran anything.
  ['test', () => run('pnpm', ['test'], { expect: /Tests\s+\d+ passed/ })],
  ['determinism', () => run('pnpm', ['determinism'])],
  ['gate', () => run('pnpm', ['gate'])],
  ['readiness', readiness],
  ['permalinks', permalinks],
  [
    'calibrate',
    () => run('pnpm', ['--filter', '@genesis/calibrate', 'py:test'], { expect: /\d+ passed/ }),
  ],
];

// A command that exits 0 without doing anything is the failure this whole script
// exists to catch, and the first draft shipped one: `--filter genesis-calibrate`
// matched no workspace (the package is `@genesis/calibrate`), pnpm printed "No
// projects matched" and exited 0, and preflight reported PASS in 0.1s.
//
// This pattern is never legitimate. "No test files found" is - two packages have
// no tests on purpose - so that case is handled per step by `expect` instead.
const MATCHED_NOTHING = /No projects matched/i;

function run(command, args, { optional = false, expect } = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  if (result.error !== undefined || result.status === null) {
    return optional
      ? { ok: true, detail: `skipped (${command} unavailable)` }
      : { ok: false, detail: String(result.error ?? 'did not start') };
  }
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (MATCHED_NOTHING.test(output)) {
    return { ok: false, detail: 'the filter matched no workspace, so nothing ran' };
  }
  if (result.status === 0 && expect !== undefined && !expect.test(output)) {
    return {
      ok: false,
      detail: `exited 0 but printed no sign of work (expected ${expect})`,
    };
  }
  if (result.status !== 0) {
    const line =
      output
        .split('\n')
        .filter((text) => /error|fail|✖/i.test(text))
        .slice(-1)[0] ?? `exit ${result.status}`;
    return { ok: false, detail: line.trim().slice(0, 160) };
  }
  return { ok: true, detail: '' };
}

// The assembled service, not the routes in isolation.
async function readiness() {
  const { buildServer } = await import(`${root}/apps/api/dist/index.js`);
  const app = buildServer({ logger: false });
  await app.ready();
  const res = await app.inject({ method: 'GET', url: '/ready' });
  await app.close();

  const body = res.json();
  const failed = (body.checks ?? []).filter((check) => !check.ok);
  return {
    ok: res.statusCode === 200 && failed.length === 0,
    detail:
      failed.length === 0
        ? (body.checks ?? []).map((check) => check.name).join(', ')
        : failed.map((check) => `${check.name}: ${check.detail}`).join('; '),
  };
}

// The Phase 8 exit gate, run for real: token in, same hash out, every pack.
async function permalinks() {
  const { SCENARIO_PACKS, publish, verifyPermalink } = await import(
    `${root}/packages/replay/dist/index.js`
  );
  const broken = [];
  for (const pack of SCENARIO_PACKS) {
    const published = publish(pack);
    const check = verifyPermalink(published.token, published.terminalHash);
    if (!check.reproduced) broken.push(pack.id);
  }
  return {
    ok: broken.length === 0,
    detail:
      broken.length === 0
        ? `${SCENARIO_PACKS.length} packs reproduced from their own permalinks`
        : `did not reproduce: ${broken.join(', ')}`,
  };
}

const selected = only.length === 0 ? steps : steps.filter(([name]) => only.includes(name));
if (selected.length === 0) {
  console.error(`preflight: no step matches ${only.join(', ')}`);
  console.error(`known steps: ${steps.map(([name]) => name).join(', ')}`);
  process.exit(2);
}

let failures = 0;
for (const [name, step] of selected) {
  const started = Date.now();
  let result;
  try {
    result = await step();
  } catch (error) {
    result = { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (!result.ok) failures += 1;
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(
    `${status}  ${name.padEnd(13)} ${seconds.padStart(6)}s  ${result.detail ?? ''}`.trimEnd(),
  );
}

console.log(
  failures === 0
    ? `\npreflight: ${selected.length} checks passed`
    : `\npreflight: ${failures} of ${selected.length} checks FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
