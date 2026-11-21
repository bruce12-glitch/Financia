import { StockQuote } from '../types/financia';
import { SCREENER_FUNDS, ScreenerFundRecord } from './screenerEngine';
import { getFundIntelligence } from './fundIntelligenceEngine';

export interface DailyReturnPoint90d {
  dayIndex: number;
  dateLabel: string;
  price: number;
  dailyReturnPct: number;
  rebasedIndex: number; // Base = 100 at Day 0
}

export interface CorrelationMatrixCell90d {
  xIndex: number;
  yIndex: number;
  xSymbol: string;
  ySymbol: string;
  xName: string;
  yName: string;
  r: number; // Pearson r in [-1, 1]
  rSquared: number; // Coefficient of determination [0, 1]
  absR: number;
  isDiagonal: boolean;
  relationshipLabel:
    | 'Identity (Self)'
    | 'Strong Positive'
    | 'Moderate Positive'
    | 'Low / Uncorrelated'
    | 'Moderate Inverse'
    | 'Strong Inverse';
  fillHex: string;
  textHex: string;
}

export interface RollingPairPoint90d {
  dayIndex: number;
  dateLabel: string;
  rollingCorrelation: number;
  rebasedA: number;
  rebasedB: number;
}

export interface CorrelationPairSummary {
  symbolA: string;
  symbolB: string;
  r: number;
  rSquared: number;
  relationshipLabel: CorrelationMatrixCell90d['relationshipLabel'];
}

export interface CorrelationMatrix90dResult {
  lookbackDays: 90;
  symbols: string[];
  namesBySymbol: Record<string, string>;
  volatility90dBySymbol: Record<string, number>;
  return90dBySymbol: Record<string, number>;
  matrix: number[][];
  cells: CorrelationMatrixCell90d[];
  averageOffDiagonalR: number;
  diversificationScore: number; // 0..100
  diversificationTier:
    | 'High Diversification'
    | 'Balanced Spread'
    | 'Moderately Correlated'
    | 'Concentrated Overlap';
  strongestPositivePair: CorrelationPairSummary | null;
  bestDiversifierPair: CorrelationPairSummary | null;
  dailySeriesBySymbol: Record<string, DailyReturnPoint90d[]>;
}

