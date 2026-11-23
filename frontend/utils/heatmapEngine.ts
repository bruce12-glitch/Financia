import * as d3 from 'd3';
import { MarketSymbolRow } from '../types/markets';

export type HeatmapMarket = 'global' | 'india';
export type HeatmapScope = 'india' | 'global' | 'all' | 'amfi' | 'custom';
export type HeatmapColorMode = 'volatility' | 'performance';
export type HeatmapSizingMode = 'aum' | 'equal' | 'move';

export interface HeatmapStockTile {
  symbol: string;
  name: string;
  sector: string;
  market: HeatmapMarket;
  marketCapB: number;
  price: string;
  unit: string;
  changePercent: number;
  sparkline: number[];
  source?: 'curated' | 'amfi-db';
  amfiCode?: string;
}

export interface CustomHeatmapEntry {
  symbol: string;
  name: string;
  sector: string;
  market: HeatmapMarket;
  price?: string;
  unit?: string;
  marketCapB?: number;
  changePercent?: number;
  sparkline?: number[];
  source?: 'curated' | 'amfi-db';
  amfiCode?: string;
}

export interface NavMasterSchemeRow {
  scheme_code: string | number;
  scheme_name: string;
  amc?: string;
  category?: string;
  latest_nav: number;
  latest_date?: string;
  nav_count?: number;
}

export interface HeatmapTileColors {
  bg: string;
  bgEnd: string;
  border: string;
  sparkColor: string;
  text: string;
  subText: string;
  tier: 'Strong Gain' | 'Gain' | 'Flat' | 'Loss' | 'Sharp Loss';
}

export interface HeatmapVolatilityColors {
  bg: string;
  bgEnd: string;
  border: string;
  sparkColor: string;
  text: string;
  subText: string;
  tier: 'Calm' | 'Moderate' | 'Elevated' | 'Extreme';
}

export interface HeatmapSectorGroup {
  sector: string;
  totalCapB: number;
  avgChangePercent: number;
  volatilityPct: number;
  dispersionPct: number;
  advancers: number;
  decliners: number;
  tiles: HeatmapStockTile[];
}

export interface D3TreemapSectorRect {
  sector: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  avgChangePercent: number;
  volatilityPct: number;
  dispersionPct: number;
  totalCapB: number;
}

