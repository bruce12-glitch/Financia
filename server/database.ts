import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import {
  MFPRO_DATASETS,
  SEED_AMFI_INTERVAL_FEED,
} from './catalog.ts';
import {
  classifyAmfiRecord,
  parseAmfiNavText,
  parseBoolFlag,
  parseCsvRows,
  parseNullableFloat,
  parseNullableInt,
  ParsedAmfiNavRecord,
  validateReadOnlySql,
} from './parsers.ts';

export interface SyncRunRecord {
  id: number;
  dataset_id: string;
  table_name: string;
  status: 'success' | 'error' | 'running';
  rows_ingested: number;
  duration_ms: number;
  source_url: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface TableStat {
  tableName: string;
  label: string;
  datasetId: string;
  rowCount: number;
  kind: 'table' | 'view';
}

export interface SchemeQueryParams {
  q?: string;
  amc?: string;
  category?: string;
  plan?: string;
  source?: string;
  activeOnly?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface HoldingsQueryParams {
  fundCode?: string;
  category?: string;
  monthEnd?: string;
  assetGroup?: string;
  q?: string;
  aggregated?: boolean;
  limit?: number;
  offset?: number;
}

export interface QualityQueryParams {
  tab?: 'scheme_conflicts' | 'aum_anomalies';
  status?: string;
  code?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

const ALLOWED_SCHEME_SORT: Record<string, string> = {
  scheme_name: 'u.scheme_name',
  amc: 'u.amc',
  nav: 'u.nav',
  nav_date: 'u.nav_date',
  aum: 'COALESCE(d.amfi_daily_fund_aum_cr_all_plans, u.aaum_cr_quarterly_avg, 0)',
  ter_direct: 'COALESCE(d.ter_direct, 999)',
  ter_regular: 'COALESCE(d.ter_regular, 999)',
};

const ALLOWED_TERMINAL_SORT: Record<string, string> = {
  aum: 'COALESCE(d.amfi_daily_fund_aum_cr_all_plans, 0)',
  nav: 'c.nav',
  scheme_name: 'c.scheme_name',
  nav_date: 'c.nav_date',
  ter_direct: 'COALESCE(d.ter_direct, 999)',
};

export interface TerminalAutocompleteParams {
  q?: string;
  instrumentType?: string;
  assetClass?: string;
  activeOnly?: boolean;
  limit?: number;
}

export interface TerminalScreenerParams {
  q?: string;
  instrumentType?: string;
  assetClass?: string;
  subCategory?: string;
  amc?: string;
  activeOnly?: boolean;
  excludeSegregated?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class FinanciaMutualFundDatabase {
  public readonly dbPath: string;
  private db: Database.Database;
  private roDb: Database.Database | null = null;

  constructor(dbPath?: string) {
    const resolved =
      dbPath ||
      process.env.FINANCIA_MF_DB_PATH ||
      path.resolve(process.cwd(), 'data', 'financia_mf.db');

    this.dbPath = resolved;
    if (resolved !== ':memory:') {
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(resolved);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('synchronous = NORMAL');

    this.initSchema();
    this.seedCatalogMetadata();
    this.ensureSeedAmfiIntervalFeed();

    if (resolved !== ':memory:') {
      this.roDb = new Database(resolved, { readonly: true, fileMustExist: true });
      this.roDb.pragma('query_only = ON');
      this.roDb.pragma('busy_timeout = 3000');
    }
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dataset_catalog (
        dataset_id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        ingestion_mode TEXT NOT NULL,
        data_as_of TEXT,
        update_cadence TEXT,
        catalog_row_count INTEGER DEFAULT 0,
        local_row_count INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        last_synced_at TEXT,
        last_error TEXT,
        parquet_probe_json TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        status TEXT NOT NULL,
        rows_ingested INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        source_url TEXT NOT NULL,
        error_message TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS scheme_universe (
        scheme_code TEXT PRIMARY KEY,
        isin TEXT,
        isin2 TEXT,
        scheme_name TEXT NOT NULL,
        amc TEXT,
        scheme_type TEXT,
        category TEXT,
        category_sub TEXT,
        category_group_clean TEXT,
        scheme_plan TEXT,
        scheme_option TEXT,
        first_date TEXT,
        last_date TEXT,
        is_active INTEGER DEFAULT 0,
        is_stale INTEGER DEFAULT 0,
        aaum_cr_quarterly_avg REAL,
        nav_date TEXT,
        nav REAL,
        source TEXT DEFAULT 'MF'
      );

      CREATE INDEX IF NOT EXISTS idx_scheme_universe_amc ON scheme_universe(amc);
      CREATE INDEX IF NOT EXISTS idx_scheme_universe_cat ON scheme_universe(category_group_clean);
      CREATE INDEX IF NOT EXISTS idx_scheme_universe_active ON scheme_universe(is_active);
      CREATE INDEX IF NOT EXISTS idx_scheme_universe_isin ON scheme_universe(isin);
      CREATE INDEX IF NOT EXISTS idx_scheme_universe_name ON scheme_universe(scheme_name);

      CREATE TABLE IF NOT EXISTS scheme_details (
        scheme_code TEXT PRIMARY KEY,
        isin TEXT,
        scheme_name TEXT,
        fund_name_latest TEXT,
        amc TEXT,
        category_group_clean TEXT,
        category_sub TEXT,
        scheme_plan TEXT,
        is_active INTEGER DEFAULT 0,
        amfi_ssd_fund_id TEXT,
        fund_dedup_flag INTEGER DEFAULT 0,
        amfi_daily_fund_name TEXT,
        amfi_daily_fund_aum_cr_all_plans REAL,
        amfi_daily_aum_date TEXT,
        amfi_daily_riskometer TEXT,
        amfi_daily_benchmark TEXT,
        ssd_fund_managers TEXT,
        ssd_allotment_date TEXT,
        ssd_exit_load TEXT,
        ssd_objective TEXT,
        ter_date TEXT,
        ter_regular REAL,
        ter_direct REAL,
        source TEXT DEFAULT 'MF'
      );

      CREATE INDEX IF NOT EXISTS idx_scheme_details_ssd_id ON scheme_details(amfi_ssd_fund_id);
      CREATE INDEX IF NOT EXISTS idx_scheme_details_dedup ON scheme_details(fund_dedup_flag);
      CREATE INDEX IF NOT EXISTS idx_scheme_details_amc ON scheme_details(amc);
      CREATE INDEX IF NOT EXISTS idx_scheme_details_risk ON scheme_details(amfi_daily_riskometer);

      CREATE TABLE IF NOT EXISTS portfolio_holdings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fund_code TEXT NOT NULL,
        fund_name TEXT NOT NULL,
        fund_category TEXT,
        month_end TEXT NOT NULL,
        isin TEXT NOT NULL,
        security_name TEXT NOT NULL,
        nse_symbol TEXT,
        market_value_lakh REAL NOT NULL DEFAULT 0,
        quantity REAL DEFAULT 0,
        pct_of_fund REAL DEFAULT 0,
        asset_group TEXT,
        asset_subgroup TEXT,
        mapping_category TEXT,
        mapping_reason TEXT,
        isin_as_filed TEXT,
        instrument_name_as_filed TEXT,
        amfi_ssd_fund_id TEXT,
        isin_type TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_holdings_fund_month ON portfolio_holdings(fund_code, month_end);
      CREATE INDEX IF NOT EXISTS idx_holdings_isin ON portfolio_holdings(isin);
      CREATE INDEX IF NOT EXISTS idx_holdings_nse ON portfolio_holdings(nse_symbol);
      CREATE INDEX IF NOT EXISTS idx_holdings_asset_group ON portfolio_holdings(asset_group);
      CREATE INDEX IF NOT EXISTS idx_holdings_ssd_id ON portfolio_holdings(amfi_ssd_fund_id);

      CREATE TABLE IF NOT EXISTS portfolio_isin_mappings (
        isin_as_filed TEXT PRIMARY KEY,
        isin TEXT NOT NULL,
        security_name TEXT NOT NULL,
        mapping_category TEXT NOT NULL,
        mapping_reason TEXT,
        first_month TEXT,
        last_month TEXT,
        funds INTEGER DEFAULT 0,
        rows INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_isin_mappings_target ON portfolio_isin_mappings(isin);
      CREATE INDEX IF NOT EXISTS idx_isin_mappings_cat ON portfolio_isin_mappings(mapping_category);

      CREATE TABLE IF NOT EXISTS amfi_nav_records (
        scheme_code TEXT NOT NULL,
        nav_date TEXT NOT NULL,
        nav REAL NOT NULL,
        scheme_name TEXT NOT NULL,
        isin_div_payout_growth TEXT,
        isin_div_reinvestment TEXT,
        amc TEXT,
        scheme_category_header TEXT,
        plan TEXT,
        option_name TEXT,
        source TEXT DEFAULT 'AMFI_FEED',
        ingested_at TEXT NOT NULL,
        PRIMARY KEY (scheme_code, nav_date)
      );

      CREATE INDEX IF NOT EXISTS idx_amfi_nav_amc ON amfi_nav_records(amc);
      CREATE INDEX IF NOT EXISTS idx_amfi_nav_date ON amfi_nav_records(nav_date);
      CREATE INDEX IF NOT EXISTS idx_amfi_nav_isin ON amfi_nav_records(isin_div_payout_growth);

      CREATE TABLE IF NOT EXISTS data_quality_issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT,
        as_of TEXT,
        scheme_code TEXT,
        name TEXT,
        category TEXT,
        issue_code TEXT,
        issue TEXT,
        status TEXT,
        detail TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_dq_status ON data_quality_issues(status);
      CREATE INDEX IF NOT EXISTS idx_dq_code ON data_quality_issues(issue_code);

      CREATE TABLE IF NOT EXISTS fund_aum_quality_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amfi_ssd_fund_id TEXT,
        amfi_fund_name TEXT,
        report_date TEXT,
        aum_cr_as_filed REAL,
        aum_cr REAL,
        quality_code TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_aum_q_code ON fund_aum_quality_notes(quality_code);
      CREATE INDEX IF NOT EXISTS idx_aum_q_fund_id ON fund_aum_quality_notes(amfi_ssd_fund_id);

      CREATE TABLE IF NOT EXISTS fund_terminal_catalog (
        scheme_code TEXT PRIMARY KEY,
        isin TEXT,
        isin2 TEXT,
        invalid_isin_note TEXT,
        scheme_name TEXT NOT NULL,
        amc TEXT NOT NULL,
        raw_category TEXT,
        structure TEXT NOT NULL,
        instrument_type TEXT NOT NULL,
        asset_class TEXT NOT NULL,
        sub_category TEXT NOT NULL,
        plan_raw TEXT,
        option_raw TEXT,
        plan_type TEXT NOT NULL,
        option_type TEXT NOT NULL,
        nav REAL NOT NULL,
        nav_date TEXT NOT NULL,
        is_active INTEGER DEFAULT 0,
        is_segregated INTEGER DEFAULT 0,
        is_zero_nav INTEGER DEFAULT 0,
        is_redeemed_flag INTEGER DEFAULT 0,
        fund_family_key TEXT NOT NULL,
        source_file TEXT,
        processed_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_terminal_name ON fund_terminal_catalog(scheme_name);
      CREATE INDEX IF NOT EXISTS idx_terminal_isin ON fund_terminal_catalog(isin);
      CREATE INDEX IF NOT EXISTS idx_terminal_amc ON fund_terminal_catalog(amc);
      CREATE INDEX IF NOT EXISTS idx_terminal_inst ON fund_terminal_catalog(instrument_type);
      CREATE INDEX IF NOT EXISTS idx_terminal_asset ON fund_terminal_catalog(asset_class);
      CREATE INDEX IF NOT EXISTS idx_terminal_subcat ON fund_terminal_catalog(sub_category);
      CREATE INDEX IF NOT EXISTS idx_terminal_active ON fund_terminal_catalog(is_active);
      CREATE INDEX IF NOT EXISTS idx_terminal_family ON fund_terminal_catalog(fund_family_key);
      CREATE INDEX IF NOT EXISTS idx_terminal_date ON fund_terminal_catalog(nav_date);

      CREATE TABLE IF NOT EXISTS terminal_ingestion_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_file TEXT NOT NULL,
        total_lines INTEGER DEFAULT 0,
        parsed_count INTEGER DEFAULT 0,
        skipped_count INTEGER DEFAULT 0,
        ignored_noise_count INTEGER DEFAULT 0,
        mojibake_fixed INTEGER DEFAULT 0,
        invalid_isin_fixed INTEGER DEFAULT 0,
        inferred_amc_count INTEGER DEFAULT 0,
        active_count INTEGER DEFAULT 0,
        etf_count INTEGER DEFAULT 0,
        index_fund_count INTEGER DEFAULT 0,
        fof_count INTEGER DEFAULT 0,
        mutual_fund_count INTEGER DEFAULT 0,
        segregated_count INTEGER DEFAULT 0,
        zero_nav_count INTEGER DEFAULT 0,
        latest_nav_date TEXT,
        duration_ms INTEGER DEFAULT 0,
        processed_at TEXT NOT NULL
      );

      /* Relational Analytical Views */

      CREATE VIEW IF NOT EXISTS v_fund_holdings_aggregated AS
      SELECT
        fund_code,
        MAX(fund_name) AS fund_name,
        MAX(fund_category) AS fund_category,
        month_end,
        isin,
        MAX(security_name) AS security_name,
        MAX(nse_symbol) AS nse_symbol,
        ROUND(SUM(market_value_lakh), 5) AS market_value_lakh,
        ROUND(SUM(quantity), 4) AS quantity,
        ROUND(SUM(pct_of_fund), 4) AS pct_of_fund,
        MAX(asset_group) AS asset_group,
        MAX(asset_subgroup) AS asset_subgroup,
        MAX(mapping_category) AS mapping_category,
        MAX(mapping_reason) AS mapping_reason,
        MAX(amfi_ssd_fund_id) AS amfi_ssd_fund_id,
        MAX(isin_type) AS isin_type,
        COUNT(*) AS line_count
      FROM portfolio_holdings
      GROUP BY fund_code, month_end, isin;

      CREATE VIEW IF NOT EXISTS v_dedup_fund_aum AS
      SELECT
        amfi_ssd_fund_id,
        MAX(fund_name_latest) AS fund_name,
        MAX(amc) AS amc,
        MAX(category_group_clean) AS category_group,
        MAX(category_sub) AS category_sub,
        MAX(amfi_daily_fund_aum_cr_all_plans) AS fund_aum_cr,
        MAX(amfi_daily_aum_date) AS aum_date,
        MAX(amfi_daily_riskometer) AS riskometer,
        MAX(amfi_daily_benchmark) AS benchmark,
        MAX(ssd_fund_managers) AS fund_managers,
        MIN(CASE WHEN ter_direct > 0 THEN ter_direct END) AS ter_direct,
        MAX(CASE WHEN ter_regular > 0 THEN ter_regular END) AS ter_regular
      FROM scheme_details
      WHERE fund_dedup_flag = 1
        AND amfi_ssd_fund_id IS NOT NULL
        AND amfi_ssd_fund_id != ''
      GROUP BY amfi_ssd_fund_id;

      CREATE VIEW IF NOT EXISTS v_portfolio_enriched AS
      SELECT
        h.fund_code,
        h.fund_name,
        h.fund_category,
        h.month_end,
        h.isin,
        h.security_name,
        h.nse_symbol,
        h.market_value_lakh,
        h.quantity,
        h.pct_of_fund,
        h.asset_group,
        h.asset_subgroup,
        h.mapping_category,
        h.isin_type,
        h.line_count,
        h.amfi_ssd_fund_id,
        a.amc,
        a.fund_aum_cr,
        a.riskometer,
        a.ter_direct,
        a.ter_regular
      FROM v_fund_holdings_aggregated h
      LEFT JOIN v_dedup_fund_aum a
        ON h.amfi_ssd_fund_id = a.amfi_ssd_fund_id;

      /* Financia navDatabaseService.ts compatible view */
      CREATE VIEW IF NOT EXISTS nav_master AS
      SELECT
        CAST(scheme_code AS INTEGER) AS scheme_code,
        nav_date AS date,
        nav,
        scheme_name,
        COALESCE(isin_div_payout_growth, isin_div_reinvestment, '') AS isin,
        source
      FROM amfi_nav_records
      WHERE scheme_code GLOB '[0-9]*'
      UNION ALL
      SELECT
        CAST(scheme_code AS INTEGER) AS scheme_code,
        nav_date AS date,
        nav,
        scheme_name,
        COALESCE(isin, isin2, '') AS isin,
        source
      FROM scheme_universe
      WHERE scheme_code GLOB '[0-9]*'
        AND nav IS NOT NULL
        AND nav_date IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM amfi_nav_records r
          WHERE r.scheme_code = scheme_universe.scheme_code
            AND r.nav_date = scheme_universe.nav_date
        );

      /* Enriched Fund Terminal View joining processed AMFI ETF/MF catalog with AUM, TER, Riskometer */
      CREATE VIEW IF NOT EXISTS v_terminal_enriched AS
      SELECT
        c.scheme_code,
        c.isin,
        c.isin2,
        c.scheme_name,
        c.amc,
        c.structure,
        c.instrument_type,
        c.asset_class,
        c.sub_category,
        c.plan_type,
        c.option_type,
        c.nav,
        c.nav_date,
        c.is_active,
        c.is_segregated,
        c.is_zero_nav,
        c.fund_family_key,
        d.amfi_ssd_fund_id,
        d.amfi_daily_fund_aum_cr_all_plans AS fund_aum_cr,
        d.amfi_daily_riskometer AS riskometer,
        d.amfi_daily_benchmark AS benchmark,
        d.ter_direct,
        d.ter_regular,
        d.ssd_fund_managers AS fund_managers
      FROM fund_terminal_catalog c
      LEFT JOIN scheme_details d ON c.scheme_code = d.scheme_code;
    `);
  }

  private seedCatalogMetadata(): void {
    const upsert = this.db.prepare(`
      INSERT INTO dataset_catalog (
        dataset_id, table_name, title, kind, ingestion_mode,
        data_as_of, update_cadence, catalog_row_count, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(dataset_id) DO UPDATE SET
        table_name = excluded.table_name,
        title = excluded.title,
        kind = excluded.kind,
        ingestion_mode = excluded.ingestion_mode,
        data_as_of = excluded.data_as_of,
        update_cadence = excluded.update_cadence,
        catalog_row_count = excluded.catalog_row_count
    `);

    const tx = this.db.transaction(() => {
      for (const ds of MFPRO_DATASETS) {
        upsert.run(
          ds.id,
          ds.tableName,
          ds.title,
          ds.kind,
          ds.ingestionMode,
          ds.dataAsOf,
          ds.updateCadence,
          ds.catalogRowCount,
          ds.ingestionMode === 'parquet-remote' ? 'remote-parquet' : 'pending'
        );
      }
    });
    tx();
  }

  private ensureSeedAmfiIntervalFeed(): void {
    const row = this.db.prepare('SELECT COUNT(*) AS cnt FROM amfi_nav_records').get() as { cnt: number };
    if (row.cnt === 0) {
      const parsed = parseAmfiNavText(SEED_AMFI_INTERVAL_FEED, 'AMFI_INTERVAL_SEED');
      this.upsertAmfiNavRecords(parsed.records);
    }
  }

  public isTableEmpty(tableName: string): boolean {
    const allowed = new Set([
      'scheme_universe',
      'scheme_details',
      'portfolio_holdings',
      'portfolio_isin_mappings',
      'data_quality_issues',
      'fund_aum_quality_notes',
    ]);
    if (!allowed.has(tableName)) return false;
    const row = this.db.prepare(`SELECT COUNT(*) AS cnt FROM ${tableName}`).get() as { cnt: number };
    return row.cnt === 0;
  }

  public recordSyncStart(datasetId: string, tableName: string, sourceUrl: string): number {
    const now = new Date().toISOString();
    this.db
      .prepare(`UPDATE dataset_catalog SET sync_status = 'syncing', last_error = NULL WHERE dataset_id = ?`)
      .run(datasetId);
    const info = this.db
      .prepare(`
        INSERT INTO sync_runs (dataset_id, table_name, status, rows_ingested, duration_ms, source_url, started_at)
        VALUES (?, ?, 'running', 0, 0, ?, ?)
      `)
      .run(datasetId, tableName, sourceUrl, now);
    return Number(info.lastInsertRowid);
  }

  public recordSyncSuccess(runId: number, datasetId: string, rowsIngested: number, durationMs: number): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE sync_runs
        SET status = 'success', rows_ingested = ?, duration_ms = ?, completed_at = ?
        WHERE id = ?
      `)
      .run(rowsIngested, durationMs, now, runId);
    this.db
      .prepare(`
        UPDATE dataset_catalog
        SET sync_status = 'synced', local_row_count = ?, last_synced_at = ?, last_error = NULL
        WHERE dataset_id = ?
      `)
      .run(rowsIngested, now, datasetId);
  }

  public recordSyncError(runId: number, datasetId: string, errorMessage: string, durationMs: number): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE sync_runs
        SET status = 'error', error_message = ?, duration_ms = ?, completed_at = ?
        WHERE id = ?
      `)
      .run(errorMessage, durationMs, now, runId);
    this.db
      .prepare(`
        UPDATE dataset_catalog
        SET sync_status = 'error', last_error = ?
        WHERE dataset_id = ?
      `)
      .run(errorMessage, datasetId);
  }

  public saveParquetProbe(datasetId: string, probePayload: Record<string, unknown>): void {
    this.db
      .prepare(`UPDATE dataset_catalog SET parquet_probe_json = ?, last_synced_at = ? WHERE dataset_id = ?`)
      .run(JSON.stringify(probePayload), new Date().toISOString(), datasetId);
  }

  public replacePortfolioHoldingsFromCsv(rawCsv: string): number {
    const { headers, rows } = parseCsvRows(rawCsv);
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const insert = this.db.prepare(`
      INSERT INTO portfolio_holdings (
        fund_code, fund_name, fund_category, month_end, isin, security_name, nse_symbol,
        market_value_lakh, quantity, pct_of_fund, asset_group, asset_subgroup,
        mapping_category, mapping_reason, isin_as_filed, instrument_name_as_filed,
        amfi_ssd_fund_id, isin_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM portfolio_holdings').run();
      let inserted = 0;
      for (const r of rows) {
        const fundCode = (r[idx.fund_code] || '').trim();
        const isin = (r[idx.isin] || '').trim();
        const monthEnd = (r[idx.month_end] || '').trim();
        if (!fundCode || !isin || !monthEnd) continue;
        insert.run(
          fundCode,
          (r[idx.fund_name] || '').trim(),
          (r[idx.fund_category] || '').trim() || null,
          monthEnd,
          isin,
          (r[idx.security_name] || '').trim(),
          (r[idx.nse_symbol] || '').trim() || null,
          parseNullableFloat(r[idx.market_value_lakh]) ?? 0,
          parseNullableFloat(r[idx.quantity]) ?? 0,
          parseNullableFloat(r[idx.pct_of_fund]) ?? 0,
          (r[idx.asset_group] || '').trim() || null,
          (r[idx.asset_subgroup] || '').trim() || null,
          (r[idx.mapping_category] || '').trim() || null,
          (r[idx.mapping_reason] || '').trim() || null,
          (r[idx.isin_as_filed] || '').trim() || null,
          (r[idx.instrument_name_as_filed] || '').trim() || null,
          (r[idx.amfi_ssd_fund_id] || '').trim() || null,
          (r[idx.isin_type] || '').trim() || null
        );
        inserted++;
      }
      return inserted;
    });

    return tx();
  }

  public replaceIsinMappingsFromCsv(rawCsv: string): number {
    const { headers, rows } = parseCsvRows(rawCsv);
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO portfolio_isin_mappings (
        isin_as_filed, isin, security_name, mapping_category, mapping_reason,
        first_month, last_month, funds, rows
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM portfolio_isin_mappings').run();
      let inserted = 0;
      for (const r of rows) {
        const asFiled = (r[idx.isin_as_filed] || '').trim();
        const isin = (r[idx.isin] || '').trim();
        if (!asFiled || !isin) continue;
        insert.run(
          asFiled,
          isin,
          (r[idx.security_name] || '').trim(),
          (r[idx.mapping_category] || '').trim(),
          (r[idx.mapping_reason] || '').trim() || null,
          (r[idx.first_month] || '').trim() || null,
          (r[idx.last_month] || '').trim() || null,
          parseNullableInt(r[idx.funds]) ?? 0,
          parseNullableInt(r[idx.rows]) ?? 0
        );
        inserted++;
      }
      return inserted;
    });

    return tx();
  }

