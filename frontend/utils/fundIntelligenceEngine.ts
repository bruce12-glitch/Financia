import { ScreenerFundRecord } from './screenerEngine';
import { EXTENDED_FUND_INTELLIGENCE } from './extendedScreenerFunds';
import type { PillarSector, StockQuote } from '../types/financia';

export interface FundManagerProfile {
  leadManager: string;
  coManagers: string[];
  tenureYears: number;
  experienceYears: number;
  amcAumManaged: string;
  investmentStyle: string;
  exitLoad: string;
  minInvestment: string;
  lockIn: string;
}

export interface FundValidationRatios {
  sortino3Y: number;
  alpha3Y: number;
  stdDev3Y: number;
  informationRatio: number;
  treynorRatio: number;
  rSquared: number;
  upsideCapturePct: number;
  downsideCapturePct: number;
  portfolioPE: number | null;
  portfolioPB: number | null;
  roaePct: number; // Return on Average Equity (or Real Carry / YTM for debt & gold)
  roaPct: number; // Return on Average Assets (or Net Yield after TER)
  roaeLabel: string;
  roaLabel: string;
}

export interface ReturnOnAverageMetrics {
  avgAnnualReturn3Y: number;
  avgAnnualReturn5Y: number;
  rolling3YMeanPct: number;
  categoryPeerAvg3YPct: number;
  excessOverPeerBps: number;
  hitRatePositiveMonthsPct: number;
}

export interface SectorHeatmapItem {
  sector: string;
  weightPct: number;
  change1MPct: number;
  topHolding: string;
  peMultiple: number | null;
}

export interface MonthlyReturnRow {
  year: number;
  months: Array<number | null>; // 12 entries (Jan..Dec)
  annualPct: number;
  monthlyAvgPct: number;
}

export interface ThesisScenario {
  headlineMetricLabel: string;
  headlineMetricValue: string;
  summary: string;
  points: string[];
}

export interface FundHoldingRow {
  name: string;
  ticker: string;
  sector: string;
  weightPct: number;
}

export interface FundIntelligenceProfile {
  symbol: string;
  manager: FundManagerProfile;
  ratios: FundValidationRatios;
  returnOnAverage: ReturnOnAverageMetrics;
  sectorHeatmap: SectorHeatmapItem[];
  monthlyHeatmap: MonthlyReturnRow[];
  bullCase: ThesisScenario;
  bearCase: ThesisScenario;
  baseCaseReturnPct: number;
  topHoldings: FundHoldingRow[];
}

export interface ValidationScoreBreakdown {
  overall: number; // 0..100
  grade: 'Institutional Core' | 'Strong' | 'Balanced' | 'Watchlist';
  subScores: {
    riskAdjusted: number; // 0..100 (weight 30%)
    costEfficiency: number; // 0..100 (weight 25%)
    drawdownControl: number; // 0..100 (weight 25%)
    alphaQuality: number; // 0..100 (weight 20%)
  };
}

export type ComparisonPriorityMode = 'balanced' | 'max_return' | 'lowest_risk' | 'lowest_cost';

export type RiskRatioGrade = 'Institutional' | 'Strong' | 'Moderate' | 'Cautious';

export interface EvaluatedRiskRatio {
  value: number;
  grade: RiskRatioGrade;
  note: string;
}

export interface RiskAdjustedRatioSummary {
  sharpe: EvaluatedRiskRatio;
  sortino: EvaluatedRiskRatio;
  treynor: EvaluatedRiskRatio;
}

export interface EnrichedComparisonFund {
  fund: ScreenerFundRecord;
  intel: FundIntelligenceProfile;
  validation: ValidationScoreBreakdown;
  tenYearFeeDragOn100k: number; // Dollar/Unit drag on 100,000 invested over 10Y at 12% gross CAGR
  tenYearNetWealthOn100k: number; // Projected 10Y value of 100,000 at 3Y avg annual return net of TER
  priorityScore: number; // 0..100 weighted by ComparisonPriorityMode
}

