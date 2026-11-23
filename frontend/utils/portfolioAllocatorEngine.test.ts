import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_FUNDS } from './screenerEngine';
import {
  buildAllocationProjectionCsv,
  buildBulkDataCsv,
  buildBulkInstrumentRows,
  buildHistoricalPortfolioReplay,
  buildProjectedPortfolioPerformance,
  computeAggregatedBasketSummary,
  computeMaxSharpeWeights,
  normalizeAllocationWeights,
  sortBulkInstrumentRows,
} from './portfolioAllocatorEngine';

test('normalizeAllocationWeights sums strictly to 100% and handles zero/unbalanced inputs', () => {
  const norm = normalizeAllocationWeights(['QQQ', 'GOLDBEES', 'HDFCCORP'], {
    QQQ: 50,
    GOLDBEES: 50,
    HDFCCORP: 100,
  });
  const total = Object.values(norm).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(total - 100) < 0.05);
  assert.equal(norm['HDFCCORP'], 50);
  assert.equal(norm['QQQ'], 25);

  const zeroFallback = normalizeAllocationWeights(['QQQ', 'GOLDBEES'], { QQQ: 0, GOLDBEES: 0 });
  assert.equal(zeroFallback['QQQ'], 50);
  assert.equal(zeroFallback['GOLDBEES'], 50);
});

test('computeMaxSharpeWeights returns valid integer weights summing to 100%', () => {
  const basket = SCREENER_FUNDS.filter((f) => ['QQQ', 'GOLDBEES', 'PPFAS', 'HDFCCORP'].includes(f.symbol));
  const weights = computeMaxSharpeWeights(basket);
  const sum = Object.values(weights).reduce((s, v) => s + v, 0);
  assert.equal(sum, 100);
  for (const f of basket) {
    assert.ok(weights[f.symbol] >= 5 && weights[f.symbol] <= 95);
  }
});

test('buildHistoricalPortfolioReplay replays actual monthly returns chronologically with valid max drawdown', () => {
  const basket = SCREENER_FUNDS.filter((f) => ['GOLDBEES', 'PPFAS', 'NIFTYBEES'].includes(f.symbol));
  const replay = buildHistoricalPortfolioReplay(
    basket,
    { GOLDBEES: 40, PPFAS: 35, NIFTYBEES: 25 },
    500_000
  );
  assert.ok(replay.monthsCount >= 12, `Expected >= 12 historical months, got ${replay.monthsCount}`);
  assert.equal(replay.points[0].portfolioIndex, 100);
  assert.equal(replay.points[0].portfolioValue, 500_000);
  assert.ok(replay.realizedMaxDrawdownPct <= 0);
  assert.ok(replay.endingValue > 0);
});

test('buildProjectedPortfolioPerformance respects Bull >= Base >= Bear ordering and SIP contributions', () => {
  const basket = SCREENER_FUNDS.filter((f) => ['QUANTSC', 'GOLDBEES', 'SBIGILT'].includes(f.symbol));
  const proj = buildProjectedPortfolioPerformance(
    basket,
    { QUANTSC: 45, GOLDBEES: 30, SBIGILT: 25 },
    { startingCapital: 500_000, monthlySip: 10_000, horizonYears: 10 }
  );
  assert.equal(proj.points.length, 11);
  assert.equal(proj.totalInvestedEnd, 500_000 + 10_000 * 12 * 10);
  assert.ok(proj.bullEndingValue >= proj.baseEndingValue);
  assert.ok(proj.baseEndingValue >= proj.bearEndingValue);
  assert.ok(proj.baseEndingValue > proj.totalInvestedEnd);
  assert.ok(proj.portfolioVar95MonthlyPct < 0);

  const csv = buildAllocationProjectionCsv(
    basket,
    normalizeAllocationWeights(basket.map((f) => f.symbol), { QUANTSC: 45, GOLDBEES: 30, SBIGILT: 25 }),
    proj
  );
  assert.ok(csv.includes('Allocation,QUANTSC'));
  assert.ok(csv.includes('Projection,Yr 10'));
});

test('computeAggregatedBasketSummary and buildBulkInstrumentRows aggregate and sort all 20 instruments accurately', () => {
  const summary = computeAggregatedBasketSummary(SCREENER_FUNDS);
  assert.equal(summary.count, 20);
  assert.equal(summary.etfCount + summary.mfCount, 20);
  assert.ok(summary.combinedAumUsdB > 0);
  assert.ok(summary.avgVar95MonthlyPct < 0);
  assert.ok(summary.avgMaxDrawdown3YPct < 0);

  const rows = buildBulkInstrumentRows(SCREENER_FUNDS);
  assert.equal(rows.length, 20);
  const sortedBySharpe = sortBulkInstrumentRows(rows, 'sharpe3Y', 'desc');
  assert.ok(sortedBySharpe[0].sharpe3Y >= sortedBySharpe[19].sharpe3Y);
  const sortedByVarAsc = sortBulkInstrumentRows(rows, 'var95MonthlyPct', 'asc');
  assert.equal(sortedByVarAsc[0].symbol, 'LIQUIDBEES');

  const csv = buildBulkDataCsv(rows);
  assert.ok(csv.includes('1M VaR 95% %'));
  assert.ok(csv.includes('LIQUIDBEES'));
  assert.ok(csv.includes('QQQ'));
});

