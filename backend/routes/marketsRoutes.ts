import { Request, Response, Router } from 'express';
import {
  FOREX_NEWS,
  FOREX_PERFORMANCE_PAIRS,
  FUTURES_NEWS,
  GOLD_BULLION_ASSETS,
  GOLD_DEBT_NEWS,
  MACRO_SPARK_ROWS,
  MAJOR_INDICES,
  MUTUAL_FUND_NEWS,
  TOP_STORIES,
} from '../../frontend/data/tradingViewData.ts';
import { computeCompositeMarketSentiment } from '../../frontend/utils/sentimentEngine.ts';
import { WireNewsItem } from '../../frontend/types/markets.ts';
import {
  buildUpcomingEarningsCalendar,
  mergeFinnhubEarnings,
} from '../../frontend/utils/earningsEngine.ts';
import {
  earningsCache,
  fetchWithTimeout,
  sentimentCache,
  setEarningsCache,
  setSentimentCache,
} from '../services/marketDataService.ts';
import { fetchFmpEndpoint } from '../services/etfFmpService.ts';
import {
  applyHeatmapTick,
  buildSectorGroups,
  calculateRealizedVolatility,
  HEATMAP_STOCKS,
  HeatmapMarket,
} from '../../frontend/utils/heatmapEngine.ts';

export function createMarketsRouter(): Router {
  const router = Router();

  router.get('/markets/overview', (_req, res) => {
    res.json({
      source: process.env.FOREX_API_KEY ? 'live-api' : 'financia-4pillar-engine',
      indices: MAJOR_INDICES,
      forexPerformance: FOREX_PERFORMANCE_PAIRS,
      forexNews: FOREX_NEWS,
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/sentiment', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const now = Date.now();
    if (!forceRefresh && sentimentCache && now - sentimentCache.fetchedAt < 5 * 60 * 1000) {
      res.json(sentimentCache.payload);
      return;
    }

    let liveCryptoFng = null;
    let liveBtcChangePercent: number | null = null;
    let liveWireNews: WireNewsItem[] = [];

    const [fngResult, btcResult, ccNewsResult] = await Promise.allSettled([
      fetchWithTimeout('https://api.alternative.me/fng/?limit=90', {}, 4500),
      fetchWithTimeout('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {}, 4000),
      fetchWithTimeout('https://min-api.cryptocompare.com/data/v2/news/?lang=EN', {}, 3500),
    ]);

    if (fngResult.status === 'fulfilled' && fngResult.value.ok) {
      try {
        const fngJson = await fngResult.value.json();
        liveCryptoFng = parseAlternativeMeFng(fngJson);
      } catch {
        // Fallback silently
      }
    }

    if (btcResult.status === 'fulfilled' && btcResult.value.ok) {
      try {
        const btcJson = (await btcResult.value.json()) as { priceChangePercent?: string };
        const pct = Number(btcJson.priceChangePercent);
        if (Number.isFinite(pct)) {
          liveBtcChangePercent = Number(pct.toFixed(2));
        }
      } catch {
        // Fallback silently
      }
    }

    if (ccNewsResult.status === 'fulfilled' && ccNewsResult.value.ok) {
      try {
        const ccJson = await ccNewsResult.value.json();
        liveWireNews = parseLiveCryptoCompareNews(ccJson);
      } catch {
        // Fallback silently
      }
    }

    const aggregatedNews: WireNewsItem[] = [
      ...liveWireNews,
      ...TOP_STORIES,
      ...INDIAN_STOCKS_NEWS,
      ...CRYPTO_NEWS,
      ...FOREX_NEWS,
      ...FUTURES_NEWS,
    ];

    const payload = computeCompositeMarketSentiment({
      indices: MAJOR_INDICES,
      crypto: CRYPTO_ASSETS,
      macro: MACRO_SPARK_ROWS,
      news: aggregatedNews,
      liveCryptoFng,
      liveBtcChangePercent,
      isLive: Boolean(liveCryptoFng || liveBtcChangePercent !== null || liveWireNews.length > 0),
      nowIso: new Date().toISOString(),
    });

    setSentimentCache({ fetchedAt: now, payload });
    res.json(payload);
  });

  router.get('/earnings-calendar', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const now = Date.now();
    if (!forceRefresh && earningsCache && now - earningsCache.fetchedAt < 10 * 60 * 1000) {
      res.json({
        source: earningsCache.source,
        updatedAt: new Date(earningsCache.fetchedAt).toISOString(),
        events: earningsCache.events,
      });
      return;
    }

    let events = buildUpcomingEarningsCalendar(now);
    let source = 'financia-consensus-schedule';

    if (process.env.FINNHUB_API_KEY) {
      try {
        const from = new Date(now).toISOString().slice(0, 10);
        const to = new Date(now + 35 * 86400 * 1000).toISOString().slice(0, 10);
        const fhRes = await fetchWithTimeout(
          `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${encodeURIComponent(
            process.env.FINNHUB_API_KEY
          )}`
        );
        if (fhRes.ok) {
          const rawJson = await fhRes.json();
          events = mergeFinnhubEarnings(rawJson, events);
          source = 'finnhub-live-earnings';
        }
      } catch {
        // Fallback silently
      }
    }

    setEarningsCache({ fetchedAt: now, source, events });
    res.json({
      source,
      updatedAt: new Date(now).toISOString(),
      events,
    });
  });

  return router;
}
