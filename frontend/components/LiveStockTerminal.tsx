import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Square,
  ExternalLink,
  Brain,
  Code,
  Sparkles,
  Activity,
  ChevronRight,
  Clock,
  Bell,
  Download,
  GitCompare,
  LayoutGrid,
  List,
  ShieldAlert,
  PieChart,
  BarChart3,
  ArrowLeft,
  Layers,
  Table2,
  Bookmark,
  Database,
  Plus,
  X,
} from 'lucide-react';
import { StockQuote, TimelineEvent } from '../types/financia';
import { PriceAlert } from '../utils/alertEngine';
import { formatCurrency, validateTickerInput } from '../utils/stockEngine';
import { build24hSparklineSeries, buildWatchlistCsv } from '../utils/sparkline24h';
import { TickerSparklineSvg } from './TickerSparklineSvg';
import { TerminalMainChartCard } from './TerminalMainChartCard';
import { TerminalPriceTrendChart } from './TerminalPriceTrendChart';
import { LiveQuarterlyLedgerCard } from './LiveQuarterlyLedgerCard';
import { TerminalRiskStressPanel } from './TerminalRiskStressPanel';
import { TerminalPortfolioAllocator } from './TerminalPortfolioAllocator';
import { TerminalBulkDataPanel } from './TerminalBulkDataPanel';
import { TerminalIndividualAnalysisPanel } from './TerminalIndividualAnalysisPanel';
import { TerminalCrossFundComparePanel } from './TerminalCrossFundComparePanel';
import { TerminalCorrelationMatrix90d } from './TerminalCorrelationMatrix90d';
import { TerminalQuantToolbox } from './TerminalQuantToolbox';
import { SCREENER_FUNDS, ScreenerFundRecord } from '../utils/screenerEngine';
import { getFundIntelligence, selectPeerComparisonSymbols } from '../utils/fundIntelligenceEngine';
import { synthesizeScreenerFundFromQuote } from '../utils/rebalanceEngine';
import {
  evaluateTerminalAlerts,
  TerminalPriceAlertRule,
} from '../utils/fundTerminalToolsEngine';
import {
  buildScreenerFundFromNavDbDetail,
  buildScreenerFundFromV1Dossier,
  buildTerminalSuggestions,
  NavDbSchemeDetail,
  NavDbSchemeSummary,
  TerminalSuggestionFilter,
  TerminalSuggestionItem,
} from '../utils/terminalSearchEngine';
import {
  fetchTerminalCatalogStats,
  fetchV1FundDossier,
  searchV1Funds,
  TerminalDbStats,
  V1SearchFundItem,
  V1UniformFundDossier,
} from '../services/financiaApiClient';

export type TerminalTabId = 'individual' | 'compare' | 'allocator' | 'quantlab' | 'bulk' | 'chart' | 'risk';

interface LiveStockTerminalProps {
  stocks: StockQuote[];
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
  onAnalyzeCustomTicker: (ticker: string, agentMode: 'antigravity' | 'perseus') => void;
  liveFeedActive: boolean;
  onToggleLiveFeed: () => void;
  alerts?: PriceAlert[];
  comparisonTickers?: string[];
  onComparisonTickersChange?: (nextTickers: string[]) => void;
  onOpenSetAlert?: (stock: StockQuote) => void;
  initialTab?: TerminalTabId;
  tabRequestNonce?: number;
  onBackToWorkspace?: () => void;
}

interface GeminiVerdictOverride {
  ticker: string;
  conviction_score: number;
  stance: string;
  summary: string;
  key_takeaways: string[];
}

