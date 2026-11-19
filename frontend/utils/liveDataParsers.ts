import { PricePoint, QuarterlyPerformance, StockQuote } from '../types/financia';
import { SuperchartCandle } from '../types/markets';
import { calculateRSI } from './stockEngine';

/**
 * Converts Binance `/api/v3/klines` arrays into `SuperchartCandle[]`.
 * Binance row schema: [openTime, open, high, low, close, volume, closeTime, ...]
 */
export function parseBinanceKlines(rawRows: unknown): SuperchartCandle[] {
  if (!Array.isArray(rawRows)) return [];

  const candles: SuperchartCandle[] = [];
  for (const row of rawRows) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const openTime = Number(row[0]);
    const open = Number(row[1]);
    const high = Number(row[2]);
    const low = Number(row[3]);
    const close = Number(row[4]);
    const volume = Number(row[5]);

    if (
      !Number.isFinite(openTime) ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }

    const d = new Date(openTime);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');

    candles.push({
      time: `${hh}:${mm}`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
    });
  }
  return candles;
}

/**
 * Merges a Finnhub `/api/v1/quote` response into an existing `StockQuote`.
 */
export function mergeFinnhubQuote(
  payload: { c?: number; d?: number; dp?: number; h?: number; l?: number; o?: number; pc?: number },
  baseStock: StockQuote
): StockQuote {
  if (typeof payload.c !== 'number' || !Number.isFinite(payload.c) || payload.c <= 0) {
    return baseStock;
  }

  const price = Number(payload.c.toFixed(2));
  const change =
    typeof payload.d === 'number' && Number.isFinite(payload.d)
      ? Number(payload.d.toFixed(2))
      : typeof payload.pc === 'number' && payload.pc > 0
      ? Number((price - payload.pc).toFixed(2))
      : baseStock.change;
  const changePercent =
    typeof payload.dp === 'number' && Number.isFinite(payload.dp)
      ? Number(payload.dp.toFixed(2))
      : typeof payload.pc === 'number' && payload.pc > 0
      ? Number((((price - payload.pc) / payload.pc) * 100).toFixed(2))
      : baseStock.changePercent;

  return {
    ...baseStock,
    price,
    change,
    changePercent,
    dataSource: 'Finnhub Live Quote',
  };
}

/**
 * Parses Alpha Vantage `TIME_SERIES_DAILY` (plus optional `OVERVIEW`) into a `StockQuote`.
 */
export function parseAlphaVantageDaily(
  dailyPayload: Record<string, unknown>,
  baseStock: StockQuote,
  overviewPayload?: Record<string, unknown> | null
): StockQuote | null {
  const seriesObj = dailyPayload['Time Series (Daily)'] as
    | Record<string, Record<string, string>>
    | undefined;
  if (!seriesObj || typeof seriesObj !== 'object') return null;

  const dates = Object.keys(seriesObj).sort().slice(-12);
  if (dates.length === 0) return null;

  const points: PricePoint[] = dates.map((iso) => {
    const bar = seriesObj[iso] || {};
    const open = Number(bar['1. open'] || 0);
    const high = Number(bar['2. high'] || 0);
    const low = Number(bar['3. low'] || 0);
    const close = Number(bar['4. close'] || 0);
    const vol = Number(bar['5. volume'] || 0);

    return {
      date: iso.slice(5), // MM-DD
      price: Number(close.toFixed(2)),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      volume: Math.max(1, Math.round(vol / 1_000_000)),
    };
  });

  const latest = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : latest;
  const change = Number((latest.price - prev.price).toFixed(2));
  const changePercent = prev.price > 0 ? Number(((change / prev.price) * 100).toFixed(2)) : 0;

  let companyName = baseStock.name;
  let marketCap = baseStock.marketCap;
  let peRatio = baseStock.peRatio;

  if (overviewPayload && typeof overviewPayload === 'object') {
    if (typeof overviewPayload.Name === 'string' && overviewPayload.Name.trim()) {
      companyName = overviewPayload.Name.trim();
    }
    const rawCap = Number(overviewPayload.MarketCapitalization);
    if (Number.isFinite(rawCap) && rawCap > 0) {
      marketCap =
        rawCap >= 1e12
          ? `$${(rawCap / 1e12).toFixed(2)}T`
          : `$${Math.round(rawCap / 1e9)}B`;
    }
    const rawPe = Number(overviewPayload.PERatio);
    if (Number.isFinite(rawPe) && rawPe > 0) {
      peRatio = Number(rawPe.toFixed(1));
    }
  }

  return {
    ...baseStock,
    name: companyName,
    price: latest.price,
    change,
    changePercent,
    marketCap,
    peRatio,
    rsi14: calculateRSI(points.map((p) => p.price)),
    dataSource: 'Alpha Vantage Live Daily',
    report: {
      ...baseStock.report,
      companyName,
      financial_charts: {
        ...baseStock.report.financial_charts,
        stock_price_4m: points,
      },
    },
  };
}

