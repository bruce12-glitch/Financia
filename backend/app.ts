import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { createAuthRouter } from './routes/authRoutes.ts';
import { createStocksRouter } from './routes/stocksRoutes.ts';
import { createMarketsRouter } from './routes/marketsRoutes.ts';
import { createWorkspaceRouter } from './routes/workspaceRoutes.ts';
import { createAiRouter } from './routes/aiRoutes.ts';
import { financiaStore, PersistenceStore } from './services/persistenceService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function resolveServerPort(): number {
  const portFlagIdx = process.argv.findIndex(
    (arg) => arg === '--port' || arg.startsWith('--port=')
  );
  if (portFlagIdx !== -1) {
    const raw = process.argv[portFlagIdx].includes('=')
      ? process.argv[portFlagIdx].split('=')[1]
      : process.argv[portFlagIdx + 1];
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  // Prefer DEFAULT_APP_PORT (3000) over Cloud Run's proxy PORT (8080 used by nginx)
  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT || 8080);
  if (Number.isInteger(envPort) && envPort > 0 && envPort !== nginxPort) {
    return envPort;
  }

  const defaultPort = Number(process.env.DEFAULT_APP_PORT || 3000);
  return Number.isInteger(defaultPort) && defaultPort > 0 ? defaultPort : 3000;
}

export interface BackendAppOptions {
  store?: PersistenceStore;
  skipVite?: boolean;
}

export async function createBackendApp(
  httpServer?: http.Server,
  options: BackendAppOptions = {}
): Promise<express.Express> {
  const store = options.store ?? financiaStore;
  const app = express();
  app.use(express.json());

  // 1. Mount Modular Backend API Routes
  app.use('/api/auth', createAuthRouter(store));
  app.use('/api', createStocksRouter());
  app.use('/api', createMarketsRouter());
  app.use('/api', createWorkspaceRouter(store));
  app.use('/api', createAiRouter());

  if (options.skipVite) {
    return app;
  }

  // 2. Mount Vite Middlewares in Dev or Static dist/ in Production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      root: ROOT_DIR,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

export async function startBackendServer(): Promise<void> {
  const app = await createBackendApp();
  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Financia backend server listening on http://localhost:${port}`);
  });
}
