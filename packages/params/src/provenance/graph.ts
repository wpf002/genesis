// Dependency graph over the kernel's Factor ledger.
//
// Two edge kinds: a state key reads other state keys, and a state key uses
// parameters directly. Ancestry is the transitive closure of the first, checked
// against the second at every step. Cycles are expected — state keys depend on
// each other across ticks — so traversal is a visited-set BFS.

import type { LedgerEntry } from '@genesis/kernel';

export interface DependencyGraph {
  /** Every state key written, in first-write order. */
  readonly outputs: readonly string[];
  /** state key -> state keys read while producing it */
  readonly reads: ReadonlyMap<string, ReadonlySet<string>>;
  /** state key -> parameter keys used directly */
  readonly params: ReadonlyMap<string, ReadonlySet<string>>;
}

export function buildDependencyGraph(entries: readonly LedgerEntry[]): DependencyGraph {
  const outputs: string[] = [];
  const seen = new Set<string>();
  const reads = new Map<string, Set<string>>();
  const params = new Map<string, Set<string>>();

  for (const entry of entries) {
    if (!seen.has(entry.stateKey)) {
      seen.add(entry.stateKey);
      outputs.push(entry.stateKey);
    }
    let readSet = reads.get(entry.stateKey);
    if (readSet === undefined) {
      readSet = new Set<string>();
      reads.set(entry.stateKey, readSet);
    }
    for (const read of entry.reads) {
      // A self-read carries no information and only makes paths longer.
      if (read !== entry.stateKey) readSet.add(read);
    }

    let paramSet = params.get(entry.stateKey);
    if (paramSet === undefined) {
      paramSet = new Set<string>();
      params.set(entry.stateKey, paramSet);
    }
    for (const factor of entry.factors) paramSet.add(factor.key);
  }

  return { outputs, reads, params };
}

/**
 * Shortest path from an output to a parameter the predicate accepts.
 * Returns [output, ...intermediate state keys, paramKey], or null.
 */
export function findParamPath(
  graph: DependencyGraph,
  output: string,
  matches: (paramKey: string) => boolean,
): readonly string[] | null {
  const previous = new Map<string, string | null>([[output, null]]);
  const queue: string[] = [output];

  while (queue.length > 0) {
    const node = queue.shift() as string;

    const direct = graph.params.get(node);
    if (direct !== undefined) {
      // Sort so the reported path is stable when several params match.
      const hits = [...direct].filter(matches).sort();
      const hit = hits[0];
      if (hit !== undefined) {
        const path: string[] = [hit];
        let cursor: string | null = node;
        while (cursor !== null && cursor !== undefined) {
          path.unshift(cursor);
          cursor = previous.get(cursor) ?? null;
        }
        return path;
      }
    }

    for (const next of graph.reads.get(node) ?? []) {
      if (!previous.has(next)) {
        previous.set(next, node);
        queue.push(next);
      }
    }
  }

  return null;
}
