import {
  CalendarEventItem,
  CommunityIdeaItem,
  FeaturedIpoItem,
  ForexPerformanceItem,
  MarketSymbolRow,
  SuperchartInstrument,
  WireNewsItem,
} from '../types/markets';

export const NIFTY_HERO_SERIES: number[] = [
  25120, 25168, 25245, 25192, 25040, 24965, 25088, 25175, 25310, 25262,
  25140, 25285, 25342, 25298, 25180, 25224, 25110, 25055, 25135, 25210,
  25291.1,
];

export const MAJOR_INDICES: MarketSymbolRow[] = [
  {
    symbol: 'NIFTYBEES',
    name: 'Nippon India ETF Nifty 50 BeES',
    exchange: 'NSE',
    price: '284.60',
    unit: 'INR',
    changePercent: 1.01,
    badgeText: 'N50',
    badgeColor: '#1E3A8A',
    category: 'etfs',
    sparkline: [279.2, 280.1, 281.4, 282.0, 283.1, 283.8, 284.6],
  },
  {
    symbol: 'GOLDBEES',
    name: 'Nippon India ETF Gold BeES',
    exchange: 'NSE',
    price: '74.85',
    unit: 'INR',
    changePercent: 1.24,
    badgeText: 'Au',
    badgeColor: '#D97706',
    category: 'gold',
    sparkline: [72.9, 73.1, 73.4, 73.7, 74.1, 74.4, 74.85],
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    exchange: 'NYSEARCA',
    price: '598.40',
    unit: 'USD',
    changePercent: 0.42,
    badgeText: 'SPY',
    badgeColor: '#DC2626',
    category: 'etfs',
    sparkline: [592.4, 593.1, 594.5, 595.2, 596.4, 597.3, 598.4],
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust Series ETF',
    exchange: 'NASDAQ',
    price: '514.20',
    unit: 'USD',
    changePercent: -0.35,
    badgeText: 'QQQ',
    badgeColor: '#0284C7',
    category: 'etfs',
    sparkline: [518.1, 517.4, 516.8, 516.0, 515.4, 514.8, 514.2],
  },
  {
    symbol: 'AGG',
    name: 'iShares Core U.S. Aggregate Bond ETF',
    exchange: 'NYSEARCA',
    price: '98.75',
    unit: 'USD',
    changePercent: 0.28,
    badgeText: 'AGG',
    badgeColor: '#059669',
    category: 'debt_funds',
    sparkline: [97.8, 97.95, 98.1, 98.3, 98.45, 98.6, 98.75],
  },
  {
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    exchange: 'NASDAQ',
    price: '91.40',
    unit: 'USD',
    changePercent: 0.64,
    badgeText: 'TLT',
    badgeColor: '#0D9488',
    category: 'debt_funds',
    sparkline: [89.6, 90.0, 90.3, 90.6, 90.9, 91.15, 91.4],
  },
  {
    symbol: 'NIFTY',
    name: 'Nifty 50 Benchmark Index',
    exchange: 'NSE',
    price: '25,291.10',
    unit: 'POINT',
    changePercent: 0.58,
    badgeText: '50',
    badgeColor: '#1D4ED8',
    category: 'indices',
    delayed: true,
    sparkline: NIFTY_HERO_SERIES,
  },
];

export const GOLD_BULLION_ASSETS: MarketSymbolRow[] = [
  {
    symbol: 'PAXGUSDT',
    name: 'Spot Gold Tokenized LBMA (1 oz)',
    exchange: 'BINANCE',
    price: '3,284.50',
    unit: 'USD / oz',
    changePercent: 1.18,
    badgeText: 'XAU',
    badgeColor: '#D97706',
    category: 'gold',
    sparkline: [3218, 3232, 3245, 3258, 3269, 3276, 3284.5],
  },
  {
    symbol: 'GOLDBEES',
    name: 'Nippon India ETF Gold BeES',
    exchange: 'NSE',
    price: '74.85',
    unit: 'INR',
    changePercent: 1.24,
    badgeText: 'Au',
    badgeColor: '#B45309',
    category: 'gold',
    sparkline: [72.9, 73.2, 73.5, 73.9, 74.2, 74.5, 74.85],
  },
  {
    symbol: 'GLD',
    name: 'SPDR Gold Shares Physical ETF',
    exchange: 'NYSEARCA',
    price: '306.40',
    unit: 'USD',
    changePercent: 1.27,
    badgeText: 'GLD',
    badgeColor: '#CA8A04',
    category: 'gold',
    sparkline: [298.6, 300.2, 301.8, 303.1, 304.4, 305.5, 306.4],
  },
  {
    symbol: 'SILVERBEES',
    name: 'Nippon India Silver ETF',
    exchange: 'NSE',
    price: '96.20',
    unit: 'INR',
    changePercent: 0.94,
    badgeText: 'Ag',
    badgeColor: '#64748B',
    category: 'gold',
    sparkline: [94.1, 94.6, 95.0, 95.3, 95.6, 95.9, 96.2],
  },
  {
    symbol: 'SGBMAR31',
    name: 'Sovereign Gold Bond 2.5% Tranche',
    exchange: 'NSE-SGB',
    price: '8,412.00',
    unit: 'INR / gm',
    changePercent: 1.12,
    badgeText: 'SGB',
    badgeColor: '#92400E',
    category: 'gold',
    sparkline: [8240, 8280, 8310, 8340, 8368, 8392, 8412],
  },
];

