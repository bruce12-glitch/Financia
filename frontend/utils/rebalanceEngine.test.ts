import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_FUNDS } from './screenerEngine';
import { INITIAL_STOCKS } from '../data/marketData';
import {
  buildCrossFundComparison,
  buildInstrumentCommunityPosts,
  buildRebalanceCsv,
  computePortfolioRebalancePlan,
  simulateRealisticMarketDrift,
  synthesizeScreenerFundFromQuote,
} from './rebalanceEngine';

const ppfas = SCREENER_FUNDS.find((f) => f.symbol === 'PPFAS')!;
const qqq = SCREENER_FUNDS.find((f) => f.symbol === 'QQQ')!;
const goldbees = SCREENER_FUNDS.find((f) => f.symbol === 'GOLDBEES')!;
const sbigilt = SCREENER_FUNDS.find((f) => f.symbol === 'SBIGILT')!;

test('computePortfolioRebalancePlan calculates exact BUY/SELL/HOLD orders summing cleanly to zero net cash', () => {
  const funds = [ppfas, qqq, goldbees];
  const plan = computePortfolioRebalancePlan({
    funds,
    currentValues: {
      PPFAS: 520000, // 52% vs 40% target -> SELL 120,000
      QQQ: 280000,   // 28% vs 35% target -> BUY 70,000
      GOLDBEES: 200000, // 20% vs 25% target -> BUY 50,000
    },
    targetWeights: {
      PPFAS: 40,
      QQQ: 35,
      GOLDBEES: 25,
    },
  });

  assert.equal(plan.totalPortfolioValue, 1000000);
  assert.equal(plan.status, 'Rebalance Needed');
  assert.equal(plan.tradesRequiredCount, 3);
  assert.equal(plan.maxAbsDriftPct, 12);

  const rowP = plan.rows.find((r) => r.symbol === 'PPFAS')!;
  const rowQ = plan.rows.find((r) => r.symbol === 'QQQ')!;
  const rowG = plan.rows.find((r) => r.symbol === 'GOLDBEES')!;

  assert.equal(rowP.action, 'SELL');
  assert.equal(rowP.tradeAmount, -120000);
  assert.ok(rowP.estimatedUnits > 0);

  assert.equal(rowQ.action, 'BUY');
  assert.equal(rowQ.tradeAmount, 70000);

  assert.equal(rowG.action, 'BUY');
  assert.equal(rowG.tradeAmount, 50000);

  assert.equal(Math.round(plan.totalBuyAmount), Math.round(plan.totalSellAmount));
});

test('computePortfolioRebalancePlan marks portfolio Balanced when all drifts are within tolerance', () => {
  const funds = [ppfas, goldbees];
  const plan = computePortfolioRebalancePlan({
    funds,
    currentValues: { PPFAS: 60100, GOLDBEES: 39900 },
    targetWeights: { PPFAS: 60, GOLDBEES: 40 },
    tolerancePct: 0.25,
  });

  assert.equal(plan.status, 'Balanced');
  assert.equal(plan.tradesRequiredCount, 0);
  assert.ok(plan.rows.every((r) => r.action === 'HOLD' && r.tradeAmount === 0));
});

test('simulateRealisticMarketDrift preserves total portfolio value and creates non-zero drift', () => {
  const funds = [ppfas, qqq, goldbees, sbigilt];
  const targets = { PPFAS: 40, QQQ: 25, GOLDBEES: 20, SBIGILT: 15 };
  const drifted = simulateRealisticMarketDrift(funds, targets, 1000000);

  const sum = Object.values(drifted).reduce((a, b) => a + b, 0);
  assert.equal(sum, 1000000);

  const plan = computePortfolioRebalancePlan({
    funds,
    currentValues: drifted,
    targetWeights: targets,
  });
  assert.ok(plan.maxAbsDriftPct > 0.25);
  assert.ok(plan.tradesRequiredCount >= 2);
});

test('buildRebalanceCsv outputs header and all trade rows cleanly', () => {
  const plan = computePortfolioRebalancePlan({
    funds: [ppfas, qqq],
    currentValues: { PPFAS: 70000, QQQ: 30000 },
    targetWeights: { PPFAS: 50, QQQ: 50 },
  });
  const csv = buildRebalanceCsv(plan);
  const lines = csv.split('\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[0].includes('Action,Trade Amount,Estimated Units'));
  assert.ok(lines[1].includes('SELL'));
  assert.ok(lines[2].includes('BUY'));
});

test('buildInstrumentCommunityPosts generates 3 grounded posts for every single fund and ETF in SCREENER_FUNDS', () => {
  for (const fund of SCREENER_FUNDS) {
    const posts = buildInstrumentCommunityPosts(fund);
    assert.equal(posts.length, 3, `Expected 3 posts for ${fund.symbol}`);
    assert.ok(posts[0].title.includes(fund.symbol));
    assert.ok(posts.every((p) => p.body.length > 40 && p.upvotes > 0));
  }
});

test('synthesizeScreenerFundFromQuote generates full ScreenerFundRecord for any custom StockQuote', () => {
  const quote = INITIAL_STOCKS[0];
  const synth = synthesizeScreenerFundFromQuote(quote);
  assert.equal(synth.symbol, quote.ticker);
  assert.ok(synth.regions.length >= 3);
  assert.ok(synth.exposure.length >= 2);
  assert.ok(synth.news.headline.length > 10);
});

test('buildCrossFundComparison compares any Mutual Fund vs ETF independent of sector across ratios, returns, sectors, expected future returns, and news', () => {
  const result = buildCrossFundComparison(ppfas, qqq, 5, 100000);
  assert.equal(result.isCrossType, true);
  assert.equal(result.ratios.length, 11);
  assert.equal(result.returns.length, 7);
  assert.ok(result.sectors.length >= 5);
  assert.ok(result.sectorOverlapPct >= 0 && result.sectorOverlapPct <= 100);
  assert.equal(result.expectedFuture.timeline.length, 6); // Year 0..5
  assert.ok(result.expectedFuture.endingBullA > result.expectedFuture.endingBaseA);
  assert.ok(result.expectedFuture.endingBaseA > result.expectedFuture.endingBearA);
  assert.ok(result.expectedFuture.endingBullB > result.expectedFuture.endingBaseB);
  assert.ok(result.newsA.length >= 2);
  assert.ok(result.newsB.length >= 2);
});
