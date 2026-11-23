import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BookmarkCheck,
  Download,
  Flame,
  Layers,
  Plus,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { LightweightCanvasChart } from '../../components/LightweightCanvasChart';
import { useFirebaseAuth } from '../../context/FirebaseAuthContext';
import {
  clampString,
  db,
  handleFirestoreError,
  OperationType,
  sanitizeBlueprintId,
} from '../../lib/firebase';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import {
  BACKTEST_PRESET_LEGS,
  BacktestAllocationLeg,
  RebalanceFrequency,
  runMultiAssetBacktest,
} from './backtestEngine';

const AVAILABLE_ADD_LEGS: BacktestAllocationLeg[] = [
  {
    symbol: 'UTI50',
    name: 'UTI Nifty 50 Index Direct',
    assetClass: 'Equity',
    weightPct: 10,
    expectedAnnualReturnPct: 14.4,
    annualVolPct: 15.2,
    expenseRatioPct: 0.18,
    betaToMarket: 1.0,
  },
  {
    symbol: 'QUANTSC',
    name: 'Quant Small Cap Direct',
    assetClass: 'Equity',
    weightPct: 10,
    expectedAnnualReturnPct: 22.8,
    annualVolPct: 23.4,
    expenseRatioPct: 0.64,
    betaToMarket: 1.24,
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    assetClass: 'Global ETF',
    weightPct: 10,
    expectedAnnualReturnPct: 13.8,
    annualVolPct: 15.6,
    expenseRatioPct: 0.09,
    betaToMarket: 0.98,
  },
  {
    symbol: 'AGG',
    name: 'iShares Core US Aggregate Bond ETF',
    assetClass: 'Debt',
    weightPct: 10,
    expectedAnnualReturnPct: 5.4,
    annualVolPct: 5.2,
    expenseRatioPct: 0.03,
    betaToMarket: 0.06,
  },
  {
    symbol: 'GLD',
    name: 'SPDR Gold Shares Physical ETF',
    assetClass: 'Gold',
    weightPct: 10,
    expectedAnnualReturnPct: 11.2,
    annualVolPct: 13.1,
    expenseRatioPct: 0.4,
    betaToMarket: -0.06,
  },
];

