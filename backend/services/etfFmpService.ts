import { INITIAL_STOCKS } from '../../frontend/data/marketData.ts';
import { StockQuote } from '../../frontend/types/financia.ts';
import { synthesizeCustomTickerReport } from '../../frontend/utils/stockEngine.ts';
import {
  ApiNinjasEtfDetailPayload,
  FmpHistoricalRow,
  FmpQuoteRow,
  parseApiNinjasEtfDetail,
  parseFmpQuoteAndHistory,
  parseFmpTreasuryRates,
} from '../../frontend/utils/liveDataParsers.ts';

async function fetchJsonWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(id);
  }
}

export interface CuratedEtfCatalogRow {
  symbol: string;
  name: string;
  country: string;
  domicile: string;
  expense_ratio: number;
  aum_usd: number;
  aum_currency: string;
  num_holdings: number;
  category: 'Gold & Bullion' | 'Debt Funds' | 'ETFs';
}

export const CURATED_ETF_CATALOG: CuratedEtfCatalogRow[] = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', country: 'US', domicile: 'US', expense_ratio: 0.09, aum_usd: 625000000000, aum_currency: 'USD', num_holdings: 503, category: 'ETFs' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', country: 'US', domicile: 'US', expense_ratio: 0.03, aum_usd: 585000000000, aum_currency: 'USD', num_holdings: 505, category: 'ETFs' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', country: 'US', domicile: 'US', expense_ratio: 0.03, aum_usd: 455000000000, aum_currency: 'USD', num_holdings: 3650, category: 'ETFs' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust ETF', country: 'US', domicile: 'US', expense_ratio: 0.2, aum_usd: 315000000000, aum_currency: 'USD', num_holdings: 101, category: 'ETFs' },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', country: 'US', domicile: 'US', expense_ratio: 0.03, aum_usd: 124000000000, aum_currency: 'USD', num_holdings: 11200, category: 'Debt Funds' },
  { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', country: 'US', domicile: 'US', expense_ratio: 0.03, aum_usd: 121000000000, aum_currency: 'USD', num_holdings: 11850, category: 'Debt Funds' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', country: 'US', domicile: 'US', expense_ratio: 0.4, aum_usd: 78600000000, aum_currency: 'USD', num_holdings: 1, category: 'Gold & Bullion' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', country: 'US', domicile: 'US', expense_ratio: 0.15, aum_usd: 62500000000, aum_currency: 'USD', num_holdings: 44, category: 'Debt Funds' },
  { symbol: 'IAU', name: 'iShares Gold Trust', country: 'US', domicile: 'US', expense_ratio: 0.25, aum_usd: 42400000000, aum_currency: 'USD', num_holdings: 1, category: 'Gold & Bullion' },
  { symbol: 'INDA', name: 'iShares MSCI India ETF', country: 'US', domicile: 'US', expense_ratio: 0.65, aum_usd: 11400000000, aum_currency: 'USD', num_holdings: 146, category: 'ETFs' },
  { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty 50 BeES', country: 'IN', domicile: 'IN', expense_ratio: 0.04, aum_usd: 4200000000, aum_currency: 'INR', num_holdings: 50, category: 'ETFs' },
  { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', country: 'IN', domicile: 'IN', expense_ratio: 0.79, aum_usd: 1780000000, aum_currency: 'INR', num_holdings: 1, category: 'Gold & Bullion' },
  { symbol: 'LIQUIDBEES', name: 'Nippon India ETF Liquid BeES', country: 'IN', domicile: 'IN', expense_ratio: 0.69, aum_usd: 1450000000, aum_currency: 'INR', num_holdings: 14, category: 'Debt Funds' },
];

const FMP_SYMBOL_ALIAS: Record<string, string> = {
  PAXGUSDT: 'GCUSD',
  PAXGUSD: 'GCUSD',
  XAUUSD: 'GCUSD',
  USDINR: 'USDINR',
  EURUSD: 'EURUSD',
};

const apiNinjasEtfCache = new Map<string, { fetchedAt: number; payload: ApiNinjasEtfDetailPayload }>();
const fmpQuoteCache = new Map<string, { fetchedAt: number; quote: StockQuote }>();

export async function fetchApiNinjasEtfDetail(
  tickerOrIsin: string
): Promise<{ source: string; payload: ApiNinjasEtfDetailPayload }> {
  const key = tickerOrIsin.trim().toUpperCase();
  const apiKey = process.env.API_NINJAS_KEY;
  if (apiKey) {
    const cached = apiNinjasEtfCache.get(key);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < 5 * 60 * 1000) {
      return { source: 'api-ninjas-etf-live', payload: cached.payload };
    }
    try {
      const paramName = /^INF|^US|^IE|^LU/.test(key) && key.length === 12 ? 'isin' : 'ticker';
      const { ok, data } = await fetchJsonWithTimeout(
        `https://api.api-ninjas.com/v1/etf?${paramName}=${encodeURIComponent(key)}`,
        { headers: { 'X-Api-Key': apiKey, Accept: 'application/json' } }
      );
      if (ok && data && typeof data === 'object' && !Array.isArray(data) && !('error' in (data as Record<string, unknown>))) {
        const detail = data as ApiNinjasEtfDetailPayload;
        if (detail.name || detail.symbol || detail.ticker) {
          apiNinjasEtfCache.set(key, { fetchedAt: now, payload: detail });
          return { source: 'api-ninjas-etf-live', payload: detail };
        }
      }
    } catch {
      // Fallback cleanly
    }
  }

  const known = CURATED_ETF_CATALOG.find((e) => e.symbol === key);
  return {
    source: 'financia-curated-etf',
    payload: known
      ? {
          symbol: known.symbol,
          name: known.name,
          country: known.country,
          domicile: known.domicile,
          expense_ratio: known.expense_ratio,
          aum_usd: known.aum_usd,
          aum_currency: known.aum_currency,
          num_holdings: known.num_holdings,
        }
      : { symbol: key, name: `${key} Index ETF` },
  };
}

export async function fetchApiNinjasEtfQuote(
  ticker: string,
  baseQuote: StockQuote
): Promise<StockQuote | null> {
  if (!process.env.API_NINJAS_KEY) return null;
  const { source, payload } = await fetchApiNinjasEtfDetail(ticker);
  if (source !== 'api-ninjas-etf-live') return null;
  return parseApiNinjasEtfDetail(payload, baseQuote);
}

export async function fetchApiNinjasEtfList(offset = 0): Promise<{
  source: string;
  offset: number;
  tickers: string[];
}> {
  const safeOffset = Math.max(0, Math.floor(offset) || 0);
  const apiKey = process.env.API_NINJAS_KEY;
  if (apiKey) {
    try {
      const { ok, data } = await fetchJsonWithTimeout(
        `https://api.api-ninjas.com/v1/etflist?offset=${safeOffset}`,
        { headers: { 'X-Api-Key': apiKey, Accept: 'application/json' } }
      );
      if (ok && Array.isArray(data) && data.length > 0) {
        return { source: 'api-ninjas-etf-live', offset: safeOffset, tickers: data as string[] };
      }
    } catch {
      // Fallback cleanly
    }
  }
  return {
    source: 'financia-curated-etf',
    offset: safeOffset,
    tickers: CURATED_ETF_CATALOG.map((e) => e.symbol),
  };
}

export async function searchApiNinjasEtfs(params: {
  name?: string;
  min_aum?: string;
  max_aum?: string;
  min_expense_ratio?: string;
  max_expense_ratio?: string;
  holdings?: string;
  country?: string;
  offset?: number;
}): Promise<{ source: string; results: unknown[] }> {
  const apiKey = process.env.API_NINJAS_KEY;
  const qs = new URLSearchParams();
  if (params.name) qs.set('name', params.name);
  if (params.min_aum) qs.set('min_aum', params.min_aum);
  if (params.max_aum) qs.set('max_aum', params.max_aum);
  if (params.min_expense_ratio) qs.set('min_expense_ratio', params.min_expense_ratio);
  if (params.max_expense_ratio) qs.set('max_expense_ratio', params.max_expense_ratio);
  if (params.holdings) qs.set('holdings', params.holdings);
  if (params.country) qs.set('country', params.country);
  if (params.offset) qs.set('offset', String(Math.max(0, Math.floor(params.offset))));
  if (!qs.toString()) qs.set('country', 'US');

  if (apiKey) {
    try {
      const { ok, data } = await fetchJsonWithTimeout(
        `https://api.api-ninjas.com/v1/etfsearch?${qs.toString()}`,
        { headers: { 'X-Api-Key': apiKey, Accept: 'application/json' } }
      );
      if (ok && Array.isArray(data) && data.length > 0) {
        return { source: 'api-ninjas-etf-live', results: data };
      }
    } catch {
      // Fallback cleanly
    }
  }

  const nameNeedle = (params.name || '').trim().toLowerCase();
  const minAum = params.min_aum ? Number(params.min_aum) : 0;
  const maxAum = params.max_aum ? Number(params.max_aum) : Number.POSITIVE_INFINITY;
  const maxEr = params.max_expense_ratio ? Number(params.max_expense_ratio) : Number.POSITIVE_INFINITY;
  const countryFilter = (params.country || '').trim().toUpperCase();

  const filtered = CURATED_ETF_CATALOG.filter((etf) => {
    if (nameNeedle && !etf.name.toLowerCase().includes(nameNeedle) && !etf.symbol.toLowerCase().includes(nameNeedle)) {
      return false;
    }
    if (Number.isFinite(minAum) && etf.aum_usd < minAum) return false;
    if (Number.isFinite(maxAum) && etf.aum_usd > maxAum) return false;
    if (Number.isFinite(maxEr) && etf.expense_ratio > maxEr) return false;
    if (countryFilter && etf.country !== countryFilter) return false;
    return true;
  });

  return { source: 'financia-curated-etf', results: filtered };
}

export async function fetchFmpEndpoint(
  endpointPath: string,
  extraQuery: Record<string, string | number | undefined> = {}
): Promise<{ source: string; data: unknown }> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return { source: 'fmp-key-missing', data: null };
  }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(extraQuery)) {
    if (v !== undefined && String(v).trim() !== '') {
      qs.set(k, String(v).trim());
    }
  }
  qs.set('apikey', apiKey);

  const cleanPath = endpointPath.replace(/^\/+/, '');
  try {
