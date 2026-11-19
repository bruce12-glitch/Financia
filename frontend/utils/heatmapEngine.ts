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
  // Global ETFs, Bullion & Bond Benchmarks (marketCapB weights reflect Fund AUM / ETF Size in $B)
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'Broad Index ETFs', market: 'global', marketCapB: 625, price: '598.40', unit: 'USD', changePercent: 0.42, sparkline: [592, 594, 595.5, 597, 598.4] },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', sector: 'Broad Index ETFs', market: 'global', marketCapB: 585, price: '549.10', unit: 'USD', changePercent: 0.45, sparkline: [543, 545, 546.5, 548, 549.1] },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust ETF', sector: 'Broad Index ETFs', market: 'global', marketCapB: 315, price: '514.20', unit: 'USD', changePercent: -0.35, sparkline: [518, 517, 516, 515, 514.2] },
  { symbol: 'VTI', name: 'Vanguard Total Stock ETF', sector: 'Broad Index ETFs', market: 'global', marketCapB: 455, price: '294.15', unit: 'USD', changePercent: 0.39, sparkline: [291.5, 292.2, 292.9, 293.5, 294.15] },

  { symbol: 'GLD', name: 'SPDR Gold Shares ETF', sector: 'Gold & Bullion ETFs', market: 'global', marketCapB: 78.6, price: '306.40', unit: 'USD', changePercent: 1.27, sparkline: [299, 301, 303, 304.8, 306.4] },
  { symbol: 'IAU', name: 'iShares Gold Trust ETF', sector: 'Gold & Bullion ETFs', market: 'global', marketCapB: 42.4, price: '62.85', unit: 'USD', changePercent: 1.24, sparkline: [61.4, 61.8, 62.1, 62.5, 62.85] },
  { symbol: 'PAXGUSDT', name: 'Spot Gold LBMA Bullion', sector: 'Gold & Bullion ETFs', market: 'global', marketCapB: 18.2, price: '3,284.5', unit: 'USD', changePercent: 1.18, sparkline: [3225, 3242, 3258, 3272, 3284.5] },

  { symbol: 'AGG', name: 'iShares U.S. Aggregate Bond ETF', sector: 'Debt & Bond ETFs', market: 'global', marketCapB: 121, price: '98.75', unit: 'USD', changePercent: 0.28, sparkline: [97.9, 98.1, 98.35, 98.55, 98.75] },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', sector: 'Debt & Bond ETFs', market: 'global', marketCapB: 124, price: '72.90', unit: 'USD', changePercent: 0.26, sparkline: [72.4, 72.52, 72.66, 72.78, 72.9] },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury ETF', sector: 'Debt & Bond ETFs', market: 'global', marketCapB: 62.5, price: '91.40', unit: 'USD', changePercent: 0.64, sparkline: [89.8, 90.2, 90.6, 91.0, 91.4] },

  { symbol: 'SGOV', name: 'iShares 0-3 Month Treasury ETF', sector: 'Treasury & Cash ETFs', market: 'global', marketCapB: 38.4, price: '100.42', unit: 'USD', changePercent: 0.04, sparkline: [100.34, 100.36, 100.38, 100.4, 100.42] },
  { symbol: 'LQD', name: 'iShares Investment Grade Corp ETF', sector: 'Treasury & Cash ETFs', market: 'global', marketCapB: 32.8, price: '108.60', unit: 'USD', changePercent: 0.34, sparkline: [107.8, 108.0, 108.2, 108.4, 108.6] },

  { symbol: 'SLV', name: 'iShares Silver Trust ETF', sector: 'Precious Metals ETFs', market: 'global', marketCapB: 15.6, price: '31.95', unit: 'USD', changePercent: 1.48, sparkline: [30.9, 31.2, 31.45, 31.7, 31.95] },
  { symbol: 'PPLT', name: 'abrdn Physical Platinum ETF', sector: 'Precious Metals ETFs', market: 'global', marketCapB: 6.8, price: '94.20', unit: 'USD', changePercent: -0.68, sparkline: [95.4, 95.1, 94.8, 94.5, 94.2] },

  { symbol: 'VXUS', name: 'Vanguard Total Intl Stock ETF', sector: 'Global Allocation ETFs', market: 'global', marketCapB: 84.5, price: '64.30', unit: 'USD', changePercent: 0.52, sparkline: [63.5, 63.7, 63.9, 64.1, 64.3] },
  { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', sector: 'Global Allocation ETFs', market: 'global', marketCapB: 58.2, price: '82.10', unit: 'USD', changePercent: -0.24, sparkline: [82.5, 82.4, 82.3, 82.2, 82.1] },
  { symbol: 'INDA', name: 'iShares MSCI India ETF', sector: 'Global Allocation ETFs', market: 'global', marketCapB: 11.4, price: '54.85', unit: 'USD', changePercent: 0.96, sparkline: [53.8, 54.1, 54.35, 54.6, 54.85] },

  // India Mutual Funds, Gold BeES, Debt Funds & Index ETFs (AUM scaled in $B USD equiv.)
  { symbol: 'PPFAS', name: 'Parag Parikh Flexi Cap Direct', sector: 'Flexi & Mid Cap Funds', market: 'india', marketCapB: 10.4, price: '89.42', unit: 'INR', changePercent: 0.88, sparkline: [87.4, 87.9, 88.4, 88.9, 89.42] },
  { symbol: 'HDFCMID', name: 'HDFC Mid-Cap Opp. Direct', sector: 'Flexi & Mid Cap Funds', market: 'india', marketCapB: 9.1, price: '198.40', unit: 'INR', changePercent: 1.15, sparkline: [193.5, 194.8, 196.1, 197.3, 198.4] },
  { symbol: 'QUANTSC', name: 'Quant Small Cap Direct Growth', sector: 'Flexi & Mid Cap Funds', market: 'india', marketCapB: 3.4, price: '264.15', unit: 'INR', changePercent: 1.42, sparkline: [257.2, 259.1, 260.8, 262.5, 264.15] },
  { symbol: 'UTI50', name: 'UTI Nifty 50 Index Direct', sector: 'Flexi & Mid Cap Funds', market: 'india', marketCapB: 2.8, price: '174.88', unit: 'INR', changePercent: 0.96, sparkline: [172.1, 172.8, 173.5, 174.2, 174.88] },

  { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty 50 BeES', sector: 'Nifty & Index ETFs', market: 'india', marketCapB: 4.2, price: '284.60', unit: 'INR', changePercent: 1.01, sparkline: [279.6, 281.0, 282.3, 283.5, 284.6] },
  { symbol: 'BANKBEES', name: 'Nippon India ETF Bank BeES', sector: 'Nifty & Index ETFs', market: 'india', marketCapB: 1.6, price: '542.80', unit: 'INR', changePercent: 0.84, sparkline: [535.4, 537.5, 539.4, 541.2, 542.8] },
  { symbol: 'JUNIORBEES', name: 'Nippon India ETF Next 50 BeES', sector: 'Nifty & Index ETFs', market: 'india', marketCapB: 0.9, price: '768.25', unit: 'INR', changePercent: 1.38, sparkline: [753.0, 757.2, 761.4, 765.0, 768.25] },

  { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', sector: 'Gold BeES & SGBs', market: 'india', marketCapB: 1.78, price: '74.85', unit: 'INR', changePercent: 1.24, sparkline: [73.1, 73.5, 74.0, 74.4, 74.85] },
  { symbol: 'SILVERBEES', name: 'Nippon India Silver ETF', sector: 'Gold BeES & SGBs', market: 'india', marketCapB: 0.65, price: '96.20', unit: 'INR', changePercent: 0.94, sparkline: [94.4, 94.9, 95.4, 95.8, 96.2] },
  { symbol: 'SGBMAR31', name: 'Sovereign Gold Bond Tranche', sector: 'Gold BeES & SGBs', market: 'india', marketCapB: 1.15, price: '8,412.0', unit: 'INR', changePercent: 1.12, sparkline: [8260, 8300, 8340, 8378, 8412] },

  { symbol: 'HDFCCORP', name: 'HDFC Corporate Bond Direct', sector: 'Gilt & Debt Funds', market: 'india', marketCapB: 3.85, price: '33.48', unit: 'INR', changePercent: 0.24, sparkline: [33.26, 33.32, 33.38, 33.43, 33.48] },
  { symbol: 'SBIGILT', name: 'SBI Magnum Gilt Fund Direct', sector: 'Gilt & Debt Funds', market: 'india', marketCapB: 1.32, price: '68.14', unit: 'INR', changePercent: 0.35, sparkline: [67.55, 67.7, 67.85, 68.0, 68.14] },
  { symbol: 'ICICIGILT', name: 'ICICI Pru All Seasons Bond', sector: 'Gilt & Debt Funds', market: 'india', marketCapB: 1.68, price: '39.84', unit: 'INR', changePercent: 0.31, sparkline: [39.52, 39.6, 39.68, 39.76, 39.84] },

  { symbol: 'LIQUIDBEES', name: 'Nippon India Liquid BeES', sector: 'Liquid & Money Mkt', market: 'india', marketCapB: 1.45, price: '1,000.0', unit: 'INR', changePercent: 0.02, sparkline: [999.9, 999.95, 999.98, 1000.0, 1000.0] },
  { symbol: 'PARAGLIQ', name: 'PPFAS Liquid Direct Growth', sector: 'Liquid & Money Mkt', market: 'india', marketCapB: 0.82, price: '1,442.6', unit: 'INR', changePercent: 0.03, sparkline: [1441.8, 1442.0, 1442.2, 1442.4, 1442.6] },

  { symbol: 'BBOND36', name: 'Bharat Bond ETF 2036 AAA', sector: 'Banking & PSU Debt', market: 'india', marketCapB: 2.15, price: '1,218.4', unit: 'INR', changePercent: 0.29, sparkline: [1211, 1213, 1215, 1217, 1218.4] },
  { symbol: 'AXISBPSU', name: 'Axis Banking & PSU Debt Direct', sector: 'Banking & PSU Debt', market: 'india', marketCapB: 1.72, price: '2,542.8', unit: 'INR', changePercent: 0.21, sparkline: [2532, 2535, 2538, 2540.5, 2542.8] },
];

/**
 * Computes annualized realized volatility (%) from an equity's rolling price series
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

  // Annualize step standard deviation (252 trading days) and incorporate active session swing
  const annualized = stdDev * Math.sqrt(252) * 100;
  const sessionMomentumVol = Math.abs(changePercent) * 9.5 + 8.0;
  const combined = annualized * 0.65 + sessionMomentumVol * 0.55;

  return Number(Math.max(8.5, Math.min(72.0, combined)).toFixed(1));
}

/**
 * Maps annualized volatility (%) to a high-contrast institutional heat palette.
 */
export function getVolatilityTileStyle(volatilityPct: number): HeatmapVolatilityColors {
  if (volatilityPct >= 38) {
    return { bg: '#991B1B', text: '#FFFFFF', subText: '#FECACA', tier: 'Extreme' };
  }
  if (volatilityPct >= 28) {
    return { bg: '#DC2626', text: '#FFFFFF', subText: '#FEE2E2', tier: 'Elevated' };
  }
  if (volatilityPct >= 19) {
    return { bg: '#D97706', text: '#FFFFFF', subText: '#FEF3C7', tier: 'Moderate' };
  }
  return { bg: '#0F766E', text: '#FFFFFF', subText: '#CCFBF1', tier: 'Calm' };
}

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

/**
 * Applies a deterministic real-time micro-tick update across all heatmap equities,
 * keeping rolling sparkline history bounded and updating daily return & volatility live.
 */
export function applyHeatmapTick(
  tiles: HeatmapStockTile[],
  tickStep: number
): HeatmapStockTile[] {
  return tiles.map((tile, idx) => {
    const baseNumeric = parseFormattedPrice(tile.price);
    const currentVol = calculateRealizedVolatility(tile.sparkline, tile.changePercent);
    // Higher-volatility names experience proportionally wider intraday micro-ticks
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
 * Groups heatmap tiles by sector with market-cap weighted return, realized volatility, and return dispersion.
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
 * Computes a D3.js squarified treemap layout over sector groups and cap-weighted stock tiles.
 */
export function computeD3TreemapLayout(
  groups: HeatmapSectorGroup[],
  width: number,
  height: number
): D3TreemapLayoutResult {
  if (!groups || groups.length === 0 || width <= 0 || height <= 0) {
    return { sectors: [], tiles: [], maxVolatilityPct: 0 };
  }

  const rootData: HierarchyNodeData = {
    name: 'market-root',
    children: groups.map((group) => ({
      name: group.sector,
      group,
      children: group.tiles.map((tile) => ({
        name: tile.symbol,
        tile,
        value: Math.max(10, tile.marketCapB),
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
  const lowerSec = tile.sector.toLowerCase();
  const category: MarketSymbolRow['category'] = lowerSec.includes('gold') || lowerSec.includes('metal')
    ? 'gold'
    : lowerSec.includes('gilt') || lowerSec.includes('debt') || lowerSec.includes('bond') || lowerSec.includes('liquid') || lowerSec.includes('treasury')
    ? 'debt_funds'
    : lowerSec.includes('etf')
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

