import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_FUNDS } from './screenerEngine';
import {
  buildMultiFundComparison,
  buildTerminalQuoteFromScreenerFund,
  computeFundValidationScore,
  computeTenYearFeeDrag,
  computeTenYearNetWealth,
  evaluateRiskAdjustedRatios,
  getFundIntelligence,
  selectPeerComparisonSymbols,
} from './fundIntelligenceEngine';

test('every ETF and Mutual Fund in SCREENER_FUNDS (all 20) has full manager, ratios, sector heatmap, monthly heatmap, and bull/bear cases', () => {
  assert.equal(SCREENER_FUNDS.length, 20);
  for (const fund of SCREENER_FUNDS) {
    const intel = getFundIntelligence(fund);
    assert.equal(intel.symbol, fund.symbol);
    assert.ok(intel.manager.leadManager.length > 2, `${fund.symbol} missing leadManager`);
    assert.ok(intel.manager.tenureYears > 0, `${fund.symbol} missing tenure`);
    assert.ok(Number.isFinite(intel.ratios.sortino3Y), `${fund.symbol} missing sortino3Y`);
    assert.ok(Number.isFinite(intel.ratios.alpha3Y), `${fund.symbol} missing alpha3Y`);
    assert.ok(Number.isFinite(intel.ratios.roaePct), `${fund.symbol} missing roaePct`);
    assert.ok(Number.isFinite(intel.returnOnAverage.avgAnnualReturn3Y), `${fund.symbol} missing avgAnnualReturn3Y`);
    assert.ok(intel.sectorHeatmap.length >= 2, `${fund.symbol} missing sectorHeatmap`);
    const totalWeight = intel.sectorHeatmap.reduce((s, r) => s + r.weightPct, 0);
    assert.ok(totalWeight >= 99 && totalWeight <= 101, `${fund.symbol} sector weights should sum to ~100%, got ${totalWeight}`);
    assert.ok(intel.monthlyHeatmap.length >= 2, `${fund.symbol} missing monthlyHeatmap`);
    assert.equal(intel.bullCase.points.length, 3, `${fund.symbol} bullCase should have 3 drivers`);
    assert.equal(intel.bearCase.points.length, 3, `${fund.symbol} bearCase should have 3 risks`);
    assert.ok(intel.topHoldings.length >= 2, `${fund.symbol} missing topHoldings`);
  }
});

test('computeTenYearFeeDrag and computeTenYearNetWealth calculate realistic compounded returns and drag', () => {
  const dragLow = computeTenYearFeeDrag(0.04, 100_000, 0.12);
  const dragHigh = computeTenYearFeeDrag(1.0, 100_000, 0.12);
  assert.ok(dragLow > 0 && dragLow < 2000);
  assert.ok(dragHigh > 20_000 && dragHigh < 32_000);
  assert.ok(dragHigh > dragLow * 10);
  assert.equal(computeTenYearFeeDrag(0, 100_000, 0.12), 0);

  const netHighReturn = computeTenYearNetWealth(18, 0.6, 100_000);
  const netLowReturn = computeTenYearNetWealth(7, 0.5, 100_000);
  assert.ok(netHighReturn > netLowReturn * 2);
});

test('computeFundValidationScore returns bounded 0..100 score and coherent grade', () => {
  const ppfas = SCREENER_FUNDS.find((f) => f.symbol === 'PPFAS')!;
  const tlt = SCREENER_FUNDS.find((f) => f.symbol === 'TLT')!;
  const ppfasScore = computeFundValidationScore(ppfas, getFundIntelligence(ppfas));
  const tltScore = computeFundValidationScore(tlt, getFundIntelligence(tlt));

  assert.ok(ppfasScore.overall >= 0 && ppfasScore.overall <= 100);
  assert.ok(tltScore.overall >= 0 && tltScore.overall <= 100);
  assert.ok(ppfasScore.overall > tltScore.overall, 'High-Sharpe PPFAS should outscore high-drawdown TLT');
  assert.ok(['Institutional Core', 'Strong', 'Balanced', 'Watchlist'].includes(ppfasScore.grade));
});

test('buildMultiFundComparison ranks Best vs Worst accurately and adapts across priority modes', () => {
  const quant = SCREENER_FUNDS.find((f) => f.symbol === 'QUANTSC')!;
  const nifty = SCREENER_FUNDS.find((f) => f.symbol === 'NIFTYBEES')!;
  const tlt = SCREENER_FUNDS.find((f) => f.symbol === 'TLT')!;

  const balanced = buildMultiFundComparison([quant, nifty, tlt], 'balanced');
  assert.equal(balanced.items.length, 3);
  assert.equal(balanced.winners.lowestExpense, 'NIFTYBEES');
  assert.equal(balanced.losers.highestExpense, 'QUANTSC');
  assert.equal(balanced.rankings.length, 3);
  assert.ok(balanced.bestPick && balanced.worstPick);
  assert.notEqual(balanced.bestPick!.symbol, balanced.worstPick!.symbol);
  assert.ok(balanced.spreadSummary.return3YSpreadPct > 0);
  assert.ok(balanced.spreadSummary.tenYearWealthGapOn100k > 0);

  const lowestCost = buildMultiFundComparison([quant, nifty, tlt], 'lowest_cost');
  assert.equal(lowestCost.bestPick?.symbol, 'NIFTYBEES');

  const maxReturn = buildMultiFundComparison([quant, nifty, tlt], 'max_return');
  assert.equal(maxReturn.bestPick?.symbol, 'QUANTSC');
  assert.equal(maxReturn.worstPick?.symbol, 'TLT');
});

test('selectPeerComparisonSymbols and buildTerminalQuoteFromScreenerFund work across all 20 instruments', () => {
  for (const fund of SCREENER_FUNDS) {
    const peers = selectPeerComparisonSymbols(fund.symbol, SCREENER_FUNDS, 2);
    assert.equal(peers.length, 2, `${fund.symbol} should resolve 2 peers`);
    assert.ok(!peers.includes(fund.symbol), `${fund.symbol} peers must not duplicate primary`);

    const quote = buildTerminalQuoteFromScreenerFund(fund);
    assert.equal(quote.ticker, fund.symbol);
    assert.equal(quote.price, fund.price);
    assert.ok(quote.report.financial_charts.stock_price_4m.length >= 6);
    assert.ok(quote.report.bull_case.length === 3);
    assert.ok(quote.report.bear_case.length === 3);
  }
});

test('evaluateRiskAdjustedRatios produces finite Sharpe, Sortino, and Treynor grades for every fund and ETF', () => {
  for (const fund of SCREENER_FUNDS) {
    const summary = evaluateRiskAdjustedRatios(fund, getFundIntelligence(fund));
    assert.ok(Number.isFinite(summary.sharpe.value), `${fund.symbol} sharpe must be finite`);
    assert.ok(Number.isFinite(summary.sortino.value), `${fund.symbol} sortino must be finite`);
    assert.ok(Number.isFinite(summary.treynor.value), `${fund.symbol} treynor must be finite`);
    assert.ok(['Institutional', 'Strong', 'Moderate', 'Cautious'].includes(summary.sharpe.grade));
    assert.ok(['Institutional', 'Strong', 'Moderate', 'Cautious'].includes(summary.sortino.grade));
    assert.ok(['Institutional', 'Strong', 'Moderate', 'Cautious'].includes(summary.treynor.grade));
  }
});
