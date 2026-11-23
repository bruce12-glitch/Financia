import { PricePoint, StockQuote } from '../types/financia.ts';

function buildDeterministicSeries(
  basePrice: number,
  seed: number,
  trendPct: number,
  volPct: number,
  points = 90
): PricePoint[] {
  const out: PricePoint[] = [];
  let cursor = basePrice / (1 + trendPct / 100);
  const startMs = Date.now() - points * 86_400_000;

  for (let i = 0; i < points; i++) {
    const wave =
      Math.sin((i + seed) * 0.27) * volPct * 0.45 +
      Math.cos((i + seed * 1.7) * 0.13) * volPct * 0.35;
    const stepReturn = trendPct / points + wave;
    const open = Number(cursor.toFixed(2));
    const close = Number(Math.max(1, open * (1 + stepReturn / 100)).toFixed(2));
    const high = Number((Math.max(open, close) * (1 + Math.abs(volPct) * 0.004)).toFixed(2));
    const low = Number((Math.min(open, close) * (1 - Math.abs(volPct) * 0.004)).toFixed(2));
    const dt = new Date(startMs + i * 86_400_000).toISOString().slice(0, 10);
    out.push({
      date: dt,
      open,
      high,
      low,
      price: close,
      volume: Math.round(1_200_000 + Math.abs(Math.sin(i + seed)) * 900_000),
    });
    cursor = close;
  }

  if (out.length > 0) {
    out[out.length - 1].price = Number(basePrice.toFixed(2));
  }
  return out;
}

function makeQuote(config: {
  ticker: string;
  name: string;
  sector: 'Mutual Funds' | 'Gold & Bullion' | 'Debt Funds' | 'ETFs';
  assetClass: 'Mutual Fund' | 'Gold Bullion' | 'Debt Fund' | 'ETF';
  price: number;
  currencyUnit: 'INR' | 'USD';
  changePercent: number;
  aum: string;
  expenseRatio: string;
  ytmOrCagr: string;
  amfiSchemeCode?: string;
  rsi14: number;
  convictionScore: number;
  seed: number;
  trendPct: number;
  volPct: number;
}): StockQuote {
  const change = Number(((config.price * config.changePercent) / 100).toFixed(2));
  const series = buildDeterministicSeries(
    config.price,
    config.seed,
    config.trendPct,
    config.volPct
  );
  return {
    ticker: config.ticker,
    name: config.name,
    sector: config.sector,
    assetClass: config.assetClass,
    price: config.price,
    currencyUnit: config.currencyUnit,
    change,
    changePercent: config.changePercent,
    volume: '2.4M',
    marketCap: config.aum,
    aum: config.aum,
    peRatio: 22.4,
    expenseRatio: config.expenseRatio,
    ytmOrCagr: config.ytmOrCagr,
    amfiSchemeCode: config.amfiSchemeCode,
    rsi14: config.rsi14,
    ivRank: 34,
    convictionScore: config.convictionScore,
    shortInterest: '0.8%',
    institutionalOwnership: '68.4%',
    nextEarnings: 'Monthly Factsheet',
    dataSource: 'Financia Market Gateway',
    report: {
      ticker: config.ticker,
      companyName: config.name,
      generatedAt: new Date().toISOString(),
      verdict: {
        summary: `${config.name} demonstrates disciplined risk-adjusted compounding with competitive total expense structure (${config.expenseRatio}).`,
        conviction_score: config.convictionScore,
        stance:
          config.convictionScore >= 78
            ? 'HIGH CONVICTION BULLISH'
            : config.convictionScore >= 65
              ? 'MODERATE ACCUMULATE'
              : 'NEUTRAL WATCH',
        key_takeaways: [
          `Trailing 3Y annualized metric: ${config.ytmOrCagr} with ${config.expenseRatio} TER.`,
          `Liquidity and institutional depth backed by ${config.aum} AUM.`,
          `14-day RSI at ${config.rsi14.toFixed(1)} indicating balanced accumulation posture.`,
        ],
      },
      bull_case: [
        {
          point: 'Structural Cost Advantage',
          evidence: `Direct expense structure (${config.expenseRatio}) compounds net alpha over multi-year horizons.`,
        },
        {
          point: 'Downside Resilience',
          evidence: 'Consistent capture spread relative to peer category median across drawdowns.',
        },
      ],
      bear_case: [
        {
          point: 'Macro Rate & Liquidity Sensitivity',
          evidence: 'Broad market drawdowns or rapid central bank rate surprises may compress near-term multiples.',
        },
      ],
      base_case: [
        {
          point: 'Core Allocation Compounder',
          evidence: 'Suitable as a disciplined SIP / core sleeve with semi-annual drift rebalancing.',
        },
      ],
      financial_charts: {
        stock_price_4m: series,
        financial_performance_4q: [
          { quarter: 'Q1', revenue: 112, net_income: 28 },
          { quarter: 'Q2', revenue: 119, net_income: 31 },
          { quarter: 'Q3', revenue: 124, net_income: 34 },
          { quarter: 'Q4', revenue: 132, net_income: 38 },
        ],
      },
      deep_insights: [
        {
          title: 'Expense Drag Efficiency',
          description: `Fee structure of ${config.expenseRatio} ranks in top quartile of ${config.sector}.`,
          category: 'Factsheet & AMFI',
          impact_score: 84,
        },
      ],
      findings: [
        {
          documentType: 'Monthly Factsheet',
          date: new Date().toISOString().slice(0, 10),
          sourceUrl: 'https://www.amfiindia.com',
          keyInsights: ['Verified NAV and scheme category metadata.'],
        },
      ],
      podcast_script: [
        {
          speaker: 'Fund Quant (Kore)',
          line: `${config.name} tracks cleanly with ${config.expenseRatio} TER and ${config.ytmOrCagr} historical return profile.`,
        },
      ],
    },
  };
}

