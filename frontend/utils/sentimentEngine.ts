import { MarketSymbolRow, WireNewsItem } from '../types/markets';

export type SentimentScope = 'global' | 'crypto' | 'india';
export type SentimentTimeframe = '7d' | '30d' | '90d';

export type SentimentZoneLabel =
  | 'Extreme Fear'
  | 'Fear'
  | 'Neutral'
  | 'Greed'
  | 'Extreme Greed';

export type HeadlineSentimentTag = 'bullish' | 'bearish' | 'neutral';

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

export interface NewsVolumeHeadlinePreview {
  id: string;
  timeAgo: string;
  source: string;
  headline: string;
  sentiment: HeadlineSentimentTag;
}

export interface NewsVolumeSignals {
  totalArticles: number;
  recent24hArticles: number;
  bullishArticles: number;
  bearishArticles: number;
  neutralArticles: number;
  velocityScore: number;
  toneScore: number;
  combinedNewsScore: number;
  topHeadlines: NewsVolumeHeadlinePreview[];
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
  priceTrendScore: number;
  newsSignals: NewsVolumeSignals;
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

const BULLISH_TERMS = [
  'surge',
  'surges',
  'rally',
  'rallies',
  'gain',
  'gains',
  'bull',
  'bulls',
  'bullish',
  'high',
  'higher',
  'record',
  'breakout',
  'rebound',
  'soar',
  'soars',
  'jump',
  'jumps',
  'rise',
  'rises',
  'rising',
  'growth',
  'beat',
  'beats',
  'easing',
  'boom',
  'inflow',
  'inflows',
  'support',
  'accumulation',
];

const BEARISH_TERMS = [
  'sink',
  'sinks',
  'slump',
  'slumps',
  'dump',
  'crisis',
  'fall',
  'falls',
  'drop',
  'drops',
  'low',
  'lower',
  'tumble',
  'tumbles',
  'decline',
  'declines',
  'fail',
  'fails',
  'crash',
  'plunge',
  'plunges',
  'pressure',
  'bear',
  'bearish',
  'selloff',
  'liquidation',
  'liquidations',
  'risk-off',
  'weak',
  'loss',
];

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

function isRecentWithin24h(timeAgo: string): boolean {
  const lower = timeAgo.toLowerCase();
  if (lower.includes('just now') || lower.includes('min') || lower.includes('sec')) {
    return true;
  }
  const hrMatch = lower.match(/(\d+)\s*(?:hour|hr)/);
  if (hrMatch) {
    return Number(hrMatch[1]) <= 24;
  }
  return false;
}

export function classifyHeadlineSentiment(headline: string, summary = ''): HeadlineSentimentTag {
  const text = `${headline} ${summary}`.toLowerCase();
  let bullHits = 0;
  let bearHits = 0;

  for (const term of BULLISH_TERMS) {
    if (text.includes(term)) bullHits += 1;
  }
  for (const term of BEARISH_TERMS) {
    if (text.includes(term)) bearHits += 1;
  }

  if (bullHits > bearHits) return 'bullish';
  if (bearHits > bullHits) return 'bearish';
  return 'neutral';
}

/**
 * Computes real-time news volume, 24h velocity, and headline polarity signals
 * from active market wire stories for a given sentiment scope.
 */
export function computeNewsVolumeSignals(
  newsItems: WireNewsItem[],
  scope: SentimentScope = 'global'
): NewsVolumeSignals {
  const scoped = newsItems.filter((item) => {
    if (scope === 'crypto') {
      return (
        item.category === 'gold_debt' ||
        item.tickers.some((t) => /GOLD|PAXG|XAU|GLD|SGB|SILVER|GILT|AGG|TLT/i.test(t))
      );
    }
    if (scope === 'india') {
      return (
        item.category === 'mutual_funds' ||
        item.category === 'etfs' ||
        item.tickers.some((t) => /PPFAS|NIFTY|GOLDBEES|SBIGILT|HDFCCORP|HDFCMID|UTI50|LIQUIDBEES/i.test(t))
      );
    }
    return true;
  });

  const pool = scoped.length > 0 ? scoped : newsItems;
  if (pool.length === 0) {
    return {
      totalArticles: 0,
      recent24hArticles: 0,
      bullishArticles: 0,
      bearishArticles: 0,
      neutralArticles: 0,
      velocityScore: 50,
      toneScore: 50,
      combinedNewsScore: 50,
      topHeadlines: [],
    };
  }

  let recent24hArticles = 0;
  let bullishArticles = 0;
  let bearishArticles = 0;
  let neutralArticles = 0;
  const topHeadlines: NewsVolumeHeadlinePreview[] = [];

  for (let i = 0; i < pool.length; i += 1) {
    const story = pool[i];
    if (isRecentWithin24h(story.timeAgo)) {
      recent24hArticles += 1;
    }
    const tag = classifyHeadlineSentiment(story.headline, story.summary);
    if (tag === 'bullish') bullishArticles += 1;
    else if (tag === 'bearish') bearishArticles += 1;
    else neutralArticles += 1;

    if (topHeadlines.length < 4) {
      topHeadlines.push({
        id: story.id,
        timeAgo: story.timeAgo,
        source: story.source,
        headline: story.headline,
        sentiment: tag,
      });
    }
  }

  const totalArticles = pool.length;
  const recentRatio = recent24hArticles / totalArticles;
  const volumeDensity = Math.min(1, totalArticles / (scope === 'global' ? 24 : 8));
  const velocityScore = clampSentimentScore(32 + recentRatio * 42 + volumeDensity * 26);

  const netPolarity = (bullishArticles - bearishArticles) / totalArticles;
  const toneScore = clampSentimentScore(50 + netPolarity * 44);
  const combinedNewsScore = clampSentimentScore(toneScore * 0.68 + velocityScore * 0.32);

  return {
    totalArticles,
    recent24hArticles,
    bullishArticles,
    bearishArticles,
    neutralArticles,
    velocityScore,
    toneScore,
    combinedNewsScore,
    topHeadlines,
  };
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

function avgSparklineTrendScore(rows: MarketSymbolRow[]): number {
  const valid = rows.filter((r) => Array.isArray(r.sparkline) && r.sparkline.length >= 2);
  if (valid.length === 0) return 50;
  let totalSlopePct = 0;
  for (const r of valid) {
    const first = r.sparkline[0] || 1;
    const last = r.sparkline[r.sparkline.length - 1] ?? first;
    totalSlopePct += ((last - first) / Math.max(0.0001, Math.abs(first))) * 100;
  }
  const avgSlope = totalSlopePct / valid.length;
  return clampSentimentScore(50 + avgSlope * 6);
}

function breadthScore(rows: MarketSymbolRow[]): number {
  if (rows.length === 0) return 50;
  const advancers = rows.filter((r) => r.changePercent > 0).length;
  return clampSentimentScore((advancers / rows.length) * 100);
}

/**
 * Computes real-time multi-scope Fear & Greed snapshots from current news volume,
 * headline tone, price trends, market indices, crypto, macro rows,
 * and optional live Alternative.me + Binance feeds.
 */
export function computeCompositeMarketSentiment(params: {
  indices: MarketSymbolRow[];
  crypto: MarketSymbolRow[];
  macro: MarketSymbolRow[];
  news?: WireNewsItem[];
  liveCryptoFng?: AlternativeMeReading | null;
  liveBtcChangePercent?: number | null;
  isLive?: boolean;
  nowIso?: string;
}): SentimentPayload {
  const {
    indices,
    crypto,
    macro,
    news = [],
    liveCryptoFng = null,
    liveBtcChangePercent = null,
    isLive = false,
    nowIso = new Date().toISOString(),
  } = params;

  const globalNews = computeNewsVolumeSignals(news, 'global');
  const cryptoNews = computeNewsVolumeSignals(news, 'crypto');
  const indiaNews = computeNewsVolumeSignals(news, 'india');

  // 1. Global Markets Scope (Price trends + Breadth + News Volume + Macro)
  const indexAvgPct = avgChange(indices);
  const indexSparkScore = avgSparklineTrendScore(indices);
  const momentumGlobal = clampSentimentScore((52 + indexAvgPct * 16) * 0.65 + indexSparkScore * 0.35);
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

  const newsSignalGlobal =
    globalNews.totalArticles > 0 ? globalNews.combinedNewsScore : safeHavenScore;

  const globalPriceTrendScore = clampSentimentScore(momentumGlobal * 0.58 + breadthGlobal * 0.42);
  const globalScore = clampSentimentScore(
    momentumGlobal * 0.3 +
      breadthGlobal * 0.24 +
      newsSignalGlobal * 0.26 +
      macroGlobal * 0.2
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

  // 2. India Mutual Funds & Debt Scope (Nifty/Liquid/Gilt benchmarks, USDINR stability, AMFI News Volume)
  const indiaBenchmarks = indices.filter((i) => i.symbol === 'NIFTY' || i.symbol === 'SENSEX' || i.symbol === 'NIFTYBEES');
  const indiaAvg = avgChange(indiaBenchmarks);
  const indiaSparkScore = avgSparklineTrendScore(indiaBenchmarks);
  const usdinr = macro.find((m) => m.symbol === 'USDINR');
  const inrStability = clampSentimentScore(55 + (usdinr ? -usdinr.changePercent * 12 : 0));
  const indiaMomentum = clampSentimentScore((52 + indiaAvg * 24) * 0.7 + indiaSparkScore * 0.3);
  const indiaBreadth = clampSentimentScore(breadthScore(indiaBenchmarks) * 0.68 + 12);
  const indiaMacro = clampSentimentScore(52 + yieldBoost * 1.1);
  const newsSignalIndia =
    indiaNews.totalArticles > 0 ? indiaNews.combinedNewsScore : indiaMacro;

  const indiaPriceTrendScore = clampSentimentScore(indiaMomentum * 0.62 + indiaBreadth * 0.38);
  const indiaScore = clampSentimentScore(
    indiaMomentum * 0.32 +
      indiaBreadth * 0.22 +
      newsSignalIndia * 0.24 +
      inrStability * 0.22
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

  // 3. Gold & Bullion Sentiment Scope (Live Spot Gold PAXG/XAU + Bullion & Debt Wire Volume)
  const cryptoAvgPct =
    typeof liveBtcChangePercent === 'number' && Number.isFinite(liveBtcChangePercent)
      ? liveBtcChangePercent
      : avgChange(cryptoSlice);
  const cryptoSparkScore = avgSparklineTrendScore(cryptoSlice);
  const cryptoMomentum = clampSentimentScore((50 + cryptoAvgPct * 6.5) * 0.72 + cryptoSparkScore * 0.28);
  const cryptoBreadth = clampSentimentScore(breadthScore(cryptoSlice) * 0.7 + 22);
  const newsSignalCrypto =
    cryptoNews.totalArticles > 0 ? cryptoNews.combinedNewsScore : cryptoBreadth;

  const fallbackCryptoScore = clampSentimentScore(
    (46 + cryptoAvgPct * 7) * 0.7 + newsSignalCrypto * 0.3
  );
  const cryptoScore = liveCryptoFng ? liveCryptoFng.currentScore : fallbackCryptoScore;
  const cryptoPrev = liveCryptoFng ? liveCryptoFng.previousClose : clampSentimentScore(cryptoScore + 3);
  const crypto1W = liveCryptoFng ? liveCryptoFng.oneWeekAgo : clampSentimentScore(cryptoScore + 8);
  const crypto1M = liveCryptoFng ? liveCryptoFng.oneMonthAgo : clampSentimentScore(cryptoScore + 16);
  const cryptoZone = getSentimentZone(cryptoScore);
  const cryptoPriceTrendScore = clampSentimentScore(cryptoMomentum * 0.65 + cryptoBreadth * 0.35);

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
        title: 'All 4-Pillar Assets',
        score: globalScore,
        zone: globalZone.zone,
        color: globalZone.color,
        previousClose: globalPrev,
        oneWeekAgo: global1W,
        oneMonthAgo: global1M,
        deltaFromClose: globalScore - globalPrev,
        priceTrendScore: globalPriceTrendScore,
        newsSignals: globalNews,
        summary:
          globalScore >= 56
            ? 'Steady SIP inflows, bullion demand, and sovereign bond carry support balanced ETF & fund positioning.'
            : globalScore <= 44
              ? 'Rising sovereign yields and defensive wire coverage favor liquid debt, gilt duration, and physical gold hedges.'
              : 'Balanced wire headline velocity across global index ETFs, gold bullion, and investment-grade debt.',
        drivers: [
          {
            id: 'mom',
            label: 'ETF & NAV trend',
            score: momentumGlobal,
            signal: indexAvgPct >= 0 ? 'Constructive' : 'Softening',
          },
          {
            id: 'news',
            label: 'Fund & macro news',
            score: newsSignalGlobal,
            signal:
              globalNews.totalArticles > 0
                ? `${globalNews.recent24hArticles}/${globalNews.totalArticles} 24h`
                : 'Balanced flow',
          },
          {
            id: 'brd',
            label: 'Cross-pillar breadth',
            score: breadthGlobal,
            signal: breadthGlobal >= 50 ? 'Broadening' : 'Defensive',
          },
          {
            id: 'mac',
            label: 'Sovereign yields',
            score: macroGlobal,
            signal: macroGlobal >= 52 ? 'Duration Bid' : 'Tight Carry',
          },
        ],
        history7d: globalHistory90d.slice(-7).map((p) => p.score),
        history90d: globalHistory90d,
        sourceLabel: isLive ? 'Financia 4-Pillar News & Flow Composite' : 'Financia Fund, Gold & Debt Pulse',
      },
      crypto: {
        scope: 'crypto',
        title: 'Gold & Bullion Sentiment',
        score: cryptoScore,
        zone: cryptoZone.zone,
        color: cryptoZone.color,
        previousClose: cryptoPrev,
        oneWeekAgo: crypto1W,
        oneMonthAgo: crypto1M,
        deltaFromClose: cryptoScore - cryptoPrev,
        priceTrendScore: cryptoPriceTrendScore,
        newsSignals: cryptoNews,
        summary:
          cryptoScore >= 56
            ? 'Central-bank reserve buying, Gold ETF creations, and LBMA spot strength sustain bullion conviction.'
            : cryptoScore <= 44
              ? 'Real-yield spikes and dollar strength weigh on spot gold and silver ETF short-term flows.'
              : 'Consolidation across Spot Gold (LBMA), Gold BeES, and Sovereign Gold Bonds keeps sentiment balanced.',
        drivers: [
          {
            id: 'cmom',
            label: 'Spot Gold (LBMA/PAXG)',
            score: cryptoMomentum,
            signal: cryptoAvgPct >= 0 ? 'Accumulation' : 'Pullback',
          },
          {
            id: 'cnews',
            label: 'Bullion & debt news',
            score: newsSignalCrypto,
            signal:
              cryptoNews.totalArticles > 0
                ? `${cryptoNews.recent24hArticles}/${cryptoNews.totalArticles} 24h`
                : 'Steady wire',
          },
          {
            id: 'cbrd',
            label: 'Gold & Metal ETFs',
            score: cryptoBreadth,
            signal: cryptoBreadth >= 50 ? 'Inflows' : 'Rangebound',
          },
          {
            id: 'cdom',
            label: 'Safe-haven impulse',
            score: clampSentimentScore(cryptoScore * 0.85 + 8),
            signal: cryptoZone.zone,
          },
        ],
        history7d: liveCryptoFng
          ? liveCryptoFng.history7d
          : cryptoHistory90d.slice(-7).map((p) => p.score),
        history90d: cryptoHistory90d,
        sourceLabel: liveCryptoFng ? 'Live LBMA Spot & Macro Pulse' : 'Financia Gold Bullion & Debt Wire',
      },
      india: {
        scope: 'india',
        title: 'Mutual Funds & Debt',
        score: indiaScore,
        zone: indiaZone.zone,
        color: indiaZone.color,
        previousClose: indiaPrev,
        oneWeekAgo: india1W,
        oneMonthAgo: india1M,
        deltaFromClose: indiaScore - indiaPrev,
        priceTrendScore: indiaPriceTrendScore,
        newsSignals: indiaNews,
        summary:
          indiaScore >= 56
            ? 'Record AMFI monthly SIP inflows, steady Nifty ETF accumulation, and benign 10Y G-Sec yields lift conviction.'
            : indiaScore <= 44
              ? 'G-Sec yield volatility and INR swings tilt allocation toward Liquid BeES and AAA corporate debt funds.'
              : 'Steady domestic SIP collections and RBI liquidity balance Flexi Cap, Gilt, and Index ETF flows.',
        drivers: [
          {
            id: 'imom',
            label: 'AMFI & Nifty ETF trend',
            score: indiaMomentum,
            signal: indiaAvg >= 0 ? 'Net Inflow' : 'Consolidating',
          },
          {
            id: 'inews',
            label: 'MF & debt news',
            score: newsSignalIndia,
            signal:
              indiaNews.totalArticles > 0
                ? `${indiaNews.recent24hArticles}/${indiaNews.totalArticles} 24h`
                : 'Active wire',
          },
          {
            id: 'ibrd',
            label: 'Scheme breadth',
            score: indiaBreadth,
            signal: 'SIP Lead',
          },
          {
            id: 'ifx',
            label: 'INR & G-Sec carry',
            score: inrStability,
            signal: usdinr && usdinr.changePercent < 0 ? 'Firm INR' : 'Yield Focus',
          },
        ],
        history7d: indiaHistory90d.slice(-7).map((p) => p.score),
        history90d: indiaHistory90d,
        sourceLabel: 'AMFI · MF, Gilt & Index ETF Pulse',
      },
    },
  };
}
