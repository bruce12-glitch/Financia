import { EXTENDED_SCREENER_FUNDS } from './extendedScreenerFunds';

export type ScreenerInstrumentType = 'ETF' | 'Mutual Fund';

export interface ScreenerExposureSlice {
  label: string;
  pct: number;
  color: string;
}

export interface ScreenerRegionRow {
  region:
    | 'North America'
    | 'Europe'
    | 'Latin America'
    | 'Asia'
    | 'Africa'
    | 'Middle East'
    | 'Oceania';
  pct: number;
}

export interface ScreenerExpirationPoint {
  label: string;
  calls: number;
  puts: number;
}

export interface ScreenerFundRecord {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  instrumentType: ScreenerInstrumentType;
  category: string;
  subCategory: string;
  currency: 'USD' | 'INR';
  amfiCode?: string;
  price: number;
  change: number;
  changePct: number;
  lastUpdateLabel: string;
  extendedPrice: number;
  extendedChange: number;
  extendedChangePct: number;
  extendedLabel: string;
  extendedUpdateLabel: string;
  bidLabel: string;
  askLabel: string;
  volumeLabel: string;
  volumeNumeric: number;
  avgVolume30dLabel: string;
  avgVolume30dNumeric: number;
  dayLow: number;
  dayHigh: number;
  week52Low: number;
  week52High: number;
  news: {
    age: string;
    headline: string;
    moreEvents: Array<{ age: string; headline: string; source: string }>;
  };
  keyStats: {
    aumLabel: string;
    aumSortUsdB: number;
    dividendYieldPct: number;
    discountPremiumPct: number;
    totalHoldings: number;
    sharpe3Y: number;
    beta3Y: number;
    trackingErrorPct: number;
    turnoverPct: number;
    maxDrawdown3YPct: number;
  };
  returnsPrice: {
    '1M': number | null;
    '3M': number | null;
    YTD: number | null;
    '1Y': number | null;
    '3Y': number | null;
    '5Y': number | null;
  };
  returnsTotal: {
    '1M': number | null;
    '3M': number | null;
    YTD: number | null;
    '1Y': number | null;
    '3Y': number | null;
    '5Y': number | null;
  };
  seasonals: {
    currentYearLabel: string;
    priorYearLabel: string;
    twoYearsAgoLabel: string;
    currentYear: number[]; // 10-12 monthly cumulative % points
    priorYear: number[]; // 12 monthly cumulative % points
    twoYearsAgo: number[]; // 12 monthly cumulative % points
  };
  exposure: ScreenerExposureSlice[];
  regions: ScreenerRegionRow[];
  technicals: {
    score: number; // -100 (Strong Sell) to +100 (Strong Buy)
    oscillatorsBuy: number;
    oscillatorsNeutral: number;
    oscillatorsSell: number;
    maBuy: number;
    maNeutral: number;
    maSell: number;
    rsi14: number;
    sma20Relation: 'Above' | 'Below';
    sma50Relation: 'Above' | 'Below';
    macdSignal: 'Bullish' | 'Bearish' | 'Neutral';
  };
  optionsNote?: string;
  optionsVolume: ScreenerExpirationPoint[];
  optionsOpenInterest: ScreenerExpirationPoint[];
  about: {
    assetClass: string;
    focus: string;
    expenseRatioPct: number;
    inceptionDate: string;
    issuer: string;
    homePage: string;
    homePageUrl: string;
    indexTracked: string;
    isin: string;
    cusipOrAmfi: string;
    cusipLabel: 'CUSIP' | 'AMFI Code';
    figi: string;
    cfiCode: string;
    description: string;
  };
}

export interface ScreenerFilters {
  query: string;
  instrumentType: 'ALL' | ScreenerInstrumentType;
  category: string;
  sortBy: 'aum' | 'return1y' | 'return3y' | 'expense' | 'change';
}

export interface TechnicalGaugeState {
  label: 'Strong Sell' | 'Sell' | 'Neutral' | 'Buy' | 'Strong Buy';
  angleDeg: number; // -78 to +78 degrees
  colorHex: string;
}