export const INITIAL_STOCKS: StockQuote[] = [
  makeQuote({
    ticker: 'QQQ',
    name: 'Invesco QQQ Trust Series ETF',
    sector: 'ETFs',
    assetClass: 'ETF',
    price: 514.2,
    currencyUnit: 'USD',
    changePercent: 0.42,
    aum: '$312.4B',
    expenseRatio: '0.20%',
    ytmOrCagr: '18.4% 5Y CAGR',
    rsi14: 58.2,
    convictionScore: 84,
    seed: 11,
    trendPct: 14.2,
    volPct: 1.4,
  }),
  makeQuote({
    ticker: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    sector: 'ETFs',
    assetClass: 'ETF',
    price: 598.4,
    currencyUnit: 'USD',
    changePercent: 0.38,
    aum: '$618.2B',
    expenseRatio: '0.09%',
    ytmOrCagr: '15.1% 5Y CAGR',
    rsi14: 56.5,
    convictionScore: 86,
    seed: 17,
    trendPct: 11.8,
    volPct: 1.1,
  }),
  makeQuote({
    ticker: 'PPFAS',
    name: 'Parag Parikh Flexi Cap Fund Direct Growth',
    sector: 'Mutual Funds',
    assetClass: 'Mutual Fund',
    price: 89.38,
    currencyUnit: 'INR',
    changePercent: 0.83,
    aum: '₹84,620 Cr',
    expenseRatio: '0.62%',
    ytmOrCagr: '22.4% 5Y CAGR',
    amfiSchemeCode: '122639',
    rsi14: 61.0,
    convictionScore: 88,
    seed: 23,
    trendPct: 16.5,
    volPct: 0.9,
  }),
  makeQuote({
    ticker: 'HDFCMID',
    name: 'HDFC Mid-Cap Opportunities Fund Direct Growth',
    sector: 'Mutual Funds',
    assetClass: 'Mutual Fund',
    price: 198.29,
    currencyUnit: 'INR',
    changePercent: 1.09,
    aum: '₹72,940 Cr',
    expenseRatio: '0.76%',
    ytmOrCagr: '26.8% 5Y CAGR',
    amfiSchemeCode: '118989',
    rsi14: 63.4,
    convictionScore: 85,
    seed: 29,
    trendPct: 19.2,
    volPct: 1.25,
  }),
  makeQuote({
    ticker: 'NIFTYBEES',
    name: 'Nippon India ETF Nifty 50 BeES',
    sector: 'ETFs',
    assetClass: 'ETF',
    price: 284.6,
    currencyUnit: 'INR',
    changePercent: 1.01,
    aum: '₹35,840 Cr',
    expenseRatio: '0.04%',
    ytmOrCagr: '15.6% 5Y CAGR',
    rsi14: 57.1,
    convictionScore: 83,
    seed: 31,
    trendPct: 12.1,
    volPct: 1.0,
  }),
  makeQuote({
    ticker: 'GOLDBEES',
    name: 'Gold Bullion Index ETF (India)',
    sector: 'Gold & Bullion',
    assetClass: 'Gold Bullion',
    price: 74.85,
    currencyUnit: 'INR',
    changePercent: 1.24,
    aum: '₹15,420 Cr',
    expenseRatio: '0.79%',
    ytmOrCagr: '13.8% 5Y CAGR',
    rsi14: 64.2,
    convictionScore: 80,
    seed: 37,
    trendPct: 15.0,
    volPct: 0.85,
  }),
  makeQuote({
    ticker: 'GLD',
    name: 'SPDR Gold Shares Physical ETF',
    sector: 'Gold & Bullion',
    assetClass: 'Gold Bullion',
    price: 306.4,
    currencyUnit: 'USD',
    changePercent: 1.12,
    aum: '$82.1B',
    expenseRatio: '0.40%',
    ytmOrCagr: '13.4% 5Y CAGR',
    rsi14: 62.8,
    convictionScore: 81,
    seed: 41,
    trendPct: 14.5,
    volPct: 0.9,
  }),
  makeQuote({
    ticker: 'AGG',
    name: 'iShares Core U.S. Aggregate Bond ETF',
    sector: 'Debt Funds',
    assetClass: 'Debt Fund',
    price: 98.75,
    currencyUnit: 'USD',
    changePercent: 0.28,
    aum: '$118.4B',
    expenseRatio: '0.03%',
    ytmOrCagr: '4.85% YTM',
    rsi14: 52.3,
    convictionScore: 76,
    seed: 47,
    trendPct: 4.1,
    volPct: 0.45,
  }),
  makeQuote({
    ticker: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    sector: 'Debt Funds',
    assetClass: 'Debt Fund',
    price: 91.4,
    currencyUnit: 'USD',
    changePercent: 0.64,
    aum: '$54.6B',
    expenseRatio: '0.15%',
    ytmOrCagr: '4.68% YTM',
    rsi14: 49.8,
    convictionScore: 72,
    seed: 53,
    trendPct: 3.2,
    volPct: 1.05,
  }),
  makeQuote({
    ticker: 'UTI50',
    name: 'UTI Nifty 50 Index Fund Direct Growth',
    sector: 'Mutual Funds',
    assetClass: 'Mutual Fund',
    price: 175.07,
    currencyUnit: 'INR',
    changePercent: 1.1,
    aum: '₹21,450 Cr',
    expenseRatio: '0.18%',
    ytmOrCagr: '15.4% 5Y CAGR',
    amfiSchemeCode: '120716',
    rsi14: 56.9,
    convictionScore: 85,
    seed: 59,
    trendPct: 12.6,
    volPct: 0.95,
  }),
  makeQuote({
    ticker: 'QUANTSC',
    name: 'Quant Small Cap Fund Direct Growth',
    sector: 'Mutual Funds',
    assetClass: 'Mutual Fund',
    price: 264.09,
    currencyUnit: 'INR',
    changePercent: 1.38,
    aum: '₹26,110 Cr',
    expenseRatio: '0.64%',
    ytmOrCagr: '34.2% 5Y CAGR',
    amfiSchemeCode: '120828',
    rsi14: 60.5,
    convictionScore: 82,
    seed: 61,
    trendPct: 21.8,
    volPct: 1.65,
  }),
  makeQuote({
    ticker: 'SBIGILT',
    name: 'SBI Magnum Gilt Fund Direct Growth',
    sector: 'Debt Funds',
    assetClass: 'Debt Fund',
    price: 68.42,
    currencyUnit: 'INR',
    changePercent: 0.19,
    aum: '₹10,850 Cr',
    expenseRatio: '0.46%',
    ytmOrCagr: '7.42% YTM',
    amfiSchemeCode: '119707',
    rsi14: 54.1,
    convictionScore: 79,
    seed: 67,
    trendPct: 7.4,
    volPct: 0.35,
  }),
];