// Backward-compatible export alias for Sentiment/Landing hooks
export const CRYPTO_ASSETS = GOLD_BULLION_ASSETS;

export const MACRO_SPARK_ROWS: MarketSymbolRow[] = [
  {
    symbol: 'USDINR',
    name: 'USD to INR (FX Carry)',
    price: '85.4200',
    unit: 'INR',
    changePercent: -0.18,
    badgeText: '₹',
    badgeColor: '#2563EB',
    category: 'forex',
    sparkline: [85.64, 85.6, 85.55, 85.51, 85.48, 85.45, 85.42],
  },
  {
    symbol: 'IN10Y',
    name: 'India 10Y G-Sec Sovereign Yield',
    price: '6.842',
    unit: '% YTM',
    changePercent: -0.62,
    badgeText: 'GSEC',
    badgeColor: '#059669',
    category: 'economy',
    sparkline: [6.93, 6.91, 6.89, 6.88, 6.865, 6.854, 6.842],
  },
];

export const MUTUAL_FUND_LEADERS: MarketSymbolRow[] = [
  {
    symbol: 'PPFAS',
    name: 'Parag Parikh Flexi Cap Direct Growth',
    exchange: 'AMFI-122639',
    price: '89.42',
    unit: 'INR NAV',
    changePercent: 0.88,
    badgeText: 'PPF',
    badgeColor: '#1E3A8A',
    category: 'mutual_funds',
    sparkline: [87.1, 87.5, 87.9, 88.2, 88.6, 89.0, 89.42],
  },
  {
    symbol: 'HDFCMID',
    name: 'HDFC Mid-Cap Opportunities Direct',
    exchange: 'AMFI-118989',
    price: '198.40',
    unit: 'INR NAV',
    changePercent: 1.15,
    badgeText: 'HMC',
    badgeColor: '#1D4ED8',
    category: 'mutual_funds',
    sparkline: [192.4, 193.8, 195.0, 196.1, 197.0, 197.8, 198.4],
  },
  {
    symbol: 'QUANTSC',
    name: 'Quant Small Cap Direct Plan Growth',
    exchange: 'AMFI-120828',
    price: '264.15',
    unit: 'INR NAV',
    changePercent: 1.42,
    badgeText: 'QSC',
    badgeColor: '#0284C7',
    category: 'mutual_funds',
    sparkline: [255.8, 257.4, 259.1, 260.4, 261.8, 263.0, 264.15],
  },
  {
    symbol: 'UTI50',
    name: 'UTI Nifty 50 Index Direct Growth',
    exchange: 'AMFI-120716',
    price: '174.88',
    unit: 'INR NAV',
    changePercent: 0.96,
    badgeText: 'UTI',
    badgeColor: '#059669',
    category: 'mutual_funds',
    sparkline: [171.5, 172.1, 172.8, 173.4, 173.9, 174.4, 174.88],
  },
  {
    symbol: 'MIRAEBLUE',
    name: 'Mirae Asset Large & Midcap Direct',
    exchange: 'AMFI-118834',
    price: '162.30',
    unit: 'INR NAV',
    changePercent: 0.74,
    badgeText: 'MLM',
    badgeColor: '#0F172A',
    category: 'mutual_funds',
    sparkline: [159.4, 160.0, 160.5, 161.0, 161.5, 161.9, 162.3],
  },
  {
    symbol: 'NIPSMALL',
    name: 'Nippon India Small Cap Direct Growth',
    exchange: 'AMFI-118778',
    price: '184.72',
    unit: 'INR NAV',
    changePercent: 1.29,
    badgeText: 'NSC',
    badgeColor: '#D97706',
    category: 'mutual_funds',
    sparkline: [179.5, 180.6, 181.8, 182.6, 183.4, 184.1, 184.72],
  },
];

export const DEBT_FUND_LEADERS: MarketSymbolRow[] = [
  {
    symbol: 'SBIGILT',
    name: 'SBI Magnum Gilt Fund Direct (7.18% YTM)',
    exchange: 'AMFI-119823',
    price: '68.14',
    unit: 'INR NAV',
    changePercent: 0.35,
    badgeText: 'GILT',
    badgeColor: '#059669',
    category: 'debt_funds',
    sparkline: [67.45, 67.58, 67.7, 67.82, 67.94, 68.05, 68.14],
  },
  {
    symbol: 'HDFCCORP',
    name: 'HDFC Corporate Bond Direct (7.62% YTM)',
    exchange: 'AMFI-128053',
    price: '33.48',
    unit: 'INR NAV',
    changePercent: 0.24,
    badgeText: 'AAA',
    badgeColor: '#0284C7',
    category: 'debt_funds',
    sparkline: [33.24, 33.28, 33.32, 33.36, 33.4, 33.44, 33.48],
  },
  {
    symbol: 'LIQUIDBEES',
    name: 'Nippon India Liquid BeES (6.74% TREPS)',
    exchange: 'NSE',
    price: '1,000.00',
    unit: 'INR',
    changePercent: 0.02,
    badgeText: 'LIQ',
    badgeColor: '#0D9488',
    category: 'debt_funds',
    sparkline: [1000, 1000, 1000, 1000, 1000, 1000, 1000],
  },
  {
    symbol: 'ICICIGILT',
    name: 'ICICI Pru All Seasons Bond Direct (7.49%)',
    exchange: 'AMFI-120594',
    price: '39.84',
    unit: 'INR NAV',
    changePercent: 0.31,
    badgeText: 'BOND',
    badgeColor: '#1E3A8A',
    category: 'debt_funds',
    sparkline: [39.5, 39.56, 39.62, 39.68, 39.74, 39.79, 39.84],
  },
  {
    symbol: 'AGG',
    name: 'iShares Core U.S. Aggregate Bond ETF',
    exchange: 'NYSEARCA',
    price: '98.75',
    unit: 'USD',
    changePercent: 0.28,
    badgeText: 'AGG',
    badgeColor: '#047857',
    category: 'debt_funds',
    sparkline: [97.8, 97.95, 98.1, 98.3, 98.45, 98.6, 98.75],
  },
  {
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    exchange: 'NASDAQ',
    price: '91.40',
    unit: 'USD',
    changePercent: 0.64,
    badgeText: 'TLT',
    badgeColor: '#0F766E',
    category: 'debt_funds',
    sparkline: [89.6, 90.0, 90.3, 90.6, 90.9, 91.15, 91.4],
  },
];

