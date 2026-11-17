import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createAuthRouter } from './routes/authRoutes.ts';
import { createStocksRouter } from './routes/stocksRoutes.ts';
import { createMarketsRouter } from './routes/marketsRoutes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export async function createBackendApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json());

  // 1. Mount Modular Backend API Routes
  app.use('/api/auth', createAuthRouter());
  app.use('/api', createStocksRouter());
  app.use('/api', createMarketsRouter());

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
