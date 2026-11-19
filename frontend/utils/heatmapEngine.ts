import * as d3 from 'd3';
import { MarketSymbolRow } from '../types/markets';

export type HeatmapMarket = 'global' | 'india';
export type HeatmapColorMode = 'volatility' | 'performance';

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
}

export interface HeatmapTileColors {
  bg: string;
  text: string;
  subText: string;
  tier: 'Strong Gain' | 'Gain' | 'Flat' | 'Loss' | 'Sharp Loss';
}

export interface HeatmapVolatilityColors {
  bg: string;
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

export const HEATMAP_STOCKS: HeatmapStockTile[] = [
  // Global Equities
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', market: 'global', marketCapB: 3390, price: '138.60', unit: 'USD', changePercent: 3.6, sparkline: [130, 132, 134, 135.5, 137, 138.6] },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', market: 'global', marketCapB: 3450, price: '228.45', unit: 'USD', changePercent: 1.4, sparkline: [224, 225, 226, 227, 228.45] },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', market: 'global', marketCapB: 3180, price: '462.10', unit: 'USD', changePercent: 1.18, sparkline: [454, 456, 458, 460, 462.1] },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', market: 'global', marketCapB: 274, price: '168.90', unit: 'USD', changePercent: 3.78, sparkline: [160, 162, 165, 167, 168.9] },
  { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology', market: 'global', marketCapB: 108, price: '23.40', unit: 'USD', changePercent: -2.45, sparkline: [24.2, 24.0, 23.8, 23.6, 23.4] },

  { symbol: 'META', name: 'Meta Platforms', sector: 'Communication', market: 'global', marketCapB: 1480, price: '588.40', unit: 'USD', changePercent: 1.54, sparkline: [576, 580, 583, 586, 588.4] },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication', market: 'global', marketCapB: 2240, price: '184.20', unit: 'USD', changePercent: -0.62, sparkline: [186, 185.5, 185, 184.6, 184.2] },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication', market: 'global', marketCapB: 355, price: '822.10', unit: 'USD', changePercent: 0.94, sparkline: [812, 815, 818, 820, 822.1] },

  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', market: 'global', marketCapB: 685, price: '241.80', unit: 'USD', changePercent: 0.85, sparkline: [238, 239, 240, 241, 241.8] },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', market: 'global', marketCapB: 590, price: '306.40', unit: 'USD', changePercent: -0.38, sparkline: [308, 307.5, 307, 306.8, 306.4] },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Financials', market: 'global', marketCapB: 185, price: '582.10', unit: 'USD', changePercent: 1.92, sparkline: [569, 573, 577, 580, 582.1] },

  { symbol: 'AMZN', name: 'Amazon.com', sector: 'Consumer', market: 'global', marketCapB: 2190, price: '209.60', unit: 'USD', changePercent: 0.48, sparkline: [208, 208.5, 209, 209.3, 209.6] },
  { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Consumer', market: 'global', marketCapB: 810, price: '254.80', unit: 'USD', changePercent: -1.24, sparkline: [259, 258, 257, 255.8, 254.8] },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer', market: 'global', marketCapB: 680, price: '84.90', unit: 'USD', changePercent: -0.22, sparkline: [85.2, 85.1, 85.0, 84.95, 84.9] },

  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', market: 'global', marketCapB: 515, price: '116.40', unit: 'USD', changePercent: -1.65, sparkline: [119, 118.4, 117.6, 117, 116.4] },
  { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy', market: 'global', marketCapB: 278, price: '154.20', unit: 'USD', changePercent: -2.1, sparkline: [158, 157.1, 156, 155.1, 154.2] },

  { symbol: 'LLY', name: 'Eli Lilly & Co.', sector: 'Healthcare', market: 'global', marketCapB: 790, price: '832.10', unit: 'USD', changePercent: 2.34, sparkline: [810, 816, 822, 828, 832.1] },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', market: 'global', marketCapB: 495, price: '538.40', unit: 'USD', changePercent: -0.84, sparkline: [544, 542, 540.5, 539.2, 538.4] },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', market: 'global', marketCapB: 382, price: '158.90', unit: 'USD', changePercent: 0.42, sparkline: [158, 158.2, 158.5, 158.7, 158.9] },

  // India NSE Leaders
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', sector: 'Financials', market: 'india', marketCapB: 162, price: '816.50', unit: 'INR', changePercent: 1.55, sparkline: [804, 807, 811, 814, 816.5] },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', sector: 'Financials', market: 'india', marketCapB: 134, price: '1,585.0', unit: 'INR', changePercent: 0.09, sparkline: [1581, 1582, 1583, 1584, 1585] },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Financials', market: 'india', marketCapB: 112, price: '1,090.5', unit: 'INR', changePercent: 0.97, sparkline: [1080, 1083, 1086, 1088, 1090.5] },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', sector: 'Financials', market: 'india', marketCapB: 45, price: '1,182.0', unit: 'INR', changePercent: -0.68, sparkline: [1192, 1189, 1186, 1184, 1182] },

  { symbol: 'TCS', name: 'Tata Consultancy', sector: 'Technology', market: 'india', marketCapB: 175, price: '4,142.0', unit: 'INR', changePercent: -0.92, sparkline: [4185, 4172, 4160, 4150, 4142] },
  { symbol: 'INFY', name: 'Infosys Ltd.', sector: 'Technology', market: 'india', marketCapB: 96, price: '1,145.1', unit: 'INR', changePercent: 0.32, sparkline: [1138, 1140, 1142, 1144, 1145.1] },
  { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'Technology', market: 'india', marketCapB: 62, price: '1,864.5', unit: 'INR', changePercent: 1.28, sparkline: [1838, 1846, 1852, 1859, 1864.5] },
  { symbol: 'KAYNES', name: 'Kaynes Technology', sector: 'Technology', market: 'india', marketCapB: 24, price: '2,980.0', unit: 'INR', changePercent: -3.45, sparkline: [3095, 3060, 3025, 3000, 2980] },

  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', market: 'india', marketCapB: 215, price: '1,298.4', unit: 'INR', changePercent: -1.14, sparkline: [1316, 1311, 1306, 1302, 1298.4] },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', sector: 'Energy', market: 'india', marketCapB: 41, price: '254.60', unit: 'INR', changePercent: -2.05, sparkline: [261, 259, 257.5, 256, 254.6] },

  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', sector: 'Telecom & Consumer', market: 'india', marketCapB: 146, price: '2,153.5', unit: 'INR', changePercent: 2.26, sparkline: [2105, 2118, 2130, 2142, 2153.5] },
  { symbol: 'ITC', name: 'ITC Limited', sector: 'Telecom & Consumer', market: 'india', marketCapB: 72, price: '476.20', unit: 'INR', changePercent: 0.64, sparkline: [472, 473.5, 474.5, 475.2, 476.2] },

  { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Auto & Industrials', market: 'india', marketCapB: 68, price: '3,612.0', unit: 'INR', changePercent: 1.42, sparkline: [3555, 3570, 3588, 3600, 3612] },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', sector: 'Auto & Industrials', market: 'india', marketCapB: 44, price: '894.50', unit: 'INR', changePercent: -1.35, sparkline: [908, 905, 901, 897, 894.5] },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Auto & Industrials', market: 'india', marketCapB: 52, price: '12,480', unit: 'INR', changePercent: 0.78, sparkline: [12380, 12405, 12430, 12455, 12480] },

  { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Healthcare', market: 'india', marketCapB: 54, price: '1,812.0', unit: 'INR', changePercent: 1.85, sparkline: [1778, 1788, 1796, 1804, 1812] },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Labs", sector: 'Healthcare', market: 'india', marketCapB: 31, price: '1,377.9', unit: 'INR', changePercent: -0.15, sparkline: [1384, 1382, 1380, 1379, 1377.9] },
];

