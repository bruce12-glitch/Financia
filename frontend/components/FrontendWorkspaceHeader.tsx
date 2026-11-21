import React, { useState } from 'react';
import {
  ChevronDown,
  Globe,
  HelpCircle,
  LayoutGrid,
  LineChart,
  LogOut,
  Search,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { FinanciaLogo } from '../../landing/FinanciaLogo';
import { AuthUser } from '../utils/authEngine';

interface FrontendWorkspaceHeaderProps {
  currentUser: AuthUser;
  activeView?: 'frontend' | 'terminal';
  activeRegion: 'IN' | 'GLOBAL';
  savedAlertsCount: number;
  alertAudioEnabled: boolean;
  onToggleRegion: () => void;
  onJumpToSection: (sectionId: string) => void;
  onOpenTerminal?: () => void;
  onOpenFrontend?: () => void;
  onOpenSearch: () => void;
  onOpenAudioAlerts: () => void;
  onOpenShortcuts: () => void;
  onOpenAccountSecurity?: () => void;
  onSwitchToLanding: () => void;
  onSignOut: () => void;
}

export const FrontendWorkspaceHeader: React.FC<FrontendWorkspaceHeaderProps> = ({
  currentUser,
  activeView = 'frontend',
  activeRegion,
  savedAlertsCount,
  alertAudioEnabled,
  onToggleRegion,
  onJumpToSection,
  onOpenTerminal,
  onOpenFrontend,
  onOpenSearch,
  onOpenAudioAlerts,
  onOpenShortcuts,
  onOpenAccountSecurity,
  onSwitchToLanding,
  onSignOut,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <header
      data-testid="frontend-workspace-header"
      className="sticky top-0 z-30 w-full bg-[#050914]/95 backdrop-blur-xl border-b border-white/[0.1] text-white"
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Clean Single-Line Brand Wordmark */}
        <button
          type="button"
          onClick={onSwitchToLanding}
          className="inline-flex items-center cursor-pointer whitespace-nowrap shrink-0"
          aria-label="Financia Landing Home"
        >
          <FinanciaLogo variant="light" />
        </button>

        {/* Zone 2: Clean Single-Line Institutional Navigation Links */}
        <nav
          aria-label="Workspace Navigation"
          className="hidden lg:flex items-center gap-5 text-[13.5px] font-medium text-[#cbd5e1]"
        >
          <button
            type="button"
            data-testid="nav-workspace-overview"
            onClick={() => (onOpenFrontend ? onOpenFrontend() : onJumpToSection('workspace-overview'))}
            className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeView === 'frontend' ? 'text-white font-semibold' : 'hover:text-white'
            }`}
          >
            Workspace
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('mf-etf-screener')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Screener
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('market-summary')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Markets
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('sip-tools-workbench')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            SIP &amp; Planner
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('global-exchanges-globe')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Global Exchanges
          </button>
          <button
            type="button"
            data-testid="nav-open-terminal"
            onClick={() => (onOpenTerminal ? onOpenTerminal() : onJumpToSection('live-terminal'))}
            className={`h-8 px-3 rounded-[8px] border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeView === 'terminal'
                ? 'bg-[#2563eb] border-[#2563eb] text-white'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.14] text-[#38bdf8] hover:text-white'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Fund Terminal</span>
          </button>
        </nav>

        {/* Zone 3: Crisp Architectural Utility & Account Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="h-8.5 px-2.5 rounded-[8px] bg-white/[0.05] hover:bg-white/[0.11] border border-white/[0.11] text-xs text-[#e2e8f0] hover:text-white inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden md:inline text-[10px] font-mono text-[#94a3b8] border border-white/[0.12] px-1.5 py-0.5 rounded-[4px]">
              Ctrl+K
            </kbd>
          </button>

          <button
            type="button"
            onClick={onToggleRegion}
            aria-label={`Active market region: ${activeRegion}`}
            className="h-8.5 px-2.5 rounded-[8px] bg-white/[0.05] hover:bg-white/[0.11] border border-white/[0.11] text-xs font-mono font-medium text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Globe className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>{activeRegion}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAudioAlerts}
            data-testid="header-audio-alerts-btn"
            aria-label="Configure price alert audio notifications"
            title={
              alertAudioEnabled
                ? 'Price alert audio active — click to configure priority sounds'
                : 'Price alert audio muted — click to configure'
            }
            className={`h-8.5 px-2.5 rounded-[8px] border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              alertAudioEnabled
                ? 'bg-white/[0.05] hover:bg-white/[0.11] border-white/[0.11] text-[#e2e8f0] hover:text-white'
                : 'bg-white/[0.03] hover:bg-white/[0.09] border-white/[0.08] text-[#94a3b8]'
            }`}
          >
            {alertAudioEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#38bdf8]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#94a3b8]" />
            )}
            <span className="hidden md:inline">Alerts</span>
            {savedAlertsCount > 0 && (
              <span className="font-mono text-[11px] text-[#38bdf8] tabular-nums">
                {savedAlertsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Open keyboard shortcuts"
            className="h-8.5 w-8.5 rounded-[8px] bg-white/[0.05] hover:bg-white/[0.11] border border-white/[0.11] text-[#cbd5e1] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              aria-expanded={accountMenuOpen}
              aria-label="Open signed-in account menu"
              className="h-8.5 pl-1.5 pr-2.5 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="w-6 h-6 rounded-[6px] bg-white/18 text-white text-[10px] font-semibold flex items-center justify-center">
                {currentUser.initials}
              </span>
              <span className="hidden sm:inline max-w-[130px] truncate">{currentUser.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/80" />
            </button>

            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-[12px] bg-[#0b1120] border border-white/[0.12] shadow-2xl p-3 text-left z-40"
              >
                <div className="pb-2.5 mb-2 border-b border-white/[0.1]">
                  <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
                  <div className="text-[11px] text-[#94a3b8] truncate">{currentUser.email}</div>
                  <div className="mt-1 flex items-center justify-between text-[10.5px] text-[#38bdf8]">
                    <span className="uppercase font-mono">{currentUser.provider} auth</span>
                    <span className="font-mono tabular-nums">{savedAlertsCount} alerts</span>
                  </div>
                </div>
                {onOpenAccountSecurity && (
                  <button
                    type="button"
                    data-testid="menu-account-security-btn"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onOpenAccountSecurity();
                    }}
                    className="w-full mb-1 px-2.5 py-2 rounded-[8px] text-xs font-medium text-[#cbd5e1] hover:bg-white/[0.08] inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#34d399]" />
                    <span>Account security &amp; audit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onSwitchToLanding();
                  }}
                  className="w-full mb-1 px-2.5 py-2 rounded-[8px] text-xs font-medium text-[#cbd5e1] hover:bg-white/[0.08] inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Landing overview</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full px-2.5 py-2 rounded-[8px] text-xs font-medium text-[#fb7185] hover:bg-[#fb7185]/12 inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
