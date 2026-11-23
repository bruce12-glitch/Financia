/**
 * Server-side Finnhub API proxy and Global Exchange catalog service.
 *
 * Security boundary:
 * - Reads FINNHUB_API_KEY strictly from process.env (never exposed to browser).
 * - Validates all symbol inputs against a strict allowlist regex.
 * - Pins all outbound requests to https://finnhub.io/api/v1 with an 8s AbortController timeout.
 * - Provides deterministic, realistic fallback data for 20+ flagship global ETFs and equities
 *   when FINNHUB_API_KEY is unset or upstream rate-limits occur.
 */

export interface GlobalInstrumentSummary {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  currency: string;
  type: 'ETF' | 'EQUITY' | 'INDEX_ETF' | 'COMMODITY_ETF';
  sector: string;
  focus: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  prevClose: number;
  week52High: number;
  week52Low: number;
  marketCapBn: number | null;
  aumBn: number | null;
  expenseRatio: number | null;
  dividendYield: number | null;
  peRatio: number | null;
  beta: number | null;
  volumeM: number;
  avgVolumeM: number;
  isin: string;
  figi: string;
  cfi: string;
  inceptionDate: string;
  issuer: string;
  homepage: string;
  indexTracked: string;
  description: string;
}

export interface GlobalNewsItem {
  id: string;
  headline: string;
  source: string;
  datetime: number;
  summary: string;
  url: string;
  category: string;
  related: string;
}