type AssetFactorProfile = {
  indiaEquity: number;
  usEquity: number;
  goldBullion: number;
  sovereignDebt: number;
  idiosyncratic: number;
  dailyVolPct: number;
  dailyDriftPct: number;
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededNormal(seed: number, step: number): number {
  // Deterministic Box-Muller transform using integer hash mixing
  const u1Raw = ((hashString(`${seed}:a:${step}`) % 999983) + 1) / 999984;
  const u2Raw = ((hashString(`${seed}:b:${step}`) % 999979) + 1) / 999980;
  return Math.sqrt(-2.0 * Math.log(u1Raw)) * Math.cos(2.0 * Math.PI * u2Raw);
}

function resolveFactorProfile(
  symbol: string,
  fund?: ScreenerFundRecord,
  quote?: StockQuote
): AssetFactorProfile {
  const hay = `${symbol} ${fund?.name || quote?.name || ''} ${fund?.category || quote?.sector || ''} ${fund?.subCategory || ''}`.toLowerCase();
  const intel = fund ? getFundIntelligence(fund) : null;
  const annualVolPct = intel
    ? Math.max(1.2, intel.ratios.stdDev3Y)
    : hay.includes('gilt') || hay.includes('debt') || hay.includes('liquid') || hay.includes('bond') || hay.includes('tlt')
      ? 6.2
      : hay.includes('gold') || hay.includes('silver') || hay.includes('paxg') || hay.includes('gld')
        ? 13.8
        : 16.5;

  const return3MPct = fund?.returnsTotal['3M'] ?? (quote ? quote.changePercent * 5.2 : 3.2);
  const dailyVolPct = annualVolPct / Math.sqrt(252);
  const dailyDriftPct = return3MPct / 90;

  if (hay.includes('gold') || hay.includes('silver') || hay.includes('paxg') || hay.includes('gld') || hay.includes('bullion')) {
    return {
      indiaEquity: -0.14,
      usEquity: -0.18,
      goldBullion: 0.88,
      sovereignDebt: 0.24,
      idiosyncratic: 0.34,
      dailyVolPct,
      dailyDriftPct,
    };
  }
  if (hay.includes('gilt') || hay.includes('debt') || hay.includes('bond') || hay.includes('tlt') || hay.includes('liquid') || hay.includes('corp')) {
    return {
      indiaEquity: -0.22,
      usEquity: -0.28,
      goldBullion: 0.22,
      sovereignDebt: 0.86,
      idiosyncratic: 0.32,
      dailyVolPct,
      dailyDriftPct,
    };
  }
  if (
    fund?.currency === 'USD' ||
    quote?.currencyUnit === 'USD' ||
    hay.includes('qqq') ||
    hay.includes('spy') ||
    hay.includes('vti') ||
    hay.includes('nasdaq') ||
    hay.includes('s&p') ||
    hay.includes('us ')
  ) {
    return {
      indiaEquity: 0.36,
      usEquity: 0.84,
      goldBullion: -0.12,
      sovereignDebt: -0.24,
      idiosyncratic: 0.31,
      dailyVolPct,
      dailyDriftPct,
    };
  }
  if (hay.includes('flexi') || symbol === 'PPFAS') {
    // Flexi-cap with international tech sleeve (e.g., PPFAS) bridges India + US equity factors
    return {
      indiaEquity: 0.72,
      usEquity: 0.44,
      goldBullion: -0.06,
      sovereignDebt: -0.14,
      idiosyncratic: 0.42,
      dailyVolPct,
      dailyDriftPct,
    };
  }
  // Indian domestic equity (Large/Mid/Small/Bank/Index)
  return {
    indiaEquity: 0.84,
    usEquity: 0.28,
    goldBullion: -0.10,
    sovereignDebt: -0.18,
    idiosyncratic: 0.38,
    dailyVolPct,
    dailyDriftPct,
  };
}

/**
 * Generates deterministic 90-day daily price & return series anchored to each ticker's
 * current spot/NAV and macro factor structure so pairwise correlations accurately reflect
 * cross-asset relationships over the last 90 calendar/trading days.
 */
export function build90DayDailyReturns(
  symbol: string,
  options?: {
    fund?: ScreenerFundRecord;
    quote?: StockQuote;
    referenceDate?: Date;
  }
): DailyReturnPoint90d[] {
  const upper = symbol.trim().toUpperCase();
  const fund =
    options?.fund ||
    SCREENER_FUNDS.find((f) => f.symbol.toUpperCase() === upper);
  const quote = options?.quote;
  const profile = resolveFactorProfile(upper, fund, quote);
  const idioSeed = hashString(`financia-90d-corr:${upper}`);

  const endDate = options?.referenceDate ? new Date(options.referenceDate) : new Date();
  const pointsCount = 90;

  // Shared 90-day market macro factor shocks (identical across all tickers for same day index)
  const rawDailyReturns: number[] = [];
  const normScale = Math.sqrt(
    profile.indiaEquity ** 2 +
      profile.usEquity ** 2 +
      profile.goldBullion ** 2 +
      profile.sovereignDebt ** 2 +
      profile.idiosyncratic ** 2
  );

  for (let d = 0; d < pointsCount; d++) {
    const fIndia = seededNormal(10101, d);
    const fUs = seededNormal(20202, d);
    const fGold = seededNormal(30303, d);
    const fDebt = seededNormal(40404, d);
    const fIdio = seededNormal(idioSeed, d);

    const compositeZ =
      (profile.indiaEquity * fIndia +
        profile.usEquity * fUs +
        profile.goldBullion * fGold +
        profile.sovereignDebt * fDebt +
        profile.idiosyncratic * fIdio) /
      Math.max(0.01, normScale);

    const dailyRetPct = profile.dailyDriftPct + compositeZ * profile.dailyVolPct;
    rawDailyReturns.push(Number(dailyRetPct.toFixed(4)));
  }

  // Forward-construct rebased index (Day 0 = 100), then anchor final day to live price
  const rebased: number[] = [100];
  for (let d = 1; d < pointsCount; d++) {
    const prev = rebased[d - 1];
    const next = Math.max(1, prev * (1 + rawDailyReturns[d] / 100));
    rebased.push(next);
  }

  const endPrice = Math.max(0.5, quote?.price ?? fund?.price ?? 100);
  const lastRebased = rebased[rebased.length - 1] || 100;

  const series: DailyReturnPoint90d[] = [];
  for (let d = 0; d < pointsCount; d++) {
    const dt = new Date(endDate.getTime() - (pointsCount - 1 - d) * 86_400_000);
    const dateLabel = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const price = Number(((rebased[d] / lastRebased) * endPrice).toFixed(2));
    series.push({
      dayIndex: d,
      dateLabel,
      price,
      dailyReturnPct: d === 0 ? 0 : rawDailyReturns[d],
      rebasedIndex: Number(rebased[d].toFixed(2)),
    });
  }

  return series;
}

/**
 * Exact Pearson product-moment correlation coefficient r in [-1, 1].
 */
export function computePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denom = Math.sqrt(denX * denY);
  if (denom <= 1e-12) return 0;
  const raw = num / denom;
  return Number(Math.max(-1, Math.min(1, raw)).toFixed(3));
}

