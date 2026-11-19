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
        title: '10-Q Gross Margin Expansion Trajectory',
        description: `Gross margin improved to ${quarters[3].gross_margin}% in Q1 26 as higher-margin software and analytics recurring streams outpaced hardware overhead.`,
        category: 'Fundamental',
        impact_score: 9,
      },
      {
        title: 'Dark Pool & Block Flow Accumulation',
        description: `Institutional block prints above the 20-day VWAP ($${Number((basePrice * 0.97).toFixed(2))}) indicate systematic institutional absorption on intraday pullbacks.`,
        category: 'Options & Flow',
        impact_score: 8,
      },
      {
        title: 'Form 4 Executive Holding Stability',
        description: 'Zero unscheduled insider dispositions outside pre-arranged 10b5-1 plans over the past two quarters.',
        category: 'Insider & SEC',
        impact_score: 7,
      },
    ],
    findings: [
      {
        documentType: `Form 10-Q (Quarterly Report — ${normalized})`,
        date: '2026-05-14',
        sourceUrl: `https://www.sec.gov/edgar/searchedgar/companysearch`,
        keyInsights: [
          `Quarterly revenue recorded at $${quarters[3].revenue}B (+18.4% YoY), surpassing consensus estimates by 310 bps.`,
          `Cash, cash equivalents, and marketable securities totaled $${Number((quarters[3].revenue * 1.45).toFixed(2))}B with zero near-term debt maturities.`,
        ],
      },
      {
        documentType: `Form 8-K (Material Current Event — ${normalized})`,
        date: '2026-06-02',
        sourceUrl: `https://www.sec.gov/edgar/searchedgar/companysearch`,
        keyInsights: [
          'Board of Directors authorized an incremental $2.5B share repurchase program effective immediately.',
          'Reaffirmed full-year operating margin guidance and updated multi-region cloud infrastructure deployment milestones.',
        ],
      },
    ],
    podcast_script: [
      {
        speaker: 'Lead Quant (Kore)',
        line: `Welcome to the Financia Intelligence Briefing for ${normalized}. Looking at the live tape at ${formatCurrency(basePrice)}, our multi-agent committee scored ${normalized} at ${conviction} out of 100.`,
      },
      {
        speaker: 'SEC Strategist (Aoede)',
        line: `That conviction comes straight from the latest Form 10-Q and 8-K filings. Quarterly revenue scaled to $${quarters[3].revenue} billion while net income hit $${quarters[3].net_income} billion, paired with a fresh share repurchase authorization.`,
      },
      {
        speaker: 'Lead Quant (Kore)',
        line: `On the technical and options surface, 20-day moving average support holds firmly near ${formatCurrency(basePrice * 0.96)}, making pullbacks high-probability institutional accumulation zones.`,
      },
    ],
  };

  return {
    ticker: normalized,
    name: `${normalized} Global Holdings`,
    sector: 'Mega-Cap Tech',
    price: basePrice,
    change: changeVal,
    changePercent: changePct,
    volume: `${24 + (hash % 40)}.4M`,
    marketCap: `$${140 + (hash % 650)}B`,
    peRatio: Number((21.5 + (hash % 24)).toFixed(1)),
    rsi14: calculateRSI(series.map((p) => p.price)),
    ivRank: 32 + (hash % 48),
    convictionScore: conviction,
    shortInterest: `${(1.2 + (hash % 35) / 10).toFixed(1)}%`,
    institutionalOwnership: `${68 + (hash % 24)}.4%`,
    nextEarnings: 'Jul 28, 2026',
    report,
  };
}