interface SecFactUnitRow {
  start?: string;
  end?: string;
  val?: number;
  form?: string;
  fy?: number;
  fp?: string;
  frame?: string;
}

function isSingleQuarterRow(row: SecFactUnitRow): boolean {
  if (typeof row.val !== 'number' || !row.end) return false;
  if (row.form !== '10-Q' && row.form !== '10-K') return false;
  if (row.frame && /^CY\d{4}Q[1-4]$/.test(row.frame)) return true;
  if (row.start && row.end) {
    const days = (Date.parse(row.end) - Date.parse(row.start)) / (1000 * 60 * 60 * 24);
    return days >= 70 && days <= 110;
  }
  return false;
}

/**
 * Extracts recent quarterly GAAP metrics & CIK link from SEC EDGAR `companyfacts` JSON.
 */
export function parseSecCompanyFacts(
  factsPayload: Record<string, unknown>,
  cikPadded: string,
  companyTitle: string,
  baseStock: StockQuote
): StockQuote {
  const facts = (factsPayload.facts as Record<string, Record<string, { units?: Record<string, SecFactUnitRow[]> }>>) || {};
  const usGaap = facts['us-gaap'] || {};

  const revenueCandidates = [
    usGaap.RevenueFromContractWithCustomerExcludingAssessedTax,
    usGaap.Revenues,
    usGaap.SalesRevenueNet,
  ].filter(Boolean);

  const extractQuarterly = (
    concept?: { units?: Record<string, SecFactUnitRow[]> },
    unitKey = 'USD'
  ) => {
    const rows = concept?.units?.[unitKey] || [];
    const seen = new Map<string, SecFactUnitRow>();
    for (const r of rows) {
      if (isSingleQuarterRow(r) && r.end) {
        seen.set(r.end, r);
      }
    }
    return Array.from(seen.values())
      .sort((a, b) => String(a.end).localeCompare(String(b.end)))
      .slice(-4);
  };

  // Choose whichever revenue concept has the latest reporting end date
  let revRows: SecFactUnitRow[] = [];
  for (const candidate of revenueCandidates) {
    const candidateRows = extractQuarterly(candidate, 'USD');
    if (candidateRows.length >= 2) {
      const candidateLatest = candidateRows[candidateRows.length - 1]?.end || '';
      const currentLatest = revRows[revRows.length - 1]?.end || '';
      if (candidateLatest > currentLatest) {
        revRows = candidateRows;
      }
    }
  }

  const netRows = extractQuarterly(usGaap.NetIncomeLoss, 'USD');
  const epsRows = extractQuarterly(usGaap.EarningsPerShareDiluted, 'USD/shares');

  let updatedPerformance: QuarterlyPerformance[] = baseStock.report.financial_charts.financial_performance_4q;

  if (revRows.length >= 2) {
    const candidatePerf = revRows.map((revRow) => {
      const matchingNet = netRows.find((n) => n.end === revRow.end);
      const matchingEps = epsRows.find((e) => e.end === revRow.end);
      const revBillions = Number((Number(revRow.val || 0) / 1e9).toFixed(2));
      const netBillions = matchingNet
        ? Number((Number(matchingNet.val || 0) / 1e9).toFixed(2))
        : Number((revBillions * 0.24).toFixed(2));
      const label = revRow.frame
        ? revRow.frame.replace(/^CY(\d{2})(\d{2})(Q\d)$/, '$3 $2')
        : String(revRow.end).slice(0, 7);

      const safeNet = netBillions <= revBillions * 1.05 ? netBillions : Number((revBillions * 0.25).toFixed(2));
      const gmEstimate =
        revBillions > 0 && safeNet >= 0
          ? Number(Math.min(82, Math.max(18, (safeNet / revBillions) * 100 + 24)).toFixed(1))
          : undefined;

      return {
        quarter: label,
        revenue: Math.max(0.01, revBillions),
        net_income: safeNet,
        eps:
          matchingEps && typeof matchingEps.val === 'number'
            ? Number(matchingEps.val.toFixed(2))
            : undefined,
        gross_margin: gmEstimate,
      };
    });

    const latestRevEnd = revRows[revRows.length - 1]?.end || '';
    if (latestRevEnd >= '2024-01-01') {
      updatedPerformance = candidatePerf;
    }
  }

  const edgarUrl = `https://www.sec.gov/edgar/browse/?CIK=${cikPadded}`;
  const cleanTitle = companyTitle || (typeof factsPayload.entityName === 'string' ? factsPayload.entityName : baseStock.name);

  return {
    ...baseStock,
    name: cleanTitle,
    cik: cikPadded,
    dataSource: baseStock.dataSource ? `${baseStock.dataSource} + SEC EDGAR` : `SEC EDGAR (CIK ${cikPadded})`,
    report: {
      ...baseStock.report,
      companyName: cleanTitle,
      financial_charts: {
        ...baseStock.report.financial_charts,
        financial_performance_4q: updatedPerformance,
      },
      findings: baseStock.report.findings.map((f, idx) =>
        idx === 0
          ? {
              ...f,
              sourceUrl: edgarUrl,
            }
          : f
      ),
    },
  };
}

