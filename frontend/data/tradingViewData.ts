import {
  CalendarEventItem,
  FeaturedIpoItem,
  ForexPerformanceItem,
  MarketSymbolRow,
  OhlcCandle,
  SuperchartInstrument,
  WireNewsItem,
} from '../types/markets.ts';

function buildCandles(base: number, count = 60, seed = 1): OhlcCandle[] {
  const rows: OhlcCandle[] = [];
  let cursor = base * 0.92;
  const start = Date.now() - count * 86_400_000;
  for (let i = 0; i < count; i++) {
    const delta = Math.sin((i + seed) * 0.28) * 0.009 + 0.0014;
    const open = Number(cursor.toFixed(2));
    const close = Number((open * (1 + delta)).toFixed(2));
    const high = Number((Math.max(open, close) * 1.006).toFixed(2));
    const low = Number((Math.min(open, close) * 0.994).toFixed(2));
    rows.push({
      time: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: Math.round(800_000 + Math.abs(Math.cos(i + seed)) * 600_000),
    });
    cursor = close;
  }
  return rows;
}

export const SUPERCHART_INSTRUMENTS: SuperchartInstrument[] = [
  {
    symbol: 'NIFTY50',
    exchange: 'NSE',
    title: 'NIFTY 50 Index',
    lastPrice: 24852.4,
    changePercent: 0.72,
    candles: buildCandles(24852.4, 60, 1),
  },
  {
    symbol: 'SPY',
    exchange: 'NYSE ARCA',
    title: 'SPDR S&P 500 ETF Trust',
    lastPrice: 598.4,
    changePercent: 0.42,
    candles: buildCandles(598.4, 60, 4),
  },
  {
    symbol: 'QQQ',
    exchange: 'NASDAQ',
    title: 'Invesco QQQ Trust',
    lastPrice: 514.2,
    changePercent: 0.56,
    candles: buildCandles(514.2, 60, 7),
  },
  {
    symbol: 'GLD',
    exchange: 'NYSE ARCA',
    title: 'SPDR Gold Shares',
    lastPrice: 306.4,
    changePercent: 1.12,
    candles: buildCandles(306.4, 60, 10),
  },
];

export const MAJOR_INDICES: MarketSymbolRow[] = [
  {
    symbol: 'NIFTY50',
    name: 'NIFTY 50 Benchmark',
    exchange: 'NSE',
    price: '24,852.40',
    unit: 'INR',
    changePercent: 0.72,
    badgeText: 'N50',
    badgeColor: '#2563eb',
    category: 'indices',
    sparkline: [24420, 24510, 24480, 24610, 24705, 24790, 24852],
  },
  {
    symbol: 'SPX',
    name: 'S&P 500 Index',
    exchange: 'INDEX',
    price: '5,984.15',
    unit: 'USD',
    changePercent: 0.42,
    badgeText: 'SPX',
    badgeColor: '#0f172a',
    category: 'indices',
    sparkline: [5890, 5912, 5905, 5938, 5951, 5968, 5984],
  },
  {
    symbol: 'NDX',
    name: 'NASDAQ 100 Index',
    exchange: 'NASDAQ',
    price: '21,142.80',
    unit: 'USD',
    changePercent: 0.64,
    badgeText: 'NDX',
    badgeColor: '#0284c7',
    category: 'indices',
    sparkline: [20810, 20885, 20920, 20990, 21040, 21095, 21142],
  },
  {
    symbol: 'SENSEX',
    name: 'BSE SENSEX 30',
    exchange: 'BSE',
    price: '81,640.25',
    unit: 'INR',
    changePercent: 0.68,
    badgeText: 'BSX',
    badgeColor: '#1d4ed8',
    category: 'indices',
    sparkline: [80510, 80740, 80910, 81120, 81305, 81490, 81640],
  },
];

