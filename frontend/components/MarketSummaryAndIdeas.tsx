import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Plus, Search, X } from 'lucide-react';
import { MACRO_SPARK_ROWS } from '../data/tradingViewData';
import { formatSignedPercent } from '../utils/marketCalculations';
import { CommunityIdeaItem, MarketSymbolRow, WireNewsItem } from '../types/markets';
import {
  HEATMAP_STOCKS,
  heatmapTileToMarketSymbolRow,
  NavMasterSchemeRow,
} from '../utils/heatmapEngine';
import { SectorHeatmap } from './SectorHeatmap';
import { LiveMacroYieldCard } from './LiveMacroYieldCard';

interface MarketSummaryAndIdeasProps {
  onSelectSymbol: (row: MarketSymbolRow) => void;
  onSelectNews: (item: WireNewsItem) => void;
  onSelectIdea: (idea: CommunityIdeaItem) => void;
  onJumpToAnalysis?: (ticker: string) => void;
  liveFeedActive?: boolean;
}

interface PinnedWatchItem {
  symbol: string;
  name: string;
  sector: string;
  price: string;
  unit: string;
  changePercent: number;
}

const WATCHBOARD_STORAGE_KEY = 'financia_user_watchboard_v1';

function loadPinnedWatchboard(): PinnedWatchItem[] {
  try {
    const raw = window.localStorage.getItem(WATCHBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PinnedWatchItem =>
        Boolean(item && typeof item.symbol === 'string' && typeof item.name === 'string')
    );
  } catch {
    return [];
  }
}

