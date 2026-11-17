export interface IndexChartPoint {
  label: string;
  value: number;
}

export interface MarketIndexData {
  id: 'NIFTY50' | 'SENSEX' | 'BANKNIFTY' | 'NIFTYIT';
  name: string;
  value: number;
  change: number;
  changePct: number;
  asOf: string;
  open: number;
  dayLow: number;
  dayHigh: number;
  high52W: number;
  pe: number;
  seriesByRange: Record<'1D' | '1W' | '1M' | '1Y' | '5Y', IndexChartPoint[]>;
}

export interface TickerRibbonItem {
  symbol: string;
  price: string;
  changePct: number;
  targetTicker?: string;
}

export interface ScreenerFilterParam {
  id: string;
  label: string;
  predicate: (s: EquityAsset) => boolean;
}

export interface ScorecardTile {
  label: string;
  status: 'High' | 'Good' | 'Avg' | 'Low';
  tone: 'emerald' | 'amber' | 'neutral';
}

export interface ChecklistItem {
  passed: boolean;
  text: string;
  metric: string;
}

export interface ForecastSeries {
  dates: string[];
  actual: (number | null)[];
  high: (number | null)[];
  median: (number | null)[];
  low: (number | null)[];
  unit: string;
}

export interface EquityAsset {
  symbol: string;
  shortCode: string;
  name: string;
  exchange: 'NSE' | 'NASDAQ';
  sector: string;
  currency: '₹' | '$';
  price: number;
  changePct: number;
  mktCapCr: number;
  mktCapDisplay: string;
  pe: number;
  roce: number;
  debtToEquity: number;
  promoterHolding: number;
  return1Y: number;
  dividendYield: number;
  near52WLow: boolean;
  moverBadge?: 'TOP GAINER' | 'TOP LOSER' | '52W HIGH';
  scorecard: ScorecardTile[];
  checklist: ChecklistItem[];
  analystCount: number;
  consensus: 'Buy' | 'Hold' | 'Sell';
  buyPct: number;
  holdPct: number;
  sellPct: number;
  targetHigh: string;
  targetMedian: string;
  targetLow: string;
  upsidePct: string;
  forecasts: Record<'Price' | 'Revenue' | 'EPS', ForecastSeries>;
  peerSymbols: string[];
}

export interface MutualFundAsset {
  symbol: string;
  shortCode: string;
  name: string;
  category: string;
  aumCr: number;
  aumDisplay: string;
  expenseRatio: number;
  cagr3Y: number;
  sharpe: number;
  risk: 'Moderate' | 'High' | 'Very High';
  return1Y: number;
}

export interface PortfolioSnapshot {
  id: 'primary' | 'growth' | 'income';
  label: string;
  totalNetWorth: number;
  totalGain: number;
  totalGainPct: number;
  xirr: number;
  assetCount: number;
  diversificationScore: number;
  diversificationNote: string;
  allocation: { label: string; pct: number; color: string }[];
  redFlags: { title: string; detail: string }[];
  transactions: { title: string; meta: string; amount: string; positive: boolean }[];
  aiDefaultQuestion: string;
  aiDefaultAnswer: string;
  bankingWeightPct: number;
  trimSuggestion: string;
}

export interface StockDealRow {
  date: string;
  stock: string;
  symbol: string;
  investor: string;
  action: 'Buy' | 'Sell';
  qty: string;
  value: string;
  window: '7d' | '30d';
}

export const HERO_POPULAR_TICKERS = [
  'RELIANCE',
  'HDFCBANK',
  'TCS',
  'Parag Parikh Flexi Cap',
  'NVDA',
];

export const MARKET_RIBBON_ITEMS: TickerRibbonItem[] = [
  { symbol: 'NIFTY 50', price: '24,812.35', changePct: 0.62, targetTicker: 'HDFCBANK' },
  { symbol: 'SENSEX', price: '81,456.10', changePct: 0.58, targetTicker: 'RELIANCE' },
  { symbol: 'BANK NIFTY', price: '53,214.80', changePct: -0.21, targetTicker: 'HDFCBANK' },
  { symbol: 'INDIA VIX', price: '13.42', changePct: -3.10, targetTicker: 'INFY' },
  { symbol: 'RELIANCE', price: '2,948.60', changePct: 1.24, targetTicker: 'RELIANCE' },
  { symbol: 'TCS', price: '4,163.00', changePct: 0.47, targetTicker: 'TCS' },
  { symbol: 'INFY', price: '1,872.25', changePct: -0.66, targetTicker: 'INFY' },
];