export const GLOBAL_ETFS_LIST: MarketSymbolRow[] = [
  {
    symbol: 'NIFTYBEES',
    name: 'Nippon India ETF Nifty 50 BeES',
    exchange: 'NSE',
    price: '284.60',
    unit: 'INR',
    changePercent: 1.01,
    badgeText: 'N50',
    badgeColor: '#1E3A8A',
    category: 'etfs',
    sparkline: [278.4, 279.6, 280.8, 281.9, 282.8, 283.7, 284.6],
  },
  {
    symbol: 'BANKBEES',
    name: 'Nippon India ETF Nifty Bank BeES',
    exchange: 'NSE',
    price: '542.80',
    unit: 'INR',
    changePercent: 0.84,
    badgeText: 'BNK',
    badgeColor: '#1D4ED8',
    category: 'etfs',
    sparkline: [534.0, 535.8, 537.4, 539.1, 540.5, 541.7, 542.8],
  },
  {
    symbol: 'JUNIORBEES',
    name: 'Nippon India ETF Nifty Next 50 BeES',
    exchange: 'NSE',
    price: '768.25',
    unit: 'INR',
    changePercent: 1.38,
    badgeText: 'NXT',
    badgeColor: '#0284C7',
    category: 'etfs',
    sparkline: [751.2, 754.6, 757.8, 760.5, 763.4, 765.8, 768.25],
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 Index ETF Trust',
    exchange: 'NYSEARCA',
    price: '598.40',
    unit: 'USD',
    changePercent: 0.42,
    badgeText: 'SPY',
    badgeColor: '#DC2626',
    category: 'etfs',
    sparkline: [592.4, 593.1, 594.5, 595.2, 596.4, 597.3, 598.4],
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust Series 1 ETF',
    exchange: 'NASDAQ',
    price: '514.20',
    unit: 'USD',
    changePercent: -0.35,
    badgeText: 'QQQ',
    badgeColor: '#2563EB',
    category: 'etfs',
    sparkline: [518.1, 517.4, 516.8, 516.0, 515.4, 514.8, 514.2],
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    exchange: 'NYSEARCA',
    price: '294.15',
    unit: 'USD',
    changePercent: 0.39,
    badgeText: 'VTI',
    badgeColor: '#B91C1C',
    category: 'etfs',
    sparkline: [291.4, 291.9, 292.4, 292.9, 293.4, 293.8, 294.15],
  },
];

// Clean aliases so legacy module imports stay 100% aligned with the 4 pillars
export const ENERGY_FUTURES = DEBT_FUND_LEADERS;
export const METALS_FUTURES = GOLD_BULLION_ASSETS;
export const INDIAN_COMMUNITY_TRENDS = MUTUAL_FUND_LEADERS.slice(0, 3);
export const HIGHEST_VOLUME_STOCKS = GLOBAL_ETFS_LIST;
export const STOCK_GAINERS = MUTUAL_FUND_LEADERS;
export const STOCK_LOSERS = DEBT_FUND_LEADERS;
export const MOST_VOLATILE_STOCKS = MUTUAL_FUND_LEADERS;
export const CRYPTO_GAINERS = GOLD_BULLION_ASSETS.slice(0, 4);
export const CRYPTO_LOSERS = DEBT_FUND_LEADERS.slice(0, 4);

export const FEATURED_NFO_AND_SGB: FeaturedIpoItem[] = [
  {
    symbol: 'SGB-S4',
    name: 'Sovereign Gold Bond 2026-27 Series IV',
    exchange: 'RBI / NSE',
    valuation: '2.50% Coupon + Gold',
    accentColor: '#B45309',
  },
  {
    symbol: 'BBOND36',
    name: 'Bharat Bond ETF April 2036 AAA PSU',
    exchange: 'NSE DEBT',
    valuation: '7.46% Target YTM',
    accentColor: '#059669',
  },
  {
    symbol: 'PPFDYN',
    name: 'PPFAS Dynamic Asset Allocation Direct',
    exchange: 'AMFI NFO',
    valuation: '₹10.00 NFO Par NAV',
    accentColor: '#1E3A8A',
  },
];

