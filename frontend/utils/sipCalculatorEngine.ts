import { SCREENER_FUNDS, ScreenerFundRecord } from './screenerEngine';
import { getFundIntelligence } from './fundIntelligenceEngine';

export type SipCurrency = 'INR' | 'USD';
export type SipInstrumentTypeFilter = 'ALL' | 'Mutual Fund' | 'ETF';

export interface SipInstrumentOption {
  symbol: string;
  name: string;
  instrumentType: 'Mutual Fund' | 'ETF';
  category: string;
  currency: SipCurrency;
  amfiCode: string | null;
  annualReturn3YPct: number;
  directTerPct: number;
  estimatedRegularTerPct: number;
  sharpe3Y: number;
  aumLabel: string;
  price: number;
}

const KNOWN_AMFI_SCHEME_CODES: Record<string, string> = {
  PPFAS: '122639',
  HDFCMID: '118989',
  UTI50: '120716',
  SBIGILT: '119707',
  QUANTSC: '120828',
  MIRAEBLUE: '118834',
  NIPSMALL: '118778',
  HDFCCORP: '119062',
  ICICIGILT: '120594',
};

function estimateRegularTerPct(fund: ScreenerFundRecord): number {
  const direct = fund.about.expenseRatioPct;
  if (fund.instrumentType === 'Mutual Fund') {
    const spread = fund.category.includes('Debt') || fund.category.includes('Gilt') ? 0.5 : 0.85;
    return Number((direct + spread).toFixed(2));
  }
  return Number((direct + 0.35).toFixed(2));
}

export function buildAllSipInstrumentOptions(
  funds: ScreenerFundRecord[] = SCREENER_FUNDS
): SipInstrumentOption[] {
  return funds.map((fund) => {
    const intel = getFundIntelligence(fund);
    const rawAnnual = intel.returnOnAverage.avgAnnualReturn3Y;
    const safeAnnual = Number(
      Math.min(35, Math.max(1, Number.isFinite(rawAnnual) ? rawAnnual : 10)).toFixed(2)
    );
    return {
      symbol: fund.symbol,
      name: fund.name,
      instrumentType: fund.instrumentType,
      category: fund.category,
      currency: fund.currency === 'USD' ? 'USD' : 'INR',
      amfiCode: fund.amfiCode ?? KNOWN_AMFI_SCHEME_CODES[fund.symbol] ?? null,
      annualReturn3YPct: safeAnnual,
      directTerPct: Number(fund.about.expenseRatioPct.toFixed(2)),
      estimatedRegularTerPct: estimateRegularTerPct(fund),
      sharpe3Y: Number(fund.keyStats.sharpe3Y.toFixed(2)),
      aumLabel: fund.keyStats.aumLabel,
      price: fund.price,
    };
  });
}

export function filterSipInstruments(
  options: SipInstrumentOption[],
  query: string,
  typeFilter: SipInstrumentTypeFilter = 'ALL'
): SipInstrumentOption[] {
  const q = query.trim().toLowerCase();
  return options.filter((opt) => {
    if (typeFilter !== 'ALL' && opt.instrumentType !== typeFilter) return false;
    if (!q) return true;
    return (
      opt.symbol.toLowerCase().includes(q) ||
      opt.name.toLowerCase().includes(q) ||
      opt.category.toLowerCase().includes(q) ||
      (opt.amfiCode ? opt.amfiCode.includes(q) : false)
    );
  });
}

export function formatSipCurrency(value: number, currency: SipCurrency): string {
  const safe = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(safe);
  const sign = safe < 0 ? '-' : '';

  if (currency === 'USD') {
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
    return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
  }

  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}