export const MARKET_INDICES: MarketIndexData[] = [
  {
    id: 'NIFTY50',
    name: 'NIFTY 50',
    value: 24812.35,
    change: 153.4,
    changePct: 0.62,
    asOf: 'As of 15:30 IST · NSE',
    open: 24701.1,
    dayLow: 24688,
    dayHigh: 24846,
    high52W: 26277.35,
    pe: 22.4,
    seriesByRange: {
      '1D': [
        { label: '09:15', value: 24701 },
        { label: '10:00', value: 24725 },
        { label: '11:00', value: 24698 },
        { label: '12:00', value: 24748 },
        { label: '13:00', value: 24772 },
        { label: '14:00', value: 24760 },
        { label: '15:00', value: 24795 },
        { label: '15:30', value: 24812.35 },
      ],
      '1W': [
        { label: 'Mon', value: 24410 },
        { label: 'Tue', value: 24520 },
        { label: 'Wed', value: 24485 },
        { label: 'Thu', value: 24658 },
        { label: 'Fri', value: 24812.35 },
      ],
      '1M': [
        { label: '20 Oct', value: 24485 },
        { label: '23 Oct', value: 24455 },
        { label: '27 Oct', value: 24360 },
        { label: '30 Oct', value: 24415 },
        { label: '03 Nov', value: 24395 },
        { label: '06 Nov', value: 24542 },
        { label: '10 Nov', value: 24670 },
        { label: '14 Nov', value: 24812.35 },
      ],
      '1Y': [
        { label: 'Dec', value: 21450 },
        { label: 'Feb', value: 22120 },
        { label: 'Apr', value: 22580 },
        { label: 'Jun', value: 23790 },
        { label: 'Aug', value: 24940 },
        { label: 'Oct', value: 24410 },
        { label: 'Nov', value: 24812.35 },
      ],
      '5Y': [
        { label: '2021', value: 14630 },
        { label: '2022', value: 17350 },
        { label: '2023', value: 19680 },
        { label: '2024', value: 23890 },
        { label: '2025', value: 24812.35 },
      ],
    },
  },
  {
    id: 'SENSEX',
    name: 'SENSEX',
    value: 81456.1,
    change: 468.2,
    changePct: 0.58,
    asOf: 'As of 15:30 IST · BSE',
    open: 81040.5,
    dayLow: 80992,
    dayHigh: 81580,
    high52W: 85978.25,
    pe: 23.1,
    seriesByRange: {
      '1D': [
        { label: '09:15', value: 81040 },
        { label: '10:30', value: 81120 },
        { label: '12:00', value: 81085 },
        { label: '13:30', value: 81290 },
        { label: '15:00', value: 81410 },
        { label: '15:30', value: 81456.1 },
      ],
      '1W': [
        { label: 'Mon', value: 80210 },
        { label: 'Tue', value: 80540 },
        { label: 'Wed', value: 80490 },
        { label: 'Thu', value: 80988 },
        { label: 'Fri', value: 81456.1 },
      ],
      '1M': [
        { label: '20 Oct', value: 80320 },
        { label: '27 Oct', value: 79980 },
        { label: '03 Nov', value: 80180 },
        { label: '10 Nov', value: 80890 },
        { label: '14 Nov', value: 81456.1 },
      ],
      '1Y': [
        { label: 'Dec', value: 70900 },
        { label: 'Mar', value: 73650 },
        { label: 'Jun', value: 78120 },
        { label: 'Sep', value: 83400 },
        { label: 'Nov', value: 81456.1 },
      ],
      '5Y': [
        { label: '2021', value: 49200 },
        { label: '2022', value: 57900 },
        { label: '2023', value: 65300 },
        { label: '2024', value: 77800 },
        { label: '2025', value: 81456.1 },
      ],
    },
  },
  {
    id: 'BANKNIFTY',
    name: 'BANK NIFTY',
    value: 53214.8,
    change: -112.4,
    changePct: -0.21,
    asOf: 'As of 15:30 IST · NSE',
    open: 53340.0,
    dayLow: 52980,
    dayHigh: 53420,
    high52W: 54467.35,
    pe: 15.8,
    seriesByRange: {
      '1D': [
        { label: '09:15', value: 53340 },
        { label: '10:30', value: 53280 },
        { label: '12:00', value: 53110 },
        { label: '13:30', value: 53045 },
        { label: '15:00', value: 53190 },
        { label: '15:30', value: 53214.8 },
      ],
      '1W': [
        { label: 'Mon', value: 53510 },
        { label: 'Tue', value: 53420 },
        { label: 'Wed', value: 53180 },
        { label: 'Thu', value: 53327 },
        { label: 'Fri', value: 53214.8 },
      ],
      '1M': [
        { label: '20 Oct', value: 52890 },
        { label: '27 Oct', value: 52640 },
        { label: '03 Nov', value: 53010 },
        { label: '10 Nov', value: 53390 },
        { label: '14 Nov', value: 53214.8 },
      ],
      '1Y': [
        { label: 'Dec', value: 47200 },
        { label: 'Mar', value: 48150 },
        { label: 'Jun', value: 51400 },
        { label: 'Sep', value: 53820 },
        { label: 'Nov', value: 53214.8 },
      ],
      '5Y': [
        { label: '2021', value: 33100 },
        { label: '2022', value: 38900 },
        { label: '2023', value: 44120 },
        { label: '2024', value: 51200 },
        { label: '2025', value: 53214.8 },
      ],
    },
  },
  {
    id: 'NIFTYIT',
    name: 'NIFTY IT',
    value: 42918.6,
    change: 312.5,
    changePct: 0.73,
    asOf: 'As of 15:30 IST · NSE',
    open: 42610.0,
    dayLow: 42540,
    dayHigh: 43012,
    high52W: 44610.8,
    pe: 31.2,
    seriesByRange: {
      '1D': [
        { label: '09:15', value: 42610 },
        { label: '10:30', value: 42695 },
        { label: '12:00', value: 42780 },
        { label: '13:30', value: 42840 },
        { label: '15:00', value: 42890 },
        { label: '15:30', value: 42918.6 },
      ],
      '1W': [
        { label: 'Mon', value: 42110 },
        { label: 'Tue', value: 42350 },
        { label: 'Wed', value: 42490 },
        { label: 'Thu', value: 42606 },
        { label: 'Fri', value: 42918.6 },
      ],
      '1M': [
        { label: '20 Oct', value: 41680 },
        { label: '27 Oct', value: 41950 },
        { label: '03 Nov', value: 42210 },
        { label: '10 Nov', value: 42615 },
        { label: '14 Nov', value: 42918.6 },
      ],
      '1Y': [
        { label: 'Dec', value: 34800 },
        { label: 'Mar', value: 36900 },
        { label: 'Jun', value: 38400 },
        { label: 'Sep', value: 41920 },
        { label: 'Nov', value: 42918.6 },
      ],
      '5Y': [
        { label: '2021', value: 26200 },
        { label: '2022', value: 29400 },
        { label: '2023', value: 32500 },
        { label: '2024', value: 39100 },
        { label: '2025', value: 42918.6 },
      ],
    },
  },
];

export const MARKET_MOOD_METRICS = [
  { label: 'India VIX', value: '13.42', tag: 'Low', tone: 'emerald' as const },
  { label: 'Momentum', value: 'Positive', tag: '', tone: 'emerald' as const },
  { label: 'FII activity', value: '+₹2,140 Cr', tag: '', tone: 'emerald' as const },
  { label: 'Market breadth', value: '1.38 A/D', tag: '', tone: 'neutral' as const },
  { label: 'Price strength', value: 'Neutral', tag: '', tone: 'neutral' as const },
  { label: 'Gold demand', value: 'Rising', tag: '', tone: 'amber' as const },
];

