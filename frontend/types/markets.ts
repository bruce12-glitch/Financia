export type MarketCategory =
  | 'indices'
  | 'indian_stocks'
  | 'crypto'
  | 'futures'
  | 'forex'
  | 'economy';

export type ForexTimeframe = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'All';

export interface MarketSymbolRow {
  symbol: string;
  name: string;
  exchange?: string;
  price: string;
  unit?: string;
  changePercent: number;
  badgeText: string;
  badgeColor: string;
  badgeBg?: string;
  category: MarketCategory;
  delayed?: boolean;
  locked?: boolean;
  sparkline: number[];
}

export interface ForexPerformanceItem {
  pair: string;
  baseFlag: string;
  quoteFlag: string;
  spotRate: string;
  returns: Record<ForexTimeframe, number>;
}

export interface WireNewsItem {
  id: string;
  timeAgo: string;
  source: string;
  headline: string;
  summary: string;
  category: 'top' | 'forex' | 'futures' | 'indian_stocks' | 'crypto';
  tickers: string[];
  locked?: boolean;
  flash?: boolean;
}

export interface FeaturedIpoItem {
  symbol: string;
  name: string;
  exchange: string;
  valuation: string;
  accentColor: string;
}

export interface CommunityIdeaItem {
  id: string;
  title: string;
  description: string;
  author: string;
  timeLabel: string;
  comments: number;
  boosts: number;
  category: 'editors' | 'popular' | 'indian' | 'futures' | 'forex' | 'crypto';
  symbol: string;
  chartType: 'bearish_fib' | 'bullish_breakout' | 'golden_channel' | 'eurusd_4h' | 'volume_profile' | 'cci_oscillator';
  priceAxisLabels: string[];
}

export interface CalendarEventItem {
  id: string;
  dateLabel: string;
  subLabel: string;
  title: string;
  ticker?: string;
  exchange?: string;
  actual: string;
  forecast: string;
  prior?: string;
  flag?: string;
}

export interface OhlcCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SuperchartCandle = OhlcCandle;

export interface SuperchartInstrument {
  symbol: string;
  exchange: string;
  title: string;
  lastPrice: number;
  changePercent: number;
  candles: OhlcCandle[];
}

export interface InflationCountryData {
  code: string;
  name: string;
  rate: number;
  x: number;
  y: number;
  width: number;
  height: number;
  path: string;
}
