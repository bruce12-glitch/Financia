/**
 * Configurable Financia Data Service Client.
 *
 * Points to a local DuckDB + FastAPI backend (e.g. http://127.0.0.1:8000) when
 * VITE_FINANCIA_DB_API_URL is configured, and falls back seamlessly to the
 * built-in Express + SQLite API (/api/v1/*, /api/db/*, /api/global/*) so the
 * app works identically in both local development and AI Studio cloud preview.
 */

export const API_BASE_URL: string = (
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_FINANCIA_DB_API_URL) ||
  ''
)
  .trim()
  .replace(/\/+$/, '');

export interface V1SearchFundItem {
  scheme_code: string;
  isin: string | null;
  scheme_name: string;
  amc: string;
  structure?: string;
  instrument_type: string;
  asset_class: string;
  sub_category: string;
  plan_type: string;
  option_type: string;
  nav: number;
  nav_date: string;
  is_active: number;
  fund_aum_cr?: number | null;
  ter_direct?: number | null;
  ter_regular?: number | null;
  riskometer?: string | null;
}

export interface V1UniformHolding {
  rank: number;
  name: string;
  isin: string | null;
  sector: string;
  asset_group: string;
  weight_pct: number;
}

export interface V1UniformAllocation {
  label: string;
  pct: number;
  color: string;
}

export interface V1UniformFundDossier {
  scheme_code: string;
  scheme_name: string;
  amc: string;
  isin: string | null;
  isin2: string | null;
  instrument_type: string;
  asset_class: string;
  sub_category: string;
  plan_type: string;
  option_type: string;
  nav: number;
  nav_date: string;
  is_active: boolean;
  inception_date: string;
  expense_ratio: number;
  ter_direct: number | null;
  ter_regular: number | null;
  aum_cr: number | null;
  riskometer: string | null;
  benchmark: string | null;
  fund_managers: string | null;
  exit_load: string | null;
  objective: string | null;
  asset_allocation: V1UniformAllocation[];
  top_10_holdings: V1UniformHolding[];
  holdings_source: 'sqlite_portfolio_holdings' | 'mandate_derived';
  share_classes?: Array<Record<string, unknown>>;
  direct_vs_regular?: Record<string, unknown>;
}

export interface V1OverlapResult {
  overlap_count: number;
  overlap_weight_pct: number;
  top_overlapping_securities: Array<{
    name: string;
    isin: string | null;
    sector: string;
    weight_a_pct: number;
    weight_b_pct: number;
    min_overlap_pct: number;
  }>;
}

export interface TerminalDbStats {
  totalSchemes: number;
  activeSchemes: number;
  etfCount: number;
  indexFundCount: number;
  fofCount: number;
  mutualFundCount: number;
  amcCount: number;
  latestNavDate: string | null;
}

export interface GlobalBenchmarkDossier {
  instrument: {
    symbol: string;
    name: string;
    exchange: string;
    country: string;
    currency: string;
    price: number;
    change: number;
    changePercent: number;
    dayHigh: number;
    dayLow: number;
    week52High: number;
    week52Low: number;
    expenseRatio: number | null;
    dividendYield: number | null;
    beta: number | null;
    isin: string;
    inceptionDate: string;
  };
  liveSource: string;
  news: Array<{
    id: string;
    headline: string;
    source: string;
    datetime: number;
    url: string;
  }>;
}

/**
 * Fetches from the external DuckDB/FastAPI base URL when configured, with an automatic
 * fallback to the built-in Express /api/v1 route if the external server is offline.
 */
async function fetchWithLocalFallback<T>(
  v1Path: string,
  init?: RequestInit
): Promise<T | null> {
  const normalizedPath = v1Path.startsWith('/') ? v1Path : `/${v1Path}`;

  if (API_BASE_URL) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE_URL}${normalizedPath}`, {
        ...init,
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // External local FastAPI server not reachable; fall back to built-in Express SQLite API
    }
  }

  try {
    const res = await fetch(`/api${normalizedPath}`, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTerminalCatalogStats(): Promise<TerminalDbStats | null> {
  try {
    const res = await fetch('/api/db/terminal/stats');
    if (!res.ok) return null;
    return (await res.json()) as TerminalDbStats;
  } catch {
    return null;
  }
}

export async function searchV1Funds(params: {
  q: string;
  instrumentType?: string;
  category?: string;
  activeOnly?: boolean;
  limit?: number;
}): Promise<V1SearchFundItem[]> {
  const sp = new URLSearchParams();
  if (params.q.trim()) sp.set('q', params.q.trim());
  if (params.instrumentType && params.instrumentType !== 'ALL') {
    sp.set('instrument_type', params.instrumentType);
  }
  if (params.category && params.category !== 'ALL') {
    sp.set('category', params.category);
  }
  if (params.activeOnly) sp.set('active_only', 'true');
  sp.set('limit', String(params.limit ?? 14));

  const data = await fetchWithLocalFallback<{ items?: V1SearchFundItem[] }>(
    `/v1/funds/search?${sp.toString()}`
  );
  return Array.isArray(data?.items) ? data.items : [];
}

export async function fetchV1FundDossier(
  schemeCode: string
): Promise<V1UniformFundDossier | null> {
  const clean = schemeCode.trim();
  if (!clean) return null;
  const data = await fetchWithLocalFallback<{ fund?: V1UniformFundDossier }>(
    `/v1/funds/${encodeURIComponent(clean)}`
  );
  return data?.fund ?? null;
}

export async function fetchV1PortfolioOverlap(
  fundA: string,
  fundB: string
): Promise<V1OverlapResult | null> {
  const sp = new URLSearchParams({ fund_a: fundA.trim(), fund_b: fundB.trim() });
  return fetchWithLocalFallback<V1OverlapResult>(`/v1/overlap?${sp.toString()}`);
}

export async function fetchGlobalExchangeDossier(
  symbol: string
): Promise<GlobalBenchmarkDossier | null> {
  try {
    const res = await fetch(`/api/global/dossier/${encodeURIComponent(symbol.trim())}`);
    if (!res.ok) return null;
    return (await res.json()) as GlobalBenchmarkDossier;
  } catch {
    return null;
  }
}