export const SCREENER_FILTER_PARAMS: ScreenerFilterParam[] = [
  { id: 'pe_lt_25', label: 'PE ratio < 25', predicate: (s) => s.pe < 25 },
  { id: 'roce_gt_18', label: 'ROCE > 18%', predicate: (s) => s.roce > 18 },
  { id: 'de_lt_05', label: 'Debt / Equity < 0.5', predicate: (s) => s.debtToEquity < 0.5 },
  { id: 'promoter_gt_50', label: 'Promoter holding > 50%', predicate: (s) => s.promoterHolding >= 50 },
  { id: 'mktcap_gt_5k', label: 'Mkt cap > ₹5,000 Cr', predicate: (s) => s.mktCapCr > 5000 },
  { id: 'div_gt_2', label: 'Dividend yield > 2%', predicate: (s) => s.dividendYield > 2 },
  { id: 'ret1y_gt_25', label: '1Y Return > 25%', predicate: (s) => s.return1Y > 25 },
  { id: 'near_52w_low', label: 'Near 52W Low', predicate: (s) => s.near52WLow },
];

export const PREBUILT_SCREENS: {
  id: string;
  label: string;
  filters: string[];
}[] = [
  {
    id: 'growth_bargains',
    label: 'Growth Bargains',
    filters: ['pe_lt_25', 'roce_gt_18', 'de_lt_05', 'promoter_gt_50', 'mktcap_gt_5k'],
  },
  {
    id: 'high_dividend',
    label: 'High Dividend Yield',
    filters: ['pe_lt_25', 'roce_gt_18', 'div_gt_2'],
  },
  {
    id: 'debt_free',
    label: 'Debt-free Compounders',
    filters: ['roce_gt_18', 'de_lt_05', 'mktcap_gt_5k'],
  },
  {
    id: 'momentum',
    label: 'Momentum Leaders',
    filters: ['roce_gt_18', 'ret1y_gt_25', 'mktcap_gt_5k'],
  },
  {
    id: 'near_low',
    label: 'Near 52W Low',
    filters: ['near_52w_low', 'mktcap_gt_5k'],
  },
];

function makeForecastSeries(
  base: number,
  highMult: number,
  medMult: number,
  lowMult: number,
  unit: string
): ForecastSeries {
  const dates = ['Nov 23', 'Feb 24', 'May 24', 'Aug 24', 'Nov 24', 'Feb 25', 'May 25', 'Aug 25', 'Nov 25'];
  const actual = [
    Number((base * 0.88).toFixed(1)),
    Number((base * 0.91).toFixed(1)),
    Number((base * 0.94).toFixed(1)),
    Number((base * 0.97).toFixed(1)),
    Number(base.toFixed(1)),
    null,
    null,
    null,
    null,
  ];
  const high = [
    null,
    null,
    null,
    null,
    Number(base.toFixed(1)),
    Number((base * (1 + (highMult - 1) * 0.35)).toFixed(1)),
    Number((base * (1 + (highMult - 1) * 0.62)).toFixed(1)),
    Number((base * (1 + (highMult - 1) * 0.84)).toFixed(1)),
    Number((base * highMult).toFixed(1)),
  ];
  const median = [
    null,
    null,
    null,
    null,
    Number(base.toFixed(1)),
    Number((base * (1 + (medMult - 1) * 0.35)).toFixed(1)),
    Number((base * (1 + (medMult - 1) * 0.62)).toFixed(1)),
    Number((base * (1 + (medMult - 1) * 0.84)).toFixed(1)),
    Number((base * medMult).toFixed(1)),
  ];
  const low = [
    null,
    null,
    null,
    null,
    Number(base.toFixed(1)),
    Number((base * (1 + (lowMult - 1) * 0.35)).toFixed(1)),
    Number((base * (1 + (lowMult - 1) * 0.62)).toFixed(1)),
    Number((base * (1 + (lowMult - 1) * 0.84)).toFixed(1)),
    Number((base * lowMult).toFixed(1)),
  ];
  return { dates, actual, high, median, low, unit };
}

