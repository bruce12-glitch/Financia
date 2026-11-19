import React, { useState } from 'react';
import {
  ChevronDown,
  Globe,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Search,
} from 'lucide-react';
import { FinanciaLogo } from '../../landing/FinanciaLogo';
import { AuthUser } from '../utils/authEngine';

interface FrontendWorkspaceHeaderProps {
  currentUser: AuthUser;
  activeRegion: 'IN' | 'GLOBAL';
  savedAlertsCount: number;
  onToggleRegion: () => void;
  onJumpToSection: (sectionId: string) => void;
  onOpenSearch: () => void;
  onOpenShortcuts: () => void;
  onSwitchToLanding: () => void;
  onSignOut: () => void;
}

export const FrontendWorkspaceHeader: React.FC<FrontendWorkspaceHeaderProps> = ({
  currentUser,
  activeRegion,
  savedAlertsCount,
  onToggleRegion,
  onJumpToSection,
  onOpenSearch,
  onOpenShortcuts,
  onSwitchToLanding,
  onSignOut,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <header
      data-testid="frontend-workspace-header"
      className="sticky top-0 z-30 w-full bg-[#0B0E14]/95 border-b border-[#1E222D] text-white"
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onSwitchToLanding}
            className="inline-flex items-center gap-2 cursor-pointer"
            aria-label="Financia Landing Home"
          >
            <FinanciaLogo variant="light" />
          </button>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161B26] border border-[#2A2E39] text-[11px] font-semibold text-[#60A5FA]">
            <LayoutGrid className="w-3 h-3" />
            <span>4-Pillar Workspace</span>
          </span>
        </div>

        <nav
          aria-label="Frontend Workspace Navigation"
          className="hidden lg:flex items-center gap-5 text-xs font-medium text-[#B2B5BE]"
        >
          <button
            type="button"
            onClick={() => onJumpToSection('live-terminal')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Funds &amp; Gold
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('market-summary')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Market Summary
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('markets')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            MF, Debt &amp; Policy
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('global-exchanges-globe')}
            className="text-[#60A5FA] font-semibold hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            3D Market Hubs
          </button>
          <button
            type="button"
            onClick={onSwitchToLanding}
            className="text-[#9598A1] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Landing
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="h-9 px-3 rounded-lg bg-[#161B26] hover:bg-[#1E2533] border border-[#2A2E39] text-xs text-[#B2B5BE] hover:text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden md:inline text-[10px] font-mono text-[#787B86] border border-[#2A2E39] px-1 rounded">
              Ctrl+K
            </kbd>
          </button>

          <button
            type="button"
            onClick={onToggleRegion}
            aria-label={`Active market region: ${activeRegion}`}
            className="h-9 px-2.5 rounded-lg bg-[#161B26] hover:bg-[#1E2533] border border-[#2A2E39] text-xs font-semibold text-[#D1D4DC] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>{activeRegion}</span>
          </button>

          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Open keyboard shortcuts"
            className="h-9 w-9 rounded-lg bg-[#161B26] hover:bg-[#1E2533] border border-[#2A2E39] text-[#B2B5BE] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              aria-expanded={accountMenuOpen}
              aria-label="Open signed-in account menu"
              className="h-9 px-2.5 rounded-full bg-white/10 hover:bg-white/18 border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-[#2962FF] text-white text-[10px] font-bold flex items-center justify-center">
                {currentUser.initials}
              </span>
              <span className="hidden sm:inline max-w-[115px] truncate">{currentUser.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#B2B5BE]" />
            </button>

            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-xl bg-[#131722] border border-[#2A2E39] shadow-2xl p-3 text-left z-40"
              >
                <div className="pb-2.5 mb-2 border-b border-[#2A2E39]">
                  <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                  <div className="text-[11px] text-[#9598A1] truncate">{currentUser.email}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[#60A5FA]">
                    <span className="uppercase font-mono">{currentUser.provider} auth</span>
                    <span>{savedAlertsCount} alerts</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onSwitchToLanding();
                  }}
                  className="w-full mb-1 px-2.5 py-2 rounded-lg text-xs font-medium text-[#D1D4DC] hover:bg-white/10 inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-[#60A5FA]" />
                  <span>Landing overview</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#FCA5A5] hover:bg-[#F23645]/15 inline-flex items-center gap-2 transition-colors cursor-pointer"
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
