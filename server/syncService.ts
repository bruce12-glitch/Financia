import zlib from 'zlib';
import {
  CatalogDatasetDefinition,
  isAllowedDatasetUrl,
  MFPRO_DATASETS,
} from './catalog.ts';
import { FinanciaMutualFundDatabase } from './database.ts';

export interface SyncDatasetResult {
  datasetId: string;
  tableName: string;
  status: 'success' | 'error' | 'skipped';
  rowsIngested: number;
  durationMs: number;
  error?: string;
}

export class DatasetSyncService {
  private readonly db: FinanciaMutualFundDatabase;
  private readonly inFlight = new Map<string, Promise<SyncDatasetResult>>();

  constructor(db: FinanciaMutualFundDatabase) {
    this.db = db;
  }

  public getDatasetDef(datasetId: string): CatalogDatasetDefinition | undefined {
    return MFPRO_DATASETS.find((d) => d.id === datasetId);
  }

  public async syncDataset(datasetId: string): Promise<SyncDatasetResult> {
    const existing = this.inFlight.get(datasetId);
    if (existing) return existing;

    const task = this.executeSync(datasetId).finally(() => {
      this.inFlight.delete(datasetId);
    });
    this.inFlight.set(datasetId, task);
    return task;
  }

  private async executeSync(datasetId: string): Promise<SyncDatasetResult> {
    const def = this.getDatasetDef(datasetId);
    if (!def) {
      throw new Error(`Unknown dataset ID: ${datasetId}`);
    }
    if (def.ingestionMode !== 'sqlite') {
      return {
        datasetId: def.id,
        tableName: def.tableName,
        status: 'skipped',
        rowsIngested: 0,
        durationMs: 0,
        error: 'Large Parquet archive is configured for in-place HTTP Range queries rather than full SQLite mirror.',
      };
    }
    if (!isAllowedDatasetUrl(def.primaryIngestUrl)) {
      throw new Error(`Blocked upstream dataset URL outside allowlist: ${def.primaryIngestUrl}`);
    }

    const started = performance.now();
    const runId = this.db.recordSyncStart(def.id, def.tableName, def.primaryIngestUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(def.primaryIngestUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Financia-DB-Engine/1.0',
          Accept: 'text/csv, application/gzip, */*',
        },
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        throw new Error(`Upstream HTTP ${res.status} ${res.statusText}`);
      }

      const arrayBuf = await res.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuf);
      const csvText =
        def.primaryIngestFormat === 'csv.gz'
          ? zlib.gunzipSync(rawBuffer).toString('utf8')
          : rawBuffer.toString('utf8');

      let rowsIngested = 0;
      switch (def.id) {
        case 'mf.portfolio_holdings':
          rowsIngested = this.db.replacePortfolioHoldingsFromCsv(csvText);
          break;
        case 'mf.portfolio_isin_mappings':
          rowsIngested = this.db.replaceIsinMappingsFromCsv(csvText);
          break;
        case 'mf.nav_latest':
          rowsIngested = this.db.replaceSchemeUniverseFromCsv(csvText);
          break;
        case 'mf.scheme_details_latest':
          rowsIngested = this.db.replaceSchemeDetailsFromCsv(csvText);
          break;
        case 'mf.data_quality':
          rowsIngested = this.db.replaceDataQualityFromCsv(csvText);
          break;
        case 'mf.fund_aum_quality':
          rowsIngested = this.db.replaceFundAumQualityFromCsv(csvText);
          break;
        default:
          throw new Error(`No SQLite ingestor registered for ${def.id}`);
      }

      const durationMs = Math.round(performance.now() - started);
      this.db.recordSyncSuccess(runId, def.id, rowsIngested, durationMs);
      return {
        datasetId: def.id,
        tableName: def.tableName,
        status: 'success',
        rowsIngested,
        durationMs,
      };
    } catch (err) {
      const durationMs = Math.round(performance.now() - started);
      const message = err instanceof Error ? err.message : 'Unknown ingestion failure';
      this.db.recordSyncError(runId, def.id, message, durationMs);
      return {
        datasetId: def.id,
        tableName: def.tableName,
        status: 'error',
        rowsIngested: 0,
        durationMs,
        error: message,
      };
    }
  }

  public async syncAllSqliteDatasets(): Promise<SyncDatasetResult[]> {
    const targets = MFPRO_DATASETS.filter((d) => d.ingestionMode === 'sqlite');
    const results: SyncDatasetResult[] = [];
    for (const def of targets) {
      const result = await this.syncDataset(def.id);
      results.push(result);
    }
    return results;
  }

  public async warmupEmptyDatasets(): Promise<void> {
    const targets = MFPRO_DATASETS.filter(
      (d) => d.ingestionMode === 'sqlite' && this.db.isTableEmpty(d.tableName)
    );
    if (targets.length === 0) return;
    console.log(`[Financia DB] Auto-syncing ${targets.length} empty MFPRO tables from api.tigzig.com...`);
    for (const def of targets) {
      const res = await this.syncDataset(def.id);
      if (res.status === 'success') {
        console.log(`[Financia DB] Synced ${def.id} -> ${res.rowsIngested} rows in ${res.durationMs}ms`);
      } else {
        console.warn(`[Financia DB] Sync warning for ${def.id}: ${res.error}`);
      }
    }
  }

  /**
   * Executes a live HTTP Range request (`Range: bytes=-8`) against an allowlisted
   * Parquet endpoint on api.tigzig.com to verify Parquet magic footer (`PAR1`),
   * total byte length, and live rate-limit headers.
   */
  public async probeParquetRange(datasetId: string) {
    const def = this.getDatasetDef(datasetId);
    if (!def || !def.parquetUrl) {
      throw new Error(`Dataset ${datasetId} does not expose a Parquet endpoint.`);
    }
    if (!isAllowedDatasetUrl(def.parquetUrl)) {
      throw new Error(`Blocked Parquet URL outside allowlist: ${def.parquetUrl}`);
    }

    const started = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(def.parquetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Range: 'bytes=-8',
        'User-Agent': 'Financia-DB-Engine/1.0',
      },
    }).finally(() => clearTimeout(timeout));

    const buf = Buffer.from(await res.arrayBuffer());
    const footerMagic = buf.subarray(Math.max(0, buf.length - 4)).toString('ascii');
    const footerLengthBytes = buf.length >= 8 ? buf.readUInt32LE(0) : null;
    const durationMs = Math.round(performance.now() - started);

    const payload = {
      datasetId: def.id,
      url: def.parquetUrl,
      httpStatus: res.status,
      supportsRangeRequests: res.status === 206,
      validParquetMagic: footerMagic === 'PAR1',
      footerMagic,
      footerLengthBytes,
      contentRange: res.headers.get('content-range'),
      etag: res.headers.get('etag'),
      lastModified: res.headers.get('last-modified'),
      rateLimitRemaining: res.headers.get('x-ratelimit-remaining'),
      rateLimitRemainingDay: res.headers.get('x-ratelimit-remaining-day'),
      latencyMs: durationMs,
      checkedAt: new Date().toISOString(),
    };

    this.db.saveParquetProbe(def.id, payload);
    return payload;
  }
}
