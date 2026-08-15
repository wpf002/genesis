// Permalinks.
//
// A permalink carries the whole scenario, not a database key, so reproducing a
// published run needs nothing from this server. Paste the token into a checkout
// of Genesis and you get the same state hash or you get an error - there is no
// third outcome where it quietly runs something else.
//
// Format: g1.<base64url payload>.<12 hex checksum over the payload>
//
// The checksum covers the payload bytes rather than the config hash, so a
// truncated or hand-edited token is rejected instead of decoding into a
// different-but-valid scenario.

import { blake3Hex, KERNEL_VERSION } from '@genesis/kernel';
import {
  configHash,
  parseScenario,
  type Scenario,
  type ScenarioRun,
  runScenario,
} from './scenario.js';

export const PERMALINK_VERSION = 'g1';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const REVERSE = new Map<string, number>(
  [...ALPHABET].map((character, index) => [character, index]),
);

export class PermalinkCorrupt extends Error {}

/** Unpadded base64url. Written out because the kernel ships with no runtime deps. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] as number;
    const b = i + 1 < bytes.length ? (bytes[i + 1] as number) : 0;
    const c = i + 2 < bytes.length ? (bytes[i + 2] as number) : 0;
    const word = (a << 16) | (b << 8) | c;
    out += ALPHABET[(word >>> 18) & 63] as string;
    out += ALPHABET[(word >>> 12) & 63] as string;
    if (i + 1 < bytes.length) out += ALPHABET[(word >>> 6) & 63] as string;
    if (i + 2 < bytes.length) out += ALPHABET[word & 63] as string;
  }
  return out;
}

export function base64UrlDecode(text: string): Uint8Array {
  const digits: number[] = [];
  for (const character of text) {
    const value = REVERSE.get(character);
    if (value === undefined) {
      throw new PermalinkCorrupt(`permalink: ${character} is not a base64url character`);
    }
    digits.push(value);
  }
  // 1 leftover digit carries 6 bits, which cannot complete a byte.
  if (digits.length % 4 === 1) throw new PermalinkCorrupt('permalink: truncated payload');

  const bytes: number[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    const chunk = digits.length - i;
    const a = digits[i] as number;
    const b = (digits[i + 1] ?? 0) as number;
    const c = (digits[i + 2] ?? 0) as number;
    const d = (digits[i + 3] ?? 0) as number;
    const word = (a << 18) | (b << 12) | (c << 6) | d;
    bytes.push((word >>> 16) & 255);
    if (chunk > 2) bytes.push((word >>> 8) & 255);
    if (chunk > 3) bytes.push(word & 255);
  }
  return Uint8Array.from(bytes);
}

/**
 * Fixed key order, sorted overrides, interventions in application order. Two
 * scenarios that describe the same run serialize to identical bytes.
 */
export function canonicalJson(scenario: Scenario): string {
  const overrides: Record<string, string> = {};
  for (const key of Object.keys(scenario.overrides).sort()) {
    overrides[key] = scenario.overrides[key] as string;
  }
  return JSON.stringify({
    format: scenario.format,
    id: scenario.id,
    title: scenario.title,
    note: scenario.note,
    mode: scenario.mode,
    seed: scenario.seed,
    ticks: scenario.ticks,
    regions: scenario.regions,
    overrides,
    interventions: [...scenario.interventions]
      .sort(
        (a, b) =>
          a.tick - b.tick ||
          (a.stateKey < b.stateKey ? -1 : a.stateKey > b.stateKey ? 1 : 0),
      )
      .map((intervention) => ({
        tick: intervention.tick,
        stateKey: intervention.stateKey,
        value: intervention.value,
        rationale: intervention.rationale,
      })),
  });
}

export function encodePermalink(scenario: Scenario): string {
  const payload = new TextEncoder().encode(canonicalJson(scenario));
  const checksum = blake3Hex(payload).slice(0, 12);
  return `${PERMALINK_VERSION}.${base64UrlEncode(payload)}.${checksum}`;
}

export function decodePermalink(token: string): Scenario {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new PermalinkCorrupt('permalink: expected version.payload.checksum');
  }
  const [version, encoded, checksum] = parts as [string, string, string];
  if (version !== PERMALINK_VERSION) {
    throw new PermalinkCorrupt(
      `permalink: unknown version ${version}, this build reads ${PERMALINK_VERSION}`,
    );
  }
  const payload = base64UrlDecode(encoded);
  const actual = blake3Hex(payload).slice(0, 12);
  if (actual !== checksum) {
    throw new PermalinkCorrupt(
      `permalink: checksum ${checksum} does not match the payload (${actual}); the link is damaged`,
    );
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder().decode(payload));
  } catch {
    throw new PermalinkCorrupt('permalink: payload is not JSON');
  }
  return parseScenario(decoded);
}

export interface PublishedRun {
  readonly token: string;
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly mode: Scenario['mode'];
  /** The three inputs locked invariant #5 says determine the terminal hash. */
  readonly seed: string;
  readonly configHash: string;
  readonly paramSetId: string;
  readonly terminalHash: string;
  readonly tick: number;
  readonly kernelVersion: string;
  readonly watermarkRequired: boolean;
}

/** Runs a scenario and returns the token plus the hash a third party should get. */
export function publish(scenario: Scenario): PublishedRun {
  const result = runScenario(scenario);
  return describe(scenario, result);
}

/** The other half of the gate: token in, executed run out. */
export function reproduce(token: string): PublishedRun {
  const scenario = decodePermalink(token);
  return describe(scenario, runScenario(scenario));
}

export interface Reproduction {
  readonly reproduced: boolean;
  readonly claimed: string;
  readonly actual: string;
  readonly configHash: string;
  readonly paramSetId: string;
  readonly kernelVersion: string;
}

/**
 * The Phase 8 exit gate as a function: a token and a claimed hash go in, and
 * whether this machine reproduces it comes out.
 */
export function verifyPermalink(token: string, claimedTerminalHash: string): Reproduction {
  const published = reproduce(token);
  return {
    reproduced: published.terminalHash === claimedTerminalHash,
    claimed: claimedTerminalHash,
    actual: published.terminalHash,
    configHash: published.configHash,
    paramSetId: published.paramSetId,
    kernelVersion: published.kernelVersion,
  };
}

function describe(scenario: Scenario, result: ScenarioRun): PublishedRun {
  return {
    token: encodePermalink(scenario),
    id: scenario.id,
    title: scenario.title,
    note: scenario.note,
    mode: scenario.mode,
    seed: scenario.seed,
    configHash: configHash(scenario),
    paramSetId: result.paramSetId,
    terminalHash: result.terminalHash,
    tick: result.tick,
    kernelVersion: KERNEL_VERSION,
    watermarkRequired: result.watermarkRequired,
  };
}
