import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircle2,
  Download,
  History,
  PieChart,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { SCREENER_FUNDS, ScreenerFundRecord } from '../utils/screenerEngine';
import { computeMinVarWeights } from '../utils/riskAnalyticsEngine';
import {
  buildAllocationProjectionCsv,
  buildHistoricalPortfolioReplay,
  buildProjectedPortfolioPerformance,
  computeMaxSharpeWeights,
  normalizeAllocationWeights,
} from '../utils/portfolioAllocatorEngine';
import {
  buildRebalanceCsv,
  computePortfolioRebalancePlan,
  simulateRealisticMarketDrift,
} from '../utils/rebalanceEngine';

const ALLOC_COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
  '#4f46e5',
  '#0d9488',
];

const ALLOCATOR_PRESETS: Array<{
  label: string;
  weights: Record<string, number>;
}> = [
  {
    label: 'Core India + Gold',
    weights: { PPFAS: 40, NIFTYBEES: 30, GOLDBEES: 20, HDFCCORP: 10 },
  },
  {
    label: 'High Growth Equity',
    weights: { QUANTSC: 35, HDFCMID: 35, BANKBEES: 20, GOLDBEES: 10 },
  },
  {
    label: 'Global US ETF Core',
    weights: { QQQ: 40, VTI: 35, GLD: 15, TLT: 10 },
  },
  {
    label: 'Defensive Income & Bullion',
    weights: { HDFCCORP: 40, SBIGILT: 25, GOLDBEES: 25, LIQUIDBEES: 10 },
  },
];

export interface TerminalPortfolioAllocatorProps {
  initialSymbols?: string[];
  embedded?: boolean;
  onSyncSymbols?: (symbols: string[]) => void;
}