export const SCREENER_FUNDS: ScreenerFundRecord[] = [
  {
    id: 'QQQ',
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust, Series 1',
    exchange: 'NASDAQ',
    instrumentType: 'ETF',
    category: 'Large Cap',
    subCategory: 'Investment Trusts / Index ETFs',
    currency: 'USD',
    price: 645.04,
    change: -14.47,
    changePct: -2.19,
    lastUpdateLabel: 'Last update at 06:29 GMT+5:30',
    extendedPrice: 633.93,
    extendedChange: -11.11,
    extendedChangePct: -1.72,
    extendedLabel: 'Pre-market',
    extendedUpdateLabel: 'Last update at 18:49 GMT+5:30',
    bidLabel: '633.91×480',
    askLabel: '634.00×480',
    volumeLabel: '71.47 M',
    volumeNumeric: 71.47,
    avgVolume30dLabel: '48.23 M',
    avgVolume30dNumeric: 48.23,
    dayLow: 644.34,
    dayHigh: 676.49,
    week52Low: 555.6,
    week52High: 762.86,
    news: {
      age: '18 hours ago',
      headline:
        "Mechanical relief rally could be set up for failure because it 'makes too much sense' - Nomura's McElligott",
      moreEvents: [
        {
          age: '18 hours ago',
          headline:
            "Mechanical relief rally could be set up for failure because it 'makes too much sense' - Nomura's McElligott",
          source: 'MarketWire',
        },
        {
          age: '1 day ago',
          headline: 'Nasdaq-100 mega-cap software earnings drive $3.8B weekly ETF volume surge',
          source: 'ETF Desk',
        },
        {
          age: '2 days ago',
          headline: 'Invesco QQQ options put/call ratio rises ahead of monthly expiration',
          source: 'Derivatives Brief',
        },
      ],
    },
    keyStats: {
      aumLabel: '457.39 B',
      aumSortUsdB: 457.39,
      dividendYieldPct: 0.48,
      discountPremiumPct: -0.03,
      totalHoldings: 102,
      sharpe3Y: 1.34,
      beta3Y: 1.18,
      trackingErrorPct: 0.04,
      turnoverPct: 8.2,
      maxDrawdown3YPct: -16.8,
    },
    returnsPrice: {
      '1M': -9.82,
      '3M': -9.81,
      YTD: 4.03,
      '1Y': 8.03,
      '3Y': 67.09,
      '5Y': null,
    },
    returnsTotal: {
      '1M': -9.71,
      '3M': -9.58,
      YTD: 4.49,
      '1Y': 8.56,
      '3Y': 70.14,
      '5Y': 114.62,
    },
    seasonals: {
      currentYearLabel: '2026',
      priorYearLabel: '2025',
      twoYearsAgoLabel: '2024',
      currentYear: [0.6, 1.4, -2.8, -5.9, 2.4, 9.8, 12.1, 8.6, 11.4, 14.2, 6.8, 4.03],
      priorYear: [1.8, 4.6, 6.2, 5.1, 7.8, 10.4, 13.8, 11.2, 14.5, 16.9, 20.1, 21.8],
      twoYearsAgo: [1.1, 3.2, -3.5, -10.8, 0.9, 3.8, 6.4, 8.1, 10.6, 15.2, 16.4, 18.2],
    },
    exposure: [
      { label: 'Stocks', pct: 99.85, color: '#F59E0B' },
      { label: 'Bonds, Cash & Other', pct: 0.15, color: '#7C3AED' },
    ],
    regions: [
      { region: 'North America', pct: 96.41 },
      { region: 'Europe', pct: 3.26 },
      { region: 'Latin America', pct: 0.33 },
      { region: 'Asia', pct: 0.0 },
      { region: 'Africa', pct: 0.0 },
      { region: 'Middle East', pct: 0.0 },
      { region: 'Oceania', pct: 0.0 },
    ],
    technicals: {
      score: -42,
      oscillatorsBuy: 2,
      oscillatorsNeutral: 5,
      oscillatorsSell: 4,
      maBuy: 3,
      maNeutral: 1,
      maSell: 11,
      rsi14: 38.4,
      sma20Relation: 'Below',
      sma50Relation: 'Below',
      macdSignal: 'Bearish',
    },
    optionsVolume: [
      { label: 'Nov 20', calls: 1020000, puts: 1160000 },
      { label: 'Nov 22', calls: 138000, puts: 145000 },
      { label: 'Nov 24', calls: 78000, puts: 71000 },
      { label: 'Nov 25', calls: 62000, puts: 41000 },
      { label: 'Nov 27', calls: 129000, puts: 88000 },
      { label: 'Nov 29', calls: 92000, puts: 118000 },
      { label: 'Dec 1', calls: 34000, puts: 29000 },
      { label: 'Dec 2', calls: 22000, puts: 19000 },
      { label: 'Dec 3', calls: 26000, puts: 21000 },
      { label: 'Dec 5', calls: 64000, puts: 52000 },
    ],
    optionsOpenInterest: [
      { label: 'Nov 20', calls: 258000, puts: 356000 },
      { label: 'Nov 22', calls: 21000, puts: 11000 },
      { label: 'Nov 24', calls: 14000, puts: 24000 },
      { label: 'Nov 25', calls: 22000, puts: 9000 },
      { label: 'Nov 27', calls: 9000, puts: 8000 },
      { label: 'Nov 29', calls: 31000, puts: 54000 },
      { label: 'Dec 1', calls: 19000, puts: 11000 },
      { label: 'Dec 2', calls: 7000, puts: 5000 },
      { label: 'Dec 3', calls: 5000, puts: 4000 },
      { label: 'Dec 5', calls: 13000, puts: 10000 },
    ],
    about: {
      assetClass: 'Equity',
      focus: 'Large cap',
      expenseRatioPct: 0.18,
      inceptionDate: 'Mar 10, 1999',
      issuer: 'Invesco Ltd./Invesco',
      homePage: 'invesco.com',
      homePageUrl: 'https://www.invesco.com/us/financial-products/etfs/product-detail?ticker=QQQ',
      indexTracked: 'NASDAQ 100 Index',
      isin: 'US46090E1038',
      cusipOrAmfi: '46090E103',
      cusipLabel: 'CUSIP',
      figi: 'BBG000BSWKH7',
      cfiCode: 'CEOJLU',
      description:
        "QQQ is one of the most established and actively traded ETFs in the world. Per the rules of its index, the fund only invests in nonfinancial stocks listed on NASDAQ, and effectively ignores other sectors too, causing it to skew massively away from a broad-based large-cap portfolio. QQQ has huge tech exposure, but it is not a 'tech fund' in the pure sense either. The fund's modified market-cap weighting rules further distance it from plain-vanilla large-cap coverage, concentrating weight in leading mega-cap technology, consumer, and healthcare innovators.",
    },
  },
  {
    id: 'PPFAS',
    symbol: 'PPFAS',
    name: 'Parag Parikh Flexi Cap Fund Direct - Growth',
    exchange: 'AMFI · INDIA',
    instrumentType: 'Mutual Fund',
    category: 'Flexi Cap',
    subCategory: 'Direct Equity Mutual Fund',
    currency: 'INR',
    amfiCode: '122639',
    price: 89.42,
    change: 0.78,
    changePct: 0.88,
    lastUpdateLabel: 'AMFI Daily NAV · 21:30 IST',
    extendedPrice: 89.64,
    extendedChange: 0.22,
    extendedChangePct: 0.25,
    extendedLabel: 'Indicative iNAV',
    extendedUpdateLabel: 'Estimated from underlying basket',
    bidLabel: 'TER 0.63%',
    askLabel: 'Min SIP ₹1,000',
    volumeLabel: '₹1,420 Cr',
    volumeNumeric: 1420,
    avgVolume30dLabel: '₹1,180 Cr',
    avgVolume30dNumeric: 1180,
    dayLow: 88.64,
    dayHigh: 89.58,
    week52Low: 74.18,
    week52High: 91.24,
    news: {
      age: '6 hours ago',
      headline:
        'PPFAS maintains ~15% cash & T-bill arbitrage cushion while adding domestic private banking weight',
      moreEvents: [
        {
          age: '6 hours ago',
          headline:
            'PPFAS maintains ~15% cash & T-bill arbitrage cushion while adding domestic private banking weight',
          source: 'AMFI Factsheet',
        },
        {
          age: '3 days ago',
          headline: 'Direct Flexi Cap inflows remain resilient as retail SIP book crosses record ₹26,400 Cr',
          source: 'AMFI Monthly',
        },
      ],
    },
    keyStats: {
      aumLabel: '₹88,420 Cr',
      aumSortUsdB: 10.6,
      dividendYieldPct: 0.0,
      discountPremiumPct: 0.0,
      totalHoldings: 58,
      sharpe3Y: 1.62,
      beta3Y: 0.68,
      trackingErrorPct: 5.42,
      turnoverPct: 16.4,
      maxDrawdown3YPct: -8.9,
    },
    returnsPrice: {
      '1M': 2.14,
      '3M': 5.82,
      YTD: 14.36,
      '1Y': 21.48,
      '3Y': 74.92,
      '5Y': 162.4,
    },
    returnsTotal: {
      '1M': 2.14,
      '3M': 5.82,
      YTD: 14.36,
      '1Y': 21.48,
      '3Y': 74.92,
      '5Y': 162.4,
    },
    seasonals: {
      currentYearLabel: '2026',
      priorYearLabel: '2025',
      twoYearsAgoLabel: '2024',
      currentYear: [1.4, 2.8, 3.1, 4.9, 6.2, 8.7, 10.4, 11.2, 12.6, 13.4, 14.36],
      priorYear: [1.9, 3.4, 4.8, 7.2, 9.6, 12.4, 14.8, 16.2, 18.9, 17.5, 20.4, 22.8],
      twoYearsAgo: [0.8, 1.2, 2.9, 5.1, 7.4, 9.8, 11.9, 12.7, 14.3, 16.1, 18.8, 21.2],
    },
    exposure: [
      { label: 'Stocks', pct: 84.3, color: '#F59E0B' },
      { label: 'Bonds, Cash & Other', pct: 15.7, color: '#7C3AED' },
    ],
    regions: [
      { region: 'North America', pct: 14.8 },
      { region: 'Europe', pct: 0.0 },
      { region: 'Latin America', pct: 0.0 },
      { region: 'Asia', pct: 85.2 },
      { region: 'Africa', pct: 0.0 },
      { region: 'Middle East', pct: 0.0 },
      { region: 'Oceania', pct: 0.0 },
    ],
    technicals: {
      score: 64,
      oscillatorsBuy: 6,
      oscillatorsNeutral: 4,
      oscillatorsSell: 1,
      maBuy: 12,
      maNeutral: 1,
      maSell: 2,
      rsi14: 61.8,
      sma20Relation: 'Above',
      sma50Relation: 'Above',
      macdSignal: 'Bullish',
    },
    optionsNote: 'Benchmark Proxy: NIFTY 50 Index Options Flow (Mutual funds do not list direct contracts)',
    optionsVolume: [
      { label: 'Nov 20', calls: 485000, puts: 412000 },
      { label: 'Nov 27', calls: 224000, puts: 198000 },
      { label: 'Dec 04', calls: 112000, puts: 94000 },
      { label: 'Dec 11', calls: 86000, puts: 78000 },
      { label: 'Dec 25', calls: 196000, puts: 164000 },
      { label: 'Jan 29', calls: 74000, puts: 62000 },
    ],
    optionsOpenInterest: [
      { label: 'Nov 20', calls: 192000, puts: 214000 },
      { label: 'Nov 27', calls: 148000, puts: 162000 },
      { label: 'Dec 04', calls: 64000, puts: 58000 },
      { label: 'Dec 11', calls: 42000, puts: 39000 },
      { label: 'Dec 25', calls: 138000, puts: 144000 },
      { label: 'Jan 29', calls: 51000, puts: 47000 },
    ],
    about: {
      assetClass: 'Equity',
      focus: 'Flexi Cap (India + Global)',
      expenseRatioPct: 0.63,
      inceptionDate: 'May 24, 2013',
      issuer: 'PPFAS Mutual Fund',
      homePage: 'amc.ppfas.com',
      homePageUrl: 'https://amc.ppfas.com',
      indexTracked: 'NIFTY 500 TRI (Benchmark)',
      isin: 'INF879O01027',
      cusipOrAmfi: '122639',
      cusipLabel: 'AMFI Code',
      figi: 'BBG004S681B4',
      cfiCode: 'CIOGEU',
      description:
        'Parag Parikh Flexi Cap Fund Direct Plan-Growth is a value-oriented open-ended equity scheme investing across large, mid, and small-cap Indian companies alongside select global technology franchises (such as Alphabet, Microsoft, and Meta). Known for disciplined downside protection, low portfolio churn, and deploying cash/arbitrage buffers during elevated market valuations.',
    },
  },
  {
    id: 'SPY',
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    exchange: 'NYSE ARCA',
    instrumentType: 'ETF',
    category: 'Large Cap',
    subCategory: 'Broad Market U.S. Equity ETF',
    currency: 'USD',
    price: 594.82,
    change: -4.18,
    changePct: -0.7,
    lastUpdateLabel: 'Last update at 06:29 GMT+5:30',
    extendedPrice: 592.15,
    extendedChange: -2.67,
    extendedChangePct: -0.45,
    extendedLabel: 'Pre-market',
    extendedUpdateLabel: 'Last update at 18:48 GMT+5:30',
    bidLabel: '592.10×920',
    askLabel: '592.18×860',
    volumeLabel: '64.12 M',
    volumeNumeric: 64.12,
    avgVolume30dLabel: '51.80 M',
    avgVolume30dNumeric: 51.8,
    dayLow: 591.4,
    dayHigh: 601.25,
    week52Low: 494.1,
    week52High: 612.9,
    news: {
      age: '11 hours ago',
      headline:
        'S&P 500 forward earnings breadth improves across industrials and financials despite mega-cap pullback',
      moreEvents: [
        {
          age: '11 hours ago',
          headline:
            'S&P 500 forward earnings breadth improves across industrials and financials despite mega-cap pullback',
          source: 'Institutional Wire',
        },
        {
          age: '1 day ago',
          headline: 'SPY institutional creations top $4.2B in five trading sessions',
          source: 'ETF Flow Desk',
        },
      ],
    },
    keyStats: {
      aumLabel: '624.80 B',
      aumSortUsdB: 624.8,
      dividendYieldPct: 1.22,
      discountPremiumPct: 0.01,
      totalHoldings: 503,
      sharpe3Y: 1.19,
      beta3Y: 1.0,
      trackingErrorPct: 0.03,
      turnoverPct: 3.1,
      maxDrawdown3YPct: -12.4,
    },
    returnsPrice: {
      '1M': -2.84,
      '3M': 1.46,
      YTD: 11.92,
      '1Y': 17.64,
      '3Y': 48.21,
      '5Y': 84.15,
    },
    returnsTotal: {
      '1M': -2.74,
      '3M': 1.78,
      YTD: 13.08,
      '1Y': 19.12,
      '3Y': 54.68,
      '5Y': 98.42,
    },
    seasonals: {
      currentYearLabel: '2026',
      priorYearLabel: '2025',
      twoYearsAgoLabel: '2024',
      currentYear: [1.2, 2.9, 1.8, 0.4, 3.8, 6.2, 8.9, 9.1, 10.6, 12.8, 11.92],
      priorYear: [1.6, 3.8, 5.1, 3.9, 6.8, 9.4, 11.8, 12.9, 15.1, 16.4, 18.7, 20.1],
      twoYearsAgo: [1.5, 4.1, 2.2, -1.8, 3.2, 6.5, 8.2, 9.4, 11.2, 13.8, 16.9, 19.2],
    },
    exposure: [
      { label: 'Stocks', pct: 99.62, color: '#F59E0B' },
      { label: 'Bonds, Cash & Other', pct: 0.38, color: '#7C3AED' },
    ],
    regions: [
      { region: 'North America', pct: 98.12 },
      { region: 'Europe', pct: 1.44 },
      { region: 'Latin America', pct: 0.14 },
      { region: 'Asia', pct: 0.24 },
      { region: 'Africa', pct: 0.0 },
      { region: 'Middle East', pct: 0.06 },
      { region: 'Oceania', pct: 0.0 },
    ],
    technicals: {
      score: 12,
      oscillatorsBuy: 4,
      oscillatorsNeutral: 5,
      oscillatorsSell: 2,
      maBuy: 8,
      maNeutral: 1,
      maSell: 6,
      rsi14: 51.6,
      sma20Relation: 'Below',
      sma50Relation: 'Above',
      macdSignal: 'Neutral',
    },
    optionsVolume: [
      { label: 'Nov 20', calls: 1180000, puts: 1120000 },
      { label: 'Nov 22', calls: 310000, puts: 295000 },
      { label: 'Nov 24', calls: 165000, puts: 148000 },
      { label: 'Nov 27', calls: 242000, puts: 215000 },
      { label: 'Dec 1', calls: 118000, puts: 109000 },
      { label: 'Dec 3', calls: 96000, puts: 84000 },
    ],
    optionsOpenInterest: [
      { label: 'Nov 20', calls: 312000, puts: 342000 },
      { label: 'Nov 22', calls: 84000, puts: 91000 },
      { label: 'Nov 24', calls: 52000, puts: 48000 },
      { label: 'Nov 27', calls: 78000, puts: 89000 },
      { label: 'Dec 1', calls: 41000, puts: 38000 },
      { label: 'Dec 3', calls: 29000, puts: 26000 },
    ],
    about: {
      assetClass: 'Equity',
      focus: 'Large cap',
      expenseRatioPct: 0.09,
      inceptionDate: 'Jan 22, 1993',
      issuer: 'State Street Global Advisors',
      homePage: 'ssga.com',
      homePageUrl: 'https://www.ssga.com/us/en/intermediary/etfs/spdr-sp-500-etf-trust-spy',
      indexTracked: 'S&P 500 Index',
      isin: 'US78462F1030',
      cusipOrAmfi: '78462F103',
      cusipLabel: 'CUSIP',
      figi: 'BBG000BDTBL9',
      cfiCode: 'CEOGLU',
      description:
        'SPDR S&P 500 ETF Trust (SPY) is the benchmark U.S. large-cap equity ETF tracking the S&P 500 Index. Offering the deepest secondary market liquidity and tightest bid-ask spreads globally, SPY provides core diversified exposure across all 11 GICS sectors of the United States equity market.',
    },
  },
  {
    id: 'GOLDBEES',
    symbol: 'GOLDBEES',
    name: 'Nippon India ETF Gold BeES',
    exchange: 'NSE · INDIA',
    instrumentType: 'ETF',
    category: 'Gold & Bullion',
    subCategory: 'Physical Gold Bullion ETF',
    currency: 'INR',
    price: 76.42,
    change: 0.89,
    changePct: 1.18,
    lastUpdateLabel: 'NSE Spot Close · 15:30 IST',
    extendedPrice: 76.68,
    extendedChange: 0.26,
    extendedChangePct: 0.34,
    extendedLabel: 'iNAV (LBMA Sync)',
    extendedUpdateLabel: 'Live PAXG / USD-INR parity',
    bidLabel: '76.40×4,200',
    askLabel: '76.44×3,850',
    volumeLabel: '14.82 M',
    volumeNumeric: 14.82,
    avgVolume30dLabel: '9.65 M',
    avgVolume30dNumeric: 9.65,
    dayLow: 75.58,
    dayHigh: 76.85,
    week52Low: 58.12,
    week52High: 77.9,
    news: {
      age: '4 hours ago',
      headline:
        'Central bank bullion accumulation and softer real Treasury yields lift domestic Gold ETF inflows to 14-month high',
      moreEvents: [
        {
          age: '4 hours ago',
          headline:
            'Central bank bullion accumulation and softer real Treasury yields lift domestic Gold ETF inflows to 14-month high',
          source: 'Bullion Desk',
        },
        {
          age: '2 days ago',
          headline: 'AMFI data shows Indian Gold ETF AUM crossing ₹48,000 Cr milestone',
          source: 'AMFI Bulletin',
        },
      ],
    },
    keyStats: {
      aumLabel: '₹18,940 Cr',
      aumSortUsdB: 2.28,
      dividendYieldPct: 0.0,
      discountPremiumPct: 0.08,
      totalHoldings: 1,
      sharpe3Y: 1.48,
      beta3Y: 0.14,
      trackingErrorPct: 0.21,
      turnoverPct: 4.5,
      maxDrawdown3YPct: -6.2,
    },
    returnsPrice: {
      '1M': 3.42,
      '3M': 8.95,
      YTD: 19.84,
      '1Y': 28.4,
      '3Y': 64.18,
      '5Y': 96.72,
    },
    returnsTotal: {
      '1M': 3.42,
      '3M': 8.95,
      YTD: 19.84,
      '1Y': 28.4,
      '3Y': 64.18,
      '5Y': 96.72,
    },
    seasonals: {
      currentYearLabel: '2026',
      priorYearLabel: '2025',
      twoYearsAgoLabel: '2024',
      currentYear: [2.1, 4.4, 7.8, 9.2, 10.6, 12.1, 14.5, 15.8, 17.4, 18.6, 19.84],
      priorYear: [1.4, 2.2, 5.8, 8.9, 10.2, 11.4, 13.8, 16.5, 19.2, 22.8, 24.1, 25.6],
      twoYearsAgo: [0.9, 1.8, 4.1, 5.5, 6.2, 5.1, 7.8, 9.4, 11.6, 13.9, 15.2, 16.8],
    },
    exposure: [
      { label: 'Physical Gold (99.5% LBMA)', pct: 98.42, color: '#F59E0B' },
      { label: 'Bonds, Cash & Other', pct: 1.58, color: '#7C3AED' },
    ],
    regions: [
      { region: 'North America', pct: 0.0 },
      { region: 'Europe', pct: 18.5 },
      { region: 'Latin America', pct: 0.0 },
      { region: 'Asia', pct: 81.5 },
      { region: 'Africa', pct: 0.0 },
      { region: 'Middle East', pct: 0.0 },
      { region: 'Oceania', pct: 0.0 },
    ],
    technicals: {
      score: 76,
      oscillatorsBuy: 7,
      oscillatorsNeutral: 3,
      oscillatorsSell: 1,
      maBuy: 14,
      maNeutral: 1,
      maSell: 0,
      rsi14: 66.2,
      sma20Relation: 'Above',
      sma50Relation: 'Above',
      macdSignal: 'Bullish',
    },
    optionsNote: 'Proxy Bullion Derivatives: MCX Gold Mini & COMEX Gold Options Flow',
    optionsVolume: [
      { label: 'Nov 25', calls: 164000, puts: 98000 },
      { label: 'Dec 05', calls: 128000, puts: 74000 },
      { label: 'Dec 26', calls: 214000, puts: 118000 },
      { label: 'Jan 27', calls: 88000, puts: 52000 },
      { label: 'Feb 25', calls: 64000, puts: 39000 },
    ],
    optionsOpenInterest: [
      { label: 'Nov 25', calls: 92000, puts: 61000 },
      { label: 'Dec 05', calls: 78000, puts: 48000 },
      { label: 'Dec 26', calls: 146000, puts: 89000 },
      { label: 'Jan 27', calls: 54000, puts: 34000 },
      { label: 'Feb 25', calls: 38000, puts: 22000 },
    ],
    about: {
      assetClass: 'Commodities',
      focus: 'Physical Gold Bullion',
      expenseRatioPct: 0.79,
      inceptionDate: 'Mar 08, 2007',
      issuer: 'Nippon India Mutual Fund',
      homePage: 'mf.nipponindiaim.com',
      homePageUrl: 'https://mf.nipponindiaim.com',
      indexTracked: 'Domestic Price of Physical Gold',
      isin: 'INF204KB17I5',
      cusipOrAmfi: '105758',
      cusipLabel: 'AMFI Code',
      figi: 'BBG000R7W1C9',
      cfiCode: 'CEOGCM',
      description:
        'Nippon India ETF Gold BeES is India’s oldest and most liquid exchange-traded physical gold fund. Every unit is backed by 99.5% purity LBMA Good Delivery physical gold bullion held in insured vault custody, enabling transparent NSE liquidity with minimal tracking deviation.',
    },
  },
  {
    id: 'HDFCMID',
    symbol: 'HDFCMID',
    name: 'HDFC Mid-Cap Opportunities Direct - Growth',
    exchange: 'AMFI · INDIA',
    instrumentType: 'Mutual Fund',
    category: 'Mid Cap',
    subCategory: 'Direct Equity Mutual Fund',
    currency: 'INR',
    amfiCode: '118989',
    price: 196.48,
    change: 1.94,
    changePct: 1.0,
    lastUpdateLabel: 'AMFI Daily NAV · 21:30 IST',
    extendedPrice: 197.02,
    extendedChange: 0.54,
    extendedChangePct: 0.27,
    extendedLabel: 'Indicative iNAV',
    extendedUpdateLabel: 'Estimated from Nifty Midcap 150',
    bidLabel: 'TER 0.76%',
    askLabel: 'Min SIP ₹100',
    volumeLabel: '₹980 Cr',
    volumeNumeric: 980,
    avgVolume30dLabel: '₹840 Cr',
    avgVolume30dNumeric: 840,
    dayLow: 194.54,
    dayHigh: 197.12,
    week52Low: 158.4,
    week52High: 204.85,
    news: {
      age: '9 hours ago',
      headline:
        'Domestic capital goods and regional healthcare earnings lift mid-cap mutual fund alpha over large-cap peers',
      moreEvents: [
        {
          age: '9 hours ago',
          headline:
            'Domestic capital goods and regional healthcare earnings lift mid-cap mutual fund alpha over large-cap peers',
          source: 'AMFI Factsheet',
        },
        {
          age: '4 days ago',
          headline: 'HDFC Mid-Cap Opportunities maintains top-quartile 3Y rolling Sharpe ratio',
          source: 'Fund Analytics',
        },
      ],
    },
    keyStats: {
      aumLabel: '₹76,120 Cr',
      aumSortUsdB: 9.15,
      dividendYieldPct: 0.0,
      discountPremiumPct: 0.0,
      totalHoldings: 72,
      sharpe3Y: 1.54,
      beta3Y: 0.87,
      trackingErrorPct: 4.18,
      turnoverPct: 22.8,
      maxDrawdown3YPct: -13.4,
    },
    returnsPrice: {
      '1M': 2.68,
      '3M': 6.45,
      YTD: 16.82,
      '1Y': 25.14,
      '3Y': 88.62,
      '5Y': 214.8,
    },
    returnsTotal: {
      '1M': 2.68,
      '3M': 6.45,
      YTD: 16.82,
      '1Y': 25.14,
      '3Y': 88.62,
      '5Y': 214.8,
    },
    seasonals: {
      currentYearLabel: '2026',
      priorYearLabel: '2025',
      twoYearsAgoLabel: '2024',
      currentYear: [1.8, 3.1, 1.9, 5.4, 8.2, 11.4, 13.8, 12.6, 15.1, 16.0, 16.82],
      priorYear: [2.2, 4.1, 3.5, 8.1, 11.9, 15.8, 18.4, 20.1, 22.9, 21.8, 24.5, 26.2],
      twoYearsAgo: [1.1, 2.6, 4.2, 7.9, 10.4, 13.2, 16.1, 18.5, 20.4, 22.1, 24.8, 28.4],
    },
    exposure: [
      { label: 'Stocks', pct: 93.4, color: '#F59E0B' },
      { label: 'Bonds, Cash & Other', pct: 6.6, color: '#7C3AED' },
    ],
    regions: [
      { region: 'North America', pct: 0.0 },
      { region: 'Europe', pct: 0.0 },
      { region: 'Latin America', pct: 0.0 },
      { region: 'Asia', pct: 100.0 },
      { region: 'Africa', pct: 0.0 },
      { region: 'Middle East', pct: 0.0 },
      { region: 'Oceania', pct: 0.0 },
    ],
    technicals: {
      score: 52,
      oscillatorsBuy: 5,
      oscillatorsNeutral: 4,
      oscillatorsSell: 2,
      maBuy: 11,
      maNeutral: 2,
      maSell: 2,
      rsi14: 59.4,
      sma20Relation: 'Above',
      sma50Relation: 'Above',
      macdSignal: 'Bullish',
    },
    optionsNote: 'Benchmark Proxy: NIFTY Midcap Select Index Options Flow',
    optionsVolume: [
      { label: 'Nov 24', calls: 248000, puts: 212000 },
      { label: 'Dec 01', calls: 142000, puts: 118000 },
      { label: 'Dec 08', calls: 94000, puts: 82000 },
      { label: 'Dec 15', calls: 68000, puts: 59000 },
      { label: 'Dec 29', calls: 156000, puts: 132000 },
    ],
    optionsOpenInterest: [
      { label: 'Nov 24', calls: 118000, puts: 134000 },
      { label: 'Dec 01', calls: 76000, puts: 82000 },
      { label: 'Dec 08', calls: 52000, puts: 49000 },
      { label: 'Dec 15', calls: 38000, puts: 35000 },
      { label: 'Dec 29', calls: 98000, puts: 108000 },
    ],
    about: {
      assetClass: 'Equity',
      focus: 'Mid cap (India)',
      expenseRatioPct: 0.76,
      inceptionDate: 'Jan 01, 2013',
      issuer: 'HDFC Mutual Fund',
      homePage: 'hdfcfund.com',
      homePageUrl: 'https://www.hdfcfund.com',
      indexTracked: 'NIFTY Midcap 150 TRI (Benchmark)',
      isin: 'INF179K01XQ0',
      cusipOrAmfi: '118989',
      cusipLabel: 'AMFI Code',
      figi: 'BBG003Z1R8N2',
      cfiCode: 'CIOGEU',
      description:
        'HDFC Mid-Cap Opportunities Fund Direct Plan-Growth invests predominantly in mid-cap Indian enterprises demonstrating durable return on equity, healthy balance sheets, and reasonable valuations across banking, industrial manufacturing, pharmaceuticals, and auto ancillaries.',
    },
  },
  {
    id: 'NIFTYBEES',
    symbol: 'NIFTYBEES',
    name: 'Nippon India ETF Nifty 50 BeES',
    exchange: 'NSE · INDIA',
    instrumentType: 'ETF',
    category: 'Large Cap',
    subCategory: 'Nifty 50 Core Index ETF',
    currency: 'INR',
    price: 286.35,
    change: 2.15,
    changePct: 0.76,
    lastUpdateLabel: 'NSE Spot Close · 15:30 IST',
    extendedPrice: 286.9,
    extendedChange: 0.55,
    extendedChangePct: 0.19,
    extendedLabel: 'iNAV (NSE Live)',
    extendedUpdateLabel: 'Real-time Nifty 50 basket',
    bidLabel: '286.32×5,400',
    askLabel: '286.38×4,900',
    volumeLabel: '9.14 M',
    volumeNumeric: 9.14,
    avgVolume30dLabel: '7.42 M',
    avgVolume30dNumeric: 7.42,
    dayLow: 284.1,
    dayHigh: 287.45,
    week52Low: 242.6,
    week52High: 294.2,
    news: {
      age: '7 hours ago',
      headline:
        'Domestic institutional inflows absorb FII rebalancing, keeping Nifty 50 ETFs above 50-day moving average',
      moreEvents: [
        {
          age: '7 hours ago',
          headline:
            'Domestic institutional inflows absorb FII rebalancing, keeping Nifty 50 ETFs above 50-day moving average',
          source: 'NSE MarketPulse',
        },
      ],
    },
    keyStats: {
      aumLabel: '₹39,480 Cr',
      aumSortUsdB: 4.75,
      dividendYieldPct: 1.18,
      discountPremiumPct: 0.02,
      totalHoldings: 50,
      sharpe3Y: 1.14,
      beta3Y: 1.0,
      trackingErrorPct: 0.03,
      turnoverPct: 5.2,
      maxDrawdown3YPct: -11.6,
    },
    returnsPrice: {
      '1M': 1.48,
      '3M': 3.92,
      YTD: 11.4,
      '1Y': 14.85,
      '3Y': 47.2,
      '5Y': 102.6,
    },
    returnsTotal: {
      '1M': 1.56,
      '3M': 4.18,
      YTD: 12.52,
      '1Y': 16.12,
      '3Y': 52.45,
      '5Y': 115.3,
    },
    seasonals: {
      currentYearLabel: '2026',
      priorYearLabel: '2025',
      twoYearsAgoLabel: '2024',
      currentYear: [0.8, 1.9, 2.4, 3.8, 5.1, 7.6, 9.2, 8.8, 10.1, 10.9, 11.4],
      priorYear: [1.1, 2.4, 3.8, 5.4, 6.8, 9.5, 11.4, 12.2, 14.1, 12.9, 14.8, 16.2],
      twoYearsAgo: [-0.4, 0.9, 1.8, 4.2, 6.1, 8.8, 10.2, 9.6, 11.4, 12.9, 15.6, 18.4],
    },
    exposure: [
      { label: 'Stocks', pct: 99.78, color: '#F59E0B' },
      { label: 'Bonds, Cash & Other', pct: 0.22, color: '#7C3AED' },
    ],
    regions: [
      { region: 'North America', pct: 0.0 },
      { region: 'Europe', pct: 0.0 },
      { region: 'Latin America', pct: 0.0 },
      { region: 'Asia', pct: 100.0 },
      { region: 'Africa', pct: 0.0 },
      { region: 'Middle East', pct: 0.0 },
      { region: 'Oceania', pct: 0.0 },
    ],
    technicals: {
      score: 38,
      oscillatorsBuy: 5,
      oscillatorsNeutral: 4,
      oscillatorsSell: 2,
      maBuy: 10,
      maNeutral: 2,
      maSell: 3,
      rsi14: 57.1,
      sma20Relation: 'Above',
      sma50Relation: 'Above',
      macdSignal: 'Bullish',
    },
    optionsVolume: [
      { label: 'Nov 20', calls: 742000, puts: 688000 },
      { label: 'Nov 27', calls: 318000, puts: 294000 },
      { label: 'Dec 04', calls: 156000, puts: 141000 },
      { label: 'Dec 11', calls: 98000, puts: 87000 },
      { label: 'Dec 25', calls: 264000, puts: 248000 },
    ],
    optionsOpenInterest: [
      { label: 'Nov 20', calls: 268000, puts: 292000 },
      { label: 'Nov 27', calls: 174000, puts: 188000 },
      { label: 'Dec 04', calls: 82000, puts: 76000 },
      { label: 'Dec 11', calls: 54000, puts: 49000 },
      { label: 'Dec 25', calls: 162000, puts: 178000 },
    ],
    about: {
      assetClass: 'Equity',
      focus: 'Large cap (India)',
      expenseRatioPct: 0.04,
      inceptionDate: 'Dec 28, 2001',
      issuer: 'Nippon India Mutual Fund',
      homePage: 'mf.nipponindiaim.com',
      homePageUrl: 'https://mf.nipponindiaim.com',
      indexTracked: 'NIFTY 50 TRI',
      isin: 'INF204KB14I2',
      cusipOrAmfi: '100822',
      cusipLabel: 'AMFI Code',
      figi: 'BBG000P528G8',
      cfiCode: 'CEOGLU',
      description:
        'Nippon India ETF Nifty 50 BeES was India’s first exchange-traded fund, providing low-cost passive replication of the 50 largest blue-chip companies listed on the National Stock Exchange with a 0.04% expense ratio and tight market-maker spreads.',
    },
  },
  {
    id: 'SBIGILT',
    symbol: 'SBIGILT',
    name: 'SBI Magnum Gilt Fund Direct - Growth',
    exchange: 'AMFI · INDIA',
    instrumentType: 'Mutual Fund',
    category: 'Debt & Gilt',
    subCategory: 'Sovereign G-Sec Debt Mutual Fund',
    currency: 'INR',
    amfiCode: '119707',
    price: 70.52,
    change: 0.21,
    changePct: 0.3,
    lastUpdateLabel: 'AMFI Daily NAV · 21:30 IST',
    extendedPrice: 70.58,
    extendedChange: 0.06,
    extendedChangePct: 0.09,
    extendedLabel: 'Indicative iNAV',
    extendedUpdateLabel: '10Y India G-Sec yield adjusted',
    bidLabel: 'TER 0.46%',
    askLabel: 'Mod. Dur 6.4Y',
    volumeLabel: '₹310 Cr',
    volumeNumeric: 310,
    avgVolume30dLabel: '₹265 Cr',
    avgVolume30dNumeric: 265,
    dayLow: 70.31,
    dayHigh: 70.61,
    week52Low: 64.85,
    week52High: 71.15,
    news: {
      age: '14 hours ago',
      headline:
        'India 10Y G-Sec yield softens 6 bps following benign core CPI print and global sovereign bond index inflows',
      moreEvents: [
        {
          age: '14 hours ago',
          headline:
            'India 10Y G-Sec yield softens 6 bps following benign core CPI print and global sovereign bond index inflows',
          source: 'Fixed Income Desk',
        },
      ],
    },
    keyStats: {
      aumLabel: '₹11,240 Cr',
      aumSortUsdB: 1.35,
      dividendYieldPct: 7.18,
      discountPremiumPct: 0.0,
      totalHoldings: 24,
      sharpe3Y: 1.12,
      beta3Y: 0.22,
      trackingErrorPct: 1.14,
      turnoverPct: 68.0,
      maxDrawdown3YPct: -3.1,
    },
    returnsPrice: {
      '1M': 0.84,
      '3M': 2.26,
      YTD: 7.42,
      '1Y': 9.18,
      '3Y': 26.85,
      '5Y': 41.9,
    },
    returnsTotal: {
      '1M': 0.84,
      '3M': 2.26,
      YTD: 7.42,
      '1Y': 9.18,
      '3Y': 26.85,
      '5Y': 41.9,
    },
    seasonals: {
      currentYearLabel: '2026',
      priorYearLabel: '2025',
      twoYearsAgoLabel: '2024',
      currentYear: [0.6, 1.3, 2.0, 2.8, 3.6, 4.4, 5.1, 5.8, 6.4, 6.9, 7.42],
      priorYear: [0.7, 1.4, 2.2, 3.1, 4.0, 4.8, 5.7, 6.5, 7.3, 7.9, 8.6, 9.2],
      twoYearsAgo: [0.5, 1.1, 1.8, 2.6, 3.4, 4.1, 4.9, 5.5, 6.1, 6.8, 7.4, 8.1],
    },
    exposure: [
      { label: 'Sovereign G-Secs', pct: 94.8, color: '#2563EB' },
      { label: 'Bonds, Cash & Other', pct: 5.2, color: '#7C3AED' },
    ],
    regions: [
      { region: 'North America', pct: 0.0 },
      { region: 'Europe', pct: 0.0 },
      { region: 'Latin America', pct: 0.0 },
      { region: 'Asia', pct: 100.0 },
      { region: 'Africa', pct: 0.0 },
      { region: 'Middle East', pct: 0.0 },
      { region: 'Oceania', pct: 0.0 },
    ],
    technicals: {
      score: 48,
      oscillatorsBuy: 5,
      oscillatorsNeutral: 5,
      oscillatorsSell: 1,
      maBuy: 11,
      maNeutral: 2,
      maSell: 2,
      rsi14: 58.2,
      sma20Relation: 'Above',
      sma50Relation: 'Above',
      macdSignal: 'Bullish',
    },
    optionsNote: 'Proxy Rates Hedging: Sovereign Bond Yield Futures & TLT Duration Flow',
    optionsVolume: [
      { label: 'Nov 20', calls: 112000, puts: 84000 },
      { label: 'Nov 27', calls: 78000, puts: 54000 },
      { label: 'Dec 04', calls: 64000, puts: 48000 },
      { label: 'Dec 18', calls: 132000, puts: 91000 },
      { label: 'Jan 15', calls: 52000, puts: 38000 },
    ],
    optionsOpenInterest: [
      { label: 'Nov 20', calls: 84000, puts: 62000 },
      { label: 'Nov 27', calls: 59000, puts: 42000 },
      { label: 'Dec 04', calls: 48000, puts: 35000 },
      { label: 'Dec 18', calls: 104000, puts: 74000 },
      { label: 'Jan 15', calls: 41000, puts: 29000 },
    ],
    about: {
      assetClass: 'Fixed Income',
      focus: 'Sovereign G-Sec (Long Duration)',
      expenseRatioPct: 0.46,
      inceptionDate: 'Jan 02, 2013',
      issuer: 'SBI Mutual Fund',
      homePage: 'sbimf.com',
      homePageUrl: 'https://www.sbimf.com',
      indexTracked: 'NIFTY All Duration G-Sec Index',
      isin: 'INF200K01UT4',
      cusipOrAmfi: '119707',
      cusipLabel: 'AMFI Code',
      figi: 'BBG003Z1S9V5',
      cfiCode: 'CIOGBU',
      description:
        'SBI Magnum Gilt Fund Direct Plan-Growth invests 100% in Government of India Sovereign Securities (G-Secs), State Development Loans, and Tri-Party Repos, carrying zero credit default risk while actively managing duration across RBI interest-rate cycles.',
    },
  },
  {
    id: 'GLD',
    symbol: 'GLD',
    name: 'SPDR Gold Shares',
    exchange: 'NYSE ARCA',
    instrumentType: 'ETF',
    category: 'Gold & Bullion',
    subCategory: 'Physical Gold Bullion ETF',
    currency: 'USD',
    price: 298.65,
    change: 3.12,
    changePct: 1.06,
    lastUpdateLabel: 'Last update at 06:29 GMT+5:30',
    extendedPrice: 299.4,
    extendedChange: 0.75,
    extendedChangePct: 0.25,
    extendedLabel: 'Pre-market',
    extendedUpdateLabel: 'Last update at 18:49 GMT+5:30',
    bidLabel: '299.36×640',
    askLabel: '299.44×580',
    volumeLabel: '12.45 M',
    volumeNumeric: 12.45,
    avgVolume30dLabel: '9.18 M',
    avgVolume30dNumeric: 9.18,
    dayLow: 295.4,
    dayHigh: 300.12,
    week52Low: 224.8,
    week52High: 304.9,
    news: {
      age: '5 hours ago',
      headline:
        'Spot bullion holds firm above $3,220/oz as sovereign reserve diversification accelerates into Q4',
      moreEvents: [
        {
          age: '5 hours ago',
          headline:
            'Spot bullion holds firm above $3,220/oz as sovereign reserve diversification accelerates into Q4',
          source: 'Bullion Wire',
        },
      ],
    },
    keyStats: {
      aumLabel: '98.40 B',
      aumSortUsdB: 98.4,
      dividendYieldPct: 0.0,
      discountPremiumPct: -0.02,
      totalHoldings: 1,
      sharpe3Y: 1.52,
      beta3Y: 0.11,
      trackingErrorPct: 0.05,
      turnoverPct: 0.0,
      maxDrawdown3YPct: -7.8,
    },
    returnsPrice: {
      '1M': 2.94,
      '3M': 8.12,
      YTD: 22.18,
      '1Y': 29.85,
      '3Y': 68.4,
      '5Y': 76.2,
    },
    returnsTotal: {
      '1M': 2.94,
      '3M': 8.12,
      YTD: 22.18,
      '1Y': 29.85,
      '3Y': 68.4,
      '5Y': 76.2,
    },
    seasonals: {
      currentYearLabel: '2026',
      priorYearLabel: '2025',
      twoYearsAgoLabel: '2024',
      currentYear: [2.4, 4.9, 8.2, 10.1, 11.8, 13.4, 15.9, 17.6, 19.8, 21.1, 22.18],
      priorYear: [1.2, 2.8, 6.4, 9.2, 10.8, 12.1, 14.9, 17.8, 20.4, 23.6, 25.1, 26.8],
      twoYearsAgo: [0.8, 1.4, 3.8, 5.2, 4.9, 4.2, 6.8, 8.9, 10.5, 12.8, 14.1, 15.6],
    },
    exposure: [
      { label: 'Physical Gold Bullion', pct: 100.0, color: '#F59E0B' },
      { label: 'Bonds, Cash & Other', pct: 0.0, color: '#7C3AED' },
    ],
    regions: [
      { region: 'North America', pct: 0.0 },
      { region: 'Europe', pct: 100.0 },
      { region: 'Latin America', pct: 0.0 },
      { region: 'Asia', pct: 0.0 },
      { region: 'Africa', pct: 0.0 },
      { region: 'Middle East', pct: 0.0 },
      { region: 'Oceania', pct: 0.0 },
    ],
    technicals: {
      score: 72,
      oscillatorsBuy: 7,
      oscillatorsNeutral: 3,
      oscillatorsSell: 1,
      maBuy: 13,
      maNeutral: 1,
      maSell: 1,
      rsi14: 64.8,
      sma20Relation: 'Above',
      sma50Relation: 'Above',
      macdSignal: 'Bullish',
    },
    optionsVolume: [
      { label: 'Nov 20', calls: 392000, puts: 214000 },
      { label: 'Nov 24', calls: 118000, puts: 68000 },
      { label: 'Nov 27', calls: 154000, puts: 89000 },
      { label: 'Dec 1', calls: 84000, puts: 47000 },
      { label: 'Dec 3', calls: 62000, puts: 36000 },
      { label: 'Dec 18', calls: 248000, puts: 142000 },
    ],
    optionsOpenInterest: [
      { label: 'Nov 20', calls: 218000, puts: 142000 },
      { label: 'Nov 24', calls: 64000, puts: 41000 },
      { label: 'Nov 27', calls: 82000, puts: 52000 },
      { label: 'Dec 1', calls: 48000, puts: 31000 },
      { label: 'Dec 3', calls: 34000, puts: 22000 },
      { label: 'Dec 18', calls: 194000, puts: 118000 },
    ],
    about: {
      assetClass: 'Commodities',
      focus: 'Physical Gold Bullion',
      expenseRatioPct: 0.4,
      inceptionDate: 'Nov 18, 2004',
      issuer: 'World Gold Trust Services / SSGA',
      homePage: 'spdrgoldshares.com',
      homePageUrl: 'https://www.spdrgoldshares.com',
      indexTracked: 'LBMA Gold Price PM',
      isin: 'US78463V1070',
      cusipOrAmfi: '78463V107',
      cusipLabel: 'CUSIP',
      figi: 'BBG000CRF6Q8',
      cfiCode: 'CEOGCM',
      description:
        'SPDR Gold Shares (GLD) is the largest physically backed gold exchange-traded fund globally. Its sole assets consist of allocated London Good Delivery gold bars custodied in London vaults, offering institutional investors direct spot bullion exposure.',
    },
  },
  {
    id: 'TLT',
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    exchange: 'NASDAQ',
    instrumentType: 'ETF',
    category: 'Debt & Gilt',
    subCategory: 'Long-Duration U.S. Sovereign Debt ETF',
    currency: 'USD',
    price: 91.48,
    change: 0.64,
    changePct: 0.7,
    lastUpdateLabel: 'Last update at 06:29 GMT+5:30',
    extendedPrice: 91.82,
    extendedChange: 0.34,
    extendedChangePct: 0.37,
    extendedLabel: 'Pre-market',
    extendedUpdateLabel: 'Last update at 18:49 GMT+5:30',
    bidLabel: '91.80×1,200',
    askLabel: '91.84×1,140',
    volumeLabel: '38.90 M',
    volumeNumeric: 38.9,
    avgVolume30dLabel: '31.40 M',
    avgVolume30dNumeric: 31.4,
    dayLow: 90.62,
    dayHigh: 91.95,
    week52Low: 85.1,
    week52High: 101.64,
    news: {
      age: '12 hours ago',
      headline:
        'Long-end U.S. Treasury auction sees strong indirect bidder demand as 20Y–30Y curve flattens',
      moreEvents: [
        {
          age: '12 hours ago',
          headline:
            'Long-end U.S. Treasury auction sees strong indirect bidder demand as 20Y–30Y curve flattens',
          source: 'Treasury Wire',
        },
      ],
    },
    keyStats: {
      aumLabel: '54.22 B',
      aumSortUsdB: 54.22,
      dividendYieldPct: 4.18,
      discountPremiumPct: 0.04,
      totalHoldings: 44,
      sharpe3Y: -0.18,
      beta3Y: 0.34,
      trackingErrorPct: 0.08,
      turnoverPct: 24.0,
      maxDrawdown3YPct: -24.6,
    },
    returnsPrice: {
      '1M': 1.85,
      '3M': -1.42,
      YTD: 1.92,
      '1Y': 2.64,
      '3Y': -6.4,
      '5Y': -28.1,
    },
    returnsTotal: {
      '1M': 2.18,
      '3M': -0.36,
      YTD: 5.48,
      '1Y': 6.92,
      '3Y': 5.84,
      '5Y': -14.2,
    },
    seasonals: {
      currentYearLabel: '2026',
      priorYearLabel: '2025',
      twoYearsAgoLabel: '2024',
      currentYear: [-1.1, -0.4, 0.8, -1.9, -0.6, 1.4, 2.8, 3.1, 1.4, 0.9, 1.92],
      priorYear: [-1.8, -2.4, -1.1, -3.5, -1.2, 0.9, 2.1, 3.8, 4.2, 1.8, 2.6, 3.4],
      twoYearsAgo: [-2.1, -3.2, -1.9, -4.8, -2.5, 0.2, 1.9, 4.4, 5.1, 0.6, 1.8, 1.2],
    },
    exposure: [
      { label: 'U.S. Sovereign Treasuries', pct: 99.45, color: '#2563EB' },
      { label: 'Bonds, Cash & Other', pct: 0.55, color: '#7C3AED' },
    ],
    regions: [
      { region: 'North America', pct: 100.0 },
      { region: 'Europe', pct: 0.0 },
      { region: 'Latin America', pct: 0.0 },
      { region: 'Asia', pct: 0.0 },
      { region: 'Africa', pct: 0.0 },
      { region: 'Middle East', pct: 0.0 },
      { region: 'Oceania', pct: 0.0 },
    ],
    technicals: {
      score: 18,
      oscillatorsBuy: 4,
      oscillatorsNeutral: 5,
      oscillatorsSell: 2,
      maBuy: 8,
      maNeutral: 2,
      maSell: 5,
      rsi14: 53.4,
      sma20Relation: 'Above',
      sma50Relation: 'Below',
      macdSignal: 'Neutral',
    },
    optionsVolume: [
      { label: 'Nov 20', calls: 418000, puts: 286000 },
      { label: 'Nov 24', calls: 124000, puts: 89000 },
      { label: 'Nov 27', calls: 168000, puts: 112000 },
      { label: 'Dec 1', calls: 92000, puts: 64000 },
      { label: 'Dec 18', calls: 294000, puts: 196000 },
    ],
    optionsOpenInterest: [
      { label: 'Nov 20', calls: 248000, puts: 192000 },
      { label: 'Nov 24', calls: 74000, puts: 58000 },
      { label: 'Nov 27', calls: 96000, puts: 71000 },
      { label: 'Dec 1', calls: 58000, puts: 44000 },
      { label: 'Dec 18', calls: 214000, puts: 162000 },
    ],
    about: {
      assetClass: 'Fixed Income',
      focus: 'Long-Term U.S. Treasuries (20Y+)',
      expenseRatioPct: 0.15,
      inceptionDate: 'Jul 22, 2002',
      issuer: 'BlackRock / iShares',
      homePage: 'ishares.com',
      homePageUrl: 'https://www.ishares.com/us/products/239454/ishares-20-year-treasury-bond-etf',
      indexTracked: 'ICE U.S. Treasury 20+ Year Bond Index',
      isin: 'US4642874329',
      cusipOrAmfi: '464287432',
      cusipLabel: 'CUSIP',
      figi: 'BBG000BJKYW3',
      cfiCode: 'CEOGBU',
      description:
        'iShares 20+ Year Treasury Bond ETF (TLT) tracks U.S. Treasury bonds with remaining maturities greater than twenty years. Widely used by institutional macro desks to express duration views, hedge equity drawdowns, and harvest sovereign coupon carry.',
    },
  },
  {
    id: 'UTI50',
    symbol: 'UTI50',
    name: 'UTI Nifty 50 Index Fund Direct - Growth',
    exchange: 'AMFI · INDIA',
    instrumentType: 'Mutual Fund',
    category: 'Large Cap',
    subCategory: 'Direct Index Mutual Fund',
    currency: 'INR',
    amfiCode: '120716',
    price: 171.24,
    change: 1.28,
    changePct: 0.75,
    lastUpdateLabel: 'AMFI Daily NAV · 21:30 IST',
    extendedPrice: 171.56,
    extendedChange: 0.32,
    extendedChangePct: 0.19,
    extendedLabel: 'Indicative iNAV',
    extendedUpdateLabel: 'Tracked to NIFTY 50 TRI',
    bidLabel: 'TER 0.18%',
    askLabel: 'Min SIP ₹500',
    volumeLabel: '₹420 Cr',
    volumeNumeric: 420,
    avgVolume30dLabel: '₹390 Cr',
    avgVolume30dNumeric: 390,
    dayLow: 169.96,
    dayHigh: 171.68,
    week52Low: 145.12,
    week52High: 176.4,
    news: {
      age: '10 hours ago',
      headline:
        'Passive Nifty 50 Direct index funds see steady SIP accumulation as low-cost core allocations expand',
      moreEvents: [
        {
          age: '10 hours ago',
          headline:
            'Passive Nifty 50 Direct index funds see steady SIP accumulation as low-cost core allocations expand',
          source: 'AMFI Bulletin',
        },
      ],
    },
    keyStats: {
      aumLabel: '₹21,850 Cr',
      aumSortUsdB: 2.63,
      dividendYieldPct: 0.0,
      discountPremiumPct: 0.0,
      totalHoldings: 50,
      sharpe3Y: 1.15,
      beta3Y: 1.0,
      trackingErrorPct: 0.04,
      turnoverPct: 6.1,
      maxDrawdown3YPct: -11.5,
    },
    returnsPrice: {
      '1M': 1.51,
      '3M': 4.02,
      YTD: 11.85,
      '1Y': 15.62,
      '3Y': 49.4,
      '5Y': 109.2,
    },
    returnsTotal: {
      '1M': 1.51,
      '3M': 4.02,
      YTD: 11.85,
      '1Y': 15.62,
      '3Y': 49.4,
      '5Y': 109.2,
    },
    seasonals: {
      currentYearLabel: '2026',
      priorYearLabel: '2025',
      twoYearsAgoLabel: '2024',
      currentYear: [0.9, 2.0, 2.5, 4.0, 5.4, 7.9, 9.6, 9.1, 10.5, 11.3, 11.85],
      priorYear: [1.2, 2.5, 4.0, 5.6, 7.0, 9.8, 11.7, 12.6, 14.5, 13.3, 15.2, 16.6],
      twoYearsAgo: [-0.3, 1.0, 1.9, 4.4, 6.3, 9.1, 10.6, 10.0, 11.8, 13.2, 15.9, 18.8],
    },
    exposure: [
      { label: 'Stocks', pct: 99.84, color: '#F59E0B' },
      { label: 'Bonds, Cash & Other', pct: 0.16, color: '#7C3AED' },
    ],
    regions: [
      { region: 'North America', pct: 0.0 },
      { region: 'Europe', pct: 0.0 },
      { region: 'Latin America', pct: 0.0 },
      { region: 'Asia', pct: 100.0 },
      { region: 'Africa', pct: 0.0 },
      { region: 'Middle East', pct: 0.0 },
      { region: 'Oceania', pct: 0.0 },
    ],
    technicals: {
      score: 41,
      oscillatorsBuy: 5,
      oscillatorsNeutral: 4,
      oscillatorsSell: 2,
      maBuy: 10,
      maNeutral: 2,
      maSell: 3,
      rsi14: 57.6,
      sma20Relation: 'Above',
      sma50Relation: 'Above',
      macdSignal: 'Bullish',
    },
    optionsNote: 'Benchmark Proxy: NIFTY 50 Index Options Flow',
    optionsVolume: [
      { label: 'Nov 20', calls: 690000, puts: 642000 },
      { label: 'Nov 27', calls: 298000, puts: 274000 },
      { label: 'Dec 04', calls: 148000, puts: 136000 },
      { label: 'Dec 25', calls: 242000, puts: 228000 },
    ],
    optionsOpenInterest: [
      { label: 'Nov 20', calls: 254000, puts: 278000 },
      { label: 'Nov 27', calls: 168000, puts: 179000 },
      { label: 'Dec 04', calls: 78000, puts: 71000 },
      { label: 'Dec 25', calls: 158000, puts: 172000 },
    ],
    about: {
      assetClass: 'Equity',
      focus: 'Large cap Index (India)',
      expenseRatioPct: 0.18,
      inceptionDate: 'Jan 01, 2013',
      issuer: 'UTI Mutual Fund',
      homePage: 'utimf.com',
      homePageUrl: 'https://www.utimf.com',
      indexTracked: 'NIFTY 50 TRI',
      isin: 'INF789F01XA0',
      cusipOrAmfi: '120716',
      cusipLabel: 'AMFI Code',
      figi: 'BBG004S692C1',
      cfiCode: 'CIOGEU',
      description:
        'UTI Nifty 50 Index Fund Direct Plan-Growth delivers systematic, low-cost exposure to India’s benchmark Nifty 50 Total Return Index without needing a Demat brokerage account, enabling automated monthly SIPs with minimal tracking error.',
    },
  },
  ...EXTENDED_SCREENER_FUNDS,
];

