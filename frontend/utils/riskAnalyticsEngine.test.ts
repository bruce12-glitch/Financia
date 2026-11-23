import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_FUNDS } from './screenerEngine';
import { buildMultiFundComparison } from './fundIntelligenceEngine';
import {
  buildCompoundingCurveSeries,
  buildComparisonCsv,
  buildRiskReturnFrontierData,
  buildStressTestScenarios,
  computeBlendedPortfolioMetrics,
  computeCorrelationMatrix,
  computeInstrumentRiskProfile,
  computeMinVarWeights,
  sortScreenerFundsWithRisk,
} from './riskAnalyticsEngine';

test('computeInstrumentRiskProfile produces mathematically valid VaR, CVaR, Max DD & Calmar for all 20 instruments', () => {
  assert.equal(SCREENER_FUNDS.length, 20);
  for (const fund of SCREENER_FUNDS) {
    const risk = computeInstrumentRiskProfile(fund);
    assert.equal(risk.symbol, fund.symbol);
    assert.ok(risk.var95MonthlyPct < 0, `${fund.symbol} 1M 95% VaR must be negative`);
    assert.ok(
      risk.var99MonthlyPct < risk.var95MonthlyPct,
      `${fund.symbol} 99% VaR (${risk.var99MonthlyPct}) must be deeper than 95% VaR (${risk.var95MonthlyPct})`
    );
    assert.ok(
      risk.cvar95MonthlyPct < risk.var95MonthlyPct,
      `${fund.symbol} 95% CVaR (${risk.cvar95MonthlyPct}) must be deeper than 95% VaR (${risk.var95MonthlyPct})`
    );
    assert.ok(risk.maxDrawdown3YPct <= 0, `${fund.symbol} Max Drawdown must be <= 0`);
    assert.ok(Number.isFinite(risk.calmarRatio), `${fund.symbol} Calmar must be finite`);
    assert.ok(risk.worstMonthLossOn100k > 0, `${fund.symbol} worstMonthLossOn100k must be positive`);
  }

  // Low-risk liquid fund must have dramatically lower VaR & Max DD than high-beta small cap or silver
  const liquid = computeInstrumentRiskProfile(SCREENER_FUNDS.find((f) => f.symbol === 'LIQUIDBEES')!);
  const smallCap = computeInstrumentRiskProfile(SCREENER_FUNDS.find((f) => f.symbol === 'QUANTSC')!);
  assert.ok(Math.abs(liquid.var95MonthlyPct) < Math.abs(smallCap.var95MonthlyPct));
  assert.ok(Math.abs(liquid.maxDrawdown3YPct) < Math.abs(smallCap.maxDrawdown3YPct));
  assert.equal(liquid.riskTier, 'Low Tail Risk');
});

test('sortScreenerFundsWithRisk accurately sorts by var95 and maxDrawdown in both asc and desc directions', () => {
  const varAsc = sortScreenerFundsWithRisk(SCREENER_FUNDS, 'var95', 'asc');
  const varDesc = sortScreenerFundsWithRisk(SCREENER_FUNDS, 'var95', 'desc');
  assert.equal(varAsc.length, SCREENER_FUNDS.length);

  // Asc: safest (smallest |VaR|) first
  for (let i = 1; i < varAsc.length; i++) {
    const prev = Math.abs(computeInstrumentRiskProfile(varAsc[i - 1]).var95MonthlyPct);
    const curr = Math.abs(computeInstrumentRiskProfile(varAsc[i]).var95MonthlyPct);
    assert.ok(prev <= curr, `var95 asc violated at ${i}: ${prev} > ${curr}`);
  }
  // Desc: riskiest (largest |VaR|) first
  for (let i = 1; i < varDesc.length; i++) {
    const prev = Math.abs(computeInstrumentRiskProfile(varDesc[i - 1]).var95MonthlyPct);
    const curr = Math.abs(computeInstrumentRiskProfile(varDesc[i]).var95MonthlyPct);
    assert.ok(prev >= curr, `var95 desc violated at ${i}: ${prev} < ${curr}`);
  }
  assert.equal(varAsc[0].symbol, 'LIQUIDBEES');

  const ddAsc = sortScreenerFundsWithRisk(SCREENER_FUNDS, 'maxDrawdown', 'asc');
  const ddDesc = sortScreenerFundsWithRisk(SCREENER_FUNDS, 'maxDrawdown', 'desc');
  for (let i = 1; i < ddAsc.length; i++) {
    const prev = Math.abs(ddAsc[i - 1].keyStats.maxDrawdown3YPct);
    const curr = Math.abs(ddAsc[i].keyStats.maxDrawdown3YPct);
    assert.ok(prev <= curr, `maxDrawdown asc violated at ${i}`);
  }
  assert.equal(ddAsc[0].symbol, 'LIQUIDBEES');
  assert.ok(Math.abs(ddDesc[0].keyStats.maxDrawdown3YPct) >= Math.abs(ddDesc[ddDesc.length - 1].keyStats.maxDrawdown3YPct));
});

