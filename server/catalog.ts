export type DatasetIngestionMode = 'sqlite' | 'parquet-remote';

export interface CatalogDatasetFile {
  format: string;
  label: string;
  role: 'data' | 'dictionary';
  url: string;
  sizeBytes: number;
  sha256?: string;
  rowCount: number;
  generatedAt: string;
  httpRangeRequests?: boolean;
}

export interface CatalogDatasetDefinition {
  id: string;
  tableName: string;
  title: string;
  description: string;
  publisher: string;
  kind: 'tool_export' | 'bulk_download';
  coverage?: string;
  dataAsOf: string;
  updateCadence: string;
  catalogRowCount: number;
  ingestionMode: DatasetIngestionMode;
  primaryIngestUrl: string;
  primaryIngestFormat: 'csv' | 'csv.gz' | 'parquet';
  parquetUrl?: string;
  docsUrl: string;
  methodologyUrl?: string;
  dictionaryUrl?: string;
  tags: string[];
  files: CatalogDatasetFile[];
}

export const ALLOWED_DATASET_HOSTS = new Set(['api.tigzig.com']);

export function isAllowedDatasetUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_DATASET_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export const MFPRO_CATALOG_META = {
  catalogVersion: 1,
  app: 'mf',
  appTitle: 'MFPRO',
  generatedAt: '2026-11-22T03:34:58Z',
  summaryUrl: 'https://api.tigzig.com/downloads',
  sourceIndexUrl: 'https://mfpro.tigzig.com/data/exports/data-catalog.json',
  repoUrl: 'https://github.com/bruce12-glitch/Financia',
} as const;