/**
 * Computes clamped 0..100 marker position inside a [low, high] range bar.
 */
export function computeRangeMarkerPct(current: number, low: number, high: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(low) || !Number.isFinite(high)) return 50;
  const span = high - low;
  if (span <= 1e-6) return 50;
  const raw = ((current - low) / span) * 100;
  return Math.min(100, Math.max(0, Number(raw.toFixed(1))));
}

/**
 * Maps a -100..+100 technical score to speedometer label, needle angle (-76°..+76°), and color.
 */
export function computeTechnicalGauge(score: number): TechnicalGaugeState {
  const clamped = Math.min(100, Math.max(-100, Number.isFinite(score) ? score : 0));
  const angleDeg = Number(((clamped / 100) * 76).toFixed(1));
  if (clamped <= -55) {
    return { label: 'Strong Sell', angleDeg, colorHex: '#991B1B' };
  }
  if (clamped <= -18) {
    return { label: 'Sell', angleDeg, colorHex: '#EF4444' };
  }
  if (clamped < 18) {
    return { label: 'Neutral', angleDeg, colorHex: '#64748B' };
  }
  if (clamped < 55) {
    return { label: 'Buy', angleDeg, colorHex: '#2563EB' };
  }
  return { label: 'Strong Buy', angleDeg, colorHex: '#1D4ED8' };
}

