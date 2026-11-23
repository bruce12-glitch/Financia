import { HEATMAP_STOCKS, HeatmapStockTile } from './heatmapEngine';

export type AnalysisTimeframe = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y';
export type AnalysisChartMode = 'price' | 'normalized' | 'drawdown';

export interface AnalysisDataPoint {
  index: number;
  dateLabel: string;
  isoDate: string;
  close: number;
  high: number;
  low: number;
  dailyReturnPct: number;
  normalizedPct: number;
  drawdownPct: number;
  sma20: number | null;
  ema50: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  rollingVolPct: number | null;
  benchmarkClose?: number;
  benchmarkNormalizedPct?: number;
}

export interface PivotLevels {
  r2: number;
  r1: number;
  pivot: number;
  s1: number;
  s2: number;
  periodHigh: number;
  periodLow: number;
  rangePositionPct: number;
}

export interface TechnicalSummary {
  rsi14: number;
  rsiRegime: 'Overbought' | 'Bullish Momentum' | 'Neutral' | 'Oversold';
  macd: number;
  macdSignal: number;
  macdHist: number;
  macdCross: 'Bullish' | 'Bearish' | 'Flat';
  trendRegime: 'Golden Cross Uptrend' | 'Above EMA-50' | 'Mean Reversion' | 'Below Trend';
  bollingerPercentB: number;
  bollingerBandwidthPct: number;
  sma20DeltaPct: number;
  ema50DeltaPct: number;
  pivots: PivotLevels;
}

export interface QuantRiskMetrics {
  cumulativeReturnPct: number;
  cagrPct: number;
  annualizedVolPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdownPct: number;
  maxDrawdownDurationDays: number;
  var95DailyPct: number;
  cvar95DailyPct: number;
  skewness: number;
  winRatePct: number;
  profitFactor: number;
  bestSessionPct: number;
  worstSessionPct: number;
  beta: number | null;
  correlation: number | null;
  annualizedAlphaPct: number | null;
  informationRatio: number | null;
  upsideCapturePct: number | null;
  downsideCapturePct: number | null;
  excessReturnPct: number | null;
}

export interface ReturnHistogramBucket {
  label: string;
  minPct: number;
  maxPct: number;
  count: number;
  sharePct: number;
  isPositive: boolean;
}

export interface StressScenarioImpact {
  scenarioName: string;
  benchmarkShockPct: number;
  effectiveBeta: number;
  projectedMovePct: number;
  projectedPrice: number;
  projectedDollarImpactPerLakh: number;
  estimatedRecoveryMonths: number;
}

export interface PositionSizeCalculation {
  portfolioCapital: number;
  riskBudgetPct: number;
  maxLossAmount: number;
  stopDistancePct: number;
  recommendedAllocationAmount: number;
  recommendedWeightPct: number;
  estimatedUnits: number;
  dailyVar95Amount: number;
}

export interface FullInstrumentAnalysis {
  instrument: HeatmapStockTile;
  benchmark: HeatmapStockTile | null;
  timeframe: AnalysisTimeframe;
  series: AnalysisDataPoint[];
  technical: TechnicalSummary;
  risk: QuantRiskMetrics;
  histogram: ReturnHistogramBucket[];
}

export interface HistoricalNavInput {
  date: string;
  nav: number;
}

export const TIMEFRAME_SESSION_COUNTS: Record<AnalysisTimeframe, number> = {
  '1M': 22,
  '3M': 64,
  '6M': 126,
  '1Y': 252,
  '3Y': 260, // weekly-sampled 3Y horizon for crisp chart clarity & speed
  '5Y': 260, // weekly-sampled 5Y horizon
};

export const TIMEFRAME_YEARS: Record<AnalysisTimeframe, number> = {
  '1M': 1 / 12,
  '3M': 0.25,
  '6M': 0.5,
  '1Y': 1,
  '3Y': 3,
  '5Y': 5,
};

function parseTilePrice(raw: string): number {
  const cleaned = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(cleaned) && cleaned > 0 ? cleaned : 100;
}

function deterministicSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function getAssetClassDynamics(tile: HeatmapStockTile): {
  annualDrift: number;
  annualVol: number;
  marketSensitivity: number;
} {
  const sec = tile.sector.toLowerCase();
  if (sec.includes('liquid') || sec.includes('overnight')) {
    return { annualDrift: 0.068, annualVol: 0.012, marketSensitivity: 0.04 };
  }
  if (
    sec.includes('gilt') ||
    sec.includes('debt') ||
    sec.includes('bond') ||
    sec.includes('fixed income') ||
    sec.includes('treasury')
  ) {
    return { annualDrift: 0.074, annualVol: 0.055, marketSensitivity: 0.18 };
  }
  if (sec.includes('gold') || sec.includes('bullion') || sec.includes('commodit')) {
    return { annualDrift: 0.118, annualVol: 0.135, marketSensitivity: 0.22 };
  }
  if (sec.includes('hybrid') || sec.includes('multi-asset')) {
    return { annualDrift: 0.132, annualVol: 0.115, marketSensitivity: 0.68 };
  }
  if (sec.includes('small cap')) {
    return { annualDrift: 0.215, annualVol: 0.225, marketSensitivity: 1.18 };
  }
  if (sec.includes('mid')) {
    return { annualDrift: 0.185, annualVol: 0.188, marketSensitivity: 1.06 };
  }
  if (sec.includes('sector') || sec.includes('factor') || sec.includes('thematic')) {
    return { annualDrift: 0.148, annualVol: 0.175, marketSensitivity: 1.04 };
  }
  if (sec.includes('international') || sec.includes('em')) {
    return { annualDrift: 0.105, annualVol: 0.155, marketSensitivity: 0.84 };
  }
  return { annualDrift: 0.145, annualVol: 0.152, marketSensitivity: 0.96 };
}

function formatShortDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
}

/**
 * Generates a realistic, deterministic multi-horizon close series anchored to the instrument's
 * live price and calibrated to its asset-class drift, volatility, and shared macro factor.
 */
export function buildInstrumentSeries(
  tile: HeatmapStockTile,
  timeframe: AnalysisTimeframe,
  realNavHistory?: HistoricalNavInput[] | null
): Array<{ isoDate: string; dateLabel: string; close: number; high: number; low: number }> {
  const count = TIMEFRAME_SESSION_COUNTS[timeframe];
  const years = TIMEFRAME_YEARS[timeframe];
  const stepDays = Math.max(1, Math.round((years * 365) / count));
  const endPrice = parseTilePrice(tile.price);

  // If real SQLite/AMFI historical NAV points exist and have >= 12 points, use them directly!
  if (realNavHistory && realNavHistory.length >= 12) {
    const chronological = [...realNavHistory]
      .filter((r) => Number.isFinite(r.nav) && r.nav > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const slice = chronological.slice(-count);
    if (slice.length >= 10) {
      return slice.map((pt) => {
        const dt = new Date(pt.date);
        const validDt = Number.isNaN(dt.getTime()) ? new Date() : dt;
        const spread = pt.nav * 0.004;
        return {
          isoDate: pt.date,
          dateLabel: formatShortDate(validDt),
          close: Number(pt.nav.toFixed(2)),
          high: Number((pt.nav + spread).toFixed(2)),
          low: Number(Math.max(0.01, pt.nav - spread).toFixed(2)),
        };
      });
    }
  }

  const dyn = getAssetClassDynamics(tile);
  const seed = deterministicSeed(`${tile.symbol}:${tile.sector}`);
  const dtYears = years / count;
  const stepDrift = dyn.annualDrift * dtYears;
  const stepVol = dyn.annualVol * Math.sqrt(dtYears);

  // Build normalized backward returns calibrated to target annual volatility & market beta
  const rawPrices: number[] = new Array(count);
  let level = 100;
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      rawPrices[0] = level;
      continue;
    }
    const t = i / count;
    // Shared market factor (zero-mean triangular pseudo-Gaussian using unsigned >>> shifts)
    const mh = deterministicSeed(`MKT_FACTOR:${timeframe}:${i}`);
    const u1 = ((mh % 2001) - 1000) / 1000;
    const u2 = (((mh >>> 7) % 2001) - 1000) / 1000;
    const mktNoise = (u1 + u2) * 0.72;
    const macroWave =
      mktNoise * 0.85 +
      Math.sin(t * Math.PI * (years >= 3 ? 6.0 : 4.0) + 0.4) * 0.25;

    // Instrument-specific idiosyncratic factor (zero-mean)
    const ih = deterministicSeed(`${seed}:${timeframe}:${i}`);
    const v1 = ((ih % 2001) - 1000) / 1000;
    const v2 = (((ih >>> 7) % 2001) - 1000) / 1000;
    const idioNoise = (v1 + v2) * 0.72;

    // Realistic temporary drawdown regime pocket around 58%-68% of window
    const stressDip =
      t > 0.58 && t < 0.68
        ? -0.22 * stepVol * dyn.marketSensitivity * Math.sin(((t - 0.58) / 0.1) * Math.PI)
        : 0;

    const mktWeight = Math.min(0.88, Math.max(0.15, dyn.marketSensitivity * 0.76));
    const idioWeight = Math.sqrt(Math.max(0.16, 1 - mktWeight * mktWeight));

    const shock =
      stepVol * (macroWave * mktWeight + idioNoise * idioWeight) * 1.15 + stressDip;

    const stepRet = Math.max(-0.075, Math.min(0.075, stepDrift + shock));
    level = Math.max(1, level * (1 + stepRet));
    rawPrices[i] = level;
  }

  const scale = endPrice / rawPrices[count - 1];
  const anchorMs = Date.UTC(2026, 10, 20); // deterministic session anchor

  return rawPrices.map((raw, i) => {
    const daysAgo = (count - 1 - i) * stepDays;
    const dt = new Date(anchorMs - daysAgo * 86_400_000);
    const close = Number((raw * scale).toFixed(2));
    const intradaySpan = close * Math.max(0.002, stepVol * 0.42);
    return {
      isoDate: dt.toISOString().slice(0, 10),
      dateLabel: formatShortDate(dt),
      close,
      high: Number((close + intradaySpan).toFixed(2)),
      low: Number(Math.max(0.01, close - intradaySpan).toFixed(2)),
    };
  });
}