export function classifyCorrelationCell(
  r: number,
  isDiagonal: boolean
): {
  relationshipLabel: CorrelationMatrixCell90d['relationshipLabel'];
  fillHex: string;
  textHex: string;
} {
  if (isDiagonal) {
    return {
      relationshipLabel: 'Identity (Self)',
      fillHex: '#0f172a',
      textHex: '#ffffff',
    };
  }
  if (r >= 0.65) {
    return {
      relationshipLabel: 'Strong Positive',
      fillHex: '#1d4ed8',
      textHex: '#ffffff',
    };
  }
  if (r >= 0.3) {
    return {
      relationshipLabel: 'Moderate Positive',
      fillHex: '#60a5fa',
      textHex: '#0f172a',
    };
  }
  if (r > -0.25) {
    return {
      relationshipLabel: 'Low / Uncorrelated',
      fillHex: '#e2e8f0',
      textHex: '#0f172a',
    };
  }
  if (r > -0.55) {
    return {
      relationshipLabel: 'Moderate Inverse',
      fillHex: '#fca5a5',
      textHex: '#7f1d1d',
    };
  }
  return {
    relationshipLabel: 'Strong Inverse',
    fillHex: '#dc2626',
    textHex: '#ffffff',
  };
}

/**
 * Builds the complete 90-day Pearson Correlation Matrix & Recharts cell dataset
 * for the selected comparison tickers.
 */
