import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeftRight,
  GitCompare,
  Layers,
  Newspaper,
  PieChart,
  Scale,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { SCREENER_FUNDS, ScreenerFundRecord } from '../utils/screenerEngine';
import { buildHistoricalPortfolioReplay } from '../utils/portfolioAllocatorEngine';
import { buildCrossFundComparison } from '../utils/rebalanceEngine';
import { TerminalComparisonWorkbench } from './TerminalComparisonWorkbench';

export interface TerminalCrossFundComparePanelProps {
  primarySymbol: string;
  comparisonTickers: string[];
  analysisMode: 'single' | 'multi';
  onSwitchAnalysisMode: (mode: 'single' | 'multi') => void;
  onSelectPrimary: (symbol: string) => void;
  onChangeComparisonTickers: (next: string[]) => void;
}

const CROSS_ASSET_PRESETS: Array<{ label: string; a: string; b: string; note: string }> = [
  { label: 'PPFAS (Flexi MF) vs QQQ (US Tech ETF)', a: 'PPFAS', b: 'QQQ', note: 'India MF vs US ETF' },
  { label: 'QUANTSC (Small Cap) vs GOLDBEES (Gold)', a: 'QUANTSC', b: 'GOLDBEES', note: 'Equity vs Bullion' },
  { label: 'HDFCMID (Mid Cap MF) vs SBIGILT (Gilt)', a: 'HDFCMID', b: 'SBIGILT', note: 'Equity vs Sovereign Debt' },
  { label: 'NIFTYBEES (India ETF) vs VTI (US ETF)', a: 'NIFTYBEES', b: 'VTI', note: 'India vs US Market' },
];

export const TerminalCrossFundComparePanel: React.FC<
  TerminalCrossFundComparePanelProps
