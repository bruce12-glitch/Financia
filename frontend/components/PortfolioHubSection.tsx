import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Send,
  Sparkles,
} from 'lucide-react';
import { PORTFOLIO_SNAPSHOTS } from '../data/indianMarketData';
import { formatINR, generatePortfolioAiReply } from '../utils/screenerEngine';

interface PortfolioHubSectionProps {
  onOpenMcpModal: () => void;
  onOpenBrokerModal: (tab?: 'broker' | 'account') => void;
}

export const PortfolioHubSection: React.FC<PortfolioHubSectionProps> = ({
  onOpenMcpModal,
  onOpenBrokerModal,
}) => {
  const [snapshotIdx, setSnapshotIdx] = useState(0);
  const [aiQuery, setAiQuery] = useState('');
  const [activePrompt, setActivePrompt] = useState<string>(
    PORTFOLIO_SNAPSHOTS[0].aiDefaultQuestion
  );
  const [activeAnswer, setActiveAnswer] = useState<string>(
    PORTFOLIO_SNAPSHOTS[0].aiDefaultAnswer
  );
  const [showAllTx, setShowAllTx] = useState(false);

  const portfolio = PORTFOLIO_SNAPSHOTS[snapshotIdx];

  const handleSwitchSnapshot = (idx: number) => {
    const next = PORTFOLIO_SNAPSHOTS[idx];
    setSnapshotIdx(idx);
    setActivePrompt(next.aiDefaultQuestion);
    setActiveAnswer(next.aiDefaultAnswer);
  };

  const handleAskAi = (questionText: string) => {
    const clean = questionText.trim();
    if (!clean) return;
    setActivePrompt(clean);
    setActiveAnswer(generatePortfolioAiReply(clean, portfolio));
    setAiQuery('');
  };

  // Compute SVG Donut segments
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let cumulativePct = 0;

  return (
    <section
      id="portfolio-hub"
      aria-label="Consolidated Portfolio Diagnostic Hub"
      className="w-full bg-[#0A1410] text-[#F1F5F3] py-16 lg:py-20 border-b border-white/[0.06]"
    >
      <div className="max-w-[1220px] mx-auto px-6">
        {/* Header Split */}
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs font-medium text-[#4ADE80] mb-2">
              Portfolio Hub
            </div>
            <h2 className="font-display font-semibold text-3xl md:text-4xl tracking-tight text-white leading-tight">
              Your entire net worth.{' '}
              <span className="font-editorial font-medium text-[#D8E5DF]">
                Diagnosed
              </span>
              <br />
              in one dashboard.
            </h2>
          </div>

          <div className="max-w-sm space-y-3">
            <p className="text-xs md:text-sm text-[#9DB0A6] leading-relaxed">
              Import holdings from every broker and mutual fund account via PAN. Get a Diversification Score and red-flag alerts before they cost you.
            </p>
            <div className="inline-flex items-center p-1 rounded-lg bg-[#0F1E18] border border-white/[0.08]">
              {PORTFOLIO_SNAPSHOTS.map((snap, idx) => (
                <button
                  key={snap.id}
                  type="button"
                  onClick={() => handleSwitchSnapshot(idx)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    snapshotIdx === idx
                      ? 'bg-[#1D3B2E] text-white font-semibold'
                      : 'text-[#8FA499] hover:text-white'
                  }`}
                >
                  {idx === 0 ? 'PAN Consolidated' : 'US + Tech Sleeve'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 12-Col Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 7 Cols: Portfolio Overview Card */}
          <div className="lg:col-span-7 bg-[#0E1B16] rounded-2xl border border-[#1E352A] p-6 flex flex-col justify-between space-y-6">
            {/* Net Worth Top Row */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-white/[0.07]">
              <div>
                <div className="text-xs text-[#8FA499]">Total net worth</div>
                <div className="text-3xl font-display font-bold font-mono tabular-nums text-white mt-1">
                  {formatINR(portfolio.totalNetWorth)}
                </div>
                <div className="text-xs font-mono tabular-nums text-[#4ADE80] mt-1">
                  +{formatINR(portfolio.totalGain)} ({portfolio.totalGainPct}%) · XIRR{' '}
                  {portfolio.xirr}%
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenBrokerModal('broker')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#13251E] border border-white/10 text-xs font-mono text-[#CFE0D7] hover:border-[#22C55E] transition-colors cursor-pointer"
              >
                <span className="text-[#4ADE80]">Z</span>
                <span>·</span>
                <span className="text-[#60A5FA]">G</span>
                <span>·</span>
                <span className="text-[#FBBF24]">U</span>
                <span className="text-[#8FA499] font-sans ml-1">+ CAMS</span>
              </button>
            </div>

            {/* 3-Card Diagnostic Row: Allocation Donut / Diversification Score / Red Flags */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Allocation Donut */}
              <div className="rounded-xl bg-[#0A1410] border border-white/[0.06] p-4 flex flex-col justify-between">
                <div className="text-xs text-[#8FA499] mb-2">Allocation</div>
                <div className="flex items-center justify-center my-1">
                  <svg viewBox="0 0 112 112" className="w-24 h-24">
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      fill="none"
                      stroke="#172A21"
                      strokeWidth="12"
                    />
                    {portfolio.allocation.map((seg) => {
                      const dash = (seg.pct / 100) * circumference;
                      const offset = -(cumulativePct / 100) * circumference;
                      cumulativePct += seg.pct;
                      return (
                        <circle
                          key={seg.label}
                          cx="56"
                          cy="56"
                          r={radius}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="12"
                          strokeDasharray={`${dash} ${circumference}`}
                          strokeDashoffset={offset}
                          transform="rotate(-90 56 56)"
                        />
                      );
                    })}
                    <text
                      x="56"
                      y="60"
                      textAnchor="middle"
                      className="fill-white font-mono text-[11px] font-semibold"
                    >
                      {portfolio.assetCount} assets
                    </text>
                  </svg>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono text-[#B8C7BF] mt-2">
                  {portfolio.allocation.map((seg) => (
                    <div key={seg.label} className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="truncate">
                        {seg.label} {seg.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diversification Score */}
              <div className="rounded-xl bg-[#0A1410] border border-white/[0.06] p-4 flex flex-col justify-between items-center text-center">
                <div className="w-full text-left text-xs text-[#8FA499]">
                  Diversification score
                </div>
                <div className="relative my-2 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-24 h-24">
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#182D24"
                      strokeWidth="9"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={`${(portfolio.diversificationScore / 100) * 238.7} 238.7`}
                      transform="rotate(-90 50 50)"
                    />
                    <text
                      x="50"
                      y="52"
                      textAnchor="middle"
                      className="fill-white font-display font-bold text-[20px] font-mono"
                    >
                      {portfolio.diversificationScore}
                    </text>
                    <text
                      x="50"
                      y="66"
                      textAnchor="middle"
                      className="fill-[#7E9488] font-mono text-[10px]"
                    >
                      / 100
                    </text>
                  </svg>
                </div>
                <div className="text-[11px] text-[#CFE0D7] leading-snug">
                  {portfolio.diversificationNote}
                </div>
              </div>

              {/* Red Flags */}
              <div className="rounded-xl bg-[#0A1410] border border-white/[0.06] p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[#8FA499]">Red flags</span>
                  <span className="font-mono text-[#F87171] font-semibold">
                    {portfolio.redFlags.length} found
                  </span>
                </div>
                <div className="space-y-2.5">
                  {portfolio.redFlags.map((rf) => (
                    <div key={rf.title} className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-white leading-tight">
                          {rf.title}
                        </div>
                        <div className="text-[11px] text-[#7E9488]">
                          {rf.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Transactions List */}
            <div>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-[#8FA499] font-medium">Recent transactions</span>
                <button
                  type="button"
                  onClick={() => setShowAllTx((v) => !v)}
                  className="text-[#4ADE80] hover:underline cursor-pointer"
                >
                  {showAllTx ? 'Show compact' : 'View all'}
                </button>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {(showAllTx
                  ? portfolio.transactions
                  : portfolio.transactions.slice(0, 3)
                ).map((tx) => (
                  <div
                    key={tx.title}
                    className="py-2.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="font-medium text-white">{tx.title}</div>
                      <div className="text-[11px] text-[#7E9488]">{tx.meta}</div>
                    </div>
                    <div
                      className={`font-mono tabular-nums font-semibold ${
                        tx.positive ? 'text-[#4ADE80]' : 'text-[#E4EDE8]'
                      }`}
                    >
                      {tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Interactive Portfolio AI + MCP Connect Card */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            {/* Portfolio AI Interactive Q&A */}
            <div className="flex-1 bg-[#0E1B16] rounded-2xl border border-[#1E352A] p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-sm font-display font-semibold text-white">
                    <Sparkles className="w-4 h-4 text-[#4ADE80]" />
                    <span>Portfolio AI</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#7E9488]">
                    PAN Grounded
                  </span>
                </div>

                {/* User Question Bubble */}
                <div className="ml-auto max-w-[90%] rounded-xl bg-[#193327] border border-[#284D3C] px-4 py-3 text-xs text-white leading-relaxed">
                  {activePrompt}
                </div>

                {/* AI Diagnostic Answer */}
                <div className="rounded-xl bg-[#0A1410] border border-white/[0.07] px-4 py-3.5 text-xs text-[#D8E5DF] leading-relaxed">
                  {activeAnswer}
                </div>

                {/* Quick Suggestion Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAskAi('Show red flags')}
                    className="px-3 py-1.5 rounded-lg bg-[#13241D] border border-white/10 text-xs text-[#CFE0D7] hover:border-[#22C55E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Show red flags
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAskAi('Compare with NIFTY')}
                    className="px-3 py-1.5 rounded-lg bg-[#13241D] border border-white/10 text-xs text-[#CFE0D7] hover:border-[#22C55E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Compare with NIFTY
                  </button>
                </div>
              </div>

              {/* Prompt Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskAi(aiQuery);
                }}
                className="flex items-center gap-2 bg-[#0A1410] border border-[#233D30] focus-within:border-[#22C55E] rounded-xl px-3.5 py-2"
              >
                <label htmlFor="portfolio-ai-input" className="sr-only">
                  Ask about your portfolio
                </label>
                <input
                  id="portfolio-ai-input"
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask about your portfolio…"
                  className="w-full bg-transparent text-xs text-white placeholder-[#6D8277] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Send portfolio prompt"
                  className="w-7 h-7 rounded-lg bg-[#22C55E] text-[#05140C] flex items-center justify-center hover:bg-[#4ADE80] transition-colors shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Connect via MCP Card */}
            <div className="bg-[#0E1B16] rounded-2xl border border-[#1E352A] p-5 flex flex-col justify-between gap-3">
              <div>
                <div className="text-sm font-display font-semibold text-white">
                  Connect via MCP
                </div>
                <p className="text-xs text-[#8FA499] mt-1">
                  Analyse holdings and place US trades from Claude or ChatGPT.
                </p>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#CFE0D7]">
                  <span className="px-2.5 py-1 rounded bg-[#13251E] border border-white/10">
                    Claude
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#13251E] border border-white/10">
                    ChatGPT
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenMcpModal}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#4ADE80] hover:text-[#86EFAC] transition-colors cursor-pointer"
                >
                  <span>Setup</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