export const EQUITY_UNIVERSE: EquityAsset[] = [
  {
    symbol: 'HDFCBANK',
    shortCode: 'HDB',
    name: 'HDFC Bank Ltd',
    exchange: 'NSE',
    sector: 'Private Banks',
    currency: '₹',
    price: 1742.9,
    changePct: 0.84,
    mktCapCr: 1326450,
    mktCapDisplay: '₹13,26,450 Cr',
    pe: 19.4,
    roce: 17.8,
    debtToEquity: 0.42,
    promoterHolding: 0.0,
    return1Y: 16.2,
    dividendYield: 1.15,
    near52WLow: false,
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Avg', tone: 'amber' },
      { label: 'Growth', status: 'High', tone: 'emerald' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'Intrinsic value — trading below fair value', metric: '−8%' },
      { passed: true, text: 'ROE consistently above 15% (5Y)', metric: '16.9%' },
      { passed: true, text: 'No promoter pledging', metric: '0%' },
      { passed: false, text: 'Outperformed sector over 1Y', metric: '−3.2%' },
    ],
    analystCount: 42,
    consensus: 'Buy',
    buyPct: 78,
    holdPct: 17,
    sellPct: 5,
    targetHigh: '₹2,250',
    targetMedian: '₹1,985',
    targetLow: '₹1,560',
    upsidePct: '+13.9%',
    forecasts: {
      Price: makeForecastSeries(1743, 1.29, 1.14, 0.895, '₹'),
      Revenue: makeForecastSeries(148.4, 1.24, 1.16, 1.07, '₹k Cr'),
      EPS: makeForecastSeries(89.8, 1.28, 1.17, 1.05, '₹'),
    },
    peerSymbols: ['HDFCBANK', 'RELIANCE', 'TCS', 'INFY'],
  },
  {
    symbol: 'COALINDIA',
    shortCode: 'COA',
    name: 'Coal India',
    exchange: 'NSE',
    sector: 'Metals & Mining',
    currency: '₹',
    price: 416.8,
    changePct: 1.45,
    mktCapCr: 256410,
    mktCapDisplay: '₹2,56,410 Cr',
    pe: 7.8,
    roce: 61.2,
    debtToEquity: 0.08,
    promoterHolding: 63.1,
    return1Y: 42.6,
    dividendYield: 6.1,
    near52WLow: false,
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Good', tone: 'emerald' },
      { label: 'Growth', status: 'Avg', tone: 'amber' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'Intrinsic value — trading below fair value', metric: '−21%' },
      { passed: true, text: 'ROCE above 25% across 5Y cycle', metric: '61.2%' },
      { passed: true, text: 'No promoter pledging', metric: '0%' },
      { passed: true, text: 'Outperformed sector over 1Y', metric: '+14.8%' },
    ],
    analystCount: 28,
    consensus: 'Buy',
    buyPct: 75,
    holdPct: 18,
    sellPct: 7,
    targetHigh: '₹520',
    targetMedian: '₹478',
    targetLow: '₹390',
    upsidePct: '+14.7%',
    forecasts: {
      Price: makeForecastSeries(416.8, 1.25, 1.15, 0.94, '₹'),
      Revenue: makeForecastSeries(142.3, 1.16, 1.09, 1.01, '₹k Cr'),
      EPS: makeForecastSeries(53.4, 1.21, 1.12, 0.98, '₹'),
    },
    peerSymbols: ['COALINDIA', 'HAL', 'PETRONET', 'ITC'],
  },
  {
    symbol: 'ITC',
    shortCode: 'ITC',
    name: 'ITC',
    exchange: 'NSE',
    sector: 'FMCG & Consumer',
    currency: '₹',
    price: 478.25,
    changePct: 0.65,
    mktCapCr: 602180,
    mktCapDisplay: '₹6,02,180 Cr',
    pe: 24.6,
    roce: 37.4,
    debtToEquity: 0.0,
    promoterHolding: 0.0,
    return1Y: 12.4,
    dividendYield: 2.85,
    near52WLow: false,
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Avg', tone: 'amber' },
      { label: 'Growth', status: 'Avg', tone: 'amber' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'Zero balance-sheet debt', metric: '0.00x' },
      { passed: true, text: 'ROCE consistently above 30% (5Y)', metric: '37.4%' },
      { passed: true, text: 'Dividend payout stability', metric: '2.85%' },
      { passed: true, text: 'Outperformed FMCG index over 1Y', metric: '+4.6%' },
    ],
    analystCount: 38,
    consensus: 'Buy',
    buyPct: 82,
    holdPct: 13,
    sellPct: 5,
    targetHigh: '₹575',
    targetMedian: '₹536',
    targetLow: '₹455',
    upsidePct: '+12.1%',
    forecasts: {
      Price: makeForecastSeries(478.3, 1.2, 1.12, 0.95, '₹'),
      Revenue: makeForecastSeries(74.8, 1.19, 1.12, 1.05, '₹k Cr'),
      EPS: makeForecastSeries(19.4, 1.22, 1.13, 1.04, '₹'),
    },
    peerSymbols: ['ITC', 'CASTROLIND', 'COALINDIA', 'RELIANCE'],
  },
  {
    symbol: 'HCLTECH',
    shortCode: 'HCL',
    name: 'HCL Technologies',
    exchange: 'NSE',
    sector: 'IT Services',
    currency: '₹',
    price: 1842.4,
    changePct: 1.12,
    mktCapCr: 496720,
    mktCapDisplay: '₹4,96,720 Cr',
    pe: 24.1,
    roce: 29.8,
    debtToEquity: 0.08,
    promoterHolding: 60.8,
    return1Y: 38.9,
    dividendYield: 2.9,
    near52WLow: false,
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Avg', tone: 'amber' },
      { label: 'Growth', status: 'High', tone: 'emerald' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'ROE above 22% with low leverage', metric: '24.6%' },
      { passed: true, text: 'No promoter pledging', metric: '0%' },
      { passed: true, text: 'Consistent quarterly dividend payout', metric: '2.9%' },
      { passed: true, text: 'Outperformed NIFTY IT over 1Y', metric: '+9.4%' },
    ],
    analystCount: 41,
    consensus: 'Buy',
    buyPct: 71,
    holdPct: 22,
    sellPct: 7,
    targetHigh: '₹2,210',
    targetMedian: '₹2,040',
    targetLow: '₹1,680',
    upsidePct: '+10.7%',
    forecasts: {
      Price: makeForecastSeries(1842, 1.2, 1.11, 0.91, '₹'),
      Revenue: makeForecastSeries(116.2, 1.18, 1.11, 1.04, '₹k Cr'),
      EPS: makeForecastSeries(63.5, 1.21, 1.13, 1.03, '₹'),
    },
    peerSymbols: ['HCLTECH', 'TCS', 'INFY', 'BHARTIARTL'],
  },
  {
    symbol: 'HAL',
    shortCode: 'HAL',
    name: 'Hindustan Aeronautics',
    exchange: 'NSE',
    sector: 'Aerospace & Defence',
    currency: '₹',
    price: 4465.0,
    changePct: 2.15,
    mktCapCr: 298340,
    mktCapDisplay: '₹2,98,340 Cr',
    pe: 22.9,
    roce: 33.5,
    debtToEquity: 0.0,
    promoterHolding: 71.6,
    return1Y: 71.2,
    dividendYield: 0.85,
    near52WLow: false,
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Avg', tone: 'amber' },
      { label: 'Growth', status: 'High', tone: 'emerald' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Avg', tone: 'amber' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'Order book visibility > 3.5x FY revenue', metric: '₹94,000 Cr' },
      { passed: true, text: 'Debt-free sovereign balance sheet', metric: '0.00x' },
      { passed: true, text: 'No promoter pledging', metric: '0%' },
      { passed: true, text: 'Outperformed sector over 1Y', metric: '+38.4%' },
    ],
    analystCount: 22,
    consensus: 'Buy',
    buyPct: 86,
    holdPct: 9,
    sellPct: 5,
    targetHigh: '₹5,450',
    targetMedian: '₹5,080',
    targetLow: '₹4,150',
    upsidePct: '+13.8%',
    forecasts: {
      Price: makeForecastSeries(4465, 1.22, 1.14, 0.93, '₹'),
      Revenue: makeForecastSeries(31.8, 1.29, 1.18, 1.09, '₹k Cr'),
      EPS: makeForecastSeries(128.4, 1.27, 1.17, 1.06, '₹'),
    },
    peerSymbols: ['HAL', 'ADANIPORTS', 'COALINDIA', 'PETRONET'],
  },
  {
    symbol: 'PETRONET',
    shortCode: 'PET',
    name: 'Petronet LNG',
    exchange: 'NSE',
    sector: 'Oil & Gas Utilities',
    currency: '₹',
    price: 332.5,
    changePct: 0.92,
    mktCapCr: 49875,
    mktCapDisplay: '₹49,875 Cr',
    pe: 12.4,
    roce: 24.6,
    debtToEquity: 0.21,
    promoterHolding: 50.0,
    return1Y: 64.3,
    dividendYield: 3.1,
    near52WLow: false,
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Good', tone: 'emerald' },
      { label: 'Growth', status: 'Avg', tone: 'amber' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'Trading below 5Y median EV/EBITDA', metric: '−14%' },
      { passed: true, text: 'ROCE above 22% consistently', metric: '24.6%' },
      { passed: true, text: 'No promoter pledging', metric: '0%' },
      { passed: true, text: 'Outperformed Nifty Energy over 1Y', metric: '+29.1%' },
    ],
    analystCount: 29,
    consensus: 'Buy',
    buyPct: 72,
    holdPct: 18,
    sellPct: 10,
    targetHigh: '₹410',
    targetMedian: '₹376',
    targetLow: '₹295',
    upsidePct: '+13.1%',
    forecasts: {
      Price: makeForecastSeries(332.5, 1.23, 1.13, 0.89, '₹'),
      Revenue: makeForecastSeries(52.4, 1.15, 1.09, 1.01, '₹k Cr'),
      EPS: makeForecastSeries(26.8, 1.19, 1.11, 0.98, '₹'),
    },
    peerSymbols: ['PETRONET', 'COALINDIA', 'CASTROLIND', 'RELIANCE'],
  },
  {
    symbol: 'CASTROLIND',
    shortCode: 'CAS',
    name: 'Castrol India',
    exchange: 'NSE',
    sector: 'Specialty Lubricants',
    currency: '₹',
    price: 206.4,
    changePct: -0.35,
    mktCapCr: 20410,
    mktCapDisplay: '₹20,410 Cr',
    pe: 21.7,
    roce: 56.2,
    debtToEquity: 0.04,
    promoterHolding: 51.0,
    return1Y: 28.1,
    dividendYield: 3.65,
    near52WLow: true,
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Good', tone: 'emerald' },
      { label: 'Growth', status: 'Avg', tone: 'amber' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'ROCE among top 5% of NSE 500', metric: '56.2%' },
      { passed: true, text: 'Near-zero debt profile', metric: '0.04x' },
      { passed: true, text: 'No promoter pledging', metric: '0%' },
      { passed: true, text: 'Dividend yield > 3.5%', metric: '3.65%' },
    ],
    analystCount: 16,
    consensus: 'Buy',
    buyPct: 69,
    holdPct: 25,
    sellPct: 6,
    targetHigh: '₹255',
    targetMedian: '₹236',
    targetLow: '₹190',
    upsidePct: '+14.3%',
    forecasts: {
      Price: makeForecastSeries(206.4, 1.24, 1.14, 0.92, '₹'),
      Revenue: makeForecastSeries(5.4, 1.14, 1.09, 1.02, '₹k Cr'),
      EPS: makeForecastSeries(9.5, 1.18, 1.11, 1.01, '₹'),
    },
    peerSymbols: ['CASTROLIND', 'PETRONET', 'ITC', 'COALINDIA'],
  },
  {
    symbol: 'RELIANCE',
    shortCode: 'RIL',
    name: 'Reliance Industries',
    exchange: 'NSE',
    sector: 'Energy & Telecom',
    currency: '₹',
    price: 2948.6,
    changePct: 1.24,
    mktCapCr: 1994200,
    mktCapDisplay: '₹19,94,200 Cr',
    pe: 27.4,
    roce: 11.8,
    debtToEquity: 0.41,
    promoterHolding: 50.3,
    return1Y: 22.8,
    dividendYield: 0.35,
    near52WLow: false,
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Avg', tone: 'amber' },
      { label: 'Growth', status: 'High', tone: 'emerald' },
      { label: 'Profitability', status: 'Good', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'Jio & Retail EBITDA mix above 54%', metric: '54.8%' },
      { passed: true, text: 'No promoter pledging', metric: '0%' },
      { passed: true, text: 'Free cash flow inflection as 5G capex peaks', metric: '+₹18k Cr' },
      { passed: true, text: 'Outperformed NIFTY 50 over 1Y', metric: '+3.1%' },
    ],
    analystCount: 39,
    consensus: 'Buy',
    buyPct: 80,
    holdPct: 15,
    sellPct: 5,
    targetHigh: '₹3,620',
    targetMedian: '₹3,340',
    targetLow: '₹2,710',
    upsidePct: '+13.3%',
    forecasts: {
      Price: makeForecastSeries(2948.6, 1.23, 1.13, 0.92, '₹'),
      Revenue: makeForecastSeries(942.0, 1.18, 1.12, 1.04, '₹k Cr'),
      EPS: makeForecastSeries(107.6, 1.24, 1.15, 1.03, '₹'),
    },
    peerSymbols: ['RELIANCE', 'BHARTIARTL', 'TCS', 'HDFCBANK'],
  },
  {
    symbol: 'TCS',
    shortCode: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    sector: 'IT Services',
    currency: '₹',
    price: 4163.0,
    changePct: 0.47,
    mktCapCr: 1506400,
    mktCapDisplay: '₹15,06,400 Cr',
    pe: 30.8,
    roce: 64.5,
    debtToEquity: 0.09,
    promoterHolding: 71.8,
    return1Y: 19.6,
    dividendYield: 1.75,
    near52WLow: false,
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Avg', tone: 'amber' },
      { label: 'Growth', status: 'Avg', tone: 'amber' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'ROCE above 50% across full 10Y cycle', metric: '64.5%' },
      { passed: true, text: 'Order TCV pipeline remains resilient', metric: '$8.6B' },
      { passed: true, text: 'No promoter pledging', metric: '0%' },
      { passed: true, text: 'Operating margin in 24–25% band', metric: '24.6%' },
    ],
    analystCount: 44,
    consensus: 'Buy',
    buyPct: 68,
    holdPct: 23,
    sellPct: 9,
    targetHigh: '₹4,890',
    targetMedian: '₹4,560',
    targetLow: '₹3,820',
    upsidePct: '+9.5%',
    forecasts: {
      Price: makeForecastSeries(4163, 1.17, 1.1, 0.92, '₹'),
      Revenue: makeForecastSeries(254.0, 1.14, 1.09, 1.03, '₹k Cr'),
      EPS: makeForecastSeries(135.1, 1.18, 1.11, 1.02, '₹'),
    },
    peerSymbols: ['TCS', 'INFY', 'HCLTECH', 'HDFCBANK'],
  },
  {
    symbol: 'ADANIPORTS',
    shortCode: 'ADP',
    name: 'Adani Ports',
    exchange: 'NSE',
    sector: 'Ports & Logistics',
    currency: '₹',
    price: 1412.3,
    changePct: 4.82,
    mktCapCr: 305100,
    mktCapDisplay: '₹3,05,100 Cr',
    pe: 28.4,
    roce: 15.2,
    debtToEquity: 0.88,
    promoterHolding: 65.9,
    return1Y: 58.4,
    dividendYield: 0.42,
    near52WLow: false,
    moverBadge: 'TOP GAINER',
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Avg', tone: 'amber' },
      { label: 'Growth', status: 'High', tone: 'emerald' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Avg', tone: 'amber' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'Cargo volume growth > 2x national port avg', metric: '+21% YoY' },
      { passed: true, text: 'Net debt / EBITDA trending below 2.3x', metric: '2.2x' },
      { passed: true, text: 'EBITDA margin consistently > 58%', metric: '59.4%' },
      { passed: true, text: 'Outperformed NIFTY 50 over 1Y', metric: '+39.1%' },
    ],
    analystCount: 24,
    consensus: 'Buy',
    buyPct: 88,
    holdPct: 8,
    sellPct: 4,
    targetHigh: '₹1,760',
    targetMedian: '₹1,620',
    targetLow: '₹1,320',
    upsidePct: '+14.7%',
    forecasts: {
      Price: makeForecastSeries(1412.3, 1.25, 1.15, 0.93, '₹'),
      Revenue: makeForecastSeries(29.8, 1.24, 1.16, 1.07, '₹k Cr'),
      EPS: makeForecastSeries(49.7, 1.28, 1.18, 1.06, '₹'),
    },
    peerSymbols: ['ADANIPORTS', 'HAL', 'RELIANCE', 'BHARTIARTL'],
  },
  {
    symbol: 'BAJFINANCE',
    shortCode: 'BAF',
    name: 'Bajaj Finance',
    exchange: 'NSE',
    sector: 'NBFC & Consumer Finance',
    currency: '₹',
    price: 7086.45,
    changePct: 3.1,
    mktCapCr: 438900,
    mktCapDisplay: '₹4,38,900 Cr',
    pe: 28.9,
    roce: 13.4,
    debtToEquity: 3.1,
    promoterHolding: 54.7,
    return1Y: 4.2,
    dividendYield: 0.51,
    near52WLow: true,
    moverBadge: 'TOP GAINER',
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Good', tone: 'emerald' },
      { label: 'Growth', status: 'High', tone: 'emerald' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'AUM compounding > 25% YoY', metric: '+29%' },
      { passed: true, text: 'ROE consistently > 20%', metric: '21.8%' },
      { passed: true, text: 'Trading below 5Y average P/B multiple', metric: '−16%' },
      { passed: true, text: 'No promoter pledging', metric: '0%' },
    ],
    analystCount: 36,
    consensus: 'Buy',
    buyPct: 81,
    holdPct: 14,
    sellPct: 5,
    targetHigh: '₹8,650',
    targetMedian: '₹7,980',
    targetLow: '₹6,700',
    upsidePct: '+12.6%',
    forecasts: {
      Price: makeForecastSeries(7086.4, 1.22, 1.13, 0.95, '₹'),
      Revenue: makeForecastSeries(61.2, 1.27, 1.2, 1.11, '₹k Cr'),
      EPS: makeForecastSeries(245.2, 1.25, 1.17, 1.07, '₹'),
    },
    peerSymbols: ['BAJFINANCE', 'HDFCBANK', 'RELIANCE', 'BHARTIARTL'],
  },
  {
    symbol: 'INFY',
    shortCode: 'INF',
    name: 'Infosys',
    exchange: 'NSE',
    sector: 'IT Services',
    currency: '₹',
    price: 1872.25,
    changePct: -0.66,
    mktCapCr: 777400,
    mktCapDisplay: '₹7,77,400 Cr',
    pe: 28.4,
    roce: 40.2,
    debtToEquity: 0.08,
    promoterHolding: 14.4,
    return1Y: 29.4,
    dividendYield: 2.15,
    near52WLow: false,
    moverBadge: 'TOP LOSER',
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Avg', tone: 'amber' },
      { label: 'Growth', status: 'Good', tone: 'emerald' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'ROCE consistently above 35%', metric: '40.2%' },
      { passed: true, text: 'Zero net debt balance sheet', metric: '0.08x' },
      { passed: true, text: 'Free cash flow conversion > 95% of PAT', metric: '98%' },
      { passed: true, text: 'Outperformed NIFTY 50 over 1Y', metric: '+10.2%' },
    ],
    analystCount: 45,
    consensus: 'Buy',
    buyPct: 74,
    holdPct: 19,
    sellPct: 7,
    targetHigh: '₹2,240',
    targetMedian: '₹2,090',
    targetLow: '₹1,710',
    upsidePct: '+11.6%',
    forecasts: {
      Price: makeForecastSeries(1872.25, 1.2, 1.12, 0.91, '₹'),
      Revenue: makeForecastSeries(161.4, 1.16, 1.1, 1.03, '₹k Cr'),
      EPS: makeForecastSeries(65.9, 1.19, 1.12, 1.02, '₹'),
    },
    peerSymbols: ['INFY', 'TCS', 'HCLTECH', 'HDFCBANK'],
  },
  {
    symbol: 'BHARTIARTL',
    shortCode: 'BHA',
    name: 'Bharti Airtel',
    exchange: 'NSE',
    sector: 'Telecom Services',
    currency: '₹',
    price: 1688.1,
    changePct: 1.92,
    mktCapCr: 960800,
    mktCapDisplay: '₹9,60,800 Cr',
    pe: 52.1,
    roce: 14.1,
    debtToEquity: 1.48,
    promoterHolding: 53.1,
    return1Y: 66.8,
    dividendYield: 0.48,
    near52WLow: false,
    moverBadge: '52W HIGH',
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Avg', tone: 'amber' },
      { label: 'Growth', status: 'High', tone: 'emerald' },
      { label: 'Profitability', status: 'Good', tone: 'emerald' },
      { label: 'Entry point', status: 'Avg', tone: 'amber' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'ARPU expansion leading telecom sector', metric: '₹233' },
      { passed: true, text: 'Strong India mobile FCF generation', metric: '+31% YoY' },
      { passed: true, text: 'No promoter pledging', metric: '0%' },
      { passed: true, text: 'Outperformed NIFTY 50 over 1Y', metric: '+47.4%' },
    ],
    analystCount: 33,
    consensus: 'Buy',
    buyPct: 84,
    holdPct: 12,
    sellPct: 4,
    targetHigh: '₹2,040',
    targetMedian: '₹1,890',
    targetLow: '₹1,540',
    upsidePct: '+12.0%',
    forecasts: {
      Price: makeForecastSeries(1688.1, 1.21, 1.12, 0.91, '₹'),
      Revenue: makeForecastSeries(166.0, 1.19, 1.13, 1.06, '₹k Cr'),
      EPS: makeForecastSeries(32.4, 1.42, 1.28, 1.12, '₹'),
    },
    peerSymbols: ['BHARTIARTL', 'RELIANCE', 'TCS', 'HDFCBANK'],
  },
  {
    symbol: 'NVDA',
    shortCode: 'NVD',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    sector: 'US Semiconductors & AI',
    currency: '$',
    price: 138.6,
    changePct: 3.6,
    mktCapCr: 28400000,
    mktCapDisplay: '$3.39T',
    pe: 46.2,
    roce: 88.4,
    debtToEquity: 0.14,
    promoterHolding: 4.1,
    return1Y: 162.4,
    dividendYield: 0.03,
    near52WLow: false,
    scorecard: [
      { label: 'Performance', status: 'High', tone: 'emerald' },
      { label: 'Valuation', status: 'Avg', tone: 'amber' },
      { label: 'Growth', status: 'High', tone: 'emerald' },
      { label: 'Profitability', status: 'High', tone: 'emerald' },
      { label: 'Entry point', status: 'Good', tone: 'emerald' },
      { label: 'Red flags', status: 'Low', tone: 'emerald' },
    ],
    checklist: [
      { passed: true, text: 'Data Center revenue growth > 75% YoY', metric: '+78%' },
      { passed: true, text: 'Gross margin sustained above 73%', metric: '74.2%' },
      { passed: true, text: 'Net cash balance sheet', metric: '0.14x D/E' },
      { passed: true, text: 'Outperformed S&P 500 over 1Y', metric: '+138%' },
    ],
    analystCount: 58,
    consensus: 'Buy',
    buyPct: 90,
    holdPct: 8,
    sellPct: 2,
    targetHigh: '$185',
    targetMedian: '$162',
    targetLow: '$120',
    upsidePct: '+16.9%',
    forecasts: {
      Price: makeForecastSeries(138.6, 1.33, 1.17, 0.87, '$'),
      Revenue: makeForecastSeries(130.5, 1.48, 1.32, 1.16, '$B'),
      EPS: makeForecastSeries(2.98, 1.45, 1.29, 1.12, '$'),
    },
    peerSymbols: ['NVDA', 'TCS', 'INFY', 'HCLTECH'],
  },
];

