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

const VALID_TIMEFRAMES = new Set(['1D', '1W', '1M', '4M', '1Y']);
type SupportedTimeframe = '1D' | '1W' | '1M' | '4M' | '1Y';

function normalizeTimeframe(raw: unknown): SupportedTimeframe {
  const candidate = String(raw || '4M').trim().toUpperCase();
  return VALID_TIMEFRAMES.has(candidate) ? (candidate as SupportedTimeframe) : '4M';
}

export function createStocksRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    const configuredKeys = {
      finnhub: Boolean(process.env.FINNHUB_API_KEY),
      alpaca: Boolean(process.env.ALPACA_KEY_ID && process.env.ALPACA_SECRET_KEY),
      alphaVantage: Boolean(process.env.ALPHA_VANTAGE_API_KEY),
      fmp: Boolean(process.env.FMP_API_KEY),
      customMarketApi: Boolean(process.env.MARKET_DATA_API_KEY && process.env.MARKET_DATA_BASE_URL),
      forexApi: Boolean(process.env.FOREX_API_KEY),
      newsApi: Boolean(process.env.NEWS_API_KEY),
    };

    const zeroKeyEndpoints = {
      binancePublicRestAndWs: true,
      secEdgarCompanyFacts: true,
      alphaVantageIbmDemo: true,
    };

    res.json({
      status: 'ok',
      service: 'Financia Intelligence API',
      mode: Object.values(configuredKeys).some(Boolean)
        ? 'live-upstream-configured'
        : 'plug-and-play-public-feeds',
      zeroKeyEndpoints,
      configuredKeys,
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/quote/:symbol', async (req, res) => {
    const symbol = String(req.params.symbol || 'NVDA').trim().toUpperCase();
    if (!/^[A-Z0-9.^]{1,12}$/.test(symbol)) {
      res.status(400).json({ error: 'Invalid ticker symbol format.' });
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

    if (process.env.ALPACA_KEY_ID && process.env.ALPACA_SECRET_KEY) {
      try {
        const alpRes = await fetchWithTimeout(
          `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/trades/latest`,
          {
            headers: {
              'APCA-API-KEY-ID': process.env.ALPACA_KEY_ID,
              'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
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

  router.get('/crypto/klines', async (req, res) => {
    const symbol = String(req.query.symbol || 'BTCUSDT')
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
            source: 'binance-public-rest',
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

    const btcFallback =
      SUPERCHART_INSTRUMENTS.find((item) => item.symbol === 'BTCUSD') ||
      SUPERCHART_INSTRUMENTS[2];
    res.json({
      source: 'financia-fallback',
      symbol,
      interval,
      candles: btcFallback.candles,
    });
  });

  router.get('/sec/company/:ticker', async (req, res) => {
    const ticker = String(req.params.ticker || 'AAPL').trim().toUpperCase();
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

  router.get('/stocks/analyze', async (req, res) => {
    const rawTicker = String(req.query.ticker || 'NVDA').trim().toUpperCase();
    if (!/^[A-Z0-9.^]{1,12}$/.test(rawTicker)) {
      res.status(400).json({ error: 'Invalid ticker symbol format.' });
      return;
    }

    let stock = synthesizeCustomTickerReport(rawTicker, INITIAL_STOCKS);
    let sourceLabel = 'financia-research-engine';

    if (process.env.FINNHUB_API_KEY) {
      try {
        const fhRes = await fetchWithTimeout(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
            rawTicker
          )}&token=${encodeURIComponent(process.env.FINNHUB_API_KEY)}`
        );
        if (fhRes.ok) {
          const payload = (await fhRes.json()) as {
            c?: number;
            d?: number;
            dp?: number;
            pc?: number;
          };
          const merged = mergeFinnhubQuote(payload, stock);
          if (merged.dataSource === 'Finnhub Live Quote') {
            stock = merged;
            sourceLabel = 'finnhub-live';
          }
        }
      } catch {
        // Continue to secondary providers
      }
    }

    if (sourceLabel === 'financia-research-engine') {
      const avStock = await fetchAlphaVantageStock(rawTicker, stock);
      if (avStock) {
        stock = avStock;
        sourceLabel = 'alpha-vantage-live';
      }
    }

    if (
      sourceLabel === 'financia-research-engine' &&
      process.env.MARKET_DATA_API_KEY &&
      process.env.MARKET_DATA_BASE_URL
    ) {
      try {
        const upstreamUrl = `${process.env.MARKET_DATA_BASE_URL.replace(
          /\/$/,
          ''
        )}/quote?symbol=${encodeURIComponent(rawTicker)}&token=${encodeURIComponent(
          process.env.MARKET_DATA_API_KEY
        )}`;
        const upstreamRes = await fetchWithTimeout(upstreamUrl);
        if (upstreamRes.ok) {
          const payload = (await upstreamRes.json()) as { c?: number; d?: number; dp?: number };
          stock = mergeFinnhubQuote(payload, stock);
          if (typeof payload.c === 'number' && payload.c > 0) {
            stock.dataSource = 'Custom Upstream Live API';
            sourceLabel = 'live-api';
          }
        }
      } catch {
        // Keep structured research engine
      }
    }

    const secMeta = await resolveSecCompanyMeta(rawTicker);
    if (secMeta) {
      const secFacts = await fetchSecCompanyFacts(secMeta.cik);
      if (secFacts) {
        stock = parseSecCompanyFacts(secFacts, secMeta.cik, secMeta.title, stock);
        sourceLabel =
          sourceLabel === 'financia-research-engine'
            ? 'sec-edgar-live'
            : `${sourceLabel}+sec-edgar`;
      } else {
        stock = {
          ...stock,
          cik: secMeta.cik,
          dataSource: stock.dataSource || `SEC EDGAR CIK ${secMeta.cik}`,
        };
      }
    }

    res.json({
      source: sourceLabel,
      stock,
    });
  });

  return router;
}
