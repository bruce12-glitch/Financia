import React, { useState } from 'react';
import {
  ChevronDown,
  Globe,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  User,
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

export const EarthHeroSection: React.FC<EarthHeroSectionProps> = ({
  onOpenSearch,
  onOpenSignup,
  onOpenLogin,
  onEnterFrontend,
  onOpenShortcuts,
  onJumpToSection,
  onSelectHeroTicker,
  liveFeedActive = true,
  activeRegion,
  onToggleRegion,
  currentUser = null,
  onSignOut,
  savedAlertsCount = 0,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <section
      aria-label="Where the world does markets — Hero"
      className="relative w-full min-h-[760px] lg:min-h-screen bg-[#000000] text-white overflow-hidden flex flex-col"
    >
      {/* Full-Bleed Earth Horizon Video Background shifted lower so central sunrise spark shines below CTA */}
      <div className="absolute inset-x-0 bottom-0 top-12 md:top-16 z-0 overflow-hidden bg-[#000000]">
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

        {/* Seamless top feather so shifted video top edge blends invisibly into pure black sky */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#000000] via-[#000000]/65 to-transparent"
        />

        {/* Subtle bottom scrim keeping docked search bar crisp over night-side city lights */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
        />
      </div>

      {/* Top Navigation Bar following strict 3-zone contract */}
      <header className="relative z-20 w-full px-6 md:px-10 py-4 shrink-0">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#"
            className="whitespace-nowrap shrink-0"
            aria-label="Financia Home"
          >
            <FinanciaLogo variant="light" />
          </a>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-[#D1D4DC]"
          >
            <button
              type="button"
              onClick={() => onJumpToSection('live-terminal')}
              className="text-white font-semibold hover:text-[#60A5FA] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Stock Analysis
            </button>
            <button
              type="button"
              onClick={() => onJumpToSection('supercharts-section')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Supercharts
            </button>
            <button
              type="button"
              onClick={() => onJumpToSection('market-summary')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Markets
            </button>
            <button
              type="button"
              onClick={() => onJumpToSection('global-exchanges-globe')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Exchanges 3D
            </button>
            <button
              type="button"
              onClick={() => onJumpToSection('forex-section')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Forex
            </button>
            <button
              type="button"
              onClick={() => onJumpToSection('economy-section')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Economy
            </button>
          </nav>

          {/* Zone 3: Single Primary Action CTA / Authenticated Account Control */}
          <div className="relative flex items-center shrink-0">
            {currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-label="Open signed-in account menu"
                  className="px-3 py-1.5 rounded-full bg-white/12 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-full bg-[#2962FF] text-white text-[10px] font-bold flex items-center justify-center">
                    {currentUser.initials}
                  </span>
                  <span className="max-w-[110px] truncate">{currentUser.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#B2B5BE]" />
                </button>

                {accountMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 rounded-xl bg-[#131722] border border-[#2A2E39] shadow-2xl p-3 text-left z-30"
                  >
                    <div className="pb-2.5 mb-2 border-b border-[#2A2E39]">
                      <div className="text-xs font-bold text-white truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-[11px] text-[#9598A1] truncate">
                        {currentUser.email}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-[#60A5FA]">
                        <span className="uppercase font-mono">{currentUser.provider} auth</span>
                        <span>{savedAlertsCount} alerts</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onSignOut?.();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#FCA5A5] hover:bg-[#F23645]/15 inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenSignup}
                className="px-4 py-2 rounded-full bg-white text-[#131722] text-xs md:text-sm font-semibold hover:bg-[#F0F3FA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Get started
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Upper Black-Sky Text Holder positioned high so the central Earth sunrise spark is fully visible below */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-3 md:pt-5 pb-2 mb-auto flex flex-col items-center text-center">
        <h1
          className="font-display font-bold text-white tracking-[-0.02em] mb-2.5"
          style={{
            fontSize: 'clamp(1.95rem, 3.5vw, 3.2rem)',
            lineHeight: 1.08,
            textWrap: 'balance',
          }}
        >
          Where the world does markets
        </h1>
        <p className="text-[#D1D4DC] text-sm md:text-[15px] leading-relaxed max-w-2xl mb-5 font-normal">
          Real-time charts, SEC filing synthesis, and live market intelligence for 100M+ investors.
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
            className="px-6 py-2.5 rounded-xl bg-white text-[#131722] font-semibold text-sm hover:bg-[#F0F3FA] transition-colors shadow-xl cursor-pointer whitespace-nowrap shrink-0"
          >
            {currentUser ? 'Open Frontend & 3D World' : 'Get started for free'}
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('supercharts-section')}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/18 border border-white/20 text-white font-medium text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Explore Supercharts
          </button>
        </div>
        <p className="text-[11px] text-[#E5E7EB] mt-2.5 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          {currentUser
            ? `Signed in as ${currentUser.name} · Access Live Terminal & 3D Exchanges`
            : '$0 forever · 150+ global exchanges · SEC EDGAR & crypto telemetry'}
        </p>
      </div>

      {/* Subtle Downward Scroll Chevron Above Docked Horizon Bar */}
      <div className="relative z-20 flex justify-center pb-1">
        <button
          type="button"
          onClick={() => onJumpToSection('supercharts-section')}
          aria-label="Scroll to Supercharts and Stock Analysis"
          className="p-1.5 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Iconic Page-1 Docked Horizon Search Bar (Financia Layout) */}
      <div className="relative z-20 w-full px-4 md:px-10 pb-3.5 pt-2 shrink-0">
        <div className="max-w-[1320px] mx-auto flex items-center justify-between gap-3 md:gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onJumpToSection('live-terminal')}
              aria-label="Jump to Stock Analysis Terminal"
              className="p-2 rounded-full text-[#D1D4DC] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="hidden sm:inline-flex items-center" aria-hidden="true">
              <FinanciaLogo variant="light" showWordmark={false} />
            </span>
          </div>

          {/* Wide Pill Search Launcher */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex-1 max-w-[780px] h-11 px-4 rounded-full bg-[#1E222D]/85 hover:bg-[#2A2E39]/90 border border-white/15 backdrop-blur-md flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-2.5 text-sm text-[#B2B5BE] truncate">
              <Search className="w-4 h-4 text-[#9598A1] shrink-0" />
              <span className="truncate">Search</span>
            </span>
            <span className="hidden sm:inline-block text-xs font-mono text-[#787B86] shrink-0">
              Ctrl+K
            </span>
          </button>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleRegion}
              aria-label={`Active market region: ${activeRegion}`}
              className="px-2.5 py-2 rounded-full text-xs font-semibold text-[#D1D4DC] hover:text-white hover:bg-white/10 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-4 h-4" />
              <span>{activeRegion}</span>
            </button>

            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                title="Keyboard shortcuts (?)"
                aria-label="Open keyboard shortcuts"
                className="p-2 rounded-full text-[#D1D4DC] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (currentUser) {
                  setAccountMenuOpen((prev) => !prev);
                } else {
                  (onOpenLogin || onOpenSignup)();
                }
              }}
              aria-label={currentUser ? `Account: ${currentUser.name}` : 'Log in'}
              title={currentUser ? currentUser.name : 'Log in'}
              className="p-2 rounded-full text-[#D1D4DC] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {currentUser ? (
                <span className="w-5 h-5 rounded-full bg-[#2962FF] text-white text-[10px] font-bold flex items-center justify-center">
                  {currentUser.initials}
                </span>
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>

            {!currentUser && (
              <button
                type="button"
                onClick={onOpenSignup}
                className="hidden sm:inline-flex px-4 py-2 rounded-full bg-white text-[#131722] text-xs font-semibold hover:bg-[#F0F3FA] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Get started
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Continuous Scrolling Market Data Ticker Strip */}
      <HeroTickerMarquee
        onSelectTicker={onSelectHeroTicker}
        liveFeedActive={liveFeedActive}
      />
    </section>
  );
};