  public replaceSchemeUniverseFromCsv(rawCsv: string): number {
    const { headers, rows } = parseCsvRows(rawCsv);
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO scheme_universe (
        scheme_code, isin, isin2, scheme_name, amc, scheme_type, category,
        category_sub, category_group_clean, scheme_plan, scheme_option,
        first_date, last_date, is_active, is_stale, aaum_cr_quarterly_avg,
        nav_date, nav, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM scheme_universe').run();
      let inserted = 0;
      for (const r of rows) {
        const code = (r[idx.scheme_code] || '').trim();
        const name = (r[idx.scheme_name] || '').trim();
        if (!code || !name) continue;
        insert.run(
          code,
          (r[idx.isin] || '').trim() || null,
          (r[idx.isin2] || '').trim() || null,
          name,
          (r[idx.amc] || '').trim() || null,
          (r[idx.scheme_type] || '').trim() || null,
          (r[idx.category] || '').trim() || null,
          (r[idx.category_sub] || '').trim() || null,
          (r[idx.category_group_clean] || '').trim() || null,
          (r[idx.scheme_plan] || '').trim() || null,
          (r[idx.scheme_option] || '').trim() || null,
          (r[idx.first_date] || '').trim() || null,
          (r[idx.last_date] || '').trim() || null,
          parseBoolFlag(r[idx.is_active]),
          parseBoolFlag(r[idx.is_stale]),
          parseNullableFloat(r[idx.aaum_cr_quarterly_avg]),
          (r[idx.nav_date] || '').trim() || null,
          parseNullableFloat(r[idx.nav]),
          (r[idx.source] || 'MF').trim() || 'MF'
        );
        inserted++;
      }
      return inserted;
    });