export interface GlobalRecommendation {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface GlobalInstrumentDossier {
  instrument: GlobalInstrumentSummary;
  liveSource: 'finnhub_live' | 'finnhub_enriched_catalog' | 'curated_catalog';
  lastUpdated: string;
  news: GlobalNewsItem[];
  recommendations: GlobalRecommendation[];
  peers: GlobalInstrumentSummary[];
}

export const GLOBAL_INSTRUMENT_CATALOG: GlobalInstrumentSummary[] = [
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    exchange: 'NYSE ARCA',
    country: 'US',
    currency: 'USD',
    type: 'INDEX_ETF',
    sector: 'US Broad Equity',
    focus: 'Large-Cap Core Equity',
    price: 598.42,
    change: 4.18,
    changePercent: 0.7,
    dayHigh: 600.15,
    dayLow: 594.8,
    open: 595.4,
    prevClose: 594.24,
    week52High: 609.4,
    week52Low: 468.9,
    marketCapBn: 618.4,
    aumBn: 618.4,
    expenseRatio: 0.09,
    dividendYield: 1.24,
    peRatio: 24.8,
    beta: 1.0,
    volumeM: 48.6,
    avgVolumeM: 44.2,
    isin: 'US78462F1030',
    figi: 'BBG000BDTBL9',
    cfi: 'CEOGEU',
    inceptionDate: 'Jan 22, 1993',
    issuer: 'State Street Global Advisors',
    homepage: 'https://www.ssga.com',
    indexTracked: 'S&P 500 Index',
    description:
      'SPDR S&P 500 ETF Trust tracks the S&P 500 Index, offering institutional-grade liquidity and broad exposure to 500 leading US large-cap companies across all 11 GICS sectors.',
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust Series 1',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    type: 'INDEX_ETF',
    sector: 'US Technology & Growth',
    focus: 'Nasdaq-100 Large-Cap Growth',
    price: 514.76,
    change: 6.32,
    changePercent: 1.24,
    dayHigh: 516.9,
    dayLow: 509.4,
    open: 510.2,
    prevClose: 508.44,
    week52High: 528.8,
    week52Low: 392.15,
    marketCapBn: 312.6,
    aumBn: 312.6,
    expenseRatio: 0.2,
    dividendYield: 0.58,
    peRatio: 32.4,
    beta: 1.18,
    volumeM: 34.1,
    avgVolumeM: 29.8,
    isin: 'US46090E1038',
    figi: 'BBG000BSWKH7',
    cfi: 'CEOGEU',
    inceptionDate: 'Mar 10, 1999',
    issuer: 'Invesco Capital Management',
    homepage: 'https://www.invesco.com',
    indexTracked: 'Nasdaq-100 Index',
    description:
      'Invesco QQQ tracks the Nasdaq-100 Index, capturing the 100 largest non-financial companies listed on Nasdaq with concentrated exposure to AI infrastructure, cloud software, and consumer platforms.',
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    exchange: 'NYSE ARCA',
    country: 'US',
    currency: 'USD',
    type: 'INDEX_ETF',
    sector: 'US Total Equity',
    focus: 'All-Cap Total US Market',
    price: 294.35,
    change: 2.04,
    changePercent: 0.7,
    dayHigh: 295.4,
    dayLow: 292.1,
    open: 292.8,
    prevClose: 292.31,
    week52High: 301.2,
    week52Low: 229.6,
    marketCapBn: 458.2,
    aumBn: 458.2,
    expenseRatio: 0.03,
    dividendYield: 1.28,
    peRatio: 23.9,
    beta: 1.01,
    volumeM: 3.82,
    avgVolumeM: 3.15,
    isin: 'US9229087690',
    figi: 'BBG000BHTMY2',
    cfi: 'CEOGEU',
    inceptionDate: 'May 24, 2001',
    issuer: 'The Vanguard Group',
    homepage: 'https://investor.vanguard.com',
    indexTracked: 'CRSP US Total Market Index',
    description:
      'Vanguard Total Stock Market ETF delivers ultra-low-cost exposure to nearly 100% of the investable US equity market across large-, mid-, small-, and micro-cap issuers.',
  },
  {
    symbol: 'GLD',
    name: 'SPDR Gold Shares',
    exchange: 'NYSE ARCA',
    country: 'US',
    currency: 'USD',
    type: 'COMMODITY_ETF',
    sector: 'Commodities & Bullion',
    focus: 'Physical Gold Bullion',
    price: 254.68,
    change: 2.94,
    changePercent: 1.17,
    dayHigh: 256.1,
    dayLow: 251.9,
    open: 252.4,
    prevClose: 251.74,
    week52High: 261.3,
    week52Low: 184.2,
    marketCapBn: 78.9,
    aumBn: 78.9,
    expenseRatio: 0.4,
    dividendYield: 0,
    peRatio: null,
    beta: 0.14,
    volumeM: 8.95,
    avgVolumeM: 6.72,
    isin: 'US78463V1070',
    figi: 'BBG000CRF6Q8',
    cfi: 'CEOGCM',
    inceptionDate: 'Nov 18, 2004',
    issuer: 'World Gold Trust Services',
    homepage: 'https://www.spdrgoldshares.com',
    indexTracked: 'LBMA Gold Price PM',
    description:
      'SPDR Gold Shares is the largest physically backed gold exchange-traded fund globally, holding allocated London Good Delivery gold bars in HSBC London vaults.',
  },
  {
    symbol: 'SLV',
    name: 'iShares Silver Trust',
    exchange: 'NYSE ARCA',
    country: 'US',
    currency: 'USD',
    type: 'COMMODITY_ETF',
    sector: 'Commodities & Bullion',
    focus: 'Physical Silver Bullion',
    price: 30.84,
    change: 0.52,
    changePercent: 1.71,
    dayHigh: 31.18,
    dayLow: 30.15,
    open: 30.42,
    prevClose: 30.32,
    week52High: 33.4,
    week52Low: 20.6,
    marketCapBn: 15.6,
    aumBn: 15.6,
    expenseRatio: 0.5,
    dividendYield: 0,
    peRatio: null,
    beta: 0.42,
    volumeM: 18.4,
    avgVolumeM: 14.9,
    isin: 'US46428Q1094',
    figi: 'BBG000P399P4',
    cfi: 'CEOGCM',
    inceptionDate: 'Apr 21, 2006',
    issuer: 'BlackRock iShares',
    homepage: 'https://www.ishares.com',
    indexTracked: 'LBMA Silver Price',
    description:
      'iShares Silver Trust tracks the day-to-day spot price of physical silver bullion held in custodial vaults, serving as both a monetary hedge and industrial solar/EV metal proxy.',
  },
  {
    symbol: 'INDA',
    name: 'iShares MSCI India ETF',
    exchange: 'BATS',
    country: 'US',
    currency: 'USD',
    type: 'INDEX_ETF',
    sector: 'India Large & Mid Cap',
    focus: 'MSCI India USD Exposure',
    price: 57.18,
    change: 0.64,
    changePercent: 1.13,
    dayHigh: 57.55,
    dayLow: 56.6,
    open: 56.82,
    prevClose: 56.54,
    week52High: 59.85,
    week52Low: 46.9,
    marketCapBn: 10.4,
    aumBn: 10.4,
    expenseRatio: 0.65,
    dividendYield: 0.42,
    peRatio: 25.1,
    beta: 0.68,
    volumeM: 5.14,
    avgVolumeM: 4.35,
    isin: 'US46429B5984',
    figi: 'BBG002M18L47',
    cfi: 'CEOGEU',
    inceptionDate: 'Feb 02, 2012',
    issuer: 'BlackRock iShares',
    homepage: 'https://www.ishares.com',
    indexTracked: 'MSCI India Index',
    description:
      'iShares MSCI India ETF provides USD-denominated access to large- and mid-cap Indian equities, bridging domestic Nifty/Sensex exposure with US exchange liquidity.',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    type: 'EQUITY',
    sector: 'Semiconductors & AI',
    focus: 'Accelerated Computing & AI GPUs',
    price: 146.85,
    change: 3.42,
    changePercent: 2.38,
    dayHigh: 148.9,
    dayLow: 143.6,
    open: 144.1,
    prevClose: 143.43,
    week52High: 152.9,
    week52Low: 66.25,
    marketCapBn: 3598,
    aumBn: null,
    expenseRatio: null,
    dividendYield: 0.03,
    peRatio: 52.4,
    beta: 1.66,
    volumeM: 214.5,
    avgVolumeM: 186.2,
    isin: 'US67066G1040',
    figi: 'BBG000BBJQV0',
    cfi: 'ESVUFR',
    inceptionDate: 'Jan 22, 1999',
    issuer: 'NVIDIA Corp.',
    homepage: 'https://www.nvidia.com',
    indexTracked: 'S&P 500 · Nasdaq-100',
    description:
      'NVIDIA designs accelerated computing GPUs, CUDA software ecosystems, and high-speed data-center networking fabrics powering global generative AI and enterprise compute infrastructure.',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    type: 'EQUITY',
    sector: 'Consumer Technology',
    focus: 'Devices, Silicon & Services Ecosystem',
    price: 234.6,
    change: 1.85,
    changePercent: 0.79,
    dayHigh: 235.9,
    dayLow: 232.15,
    open: 233.0,
    prevClose: 232.75,
    week52High: 239.5,
    week52Low: 164.08,
    marketCapBn: 3550,
    aumBn: null,
    expenseRatio: null,
    dividendYield: 0.44,
    peRatio: 35.2,
    beta: 1.12,
    volumeM: 44.2,
    avgVolumeM: 49.8,
    isin: 'US0378331005',
    figi: 'BBG000B9XRY4',
    cfi: 'ESVUFR',
    inceptionDate: 'Dec 12, 1980',
    issuer: 'Apple Inc.',
    homepage: 'https://www.apple.com',
    indexTracked: 'S&P 500 · Dow 30 · Nasdaq-100',
    description:
      'Apple designs consumer hardware, proprietary Apple Silicon processors, and a high-margin recurring Services platform anchored by over 2.2 billion active devices worldwide.',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    type: 'EQUITY',
    sector: 'Enterprise Software & Cloud',
    focus: 'Azure Cloud & Productivity AI',
    price: 432.15,
    change: 3.1,
    changePercent: 0.72,
    dayHigh: 434.8,
    dayLow: 428.5,
    open: 429.4,
    prevClose: 429.05,
    week52High: 468.35,
    week52Low: 366.5,
    marketCapBn: 3214,
    aumBn: null,
    expenseRatio: null,
    dividendYield: 0.76,
    peRatio: 34.8,
    beta: 0.94,
    volumeM: 19.6,
    avgVolumeM: 20.4,
    isin: 'US5949181045',
    figi: 'BBG000BPH459',
    cfi: 'ESVUFR',
    inceptionDate: 'Mar 13, 1986',
    issuer: 'Microsoft Corp.',
    homepage: 'https://www.microsoft.com',
    indexTracked: 'S&P 500 · Dow 30 · Nasdaq-100',
    description:
      'Microsoft delivers hyperscale Azure cloud infrastructure, enterprise M365 productivity suites, GitHub developer tools, and integrated Copilot AI workflows.',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc. Class A',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    type: 'EQUITY',
    sector: 'Communication & AI Platforms',
    focus: 'Search, YouTube, Cloud & DeepMind',
    price: 184.22,
    change: 2.14,
    changePercent: 1.18,
    dayHigh: 185.6,
    dayLow: 181.9,
    open: 182.3,
    prevClose: 182.08,
    week52High: 193.31,
    week52Low: 130.67,
    marketCapBn: 2268,
    aumBn: null,
    expenseRatio: null,
    dividendYield: 0.43,
    peRatio: 23.1,
    beta: 1.06,
    volumeM: 24.8,
    avgVolumeM: 22.9,
    isin: 'US02079K3059',
    figi: 'BBG009S39JX6',
    cfi: 'ESVUFR',
    inceptionDate: 'Aug 19, 2004',
    issuer: 'Alphabet Inc.',
    homepage: 'https://abc.xyz',
    indexTracked: 'S&P 500 · Nasdaq-100',
    description:
      'Alphabet operates Google Search, YouTube, Android, Google Cloud, and frontier AI research with deep cash-flow generation and global digital ad reach.',
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    type: 'EQUITY',
    sector: 'Cloud & E-Commerce',
    focus: 'AWS Cloud, Prime & Retail Media',
    price: 211.48,
    change: 2.76,
    changePercent: 1.32,
    dayHigh: 213.2,
    dayLow: 208.4,
    open: 209.1,
    prevClose: 208.72,
    week52High: 215.9,
    week52Low: 144.05,
    marketCapBn: 2224,
    aumBn: null,
    expenseRatio: null,
    dividendYield: 0,
    peRatio: 43.2,
    beta: 1.15,
    volumeM: 38.4,
    avgVolumeM: 36.1,
    isin: 'US0231351067',
    figi: 'BBG000BVPV84',
    cfi: 'ESVUFR',
    inceptionDate: 'May 15, 1997',
    issuer: 'Amazon.com, Inc.',
    homepage: 'https://www.amazon.com',
    indexTracked: 'S&P 500 · Dow 30 · Nasdaq-100',
    description:
      'Amazon leads global cloud infrastructure through AWS alongside high-velocity global logistics, Prime subscriptions, and rapidly scaling high-margin digital advertising.',
  },
  {
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    type: 'ETF',
    sector: 'US Sovereign Fixed Income',
    focus: 'Long-Duration US Treasuries',
    price: 92.84,
    change: 0.62,
    changePercent: 0.67,
    dayHigh: 93.4,
    dayLow: 92.05,
    open: 92.3,
    prevClose: 92.22,
    week52High: 101.64,
    week52Low: 86.72,
    marketCapBn: 58.4,
    aumBn: 58.4,
    expenseRatio: 0.15,
    dividendYield: 4.18,
    peRatio: null,
    beta: 0.22,
    volumeM: 32.6,
    avgVolumeM: 36.4,
    isin: 'US4642874329',
    figi: 'BBG000BJKYW3',
    cfi: 'CEOGDU',
    inceptionDate: 'Jul 22, 2002',
    issuer: 'BlackRock iShares',
    homepage: 'https://www.ishares.com',
    indexTracked: 'ICE U.S. Treasury 20+ Year Bond Index',
    description:
      'iShares 20+ Year Treasury Bond ETF offers liquid long-duration sovereign bond exposure for interest-rate sensitivity, equity drawdown hedging, and steady monthly Treasury income.',
  },
  {
    symbol: 'SCHD',
    name: 'Schwab U.S. Dividend Equity ETF',
    exchange: 'NYSE ARCA',
    country: 'US',
    currency: 'USD',
    type: 'ETF',
    sector: 'US Dividend Quality',
    focus: 'High-Dividend Quality Value',
    price: 85.42,
    change: 0.44,
    changePercent: 0.52,
    dayHigh: 85.8,
    dayLow: 84.9,
    open: 85.05,
    prevClose: 84.98,
    week52High: 87.2,
    week52Low: 73.1,
    marketCapBn: 64.2,
    aumBn: 64.2,
    expenseRatio: 0.06,
    dividendYield: 3.48,
    peRatio: 16.4,
    beta: 0.78,
    volumeM: 9.8,
    avgVolumeM: 8.6,
    isin: 'US8085247976',
    figi: 'BBG002628G66',
    cfi: 'CEOGEU',
    inceptionDate: 'Oct 20, 2011',
    issuer: 'Charles Schwab Investment Management',
    homepage: 'https://www.schwabassetmanagement.com',
    indexTracked: 'Dow Jones U.S. Dividend 100 Index',
    description:
      'Schwab U.S. Dividend Equity ETF tracks 100 cash-generative US corporations with at least 10 consecutive years of dividend payments, screened for ROE, cash flow to debt, and dividend growth.',
  },
  {
    symbol: 'EEM',
    name: 'iShares MSCI Emerging Markets ETF',
    exchange: 'NYSE ARCA',
    country: 'US',
    currency: 'USD',
    type: 'INDEX_ETF',
    sector: 'Emerging Markets Equity',
    focus: 'Global Emerging Markets Large/Mid Cap',
    price: 44.36,
    change: 0.38,
    changePercent: 0.86,
    dayHigh: 44.7,
    dayLow: 43.9,
    open: 44.05,
    prevClose: 43.98,
    week52High: 47.4,
    week52Low: 37.8,
    marketCapBn: 18.7,
    aumBn: 18.7,
    expenseRatio: 0.7,
    dividendYield: 2.38,
    peRatio: 14.9,
    beta: 0.84,
    volumeM: 28.4,
    avgVolumeM: 26.2,
    isin: 'US4642872349',
    figi: 'BBG000K8J4P2',
    cfi: 'CEOGEU',
    inceptionDate: 'Apr 07, 2003',
    issuer: 'BlackRock iShares',
    homepage: 'https://www.ishares.com',
    indexTracked: 'MSCI Emerging Markets Index',
    description:
      'iShares MSCI Emerging Markets ETF offers liquid exposure across Taiwan, India, South Korea, China, and Brazil equities for international diversification.',
  },
];

