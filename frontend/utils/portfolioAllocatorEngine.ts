import { ScreenerFundRecord } from './screenerEngine';
import {
  computeFundValidationScore,
  getFundIntelligence,
} from './fundIntelligenceEngine';
import {
  computeBlendedPortfolioMetrics,
  computeCorrelationMatrix,
  computeInstrumentRiskProfile,
  InstrumentRiskProfile,
} from './riskAnalyticsEngine';

export interface AllocationSelection {
  symbol: string;
  weightPct: number;
}

export interface HistoricalReplayPoint {
  periodKey: string;
  label: string;
  portfolioValue: number;
  portfolioIndex: number;
  equalWeightIndex: number;
  portfolioMonthlyRetPct: number;
  [symbolKey: string]: number | string;
}

export interface HistoricalReplayResult {
  points: HistoricalReplayPoint[];
  monthsCount: number;
  realizedTotalReturnPct: number;
  realizedCagrPct: number;
  realizedMaxDrawdownPct: number;
  endingValue: number;
}

export interface ProjectedPerformancePoint {
  year: number;
  yearLabel: string;
  totalInvested: number;
  baseValue: number;
  realBaseValue: number;
  bullValue: number;
  bearValue: number;
  [symbolKey: string]: number | string;
}

export interface ProjectedPortfolioSummary {
  startingCapital: number;
  monthlySip: number;
  annualSipStepUpPct: number;
  inflationRatePct: number;
  horizonYears: number;
  totalInvestedEnd: number;
  weightedHistoricalCagrPct: number;
  weightedNetCagrPct: number;
  weightedExpenseRatioPct: number;
  estimatedFeeDragAmount: number;
  covarianceVolatilityPct: number;
  portfolioVar95MonthlyPct: number;
  portfolioMaxDrawdownEstPct: number;
  portfolioSharpe3Y: number;
  baseEndingValue: number;
  realBaseEndingValue: number;
  bullEndingValue: number;
  bearEndingValue: number;
  baseGainPct: number;
  points: ProjectedPerformancePoint[];
}

export interface AggregatedBasketSummary {
  count: number;
  etfCount: number;
  mfCount: number;
  combinedAumUsdB: number;
  avgReturn1YPct: number;
  avgReturn3YPct: number;
  avgAnnualReturn3YPct: number;
  avgExpenseRatioPct: number;
  avgSharpe3Y: number;
  avgSortino3Y: number;
  avgTreynor3Y: number;
  avgVar95MonthlyPct: number;
  avgMaxDrawdown3YPct: number;
  avgCalmarRatio: number;
  avgValidationScore: number;
  categoryCounts: Array<{ category: string; count: number }>;
}

export interface BulkInstrumentRow {
  symbol: string;
  name: string;
  instrumentType: ScreenerFundRecord['instrumentType'];
  category: string;
  exchange: string;
  currency: 'INR' | 'USD';
  price: number;
  changePct: number;
  aumLabel: string;
  aumSortUsdB: number;
  expenseRatioPct: number;
  return1YPct: number;
  return3YPct: number;
  avgAnnualReturn3YPct: number;
  sharpe3Y: number;
  sortino3Y: number;
  treynor3Y: number;
  var95MonthlyPct: number;
  cvar95MonthlyPct: number;
  maxDrawdown3YPct: number;
  calmarRatio: number;
  validationScore: number;
  validationGrade: string;
  leadManager: string;
  riskTier: InstrumentRiskProfile['riskTier'];
  totalHoldings: number;
}

