import { describe, expect, it } from 'vitest';
import { SCENARIO_FORMAT } from '@genesis/replay';
import { buildServer } from './index.js';

// payload must be a concrete object type: `unknown` makes inject()'s overload
// resolve to the chainable form, and every .statusCode read then fails to type.
const post = async (url: string, body: Record<string, unknown>) => {
  const app = buildServer();
  await app.ready();
  const res = await app.inject({ method: 'POST', url, payload: body });
  await app.close();
  return res;
};

const get = async (url: string) => {
  const app = buildServer();
  await app.ready();
  const res = await app.inject({ method: 'GET', url });
  await app.close();
  return res;
};

const base = {
  format: SCENARIO_FORMAT,
  id: 'api-test',
  title: 'API test',
  mode: 'SANDBOX',
  seed: '20260815',
  ticks: 120,
};

describe('GET /packs', () => {
  it('lists every pack with a token and a hash', async () => {
    const res = await get('/packs');
    expect(res.statusCode).toBe(200);
    const { packs } = res.json();
    expect(packs).toHaveLength(8);
    for (const pack of packs) {
      expect(pack.token).toMatch(/^g1\./);
      expect(pack.terminalHash).toMatch(/^[0-9a-f]{64}$/);
      expect(pack.watermark.join(' ')).toMatch(/SANDBOX OUTPUT/);
    }
  });
});

describe('POST /scenario', () => {
  it('runs a Sandbox scenario and watermarks the payload', async () => {
    const res = await post('/scenario', base);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.watermark.join(' ')).toMatch(/SANDBOX OUTPUT/);
    expect(body.terminalHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.configHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.paramSetId).toMatch(/^[0-9a-f]{16}$/);
    expect(body.token).toMatch(/^g1\./);
  });

  it('refuses a Rigor scenario with 422 rather than degrading it', async () => {
    const res = await post('/scenario', { ...base, mode: 'RIGOR' });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch(/Rigor mode has no model/);
  });

  it('rejects an override of a parameter nobody registered', async () => {
    const res = await post('/scenario', {
      ...base,
      overrides: { 'agriculture.made.up': '1' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('caps the work a submitted run may ask for', async () => {
    const res = await post('/scenario', {
      ...base,
      ticks: 20000,
      regions: ['EGY', 'CHN', 'ITA'],
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().error).toMatch(/tick-regions/);
  });
});

describe('GET /scenario/:token — the Phase 8 exit gate', () => {
  it('reproduces a published run from the token alone', async () => {
    const published = (await post('/scenario', base)).json();

    // Everything below this line has only the token. No shared object, no id.
    const res = await get(`/scenario/${published.token}`);
    expect(res.statusCode).toBe(200);
    const reproduced = res.json();
    expect(reproduced.terminalHash).toBe(published.terminalHash);
    expect(reproduced.configHash).toBe(published.configHash);
    expect(reproduced.paramSetId).toBe(published.paramSetId);
  });

  it('rejects a damaged token instead of running a different scenario', async () => {
    const published = (await post('/scenario', base)).json();
    const damaged = `${(published.token as string).slice(0, -3)}aaa`;
    const res = await get(`/scenario/${damaged}`);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/checksum/);
  });
});

describe('POST /scenario/verify', () => {
  it('confirms a hash this server reproduces', async () => {
    const published = (await post('/scenario', base)).json();
    const res = await post('/scenario/verify', {
      token: published.token,
      terminalHash: published.terminalHash,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().reproduced).toBe(true);
  });

  it('answers false for a hash it does not, and still returns 200', async () => {
    const published = (await post('/scenario', base)).json();
    const res = await post('/scenario/verify', {
      token: published.token,
      terminalHash: '0'.repeat(64),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.reproduced).toBe(false);
    expect(body.actual).toBe(published.terminalHash);
  });
});

describe('the scenario API never returns 500', () => {
  it('holds across malformed, refused and oversized input', async () => {
    const cases: Record<string, unknown>[] = [
      {},
      { ...base, mode: 'RIGOR' },
      { ...base, format: 'genesis-scenario/99' },
      { ...base, id: 'Not Kebab Case' },
      { ...base, seed: '-1' },
      { ...base, ticks: 0 },
      { ...base, regions: ['ZZZ'] },
      { ...base, regions: ['EGY', 'EGY'] },
      { ...base, overrides: { 'agriculture.yield.tfp_exponent': '9' } },
      { ...base, overrides: { 'demography.fertility.baseline': 'two' } },
      {
        ...base,
        interventions: [{ tick: 500, stateKey: 'demography.population', value: '1', rationale: 'late' }],
      },
      {
        ...base,
        interventions: [{ tick: 10, stateKey: 'no.such.key', value: '1', rationale: 'missing' }],
      },
    ];
    for (const body of cases) {
      const res = await post('/scenario', body);
      expect(res.statusCode, JSON.stringify(body).slice(0, 90)).toBeLessThan(500);
    }

    for (const token of ['nonsense', 'g1.....', 'g9.AAAA.000000000000', 'g1.!!!!.000000000000']) {
      const res = await get(`/scenario/${encodeURIComponent(token)}`);
      expect(res.statusCode, token).toBeLessThan(500);
    }
  });
});