export const FEATURED_IPOS = FEATURED_NFO_AND_SGB;

export const NFO_AND_SGB_TRANCHES: Array<{
  date: string;
  symbol: string;
  name: string;
  exchange: string;
  offerPrice: string;
}> = [
  { date: 'Jun 24', symbol: 'SGB-S4', name: 'Sovereign Gold Bond Series IV (2.5% Coupon)', exchange: 'RBI', offerPrice: '₹8,390 / gm' },
  { date: 'Jun 28', symbol: 'BBOND36', name: 'Edelweiss Bharat Bond ETF 2036 AAA', exchange: 'NSE', offerPrice: '₹1,000 Par' },
  { date: 'Jul 02', symbol: 'HDFCGILT10', name: 'HDFC 10Y Constant Maturity Gilt NFO', exchange: 'AMFI', offerPrice: '₹10.00 NAV' },
];

export const INDIAN_IPO_CALENDAR = NFO_AND_SGB_TRANCHES;

export const FOREX_PERFORMANCE_PAIRS: ForexPerformanceItem[] = [
  {
    pair: 'EURUSD',
    baseFlag: '🇪🇺',
    quoteFlag: '🇺🇸',
    spotRate: '1.1045',
    returns: {
      '1D': -0.11,
      '1W': -0.46,
      '1M': -1.32,
      '3M': 0.85,
      '6M': 1.44,
      YTD: 1.18,
      '1Y': 2.64,
      '5Y': -4.18,
      All: -7.85,
    },
  },
  {
    pair: 'JPYUSD',
    baseFlag: '🇯🇵',
    quoteFlag: '🇺🇸',
    spotRate: '0.00631',
    returns: {
      '1D': 0.03,
      '1W': -0.78,
      '1M': -2.14,
      '3M': -3.40,
      '6M': -5.12,
      YTD: -6.25,
      '1Y': -7.90,
      '5Y': -28.4,
      All: -34.2,
    },
  },
  {
    pair: 'GBPUSD',
    baseFlag: '🇬🇧',
    quoteFlag: '🇺🇸',
    spotRate: '1.2742',
    returns: {
      '1D': -0.10,
      '1W': -0.58,
      '1M': -0.94,
      '3M': 1.24,
      '6M': 2.15,
      YTD: 1.82,
      '1Y': 3.45,
      '5Y': -2.90,
      All: -14.6,
    },
  },
  {
    pair: 'AUDUSD',
    baseFlag: '🇦🇺',
    quoteFlag: '🇺🇸',
    spotRate: '0.6618',
    returns: {
      '1D': -0.30,
      '1W': -0.92,
      '1M': -1.85,
      '3M': -0.62,
      '6M': 0.45,
      YTD: -0.78,
      '1Y': 1.12,
      '5Y': -9.40,
      All: -11.3,
    },
  },
  {
    pair: 'CHFUSD',
    baseFlag: '🇨🇭',
    quoteFlag: '🇺🇸',
    spotRate: '1.1420',
    returns: {
      '1D': -0.11,
      '1W': 0.24,
      '1M': 0.96,
      '3M': 2.40,
      '6M': 3.85,
      YTD: 3.12,
      '1Y': 4.78,
      '5Y': 6.45,
      All: 22.8,
    },
  },
  {
    pair: 'CADUSD',
    baseFlag: '🇨🇦',
    quoteFlag: '🇺🇸',
    spotRate: '0.7215',
    returns: {
      '1D': -0.20,
      '1W': -0.64,
      '1M': -1.48,
      '3M': -1.95,
      '6M': -2.30,
      YTD: -2.84,
      '1Y': -3.15,
      '5Y': -6.20,
      All: -16.4,
    },
  },
  {
    pair: 'NZDUSD',
    baseFlag: '🇳🇿',
    quoteFlag: '🇺🇸',
    spotRate: '0.5984',
    returns: {
      '1D': -0.24,
      '1W': -0.88,
      '1M': -2.05,
      '3M': -1.12,
      '6M': -0.38,
      YTD: -1.45,
      '1Y': 0.64,
      '5Y': -12.8,
      All: -15.1,
    },
  },
  {
    pair: 'INRUSD',
    baseFlag: '🇮🇳',
    quoteFlag: '🇺🇸',
    spotRate: '0.01170',
    returns: {
      '1D': 0.18,
      '1W': 0.32,
      '1M': 0.64,
      '3M': 0.88,
      '6M': 0.45,
      YTD: 0.22,
      '1Y': -0.85,
      '5Y': -12.4,
      All: -36.2,
    },
  },
];

export const FOREX_NEWS: WireNewsItem[] = [
  {
    id: 'fx-1',
    timeAgo: '15 minutes ago',
    source: 'Reuters',
    headline: 'Global Sovereign Bond Index Flows Lift INR & Gilt Yields Lower',
    summary:
      'Foreign passive bond inflows supported the rupee near 85.42 while pushing India 10Y G-Sec benchmark yields down to 6.84%, aiding long-duration Gilt mutual funds.',
    category: 'forex',
    tickers: ['IN10Y', 'SBIGILT', 'USDINR'],
  },
  {
    id: 'fx-2',
    timeAgo: '24 minutes ago',
    source: 'Dow Jones Newswires',
    headline: 'Dollar Softens Slightly as US 10Y Treasury Auction Attracts Indirect Demand',
    summary:
      'Treasury ETFs AGG and TLT edged higher after strong foreign central bank bid-to-cover ratios eased yield pressures.',
    category: 'forex',
    tickers: ['AGG', 'TLT', 'EURUSD'],
    flash: true,
  },
  {
    id: 'fx-3',
    timeAgo: '42 minutes ago',
    source: 'Reuters',
    headline: 'RBI FX Reserve Buffer Anchors Cross-Border ETF Hedging Costs',
    summary:
      'Stable forward USD/INR premia continue to benefit domestic passive ETFs and global mutual fund feeder allocations.',
    category: 'forex',
    tickers: ['USDINR', 'PPFAS', 'NIFTYBEES'],
  },
];

