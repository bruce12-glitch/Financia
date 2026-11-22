export interface ParquetProbeResult {
  datasetId: string;
  url: string;
  httpStatus: number;
  supportsRangeRequests: boolean;
  validParquetMagic: boolean;
  footerMagic: string;
  footerLengthBytes: number | null;
  contentRange: string | null;
  etag: string | null;
  lastModified: string | null;
  rateLimitRemaining: string | null;
  rateLimitRemainingDay: string | null;
  latencyMs: number;
  checkedAt: string;
}

export interface CatalogDataset {
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
  localRowCount: number;
  ingestionMode: 'sqlite' | 'parquet-remote';
  primaryIngestUrl: string;
  primaryIngestFormat: string;
  parquetUrl?: string;
  docsUrl: string;
  syncStatus: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  parquetProbe: ParquetProbeResult | null;
}

export interface SyncRunRecord {
  id: number;
  dataset_id: string;
  table_name: string;
  status: string;
  rows_ingested: number;
  duration_ms: number;
  source_url: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface OverviewResponse {
  engine: string;
  dbFile: string;
  dbSizeBytes: number;
  totalLocalRows: number;
  counts: Record<string, number>;
  tables: Array<{
    tableName: string;
    label: string;
    datasetId: string;
    rowCount: number;
    kind: 'table' | 'view';
  }>;
  kpis: {
    totalLocalRows: number;
    totalDedupAumCr: number;
    dedupFundCount: number;
    latestAumDate: string | null;
    totalSchemes: number;
    activeSchemes: number;
    sifSchemes: number;
    amcCount: number;
    latestNavDate: string | null;
    trackedEquityFunds: number;
    holdingsMonthCount: number;
    holdingsCoverage: string;
    openQualityFlags: number;
    amfiFeedRows: number;
  };
  topAmcsByAum: Array<{
    amc: string;
    fund_count: number;
    total_aum_cr: number;
  }>;
  datasets: CatalogDataset[];
  recentSyncRuns: SyncRunRecord[];
  catalogMeta: {
    catalogVersion: number;
    app: string;
    appTitle: string;
    generatedAt: string;
    summaryUrl: string;
    sourceIndexUrl: string;
    repoUrl: string;
  };
}

export interface SchemeRow {
  scheme_code: string;
  isin: string | null;
  isin2: string | null;
  scheme_name: string;
  amc: string | null;
  category_group_clean: string | null;
  category_sub: string | null;
  scheme_plan: string | null;
  scheme_option: string | null;
  is_active: number;
  nav: number | null;
  nav_date: string | null;
  source: string;
  aaum_cr_quarterly_avg: number | null;
  amfi_ssd_fund_id: string | null;
  fund_dedup_flag: number | null;
  amfi_daily_fund_aum_cr_all_plans: number | null;
  amfi_daily_aum_date: string | null;
  amfi_daily_riskometer: string | null;
  amfi_daily_benchmark: string | null;
  ter_direct: number | null;
  ter_regular: number | null;
  ssd_fund_managers: string | null;
}

export interface SchemeDossierResponse {
  scheme: SchemeRow & {
    fund_name_latest?: string | null;
    ssd_allotment_date?: string | null;
    ssd_exit_load?: string | null;
    ssd_objective?: string | null;
    ter_date?: string | null;
    first_date?: string | null;
    last_date?: string | null;
  };
  amfiFeedEntries: AmfiNavRow[];
  qualityFlags: DataQualityIssueRow[];
  aumNotes: AumQualityNoteRow[];
}

export interface HoldingRow {
  id?: number;
  fund_code: string;
  fund_name: string;
  fund_category: string | null;
  month_end: string;
  isin: string;
  security_name: string;
  nse_symbol: string | null;
  market_value_lakh: number;
  quantity: number;
  pct_of_fund: number;
  asset_group: string | null;
  asset_subgroup: string | null;
  mapping_category: string | null;
  mapping_reason: string | null;
  isin_as_filed?: string | null;
  instrument_name_as_filed?: string | null;
  amfi_ssd_fund_id: string | null;
  isin_type: string | null;
  line_count?: number;
  amc?: string | null;
  fund_aum_cr?: number | null;
  riskometer?: string | null;
  ter_direct?: number | null;
  ter_regular?: number | null;
}

export interface IsinMappingRow {
  isin_as_filed: string;
  isin: string;
  security_name: string;
  mapping_category: string;
  mapping_reason: string | null;
  first_month: string | null;
  last_month: string | null;
  funds: number;
  rows: number;
}

export interface AmfiNavRow {
  scheme_code: string;
  nav_date: string;
  nav: number;
  scheme_name: string;
  isin_div_payout_growth: string | null;
  isin_div_reinvestment: string | null;
  amc: string | null;
  scheme_category_header: string | null;
  plan: string | null;
  option_name: string | null;
  source: string;
  ingested_at: string;
}

export interface DataQualityIssueRow {
  id: number;
  source: string | null;
  as_of: string | null;
  scheme_code: string | null;
  name: string | null;
  category: string | null;
  issue_code: string | null;
  issue: string | null;
  status: string | null;
  detail: string | null;
}

export interface AumQualityNoteRow {
  id: number;
  amfi_ssd_fund_id: string | null;
  amfi_fund_name: string | null;
  report_date: string | null;
  aum_cr_as_filed: number | null;
  aum_cr: number | null;
  quality_code: string | null;
}

export interface SchemaObject {
  type: 'table' | 'view';
  name: string;
  sql: string;
  rowCount: number | null;
  columns: Array<{
    cid: number;
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>;
}

export interface TerminalAuditRecord {
  id?: number;
  source_file: string;
  total_lines: number;
  parsed_count: number;
  skipped_count: number;
  ignored_noise_count: number;
  mojibake_fixed: number;
  invalid_isin_fixed: number;
  inferred_amc_count: number;
  active_count: number;
  etf_count: number;
  index_fund_count: number;
  fof_count: number;
  mutual_fund_count: number;
  segregated_count: number;
  zero_nav_count: number;
  latest_nav_date: string | null;
  duration_ms: number;
  processed_at: string;
}

export interface TerminalStatsResponse {
  totalSchemes: number;
  activeSchemes: number;
  historicalSchemes: number;
  etfCount: number;
  mutualFundCount: number;
  indexFundCount: number;
  fofCount: number;
  segregatedCount: number;
  zeroNavCount: number;
  uniqueAmcs: number;
  uniqueFundFamilies: number;
  uniqueSubCategories: number;
  latestNavDate: string | null;
  enrichedWithDetailsCount: number;
  byInstrumentType: Array<{ instrument_type: string; total_count: number; active_count: number }>;
  byAssetClass: Array<{ asset_class: string; total_count: number; active_count: number }>;
  topSubCategories: Array<{
    sub_category: string;
    instrument_type: string;
    total_count: number;
    active_count: number;
  }>;
  topAmcs: Array<{ amc: string; total_count: number; active_count: number; active_etfs: number }>;
  latestAudit: TerminalAuditRecord | null;
}

export interface TerminalFundSummary {
  scheme_code: string;
  isin: string | null;
  isin2?: string | null;
  invalid_isin_note?: string | null;
  scheme_name: string;
  amc: string;
  raw_category?: string | null;
  structure: string;
  instrument_type: 'ETF' | 'INDEX_FUND' | 'FOF' | 'MUTUAL_FUND';
  asset_class: string;
  sub_category: string;
  plan_type: string;
  option_type: string;
  nav: number;
  nav_date: string;
  is_active: number;
  is_segregated: number;
  is_zero_nav: number;
  is_redeemed_flag?: number;
  fund_family_key: string;
  fund_aum_cr: number | null;
  ter_direct: number | null;
  ter_regular: number | null;
  riskometer: string | null;
}

export interface TerminalShareClass {
  scheme_code: string;
  isin: string | null;
  isin2: string | null;
  scheme_name: string;
  plan_type: string;
  option_type: string;
  plan_raw: string | null;
  option_raw: string | null;
  nav: number;
  nav_date: string;
  is_active: number;
  is_segregated: number;
  is_zero_nav: number;
  fund_aum_cr: number | null;
  ter_direct: number | null;
  ter_regular: number | null;
}

export interface TerminalHoldingItem {
  isin: string;
  security_name: string;
  nse_symbol: string | null;
  market_value_lakh: number;
  pct_of_fund: number;
  asset_group: string | null;
  asset_subgroup: string | null;
}

export interface TerminalFundDossier {
  fund: TerminalFundSummary & {
    fund_name_latest?: string | null;
    amfi_ssd_fund_id?: string | null;
    aum_date?: string | null;
    benchmark?: string | null;
    fund_managers?: string | null;
    allotment_date?: string | null;
    exit_load?: string | null;
    objective?: string | null;
    ter_date?: string | null;
    first_date?: string | null;
    last_date?: string | null;
    aaum_cr_quarterly_avg?: number | null;
  };
  shareClasses: TerminalShareClass[];
  directVsRegular: {
    directSchemeCode: string | null;
    directNav: number | null;
    regularSchemeCode: string | null;
    regularNav: number | null;
    navAdvantagePct: number | null;
    terDirect: number | null;
    terRegular: number | null;
    terSpreadBps: number | null;
    illustrative10YrSavingsInr: number | null;
  };
  categoryPeers: TerminalFundSummary[];
  holdings: {
    fundCode: string | null;
    monthEnd: string | null;
    items: TerminalHoldingItem[];
  };
  qualityFlags: DataQualityIssueRow[];
  aumNotes: AumQualityNoteRow[];
  amcStats: {
    total_schemes: number;
    active_schemes: number;
    active_etfs: number;
  };
}

export interface TerminalCompareItem {
  scheme_code: string;
  isin: string | null;
  scheme_name: string;
  amc: string;
  structure: string;
  instrument_type: 'ETF' | 'INDEX_FUND' | 'FOF' | 'MUTUAL_FUND';
  asset_class: string;
  sub_category: string;
  plan_type: string;
  option_type: string;
  nav: number;
  nav_date: string;
  is_active: number;
  is_segregated: number;
  fund_aum_cr: number | null;
  ter_direct: number | null;
  ter_regular: number | null;
  ter_spread_bps: number | null;
  nav_advantage_pct: number | null;
  riskometer: string | null;
  benchmark: string | null;
  fund_managers: string | null;
  share_class_count: number;
  has_holdings: boolean;
}

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatCr(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n >= 100000) {
    return `₹${(n / 100000).toFixed(2)} L Cr`;
  }
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(n)} Cr`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatShortTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
