import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { SCREENER_FUNDS } from '../../frontend/utils/screenerEngine.ts';
import { parseBoolFlag, parseCsvRows, parseNullableFloat } from './csvParser.ts';

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

export interface TerminalSchemeRecord {
  scheme_code: string;
  isin: string | null;
  isin2: string | null;
  scheme_name: string;
  amc: string;
  instrument_type: string;
  asset_class: string;
  sub_category: string;
  plan_type: string;
  option_type: string;
  nav: number;
  nav_date: string;
  is_active: number;
  fund_aum_cr: number | null;
  ter_direct: number | null;
  ter_regular: number | null;
  riskometer: string | null;
  benchmark: string | null;
  fund_managers: string | null;
  exit_load: string | null;
  inception_date: string | null;
}

export interface TerminalCatalogStats {
  totalSchemes: number;
  activeSchemes: number;
  etfCount: number;
  indexFundCount: number;
  fofCount: number;
  mutualFundCount: number;
  amcCount: number;
  latestNavDate: string | null;
}

export interface HoldingRow {
  scheme_code: string;
  rank: number;
  name: string;
  isin: string | null;
  sector: string;
  asset_group: string;
  weight_pct: number;
}

export class FinanciaMutualFundDatabase {
  private readonly db: Database.Database;

