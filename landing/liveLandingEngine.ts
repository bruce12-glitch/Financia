export interface FeaturedAmfiScheme {
  schemeCode: number;
  shortLabel: string;
  pillar: 'Equity MF' | 'Mid Cap MF' | 'Gold FoF' | 'Index Fund' | 'Gilt Debt' | 'Corporate Debt';
  workspaceTicker: string;
}

/**
 * Verified active AMFI Direct Plan - Growth scheme codes queried live via /api/mfnav/fund/:code.
 * No prices, returns, or AUM figures are hardcoded here — all numbers load live from AMFI/mfnav.in.
 */
export const FEATURED_AMFI_SCHEMES: FeaturedAmfiScheme[] = [
  {
    schemeCode: 122639,
    shortLabel: 'Parag Parikh Flexi Cap',
    pillar: 'Equity MF',
    workspaceTicker: 'PPFAS',
  },
  {
    schemeCode: 118989,
    shortLabel: 'HDFC Mid Cap Direct',
    pillar: 'Mid Cap MF',
    workspaceTicker: 'PPFAS',
  },
  {
    schemeCode: 119788,
    shortLabel: 'SBI Gold Direct',
    pillar: 'Gold FoF',
    workspaceTicker: 'GOLDBEES',
  },
  {
    schemeCode: 120716,
    shortLabel: 'UTI Nifty 50 Index',
    pillar: 'Index Fund',
    workspaceTicker: 'NIFTYBEES',
  },
  {
    schemeCode: 119707,
    shortLabel: 'SBI Gilt Direct',
    pillar: 'Gilt Debt',
    workspaceTicker: 'SBIGILT',
  },
  {
    schemeCode: 118987,
    shortLabel: 'HDFC Corporate Bond',
    pillar: 'Corporate Debt',
    workspaceTicker: 'HDFCCORP',
  },
];

export const BENCHMARK_INDEX_SCHEME_CODE = 120716;

export interface MfnavMetricStats {
  n?: number;
  mean?: number | null;
  median?: number | null;
  enough?: boolean;
}

export interface MfnavFundPayload {
  scheme_code: number;
  scheme_name: string;
  fund_house: string;
  plan_type: string;
  option_type: string;
  isin: string | null;
  category: string;
  sub_category: string;
  latest_nav_date: string;
  latest_nav: number;
  latest_day_change_pct: number | null;
  scheme_launch_date?: string | null;
  aum_period?: string | null;
  average_aum_lakhs?: number | null;
  last_updated?: string | null;
  source?: string | null;
  daily_metrics?: {
    as_of_date?: string;
    cagr_1y?: number | null;
    cagr_3y?: number | null;
    cagr_5y?: number | null;
    cagr_10y?: number | null;
    cagr_inception?: number | null;
    vol_1y?: number | null;
    vol_3y?: number | null;
    vol_5y?: number | null;
    max_dd_1y?: number | null;
    max_dd_3y?: number | null;
    max_dd_5y?: number | null;
    sharpe_3y?: number | null;
    sharpe_5y?: number | null;
    sortino_3y?: number | null;
    calmar_3y?: number | null;
  };
  category_metrics?: {
    sub_category?: string;
    plan_type?: string;
    n_funds?: number;
    metrics?: Record<string, MfnavMetricStats>;
  };
}

export interface MfnavSearchItem {
  scheme_code: number;
  scheme_name: string;
  fund_house: string;
  plan_type: string;
  option_type: string;
  isin: string | null;
  category: string;
  sub_category: string;
}

export interface MfnavNavPoint {
  nav_date: string;
  nav: number;
  day_change_pct?: number | null;
}

export interface RebasedNavComparisonPoint {
  date: string;
  label: string;
  schemeIndex: number;
  benchmarkIndex: number;
  schemeNav: number;
  benchmarkNav: number;
}

export interface RebasedNavComparisonResult {
  points: RebasedNavComparisonPoint[];
  startDate: string;
  endDate: string;
  schemeReturnPct: number;
  benchmarkReturnPct: number;
  spreadPct: number;
}

export interface TreasuryTenorPoint {
  label: string;
  yieldPct: number;
}

export interface YieldCurveAnalytics {
  twoYearPct: number | null;
  tenYearPct: number | null;
  threeMonthPct: number | null;
  spread2s10sBps: number | null;
  spread3m10yBps: number | null;
  regime: 'Normal' | 'Flat' | 'Inverted' | 'Unavailable';
}

export interface BullionCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BullionSummary {
  latestClose: number;
  periodChangePct: number;
  periodHigh: number;
  periodLow: number;
  candleCount: number;
}

