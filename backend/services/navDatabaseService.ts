import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export type NavDatabaseMode = 'external' | 'dev-seeded' | 'unconfigured';

export interface NavDatabaseConfig {
  mode: NavDatabaseMode;
  dbPath: string | null;
  sqlSeedPath: string | null;
  shouldSeedFromSql: boolean;
}

export interface NavDatabaseInitOptions {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  sqlSeedPath?: string;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

export interface NavMasterRow {
  scheme_code: number;
  date: string;
  nav: number;
  scheme_name: string;
  isin: string | null;
  source: string;
}

export interface NavMasterSchemeSummary {
  scheme_code: number;
  scheme_name: string;
  isin: string | null;
  source: string;
  latest_date: string;
  latest_nav: number;
  earliest_date: string;
  observation_count: number;
}

export interface NavMasterSchemeDetail extends NavMasterSchemeSummary {
  previous_date: string | null;
  previous_nav: number | null;
  day_change: number | null;
  day_change_pct: number | null;
  inception_nav: number;
  total_return_pct: number | null;
  cagr_1y_pct: number | null;
  max_drawdown_pct: number | null;
  annualized_volatility_pct: number | null;
}

export interface NavMasterHistoryPoint {
  nav_date: string;
  nav: number;
  day_change_pct: number | null;
}

export interface NavMasterHistoryResult {
  scheme_code: number;
  scheme_name: string;
  isin: string | null;
  source: string;
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
  data: NavMasterHistoryPoint[];
}

export interface NavDatabaseStatus {
  connected: boolean;
  mode: NavDatabaseMode;
  dbPath: string | null;
  seededFromSql: boolean;
  totalRows: number;
  distinctSchemes: number;
  earliestDate: string | null;
  latestDate: string | null;
  sources: string[];
}

const DEFAULT_DEV_DB_FILENAME = 'amfi_nav_dev.db';
const DEFAULT_SQL_CANDIDATES = [
  'amfi_nav_dev.sql',
  path.join('public', 'assets', 'aistudio', 'amfi_nav_dev_f20a04b6.sql'),
];

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function findExistingSqlSeedPath(cwd: string, explicitSeedPath?: string): string | null {
  if (explicitSeedPath) {
    const resolved = path.resolve(cwd, explicitSeedPath);
    if (fs.existsSync(resolved)) return resolved;
    return null;
  }

  for (const relativeCandidate of DEFAULT_SQL_CANDIDATES) {
    const resolved = path.resolve(cwd, relativeCandidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  return null;
}

/**
 * Resolves the SQLite database connection strategy:
 * 1. If `DATABASE_PATH` is set, connect directly to that existing SQLite `.db` file.
 * 2. Otherwise, in development (`NODE_ENV !== 'production'`), create `./amfi_nav_dev.db`
 *    on startup and execute `amfi_nav_dev.sql` to populate `nav_master`.
 * 3. In production without `DATABASE_PATH`, connect to `./amfi_nav_dev.db` only if it
 *    already exists; otherwise remain cleanly unconfigured without overwriting data.
 */
export function resolveNavDatabaseConfig(options: {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  sqlSeedPath?: string;
} = {}): NavDatabaseConfig {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const rawDbPath = typeof env.DATABASE_PATH === 'string' ? env.DATABASE_PATH.trim() : '';

  if (rawDbPath.length > 0) {
    return {
      mode: 'external',
      dbPath: path.resolve(cwd, rawDbPath),
      sqlSeedPath: null,
      shouldSeedFromSql: false,
    };
  }

  const nodeEnv = String(env.NODE_ENV || 'development').trim().toLowerCase();
  const devDbPath = path.resolve(cwd, DEFAULT_DEV_DB_FILENAME);

  if (nodeEnv !== 'production') {
    return {
      mode: 'dev-seeded',
      dbPath: devDbPath,
      sqlSeedPath: findExistingSqlSeedPath(cwd, options.sqlSeedPath),
      shouldSeedFromSql: true,
    };
  }

  if (fs.existsSync(devDbPath)) {
    return {
      mode: 'external',
      dbPath: devDbPath,
      sqlSeedPath: null,
      shouldSeedFromSql: false,
    };
  }

  return {
    mode: 'unconfigured',
    dbPath: null,
    sqlSeedPath: null,
    shouldSeedFromSql: false,
  };
}

export function computeNavMetricsFromSeries(
  chronologicalRows: Array<{ date: string; nav: number }>
): {
  previousDate: string | null;
  previousNav: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  inceptionNav: number;
  totalReturnPct: number | null;
  cagr1yPct: number | null;
  maxDrawdownPct: number | null;
  annualizedVolatilityPct: number | null;
} {
  if (chronologicalRows.length === 0) {
    return {
      previousDate: null,
      previousNav: null,
      dayChange: null,
      dayChangePct: null,
      inceptionNav: 0,
      totalReturnPct: null,
      cagr1yPct: null,
      maxDrawdownPct: null,
      annualizedVolatilityPct: null,
    };
  }

  const first = chronologicalRows[0];
  const latest = chronologicalRows[chronologicalRows.length - 1];
  const previous = chronologicalRows.length >= 2 ? chronologicalRows[chronologicalRows.length - 2] : null;

  const dayChange =
    previous && Number.isFinite(previous.nav)
      ? roundTo(latest.nav - previous.nav, 4)
      : null;
  const dayChangePct =
    previous && previous.nav > 0
      ? roundTo(((latest.nav - previous.nav) / previous.nav) * 100, 4)
      : null;

  const totalReturnPct =
    first.nav > 0
      ? roundTo(((latest.nav - first.nav) / first.nav) * 100, 2)
      : null;

  // Compute 1Y annualized CAGR only when real observation window spans >= 300 calendar days
  let cagr1yPct: number | null = null;
  const firstMs = Date.parse(`${first.date}T00:00:00Z`);
  const latestMs = Date.parse(`${latest.date}T00:00:00Z`);
  if (Number.isFinite(firstMs) && Number.isFinite(latestMs) && latestMs > firstMs && first.nav > 0) {
    const calendarDays = (latestMs - firstMs) / (1000 * 60 * 60 * 24);
    if (calendarDays >= 300) {
      const years = calendarDays / 365.25;
      const ratio = latest.nav / first.nav;
      if (ratio > 0) {
        cagr1yPct = roundTo((Math.pow(ratio, 1 / years) - 1) * 100, 2);
      }
    }
  }

  // Max peak-to-trough drawdown across real NAV series
  let peak = chronologicalRows[0].nav;
  let maxDrawdown = 0;
  for (const row of chronologicalRows) {
    if (row.nav > peak) peak = row.nav;
    if (peak > 0) {
      const dd = ((row.nav - peak) / peak) * 100;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }
  }
  const maxDrawdownPct = chronologicalRows.length >= 2 ? roundTo(maxDrawdown, 2) : null;

  // Annualized daily return volatility (sqrt(252) * sample stdev) when >= 10 daily returns exist
  let annualizedVolatilityPct: number | null = null;
  const dailyReturns: number[] = [];
  for (let i = 1; i < chronologicalRows.length; i += 1) {
    const prevNav = chronologicalRows[i - 1].nav;
    const currNav = chronologicalRows[i].nav;
    if (prevNav > 0 && Number.isFinite(currNav)) {
      dailyReturns.push((currNav - prevNav) / prevNav);
    }
  }
  if (dailyReturns.length >= 10) {
    const mean = dailyReturns.reduce((acc, r) => acc + r, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
    annualizedVolatilityPct = roundTo(Math.sqrt(variance) * Math.sqrt(252) * 100, 2);
  }

  return {
    previousDate: previous ? previous.date : null,
    previousNav: previous ? previous.nav : null,
    dayChange,
    dayChangePct,
    inceptionNav: first.nav,
    totalReturnPct,
    cagr1yPct,
    maxDrawdownPct,
    annualizedVolatilityPct,
  };
}

export class NavDatabaseService {
  private db: Database.Database | null = null;
  private readonly config: NavDatabaseConfig;
  private seededFromSql = false;

  constructor(options: NavDatabaseInitOptions = {}) {
    const logger = options.logger ?? console;
    this.config = resolveNavDatabaseConfig(options);

    if (this.config.mode === 'unconfigured' || !this.config.dbPath) {
      logger.warn(
        '[navDatabase] DATABASE_PATH is not set in production and no local amfi_nav_dev.db was found.'
      );
      return;
    }

    if (this.config.mode === 'external') {
      if (!fs.existsSync(this.config.dbPath)) {
        throw new Error(
          `DATABASE_PATH points to a SQLite database file that does not exist: ${this.config.dbPath}`
        );
      }
      this.db = new Database(this.config.dbPath, { fileMustExist: true });
      const status = this.getStatus();
      logger.info(
        `[navDatabase] Connected directly to existing SQLite DB at ${this.config.dbPath} (${status.totalRows} rows across ${status.distinctSchemes} schemes).`
      );
      return;
    }

    // Development mode: create ./amfi_nav_dev.db on startup and execute amfi_nav_dev.sql if nav_master is missing or empty
    const parentDir = path.dirname(this.config.dbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    this.db = new Database(this.config.dbPath);
    const hasTable = this.hasNavMasterTable();
    const existingCount = hasTable ? this.countNavMasterRows() : 0;

    if (!hasTable || existingCount === 0) {
      if (!this.config.sqlSeedPath || !fs.existsSync(this.config.sqlSeedPath)) {
        throw new Error(
          `Cannot seed development SQLite DB (${this.config.dbPath}): amfi_nav_dev.sql not found.`
        );
      }
      const sqlScript = fs.readFileSync(this.config.sqlSeedPath, 'utf-8');
      if (hasTable && existingCount === 0) {
        this.db.exec('DROP TABLE IF EXISTS nav_master;');
      }
      this.db.exec(sqlScript);
      this.seededFromSql = true;
      const status = this.getStatus();
      logger.info(
        `[navDatabase] Initialized dev SQLite DB at ${this.config.dbPath} from ${path.basename(
          this.config.sqlSeedPath
        )} (${status.totalRows} rows across ${status.distinctSchemes} schemes).`
      );
    } else {
      const status = this.getStatus();
      logger.info(
        `[navDatabase] Reusing existing dev SQLite DB at ${this.config.dbPath} (${status.totalRows} rows across ${status.distinctSchemes} schemes).`
      );
    }
  }

  private hasNavMasterTable(): boolean {
    if (!this.db) return false;
    const row = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'nav_master'")
      .get() as { name?: string } | undefined;
    return Boolean(row?.name);
  }

  private countNavMasterRows(): number {
    if (!this.db) return 0;
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM nav_master').get() as
      | { cnt: number }
      | undefined;
    return row?.cnt ?? 0;
  }

  public isConnected(): boolean {
    return this.db !== null && this.hasNavMasterTable();
  }

  public getStatus(): NavDatabaseStatus {
    if (!this.db || !this.hasNavMasterTable()) {
      return {
        connected: false,
        mode: this.config.mode,
        dbPath: this.config.dbPath,
        seededFromSql: this.seededFromSql,
        totalRows: 0,
        distinctSchemes: 0,
        earliestDate: null,
        latestDate: null,
        sources: [],
      };
    }

    const stats = this.db
      .prepare(
        `SELECT
          COUNT(*) AS totalRows,
          COUNT(DISTINCT scheme_code) AS distinctSchemes,
          MIN(date) AS earliestDate,
          MAX(date) AS latestDate
         FROM nav_master`
      )
      .get() as {
      totalRows: number;
      distinctSchemes: number;
      earliestDate: string | null;
      latestDate: string | null;
    };

    const sourceRows = this.db
      .prepare('SELECT DISTINCT "source" AS source FROM nav_master WHERE "source" IS NOT NULL ORDER BY "source"')
      .all() as Array<{ source: string }>;

    return {
      connected: true,
      mode: this.config.mode,
      dbPath: this.config.dbPath,
      seededFromSql: this.seededFromSql,
      totalRows: stats?.totalRows ?? 0,
      distinctSchemes: stats?.distinctSchemes ?? 0,
      earliestDate: stats?.earliestDate ?? null,
      latestDate: stats?.latestDate ?? null,
      sources: sourceRows.map((r) => r.source),
    };
  }

  public listSchemes(limit = 50, offset = 0): NavMasterSchemeSummary[] {
    if (!this.db || !this.hasNavMasterTable()) return [];
    const safeLimit = Math.min(250, Math.max(1, Math.floor(limit)));
    const safeOffset = Math.max(0, Math.floor(offset));

    const rows = this.db
      .prepare(
        `WITH agg AS (
           SELECT
             scheme_code,
             MIN(date) AS earliest_date,
             MAX(date) AS latest_date,
             COUNT(*) AS observation_count
           FROM nav_master
           GROUP BY scheme_code
         )
         SELECT
           n.scheme_code,
           n.scheme_name,
           n.isin,
           n."source" AS source,
           a.latest_date,
           n.nav AS latest_nav,
           a.earliest_date,
           a.observation_count
         FROM agg a
         JOIN nav_master n
           ON n.scheme_code = a.scheme_code AND n.date = a.latest_date
         ORDER BY n.scheme_code ASC
         LIMIT ? OFFSET ?`
      )
      .all(safeLimit, safeOffset) as NavMasterSchemeSummary[];

    return rows;
  }

  public searchSchemes(query: string, limit = 25): NavMasterSchemeSummary[] {
    if (!this.db || !this.hasNavMasterTable()) return [];
    const trimmed = query.trim();
    if (!trimmed) {
      return this.listSchemes(limit, 0);
    }

    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const likePattern = `%${trimmed.toLowerCase()}%`;
    const numericCode = /^\d+$/.test(trimmed) ? Number(trimmed) : -1;

    const rows = this.db
      .prepare(
        `WITH matched_codes AS (
           SELECT DISTINCT scheme_code
           FROM nav_master
           WHERE scheme_code = ?
              OR LOWER(scheme_name) LIKE ?
              OR LOWER(COALESCE(isin, '')) LIKE ?
         ),
         agg AS (
           SELECT
             n.scheme_code,
             MIN(n.date) AS earliest_date,
             MAX(n.date) AS latest_date,
             COUNT(*) AS observation_count
           FROM nav_master n
           JOIN matched_codes m ON m.scheme_code = n.scheme_code
           GROUP BY n.scheme_code
         )
         SELECT
           n.scheme_code,
           n.scheme_name,
           n.isin,
           n."source" AS source,
           a.latest_date,
           n.nav AS latest_nav,
           a.earliest_date,
           a.observation_count
         FROM agg a
         JOIN nav_master n
           ON n.scheme_code = a.scheme_code AND n.date = a.latest_date
         ORDER BY
           CASE WHEN n.scheme_code = ? THEN 0 ELSE 1 END,
           n.scheme_code ASC
         LIMIT ?`
      )
      .all(numericCode, likePattern, likePattern, numericCode, safeLimit) as NavMasterSchemeSummary[];

    return rows;
  }

  private resolveSchemeCode(codeOrIsin: string): number | null {
    if (!this.db || !this.hasNavMasterTable()) return null;
    const key = codeOrIsin.trim();
    if (!key) return null;

    if (/^\d+$/.test(key)) {
      const code = Number(key);
      const exists = this.db
        .prepare('SELECT scheme_code FROM nav_master WHERE scheme_code = ? LIMIT 1')
        .get(code) as { scheme_code?: number } | undefined;
      return exists?.scheme_code ?? null;
    }

    const byIsin = this.db
      .prepare('SELECT scheme_code FROM nav_master WHERE UPPER(isin) = UPPER(?) LIMIT 1')
      .get(key) as { scheme_code?: number } | undefined;
    return byIsin?.scheme_code ?? null;
  }

  public getSchemeDetail(codeOrIsin: string): NavMasterSchemeDetail | null {
    if (!this.db || !this.hasNavMasterTable()) return null;
    const schemeCode = this.resolveSchemeCode(codeOrIsin);
    if (schemeCode === null) return null;

    const rows = this.db
      .prepare(
        `SELECT scheme_code, date, nav, scheme_name, isin, "source" AS source
         FROM nav_master
         WHERE scheme_code = ?
         ORDER BY date ASC`
      )
      .all(schemeCode) as NavMasterRow[];

    if (rows.length === 0) return null;

    const latest = rows[rows.length - 1];
    const earliest = rows[0];
    const metrics = computeNavMetricsFromSeries(rows);

    return {
      scheme_code: latest.scheme_code,
      scheme_name: latest.scheme_name,
      isin: latest.isin,
      source: latest.source,
      latest_date: latest.date,
      latest_nav: latest.nav,
      earliest_date: earliest.date,
      observation_count: rows.length,
      previous_date: metrics.previousDate,
      previous_nav: metrics.previousNav,
      day_change: metrics.dayChange,
      day_change_pct: metrics.dayChangePct,
      inception_nav: metrics.inceptionNav,
      total_return_pct: metrics.totalReturnPct,
      cagr_1y_pct: metrics.cagr1yPct,
      max_drawdown_pct: metrics.maxDrawdownPct,
      annualized_volatility_pct: metrics.annualizedVolatilityPct,
    };
  }

  public getSchemeHistory(
    codeOrIsin: string,
    options: {
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): NavMasterHistoryResult | null {
    if (!this.db || !this.hasNavMasterTable()) return null;
    const schemeCode = this.resolveSchemeCode(codeOrIsin);
    if (schemeCode === null) return null;

    const allRows = this.db
      .prepare(
        `SELECT scheme_code, date, nav, scheme_name, isin, "source" AS source
         FROM nav_master
         WHERE scheme_code = ?
         ORDER BY date ASC`
      )
      .all(schemeCode) as NavMasterRow[];

    if (allRows.length === 0) return null;

    const enrichedAsc: NavMasterHistoryPoint[] = allRows.map((row, idx) => {
      const prev = idx > 0 ? allRows[idx - 1] : null;
      const dayChangePct =
        prev && prev.nav > 0 ? roundTo(((row.nav - prev.nav) / prev.nav) * 100, 4) : null;
      return {
        nav_date: row.date,
        nav: row.nav,
        day_change_pct: dayChangePct,
      };
    });

    const filteredAsc = enrichedAsc.filter((pt) => {
      if (options.startDate && pt.nav_date < options.startDate) return false;
      if (options.endDate && pt.nav_date > options.endDate) return false;
      return true;
    });

    const descending = [...filteredAsc].reverse();
    const page = Math.max(1, Math.floor(options.page || 1));
    const pageSize = Math.min(500, Math.max(1, Math.floor(options.pageSize || 30)));
    const startIdx = (page - 1) * pageSize;
    const paged = descending.slice(startIdx, startIdx + pageSize);
    const meta = allRows[allRows.length - 1];

    return {
      scheme_code: meta.scheme_code,
      scheme_name: meta.scheme_name,
      isin: meta.isin,
      source: meta.source,
      total: descending.length,
      page,
      page_size: pageSize,
      has_more: startIdx + pageSize < descending.length,
      data: paged,
    };
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

let sharedNavDatabase: NavDatabaseService | null = null;

export function initNavDatabase(options?: NavDatabaseInitOptions): NavDatabaseService {
  if (!sharedNavDatabase) {
    sharedNavDatabase = new NavDatabaseService(options);
  }
  return sharedNavDatabase;
}

export function getNavDatabase(): NavDatabaseService | null {
  return sharedNavDatabase;
}

export function closeNavDatabase(): void {
  if (sharedNavDatabase) {
    sharedNavDatabase.close();
    sharedNavDatabase = null;
  }
}