test('computeCorrelationMatrix returns symmetric bounded Pearson r matrix with unit diagonal', () => {
  const basket = SCREENER_FUNDS.filter((f) => ['QQQ', 'GOLDBEES', 'HDFCCORP', 'QUANTSC'].includes(f.symbol));
  const res = computeCorrelationMatrix(basket);
  assert.equal(res.symbols.length, 4);
  for (let i = 0; i < 4; i++) {
    assert.equal(res.matrix[i][i], 1);
    for (let j = 0; j < 4; j++) {
      assert.equal(res.matrix[i][j], res.matrix[j][i]);
      assert.ok(res.matrix[i][j] >= -1 && res.matrix[i][j] <= 1);
    }
  }
  assert.ok(res.diversificationScore >= 5 && res.diversificationScore <= 100);
});

test('computeBlendedPortfolioMetrics reflects diversification benefit and Min-VaR weights sum to 100', () => {
  const basket = SCREENER_FUNDS.filter((f) => ['QQQ', 'GOLDBEES', 'HDFCCORP'].includes(f.symbol));
  const minVarWeights = computeMinVarWeights(basket);
  const weightSum = Object.values(minVarWeights).reduce((s, v) => s + v, 0);
  assert.equal(weightSum, 100);
  // Low-VaR corporate debt fund gets higher allocation than QQQ under Min-VaR Risk Parity
  assert.ok(minVarWeights['HDFCCORP'] > minVarWeights['QQQ']);

  const blended = computeBlendedPortfolioMetrics(basket, { QQQ: 40, GOLDBEES: 30, HDFCCORP: 30 });
  assert.ok(blended.blendedVolatilityPct <= blended.weightedAvgVolatilityPct + 0.01);
  assert.ok(blended.blendedVar95MonthlyPct < 0);
  assert.ok(blended.blendedTenYearWealthOn100k > 100_000);

  // Correlation-aware Min-VaR must outperform Equal Weight even with 0.98-correlated GOLDBEES + GLD
  const corrBasket = SCREENER_FUNDS.filter((f) => ['GOLDBEES', 'GLD', 'NIFTYBEES'].includes(f.symbol));
  const eqMetrics = computeBlendedPortfolioMetrics(corrBasket, { GOLDBEES: 34, GLD: 33, NIFTYBEES: 33 });
  const optWeights = computeMinVarWeights(corrBasket);
  const optMetrics = computeBlendedPortfolioMetrics(corrBasket, optWeights);
  assert.equal(Object.values(optWeights).reduce((s, v) => s + v, 0), 100);
  assert.ok(
    Math.abs(optMetrics.blendedVar95MonthlyPct) <= Math.abs(eqMetrics.blendedVar95MonthlyPct) + 0.02,
    `Expected Min-VaR (${optMetrics.blendedVar95MonthlyPct}%) to improve on Equal Weight (${eqMetrics.blendedVar95MonthlyPct}%)`
  );
});

test('buildRiskReturnFrontierData, buildCompoundingCurveSeries, buildStressTestScenarios & buildComparisonCsv work cleanly', () => {
  const basket = SCREENER_FUNDS.filter((f) => ['BANKBEES', 'HDFCMID', 'SBIGILT'].includes(f.symbol));
  const frontierOnly = buildRiskReturnFrontierData(basket, SCREENER_FUNDS, false);
  const frontierAll = buildRiskReturnFrontierData(basket, SCREENER_FUNDS, true);
  assert.equal(frontierOnly.length, 3);
  assert.equal(frontierAll.length, 20);
  assert.equal(frontierAll.filter((p) => p.isSelected).length, 3);

  const curve = buildCompoundingCurveSeries(basket, 5, 500_000);
  assert.equal(curve.length, 6);
  assert.equal(curve[0]['BANKBEES'], 500_000);
  assert.ok(Number(curve[5]['BANKBEES']) > 500_000);

  for (const fund of basket) {
    const scenarios = buildStressTestScenarios(fund);
    assert.equal(scenarios.length, 4);
  }

  const comparison = buildMultiFundComparison(basket, 'balanced');
  const riskBySymbol = Object.fromEntries(basket.map((f) => [f.symbol, computeInstrumentRiskProfile(f)]));
  const csv = buildComparisonCsv(comparison, riskBySymbol);
  assert.ok(csv.includes('1M VaR 95% (%)'));
  assert.ok(csv.includes('BANKBEES'));
  assert.ok(csv.includes('SBIGILT'));
});
