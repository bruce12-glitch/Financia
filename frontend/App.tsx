import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Bell, Briefcase, Volume2, VolumeX, X } from 'lucide-react';
import {
  EarthHeroSection,
  LandingAccessGateSection,
  LiveFundExplorerSection,
  LiveMacroBullionSection,
  RocketFooterSection,
} from '../landing';
import {
  AdaptiveWorkspaceBar,
  WorkspaceRouteTab,
} from './components/AdaptiveWorkspaceBar';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { FrontendWorkspaceHeader } from './components/FrontendWorkspaceHeader';
import { FrontendCapabilityHub } from './components/FrontendCapabilityHub';
import { InstrumentAnalysisSection } from './components/InstrumentAnalysisSection';
import { InvestorToolsWorkbench } from './components/InvestorToolsWorkbench';
import { LiveStockTerminal, TerminalTabId } from './components/LiveStockTerminal';
import { MarketSummaryAndIdeas } from './components/MarketSummaryAndIdeas';
import { ModularLayoutDrawer } from './components/ModularLayoutDrawer';
import { MutualFundEtfScreenerSection } from './components/MutualFundEtfScreenerSection';
import { AccountSecurityModal } from './components/AccountSecurityModal';
import { GlobalModals } from './components/GlobalModals';
import { AlertTargetAsset } from './components/SetAlertModal';
import { useFirebaseAuth } from './context/FirebaseAuthContext';
import { BacktesterLabPage } from './features/backtester/BacktesterLabPage';
import { PortfolioTrackerPage } from './features/portfolio/PortfolioTrackerPage';
import { VirtualizedScreenerPanel } from './features/screener/VirtualizedScreenerPanel';
import { DashboardWidgetId, useWorkspaceStore } from './store/useWorkspaceStore';
import { INITIAL_STOCKS } from './data/marketData';
import { ALL_SEARCHABLE_SYMBOLS } from './data/tradingViewData';
import {
  evaluateAlertTrigger,
  loadSavedAlerts,
  persistAlerts,
  PriceAlert,
} from './utils/alertEngine';
import {
  ALERT_PRIORITY_META,
  ALERT_SOUND_CATALOG,
  AlertAudioPreferences,
  loadAlertAudioPreferences,
  normalizeAlertPriority,
  persistAlertAudioPreferences,
  playPriorityAlertTone,
} from './utils/alertSoundEngine';
import {
  AuthMode,
  AuthSession,
  AuthUser,
  clearAuthSession,
  loadStoredAuthSession,
  persistAuthSession,
} from './utils/authEngine';
import {
  resolveKeyboardShortcutAction,
  ShortcutAction,
} from './utils/keyboardShortcuts';
import { synthesizeCustomTickerReport } from './utils/stockEngine';
import { SCREENER_FUNDS } from './utils/screenerEngine';
import {
  buildTerminalQuoteFromScreenerFund,
  selectPeerComparisonSymbols,
} from './utils/fundIntelligenceEngine';
import { StockQuote } from './types/financia';
import { CommunityIdeaItem, MarketSymbolRow, WireNewsItem } from './types/markets';