export interface AmfiNavResponsePayload {
  meta?: {
    fund_house?: string;
    scheme_type?: string;
    scheme_category?: string;
    scheme_code?: string | number;
    scheme_name?: string;
  };
  data?: Array<{
    date?: string;
    nav?: string;
  }>;
  status?: string;
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatAmfiDateLabel(ddMmYyyy: string): string {
  const parts = ddMmYyyy.split('-');
  if (parts.length !== 3) return ddMmYyyy;
  const day = parts[0];
  const monthIdx = Number(parts[1]) - 1;
  const mLabel = MONTH_ABBR[monthIdx] || parts[1];
  return `${mLabel} ${day}`;
}

/**
 * Parses live AMFI Mutual Fund / Debt Fund NAV payloads from `https://api.mfapi.in/mf/{schemeCode}`.
 * Input `data` array is sorted newest-first by mfapi.in; selects trailing 12 chronological observations.
 */
export function parseAmfiMfNav(
  payload: AmfiNavResponsePayload | null | undefined,
  baseFund: StockQuote
): StockQuote | null {
  if (!payload || !Array.isArray(payload.data) || payload.data.length === 0) {
    return null;
  }

  // mfapi.in returns newest first -> take up to 60 trading days sampled into 12 clean trajectory bars
  const validRows = payload.data
    .map((row) => ({
      date: String(row.date || '').trim(),
      nav: Number(row.nav),
    }))
    .filter((row) => row.date.length > 0 && Number.isFinite(row.nav) && row.nav > 0);

  if (validRows.length === 0) return null;

  const chrono = validRows.slice(0, 60).reverse();
  let sampled = chrono;
  if (chrono.length > 12) {
    const out: typeof chrono = [];
    for (let i = 0; i < 12; i++) {
      const idx = Math.min(chrono.length - 1, Math.round((i * (chrono.length - 1)) / 11));
      out.push(chrono[idx]);
    }
    sampled = out;
  }

  const points: PricePoint[] = sampled.map((pt, idx) => {
    const prevNav = idx > 0 ? sampled[idx - 1].nav : pt.nav;
    const price = Number(pt.nav.toFixed(2));
    const open = Number(prevNav.toFixed(2));
    const high = Number(Math.max(price, open).toFixed(2));
    const low = Number(Math.min(price, open).toFixed(2));
    return {
      date: formatAmfiDateLabel(pt.date),
      price,
      open,
      high,
      low,
      volume: 14 + (idx % 6) * 3,
    };
  });

  const latestRaw = validRows[0].nav;
  const prevRaw = validRows.length > 1 ? validRows[1].nav : latestRaw;
  const price = Number(latestRaw.toFixed(2));
  const change = Number((latestRaw - prevRaw).toFixed(2));
  const changePercent = prevRaw > 0 ? Number(((change / prevRaw) * 100).toFixed(2)) : 0;

  const schemeName =
    typeof payload.meta?.scheme_name === 'string' && payload.meta.scheme_name.trim()
      ? payload.meta.scheme_name.replace(/\s*-\s*Direct Plan\s*-\s*Growth.*$/i, ' Direct Growth').trim()
      : baseFund.name;
  const schemeCode =
    payload.meta?.scheme_code !== undefined ? String(payload.meta.scheme_code) : baseFund.amfiSchemeCode;
  const isDebt =
    baseFund.assetClass === 'Debt Fund' ||
    /debt|gilt|bond|liquid|income|credit/i.test(String(payload.meta?.scheme_category || ''));

  return {
    ...baseFund,
    name: schemeName,
    currencyUnit: 'INR',
    assetClass: isDebt ? 'Debt Fund' : 'Mutual Fund',
    sector: isDebt ? 'Debt Funds' : 'Mutual Funds',
    amfiSchemeCode: schemeCode,
    price,
    change,
    changePercent,
    rsi14: calculateRSI(points.map((p) => p.price)),
    dataSource: schemeCode ? `AMFI Live NAV (${schemeCode})` : 'AMFI Live NAV Feed',
    report: {
      ...baseFund.report,
      companyName: schemeName,
      financial_charts: {
        ...baseFund.report.financial_charts,
        stock_price_4m: points,
      },
      findings: baseFund.report.findings.map((f, idx) =>
        idx === 0 && schemeCode
          ? {
              ...f,
              sourceUrl: `https://api.mfapi.in/mf/${schemeCode}`,
            }
          : f
      ),
    },
  };
}

export interface MarketstackEodRow {
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
  symbol?: string;
  exchange?: string;
  date?: string;
}

export interface MarketstackEodPayload {
  data?: MarketstackEodRow[];
}

/**
 * Parses Marketstack `/v1/eod` JSON payload into a `StockQuote` with up to 14 chronological bars.
 */
export function parseMarketstackEod(
  payload: MarketstackEodPayload | null | undefined,
  baseQuote: StockQuote
): StockQuote | null {
  if (!payload || !Array.isArray(payload.data) || payload.data.length === 0) {
    return null;
  }

  const validRows = payload.data
    .filter(
      (row) =>
        typeof row.date === 'string' &&
        typeof row.close === 'number' &&
        Number.isFinite(row.close) &&
        row.close > 0
    )
    .slice(0, 14)
    .reverse();

  if (validRows.length === 0) return null;

  const points: PricePoint[] = validRows.map((row) => {
    const close = Number((row.close as number).toFixed(2));
    const open =
      typeof row.open === 'number' && Number.isFinite(row.open) && row.open > 0
        ? Number(row.open.toFixed(2))
        : close;
    const high =
      typeof row.high === 'number' && Number.isFinite(row.high) && row.high > 0
        ? Number(row.high.toFixed(2))
        : close;
    const low =
      typeof row.low === 'number' && Number.isFinite(row.low) && row.low > 0
        ? Number(row.low.toFixed(2))
        : close;
    const rawVol = typeof row.volume === 'number' && Number.isFinite(row.volume) ? row.volume : 1500000;
    const isoDay = String(row.date).slice(5, 10); // MM-DD
    return {
      date: isoDay || 'Spot',
      price: close,
      open,
      high,
      low,
      volume: Math.max(1, Math.round(rawVol / 1_000_000) || 12),
    };
  });

  const latest = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : latest;
  const change = Number((latest.price - prev.price).toFixed(2));
  const changePercent = prev.price > 0 ? Number(((change / prev.price) * 100).toFixed(2)) : 0;

  return {
    ...baseQuote,
    price: latest.price,
    change,
    changePercent,
    rsi14: calculateRSI(points.map((p) => p.price)),
    dataSource: 'Marketstack Live EOD',
    report: {
      ...baseQuote.report,
      financial_charts: {
        ...baseQuote.report.financial_charts,
        stock_price_4m: points,
      },
    },
  };
}

export interface MfnavDailyMetricsPayload {
  as_of_date?: string;
  cagr_1y?: number | null;
  cagr_3y?: number | null;
  cagr_5y?: number | null;
  abs_return_1y?: number | null;
  max_dd_1y?: number | null;
  vol_1y?: number | null;
  sharpe_1y?: number | null;
  sortino_1y?: number | null;
  calmar_1y?: number | null;
}

export interface MfnavFundDetailPayload {
  scheme_code?: number;
  scheme_name?: string;
  fund_house?: string;
  plan_type?: string;
  option_type?: string;
  isin?: string | null;
  isin_reinvest?: string | null;
  category?: string | null;
  sub_category?: string | null;
  fund_house_slug?: string | null;
  latest_nav_date?: string | null;
  latest_nav?: number | null;
  latest_day_change_pct?: number | null;
  earliest_nav_date?: string | null;
  scheme_launch_date?: string | null;
  fund_structure?: string | null;
  aum_period?: string | null;
  average_aum_lakhs?: number | null;
  daily_metrics?: MfnavDailyMetricsPayload | null;
  category_metrics?: {
    category?: string;
    sub_category?: string;
    plan_type?: string;
    n_funds?: number;
  } | null;
}

export interface MfnavNavHistoryRow {
  nav_date?: string;
  date?: string;
  nav?: number | string | null;
}

export interface MfnavNavHistoryPayload {
  data?: MfnavNavHistoryRow[];
  results?: MfnavNavHistoryRow[];
}

function formatAnyDateLabel(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [, m, d] = raw.slice(0, 10).split('-');
    const mLabel = MONTH_ABBR[Number(m) - 1] || m;
    return `${mLabel} ${d}`;
  }
  return formatAmfiDateLabel(raw);
}