test('weight locking, risk parity, and low-cost optimizers preserve locks and sum strictly to 100%', async () => {
  const {
    computeRiskParityWeights,
    computeLowCostIncomeWeights,
    redistributeWeightsWithLocks,
  } = await import('./portfolioAllocatorEngine');

  const basket = SCREENER_FUNDS.filter((f) =>
    ['PPFAS', 'NIFTYBEES', 'GOLDBEES', 'HDFCCORP'].includes(f.symbol)
  );
  const locked = redistributeWeightsWithLocks(
    ['PPFAS', 'NIFTYBEES', 'GOLDBEES', 'HDFCCORP'],
    { PPFAS: 40, NIFTYBEES: 20, GOLDBEES: 20, HDFCCORP: 20 },
    ['PPFAS']
  );
  assert.equal(locked['PPFAS'], 40);
  const lockSum = Object.values(locked).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(lockSum - 100) < 0.15);

  const rp = computeRiskParityWeights(basket, { PPFAS: 30 }, ['PPFAS']);
  assert.equal(rp['PPFAS'], 30);
  assert.ok(rp['HDFCCORP'] > rp['NIFTYBEES'], 'Lower-volatility debt should receive higher risk-parity weight than equity');

  const lowCost = computeLowCostIncomeWeights(basket);
  const lcSum = Object.values(lowCost).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(lcSum - 100) < 0.15);
});

test('Step-Up SIP and inflation adjustment compute realistic real vs nominal projections', () => {
  const basket = SCREENER_FUNDS.filter((f) => ['PPFAS', 'GOLDBEES'].includes(f.symbol));
  const flat = buildProjectedPortfolioPerformance(
    basket,
    { PPFAS: 60, GOLDBEES: 40 },
    { startingCapital: 500_000, monthlySip: 10_000, horizonYears: 10, annualSipStepUpPct: 0, inflationRatePct: 6 }
  );
  const stepped = buildProjectedPortfolioPerformance(
    basket,
    { PPFAS: 60, GOLDBEES: 40 },
    { startingCapital: 500_000, monthlySip: 10_000, horizonYears: 10, annualSipStepUpPct: 10, inflationRatePct: 6 }
  );
  assert.ok(stepped.totalInvestedEnd > flat.totalInvestedEnd);
  assert.ok(stepped.baseEndingValue > flat.baseEndingValue);
  assert.ok(stepped.realBaseEndingValue < stepped.baseEndingValue);
});

test('allocatorLabsEngine: Monte Carlo, Look-Through Overlap, Stress Scenarios, SWP, and Fresh-Cash Rebalance', async () => {
  const {
    runPortfolioMonteCarlo,
    computePortfolioLookthrough,
    runPortfolioStressScenarios,
    simulatePortfolioSwp,
    computeFreshCashRebalancePlan,
    computeTaxAwareRebalanceSummary,
  } = await import('./allocatorLabsEngine');
  const { computePortfolioRebalancePlan } = await import('./rebalanceEngine');

  const basket = SCREENER_FUNDS.filter((f) =>
    ['PPFAS', 'NIFTYBEES', 'GOLDBEES', 'HDFCCORP'].includes(f.symbol)
  );
  const weights = { PPFAS: 40, NIFTYBEES: 30, GOLDBEES: 20, HDFCCORP: 10 };

  const mc = runPortfolioMonteCarlo(basket, weights, {
    startingCapital: 500_000,
    monthlySip: 15_000,
    annualSipStepUpPct: 10,
    inflationRatePct: 6,
    horizonYears: 10,
    targetGoal: 4_000_000,
    pathsCount: 400,
  });
  assert.equal(mc.points.length, 11);
  assert.ok(mc.p90Ending >= mc.p75Ending && mc.p75Ending >= mc.medianEnding && mc.medianEnding >= mc.p10Ending);
  assert.ok(mc.goalSuccessProbabilityPct >= 0 && mc.goalSuccessProbabilityPct <= 100);

  const lookthrough = computePortfolioLookthrough(basket, weights, 500_000);
  assert.ok(lookthrough.assetClasses.length >= 2);
  assert.ok(lookthrough.sectors.length >= 3);
  assert.ok(lookthrough.topUnderlyingHoldings.length >= 5);
  assert.ok(lookthrough.effectiveFundCount > 2.5);

  const stress = runPortfolioStressScenarios(basket, weights, 500_000);
  assert.equal(stress.length, 5);
  assert.ok(stress[0].portfolioImpactPct < 0, '2008 GFC should be negative for equity-heavy portfolio');
  assert.ok(stress[4].portfolioImpactPct > 0, 'Risk-on rally should be positive');

  const swp = simulatePortfolioSwp({
    startingCorpus: 10_000_000,
    initialMonthlyWithdrawal: 45_000,
    annualInflationPct: 5,
    expectedReturnPct: 11,
    horizonYears: 20,
  });
  assert.equal(swp.points.length, 21);
  assert.equal(swp.survivedAllYears, true);
  assert.ok(swp.totalWithdrawn > 10_000_000);

  const driftedCurrent = { PPFAS: 260_000, NIFTYBEES: 140_000, GOLDBEES: 70_000, HDFCCORP: 30_000 };
  const freshPlan = computeFreshCashRebalancePlan({
    funds: basket,
    currentValues: driftedCurrent,
    targetWeights: weights,
    freshCashAmount: 100_000,
  });
  assert.ok(freshPlan.postMaxDriftPct < freshPlan.preMaxDriftPct);
  assert.equal(freshPlan.rows.find((r) => r.symbol === 'PPFAS')!.freshCashAllocation, 0);

  const stdPlan = computePortfolioRebalancePlan({
    funds: basket,
    currentValues: driftedCurrent,
    targetWeights: weights,
  });
  const taxInfo = computeTaxAwareRebalanceSummary(stdPlan, 'stcg', 30);
  assert.ok(taxInfo.totalFrictionCost > 0);
  assert.equal(taxInfo.freshCashTaxSaved, taxInfo.totalFrictionCost);
});

