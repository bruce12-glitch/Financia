import { ScreenerFundRecord } from './screenerEngine';
import {
  computeFundValidationScore,
  FundIntelligenceProfile,
  getFundIntelligence,
} from './fundIntelligenceEngine';
import { computeInstrumentRiskProfile } from './riskAnalyticsEngine';

export interface RollingReturnPoint {
  periodKey: string;
  label: string;
  rolling1YPct: number;
  rolling3YAnnualPct: number | null;
}

export interface FundRollingReturnAnalysis {
  points: RollingReturnPoint[];
  window1YCount: number;
  min1YPct: number;
  median1YPct: number;
  mean1YPct: number;
  max1YPct: number;
  positiveWindowPct: number;
  beat12HurdlePct: number;
  consistencyLabel: 'High Consistency' | 'Moderate Consistency' | 'Cyclical';
}

export interface PeerRankMetricRow {
  id: string;
  label: string;
  valueLabel: string;
  rank: number;
  total: number;
  percentile: number;
  universeMedianLabel: string;
  verdict: 'Top Quartile' | 'Above Median' | 'Below Median';
}

export interface FundPeerRankingSummary {
  symbol: string;
  universeCount: number;
  overallPercentile: number;
  overallRank: number;
  metrics: PeerRankMetricRow[];
}

export interface SipVsLumpsumPoint {
  year: number;
  yearLabel: string;
  investedTotal: number;
  lumpSumValue: number;
  sipValue: number;
  stepUpSipValue: number;
}

export interface FundSipVsLumpsumResult {
  monthlySip: number;
  annualStepUpPct: number;
  horizonYears: number;
  netCagrPct: number;
  totalInvestedStandard: number;
  totalInvestedStepUp: number;
  lumpSumEnding: number;
  sipEnding: number;
  stepUpSipEnding: number;
  sipGainMultiple: number;
  stepUpGainMultiple: number;
  points: SipVsLumpsumPoint[];
}

export interface RedemptionTaxEstimate {
  investedAmount: number;
  currentValue: number;
  grossGain: number;
  holdingMonths: number;
  taxClass: 'Equity LTCG' | 'Equity STCG' | 'Debt / Bullion Slab';
  exitLoadPct: number;
  exitLoadAmount: number;
  exemptionApplied: number;
  taxableGain: number;
  taxRatePct: number;
  estimatedTax: number;
  netPostTaxPayout: number;
  netProfitAfterTax: number;
  postTaxCagrPct: number;
}

export interface TerminalPriceAlertRule {
  id: string;
  symbol: string;
  condition: 'above' | 'below' | 'drop_pct';
  threshold: number;
  note: string;
  createdAt: string;
}

