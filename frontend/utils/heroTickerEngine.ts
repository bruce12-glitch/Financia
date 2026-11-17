export interface HeroTickerItem {
  symbol: string;
  lookupSymbol: string;
  price: number;
  decimals: number;
  changePercent: number;
}

export const INITIAL_HERO_TICKER_ITEMS: HeroTickerItem[] = [
  { symbol: 'NIFTY 50', lookupSymbol: 'NIFTY', price: 25291.1, decimals: 2, changePercent: 0.58 },
  { symbol: 'SENSEX', lookupSymbol: 'SENSEX', price: 82104.79, decimals: 2, changePercent: 0.63 },
  { symbol: 'RELIANCE', lookupSymbol: 'RELIANCE', price: 2948.6, decimals: 2, changePercent: 1.24 },
  { symbol: 'TCS', lookupSymbol: 'TCS', price: 4163.0, decimals: 2, changePercent: 0.47 },
  { symbol: 'INFY', lookupSymbol: 'INFY', price: 1872.25, decimals: 2, changePercent: -0.66 },
  { symbol: 'USD/INR', lookupSymbol: 'USDINR', price: 83.47, decimals: 2, changePercent: 0.04 },
  { symbol: 'GOLD 10g', lookupSymbol: 'GC1!', price: 72140, decimals: 0, changePercent: 0.31 },
  { symbol: 'S&P 500', lookupSymbol: 'SPX', price: 7561.67, decimals: 2, changePercent: -0.4 },
  { symbol: 'NASDAQ 100', lookupSymbol: 'NDX', price: 27943.74, decimals: 2, changePercent: -1.22 },
  { symbol: 'NVDA', lookupSymbol: 'NVDA', price: 138.6, decimals: 2, changePercent: 3.6 },
  { symbol: 'AAPL', lookupSymbol: 'AAPL', price: 228.45, decimals: 2, changePercent: 1.4 },
  { symbol: 'BTC/USD', lookupSymbol: 'BTCUSD', price: 88961, decimals: 0, changePercent: -3.1 },
  { symbol: 'EUR/USD', lookupSymbol: 'EURUSD', price: 1.1588, decimals: 4, changePercent: -0.11 },
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