export function computeEMA(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < period || period <= 0) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prevEma = sum / period;
  out[period - 1] = Number(prevEma.toFixed(4));
  for (let i = period; i < values.length; i++) {
    prevEma = values[i] * k + prevEma * (1 - k);
    out[i] = Number(prevEma.toFixed(4));
  }
  return out;
}

export function computeSMA(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < period || period <= 0) return out;
  let running = 0;
  for (let i = 0; i < values.length; i++) {
    running += values[i];
    if (i >= period) running -= values[i - period];
    if (i >= period - 1) {
      out[i] = Number((running / period).toFixed(4));
    }
  }
  return out;
}

export function computeBollingerBands(
  values: number[],
  period = 20,
  numStd = 2
): {
  middle: Array<number | null>;
  upper: Array<number | null>;
  lower: Array<number | null>;
} {
  const middle = computeSMA(values, period);
  const upper: Array<number | null> = new Array(values.length).fill(null);
  const lower: Array<number | null> = new Array(values.length).fill(null);

  for (let i = period - 1; i < values.length; i++) {
    const mean = middle[i]!;
    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - mean;
      sqSum += diff * diff;
    }
    const std = Math.sqrt(sqSum / period);
    upper[i] = Number((mean + numStd * std).toFixed(2));
    lower[i] = Number(Math.max(0.01, mean - numStd * std).toFixed(2));
  }
  return { middle, upper, lower };
}

export function computeRSI(values: number[], period = 14): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) avgGain += delta;
    else avgLoss += -delta;
  }
  avgGain /= period;
  avgLoss /= period;

  const toRsi = (g: number, l: number) => {
    if (l === 0 && g === 0) return 50;
    if (l === 0) return 100;
    const rs = g / l;
    return Number((100 - 100 / (1 + rs)).toFixed(2));
  };

  out[period] = toRsi(avgGain, avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = toRsi(avgGain, avgLoss);
  }
  return out;
}

export function computeMACD(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): {
  macd: Array<number | null>;
  signal: Array<number | null>;
  histogram: Array<number | null>;
} {
  const emaFast = computeEMA(values, fastPeriod);
  const emaSlow = computeEMA(values, slowPeriod);
  const macd: Array<number | null> = values.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null
      ? Number((emaFast[i]! - emaSlow[i]!).toFixed(4))
      : null
  );

  const validMacd: number[] = [];
  const validIdx: number[] = [];
  macd.forEach((v, idx) => {
    if (v !== null) {
      validMacd.push(v);
      validIdx.push(idx);
    }
  });

  const signalCompact = computeEMA(validMacd, signalPeriod);
  const signal: Array<number | null> = new Array(values.length).fill(null);
  const histogram: Array<number | null> = new Array(values.length).fill(null);

  signalCompact.forEach((sigVal, compactIdx) => {
    const origIdx = validIdx[compactIdx];
    if (sigVal !== null && macd[origIdx] !== null) {
      signal[origIdx] = Number(sigVal.toFixed(4));
      histogram[origIdx] = Number((macd[origIdx]! - sigVal).toFixed(4));
    }
  });

  return { macd, signal, histogram };
}

