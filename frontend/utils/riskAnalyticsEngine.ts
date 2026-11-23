import { ScreenerFundRecord } from './screenerEngine';
import {
  FundIntelligenceProfile,
  MultiFundComparisonResult,
  getFundIntelligence,
} from './fundIntelligenceEngine';

export type ScreenerRiskSortKey =
  | 'aum'
  | 'price'
  | 'return1y'
  | 'return3y'
  | 'expense'
  | 'change'
  | 'var95'
  | 'var99'
  | 'cvar95'
  | 'maxDrawdown';

export type VarMetricBasis = 'var95' | 'var99' | 'cvar95';

export type RiskTierFilter = 'ALL' | 'Low Tail Risk' | 'Moderate' | 'Elevated+';

export interface UniverseRiskSummary {
  count: number;
  medianVar95MonthlyPct: number;
  medianMaxDrawdown3YPct: number;
  safestVarFund: { symbol: string; var95MonthlyPct: number } | null;
  riskiestVarFund: { symbol: string; var95MonthlyPct: number } | null;
  deepestDrawdownFund: { symbol: string; maxDrawdown3YPct: number } | null;
  tierCounts: {
    low: number;
    moderate: number;
    elevatedOrHigh: number;
  };
}

export type SortDirection = 'asc' | 'desc';

export type TailRiskTier = 'Low Tail Risk' | 'Moderate' | 'Elevated' | 'High Tail Risk';

export interface InstrumentRiskProfile {
  symbol: string;
  /** 1-Month 95% Value-at-Risk (negative %, e.g. -6.42 means 5% chance of losing >= 6.42% in a month) */
  var95MonthlyPct: number;
  /** 1-Month 99% Value-at-Risk (negative %, deeper than 95% VaR) */
  var99MonthlyPct: number;
  /** 1-Month 95% Conditional VaR / Expected Shortfall (average loss in worst 5% tail) */
  cvar95MonthlyPct: number;
  /** Annualized 95% Value-at-Risk estimate (negative %) */
  var95AnnualPct: number;
  /** Trailing 3Y Maximum Drawdown (negative %, directly from fund stats) */
  maxDrawdown3YPct: number;
  /** Calmar Ratio = 3Y Annualized Return / |Max Drawdown 3Y| */
  calmarRatio: number;
  /** 3Y Annualized Volatility (Std Dev %) */
  volatility3YPct: number;
  /** Historical worst observed monthly return from monthlyHeatmap (%) */
  worstObservedMonthPct: number;
  /** Estimated 1M 95% VaR loss on 100,000 currency units invested (positive magnitude) */
  worstMonthLossOn100k: number;
  riskTier: TailRiskTier;
}

export interface CorrelationMatrixResult {
  symbols: string[];
  /** matrix[i][j] is Pearson r in [-1, 1] between symbols[i] and symbols[j] */
  matrix: number[][];
  /** Average off-diagonal pairwise correlation */
  averagePairwiseCorrelation: number;
  /** 0..100 score where higher indicates stronger diversification benefit */
  diversificationScore: number;
  diversificationLabel: 'High Diversification' | 'Balanced Spread' | 'Moderately Correlated' | 'Concentrated Overlap';
}

export interface RiskReturnPoint {
  symbol: string;
  name: string;
  instrumentType: ScreenerFundRecord['instrumentType'];
  category: string;
  volatilityPct: number;
  return3YPct: number;
  sharpe3Y: number;
  var95MonthlyPct: number;
  maxDrawdown3YPct: number;
  expenseRatioPct: number;
  isSelected: boolean;
}

export interface CompoundingCurveRow {
  year: number;
  yearLabel: string;
  [symbol: string]: number | string;
}

export interface BlendedPortfolioMetrics {
  normalizedWeights: Record<string, number>;
  blendedReturn3YPct: number;
  blendedExpenseRatioPct: number;
  weightedAvgVolatilityPct: number;
  blendedVolatilityPct: number;
  diversificationVolSavedPct: number;
  blendedVar95MonthlyPct: number;
  blendedMaxDrawdownPct: number;
  blendedSharpe3Y: number;
  blendedTenYearWealthOn100k: number;
}

export interface MacroStressScenario {
  id: string;
  name: string;
  regime: string;
  shockDescription: string;
  estimatedImpactPct: number;
  estimatedLossOn100k: number;
  recoveryMonthsEst: number;
  resilienceRating: 'Defensive' | 'Resilient' | 'Moderate Impact' | 'High Sensitivity';
}

