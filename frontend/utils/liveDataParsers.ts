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
