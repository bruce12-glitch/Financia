import zlib from 'zlib';
import { marketApiGateway } from '../services/apiGatewayCache.ts';
import { FinanciaMutualFundDatabase, TerminalSchemeRecord } from './database.ts';

const MF_PORTFOLIO_HOLDINGS_URL = 'https://api.tigzig.com/downloads/mf_portfolio_holdings.csv';
const MF_SCHEME_DETAILS_URL = 'https://api.tigzig.com/mf/v1/download/scheme_details_latest.csv.gz';

export interface AmfiSyncAudit {
  status: 'synced' | 'fallback';
  parsedCount: number;
  activeCount: number;
  etfCount: number;
  durationMs: number;
  syncedAtUtc: string;
  source: string;
}

function classifyAmfiScheme(
  schemeName: string,
  categoryHeader: string
): {
  instrumentType: string;
  assetClass: string;
  subCategory: string;
  planType: string;
  optionType: string;
} {
  const lower = schemeName.toLowerCase();
  const catLower = categoryHeader.toLowerCase();

  const isEtf = lower.includes('etf') || lower.includes('bees') || catLower.includes('etf');
  const instrumentType = isEtf ? 'ETF' : 'Mutual Fund';

  const assetClass =
    lower.includes('gold') || lower.includes('silver')
      ? 'Commodities'
      : catLower.includes('debt') ||
          lower.includes('liquid') ||
          lower.includes('gilt') ||
          lower.includes('bond') ||
          lower.includes('money market')
        ? 'Debt'
        : catLower.includes('hybrid') || lower.includes('balanced') || lower.includes('arbitrage')
          ? 'Hybrid'
          : 'Equity';

  const subCategory =
    catLower.includes('flexi') || lower.includes('flexi')
      ? 'Flexi Cap'
      : catLower.includes('mid cap') || lower.includes('mid cap') || lower.includes('midcap')
        ? 'Mid Cap'
        : catLower.includes('small cap') || lower.includes('small cap') || lower.includes('smallcap')
          ? 'Small Cap'
          : catLower.includes('large cap') || lower.includes('large cap') || lower.includes('nifty 50')
            ? 'Large Cap'
            : lower.includes('elss') || lower.includes('tax')
              ? 'ELSS Tax Saver'
              : lower.includes('gold')
                ? 'Gold & Bullion'
                : lower.includes('gilt')
                  ? 'Gilt & Sovereign'
                  : lower.includes('liquid')
                    ? 'Liquid Debt'
                    : isEtf
                      ? 'Index ETF'
                      : 'Diversified';

  const planType = lower.includes('direct') ? 'Direct' : 'Regular';
  const optionType = lower.includes('idcw') || lower.includes('dividend') ? 'IDCW' : 'Growth';

  return { instrumentType, assetClass, subCategory, planType, optionType };
}

export function parseAmfiNavText(rawText: string): TerminalSchemeRecord[] {
  const lines = rawText.split(/\r?\n/);
  const rows: TerminalSchemeRecord[] = [];
  let currentCategory = 'Open Ended Schemes';
  let currentAmc = 'AMFI Registered AMC';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('Scheme Code;')) continue;

    if (!line.includes(';')) {
      if (line.includes('Schemes(') || line.startsWith('Open Ended') || line.startsWith('Close Ended')) {
        currentCategory = line;
      } else if (line.length > 3 && line.length < 120) {
        currentAmc = line;
      }
      continue;
    }

    const parts = line.split(';');
    if (parts.length < 6) continue;
    const schemeCode = parts[0].trim();
    if (!/^\d{5,8}$/.test(schemeCode)) continue;

    const isin1 = parts[1].trim();
    const isin2 = parts[2].trim();
    const schemeName = parts[3].trim();
    const navVal = Number(parts[4].trim());
    const navDate = parts[5].trim();
    if (!schemeName || !Number.isFinite(navVal) || navVal <= 0) continue;

    const meta = classifyAmfiScheme(schemeName, currentCategory);
    rows.push({
      scheme_code: schemeCode,
      isin: isin1 && isin1 !== '-' ? isin1 : null,
      isin2: isin2 && isin2 !== '-' ? isin2 : null,
      scheme_name: schemeName,
      amc: currentAmc,
      instrument_type: meta.instrumentType,
      asset_class: meta.assetClass,
      sub_category: meta.subCategory,
      plan_type: meta.planType,
      option_type: meta.optionType,
      nav: navVal,
      nav_date: navDate,
      is_active: 1,
      fund_aum_cr: null,
      ter_direct: meta.planType === 'Direct' ? 0.45 : null,
      ter_regular: meta.planType === 'Regular' ? 1.25 : null,
      riskometer: meta.assetClass === 'Debt' ? 'Moderate' : 'Very High',
      benchmark: meta.assetClass === 'Debt' ? 'CRISIL Short Term Bond' : 'NIFTY 500 TRI',
      fund_managers: null,
      exit_load: meta.instrumentType === 'ETF' ? 'Nil (Exchange Traded)' : '1% within 365 days',
      inception_date: null,
    });
  }

  return rows;
}

