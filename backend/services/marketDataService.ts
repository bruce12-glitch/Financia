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
