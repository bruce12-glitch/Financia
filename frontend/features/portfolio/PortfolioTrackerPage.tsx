import React, { useEffect, useMemo, useState } from 'react';
import Decimal from 'decimal.js';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Cloud,
  Download,
  FileSpreadsheet,
  Info,
  Layers,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useFirebaseAuth } from '../../context/FirebaseAuthContext';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { StockQuote } from '../../types/financia';
import {
  AssetClassBucket,
  computeFifoPortfolioValuation,
  computePortfolioOverlapMatrix,
  LedgerTransaction,
  LedgerTxType,
  parsePortfolioCsvOrCas,
  SAMPLE_CAS_CSV_TEMPLATE,
  TargetAllocationPolicy,
} from './portfolioLedgerEngine';
import {
  appendCloudTransactions,
  DEFAULT_PORTFOLIO_ID,
  ensureCloudPortfolio,
  removeCloudTransaction,
  subscribeCloudTransactions,
  updateCloudPortfolioPolicy,
} from './portfolioRepository';
import { CasPdfUploadCard } from './CasPdfUploadCard';

interface PortfolioTrackerPageProps {
  stocks: StockQuote[];
  onInspectSymbol?: (symbol: string) => void;
}

type PortfolioSubTab = 'holdings' | 'import' | 'xray' | 'tax';

const LOCAL_LEDGER_STORAGE_KEY = 'financia_local_ledger_v2';

function formatInr(value: string | number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
}

function loadLocalFallbackTransactions(): LedgerTransaction[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_LEDGER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LedgerTransaction[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback to sample portfolio
  }
  return parsePortfolioCsvOrCas(SAMPLE_CAS_CSV_TEMPLATE, new Set(), 'CAS').validTransactions;
}

