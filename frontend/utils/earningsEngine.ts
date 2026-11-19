export type EarningsMarketScope = 'all' | 'us' | 'india';
export type EarningsSessionWindow = 'BMO' | 'AMC';

export interface EarningsCalendarEvent {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
  market: 'us' | 'india';
  fiscalQuarter: string;
  reportDateIso: string;
  dateLabel: string;
  session: EarningsSessionWindow;
  epsEstimate: string;
  priorEps: string;
  revenueEstimate: string;
  badgeColor: string;
}

export interface CountdownParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isDue: boolean;
  isSoon: boolean;
  formatted: string;
}

interface SeedEarningsTemplate {
  ticker: string;
  companyName: string;
  exchange: string;
  market: 'us' | 'india';
  fiscalQuarter: string;
  offsetDays: number;
  utcHour: number;
  utcMinute: number;
  session: EarningsSessionWindow;
  epsEstimate: string;
  priorEps: string;
  revenueEstimate: string;
  badgeColor: string;
}

const MAJOR_EARNINGS_TEMPLATES: SeedEarningsTemplate[] = [
  {
    ticker: 'GOLDBEES',
    companyName: 'Nippon India ETF Gold BeES · Vault Audit',
    exchange: 'NSE',
    market: 'india',
    fiscalQuarter: 'Q3 FY27',
    offsetDays: 2,
    utcHour: 10,
    utcMinute: 0,
    session: 'AMC',
    epsEstimate: '₹72.40',
    priorEps: '₹69.85',
    revenueEstimate: '₹14,820 Cr',
    badgeColor: '#D97706',
  },
  {
    ticker: 'SBIGILT',
    companyName: 'SBI Magnum Gilt Fund · RBI MPC Cycle',
    exchange: 'AMFI',
    market: 'india',
    fiscalQuarter: 'MPC Dec',
    offsetDays: 3,
    utcHour: 4,
    utcMinute: 30,
    session: 'BMO',
    epsEstimate: '7.18% YTM',
    priorEps: '7.26% YTM',
    revenueEstimate: '₹11,240 Cr',
    badgeColor: '#089981',
  },
  {
    ticker: 'AGG',
    companyName: 'iShares Core U.S. Aggregate Bond ETF',
    exchange: 'NYSE ARCA',
    market: 'us',
    fiscalQuarter: 'Monthly Dist.',
    offsetDays: 5,
    utcHour: 13,
    utcMinute: 30,
    session: 'BMO',
    epsEstimate: '4.68% YTM',
    priorEps: '4.54% YTM',
    revenueEstimate: '$118.4B',
    badgeColor: '#2563EB',
  },
  {
    ticker: 'PPFAS',
    companyName: 'Parag Parikh Flexi Cap · AMFI Portfolio',
    exchange: 'AMFI',
    market: 'india',
    fiscalQuarter: 'Monthly Fact',
    offsetDays: 7,
    utcHour: 12,
    utcMinute: 30,
    session: 'AMC',
    epsEstimate: '21.8% 3Y',
    priorEps: '20.9% 3Y',
    revenueEstimate: '₹84,120 Cr',
    badgeColor: '#2962FF',
  },
  {
    ticker: 'TLT',
    companyName: 'iShares 20+ Year Treasury Bond · FOMC',
    exchange: 'NASDAQ',
    market: 'us',
    fiscalQuarter: 'FOMC Rate',
    offsetDays: 9,
    utcHour: 19,
    utcMinute: 0,
    session: 'AMC',
    epsEstimate: '4.45% YTM',
    priorEps: '4.62% YTM',
    revenueEstimate: '$58.2B',
    badgeColor: '#0F172A',
  },
  {
    ticker: 'SGBMAR31',
    companyName: 'RBI Sovereign Gold Bond Tranche IV',
    exchange: 'RBI / NSE',
    market: 'india',
    fiscalQuarter: 'Tranche IV',
    offsetDays: 11,
    utcHour: 11,
    utcMinute: 0,
    session: 'AMC',
    epsEstimate: '2.50% Cpn',
    priorEps: '2.50% Cpn',
    revenueEstimate: '₹4,950 Cr',
    badgeColor: '#B45309',
  },
  {
    ticker: 'HDFCCORP',
    companyName: 'HDFC Corporate Bond Fund · AAA Accrual',
    exchange: 'AMFI',
    market: 'india',
    fiscalQuarter: 'Yield Roll',
    offsetDays: 13,
    utcHour: 12,
    utcMinute: 0,
    session: 'AMC',
    epsEstimate: '7.52% YTM',
    priorEps: '7.58% YTM',
    revenueEstimate: '₹31,640 Cr',
    badgeColor: '#059669',
  },
  {
    ticker: 'GLD',
    companyName: 'SPDR Gold Shares · LBMA Bullion Bar List',
    exchange: 'NYSE ARCA',
    market: 'us',
    fiscalQuarter: 'Vault Audit',
    offsetDays: 16,
    utcHour: 14,
    utcMinute: 0,
    session: 'BMO',
    epsEstimate: '0.40% TER',
    priorEps: '0.40% TER',
    revenueEstimate: '$74.8B',
    badgeColor: '#CA8A04',
  },
  {
    ticker: 'NIFTYBEES',
    companyName: 'Nippon India ETF Nifty 50 BeES · Rebalance',
    exchange: 'NSE',
    market: 'india',
    fiscalQuarter: 'Semi-Annual',
    offsetDays: 18,
    utcHour: 10,
    utcMinute: 15,
    session: 'AMC',
    epsEstimate: '0.04% TER',
    priorEps: '0.04% TER',
    revenueEstimate: '₹39,400 Cr',
    badgeColor: '#1D4ED8',
  },
  {
    ticker: 'SPY',
    companyName: 'SPDR S&P 500 ETF Trust · Ex-Distribution',
    exchange: 'NYSE ARCA',
    market: 'us',
    fiscalQuarter: 'Q4 Dist.',
    offsetDays: 21,
    utcHour: 13,
    utcMinute: 30,
    session: 'BMO',
    epsEstimate: '$1.86 Dist',
    priorEps: '$1.74 Dist',
    revenueEstimate: '$628.0B',
    badgeColor: '#131722',
  },
  {
    ticker: 'LIQUIDBEES',
    companyName: 'Nippon India ETF Liquid BeES · T-Bill Reset',
    exchange: 'NSE',
    market: 'india',
    fiscalQuarter: 'Weekly Reset',
    offsetDays: 24,
    utcHour: 11,
    utcMinute: 0,
    session: 'AMC',
    epsEstimate: '6.82% YTM',
    priorEps: '6.85% YTM',
    revenueEstimate: '₹12,900 Cr',
    badgeColor: '#0E7490',
  },
  {
    ticker: 'QQQ',
    companyName: 'Invesco QQQ Trust · Annual Reconstitution',
    exchange: 'NASDAQ',
    market: 'us',
    fiscalQuarter: 'Annual Rebal',
    offsetDays: 27,
    utcHour: 21,
    utcMinute: 0,
    session: 'AMC',
    epsEstimate: '0.20% TER',
    priorEps: '0.20% TER',
    revenueEstimate: '$314.2B',
    badgeColor: '#4338CA',
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

export function formatEarningsDateLabel(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Upcoming';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * Generates upcoming Mutual Fund NFO, Gold tranche, Debt yield & ETF rebalance dates
 * anchored cleanly ahead of `nowMs`.
 */
export function buildUpcomingEarningsCalendar(nowMs: number = Date.now()): EarningsCalendarEvent[] {
  const baseDate = new Date(nowMs);
  const startOfDayUtc = Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate()
  );

  return MAJOR_EARNINGS_TEMPLATES.map((tpl) => {
    const releaseMs =
      startOfDayUtc +
      tpl.offsetDays * 86400 * 1000 +
      tpl.utcHour * 3600 * 1000 +
      tpl.utcMinute * 60 * 1000;
    const iso = new Date(releaseMs).toISOString();

    return {
      id: `earn-${tpl.ticker.toLowerCase()}`,
      ticker: tpl.ticker,
      companyName: tpl.companyName,
      exchange: tpl.exchange,
      market: tpl.market,
      fiscalQuarter: tpl.fiscalQuarter,
      reportDateIso: iso,
      dateLabel: formatEarningsDateLabel(iso),
      session: tpl.session,
      epsEstimate: tpl.epsEstimate,
      priorEps: tpl.priorEps,
      revenueEstimate: tpl.revenueEstimate,
      badgeColor: tpl.badgeColor,
    };
  }).sort((a, b) => Date.parse(a.reportDateIso) - Date.parse(b.reportDateIso));
}

/**
 * Computes real-time countdown components between `nowMs` and `reportDateIso`.
 */
export function computeCountdownParts(reportDateIso: string, nowMs: number): CountdownParts {
  const targetMs = Date.parse(reportDateIso);
  if (!Number.isFinite(targetMs)) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isDue: true,
      isSoon: false,
      formatted: 'Reporting soon',
    };
  }

  const diffMs = Math.max(0, targetMs - nowMs);
  if (diffMs === 0) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isDue: true,
      isSoon: true,
      formatted: 'Reported / Live',
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted =
    days > 0
      ? `${days}d ${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`
      : `${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;

  return {
    totalMs: diffMs,
    days,
    hours,
    minutes,
    seconds,
    isDue: false,
    isSoon: diffMs <= 72 * 3600 * 1000,
    formatted,
  };
}

/**
 * Filters upcoming earnings events by market scope ('all' | 'us' | 'india') and ticker/company query.
 */
export function filterEarningsEvents(
  events: EarningsCalendarEvent[],
  market: EarningsMarketScope,
  query: string
): EarningsCalendarEvent[] {
  const normalizedQuery = query.trim().toUpperCase();
  return events.filter((item) => {
    if (market !== 'all' && item.market !== market) return false;
    if (!normalizedQuery) return true;
    return (
      item.ticker.toUpperCase().includes(normalizedQuery) ||
      item.companyName.toUpperCase().includes(normalizedQuery) ||
      item.exchange.toUpperCase().includes(normalizedQuery)
    );
  });
}

/**
 * Safely merges optional Finnhub `/calendar/earnings` response rows into baseline events.
 */
export function mergeFinnhubEarnings(
  rawPayload: unknown,
  baseline: EarningsCalendarEvent[]
): EarningsCalendarEvent[] {
  if (!rawPayload || typeof rawPayload !== 'object') return baseline;
  const rows = (rawPayload as { earningsCalendar?: unknown }).earningsCalendar;
  if (!Array.isArray(rows) || rows.length === 0) return baseline;

  const byTicker = new Map<string, { date?: string; epsEstimate?: number; revenueEstimate?: number; hour?: string }>();
  for (const row of rows) {
    const item = row as { symbol?: string; date?: string; epsEstimate?: number; revenueEstimate?: number; hour?: string };
    if (item && typeof item.symbol === 'string' && typeof item.date === 'string') {
      byTicker.set(item.symbol.toUpperCase(), item);
    }
  }

  return baseline.map((event) => {
    const live = byTicker.get(event.ticker.toUpperCase());
    if (!live || !live.date) return event;
    const isBmo = live.hour === 'bmo';
    const hourStr = isBmo ? '12:00:00Z' : '21:15:00Z';
    const nextIso = `${live.date}T${hourStr}`;
    if (Number.isNaN(Date.parse(nextIso))) return event;

    return {
      ...event,
      reportDateIso: nextIso,
      dateLabel: formatEarningsDateLabel(nextIso),
      session: isBmo ? 'BMO' : 'AMC',
      epsEstimate:
        typeof live.epsEstimate === 'number' && Number.isFinite(live.epsEstimate)
          ? `$${live.epsEstimate.toFixed(2)}`
          : event.epsEstimate,
      revenueEstimate:
        typeof live.revenueEstimate === 'number' && live.revenueEstimate > 0
          ? `$${(live.revenueEstimate / 1e9).toFixed(1)}B`
          : event.revenueEstimate,
    };
  });
}