export function formatAumCrores(aumLakhs: number | null | undefined): string {
  if (typeof aumLakhs !== 'number' || !Number.isFinite(aumLakhs) || aumLakhs <= 0) {
    return '—';
  }
  const crores = aumLakhs / 100;
  return `₹${Math.round(crores).toLocaleString('en-IN')} Cr`;
}

export function formatDecimalPercent(
  decimalValue: number | null | undefined,
  decimals = 2,
  withSign = true
): string {
  if (typeof decimalValue !== 'number' || !Number.isFinite(decimalValue)) {
    return '—';
  }
  const pct = decimalValue * 100;
  const sign = withSign && pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
}

export function formatDirectPercent(
  pctValue: number | null | undefined,
  decimals = 2,
  withSign = true
): string {
  if (typeof pctValue !== 'number' || !Number.isFinite(pctValue)) {
    return '—';
  }
  const sign = withSign && pctValue > 0 ? '+' : '';
  return `${sign}${pctValue.toFixed(decimals)}%`;
}

export function formatRatio(value: number | null | undefined, decimals = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(decimals);
}

function formatShortIsoDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (monthIdx < 0 || monthIdx > 11 || !Number.isFinite(day)) return isoDate;
  return `${day} ${months[monthIdx]}`;
}

/**
 * Aligns two live daily AMFI NAV series on shared dates in chronological order
 * and rebases both series to 100.0 at their earliest shared date.
 */
export function normalizeNavComparisonSeries(
  schemePoints: MfnavNavPoint[],
  benchmarkPoints: MfnavNavPoint[]
): RebasedNavComparisonResult | null {
  if (!Array.isArray(schemePoints) || !Array.isArray(benchmarkPoints)) return null;

  const benchMap = new Map<string, number>();
  for (const pt of benchmarkPoints) {
    if (pt?.nav_date && typeof pt.nav === 'number' && Number.isFinite(pt.nav) && pt.nav > 0) {
      benchMap.set(pt.nav_date, pt.nav);
    }
  }

  const aligned: Array<{ date: string; schemeNav: number; benchmarkNav: number }> = [];
  const seenDates = new Set<string>();

  for (const pt of schemePoints) {
    if (
      pt?.nav_date &&
      !seenDates.has(pt.nav_date) &&
      typeof pt.nav === 'number' &&
      Number.isFinite(pt.nav) &&
      pt.nav > 0
    ) {
      const benchNav = benchMap.get(pt.nav_date);
      if (benchNav !== undefined) {
        seenDates.add(pt.nav_date);
        aligned.push({
          date: pt.nav_date,
          schemeNav: pt.nav,
          benchmarkNav: benchNav,
        });
      }
    }
  }

  aligned.sort((a, b) => a.date.localeCompare(b.date));
  if (aligned.length < 2) return null;

  const baseScheme = aligned[0].schemeNav;
  const baseBench = aligned[0].benchmarkNav;

  const points: RebasedNavComparisonPoint[] = aligned.map((row) => ({
    date: row.date,
    label: formatShortIsoDate(row.date),
    schemeIndex: Number(((row.schemeNav / baseScheme) * 100).toFixed(2)),
    benchmarkIndex: Number(((row.benchmarkNav / baseBench) * 100).toFixed(2)),
    schemeNav: row.schemeNav,
    benchmarkNav: row.benchmarkNav,
  }));

  const last = points[points.length - 1];
  const schemeReturnPct = Number((last.schemeIndex - 100).toFixed(2));
  const benchmarkReturnPct = Number((last.benchmarkIndex - 100).toFixed(2));
  const spreadPct = Number((schemeReturnPct - benchmarkReturnPct).toFixed(2));

  return {
    points,
    startDate: aligned[0].date,
    endDate: aligned[aligned.length - 1].date,
    schemeReturnPct,
    benchmarkReturnPct,
    spreadPct,
  };
}

export function computeYieldCurveAnalytics(tenors: TreasuryTenorPoint[]): YieldCurveAnalytics {
  if (!Array.isArray(tenors) || tenors.length === 0) {
    return {
      twoYearPct: null,
      tenYearPct: null,
      threeMonthPct: null,
      spread2s10sBps: null,
      spread3m10yBps: null,
      regime: 'Unavailable',
    };
  }

  const findYield = (label: string): number | null => {
    const match = tenors.find((t) => t.label.trim().toUpperCase() === label.toUpperCase());
    return match && Number.isFinite(match.yieldPct) ? match.yieldPct : null;
  };

  const twoYearPct = findYield('2Y');
  const tenYearPct = findYield('10Y');
  const threeMonthPct = findYield('3M');

  const spread2s10sBps =
    twoYearPct !== null && tenYearPct !== null
      ? Math.round((tenYearPct - twoYearPct) * 100)
      : null;

  const spread3m10yBps =
    threeMonthPct !== null && tenYearPct !== null
      ? Math.round((tenYearPct - threeMonthPct) * 100)
      : null;

  let regime: YieldCurveAnalytics['regime'] = 'Unavailable';
  if (spread2s10sBps !== null) {
    if (spread2s10sBps < -5) regime = 'Inverted';
    else if (spread2s10sBps <= 15) regime = 'Flat';
    else regime = 'Normal';
  }

  return {
    twoYearPct,
    tenYearPct,
    threeMonthPct,
    spread2s10sBps,
    spread3m10yBps,
    regime,
  };
}

