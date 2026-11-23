import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { SCREENER_FUNDS } from '../frontend/utils/screenerEngine.ts';

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
}
