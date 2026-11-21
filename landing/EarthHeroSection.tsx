import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  LogOut,
  Search,
} from 'lucide-react';
import { FinanciaLogo } from './FinanciaLogo';
import { HeroTickerMarquee } from './HeroTickerMarquee';
import { AuthUser } from '../frontend/utils/authEngine';

interface EarthHeroSectionProps {
  onOpenSearch: () => void;
  onOpenSignup: () => void;
  onOpenLogin?: () => void;
  onEnterFrontend?: () => void;
  onOpenShortcuts?: () => void;
  onJumpToSection: (sectionId: string) => void;
  onSelectHeroTicker?: (lookupSymbol: string) => void;
  liveFeedActive?: boolean;
  activeRegion: string;
  onToggleRegion: () => void;
  currentUser?: AuthUser | null;
  onSignOut?: () => void;
  savedAlertsCount?: number;
}

const HERO_QUICK_JUMPS = [
  { label: 'Mutual Funds', target: 'live-nav-explorer' },
  { label: 'ETF Screener', target: 'live-nav-explorer' },
  { label: 'Treasury Yields', target: 'macro-bullion-desk' },
  { label: 'Spot Gold', target: 'macro-bullion-desk' },
] as const;

export const EarthHeroSection: React.FC<EarthHeroSectionProps> = ({
  onOpenSearch,
  onOpenSignup,
  onOpenLogin,
  onEnterFrontend,
  onJumpToSection,
  onSelectHeroTicker,
  liveFeedActive = true,
  currentUser = null,
  onSignOut,
  savedAlertsCount = 0,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <div className="w-full flex flex-col">
      <section
        aria-label="Financia — Mutual Fund, ETF, Gold and Bond Research"
        className="hero-font-root relative w-full min-h-[600px] lg:h-[min(100svh,760px)] bg-[#040711] text-white overflow-hidden flex flex-col"
      >
        {/* Full-Bleed Signature Earth Horizon Video & Poster Backdrop */}
        <div className="absolute inset-x-0 bottom-0 top-14 z-0 overflow-hidden bg-[#040711]">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/assets/earth-hero-poster.jpg"
            aria-hidden="true"
            className="w-full h-full object-cover object-bottom opacity-95"
          >
            <source src="/assets/earth-hero-h264.mp4" type="video/mp4" />
            <source
              src="/assets/aistudio/earth.hvc1.8b593d5a601c93b15aa1_08356839.mp4"
              type="video/mp4"
            />
          </video>

          {/* Crisp Obsidian Top Feather */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#040711] via-[#040711]/88 to-transparent"
          />

          {/* Measured Atmospheric Scrim preserving the exact palette and contrast */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 68% 46% at 50% 26%, rgba(4, 7, 17, 0.82) 0%, rgba(4, 7, 17, 0.4) 58%, transparent 100%), radial-gradient(ellipse 54% 30% at 50% 6%, rgba(37, 99, 235, 0.16) 0%, transparent 72%), linear-gradient(180deg, rgba(4, 7, 17, 0.38) 0%, transparent 48%, rgba(4, 7, 17, 0.72) 100%)',
            }}
          />
        </div>

        {/* Strict 3-Zone Top Bar */}
        <header className="relative z-30 w-full bg-[#040711]/72 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 md:px-10 py-3 shrink-0">
          <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-8">
            <a
              href="#"
              className="whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] rounded-md"
              aria-label="Financia Home"
            >
              <FinanciaLogo variant="light" size="md" />
            </a>

            <nav
              aria-label="Primary Navigation"
              className="hidden lg:flex items-center gap-8 hero-button-sm text-[#cbd5e1]"
            >
              <button
                type="button"
                onClick={() => onJumpToSection('live-nav-explorer')}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Funds &amp; ETFs
              </button>
              <button
                type="button"
                onClick={() => onJumpToSection('macro-bullion-desk')}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Yields &amp; Gold
              </button>
              <button
                type="button"
                onClick={() => onJumpToSection('frontend-access-gate')}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Workspace
              </button>
              <button
                type="button"
                onClick={() => onJumpToSection('live-terminal')}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Terminal
              </button>
            </nav>

            <div className="relative flex items-center gap-4 shrink-0">
              {currentUser ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    aria-expanded={accountMenuOpen}
                    aria-label="Open signed-in account menu"
                    className="h-9 px-3 rounded-full bg-white/[0.1] hover:bg-white/[0.16] border border-white/[0.18] text-white hero-button-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#2563eb] text-white hero-micro-cap flex items-center justify-center">
                      {currentUser.initials}
                    </span>
                    <span className="max-w-[110px] truncate">{currentUser.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#cbd5e1]" />
                  </button>

                  {accountMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-60 rounded-[12px] bg-[#0b1120] border border-white/[0.12] shadow-2xl p-3 text-left z-40"
                    >
                      <div className="pb-2.5 mb-2 border-b border-white/[0.1]">
                        <div className="hero-caption text-white truncate">
                          {currentUser.name}
                        </div>
                        <div className="hero-micro text-[#94a3b8] truncate">
                          {currentUser.email}
                        </div>
                        <div className="mt-1 flex items-center justify-between hero-micro text-[#38bdf8]">
                          <span className="uppercase">{currentUser.provider}</span>
                          <span>{savedAlertsCount} alerts</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onSignOut?.();
                        }}
                        className="w-full px-2.5 py-2 rounded-[8px] hero-caption text-[#fb7185] hover:bg-[#fb7185]/10 inline-flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onOpenLogin || onOpenSignup}
                    className="hidden sm:inline-flex hero-button-sm text-[#cbd5e1] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={onOpenSignup}
                    className="h-9 px-4 rounded-full bg-white hover:bg-[#e2e8f0] text-[#040711] hero-button-sm inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Start free</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Compact Full-Viewport Hero Content with Exact Sohne / SF Pro Typography */}
        <div className="relative z-20 max-w-[880px] w-full mx-auto px-4 sm:px-6 md:px-10 pt-8 sm:pt-10 lg:pt-12 pb-5 my-auto text-center">
          <div className="hero-caption text-[#93c5fd] mb-3.5">
            <span>Mutual Funds</span>
            <span aria-hidden="true" className="mx-2 text-white/30">
              ·
            </span>
            <span>ETFs</span>
            <span aria-hidden="true" className="mx-2 text-white/30">
              ·
            </span>
            <span>Spot Gold</span>
            <span aria-hidden="true" className="mx-2 text-white/30">
              ·
            </span>
            <span className="whitespace-nowrap">Sovereign Yields</span>
          </div>

          <h1
            className="hero-display-xxl mb-4 mx-auto max-w-[740px]"
            style={{ textWrap: 'balance' }}
          >
            <span className="text-white drop-shadow-[0_8px_32px_rgba(4,7,17,0.85)]">
              Clear research for funds,
            </span>{' '}
            <span className="bg-gradient-to-b from-[#ffffff] via-[#e0f2fe] to-[#93c5fd] bg-clip-text text-transparent drop-shadow-[0_6px_26px_rgba(4,7,17,0.72)]">
              ETFs, gold, and bonds
            </span>
          </h1>

          <p className="hero-body-lg text-[#cbd5e1] max-w-[560px] mx-auto mb-6 drop-shadow-[0_2px_16px_rgba(4,7,17,0.92)]">
            Track daily NAVs, compare expense ratios and sector holdings side by side, follow spot gold, and check live bond yields in one place.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentUser && onEnterFrontend) {
                  onEnterFrontend();
                } else {
                  onOpenSignup();
                }
              }}
              className="h-[44px] px-6 rounded-full bg-white hover:bg-[#f1f5f9] active:bg-[#e2e8f0] text-[#040711] hero-button-md inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-all shadow-[0_14px_38px_rgba(56,189,248,0.22),0_2px_12px_rgba(4,7,17,0.6)]"
            >
              <span>{currentUser ? 'Open Workspace' : 'Create free account'}</span>
              <ArrowRight className="w-4 h-4 text-[#040711]" />
            </button>

            <button
              type="button"
              onClick={() => onJumpToSection('live-nav-explorer')}
              className="h-[44px] px-6 rounded-full bg-[#091124]/70 hover:bg-[#101d3b]/85 border border-white/[0.2] hover:border-[#38bdf8]/50 backdrop-blur-md text-white hero-button-md inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-all"
            >
              <span>Explore funds</span>
              <ArrowRight className="w-4 h-4 text-[#38bdf8]" />
            </button>
          </div>
        </div>

        {/* Compact Search Bar Floating Above Earth's Horizon */}
        <div className="relative z-20 max-w-[780px] w-full mx-auto px-4 sm:px-6 pb-5">
          <div className="rounded-[14px] bg-[#060c1b]/84 backdrop-blur-xl border border-white/[0.13] shadow-[0_24px_60px_rgba(2,5,16,0.78)] p-2.5">
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full h-11 px-4 rounded-[9px] bg-white/[0.045] hover:bg-white/[0.09] border border-white/[0.1] hover:border-[#38bdf8]/45 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5 hero-body-md text-[#e2e8f0] truncate">
                <Search className="w-4 h-4 text-[#38bdf8] shrink-0" />
                <span className="truncate">
                  Search any mutual fund, ETF, ISIN, or gold fund...
                </span>
              </span>
              <span className="hero-micro text-[#93c5fd] bg-white/[0.07] border border-white/[0.1] px-2 py-0.5 rounded shrink-0">
                Ctrl+K
              </span>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 px-1.5">
              <span className="hero-micro text-[#94a3b8]">
                Quick links:
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {HERO_QUICK_JUMPS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onJumpToSection(item.target)}
                    className="inline-flex items-center gap-1 hero-caption text-[#e2e8f0] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight className="w-3 h-3 text-[#38bdf8]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seamless Obsidian Real-Data Live Ticker Tape */}
        <HeroTickerMarquee
          onSelectTicker={onSelectHeroTicker}
          liveFeedActive={liveFeedActive}
        />
      </section>
    </div>
  );
};