export const MUTUAL_FUND_LEADERS: MarketSymbolRow[] = [
  {
    symbol: 'PPFAS',
    name: 'Parag Parikh Flexi Cap Direct',
    exchange: 'AMFI',
    price: '89.38',
    unit: 'INR',
    changePercent: 0.83,
    badgeText: 'PPF',
    badgeColor: '#059669',
    category: 'mutual_funds',
    sparkline: [86.8, 87.2, 87.5, 88.1, 88.4, 88.9, 89.38],
  },
  {
    symbol: 'HDFCMID',
    name: 'HDFC Mid-Cap Opportunities Direct',
    exchange: 'AMFI',
    price: '198.29',
    unit: 'INR',
    changePercent: 1.09,
    badgeText: 'HMC',
    badgeColor: '#0d9488',
    category: 'mutual_funds',
    sparkline: [191.2, 192.5, 193.8, 194.9, 196.1, 197.2, 198.29],
  },
  {
    symbol: 'QUANTSC',
    name: 'Quant Small Cap Fund Direct',
    exchange: 'AMFI',
    price: '264.09',
    unit: 'INR',
    changePercent: 1.38,
    badgeText: 'QSC',
    badgeColor: '#047857',
    category: 'mutual_funds',
    sparkline: [255.4, 256.8, 258.2, 259.5, 261.0, 262.4, 264.09],
  },
  {
    symbol: 'UTI50',
    name: 'UTI Nifty 50 Index Direct',
    exchange: 'AMFI',
    price: '175.07',
    unit: 'INR',
    changePercent: 1.1,
    badgeText: 'U50',
    badgeColor: '#2563eb',
    category: 'mutual_funds',
    sparkline: [170.5, 171.2, 172.0, 172.8, 173.6, 174.3, 175.07],
  },
];

export const DEBT_FUND_LEADERS: MarketSymbolRow[] = [
  {
    symbol: 'SBIGILT',
    name: 'SBI Magnum Gilt Direct',
    exchange: 'AMFI',
    price: '68.42',
    unit: 'INR',
    changePercent: 0.19,
    badgeText: 'GLT',
    badgeColor: '#1d4ed8',
    category: 'debt_funds',
    sparkline: [67.8, 67.9, 68.0, 68.1, 68.2, 68.3, 68.42],
  },
  {
    symbol: 'AGG',
    name: 'iShares Core U.S. Aggregate Bond ETF',
    exchange: 'NYSE ARCA',
    price: '98.75',
    unit: 'USD',
    changePercent: 0.28,
    badgeText: 'AGG',
    badgeColor: '#0f766e',
    category: 'debt_funds',
    sparkline: [97.9, 98.05, 98.2, 98.35, 98.5, 98.62, 98.75],
  },
  {
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    exchange: 'NASDAQ',
    price: '91.40',
    unit: 'USD',
    changePercent: 0.64,
    badgeText: 'TLT',
    badgeColor: '#334155',
    category: 'debt_funds',
    sparkline: [89.8, 90.1, 90.3, 90.6, 90.9, 91.1, 91.4],
  },
];

export const GLOBAL_ETFS_LIST: MarketSymbolRow[] = [
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    exchange: 'NYSE ARCA',
    price: '598.40',
    unit: 'USD',
    changePercent: 0.42,
    badgeText: 'SPY',
    badgeColor: '#dc2626',
    category: 'etfs',
    sparkline: [591.2, 592.4, 594.0, 595.1, 596.3, 597.4, 598.4],
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust Series ETF',
    exchange: 'NASDAQ',
    price: '514.20',
    unit: 'USD',
    changePercent: 0.56,
    badgeText: 'QQQ',
    badgeColor: '#0284c7',
    category: 'etfs',
    sparkline: [506.4, 507.9, 509.2, 510.5, 511.8, 513.0, 514.2],
  },
  {
    symbol: 'NIFTYBEES',
    name: 'Nippon India ETF Nifty 50 BeES',
    exchange: 'NSE',
    price: '284.60',
    unit: 'INR',
    changePercent: 1.01,
    badgeText: 'N50',
    badgeColor: '#1e3a8a',
    category: 'etfs',
    sparkline: [279.1, 280.2, 281.0, 282.1, 283.0, 283.8, 284.6],
  },
];

export const GOLD_BULLION_ASSETS: MarketSymbolRow[] = [
  {
    symbol: 'XAUUSD',
    name: 'LBMA Spot Gold / oz',
    exchange: 'SPOT',
    price: '3,284.50',
    unit: 'USD',
    changePercent: 1.18,
    badgeText: 'Au',
    badgeColor: '#b45309',
    category: 'gold',
    sparkline: [3210, 3224, 3238, 3249, 3260, 3272, 3284.5],
  },
  {
    symbol: 'GLD',
    name: 'SPDR Gold Shares Physical ETF',
    exchange: 'NYSE ARCA',
    price: '306.40',
    unit: 'USD',
    changePercent: 1.12,
    badgeText: 'GLD',
    badgeColor: '#ca8a04',
    category: 'gold',
    sparkline: [299.4, 300.6, 301.8, 303.0, 304.2, 305.3, 306.4],
  },
  {
    symbol: 'GOLDBEES',
    name: 'Gold Bullion Index ETF (INR)',
    exchange: 'NSE',
    price: '74.85',
    unit: 'INR',
    changePercent: 1.24,
    badgeText: 'GB',
    badgeColor: '#d97706',
    category: 'gold',
    sparkline: [72.8, 73.1, 73.4, 73.8, 74.1, 74.5, 74.85],
  },
];

