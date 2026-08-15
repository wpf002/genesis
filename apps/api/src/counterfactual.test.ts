import { describe, expect, it } from 'vitest';
import { buildServer } from './index.js';

// payload must be a concrete object type: `unknown` makes inject()'s overload
// resolve to the chainable form, and every .statusCode read then fails to type.
const post = async (body: Record<string, unknown>) => {
  const app = buildServer({ logger: false });
  await app.ready();
  const res = await app.inject({ method: 'POST', url: '/counterfactual', payload: body });
  await app.close();
  return res;
};

const base = {
  seed: '20260806',
  forkTick: 50,
  ticks: 200,
  intervention: {
    stateKey: 'demography.population',
    value: '500',
    rationale: 'halve the population at the fork',
  },
};

describe('POST /counterfactual', () => {
  it('returns 422 and the gate report for a Rigor run touching INVENTED', async () => {
    const res = await post({ ...base, mode: 'RIGOR' });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.gateReport.status).toBe('BLOCKED');
    // The report names the parameter and the full path, per the exit gate.
    const violation = body.gateReport.violations[0];
    expect(violation.reason).toBe('INVENTED');
    expect(violation.path.length).toBeGreaterThanOrEqual(2);
    expect(violation.param).toMatch(/\./);
  });

  it('runs a Sandbox counterfactual and watermarks the payload', async () => {
    const res = await post({ ...base, mode: 'SANDBOX' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.mode).toBe('SANDBOX');
    expect(body.watermark.join(' ')).toMatch(/SANDBOX OUTPUT/);
    expect(body.branchHash).not.toBe(body.parentHash);
    expect(body.divergence.length).toBeGreaterThan(0);
    expect(body.divergence[0].because.length).toBeGreaterThan(0);
  });

  it('rejects an intervention with no rationale', async () => {
    const res = await post({
      ...base,
      mode: 'SANDBOX',
      intervention: { ...base.intervention, rationale: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a fork at or after the end of the run', async () => {
    const res = await post({ ...base, mode: 'SANDBOX', forkTick: 200, ticks: 200 });
    expect(res.statusCode).toBe(400);
  });

  it('never returns 500', async () => {
    for (const mode of ['RIGOR', 'SANDBOX'] as const) {
      const res = await post({ ...base, mode });
      expect(res.statusCode).toBeLessThan(500);
    }
  });
});
