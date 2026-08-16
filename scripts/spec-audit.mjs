#!/usr/bin/env node
//
// Does the Alternate Timeline brief actually exist in this repo?
//
//   node scripts/spec-audit.mjs
//
// Every requirement from the brief, one row each, checked against the source
// rather than against anybody's memory. It exists because "is it done" was
// answered from recollection three times and was wrong three times.
//
// WHAT THIS PROVES: that an implementation is present and reachable, and that
// the tests covering it pass.
//
// WHAT IT DOES NOT PROVE: that the implementation is correct or that it looks
// right. A row can pass here and still be wrong on screen. Treat FAIL as
// conclusive and PASS as "worth looking at yourself".

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES = [
  'packages/replay/src',
  'packages/models/src',
  'packages/params/src',
  'packages/kernel/src',
  'apps/web/src',
  'apps/api/src',
];

/** Every source file's text, concatenated once. */
function corpus() {
  const files = [];
  for (const dir of SOURCES) {
    const full = join(root, dir);
    if (!existsSync(full)) continue;
    files.push(
      ...globSync('**/*.{ts,tsx}', { cwd: full })
        .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
        .map((f) => join(full, f)),
    );
  }
  return files.map((f) => ({ path: f.slice(root.length + 1), text: readFileSync(f, 'utf8') }));
}

const FILES = corpus();

function find(pattern) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  return FILES.filter((f) => re.test(f.text)).map((f) => f.path);
}