> = ({
  primarySymbol,
  comparisonTickers,
  analysisMode,
  onSwitchAnalysisMode,
  onSelectPrimary,
  onChangeComparisonTickers,
}) => {
  const [subMode, setSubMode] = useState<'two-fund' | 'multi-studio'>('two-fund');

  const resolvedInitialA = useMemo(() => {
    return SCREENER_FUNDS.some((f) => f.symbol === primarySymbol)
      ? primarySymbol
      : 'PPFAS';
  }, [primarySymbol]);

  const resolvedInitialB = useMemo(() => {
    const firstPeer = comparisonTickers.find(
      (sym) => sym !== resolvedInitialA && SCREENER_FUNDS.some((f) => f.symbol === sym)
    );
    if (firstPeer) return firstPeer;
    return resolvedInitialA === 'QQQ' ? 'PPFAS' : 'QQQ';
  }, [comparisonTickers, resolvedInitialA]);

  const [symbolA, setSymbolA] = useState<string>(resolvedInitialA);
  const [symbolB, setSymbolB] = useState<string>(resolvedInitialB);
  const [horizonYears, setHorizonYears] = useState<number>(5);
  const [baseInvestment, setBaseInvestment] = useState<number>(100_000);

  const fundA: ScreenerFundRecord = useMemo(
    () => SCREENER_FUNDS.find((f) => f.symbol === symbolA) || SCREENER_FUNDS[0],
    [symbolA]
  );
  const fundB: ScreenerFundRecord = useMemo(
    () => SCREENER_FUNDS.find((f) => f.symbol === symbolB) || SCREENER_FUNDS[1],
    [symbolB]
  );

  const comparison = useMemo(
    () => buildCrossFundComparison(fundA, fundB, horizonYears, baseInvestment),
    [fundA, fundB, horizonYears, baseInvestment]
  );

  // Rebased historical monthly trajectory for Fund A vs Fund B
  const historicalReplay = useMemo(
    () => buildHistoricalPortfolioReplay([fundA, fundB], { [fundA.symbol]: 50, [fundB.symbol]: 50 }, 100_000),
    [fundA, fundB]
  );

  const currencyPrefix = fundA.currency === 'USD' && fundB.currency === 'USD' ? '$' : '₹';

  const formatMoney = (v: number) => `${currencyPrefix}${Math.round(v).toLocaleString('en-US')}`;
  const formatCompact = (v: number) => {
    if (v >= 10_000_000) return `${currencyPrefix}${(v / 10_000_000).toFixed(2)}Cr`;
    if (v >= 1_000_000) return `${currencyPrefix}${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${currencyPrefix}${Math.round(v / 1_000)}k`;
    return `${currencyPrefix}${Math.round(v)}`;
  };

  const handleSwap = () => {
    setSymbolA(symbolB);
    setSymbolB(symbolA);
  };

  const handleApplyPreset = (a: string, b: string) => {
    setSymbolA(a);
    setSymbolB(b);
    onSelectPrimary(a);
    onChangeComparisonTickers([b]);
  };

  return (
    <div data-testid="terminal-cross-fund-compare" className="space-y-5">
      {/* Sub-Mode Switcher Header */}
      <div className="rounded-[14px] bg-white border border-[#e2e8f0] p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold">
            Section 2 · Unrestricted Cross-Instrument Comparison (Sector &amp; Type Independent)
          </div>
          <h2 className="text-lg font-display font-bold text-[#0f172a] mt-0.5">
            Compare Any Two Instruments — Mutual Funds, ETFs, Gold &amp; Sovereign Debt
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Pick any two funds regardless of sector or MF/ETF structure to compare validation ratios, historical returns, sector overlap, expected future returns, and live news side by side.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Comparison view mode"
          className="inline-flex items-center p-1 rounded-[9px] bg-[#f1f5f9] border border-[#e2e8f0] shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subMode === 'two-fund'}
            data-testid="compare-submode-two"
            onClick={() => setSubMode('two-fund')}
            className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              subMode === 'two-fund'
                ? 'bg-[#0f172a] text-white'
                : 'text-[#475569] hover:text-[#0f172a]'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Any Two Funds (Head-to-Head)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subMode === 'multi-studio'}
            data-testid="compare-submode-multi"
            onClick={() => setSubMode('multi-studio')}
            className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              subMode === 'multi-studio'
                ? 'bg-[#2563eb] text-white'
                : 'text-[#475569] hover:text-[#0f172a]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Fund Studio (2–4)</span>
          </button>
        </div>
      </div>

      {subMode === 'multi-studio' ? (
        <TerminalComparisonWorkbench
          primarySymbol={primarySymbol}
          comparisonTickers={comparisonTickers}
          analysisMode={analysisMode}
          embeddedInTab
          onSwitchAnalysisMode={onSwitchAnalysisMode}
          onSelectPrimary={onSelectPrimary}
          onChangeComparisonTickers={onChangeComparisonTickers}
        />
      ) : (
        <div className="space-y-6">
          {/* Unrestricted Fund A vs Fund B Selector Card */}
          <div className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
              {/* Fund A Picker */}
              <div className="md:col-span-5 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff]/50 p-3.5">
                <div className="flex items-center justify-between text-[10.5px] font-mono uppercase text-[#1d4ed8] font-semibold mb-1.5">
                  <span>Instrument A (Any Sector / Type)</span>
                  <span>
                    {fundA.instrumentType} · {fundA.category}
                  </span>
                </div>
                <select
                  aria-label="Select Instrument A for cross-fund comparison"
                  data-testid="cross-compare-select-a"
                  value={symbolA}
                  onChange={(e) => {
                    setSymbolA(e.target.value);
                    onSelectPrimary(e.target.value);
                  }}
                  className="w-full h-9 rounded-[8px] border border-[#93c5fd] bg-white px-3 text-xs font-semibold text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer"
                >
                  {SCREENER_FUNDS.map((f) => (
                    <option key={f.symbol} value={f.symbol}>
                      {f.symbol} — {f.name} ({f.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'} · {f.category})
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center justify-between text-xs font-mono text-[#334155]">
                  <span>
                    {fundA.currency === 'INR' ? '₹' : '$'}
                    {fundA.price.toFixed(2)} · AUM {fundA.keyStats.aumLabel}
                  </span>
                  <span className="font-bold text-[#1d4ed8]">
                    Score {comparison.validationScoreA}/100
                  </span>
                </div>
              </div>

              {/* Swap Button */}
              <div className="md:col-span-1 flex justify-center">
                <button
                  type="button"
                  data-testid="cross-compare-swap-btn"
                  onClick={handleSwap}
                  aria-label="Swap Instrument A and Instrument B"
                  className="w-10 h-10 rounded-full border border-[#cbd5e1] bg-[#f8fafc] hover:bg-[#0f172a] hover:text-white text-[#334155] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              {/* Fund B Picker */}
              <div className="md:col-span-5 rounded-[10px] border border-[#a7f3d0] bg-[#ecfdf5]/50 p-3.5">
                <div className="flex items-center justify-between text-[10.5px] font-mono uppercase text-[#047857] font-semibold mb-1.5">
                  <span>Instrument B (Any Sector / Type)</span>
                  <span>
                    {fundB.instrumentType} · {fundB.category}
                  </span>
                </div>
                <select
                  aria-label="Select Instrument B for cross-fund comparison"
                  data-testid="cross-compare-select-b"
                  value={symbolB}
                  onChange={(e) => {
                    setSymbolB(e.target.value);
                    onChangeComparisonTickers([e.target.value]);
                  }}
                  className="w-full h-9 rounded-[8px] border border-[#6ee7b7] bg-white px-3 text-xs font-semibold text-[#0f172a] focus:outline-none focus:border-[#059669] cursor-pointer"
                >
                  {SCREENER_FUNDS.map((f) => (
                    <option key={f.symbol} value={f.symbol}>
                      {f.symbol} — {f.name} ({f.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'} · {f.category})
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center justify-between text-xs font-mono text-[#334155]">
                  <span>
                    {fundB.currency === 'INR' ? '₹' : '$'}
                    {fundB.price.toFixed(2)} · AUM {fundB.keyStats.aumLabel}
                  </span>
                  <span className="font-bold text-[#047857]">
                    Score {comparison.validationScoreB}/100
                  </span>
                </div>
              </div>
            </div>

            {/* Cross-Asset Quick Presets + Independence Tags */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#f1f5f9]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono text-[#64748b] mr-1">Cross-Asset Presets:</span>
                {CROSS_ASSET_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p.a, p.b)}
                    className="px-2.5 py-1 rounded-[7px] border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eff6ff] hover:border-[#bfdbfe] text-[11px] font-medium text-[#334155] cursor-pointer"
                  >
                    {p.a} vs {p.b} <span className="text-[#64748b]">· {p.note}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                {comparison.isCrossType && (
                  <span className="px-2 py-0.5 rounded bg-[#eff6ff] text-[#1d4ed8] font-semibold">
                    Cross-Type (MF vs ETF)
                  </span>
                )}
                {comparison.isCrossSector && (
                  <span className="px-2 py-0.5 rounded bg-[#f5f3ff] text-[#6d28d9] font-semibold">
                    Cross-Sector
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 1. VALIDATION & RISK RATIOS MATRIX + 2. HISTORICAL RETURNS */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Ratios Table (7 cols) */}
            <section
              data-testid="cross-compare-ratios"
              className="xl:col-span-7 rounded-[14px] bg-white border border-[#e2e8f0] overflow-hidden shadow-xs"
            >
              <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#2563eb]" />
                  <span>1. Ratios &amp; Risk-Adjusted Validation Matrix</span>
                </h3>
                <div className="text-xs font-mono font-bold tabular-nums">
                  <span className="text-[#1d4ed8]">{fundA.symbol}: {comparison.ratioWinsA}</span>
                  <span className="text-[#94a3b8] mx-1.5">vs</span>
                  <span className="text-[#047857]">{fundB.symbol}: {comparison.ratioWinsB}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-white text-[10.5px] font-mono uppercase text-[#64748b]">
                      <th className="py-2.5 px-4">Metric</th>
                      <th className="py-2.5 px-3 text-right text-[#1d4ed8]">{fundA.symbol}</th>
                      <th className="py-2.5 px-3 text-right text-[#047857]">{fundB.symbol}</th>
                      <th className="py-2.5 px-4 text-right">Edge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9] font-mono tabular-nums">
                    {comparison.ratios.map((row) => (
                      <tr key={row.key} className="hover:bg-[#f8fafc]">
                        <td className="py-2.5 px-4 font-sans font-medium text-[#1e293b]">
                          {row.label}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right ${
                            row.winner === 'A'
                              ? 'font-bold text-[#1d4ed8] bg-[#eff6ff]/50'
                              : 'text-[#334155]'
                          }`}
                        >
                          {row.displayA}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right ${
                            row.winner === 'B'
                              ? 'font-bold text-[#047857] bg-[#ecfdf5]/50'
                              : 'text-[#334155]'
                          }`}
                        >
                          {row.displayB}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {row.winner === 'TIE' ? (
                            <span className="text-[10.5px] text-[#94a3b8]">Tie</span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                                row.winner === 'A'
                                  ? 'bg-[#eff6ff] text-[#1d4ed8]'
                                  : 'bg-[#ecfdf5] text-[#047857]'
                              }`}
                            >
                              {row.winner === 'A' ? fundA.symbol : fundB.symbol}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Historical Returns Table + Rebased Curve (5 cols) */}
            <section
              data-testid="cross-compare-returns"
              className="xl:col-span-5 rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div>
                <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#059669]" />
                  <span>2. Historical Returns Comparison</span>
                </h3>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[10.5px] font-mono uppercase text-[#64748b]">
                      <th className="py-2 pr-2">Horizon</th>
                      <th className="py-2 px-2 text-right text-[#1d4ed8]">{fundA.symbol}</th>
                      <th className="py-2 px-2 text-right text-[#047857]">{fundB.symbol}</th>
                      <th className="py-2 pl-2 text-right">Leader</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9] font-mono tabular-nums">
                    {comparison.returns.map((r) => (
                      <tr key={r.period}>
                        <td className="py-2 pr-2 font-sans font-semibold text-[#334155]">
                          {r.period}
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-semibold ${
                            (r.valueA ?? 0) >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                          }`}
                        >
                          {r.valueA === null
                            ? '—'
                            : `${r.valueA >= 0 ? '+' : ''}${r.valueA.toFixed(1)}%`}
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-semibold ${
                            (r.valueB ?? 0) >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                          }`}
                        >
                          {r.valueB === null
                            ? '—'
                            : `${r.valueB >= 0 ? '+' : ''}${r.valueB.toFixed(1)}%`}
                        </td>
                        <td className="py-2 pl-2 text-right text-[10.5px] font-bold text-[#0f172a]">
                          {r.winner === 'TIE'
                            ? '—'
                            : r.winner === 'A'
                              ? fundA.symbol
                              : fundB.symbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <div className="text-[11px] font-mono uppercase text-[#64748b] mb-2">
                  Rebased Historical Growth (Start = 100)
                </div>
                <div className="h-[180px] w-full rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc]/40 p-1.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historicalReplay.points}
                      margin={{ top: 6, right: 12, bottom: 2, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={22} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} width={42} />
                      <Tooltip
                        formatter={(v: unknown, n: unknown) => [Number(v).toFixed(1), String(n)]}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          color: '#ffffff',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line
                        type="monotone"
                        dataKey={`idx_${fundA.symbol}`}
                        name={fundA.symbol}
                        stroke="#2563eb"
                        strokeWidth={2.2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey={`idx_${fundB.symbol}`}
                        name={fundB.symbol}
                        stroke="#059669"
                        strokeWidth={2.2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </div>

          {/* 3. SECTOR DISTRIBUTION COMPARISON + 4. EXPECTED FUTURE RETURNS */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* 3. Sector Distribution Invested In (6 cols) */}
            <section
              data-testid="cross-compare-sectors"
              className="xl:col-span-6 rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[#2563eb]" />
                    <span>3. Sectors Invested In &amp; Overlap Analysis</span>
                  </h3>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Side-by-side sector weights across the union of both instruments
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
                  <span className="px-2 py-0.5 rounded bg-[#f1f5f9] text-[#334155] font-semibold">
                    Overlap: {comparison.sectorOverlapPct.toFixed(1)}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#ecfdf5] text-[#047857] font-bold">
                    Diversification: {comparison.diversificationScore}/100
                  </span>
                </div>
              </div>

              <div className="h-[290px] w-full rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc]/40 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparison.sectors.slice(0, 8)}
                    margin={{ top: 10, right: 12, bottom: 16, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="sector"
                      tick={{ fontSize: 10, fill: '#475569' }}
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                      height={62}
                    />
                    <YAxis
                      unit="%"
                      tick={{ fontSize: 10.5, fill: '#64748b' }}
                      width={42}
                    />
                    <Tooltip
                      formatter={(v: unknown, n: unknown) => [`${Number(v).toFixed(1)}%`, String(n)]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#ffffff',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="weightA" name={fundA.symbol} fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="weightB" name={fundB.symbol} fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* 4. Expected Return in Future (6 cols) */}
            <section
              data-testid="cross-compare-future"
              className="xl:col-span-6 rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#2563eb]" />
                    <span>4. Expected Return in Future ({horizonYears}Y Forecast)</span>
                  </h3>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Mean-reversion moderated net CAGR &amp; Bull/Bear forward wealth projection
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    aria-label="Comparison base investment amount"
                    min={10000}
                    step={25000}
                    value={baseInvestment}
                    onChange={(e) => setBaseInvestment(Math.max(10000, Number(e.target.value) || 10000))}
                    className="w-24 h-7 px-2 rounded-[6px] border border-[#cbd5e1] bg-[#f8fafc] text-right font-mono text-xs font-semibold text-[#0f172a] tabular-nums"
                  />
                  <div className="inline-flex items-center p-0.5 rounded-[7px] bg-[#f1f5f9] border border-[#e2e8f0]">
                    {[1, 3, 5, 10].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        data-testid={`cross-future-horizon-${yr}y`}
                        onClick={() => setHorizonYears(yr)}
                        className={`px-2 py-0.5 rounded-[5px] text-[11px] font-mono font-semibold cursor-pointer ${
                          horizonYears === yr
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

              {/* Dual Future KPI Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff]/60 p-3">
                  <div className="text-[10.5px] font-mono uppercase text-[#1d4ed8] font-semibold">
                    {fundA.symbol} Expected Net CAGR
                  </div>
                  <div className="text-lg font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                    +{comparison.expectedFuture.expectedNetCagrA.toFixed(2)}% / yr
                  </div>
                  <div className="text-[11px] font-mono text-[#334155] tabular-nums mt-0.5">
                    {horizonYears}Y Base: <strong>{formatMoney(comparison.expectedFuture.endingBaseA)}</strong>
                  </div>
                  <div className="text-[10px] font-mono text-[#64748b] tabular-nums">
                    Bull {comparison.expectedFuture.bullCagrA.toFixed(1)}% · Bear {comparison.expectedFuture.bearCagrA.toFixed(1)}%
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#a7f3d0] bg-[#ecfdf5]/60 p-3">
                  <div className="text-[10.5px] font-mono uppercase text-[#047857] font-semibold">
                    {fundB.symbol} Expected Net CAGR
                  </div>
                  <div className="text-lg font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                    +{comparison.expectedFuture.expectedNetCagrB.toFixed(2)}% / yr
                  </div>
                  <div className="text-[11px] font-mono text-[#334155] tabular-nums mt-0.5">
                    {horizonYears}Y Base: <strong>{formatMoney(comparison.expectedFuture.endingBaseB)}</strong>
                  </div>
                  <div className="text-[10px] font-mono text-[#64748b] tabular-nums">
                    Bull {comparison.expectedFuture.bullCagrB.toFixed(1)}% · Bear {comparison.expectedFuture.bearCagrB.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Forward Projection Line Chart */}
              <div className="h-[178px] w-full rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc]/40 p-1.5">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={comparison.expectedFuture.timeline}
                    margin={{ top: 8, right: 14, bottom: 2, left: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#64748b' }} />
                    <YAxis
                      tickFormatter={formatCompact}
                      tick={{ fontSize: 10.5, fill: '#64748b' }}
                      width={56}
                    />
                    <Tooltip
                      formatter={(v: unknown, n: unknown) => [formatMoney(Number(v)), String(n)]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        color: '#ffffff',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="baseA"
                      name={`${fundA.symbol} Base`}
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 2.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="baseB"
                      name={`${fundB.symbol} Base`}
                      stroke="#059669"
                      strokeWidth={2.5}
                      dot={{ r: 2.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bullA"
                      name={`${fundA.symbol} Bull`}
                      stroke="#60a5fa"
                      strokeWidth={1.3}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="bullB"
                      name={`${fundB.symbol} Bull`}
                      stroke="#34d399"
                      strokeWidth={1.3}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* 5. SIDE-BY-SIDE NEWS ABOUT BOTH INSTRUMENTS */}
          <section
            data-testid="cross-compare-news"
            className="rounded-[14px] bg-white border border-[#e2e8f0] p-5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#e2e8f0]">
              <h3 className="text-[15px] font-display font-bold text-[#0f172a] flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-[#2563eb]" />
                <span>5. Latest News &amp; Catalysts — {fundA.symbol} vs {fundB.symbol}</span>
              </h3>
              <span className="text-[11px] font-mono text-[#64748b]">
                Side-by-Side Instrument Feed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Fund A News */}
              <div className="space-y-2.5">
                <div className="text-xs font-mono font-bold text-[#1d4ed8] uppercase">
                  {fundA.symbol} · {fundA.name}
                </div>
                {comparison.newsA.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-[9px] border border-[#dbeafe] bg-[#f8fbff] p-3"
                  >
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-[#64748b] mb-1">
                      <span>{item.source}</span>
                      <span>{item.age}</span>
                    </div>
                    <p className="text-xs font-medium text-[#0f172a] leading-relaxed">
                      {item.headline}
                    </p>
                  </div>
                ))}
              </div>

              {/* Fund B News */}
              <div className="space-y-2.5">
                <div className="text-xs font-mono font-bold text-[#047857] uppercase">
                  {fundB.symbol} · {fundB.name}
                </div>
                {comparison.newsB.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-[9px] border border-[#a7f3d0] bg-[#f8fffb] p-3"
                  >
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-[#64748b] mb-1">
                      <span>{item.source}</span>
                      <span>{item.age}</span>
                    </div>
                    <p className="text-xs font-medium text-[#0f172a] leading-relaxed">
                      {item.headline}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