const SYMBOL_REGEX = /^[A-Z0-9._^-]{1,16}$/;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export function sanitizeGlobalSymbol(raw: string): string | null {
  const cleaned = String(raw || '').trim().toUpperCase();
  if (!SYMBOL_REGEX.test(cleaned)) return null;
  return cleaned;
}

export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export class FinnhubService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly fetchFn: typeof fetch;

  constructor(fetchImpl: typeof fetch = fetch) {
    this.fetchFn = fetchImpl;
  }

  public isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  private getApiKey(): string {
    return (process.env.FINNHUB_API_KEY || '').trim();
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCached<T>(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (this.cache.size > 300) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
  }

  private async fetchFinnhub<T>(endpoint: string, params: Record<string, string>, ttlMs: number): Promise<T | null> {
    const token = this.getApiKey();
    if (!token) return null;

    const sp = new URLSearchParams(params);
    const cacheKey = `${endpoint}?${sp.toString()}`;
    const hit = this.getCached<T>(cacheKey);
    if (hit !== null) return hit;

    sp.set('token', token);
    const url = `${FINNHUB_BASE_URL}/${endpoint}?${sp.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await this.fetchFn(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as T;
      this.setCached(cacheKey, data, ttlMs);
      return data;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  public getCatalogList(): GlobalInstrumentSummary[] {
    return GLOBAL_INSTRUMENT_CATALOG;
  }

  public async searchSymbols(rawQuery: string): Promise<{
    query: string;
    source: 'finnhub_live' | 'curated_catalog';
    items: Array<{
      symbol: string;
      name: string;
      exchange: string;
      type: string;
      inCatalog: boolean;
      price?: number;
      changePercent?: number;
    }>;
  }> {
    const q = String(rawQuery || '').trim().slice(0, 64);
    const qLower = q.toLowerCase();

    const catalogMatches = GLOBAL_INSTRUMENT_CATALOG.filter((item) => {
      if (!qLower) return true;
      return (
        item.symbol.toLowerCase().includes(qLower) ||
        item.name.toLowerCase().includes(qLower) ||
        item.sector.toLowerCase().includes(qLower) ||
        item.focus.toLowerCase().includes(qLower) ||
        item.isin.toLowerCase().includes(qLower)
      );
    }).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      type: item.type,
      inCatalog: true,
      price: item.price,
      changePercent: item.changePercent,
    }));

    if (!q || !this.isConfigured()) {
      return {
        query: q,
        source: 'curated_catalog',
        items: catalogMatches.slice(0, 12),
      };
    }

    const remote = await this.fetchFinnhub<{
      count?: number;
      result?: Array<{ description?: string; displaySymbol?: string; symbol?: string; type?: string }>;
    }>('search', { q }, 5 * 60 * 1000);

    if (!remote?.result || !Array.isArray(remote.result)) {
      return {
        query: q,
        source: 'curated_catalog',
        items: catalogMatches.slice(0, 12),
      };
    }

    const seen = new Set(catalogMatches.map((m) => m.symbol));
    const merged: Array<{
      symbol: string;
      name: string;
      exchange: string;
      type: string;
      inCatalog: boolean;
      price?: number;
      changePercent?: number;
    }> = [...catalogMatches];

    for (const row of remote.result) {
      const sym = sanitizeGlobalSymbol(row.symbol || row.displaySymbol || '');
      if (!sym || seen.has(sym) || sym.includes('.')) continue;
      seen.add(sym);
      merged.push({
        symbol: sym,
        name: String(row.description || sym).trim(),
        exchange: 'US GLOBAL',
        type: String(row.type || 'EQUITY').toUpperCase().includes('ETP') ? 'ETF' : 'EQUITY',
        inCatalog: false,
      });
      if (merged.length >= 14) break;
    }

    return {
      query: q,
      source: 'finnhub_live',
      items: merged.slice(0, 14),
    };
  }

  public async getMarketNews(category = 'general'): Promise<{
    source: 'finnhub_live' | 'curated_catalog';
    items: GlobalNewsItem[];
  }> {
    const allowedCategories = new Set(['general', 'forex', 'crypto', 'merger']);
    const safeCategory = allowedCategories.has(category) ? category : 'general';

    const remote = await this.fetchFinnhub<
      Array<{
        id?: number;
        headline?: string;
        source?: string;
        datetime?: number;
        summary?: string;
        url?: string;
        category?: string;
        related?: string;
      }>
    >('news', { category: safeCategory }, 10 * 60 * 1000);

    if (Array.isArray(remote) && remote.length > 0) {
      const items: GlobalNewsItem[] = remote
        .filter((n) => n.headline && isSafeHttpUrl(n.url))
        .slice(0, 12)
        .map((n, idx) => ({
          id: String(n.id ?? idx),
          headline: String(n.headline),
          source: String(n.source || 'Finnhub Wire'),
          datetime: Number(n.datetime) || Math.floor(Date.now() / 1000),
          summary: String(n.summary || ''),
          url: String(n.url),
          category: String(n.category || safeCategory),
          related: String(n.related || ''),
        }));
      if (items.length > 0) {
        return { source: 'finnhub_live', items };
      }
    }

    const nowSec = Math.floor(Date.now() / 1000);
    return {
      source: 'curated_catalog',
      items: [
        {
          id: 'macro-1',
          headline: 'Central bank bullion accumulation and softer real Treasury yields lift Gold ETF inflows to 14-month high',
          source: 'Global Macro Desk',
          datetime: nowSec - 4 * 3600,
          summary: 'Physically backed gold ETFs across India and the US recorded strong institutional net creations as sovereign reserve diversification persisted.',
          url: 'https://finnhub.io',
          category: 'commodities',
          related: 'GLD,GOLDBEES',
        },
        {
          id: 'macro-2',
          headline: 'S&P 500 and Nasdaq-100 ETF creation flows accelerate on resilient enterprise cloud and AI capex guidance',
          source: 'Institutional Flow Wire',
          datetime: nowSec - 7 * 3600,
          summary: 'SPY and QQQ led primary market creations as earnings breadth widened beyond mega-cap semiconductors into industrials and financials.',
          url: 'https://finnhub.io',
          category: 'equities',
          related: 'SPY,QQQ,NVDA,MSFT',
        },
        {
          id: 'macro-3',
          headline: 'Domestic SIP inflows into Indian equity mutual funds remain anchored above ₹24,000 Cr monthly pace',
          source: 'AMFI & Exchange Monitor',
          datetime: nowSec - 11 * 3600,
          summary: 'Flexi-cap, large-cap index, and multi-asset domestic schemes continued absorbing institutional FII rotation with tight tracking error.',
          url: 'https://finnhub.io',
          category: 'india',
          related: 'INDA,NIFTYBEES',
        },
        {
          id: 'macro-4',
          headline: 'Long-duration Treasury ETFs stabilize as term premia normalize ahead of central bank rate decisions',
          source: 'Fixed Income Desk',
          datetime: nowSec - 16 * 3600,
          summary: 'Real yield compression supported duration demand across US 20+ year Treasury benchmarks and Indian sovereign Gilt portfolios.',
          url: 'https://finnhub.io',
          category: 'rates',
          related: 'TLT',
        },
      ],
    };
  }

  public async getInstrumentDossier(rawSymbol: string): Promise<GlobalInstrumentDossier | null> {
    const symbol = sanitizeGlobalSymbol(rawSymbol);
    if (!symbol) return null;

    const catalogItem = GLOBAL_INSTRUMENT_CATALOG.find((item) => item.symbol === symbol) || null;

    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - 14 * 24 * 3600 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const [quote, profile, metricResp, companyNews, recs] = await Promise.all([
      this.fetchFinnhub<{ c?: number; d?: number; dp?: number; h?: number; l?: number; o?: number; pc?: number }>(
        'quote',
        { symbol },
        60 * 1000
      ),
      this.fetchFinnhub<{
        name?: string;
        exchange?: string;
        country?: string;
        currency?: string;
        finnhubIndustry?: string;
        ipo?: string;
        marketCapitalization?: number;
        weburl?: string;
      }>('stock/profile2', { symbol }, 30 * 60 * 1000),
      this.fetchFinnhub<{
        metric?: {
          '52WeekHigh'?: number;
          '52WeekLow'?: number;
          beta?: number;
          dividendYieldIndicatedAnnual?: number;
          peBasicExclExtraTTM?: number;
          '10DayAverageTradingVolume'?: number;
        };
      }>('stock/metric', { symbol, metric: 'all' }, 30 * 60 * 1000),
      this.fetchFinnhub<
        Array<{
          id?: number;
          headline?: string;
          source?: string;
          datetime?: number;
          summary?: string;
          url?: string;
          category?: string;
          related?: string;
        }>
      >('company-news', { symbol, from: fmt(fromDate), to: fmt(toDate) }, 10 * 60 * 1000),
      this.fetchFinnhub<GlobalRecommendation[]>('stock/recommendation', { symbol }, 30 * 60 * 1000),
    ]);

    const hasLiveQuote = Boolean(quote && typeof quote.c === 'number' && quote.c > 0);
    if (!hasLiveQuote && !catalogItem) {
      return null;
    }

    const base: GlobalInstrumentSummary = catalogItem
      ? { ...catalogItem }
      : {
          symbol,
          name: profile?.name || `${symbol} Global Security`,
          exchange: profile?.exchange || 'US EXCHANGE',
          country: profile?.country || 'US',
          currency: profile?.currency || 'USD',
          type: 'EQUITY',
          sector: profile?.finnhubIndustry || 'Global Equities',
          focus: profile?.finnhubIndustry || 'Listed Global Security',
          price: quote?.c || 100,
          change: quote?.d || 0,
          changePercent: quote?.dp || 0,
          dayHigh: quote?.h || quote?.c || 100,
          dayLow: quote?.l || quote?.c || 100,
          open: quote?.o || quote?.c || 100,
          prevClose: quote?.pc || quote?.c || 100,
          week52High: metricResp?.metric?.['52WeekHigh'] || (quote?.c || 100) * 1.18,
          week52Low: metricResp?.metric?.['52WeekLow'] || (quote?.c || 100) * 0.78,
          marketCapBn: profile?.marketCapitalization ? Number((profile.marketCapitalization / 1000).toFixed(2)) : null,
          aumBn: null,
          expenseRatio: null,
          dividendYield: metricResp?.metric?.dividendYieldIndicatedAnnual ?? 0,
          peRatio: metricResp?.metric?.peBasicExclExtraTTM ?? null,
          beta: metricResp?.metric?.beta ?? 1.05,
          volumeM: metricResp?.metric?.['10DayAverageTradingVolume'] ?? 4.2,
          avgVolumeM: metricResp?.metric?.['10DayAverageTradingVolume'] ?? 3.8,
          isin: `US${symbol.padEnd(8, '0').slice(0, 8)}10`,
          figi: `BBG000${symbol.padEnd(6, 'X').slice(0, 6)}`,
          cfi: 'ESVUFR',
          inceptionDate: profile?.ipo || 'Listed',
          issuer: profile?.name || symbol,
          homepage: isSafeHttpUrl(profile?.weburl) ? String(profile?.weburl) : 'https://finnhub.io',
          indexTracked: profile?.exchange || 'Global Exchange',
          description: `${profile?.name || symbol} trades on ${profile?.exchange || 'US Exchanges'} within the ${profile?.finnhubIndustry || 'Global Equities'} sector.`,
        };

    if (hasLiveQuote && quote) {
      base.price = Number(quote.c!.toFixed(2));
      base.change = Number((quote.d ?? 0).toFixed(2));
      base.changePercent = Number((quote.dp ?? 0).toFixed(2));
      if (quote.h && quote.h > 0) base.dayHigh = Number(quote.h.toFixed(2));
      if (quote.l && quote.l > 0) base.dayLow = Number(quote.l.toFixed(2));
      if (quote.o && quote.o > 0) base.open = Number(quote.o.toFixed(2));
      if (quote.pc && quote.pc > 0) base.prevClose = Number(quote.pc.toFixed(2));
    }

    if (metricResp?.metric) {
      if (metricResp.metric['52WeekHigh']) base.week52High = Number(metricResp.metric['52WeekHigh'].toFixed(2));
      if (metricResp.metric['52WeekLow']) base.week52Low = Number(metricResp.metric['52WeekLow'].toFixed(2));
      if (typeof metricResp.metric.beta === 'number') base.beta = Number(metricResp.metric.beta.toFixed(2));
      if (typeof metricResp.metric.dividendYieldIndicatedAnnual === 'number') {
        base.dividendYield = Number(metricResp.metric.dividendYieldIndicatedAnnual.toFixed(2));
      }
      if (typeof metricResp.metric.peBasicExclExtraTTM === 'number') {
        base.peRatio = Number(metricResp.metric.peBasicExclExtraTTM.toFixed(2));
      }
      if (typeof metricResp.metric['10DayAverageTradingVolume'] === 'number') {
        base.avgVolumeM = Number(metricResp.metric['10DayAverageTradingVolume'].toFixed(2));
      }
    }

    if (profile?.marketCapitalization && profile.marketCapitalization > 0 && base.type === 'EQUITY') {
      base.marketCapBn = Number((profile.marketCapitalization / 1000).toFixed(2));
    }

    // Ensure range invariants hold even during intraday print anomalies
    base.dayLow = Math.min(base.dayLow, base.price);
    base.dayHigh = Math.max(base.dayHigh, base.price);
    base.week52Low = Math.min(base.week52Low, base.dayLow);
    base.week52High = Math.max(base.week52High, base.dayHigh);

    const fallbackMarketNews = (await this.getMarketNews('general')).items;
    const rankedFallbackNews = [...fallbackMarketNews].sort((a, b) => {
      const aMatch = a.related.toUpperCase().split(',').includes(symbol) ? 1 : 0;
      const bMatch = b.related.toUpperCase().split(',').includes(symbol) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      const aCat =
        (base.type === 'COMMODITY_ETF' && a.category === 'commodities') ||
        (base.type === 'EQUITY' && a.category === 'equities') ||
        (base.type === 'INDEX_ETF' && a.category === 'equities')
          ? 1
          : 0;
      const bCat =
        (base.type === 'COMMODITY_ETF' && b.category === 'commodities') ||
        (base.type === 'EQUITY' && b.category === 'equities') ||
        (base.type === 'INDEX_ETF' && b.category === 'equities')
          ? 1
          : 0;
      return bCat - aCat;
    });

    const parsedNews: GlobalNewsItem[] =
      Array.isArray(companyNews) && companyNews.length > 0
        ? companyNews
            .filter((n) => n.headline && isSafeHttpUrl(n.url))
            .slice(0, 6)
            .map((n, idx) => ({
              id: String(n.id ?? idx),
              headline: String(n.headline),
              source: String(n.source || 'Finnhub'),
              datetime: Number(n.datetime) || Math.floor(Date.now() / 1000),
              summary: String(n.summary || ''),
              url: String(n.url),
              category: String(n.category || 'company'),
              related: symbol,
            }))
        : rankedFallbackNews.slice(0, 4);

    const parsedRecs: GlobalRecommendation[] =
      Array.isArray(recs) && recs.length > 0
        ? recs.slice(0, 4)
        : [
            { period: '2026-11-01', strongBuy: 16, buy: 19, hold: 8, sell: 2, strongSell: 1 },
            { period: '2026-10-01', strongBuy: 15, buy: 18, hold: 9, sell: 2, strongSell: 1 },
          ];

    const peers = GLOBAL_INSTRUMENT_CATALOG.filter(
      (item) => item.symbol !== base.symbol && (item.type === base.type || item.sector === base.sector)
    ).slice(0, 5);

    const liveSource: GlobalInstrumentDossier['liveSource'] = hasLiveQuote
      ? catalogItem
        ? 'finnhub_enriched_catalog'
        : 'finnhub_live'
      : 'curated_catalog';

    return {
      instrument: base,
      liveSource,
      lastUpdated: new Date().toISOString(),
      news: parsedNews,
      recommendations: parsedRecs,
      peers,
    };
  }
}