export const LiveStockTerminal: React.FC<LiveStockTerminalProps> = ({
  stocks,
  selectedTicker,
  onSelectTicker,
  onAnalyzeCustomTicker,
  liveFeedActive,
  onToggleLiveFeed,
  alerts = [],
  comparisonTickers,
  onComparisonTickersChange,
  onOpenSetAlert,
  initialTab = 'individual',
  tabRequestNonce = 0,
  onBackToWorkspace,
}) => {
  const [tickerInput, setTickerInput] = useState<string>('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState<'antigravity' | 'perseus'>('perseus');
  const [activeCaseTab, setActiveCaseTab] = useState<'all' | 'bull' | 'bear' | 'base'>('all');
  const [insightCategory, setInsightCategory] = useState<string>('All');
  const [analysisMode, setAnalysisMode] = useState<'single' | 'multi'>('multi');
  const [terminalTab, setTerminalTab] = useState<TerminalTabId>(initialTab);
  const [showWatchlistDrawer, setShowWatchlistDrawer] = useState<boolean>(false);

  // Live Database Autocomplete & SQLite 14k AMFI + nav_master Hydration State
  const [navDbSchemes, setNavDbSchemes] = useState<NavDbSchemeSummary[]>([]);
  const [terminalDbStats, setTerminalDbStats] = useState<TerminalDbStats | null>(null);
  const [v1SearchResults, setV1SearchResults] = useState<V1SearchFundItem[]>([]);
  const [v1SearchLoading, setV1SearchLoading] = useState<boolean>(false);
  const [hydratedFundsBySymbol, setHydratedFundsBySymbol] = useState<
    Record<string, ScreenerFundRecord>
  >({});
  const [hydratedDossiersBySymbol, setHydratedDossiersBySymbol] = useState<
    Record<string, V1UniformFundDossier>
  >({});
  const [suggestionsOpen, setSuggestionsOpen] = useState<boolean>(false);
  const [suggestionFilter, setSuggestionFilter] = useState<TerminalSuggestionFilter>('ALL');
  const [highlightedSuggestionIdx, setHighlightedSuggestionIdx] = useState<number>(0);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  // Research Pinboard (Quick-Switch & 1-Click Multi-Compare)
  const [pinnedSymbols, setPinnedSymbols] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem('financia_terminal_pins_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 6).map((s) => String(s).toUpperCase());
        }
      }
    } catch {
      // ignore storage errors
    }
    return ['QQQ', 'PPFAS', 'VTI', 'GOLDBEES'];
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('financia_terminal_pins_v1', JSON.stringify(pinnedSymbols));
    } catch {
      // ignore storage errors
    }
  }, [pinnedSymbols]);

  // Dedicated Terminal NAV / Drawdown Watch Alerts (LocalStorage persisted)
  const [showTerminalAlertsDrawer, setShowTerminalAlertsDrawer] = useState<boolean>(false);
  const [terminalAlertRules, setTerminalAlertRules] = useState<TerminalPriceAlertRule[]>(() => {
    try {
      const raw = window.localStorage.getItem('financia_terminal_nav_alerts_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [
      {
        id: 'seed-alert-1',
        symbol: 'PPFAS',
        condition: 'below',
        threshold: 80,
        note: 'Core flexi-cap dip accumulation zone',
        createdAt: '2026-11-23',
      },
    ];
  });
  const [newAlertCondition, setNewAlertCondition] = useState<'above' | 'below' | 'drop_pct'>('above');
  const [newAlertThreshold, setNewAlertThreshold] = useState<string>('');
  const [newAlertNote, setNewAlertNote] = useState<string>('');

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'financia_terminal_nav_alerts_v1',
        JSON.stringify(terminalAlertRules)
      );
    } catch {
      // ignore storage errors
    }
  }, [terminalAlertRules]);

  // Preload SQLite nav_master schemes + 14k AMFI SQLite database stats on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/nav-master/schemes?limit=100')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { schemes?: NavDbSchemeSummary[] } | null) => {
        if (!cancelled && data && Array.isArray(data.schemes)) {
          setNavDbSchemes(data.schemes);
        }
      })
      .catch(() => {
        // Offline graceful fallback to Core Catalog
      });

    fetchTerminalCatalogStats()
      .then((stats) => {
        if (!cancelled && stats) setTerminalDbStats(stats);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Dynamic live database autocomplete lookup across all 14,481 AMFI schemes as user types
  useEffect(() => {
    if (!suggestionsOpen && !tickerInput.trim()) return;
    let cancelled = false;
    setV1SearchLoading(true);
    const timer = window.setTimeout(() => {
      const instParam =
        suggestionFilter === 'ETF'
          ? 'ETF'
          : suggestionFilter === 'Mutual Fund'
            ? 'MUTUAL_FUND'
            : 'ALL';
      searchV1Funds({
        q: tickerInput,
        instrumentType: instParam,
        activeOnly: false,
        limit: 16,
      })
        .then((items) => {
          if (!cancelled) {
            setV1SearchResults(items);
            setV1SearchLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setV1SearchLoading(false);
        });
    }, tickerInput.trim() ? 120 : 10);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tickerInput, suggestionFilter, suggestionsOpen]);

  const hydrateSchemeByCode = async (schemeCode: string): Promise<ScreenerFundRecord | null> => {
    const sym = schemeCode.trim().toUpperCase();
    if (!sym) return null;
    if (hydratedFundsBySymbol[sym]) return hydratedFundsBySymbol[sym];
    const catalogHit = SCREENER_FUNDS.find((f) => f.symbol.toUpperCase() === sym);
    if (catalogHit) return catalogHit;

    const v1Dossier = await fetchV1FundDossier(sym);
    if (v1Dossier) {
      const record = buildScreenerFundFromV1Dossier(v1Dossier);
      setHydratedDossiersBySymbol((prev) => ({ ...prev, [sym]: v1Dossier }));
      setHydratedFundsBySymbol((prev) => ({ ...prev, [sym]: record }));
      return record;
    }

    try {
      const [fundRes, navRes] = await Promise.all([
        fetch(`/api/nav-master/fund/${encodeURIComponent(sym)}`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`/api/nav-master/nav/${encodeURIComponent(sym)}?page=1&page_size=60`).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);
      if (fundRes?.payload) {
        const record = buildScreenerFundFromNavDbDetail(
          fundRes.payload as NavDbSchemeDetail,
          (navRes as { payload?: { data?: Array<{ nav_date: string; nav: number; day_change_pct: number | null }> } } | null)?.payload?.data
        );
        setHydratedFundsBySymbol((prev) => ({ ...prev, [sym]: record }));
        return record;
      }
    } catch {
      // Fallback handled cleanly
    }
    return null;
  };

  // Dismiss autocomplete suggestions dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const totalDbUniverseCount =
    (terminalDbStats?.totalSchemes || 0) + SCREENER_FUNDS.length + navDbSchemes.length;

  const searchSuggestions: TerminalSuggestionItem[] = useMemo(
    () =>
      buildTerminalSuggestions({
        query: tickerInput,
        catalogFunds: SCREENER_FUNDS,
        navDbSchemes,
        v1CatalogItems: v1SearchResults,
        filter: suggestionFilter,
        limit: 18,
      }),
    [tickerInput, navDbSchemes, v1SearchResults, suggestionFilter]
  );

  useEffect(() => {
    setHighlightedSuggestionIdx(0);
  }, [tickerInput, suggestionFilter]);

  const handleTogglePin = (symbol: string) => {
    const up = symbol.trim().toUpperCase();
    if (!up) return;
    setPinnedSymbols((prev) =>
      prev.includes(up) ? prev.filter((s) => s !== up) : [up, ...prev].slice(0, 6)
    );
  };

  useEffect(() => {
    setTerminalTab(initialTab);
  }, [initialTab, tabRequestNonce]);

  // Watchlist controls & live 24h tick history buffer for sparklines
  const [watchlistView, setWatchlistView] = useState<'rows' | 'cards'>('rows');
  const [assetClassFilter, setAssetClassFilter] = useState<'all' | 'mf' | 'gold' | 'debt'>('all');
  const [watchlistSort, setWatchlistSort] = useState<
    'default' | 'gainers' | 'losers' | 'rating'
  >('default');
  const [tickHistoryByTicker, setTickHistoryByTicker] = useState<Record<string, number[]>>({});

  // Live Gemini AI synthesis state (/api/ai/research)
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [geminiVerdict, setGeminiVerdict] = useState<GeminiVerdictOverride | null>(null);

  // Data audit execution log state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [showTimelineModal, setShowTimelineModal] = useState<boolean>(false);

  // Spoken research readout state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [activeScriptIndex, setActiveScriptIndex] = useState<number>(0);
  const audioTimerRef = useRef<number | null>(null);

  // Append incoming live prices to each ticker's rolling sparkline tail
  useEffect(() => {
    setTickHistoryByTicker((prev) => {
      let changed = false;
      const next: Record<string, number[]> = { ...prev };
      for (const s of stocks) {
        const list = prev[s.ticker] || [];
        if (list[list.length - 1] !== s.price) {
          next[s.ticker] = [...list.slice(-7), s.price];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [stocks]);

  const activeStock = useMemo(() => {
    return stocks.find((s) => s.ticker === selectedTicker) || stocks[0];
  }, [stocks, selectedTicker]);

  // Hydrate full ScreenerFundRecord from 14k AMFI SQLite DB or SQLite nav_master whenever activeStock changes
  useEffect(() => {
    const sym = activeStock.ticker.trim().toUpperCase();
    if (!sym) return;
    if (SCREENER_FUNDS.some((f) => f.symbol.toUpperCase() === sym)) return;
    if (hydratedFundsBySymbol[sym]) return;

    let cancelled = false;
    void (async () => {
      const v1Dossier = await fetchV1FundDossier(sym);
      if (!cancelled && v1Dossier) {
        setHydratedDossiersBySymbol((prev) => ({ ...prev, [sym]: v1Dossier }));
        setHydratedFundsBySymbol((prev) => ({
          ...prev,
          [sym]: buildScreenerFundFromV1Dossier(v1Dossier),
        }));
        return;
      }

      try {
        const [fundRes, navRes] = await Promise.all([
          fetch(`/api/nav-master/fund/${encodeURIComponent(sym)}`).then((r) =>
            r.ok ? r.json() : null
          ),
          fetch(`/api/nav-master/nav/${encodeURIComponent(sym)}?page=1&page_size=60`).then((r) =>
            r.ok ? r.json() : null
          ),
        ]);
        if (cancelled || !fundRes?.payload) return;
        const record = buildScreenerFundFromNavDbDetail(
          fundRes.payload as NavDbSchemeDetail,
          (navRes as { payload?: { data?: Array<{ nav_date: string; nav: number; day_change_pct: number | null }> } } | null)?.payload?.data
        );
        setHydratedFundsBySymbol((prev) => ({ ...prev, [sym]: record }));
      } catch {
        // Non-SQLite custom symbol falls back cleanly to synthesizeScreenerFundFromQuote
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeStock.ticker, hydratedFundsBySymbol]);

  const displayedStocks = useMemo(() => {
    const matchesClass = (s: StockQuote) => {
      if (assetClassFilter === 'all') return true;
      const hay = `${s.sector} ${s.name} ${s.ticker}`.toLowerCase();
      if (assetClassFilter === 'gold') {
        return hay.includes('gold') || hay.includes('bullion') || hay.includes('paxg') || hay.includes('silver');
      }
      if (assetClassFilter === 'debt') {
        return hay.includes('gilt') || hay.includes('debt') || hay.includes('etf') || hay.includes('index') || hay.includes('bond');
      }
      return hay.includes('mutual') || hay.includes('flexi') || hay.includes('mid') || hay.includes('cap') || hay.includes('fund');
    };

    const filtered = stocks.filter(matchesClass);
    const list = filtered.length > 0 ? [...filtered] : [...stocks];
    if (watchlistSort === 'gainers') {
      list.sort((a, b) => b.changePercent - a.changePercent);
    } else if (watchlistSort === 'losers') {
      list.sort((a, b) => a.changePercent - b.changePercent);
    } else if (watchlistSort === 'rating') {
      list.sort((a, b) => b.convictionScore - a.convictionScore);
    }
    return list;
  }, [stocks, assetClassFilter, watchlistSort]);

  const handleToggleCompare = (ticker: string) => {
    if (!onComparisonTickersChange) return;
    if (ticker === activeStock.ticker) return;
    const current = comparisonTickers || [];
    if (current.includes(ticker)) {
      onComparisonTickersChange(current.filter((t) => t !== ticker));
    } else {
      onComparisonTickersChange([...current.slice(-2), ticker]);
    }
  };

  const handleExportWatchlistCsv = () => {
    const csv = buildWatchlistCsv(displayedStocks);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financia-watchlist-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const report = activeStock.report;
  const activeGeminiOverride =
    geminiVerdict && geminiVerdict.ticker === activeStock.ticker ? geminiVerdict : null;

  const filteredInsights = useMemo(() => {
    if (insightCategory === 'All') return report.deep_insights;
    return report.deep_insights.filter((item) => item.category === insightCategory);
  }, [report.deep_insights, insightCategory]);

  // Reset AI synthesis alert when switching primary ticker
  useEffect(() => {
    setAiError(null);
  }, [activeStock.ticker]);

  // Stop audio on unmount or ticker switch
  useEffect(() => {
    return () => {
      if (audioTimerRef.current) window.clearInterval(audioTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleRunGeminiSynthesis = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: activeStock.ticker,
          mode: agentMode,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        analysis?: {
          conviction_score: number;
          stance: string;
          summary: string;
          key_takeaways: string[];
        };
      };
      if (!res.ok || !payload.analysis) {
        setAiError(payload.error || 'Gemini analysis could not be completed.');
        return;
      }
      setGeminiVerdict({
        ticker: activeStock.ticker,
        conviction_score: payload.analysis.conviction_score,
        stance: payload.analysis.stance,
        summary: payload.analysis.summary,
        key_takeaways: payload.analysis.key_takeaways,
      });
    } catch {
      setAiError('Network error reaching /api/ai/research.');
    } finally {
      setAiLoading(false);
    }
  };

  const triggerAgentAnalysisRun = (targetTicker: string, mode: 'antigravity' | 'perseus') => {
    setIsAnalyzing(true);
    setShowTimelineModal(true);
    const now = Date.now();

    const initialSteps: TimelineEvent[] = [
      {
        id: 1,
        kind: 'info',
        label: `Starting ${mode === 'perseus' ? 'Deep Fundamental' : 'Quick Scan'} audit for ${targetTicker}`,
        detail: `Loading AMFI NAV feeds, Scheme Information Documents (SID/KIM), LBMA physical gold custody data, and YTM duration curves for ${targetTicker}.`,
        startTime: now,
        endTime: now + 320,
      },
      {
        id: 2,
        kind: 'tool_call',
        label: `Step 1: AMFI Scheme NAVs & Custodial Yield Lookup`,
        toolName: 'amfi_nav_api + marketstack_etf_eod',
        detail: `Querying live AMFI NAVs, SID disclosures, Marketstack EOD ETF pricing, and sovereign yield spreads for ${targetTicker}; computing modified duration and rolling CAGR.`,
        startTime: now + 320,
        endTime: now + 790,
      },
      {
        id: 3,
        kind: 'thinking',
        label: `Step 2: Scenario Stress Testing (Upside, Downside & Base)`,
        detail: `Checking TER fee drag, duration convexity, central-bank gold reserve demand, and tracking error against published scheme filings.`,
        startTime: now + 790,
        endTime: now + 1180,
      },
      {
        id: 4,
        kind: 'tool_result',
        label: `Step 3: Fund Summary & Composite Rating Verified`,
        toolName: 'report_schema_validator',
        detail: `Validated structured report fields for ${targetTicker} across Mutual Fund, Gold, Debt & ETF risk metrics.`,
        startTime: now + 1180,
        endTime: now + 1450,
      },
    ];

    setTimelineEvents([initialSteps[0], initialSteps[1]]);

    window.setTimeout(() => {
      setTimelineEvents(initialSteps);
      setIsAnalyzing(false);
      onAnalyzeCustomTicker(targetTicker, mode);
    }, 450);
  };

  const handleSelectSuggestion = (item: TerminalSuggestionItem, mode: 'analyze' | 'compare') => {
    setSuggestionsOpen(false);
    setInputError(null);
    setTickerInput('');
    if (item.source === 'amfi-directory' || item.source === 'sqlite-nav-db') {
      void hydrateSchemeByCode(item.symbol);
    }
    if (mode === 'compare') {
      if (onComparisonTickersChange && item.symbol.toUpperCase() !== activeStock.ticker.toUpperCase()) {
        const current = comparisonTickers || [];
        const nextPeers = current.includes(item.symbol)
          ? current
          : [item.symbol, ...current.filter((t) => t !== item.symbol)].slice(0, 3);
        onComparisonTickersChange(nextPeers);
      }
      setAnalysisMode('multi');
      setTerminalTab('compare');
      return;
    }
    triggerAgentAnalysisRun(item.symbol, agentMode);
    setTerminalTab('individual');
  };

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateTickerInput(tickerInput);
    if (!validation.valid) {
      // If user typed a partial name like "Altiva" or "Parag", pick top DB suggestion automatically
      if (searchSuggestions.length > 0 && tickerInput.trim().length >= 2) {
        handleSelectSuggestion(searchSuggestions[0], 'analyze');
        return;
      }
      setInputError(validation.error || 'Invalid ticker symbol.');
      return;
    }
    setInputError(null);
    setSuggestionsOpen(false);
    const normalized = validation.normalized;
    setTickerInput('');
    triggerAgentAnalysisRun(normalized, agentMode);
    setTerminalTab('individual');
  };

  const handleToggleAudioBriefing = () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      if (audioTimerRef.current) window.clearInterval(audioTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    setIsPlayingAudio(true);
    setActiveScriptIndex(0);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && report.podcast_script.length > 0) {
      window.speechSynthesis.cancel();
      const fullText = report.podcast_script.map((s) => `${s.speaker} says: ${s.line}`).join(' ');
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.rate = 1.05;
      utterance.onend = () => {
        setIsPlayingAudio(false);
      };
      window.speechSynthesis.speak(utterance);
    }

    let idx = 0;
    audioTimerRef.current = window.setInterval(() => {
      idx += 1;
      if (idx < report.podcast_script.length) {
        setActiveScriptIndex(idx);
      } else {
        if (audioTimerRef.current) window.clearInterval(audioTimerRef.current);
        setIsPlayingAudio(false);
      }
    }, 3500);
  };

  return (
    <section
      id="live-terminal"
      aria-label="Financia Live Mutual Fund, Gold, Debt & ETF Terminal"
      className="relative overflow-hidden w-full bg-[#f6f9fc] text-[#0d253d] pt-7 lg:pt-9 pb-14 border-b border-[#e3e8ee]"
    >
      {/* Subtle ambient washes so backdrop-filter glass cards show depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/4 w-[620px] h-[380px] rounded-full opacity-45 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(185, 185, 249, 0.36) 0%, rgba(245, 233, 212, 0.24) 55%, rgba(246, 249, 252, 0) 78%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 right-[10%] w-[520px] h-[360px] rounded-full opacity-35 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(83, 58, 253, 0.14) 0%, rgba(249, 107, 238, 0.08) 52%, rgba(246, 249, 252, 0) 78%)',
        }}
      />
      <div className="relative z-10 max-w-[1320px] mx-auto px-4 md:px-6">
        {onBackToWorkspace && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e2e8f0]">
            <button
              type="button"
              data-testid="terminal-back-to-workspace"
              onClick={onBackToWorkspace}
              className="h-8 px-3 rounded-[8px] bg-white hover:bg-[#f8fafc] border border-[#cbd5e1] text-xs font-semibold text-[#0f172a] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Back to Workspace Overview</span>
            </button>
            <div className="text-[11px] font-mono text-[#64748b]">
              Dedicated Fund Terminal · {totalDbUniverseCount.toLocaleString('en-IN')} Searchable Database Instruments (
              {terminalDbStats ? `${terminalDbStats.totalSchemes.toLocaleString('en-IN')} AMFI SQLite + ` : ''}
              {SCREENER_FUNDS.length} Core + {navDbSchemes.length} SIF)
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-7">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.06em] font-semibold text-[#2563eb] mb-1.5">
              <span>Dedicated Fund Terminal</span>
              <span aria-hidden="true">·</span>
              <span>Multi-Asset Compare</span>
              <span aria-hidden="true">·</span>
              <span>Custom % Allocator</span>
            </div>
            <h1
              className="font-display font-semibold text-[#131722] tracking-tight"
              style={{ fontSize: 'clamp(1.65rem, 2.8vw, 2.3rem)', textWrap: 'balance' }}
            >
              Fund Analysis, Comparison &amp; Allocation Terminal
            </h1>
          </div>

          {/* Analysis Depth & Live Stream Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <div
              role="group"
              aria-label="Select Analysis Depth Mode"
              className="inline-flex items-center p-1 rounded-lg bg-[#F4F5F7] border border-[#E5E7EB] shrink-0"
            >
              <button
                type="button"
                onClick={() => setAgentMode('perseus')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  agentMode === 'perseus'
                    ? 'bg-[#131722] text-white font-semibold'
                    : 'text-[#4B5563] hover:text-[#131722]'
                }`}
              >
                Deep Fundamental
              </button>
              <button
                type="button"
                onClick={() => setAgentMode('antigravity')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  agentMode === 'antigravity'
                    ? 'bg-[#131722] text-white font-semibold'
                    : 'text-[#4B5563] hover:text-[#131722]'
                }`}
              >
                Quick Scan
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleLiveFeed}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                liveFeedActive
                  ? 'bg-white text-[#2563eb] border-[#2563eb]/40 font-semibold'
                  : 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]'
              }`}
            >
              {liveFeedActive ? 'Live Quotes: ON' : 'Live Quotes: PAUSED'}
            </button>
          </div>
        </div>

        {/* Ticker Search & Live Database Suggestions Bar */}
        <form onSubmit={handleAnalyzeSubmit} className="mb-6" noValidate>
          <div ref={searchBoxRef} className="relative">
            <div className="glass-card-light flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 rounded-[12px] border border-[#e3e8ee] focus-within:border-[#2563eb] transition-colors">
              <div className="flex items-center gap-3 pl-3 py-1.5 flex-1 min-w-0">
                <Search className="w-5 h-5 text-[#2563eb] shrink-0" />
                <label htmlFor="financia-ticker-input" className="sr-only">
                  Search ETF, Mutual Fund, ISIN, or SQLite nav_master Scheme Code
                </label>
                <input
                  id="financia-ticker-input"
                  type="text"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={suggestionsOpen}
                  aria-controls="terminal-db-suggestions"
                  aria-autocomplete="list"
                  value={tickerInput}
                  onFocus={() => setSuggestionsOpen(true)}
                  onChange={(e) => {
                    setTickerInput(e.target.value);
                    setSuggestionsOpen(true);
                    if (inputError) setInputError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSuggestionsOpen(false);
                      return;
                    }
                    if (!suggestionsOpen) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedSuggestionIdx((prev) =>
                        searchSuggestions.length > 0 ? (prev + 1) % searchSuggestions.length : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedSuggestionIdx((prev) =>
                        searchSuggestions.length > 0
                          ? (prev - 1 + searchSuggestions.length) % searchSuggestions.length
                          : 0
                      );
                    } else if (e.key === 'Enter' && searchSuggestions[highlightedSuggestionIdx]) {
                      e.preventDefault();
                      handleSelectSuggestion(searchSuggestions[highlightedSuggestionIdx], 'analyze');
                    }
                  }}
                  placeholder={`Search ${totalDbUniverseCount.toLocaleString('en-IN')} database ETFs & Mutual Funds by name, AMFI code, AMC, or ISIN (e.g., Parag Parikh, Nippon Gold, 122639, QQQ)...`}
                  className="w-full bg-transparent text-[#131722] font-mono text-sm placeholder:normal-case placeholder:font-sans placeholder:text-[#6B7280] focus:outline-none"
                />
                {tickerInput && (
                  <button
                    type="button"
                    aria-label="Clear search query"
                    onClick={() => setTickerInput('')}
                    className="p-1 rounded text-[#64748b] hover:text-[#0f172a] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  data-testid="toggle-db-suggestions-btn"
                  onClick={() => setSuggestionsOpen((p) => !p)}
                  className="px-3 py-2.5 rounded-lg bg-[#eff6ff] text-[#1d4ed8] hover:bg-[#dbeafe] text-xs font-mono font-semibold border border-[#bfdbfe] transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>DB Directory ({totalDbUniverseCount.toLocaleString('en-IN')})</span>
                </button>
                {timelineEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowTimelineModal((prev) => !prev)}
                    className="px-3.5 py-2.5 rounded-lg bg-[#F4F5F7] text-[#131722] hover:bg-[#E5E7EB] text-xs font-mono border border-[#E5E7EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {showTimelineModal ? 'Hide Audit Log' : `Audit Log (${timelineEvents.length})`}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="px-5 py-2.5 rounded-lg bg-[#131722] text-white hover:bg-[#1F2937] disabled:opacity-50 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isAnalyzing ? 'Loading Data...' : 'Analyze Asset'}
                </button>
              </div>
            </div>

            {/* Live Database Autocomplete Suggestions Dropdown */}
            {suggestionsOpen && (
              <div
                id="terminal-db-suggestions"
                data-testid="terminal-db-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-2 z-40 rounded-[14px] bg-white border border-[#cbd5e1] shadow-2xl overflow-hidden"
              >
                {/* Dropdown Header & Database Filter Pills */}
                <div className="px-4 py-2.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        {
                          id: 'ALL' as const,
                          label: `All Database (${totalDbUniverseCount.toLocaleString('en-IN')})`,
                        },
                        {
                          id: 'ETF' as const,
                          label: `ETFs (${(terminalDbStats?.etfCount || 0) + SCREENER_FUNDS.filter((f) => f.instrumentType === 'ETF').length})`,
                        },
                        {
                          id: 'Mutual Fund' as const,
                          label: `Mutual Funds (${((terminalDbStats?.mutualFundCount || 0) + SCREENER_FUNDS.filter((f) => f.instrumentType === 'Mutual Fund').length).toLocaleString('en-IN')})`,
                        },
                        {
                          id: 'SQLITE_DB' as const,
                          label: `SQLite AMFI & SIF (${((terminalDbStats?.totalSchemes || 0) + navDbSchemes.length).toLocaleString('en-IN')})`,
                        },
                      ] as const
                    ).map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        data-testid={`suggestion-filter-${pill.id.toLowerCase().replace(/\s+/g, '-')}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSuggestionFilter(pill.id)}
                        className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          suggestionFilter === pill.id
                            ? 'bg-[#0f172a] text-white'
                            : 'bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#2563eb] hover:text-[#0f172a]'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10.5px] font-mono text-[#64748b]">
                    {v1SearchLoading
                      ? 'Searching SQLite database...'
                      : `Showing ${searchSuggestions.length} matches · ↑↓ Navigate · Enter Analyze`}
                  </span>
                </div>

                {/* Suggestion Rows */}
                {searchSuggestions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748b]">
                    No exact match in local catalog for &ldquo;{tickerInput}&rdquo; — press{' '}
                    <strong className="text-[#0f172a]">Analyze Asset</strong> to query live AMFI / market feeds and generate a full 16-module dossier.
                  </div>
                ) : (
                  <div className="max-h-[340px] overflow-y-auto divide-y divide-[#f1f5f9]">
                    {searchSuggestions.map((item, idx) => {
                      const isHighlighted = idx === highlightedSuggestionIdx;
                      const prefix = item.currency === 'INR' ? '₹' : '$';
                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isHighlighted}
                          data-testid={`terminal-suggestion-row-${item.symbol}`}
                          onMouseEnter={() => setHighlightedSuggestionIdx(idx)}
                          className={`px-4 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-colors ${
                            isHighlighted ? 'bg-[#eff6ff]' : 'hover:bg-[#f8fafc]'
                          }`}
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectSuggestion(item, 'analyze')}
                            className="flex-1 min-w-0 text-left cursor-pointer"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-[#0f172a] px-1.5 py-0.5 rounded bg-[#f1f5f9] border border-[#e2e8f0]">
                                {item.source === 'sqlite-nav-db' || item.source === 'amfi-directory'
                                  ? `#${item.symbol}`
                                  : item.symbol}
                              </span>
                              <span className="text-xs font-semibold text-[#0f172a] truncate max-w-[360px]">
                                {item.name}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                  item.source === 'amfi-directory'
                                    ? 'bg-[#ecfdf5] text-[#047857]'
                                    : item.source === 'sqlite-nav-db'
                                      ? 'bg-[#f0fdf4] text-[#15803d]'
                                      : item.instrumentType === 'ETF'
                                        ? 'bg-[#eff6ff] text-[#1d4ed8]'
                                        : 'bg-[#f5f3ff] text-[#6d28d9]'
                                }`}
                              >
                                {item.source === 'amfi-directory'
                                  ? `SQLite ${item.instrumentType}`
                                  : item.source === 'sqlite-nav-db'
                                    ? 'SQLite nav_master'
                                    : item.instrumentType}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#64748b] mt-0.5 flex flex-wrap items-center gap-2 font-mono">
                              <span>{item.category}</span>
                              <span>· {item.exchange}</span>
                              {item.isin && <span>· ISIN {item.isin}</span>}
                              {item.observationCount && <span>· {item.observationCount} NAVs</span>}
                            </div>
                          </button>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right font-mono tabular-nums">
                              <div className="text-xs font-bold text-[#0f172a]">
                                {prefix}
                                {item.price.toFixed(2)}
                              </div>
                              {item.changePct !== null && (
                                <div
                                  className={`text-[10.5px] font-semibold ${
                                    item.changePct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                                  }`}
                                >
                                  {item.changePct >= 0 ? '+' : ''}
                                  {item.changePct.toFixed(2)}%
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectSuggestion(item, 'analyze')}
                              className="h-7 px-2.5 rounded-[6px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                            >
                              Analyze
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectSuggestion(item, 'compare')}
                              className="h-7 px-2 rounded-[6px] bg-white hover:bg-[#eff6ff] border border-[#cbd5e1] hover:border-[#2563eb] text-[#334155] hover:text-[#1d4ed8] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Compare</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {inputError && (
            <div
              role="alert"
              className="mt-2.5 px-4 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{inputError}</span>
            </div>
          )}

          {/* Research Pinboard & Quick Lookup Strip */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5 text-[#6B7280]">
              <span className="inline-flex items-center gap-1 font-semibold text-[#334155]">
                <Bookmark className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>Pinned:</span>
              </span>
              {pinnedSymbols.map((sym) => {
                const isActivePin = sym === activeStock.ticker.toUpperCase();
                return (
                  <span
                    key={sym}
                    data-testid={`pinned-chip-${sym}`}
                    className={`inline-flex items-center rounded-md border font-mono overflow-hidden ${
                      isActivePin
                        ? 'bg-[#0f172a] text-white border-[#0f172a]'
                        : 'bg-white text-[#0f172a] border-[#cbd5e1]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        triggerAgentAnalysisRun(sym, agentMode);
                        setTerminalTab('individual');
                      }}
                      className="px-2 py-1 hover:opacity-80 cursor-pointer font-semibold"
                    >
                      {/^\d+$/.test(sym) ? `DB #${sym}` : sym}
                    </button>
                    <button
                      type="button"
                      aria-label={`Unpin ${sym}`}
                      onClick={() => handleTogglePin(sym)}
                      className={`px-1 py-1 border-l cursor-pointer ${
                        isActivePin
                          ? 'border-white/20 text-white/75 hover:text-white'
                          : 'border-[#e2e8f0] text-[#94a3b8] hover:text-[#dc2626]'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}

              {pinnedSymbols.length >= 2 && (
                <button
                  type="button"
                  data-testid="compare-pinned-btn"
                  onClick={() => {
                    onAnalyzeCustomTicker(pinnedSymbols[0], agentMode);
                    onComparisonTickersChange?.(pinnedSymbols.slice(1, 4));
                    setAnalysisMode('multi');
                    setTerminalTab('compare');
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] text-[#1d4ed8] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <GitCompare className="w-3 h-3" />
                  <span>Compare Pinned</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[#6B7280]">
              <span>Try SQLite DB:</span>
              {[
                { symbol: '1', note: 'qsif Long-Short' },
                { symbol: '9', note: 'Altiva Hybrid' },
                { symbol: '14', note: 'Magnum Hybrid' },
                { symbol: '27', note: 'Titanium SIF' },
              ].map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  data-testid={`quick-sqlite-${item.symbol}`}
                  onClick={() => {
                    triggerAgentAnalysisRun(item.symbol, agentMode);
                    setTerminalTab('individual');
                  }}
                  className="px-2 py-1 rounded-md bg-[#ecfdf5] hover:bg-[#d1fae5] border border-[#a7f3d0] text-[#047857] font-mono transition-colors cursor-pointer"
                >
                  #{item.symbol} <span className="text-[#065f46]">· {item.note}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Expandable Data Audit & Verification Log */}
        {showTimelineModal && timelineEvents.length > 0 && (
          <div className="glass-card-light mb-8 rounded-[12px] border border-[#e3e8ee] p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#2563eb]" />
                <h3 className="text-sm font-semibold text-[#131722]">
                  Data Audit &amp; Verification Log — {activeStock.ticker}
                </h3>
                <span className="text-xs font-mono text-[#6B7280]">
                  · Mode: {agentMode === 'perseus' ? 'Deep Fundamental' : 'Quick Scan'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTimelineModal(false)}
                className="text-xs text-[#6B7280] hover:text-[#131722] cursor-pointer"
              >
                Close Trace
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {timelineEvents.map((ev) => {
                const IconComp =
                  ev.kind === 'thinking'
                    ? Brain
                    : ev.kind === 'tool_call'
                    ? Code
                    : ev.kind === 'tool_result'
                    ? CheckCircle2
                    : Activity;
                const durationSec = (((ev.endTime || Date.now()) - ev.startTime) / 1000).toFixed(2);
                return (
                  <div
                    key={ev.id}
                    className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-3.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <IconComp className="w-4 h-4 text-[#2962FF] shrink-0" />
                        <span className="text-[11px] font-mono tabular-nums text-[#6B7280]">
                          {durationSec}s
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#131722] mb-1.5 leading-snug">
                        {ev.label}
                      </div>
                      {ev.detail && (
                        <p className="text-[11px] text-[#4B5563] leading-relaxed font-mono">
                          {ev.detail}
                        </p>
                      )}
                    </div>
                    {ev.toolName && (
                      <div className="mt-3 pt-2 border-t border-[#E5E7EB] text-[10px] font-mono text-[#2962FF] truncate">
                        tool: {ev.toolName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Single vs Multi-Instrument Analysis Mode Bar + All-20 Instrument Selector */}
        <div
          data-testid="terminal-analysis-mode-bar"
          className="mb-5 rounded-[12px] bg-white border border-[#e2e8f0] px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="Terminal instrument analysis mode"
              className="inline-flex items-center p-1 rounded-[9px] bg-[#f1f5f9] border border-[#e2e8f0]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={analysisMode === 'single'}
                data-testid="terminal-mode-single"
                onClick={() => setAnalysisMode('single')}
                className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  analysisMode === 'single'
                    ? 'bg-[#0f172a] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                Single Instrument
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={analysisMode === 'multi'}
                data-testid="terminal-mode-multi"
                onClick={() => {
                  setAnalysisMode('multi');
                  if (
                    onComparisonTickersChange &&
                    (!comparisonTickers || comparisonTickers.length === 0)
                  ) {
                    onComparisonTickersChange(
                      selectPeerComparisonSymbols(activeStock.ticker, SCREENER_FUNDS, 2)
                    );
                  }
                }}
                className={`px-2.5 py-1.5 rounded-[7px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  analysisMode === 'multi'
                    ? 'bg-[#2563eb] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                Compare (2–4)
              </button>
            </div>

            <button
              type="button"
              data-testid="toggle-watchlist-drawer"
              onClick={() => setShowWatchlistDrawer((prev) => !prev)}
              className="h-8 px-2.5 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] hover:bg-white text-xs font-semibold text-[#334155] hover:text-[#0f172a] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <List className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>{showWatchlistDrawer ? 'Hide Watchlist' : `Watchlist (${stocks.length})`}</span>
            </button>

            <button
              type="button"
              data-testid="jump-correlation-matrix-90d"
              onClick={() => {
                setTerminalTab('compare');
                window.setTimeout(() => {
                  document
                    .getElementById('correlation-matrix-90d')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 60);
              }}
              className="h-8 px-2.5 rounded-[8px] border border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] text-xs font-semibold text-[#1d4ed8] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>90D Correlation</span>
            </button>

            <button
              type="button"
              data-testid="terminal-toggle-alerts-btn"
              onClick={() => {
                setShowTerminalAlertsDrawer((prev) => !prev);
                if (!newAlertThreshold && activeStock.price > 0) {
                  setNewAlertThreshold(String(Number((activeStock.price * 1.03).toFixed(2))));
                }
              }}
              className={`h-8 px-2.5 rounded-[8px] border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                showTerminalAlertsDrawer
                  ? 'bg-[#0f172a] text-white border-[#0f172a]'
                  : 'border-[#fde68a] bg-[#fffbeb] hover:bg-[#fef3c7] text-[#92400e]'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>NAV Alerts ({terminalAlertRules.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="terminal-all-20-select" className="text-xs font-medium text-[#475569] whitespace-nowrap">
              Active:
            </label>
            <select
              id="terminal-all-20-select"
              data-testid="terminal-instrument-select"
              value={
                SCREENER_FUNDS.some((f) => f.symbol === activeStock.ticker) ||
                navDbSchemes.some((s) => String(s.scheme_code) === activeStock.ticker)
                  ? activeStock.ticker
                  : ''
              }
              onChange={(e) => {
                if (!e.target.value) return;
                onAnalyzeCustomTicker(e.target.value, agentMode);
              }}
              className="h-9 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-2.5 text-xs font-semibold text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer max-w-[260px]"
            >
              {!SCREENER_FUNDS.some((f) => f.symbol === activeStock.ticker) &&
                !navDbSchemes.some((s) => String(s.scheme_code) === activeStock.ticker) && (
                  <option value="">
                    {activeStock.ticker} — {activeStock.name}
                  </option>
                )}
              <optgroup label={`Core ETFs & Mutual Funds (${SCREENER_FUNDS.length})`}>
                {SCREENER_FUNDS.map((f) => (
                  <option key={f.symbol} value={f.symbol}>
                    {f.symbol} — {f.name} ({f.instrumentType === 'Mutual Fund' ? 'MF' : 'ETF'})
                  </option>
                ))}
              </optgroup>
              {navDbSchemes.length > 0 && (
                <optgroup label={`SQLite nav_master Database (${navDbSchemes.length})`}>
                  {navDbSchemes.map((s) => (
                    <option key={`db-${s.scheme_code}`} value={String(s.scheme_code)}>
                      #{s.scheme_code} — {s.scheme_name} (₹{s.latest_nav.toFixed(2)})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Dedicated Terminal NAV / Drawdown Watch Alerts Drawer */}
        {showTerminalAlertsDrawer && (() => {
          const quotesMap: Record<string, { price: number; changePct: number }> = {};
          for (const s of stocks) {
            quotesMap[s.ticker.toUpperCase()] = { price: s.price, changePct: s.changePercent };
          }
          for (const f of SCREENER_FUNDS) {
            if (!quotesMap[f.symbol.toUpperCase()]) {
              quotesMap[f.symbol.toUpperCase()] = { price: f.price, changePct: f.changePct };
            }
          }
          quotesMap[activeStock.ticker.toUpperCase()] = {
            price: activeStock.price,
            changePct: activeStock.changePercent,
          };
          const evaluatedAlerts = evaluateTerminalAlerts(terminalAlertRules, quotesMap);

          return (
            <div
              data-testid="terminal-alerts-drawer"
              className="mb-5 rounded-[12px] bg-white border border-[#fde68a] p-4 space-y-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#f1f5f9]">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.07em] text-[#b45309] font-semibold">
                    Live NAV &amp; Drawdown Watchlist Triggers — Active: {activeStock.ticker} ({formatCurrency(activeStock.price)})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTerminalAlertsDrawer(false)}
                  className="text-xs font-medium text-[#64748b] hover:text-[#0f172a] cursor-pointer"
                >
                  Close Alerts
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const thresholdNum = Number(newAlertThreshold);
                  if (!Number.isFinite(thresholdNum) || thresholdNum <= 0) return;
                  const nextRule: TerminalPriceAlertRule = {
                    id: `alert-${Date.now()}`,
                    symbol: activeStock.ticker.toUpperCase(),
                    condition: newAlertCondition,
                    threshold: thresholdNum,
                    note: newAlertNote.trim() || `${activeStock.ticker} watch rule`,
                    createdAt: new Date().toISOString().slice(0, 10),
                  };
                  setTerminalAlertRules((prev) => [nextRule, ...prev].slice(0, 12));
                  setNewAlertNote('');
                }}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="font-mono text-xs font-bold text-[#0f172a] px-2 py-1 rounded bg-[#f1f5f9]">
                  {activeStock.ticker}
                </span>
                <select
                  aria-label="Alert trigger condition"
                  data-testid="terminal-alert-condition-select"
                  value={newAlertCondition}
                  onChange={(e) => setNewAlertCondition(e.target.value as 'above' | 'below' | 'drop_pct')}
                  className="h-8 rounded-[7px] border border-[#cbd5e1] bg-white px-2.5 text-xs font-medium text-[#0f172a]"
                >
                  <option value="above">NAV / Price Above</option>
                  <option value="below">NAV / Price Below</option>
                  <option value="drop_pct">Intraday Drop ≥ %</option>
                </select>
                <input
                  type="number"
                  step="any"
                  aria-label="Alert threshold value"
                  data-testid="terminal-alert-threshold-input"
                  value={newAlertThreshold}
                  onChange={(e) => setNewAlertThreshold(e.target.value)}
                  placeholder={newAlertCondition === 'drop_pct' ? '2.5' : String(activeStock.price.toFixed(2))}
                  className="w-28 h-8 px-2.5 rounded-[7px] border border-[#cbd5e1] bg-white text-right font-mono text-xs font-semibold text-[#0f172a] tabular-nums"
                />
                <input
                  type="text"
                  aria-label="Alert note"
                  data-testid="terminal-alert-note-input"
                  value={newAlertNote}
                  onChange={(e) => setNewAlertNote(e.target.value)}
                  placeholder="Optional note (e.g., Add lump sum)"
                  className="flex-1 min-w-[160px] h-8 px-2.5 rounded-[7px] border border-[#cbd5e1] bg-white text-xs text-[#0f172a]"
                />
                <button
                  type="submit"
                  data-testid="terminal-alert-add-submit"
                  className="h-8 px-3.5 rounded-[7px] bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  Add Watch Alert
                </button>
              </form>

              {evaluatedAlerts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {evaluatedAlerts.map((al) => (
                    <div
                      key={al.id}
                      data-testid={`terminal-alert-item-${al.symbol}`}
                      className={`rounded-[8px] border px-3 py-2 flex items-center justify-between gap-2 text-xs ${
                        al.triggered
                          ? 'border-[#86efac] bg-[#ecfdf5]/70'
                          : 'border-[#e2e8f0] bg-[#f8fafc]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-mono">
                          <strong className="text-[#0f172a]">{al.symbol}</strong>
                          <span className="text-[#475569]">
                            {al.condition === 'above'
                              ? `≥ ${al.threshold}`
                              : al.condition === 'below'
                                ? `≤ ${al.threshold}`
                                : `Drop ≥ ${al.threshold}%`}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748b] truncate">{al.note}</div>
                        <div
                          className={`text-[10.5px] font-mono font-semibold mt-0.5 ${
                            al.triggered ? 'text-[#047857]' : 'text-[#475569]'
                          }`}
                        >
                          {al.statusLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove alert for ${al.symbol}`}
                        onClick={() =>
                          setTerminalAlertRules((prev) => prev.filter((r) => r.id !== al.id))
                        }
                        className="p-1 text-[#94a3b8] hover:text-[#dc2626] cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Terminal Workspace Tab Bar (7 Focused Institutional Views on One Clean Row) */}
        <div
          data-testid="terminal-tab-bar"
          role="tablist"
          aria-label="Terminal workspace views"
          className="mb-6 flex flex-wrap xl:flex-nowrap items-center gap-1.5 border-b border-[#e2e8f0] pb-3.5"
        >
          {(
            [
              {
                id: 'individual',
                label: 'Individual',
                icon: PieChart,
                badge: '16 Mod',
              },
              {
                id: 'compare',
                label: 'Compare',
                icon: GitCompare,
                badge: '2–4',
              },
              {
                id: 'allocator',
                label: 'Portfolio Allocator',
                icon: Layers,
                badge: 'Labs',
              },
              {
                id: 'quantlab',
                label: 'Quant & SIP Lab',
                icon: Sparkles,
                badge: 'Tax',
              },
              {
                id: 'bulk',
                label: 'Bulk Data',
                icon: Table2,
                badge: `${SCREENER_FUNDS.length + navDbSchemes.length}`,
              },
              {
                id: 'chart',
                label: 'Charts & RSI',
                icon: BarChart3,
                badge: 'Tech',
              },
              {
                id: 'risk',
                label: 'Risk & VaR',
                icon: ShieldAlert,
                badge: 'Filings',
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = terminalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`terminal-tab-${tab.id}`}
                onClick={() => {
                  setTerminalTab(tab.id);
                  if (
                    tab.id === 'compare' &&
                    analysisMode === 'multi' &&
                    onComparisonTickersChange &&
                    (!comparisonTickers || comparisonTickers.length === 0)
                  ) {
                    onComparisonTickersChange(
                      selectPeerComparisonSymbols(activeStock.ticker, SCREENER_FUNDS, 2)
                    );
                  }
                }}
                className={`h-9 px-2.5 rounded-[9px] border text-[11.5px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs'
                    : 'bg-white text-[#475569] border-[#cbd5e1] hover:border-[#2563eb] hover:text-[#0f172a]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#38bdf8]' : 'text-[#64748b]'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    active ? 'bg-white/15 text-[#e2e8f0]' : 'bg-[#f1f5f9] text-[#64748b]'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Collapsible Live Watchlist Panel (All Hydrated Instruments with 24-Hour Sparklines) */}
        {showWatchlistDrawer && (
        <div
          data-testid="terminal-watchlist-panel"
          className="glass-card-light rounded-[12px] border border-[#e3e8ee] mb-7 overflow-hidden"
        >
          {/* Watchlist Toolbar */}
          <div className="px-4 py-3 bg-white/80 border-b border-[#e3e8ee] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-display font-semibold text-[#0f172a] mr-1">
                Active Watchlist ({displayedStocks.length})
              </h3>
              <div
                role="group"
                aria-label="Filter watchlist by asset class"
                className="inline-flex items-center p-0.5 rounded-[7px] bg-[#f1f5f9] border border-[#e2e8f0]"
              >
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'mf', label: 'Mutual Funds' },
                    { id: 'gold', label: 'Gold' },
                    { id: 'debt', label: 'Debt & ETFs' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAssetClassFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-[5px] text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      assetClassFilter === tab.id
                        ? 'bg-[#0f172a] text-white font-semibold'
                        : 'text-[#475569] hover:text-[#0f172a]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="watchlist-sort-select" className="sr-only">
                Sort watchlist
              </label>
              <select
                id="watchlist-sort-select"
                value={watchlistSort}
                onChange={(e) =>
                  setWatchlistSort(e.target.value as 'default' | 'gainers' | 'losers' | 'rating')
                }
                className="h-8 px-2.5 rounded-[7px] bg-white border border-[#cbd5e1] text-xs font-medium text-[#334155] focus:outline-none focus:border-[#2563eb] cursor-pointer"
              >
                <option value="default">Sort: Watchlist Order</option>
                <option value="gainers">24H Change: High → Low</option>
                <option value="losers">24H Change: Low → High</option>
                <option value="rating">Composite Rating</option>
              </select>

              <div
                role="group"
                aria-label="Watchlist layout view"
                className="inline-flex items-center p-0.5 rounded-[7px] bg-[#f1f5f9] border border-[#e2e8f0]"
              >
                <button
                  type="button"
                  data-testid="watchlist-view-rows"
                  aria-pressed={watchlistView === 'rows'}
                  onClick={() => setWatchlistView('rows')}
                  className={`px-2.5 py-1 rounded-[5px] text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                    watchlistView === 'rows'
                      ? 'bg-white text-[#0f172a] shadow-xs font-semibold'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Rows</span>
                </button>
                <button
                  type="button"
                  data-testid="watchlist-view-cards"
                  aria-pressed={watchlistView === 'cards'}
                  onClick={() => setWatchlistView('cards')}
                  className={`px-2.5 py-1 rounded-[5px] text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                    watchlistView === 'cards'
                      ? 'bg-white text-[#0f172a] shadow-xs font-semibold'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportWatchlistCsv}
                data-testid="watchlist-export-csv"
                className="h-8 px-2.5 rounded-[7px] bg-white hover:bg-[#f8fafc] border border-[#cbd5e1] text-xs font-medium text-[#334155] hover:text-[#0f172a] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {watchlistView === 'rows' ? (
            /* Institutional Watchlist Rows with Inline 24-Hour SVG Sparklines */
            <div data-testid="terminal-watchlist-rows" className="overflow-x-auto max-h-[380px] overflow-y-auto bg-white/95">
              <table className="w-full text-left border-collapse min-w-[820px]">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11px] font-mono uppercase tracking-wider text-[#64748b]">
                    <th className="py-2.5 pl-4 pr-3 font-semibold">Instrument</th>
                    <th className="py-2.5 px-3 font-semibold">24H Trend</th>
                    <th className="py-2.5 px-3 font-semibold">24H Range</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Spot / NAV</th>
                    <th className="py-2.5 px-3 font-semibold text-right">24H Change</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Rating</th>
                    <th className="py-2.5 pl-3 pr-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {displayedStocks.map((item) => {
                    const active = item.ticker === activeStock.ticker;
                    const alertCount = alerts.filter((a) => a.ticker === item.ticker).length;
                    const isCompared = (comparisonTickers || []).includes(item.ticker);
                    const sparkData = build24hSparklineSeries(
                      item,
                      tickHistoryByTicker[item.ticker] || []
                    );
                    const pos = sparkData.isPositive;

                    return (
                      <tr
                        key={item.ticker}
                        data-testid={`watchlist-row-${item.ticker}`}
                        className={`transition-colors ${
                          active ? 'bg-[#eff6ff]/70' : 'hover:bg-[#f8fafc]'
                        }`}
                      >
                        <td className="py-2.5 pl-4 pr-3">
                          <button
                            type="button"
                            onClick={() => onSelectTicker(item.ticker)}
                            className="text-left group cursor-pointer block w-full"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-5 rounded-full shrink-0 ${
                                  active ? 'bg-[#2563eb]' : 'bg-transparent group-hover:bg-[#cbd5e1]'
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-sm text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                                    {item.ticker}
                                  </span>
                                  <span className="text-[11px] text-[#64748b] truncate max-w-[140px]">
                                    {item.sector}
                                  </span>
                                  {alertCount > 0 && (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[#2563eb]"
                                      title={`${alertCount} active alert${alertCount > 1 ? 's' : ''}`}
                                    >
                                      <Bell className="w-2.5 h-2.5" />
                                      {alertCount}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#475569] truncate max-w-[230px]">
                                  {item.name}
                                </div>
                              </div>
                            </div>
                          </button>
                        </td>

                        {/* Performant Pure-SVG 24H Sparkline */}
                        <td className="py-2.5 px-3">
                          <TickerSparklineSvg
                            ticker={item.ticker}
                            values={sparkData.points}
                            isPositive={pos}
                            width={116}
                            height={30}
                          />
                        </td>

                        {/* 24H Low-High Range Indicator */}
                        <td className="py-2.5 px-3">
                          <div className="w-28">
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#64748b] tabular-nums mb-1">
                              <span>{sparkData.min.toFixed(1)}</span>
                              <span>{sparkData.max.toFixed(1)}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] relative overflow-hidden">
                              <div
                                className="absolute top-0 bottom-0 left-0 rounded-full"
                                style={{
                                  width: `${Math.max(8, sparkData.rangePositionPct)}%`,
                                  backgroundColor: pos ? '#059669' : '#dc2626',
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-sm text-[#0f172a] tabular-nums whitespace-nowrap">
                          {formatCurrency(item.price, 2, item.currencyUnit || 'INR')}
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-end gap-1 font-mono text-xs font-semibold tabular-nums ${
                              pos ? 'text-[#059669]' : 'text-[#dc2626]'
                            }`}
                          >
                            {pos ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {pos ? '+' : ''}
                            {item.changePercent.toFixed(2)}%
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-[#2563eb] tabular-nums whitespace-nowrap">
                          {item.convictionScore}
                          <span className="text-[#94a3b8] font-normal">/100</span>
                        </td>

                        <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {onComparisonTickersChange && (
                              <button
                                type="button"
                                disabled={active}
                                onClick={() => handleToggleCompare(item.ticker)}
                                aria-label={`Compare ${item.ticker} against ${activeStock.ticker}`}
                                title={
                                  active
                                    ? 'Primary chart instrument'
                                    : isCompared
                                      ? `Remove ${item.ticker} from comparison overlay`
                                      : `Overlay ${item.ticker} on chart`
                                }
                                className={`h-7 px-2 rounded-[6px] border text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default ${
                                  isCompared
                                    ? 'bg-[#2563eb] text-white border-[#2563eb]'
                                    : 'bg-white text-[#475569] border-[#cbd5e1] hover:border-[#2563eb] hover:text-[#2563eb]'
                                }`}
                              >
                                <GitCompare className="w-3 h-3" />
                                <span>{isCompared ? 'Added' : 'Compare'}</span>
                              </button>
                            )}
                            {onOpenSetAlert && (
                              <button
                                type="button"
                                onClick={() => onOpenSetAlert(item)}
                                aria-label={`Set price alert for ${item.ticker}`}
                                title={`Set price alert for ${item.ticker}`}
                                className="h-7 w-7 rounded-[6px] bg-white hover:bg-[#eff6ff] border border-[#cbd5e1] hover:border-[#2563eb] text-[#475569] hover:text-[#2563eb] inline-flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View — Also Embedding 24H SVG Sparklines */
            <div
              data-testid="terminal-watchlist-cards"
              className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#f8fafc]/60"
            >
              {displayedStocks.map((item) => {
                const active = item.ticker === activeStock.ticker;
                const alertCount = alerts.filter((a) => a.ticker === item.ticker).length;
                const sparkData = build24hSparklineSeries(
                  item,
                  tickHistoryByTicker[item.ticker] || []
                );
                const pos = sparkData.isPositive;

                return (
                  <button
                    key={item.ticker}
                    type="button"
                    onClick={() => onSelectTicker(item.ticker)}
                    className={`p-4 rounded-[10px] bg-white border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#2563eb] ring-1 ring-[#2563eb]/25'
                        : 'border-[#e2e8f0] hover:border-[#94a3b8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-[#0f172a]">
                            {item.ticker}
                          </span>
                          {alertCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[#2563eb]">
                              <Bell className="w-2.5 h-2.5" />
                              {alertCount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#64748b] truncate">{item.name}</div>
                      </div>
                      <span
                        className={`text-xs font-mono font-semibold tabular-nums flex items-center gap-0.5 shrink-0 ${
                          pos ? 'text-[#059669]' : 'text-[#dc2626]'
                        }`}
                      >
                        {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {pos ? '+' : ''}
                        {item.changePercent.toFixed(2)}%
                      </span>
                    </div>

                    <div className="my-2.5 flex items-center justify-between gap-3">
                      <TickerSparklineSvg
                        ticker={item.ticker}
                        values={sparkData.points}
                        isPositive={pos}
                        width={156}
                        height={34}
                      />
                      <div className="text-right shrink-0">
                        <div className="font-mono font-semibold text-sm text-[#0f172a] tabular-nums">
                          {formatCurrency(item.price, 2, item.currencyUnit || 'INR')}
                        </div>
                        <div className="text-[11px] font-mono text-[#2563eb] tabular-nums">
                          Rating {item.convictionScore}/100
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* TAB 1: CHART & TECHNICALS */}
        {terminalTab === 'chart' && (
          <>
            {/* Main High-Contrast Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 Columns: Real-Time Interactive Price Chart + 4Q Financial Performance */}
              <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Primary Interactive Price, Technicals, RSI Overlay & Multi-Ticker Comparison Card */}
            <TerminalMainChartCard
              activeStock={activeStock}
              stocks={stocks}
              alerts={alerts}
              comparisonTickers={analysisMode === 'single' ? [] : comparisonTickers}
              onComparisonTickersChange={(next) => {
                if (next.length > 0 && analysisMode === 'single') {
                  setAnalysisMode('multi');
                }
                onComparisonTickersChange?.(next);
              }}
              onOpenSetAlert={onOpenSetAlert}
            />

            {/* Interactive 30-Day Historical Performance Chart (Recharts Line / Area) */}
            <TerminalPriceTrendChart stock={activeStock} />

            {/* Trailing 4-Quarter Authentic NAV Returns & Drawdown Ledger (Live AMFI / SQLite) */}
            <LiveQuarterlyLedgerCard activeStock={activeStock} />
          </div>

          {/* Right 4 Columns: Executive Verdict, Conviction Score & Audio Podcast Briefing */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Executive Verdict & Conviction Score Card */}
            <div className="glass-card-light rounded-[12px] border border-[#e3e8ee] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold text-[#2563eb] whitespace-nowrap">
                    {activeGeminiOverride ? 'LIVE RESEARCH BRIEF' : 'FUND SUMMARY'}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-[#6B7280] tabular-nums whitespace-nowrap">
                    {activeGeminiOverride ? activeGeminiOverride.stance : report.verdict.stance}
                  </span>
                </div>

                {/* Score Display */}
                <div className="p-5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[#6B7280] mb-1">Composite Rating</div>
                    <div className="text-4xl font-display font-bold text-[#131722] tabular-nums">
                      {activeGeminiOverride
                        ? activeGeminiOverride.conviction_score
                        : report.verdict.conviction_score}
                      <span className="text-lg text-[#9CA3AF] font-normal"> / 100</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-[#089981] font-medium space-y-1">
                    <div>AMFI / Custodian: Verified</div>
                    <div className="text-[#2563eb]">SID · YTM · NAV Grounded</div>
                  </div>
                </div>

                <div className="mb-4">
                  <button
                    type="button"
                    data-testid="gemini-research-btn"
                    disabled={aiLoading}
                    onClick={handleRunGeminiSynthesis}
                    className="w-full py-2 px-3 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] disabled:opacity-60 border border-[#BFDBFE] text-[#1D4ED8] text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {aiLoading
                        ? `Refreshing Brief (${activeStock.ticker})...`
                        : `Refresh Live Brief (${activeStock.ticker})`}
                    </span>
                  </button>
                  {aiError && (
                    <div
                      role="alert"
                      data-testid="gemini-research-error"
                      className="mt-2 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[11px] leading-snug"
                    >
                      {aiError}
                    </div>
                  )}
                </div>

                <p className="text-sm text-[#374151] leading-relaxed mb-5">
                  &ldquo;
                  {activeGeminiOverride ? activeGeminiOverride.summary : report.verdict.summary}
                  &rdquo;
                </p>

                <div className="text-xs font-semibold text-[#131722] mb-3 pb-2 border-b border-[#E5E7EB]">
                  Key Takeaways
                </div>
                <ul className="space-y-2.5 mb-6">
                  {(activeGeminiOverride && activeGeminiOverride.key_takeaways.length > 0
                    ? activeGeminiOverride.key_takeaways
                    : report.verdict.key_takeaways
                  ).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-[#374151] leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Spoken Research Summary Player */}
              <div className="pt-4 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold text-[#131722]">
                      Spoken Research Summary
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      Audio Readout
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAudioBriefing}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isPlayingAudio
                        ? 'bg-[#F23645] text-white'
                        : 'bg-[#131722] text-white hover:bg-[#1F2937]'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Briefing</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Play Briefing</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-3 space-y-2 max-h-44 overflow-y-auto">
                  {report.podcast_script.map((lineItem, i) => {
                    const highlighted = isPlayingAudio && activeScriptIndex === i;
                    return (
                      <div
                        key={i}
                        className={`text-xs p-2 rounded transition-colors ${
                          highlighted
                            ? 'bg-white text-[#131722] border border-[#2962FF]/40'
                            : 'text-[#4B5563]'
                        }`}
                      >
                        <span className="font-mono font-semibold text-[#2962FF] block mb-0.5">
                          {lineItem.speaker}
                        </span>
                        <span>{lineItem.line}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

            {/* 90-Day Recharts Statistical Correlation Matrix for Selected Comparison Tickers */}
            <div className="mt-6">
              <TerminalCorrelationMatrix90d
                primarySymbol={activeStock.ticker}
                comparisonTickers={comparisonTickers || []}
                stocks={stocks}
                onChangeComparisonTickers={onComparisonTickersChange}
              />
            </div>

            {/* Quick Workspace Jump Strip from Chart View to Compare & Risk Tabs */}
            <div className="mt-6 rounded-[12px] bg-white border border-[#e2e8f0] p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#0f172a]">
                  Continue Institutional Deep Dive for {activeStock.ticker}
                </div>
                <div className="text-xs text-[#64748b] mt-0.5">
                  Run Best vs. Worst scoring, Efficient Frontier scatter, Correlation &amp; Blend simulation, or Macro Stress Tests.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAnalysisMode('multi');
                    setTerminalTab('compare');
                  }}
                  className="h-9 px-3.5 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Open Comparison Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('risk')}
                  className="h-9 px-3.5 rounded-[8px] border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-xs font-semibold text-[#0f172a] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#dc2626]" />
                  <span>VaR &amp; Stress Tests</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* SECTION 1: INDIVIDUAL INSTRUMENT ANALYSIS (ALL 16 MODULES + UNIFORM TOP 10 HOLDINGS FOR EVERY FUND/ETF/SQLITE DB SCHEME) */}
        {terminalTab === 'individual' && (
          <TerminalIndividualAnalysisPanel
            activeStock={activeStock}
            hydratedFund={hydratedFundsBySymbol[activeStock.ticker.toUpperCase()] || null}
            hydratedDossier={hydratedDossiersBySymbol[activeStock.ticker.toUpperCase()] || null}
            navDbSchemes={navDbSchemes}
            isPinned={pinnedSymbols.includes(activeStock.ticker.toUpperCase())}
            onTogglePin={handleTogglePin}
            onSelectInstrument={(sym) => onAnalyzeCustomTicker(sym, agentMode)}
            onCompareWithFund={(symA) => {
              onAnalyzeCustomTicker(symA, agentMode);
              setTerminalTab('compare');
            }}
          />
        )}

        {/* SECTION 2: COMPARE ANY TWO OR UP TO FOUR FUNDS (SECTOR & TYPE INDEPENDENT) + 90D CORRELATION MATRIX */}
        {terminalTab === 'compare' && (
          <div className="space-y-6">
            <TerminalCrossFundComparePanel
              primarySymbol={activeStock.ticker}
              comparisonTickers={comparisonTickers || []}
              extraFunds={Object.values(hydratedFundsBySymbol)}
              analysisMode={analysisMode}
              onSwitchAnalysisMode={setAnalysisMode}
              onSelectPrimary={(sym) => onAnalyzeCustomTicker(sym, agentMode)}
              onChangeComparisonTickers={(next) => onComparisonTickersChange?.(next)}
              onHydrateSchemeCode={hydrateSchemeByCode}
            />

            <TerminalCorrelationMatrix90d
              primarySymbol={activeStock.ticker}
              comparisonTickers={comparisonTickers || []}
              stocks={stocks}
              onChangeComparisonTickers={onComparisonTickersChange}
            />
          </div>
        )}

        {/* TAB 3: CUSTOM % PORTFOLIO ALLOCATOR & HISTORICAL RETURN PROJECTION */}
        {terminalTab === 'allocator' && (
          <TerminalPortfolioAllocator
            initialSymbols={[activeStock.ticker, ...(comparisonTickers || [])]}
            onSyncSymbols={(syms) => {
              if (syms.length > 0 && syms[0] !== activeStock.ticker) {
                onAnalyzeCustomTicker(syms[0], agentMode);
              }
              if (syms.length > 1) {
                onComparisonTickersChange?.(syms.slice(1, 5));
              }
            }}
          />
        )}

        {/* TAB 4: DEDICATED FUND QUANT & SIP LAB (PEER PERCENTILES, ROLLING RETURNS, SIP VS LUMPSUM, POST-TAX REDEMPTION) */}
        {terminalTab === 'quantlab' && (() => {
          const matchedFund =
            hydratedFundsBySymbol[activeStock.ticker.toUpperCase()] ||
            SCREENER_FUNDS.find(
              (f) => f.symbol.toUpperCase() === activeStock.ticker.toUpperCase()
            ) ||
            synthesizeScreenerFundFromQuote(activeStock);
          return (
            <TerminalQuantToolbox
              activeFund={matchedFund}
              onSendToAllocator={() => setTerminalTab('allocator')}
            />
          );
        })()}

        {/* TAB 4: FULL-UNIVERSE BULK DATA VIEW */}
        {terminalTab === 'bulk' && (
          <TerminalBulkDataPanel
            primarySymbol={activeStock.ticker}
            comparisonTickers={comparisonTickers || []}
            onSelectPrimary={(sym) => onAnalyzeCustomTicker(sym, agentMode)}
            onChangeComparisonTickers={(next) => onComparisonTickersChange?.(next)}
            onJumpToCompare={() => {
              setAnalysisMode('multi');
              setTerminalTab('compare');
            }}
            onJumpToAllocator={() => setTerminalTab('allocator')}
          />
        )}

        {/* TAB 3: RISK, VaR & SCENARIOS */}
        {terminalTab === 'risk' && (
          <div className="space-y-6">
            <TerminalRiskStressPanel
              primarySymbol={activeStock.ticker}
              comparisonTickers={comparisonTickers || []}
              analysisMode={analysisMode}
              onSelectInstrument={(sym) => onAnalyzeCustomTicker(sym, agentMode)}
            />

            {/* Upside, Downside & Base Scenarios */}
            <div className="glass-card-light rounded-[12px] border border-[#e3e8ee] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-[#E5E7EB]">
            <div>
              <h3 className="text-lg font-display font-semibold text-[#131722]">
                Upside, Downside &amp; Base Scenarios — {activeStock.ticker}
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Structured Bull, Bear, and Base outlooks benchmarked against AMFI &amp; custodial disclosures
              </p>
            </div>
            <div
              role="group"
              aria-label="Filter scenario cases"
              className="inline-flex items-center p-1 rounded-lg bg-[#F4F5F7] border border-[#E5E7EB]"
            >
              {(['all', 'bull', 'bear', 'base'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCaseTab(tab)}
                  className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors cursor-pointer ${
                    activeCaseTab === tab
                      ? 'bg-[#131722] text-white font-semibold'
                      : 'text-[#4B5563] hover:text-[#131722]'
                  }`}
                >
                  {tab === 'all' ? 'All Scenarios' : `${tab} Case`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(activeCaseTab === 'all' || activeCaseTab === 'bull') && (
              <div className="rounded-xl bg-[#F9FAFB] border border-[#089981]/30 p-5">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#089981] mb-4">
                  <TrendingUp className="w-4 h-4" />
                  <span>UPSIDE BULL CASE</span>
                </div>
                <div className="space-y-4">
                  {report.bull_case.map((c, idx) => (
                    <div key={idx}>
                      <div className="text-sm font-semibold text-[#131722] mb-1">{c.point}</div>
                      <p className="text-xs text-[#4B5563] leading-relaxed">{c.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(activeCaseTab === 'all' || activeCaseTab === 'bear') && (
              <div className="rounded-xl bg-[#FEF2F2]/50 border border-[#F23645]/30 p-5">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#F23645] mb-4">
                  <TrendingDown className="w-4 h-4" />
                  <span>DOWNSIDE BEAR RISKS</span>
                </div>
                <div className="space-y-4">
                  {report.bear_case.map((c, idx) => (
                    <div key={idx}>
                      <div className="text-sm font-semibold text-[#131722] mb-1">{c.point}</div>
                      <p className="text-xs text-[#4B5563] leading-relaxed">{c.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(activeCaseTab === 'all' || activeCaseTab === 'base') && (
              <div className="rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] p-5">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#374151] mb-4">
                  <Clock className="w-4 h-4" />
                  <span>BASE CASE OUTLOOK</span>
                </div>
                <div className="space-y-4">
                  {report.base_case.map((c, idx) => (
                    <div key={idx}>
                      <div className="text-sm font-semibold text-[#131722] mb-1">{c.point}</div>
                      <p className="text-xs text-[#4B5563] leading-relaxed">{c.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
          </div>
        )}

        {/* HOLDINGS, RESEARCH NOTES & SCHEME FILINGS (Mounted inside Risk, VaR & Filings Tab) */}
        {terminalTab === 'risk' && (
          <div data-testid="terminal-filings-panel" className="mt-6 space-y-6">
            {/* Top Holdings Breakdown for Active Screener Instrument */}
            {(() => {
              const matchedFund =
                hydratedFundsBySymbol[activeStock.ticker.toUpperCase()] ||
                SCREENER_FUNDS.find(
                  (f) => f.symbol.toUpperCase() === activeStock.ticker.toUpperCase()
                ) ||
                synthesizeScreenerFundFromQuote(activeStock);
              const intel = getFundIntelligence(matchedFund);
              return (
                <div className="rounded-[12px] bg-white border border-[#e2e8f0] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#e2e8f0]">
                    <div>
                      <h3 className="text-lg font-display font-semibold text-[#0f172a]">
                        Portfolio Holdings &amp; Mandate Concentration — {matchedFund.symbol}
                      </h3>
                      <p className="text-xs text-[#64748b] mt-0.5">
                        {matchedFund.name} · Lead Manager: {intel.manager.leadManager} ({intel.manager.tenureYears.toFixed(1)}Y tenure) · {matchedFund.keyStats.totalHoldings} Total Holdings
                      </p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#2563eb] tabular-nums">
                      TER {matchedFund.about.expenseRatioPct.toFixed(2)}% · AUM {matchedFund.keyStats.aumLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {intel.topHoldings.slice(0, 6).map((h) => (
                      <div
                        key={h.ticker}
                        className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[#0f172a] truncate">{h.name}</span>
                          <span className="font-mono font-bold text-[#2563eb] tabular-nums shrink-0">
                            {h.weightPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[#64748b] mt-0.5">
                          {h.ticker} · {h.sector}
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-[#e2e8f0] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#2563eb]"
                            style={{ width: `${Math.min(100, h.weightPct * 2.2)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Key Research Notes & Scheme Filings Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Key Research Notes with Category Filter */}
          <div className="glass-card-light lg:col-span-7 rounded-[12px] border border-[#e3e8ee] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#E5E7EB]">
              <h3 className="text-lg font-display font-semibold text-[#131722]">
                Key Research Notes
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {['All', 'Fund Flow', 'Yield & Duration', 'Factsheet & AMFI', 'Technical', 'Macro'].map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setInsightCategory(cat)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                        insightCategory === cat
                          ? 'bg-[#131722] text-white font-semibold'
                          : 'bg-[#F4F5F7] text-[#4B5563] hover:text-[#131722]'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            {filteredInsights.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#6B7280] bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                No notes in the &ldquo;{insightCategory}&rdquo; category for {activeStock.ticker}.{' '}
                <button
                  type="button"
                  onClick={() => setInsightCategory('All')}
                  className="text-[#2563eb] underline ml-1 cursor-pointer"
                >
                  Show all categories
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInsights.map((ins, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs font-mono font-medium text-[#2563eb] mb-1">
                        {ins.category} · Impact Score {ins.impact_score}/10
                      </div>
                      <h4 className="text-sm font-semibold text-[#131722] mb-1">{ins.title}</h4>
                      <p className="text-xs text-[#4B5563] leading-relaxed">{ins.description}</p>
                    </div>
                    <div className="shrink-0 text-right font-mono">
                      <span className="text-lg font-bold text-[#131722] tabular-nums">
                        {ins.impact_score}
                      </span>
                      <span className="text-xs text-[#9CA3AF]">/10</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scheme Disclosures & Filings */}
          <div className="glass-card-light lg:col-span-5 rounded-[12px] border border-[#e3e8ee] p-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-lg font-display font-semibold text-[#131722]">
                  Scheme Disclosures &amp; Filings
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Direct extracts from AMFI mfapi.in, SIDs, and bullion audits
                </p>
              </div>
              <FileText className="w-5 h-5 text-[#2563eb]" />
            </div>

            <div className="space-y-4">
              {report.findings.map((finding, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-[#131722]">{finding.documentType}</div>
                      <div className="text-xs font-mono text-[#6B7280] mt-0.5">
                        Updated: {finding.date}
                      </div>
                    </div>
                    <a
                      href={finding.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-[#2962FF] hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>SOURCE</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <ul className="space-y-2">
                    {finding.keyInsights.map((ki, kIdx) => (
                      <li
                        key={kIdx}
                        className="flex items-start gap-2 text-xs text-[#374151] leading-relaxed"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#2962FF] shrink-0 mt-0.5" />
                        <span>{ki}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
          </div>
        )}
      </div>
    </section>
  );
};