export const MFPRO_DATASETS: CatalogDatasetDefinition[] = [
  {
    id: 'mf.portfolio_holdings',
    tableName: 'portfolio_holdings',
    title: 'Mutual fund portfolio holdings / composition',
    description:
      'Monthly portfolio holdings of 24 Indian equity mutual funds across large cap, mid cap, small cap, flexi cap, focused and value categories. Multiple rows can share one ISIN within a fund-month for grouped lines (SYN*, IN9999999999); always SUM(market_value_lakh) by fund_code, month_end, isin before joining.',
    publisher: 'Fund houses (monthly portfolio disclosures); NSDL & NSE ISIN reference',
    kind: 'tool_export',
    coverage: '2025-06-30 to 2026-10-31 (13 month-ends)',
    dataAsOf: '2026-10-31',
    updateCadence: 'monthly',
    catalogRowCount: 24120,
    ingestionMode: 'sqlite',
    primaryIngestUrl: 'https://api.tigzig.com/downloads/mf_portfolio_holdings.csv',
    primaryIngestFormat: 'csv',
    docsUrl: 'https://www.tigzig.com/mfpro/composition-methodology',
    methodologyUrl: 'https://www.tigzig.com/mfpro/composition-methodology',
    tags: ['mutual funds', 'india', 'portfolio holdings', 'equity', 'isin'],
    files: [
      {
        format: 'csv',
        label: 'CSV',
        role: 'data',
        url: 'https://api.tigzig.com/downloads/mf_portfolio_holdings.csv',
        sizeBytes: 5218953,
        sha256: 'bff0025ded0d9bd0e9ea0d4cf4375d178e3d561618350be6ad0b9e7684321ca2',
        rowCount: 24120,
        generatedAt: '2026-11-20T04:35:51Z',
      },
    ],
  },
  {
    id: 'mf.portfolio_isin_mappings',
    tableName: 'portfolio_isin_mappings',
    title: 'Portfolio holdings: ISIN mappings',
    description:
      'Every as-filed ISIN mapped under another code in portfolio_holdings, covering corporate actions (splits, face value changes) and issuer-aggregated CDs, CPs, T-bills, and G-secs under synthetic SYN codes.',
    publisher: 'Fund houses (monthly portfolio disclosures); NSDL & NSE ISIN reference',
    kind: 'tool_export',
    coverage: '2025-06-30 to 2026-10-31 (13 month-ends)',
    dataAsOf: '2026-10-31',
    updateCadence: 'monthly',
    catalogRowCount: 323,
    ingestionMode: 'sqlite',
    primaryIngestUrl: 'https://api.tigzig.com/downloads/mf_portfolio_isin_mappings.csv',
    primaryIngestFormat: 'csv',
    docsUrl: 'https://www.tigzig.com/mfpro/composition-methodology',
    methodologyUrl: 'https://www.tigzig.com/mfpro/composition-methodology',
    tags: ['mutual funds', 'isin', 'corporate actions'],
    files: [
      {
        format: 'csv',
        label: 'CSV',
        role: 'data',
        url: 'https://api.tigzig.com/downloads/mf_portfolio_isin_mappings.csv',
        sizeBytes: 41175,
        sha256: '8d12232f2f88cba292dc988a90523ed4e3dd3efeef6c379efe238c55c0e49004',
        rowCount: 323,
        generatedAt: '2026-11-20T04:35:51Z',
      },
    ],
  },
  {
    id: 'mf.nav_latest',
    tableName: 'scheme_universe',
    title: 'Scheme universe with latest NAV',
    description:
      'One row per scheme across the full AMFI universe (including Specialized Investment Funds / SIF): both ISINs, AMC, category, plan, option, first and last NAV dates, latest NAV, and quarterly average AUM.',
    publisher: 'AMFI (Association of Mutual Funds in India)',
    kind: 'bulk_download',
    dataAsOf: '2026-11-22',
    updateCadence: '3x daily',
    catalogRowCount: 38557,
    ingestionMode: 'sqlite',
    primaryIngestUrl: 'https://api.tigzig.com/mf/v1/download/amfi_nav_master_latest.csv.gz',
    primaryIngestFormat: 'csv.gz',
    parquetUrl: 'https://api.tigzig.com/mf/v1/download/amfi_nav_master_latest.parquet',
    docsUrl: 'https://www.tigzig.com/apis/mf-nav',
    methodologyUrl: 'https://www.tigzig.com/mfpro/how-the-data-is-built',
    dictionaryUrl: 'https://www.tigzig.com/mfpro/data-dictionary',
    tags: ['mutual funds', 'nav', 'scheme master', 'aum'],
    files: [
      {
        format: 'csv.gz',
        label: 'CSV.gz',
        role: 'data',
        url: 'https://api.tigzig.com/mf/v1/download/amfi_nav_master_latest.csv.gz',
        sizeBytes: 1196167,
        rowCount: 38557,
        generatedAt: '2026-11-21T18:40:25Z',
      },
      {
        format: 'parquet',
        label: 'Parquet',
        role: 'data',
        url: 'https://api.tigzig.com/mf/v1/download/amfi_nav_master_latest.parquet',
        sizeBytes: 1649782,
        rowCount: 38557,
        generatedAt: '2026-11-21T18:40:25Z',
        httpRangeRequests: true,
      },
    ],
  },
  {
    id: 'mf.scheme_details_latest',
    tableName: 'scheme_details',
    title: 'Scheme details: AUM, scheme document & TER',
    description:
      'AMFI daily fund size, riskometers, benchmark, scheme summary document (fund managers, allotment date, objective, exit load) and latest Direct/Regular TER. Total fund AUM only where fund_dedup_flag = 1; join amfi_ssd_fund_id as TEXT.',
    publisher: 'AMFI (Association of Mutual Funds in India)',
    kind: 'bulk_download',
    dataAsOf: '2026-11-19',
    updateCadence: '4x daily',
    catalogRowCount: 11478,
    ingestionMode: 'sqlite',
    primaryIngestUrl: 'https://api.tigzig.com/mf/v1/download/scheme_details_latest.csv.gz',
    primaryIngestFormat: 'csv.gz',
    parquetUrl: 'https://api.tigzig.com/mf/v1/download/scheme_details_latest.parquet',
    docsUrl: 'https://www.tigzig.com/apis/mf-nav',
    methodologyUrl: 'https://www.tigzig.com/mfpro/how-the-data-is-built',
    dictionaryUrl: 'https://www.tigzig.com/mfpro/data-dictionary',
    tags: ['mutual funds', 'aum', 'ter', 'fund managers', 'riskometer'],
    files: [
      {
        format: 'csv.gz',
        label: 'CSV.gz',
        role: 'data',
        url: 'https://api.tigzig.com/mf/v1/download/scheme_details_latest.csv.gz',
        sizeBytes: 2895121,
        rowCount: 11478,
        generatedAt: '2026-11-21T23:45:16Z',
      },
      {
        format: 'parquet',
        label: 'Parquet',
        role: 'data',
        url: 'https://api.tigzig.com/mf/v1/download/scheme_details_latest.parquet',
        sizeBytes: 1304523,
        rowCount: 11478,
        generatedAt: '2026-11-21T23:45:16Z',
        httpRangeRequests: true,
      },
    ],
  },
  {
    id: 'mf.data_quality',
    tableName: 'data_quality_issues',
    title: 'Scheme details: unmatched & conflict audit',
    description:
      'Rows where AMFI daily feed and scheme summary documents could not be matched cleanly (benchmark naming variants, riskometer conflicts, unmatched fund links).',
    publisher: 'AMFI (Association of Mutual Funds in India)',
    kind: 'bulk_download',
    dataAsOf: '2026-11-19',
    updateCadence: '4x daily',
    catalogRowCount: 571,
    ingestionMode: 'sqlite',
    primaryIngestUrl: 'https://api.tigzig.com/mf/v1/download/data_quality.csv',
    primaryIngestFormat: 'csv',
    docsUrl: 'https://www.tigzig.com/apis/mf-nav',
    methodologyUrl: 'https://www.tigzig.com/mfpro/how-the-data-is-built',
    dictionaryUrl: 'https://www.tigzig.com/mfpro/data-dictionary',
    tags: ['mutual funds', 'data quality'],
    files: [
      {
        format: 'csv',
        label: 'CSV',
        role: 'data',
        url: 'https://api.tigzig.com/mf/v1/download/data_quality.csv',
        sizeBytes: 165755,
        rowCount: 571,
        generatedAt: '2026-11-21T23:45:16Z',
      },
    ],
  },
  {
    id: 'mf.fund_aum_quality',
    tableName: 'fund_aum_quality_notes',
    title: 'Daily fund size: AUM anomaly notes',
    description:
      'Every fund-day in the daily fund size history carrying a quality annotation (unit slip corrected, bad AMFI file, copied/swapped figure, one-day bad print, cash fund swing).',
    publisher: 'AMFI (Association of Mutual Funds in India)',
    kind: 'bulk_download',
    dataAsOf: '2026-11-19',
    updateCadence: '3x daily',
    catalogRowCount: 471,
    ingestionMode: 'sqlite',
    primaryIngestUrl: 'https://api.tigzig.com/mf/v1/download/fund_aum_quality.csv',
    primaryIngestFormat: 'csv',
    docsUrl: 'https://www.tigzig.com/apis/mf-nav',
    methodologyUrl: 'https://www.tigzig.com/mfpro/daily-fund-size',
    dictionaryUrl: 'https://www.tigzig.com/mfpro/data-dictionary',
    tags: ['mutual funds', 'aum', 'data quality'],
    files: [
      {
        format: 'csv',
        label: 'CSV',
        role: 'data',
        url: 'https://api.tigzig.com/mf/v1/download/fund_aum_quality.csv',
        sizeBytes: 36702,
        rowCount: 471,
        generatedAt: '2026-11-21T04:24:30Z',
      },
    ],
  },
  {
    id: 'mf.fund_aum_daily',
    tableName: 'fund_aum_daily (Parquet Remote)',
    title: 'Daily fund size (AUM) history since 2019',
    description:
      'One row per fund per AMFI report date from 11 February 2019 (2.45M rows). Queryable in place via HTTP Range requests on Parquet using DuckDB, Polars, or PyArrow.',
    publisher: 'AMFI (Association of Mutual Funds in India)',
    kind: 'bulk_download',
    coverage: '2019-02-11 to 2026-11-19',
    dataAsOf: '2026-11-19',
    updateCadence: '3x daily',
    catalogRowCount: 2455348,
    ingestionMode: 'parquet-remote',
    primaryIngestUrl: 'https://api.tigzig.com/mf/v1/download/fund_aum_daily.parquet',
    primaryIngestFormat: 'parquet',
    parquetUrl: 'https://api.tigzig.com/mf/v1/download/fund_aum_daily.parquet',
    docsUrl: 'https://www.tigzig.com/apis/mf-nav',
    methodologyUrl: 'https://www.tigzig.com/mfpro/daily-fund-size',
    dictionaryUrl: 'https://www.tigzig.com/mfpro/data-dictionary',
    tags: ['mutual funds', 'aum', 'time series', 'parquet'],
    files: [
      {
        format: 'parquet',
        label: 'Parquet',
        role: 'data',
        url: 'https://api.tigzig.com/mf/v1/download/fund_aum_daily.parquet',
        sizeBytes: 29194606,
        rowCount: 2455348,
        generatedAt: '2026-11-21T04:24:30Z',
        httpRangeRequests: true,
      },
      {
        format: 'csv.gz',
        label: 'CSV.gz',
        role: 'data',
        url: 'https://api.tigzig.com/mf/v1/download/fund_aum_daily.csv.gz',
        sizeBytes: 41932254,
        rowCount: 2455348,
        generatedAt: '2026-11-21T04:24:30Z',
      },
    ],
  },
  {
    id: 'mf.nav_history',
    tableName: 'nav_history (Parquet Remote)',
    title: 'Full NAV history, every scheme, every day',
    description:
      '37.8M rows from April 2006 to today for every AMFI scheme including matured, merged, and Specialized Investment Funds (SIF). Supports HTTP Range requests for zero-download DuckDB SQL queries.',
    publisher: 'AMFI (Association of Mutual Funds in India)',
    kind: 'bulk_download',
    coverage: '2006-04-01 to 2026-11-22',
    dataAsOf: '2026-11-22',
    updateCadence: '3x daily',
    catalogRowCount: 37823677,
    ingestionMode: 'parquet-remote',
    primaryIngestUrl: 'https://api.tigzig.com/mf/v1/download/amfi_nav_master.parquet',
    primaryIngestFormat: 'parquet',
    parquetUrl: 'https://api.tigzig.com/mf/v1/download/amfi_nav_master.parquet',
    docsUrl: 'https://www.tigzig.com/apis/mf-nav',
    methodologyUrl: 'https://www.tigzig.com/mfpro/how-the-data-is-built',
    dictionaryUrl: 'https://www.tigzig.com/mfpro/data-dictionary',
    tags: ['mutual funds', 'nav', 'amfi', 'time series', 'parquet'],
    files: [
      {
        format: 'parquet',
        label: 'Parquet',
        role: 'data',
        url: 'https://api.tigzig.com/mf/v1/download/amfi_nav_master.parquet',
        sizeBytes: 179094354,
        rowCount: 37823677,
        generatedAt: '2026-11-21T18:40:25Z',
        httpRangeRequests: true,
      },
      {
        format: 'sqlite.gz',
        label: 'SQLite.gz',
        role: 'data',
        url: 'https://api.tigzig.com/mf/v1/download/amfi_nav_master.db.gz',
        sizeBytes: 712469374,
        rowCount: 37823677,
        generatedAt: '2026-11-21T18:40:25Z',
      },
    ],
  },
];