export function computeBullionSummary(candles: BullionCandle[]): BullionSummary | null {
  if (!Array.isArray(candles) || candles.length === 0) return null;

  const valid = candles.filter(
    (c) =>
      Number.isFinite(c.close) &&
      c.close > 0 &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low)
  );
  if (valid.length === 0) return null;

  const firstClose = valid[0].close;
  const latestClose = valid[valid.length - 1].close;
  const periodChangePct =
    firstClose > 0 ? Number((((latestClose - firstClose) / firstClose) * 100).toFixed(2)) : 0;

  let periodHigh = valid[0].high;
  let periodLow = valid[0].low;
  for (const c of valid) {
    if (c.high > periodHigh) periodHigh = c.high;
    if (c.low < periodLow) periodLow = c.low;
  }

  return {
    latestClose,
    periodChangePct,
    periodHigh,
    periodLow,
    candleCount: valid.length,
  };
}

export interface NavMasterSchemeItem {
  scheme_code: number;
  scheme_name: string;
  isin: string | null;
  source: string;
  latest_date: string;
  latest_nav: number;
  earliest_date: string;
  observation_count: number;
}

export interface NavMasterSchemeDetailPayload extends NavMasterSchemeItem {
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

/**
 * Rebases a single NAV series to 100.0 chronologically when no overlapping
 * benchmark dates exist (e.g., newer SEBI SIF Long-Short funds in SQLite nav_master).
 */
export function normalizeSingleNavSeries(
  schemePoints: MfnavNavPoint[]
): RebasedNavComparisonResult | null {
  if (!Array.isArray(schemePoints)) return null;
  const seen = new Set<string>();
  const cleaned: Array<{ date: string; nav: number }> = [];

  for (const pt of schemePoints) {
    if (
      pt?.nav_date &&
      !seen.has(pt.nav_date) &&
      typeof pt.nav === 'number' &&
      Number.isFinite(pt.nav) &&
      pt.nav > 0
    ) {
      seen.add(pt.nav_date);
      cleaned.push({ date: pt.nav_date, nav: pt.nav });
    }
  }

  cleaned.sort((a, b) => a.date.localeCompare(b.date));
  if (cleaned.length < 2) return null;

  const base = cleaned[0].nav;
  const points: RebasedNavComparisonPoint[] = cleaned.map((row) => ({
    date: row.date,
    label: formatShortIsoDate(row.date),
    schemeIndex: Number(((row.nav / base) * 100).toFixed(2)),
    benchmarkIndex: 100,
    schemeNav: row.nav,
    benchmarkNav: 100,
  }));

  const last = points[points.length - 1];
  const schemeReturnPct = Number((last.schemeIndex - 100).toFixed(2));

  return {
    points,
    startDate: cleaned[0].date,
    endDate: cleaned[cleaned.length - 1].date,
    schemeReturnPct,
    benchmarkReturnPct: 0,
    spreadPct: schemeReturnPct,
  };
}

/**
 * Computes percentage-point outperformance/underperformance vs category peer median.
 */
export function computePeerSpreadPct(
  schemeDecimal: number | null | undefined,
  medianDecimal: number | null | undefined
): number | null {
  if (
    typeof schemeDecimal !== 'number' ||
    !Number.isFinite(schemeDecimal) ||
    typeof medianDecimal !== 'number' ||
    !Number.isFinite(medianDecimal)
  ) {
    return null;
  }
  return Number(((schemeDecimal - medianDecimal) * 100).toFixed(2));
}

/**
 * Computes where a spot price sits within its [low, high] range (0 to 100%).
 */
export function computeRangePositionPct(current: number, low: number, high: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(low) || !Number.isFinite(high)) return 50;
  const span = high - low;
  if (span <= 0) return 50;
  const raw = ((current - low) / span) * 100;
  return Math.max(0, Math.min(100, Number(raw.toFixed(1))));
}