export const GOLD_DEBT_NEWS: WireNewsItem[] = [
  {
    id: 'gd-1',
    timeAgo: '18 minutes ago',
    source: 'World Gold Council',
    headline: 'Global Gold ETFs Log 15th Consecutive Month of Net Physical Inflows',
    summary:
      'North American SPDR GLD and Indian Gold BeES added combined tonnage on central-bank reserve diversification and moderating real yields.',
    category: 'gold_debt',
    tickers: ['GOLDBEES', 'GLD', 'PAXGUSDT'],
    flash: true,
  },
  {
    id: 'gd-2',
    timeAgo: '32 minutes ago',
    source: 'Fixed Income Desk',
    headline: 'AAA PSU Corporate Bond Spreads Hold Firm Ahead of RBI Liquidity Injection',
    summary:
      '3–5 year AAA corporate bond funds maintain an attractive ~7.60% YTM carry cushion over liquid overnight TREPS rates.',
    category: 'gold_debt',
    tickers: ['HDFCCORP', 'SBIGILT', 'LIQUIDBEES'],
  },
  {
    id: 'gd-3',
    timeAgo: '55 minutes ago',
    source: 'Bloomberg',
    headline: 'US 20+ Year Treasury ETF (TLT) Gains as Real Yields Ease Off Cycle Highs',
    summary:
      'Fixed-income allocators extended duration past 6 years across aggregate and sovereign bond ETFs.',
    category: 'gold_debt',
    tickers: ['TLT', 'AGG'],
  },
  {
    id: 'gd-4',
    timeAgo: '1 hour ago',
    source: 'Mint',
    headline: 'Sovereign Gold Bond Secondary Market Trades at Tight Parity to Physical Spot',
    summary:
      'Institutional wealth desks highlight 2.5% coupon carryover advantage on SGB tranches alongside zero custody expense.',
    category: 'gold_debt',
    tickers: ['SGBMAR31', 'GOLDBEES'],
  },
];

export const MUTUAL_FUND_NEWS: WireNewsItem[] = [
  {
    id: 'mf-1',
    timeAgo: '20 minutes ago',
    source: 'AMFI India',
    headline: 'Monthly Mutual Fund SIP Book Scales Record High as Flexi & Mid-Cap Flows Surge',
    summary:
      'Systematic monthly flows topped ₹26,400 crore with Direct Plan participation hitting fresh highs across PPFAS and HDFC Mid-Cap schemes.',
    category: 'mutual_funds',
    tickers: ['PPFAS', 'HDFCMID', 'UTI50'],
    flash: true,
  },
  {
    id: 'mf-2',
    timeAgo: '45 minutes ago',
    source: 'Value Research',
    headline: 'Index ETFs & Direct Index Mutual Funds Capture Rising Passive Retirement Share',
    summary:
      'Ultra-low 4 bps expense ratio NIFTYBEES and UTI Nifty 50 Index Direct continue lowering blended portfolio fee drag.',
    category: 'etfs',
    tickers: ['NIFTYBEES', 'UTI50', 'BANKBEES'],
  },
  {
    id: 'mf-3',
    timeAgo: '1 hour ago',
    source: 'Business Line',
    headline: 'Debt Mutual Funds See Institutional Treasury Rotation Into Gilt & Corporate Bond Funds',
    summary:
      'Corporate treasuries shifted surplus cash out of overnight pools into 3–6Y duration Gilt and AAA PSU Debt funds to lock in 7.2%+ yields.',
    category: 'mutual_funds',
    tickers: ['SBIGILT', 'HDFCCORP', 'ICICIGILT'],
  },
  {
    id: 'mf-4',
    timeAgo: '2 hours ago',
    source: 'Morningstar ETF',
    headline: 'Global S&P 500 & Silver ETFs Record Multi-Week Creation Basket Expansion',
    summary:
      'Broad index ETFs SPY and VTI plus precious metal ETFs SILVERBEES saw healthy institutional primary-market creations.',
    category: 'etfs',
    tickers: ['SPY', 'SILVERBEES', 'QQQ'],
  },
];

export const INDIAN_STOCKS_NEWS = MUTUAL_FUND_NEWS;
export const CRYPTO_NEWS = GOLD_DEBT_NEWS;
export const FUTURES_NEWS = GOLD_DEBT_NEWS;