const Z_95 = 1.6449;
const Z_99 = 2.3263;
// Standard normal conditional expectation beyond 95% tail: phi(z_95) / 0.05 ≈ 2.0627
const CVAR_95_Z = 2.0627;

function extractMonthlyReturnsMap(intel: FundIntelligenceProfile): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of intel.monthlyHeatmap) {
    for (let mIdx = 0; mIdx < row.months.length; mIdx++) {
      const val = row.months[mIdx];
      if (typeof val === 'number' && Number.isFinite(val)) {
        map.set(`${row.year}-${String(mIdx + 1).padStart(2, '0')}`, val);
      }
    }
  }
  return map;
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const clamped = Math.min(1, Math.max(0, p));
  const idx = clamped * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * frac;
}

/**
 * Computes institutional tail-risk metrics (1M 95% VaR, 99% VaR, 95% CVaR / Expected Shortfall,
 * Annual 95% VaR, 3Y Max Drawdown, and Calmar Ratio) deterministically for any Mutual Fund or ETF.
 */
export function computeInstrumentRiskProfile(
  fund: ScreenerFundRecord,
  intelInput?: FundIntelligenceProfile
): InstrumentRiskProfile {
  const intel = intelInput || getFundIntelligence(fund);
  const annualVolPct = Math.max(0.4, intel.ratios.stdDev3Y);
  const annualReturnPct = intel.returnOnAverage.avgAnnualReturn3Y;
  const maxDd = fund.keyStats.maxDrawdown3YPct <= 0
    ? fund.keyStats.maxDrawdown3YPct
    : -Math.abs(fund.keyStats.maxDrawdown3YPct);

  const monthlyVol = annualVolPct / Math.sqrt(12);
  const monthlyMean = annualReturnPct / 12;

  // Parametric Gaussian VaR & Expected Shortfall (always negative or <= -0.05%)
  const paramVar95 = Math.min(-0.05, monthlyMean - Z_95 * monthlyVol);
  const paramVar99 = Math.min(paramVar95 - 0.1, monthlyMean - Z_99 * monthlyVol);
  const paramCvar95 = Math.min(paramVar95 - 0.08, monthlyMean - CVAR_95_Z * monthlyVol);

  // Empirical monthly distribution from monthlyHeatmap
  const monthlyVals = Array.from(extractMonthlyReturnsMap(intel).values()).sort((a, b) => a - b);
  const worstObserved = monthlyVals.length > 0 ? monthlyVals[0] : paramVar95;

  let var95Monthly = paramVar95;
  let cvar95Monthly = paramCvar95;
  if (monthlyVals.length >= 12) {
    const empVar95 = Math.min(-0.05, percentile(monthlyVals, 0.05));
    // Blend 65% parametric + 35% empirical historical tail so both vol & realized tails are reflected
    var95Monthly = Math.min(-0.05, 0.65 * paramVar95 + 0.35 * empVar95);
    const tailVals = monthlyVals.filter((v) => v <= empVar95);
    const empCvar =
      tailVals.length > 0
        ? tailVals.reduce((s, v) => s + v, 0) / tailVals.length
        : empVar95 * 1.22;
    cvar95Monthly = Math.min(var95Monthly - 0.05, 0.65 * paramCvar95 + 0.35 * empCvar);
  }

  // Ensure strict institutional monotonicity: |var99| >= |cvar95| >= |var95| (or |var99| > |var95| & |cvar95| > |var95|)
  const var99Monthly = Math.min(var95Monthly - 0.15, Math.min(paramVar99, var95Monthly * 1.38));
  const finalCvar95 = Math.min(var95Monthly - 0.1, cvar95Monthly);

  // Annualized 95% VaR (capped safely below -85%)
  const rawAnnualVar95 = Math.min(-0.2, annualReturnPct - Z_95 * annualVolPct);
  const var95Annual = Math.max(-85, Math.min(rawAnnualVar95, var95Monthly * 2.4));

  const absDd = Math.max(0.25, Math.abs(maxDd));
  const calmar = Number((annualReturnPct / absDd).toFixed(2));

  const absVar95 = Math.abs(var95Monthly);
  let riskTier: TailRiskTier = 'Moderate';
  if (absVar95 < 2.5 && absDd < 6) {
    riskTier = 'Low Tail Risk';
  } else if (absVar95 < 6.5 && absDd < 17) {
    riskTier = 'Moderate';
  } else if (absVar95 < 9.5 && absDd < 26) {
    riskTier = 'Elevated';
  } else {
    riskTier = 'High Tail Risk';
  }

  return {
    symbol: fund.symbol,
    var95MonthlyPct: Number(var95Monthly.toFixed(2)),
    var99MonthlyPct: Number(var99Monthly.toFixed(2)),
    cvar95MonthlyPct: Number(finalCvar95.toFixed(2)),
    var95AnnualPct: Number(var95Annual.toFixed(2)),
    maxDrawdown3YPct: Number(maxDd.toFixed(1)),
    calmarRatio: calmar,
    volatility3YPct: Number(annualVolPct.toFixed(1)),
    worstObservedMonthPct: Number(worstObserved.toFixed(2)),
    worstMonthLossOn100k: Math.round((Math.abs(var95Monthly) / 100) * 100_000),
    riskTier,
  };
}