/**
 * Maps daily percentage return to accessible color-coded green/neutral/red tile palette.
 */
export function getHeatmapTileStyle(changePercent: number): HeatmapTileColors {
  if (changePercent >= 2.0) {
    return { bg: '#057A55', text: '#FFFFFF', subText: '#D1FAE5', tier: 'Strong Gain' };
  }
  if (changePercent >= 0.4) {
    return { bg: '#089981', text: '#FFFFFF', subText: '#ECFDF5', tier: 'Gain' };
  }
  if (changePercent > 0) {
    return { bg: '#D1FAE5', text: '#065F46', subText: '#047857', tier: 'Gain' };
  }
  if (changePercent === 0) {
    return { bg: '#E2E8F0', text: '#1E293B', subText: '#475569', tier: 'Flat' };
  }
  if (changePercent > -0.5) {
    return { bg: '#FEE2E2', text: '#991B1B', subText: '#B91C1C', tier: 'Loss' };
  }
  if (changePercent > -1.75) {
    return { bg: '#F23645', text: '#FFFFFF', subText: '#FEE2E2', tier: 'Loss' };
  }
  return { bg: '#B91C1C', text: '#FFFFFF', subText: '#FECACA', tier: 'Sharp Loss' };
}

/**
 * Groups heatmap tiles by sector with market-cap weighted sorting and breadth counters.
 */
export function buildSectorGroups(
  tiles: HeatmapStockTile[],
  market: HeatmapMarket,
  sectorFilter = 'All'
): HeatmapSectorGroup[] {
  const marketTiles = tiles.filter((t) => t.market === market);
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

    groups.push({
      sector,
      totalCapB,
      avgChangePercent,
      advancers: sortedItems.filter((t) => t.changePercent > 0).length,
      decliners: sortedItems.filter((t) => t.changePercent < 0).length,
      tiles: sortedItems,
    });
  }

  return groups.sort((a, b) => b.totalCapB - a.totalCapB);
}

/**
 * Returns gap-free 4-column grid spans so every sector group forms a solid rectangle
 * proportional to constituent market-cap rank without orphaned blank cells.
 */
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

/**
 * Converts a HeatmapStockTile to MarketSymbolRow for seamless modal quote inspection.
 */
export function heatmapTileToMarketSymbolRow(tile: HeatmapStockTile): MarketSymbolRow {
  return {
    symbol: tile.symbol,
    name: tile.name,
    exchange: tile.market === 'india' ? 'NSE' : 'NASDAQ',
    price: tile.price,
    unit: tile.unit,
    changePercent: tile.changePercent,
    badgeText: tile.symbol.slice(0, 3),
    badgeColor: tile.changePercent >= 0 ? '#089981' : '#F23645',
    category: tile.market === 'india' ? 'indian_stocks' : 'indices',
    sparkline: tile.sparkline,
  };
}