export const TOP_STORIES: WireNewsItem[] = [
  {
    id: 'top-1',
    timeAgo: '18 minutes ago',
    source: 'Financia Bullion',
    headline: 'Spot Gold & GOLDBEES Advance as Sovereign Reserve Buying Hits Quarterly High',
    summary: 'Physical gold ETFs led safe-haven inflows with PAXG/XAU spot bullion holding firm near $3,284/oz.',
    category: 'top',
    tickers: ['GOLDBEES', 'GLD', 'PAXGUSDT'],
  },
  {
    id: 'top-2',
    timeAgo: '30 minutes ago',
    source: 'Financia AMFI',
    headline: 'Direct Mutual Fund SIP Inflows Exceed ₹26,400 Cr Monthly Run-Rate',
    summary: 'Flexi-cap and Nifty index mutual funds maintained resilient net creations across domestic retail accounts.',
    category: 'top',
    tickers: ['PPFAS', 'HDFCMID', 'UTI50'],
  },
  {
    id: 'top-3',
    timeAgo: '50 minutes ago',
    source: 'Financia Debt Desk',
    headline: 'India 10Y G-Sec Eases to 6.84%; Long-Duration Gilt Funds Outperform Cash',
    summary: 'SBIGILT and TLT benefitted from moderating sovereign real yields and steady passive bond index allocations.',
    category: 'top',
    tickers: ['SBIGILT', 'HDFCCORP', 'TLT'],
  },
  {
    id: 'top-4',
    timeAgo: '1 hour ago',
    source: 'Financia ETFs',
    headline: 'NIFTYBEES & SPY Sustain Tight Sub-5 Bps Tracking Error Across Quarterly Rebalance',
    summary: 'Institutional creation baskets absorbed quarterly index reconstitution cleanly.',
    category: 'top',
    tickers: ['NIFTYBEES', 'SPY', 'QQQ'],
  },
];

export const COMMUNITY_IDEAS: CommunityIdeaItem[] = [
  {
    id: 'idea-gold',
    title: 'GOLDBEES | Physical Bullion Trend Channel & Central Bank Support',
    description:
      'Spot gold (PAXGUSDT) holding higher lows above $3,220/oz lifts Nippon Gold BeES toward fresh NAV highs with 0.02% tracking precision.',
    author: 'BullionDesk',
    timeLabel: 'Updated 2 hours ago',
    comments: 4,
    boosts: 42,
    category: 'gold',
    symbol: 'GOLDBEES',
    chartType: 'golden_channel',
    priceAxisLabels: ['76.00', '74.85', '73.20', '71.40'],
  },
  {
    id: 'idea-gilt',
    title: 'SBIGILT | 6.4Y Modified Duration Carry Setup Ahead of Policy Easing',
    description:
      'With 10Y India G-Sec softening below 6.85% and 7.18% portfolio YTM, sovereign gilt funds present balanced duration convexity.',
    author: 'YieldCurvePro',
    timeLabel: '5 hours ago',
    comments: 6,
    boosts: 38,
    category: 'debt',
    symbol: 'SBIGILT',
    chartType: 'bullish_breakout',
    priceAxisLabels: ['70.50', '68.14', '66.90', '65.40'],
  },
  {
    id: 'idea-ppfas',
    title: 'PPFAS Direct Growth | Cash Buffer + Quality Compounding Curve',
    description:
      'Parag Parikh Flexi Cap (AMFI 122639) compounding steadily on 14.2% T-Bill buffer and 0.63% Direct expense ratio.',
    author: 'SIPAllocator',
    timeLabel: '8 hours ago',
    comments: 3,
    boosts: 29,
    category: 'mutual_funds',
    symbol: 'PPFAS',
    chartType: 'bullish_breakout',
    priceAxisLabels: ['92.00', '89.42', '86.50', '83.00'],
  },
  {
    id: 'idea-niftybees',
    title: 'NIFTYBEES & SPY Core Index Allocation Rebalance Levels',
    description:
      '0.04% expense-ratio passive Nifty 50 ETF holding 280+ support zone with steady institutional accumulation.',
    author: 'PassiveCore',
    timeLabel: '10 hours ago',
    comments: 2,
    boosts: 21,
    category: 'editors',
    symbol: 'NIFTYBEES',
    chartType: 'eurusd_4h',
    priceAxisLabels: ['290.00', '284.60', '278.00', '272.00'],
  },
];

export const INDICATOR_SCRIPTS: CommunityIdeaItem[] = [
  {
    id: 'ind-cci',
    title: 'Cross-Asset Duration & Real-Yield Gold Overlay (XAU vs 10Y TIPS)',
    description:
      'Maps inverse real-rate convexity against physical gold ETF NAV curves for tactical Gold BeES and SGB tranche rebalancing.',
    author: 'MacroFixedIncome',
    timeLabel: '14 comments',
    comments: 14,
    boosts: 940,
    category: 'editors',
    symbol: 'GOLDBEES',
    chartType: 'cci_oscillator',
    priceAxisLabels: ['+200', '+100', '0.0', '-100'],
  },
  {
    id: 'ind-vp',
    title: 'Mutual Fund & ETF Rolling Alpha Percentile Ribbon',
    description:
      'Visualizes trailing 3Y rolling CAGR versus Direct Plan TER drag and sovereign Gilt benchmark bands.',
    author: 'QuantFunds',
    timeLabel: '5 comments',
    comments: 5,
    boosts: 615,
    category: 'popular',
    symbol: 'PPFAS',
    chartType: 'volume_profile',
    priceAxisLabels: ['91.00', '89.42', '86.80', '84.20'],
  },
];

