import { create } from 'zustand';

export type WorkspaceTheme = 'light' | 'dark';
export type WorkspaceDensity = 'comfortable' | 'compact';
export type GuidanceMode = 'guided' | 'pro';
export type BaseCurrency = 'INR' | 'USD';

export type DashboardWidgetId =
  | 'portfolio-pulse'
  | 'instrument-analysis'
  | 'performance-map'
  | 'gateway-screener'
  | 'backtester-preview'
  | 'sip-tax-workbench';

export const DEFAULT_PINNED_WIDGETS: DashboardWidgetId[] = [
  'portfolio-pulse',
  'instrument-analysis',
  'performance-map',
  'gateway-screener',
  'backtester-preview',
  'sip-tax-workbench',
];

export const WIDGET_CATALOG: Array<{
  id: DashboardWidgetId;
  label: string;
  description: string;
}> = [
  {
    id: 'portfolio-pulse',
    label: 'Portfolio Pulse & XIRR Strip',
    description: 'Live valuation, exact XIRR, STCG/LTCG tax summary, and allocation drift status.',
  },
  {
    id: 'instrument-analysis',
    label: 'Instrument Analysis Desk',
    description: 'Interactive canvas chart, benchmark alpha, rolling Sharpe, and peer comparison.',
  },
  {
    id: 'performance-map',
    label: 'Asset Class Performance Map',
    description: 'User-definable multi-fund treemap, neutral watchboard, and sovereign yield curve.',
  },
  {
    id: 'gateway-screener',
    label: 'Virtualized Fund & ETF Screener',
    description: 'High-speed multi-facet screener across AMFI schemes and global ETFs.',
  },
  {
    id: 'backtester-preview',
    label: 'Multi-Asset Backtester Snapshot',
    description: 'Quick launch into walk-forward replay, factor attribution, and stress tests.',
  },
  {
    id: 'sip-tax-workbench',
    label: 'SIP & Direct Plan Savings Lab',
    description: 'Step-up SIP compounding and Regular vs. Direct expense drag calculator.',
  },
];

function applyDomTheme(theme: WorkspaceTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

function loadInitialTheme(): WorkspaceTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem('financia_theme_v2');
    if (saved === 'dark' || saved === 'light') {
      applyDomTheme(saved);
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  applyDomTheme('light');
  return 'light';
}

export interface WorkspaceStoreState {
  theme: WorkspaceTheme;
  density: WorkspaceDensity;
  guidanceMode: GuidanceMode;
  baseCurrency: BaseCurrency;
  pinnedWidgets: DashboardWidgetId[];
  comparisonBasket: string[];
  commandPaletteOpen: boolean;
  customizeLayoutOpen: boolean;
  setTheme: (theme: WorkspaceTheme) => void;
  toggleTheme: () => void;
  setDensity: (density: WorkspaceDensity) => void;
  setGuidanceMode: (mode: GuidanceMode) => void;
  setBaseCurrency: (currency: BaseCurrency) => void;
  toggleWidget: (id: DashboardWidgetId) => void;
  moveWidget: (id: DashboardWidgetId, direction: 'up' | 'down') => void;
  resetDefaultWidgets: () => void;
  addToComparison: (symbol: string) => void;
  removeFromComparison: (symbol: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCustomizeLayoutOpen: (open: boolean) => void;
  hydrateFromProfile: (profile: Partial<{
    theme: WorkspaceTheme;
    density: WorkspaceDensity;
    guidanceMode: GuidanceMode;
    baseCurrency: BaseCurrency;
    pinnedWidgets: string[];
  }>) => void;
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set) => ({
  theme: loadInitialTheme(),
  density: 'comfortable',
  guidanceMode: 'guided',
  baseCurrency: 'INR',
  pinnedWidgets: [...DEFAULT_PINNED_WIDGETS],
  comparisonBasket: ['PPFAS', 'QQQ', 'GOLDBEES'],
  commandPaletteOpen: false,
  customizeLayoutOpen: false,

  setTheme: (theme) => {
    applyDomTheme(theme);
    try {
      window.localStorage.setItem('financia_theme_v2', theme);
    } catch {
      // ignore
    }
    set({ theme });
  },

  toggleTheme: () =>
    set((state) => {
      const next: WorkspaceTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyDomTheme(next);
      try {
        window.localStorage.setItem('financia_theme_v2', next);
      } catch {
        // ignore
      }
      return { theme: next };
    }),

  setDensity: (density) => set({ density }),
  setGuidanceMode: (guidanceMode) => set({ guidanceMode }),
  setBaseCurrency: (baseCurrency) => set({ baseCurrency }),

  toggleWidget: (id) =>
    set((state) => {
      const exists = state.pinnedWidgets.includes(id);
      if (exists) {
        const next = state.pinnedWidgets.filter((w) => w !== id);
        return { pinnedWidgets: next.length > 0 ? next : [id] };
      }
      return { pinnedWidgets: [...state.pinnedWidgets, id].slice(0, 12) };
    }),

  moveWidget: (id, direction) =>
    set((state) => {
      const idx = state.pinnedWidgets.indexOf(id);
      if (idx === -1) return state;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= state.pinnedWidgets.length) return state;
      const copy = [...state.pinnedWidgets];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return { pinnedWidgets: copy };
    }),

  resetDefaultWidgets: () => set({ pinnedWidgets: [...DEFAULT_PINNED_WIDGETS] }),

  addToComparison: (symbol) =>
    set((state) => {
      const clean = symbol.trim().toUpperCase();
      if (!clean || state.comparisonBasket.includes(clean)) return state;
      return { comparisonBasket: [...state.comparisonBasket, clean].slice(-6) };
    }),

  removeFromComparison: (symbol) =>
    set((state) => ({
      comparisonBasket: state.comparisonBasket.filter((s) => s !== symbol.trim().toUpperCase()),
    })),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setCustomizeLayoutOpen: (open) => set({ customizeLayoutOpen: open }),

  hydrateFromProfile: (profile) =>
    set((state) => {
      const nextTheme = profile.theme ?? state.theme;
      applyDomTheme(nextTheme);
      const validIds = new Set<string>(WIDGET_CATALOG.map((w) => w.id));
      const filteredWidgets = Array.isArray(profile.pinnedWidgets)
        ? (profile.pinnedWidgets.filter((w) => validIds.has(w)) as DashboardWidgetId[])
        : state.pinnedWidgets;
      return {
        theme: nextTheme,
        density: profile.density ?? state.density,
        guidanceMode: profile.guidanceMode ?? state.guidanceMode,
        baseCurrency: profile.baseCurrency ?? state.baseCurrency,
        pinnedWidgets: filteredWidgets.length > 0 ? filteredWidgets : state.pinnedWidgets,
      };
    }),
}));