/**
 * Sorts screener funds by any standard or tail-risk column in ascending or descending order.
 * For `var95` and `maxDrawdown`:
 *   - `asc` = Safest / Shallowest risk magnitude first (e.g., -0.20% before -11.40%)
 *   - `desc` = Riskiest / Deepest loss magnitude first (e.g., -11.40% before -0.20%)
 */
export function sortScreenerFundsWithRisk(
  funds: ScreenerFundRecord[],
  sortBy: ScreenerRiskSortKey,
  sortDir: SortDirection = 'desc',
  riskMap?: Record<string, InstrumentRiskProfile>
): ScreenerFundRecord[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  const resolvedRisk = (f: ScreenerFundRecord) =>
    riskMap?.[f.symbol] || computeInstrumentRiskProfile(f);

  return [...funds].sort((a, b) => {
    let valA = 0;
    let valB = 0;

    switch (sortBy) {
      case 'aum':
        valA = a.keyStats.aumSortUsdB;
        valB = b.keyStats.aumSortUsdB;
        break;
      case 'price':
        valA = a.price;
        valB = b.price;
        break;
      case 'return1y':
        valA = a.returnsTotal['1Y'] ?? -999;
        valB = b.returnsTotal['1Y'] ?? -999;
        break;
      case 'return3y':
        valA = a.returnsTotal['3Y'] ?? -999;
        valB = b.returnsTotal['3Y'] ?? -999;
        break;
      case 'expense':
        valA = a.about.expenseRatioPct;
        valB = b.about.expenseRatioPct;
        break;
      case 'change':
        valA = a.changePct;
        valB = b.changePct;
        break;
      case 'var95':
        // Sort by absolute VaR risk magnitude so asc = safest (smallest loss), desc = riskiest (largest loss)
        valA = Math.abs(resolvedRisk(a).var95MonthlyPct);
        valB = Math.abs(resolvedRisk(b).var95MonthlyPct);
        break;
      case 'var99':
        valA = Math.abs(resolvedRisk(a).var99MonthlyPct);
        valB = Math.abs(resolvedRisk(b).var99MonthlyPct);
        break;
      case 'cvar95':
        valA = Math.abs(resolvedRisk(a).cvar95MonthlyPct);
        valB = Math.abs(resolvedRisk(b).cvar95MonthlyPct);
        break;
      case 'maxDrawdown':
        // Sort by absolute Max DD magnitude so asc = shallowest drawdown, desc = deepest drawdown
        valA = Math.abs(resolvedRisk(a).maxDrawdown3YPct);
        valB = Math.abs(resolvedRisk(b).maxDrawdown3YPct);
        break;
    }

    if (valA === valB) {
      return a.symbol.localeCompare(b.symbol);
    }
    return (valA - valB) * dir;
  });
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  const denom = Math.sqrt(varX * varY);
  if (denom <= 1e-9) return 0;
  return Math.max(-1, Math.min(1, cov / denom));
}

/**
 * Computes empirical pairwise Pearson correlations across compared instruments
 * using aligned monthly return histories from each fund's monthlyHeatmap.
 */