export const CRYPTO_ASSETS: MarketSymbolRow[] = [
  {
    symbol: 'PAXG',
    name: 'PAX Gold Tokenized Bullion',
    exchange: 'BINANCE',
    price: '3,286.10',
    unit: 'USD',
    changePercent: 1.15,
    badgeText: 'PAX',
    badgeColor: '#d97706',
    category: 'gold',
    sparkline: [3212, 3225, 3240, 3251, 3264, 3274, 3286.1],
  },
];

export const MACRO_SPARK_ROWS: MarketSymbolRow[] = [
  {
    symbol: 'US10Y',
    name: 'U.S. 10Y Treasury Yield',
    exchange: 'UST',
    price: '4.28%',
    unit: 'YLD',
    changePercent: -0.45,
    badgeText: '10Y',
    badgeColor: '#1e293b',
    category: 'economy',
    sparkline: [4.38, 4.35, 4.33, 4.31, 4.3, 4.29, 4.28],
  },
  {
    symbol: 'IN10Y',
    name: 'India 10Y G-Sec Benchmark',
    exchange: 'RBI',
    price: '6.72%',
    unit: 'YLD',
    changePercent: -0.22,
    badgeText: 'GSC',
    badgeColor: '#0f766e',
    category: 'economy',
    sparkline: [6.81, 6.79, 6.78, 6.76, 6.75, 6.73, 6.72],
  },
  {
    symbol: 'USDINR',
    name: 'USD / INR Spot Reference',
    exchange: 'FX',
    price: '84.42',
    unit: 'INR',
    changePercent: 0.08,
    badgeText: 'FX',
    badgeColor: '#2563eb',
    category: 'forex',
    sparkline: [84.28, 84.3, 84.32, 84.35, 84.37, 84.4, 84.42],
  },
  {
    symbol: 'DXY',
    name: 'U.S. Dollar Index (DXY)',
    exchange: 'ICE',
    price: '103.85',
    unit: 'IDX',
    changePercent: -0.18,
    badgeText: 'DXY',
    badgeColor: '#475569',
    category: 'forex',
    sparkline: [104.3, 104.2, 104.1, 104.0, 103.95, 103.9, 103.85],
  },
];

export const FOREX_PERFORMANCE_PAIRS: ForexPerformanceItem[] = [
  {
    pair: 'USD/INR',
    baseFlag: 'US',
    quoteFlag: 'IN',
    spotRate: '84.42',
    returns: { '1D': 0.08, '1W': 0.21, '1M': 0.54, '3M': 1.12, '6M': 1.85, YTD: 1.4, '1Y': 2.35, '5Y': 14.8, All: 38.2 },
  },
  {
    pair: 'EUR/USD',
    baseFlag: 'EU',
    quoteFlag: 'US',
    spotRate: '1.0842',
    returns: { '1D': 0.14, '1W': 0.32, '1M': -0.42, '3M': 0.78, '6M': 1.15, YTD: 0.6, '1Y': 1.9, '5Y': -2.4, All: 6.1 },
  },
  {
    pair: 'GBP/INR',
    baseFlag: 'GB',
    quoteFlag: 'IN',
    spotRate: '107.65',
    returns: { '1D': 0.19, '1W': 0.48, '1M': 0.92, '3M': 2.1, '6M': 3.4, YTD: 2.2, '1Y': 4.15, '5Y': 19.2, All: 28.4 },
  },
  {
    pair: 'USD/JPY',
    baseFlag: 'US',
    quoteFlag: 'JP',
    spotRate: '151.20',
    returns: { '1D': -0.22, '1W': -0.65, '1M': 1.18, '3M': 2.45, '6M': -1.2, YTD: 1.9, '1Y': 3.1, '5Y': 39.4, All: 42.1 },
  },
];

