import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Lock,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  EQUITY_UNIVERSE,
  EquityAsset,
  HERO_POPULAR_TICKERS,
  MARKET_RIBBON_ITEMS,
} from '../data/indianMarketData';
import { formatIndianPrice, searchEquities } from '../utils/screenerEngine';

interface HeroSectionProps {
  onSelectAsset: (symbol: string) => void;
  onScrollToSection: (sectionId: string) => void;
  onOpenBrokerModal: (defaultTab?: 'broker' | 'account') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSelectAsset,
  onScrollToSection,
  onOpenBrokerModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const suggestions: EquityAsset[] = useMemo(
    () => searchEquities(searchQuery, EQUITY_UNIVERSE).slice(0, 5),
    [searchQuery]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      onSelectAsset(suggestions[0].symbol);
      setSearchQuery('');
      setSearchFocused(false);
    }
  };

  const handlePopularClick = (item: string) => {
    if (item === 'Parag Parikh Flexi Cap') {
      onScrollToSection('screeners');
      return;
    }
    onSelectAsset(item);
  };

  return (
    <div className="bg-[#0A1410] text-[#F1F5F3]">
      {/* Strict 3-Zone Top Bar Header */}
      <header className="sticky top-0 z-40 w-full bg-[#0A1410]/95 backdrop-blur-md border-b border-white/[0.07]">
        <div className="max-w-[1220px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#"
            className="inline-flex items-center gap-2 text-lg font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              className="shrink-0"
            >
              <rect x="2" y="10" width="3.5" height="8" rx="1" fill="#22C55E" />
              <rect x="8.25" y="6" width="3.5" height="12" rx="1" fill="#4ADE80" />
              <rect x="14.5" y="2" width="3.5" height="16" rx="1" fill="#FFFFFF" />
            </svg>
            <span>financia</span>
          </a>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-xs font-medium text-[#A8B8B0]"
          >
            <a
              href="#market-summary"
              className="text-white hover:text-[#4ADE80] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Markets
            </a>
            <a
              href="#screeners"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Screeners
            </a>
            <a
              href="#scorecards"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Scorecards
            </a>
            <a
              href="#portfolio-hub"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Portfolio
            </a>
            <a
              href="#stock-deals"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Stock Deals
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onOpenBrokerModal('account')}
              className="px-4 py-2 rounded-lg bg-[#22C55E] text-[#05140C] font-semibold text-xs hover:bg-[#4ADE80] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Canvas */}
      <section
        aria-label="Financia Hero Research Terminal"
        className="relative overflow-hidden border-b border-white/[0.06]"
        style={{
          background:
            'radial-gradient(ellipse 65% 70% at 74% 38%, rgba(34, 197, 94, 0.14) 0%, rgba(16, 48, 34, 0.25) 45%, rgba(10, 20, 16, 1) 82%)',
        }}
      >
        <div className="max-w-[1220px] mx-auto px-6 pt-12 pb-14 lg:pt-16 lg:pb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#4ADE80]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Research-first investing for India</span>
            </div>

            <h1
              className="font-display font-semibold text-white tracking-tight"
              style={{
                fontSize: 'clamp(2.5rem, 4.6vw, 4.05rem)',
                lineHeight: 1.04,
                textWrap: 'balance',
              }}
            >
              Research first.
              <br />
              <span className="font-editorial text-[#E4EDE8] font-medium">
                Then invest.
              </span>
            </h1>

            <p className="text-[#9DB0A6] text-sm md:text-base leading-relaxed max-w-lg">
              Screen 5,000+ Indian stocks, turn raw filings into clear scorecards, and execute across Indian &amp; US markets — one platform, built for retail investors.
            </p>

            {/* Interactive Search Bar with Live Ticker Suggestions */}
            <div className="relative max-w-lg">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center bg-[#0F1E18] border border-[#233D30] focus-within:border-[#22C55E] rounded-xl px-3.5 py-2.5 gap-2.5 transition-colors"
              >
                <Search className="w-4 h-4 text-[#738A7E] shrink-0" />
                <label htmlFor="hero-stock-search" className="sr-only">
                  Search stocks, mutual funds, ETFs, or indices
                </label>
                <input
                  id="hero-stock-search"
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => window.setTimeout(() => setSearchFocused(false), 180)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stocks, mutual funds, ETFs, indices…"
                  className="w-full bg-transparent text-sm text-white placeholder-[#6D8277] focus:outline-none"
                />
                <span className="hidden sm:inline-flex items-center justify-center px-2 py-0.5 rounded bg-[#162921] border border-white/10 font-mono text-[11px] text-[#9DB0A6] shrink-0">
                  /
                </span>
              </form>

              {searchFocused && (
                <div className="absolute left-0 right-0 mt-1.5 rounded-xl bg-[#0F1E18] border border-[#233D30] shadow-2xl overflow-hidden z-30">
                  {suggestions.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[#8FA499]">
                      No exact match found. Try HDFCBANK, RELIANCE, COALINDIA, or NVDA.
                    </div>
                  ) : (
                    suggestions.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onMouseDown={() => {
                          onSelectAsset(item.symbol);
                          setSearchQuery('');
                          setSearchFocused(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#172C23] transition-colors border-b last:border-b-0 border-white/[0.05] cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-[#7F9489]">
                            {item.exchange}: {item.symbol} · {item.sector}
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-xs text-white">
                            {formatIndianPrice(item.price, item.currency)}
                          </div>
                          <div
                            className={`text-[11px] ${
                              item.changePct >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'
                            }`}
                          >
                            {item.changePct >= 0 ? '+' : ''}
                            {item.changePct.toFixed(2)}%
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Popular Quick Tickers */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#7E9488]">
                <span>Popular:</span>
                {HERO_POPULAR_TICKERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handlePopularClick(item)}
                    className="px-2.5 py-1 rounded-md bg-[#12221B] border border-white/[0.08] text-[#CFE0D7] hover:text-white hover:border-[#22C55E]/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Dual CTA Pair */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onScrollToSection('market-summary')}
                className="px-5 py-2.5 rounded-lg bg-[#22C55E] text-[#05140C] font-semibold text-xs md:text-sm hover:bg-[#4ADE80] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start Researching
              </button>
              <button
                type="button"
                onClick={() => onOpenBrokerModal('broker')}
                className="px-5 py-2.5 rounded-lg bg-[#12221B] text-[#E6F0EB] border border-white/15 font-medium text-xs md:text-sm hover:bg-[#192E25] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Link your Broker</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#4ADE80]" />
              </button>
            </div>
          </div>

          {/* Right Hero Column: Interactive Glass Mobile Telemetry Preview & Floating Widgets */}
          <div className="lg:col-span-6 relative flex items-center justify-center pt-4 lg:pt-0">
            <div className="relative w-full max-w-[470px] sm:pt-6 sm:pb-8">
              {/* Floating Top-Right Market Mood Widget */}
              <button
                type="button"
                onClick={() => onScrollToSection('market-summary')}
                className="hidden sm:block absolute right-0 top-0 z-20 w-44 rounded-xl bg-[#102019]/95 backdrop-blur-md border border-white/15 p-3 text-left shadow-xl hover:border-[#22C55E]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] text-[#9DB0A6] mb-1">
                  <span>Market Mood</span>
                  <span className="font-mono font-bold text-white">62</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#1C3328] overflow-hidden flex">
                  <div className="w-1/4 bg-[#EF4444]" />
                  <div className="w-1/4 bg-[#F59E0B]" />
                  <div className="w-1/4 bg-[#84CC16]" />
                  <div className="w-1/4 bg-[#22C55E]/35" />
                </div>
                <div className="mt-1.5 text-[11px] font-medium text-[#FBBF24]">
                  Greed zone
                </div>
              </button>

              {/* Tilted Sleek Device Mockup */}
              <div className="mx-auto sm:ml-24 sm:mr-6 w-full max-w-[305px] rounded-[28px] bg-[#0E1B16] border border-white/15 p-4 shadow-2xl transform lg:rotate-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#7F9489] mb-3 px-1">
                  <span>9:41</span>
                  <span className="inline-block w-14 h-3 rounded-full bg-[#070F0C]" />
                  <span>NSE · LIVE</span>
                </div>

                <div className="rounded-2xl bg-[#0A1410] border border-white/[0.08] p-4 space-y-4">
                  <div>
                    <div className="text-[11px] text-[#8FA499]">Net worth</div>
                    <div className="text-xl font-display font-bold text-white font-mono tabular-nums mt-0.5">
                      ₹48,62,310
                    </div>
                    <div className="text-[11px] text-[#4ADE80] font-mono tabular-nums">
                      +19.2% all time
                    </div>
                  </div>

                  {/* Mini Trend Line SVG */}
                  <svg
                    viewBox="0 0 240 52"
                    className="w-full h-12"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="heroPhoneGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 40 Q32 34, 60 36 T120 26 T180 20 T240 8 L240 52 L0 52 Z"
                      fill="url(#heroPhoneGrad)"
                    />
                    <path
                      d="M0 40 Q32 34, 60 36 T120 26 T180 20 T240 8"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Interactive Mini Holdings List */}
                  <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                    {[
                      { symbol: 'HDFCBANK', delta: '+0.84%', up: true },
                      { symbol: 'TCS', delta: '+0.47%', up: true },
                      { symbol: 'INFY', delta: '−0.66%', up: false },
                    ].map((row) => (
                      <button
                        key={row.symbol}
                        type="button"
                        onClick={() => onSelectAsset(row.symbol)}
                        className="w-full flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        <span className="font-mono font-medium text-[#D8E5DF]">
                          {row.symbol}
                        </span>
                        <span
                          className={`font-mono tabular-nums font-medium ${
                            row.up ? 'text-[#4ADE80]' : 'text-[#F87171]'
                          }`}
                        >
                          {row.delta}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Portfolio Diagnostic Banner */}
                  <button
                    type="button"
                    onClick={() => onScrollToSection('portfolio-hub')}
                    className="w-full rounded-xl bg-[#12221B] border border-white/[0.08] p-2.5 text-left hover:border-[#22C55E]/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px] font-medium text-white">
                      <span>Diversification</span>
                      <span className="font-mono text-[#4ADE80]">72/100</span>
                    </div>
                    <div className="text-[11px] text-[#F59E0B] mt-0.5">
                      3 red flags need review
                    </div>
                  </button>
                </div>
              </div>

              {/* Floating Bottom-Left Stock Callout Card */}
              <button
                type="button"
                onClick={() => onSelectAsset('RELIANCE')}
                className="hidden sm:flex absolute left-0 bottom-0 z-20 items-center gap-3 rounded-xl bg-[#102019]/95 backdrop-blur-md border border-white/15 px-3.5 py-2.5 shadow-xl hover:border-[#22C55E]/50 transition-colors cursor-pointer"
              >
                <span className="w-8 h-8 rounded-lg bg-[#1A3327] border border-[#22C55E]/30 flex items-center justify-center font-mono text-[11px] font-bold text-[#4ADE80]">
                  RIL
                </span>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">RELIANCE</div>
                  <div className="text-[11px] font-mono tabular-nums text-[#CFE0D7]">
                    ₹2,948.60{' '}
                    <span className="text-[#4ADE80] ml-1">+1.24%</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Hero Bottom Institutional Trust Strip */}
        <div className="max-w-[1220px] mx-auto px-6 pb-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#7E9488] border-t border-white/[0.06] pt-4">
          <span>
            Stocks, mutual funds, ETFs, US stocks, gold &amp; FDs — with institutional-grade data and clear signals.
          </span>
          <div className="flex flex-wrap items-center gap-4 text-[#A8B8B0]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Data by S&amp;P Global</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Bank-grade encryption</span>
            </span>
          </div>
        </div>
      </section>

      {/* Live Market Ticker Ribbon */}
      <div
        aria-label="Live Indian Market Indices and Movers"
        className="w-full bg-[#070E0B] border-b border-white/[0.08] overflow-x-auto"
      >
        <div className="max-w-[1220px] mx-auto px-6 py-2.5 flex items-center justify-between gap-6 min-w-max">
          {MARKET_RIBBON_ITEMS.map((item) => {
            const positive = item.changePct >= 0;
            return (
              <button
                key={item.symbol}
                type="button"
                onClick={() => item.targetTicker && onSelectAsset(item.targetTicker)}
                className="inline-flex items-center gap-2 text-xs font-mono tabular-nums hover:opacity-85 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="text-[#8FA499] font-medium">{item.symbol}</span>
                <span className="text-white font-semibold">{item.price}</span>
                <span className={positive ? 'text-[#4ADE80]' : 'text-[#F87171]'}>
                  {positive ? '+' : ''}
                  {item.changePct.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