export const SEED_AMFI_INTERVAL_FEED = `Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date
Interval Fund Schemes(Income)
Kotak Mahindra Mutual Fund
146839;-;INF174KA1DD0;Kotak Monthly Interval Plan Series 4;;;10.0087785;17-Apr-2019
146837;INF174KA1DB4;-;Kotak Monthly Interval Plan Series 4;;;0.0001;22-Apr-2019
146840;-;INF174KA1DC2;Kotak Monthly Interval Plan Series 4;;;10.00871954;17-Apr-2019
146835;INF174KA1CZ5;-;Kotak Monthly Interval Plan Series 4;;;10.07183073;17-Apr-2019
145440;INF174KA1913;-;Kotak Quarterly Interval Plan Sr. 12;;;10.40029408;05-May-2019
145441;INF174KA1863;-;Kotak Quarterly Interval Plan Sr. 12;;;10.018167;05-May-2019
145437;INF174KA1889;-;Kotak Quarterly Interval Plan Sr. 12;;;10.39494886;05-May-2019
146602;INF174KA1CI1;-;Kotak Quarterly Interval Plan Sr. 13;;;10.0036;30-May-2019
146599;INF174KA1CJ9;-;Kotak Quarterly Interval Plan Sr. 13;;;10.1855;30-May-2019
146598;INF174KA1CG5;-;Kotak Quarterly Interval Plan Sr. 13;;;10.0029;30-May-2019
146601;INF174KA1CH3;-;Kotak Quarterly Interval Plan Sr. 13;;;10.1862;30-May-2019
Nippon India Mutual Fund
118804;INF204K01B81;-;Nippon India Interval Fund Annual Interval Fund Series-I;;;28.6530;22-Apr-2026
105660;INF204K01ED4;INF204K01EE2;Nippon India Interval Fund Annual Interval Fund Series-I;;;13.3009;22-Apr-2026
105662;INF204K01EA0;INF204K01EB8;Nippon India Interval Fund Annual Interval Fund Series-I;;;13.2403;22-Apr-2026
105663;INF204K01EC6;-;Nippon India Interval Fund Annual Interval Fund Series-I;;;28.3256;22-Apr-2026
105661;INF204K01DZ9;-;Nippon India Interval Fund Annual Interval Fund Series-I;;;38.0238;22-Apr-2026
145667;INF204KB1P74;-;Nippon India Interval Fund V - Series 2;;;10.0000;19-Dec-2019
145670;INF204KB1P66;-;Nippon India Interval Fund V - Series 2;;;10.8556;19-Dec-2019
145668;INF204KB1P58;-;Nippon India Interval Fund V - Series 2;;;10.0001;19-Dec-2019
145669;INF204KB1P41;-;Nippon India Interval Fund V - Series 2;;;10.8332;19-Dec-2019
145348;INF204KB1M51;-;Nippon India Interval Fund V- Series 1;;;10.0000;31-Oct-2019
145350;INF204KB1M44;-;Nippon India Interval Fund V- Series 1;;;10.8758;31-Oct-2019
145349;INF204KB1M36;-;Nippon India Interval Fund V- Series 1;;;10.0000;31-Oct-2019
145347;INF204KB1M28;-;Nippon India Interval Fund V- Series 1;;;10.8539;31-Oct-2019
105691;INF204K01DR6;INF204K01DS4;Nippon India Interval Fund-Quarterly Interval Fund Serie-II;Regular Plan;Institutional Plan -Dividend Option;10.0304;07-Nov-2016
105689;INF204K01DN5;-;Nippon India Interval Fund-Quarterly Interval Fund Serie-II;Regular Plan;Growth Option;38.9422;20-Nov-2026
118689;INF204K01F46;INF204K01F53;Nippon India Interval Fund-Quarterly Interval Fund Serie-II;Direct Plan;IDCW Option;13.7079;20-Nov-2026
118691;INF204K01F61;-;Nippon India Interval Fund-Quarterly Interval Fund Serie-II;Direct Plan;Growth Option;39.5575;20-Nov-2026
105692;INF204K01DO3;INF204K01DP0;Nippon India Interval Fund-Quarterly Interval Fund Serie-II;Regular Plan;IDCW Option;13.6550;20-Nov-2026
120800;INF204K01M47;INF204K01M54;Nippon India Yearly Interval Fund - Series 1;;;10.0000;23-Feb-2021
120799;INF204K01M39;-;Nippon India Yearly Interval Fund - Series 1;;;18.4492;23-Feb-2021
120802;INF204K01M13;INF204K01M21;Nippon India Yearly Interval Fund - Series 1;;;10.0000;23-Feb-2021
120798;INF204K01M05;-;Nippon India Yearly Interval Fund - Series 1;;;18.3223;23-Feb-2021
134888;INF204KA12F4;-;Reliance Interval Fund -IV - Series 2 (1110 days);;;12.9909;02-Jul-2018
134890;INF204KA13F2;-;Reliance Interval Fund -IV - Series 2 (1110 days);;;12.9909;02-Jul-2018
134889;INF204KA10F8;-;Reliance Interval Fund -IV - Series 2 (1110 days);;;12.721;02-Jul-2018
134891;INF204KA11F6;-;Reliance Interval Fund -IV - Series 2 (1110 days);;;12.721;02-Jul-2018
135001;INF204KA14I4;-;Reliance Interval Fund IV- Series 3;;;12.6668;02-Jul-2018
134999;INF204KA15I1;-;Reliance Interval Fund IV- Series 3;;;12.6668;02-Jul-2018
135000;INF204KA12I8;-;Reliance Interval Fund IV- Series 3;;;12.4325;02-Jul-2018
135002;INF204KA13I6;-;Reliance Interval Fund IV- Series 3;;;12.4325;02-Jul-2018`;
