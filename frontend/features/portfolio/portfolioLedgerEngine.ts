import Decimal from 'decimal.js';
import { z } from 'zod';

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export type AssetClassBucket = 'Equity' | 'Debt' | 'Gold' | 'Hybrid' | 'Global ETF';
export type LedgerTxType = 'BUY' | 'SELL' | 'SIP' | 'SWITCH_IN' | 'SWITCH_OUT' | 'DIVIDEND';
export type LedgerSource = 'CAS' | 'CSV' | 'MANUAL';

export const LedgerTransactionSchema = z.object({
  id: z.string().min(1).max(128),
  symbol: z.string().min(1).max(32).regex(/^[A-Za-z0-9._\-^]+$/),
  schemeName: z.string().min(1).max(160),
  isin: z.string().max(24).optional().default(''),
  assetClass: z.enum(['Equity', 'Debt', 'Gold', 'Hybrid', 'Global ETF']),
  txType: z.enum(['BUY', 'SELL', 'SIP', 'SWITCH_IN', 'SWITCH_OUT', 'DIVIDEND']),
  tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  units: z.string().regex(/^[0-9]+(\.[0-9]{1,6})?$/),
  price: z.string().regex(/^[0-9]+(\.[0-9]{1,6})?$/),
  amount: z.string().regex(/^[0-9]+(\.[0-9]{1,4})?$/),
  currency: z.enum(['INR', 'USD']).default('INR'),
  source: z.enum(['CAS', 'CSV', 'MANUAL']).default('MANUAL'),
  idempotencyKey: z.string().min(4).max(64),
});

export type LedgerTransaction = z.infer<typeof LedgerTransactionSchema>;

export interface TaxLot {
  symbol: string;
  acquiredDate: string;
  remainingUnits: string;
  costPerUnit: string;
  holdingDays: number;
  taxBucket: 'LTCG' | 'STCG' | 'SLAB';
  unrealizedGain: string;
}

export interface HoldingValuation {
  symbol: string;
  schemeName: string;
  assetClass: AssetClassBucket;
  currency: 'INR' | 'USD';
  units: string;
  avgCost: string;
  currentPrice: string;
  investedAmount: string;
  currentValue: string;
  unrealizedPnl: string;
  unrealizedPnlPct: string;
  realizedPnl: string;
  xirrPct: number | null;
  weightPct: string;
  expenseRatioPct: number;
  annualFeeDrag: string;
  ltcgEligibleGain: string;
  stcgGain: string;
  lots: TaxLot[];
}

export interface DriftAction {
  assetClass: AssetClassBucket;
  actualPct: number;
  targetPct: number;
  driftPct: number;
  action: 'OVERWEIGHT_TRIM' | 'UNDERWEIGHT_ADD' | 'ON_TARGET';
  rebalanceAmount: string;
}

export interface TaxHarvestSuggestion {
  symbol: string;
  schemeName: string;
  actionType: 'HARVEST_TAX_FREE_LTCG' | 'HARVEST_TAX_LOSS';
  unitsToSell: string;
  estimatedGainOrLoss: string;
  estimatedTaxSaved: string;
  rationale: string;
}

export interface PortfolioValuationReport {
  asOfDate: string;
  totalInvested: string;
  totalCurrentValue: string;
  totalUnrealizedPnl: string;
  totalUnrealizedPnlPct: string;
  totalRealizedPnl: string;
  portfolioXirrPct: number | null;
  weightedExpenseRatioPct: number;
  totalAnnualFeeDrag: string;
  totalLtcgEligible: string;
  totalStcgExposure: string;
  ltcgExemptionRemaining: string;
  holdings: HoldingValuation[];
  driftPlan: DriftAction[];
  taxHarvestPlan: TaxHarvestSuggestion[];
}

export interface CashflowEntry {
  date: string;
  amount: Decimal; // Negative for investment outflow, positive for redemption/current value
}