export function computeReturnHistogram(returnsPct: number[]): ReturnHistogramBucket[] {
  const bins = [
    { label: '≤ -2.0%', min: -Infinity, max: -2.0 },
    { label: '-2% to -1%', min: -2.0, max: -1.0 },
    { label: '-1% to -0.3%', min: -1.0, max: -0.3 },
    { label: '-0.3% to 0%', min: -0.3, max: 0 },
    { label: '0% to +0.3%', min: 0, max: 0.3 },
    { label: '+0.3% to +1%', min: 0.3, max: 1.0 },
    { label: '+1% to +2%', min: 1.0, max: 2.0 },
    { label: '> +2.0%', min: 2.0, max: Infinity },
  ];

  const total = Math.max(1, returnsPct.length);
  return bins.map((b) => {
    const count = returnsPct.filter((r) =>
      b.min === -Infinity
        ? r <= b.max
        : b.max === Infinity
          ? r > b.min
          : r > b.min && r <= b.max
    ).length;
    return {
      label: b.label,
      minPct: b.min,
      maxPct: b.max,
      count,
      sharePct: Number(((count / total) * 100).toFixed(1)),
      isPositive: b.min >= 0,
    };
  });
}

/**
 * Runs complete multi-method quantitative & technical analysis for any instrument,
 * optionally benchmarked against a second peer/index instrument.
 */
