import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Briefcase,
  Filter,
  LayoutGrid,
  Moon,
  Search,
  Sliders,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import { SCREENER_FUNDS } from '../utils/screenerEngine';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { WorkspaceRouteTab } from './AdaptiveWorkspaceBar';

interface CommandPaletteModalProps {
  onSelectSymbol: (symbol: string) => void;
  onNavigateTab: (tab: WorkspaceRouteTab) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  onSelectSymbol,
  onNavigateTab,
}) => {
  const open = useWorkspaceStore((s) => s.commandPaletteOpen);
  const setOpen = useWorkspaceStore((s) => s.setCommandPaletteOpen);
  const theme = useWorkspaceStore((s) => s.theme);
  const toggleTheme = useWorkspaceStore((s) => s.toggleTheme);
  const density = useWorkspaceStore((s) => s.density);
  const setDensity = useWorkspaceStore((s) => s.setDensity);
  const setCustomizeLayoutOpen = useWorkspaceStore((s) => s.setCustomizeLayoutOpen);

  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useWorkspaceStore.getState().commandPaletteOpen);
      } else if (e.key === 'Escape' && useWorkspaceStore.getState().commandPaletteOpen) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);

  const matchedFunds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SCREENER_FUNDS.slice(0, 6);
    return SCREENER_FUNDS.filter((f) =>
      `${f.symbol} ${f.name} ${f.category} ${f.subCategory}`.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  if (!open) return null;

  const closeAndRun = (fn: () => void) => {
    setOpen(false);
    setQuery('');
    fn();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Financia Command Palette"
      className="fixed inset-0 z-50 bg-[#040711]/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-[14px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#0f172a] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e2e8f0] dark:border-[#1f2937]">
          <Search className="w-4 h-4 text-[#64748b]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to any Mutual Fund, ETF, workspace tab, or command…"
            className="flex-1 bg-transparent text-sm text-[#090e1a] dark:text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[#64748b] hover:text-[#090e1a] dark:hover:text-white cursor-pointer"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-3 space-y-4">
          {/* Quick Navigation */}
          <div>
            <div className="px-2 pb-1.5 text-[10.5px] font-mono uppercase tracking-wider text-[#64748b]">
              Workspaces
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'overview' as const, label: 'Modular Desk', icon: LayoutGrid },
                  { id: 'portfolio' as const, label: 'Portfolio & CAS', icon: Briefcase },
                  { id: 'backtest' as const, label: 'Backtester Lab', icon: Activity },
                  { id: 'screener' as const, label: 'Gateway Screener', icon: Filter },
                  { id: 'terminal' as const, label: 'Fund Terminal', icon: Terminal },
                ] as const
              ).map((nav) => {
                const Icon = nav.icon;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => closeAndRun(() => onNavigateTab(nav.id))}
                    className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-xs font-medium text-[#090e1a] dark:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-left cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#2563eb]" />
                    {nav.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instruments */}
          <div>
            <div className="px-2 pb-1.5 text-[10.5px] font-mono uppercase tracking-wider text-[#64748b]">
              Analyze Instrument ({matchedFunds.length})
            </div>
            <div className="space-y-1">
              {matchedFunds.map((f) => (
                <button
                  key={f.symbol}
                  type="button"
                  onClick={() => closeAndRun(() => onSelectSymbol(f.symbol))}
                  className="w-full flex items-center justify-between rounded-[8px] px-3 py-2 text-left hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-[#090e1a] dark:text-white">
                      {f.symbol}
                    </span>
                    <span className="text-xs text-[#64748b] dark:text-[#94a3b8] ml-2 truncate">
                      {f.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-[#059669] dark:text-[#10b981] shrink-0 ml-2">
                    {f.currency === 'USD' ? '$' : '₹'}
                    {f.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Workspace Posture Actions */}
          <div>
            <div className="px-2 pb-1.5 text-[10.5px] font-mono uppercase tracking-wider text-[#64748b]">
              Workspace Controls
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => closeAndRun(toggleTheme)}
                className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-xs text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                Toggle {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button
                type="button"
                onClick={() =>
                  closeAndRun(() => setDensity(density === 'compact' ? 'comfortable' : 'compact'))
                }
                className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-xs text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                {density === 'compact' ? 'Comfortable' : 'Pro Compact'}
              </button>
              <button
                type="button"
                onClick={() => closeAndRun(() => setCustomizeLayoutOpen(true))}
                className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-xs text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Customize Widgets
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