export type BulkSortField =
  | 'symbol'
  | 'price'
  | 'aumSortUsdB'
  | 'expenseRatioPct'
  | 'return1YPct'
  | 'return3YPct'
  | 'avgAnnualReturn3YPct'
  | 'sharpe3Y'
  | 'sortino3Y'
  | 'treynor3Y'
  | 'var95MonthlyPct'
  | 'maxDrawdown3YPct'
  | 'calmarRatio'
  | 'validationScore';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function extractMonthlyMap(fund: ScreenerFundRecord): Map<string, number> {
  const intel = getFundIntelligence(fund);
  const map = new Map<string, number>();
  for (const row of intel.monthlyHeatmap) {
    for (let m = 0; m < row.months.length; m++) {
      const val = row.months[m];
      if (typeof val === 'number' && Number.isFinite(val)) {
        const key = `${row.year}-${String(m + 1).padStart(2, '0')}`;
        map.set(key, val);
      }
    }
  }
  return map;
}

/**
 * Normalizes any map of raw percentages so selected symbols sum strictly to 100.0%.
 */
export function normalizeAllocationWeights(
  symbols: string[],
  rawWeights: Record<string, number>
): Record<string, number> {
  if (symbols.length === 0) return {};
  const cleaned = symbols.map((sym) => Math.max(0, Number(rawWeights[sym]) || 0));
  const total = cleaned.reduce((s, v) => s + v, 0);

  const result: Record<string, number> = {};
  if (total <= 1e-6) {
    const base = Number((100 / symbols.length).toFixed(1));
    let acc = 0;
    symbols.forEach((sym, idx) => {
      if (idx === symbols.length - 1) {
        result[sym] = Number(Math.max(0, 100 - acc).toFixed(1));
      } else {
        result[sym] = base;
        acc += base;
      }
    });
    return result;
  }

  let running = 0;
  symbols.forEach((sym, idx) => {
    if (idx === symbols.length - 1) {
      result[sym] = Number(Math.max(0, 100 - running).toFixed(1));
    } else {
      const pct = Number(((cleaned[idx] / total) * 100).toFixed(1));
      result[sym] = pct;
      running += pct;
    }
  });
  return result;
}

/**
 * Respects locked symbols (keeping their exact weights) while distributing remaining %
 * proportionally across unlocked symbols so the full basket sums to 100.0%.
 */
export function redistributeWeightsWithLocks(
  symbols: string[],
  rawWeights: Record<string, number>,
  lockedSymbols: string[]
): Record<string, number> {
  if (symbols.length === 0) return {};
  const lockedSet = new Set(lockedSymbols.filter((s) => symbols.includes(s)));
  if (lockedSet.size === 0 || lockedSet.size >= symbols.length) {
    return normalizeAllocationWeights(symbols, rawWeights);
  }

  const out: Record<string, number> = {};
  let lockedTotal = 0;
  for (const s of symbols) {
    if (lockedSet.has(s)) {
      const clamped = Math.min(100, Math.max(0, Number(rawWeights[s]) || 0));
      out[s] = Number(clamped.toFixed(1));
      lockedTotal += out[s];
    }
  }

  if (lockedTotal >= 100) {
    // Scale locked weights down to 100 and zero out unlocked
    const scaledLocked = normalizeAllocationWeights(Array.from(lockedSet), out);
    for (const s of symbols) {
      out[s] = lockedSet.has(s) ? scaledLocked[s] : 0;
    }
    return out;
  }

  const remaining = Number(Math.max(0, 100 - lockedTotal).toFixed(1));
  const unlocked = symbols.filter((s) => !lockedSet.has(s));
  const unlockedNorm = normalizeAllocationWeights(unlocked, rawWeights);

  let acc = 0;
  unlocked.forEach((s, idx) => {
    if (idx === unlocked.length - 1) {
      out[s] = Number(Math.max(0, remaining - acc).toFixed(1));
    } else {
      const val = Number(((unlockedNorm[s] / 100) * remaining).toFixed(1));
      out[s] = val;
      acc += val;
    }
  });
  return out;
}

/**
 * Computes inverse-volatility Risk Parity weights summing to 100% (optionally preserving locked weights).
 */
