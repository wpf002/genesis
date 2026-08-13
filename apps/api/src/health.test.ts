import { describe, expect, it } from 'vitest';
import { buildServer } from './index';

describe('GET /health', () => {
  it('responds ok and never implies a mode it has not established', async () => {
    const app = buildServer();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', phase: 0, mode: null });
    await app.close();
  });
});
