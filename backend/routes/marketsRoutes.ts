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

  router.get('/heatmap', (req, res) => {
    const rawMarket = String(req.query.market || 'global').trim().toLowerCase();
    const market: HeatmapMarket = rawMarket === 'india' ? 'india' : 'global';
    const sector = String(req.query.sector || 'All').trim() || 'All';
    const tick = Math.max(0, Math.min(200, Math.floor(Number(req.query.tick || 0) || 0)));

    let tiles = HEATMAP_STOCKS;
    for (let step = 1; step <= tick; step++) {
      tiles = applyHeatmapTick(tiles, step);
    }

    const groups = buildSectorGroups(tiles, market, sector);
    const activeTiles = groups.flatMap((g) => g.tiles).map((tile) => ({
      ...tile,
      volatilityPct: calculateRealizedVolatility(tile.sparkline, tile.changePercent),
    }));

    const totalCapB = groups.reduce((sum, g) => sum + g.totalCapB, 0);
    const weightedVolatilityPct =
      totalCapB > 0
        ? Number(
            (
              groups.reduce((sum, g) => sum + g.volatilityPct * g.totalCapB, 0) / totalCapB
            ).toFixed(1)
          )
        : 0;
    const weightedChangePct =
      totalCapB > 0
        ? Number(
            (
              groups.reduce((sum, g) => sum + g.avgChangePercent * g.totalCapB, 0) / totalCapB
            ).toFixed(2)
          )
        : 0;

    res.json({
      market,
      sector,
      tick,
      totalCapB,
      weightedVolatilityPct,
      weightedChangePct,
      advancers: activeTiles.filter((t) => t.changePercent > 0).length,
      decliners: activeTiles.filter((t) => t.changePercent < 0).length,
      sectors: groups,
      tiles: activeTiles,
      updatedAt: new Date().toISOString(),
    });
  });

  router.get('/sentiment', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const now = Date.now();
    if (!forceRefresh && sentimentCache && now - sentimentCache.fetchedAt < 5 * 60 * 1000) {
      res.json(sentimentCache.payload);
      return;
    }

    let liveSpotGoldChangePercent: number | null = null;

    try {
      const goldRes = await fetchWithTimeout(
        'https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT',
        {},
        4000
      );
      if (goldRes.ok) {
        const goldJson = (await goldRes.json()) as { priceChangePercent?: string };
        const pct = Number(goldJson.priceChangePercent);
        if (Number.isFinite(pct)) {
          liveSpotGoldChangePercent = Number(pct.toFixed(2));
        }
      }
    } catch {
      // Fallback silently to deterministic 4-pillar gold composite
    }

    const aggregatedNews: WireNewsItem[] = [
      ...TOP_STORIES,
      ...MUTUAL_FUND_NEWS,
      ...GOLD_DEBT_NEWS,
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
