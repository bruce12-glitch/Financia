import React, { useState } from 'react';
import { ChevronRight, Globe, LineChart, Lock, MessageSquare, Rocket, Search, Zap } from 'lucide-react';
import {
  DEBT_FUND_LEADERS,
  ECONOMIC_CALENDAR,
  FOREX_NEWS,
  FOREX_PERFORMANCE_PAIRS,
  FOREX_TRADE_IDEAS,
  GLOBAL_ETFS_LIST,
  GOLD_BULLION_ASSETS,
  GOLD_DEBT_NEWS,
  GOLD_TRADE_IDEAS,
  MUTUAL_FUND_AND_ETF_IDEAS,
  MUTUAL_FUND_LEADERS,
  MUTUAL_FUND_NEWS,
  NFO_AND_SGB_TRANCHES,
  POLICY_AND_AUCTION_CALENDAR,
} from '../data/tradingViewData';
import {
  computeDivergingBarMetrics,
  formatSignedPercent,
} from '../utils/marketCalculations';
import {
  CommunityIdeaItem,
  ForexTimeframe,
  MarketSymbolRow,
  WireNewsItem,
} from '../types/markets';
import { GlobalInflationMap } from './GlobalInflationMap';
import { EarningsCalendarTab } from './EarningsCalendarTab';

interface MarketsSectionsProps {
  onSelectSymbol: (row: MarketSymbolRow) => void;
  onSelectNews: (item: WireNewsItem) => void;
  onSelectIdea: (idea: CommunityIdeaItem) => void;
  onOpenFxRatesModal: () => void;
  onJumpToAnalysis?: (ticker: string) => void;
}

const FOREX_TIMEFRAMES: ForexTimeframe[] = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All'];

function SymbolBadgeRow({
  item,
  onClick,
  pillStyle = false,
}: {
  item: MarketSymbolRow;
  onClick: () => void;
  pillStyle?: boolean;
}) {
  const isUp = item.changePercent >= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-[#F8F9FD] transition-colors text-left cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-9 h-9 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
          style={{ backgroundColor: item.badgeColor }}
        >
          {item.badgeText}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#131722] truncate">
            {item.name}
            {item.delayed && <sup className="text-[10px] text-[#F59E0B] ml-0.5">D</sup>}
          </div>
          <span className="inline-block text-[11px] font-mono text-[#787B86] bg-[#F0F3FA] px-1.5 py-0.5 rounded">
            {item.symbol}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 tabular-nums">
        <div className="text-right">
          {item.locked ? (
            <div className="text-xs text-[#787B86] leading-tight">
              Can&apos;t show
              <br />
              you this
            </div>
          ) : (
            <div className="text-sm font-semibold text-[#131722]">
              {item.price}{' '}
              <span className="text-[10px] font-normal text-[#787B86]">{item.unit}</span>
            </div>
          )}
          {!pillStyle && !item.locked && (
            <div className={`text-xs font-medium ${isUp ? 'text-[#089981]' : 'text-[#F23645]'}`}>
              {formatSignedPercent(item.changePercent)}
            </div>
          )}
        </div>

        {pillStyle && !item.locked && (
          <span
            className={`min-w-[74px] text-center px-2.5 py-1 rounded text-xs font-semibold text-white ${
              isUp ? 'bg-[#089981]' : 'bg-[#F23645]'
            }`}
          >
            {formatSignedPercent(item.changePercent)}
          </span>
        )}
      </div>
    </button>
  );
}

