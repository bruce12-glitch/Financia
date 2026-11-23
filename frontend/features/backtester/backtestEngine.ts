import Decimal from 'decimal.js';

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export type RebalanceFrequency = 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'DRIFT_5PCT';

export interface BacktestAllocationLeg {
  symbol: string;
  name: string;
  assetClass: 'Equity' | 'Debt' | 'Gold' | 'Global ETF';
  weightPct: number;
  expectedAnnualReturnPct: number;
  annualVolPct: number;
  expenseRatioPct: number;
  betaToMarket: number;
}

export interface BacktestConfig {
  title: string;
  initialCapital: number;
  monthlySip: number;
  horizonYears: number;
  rebalanceFrequency: RebalanceFrequency;
  benchmarkSymbol: string;
  allocations: BacktestAllocationLeg[];
}

export interface BacktestTimelinePoint {
  monthIndex: number;
  label: string;
  portfolioValue: number;
  benchmarkValue: number;
  investedCapital: number;
  drawdownPct: number;
  benchmarkDrawdownPct: number;
}

export interface BrinsonBucketRow {
  assetClass: string;
  portfolioWeightPct: number;
  benchmarkWeightPct: number;
  portfolioReturnPct: number;
  benchmarkReturnPct: number;
  allocationEffectPct: number;
  selectionEffectPct: number;
  interactionEffectPct: number;
  totalEffectPct: number;
}

export interface FactorLoadingRow {
  factor: string;
  exposure: number;
  contributionPct: number;
  interpretation: string;
}

export interface MacroRegimeStressResult {
  regimeId: string;
  regimeName: string;
  periodLabel: string;
  portfolioImpactPct: number;
  benchmarkImpactPct: number;
  excessProtectionPct: number;
  estimatedRupeeImpact: number;
}