function daysBetweenIso(earlierIso: string, laterIso: string): number {
  const a = Date.parse(`${earlierIso}T00:00:00Z`);
  const b = Date.parse(`${laterIso}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Exact Decimal-backed XIRR solver (Newton-Raphson with bounded bisection fallback).
 * Returns annualized percentage (e.g., 16.42 for 16.42%), or null if cashflows do not change sign.
 */
export function computeDecimalXirr(cashflows: CashflowEntry[]): number | null {
  if (cashflows.length < 2) return null;

  const sorted = [...cashflows]
    .filter((c) => !c.amount.isZero())
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 2) return null;

  const hasNeg = sorted.some((c) => c.amount.isNegative());
  const hasPos = sorted.some((c) => c.amount.isPositive());
  if (!hasNeg || !hasPos) return null;

  const t0 = sorted[0].date;
  const totalSpanDays = daysBetweenIso(t0, sorted[sorted.length - 1].date);
  if (totalSpanDays <= 0) return null;

  const terms = sorted.map((c) => ({
    cf: c.amount,
    years: new Decimal(daysBetweenIso(t0, c.date)).div(365),
  }));

  const npv = (rate: number): number => {
    if (rate <= -0.9999) return Number.POSITIVE_INFINITY;
    let sum = new Decimal(0);
    const base = new Decimal(1 + rate);
    for (const term of terms) {
      const denom = base.pow(term.years);
      sum = sum.plus(term.cf.div(denom));
    }
    return sum.toNumber();
  };

  const dNpv = (rate: number): number => {
    let sum = new Decimal(0);
    const base = new Decimal(1 + rate);
    for (const term of terms) {
      if (term.years.isZero()) continue;
      const factor = term.years.neg().times(term.cf);
      const denom = base.pow(term.years.plus(1));
      sum = sum.plus(factor.div(denom));
    }
    return sum.toNumber();
  };

  // Newton-Raphson attempt
  let guess = 0.12;
  for (let iter = 0; iter < 60; iter++) {
    const f = npv(guess);
    if (!Number.isFinite(f)) break;
    if (Math.abs(f) < 1e-6) {
      return Number(new Decimal(guess * 100).toDecimalPlaces(2).toString());
    }
    const df = dNpv(guess);
    if (!Number.isFinite(df) || Math.abs(df) < 1e-12) break;
    const next = guess - f / df;
    if (next <= -0.99 || next > 20) break;
    if (Math.abs(next - guess) < 1e-8) {
      return Number(new Decimal(next * 100).toDecimalPlaces(2).toString());
    }
    guess = next;
  }

  // Guaranteed Bisection fallback on [-0.95, 10.0]
  let low = -0.95;
  let high = 10.0;
  let fLow = npv(low);
  const fHigh = npv(high);
  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow * fHigh > 0) {
    return null;
  }

  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-5 || Math.abs(high - low) < 1e-7) {
      return Number(new Decimal(mid * 100).toDecimalPlaces(2).toString());
    }
    if (fLow * fMid <= 0) {
      high = mid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return Number(new Decimal(((low + high) / 2) * 100).toDecimalPlaces(2).toString());
}

export interface TargetAllocationPolicy {
  targetEquityPct: number;
  targetDebtPct: number;
  targetGoldPct: number;
  driftThresholdPct: number;
}

/**
 * Replays append-only transactions strictly in FIFO order using Decimal.js,
 * producing exact holdings, STCG/LTCG tax lots, XIRR, drift actions, and tax-harvest suggestions.
 */
export function computeFifoPortfolioValuation(params: {
  transactions: LedgerTransaction[];
  livePricesBySymbol: Record<string, number>;
  expenseRatioBySymbol?: Record<string, number>;
  asOfDate?: string;
  policy?: TargetAllocationPolicy;
}): PortfolioValuationReport {
  const asOfDate = params.asOfDate ?? new Date().toISOString().slice(0, 10);
  const policy: TargetAllocationPolicy = params.policy ?? {
    targetEquityPct: 65,
    targetDebtPct: 20,
    targetGoldPct: 15,
    driftThresholdPct: 5,
  };

  const sorted = [...params.transactions].sort((a, b) =>
    a.tradeDate.localeCompare(b.tradeDate)
  );

  interface InternalLot {
    acquiredDate: string;
    remainingUnits: Decimal;
    costPerUnit: Decimal;
  }

  interface SymbolLedgerState {
    symbol: string;
    schemeName: string;
    assetClass: AssetClassBucket;
    currency: 'INR' | 'USD';
    lots: InternalLot[];
    realizedPnl: Decimal;
    cashflows: CashflowEntry[];
  }

  const bySymbol = new Map<string, SymbolLedgerState>();
  const portfolioCashflows: CashflowEntry[] = [];

  for (const tx of sorted) {
    const sym = tx.symbol.toUpperCase();
    let state = bySymbol.get(sym);
    if (!state) {
      state = {
        symbol: sym,
        schemeName: tx.schemeName,
        assetClass: tx.assetClass,
        currency: tx.currency,
        lots: [],
        realizedPnl: new Decimal(0),
        cashflows: [],
      };
      bySymbol.set(sym, state);
    }

    const units = new Decimal(tx.units);
    const price = new Decimal(tx.price);
    const amount = new Decimal(tx.amount);

    if (tx.txType === 'BUY' || tx.txType === 'SIP' || tx.txType === 'SWITCH_IN') {
      if (units.gt(0) && price.gte(0)) {
        state.lots.push({
          acquiredDate: tx.tradeDate,
          remainingUnits: units,
          costPerUnit: price,
        });
        const cf = amount.gt(0) ? amount.neg() : units.times(price).neg();
        state.cashflows.push({ date: tx.tradeDate, amount: cf });
        portfolioCashflows.push({ date: tx.tradeDate, amount: cf });
      }
    } else if (tx.txType === 'SELL' || tx.txType === 'SWITCH_OUT') {
      let unitsToConsume = units;
      let costBasisConsumed = new Decimal(0);

      for (const lot of state.lots) {
        if (unitsToConsume.lte(0)) break;
        if (lot.remainingUnits.lte(0)) continue;
        const consumed = Decimal.min(lot.remainingUnits, unitsToConsume);
        lot.remainingUnits = lot.remainingUnits.minus(consumed);
        costBasisConsumed = costBasisConsumed.plus(consumed.times(lot.costPerUnit));
        unitsToConsume = unitsToConsume.minus(consumed);
      }
      state.lots = state.lots.filter((l) => l.remainingUnits.gt(new Decimal('0.000001')));

      const proceeds = amount.gt(0) ? amount : units.times(price);
      state.realizedPnl = state.realizedPnl.plus(proceeds.minus(costBasisConsumed));
      state.cashflows.push({ date: tx.tradeDate, amount: proceeds });
      portfolioCashflows.push({ date: tx.tradeDate, amount: proceeds });
    } else if (tx.txType === 'DIVIDEND') {
      state.realizedPnl = state.realizedPnl.plus(amount);
      state.cashflows.push({ date: tx.tradeDate, amount });
      portfolioCashflows.push({ date: tx.tradeDate, amount });
    }
  }

  let totalInvested = new Decimal(0);
  let totalCurrentValue = new Decimal(0);
  let totalRealizedPnl = new Decimal(0);
  let totalLtcgEligible = new Decimal(0);
  let totalStcgExposure = new Decimal(0);
  let totalAnnualFeeDrag = new Decimal(0);
  let weightedTerNumerator = new Decimal(0);

  const rawHoldings: Array<{
    holding: Omit<HoldingValuation, 'weightPct'>;
    currentValueDec: Decimal;
  }> = [];

  for (const state of bySymbol.values()) {
    const activeLots = state.lots.filter((l) => l.remainingUnits.gt(new Decimal('0.000001')));
    const totalUnits = activeLots.reduce((acc, l) => acc.plus(l.remainingUnits), new Decimal(0));
    const investedCost = activeLots.reduce(
      (acc, l) => acc.plus(l.remainingUnits.times(l.costPerUnit)),
      new Decimal(0)
    );
    const fallbackPrice = activeLots.length > 0 ? activeLots[activeLots.length - 1].costPerUnit : new Decimal(0);
    const livePriceRaw = params.livePricesBySymbol[state.symbol];
    const currentPrice =
      typeof livePriceRaw === 'number' && Number.isFinite(livePriceRaw) && livePriceRaw > 0
        ? new Decimal(livePriceRaw)
        : fallbackPrice;

    const currentValue = totalUnits.times(currentPrice);
    const unrealizedPnl = currentValue.minus(investedCost);
    const unrealizedPnlPct = investedCost.gt(0)
      ? unrealizedPnl.div(investedCost).times(100)
      : new Decimal(0);

    const avgCost = totalUnits.gt(0) ? investedCost.div(totalUnits) : new Decimal(0);
    const terPct = params.expenseRatioBySymbol?.[state.symbol] ?? 0.55;
    const annualFeeDrag = currentValue.times(new Decimal(terPct).div(100));

    let holdingLtcg = new Decimal(0);
    let holdingStcg = new Decimal(0);

    const taxLots: TaxLot[] = activeLots.map((lot) => {
      const days = Math.max(0, daysBetweenIso(lot.acquiredDate, asOfDate));
      const lotGain = lot.remainingUnits.times(currentPrice.minus(lot.costPerUnit));
      let taxBucket: 'LTCG' | 'STCG' | 'SLAB';

      if (state.assetClass === 'Debt') {
        taxBucket = 'SLAB';
      } else if (state.assetClass === 'Gold' || state.assetClass === 'Global ETF') {
        taxBucket = days >= 730 ? 'LTCG' : 'STCG';
      } else {
        taxBucket = days >= 365 ? 'LTCG' : 'STCG';
      }

      if (taxBucket === 'LTCG') {
        holdingLtcg = holdingLtcg.plus(lotGain);
      } else {
        holdingStcg = holdingStcg.plus(lotGain);
      }

      return {
        symbol: state.symbol,
        acquiredDate: lot.acquiredDate,
        remainingUnits: lot.remainingUnits.toFixed(4),
        costPerUnit: lot.costPerUnit.toFixed(2),
        holdingDays: days,
        taxBucket,
        unrealizedGain: lotGain.toFixed(2),
      };
    });

    const holdingFlows: CashflowEntry[] = [
      ...state.cashflows,
      ...(currentValue.gt(0) ? [{ date: asOfDate, amount: currentValue }] : []),
    ];
    const holdingXirr = computeDecimalXirr(holdingFlows);

    totalInvested = totalInvested.plus(investedCost);
    totalCurrentValue = totalCurrentValue.plus(currentValue);
    totalRealizedPnl = totalRealizedPnl.plus(state.realizedPnl);
    totalLtcgEligible = totalLtcgEligible.plus(holdingLtcg);
    totalStcgExposure = totalStcgExposure.plus(holdingStcg);
    totalAnnualFeeDrag = totalAnnualFeeDrag.plus(annualFeeDrag);
    weightedTerNumerator = weightedTerNumerator.plus(currentValue.times(terPct));

    if (totalUnits.gt(0) || !state.realizedPnl.isZero()) {
      rawHoldings.push({
        currentValueDec: currentValue,
        holding: {
          symbol: state.symbol,
          schemeName: state.schemeName,
          assetClass: state.assetClass,
          currency: state.currency,
          units: totalUnits.toFixed(4),
          avgCost: avgCost.toFixed(2),
          currentPrice: currentPrice.toFixed(2),
          investedAmount: investedCost.toFixed(2),
          currentValue: currentValue.toFixed(2),
          unrealizedPnl: unrealizedPnl.toFixed(2),
          unrealizedPnlPct: unrealizedPnlPct.toFixed(2),
          realizedPnl: state.realizedPnl.toFixed(2),
          xirrPct: holdingXirr,
          expenseRatioPct: terPct,
          annualFeeDrag: annualFeeDrag.toFixed(2),
          ltcgEligibleGain: holdingLtcg.toFixed(2),
          stcgGain: holdingStcg.toFixed(2),
          lots: taxLots,
        },
      });
    }
  }

  const holdings: HoldingValuation[] = rawHoldings
    .sort((a, b) => b.currentValueDec.comparedTo(a.currentValueDec))
    .map(({ holding, currentValueDec }) => ({
      ...holding,
      weightPct: totalCurrentValue.gt(0)
        ? currentValueDec.div(totalCurrentValue).times(100).toFixed(2)
        : '0.00',
    }));

  const fullPortfolioFlows: CashflowEntry[] = [
    ...portfolioCashflows,
    ...(totalCurrentValue.gt(0) ? [{ date: asOfDate, amount: totalCurrentValue }] : []),
  ];

  const portfolioXirrPct = computeDecimalXirr(fullPortfolioFlows);
  const totalUnrealizedPnl = totalCurrentValue.minus(totalInvested);
  const totalUnrealizedPnlPct = totalInvested.gt(0)
    ? totalUnrealizedPnl.div(totalInvested).times(100)
    : new Decimal(0);

  const weightedExpenseRatioPct = totalCurrentValue.gt(0)
    ? Number(weightedTerNumerator.div(totalCurrentValue).toDecimalPlaces(2).toString())
    : 0;

  // Compute Asset-Class Drift Plan
  const bucketTotals: Record<'Equity' | 'Debt' | 'Gold', Decimal> = {
    Equity: new Decimal(0),
    Debt: new Decimal(0),
    Gold: new Decimal(0),
  };

  for (const h of holdings) {
    const val = new Decimal(h.currentValue);
    if (h.assetClass === 'Debt') {
      bucketTotals.Debt = bucketTotals.Debt.plus(val);
    } else if (h.assetClass === 'Gold') {
      bucketTotals.Gold = bucketTotals.Gold.plus(val);
    } else if (h.assetClass === 'Hybrid') {
      bucketTotals.Equity = bucketTotals.Equity.plus(val.times('0.65'));
      bucketTotals.Debt = bucketTotals.Debt.plus(val.times('0.35'));
    } else {
      bucketTotals.Equity = bucketTotals.Equity.plus(val);
    }
  }

  const targets: Array<{ bucket: 'Equity' | 'Debt' | 'Gold'; targetPct: number }> = [
    { bucket: 'Equity', targetPct: policy.targetEquityPct },
    { bucket: 'Debt', targetPct: policy.targetDebtPct },
    { bucket: 'Gold', targetPct: policy.targetGoldPct },
  ];

  const driftPlan: DriftAction[] = targets.map(({ bucket, targetPct }) => {
    const actualPct = totalCurrentValue.gt(0)
      ? Number(bucketTotals[bucket].div(totalCurrentValue).times(100).toDecimalPlaces(2).toString())
      : 0;
    const driftPct = Number((actualPct - targetPct).toFixed(2));
    const diffRupees = totalCurrentValue.times(new Decimal(targetPct - actualPct).div(100));
    const action: DriftAction['action'] =
      Math.abs(driftPct) < policy.driftThresholdPct
        ? 'ON_TARGET'
        : driftPct > 0
          ? 'OVERWEIGHT_TRIM'
          : 'UNDERWEIGHT_ADD';

    return {
      assetClass: bucket,
      actualPct,
      targetPct,
      driftPct,
      action,
      rebalanceAmount: diffRupees.abs().toFixed(2),
    };
  });

  // Compute Smart Tax-Harvesting Suggestions (India ₹1,25,000 annual LTCG exemption)
  const ANNUAL_LTCG_EXEMPTION = new Decimal(125000);
  let remainingExemption = ANNUAL_LTCG_EXEMPTION;
  const taxHarvestPlan: TaxHarvestSuggestion[] = [];

  for (const h of holdings) {
    const ltcgDec = new Decimal(h.ltcgEligibleGain);
    const stcgDec = new Decimal(h.stcgGain);
    const livePx = new Decimal(h.currentPrice);

    if (ltcgDec.gt(2000) && remainingExemption.gt(1000) && livePx.gt(0)) {
      const ltcgLots = h.lots.filter((l) => l.taxBucket === 'LTCG' && new Decimal(l.unrealizedGain).gt(0));
      let harvestableGain = new Decimal(0);
      let unitsToHarvest = new Decimal(0);

      for (const lot of ltcgLots) {
        if (remainingExemption.lte(0)) break;
        const lotGain = new Decimal(lot.unrealizedGain);
        const lotUnits = new Decimal(lot.remainingUnits);
        if (lotGain.lte(remainingExemption)) {
          harvestableGain = harvestableGain.plus(lotGain);
          unitsToHarvest = unitsToHarvest.plus(lotUnits);
          remainingExemption = remainingExemption.minus(lotGain);
        } else {
          const fraction = remainingExemption.div(lotGain);
          harvestableGain = harvestableGain.plus(remainingExemption);
          unitsToHarvest = unitsToHarvest.plus(lotUnits.times(fraction));
          remainingExemption = new Decimal(0);
        }
      }

      if (harvestableGain.gt(1000)) {
        taxHarvestPlan.push({
          symbol: h.symbol,
          schemeName: h.schemeName,
          actionType: 'HARVEST_TAX_FREE_LTCG',
          unitsToSell: unitsToHarvest.toFixed(4),
          estimatedGainOrLoss: harvestableGain.toFixed(2),
          estimatedTaxSaved: harvestableGain.times('0.125').toFixed(2),
          rationale: `Sell & re-buy ${unitsToHarvest.toFixed(2)} units held >365d to step up cost basis inside ₹1.25L tax-free LTCG band.`,
        });
      }
    }

    if (stcgDec.lt(-1500)) {
      const lossUnits = h.lots
        .filter((l) => new Decimal(l.unrealizedGain).lt(0))
        .reduce((acc, l) => acc.plus(new Decimal(l.remainingUnits)), new Decimal(0));

      if (lossUnits.gt(0)) {
        taxHarvestPlan.push({
          symbol: h.symbol,
          schemeName: h.schemeName,
          actionType: 'HARVEST_TAX_LOSS',
          unitsToSell: lossUnits.toFixed(4),
          estimatedGainOrLoss: stcgDec.toFixed(2),
          estimatedTaxSaved: stcgDec.abs().times('0.20').toFixed(2),
          rationale: `Unrealized short-term loss of ${stcgDec.abs().toFixed(0)} can offset realized STCG/LTCG liability.`,
        });
      }
    }
  }

  return {
    asOfDate,
    totalInvested: totalInvested.toFixed(2),
    totalCurrentValue: totalCurrentValue.toFixed(2),
    totalUnrealizedPnl: totalUnrealizedPnl.toFixed(2),
    totalUnrealizedPnlPct: totalUnrealizedPnlPct.toFixed(2),
    totalRealizedPnl: totalRealizedPnl.toFixed(2),
    portfolioXirrPct,
    weightedExpenseRatioPct,
    totalAnnualFeeDrag: totalAnnualFeeDrag.toFixed(2),
    totalLtcgEligible: totalLtcgEligible.toFixed(2),
    totalStcgExposure: totalStcgExposure.toFixed(2),
    ltcgExemptionRemaining: remainingExemption.toFixed(2),
    holdings,
    driftPlan,
    taxHarvestPlan,
  };
}

export interface CsvImportResult {
  validTransactions: LedgerTransaction[];
  duplicateCount: number;
  errors: Array<{ line: number; reason: string }>;
}

function deterministicKey(parts: string[]): string {
  const raw = parts.join('|').toUpperCase();
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `tx_${(hash >>> 0).toString(36)}_${parts[0].replace(/[^0-9]/g, '').slice(0, 8)}`;
}

function normalizeDateString(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // DD-MM-YYYY or DD/MM/YYYY (common in CAMS/KFintech/NSDL CAS CSV)
  const dmy = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  }
  return null;
}

function inferAssetClass(rawClass: string, nameOrSymbol: string): AssetClassBucket {
  const hay = `${rawClass} ${nameOrSymbol}`.toLowerCase();
  if (hay.includes('gold') || hay.includes('silver') || hay.includes('bullion') || hay.includes('gld')) {
    return 'Gold';
  }
  if (hay.includes('debt') || hay.includes('gilt') || hay.includes('bond') || hay.includes('liquid') || hay.includes('agg') || hay.includes('tlt')) {
    return 'Debt';
  }
  if (hay.includes('hybrid') || hay.includes('balanced')) {
    return 'Hybrid';
  }
  if (hay.includes('spy') || hay.includes('qqq') || hay.includes('voo') || hay.includes('global')) {
    return 'Global ETF';
  }
  return 'Equity';
}

/**
 * Parses CAMS/KFintech/NSDL CAS or Broker CSV (Zerodha Coin, Groww, Kuvera, generic)
 * with strict Zod validation and idempotent deduplication.
 */
export function parsePortfolioCsvOrCas(
  csvText: string,
  existingKeys: Set<string> = new Set(),
  source: LedgerSource = 'CSV'
): CsvImportResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      validTransactions: [],
      duplicateCount: 0,
      errors: [{ line: 1, reason: 'CSV must contain a header row and at least one transaction row.' }],
    };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
  const colIdx = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));

  const dateCol = colIdx(['date', 'trade_date', 'txn_date']);
  const symbolCol = colIdx(['symbol', 'ticker', 'code', 'folio_symbol']);
  const nameCol = colIdx(['scheme', 'name', 'fund', 'instrument']);
  const typeCol = colIdx(['type', 'action', 'side', 'tx_type']);
  const unitsCol = colIdx(['unit', 'qty', 'quantity', 'shares']);
  const priceCol = colIdx(['price', 'nav', 'rate']);
  const amountCol = colIdx(['amount', 'value', 'total']);
  const classCol = colIdx(['asset', 'class', 'category']);
  const currencyCol = colIdx(['currency', 'ccy']);

  if (dateCol === -1 || (symbolCol === -1 && nameCol === -1) || unitsCol === -1 || priceCol === -1) {
    return {
      validTransactions: [],
      duplicateCount: 0,
      errors: [
        {
          line: 1,
          reason:
            'Missing required columns. Expected headers including Date, Symbol/Scheme, Units, and Price/NAV.',
        },
      ],
    };
  }

  const validTransactions: LedgerTransaction[] = [];
  const errors: Array<{ line: number; reason: string }> = [];
  const seenKeys = new Set<string>(existingKeys);
  let duplicateCount = 0;

  for (let i = 1; i < Math.min(lines.length, 501); i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const tradeDate = normalizeDateString(cols[dateCol] ?? '');
    if (!tradeDate) {
      errors.push({ line: i + 1, reason: `Invalid trade date "${cols[dateCol] ?? ''}".` });
      continue;
    }

    const rawSymbol = (symbolCol !== -1 ? cols[symbolCol] : cols[nameCol] ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9._\-^]/g, '')
      .slice(0, 32);
    const schemeName = (nameCol !== -1 && cols[nameCol] ? cols[nameCol] : rawSymbol).slice(0, 160);

    const rawType = (typeCol !== -1 ? cols[typeCol] : 'BUY').toUpperCase();
    const txType: LedgerTxType =
      rawType.includes('SELL') || rawType.includes('REDEEM')
        ? 'SELL'
        : rawType.includes('SIP')
          ? 'SIP'
          : rawType.includes('SWITCH_OUT')
            ? 'SWITCH_OUT'
            : rawType.includes('SWITCH')
              ? 'SWITCH_IN'
              : rawType.includes('DIV')
                ? 'DIVIDEND'
                : 'BUY';

    let unitsDec: Decimal;
    let priceDec: Decimal;
    let amountDec: Decimal;
    try {
      unitsDec = new Decimal((cols[unitsCol] ?? '').replace(/,/g, ''));
      priceDec = new Decimal((cols[priceCol] ?? '').replace(/,/g, ''));
      const rawAmt = amountCol !== -1 && cols[amountCol] ? cols[amountCol].replace(/,/g, '') : '';
      amountDec = rawAmt ? new Decimal(rawAmt) : unitsDec.times(priceDec);
      if (unitsDec.lte(0) || priceDec.lte(0) || amountDec.lte(0)) {
        throw new Error('Must be positive');
      }
    } catch {
      errors.push({ line: i + 1, reason: 'Units, Price/NAV, and Amount must be positive decimals.' });
      continue;
    }

    const currency: 'INR' | 'USD' =
      currencyCol !== -1 && (cols[currencyCol] ?? '').toUpperCase() === 'USD' ? 'USD' : 'INR';
    const assetClass = inferAssetClass(classCol !== -1 ? cols[classCol] ?? '' : '', `${rawSymbol} ${schemeName}`);
    const idempotencyKey = deterministicKey([
      tradeDate,
      rawSymbol,
      txType,
      unitsDec.toFixed(4),
      priceDec.toFixed(4),
    ]);

    if (seenKeys.has(idempotencyKey)) {
      duplicateCount += 1;
      continue;
    }
    seenKeys.add(idempotencyKey);

    const candidate = {
      id: idempotencyKey,
      symbol: rawSymbol,
      schemeName,
      isin: '',
      assetClass,
      txType,
      tradeDate,
      units: unitsDec.toFixed(4),
      price: priceDec.toFixed(4),
      amount: amountDec.toFixed(2),
      currency,
      source,
      idempotencyKey,
    };

    const parsed = LedgerTransactionSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push({ line: i + 1, reason: parsed.error.issues[0]?.message ?? 'Schema validation failed.' });
      continue;
    }
    validTransactions.push(parsed.data);
  }

  return { validTransactions, duplicateCount, errors };
}

export interface SampleOverlapPair {
  fundA: string;
  fundB: string;
  overlapPct: number;
  sharedTopNames: string[];
}

const FUND_CORE_BASKETS: Record<string, Array<{ name: string; weight: number }>> = {
  PPFAS: [
    { name: 'HDFC Bank', weight: 8.1 },
    { name: 'Bajaj Holdings', weight: 6.8 },
    { name: 'Coal India', weight: 5.9 },
    { name: 'ITC', weight: 5.5 },
    { name: 'Alphabet Inc', weight: 5.2 },
    { name: 'Microsoft Corp', weight: 4.8 },
  ],
  UTI50: [
    { name: 'HDFC Bank', weight: 11.4 },
    { name: 'Reliance Industries', weight: 9.2 },
    { name: 'ICICI Bank', weight: 8.1 },
    { name: 'Infosys', weight: 6.0 },
    { name: 'ITC', weight: 4.3 },
    { name: 'TCS', weight: 4.1 },
  ],
  NIFTYBEES: [
    { name: 'HDFC Bank', weight: 11.4 },
    { name: 'Reliance Industries', weight: 9.2 },
    { name: 'ICICI Bank', weight: 8.1 },
    { name: 'Infosys', weight: 6.0 },
    { name: 'ITC', weight: 4.3 },
    { name: 'TCS', weight: 4.1 },
  ],
  HDFCMID: [
    { name: 'Indian Hotels', weight: 4.6 },
    { name: 'Max Healthcare', weight: 4.4 },
    { name: 'Federal Bank', weight: 3.9 },
    { name: 'Coforge', weight: 3.7 },
    { name: 'HDFC Bank', weight: 2.1 },
  ],
  QQQ: [
    { name: 'Apple Inc', weight: 8.9 },
    { name: 'Microsoft Corp', weight: 8.4 },
    { name: 'NVIDIA Corp', weight: 8.1 },
    { name: 'Amazon.com', weight: 5.6 },
    { name: 'Alphabet Inc', weight: 5.1 },
  ],
  SPY: [
    { name: 'Apple Inc', weight: 7.1 },
    { name: 'Microsoft Corp', weight: 6.7 },
    { name: 'NVIDIA Corp', weight: 6.4 },
    { name: 'Amazon.com', weight: 3.9 },
    { name: 'Alphabet Inc', weight: 3.6 },
  ],
  GOLDBEES: [{ name: 'Physical Gold Bullion 99.5%', weight: 97.6 }],
  GLD: [{ name: 'Physical Gold Bullion 99.5%', weight: 99.2 }],
  SBIGILT: [{ name: 'India Sovereign G-Sec 2033-2035', weight: 92.4 }],
};

export function computePortfolioOverlapMatrix(symbols: string[]): SampleOverlapPair[] {
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).filter(
    (s) => Boolean(FUND_CORE_BASKETS[s])
  );
  const pairs: SampleOverlapPair[] = [];

  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const a = unique[i];
      const b = unique[j];
      const mapA = new Map(FUND_CORE_BASKETS[a].map((x) => [x.name, x.weight]));
      let overlap = 0;
      const shared: string[] = [];

      for (const item of FUND_CORE_BASKETS[b]) {
        const wA = mapA.get(item.name);
        if (wA !== undefined) {
          overlap += Math.min(wA, item.weight);
          shared.push(item.name);
        }
      }

      if (overlap > 0) {
        pairs.push({
          fundA: a,
          fundB: b,
          overlapPct: Number(overlap.toFixed(1)),
          sharedTopNames: shared,
        });
      }
    }
  }

  return pairs.sort((a, b) => b.overlapPct - a.overlapPct);
}

export const SAMPLE_CAS_CSV_TEMPLATE = `Date,Symbol,Scheme Name,Type,Units,Price,Amount,Asset Class,Currency
2022-04-12,PPFAS,Parag Parikh Flexi Cap Direct Growth,BUY,2450.5000,51.2000,125465.60,Equity,INR
2023-01-15,PPFAS,Parag Parikh Flexi Cap Direct Growth,SIP,1200.0000,56.8000,68160.00,Equity,INR
2023-06-10,HDFCMID,HDFC Mid-Cap Opportunities Direct Growth,BUY,950.0000,124.5000,118275.00,Equity,INR
2023-09-18,UTI50,UTI Nifty 50 Index Direct Growth,BUY,820.0000,138.2000,113324.00,Equity,INR
2024-02-05,GOLDBEES,Gold Bullion Index ETF (India),BUY,1400.0000,54.8000,76720.00,Gold,INR
2024-04-20,SBIGILT,SBI Magnum Gilt Direct Growth,BUY,1550.0000,62.4000,96720.00,Debt,INR
2025-07-14,QUANTSC,Quant Small Cap Direct Growth,BUY,280.0000,278.5000,77980.00,Equity,INR`;