export function computeCorrelationMatrix(
  funds: ScreenerFundRecord[]
): CorrelationMatrixResult {
  const symbols = funds.map((f) => f.symbol);
  const seriesByIdx = funds.map((f) => extractMonthlyReturnsMap(getFundIntelligence(f)));
  const n = funds.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  let offDiagSum = 0;
  let offDiagCount = 0;

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const mapA = seriesByIdx[i];
      const mapB = seriesByIdx[j];
      const xs: number[] = [];
      const ys: number[] = [];
      for (const [k, vA] of mapA.entries()) {
        if (mapB.has(k)) {
          xs.push(vA);
          ys.push(mapB.get(k)!);
        }
      }
      const r = Number(pearsonCorrelation(xs, ys).toFixed(2));
      matrix[i][j] = r;
      matrix[j][i] = r;
      offDiagSum += r;
      offDiagCount += 1;
    }
  }

  const avgCorr = offDiagCount > 0 ? Number((offDiagSum / offDiagCount).toFixed(2)) : 1;
  // Map average correlation in [-0.5, 1.0] into a 0..100 Diversification Score
  const divScore = Math.max(5, Math.min(100, Math.round((1 - Math.max(-0.5, avgCorr)) * 75 + 15)));

  let diversificationLabel: CorrelationMatrixResult['diversificationLabel'] = 'Balanced Spread';
  if (divScore >= 75) {
    diversificationLabel = 'High Diversification';
  } else if (divScore >= 52) {
    diversificationLabel = 'Balanced Spread';
  } else if (divScore >= 32) {
    diversificationLabel = 'Moderately Correlated';
  } else {
    diversificationLabel = 'Concentrated Overlap';
  }

  return {
    symbols,
    matrix,
    averagePairwiseCorrelation: avgCorr,
    diversificationScore: divScore,
    diversificationLabel,
  };
}

/**
 * Generates scatter data for the Risk-Return Efficient Frontier chart.
 */
export function buildRiskReturnFrontierData(
  selectedFunds: ScreenerFundRecord[],
  allFunds: ScreenerFundRecord[],
  includeAllPeers: boolean
): RiskReturnPoint[] {
  const selectedSet = new Set(selectedFunds.map((f) => f.symbol.toUpperCase()));
  const pool = includeAllPeers ? allFunds : selectedFunds;

  return pool.map((fund) => {
    const intel = getFundIntelligence(fund);
    const risk = computeInstrumentRiskProfile(fund, intel);
    return {
      symbol: fund.symbol,
      name: fund.name,
      instrumentType: fund.instrumentType,
      category: fund.category,
      volatilityPct: risk.volatility3YPct,
      return3YPct: Number(intel.returnOnAverage.avgAnnualReturn3Y.toFixed(2)),
      sharpe3Y: Number(fund.keyStats.sharpe3Y.toFixed(2)),
      var95MonthlyPct: risk.var95MonthlyPct,
      maxDrawdown3YPct: risk.maxDrawdown3YPct,
      expenseRatioPct: fund.about.expenseRatioPct,
      isSelected: selectedSet.has(fund.symbol.toUpperCase()),
    };
  });
}

/**
 * Builds year-by-year net-of-TER compounding curves for Recharts multi-line visualization.
 */
