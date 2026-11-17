import {
  EQUITY_UNIVERSE,
  EquityAsset,
  PortfolioSnapshot,
  SCREENER_FILTER_PARAMS,
} from '../data/indianMarketData';

/**
 * Formats an integer amount in Indian Numbering System (lakhs/crores commas) with INR symbol.
 */
export function formatINR(amount: number): string {
  const isNegative = amount < 0;
  const formatted = Math.abs(Math.round(amount)).toLocaleString('en-IN');
  return `${isNegative ? '−' : ''}₹${formatted}`;
}

/**
 * Formats a stock or index price in standard Indian locale with 2 decimals.
 */
export function formatIndianPrice(amount: number, currency: '₹' | '$' = '₹'): string {
  const locale = currency === '₹' ? 'en-IN' : 'en-US';
  return `${currency}${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Filters equity assets against an array of active screener parameter IDs.
 */
export function filterScreenerStocks(
  stocks: EquityAsset[],
  activeFilterIds: string[]
): EquityAsset[] {
  if (!activeFilterIds || activeFilterIds.length === 0) {
    return stocks;
  }
  const activePredicates = SCREENER_FILTER_PARAMS.filter((p) =>
    activeFilterIds.includes(p.id)
  ).map((p) => p.predicate);

  if (activePredicates.length === 0) return stocks;

  return stocks.filter((stock) => activePredicates.every((fn) => fn(stock)));
}

export type ScreenerSortKey =
  | 'mktCapCr'
  | 'pe'
  | 'roce'
  | 'debtToEquity'
  | 'promoterHolding'
  | 'return1Y';

/**
 * Sorts screener rows deterministically by numeric metric.
 */
export function sortScreenerStocks(
  stocks: EquityAsset[],
  sortKey: ScreenerSortKey,
  direction: 'asc' | 'desc'
): EquityAsset[] {
  return [...stocks].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return direction === 'asc' ? diff : -diff;
  });
}

/**
 * Searches equities by ticker symbol, shortCode, company name, or sector.
 */
export function searchEquities(query: string, universe: EquityAsset[] = EQUITY_UNIVERSE): EquityAsset[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return universe.slice(0, 6);
  return universe.filter(
    (s) =>
      s.symbol.toLowerCase().includes(trimmed) ||
      s.name.toLowerCase().includes(trimmed) ||
      s.sector.toLowerCase().includes(trimmed) ||
      s.shortCode.toLowerCase().includes(trimmed)
  );
}

/**
 * Generates deterministic, grounded Portfolio AI answers derived from the active portfolio snapshot.
 */
export function generatePortfolioAiReply(
  prompt: string,
  portfolio: PortfolioSnapshot
): string {
  const q = prompt.trim().toLowerCase();
  if (!q) {
    return portfolio.aiDefaultAnswer;
  }

  if (q.includes('red flag') || q.includes('risk') || q.includes('alert') || q.includes('pledge')) {
    const summary = portfolio.redFlags
      .map((rf) => `${rf.title} (${rf.detail})`)
      .join('; ');
    return `${portfolio.redFlags.length} active red flags detected across your PAN holdings: ${summary}. Reducing pledged/ASM exposure improves your Diversification Score above 78.`;
  }

  if (q.includes('nifty') || q.includes('benchmark') || q.includes('compare')) {
    return `Your portfolio XIRR stands at ${portfolio.xirr}% (+${portfolio.totalGainPct}% total return), outperforming NIFTY 50's 1Y CAGR of 14.8%. However, your banking sector weight (${portfolio.bankingWeightPct}%) exceeds the NIFTY 50 benchmark (22%).`;
  }

  if (q.includes('bank') || q.includes('trim') || q.includes('concentrat')) {
    return portfolio.aiDefaultAnswer;
  }

  const topAlloc = portfolio.allocation[0];
  return `Total net worth is ${formatINR(portfolio.totalNetWorth)} across ${portfolio.assetCount} asset classes (XIRR ${portfolio.xirr}%). Largest allocation is ${topAlloc.label} at ${topAlloc.pct}%, with ${portfolio.redFlags.length} flagged holdings needing review and a Diversification Score of ${portfolio.diversificationScore}/100.`;
}