export interface MonteCarloFanPoint {
  year: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface BacktestReport {
  config: BacktestConfig;
  timeline: BacktestTimelinePoint[];
  finalValue: number;
  totalInvested: number;
  benchmarkFinalValue: number;
  cagrPct: number;
  benchmarkCagrPct: number;
  activeAlphaPct: number;
  annualVolatilityPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  ulcerIndex: number;
  maxDrawdownPct: number;
  rebalanceEventsCount: number;
  brinsonAttribution: BrinsonBucketRow[];
  brinsonSumCheckActivePct: number;
  factorLoadings: FactorLoadingRow[];
  regimeStressTests: MacroRegimeStressResult[];
  monteCarloFan: MonteCarloFanPoint[];
}

export const BACKTEST_PRESET_LEGS: BacktestAllocationLeg[] = [
  {
    symbol: 'PPFAS',
    name: 'Parag Parikh Flexi Cap Direct',
    assetClass: 'Equity',
    weightPct: 35,
    expectedAnnualReturnPct: 16.2,
    annualVolPct: 13.8,
    expenseRatioPct: 0.62,
    betaToMarket: 0.84,
  },
  {
    symbol: 'HDFCMID',
    name: 'HDFC Mid-Cap Opportunities Direct',
    assetClass: 'Equity',
    weightPct: 20,
    expectedAnnualReturnPct: 19.4,
    annualVolPct: 18.2,
    expenseRatioPct: 0.76,
    betaToMarket: 1.08,
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust Series ETF',
    assetClass: 'Global ETF',
    weightPct: 15,
    expectedAnnualReturnPct: 15.8,
    annualVolPct: 19.5,
    expenseRatioPct: 0.2,
    betaToMarket: 1.15,
  },
  {
    symbol: 'SBIGILT',
    name: 'SBI Magnum Gilt Direct',
    assetClass: 'Debt',
    weightPct: 15,
    expectedAnnualReturnPct: 7.4,
    annualVolPct: 4.1,
    expenseRatioPct: 0.46,
    betaToMarket: 0.08,
  },
  {
    symbol: 'GOLDBEES',
    name: 'Gold Bullion Index ETF',
    assetClass: 'Gold',
    weightPct: 15,
    expectedAnnualReturnPct: 11.8,
    annualVolPct: 12.4,
    expenseRatioPct: 0.79,
    betaToMarket: -0.05,
  },
];

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function deterministicMonthlyReturn(
  month: number,
  leg: BacktestAllocationLeg,
  legIdx: number
): number {
  const netAnnual = (leg.expectedAnnualReturnPct - leg.expenseRatioPct) / 100;
  const meanMonthly = Math.pow(1 + netAnnual, 1 / 12) - 1;
  const volMonthly = leg.annualVolPct / 100 / Math.sqrt(12);

  // Market regime wave + idiosyncratic cycle
  const macroWave = Math.sin(month * 0.24) * 0.65 + Math.cos(month * 0.09) * 0.45;
  const covidDip = month === 26 || month === 27 ? -1.8 : 0;
  const rateCycle = month >= 48 && month <= 56 ? -0.65 : 0;
  const idioWave = Math.sin((month + legIdx * 7) * 0.51) * 0.5;

  const shock =
    (macroWave * leg.betaToMarket +
      covidDip * (leg.assetClass === 'Gold' ? -0.35 : leg.assetClass === 'Debt' ? -0.15 : 1) +
      rateCycle * (leg.assetClass === 'Debt' ? 0.55 : leg.assetClass === 'Gold' ? -0.2 : 0.85) +
      idioWave * 0.4) *
    volMonthly;

  return Math.max(-0.35, Math.min(0.35, meanMonthly + shock));
}

export function computeBrinsonAttribution(
  legs: BacktestAllocationLeg[]
): { rows: BrinsonBucketRow[]; totalActivePct: number } {
  const benchmarkWeights: Record<string, { weight: number; ret: number }> = {
    Equity: { weight: 60, ret: 14.2 },
    'Global ETF': { weight: 10, ret: 13.5 },
    Debt: { weight: 20, ret: 7.1 },
    Gold: { weight: 10, ret: 10.6 },
  };

  const totalWeight = legs.reduce((s, l) => s + l.weightPct, 0) || 100;
  const benchmarkTotalReturn = Object.values(benchmarkWeights).reduce(
    (s, b) => s + (b.weight / 100) * b.ret,
    0
  );

  const buckets = ['Equity', 'Global ETF', 'Debt', 'Gold'];
  const rows: BrinsonBucketRow[] = buckets.map((bucket) => {
    const matching = legs.filter((l) => l.assetClass === bucket);
    const wp = matching.reduce((s, l) => s + (l.weightPct / totalWeight) * 100, 0);
    const rp =
      wp > 0
        ? matching.reduce(
            (s, l) => s + ((l.weightPct / totalWeight) * 100 / wp) * (l.expectedAnnualReturnPct - l.expenseRatioPct),
            0
          )
        : benchmarkWeights[bucket].ret;

    const wb = benchmarkWeights[bucket].weight;
    const rb = benchmarkWeights[bucket].ret;

    const wpDec = new Decimal(wp).div(100);
    const wbDec = new Decimal(wb).div(100);
    const rpDec = new Decimal(rp);
    const rbDec = new Decimal(rb);
    const rBenchDec = new Decimal(benchmarkTotalReturn);

    const allocation = wpDec.minus(wbDec).times(rbDec.minus(rBenchDec));
    const selection = wbDec.times(rpDec.minus(rbDec));
    const interaction = wpDec.minus(wbDec).times(rpDec.minus(rbDec));
    const total = allocation.plus(selection).plus(interaction);

    return {
      assetClass: bucket,
      portfolioWeightPct: Number(wp.toFixed(2)),
      benchmarkWeightPct: wb,
      portfolioReturnPct: Number(rp.toFixed(2)),
      benchmarkReturnPct: rb,
      allocationEffectPct: Number(allocation.toDecimalPlaces(2).toString()),
      selectionEffectPct: Number(selection.toDecimalPlaces(2).toString()),
      interactionEffectPct: Number(interaction.toDecimalPlaces(2).toString()),
      totalEffectPct: Number(total.toDecimalPlaces(2).toString()),
    };
  });

  const totalActivePct = Number(
    rows.reduce((s, r) => s + r.totalEffectPct, 0).toFixed(2)
  );

  return { rows, totalActivePct };
}

export function runRegimeStressTests(
  legs: BacktestAllocationLeg[],
  portfolioValue: number
): MacroRegimeStressResult[] {
  const totalW = legs.reduce((s, l) => s + l.weightPct, 0) || 100;

  const regimes: Array<{
    id: string;
    name: string;
    period: string;
    shocks: Record<BacktestAllocationLeg['assetClass'], number>;
    benchmarkShock: number;
  }> = [
    {
      id: 'gfc-2008',
      name: '2008 Global Financial Crisis',
      period: 'Jan 2008 – Mar 2009',
      shocks: { Equity: -51.4, 'Global ETF': -44.8, Debt: 9.2, Gold: 24.6 },
      benchmarkShock: -39.5,
    },
    {
      id: 'covid-2020',
      name: '2020 COVID-19 Liquidity Shock',
      period: 'Feb 2020 – Mar 2020',
      shocks: { Equity: -34.2, 'Global ETF': -28.1, Debt: 2.8, Gold: 11.4 },
      benchmarkShock: -25.8,
    },
    {
      id: 'rates-2022',
      name: '2022 Global Rate Hike Cycle',
      period: 'Jan 2022 – Oct 2022',
      shocks: { Equity: -11.5, 'Global ETF': -29.4, Debt: -4.2, Gold: 8.6 },
      benchmarkShock: -14.2,
    },
    {
      id: 'inr-shock',
      name: 'INR Depreciation & Inflation Spike',
      period: '2013 Taper Tantrum Replay',
      shocks: { Equity: -14.8, 'Global ETF': 18.2, Debt: -5.4, Gold: 16.5 },
      benchmarkShock: -9.6,
    },
  ];

  return regimes.map((reg) => {
    const impact = legs.reduce(
      (sum, leg) => sum + (leg.weightPct / totalW) * reg.shocks[leg.assetClass],
      0
    );
    const portfolioImpactPct = Number(impact.toFixed(2));
    const excessProtectionPct = Number((portfolioImpactPct - reg.benchmarkShock).toFixed(2));
    const estimatedRupeeImpact = Number(((portfolioValue * portfolioImpactPct) / 100).toFixed(0));

    return {
      regimeId: reg.id,
      regimeName: reg.name,
      periodLabel: reg.period,
      portfolioImpactPct,
      benchmarkImpactPct: reg.benchmarkShock,
      excessProtectionPct,
      estimatedRupeeImpact,
    };
  });
}

export function runMonteCarloFan(params: {
  initialCapital: number;
  monthlySip: number;
  horizonYears: number;
  expectedAnnualReturnPct: number;
  annualVolPct: number;
  paths?: number;
}): MonteCarloFanPoint[] {
  const paths = Math.min(800, Math.max(100, params.paths ?? 400));
  const rand = seededRandom(42197);
  const dt = 1 / 12;
  const mu = params.expectedAnnualReturnPct / 100;
  const sigma = params.annualVolPct / 100;

  const yearBuckets: number[][] = Array.from({ length: params.horizonYears + 1 }, () => []);

  for (let p = 0; p < paths; p++) {
    let wealth = params.initialCapital;
    yearBuckets[0].push(wealth);

    for (let y = 1; y <= params.horizonYears; y++) {
      for (let m = 0; m < 12; m++) {
        const u1 = Math.max(1e-7, rand());
        const u2 = rand();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const growth = Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
        wealth = wealth * growth + params.monthlySip;
      }
      yearBuckets[y].push(wealth);
    }
  }

  const percentile = (sorted: number[], pct: number): number => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((pct / 100) * sorted.length)));
    return Math.round(sorted[idx]);
  };

  return yearBuckets.map((vals, year) => {
    const sorted = [...vals].sort((a, b) => a - b);
    return {
      year,
      p10: percentile(sorted, 10),
      p25: percentile(sorted, 25),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p90: percentile(sorted, 90),
    };
  });
}