    return tx();
  }

  public replaceSchemeDetailsFromCsv(rawCsv: string): number {
    const { headers, rows } = parseCsvRows(rawCsv);
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO scheme_details (
        scheme_code, isin, scheme_name, fund_name_latest, amc,
        category_group_clean, category_sub, scheme_plan, is_active,
        amfi_ssd_fund_id, fund_dedup_flag, amfi_daily_fund_name,
        amfi_daily_fund_aum_cr_all_plans, amfi_daily_aum_date,
        amfi_daily_riskometer, amfi_daily_benchmark, ssd_fund_managers,
        ssd_allotment_date, ssd_exit_load, ssd_objective,
        ter_date, ter_regular, ter_direct, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM scheme_details').run();
      let inserted = 0;
      for (const r of rows) {
        const code = (r[idx.scheme_code] || '').trim();
        if (!code) continue;
        insert.run(
          code,
          (r[idx.isin] || '').trim() || null,
          (r[idx.scheme_name] || '').trim() || null,
          (r[idx.fund_name_latest] || '').trim() || null,
          (r[idx.amc] || '').trim() || null,
          (r[idx.category_group_clean] || '').trim() || null,
          (r[idx.category_sub] || '').trim() || null,
          (r[idx.scheme_plan] || '').trim() || null,
          parseBoolFlag(r[idx.is_active]),
          (r[idx.amfi_ssd_fund_id] || '').trim() || null,
          parseBoolFlag(r[idx.fund_dedup_flag]),
          (r[idx.amfi_daily_fund_name] || '').trim() || null,
          parseNullableFloat(r[idx.amfi_daily_fund_aum_cr_all_plans]),
          (r[idx.amfi_daily_aum_date] || '').trim() || null,
          (r[idx.amfi_daily_riskometer] || '').trim() || null,
          (r[idx.amfi_daily_benchmark] || '').trim() || null,
          (r[idx.ssd_fund_managers] || '').trim() || null,
          (r[idx.ssd_allotment_date] || '').trim() || null,
          (r[idx.ssd_exit_load] || '').trim() || null,
          (r[idx.ssd_objective] || '').trim() || null,
          (r[idx.ter_date] || '').trim() || null,
          parseNullableFloat(r[idx.ter_regular]),
          parseNullableFloat(r[idx.ter_direct]),
          (r[idx.source] || 'MF').trim() || 'MF'
        );
        inserted++;
      }
      return inserted;
    });

    return tx();
  }

  public replaceDataQualityFromCsv(rawCsv: string): number {
    const { headers, rows } = parseCsvRows(rawCsv);
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const insert = this.db.prepare(`
      INSERT INTO data_quality_issues (
        source, as_of, scheme_code, name, category, issue_code, issue, status, detail
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM data_quality_issues').run();
      let inserted = 0;
      for (const r of rows) {
        const name = (r[idx.name] || '').trim();
        const issueCode = (r[idx.issue_code] || '').trim();
        if (!name && !issueCode) continue;
        insert.run(
          (r[idx.source] || '').trim() || null,
          (r[idx.as_of] || '').trim() || null,
          (r[idx.scheme_code] || '').trim() || null,
          name || null,
          (r[idx.category] || '').trim() || null,
          issueCode || null,
          (r[idx.issue] || '').trim() || null,
          (r[idx.status] || '').trim() || null,
          (r[idx.detail] || '').trim() || null
        );
        inserted++;
      }
      return inserted;
    });

    return tx();
  }

  public replaceFundAumQualityFromCsv(rawCsv: string): number {
    const { headers, rows } = parseCsvRows(rawCsv);
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const insert = this.db.prepare(`
      INSERT INTO fund_aum_quality_notes (
        amfi_ssd_fund_id, amfi_fund_name, report_date, aum_cr_as_filed, aum_cr, quality_code
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM fund_aum_quality_notes').run();
      let inserted = 0;
      for (const r of rows) {
        const fundId = (r[idx.amfi_ssd_fund_id] || '').trim();
        const reportDate = (r[idx.report_date] || '').trim();
        if (!fundId && !reportDate) continue;
        insert.run(
          fundId || null,
          (r[idx.amfi_fund_name] || '').trim() || null,
          reportDate || null,
          parseNullableFloat(r[idx.aum_cr_as_filed]),
          parseNullableFloat(r[idx.aum_cr]),
          (r[idx.quality_code] || '').trim() || null
        );
        inserted++;
      }
      return inserted;
    });

    return tx();
  }