export const MUTUAL_FUNDS_UNIVERSE: MutualFundAsset[] = [
  {
    symbol: 'PPFAS',
    shortCode: 'PPF',
    name: 'Parag Parikh Flexi Cap',
    category: 'Flexi Cap · Direct Growth',
    aumCr: 82410,
    aumDisplay: '₹82,410 Cr',
    expenseRatio: 0.63,
    cagr3Y: 21.4,
    sharpe: 1.42,
    risk: 'Very High',
    return1Y: 26.8,
  },
  {
    symbol: 'QUANT-SC',
    shortCode: 'QSC',
    name: 'Quant Small Cap Fund',
    category: 'Small Cap · Direct Growth',
    aumCr: 26840,
    aumDisplay: '₹26,840 Cr',
    expenseRatio: 0.64,
    cagr3Y: 31.8,
    sharpe: 1.38,
    risk: 'Very High',
    return1Y: 34.2,
  },
  {
    symbol: 'HDFC-MID',
    shortCode: 'HMC',
    name: 'HDFC Mid-Cap Opportunities',
    category: 'Mid Cap · Direct Growth',
    aumCr: 74920,
    aumDisplay: '₹74,920 Cr',
    expenseRatio: 0.76,
    cagr3Y: 28.6,
    sharpe: 1.51,
    risk: 'Very High',
    return1Y: 31.5,
  },
  {
    symbol: 'SBI-CON',
    shortCode: 'SBC',
    name: 'SBI Contra Fund',
    category: 'Contra · Direct Growth',
    aumCr: 41280,
    aumDisplay: '₹41,280 Cr',
    expenseRatio: 0.59,
    cagr3Y: 25.9,
    sharpe: 1.44,
    risk: 'High',
    return1Y: 27.9,
  },
  {
    symbol: 'NIPPON-LC',
    shortCode: 'NLC',
    name: 'Nippon India Large Cap',
    category: 'Large Cap · Direct Growth',
    aumCr: 34120,
    aumDisplay: '₹34,120 Cr',
    expenseRatio: 0.72,
    cagr3Y: 22.1,
    sharpe: 1.35,
    risk: 'High',
    return1Y: 24.4,
  },
  {
    symbol: 'MO-N500',
    shortCode: 'MN5',
    name: 'Motilal Oswal Nifty 500 Index',
    category: 'Index · Direct Growth',
    aumCr: 4180,
    aumDisplay: '₹4,180 Cr',
    expenseRatio: 0.2,
    cagr3Y: 18.4,
    sharpe: 1.18,
    risk: 'High',
    return1Y: 21.1,
  },
];

