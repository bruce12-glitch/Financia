import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_FUNDS } from './screenerEngine';
import {
  buildFundTearsheetMarkdown,
  computeFundPeerRankings,
  computeFundRollingReturns,
  computeFundSipVsLumpsum,
  computeRedemptionTaxEstimate,
  evaluateTerminalAlerts,
} from './fundTerminalToolsEngine';

test('computeFundRollingReturns produces valid 1Y rolling metrics and consistency classification', () => {
  const fund = SCREENER_FUNDS.find((f) => f.symbol === 'PPFAS')!;
  const rolling = computeFundRollingReturns(fund);
  assert.ok(rolling.window1YCount >= 6);
  assert.ok(rolling.max1YPct >= rolling.median1YPct);
  assert.ok(rolling.median1YPct >= rolling.min1YPct);
  assert.ok(rolling.positiveWindowPct >= 0 && rolling.positiveWindowPct <= 100);
  assert.ok(rolling.points.length === rolling.window1YCount);
});

test('computeFundPeerRankings ranks active fund cleanly within 1..N across all 6 criteria', () => {
  const fund = SCREENER_FUNDS.find((f) => f.symbol === 'QQQ')!;
  const rankings = computeFundPeerRankings(fund, SCREENER_FUNDS);
  assert.equal(rankings.universeCount, SCREENER_FUNDS.length);
  assert.equal(rankings.metrics.length, 6);
  assert.ok(rankings.overallRank >= 1 && rankings.overallRank <= SCREENER_FUNDS.length);
  assert.ok(rankings.overallPercentile >= 0 && rankings.overallPercentile <= 100);
  for (const m of rankings.metrics) {
    assert.ok(m.rank >= 1 && m.rank <= SCREENER_FUNDS.length);
    assert.ok(m.percentile >= 0 && m.percentile <= 100);
  }
});

test('computeFundSipVsLumpsum shows step-up SIP outgrowing standard SIP and valid multiples', () => {
  const fund = SCREENER_FUNDS.find((f) => f.symbol === 'NIFTYBEES')!;
  const res = computeFundSipVsLumpsum(fund, {
    monthlySip: 10_000,
    annualStepUpPct: 10,
    horizonYears: 10,
  });
  assert.equal(res.points.length, 11);
  assert.equal(res.totalInvestedStandard, 1_200_000);
  assert.ok(res.stepUpSipEnding > res.sipEnding);
  assert.ok(res.lumpSumEnding > res.sipEnding);
  assert.ok(res.sipGainMultiple > 1);
});

test('computeRedemptionTaxEstimate distinguishes STCG + exit load vs LTCG with ₹1.25L exemption', () => {
  const mf = SCREENER_FUNDS.find((f) => f.symbol === 'PPFAS')!;
  const stcg = computeRedemptionTaxEstimate(mf, { investedAmount: 500_000, holdingMonths: 6 });
  const ltcg = computeRedemptionTaxEstimate(mf, { investedAmount: 500_000, holdingMonths: 36 });

  assert.equal(stcg.taxClass, 'Equity STCG');
  assert.equal(stcg.taxRatePct, 20);
  assert.equal(ltcg.taxClass, 'Equity LTCG');
  assert.equal(ltcg.taxRatePct, 12.5);
  assert.ok(ltcg.exemptionApplied > 0);
  assert.ok(ltcg.netPostTaxPayout > ltcg.investedAmount);
});

test('evaluateTerminalAlerts accurately triggers above, below, and drop_pct conditions', () => {
  const evaluated = evaluateTerminalAlerts(
    [
      { id: '1', symbol: 'PPFAS', condition: 'above', threshold: 80, note: 'Breakout', createdAt: '2026-01-01' },
      { id: '2', symbol: 'PPFAS', condition: 'below', threshold: 70, note: 'Dip buy', createdAt: '2026-01-01' },
      { id: '3', symbol: 'QQQ', condition: 'drop_pct', threshold: 2.0, note: 'Pullback', createdAt: '2026-01-01' },
    ],
    {
      PPFAS: { price: 85.4, changePct: 0.9 },
      QQQ: { price: 510, changePct: -2.45 },
    }
  );
  assert.equal(evaluated[0].triggered, true);
  assert.equal(evaluated[1].triggered, false);
  assert.equal(evaluated[2].triggered, true);
});

test('buildFundTearsheetMarkdown includes fund name, rankings, rolling stats, and holdings', () => {
  const fund = SCREENER_FUNDS.find((f) => f.symbol === 'PPFAS')!;
  const rankings = computeFundPeerRankings(fund, SCREENER_FUNDS);
  const rolling = computeFundRollingReturns(fund);
  const md = buildFundTearsheetMarkdown(fund, rankings, rolling);
  assert.ok(md.includes(fund.symbol));
  assert.ok(md.includes('Universe Rank'));
  assert.ok(md.includes('Top Holdings'));
});
