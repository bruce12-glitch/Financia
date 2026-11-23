import React from 'react';
import {
  Activity,
  ArrowUpRight,
  Calculator,
  Compass,
  Filter,
  Globe2,
  LineChart,
  PieChart,
  ShieldAlert,
  Table2,
} from 'lucide-react';
import { SCREENER_FUNDS } from '../utils/screenerEngine';
import { TerminalTabId } from './LiveStockTerminal';

interface FrontendCapabilityHubProps {
  activeRegion: 'IN' | 'GLOBAL';
  onLaunchTerminal: (initialTab?: TerminalTabId) => void;
  onJumpToSection: (sectionId: string) => void;
}

export const FrontendCapabilityHub: React.FC<FrontendCapabilityHubProps> = ({
  activeRegion,
  onLaunchTerminal,
  onJumpToSection,
}) => {
  const mfCount = SCREENER_FUNDS.filter((f) => f.instrumentType === 'Mutual Fund').length;
  const etfCount = SCREENER_FUNDS.filter((f) => f.instrumentType === 'ETF').length;

  return (
    <section
      id="workspace-overview"
      data-testid="frontend-capability-hub"
      aria-label="Financia Application Capabilities Hub"
      className="w-full bg-[#050914] text-white border-b border-white/[0.1]"
    >
      <div className="max-w-[1320px] mx-auto px-4 md:px-6 py-10 md:py-12">
        {/* Top Split: Concise Value Prop + Primary Dedicated Terminal CTA */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/[0.1]">
          <div className="max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-[0.09em] text-[#38bdf8] font-semibold mb-2">
              Financia Workspace · {activeRegion === 'IN' ? 'India & Global Feeds' : 'Global & India Feeds'}
            </div>
            <h1
              className="font-display font-light text-white tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.55rem)', lineHeight: 1.12 }}
            >
              Everything in your research workspace, organized by workflow.
            </h1>
            <p className="text-sm text-[#cbd5e1] mt-2.5 leading-relaxed">
              Screen all {SCREENER_FUNDS.length} mutual funds and ETFs with tail-risk ratios, inspect AMFI NAVs, bullion, and sovereign yields, model custom SIP baskets, or launch the dedicated Fund Terminal for multi-asset comparison, bulk data ledgers, and custom allocation projections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              data-testid="hub-launch-terminal-btn"
              onClick={() => onLaunchTerminal('compare')}
              className="h-10 px-4 rounded-[9px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LineChart className="w-4 h-4" />
              <span>Open Dedicated Fund Terminal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              data-testid="hub-launch-allocator-btn"
              onClick={() => onLaunchTerminal('allocator')}
              className="h-10 px-4 rounded-[9px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.14] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <PieChart className="w-4 h-4 text-[#38bdf8]" />
              <span>Custom % Allocator</span>
            </button>
          </div>
        </div>

        {/* 5-Module Application Capability Grid */}
        <div className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Capability 1: Dedicated Multi-Fund Analysis Terminal */}
          <button
            type="button"
            data-testid="capability-card-terminal"
            onClick={() => onLaunchTerminal('compare')}
            className="group text-left rounded-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#38bdf8]/50 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="w-8 h-8 rounded-[8px] bg-[#2563eb]/20 border border-[#2563eb]/40 text-[#38bdf8] flex items-center justify-center">
                  <LineChart className="w-4 h-4" />
                </span>
                <span className="text-[10.5px] font-mono text-[#38bdf8] inline-flex items-center gap-0.5">
                  /terminal
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white group-hover:text-[#38bdf8] transition-colors">
                Dedicated Fund Terminal
              </h2>
              <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">
                Analyze single or multiple instruments side-by-side across all {SCREENER_FUNDS.length} funds with 21-metric scoring, VaR stress tests, and bulk CSV exports.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#cbd5e1]">
              <span>Compare · Bulk · VaR</span>
              <Table2 className="w-3.5 h-3.5 text-[#38bdf8]" />
            </div>
          </button>

          {/* Capability 2: Custom Portfolio Allocator & Return Backtest */}
          <button
            type="button"
            data-testid="capability-card-allocator"
            onClick={() => onLaunchTerminal('allocator')}
            className="group text-left rounded-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#34d399]/50 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="w-8 h-8 rounded-[8px] bg-[#059669]/20 border border-[#059669]/40 text-[#34d399] flex items-center justify-center">
                  <PieChart className="w-4 h-4" />
                </span>
                <span className="text-[10.5px] font-mono text-[#34d399] inline-flex items-center gap-0.5">
                  Backtest
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white group-hover:text-[#34d399] transition-colors">
                Custom % Portfolio Allocator
              </h2>
              <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">
                Assign exact percentage weights across chosen ETFs &amp; MFs, optimize for Min-VaR or Max Sharpe, and visualize historical-based return projections.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#cbd5e1]">
              <span>Base · Bull · Bear</span>
              <ShieldAlert className="w-3.5 h-3.5 text-[#34d399]" />
            </div>
          </button>

          {/* Capability 3: 20-Fund Screener & Tail-Risk Dossier */}
          <button
            type="button"
            data-testid="capability-card-screener"
            onClick={() => onJumpToSection('mf-etf-screener')}
            className="group text-left rounded-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/30 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="w-8 h-8 rounded-[8px] bg-white/[0.08] border border-white/[0.12] text-[#e2e8f0] flex items-center justify-center">
                  <Filter className="w-4 h-4" />
                </span>
                <span className="text-[10.5px] font-mono text-[#94a3b8]">
                  {mfCount} MF · {etfCount} ETF
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white group-hover:text-[#38bdf8] transition-colors">
                Mutual Fund &amp; ETF Screener
              </h2>
              <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">
                Sort by 1M VaR 95%, Max Drawdown, Sharpe, Sortino, Treynor, TER, and AUM with interactive sector heatmaps and full fund dossiers.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#cbd5e1]">
              <span>Jump to Screener</span>
              <Compass className="w-3.5 h-3.5 text-[#94a3b8]" />
            </div>
          </button>

          {/* Capability 4: Live AMFI, Bullion & Sovereign Markets */}
          <button
            type="button"
            data-testid="capability-card-markets"
            onClick={() => onJumpToSection('market-summary')}
            className="group text-left rounded-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/30 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="w-8 h-8 rounded-[8px] bg-white/[0.08] border border-white/[0.12] text-[#e2e8f0] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </span>
                <span className="text-[10.5px] font-mono text-[#94a3b8]">AMFI · Gold · FX</span>
              </div>
              <h2 className="text-sm font-semibold text-white group-hover:text-[#38bdf8] transition-colors">
                Markets, Bullion &amp; Debt
              </h2>
              <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">
                Track Indian Direct Mutual Funds, physical-backed spot gold proxies, sovereign G-Sec yields, currency hedging, and institutional macro briefs.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#cbd5e1]">
              <span>Jump to Markets</span>
              <Activity className="w-3.5 h-3.5 text-[#94a3b8]" />
            </div>
          </button>

          {/* Capability 5: SIP Planner & Global Exchanges */}
          <button
            type="button"
            data-testid="capability-card-sip"
            onClick={() => onJumpToSection('sip-tools-workbench')}
            className="group text-left rounded-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/30 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="w-8 h-8 rounded-[8px] bg-white/[0.08] border border-white/[0.12] text-[#e2e8f0] flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </span>
                <span className="text-[10.5px] font-mono text-[#94a3b8]">SIP · Exchanges</span>
              </div>
              <h2 className="text-sm font-semibold text-white group-hover:text-[#38bdf8] transition-colors">
                SIP Planner &amp; Global Venues
              </h2>
              <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">
                Run step-up SIP &amp; Direct vs. Regular fee-drag models with custom % or chosen funds, plus inspect global market exchanges &amp; sessions.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#cbd5e1]">
              <span>Jump to Planner</span>
              <Globe2 className="w-3.5 h-3.5 text-[#94a3b8]" />
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};