export const POLICY_AND_AUCTION_CALENDAR: CalendarEventItem[] = [
  { id: 'pc-1', dateLabel: 'Jun 24', subLabel: '🇮🇳 RBI SGB', title: 'Sovereign Gold Bond 2026-27 Tranche IV Subscription', ticker: 'GOLDBEES', exchange: 'RBI', actual: '2.50% Coupon', forecast: '₹8,390 / gm' },
  { id: 'pc-2', dateLabel: 'Jun 27', subLabel: '🇮🇳 G-SEC', title: '10Y & 30Y GOI Sovereign Bond Weekly Auction (₹32,000 Cr)', ticker: 'SBIGILT', exchange: 'RBI', actual: '—', forecast: '6.82% Cut-Off' },
  { id: 'pc-3', dateLabel: 'Jul 02', subLabel: '🇺🇸 FOMC', title: 'Federal Reserve FOMC Minutes & Real-Rate Guidance', ticker: 'GLD', exchange: 'FED', actual: '—', forecast: '4.25–4.50%' },
  { id: 'pc-4', dateLabel: 'Jul 08', subLabel: '🇮🇳 AMFI', title: 'Monthly Mutual Fund SIP & Debt Flow Release', ticker: 'PPFAS', exchange: 'AMFI', actual: '—', forecast: '₹26.8K Cr' },
  { id: 'pc-5', dateLabel: 'Jul 14', subLabel: '🇺🇸 TLT', title: 'U.S. 20-Year Treasury Bond ETF Rebalance & Coupon', ticker: 'TLT', exchange: 'US-TSY', actual: '—', forecast: '4.68% YTM' },
  { id: 'pc-6', dateLabel: 'Jul 21', subLabel: '🇮🇳 RBI MPC', title: 'RBI Monetary Policy Committee Liquidity & Repo Decision', ticker: 'HDFCCORP', exchange: 'RBI', actual: '—', forecast: '6.00% Repo' },
];

export const EARNINGS_CALENDAR = POLICY_AND_AUCTION_CALENDAR;

export const ECONOMIC_CALENDAR: CalendarEventItem[] = [
  { id: 'ec1', dateLabel: 'Tomorrow · 12:30', subLabel: '🇮🇳 IN-CPI', title: 'India Consumer Price Inflation YoY (Gilt Catalyst)', actual: '—', forecast: '4.35%', prior: '4.62%' },
  { id: 'ec2', dateLabel: 'Tomorrow · 15:30', subLabel: '🇪🇺 EUR', title: 'Eurozone Core HICP & ECB Sovereign Bond Reinvestment', actual: '—', forecast: '2.20%', prior: '2.30%' },
  { id: 'ec3', dateLabel: 'Tomorrow · 18:00', subLabel: '🇺🇸 US-CPI', title: 'US Core PCE & 10Y Treasury Real Yield Print (Gold Driver)', actual: '—', forecast: '2.50%', prior: '2.60%' },
];

export const SUPERCHART_INSTRUMENTS: SuperchartInstrument[] = [
  {
    symbol: 'GOLDBEES',
    exchange: 'NSE ETF',
    title: 'Nippon India ETF Gold BeES · 1H · Bullion Profile',
    lastPrice: 74.85,
    changePercent: 1.24,
    candles: [
      { time: '10:00', open: 73.1, high: 73.45, low: 72.95, close: 73.38, volume: 42 },
      { time: '11:00', open: 73.38, high: 73.72, low: 73.25, close: 73.64, volume: 58 },
      { time: '12:00', open: 73.64, high: 73.8, low: 73.4, close: 73.52, volume: 49 },
      { time: '13:00', open: 73.52, high: 73.95, low: 73.44, close: 73.88, volume: 56 },
      { time: '14:00', open: 73.88, high: 74.22, low: 73.78, close: 74.12, volume: 74 },
      { time: '15:00', open: 74.12, high: 74.38, low: 73.96, close: 74.28, volume: 63 },
      { time: '16:00', open: 74.28, high: 74.6, low: 74.18, close: 74.52, volume: 65 },
      { time: '17:00', open: 74.52, high: 74.92, low: 74.45, close: 74.85, volume: 82 },
    ],
  },
  {
    symbol: 'PAXGUSDT',
    exchange: 'BINANCE SPOT GOLD',
    title: 'LBMA Physical Spot Gold (1 Fine Troy oz) · Live Feed',
    lastPrice: 3284.5,
    changePercent: 1.18,
    candles: [
      { time: '04:00', open: 3228, high: 3242, low: 3220, close: 3238, volume: 65 },
      { time: '05:00', open: 3238, high: 3251, low: 3232, close: 3247, volume: 72 },
      { time: '06:00', open: 3247, high: 3258, low: 3240, close: 3254, volume: 61 },
      { time: '07:00', open: 3254, high: 3266, low: 3249, close: 3262, volume: 68 },
      { time: '08:00', open: 3262, high: 3275, low: 3256, close: 3271, volume: 79 },
      { time: '09:00', open: 3271, high: 3281, low: 3264, close: 3278, volume: 74 },
      { time: '10:00', open: 3278, high: 3290, low: 3272, close: 3284.5, volume: 85 },
    ],
  },
  {
    symbol: 'NIFTYBEES',
    exchange: 'NSE ETF',
    title: 'Nippon India ETF Nifty 50 BeES · 15m · Index Flow',
    lastPrice: 284.6,
    changePercent: 1.01,
    candles: [
      { time: '09:30', open: 281.4, high: 282.1, low: 281.1, close: 281.9, volume: 51 },
      { time: '10:00', open: 281.9, high: 282.6, low: 281.7, close: 282.4, volume: 64 },
      { time: '10:30', open: 282.4, high: 282.9, low: 282.0, close: 282.2, volume: 47 },
      { time: '11:00', open: 282.2, high: 283.1, low: 282.1, close: 282.95, volume: 52 },
      { time: '11:30', open: 282.95, high: 283.6, low: 282.7, close: 283.45, volume: 72 },
      { time: '12:00', open: 283.45, high: 283.95, low: 283.2, close: 283.8, volume: 58 },
      { time: '12:30', open: 283.8, high: 284.3, low: 283.6, close: 284.15, volume: 69 },
      { time: '13:00', open: 284.15, high: 284.85, low: 284.0, close: 284.6, volume: 79 },
    ],
  },
  {
    symbol: 'AGG',
    exchange: 'NYSEARCA',
    title: 'iShares Core U.S. Aggregate Bond ETF · 4H · Yield Curve',
    lastPrice: 98.75,
    changePercent: 0.28,
    candles: [
      { time: 'Mon', open: 97.95, high: 98.18, low: 97.85, close: 98.1, volume: 48 },
      { time: 'Tue', open: 98.1, high: 98.34, low: 98.02, close: 98.26, volume: 54 },
      { time: 'Wed', open: 98.26, high: 98.48, low: 98.18, close: 98.42, volume: 62 },
      { time: 'Thu', open: 98.42, high: 98.62, low: 98.35, close: 98.58, volume: 57 },
      { time: 'Fri', open: 98.58, high: 98.82, low: 98.49, close: 98.75, volume: 69 },
    ],
  },
];