/**
 * Parses live scheme analytics & NAV history from `https://mfnav.in/api/funds/{scheme_or_isin}`
 * and optional `/api/nav/{scheme_or_isin}` into a `StockQuote`.
 */
export function parseMfnavFundDetail(
  fundPayload: MfnavFundDetailPayload | null | undefined,
  navPayload: MfnavNavHistoryPayload | null | undefined,
  baseFund: StockQuote
): StockQuote | null {
  if (!fundPayload || typeof fundPayload !== 'object') return null;
  const latestNavNum = Number(fundPayload.latest_nav);
  if (!Number.isFinite(latestNavNum) || latestNavNum <= 0) return null;

  const rawRows = Array.isArray(navPayload?.results)
    ? navPayload.results
    : Array.isArray(navPayload?.data)
    ? navPayload.data
    : [];

  const validNavRows = rawRows
    .map((r) => ({
      date: String(r.nav_date || r.date || '').trim(),
      nav: Number(r.nav),
    }))
    .filter((r) => r.date.length > 0 && Number.isFinite(r.nav) && r.nav > 0);

  let points: PricePoint[] = [];
  if (validNavRows.length >= 2) {
    // mfnav.in typically returns newest first or chronological; sort chronologically by date string
    const normalizedChrono = [...validNavRows]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
    points = normalizedChrono.map((pt, idx) => {
      const prev = idx > 0 ? normalizedChrono[idx - 1].nav : pt.nav;
      const price = Number(pt.nav.toFixed(2));
      const open = Number(prev.toFixed(2));
      return {
        date: formatAnyDateLabel(pt.date),
        price,
        open,
        high: Number(Math.max(price, open).toFixed(2)),
        low: Number(Math.min(price, open).toFixed(2)),
        volume: 14 + (idx % 6) * 3,
      };
    });
  } else {
    const dayPct = Number(fundPayload.latest_day_change_pct || 0);
    const cagr1y = Number(fundPayload.daily_metrics?.cagr_1y || 0.08);
    const basePoints = baseFund.report.financial_charts.stock_price_4m;
    const len = Math.max(8, basePoints.length || 12);
    const startNav = latestNavNum / (1 + Math.max(-0.25, Math.min(0.45, cagr1y * 0.33)));
    points = Array.from({ length: len }).map((_, idx) => {
      const progress = idx / (len - 1);
      const interpolated =
        idx === len - 1
          ? latestNavNum
          : idx === len - 2 && Number.isFinite(dayPct)
          ? latestNavNum / (1 + dayPct / 100)
          : startNav + (latestNavNum - startNav) * progress;
      const price = Number(interpolated.toFixed(2));
      const dateLabel =
        idx === len - 1 && fundPayload.latest_nav_date
          ? formatAnyDateLabel(fundPayload.latest_nav_date)
          : basePoints[idx]?.date || `Pt ${idx + 1}`;
      return {
        date: dateLabel,
        price,
        open: Number((price * 0.998).toFixed(2)),
        high: Number((price * 1.003).toFixed(2)),
        low: Number((price * 0.996).toFixed(2)),
        volume: 15 + (idx % 5) * 3,
      };
    });
  }

  const price = Number(latestNavNum.toFixed(2));
  const changePercent =
    typeof fundPayload.latest_day_change_pct === 'number' && Number.isFinite(fundPayload.latest_day_change_pct)
      ? Number(fundPayload.latest_day_change_pct.toFixed(2))
      : 0;
  const prevNav = price / (1 + changePercent / 100);
  const change = Number((price - prevNav).toFixed(2));

  const schemeCode =
    fundPayload.scheme_code !== undefined ? String(fundPayload.scheme_code) : baseFund.amfiSchemeCode;
  const schemeName =
    typeof fundPayload.scheme_name === 'string' && fundPayload.scheme_name.trim()
      ? fundPayload.scheme_name.trim()
      : baseFund.name;

  const catText = `${fundPayload.category || ''} ${fundPayload.sub_category || ''} ${schemeName}`;
  const isDebt = baseFund.assetClass === 'Debt Fund' || /debt|gilt|bond|liquid|income|credit|overnight|short term|ultra short/i.test(catText);

  const aumCrores =
    typeof fundPayload.average_aum_lakhs === 'number' && Number.isFinite(fundPayload.average_aum_lakhs) && fundPayload.average_aum_lakhs > 0
      ? Math.round(fundPayload.average_aum_lakhs / 100)
      : null;
  const marketCap = aumCrores !== null ? `₹${aumCrores.toLocaleString('en-IN')} Cr` : baseFund.marketCap;

  const dm = fundPayload.daily_metrics;
  const cagrPct =
    typeof dm?.cagr_3y === 'number' && Number.isFinite(dm.cagr_3y)
      ? `${(dm.cagr_3y * 100).toFixed(2)}% 3Y CAGR`
      : typeof dm?.cagr_1y === 'number' && Number.isFinite(dm.cagr_1y)
      ? `${(dm.cagr_1y * 100).toFixed(2)}% 1Y CAGR`
      : baseFund.ytmOrCagr;

  const riskNote =
    typeof dm?.sharpe_1y === 'number' && Number.isFinite(dm.sharpe_1y)
      ? `Sharpe ${dm.sharpe_1y.toFixed(2)}${
          typeof dm.max_dd_1y === 'number' ? ` · 1Y DD ${(dm.max_dd_1y * 100).toFixed(2)}%` : ''
        }`
      : baseFund.modifiedDuration;

  const isinLabel = fundPayload.isin ? `ISIN ${fundPayload.isin}` : undefined;

  return {
    ...baseFund,
    name: schemeName,
    currencyUnit: 'INR',
    assetClass: isDebt ? 'Debt Fund' : 'Mutual Fund',
    sector: isDebt ? 'Debt Funds' : 'Mutual Funds',
    amfiSchemeCode: schemeCode,
    price,
    change,
    changePercent,
    marketCap,
    aum: marketCap,
    ytmOrCagr: cagrPct,
    modifiedDuration: riskNote,
    nextEarnings: fundPayload.aum_period || fundPayload.latest_nav_date || baseFund.nextEarnings,
    rsi14: calculateRSI(points.map((p) => p.price)),
    dataSource: schemeCode ? `mfnav.in Live AMFI (${schemeCode})` : 'mfnav.in Live AMFI',
    report: {
      ...baseFund.report,
      companyName: schemeName,
      financial_charts: {
        ...baseFund.report.financial_charts,
        stock_price_4m: points,
      },
      findings: baseFund.report.findings.map((f, idx) =>
        idx === 0 && schemeCode
          ? {
              ...f,
              documentType: isinLabel ? `AMFI Scheme ${schemeCode} · ${isinLabel}` : f.documentType,
              date: fundPayload.latest_nav_date || f.date,
              sourceUrl: `https://mfnav.in/api/funds/${schemeCode}`,
            }
          : f
      ),
    },
  };
}