/**
 * Executes a full walk-forward multi-asset backtest with Decimal-accurate rebalancing,
 * Brinson attribution, style factor loadings, macro regime stress tests, and Monte Carlo fan.
 */
export function runMultiAssetBacktest(config: BacktestConfig): BacktestReport {
  const totalWeight = config.allocations.reduce((s, a) => s + Math.max(0, a.weightPct), 0);
  const normalizedLegs: BacktestAllocationLeg[] =
    totalWeight > 0
      ? config.allocations.map((a) => ({
          ...a,
          weightPct: Number(((Math.max(0, a.weightPct) / totalWeight) * 100).toFixed(4)),
        }))
      : BACKTEST_PRESET_LEGS;

  const months = Math.max(12, Math.min(360, Math.round(config.horizonYears * 12)));
  const startYear = new Date().getUTCFullYear() - config.horizonYears;

  let legBalances = normalizedLegs.map((l) =>
    new Decimal(config.initialCapital).times(l.weightPct).div(100)
  );
  let benchmarkBalance = new Decimal(config.initialCapital);
  let investedCapital = new Decimal(config.initialCapital);

  let peakPortfolio = new Decimal(config.initialCapital);
  let peakBenchmark = new Decimal(config.initialCapital);
  let maxDrawdownPct = 0;
  let rebalanceEventsCount = 0;

  const monthlyReturns: number[] = [];
  const drawdownSquares: number[] = [];
  const timeline: BacktestTimelinePoint[] = [
    {
      monthIndex: 0,
      label: `${startYear}-01`,
      portfolioValue: Number(config.initialCapital.toFixed(0)),
      benchmarkValue: Number(config.initialCapital.toFixed(0)),
      investedCapital: Number(config.initialCapital.toFixed(0)),
      drawdownPct: 0,
      benchmarkDrawdownPct: 0,
    },
  ];

  const benchmarkLeg: BacktestAllocationLeg = {
    symbol: config.benchmarkSymbol || 'NIFTY50',
    name: 'Benchmark 60/40 Blended',
    assetClass: 'Equity',
    weightPct: 100,
    expectedAnnualReturnPct: 12.6,
    annualVolPct: 13.5,
    expenseRatioPct: 0.1,
    betaToMarket: 1.0,
  };

  for (let m = 1; m <= months; m++) {
    const prevTotal = legBalances.reduce((a, b) => a.plus(b), new Decimal(0));

    // Apply monthly leg returns
    legBalances = legBalances.map((bal, idx) => {
      const r = deterministicMonthlyReturn(m, normalizedLegs[idx], idx);
      return bal.times(new Decimal(1 + r));
    });

    const postReturnTotal = legBalances.reduce((a, b) => a.plus(b), new Decimal(0));
    const stepReturn = prevTotal.gt(0)
      ? postReturnTotal.minus(prevTotal).div(prevTotal).toNumber()
      : 0;
    monthlyReturns.push(stepReturn);

    const benchR = deterministicMonthlyReturn(m, benchmarkLeg, 99);
    benchmarkBalance = benchmarkBalance.times(new Decimal(1 + benchR));

    // Add Monthly SIP inflow across target weights
    if (config.monthlySip > 0) {
      const sipDec = new Decimal(config.monthlySip);
      investedCapital = investedCapital.plus(sipDec);
      benchmarkBalance = benchmarkBalance.plus(sipDec);
      legBalances = legBalances.map((bal, idx) =>
        bal.plus(sipDec.times(normalizedLegs[idx].weightPct).div(100))
      );
    }

    const totalNow = legBalances.reduce((a, b) => a.plus(b), new Decimal(0));

    // Rebalance condition
    let shouldRebalance = false;
    if (config.rebalanceFrequency === 'MONTHLY') shouldRebalance = true;
    else if (config.rebalanceFrequency === 'QUARTERLY' && m % 3 === 0) shouldRebalance = true;
    else if (config.rebalanceFrequency === 'ANNUAL' && m % 12 === 0) shouldRebalance = true;
    else if (config.rebalanceFrequency === 'DRIFT_5PCT' && totalNow.gt(0)) {
      shouldRebalance = legBalances.some((bal, idx) => {
        const currentW = bal.div(totalNow).times(100).toNumber();
        return Math.abs(currentW - normalizedLegs[idx].weightPct) >= 5;
      });
    }

    if (shouldRebalance && totalNow.gt(0)) {
      rebalanceEventsCount += 1;
      legBalances = normalizedLegs.map((l) => totalNow.times(l.weightPct).div(100));
    }

    if (totalNow.gt(peakPortfolio)) peakPortfolio = totalNow;
    if (benchmarkBalance.gt(peakBenchmark)) peakBenchmark = benchmarkBalance;

    const ddPct = peakPortfolio.gt(0)
      ? totalNow.minus(peakPortfolio).div(peakPortfolio).times(100).toNumber()
      : 0;
    const benchDdPct = peakBenchmark.gt(0)
      ? benchmarkBalance.minus(peakBenchmark).div(peakBenchmark).times(100).toNumber()
      : 0;

    if (ddPct < maxDrawdownPct) maxDrawdownPct = ddPct;
    drawdownSquares.push(ddPct * ddPct);

    const year = startYear + Math.floor(m / 12);
    const mo = String((m % 12) + 1).padStart(2, '0');
    timeline.push({
      monthIndex: m,
      label: `${year}-${mo}`,
      portfolioValue: Number(totalNow.toFixed(0)),
      benchmarkValue: Number(benchmarkBalance.toFixed(0)),
      investedCapital: Number(investedCapital.toFixed(0)),
      drawdownPct: Number(ddPct.toFixed(2)),
      benchmarkDrawdownPct: Number(benchDdPct.toFixed(2)),
    });
  }

  const finalValue = timeline[timeline.length - 1].portfolioValue;
  const benchmarkFinalValue = timeline[timeline.length - 1].benchmarkValue;
  const totalInvestedNum = timeline[timeline.length - 1].investedCapital;

  // Time-weighted annualized CAGR from monthly returns
  const cumulativeGrowth = monthlyReturns.reduce((prod, r) => prod * (1 + r), 1);
  const cagrPct = Number(
    ((Math.pow(Math.max(0.01, cumulativeGrowth), 12 / months) - 1) * 100).toFixed(2)
  );
  const benchmarkCagrPct = Number(
    (
      (Math.pow(
        Math.max(0.01, benchmarkFinalValue / Math.max(1, totalInvestedNum)),
        1 / Math.max(1, config.horizonYears)
      ) -
        1) *
      100
    ).toFixed(2)
  );

  const meanM = monthlyReturns.reduce((s, r) => s + r, 0) / monthlyReturns.length;
  const varianceM =
    monthlyReturns.reduce((s, r) => s + (r - meanM) ** 2, 0) / Math.max(1, monthlyReturns.length - 1);
  const annualVolatilityPct = Number((Math.sqrt(varianceM) * Math.sqrt(12) * 100).toFixed(2));

  const downsideM = monthlyReturns.filter((r) => r < 0);
  const downsideDev =
    downsideM.length > 0
      ? Math.sqrt(downsideM.reduce((s, r) => s + r * r, 0) / downsideM.length) * Math.sqrt(12) * 100
      : Math.max(1, annualVolatilityPct * 0.65);

  const riskFreePct = 6.5;
  const sharpeRatio = Number(
    ((cagrPct - riskFreePct) / Math.max(0.5, annualVolatilityPct)).toFixed(2)
  );
  const sortinoRatio = Number(
    ((cagrPct - riskFreePct) / Math.max(0.5, downsideDev)).toFixed(2)
  );
  const calmarRatio = Number(
    (cagrPct / Math.max(1, Math.abs(maxDrawdownPct))).toFixed(2)
  );
  const ulcerIndex = Number(
    Math.sqrt(drawdownSquares.reduce((s, v) => s + v, 0) / Math.max(1, drawdownSquares.length)).toFixed(2)
  );

  const brinson = computeBrinsonAttribution(normalizedLegs);

  const portfolioBeta = normalizedLegs.reduce(
    (s, l) => s + (l.weightPct / 100) * l.betaToMarket,
    0
  );
  const equityW = normalizedLegs
    .filter((l) => l.assetClass === 'Equity' || l.assetClass === 'Global ETF')
    .reduce((s, l) => s + l.weightPct, 0);
  const debtW = normalizedLegs
    .filter((l) => l.assetClass === 'Debt')
    .reduce((s, l) => s + l.weightPct, 0);
  const goldW = normalizedLegs
    .filter((l) => l.assetClass === 'Gold')
    .reduce((s, l) => s + l.weightPct, 0);

  const factorLoadings: FactorLoadingRow[] = [
    {
      factor: 'Market Beta (Equity Risk)',
      exposure: Number(portfolioBeta.toFixed(2)),
      contributionPct: Number((portfolioBeta * 9.8).toFixed(2)),
      interpretation:
        portfolioBeta < 0.85
          ? 'Defensive equity tilt with reduced crash sensitivity.'
          : 'Growth-oriented directional market capture.',
    },
    {
      factor: 'Quality & Flexi-Cap Alpha',
      exposure: Number(((equityW / 100) * 0.62).toFixed(2)),
      contributionPct: Number(((equityW / 100) * 3.1).toFixed(2)),
      interpretation: 'High-ROE compounding and active cash-flow discipline.',
    },
    {
      factor: 'Global FX & Tech Diversification',
      exposure: Number(
        (
          normalizedLegs
            .filter((l) => l.assetClass === 'Global ETF')
            .reduce((s, l) => s + l.weightPct, 0) / 100
        ).toFixed(2)
      ),
      contributionPct: Number(
        (
          (normalizedLegs
            .filter((l) => l.assetClass === 'Global ETF')
            .reduce((s, l) => s + l.weightPct, 0) /
            100) *
          4.2
        ).toFixed(2)
      ),
      interpretation: 'USD natural hedge against INR depreciation.',
    },
    {
      factor: 'Sovereign Duration & Carry',
      exposure: Number((debtW / 100).toFixed(2)),
      contributionPct: Number(((debtW / 100) * 7.2).toFixed(2)),
      interpretation: 'Ballast income dampening equity drawdowns.',
    },
    {
      factor: 'Gold / Inflation Hedge',
      exposure: Number((goldW / 100).toFixed(2)),
      contributionPct: Number(((goldW / 100) * 11.4).toFixed(2)),
      interpretation: 'Crisis convexity and real-rate shock protection.',
    },
  ];

  const expectedWeightedReturn = normalizedLegs.reduce(
    (s, l) => s + (l.weightPct / 100) * (l.expectedAnnualReturnPct - l.expenseRatioPct),
    0
  );

  const regimeStressTests = runRegimeStressTests(normalizedLegs, finalValue);
  const monteCarloFan = runMonteCarloFan({
    initialCapital: config.initialCapital,
    monthlySip: config.monthlySip,
    horizonYears: config.horizonYears,
    expectedAnnualReturnPct: expectedWeightedReturn,
    annualVolPct: Math.max(4, annualVolatilityPct),
  });

  return {
    config: { ...config, allocations: normalizedLegs },
    timeline,
    finalValue,
    totalInvested: totalInvestedNum,
    benchmarkFinalValue,
    cagrPct,
    benchmarkCagrPct,
    activeAlphaPct: Number((cagrPct - benchmarkCagrPct).toFixed(2)),
    annualVolatilityPct,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    ulcerIndex,
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    rebalanceEventsCount,
    brinsonAttribution: brinson.rows,
    brinsonSumCheckActivePct: brinson.totalActivePct,
    factorLoadings,
    regimeStressTests,
    monteCarloFan,
  };
}