function formatInrCompact(val: number): string {
  if (!Number.isFinite(val)) return '₹0';
  if (Math.abs(val) >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100_000) return `₹${(val / 100_000).toFixed(2)} L`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const BacktesterLabPage: React.FC = () => {
  const { user, signInWithGoogle } = useFirebaseAuth();
  const guidanceMode = useWorkspaceStore((s) => s.guidanceMode);

  const [title, setTitle] = useState('Institutional Core 65/20/15 All-Weather');
  const [initialCapital, setInitialCapital] = useState(500000);
  const [monthlySip, setMonthlySip] = useState(25000);
  const [horizonYears, setHorizonYears] = useState(10);
  const [rebalanceFrequency, setRebalanceFrequency] = useState<RebalanceFrequency>('ANNUAL');
  const [legs, setLegs] = useState<BacktestAllocationLeg[]>(BACKTEST_PRESET_LEGS);
  const [savingCloud, setSavingCloud] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const report = useMemo(
    () =>
      runMultiAssetBacktest({
        title,
        initialCapital,
        monthlySip,
        horizonYears,
        rebalanceFrequency,
        benchmarkSymbol: 'NIFTY50',
        allocations: legs,
      }),
    [title, initialCapital, monthlySip, horizonYears, rebalanceFrequency, legs]
  );

  const totalRawWeight = useMemo(
    () => legs.reduce((s, l) => s + l.weightPct, 0),
    [legs]
  );

  const primaryCanvasSeries = useMemo(
    () =>
      report.timeline.map((pt) => ({
        time: `${pt.label}-01`,
        value: pt.portfolioValue,
      })),
    [report.timeline]
  );

  const benchmarkCanvasSeries = useMemo(
    () =>
      report.timeline.map((pt) => ({
        time: `${pt.label}-01`,
        value: pt.benchmarkValue,
      })),
    [report.timeline]
  );

  const updateLegWeight = (symbol: string, nextWeight: number) => {
    setLegs((prev) =>
      prev.map((l) => (l.symbol === symbol ? { ...l, weightPct: Math.max(0, Math.min(100, nextWeight)) } : l))
    );
  };

  const removeLeg = (symbol: string) => {
    setLegs((prev) => (prev.length > 1 ? prev.filter((l) => l.symbol !== symbol) : prev));
  };

  const addLeg = (leg: BacktestAllocationLeg) => {
    setLegs((prev) => {
      if (prev.some((p) => p.symbol === leg.symbol) || prev.length >= 12) return prev;
      return [...prev, leg];
    });
  };

  const handleSaveToCloud = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!user.emailVerified) return;
    setSavingCloud(true);
    setSaveMessage(null);
    const btId = sanitizeBlueprintId(`bt_${Date.now().toString(36)}`);
    const docPath = `users/${user.uid}/backtests/${btId}`;

    try {
      await setDoc(doc(db, 'users', user.uid, 'backtests', btId), {
        ownerId: user.uid,
        title: clampString(title || 'Custom Backtest', 100),
        rebalanceFrequency,
        initialCapital: String(Math.max(0, Math.round(initialCapital))),
        monthlySip: String(Math.max(0, Math.round(monthlySip))),
        horizonYears: Math.max(1, Math.min(30, horizonYears)),
        benchmarkSymbol: 'NIFTY50',
        allocations: report.config.allocations.slice(0, 15).map((a) => ({
          symbol: a.symbol,
          weightPct: a.weightPct,
          assetClass: a.assetClass,
        })),
        summaryCagrPct: report.cagrPct,
        summarySharpe: report.sharpeRatio,
        summaryMaxDrawdownPct: report.maxDrawdownPct,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSaveMessage('Strategy saved to cloud research vault.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    } finally {
      setSavingCloud(false);
    }
  };

  const handleDownloadTearsheet = () => {
    const lines = [
      `Financia Institutional Backtest Tearsheet — ${title}`,
      `Horizon,${horizonYears} Years`,
      `Rebalance Cadence,${rebalanceFrequency}`,
      `Initial Capital,${initialCapital}`,
      `Monthly SIP,${monthlySip}`,
      `Final Corpus,${report.finalValue}`,
      `Annualized CAGR,${report.cagrPct}%`,
      `Sharpe Ratio,${report.sharpeRatio}`,
      `Sortino Ratio,${report.sortinoRatio}`,
      `Calmar Ratio,${report.calmarRatio}`,
      `Max Drawdown,${report.maxDrawdownPct}%`,
      '',
      'Month,Portfolio Value,Benchmark Value,Invested Capital,Drawdown %',
      ...report.timeline.map(
        (p) => `${p.label},${p.portfolioValue},${p.benchmarkValue},${p.investedCapital},${p.drawdownPct}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financia-backtest-${horizonYears}y.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="backtester-lab"
      data-testid="backtester-lab-page"
      className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#e2e8f0] dark:border-[#1f2937]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#2563eb] dark:text-[#60a5fa]">
            <Activity className="w-3.5 h-3.5" />
            Walk-Forward Replay · Brinson Attribution · Regime Stress Lab
          </div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-[#090e1a] dark:text-white mt-1">
            Multi-Asset Backtester &amp; Factor Attribution Lab
          </h1>
          {guidanceMode === 'guided' && (
            <p className="text-sm text-[#475569] dark:text-[#94a3b8] mt-1 max-w-3xl">
              Stress-test custom multi-asset sleeves across historical drawdown regimes, compare
              rebalancing cadences, decompose active return with Brinson-Hood-Beebower attribution,
              and project Monte Carlo wealth bands.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleSaveToCloud()}
            disabled={savingCloud}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#090e1a] dark:bg-white text-white dark:text-[#090e1a] px-3.5 py-2 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            {savingCloud ? 'Saving…' : user ? 'Save Strategy to Cloud' : 'Sign in & Save Strategy'}
          </button>
          <button
            type="button"
            onClick={handleDownloadTearsheet}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#090e1a] dark:text-white px-3.5 py-2 text-xs font-medium hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Backtest CSV
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="mt-4 rounded-[8px] border border-[#bbf7d0] dark:border-[#065f46] bg-[#f0fdf4] dark:bg-[#052e16]/60 px-4 py-2.5 text-xs font-medium text-[#15803d] dark:text-[#34d399]">
          {saveMessage}
        </div>
      )}

      {/* Main Split: Strategy Controls + Canvas Equity Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Controls */}
        <div className="lg:col-span-4 rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-display font-semibold text-sm text-[#090e1a] dark:text-white">
              <SlidersHorizontal className="w-4 h-4 text-[#2563eb]" />
              Strategy Parameters
            </span>
            <button
              type="button"
              onClick={() => setLegs(BACKTEST_PRESET_LEGS)}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#64748b] hover:text-[#090e1a] dark:hover:text-white cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
              Strategy Name
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#090d16] px-3 py-2 text-xs text-[#090e1a] dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                Initial Lump Sum (₹)
              </label>
              <input
                type="number"
                min={10000}
                step={50000}
                value={initialCapital}
                onChange={(e) => setInitialCapital(Math.max(10000, Number(e.target.value || 0)))}
                className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#090d16] px-3 py-2 text-xs font-mono text-[#090e1a] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                Monthly SIP (₹)
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={monthlySip}
                onChange={(e) => setMonthlySip(Math.max(0, Number(e.target.value || 0)))}
                className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#090d16] px-3 py-2 text-xs font-mono text-[#090e1a] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                Horizon (Years)
              </label>
              <input
                type="number"
                min={1}
                max={25}
                value={horizonYears}
                onChange={(e) => setHorizonYears(Math.max(1, Math.min(25, Number(e.target.value || 5))))}
                className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#090d16] px-3 py-2 text-xs font-mono text-[#090e1a] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                Rebalance Rule
              </label>
              <select
                value={rebalanceFrequency}
                onChange={(e) => setRebalanceFrequency(e.target.value as RebalanceFrequency)}
                className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#090d16] px-2.5 py-2 text-xs text-[#090e1a] dark:text-white"
              >
                <option value="ANNUAL">Annual Calendar</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="DRIFT_5PCT">5% Drift Band</option>
                <option value="NONE">Buy &amp; Hold (None)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-[#e2e8f0] dark:border-[#1f2937]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase text-[#64748b]">
                Sleeve Weights (Auto-Normalized)
              </span>
              <span
                className={`text-[11px] font-mono font-semibold ${
                  Math.round(totalRawWeight) === 100
                    ? 'text-[#059669] dark:text-[#10b981]'
                    : 'text-[#d97706] dark:text-[#fbbf24]'
                }`}
              >
                Raw Sum: {totalRawWeight.toFixed(0)}%
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {legs.map((leg) => (
                <div
                  key={leg.symbol}
                  className="rounded-[8px] border border-[#e2e8f0] dark:border-[#1f2937] p-2.5 bg-[#f8fafc] dark:bg-[#0b1120]"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-semibold text-[#090e1a] dark:text-white">
                        {leg.symbol}
                      </span>
                      <span className="text-[10.5px] text-[#64748b] ml-2">{leg.assetClass}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums font-semibold text-[#2563eb] dark:text-[#60a5fa]">
                        {leg.weightPct}%
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLeg(leg.symbol)}
                        className="text-[#94a3b8] hover:text-[#dc2626] cursor-pointer"
                        aria-label={`Remove ${leg.symbol}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={leg.weightPct}
                    onChange={(e) => updateLegWeight(leg.symbol, Number(e.target.value))}
                    className="w-full mt-1.5 accent-[#2563eb]"
                  />
                </div>
              ))}
            </div>

            {/* Quick Add Sleeve */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {AVAILABLE_ADD_LEGS.filter((cand) => !legs.some((l) => l.symbol === cand.symbol)).map(
                (cand) => (
                  <button
                    key={cand.symbol}
                    type="button"
                    onClick={() => addLeg(cand)}
                    className="inline-flex items-center gap-1 rounded-[6px] border border-[#cbd5e1] dark:border-[#334155] px-2 py-1 text-[11px] font-mono text-[#334155] dark:text-[#cbd5e1] hover:border-[#2563eb] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    {cand.symbol}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right Canvas & Institutional Metrics */}
        <div className="lg:col-span-8 space-y-5">
          {/* Risk/Return Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-3.5">
              <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Terminal Corpus</div>
              <div className="font-mono tabular-nums text-lg font-semibold text-[#090e1a] dark:text-white mt-0.5">
                {formatInrCompact(report.finalValue)}
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                Invested {formatInrCompact(report.totalInvested)}
              </div>
            </div>
            <div className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-3.5">
              <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Annualized CAGR</div>
              <div className="font-mono tabular-nums text-lg font-semibold text-[#059669] dark:text-[#10b981] mt-0.5">
                {report.cagrPct.toFixed(2)}%
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                Alpha {report.activeAlphaPct >= 0 ? '+' : ''}
                {report.activeAlphaPct.toFixed(2)}%
              </div>
            </div>
            <div className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-3.5">
              <div className="text-[10.5px] font-mono uppercase text-[#64748b]">
                Sharpe / Sortino
              </div>
              <div className="font-mono tabular-nums text-lg font-semibold text-[#2563eb] dark:text-[#60a5fa] mt-0.5">
                {report.sharpeRatio.toFixed(2)} / {report.sortinoRatio.toFixed(2)}
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                Vol {report.annualVolatilityPct.toFixed(1)}% · Ulcer {report.ulcerIndex.toFixed(1)}
              </div>
            </div>
            <div className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-3.5">
              <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Max Drawdown</div>
              <div className="font-mono tabular-nums text-lg font-semibold text-[#dc2626] dark:text-[#f43f5e] mt-0.5">
                {report.maxDrawdownPct.toFixed(2)}%
              </div>
              <div className="text-[11px] font-mono text-[#64748b]">
                Calmar {report.calmarRatio.toFixed(2)} · {report.rebalanceEventsCount} rebalances
              </div>
            </div>
          </div>

          {/* 60fps TradingView Lightweight Canvas Equity Curve */}
          <div className="rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display font-semibold text-sm text-[#090e1a] dark:text-white">
                  Walk-Forward Equity Curve vs. 60/40 Benchmark
                </h2>
                <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  Hardware-accelerated canvas series · Teal = Strategy · Dashed Slate = Benchmark
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#0d9488] dark:text-[#14b8a6]">
                {report.timeline.length - 1} months simulated
              </span>
            </div>
            <LightweightCanvasChart
              primarySeries={primaryCanvasSeries}
              benchmarkSeries={benchmarkCanvasSeries}
              height={300}
              accentColor="#0d9488"
            />
          </div>
        </div>
      </div>

      {/* Bottom Analytical Row: Brinson Attribution + Factor Loadings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <div className="lg:col-span-7 rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-display font-semibold text-sm text-[#090e1a] dark:text-white">
              <Layers className="w-4 h-4 text-[#0d9488]" />
              Brinson-Hood-Beebower Return Attribution
            </div>
            <span className="text-xs font-mono font-semibold text-[#059669] dark:text-[#10b981]">
              Total Active Effect: {report.brinsonSumCheckActivePct >= 0 ? '+' : ''}
              {report.brinsonSumCheckActivePct.toFixed(2)}%
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] dark:border-[#1f2937] font-mono text-[10.5px] uppercase text-[#64748b]">
                  <th className="py-2 pr-3">Sleeve</th>
                  <th className="py-2 px-2 text-right">Port W%</th>
                  <th className="py-2 px-2 text-right">Bench W%</th>
                  <th className="py-2 px-2 text-right">Allocation</th>
                  <th className="py-2 px-2 text-right">Selection</th>
                  <th className="py-2 pl-2 text-right">Total Effect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#1f2937] font-mono tabular-nums">
                {report.brinsonAttribution.map((row) => (
                  <tr key={row.assetClass}>
                    <td className="py-2.5 pr-3 font-sans font-medium text-[#090e1a] dark:text-white">
                      {row.assetClass}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#334155] dark:text-[#cbd5e1]">
                      {row.portfolioWeightPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#64748b]">
                      {row.benchmarkWeightPct.toFixed(1)}%
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right ${
                        row.allocationEffectPct >= 0
                          ? 'text-[#059669] dark:text-[#10b981]'
                          : 'text-[#dc2626] dark:text-[#f43f5e]'
                      }`}
                    >
                      {row.allocationEffectPct >= 0 ? '+' : ''}
                      {row.allocationEffectPct.toFixed(2)}%
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right ${
                        row.selectionEffectPct >= 0
                          ? 'text-[#059669] dark:text-[#10b981]'
                          : 'text-[#dc2626] dark:text-[#f43f5e]'
                      }`}
                    >
                      {row.selectionEffectPct >= 0 ? '+' : ''}
                      {row.selectionEffectPct.toFixed(2)}%
                    </td>
                    <td
                      className={`py-2.5 pl-2 text-right font-semibold ${
                        row.totalEffectPct >= 0
                          ? 'text-[#059669] dark:text-[#10b981]'
                          : 'text-[#dc2626] dark:text-[#f43f5e]'
                      }`}
                    >
                      {row.totalEffectPct >= 0 ? '+' : ''}
                      {row.totalEffectPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Multi-Factor Style Loadings */}
        <div className="lg:col-span-5 rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center gap-2 font-display font-semibold text-sm text-[#090e1a] dark:text-white mb-3">
            <Flame className="w-4 h-4 text-[#d97706]" />
            Style &amp; Risk Factor Loadings
          </div>
          <div className="space-y-3">
            {report.factorLoadings.map((f) => (
              <div key={f.factor}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#090e1a] dark:text-white">{f.factor}</span>
                  <span className="font-mono tabular-nums text-[#2563eb] dark:text-[#60a5fa]">
                    β {f.exposure.toFixed(2)} · +{f.contributionPct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#e2e8f0] dark:bg-[#1e293b] overflow-hidden">
                  <div
                    className="h-full bg-[#0d9488] dark:bg-[#14b8a6]"
                    style={{ width: `${Math.min(100, Math.max(4, Math.abs(f.exposure) * 85))}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                  {f.interpretation}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Macro Regime Stress Tests + Monte Carlo Fan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <div className="lg:col-span-6 rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center gap-2 font-display font-semibold text-sm text-[#090e1a] dark:text-white mb-3">
            <ShieldAlert className="w-4 h-4 text-[#dc2626]" />
            Historical Macro Regime Stress Tests
          </div>
          <div className="space-y-3">
            {report.regimeStressTests.map((st) => (
              <div
                key={st.regimeId}
                className="rounded-[8px] border border-[#e2e8f0] dark:border-[#1f2937] p-3.5 bg-[#f8fafc] dark:bg-[#0b1120]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#090e1a] dark:text-white">
                      {st.regimeName}
                    </div>
                    <div className="text-[11px] text-[#64748b]">{st.periodLabel}</div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div
                      className={`text-sm font-semibold ${
                        st.portfolioImpactPct >= 0
                          ? 'text-[#059669] dark:text-[#10b981]'
                          : 'text-[#dc2626] dark:text-[#f43f5e]'
                      }`}
                    >
                      {st.portfolioImpactPct >= 0 ? '+' : ''}
                      {st.portfolioImpactPct.toFixed(1)}%
                    </div>
                    <div className="text-[10.5px] text-[#64748b]">
                      vs Bench {st.benchmarkImpactPct.toFixed(1)}% ({st.excessProtectionPct >= 0 ? '+' : ''}
                      {st.excessProtectionPct.toFixed(1)}% cushion)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm text-[#090e1a] dark:text-white">
              Monte Carlo Wealth Fan (400 Stochastic Paths)
            </h3>
            <span className="text-[11px] font-mono text-[#64748b]">
              P10 Bear · P50 Median · P90 Bull
            </span>
          </div>
          <div className="h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.monteCarloFan} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis
                  dataKey="year"
                  tickFormatter={(y) => `Y${y}`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickFormatter={(v) => formatInrCompact(Number(v))}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={72}
                />
                <Tooltip
                  formatter={(v: unknown) => formatInrCompact(Number(v))}
                  labelFormatter={(l) => `Year ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="p90"
                  name="P90 Bull"
                  stroke="#059669"
                  fill="#10b981"
                  fillOpacity={0.12}
                />
                <Area
                  type="monotone"
                  dataKey="p50"
                  name="P50 Median"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="p10"
                  name="P10 Bear"
                  stroke="#dc2626"
                  fill="#ef4444"
                  fillOpacity={0.08}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