export const PORTFOLIO_SNAPSHOTS: PortfolioSnapshot[] = [
  {
    id: 'primary',
    label: 'Consolidated PAN Holdings',
    totalNetWorth: 4862310,
    totalGain: 784120,
    totalGainPct: 19.2,
    xirr: 16.4,
    assetCount: 4,
    diversificationScore: 72,
    diversificationNote: 'Good — but 34% in banking',
    allocation: [
      { label: 'Stocks', pct: 52, color: '#22C55E' },
      { label: 'MFs', pct: 31, color: '#3B82F6' },
      { label: 'US', pct: 9, color: '#F59E0B' },
      { label: 'Gold/FD', pct: 8, color: '#8B5CF6' },
    ],
    redFlags: [
      { title: 'High promoter pledge', detail: 'Vakrangee · 41% pledged' },
      { title: 'Declining cash flows', detail: 'Zee Ent. · 3 quarters' },
      { title: 'ASM surveillance', detail: 'Suzlon · Stage II' },
    ],
    transactions: [
      { title: 'Bought TCS · 5 shares', meta: 'Zerodha · Today, 10:42', amount: '−₹20,815', positive: false },
      { title: 'SIP · Parag Parikh Flexi Cap', meta: 'CAMS · 05 Nov', amount: '−₹10,000', positive: false },
      { title: 'Dividend · Infosys', meta: 'Groww · 28 Oct', amount: '+₹2,184', positive: true },
    ],
    aiDefaultQuestion: 'How concentrated am I in banking, and what should I trim?',
    aiDefaultAnswer:
      'Banking is 34% of equity vs. 22% for NIFTY 50. HDFC Bank and ICICI Bank make up 71% of that. Trimming ~₹1.6L would bring you near index weight and lift your Diversification Score to 79.',
    bankingWeightPct: 34,
    trimSuggestion: '₹1.6L',
  },
  {
    id: 'growth',
    label: 'US + Tech Growth Sleeve',
    totalNetWorth: 2418900,
    totalGain: 542100,
    totalGainPct: 28.9,
    xirr: 22.1,
    assetCount: 4,
    diversificationScore: 68,
    diversificationNote: 'Moderate — 46% in IT & AI',
    allocation: [
      { label: 'Stocks', pct: 44, color: '#22C55E' },
      { label: 'US', pct: 34, color: '#F59E0B' },
      { label: 'MFs', pct: 18, color: '#3B82F6' },
      { label: 'Gold/FD', pct: 4, color: '#8B5CF6' },
    ],
    redFlags: [
      { title: 'High Beta overlap', detail: 'NVDA + NASDAQ QQQ · 0.84 corr' },
      { title: 'Currency unhedged', detail: 'USD/INR sensitivity on US sleeve' },
    ],
    transactions: [
      { title: 'Bought NVDA · 12 shares', meta: 'GIFT City · Yesterday, 20:15', amount: '−₹1,40,200', positive: false },
      { title: 'SIP · Quant Small Cap', meta: 'CAMS · 02 Nov', amount: '−₹15,000', positive: false },
      { title: 'Dividend · HCL Tech', meta: 'Zerodha · 25 Oct', amount: '+₹3,640', positive: true },
    ],
    aiDefaultQuestion: 'How concentrated am I in banking, and what should I trim?',
    aiDefaultAnswer:
      'Banking is only 12% here, well below NIFTY 50 (22%), while IT & US Semiconductors sit at 46%. Rebalancing ~₹1.2L into Defensive Consumer or Gold raises your Diversification Score from 68 to 78.',
    bankingWeightPct: 12,
    trimSuggestion: '₹1.2L',
  },
];

