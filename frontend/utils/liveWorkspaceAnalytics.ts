export interface LiveNavSeriesPoint {
  date: string;
  nav: number;
}

export interface QuarterlyNavSummary {
  quarterLabel: string;
  startDate: string;
  endDate: string;
  startNav: number;
  endNav: number;
  periodReturnPct: number;
  maxDrawdownPct: number;
  observations: number;
}

export interface LiveTickerMapping {
  ticker: string;
  schemeCode?: string;
  isSqliteSif?: boolean;
  isGoldSpot?: boolean;
  label: string;
  category: string;
}

export const TERMINAL_LIVE_SOURCE_MAP: Record<string, LiveTickerMapping> = {
  PPFAS: {
    ticker: 'PPFAS',
    schemeCode: '122639',
    label: 'Parag Parikh Flexi Cap Direct',
    category: 'AMFI Equity Flexi Cap',
  },
  HDFCMID: {
    ticker: 'HDFCMID',
    schemeCode: '118989',
    label: 'HDFC Mid-Cap Opportunities Direct',
    category: 'AMFI Mid Cap Equity',
  },
  GOLDBEES: {
    ticker: 'GOLDBEES',
    schemeCode: '119788',
    isGoldSpot: true,
    label: 'SBI Gold Direct / LBMA Spot Proxy',
    category: 'Physical Bullion & Gold FoF',
  },
  SBIGILT: {
    ticker: 'SBIGILT',
    schemeCode: '119707',
    label: 'SBI Magnum Gilt Fund Direct',
    category: 'AMFI Sovereign Gilt Debt',
  },
  NIFTYBEES: {
    ticker: 'NIFTYBEES',
    schemeCode: '120716',
    label: 'UTI Nifty 50 Index Direct',
    category: 'AMFI Index Benchmark',
  },
  HDFCCORP: {
    ticker: 'HDFCCORP',
    schemeCode: '118987',
    label: 'HDFC Corporate Bond Direct',
    category: 'AMFI Corporate Bond Debt',
  },
  QSIF1: {
    ticker: 'QSIF1',
    schemeCode: '1',
    isSqliteSif: true,
    label: 'qsif Equity Long Short Direct',
    category: 'SQLite SEBI SIF Ledger',
  },
};

/**
 * Groups chronological daily NAV observations into the most recent N calendar quarters,
 * computing authentic quarterly return, max drawdown, start/end NAV, and observation count.
 */
export function buildQuarterlyNavBreakdown(
  points: LiveNavSeriesPoint[],
  maxQuarters = 4
): QuarterlyNavSummary[] {
  const valid = points
    .filter((p) => p && typeof p.date === 'string' && Number.isFinite(p.nav) && p.nav > 0)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (valid.length < 2) return [];

  const buckets = new Map<string, LiveNavSeriesPoint[]>();
  for (const pt of valid) {
    const match = pt.date.match(/^(\d{4})-(\d{2})-/);
    if (!match) continue;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) continue;
    const qNum = Math.ceil(month / 3);
    const key = `${year}-Q${qNum}`;
    const list = buckets.get(key) || [];
    list.push(pt);
    buckets.set(key, list);
  }

  const orderedKeys = Array.from(buckets.keys()).sort();
  const selectedKeys = orderedKeys.slice(-Math.max(1, maxQuarters));

  return selectedKeys.map((key) => {
    const rows = buckets.get(key)!;
    const startNav = rows[0].nav;
    const endNav = rows[rows.length - 1].nav;
    const periodReturnPct = Number((((endNav - startNav) / startNav) * 100).toFixed(2));

    let peak = startNav;
    let maxDd = 0;
    for (const r of rows) {
      if (r.nav > peak) peak = r.nav;
      const dd = ((r.nav - peak) / peak) * 100;
      if (dd < maxDd) maxDd = dd;
    }

    const [yr, qPart] = key.split('-');
    return {
      quarterLabel: `${qPart} ${yr}`,
      startDate: rows[0].date,
      endDate: rows[rows.length - 1].date,
      startNav: Number(startNav.toFixed(4)),
      endNav: Number(endNav.toFixed(4)),
      periodReturnPct,
      maxDrawdownPct: Number(maxDd.toFixed(2)),
      observations: rows.length,
    };
  });
}

/**
 * Downsamples a daily NAV/price series cleanly to N points while preserving exact first & last values,
 * then builds bounded SVG path coordinates (line + area fill) with zero distortion.
 */
export function buildSmoothSeriesPaths(
  values: number[],
  width: number,
  height: number,
  padX = 8,
  padY = 12
): { linePath: string; areaPath: string; min: number; max: number; lastX: number; lastY: number } | null {
  const clean = values.filter((v) => Number.isFinite(v) && v > 0);
  if (clean.length < 2 || width <= padX * 2 || height <= padY * 2) return null;

  // Downsample long histories (> 60 pts) for crisp, fluid SVG geometry
  let sampled = clean;
  if (clean.length > 60) {
    const step = (clean.length - 1) / 59;
    sampled = Array.from({ length: 60 }, (_, idx) => clean[Math.round(idx * step)]);
  }

  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const span = max - min || Math.max(1e-6, min * 0.01);
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const coords = sampled.map((v, idx) => {
    const x = padX + (idx / (sampled.length - 1)) * usableW;
    const y = padY + usableH - ((v - min) / span) * usableH;
    return [Number(x.toFixed(1)), Number(y.toFixed(1))] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const first = coords[0];
  const last = coords[coords.length - 1];
  const bottomY = Number((height - padY).toFixed(1));
  const areaPath = `${linePath} L${last[0]},${bottomY} L${first[0]},${bottomY} Z`;

  return {
    linePath,
    areaPath,
    min,
    max,
    lastX: last[0],
    lastY: last[1],
  };
}

/**
 * Computes real cross-scheme dispersion statistics across SQLite nav_master SIF schemes.
 */
export function computeSifDispersionSummary(
  schemes: Array<{
    scheme_code: string;
    scheme_name: string;
    latest_nav: number;
    first_nav?: number;
    total_observations?: number;
    window_return_pct?: number;
  }>
): {
  count: number;
  medianReturnPct: number | null;
  topScheme: { code: string; name: string; returnPct: number; latestNav: number } | null;
  bottomScheme: { code: string; name: string; returnPct: number; latestNav: number } | null;
  positiveCount: number;
} {
  const scored = schemes
    .map((s) => {
      const ret =
        typeof s.window_return_pct === 'number' && Number.isFinite(s.window_return_pct)
          ? s.window_return_pct
          : s.first_nav && s.first_nav > 0
            ? Number((((s.latest_nav - s.first_nav) / s.first_nav) * 100).toFixed(2))
            : null;
      if (ret === null) return null;
      return {
        code: s.scheme_code,
        name: s.scheme_name,
        returnPct: ret,
        latestNav: s.latest_nav,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.returnPct - a.returnPct);

  if (scored.length === 0) {
    return {
      count: schemes.length,
      medianReturnPct: null,
      topScheme: null,
      bottomScheme: null,
      positiveCount: 0,
    };
  }

  const mid = Math.floor(scored.length / 2);
  const medianReturnPct =
    scored.length % 2 === 0
      ? Number(((scored[mid - 1].returnPct + scored[mid].returnPct) / 2).toFixed(2))
      : scored[mid].returnPct;

  return {
    count: scored.length,
    medianReturnPct,
    topScheme: scored[0],
    bottomScheme: scored[scored.length - 1],
    positiveCount: scored.filter((s) => s.returnPct >= 0).length,
  };
}
