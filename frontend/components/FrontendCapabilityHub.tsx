import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Calculator,
  Filter,
  LayoutGrid,
  LineChart,
  PieChart,
  Search,
} from 'lucide-react';
import { TerminalTabId } from './LiveStockTerminal';
import { HEATMAP_STOCKS, NavMasterSchemeRow } from '../utils/heatmapEngine';

interface FrontendCapabilityHubProps {
  activeRegion: 'IN' | 'GLOBAL';
  onLaunchTerminal: (initialTab?: TerminalTabId) => void;
  onJumpToSection: (sectionId: string) => void;
  onInspectTicker?: (ticker: string) => void;
}

export const FrontendCapabilityHub: React.FC<FrontendCapabilityHubProps> = ({
  activeRegion,
  onLaunchTerminal,
  onJumpToSection,
  onInspectTicker,
}) => {
  const [query, setQuery] = useState('');
  const [dbMatches, setDbMatches] = useState<NavMasterSchemeRow[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setDbMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      fetch(`/api/nav-master/search?q=${encodeURIComponent(q)}&limit=8`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.results)) {
            setDbMatches(data.results);
          }
        })
        .catch(() => setDbMatches([]))
        .finally(() => setSearching(false));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const localMatches = query.trim().length > 0
    ? HEATMAP_STOCKS.filter(
        (f) =>
          f.symbol.toLowerCase().includes(query.trim().toLowerCase()) ||
          f.name.toLowerCase().includes(query.trim().toLowerCase()) ||
          f.sector.toLowerCase().includes(query.trim().toLowerCase())
      ).slice(0, 5)
    : [];

  const handleOpenFund = (symbol: string) => {
    setQuery('');
    setDbMatches([]);
    if (onInspectTicker) {
      onInspectTicker(symbol);
    } else {
      onLaunchTerminal('individual');
    }
  };

  return (
    <section
      id="workspace-overview"
      data-testid="frontend-capability-hub"
      aria-label="Financia Research Workspace"
      className="w-full bg-[#050914] text-white border-b border-white/[0.1]"
    >
      <div className="max-w-[1320px] mx-auto px-4 md:px-6 py-7 md:py-8 space-y-5">
        {/* Clean Single-Row Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1
              className="font-display font-semibold text-white tracking-tight"
              style={{ fontSize: 'clamp(1.45rem, 2.2vw, 1.95rem)', lineHeight: 1.18 }}
            >
              Fund Research &amp; Portfolio Workspace
            </h1>
            <p className="text-xs md:text-[13px] text-[#94a3b8] mt-1">
              Analyze any instrument, define your own asset performance map across curated multi-AMC &amp; live SQLite AMFI funds, or model allocations ({activeRegion === 'IN' ? 'India & Global' : 'Global & India'}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="hub-launch-terminal-btn"
              onClick={() => onLaunchTerminal('individual')}
              className="h-9 px-3.5 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Dedicated Fund Terminal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              data-testid="hub-launch-allocator-btn"
              onClick={() => onLaunchTerminal('allocator')}
              className="h-9 px-3.5 rounded-[8px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.14] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <PieChart className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Portfolio Allocator</span>
            </button>
          </div>
        </div>

        {/* Instant Direct Fund Search + Clean Workflow Jump Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 pt-4 border-t border-white/[0.08]">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              data-testid="workspace-quick-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump directly to any mutual fund, ETF, AMC, or AMFI scheme code..."
              className="w-full h-10 pl-9 pr-3 rounded-[9px] bg-[#0b1326] border border-white/[0.14] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
            />
            {query.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 rounded-[10px] bg-[#0b1326] border border-white/[0.16] shadow-2xl z-30 max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                {localMatches.map((f) => (
                  <button
                    key={f.symbol}
                    type="button"
                    onClick={() => handleOpenFund(f.symbol)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[7px] hover:bg-white/[0.08] text-left text-xs cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-white">{f.symbol}</span>
                      <span className="text-[#64748b] mx-1.5">·</span>
                      <span className="text-[#cbd5e1] truncate">{f.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#38bdf8] shrink-0">
                      {f.sector}
                    </span>
                  </button>
                ))}
                {dbMatches.map((row) => (
                  <button
                    key={`db-${row.scheme_code}`}
                    type="button"
                    onClick={() => handleOpenFund(String(row.scheme_code))}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[7px] hover:bg-white/[0.08] text-left text-xs cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-semibold text-[#38bdf8]">#{row.scheme_code}</span>
                      <span className="text-[#64748b] mx-1.5">·</span>
                      <span className="text-[#cbd5e1] truncate">{row.scheme_name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#94a3b8] shrink-0">
                      ₹{Number(row.latest_nav).toFixed(2)}
                    </span>
                  </button>
                ))}
                {localMatches.length === 0 && dbMatches.length === 0 && (
                  <div className="px-3 py-2.5 text-xs text-[#94a3b8]">
                    {searching ? 'Searching AMFI SQLite database...' : `No funds matched "${query}"`}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="capability-card-analysis"
              onClick={() => onJumpToSection('instrument-analysis')}
              className="h-10 px-3 rounded-[9px] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-[#e2e8f0] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <LineChart className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Instrument Analysis</span>
            </button>
            <button
              type="button"
              data-testid="capability-card-markets"
              onClick={() => onJumpToSection('market-summary')}
              className="h-10 px-3 rounded-[9px] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-[#e2e8f0] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#34d399]" />
              <span>Performance Map</span>
            </button>
            <button
              type="button"
              data-testid="capability-card-screener"
              onClick={() => onJumpToSection('mf-etf-screener')}
              className="h-10 px-3 rounded-[9px] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-[#e2e8f0] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Filter className="w-3.5 h-3.5 text-[#a78bfa]" />
              <span>Fund Screener</span>
            </button>
            <button
              type="button"
              data-testid="capability-card-sip"
              onClick={() => onJumpToSection('sip-tools-workbench')}
              className="h-10 px-3 rounded-[9px] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-[#e2e8f0] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Calculator className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>SIP Planner</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
