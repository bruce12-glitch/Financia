import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
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
  Award,
  Calculator,
  Download,
  PieChart,
  ReceiptText,
  TrendingUp,
} from 'lucide-react';
import { SCREENER_FUNDS, ScreenerFundRecord } from '../utils/screenerEngine';
import {
  buildFundTearsheetMarkdown,
  computeFundPeerRankings,
  computeFundRollingReturns,
  computeFundSipVsLumpsum,
  computeRedemptionTaxEstimate,
} from '../utils/fundTerminalToolsEngine';

export interface TerminalQuantToolboxProps {
  activeFund: ScreenerFundRecord;
  onSendToAllocator?: (symbol: string) => void;
}

export const TerminalQuantToolbox: React.FC<TerminalQuantToolboxProps> = ({
  activeFund,
  onSendToAllocator,
}) => {
  const [monthlySip, setMonthlySip] = useState<number>(15_000);
  const [annualStepUpPct, setAnnualStepUpPct] = useState<number>(10);
  const [sipHorizonYears, setSipHorizonYears] = useState<number>(10);

  const [taxInvestedAmount, setTaxInvestedAmount] = useState<number>(500_000);
  const [taxHoldingMonths, setTaxHoldingMonths] = useState<number>(36);
  const [taxMarginalSlabPct, setTaxMarginalSlabPct] = useState<number>(30);
  const [exportedNote, setExportedNote] = useState<boolean>(false);

  const currencyPrefix = activeFund.currency === 'INR' ? '₹' : '$';

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

  const rolling = useMemo(() => computeFundRollingReturns(activeFund), [activeFund]);
  const rankings = useMemo(
    () => computeFundPeerRankings(activeFund, SCREENER_FUNDS),
    [activeFund]
  );
  const sipComparison = useMemo(
    () =>
      computeFundSipVsLumpsum(activeFund, {
        monthlySip,
        annualStepUpPct,
        horizonYears: sipHorizonYears,
      }),
    [activeFund, monthlySip, annualStepUpPct, sipHorizonYears]
  );
  const taxEstimate = useMemo(
    () =>
      computeRedemptionTaxEstimate(activeFund, {
        investedAmount: taxInvestedAmount,
        holdingMonths: taxHoldingMonths,
        marginalSlabPct: taxMarginalSlabPct,
      }),
    [activeFund, taxInvestedAmount, taxHoldingMonths, taxMarginalSlabPct]
  );

  const handleExportTearsheet = () => {
    const md = buildFundTearsheetMarkdown(activeFund, rankings, rolling);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financia-tearsheet-${activeFund.symbol}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExportedNote(true);
    window.setTimeout(() => setExportedNote(false), 2500);
  };

  return (
    <div data-testid="terminal-quant-toolbox" className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold">
            Dedicated Fund Quant &amp; SIP Lab · {activeFund.symbol} ({activeFund.instrumentType})
          </div>
          <h2 className="text-lg font-display font-bold text-[#0f172a] mt-0.5">
            {activeFund.name} — Peer Percentiles, Rolling Consistency, SIP vs. Lump Sum &amp; Post-Tax Redemption
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Universe Rank #{rankings.overallRank} of {rankings.universeCount} ({rankings.overallPercentile}th percentile) · TER {activeFund.about.expenseRatioPct.toFixed(2)}% · Net Modeling Rate {sipComparison.netCagrPct.toFixed(2)}%/yr
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onSendToAllocator && (
            <button
              type="button"
              data-testid="quantlab-send-allocator-btn"
              onClick={() => onSendToAllocator(activeFund.symbol)}
              className="h-9 px-3.5 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Allocate {activeFund.symbol} in Portfolio</span>
            </button>
          )}
          <button
            type="button"
            data-testid="quantlab-export-tearsheet-btn"
            onClick={handleExportTearsheet}
            className="h-9 px-3.5 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-xs font-semibold text-[#0f172a] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>{exportedNote ? 'Tearsheet Downloaded' : 'Export Tearsheet (.md)'}</span>
          </button>
        </div>
      </div>

      {/* ROW 1: PEER PERCENTILE SCORECARD (5 cols) + ROLLING RETURNS CONSISTENCY (7 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Peer Percentile Scorecard */}
        <div
          data-testid="quantlab-peer-rankings"
          className="xl:col-span-5 rounded-[14px] bg-white border border-[#e2e8f0] p-5 flex flex-col justify-between gap-4"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#2563eb]" />
                <h3 className="text-sm font-display font-bold text-[#0f172a]">
                  Universe Peer Percentile Scorecard
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-[#2563eb] tabular-nums">
                Rank #{rankings.overallRank}/{rankings.universeCount}
              </span>
            </div>

            <div className="space-y-3">
              {rankings.metrics.map((m) => (
                <div key={m.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-medium text-[#334155]">{m.label}</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-bold text-[#0f172a]">{m.valueLabel}</span>
                      <span className="text-[10.5px] text-[#64748b]">
                        Med {m.universeMedianLabel}
                      </span>
                      <span
                        className={`text-[10.5px] font-bold ${
                          m.verdict === 'Top Quartile'
                            ? 'text-[#059669]'
                            : m.verdict === 'Above Median'
                              ? 'text-[#2563eb]'
                              : 'text-[#d97706]'
                        }`}
                      >
                        #{m.rank} ({m.percentile}p)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#f1f5f9] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(8, m.percentile)}%`,
                        backgroundColor:
                          m.verdict === 'Top Quartile'
                            ? '#059669'
                            : m.verdict === 'Above Median'
                              ? '#2563eb'
                              : '#d97706',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#64748b]">
            <span>Composite Institutional Percentile</span>
            <span className="font-mono font-bold text-[#0f172a] tabular-nums">
              {rankings.overallPercentile}th Percentile
            </span>
          </div>
        </div>

        {/* Rolling Returns Consistency Analyzer */}
        <div
          data-testid="quantlab-rolling-returns"
          className="xl:col-span-7 rounded-[14px] bg-white border border-[#e2e8f0] p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#059669]" />
                <h3 className="text-sm font-display font-bold text-[#0f172a]">
                  1-Year Rolling Returns Consistency ({rolling.window1YCount} Historical Windows)
                </h3>
              </div>
              <p className="text-xs text-[#64748b] mt-0.5">
                Measures return reliability across every trailing 12-month entry point rather than cherry-picking point-to-point dates
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-[#047857]">
              {rolling.consistencyLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { label: 'Min 1Y', value: `${rolling.min1YPct >= 0 ? '+' : ''}${rolling.min1YPct.toFixed(1)}%`, tone: rolling.min1YPct < 0 ? 'text-[#dc2626]' : 'text-[#059669]' },
              { label: 'Median 1Y', value: `${rolling.median1YPct >= 0 ? '+' : ''}${rolling.median1YPct.toFixed(1)}%`, tone: 'text-[#0f172a]' },
              { label: 'Max 1Y', value: `+${rolling.max1YPct.toFixed(1)}%`, tone: 'text-[#059669]' },
              { label: 'Positive %', value: `${rolling.positiveWindowPct.toFixed(0)}%`, tone: 'text-[#2563eb]' },
              { label: 'Beat 12%+', value: `${rolling.beat12HurdlePct.toFixed(0)}%`, tone: 'text-[#0f172a]' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
                <div className="text-[10px] font-mono uppercase text-[#64748b]">{kpi.label}</div>
                <div className={`text-sm font-mono font-bold tabular-nums mt-0.5 ${kpi.tone}`}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>

          <div className="h-[220px] w-full rounded-[10px] border border-[#e2e8f0] bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rolling.points} margin={{ top: 8, right: 14, bottom: 2, left: 2 }}>
                <defs>
                  <linearGradient id="rolling1YFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#64748b' }} minTickGap={20} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} width={46} />
                <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 3" />
                <ReferenceLine y={12} stroke="#059669" strokeDasharray="3 3" />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`,
                    String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#ffffff',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="rolling1YPct"
                  name="1Y Rolling Return %"
                  stroke="#2563eb"
                  strokeWidth={2.2}
                  fill="url(#rolling1YFill)"
                />
                <Line
                  type="monotone"
                  dataKey="rolling3YAnnualPct"
                  name="3Y Rolling CAGR %"
                  stroke="#059669"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 2: LUMP SUM VS SIP VS STEP-UP SIP (7 cols) + POST-TAX REDEMPTION CALCULATOR (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Lump Sum vs SIP vs Step-Up SIP */}
        <div
          data-testid="quantlab-sip-vs-lumpsum"
          className="xl:col-span-7 rounded-[14px] bg-white border border-[#e2e8f0] p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#2563eb]" />
                <h3 className="text-sm font-display font-bold text-[#0f172a]">
                  Lump Sum vs. Monthly SIP vs. Step-Up SIP Simulator — {activeFund.symbol}
                </h3>
              </div>
              <p className="text-xs text-[#64748b] mt-0.5">
                Compares equal-capital day-1 lump sum against disciplined monthly SIP &amp; annual income step-up SIP net of {activeFund.about.expenseRatioPct.toFixed(2)}% TER
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 flex items-center justify-between gap-2">
              <label htmlFor="quant-sip-input" className="text-xs font-medium text-[#475569]">
                Monthly SIP ({currencyPrefix})
              </label>
              <input
                id="quant-sip-input"
                data-testid="quant-sip-input"
                type="number"
                min={500}
                step={2500}
                value={monthlySip}
                onChange={(e) => setMonthlySip(Math.max(500, Number(e.target.value) || 500))}
                className="w-24 h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
              />
            </div>

            <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 flex items-center justify-between gap-2">
              <label htmlFor="quant-stepup-input" className="text-xs font-medium text-[#475569]">
                Annual Step-Up %
              </label>
              <input
                id="quant-stepup-input"
                data-testid="quant-stepup-input"
                type="number"
                min={0}
                max={30}
                step={5}
                value={annualStepUpPct}
                onChange={(e) => setAnnualStepUpPct(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
                className="w-20 h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
              />
            </div>

            <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#475569]">Horizon</span>
              <div className="inline-flex items-center p-0.5 rounded-[7px] bg-white border border-[#cbd5e1]">
                {[3, 5, 10, 15, 20].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSipHorizonYears(yr)}
                    className={`px-1.5 py-1 rounded-[5px] text-[10.5px] font-mono font-semibold cursor-pointer ${
                      sipHorizonYears === yr
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Standard Monthly SIP</div>
              <div className="text-base font-mono font-bold text-[#2563eb] tabular-nums mt-0.5">
                {formatFull(sipComparison.sipEnding)}
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                {sipComparison.sipGainMultiple.toFixed(2)}x on {formatCompact(sipComparison.totalInvestedStandard)}
              </div>
            </div>

            <div className="rounded-[10px] border border-[#a7f3d0] bg-[#ecfdf5]/60 p-3">
              <div className="text-[10px] font-mono uppercase text-[#047857]">Step-Up SIP (+{annualStepUpPct}%/yr)</div>
              <div className="text-base font-mono font-bold text-[#047857] tabular-nums mt-0.5">
                {formatFull(sipComparison.stepUpSipEnding)}
              </div>
              <div className="text-[11px] font-mono text-[#475569]">
                {sipComparison.stepUpGainMultiple.toFixed(2)}x on {formatCompact(sipComparison.totalInvestedStepUp)}
              </div>
            </div>

            <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff]/60 p-3">
              <div className="text-[10px] font-mono uppercase text-[#1d4ed8]">Equal-Capital Lump Sum</div>
              <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                {formatFull(sipComparison.lumpSumEnding)}
              </div>
              <div className="text-[11px] font-mono text-[#475569]">
                Day-1 {formatCompact(sipComparison.totalInvestedStandard)} deployed
              </div>
            </div>
          </div>

          <div className="h-[220px] w-full rounded-[10px] border border-[#e2e8f0] bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sipComparison.points} margin={{ top: 8, right: 14, bottom: 2, left: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="yearLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#64748b' }} width={62} />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [formatFull(Number(value)), String(name)]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#ffffff',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="lumpSumValue" name="Day-1 Lump Sum" stroke="#0f172a" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="stepUpSipValue" name={`Step-Up SIP (+${annualStepUpPct}%)`} stroke="#059669" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="sipValue" name="Standard Monthly SIP" stroke="#2563eb" strokeWidth={2.2} dot={false} />
                <Line type="monotone" dataKey="investedTotal" name="Standard Principal" stroke="#94a3b8" strokeWidth={1.3} strokeDasharray="2 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Post-Tax Redemption & Exit-Load Calculator */}
        <div
          data-testid="quantlab-tax-calculator"
          className="xl:col-span-5 rounded-[14px] bg-white border border-[#e2e8f0] p-5 flex flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-[#2563eb]" />
                <h3 className="text-sm font-display font-bold text-[#0f172a]">
                  Post-Tax Redemption &amp; Exit-Load Estimator
                </h3>
              </div>
              <Calculator className="w-4 h-4 text-[#64748b]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-2.5 space-y-1">
                <label htmlFor="tax-invested-input" className="text-[11px] font-medium text-[#475569] block">
                  Invested Principal ({currencyPrefix})
                </label>
                <input
                  id="tax-invested-input"
                  data-testid="tax-invested-input"
                  type="number"
                  min={10000}
                  step={50000}
                  value={taxInvestedAmount}
                  onChange={(e) => setTaxInvestedAmount(Math.max(10000, Number(e.target.value) || 10000))}
                  className="w-full h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
                />
              </div>

              <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-2.5 space-y-1">
                <label htmlFor="tax-slab-input" className="text-[11px] font-medium text-[#475569] block">
                  Debt / Slab Tax Rate (%)
                </label>
                <input
                  id="tax-slab-input"
                  type="number"
                  min={5}
                  max={39}
                  step={5}
                  value={taxMarginalSlabPct}
                  onChange={(e) => setTaxMarginalSlabPct(Math.max(5, Math.min(39, Number(e.target.value) || 30)))}
                  className="w-full h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
                />
              </div>
            </div>

            <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="tax-holding-slider" className="font-medium text-[#475569]">
                  Holding Period: <strong className="font-mono text-[#0f172a]">{taxHoldingMonths} Months ({(taxHoldingMonths / 12).toFixed(1)}Y)</strong>
                </label>
                <div className="inline-flex items-center gap-1">
                  {[6, 12, 24, 36, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-testid={`tax-holding-${m}m`}
                      onClick={() => setTaxHoldingMonths(m)}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-mono font-semibold cursor-pointer ${
                        taxHoldingMonths === m
                          ? 'bg-[#0f172a] text-white'
                          : 'bg-white border border-[#cbd5e1] text-[#475569]'
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="tax-holding-slider"
                type="range"
                min={1}
                max={120}
                step={1}
                value={taxHoldingMonths}
                onChange={(e) => setTaxHoldingMonths(Number(e.target.value))}
                className="w-full accent-[#2563eb] h-1.5 cursor-pointer"
              />
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] divide-y divide-[#f1f5f9] text-xs font-mono tabular-nums">
              <div className="px-3.5 py-2 flex items-center justify-between">
                <span className="font-sans text-[#475569]">Estimated Redemption Value</span>
                <span className="font-bold text-[#0f172a]">{formatFull(taxEstimate.currentValue)}</span>
              </div>
              <div className="px-3.5 py-2 flex items-center justify-between">
                <span className="font-sans text-[#475569]">Gross Capital Gain</span>
                <span className="font-semibold text-[#059669]">+{formatFull(taxEstimate.grossGain)}</span>
              </div>
              <div className="px-3.5 py-2 flex items-center justify-between">
                <span className="font-sans text-[#475569]">Tax Regime &amp; Rate</span>
                <span className="font-semibold text-[#1d4ed8]">
                  {taxEstimate.taxClass} ({taxEstimate.taxRatePct}%)
                </span>
              </div>
              <div className="px-3.5 py-2 flex items-center justify-between">
                <span className="font-sans text-[#475569]">Exit Load ({taxEstimate.exitLoadPct.toFixed(1)}%)</span>
                <span className={taxEstimate.exitLoadAmount > 0 ? 'text-[#dc2626] font-semibold' : 'text-[#64748b]'}>
                  -{formatFull(taxEstimate.exitLoadAmount)}
                </span>
              </div>
              {taxEstimate.exemptionApplied > 0 && (
                <div className="px-3.5 py-2 flex items-center justify-between bg-[#ecfdf5]/40">
                  <span className="font-sans text-[#047857]">LTCG Exemption Applied</span>
                  <span className="font-semibold text-[#047857]">+{formatFull(taxEstimate.exemptionApplied)} exempt</span>
                </div>
              )}
              <div className="px-3.5 py-2 flex items-center justify-between">
                <span className="font-sans text-[#475569]">Estimated Capital Gains Tax</span>
                <span className="font-semibold text-[#dc2626]">-{formatFull(taxEstimate.estimatedTax)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[10px] border border-[#a7f3d0] bg-[#ecfdf5]/70 p-3.5 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#047857]">Net In-Hand Post-Tax Payout</div>
              <div
                data-testid="tax-net-payout"
                className="text-xl font-mono font-bold text-[#047857] tabular-nums mt-0.5"
              >
                {formatFull(taxEstimate.netPostTaxPayout)}
              </div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-xs font-bold text-[#0f172a]">
                {taxEstimate.postTaxCagrPct.toFixed(2)}% Post-Tax CAGR
              </div>
              <div className="text-[11px] text-[#047857]">
                Net Profit +{formatCompact(taxEstimate.netProfitAfterTax)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