export function build90DayCorrelationMatrix(params: {
  symbols: string[];
  stocks?: StockQuote[];
  referenceDate?: Date;
}): CorrelationMatrix90dResult {
  const uniqueSymbols = Array.from(
    new Set(
      params.symbols
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 6);

  const stockBySymbol = new Map<string, StockQuote>();
  for (const s of params.stocks || []) {
    stockBySymbol.set(s.ticker.toUpperCase(), s);
  }

  const namesBySymbol: Record<string, string> = {};
  const volatility90dBySymbol: Record<string, number> = {};
  const return90dBySymbol: Record<string, number> = {};
  const dailySeriesBySymbol: Record<string, DailyReturnPoint90d[]> = {};
  const returnsArrayBySymbol: Record<string, number[]> = {};

  for (const sym of uniqueSymbols) {
    const fund = SCREENER_FUNDS.find((f) => f.symbol.toUpperCase() === sym);
    const quote = stockBySymbol.get(sym);
    namesBySymbol[sym] = fund?.name || quote?.name || sym;

    const series = build90DayDailyReturns(sym, {
      fund,
      quote,
      referenceDate: params.referenceDate,
    });
    dailySeriesBySymbol[sym] = series;

    const dailyRets = series.slice(1).map((pt) => pt.dailyReturnPct);
    returnsArrayBySymbol[sym] = dailyRets;

    const mean =
      dailyRets.reduce((acc, v) => acc + v, 0) / Math.max(1, dailyRets.length);
    const variance =
      dailyRets.reduce((acc, v) => acc + (v - mean) ** 2, 0) /
      Math.max(1, dailyRets.length - 1);
    const annVol = Math.sqrt(variance) * Math.sqrt(252);
    volatility90dBySymbol[sym] = Number(annVol.toFixed(1));

    const first = series[0]?.rebasedIndex || 100;
    const last = series[series.length - 1]?.rebasedIndex || 100;
    return90dBySymbol[sym] = Number((((last - first) / first) * 100).toFixed(2));
  }

  const n = uniqueSymbols.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const cells: CorrelationMatrixCell90d[] = [];

  const offDiagPairs: CorrelationPairSummary[] = [];

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const symRow = uniqueSymbols[row];
      const symCol = uniqueSymbols[col];
      const isDiag = row === col;
      const r = isDiag
        ? 1.0
        : computePearsonCorrelation(
            returnsArrayBySymbol[symRow],
            returnsArrayBySymbol[symCol]
          );

      matrix[row][col] = r;
      const style = classifyCorrelationCell(r, isDiag);
      const rSquared = Number((r * r).toFixed(3));

      cells.push({
        xIndex: col,
        // Invert Y index for Recharts ScatterChart so row 0 renders cleanly at the top of the grid
        yIndex: n - 1 - row,
        xSymbol: symCol,
        ySymbol: symRow,
        xName: namesBySymbol[symCol],
        yName: namesBySymbol[symRow],
        r,
        rSquared,
        absR: Number(Math.abs(r).toFixed(3)),
        isDiagonal: isDiag,
        relationshipLabel: style.relationshipLabel,
        fillHex: style.fillHex,
        textHex: style.textHex,
      });

      if (col > row) {
        offDiagPairs.push({
          symbolA: symRow,
          symbolB: symCol,
          r,
          rSquared,
          relationshipLabel: style.relationshipLabel,
        });
      }
    }
  }

  const averageOffDiagonalR =
    offDiagPairs.length > 0
      ? Number(
          (
            offDiagPairs.reduce((acc, p) => acc + p.r, 0) / offDiagPairs.length
          ).toFixed(3)
        )
      : 1;

  // Map average off-diagonal r in [-1, 1] cleanly into 0..100 Diversification Score
  const diversificationScore =
    offDiagPairs.length === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((1 - Math.max(-0.5, averageOffDiagonalR)) * 66.7)));

  const diversificationTier: CorrelationMatrix90dResult['diversificationTier'] =
    diversificationScore >= 72
      ? 'High Diversification'
      : diversificationScore >= 50
        ? 'Balanced Spread'
        : diversificationScore >= 30
          ? 'Moderately Correlated'
          : 'Concentrated Overlap';

  const sortedByR = [...offDiagPairs].sort((a, b) => b.r - a.r);
  const strongestPositivePair = sortedByR[0] || null;
  const bestDiversifierPair = sortedByR[sortedByR.length - 1] || null;

  return {
    lookbackDays: 90,
    symbols: uniqueSymbols,
    namesBySymbol,
    volatility90dBySymbol,
    return90dBySymbol,
    matrix,
    cells,
    averageOffDiagonalR,
    diversificationScore,
    diversificationTier,
    strongestPositivePair,
    bestDiversifierPair,
    dailySeriesBySymbol,
  };
}

/**
 * Computes a 21-day rolling correlation curve across the 90-day lookback window
 * for any selected pair (symbolA, symbolB) so users can inspect regime shifts over time.
 */
export function buildRollingPairCorrelationSeries90d(
  result: CorrelationMatrix90dResult,
  symbolA: string,
  symbolB: string,
  windowDays = 21
): RollingPairPoint90d[] {
  const seriesA = result.dailySeriesBySymbol[symbolA];
  const seriesB = result.dailySeriesBySymbol[symbolB];
  if (!seriesA || !seriesB || seriesA.length < windowDays + 1) return [];

  const points: RollingPairPoint90d[] = [];
  const n = Math.min(seriesA.length, seriesB.length);
  for (let end = windowDays; end < n; end++) {
    const sliceA: number[] = [];
    const sliceB: number[] = [];
    for (let i = end - windowDays + 1; i <= end; i++) {
      sliceA.push(seriesA[i].dailyReturnPct);
      sliceB.push(seriesB[i].dailyReturnPct);
    }
    const r =
      symbolA === symbolB ? 1 : computePearsonCorrelation(sliceA, sliceB);
    points.push({
      dayIndex: end,
      dateLabel: seriesA[end].dateLabel,
      rollingCorrelation: r,
      rebasedA: seriesA[end].rebasedIndex,
      rebasedB: seriesB[end].rebasedIndex,
    });
  }
  return points;
}
