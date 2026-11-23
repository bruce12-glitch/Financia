import { GLOBAL_STOCK_EXCHANGES, StockExchangeNode } from './globalExchanges';

export type ExchangeSessionStatus = 'OPEN' | 'PRE_MARKET' | 'AFTER_HOURS' | 'CLOSED';

export interface ExchangeOperationalProfile {
  id: string;
  timezone: string;
  utcOffsetHours: number;
  openHourLocal: number; // decimal hours e.g. 9.25 = 09:15
  closeHourLocal: number; // decimal hours e.g. 15.5 = 15:30
  tradingHoursLabel: string;
  currency: string;
  settlementCycle: string;
  marketCapLabel: string;
  listedEtfsCount: number;
  avgDailyTurnoverLabel: string;
  featuredSymbols: string[];
  assetSpecialties: string[];
  benchmarkChangePct: number;
}

export interface ExchangeLiveSessionState {
  exchangeId: string;
  status: ExchangeSessionStatus;
  statusLabel: string;
  localTimeStr: string;
  nextTransitionLabel: string;
  sessionProgressPct: number; // 0..100 when open
  openUtcHour: number; // 0..24
  closeUtcHour: number; // 0..24 (can wrap)
}

export const EXCHANGE_PROFILES: Record<string, ExchangeOperationalProfile> = {
  bvc: {
    id: 'bvc',
    timezone: 'VET (UTC-4)',
    utcOffsetHours: -4,
    openHourLocal: 9.0,
    closeHourLocal: 13.0,
    tradingHoursLabel: '09:00 – 13:00 VET',
    currency: 'VES / USD',
    settlementCycle: 'T+1',
    marketCapLabel: '$4.8B',
    listedEtfsCount: 18,
    avgDailyTurnoverLabel: '$32M',
    featuredSymbols: ['GLD', 'AGG', 'TLT'],
    assetSpecialties: ['Sovereign Debt', 'Inflation Hedges', 'Bullion'],
    benchmarkChangePct: 0.84,
  },
  nyse: {
    id: 'nyse',
    timezone: 'EST (UTC-5)',
    utcOffsetHours: -5,
    openHourLocal: 9.5,
    closeHourLocal: 16.0,
    tradingHoursLabel: '09:30 – 16:00 EST',
    currency: 'USD',
    settlementCycle: 'T+1',
    marketCapLabel: '$28.6T',
    listedEtfsCount: 2140,
    avgDailyTurnoverLabel: '$142B',
    featuredSymbols: ['SPY', 'VTI', 'GLD', 'AGG'],
    assetSpecialties: ['Arca ETFs', 'Physical Gold Trusts', 'US Treasuries'],
    benchmarkChangePct: 0.42,
  },
  nasdaq: {
    id: 'nasdaq',
    timezone: 'EST (UTC-5)',
    utcOffsetHours: -5,
    openHourLocal: 9.5,
    closeHourLocal: 16.0,
    tradingHoursLabel: '09:30 – 16:00 EST',
    currency: 'USD',
    settlementCycle: 'T+1',
    marketCapLabel: '$26.4T',
    listedEtfsCount: 740,
    avgDailyTurnoverLabel: '$118B',
    featuredSymbols: ['QQQ', 'TLT', 'VOO', 'GLD'],
    assetSpecialties: ['Tech Index ETFs', 'Long-Duration Bonds', 'Options Liquidity'],
    benchmarkChangePct: -0.68,
  },
  tsx: {
    id: 'tsx',
    timezone: 'EST (UTC-5)',
    utcOffsetHours: -5,
    openHourLocal: 9.5,
    closeHourLocal: 16.0,
    tradingHoursLabel: '09:30 – 16:00 EST',
    currency: 'CAD',
    settlementCycle: 'T+1',
    marketCapLabel: '$3.4T',
    listedEtfsCount: 1120,
    avgDailyTurnoverLabel: '$9.8B',
    featuredSymbols: ['GLD', 'VTI', 'AGG'],
    assetSpecialties: ['Resource ETFs', 'Bullion Vaults', 'Dividend Funds'],
    benchmarkChangePct: 0.31,
  },
  bmv: {
    id: 'bmv',
    timezone: 'CST (UTC-6)',
    utcOffsetHours: -6,
    openHourLocal: 8.5,
    closeHourLocal: 15.0,
    tradingHoursLabel: '08:30 – 15:00 CST',
    currency: 'MXN',
    settlementCycle: 'T+1',
    marketCapLabel: '$0.54T',
    listedEtfsCount: 165,
    avgDailyTurnoverLabel: '$1.4B',
    featuredSymbols: ['AGG', 'SPY', 'GLD'],
    assetSpecialties: ['M-Bono Debt', 'SIC Cross-Listed ETFs', 'Index Trackers'],
    benchmarkChangePct: 0.19,
  },
  b3: {
    id: 'b3',
    timezone: 'BRT (UTC-3)',
    utcOffsetHours: -3,
    openHourLocal: 10.0,
    closeHourLocal: 17.0,
    tradingHoursLabel: '10:00 – 17:00 BRT',
    currency: 'BRL',
    settlementCycle: 'T+2',
    marketCapLabel: '$0.89T',
    listedEtfsCount: 112,
    avgDailyTurnoverLabel: '$4.7B',
    featuredSymbols: ['VTI', 'GLD', 'AGG'],
    assetSpecialties: ['Fixed Income ETFs', 'CDI Treasury Funds', 'Commodities'],
    benchmarkChangePct: 0.56,
  },
  lse: {
    id: 'lse',
    timezone: 'GMT (UTC+0)',
    utcOffsetHours: 0,
    openHourLocal: 8.0,
    closeHourLocal: 16.5,
    tradingHoursLabel: '08:00 – 16:30 GMT',
    currency: 'GBP / USD',
    settlementCycle: 'T+2',
    marketCapLabel: '$3.3T',
    listedEtfsCount: 1890,
    avgDailyTurnoverLabel: '$12.6B',
    featuredSymbols: ['PAXGUSDT', 'GLD', 'TLT', 'VOO'],
    assetSpecialties: ['LBMA Gold Fixing', 'UCITS ETFs', 'UK Gilts'],
    benchmarkChangePct: 0.27,
  },
  euronext: {
    id: 'euronext',
    timezone: 'CET (UTC+1)',
    utcOffsetHours: 1,
    openHourLocal: 9.0,
    closeHourLocal: 17.5,
    tradingHoursLabel: '09:00 – 17:30 CET',
    currency: 'EUR',
    settlementCycle: 'T+2',
    marketCapLabel: '$6.9T',
    listedEtfsCount: 1420,
    avgDailyTurnoverLabel: '$14.8B',
    featuredSymbols: ['VOO', 'AGG', 'SPY'],
    assetSpecialties: ['UCITS Core ETFs', 'Eurozone Debt', 'ESG Funds'],
    benchmarkChangePct: 0.35,
  },
  fwb: {
    id: 'fwb',
    timezone: 'CET (UTC+1)',
    utcOffsetHours: 1,
    openHourLocal: 9.0,
    closeHourLocal: 17.5,
    tradingHoursLabel: '09:00 – 17:30 CET',
    currency: 'EUR',
    settlementCycle: 'T+2',
    marketCapLabel: '$2.4T',
    listedEtfsCount: 2210,
    avgDailyTurnoverLabel: '$11.2B',
    featuredSymbols: ['GLD', 'TLT', 'VTI'],
    assetSpecialties: ['Xetra-Gold', 'European ETF Hub', 'German Bunds'],
    benchmarkChangePct: -0.14,
  },
  six: {
    id: 'six',
    timezone: 'CET (UTC+1)',
    utcOffsetHours: 1,
    openHourLocal: 9.0,
    closeHourLocal: 17.5,
    tradingHoursLabel: '09:00 – 17:30 CET',
    currency: 'CHF',
    settlementCycle: 'T+2',
    marketCapLabel: '$2.1T',
    listedEtfsCount: 1760,
    avgDailyTurnoverLabel: '$6.4B',
    featuredSymbols: ['TLT', 'GLD', 'PAXGUSDT'],
    assetSpecialties: ['Swiss Gold Vault ETFs', 'Safe-Haven Bonds', 'Structured Funds'],
    benchmarkChangePct: 0.22,
  },
  nse: {
    id: 'nse',
    timezone: 'IST (UTC+5:30)',
    utcOffsetHours: 5.5,
    openHourLocal: 9.25,
    closeHourLocal: 15.5,
    tradingHoursLabel: '09:15 – 15:30 IST',
    currency: 'INR',
    settlementCycle: 'T+1',
    marketCapLabel: '$5.1T',
    listedEtfsCount: 248,
    avgDailyTurnoverLabel: '$16.4B',
    featuredSymbols: ['NIFTYBEES', 'BANKBEES', 'GOLDBEES', 'JUNIORBEES'],
    assetSpecialties: ['Index BeES ETFs', 'Gold & Silver ETFs', 'Sovereign G-Sec'],
    benchmarkChangePct: 0.72,
  },
  bse: {
    id: 'bse',
    timezone: 'IST (UTC+5:30)',
    utcOffsetHours: 5.5,
    openHourLocal: 9.25,
    closeHourLocal: 15.5,
    tradingHoursLabel: '09:15 – 15:30 IST',
    currency: 'INR',
    settlementCycle: 'T+1',
    marketCapLabel: '$5.2T',
    listedEtfsCount: 220,
    avgDailyTurnoverLabel: '$5.9B',
    featuredSymbols: ['PPFAS', 'HDFCMID', 'QUANTSC', 'SBIGILT'],
    assetSpecialties: ['BSE StAR Direct MF', 'AMFI SIF Schemes', 'Corporate Bonds'],
    benchmarkChangePct: 0.65,
  },
  tse: {
    id: 'tse',
    timezone: 'JST (UTC+9)',
    utcOffsetHours: 9,
    openHourLocal: 9.0,
    closeHourLocal: 15.5,
    tradingHoursLabel: '09:00 – 15:30 JST',
    currency: 'JPY',
    settlementCycle: 'T+2',
    marketCapLabel: '$6.6T',
    listedEtfsCount: 335,
    avgDailyTurnoverLabel: '$28.5B',
    featuredSymbols: ['AGG', 'VTI', 'GLD'],
    assetSpecialties: ['TOPIX Index ETFs', 'JGB Sovereign Debt', 'Currency Hedged'],
    benchmarkChangePct: 0.48,
  },
  hkex: {
    id: 'hkex',
    timezone: 'HKT (UTC+8)',
    utcOffsetHours: 8,
    openHourLocal: 9.5,
    closeHourLocal: 16.0,
    tradingHoursLabel: '09:30 – 16:00 HKT',
    currency: 'HKD / CNH',
    settlementCycle: 'T+2',
    marketCapLabel: '$4.5T',
    listedEtfsCount: 192,
    avgDailyTurnoverLabel: '$19.3B',
    featuredSymbols: ['INDA', 'QQQ', 'PAXGUSDT'],
    assetSpecialties: ['Bond Connect', 'Cross-Border ETFs', 'Asian Bullion'],
    benchmarkChangePct: -0.34,
  },
  sse: {
    id: 'sse',
    timezone: 'CST (UTC+8)',
    utcOffsetHours: 8,
    openHourLocal: 9.5,
    closeHourLocal: 15.0,
    tradingHoursLabel: '09:30 – 15:00 CST',
    currency: 'CNY',
    settlementCycle: 'T+1',
    marketCapLabel: '$7.2T',
    listedEtfsCount: 615,
    avgDailyTurnoverLabel: '$54.0B',
    featuredSymbols: ['PAXGUSDT', 'GLD', 'AGG'],
    assetSpecialties: ['SGE Gold Fix', 'CGB Treasury Bonds', 'Onshore ETFs'],
    benchmarkChangePct: 0.21,
  },
  krx: {
    id: 'krx',
    timezone: 'KST (UTC+9)',
    utcOffsetHours: 9,
    openHourLocal: 9.0,
    closeHourLocal: 15.5,
    tradingHoursLabel: '09:00 – 15:30 KST',
    currency: 'KRW',
    settlementCycle: 'T+2',
    marketCapLabel: '$1.9T',
    listedEtfsCount: 890,
    avgDailyTurnoverLabel: '$14.1B',
    featuredSymbols: ['NIFTYBEES', 'QQQ', 'VTI'],
    assetSpecialties: ['KODEX Thematic ETFs', 'KTB Bonds', 'Semiconductor Trackers'],
    benchmarkChangePct: 0.59,
  },
  sgx: {
    id: 'sgx',
    timezone: 'SGT (UTC+8)',
    utcOffsetHours: 8,
    openHourLocal: 9.0,
    closeHourLocal: 17.0,
    tradingHoursLabel: '09:00 – 17:00 SGT',
    currency: 'SGD / USD',
    settlementCycle: 'T+2',
    marketCapLabel: '$0.64T',
    listedEtfsCount: 47,
    avgDailyTurnoverLabel: '$1.1B',
    featuredSymbols: ['SBIGILT', 'GLD', 'INDA'],
    assetSpecialties: ['REIT & Sovereign ETFs', 'ASEAN Bonds', 'SPDR Gold SG'],
    benchmarkChangePct: 0.18,
  },
  asx: {
    id: 'asx',
    timezone: 'AEST (UTC+10)',
    utcOffsetHours: 10,
    openHourLocal: 10.0,
    closeHourLocal: 16.0,
    tradingHoursLabel: '10:00 – 16:00 AEST',
    currency: 'AUD',
    settlementCycle: 'T+2',
    marketCapLabel: '$1.8T',
    listedEtfsCount: 360,
    avgDailyTurnoverLabel: '$5.2B',
    featuredSymbols: ['SILVERBEES', 'GLD', 'VTI'],
    assetSpecialties: ['Perth Mint Gold', 'Commodity ETFs', 'Fixed Income'],
    benchmarkChangePct: 0.37,
  },
  tadawul: {
    id: 'tadawul',
    timezone: 'AST (UTC+3)',
    utcOffsetHours: 3,
    openHourLocal: 10.0,
    closeHourLocal: 15.0,
    tradingHoursLabel: '10:00 – 15:00 AST',
    currency: 'SAR',
    settlementCycle: 'T+2',
    marketCapLabel: '$2.8T',
    listedEtfsCount: 16,
    avgDailyTurnoverLabel: '$1.9B',
    featuredSymbols: ['HDFCCORP', 'GLD', 'AGG'],
    assetSpecialties: ['Sukuk Sovereign Debt', 'Sharia ETFs', 'Energy Index'],
    benchmarkChangePct: 0.14,
  },
  jse: {
    id: 'jse',
    timezone: 'SAST (UTC+2)',
    utcOffsetHours: 2,
    openHourLocal: 9.0,
    closeHourLocal: 17.0,
    tradingHoursLabel: '09:00 – 17:00 SAST',
    currency: 'ZAR',
    settlementCycle: 'T+3',
    marketCapLabel: '$1.1T',
    listedEtfsCount: 108,
    avgDailyTurnoverLabel: '$1.6B',
    featuredSymbols: ['LIQUIDBEES', 'GLD', 'SILVERBEES'],
    assetSpecialties: ['NewGold Bullion ETF', 'EM Sovereign Debt', 'Precious Metals'],
    benchmarkChangePct: -0.22,
  },
};

