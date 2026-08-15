import { fileURLToPath } from 'node:url';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { counterfactualRoutes } from './routes/counterfactual.js';
import { scenarioRoutes } from './routes/scenario.js';
import { KERNEL_VERSION, PHASE } from '@genesis/kernel';

const PORT = Number(process.env['API_PORT'] ?? 4300);
const HOST = process.env['API_HOST'] ?? '0.0.0.0';

export function buildServer() {
  // A permalink is the whole scenario, not a database key, so it arrives as a
  // path parameter several hundred characters long. Fastify's default cap is 100
  // and a token over it 404s rather than erroring, which reads as "no such run".
  const app = Fastify({ logger: true, maxParamLength: 8192 });

  app.register(cors, { origin: true });
  app.register(counterfactualRoutes);
  app.register(scenarioRoutes);

  app.get('/health', async () => ({
    status: 'ok',
    phase: PHASE,
    kernel: KERNEL_VERSION,
    // Never let a client guess which track produced a payload.
    mode: null,
  }));

  return app;
}

async function main() {
  const app = buildServer();
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
