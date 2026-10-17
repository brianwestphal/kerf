import { preview } from 'astro';
import { fileURLToPath } from 'node:url';

const server = await preview({
  root: fileURLToPath(new URL('../', import.meta.url)),
  server: {
    host: '127.0.0.1',
    // Matches site/playwright.config.ts, whose web server inherits this env.
    port: Number(process.env.KERF_SITE_PLAYWRIGHT_PORT || 4322),
  },
});

await server.closed();
