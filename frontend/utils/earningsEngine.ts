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
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    market: 'us',
    fiscalQuarter: 'Q3 FY27',
    offsetDays: 2,
    utcHour: 21,
    utcMinute: 20,
    session: 'AMC',
    epsEstimate: '$0.84',
    priorEps: '$0.78',
    revenueEstimate: '$44.8B',
    badgeColor: '#089981',
  },
  {
    ticker: 'WMT',
    companyName: 'Walmart Inc.',
    exchange: 'NYSE',
    market: 'us',
    fiscalQuarter: 'Q3 FY27',
    offsetDays: 3,
    utcHour: 12,
    utcMinute: 0,
    session: 'BMO',
    epsEstimate: '$0.56',
    priorEps: '$0.53',
    revenueEstimate: '$171.2B',
    badgeColor: '#2563EB',
  },
  {
    ticker: 'TCS',
    companyName: 'Tata Consultancy Services',
    exchange: 'NSE',
    market: 'india',
    fiscalQuarter: 'Q3 FY27',
    offsetDays: 5,
    utcHour: 10,
    utcMinute: 45,
    session: 'AMC',
    epsEstimate: '₹35.90',
    priorEps: '₹33.40',
    revenueEstimate: '₹66,420 Cr',
    badgeColor: '#1E293B',
  },
  {
    ticker: 'SNOW',
    companyName: 'Snowflake Inc.',
    exchange: 'NYSE',
    market: 'us',
    fiscalQuarter: 'Q3 FY27',
    offsetDays: 7,
    utcHour: 21,
    utcMinute: 5,
    session: 'AMC',
    epsEstimate: '$0.21',
    priorEps: '$0.18',
    revenueEstimate: '$1.04B',
    badgeColor: '#0284C7',
  },
  {
    ticker: 'INFY',
    companyName: 'Infosys Limited',
    exchange: 'NSE',
    market: 'india',
    fiscalQuarter: 'Q3 FY27',
    offsetDays: 9,
    utcHour: 10,
    utcMinute: 30,
    session: 'AMC',
    epsEstimate: '₹17.85',
    priorEps: '₹16.50',
    revenueEstimate: '₹42,180 Cr',
    badgeColor: '#2962FF',
  },
  {
    ticker: 'CRM',
    companyName: 'Salesforce, Inc.',
    exchange: 'NYSE',
    market: 'us',
    fiscalQuarter: 'Q3 FY27',
    offsetDays: 11,
    utcHour: 21,
    utcMinute: 5,
    session: 'AMC',
    epsEstimate: '$2.58',
    priorEps: '$2.41',
    revenueEstimate: '$9.65B',
    badgeColor: '#0EA5E9',
  },
  {
    ticker: 'HDFCBANK',
    companyName: 'HDFC Bank Limited',
    exchange: 'NSE',
    market: 'india',
    fiscalQuarter: 'Q3 FY27',
    offsetDays: 13,
    utcHour: 11,
    utcMinute: 0,
    session: 'AMC',
    epsEstimate: '₹23.40',
    priorEps: '₹21.90',
    revenueEstimate: '₹32,450 Cr',
    badgeColor: '#0F172A',
  },
  {
    ticker: 'AVGO',
    companyName: 'Broadcom Inc.',
    exchange: 'NASDAQ',
    market: 'us',
    fiscalQuarter: 'Q4 FY26',
    offsetDays: 16,
    utcHour: 21,
    utcMinute: 15,
    session: 'AMC',
    epsEstimate: '$1.46',
    priorEps: '$1.39',
    revenueEstimate: '$14.8B',
    badgeColor: '#DC2626',
  },
  {
    ticker: 'RELIANCE',
    companyName: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    market: 'india',
    fiscalQuarter: 'Q3 FY27',
    offsetDays: 18,
    utcHour: 11,
    utcMinute: 30,
    session: 'AMC',
    epsEstimate: '₹14.95',
    priorEps: '₹13.80',
    revenueEstimate: '₹2,41,800 Cr',
    badgeColor: '#059669',
  },
  {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    exchange: 'NASDAQ',
    market: 'us',
    fiscalQuarter: 'Q1 FY27',
    offsetDays: 21,
    utcHour: 21,
    utcMinute: 30,
    session: 'AMC',
    epsEstimate: '$2.38',
    priorEps: '$2.18',
    revenueEstimate: '$124.9B',
    badgeColor: '#131722',
  },
  {
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    market: 'us',
    fiscalQuarter: 'Q2 FY27',
    offsetDays: 24,
    utcHour: 21,
    utcMinute: 5,
    session: 'AMC',
    epsEstimate: '$3.28',
    priorEps: '$3.09',
    revenueEstimate: '$69.4B',
    badgeColor: '#2563EB',
  },
  {
    ticker: 'TSLA',
    companyName: 'Tesla, Inc.',
    exchange: 'NASDAQ',
    market: 'us',
    fiscalQuarter: 'Q4 FY26',
    offsetDays: 27,
    utcHour: 21,
    utcMinute: 5,
    session: 'AMC',
    epsEstimate: '$0.78',
    priorEps: '$0.71',
    revenueEstimate: '$27.4B',
    badgeColor: '#E11D48',
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
 * Generates upcoming quarterly earnings dates anchored cleanly ahead of `nowMs`
 * so major global and India NSE tickers always have active release dates & countdowns.
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
