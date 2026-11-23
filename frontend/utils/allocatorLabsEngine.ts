import { ScreenerFundRecord } from './screenerEngine';
import { getFundIntelligence } from './fundIntelligenceEngine';
import {
  computeBlendedPortfolioMetrics,
  computeCorrelationMatrix,
} from './riskAnalyticsEngine';
import { normalizeAllocationWeights } from './portfolioAllocatorEngine';
import type { PortfolioRebalancePlan } from './rebalanceEngine';

export interface MonteCarloYearPoint {
  year: number;
  yearLabel: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  invested: number;
}

export interface MonteCarloSimulationResult {
  pathsCount: number;
  horizonYears: number;
  targetGoal: number;
  goalSuccessProbabilityPct: number;
  p10Ending: number;
  p25Ending: number;
  medianEnding: number;
  p75Ending: number;
  p90Ending: number;
  realMedianEnding: number;
  shortfallOrSurplus: number;
  points: MonteCarloYearPoint[];
}

export interface PortfolioLookthroughExposure {
  assetClasses: Array<{ label: string; weightPct: number; color: string }>;
  sectors: Array<{ sector: string; weightPct: number }>;
  topUnderlyingHoldings: Array<{
    name: string;
    ticker: string;
    sector: string;
    effectiveWeightPct: number;
    fundCount: number;
    funds: string[];
  }>;
  overlapHoldingsCount: number;
  effectiveFundCount: number;
  herfindahlIndex: number;
  diversificationGrade: 'Institutional Diversified' | 'Balanced' | 'Concentrated';
  weightedDividendYieldPct: number;
  estimatedAnnualIncome: number;
}

export interface PortfolioStressScenarioResult {
  id: string;
  name: string;
  era: string;
  description: string;
  portfolioImpactPct: number;
  portfolioImpactAmount: number;
  postShockValue: number;
  worstContributor: { symbol: string; impactPct: number };
  bestContributor: { symbol: string; impactPct: number };
  resilienceRating: 'Defensive' | 'Resilient' | 'Moderate' | 'High Drawdown';
}

export interface SwpYearPoint {
  year: number;
  yearLabel: string;
  startingBalance: number;
  annualWithdrawal: number;
  endingBalance: number;
  cumulativeWithdrawn: number;
}

export interface SwpSimulationResult {
  startingCorpus: number;
  initialMonthlyWithdrawal: number;
  annualInflationPct: number;
  expectedReturnPct: number;
  horizonYears: number;
  survivedAllYears: boolean;
  yearsSustained: number;
  totalWithdrawn: number;
  terminalCorpus: number;
  initialWithdrawalRatePct: number;
  sustainabilityStatus: 'Perpetual / Growing' | 'Sustainable' | 'Depletes Early';
  points: SwpYearPoint[];
}

export interface FreshCashRebalanceRow {
  symbol: string;
  name: string;
  currentValue: number;
  currentWeightPct: number;
  targetWeightPct: number;
  freshCashAllocation: number;
  postDepositValue: number;
  postDepositWeightPct: number;
  remainingDriftPct: number;
  estimatedUnits: number;
  unitPrice: number;
  currency: 'INR' | 'USD';
}

export interface FreshCashRebalancePlan {
  freshCashAmount: number;
  currentTotalValue: number;
  postDepositTotalValue: number;
  preMaxDriftPct: number;
  postMaxDriftPct: number;
  driftReductionPct: number;
  rows: FreshCashRebalanceRow[];
}

export interface TaxAwareRebalanceSummary {
  holdingPeriod: 'ltcg' | 'stcg';
  assumedGainRatioPct: number;
  totalSellAmount: number;
  estimatedRealizedGain: number;
  exemptionApplied: number;
  estimatedCapitalGainsTax: number;
  estimatedExitLoad: number;
  totalFrictionCost: number;
  freshCashTaxSaved: number;
}