export function runInstrumentAnalysis(
  instrument: HeatmapStockTile,
  timeframe: AnalysisTimeframe = '1Y',
  benchmark: HeatmapStockTile | null = null,
  realNavHistory?: HistoricalNavInput[] | null
): FullInstrumentAnalysis {
  const raw = buildInstrumentSeries(instrument, timeframe, realNavHistory);
  const closes = raw.map((p) => p.close);
  const benchRaw = benchmark ? buildInstrumentSeries(benchmark, timeframe) : null;

  const sma20 = computeSMA(closes, Math.min(20, Math.max(5, Math.floor(closes.length / 4))));
  const ema50 = computeEMA(closes, Math.min(50, Math.max(8, Math.floor(closes.length / 2.5))));
  const bb = computeBollingerBands(closes, Math.min(20, Math.max(5, Math.floor(closes.length / 4))), 2);
  const rsi = computeRSI(closes, Math.min(14, Math.max(5, Math.floor(closes.length / 3))));
  const macdRes = computeMACD(
    closes,
    Math.min(12, Math.max(4, Math.floor(closes.length / 5))),
    Math.min(26, Math.max(8, Math.floor(closes.length / 3))),
    Math.min(9, Math.max(3, Math.floor(closes.length / 7)))
  );

  const years = TIMEFRAME_YEARS[timeframe];
  const periodsPerYear = closes.length / years;

  const baseClose = closes[0] || 1;
  const benchBase = benchRaw && benchRaw.length > 0 ? benchRaw[0].close || 1 : 1;

  let runningPeak = closes[0];
  let maxDrawdownPct = 0;
  let currentDdRun = 0;
  let maxDdRun = 0;

  const periodReturns: number[] = [];
  const benchReturns: number[] = [];

  const series: AnalysisDataPoint[] = raw.map((pt, i) => {
    if (pt.close > runningPeak) {
      runningPeak = pt.close;
      currentDdRun = 0;
    } else {
      currentDdRun += 1;
      if (currentDdRun > maxDdRun) maxDdRun = currentDdRun;
    }

    const ddPct = runningPeak > 0 ? ((pt.close - runningPeak) / runningPeak) * 100 : 0;
    if (ddPct < maxDrawdownPct) maxDrawdownPct = ddPct;

    const prevClose = i > 0 ? closes[i - 1] : pt.close;
    const dailyRetPct = i > 0 && prevClose > 0 ? ((pt.close - prevClose) / prevClose) * 100 : 0;
    if (i > 0) periodReturns.push(dailyRetPct / 100);

    let bClose: number | undefined;
    let bNorm: number | undefined;
    if (benchRaw && benchRaw[i]) {
      bClose = benchRaw[i].close;
      bNorm = Number((((bClose - benchBase) / benchBase) * 100).toFixed(2));
      if (i > 0 && benchRaw[i - 1].close > 0) {
        benchReturns.push((bClose - benchRaw[i - 1].close) / benchRaw[i - 1].close);
      }
    }

    // Rolling 20-period annualized volatility
    let rollingVolPct: number | null = null;
    if (i >= 20) {
      const win = periodReturns.slice(i - 20, i);
      const meanW = win.reduce((s, r) => s + r, 0) / win.length;
      const varW = win.reduce((s, r) => s + (r - meanW) * (r - meanW), 0) / Math.max(1, win.length - 1);
      rollingVolPct = Number((Math.sqrt(varW) * Math.sqrt(periodsPerYear) * 100).toFixed(2));
    }

    return {
      index: i,
      dateLabel: pt.dateLabel,
      isoDate: pt.isoDate,
      close: pt.close,
      high: pt.high,
      low: pt.low,
      dailyReturnPct: Number(dailyRetPct.toFixed(2)),
      normalizedPct: Number((((pt.close - baseClose) / baseClose) * 100).toFixed(2)),
      drawdownPct: Number(ddPct.toFixed(2)),
      sma20: sma20[i] !== null ? Number(sma20[i]!.toFixed(2)) : null,
      ema50: ema50[i] !== null ? Number(ema50[i]!.toFixed(2)) : null,
      bbUpper: bb.upper[i],
      bbLower: bb.lower[i],
      rsi14: rsi[i],
      macd: macdRes.macd[i] !== null ? Number(macdRes.macd[i]!.toFixed(3)) : null,
      macdSignal: macdRes.signal[i] !== null ? Number(macdRes.signal[i]!.toFixed(3)) : null,
      macdHist: macdRes.histogram[i] !== null ? Number(macdRes.histogram[i]!.toFixed(3)) : null,
      rollingVolPct,
      benchmarkClose: bClose,
      benchmarkNormalizedPct: bNorm,
    };
  });

  // Aggregate Risk & Return Metrics
  const lastClose = closes[closes.length - 1];
  const cumRet = baseClose > 0 ? (lastClose - baseClose) / baseClose : 0;
  const cagr = years >= 0.25 ? Math.pow(Math.max(0.01, 1 + cumRet), 1 / years) - 1 : cumRet / Math.max(0.05, years);

  const meanR = periodReturns.reduce((s, r) => s + r, 0) / Math.max(1, periodReturns.length);
  const variance =
    periodReturns.reduce((s, r) => s + (r - meanR) * (r - meanR), 0) /
    Math.max(1, periodReturns.length - 1);
  const stdPeriod = Math.sqrt(variance);
  const annualizedVol = stdPeriod * Math.sqrt(periodsPerYear);

  const downsideSq = periodReturns
    .filter((r) => r < 0)
    .reduce((s, r) => s + r * r, 0);
  const downsideDev = Math.sqrt(downsideSq / Math.max(1, periodReturns.length)) * Math.sqrt(periodsPerYear);

  const riskFreeRate = instrument.unit === 'INR' ? 0.065 : 0.0425;
  const sharpeRatio = annualizedVol > 0.0001 ? (cagr - riskFreeRate) / annualizedVol : 0;
  const sortinoRatio = downsideDev > 0.0001 ? (cagr - riskFreeRate) / downsideDev : sharpeRatio;
  const absMaxDd = Math.abs(maxDrawdownPct) / 100;
  const calmarRatio = absMaxDd > 0.001 ? cagr / absMaxDd : cagr * 10;

  // Historical VaR 95% & CVaR 95%
  const sortedRets = [...periodReturns].sort((a, b) => a - b);
  const varIdx = Math.max(0, Math.floor(sortedRets.length * 0.05));
  const var95 = (sortedRets[varIdx] ?? 0) * 100;
  const tailSlice = sortedRets.slice(0, Math.max(1, varIdx + 1));
  const cvar95 = (tailSlice.reduce((s, r) => s + r, 0) / tailSlice.length) * 100;

  // Skewness
  const m3 =
    periodReturns.reduce((s, r) => s + Math.pow(r - meanR, 3), 0) /
    Math.max(1, periodReturns.length);
  const skewness = stdPeriod > 1e-6 ? m3 / Math.pow(stdPeriod, 3) : 0;

  const posRets = periodReturns.filter((r) => r > 0);
  const negRets = periodReturns.filter((r) => r < 0);
  const winRatePct = (posRets.length / Math.max(1, periodReturns.length)) * 100;
  const grossGain = posRets.reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(negRets.reduce((s, r) => s + r, 0));
  const profitFactor = grossLoss > 1e-6 ? grossGain / grossLoss : grossGain > 0 ? 5 : 1;

  // Benchmark Relative Metrics (Beta, Correlation, Alpha, Info Ratio, Up/Down Capture)
  let beta: number | null = null;
  let correlation: number | null = null;
  let annualizedAlphaPct: number | null = null;
  let informationRatio: number | null = null;
  let upsideCapturePct: number | null = null;
  let downsideCapturePct: number | null = null;
  let excessReturnPct: number | null = null;

  if (benchRaw && benchReturns.length === periodReturns.length && benchReturns.length > 5) {
    const n = periodReturns.length;
    const meanB = benchReturns.reduce((s, r) => s + r, 0) / n;
    let cov = 0;
    let varB = 0;
    let varA = 0;
    const activeDiffs: number[] = [];

    let upInst = 0;
    let upBench = 0;
    let downInst = 0;
    let downBench = 0;

    for (let i = 0; i < n; i++) {
      const da = periodReturns[i] - meanR;
      const db = benchReturns[i] - meanB;
      cov += da * db;
      varA += da * da;
      varB += db * db;
      activeDiffs.push(periodReturns[i] - benchReturns[i]);

      if (benchReturns[i] > 0) {
        upInst += periodReturns[i];
        upBench += benchReturns[i];
      } else if (benchReturns[i] < 0) {
        downInst += periodReturns[i];
        downBench += benchReturns[i];
      }
    }

    beta = varB > 1e-9 ? Number((cov / varB).toFixed(2)) : 1;
    correlation =
      varA > 1e-9 && varB > 1e-9 ? Number((cov / Math.sqrt(varA * varB)).toFixed(2)) : 0;

    const benchCum = (benchRaw[benchRaw.length - 1].close - benchBase) / benchBase;
    const benchCagr =
      years >= 0.25 ? Math.pow(Math.max(0.01, 1 + benchCum), 1 / years) - 1 : benchCum / Math.max(0.05, years);

    const expectedCapm = riskFreeRate + beta * (benchCagr - riskFreeRate);
    annualizedAlphaPct = Number(((cagr - expectedCapm) * 100).toFixed(2));
    excessReturnPct = Number(((cumRet - benchCum) * 100).toFixed(2));

    const meanActive = activeDiffs.reduce((s, d) => s + d, 0) / n;
    const teVar =
      activeDiffs.reduce((s, d) => s + (d - meanActive) * (d - meanActive), 0) / Math.max(1, n - 1);
    const trackingErr = Math.sqrt(teVar) * Math.sqrt(periodsPerYear);
    informationRatio = trackingErr > 1e-5 ? Number(((cagr - benchCagr) / trackingErr).toFixed(2)) : 0;

    upsideCapturePct = upBench > 1e-6 ? Number(((upInst / upBench) * 100).toFixed(1)) : 100;
    downsideCapturePct = downBench < -1e-6 ? Number(((downInst / downBench) * 100).toFixed(1)) : 100;
  }

  // Technical & Pivot Summary
  const latest = series[series.length - 1];
  const periodHigh = Math.max(...raw.map((p) => p.high));
  const periodLow = Math.min(...raw.map((p) => p.low));
  const pivot = (periodHigh + periodLow + lastClose) / 3;
  const r1 = 2 * pivot - periodLow;
  const s1 = 2 * pivot - periodHigh;
  const r2 = pivot + (periodHigh - periodLow);
  const s2 = Math.max(0.01, pivot - (periodHigh - periodLow));
  const rangeSpan = periodHigh - periodLow || 1;
  const rangePositionPct = Number((((lastClose - periodLow) / rangeSpan) * 100).toFixed(1));

  const latestRsi = latest.rsi14 ?? 52;
  const rsiRegime: TechnicalSummary['rsiRegime'] =
    latestRsi >= 70
      ? 'Overbought'
      : latestRsi >= 55
        ? 'Bullish Momentum'
        : latestRsi <= 30
          ? 'Oversold'
          : 'Neutral';

  const latestMacd = latest.macd ?? 0;
  const latestSig = latest.macdSignal ?? 0;
  const latestHist = latest.macdHist ?? 0;
  const macdCross: TechnicalSummary['macdCross'] =
    latestHist > 0.005 ? 'Bullish' : latestHist < -0.005 ? 'Bearish' : 'Flat';

  const latestSma20 = latest.sma20 ?? lastClose;
  const latestEma50 = latest.ema50 ?? lastClose;
  const trendRegime: TechnicalSummary['trendRegime'] =
    lastClose > latestSma20 && latestSma20 > latestEma50
      ? 'Golden Cross Uptrend'
      : lastClose > latestEma50
        ? 'Above EMA-50'
        : lastClose > latestSma20
          ? 'Mean Reversion'
          : 'Below Trend';

  const bbU = latest.bbUpper ?? lastClose * 1.04;
  const bbL = latest.bbLower ?? lastClose * 0.96;
  const bbSpan = bbU - bbL || 1;
  const bollingerPercentB = Number((((lastClose - bbL) / bbSpan) * 100).toFixed(1));
  const bollingerBandwidthPct = Number(((bbSpan / Math.max(0.01, latestSma20)) * 100).toFixed(2));

  const technical: TechnicalSummary = {
    rsi14: Number(latestRsi.toFixed(1)),
    rsiRegime,
    macd: Number(latestMacd.toFixed(3)),
    macdSignal: Number(latestSig.toFixed(3)),
    macdHist: Number(latestHist.toFixed(3)),
    macdCross,
    trendRegime,
    bollingerPercentB,
    bollingerBandwidthPct,
    sma20DeltaPct: Number((((lastClose - latestSma20) / Math.max(0.01, latestSma20)) * 100).toFixed(2)),
    ema50DeltaPct: Number((((lastClose - latestEma50) / Math.max(0.01, latestEma50)) * 100).toFixed(2)),
    pivots: {
      r2: Number(r2.toFixed(2)),
      r1: Number(r1.toFixed(2)),
      pivot: Number(pivot.toFixed(2)),
      s1: Number(s1.toFixed(2)),
      s2: Number(s2.toFixed(2)),
      periodHigh: Number(periodHigh.toFixed(2)),
      periodLow: Number(periodLow.toFixed(2)),
      rangePositionPct,
    },
  };

  const risk: QuantRiskMetrics = {
    cumulativeReturnPct: Number((cumRet * 100).toFixed(2)),
    cagrPct: Number((cagr * 100).toFixed(2)),
    annualizedVolPct: Number((annualizedVol * 100).toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    calmarRatio: Number(calmarRatio.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    maxDrawdownDurationDays: Math.round(maxDdRun * Math.max(1, (years * 365) / countOf(series))),
    var95DailyPct: Number(var95.toFixed(2)),
    cvar95DailyPct: Number(cvar95.toFixed(2)),
    skewness: Number(skewness.toFixed(2)),
    winRatePct: Number(winRatePct.toFixed(1)),
    profitFactor: Number(Math.min(9.99, profitFactor).toFixed(2)),
    bestSessionPct: Number((Math.max(...periodReturns, 0) * 100).toFixed(2)),
    worstSessionPct: Number((Math.min(...periodReturns, 0) * 100).toFixed(2)),
    beta,
    correlation,
    annualizedAlphaPct,
    informationRatio,
    upsideCapturePct,
    downsideCapturePct,
    excessReturnPct,
  };

  const histogram = computeReturnHistogram(periodReturns.map((r) => r * 100));

  return {
    instrument,
    benchmark,
    timeframe,
    series,
    technical,
    risk,
    histogram,
  };
}

function countOf<T>(arr: T[]): number {
  return Math.max(1, arr.length);
}

/**
 * Simulates how a macro market shock scales into the selected instrument via its Beta.
 */
export function computeStressScenarioImpact(
  currentPrice: number,
  beta: number,
  annualCagrPct: number,
  scenarioName: string,
  benchmarkShockPct: number
): StressScenarioImpact {
  const safeBeta = Number.isFinite(beta) ? Math.max(0.05, Math.min(2.2, beta)) : 0.9;
  const projectedMovePct = Number((benchmarkShockPct * safeBeta).toFixed(2));
  const projectedPrice = Number(Math.max(0.01, currentPrice * (1 + projectedMovePct / 100)).toFixed(2));
  const projectedDollarImpactPerLakh = Math.round(100_000 * (projectedMovePct / 100));

  let estimatedRecoveryMonths = 0;
  if (projectedMovePct < 0) {
    const recoveryGainNeeded = 1 / Math.max(0.1, 1 + projectedMovePct / 100) - 1;
    const effectiveAnnualRate = Math.max(0.04, annualCagrPct / 100);
    estimatedRecoveryMonths = Math.max(
      1,
      Math.round((Math.log(1 + recoveryGainNeeded) / Math.log(1 + effectiveAnnualRate)) * 12)
    );
  }

  return {
    scenarioName,
    benchmarkShockPct,
    effectiveBeta: Number(safeBeta.toFixed(2)),
    projectedMovePct,
    projectedPrice,
    projectedDollarImpactPerLakh,
    estimatedRecoveryMonths,
  };
}

/**
 * Computes volatility-calibrated position sizing based on user capital and risk budget.
 */
export function computeVolatilityPositionSize(
  currentPrice: number,
  annualizedVolPct: number,
  var95DailyPct: number,
  portfolioCapital: number,
  riskBudgetPct: number
): PositionSizeCalculation {
  const safeCapital = Math.max(1000, portfolioCapital);
  const safeBudget = Math.max(0.25, Math.min(25, riskBudgetPct));
  const maxLossAmount = safeCapital * (safeBudget / 100);

  // Stop distance = 1-month 95% volatility envelope (~1.65 * monthly sigma), bounded [3%, 30%]
  const monthlySigmaPct = annualizedVolPct / Math.sqrt(12);
  const stopDistancePct = Number(Math.max(3, Math.min(30, monthlySigmaPct * 1.65)).toFixed(1));

  const rawAlloc = maxLossAmount / (stopDistancePct / 100);
  const recommendedAllocationAmount = Math.round(Math.min(safeCapital, rawAlloc));
  const recommendedWeightPct = Number(((recommendedAllocationAmount / safeCapital) * 100).toFixed(1));
  const estimatedUnits = Number((recommendedAllocationAmount / Math.max(0.01, currentPrice)).toFixed(2));
  const dailyVar95Amount = Math.round(
    recommendedAllocationAmount * (Math.abs(var95DailyPct) / 100)
  );

  return {
    portfolioCapital: safeCapital,
    riskBudgetPct: safeBudget,
    maxLossAmount: Math.round(maxLossAmount),
    stopDistancePct,
    recommendedAllocationAmount,
    recommendedWeightPct,
    estimatedUnits,
    dailyVar95Amount,
  };
}

/**
 * Selects a sensible neutral benchmark for any instrument (India equity -> UTI50, Debt -> SBIGILT, Global -> VOO).
 */
export function resolveDefaultBenchmarkForInstrument(
  instrument: HeatmapStockTile
): HeatmapStockTile | null {
  const sec = instrument.sector.toLowerCase();
  let preferredSymbol = instrument.market === 'india' ? 'UTI50' : 'VOO';
  if (sec.includes('gilt') || sec.includes('debt') || sec.includes('bond') || sec.includes('liquid')) {
    preferredSymbol = instrument.market === 'india' ? 'SBIGILT' : 'BND';
  } else if (sec.includes('gold') || sec.includes('bullion') || sec.includes('commodit')) {
    preferredSymbol = 'GLD';
  }
  if (preferredSymbol === instrument.symbol) {
    preferredSymbol = instrument.market === 'india' ? 'SBINIFTY' : 'SPY';
  }
  return HEATMAP_STOCKS.find((t) => t.symbol === preferredSymbol) || HEATMAP_STOCKS[0] || null;
}

/**
 * Exports the active instrument's full quantitative analysis snapshot as clean CSV text.
 */
export function buildAnalysisCsvExport(analysis: FullInstrumentAnalysis): string {
  const headers = [
    'Date',
    `${analysis.instrument.symbol}_Price`,
    'DailyReturnPct',
    'CumulativePct',
    'DrawdownPct',
    'SMA20',
    'EMA50',
    'BB_Upper',
    'BB_Lower',
    'RSI14',
    ...(analysis.benchmark ? [`${analysis.benchmark.symbol}_CumulativePct`] : []),
  ];
  const rows = analysis.series.map((pt) => [
    pt.isoDate,
    pt.close.toFixed(2),
    pt.dailyReturnPct.toFixed(2),
    pt.normalizedPct.toFixed(2),
    pt.drawdownPct.toFixed(2),
    pt.sma20 !== null ? pt.sma20.toFixed(2) : '',
    pt.ema50 !== null ? pt.ema50.toFixed(2) : '',
    pt.bbUpper !== null ? pt.bbUpper.toFixed(2) : '',
    pt.bbLower !== null ? pt.bbLower.toFixed(2) : '',
    pt.rsi14 !== null ? pt.rsi14.toFixed(1) : '',
    ...(analysis.benchmark
      ? [pt.benchmarkNormalizedPct !== undefined ? pt.benchmarkNormalizedPct.toFixed(2) : '']
      : []),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