export function computeRiskParityWeights(
  funds: ScreenerFundRecord[],
  lockedWeights: Record<string, number> = {},
  lockedSymbols: string[] = []
): Record<string, number> {
  if (funds.length === 0) return {};
  if (funds.length === 1) return { [funds[0].symbol]: 100 };

  const invVolMap: Record<string, number> = {};
  for (const f of funds) {
    const intel = getFundIntelligence(f);
    const vol = Math.max(1.2, intel.ratios.stdDev3Y);
    invVolMap[f.symbol] = 1 / vol;
  }

  const symbols = funds.map((f) => f.symbol);
  if (lockedSymbols.length > 0) {
    const merged: Record<string, number> = { ...invVolMap };
    for (const s of lockedSymbols) {
      if (typeof lockedWeights[s] === 'number') merged[s] = lockedWeights[s];
    }
    return redistributeWeightsWithLocks(symbols, merged, lockedSymbols);
  }

  return normalizeAllocationWeights(symbols, invVolMap);
}

/**
 * Computes Low-Cost & Yield-Tilted weights favoring lowest TER and positive dividend carry.
 */
export function computeLowCostIncomeWeights(
  funds: ScreenerFundRecord[],
  lockedWeights: Record<string, number> = {},
  lockedSymbols: string[] = []
): Record<string, number> {
  if (funds.length === 0) return {};
  if (funds.length === 1) return { [funds[0].symbol]: 100 };

  const scoreMap: Record<string, number> = {};
  for (const f of funds) {
    const costScore = 1 / Math.max(0.08, f.about.expenseRatioPct + 0.12);
    const yieldBoost = 1 + Math.max(0, f.keyStats.dividendYieldPct) * 0.25;
    scoreMap[f.symbol] = costScore * yieldBoost;
  }

  const symbols = funds.map((f) => f.symbol);
  if (lockedSymbols.length > 0) {
    const merged: Record<string, number> = { ...scoreMap };
    for (const s of lockedSymbols) {
      if (typeof lockedWeights[s] === 'number') merged[s] = lockedWeights[s];
    }
    return redistributeWeightsWithLocks(symbols, merged, lockedSymbols);
  }
  return normalizeAllocationWeights(symbols, scoreMap);
}

/**
 * Computes covariance-aware Max-Sharpe allocation weights summing to 100%.
 */
