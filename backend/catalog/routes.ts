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
  _rootDir: string,
  options: { autoWarmupHoldings?: boolean } = {}
): Router {
  const router = Router();
  const autoWarmupHoldings = options.autoWarmupHoldings !== false;

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

  router.post('/sync/holdings', async (_req, res) => {
    try {
      const [holdingsRows, detailsRows] = await Promise.all([
        syncService.syncPortfolioHoldings(),
        syncService.syncSchemeDetails().catch(() => 0),
      ]);
      res.json({
        holdingsRows,
        detailsRows,
        filters: mfDb.getHoldingsFilters(),
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to synchronize portfolio holdings',
      });
    }
  });

  router.get('/holdings/filters', async (_req, res) => {
    try {
      if (autoWarmupHoldings && mfDb.isPortfolioHoldingsEmpty()) {
        await syncService.ensureHoldingsReady();
      }
      res.json(mfDb.getHoldingsFilters());
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load holdings filters',
      });
    }
  });

  router.get('/holdings', async (req, res) => {
    try {
      if (autoWarmupHoldings && mfDb.isPortfolioHoldingsEmpty()) {
        await syncService.ensureHoldingsReady();
      }
      const result = mfDb.queryHoldings({
        fundCode: typeof req.query.fundCode === 'string' ? req.query.fundCode : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        monthEnd: typeof req.query.monthEnd === 'string' ? req.query.monthEnd : undefined,
        assetGroup: typeof req.query.assetGroup === 'string' ? req.query.assetGroup : undefined,
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        aggregated: req.query.aggregated !== 'false',
        limit: Number(req.query.limit) || 60,
        offset: Number(req.query.offset) || 0,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to query portfolio holdings',
      });
    }
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