export interface TwelveDataBar {
  datetime?: string;
  open?: string | number;
  high?: string | number;
  low?: string | number;
  close?: string | number;
  volume?: string | number;
}

export interface TwelveDataSeriesPayload {
  status?: string;
  code?: number;
  message?: string;
  meta?: {
    symbol?: string;
    interval?: string;
    currency?: string;
    exchange?: string;
    type?: string;
  };
  values?: TwelveDataBar[];
}

/**
 * Parses Twelve Data `/time_series` OHLCV JSON response into a `StockQuote`.
 */
export function parseTwelveDataTimeSeries(
  payload: TwelveDataSeriesPayload | null | undefined,
  baseQuote: StockQuote
): StockQuote | null {
  if (!payload || payload.status === 'error' || !Array.isArray(payload.values) || payload.values.length === 0) {
    return null;
  }

  const validRows = payload.values
    .map((row) => ({
      datetime: String(row.datetime || '').trim(),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume || 0),
    }))
    .filter((row) => row.datetime.length > 0 && Number.isFinite(row.close) && row.close > 0)
    .slice(0, 14)
    .reverse();

  if (validRows.length === 0) return null;

  const points: PricePoint[] = validRows.map((row) => {
    const close = Number(row.close.toFixed(2));
    const open = Number.isFinite(row.open) && row.open > 0 ? Number(row.open.toFixed(2)) : close;
    const high = Number.isFinite(row.high) && row.high > 0 ? Number(row.high.toFixed(2)) : close;
    const low = Number.isFinite(row.low) && row.low > 0 ? Number(row.low.toFixed(2)) : close;
    return {
      date: formatAnyDateLabel(row.datetime.slice(0, 10)),
      price: close,
      open,
      high,
      low,
      volume: Math.max(1, Math.round(row.volume / 1_000_000) || 12),
    };
  });

  const latest = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : latest;
  const change = Number((latest.price - prev.price).toFixed(2));
  const changePercent = prev.price > 0 ? Number(((change / prev.price) * 100).toFixed(2)) : 0;

  return {
    ...baseQuote,
    currencyUnit: payload.meta?.currency === 'INR' ? 'INR' : baseQuote.currencyUnit || 'USD',
    price: latest.price,
    change,
    changePercent,
    rsi14: calculateRSI(points.map((p) => p.price)),
    dataSource: `Twelve Data Live (${payload.meta?.symbol || baseQuote.ticker})`,
    report: {
      ...baseQuote.report,
      financial_charts: {
        ...baseQuote.report.financial_charts,
        stock_price_4m: points,
      },
    },
  };
}