  public upsertAmfiNavRecords(records: ParsedAmfiNavRecord[]): { upserted: number; totalInTable: number } {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO amfi_nav_records (
        scheme_code, nav_date, nav, scheme_name, isin_div_payout_growth,
        isin_div_reinvestment, amc, scheme_category_header, plan, option_name,
        source, ingested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(scheme_code, nav_date) DO UPDATE SET
        nav = excluded.nav,
        scheme_name = excluded.scheme_name,
        isin_div_payout_growth = COALESCE(excluded.isin_div_payout_growth, amfi_nav_records.isin_div_payout_growth),
        isin_div_reinvestment = COALESCE(excluded.isin_div_reinvestment, amfi_nav_records.isin_div_reinvestment),
        amc = excluded.amc,
        scheme_category_header = excluded.scheme_category_header,
        plan = COALESCE(excluded.plan, amfi_nav_records.plan),
        option_name = COALESCE(excluded.option_name, amfi_nav_records.option_name),
        source = excluded.source,
        ingested_at = excluded.ingested_at
    `);

    const tx = this.db.transaction(() => {
      for (const rec of records) {
        stmt.run(
          rec.scheme_code,
          rec.nav_date,
          rec.nav,
          rec.scheme_name,
          rec.isin_div_payout_growth,
          rec.isin_div_reinvestment,
          rec.amc,
          rec.scheme_category_header,
          rec.plan,
          rec.option_name,
          rec.source,
          now
        );
      }
    });
    tx();

    const cnt = this.db.prepare('SELECT COUNT(*) AS cnt FROM amfi_nav_records').get() as { cnt: number };
    return { upserted: records.length, totalInTable: cnt.cnt };
  }

  public getOverview() {
    const counts = {
      fund_terminal_catalog: (this.db.prepare('SELECT COUNT(*) AS c FROM fund_terminal_catalog').get() as { c: number }).c,
      scheme_universe: (this.db.prepare('SELECT COUNT(*) AS c FROM scheme_universe').get() as { c: number }).c,
      scheme_details: (this.db.prepare('SELECT COUNT(*) AS c FROM scheme_details').get() as { c: number }).c,
      portfolio_holdings: (this.db.prepare('SELECT COUNT(*) AS c FROM portfolio_holdings').get() as { c: number }).c,
      portfolio_isin_mappings: (this.db.prepare('SELECT COUNT(*) AS c FROM portfolio_isin_mappings').get() as { c: number }).c,
      amfi_nav_records: (this.db.prepare('SELECT COUNT(*) AS c FROM amfi_nav_records').get() as { c: number }).c,
      data_quality_issues: (this.db.prepare('SELECT COUNT(*) AS c FROM data_quality_issues').get() as { c: number }).c,
      fund_aum_quality_notes: (this.db.prepare('SELECT COUNT(*) AS c FROM fund_aum_quality_notes').get() as { c: number }).c,
    };

    const totalLocalRows = Object.values(counts).reduce((sum, n) => sum + n, 0);

    const aumSummary = this.db
      .prepare(`
        SELECT
          COUNT(*) AS dedup_fund_count,
          ROUND(SUM(COALESCE(amfi_daily_fund_aum_cr_all_plans, 0)), 2) AS total_aum_cr,
          MAX(amfi_daily_aum_date) AS latest_aum_date
        FROM scheme_details
        WHERE fund_dedup_flag = 1
      `)
      .get() as { dedup_fund_count: number; total_aum_cr: number | null; latest_aum_date: string | null };

    const schemeStats = this.db
      .prepare(`
        SELECT
          COUNT(*) AS total_schemes,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_schemes,
          SUM(CASE WHEN source = 'SIF' THEN 1 ELSE 0 END) AS sif_schemes,
          COUNT(DISTINCT amc) AS amc_count,
          MAX(nav_date) AS latest_nav_date
        FROM scheme_universe
      `)
      .get() as {
      total_schemes: number;
      active_schemes: number | null;
      sif_schemes: number | null;
      amc_count: number;
      latest_nav_date: string | null;
    };

    const holdingsSummary = this.db
      .prepare(`
        SELECT
          COUNT(DISTINCT fund_code) AS tracked_funds,
          COUNT(DISTINCT month_end) AS month_count,
          MIN(month_end) AS earliest_month,
          MAX(month_end) AS latest_month
        FROM portfolio_holdings
      `)
      .get() as {
      tracked_funds: number;
      month_count: number;
      earliest_month: string | null;
      latest_month: string | null;
    };

    const topAmcsByAum = this.db
      .prepare(`
        SELECT
          amc,
          COUNT(*) AS fund_count,
          ROUND(SUM(COALESCE(amfi_daily_fund_aum_cr_all_plans, 0)), 2) AS total_aum_cr
        FROM scheme_details
        WHERE fund_dedup_flag = 1 AND amc IS NOT NULL AND amc != ''
        GROUP BY amc
        ORDER BY total_aum_cr DESC
        LIMIT 8
      `)
      .all() as Array<{ amc: string; fund_count: number; total_aum_cr: number }>;

    const catalogRows = this.db
      .prepare('SELECT * FROM dataset_catalog ORDER BY CASE ingestion_mode WHEN \'sqlite\' THEN 0 ELSE 1 END, dataset_id')
      .all() as Array<Record<string, unknown>>;

    const catalogById = new Map(catalogRows.map((r) => [String(r.dataset_id), r]));
    const datasets = MFPRO_DATASETS.map((def) => {
      const state = catalogById.get(def.id);
      let parquetProbe: Record<string, unknown> | null = null;
      if (state?.parquet_probe_json && typeof state.parquet_probe_json === 'string') {
        try {
          parquetProbe = JSON.parse(state.parquet_probe_json);
        } catch {
          parquetProbe = null;
        }
      }
      return {
        ...def,
        localRowCount: Number(state?.local_row_count ?? 0),
        syncStatus: String(state?.sync_status ?? (def.ingestionMode === 'parquet-remote' ? 'remote-parquet' : 'pending')),
        lastSyncedAt: (state?.last_synced_at as string | null) ?? null,
        lastError: (state?.last_error as string | null) ?? null,
        parquetProbe,
      };
    });

    const recentSyncRuns = this.db
      .prepare('SELECT * FROM sync_runs ORDER BY id DESC LIMIT 12')
      .all() as SyncRunRecord[];

    let dbSizeBytes = 0;
    if (this.dbPath !== ':memory:' && fs.existsSync(this.dbPath)) {
      dbSizeBytes = fs.statSync(this.dbPath).size;
    }

    const tables: TableStat[] = [
      { tableName: 'fund_terminal_catalog', label: 'Fund Terminal Catalog (ETFs & MFs)', datasetId: 'amfi.terminal_catalog', rowCount: counts.fund_terminal_catalog, kind: 'table' },
      { tableName: 'scheme_universe', label: 'Scheme Universe (NAV Latest)', datasetId: 'mf.nav_latest', rowCount: counts.scheme_universe, kind: 'table' },
      { tableName: 'scheme_details', label: 'Scheme Details & TER', datasetId: 'mf.scheme_details_latest', rowCount: counts.scheme_details, kind: 'table' },
      { tableName: 'portfolio_holdings', label: 'Monthly Portfolio Holdings', datasetId: 'mf.portfolio_holdings', rowCount: counts.portfolio_holdings, kind: 'table' },
      { tableName: 'portfolio_isin_mappings', label: 'ISIN Corporate Action Mappings', datasetId: 'mf.portfolio_isin_mappings', rowCount: counts.portfolio_isin_mappings, kind: 'table' },
      { tableName: 'amfi_nav_records', label: 'AMFI Semicolon Feed Ledger', datasetId: 'amfi.raw_feed', rowCount: counts.amfi_nav_records, kind: 'table' },
      { tableName: 'data_quality_issues', label: 'Scheme Data Quality Audit', datasetId: 'mf.data_quality', rowCount: counts.data_quality_issues, kind: 'table' },
      { tableName: 'fund_aum_quality_notes', label: 'Daily AUM Quality Anomalies', datasetId: 'mf.fund_aum_quality', rowCount: counts.fund_aum_quality_notes, kind: 'table' },
    ];

    return {
      engine: 'SQLite 3 (WAL) · Financia Relational Store',
      dbFile: path.basename(this.dbPath),
      dbSizeBytes,
      totalLocalRows,
      counts,
      tables,
      kpis: {
        totalLocalRows,
        totalDedupAumCr: aumSummary.total_aum_cr ?? 0,
        dedupFundCount: aumSummary.dedup_fund_count ?? 0,
        latestAumDate: aumSummary.latest_aum_date,
        totalSchemes: schemeStats.total_schemes ?? 0,
        activeSchemes: schemeStats.active_schemes ?? 0,
        sifSchemes: schemeStats.sif_schemes ?? 0,
        amcCount: schemeStats.amc_count ?? 0,
        latestNavDate: schemeStats.latest_nav_date,
        trackedEquityFunds: holdingsSummary.tracked_funds ?? 0,
        holdingsMonthCount: holdingsSummary.month_count ?? 0,
        holdingsCoverage:
          holdingsSummary.earliest_month && holdingsSummary.latest_month
            ? `${holdingsSummary.earliest_month} to ${holdingsSummary.latest_month}`
            : 'Not synced',
        openQualityFlags: counts.data_quality_issues + counts.fund_aum_quality_notes,
        amfiFeedRows: counts.amfi_nav_records,
      },
      topAmcsByAum,
      datasets,
      recentSyncRuns,
    };
  }

  public querySchemes(params: SchemeQueryParams) {
    const where: string[] = [];
    const args: unknown[] = [];

    if (params.q && params.q.trim()) {
      const pattern = `%${params.q.trim()}%`;
      where.push(
        '(u.scheme_name LIKE ? OR u.scheme_code LIKE ? OR u.isin LIKE ? OR u.isin2 LIKE ? OR u.amc LIKE ?)'
      );
      args.push(pattern, pattern, pattern, pattern, pattern);
    }
    if (params.amc && params.amc !== 'ALL') {
      where.push('u.amc = ?');
      args.push(params.amc);
    }
    if (params.category && params.category !== 'ALL') {
      where.push('u.category_group_clean = ?');
      args.push(params.category);
    }
    if (params.plan && params.plan !== 'ALL') {
      where.push('u.scheme_plan = ?');
      args.push(params.plan);
    }
    if (params.source && params.source !== 'ALL') {
      where.push('u.source = ?');
      args.push(params.source);
    }
    if (params.activeOnly) {
      where.push('u.is_active = 1');
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sortCol = ALLOWED_SCHEME_SORT[params.sortBy || 'aum'] || ALLOWED_SCHEME_SORT.aum;
    const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(200, Math.max(1, Math.floor(params.limit || 50)));
    const offset = Math.max(0, Math.floor(params.offset || 0));

    const totalRow = this.db
      .prepare(`
        SELECT COUNT(*) AS cnt
        FROM scheme_universe u
        LEFT JOIN scheme_details d ON u.scheme_code = d.scheme_code
        ${whereClause}
      `)
      .get(...args) as { cnt: number };

    const rows = this.db
      .prepare(`
        SELECT
          u.scheme_code,
          u.isin,
          u.isin2,
          u.scheme_name,
          u.amc,
          u.category_group_clean,
          u.category_sub,
          u.scheme_plan,
          u.scheme_option,
          u.is_active,
          u.nav,
          u.nav_date,
          u.source,
          u.aaum_cr_quarterly_avg,
          d.amfi_ssd_fund_id,
          d.fund_dedup_flag,
          d.amfi_daily_fund_aum_cr_all_plans,
          d.amfi_daily_aum_date,
          d.amfi_daily_riskometer,
          d.amfi_daily_benchmark,
          d.ter_direct,
          d.ter_regular,
          d.ssd_fund_managers
        FROM scheme_universe u
        LEFT JOIN scheme_details d ON u.scheme_code = d.scheme_code
        ${whereClause}
        ORDER BY ${sortCol} ${sortDir}, u.scheme_code ASC
        LIMIT ? OFFSET ?
      `)
      .all(...args, limit, offset);

    const amcs = (
      this.db
        .prepare('SELECT DISTINCT amc FROM scheme_universe WHERE amc IS NOT NULL AND amc != \'\' ORDER BY amc')
        .all() as Array<{ amc: string }>
    ).map((r) => r.amc);

    const categories = (
      this.db
        .prepare(
          'SELECT DISTINCT category_group_clean FROM scheme_universe WHERE category_group_clean IS NOT NULL AND category_group_clean != \'\' ORDER BY category_group_clean'
        )
        .all() as Array<{ category_group_clean: string }>
    ).map((r) => r.category_group_clean);

    return {
      total: totalRow.cnt,
      limit,
      offset,
      rows,
      facets: { amcs, categories },
    };
  }

  public getSchemeByCode(schemeCode: string) {
    const code = schemeCode.trim();
    const scheme = this.db
      .prepare(`
        SELECT
          u.*,
          d.fund_name_latest,
          d.amfi_ssd_fund_id,
          d.fund_dedup_flag,
          d.amfi_daily_fund_name,
          d.amfi_daily_fund_aum_cr_all_plans,
          d.amfi_daily_aum_date,
          d.amfi_daily_riskometer,
          d.amfi_daily_benchmark,
          d.ssd_fund_managers,
          d.ssd_allotment_date,
          d.ssd_exit_load,
          d.ssd_objective,
          d.ter_date,
          d.ter_regular,
          d.ter_direct
        FROM scheme_universe u
        LEFT JOIN scheme_details d ON u.scheme_code = d.scheme_code
        WHERE u.scheme_code = ?
      `)
      .get(code) as Record<string, unknown> | undefined;

    if (!scheme) return null;

    const amfiFeedEntries = this.db
      .prepare('SELECT * FROM amfi_nav_records WHERE scheme_code = ? ORDER BY nav_date DESC LIMIT 20')
      .all(code);

    const qualityFlags = this.db
      .prepare(
        'SELECT * FROM data_quality_issues WHERE scheme_code = ? OR name = ? LIMIT 15'
      )
      .all(code, scheme.fund_name_latest || scheme.scheme_name || '');

    let aumNotes: unknown[] = [];
    if (scheme.amfi_ssd_fund_id) {
      aumNotes = this.db
        .prepare(
          'SELECT * FROM fund_aum_quality_notes WHERE amfi_ssd_fund_id = ? ORDER BY report_date DESC LIMIT 15'
        )
        .all(String(scheme.amfi_ssd_fund_id));
    }

    return { scheme, amfiFeedEntries, qualityFlags, aumNotes };
  }

  public getHoldingsFilters() {
    const funds = this.db
      .prepare(`
        SELECT
          h.fund_code,
          MAX(h.fund_name) AS fund_name,
          MAX(h.fund_category) AS fund_category,
          MAX(h.amfi_ssd_fund_id) AS amfi_ssd_fund_id,
          COUNT(DISTINCT h.month_end) AS months_available,
          MAX(h.month_end) AS latest_month,
          MAX(a.fund_aum_cr) AS fund_aum_cr,
          MAX(a.ter_direct) AS ter_direct,
          MAX(a.ter_regular) AS ter_regular
        FROM portfolio_holdings h
        LEFT JOIN v_dedup_fund_aum a ON h.amfi_ssd_fund_id = a.amfi_ssd_fund_id
        GROUP BY h.fund_code
        ORDER BY h.fund_category, h.fund_name
      `)
      .all();

    const months = (
      this.db
        .prepare('SELECT DISTINCT month_end FROM portfolio_holdings ORDER BY month_end DESC')
        .all() as Array<{ month_end: string }>
    ).map((r) => r.month_end);

    const assetGroups = (
      this.db
        .prepare(
          'SELECT DISTINCT asset_group FROM portfolio_holdings WHERE asset_group IS NOT NULL ORDER BY asset_group'
        )
        .all() as Array<{ asset_group: string }>
    ).map((r) => r.asset_group);

    const categories = (
      this.db
        .prepare(
          'SELECT DISTINCT fund_category FROM portfolio_holdings WHERE fund_category IS NOT NULL ORDER BY fund_category'
        )
        .all() as Array<{ fund_category: string }>
    ).map((r) => r.fund_category);

    return { funds, months, assetGroups, categories };
  }

  public queryHoldings(params: HoldingsQueryParams) {
    const useAggregated = params.aggregated !== false;
    const sourceTable = useAggregated ? 'v_portfolio_enriched' : 'portfolio_holdings';

    const where: string[] = [];
    const args: unknown[] = [];

    if (params.fundCode && params.fundCode !== 'ALL') {
      where.push('fund_code = ?');
      args.push(params.fundCode);
    }
    if (params.category && params.category !== 'ALL') {
      where.push('fund_category = ?');
      args.push(params.category);
    }
    if (params.monthEnd && params.monthEnd !== 'ALL') {
      where.push('month_end = ?');
      args.push(params.monthEnd);
    }
    if (params.assetGroup && params.assetGroup !== 'ALL') {
      where.push('asset_group = ?');
      args.push(params.assetGroup);
    }
    if (params.q && params.q.trim()) {
      const pat = `%${params.q.trim()}%`;
      where.push('(security_name LIKE ? OR isin LIKE ? OR nse_symbol LIKE ? OR fund_name LIKE ?)');
      args.push(pat, pat, pat, pat);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const limit = Math.min(200, Math.max(1, Math.floor(params.limit || 60)));
    const offset = Math.max(0, Math.floor(params.offset || 0));

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM ${sourceTable} ${whereClause}`)
      .get(...args) as { cnt: number };

    const rows = this.db
      .prepare(`
        SELECT *
        FROM ${sourceTable}
        ${whereClause}
        ORDER BY market_value_lakh DESC
        LIMIT ? OFFSET ?
      `)
      .all(...args, limit, offset);

    const allocationByGroup = this.db
      .prepare(`
        SELECT
          COALESCE(asset_group, 'Unclassified') AS asset_group,
          ROUND(SUM(market_value_lakh), 2) AS total_value_lakh,
          ROUND(SUM(pct_of_fund), 2) AS total_pct,
          COUNT(*) AS row_count
        FROM ${sourceTable}
        ${whereClause}
        GROUP BY asset_group
        ORDER BY total_value_lakh DESC
      `)
      .all(...args);

    return {
      total: totalRow.cnt,
      limit,
      offset,
      aggregated: useAggregated,
      rows,
      allocationByGroup,
    };
  }