export const PortfolioTrackerPage: React.FC<PortfolioTrackerPageProps> = ({
  stocks,
  onInspectSymbol,
}) => {
  const { user, authReady, signInWithGoogle, signingIn } = useFirebaseAuth();
  const density = useWorkspaceStore((s) => s.density);
  const guidanceMode = useWorkspaceStore((s) => s.guidanceMode);

  const [subTab, setSubTab] = useState<PortfolioSubTab>('holdings');
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(() =>
    loadLocalFallbackTransactions()
  );
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [policy, setPolicy] = useState<TargetAllocationPolicy>({
    targetEquityPct: 65,
    targetDebtPct: 20,
    targetGoldPct: 15,
    driftThresholdPct: 5,
  });

  // Import / CSV states
  const [csvDraft, setCsvDraft] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{
    added: number;
    duplicates: number;
    errors: Array<{ line: number; reason: string }>;
  } | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);

  // Manual trade form
  const [manualSymbol, setManualSymbol] = useState('PPFAS');
  const [manualName, setManualName] = useState('Parag Parikh Flexi Cap Direct Growth');
  const [manualAssetClass, setManualAssetClass] = useState<AssetClassBucket>('Equity');
  const [manualTxType, setManualTxType] = useState<LedgerTxType>('BUY');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualUnits, setManualUnits] = useState('150');
  const [manualPrice, setManualPrice] = useState('89.38');
  const [manualError, setManualError] = useState<string | null>(null);

  // Sync with Firestore when Google user is authenticated
  useEffect(() => {
    if (!authReady || !user) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const meta = await ensureCloudPortfolio(user.uid, user.emailVerified, DEFAULT_PORTFOLIO_ID);
        if (cancelled) return;
        setPolicy({
          targetEquityPct: meta.targetEquityPct,
          targetDebtPct: meta.targetDebtPct,
          targetGoldPct: meta.targetGoldPct,
          driftThresholdPct: meta.driftThresholdPct,
        });
        unsub = subscribeCloudTransactions(user.uid, DEFAULT_PORTFOLIO_ID, (cloudRows) => {
          if (cloudRows.length > 0) {
            setTransactions(cloudRows);
          }
        });
      } catch (err) {
        console.warn('[Portfolio Cloud Sync]', err);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [authReady, user]);

  // Persist local ledger copy for offline / unauthenticated convenience
  useEffect(() => {
    if (!user) {
      try {
        window.localStorage.setItem(LOCAL_LEDGER_STORAGE_KEY, JSON.stringify(transactions));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [transactions, user]);

  const livePriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of stocks) {
      map[s.ticker.toUpperCase()] = s.price;
    }
    return map;
  }, [stocks]);

  const expenseMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of stocks) {
      const parsed = Number(String(s.expenseRatio || '0.55').replace(/[^0-9.]/g, ''));
      map[s.ticker.toUpperCase()] = Number.isFinite(parsed) ? parsed : 0.55;
    }
    return map;
  }, [stocks]);

  const valuation = useMemo(
    () =>
      computeFifoPortfolioValuation({
        transactions,
        livePricesBySymbol: livePriceMap,
        expenseRatioBySymbol: expenseMap,
        policy,
      }),
    [transactions, livePriceMap, expenseMap, policy]
  );

  const overlapPairs = useMemo(
    () => computePortfolioOverlapMatrix(valuation.holdings.map((h) => h.symbol)),
    [valuation.holdings]
  );

  const existingIdempotencyKeys = useMemo(
    () => new Set(transactions.map((t) => t.idempotencyKey)),
    [transactions]
  );

  const handleCommitParsedCasTransactions = async (
    incoming: LedgerTransaction[]
  ): Promise<{ added: number; duplicates: number }> => {
    const fresh = incoming.filter((t) => !existingIdempotencyKeys.has(t.idempotencyKey));
    const duplicates = incoming.length - fresh.length;

    if (fresh.length > 0) {
      if (user && user.emailVerified) {
        setSyncingCloud(true);
        try {
          await appendCloudTransactions(user.uid, fresh, DEFAULT_PORTFOLIO_ID);
        } finally {
          setSyncingCloud(false);
        }
      }
      setTransactions((prev) => [...prev, ...fresh]);
    }

    return { added: fresh.length, duplicates };
  };

  const handleIngestCsv = async (rawText: string, source: 'CAS' | 'CSV' = 'CSV') => {
    const parsed = parsePortfolioCsvOrCas(rawText, existingIdempotencyKeys, source);

    if (parsed.validTransactions.length > 0) {
      if (user && user.emailVerified) {
        setSyncingCloud(true);
        try {
          await appendCloudTransactions(user.uid, parsed.validTransactions, DEFAULT_PORTFOLIO_ID);
        } finally {
          setSyncingCloud(false);
        }
      }
      setTransactions((prev) => [...prev, ...parsed.validTransactions]);
    }

    setImportStatus({
      added: parsed.validTransactions.length,
      duplicates: parsed.duplicateCount,
      errors: parsed.errors,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setImportStatus({
        added: 0,
        duplicates: 0,
        errors: [{ line: 1, reason: 'File exceeds 2 MB safety limit.' }],
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setCsvDraft(content);
      void handleIngestCsv(content, 'CAS');
    };
    reader.readAsText(file);
  };

  const handleAddManualTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    try {
      const u = new Decimal(manualUnits);
      const p = new Decimal(manualPrice);
      if (u.lte(0) || p.lte(0)) {
        setManualError('Units and Price must be positive decimal values.');
        return;
      }
      const amt = u.times(p);
      const key = `man_${manualSymbol.toUpperCase().replace(/[^A-Z0-9]/g, '')}_${Date.now().toString(36)}`;
      const tx: LedgerTransaction = {
        id: key,
        symbol: manualSymbol.trim().toUpperCase(),
        schemeName: manualName.trim() || manualSymbol.trim().toUpperCase(),
        isin: '',
        assetClass: manualAssetClass,
        txType: manualTxType,
        tradeDate: manualDate,
        units: u.toFixed(4),
        price: p.toFixed(4),
        amount: amt.toFixed(2),
        currency: 'INR',
        source: 'MANUAL',
        idempotencyKey: key,
      };
      if (user && user.emailVerified) {
        setSyncingCloud(true);
        try {
          await appendCloudTransactions(user.uid, [tx], DEFAULT_PORTFOLIO_ID);
        } finally {
          setSyncingCloud(false);
        }
      }
      setTransactions((prev) => [...prev, tx]);
      setSubTab('holdings');
    } catch {
      setManualError('Enter valid numeric values for units and execution price.');
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (user && user.emailVerified) {
      await removeCloudTransaction(user.uid, txId, DEFAULT_PORTFOLIO_ID);
    }
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
  };

  const handlePolicyChange = (patch: Partial<TargetAllocationPolicy>) => {
    const next = { ...policy, ...patch };
    setPolicy(next);
    if (user && user.emailVerified) {
      void updateCloudPortfolioPolicy(user.uid, next, DEFAULT_PORTFOLIO_ID);
    }
  };

  const handleExportTearsheetCsv = () => {
    const rows = [
      [
        'Symbol',
        'Scheme Name',
        'Asset Class',
        'Units',
        'Avg Cost',
        'Live NAV',
        'Invested',
        'Current Value',
        'Unrealized PnL',
        'XIRR %',
        'LTCG Eligible',
        'STCG Exposure',
        'Annual TER Drag',
      ].join(','),
      ...valuation.holdings.map((h) =>
        [
          h.symbol,
          `"${h.schemeName.replace(/"/g, '""')}"`,
          h.assetClass,
          h.units,
          h.avgCost,
          h.currentPrice,
          h.investedAmount,
          h.currentValue,
          h.unrealizedPnl,
          h.xirrPct ?? '',
          h.ltcgEligibleGain,
          h.stcgGain,
          h.annualFeeDrag,
        ].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financia-portfolio-tearsheet-${valuation.asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rowPad = density === 'compact' ? 'py-2 px-3 text-xs' : 'py-3.5 px-4 text-sm';
  const totalPnlPositive = Number(valuation.totalUnrealizedPnl) >= 0;

  return (
    <section
      id="portfolio-tracker"
      data-testid="portfolio-tracker-page"
      className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      {/* Top Executive Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#e2e8f0] dark:border-[#1f2937]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#0d9488] dark:text-[#14b8a6]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Decimal FIFO Tax-Lot &amp; Exact XIRR Ledger
          </div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-[#090e1a] dark:text-[#f8fafc] mt-1">
            Real Portfolio Tracker &amp; CAS Workbench
          </h1>
          {guidanceMode === 'guided' && (
            <p className="text-sm text-[#475569] dark:text-[#94a3b8] mt-1 max-w-3xl">
              Import your NSDL/CDSL/MFCentral CAS or broker CSV to compute exact cashflow-weighted
              XIRR, Indian FIFO STCG/LTCG holding periods, hidden fund overlap, and ₹1.25L tax-free
              harvesting opportunities.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {user ? (
            <div className="inline-flex items-center gap-2 rounded-[8px] border border-[#bbf7d0] dark:border-[#065f46] bg-[#f0fdf4] dark:bg-[#052e16]/60 px-3 py-2 text-xs font-medium text-[#15803d] dark:text-[#34d399]">
              <Cloud className="w-3.5 h-3.5" />
              {syncingCloud ? 'Syncing Cloud Ledger…' : `Cloud Synced · ${user.email}`}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={signingIn}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#090e1a] dark:bg-white text-white dark:text-[#090e1a] px-3.5 py-2 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              {signingIn ? 'Connecting…' : 'Sign in with Google to Sync'}
            </button>
          )}

          <button
            type="button"
            onClick={handleExportTearsheetCsv}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#090e1a] dark:text-[#f8fafc] px-3.5 py-2 text-xs font-medium hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Tearsheet CSV
          </button>
        </div>
      </div>

      {/* Executive KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-6">
        <div className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
            Current Value
          </div>
          <div className="font-mono tabular-nums text-lg font-semibold text-[#090e1a] dark:text-white mt-1">
            {formatInr(valuation.totalCurrentValue)}
          </div>
          <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5 font-mono tabular-nums">
            Cost {formatInr(valuation.totalInvested)}
          </div>
        </div>

        <div className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
            Unrealized P&amp;L
          </div>
          <div
            className={`font-mono tabular-nums text-lg font-semibold mt-1 flex items-center gap-1 ${
              totalPnlPositive
                ? 'text-[#059669] dark:text-[#10b981]'
                : 'text-[#dc2626] dark:text-[#f43f5e]'
            }`}
          >
            {totalPnlPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {formatInr(valuation.totalUnrealizedPnl)}
          </div>
          <div
            className={`text-[11px] font-mono tabular-nums mt-0.5 ${
              totalPnlPositive
                ? 'text-[#059669] dark:text-[#10b981]'
                : 'text-[#dc2626] dark:text-[#f43f5e]'
            }`}
          >
            {totalPnlPositive ? '+' : ''}
            {valuation.totalUnrealizedPnlPct}% abs
          </div>
        </div>

        <div className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
            Portfolio XIRR
          </div>
          <div className="font-mono tabular-nums text-lg font-semibold text-[#2563eb] dark:text-[#60a5fa] mt-1">
            {valuation.portfolioXirrPct !== null ? `${valuation.portfolioXirrPct.toFixed(2)}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
            Annualized cashflow IRR
          </div>
        </div>

        <div className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
            LTCG Eligible
          </div>
          <div className="font-mono tabular-nums text-lg font-semibold text-[#059669] dark:text-[#10b981] mt-1">
            {formatInr(valuation.totalLtcgEligible)}
          </div>
          <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5 font-mono tabular-nums">
            STCG {formatInr(valuation.totalStcgExposure)}
          </div>
        </div>

        <div className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
            Weighted TER Drag
          </div>
          <div className="font-mono tabular-nums text-lg font-semibold text-[#090e1a] dark:text-white mt-1">
            {valuation.weightedExpenseRatioPct.toFixed(2)}%
          </div>
          <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5 font-mono tabular-nums">
            {formatInr(valuation.totalAnnualFeeDrag)} / yr
          </div>
        </div>

        <div className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
            LTCG ₹1.25L Room
          </div>
          <div className="font-mono tabular-nums text-lg font-semibold text-[#0d9488] dark:text-[#14b8a6] mt-1">
            {formatInr(valuation.ltcgExemptionRemaining)}
          </div>
          <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
            {valuation.taxHarvestPlan.length} harvest actions
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mt-6 border-b border-[#e2e8f0] dark:border-[#1f2937] pb-3">
        {(
          [
            { id: 'holdings', label: 'Holdings & FIFO Lots', icon: Layers },
            { id: 'import', label: 'CAS / CSV Import & Trade Entry', icon: Upload },
            { id: 'xray', label: 'Overlap X-Ray & Drift Rebalance', icon: Scale },
            { id: 'tax', label: 'Smart Tax Harvesting', icon: Sparkles },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-[8px] px-3.5 py-2 text-xs font-medium transition cursor-pointer ${
                active
                  ? 'bg-[#090e1a] dark:bg-white text-white dark:text-[#090e1a]'
                  : 'text-[#475569] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Holdings & Expandable FIFO Tax Lots */}
      {subTab === 'holdings' && (
        <div className="mt-6 rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] dark:border-[#1f2937] bg-[#f8fafc] dark:bg-[#0f172a] text-[11px] font-mono uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-3 text-right">Units</th>
                  <th className="py-3 px-3 text-right">Avg Cost</th>
                  <th className="py-3 px-3 text-right">Live NAV</th>
                  <th className="py-3 px-3 text-right">Current Value</th>
                  <th className="py-3 px-3 text-right">Unrealized P&amp;L</th>
                  <th className="py-3 px-3 text-right">XIRR</th>
                  <th className="py-3 px-3 text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#1f2937]">
                {valuation.holdings.map((h) => {
                  const isExp = expandedSymbol === h.symbol;
                  const pos = Number(h.unrealizedPnl) >= 0;
                  return (
                    <React.Fragment key={h.symbol}>
                      <tr className="hover:bg-[#f8fafc] dark:hover:bg-[#1e293b]/50 transition">
                        <td className={rowPad}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedSymbol(isExp ? null : h.symbol)}
                              className="p-0.5 text-[#64748b] hover:text-[#090e1a] dark:hover:text-white cursor-pointer"
                              aria-label={`Toggle FIFO tax lots for ${h.symbol}`}
                            >
                              {isExp ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <div>
                              <button
                                type="button"
                                onClick={() => onInspectSymbol?.(h.symbol)}
                                className="font-semibold text-[#090e1a] dark:text-white hover:text-[#2563eb] dark:hover:text-[#60a5fa] text-left cursor-pointer"
                              >
                                {h.symbol}
                              </button>
                              <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] truncate max-w-[240px]">
                                {h.schemeName} · {h.assetClass}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`${rowPad} text-right font-mono tabular-nums text-[#334155] dark:text-[#cbd5e1]`}>
                          {h.units}
                        </td>
                        <td className={`${rowPad} text-right font-mono tabular-nums text-[#334155] dark:text-[#cbd5e1]`}>
                          ₹{h.avgCost}
                        </td>
                        <td className={`${rowPad} text-right font-mono tabular-nums font-medium text-[#090e1a] dark:text-white`}>
                          ₹{h.currentPrice}
                        </td>
                        <td className={`${rowPad} text-right font-mono tabular-nums font-semibold text-[#090e1a] dark:text-white`}>
                          {formatInr(h.currentValue)}
                        </td>
                        <td
                          className={`${rowPad} text-right font-mono tabular-nums font-medium ${
                            pos
                              ? 'text-[#059669] dark:text-[#10b981]'
                              : 'text-[#dc2626] dark:text-[#f43f5e]'
                          }`}
                        >
                          {pos ? '+' : ''}
                          {formatInr(h.unrealizedPnl)}
                          <div className="text-[10.5px] opacity-80">
                            {pos ? '+' : ''}
                            {h.unrealizedPnlPct}%
                          </div>
                        </td>
                        <td className={`${rowPad} text-right font-mono tabular-nums font-semibold text-[#2563eb] dark:text-[#60a5fa]`}>
                          {h.xirrPct !== null ? `${h.xirrPct.toFixed(2)}%` : '—'}
                        </td>
                        <td className={`${rowPad} text-right font-mono tabular-nums text-[#475569] dark:text-[#94a3b8]`}>
                          {h.weightPct}%
                        </td>
                      </tr>

                      {isExp && (
                        <tr className="bg-[#f8fafc] dark:bg-[#0b1120]">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8] mb-2">
                              FIFO Tax Lots ({h.lots.length} active tranches) · TER {h.expenseRatioPct}% (Annual drag {formatInr(h.annualFeeDrag)})
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                              {h.lots.map((lot, idx) => (
                                <div
                                  key={`${lot.acquiredDate}-${idx}`}
                                  className="rounded-[8px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-3 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[#090e1a] dark:text-white font-medium">
                                      {lot.acquiredDate}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                        lot.taxBucket === 'LTCG'
                                          ? 'bg-[#dcfce7] text-[#15803d] dark:bg-[#052e16] dark:text-[#34d399]'
                                          : 'bg-[#fef3c7] text-[#b45309] dark:bg-[#451a03] dark:text-[#fbbf24]'
                                      }`}
                                    >
                                      {lot.taxBucket} · {lot.holdingDays}d
                                    </span>
                                  </div>
                                  <div className="flex justify-between mt-2 text-[#475569] dark:text-[#94a3b8] font-mono tabular-nums">
                                    <span>{lot.remainingUnits} u @ ₹{lot.costPerUnit}</span>
                                    <span
                                      className={
                                        Number(lot.unrealizedGain) >= 0
                                          ? 'text-[#059669] dark:text-[#10b981]'
                                          : 'text-[#dc2626] dark:text-[#f43f5e]'
                                      }
                                    >
                                      {Number(lot.unrealizedGain) >= 0 ? '+' : ''}
                                      {formatInr(lot.unrealizedGain)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Immutable Transaction Log Footer */}
          <div className="border-t border-[#e2e8f0] dark:border-[#1f2937] p-4 bg-[#f8fafc] dark:bg-[#0f172a]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#475569] dark:text-[#94a3b8]">
                Immutable Ledger Entries ({transactions.length})
              </span>
              <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                Append-only · FIFO ordered chronologically
              </span>
            </div>
            <div className="max-h-44 overflow-y-auto divide-y divide-[#e2e8f0] dark:divide-[#1f2937]">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-2 flex items-center justify-between text-xs font-mono tabular-nums"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[#64748b] dark:text-[#94a3b8]">{tx.tradeDate}</span>
                    <span className="font-semibold text-[#090e1a] dark:text-white">{tx.symbol}</span>
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#e2e8f0] dark:bg-[#1e293b] text-[#334155] dark:text-[#cbd5e1]">
                      {tx.txType}
                    </span>
                    <span className="text-[#475569] dark:text-[#94a3b8] truncate">
                      {tx.units} u @ ₹{tx.price}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[#090e1a] dark:text-white font-medium">
                      {formatInr(tx.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteTransaction(tx.id)}
                      className="text-[#94a3b8] hover:text-[#dc2626] dark:hover:text-[#f43f5e] cursor-pointer"
                      aria-label={`Remove transaction ${tx.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAS PDF / CSV Import & Manual Trade Form */}
      {subTab === 'import' && (
        <div className="space-y-6 mt-6">
          <CasPdfUploadCard
            existingKeys={existingIdempotencyKeys}
            syncingCloud={syncingCloud}
            isCloudSignedIn={Boolean(user && user.emailVerified)}
            onCommitTransactions={handleCommitParsedCasTransactions}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-display font-semibold text-base text-[#090e1a] dark:text-white">
                <FileSpreadsheet className="w-4 h-4 text-[#0d9488]" />
                CAS / Broker CSV Bulk Ingestion
              </div>
              <button
                type="button"
                onClick={() => {
                  setCsvDraft(SAMPLE_CAS_CSV_TEMPLATE);
                  void handleIngestCsv(SAMPLE_CAS_CSV_TEMPLATE, 'CAS');
                }}
                className="text-xs font-medium text-[#2563eb] dark:text-[#60a5fa] hover:underline cursor-pointer"
              >
                Load Sample CAS CSV
              </button>
            </div>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mb-4">
              Supports CAMS, KFintech, NSDL/CDSL CAS CSV, Zerodha Coin, Groww, and Kuvera exports.
              Duplicate transactions are automatically skipped via deterministic idempotency keys.
            </p>

            <label className="flex flex-col items-center justify-center border border-dashed border-[#cbd5e1] dark:border-[#334155] rounded-[10px] p-5 text-center cursor-pointer hover:bg-[#f8fafc] dark:hover:bg-[#1e293b]/50 transition mb-4">
              <Upload className="w-5 h-5 text-[#64748b] mb-2" />
              <span className="text-xs font-medium text-[#090e1a] dark:text-white">
                Choose CAS / Broker CSV File (max 2 MB)
              </span>
              <span className="text-[11px] text-[#64748b] mt-0.5">
                Columns: Date, Symbol, Scheme Name, Type, Units, Price, Amount
              </span>
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>

            <textarea
              value={csvDraft}
              onChange={(e) => setCsvDraft(e.target.value)}
              rows={6}
              placeholder="Or paste CSV rows here (Date,Symbol,Scheme Name,Type,Units,Price,Amount,Asset Class)..."
              className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#090d16] p-3 text-xs font-mono text-[#090e1a] dark:text-white focus:outline-none focus:border-[#2563eb]"
            />

            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => void handleIngestCsv(csvDraft, 'CSV')}
                disabled={!csvDraft.trim()}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#090e1a] dark:bg-white text-white dark:text-[#090e1a] px-4 py-2 text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                Validate &amp; Import Rows
              </button>
              {importStatus && (
                <div className="text-xs font-mono text-[#059669] dark:text-[#10b981]">
                  +{importStatus.added} imported · {importStatus.duplicates} deduped ·{' '}
                  {importStatus.errors.length} errors
                </div>
              )}
            </div>

            {importStatus && importStatus.errors.length > 0 && (
              <div className="mt-3 rounded-[8px] bg-[#fef2f2] dark:bg-[#450a0a]/50 border border-[#fecaca] dark:border-[#7f1d1d] p-3 text-xs text-[#b91c1c] dark:text-[#fca5a5]">
                {importStatus.errors.slice(0, 4).map((e) => (
                  <div key={`${e.line}-${e.reason}`}>
                    Line {e.line}: {e.reason}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Ledger Entry */}
          <form
            onSubmit={(e) => void handleAddManualTrade(e)}
            className="rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5"
          >
            <div className="flex items-center gap-2 font-display font-semibold text-base text-[#090e1a] dark:text-white mb-4">
              <Plus className="w-4 h-4 text-[#2563eb]" />
              Record Manual Transaction
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                  Symbol / Code
                </label>
                <input
                  value={manualSymbol}
                  onChange={(e) => setManualSymbol(e.target.value)}
                  required
                  className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#090d16] px-3 py-2 text-xs font-mono text-[#090e1a] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                  Trade Date
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  required
                  className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#090d16] px-3 py-2 text-xs font-mono text-[#090e1a] dark:text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                  Scheme / Fund Name
                </label>
                <input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  required
                  className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#090d16] px-3 py-2 text-xs text-[#090e1a] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                  Action Type
                </label>
                <select
                  value={manualTxType}
                  onChange={(e) => setManualTxType(e.target.value as LedgerTxType)}
                  className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#090d16] px-3 py-2 text-xs text-[#090e1a] dark:text-white"
                >
                  <option value="BUY">BUY</option>
                  <option value="SIP">SIP</option>
                  <option value="SELL">SELL</option>
                  <option value="SWITCH_IN">SWITCH IN</option>
                  <option value="SWITCH_OUT">SWITCH OUT</option>
                  <option value="DIVIDEND">DIVIDEND</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                  Asset Class
                </label>
                <select
                  value={manualAssetClass}
                  onChange={(e) => setManualAssetClass(e.target.value as AssetClassBucket)}
                  className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#090d16] px-3 py-2 text-xs text-[#090e1a] dark:text-white"
                >
                  <option value="Equity">Equity</option>
                  <option value="Debt">Debt</option>
                  <option value="Gold">Gold</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Global ETF">Global ETF</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                  Units
                </label>
                <input
                  value={manualUnits}
                  onChange={(e) => setManualUnits(e.target.value)}
                  required
                  className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#090d16] px-3 py-2 text-xs font-mono text-[#090e1a] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#64748b] mb-1">
                  Execution NAV / Price (₹)
                </label>
                <input
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  required
                  className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#090d16] px-3 py-2 text-xs font-mono text-[#090e1a] dark:text-white"
                />
              </div>
            </div>

            {manualError && (
              <div className="mt-3 text-xs text-[#dc2626] dark:text-[#f43f5e]">{manualError}</div>
            )}

            <button
              type="submit"
              className="mt-4 w-full rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-2.5 text-xs font-semibold transition cursor-pointer"
            >
              Append to Immutable FIFO Ledger
            </button>
          </form>
          </div>
        </div>
      )}

      {/* TAB 3: Portfolio Overlap X-Ray & Drift Rebalance */}
      {subTab === 'xray' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5">
            <h3 className="font-display font-semibold text-base text-[#090e1a] dark:text-white">
              Target Allocation &amp; Drift Rebalance Plan
            </h3>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 mb-4">
              Set institutional sleeve weights and drift band to generate exact trim/add amounts.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {(
                [
                  { label: 'Equity %', key: 'targetEquityPct' as const },
                  { label: 'Debt %', key: 'targetDebtPct' as const },
                  { label: 'Gold %', key: 'targetGoldPct' as const },
                  { label: 'Drift Band %', key: 'driftThresholdPct' as const },
                ] as const
              ).map((field) => (
                <div key={field.key}>
                  <label className="block text-[10.5px] font-mono uppercase text-[#64748b] mb-1">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={policy[field.key]}
                    onChange={(e) =>
                      handlePolicyChange({ [field.key]: Number(e.target.value || 0) })
                    }
                    className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#090d16] px-2.5 py-1.5 text-xs font-mono text-[#090e1a] dark:text-white"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {valuation.driftPlan.map((row) => (
                <div
                  key={row.assetClass}
                  className="rounded-[8px] border border-[#e2e8f0] dark:border-[#1f2937] p-3.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#090e1a] dark:text-white">
                      {row.assetClass}
                    </span>
                    <span className="font-mono tabular-nums text-[#475569] dark:text-[#94a3b8]">
                      Actual {row.actualPct}% vs Target {row.targetPct}% ({row.driftPct > 0 ? '+' : ''}
                      {row.driftPct}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#e2e8f0] dark:bg-[#1e293b] overflow-hidden">
                    <div
                      className="h-full bg-[#2563eb] dark:bg-[#3b82f6]"
                      style={{ width: `${Math.min(100, row.actualPct)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                    <span
                      className={
                        row.action === 'ON_TARGET'
                          ? 'text-[#059669] dark:text-[#10b981]'
                          : row.action === 'OVERWEIGHT_TRIM'
                            ? 'text-[#d97706] dark:text-[#fbbf24]'
                            : 'text-[#2563eb] dark:text-[#60a5fa]'
                      }
                    >
                      {row.action === 'ON_TARGET'
                        ? 'Within tolerance band'
                        : row.action === 'OVERWEIGHT_TRIM'
                          ? `TRIM ${formatInr(row.rebalanceAmount)}`
                          : `ADD ${formatInr(row.rebalanceAmount)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5">
            <h3 className="font-display font-semibold text-base text-[#090e1a] dark:text-white">
              30-Second Portfolio Overlap X-Ray
            </h3>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 mb-4">
              Detects duplicate underlying stock exposure across your held funds to eliminate hidden
              index-hugging concentration.
            </p>

            {overlapPairs.length === 0 ? (
              <div className="rounded-[8px] border border-[#e2e8f0] dark:border-[#1f2937] p-4 text-xs text-[#64748b] dark:text-[#94a3b8]">
                Low structural duplication detected across current holdings.
              </div>
            ) : (
              <div className="space-y-3">
                {overlapPairs.map((pair) => (
                  <div
                    key={`${pair.fundA}-${pair.fundB}`}
                    className="rounded-[8px] border border-[#e2e8f0] dark:border-[#1f2937] p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-[#090e1a] dark:text-white">
                        {pair.fundA} ↔ {pair.fundB}
                      </span>
                      <span
                        className={`font-mono text-xs font-semibold ${
                          pair.overlapPct >= 20
                            ? 'text-[#dc2626] dark:text-[#f43f5e]'
                            : 'text-[#d97706] dark:text-[#fbbf24]'
                        }`}
                      >
                        {pair.overlapPct}% overlap
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-1.5">
                      Shared top positions: {pair.sharedTopNames.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Smart Tax-Harvesting Engine */}
      {subTab === 'tax' && (
        <div className="mt-6 rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display font-semibold text-base text-[#090e1a] dark:text-white">
                Smart Tax-Harvesting &amp; Cost-Basis Step-Up Engine
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
                Evaluates active FIFO lots against India&apos;s ₹1,25,000 annual LTCG exemption
                (12.5%) and short-term capital loss offset rules (20%).
              </p>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-[11px] uppercase text-[#64748b]">Remaining FY Exemption</div>
              <div className="text-base font-semibold text-[#059669] dark:text-[#10b981]">
                {formatInr(valuation.ltcgExemptionRemaining)}
              </div>
            </div>
          </div>

          {valuation.taxHarvestPlan.length === 0 ? (
            <div className="rounded-[8px] border border-[#e2e8f0] dark:border-[#1f2937] p-4 text-xs text-[#64748b] dark:text-[#94a3b8] flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              No eligible LTCG (&gt;365d) or STCG loss lots currently exceed harvesting thresholds.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {valuation.taxHarvestPlan.map((item) => (
                <div
                  key={`${item.symbol}-${item.actionType}`}
                  className="rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] p-4 bg-[#f8fafc] dark:bg-[#0b1120]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#090e1a] dark:text-white">
                      {item.symbol}
                    </span>
                    <span
                      className={`text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded ${
                        item.actionType === 'HARVEST_TAX_FREE_LTCG'
                          ? 'bg-[#dcfce7] text-[#15803d] dark:bg-[#052e16] dark:text-[#34d399]'
                          : 'bg-[#fee2e2] text-[#b91c1c] dark:bg-[#450a0a] dark:text-[#fca5a5]'
                      }`}
                    >
                      {item.actionType === 'HARVEST_TAX_FREE_LTCG'
                        ? 'LTCG Step-Up'
                        : 'STCG Loss Offset'}
                    </span>
                  </div>
                  <div className="text-xs text-[#475569] dark:text-[#94a3b8] mt-1">
                    {item.schemeName}
                  </div>
                  <p className="text-xs text-[#334155] dark:text-[#cbd5e1] mt-2 leading-relaxed">
                    {item.rationale}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#e2e8f0] dark:border-[#1f2937] text-[11px] font-mono tabular-nums">
                    <div>
                      <div className="text-[#64748b]">Units</div>
                      <div className="font-semibold text-[#090e1a] dark:text-white">
                        {item.unitsToSell}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#64748b]">Gain / Loss</div>
                      <div className="font-semibold text-[#090e1a] dark:text-white">
                        {formatInr(item.estimatedGainOrLoss)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#64748b]">Est. Tax Saved</div>
                      <div className="font-semibold text-[#059669] dark:text-[#10b981]">
                        {formatInr(item.estimatedTaxSaved)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