export const TerminalPortfolioAllocator: React.FC<TerminalPortfolioAllocatorProps> = ({
  initialSymbols,
  embedded = false,
}) => {
  const resolvedInitialSymbols = useMemo(() => {
    const valid = (initialSymbols || [])
      .map((s) => s.trim().toUpperCase())
      .filter((s, idx, arr) => arr.indexOf(s) === idx && SCREENER_FUNDS.some((f) => f.symbol === s));
    if (valid.length >= 2) return valid.slice(0, 6);
    return ['PPFAS', 'NIFTYBEES', 'GOLDBEES', 'HDFCCORP'];
  }, [initialSymbols]);

  const initialKey = resolvedInitialSymbols.join('|');

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(resolvedInitialSymbols);
  const [rawWeights, setRawWeights] = useState<Record<string, number>>(() =>
    normalizeAllocationWeights(resolvedInitialSymbols, {})
  );
  const [addPicker, setAddPicker] = useState<string>('');
  const [startingCapital, setStartingCapital] = useState<number>(500_000);
  const [monthlySip, setMonthlySip] = useState<number>(10_000);
  const [horizonYears, setHorizonYears] = useState<number>(10);
  const [overlayFunds, setOverlayFunds] = useState<boolean>(false);
  const [showRebalancePanel, setShowRebalancePanel] = useState<boolean>(false);
  const [rebalanceAppliedToast, setRebalanceAppliedToast] = useState<boolean>(false);
  const [currentHoldingsMap, setCurrentHoldingsMap] = useState<Record<string, number>>(() => {
    const initialFunds = resolvedInitialSymbols
      .map((sym) => SCREENER_FUNDS.find((f) => f.symbol === sym))
      .filter((f): f is ScreenerFundRecord => Boolean(f));
    const norm = normalizeAllocationWeights(resolvedInitialSymbols, {});
    return simulateRealisticMarketDrift(initialFunds, norm, 500_000);
  });

  // Sync only when initialSymbols changes explicitly from Screener parent
  useEffect(() => {
    if (!embedded) return;
    setSelectedSymbols(resolvedInitialSymbols);
    const norm = normalizeAllocationWeights(resolvedInitialSymbols, {});
    setRawWeights(norm);
    const syncedFunds = resolvedInitialSymbols
      .map((sym) => SCREENER_FUNDS.find((f) => f.symbol === sym))
      .filter((f): f is ScreenerFundRecord => Boolean(f));
    setCurrentHoldingsMap(simulateRealisticMarketDrift(syncedFunds, norm, startingCapital));
  }, [initialKey, embedded, startingCapital]);

  const selectedFunds: ScreenerFundRecord[] = useMemo(() => {
    return selectedSymbols
      .map((sym) => SCREENER_FUNDS.find((f) => f.symbol === sym))
      .filter((f): f is ScreenerFundRecord => Boolean(f));
  }, [selectedSymbols]);

  const availableToAdd = useMemo(() => {
    const set = new Set(selectedSymbols);
    return SCREENER_FUNDS.filter((f) => !set.has(f.symbol));
  }, [selectedSymbols]);

  const rawTotalPct = useMemo(
    () =>
      Number(
        selectedSymbols
          .reduce((sum, sym) => sum + Math.max(0, Number(rawWeights[sym]) || 0), 0)
          .toFixed(1)
      ),
    [selectedSymbols, rawWeights]
  );

  const normalizedWeights = useMemo(
    () => normalizeAllocationWeights(selectedSymbols, rawWeights),
    [selectedSymbols, rawWeights]
  );

  const historicalReplay = useMemo(
    () => buildHistoricalPortfolioReplay(selectedFunds, normalizedWeights, startingCapital),
    [selectedFunds, normalizedWeights, startingCapital]
  );

  const projection = useMemo(
    () =>
      buildProjectedPortfolioPerformance(selectedFunds, normalizedWeights, {
        startingCapital,
        monthlySip,
        horizonYears,
      }),
    [selectedFunds, normalizedWeights, startingCapital, monthlySip, horizonYears]
  );

  const effectiveCurrentHoldings = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of selectedFunds) {
      if (typeof currentHoldingsMap[f.symbol] === 'number' && Number.isFinite(currentHoldingsMap[f.symbol])) {
        map[f.symbol] = Math.max(0, currentHoldingsMap[f.symbol]);
      } else {
        map[f.symbol] = Math.round((startingCapital * (normalizedWeights[f.symbol] ?? 0)) / 100);
      }
    }
    return map;
  }, [selectedFunds, currentHoldingsMap, startingCapital, normalizedWeights]);

  const rebalancePlan = useMemo(
    () =>
      computePortfolioRebalancePlan({
        funds: selectedFunds,
        currentValues: effectiveCurrentHoldings,
        targetWeights: normalizedWeights,
        tolerancePct: 0.25,
      }),
    [selectedFunds, effectiveCurrentHoldings, normalizedWeights]
  );

  const currencyPrefix = selectedFunds.every((f) => f.currency === 'USD') ? '$' : '₹';

  const formatCompact = (v: number) => {
    if (v >= 10_000_000) return `${currencyPrefix}${(v / 10_000_000).toFixed(2)}Cr`;
    if (v >= 1_000_000) return `${currencyPrefix}${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${currencyPrefix}${Math.round(v / 1_000)}k`;
    return `${currencyPrefix}${Math.round(v)}`;
  };

  const formatFull = (v: number) => `${currencyPrefix}${Math.round(v).toLocaleString('en-US')}`;

  const handleAddInstrument = (sym: string) => {
    if (!sym || selectedSymbols.includes(sym) || selectedSymbols.length >= 8) return;
    const nextSymbols = [...selectedSymbols, sym];
    const nextRaw = { ...rawWeights, [sym]: 15 };
    setSelectedSymbols(nextSymbols);
    setRawWeights(normalizeAllocationWeights(nextSymbols, nextRaw));
    setAddPicker('');
  };

  const handleRemoveInstrument = (sym: string) => {
    if (selectedSymbols.length <= 1) return;
    const nextSymbols = selectedSymbols.filter((s) => s !== sym);
    setSelectedSymbols(nextSymbols);
    setRawWeights(normalizeAllocationWeights(nextSymbols, rawWeights));
  };

  const handleSetWeight = (sym: string, val: number) => {
    const safe = Math.min(100, Math.max(0, Number.isFinite(val) ? val : 0));
    setRawWeights((prev) => ({ ...prev, [sym]: safe }));
  };

  const handleNormalize = () => {
    setRawWeights(normalizeAllocationWeights(selectedSymbols, rawWeights));
  };

  const handleEqualWeight = () => {
    setRawWeights(normalizeAllocationWeights(selectedSymbols, {}));
  };

  const handleMinVar = () => {
    setRawWeights(computeMinVarWeights(selectedFunds));
  };

  const handleMaxSharpe = () => {
    setRawWeights(computeMaxSharpeWeights(selectedFunds));
  };

  const handleApplyPreset = (presetWeights: Record<string, number>) => {
    const syms = Object.keys(presetWeights).filter((s) =>
      SCREENER_FUNDS.some((f) => f.symbol === s)
    );
    setSelectedSymbols(syms);
    setRawWeights(presetWeights);
  };

  const handleSimulateDrift = () => {
    setRebalanceAppliedToast(false);
    setCurrentHoldingsMap(
      simulateRealisticMarketDrift(selectedFunds, normalizedWeights, startingCapital)
    );
  };

  const handleApplyRebalanceTrades = () => {
    const next: Record<string, number> = {};
    for (const row of rebalancePlan.rows) {
      next[row.symbol] = Number(row.targetValue.toFixed(2));
    }
    setCurrentHoldingsMap(next);
    setRebalanceAppliedToast(true);
  };

  const handleUpdateCurrentHolding = (sym: string, val: number) => {
    setRebalanceAppliedToast(false);
    setCurrentHoldingsMap((prev) => ({
      ...prev,
      [sym]: Math.max(0, Number.isFinite(val) ? val : 0),
    }));
  };

  const handleExportRebalanceCsv = () => {
    const csv = buildRebalanceCsv(rebalancePlan);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financia-rebalance-trades-${selectedSymbols.join('-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const csv = buildAllocationProjectionCsv(selectedFunds, normalizedWeights, projection);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financia-custom-allocation-${selectedSymbols.join('-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isExact100 = Math.abs(rawTotalPct - 100) <= 0.15;

  return (
    <div
      data-testid="terminal-portfolio-allocator"
      className="rounded-[14px] bg-white border border-[#e2e8f0] overflow-hidden shadow-xs"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold">
            Custom Multi-Asset Portfolio Allocator · Historical Replay &amp; Forward Projection
          </div>
          <h3 className="text-lg font-display font-bold text-[#0f172a] mt-0.5">
            Custom Percentage Allocation &amp; Historical-Based Return Visualizer
          </h3>
          <p className="text-xs text-[#64748b] mt-0.5">
            Assign exact percentage weights across any combination of the {SCREENER_FUNDS.length} ETFs &amp; Mutual Funds to backtest historical monthly returns and project forward wealth bands.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!embedded && initialSymbols && initialSymbols.length >= 2 && (
            <button
              type="button"
              data-testid="allocator-import-basket-btn"
              onClick={() => {
                setSelectedSymbols(resolvedInitialSymbols);
                setRawWeights(normalizeAllocationWeights(resolvedInitialSymbols, {}));
              }}
              className="h-9 px-3 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#eff6ff] hover:border-[#2563eb] text-xs font-semibold text-[#334155] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Import Active Basket</span>
            </button>
          )}
          <button
            type="button"
            data-testid="allocator-rebalance-btn"
            onClick={() => setShowRebalancePanel((prev) => !prev)}
            className={`h-9 px-3.5 rounded-[8px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              showRebalancePanel
                ? 'bg-[#059669] hover:bg-[#047857] text-white'
                : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              {showRebalancePanel
                ? 'Hide Rebalance Plan'
                : `Rebalance (${rebalancePlan.tradesRequiredCount} Trades)`}
            </span>
          </button>
          <button
            type="button"
            data-testid="allocator-export-csv"
            onClick={handleExportCsv}
            className="h-9 px-3 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#f1f5f9] text-xs font-semibold text-[#334155] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Presets + Instrument Adder + Capital & Horizon Controls */}
      <div className="px-5 py-4 border-b border-[#e2e8f0] bg-white space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#64748b] mr-0.5">Presets:</span>
            {ALLOCATOR_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPreset(p.weights)}
                className="px-2.5 py-1 rounded-[7px] border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eff6ff] hover:border-[#bfdbfe] text-[11.5px] font-medium text-[#334155] transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {selectedSymbols.length < 8 && (
            <div className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#2563eb]" />
              <select
                aria-label="Add ETF or Mutual Fund to custom allocation"
                data-testid="allocator-add-fund-select"
                value={addPicker}
                onChange={(e) => handleAddInstrument(e.target.value)}
                className="h-8 rounded-[8px] border border-[#cbd5e1] bg-white px-2.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer"
              >
                <option value="">
                  Add ETF / Mutual Fund ({selectedSymbols.length}/8)...
                </option>
                {availableToAdd.map((f) => (
                  <option key={f.symbol} value={f.symbol}>
                    {f.symbol} — {f.name} ({f.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Capital, Monthly SIP & Horizon Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#f1f5f9]">
          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 flex items-center justify-between gap-2">
            <label htmlFor="allocator-capital-input" className="text-xs font-medium text-[#475569]">
              Initial Capital ({currencyPrefix})
            </label>
            <input
              id="allocator-capital-input"
              data-testid="allocator-capital-input"
              type="number"
              min={10000}
              step={50000}
              value={startingCapital}
              onChange={(e) => setStartingCapital(Math.max(10000, Number(e.target.value) || 10000))}
              className="w-28 h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-semibold text-[#0f172a] tabular-nums"
            />
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 flex items-center justify-between gap-2">
            <label htmlFor="allocator-sip-input" className="text-xs font-medium text-[#475569]">
              Monthly SIP ({currencyPrefix})
            </label>
            <input
              id="allocator-sip-input"
              data-testid="allocator-sip-input"
              type="number"
              min={0}
              step={5000}
              value={monthlySip}
              onChange={(e) => setMonthlySip(Math.max(0, Number(e.target.value) || 0))}
              className="w-28 h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-semibold text-[#0f172a] tabular-nums"
            />
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#475569]">Projection Horizon</span>
            <div
              role="group"
              aria-label="Projection horizon in years"
              className="inline-flex items-center p-0.5 rounded-[7px] bg-white border border-[#cbd5e1]"
            >
              {[1, 3, 5, 10, 15].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  data-testid={`allocator-horizon-${yr}y`}
                  onClick={() => setHorizonYears(yr)}
                  className={`px-2 py-1 rounded-[5px] text-[11px] font-mono font-semibold cursor-pointer ${
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
      </div>

      {/* Main Split: Left Custom % Allocation Editor (5 cols) + Right Projected & Historical Charts (7 cols) */}
      <div className="p-5 grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT 5 COLS: CUSTOM % ALLOCATION BUILDER */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc]/70 p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-sm font-display font-bold text-[#0f172a]">
                <PieChart className="w-4 h-4 text-[#2563eb]" />
                <span>Custom Allocations ({selectedFunds.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  data-testid="allocator-total-pct"
                  className={`px-2 py-0.5 rounded-[6px] border font-mono text-xs font-bold tabular-nums ${
                    isExact100
                      ? 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]'
                      : 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
                  }`}
                >
                  Total: {rawTotalPct.toFixed(1)}%
                </span>
                {!isExact100 && (
                  <button
                    type="button"
                    data-testid="allocator-normalize-btn"
                    onClick={handleNormalize}
                    className="px-2 py-0.5 rounded-[6px] bg-[#2563eb] text-white text-[11px] font-semibold cursor-pointer hover:bg-[#1d4ed8]"
                  >
                    Normalize 100%
                  </button>
                )}
              </div>
            </div>

            {/* Stacked Visual Allocation Ribbon */}
            <div className="h-2.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden flex">
              {selectedFunds.map((f, idx) => {
                const w = normalizedWeights[f.symbol] ?? 0;
                return (
                  <div
                    key={f.symbol}
                    title={`${f.symbol}: ${w.toFixed(1)}%`}
                    style={{
                      width: `${w}%`,
                      backgroundColor: ALLOC_COLORS[idx % ALLOC_COLORS.length],
                    }}
                    className="h-full transition-all duration-200"
                  />
                );
              })}
            </div>

            {/* Quick Optimization Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-testid="allocator-equal-btn"
                onClick={handleEqualWeight}
                className="px-2.5 py-1 rounded-[7px] border border-[#cbd5e1] bg-white hover:bg-[#f1f5f9] text-[11px] font-semibold text-[#334155] cursor-pointer"
              >
                Equal Weight
              </button>
              <button
                type="button"
                data-testid="allocator-minvar-btn"
                onClick={handleMinVar}
                className="px-2.5 py-1 rounded-[7px] border border-[#cbd5e1] bg-white hover:bg-[#eff6ff] hover:border-[#2563eb] text-[11px] font-semibold text-[#0f172a] inline-flex items-center gap-1 cursor-pointer"
              >
                <Scale className="w-3 h-3 text-[#2563eb]" />
                <span>Min-VaR</span>
              </button>
              <button
                type="button"
                data-testid="allocator-maxsharpe-btn"
                onClick={handleMaxSharpe}
                className="px-2.5 py-1 rounded-[7px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <TrendingUp className="w-3 h-3 text-[#38bdf8]" />
                <span>Max Sharpe</span>
              </button>
              <button
                type="button"
                data-testid="allocator-rebalance-inline-btn"
                onClick={() => setShowRebalancePanel(true)}
                className="px-2.5 py-1 rounded-[7px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Rebalance</span>
              </button>
            </div>

            {/* Per-Instrument Percentage Sliders & Direct Inputs */}
            <div className="space-y-2.5 max-h-[370px] overflow-y-auto pr-1">
              {selectedFunds.map((fund, idx) => {
                const rawVal = rawWeights[fund.symbol] ?? 0;
                const effPct = normalizedWeights[fund.symbol] ?? 0;
                const dollarSlice = Math.round((effPct / 100) * startingCapital);
                return (
                  <div
                    key={fund.symbol}
                    data-testid={`allocator-row-${fund.symbol}`}
                    className="rounded-[9px] border border-[#e2e8f0] bg-white p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ALLOC_COLORS[idx % ALLOC_COLORS.length] }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-[#0f172a]">
                              {fund.symbol}
                            </span>
                            <span className="text-[10px] font-mono text-[#64748b]">
                              {fund.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'} · TER{' '}
                              {fund.about.expenseRatioPct.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-[11px] text-[#64748b] truncate max-w-[180px]">
                            {fund.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="relative">
                          <input
                            type="number"
                            aria-label={`Percentage allocation for ${fund.symbol}`}
                            data-testid={`allocator-input-${fund.symbol}`}
                            min={0}
                            max={100}
                            step={1}
                            value={rawVal}
                            onChange={(e) => handleSetWeight(fund.symbol, Number(e.target.value))}
                            className="w-16 h-7 pl-2 pr-5 rounded-[6px] border border-[#cbd5e1] bg-[#f8fafc] text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#64748b]">
                            %
                          </span>
                        </div>
                        {selectedFunds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInstrument(fund.symbol)}
                            aria-label={`Remove ${fund.symbol} from allocation`}
                            className="p-1 text-[#94a3b8] hover:text-[#dc2626] cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <input
                        type="range"
                        aria-label={`Allocation slider for ${fund.symbol}`}
                        min={0}
                        max={100}
                        step={1}
                        value={rawVal}
                        onChange={(e) => handleSetWeight(fund.symbol, Number(e.target.value))}
                        className="flex-1 accent-[#2563eb] h-1.5 cursor-pointer"
                      />
                      <span className="text-[10.5px] font-mono text-[#475569] tabular-nums w-20 text-right shrink-0">
                        {formatCompact(dollarSlice)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isExact100 && (
              <p className="text-[11px] text-[#92400e] bg-[#fffbeb] border border-[#fde68a] rounded-[7px] px-2.5 py-1.5">
                Charts automatically normalize weights proportionally to 100%. Click{' '}
                <strong>Normalize 100%</strong> to lock exact percentages.
              </p>
            )}
          </div>

          {/* 4-Metric Portfolio Risk & Cost Summary */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">
                Weighted Net CAGR
              </div>
              <div
                data-testid="allocator-net-cagr"
                className="text-lg font-mono font-bold text-[#059669] tabular-nums mt-0.5"
              >
                +{projection.weightedNetCagrPct.toFixed(2)}% / yr
              </div>
              <div className="text-[10.5px] font-mono text-[#64748b]">
                TER {projection.weightedExpenseRatioPct.toFixed(2)}% · Drag -
                {formatCompact(projection.estimatedFeeDragAmount)}
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">
                Portfolio 1M VaR (95%)
              </div>
              <div
                data-testid="allocator-var95"
                className="text-lg font-mono font-bold text-[#dc2626] tabular-nums mt-0.5"
              >
                {projection.portfolioVar95MonthlyPct.toFixed(2)}%
              </div>
              <div className="text-[10.5px] font-mono text-[#64748b]">
                Vol {projection.covarianceVolatilityPct.toFixed(1)}% · Sharpe{' '}
                {projection.portfolioSharpe3Y.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 7 COLS: PROJECTED PERFORMANCE CHART + HISTORICAL REALIZED BACKTEST */}
        <div className="xl:col-span-7 flex flex-col gap-5">
          {/* Top KPI Strip for Projected Ending Corpus */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff]/70 p-3.5">
              <div className="text-[10.5px] font-mono uppercase text-[#1d4ed8]">
                Projected Base Value ({horizonYears}Y)
              </div>
              <div
                data-testid="allocator-base-ending"
                className="text-xl font-mono font-bold text-[#0f172a] tabular-nums mt-0.5"
              >
                {formatFull(projection.baseEndingValue)}
              </div>
              <div className="text-[11px] font-mono text-[#059669] font-semibold mt-0.5">
                +{projection.baseGainPct.toFixed(1)}% vs {formatCompact(projection.totalInvestedEnd)}{' '}
                invested
              </div>
            </div>

            <div className="rounded-[10px] border border-[#a7f3d0] bg-[#ecfdf5]/70 p-3.5">
              <div className="text-[10.5px] font-mono uppercase text-[#047857]">
                Bull Upside Band (+0.65σ)
              </div>
              <div
                data-testid="allocator-bull-ending"
                className="text-xl font-mono font-bold text-[#047857] tabular-nums mt-0.5"
              >
                {formatFull(projection.bullEndingValue)}
              </div>
              <div className="text-[11px] font-mono text-[#475569] mt-0.5">
                Favorable historical cycle
              </div>
            </div>

            <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2]/60 p-3.5">
              <div className="text-[10.5px] font-mono uppercase text-[#991b1b]">
                Bear Stress Band (-0.65σ)
              </div>
              <div
                data-testid="allocator-bear-ending"
                className="text-xl font-mono font-bold text-[#b91c1c] tabular-nums mt-0.5"
              >
                {formatFull(projection.bearEndingValue)}
              </div>
              <div className="text-[11px] font-mono text-[#475569] mt-0.5">
                Est. Max DD {projection.portfolioMaxDrawdownEstPct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Chart 1: Projected Forward Return Performance Based on Historical Data */}
          <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-display font-bold text-[#0f172a]">
                  <TrendingUp className="w-4 h-4 text-[#2563eb]" />
                  <span>Projected Return Performance ({horizonYears}-Year Forecast)</span>
                </div>
                <p className="text-[11.5px] text-[#64748b] mt-0.5">
                  Derived from each fund&apos;s historical 3Y CAGR net of TER &amp; covariance volatility cone
                </p>
              </div>
              <button
                type="button"
                data-testid="allocator-toggle-fund-overlays"
                onClick={() => setOverlayFunds((prev) => !prev)}
                className={`px-2.5 py-1 rounded-[7px] border text-[11px] font-semibold cursor-pointer transition-colors ${
                  overlayFunds
                    ? 'bg-[#0f172a] text-white border-[#0f172a]'
                    : 'bg-white text-[#475569] border-[#cbd5e1] hover:border-[#0f172a]'
                }`}
              >
                {overlayFunds ? 'Constituent Lines: ON' : 'Show Individual Funds'}
              </button>
            </div>

            <div
              data-testid="allocator-projection-chart"
              className="h-[250px] w-full bg-white rounded-[10px] border border-[#e2e8f0] p-2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={projection.points}
                  margin={{ top: 10, right: 16, bottom: 4, left: 6 }}
                >
                  <defs>
                    <linearGradient id="allocBullFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="allocBaseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="yearLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tickFormatter={formatCompact}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={62}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      formatFull(Number(value)),
                      String(name),
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#ffffff',
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Area
                    type="monotone"
                    dataKey="bullValue"
                    name="Bull Band (+0.65σ)"
                    stroke="#059669"
                    strokeWidth={1.6}
                    strokeDasharray="4 3"
                    fill="url(#allocBullFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="baseValue"
                    name="Custom Portfolio (Base)"
                    stroke="#2563eb"
                    strokeWidth={2.6}
                    fill="url(#allocBaseFill)"
                  />
                  <Line
                    type="monotone"
                    dataKey="bearValue"
                    name="Bear Band (-0.65σ)"
                    stroke="#dc2626"
                    strokeWidth={1.6}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalInvested"
                    name="Capital Invested"
                    stroke="#64748b"
                    strokeWidth={1.4}
                    strokeDasharray="2 3"
                    dot={false}
                  />
                  {overlayFunds &&
                    selectedFunds.map((f, idx) => (
                      <Line
                        key={f.symbol}
                        type="monotone"
                        dataKey={f.symbol}
                        name={`${f.symbol} (100%)`}
                        stroke={ALLOC_COLORS[idx % ALLOC_COLORS.length]}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Historical Realized Backtest (Actual Monthly Returns Replay) */}
          <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-display font-bold text-[#0f172a]">
                  <History className="w-4 h-4 text-[#059669]" />
                  <span>
                    Historical Realized Backtest ({historicalReplay.monthsCount} Months Replayed)
                  </span>
                </div>
                <p className="text-[11.5px] text-[#64748b] mt-0.5">
                  Rebased growth (Start = 100) replayed across actual historical monthly returns vs. Equal-Weight benchmark
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
                <span className="px-2 py-0.5 rounded bg-[#ecfdf5] text-[#047857] font-bold">
                  Realized: {historicalReplay.realizedTotalReturnPct >= 0 ? '+' : ''}
                  {historicalReplay.realizedTotalReturnPct.toFixed(1)}%
                </span>
                <span className="px-2 py-0.5 rounded bg-[#fef2f2] text-[#b91c1c] font-semibold">
                  Hist DD: {historicalReplay.realizedMaxDrawdownPct.toFixed(1)}%
                </span>
              </div>
            </div>

            <div
              data-testid="allocator-historical-chart"
              className="h-[205px] w-full bg-white rounded-[10px] border border-[#e2e8f0] p-2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={historicalReplay.points}
                  margin={{ top: 8, right: 16, bottom: 2, left: 4 }}
                >
                  <defs>
                    <linearGradient id="histPortFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10.5, fill: '#64748b' }}
                    minTickGap={22}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={46}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      `${Number(value).toFixed(2)}`,
                      String(name),
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#ffffff',
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '2px' }} />
                  <Area
                    type="monotone"
                    dataKey="portfolioIndex"
                    name="Custom Weighted Portfolio (Base=100)"
                    stroke="#059669"
                    strokeWidth={2.3}
                    fill="url(#histPortFill)"
                  />
                  <Line
                    type="monotone"
                    dataKey="equalWeightIndex"
                    name="Equal-Weight Benchmark (Base=100)"
                    stroke="#64748b"
                    strokeWidth={1.6}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE PORTFOLIO REBALANCE TRADE SUGGESTION ENGINE */}
      {showRebalancePanel && (
        <div
          data-testid="rebalance-trade-plan"
          className="mx-5 mb-5 rounded-[12px] border border-[#bfdbfe] bg-[#f8fbff] overflow-hidden"
        >
          <div className="px-4 py-3.5 border-b border-[#dbeafe] bg-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.07em] text-[#2563eb] font-semibold">
                Portfolio Rebalance Engine · Drift Detection &amp; Trade Tickets
              </div>
              <h4 className="text-base font-display font-bold text-[#0f172a] mt-0.5">
                Suggested Trades to Return Holdings Back to Target Percentages
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="rebalance-simulate-drift-btn"
                onClick={handleSimulateDrift}
                className="h-8 px-3 rounded-[7px] border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>Simulate 6M Drift</span>
              </button>
              <button
                type="button"
                data-testid="rebalance-apply-btn"
                onClick={handleApplyRebalanceTrades}
                className="h-8 px-3 rounded-[7px] bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply Rebalance Trades</span>
              </button>
              <button
                type="button"
                data-testid="rebalance-export-csv-btn"
                onClick={handleExportRebalanceCsv}
                className="h-8 px-3 rounded-[7px] border border-[#cbd5e1] bg-white hover:bg-[#f1f5f9] text-xs font-semibold text-[#334155] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>Trade CSV</span>
              </button>
            </div>
          </div>

          {/* 4 Rebalance KPI Cards */}
          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Current Portfolio Value</div>
              <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                {formatFull(rebalancePlan.totalPortfolioValue)}
              </div>
              <div className="text-[10.5px] font-mono text-[#64748b]">
                Tolerance ±{rebalancePlan.tolerancePct.toFixed(2)}%
              </div>
            </div>
            <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Max Allocation Drift</div>
              <div
                data-testid="rebalance-max-drift"
                className={`text-base font-mono font-bold tabular-nums mt-0.5 ${
                  rebalancePlan.maxAbsDriftPct <= rebalancePlan.tolerancePct
                    ? 'text-[#059669]'
                    : 'text-[#dc2626]'
                }`}
              >
                {rebalancePlan.maxAbsDriftPct.toFixed(1)}%
              </div>
              <div className="text-[10.5px] font-mono text-[#64748b]">
                {rebalancePlan.tradesRequiredCount} trade{rebalancePlan.tradesRequiredCount === 1 ? '' : 's'} suggested
              </div>
            </div>
            <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Total Buys / Sells</div>
              <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                +{formatCompact(rebalancePlan.totalBuyAmount)} / -{formatCompact(rebalancePlan.totalSellAmount)}
              </div>
              <div className="text-[10.5px] font-mono text-[#64748b]">
                Self-funding cash-neutral swap
              </div>
            </div>
            <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">Portfolio Status</div>
              <div
                data-testid="rebalance-status-badge"
                className={`text-base font-mono font-bold mt-0.5 ${
                  rebalancePlan.status === 'Balanced'
                    ? 'text-[#059669]'
                    : rebalancePlan.status === 'Minor Drift'
                      ? 'text-[#d97706]'
                      : 'text-[#dc2626]'
                }`}
              >
                {rebalancePlan.status}
              </div>
              <div className="text-[10.5px] font-mono text-[#64748b]">
                {rebalanceAppliedToast ? 'All holdings synced to target' : 'Edit current values below'}
              </div>
            </div>
          </div>

          {/* Suggested Trades Table */}
          <div className="px-4 pb-4 overflow-x-auto">
            <table className="w-full min-w-[780px] text-left border-collapse text-xs bg-white rounded-[10px] border border-[#e2e8f0] overflow-hidden">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[10.5px] font-mono uppercase text-[#64748b]">
                  <th className="py-2.5 px-3">Instrument</th>
                  <th className="py-2.5 px-3 text-right">Current Holding ({currencyPrefix})</th>
                  <th className="py-2.5 px-3 text-right">Current %</th>
                  <th className="py-2.5 px-3 text-right">Target %</th>
                  <th className="py-2.5 px-3 text-right">Drift</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                  <th className="py-2.5 px-3 text-right">Trade Amount</th>
                  <th className="py-2.5 px-3 text-right">Est. Units @ NAV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] font-mono tabular-nums">
                {rebalancePlan.rows.map((row) => (
                  <tr key={row.symbol} data-testid={`rebalance-row-${row.symbol}`}>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-mono font-bold text-[#0f172a]">{row.symbol}</div>
                      <div className="text-[11px] text-[#64748b] truncate max-w-[180px]">{row.name}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        aria-label={`Current holding value for ${row.symbol}`}
                        data-testid={`rebalance-holding-input-${row.symbol}`}
                        min={0}
                        step={5000}
                        value={Math.round(row.currentValue)}
                        onChange={(e) => handleUpdateCurrentHolding(row.symbol, Number(e.target.value))}
                        className="w-24 h-7 px-2 rounded-[6px] border border-[#cbd5e1] bg-[#f8fafc] text-right font-mono text-xs font-semibold text-[#0f172a]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#334155]">
                      {row.currentWeightPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#0f172a]">
                      {row.targetWeightPct.toFixed(1)}%
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        Math.abs(row.driftPct) <= rebalancePlan.tolerancePct
                          ? 'text-[#64748b]'
                          : row.driftPct > 0
                            ? 'text-[#dc2626]'
                            : 'text-[#059669]'
                      }`}
                    >
                      {row.driftPct > 0 ? '+' : ''}
                      {row.driftPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        data-testid={`rebalance-action-${row.symbol}`}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          row.action === 'BUY'
                            ? 'bg-[#ecfdf5] text-[#047857]'
                            : row.action === 'SELL'
                              ? 'bg-[#fef2f2] text-[#b91c1c]'
                              : 'bg-[#f1f5f9] text-[#475569]'
                        }`}
                      >
                        {row.action}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        row.action === 'BUY'
                          ? 'text-[#059669]'
                          : row.action === 'SELL'
                            ? 'text-[#dc2626]'
                            : 'text-[#64748b]'
                      }`}
                    >
                      {row.action === 'HOLD'
                        ? '—'
                        : `${row.tradeAmount > 0 ? '+' : '-'}${formatFull(Math.abs(row.tradeAmount))}`}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#334155]">
                      {row.action === 'HOLD'
                        ? '0'
                        : `${row.estimatedUnits.toFixed(2)} @ ${row.currency === 'INR' ? '₹' : '$'}${row.unitPrice.toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