export interface SavedPortfolioSnapshot {
  id: string;
  name: string;
  createdAt: string;
  symbols: string[];
  weights: Record<string, number>;
  startingCapital: number;
  monthlySip: number;
  horizonYears: number;
  netCagrPct: number;
  sharpe3Y: number;
  var95MonthlyPct: number;
  baseEndingValue: number;
}

const ASSET_CLASS_COLORS: Record<string, string> = {
  Equity: '#2563eb',
  'Fixed Income / Debt': '#059669',
  'Gold / Commodities': '#d97706',
  'Cash / Liquid': '#64748b',
  'Hybrid / Multi-Asset': '#7c3aed',
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRandom(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

/**
 * Deterministic seeded 500-path Geometric Brownian Motion Monte Carlo wealth simulator
 * with annual Step-Up SIP, inflation deflator, and Target Goal achievement probability.
 */
export function runPortfolioMonteCarlo(
  funds: ScreenerFundRecord[],
  rawWeights: Record<string, number>,
  options: {
    startingCapital: number;
    monthlySip: number;
    annualSipStepUpPct?: number;
    inflationRatePct?: number;
    horizonYears: number;
    targetGoal: number;
    pathsCount?: number;
  }
): MonteCarloSimulationResult {
  const safeCapital = Math.max(1000, options.startingCapital);
  const safeSip = Math.max(0, options.monthlySip);
  const stepUpPct = Math.max(0, Math.min(40, options.annualSipStepUpPct ?? 0));
  const inflationPct = Math.max(0, Math.min(15, options.inflationRatePct ?? 0));
  const horizonYears = Math.max(1, Math.min(25, Math.round(options.horizonYears)));
  const targetGoal = Math.max(safeCapital, options.targetGoal);
  const pathsCount = Math.max(100, Math.min(1000, options.pathsCount ?? 500));

  const symbols = funds.map((f) => f.symbol);
  const normWeights = normalizeAllocationWeights(symbols, rawWeights);
  const corr = computeCorrelationMatrix(funds);
  const blended = computeBlendedPortfolioMetrics(funds, normWeights, corr);

  const muAnnual = (blended.blendedReturn3YPct - blended.blendedExpenseRatioPct) / 100;
  const sigmaAnnual = Math.max(0.015, blended.blendedVolatilityPct / 100);
  const dt = 1 / 12;
  const driftMonthly = (muAnnual - 0.5 * sigmaAnnual * sigmaAnnual) * dt;
  const volMonthly = sigmaAnnual * Math.sqrt(dt);

  // Deterministic seed derived from basket & horizon so tests and renders are reproducible
  let seed = 1337 + horizonYears * 31 + Math.round(safeCapital / 1000);
  for (const s of symbols) {
    seed = (seed * 33 + s.charCodeAt(0) + Math.round((normWeights[s] ?? 0) * 10)) >>> 0;
  }
  const rand = mulberry32(seed);

  const yearlySamples: number[][] = Array.from({ length: horizonYears + 1 }, () => []);
  const investedByYear: number[] = Array(horizonYears + 1).fill(safeCapital);

  // Precompute cumulative invested per year
  let invAcc = safeCapital;
  let sipTracker = safeSip;
  investedByYear[0] = Math.round(safeCapital);
  for (let y = 1; y <= horizonYears; y++) {
    invAcc += sipTracker * 12;
    investedByYear[y] = Math.round(invAcc);
    sipTracker *= 1 + stepUpPct / 100;
  }

  let goalHits = 0;

  for (let p = 0; p < pathsCount; p++) {
    let bal = safeCapital;
    let curSip = safeSip;
    yearlySamples[0].push(bal);

    for (let y = 1; y <= horizonYears; y++) {
      for (let m = 0; m < 12; m++) {
        const z = gaussianRandom(rand);
        const monthlyFactor = Math.exp(driftMonthly + volMonthly * z);
        bal = Math.max(0, bal * monthlyFactor + curSip);
      }
      yearlySamples[y].push(bal);
      curSip *= 1 + stepUpPct / 100;
    }

    if (bal >= targetGoal) goalHits++;
  }

  const points: MonteCarloYearPoint[] = [];
  for (let y = 0; y <= horizonYears; y++) {
    const sorted = yearlySamples[y].sort((a, b) => a - b);
    points.push({
      year: y,
      yearLabel: y === 0 ? 'Now' : `Yr ${y}`,
      p10: Math.round(percentileSorted(sorted, 10)),
      p25: Math.round(percentileSorted(sorted, 25)),
      p50: Math.round(percentileSorted(sorted, 50)),
      p75: Math.round(percentileSorted(sorted, 75)),
      p90: Math.round(percentileSorted(sorted, 90)),
      invested: investedByYear[y],
    });
  }

  const last = points[points.length - 1];
  const deflator = Math.pow(1 + inflationPct / 100, horizonYears);
  const realMedianEnding = Math.round(last.p50 / deflator);

  return {
    pathsCount,
    horizonYears,
    targetGoal: Math.round(targetGoal),
    goalSuccessProbabilityPct: Number(((goalHits / pathsCount) * 100).toFixed(1)),
    p10Ending: last.p10,
    p25Ending: last.p25,
    medianEnding: last.p50,
    p75Ending: last.p75,
    p90Ending: last.p90,
    realMedianEnding,
    shortfallOrSurplus: Math.round(last.p50 - targetGoal),
    points,
  };
}

function classifyAssetClass(fund: ScreenerFundRecord): string {
  const txt = `${fund.about.assetClass} ${fund.category} ${fund.name}`.toLowerCase();
  if (/liquid|money market|overnight|cash/.test(txt)) return 'Cash / Liquid';
  if (/gold|silver|bullion|commodity|gld|slv/.test(txt)) return 'Gold / Commodities';
  if (/bond|gilt|debt|treasury|corporate|tlt|fixed income|income/.test(txt)) {
    return 'Fixed Income / Debt';
  }
  if (/hybrid|balanced|multi-asset|allocation/.test(txt)) return 'Hybrid / Multi-Asset';
  return 'Equity';
}

/**
 * Computes Look-Through Asset Class Exposure, Sector Breakdown, Underlying Holdings Overlap,
 * HHI / Effective N diversification metrics, and estimated passive dividend income.
 */
export function computePortfolioLookthrough(
  funds: ScreenerFundRecord[],
  rawWeights: Record<string, number>,
  portfolioCapital: number = 500_000
): PortfolioLookthroughExposure {
  if (funds.length === 0) {
    return {
      assetClasses: [],
      sectors: [],
      topUnderlyingHoldings: [],
      overlapHoldingsCount: 0,
      effectiveFundCount: 0,
      herfindahlIndex: 0,
      diversificationGrade: 'Concentrated',
      weightedDividendYieldPct: 0,
      estimatedAnnualIncome: 0,
    };
  }

  const symbols = funds.map((f) => f.symbol);
  const normWeights = normalizeAllocationWeights(symbols, rawWeights);

  const assetMap = new Map<string, number>();
  const sectorMap = new Map<string, number>();
  const holdingMap = new Map<
    string,
    { name: string; ticker: string; sector: string; effectiveWeightPct: number; funds: Set<string> }
  >();

  let hhi = 0;
  let weightedYield = 0;

  for (const fund of funds) {
    const wPct = normWeights[fund.symbol] ?? 0;
    const wDec = wPct / 100;
    hhi += wDec * wDec;
    weightedYield += wDec * Math.max(0, fund.keyStats.dividendYieldPct);

    const ac = classifyAssetClass(fund);
    assetMap.set(ac, (assetMap.get(ac) ?? 0) + wPct);

    const intel = getFundIntelligence(fund);
    for (const sec of intel.sectorHeatmap) {
      const contrib = (sec.weightPct * wPct) / 100;
      sectorMap.set(sec.sector, (sectorMap.get(sec.sector) ?? 0) + contrib);
    }

    for (const h of intel.topHoldings) {
      const key = (h.ticker || h.name).trim().toUpperCase();
      const contrib = (h.weightPct * wPct) / 100;
      const existing = holdingMap.get(key);
      if (existing) {
        existing.effectiveWeightPct += contrib;
        existing.funds.add(fund.symbol);
      } else {
        holdingMap.set(key, {
          name: h.name,
          ticker: h.ticker,
          sector: h.sector,
          effectiveWeightPct: contrib,
          funds: new Set([fund.symbol]),
        });
      }
    }
  }

  const assetClasses = Array.from(assetMap.entries())
    .map(([label, weightPct]) => ({
      label,
      weightPct: Number(weightPct.toFixed(1)),
      color: ASSET_CLASS_COLORS[label] ?? '#475569',
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const sectors = Array.from(sectorMap.entries())
    .map(([sector, weightPct]) => ({
      sector,
      weightPct: Number(weightPct.toFixed(1)),
    }))
    .sort((a, b) => b.weightPct - a.weightPct)
    .slice(0, 8);

  const allHoldings = Array.from(holdingMap.values())
    .map((h) => ({
      name: h.name,
      ticker: h.ticker,
      sector: h.sector,
      effectiveWeightPct: Number(h.effectiveWeightPct.toFixed(2)),
      fundCount: h.funds.size,
      funds: Array.from(h.funds),
    }))
    .sort((a, b) => b.effectiveWeightPct - a.effectiveWeightPct);

  const overlapHoldingsCount = allHoldings.filter((h) => h.fundCount >= 2).length;
  const effectiveFundCount = hhi > 0 ? Number((1 / hhi).toFixed(2)) : 0;
  const diversificationGrade: PortfolioLookthroughExposure['diversificationGrade'] =
    effectiveFundCount >= 3.2 && assetClasses.length >= 2
      ? 'Institutional Diversified'
      : effectiveFundCount >= 2.0
        ? 'Balanced'
        : 'Concentrated';

  return {
    assetClasses,
    sectors,
    topUnderlyingHoldings: allHoldings.slice(0, 10),
    overlapHoldingsCount,
    effectiveFundCount,
    herfindahlIndex: Number(hhi.toFixed(3)),
    diversificationGrade,
    weightedDividendYieldPct: Number(weightedYield.toFixed(2)),
    estimatedAnnualIncome: Math.round((portfolioCapital * weightedYield) / 100),
  };
}

interface StressShockTemplate {
  id: string;
  name: string;
  era: string;
  description: string;
  equityShockPct: number;
  techExtraPct: number;
  smallMidExtraPct: number;
  debtShockPct: number;
  goldShockPct: number;
  cashShockPct: number;
}

const STRESS_TEMPLATES: StressShockTemplate[] = [
  {
    id: 'gfc-2008',
    name: '2008 Global Financial Crisis',
    era: 'Sep 2008 – Mar 2009',
    description: 'Severe systemic credit freeze, deep equity drawdown, flight-to-safety into sovereign debt & bullion.',
    equityShockPct: -38,
    techExtraPct: -4,
    smallMidExtraPct: -11,
    debtShockPct: 9.5,
    goldShockPct: 14.0,
    cashShockPct: 2.5,
  },
  {
    id: 'covid-2020',
    name: '2020 Pandemic Liquidity Shock',
    era: 'Feb – Mar 2020',
    description: 'Rapid 5-week global equity selloff with simultaneous liquidity squeeze before central bank backstop.',
    equityShockPct: -29,
    techExtraPct: 4,
    smallMidExtraPct: -8,
    debtShockPct: 4.5,
    goldShockPct: 6.5,
    cashShockPct: 1.0,
  },
  {
    id: 'rates-2022',
    name: '2022 Rate Hike & Duration Shock',
    era: 'Jan – Oct 2022',
    description: 'Aggressive central bank tightening hitting long-duration bonds and high-multiple growth equities simultaneously.',
    equityShockPct: -16,
    techExtraPct: -14,
    smallMidExtraPct: -6,
    debtShockPct: -11.5,
    goldShockPct: 3.0,
    cashShockPct: 4.2,
  },
  {
    id: 'stagflation',
    name: 'Stagflation & Commodity Spike',
    era: '1970s / Macro Tail',
    description: 'Sticky inflation above 7% with slowing GDP growth; bullion surges while real bond and equity multiples compress.',
    equityShockPct: -18,
    techExtraPct: -7,
    smallMidExtraPct: -5,
    debtShockPct: -8.0,
    goldShockPct: 24.0,
    cashShockPct: 5.0,
  },
  {
    id: 'risk-on-rally',
    name: 'Global Disinflation & Risk-On Rally',
    era: 'Bull Cycle Stress',
    description: 'Soft-landing rate cuts driving broad equity expansion, strong small/mid-cap leadership, and modest duration gains.',
    equityShockPct: 26,
    techExtraPct: 8,
    smallMidExtraPct: 9,
    debtShockPct: 7.5,
    goldShockPct: 5.0,
    cashShockPct: 3.5,
  },
];

/**
 * Replays 5 macro/historical stress scenarios across the custom-weighted portfolio.
 */
export function runPortfolioStressScenarios(
  funds: ScreenerFundRecord[],
  rawWeights: Record<string, number>,
  startingCapital: number = 500_000
): PortfolioStressScenarioResult[] {
  if (funds.length === 0) return [];
  const symbols = funds.map((f) => f.symbol);
  const normWeights = normalizeAllocationWeights(symbols, rawWeights);

  return STRESS_TEMPLATES.map((tpl) => {
    let portfolioImpactPct = 0;
    let worst = { symbol: funds[0].symbol, impactPct: Infinity };
    let best = { symbol: funds[0].symbol, impactPct: -Infinity };

    for (const f of funds) {
      const w = (normWeights[f.symbol] ?? 0) / 100;
      const ac = classifyAssetClass(f);
      const text = `${f.name} ${f.category} ${f.subCategory}`.toLowerCase();
      let shock = tpl.equityShockPct;

      if (ac === 'Cash / Liquid') {
        shock = tpl.cashShockPct;
      } else if (ac === 'Gold / Commodities') {
        shock = tpl.goldShockPct;
      } else if (ac === 'Fixed Income / Debt') {
        shock = tpl.debtShockPct;
      } else {
        const betaScale = Math.max(0.65, Math.min(1.35, f.keyStats.beta3Y || 1));
        shock = tpl.equityShockPct * betaScale;
        if (/tech|nasdaq|qqq|growth|it/.test(text)) shock += tpl.techExtraPct;
        if (/small|mid|micro/.test(text)) shock += tpl.smallMidExtraPct;
        if (ac === 'Hybrid / Multi-Asset') shock = shock * 0.65 + tpl.debtShockPct * 0.35;
      }

      portfolioImpactPct += w * shock;
      if (shock < worst.impactPct) worst = { symbol: f.symbol, impactPct: Number(shock.toFixed(1)) };
      if (shock > best.impactPct) best = { symbol: f.symbol, impactPct: Number(shock.toFixed(1)) };
    }

    const roundedPct = Number(portfolioImpactPct.toFixed(2));
    const impactAmt = Math.round((startingCapital * roundedPct) / 100);
    const resilienceRating: PortfolioStressScenarioResult['resilienceRating'] =
      roundedPct >= 0
        ? 'Defensive'
        : roundedPct >= -12
          ? 'Resilient'
          : roundedPct >= -24
            ? 'Moderate'
            : 'High Drawdown';

    return {
      id: tpl.id,
      name: tpl.name,
      era: tpl.era,
      description: tpl.description,
      portfolioImpactPct: roundedPct,
      portfolioImpactAmount: impactAmt,
      postShockValue: Math.max(0, Math.round(startingCapital + impactAmt)),
      worstContributor: worst,
      bestContributor: best,
      resilienceRating,
    };
  });
}

/**
 * Systematic Withdrawal Plan (SWP) retirement cashflow sustainability simulator.
 */
export function simulatePortfolioSwp(options: {
  startingCorpus: number;
  initialMonthlyWithdrawal: number;
  annualInflationPct: number;
  expectedReturnPct: number;
  horizonYears: number;
}): SwpSimulationResult {
  const startingCorpus = Math.max(50_000, options.startingCorpus);
  const initialMonthlyWithdrawal = Math.max(500, options.initialMonthlyWithdrawal);
  const annualInflationPct = Math.max(0, Math.min(15, options.annualInflationPct));
  const expectedReturnPct = Math.max(1, Math.min(25, options.expectedReturnPct));
  const horizonYears = Math.max(5, Math.min(35, Math.round(options.horizonYears)));

  const rMonthly = Math.pow(1 + expectedReturnPct / 100, 1 / 12) - 1;
  const inflFactor = 1 + annualInflationPct / 100;

  let bal = startingCorpus;
  let curMonthlyW = initialMonthlyWithdrawal;
  let totalWithdrawn = 0;
  let yearsSustained = 0;
  let depleted = false;

  const points: SwpYearPoint[] = [
    {
      year: 0,
      yearLabel: 'Start',
      startingBalance: Math.round(startingCorpus),
      annualWithdrawal: 0,
      endingBalance: Math.round(startingCorpus),
      cumulativeWithdrawn: 0,
    },
  ];

  for (let y = 1; y <= horizonYears; y++) {
    const startBal = bal;
    let yearW = 0;
    let survivedFullYear = !depleted;

    for (let m = 0; m < 12; m++) {
      if (bal <= 0) {
        depleted = true;
        survivedFullYear = false;
        break;
      }
      bal = bal * (1 + rMonthly);
      const draw = Math.min(bal, curMonthlyW);
      bal = Math.max(0, bal - draw);
      yearW += draw;
      totalWithdrawn += draw;
      if (bal <= 0) {
        depleted = true;
        survivedFullYear = false;
      }
    }

    if (survivedFullYear) yearsSustained = y;

    points.push({
      year: y,
      yearLabel: `Yr ${y}`,
      startingBalance: Math.round(startBal),
      annualWithdrawal: Math.round(yearW),
      endingBalance: Math.round(bal),
      cumulativeWithdrawn: Math.round(totalWithdrawn),
    });

    curMonthlyW *= inflFactor;
  }

  const initialWithdrawalRatePct = Number(
    (((initialMonthlyWithdrawal * 12) / startingCorpus) * 100).toFixed(2)
  );
  const sustainabilityStatus: SwpSimulationResult['sustainabilityStatus'] = depleted
    ? 'Depletes Early'
    : bal >= startingCorpus
      ? 'Perpetual / Growing'
      : 'Sustainable';

  return {
    startingCorpus: Math.round(startingCorpus),
    initialMonthlyWithdrawal: Math.round(initialMonthlyWithdrawal),
    annualInflationPct,
    expectedReturnPct,
    horizonYears,
    survivedAllYears: !depleted,
    yearsSustained: depleted ? yearsSustained : horizonYears,
    totalWithdrawn: Math.round(totalWithdrawn),
    terminalCorpus: Math.round(bal),
    initialWithdrawalRatePct,
    sustainabilityStatus,
    points,
  };
}

/**
 * Computes a tax-efficient "Zero-Sell" Fresh Cash Inflow Rebalance Plan:
 * deploys 100% of new cash strictly into underweight assets to minimize drift without selling anything.
 */
export function computeFreshCashRebalancePlan(options: {
  funds: ScreenerFundRecord[];
  currentValues: Record<string, number>;
  targetWeights: Record<string, number>;
  freshCashAmount: number;
}): FreshCashRebalancePlan {
  const { funds, currentValues, targetWeights } = options;
  const freshCash = Math.max(0, options.freshCashAmount);
  const symbols = funds.map((f) => f.symbol);
  const normTargets = normalizeAllocationWeights(symbols, targetWeights);

  const curTotal = funds.reduce((s, f) => s + Math.max(0, currentValues[f.symbol] ?? 0), 0);
  const postTotal = curTotal + freshCash;

  // Desired post-deposit dollar deficit for underweight positions
  const deficits = funds.map((f) => {
    const cur = Math.max(0, currentValues[f.symbol] ?? 0);
    const desired = (postTotal * (normTargets[f.symbol] ?? 0)) / 100;
    return Math.max(0, desired - cur);
  });
  const totalDeficit = deficits.reduce((s, d) => s + d, 0);

  let preMaxDrift = 0;
  let postMaxDrift = 0;

  const rows: FreshCashRebalanceRow[] = funds.map((f, idx) => {
    const cur = Math.max(0, currentValues[f.symbol] ?? 0);
    const curW = curTotal > 0 ? (cur / curTotal) * 100 : 0;
    const tgtW = normTargets[f.symbol] ?? 0;
    preMaxDrift = Math.max(preMaxDrift, Math.abs(curW - tgtW));

    const alloc =
      freshCash <= 0
        ? 0
        : totalDeficit > 1e-6
          ? (deficits[idx] / totalDeficit) * freshCash
          : (tgtW / 100) * freshCash;
    const postVal = cur + alloc;
    const postW = postTotal > 0 ? (postVal / postTotal) * 100 : tgtW;
    const remDrift = postW - tgtW;
    postMaxDrift = Math.max(postMaxDrift, Math.abs(remDrift));

    return {
      symbol: f.symbol,
      name: f.name,
      currentValue: Number(cur.toFixed(2)),
      currentWeightPct: Number(curW.toFixed(2)),
      targetWeightPct: Number(tgtW.toFixed(2)),
      freshCashAllocation: Number(alloc.toFixed(2)),
      postDepositValue: Number(postVal.toFixed(2)),
      postDepositWeightPct: Number(postW.toFixed(2)),
      remainingDriftPct: Number(remDrift.toFixed(2)),
      estimatedUnits: f.price > 0 ? Number((alloc / f.price).toFixed(2)) : 0,
      unitPrice: f.price,
      currency: f.currency,
    };
  });

  return {
    freshCashAmount: Math.round(freshCash),
    currentTotalValue: Number(curTotal.toFixed(2)),
    postDepositTotalValue: Number(postTotal.toFixed(2)),
    preMaxDriftPct: Number(preMaxDrift.toFixed(2)),
    postMaxDriftPct: Number(postMaxDrift.toFixed(2)),
    driftReductionPct: Number(Math.max(0, preMaxDrift - postMaxDrift).toFixed(2)),
    rows,
  };
}

/**
 * Estimates capital gains tax & exit-load friction of a standard Sell-and-Buy rebalance
 * versus Zero-Sell Fresh Cash rebalancing.
 */
export function computeTaxAwareRebalanceSummary(
  rebalancePlan: PortfolioRebalancePlan,
  holdingPeriod: 'ltcg' | 'stcg',
  assumedGainRatioPct: number = 28
): TaxAwareRebalanceSummary {
  const totalSell = rebalancePlan.totalSellAmount;
  const gainRatio = Math.max(5, Math.min(80, assumedGainRatioPct)) / 100;
  const realizedGain = totalSell * gainRatio;
  const isInr = rebalancePlan.rows.some((r) => r.currency === 'INR');

  let taxRate = holdingPeriod === 'ltcg' ? 12.5 : 20.0;
  let exemption = 0;
  if (holdingPeriod === 'ltcg' && isInr) {
    exemption = Math.min(realizedGain, 125_000);
  } else if (holdingPeriod === 'ltcg' && !isInr) {
    taxRate = 15.0;
  }

  const taxable = Math.max(0, realizedGain - exemption);
  const tax = (taxable * taxRate) / 100;
  const exitLoad = holdingPeriod === 'stcg' ? totalSell * 0.005 : 0;
  const totalFriction = tax + exitLoad;

  return {
    holdingPeriod,
    assumedGainRatioPct,
    totalSellAmount: Math.round(totalSell),
    estimatedRealizedGain: Math.round(realizedGain),
    exemptionApplied: Math.round(exemption),
    estimatedCapitalGainsTax: Math.round(tax),
    estimatedExitLoad: Math.round(exitLoad),
    totalFrictionCost: Math.round(totalFriction),
    freshCashTaxSaved: Math.round(totalFriction),
  };
}