export interface D3TreemapTileRect {
  tile: HeatmapStockTile;
  volatilityPct: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface D3TreemapLayoutResult {
  sectors: D3TreemapSectorRect[];
  tiles: D3TreemapTileRect[];
  maxVolatilityPct: number;
}

/**
 * Broad, neutral multi-AMC universe (76 funds across 12 categories: 46 India + 30 Global)
 * so users inspect full category breadth rather than a handful of promoted tickers.
 */
export const HEATMAP_STOCKS: HeatmapStockTile[] = [
  // ======================== INDIA MUTUAL FUNDS & ETFS (46) ========================
  // 1. Large & Flexi Cap (8)
  { symbol: 'PPFAS', name: 'Parag Parikh Flexi Cap Direct', sector: 'Large & Flexi Cap', market: 'india', marketCapB: 10.4, price: '89.42', unit: 'INR', changePercent: 0.88, sparkline: [87.4, 87.9, 88.4, 88.9, 89.42], source: 'curated' },
  { symbol: 'HDFCTOP100', name: 'HDFC Top 100 Direct Growth', sector: 'Large & Flexi Cap', market: 'india', marketCapB: 4.5, price: '1,182.40', unit: 'INR', changePercent: 0.74, sparkline: [1166, 1170, 1174, 1178, 1182.4], source: 'curated' },
  { symbol: 'ICICIBLUE', name: 'ICICI Pru Bluechip Direct', sector: 'Large & Flexi Cap', market: 'india', marketCapB: 7.8, price: '112.65', unit: 'INR', changePercent: 0.69, sparkline: [110.9, 111.3, 111.8, 112.2, 112.65], source: 'curated' },
  { symbol: 'SBIBLUE', name: 'SBI Bluechip Direct Growth', sector: 'Large & Flexi Cap', market: 'india', marketCapB: 6.1, price: '98.30', unit: 'INR', changePercent: 0.52, sparkline: [97.1, 97.4, 97.8, 98.0, 98.3], source: 'curated' },
  { symbol: 'KOTAKFLEXI', name: 'Kotak Flexicap Direct Growth', sector: 'Large & Flexi Cap', market: 'india', marketCapB: 6.4, price: '86.75', unit: 'INR', changePercent: 0.91, sparkline: [85.2, 85.6, 86.0, 86.4, 86.75], source: 'curated' },
  { symbol: 'MIRAEBLUE', name: 'Mirae Asset Large Cap Direct', sector: 'Large & Flexi Cap', market: 'india', marketCapB: 4.9, price: '124.80', unit: 'INR', changePercent: 0.44, sparkline: [123.6, 123.9, 124.2, 124.5, 124.8], source: 'curated' },
  { symbol: 'CANBLUE', name: 'Canara Robeco Bluechip Direct', sector: 'Large & Flexi Cap', market: 'india', marketCapB: 1.9, price: '67.14', unit: 'INR', changePercent: 0.63, sparkline: [66.2, 66.4, 66.7, 66.9, 67.14], source: 'curated' },
  { symbol: 'HDFCFLEXI', name: 'HDFC Flexi Cap Direct Growth', sector: 'Large & Flexi Cap', market: 'india', marketCapB: 7.4, price: '1,964.20', unit: 'INR', changePercent: 1.08, sparkline: [1928, 1937, 1946, 1955, 1964.2], source: 'curated' },

  // 2. Mid & Multi Cap (8)
  { symbol: 'HDFCMID', name: 'HDFC Mid-Cap Opp. Direct', sector: 'Mid & Multi Cap', market: 'india', marketCapB: 9.1, price: '198.40', unit: 'INR', changePercent: 1.15, sparkline: [193.5, 194.8, 196.1, 197.3, 198.4], source: 'curated' },
  { symbol: 'KOTAKEMERG', name: 'Kotak Emerging Equity Direct', sector: 'Mid & Multi Cap', market: 'india', marketCapB: 6.2, price: '142.90', unit: 'INR', changePercent: 1.04, sparkline: [139.8, 140.5, 141.4, 142.1, 142.9], source: 'curated' },
  { symbol: 'MOTILALMID', name: 'Motilal Oswal Midcap Direct', sector: 'Mid & Multi Cap', market: 'india', marketCapB: 3.6, price: '108.55', unit: 'INR', changePercent: 1.46, sparkline: [105.1, 106.0, 106.9, 107.7, 108.55], source: 'curated' },
  { symbol: 'AXISMID', name: 'Axis Midcap Direct Growth', sector: 'Mid & Multi Cap', market: 'india', marketCapB: 3.8, price: '122.10', unit: 'INR', changePercent: 0.72, sparkline: [120.3, 120.8, 121.2, 121.7, 122.1], source: 'curated' },
  { symbol: 'SBIMID', name: 'SBI Magnum Midcap Direct', sector: 'Mid & Multi Cap', market: 'india', marketCapB: 2.7, price: '248.60', unit: 'INR', changePercent: 0.89, sparkline: [244.1, 245.3, 246.4, 247.6, 248.6], source: 'curated' },
  { symbol: 'DSPMID', name: 'DSP Midcap Direct Growth', sector: 'Mid & Multi Cap', market: 'india', marketCapB: 2.3, price: '154.35', unit: 'INR', changePercent: -0.22, sparkline: [155.1, 154.9, 154.7, 154.5, 154.35], source: 'curated' },
  { symbol: 'QUANTACT', name: 'Quant Active Multi Cap Direct', sector: 'Mid & Multi Cap', market: 'india', marketCapB: 1.5, price: '684.10', unit: 'INR', changePercent: 1.28, sparkline: [667, 671, 675, 680, 684.1], source: 'curated' },
  { symbol: 'NIPPONGRW', name: 'Nippon India Growth Direct', sector: 'Mid & Multi Cap', market: 'india', marketCapB: 4.1, price: '4,218.50', unit: 'INR', changePercent: 1.18, sparkline: [4125, 4148, 4172, 4195, 4218.5], source: 'curated' },

  // 3. Small Cap & Value (7)
  { symbol: 'QUANTSC', name: 'Quant Small Cap Direct Growth', sector: 'Small Cap & Value', market: 'india', marketCapB: 3.4, price: '264.15', unit: 'INR', changePercent: 1.42, sparkline: [257.2, 259.1, 260.8, 262.5, 264.15], source: 'curated' },
  { symbol: 'SBISMALL', name: 'SBI Small Cap Direct Growth', sector: 'Small Cap & Value', market: 'india', marketCapB: 4.1, price: '189.70', unit: 'INR', changePercent: 0.95, sparkline: [186.1, 187.0, 187.9, 188.8, 189.7], source: 'curated' },
  { symbol: 'HDFCSMALL', name: 'HDFC Small Cap Direct Growth', sector: 'Small Cap & Value', market: 'india', marketCapB: 4.0, price: '148.20', unit: 'INR', changePercent: 0.84, sparkline: [145.6, 146.3, 146.9, 147.6, 148.2], source: 'curated' },
  { symbol: 'ICICIVAL', name: 'ICICI Pru Value Discovery Direct', sector: 'Small Cap & Value', market: 'india', marketCapB: 5.8, price: '482.30', unit: 'INR', changePercent: 0.68, sparkline: [475.8, 477.4, 479.1, 480.7, 482.3], source: 'curated' },
  { symbol: 'BANDHANCOR', name: 'Bandhan Core Equity Direct', sector: 'Small Cap & Value', market: 'india', marketCapB: 1.1, price: '138.90', unit: 'INR', changePercent: 1.31, sparkline: [135.4, 136.3, 137.2, 138.0, 138.9], source: 'curated' },
  { symbol: 'FRANKPRIMA', name: 'Franklin India Prima Direct', sector: 'Small Cap & Value', market: 'india', marketCapB: 1.6, price: '2,894.10', unit: 'INR', changePercent: 0.57, sparkline: [2862, 2870, 2878, 2886, 2894.1], source: 'curated' },
  { symbol: 'TATASC', name: 'Tata Small Cap Direct Growth', sector: 'Small Cap & Value', market: 'india', marketCapB: 1.3, price: '43.65', unit: 'INR', changePercent: -0.34, sparkline: [44.0, 43.9, 43.82, 43.74, 43.65], source: 'curated' },

  // 4. Index & Factor ETFs (7)
  { symbol: 'UTI50', name: 'UTI Nifty 50 Index Direct', sector: 'Index & Factor ETFs', market: 'india', marketCapB: 2.8, price: '174.88', unit: 'INR', changePercent: 0.96, sparkline: [172.1, 172.8, 173.5, 174.2, 174.88], source: 'curated' },
  { symbol: 'SBINIFTY', name: 'SBI Nifty 50 ETF', sector: 'Index & Factor ETFs', market: 'india', marketCapB: 22.5, price: '266.40', unit: 'INR', changePercent: 0.98, sparkline: [261.8, 263.0, 264.1, 265.2, 266.4], source: 'curated' },
  { symbol: 'ICICIN50', name: 'ICICI Pru Nifty 50 ETF', sector: 'Index & Factor ETFs', market: 'india', marketCapB: 3.1, price: '278.90', unit: 'INR', changePercent: 0.94, sparkline: [274.2, 275.4, 276.6, 277.8, 278.9], source: 'curated' },
  { symbol: 'UTINEXT50', name: 'UTI Nifty Next 50 Index Direct', sector: 'Index & Factor ETFs', market: 'india', marketCapB: 1.4, price: '26.42', unit: 'INR', changePercent: 1.34, sparkline: [25.8, 25.95, 26.1, 26.26, 26.42], source: 'curated' },
  { symbol: 'MOMID150', name: 'Motilal Oswal Midcap 150 Index', sector: 'Index & Factor ETFs', market: 'india', marketCapB: 1.2, price: '36.85', unit: 'INR', changePercent: 1.22, sparkline: [36.05, 36.25, 36.45, 36.65, 36.85], source: 'curated' },
  { symbol: 'HDFCSENSEX', name: 'HDFC Index Sensex Direct', sector: 'Index & Factor ETFs', market: 'india', marketCapB: 1.7, price: '764.10', unit: 'INR', changePercent: 0.87, sparkline: [752.4, 755.3, 758.2, 761.1, 764.1], source: 'curated' },
  { symbol: 'BANKBEES', name: 'Nifty Bank Index ETF', sector: 'Index & Factor ETFs', market: 'india', marketCapB: 1.6, price: '542.80', unit: 'INR', changePercent: 0.84, sparkline: [535.4, 537.5, 539.4, 541.2, 542.8], source: 'curated' },

  // 5. Hybrid & Multi-Asset (5)
  { symbol: 'HDFCBAL', name: 'HDFC Balanced Advantage Direct', sector: 'Hybrid & Multi-Asset', market: 'india', marketCapB: 11.2, price: '532.40', unit: 'INR', changePercent: 0.62, sparkline: [526.2, 527.8, 529.3, 530.9, 532.4], source: 'curated' },
  { symbol: 'ICICIBAF', name: 'ICICI Pru Balanced Adv. Direct', sector: 'Hybrid & Multi-Asset', market: 'india', marketCapB: 7.4, price: '79.85', unit: 'INR', changePercent: 0.48, sparkline: [79.1, 79.3, 79.5, 79.68, 79.85], source: 'curated' },
  { symbol: 'SBIHYBRID', name: 'SBI Equity Hybrid Direct', sector: 'Hybrid & Multi-Asset', market: 'india', marketCapB: 8.6, price: '304.15', unit: 'INR', changePercent: 0.56, sparkline: [300.9, 301.7, 302.5, 303.3, 304.15], source: 'curated' },
  { symbol: 'EDELBAF', name: 'Edelweiss Balanced Adv. Direct', sector: 'Hybrid & Multi-Asset', market: 'india', marketCapB: 1.5, price: '54.90', unit: 'INR', changePercent: 0.41, sparkline: [54.45, 54.56, 54.67, 54.78, 54.9], source: 'curated' },
  { symbol: 'ICICIMA', name: 'ICICI Pru Multi-Asset Direct', sector: 'Hybrid & Multi-Asset', market: 'india', marketCapB: 6.1, price: '764.80', unit: 'INR', changePercent: 0.79, sparkline: [754.0, 756.7, 759.4, 762.1, 764.8], source: 'curated' },

  // 6. Gilt & Corporate Debt (6)
  { symbol: 'HDFCCORP', name: 'HDFC Corporate Bond Direct', sector: 'Gilt & Corporate Debt', market: 'india', marketCapB: 3.85, price: '33.48', unit: 'INR', changePercent: 0.24, sparkline: [33.26, 33.32, 33.38, 33.43, 33.48], source: 'curated' },
  { symbol: 'SBIGILT', name: 'SBI Magnum Gilt Fund Direct', sector: 'Gilt & Corporate Debt', market: 'india', marketCapB: 1.32, price: '68.14', unit: 'INR', changePercent: 0.35, sparkline: [67.55, 67.7, 67.85, 68.0, 68.14], source: 'curated' },
  { symbol: 'ICICIGILT', name: 'ICICI Pru All Seasons Bond', sector: 'Gilt & Corporate Debt', market: 'india', marketCapB: 1.68, price: '39.84', unit: 'INR', changePercent: 0.31, sparkline: [39.52, 39.6, 39.68, 39.76, 39.84], source: 'curated' },
  { symbol: 'BBOND36', name: 'Bharat Bond ETF 2036 AAA', sector: 'Gilt & Corporate Debt', market: 'india', marketCapB: 2.15, price: '1,218.40', unit: 'INR', changePercent: 0.29, sparkline: [1211, 1213, 1215, 1217, 1218.4], source: 'curated' },
  { symbol: 'AXISBPSU', name: 'Axis Banking & PSU Debt Direct', sector: 'Gilt & Corporate Debt', market: 'india', marketCapB: 1.72, price: '2,542.80', unit: 'INR', changePercent: 0.21, sparkline: [2532, 2535, 2538, 2540.5, 2542.8], source: 'curated' },
  { symbol: 'KOTAKST', name: 'Kotak Bond Short Term Direct', sector: 'Gilt & Corporate Debt', market: 'india', marketCapB: 2.05, price: '54.12', unit: 'INR', changePercent: 0.19, sparkline: [53.9, 53.96, 54.01, 54.07, 54.12], source: 'curated' },

  // 7. Liquid & Bullion (5)
  { symbol: 'PARAGLIQ', name: 'PPFAS Liquid Direct Growth', sector: 'Liquid & Bullion', market: 'india', marketCapB: 0.82, price: '1,442.60', unit: 'INR', changePercent: 0.03, sparkline: [1441.8, 1442.0, 1442.2, 1442.4, 1442.6], source: 'curated' },
  { symbol: 'HDFCLIQ', name: 'HDFC Liquid Direct Growth', sector: 'Liquid & Bullion', market: 'india', marketCapB: 8.4, price: '5,048.20', unit: 'INR', changePercent: 0.02, sparkline: [5046.0, 5046.6, 5047.1, 5047.7, 5048.2], source: 'curated' },
  { symbol: 'SBILIQ', name: 'SBI Liquid Direct Growth', sector: 'Liquid & Bullion', market: 'india', marketCapB: 7.9, price: '4,021.10', unit: 'INR', changePercent: 0.02, sparkline: [4019.4, 4019.9, 4020.3, 4020.7, 4021.1], source: 'curated' },
  { symbol: 'SBIGOLD', name: 'SBI Gold Direct Plan Growth', sector: 'Liquid & Bullion', market: 'india', marketCapB: 1.35, price: '28.94', unit: 'INR', changePercent: 1.18, sparkline: [28.3, 28.46, 28.62, 28.78, 28.94], source: 'curated' },
  { symbol: 'SGBMAR31', name: 'Sovereign Gold Bond 2031', sector: 'Liquid & Bullion', market: 'india', marketCapB: 1.15, price: '8,412.00', unit: 'INR', changePercent: 1.12, sparkline: [8260, 8300, 8340, 8378, 8412], source: 'curated' },

  // ======================== GLOBAL ETFS & MULTI-ASSET (30) ========================
  // 1. US Broad Market (7)
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', sector: 'US Broad Market', market: 'global', marketCapB: 585, price: '549.10', unit: 'USD', changePercent: 0.45, sparkline: [543, 545, 546.5, 548, 549.1], source: 'curated' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'US Broad Market', market: 'global', marketCapB: 625, price: '598.40', unit: 'USD', changePercent: 0.42, sparkline: [592, 594, 595.5, 597, 598.4], source: 'curated' },
  { symbol: 'IVV', name: 'iShares Core S&P 500 ETF', sector: 'US Broad Market', market: 'global', marketCapB: 560, price: '601.20', unit: 'USD', changePercent: 0.44, sparkline: [595, 596.5, 598.1, 599.6, 601.2], source: 'curated' },
  { symbol: 'VTI', name: 'Vanguard Total Stock ETF', sector: 'US Broad Market', market: 'global', marketCapB: 455, price: '294.15', unit: 'USD', changePercent: 0.39, sparkline: [291.5, 292.2, 292.9, 293.5, 294.15], source: 'curated' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust ETF', sector: 'US Broad Market', market: 'global', marketCapB: 315, price: '514.20', unit: 'USD', changePercent: -0.35, sparkline: [518, 517, 516, 515, 514.2], source: 'curated' },
  { symbol: 'SCHD', name: 'Schwab US Dividend Equity ETF', sector: 'US Broad Market', market: 'global', marketCapB: 68.5, price: '28.94', unit: 'USD', changePercent: 0.51, sparkline: [28.62, 28.7, 28.78, 28.86, 28.94], source: 'curated' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', sector: 'US Broad Market', market: 'global', marketCapB: 74.2, price: '228.60', unit: 'USD', changePercent: 0.86, sparkline: [224.8, 225.8, 226.7, 227.7, 228.6], source: 'curated' },

  // 2. Sector & Factor ETFs (6)
  { symbol: 'XLK', name: 'Technology Select Sector SPDR', sector: 'Sector & Factor ETFs', market: 'global', marketCapB: 72.4, price: '234.80', unit: 'USD', changePercent: -0.48, sparkline: [237.2, 236.6, 236.0, 235.4, 234.8], source: 'curated' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR', sector: 'Sector & Factor ETFs', market: 'global', marketCapB: 51.8, price: '49.65', unit: 'USD', changePercent: 0.74, sparkline: [48.9, 49.1, 49.3, 49.48, 49.65], source: 'curated' },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR', sector: 'Sector & Factor ETFs', market: 'global', marketCapB: 41.2, price: '146.90', unit: 'USD', changePercent: 0.32, sparkline: [145.9, 146.2, 146.4, 146.65, 146.9], source: 'curated' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR', sector: 'Sector & Factor ETFs', market: 'global', marketCapB: 36.4, price: '92.40', unit: 'USD', changePercent: -0.64, sparkline: [93.7, 93.4, 93.1, 92.75, 92.4], source: 'curated' },
  { symbol: 'QUAL', name: 'iShares MSCI USA Quality ETF', sector: 'Sector & Factor ETFs', market: 'global', marketCapB: 50.2, price: '182.30', unit: 'USD', changePercent: 0.38, sparkline: [180.9, 181.2, 181.6, 181.95, 182.3], source: 'curated' },
  { symbol: 'MTUM', name: 'iShares MSCI USA Momentum ETF', sector: 'Sector & Factor ETFs', market: 'global', marketCapB: 16.5, price: '214.50', unit: 'USD', changePercent: 0.92, sparkline: [210.6, 211.6, 212.6, 213.5, 214.5], source: 'curated' },

  // 3. International & EM (6)
  { symbol: 'VXUS', name: 'Vanguard Total Intl Stock ETF', sector: 'International & EM', market: 'global', marketCapB: 84.5, price: '64.30', unit: 'USD', changePercent: 0.52, sparkline: [63.5, 63.7, 63.9, 64.1, 64.3], source: 'curated' },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed ETF', sector: 'International & EM', market: 'global', marketCapB: 142.0, price: '51.45', unit: 'USD', changePercent: 0.36, sparkline: [51.0, 51.1, 51.22, 51.34, 51.45], source: 'curated' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging ETF', sector: 'International & EM', market: 'global', marketCapB: 84.2, price: '46.80', unit: 'USD', changePercent: 0.78, sparkline: [46.05, 46.24, 46.42, 46.61, 46.8], source: 'curated' },
  { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', sector: 'International & EM', market: 'global', marketCapB: 58.2, price: '82.10', unit: 'USD', changePercent: -0.24, sparkline: [82.5, 82.4, 82.3, 82.2, 82.1], source: 'curated' },
  { symbol: 'INDA', name: 'iShares MSCI India ETF', sector: 'International & EM', market: 'global', marketCapB: 11.4, price: '54.85', unit: 'USD', changePercent: 0.96, sparkline: [53.8, 54.1, 54.35, 54.6, 54.85], source: 'curated' },
  { symbol: 'EWJ', name: 'iShares MSCI Japan ETF', sector: 'International & EM', market: 'global', marketCapB: 16.8, price: '71.40', unit: 'USD', changePercent: 0.61, sparkline: [70.5, 70.72, 70.95, 71.18, 71.4], source: 'curated' },

  // 4. Fixed Income & Treasury (6)
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', sector: 'Fixed Income & Treasury', market: 'global', marketCapB: 124, price: '72.90', unit: 'USD', changePercent: 0.26, sparkline: [72.4, 72.52, 72.66, 72.78, 72.9], source: 'curated' },
  { symbol: 'AGG', name: 'iShares U.S. Aggregate Bond ETF', sector: 'Fixed Income & Treasury', market: 'global', marketCapB: 121, price: '98.75', unit: 'USD', changePercent: 0.28, sparkline: [97.9, 98.1, 98.35, 98.55, 98.75], source: 'curated' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury ETF', sector: 'Fixed Income & Treasury', market: 'global', marketCapB: 62.5, price: '91.40', unit: 'USD', changePercent: 0.64, sparkline: [89.8, 90.2, 90.6, 91.0, 91.4], source: 'curated' },
  { symbol: 'IEF', name: 'iShares 7-10 Year Treasury ETF', sector: 'Fixed Income & Treasury', market: 'global', marketCapB: 32.1, price: '94.80', unit: 'USD', changePercent: 0.31, sparkline: [94.2, 94.35, 94.5, 94.65, 94.8], source: 'curated' },
  { symbol: 'SGOV', name: 'iShares 0-3 Month Treasury ETF', sector: 'Fixed Income & Treasury', market: 'global', marketCapB: 38.4, price: '100.42', unit: 'USD', changePercent: 0.04, sparkline: [100.34, 100.36, 100.38, 100.4, 100.42], source: 'curated' },
  { symbol: 'LQD', name: 'iShares Investment Grade Corp ETF', sector: 'Fixed Income & Treasury', market: 'global', marketCapB: 32.8, price: '108.60', unit: 'USD', changePercent: 0.34, sparkline: [107.8, 108.0, 108.2, 108.4, 108.6], source: 'curated' },

  // 5. Commodities & Real Assets (5)
  { symbol: 'GLD', name: 'SPDR Gold Shares ETF', sector: 'Commodities & Real Assets', market: 'global', marketCapB: 78.6, price: '306.40', unit: 'USD', changePercent: 1.27, sparkline: [299, 301, 303, 304.8, 306.4], source: 'curated' },
  { symbol: 'IAU', name: 'iShares Gold Trust ETF', sector: 'Commodities & Real Assets', market: 'global', marketCapB: 42.4, price: '62.85', unit: 'USD', changePercent: 1.24, sparkline: [61.4, 61.8, 62.1, 62.5, 62.85], source: 'curated' },
  { symbol: 'SLV', name: 'iShares Silver Trust ETF', sector: 'Commodities & Real Assets', market: 'global', marketCapB: 15.6, price: '31.95', unit: 'USD', changePercent: 1.48, sparkline: [30.9, 31.2, 31.45, 31.7, 31.95], source: 'curated' },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', sector: 'Commodities & Real Assets', market: 'global', marketCapB: 36.2, price: '91.15', unit: 'USD', changePercent: 0.42, sparkline: [90.3, 90.5, 90.72, 90.94, 91.15], source: 'curated' },
  { symbol: 'DBC', name: 'Invesco DB Commodity Index ETF', sector: 'Commodities & Real Assets', market: 'global', marketCapB: 2.1, price: '22.84', unit: 'USD', changePercent: -0.44, sparkline: [23.08, 23.02, 22.96, 22.9, 22.84], source: 'curated' },
];

export const CUSTOM_HEATMAP_STORAGE_KEY = 'financia_custom_heatmap_v1';

/**
 * Classifies any raw AMFI scheme name/category from SQLite nav_master into clean asset-class buckets.
 */
export function classifyAmfiSchemeToSector(schemeName: string, category?: string): string {
  const haystack = `${schemeName} ${category || ''}`.toLowerCase();
  if (haystack.includes('liquid') || haystack.includes('overnight') || haystack.includes('money market')) {
    return 'Liquid & Overnight';
  }
  if (haystack.includes('gold') || haystack.includes('silver') || haystack.includes('commodity')) {
    return 'Bullion & Commodities';
  }
  if (
    haystack.includes('gilt') ||
    haystack.includes('debt') ||
    haystack.includes('bond') ||
    haystack.includes('income') ||
    haystack.includes('credit') ||
    haystack.includes('duration') ||
    haystack.includes('banking & psu') ||
    haystack.includes('psu debt') ||
    haystack.includes('floating') ||
    haystack.includes('treasury')
  ) {
    return 'Gilt & Corporate Debt';
  }
  if (
    haystack.includes('hybrid') ||
    haystack.includes('balanced') ||
    haystack.includes('arbitrage') ||
    haystack.includes('multi asset') ||
    haystack.includes('multi-asset') ||
    haystack.includes('long-short') ||
    haystack.includes('sif')
  ) {
    return 'Hybrid & Multi-Asset';
  }
  if (haystack.includes('small cap') || haystack.includes('small-cap') || haystack.includes('micro')) {
    return 'Small Cap & Value';
  }
  if (haystack.includes('mid cap') || haystack.includes('midcap') || haystack.includes('mid-cap') || haystack.includes('multi cap')) {
    return 'Mid & Multi Cap';
  }
  if (haystack.includes('index') || haystack.includes('nifty') || haystack.includes('sensex') || haystack.includes('etf')) {
    return 'Index & Factor ETFs';
  }
  if (
    haystack.includes('pharma') ||
    haystack.includes('infra') ||
    haystack.includes('tech') ||
    haystack.includes('banking') ||
    haystack.includes('consumption') ||
    haystack.includes('energy') ||
    haystack.includes('manufacturing') ||
    haystack.includes('thematic') ||
    haystack.includes('sector')
  ) {
    return 'Sectoral & Thematic';
  }
  return 'Large & Flexi Cap';
}

function deterministicHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

/**
 * Transforms live SQLite nav_master schemes into structured HeatmapStockTiles for treemap rendering.
 */
export function amfiSchemesToHeatmapTiles(schemes: NavMasterSchemeRow[]): HeatmapStockTile[] {
  const seen = new Set<string>();
  const tiles: HeatmapStockTile[] = [];

  for (const row of schemes) {
    const code = String(row.scheme_code || '').trim();
    const name = String(row.scheme_name || '').trim();
    if (!code || !name || seen.has(code)) continue;
    seen.add(code);

    const nav = Number(row.latest_nav);
    const safeNav = Number.isFinite(nav) && nav > 0 ? nav : 10;
    const sector = classifyAmfiSchemeToSector(name, row.category);
    const hash = deterministicHash(`${code}:${name}`);

    // Calibrate realistic daily % range by asset class
    const isDebtOrLiquid = sector === 'Liquid & Overnight' || sector === 'Gilt & Corporate Debt';
    const rawUnit = ((hash % 2001) - 850) / 1000; // slightly positive drift
    const changePercent = Number(
      (isDebtOrLiquid ? rawUnit * 0.28 : rawUnit * 1.45).toFixed(2)
    );

    const sparkline: number[] = [];
    for (let i = 4; i >= 0; i--) {
      const stepFactor = 1 - (changePercent / 100) * (i / 4) * (0.7 + ((hash >> (i * 2)) % 6) * 0.08);
      sparkline.push(Number(Math.max(0.5, safeNav * stepFactor).toFixed(2)));
    }
    sparkline[sparkline.length - 1] = Number(safeNav.toFixed(2));

    const historyWeight = Math.max(0.6, Math.min(8.5, Math.log10((row.nav_count || 60) + 10) * 2.2));

    tiles.push({
      symbol: code,
      name,
      sector,
      market: 'india',
      marketCapB: Number(historyWeight.toFixed(2)),
      price: safeNav >= 1000
        ? safeNav.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : safeNav.toFixed(2),
      unit: 'INR',
      changePercent,
      sparkline,
      source: 'amfi-db',
      amfiCode: code,
    });
  }

  return tiles;
}

/**
 * Converts user-defined custom entries into full HeatmapStockTiles, hydrating from curated or live pools.
 */
export function buildCustomHeatmapTiles(
  entries: CustomHeatmapEntry[],
  referencePool: HeatmapStockTile[]
): HeatmapStockTile[] {
  const bySymbol = new Map<string, HeatmapStockTile>();
  for (const t of referencePool) {
    bySymbol.set(t.symbol.toUpperCase(), t);
  }

  const out: HeatmapStockTile[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = entry.symbol.toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const matched = bySymbol.get(key);
    if (matched) {
      out.push({
        ...matched,
        sector: entry.sector || matched.sector,
      });
    } else {
      const safePrice = entry.price || '100.00';
      const numericPrice = parseFormattedPrice(safePrice);
      const changePct = typeof entry.changePercent === 'number' ? entry.changePercent : 0.45;
      out.push({
        symbol: entry.symbol,
        name: entry.name || entry.symbol,
        sector: entry.sector || 'My Custom Funds',
        market: entry.market || 'india',
        marketCapB: entry.marketCapB || 2.5,
        price: safePrice,
        unit: entry.unit || 'INR',
        changePercent: changePct,
        sparkline:
          entry.sparkline && entry.sparkline.length >= 2
            ? entry.sparkline
            : [
                Number((numericPrice * 0.985).toFixed(2)),
                Number((numericPrice * 0.99).toFixed(2)),
                Number((numericPrice * 0.994).toFixed(2)),
                Number((numericPrice * 0.997).toFixed(2)),
                numericPrice,
              ],
        source: entry.source || 'amfi-db',
        amfiCode: entry.amfiCode,
      });
    }
  }
  return out;
}

export function loadCustomHeatmapEntries(): CustomHeatmapEntry[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_HEATMAP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CustomHeatmapEntry =>
        Boolean(item && typeof item.symbol === 'string' && typeof item.name === 'string')
    );
  } catch {
    return [];
  }
}

export function persistCustomHeatmapEntries(entries: CustomHeatmapEntry[]): void {
  try {
    window.localStorage.setItem(CUSTOM_HEATMAP_STORAGE_KEY, JSON.stringify(entries.slice(0, 120)));
  } catch {
    // Non-fatal in private browsing
  }
}

export function filterHeatmapTilesByQuery(
  tiles: HeatmapStockTile[],
  query: string
): HeatmapStockTile[] {
  const q = query.trim().toLowerCase();
  if (!q) return tiles;
  return tiles.filter(
    (t) =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.sector.toLowerCase().includes(q)
  );
}

/**
 * Computes annualized realized volatility (%) from an instrument's rolling price series
 * blended with its intraday return magnitude so low-beta and high-beta leaders separate cleanly.
 */
export function calculateRealizedVolatility(
  sparkline: number[],
  changePercent = 0
): number {
  const returns: number[] = [];
  for (let i = 1; i < sparkline.length; i++) {
    const prev = sparkline[i - 1];
    const curr = sparkline[i];
    if (prev > 0 && Number.isFinite(curr)) {
      returns.push((curr - prev) / prev);
    }
  }

  let stdDev = 0;
  if (returns.length >= 2) {
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance =
      returns.reduce((s, r) => s + (r - mean) * (r - mean), 0) / (returns.length - 1);
    stdDev = Math.sqrt(variance);
  } else if (returns.length === 1) {
    stdDev = Math.abs(returns[0]) * 0.5;
  }

  const annualized = stdDev * Math.sqrt(252) * 100;
  const sessionMomentumVol = Math.abs(changePercent) * 9.5 + 8.0;
  const combined = annualized * 0.65 + sessionMomentumVol * 0.55;

  return Number(Math.max(8.5, Math.min(72.0, combined)).toFixed(1));
}

export function getVolatilityTileStyle(volatilityPct: number): HeatmapVolatilityColors {
  if (volatilityPct >= 11.8) {
    return {
      bg: '#BE123C',
      bgEnd: '#4C0519',
      border: 'rgba(251, 113, 133, 0.55)',
      sparkColor: '#FDA4AF',
      text: '#FFFFFF',
      subText: '#FFE4E6',
      tier: 'Extreme',
    };
  }
  if (volatilityPct >= 10.4) {
    return {
      bg: '#B45309',
      bgEnd: '#451A03',
      border: 'rgba(251, 191, 36, 0.50)',
      sparkColor: '#FDE68A',
      text: '#FFFFFF',
      subText: '#FEF3C7',
      tier: 'Elevated',
    };
  }
  if (volatilityPct >= 9.1) {
    return {
      bg: '#1D4ED8',
      bgEnd: '#0F172A',
      border: 'rgba(96, 165, 250, 0.45)',
      sparkColor: '#93C5FD',
      text: '#FFFFFF',
      subText: '#DBEAFE',
      tier: 'Moderate',
    };
  }
  return {
    bg: '#0F4C5C',
    bgEnd: '#071D26',
    border: 'rgba(56, 189, 248, 0.36)',
    sparkColor: '#7DD3FC',
    text: '#F8FAFC',
    subText: '#BAE6FD',
    tier: 'Calm',
  };
}

export function getHeatmapTileStyle(changePercent: number): HeatmapTileColors {
  if (changePercent >= 1.25) {
    return {
      bg: '#059669',
      bgEnd: '#064E3B',
      border: 'rgba(52, 211, 153, 0.58)',
      sparkColor: '#6EE7B7',
      text: '#FFFFFF',
      subText: '#D1FAE5',
      tier: 'Strong Gain',
    };
  }
  if (changePercent >= 0.75) {
    return {
      bg: '#0D9488',
      bgEnd: '#115E59',
      border: 'rgba(45, 212, 191, 0.46)',
      sparkColor: '#5EEAD4',
      text: '#FFFFFF',
      subText: '#CCFBF1',
      tier: 'Gain',
    };
  }
  if (changePercent >= 0.25) {
    return {
      bg: '#1D4ED8',
      bgEnd: '#172554',
      border: 'rgba(96, 165, 250, 0.44)',
      sparkColor: '#93C5FD',
      text: '#FFFFFF',
      subText: '#DBEAFE',
      tier: 'Gain',
    };
  }
  if (changePercent > 0) {
    return {
      bg: '#1E293B',
      bgEnd: '#0F172A',
      border: 'rgba(56, 189, 248, 0.34)',
      sparkColor: '#38BDF8',
      text: '#F8FAFC',
      subText: '#94A3B8',
      tier: 'Gain',
    };
  }
  if (changePercent === 0) {
    return {
      bg: '#334155',
      bgEnd: '#1E293B',
      border: 'rgba(148, 163, 184, 0.36)',
      sparkColor: '#CBD5E1',
      text: '#F8FAFC',
      subText: '#CBD5E1',
      tier: 'Flat',
    };
  }
  if (changePercent > -0.5) {
    return {
      bg: '#9F1239',
      bgEnd: '#4C0519',
      border: 'rgba(251, 113, 133, 0.45)',
      sparkColor: '#FDA4AF',
      text: '#FFFFFF',
      subText: '#FFE4E6',
      tier: 'Loss',
    };
  }
  if (changePercent > -1.75) {
    return {
      bg: '#BE123C',
      bgEnd: '#881337',
      border: 'rgba(251, 113, 133, 0.56)',
      sparkColor: '#FECDD3',
      text: '#FFFFFF',
      subText: '#FFE4E6',
      tier: 'Loss',
    };
  }
  return {
    bg: '#991B1B',
    bgEnd: '#450A0A',
    border: 'rgba(248, 113, 113, 0.65)',
    sparkColor: '#FCA5A5',
    text: '#FFFFFF',
    subText: '#FECACA',
    tier: 'Sharp Loss',
  };
}

function parseFormattedPrice(raw: string): number {
  const num = Number(raw.replace(/,/g, ''));
  return Number.isFinite(num) && num > 0 ? num : 100;
}

function formatPricePreserveStyle(value: number, template: string): string {
  const hasComma = template.includes(',');
  const decimalsMatch = template.match(/\.(\d+)/);
  const decimals = decimalsMatch ? decimalsMatch[1].length : 2;
  if (hasComma) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return value.toFixed(decimals);
}

export function applyHeatmapTick(
  tiles: HeatmapStockTile[],
  tickStep: number
): HeatmapStockTile[] {
  return tiles.map((tile, idx) => {
    const baseNumeric = parseFormattedPrice(tile.price);
    const currentVol = calculateRealizedVolatility(tile.sparkline, tile.changePercent);
    const volScale = 0.0006 + (currentVol / 100) * 0.0022;
    const phase = tickStep * 1.37 + idx * 2.19;
    const wave = Math.sin(phase) * 0.68 + Math.cos(phase * 0.53) * 0.32;
    const pctStep = wave * volScale;

    const nextPrice = Math.max(0.5, baseNumeric * (1 + pctStep));
    const nextChangePct = Number(
      Math.max(-9.5, Math.min(9.5, tile.changePercent + pctStep * 100)).toFixed(2)
    );
    const nextSparkline = [...tile.sparkline.slice(-15), Number(nextPrice.toFixed(2))];

    return {
      ...tile,
      price: formatPricePreserveStyle(nextPrice, tile.price),
      changePercent: nextChangePct,
      sparkline: nextSparkline,
    };
  });
}

/**
 * Groups heatmap tiles by sector with AUM-weighted return, realized volatility, and dispersion.
 * Accepts 'india', 'global', or 'all' / 'amfi' / 'custom' (no market filter on the passed tile slice).
 */
export function buildSectorGroups(
  tiles: HeatmapStockTile[],
  scope: HeatmapMarket | HeatmapScope,
  sectorFilter = 'All'
): HeatmapSectorGroup[] {
  const marketTiles =
    scope === 'india' || scope === 'global'
      ? tiles.filter((t) => t.market === scope)
      : tiles;
  const filtered =
    sectorFilter === 'All'
      ? marketTiles
      : marketTiles.filter((t) => t.sector === sectorFilter);

  const map = new Map<string, HeatmapStockTile[]>();
  for (const tile of filtered) {
    const arr = map.get(tile.sector) || [];
    arr.push(tile);
    map.set(tile.sector, arr);
  }

  const groups: HeatmapSectorGroup[] = [];
  for (const [sector, items] of map.entries()) {
    const sortedItems = [...items].sort((a, b) => b.marketCapB - a.marketCapB);
    const totalCapB = sortedItems.reduce((sum, t) => sum + t.marketCapB, 0);
    const weightedSum = sortedItems.reduce((sum, t) => sum + t.changePercent * t.marketCapB, 0);
    const avgChangePercent =
      totalCapB > 0 ? Number((weightedSum / totalCapB).toFixed(2)) : 0;

    const weightedVol = sortedItems.reduce(
      (sum, t) => sum + calculateRealizedVolatility(t.sparkline, t.changePercent) * t.marketCapB,
      0
    );
    const volatilityPct =
      totalCapB > 0 ? Number((weightedVol / totalCapB).toFixed(1)) : 0;

    const pctList = sortedItems.map((t) => t.changePercent);
    const dispersionPct =
      pctList.length > 1
        ? Number((Math.max(...pctList) - Math.min(...pctList)).toFixed(2))
        : 0;

    groups.push({
      sector,
      totalCapB,
      avgChangePercent,
      volatilityPct,
      dispersionPct,
      advancers: sortedItems.filter((t) => t.changePercent > 0).length,
      decliners: sortedItems.filter((t) => t.changePercent < 0).length,
      tiles: sortedItems,
    });
  }

  return groups.sort((a, b) => b.totalCapB - a.totalCapB);
}

interface HierarchyNodeData {
  name: string;
  group?: HeatmapSectorGroup;
  tile?: HeatmapStockTile;
  value?: number;
  children?: HierarchyNodeData[];
}

/**
 * Computes a D3.js squarified treemap layout over sector groups and fund tiles,
 * supporting AUM-weighted, Equal-tile, or Daily-Move magnitude sizing.
 */
export function computeD3TreemapLayout(
  groups: HeatmapSectorGroup[],
  width: number,
  height: number,
  sizingMode: HeatmapSizingMode = 'aum'
): D3TreemapLayoutResult {
  if (!groups || groups.length === 0 || width <= 0 || height <= 0) {
    return { sectors: [], tiles: [], maxVolatilityPct: 0 };
  }

  const resolveTileValue = (tile: HeatmapStockTile): number => {
    if (sizingMode === 'equal') return 1;
    if (sizingMode === 'move') return Math.max(0.25, Math.abs(tile.changePercent) + 0.35);
    return Math.max(0.55, Math.pow(Math.max(0.15, tile.marketCapB), 0.34));
  };

  const rootData: HierarchyNodeData = {
    name: 'market-root',
    children: groups.map((group) => ({
      name: group.sector,
      group,
      children: group.tiles.map((tile) => ({
        name: tile.symbol,
        tile,
        value: resolveTileValue(tile),
      })),
    })),
  };

  const hierarchyRoot = d3
    .hierarchy<HierarchyNodeData>(rootData)
    .sum((d) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  d3
    .treemap<HierarchyNodeData>()
    .tile(d3.treemapSquarify)
    .size([width, height])
    .paddingOuter(4)
    .paddingTop(24)
    .paddingInner(3)
    .round(true)(hierarchyRoot);

  const treemapRoot = hierarchyRoot as d3.HierarchyRectangularNode<HierarchyNodeData>;

  const sectors: D3TreemapSectorRect[] = (treemapRoot.children || [])
    .filter((node) => node.data.group)
    .map((node) => {
      const grp = node.data.group!;
      return {
        sector: grp.sector,
        x0: node.x0,
        y0: node.y0,
        x1: node.x1,
        y1: node.y1,
        avgChangePercent: grp.avgChangePercent,
        volatilityPct: grp.volatilityPct,
        dispersionPct: grp.dispersionPct,
        totalCapB: grp.totalCapB,
      };
    });

  const leaves = treemapRoot.leaves().filter((leaf) => Boolean(leaf.data.tile));
  const tiles: D3TreemapTileRect[] = leaves.map((leaf) => {
    const tile = leaf.data.tile!;
    return {
      tile,
      volatilityPct: calculateRealizedVolatility(tile.sparkline, tile.changePercent),
      x0: leaf.x0,
      y0: leaf.y0,
      x1: leaf.x1,
      y1: leaf.y1,
    };
  });

  const maxVolatilityPct =
    tiles.length > 0 ? Math.max(...tiles.map((t) => t.volatilityPct)) : 0;

  return { sectors, tiles, maxVolatilityPct };
}

export function getHeatmapTileSpan(index: number, totalCount: number): string {
  if (totalCount <= 1) return 'col-span-4 row-span-2';
  if (totalCount === 2) return 'col-span-2 row-span-2';
  if (totalCount === 3) {
    return index === 0 ? 'col-span-2 row-span-2' : 'col-span-2 row-span-1';
  }
  if (totalCount === 4) {
    if (index === 0) return 'col-span-2 row-span-2';
    if (index === 1) return 'col-span-2 row-span-1';
    return 'col-span-1 row-span-1';
  }
  if (totalCount === 5) {
    if (index === 0 || index === 1) return 'col-span-2 row-span-2';
    if (index === 2) return 'col-span-2 row-span-1';
    return 'col-span-1 row-span-1';
  }
  return index < 2 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1';
}

export function heatmapTileToMarketSymbolRow(tile: HeatmapStockTile): MarketSymbolRow {
  const lowerSec = tile.sector.toLowerCase();
  const category: MarketSymbolRow['category'] =
    lowerSec.includes('gold') || lowerSec.includes('bullion') || lowerSec.includes('commodit')
      ? 'gold'
      : lowerSec.includes('gilt') ||
          lowerSec.includes('debt') ||
          lowerSec.includes('bond') ||
          lowerSec.includes('liquid') ||
          lowerSec.includes('fixed income') ||
          lowerSec.includes('treasury')
        ? 'debt_funds'
        : lowerSec.includes('etf') || tile.market === 'global'
          ? 'etfs'
          : 'mutual_funds';

  return {
    symbol: tile.symbol,
    name: tile.name,
    exchange: tile.market === 'india' ? 'AMFI / NSE' : 'NYSEARCA',
    price: tile.price,
    unit: tile.unit,
    changePercent: tile.changePercent,
    badgeText: tile.symbol.slice(0, 3),
    badgeColor: tile.changePercent >= 0 ? '#089981' : '#F23645',
    category,
    sparkline: tile.sparkline,
  };
}