/**
 * Filters and sorts screener funds cleanly across ETFs & Mutual Funds.
 */
export function filterAndSortScreenerFunds(
  funds: ScreenerFundRecord[],
  filters: ScreenerFilters
): ScreenerFundRecord[] {
  const q = filters.query.trim().toLowerCase();
  const filtered = funds.filter((f) => {
    if (filters.instrumentType !== 'ALL' && f.instrumentType !== filters.instrumentType) {
      return false;
    }
    if (filters.category !== 'All' && f.category !== filters.category) {
      return false;
    }
    if (!q) return true;
    const hay = `${f.symbol} ${f.name} ${f.category} ${f.about.issuer} ${f.about.isin} ${f.amfiCode || ''}`.toLowerCase();
    return hay.includes(q);
  });

  const sorted = [...filtered];
  if (filters.sortBy === 'aum') {
    sorted.sort((a, b) => b.keyStats.aumSortUsdB - a.keyStats.aumSortUsdB);
  } else if (filters.sortBy === 'return1y') {
    sorted.sort((a, b) => (b.returnsTotal['1Y'] ?? -999) - (a.returnsTotal['1Y'] ?? -999));
  } else if (filters.sortBy === 'return3y') {
    sorted.sort((a, b) => (b.returnsTotal['3Y'] ?? -999) - (a.returnsTotal['3Y'] ?? -999));
  } else if (filters.sortBy === 'expense') {
    sorted.sort((a, b) => a.about.expenseRatioPct - b.about.expenseRatioPct);
  } else if (filters.sortBy === 'change') {
    sorted.sort((a, b) => b.changePct - a.changePct);
  }
  return sorted;
}

