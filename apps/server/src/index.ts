/* ============================================================
   Bootstrap: HTTP (REST) + WebSocket hub + migrazioni DB.
   ============================================================ */
import './env.js';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { ENV } from './env.js';
import { migrate } from './db.js';
import { GameHub } from './ws.js';
import { createApiRouter, errorHandler } from './http.js';
import { cleanupStale } from './game.js';

async function main(): Promise<void> {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json());

  const server = http.createServer(app);
  const hub = new GameHub(server);

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', createApiRouter(hub));
  app.use(errorHandler);

  await migrate();

  server.listen(ENV.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Burraco server in ascolto su :${ENV.PORT} (REST /api, WS /ws)`);
  });

  // pulizia partite/stanze inattive da >30 min: ogni 5 minuti
  void cleanupStale();
  setInterval(() => void cleanupStale(), 5 * 60 * 1000);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Avvio fallito:', e);
  process.exit(1);
});
