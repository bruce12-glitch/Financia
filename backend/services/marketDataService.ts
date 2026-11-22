import { parseAlphaVantageDaily } from '../../frontend/utils/liveDataParsers.ts';
import { SentimentPayload } from '../../frontend/utils/sentimentEngine.ts';
import { EarningsCalendarEvent } from '../../frontend/utils/earningsEngine.ts';
import { StockQuote } from '../../frontend/types/financia.ts';
import { fetchApiNinjasEtfQuote, fetchFmpQuote } from './etfFmpService.ts';

const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT || 'Financia ResearchEngine/1.0 (subashree04116@gmail.com)';

interface SecTickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

let secTickerCache: {
  fetchedAt: number;
  map: Map<string, { cik: string; title: string }>;
} | null = null;

const secFactsCache = new Map<
  string,
  { fetchedAt: number; payload: Record<string, unknown> }
>();

export let sentimentCache: { fetchedAt: number; payload: SentimentPayload } | null = null;
export function setSentimentCache(next: { fetchedAt: number; payload: SentimentPayload } | null) {
  sentimentCache = next;
}

export let earningsCache: {
  fetchedAt: number;
  source: string;
  events: EarningsCalendarEvent[];
} | null = null;
export function setEarningsCache(
  next: { fetchedAt: number; source: string; events: EarningsCalendarEvent[] } | null
) {
  earningsCache = next;
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5500
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function resolveSecCompanyMeta(
  ticker: string
): Promise<{ cik: string; title: string } | null> {
  const cleanTicker = ticker.replace(/\.(NS|BO|L|TO)$/i, '').toUpperCase();
  const now = Date.now();
  if (!secTickerCache || now - secTickerCache.fetchedAt > 12 * 60 * 60 * 1000) {
    try {
      const res = await fetchWithTimeout('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' },
      });
      if (res.ok) {
        const json = (await res.json()) as Record<string, SecTickerEntry>;
        const map = new Map<string, { cik: string; title: string }>();
        for (const entry of Object.values(json)) {
          if (entry && entry.ticker && entry.cik_str !== undefined) {
            map.set(entry.ticker.toUpperCase(), {
              cik: String(entry.cik_str).padStart(10, '0'),
              title: entry.title,
            });
          }
        }
        secTickerCache = { fetchedAt: now, map };
      }
    } catch {
      // Non-fatal fallback
    }
  }
  return secTickerCache?.map.get(cleanTicker) || null;
}

export async function fetchSecCompanyFacts(
  cik: string
): Promise<Record<string, unknown> | null> {
  const cached = secFactsCache.get(cik);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < 60 * 60 * 1000) {
    return cached.payload;
  }

  try {
    const res = await fetchWithTimeout(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      {
        headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' },
      },
      6500
    );
    if (!res.ok) return null;
    const payload = (await res.json()) as Record<string, unknown>;
    secFactsCache.set(cik, { fetchedAt: now, payload });
    return payload;
  } catch {
    return null;
  }
}

export async function fetchAlphaVantageStock(
  symbol: string,
  baseStock: StockQuote
): Promise<StockQuote | null> {
  const avKey = process.env.ALPHA_VANTAGE_API_KEY || (symbol === 'IBM' ? 'demo' : '');
  if (!avKey) return null;

  try {
    const dailyRes = await fetchWithTimeout(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
        symbol
      )}&apikey=${encodeURIComponent(avKey)}`
    );
    if (!dailyRes.ok) return null;
    const dailyJson = (await dailyRes.json()) as Record<string, unknown>;

    let overviewJson: Record<string, unknown> | null = null;
    try {
      const ovRes = await fetchWithTimeout(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(
          symbol
        )}&apikey=${encodeURIComponent(avKey)}`,
        {},
        3500
      );
      if (ovRes.ok) {
        overviewJson = (await ovRes.json()) as Record<string, unknown>;
      }
    } catch {
      // Optional overview
    }

    return parseAlphaVantageDaily(dailyJson, baseStock, overviewJson);
  } catch {
    return null;
  }
}

import { INITIAL_STOCKS } from '../../frontend/data/marketData.ts';
import {
  AmfiNavResponsePayload,
  MarketstackEodPayload,
  MfnavFundDetailPayload,
  MfnavNavHistoryPayload,
  TwelveDataSeriesPayload,
  mergeFinnhubQuote,
  parseAmfiMfNav,
  parseBinanceKlines,
  parseMarketstackEod,
  parseMfnavFundDetail,
  parseSecCompanyFacts,
  parseTwelveDataTimeSeries,
} from '../../frontend/utils/liveDataParsers.ts';
import { calculateRSI, synthesizeCustomTickerReport } from '../../frontend/utils/stockEngine.ts';
import { buildScreenerFundFromNavDbDetail } from '../../frontend/utils/terminalSearchEngine.ts';
import { buildTerminalQuoteFromScreenerFund } from '../../frontend/utils/fundIntelligenceEngine.ts';
import { getNavDatabase } from './navDatabaseService.ts';

