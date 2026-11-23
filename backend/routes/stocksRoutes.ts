import { Request, Response, Router } from 'express';
import { INITIAL_STOCKS } from '../../frontend/data/marketData.ts';
import { SUPERCHART_INSTRUMENTS } from '../../frontend/data/tradingViewData.ts';
import { parseBinanceKlines, parseSecCompanyFacts } from '../../frontend/utils/liveDataParsers.ts';
import {
  buildMultiTickerComparisonSeries,
  calculateBollingerBands,
  calculateRSISeries,
  calculateSMA,
  getEffectiveRSIPeriod,
  getSeriesForTimeframe,
  summarizeRSIZone,
  synthesizeCustomTickerReport,
  validateTickerInput,
} from '../../frontend/utils/stockEngine.ts';
import { SCREENER_FUNDS } from '../../frontend/utils/screenerEngine.ts';
import {
  buildTerminalSuggestions,
  TerminalSuggestionFilter,
} from '../../frontend/utils/terminalSearchEngine.ts';
import { isGeminiConfigured } from '../services/geminiService.ts';
import {
  enrichStockQuote,
  fetchAlphaVantageStock,
  fetchAmfiSchemeHistory,
  fetchAmfiSchemeLatest,
  fetchMfnavCategories,
  fetchMfnavDateLatest,
  fetchMfnavFundRaw,
  fetchMfnavNavSeriesRaw,
  fetchSecCompanyFacts,
  fetchWithTimeout,
  listAmfiSchemes,
  resolveSecCompanyMeta,
  searchAmfiSchemes,
  searchMfnavFunds,
} from '../services/marketDataService.ts';
import {
  fetchApiNinjasEtfList,
  fetchCombinedEtfDossier,
  fetchFmpEndpoint,
  fetchTreasuryYieldCurve,
  searchApiNinjasEtfs,
} from '../services/etfFmpService.ts';
import { getNavDatabase, NavDatabaseService } from '../services/navDatabaseService.ts';
import { FinanciaMutualFundDatabase } from '../catalog/database.ts';
import { buildUniformFundDossier } from '../catalog/v1Routes.ts';

const VALID_TIMEFRAMES = new Set(['1D', '1W', '1M', '4M', '1Y']);
type SupportedTimeframe = '1D' | '1W' | '1M' | '4M' | '1Y';

function normalizeTimeframe(raw: unknown): SupportedTimeframe {
  const candidate = String(raw || '4M').trim().toUpperCase();
  return VALID_TIMEFRAMES.has(candidate) ? (candidate as SupportedTimeframe) : '4M';
}