export function getExchangeProfile(exchangeId: string): ExchangeOperationalProfile {
  return (
    EXCHANGE_PROFILES[exchangeId] || {
      id: exchangeId,
      timezone: 'UTC',
      utcOffsetHours: 0,
      openHourLocal: 9.0,
      closeHourLocal: 16.0,
      tradingHoursLabel: '09:00 – 16:00 UTC',
      currency: 'USD',
      settlementCycle: 'T+2',
      marketCapLabel: '$1.0T',
      listedEtfsCount: 50,
      avgDailyTurnoverLabel: '$2.0B',
      featuredSymbols: ['SPY', 'GLD'],
      assetSpecialties: ['ETFs', 'Debt'],
      benchmarkChangePct: 0.1,
    }
  );
}

function formatHourMin(decimalHour: number): string {
  const norm = ((decimalHour % 24) + 24) % 24;
  const hh = Math.floor(norm);
  const mm = Math.round((norm - hh) * 60) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatDurationHours(hours: number): string {
  const clamped = Math.max(0, hours);
  const h = Math.floor(clamped);
  const m = Math.round((clamped - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Computes real-time session status (OPEN, PRE_MARKET, AFTER_HOURS, CLOSED), local clock,
 * progress percentage, and countdown for any global stock exchange at a given Date.
 */
export function computeExchangeLiveSession(
  exchangeId: string,
  now: Date = new Date()
): ExchangeLiveSessionState {
  const profile = getExchangeProfile(exchangeId);
  const utcMs = now.getTime();
  const localMs = utcMs + profile.utcOffsetHours * 3600 * 1000;
  const localDate = new Date(localMs);

  const dayOfWeek = localDate.getUTCDay(); // 0 Sun .. 6 Sat
  const localHour = localDate.getUTCHours() + localDate.getUTCMinutes() / 60;
  const localTimeStr = formatHourMin(localHour);

  const openUtcHour = ((profile.openHourLocal - profile.utcOffsetHours) % 24 + 24) % 24;
  const closeUtcHour = ((profile.closeHourLocal - profile.utcOffsetHours) % 24 + 24) % 24;

  // Tadawul operates Sun–Thu; all other major exchanges operate Mon–Fri
  const isTadawul = exchangeId === 'tadawul';
  const isTradingDay = isTadawul
    ? dayOfWeek >= 0 && dayOfWeek <= 4
    : dayOfWeek >= 1 && dayOfWeek <= 5;

  if (!isTradingDay) {
    return {
      exchangeId,
      status: 'CLOSED',
      statusLabel: 'Weekend Closed',
      localTimeStr,
      nextTransitionLabel: `Opens ${formatHourMin(profile.openHourLocal)} local`,
      sessionProgressPct: 0,
      openUtcHour,
      closeUtcHour,
    };
  }

  if (localHour >= profile.openHourLocal && localHour < profile.closeHourLocal) {
    const duration = Math.max(0.5, profile.closeHourLocal - profile.openHourLocal);
    const progress = Math.min(100, Math.max(0, ((localHour - profile.openHourLocal) / duration) * 100));
    return {
      exchangeId,
      status: 'OPEN',
      statusLabel: 'Market Open',
      localTimeStr,
      nextTransitionLabel: `Closes in ${formatDurationHours(profile.closeHourLocal - localHour)}`,
      sessionProgressPct: Math.round(progress),
      openUtcHour,
      closeUtcHour,
    };
  }

  if (localHour >= profile.openHourLocal - 1.5 && localHour < profile.openHourLocal) {
    return {
      exchangeId,
      status: 'PRE_MARKET',
      statusLabel: 'Pre-Market',
      localTimeStr,
      nextTransitionLabel: `Opens in ${formatDurationHours(profile.openHourLocal - localHour)}`,
      sessionProgressPct: 0,
      openUtcHour,
      closeUtcHour,
    };
  }

  if (localHour >= profile.closeHourLocal && localHour < profile.closeHourLocal + 2.0) {
    return {
      exchangeId,
      status: 'AFTER_HOURS',
      statusLabel: 'After-Hours',
      localTimeStr,
      nextTransitionLabel: `Closed · Next ${formatHourMin(profile.openHourLocal)}`,
      sessionProgressPct: 100,
      openUtcHour,
      closeUtcHour,
    };
  }

  const hoursUntilOpen =
    localHour < profile.openHourLocal
      ? profile.openHourLocal - localHour
      : 24 - localHour + profile.openHourLocal;

  return {
    exchangeId,
    status: 'CLOSED',
    statusLabel: 'Closed',
    localTimeStr,
    nextTransitionLabel: `Opens in ${formatDurationHours(hoursUntilOpen)}`,
    sessionProgressPct: 0,
    openUtcHour,
    closeUtcHour,
  };
}

export interface GlobalSessionSummary {
  openCount: number;
  preMarketCount: number;
  afterHoursCount: number;
  closedCount: number;
  totalListedEtfs: number;
  activeOverlapName: string;
  sessionsById: Record<string, ExchangeLiveSessionState>;
}

export function summarizeGlobalExchangeSessions(
  exchanges: StockExchangeNode[] = GLOBAL_STOCK_EXCHANGES,
  now: Date = new Date()
): GlobalSessionSummary {
  const sessionsById: Record<string, ExchangeLiveSessionState> = {};
  let openCount = 0;
  let preMarketCount = 0;
  let afterHoursCount = 0;
  let closedCount = 0;
  let totalListedEtfs = 0;

  for (const ex of exchanges) {
    const session = computeExchangeLiveSession(ex.id, now);
    sessionsById[ex.id] = session;
    totalListedEtfs += getExchangeProfile(ex.id).listedEtfsCount;
    if (session.status === 'OPEN') openCount += 1;
    else if (session.status === 'PRE_MARKET') preMarketCount += 1;
    else if (session.status === 'AFTER_HOURS') afterHoursCount += 1;
    else closedCount += 1;
  }

  const nyOpen = sessionsById.nyse?.status === 'OPEN';
  const londonOpen = sessionsById.lse?.status === 'OPEN';
  const indiaOpen = sessionsById.nse?.status === 'OPEN';
  const tokyoOpen = sessionsById.tse?.status === 'OPEN';

  let activeOverlapName = 'Off-Peak Global Settlement Window';
  if (londonOpen && nyOpen) activeOverlapName = 'London ↔ New York Peak Liquidity Overlap';
  else if (indiaOpen && londonOpen) activeOverlapName = 'Mumbai ↔ London Cross-Session Overlap';
  else if (tokyoOpen && indiaOpen) activeOverlapName = 'Tokyo ↔ Mumbai Asia-Pacific Overlap';
  else if (nyOpen) activeOverlapName = 'Americas Primary ETF & Treasury Session';
  else if (londonOpen) activeOverlapName = 'Europe & LBMA Bullion Session';
  else if (indiaOpen) activeOverlapName = 'India NSE/BSE AMFI & BeES Session';
  else if (tokyoOpen) activeOverlapName = 'Asia-Pacific Sovereign & Index Session';

  return {
    openCount,
    preMarketCount,
    afterHoursCount,
    closedCount,
    totalListedEtfs,
    activeOverlapName,
    sessionsById,
  };
}
