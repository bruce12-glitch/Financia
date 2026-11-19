import { PricePoint, ReportData, StockQuote } from '../types/financia';

/**
 * Calculates Simple Moving Average (SMA) for a given array of numeric prices.
 * Returns null for indices where fewer than `period` data points exist.
 */
export function calculateSMA(prices: number[], period: number): (number | null)[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }
  return prices.map((_, idx) => {
    if (idx + 1 < period) return null;
    let sum = 0;
    for (let i = idx - period + 1; i <= idx; i++) {
      sum += prices[i];
    }
    return Number((sum / period).toFixed(2));
  });
}

/**
 * Calculates Exponential Moving Average (EMA) for a given array of numeric prices.
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let emaPrev: number | null = null;

  for (let i = 0; i < prices.length; i++) {
    if (i + 1 < period) {
      result.push(null);
    } else if (i + 1 === period) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += prices[j];
      emaPrev = sum / period;
      result.push(Number(emaPrev.toFixed(2)));
    } else {
      emaPrev = prices[i] * k + (emaPrev as number) * (1 - k);
      result.push(Number(emaPrev.toFixed(2)));
    }
  }
  return result;
}

/**
 * Calculates Bollinger Bands (upper, middle, lower) for a price array.
 */
export function calculateBollingerBands(
  prices: number[],
  period = 5,
  multiplier = 2
): { upper: number | null; middle: number | null; lower: number | null }[] {
  const sma = calculateSMA(prices, period);
  return prices.map((_, idx) => {
    const mid = sma[idx];
    if (mid === null) {
      return { upper: null, middle: null, lower: null };
    }
    let varianceSum = 0;
    for (let i = idx - period + 1; i <= idx; i++) {
      const diff = prices[i] - mid;
      varianceSum += diff * diff;
    }
    const stdDev = Math.sqrt(varianceSum / period);
    return {
      upper: Number((mid + multiplier * stdDev).toFixed(2)),
      middle: mid,
      lower: Number((mid - multiplier * stdDev).toFixed(2)),
    };
  });
}

/**
 * Calculates 14-period Relative Strength Index (RSI) from a price array.
 */
export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < 2) return 50;
  let gains = 0;
  let losses = 0;
  const lookback = Math.min(prices.length - 1, period);

  for (let i = prices.length - lookback; i < prices.length; i++) {
    const delta = prices[i] - prices[i - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }

  const avgGain = gains / lookback;
  const avgLoss = losses / lookback;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(1));
}

/**
 * Calculates a rolling Relative Strength Index (RSI) series across an array of prices.
 * Returns null for indices during the warm-up period (< period).
 */
export function calculateRSISeries(prices: number[], period = 4): (number | null)[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }
  if (!prices || prices.length === 0) return [];

  return prices.map((_, idx) => {
    if (idx < period) return null;
    let gains = 0;
    let losses = 0;
    for (let i = idx - period + 1; i <= idx; i++) {
      const delta = prices[i] - prices[i - 1];
      if (delta >= 0) gains += delta;
      else losses += Math.abs(delta);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgGain === 0 && avgLoss === 0) return 50;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    return Number(Math.max(0, Math.min(100, rsi)).toFixed(1));
  });
}

/**
 * Adapts a requested RSI lookback period to a chart series length so every timeframe renders a curve.
 */
export function getEffectiveRSIPeriod(seriesLength: number, requestedPeriod: number): number {
  if (seriesLength <= 2) return 1;
  return Math.max(2, Math.min(requestedPeriod, seriesLength - 2));
}

export function summarizeRSIZone(rsi: number | null): {
  label: 'Overbought' | 'Neutral' | 'Oversold' | 'Warm-up';
  color: string;
} {
  if (rsi === null || !Number.isFinite(rsi)) {
    return { label: 'Warm-up', color: '#6B7280' };
  }
  if (rsi >= 70) {
    return { label: 'Overbought', color: '#DC2626' };
  }
  if (rsi <= 30) {
    return { label: 'Oversold', color: '#089981' };
  }
  return { label: 'Neutral', color: '#7C3AED' };
}

/**
 * Validates a Mutual Fund, Gold, Debt Fund, or ETF symbol input string.
 */