/**
 * Computes exact normalized strokeDasharray/offset geometry for an SVG ring donut chart.
 */
export function computeDonutArcs(
  slices: ScreenerExposureSlice[],
  radius: number
): Array<ScreenerExposureSlice & { dashArray: string; dashOffset: number }> {
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.pct), 0) || 100;
  let cumulative = 0;

  return slices.map((slice) => {
    const ratio = Math.max(0, slice.pct) / total;
    const segLen = ratio * circumference;
    const dashOffset = -cumulative;
    cumulative += segLen;
    return {
      ...slice,
      dashArray: `${segLen.toFixed(2)} ${(circumference - segLen).toFixed(2)}`,
      dashOffset: Number(dashOffset.toFixed(2)),
    };
  });
}

/**
 * Merges live AMFI /api/mfnav/fund/:code response into a ScreenerFundRecord without breaking fields.
 */
export function mergeLiveAmfiIntoScreenerFund(
  fund: ScreenerFundRecord,
  payload: {
    latest_nav?: number;
    latest_nav_date?: string;
    daily_metrics?: {
      return_1d?: number | null;
      return_1m?: number | null;
      return_3m?: number | null;
      return_1y?: number | null;
      cagr_3y?: number | null;
      cagr_5y?: number | null;
      max_drawdown_3y?: number | null;
      aum_crores?: number | null;
    };
  }
): ScreenerFundRecord {
  const latestNav =
    typeof payload.latest_nav === 'number' && Number.isFinite(payload.latest_nav) && payload.latest_nav > 0
      ? Number(payload.latest_nav.toFixed(2))
      : fund.price;
  const dm = payload.daily_metrics || {};
  const toPct = (v: number | null | undefined, fallback: number | null): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) {
      return Number((v * 100).toFixed(2));
    }
    return fallback;
  };
  const r1d = toPct(dm.return_1d, fund.changePct) ?? fund.changePct;
  const change = Number(((latestNav * r1d) / 100).toFixed(2));
  const r1m = toPct(dm.return_1m, fund.returnsPrice['1M']);
  const r3m = toPct(dm.return_3m, fund.returnsPrice['3M']);
  const r1y = toPct(dm.return_1y, fund.returnsPrice['1Y']);
  const c3y = toPct(dm.cagr_3y, null);
  const cum3y =
    c3y !== null ? Number(((Math.pow(1 + c3y / 100, 3) - 1) * 100).toFixed(2)) : fund.returnsPrice['3Y'];
  const c5y = toPct(dm.cagr_5y, null);
  const cum5y =
    c5y !== null ? Number(((Math.pow(1 + c5y / 100, 5) - 1) * 100).toFixed(2)) : fund.returnsPrice['5Y'];
  const maxDd = toPct(dm.max_drawdown_3y, fund.keyStats.maxDrawdown3YPct) ?? fund.keyStats.maxDrawdown3YPct;
  const aumCrores =
    typeof dm.aum_crores === 'number' && Number.isFinite(dm.aum_crores) && dm.aum_crores > 0
      ? dm.aum_crores
      : null;

  return {
    ...fund,
    price: latestNav,
    change,
    changePct: r1d,
    lastUpdateLabel: payload.latest_nav_date
      ? `AMFI Official NAV · ${payload.latest_nav_date}`
      : fund.lastUpdateLabel,
    keyStats: {
      ...fund.keyStats,
      aumLabel: aumCrores ? `₹${Math.round(aumCrores).toLocaleString('en-IN')} Cr` : fund.keyStats.aumLabel,
      maxDrawdown3YPct: maxDd > 0 ? -maxDd : maxDd,
    },
    returnsPrice: {
      ...fund.returnsPrice,
      '1M': r1m,
      '3M': r3m,
      '1Y': r1y,
      '3Y': cum3y,
      '5Y': cum5y,
    },
    returnsTotal: {
      ...fund.returnsTotal,
      '1M': r1m,
      '3M': r3m,
      '1Y': r1y,
      '3Y': cum3y,
      '5Y': cum5y,
    },
  };
}
