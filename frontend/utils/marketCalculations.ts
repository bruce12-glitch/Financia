import { ForexPerformanceItem, ForexTimeframe, MarketSymbolRow } from '../types/markets';

export interface DivergingBarMetrics {
  pair: string;
  value: number;
  formattedValue: string;
  isPositive: boolean;
  widthPercent: number;
}

/**
 * Computes normalized bar width percentages around 0% for the Forex Performance diverging bar chart.
 * Symmetric scaling ensures the largest absolute move fills 92% of its positive or negative half-axis.
 */
export function computeDivergingBarMetrics(
  items: ForexPerformanceItem[],
  timeframe: ForexTimeframe
): DivergingBarMetrics[] {
  if (items.length === 0) return [];
  const maxAbs = Math.max(
    0.1,
    ...items.map((item) => Math.abs(item.returns[timeframe] ?? 0))
  );

  return items.map((item) => {
    const val = item.returns[timeframe] ?? 0;
    const isPositive = val >= 0;
    const widthPercent = Math.min(96, Math.max(4, (Math.abs(val) / maxAbs) * 92));
    const sign = val > 0 ? '+' : val < 0 ? '−' : '';
    const formattedValue = `${sign}${Math.abs(val).toFixed(2)}%`;

    return {
      pair: item.pair,
      value: val,
      formattedValue,
      isPositive,
      widthPercent: Number(widthPercent.toFixed(2)),
    };
  });
}

/**
 * Builds normalized SVG path commands (`M x,y L x,y ...`) for sparklines and market summary charts.
 */
export function buildSvgPolylinePath(
  values: number[],
  width: number,
  height: number,
  paddingY = 8
): string {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const midY = (height / 2).toFixed(1);
    return `M 0,${midY} L ${width},${midY}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableH = Math.max(4, height - paddingY * 2);

  return values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = paddingY + (1 - (val - min) / range) * usableH;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Builds closed SVG area path anchored to baselineY (or bottom height) for TradingView summary charts.
 */
export function buildSvgAreaPath(
  values: number[],
  width: number,
  height: number,
  paddingY = 8
): string {
  if (values.length === 0) return '';
  const linePath = buildSvgPolylinePath(values, width, height, paddingY);
  return `${linePath} L ${width.toFixed(1)},${height.toFixed(1)} L 0,${height.toFixed(1)} Z`;
}

/**
 * Filters global symbols across indices, stocks, forex, crypto, and futures by ticker or name.
 */
export function filterSymbolsByQuery(
  symbols: MarketSymbolRow[],
  rawQuery: string,
  category?: MarketSymbolRow['category']
): MarketSymbolRow[] {
  const q = rawQuery.trim().toLowerCase();
  return symbols.filter((row) => {
    if (category && row.category !== category) return false;
    if (!q) return true;
    return (
      row.symbol.toLowerCase().includes(q) ||
      row.name.toLowerCase().includes(q) ||
      (row.exchange && row.exchange.toLowerCase().includes(q))
    );
  });
}

/**
 * Formats signed change percentages cleanly matching TradingView tabular typography.
 */
export function formatSignedPercent(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}%`;
  if (value < 0) return `−${Math.abs(value).toFixed(2)}%`;
  return '0.00%';
}