export function validateTickerInput(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      error: 'Please enter a valid Mutual Fund, ISIN, Gold, Debt Fund, or ETF symbol (e.g., GOLDBEES, PPFAS, SBIGILT, NIFTYBEES, INF200K01LJ4).',
    };
  }
  if (!/^[A-Z0-9.^-]{1,14}$/.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      error: 'Symbols must be 1–14 alphanumeric characters (e.g., GOLDBEES, PPFAS, INF200K01LJ4, AGG).',
    };
  }
  return { valid: true, normalized: trimmed };
}

/**
 * Validates the Research Desk / Support inquiry form.
 */
export function validateInquiryForm(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Full name is required (min 2 characters).';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email || !emailRegex.test(input.email.trim())) {
    errors.email = 'Please provide a valid institutional or personal email address.';
  }
  const phoneClean = (input.phone || '').replace(/[\s()-]/g, '');
  if (!phoneClean || !/^\+?[0-9]{7,15}$/.test(phoneClean)) {
    errors.phone = 'Please enter a valid contact phone number (7–15 digits).';
  }
  if (!input.message || input.message.trim().length < 8) {
    errors.message = 'Please include a brief research inquiry or message (min 8 characters).';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats a numeric price as USD ($) or INR (₹) currency string.
 */
export function formatCurrency(
  value: number,
  decimals = 2,
  currency: 'USD' | 'INR' = 'USD'
): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const symbol = currency === 'INR' ? '₹' : '$';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return `${sign}${symbol}${abs.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Slices or interpolates price series for different chart timeframes ('1D' | '1W' | '1M' | '4M' | '1Y').
 */
export function getSeriesForTimeframe(
  baseSeries: PricePoint[],
  timeframe: '1D' | '1W' | '1M' | '4M' | '1Y'
): PricePoint[] {
  if (!baseSeries || baseSeries.length === 0) return [];
  if (timeframe === '4M') return baseSeries;

  const lastPoint = baseSeries[baseSeries.length - 1];
  if (timeframe === '1D') {
    const times = ['09:30', '10:15', '11:00', '11:45', '12:30', '13:15', '14:00', '14:45', '15:30', '16:00'];
    const startPrice = lastPoint.open || lastPoint.price * 0.992;
    const diff = lastPoint.price - startPrice;
    return times.map((t, i) => {
      const progress = i / (times.length - 1);
      const wave = Math.sin(i * 1.3) * (lastPoint.price * 0.0025);
      const p = Number((startPrice + diff * progress + (i === times.length - 1 ? 0 : wave)).toFixed(2));
      return {
        date: t,
        price: p,
        open: Number((p * 0.998).toFixed(2)),
        high: Number((p * 1.003).toFixed(2)),
        low: Number((p * 0.996).toFixed(2)),
        volume: Math.round((lastPoint.volume / 10) * (0.8 + (i % 3) * 0.25)),
      };
    });
  }

  if (timeframe === '1W') {
    return baseSeries.slice(-5);
  }

  if (timeframe === '1M') {
    return baseSeries.slice(-8);
  }

  // '1Y' — prepend earlier synthetic quarters leading into the 4M series
  const firstPoint = baseSeries[0];
  const earlierMonths = ['Nov 15', 'Dec 01', 'Dec 15', 'Jan 01', 'Jan 15', 'Feb 01'];
  const prefix: PricePoint[] = earlierMonths.map((d, i) => {
    const factor = 0.86 + i * 0.022;
    const p = Number((firstPoint.price * factor).toFixed(2));
    return {
      date: d,
      price: p,
      open: Number((p * 0.994).toFixed(2)),
      high: Number((p * 1.01).toFixed(2)),
      low: Number((p * 0.99).toFixed(2)),
      volume: Math.round(firstPoint.volume * (0.85 + (i % 2) * 0.2)),
    };
  });
  return [...prefix, ...baseSeries];
}

function classifyPillarFromTicker(normalized: string): {
  sector: StockQuote['sector'];
  assetClass: NonNullable<StockQuote['assetClass']>;
  displayName: string;
  currencyUnit: 'INR' | 'USD';
  amfiCode?: string;
} {
  if (/GOLD|PAXG|XAU|SGB|SILVER|^GLD$|^IAU$/.test(normalized)) {
    return {
      sector: 'Gold & Bullion',
      assetClass: 'Gold Bullion',
      displayName: `${normalized} Physical Bullion Trust`,
      currencyUnit: normalized === 'GLD' || normalized === 'IAU' || normalized === 'PAXGUSDT' || normalized === 'XAUUSD' ? 'USD' : 'INR',
    };
  }
  if (/GILT|BOND|CORP|LIQUID|AGG|TLT|BND|DEBT|SHORT|DURATION/.test(normalized)) {
    return {
      sector: 'Debt Funds',
      assetClass: 'Debt Fund',
      displayName: `${normalized} Fixed-Income Direct Fund`,
      currencyUnit: normalized === 'AGG' || normalized === 'TLT' || normalized === 'BND' ? 'USD' : 'INR',
      amfiCode: normalized === 'SBIGILT' ? '119823' : normalized === 'HDFCCORP' ? '128053' : undefined,
    };
  }
  if (/BEES|SPY|QQQ|VTI|VOO|INDA|ETF|M100|EWG|EWJ/.test(normalized)) {
    return {
      sector: 'ETFs',
      assetClass: 'ETF',
      displayName: `${normalized} Index Benchmark ETF`,
      currencyUnit: /SPY|QQQ|VTI|VOO|INDA|EWG|EWJ/.test(normalized) ? 'USD' : 'INR',
    };
  }
  return {
    sector: 'Mutual Funds',
    assetClass: 'Mutual Fund',
    displayName: `${normalized} Direct Growth Mutual Fund`,
    currencyUnit: 'INR',
    amfiCode:
      normalized === 'PPFAS'
        ? '122639'
        : normalized === 'HDFCMID'
        ? '118989'
        : normalized === 'QUANTSC'
        ? '120828'
        : normalized === 'UTI50'
        ? '120716'
        : undefined,
  };
}

/**
 * Synthesizes a complete, deterministic 4-pillar fund/gold/debt/ETF ReportData object
 * for any custom symbol if not already in the preset list.
 */
export function synthesizeCustomTickerReport(ticker: string, existingStocks: StockQuote[]): StockQuote {
  const normalized = ticker.trim().toUpperCase();
  const found = existingStocks.find((s) => s.ticker.toUpperCase() === normalized);
  if (found) return found;

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 10000;
  }

  const meta = classifyPillarFromTicker(normalized);
  const basePrice =
    meta.assetClass === 'Debt Fund'
      ? Number((32 + (hash % 65) + (hash % 99) / 100).toFixed(2))
      : Number((68 + (hash % 280) + (hash % 99) / 100).toFixed(2));
  const changePct = Number((((hash % 46) - 12) / 10).toFixed(2));
  const changeVal = Number(((basePrice * changePct) / 100).toFixed(2));
  const conviction = 72 + (hash % 23);

  const dates = [
    'Feb 15', 'Feb 28', 'Mar 10', 'Mar 22', 'Apr 03', 'Apr 15',
    'Apr 27', 'May 08', 'May 19', 'May 30', 'Jun 10', 'Jun 20',
  ];

  const series: PricePoint[] = dates.map((date, idx) => {
    const progress = idx / (dates.length - 1);
    const startP = basePrice * (changePct >= 0 ? 0.91 : 1.06);
    const wave = Math.sin(idx * 1.1 + (hash % 5)) * (basePrice * (meta.assetClass === 'Debt Fund' ? 0.004 : 0.015));
    const price = Number((startP + (basePrice - startP) * progress + (idx === dates.length - 1 ? 0 : wave)).toFixed(2));
    return {
      date,
      price,
      open: Number((price * 0.996).toFixed(2)),
      high: Number((price * 1.008).toFixed(2)),
      low: Number((price * 0.992).toFixed(2)),
      volume: 12 + ((hash + idx * 5) % 28),
    };
  });

  const qAumBase = Number((5.4 + (hash % 24) * 0.9).toFixed(1));
  const quarters = ['Q2 25', 'Q3 25', 'Q4 25', 'Q1 26'].map((q, idx) => {
    const aumB = Number((qAumBase * (1 + idx * 0.07)).toFixed(2));
    const netInflow = Number((aumB * (0.09 + (idx % 2) * 0.03)).toFixed(2));
    return {
      quarter: q,
      revenue: aumB,
      net_income: netInflow,
      eps: Number((6.8 + (hash % 14) * 0.6 + idx * 0.25).toFixed(2)),
      gross_margin: meta.assetClass === 'Debt Fund' ? 99.5 : 99.2,
    };
  });

  const terVal =
    meta.assetClass === 'ETF'
      ? Number((0.05 + (hash % 18) / 100).toFixed(2))
      : meta.assetClass === 'Debt Fund'
      ? Number((0.28 + (hash % 25) / 100).toFixed(2))
      : Number((0.48 + (hash % 36) / 100).toFixed(2));

  const ytmOrCagr =
    meta.assetClass === 'Debt Fund'
      ? `${(7.05 + (hash % 75) / 100).toFixed(2)}% YTM`
      : `+${(13.4 + (hash % 90) / 10).toFixed(1)}% 3Y CAGR`;

  const durationOrTracking =
    meta.assetClass === 'Debt Fund'
      ? `${(2.8 + (hash % 42) / 10).toFixed(2)} Yrs Mod Dur`
      : meta.assetClass === 'ETF' || meta.assetClass === 'Gold Bullion'
      ? `0.0${2 + (hash % 5)}% Tracking Err`
      : `${(8 + (hash % 10)).toFixed(1)}% Cash Buffer`;

  const stance =
    conviction >= 82
      ? 'HIGH CONVICTION BULLISH'
      : conviction >= 74
      ? 'MODERATE ACCUMULATE'
      : 'NEUTRAL WATCH';

  const pricePrefix = meta.currencyUnit === 'INR' ? '₹' : '$';
  const report: ReportData = {
    ticker: normalized,
    companyName: meta.displayName,
    generatedAt: new Date().toISOString(),
    verdict: {
      summary: `Financia 4-pillar screening classifies ${normalized} (${meta.assetClass}) at ${conviction}/100 conviction with ${ytmOrCagr} and a disciplined ${terVal.toFixed(2)}% expense ratio. Consistent institutional AUM inflows and ${durationOrTracking} support core multi-asset allocation.`,
      conviction_score: conviction,
      stance,
      key_takeaways: [
        `Direct Plan Total Expense Ratio of ${terVal.toFixed(2)}% minimizes long-term fee drag relative to regular distributor tiers.`,
        `Latest AMFI / custodial portfolio disclosure shows $${quarters[3].revenue}B equivalent AUM with +$${quarters[3].net_income}B net quarterly creations.`,
        `${meta.assetClass === 'Debt Fund' ? '100% High-Grade Sovereign & AAA credit guardrails' : 'Physical/underlying constituent replication'} with ${durationOrTracking}.`,
      ],
    },
    bull_case: [
      {
        point: 'Sustained Institutional SIP & ETF Creation Velocity',
        evidence: `Trailing quarterly AUM expanded to $${quarters[3].revenue}B backed by sticky passive and systemic inflows.`,
      },
      {
        point: `${meta.assetClass === 'Debt Fund' ? 'Rate-Cut Duration Convexity' : 'Fee-Efficient Compounding Advantage'}`,
        evidence: `${ytmOrCagr} paired with a ${terVal.toFixed(2)}% Direct TER delivers strong risk-adjusted Sharpe efficiency.`,
      },
    ],
    bear_case: [
      {
        point: 'Macro Real-Yield Volatility Sensitivity',
        evidence: 'Sharp upside surprises in sovereign 10Y yields or CPI could trigger temporary mark-to-market consolidation.',
      },
    ],
    base_case: [
      {
        point: 'Core Multi-Asset Portfolio Compounding Sleeve',
        evidence: `Projected steady accrual/CAGR trajectory aligned with benchmark TRI and ${durationOrTracking}.`,
      },
    ],
    financial_charts: {
      stock_price_4m: series,
      financial_performance_4q: quarters,
    },
    deep_insights: [
      {
        title: `${terVal.toFixed(2)}% Direct Expense Ratio Advantage`,
        description: `Low management fee structure preserves an estimated ${Math.round(95 - terVal * 20)} bps of annual net compounding versus retail regular plans.`,
        category: 'Factsheet & AMFI',
        impact_score: 9,
      },
      {
        title: `${meta.assetClass} Liquidity & Tracking Precision`,
        description: `Observed spread stability (${durationOrTracking}) confirms clean execution near daily NAV / iNAV fair value (${pricePrefix}${basePrice.toFixed(2)}).`,
        category: meta.assetClass === 'Debt Fund' ? 'Yield & Duration' : 'Fund Flow',
        impact_score: 8,
      },
    ],
    findings: [
      {
        documentType: `AMFI / Scheme Information Document (SID — ${normalized})`,
        date: '2026-06-15',
        sourceUrl: meta.amfiCode ? `https://api.mfapi.in/mf/${meta.amfiCode}` : 'https://www.amfiindia.com/',
        keyInsights: [
          `Verified Total Expense Ratio: ${terVal.toFixed(2)}%; Benchmark metric: ${ytmOrCagr}.`,
          `Risk & Custody parameter: ${durationOrTracking} across trailing 12M disclosures.`,
        ],
      },
    ],
    podcast_script: [
      {
        speaker: 'Fund Quant (Kore)',
        line: `Welcome to the Financia 4-Pillar Briefing for ${normalized}. Trading at ${pricePrefix}${basePrice.toFixed(2)}, our model scores ${normalized} at ${conviction} out of 100.`,
      },
      {
        speaker: 'Fixed-Income Desk (Aoede)',
        line: `With a ${terVal.toFixed(2)}% expense ratio and ${ytmOrCagr}, ${normalized} fits cleanly inside a diversified Mutual Fund, Gold, Debt, and ETF core.`,
      },
    ],
  };

  return {
    ticker: normalized,
    name: meta.displayName,
    sector: meta.sector,
    assetClass: meta.assetClass,
    currencyUnit: meta.currencyUnit,
    price: basePrice,
    change: changeVal,
    changePercent: changePct,
    volume: `${14 + (hash % 32)}.2M`,
    marketCap: `$${quarters[3].revenue}B AUM`,
    aum: `$${quarters[3].revenue}B`,
    peRatio: terVal,
    expenseRatio: `${terVal.toFixed(2)}% TER`,
    ytmOrCagr,
    modifiedDuration: durationOrTracking,
    creditRating: meta.assetClass === 'Debt Fund' ? 'AAA / Sovereign' : meta.assetClass === 'Gold Bullion' ? '995 Fine Vaulted' : 'Direct Growth',
    amfiSchemeCode: meta.amfiCode,
    rsi14: calculateRSI(series.map((p) => p.price)),
    ivRank: 18 + (hash % 30),
    convictionScore: conviction,
    shortInterest: durationOrTracking,
    institutionalOwnership: `$${quarters[3].revenue}B AUM`,
    nextEarnings: meta.assetClass === 'Debt Fund' ? 'RBI MPC Policy' : 'AMFI Monthly Factsheet',
    report,
  };
}

