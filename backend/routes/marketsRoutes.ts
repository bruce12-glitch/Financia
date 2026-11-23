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
      crypto: GOLD_BULLION_ASSETS,
      macro: MACRO_SPARK_ROWS,
      news: aggregatedNews,
      liveCryptoFng: null,
      liveBtcChangePercent: liveSpotGoldChangePercent,
      isLive: liveSpotGoldChangePercent !== null,
      nowIso: new Date().toISOString(),
    });

    setSentimentCache({ fetchedAt: now, payload });
    res.json(payload);
  });

  const handlePolicyCalendar = async (req: Request, res: Response) => {
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
    let source = 'financia-4pillar-policy-schedule';

    const from = new Date(now).toISOString().slice(0, 10);
    const to = new Date(now + 35 * 86400 * 1000).toISOString().slice(0, 10);

    if (process.env.FMP_API_KEY) {
      try {
        const fmpCal = await fetchFmpEndpoint('economic-calendar', { from, to });
        if (Array.isArray(fmpCal.data) && fmpCal.data.length > 0) {
          interface FmpEconRow {
            date?: string;
            country?: string;
            event?: string;
            impact?: string;
            estimate?: number | string | null;
            previous?: number | string | null;
          }
          const macroRows = (fmpCal.data as FmpEconRow[])
            .filter((row) => {
              const evt = String(row.event || '');
              const country = String(row.country || '').toUpperCase();
              const impact = String(row.impact || '').toLowerCase();
              const isRateOrMacro = /rate|fomc|rbi|cpi|inflation|treasury|gilt|yield|gdp|gold|pce|bond/i.test(evt);
              return (country === 'US' || country === 'IN') && (impact === 'high' || isRateOrMacro);
            })
            .slice(0, 4);

          const mappedMacro = macroRows.map((row, idx) => {
            const iso = row.date ? new Date(row.date.replace(' ', 'T') + (row.date.includes('Z') ? '' : 'Z')).toISOString() : new Date(now + (idx + 2) * 86400 * 1000).toISOString();
            const isIndia = String(row.country || '').toUpperCase() === 'IN';
            return {
              id: `fmp-macro-${idx}-${String(row.event || 'macro').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)}`,
              ticker: isIndia ? 'SBIGILT' : 'TLT',
              companyName: `${String(row.country || 'US').toUpperCase()} Macro · ${String(row.event || 'Monetary Policy Release')}`,
              exchange: isIndia ? 'RBI / MOSPI' : 'US MACRO',
              market: isIndia ? ('india' as const) : ('us' as const),
              fiscalQuarter: String(row.impact || 'Macro'),
              reportDateIso: iso,
              dateLabel: iso.slice(0, 10),
              session: 'BMO' as const,
              epsEstimate: row.estimate !== null && row.estimate !== undefined ? String(row.estimate) : 'Consensus',
              priorEps: row.previous !== null && row.previous !== undefined ? String(row.previous) : 'Prior',
              revenueEstimate: isIndia ? 'IN Debt' : 'US Yields',
              badgeColor: isIndia ? '#089981' : '#2563EB',
            };
          });

          if (mappedMacro.length > 0) {
            events = [...events, ...mappedMacro].sort(
              (a, b) => Date.parse(a.reportDateIso) - Date.parse(b.reportDateIso)
            );
            source = 'fmp-macro-policy-calendar';
          }
        }
      } catch {
        // Fallback silently
      }
    } else if (process.env.FINNHUB_API_KEY) {
      try {
        const fhRes = await fetchWithTimeout(
          `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${encodeURIComponent(
            process.env.FINNHUB_API_KEY
          )}`
        );
        if (fhRes.ok) {
          const rawJson = await fhRes.json();
          events = mergeFinnhubEarnings(rawJson, events);
          source = 'finnhub-etf-calendar';
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
  };

  router.get('/policy-calendar', handlePolicyCalendar);
  router.get('/earnings-calendar', handlePolicyCalendar);

  return router;
}
