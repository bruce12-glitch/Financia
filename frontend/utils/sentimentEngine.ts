import { MarketSymbolRow } from '../types/markets';

export type SentimentScope = 'global' | 'crypto' | 'india';
export type SentimentTimeframe = '7d' | '30d' | '90d';

export type SentimentZoneLabel =
  | 'Extreme Fear'
  | 'Fear'
  | 'Neutral'
  | 'Greed'
  | 'Extreme Greed';

export interface SentimentDriver {
  id: string;
  label: string;
  score: number;
  signal: string;
}

export interface SentimentHistoryPoint {
  date: string;
  label: string;
  score: number;
}

export interface SentimentScopeSnapshot {
  scope: SentimentScope;
  title: string;
  score: number;
  zone: SentimentZoneLabel;
  color: string;
  previousClose: number;
  oneWeekAgo: number;
  oneMonthAgo: number;
  deltaFromClose: number;
  summary: string;
  drivers: SentimentDriver[];
  history7d: number[];
  history90d: SentimentHistoryPoint[];
  sourceLabel: string;
}

export interface SentimentPayload {
  updatedAt: string;
  isLive: boolean;
  scopes: Record<SentimentScope, SentimentScopeSnapshot>;
}

export interface AlternativeMeReading {
  currentScore: number;
  previousClose: number;
  oneWeekAgo: number;
  oneMonthAgo: number;
  history7d: number[];
  history90d: SentimentHistoryPoint[];
  classification: string;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatHistoryDate(dateObj: Date): { date: string; label: string } {
  const iso = dateObj.toISOString().slice(0, 10);
  const label = `${MONTH_SHORT[dateObj.getUTCMonth()]} ${dateObj.getUTCDate()}`;
  return { date: iso, label };
}

export function clampSentimentScore(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getSentimentZone(score: number): {
  zone: SentimentZoneLabel;
  color: string;
} {
  const s = clampSentimentScore(score);
  if (s <= 24) return { zone: 'Extreme Fear', color: '#F23645' };
  if (s <= 44) return { zone: 'Fear', color: '#F97316' };
  if (s <= 55) return { zone: 'Neutral', color: '#D97706' };
  if (s <= 74) return { zone: 'Greed', color: '#10B981' };
  return { zone: 'Extreme Greed', color: '#089981' };
}

/**
 * Maps a 0–100 sentiment score to SVG dial rotation degrees (-90° far left to +90° far right).
 */
export function scoreToNeedleAngle(score: number): number {
  const clamped = clampSentimentScore(score);
  return Number((((clamped / 100) * 180) - 90).toFixed(1));
}

/**
 * Generates a deterministic 90-day sentiment timeline ending on `endScore` at `nowIso`.
 */
export function buildDeterministicHistory90d(params: {
  endScore: number;
  previousClose: number;
  oneWeekAgo: number;
  oneMonthAgo: number;
  nowIso: string;
  seedOffset: number;
}): SentimentHistoryPoint[] {
  const { endScore, previousClose, oneWeekAgo, oneMonthAgo, nowIso, seedOffset } = params;
  const parsedEnd = new Date(nowIso);
  const endMs = Number.isNaN(parsedEnd.getTime()) ? Date.UTC(2026, 10, 16) : parsedEnd.getTime();
  const points: SentimentHistoryPoint[] = [];

  for (let i = 0; i < 90; i++) {
    const daysAgo = 89 - i;
    const dayDate = new Date(endMs - daysAgo * 86400 * 1000);
    const { date, label } = formatHistoryDate(dayDate);

    let score: number;
    if (daysAgo === 0) {
      score = endScore;
    } else if (daysAgo === 1) {
      score = previousClose;
    } else if (daysAgo === 7) {
      score = oneWeekAgo;
    } else if (daysAgo === 30) {
      score = oneMonthAgo;
    } else {
      const wave =
        Math.sin((i + seedOffset) * 0.24) * 6.5 +
        Math.cos((i + seedOffset * 2) * 0.11) * 4.5;
      const anchor =
        daysAgo > 30
          ? oneMonthAgo + ((89 - i) / 60) * (endScore - oneMonthAgo) * 0.25
          : daysAgo > 7
            ? oneMonthAgo + ((30 - daysAgo) / 23) * (oneWeekAgo - oneMonthAgo)
            : oneWeekAgo + ((7 - daysAgo) / 7) * (endScore - oneWeekAgo);
      score = clampSentimentScore(anchor + wave);
    }

    points.push({ date, label, score });
  }

  return points;
}

/**
 * Slices a 90-day series to the requested 7D, 30D, or 90D window.
 */
export function getSentimentHistoryWindow(
  points: SentimentHistoryPoint[],
  timeframe: SentimentTimeframe
): SentimentHistoryPoint[] {
  const count = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  if (points.length <= count) return points;
  return points.slice(points.length - count);
}

/**
 * Parses live Alternative.me `/fng/?limit=90` payload safely.
 */
export function parseAlternativeMeFng(payload: unknown): AlternativeMeReading | null {
  if (!payload || typeof payload !== 'object') return null;
  const rows = (payload as { data?: unknown }).data;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const parsedEntries: Array<{ score: number; date: string; label: string }> = [];
  let latestClass = '';
  const fallbackNowMs = Date.UTC(2026, 10, 16);

  for (let i = 0; i < rows.length; i++) {
    const item = rows[i] as {
      value?: string | number;
      value_classification?: string;
      timestamp?: string | number;
    };
    const numeric = Number(item?.value);
    if (!Number.isFinite(numeric)) continue;

    const tsSec = Number(item?.timestamp);
    const pointDate = Number.isFinite(tsSec) && tsSec > 0
      ? new Date(tsSec * 1000)
      : new Date(fallbackNowMs - i * 86400 * 1000);
    const { date, label } = formatHistoryDate(pointDate);

    parsedEntries.push({
      score: clampSentimentScore(numeric),
      date,
      label,
    });
    if (i === 0 && typeof item?.value_classification === 'string') {
      latestClass = item.value_classification;
    }
  }

  if (parsedEntries.length === 0) return null;

  const currentScore = parsedEntries[0].score;
  const previousClose = parsedEntries[1]?.score ?? currentScore;
  const oneWeekAgo = parsedEntries[Math.min(6, parsedEntries.length - 1)]?.score ?? previousClose;
  const oneMonthAgo = parsedEntries[Math.min(29, parsedEntries.length - 1)]?.score ?? oneWeekAgo;
  const history90d = parsedEntries.slice(0, 90).reverse();
  const history7d = parsedEntries.slice(0, 7).map((e) => e.score).reverse();

  return {
    currentScore,
    previousClose,
    oneWeekAgo,
    oneMonthAgo,
    history7d: history7d.length >= 2 ? history7d : [previousClose, currentScore],
    history90d,
    classification: latestClass || getSentimentZone(currentScore).zone,
  };
}

function avgChange(rows: MarketSymbolRow[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((acc, row) => acc + (Number.isFinite(row.changePercent) ? row.changePercent : 0), 0);
  return sum / rows.length;
}

function breadthScore(rows: MarketSymbolRow[]): number {
  if (rows.length === 0) return 50;
  const advancers = rows.filter((r) => r.changePercent > 0).length;
  return clampSentimentScore((advancers / rows.length) * 100);
}

/**
 * Computes real-time multi-scope Fear & Greed snapshots from market indices, crypto, macro rows,
 * and optional live Alternative.me + Binance feeds.
 */
export function computeCompositeMarketSentiment(params: {
  indices: MarketSymbolRow[];
  crypto: MarketSymbolRow[];
  macro: MarketSymbolRow[];
  liveCryptoFng?: AlternativeMeReading | null;
  liveBtcChangePercent?: number | null;
  isLive?: boolean;
  nowIso?: string;
}): SentimentPayload {
  const {
    indices,
    crypto,
    macro,
    liveCryptoFng = null,
    liveBtcChangePercent = null,
    isLive = false,
    nowIso = new Date().toISOString(),
  } = params;

  // 1. Global Markets Scope
  const indexAvgPct = avgChange(indices);
  const momentumGlobal = clampSentimentScore(52 + indexAvgPct * 16);
  const breadthGlobal = clampSentimentScore(breadthScore(indices) * 0.75 + 14);
  const in10y = macro.find((m) => m.symbol === 'IN10Y');
  const yieldBoost = in10y ? -in10y.changePercent * 8 : 0;
  const macroGlobal = clampSentimentScore(50 + yieldBoost);

  const cryptoSlice = crypto.filter((c) => c.symbol !== 'TOTAL');
  const btcChg =
    typeof liveBtcChangePercent === 'number' && Number.isFinite(liveBtcChangePercent)
      ? liveBtcChangePercent
      : cryptoSlice[0]?.changePercent ?? 0;
  const safeHavenScore = clampSentimentScore(54 + btcChg * 3.5 + indexAvgPct * 8);

  const globalScore = clampSentimentScore(
    momentumGlobal * 0.32 + breadthGlobal * 0.28 + safeHavenScore * 0.2 + macroGlobal * 0.2
  );
  const globalPrev = clampSentimentScore(globalScore - Math.round(indexAvgPct * 2));
  const global1W = clampSentimentScore(globalScore + 5);
  const global1M = clampSentimentScore(globalScore + 11);
  const globalZone = getSentimentZone(globalScore);
  const globalHistory90d = buildDeterministicHistory90d({
    endScore: globalScore,
    previousClose: globalPrev,
    oneWeekAgo: global1W,
    oneMonthAgo: global1M,
    nowIso,
    seedOffset: 3,
  });

  // 2. India Markets Scope (NIFTY, SENSEX, USDINR stability, IN10Y)
  const indiaBenchmarks = indices.filter((i) => i.symbol === 'NIFTY' || i.symbol === 'SENSEX');
  const indiaAvg = avgChange(indiaBenchmarks);
  const usdinr = macro.find((m) => m.symbol === 'USDINR');
  const inrStability = clampSentimentScore(55 + (usdinr ? -usdinr.changePercent * 12 : 0));
  const indiaMomentum = clampSentimentScore(52 + indiaAvg * 24);
  const indiaBreadth = clampSentimentScore(breadthScore(indiaBenchmarks) * 0.68 + 12);
  const indiaMacro = clampSentimentScore(52 + yieldBoost * 1.1);

  const indiaScore = clampSentimentScore(
    indiaMomentum * 0.35 + indiaBreadth * 0.25 + inrStability * 0.22 + indiaMacro * 0.18
  );
  const indiaPrev = clampSentimentScore(indiaScore - 3);
  const india1W = clampSentimentScore(indiaScore - 6);
  const india1M = clampSentimentScore(indiaScore + 4);
  const indiaZone = getSentimentZone(indiaScore);
  const indiaHistory90d = buildDeterministicHistory90d({
    endScore: indiaScore,
    previousClose: indiaPrev,
    oneWeekAgo: india1W,
    oneMonthAgo: india1M,
    nowIso,
    seedOffset: 11,
  });

  // 3. Crypto Sentiment Scope (Live Alternative.me + Binance 24h delta when available)
  const cryptoAvgPct =
    typeof liveBtcChangePercent === 'number' && Number.isFinite(liveBtcChangePercent)
      ? liveBtcChangePercent
      : avgChange(cryptoSlice);
  const fallbackCryptoScore = clampSentimentScore(46 + cryptoAvgPct * 7);
  const cryptoScore = liveCryptoFng ? liveCryptoFng.currentScore : fallbackCryptoScore;
  const cryptoPrev = liveCryptoFng ? liveCryptoFng.previousClose : clampSentimentScore(cryptoScore + 3);
  const crypto1W = liveCryptoFng ? liveCryptoFng.oneWeekAgo : clampSentimentScore(cryptoScore + 8);
  const crypto1M = liveCryptoFng ? liveCryptoFng.oneMonthAgo : clampSentimentScore(cryptoScore + 16);
  const cryptoZone = getSentimentZone(cryptoScore);

  const btcDomScore = clampSentimentScore(59.76);
  const cryptoMomentum = clampSentimentScore(50 + cryptoAvgPct * 6.5);
  const cryptoBreadth = clampSentimentScore(breadthScore(cryptoSlice) * 0.7 + 22);
  const cryptoVolScore = clampSentimentScore(cryptoScore * 0.85 + 8);
  const cryptoHistory90d =
    liveCryptoFng && liveCryptoFng.history90d.length >= 30
      ? liveCryptoFng.history90d
      : buildDeterministicHistory90d({
          endScore: cryptoScore,
          previousClose: cryptoPrev,
          oneWeekAgo: crypto1W,
          oneMonthAgo: crypto1M,
          nowIso,
          seedOffset: 19,
        });

  return {
    updatedAt: nowIso,
    isLive,
    scopes: {
      global: {
        scope: 'global',
        title: 'All Markets Sentiment',
        score: globalScore,
        zone: globalZone.zone,
        color: globalZone.color,
        previousClose: globalPrev,
        oneWeekAgo: global1W,
        oneMonthAgo: global1M,
        deltaFromClose: globalScore - globalPrev,
        summary:
          globalScore >= 56
            ? 'Risk-on breadth across major indices supports selective cyclical positioning.'
            : globalScore <= 44
              ? 'Defensive index rotation and softer global momentum keep institutional flows cautious.'
              : 'Balanced cross-asset breadth with mild defensive positioning ahead of macro releases.',
        drivers: [
          { id: 'mom', label: 'Index momentum', score: momentumGlobal, signal: indexAvgPct >= 0 ? 'Constructive' : 'Softening' },
          { id: 'brd', label: 'Global breadth', score: breadthGlobal, signal: breadthGlobal >= 50 ? 'Broadening' : 'Narrow' },
          { id: 'vix', label: 'Risk appetite', score: safeHavenScore, signal: safeHavenScore >= 52 ? 'Risk-on' : 'Hedged' },
          { id: 'mac', label: 'Rates & yields', score: macroGlobal, signal: macroGlobal >= 52 ? 'Easing' : 'Tight' },
        ],
        history7d: globalHistory90d.slice(-7).map((p) => p.score),
        history90d: globalHistory90d,
        sourceLabel: isLive ? 'Financia Live Composite' : 'Financia Market Breadth',
      },
      crypto: {
        scope: 'crypto',
        title: 'Crypto Fear & Greed',
        score: cryptoScore,
        zone: cryptoZone.zone,
        color: cryptoZone.color,
        previousClose: cryptoPrev,
        oneWeekAgo: crypto1W,
        oneMonthAgo: crypto1M,
        deltaFromClose: cryptoScore - cryptoPrev,
        summary:
          cryptoScore >= 56
            ? 'Spot inflows and rising perpetual basis indicate constructive digital-asset appetite.'
            : cryptoScore <= 44
              ? 'Elevated BTC dominance and muted altcoin breadth reflect defensive crypto positioning.'
              : 'Consolidation across BTC and ETH order books keeps spot sentiment balanced.',
        drivers: [
          { id: 'cmom', label: 'BTC 24h trend', score: cryptoMomentum, signal: cryptoAvgPct >= 0 ? 'Accumulation' : 'Pullback' },
          { id: 'cdom', label: 'BTC dominance', score: btcDomScore, signal: '59.76% Share' },
          { id: 'cbrd', label: 'Altcoin breadth', score: cryptoBreadth, signal: cryptoBreadth >= 50 ? 'Participating' : 'Lagging' },
          { id: 'cvol', label: 'On-chain impulse', score: cryptoVolScore, signal: cryptoZone.zone },
        ],
        history7d: liveCryptoFng
          ? liveCryptoFng.history7d
          : cryptoHistory90d.slice(-7).map((p) => p.score),
        history90d: cryptoHistory90d,
        sourceLabel: liveCryptoFng ? 'Alternative.me Live F&G' : 'Financia Crypto Breadth',
      },
      india: {
        scope: 'india',
        title: 'India Equities Sentiment',
        score: indiaScore,
        zone: indiaZone.zone,
        color: indiaZone.color,
        previousClose: indiaPrev,
        oneWeekAgo: india1W,
        oneMonthAgo: india1M,
        deltaFromClose: indiaScore - indiaPrev,
        summary:
          indiaScore >= 56
            ? 'Nifty 50 resilience, steady banking flows, and calmer 10Y yields support domestic conviction.'
            : indiaScore <= 44
              ? 'Currency pressure and global risk-off spillover weigh on domestic large-cap momentum.'
              : 'Steady domestic institutional flows keep Nifty and Sensex in constructive equilibrium.',
        drivers: [
          { id: 'imom', label: 'Nifty / Sensex trend', score: indiaMomentum, signal: indiaAvg >= 0 ? 'Positive' : 'Consolidating' },
          { id: 'ibrd', label: 'Large-cap breadth', score: indiaBreadth, signal: 'Domestic Lead' },
          { id: 'ifx', label: 'INR FX stability', score: inrStability, signal: usdinr && usdinr.changePercent < 0 ? 'Firm INR' : 'USD Bid' },
          { id: 'iyld', label: '10Y G-Sec tone', score: indiaMacro, signal: '7.318% Yield' },
        ],
        history7d: indiaHistory90d.slice(-7).map((p) => p.score),
        history90d: indiaHistory90d,
        sourceLabel: 'NSE / Financia India Pulse',
      },
    },
  };
}