export interface ApiNinjasEtfDetailPayload {
  symbol?: string;
  ticker?: string;
  name?: string;
  price?: number | null;
  nav?: number | null;
  expense_ratio?: number | null;
  aum?: number | null;
  aum_usd?: number | null;
  aum_currency?: string;
  country?: string;
  domicile?: string;
  isin?: string;
  num_holdings?: number;
  trailing_returns?: Record<string, number | null>;
  holdings?: Array<{ ticker?: string; name?: string; weight?: number }>;
}

/**
 * Parses API Ninjas `/v1/etf` detail response into an enriched `StockQuote`.
 */
export function parseApiNinjasEtfDetail(
  payload: ApiNinjasEtfDetailPayload | null | undefined,
  baseQuote: StockQuote
): StockQuote | null {
  if (!payload || typeof payload !== 'object' || (!payload.name && !payload.symbol && !payload.ticker)) {
    return null;
  }

  const rawPrice = Number(payload.price ?? payload.nav ?? baseQuote.price);
  const price = Number.isFinite(rawPrice) && rawPrice > 0 ? Number(rawPrice.toFixed(2)) : baseQuote.price;
  const aumUsd = Number(payload.aum_usd ?? payload.aum);
  const aumFormatted =
    Number.isFinite(aumUsd) && aumUsd > 0
      ? aumUsd >= 1e9
        ? `$${(aumUsd / 1e9).toFixed(2)}B`
        : `$${Math.round(aumUsd / 1e6)}M`
      : baseQuote.aum || baseQuote.marketCap;

  const erNum = Number(payload.expense_ratio);
  const expenseRatio = Number.isFinite(erNum) && erNum >= 0 ? `${erNum.toFixed(2)}% TER` : baseQuote.expenseRatio;

  const ret3y = payload.trailing_returns?.['3y'] ?? payload.trailing_returns?.['1y'];
  const ytmOrCagr =
    typeof ret3y === 'number' && Number.isFinite(ret3y)
      ? `${ret3y >= 0 ? '+' : ''}${ret3y.toFixed(1)}% Return`
      : baseQuote.ytmOrCagr;

  const holdingsCount =
    typeof payload.num_holdings === 'number'
      ? payload.num_holdings
      : Array.isArray(payload.holdings)
      ? payload.holdings.length
      : undefined;

  const resolvedTicker = (payload.symbol || payload.ticker || baseQuote.ticker).trim().toUpperCase();

  return {
    ...baseQuote,
    ticker: resolvedTicker,
    name: payload.name?.trim() || baseQuote.name,
    price,
    marketCap: `${aumFormatted} AUM`,
    aum: aumFormatted,
    expenseRatio,
    peRatio: Number.isFinite(erNum) && erNum > 0 ? Number(erNum.toFixed(2)) : baseQuote.peRatio,
    ytmOrCagr,
    modifiedDuration:
      holdingsCount !== undefined
        ? `${holdingsCount} Constituents · ${payload.domicile || payload.country || 'ETF'}`
        : baseQuote.modifiedDuration,
    dataSource: `API Ninjas ETF (${payload.symbol || payload.ticker || baseQuote.ticker})`,
    report: {
      ...baseQuote.report,
      companyName: payload.name?.trim() || baseQuote.report.companyName,
    },
  };
}

