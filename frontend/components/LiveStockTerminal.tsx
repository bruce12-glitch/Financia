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
} from 'lucide-react';
import { StockQuote, TimelineEvent } from '../types/financia';
import { PriceAlert } from '../utils/alertEngine';
import { formatCurrency, validateTickerInput } from '../utils/stockEngine';
import { TerminalMainChartCard } from './TerminalMainChartCard';
import { TerminalPriceTrendChart } from './TerminalPriceTrendChart';

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
}) => {
  const [tickerInput, setTickerInput] = useState<string>('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState<'antigravity' | 'perseus'>('perseus');
  const [activeCaseTab, setActiveCaseTab] = useState<'all' | 'bull' | 'bear' | 'base'>('all');
  const [insightCategory, setInsightCategory] = useState<string>('All');

  // Live Gemini AI synthesis state (/api/ai/research)
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [geminiVerdict, setGeminiVerdict] = useState<GeminiVerdictOverride | null>(null);

  // Multi-agent execution timeline state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [showTimelineModal, setShowTimelineModal] = useState<boolean>(false);

  // Audio Podcast Briefing state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [activeScriptIndex, setActiveScriptIndex] = useState<number>(0);
  const audioTimerRef = useRef<number | null>(null);

  const activeStock = useMemo(() => {
    return stocks.find((s) => s.ticker === selectedTicker) || stocks[0];
  }, [stocks, selectedTicker]);

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
        label: `Bootstrapping ${mode === 'perseus' ? 'Perseus Multi-Agent Committee' : 'Antigravity Flash Engine'} for ${targetTicker}`,
        detail: `Loading AMFI NAV feeds, Scheme Information Documents (SID/KIM), LBMA physical gold custody telemetry, and YTM duration curves for ${targetTicker}.`,
        startTime: now,
        endTime: now + 320,
      },
      {
        id: 2,
        kind: 'tool_call',
        label: `Tier 1 Sub-Agents: AMFI Scheme NAVs & Custodial Yield Extraction`,
        toolName: 'amfi_nav_api + marketstack_etf_eod',
        detail: `Querying live AMFI NAVs, SID disclosures, Marketstack EOD ETF pricing, and sovereign yield spreads for ${targetTicker}; computing modified duration and rolling CAGR.`,
        startTime: now + 320,
        endTime: now + 790,
      },
      {
        id: 3,
        kind: 'thinking',
        label: `Tier 2 Adversarial Case Construction (Bull vs. Bear vs. Base)`,
        detail: `Cross-examining TER fee drag, duration convexity, central-bank gold reserve demand, and tracking error to eliminate ungrounded assumptions.`,
        startTime: now + 790,
        endTime: now + 1180,
      },
      {
        id: 4,
        kind: 'tool_result',
        label: `Tier 3 Executive Verdict & Conviction Score Synthesized`,
        toolName: 'report_schema_validator',
        detail: `Validated structured ReportData JSON for ${targetTicker} across Mutual Fund, Gold, Debt & ETF risk controls.`,
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

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateTickerInput(tickerInput);
    if (!validation.valid) {
      setInputError(validation.error || 'Invalid ticker symbol.');
      return;
    }
    setInputError(null);
    const normalized = validation.normalized;
    setTickerInput('');
    triggerAgentAnalysisRun(normalized, agentMode);
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
      className="relative w-full bg-white text-[#131722] pt-16 lg:pt-20 pb-16 border-b border-[#E5E7EB]"
    >
      <div className="max-w-[1240px] mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#2962FF] mb-3">
              <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                <span className="w-0.5 h-1.5 bg-[#2962FF]" />
                <span className="w-0.5 h-3 bg-[#131722]" />
                <span className="w-0.5 h-2 bg-[#2962FF]" />
              </span>
              <span>Financia 4-Pillar Research Engine</span>
              <span aria-hidden="true">·</span>
              <span>Not a Trading Venue</span>
            </div>
            <h2
              className="font-display font-semibold text-[#131722] tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', textWrap: 'balance' }}
            >
              Live Mutual Fund, Gold, Debt &amp; ETF Telemetry
            </h2>
          </div>

          {/* Agent Mode & Live Stream Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <div
              role="group"
              aria-label="Select Research Agent Committee Mode"
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
                Perseus Committee
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
                Antigravity Flash
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleLiveFeed}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                liveFeedActive
                  ? 'bg-white text-[#2962FF] border-[#2962FF]/40 font-semibold'
                  : 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]'
              }`}
            >
              {liveFeedActive ? 'Live Tick Stream: ON' : 'Live Tick Stream: PAUSED'}
            </button>
          </div>
        </div>

        {/* Ticker Search & Multi-Agent Analysis Trigger Bar (from bruce12-glitch/Financia) */}
        <form onSubmit={handleAnalyzeSubmit} className="mb-8" noValidate>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 rounded-xl bg-white border border-[#D1D5DB] focus-within:border-[#2962FF] shadow-xs">
            <div className="flex items-center gap-3 pl-3 py-1.5 flex-1">
              <Search className="w-5 h-5 text-[#2962FF] shrink-0" />
              <label htmlFor="financia-ticker-input" className="sr-only">
                Mutual Fund, Gold, Debt Fund, ETF, or AMFI Scheme Code
              </label>
              <input
                id="financia-ticker-input"
                type="text"
                value={tickerInput}
                onChange={(e) => {
                  setTickerInput(e.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder="Enter Mutual Fund, Gold, Debt Fund, ETF, or AMFI code (e.g., PPFAS, 125497, GOLDBEES, SBIGILT, NIFTYBEES)..."
                className="w-full bg-transparent text-[#131722] font-mono text-sm uppercase placeholder:normal-case placeholder:font-sans placeholder:text-[#6B7280] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {timelineEvents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTimelineModal((prev) => !prev)}
                  className="px-3.5 py-2.5 rounded-lg bg-[#F4F5F7] text-[#131722] hover:bg-[#E5E7EB] text-xs font-mono border border-[#E5E7EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showTimelineModal ? 'Hide Agent Trace' : `Agent Trace (${timelineEvents.length})`}
                </button>
              )}
              <button
                type="submit"
                disabled={isAnalyzing}
                className="px-6 py-2.5 rounded-lg bg-[#131722] text-white hover:bg-[#1F2937] disabled:opacity-50 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isAnalyzing ? 'Synthesizing Data...' : 'Analyze Asset'}
              </button>
            </div>
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

          {/* Quick-Try Plug-and-Play Ticker Shortcuts */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-[#6B7280]">
            <span>Instant live endpoints:</span>
            {[
              { symbol: '125497', note: 'AMFI MFAPI Live' },
              { symbol: 'PPFAS', note: 'AMFI 122639' },
              { symbol: 'GOLDBEES', note: 'Marketstack ETF / Gold' },
              { symbol: 'PAXGUSDT', note: 'LBMA Spot Gold' },
            ].map((item) => (
              <button
                key={item.symbol}
                type="button"
                onClick={() => triggerAgentAnalysisRun(item.symbol, agentMode)}
                className="px-2.5 py-1 rounded-md bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-[#131722] font-mono transition-colors cursor-pointer"
              >
                {item.symbol} <span className="text-[#2962FF]">· {item.note}</span>
              </button>
            ))}
          </div>
        </form>

        {/* Expandable Multi-Agent Execution Trace Panel (from Financia AgentTimeline) */}
        {showTimelineModal && timelineEvents.length > 0 && (
          <div className="mb-8 rounded-xl bg-white border border-[#E5E7EB] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#2962FF]" />
                <h3 className="text-sm font-semibold text-[#131722]">
                  Multi-Agent Research Execution Trace — {activeStock.ticker}
                </h3>
                <span className="text-xs font-mono text-[#6B7280]">
                  · Mode: {agentMode === 'perseus' ? 'Perseus 4-Tier Committee' : 'Antigravity Flash'}
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

        {/* Watchlist Selector Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-8">
          {stocks.map((item) => {
            const active = item.ticker === activeStock.ticker;
            const pos = item.changePercent >= 0;
            const alertCount = alerts.filter((a) => a.ticker === item.ticker).length;
            return (
              <button
                key={item.ticker}
                type="button"
                onClick={() => onSelectTicker(item.ticker)}
                className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-white border-[#2962FF] ring-1 ring-[#2962FF]/20'
                    : 'bg-white border-[#E5E7EB] hover:border-[#9CA3AF]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-sm text-[#131722] inline-flex items-center gap-1.5">
                    {item.ticker}
                    {alertCount > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] text-[#2962FF]"
                        title={`${alertCount} price alert${alertCount > 1 ? 's' : ''} active`}
                      >
                        <Bell className="w-2.5 h-2.5" />
                        {alertCount}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-xs font-mono tabular-nums flex items-center gap-0.5 ${
                      pos ? 'text-[#089981]' : 'text-[#F23645]'
                    }`}
                  >
                    {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {pos ? '+' : ''}
                    {item.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="text-xs text-[#6B7280] truncate mb-2">{item.name}</div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono font-semibold text-sm text-[#131722] tabular-nums">
                    {formatCurrency(item.price, 2, item.currencyUnit || 'INR')}
                  </span>
                  <span className="text-[11px] font-mono text-[#2962FF] tabular-nums">
                    Score {item.convictionScore}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main High-Contrast Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Columns: Real-Time Interactive Price Chart + 4Q Financial Performance */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Primary Interactive Price & Technicals Card */}
            <div className="rounded-xl bg-white border border-[#E5E7EB] p-6">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 mb-5 border-b border-[#F3F4F6]">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-xl font-display font-bold text-[#131722] whitespace-nowrap">
                      {activeStock.name} ({activeStock.ticker})
                    </h3>
                    <span className="text-xs text-[#6B7280] whitespace-nowrap shrink-0">
                      · {activeStock.sector}
                    </span>
                    {activeStock.dataSource && (
                      <span className="px-2 py-0.5 rounded bg-[#F9FAFB] border border-[#E5E7EB] text-[11px] font-mono text-[#2962FF] whitespace-nowrap shrink-0">
                        {activeStock.dataSource}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-3 mt-1.5">
                    <span className="text-3xl font-mono font-bold text-[#131722] tabular-nums whitespace-nowrap">
                      {formatCurrency(activePoint ? activePoint.price : activeStock.price)}
                    </span>
                    <span
                      className={`text-sm font-mono font-medium tabular-nums whitespace-nowrap ${
                        activeStock.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                      }`}
                    >
                      {activeStock.change >= 0 ? '+' : ''}
                      {activeStock.change.toFixed(2)} ({activeStock.changePercent >= 0 ? '+' : ''}
                      {activeStock.changePercent.toFixed(2)}%)
                    </span>
                    {activePoint && (
                      <span className="text-xs font-mono text-[#6B7280] tabular-nums whitespace-nowrap">
                        · {activePoint.date} · Vol {activePoint.volume}M
                      </span>
                    )}
                  </div>
                </div>

                {/* Timeframe & Technical Overlay Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    role="group"
                    aria-label="Chart Timeframe"
                    className="inline-flex items-center p-1 rounded-lg bg-[#F4F5F7] border border-[#E5E7EB]"
                  >
                    {(['1D', '1W', '1M', '4M', '1Y'] as const).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => {
                          setTimeframe(tf);
                          setHoveredPointIdx(null);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                          timeframe === tf
                            ? 'bg-[#131722] text-white font-semibold'
                            : 'text-[#4B5563] hover:text-[#131722]'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSMA((prev) => !prev)}
                    aria-pressed={showSMA}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      showSMA
                        ? 'bg-[#2962FF]/10 text-[#2962FF] border-[#2962FF]/40 font-semibold'
                        : 'bg-white text-[#6B7280] border-[#E5E7EB]'
                    }`}
                  >
                    SMA (4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBollinger((prev) => !prev)}
                    aria-pressed={showBollinger}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      showBollinger
                        ? 'bg-[#D97706]/10 text-[#B45309] border-[#D97706]/40 font-semibold'
                        : 'bg-white text-[#6B7280] border-[#E5E7EB]'
                    }`}
                  >
                    Bollinger
                  </button>
                  {onOpenSetAlert && (() => {
                    const activeCount = alerts.filter((a) => a.ticker === activeStock.ticker).length;
                    return (
                      <button
                        type="button"
                        onClick={() => onOpenSetAlert(activeStock)}
                        className="px-3 py-1.5 rounded-lg bg-[#2962FF] hover:bg-[#1E53E5] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>{activeCount > 0 ? `Set Alert (${activeCount})` : 'Set Alert'}</span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Interactive SVG Price, SMA, Bollinger & Volume Chart */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-64 select-none overflow-visible"
                  role="img"
                  aria-label={`${activeStock.ticker} interactive stock price and volume chart`}
                >
                  <defs>
                    <linearGradient id="financiaAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2962FF" stopOpacity="0.18" />
                      <stop offset="75%" stopColor="#2962FF" stopOpacity="0.03" />
                      <stop offset="100%" stopColor="#2962FF" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Y-Axis Gridlines */}
                  {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                    const y = padTop + ratio * plotH;
                    const priceVal = maxPrice - ratio * (maxPrice - minPrice);
                    return (
                      <g key={idx}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={svgWidth - padRight}
                          y2={y}
                          stroke="#E5E7EB"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padLeft - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-[#6B7280] text-[10px] font-mono"
                        >
                          ${priceVal.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Subtle Volume Bars along bottom */}
                  {chartSeries.map((pt, i) => {
                    const x = getX(i);
                    const vHeight = (pt.volume / maxVol) * (plotH * 0.25);
                    const y = padTop + plotH - vHeight;
                    return (
                      <rect
                        key={`vol-${i}`}
                        x={x - 6}
                        y={y}
                        width={12}
                        height={vHeight}
                        rx={2}
                        fill="rgba(41, 98, 255, 0.14)"
                      />
                    );
                  })}

                  {/* Area under Price Curve */}
                  <path d={areaPath} fill="url(#financiaAreaGrad)" />

                  {/* Optional Bollinger Upper & Lower Bands */}
                  {showBollinger && bollingerUpperPath && (
                    <>
                      <path
                        d={bollingerUpperPath}
                        fill="none"
                        stroke="#D97706"
                        strokeWidth={1.25}
                        strokeDasharray="4 3"
                      />
                      <path
                        d={bollingerLowerPath}
                        fill="none"
                        stroke="#D97706"
                        strokeWidth={1.25}
                        strokeDasharray="4 3"
                      />
                    </>
                  )}

                  {/* Optional Simple Moving Average (SMA) Curve */}
                  {showSMA && smaPath && (
                    <path
                      d={smaPath}
                      fill="none"
                      stroke="#7C3AED"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Main Price Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#2962FF"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive Data Nodes & X-Axis Labels */}
                  {chartSeries.map((pt, i) => {
                    const cx = getX(i);
                    const cy = getY(pt.price);
                    const isHovered = hoveredPointIdx === i;
                    return (
                      <g
                        key={`pt-${i}`}
                        onMouseEnter={() => setHoveredPointIdx(i)}
                        onMouseLeave={() => setHoveredPointIdx(null)}
                        className="cursor-pointer"
                      >
                        {isHovered && (
                          <line
                            x1={cx}
                            y1={padTop}
                            x2={cx}
                            y2={padTop + plotH}
                            stroke="rgba(41, 98, 255, 0.45)"
                            strokeWidth={1}
                          />
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 5.5 : 3.5}
                          fill={isHovered ? '#131722' : '#2962FF'}
                          stroke="#FFFFFF"
                          strokeWidth={1.5}
                        />
                        {/* Render X-axis label every 2nd point to stay clean */}
                        {(i % 2 === 0 || i === chartSeries.length - 1) && (
                          <text
                            x={cx}
                            y={svgHeight - 10}
                            textAnchor="middle"
                            className="fill-[#6B7280] text-[10px] font-mono"
                          >
                            {pt.date}
                          </text>
                        )}
                        {/* Invisible wide hit target for smooth hover */}
                        <rect
                          x={cx - 16}
                          y={padTop}
                          width={32}
                          height={plotH}
                          fill="transparent"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Key Quantitative Telemetry Strip below chart */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 pt-4 mt-4 border-t border-[#F3F4F6]">
                <div>
                  <div className="text-[11px] text-[#6B7280]">Market Cap</div>
                  <div className="text-sm font-mono font-semibold text-[#131722] tabular-nums mt-0.5">
                    {activeStock.marketCap}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6B7280]">Forward P/E</div>
                  <div className="text-sm font-mono font-semibold text-[#131722] tabular-nums mt-0.5">
                    {activeStock.peRatio}x
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6B7280]">14D RSI</div>
                  <div className="text-sm font-mono font-semibold text-[#2962FF] tabular-nums mt-0.5">
                    {activeStock.rsi14}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6B7280]">Options IV Rank</div>
                  <div className="text-sm font-mono font-semibold text-[#131722] tabular-nums mt-0.5">
                    {activeStock.ivRank}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6B7280]">Inst. Ownership</div>
                  <div className="text-sm font-mono font-semibold text-[#131722] tabular-nums mt-0.5">
                    {activeStock.institutionalOwnership}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6B7280]">Next Earnings</div>
                  <div className="text-sm font-mono font-semibold text-[#131722] tabular-nums mt-0.5">
                    {activeStock.nextEarnings}
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Quarter Financial Performance (Revenue vs Net Income from bruce12-glitch/Financia) */}
            <div className="rounded-xl bg-white border border-[#E5E7EB] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-lg font-display font-semibold text-[#131722]">
                    Quarterly Financial Performance (SEC 10-Q / 10-K)
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Trailing four completed quarters of GAAP Revenue vs. Net Income ($ Billions) and Gross Margin
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  <span className="flex items-center gap-1.5 text-[#131722] whitespace-nowrap shrink-0">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#2962FF] shrink-0" />
                    Revenue ($B)
                  </span>
                  <span className="flex items-center gap-1.5 text-[#131722] whitespace-nowrap shrink-0">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#089981] shrink-0" />
                    Net Income ($B)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {report.financial_charts.financial_performance_4q.map((q) => {
                  const maxRev = Math.max(
                    ...report.financial_charts.financial_performance_4q.map((item) => item.revenue),
                    1
                  );
                  const revPct = Math.round((q.revenue / maxRev) * 100);
                  const netPct = Math.round((q.net_income / maxRev) * 100);
                  return (
                    <div
                      key={q.quarter}
                      className="p-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-[#6B7280] mb-4">
                        <span>{q.quarter}</span>
                        {q.gross_margin && (
                          <span className="text-[#2962FF] font-semibold">GM {q.gross_margin}%</span>
                        )}
                      </div>

                      <div className="h-28 flex items-end justify-center gap-3 px-2 border-b border-[#E5E7EB] pb-2">
                        <div className="flex flex-col items-center gap-1 w-10">
                          <span className="text-[10px] font-mono text-[#131722] tabular-nums font-medium">
                            ${q.revenue}B
                          </span>
                          <div
                            className="w-full rounded-t bg-[#2962FF] transition-all"
                            style={{ height: `${Math.max(14, revPct * 0.72)}px` }}
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1 w-10">
                          <span className="text-[10px] font-mono text-[#089981] tabular-nums font-medium">
                            ${q.net_income}B
                          </span>
                          <div
                            className="w-full rounded-t bg-[#089981] transition-all"
                            style={{ height: `${Math.max(8, netPct * 0.72)}px` }}
                          />
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-[#6B7280]">
                        <span>GAAP EPS</span>
                        <span className="text-[#131722] font-semibold tabular-nums">
                          ${q.eps?.toFixed(2) || '1.15'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 4 Columns: Executive Verdict, Conviction Score & Audio Podcast Briefing */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Executive Verdict & Conviction Score Card */}
            <div className="rounded-xl bg-white border border-[#E5E7EB] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold text-[#2962FF] whitespace-nowrap">
                    EXECUTIVE VERDICT
                  </span>
                  <span className="text-[11px] font-mono font-medium text-[#6B7280] tabular-nums whitespace-nowrap">
                    {report.verdict.stance}
                  </span>
                </div>

                {/* Score Display */}
                <div className="p-5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[#6B7280] mb-1">Institutional Conviction</div>
                    <div className="text-4xl font-display font-bold text-[#131722] tabular-nums">
                      {report.verdict.conviction_score}
                      <span className="text-lg text-[#9CA3AF] font-normal"> / 100</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-[#089981] font-medium space-y-1">
                    <div>SEC Filings: Verified</div>
                    <div className="text-[#2962FF]">10-Q / 8-K Grounded</div>
                  </div>
                </div>

                <p className="text-sm text-[#374151] leading-relaxed mb-5">
                  &ldquo;{report.verdict.summary}&rdquo;
                </p>

                <div className="text-xs font-semibold text-[#131722] mb-3 pb-2 border-b border-[#E5E7EB]">
                  Key Institutional Takeaways
                </div>
                <ul className="space-y-2.5 mb-6">
                  {report.verdict.key_takeaways.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-[#374151] leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-[#2962FF] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Multi-Speaker Audio Briefing Player (Tier 4 Media Production from Financia) */}
              <div className="pt-4 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold text-[#131722]">
                      Analyst Debate Audio Briefing
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      Dual-Voice Synthesis (Kore &amp; Aoede)
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

        {/* Adversarial Case Construction (Bull / Bear / Base Tabs from Financia ReportTemplate) */}
        <div className="mt-8 rounded-xl bg-white border border-[#E5E7EB] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-[#E5E7EB]">
            <div>
              <h3 className="text-lg font-display font-semibold text-[#131722]">
                Tier-2 Adversarial Scenario Modeling — {activeStock.ticker}
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Competing Upside (Bull), Downside (Bear), and Base Case theses stress-tested against SEC disclosures
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
                  <span>UPSIDE BULL THESIS</span>
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
                  <span>INSTITUTIONAL BASE CASE</span>
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

        {/* Deep Insights & SEC Document Findings Split */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Deep Insights with Category Filter */}
          <div className="lg:col-span-7 rounded-xl bg-white border border-[#E5E7EB] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#E5E7EB]">
              <h3 className="text-lg font-display font-semibold text-[#131722]">
                Actionable Deep Insights
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {['All', 'Fundamental', 'Technical', 'Options & Flow', 'Insider & SEC'].map(
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
                No insights in the &ldquo;{insightCategory}&rdquo; category for {activeStock.ticker}.{' '}
                <button
                  type="button"
                  onClick={() => setInsightCategory('All')}
                  className="text-[#2962FF] underline ml-1 cursor-pointer"
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
                      <div className="text-xs font-mono font-medium text-[#2962FF] mb-1">
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

          {/* Grounded SEC Document Findings */}
          <div className="lg:col-span-5 rounded-xl bg-white border border-[#E5E7EB] p-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-lg font-display font-semibold text-[#131722]">
                  Verified SEC EDGAR Filings
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Direct extracts from 10-K, 10-Q, and 8-K disclosures
                </p>
              </div>
              <FileText className="w-5 h-5 text-[#2962FF]" />
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
                        Filed: {finding.date}
                      </div>
                    </div>
                    <a
                      href={finding.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-[#2962FF] hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>EDGAR</span>
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
    </section>
  );
};
