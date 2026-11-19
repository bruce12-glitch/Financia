export interface HeroTickerItem {
  symbol: string;
  lookupSymbol: string;
  price: number;
  decimals: number;
  changePercent: number;
}

export const INITIAL_HERO_TICKER_ITEMS: HeroTickerItem[] = [
  { symbol: 'GOLDBEES', lookupSymbol: 'GOLDBEES', price: 74.85, decimals: 2, changePercent: 1.24 },
  { symbol: 'SPOT GOLD', lookupSymbol: 'PAXGUSDT', price: 3284.5, decimals: 2, changePercent: 1.18 },
  { symbol: 'PPFAS NAV', lookupSymbol: 'PPFAS', price: 89.42, decimals: 2, changePercent: 0.88 },
  { symbol: 'NIFTYBEES', lookupSymbol: 'NIFTYBEES', price: 284.6, decimals: 2, changePercent: 1.01 },
  { symbol: 'SBIGILT NAV', lookupSymbol: 'SBIGILT', price: 68.14, decimals: 2, changePercent: 0.35 },
  { symbol: 'HDFCCORP NAV', lookupSymbol: 'HDFCCORP', price: 33.48, decimals: 2, changePercent: 0.24 },
  { symbol: 'LIQUIDBEES', lookupSymbol: 'LIQUIDBEES', price: 1000.0, decimals: 2, changePercent: 0.02 },
  { symbol: 'SILVERBEES', lookupSymbol: 'SILVERBEES', price: 96.2, decimals: 2, changePercent: 0.94 },
  { symbol: 'GLD ETF', lookupSymbol: 'GLD', price: 306.4, decimals: 2, changePercent: 1.27 },
  { symbol: 'AGG BOND', lookupSymbol: 'AGG', price: 98.75, decimals: 2, changePercent: 0.28 },
  { symbol: 'TLT 20Y TSY', lookupSymbol: 'TLT', price: 91.4, decimals: 2, changePercent: 0.64 },
  { symbol: 'USD/INR', lookupSymbol: 'USDINR', price: 85.42, decimals: 2, changePercent: -0.18 },
  { symbol: 'IN 10Y G-SEC', lookupSymbol: 'IN10Y', price: 6.842, decimals: 3, changePercent: -0.62 },
];

export function formatTickerPrice(price: number, decimals: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatTickerDelta(changePercent: number): {
  isPositive: boolean;
  triangle: '▲' | '▼';
  label: string;
} {
  const isPositive = changePercent >= 0;
  const sign = isPositive ? '+' : '-';
  return {
    isPositive,
    triangle: isPositive ? '▲' : '▼',
    label: `${sign}${Math.abs(changePercent).toFixed(2)}%`,
  };
}

export function stepHeroTickerItems(
  items: HeroTickerItem[],
  jitterSeed = 0.00045
): HeroTickerItem[] {
  return items.map((item, idx) => {
    const wave = Math.sin((idx + 1) * 1.7) * jitterSeed;
    const nextPrice = Number(
      Math.max(0.01, item.price * (1 + wave)).toFixed(item.decimals)
    );
    const nextPct = Number((item.changePercent + wave * 18).toFixed(2));
    return {
      ...item,
      price: nextPrice,
      changePercent: nextPct,
    };
  });
}
