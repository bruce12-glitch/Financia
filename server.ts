import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { FinanciaMutualFundDatabase } from './server/database.ts';
import { DatasetSyncService } from './server/syncService.ts';
import { createDatabaseRouter, loadDefaultTerminalCatalogIfPresent } from './server/routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;

async function startServer() {
  const port = 3000;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '2.5mb' }));

  const db = new FinanciaMutualFundDatabase();
  const syncService = new DatasetSyncService(db);

  // Auto-load the selected AMFI ETF & Mutual Fund dataset into SQLite on boot if empty
  if (db.isTerminalCatalogEmpty()) {
    try {
      const audit = loadDefaultTerminalCatalogIfPresent(db, ROOT_DIR);
      if (audit) {
        console.log(
          `[Financia DB] Loaded Fund Terminal catalog: ${audit.parsedCount} schemes (${audit.activeCount} active, ${audit.etfCount} ETFs) in ${audit.durationMs}ms`
        );
      }
    } catch (err) {
      console.warn('[Financia DB] Failed to preload Fund Terminal file:', err instanceof Error ? err.message : err);
    }
  }

  // Mount Financia Database API routes (primary /api/db + convenience /api/funds alias)
  const dbRouter = createDatabaseRouter(db, syncService, ROOT_DIR);
  app.use('/api/db', dbRouter);
  app.use('/api/funds', dbRouter);

  // Convenience root health route
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'financia-database-engine' });
  });

  // Error handler for API routes
  app.use('/api', (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    res.status(500).json({ error: message });
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      root: ROOT_DIR,
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  await new Promise<void>((resolve) => {
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`Financia Database Engine listening on http://localhost:${port}`);
      resolve();
    });
  });

  // Auto-populate empty MFPRO SQLite tables in the background on first boot
  syncService.warmupEmptyDatasets().catch((err) => {
    console.warn('[Financia DB] Background warmup error:', err instanceof Error ? err.message : err);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Financia Database Engine:', err);
  process.exit(1);
});