export const TOP_STORIES: WireNewsItem[] = [
  {
    id: 'story-1',
    timeAgo: '14m ago',
    source: 'AMFI Desk',
    headline: 'Direct Equity Mutual Fund SIP Inflows Sustain Record Institutional Momentum',
    summary: 'Monthly SIP allocations into Flexi-Cap, Mid-Cap, and Nifty Index schemes remained resilient across retail folios.',
    category: 'mutual_funds',
    tickers: ['PPFAS', 'HDFCMID', 'UTI50'],
  },
  {
    id: 'story-2',
    timeAgo: '38m ago',
    source: 'Fixed Income Wire',
    headline: 'Sovereign 10Y G-Sec and U.S. Treasury Curves Flatten Ahead of Central Bank Guidance',
    summary: 'Long-duration gilt and aggregate bond ETFs saw steady institutional allocation demand.',
    category: 'gold_debt',
    tickers: ['SBIGILT', 'AGG', 'TLT'],
  },
  {
    id: 'story-3',
    timeAgo: '1h ago',
    source: 'Bullion Monitor',
    headline: 'Central Bank Gold Reserves Lift Physical Bullion ETFs Across Global Exchanges',
    summary: 'Spot gold held near record highs as sovereign reserve diversification persisted.',
    category: 'gold_debt',
    tickers: ['XAUUSD', 'GLD', 'GOLDBEES'],
  },
];

export const MUTUAL_FUND_NEWS: WireNewsItem[] = TOP_STORIES.filter((n) => n.category === 'mutual_funds');
export const GOLD_DEBT_NEWS: WireNewsItem[] = TOP_STORIES.filter((n) => n.category === 'gold_debt');
export const FOREX_NEWS: WireNewsItem[] = [
  {
    id: 'fx-1',
    timeAgo: '52m ago',
    source: 'FX Desk',
    headline: 'USD/INR Holds Narrow Range Supported by FPI Debt Inclusion Flows',
    summary: 'Global bond index inflows cushioned currency volatility across Asian FX crosses.',
    category: 'forex',
    tickers: ['USDINR', 'DXY'],
  },
];
export const FUTURES_NEWS: WireNewsItem[] = TOP_STORIES;
export const CRYPTO_NEWS: WireNewsItem[] = GOLD_DEBT_NEWS;
export const INDIAN_STOCKS_NEWS: WireNewsItem[] = MUTUAL_FUND_NEWS;

export const NFO_AND_SGB_TRANCHES: FeaturedIpoItem[] = [
  {
    symbol: 'NIFTY500M50',
    name: 'Nifty 500 Momentum 50 Index Direct',
    exchange: 'AMFI NFO',
    valuation: 'Open Ended',
    accentColor: '#2563eb',
  },
  {
    symbol: 'GSEC2035',
    name: 'Target Maturity G-Sec 2035 Index',
    exchange: 'AMFI NFO',
    valuation: '7.18% YTM',
    accentColor: '#059669',
  },
];

export const ECONOMIC_CALENDAR: CalendarEventItem[] = [
  {
    id: 'ec-1',
    dateLabel: 'Thu',
    subLabel: 'RBI MPC',
    title: 'RBI Repo Rate & Liquidity Stance Decision',
    actual: '6.25%',
    forecast: '6.25%',
    prior: '6.50%',
    flag: 'IN',
  },
  {
    id: 'ec-2',
    dateLabel: 'Fri',
    subLabel: 'US BLS',
    title: 'U.S. Core PCE Price Index (YoY)',
    actual: '2.6%',
    forecast: '2.6%',
    prior: '2.7%',
    flag: 'US',
  },
];

export const POLICY_AND_AUCTION_CALENDAR: CalendarEventItem[] = [
  {
    id: 'pa-1',
    dateLabel: 'Tue',
    subLabel: 'G-Sec',
    title: 'RBI 10Y Sovereign Bond Weekly Auction',
    actual: '6.72%',
    forecast: '6.74%',
    prior: '6.75%',
    flag: 'IN',
  },
  {
    id: 'pa-2',
    dateLabel: 'Wed',
    subLabel: 'UST',
    title: 'U.S. Treasury 10Y Note Reopening Auction',
    actual: '4.28%',
    forecast: '4.30%',
    prior: '4.32%',
    flag: 'US',
  },
];

export const ALL_SEARCHABLE_SYMBOLS: MarketSymbolRow[] = [
  ...MAJOR_INDICES,
  ...MUTUAL_FUND_LEADERS,
  ...GLOBAL_ETFS_LIST,
  ...GOLD_BULLION_ASSETS,
  ...DEBT_FUND_LEADERS,
  ...MACRO_SPARK_ROWS,
];