function TradeIdeasPair({
  ideas,
  onSelectIdea,
}: {
  ideas: CommunityIdeaItem[];
  onSelectIdea: (idea: CommunityIdeaItem) => void;
}) {
  return (
    <div>
      <h3 className="text-xl font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
        <span>Trade ideas</span>
        <ChevronRight className="w-5 h-5" />
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ideas.map((idea) => (
          <article
            key={idea.id}
            onClick={() => onSelectIdea(idea)}
            className="group cursor-pointer rounded-2xl border border-[#E0E3EB] bg-white overflow-hidden hover:border-[#2962FF]/45 transition-colors flex flex-col"
          >
            <div className="bg-[#0F172A] border-b border-[#E0E3EB] p-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] mb-1">
                <span className="bg-[#2962FF] text-white px-1.5 py-0.5 rounded font-bold">
                  {idea.symbol}
                </span>
                <span>{idea.priceAxisLabels[0]}</span>
              </div>
              <svg viewBox="0 0 420 120" className="w-full h-28">
                <line x1="0" y1="36" x2="375" y2="36" stroke="#1E293B" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="375" y2="80" stroke="#1E293B" strokeDasharray="3 3" />
                {idea.chartType === 'bearish_fib' || idea.chartType === 'eurusd_4h' ? (
                  <>
                    <path
                      d="M 15,28 L 85,42 L 130,68 L 200,54 L 250,86 L 320,74 L 368,104"
                      fill="none"
                      stroke="#F23645"
                      strokeWidth="2"
                    />
                    <rect x="195" y="48" width="110" height="16" fill="#22C55E" fillOpacity="0.16" />
                  </>
                ) : (
                  <>
                    <path
                      d="M 15,96 L 75,84 L 125,92 L 195,58 L 245,68 L 315,28 L 368,20"
                      fill="none"
                      stroke="#089981"
                      strokeWidth="2.2"
                    />
                    <line x1="160" y1="22" x2="368" y2="22" stroke="#60A5FA" strokeDasharray="4 3" />
                  </>
                )}
                {idea.priceAxisLabels.slice(0, 3).map((lbl, idx) => (
                  <text
                    key={lbl}
                    x="378"
                    y={26 + idx * 36}
                    fill="#94A3B8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {lbl}
                  </text>
                ))}
              </svg>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#131722] group-hover:text-[#2962FF] transition-colors mb-1">
                  {idea.title}
                </h4>
                <p className="text-xs text-[#434651] leading-relaxed line-clamp-2 mb-3">
                  {idea.description}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-[#787B86] pt-2 border-t border-[#F0F3FA]">
                <div>
                  <span className="font-medium text-[#131722]">by {idea.author}</span> ·{' '}
                  <span>{idea.timeLabel}</span>
                </div>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {idea.comments}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Rocket className="w-3.5 h-3.5" />
                    {idea.boosts}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function NewsWireGrid({
  title,
  items,
  onSelectNews,
  expandLabel = 'Keep reading',
}: {
  title: string;
  items: WireNewsItem[];
  onSelectNews: (item: WireNewsItem) => void;
  expandLabel?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const visibleItems = expanded ? items : items.slice(0, 12);

  return (
    <div>
      <h3 className="text-2xl font-display font-bold text-[#131722] mb-5 inline-flex items-center gap-1">
        <span>{title}</span>
        <ChevronRight className="w-5 h-5" />
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
        {visibleItems.map((story) => (
          <button
            key={story.id}
            type="button"
            onClick={() => onSelectNews(story)}
            className="text-left group cursor-pointer rounded-xl p-2.5 -m-2.5 hover:bg-[#F8F9FD] transition-colors"
          >
            <div className="flex items-center gap-1.5 text-xs text-[#787B86] mb-1">
              <span className="w-4 h-4 rounded-full bg-[#1E222D] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                {story.source.slice(0, 1)}
              </span>
              <span>
                {story.timeAgo} · {story.source}
              </span>
              {story.locked && <Lock className="w-3 h-3 text-[#787B86]" />}
            </div>
            <div
              className={`text-sm leading-snug transition-colors ${
                story.locked
                  ? 'text-[#787B86] group-hover:text-[#131722]'
                  : 'font-medium text-[#131722] group-hover:text-[#2962FF]'
              }`}
            >
              {story.flash && (
                <Zap className="w-3.5 h-3.5 text-[#F59E0B] inline mr-1 -mt-0.5 fill-[#F59E0B]" />
              )}
              {story.headline}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-5 text-xs font-semibold text-[#2962FF] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
      >
        <span>{expanded ? 'Collapse feed' : expandLabel}</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export const MarketsSections: React.FC<MarketsSectionsProps> = ({
  onSelectSymbol,
  onSelectNews,
  onSelectIdea,
  onOpenFxRatesModal,
  onJumpToAnalysis,
}) => {
  const [forexTf, setForexTf] = useState<ForexTimeframe>('1D');
  const [activeSectionTab, setActiveSectionTab] = useState<'markets' | 'earnings'>('markets');
  const [mfQuery, setMfQuery] = useState<string>('');
  const [mfResults, setMfResults] = useState<Array<{ schemeCode: number; schemeName: string }>>([]);
  const [mfSearching, setMfSearching] = useState<boolean>(false);
  const [mfError, setMfError] = useState<string | null>(null);
  const [mfSearchedOnce, setMfSearchedOnce] = useState<boolean>(false);

  const handleAmfiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = mfQuery.trim();
    if (!trimmed) return;
    setMfSearching(true);
    setMfError(null);
    setMfSearchedOnce(true);
    try {
      const res = await fetch(`/api/mf/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        setMfError('Unable to reach live AMFI scheme registry right now.');
        setMfResults([]);
        return;
      }
      const data = (await res.json()) as {
        results?: Array<{ schemeCode: number; schemeName: string }>;
      };
      setMfResults((data.results || []).slice(0, 8));
    } catch {
      setMfError('Network error querying /api/mf/search.');
      setMfResults([]);
    } finally {
      setMfSearching(false);
    }
  };

  const divergingMetrics = React.useMemo(() => {
    return computeDivergingBarMetrics(FOREX_PERFORMANCE_PAIRS, forexTf);
  }, [forexTf]);

  return (
    <div id="markets" className="bg-white text-[#131722] pb-16">
      <div className="max-w-[1260px] mx-auto px-4 md:px-8 space-y-12">
        {/* Markets Sections View Switcher */}
        <div
          id="markets-tabs"
          className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E0E3EB]"
        >
          <div
            role="tablist"
            aria-label="Markets Explorer Views"
            className="inline-flex items-center p-1 rounded-lg bg-[#F0F3FA] gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeSectionTab === 'markets'}
              onClick={() => setActiveSectionTab('markets')}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeSectionTab === 'markets'
                  ? 'bg-[#131722] text-white'
                  : 'text-[#434651] hover:text-[#131722]'
              }`}
            >
              All Markets
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSectionTab === 'earnings'}
              onClick={() => setActiveSectionTab('earnings')}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeSectionTab === 'earnings'
                  ? 'bg-[#131722] text-white'
                  : 'text-[#434651] hover:text-[#131722]'
              }`}
            >
              Policy &amp; NFO Calendar
            </button>
          </div>

          <span className="text-xs text-[#787B86]">
            {activeSectionTab === 'earnings'
              ? 'Upcoming SGB tranches, G-Sec auctions, RBI & AMFI releases'
              : 'Mutual funds, gold bullion, debt funds, ETFs & macro yield intelligence'}
          </span>
        </div>

        {activeSectionTab === 'earnings' ? (
          <EarningsCalendarTab onAnalyzeTicker={onJumpToAnalysis} />
        ) : (
        <div className="space-y-16">
        {/* ============================================================ */}
        {/* 1. DIRECT MUTUAL FUNDS & ETFs                                */}
        {/* ============================================================ */}
        <section id="mutual-funds-section" aria-label="Direct Mutual Funds and ETFs" className="space-y-10">
          <div>
            <h2 className="text-[28px] font-display font-bold text-[#131722] mb-5 inline-flex items-center gap-1">
              <span>Direct Mutual Funds &amp; ETFs</span>
              <ChevronRight className="w-6 h-6" />
            </h2>

            {/* Live AMFI Scheme Lookup (wired to /api/mf/search) */}
            <div className="mb-7 rounded-2xl border border-[#E0E3EB] bg-[#F8F9FD] p-4 md:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <div className="text-sm font-bold text-[#131722]">Live AMFI Mutual Fund Scheme Lookup</div>
                  <div className="text-xs text-[#787B86]">
                    Search any Indian AMFI scheme by name or numeric code via api.mfapi.in and load it directly in the terminal
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[#2962FF] bg-white px-2.5 py-1 rounded border border-[#E0E3EB] self-start sm:self-auto">
                  GET /api/mf/search
                </span>
              </div>

              <form onSubmit={handleAmfiSearch} className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2.5 flex-1 px-3 py-2 rounded-xl bg-white border border-[#D1D5DB] focus-within:border-[#2962FF]">
                  <Search className="w-4 h-4 text-[#787B86] shrink-0" />
                  <input
                    type="text"
                    value={mfQuery}
                    onChange={(e) => setMfQuery(e.target.value)}
                    placeholder="Search AMFI schemes (e.g. Parag Parikh, SBI Gilt, HDFC Mid-Cap, Nippon Gold)..."
                    className="w-full text-xs text-[#131722] placeholder-[#9598A1] focus:outline-none bg-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={mfSearching}
                  className="px-4 py-2 rounded-xl bg-[#131722] hover:bg-[#1F2937] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {mfSearching ? 'Searching AMFI...' : 'Search AMFI Schemes'}
                </button>
              </form>

              {mfError && (
                <div className="mt-2.5 text-xs text-[#DC2626] font-mono">{mfError}</div>
              )}

              {mfResults.length > 0 && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {mfResults.map((item) => (
                    <button
                      key={item.schemeCode}
                      type="button"
                      onClick={() => onJumpToAnalysis?.(String(item.schemeCode))}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-[#E0E3EB] hover:border-[#2962FF] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#131722] truncate">
                          {item.schemeName}
                        </div>
                        <div className="text-[11px] font-mono text-[#787B86]">
                          AMFI Code {item.schemeCode}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-[#2962FF] shrink-0">
                        Analyze ›
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {mfSearchedOnce && !mfSearching && !mfError && mfResults.length === 0 && (
                <div className="mt-2.5 text-xs text-[#787B86]">
                  No AMFI schemes matched &ldquo;{mfQuery}&rdquo;. Try a broader fund house term such as &ldquo;Parag&rdquo; or &ldquo;Gilt&rdquo;.
                </div>
              )}
            </div>

            <div className="text-base font-bold text-[#131722] mb-3">Community trends</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MUTUAL_FUND_LEADERS.slice(0, 3).map((fund) => (
                <button
                  key={fund.symbol}
                  type="button"
                  onClick={() => onSelectSymbol(fund)}
                  className="rounded-xl border border-[#E0E3EB] bg-white p-4 text-left hover:border-[#2962FF]/45 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <span
                      className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: fund.badgeColor }}
                    >
                      {fund.badgeText}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#131722]">{fund.symbol}</div>
                      <div className="text-xs text-[#787B86] truncate">{fund.name}</div>
                    </div>
                  </div>
                  <div className="tabular-nums">
                    <div className="text-base font-bold text-[#131722]">
                      {fund.price} <span className="text-[10px] text-[#787B86] font-normal">{fund.unit}</span>
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        fund.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                      }`}
                    >
                      {formatSignedPercent(fund.changePercent)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <TradeIdeasPair ideas={MUTUAL_FUND_AND_ETF_IDEAS} onSelectIdea={onSelectIdea} />

          {/* Top Broad & Index ETFs */}
          <div>
            <h3 className="text-xl font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
              <span>Top Broad &amp; Index ETFs</span>
              <ChevronRight className="w-5 h-5" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 divide-y md:divide-y-0 border-t border-b border-[#F0F3FA] py-2">
              {GLOBAL_ETFS_LIST.map((etf) => (
                <SymbolBadgeRow key={etf.symbol} item={etf} onClick={() => onSelectSymbol(etf)} />
              ))}
            </div>
          </div>

          {/* Direct Mutual Fund Leaders */}
          <div>
            <h3 className="text-xl font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
              <span>Direct Mutual Fund Leaders</span>
              <ChevronRight className="w-5 h-5" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 divide-y md:divide-y-0 border-t border-b border-[#F0F3FA] py-2">
              {MUTUAL_FUND_LEADERS.map((fund) => (
                <SymbolBadgeRow key={fund.symbol} item={fund} pillStyle onClick={() => onSelectSymbol(fund)} />
              ))}
            </div>
          </div>

          {/* Policy & Yield Schedule + NFO & SGB Tranches Calendar */}
          <div className="space-y-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-xl font-display font-bold text-[#131722] inline-flex items-center gap-1">
                  <span>Policy &amp; Yield Schedule</span>
                  <ChevronRight className="w-5 h-5" />
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSectionTab('earnings');
                    document.getElementById('markets-tabs')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs font-semibold text-[#2962FF] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Live countdowns &amp; policy catalysts</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E0E3EB] text-[11px] font-semibold text-[#787B86] uppercase">
                      <th className="py-2 pr-4">Catalyst &amp; Instrument</th>
                      <th className="py-2 px-4 text-right">Actual / Coupon</th>
                      <th className="py-2 pl-4 text-right">Consensus / Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F3FA] text-sm tabular-nums">
                    {POLICY_AND_AUCTION_CALENDAR.map((row) => (
                      <tr key={row.id} className="hover:bg-[#F8F9FD]">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-[#434651] w-12 shrink-0">
                              {row.dateLabel}
                            </span>
                            <div>
                              <div className="font-semibold text-[#131722]">{row.title}</div>
                              <span className="text-[11px] font-mono bg-[#F0F3FA] text-[#787B86] px-1.5 py-0.5 rounded">
                                {row.subLabel}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#131722]">{row.actual}</td>
                        <td className="py-3 pl-4 text-right text-[#787B86]">{row.forecast}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
                <span>NFO &amp; SGB Tranches Calendar</span>
                <ChevronRight className="w-5 h-5" />
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E0E3EB] text-[11px] font-semibold text-[#787B86] uppercase">
                      <th className="py-2 pr-4">Scheme / Tranche</th>
                      <th className="py-2 px-4 text-right">Issuer</th>
                      <th className="py-2 pl-4 text-right">Coupon / Offer NAV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F3FA] text-sm tabular-nums">
                    {NFO_AND_SGB_TRANCHES.map((tranche) => (
                      <tr key={tranche.symbol} className="hover:bg-[#F8F9FD]">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-[#434651] w-12 shrink-0">
                              {tranche.date}
                            </span>
                            <div>
                              <div className="font-semibold text-[#131722]">{tranche.name}</div>
                              <span className="text-[11px] font-mono bg-[#F0F3FA] text-[#787B86] px-1.5 py-0.5 rounded">
                                {tranche.symbol}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#131722]">{tranche.exchange}</td>
                        <td className="py-3 pl-4 text-right font-semibold text-[#131722]">{tranche.offerPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <NewsWireGrid
            title="Mutual fund & ETF news"
            items={MUTUAL_FUND_NEWS}
            onSelectNews={onSelectNews}
          />
        </section>

        {/* ============================================================ */}
        {/* 2. GOLD & PRECIOUS METALS                                    */}
        {/* ============================================================ */}
        <section id="gold-section" aria-label="Gold and Precious Metals" className="space-y-10">
          <div>
            <h2 className="text-[28px] font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
              <span>Gold &amp; Precious Metals</span>
              <ChevronRight className="w-6 h-6" />
            </h2>
            <div className="text-base font-bold text-[#131722] mb-3">Spot &amp; Sovereign Gold Leaders</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {GOLD_BULLION_ASSETS.slice(0, 3).map((asset) => (
                <button
                  key={asset.symbol}
                  type="button"
                  onClick={() => onSelectSymbol(asset)}
                  className="rounded-xl border border-[#E0E3EB] bg-white p-4 text-left hover:border-[#2962FF]/45 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span
                      className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center"
                      style={{ backgroundColor: asset.badgeColor }}
                    >
                      {asset.badgeText}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#131722]">{asset.symbol}</div>
                      <div className="text-xs text-[#787B86] truncate">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-base font-bold text-[#131722] tabular-nums">
                    {asset.price} <span className="text-[10px] font-normal text-[#787B86]">{asset.unit}</span>
                  </div>
                  <div
                    className={`text-xs font-semibold tabular-nums ${
                      asset.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                    }`}
                  >
                    {formatSignedPercent(asset.changePercent)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h3 className="text-xl font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
                <span>Gold &amp; Silver Instruments</span>
                <ChevronRight className="w-5 h-5" />
              </h3>
              <div className="divide-y divide-[#F0F3FA]">
                {GOLD_BULLION_ASSETS.map((asset) => (
                  <SymbolBadgeRow
                    key={asset.symbol}
                    item={asset}
                    pillStyle
                    onClick={() => onSelectSymbol(asset)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
                <span>Gilt &amp; Bond Funds</span>
                <ChevronRight className="w-5 h-5" />
              </h3>
              <div className="divide-y divide-[#F0F3FA]">
                {DEBT_FUND_LEADERS.slice(0, 4).map((debt) => (
                  <SymbolBadgeRow
                    key={debt.symbol}
                    item={debt}
                    pillStyle
                    onClick={() => onSelectSymbol(coin)}
                  />
                ))}
              </div>
            </div>
          </div>

          <NewsWireGrid title="Crypto news" items={CRYPTO_NEWS} onSelectNews={onSelectNews} />
        </section>

        {/* ============================================================ */}
        {/* 3. FUTURES & COMMODITIES (PDF p.13-14 + Screenshots)         */}
        {/* ============================================================ */}
        <section id="futures-section" aria-label="Futures and commodities" className="space-y-10">
          <h2 className="text-[28px] font-display font-bold text-[#131722] inline-flex items-center gap-1">
            <span>Futures and commodities</span>
            <ChevronRight className="w-6 h-6" />
          </h2>

          <TradeIdeasPair ideas={FUTURES_TRADE_IDEAS} onSelectIdea={onSelectIdea} />

          {/* Exact Match to image_427b5b41.png: Side-by-Side Energy futures & Metals futures */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h3 className="text-2xl font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
                <span>Energy futures</span>
                <ChevronRight className="w-5 h-5" />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 border-t border-b border-[#F0F3FA] py-2">
                {ENERGY_FUTURES.map((row) => (
                  <SymbolBadgeRow key={row.symbol} item={row} onClick={() => onSelectSymbol(row)} />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
                <span>Metals futures</span>
                <ChevronRight className="w-5 h-5" />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 border-t border-b border-[#F0F3FA] py-2">
                {METALS_FUTURES.map((row) => (
                  <SymbolBadgeRow key={row.symbol} item={row} onClick={() => onSelectSymbol(row)} />
                ))}
              </div>
            </div>
          </div>

          {/* Exact Match to image_396c4c53.png */}
          <NewsWireGrid
            title="Futures news"
            items={FUTURES_NEWS}
            onSelectNews={onSelectNews}
          />
        </section>

        {/* ============================================================ */}
        {/* 4. FOREX & CURRENCIES — TRADE IDEAS, PERFORMANCE & NEWS      */}
        {/* ============================================================ */}
        <section id="forex-section" aria-label="Forex and currencies" className="space-y-12">
          <div className="space-y-8">
            <h2 className="text-[28px] font-display font-bold text-[#131722] inline-flex items-center gap-1">
              <span>Forex and currencies</span>
              <ChevronRight className="w-6 h-6" />
            </h2>

            <TradeIdeasPair ideas={FOREX_TRADE_IDEAS} onSelectIdea={onSelectIdea} />

            {/* FOREX PERFORMANCE (Exact Match to image_36870e19.png) */}
            <div className="rounded-2xl border border-[#E0E3EB] bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <h3 className="text-2xl font-display font-bold text-[#131722] inline-flex items-center gap-1">
                  <span>Forex performance</span>
                  <ChevronRight className="w-5 h-5" />
                </h3>
                <span className="text-xs font-mono text-[#787B86]">
                  Timeframe: <strong className="text-[#131722]">{forexTf}</strong>
                </span>
              </div>

              <div className="space-y-3" data-testid="forex-performance-bars" data-timeframe={forexTf}>
                {FOREX_PERFORMANCE_PAIRS.map((pairObj, idx) => {
                  const bar = divergingMetrics[idx];
                  if (!bar) return null;
                  return (
                    <div
                      key={pairObj.pair}
                      className="grid grid-cols-[118px_1fr_74px] sm:grid-cols-[126px_1fr_82px] items-center gap-3 md:gap-4"
                    >
                      {/* Pair Flags + Monospace Capsule */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center -space-x-1.5 text-base leading-none" aria-hidden="true">
                          <span>{pairObj.baseFlag}</span>
                          <span>{pairObj.quoteFlag}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#F0F3FA] text-[11px] font-bold font-mono text-[#131722]">
                          {pairObj.pair}
                        </span>
                      </div>

                      {/* Centered Diverging Horizontal Track */}
                      <div className="relative h-2.5 rounded-full bg-[#F0F3FA] flex items-center">
                        <div className="w-1/2 h-full flex justify-end items-center pr-px">
                          {!bar.isPositive && (
                            <div
                              className="h-2.5 rounded-l-full bg-[#F23645] transition-all duration-300"
                              style={{ width: `${bar.widthPercent}%` }}
                            />
                          )}
                        </div>
                        <div className="w-px h-4 bg-[#D1D4DC] shrink-0" />
                        <div className="w-1/2 h-full flex justify-start items-center pl-px">
                          {bar.isPositive && (
                            <div
                              className="h-2.5 rounded-r-full bg-[#089981] transition-all duration-300"
                              style={{ width: `${bar.widthPercent}%` }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Right-Aligned Tabular Percentage Readout */}
                      <div
                        className={`text-right text-xs md:text-sm font-semibold tabular-nums font-mono ${
                          bar.isPositive ? 'text-[#089981]' : 'text-[#F23645]'
                        }`}
                      >
                        {bar.formattedValue}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Timeframe Tabs Matching image_36870e19.png */}
              <div
                className="flex flex-wrap items-center gap-1.5 mt-6"
                role="group"
                aria-label="Forex performance timeframe"
              >
                {FOREX_TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setForexTf(tf)}
                    aria-pressed={forexTf === tf}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      forexTf === tf
                        ? 'bg-[#F0F3FA] text-[#131722]'
                        : 'text-[#434651] hover:bg-[#F8F9FD]'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onOpenFxRatesModal}
                className="mt-4 text-xs font-semibold text-[#2962FF] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>See all rates</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* FOREX NEWS (Exact Match to image_f7a63731.png) */}
          <NewsWireGrid
            title="Forex news"
            items={FOREX_NEWS}
            onSelectNews={onSelectNews}
          />
        </section>

        {/* ============================================================ */}
        {/* 5. ECONOMY, REAL NATURAL EARTH MAP & CALENDAR (PDF pp.16–18) */}
        {/* ============================================================ */}
        <section id="economy-section" aria-label="Economy and Economic Calendar" className="space-y-10">
          <h2 className="text-[28px] font-display font-bold text-[#131722] inline-flex items-center gap-1">
            <span>Economy</span>
            <ChevronRight className="w-6 h-6" />
          </h2>

          {/* Real Natural Earth Choropleth Map Matching image_d50f2fa8.png */}
          <GlobalInflationMap />

          {/* Economic Calendar (PDF Page 17) */}
          <div>
            <h3 className="text-xl font-display font-bold text-[#131722] mb-4 inline-flex items-center gap-1">
              <span>Economic Calendar</span>
              <ChevronRight className="w-5 h-5" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ECONOMIC_CALENDAR.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-[#E0E3EB] bg-white p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#787B86] mb-1">
                      <span>{ev.dateLabel}</span>
                      <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                        <span className="w-0.5 h-1.5 bg-[#2962FF]" />
                        <span className="w-0.5 h-2.5 bg-[#2962FF]" />
                        <span className="w-0.5 h-3 bg-[#2962FF]" />
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#131722]">
                      {ev.subLabel} · {ev.title}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-[#F0F3FA] tabular-nums">
                    <div>
                      <div className="text-[#787B86]">Actual</div>
                      <div className="font-semibold text-[#131722]">{ev.actual}</div>
                    </div>
                    <div>
                      <div className="text-[#787B86]">Forecast</div>
                      <div className="font-semibold text-[#131722]">{ev.forecast}</div>
                    </div>
                    <div>
                      <div className="text-[#787B86]">Prior</div>
                      <div className="font-semibold text-[#131722]">{ev.prior}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Equity Analysis & Live Feed Connections */}
          <div>
            <h3 className="text-xl font-display font-bold text-[#131722] mb-2 inline-flex items-center gap-1">
              <span>Institutional data &amp; live API research</span>
              <ChevronRight className="w-5 h-5" />
            </h3>
            <p className="text-sm text-[#434651] mb-4">
              Financia focuses strictly on equity research, SEC filing synthesis, and live multi-asset telemetry — not order execution.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => onJumpToAnalysis?.('NVDA')}
                className="rounded-2xl border border-[#E0E3EB] bg-[#F8F9FD] hover:border-[#2962FF]/50 p-5 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-base font-bold text-[#131722] mb-1">
                  <LineChart className="w-4 h-4 text-[#2962FF]" />
                  <span>Financia Live Equity Analysis Terminal</span>
                </div>
                <div className="text-xs text-[#787B86] mb-3">
                  Multi-agent 10-Q/10-K SEC synthesis, options surface telemetry &amp; Bull/Bear stress testing
                </div>
                <div className="text-xs font-semibold text-[#2962FF]">Launch Stock Analysis ›</div>
              </button>

              <div className="rounded-2xl border border-[#E0E3EB] bg-[#F8F9FD] p-5">
                <div className="flex items-center gap-2 text-base font-bold text-[#131722] mb-1">
                  <Globe className="w-4 h-4 text-[#089981]" />
                  <span>Backend Market API Ready</span>
                </div>
                <div className="text-xs text-[#787B86] mb-3">
                  Pre-wired Express server routes (/api/stocks/analyze, /api/markets/overview) ready for custom quote &amp; FX feeds
                </div>
                <div className="text-xs font-semibold text-[#089981]">Server Proxy Active • Port 3000</div>
              </div>
            </div>
          </div>
        </section>
        </div>
        )}
      </div>
    </div>
  );
};
