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
import { createScreenerRouter } from './routes/screenerRoutes.ts';
import {
  apiErrorHandler,
  applySecurityHeaders,
  createRateLimiter,
  verifyMutationOrigin,
} from './middleware/securityMiddleware.ts';
import { securityAuditLog } from './services/auditLogService.ts';
import { financiaStore, PersistenceStore } from './services/persistenceService.ts';
import { initNavDatabase, NavDatabaseService } from './services/navDatabaseService.ts';

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
  navDb?: NavDatabaseService;
  skipVite?: boolean;
}

export async function createBackendApp(
  httpServer?: http.Server,
  options: BackendAppOptions = {}
): Promise<express.Express> {
  const store = options.store ?? financiaStore;
  const navDb = options.navDb ?? initNavDatabase({ cwd: ROOT_DIR });
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(applySecurityHeaders);
  app.use(express.json({ limit: '64kb' }));

  const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 40,
    keyPrefix: 'auth',
    onLimitExceeded: (_req, ip) => {
      securityAuditLog.record({
        event: 'security.rate_limited',
        rawIp: ip,
        detail: 'Authentication rate limit threshold exceeded',
        severity: 'warning',
      });
    },
  });

  const apiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 300,
    keyPrefix: 'api',
  });

  app.use('/api', apiRateLimiter);
  app.use('/api', verifyMutationOrigin);
  app.use('/api/auth/login', authRateLimiter);
  app.use('/api/auth/register', authRateLimiter);

  // 1. Mount Modular Backend API Routes
  app.use('/api/auth', createAuthRouter(store));
  app.use('/api', createScreenerRouter());
  app.use('/api', createStocksRouter(navDb));
  app.use('/api', createMarketsRouter());
  app.use('/api', createWorkspaceRouter(store));
  app.use('/api', createAiRouter());

  app.use('/api', apiErrorHandler);

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
    let viteInstance: ViteDevServer | null = null;
    const vitePromise = createViteServer({
      root: ROOT_DIR,
      server: {
        middlewareMode: true,
        hmr:
          process.env.DISABLE_HMR === 'true'
            ? false
            : httpServer
              ? { server: httpServer }
              : false,
      },
      appType: 'spa',
    }).then((server) => {
      viteInstance = server;
      return server;
    });

    app.use(async (req, res, next) => {
      try {
        if (
          req.method === 'GET' &&
          (req.path === '/frontend' ||
            req.path === '/frontend/' ||
            req.path === '/terminal' ||
            req.path === '/terminal/')
        ) {
          req.url = '/';
        }
        const vite = viteInstance ?? (await vitePromise);
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  }

  return app;
}

export async function startBackendServer(): Promise<void> {
  const port = resolveServerPort();
  const app = express();
  app.disable('x-powered-by');
  const httpServer = http.createServer(app);

  let readyApp: express.Express | null = null;
  const appPromise = createBackendApp(httpServer).then((configured) => {
    readyApp = configured;
    return configured;
  });

  app.get('/api/health', (_req, res, next) => {
    if (readyApp) {
      next();
      return;
    }
    res.json({ status: 'ok', service: 'financia' });
  });

  app.use(async (req, res, next) => {
    try {
      const target = readyApp ?? (await appPromise);
      target(req, res, next);
    } catch (err) {
      next(err);
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`Financia backend server listening on http://localhost:${port}`);
      resolve();
    });
  });

  await appPromise;
}

