export interface CaseItem {
  point: string;
  evidence: string;
}

export interface DeepInsight {
  title: string;
  description: string;
  category:
    | 'Fund Flow'
    | 'Technical'
    | 'Yield & Duration'
    | 'Factsheet & AMFI'
    | 'Macro'
    | 'Fundamental'
    | 'Options & Flow'
    | 'Insider & SEC';
  impact_score: number;
}

export interface DocumentFinding {
  documentType: string;
  date: string;
  sourceUrl: string;
  keyInsights: string[];
}

export interface PricePoint {
  date: string;
  price: number;
  volume: number;
  open: number;
  high: number;
  low: number;
}

export interface QuarterlyPerformance {
  quarter: string;
  revenue: number;
  net_income: number;
  eps?: number;
  gross_margin?: number;
}

export interface ReportData {
  ticker: string;
  companyName: string;
  generatedAt: string;
  verdict: {
    summary: string;
    conviction_score: number;
    stance: 'HIGH CONVICTION BULLISH' | 'MODERATE ACCUMULATE' | 'NEUTRAL WATCH' | 'DEFENSIVE CAUTION';
    key_takeaways: string[];
  };
  bull_case: CaseItem[];
  bear_case: CaseItem[];
  base_case: CaseItem[];
  financial_charts: {
    stock_price_4m: PricePoint[];
    financial_performance_4q: QuarterlyPerformance[];
  };
  deep_insights: DeepInsight[];
  findings: DocumentFinding[];
  podcast_script: {
    speaker: 'Fund Quant (Kore)' | 'Fixed-Income Desk (Aoede)' | 'Lead Quant (Kore)' | 'SEC Strategist (Aoede)';
    line: string;
  }[];
}

export interface TimelineEvent {
  id: number;
  kind: 'info' | 'thinking' | 'tool_call' | 'tool_result' | 'text' | 'error';
  label: string;
  detail?: string;
  toolName?: string;
  startTime: number;
  endTime?: number;
}

export type PillarSector = 'Mutual Funds' | 'Gold & Bullion' | 'Debt Funds' | 'ETFs';

export interface StockQuote {
  ticker: string;
  name: string;
  sector: PillarSector;
  assetClass?: 'Mutual Fund' | 'Gold Bullion' | 'Debt Fund' | 'ETF';
  price: number;
  currencyUnit?: 'INR' | 'USD';
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  aum?: string;
  peRatio: number;
  expenseRatio?: string;
  ytmOrCagr?: string;
  modifiedDuration?: string;
  creditRating?: string;
  amfiSchemeCode?: string;
  rsi14: number;
  ivRank: number;
  convictionScore: number;
  shortInterest: string;
  institutionalOwnership: string;
  nextEarnings: string;
  dataSource?: string;
  cik?: string;
  report: ReportData;
}

export type FundQuote = StockQuote;

export interface SectorShowcase {
  id: string;
  title: string;
  kicker: string;
  description: string;
  featuredTickers: string[];
  avgPe: string;
  momentumScore: number;
  flow24h: string;
  primaryCta: string;
}

export interface ResearchPlan {
  id: string;
  badge: string;
  name: string;
  headline: string;
  subtitle: string;
  priceMonthly: string;
  cadenceNote: string;
  features: string[];
  limits: {
    secFilingsDepth: string;
    agentMode: string;
    optionsFlowDelay: string;
    exportFormats: string;
  };
  highlighted?: boolean;
}

export interface InsightAccordionItem {
  id: string;
  number: string;
  title: string;
  headline: string;
  summary: string;
  ctaLabel: string;
  targetTicker: string;
  cards: {
    kicker: string;
    quote: string;
    metric: string;
  }[];
}

export interface BlogBriefing {
  id: string;
  readTime: string;
  date: string;
  title: string;
  excerpt: string;
  category: string;
  relatedTicker: string;
  visualVariant: 'posters' | 'terminal' | 'emerald-wave' | 'matrix-cube';
}

export interface FaqItem {
  id: string;
  category: 'All Questions' | 'Mutual Funds & ETFs' | 'Gold & Debt Funds' | 'Data Sources';
  question: string;
  answer: string;
}

export interface InquiryMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  topic: string;
  timestamp: string;
}
