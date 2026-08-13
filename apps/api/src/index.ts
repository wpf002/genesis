import cors from '@fastify/cors';
import Fastify from 'fastify';

const PORT = Number(process.env['API_PORT'] ?? 4300);
const HOST = process.env['API_HOST'] ?? '0.0.0.0';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  app.get('/health', async () => ({
    status: 'ok',
    phase: 0,
    // Never let a client guess which track produced a payload. Phase 6 makes
    // this visible in the UI; the API states it from the first endpoint.
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

if (require.main === module) {
  void main();
}