export interface EvaluatedTerminalAlert extends TerminalPriceAlertRule {
  triggered: boolean;
  currentValue: number;
  distancePct: number;
  statusLabel: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Extracts chronological monthly returns and computes 12-month (1Y) and 36-month (3Y) rolling returns.
 */
export function computeFundRollingReturns(
  fund: ScreenerFundRecord,
  intelOverride?: FundIntelligenceProfile
): FundRollingReturnAnalysis {
  const intel = intelOverride ?? getFundIntelligence(fund);
  const monthlySeries: Array<{ key: string; label: string; retPct: number }> = [];

  const sortedYears = [...intel.monthlyHeatmap].sort((a, b) => a.year - b.year);
  for (const row of sortedYears) {
    for (let m = 0; m < row.months.length; m++) {
      const val = row.months[m];
      if (typeof val === 'number' && Number.isFinite(val)) {
        monthlySeries.push({
          key: `${row.year}-${String(m + 1).padStart(2, '0')}`,
          label: `${MONTH_NAMES[m]} '${String(row.year).slice(2)}`,
          retPct: val,
        });
      }
    }
  }

  const points: RollingReturnPoint[] = [];
  const window1YValues: number[] = [];

  for (let i = 11; i < monthlySeries.length; i++) {
    let factor12 = 1;
    for (let k = i - 11; k <= i; k++) {
      factor12 *= 1 + monthlySeries[k].retPct / 100;
    }
    const r1Y = Number(((factor12 - 1) * 100).toFixed(2));
    window1YValues.push(r1Y);

    let r3Y: number | null = null;
    if (i >= 35) {
      let factor36 = 1;
      for (let k = i - 35; k <= i; k++) {
        factor36 *= 1 + monthlySeries[k].retPct / 100;
      }
      r3Y = Number(((Math.pow(Math.max(0.01, factor36), 1 / 3) - 1) * 100).toFixed(2));
    }

    points.push({
      periodKey: monthlySeries[i].key,
      label: monthlySeries[i].label,
      rolling1YPct: r1Y,
      rolling3YAnnualPct: r3Y,
    });
  }

  if (window1YValues.length === 0) {
    const fallback = fund.returnsTotal['1Y'] ?? intel.returnOnAverage.avgAnnualReturn3Y;
    return {
      points: [
        {
          periodKey: 'NOW',
          label: 'Latest 1Y',
          rolling1YPct: Number(fallback.toFixed(2)),
          rolling3YAnnualPct: Number(intel.returnOnAverage.avgAnnualReturn3Y.toFixed(2)),
        },
      ],
      window1YCount: 1,
      min1YPct: Number(fallback.toFixed(2)),
      median1YPct: Number(fallback.toFixed(2)),
      mean1YPct: Number(fallback.toFixed(2)),
      max1YPct: Number(fallback.toFixed(2)),
      positiveWindowPct: fallback >= 0 ? 100 : 0,
      beat12HurdlePct: fallback >= 12 ? 100 : 0,
      consistencyLabel: fallback >= 12 ? 'High Consistency' : 'Moderate Consistency',
    };
  }

  const min1Y = Math.min(...window1YValues);
  const max1Y = Math.max(...window1YValues);
  const med1Y = median(window1YValues);
  const mean1Y = window1YValues.reduce((s, v) => s + v, 0) / window1YValues.length;
  const posCount = window1YValues.filter((v) => v > 0).length;
  const hurdleCount = window1YValues.filter((v) => v >= 12).length;
  const positiveWindowPct = Number(((posCount / window1YValues.length) * 100).toFixed(1));
  const beat12HurdlePct = Number(((hurdleCount / window1YValues.length) * 100).toFixed(1));

  const consistencyLabel =
    positiveWindowPct >= 85 && min1Y > -12
      ? 'High Consistency'
      : positiveWindowPct >= 65
        ? 'Moderate Consistency'
        : 'Cyclical';

  return {
    points,
    window1YCount: window1YValues.length,
    min1YPct: Number(min1Y.toFixed(2)),
    median1YPct: Number(med1Y.toFixed(2)),
    mean1YPct: Number(mean1Y.toFixed(2)),
    max1YPct: Number(max1Y.toFixed(2)),
    positiveWindowPct,
    beat12HurdlePct,
    consistencyLabel,
  };
}

/**
 * Ranks the active fund against the entire peer universe across 6 institutional criteria.
 */
export function computeFundPeerRankings(
  activeFund: ScreenerFundRecord,
  universe: ScreenerFundRecord[]
): FundPeerRankingSummary {
  const pool = universe.some((f) => f.symbol === activeFund.symbol)
    ? universe
    : [activeFund, ...universe];

  const enriched = pool.map((f) => {
    const intel = getFundIntelligence(f);
    const risk = computeInstrumentRiskProfile(f, intel);
    const val = computeFundValidationScore(f, intel);
    return {
      symbol: f.symbol,
      ret1Y: f.returnsTotal['1Y'] ?? 0,
      cagr3Y: intel.returnOnAverage.avgAnnualReturn3Y,
      sharpe3Y: f.keyStats.sharpe3Y,
      ter: f.about.expenseRatioPct,
      maxDdAbs: Math.abs(risk.maxDrawdown3YPct),
      validation: val.overall,
    };
  });

  const target = enriched.find((e) => e.symbol === activeFund.symbol) ?? enriched[0];
  const total = enriched.length;

  const rankMetric = (
    id: string,
    label: string,
    getter: (e: (typeof enriched)[number]) => number,
    higherIsBetter: boolean,
    formatter: (v: number) => string
  ): PeerRankMetricRow => {
    const vals = enriched.map(getter);
    const sorted = [...vals].sort((a, b) => (higherIsBetter ? b - a : a - b));
    const myVal = getter(target);
    const rank = sorted.findIndex((v) => (higherIsBetter ? v <= myVal + 1e-9 : v >= myVal - 1e-9)) + 1;
    const clampedRank = Math.max(1, Math.min(total, rank || total));
    const percentile =
      total <= 1 ? 100 : Math.round(((total - clampedRank) / (total - 1)) * 100);
    const medVal = median(vals);
    const verdict: PeerRankMetricRow['verdict'] =
      percentile >= 75 ? 'Top Quartile' : percentile >= 50 ? 'Above Median' : 'Below Median';
    return {
      id,
      label,
      valueLabel: formatter(myVal),
      rank: clampedRank,
      total,
      percentile,
      universeMedianLabel: formatter(medVal),
      verdict,
    };
  };

  const metrics: PeerRankMetricRow[] = [
    rankMetric('ret1y', '1Y Total Return', (e) => e.ret1Y, true, (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`),
    rankMetric('cagr3y', '3Y Annualized Return', (e) => e.cagr3Y, true, (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`),
    rankMetric('sharpe', '3Y Sharpe Ratio', (e) => e.sharpe3Y, true, (v) => v.toFixed(2)),
    rankMetric('ter', 'Cost Efficiency (TER)', (e) => e.ter, false, (v) => `${v.toFixed(2)}%`),
    rankMetric('dd', 'Drawdown Defense', (e) => e.maxDdAbs, false, (v) => `-${v.toFixed(1)}%`),
    rankMetric('val', 'Validation Score', (e) => e.validation, true, (v) => `${Math.round(v)}/100`),
  ];

  const overallPercentile = Math.round(
    metrics.reduce((s, m) => s + m.percentile, 0) / metrics.length
  );

  // Compute composite rank across universe
  const compositeScores = enriched.map((e) => ({
    symbol: e.symbol,
    score: e.cagr3Y * 1.4 + e.sharpe3Y * 12 - e.ter * 8 - e.maxDdAbs * 0.4 + e.validation * 0.35,
  }));
  compositeScores.sort((a, b) => b.score - a.score);
  const overallRank = Math.max(
    1,
    compositeScores.findIndex((c) => c.symbol === target.symbol) + 1
  );

  return {
    symbol: activeFund.symbol,
    universeCount: total,
    overallPercentile,
    overallRank,
    metrics,
  };
}

/**
 * Compares Equal-Capital Lump Sum vs. Monthly SIP vs. Step-Up SIP on the active fund.
 */
export function computeFundSipVsLumpsum(
  fund: ScreenerFundRecord,
  options: {
    monthlySip: number;
    annualStepUpPct: number;
    horizonYears: number;
  }
): FundSipVsLumpsumResult {
  const intel = getFundIntelligence(fund);
  const monthlySip = Math.max(500, options.monthlySip);
  const stepUpPct = Math.max(0, Math.min(35, options.annualStepUpPct));
  const horizonYears = Math.max(1, Math.min(20, Math.round(options.horizonYears)));

  const netCagrPct = Number(
    Math.max(2, intel.returnOnAverage.avgAnnualReturn3Y - fund.about.expenseRatioPct).toFixed(2)
  );
  const rAnnual = netCagrPct / 100;
  const rMonthly = Math.pow(1 + rAnnual, 1 / 12) - 1;

  const totalInvestedStandard = monthlySip * 12 * horizonYears;
  const points: SipVsLumpsumPoint[] = [];

  let sipBal = 0;
  let stepUpBal = 0;
  let stepUpInvested = 0;
  let curStepSip = monthlySip;

  points.push({
    year: 0,
    yearLabel: 'Now',
    investedTotal: 0,
    lumpSumValue: Math.round(totalInvestedStandard),
    sipValue: 0,
    stepUpSipValue: 0,
  });

  for (let y = 1; y <= horizonYears; y++) {
    for (let m = 0; m < 12; m++) {
      sipBal = sipBal * (1 + rMonthly) + monthlySip;
      stepUpBal = stepUpBal * (1 + rMonthly) + curStepSip;
      stepUpInvested += curStepSip;
    }
    const lumpVal = totalInvestedStandard * Math.pow(1 + rAnnual, y);
    points.push({
      year: y,
      yearLabel: `Yr ${y}`,
      investedTotal: Math.round(monthlySip * 12 * y),
      lumpSumValue: Math.round(lumpVal),
      sipValue: Math.round(sipBal),
      stepUpSipValue: Math.round(stepUpBal),
    });
    curStepSip = curStepSip * (1 + stepUpPct / 100);
  }

  const last = points[points.length - 1];
  return {
    monthlySip,
    annualStepUpPct: stepUpPct,
    horizonYears,
    netCagrPct,
    totalInvestedStandard: Math.round(totalInvestedStandard),
    totalInvestedStepUp: Math.round(stepUpInvested),
    lumpSumEnding: last.lumpSumValue,
    sipEnding: last.sipValue,
    stepUpSipEnding: last.stepUpSipValue,
    sipGainMultiple: Number((last.sipValue / Math.max(1, totalInvestedStandard)).toFixed(2)),
    stepUpGainMultiple: Number((last.stepUpSipValue / Math.max(1, stepUpInvested)).toFixed(2)),
    points,
  };
}

/**
 * Estimates post-tax redemption proceeds and exit load for the active fund.
 */
export function computeRedemptionTaxEstimate(
  fund: ScreenerFundRecord,
  options: {
    investedAmount: number;
    holdingMonths: number;
    marginalSlabPct?: number;
  }
): RedemptionTaxEstimate {
  const intel = getFundIntelligence(fund);
  const invested = Math.max(1000, options.investedAmount);
  const holdingMonths = Math.max(1, Math.min(240, Math.round(options.holdingMonths)));
  const slabPct = Math.max(5, Math.min(39, options.marginalSlabPct ?? 30));

  const netCagr = Math.max(1.5, intel.returnOnAverage.avgAnnualReturn3Y - fund.about.expenseRatioPct) / 100;
  const years = holdingMonths / 12;
  const currentValue = invested * Math.pow(1 + netCagr, years);
  const grossGain = Math.max(0, currentValue - invested);

  const isEquity = /equity|flexi|mid|small|large|index|tech|bank|nifty/i.test(
    `${fund.about.assetClass} ${fund.category} ${fund.name}`
  );

  // Parse exit load heuristic (typically 1% if redeemed before 12M for active MFs)
  const hasExitLoad =
    fund.instrumentType === 'Mutual Fund' &&
    !/nil|none|0%/i.test(intel.manager.exitLoad) &&
    holdingMonths < 12;
  const exitLoadPct = hasExitLoad ? 1.0 : 0;
  const exitLoadAmount = (currentValue * exitLoadPct) / 100;

  let taxClass: RedemptionTaxEstimate['taxClass'] = 'Debt / Bullion Slab';
  let taxRatePct = slabPct;
  let exemptionApplied = 0;

  if (isEquity) {
    if (holdingMonths >= 12) {
      taxClass = 'Equity LTCG';
      taxRatePct = 12.5;
      exemptionApplied = fund.currency === 'INR' ? Math.min(grossGain, 125_000) : 0;
    } else {
      taxClass = 'Equity STCG';
      taxRatePct = 20.0;
    }
  } else {
    taxClass = 'Debt / Bullion Slab';
    taxRatePct = holdingMonths >= 24 ? 12.5 : slabPct;
  }

  const taxableGain = Math.max(0, grossGain - exitLoadAmount - exemptionApplied);
  const estimatedTax = (taxableGain * taxRatePct) / 100;
  const netPostTaxPayout = Math.max(0, currentValue - exitLoadAmount - estimatedTax);
  const netProfitAfterTax = netPostTaxPayout - invested;
  const postTaxCagrPct =
    years > 0
      ? Number(((Math.pow(Math.max(0.01, netPostTaxPayout / invested), 1 / years) - 1) * 100).toFixed(2))
      : 0;

  return {
    investedAmount: Math.round(invested),
    currentValue: Math.round(currentValue),
    grossGain: Math.round(grossGain),
    holdingMonths,
    taxClass,
    exitLoadPct,
    exitLoadAmount: Math.round(exitLoadAmount),
    exemptionApplied: Math.round(exemptionApplied),
    taxableGain: Math.round(taxableGain),
    taxRatePct,
    estimatedTax: Math.round(estimatedTax),
    netPostTaxPayout: Math.round(netPostTaxPayout),
    netProfitAfterTax: Math.round(netProfitAfterTax),
    postTaxCagrPct,
  };
}

/**
 * Evaluates user-defined NAV/Price & Daily Drop alert rules against live quotes.
 */
export function evaluateTerminalAlerts(
  alerts: TerminalPriceAlertRule[],
  quotesBySymbol: Record<string, { price: number; changePct: number }>
): EvaluatedTerminalAlert[] {
  return alerts.map((rule) => {
    const q = quotesBySymbol[rule.symbol.toUpperCase()];
    if (!q) {
      return {
        ...rule,
        triggered: false,
        currentValue: 0,
        distancePct: 0,
        statusLabel: 'Watching',
      };
    }

    if (rule.condition === 'above') {
      const triggered = q.price >= rule.threshold;
      const dist = rule.threshold > 0 ? ((q.price - rule.threshold) / rule.threshold) * 100 : 0;
      return {
        ...rule,
        triggered,
        currentValue: q.price,
        distancePct: Number(dist.toFixed(2)),
        statusLabel: triggered ? 'Triggered (Above Target)' : `${Math.abs(dist).toFixed(1)}% below target`,
      };
    }

    if (rule.condition === 'below') {
      const triggered = q.price <= rule.threshold;
      const dist = rule.threshold > 0 ? ((q.price - rule.threshold) / rule.threshold) * 100 : 0;
      return {
        ...rule,
        triggered,
        currentValue: q.price,
        distancePct: Number(dist.toFixed(2)),
        statusLabel: triggered ? 'Triggered (Buy Zone Hit)' : `${Math.abs(dist).toFixed(1)}% above trigger`,
      };
    }

    // drop_pct: triggers if daily changePct <= -Math.abs(threshold)
    const dropLimit = -Math.abs(rule.threshold);
    const triggered = q.changePct <= dropLimit;
    return {
      ...rule,
      triggered,
      currentValue: q.changePct,
      distancePct: Number((q.changePct - dropLimit).toFixed(2)),
      statusLabel: triggered ? `Triggered (${q.changePct.toFixed(2)}% day move)` : `Live ${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%`,
    };
  });
}

/**
 * Exports a comprehensive Markdown Institutional Tearsheet for the active fund.
 */
export function buildFundTearsheetMarkdown(
  fund: ScreenerFundRecord,
  rankings: FundPeerRankingSummary,
  rolling: FundRollingReturnAnalysis
): string {
  const intel = getFundIntelligence(fund);
  const risk = computeInstrumentRiskProfile(fund, intel);
  const val = computeFundValidationScore(fund, intel);
  const curr = fund.currency === 'INR' ? '₹' : '$';

  const lines = [
    `# Financia Institutional Fund Tearsheet — ${fund.symbol}`,
    `**${fund.name}** (${fund.instrumentType} · ${fund.category} · ${fund.exchange})`,
    ``,
    `## Key Snapshot`,
    `- **Latest NAV / Price**: ${curr}${fund.price.toFixed(2)} (${fund.changePct >= 0 ? '+' : ''}${fund.changePct.toFixed(2)}%)`,
    `- **AUM**: ${fund.keyStats.aumLabel} | **Expense Ratio (TER)**: ${fund.about.expenseRatioPct.toFixed(2)}%`,
    `- **Lead Manager**: ${intel.manager.leadManager} (${intel.manager.tenureYears.toFixed(1)}Y tenure) | **Exit Load**: ${intel.manager.exitLoad}`,
    `- **Validation Score**: ${val.overall}/100 (${val.grade}) | **Universe Rank**: #${rankings.overallRank} of ${rankings.universeCount} (${rankings.overallPercentile}th percentile)`,
    ``,
    `## Risk & Rolling Return Consistency`,
    `- **1Y Return**: ${fund.returnsTotal['1Y'] ?? 0}% | **3Y Avg Annual**: ${intel.returnOnAverage.avgAnnualReturn3Y.toFixed(2)}%`,
    `- **3Y Sharpe / Sortino / Calmar**: ${fund.keyStats.sharpe3Y.toFixed(2)} / ${intel.ratios.sortino3Y.toFixed(2)} / ${risk.calmarRatio.toFixed(2)}`,
    `- **1M VaR (95%) / 3Y Max Drawdown**: ${risk.var95MonthlyPct.toFixed(2)}% / ${risk.maxDrawdown3YPct.toFixed(1)}%`,
    `- **1Y Rolling Returns (${rolling.window1YCount} windows)**: Min ${rolling.min1YPct}% · Median ${rolling.median1YPct}% · Max ${rolling.max1YPct}% (${rolling.positiveWindowPct}% positive windows)`,
    ``,
    `## Top Holdings`,
    ...intel.topHoldings.slice(0, 8).map(
      (h, idx) => `${idx + 1}. **${h.name}** (${h.ticker}) — ${h.weightPct.toFixed(2)}% · ${h.sector}`
    ),
  ];

  return lines.join('\n');
}
