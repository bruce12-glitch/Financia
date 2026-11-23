import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Layers,
  ShieldAlert,
  Target,
  Wallet,
} from 'lucide-react';
import { ScreenerFundRecord } from '../utils/screenerEngine';
import {
  computePortfolioLookthrough,
  runPortfolioMonteCarlo,
  runPortfolioStressScenarios,
  simulatePortfolioSwp,
} from '../utils/allocatorLabsEngine';

export interface AllocatorAdvancedLabsProps {
  selectedFunds: ScreenerFundRecord[];
  normalizedWeights: Record<string, number>;
  startingCapital: number;
  monthlySip: number;
  annualSipStepUpPct: number;
  inflationRatePct: number;
  horizonYears: number;
  weightedNetCagrPct: number;
  projectedBaseEnding: number;
  currencyPrefix: string;
}

export const AllocatorAdvancedLabs: React.FC<AllocatorAdvancedLabsProps> = ({
  selectedFunds,
  normalizedWeights,
  startingCapital,
  monthlySip,
  annualSipStepUpPct,
  inflationRatePct,
  horizonYears,
  weightedNetCagrPct,
  projectedBaseEnding,
  currencyPrefix,
}) => {
  const [activeLab, setActiveLab] = useState<'montecarlo' | 'lookthrough' | 'stress' | 'swp'>('montecarlo');
  const [targetGoal, setTargetGoal] = useState<number>(() =>
    Math.max(startingCapital * 2, Math.round((projectedBaseEnding * 0.9) / 100_000) * 100_000)
  );
  const [swpCorpus, setSwpCorpus] = useState<number>(() => Math.max(2_500_000, projectedBaseEnding));
  const [swpMonthlyDraw, setSwpMonthlyDraw] = useState<number>(() =>
    Math.max(10_000, Math.round((Math.max(2_500_000, projectedBaseEnding) * 0.05) / 12 / 1000) * 1000)
  );
  const [swpInflationPct, setSwpInflationPct] = useState<number>(5);
  const [swpHorizonYears, setSwpHorizonYears] = useState<number>(20);

  const formatCompact = (v: number) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 10_000_000) return `${sign}${currencyPrefix}${(abs / 10_000_000).toFixed(2)}Cr`;
    if (abs >= 1_000_000) return `${sign}${currencyPrefix}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}${currencyPrefix}${Math.round(abs / 1_000)}k`;
    return `${sign}${currencyPrefix}${Math.round(abs)}`;
  };

  const formatFull = (v: number) => {
    const sign = v < 0 ? '-' : '';
    return `${sign}${currencyPrefix}${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
  };

  const monteCarlo = useMemo(
    () =>
      runPortfolioMonteCarlo(selectedFunds, normalizedWeights, {
        startingCapital,
        monthlySip,
        annualSipStepUpPct,
        inflationRatePct,
        horizonYears,
        targetGoal,
        pathsCount: 500,
      }),
    [
      selectedFunds,
      normalizedWeights,
      startingCapital,
      monthlySip,
      annualSipStepUpPct,
      inflationRatePct,
      horizonYears,
      targetGoal,
    ]
  );

  const lookthrough = useMemo(
    () => computePortfolioLookthrough(selectedFunds, normalizedWeights, startingCapital),
    [selectedFunds, normalizedWeights, startingCapital]
  );

  const stressResults = useMemo(
    () => runPortfolioStressScenarios(selectedFunds, normalizedWeights, startingCapital),
    [selectedFunds, normalizedWeights, startingCapital]
  );

  const swpResult = useMemo(
    () =>
      simulatePortfolioSwp({
        startingCorpus: swpCorpus,
        initialMonthlyWithdrawal: swpMonthlyDraw,
        annualInflationPct: swpInflationPct,
        expectedReturnPct: Math.max(4, Math.min(18, weightedNetCagrPct)),
        horizonYears: swpHorizonYears,
      }),
    [swpCorpus, swpMonthlyDraw, swpInflationPct, weightedNetCagrPct, swpHorizonYears]
  );

  return (
    <div
      data-testid="allocator-advanced-labs"
      className="mx-5 mb-5 rounded-[12px] border border-[#e2e8f0] bg-white overflow-hidden"
    >
      {/* Labs Sub-Navigation Bar */}
      <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.07em] text-[#2563eb] font-semibold">
            Institutional Portfolio Analytics Labs
          </div>
          <h4 className="text-sm font-display font-bold text-[#0f172a] mt-0.5">
            Monte Carlo Probability, Look-Through Overlap, Crisis Stress Replay &amp; SWP Planner
          </h4>
        </div>

        <div
          role="tablist"
          aria-label="Portfolio allocator deep analytics labs"
          className="inline-flex flex-wrap lg:flex-nowrap items-center gap-1 p-1 rounded-[9px] bg-[#f1f5f9] border border-[#e2e8f0] shrink-0"
        >
          {(
            [
              { id: 'montecarlo', label: 'Monte Carlo', icon: Target },
              { id: 'lookthrough', label: 'Look-Through', icon: Layers },
              { id: 'stress', label: 'Stress Tests', icon: ShieldAlert },
              { id: 'swp', label: 'SWP Planner', icon: Wallet },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeLab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`allocator-lab-tab-${tab.id}`}
                onClick={() => setActiveLab(tab.id)}
                className={`px-2.5 py-1.5 rounded-[7px] text-[11.5px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#0f172a] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#38bdf8]' : 'text-[#64748b]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LAB 1: MONTE CARLO & GOAL PROBABILITY */}
      {activeLab === 'montecarlo' && (
        <div data-testid="allocator-lab-montecarlo" className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="mc-target-goal-input" className="text-xs font-semibold text-[#0f172a]">
                Target Wealth Goal ({currencyPrefix}):
              </label>
              <input
                id="mc-target-goal-input"
                data-testid="mc-target-goal-input"
                type="number"
                min={50000}
                step={250000}
                value={targetGoal}
                onChange={(e) => setTargetGoal(Math.max(50000, Number(e.target.value) || 50000))}
                className="w-36 h-8 px-2.5 rounded-[7px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
              />
              <div className="inline-flex items-center gap-1">
                {[2, 4, 6, 10].map((mult) => {
                  const preset = Math.round((startingCapital * mult) / 100_000) * 100_000;
                  return (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setTargetGoal(preset)}
                      className="px-2 py-1 rounded-[6px] border border-[#cbd5e1] bg-white hover:border-[#2563eb] text-[11px] font-mono font-semibold text-[#334155] cursor-pointer whitespace-nowrap"
                    >
                      {mult}x ({formatCompact(preset)})
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-[11px] font-mono text-[#64748b]">
              500 Geometric Brownian Motion paths · Net μ {weightedNetCagrPct.toFixed(2)}% · Step-Up {annualSipStepUpPct}%
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff]/60 p-3">
              <div className="text-[10px] font-mono uppercase text-[#1d4ed8]">Goal Hit Probability</div>
              <div
                data-testid="mc-goal-probability"
                className={`text-xl font-mono font-bold tabular-nums mt-0.5 ${
                  monteCarlo.goalSuccessProbabilityPct >= 70
                    ? 'text-[#059669]'
                    : monteCarlo.goalSuccessProbabilityPct >= 45
                      ? 'text-[#d97706]'
                      : 'text-[#dc2626]'
                }`}
              >
                {monteCarlo.goalSuccessProbabilityPct.toFixed(1)}%
              </div>
              <div className="text-[11px] font-mono text-[#475569]">
                Target {formatCompact(monteCarlo.targetGoal)} in {horizonYears}Y
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Median Outcome (P50)</div>
              <div className="text-xl font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                {formatFull(monteCarlo.medianEnding)}
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                {inflationRatePct > 0
                  ? `Real (${inflationRatePct}% CPI): ${formatCompact(monteCarlo.realMedianEnding)}`
                  : `Nominal median corpus`}
              </div>
            </div>

            <div className="rounded-[10px] border border-[#a7f3d0] bg-[#ecfdf5]/60 p-3">
              <div className="text-[10px] font-mono uppercase text-[#047857]">Strong Cycle (P90)</div>
              <div className="text-xl font-mono font-bold text-[#047857] tabular-nums mt-0.5">
                {formatFull(monteCarlo.p90Ending)}
              </div>
              <div className="text-[11px] font-mono text-[#475569]">
                Top decile wealth path
              </div>
            </div>

            <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2]/60 p-3">
              <div className="text-[10px] font-mono uppercase text-[#991b1b]">Tail Downside (P10)</div>
              <div className="text-xl font-mono font-bold text-[#b91c1c] tabular-nums mt-0.5">
                {formatFull(monteCarlo.p10Ending)}
              </div>
              <div className="text-[11px] font-mono text-[#475569]">
                {monteCarlo.shortfallOrSurplus >= 0
                  ? `P50 Surplus +${formatCompact(monteCarlo.shortfallOrSurplus)}`
                  : `P50 Shortfall ${formatCompact(monteCarlo.shortfallOrSurplus)}`}
              </div>
            </div>
          </div>

          <div className="h-[250px] w-full rounded-[10px] border border-[#e2e8f0] bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monteCarlo.points} margin={{ top: 10, right: 16, bottom: 4, left: 6 }}>
                <defs>
                  <linearGradient id="mcP90Fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="mcP50Fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="yearLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#64748b' }} width={64} />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [formatFull(Number(value)), String(name)]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0f172a',
                    boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.14)',
                  }}
                  labelStyle={{ color: '#0f172a', fontWeight: 700, marginBottom: '2px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <ReferenceLine
                  y={monteCarlo.targetGoal}
                  stroke="#d97706"
                  strokeDasharray="6 3"
                  strokeWidth={1.6}
                  label={{
                    value: `Goal ${formatCompact(monteCarlo.targetGoal)}`,
                    position: 'insideTopRight',
                    fill: '#b45309',
                    fontSize: 11,
                  }}
                />
                <Area type="monotone" dataKey="p90" name="P90 Upside" stroke="#059669" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#mcP90Fill)" />
                <Area type="monotone" dataKey="p50" name="P50 Median" stroke="#2563eb" strokeWidth={2.4} fill="url(#mcP50Fill)" />
                <Line type="monotone" dataKey="p25" name="P25 Cautious" stroke="#7c3aed" strokeWidth={1.4} dot={false} />
                <Line type="monotone" dataKey="p10" name="P10 Stress" stroke="#dc2626" strokeWidth={1.6} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="invested" name="Capital Invested" stroke="#64748b" strokeWidth={1.2} strokeDasharray="2 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* LAB 2: LOOK-THROUGH ASSET CLASS, SECTOR & OVERLAP DIAGNOSTICS */}
      {activeLab === 'lookthrough' && (
        <div data-testid="allocator-lab-lookthrough" className="p-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Diversification Grade</div>
              <div className="text-base font-display font-bold text-[#0f172a] mt-0.5">
                {lookthrough.diversificationGrade}
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                Effective N: {lookthrough.effectiveFundCount.toFixed(2)} · HHI {lookthrough.herfindahlIndex.toFixed(3)}
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Cross-Fund Stock Overlap</div>
              <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                {lookthrough.overlapHoldingsCount} Shared Holdings
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                Underlying securities held by ≥2 funds
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Weighted Dividend Yield</div>
              <div className="text-base font-mono font-bold text-[#059669] tabular-nums mt-0.5">
                {lookthrough.weightedDividendYieldPct.toFixed(2)}% / yr
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                Est. Annual Carry: {formatFull(lookthrough.estimatedAnnualIncome)}
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Asset Classes Active</div>
              <div className="text-base font-mono font-bold text-[#2563eb] tabular-nums mt-0.5">
                {lookthrough.assetClasses.length} Buckets
              </div>
              <div className="text-[11px] font-mono text-[#64748b] truncate">
                Top: {lookthrough.assetClasses[0]?.label ?? '—'} ({lookthrough.assetClasses[0]?.weightPct ?? 0}%)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Asset Class & Sector Exposure */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-3.5 space-y-2.5">
                <div className="text-xs font-display font-bold text-[#0f172a]">
                  Asset Class Breakdown
                </div>
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-[#e2e8f0]">
                  {lookthrough.assetClasses.map((ac) => (
                    <div
                      key={ac.label}
                      title={`${ac.label}: ${ac.weightPct}%`}
                      style={{ width: `${ac.weightPct}%`, backgroundColor: ac.color }}
                      className="h-full"
                    />
                  ))}
                </div>
                <div className="space-y-1.5 pt-1">
                  {lookthrough.assetClasses.map((ac) => (
                    <div key={ac.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[#334155]">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ac.color }} />
                        <span>{ac.label}</span>
                      </div>
                      <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                        {ac.weightPct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-3.5 space-y-2">
                <div className="text-xs font-display font-bold text-[#0f172a]">
                  Aggregated Sector Look-Through
                </div>
                {lookthrough.sectors.map((sec) => (
                  <div key={sec.sector} className="space-y-1">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#334155] truncate pr-2">{sec.sector}</span>
                      <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                        {sec.weightPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2563eb]"
                        style={{ width: `${Math.min(100, sec.weightPct * 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top-10 Underlying Securities Look-Through Table */}
            <div className="lg:col-span-7 rounded-[10px] border border-[#e2e8f0] bg-white overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between">
                <span className="text-xs font-display font-bold text-[#0f172a]">
                  Top-10 Look-Through Underlying Positions &amp; Overlap
                </span>
                <span className="text-[11px] font-mono text-[#64748b]">Effective Portfolio Weight</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[10.5px] font-mono uppercase text-[#64748b] bg-[#f8fafc]/40">
                      <th className="py-2 px-3">Security</th>
                      <th className="py-2 px-3">Sector</th>
                      <th className="py-2 px-3 text-right">Eff. Weight</th>
                      <th className="py-2 px-3 text-right">Held By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {lookthrough.topUnderlyingHoldings.map((h) => (
                      <tr key={`${h.ticker}-${h.name}`} className="hover:bg-[#f8fafc]">
                        <td className="py-2 px-3">
                          <div className="font-semibold text-[#0f172a]">{h.name}</div>
                          <div className="text-[10.5px] font-mono text-[#64748b]">{h.ticker}</div>
                        </td>
                        <td className="py-2 px-3 text-[#475569]">{h.sector}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#0f172a] tabular-nums">
                          {h.effectiveWeightPct.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[11px]">
                          <span
                            className={
                              h.fundCount >= 2
                                ? 'text-[#d97706] font-bold'
                                : 'text-[#64748b]'
                            }
                          >
                            {h.funds.join(', ')}
                            {h.fundCount >= 2 ? ' (Overlap)' : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LAB 3: MACRO & HISTORICAL CRISIS STRESS TESTS */}
      {activeLab === 'stress' && (
        <div data-testid="allocator-lab-stress" className="p-4 space-y-4">
          <div className="h-[210px] w-full rounded-[10px] border border-[#e2e8f0] bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stressResults}
                margin={{ top: 10, right: 20, bottom: 4, left: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: '#475569' }} interval={0} />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={46}
                />
                <ReferenceLine y={0} stroke="#0f172a" strokeWidth={1} />
                <Tooltip
                  formatter={(value: unknown) => [`${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`, 'Portfolio Shock']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#ffffff',
                  }}
                />
                <Bar dataKey="portfolioImpactPct" radius={[5, 5, 0, 0]}>
                  {stressResults.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={entry.portfolioImpactPct >= 0 ? '#059669' : '#dc2626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {stressResults.map((sc) => (
              <div
                key={sc.id}
                data-testid={`stress-card-${sc.id}`}
                className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc]/70 p-3.5 flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-display font-bold text-[#0f172a]">{sc.name}</span>
                    <span
                      className={`font-mono text-xs font-bold tabular-nums ${
                        sc.portfolioImpactPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                      }`}
                    >
                      {sc.portfolioImpactPct >= 0 ? '+' : ''}
                      {sc.portfolioImpactPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[10.5px] font-mono text-[#64748b] mt-0.5">
                    {sc.era} · {sc.resilienceRating}
                  </div>
                  <p className="text-[11.5px] text-[#475569] mt-1.5 leading-relaxed">
                    {sc.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-[#475569]">
                    Post-Shock: <strong className="text-[#0f172a]">{formatCompact(sc.postShockValue)}</strong>
                  </span>
                  <span className="text-[#64748b]">
                    Best {sc.bestContributor.symbol} · Drag {sc.worstContributor.symbol}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LAB 4: SWP RETIREMENT WITHDRAWAL SUSTAINABILITY */}
      {activeLab === 'swp' && (
        <div data-testid="allocator-lab-swp" className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="swp-corpus-input" className="text-[11px] font-medium text-[#475569]">
                  Starting Corpus ({currencyPrefix})
                </label>
                <button
                  type="button"
                  onClick={() => setSwpCorpus(Math.max(100_000, projectedBaseEnding))}
                  className="text-[10px] font-mono font-semibold text-[#2563eb] hover:underline cursor-pointer"
                >
                  Use {horizonYears}Y Projected
                </button>
              </div>
              <input
                id="swp-corpus-input"
                data-testid="swp-corpus-input"
                type="number"
                min={100000}
                step={500000}
                value={swpCorpus}
                onChange={(e) => setSwpCorpus(Math.max(100000, Number(e.target.value) || 100000))}
                className="w-full h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
              />
            </div>

            <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-1.5">
              <label htmlFor="swp-monthly-input" className="text-[11px] font-medium text-[#475569] block">
                Monthly Withdrawal ({currencyPrefix})
              </label>
              <input
                id="swp-monthly-input"
                data-testid="swp-monthly-input"
                type="number"
                min={1000}
                step={5000}
                value={swpMonthlyDraw}
                onChange={(e) => setSwpMonthlyDraw(Math.max(1000, Number(e.target.value) || 1000))}
                className="w-full h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
              />
            </div>

            <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-1.5">
              <label htmlFor="swp-inflation-input" className="text-[11px] font-medium text-[#475569] block">
                Withdrawal Inflation (%/yr)
              </label>
              <input
                id="swp-inflation-input"
                type="number"
                min={0}
                max={12}
                step={0.5}
                value={swpInflationPct}
                onChange={(e) => setSwpInflationPct(Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
                className="w-full h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
              />
            </div>

            <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-1.5">
              <span className="text-[11px] font-medium text-[#475569] block">Retirement Horizon</span>
              <div className="inline-flex items-center p-0.5 rounded-[7px] bg-white border border-[#cbd5e1] w-full justify-between">
                {[10, 15, 20, 25, 30].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSwpHorizonYears(yr)}
                    className={`flex-1 py-1 rounded-[5px] text-[11px] font-mono font-semibold cursor-pointer ${
                      swpHorizonYears === yr
                        ? 'bg-[#2563eb] text-white'
                        : 'text-[#475569] hover:text-[#0f172a]'
                    }`}
                  >
                    {yr}Y
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Sustainability Verdict</div>
              <div
                data-testid="swp-status"
                className={`text-base font-display font-bold mt-0.5 flex items-center gap-1.5 ${
                  swpResult.survivedAllYears ? 'text-[#059669]' : 'text-[#dc2626]'
                }`}
              >
                {!swpResult.survivedAllYears && <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{swpResult.sustainabilityStatus}</span>
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                Sustained {swpResult.yearsSustained} / {swpResult.horizonYears} years
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Initial Withdrawal Rate</div>
              <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                {swpResult.initialWithdrawalRatePct.toFixed(2)}% / yr
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                Portfolio Return {swpResult.expectedReturnPct.toFixed(1)}% net
              </div>
            </div>

            <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff]/60 p-3">
              <div className="text-[10px] font-mono uppercase text-[#1d4ed8]">Total Cash Withdrawn</div>
              <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                {formatFull(swpResult.totalWithdrawn)}
              </div>
              <div className="text-[11px] font-mono text-[#475569]">
                Inflation-adjusted payouts
              </div>
            </div>

            <div className="rounded-[10px] border border-[#a7f3d0] bg-[#ecfdf5]/60 p-3">
              <div className="text-[10px] font-mono uppercase text-[#047857]">Terminal Legacy Corpus</div>
              <div className="text-base font-mono font-bold text-[#047857] tabular-nums mt-0.5">
                {formatFull(swpResult.terminalCorpus)}
              </div>
              <div className="text-[11px] font-mono text-[#475569]">
                Remaining after Yr {swpResult.horizonYears}
              </div>
            </div>
          </div>

          <div className="h-[235px] w-full rounded-[10px] border border-[#e2e8f0] bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={swpResult.points} margin={{ top: 10, right: 16, bottom: 4, left: 6 }}>
                <defs>
                  <linearGradient id="swpBalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="yearLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#64748b' }} width={64} />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [formatFull(Number(value)), String(name)]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0f172a',
                    boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.14)',
                  }}
                  labelStyle={{ color: '#0f172a', fontWeight: 700, marginBottom: '2px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Area
                  type="monotone"
                  dataKey="endingBalance"
                  name="Remaining Portfolio Corpus"
                  stroke="#059669"
                  strokeWidth={2.3}
                  fill="url(#swpBalFill)"
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeWithdrawn"
                  name="Cumulative Cash Withdrawn"
                  stroke="#2563eb"
                  strokeWidth={1.8}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