  constructor(dbPath?: string) {
    const targetPath = dbPath ?? path.resolve(process.cwd(), 'data', 'financia_terminal_catalog.sqlite');
    if (targetPath !== ':memory:') {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }
    this.db = new Database(targetPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS terminal_schemes (
        scheme_code TEXT PRIMARY KEY,
        isin TEXT,
        isin2 TEXT,
        scheme_name TEXT NOT NULL,
        amc TEXT NOT NULL,
        instrument_type TEXT NOT NULL DEFAULT 'Mutual Fund',
        asset_class TEXT NOT NULL DEFAULT 'Equity',
        sub_category TEXT NOT NULL DEFAULT 'Flexi Cap',
        plan_type TEXT NOT NULL DEFAULT 'Direct',
        option_type TEXT NOT NULL DEFAULT 'Growth',
        nav REAL NOT NULL DEFAULT 0,
        nav_date TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        fund_aum_cr REAL,
        ter_direct REAL,
        ter_regular REAL,
        riskometer TEXT,
        benchmark TEXT,
        fund_managers TEXT,
        exit_load TEXT,
        inception_date TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_terminal_schemes_name ON terminal_schemes(scheme_name);
      CREATE INDEX IF NOT EXISTS idx_terminal_schemes_type ON terminal_schemes(instrument_type);
      CREATE INDEX IF NOT EXISTS idx_terminal_schemes_cat ON terminal_schemes(sub_category);
      CREATE INDEX IF NOT EXISTS idx_terminal_schemes_amc ON terminal_schemes(amc);

      CREATE TABLE IF NOT EXISTS scheme_holdings (
        scheme_code TEXT NOT NULL,
        rank INTEGER NOT NULL,
        name TEXT NOT NULL,
        isin TEXT,
        sector TEXT NOT NULL,
        asset_group TEXT NOT NULL DEFAULT 'Equity',
        weight_pct REAL NOT NULL,
        PRIMARY KEY (scheme_code, rank)
      );

      CREATE TABLE IF NOT EXISTS scheme_details (
        scheme_code TEXT PRIMARY KEY,
        isin TEXT,
        scheme_name TEXT,
        fund_name_latest TEXT,
        amc TEXT,
        category_group_clean TEXT,
        category_sub TEXT,
        scheme_plan TEXT,
        is_active INTEGER DEFAULT 1,
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
        source TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_scheme_details_ssd_id ON scheme_details(amfi_ssd_fund_id);
      CREATE INDEX IF NOT EXISTS idx_scheme_details_dedup ON scheme_details(fund_dedup_flag);

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
    `);
  }

  public isTerminalCatalogEmpty(): boolean {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM terminal_schemes').get() as { cnt: number };
    return (row?.cnt ?? 0) === 0;
  }

  public seedFromScreenerUniverse(): number {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO terminal_schemes (
        scheme_code, isin, isin2, scheme_name, amc, instrument_type, asset_class,
        sub_category, plan_type, option_type, nav, nav_date, is_active,
        fund_aum_cr, ter_direct, ter_regular, riskometer, benchmark, fund_managers, exit_load, inception_date
      ) VALUES (
        @scheme_code, @isin, @isin2, @scheme_name, @amc, @instrument_type, @asset_class,
        @sub_category, @plan_type, @option_type, @nav, @nav_date, @is_active,
        @fund_aum_cr, @ter_direct, @ter_regular, @riskometer, @benchmark, @fund_managers, @exit_load, @inception_date
      )
    `);

    const todayIso = new Date().toISOString().slice(0, 10);
    const tx = this.db.transaction(() => {
      let count = 0;
      for (const f of SCREENER_FUNDS) {
        const isEtf = f.instrumentType === 'ETF' || f.symbol.endsWith('BEES') || f.currency === 'USD';
        const assetClass =
          f.category.toLowerCase().includes('gold') || f.category.toLowerCase().includes('silver')
            ? 'Commodities'
            : f.category.toLowerCase().includes('debt') ||
                f.category.toLowerCase().includes('bond') ||
                f.category.toLowerCase().includes('gilt') ||
                f.category.toLowerCase().includes('liquid')
              ? 'Debt'
              : f.category.toLowerCase().includes('hybrid')
                ? 'Hybrid'
                : 'Equity';

        insert.run({
          scheme_code: f.amfiCode || f.symbol.toUpperCase(),
          isin: `INF${f.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9).padEnd(9, '0')}`,
          isin2: null,
          scheme_name: f.name,
          amc: f.exchange || 'AMFI Registered AMC',
          instrument_type: isEtf ? 'ETF' : 'Mutual Fund',
          asset_class: assetClass,
          sub_category: f.subCategory || f.category,
          plan_type: f.name.toLowerCase().includes('regular') ? 'Regular' : 'Direct',
          option_type: 'Growth',
          nav: f.price,
          nav_date: todayIso,
          is_active: 1,
          fund_aum_cr: f.keyStats?.aumSortUsdB ? Number((f.keyStats.aumSortUsdB * 8400).toFixed(1)) : null,
          ter_direct: f.keyStats?.trackingErrorPct ? Number(Math.max(0.05, f.keyStats.trackingErrorPct).toFixed(2)) : 0.45,
          ter_regular: 1.15,
          riskometer: assetClass === 'Debt' ? 'Moderate' : 'Very High',
          benchmark: 'NIFTY 500 TRI',
          fund_managers: 'Institutional Investment Desk',
          exit_load: isEtf ? 'Nil (Exchange Traded)' : '1.0% if redeemed within 365 days',
          inception_date: '2013-01-01',
        });
        count += 1;
      }
      return count;
    });

    return tx();
  }

  public upsertTerminalSchemes(records: TerminalSchemeRecord[]): number {
    if (!records.length) return 0;
    const stmt = this.db.prepare(`
      INSERT INTO terminal_schemes (
        scheme_code, isin, isin2, scheme_name, amc, instrument_type, asset_class,
        sub_category, plan_type, option_type, nav, nav_date, is_active,
        fund_aum_cr, ter_direct, ter_regular, riskometer, benchmark, fund_managers, exit_load, inception_date
      ) VALUES (
        @scheme_code, @isin, @isin2, @scheme_name, @amc, @instrument_type, @asset_class,
        @sub_category, @plan_type, @option_type, @nav, @nav_date, @is_active,
        @fund_aum_cr, @ter_direct, @ter_regular, @riskometer, @benchmark, @fund_managers, @exit_load, @inception_date
      )
      ON CONFLICT(scheme_code) DO UPDATE SET
        nav = excluded.nav,
        nav_date = excluded.nav_date,
        isin = COALESCE(excluded.isin, terminal_schemes.isin),
        is_active = excluded.is_active
    `);

    const tx = this.db.transaction((rows: TerminalSchemeRecord[]) => {
      for (const r of rows) {
        stmt.run(r);
      }
      return rows.length;
    });

    return tx(records);
  }

  public getTerminalStats(): TerminalCatalogStats {
    const row = this.db
      .prepare(
        `SELECT
          COUNT(*) as totalSchemes,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activeSchemes,
          SUM(CASE WHEN instrument_type = 'ETF' THEN 1 ELSE 0 END) as etfCount,
          SUM(CASE WHEN LOWER(scheme_name) LIKE '%index%' THEN 1 ELSE 0 END) as indexFundCount,
          SUM(CASE WHEN LOWER(scheme_name) LIKE '%fof%' OR LOWER(scheme_name) LIKE '%fund of fund%' THEN 1 ELSE 0 END) as fofCount,
          SUM(CASE WHEN instrument_type = 'Mutual Fund' THEN 1 ELSE 0 END) as mutualFundCount,
          COUNT(DISTINCT amc) as amcCount,
          MAX(nav_date) as latestNavDate
         FROM terminal_schemes`
      )
      .get() as Record<string, number | string | null>;

    return {
      totalSchemes: Number(row?.totalSchemes ?? 0),
      activeSchemes: Number(row?.activeSchemes ?? 0),
      etfCount: Number(row?.etfCount ?? 0),
      indexFundCount: Number(row?.indexFundCount ?? 0),
      fofCount: Number(row?.fofCount ?? 0),
      mutualFundCount: Number(row?.mutualFundCount ?? 0),
      amcCount: Number(row?.amcCount ?? 0),
      latestNavDate: (row?.latestNavDate as string | null) ?? null,
    };
  }

  public searchTerminalFunds(params: {
    q?: string;
    instrumentType?: string;
    category?: string;
    activeOnly?: boolean;
    limit?: number;
  }): TerminalSchemeRecord[] {
    const clauses: string[] = [];
    const bindings: Record<string, unknown> = {};

    const cleanQ = (params.q ?? '').trim();
    if (cleanQ) {
      clauses.push(
        '(scheme_code LIKE @qPrefix OR LOWER(scheme_name) LIKE @qLike OR LOWER(amc) LIKE @qLike OR LOWER(sub_category) LIKE @qLike OR UPPER(COALESCE(isin, \'\')) = @qExact)'
      );
      bindings.qPrefix = `${cleanQ}%`;
      bindings.qLike = `%${cleanQ.toLowerCase()}%`;
      bindings.qExact = cleanQ.toUpperCase();
    }

    if (params.instrumentType && params.instrumentType !== 'ALL') {
      clauses.push('LOWER(instrument_type) = LOWER(@instrumentType)');
      bindings.instrumentType = params.instrumentType;
    }

    if (params.category && params.category !== 'ALL') {
      clauses.push('(LOWER(sub_category) LIKE @catLike OR LOWER(asset_class) LIKE @catLike)');
      bindings.catLike = `%${params.category.toLowerCase()}%`;
    }

    if (params.activeOnly) {
      clauses.push('is_active = 1');
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Math.max(1, Math.min(200, Number(params.limit ?? 25)));
    bindings.limit = limit;

    return this.db
      .prepare(
        `SELECT * FROM terminal_schemes ${whereSql} ORDER BY CASE WHEN plan_type = 'Direct' THEN 0 ELSE 1 END, COALESCE(fund_aum_cr, 0) DESC, nav DESC LIMIT @limit`
      )
      .all(bindings) as TerminalSchemeRecord[];
  }

  public getTerminalFundDossier(codeOrSymbol: string): TerminalSchemeRecord | null {
    const clean = codeOrSymbol.trim();
    if (!clean) return null;

    const exact = this.db
      .prepare('SELECT * FROM terminal_schemes WHERE UPPER(scheme_code) = UPPER(?) LIMIT 1')
      .get(clean) as TerminalSchemeRecord | undefined;
    if (exact) return exact;

    const matchedScreener = SCREENER_FUNDS.find(
      (f) =>
        f.symbol.toUpperCase() === clean.toUpperCase() ||
        (f.amfiCode && f.amfiCode === clean)
    );
    if (matchedScreener) {
      const byCode = this.db
        .prepare('SELECT * FROM terminal_schemes WHERE UPPER(scheme_code) = UPPER(?) LIMIT 1')
        .get(matchedScreener.amfiCode || matchedScreener.symbol) as TerminalSchemeRecord | undefined;
      if (byCode) return byCode;
    }

    const fuzzy = this.db
      .prepare('SELECT * FROM terminal_schemes WHERE LOWER(scheme_name) LIKE ? LIMIT 1')
      .get(`%${clean.toLowerCase()}%`) as TerminalSchemeRecord | undefined;
    return fuzzy ?? null;
  }

  public getHoldings(schemeCode: string): HoldingRow[] {
    return this.db
      .prepare('SELECT * FROM scheme_holdings WHERE scheme_code = ? ORDER BY rank ASC LIMIT 25')
      .all(schemeCode) as HoldingRow[];
  }

  public findSchemeByIsinOrName(isin?: string | null, schemeName?: string | null): TerminalSchemeRecord | null {
    const cleanIsin = (isin || '').trim().toUpperCase();
    if (cleanIsin && /^IN[A-Z0-9]{10}$/.test(cleanIsin)) {
      const byIsin = this.db
        .prepare('SELECT * FROM terminal_schemes WHERE UPPER(isin) = ? OR UPPER(isin2) = ? LIMIT 1')
        .get(cleanIsin, cleanIsin) as TerminalSchemeRecord | undefined;
      if (byIsin) return byIsin;
    }

    const cleanName = (schemeName || '').trim().toLowerCase();
    if (cleanName.length >= 4) {
      const tokens = cleanName
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !['direct', 'regular', 'growth', 'plan', 'fund', 'option', 'idcw', 'mutual'].includes(t));

      if (tokens.length > 0) {
        const primary = tokens.slice(0, 3).join('%');
        const byTokens = this.db
          .prepare('SELECT * FROM terminal_schemes WHERE LOWER(scheme_name) LIKE ? ORDER BY CASE WHEN plan_type = \'Direct\' THEN 0 ELSE 1 END LIMIT 1')
          .get(`%${primary}%`) as TerminalSchemeRecord | undefined;
        if (byTokens) return byTokens;
      }
    }

    return null;
  }

  public isPortfolioHoldingsEmpty(): boolean {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM portfolio_holdings').get() as { cnt: number };
    return (row?.cnt ?? 0) === 0;
  }

  public isSchemeDetailsEmpty(): boolean {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM scheme_details').get() as { cnt: number };
    return (row?.cnt ?? 0) === 0;
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
    const limit = Math.min(500, Math.max(1, Math.floor(params.limit || 60)));
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

  public close(): void {
    this.db.close();
  }
}