export const MarketSummaryAndIdeas: React.FC<MarketSummaryAndIdeasProps> = ({
  onSelectSymbol,
  onJumpToAnalysis,
  liveFeedActive = true,
}) => {
  const [deskTab, setDeskTab] = useState<'movers' | 'watchboard' | 'macro'>('movers');
  const [pinnedFunds, setPinnedFunds] = useState<PinnedWatchItem[]>(() => loadPinnedWatchboard());
  const [pinQuery, setPinQuery] = useState<string>('');
  const [amfiResults, setAmfiResults] = useState<NavMasterSchemeRow[]>([]);
  const [searchingAmfi, setSearchingAmfi] = useState<boolean>(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(WATCHBOARD_STORAGE_KEY, JSON.stringify(pinnedFunds.slice(0, 20)));
    } catch {
      // Non-fatal
    }
  }, [pinnedFunds]);

  useEffect(() => {
    const q = pinQuery.trim();
    if (q.length < 2) {
      setAmfiResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearchingAmfi(true);
      fetch(`/api/nav-master/search?q=${encodeURIComponent(q)}&limit=8`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.results)) {
            setAmfiResults(data.results);
          }
        })
        .catch(() => setAmfiResults([]))
        .finally(() => setSearchingAmfi(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [pinQuery]);

  // Dynamically computed top movers across the full 76-fund neutral universe (zero hardcoded AMC bias)
  const categoryMovers = useMemo(() => {
    const sorted = [...HEATMAP_STOCKS].sort((a, b) => b.changePercent - a.changePercent);
    return {
      leaders: sorted.slice(0, 4),
      laggards: [...sorted].reverse().slice(0, 4),
    };
  }, []);

  const curatedPinMatches = useMemo(() => {
    const q = pinQuery.trim().toLowerCase();
    if (!q) return [];
    return HEATMAP_STOCKS.filter(
      (f) =>
        f.symbol.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.sector.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [pinQuery]);

  const handlePinItem = (item: PinnedWatchItem) => {
    setPinnedFunds((prev) => {
      if (prev.some((p) => p.symbol.toUpperCase() === item.symbol.toUpperCase())) return prev;
      return [item, ...prev].slice(0, 20);
    });
    setPinQuery('');
    setDeskTab('watchboard');
  };

  const handleUnpin = (symbol: string) => {
    setPinnedFunds((prev) => prev.filter((p) => p.symbol.toUpperCase() !== symbol.toUpperCase()));
  };

  const handleInspect = (symbol: string, fallbackRow?: MarketSymbolRow) => {
    if (onJumpToAnalysis) {
      onJumpToAnalysis(symbol);
      return;
    }
    if (fallbackRow) {
      onSelectSymbol(fallbackRow);
    }
  };

  return (
    <div
      id="market-summary"
      data-testid="market-summary-section"
      className="scroll-mt-20 bg-[#f8fafc] text-[#0f172a] py-10 md:py-12 border-b border-[#e2e8f0]"
    >
      <div className="max-w-[1320px] mx-auto px-4 md:px-6 space-y-8">
        {/* 1. Primary Focal Anchor: User-Definable Multi-Fund Asset Class Performance Map */}
        <section aria-label="Asset Class Performance Map">
          <SectorHeatmap onSelectSymbol={onSelectSymbol} liveFeedActive={liveFeedActive} />
        </section>

        {/* 2. Neutral Utility Split: Dynamic Movers / User Watchboard / Macro Rates + Live Sovereign Yield Curve */}
        <section aria-label="Market Watchboard and Yield Curve" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: User-Controlled Watchboard, Category Movers & Macro Indicators (Zero ETF Advertising) */}
          <div
            data-testid="neutral-watchboard-card"
            className="rounded-[12px] bg-white border border-[#e2e8f0] p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#f1f5f9]">
                <div>
                  <h3 className="text-base font-display font-bold text-[#0f172a]">
                    Market Movers &amp; Your Watchboard
                  </h3>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Neutral cross-category breadth or pin any fund you choose to track
                  </p>
                </div>

                <div
                  role="tablist"
                  aria-label="Watchboard views"
                  className="inline-flex items-center p-0.5 rounded-[8px] bg-[#f1f5f9] border border-[#e2e8f0] gap-0.5"
                >
                  {(
                    [
                      { id: 'movers', label: 'Top Movers' },
                      { id: 'watchboard', label: `Pinned (${pinnedFunds.length})` },
                      { id: 'macro', label: 'Macro & FX' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      data-testid={`watchboard-tab-${tab.id}`}
                      aria-selected={deskTab === tab.id}
                      onClick={() => setDeskTab(tab.id)}
                      className={`px-2.5 py-1 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        deskTab === tab.id
                          ? 'bg-white text-[#0f172a] shadow-xs'
                          : 'text-[#64748b] hover:text-[#0f172a]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inline Search to Pin ANY Fund or AMFI Scheme */}
              <div className="relative mt-3.5">
                <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  data-testid="watchboard-pin-search"
                  value={pinQuery}
                  onChange={(e) => setPinQuery(e.target.value)}
                  placeholder="Pin any fund, ETF, or AMFI scheme code to your watchboard..."
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] focus:bg-white text-xs text-[#0f172a] placeholder-[#64748b] focus:outline-none focus:border-[#2563eb]"
                />
                {pinQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 rounded-[9px] bg-white border border-[#cbd5e1] shadow-lg z-20 max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                    {curatedPinMatches.map((f) => (
                      <button
                        key={f.symbol}
                        type="button"
                        onClick={() =>
                          handlePinItem({
                            symbol: f.symbol,
                            name: f.name,
                            sector: f.sector,
                            price: f.price,
                            unit: f.unit,
                            changePercent: f.changePercent,
                          })
                        }
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[6px] hover:bg-[#f1f5f9] text-left text-xs cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-[#0f172a]">{f.symbol}</span>
                          <span className="text-[#94a3b8] mx-1.5">·</span>
                          <span className="text-[#334155] truncate">{f.name}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563eb] shrink-0">
                          <Plus className="w-3 h-3" />
                          <span>Pin</span>
                        </span>
                      </button>
                    ))}
                    {amfiResults.map((row) => (
                      <button
                        key={`amfi-${row.scheme_code}`}
                        type="button"
                        onClick={() =>
                          handlePinItem({
                            symbol: String(row.scheme_code),
                            name: row.scheme_name,
                            sector: row.category || 'AMFI Scheme',
                            price: Number(row.latest_nav).toFixed(2),
                            unit: 'INR',
                            changePercent: 0,
                          })
                        }
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[6px] hover:bg-[#f1f5f9] text-left text-xs cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-semibold text-[#2563eb]">#{row.scheme_code}</span>
                          <span className="text-[#94a3b8] mx-1.5">·</span>
                          <span className="text-[#334155] truncate">{row.scheme_name}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669] shrink-0">
                          <Plus className="w-3 h-3" />
                          <span>Pin</span>
                        </span>
                      </button>
                    ))}
                    {curatedPinMatches.length === 0 && amfiResults.length === 0 && (
                      <div className="px-3 py-2 text-xs text-[#64748b]">
                        {searchingAmfi ? 'Searching AMFI database...' : `No matches for "${pinQuery}"`}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tab Content */}
              {deskTab === 'movers' && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#059669] font-semibold mb-2">
                      Session Leaders (76-Fund Universe)
                    </div>
                    <div className="divide-y divide-[#f1f5f9]">
                      {categoryMovers.leaders.map((tile) => (
                        <button
                          key={tile.symbol}
                          type="button"
                          onClick={() => handleInspect(tile.symbol, heatmapTileToMarketSymbolRow(tile))}
                          className="w-full flex items-center justify-between gap-2 py-2 hover:bg-[#f8fafc] px-1.5 -mx-1.5 rounded text-left cursor-pointer transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#0f172a] truncate">{tile.name}</div>
                            <div className="text-[11px] text-[#64748b] truncate">
                              <span className="font-mono">{tile.symbol}</span> · {tile.sector}
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0">
                            <div className="text-xs font-semibold text-[#0f172a]">
                              {tile.unit === 'INR' ? '₹' : '$'}
                              {tile.price}
                            </div>
                            <div className="text-[11px] font-semibold text-[#059669]">
                              {formatSignedPercent(tile.changePercent)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#dc2626] font-semibold mb-2">
                      Session Laggards &amp; Pullbacks
                    </div>
                    <div className="divide-y divide-[#f1f5f9]">
                      {categoryMovers.laggards.map((tile) => (
                        <button
                          key={tile.symbol}
                          type="button"
                          onClick={() => handleInspect(tile.symbol, heatmapTileToMarketSymbolRow(tile))}
                          className="w-full flex items-center justify-between gap-2 py-2 hover:bg-[#f8fafc] px-1.5 -mx-1.5 rounded text-left cursor-pointer transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#0f172a] truncate">{tile.name}</div>
                            <div className="text-[11px] text-[#64748b] truncate">
                              <span className="font-mono">{tile.symbol}</span> · {tile.sector}
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0">
                            <div className="text-xs font-semibold text-[#0f172a]">
                              {tile.unit === 'INR' ? '₹' : '$'}
                              {tile.price}
                            </div>
                            <div
                              className={`text-[11px] font-semibold ${
                                tile.changePercent >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                              }`}
                            >
                              {formatSignedPercent(tile.changePercent)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {deskTab === 'watchboard' && (
                <div className="mt-4">
                  {pinnedFunds.length === 0 ? (
                    <div className="rounded-[9px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-8 text-center">
                      <div className="text-sm font-semibold text-[#0f172a]">
                        No funds pinned yet
                      </div>
                      <p className="text-xs text-[#64748b] mt-1">
                        Use the search bar above to pin only the mutual funds, ETFs, or AMFI schemes you want to track here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#f1f5f9] max-h-60 overflow-y-auto">
                      {pinnedFunds.map((item) => (
                        <div
                          key={item.symbol}
                          className="flex items-center justify-between gap-2 py-2"
                        >
                          <button
                            type="button"
                            onClick={() => handleInspect(item.symbol)}
                            className="min-w-0 flex-1 text-left hover:text-[#2563eb] cursor-pointer"
                          >
                            <div className="text-xs font-semibold text-[#0f172a] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[#64748b] truncate">
                              <span className="font-mono">{item.symbol}</span> · {item.sector}
                            </div>
                          </button>
                          <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                            <div className="text-right">
                              <div className="text-xs font-semibold text-[#0f172a]">
                                {item.unit === 'INR' ? '₹' : '$'}
                                {item.price}
                              </div>
                              {item.changePercent !== 0 && (
                                <div
                                  className={`text-[11px] font-semibold ${
                                    item.changePercent >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                                  }`}
                                >
                                  {formatSignedPercent(item.changePercent)}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              aria-label={`Unpin ${item.symbol}`}
                              onClick={() => handleUnpin(item.symbol)}
                              className="p-1 text-[#94a3b8] hover:text-[#dc2626] cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {deskTab === 'macro' && (
                <div className="mt-4 divide-y divide-[#f1f5f9]">
                  {MACRO_SPARK_ROWS.map((macro) => (
                    <button
                      key={macro.symbol}
                      type="button"
                      onClick={() => onSelectSymbol(macro)}
                      className="w-full flex items-center justify-between gap-3 py-2.5 hover:bg-[#f8fafc] px-1.5 -mx-1.5 rounded text-left cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#0f172a]">{macro.name}</div>
                        <div className="text-[11px] font-mono text-[#64748b]">{macro.symbol}</div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-sm font-bold text-[#0f172a]">
                          {macro.price}{' '}
                          <span className="text-[10.5px] font-normal text-[#64748b]">
                            {macro.unit}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-semibold ${
                            macro.changePercent >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                          }`}
                        >
                          {formatSignedPercent(macro.changePercent)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-xs text-[#64748b]">
              <span>Click any fund row to inspect full analytics</span>
              {onJumpToAnalysis && (
                <button
                  type="button"
                  onClick={() => onJumpToAnalysis(pinnedFunds[0]?.symbol || 'PPFAS')}
                  className="font-semibold text-[#2563eb] hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>Open Fund Terminal</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Live Sovereign Treasury Yield Curve & Rate Spreads */}
          <LiveMacroYieldCard />
        </section>
      </div>
    </div>
  );
};