export const STOCK_DEALS_DATA: Record<'Bulk' | 'Block' | 'Insider', StockDealRow[]> = {
  Bulk: [
    { date: '14 Nov', stock: 'Suzlon Energy', symbol: 'HAL', investor: 'Goldman Sachs (Singapore)', action: 'Buy', qty: '2.4 Cr', value: '₹168 Cr', window: '7d' },
    { date: '13 Nov', stock: 'Zomato', symbol: 'BHARTIARTL', investor: 'Morgan Stanley Asia', action: 'Buy', qty: '1.1 Cr', value: '₹289 Cr', window: '7d' },
    { date: '13 Nov', stock: 'IRFC', symbol: 'COALINDIA', investor: 'Societe Generale', action: 'Sell', qty: '86.2 L', value: '₹121 Cr', window: '7d' },
    { date: '12 Nov', stock: 'Paytm', symbol: 'BAJFINANCE', investor: 'Vanguard Emerging Mkts', action: 'Buy', qty: '18.4 L', value: '₹142 Cr', window: '7d' },
    { date: '11 Nov', stock: 'Yes Bank', symbol: 'HDFCBANK', investor: 'Nomura Singapore', action: 'Sell', qty: '6.8 Cr', value: '₹139 Cr', window: '7d' },
    { date: '04 Nov', stock: 'Petronet LNG', symbol: 'PETRONET', investor: 'Copthall Mauritius Inv', action: 'Buy', qty: '42.0 L', value: '₹138 Cr', window: '30d' },
  ],
  Block: [
    { date: '14 Nov', stock: 'HDFC Bank', symbol: 'HDFCBANK', investor: 'GIC Private Limited', action: 'Buy', qty: '24.5 L', value: '₹426 Cr', window: '7d' },
    { date: '12 Nov', stock: 'Adani Ports', symbol: 'ADANIPORTS', investor: 'GQG Partners LLC', action: 'Buy', qty: '31.0 L', value: '₹437 Cr', window: '7d' },
    { date: '10 Nov', stock: 'Infosys', symbol: 'INFY', investor: 'BlackRock Institutional', action: 'Sell', qty: '14.2 L', value: '₹265 Cr', window: '7d' },
    { date: '02 Nov', stock: 'HCL Technologies', symbol: 'HCLTECH', investor: 'Norges Bank', action: 'Buy', qty: '11.5 L', value: '₹211 Cr', window: '30d' },
  ],
  Insider: [
    { date: '14 Nov', stock: 'Castrol India', symbol: 'CASTROLIND', investor: 'Promoter Group Acquisition', action: 'Buy', qty: '6.2 L', value: '₹12.8 Cr', window: '7d' },
    { date: '12 Nov', stock: 'Bajaj Finance', symbol: 'BAJFINANCE', investor: 'Bajaj Finserv Holding', action: 'Buy', qty: '1.8 L', value: '₹127 Cr', window: '7d' },
    { date: '09 Nov', stock: 'ITC Limited', symbol: 'ITC', investor: 'BAT Tobacco Intl (Trim)', action: 'Sell', qty: '48.0 L', value: '₹229 Cr', window: '7d' },
    { date: '29 Oct', stock: 'Reliance Industries', symbol: 'RELIANCE', investor: 'Promoter Trust Open Mkt', action: 'Buy', qty: '3.5 L', value: '₹103 Cr', window: '30d' },
  ],
};

export const MULTI_ASSET_BROKERS = [
  'Zerodha',
  'Groww',
  'Upstox',
  'Angel One',
  'Kotak Neo',
  'Dhan',
];