export const GLOBAL_INFLATION_COUNTRIES = [
  { id: 'US', name: 'United States', rate: 2.6, fill: '#FDBA74', d: 'M 110,95 L 220,95 L 210,145 L 125,145 Z' },
  { id: 'CA', name: 'Canada', rate: 2.1, fill: '#FED7AA', d: 'M 95,45 L 225,40 L 215,92 L 108,92 Z' },
  { id: 'BR', name: 'Brazil', rate: 4.8, fill: '#FB923C', d: 'M 215,195 L 278,195 L 268,265 L 222,255 Z' },
  { id: 'AR', name: 'Argentina', rate: 24.5, fill: '#EA580C', d: 'M 218,258 L 252,258 L 240,322 L 214,312 Z' },
  { id: 'UK', name: 'United Kingdom', rate: 2.5, fill: '#FDBA74', d: 'M 380,82 L 398,82 L 396,105 L 378,105 Z' },
  { id: 'EU', name: 'Eurozone', rate: 2.3, fill: '#FED7AA', d: 'M 402,88 L 455,82 L 458,125 L 400,125 Z' },
  { id: 'TR', name: 'Turkey', rate: 22.8, fill: '#C2410C', d: 'M 465,126 L 512,126 L 510,142 L 465,142 Z' },
  { id: 'IN', name: 'India', rate: 4.4, fill: '#F97316', d: 'M 548,142 L 592,142 L 578,205 L 555,198 Z' },
  { id: 'CN', name: 'China', rate: 0.7, fill: '#FFEDD5', d: 'M 580,98 L 665,98 L 658,158 L 585,152 Z' },
  { id: 'JP', name: 'Japan', rate: 2.4, fill: '#FDBA74', d: 'M 678,105 L 698,105 L 692,142 L 674,140 Z' },
  { id: 'AU', name: 'Australia', rate: 3.1, fill: '#FDBA74', d: 'M 632,235 L 705,235 L 700,285 L 635,280 Z' },
  { id: 'ZA', name: 'South Africa', rate: 4.4, fill: '#FB923C', d: 'M 435,245 L 478,245 L 472,282 L 438,280 Z' },
];

export const MUTUAL_FUND_AND_ETF_IDEAS = [
  ...COMMUNITY_IDEAS.filter((c) => c.category === 'mutual_funds' || c.category === 'editors'),
];
export const GOLD_TRADE_IDEAS = COMMUNITY_IDEAS.filter((c) => c.category === 'gold' || c.category === 'debt');
export const DEBT_TRADE_IDEAS = COMMUNITY_IDEAS.filter((c) => c.category === 'debt');
export const INDIAN_TRADE_IDEAS = MUTUAL_FUND_AND_ETF_IDEAS;
export const FUTURES_TRADE_IDEAS = GOLD_TRADE_IDEAS;
export const FOREX_TRADE_IDEAS = COMMUNITY_IDEAS;

const rawSearchRows: MarketSymbolRow[] = [
  ...MUTUAL_FUND_LEADERS,
  ...GOLD_BULLION_ASSETS,
  ...DEBT_FUND_LEADERS,
  ...GLOBAL_ETFS_LIST,
  ...MAJOR_INDICES,
  ...MACRO_SPARK_ROWS,
];

const seenSearchKeys = new Set<string>();
export const ALL_SEARCHABLE_SYMBOLS: MarketSymbolRow[] = rawSearchRows.filter((row) => {
  const key = `${row.category}:${row.symbol}`;
  if (seenSearchKeys.has(key)) return false;
  seenSearchKeys.add(key);
  return true;
});
