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
  Bookmark,
  CheckCircle2,
  Download,
  History,
  Lock,
  PieChart,
  Plus,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Unlock,
  X,
} from 'lucide-react';
import { SCREENER_FUNDS, ScreenerFundRecord } from '../utils/screenerEngine';
import { computeMinVarWeights } from '../utils/riskAnalyticsEngine';
import {
  buildAllocationProjectionCsv,
  buildHistoricalPortfolioReplay,
  buildProjectedPortfolioPerformance,
  computeLowCostIncomeWeights,
  computeMaxSharpeWeights,
  computeRiskParityWeights,
  normalizeAllocationWeights,
  redistributeWeightsWithLocks,
} from '../utils/portfolioAllocatorEngine';
import {
  buildRebalanceCsv,
  computePortfolioRebalancePlan,
  simulateRealisticMarketDrift,
} from '../utils/rebalanceEngine';
import {
  computeFreshCashRebalancePlan,
  computeTaxAwareRebalanceSummary,
  SavedPortfolioSnapshot,
} from '../utils/allocatorLabsEngine';
import { AllocatorAdvancedLabs } from './AllocatorAdvancedLabs';

const SAVED_PORTFOLIOS_KEY = 'financia_allocator_saved_portfolios_v1';

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
    label: 'All-Weather Risk Parity',
    weights: { NIFTYBEES: 25, HDFCCORP: 35, GOLDBEES: 25, LIQUIDBEES: 15 },
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
  const [annualSipStepUpPct, setAnnualSipStepUpPct] = useState<number>(10);
  const [inflationRatePct, setInflationRatePct] = useState<number>(6);
  const [horizonYears, setHorizonYears] = useState<number>(10);
  const [overlayFunds, setOverlayFunds] = useState<boolean>(false);
  const [lockedSymbols, setLockedSymbols] = useState<string[]>([]);
  const [showRebalancePanel, setShowRebalancePanel] = useState<boolean>(false);
  const [rebalanceMode, setRebalanceMode] = useState<'swap' | 'fresh_cash'>('swap');
  const [freshCashDeposit, setFreshCashDeposit] = useState<number>(100_000);
  const [rebalanceTolerancePct, setRebalanceTolerancePct] = useState<number>(0.25);
  const [rebalanceTaxMode, setRebalanceTaxMode] = useState<'ltcg' | 'stcg'>('ltcg');
  const [rebalanceAppliedToast, setRebalanceAppliedToast] = useState<boolean>(false);

  // Saved Custom Portfolio Scenarios (LocalStorage persisted)
  const [savedScenarios, setSavedScenarios] = useState<SavedPortfolioSnapshot[]>(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_PORTFOLIOS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.slice(0, 8);
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [scenarioNameInput, setScenarioNameInput] = useState<string>('');
  const [showSaveBar, setShowSaveBar] = useState<boolean>(false);
  const [comparedScenarioId, setComparedScenarioId] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_PORTFOLIOS_KEY, JSON.stringify(savedScenarios));
    } catch {
      // ignore storage errors
    }
  }, [savedScenarios]);

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
    setLockedSymbols([]);
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
    () => redistributeWeightsWithLocks(selectedSymbols, rawWeights, lockedSymbols),
    [selectedSymbols, rawWeights, lockedSymbols]
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
        annualSipStepUpPct,
        inflationRatePct,
        horizonYears,
      }),
    [
      selectedFunds,
      normalizedWeights,
      startingCapital,
      monthlySip,
      annualSipStepUpPct,
      inflationRatePct,
      horizonYears,
    ]
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
        tolerancePct: rebalanceTolerancePct,
      }),
    [selectedFunds, effectiveCurrentHoldings, normalizedWeights, rebalanceTolerancePct]
  );

  const freshCashPlan = useMemo(
    () =>
      computeFreshCashRebalancePlan({
        funds: selectedFunds,
        currentValues: effectiveCurrentHoldings,
        targetWeights: normalizedWeights,
        freshCashAmount: freshCashDeposit,
      }),
    [selectedFunds, effectiveCurrentHoldings, normalizedWeights, freshCashDeposit]
  );

  const rebalanceTaxSummary = useMemo(
    () => computeTaxAwareRebalanceSummary(rebalancePlan, rebalanceTaxMode, 28),
    [rebalancePlan, rebalanceTaxMode]
  );

  const currencyPrefix = selectedFunds.every((f) => f.currency === 'USD') ? '$' : '₹';

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

  const handleToggleLock = (sym: string) => {
    setLockedSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleAddInstrument = (sym: string) => {
    if (!sym || selectedSymbols.includes(sym) || selectedSymbols.length >= 8) return;
    const nextSymbols = [...selectedSymbols, sym];
    const nextRaw = { ...rawWeights, [sym]: 15 };
    setSelectedSymbols(nextSymbols);
    setRawWeights(redistributeWeightsWithLocks(nextSymbols, nextRaw, lockedSymbols));
    setAddPicker('');
  };

  const handleRemoveInstrument = (sym: string) => {
    if (selectedSymbols.length <= 1) return;
    const nextSymbols = selectedSymbols.filter((s) => s !== sym);
    const nextLocks = lockedSymbols.filter((s) => s !== sym);
    setSelectedSymbols(nextSymbols);
    setLockedSymbols(nextLocks);
    setRawWeights(redistributeWeightsWithLocks(nextSymbols, rawWeights, nextLocks));
  };

  const handleSetWeight = (sym: string, val: number) => {
    if (lockedSymbols.includes(sym)) return;
    const safe = Math.min(100, Math.max(0, Number.isFinite(val) ? val : 0));
    setRawWeights((prev) => ({ ...prev, [sym]: safe }));
  };

  const handleNormalize = () => {
    setRawWeights(redistributeWeightsWithLocks(selectedSymbols, rawWeights, lockedSymbols));
  };

  const handleEqualWeight = () => {
    const seed: Record<string, number> = {};
    for (const s of selectedSymbols) {
      seed[s] = lockedSymbols.includes(s) ? rawWeights[s] ?? 0 : 1;
    }
    setRawWeights(redistributeWeightsWithLocks(selectedSymbols, seed, lockedSymbols));
  };

  const handleMinVar = () => {
    const mv = computeMinVarWeights(selectedFunds);
    const merged = { ...mv };
    for (const s of lockedSymbols) merged[s] = rawWeights[s] ?? mv[s] ?? 0;
    setRawWeights(redistributeWeightsWithLocks(selectedSymbols, merged, lockedSymbols));
  };

  const handleMaxSharpe = () => {
    const ms = computeMaxSharpeWeights(selectedFunds);
    const merged = { ...ms };
    for (const s of lockedSymbols) merged[s] = rawWeights[s] ?? ms[s] ?? 0;
    setRawWeights(redistributeWeightsWithLocks(selectedSymbols, merged, lockedSymbols));
  };

  const handleRiskParity = () => {
    setRawWeights(computeRiskParityWeights(selectedFunds, rawWeights, lockedSymbols));
  };

  const handleLowCostTilt = () => {
    setRawWeights(computeLowCostIncomeWeights(selectedFunds, rawWeights, lockedSymbols));
  };

  const handleApplyPreset = (presetWeights: Record<string, number>) => {
    const syms = Object.keys(presetWeights).filter((s) =>
      SCREENER_FUNDS.some((f) => f.symbol === s)
    );
    setLockedSymbols([]);
    setSelectedSymbols(syms);
    setRawWeights(presetWeights);
  };

  const handleSaveScenario = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = scenarioNameInput.trim() || `Portfolio ${savedScenarios.length + 1}`;
    const snap: SavedPortfolioSnapshot = {
      id: `snap-${Date.now()}`,
      name: trimmed,
      createdAt: new Date().toISOString().slice(0, 10),
      symbols: [...selectedSymbols],
      weights: { ...normalizedWeights },
      startingCapital,
      monthlySip,
      horizonYears,
      netCagrPct: projection.weightedNetCagrPct,
      sharpe3Y: projection.portfolioSharpe3Y,
      var95MonthlyPct: projection.portfolioVar95MonthlyPct,
      baseEndingValue: projection.baseEndingValue,
    };
    setSavedScenarios((prev) => [snap, ...prev].slice(0, 8));
    setScenarioNameInput('');
    setShowSaveBar(false);
  };

  const handleLoadScenario = (snap: SavedPortfolioSnapshot) => {
    setLockedSymbols([]);
    setSelectedSymbols(snap.symbols);
    setRawWeights(snap.weights);
    setStartingCapital(snap.startingCapital);
    setMonthlySip(snap.monthlySip);
    setHorizonYears(snap.horizonYears);
  };

  const handleDeleteScenario = (id: string) => {
    setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
    if (comparedScenarioId === id) setComparedScenarioId(null);
  };

  const comparedScenario = useMemo(
    () => savedScenarios.find((s) => s.id === comparedScenarioId) || null,
    [savedScenarios, comparedScenarioId]
  );

  const handleSimulateDrift = () => {
    setRebalanceAppliedToast(false);
    setCurrentHoldingsMap(
      simulateRealisticMarketDrift(selectedFunds, normalizedWeights, startingCapital)
    );
  };

  const handleApplyFreshCashDeposit = () => {
    const next: Record<string, number> = {};
    for (const row of freshCashPlan.rows) {
      next[row.symbol] = Number(row.postDepositValue.toFixed(2));
    }
    setCurrentHoldingsMap(next);
    setRebalanceAppliedToast(true);
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
            data-testid="allocator-save-toggle-btn"
            onClick={() => setShowSaveBar((prev) => !prev)}
            className="h-9 px-3 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#eff6ff] hover:border-[#2563eb] text-xs font-semibold text-[#334155] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Save Scenario{savedScenarios.length > 0 ? ` (${savedScenarios.length})` : ''}</span>
          </button>
          <button
            type="button"
            data-testid="allocator-rebalance-btn"
            onClick={() => setShowRebalancePanel((prev) => !prev)}
            className={`h-9 px-3.5 rounded-[8px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
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
            className="h-9 px-3 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#f1f5f9] text-xs font-semibold text-[#334155] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Save / Compare Custom Portfolio Scenarios Drawer */}
      {(showSaveBar || savedScenarios.length > 0) && (
        <div
          data-testid="allocator-saved-scenarios"
          className="px-5 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]/80 space-y-2.5"
        >
          {showSaveBar && (
            <form onSubmit={handleSaveScenario} className="flex flex-wrap items-center gap-2">
              <label htmlFor="allocator-scenario-name" className="text-xs font-semibold text-[#0f172a]">
                Save Current Allocation:
              </label>
              <input
                id="allocator-scenario-name"
                data-testid="allocator-scenario-name-input"
                type="text"
                value={scenarioNameInput}
                onChange={(e) => setScenarioNameInput(e.target.value)}
                placeholder="e.g., Retirement Core 60/40"
                className="h-8 w-56 px-2.5 rounded-[7px] border border-[#cbd5e1] bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#2563eb]"
              />
              <button
                type="submit"
                data-testid="allocator-scenario-save-submit"
                className="h-8 px-3 rounded-[7px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold cursor-pointer"
              >
                Save Snapshot
              </button>
            </form>
          )}

          {savedScenarios.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-[#64748b] inline-flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-[#2563eb]" />
                Saved:
              </span>
              {savedScenarios.map((snap) => {
                const isComparing = comparedScenarioId === snap.id;
                return (
                  <div
                    key={snap.id}
                    data-testid={`saved-scenario-${snap.id}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] border text-xs ${
                      isComparing
                        ? 'bg-[#eff6ff] border-[#2563eb] text-[#0f172a]'
                        : 'bg-white border-[#cbd5e1] text-[#334155]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleLoadScenario(snap)}
                      className="font-semibold hover:text-[#2563eb] cursor-pointer"
                      title="Load this saved allocation"
                    >
                      {snap.name}
                    </button>
                    <span className="font-mono text-[10.5px] text-[#059669] tabular-nums">
                      +{snap.netCagrPct.toFixed(1)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setComparedScenarioId(isComparing ? null : snap.id)}
                      className="text-[10.5px] font-mono font-semibold text-[#2563eb] hover:underline cursor-pointer"
                    >
                      {isComparing ? 'Done' : 'Diff'}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete saved portfolio ${snap.name}`}
                      onClick={() => handleDeleteScenario(snap.id)}
                      className="text-[#94a3b8] hover:text-[#dc2626] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {comparedScenario && (
            <div
              data-testid="allocator-scenario-diff"
              className="rounded-[8px] border border-[#bfdbfe] bg-white px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums"
            >
              <span className="font-sans font-semibold text-[#0f172a]">
                Current vs. &ldquo;{comparedScenario.name}&rdquo;:
              </span>
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  Net CAGR Delta:{' '}
                  <strong
                    className={
                      projection.weightedNetCagrPct - comparedScenario.netCagrPct >= 0
                        ? 'text-[#059669]'
                        : 'text-[#dc2626]'
                    }
                  >
                    {projection.weightedNetCagrPct - comparedScenario.netCagrPct >= 0 ? '+' : ''}
                    {(projection.weightedNetCagrPct - comparedScenario.netCagrPct).toFixed(2)}%
                  </strong>
                </span>
                <span>
                  Sharpe Delta:{' '}
                  <strong
                    className={
                      projection.portfolioSharpe3Y - comparedScenario.sharpe3Y >= 0
                        ? 'text-[#059669]'
                        : 'text-[#dc2626]'
                    }
                  >
                    {projection.portfolioSharpe3Y - comparedScenario.sharpe3Y >= 0 ? '+' : ''}
                    {(projection.portfolioSharpe3Y - comparedScenario.sharpe3Y).toFixed(2)}
                  </strong>
                </span>
                <span>
                  Projected Corpus Delta:{' '}
                  <strong
                    className={
                      projection.baseEndingValue - comparedScenario.baseEndingValue >= 0
                        ? 'text-[#059669]'
                        : 'text-[#dc2626]'
                    }
                  >
                    {projection.baseEndingValue - comparedScenario.baseEndingValue >= 0 ? '+' : ''}
                    {formatCompact(projection.baseEndingValue - comparedScenario.baseEndingValue)}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Presets + Instrument Adder + Capital, Step-Up SIP, Inflation & Horizon Controls */}
      <div className="px-5 py-4 border-b border-[#e2e8f0] bg-white space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#64748b] mr-0.5">Presets:</span>
            {ALLOCATOR_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPreset(p.weights)}
                className="px-2.5 py-1 rounded-[7px] border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eff6ff] hover:border-[#bfdbfe] text-[11.5px] font-medium text-[#334155] transition-colors cursor-pointer whitespace-nowrap"
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

        {/* Capital, Monthly SIP, Step-Up %, Inflation & Horizon Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5 pt-2 border-t border-[#f1f5f9]">
          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 flex items-center justify-between gap-2">
            <label htmlFor="allocator-capital-input" className="text-[11.5px] font-medium text-[#475569] whitespace-nowrap">
              Initial ({currencyPrefix})
            </label>
            <input
              id="allocator-capital-input"
              data-testid="allocator-capital-input"
              type="number"
              min={10000}
              step={50000}
              value={startingCapital}
              onChange={(e) => setStartingCapital(Math.max(10000, Number(e.target.value) || 10000))}
              className="w-24 h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-semibold text-[#0f172a] tabular-nums"
            />
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 flex items-center justify-between gap-2">
            <label htmlFor="allocator-sip-input" className="text-[11.5px] font-medium text-[#475569] whitespace-nowrap">
              Monthly SIP
            </label>
            <input
              id="allocator-sip-input"
              data-testid="allocator-sip-input"
              type="number"
              min={0}
              step={5000}
              value={monthlySip}
              onChange={(e) => setMonthlySip(Math.max(0, Number(e.target.value) || 0))}
              className="w-24 h-8 px-2 rounded-[6px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-semibold text-[#0f172a] tabular-nums"
            />
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-medium text-[#475569] whitespace-nowrap">SIP Step-Up</span>
            <div role="group" aria-label="Annual SIP step-up percentage" className="inline-flex items-center p-0.5 rounded-[7px] bg-white border border-[#cbd5e1]">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  data-testid={`allocator-stepup-${pct}`}
                  onClick={() => setAnnualSipStepUpPct(pct)}
                  className={`px-1.5 py-1 rounded-[5px] text-[10.5px] font-mono font-semibold cursor-pointer ${
                    annualSipStepUpPct === pct
                      ? 'bg-[#059669] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-medium text-[#475569] whitespace-nowrap">Inflation CPI</span>
            <div role="group" aria-label="Inflation rate adjustment" className="inline-flex items-center p-0.5 rounded-[7px] bg-white border border-[#cbd5e1]">
              {[0, 4, 6, 8].map((cpi) => (
                <button
                  key={cpi}
                  type="button"
                  data-testid={`allocator-cpi-${cpi}`}
                  onClick={() => setInflationRatePct(cpi)}
                  className={`px-1.5 py-1 rounded-[5px] text-[10.5px] font-mono font-semibold cursor-pointer ${
                    inflationRatePct === cpi
                      ? 'bg-[#0f172a] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {cpi === 0 ? 'Off' : `${cpi}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[9px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-medium text-[#475569] whitespace-nowrap">Horizon</span>
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
                  className={`px-1.5 py-1 rounded-[5px] text-[10.5px] font-mono font-semibold cursor-pointer ${
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
                className="px-2 py-1 rounded-[7px] border border-[#cbd5e1] bg-white hover:bg-[#f1f5f9] text-[11px] font-semibold text-[#334155] cursor-pointer whitespace-nowrap"
              >
                Equal
              </button>
              <button
                type="button"
                data-testid="allocator-riskparity-btn"
                onClick={handleRiskParity}
                className="px-2 py-1 rounded-[7px] border border-[#cbd5e1] bg-white hover:bg-[#ecfdf5] hover:border-[#059669] text-[11px] font-semibold text-[#047857] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Risk Parity</span>
              </button>
              <button
                type="button"
                data-testid="allocator-lowcost-btn"
                onClick={handleLowCostTilt}
                className="px-2 py-1 rounded-[7px] border border-[#cbd5e1] bg-white hover:bg-[#eff6ff] hover:border-[#2563eb] text-[11px] font-semibold text-[#334155] cursor-pointer whitespace-nowrap"
              >
                Low-TER
              </button>
              <button
                type="button"
                data-testid="allocator-minvar-btn"
                onClick={handleMinVar}
                className="px-2 py-1 rounded-[7px] border border-[#cbd5e1] bg-white hover:bg-[#eff6ff] hover:border-[#2563eb] text-[11px] font-semibold text-[#0f172a] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Scale className="w-3 h-3 text-[#2563eb]" />
                <span>Min-VaR</span>
              </button>
              <button
                type="button"
                data-testid="allocator-maxsharpe-btn"
                onClick={handleMaxSharpe}
                className="px-2 py-1 rounded-[7px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <TrendingUp className="w-3 h-3 text-[#38bdf8]" />
                <span>Max Sharpe</span>
              </button>
            </div>

            {/* Per-Instrument Percentage Sliders, Weight Lock & Direct Inputs */}
            <div className="space-y-2.5 max-h-[370px] overflow-y-auto pr-1">
              {selectedFunds.map((fund, idx) => {
                const rawVal = rawWeights[fund.symbol] ?? 0;
                const effPct = normalizedWeights[fund.symbol] ?? 0;
                const dollarSlice = Math.round((effPct / 100) * startingCapital);
                const isLocked = lockedSymbols.includes(fund.symbol);
                return (
                  <div
                    key={fund.symbol}
                    data-testid={`allocator-row-${fund.symbol}`}
                    className={`rounded-[9px] border p-3 space-y-2 transition-colors ${
                      isLocked
                        ? 'border-[#93c5fd] bg-[#eff6ff]/40'
                        : 'border-[#e2e8f0] bg-white'
                    }`}
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
                          <div className="text-[11px] text-[#64748b] truncate max-w-[165px]">
                            {fund.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          data-testid={`allocator-lock-${fund.symbol}`}
                          onClick={() => handleToggleLock(fund.symbol)}
                          aria-label={isLocked ? `Unlock ${fund.symbol} weight` : `Lock ${fund.symbol} weight`}
                          title={isLocked ? 'Unlock weight' : 'Lock weight so optimizers preserve this %'}
                          className={`p-1 rounded-[5px] cursor-pointer transition-colors ${
                            isLocked
                              ? 'bg-[#2563eb] text-white'
                              : 'text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#f1f5f9]'
                          }`}
                        >
                          {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <div className="relative">
                          <input
                            type="number"
                            aria-label={`Percentage allocation for ${fund.symbol}`}
                            data-testid={`allocator-input-${fund.symbol}`}
                            disabled={isLocked}
                            min={0}
                            max={100}
                            step={0.5}
                            value={rawVal}
                            onChange={(e) => handleSetWeight(fund.symbol, Number(e.target.value))}
                            className="w-[78px] h-7 pl-2 pr-5 rounded-[6px] border border-[#cbd5e1] bg-[#f8fafc] disabled:opacity-70 text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#64748b] pointer-events-none">
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
                        disabled={isLocked}
                        min={0}
                        max={100}
                        step={1}
                        value={rawVal}
                        onChange={(e) => handleSetWeight(fund.symbol, Number(e.target.value))}
                        className="flex-1 accent-[#2563eb] h-1.5 cursor-pointer disabled:opacity-50"
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
                {inflationRatePct > 0 && (
                  <span className="text-[#475569] font-normal">
                    {' '}· Real {formatCompact(projection.realBaseEndingValue)}
                  </span>
                )}
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
                  {inflationRatePct > 0 && (
                    <Line
                      type="monotone"
                      dataKey="realBaseValue"
                      name={`Real Purchasing Power (${inflationRatePct}% CPI)`}
                      stroke="#7c3aed"
                      strokeWidth={1.8}
                      strokeDasharray="5 3"
                      dot={false}
                    />
                  )}
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

      {/* INTERACTIVE PORTFOLIO REBALANCE TRADE SUGGESTION ENGINE (CASH-NEUTRAL SWAP + ZERO-SELL FRESH CASH + TAX ESTIMATOR) */}
      {showRebalancePanel && (
        <div
          data-testid="rebalance-trade-plan"
          className="mx-5 mb-5 rounded-[12px] border border-[#bfdbfe] bg-[#f8fbff] overflow-hidden"
        >
          <div className="px-4 py-3.5 border-b border-[#dbeafe] bg-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.07em] text-[#2563eb] font-semibold">
                Tax-Aware Portfolio Rebalance Engine · Drift Detection &amp; Zero-Sell Inflow Router
              </div>
              <h4 className="text-base font-display font-bold text-[#0f172a] mt-0.5">
                {rebalanceMode === 'swap'
                  ? 'Suggested Trades to Return Holdings Back to Target Percentages'
                  : 'Zero-Sell Fresh Cash Deployment — Minimize Drift Without Capital Gains Tax'}
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="tablist"
                aria-label="Rebalance execution mode"
                className="inline-flex items-center p-0.5 rounded-[7px] bg-[#f1f5f9] border border-[#cbd5e1]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={rebalanceMode === 'swap'}
                  data-testid="rebalance-mode-swap"
                  onClick={() => setRebalanceMode('swap')}
                  className={`px-2.5 py-1 rounded-[5px] text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                    rebalanceMode === 'swap' ? 'bg-[#0f172a] text-white' : 'text-[#475569]'
                  }`}
                >
                  Cash-Neutral Swap
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={rebalanceMode === 'fresh_cash'}
                  data-testid="rebalance-mode-fresh-cash"
                  onClick={() => setRebalanceMode('fresh_cash')}
                  className={`px-2.5 py-1 rounded-[5px] text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                    rebalanceMode === 'fresh_cash' ? 'bg-[#059669] text-white' : 'text-[#475569]'
                  }`}
                >
                  Fresh Cash Only (0 Tax)
                </button>
              </div>
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
                onClick={
                  rebalanceMode === 'swap' ? handleApplyRebalanceTrades : handleApplyFreshCashDeposit
                }
                className="h-8 px-3 rounded-[7px] bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {rebalanceMode === 'swap' ? 'Apply Rebalance Trades' : 'Deploy Fresh Cash'}
                </span>
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

          {/* Tolerance + Tax Regime / Fresh Cash Parameter Strip */}
          <div className="px-4 py-2.5 border-b border-[#dbeafe] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5">
                <span className="text-[#475569] font-medium">Drift Band:</span>
                {[0.25, 1, 2.5, 5].map((tol) => (
                  <button
                    key={tol}
                    type="button"
                    onClick={() => setRebalanceTolerancePct(tol)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold cursor-pointer ${
                      rebalanceTolerancePct === tol
                        ? 'bg-[#2563eb] text-white'
                        : 'bg-white border border-[#cbd5e1] text-[#475569]'
                    }`}
                  >
                    ±{tol}%
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-1.5">
                <span className="text-[#475569] font-medium">Tax Lot:</span>
                <button
                  type="button"
                  onClick={() => setRebalanceTaxMode('ltcg')}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold cursor-pointer ${
                    rebalanceTaxMode === 'ltcg'
                      ? 'bg-[#0f172a] text-white'
                      : 'bg-white border border-[#cbd5e1] text-[#475569]'
                  }`}
                >
                  LTCG (12.5%)
                </button>
                <button
                  type="button"
                  onClick={() => setRebalanceTaxMode('stcg')}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold cursor-pointer ${
                    rebalanceTaxMode === 'stcg'
                      ? 'bg-[#0f172a] text-white'
                      : 'bg-white border border-[#cbd5e1] text-[#475569]'
                  }`}
                >
                  STCG (20% + Exit)
                </button>
              </div>
            </div>

            {rebalanceMode === 'fresh_cash' ? (
              <div className="inline-flex items-center gap-2">
                <label htmlFor="fresh-cash-input" className="font-medium text-[#047857]">
                  Fresh Cash Deposit ({currencyPrefix}):
                </label>
                <input
                  id="fresh-cash-input"
                  data-testid="rebalance-fresh-cash-input"
                  type="number"
                  min={0}
                  step={25000}
                  value={freshCashDeposit}
                  onChange={(e) => setFreshCashDeposit(Math.max(0, Number(e.target.value) || 0))}
                  className="w-28 h-7 px-2 rounded-[6px] border border-[#059669] bg-white text-right font-mono text-xs font-bold text-[#0f172a] tabular-nums"
                />
              </div>
            ) : (
              <div className="font-mono text-[11px] text-[#475569] tabular-nums">
                Est. Sell Friction ({rebalanceTaxMode.toUpperCase()}):{' '}
                <strong className="text-[#dc2626]">
                  -{formatFull(rebalanceTaxSummary.totalFrictionCost)}
                </strong>{' '}
                (Tax {formatCompact(rebalanceTaxSummary.estimatedCapitalGainsTax)} · Exit{' '}
                {formatCompact(rebalanceTaxSummary.estimatedExitLoad)})
              </div>
            )}
          </div>

          {/* 4 Rebalance KPI Cards */}
          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">
                {rebalanceMode === 'swap' ? 'Current Portfolio Value' : 'Post-Deposit Portfolio'}
              </div>
              <div className="text-base font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                {formatFull(
                  rebalanceMode === 'swap'
                    ? rebalancePlan.totalPortfolioValue
                    : freshCashPlan.postDepositTotalValue
                )}
              </div>
              <div className="text-[10.5px] font-mono text-[#64748b]">
                {rebalanceMode === 'swap'
                  ? `Tolerance ±${rebalancePlan.tolerancePct.toFixed(2)}%`
                  : `Includes +${formatCompact(freshCashPlan.freshCashAmount)} fresh cash`}
              </div>
            </div>
            <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">
                {rebalanceMode === 'swap' ? 'Max Allocation Drift' : 'Drift After Inflow'}
              </div>
              <div
                data-testid="rebalance-max-drift"
                className={`text-base font-mono font-bold tabular-nums mt-0.5 ${
                  (rebalanceMode === 'swap'
                    ? rebalancePlan.maxAbsDriftPct
                    : freshCashPlan.postMaxDriftPct) <= rebalancePlan.tolerancePct
                    ? 'text-[#059669]'
                    : 'text-[#dc2626]'
                }`}
              >
                {rebalanceMode === 'swap'
                  ? `${rebalancePlan.maxAbsDriftPct.toFixed(1)}%`
                  : `${freshCashPlan.postMaxDriftPct.toFixed(1)}% (was ${freshCashPlan.preMaxDriftPct.toFixed(1)}%)`}
              </div>
              <div className="text-[10.5px] font-mono text-[#64748b]">
                {rebalanceMode === 'swap'
                  ? `${rebalancePlan.tradesRequiredCount} trade${rebalancePlan.tradesRequiredCount === 1 ? '' : 's'} suggested`
                  : `Drift reduced by -${freshCashPlan.driftReductionPct.toFixed(1)}%`}
              </div>
            </div>
            <div className="rounded-[9px] border border-[#e2e8f0] bg-white p-3">
              <div className="text-[10px] font-mono uppercase text-[#64748b]">
                {rebalanceMode === 'swap' ? 'Total Buys / Sells' : 'Capital Gains Tax Saved'}
              </div>
              <div className="text-base font-mono font-bold text-[#059669] tabular-nums mt-0.5">
                {rebalanceMode === 'swap'
                  ? `+${formatCompact(rebalancePlan.totalBuyAmount)} / -${formatCompact(rebalancePlan.totalSellAmount)}`
                  : `${formatFull(rebalanceTaxSummary.freshCashTaxSaved)} Saved`}
              </div>
              <div className="text-[10.5px] font-mono text-[#64748b]">
                {rebalanceMode === 'swap'
                  ? 'Self-funding cash-neutral swap'
                  : 'Zero sell orders executed'}
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
                {rebalanceMode === 'fresh_cash' ? 'Tax-Efficient' : rebalancePlan.status}
              </div>
              <div className="text-[10.5px] font-mono text-[#64748b]">
                {rebalanceAppliedToast ? 'All holdings synced to target' : 'Edit current values below'}
              </div>
            </div>
          </div>

          {/* Suggested Trades Table (Swap Mode OR Fresh Cash Mode) */}
          <div className="px-4 pb-4 overflow-x-auto">
            {rebalanceMode === 'swap' ? (
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
            ) : (
              <table
                data-testid="rebalance-fresh-cash-table"
                className="w-full min-w-[780px] text-left border-collapse text-xs bg-white rounded-[10px] border border-[#a7f3d0] overflow-hidden"
              >
                <thead>
                  <tr className="border-b border-[#d1fae5] bg-[#ecfdf5]/60 text-[10.5px] font-mono uppercase text-[#065f46]">
                    <th className="py-2.5 px-3">Instrument</th>
                    <th className="py-2.5 px-3 text-right">Current %</th>
                    <th className="py-2.5 px-3 text-right">Target %</th>
                    <th className="py-2.5 px-3 text-right">Allocate Fresh Cash</th>
                    <th className="py-2.5 px-3 text-right">Post-Deposit %</th>
                    <th className="py-2.5 px-3 text-right">Remaining Drift</th>
                    <th className="py-2.5 px-3 text-right">Est. Buy Units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] font-mono tabular-nums">
                  {freshCashPlan.rows.map((row) => (
                    <tr key={row.symbol}>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-mono font-bold text-[#0f172a]">{row.symbol}</div>
                        <div className="text-[11px] text-[#64748b] truncate max-w-[180px]">{row.name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#334155]">
                        {row.currentWeightPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#0f172a]">
                        {row.targetWeightPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#059669]">
                        {row.freshCashAllocation > 0
                          ? `+${formatFull(row.freshCashAllocation)}`
                          : '— (Hold)'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#0f172a]">
                        {row.postDepositWeightPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#475569]">
                        {row.remainingDriftPct > 0 ? '+' : ''}
                        {row.remainingDriftPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#334155]">
                        {row.estimatedUnits > 0
                          ? `${row.estimatedUnits.toFixed(2)} @ ${row.currency === 'INR' ? '₹' : '$'}${row.unitPrice.toFixed(2)}`
                          : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* INSTITUTIONAL PORTFOLIO ANALYTICS LABS (MONTE CARLO, LOOK-THROUGH OVERLAP, STRESS TESTS, SWP) */}
      <AllocatorAdvancedLabs
        selectedFunds={selectedFunds}
        normalizedWeights={normalizedWeights}
        startingCapital={startingCapital}
        monthlySip={monthlySip}
        annualSipStepUpPct={annualSipStepUpPct}
        inflationRatePct={inflationRatePct}
        horizonYears={horizonYears}
        weightedNetCagrPct={projection.weightedNetCagrPct}
        projectedBaseEnding={projection.baseEndingValue}
        currencyPrefix={currencyPrefix}
      />
    </div>
  );
};