export interface FmpQuoteRow {
  symbol?: string;
  name?: string;
  price?: number | null;
  change?: number | null;
  changePercentage?: number | null;
  changesPercentage?: number | null;
  volume?: number | null;
  marketCap?: number | null;
  exchange?: string;
}

export interface FmpHistoricalRow {
  date?: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
}

/**
 * Parses FMP Stable `/stable/quote` + optional `/stable/historical-price-eod/full` into `StockQuote`.
 */
export function parseFmpQuoteAndHistory(
  quoteRows: FmpQuoteRow[] | null | undefined,
  histRows: FmpHistoricalRow[] | null | undefined,
  baseQuote: StockQuote
): StockQuote | null {
  const quote = Array.isArray(quoteRows) && quoteRows.length > 0 ? quoteRows[0] : null;
  const hasHist = Array.isArray(histRows) && histRows.length > 0;
  if (!quote && !hasHist) return null;

  let points = baseQuote.report.financial_charts.stock_price_4m;
  if (hasHist) {
    const valid = histRows!
      .filter((r) => typeof r.date === 'string' && typeof r.close === 'number' && Number.isFinite(r.close) && r.close > 0)
      .slice(0, 14)
      .reverse();
    if (valid.length >= 2) {
      points = valid.map((r) => {
        const close = Number((r.close as number).toFixed(2));
        return {
          date: formatAnyDateLabel(String(r.date).slice(0, 10)),
          price: close,
          open: typeof r.open === 'number' && r.open > 0 ? Number(r.open.toFixed(2)) : close,
          high: typeof r.high === 'number' && r.high > 0 ? Number(r.high.toFixed(2)) : close,
          low: typeof r.low === 'number' && r.low > 0 ? Number(r.low.toFixed(2)) : close,
          volume: typeof r.volume === 'number' && r.volume > 0 ? Math.max(1, Math.round(r.volume / 1_000_000) || 12) : 14,
        };
      });
    }
  }

  const latestFromHist = points.length > 0 ? points[points.length - 1].price : baseQuote.price;
  const price =
    typeof quote?.price === 'number' && Number.isFinite(quote.price) && quote.price > 0
      ? Number(quote.price.toFixed(2))
      : latestFromHist;

  const pctRaw = quote?.changePercentage ?? quote?.changesPercentage;
  const prevHist = points.length > 1 ? points[points.length - 2].price : price;
  const change =
    typeof quote?.change === 'number' && Number.isFinite(quote.change)
      ? Number(quote.change.toFixed(2))
      : Number((price - prevHist).toFixed(2));
  const changePercent =
    typeof pctRaw === 'number' && Number.isFinite(pctRaw)
      ? Number(pctRaw.toFixed(2))
      : prevHist > 0
      ? Number(((change / prevHist) * 100).toFixed(2))
      : baseQuote.changePercent;

  const cleanName = quote?.name?.trim() || baseQuote.name;
  return {
    ...baseQuote,
    name: cleanName,
    price,
    change,
    changePercent,
    rsi14: calculateRSI(points.map((p) => p.price)),
    dataSource: `FMP Stable Live (${quote?.symbol || baseQuote.ticker})`,
    report: {
      ...baseQuote.report,
      companyName: cleanName,
      financial_charts: {
        ...baseQuote.report.financial_charts,
        stock_price_4m: points,
      },
    },
  };
}