export function computeMaxSharpeWeights(funds: ScreenerFundRecord[]): Record<string, number> {
  if (funds.length === 0) return {};
  if (funds.length === 1) return { [funds[0].symbol]: 100 };

  const corr = computeCorrelationMatrix(funds);
  const profiles = funds.map((f) => {
    const intel = getFundIntelligence(f);
    return {
      symbol: f.symbol,
      ret: intel.returnOnAverage.avgAnnualReturn3Y - f.about.expenseRatioPct,
      vol: Math.max(0.4, intel.ratios.stdDev3Y),
    };
  });

  const n = profiles.length;
  const rf = funds.every((f) => f.currency === 'USD') ? 4.2 : 6.0;

  const evalSharpe = (w: number[]): number => {
    let portRet = 0;
    let portVar = 0;
    for (let i = 0; i < n; i++) {
      portRet += w[i] * profiles[i].ret;
      for (let j = 0; j < n; j++) {
        const r = corr.matrix[i]?.[j] ?? (i === j ? 1 : 0.35);
        portVar += w[i] * w[j] * profiles[i].vol * profiles[j].vol * r;
      }
    }
    const portVol = Math.sqrt(Math.max(0.04, portVar));
    return (portRet - rf) / portVol;
  };

  let bestW = Array(n).fill(1 / n);
  let bestScore = evalSharpe(bestW);

  const steps = [0.1, 0.05, 0.02, 0.01];
  for (const step of steps) {
    for (let pass = 0; pass < 12; pass++) {
      let improved = false;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j || bestW[j] < step + 0.05) continue;
          const cand = [...bestW];
          cand[i] += step;
          cand[j] -= step;
          const sc = evalSharpe(cand);
          if (sc > bestScore + 1e-6) {
            bestW = cand;
            bestScore = sc;
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
  }

  const ints = bestW.map((x) => Math.max(5, Math.round(x * 100)));
  let diff = 100 - ints.reduce((s, x) => s + x, 0);
  let guard = 0;
  while (diff !== 0 && guard < 100) {
    guard++;
    const idx = diff > 0
      ? ints.indexOf(Math.max(...ints))
      : ints.findIndex((v) => v > 5);
    if (idx < 0) break;
    ints[idx] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
  }

  const out: Record<string, number> = {};
  profiles.forEach((p, idx) => {
    out[p.symbol] = ints[idx];
  });
  return out;
}

/**
 * Replays historical monthly portfolio growth across all selected ETFs/MFs using each fund's
 * actual monthly return series (monthlyHeatmap). Produces both absolute wealth and 100-rebased indices.
 */
export function buildHistoricalPortfolioReplay(
  funds: ScreenerFundRecord[],
  rawWeights: Record<string, number>,
  startingCapital: number = 500_000
): HistoricalReplayResult {
  if (funds.length === 0) {
    return {
      points: [],
      monthsCount: 0,
      realizedTotalReturnPct: 0,
      realizedCagrPct: 0,
      realizedMaxDrawdownPct: 0,
      endingValue: startingCapital,
    };
  }

  const safeCapital = Math.max(1000, startingCapital);
  const symbols = funds.map((f) => f.symbol);
  const normWeights = normalizeAllocationWeights(symbols, rawWeights);
  const monthlyMaps = funds.map((f) => extractMonthlyMap(f));

  const keySets = monthlyMaps.map((m) => new Set(m.keys()));
  let sharedKeys = Array.from(keySets[0]).filter((k) => keySets.every((s) => s.has(k)));
  if (sharedKeys.length < 6) {
    const union = new Set<string>();
    keySets.forEach((s) => s.forEach((k) => union.add(k)));
    sharedKeys = Array.from(union);
  }
  sharedKeys.sort();

  const points: HistoricalReplayPoint[] = [];
  let portIdx = 100;
  let eqIdx = 100;
  let peakIdx = 100;
  let maxDd = 0;
  const fundIdx: Record<string, number> = {};
  symbols.forEach((s) => {
    fundIdx[s] = 100;
  });

  const startRow: HistoricalReplayPoint = {
    periodKey: 'START',
    label: 'Start',
    portfolioValue: Math.round(safeCapital),
    portfolioIndex: 100,
    equalWeightIndex: 100,
    portfolioMonthlyRetPct: 0,
  };
  symbols.forEach((s) => {
    startRow[`idx_${s}`] = 100;
    startRow[`val_${s}`] = Math.round(safeCapital);
  });
  points.push(startRow);

  const eqShare = 1 / funds.length;

  for (const key of sharedKeys) {
    const [yrStr, moStr] = key.split('-');
    const moIdx = Math.max(0, Math.min(11, Number(moStr) - 1));
    const label = `${MONTH_SHORT[moIdx]} '${yrStr.slice(2)}`;

    let weightedMonthlyRet = 0;
    let eqMonthlyRet = 0;

    funds.forEach((f, i) => {
      const rPct = monthlyMaps[i].get(key) ?? 0;
      const w = (normWeights[f.symbol] ?? 0) / 100;
      weightedMonthlyRet += w * rPct;
      eqMonthlyRet += eqShare * rPct;
      fundIdx[f.symbol] = fundIdx[f.symbol] * (1 + rPct / 100);
    });

    portIdx = portIdx * (1 + weightedMonthlyRet / 100);
    eqIdx = eqIdx * (1 + eqMonthlyRet / 100);
    if (portIdx > peakIdx) peakIdx = portIdx;
    const dd = ((portIdx - peakIdx) / peakIdx) * 100;
    if (dd < maxDd) maxDd = dd;

    const row: HistoricalReplayPoint = {
      periodKey: key,
      label,
      portfolioValue: Math.round((portIdx / 100) * safeCapital),
      portfolioIndex: Number(portIdx.toFixed(2)),
      equalWeightIndex: Number(eqIdx.toFixed(2)),
      portfolioMonthlyRetPct: Number(weightedMonthlyRet.toFixed(2)),
    };
    symbols.forEach((s) => {
      row[`idx_${s}`] = Number(fundIdx[s].toFixed(2));
      row[`val_${s}`] = Math.round((fundIdx[s] / 100) * safeCapital);
    });
    points.push(row);
  }

  const monthsCount = sharedKeys.length;
  const totalReturnPct = Number(((portIdx / 100 - 1) * 100).toFixed(2));
  const yearsSpan = Math.max(1 / 12, monthsCount / 12);
  const realizedCagrPct = Number(((Math.pow(Math.max(0.01, portIdx / 100), 1 / yearsSpan) - 1) * 100).toFixed(2));

  return {
    points,
    monthsCount,
    realizedTotalReturnPct: totalReturnPct,
    realizedCagrPct,
    realizedMaxDrawdownPct: Number(maxDd.toFixed(2)),
    endingValue: Math.round((portIdx / 100) * safeCapital),
  };
}

function compoundWithStepUpSip(
  principal: number,
  monthlySip: number,
  annualRateDecimal: number,
  years: number,
  annualSipStepUpPct: number = 0
): { endingValue: number; totalInvested: number } {
  if (years <= 0) return { endingValue: principal, totalInvested: principal };
  const months = Math.round(years * 12);
  const rMonth = Math.pow(1 + Math.max(-0.5, annualRateDecimal), 1 / 12) - 1;
  const stepFactor = 1 + Math.max(0, Math.min(50, annualSipStepUpPct)) / 100;
  let bal = principal;
  let invested = principal;
  let curSip = monthlySip;
  for (let m = 0; m < months; m++) {
    if (m > 0 && m % 12 === 0) {
      curSip = curSip * stepFactor;
    }
    bal = bal * (1 + rMonth) + curSip;
    invested += curSip;
  }
  return { endingValue: Math.max(0, bal), totalInvested: invested };
}

/**
 * Projects custom-allocated portfolio performance forward (Base / Bull / Bear cones + real inflation-adjusted curve)
 * based directly on historical 3Y annualized returns, Direct TER drag, annual SIP step-up, and covariance-adjusted volatility.
 */
export function buildProjectedPortfolioPerformance(
  funds: ScreenerFundRecord[],
  rawWeights: Record<string, number>,
  options: {
    startingCapital: number;
    monthlySip: number;
    horizonYears: number;
    annualSipStepUpPct?: number;
    inflationRatePct?: number;
  }
): ProjectedPortfolioSummary {
  const safeCapital = Math.max(1000, options.startingCapital);
  const safeSip = Math.max(0, options.monthlySip);
  const safeYears = Math.max(1, Math.min(25, Math.round(options.horizonYears)));
  const stepUpPct = Math.max(0, Math.min(40, options.annualSipStepUpPct ?? 0));
  const inflationPct = Math.max(0, Math.min(15, options.inflationRatePct ?? 0));

  const symbols = funds.map((f) => f.symbol);
  const normWeights = normalizeAllocationWeights(symbols, rawWeights);
  const corr = computeCorrelationMatrix(funds);
  const blended = computeBlendedPortfolioMetrics(funds, normWeights, corr);

  const grossRate = blended.blendedReturn3YPct / 100;
  const netRate = (blended.blendedReturn3YPct - blended.blendedExpenseRatioPct) / 100;
  const volDecimal = blended.blendedVolatilityPct / 100;

  const points: ProjectedPerformancePoint[] = [];

  for (let y = 0; y <= safeYears; y++) {
    const baseSim = compoundWithStepUpSip(safeCapital, safeSip, netRate, y, stepUpPct);
    const invested = Math.round(baseSim.totalInvested);
    const baseVal = Math.round(baseSim.endingValue);
    const inflationDeflator = Math.pow(1 + inflationPct / 100, y);
    const realBaseVal = Math.round(baseVal / inflationDeflator);

    const driftSpread = y === 0 ? 0 : (0.65 * volDecimal) / Math.sqrt(y);
    const bullRate = netRate + driftSpread;
    const bearRate = Math.max(-0.18, netRate - driftSpread);

    const bullVal =
      y === 0
        ? Math.round(safeCapital)
        : Math.max(baseVal, Math.round(compoundWithStepUpSip(safeCapital, safeSip, bullRate, y, stepUpPct).endingValue));
    const bearVal =
      y === 0
        ? Math.round(safeCapital)
        : Math.min(baseVal, Math.round(compoundWithStepUpSip(safeCapital, safeSip, bearRate, y, stepUpPct).endingValue));

    const row: ProjectedPerformancePoint = {
      year: y,
      yearLabel: y === 0 ? 'Now' : `Yr ${y}`,
      totalInvested: invested,
      baseValue: baseVal,
      realBaseValue: realBaseVal,
      bullValue: bullVal,
      bearValue: bearVal,
    };

    for (const f of funds) {
      const intel = getFundIntelligence(f);
      const fNet = (intel.returnOnAverage.avgAnnualReturn3Y - f.about.expenseRatioPct) / 100;
      row[f.symbol] = Math.round(compoundWithStepUpSip(safeCapital, safeSip, fNet, y, stepUpPct).endingValue);
    }

    points.push(row);
  }

  const last = points[points.length - 1];
  const grossEnd = Math.round(compoundWithStepUpSip(safeCapital, safeSip, grossRate, safeYears, stepUpPct).endingValue);
  const feeDrag = Math.max(0, grossEnd - last.baseValue);
  const baseGainPct = last.totalInvested > 0
    ? Number((((last.baseValue - last.totalInvested) / last.totalInvested) * 100).toFixed(1))
    : 0;

  return {
    startingCapital: safeCapital,
    monthlySip: safeSip,
    annualSipStepUpPct: stepUpPct,
    inflationRatePct: inflationPct,
    horizonYears: safeYears,
    totalInvestedEnd: last.totalInvested,
    weightedHistoricalCagrPct: blended.blendedReturn3YPct,
    weightedNetCagrPct: Number((blended.blendedReturn3YPct - blended.blendedExpenseRatioPct).toFixed(2)),
    weightedExpenseRatioPct: blended.blendedExpenseRatioPct,
    estimatedFeeDragAmount: feeDrag,
    covarianceVolatilityPct: blended.blendedVolatilityPct,
    portfolioVar95MonthlyPct: blended.blendedVar95MonthlyPct,
    portfolioMaxDrawdownEstPct: blended.blendedMaxDrawdownPct,
    portfolioSharpe3Y: blended.blendedSharpe3Y,
    baseEndingValue: last.baseValue,
    realBaseEndingValue: last.realBaseValue,
    bullEndingValue: last.bullValue,
    bearEndingValue: last.bearValue,
    baseGainPct,
    points,
  };
}

/**
 * Computes multi-instrument aggregated KPIs across any selected set of Mutual Funds & ETFs.
 */
export function computeAggregatedBasketSummary(
  funds: ScreenerFundRecord[]
): AggregatedBasketSummary {
  if (funds.length === 0) {
    return {
      count: 0,
      etfCount: 0,
      mfCount: 0,
      combinedAumUsdB: 0,
      avgReturn1YPct: 0,
      avgReturn3YPct: 0,
      avgAnnualReturn3YPct: 0,
      avgExpenseRatioPct: 0,
      avgSharpe3Y: 0,
      avgSortino3Y: 0,
      avgTreynor3Y: 0,
      avgVar95MonthlyPct: 0,
      avgMaxDrawdown3YPct: 0,
      avgCalmarRatio: 0,
      avgValidationScore: 0,
      categoryCounts: [],
    };
  }

  const n = funds.length;
  let etfCount = 0;
  let mfCount = 0;
  let combinedAumUsdB = 0;
  let sumR1Y = 0;
  let sumR3Y = 0;
  let sumAvg3Y = 0;
  let sumTer = 0;
  let sumSharpe = 0;
  let sumSortino = 0;
  let sumTreynor = 0;
  let sumVar95 = 0;
  let sumMaxDd = 0;
  let sumCalmar = 0;
  let sumVal = 0;
  const catMap = new Map<string, number>();

  for (const f of funds) {
    const intel = getFundIntelligence(f);
    const risk = computeInstrumentRiskProfile(f, intel);
    const val = computeFundValidationScore(f, intel);

    if (f.instrumentType === 'ETF') etfCount++;
    else mfCount++;

    combinedAumUsdB += f.keyStats.aumSortUsdB;
    sumR1Y += f.returnsTotal['1Y'] ?? 0;
    sumR3Y += f.returnsTotal['3Y'] ?? 0;
    sumAvg3Y += intel.returnOnAverage.avgAnnualReturn3Y;
    sumTer += f.about.expenseRatioPct;
    sumSharpe += f.keyStats.sharpe3Y;
    sumSortino += intel.ratios.sortino3Y;
    sumTreynor += intel.ratios.treynorRatio;
    sumVar95 += risk.var95MonthlyPct;
    sumMaxDd += risk.maxDrawdown3YPct;
    sumCalmar += risk.calmarRatio;
    sumVal += val.overall;
    catMap.set(f.category, (catMap.get(f.category) || 0) + 1);
  }

  const categoryCounts = Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return {
    count: n,
    etfCount,
    mfCount,
    combinedAumUsdB: Number(combinedAumUsdB.toFixed(2)),
    avgReturn1YPct: Number((sumR1Y / n).toFixed(2)),
    avgReturn3YPct: Number((sumR3Y / n).toFixed(2)),
    avgAnnualReturn3YPct: Number((sumAvg3Y / n).toFixed(2)),
    avgExpenseRatioPct: Number((sumTer / n).toFixed(2)),
    avgSharpe3Y: Number((sumSharpe / n).toFixed(2)),
    avgSortino3Y: Number((sumSortino / n).toFixed(2)),
    avgTreynor3Y: Number((sumTreynor / n).toFixed(2)),
    avgVar95MonthlyPct: Number((sumVar95 / n).toFixed(2)),
    avgMaxDrawdown3YPct: Number((sumMaxDd / n).toFixed(1)),
    avgCalmarRatio: Number((sumCalmar / n).toFixed(2)),
    avgValidationScore: Math.round(sumVal / n),
    categoryCounts,
  };
}

/**
 * Builds flat institutional rows for Bulk Data Views inside the Interactive Screener Terminal.
 */
export function buildBulkInstrumentRows(funds: ScreenerFundRecord[]): BulkInstrumentRow[] {
  return funds.map((f) => {
    const intel = getFundIntelligence(f);
    const risk = computeInstrumentRiskProfile(f, intel);
    const val = computeFundValidationScore(f, intel);
    return {
      symbol: f.symbol,
      name: f.name,
      instrumentType: f.instrumentType,
      category: f.category,
      exchange: f.exchange,
      currency: f.currency,
      price: f.price,
      changePct: f.changePct,
      aumLabel: f.keyStats.aumLabel,
      aumSortUsdB: f.keyStats.aumSortUsdB,
      expenseRatioPct: f.about.expenseRatioPct,
      return1YPct: f.returnsTotal['1Y'] ?? 0,
      return3YPct: f.returnsTotal['3Y'] ?? 0,
      avgAnnualReturn3YPct: Number(intel.returnOnAverage.avgAnnualReturn3Y.toFixed(2)),
      sharpe3Y: Number(f.keyStats.sharpe3Y.toFixed(2)),
      sortino3Y: Number(intel.ratios.sortino3Y.toFixed(2)),
      treynor3Y: Number(intel.ratios.treynorRatio.toFixed(2)),
      var95MonthlyPct: risk.var95MonthlyPct,
      cvar95MonthlyPct: risk.cvar95MonthlyPct,
      maxDrawdown3YPct: risk.maxDrawdown3YPct,
      calmarRatio: risk.calmarRatio,
      validationScore: val.overall,
      validationGrade: val.grade,
      leadManager: intel.manager.leadManager,
      riskTier: risk.riskTier,
      totalHoldings: f.keyStats.totalHoldings,
    };
  });
}

export function sortBulkInstrumentRows(
  rows: BulkInstrumentRow[],
  field: BulkSortField,
  dir: 'asc' | 'desc'
): BulkInstrumentRow[] {
  const mult = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (field === 'symbol') {
      return a.symbol.localeCompare(b.symbol) * mult;
    }
    const av = field === 'var95MonthlyPct' || field === 'maxDrawdown3YPct'
      ? Math.abs(a[field])
      : a[field];
    const bv = field === 'var95MonthlyPct' || field === 'maxDrawdown3YPct'
      ? Math.abs(b[field])
      : b[field];
    if (av === bv) return a.symbol.localeCompare(b.symbol);
    return (av - bv) * mult;
  });
}