export interface RankedFundVerdict {
  symbol: string;
  name: string;
  rank: number;
  priorityScore: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ComparisonSpreadSummary {
  return3YSpreadPct: number;
  avgAnnualReturn3YSpreadPct: number;
  expenseRatioSpreadPct: number;
  sharpeSpread: number;
  tenYearWealthGapOn100k: number;
}

export interface SectorOverlapRow {
  sector: string;
  weightsBySymbol: Record<string, number>;
  maxWeightPct: number;
  overlapCount: number;
}

export interface MultiFundComparisonResult {
  priorityMode: ComparisonPriorityMode;
  items: EnrichedComparisonFund[];
  winners: {
    lowestExpense: string;
    highestSharpe: string;
    highestSortino: string;
    highestTreynor: string;
    highestAlpha: string;
    highestReturn1Y: string;
    highestReturn3Y: string;
    highestAvgReturn3Y: string;
    lowestDrawdown: string;
    lowestVolatility: string;
    highestRoae: string;
    highestNetWealth10Y: string;
    bestValidationScore: string;
  };
  losers: {
    highestExpense: string;
    lowestSharpe: string;
    lowestSortino: string;
    lowestTreynor: string;
    lowestAlpha: string;
    lowestReturn1Y: string;
    lowestReturn3Y: string;
    lowestAvgReturn3Y: string;
    worstDrawdown: string;
    highestVolatility: string;
    lowestRoae: string;
    lowestNetWealth10Y: string;
    worstValidationScore: string;
  };
  rankings: RankedFundVerdict[];
  bestPick: RankedFundVerdict | null;
  worstPick: RankedFundVerdict | null;
  spreadSummary: ComparisonSpreadSummary;
  sectorOverlapMatrix: SectorOverlapRow[];
  pairwiseOverlapPct: number;
}

export const FUND_INTELLIGENCE_BY_ID: Record<string, FundIntelligenceProfile> = {
  QQQ: {
    symbol: 'QQQ',
    manager: {
      leadManager: 'Peter Hubbard',
      coManagers: ['Michael Jeanette', 'Tony Seisser'],
      tenureYears: 18.4,
      experienceYears: 27,
      amcAumManaged: '$1.84 T',
      investmentStyle: 'Large-Cap Innovation Growth (Passive)',
      exitLoad: 'Nil (Exchange traded)',
      minInvestment: '1 Share (~$645)',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: 1.92,
      alpha3Y: 4.18,
      stdDev3Y: 18.9,
      informationRatio: 0.74,
      treynorRatio: 15.6,
      rSquared: 0.91,
      upsideCapturePct: 121.4,
      downsideCapturePct: 106.2,
      portfolioPE: 31.8,
      portfolioPB: 7.4,
      roaePct: 28.4,
      roaPct: 13.6,
      roaeLabel: 'Portfolio ROAE',
      roaLabel: 'Portfolio ROA',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: 19.38,
      avgAnnualReturn5Y: 16.51,
      rolling3YMeanPct: 18.24,
      categoryPeerAvg3YPct: 14.12,
      excessOverPeerBps: 412,
      hitRatePositiveMonthsPct: 63.9,
    },
    sectorHeatmap: [
      { sector: 'Technology', weightPct: 51.4, change1MPct: -3.2, topHolding: 'Microsoft Corp.', peMultiple: 34.2 },
      { sector: 'Communication Services', weightPct: 15.8, change1MPct: -1.6, topHolding: 'Alphabet Inc.', peMultiple: 23.4 },
      { sector: 'Consumer Discretionary', weightPct: 13.2, change1MPct: -2.4, topHolding: 'Amazon.com', peMultiple: 36.1 },
      { sector: 'Healthcare', weightPct: 6.4, change1MPct: 1.1, topHolding: 'Intuitive Surgical', peMultiple: 28.5 },
      { sector: 'Industrials', weightPct: 4.9, change1MPct: 0.8, topHolding: 'Honeywell Intl', peMultiple: 24.1 },
      { sector: 'Consumer Staples', weightPct: 5.8, change1MPct: 1.4, topHolding: 'Costco Wholesale', peMultiple: 41.2 },
      { sector: 'Utilities & Energy', weightPct: 2.5, change1MPct: 2.1, topHolding: 'Constellation Energy', peMultiple: 22.8 },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [1.9, 2.4, -3.8, -4.1, 5.2, 4.8, 2.6, -1.9, 2.9, 2.1, -6.2, null], annualPct: 4.49, monthlyAvgPct: 0.54 },
      { year: 2025, months: [2.1, 3.8, 1.4, -1.9, 4.2, 3.1, 2.9, -1.2, 2.4, 1.9, 2.6, 1.8], annualPct: 25.3, monthlyAvgPct: 1.93 },
      { year: 2024, months: [1.8, 5.3, 1.2, -4.4, 6.2, 6.1, -1.6, 1.1, 2.5, -0.8, 5.2, 0.4], annualPct: 24.9, monthlyAvgPct: 1.92 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: '+22.5%',
      summary: 'Enterprise AI capex monetization and hyperscaler free-cash-flow expansion re-rate mega-cap multiples higher.',
      points: [
        'Top-10 holdings average 28%+ ROAE with net-cash balance sheets insulated from higher-for-longer credit spreads.',
        'Cloud software and semiconductor earnings revisions outpacing S&P 500 by +640 bps over the next four quarters.',
        'Deep $457B institutional liquidity and tight 1 bp bid-ask spread attract systematic ETF inflows on pullbacks.',
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: '-24.0%',
      summary: 'Multiple compression from 31.8x P/E if long-end Treasury yields spike above 5.0% or AI capex slows.',
      points: [
        'Top-10 concentration (~49% of assets) amplifies idiosyncratic earnings disappointment risk.',
        '1.18 beta and 106.2% downside capture produce sharper drawdowns during rate-driven valuation resets.',
        'Antitrust scrutiny on mega-cap platform distribution could cap operating margin expansion.',
      ],
    },
    baseCaseReturnPct: 13.8,
    topHoldings: [
      { name: 'Apple Inc.', ticker: 'AAPL', sector: 'Technology', weightPct: 8.9 },
      { name: 'NVIDIA Corp.', ticker: 'NVDA', sector: 'Technology', weightPct: 8.6 },
      { name: 'Microsoft Corp.', ticker: 'MSFT', sector: 'Technology', weightPct: 8.1 },
      { name: 'Broadcom Inc.', ticker: 'AVGO', sector: 'Technology', weightPct: 5.4 },
      { name: 'Amazon.com Inc.', ticker: 'AMZN', sector: 'Consumer Discretionary', weightPct: 5.2 },
    ],
  },

  PPFAS: {
    symbol: 'PPFAS',
    manager: {
      leadManager: 'Rajeev Thakkar',
      coManagers: ['Raunak Onkar', 'Raj Mehta', 'Rukun Tarachandani'],
      tenureYears: 13.5,
      experienceYears: 31,
      amcAumManaged: '₹92,400 Cr',
      investmentStyle: 'Value-Oriented Global + Domestic Flexi Cap',
      exitLoad: '2% (<365d), 1% (365–730d), Nil (>730d)',
      minInvestment: '₹1,000 SIP / Lump Sum',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: 2.64,
      alpha3Y: 6.42,
      stdDev3Y: 11.4,
      informationRatio: 1.18,
      treynorRatio: 23.1,
      rSquared: 0.78,
      upsideCapturePct: 102.8,
      downsideCapturePct: 61.4,
      portfolioPE: 19.6,
      portfolioPB: 3.8,
      roaePct: 22.9,
      roaPct: 11.4,
      roaeLabel: 'Portfolio ROAE',
      roaLabel: 'Portfolio ROA',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: 23.85,
      avgAnnualReturn5Y: 21.94,
      rolling3YMeanPct: 22.41,
      categoryPeerAvg3YPct: 17.65,
      excessOverPeerBps: 476,
      hitRatePositiveMonthsPct: 72.2,
    },
    sectorHeatmap: [
      { sector: 'Financials', weightPct: 34.8, change1MPct: 1.9, topHolding: 'HDFC Bank', peMultiple: 16.8 },
      { sector: 'Technology', weightPct: 21.6, change1MPct: 0.7, topHolding: 'Alphabet / Microsoft', peMultiple: 24.5 },
      { sector: 'Energy & Utilities', weightPct: 13.4, change1MPct: 2.3, topHolding: 'Coal India / Power Grid', peMultiple: 11.2 },
      { sector: 'Consumer Staples', weightPct: 8.9, change1MPct: 1.2, topHolding: 'ITC Ltd.', peMultiple: 27.4 },
      { sector: 'Automobiles', weightPct: 6.5, change1MPct: -0.9, topHolding: 'Bajaj Holdings', peMultiple: 18.6 },
      { sector: 'Cash & T-Bills', weightPct: 14.8, change1MPct: 0.5, topHolding: '91-Day Sovereign T-Bills', peMultiple: null },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [1.4, 1.9, 0.8, 2.2, 1.7, 2.8, 1.5, 0.9, 1.6, 1.2, 0.8, null], annualPct: 17.9, monthlyAvgPct: 1.53 },
      { year: 2025, months: [2.2, 1.6, 2.8, 1.9, 3.1, 2.4, 1.8, -0.6, 2.1, -1.4, 2.3, 1.9], annualPct: 21.9, monthlyAvgPct: 1.68 },
      { year: 2024, months: [1.9, 2.4, 1.5, 1.8, 2.6, 3.8, 2.7, 1.4, 2.2, -2.1, 1.9, 1.1], annualPct: 23.2, monthlyAvgPct: 1.77 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: '+24.0%',
      summary: 'Discounted private-bank re-rating plus disciplined 14.8% T-Bill dry powder deployed during corrections.',
      points: [
        'Industry-leading 61.4% downside capture protects compounding during Nifty drawdowns.',
        'Direct Plan 0.63% TER saves ~70 bps annually vs Regular Plan, compounding meaningfully over 10+ years.',
        'Global mega-cap sleeve (~16%) provides natural USD currency hedge and uncorrelated cash-flow quality.',
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: '-14.5%',
      summary: 'Large AUM size (~₹88k Cr) limits agility into smaller mid-caps and RBI overseas cap restricts global additions.',
      points: [
        'High cash/arbitrage buffer (14.8%) can lag sharply during speculative momentum rallies.',
        'SEBI overseas mutual fund limit caps fresh deployment into US tech compounders.',
        'Heavy Indian private banking allocation (~34.8%) faces near-term NIM compression if RBI cuts rates aggressively.',
      ],
    },
    baseCaseReturnPct: 16.5,
    topHoldings: [
      { name: 'HDFC Bank Ltd.', ticker: 'HDFCBANK', sector: 'Financials', weightPct: 8.1 },
      { name: 'Bajaj Holdings & Investment', ticker: 'BAJAJHLDNG', sector: 'Financials', weightPct: 7.2 },
      { name: 'Coal India Ltd.', ticker: 'COALINDIA', sector: 'Energy & Utilities', weightPct: 6.1 },
      { name: 'Power Grid Corp.', ticker: 'POWERGRID', sector: 'Energy & Utilities', weightPct: 5.9 },
      { name: 'ITC Ltd.', ticker: 'ITC', sector: 'Consumer Staples', weightPct: 5.6 },
    ],
  },

  SPY: {
    symbol: 'SPY',
    manager: {
      leadManager: 'Karl Schneider',
      coManagers: ['Emil Wolter', 'SSGA Global Equity Beta Team'],
      tenureYears: 20.1,
      experienceYears: 29,
      amcAumManaged: '$4.72 T',
      investmentStyle: 'Core US Large-Cap Blend (Passive)',
      exitLoad: 'Nil (Exchange traded)',
      minInvestment: '1 Share (~$614)',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: 1.78,
      alpha3Y: 0.04,
      stdDev3Y: 14.6,
      informationRatio: 0.12,
      treynorRatio: 13.8,
      rSquared: 1.0,
      upsideCapturePct: 99.9,
      downsideCapturePct: 100.0,
      portfolioPE: 24.4,
      portfolioPB: 4.8,
      roaePct: 21.6,
      roaPct: 9.8,
      roaeLabel: 'Portfolio ROAE',
      roaLabel: 'Portfolio ROA',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: 15.84,
      avgAnnualReturn5Y: 14.42,
      rolling3YMeanPct: 14.95,
      categoryPeerAvg3YPct: 13.88,
      excessOverPeerBps: 107,
      hitRatePositiveMonthsPct: 66.7,
    },
    sectorHeatmap: [
      { sector: 'Technology', weightPct: 31.8, change1MPct: -1.8, topHolding: 'Apple / NVIDIA', peMultiple: 31.5 },
      { sector: 'Financials', weightPct: 13.6, change1MPct: 2.1, topHolding: 'Berkshire Hathaway', peMultiple: 16.4 },
      { sector: 'Healthcare', weightPct: 11.4, change1MPct: 0.9, topHolding: 'Eli Lilly', peMultiple: 21.9 },
      { sector: 'Consumer Discretionary', weightPct: 10.6, change1MPct: -1.1, topHolding: 'Amazon.com', peMultiple: 28.2 },
      { sector: 'Communication Services', weightPct: 9.2, change1MPct: -0.7, topHolding: 'Meta Platforms', peMultiple: 22.1 },
      { sector: 'Industrials', weightPct: 8.6, change1MPct: 1.6, topHolding: 'GE Aerospace', peMultiple: 23.4 },
      { sector: 'Staples, Energy & Other', weightPct: 14.8, change1MPct: 1.2, topHolding: 'Exxon Mobil', peMultiple: 17.9 },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [1.6, 1.8, -2.1, -1.9, 3.2, 2.7, 1.9, -0.8, 1.4, 1.1, -1.4, null], annualPct: 7.45, monthlyAvgPct: 0.68 },
      { year: 2025, months: [2.4, 1.9, 1.1, -1.2, 2.8, 2.3, 1.7, 0.9, 1.6, -0.7, 2.4, 1.5], annualPct: 17.9, monthlyAvgPct: 1.39 },
      { year: 2024, months: [1.6, 5.2, 3.1, -4.1, 4.9, 3.5, 1.2, 2.3, 2.1, -0.9, 5.8, -2.4], annualPct: 24.1, monthlyAvgPct: 1.85 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: '+16.5%',
      summary: 'Broadening S&P 500 earnings breadth across financials, industrials, and healthcare supports resilient compounding.',
      points: [
        'Ultra-low 0.09% expense ratio and $634B AUM ensure zero structural friction for core allocation.',
        'R² of 1.00 and 0.02% tracking error guarantee pure institutional benchmark capture.',
        'Corporate buybacks exceeding $900B annualized provide steady structural bid.',
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: '-19.5%',
      summary: 'Above-average 24.4x trailing P/E leaves slim margin of safety if US real GDP slows into stagnation.',
      points: [
        'Top-7 technology companies account for ~31% of index weight, raising correlation to rate shocks.',
        'Unit-investment-trust structure cannot reinvest intraday dividends immediately during strong uptrends.',
        'Tariff or fiscal deficit pressures could steepen long-end yields and compress equity risk premia.',
      ],
    },
    baseCaseReturnPct: 10.6,
    topHoldings: [
      { name: 'Apple Inc.', ticker: 'AAPL', sector: 'Technology', weightPct: 7.1 },
      { name: 'NVIDIA Corp.', ticker: 'NVDA', sector: 'Technology', weightPct: 6.7 },
      { name: 'Microsoft Corp.', ticker: 'MSFT', sector: 'Technology', weightPct: 6.3 },
      { name: 'Amazon.com Inc.', ticker: 'AMZN', sector: 'Consumer Discretionary', weightPct: 3.9 },
      { name: 'Meta Platforms Inc.', ticker: 'META', sector: 'Communication Services', weightPct: 2.6 },
    ],
  },

  GOLDBEES: {
    symbol: 'GOLDBEES',
    manager: {
      leadManager: 'Vikram Dhawan',
      coManagers: ['Nippon India Commodity Desk'],
      tenureYears: 11.2,
      experienceYears: 24,
      amcAumManaged: '₹5.42 L Cr',
      investmentStyle: '100% Physical 99.5% LBMA Bullion Backed',
      exitLoad: 'Nil (NSE/BSE Exchange traded)',
      minInvestment: '1 Unit (~₹76)',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: 2.38,
      alpha3Y: 0.42,
      stdDev3Y: 11.8,
      informationRatio: 0.36,
      treynorRatio: 28.4,
      rSquared: 0.99,
      upsideCapturePct: 99.4,
      downsideCapturePct: 98.2,
      portfolioPE: null,
      portfolioPB: null,
      roaePct: 16.4,
      roaPct: 15.6,
      roaeLabel: '3Y Avg Bullion Carry',
      roaLabel: 'Net Spot Capture',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: 18.42,
      avgAnnualReturn5Y: 14.95,
      rolling3YMeanPct: 16.88,
      categoryPeerAvg3YPct: 16.42,
      excessOverPeerBps: 46,
      hitRatePositiveMonthsPct: 69.4,
    },
    sectorHeatmap: [
      { sector: 'LBMA 99.5% Gold Bars (Vaulted)', weightPct: 98.4, change1MPct: 2.8, topHolding: 'Brinks / Sequel Vault Bullion', peMultiple: null },
      { sector: 'TREPS & Cash Liquidity', weightPct: 1.6, change1MPct: 0.5, topHolding: 'CCIL Overnight TREPS', peMultiple: null },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [2.4, 1.9, 3.1, 1.4, -0.8, 1.7, 2.2, 1.8, 2.6, 1.9, 1.1, null], annualPct: 20.9, monthlyAvgPct: 1.75 },
      { year: 2025, months: [1.8, 2.6, 3.4, 1.2, -1.1, 0.9, 2.4, 2.1, 1.9, 2.8, -1.4, 1.6], annualPct: 19.6, monthlyAvgPct: 1.52 },
      { year: 2024, months: [-0.6, 0.8, 6.9, 3.1, 1.4, -0.2, 2.8, 2.4, 3.9, 4.1, -2.8, 0.7], annualPct: 24.4, monthlyAvgPct: 1.88 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: '+18.5%',
      summary: 'Persistent central bank reserve accumulation (RBI, PBoC) and INR depreciation compound domestic gold NAV.',
      points: [
        'Low correlation (~0.08) to Nifty 50 dramatically reduces multi-asset portfolio tail risk.',
        'Highest exchange liquidity among Indian Gold ETFs ensures tight spreads and minimal NAV discount.',
        'Declining global real yields lower the opportunity cost of holding non-yielding physical bullion.',
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: '-12.0%',
      summary: 'A sharp rebound in US real yields or unexpected INR appreciation could trigger a consolidation.',
      points: [
        'Zero intrinsic cash flow or dividend yield during prolonged disinflationary equity booms.',
        '0.79% expense ratio creates steady annual drag relative to Sovereign Gold Bonds (which pay 2.5% coupon).',
        'Customs duty changes in India can create one-off domestic spot price resets.',
      ],
    },
    baseCaseReturnPct: 12.2,
    topHoldings: [
      { name: 'Physical Gold 995 Purity (1 kg Bars)', ticker: 'XAU-995', sector: 'LBMA Bullion', weightPct: 98.4 },
      { name: 'CCIL TREPS Overnight Cash', ticker: 'TREPS', sector: 'Liquidity', weightPct: 1.6 },
    ],
  },

  HDFCMID: {
    symbol: 'HDFCMID',
    manager: {
      leadManager: 'Chirag Setalvad',
      coManagers: ['Dhruv Muchhal'],
      tenureYears: 17.8,
      experienceYears: 28,
      amcAumManaged: '₹7.85 L Cr',
      investmentStyle: 'GARP Mid-Cap Active Stock Selection',
      exitLoad: '1% if redeemed within 365 days',
      minInvestment: '₹100 SIP / Lump Sum',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: 2.41,
      alpha3Y: 5.84,
      stdDev3Y: 14.9,
      informationRatio: 1.12,
      treynorRatio: 24.8,
      rSquared: 0.89,
      upsideCapturePct: 108.4,
      downsideCapturePct: 76.5,
      portfolioPE: 24.8,
      portfolioPB: 4.3,
      roaePct: 20.6,
      roaPct: 9.4,
      roaeLabel: 'Portfolio ROAE',
      roaLabel: 'Portfolio ROA',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: 27.14,
      avgAnnualReturn5Y: 26.82,
      rolling3YMeanPct: 25.45,
      categoryPeerAvg3YPct: 21.80,
      excessOverPeerBps: 365,
      hitRatePositiveMonthsPct: 69.4,
    },
    sectorHeatmap: [
      { sector: 'Financials', weightPct: 24.2, change1MPct: 2.1, topHolding: 'Max Financial / Indian Bank', peMultiple: 17.2 },
      { sector: 'Industrials & Capital Goods', weightPct: 21.4, change1MPct: 1.4, topHolding: 'Bharat Electronics / Cummins', peMultiple: 31.6 },
      { sector: 'Healthcare', weightPct: 13.8, change1MPct: 2.6, topHolding: 'Max Healthcare / Glenmark', peMultiple: 29.4 },
      { sector: 'Automobiles & Ancillaries', weightPct: 12.1, change1MPct: -0.6, topHolding: 'Balkrishna Industries', peMultiple: 23.8 },
      { sector: 'Technology', weightPct: 10.6, change1MPct: 0.9, topHolding: 'Coforge / Persistent', peMultiple: 32.1 },
      { sector: 'Consumer & Chemicals', weightPct: 11.7, change1MPct: -1.2, topHolding: 'Indian Hotels', peMultiple: 27.9 },
      { sector: 'Cash & Debt', weightPct: 6.2, change1MPct: 0.5, topHolding: 'TREPS / T-Bills', peMultiple: null },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [1.8, 2.6, -1.4, 3.1, 2.4, 3.6, 1.9, 1.2, 2.3, -1.8, 1.6, null], annualPct: 18.6, monthlyAvgPct: 1.57 },
      { year: 2025, months: [2.8, 1.4, 2.1, 3.6, 2.9, 4.2, 2.1, 1.3, 1.8, -3.2, 2.4, 2.1], annualPct: 25.9, monthlyAvgPct: 1.96 },
      { year: 2024, months: [3.2, 1.8, -0.9, 4.4, 2.7, 5.1, 3.8, 1.9, 2.4, -4.6, 2.1, 1.8], annualPct: 26.0, monthlyAvgPct: 1.98 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: '+26.5%',
      summary: 'Domestic capex, defense indigenization, and healthcare formalization drive multi-year mid-cap earnings upgrades.',
      points: [
        'Chirag Setalvad brings 17.8 years of uninterrupted stewardship across multiple full market cycles.',
        'Balanced GARP discipline keeps portfolio P/E ~18% below Nifty Midcap 150 index multiples.',
        'Consistent +365 bps rolling 3Y excess return over category peer medians with 76.5% downside capture.',
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: '-22.5%',
      summary: 'Large ₹76k+ Cr mid-cap corpus creates liquidity friction during broad domestic retail SIP redemptions.',
      points: [
        'Indian mid-cap segment valuations remain sensitive to FII outflows or domestic earnings deceleration.',
        'Higher volatility (14.9% std dev) requires a minimum 5-year holding horizon to smooth cyclical dips.',
        'Exit load of 1% within 365 days penalizes short-term tactical rotation.',
      ],
    },
    baseCaseReturnPct: 18.4,
    topHoldings: [
      { name: 'Indian Bank', ticker: 'INDIANB', sector: 'Financials', weightPct: 4.4 },
      { name: 'Max Financial Services', ticker: 'MFSL', sector: 'Financials', weightPct: 4.2 },
      { name: 'Coforge Ltd.', ticker: 'COFORGE', sector: 'Technology', weightPct: 3.9 },
      { name: 'Bharat Electronics Ltd.', ticker: 'BEL', sector: 'Industrials', weightPct: 3.6 },
      { name: 'Balkrishna Industries', ticker: 'BALKRISIND', sector: 'Automobiles', weightPct: 3.3 },
    ],
  },

  NIFTYBEES: {
    symbol: 'NIFTYBEES',
    manager: {
      leadManager: 'Himanshu Mange',
      coManagers: ['Nippon India Passive Equity Team'],
      tenureYears: 8.6,
      experienceYears: 14,
      amcAumManaged: '₹5.42 L Cr',
      investmentStyle: 'India Core Large-Cap Index Replication',
      exitLoad: 'Nil (NSE/BSE Exchange traded)',
      minInvestment: '1 Unit (~₹290)',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: 1.84,
      alpha3Y: -0.04,
      stdDev3Y: 12.6,
      informationRatio: -0.18,
      treynorRatio: 14.9,
      rSquared: 1.0,
      upsideCapturePct: 99.8,
      downsideCapturePct: 100.1,
      portfolioPE: 22.1,
      portfolioPB: 3.6,
      roaePct: 17.8,
      roaPct: 7.6,
      roaeLabel: 'Portfolio ROAE',
      roaLabel: 'Portfolio ROA',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: 15.12,
      avgAnnualReturn5Y: 15.94,
      rolling3YMeanPct: 14.85,
      categoryPeerAvg3YPct: 14.62,
      excessOverPeerBps: 23,
      hitRatePositiveMonthsPct: 66.7,
    },
    sectorHeatmap: [
      { sector: 'Financials', weightPct: 33.9, change1MPct: 1.8, topHolding: 'HDFC Bank / ICICI Bank', peMultiple: 17.4 },
      { sector: 'Technology', weightPct: 13.8, change1MPct: 0.6, topHolding: 'Infosys / TCS', peMultiple: 26.8 },
      { sector: 'Energy & Oil/Gas', weightPct: 11.4, change1MPct: 1.1, topHolding: 'Reliance Industries', peMultiple: 19.6 },
      { sector: 'Consumer Staples', weightPct: 8.6, change1MPct: 0.9, topHolding: 'ITC / HUL', peMultiple: 36.2 },
      { sector: 'Automobiles', weightPct: 7.8, change1MPct: -0.4, topHolding: 'Mahindra & Mahindra', peMultiple: 23.1 },
      { sector: 'Industrials & Infra', weightPct: 9.2, change1MPct: 1.7, topHolding: 'Larsen & Toubro', peMultiple: 28.4 },
      { sector: 'Telecom, Pharma & Metals', weightPct: 15.3, change1MPct: 1.5, topHolding: 'Bharti Airtel / Sun Pharma', peMultiple: 27.6 },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [1.2, 1.5, -0.8, 2.1, 1.9, 2.6, 1.4, 0.8, 1.7, -1.2, 1.1, null], annualPct: 12.9, monthlyAvgPct: 1.12 },
      { year: 2025, months: [1.6, 1.2, 1.8, 1.4, 2.1, 3.4, 1.9, 0.8, 1.5, -2.9, 1.6, 1.4], annualPct: 16.8, monthlyAvgPct: 1.32 },
      { year: 2024, months: [0.1, 1.2, 1.6, 1.2, -0.3, 6.6, 3.9, 1.1, 2.3, -6.2, -0.3, -2.0], annualPct: 9.0, monthlyAvgPct: 0.77 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: '+17.0%',
      summary: 'India’s structural 6.5%+ GDP growth and record domestic institutional SIP inflows underpin Nifty 50 earnings.',
      points: [
        'Rock-bottom 0.04% expense ratio preserves 99.96% of benchmark Total Return Index compounding.',
        'India’s oldest and most liquid equity ETF with 0.03% tracking error and tight NSE orderbook depth.',
        'Bank balance sheets at decadal-low NPAs support credit growth across the 33.9% Financials core.',
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: '-16.5%',
      summary: 'Global risk-off episodes or crude oil spikes above $95/bbl can trigger foreign portfolio outflows.',
      points: [
        'Heavy Financials (33.9%) + IT (13.8%) tilt ties nearly half the index to rate cycles and US IT budgets.',
        'No active cash buffer (100% invested) means full 100% downside participation during corrections.',
        'Requires Demat account and brokerage discipline to avoid market-order slippage during volatile opens.',
      ],
    },
    baseCaseReturnPct: 13.0,
    topHoldings: [
      { name: 'HDFC Bank Ltd.', ticker: 'HDFCBANK', sector: 'Financials', weightPct: 12.1 },
      { name: 'ICICI Bank Ltd.', ticker: 'ICICIBANK', sector: 'Financials', weightPct: 8.6 },
      { name: 'Reliance Industries', ticker: 'RELIANCE', sector: 'Energy', weightPct: 8.4 },
      { name: 'Infosys Ltd.', ticker: 'INFY', sector: 'Technology', weightPct: 6.1 },
      { name: 'Bharti Airtel Ltd.', ticker: 'BHARTIARTL', sector: 'Telecom', weightPct: 4.3 },
    ],
  },

  SBIGILT: {
    symbol: 'SBIGILT',
    manager: {
      leadManager: 'Dinesh Ahuja',
      coManagers: ['SBI Fixed Income Sovereign Desk'],
      tenureYears: 14.2,
      experienceYears: 26,
      amcAumManaged: '₹11.1 L Cr',
      investmentStyle: 'Active Sovereign G-Sec Duration Management',
      exitLoad: 'Nil',
      minInvestment: '₹500 SIP / ₹5,000 Lump Sum',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: 1.96,
      alpha3Y: 1.12,
      stdDev3Y: 3.8,
      informationRatio: 0.68,
      treynorRatio: 9.4,
      rSquared: 0.92,
      upsideCapturePct: 109.2,
      downsideCapturePct: 84.1,
      portfolioPE: null,
      portfolioPB: null,
      roaePct: 7.18,
      roaPct: 6.72,
      roaeLabel: 'Portfolio YTM',
      roaLabel: 'Net Yield (Post TER)',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: 8.92,
      avgAnnualReturn5Y: 7.64,
      rolling3YMeanPct: 8.41,
      categoryPeerAvg3YPct: 7.72,
      excessOverPeerBps: 69,
      hitRatePositiveMonthsPct: 77.8,
    },
    sectorHeatmap: [
      { sector: 'Central Govt G-Secs (7–15Y)', weightPct: 64.2, change1MPct: 0.9, topHolding: '7.10% GOI 2034', peMultiple: null },
      { sector: 'Long-Duration G-Secs (15Y+)', weightPct: 24.8, change1MPct: 1.3, topHolding: '7.30% GOI 2053', peMultiple: null },
      { sector: 'State Development Loans (SDL)', weightPct: 6.4, change1MPct: 0.6, topHolding: 'Maharashtra SDL 2033', peMultiple: null },
      { sector: 'TREPS & Sovereign T-Bills', weightPct: 4.6, change1MPct: 0.5, topHolding: '91-Day GOI T-Bill', peMultiple: null },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [0.8, 0.7, 0.9, 0.6, 1.1, 0.8, 0.5, 0.9, 0.7, 0.6, 0.5, null], annualPct: 8.42, monthlyAvgPct: 0.74 },
      { year: 2025, months: [0.9, 0.6, 0.8, 0.5, 1.2, 0.9, 0.7, 0.8, 1.1, -0.3, 0.7, 0.8], annualPct: 9.04, monthlyAvgPct: 0.73 },
      { year: 2024, months: [1.1, 0.7, 0.6, -0.4, 1.3, 0.8, 0.9, 1.0, 1.2, -0.2, 0.6, 0.7], annualPct: 8.62, monthlyAvgPct: 0.69 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: '+10.8%',
      summary: 'RBI policy rate easing and JP Morgan / Bloomberg Global Bond Index inflows compress 10Y G-Sec yields.',
      points: [
        '100% sovereign credit quality eliminates corporate default and downgrade risk completely.',
        '6.4-year modified duration delivers ~+320 bps capital appreciation for every 50 bps drop in yields.',
        '7.18% gross YTM provides attractive accrual floor even if bond yields move sideways.',
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: '-5.4%',
      summary: 'Sticky food inflation or fiscal slippage pushing 10Y India G-Sec yields up +75 bps creates MTM drag.',
      points: [
        'Active long duration exposes NAV to mark-to-market volatility during hawkish RBI pauses.',
        'Debt mutual fund gains taxed at investor slab rate reduce post-tax edge for top-bracket holders.',
        'Global US Treasury yield spikes can spill over into emerging-market sovereign curves.',
      ],
    },
    baseCaseReturnPct: 8.1,
    topHoldings: [
      { name: '7.10% Government of India 2034', ticker: 'IN0020240019', sector: 'Central G-Sec', weightPct: 26.4 },
      { name: '7.30% Government of India 2053', ticker: 'IN0020230051', sector: 'Long G-Sec', weightPct: 18.2 },
      { name: '7.18% Government of India 2037', ticker: 'IN0020230077', sector: 'Central G-Sec', weightPct: 16.8 },
      { name: '7.23% Government of India 2039', ticker: 'IN0020240027', sector: 'Central G-Sec', weightPct: 14.1 },
      { name: 'CCIL TREPS Liquidity', ticker: 'TREPS', sector: 'Cash', weightPct: 4.6 },
    ],
  },

  GLD: {
    symbol: 'GLD',
    manager: {
      leadManager: 'World Gold Trust Services',
      coManagers: ['HSBC Bank plc (Custodian)', 'SSGA Marketing Agent'],
      tenureYears: 21.5,
      experienceYears: 22,
      amcAumManaged: '$94.6 B',
      investmentStyle: '100% Allocated London Good Delivery Bullion',
      exitLoad: 'Nil (NYSE Arca Exchange traded)',
      minInvestment: '1 Share (~$296)',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: 2.18,
      alpha3Y: -0.40,
      stdDev3Y: 13.4,
      informationRatio: -0.32,
      treynorRatio: 24.6,
      rSquared: 0.99,
      upsideCapturePct: 99.6,
      downsideCapturePct: 100.2,
      portfolioPE: null,
      portfolioPB: null,
      roaePct: 15.8,
      roaPct: 15.4,
      roaeLabel: '3Y Avg Spot Return',
      roaLabel: 'Net Bullion Capture',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: 17.95,
      avgAnnualReturn5Y: 12.84,
      rolling3YMeanPct: 15.62,
      categoryPeerAvg3YPct: 15.48,
      excessOverPeerBps: 14,
      hitRatePositiveMonthsPct: 66.7,
    },
    sectorHeatmap: [
      { sector: 'Allocated London Good Delivery Bars', weightPct: 99.9, change1MPct: 3.1, topHolding: 'HSBC London Vaults', peMultiple: null },
      { sector: 'Operational Cash Buffer', weightPct: 0.1, change1MPct: 0.4, topHolding: 'USD Custody Cash', peMultiple: null },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [2.8, 2.1, 3.4, 1.2, -1.1, 1.9, 2.5, 1.6, 2.9, 1.4, 0.9, null], annualPct: 21.3, monthlyAvgPct: 1.78 },
      { year: 2025, months: [1.6, 2.4, 3.9, 1.5, -0.8, 0.6, 2.7, 2.2, 2.4, 3.1, -2.1, 1.3], annualPct: 20.1, monthlyAvgPct: 1.57 },
      { year: 2024, months: [-1.1, 0.3, 8.9, 2.5, 1.8, -0.1, 4.1, 2.2, 5.2, 4.1, -3.4, -0.7], annualPct: 25.8, monthlyAvgPct: 1.98 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: '+19.0%',
      summary: 'Sovereign debt expansion and global reserve diversification sustain structural demand for physical gold.',
      points: [
        'World’s deepest physical gold ETF ($94.6B AUM) with unmatched options chain liquidity for hedging.',
        'Bar-by-bar audited allocated London vaults eliminate counterparty credit exposure.',
        'Proven crisis alpha during equity drawdowns and geopolitical energy shocks.',
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: '-14.0%',
      summary: 'Stronger US dollar (DXY) and hawkish Fed real-rate surprises historically pressure USD bullion.',
      points: [
        '0.40% annual expense ratio is higher than ultra-low-cost mini-gold alternatives (0.10%).',
        'Generates zero income; relies solely on spot price appreciation.',
        'Crowded speculative futures positioning can trigger sharp 8–12% air-pocket pullbacks.',
      ],
    },
    baseCaseReturnPct: 11.4,
    topHoldings: [
      { name: 'Allocated Gold Bullion (HSBC London)', ticker: 'XAU', sector: 'Physical Bullion', weightPct: 99.9 },
      { name: 'Trust Custody Cash', ticker: 'USD', sector: 'Liquidity', weightPct: 0.1 },
    ],
  },

  TLT: {
    symbol: 'TLT',
    manager: {
      leadManager: 'James Mauro',
      coManagers: ['Karen Uyehara', 'BlackRock Fixed Income Indexing'],
      tenureYears: 15.3,
      experienceYears: 24,
      amcAumManaged: '$10.6 T',
      investmentStyle: '20+ Year US Treasury Sovereign Duration',
      exitLoad: 'Nil (NASDAQ Exchange traded)',
      minInvestment: '1 Share (~$91)',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: 0.24,
      alpha3Y: -0.15,
      stdDev3Y: 15.8,
      informationRatio: -0.12,
      treynorRatio: 2.1,
      rSquared: 0.99,
      upsideCapturePct: 99.5,
      downsideCapturePct: 100.3,
      portfolioPE: null,
      portfolioPB: null,
      roaePct: 4.78,
      roaPct: 4.63,
      roaeLabel: '30-Day SEC Yield',
      roaLabel: 'Net Distribution Yield',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: 1.42,
      avgAnnualReturn5Y: -3.18,
      rolling3YMeanPct: 1.15,
      categoryPeerAvg3YPct: 0.98,
      excessOverPeerBps: 17,
      hitRatePositiveMonthsPct: 52.8,
    },
    sectorHeatmap: [
      { sector: 'US Treasury 20–25Y Bonds', weightPct: 48.6, change1MPct: -1.4, topHolding: 'US Treasury 4.625% 2044', peMultiple: null },
      { sector: 'US Treasury 25–30Y Bonds', weightPct: 50.8, change1MPct: -1.8, topHolding: 'US Treasury 4.750% 2053', peMultiple: null },
      { sector: 'Treasury Bills & Cash', weightPct: 0.6, change1MPct: 0.4, topHolding: 'BlackRock Treasury Trust', peMultiple: null },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [-1.2, 1.8, -0.9, -2.4, 1.9, 1.4, 2.2, 1.6, -1.8, -2.1, 0.8, null], annualPct: 1.12, monthlyAvgPct: 0.12 },
      { year: 2025, months: [0.9, 1.6, -1.4, -2.8, 2.1, 1.5, 2.9, 1.8, 1.4, -3.4, 1.2, -0.9], annualPct: 4.68, monthlyAvgPct: 0.41 },
      { year: 2024, months: [-2.2, -2.3, 0.8, -6.4, 2.9, 1.8, 3.6, 2.1, 1.9, -5.5, 1.9, -6.2], annualPct: -8.12, monthlyAvgPct: -0.63 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: '+18.0%',
      summary: 'Convexity payoff (+16.5Y duration) plus ~4.78% monthly coupon delivers powerful equity-crash hedge.',
      points: [
        'A 100 bps decline in 30Y Treasury yields generates roughly +16% price gain on top of 4.78% yield.',
        'AAA/AA+ full-faith US sovereign backing provides zero credit default risk during recessions.',
        'Ultra-liquid options market enables institutional covered-call yield enhancement.',
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: '-16.0%',
      summary: 'Persistent US fiscal deficits and term-premium repricing above 5.25% inflict steep duration losses.',
      points: [
        '16.4-year effective duration produces equity-like volatility (15.8% std dev) with lower historical mean return.',
        'Inflation re-acceleration breaks the negative stock-bond correlation, causing simultaneous drawdowns.',
        '5-year average annual return remains negative (-3.18%) following the 2022–2024 rate-hiking cycle.',
      ],
    },
    baseCaseReturnPct: 6.4,
    topHoldings: [
      { name: 'US Treasury 4.75% Nov 2053', ticker: 'UST-53', sector: '25–30Y Treasury', weightPct: 7.4 },
      { name: 'US Treasury 4.625% May 2044', ticker: 'UST-44', sector: '20–25Y Treasury', weightPct: 6.8 },
      { name: 'US Treasury 4.25% Feb 2054', ticker: 'UST-54', sector: '25–30Y Treasury', weightPct: 6.3 },
      { name: 'US Treasury 4.125% Aug 2053', ticker: 'UST-53B', sector: '25–30Y Treasury', weightPct: 5.9 },
      { name: 'US Treasury 3.625% Feb 2053', ticker: 'UST-53C', sector: '25–30Y Treasury', weightPct: 5.2 },
    ],
  },

  UTI50: {
    symbol: 'UTI50',
    manager: {
      leadManager: 'Sharwan Kumar Goyal',
      coManagers: ['Ayush Jain'],
      tenureYears: 8.4,
      experienceYears: 18,
      amcAumManaged: '₹3.45 L Cr',
      investmentStyle: 'Systematic Nifty 50 Direct Index Fund',
      exitLoad: 'Nil',
      minInvestment: '₹500 SIP / Lump Sum',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: 1.81,
      alpha3Y: -0.18,
      stdDev3Y: 12.7,
      informationRatio: -0.24,
      treynorRatio: 14.7,
      rSquared: 1.0,
      upsideCapturePct: 99.6,
      downsideCapturePct: 100.2,
      portfolioPE: 22.1,
      portfolioPB: 3.6,
      roaePct: 17.8,
      roaPct: 7.6,
      roaeLabel: 'Portfolio ROAE',
      roaLabel: 'Portfolio ROA',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: 14.94,
      avgAnnualReturn5Y: 15.72,
      rolling3YMeanPct: 14.68,
      categoryPeerAvg3YPct: 14.62,
      excessOverPeerBps: 6,
      hitRatePositiveMonthsPct: 66.7,
    },
    sectorHeatmap: [
      { sector: 'Financials', weightPct: 33.8, change1MPct: 1.8, topHolding: 'HDFC Bank / ICICI Bank', peMultiple: 17.4 },
      { sector: 'Technology', weightPct: 13.7, change1MPct: 0.6, topHolding: 'Infosys / TCS', peMultiple: 26.8 },
      { sector: 'Energy & Oil/Gas', weightPct: 11.4, change1MPct: 1.1, topHolding: 'Reliance Industries', peMultiple: 19.6 },
      { sector: 'Consumer Staples', weightPct: 8.6, change1MPct: 0.9, topHolding: 'ITC / HUL', peMultiple: 36.2 },
      { sector: 'Automobiles', weightPct: 7.8, change1MPct: -0.4, topHolding: 'Mahindra & Mahindra', peMultiple: 23.1 },
      { sector: 'Industrials & Infra', weightPct: 9.2, change1MPct: 1.7, topHolding: 'Larsen & Toubro', peMultiple: 28.4 },
      { sector: 'Telecom, Pharma & Metals', weightPct: 15.5, change1MPct: 1.5, topHolding: 'Bharti Airtel / Sun Pharma', peMultiple: 27.6 },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [1.2, 1.5, -0.8, 2.0, 1.9, 2.6, 1.4, 0.8, 1.7, -1.2, 1.1, null], annualPct: 12.7, monthlyAvgPct: 1.11 },
      { year: 2025, months: [1.6, 1.2, 1.8, 1.4, 2.1, 3.3, 1.9, 0.8, 1.5, -2.9, 1.6, 1.4], annualPct: 16.6, monthlyAvgPct: 1.31 },
      { year: 2024, months: [0.1, 1.2, 1.6, 1.2, -0.3, 6.5, 3.9, 1.1, 2.3, -6.2, -0.3, -2.0], annualPct: 8.9, monthlyAvgPct: 0.76 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: '+16.8%',
      summary: 'Automated SIP compounding at exact end-of-day AMFI NAV with zero exit load or Demat brokerage friction.',
      points: [
        '₹22,000+ Cr AUM ensures ultra-low 0.04% tracking error and tight cash management.',
        'Direct Plan 0.18% TER beats >75% of active large-cap funds over 5-year rolling windows.',
        'Zero Demat/AMC charges and automated monthly SIP execution simplify disciplined wealth building.',
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: '-16.5%',
      summary: 'No active downside defense; inherits full Nifty 50 sector concentration during earnings contractions.',
      points: [
        'Slightly higher TER (0.18%) than Nifty 50 ETFs (0.04%) over multi-decade lump-sum horizons.',
        'Cannot execute intraday limit orders during sharp market gaps.',
        'Zero mid-cap or global diversification requires pairing with flexi-cap or bullion sleeves.',
      ],
    },
    baseCaseReturnPct: 12.8,
    topHoldings: [
      { name: 'HDFC Bank Ltd.', ticker: 'HDFCBANK', sector: 'Financials', weightPct: 12.0 },
      { name: 'ICICI Bank Ltd.', ticker: 'ICICIBANK', sector: 'Financials', weightPct: 8.5 },
      { name: 'Reliance Industries', ticker: 'RELIANCE', sector: 'Energy', weightPct: 8.4 },
      { name: 'Infosys Ltd.', ticker: 'INFY', sector: 'Technology', weightPct: 6.1 },
      { name: 'Bharti Airtel Ltd.', ticker: 'BHARTIARTL', sector: 'Telecom', weightPct: 4.3 },
    ],
  },
  ...EXTENDED_FUND_INTELLIGENCE,
};

/**
 * Returns the complete institutional intelligence profile for any fund or ETF,
 * falling back deterministically if a custom symbol is passed.
 */
export function getFundIntelligence(fund: ScreenerFundRecord): FundIntelligenceProfile {
  const existing = FUND_INTELLIGENCE_BY_ID[fund.symbol] || FUND_INTELLIGENCE_BY_ID[fund.id];
  if (existing) return existing;

  const r1y = fund.returnsTotal['1Y'] ?? 10.0;
  const r3yAnnual = fund.returnsTotal['3Y'] !== null ? Number(((Math.pow(1 + fund.returnsTotal['3Y'] / 100, 1 / 3) - 1) * 100).toFixed(2)) : r1y;
  const r5yAnnual = fund.returnsTotal['5Y'] !== null ? Number(((Math.pow(1 + fund.returnsTotal['5Y'] / 100, 1 / 5) - 1) * 100).toFixed(2)) : r3yAnnual;

  return {
    symbol: fund.symbol,
    manager: {
      leadManager: `${fund.about.issuer} Investment Committee`,
      coManagers: ['Quantitative Portfolio Desk'],
      tenureYears: 7.5,
      experienceYears: 16,
      amcAumManaged: fund.keyStats.aumLabel,
      investmentStyle: fund.about.focus,
      exitLoad: fund.instrumentType === 'ETF' ? 'Nil (Exchange traded)' : '1% (<365d)',
      minInvestment: fund.currency === 'INR' ? '₹500' : '1 Share',
      lockIn: 'None',
    },
    ratios: {
      sortino3Y: Number((fund.keyStats.sharpe3Y * 1.32).toFixed(2)),
      alpha3Y: Number((r3yAnnual - 12.0).toFixed(2)),
      stdDev3Y: Number((Math.abs(fund.keyStats.maxDrawdown3YPct) * 0.85).toFixed(1)),
      informationRatio: 0.45,
      treynorRatio: Number(((r3yAnnual - 5.5) / Math.max(0.4, fund.keyStats.beta3Y)).toFixed(2)),
      rSquared: 0.92,
      upsideCapturePct: 101.2,
      downsideCapturePct: 92.4,
      portfolioPE: 22.4,
      portfolioPB: 3.9,
      roaePct: 18.2,
      roaPct: 8.6,
      roaeLabel: 'Portfolio ROAE',
      roaLabel: 'Portfolio ROA',
    },
    returnOnAverage: {
      avgAnnualReturn3Y: r3yAnnual,
      avgAnnualReturn5Y: r5yAnnual,
      rolling3YMeanPct: Number((r3yAnnual * 0.96).toFixed(2)),
      categoryPeerAvg3YPct: Number((r3yAnnual * 0.92).toFixed(2)),
      excessOverPeerBps: Math.round((r3yAnnual * 0.04) * 100),
      hitRatePositiveMonthsPct: 65.0,
    },
    sectorHeatmap: [
      { sector: 'Core Allocation', weightPct: 72.0, change1MPct: 1.1, topHolding: fund.about.indexTracked, peMultiple: 22.0 },
      { sector: 'Secondary Sleeve', weightPct: 24.0, change1MPct: 0.6, topHolding: 'Diversified Constituents', peMultiple: 19.5 },
      { sector: 'Cash & Equivalents', weightPct: 4.0, change1MPct: 0.4, topHolding: 'Sovereign Liquidity', peMultiple: null },
    ],
    monthlyHeatmap: [
      { year: 2026, months: [1.1, 1.4, -0.9, 1.5, 1.2, 1.8, 1.0, 0.7, 1.2, -0.6, 0.8, null], annualPct: r1y, monthlyAvgPct: 0.84 },
      { year: 2025, months: [1.4, 1.1, 1.3, 0.9, 1.7, 1.9, 1.2, 0.6, 1.1, -1.2, 1.4, 1.1], annualPct: r3yAnnual, monthlyAvgPct: 1.04 },
    ],
    bullCase: {
      headlineMetricLabel: 'Bull 12M Target Return',
      headlineMetricValue: `+${(Math.max(8, r3yAnnual) + 5).toFixed(1)}%`,
      summary: `Sustained earnings expansion across ${fund.about.indexTracked} supports steady NAV appreciation.`,
      points: [
        `Disciplined ${fund.about.expenseRatioPct.toFixed(2)}% expense ratio keeps net compounding efficient.`,
        `Broad diversification across ${fund.keyStats.totalHoldings} holdings mitigates single-issuer shock.`,
        `Positive risk-adjusted Sharpe profile (${fund.keyStats.sharpe3Y.toFixed(2)}) relative to peers.`,
      ],
    },
    bearCase: {
      headlineMetricLabel: 'Bear Stress Drawdown',
      headlineMetricValue: `${Math.min(-8, fund.keyStats.maxDrawdown3YPct).toFixed(1)}%`,
      summary: 'Macro tightening or liquidity contraction could trigger valuation multiple compression.',
      points: [
        `Historical 3Y max drawdown of ${fund.keyStats.maxDrawdown3YPct.toFixed(1)}% underscores cyclical sensitivity.`,
        'Policy rate shifts could temporarily weigh on near-term fund inflows.',
        'Benchmark concentration risk during narrow market leadership.',
      ],
    },
    baseCaseReturnPct: Number(Math.max(6, r3yAnnual * 0.82).toFixed(1)),
    topHoldings: [
      { name: fund.about.indexTracked, ticker: fund.symbol, sector: fund.category, weightPct: 100 },
    ],
  };
}

/**
 * Computes exact compounded 10-year fee drag on 100,000 invested at 12% gross CAGR.
 */
export function computeTenYearFeeDrag(expenseRatioPct: number, principal = 100_000, grossAnnualRate = 0.12): number {
  const safeTer = Math.max(0, Math.min(5, Number.isFinite(expenseRatioPct) ? expenseRatioPct : 0)) / 100;
  const grossFV = principal * Math.pow(1 + grossAnnualRate, 10);
  const netFV = principal * Math.pow(1 + Math.max(0, grossAnnualRate - safeTer), 10);
  return Math.round(grossFV - netFV);
}

/**
 * Transparent 0-100 institutional validation score across 4 quantitative pillars:
 * Risk-Adjusted Return (30%), Cost Efficiency (25%), Drawdown Control (25%), Alpha/Tracking Quality (20%).
 */
export function computeFundValidationScore(
  fund: ScreenerFundRecord,
  intel: FundIntelligenceProfile
): ValidationScoreBreakdown {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  // 1. Risk-Adjusted Return (Sharpe + Sortino)
  const sharpePart = Math.min(100, Math.max(0, (fund.keyStats.sharpe3Y / 2.2) * 100));
  const sortinoPart = Math.min(100, Math.max(0, (intel.ratios.sortino3Y / 2.8) * 100));
  const riskAdjusted = clamp(sharpePart * 0.55 + sortinoPart * 0.45);

  // 2. Cost Efficiency (Lower TER = higher score; <=0.05% -> 99, 1.0% -> 58, >=2.0% -> 18)
  const costEfficiency = clamp(100 - fund.about.expenseRatioPct * 42);

  // 3. Drawdown Control (smaller abs drawdown + lower downside capture)
  const absDd = Math.abs(fund.keyStats.maxDrawdown3YPct);
  const ddPart = Math.max(0, 100 - absDd * 2.7);
  const downCapPart = Math.max(0, 130 - intel.ratios.downsideCapturePct * 0.65);
  const drawdownControl = clamp(ddPart * 0.65 + downCapPart * 0.35);

  // 4. Alpha / Tracking Quality (Active funds rewarded for positive alpha & excess bps; passives for low tracking error)
  const isPassive =
    fund.about.expenseRatioPct <= 0.25 &&
    (fund.instrumentType === 'ETF' || fund.name.toLowerCase().includes('index'));
  const alphaQuality = isPassive
    ? clamp(98 - fund.keyStats.trackingErrorPct * 120 + Math.max(-10, intel.returnOnAverage.excessOverPeerBps * 0.04))
    : clamp(64 + intel.ratios.alpha3Y * 5.2 + intel.ratios.informationRatio * 12);

  const overall = clamp(
    riskAdjusted * 0.3 + costEfficiency * 0.25 + drawdownControl * 0.25 + alphaQuality * 0.2
  );

  let grade: ValidationScoreBreakdown['grade'] = 'Watchlist';
  if (overall >= 82) grade = 'Institutional Core';
  else if (overall >= 70) grade = 'Strong';
  else if (overall >= 56) grade = 'Balanced';

  return {
    overall,
    grade,
    subScores: {
      riskAdjusted,
      costEfficiency,
      drawdownControl,
      alphaQuality,
    },
  };
}

/**
 * Evaluates institutional Sharpe, Sortino, and Treynor ratios with calibrated grading tiers.
 */
export function evaluateRiskAdjustedRatios(
  fund: ScreenerFundRecord,
  intel: FundIntelligenceProfile = getFundIntelligence(fund)
): RiskAdjustedRatioSummary {
  const gradeMetric = (val: number, inst: number, strong: number, mod: number): RiskRatioGrade => {
    if (val >= inst) return 'Institutional';
    if (val >= strong) return 'Strong';
    if (val >= mod) return 'Moderate';
    return 'Cautious';
  };

  const sharpeVal = Number(fund.keyStats.sharpe3Y.toFixed(2));
  const sortinoVal = Number(intel.ratios.sortino3Y.toFixed(2));
  const treynorVal = Number(intel.ratios.treynorRatio.toFixed(2));

  return {
    sharpe: {
      value: sharpeVal,
      grade: gradeMetric(sharpeVal, 1.35, 0.95, 0.5),
      note: 'Excess return per unit of total volatility (3Y)',
    },
    sortino: {
      value: sortinoVal,
      grade: gradeMetric(sortinoVal, 1.85, 1.3, 0.7),
      note: 'Excess return per unit of downside deviation (3Y)',
    },
    treynor: {
      value: treynorVal,
      grade: gradeMetric(treynorVal, 15.0, 10.0, 5.0),
      note: 'Excess return per unit of systematic market beta',
    },
  };
}

/**
 * Computes projected 10-year net wealth on principal invested at 3Y average annual return net of TER.
 */
export function computeTenYearNetWealth(
  avgAnnualReturnPct: number,
  expenseRatioPct: number,
  principal = 100_000
): number {
  const safeGross = Number.isFinite(avgAnnualReturnPct) ? avgAnnualReturnPct : 8;
  const safeTer = Math.max(0, Math.min(5, Number.isFinite(expenseRatioPct) ? expenseRatioPct : 0));
  const netRate = Math.max(-0.5, (safeGross - safeTer) / 100);
  return Math.round(principal * Math.pow(1 + netRate, 10));
}

function computePriorityScore(
  fund: ScreenerFundRecord,
  intel: FundIntelligenceProfile,
  validation: ValidationScoreBreakdown,
  mode: ComparisonPriorityMode
): number {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  if (mode === 'balanced') return validation.overall;

  const returnScore = clamp(
    Math.min(100, Math.max(0, ((intel.returnOnAverage.avgAnnualReturn3Y + 2) / 28) * 100)) * 0.7 +
      Math.min(100, Math.max(0, 50 + intel.ratios.alpha3Y * 6)) * 0.3
  );
  const riskScore = clamp(
    validation.subScores.drawdownControl * 0.55 +
      Math.min(100, Math.max(0, 100 - intel.ratios.stdDev3Y * 3.5)) * 0.45
  );
  const costScore = clamp(
    validation.subScores.costEfficiency * 0.75 +
      Math.min(100, Math.max(0, 100 - fund.keyStats.trackingErrorPct * 12)) * 0.25
  );

  if (mode === 'max_return') {
    return clamp(returnScore * 0.65 + validation.subScores.riskAdjusted * 0.2 + validation.overall * 0.15);
  }
  if (mode === 'lowest_risk') {
    return clamp(riskScore * 0.65 + validation.subScores.riskAdjusted * 0.2 + costScore * 0.15);
  }
  return clamp(costScore * 0.65 + validation.overall * 0.25 + riskScore * 0.1);
}

/**
 * Selects up to `maxPeers` relevant comparison symbols from all indexed funds without duplicating the primary.
 */
export function selectPeerComparisonSymbols(
  primarySymbol: string,
  allFunds: ScreenerFundRecord[],
  maxPeers = 2
): string[] {
  const primaryUp = primarySymbol.trim().toUpperCase();
  const primary = allFunds.find((f) => f.symbol.toUpperCase() === primaryUp);
  const candidates = allFunds.filter((f) => f.symbol.toUpperCase() !== primaryUp);
  if (candidates.length === 0) return [];

  const scored = candidates.map((cand) => {
    let score = 0;
    if (primary) {
      if (cand.currency === primary.currency) score += 3;
      if (cand.instrumentType === primary.instrumentType) score += 2;
      if (cand.about.assetClass === primary.about.assetClass) score += 3;
      if (cand.category === primary.category) score += 4;
    }
    return { symbol: cand.symbol.toUpperCase(), score, aum: cand.keyStats.aumSortUsdB };
  });

  scored.sort((a, b) => b.score - a.score || b.aum - a.aum);
  return scored.slice(0, Math.max(1, maxPeers)).map((s) => s.symbol);
}

/**
 * Hydrates a complete LiveStockTerminal StockQuote directly from any of the 20 ScreenerFundRecord profiles
 * so clicking any fund opens the actual interactive terminal with full metrics, curves, and bull/bear cases.
 */
export function buildTerminalQuoteFromScreenerFund(
  fund: ScreenerFundRecord,
  intel: FundIntelligenceProfile = getFundIntelligence(fund)
): StockQuote {
  const sectorMap: Record<string, PillarSector> = {
    Equity: fund.instrumentType === 'Mutual Fund' ? 'Mutual Funds' : 'ETFs',
    'Fixed Income': 'Debt Funds',
    'Money Market': 'Debt Funds',
    Commodity: 'Gold & Bullion',
  };
  const sector: PillarSector = sectorMap[fund.about.assetClass] || (fund.instrumentType === 'ETF' ? 'ETFs' : 'Mutual Funds');
  const assetClass: StockQuote['assetClass'] =
    sector === 'Gold & Bullion'
      ? 'Gold Bullion'
      : sector === 'Debt Funds'
      ? 'Debt Fund'
      : fund.instrumentType === 'ETF'
      ? 'ETF'
      : 'Mutual Fund';

  const validation = computeFundValidationScore(fund, intel);
  const basePrice = fund.price;
  const seasonal = fund.seasonals.currentYear;
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pointsCount = Math.max(8, Math.min(12, seasonal.length));
  const lastSeasonal = seasonal[pointsCount - 1] ?? 10;

  const stock_price_4m = Array.from({ length: pointsCount }, (_, idx) => {
    const cumPct = seasonal[idx] ?? idx * 1.1;
    const relFactor = (100 + cumPct) / Math.max(40, 100 + lastSeasonal);
    const ptPrice = idx === pointsCount - 1 ? basePrice : Number(Math.max(1, basePrice * relFactor).toFixed(2));
    const spread = Math.max(0.004, Math.min(0.02, intel.ratios.stdDev3Y / 1000));
    return {
      date: `${monthLabels[idx]} 2026`,
      price: ptPrice,
      open: Number((ptPrice * (1 - spread * 0.4)).toFixed(2)),
      high: Number((ptPrice * (1 + spread)).toFixed(2)),
      low: Number((ptPrice * (1 - spread)).toFixed(2)),
      volume: Math.max(1, Math.round(fund.volumeNumeric > 500 ? fund.volumeNumeric / 100 : fund.volumeNumeric * 4)),
    };
  });

  const qBase = Math.max(2, intel.returnOnAverage.avgAnnualReturn3Y / 4);
  const financial_performance_4q = [
    { quarter: 'Q1 25', revenue: Number((qBase * 0.85).toFixed(2)), net_income: Number((qBase * 0.72).toFixed(2)) },
    { quarter: 'Q2 25', revenue: Number((qBase * 1.05).toFixed(2)), net_income: Number((qBase * 0.91).toFixed(2)) },
    { quarter: 'Q3 25', revenue: Number((qBase * 0.94).toFixed(2)), net_income: Number((qBase * 0.82).toFixed(2)) },
    { quarter: 'Q4 25', revenue: Number((qBase * 1.18).toFixed(2)), net_income: Number((qBase * 1.06).toFixed(2)) },
  ];

  const stance: StockQuote['report']['verdict']['stance'] =
    validation.overall >= 80
      ? 'HIGH CONVICTION BULLISH'
      : validation.overall >= 68
      ? 'MODERATE ACCUMULATE'
      : validation.overall >= 55
      ? 'NEUTRAL WATCH'
      : 'DEFENSIVE CAUTION';

  return {
    ticker: fund.symbol,
    name: fund.name,
    sector,
    assetClass,
    price: fund.price,
    currencyUnit: fund.currency,
    change: fund.change,
    changePercent: fund.changePct,
    volume: fund.volumeLabel,
    marketCap: fund.keyStats.aumLabel,
    aum: fund.keyStats.aumLabel,
    peRatio: intel.ratios.portfolioPE ?? 0,
    expenseRatio: `${fund.about.expenseRatioPct.toFixed(2)}%`,
    ytmOrCagr: `${intel.returnOnAverage.avgAnnualReturn3Y.toFixed(1)}% 3Y Avg`,
    amfiSchemeCode: fund.amfiCode,
    rsi14: fund.technicals.rsi14,
    ivRank: Math.min(95, Math.max(12, Math.round(intel.ratios.stdDev3Y * 3.8))),
    convictionScore: validation.overall,
    shortInterest: `${fund.keyStats.trackingErrorPct.toFixed(2)}% TE`,
    institutionalOwnership: `${intel.manager.tenureYears.toFixed(1)}Y Tenure`,
    nextEarnings: fund.about.inceptionDate,
    dataSource: `${fund.exchange} · ${fund.instrumentType}`,
    report: {
      ticker: fund.symbol,
      companyName: fund.name,
      generatedAt: fund.lastUpdateLabel,
      verdict: {
        summary: `${fund.name} (${fund.symbol}) delivers ${intel.returnOnAverage.avgAnnualReturn3Y.toFixed(1)}% 3Y annualized returns at ${fund.about.expenseRatioPct.toFixed(2)}% TER, with Sharpe ${fund.keyStats.sharpe3Y.toFixed(2)}, Sortino ${intel.ratios.sortino3Y.toFixed(2)}, and Treynor ${intel.ratios.treynorRatio.toFixed(1)} under ${intel.manager.leadManager}.`,
        conviction_score: validation.overall,
        stance,
        key_takeaways: [
          `Risk-adjusted ratios: Sharpe ${fund.keyStats.sharpe3Y.toFixed(2)} · Sortino ${intel.ratios.sortino3Y.toFixed(2)} · Treynor ${intel.ratios.treynorRatio.toFixed(1)}`,
          `Cost & Scale: ${fund.about.expenseRatioPct.toFixed(2)}% TER · ${fund.keyStats.aumLabel} AUM · ${fund.keyStats.totalHoldings} holdings`,
          `3Y Max Drawdown ${fund.keyStats.maxDrawdown3YPct.toFixed(1)}% · Upside/Downside Capture ${intel.ratios.upsideCapturePct}% / ${intel.ratios.downsideCapturePct}%`,
        ],
      },
      bull_case: intel.bullCase.points.map((pt, i) => ({
        point: i === 0 ? intel.bullCase.headlineMetricLabel : `Bull Driver #${i + 1}`,
        evidence: pt,
      })),
      bear_case: intel.bearCase.points.map((pt, i) => ({
        point: i === 0 ? intel.bearCase.headlineMetricLabel : `Risk Factor #${i + 1}`,
        evidence: pt,
      })),
      base_case: [
        {
          point: `Base Case 12M Return: +${intel.baseCaseReturnPct.toFixed(1)}%`,
          evidence: intel.bullCase.summary,
        },
        {
          point: `Lead Manager: ${intel.manager.leadManager} (${intel.manager.tenureYears.toFixed(1)}Y Tenure)`,
          evidence: `${intel.manager.investmentStyle} · Min Investment ${intel.manager.minInvestment}`,
        },
      ],
      financial_charts: {
        stock_price_4m,
        financial_performance_4q,
      },
      deep_insights: [
        {
          title: `${fund.symbol} Lead Manager & Mandate Profile`,
          description: `Managed by ${intel.manager.leadManager} (${intel.manager.experienceYears}Y experience, ${intel.manager.amcAumManaged} AMC AUM). Style: ${intel.manager.investmentStyle}.`,
          category: 'Factsheet & AMFI',
          impact_score: validation.overall,
        },
        {
          title: `Portfolio Quality & ${intel.ratios.roaeLabel}`,
          description: `${intel.ratios.roaeLabel}: ${intel.ratios.roaePct.toFixed(1)}%, ${intel.ratios.roaLabel}: ${intel.ratios.roaPct.toFixed(1)}%, Alpha (3Y): ${intel.ratios.alpha3Y >= 0 ? '+' : ''}${intel.ratios.alpha3Y.toFixed(2)}%.`,
          category: 'Fundamental',
          impact_score: Math.min(96, validation.subScores.riskAdjusted + 6),
        },
        {
          title: `Top Holding Concentration`,
          description: intel.topHoldings
            .slice(0, 4)
            .map((h) => `${h.name} (${h.weightPct.toFixed(1)}%)`)
            .join(' · '),
          category: 'Fund Flow',
          impact_score: validation.subScores.costEfficiency,
        },
      ],
      findings: [
        {
          documentType: `${fund.instrumentType} Factsheet & SID`,
          date: fund.lastUpdateLabel,
          sourceUrl: fund.about.homePageUrl,
          keyInsights: [
            `ISIN: ${fund.about.isin} · Benchmark: ${fund.about.indexTracked}`,
            `Expense Ratio: ${fund.about.expenseRatioPct.toFixed(2)}% · Exit Load: ${intel.manager.exitLoad}`,
          ],
        },
      ],
      podcast_script: [
        {
          speaker: 'Fund Quant (Kore)',
          line: `${fund.name} currently scores ${validation.overall} out of 100 (${validation.grade}) with a ${intel.returnOnAverage.avgAnnualReturn3Y.toFixed(1)}% three-year annualized return and a ${fund.keyStats.sharpe3Y.toFixed(2)} Sharpe ratio.`,
        },
        {
          speaker: 'Fixed-Income Desk (Aoede)',
          line: `At an expense ratio of ${fund.about.expenseRatioPct.toFixed(2)}% and a three-year max drawdown of ${fund.keyStats.maxDrawdown3YPct.toFixed(1)}%, ${fund.symbol} balances upside capture of ${intel.ratios.upsideCapturePct}% against ${intel.ratios.downsideCapturePct}% downside capture.`,
        },
      ],
    },
  };
}

/**
 * Builds a complete multi-fund / ETF side-by-side comparison matrix with Best/Worst identification,
 * priority-based ranking, 10Y compounded expense fee drag, 10Y net wealth projection, and sector overlap.
 */
export function buildMultiFundComparison(
  funds: ScreenerFundRecord[],
  priorityMode: ComparisonPriorityMode = 'balanced'
): MultiFundComparisonResult {
  const unique = funds
    .filter((f, idx, arr) => arr.findIndex((x) => x.symbol === f.symbol) === idx)
    .slice(0, 4);

  const items: EnrichedComparisonFund[] = unique.map((fund) => {
    const intel = getFundIntelligence(fund);
    const validation = computeFundValidationScore(fund, intel);
    const tenYearFeeDragOn100k = computeTenYearFeeDrag(fund.about.expenseRatioPct);
    const tenYearNetWealthOn100k = computeTenYearNetWealth(
      intel.returnOnAverage.avgAnnualReturn3Y,
      fund.about.expenseRatioPct
    );
    const priorityScore = computePriorityScore(fund, intel, validation, priorityMode);
    return {
      fund,
      intel,
      validation,
      tenYearFeeDragOn100k,
      tenYearNetWealthOn100k,
      priorityScore,
    };
  });

  const pickMax = (selector: (item: EnrichedComparisonFund) => number): string => {
    if (items.length === 0) return '';
    return items.reduce((best, cur) => (selector(cur) > selector(best) ? cur : best), items[0]).fund.symbol;
  };
  const pickMin = (selector: (item: EnrichedComparisonFund) => number): string => {
    if (items.length === 0) return '';
    return items.reduce((best, cur) => (selector(cur) < selector(best) ? cur : best), items[0]).fund.symbol;
  };

  const winners = {
    lowestExpense: pickMin((i) => i.fund.about.expenseRatioPct),
    highestSharpe: pickMax((i) => i.fund.keyStats.sharpe3Y),
    highestSortino: pickMax((i) => i.intel.ratios.sortino3Y),
    highestTreynor: pickMax((i) => i.intel.ratios.treynorRatio),
    highestAlpha: pickMax((i) => i.intel.ratios.alpha3Y),
    highestReturn1Y: pickMax((i) => i.fund.returnsTotal['1Y'] ?? -999),
    highestReturn3Y: pickMax((i) => i.fund.returnsTotal['3Y'] ?? -999),
    highestAvgReturn3Y: pickMax((i) => i.intel.returnOnAverage.avgAnnualReturn3Y),
    lowestDrawdown: pickMin((i) => Math.abs(i.fund.keyStats.maxDrawdown3YPct)),
    lowestVolatility: pickMin((i) => i.intel.ratios.stdDev3Y),
    highestRoae: pickMax((i) => i.intel.ratios.roaePct),
    highestNetWealth10Y: pickMax((i) => i.tenYearNetWealthOn100k),
    bestValidationScore: pickMax((i) => i.validation.overall),
  };

  const losers = {
    highestExpense: pickMax((i) => i.fund.about.expenseRatioPct),
    lowestSharpe: pickMin((i) => i.fund.keyStats.sharpe3Y),
    lowestSortino: pickMin((i) => i.intel.ratios.sortino3Y),
    lowestTreynor: pickMin((i) => i.intel.ratios.treynorRatio),
    lowestAlpha: pickMin((i) => i.intel.ratios.alpha3Y),
    lowestReturn1Y: pickMin((i) => i.fund.returnsTotal['1Y'] ?? 999),
    lowestReturn3Y: pickMin((i) => i.fund.returnsTotal['3Y'] ?? 999),
    lowestAvgReturn3Y: pickMin((i) => i.intel.returnOnAverage.avgAnnualReturn3Y),
    worstDrawdown: pickMax((i) => Math.abs(i.fund.keyStats.maxDrawdown3YPct)),
    highestVolatility: pickMax((i) => i.intel.ratios.stdDev3Y),
    lowestRoae: pickMin((i) => i.intel.ratios.roaePct),
    lowestNetWealth10Y: pickMin((i) => i.tenYearNetWealthOn100k),
    worstValidationScore: pickMin((i) => i.validation.overall),
  };

  const sortedForRank = [...items].sort(
    (a, b) =>
      b.priorityScore - a.priorityScore ||
      b.validation.overall - a.validation.overall ||
      b.fund.keyStats.sharpe3Y - a.fund.keyStats.sharpe3Y
  );

  const rankings: RankedFundVerdict[] = sortedForRank.map((item, idx) => {
    const sym = item.fund.symbol;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (winners.lowestExpense === sym) strengths.push(`Lowest expense ratio (${item.fund.about.expenseRatioPct.toFixed(2)}% TER)`);
    if (winners.highestAvgReturn3Y === sym) strengths.push(`Highest 3Y annualized return (${item.intel.returnOnAverage.avgAnnualReturn3Y.toFixed(1)}%/yr)`);
    if (winners.highestSharpe === sym) strengths.push(`Top Sharpe ratio (${item.fund.keyStats.sharpe3Y.toFixed(2)}) in basket`);
    if (winners.lowestDrawdown === sym) strengths.push(`Shallowest 3Y max drawdown (${item.fund.keyStats.maxDrawdown3YPct.toFixed(1)}%)`);
    if (winners.highestAlpha === sym) strengths.push(`Strongest 3Y alpha (${item.intel.ratios.alpha3Y >= 0 ? '+' : ''}${item.intel.ratios.alpha3Y.toFixed(2)}%)`);
    if (strengths.length < 2) {
      strengths.push(`Validation score ${item.validation.overall}/100 (${item.validation.grade})`);
      strengths.push(`Sortino ${item.intel.ratios.sortino3Y.toFixed(2)} · Treynor ${item.intel.ratios.treynorRatio.toFixed(1)}`);
    }

    if (losers.highestExpense === sym && items.length > 1) weaknesses.push(`Highest fee drag (${item.fund.about.expenseRatioPct.toFixed(2)}% TER)`);
    if (losers.lowestAvgReturn3Y === sym && items.length > 1) weaknesses.push(`Slowest 3Y annualized return (${item.intel.returnOnAverage.avgAnnualReturn3Y.toFixed(1)}%/yr)`);
    if (losers.lowestSharpe === sym && items.length > 1) weaknesses.push(`Weakest Sharpe ratio (${item.fund.keyStats.sharpe3Y.toFixed(2)}) in basket`);
    if (losers.worstDrawdown === sym && items.length > 1) weaknesses.push(`Deepest 3Y drawdown (${item.fund.keyStats.maxDrawdown3YPct.toFixed(1)}%)`);
    if (losers.highestVolatility === sym && items.length > 1) weaknesses.push(`Highest 3Y volatility (${item.intel.ratios.stdDev3Y.toFixed(1)}% σ)`);
    if (weaknesses.length < 2) {
      weaknesses.push(`Trails basket leader by ${Math.max(0, (sortedForRank[0]?.priorityScore ?? item.priorityScore) - item.priorityScore)} priority pts`);
      weaknesses.push(`3Y Max Drawdown ${item.fund.keyStats.maxDrawdown3YPct.toFixed(1)}% · TER ${item.fund.about.expenseRatioPct.toFixed(2)}%`);
    }

    return {
      symbol: sym,
      name: item.fund.name,
      rank: idx + 1,
      priorityScore: item.priorityScore,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
    };
  });

  const bestPick = rankings.length > 0 ? rankings[0] : null;
  const worstPick = rankings.length > 1 ? rankings[rankings.length - 1] : null;

  const r3yVals = items.map((i) => i.fund.returnsTotal['3Y'] ?? 0);
  const avgVals = items.map((i) => i.intel.returnOnAverage.avgAnnualReturn3Y);
  const terVals = items.map((i) => i.fund.about.expenseRatioPct);
  const sharpeVals = items.map((i) => i.fund.keyStats.sharpe3Y);
  const wealthVals = items.map((i) => i.tenYearNetWealthOn100k);

  const spreadSummary: ComparisonSpreadSummary = {
    return3YSpreadPct: items.length > 1 ? Number((Math.max(...r3yVals) - Math.min(...r3yVals)).toFixed(1)) : 0,
    avgAnnualReturn3YSpreadPct: items.length > 1 ? Number((Math.max(...avgVals) - Math.min(...avgVals)).toFixed(2)) : 0,
    expenseRatioSpreadPct: items.length > 1 ? Number((Math.max(...terVals) - Math.min(...terVals)).toFixed(2)) : 0,
    sharpeSpread: items.length > 1 ? Number((Math.max(...sharpeVals) - Math.min(...sharpeVals)).toFixed(2)) : 0,
    tenYearWealthGapOn100k: items.length > 1 ? Math.round(Math.max(...wealthVals) - Math.min(...wealthVals)) : 0,
  };

  // Build unified cross-fund sector overlap matrix
  const sectorSet = new Set<string>();
  for (const item of items) {
    for (const row of item.intel.sectorHeatmap) {
      sectorSet.add(row.sector);
    }
  }

  const sectorOverlapMatrix: SectorOverlapRow[] = Array.from(sectorSet)
    .map((sector) => {
      const weightsBySymbol: Record<string, number> = {};
      let maxWeightPct = 0;
      let overlapCount = 0;
      for (const item of items) {
        const match = item.intel.sectorHeatmap.find((s) => s.sector === sector);
        const w = match ? match.weightPct : 0;
        weightsBySymbol[item.fund.symbol] = w;
        if (w > maxWeightPct) maxWeightPct = w;
        if (w > 0) overlapCount += 1;
      }
      return { sector, weightsBySymbol, maxWeightPct, overlapCount };
    })
    .sort((a, b) => b.overlapCount - a.overlapCount || b.maxWeightPct - a.maxWeightPct);

  let pairwiseOverlapPct = 0;
  if (items.length >= 2) {
    const symA = items[0].fund.symbol;
    const symB = items[1].fund.symbol;
    for (const row of sectorOverlapMatrix) {
      pairwiseOverlapPct += Math.min(row.weightsBySymbol[symA] || 0, row.weightsBySymbol[symB] || 0);
    }
    pairwiseOverlapPct = Number(Math.min(100, pairwiseOverlapPct).toFixed(1));
  }

  return {
    priorityMode,
    items,
    winners,
    losers,
    rankings,
    bestPick,
    worstPick,
    spreadSummary,
    sectorOverlapMatrix,
    pairwiseOverlapPct,
  };
}