export const AMFI_SCHEME_MAP: Record<string, string> = {
  PPFAS: '122639',
  HDFCMID: '118989',
  QUANTSC: '120828',
  UTI50: '120716',
  SBIGILT: '119823',
  HDFCCORP: '128053',
  ICICIGILT: '120594',
  MIRAEBLUE: '118834',
  NIPSMALL: '118778',
};

export interface AmfiSchemeDirectoryEntry {
  schemeCode: number;
  schemeName: string;
  isinGrowth?: string | null;
  isinDivReinvestment?: string | null;
}

export const CURATED_AMFI_SCHEMES: AmfiSchemeDirectoryEntry[] = [
  { schemeCode: 122639, schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
  { schemeCode: 118989, schemeName: 'HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth' },
  { schemeCode: 120828, schemeName: 'quant Small Cap Fund - Direct Plan - Growth' },
  { schemeCode: 120716, schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth' },
  { schemeCode: 119823, schemeName: 'SBI Magnum Gilt Fund - Direct Plan - Growth' },
  { schemeCode: 128053, schemeName: 'HDFC Corporate Bond Fund - Direct Plan - Growth' },
  { schemeCode: 120594, schemeName: 'ICICI Prudential All Seasons Bond Fund - Direct Plan - Growth' },
  { schemeCode: 118834, schemeName: 'Mirae Asset Large & Midcap Fund - Direct Plan - Growth' },
  { schemeCode: 118778, schemeName: 'Nippon India Small Cap Fund - Direct Plan - Growth' },
  { schemeCode: 125497, schemeName: 'SBI Small Cap Fund - Direct Plan - Growth' },
];

export const MARKETSTACK_ETF_SYMBOL_MAP: Record<string, string> = {
  GOLDBEES: 'GOLDBEES.XNSE',
  NIFTYBEES: 'NIFTYBEES.XNSE',
  LIQUIDBEES: 'LIQUIDBEES.XNSE',
  SILVERBEES: 'SILVERBEES.XNSE',
  BANKBEES: 'BANKBEES.XNSE',
  JUNIORBEES: 'JUNIORBEES.XNSE',
  GLD: 'GLD',
  IAU: 'IAU',
  AGG: 'AGG',
  BND: 'BND',
  TLT: 'TLT',
  SPY: 'SPY',
  QQQ: 'QQQ',
  VTI: 'VTI',
  VOO: 'VOO',
  INDA: 'INDA',
};

export const TWELVE_DATA_SYMBOL_MAP: Record<string, string> = {
  PAXGUSDT: 'XAU/USD',
  PAXGUSD: 'XAU/USD',
  XAUUSD: 'XAU/USD',
  GOLDBEES: 'GOLDBEES:NSE',
  NIFTYBEES: 'NIFTYBEES:NSE',
  LIQUIDBEES: 'LIQUIDBEES:NSE',
  SILVERBEES: 'SILVERBEES:NSE',
  BANKBEES: 'BANKBEES:NSE',
  JUNIORBEES: 'JUNIORBEES:NSE',
  GLD: 'GLD',
  IAU: 'IAU',
  AGG: 'AGG',
  BND: 'BND',
  TLT: 'TLT',
  SPY: 'SPY',
  QQQ: 'QQQ',
  VTI: 'VTI',
  VOO: 'VOO',
  INDA: 'INDA',
  USDINR: 'USD/INR',
  EURUSD: 'EUR/USD',
};

const amfiNavCache = new Map<
  string,
  { fetchedAt: number; quote: StockQuote }
>();

const mfnavCache = new Map<
  string,
  { fetchedAt: number; quote: StockQuote }
>();

const marketstackCache = new Map<
  string,
  { fetchedAt: number; quote: StockQuote }
>();

const twelveDataCache = new Map<
  string,
  { fetchedAt: number; quote: StockQuote }
>();

export function isIndianIsin(ticker: string): boolean {
  return /^INF[A-Z0-9]{9}$/.test(ticker.trim().toUpperCase());
}

export function resolveAmfiSchemeCode(ticker: string, baseFund?: StockQuote): string | null {
  const upper = ticker.trim().toUpperCase();
  if (/^\d{5,7}$/.test(upper)) return upper;
  const mfMatch = upper.match(/^MF(\d{5,7})$/);
  if (mfMatch) return mfMatch[1];
  return baseFund?.amfiSchemeCode || AMFI_SCHEME_MAP[upper] || null;
}

export async function fetchMfnavFundQuote(
  codeOrIsin: string,
  baseFund: StockQuote
): Promise<StockQuote | null> {
  const key = codeOrIsin.trim().toUpperCase();
  if (!key) return null;

  const now = Date.now();
  const cached = mfnavCache.get(key);
  if (cached && now - cached.fetchedAt < 5 * 60 * 1000) {
    return cached.quote;
  }

  try {
    const [fundRes, navRes] = await Promise.allSettled([
      fetchWithTimeout(
        `https://mfnav.in/api/funds/${encodeURIComponent(key)}`,
        { headers: { Accept: 'application/json' } },
        4500
      ),
      fetchWithTimeout(
        `https://mfnav.in/api/nav/${encodeURIComponent(key)}?page=1&page_size=20`,
        { headers: { Accept: 'application/json' } },
        4500
      ),
    ]);

    if (fundRes.status !== 'fulfilled' || !fundRes.value.ok) return null;
    const fundPayload = (await fundRes.value.json()) as MfnavFundDetailPayload;
    const navPayload =
      navRes.status === 'fulfilled' && navRes.value.ok
        ? ((await navRes.value.json()) as MfnavNavHistoryPayload)
        : null;

    const parsed = parseMfnavFundDetail(fundPayload, navPayload, baseFund);
    if (parsed) {
      mfnavCache.set(key, { fetchedAt: now, quote: parsed });
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function searchMfnavFunds(params: {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  source: string;
  results: Array<{
    scheme_code: number;
    scheme_name: string;
    fund_house?: string;
    plan_type?: string;
    option_type?: string;
    isin?: string | null;
    category?: string | null;
    sub_category?: string | null;
  }>;
  total: number;
  page: number;
  page_size: number;
}> {
  const page = Math.max(1, Math.floor(params.page || 1));
  const pageSize = Math.min(250, Math.max(1, Math.floor(params.pageSize || 25)));
  const qs = new URLSearchParams();
  if (params.q && params.q.trim()) qs.set('q', params.q.trim());
  if (params.category && params.category.trim()) qs.set('category', params.category.trim());
  qs.set('page', String(page));
  qs.set('page_size', String(pageSize));

  try {
    const res = await fetchWithTimeout(
      `https://mfnav.in/api/funds/search?${qs.toString()}`,
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (res.ok) {
      const json = (await res.json()) as {
        results?: Array<Record<string, unknown>>;
        total?: number;
        page?: number;
        page_size?: number;
      };
      if (Array.isArray(json.results)) {
        return {
          source: 'mfnav-in-live',
          results: json.results as Array<{
            scheme_code: number;
            scheme_name: string;
            fund_house?: string;
            plan_type?: string;
            option_type?: string;
            isin?: string | null;
            category?: string | null;
            sub_category?: string | null;
          }>,
          total: Number(json.total || json.results.length),
          page: Number(json.page || page),
          page_size: Number(json.page_size || pageSize),
        };
      }
    }
  } catch {
    // Fallback cleanly
  }

  const needle = (params.q || '').trim().toLowerCase();
  const matched = CURATED_AMFI_SCHEMES.filter(
    (s) => !needle || s.schemeName.toLowerCase().includes(needle) || String(s.schemeCode).includes(needle)
  ).map((s) => ({
    scheme_code: s.schemeCode,
    scheme_name: s.schemeName,
    fund_house: s.schemeName.split(' ')[0] + ' Mutual Fund',
    plan_type: 'Direct',
    option_type: 'Growth',
    isin: s.isinGrowth || null,
    category: /Gilt|Bond/i.test(s.schemeName) ? 'Debt Scheme' : 'Equity Scheme',
    sub_category: null,
  }));

  return {
    source: 'financia-curated-amfi',
    results: matched.slice(0, pageSize),
    total: matched.length,
    page,
    page_size: pageSize,
  };
}

export async function fetchMfnavCategories(): Promise<{
  source: string;
  categories: unknown[];
}> {
  try {
    const res = await fetchWithTimeout(
      'https://mfnav.in/api/categories/',
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (res.ok) {
      const json = await res.json();
      const categories = Array.isArray(json)
        ? json
        : Array.isArray((json as { categories?: unknown[] }).categories)
        ? (json as { categories: unknown[] }).categories
        : [];
      if (categories.length > 0) {
        return { source: 'mfnav-in-live', categories };
      }
    }
  } catch {
    // Fallback cleanly
  }
  return {
    source: 'financia-curated-amfi',
    categories: [
      { slug: 'equity-scheme', name: 'Equity Scheme' },
      { slug: 'debt-scheme', name: 'Debt Scheme' },
      { slug: 'hybrid-scheme', name: 'Hybrid Scheme' },
      { slug: 'other-scheme', name: 'Other Scheme (Gold & Index ETFs / FoFs)' },
      { slug: 'solution-oriented-scheme', name: 'Solution Oriented Scheme' },
    ],
  };
}

export async function fetchMfnavFundRaw(
  pathSegment: string
): Promise<{ status: number; source: string; payload: unknown }> {
  try {
    const res = await fetchWithTimeout(
      `https://mfnav.in/api/funds/${pathSegment}`,
      { headers: { Accept: 'application/json' } },
      4500
    );
    const json = await res.json().catch(() => null);
    if (res.ok && json) {
      return { status: 200, source: 'mfnav-in-live', payload: json };
    }
    if (res.status === 409 && json) {
      return { status: 409, source: 'mfnav-in-live', payload: json };
    }
  } catch {
    // Fallback cleanly
  }
  const syn = synthesizeCustomTickerReport(pathSegment.split('/')[0], INITIAL_STOCKS);
  return {
    status: 200,
    source: 'financia-fallback',
    payload: {
      scheme_code: Number(syn.amfiSchemeCode) || 100641,
      scheme_name: syn.name,
      category: syn.assetClass === 'Debt Fund' ? 'Debt Scheme' : 'Equity Scheme',
      latest_nav: syn.price,
      latest_day_change_pct: syn.changePercent,
    },
  };
}

export async function fetchMfnavNavSeriesRaw(
  codeOrIsin: string,
  params: { startDate?: string; endDate?: string; page?: number; pageSize?: number }
): Promise<{ source: string; payload: unknown }> {
  const qs = new URLSearchParams();
  if (params.startDate) qs.set('start_date', params.startDate);
  if (params.endDate) qs.set('end_date', params.endDate);
  if (params.page) qs.set('page', String(Math.max(1, params.page)));
  if (params.pageSize) qs.set('page_size', String(Math.min(250, Math.max(1, params.pageSize))));
  const query = qs.toString();

  try {
    const res = await fetchWithTimeout(
      `https://mfnav.in/api/nav/${encodeURIComponent(codeOrIsin)}${query ? `?${query}` : ''}`,
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (res.ok) {
      const json = await res.json();
      if (json) return { source: 'mfnav-in-live', payload: json };
    }
  } catch {
    // Fallback cleanly
  }

  const syn = synthesizeCustomTickerReport(codeOrIsin, INITIAL_STOCKS);
  return {
    source: 'financia-fallback',
    payload: {
      scheme_code: Number(codeOrIsin) || 100641,
      data: syn.report.financial_charts.stock_price_4m.map((pt, idx) => ({
        nav_date: `2026-11-${String(Math.min(28, 10 + idx)).padStart(2, '0')}`,
        nav: pt.price,
      })),
    },
  };
}

export async function fetchMfnavDateLatest(): Promise<{ source: string; payload: unknown }> {
  try {
    const res = await fetchWithTimeout(
      'https://mfnav.in/api/date/latest',
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (res.ok) {
      const json = await res.json();
      if (json) return { source: 'mfnav-in-live', payload: json };
    }
  } catch {
    // Fallback cleanly
  }
  return {
    source: 'financia-fallback',
    payload: { latest_nav_date: new Date().toISOString().slice(0, 10) },
  };
}

export async function fetchAmfiMutualFund(
  ticker: string,
  baseFund: StockQuote
): Promise<StockQuote | null> {
  const schemeCode = resolveAmfiSchemeCode(ticker, baseFund);
  if (!schemeCode) return null;

  const now = Date.now();
  const cached = amfiNavCache.get(schemeCode);
  if (cached && now - cached.fetchedAt < 5 * 60 * 1000) {
    return cached.quote;
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`,
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (!res.ok) return null;
    const payload = (await res.json()) as AmfiNavResponsePayload;
    const parsed = parseAmfiMfNav(payload, { ...baseFund, amfiSchemeCode: schemeCode });
    if (parsed) {
      amfiNavCache.set(schemeCode, { fetchedAt: now, quote: parsed });
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function searchAmfiSchemes(query: string): Promise<{
  source: string;
  schemes: AmfiSchemeDirectoryEntry[];
}> {
  const clean = query.trim();
  if (!clean) {
    return { source: 'financia-curated-amfi', schemes: CURATED_AMFI_SCHEMES };
  }

  // Prefer mfnav.in search when query resembles an ISIN or for fast metadata/ISIN hits
  if (/^INF[A-Z0-9]{4,}$/i.test(clean)) {
    const mfnavMatch = await searchMfnavFunds({ q: clean, page: 1, pageSize: 25 });
    if (mfnavMatch.source === 'mfnav-in-live' && mfnavMatch.results.length > 0) {
      return {
        source: 'mfnav-in-live',
        schemes: mfnavMatch.results.map((r) => ({
          schemeCode: r.scheme_code,
          schemeName: r.scheme_name,
          isinGrowth: r.isin || null,
        })),
      };
    }
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.mfapi.in/mf/search?q=${encodeURIComponent(clean)}`,
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (res.ok) {
      const rows = (await res.json()) as AmfiSchemeDirectoryEntry[];
      if (Array.isArray(rows) && rows.length > 0) {
        return { source: 'amfi-mfapi-live', schemes: rows.slice(0, 50) };
      }
    }
  } catch {
    // Fall back cleanly
  }

  const mfnavFallback = await searchMfnavFunds({ q: clean, page: 1, pageSize: 30 });
  if (mfnavFallback.source === 'mfnav-in-live' && mfnavFallback.results.length > 0) {
    return {
      source: 'mfnav-in-live',
      schemes: mfnavFallback.results.map((r) => ({
        schemeCode: r.scheme_code,
        schemeName: r.scheme_name,
        isinGrowth: r.isin || null,
      })),
    };
  }

  const needle = clean.toLowerCase();
  const matched = CURATED_AMFI_SCHEMES.filter(
    (s) =>
      s.schemeName.toLowerCase().includes(needle) ||
      String(s.schemeCode).includes(needle)
  );
  return { source: 'financia-curated-amfi', schemes: matched };
}

export async function listAmfiSchemes(limit = 50, offset = 0): Promise<{
  source: string;
  limit: number;
  offset: number;
  schemes: AmfiSchemeDirectoryEntry[];
}> {
  const safeLimit = Math.min(200, Math.max(1, Math.floor(limit) || 50));
  const safeOffset = Math.max(0, Math.floor(offset) || 0);
  try {
    const res = await fetchWithTimeout(
      `https://api.mfapi.in/mf?limit=${safeLimit}&offset=${safeOffset}`,
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (res.ok) {
      const rows = (await res.json()) as AmfiSchemeDirectoryEntry[];
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          source: 'amfi-mfapi-live',
          limit: safeLimit,
          offset: safeOffset,
          schemes: rows,
        };
      }
    }
  } catch {
    // Fall back to curated AMFI directory cleanly
  }
  return {
    source: 'financia-curated-amfi',
    limit: safeLimit,
    offset: safeOffset,
    schemes: CURATED_AMFI_SCHEMES.slice(safeOffset, safeOffset + safeLimit),
  };
}

export async function fetchAmfiSchemeLatest(schemeCode: string): Promise<{
  source: string;
  payload: AmfiNavResponsePayload;
}> {
  const code = schemeCode.trim();
  try {
    const res = await fetchWithTimeout(
      `https://api.mfapi.in/mf/${encodeURIComponent(code)}/latest`,
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (res.ok) {
      const json = (await res.json()) as AmfiNavResponsePayload;
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        return { source: 'amfi-mfapi-live', payload: json };
      }
    }
  } catch {
    // Fall back cleanly
  }

  const known = CURATED_AMFI_SCHEMES.find((s) => String(s.schemeCode) === code);
  const syn = synthesizeCustomTickerReport(code, INITIAL_STOCKS);
  return {
    source: 'financia-fallback',
    payload: {
      meta: {
        fund_house: 'AMFI Registered Mutual Fund',
        scheme_type: 'Open Ended Schemes',
        scheme_category: syn.assetClass || 'Mutual Fund',
        scheme_code: Number(code) || code,
        scheme_name: known?.schemeName || syn.name,
      },
      data: [
        {
          date: '20-06-2026',
          nav: syn.price.toFixed(4),
        },
      ],
      status: 'SUCCESS',
    },
  };
}

export async function fetchAmfiSchemeHistory(schemeCode: string): Promise<{
  source: string;
  payload: AmfiNavResponsePayload;
}> {
  const code = schemeCode.trim();
  try {
    const res = await fetchWithTimeout(
      `https://api.mfapi.in/mf/${encodeURIComponent(code)}`,
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (res.ok) {
      const json = (await res.json()) as AmfiNavResponsePayload;
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        return { source: 'amfi-mfapi-live', payload: json };
      }
    }
  } catch {
    // Fall back cleanly
  }

  const known = CURATED_AMFI_SCHEMES.find((s) => String(s.schemeCode) === code);
  const syn = synthesizeCustomTickerReport(code, INITIAL_STOCKS);
  const pts = [...syn.report.financial_charts.stock_price_4m].reverse();
  return {
    source: 'financia-fallback',
    payload: {
      meta: {
        fund_house: 'AMFI Registered Mutual Fund',
        scheme_type: 'Open Ended Schemes',
        scheme_category: syn.assetClass || 'Mutual Fund',
        scheme_code: Number(code) || code,
        scheme_name: known?.schemeName || syn.name,
      },
      data: pts.map((p, idx) => ({
        date: `${String(Math.max(1, 20 - idx)).padStart(2, '0')}-06-2026`,
        nav: p.price.toFixed(4),
      })),
      status: 'SUCCESS',
    },
  };
}

export async function fetchMarketstackEtf(
  ticker: string,
  baseQuote: StockQuote
): Promise<StockQuote | null> {
  const apiKey = process.env.MARKETSTACK_API_KEY;
  if (!apiKey) return null;

  const upper = ticker.trim().toUpperCase();
  const msSymbol = MARKETSTACK_ETF_SYMBOL_MAP[upper];
  if (!msSymbol) return null;

  const now = Date.now();
  const cached = marketstackCache.get(upper);
  if (cached && now - cached.fetchedAt < 5 * 60 * 1000) {
    return cached.quote;
  }

  try {
    const res = await fetchWithTimeout(
      `http://api.marketstack.com/v1/eod?access_key=${encodeURIComponent(
        apiKey
      )}&symbols=${encodeURIComponent(msSymbol)}&limit=14`,
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (!res.ok) return null;
    const payload = (await res.json()) as MarketstackEodPayload;
    const parsed = parseMarketstackEod(payload, baseQuote);
    if (parsed) {
      marketstackCache.set(upper, { fetchedAt: now, quote: parsed });
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchTwelveDataQuote(
  ticker: string,
  baseQuote: StockQuote
): Promise<StockQuote | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  const upper = ticker.trim().toUpperCase();
  const tdSymbol = TWELVE_DATA_SYMBOL_MAP[upper];
  if (!tdSymbol) return null;

  const now = Date.now();
  const cached = twelveDataCache.get(upper);
  if (cached && now - cached.fetchedAt < 5 * 60 * 1000) {
    return cached.quote;
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
        tdSymbol
      )}&interval=1day&outputsize=14&apikey=${encodeURIComponent(apiKey)}`,
      { headers: { Accept: 'application/json' } },
      4500
    );
    if (!res.ok) return null;
    const payload = (await res.json()) as TwelveDataSeriesPayload;
    const parsed = parseTwelveDataTimeSeries(payload, baseQuote);
    if (parsed) {
      twelveDataCache.set(upper, { fetchedAt: now, quote: parsed });
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchBinanceSpotGold(
  baseFund: StockQuote
): Promise<StockQuote | null> {
  try {
    const [tickerRes, klinesRes] = await Promise.allSettled([
      fetchWithTimeout('https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT', {}, 3800),
      fetchWithTimeout('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=1h&limit=12', {}, 3800),
    ]);

    if (tickerRes.status !== 'fulfilled' || !tickerRes.value.ok) return null;
    const tickerJson = (await tickerRes.value.json()) as {
      lastPrice?: string;
      priceChange?: string;
      priceChangePercent?: string;
    };
    const lastPrice = Number(tickerJson.lastPrice);
    if (!Number.isFinite(lastPrice) || lastPrice <= 0) return null;

    const priceChange = Number(tickerJson.priceChange || 0);
    const changePct = Number(tickerJson.priceChangePercent || 0);

    let updatedPoints = baseFund.report.financial_charts.stock_price_4m;
    if (klinesRes.status === 'fulfilled' && klinesRes.value.ok) {
      const klineRows = await klinesRes.value.json();
      const candles = parseBinanceKlines(klineRows);
      if (candles.length >= 4) {
        updatedPoints = candles.map((c) => ({
          date: c.time,
          price: c.close,
          open: c.open,
          high: c.high,
          low: c.low,
          volume: Math.max(1, Math.round(c.volume)),
        }));
      }
    }

    return {
      ...baseFund,
      assetClass: 'Gold Bullion',
      sector: 'Gold & Bullion',
      currencyUnit: 'USD',
      price: Number(lastPrice.toFixed(2)),
      change: Number.isFinite(priceChange) ? Number(priceChange.toFixed(2)) : baseFund.change,
      changePercent: Number.isFinite(changePct) ? Number(changePct.toFixed(2)) : baseFund.changePercent,
      rsi14: calculateRSI(updatedPoints.map((p) => p.price)),
      dataSource: 'Binance Spot Gold (PAXG/LBMA)',
      report: {
        ...baseFund.report,
        financial_charts: {
          ...baseFund.report.financial_charts,
          stock_price_4m: updatedPoints,
        },
      },
    };
  } catch {
    return null;
  }
}

const enrichedQuoteCache = new Map<
  string,
  { fetchedAt: number; stock: StockQuote; source: string }
>();

export async function enrichStockQuote(
  rawTicker: string
): Promise<{ stock: StockQuote; source: string }> {
  const ticker = rawTicker.trim().toUpperCase();
  const now = Date.now();
  const cached = enrichedQuoteCache.get(ticker);
  if (cached && now - cached.fetchedAt < 60 * 1000) {
    return { stock: cached.stock, source: cached.source };
  }

  let stock = synthesizeCustomTickerReport(ticker, INITIAL_STOCKS);
  let sourceLabel = 'financia-4pillar-engine';

  // 0. Live Local SQLite nav_master Database Lookup (25+ SEBI SIF / AMFI schemes by scheme_code or ISIN)
  const navDb = getNavDatabase();
  if (navDb && navDb.isConnected()) {
    const dbDetail = navDb.getSchemeDetail(ticker);
    if (dbDetail) {
      const dbHistory = navDb.getSchemeHistory(ticker, { page: 1, pageSize: 45 });
      const historyPoints = dbHistory?.data ? [...dbHistory.data].reverse() : [];
      const fundRecord = buildScreenerFundFromNavDbDetail(dbDetail, historyPoints);
      const quoteFromDb = buildTerminalQuoteFromScreenerFund(fundRecord);
      if (historyPoints.length >= 2) {
        const realChartPoints = historyPoints.map((pt, idx) => {
          const prevNav = idx > 0 ? historyPoints[idx - 1].nav : pt.nav;
          return {
            date: pt.nav_date,
            price: Number(pt.nav.toFixed(4)),
            open: Number(prevNav.toFixed(4)),
            high: Number(Math.max(pt.nav, prevNav).toFixed(4)),
            low: Number(Math.min(pt.nav, prevNav).toFixed(4)),
            volume: Math.max(100, Math.round(dbDetail.observation_count * 120)),
          };
        });
        quoteFromDb.report.financial_charts.stock_price_4m = realChartPoints;
        quoteFromDb.rsi14 = calculateRSI(realChartPoints.map((p) => p.price));
      }
      quoteFromDb.dataSource = 'SQLite nav_master (SEBI SIF / AMFI)';
      quoteFromDb.amfiSchemeCode = String(dbDetail.scheme_code);
      stock = quoteFromDb;
      sourceLabel = 'sqlite-nav-master';
      enrichedQuoteCache.set(ticker, { fetchedAt: now, stock, source: sourceLabel });
      return { stock, source: sourceLabel };
    }
  }

  // 1. Live Zero-Key AMFI Mutual Fund / Debt Fund NAV + Analytics Feed
  // Supports ISIN codes (INF...), scheme_code numbers (125497), or aliases (PPFAS, SBIGILT)
  const resolvedSchemeCode = resolveAmfiSchemeCode(ticker, stock);
  const mfLookupKey = isIndianIsin(ticker) ? ticker : resolvedSchemeCode;
  if (mfLookupKey) {
    const mfnavQuote = await fetchMfnavFundQuote(mfLookupKey, stock);
    if (mfnavQuote) {
      stock = mfnavQuote;
      sourceLabel = 'mfnav-in-live';
    } else if (resolvedSchemeCode) {
      const amfiQuote = await fetchAmfiMutualFund(ticker, stock);
      if (amfiQuote) {
        stock = amfiQuote;
        sourceLabel = 'amfi-mfapi-live';
      }
    }
  }

  // 2. Live Zero-Key Binance Spot Gold Feed (for LBMA spot proxies PAXGUSDT / XAUUSD)
  if (
    sourceLabel === 'financia-4pillar-engine' &&
    (ticker === 'PAXGUSDT' || ticker === 'PAXGUSD' || ticker === 'XAUUSD')
  ) {
    const spotGold = await fetchBinanceSpotGold(stock);
    if (spotGold) {
      stock = spotGold;
      sourceLabel = 'binance-spot-gold-live';
    }
  }

  // 3. Server-Side Twelve Data Time Series Feed (Gold, Global ETFs, NSE ETFs & FX)
  if (sourceLabel === 'financia-4pillar-engine' && process.env.TWELVE_DATA_API_KEY) {
    const tdQuote = await fetchTwelveDataQuote(ticker, stock);
    if (tdQuote) {
      stock = tdQuote;
      sourceLabel = 'twelve-data-live';
    }
  }

  // 4. Server-Side Marketstack Live EOD Feed for Gold ETFs, Debt ETFs & Index ETFs
  if (sourceLabel === 'financia-4pillar-engine' && process.env.MARKETSTACK_API_KEY) {
    const msQuote = await fetchMarketstackEtf(ticker, stock);
    if (msQuote) {
      stock = msQuote;
      sourceLabel = 'marketstack-etf-live';
    }
  }

  // 5. Server-Side FMP Stable Quote & EOD Feed (ETFs, Bullion GCUSD, FX)
  if (sourceLabel === 'financia-4pillar-engine' && process.env.FMP_API_KEY) {
    const fmpQuote = await fetchFmpQuote(ticker, stock);
    if (fmpQuote) {
      stock = fmpQuote;
      sourceLabel = 'fmp-stable-live';
    }
  }

  // 6. Server-Side API Ninjas ETF Metadata, AUM, TER & Holdings Feed
  if (sourceLabel === 'financia-4pillar-engine' && process.env.API_NINJAS_KEY) {
    const ninjasQuote = await fetchApiNinjasEtfQuote(ticker, stock);
    if (ninjasQuote) {
      stock = ninjasQuote;
      sourceLabel = 'api-ninjas-etf-live';
    }
  }

  // 4. Optional Finnhub live quote for listed ETFs (GLD, SPY, QQQ, AGG, TLT, VTI, VOO, INDA)
  if (sourceLabel === 'financia-4pillar-engine' && process.env.FINNHUB_API_KEY) {
    try {
      const fhRes = await fetchWithTimeout(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
          ticker
        )}&token=${encodeURIComponent(process.env.FINNHUB_API_KEY)}`
      );
      if (fhRes.ok) {
        const payload = (await fhRes.json()) as {
          c?: number;
          d?: number;
          dp?: number;
          pc?: number;
        };
        const merged = mergeFinnhubQuote(payload, stock);
        if (merged.dataSource === 'Finnhub Live Quote') {
          stock = merged;
          sourceLabel = 'finnhub-etf-live';
        }
      }
    } catch {
      // Continue to secondary providers
    }
  }

  // 5. Optional Alpha Vantage daily bars for US ETFs when configured
  if (sourceLabel === 'financia-4pillar-engine' && process.env.ALPHA_VANTAGE_API_KEY) {
    const avStock = await fetchAlphaVantageStock(ticker, stock);
    if (avStock) {
      stock = avStock;
      sourceLabel = 'alpha-vantage-etf-live';
    }
  }

  // 6. Optional custom upstream market data feed
  if (
    sourceLabel === 'financia-4pillar-engine' &&
    process.env.MARKET_DATA_API_KEY &&
    process.env.MARKET_DATA_BASE_URL
  ) {
    try {
      const upstreamUrl = `${process.env.MARKET_DATA_BASE_URL.replace(
        /\/$/,
        ''
      )}/quote?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(
        process.env.MARKET_DATA_API_KEY
      )}`;
      const upstreamRes = await fetchWithTimeout(upstreamUrl);
      if (upstreamRes.ok) {
        const payload = (await upstreamRes.json()) as { c?: number; d?: number; dp?: number };
        stock = mergeFinnhubQuote(payload, stock);
        if (typeof payload.c === 'number' && payload.c > 0) {
          stock.dataSource = 'Custom Upstream Live API';
          sourceLabel = 'live-api';
        }
      }
    } catch {
      // Keep structured 4-pillar research engine
    }
  }

  enrichedQuoteCache.set(ticker, { fetchedAt: now, stock, source: sourceLabel });
  return { stock, source: sourceLabel };
}

export const enrichFundQuote = enrichStockQuote;