export interface ThirtyDayPricePoint {
  dayIndex: number;
  isoDate: string;
  dateLabel: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  changePctFromStart: number;
  dailyChangePct: number;
}

export interface ThirtyDayPerformanceSummary {
  startPrice: number;
  endPrice: number;
  returnPct: number;
  periodHigh: number;
  periodLow: number;
  avgVolume: number;
}

const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatUtcShortDate(ms: number): { isoDate: string; dateLabel: string } {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const monthIdx = d.getUTCMonth();
  const day = d.getUTCDate();
  const mm = String(monthIdx + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return {
    isoDate: `${year}-${mm}-${dd}`,
    dateLabel: `${MONTH_SHORT_NAMES[monthIdx]} ${dd}`,
  };
}

/**
 * Generates a deterministic, 30-day daily historical performance series for any selected ticker,
 * smoothly interpolating the trailing month of `stock_price_4m` and anchoring day 30 on `currentPrice`.
 */
export function buildThirtyDayPerformanceSeries(
  baseSeries: PricePoint[],
  currentPrice: number,
  ticker: string,
  anchorIsoDate = '2026-06-20'
): ThirtyDayPricePoint[] {
  const days = 30;
  const safeCurrent = Math.max(0.01, Number.isFinite(currentPrice) ? currentPrice : 100);
  const normalizedTicker = ticker.trim().toUpperCase() || 'FIN';

  let seed = 0;
  for (let i = 0; i < normalizedTicker.length; i++) {
    seed = (seed * 31 + normalizedTicker.charCodeAt(i)) % 10000;
  }

  const tailWindow = baseSeries.length >= 4
    ? baseSeries.slice(-4)
    : baseSeries.length > 0
      ? baseSeries
      : [{
          date: anchorIsoDate,
          price: safeCurrent,
          open: safeCurrent * 0.99,
          high: safeCurrent * 1.01,
          low: safeCurrent * 0.985,
          volume: 28,
        }];

  const baseVolumes = tailWindow.map((p) => Math.max(1, p.volume || 20));
  const avgTailVol = baseVolumes.reduce((acc, v) => acc + v, 0) / baseVolumes.length;

  // Normalize backbone so the final point ends cleanly at `safeCurrent`
  const lastBackbonePrice = Math.max(0.01, tailWindow[tailWindow.length - 1].price);
  const scaleFactor = safeCurrent / lastBackbonePrice;

  const anchorMs = Date.parse(`${anchorIsoDate}T00:00:00Z`);
  const safeAnchorMs = Number.isNaN(anchorMs) ? Date.UTC(2026, 5, 20) : anchorMs;
  const dayMs = 86_400_000;

  const rawPrices: number[] = [];
  for (let i = 0; i < days; i++) {
    const t = i / (days - 1);
    const backboneFloat = t * (tailWindow.length - 1);
    const loIdx = Math.min(tailWindow.length - 1, Math.floor(backboneFloat));
    const hiIdx = Math.min(tailWindow.length - 1, loIdx + 1);
    const frac = backboneFloat - loIdx;
    const interpolated =
      tailWindow[loIdx].price * (1 - frac) + tailWindow[hiIdx].price * frac;

    const scaled = interpolated * scaleFactor;
    // Envelope vanishes smoothly on final day so final close matches live `currentPrice`
    const envelope = Math.sin(t * Math.PI);
    const microWave =
      (Math.sin(i * 0.72 + (seed % 7)) * 0.011 +
        Math.cos(i * 1.37 + (seed % 11)) * 0.0065) *
      envelope;

    const priceVal =
      i === days - 1
        ? safeCurrent
        : Math.max(0.01, scaled * (1 + microWave));
    rawPrices.push(Number(priceVal.toFixed(2)));
  }

  const startPrice = rawPrices[0];

  return rawPrices.map((price, idx) => {
    const prevPrice = idx === 0 ? price : rawPrices[idx - 1];
    const open =
      idx === 0
        ? Number((price * (1 - ((seed % 5) - 2) * 0.0025)).toFixed(2))
        : prevPrice;
    const spreadRatio = 0.006 + ((seed + idx * 13) % 9) * 0.0014;
    const high = Number((Math.max(open, price) * (1 + spreadRatio)).toFixed(2));
    const low = Number(Math.max(0.01, Math.min(open, price) * (1 - spreadRatio * 0.9)).toFixed(2));
    const volume = Math.max(
      1,
      Math.round(avgTailVol * (0.78 + ((seed + idx * 17) % 11) * 0.045))
    );

    const dayOffset = days - 1 - idx;
    const { isoDate, dateLabel } = formatUtcShortDate(safeAnchorMs - dayOffset * dayMs);

    const changePctFromStart =
      startPrice > 0 ? Number((((price - startPrice) / startPrice) * 100).toFixed(2)) : 0;
    const dailyChangePct =
      idx === 0 || prevPrice <= 0
        ? 0
        : Number((((price - prevPrice) / prevPrice) * 100).toFixed(2));

    return {
      dayIndex: idx + 1,
      isoDate,
      dateLabel,
      price,
      open,
      high,
      low,
      volume,
      changePctFromStart,
      dailyChangePct,
    };
  });
}

/**
 * Computes summary statistics across a 30-day performance series.
 */
export function summarizeThirtyDayPerformance(
  series: ThirtyDayPricePoint[]
): ThirtyDayPerformanceSummary {
  if (!series || series.length === 0) {
    return {
      startPrice: 0,
      endPrice: 0,
      returnPct: 0,
      periodHigh: 0,
      periodLow: 0,
      avgVolume: 0,
    };
  }

  const startPrice = series[0].price;
  const endPrice = series[series.length - 1].price;
  const returnPct =
    startPrice > 0 ? Number((((endPrice - startPrice) / startPrice) * 100).toFixed(2)) : 0;
  const periodHigh = Number(Math.max(...series.map((p) => p.high)).toFixed(2));
  const periodLow = Number(Math.min(...series.map((p) => p.low)).toFixed(2));
  const avgVolume = Number(
    (series.reduce((sum, p) => sum + p.volume, 0) / series.length).toFixed(1)
  );

  return {
    startPrice,
    endPrice,
    returnPct,
    periodHigh,
    periodLow,
    avgVolume,
  };
}

export const COMPARISON_SERIES_COLORS = [
  '#2962FF', // Primary Cobalt Blue
  '#089981', // Emerald Green
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#DB2777', // Crimson Rose
] as const;

export interface ComparisonPoint {
  date: string;
  price: number;
  pctReturn: number;
  volume: number;
}

export interface ComparisonTickerSeries {
  ticker: string;
  name: string;
  color: string;
  isPrimary: boolean;
  spotPrice: number;
  startPrice: number;
  periodReturnPct: number;
  points: ComparisonPoint[];
  rsiSeries: (number | null)[];
}

export interface MultiTickerComparisonResult {
  dates: string[];
  tickers: ComparisonTickerSeries[];
  minPct: number;
  maxPct: number;
  effectiveRsiPeriod: number;
}

/**
 * Aligns a primary ticker and zero or more secondary tickers across a selected timeframe,
 * normalizing each series to cumulative percentage return from period start for side-by-side comparison,
 * while also computing each ticker's rolling RSI series.
 */
export function buildMultiTickerComparisonSeries(
  primary: StockQuote,
  secondaryStocks: StockQuote[],
  timeframe: '1D' | '1W' | '1M' | '4M' | '1Y',
  rsiPeriod = 4
): MultiTickerComparisonResult {
  const seen = new Set<string>();
  const orderedQuotes: { quote: StockQuote; isPrimary: boolean }[] = [];

  const primarySymbol = primary.ticker.toUpperCase();
  seen.add(primarySymbol);
  orderedQuotes.push({ quote: primary, isPrimary: true });

  for (const sec of secondaryStocks) {
    const sym = sec.ticker.toUpperCase();
    if (!seen.has(sym)) {
      seen.add(sym);
      orderedQuotes.push({ quote: sec, isPrimary: false });
    }
  }

  const primaryRaw = getSeriesForTimeframe(
    primary.report.financial_charts.stock_price_4m,
    timeframe
  );
  const dates = primaryRaw.map((p) => p.date);
  const effectiveRsiPeriod = getEffectiveRSIPeriod(primaryRaw.length, rsiPeriod);

  let rawMinPct = 0;
  let rawMaxPct = 0;

  const tickers: ComparisonTickerSeries[] = orderedQuotes.map(({ quote, isPrimary }, idx) => {
    const tfSeries = getSeriesForTimeframe(
      quote.report.financial_charts.stock_price_4m,
      timeframe
    );
    const aligned = dates.map((d, ptIdx) => {
      const match = tfSeries[ptIdx] || tfSeries[tfSeries.length - 1] || {
        date: d,
        price: quote.price,
        open: quote.price,
        high: quote.price,
        low: quote.price,
        volume: 10,
      };
      return match;
    });

    const startPrice = aligned.length > 0 && aligned[0].price > 0 ? aligned[0].price : quote.price;
    const points: ComparisonPoint[] = aligned.map((pt) => {
      const pctReturn =
        startPrice > 0
          ? Number((((pt.price - startPrice) / startPrice) * 100).toFixed(2))
          : 0;
      if (pctReturn < rawMinPct) rawMinPct = pctReturn;
      if (pctReturn > rawMaxPct) rawMaxPct = pctReturn;
      return {
        date: pt.date,
        price: pt.price,
        pctReturn,
        volume: pt.volume,
      };
    });

    const periodReturnPct = points.length > 0 ? points[points.length - 1].pctReturn : 0;
    const rsiSeries = calculateRSISeries(
      points.map((p) => p.price),
      effectiveRsiPeriod
    );

    return {
      ticker: quote.ticker.toUpperCase(),
      name: quote.name,
      color: COMPARISON_SERIES_COLORS[idx % COMPARISON_SERIES_COLORS.length],
      isPrimary,
      spotPrice: quote.price,
      startPrice,
      periodReturnPct,
      points,
      rsiSeries,
    };
  });

  const span = Math.max(2, rawMaxPct - rawMinPct);
  const pad = span * 0.14;
  return {
    dates,
    tickers,
    minPct: Number((rawMinPct - pad).toFixed(2)),
    maxPct: Number((rawMaxPct + pad).toFixed(2)),
    effectiveRsiPeriod,
  };
}