export class DatasetSyncService {
  private readonly mfDb: FinanciaMutualFundDatabase;
  private lastAudit: AmfiSyncAudit | null = null;
  private holdingsSyncPromise: Promise<number> | null = null;
  private schemeDetailsSyncPromise: Promise<number> | null = null;

  constructor(mfDb: FinanciaMutualFundDatabase) {
    this.mfDb = mfDb;
  }

  public getLastAudit(): AmfiSyncAudit | null {
    return this.lastAudit;
  }

  private async fetchDatasetText(url: string, gunzip: boolean): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Financia-Gateway/2.0',
          Accept: 'text/csv, application/gzip, */*',
        },
      });
      if (!res.ok) {
        throw new Error(`Upstream HTTP ${res.status} for ${url}`);
      }
      const rawBuf = Buffer.from(await res.arrayBuffer());
      return gunzip ? zlib.gunzipSync(rawBuf).toString('utf8') : rawBuf.toString('utf8');
    } finally {
      clearTimeout(timer);
    }
  }

  public async syncPortfolioHoldings(): Promise<number> {
    if (this.holdingsSyncPromise) return this.holdingsSyncPromise;
    this.holdingsSyncPromise = this.fetchDatasetText(MF_PORTFOLIO_HOLDINGS_URL, false)
      .then((csv) => this.mfDb.replacePortfolioHoldingsFromCsv(csv))
      .finally(() => {
        this.holdingsSyncPromise = null;
      });
    return this.holdingsSyncPromise;
  }

  public async syncSchemeDetails(): Promise<number> {
    if (this.schemeDetailsSyncPromise) return this.schemeDetailsSyncPromise;
    this.schemeDetailsSyncPromise = this.fetchDatasetText(MF_SCHEME_DETAILS_URL, true)
      .then((csv) => this.mfDb.replaceSchemeDetailsFromCsv(csv))
      .finally(() => {
        this.schemeDetailsSyncPromise = null;
      });
    return this.schemeDetailsSyncPromise;
  }

  public async ensureHoldingsReady(): Promise<void> {
    const tasks: Array<Promise<unknown>> = [];
    if (this.mfDb.isPortfolioHoldingsEmpty() || this.holdingsSyncPromise) {
      tasks.push(this.syncPortfolioHoldings().catch(() => 0));
    }
    if (this.mfDb.isSchemeDetailsEmpty() || this.schemeDetailsSyncPromise) {
      tasks.push(this.syncSchemeDetails().catch(() => 0));
    }
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }

  public async warmupEmptyDatasets(): Promise<AmfiSyncAudit> {
    const start = Date.now();
    if (this.mfDb.isTerminalCatalogEmpty()) {
      this.mfDb.seedFromScreenerUniverse();
    }
    await this.ensureHoldingsReady();
    const stats = this.mfDb.getTerminalStats();
    const audit: AmfiSyncAudit = {
      status: 'synced',
      parsedCount: stats.totalSchemes,
      activeCount: stats.activeSchemes,
      etfCount: stats.etfCount,
      durationMs: Date.now() - start,
      syncedAtUtc: new Date().toISOString(),
      source: 'sqlite-seed',
    };
    this.lastAudit = audit;
    return audit;
  }

  /**
   * Synchronizes the official AMFI NAVAll.txt feed into SQLite with timeout and gateway cache invalidation.
   */
  public async syncAmfiNavAll(): Promise<AmfiSyncAudit> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch('https://www.amfiindia.com/spages/NAVAll.txt', {
        signal: controller.signal,
        headers: { Accept: 'text/plain', 'User-Agent': 'Financia-Gateway/2.0' },
      });
      if (!response.ok) {
        throw new Error(`AMFI NAVAll upstream returned HTTP ${response.status}`);
      }
      const rawText = await response.text();
      const parsed = parseAmfiNavText(rawText);
      if (parsed.length > 0) {
        this.mfDb.upsertTerminalSchemes(parsed);
        marketApiGateway.invalidatePrefix('amfi:');
        const nowUtc = new Date().toISOString();
        marketApiGateway.recordAmfiSync(nowUtc);
        const etfCount = parsed.filter((r) => r.instrument_type === 'ETF').length;
        const audit: AmfiSyncAudit = {
          status: 'synced',
          parsedCount: parsed.length,
          activeCount: parsed.length,
          etfCount,
          durationMs: Date.now() - start,
          syncedAtUtc: nowUtc,
          source: 'amfi-navall-live',
        };
        this.lastAudit = audit;
        return audit;
      }
      throw new Error('Parsed 0 valid AMFI rows.');
    } catch {
      const fallbackStats = this.mfDb.getTerminalStats();
      const audit: AmfiSyncAudit = {
        status: 'fallback',
        parsedCount: fallbackStats.totalSchemes,
        activeCount: fallbackStats.activeSchemes,
        etfCount: fallbackStats.etfCount,
        durationMs: Date.now() - start,
        syncedAtUtc: new Date().toISOString(),
        source: 'sqlite-cached-catalog',
      };
      this.lastAudit = audit;
      return audit;
    } finally {
      clearTimeout(timer);
    }
  }
}