function buildInitialUniverseStocks(): StockQuote[] {
  const byTicker = new Map<string, StockQuote>();
  for (const s of INITIAL_STOCKS) {
    byTicker.set(s.ticker.toUpperCase(), s);
  }
  for (const fund of SCREENER_FUNDS) {
    const key = fund.symbol.toUpperCase();
    if (!byTicker.has(key)) {
      byTicker.set(key, buildTerminalQuoteFromScreenerFund(fund));
    }
  }
  return Array.from(byTicker.values());
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: firebaseUser } = useFirebaseAuth();
  const pinnedWidgets = useWorkspaceStore((s) => s.pinnedWidgets);

  const [stocks, setStocks] = useState<StockQuote[]>(() => buildInitialUniverseStocks());
  const [selectedTicker, setSelectedTicker] = useState<string>('QQQ');
  const [liveFeedActive, setLiveFeedActive] = useState<boolean>(true);

  const [searchOpen, setSearchOpen] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadStoredAuthSession());
  const [activeView, setActiveView] = useState<'landing' | 'frontend' | 'terminal'>(() => {
    const stored = loadStoredAuthSession();
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('view=landing')) return 'landing';
      if (window.location.pathname.startsWith('/terminal')) return 'terminal';
      if (
        window.location.pathname.startsWith('/portfolio') ||
        window.location.pathname.startsWith('/backtest') ||
        window.location.pathname.startsWith('/screener') ||
        window.location.pathname.startsWith('/workspace') ||
        window.location.pathname.startsWith('/frontend')
      ) {
        return 'frontend';
      }
    }
    return stored ? 'frontend' : 'landing';
  });

  const [workspaceRouteTab, setWorkspaceRouteTab] = useState<WorkspaceRouteTab>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p.startsWith('/portfolio')) return 'portfolio';
      if (p.startsWith('/backtest')) return 'backtest';
      if (p.startsWith('/screener')) return 'screener';
      if (p.startsWith('/terminal')) return 'terminal';
    }
    return 'overview';
  });

  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith('/portfolio')) {
      setWorkspaceRouteTab('portfolio');
      setActiveView('frontend');
    } else if (p.startsWith('/backtest')) {
      setWorkspaceRouteTab('backtest');
      setActiveView('frontend');
    } else if (p.startsWith('/screener')) {
      setWorkspaceRouteTab('screener');
      setActiveView('frontend');
    } else if (p.startsWith('/terminal')) {
      setWorkspaceRouteTab('terminal');
      setActiveView('terminal');
    } else if (p.startsWith('/workspace') || p.startsWith('/frontend')) {
      setWorkspaceRouteTab('overview');
      setActiveView('frontend');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (firebaseUser && activeView === 'landing' && !location.search.includes('view=landing')) {
      setActiveView('frontend');
    }
  }, [firebaseUser, activeView, location.search]);
  const [terminalTabRequest, setTerminalTabRequest] = useState<{
    tab: TerminalTabId;
    nonce: number;
  }>({ tab: 'individual', nonce: 0 });

  const [signupOpen, setSignupOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('auth');
      if (p === 'signup' || p === 'login') return true;
      if (
        (window.location.pathname.startsWith('/frontend') ||
          window.location.pathname.startsWith('/terminal')) &&
        !loadStoredAuthSession()
      ) {
        return true;
      }
    }
    return false;
  });
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('auth');
      if (p === 'login') return 'login';
      if (
        (window.location.pathname.startsWith('/frontend') ||
          window.location.pathname.startsWith('/terminal')) &&
        !loadStoredAuthSession()
      ) {
        return 'login';
      }
    }
    return 'signup';
  });

  const pendingSectionRef = useRef<string | null>(
    typeof window !== 'undefined' && window.location.pathname.startsWith('/terminal')
      ? 'live-terminal'
      : null
  );

  const [fxRatesOpen, setFxRatesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState<'IN' | 'GLOBAL'>('IN');
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbolRow | null>(null);
  const [selectedNews, setSelectedNews] = useState<WireNewsItem | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<CommunityIdeaItem | null>(null);

  const [alerts, setAlerts] = useState<PriceAlert[]>(() => loadSavedAlerts());
  const [alertAudioPrefs, setAlertAudioPrefs] = useState<AlertAudioPreferences>(() =>
    loadAlertAudioPreferences()
  );
  const [comparisonTickers, setComparisonTickers] = useState<string[]>(() =>
    selectPeerComparisonSymbols('QQQ', SCREENER_FUNDS, 2)
  );
  const [alertTarget, setAlertTarget] = useState<AlertTargetAsset | null>(null);
  const [triggeredBanner, setTriggeredBanner] = useState<{
    alert: PriceAlert;
    soundLabel: string;
    audioPlayed: boolean;
  } | null>(null);

  const syncWorkspaceFromServer = useCallback(async (token: string) => {
    try {
      const [alertsRes, watchlistRes] = await Promise.all([
        fetch('/api/alerts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/watchlist', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (alertsRes.ok) {
        const payload = (await alertsRes.json()) as { alerts?: PriceAlert[] };
        if (Array.isArray(payload.alerts)) {
          setAlerts(payload.alerts);
          persistAlerts(payload.alerts);
        }
      }

      if (watchlistRes.ok) {
        const wlPayload = (await watchlistRes.json()) as {
          watchlist?: {
            primaryTicker?: string;
            comparisonTickers?: string[];
          };
        };
        if (wlPayload.watchlist?.primaryTicker) {
          setSelectedTicker(wlPayload.watchlist.primaryTicker);
        }
        if (
          Array.isArray(wlPayload.watchlist?.comparisonTickers) &&
          wlPayload.watchlist.comparisonTickers.length > 0
        ) {
          setComparisonTickers(wlPayload.watchlist.comparisonTickers);
        }
      }
    } catch {
      // Keep local workspace state gracefully if offline
    }
  }, []);

  // Sync URL with authenticated workspace view (/frontend or /terminal) & handle browser Back/Forward
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (authSession && activeView === 'frontend' && !window.location.pathname.startsWith('/frontend')) {
      window.history.replaceState(null, '', '/frontend');
    } else if (authSession && activeView === 'terminal' && !window.location.pathname.startsWith('/terminal')) {
      window.history.replaceState(null, '', '/terminal');
    } else if (
      !authSession &&
      (window.location.pathname.startsWith('/frontend') ||
        window.location.pathname.startsWith('/terminal'))
    ) {
      window.history.replaceState(null, '', '/');
    }
  }, [authSession, activeView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const wantsFrontend = window.location.pathname.startsWith('/frontend');
      const wantsTerminal = window.location.pathname.startsWith('/terminal');
      if (wantsTerminal && authSession) {
        setActiveView('terminal');
      } else if (wantsFrontend && authSession) {
        setActiveView('frontend');
      } else if ((wantsFrontend || wantsTerminal) && !authSession) {
        pendingSectionRef.current = wantsTerminal ? 'live-terminal' : null;
        window.history.replaceState(null, '', '/');
        setActiveView('landing');
        setAuthInitialMode('login');
        setSignupOpen(true);
      } else {
        setActiveView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authSession]);

  // Verify stored session against backend on mount & load persisted workspace state
  useEffect(() => {
    const stored = loadStoredAuthSession();
    if (!stored?.token) return;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${stored.token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: AuthSession['user'] | null } | null) => {
        if (data?.user) {
          const next = { user: data.user, token: stored.token };
          setAuthSession(next);
          persistAuthSession(next);
          void syncWorkspaceFromServer(stored.token);
        } else {
          clearAuthSession();
          setAuthSession(null);
          setActiveView('landing');
          if (
            typeof window !== 'undefined' &&
            (window.location.pathname.startsWith('/frontend') ||
              window.location.pathname.startsWith('/terminal'))
          ) {
            window.history.replaceState(null, '', '/');
          }
        }
      })
      .catch(() => {
        // Keep local stored session seamlessly
      });
  }, [syncWorkspaceFromServer]);

  // Persist user price alerts & acoustic preferences across sessions
  useEffect(() => {
    persistAlerts(alerts);
  }, [alerts]);

  useEffect(() => {
    persistAlertAudioPreferences(alertAudioPrefs);
  }, [alertAudioPrefs]);

  const enterFrontend = useCallback((targetSectionId?: string | null) => {
    setActiveView('frontend');
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/frontend')) {
      window.history.pushState(null, '', '/frontend');
    }
    window.setTimeout(() => {
      if (targetSectionId) {
        const el = document.getElementById(targetSectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 60);
  }, []);

  const enterTerminal = useCallback((initialTab: TerminalTabId = 'individual') => {
    setActiveView('terminal');
    setTerminalTabRequest((prev) => ({ tab: initialTab, nonce: prev.nonce + 1 }));
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/terminal')) {
      window.history.pushState(null, '', '/terminal');
    }
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 40);
  }, []);

  const switchToLanding = useCallback(() => {
    setActiveView('landing');
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/frontend') ||
        window.location.pathname.startsWith('/terminal'))
    ) {
      window.history.pushState(null, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAuthenticated = useCallback(
    (session: AuthSession) => {
      setAuthSession(session);
      persistAuthSession(session);
      setSignupOpen(false);
      void syncWorkspaceFromServer(session.token);
      const target = pendingSectionRef.current;
      pendingSectionRef.current = null;
      if (target === 'live-terminal') {
        enterTerminal('individual');
      } else {
        enterFrontend(target);
      }
    },
    [enterFrontend, enterTerminal, syncWorkspaceFromServer]
  );

  const handleSignOut = useCallback(async () => {
    const token = authSession?.token;
    pendingSectionRef.current = null;
    clearAuthSession();
    setAuthSession(null);
    setActiveView('landing');
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/frontend') ||
        window.location.pathname.startsWith('/terminal'))
    ) {
      window.history.pushState(null, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      // Non-fatal
    }
  }, [authSession?.token]);

  const handleJumpToSection = useCallback(
    (sectionId: string) => {
      if (sectionId === 'live-terminal') {
        if (!authSession) {
          pendingSectionRef.current = 'live-terminal';
          setAuthInitialMode('login');
          setSignupOpen(true);
          return;
        }
        enterTerminal('individual');
        return;
      }

      const frontendSections = new Set([
        'workspace-overview',
        'instrument-analysis',
        'mf-etf-screener',
        'market-summary',
        'markets',
        'sip-tools-workbench',
        'forex-section',
        'economy-section',
        'global-exchanges-globe',
      ]);

      if (frontendSections.has(sectionId)) {
        if (!authSession) {
          pendingSectionRef.current = sectionId;
          setAuthInitialMode('login');
          setSignupOpen(true);
          return;
        }
        if (activeView !== 'frontend') {
          enterFrontend(sectionId);
          return;
        }
      }

      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [authSession, activeView, enterFrontend, enterTerminal]
  );

  const executeShortcutAction = useCallback(
    (action: ShortcutAction) => {
      switch (action.type) {
        case 'open-search':
          setShortcutsOpen(false);
          setSearchOpen(true);
          break;
        case 'toggle-help':
          setSearchOpen(false);
          setShortcutsOpen((prev) => !prev);
          break;
        case 'close-modals':
          setSearchOpen(false);
          setSignupOpen(false);
          setFxRatesOpen(false);
          setShortcutsOpen(false);
          setAlertTarget(null);
          setSelectedSymbol(null);
          setSelectedNews(null);
          setSelectedIdea(null);
          break;
        case 'jump-section':
          setShortcutsOpen(false);
          handleJumpToSection(action.sectionId);
          break;
        case 'toggle-live-feed':
          setLiveFeedActive((prev) => !prev);
          break;
      }
    },
    [handleJumpToSection]
  );

  // Global keyboard shortcuts (?, /, Ctrl+K, Esc, section jumps, telemetry toggle)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const action = resolveKeyboardShortcutAction(e);
      if (!action) return;
      e.preventDefault();
      executeShortcutAction(action);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [executeShortcutAction]);

  // Subtle live tick telemetry pulse for the Stock Analysis Terminal
  useEffect(() => {
    if (!liveFeedActive) return;
    const timer = window.setInterval(() => {
      setStocks((prev) =>
        prev.map((s) => {
          const jitter = (Math.random() - 0.49) * 0.0012;
          const nextPrice = Number(Math.max(0.5, s.price * (1 + jitter)).toFixed(2));
          const delta = Number((nextPrice - (s.price - s.change)).toFixed(2));
          const basePrev = s.price - s.change || s.price;
          const nextPct = Number(((delta / basePrev) * 100).toFixed(2));
          return {
            ...s,
            price: nextPrice,
            change: delta,
            changePercent: nextPct,
          };
        })
      );
    }, 3500);
    return () => window.clearInterval(timer);
  }, [liveFeedActive]);

  // Evaluate armed price alerts against live stock ticks & play priority-routed acoustic cues
  useEffect(() => {
    if (alerts.length === 0) return;
    let newlyTriggered: PriceAlert | null = null;
    const updated = alerts.map((alert) => {
      const matchingStock = stocks.find((s) => s.ticker === alert.ticker);
      if (matchingStock && evaluateAlertTrigger(alert, matchingStock.price)) {
        newlyTriggered = { ...alert, triggered: true };
        return newlyTriggered;
      }
      return alert;
    });
    if (newlyTriggered) {
      const firedAlert = newlyTriggered as PriceAlert;
      setAlerts(updated);
      const priority = normalizeAlertPriority(firedAlert.priority);
      const toneResult = firedAlert.notificationsEnabled
        ? playPriorityAlertTone(priority, alertAudioPrefs)
        : { played: false, profile: 'muted' as const };
      setTriggeredBanner({
        alert: firedAlert,
        soundLabel: ALERT_SOUND_CATALOG[toneResult.profile].label,
        audioPlayed: toneResult.played,
      });
    }
  }, [stocks, alerts, alertAudioPrefs]);

  // Enrich active asset with live AMFI MFAPI / Marketstack / Binance backend data (skip overwriting rich 20-fund catalog quotes unless numeric AMFI code)
  useEffect(() => {
    const isRichCatalog = SCREENER_FUNDS.some(
      (f) => f.symbol.toUpperCase() === selectedTicker.toUpperCase()
    );
    if (isRichCatalog) return;
    let cancelled = false;
    fetch(`/api/funds/analyze?ticker=${encodeURIComponent(selectedTicker)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stock?: StockQuote } | null) => {
        if (cancelled || !data?.stock) return;
        const enriched = data.stock;
        setStocks((prev) =>
          prev.map((s) => (s.ticker === enriched.ticker ? enriched : s))
        );
      })
      .catch(() => {
        // Keep seeded data silently
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTicker]);

  const handleToggleRegion = useCallback(() => {
    setActiveRegion((prev) => (prev === 'IN' ? 'GLOBAL' : 'IN'));
  }, []);

  const handleAnalyzeCustomTicker = useCallback(
    async (rawTicker: string, _agentMode: 'antigravity' | 'perseus') => {
      const normalized = rawTicker.trim().toUpperCase();
      if (!normalized) return;

      // Hydrate synchronously from the full 20-fund institutional Screener catalog when matched
      const catalogMatch = SCREENER_FUNDS.find(
        (f) => f.symbol.toUpperCase() === normalized || f.id.toUpperCase() === normalized
      );
      if (catalogMatch) {
        const richQuote = buildTerminalQuoteFromScreenerFund(catalogMatch);
        setStocks((prev) => {
          const exists = prev.some((s) => s.ticker === richQuote.ticker);
          if (exists) {
            return prev.map((s) => (s.ticker === richQuote.ticker ? richQuote : s));
          }
          return [richQuote, ...prev.slice(0, 9)];
        });
        setSelectedTicker(richQuote.ticker);
        return;
      }

      try {
        const res = await fetch(`/api/funds/analyze?ticker=${encodeURIComponent(normalized)}`);
        if (res.ok) {
          const data = (await res.json()) as { stock?: StockQuote };
          if (data.stock) {
            const analyzedStock = data.stock;
            setStocks((prev) => {
              const exists = prev.some((s) => s.ticker === analyzedStock.ticker);
              if (exists) {
                return prev.map((s) => (s.ticker === analyzedStock.ticker ? analyzedStock : s));
              }
              return [analyzedStock, ...prev.slice(0, 9)];
            });
            setSelectedTicker(analyzedStock.ticker);
            return;
          }
        }
      } catch {
        // Offline / fallback path handled seamlessly below
      }

      const synthesized = synthesizeCustomTickerReport(normalized, stocks);
      setStocks((prev) => {
        const exists = prev.some((s) => s.ticker === synthesized.ticker);
        if (exists) return prev;
        return [synthesized, ...prev.slice(0, 9)];
      });
      setSelectedTicker(synthesized.ticker);
    },
    [stocks]
  );

  const handleOpenInTerminal = useCallback(
    (ticker: string, customPeers?: string[], initialTab: TerminalTabId = 'individual') => {
      const normalized = ticker.trim().toUpperCase();
      if (!normalized) return;
      void handleAnalyzeCustomTicker(normalized, 'perseus');
      const peers =
        customPeers && customPeers.length > 0
          ? customPeers.map((p) => p.trim().toUpperCase()).filter((p) => p && p !== normalized)
          : selectPeerComparisonSymbols(normalized, SCREENER_FUNDS, 2);
      setComparisonTickers(peers);
      setSelectedSymbol(null);
      if (!authSession) {
        pendingSectionRef.current = 'live-terminal';
        setAuthInitialMode('login');
        setSignupOpen(true);
        return;
      }
      enterTerminal(initialTab);
    },
    [authSession, enterTerminal, handleAnalyzeCustomTicker]
  );

  const handleSelectHeroTicker = useCallback(
    (lookupSymbol: string) => {
      const normalized = lookupSymbol.toUpperCase();
      const matched = ALL_SEARCHABLE_SYMBOLS.find(
        (item) => item.symbol.toUpperCase() === normalized
      );
      if (matched) {
        setSelectedSymbol(matched);
      } else {
        handleOpenInTerminal(normalized);
      }
    },
    [handleOpenInTerminal]
  );

  const persistWatchlistToServer = useCallback(
    (primary: string, comparison: string[]) => {
      const token = authSession?.token;
      if (!token) return;
      void fetch('/api/watchlist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          primaryTicker: primary,
          comparisonTickers: comparison,
        }),
      }).catch(() => {
        // Non-fatal
      });
    },
    [authSession?.token]
  );

  const handleSelectPrimaryTicker = useCallback(
    (ticker: string) => {
      const normalized = ticker.trim().toUpperCase();
      setSelectedTicker(normalized);
      persistWatchlistToServer(normalized, comparisonTickers);
    },
    [comparisonTickers, persistWatchlistToServer]
  );

  const handleComparisonTickersChange = useCallback(
    (nextTickers: string[]) => {
      setComparisonTickers(nextTickers);
      persistWatchlistToServer(selectedTicker, nextTickers);
    },
    [selectedTicker, persistWatchlistToServer]
  );

  const handleSaveAlert = useCallback(
    (draft: Omit<PriceAlert, 'id' | 'createdAt'>) => {
      const tempId = `alrt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const next: PriceAlert = {
        ...draft,
        id: tempId,
        createdAt: new Date().toISOString(),
      };
      setAlerts((prev) => [next, ...prev]);

      const token = authSession?.token;
      if (!token) return;

      void fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { alert?: PriceAlert } | null) => {
          const savedAlert = data?.alert;
          if (!savedAlert) return;
          setAlerts((prev) =>
            prev.map((item) => (item.id === tempId ? savedAlert : item))
          );
        })
        .catch(() => {
          // Keep optimistic local alert
        });
    },
    [authSession?.token]
  );

  const handleDeleteAlert = useCallback(
    (id: string) => {
      setAlerts((prev) => prev.filter((item) => item.id !== id));
      const token = authSession?.token;
      if (!token) return;
      void fetch(`/api/alerts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // Non-fatal
      });
    },
    [authSession?.token]
  );

  const handleToggleAlertNotification = useCallback(
    (id: string) => {
      let nextEnabled = true;
      setAlerts((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          nextEnabled = !item.notificationsEnabled;
          return { ...item, notificationsEnabled: nextEnabled };
        })
      );
      const token = authSession?.token;
      if (!token) return;
      void fetch(`/api/alerts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationsEnabled: nextEnabled }),
      }).catch(() => {
        // Non-fatal
      });
    },
    [authSession?.token]
  );

  const handleSelectWorkspaceTab = useCallback(
    (tab: WorkspaceRouteTab) => {
      setWorkspaceRouteTab(tab);
      if (tab === 'terminal') {
        setActiveView('terminal');
        navigate('/terminal');
      } else {
        setActiveView('frontend');
        const routeMap: Record<Exclude<WorkspaceRouteTab, 'terminal'>, string> = {
          overview: '/workspace',
          portfolio: '/portfolio',
          backtest: '/backtest',
          screener: '/screener',
        };
        navigate(routeMap[tab]);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigate]
  );

  const effectiveWorkspaceUser: AuthUser = authSession?.user ?? (firebaseUser
    ? {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Financia Investor',
        email: firebaseUser.email || 'investor@financia.app',
        provider: 'google',
        initials: (firebaseUser.displayName || firebaseUser.email || 'FI')
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() || '')
          .join('') || 'FI',
        createdAt: firebaseUser.metadata?.creationTime || new Date().toISOString(),
      }
    : {
        id: 'guest-workspace',
        name: 'Workspace Desk',
        email: 'Sign in for Cloud Sync',
        provider: 'email',
        initials: 'WD',
        createdAt: new Date().toISOString(),
      });

  const isDirectWorkspaceRoute =
    location.pathname.startsWith('/portfolio') ||
    location.pathname.startsWith('/backtest') ||
    location.pathname.startsWith('/screener') ||
    location.pathname.startsWith('/workspace');

  const showAuthenticatedShell = Boolean(
    (authSession || firebaseUser || isDirectWorkspaceRoute) &&
      (activeView === 'frontend' || activeView === 'terminal')
  );
  const showTerminalWorkspace = Boolean(
    showAuthenticatedShell && (activeView === 'terminal' || workspaceRouteTab === 'terminal')
  );

  const renderModularWidget = (widgetId: DashboardWidgetId) => {
    switch (widgetId) {
      case 'portfolio-pulse':
        return (
          <div
            key={widgetId}
            className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6"
          >
            <div className="rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-[#f8fafc] dark:bg-[#111827] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-[#0d9488]/10 text-[#0d9488] dark:text-[#14b8a6] flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#0d9488] dark:text-[#14b8a6]">
                    Portfolio Ledger · CAS / CSV · FIFO Tax Lots · Exact XIRR
                  </div>
                  <h2 className="font-display font-semibold text-base text-[#090e1a] dark:text-white mt-0.5">
                    Real Portfolio Tracker &amp; Smart Tax-Harvesting Desk
                  </h2>
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                    Import NSDL/CDSL/MFCentral CAS or broker CSVs, inspect hidden fund overlap, and
                    harvest your ₹1.25L tax-free LTCG allowance.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectWorkspaceTab('portfolio')}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#090e1a] dark:bg-white text-white dark:text-[#090e1a] px-4 py-2 text-xs font-semibold shrink-0 cursor-pointer"
              >
                Open Portfolio &amp; CAS
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );

      case 'instrument-analysis':
        return (
          <InstrumentAnalysisSection
            key={widgetId}
            selectedSymbol={selectedTicker}
            onSelectInstrumentSymbol={handleSelectPrimaryTicker}
            onJumpToTerminal={(ticker, peers) => handleOpenInTerminal(ticker, peers, 'individual')}
          />
        );

      case 'performance-map':
        return (
          <MarketSummaryAndIdeas
            key={widgetId}
            onSelectSymbol={(row) => {
              handleSelectPrimaryTicker(row.symbol);
              handleJumpToSection('instrument-analysis');
            }}
            onSelectNews={setSelectedNews}
            onSelectIdea={setSelectedIdea}
            onJumpToAnalysis={handleOpenInTerminal}
            liveFeedActive={liveFeedActive}
          />
        );

      case 'gateway-screener':
        return (
          <div key={widgetId} className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <VirtualizedScreenerPanel
              onInspectSymbol={(sym) => {
                handleSelectPrimaryTicker(sym);
                handleJumpToSection('instrument-analysis');
              }}
            />
          </div>
        );

      case 'backtester-preview':
        return (
          <div
            key={widgetId}
            className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4"
          >
            <div className="rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-[#f8fafc] dark:bg-[#111827] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-[#2563eb]/10 text-[#2563eb] dark:text-[#60a5fa] flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#2563eb] dark:text-[#60a5fa]">
                    Walk-Forward Replay · Brinson Attribution · Macro Regimes
                  </div>
                  <h2 className="font-display font-semibold text-base text-[#090e1a] dark:text-white mt-0.5">
                    Multi-Asset Backtester &amp; Factor Attribution Lab
                  </h2>
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                    Simulate custom SIP &amp; rebalance schedules on 60fps canvas charts, run 2008 /
                    2020 / 2022 stress replays, and inspect Monte Carlo terminal bands.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectWorkspaceTab('backtest')}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 text-xs font-semibold shrink-0 cursor-pointer"
              >
                Launch Backtester Lab
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );

      case 'sip-tax-workbench':
        return (
          <InvestorToolsWorkbench
            key={widgetId}
            onJumpToAnalysis={handleOpenInTerminal}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#090d16] text-[#090e1a] dark:text-[#f8fafc] flex flex-col transition-colors duration-200">
      {showAuthenticatedShell ? (
        <>
          <FrontendWorkspaceHeader
            currentUser={effectiveWorkspaceUser}
            activeView={showTerminalWorkspace ? 'terminal' : 'frontend'}
            activeRegion={activeRegion}
            savedAlertsCount={alerts.length}
            alertAudioEnabled={alertAudioPrefs.masterEnabled}
            onToggleRegion={handleToggleRegion}
            onJumpToSection={handleJumpToSection}
            onOpenTerminal={() => handleSelectWorkspaceTab('terminal')}
            onOpenFrontend={() => handleSelectWorkspaceTab('overview')}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenAudioAlerts={() => {
              const active = stocks.find((s) => s.ticker === selectedTicker) || stocks[0];
              setAlertTarget({
                ticker: active.ticker,
                name: active.name,
                currentPrice: active.price,
                unit: active.currencyUnit || 'INR',
                initialTab: 'audio',
              });
            }}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            onOpenAccountSecurity={() => setSecurityModalOpen(true)}
            onSwitchToLanding={switchToLanding}
            onSignOut={handleSignOut}
          />

          <AdaptiveWorkspaceBar
            activeTab={showTerminalWorkspace ? 'terminal' : workspaceRouteTab}
            onSelectTab={handleSelectWorkspaceTab}
          />

          {showTerminalWorkspace ? (
            <main id="terminal-section" data-testid="terminal-workspace" className="flex-1">
              <LiveStockTerminal
                stocks={stocks}
                selectedTicker={selectedTicker}
                onSelectTicker={handleSelectPrimaryTicker}
                onAnalyzeCustomTicker={handleAnalyzeCustomTicker}
                liveFeedActive={liveFeedActive}
                onToggleLiveFeed={() => setLiveFeedActive((prev) => !prev)}
                alerts={alerts}
                comparisonTickers={comparisonTickers}
                onComparisonTickersChange={handleComparisonTickersChange}
                initialTab={terminalTabRequest.tab}
                tabRequestNonce={terminalTabRequest.nonce}
                onBackToWorkspace={() => handleSelectWorkspaceTab('overview')}
                onOpenSetAlert={(stock) =>
                  setAlertTarget({
                    ticker: stock.ticker,
                    name: stock.name,
                    currentPrice: stock.price,
                    unit: stock.currencyUnit || 'INR',
                  })
                }
              />
            </main>
          ) : workspaceRouteTab === 'portfolio' ? (
            <main id="portfolio-section" className="flex-1">
              <PortfolioTrackerPage
                stocks={stocks}
                onInspectSymbol={(sym) => {
                  handleSelectPrimaryTicker(sym);
                  handleSelectWorkspaceTab('overview');
                  setTimeout(() => handleJumpToSection('instrument-analysis'), 80);
                }}
              />
            </main>
          ) : workspaceRouteTab === 'backtest' ? (
            <main id="backtest-section" className="flex-1">
              <BacktesterLabPage />
            </main>
          ) : workspaceRouteTab === 'screener' ? (
            <main id="screener-section" className="flex-1">
              <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <VirtualizedScreenerPanel
                  onInspectSymbol={(sym) => {
                    handleSelectPrimaryTicker(sym);
                    handleOpenInTerminal(sym);
                  }}
                />
              </div>
              <MutualFundEtfScreenerSection
                externalSelectedSymbol={selectedTicker}
                onJumpToAnalysis={handleOpenInTerminal}
                onJumpToCommunity={() => handleSelectWorkspaceTab('overview')}
              />
            </main>
          ) : (
            <main id="frontend-section" data-testid="frontend-workspace" className="flex-1">
              {/* 1. Workspace Command Bar & Direct Fund Lookup */}
              <FrontendCapabilityHub
                activeRegion={activeRegion}
                onLaunchTerminal={(tab) => enterTerminal(tab || 'individual')}
                onJumpToSection={handleJumpToSection}
                onInspectTicker={(sym) => {
                  handleSelectPrimaryTicker(sym);
                  handleJumpToSection('instrument-analysis');
                }}
              />

              {/* Modular Customizable Dashboard Widgets in User-Defined Order */}
              {pinnedWidgets.map((wid) => renderModularWidget(wid))}
            </main>
          )}
        </>
      ) : (
        <main data-testid="landing-workspace" className="flex-1">
          {/* 1. Atmospheric Gradient Mesh Hero + Composited Financial Product UI */}
          <EarthHeroSection
            onOpenSearch={() => setSearchOpen(true)}
            onOpenSignup={() => {
              setAuthInitialMode('signup');
              setSignupOpen(true);
            }}
            onOpenLogin={() => {
              setAuthInitialMode('login');
              setSignupOpen(true);
            }}
            onEnterFrontend={() => enterFrontend()}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            onJumpToSection={handleJumpToSection}
            onSelectHeroTicker={handleSelectHeroTicker}
            liveFeedActive={liveFeedActive}
            activeRegion={activeRegion}
            onToggleRegion={handleToggleRegion}
            currentUser={authSession?.user || null}
            onSignOut={handleSignOut}
            savedAlertsCount={alerts.length}
          />

          {/* 2. Live AMFI Mutual Fund Screener, Peer Medians & Benchmark NAV Curve */}
          <LiveFundExplorerSection
            onOpenWorkspace={handleJumpToSection}
            onInspectSymbol={handleSelectHeroTicker}
          />

          {/* 3. Live US Treasury Yield Curve & Physical-Backed Spot Gold (PAXG/USDT) */}
          <LiveMacroBullionSection
            onOpenWorkspace={handleJumpToSection}
            onInspectSymbol={handleSelectHeroTicker}
          />

          {/* 4. Honest Workspace Access & Authenticated Terminal Entry */}
          <LandingAccessGateSection
            currentUser={authSession?.user || null}
            onOpenSignup={() => {
              setAuthInitialMode('signup');
              setSignupOpen(true);
            }}
            onOpenLogin={() => {
              setAuthInitialMode('login');
              setSignupOpen(true);
            }}
            onEnterFrontend={() => enterFrontend()}
          />
        </main>
      )}

      {/* Light Editorial Architectural Footer */}
      <RocketFooterSection
        activeRegion={activeRegion}
        onToggleRegion={handleToggleRegion}
        onJumpToSection={handleJumpToSection}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Non-blocking Obsidian Institutional Triggered Alert Banner */}
      {triggeredBanner && (() => {
        const priority = normalizeAlertPriority(triggeredBanner.alert.priority);
        const pMeta = ALERT_PRIORITY_META[priority];
        const currencyPrefix =
          (stocks.find((s) => s.ticker === triggeredBanner.alert.ticker)?.currencyUnit || 'INR') ===
          'USD'
            ? '$'
            : '₹';
        return (
          <div
            role="status"
            data-testid="triggered-alert-toast"
            className="fixed bottom-5 right-5 z-40 w-[340px] max-w-[calc(100vw-2.5rem)] rounded-[12px] bg-[#050914] text-white p-4 shadow-2xl border border-white/[0.14] flex items-start gap-3"
          >
            <span
              className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5 border border-white/[0.1]"
              style={{ backgroundColor: `${pMeta.accentHex}22`, color: pMeta.accentHex }}
            >
              <Bell className="w-4 h-4" />
            </span>
            <div className="text-xs flex-1 min-w-0">
              <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider">
                <span style={{ color: pMeta.accentHex }} className="font-semibold">
                  {pMeta.label}
                </span>
                <span className="text-white/30">·</span>
                <span className="text-[#94a3b8] inline-flex items-center gap-1">
                  {triggeredBanner.audioPlayed ? (
                    <Volume2 className="w-3 h-3 text-[#38bdf8]" />
                  ) : (
                    <VolumeX className="w-3 h-3 text-[#64748b]" />
                  )}
                  {triggeredBanner.soundLabel}
                </span>
              </div>
              <div className="font-display font-semibold text-sm text-white mt-0.5">
                {triggeredBanner.alert.ticker} threshold crossed
              </div>
              <div className="text-[#cbd5e1] mt-0.5 font-mono tabular-nums">
                {triggeredBanner.alert.condition === 'above' ? 'Above' : 'Below'}{' '}
                {currencyPrefix}
                {triggeredBanner.alert.targetPrice.toFixed(2)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTriggeredBanner(null)}
              aria-label="Dismiss triggered alert notification"
              className="text-[#94a3b8] hover:text-white cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* Interactive Modals */}
      <GlobalModals
        searchOpen={searchOpen}
        onCloseSearch={() => setSearchOpen(false)}
        signupOpen={signupOpen}
        authInitialMode={authInitialMode}
        onCloseSignup={() => setSignupOpen(false)}
        onAuthenticated={handleAuthenticated}
        fxRatesOpen={fxRatesOpen}
        onCloseFxRates={() => setFxRatesOpen(false)}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={setSelectedSymbol}
        selectedNews={selectedNews}
        onSelectNews={setSelectedNews}
        selectedIdea={selectedIdea}
        onSelectIdea={setSelectedIdea}
        onOpenInTerminal={handleOpenInTerminal}
        preferDirectTerminal={showAuthenticatedShell}
        alertTarget={alertTarget}
        onOpenAlertTarget={setAlertTarget}
        alerts={alerts}
        audioPrefs={alertAudioPrefs}
        onUpdateAudioPrefs={setAlertAudioPrefs}
        onSaveAlert={handleSaveAlert}
        onDeleteAlert={handleDeleteAlert}
        onToggleAlertNotification={handleToggleAlertNotification}
        shortcutsOpen={shortcutsOpen}
        onCloseShortcuts={() => setShortcutsOpen(false)}
        onTriggerShortcut={executeShortcutAction}
      />

      <AccountSecurityModal
        open={securityModalOpen}
        token={authSession?.token || null}
        onClose={() => setSecurityModalOpen(false)}
      />

      <CommandPaletteModal
        onSelectSymbol={(sym) => {
          handleSelectPrimaryTicker(sym);
          handleSelectWorkspaceTab('overview');
          setTimeout(() => handleJumpToSection('instrument-analysis'), 80);
        }}
        onNavigateTab={handleSelectWorkspaceTab}
      />

      <ModularLayoutDrawer />
    </div>
  );
}