export function createStocksRouter(
  navDbOverride?: NavDatabaseService | null,
  mfDb?: FinanciaMutualFundDatabase | null
): Router {
  const router = Router();
  const resolveNavDb = (): NavDatabaseService | null => navDbOverride ?? getNavDatabase();

  router.get('/health', (_req, res) => {
    const configuredKeys = {
      twelveData: Boolean(process.env.TWELVE_DATA_API_KEY),
      marketstack: Boolean(process.env.MARKETSTACK_API_KEY),
      finnhub: Boolean(process.env.FINNHUB_API_KEY),
      alpaca: Boolean(process.env.ALPACA_KEY_ID && process.env.ALPACA_SECRET_KEY),
      alphaVantage: Boolean(process.env.ALPHA_VANTAGE_API_KEY),
      apiNinjas: Boolean(process.env.API_NINJAS_KEY),
      fmp: Boolean(process.env.FMP_API_KEY),
      customMarketApi: Boolean(process.env.MARKET_DATA_API_KEY && process.env.MARKET_DATA_BASE_URL),
      forexApi: Boolean(process.env.FOREX_API_KEY),
      newsApi: Boolean(process.env.NEWS_API_KEY),
      gemini: isGeminiConfigured(),
    };

    const zeroKeyEndpoints = {
      mfnavAnalyticsApi: true,
      amfiMutualFundNavApi: true,
      amfiSchemeSearch: true,
      binanceSpotGoldRestAndWs: true,
      bullionAndEtfEngine: true,
    };

    const navDbStatus = resolveNavDb()?.getStatus() ?? null;

    res.json({
      status: 'ok',
      service: 'Financia Mutual Funds, Gold, Debt & ETF API',
      assetPillars: ['Mutual Funds', 'Gold & Bullion', 'Debt Funds', 'ETFs'],
      mode: Object.values(configuredKeys).some(Boolean)
        ? 'live-upstream-configured'
        : 'plug-and-play-public-feeds',
      persistence: 'file-backed-json',
      navDatabase: navDbStatus
        ? {
            connected: navDbStatus.connected,
            mode: navDbStatus.mode,
            totalRows: navDbStatus.totalRows,
            distinctSchemes: navDbStatus.distinctSchemes,
            earliestDate: navDbStatus.earliestDate,
            latestDate: navDbStatus.latestDate,
          }
        : { connected: false, mode: 'unconfigured', totalRows: 0, distinctSchemes: 0 },
      geminiConfigured: configuredKeys.gemini,
      zeroKeyEndpoints,
      configuredKeys,
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/quote/:symbol', async (req, res) => {
    const symbol = String(req.params.symbol || 'GOLDBEES').trim().toUpperCase();
    if (!/^[A-Z0-9.^-]{1,14}$/.test(symbol)) {
      res.status(400).json({ error: 'Invalid symbol format.' });
      return;
    }

    if (process.env.FINNHUB_API_KEY) {
      try {
        const fhRes = await fetchWithTimeout(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
            symbol
          )}&token=${encodeURIComponent(process.env.FINNHUB_API_KEY)}`
        );
        if (fhRes.ok) {
          const data = (await fhRes.json()) as { c?: number };
          if (typeof data.c === 'number' && data.c > 0) {
            res.json({ provider: 'finnhub', symbol, ...data });
            return;
          }
        }
      } catch {
        // Fallback cleanly
      }
    }

    const alpacaKeyId = process.env.ALPACA_KEY_ID || process.env.ALPACA_API_KEY || '';
    const alpacaSecretKey = process.env.ALPACA_SECRET_KEY || process.env.ALPACA_API_SECRET || '';
    if (alpacaKeyId && alpacaSecretKey) {
      try {
        const alpRes = await fetchWithTimeout(
          `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/trades/latest`,
          {
            headers: {
              'APCA-API-KEY-ID': alpacaKeyId,
              'APCA-API-SECRET-KEY': alpacaSecretKey,
            },
          }
        );
        if (alpRes.ok) {
          const alpJson = (await alpRes.json()) as { trade?: { p?: number } };
          if (alpJson.trade?.p) {
            res.json({ provider: 'alpaca', symbol, c: alpJson.trade.p });
            return;
          }
        }
      } catch {
        // Fallback cleanly
      }
    }

    const fallback = synthesizeCustomTickerReport(symbol, INITIAL_STOCKS);
    const avQuote = await fetchAlphaVantageStock(symbol, fallback);
    if (avQuote) {
      res.json({
        provider: 'alpha-vantage',
        symbol,
        c: avQuote.price,
        d: avQuote.change,
        dp: avQuote.changePercent,
      });
      return;
    }

    res.json({
      provider: 'financia-research-engine',
      symbol,
      c: fallback.price,
      d: fallback.change,
      dp: fallback.changePercent,
    });
  });

  const handleGoldKlines = async (req: Request, res: Response) => {
    const symbol = String(req.query.symbol || 'PAXGUSDT')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const interval = String(req.query.interval || '1h').trim();
    const limit = Math.min(200, Math.max(8, Number(req.query.limit || 24)));

    try {
      const binanceRes = await fetchWithTimeout(
        `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(
          symbol
        )}&interval=${encodeURIComponent(interval)}&limit=${limit}`
      );
      if (binanceRes.ok) {
        const rawRows = await binanceRes.json();
        const candles = parseBinanceKlines(rawRows);
        if (candles.length > 0) {
          res.json({
            source: 'binance-spot-gold-rest',
            symbol,
            interval,
            candles,
          });
          return;
        }
      }
    } catch {
      // Fallback cleanly
    }

    const goldFallback =
      SUPERCHART_INSTRUMENTS.find((item) => item.symbol === 'PAXGUSDT' || item.symbol === 'GOLDBEES') ||
      SUPERCHART_INSTRUMENTS[0];
    res.json({
      source: 'financia-fallback',
      symbol,
      interval,
      candles: goldFallback.candles,
    });
  };

  router.get('/gold/klines', handleGoldKlines);
  router.get('/crypto/klines', handleGoldKlines);

  router.get('/sec/company/:ticker', async (req, res) => {
    const ticker = String(req.params.ticker || 'GLD').trim().toUpperCase();
    const meta = await resolveSecCompanyMeta(ticker);
    if (!meta) {
      res.status(404).json({ error: `No SEC CIK mapping found for ${ticker}` });
      return;
    }

    const factsPayload = await fetchSecCompanyFacts(meta.cik);
    const base = synthesizeCustomTickerReport(ticker, INITIAL_STOCKS);
    const enriched = factsPayload
      ? parseSecCompanyFacts(factsPayload, meta.cik, meta.title, base)
      : { ...base, cik: meta.cik, name: meta.title };

    res.json({
      source: factsPayload ? 'sec-edgar-xbrl' : 'sec-edgar-cik',
      ticker,
      cik: meta.cik,
      title: meta.title,
      edgarUrl: `https://www.sec.gov/edgar/browse/?CIK=${meta.cik}`,
      quarterlyFinancials: enriched.report.financial_charts.financial_performance_4q,
    });
  });

  const handleAnalyze = async (req: Request, res: Response) => {
    const rawTicker = String(req.query.ticker || 'QQQ').trim().toUpperCase();
    const check = validateTickerInput(rawTicker);
    if (!check.valid) {
      res.status(400).json({ error: check.error || 'Invalid symbol format.' });
      return;
    }

    let { stock, source } = await enrichStockQuote(check.normalized);
    const db = resolveNavDb();
    let navDbDetail = null;
    let navDbHistory = null;
    let terminalDbFund = null;

    if (db && db.isConnected()) {
      const detail = db.getSchemeDetail(check.normalized);
      if (detail) {
        navDbDetail = detail;
        navDbHistory = db.getSchemeHistory(check.normalized, { page: 1, pageSize: 60 });
      }
    }

    if (mfDb) {
      const rawDossier = mfDb.getTerminalFundDossier(check.normalized);
      const uniform = buildUniformFundDossier(mfDb, rawDossier);
      if (uniform) {
        terminalDbFund = uniform;
        const navPrice = uniform.nav > 0 ? Number(uniform.nav.toFixed(2)) : stock.price;
        const hay = `${uniform.instrument_type} ${uniform.asset_class} ${uniform.sub_category} ${uniform.scheme_name}`.toLowerCase();
        const mappedSector: 'Mutual Funds' | 'Gold & Bullion' | 'Debt Funds' | 'ETFs' =
          hay.includes('gold') || hay.includes('silver') || hay.includes('bullion')
            ? 'Gold & Bullion'
            : uniform.instrument_type === 'ETF'
              ? 'ETFs'
              : hay.includes('debt') || hay.includes('gilt') || hay.includes('liquid') || hay.includes('bond')
                ? 'Debt Funds'
                : 'Mutual Funds';
        stock = {
          ...stock,
          ticker: uniform.scheme_code,
          name: uniform.scheme_name,
          sector: mappedSector,
          price: navPrice,
          currencyUnit: 'INR',
          dataSource: 'Financia SQLite AMFI Catalog',
        };
        source = 'sqlite-terminal-catalog';
      }
    }

    res.json({
      source,
      stock,
      navDbDetail,
      navDbHistory,
      terminalDbFund,
    });
  };

  router.get('/funds/analyze', handleAnalyze);
  router.get('/stocks/analyze', handleAnalyze);

  // Unified Fund Terminal database autocomplete suggestions (Core 20 ETFs/MFs + SQLite nav_master schemes)
  router.get('/terminal/suggest', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const rawFilter = typeof req.query.filter === 'string' ? req.query.filter : 'ALL';
    const validFilters = new Set<TerminalSuggestionFilter>(['ALL', 'ETF', 'Mutual Fund', 'SQLITE_DB']);
    const filter: TerminalSuggestionFilter = validFilters.has(rawFilter as TerminalSuggestionFilter)
      ? (rawFilter as TerminalSuggestionFilter)
      : 'ALL';
    const limit = Math.min(60, Math.max(1, Number(req.query.limit || 24) || 24));

    const db = resolveNavDb();
    const navDbSchemes = db && db.isConnected() ? db.listSchemes(100, 0) : [];
    const suggestions = buildTerminalSuggestions({
      query,
      catalogFunds: SCREENER_FUNDS,
      navDbSchemes,
      filter,
      limit,
    });

    res.json({
      source: db && db.isConnected() ? 'catalog+sqlite-nav-master' : 'catalog-only',
      query,
      filter,
      totalCatalog: SCREENER_FUNDS.length,
      totalNavDb: navDbSchemes.length,
      suggestions,
    });
  });

  const handleTechnicals = async (req: Request, res: Response) => {
    const check = validateTickerInput(String(req.params.ticker || 'GOLDBEES'));
    if (!check.valid) {
      res.status(400).json({ error: check.error || 'Invalid symbol format.' });
      return;
    }

    const timeframe = normalizeTimeframe(req.query.timeframe);
    const requestedRsi = Math.min(28, Math.max(2, Number(req.query.rsiPeriod || 14) || 14));
    const smaPeriod = Math.min(20, Math.max(2, Number(req.query.smaPeriod || 5) || 5));

    const { stock, source } = await enrichStockQuote(check.normalized);
    const series = getSeriesForTimeframe(stock.report.financial_charts.stock_price_4m, timeframe);
    const closes = series.map((pt) => pt.price);

    const effectiveSma = Math.min(smaPeriod, Math.max(2, closes.length - 1));
    const effectiveRsiPeriod = getEffectiveRSIPeriod(closes.length, requestedRsi);
    const sma = calculateSMA(closes, effectiveSma);
    const bollinger = calculateBollingerBands(closes, effectiveSma, 2);
    const rsi = calculateRSISeries(closes, effectiveRsiPeriod);

    const latestRsi = rsi.length > 0 ? rsi[rsi.length - 1] : null;
    const rsiZone = summarizeRSIZone(latestRsi);

    res.json({
      source,
      ticker: stock.ticker,
      name: stock.name,
      assetClass: stock.assetClass || stock.sector,
      currencyUnit: stock.currencyUnit || 'USD',
      spotPrice: stock.price,
      timeframe,
      requestedRsiPeriod: requestedRsi,
      effectiveRsiPeriod,
      smaPeriod: effectiveSma,
      latestRsi,
      rsiZone,
      points: series.map((pt, idx) => ({
        date: pt.date,
        price: pt.price,
        volume: pt.volume,
        sma: sma[idx] ?? null,
        bollingerUpper: bollinger[idx]?.upper ?? null,
        bollingerMiddle: bollinger[idx]?.middle ?? null,
        bollingerLower: bollinger[idx]?.lower ?? null,
        rsi: rsi[idx] ?? null,
      })),
    });
  };

  router.get('/funds/technicals/:ticker', handleTechnicals);
  router.get('/stocks/technicals/:ticker', handleTechnicals);

  const handleCompare = async (req: Request, res: Response) => {
    const primaryCheck = validateTickerInput(String(req.query.primary || 'GOLDBEES'));
    if (!primaryCheck.valid) {
      res.status(400).json({ error: primaryCheck.error || 'Invalid primary symbol.' });
      return;
    }

    const rawSecondary = String(req.query.secondary || '').trim();
    const secondarySymbols = rawSecondary
      ? Array.from(
          new Set(
            rawSecondary
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .filter((s) => s && s !== primaryCheck.normalized && validateTickerInput(s).valid)
          )
        ).slice(0, 4)
      : [];

    const timeframe = normalizeTimeframe(req.query.timeframe);
    const requestedRsi = Math.min(28, Math.max(2, Number(req.query.rsiPeriod || 14) || 14));

    const [primaryResult, ...secondaryResults] = await Promise.all([
      enrichStockQuote(primaryCheck.normalized),
      ...secondarySymbols.map((sym) => enrichStockQuote(sym)),
    ]);

    const comparison = buildMultiTickerComparisonSeries(
      primaryResult.stock,
      secondaryResults.map((r) => r.stock),
      timeframe,
      requestedRsi
    );

    res.json({
      source: primaryResult.source,
      timeframe,
      requestedRsiPeriod: requestedRsi,
      comparison,
    });
  };

  router.get('/funds/compare', handleCompare);
  router.get('/stocks/compare', handleCompare);

  // Full AMFI Mutual Fund API (https://api.mfapi.in) Endpoints
  router.get('/mf/search', async (req, res) => {
    const query = String(req.query.q || '').trim();
    const result = await searchAmfiSchemes(query);
    res.json(result);
  });

  router.get('/mf', async (req, res) => {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const result = await listAmfiSchemes(limit, offset);
    res.json(result);
  });

  router.get('/mf/:schemeCode/latest', async (req, res) => {
    const code = String(req.params.schemeCode || '').trim();
    if (!/^\d{4,8}$/.test(code)) {
      res.status(400).json({ error: 'Valid numeric AMFI scheme_code required (e.g., 125497).' });
      return;
    }
    const result = await fetchAmfiSchemeLatest(code);
    res.json(result);
  });

  router.get('/mf/:schemeCode', async (req, res) => {
    const code = String(req.params.schemeCode || '').trim();
    if (!/^\d{4,8}$/.test(code)) {
      res.status(400).json({ error: 'Valid numeric AMFI scheme_code required (e.g., 125497).' });
      return;
    }
    const result = await fetchAmfiSchemeHistory(code);
    res.json(result);
  });

  // Local SQLite nav_master (DATABASE_PATH or dev ./amfi_nav_dev.db seeded from amfi_nav_dev.sql)
  router.get('/nav-master/status', (_req, res) => {
    const db = resolveNavDb();
    if (!db) {
      res.json({
        connected: false,
        mode: 'unconfigured',
        totalRows: 0,
        distinctSchemes: 0,
        earliestDate: null,
        latestDate: null,
        sources: [],
      });
      return;
    }
    const status = db.getStatus();
    res.json({
      connected: status.connected,
      mode: status.mode,
      seededFromSql: status.seededFromSql,
      totalRows: status.totalRows,
      distinctSchemes: status.distinctSchemes,
      earliestDate: status.earliestDate,
      latestDate: status.latestDate,
      sources: status.sources,
    });
  });

  router.get('/nav-master/schemes', (req, res) => {
    const db = resolveNavDb();
    if (!db || !db.isConnected()) {
      res.status(503).json({ error: 'SQLite nav_master database is not connected.' });
      return;
    }
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const schemes = db.listSchemes(limit, offset);
    const status = db.getStatus();
    res.json({
      source: 'sqlite-nav-master',
      totalSchemes: status.distinctSchemes,
      totalRows: status.totalRows,
      schemes,
    });
  });

  router.get('/nav-master/search', (req, res) => {
    const db = resolveNavDb();
    if (!db || !db.isConnected()) {
      res.status(503).json({ error: 'SQLite nav_master database is not connected.' });
      return;
    }
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = Number(req.query.limit || 25);
    const results = db.searchSchemes(query, limit);
    res.json({
      source: 'sqlite-nav-master',
      query,
      results,
    });
  });

  router.get('/nav-master/fund/:codeOrIsin', (req, res) => {
    const db = resolveNavDb();
    if (!db || !db.isConnected()) {
      res.status(503).json({ error: 'SQLite nav_master database is not connected.' });
      return;
    }
    const key = String(req.params.codeOrIsin || '').trim();
    if (!/^[A-Za-z0-9_-]{1,24}$/.test(key)) {
      res.status(400).json({ error: 'Valid scheme_code or ISIN required.' });
      return;
    }
    const detail = db.getSchemeDetail(key);
    if (!detail) {
      res.status(404).json({ error: `Scheme ${key} not found in SQLite nav_master.` });
      return;
    }
    res.json({
      source: 'sqlite-nav-master',
      payload: detail,
    });
  });

  router.get('/nav-master/nav/:codeOrIsin', (req, res) => {
    const db = resolveNavDb();
    if (!db || !db.isConnected()) {
      res.status(503).json({ error: 'SQLite nav_master database is not connected.' });
      return;
    }
    const key = String(req.params.codeOrIsin || '').trim();
    if (!/^[A-Za-z0-9_-]{1,24}$/.test(key)) {
      res.status(400).json({ error: 'Valid scheme_code or ISIN required.' });
      return;
    }
    const history = db.getSchemeHistory(key, {
      startDate: typeof req.query.start_date === 'string' ? req.query.start_date : undefined,
      endDate: typeof req.query.end_date === 'string' ? req.query.end_date : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.page_size ? Number(req.query.page_size) : 90,
    });
    if (!history) {
      res.status(404).json({ error: `NAV history for ${key} not found in SQLite nav_master.` });
      return;
    }
    res.json({
      source: 'sqlite-nav-master',
      payload: history,
    });
  });

  // mfnav.in AMFI Scheme, ISIN & Risk Analytics API (120 req/min zero-key)
  router.get('/mfnav/search', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const result = await searchMfnavFunds({
      q: query,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.page_size || 25),
    });

    const db = resolveNavDb();
    if (query && db && db.isConnected()) {
      const localMatches = db.searchSchemes(query, 6);
      if (localMatches.length > 0 && Array.isArray(result.results)) {
        const seen = new Set(result.results.map((item: { scheme_code: number }) => item.scheme_code));
        const mappedLocal = localMatches
          .filter((row) => !seen.has(row.scheme_code))
          .map((row) => ({
            scheme_code: row.scheme_code,
            scheme_name: row.scheme_name,
            fund_house: `${row.source} (SQLite nav_master)`,
            scheme_category: row.source,
            sub_category: `${row.source} Long-Short`,
            isin: row.isin || undefined,
          }));
        res.json({ ...result, results: [...mappedLocal, ...result.results] });
        return;
      }
    }

    res.json(result);
  });

  router.get('/mfnav/categories', async (_req, res) => {
    const result = await fetchMfnavCategories();
    res.json(result);
  });

  router.get('/mfnav/date/latest', async (_req, res) => {
    const result = await fetchMfnavDateLatest();
    res.json(result);
  });

  router.get('/mfnav/nav/:codeOrIsin', async (req, res) => {
    const key = String(req.params.codeOrIsin || '').trim();
    if (!/^[A-Za-z0-9]{1,16}$/.test(key)) {
      res.status(400).json({ error: 'Valid scheme_code or ISIN required (e.g., 100641 or INF200K01LJ4).' });
      return;
    }

    const db = resolveNavDb();
    if (db && db.isConnected()) {
      const localHistory = db.getSchemeHistory(key, {
        startDate: typeof req.query.start_date === 'string' ? req.query.start_date : undefined,
        endDate: typeof req.query.end_date === 'string' ? req.query.end_date : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.page_size ? Number(req.query.page_size) : 30,
      });
      if (localHistory) {
        res.json({ source: 'sqlite-nav-master', payload: localHistory });
        return;
      }
    }

    const result = await fetchMfnavNavSeriesRaw(key, {
      startDate: typeof req.query.start_date === 'string' ? req.query.start_date : undefined,
      endDate: typeof req.query.end_date === 'string' ? req.query.end_date : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.page_size ? Number(req.query.page_size) : 30,
    });
    res.json(result);
  });

  router.get('/mfnav/fund/:codeOrPlan/:option', async (req, res) => {
    const plan = String(req.params.codeOrPlan || '').trim();
    const option = String(req.params.option || '').trim();
    if (!/^[A-Za-z0-9_-]{2,24}$/.test(plan) || !/^[A-Za-z0-9_-]{2,24}$/.test(option)) {
      res.status(400).json({ error: 'Invalid plan/option path parameters.' });
      return;
    }
    const result = await fetchMfnavFundRaw(`${encodeURIComponent(plan)}/${encodeURIComponent(option)}`);
    res.status(result.status).json({ source: result.source, payload: result.payload });
  });

  router.get('/mfnav/fund/:codeOrIsin', async (req, res) => {
    const key = String(req.params.codeOrIsin || '').trim();
    if (!/^[A-Za-z0-9_-]{1,24}$/.test(key)) {
      res.status(400).json({ error: 'Valid scheme_code, ISIN, or plan required.' });
      return;
    }

    const db = resolveNavDb();
    if (db && db.isConnected()) {
      const localDetail = db.getSchemeDetail(key);
      if (localDetail) {
        res.json({
          source: 'sqlite-nav-master',
          payload: {
            scheme_code: localDetail.scheme_code,
            scheme_name: localDetail.scheme_name,
            fund_house: `${localDetail.source} Desk`,
            scheme_category: localDetail.source,
            sub_category: 'Specialized Investment Fund',
            plan_type: localDetail.scheme_name.toLowerCase().includes('direct') ? 'Direct' : 'Regular',
            option_type: localDetail.scheme_name.toLowerCase().includes('idcw') ? 'IDCW' : 'Growth',
            isin: localDetail.isin,
            latest_nav: localDetail.latest_nav,
            latest_nav_date: localDetail.latest_date,
            latest_day_change_pct: localDetail.day_change_pct,
            last_updated: localDetail.latest_date,
            source: 'sqlite-nav-master',
            daily_metrics: {
              cagr_1y: localDetail.cagr_1y_pct !== null ? localDetail.cagr_1y_pct / 100 : null,
              vol_3y:
                localDetail.annualized_volatility_pct !== null
                  ? localDetail.annualized_volatility_pct / 100
                  : null,
              max_dd_3y:
                localDetail.max_drawdown_pct !== null ? localDetail.max_drawdown_pct / 100 : null,
            },
          },
        });
        return;
      }
    }

    const result = await fetchMfnavFundRaw(encodeURIComponent(key));
    res.status(result.status).json({ source: result.source, payload: result.payload });
  });

  // API Ninjas ETF API + FMP Stable ETF, Sovereign Yield Curve, Bullion & Macro Routes
  router.get('/etf/list', async (req, res) => {
    const provider = String(req.query.provider || 'ninjas').toLowerCase();
    if (provider === 'fmp') {
      const fmpRes = await fetchFmpEndpoint('etf-list');
      res.json(fmpRes);
      return;
    }
    const offset = Number(req.query.offset || 0);
    const result = await fetchApiNinjasEtfList(offset);
    res.json(result);
  });

  router.get('/etf/search', async (req, res) => {
    const result = await searchApiNinjasEtfs({
      name: typeof req.query.name === 'string' ? req.query.name : undefined,
      min_aum: typeof req.query.min_aum === 'string' ? req.query.min_aum : undefined,
      max_aum: typeof req.query.max_aum === 'string' ? req.query.max_aum : undefined,
      min_expense_ratio: typeof req.query.min_expense_ratio === 'string' ? req.query.min_expense_ratio : undefined,
      max_expense_ratio: typeof req.query.max_expense_ratio === 'string' ? req.query.max_expense_ratio : undefined,
      holdings: typeof req.query.holdings === 'string' ? req.query.holdings : undefined,
      country: typeof req.query.country === 'string' ? req.query.country : undefined,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    });
    res.json(result);
  });

  router.get('/etf/detail/:symbolOrIsin', async (req, res) => {
    const sym = String(req.params.symbolOrIsin || 'GOLDBEES').trim().toUpperCase();
    if (!/^[A-Z0-9.^-]{1,16}$/.test(sym)) {
      res.status(400).json({ error: 'Invalid ETF ticker or ISIN.' });
      return;
    }
    const dossier = await fetchCombinedEtfDossier(sym);
    res.json(dossier);
  });

  router.get('/etf/holdings/:symbol', async (req, res) => {
    const sym = String(req.params.symbol || 'SPY').trim().toUpperCase();
    const result = await fetchFmpEndpoint('etf/holdings', { symbol: sym });
    res.json({ symbol: sym, ...result });
  });

  router.get('/etf/weightings/:symbol', async (req, res) => {
    const sym = String(req.params.symbol || 'SPY').trim().toUpperCase();
    const [sectors, countries] = await Promise.all([
      fetchFmpEndpoint('etf/sector-weightings', { symbol: sym }),
      fetchFmpEndpoint('etf/country-weightings', { symbol: sym }),
    ]);
    res.json({
      symbol: sym,
      sectorWeightings: sectors.data,
      countryWeightings: countries.data,
      source: sectors.source,
    });
  });

  router.get('/fmp/isin/:isin', async (req, res) => {
    const isin = String(req.params.isin || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{10,16}$/.test(isin)) {
      res.status(400).json({ error: 'Valid ISIN identifier required.' });
      return;
    }
    const result = await fetchFmpEndpoint('search-isin', { isin });
    res.json({ isin, ...result });
  });

  router.get('/fmp/funds/disclosures', async (req, res) => {
    const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
    if (name) {
      const result = await fetchFmpEndpoint('funds/disclosure-holders-search', { name });
      res.json(result);
      return;
    }
    const symbol = String(req.query.symbol || 'GLD').trim().toUpperCase();
    const year = String(req.query.year || '2025');
    const quarter = String(req.query.quarter || '4');
    const result = await fetchFmpEndpoint('funds/disclosure', { symbol, year, quarter });
    res.json({ symbol, year, quarter, ...result });
  });

  router.get('/fmp/batch/etfs', async (_req, res) => {
    res.json(await fetchFmpEndpoint('batch-etf-quotes'));
  });

  router.get('/fmp/batch/mutual-funds', async (_req, res) => {
    res.json(await fetchFmpEndpoint('batch-mutualfund-quotes'));
  });

  router.get('/fmp/batch/commodities', async (_req, res) => {
    res.json(await fetchFmpEndpoint('batch-commodity-quotes'));
  });

  router.get('/fmp/batch/forex', async (_req, res) => {
    res.json(await fetchFmpEndpoint('batch-forex-quotes', { short: 'true' }));
  });

  router.get('/macro/treasury-rates', async (_req, res) => {
    const curve = await fetchTreasuryYieldCurve();
    res.json(curve);
  });

  router.get('/macro/indicators', async (req, res) => {
    const name = String(req.query.name || 'CPI').trim();
    const result = await fetchFmpEndpoint('economic-indicators', { name });
    res.json({ indicator: name, ...result });
  });

  return router;
}