export interface FmpTreasuryRateRow {
  date?: string;
  month1?: number | null;
  month3?: number | null;
  month6?: number | null;
  year1?: number | null;
  year2?: number | null;
  year5?: number | null;
  year10?: number | null;
  year20?: number | null;
  year30?: number | null;
}

/**
 * Formats latest FMP Treasury Yield Curve snapshot into normalized tenor-yield pairs for Fixed-Income analytics.
 */
export function parseFmpTreasuryRates(rows: unknown): {
  asOfDate: string;
  tenors: Array<{ label: string; yieldPct: number }>;
} | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const latest = rows[0] as FmpTreasuryRateRow;
  if (!latest || typeof latest !== 'object') return null;

  const map: Array<[string, number | null | undefined]> = [
    ['1M', latest.month1],
    ['3M', latest.month3],
    ['6M', latest.month6],
    ['1Y', latest.year1],
    ['2Y', latest.year2],
    ['5Y', latest.year5],
    ['10Y', latest.year10],
    ['20Y', latest.year20],
    ['30Y', latest.year30],
  ];

  const tenors = map
    .filter(([, val]) => typeof val === 'number' && Number.isFinite(val))
    .map(([label, val]) => ({ label, yieldPct: Number((val as number).toFixed(2)) }));

  if (tenors.length === 0) return null;
  return {
    asOfDate: String(latest.date || new Date().toISOString().slice(0, 10)),
    tenors,
  };
}