export function buildBulkDataCsv(rows: BulkInstrumentRow[]): string {
  const headers = [
    'Symbol',
    'Name',
    'Type',
    'Category',
    'Exchange',
    'NAV/Price',
    'Day Change %',
    'AUM',
    'TER %',
    '1Y Return %',
    '3Y Return %',
    '3Y Avg Annual %',
    'Sharpe 3Y',
    'Sortino 3Y',
    'Treynor 3Y',
    '1M VaR 95% %',
    '1M CVaR 95% %',
    'Max DD 3Y %',
    'Calmar',
    'Validation Score',
    'Lead Manager',
    'Risk Tier',
  ];
  const esc = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      r.symbol,
      r.name,
      r.instrumentType,
      r.category,
      r.exchange,
      r.price.toFixed(2),
      r.changePct.toFixed(2),
      r.aumLabel,
      r.expenseRatioPct.toFixed(2),
      r.return1YPct.toFixed(2),
      r.return3YPct.toFixed(2),
      r.avgAnnualReturn3YPct.toFixed(2),
      r.sharpe3Y.toFixed(2),
      r.sortino3Y.toFixed(2),
      r.treynor3Y.toFixed(2),
      r.var95MonthlyPct.toFixed(2),
      r.cvar95MonthlyPct.toFixed(2),
      r.maxDrawdown3YPct.toFixed(1),
      r.calmarRatio.toFixed(2),
      r.validationScore,
      r.leadManager,
      r.riskTier,
    ]
      .map(esc)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}

export function buildAllocationProjectionCsv(
  funds: ScreenerFundRecord[],
  normalizedWeights: Record<string, number>,
  projection: ProjectedPortfolioSummary
): string {
  const lines: string[] = [
    'Section,Symbol/Year,Weight% / Invested,Base Value,Bull Value,Bear Value',
  ];
  for (const f of funds) {
    lines.push(
      `Allocation,${f.symbol},${(normalizedWeights[f.symbol] ?? 0).toFixed(1)}%,${f.about.expenseRatioPct.toFixed(2)}% TER,${f.category},${f.instrumentType}`
    );
  }
  for (const pt of projection.points) {
    lines.push(
      `Projection,${pt.yearLabel},${pt.totalInvested},${pt.baseValue},${pt.bullValue},${pt.bearValue}`
    );
  }
  return lines.join('\n');
}
