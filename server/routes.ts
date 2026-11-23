import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { MFPRO_CATALOG_META } from './catalog.ts';
import { FinanciaMutualFundDatabase } from './database.ts';
import { FinnhubService, sanitizeGlobalSymbol } from './finnhubService.ts';
import { parseAmfiNavText } from './parsers.ts';
import { DatasetSyncService } from './syncService.ts';

export const DEFAULT_TERMINAL_SOURCE_FILE = 'public/assets/aistudio/Paste_November_22__2026_-_9_22AM_4ba998e6.txt';

export function loadDefaultTerminalCatalogIfPresent(db: FinanciaMutualFundDatabase, rootDir: string) {
  const fullPath = path.resolve(rootDir, DEFAULT_TERMINAL_SOURCE_FILE);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const rawText = fs.readFileSync(fullPath, 'utf8');
  return db.ingestTerminalCatalogText(rawText, path.basename(fullPath));
}

export function createDatabaseRouter(
  db: FinanciaMutualFundDatabase,
  syncService: DatasetSyncService,
  rootDir = process.cwd()
): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    const overview = db.getOverview();
    res.json({
      status: 'ok',
      service: 'Financia Mutual Fund Database Engine',
      catalog: MFPRO_CATALOG_META,
      totalLocalRows: overview.totalLocalRows,
      dbSizeBytes: overview.dbSizeBytes,
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/overview', (_req, res) => {
    try {
      const overview = db.getOverview();
      res.json({
        ...overview,
        catalogMeta: MFPRO_CATALOG_META,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load database overview' });
    }
  });

  router.get('/schema', (_req, res) => {
    try {
      res.json(db.getSchemaMetadata());
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read SQLite schema' });
    }
  });

  /* ======================== Fund Terminal API ======================== */

  router.get('/terminal/stats', (_req, res) => {
    try {
      res.json(db.getTerminalStats());
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load terminal stats' });
    }
  });

  router.get('/terminal/index', (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.json(db.getTerminalSearchIndex());
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load terminal search index' });
    }
  });

  router.get('/terminal/autocomplete', (req, res) => {
    try {
      const allowedInst = new Set(['ALL', 'ETF', 'MUTUAL_FUND', 'INDEX_FUND', 'FOF']);
      const instParam = typeof req.query.instrumentType === 'string' ? req.query.instrumentType.toUpperCase() : 'ALL';
      const instrumentType = allowedInst.has(instParam) ? instParam : 'ALL';

      const result = db.autocompleteTerminalFunds({
        q: typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : '',
        instrumentType,
        assetClass: typeof req.query.assetClass === 'string' ? req.query.assetClass.slice(0, 40) : 'ALL',
        activeOnly: req.query.activeOnly === 'true' || req.query.activeOnly === '1',
        limit: Number(req.query.limit) || 12,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Autocomplete query failed' });
    }
  });

  router.get('/terminal/screener', (req, res) => {
    try {
      const result = db.queryTerminalScreener({
        q: typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : undefined,
        instrumentType: typeof req.query.instrumentType === 'string' ? req.query.instrumentType : undefined,
        assetClass: typeof req.query.assetClass === 'string' ? req.query.assetClass : undefined,
        subCategory: typeof req.query.subCategory === 'string' ? req.query.subCategory : undefined,
        amc: typeof req.query.amc === 'string' ? req.query.amc : undefined,
        activeOnly: req.query.activeOnly === 'true' || req.query.activeOnly === '1',
        excludeSegregated: req.query.excludeSegregated === 'true' || req.query.excludeSegregated === '1',
        sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
        sortDir: req.query.sortDir === 'asc' ? 'asc' : 'desc',
        limit: Number(req.query.limit) || 25,
        offset: Number(req.query.offset) || 0,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Terminal screener query failed' });
    }
  });

  router.get('/terminal/fund/:schemeCode', (req, res) => {
    try {
      const schemeCode = String(req.params.schemeCode || '').trim();
      if (!schemeCode || !/^[A-Za-z0-9:_-]{1,32}$/.test(schemeCode)) {
        res.status(400).json({ error: 'Invalid scheme code.' });
        return;
      }
      const dossier = db.getTerminalFundDossier(schemeCode);
      if (!dossier) {
        res.status(404).json({ error: `Scheme code ${schemeCode} not found in Fund Terminal catalog.` });
        return;
      }
      res.json(dossier);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load fund dossier' });
    }
  });

  router.post('/terminal/compare', (req, res) => {
    try {
      const codes = Array.isArray(req.body?.schemeCodes) ? req.body.schemeCodes : [];
      if (codes.length === 0) {
        res.status(400).json({ error: 'Provide at least 1 schemeCode to compare.' });
        return;
      }
      const comparison = db.compareTerminalFunds(codes.map(String));
      res.json(comparison);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Fund comparison failed' });
    }
  });

  router.post('/terminal/reprocess', (req, res) => {
    try {
      const customText = typeof req.body?.rawText === 'string' ? req.body.rawText : '';
      if (customText.trim()) {
        if (customText.length > 2.5 * 1024 * 1024) {
          res.status(413).json({ error: 'Payload exceeds 2.5MB limit.' });
          return;
        }
        const sourceLabel =
          typeof req.body?.sourceFile === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(req.body.sourceFile)
            ? req.body.sourceFile
            : 'custom_amfi_upload.txt';
        const audit = db.ingestTerminalCatalogText(customText, sourceLabel);
        res.json({ audit, stats: db.getTerminalStats() });
        return;
      }

      const audit = loadDefaultTerminalCatalogIfPresent(db, rootDir);
      if (!audit) {
        res.status(404).json({ error: 'Default AMFI source file was not found in workspace.' });
        return;
      }
      res.json({ audit, stats: db.getTerminalStats() });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Terminal reprocessing failed' });
    }
  });

  /* ======================== Core Database Routes ======================== */

  router.get('/schemes', (req, res) => {
    try {
      const result = db.querySchemes({
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        amc: typeof req.query.amc === 'string' ? req.query.amc : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        plan: typeof req.query.plan === 'string' ? req.query.plan : undefined,
        source: typeof req.query.source === 'string' ? req.query.source : undefined,
        activeOnly: req.query.activeOnly === 'true' || req.query.activeOnly === '1',
        sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
        sortDir: req.query.sortDir === 'asc' ? 'asc' : 'desc',
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to query schemes' });
    }
  });

  router.get('/schemes/:schemeCode', (req, res) => {
    try {
      const schemeCode = String(req.params.schemeCode || '').trim();
      if (!schemeCode || schemeCode.length > 32) {
        res.status(400).json({ error: 'Invalid scheme code.' });
        return;
      }
      const dossier = db.getSchemeByCode(schemeCode);
      if (!dossier) {
        res.status(404).json({ error: `Scheme code ${schemeCode} not found in database.` });
        return;
      }
      res.json(dossier);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch scheme dossier' });
    }
  });

  router.get('/holdings/filters', (_req, res) => {
    try {
      res.json(db.getHoldingsFilters());
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load holdings filters' });
    }
  });

  router.get('/holdings', (req, res) => {
    try {
      const result = db.queryHoldings({
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
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to query portfolio holdings' });
    }
  });

  router.get('/isin-mappings', (req, res) => {
    try {
      const result = db.queryIsinMappings({
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to query ISIN mappings' });
    }
  });

  router.get('/amfi-nav', (req, res) => {
    try {
      const result = db.queryAmfiNavRecords({
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        amc: typeof req.query.amc === 'string' ? req.query.amc : undefined,
        limit: Number(req.query.limit) || 100,
        offset: Number(req.query.offset) || 0,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to query AMFI NAV ledger' });
    }
  });

  router.post('/ingest/amfi', (req, res) => {
    try {
      const rawText = typeof req.body?.rawText === 'string' ? req.body.rawText : '';
      const dryRun = Boolean(req.body?.dryRun);
      const source =
        typeof req.body?.source === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(req.body.source)
          ? req.body.source
          : 'AMFI_USER_INGEST';

      if (!rawText.trim()) {
        res.status(400).json({ error: 'Please paste AMFI semicolon-delimited NAV text to parse.' });
        return;
      }
      if (rawText.length > 2 * 1024 * 1024) {
        res.status(413).json({ error: 'Payload exceeds 2MB ingestion limit.' });
        return;
      }

      const parsed = parseAmfiNavText(rawText, source);
      if (parsed.records.length === 0) {
        res.status(400).json({
          error: 'No valid AMFI NAV rows were detected. Ensure rows use 6 or 8 semicolon-separated columns.',
          skippedLines: parsed.skippedLines.slice(0, 20),
        });
        return;
      }

      if (dryRun) {
        res.json({
          dryRun: true,
          parsedCount: parsed.records.length,
          skippedCount: parsed.skippedLines.length,
          detectedAmcs: parsed.detectedAmcs,
          detectedCategories: parsed.detectedCategories,
          preview: parsed.records.slice(0, 25),
          skippedLines: parsed.skippedLines.slice(0, 20),
        });
        return;
      }

      const result = db.upsertAmfiNavRecords(parsed.records);
      res.json({
        dryRun: false,
        parsedCount: parsed.records.length,
        upsertedCount: result.upserted,
        totalInTable: result.totalInTable,
        skippedCount: parsed.skippedLines.length,
        detectedAmcs: parsed.detectedAmcs,
        detectedCategories: parsed.detectedCategories,
        skippedLines: parsed.skippedLines.slice(0, 20),
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'AMFI ingestion failed' });
    }
  });

  router.get('/export/nav-master.sql', (req, res) => {
    try {
      const limit = Number(req.query.limit) || 500;
      const sqlDump = db.exportFinanciaNavMasterSql(limit);
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="financia_nav_master_export.sql"');
      res.send(sqlDump);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'SQL export failed' });
    }
  });

  router.get('/quality', (req, res) => {
    try {
      const tab = req.query.tab === 'aum_anomalies' ? 'aum_anomalies' : 'scheme_conflicts';
      const result = db.queryDataQuality({
        tab,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        code: typeof req.query.code === 'string' ? req.query.code : undefined,
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to query data quality tables' });
    }
  });

  router.post('/query', (req, res) => {
    try {
      const sql = typeof req.body?.sql === 'string' ? req.body.sql : '';
      const maxRows = Number(req.body?.maxRows) || 250;
      const result = db.executeReadOnlySql(sql, maxRows);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'SQL execution error' });
    }
  });

  router.post('/sync-all', async (_req, res) => {
    try {
      const results = await syncService.syncAllSqliteDatasets();
      res.json({ results, overview: db.getOverview() });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Sync all failed' });
    }
  });

  router.post('/sync/:datasetId', async (req, res) => {
    try {
      const datasetId = String(req.params.datasetId || '').trim();
      const result = await syncService.syncDataset(datasetId);
      const statusCode = result.status === 'error' ? 502 : 200;
      res.status(statusCode).json({ result, overview: db.getOverview() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Dataset sync failed' });
    }
  });

  router.post('/probe-parquet/:datasetId', async (req, res) => {
    try {
      const datasetId = String(req.params.datasetId || '').trim();
      const probe = await syncService.probeParquetRange(datasetId);
      res.json({ probe });
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'Parquet HTTP Range probe failed' });
    }
  });

  return router;
}

export function createGlobalExchangeRouter(finnhubService: FinnhubService): Router {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json({
      finnhubConfigured: finnhubService.isConfigured(),
      catalogCount: finnhubService.getCatalogList().length,
    });
  });

  router.get('/instruments', (_req, res) => {
    res.json({
      finnhubConfigured: finnhubService.isConfigured(),
      items: finnhubService.getCatalogList(),
    });
  });

  router.get('/search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const result = await finnhubService.searchSymbols(q);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Global symbol search failed' });
    }
  });

  router.get('/news', async (req, res) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : 'general';
      const result = await finnhubService.getMarketNews(category);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Global market news failed' });
    }
  });

  router.get('/dossier/:symbol', async (req, res) => {
    try {
      const sym = sanitizeGlobalSymbol(String(req.params.symbol || ''));
      if (!sym) {
        res.status(400).json({ error: 'Invalid ticker symbol. Use 1-16 uppercase letters, digits, or . _ - ^.' });
        return;
      }
      const dossier = await finnhubService.getInstrumentDossier(sym);
      if (!dossier) {
        res.status(404).json({
          error: `Global symbol ${sym} was not found. Configure FINNHUB_API_KEY in Secrets for arbitrary live tickers or pick from the curated global catalog.`,
        });
        return;
      }
      res.json(dossier);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load global instrument dossier' });
    }
  });

  return router;
}