  public queryIsinMappings(params: { category?: string; q?: string; limit?: number; offset?: number }) {
    const where: string[] = [];
    const args: unknown[] = [];
    if (params.category && params.category !== 'ALL') {
      where.push('mapping_category = ?');
      args.push(params.category);
    }
    if (params.q && params.q.trim()) {
      const pat = `%${params.q.trim()}%`;
      where.push('(isin_as_filed LIKE ? OR isin LIKE ? OR security_name LIKE ? OR mapping_reason LIKE ?)');
      args.push(pat, pat, pat, pat);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const limit = Math.min(200, Math.max(1, Math.floor(params.limit || 50)));
    const offset = Math.max(0, Math.floor(params.offset || 0));

    const total = (
      this.db.prepare(`SELECT COUNT(*) AS cnt FROM portfolio_isin_mappings ${whereClause}`).get(...args) as {
        cnt: number;
      }
    ).cnt;

    const rows = this.db
      .prepare(`SELECT * FROM portfolio_isin_mappings ${whereClause} ORDER BY rows DESC, isin ASC LIMIT ? OFFSET ?`)
      .all(...args, limit, offset);

    const categories = (
      this.db
        .prepare('SELECT DISTINCT mapping_category FROM portfolio_isin_mappings ORDER BY mapping_category')
        .all() as Array<{ mapping_category: string }>
    ).map((r) => r.mapping_category);

    return { total, limit, offset, rows, categories };
  }

  public queryAmfiNavRecords(params: { q?: string; amc?: string; limit?: number; offset?: number }) {
    const where: string[] = [];
    const args: unknown[] = [];

    if (params.amc && params.amc !== 'ALL') {
      where.push('amc = ?');
      args.push(params.amc);
    }
    if (params.q && params.q.trim()) {
      const pat = `%${params.q.trim()}%`;
      where.push(
        '(scheme_code LIKE ? OR scheme_name LIKE ? OR isin_div_payout_growth LIKE ? OR isin_div_reinvestment LIKE ? OR amc LIKE ?)'
      );
      args.push(pat, pat, pat, pat, pat);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const limit = Math.min(200, Math.max(1, Math.floor(params.limit || 100)));
    const offset = Math.max(0, Math.floor(params.offset || 0));

    const total = (
      this.db.prepare(`SELECT COUNT(*) AS cnt FROM amfi_nav_records ${whereClause}`).get(...args) as { cnt: number }
    ).cnt;

    const rows = this.db
      .prepare(
        `SELECT * FROM amfi_nav_records ${whereClause} ORDER BY nav_date DESC, amc ASC, scheme_code ASC LIMIT ? OFFSET ?`
      )
      .all(...args, limit, offset);

    const amcs = (
      this.db
        .prepare('SELECT DISTINCT amc FROM amfi_nav_records WHERE amc IS NOT NULL ORDER BY amc')
        .all() as Array<{ amc: string }>
    ).map((r) => r.amc);

    return { total, limit, offset, rows, amcs };
  }

  public exportFinanciaNavMasterSql(limit = 500): string {
    const capped = Math.min(5000, Math.max(1, Math.floor(limit)));
    const rows = this.db
      .prepare(`
        SELECT scheme_code, date, nav, scheme_name, isin, source
        FROM nav_master
        ORDER BY date DESC, scheme_code ASC
        LIMIT ?
      `)
      .all(capped) as Array<{
      scheme_code: number;
      date: string;
      nav: number;
      scheme_name: string;
      isin: string;
      source: string;
    }>;

    const esc = (s: string) => s.replace(/'/g, "''");
    const lines = [
      '-- Financia nav_master SQL export (compatible with bruce12-glitch/Financia navDatabaseService.ts)',
      `-- Generated: ${new Date().toISOString()} (${rows.length} rows)`,
      'BEGIN TRANSACTION;',
      'CREATE TABLE IF NOT EXISTS "nav_master" (',
      '  "scheme_code" INTEGER NOT NULL,',
      '  "date" TEXT NOT NULL,',
      '  "nav" REAL NOT NULL,',
      '  "scheme_name" TEXT NOT NULL,',
      '  "isin" TEXT,',
      '  "source" TEXT,',
      '  PRIMARY KEY ("scheme_code", "date")',
      ');',
      ...rows.map(
        (r) =>
          `INSERT OR REPLACE INTO "nav_master" VALUES(${r.scheme_code},'${esc(r.date)}',${r.nav},'${esc(r.scheme_name)}','${esc(r.isin || '')}','${esc(r.source || 'MF')}');`
      ),
      'COMMIT;',
    ];
    return lines.join('\n');
  }

  public queryDataQuality(params: QualityQueryParams) {
    const tab = params.tab === 'aum_anomalies' ? 'aum_anomalies' : 'scheme_conflicts';
    const limit = Math.min(200, Math.max(1, Math.floor(params.limit || 50)));
    const offset = Math.max(0, Math.floor(params.offset || 0));

    if (tab === 'scheme_conflicts') {
      const where: string[] = [];
      const args: unknown[] = [];
      if (params.status && params.status !== 'ALL') {
        where.push('status = ?');
        args.push(params.status);
      }
      if (params.code && params.code !== 'ALL') {
        where.push('issue_code = ?');
        args.push(params.code);
      }
      if (params.q && params.q.trim()) {
        const pat = `%${params.q.trim()}%`;
        where.push('(name LIKE ? OR category LIKE ? OR issue LIKE ? OR detail LIKE ? OR scheme_code LIKE ?)');
        args.push(pat, pat, pat, pat, pat);
      }
      const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
      const total = (
        this.db.prepare(`SELECT COUNT(*) AS cnt FROM data_quality_issues ${whereClause}`).get(...args) as {
          cnt: number;
        }
      ).cnt;
      const rows = this.db
        .prepare(`SELECT * FROM data_quality_issues ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`)
        .all(...args, limit, offset);
      const summary = this.db
        .prepare('SELECT status, COUNT(*) AS count FROM data_quality_issues GROUP BY status ORDER BY count DESC')
        .all();
      const codes = (
        this.db
          .prepare('SELECT DISTINCT issue_code FROM data_quality_issues WHERE issue_code IS NOT NULL ORDER BY issue_code')
          .all() as Array<{ issue_code: string }>
      ).map((r) => r.issue_code);

      return { tab, total, limit, offset, rows, summary, codes };
    }

    const where: string[] = [];
    const args: unknown[] = [];
    if (params.code && params.code !== 'ALL') {
      where.push('quality_code = ?');
      args.push(params.code);
    }
    if (params.q && params.q.trim()) {
      const pat = `%${params.q.trim()}%`;
      where.push('(amfi_fund_name LIKE ? OR amfi_ssd_fund_id LIKE ? OR quality_code LIKE ? OR report_date LIKE ?)');
      args.push(pat, pat, pat, pat);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const total = (
      this.db.prepare(`SELECT COUNT(*) AS cnt FROM fund_aum_quality_notes ${whereClause}`).get(...args) as {
        cnt: number;
      }
    ).cnt;
    const rows = this.db
      .prepare(`SELECT * FROM fund_aum_quality_notes ${whereClause} ORDER BY report_date DESC, id ASC LIMIT ? OFFSET ?`)
      .all(...args, limit, offset);
    const summary = this.db
      .prepare('SELECT quality_code AS status, COUNT(*) AS count FROM fund_aum_quality_notes GROUP BY quality_code ORDER BY count DESC')
      .all();
    const codes = (
      this.db
        .prepare('SELECT DISTINCT quality_code FROM fund_aum_quality_notes WHERE quality_code IS NOT NULL ORDER BY quality_code')
        .all() as Array<{ quality_code: string }>
    ).map((r) => r.quality_code);

    return { tab, total, limit, offset, rows, summary, codes };
  }

  public executeReadOnlySql(rawSql: string, maxRows = 250) {
    const check = validateReadOnlySql(rawSql);
    if (!check.valid || !check.normalized) {
      throw new Error(check.error || 'Invalid SQL query.');
    }

    const runner = this.roDb ?? this.db;
    const capped = Math.min(500, Math.max(1, Math.floor(maxRows)));
    const started = performance.now();
    const stmt = runner.prepare(check.normalized);
    if (!stmt.reader) {
      throw new Error('Only read-only SELECT queries that return rows are allowed.');
    }

    const rows: Record<string, unknown>[] = [];
    let truncated = false;
    for (const row of stmt.iterate()) {
      if (rows.length >= capped) {
        truncated = true;
        break;
      }
      rows.push(row as Record<string, unknown>);
    }

    const columns = stmt.columns().map((c) => c.name);
    const durationMs = Math.round((performance.now() - started) * 100) / 100;

    return {
      columns,
      rows,
      rowCount: rows.length,
      truncated,
      maxRows: capped,
      durationMs,
    };
  }

  public getSchemaMetadata() {
    const objects = this.db
      .prepare(`
        SELECT type, name, sql
        FROM sqlite_master
        WHERE type IN ('table', 'view')
          AND name NOT LIKE 'sqlite_%'
        ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name
      `)
      .all() as Array<{ type: 'table' | 'view'; name: string; sql: string }>;

    const indexes = this.db
      .prepare(`
        SELECT name, tbl_name, sql
        FROM sqlite_master
        WHERE type = 'index' AND sql IS NOT NULL
        ORDER BY tbl_name, name
      `)
      .all() as Array<{ name: string; tbl_name: string; sql: string }>;

    const enriched = objects.map((obj) => {
      const cols = this.db.prepare(`PRAGMA table_info("${obj.name.replace(/"/g, '""')}")`).all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        pk: number;
      }>;
      let rowCount: number | null = null;
      if (obj.type === 'table') {
        rowCount = (
          this.db.prepare(`SELECT COUNT(*) AS cnt FROM "${obj.name.replace(/"/g, '""')}"`).get() as { cnt: number }
        ).cnt;
      }
      return {
        ...obj,
        rowCount,
        columns: cols,
      };
    });

    return { objects: enriched, indexes };
  }

  public isTerminalCatalogEmpty(): boolean {
    const row = this.db.prepare('SELECT COUNT(*) AS cnt FROM fund_terminal_catalog').get() as { cnt: number };
    return row.cnt === 0;
  }

  public ingestTerminalCatalogText(rawText: string, sourceFile = 'attached_amfi_nav.txt') {
    const started = performance.now();
    const totalLines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').length;
    const parsed = parseAmfiNavText(rawText, 'AMFI_TERMINAL_FILE');

    let maxDate = '';
    for (const rec of parsed.records) {
      if (rec.nav_date > maxDate) maxDate = rec.nav_date;
    }

    let activeCutoff = '2026-11-01';
    if (maxDate) {
      const dt = new Date(`${maxDate}T00:00:00Z`);
      if (!Number.isNaN(dt.getTime())) {
        dt.setUTCDate(dt.getUTCDate() - 30);
        activeCutoff = dt.toISOString().slice(0, 10);
      }
    }

    const now = new Date().toISOString();
    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO fund_terminal_catalog (
        scheme_code, isin, isin2, invalid_isin_note, scheme_name, amc, raw_category,
        structure, instrument_type, asset_class, sub_category, plan_raw, option_raw,
        plan_type, option_type, nav, nav_date, is_active, is_segregated, is_zero_nav,
        is_redeemed_flag, fund_family_key, source_file, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let activeCount = 0;
    let etfCount = 0;
    let indexFundCount = 0;
    let fofCount = 0;
    let mutualFundCount = 0;
    let segregatedCount = 0;
    let zeroNavCount = 0;

    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM fund_terminal_catalog').run();
      for (const rec of parsed.records) {
        const enriched = classifyAmfiRecord(rec, activeCutoff);
        if (enriched.is_active) activeCount++;
        if (enriched.instrument_type === 'ETF') etfCount++;
        else if (enriched.instrument_type === 'INDEX_FUND') indexFundCount++;
        else if (enriched.instrument_type === 'FOF') fofCount++;
        else mutualFundCount++;
        if (enriched.is_segregated) segregatedCount++;
        if (enriched.is_zero_nav) zeroNavCount++;

        insertStmt.run(
          enriched.scheme_code,
          enriched.isin,
          enriched.isin2,
          enriched.invalid_isin_note,
          enriched.scheme_name,
          enriched.amc,
          enriched.raw_category,
          enriched.structure,
          enriched.instrument_type,
          enriched.asset_class,
          enriched.sub_category,
          enriched.plan_raw,
          enriched.option_raw,
          enriched.plan_type,
          enriched.option_type,
          enriched.nav,
          enriched.nav_date,
          enriched.is_active,
          enriched.is_segregated,
          enriched.is_zero_nav,
          enriched.is_redeemed_flag,
          enriched.fund_family_key,
          sourceFile,
          now
        );
      }
    });
    tx();

    const durationMs = Math.round(performance.now() - started);

    this.db
      .prepare(`
        INSERT INTO terminal_ingestion_audit (
          source_file, total_lines, parsed_count, skipped_count, ignored_noise_count,
          mojibake_fixed, invalid_isin_fixed, inferred_amc_count, active_count,
          etf_count, index_fund_count, fof_count, mutual_fund_count,
          segregated_count, zero_nav_count, latest_nav_date, duration_ms, processed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        sourceFile,
        totalLines,
        parsed.records.length,
        parsed.skippedLines.length,
        parsed.ignoredNoiseLines.length,
        parsed.mojibakeFixedCount,
        parsed.invalidIsinCount,
        parsed.inferredAmcCount,
        activeCount,
        etfCount,
        indexFundCount,
        fofCount,
        mutualFundCount,
        segregatedCount,
        zeroNavCount,
        maxDate || null,
        durationMs,
        now
      );

    return {
      sourceFile,
      totalLines,
      parsedCount: parsed.records.length,
      skippedCount: parsed.skippedLines.length,
      ignoredNoiseCount: parsed.ignoredNoiseLines.length,
      mojibakeFixed: parsed.mojibakeFixedCount,
      invalidIsinFixed: parsed.invalidIsinCount,
      inferredAmcCount: parsed.inferredAmcCount,
      activeCount,
      etfCount,
      indexFundCount,
      fofCount,
      mutualFundCount,
      segregatedCount,
      zeroNavCount,
      latestNavDate: maxDate || null,
      activeCutoff,
      durationMs,
      processedAt: now,
    };
  }

  public getTerminalStats() {
    const summary = this.db
      .prepare(`
        SELECT
          COUNT(*) AS total_schemes,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_schemes,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS historical_schemes,
          SUM(CASE WHEN instrument_type = 'ETF' THEN 1 ELSE 0 END) AS etf_count,
          SUM(CASE WHEN instrument_type = 'MUTUAL_FUND' THEN 1 ELSE 0 END) AS mutual_fund_count,
          SUM(CASE WHEN instrument_type = 'INDEX_FUND' THEN 1 ELSE 0 END) AS index_fund_count,
          SUM(CASE WHEN instrument_type = 'FOF' THEN 1 ELSE 0 END) AS fof_count,
          SUM(CASE WHEN is_segregated = 1 THEN 1 ELSE 0 END) AS segregated_count,
          SUM(CASE WHEN is_zero_nav = 1 THEN 1 ELSE 0 END) AS zero_nav_count,
          COUNT(DISTINCT amc) AS unique_amcs,
          COUNT(DISTINCT fund_family_key) AS unique_fund_families,
          COUNT(DISTINCT sub_category) AS unique_sub_categories,
          MAX(nav_date) AS latest_nav_date
        FROM fund_terminal_catalog
      `)
      .get() as Record<string, number | string | null>;

    const byInstrumentType = this.db
      .prepare(`
        SELECT
          instrument_type,
          COUNT(*) AS total_count,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_count
        FROM fund_terminal_catalog
        GROUP BY instrument_type
        ORDER BY total_count DESC
      `)
      .all();

    const byAssetClass = this.db
      .prepare(`
        SELECT
          asset_class,
          COUNT(*) AS total_count,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_count
        FROM fund_terminal_catalog
        GROUP BY asset_class
        ORDER BY active_count DESC
      `)
      .all();

    const topSubCategories = this.db
      .prepare(`
        SELECT
          sub_category,
          instrument_type,
          COUNT(*) AS total_count,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_count
        FROM fund_terminal_catalog
        GROUP BY sub_category, instrument_type
        ORDER BY active_count DESC
        LIMIT 16
      `)
      .all();

    const topAmcs = this.db
      .prepare(`
        SELECT
          amc,
          COUNT(*) AS total_count,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_count,
          SUM(CASE WHEN instrument_type = 'ETF' AND is_active = 1 THEN 1 ELSE 0 END) AS active_etfs
        FROM fund_terminal_catalog
        GROUP BY amc
        ORDER BY active_count DESC
        LIMIT 12
      `)
      .all();

    const latestAudit = this.db
      .prepare('SELECT * FROM terminal_ingestion_audit ORDER BY id DESC LIMIT 1')
      .get() as Record<string, unknown> | undefined;

    const joinedCountRow = this.db
      .prepare(`
        SELECT COUNT(*) AS cnt
        FROM fund_terminal_catalog c
        INNER JOIN scheme_details d ON c.scheme_code = d.scheme_code
      `)
      .get() as { cnt: number };

    return {
      totalSchemes: Number(summary?.total_schemes ?? 0),
      activeSchemes: Number(summary?.active_schemes ?? 0),
      historicalSchemes: Number(summary?.historical_schemes ?? 0),
      etfCount: Number(summary?.etf_count ?? 0),
      mutualFundCount: Number(summary?.mutual_fund_count ?? 0),
      indexFundCount: Number(summary?.index_fund_count ?? 0),
      fofCount: Number(summary?.fof_count ?? 0),
      segregatedCount: Number(summary?.segregated_count ?? 0),
      zeroNavCount: Number(summary?.zero_nav_count ?? 0),
      uniqueAmcs: Number(summary?.unique_amcs ?? 0),
      uniqueFundFamilies: Number(summary?.unique_fund_families ?? 0),
      uniqueSubCategories: Number(summary?.unique_sub_categories ?? 0),
      latestNavDate: (summary?.latest_nav_date as string | null) ?? null,
      enrichedWithDetailsCount: joinedCountRow.cnt,
      byInstrumentType,
      byAssetClass,
      topSubCategories,
      topAmcs,
      latestAudit: latestAudit ?? null,
    };
  }

  public autocompleteTerminalFunds(params: TerminalAutocompleteParams) {
    const rawQuery = (params.q || '').trim();
    const limit = Math.min(30, Math.max(1, Math.floor(params.limit || 12)));
    const where: string[] = [];
    const args: unknown[] = [];

    if (params.instrumentType && params.instrumentType !== 'ALL') {
      where.push('c.instrument_type = ?');
      args.push(params.instrumentType);
    }
    if (params.assetClass && params.assetClass !== 'ALL') {
      where.push('c.asset_class = ?');
      args.push(params.assetClass);
    }
    if (params.activeOnly) {
      where.push('c.is_active = 1');
    }

    const tokens = rawQuery
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 4);

    for (const token of tokens) {
      const pat = `%${token}%`;
      where.push(
        '(c.scheme_name LIKE ? OR c.scheme_code LIKE ? OR c.isin LIKE ? OR c.amc LIKE ? OR c.sub_category LIKE ?)'
      );
      args.push(pat, pat, pat, pat, pat);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const exactMatch = rawQuery.toUpperCase();
    const prefixPat = `${rawQuery}%`;
    const phrasePat = `%${rawQuery}%`;

    const orderArgs: unknown[] = rawQuery ? [exactMatch, exactMatch, prefixPat, phrasePat] : [];
    const rankOrderPrefix = rawQuery
      ? `CASE
          WHEN UPPER(c.scheme_code) = ? OR UPPER(COALESCE(c.isin, '')) = ? THEN 0
          WHEN c.scheme_name LIKE ? THEN 1
          WHEN c.scheme_name LIKE ? THEN 2
          ELSE 3
        END ASC,`
      : '';

    const items = this.db
      .prepare(`
        SELECT
          c.scheme_code,
          c.isin,
          c.scheme_name,
          c.amc,
          c.structure,
          c.instrument_type,
          c.asset_class,
          c.sub_category,
          c.plan_type,
          c.option_type,
          c.nav,
          c.nav_date,
          c.is_active,
          c.is_segregated,
          c.is_zero_nav,
          c.fund_family_key,
          d.amfi_daily_fund_aum_cr_all_plans AS fund_aum_cr,
          d.ter_direct,
          d.ter_regular,
          d.amfi_daily_riskometer AS riskometer
        FROM fund_terminal_catalog c
        LEFT JOIN scheme_details d ON c.scheme_code = d.scheme_code
        ${whereClause}
        ORDER BY
          ${rankOrderPrefix}
          c.is_active DESC,
          c.is_segregated ASC,
          CASE
            WHEN c.instrument_type = 'ETF' THEN 0
            WHEN c.plan_type = 'Direct' AND c.option_type = 'Growth' THEN 1
            WHEN c.option_type = 'Growth' THEN 2
            ELSE 3
          END ASC,
          COALESCE(d.amfi_daily_fund_aum_cr_all_plans, 0) DESC,
          c.scheme_name ASC
        LIMIT ?
      `)
      .all(...args, ...orderArgs, limit);

    return {
      query: rawQuery,
      count: items.length,
      items,
    };
  }

  public getTerminalSearchIndex() {
    const items = this.db
      .prepare(`
        SELECT
          c.scheme_code,
          c.isin,
          c.scheme_name,
          c.amc,
          c.structure,
          c.instrument_type,
          c.asset_class,
          c.sub_category,
          c.plan_type,
          c.option_type,
          c.nav,
          c.nav_date,
          c.is_active,
          c.is_segregated,
          c.is_zero_nav,
          c.fund_family_key,
          d.amfi_daily_fund_aum_cr_all_plans AS fund_aum_cr,
          d.ter_direct,
          d.ter_regular,
          d.amfi_daily_riskometer AS riskometer
        FROM fund_terminal_catalog c
        LEFT JOIN scheme_details d ON c.scheme_code = d.scheme_code
        ORDER BY
          c.is_active DESC,
          c.is_segregated ASC,
          COALESCE(d.amfi_daily_fund_aum_cr_all_plans, 0) DESC,
          c.scheme_name ASC
      `)
      .all();

    return {
      count: items.length,
      items,
    };
  }

  public getTerminalFundDossier(schemeCode: string) {
    const code = schemeCode.trim();
    const fund = this.db
      .prepare(`
        SELECT
          c.*,
          d.fund_name_latest,
          d.amfi_ssd_fund_id,
          d.fund_dedup_flag,
          d.amfi_daily_fund_name,
          d.amfi_daily_fund_aum_cr_all_plans AS fund_aum_cr,
          d.amfi_daily_aum_date AS aum_date,
          d.amfi_daily_riskometer AS riskometer,
          d.amfi_daily_benchmark AS benchmark,
          d.ssd_fund_managers AS fund_managers,
          d.ssd_allotment_date AS allotment_date,
          d.ssd_exit_load AS exit_load,
          d.ssd_objective AS objective,
          d.ter_date,
          d.ter_direct,
          d.ter_regular,
          u.first_date,
          u.last_date,
          u.aaum_cr_quarterly_avg
        FROM fund_terminal_catalog c
        LEFT JOIN scheme_details d ON c.scheme_code = d.scheme_code
        LEFT JOIN scheme_universe u ON c.scheme_code = u.scheme_code
        WHERE c.scheme_code = ?
      `)
      .get(code) as Record<string, unknown> | undefined;

    if (!fund) return null;

    const familyKey = String(fund.fund_family_key);

    const shareClasses = this.db
      .prepare(`
        SELECT
          c.scheme_code,
          c.isin,
          c.isin2,
          c.scheme_name,
          c.plan_type,
          c.option_type,
          c.plan_raw,
          c.option_raw,
          c.nav,
          c.nav_date,
          c.is_active,
          c.is_segregated,
          c.is_zero_nav,
          d.amfi_ssd_fund_id,
          d.amfi_daily_fund_aum_cr_all_plans AS fund_aum_cr,
          d.amfi_daily_riskometer AS riskometer,
          d.amfi_daily_benchmark AS benchmark,
          d.ssd_fund_managers AS fund_managers,
          d.ssd_allotment_date AS allotment_date,
          d.ssd_exit_load AS exit_load,
          d.ssd_objective AS objective,
          d.ter_direct,
          d.ter_regular
        FROM fund_terminal_catalog c
        LEFT JOIN scheme_details d ON c.scheme_code = d.scheme_code
        WHERE c.fund_family_key = ?
        ORDER BY
          c.is_active DESC,
          c.is_segregated ASC,
          CASE c.plan_type WHEN 'Direct' THEN 0 WHEN 'Regular' THEN 1 ELSE 2 END ASC,
          CASE c.option_type WHEN 'Growth' THEN 0 WHEN 'IDCW' THEN 1 ELSE 2 END ASC,
          c.nav DESC
      `)
      .all(familyKey) as Array<Record<string, unknown>>;

    // Inherit fund-level metadata from sibling share class if this specific code lacked a details join
    const siblingWithDetails = shareClasses.find(
      (sc) => sc.fund_aum_cr !== null || sc.ter_direct !== null || sc.amfi_ssd_fund_id !== null
    );
    if (siblingWithDetails) {
      if (fund.fund_aum_cr === null) fund.fund_aum_cr = siblingWithDetails.fund_aum_cr;
      if (fund.ter_direct === null) fund.ter_direct = siblingWithDetails.ter_direct;
      if (fund.ter_regular === null) fund.ter_regular = siblingWithDetails.ter_regular;
      if (!fund.riskometer) fund.riskometer = siblingWithDetails.riskometer;
      if (!fund.benchmark) fund.benchmark = siblingWithDetails.benchmark;
      if (!fund.fund_managers) fund.fund_managers = siblingWithDetails.fund_managers;
      if (!fund.allotment_date) fund.allotment_date = siblingWithDetails.allotment_date;
      if (!fund.exit_load) fund.exit_load = siblingWithDetails.exit_load;
      if (!fund.objective) fund.objective = siblingWithDetails.objective;
      if (!fund.amfi_ssd_fund_id) fund.amfi_ssd_fund_id = siblingWithDetails.amfi_ssd_fund_id;
    }

    // Compute Direct vs Regular spread analytics
    const nonSegregated = shareClasses.filter((sc) => Number(sc.is_segregated) === 0 && Number(sc.nav) > 0);
    const directGrowth =
      nonSegregated.find((sc) => sc.plan_type === 'Direct' && sc.option_type === 'Growth') ||
      nonSegregated.find((sc) => sc.plan_type === 'Direct');
    const regularGrowth =
      nonSegregated.find((sc) => sc.plan_type === 'Regular' && sc.option_type === 'Growth') ||
      nonSegregated.find((sc) => sc.plan_type === 'Regular');

    const directNav = directGrowth ? Number(directGrowth.nav) : null;
    const regularNav = regularGrowth ? Number(regularGrowth.nav) : null;
    const navAdvantagePct =
      directNav !== null && regularNav !== null && regularNav > 0
        ? Math.round(((directNav - regularNav) / regularNav) * 10000) / 100
        : null;

    const terDirect = fund.ter_direct !== null && fund.ter_direct !== undefined ? Number(fund.ter_direct) : null;
    const terRegular = fund.ter_regular !== null && fund.ter_regular !== undefined ? Number(fund.ter_regular) : null;
    const terSpreadBps =
      terDirect !== null && terRegular !== null && terRegular >= terDirect
        ? Math.round((terRegular - terDirect) * 100)
        : null;

    let illustrative10YrSavingsInr: number | null = null;
    if (terDirect !== null && terRegular !== null && terRegular > terDirect) {
      const grossRate = fund.asset_class === 'Debt' ? 0.075 : 0.12;
      const principal = 1000000; // ₹10 Lakh
      const directFv = principal * Math.pow(1 + grossRate - terDirect / 100, 10);
      const regularFv = principal * Math.pow(1 + grossRate - terRegular / 100, 10);
      illustrative10YrSavingsInr = Math.round(directFv - regularFv);
    }

    const directVsRegular = {
      directSchemeCode: directGrowth ? String(directGrowth.scheme_code) : null,
      directNav,
      regularSchemeCode: regularGrowth ? String(regularGrowth.scheme_code) : null,
      regularNav,
      navAdvantagePct,
      terDirect,
      terRegular,
      terSpreadBps,
      illustrative10YrSavingsInr,
    };

    // Category peers (distinct fund families in same sub_category & instrument_type)
    const rawPeers = this.db
      .prepare(`
        SELECT
          c.scheme_code,
          c.isin,
          c.scheme_name,
          c.amc,
          c.instrument_type,
          c.asset_class,
          c.sub_category,
          c.plan_type,
          c.option_type,
          c.nav,
          c.nav_date,
          c.is_active,
          c.fund_family_key,
          d.amfi_daily_fund_aum_cr_all_plans AS fund_aum_cr,
          d.ter_direct,
          d.ter_regular,
          d.amfi_daily_riskometer AS riskometer
        FROM fund_terminal_catalog c
        LEFT JOIN scheme_details d ON c.scheme_code = d.scheme_code
        WHERE c.sub_category = ?
          AND c.instrument_type = ?
          AND c.fund_family_key != ?
          AND c.is_active = 1
          AND c.is_segregated = 0
        ORDER BY
          CASE
            WHEN c.instrument_type = 'ETF' THEN 0
            WHEN c.plan_type = 'Direct' AND c.option_type = 'Growth' THEN 1
            WHEN c.option_type = 'Growth' THEN 2
            ELSE 3
          END ASC,
          COALESCE(d.amfi_daily_fund_aum_cr_all_plans, 0) DESC,
          c.nav DESC
        LIMIT 80
      `)
      .all(String(fund.sub_category), String(fund.instrument_type), familyKey) as Array<Record<string, unknown>>;

    const seenFamilies = new Set<string>();
    const categoryPeers: Array<Record<string, unknown>> = [];
    for (const peer of rawPeers) {
      const fKey = String(peer.fund_family_key);
      if (seenFamilies.has(fKey)) continue;
      seenFamilies.add(fKey);
      categoryPeers.push(peer);
      if (categoryPeers.length >= 12) break;
    }

    // Top holdings if this fund matches one of the 24 tracked equity funds in portfolio_holdings
    let topHoldings: Array<Record<string, unknown>> = [];
    let holdingsMonthEnd: string | null = null;
    let holdingsFundCode: string | null = null;
    if (fund.amfi_ssd_fund_id) {
      const latestHoldingMeta = this.db
        .prepare(`
          SELECT fund_code, MAX(month_end) AS latest_month
          FROM v_portfolio_enriched
          WHERE amfi_ssd_fund_id = ?
          GROUP BY fund_code
          LIMIT 1
        `)
        .get(String(fund.amfi_ssd_fund_id)) as { fund_code: string; latest_month: string } | undefined;

      if (latestHoldingMeta) {
        holdingsFundCode = latestHoldingMeta.fund_code;
        holdingsMonthEnd = latestHoldingMeta.latest_month;
        topHoldings = this.db
          .prepare(`
            SELECT
              isin,
              security_name,
              nse_symbol,
              market_value_lakh,
              pct_of_fund,
              asset_group,
              asset_subgroup
            FROM v_portfolio_enriched
            WHERE fund_code = ? AND month_end = ?
            ORDER BY pct_of_fund DESC, market_value_lakh DESC
            LIMIT 10
          `)
          .all(holdingsFundCode, holdingsMonthEnd) as Array<Record<string, unknown>>;
      }
    }

    const qualityFlags = this.db
      .prepare('SELECT * FROM data_quality_issues WHERE scheme_code = ? OR name = ? LIMIT 10')
      .all(code, String(fund.fund_name_latest || fund.scheme_name || ''));

    const aumNotes = fund.amfi_ssd_fund_id
      ? this.db
          .prepare('SELECT * FROM fund_aum_quality_notes WHERE amfi_ssd_fund_id = ? ORDER BY report_date DESC LIMIT 10')
          .all(String(fund.amfi_ssd_fund_id))
      : [];

    const amcStats = this.db
      .prepare(`
        SELECT
          COUNT(*) AS total_schemes,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_schemes,
          SUM(CASE WHEN instrument_type = 'ETF' AND is_active = 1 THEN 1 ELSE 0 END) AS active_etfs
        FROM fund_terminal_catalog
        WHERE amc = ?
      `)
      .get(String(fund.amc)) as { total_schemes: number; active_schemes: number; active_etfs: number };

    return {
      fund,
      shareClasses,
      directVsRegular,
      categoryPeers,
      holdings: {
        fundCode: holdingsFundCode,
        monthEnd: holdingsMonthEnd,
        items: topHoldings,
      },
      qualityFlags,
      aumNotes,
      amcStats,
    };
  }

  public compareTerminalFunds(schemeCodes: string[]) {
    const uniqueCodes = Array.from(
      new Set(
        schemeCodes
          .map((c) => String(c || '').trim())
          .filter((c) => /^[A-Za-z0-9:_-]{1,32}$/.test(c))
      )
    ).slice(0, 4);

    const items = [];
    for (const code of uniqueCodes) {
      const dossier = this.getTerminalFundDossier(code);
      if (!dossier) continue;
      items.push({
        scheme_code: String(dossier.fund.scheme_code),
        isin: dossier.fund.isin,
        scheme_name: String(dossier.fund.scheme_name),
        amc: String(dossier.fund.amc),
        structure: String(dossier.fund.structure),
        instrument_type: String(dossier.fund.instrument_type),
        asset_class: String(dossier.fund.asset_class),
        sub_category: String(dossier.fund.sub_category),
        plan_type: String(dossier.fund.plan_type),
        option_type: String(dossier.fund.option_type),
        nav: Number(dossier.fund.nav),
        nav_date: String(dossier.fund.nav_date),
        is_active: Number(dossier.fund.is_active),
        is_segregated: Number(dossier.fund.is_segregated),
        fund_aum_cr: dossier.fund.fund_aum_cr ?? null,
        ter_direct: dossier.directVsRegular.terDirect,
        ter_regular: dossier.directVsRegular.terRegular,
        ter_spread_bps: dossier.directVsRegular.terSpreadBps,
        nav_advantage_pct: dossier.directVsRegular.navAdvantagePct,
        riskometer: dossier.fund.riskometer ?? null,
        benchmark: dossier.fund.benchmark ?? null,
        fund_managers: dossier.fund.fund_managers ?? null,
        share_class_count: dossier.shareClasses.length,
        has_holdings: dossier.holdings.items.length > 0,
      });
    }

    return { count: items.length, items };
  }

  public queryTerminalScreener(params: TerminalScreenerParams) {
    const where: string[] = [];
    const args: unknown[] = [];

    if (params.q && params.q.trim()) {
      const tokens = params.q.trim().split(/\s+/).filter(Boolean).slice(0, 4);
      for (const token of tokens) {
        const pat = `%${token}%`;
        where.push('(c.scheme_name LIKE ? OR c.scheme_code LIKE ? OR c.isin LIKE ? OR c.amc LIKE ? OR c.sub_category LIKE ?)');
        args.push(pat, pat, pat, pat, pat);
      }
    }
    if (params.instrumentType && params.instrumentType !== 'ALL') {
      where.push('c.instrument_type = ?');
      args.push(params.instrumentType);
    }
    if (params.assetClass && params.assetClass !== 'ALL') {
      where.push('c.asset_class = ?');
      args.push(params.assetClass);
    }
    if (params.subCategory && params.subCategory !== 'ALL') {
      where.push('c.sub_category = ?');
      args.push(params.subCategory);
    }
    if (params.amc && params.amc !== 'ALL') {
      where.push('c.amc = ?');
      args.push(params.amc);
    }
    if (params.activeOnly) {
      where.push('c.is_active = 1');
    }
    if (params.excludeSegregated) {
      where.push('c.is_segregated = 0');
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sortCol = ALLOWED_TERMINAL_SORT[params.sortBy || 'aum'] || ALLOWED_TERMINAL_SORT.aum;
    const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(100, Math.max(1, Math.floor(params.limit || 25)));
    const offset = Math.max(0, Math.floor(params.offset || 0));

    const total = (
      this.db
        .prepare(`
          SELECT COUNT(*) AS cnt
          FROM fund_terminal_catalog c
          LEFT JOIN scheme_details d ON c.scheme_code = d.scheme_code
          ${whereClause}
        `)
        .get(...args) as { cnt: number }
    ).cnt;

    const rows = this.db
      .prepare(`
        SELECT
          c.scheme_code,
          c.isin,
          c.scheme_name,
          c.amc,
          c.structure,
          c.instrument_type,
          c.asset_class,
          c.sub_category,
          c.plan_type,
          c.option_type,
          c.nav,
          c.nav_date,
          c.is_active,
          c.is_segregated,
          c.is_zero_nav,
          d.amfi_daily_fund_aum_cr_all_plans AS fund_aum_cr,
          d.ter_direct,
          d.ter_regular,
          d.amfi_daily_riskometer AS riskometer
        FROM fund_terminal_catalog c
        LEFT JOIN scheme_details d ON c.scheme_code = d.scheme_code
        ${whereClause}
        ORDER BY ${sortCol} ${sortDir}, c.scheme_name ASC
        LIMIT ? OFFSET ?
      `)
      .all(...args, limit, offset);

    return { total, limit, offset, rows };
  }

  public close(): void {
    if (this.roDb) {
      this.roDb.close();
      this.roDb = null;
    }
    this.db.close();
  }
}
