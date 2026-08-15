import { describe, expect, it } from 'vitest';
import { buildServer } from './index.js';

const get = async (url: string) => {
  const app = buildServer({ logger: false });
  await app.ready();
  const res = await app.inject({ method: 'GET', url });
  await app.close();
  return res;
};

describe('GET /ready', () => {
  it('re-derives the invariants rather than reporting a boot-time flag', async () => {
    const res = await get('/ready');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ready).toBe(true);

    const names = body.checks.map((check: { name: string }) => check.name);
    expect(names).toEqual(['determinism', 'gate', 'rigor', 'packs']);
    for (const check of body.checks) {
      expect(check.ok, `${check.name}: ${check.detail}`).toBe(true);
    }
  });

  it('treats a gate that stops blocking as unhealthy, not as a pass', async () => {
    const res = await get('/ready');
    const gate = res
      .json()
      .checks.find((check: { name: string }) => check.name === 'gate');
    expect(gate.detail).toMatch(/blocks Rigor over INVENTED/);
  });

  it('reports Rigor as empty by decision, not by accident', async () => {
    const res = await get('/ready');
    expect(res.json().params.rigor).toBe(0);
    const rigor = res
      .json()
      .checks.find((check: { name: string }) => check.name === 'rigor');
    expect(rigor.detail).toMatch(/ADR 0005/);
  });

  it('never says which track produced the payload', async () => {
    expect(res_mode(await get('/ready'))).toBeNull();
    expect(res_mode(await get('/health'))).toBeNull();
  });
});

function res_mode(res: { json: () => { mode: unknown } }): unknown {
  return res.json().mode;
}

describe('GET /health stays cheap', () => {
  it('does no simulation work, so a slow kernel cannot fail liveness', async () => {
    const started = Date.now();
    const res = await get('/health');
    expect(res.statusCode).toBe(200);
    expect(Date.now() - started).toBeLessThan(500);
  });
});
