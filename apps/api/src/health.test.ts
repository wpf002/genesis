import { describe, expect, it } from 'vitest';
import { KERNEL_VERSION, PHASE } from '@genesis/kernel';
import { buildServer } from './index.js';

describe('GET /health', () => {
  it('responds ok and never implies a mode it has not established', async () => {
    const app = buildServer();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      status: 'ok',
      phase: PHASE,
      kernel: KERNEL_VERSION,
      mode: null,
    });
    await app.close();
  });
});
