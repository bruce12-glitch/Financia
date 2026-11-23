import React from 'react';
import {
  Activity,
  Briefcase,
  Command,
  Compass,
  Filter,
  LayoutGrid,
  LogOut,
  Moon,
  Sliders,
  Sun,
  Terminal,
  UserCheck,
} from 'lucide-react';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export type WorkspaceRouteTab =
  | 'overview'
  | 'portfolio'
  | 'backtest'
  | 'screener'
  | 'terminal';

interface AdaptiveWorkspaceBarProps {
  activeTab: WorkspaceRouteTab;
  onSelectTab: (tab: WorkspaceRouteTab) => void;
}

export const AdaptiveWorkspaceBar: React.FC<AdaptiveWorkspaceBarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { user, signInWithGoogle, signOutUser, signingIn, syncWorkspacePreferencesToCloud } =
    useFirebaseAuth();

  const theme = useWorkspaceStore((s) => s.theme);
  const density = useWorkspaceStore((s) => s.density);
  const guidanceMode = useWorkspaceStore((s) => s.guidanceMode);
  const toggleTheme = useWorkspaceStore((s) => s.toggleTheme);
  const setDensity = useWorkspaceStore((s) => s.setDensity);
  const setGuidanceMode = useWorkspaceStore((s) => s.setGuidanceMode);
  const setCommandPaletteOpen = useWorkspaceStore((s) => s.setCommandPaletteOpen);
  const setCustomizeLayoutOpen = useWorkspaceStore((s) => s.setCustomizeLayoutOpen);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    void syncWorkspacePreferencesToCloud({ theme: next });
  };

  const handleToggleDensity = () => {
    const next = density === 'compact' ? 'comfortable' : 'compact';
    setDensity(next);
    void syncWorkspacePreferencesToCloud({ density: next });
  };

  const handleToggleGuidance = () => {
    const next = guidanceMode === 'guided' ? 'pro' : 'guided';
    setGuidanceMode(next);
    void syncWorkspacePreferencesToCloud({ guidanceMode: next });
  };

  const navItems: Array<{
    id: WorkspaceRouteTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Modular Desk', icon: LayoutGrid },
    { id: 'portfolio', label: 'Portfolio & CAS', icon: Briefcase },
    { id: 'backtest', label: 'Backtester Lab', icon: Activity },
    { id: 'screener', label: 'Gateway Screener', icon: Filter },
    { id: 'terminal', label: 'Fund Terminal', icon: Terminal },
  ];

  return (
    <div
      data-testid="adaptive-workspace-bar"
      className="sticky top-[56px] z-30 border-b border-[#e2e8f0] dark:border-[#1f2937] bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Route Tabs */}
        <nav aria-label="Workspace modules" className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`nav-tab-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  active
                    ? 'bg-[#090e1a] dark:bg-white text-white dark:text-[#090e1a]'
                    : 'text-[#475569] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Adaptive 4-in-1 Controls + Cmd+K + Cloud Auth */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            title="Open Command Palette (Cmd/Ctrl + K)"
            className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#111827] px-2.5 py-1.5 text-[11px] font-mono text-[#475569] dark:text-[#cbd5e1] hover:border-[#2563eb] cursor-pointer"
          >
            <Command className="w-3 h-3" />
            <span>K</span>
          </button>

          <button
            type="button"
            onClick={handleToggleTheme}
            title="Switch Institutional Light / Dark Theme"
            className="inline-flex items-center gap-1 rounded-[7px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#111827] px-2.5 py-1.5 text-[11px] font-mono text-[#334155] dark:text-[#cbd5e1] hover:border-[#2563eb] cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#fbbf24]" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleDensity}
            title="Switch Comfortable vs Pro Compact Density"
            className="inline-flex items-center gap-1 rounded-[7px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#111827] px-2.5 py-1.5 text-[11px] font-mono text-[#334155] dark:text-[#cbd5e1] hover:border-[#2563eb] cursor-pointer"
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden md:inline">{density === 'compact' ? 'Pro Compact' : 'Comfortable'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleGuidance}
            title="Switch Guided Retail vs Pro Quant Posture"
            className="inline-flex items-center gap-1 rounded-[7px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#111827] px-2.5 py-1.5 text-[11px] font-mono text-[#334155] dark:text-[#cbd5e1] hover:border-[#2563eb] cursor-pointer"
          >
            <Compass className="w-3 h-3" />
            <span className="hidden md:inline">{guidanceMode === 'guided' ? 'Guided' : 'Pro'}</span>
          </button>

          {activeTab === 'overview' && (
            <button
              type="button"
              onClick={() => setCustomizeLayoutOpen(true)}
              className="inline-flex items-center gap-1 rounded-[7px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#111827] px-2.5 py-1.5 text-[11px] font-medium text-[#090e1a] dark:text-white hover:border-[#2563eb] cursor-pointer"
            >
              <LayoutGrid className="w-3 h-3 text-[#0d9488]" />
              Customize
            </button>
          )}

          {user ? (
            <button
              type="button"
              onClick={() => void signOutUser()}
              title={`Signed in as ${user.email || 'Google User'} — Click to sign out`}
              className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#bbf7d0] dark:border-[#065f46] bg-[#f0fdf4] dark:bg-[#052e16]/60 px-2.5 py-1.5 text-[11px] font-medium text-[#15803d] dark:text-[#34d399] cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden xl:inline max-w-[120px] truncate">{user.displayName || user.email}</span>
              <LogOut className="w-3 h-3 opacity-70" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={signingIn}
              className="inline-flex items-center gap-1.5 rounded-[7px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-2.5 py-1.5 text-[11px] font-medium cursor-pointer"
            >
              {signingIn ? 'Signing in…' : 'Google Sync'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