// section, requirement, pattern that proves it
const CHECKS = [
  ['Reality tree', 'Reality tree with one history then a split', /ONE HISTORY[\s\S]*POINT OF DIVERGENCE/],
  ['Reality tree', 'Branch geometry carries Reality Distance', /distance\.map\(\(d\) => d\.distance\)/],
  ['Reality tree', 'Zoom and pan', /setZoom|maxPan/],
  ['Reality tree', 'Cascade markers on the tree', /cascades\.map/],

  ['Modes', 'Actual history / alternate / compare / why / future', /'history' \| 'alternate' \| 'compare' \| 'cause' \| 'future'/],

  ['Three layers', 'Historical record layer, separate and sourced', /WORLD_POPULATION|HISTORICAL_EVENTS/],
  ['Three layers', 'Model against record with uncertainty band', /modelAgainstRecord/],
  ['Three layers', 'Sources with citations', /SOURCES.*readonly Source|cite:/s],
  ['Three layers', 'History is not simulation input', /not simulation input|never a model input|nothing here is hashed/i],

  ['Divergence', 'Dated divergence: baseline params to year, then switch', /branched\.restore\(run\.snapshot\(\)\)|next\.restore\(current\.snapshot\(\)\)/],
  ['Divergence', 'Premise and engine lever shown apart', /Genesis interpretation/],
  ['Divergence', 'Structural archetypes', /ARCHETYPES|lever\.archetype/],
  ['Divergence', 'Structural analogues', /Structural analogues/],

  ['Analysis', 'Reality Distance with published formula', /DISTANCE_METHOD/],
  ['Analysis', 'Distance weights registered as INVENTED params', /distance\.weight\./],
  ['Analysis', 'First difference', /export function firstDifference/],
  ['Analysis', 'Follow the divergence', /Follow the divergence/],
  ['Analysis', 'Cascade events, model-detected', /export function cascades/],
  ['Analysis', 'Convergence detection', /export function convergence/],
  ['Analysis', 'Butterfly effect cascade', /export function butterfly/],
  ['Analysis', 'Ripple map with stated fidelity', /aggregated difference trace/],
  ['Analysis', 'Reality DNA', /export function realityDna/],
  ['Analysis', 'Historical pressures', /export function pressures/],

  ['Evidence', 'Seven evidence classes kept distinct', /'actual-history'[\s\S]*'not-modelled'/],
  ['Evidence', 'Engine representability labels', /REPRESENTABILITY/],
  ['Evidence', 'Qualitative support, explicitly not probabilities', /NOT_A_PROBABILITY/],
  ['Evidence', 'Source / model / interpretation control', /'source' \| 'model' \| 'interpretation'/],

  ['Maps', 'Baseline and alternate side by side', /What happened[\s\S]*What if/],
  ['Maps', 'Diff map, alternate minus baseline', /alternate − baseline|export function DiffMap/],
  ['Maps', 'Civilization state panel per country', /export function CivilizationState/],
  ['Maps', 'Projection hatch past the observation boundary', /url\(#forecasthatch\)/],
  ['Maps', 'Sandbox watermark on the map itself', /worldhatch|diffhatch/],
  ['Maps', 'Shading is state, never territory', /No border moves in Genesis/],

  ['Timeline', 'Time scrubber with era markers', /const ERAS: readonly \{ year: number/],
  ['Timeline', 'Timeline node detail panel', /export function NodeDetail/],
  ['Timeline', 'Playback speed steps', /const SPEEDS/],
  ['Timeline', 'Auto-follow divergence', /autoFollow/],
  ['Timeline', 'Playback is a timer, not rAF', /setInterval|setTimeout\(\(\) => \{[\s\S]*setIndex/],
  ['Timeline', 'Outside simulation horizon notice', /beyondHorizon/],

  ['Chronicle', 'Chronicle derived from state', /export function chronicle\b/],
  ['Chronicle', 'Entries carry baseline, counterfactual and delta', /export function chronicleEntries/],

  ['Branching', 'Chained dated divergences', /export function runBranch/],
  ['Branching', 'Fork without mutating the parent', /export function fork/],
  ['Branching', 'Phases in the scenario format', /scenarioPhaseSchema/],
  ['Branching', 'Multiverse comparison', /MultiverseResult/],

  ['Authoring', 'Premise to lever workflow', /SUGGESTION_CAVEAT/],
  ['Authoring', 'Preview shows changes before running', /export function preview/],
  ['Authoring', 'User overrides marked INVENTED', /invented by definition/i],
  ['Authoring', 'Possibility tree with engine support', /export function PossibilityTree/],
  ['Authoring', 'Simulate approximation', /Simulate approximation/],

  ['People', 'People as an interpretive layer', /export const PEOPLE/],
  ['People', 'Identity continuity degrades with divergence', /export function continuity/],

  ['Identity', 'Permalink carries the whole scenario', /export function encodePermalink/],
  ['Identity', 'Run identity: seed, config hash, param set, terminal', /Config hash[\s\S]*Parameter set[\s\S]*Terminal state hash/],
  ['Identity', 'Verify run in the interface', /Verify run/],
  ['Identity', 'Inspector reachable from any figure', /export function WhyLink/],

  ['Limits', 'Malthusian rebound explained', /Malthusian|carrying capacity/],
  ['Limits', 'No spatial adjacency stated', /spatial adjacency/],
  ['Limits', 'Identical country starts stated', /same invented population|not calibrated/i],
  ['Limits', 'Ledger-off equivalence stated', /identical either way|byte-identical/],

  ['Invariants', 'Rigor ships empty and refuses', /assertRigorRunnable/],
  ['Invariants', 'Rigor emits intervals, never probabilities', /NarrativeClaimRefused/],
  ['Invariants', 'Sandbox watermark cannot be disabled', /UnmarkedExport/],
  ['Invariants', 'Fixed-point only', /FIXED_SCALE/],
  ['Invariants', 'Module order explicit', /MODULE_ORDER/],
];

let failed = 0;
let section = '';
console.log('\nGENESIS — alternate timeline brief, audited against source\n');

for (const [group, requirement, pattern] of CHECKS) {
  if (group !== section) {
    section = group;
    console.log(`\n${group.toUpperCase()}`);
  }
  const hits = find(pattern);
  const ok = hits.length > 0;
  if (!ok) failed += 1;
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${requirement.padEnd(52)} ${ok ? hits[0] : '— not found in source'}`,
  );
}

console.log(`\n${CHECKS.length - failed}/${CHECKS.length} requirements present in source.`);

// Presence is not correctness. The suites are the other half.
let tests = 'not run';
try {
  const out = execSync('pnpm turbo test 2>&1', { cwd: root, encoding: 'utf8' });
  const counts = [...out.matchAll(/Tests\s+(\d+) passed/g)].map((m) => Number(m[1]));
  const failures = /Tests\s+\d+ failed|✕/.test(out);
  tests = failures
    ? 'FAILING'
    : `${counts.reduce((a, b) => a + b, 0)} passing across ${counts.length} packages`;
} catch {
  tests = 'FAILING';
}
console.log(`Tests: ${tests}`);

console.log(
  '\nThis proves the code is present and the suites pass. It does not prove it is\n' +
    'correct or that it reads well on screen — check those yourself.\n',
);

process.exit(failed === 0 && tests !== 'FAILING' ? 0 : 1);
