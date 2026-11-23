import { Router } from 'express';
import { marketApiGateway } from '../services/apiGatewayCache.ts';
import { FinanciaMutualFundDatabase } from './database.ts';
import { FinnhubService } from './finnhubService.ts';
import { AmfiSyncAudit, DatasetSyncService } from './syncService.ts';

export function loadDefaultTerminalCatalogIfPresent(
  mfDb: FinanciaMutualFundDatabase,
  _rootDir: string
): AmfiSyncAudit | null {
  const start = Date.now();
  mfDb.seedFromScreenerUniverse();
  const stats = mfDb.getTerminalStats();
  return {
    status: 'synced',
    parsedCount: stats.totalSchemes,
    activeCount: stats.activeSchemes,
    etfCount: stats.etfCount,
    durationMs: Date.now() - start,
    syncedAtUtc: new Date().toISOString(),
    source: 'default-screener-seed',
  };
}

export function createDatabaseRouter(
  mfDb: FinanciaMutualFundDatabase,
  syncService: DatasetSyncService,
  _rootDir: string
): Router {
  const router = Router();

  router.get('/terminal/stats', (_req, res) => {
    res.json(mfDb.getTerminalStats());
  });

  router.get('/gateway/metrics', (_req, res) => {
    res.json({
      gateway: marketApiGateway.getMetrics(),
      catalog: mfDb.getTerminalStats(),
      lastSync: syncService.getLastAudit(),
    });
  });

  router.post('/sync/amfi', async (_req, res) => {
    const audit = await syncService.syncAmfiNavAll();
    res.json({ audit, catalog: mfDb.getTerminalStats() });
  });

  return router;
}

export function createGlobalExchangeRouter(finnhubService: FinnhubService): Router {
  const router = Router();

  router.get('/dossier/:symbol', async (req, res) => {
    const symbol = String(req.params.symbol || '').trim();
    if (!/^[A-Za-z0-9.^-]{1,16}$/.test(symbol)) {
      res.status(400).json({ error: 'Invalid ticker symbol.' });
      return;
    }
    try {
      const dossier = await finnhubService.getGlobalDossier(symbol);
      res.json(dossier);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to load global exchange dossier.',
      });
    }
  });

  return router;
}