export function buildCompoundingCurveSeries(
  funds: ScreenerFundRecord[],
  years: number,
  principal: number
): CompoundingCurveRow[] {
  const safeYears = Math.max(1, Math.min(20, Math.round(years)));
  const safePrincipal = Math.max(1000, principal);

  const ratesBySymbol = funds.map((fund) => {
    const intel = getFundIntelligence(fund);
    const netRate = (intel.returnOnAverage.avgAnnualReturn3Y - fund.about.expenseRatioPct) / 100;
    return { symbol: fund.symbol, netRate };
  });

  const rows: CompoundingCurveRow[] = [];
  for (let y = 0; y <= safeYears; y++) {
    const row: CompoundingCurveRow = {
      year: y,
      yearLabel: y === 0 ? 'Start' : `Yr ${y}`,
    };
    for (const item of ratesBySymbol) {
      row[item.symbol] = Math.round(safePrincipal * Math.pow(1 + item.netRate, y));
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Computes correlation-aware Minimum-VaR / Minimum-Variance weights across selected funds summing to 100.
 * Accounts for pairwise correlations so highly correlated assets (e.g., GOLDBEES & GLD at r=0.98)
 * do not crowd out negatively-correlated diversifiers.
 */
export function computeMinVarWeights(
  funds: ScreenerFundRecord[],
  correlation?: CorrelationMatrixResult
): Record<string, number> {
  if (funds.length === 0) return {};
  if (funds.length === 1) return { [funds[0].symbol]: 100 };

  const corr = correlation || computeCorrelationMatrix(funds);
  const profiles = funds.map((f) => {
    const intel = getFundIntelligence(f);
    return {
      symbol: f.symbol,
      intel,
      risk: computeInstrumentRiskProfile(f, intel),
    };
  });

  const n = profiles.length;
  const vols = profiles.map((p) => Math.max(0.4, p.risk.volatility3YPct));
  const rets = profiles.map((p) => p.intel.returnOnAverage.avgAnnualReturn3Y);

  const evalVarMagnitude = (w: number[]): number => {
    let portVar = 0;
    let portRet = 0;
    for (let i = 0; i < n; i++) {
      portRet += w[i] * rets[i];
      for (let j = 0; j < n; j++) {
        const r = corr.matrix[i]?.[j] ?? (i === j ? 1 : 0.4);
        portVar += w[i] * w[j] * vols[i] * vols[j] * r;
      }
    }
    const monthlyVol = Math.sqrt(Math.max(0.04, portVar)) / Math.sqrt(12);
    const var95 = Math.min(-0.05, portRet / 12 - Z_95 * monthlyVol);
    return Math.abs(var95);
  };

  // Start from inverse-volatility weights (with 5% floor so no selected fund disappears unless optimal)
  const invVols = vols.map((v) => 1 / v);
  const sumInv = invVols.reduce((s, x) => s + x, 0) || 1;
  let bestW = invVols.map((x) => x / sumInv);
  let bestScore = evalVarMagnitude(bestW);

  // Also test equal weight as a baseline candidate
  const eqW = Array(n).fill(1 / n);
  const eqScore = evalVarMagnitude(eqW);
  if (eqScore < bestScore) {
    bestW = eqW;
    bestScore = eqScore;
  }

  // Deterministic pairwise coordinate refinement over the simplex
  const steps = [0.1, 0.05, 0.02, 0.01];
  for (const step of steps) {
    for (let pass = 0; pass < 10; pass++) {
      let improved = false;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j || bestW[j] < step + 0.05) continue;
          const cand = [...bestW];
          cand[i] += step;
          cand[j] -= step;
          const sc = evalVarMagnitude(cand);
          if (sc + 1e-6 < bestScore) {
            bestW = cand;
            bestScore = sc;
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
  }

  // Round cleanly to integer percentages summing to 100
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

  const weights: Record<string, number> = {};
  profiles.forEach((p, idx) => {
    weights[p.symbol] = ints[idx];
  });
  return weights;
}

/**
 * Computes correlation-adjusted portfolio blend metrics for interactive allocation sliders.
 */
export function computeBlendedPortfolioMetrics(
  funds: ScreenerFundRecord[],
  rawWeightsBySymbol: Record<string, number>,
  correlation?: CorrelationMatrixResult
): BlendedPortfolioMetrics {
  const corr = correlation || computeCorrelationMatrix(funds);
  const rawTotal = funds.reduce(
    (sum, f) => sum + Math.max(0, rawWeightsBySymbol[f.symbol] ?? 0),
    0
  );

  const normalizedWeights: Record<string, number> = {};
  const wVec: number[] = [];
  const equalShare = funds.length > 0 ? 1 / funds.length : 0;

  for (const f of funds) {
    const share = rawTotal > 0 ? Math.max(0, rawWeightsBySymbol[f.symbol] ?? 0) / rawTotal : equalShare;
    wVec.push(share);
    normalizedWeights[f.symbol] = Number((share * 100).toFixed(1));
  }

  const profiles = funds.map((f) => {
    const intel = getFundIntelligence(f);
    return {
      fund: f,
      intel,
      risk: computeInstrumentRiskProfile(f, intel),
    };
  });

  let blendedReturn = 0;
  let blendedTer = 0;
  let weightedAvgVol = 0;
  let weightedAvgDd = 0;

  for (let i = 0; i < profiles.length; i++) {
    const w = wVec[i];
    blendedReturn += w * profiles[i].intel.returnOnAverage.avgAnnualReturn3Y;
    blendedTer += w * profiles[i].fund.about.expenseRatioPct;
    weightedAvgVol += w * profiles[i].risk.volatility3YPct;
    weightedAvgDd += w * profiles[i].risk.maxDrawdown3YPct;
  }

  // Exact covariance portfolio variance: w^T * Sigma * w
  let portfolioVariance = 0;
  for (let i = 0; i < profiles.length; i++) {
    for (let j = 0; j < profiles.length; j++) {
      const r = corr.matrix[i]?.[j] ?? (i === j ? 1 : 0.4);
      portfolioVariance += wVec[i] * wVec[j] * profiles[i].risk.volatility3YPct * profiles[j].risk.volatility3YPct * r;
    }
  }
  const blendedVol = Math.sqrt(Math.max(0.04, portfolioVariance));
  const divBenefitRatio = weightedAvgVol > 0 ? Math.min(1, blendedVol / weightedAvgVol) : 1;

  const monthlyBlendedVol = blendedVol / Math.sqrt(12);
  const blendedVar95 = Math.min(-0.05, blendedReturn / 12 - Z_95 * monthlyBlendedVol);
  // Diversified drawdown improves proportionally with correlation diversification benefit
  const blendedMaxDd = weightedAvgDd * (0.45 + 0.55 * divBenefitRatio);

  // Risk-free rate approximation (5.2% blended INR/USD institutional hurdle)
  const riskFree = funds.every((f) => f.currency === 'USD') ? 4.2 : 6.0;
  const blendedSharpe = (blendedReturn - riskFree) / Math.max(0.5, blendedVol);
  const netRate = (blendedReturn - blendedTer) / 100;
  const wealth10Y = Math.round(100_000 * Math.pow(1 + netRate, 10));

  return {
    normalizedWeights,
    blendedReturn3YPct: Number(blendedReturn.toFixed(2)),
    blendedExpenseRatioPct: Number(blendedTer.toFixed(2)),
    weightedAvgVolatilityPct: Number(weightedAvgVol.toFixed(2)),
    blendedVolatilityPct: Number(blendedVol.toFixed(2)),
    diversificationVolSavedPct: Number(Math.max(0, weightedAvgVol - blendedVol).toFixed(2)),
    blendedVar95MonthlyPct: Number(blendedVar95.toFixed(2)),
    blendedMaxDrawdownPct: Number(blendedMaxDd.toFixed(1)),
    blendedSharpe3Y: Number(blendedSharpe.toFixed(2)),
    blendedTenYearWealthOn100k: wealth10Y,
  };
}

/**
 * Generates 4 institutional macro stress-test scenarios calibrated to each fund's
 * category, beta, volatility, and historical drawdown profile.
 */
export function buildStressTestScenarios(
  fund: ScreenerFundRecord,
  intelInput?: FundIntelligenceProfile
): MacroStressScenario[] {
  const intel = intelInput || getFundIntelligence(fund);
  const risk = computeInstrumentRiskProfile(fund, intel);
  const cat = `${fund.category} ${fund.subCategory}`.toLowerCase();
  const beta = Math.max(0.05, fund.keyStats.beta3Y);
  const absDd = Math.abs(risk.maxDrawdown3YPct);

  const isDebt = cat.includes('debt') || cat.includes('gilt') || cat.includes('bond') || cat.includes('liquid') || cat.includes('treasury');
  const isBullion = cat.includes('gold') || cat.includes('silver') || cat.includes('bullion') || cat.includes('commodity');
  const isLongDuration = fund.symbol === 'TLT' || fund.symbol === 'SBIGILT' || fund.symbol === 'ICICIGILT';

  const rateImpact = (impact: number): MacroStressScenario['resilienceRating'] => {
    if (impact >= 0) return 'Defensive';
    if (impact > -6) return 'Resilient';
    if (impact > -16) return 'Moderate Impact';
    return 'High Sensitivity';
  };

  // Scenario 1: Global Equity Liquidity Shock (-25% benchmark selloff)
  const eqShock = isDebt
    ? (isLongDuration ? 3.8 : 0.9)
    : isBullion
      ? (fund.symbol === 'SILVERBEES' ? -9.4 : 4.2)
      : Number((-Math.min(42, Math.max(8, 22 * beta * 0.95 + absDd * 0.12))).toFixed(1));

  // Scenario 2: Central Bank Policy Rate Hike (+150 bps)
  const rateShock = isLongDuration
    ? Number((-Math.min(18, Math.max(6.5, absDd * 0.55))).toFixed(1))
    : isDebt
      ? Number((-Math.max(0.4, absDd * 0.35)).toFixed(1))
      : isBullion
        ? -4.8
        : Number((-Math.min(20, Math.max(4.5, 9.5 * beta))).toFixed(1));

  // Scenario 3: Sticky Inflation & Stagflation Spike
  const stagflationShock = isBullion
    ? Number((fund.symbol === 'SILVERBEES' ? 11.2 : 9.6).toFixed(1))
    : isLongDuration
      ? -11.4
      : isDebt
        ? -1.8
        : Number((-Math.min(24, Math.max(6.0, 12.2 * beta))).toFixed(1));

  // Scenario 4: FX Volatility & Capital Outflow Shock (+6% USD / EM Spread Widening)
  const fxShock = fund.currency === 'USD'
    ? (isLongDuration ? -3.4 : -6.2)
    : isBullion
      ? 5.8
      : isDebt
        ? -1.2
        : Number((-Math.min(19, Math.max(5.5, 10.4 * beta))).toFixed(1));

  const makeScenario = (
    id: string,
    name: string,
    regime: string,
    shockDescription: string,
    impactPct: number
  ): MacroStressScenario => ({
    id,
    name,
    regime,
    shockDescription,
    estimatedImpactPct: Number(impactPct.toFixed(1)),
    estimatedLossOn100k: Math.round((impactPct / 100) * 100_000),
    recoveryMonthsEst: impactPct >= 0 ? 0 : Math.max(1, Math.round(Math.abs(impactPct) * 0.65)),
    resilienceRating: rateImpact(impactPct),
  });

  return [
    makeScenario(
      'equity-liquidity',
      'Equity Liquidity Shock',
      'Risk-Off · -25% Index',
      'Broad institutional deleveraging with credit spreads widening +180 bps.',
      eqShock
    ),
    makeScenario(
      'rate-hike-150',
      'Policy Rate Hike (+150 bps)',
      'Hawkish Tightening',
      'Parallel upward shift across 2Y–10Y sovereign yields repricing duration and multiples.',
      rateShock
    ),
    makeScenario(
      'stagflation',
      'Stagflation & Commodity Spike',
      'CPI +200 bps · Slow Growth',
      'Persistent energy and food inflation compressing margins while favoring physical hedges.',
      stagflationShock
    ),
    makeScenario(
      'fx-outflow',
      'FX & Capital Outflow Stress',
      'USD +6% · FII Outflows',
      'Dollar strength triggering tactical foreign outflows from risk assets and mid/small caps.',
      fxShock
    ),
  ];
}

/**
 * Exports multi-instrument comparison metrics (including VaR, CVaR, Max DD, Calmar, Sharpe, Sortino, Treynor) as CSV.
 */
export function buildComparisonCsv(
  comparison: MultiFundComparisonResult,
  riskBySymbol: Record<string, InstrumentRiskProfile>
): string {
  const headers = [
    'Symbol',
    'Name',
    'Type',
    'Category',
    'Rank',
    'Priority Score',
    'Validation Score',
    'Expense Ratio (%)',
    '1Y Return (%)',
    '3Y Cumulative (%)',
    '3Y Avg Annual (%)',
    'Sharpe (3Y)',
    'Sortino (3Y)',
    'Treynor (3Y)',
    '1M VaR 95% (%)',
    '1M CVaR 95% (%)',
    'Max Drawdown 3Y (%)',
    'Calmar Ratio',
    '10Y Net Wealth (100k)',
  ];

  const rows = comparison.items.map(({ fund, intel, validation, priorityScore, tenYearNetWealthOn100k }) => {
    const rank = comparison.rankings.find((r) => r.symbol === fund.symbol)?.rank ?? '';
    const risk = riskBySymbol[fund.symbol] || computeInstrumentRiskProfile(fund, intel);
    const esc = (v: string | number | null) => {
      const str = v === null || v === undefined ? '' : String(v);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    };
    return [
      fund.symbol,
      fund.name,
      fund.instrumentType,
      fund.category,
      rank,
      priorityScore,
      validation.overall,
      fund.about.expenseRatioPct.toFixed(2),
      fund.returnsTotal['1Y'] ?? '',
      fund.returnsTotal['3Y'] ?? '',
      intel.returnOnAverage.avgAnnualReturn3Y.toFixed(2),
      fund.keyStats.sharpe3Y.toFixed(2),
      intel.ratios.sortino3Y.toFixed(2),
      intel.ratios.treynorRatio.toFixed(2),
      risk.var95MonthlyPct.toFixed(2),
      risk.cvar95MonthlyPct.toFixed(2),
      risk.maxDrawdown3YPct.toFixed(1),
      risk.calmarRatio.toFixed(2),
      tenYearNetWealthOn100k,
    ]
      .map(esc)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Filters a list of screener instruments by institutional tail-risk tier.
 */
export function filterByRiskTier(
  funds: ScreenerFundRecord[],
  tierFilter: RiskTierFilter,
  riskMap?: Record<string, InstrumentRiskProfile>
): ScreenerFundRecord[] {
  if (tierFilter === 'ALL') return funds;
  return funds.filter((f) => {
    const risk = riskMap?.[f.symbol] || computeInstrumentRiskProfile(f);
    if (tierFilter === 'Elevated+') {
      return risk.riskTier === 'Elevated' || risk.riskTier === 'High Tail Risk';
    }
    return risk.riskTier === tierFilter;
  });
}

/**
 * Computes institutional summary telemetry across the currently visible screener universe.
 */
export function computeUniverseRiskSummary(
  funds: ScreenerFundRecord[],
  riskMap?: Record<string, InstrumentRiskProfile>
): UniverseRiskSummary {
  if (funds.length === 0) {
    return {
      count: 0,
      medianVar95MonthlyPct: 0,
      medianMaxDrawdown3YPct: 0,
      safestVarFund: null,
      riskiestVarFund: null,
      deepestDrawdownFund: null,
      tierCounts: { low: 0, moderate: 0, elevatedOrHigh: 0 },
    };
  }

  const profiles = funds.map((f) => riskMap?.[f.symbol] || computeInstrumentRiskProfile(f));
  const sortedVars = profiles.map((p) => p.var95MonthlyPct).sort((a, b) => a - b);
  const sortedDds = profiles.map((p) => p.maxDrawdown3YPct).sort((a, b) => a - b);

  let safest = profiles[0];
  let riskiest = profiles[0];
  let deepestDd = profiles[0];
  let low = 0;
  let moderate = 0;
  let elevatedOrHigh = 0;

  for (const p of profiles) {
    if (Math.abs(p.var95MonthlyPct) < Math.abs(safest.var95MonthlyPct)) safest = p;
    if (Math.abs(p.var95MonthlyPct) > Math.abs(riskiest.var95MonthlyPct)) riskiest = p;
    if (Math.abs(p.maxDrawdown3YPct) > Math.abs(deepestDd.maxDrawdown3YPct)) deepestDd = p;
    if (p.riskTier === 'Low Tail Risk') low += 1;
    else if (p.riskTier === 'Moderate') moderate += 1;
    else elevatedOrHigh += 1;
  }

  return {
    count: profiles.length,
    medianVar95MonthlyPct: Number(percentile(sortedVars, 0.5).toFixed(2)),
    medianMaxDrawdown3YPct: Number(percentile(sortedDds, 0.5).toFixed(1)),
    safestVarFund: { symbol: safest.symbol, var95MonthlyPct: safest.var95MonthlyPct },
    riskiestVarFund: { symbol: riskiest.symbol, var95MonthlyPct: riskiest.var95MonthlyPct },
    deepestDrawdownFund: { symbol: deepestDd.symbol, maxDrawdown3YPct: deepestDd.maxDrawdown3YPct },
    tierCounts: { low, moderate, elevatedOrHigh },
  };
}

/**
 * Exports the filtered & sorted screener table with full Value-at-Risk & Max Drawdown metrics as CSV.
 */
export function buildScreenerRiskTableCsv(
  funds: ScreenerFundRecord[],
  riskMap?: Record<string, InstrumentRiskProfile>
): string {
  const headers = [
    'Symbol',
    'Name',
    'Type',
    'Category',
    'Currency',
    'Price/NAV',
    '1Y Return (%)',
    '3Y Return (%)',
    'Expense Ratio (%)',
    'Sharpe (3Y)',
    'Sortino (3Y)',
    'Treynor (3Y)',
    '1M VaR 95% (%)',
    '1M VaR 99% (%)',
    '1M CVaR 95% (%)',
    'Annual VaR 95% (%)',
    'Max Drawdown 3Y (%)',
    'Calmar Ratio',
    'Volatility 3Y (%)',
    'Tail Risk Tier',
  ];

  const esc = (v: string | number | null) => {
    const str = v === null || v === undefined ? '' : String(v);
    return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const rows = funds.map((f) => {
    const intel = getFundIntelligence(f);
    const risk = riskMap?.[f.symbol] || computeInstrumentRiskProfile(f, intel);
    return [
      f.symbol,
      f.name,
      f.instrumentType,
      f.category,
      f.currency,
      f.price.toFixed(2),
      f.returnsTotal['1Y'] ?? '',
      f.returnsTotal['3Y'] ?? '',
      f.about.expenseRatioPct.toFixed(2),
      f.keyStats.sharpe3Y.toFixed(2),
      intel.ratios.sortino3Y.toFixed(2),
      intel.ratios.treynorRatio.toFixed(2),
      risk.var95MonthlyPct.toFixed(2),
      risk.var99MonthlyPct.toFixed(2),
      risk.cvar95MonthlyPct.toFixed(2),
      risk.var95AnnualPct.toFixed(2),
      risk.maxDrawdown3YPct.toFixed(1),
      risk.calmarRatio.toFixed(2),
      risk.volatility3YPct.toFixed(1),
      risk.riskTier,
    ]
      .map(esc)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
