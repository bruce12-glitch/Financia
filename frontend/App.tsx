import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  EarthHeroSection,
  LandingAccessGateSection,
  LandingCapabilitiesSection,
  LandingSentimentSection,
  RocketFooterSection,
  SuperchartsSection,
} from '../landing';
import { FrontendWorkspaceHeader } from './components/FrontendWorkspaceHeader';
import { GlobalExchangesGlobeSection } from './components/GlobalExchangesGlobeSection';
import { LiveStockTerminal } from './components/LiveStockTerminal';
import { MarketSummaryAndIdeas } from './components/MarketSummaryAndIdeas';
import { MarketsSections } from './components/MarketsSections';
import { GlobalModals } from './components/GlobalModals';
import { AlertTargetAsset } from './components/SetAlertModal';
import { INITIAL_STOCKS } from './data/marketData';
import { ALL_SEARCHABLE_SYMBOLS } from './data/tradingViewData';
import {
  evaluateAlertTrigger,
  loadSavedAlerts,
  persistAlerts,
  PriceAlert,
} from './utils/alertEngine';
import {
  AuthMode,
  AuthSession,
  clearAuthSession,
  loadStoredAuthSession,
  persistAuthSession,
} from './utils/authEngine';
import {
  resolveKeyboardShortcutAction,
  ShortcutAction,
} from './utils/keyboardShortcuts';
import { synthesizeCustomTickerReport } from './utils/stockEngine';
import { StockQuote } from './types/financia';
import { CommunityIdeaItem, MarketSymbolRow, WireNewsItem } from './types/markets';

export default function App() {
  const [stocks, setStocks] = useState<StockQuote[]>(INITIAL_STOCKS);
  const [selectedTicker, setSelectedTicker] = useState<string>('GOLDBEES');
  const [liveFeedActive, setLiveFeedActive] = useState<boolean>(true);

  const [searchOpen, setSearchOpen] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadStoredAuthSession());
  const [activeView, setActiveView] = useState<'landing' | 'frontend'>(() => {
    const stored = loadStoredAuthSession();
    if (!stored) return 'landing';
    if (typeof window !== 'undefined' && window.location.search.includes('view=landing')) {
      return 'landing';
    }
    return 'frontend';
  });
  const [signupOpen, setSignupOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('auth');
      if (p === 'signup' || p === 'login') return true;
      if (window.location.pathname.startsWith('/frontend') && !loadStoredAuthSession()) {
        return true;
      }
    }
    return false;
  });
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('auth');
      if (p === 'login') return 'login';
      if (window.location.pathname.startsWith('/frontend') && !loadStoredAuthSession()) {
        return 'login';
      }
    }
    return 'signup';
  });

  const pendingSectionRef = useRef<string | null>(null);

  const [fxRatesOpen, setFxRatesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState<'IN' | 'GLOBAL'>('IN');
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbolRow | null>(null);
  const [selectedNews, setSelectedNews] = useState<WireNewsItem | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<CommunityIdeaItem | null>(null);

  const [alerts, setAlerts] = useState<PriceAlert[]>(() => loadSavedAlerts());
  const [comparisonTickers, setComparisonTickers] = useState<string[]>([]);
  const [alertTarget, setAlertTarget] = useState<AlertTargetAsset | null>(null);
  const [triggeredBanner, setTriggeredBanner] = useState<PriceAlert | null>(null);

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
        if (Array.isArray(wlPayload.watchlist?.comparisonTickers)) {
          setComparisonTickers(wlPayload.watchlist.comparisonTickers);
        }
      }
    } catch {
      // Keep local workspace state gracefully if offline
    }
  }, []);

  // Sync URL with authenticated workspace view & handle browser Back/Forward
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (authSession && activeView === 'frontend' && !window.location.pathname.startsWith('/frontend')) {
      window.history.replaceState(null, '', '/frontend');
    } else if (!authSession && window.location.pathname.startsWith('/frontend')) {
      window.history.replaceState(null, '', '/');
    }
  }, [authSession, activeView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const wantsFrontend = window.location.pathname.startsWith('/frontend');
      if (wantsFrontend && authSession) {
        setActiveView('frontend');
      } else if (wantsFrontend && !authSession) {
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
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/frontend')) {
            window.history.replaceState(null, '', '/');
          }
        }
      })
      .catch(() => {
        // Keep local stored session seamlessly
      });
  }, [syncWorkspaceFromServer]);

  // Persist user price alerts across sessions
  useEffect(() => {
    persistAlerts(alerts);
  }, [alerts]);

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

  const switchToLanding = useCallback(() => {
    setActiveView('landing');
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/frontend')) {
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
      enterFrontend(target);
    },
    [enterFrontend, syncWorkspaceFromServer]
  );

  const handleSignOut = useCallback(async () => {
    const token = authSession?.token;
    pendingSectionRef.current = null;
    clearAuthSession();
    setAuthSession(null);
    setActiveView('landing');
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/frontend')) {
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
      const frontendSections = new Set([
        'live-terminal',
        'market-summary',
        'markets',
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
    [authSession, activeView, enterFrontend]
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

  // Evaluate armed price alerts against live stock ticks
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
      setAlerts(updated);
      setTriggeredBanner(newlyTriggered);
    }
  }, [stocks, alerts]);

  // Enrich active asset with live AMFI MFAPI / Marketstack / Binance backend data
  useEffect(() => {
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
              return [analyzedStock, ...prev.slice(0, 5)];
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
        return [synthesized, ...prev.slice(0, 5)];
      });
      setSelectedTicker(synthesized.ticker);
    },
    [stocks]
  );

  const handleOpenInTerminal = useCallback(
    (ticker: string) => {
      handleAnalyzeCustomTicker(ticker, 'perseus');
      handleJumpToSection('live-terminal');
    },
    [handleAnalyzeCustomTicker, handleJumpToSection]
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

  const showFrontendWorkspace = Boolean(authSession && activeView === 'frontend');

  return (
    <div className="min-h-screen bg-white text-[#131722] flex flex-col">
      {showFrontendWorkspace && authSession ? (
        <>
          <FrontendWorkspaceHeader
            currentUser={authSession.user}
            activeRegion={activeRegion}
            savedAlertsCount={alerts.length}
            onToggleRegion={handleToggleRegion}
            onJumpToSection={handleJumpToSection}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            onSwitchToLanding={switchToLanding}
            onSignOut={handleSignOut}
          />

          <main id="frontend-section" data-testid="frontend-workspace" className="flex-1">
            {/* 1. Financia Multi-Agent Mutual Fund, Gold, Debt & ETF Analysis Terminal */}
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
              onOpenSetAlert={(stock) =>
                setAlertTarget({
                  ticker: stock.ticker,
                  name: stock.name,
                  currentPrice: stock.price,
                  unit: stock.currencyUnit || 'INR',
                })
              }
            />

            {/* 2. Market Summary, ETFs, Gold Allocation, Debt Yields, NFOs & Top Stories */}
            <MarketSummaryAndIdeas
              onSelectSymbol={setSelectedSymbol}
              onSelectNews={setSelectedNews}
              onSelectIdea={setSelectedIdea}
              liveFeedActive={liveFeedActive}
            />

            {/* 3. Direct Mutual Funds, Gold & Bullion, Debt Funds, FX Hedging & Macro Inflation */}
            <MarketsSections
              onSelectSymbol={setSelectedSymbol}
              onSelectNews={setSelectedNews}
              onSelectIdea={setSelectedIdea}
              onOpenFxRatesModal={() => setFxRatesOpen(true)}
              onJumpToAnalysis={handleOpenInTerminal}
            />

            {/* 4. Interactive 3D Global Fund, ETF & Bullion Hubs Explorer Globe */}
            <GlobalExchangesGlobeSection onJumpToAnalysis={handleOpenInTerminal} />
          </main>
        </>
      ) : (
        <main data-testid="landing-workspace" className="flex-1">
          {/* 1. Orbital Earth Video Hero + Docked Search Horizon + Moving Market Marquee */}
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

          {/* 2. Supercharged Supercharts Interactive Multi-Pane Showcase */}
          <SuperchartsSection
            onSelectSymbol={handleSelectHeroTicker}
            onOpenTerminal={handleOpenInTerminal}
          />

          {/* 3. Real-Time Market Sentiment Gauge (News Volume & Price Trends) */}
          <LandingSentimentSection
            onSelectNews={setSelectedNews}
            onRequestWorkspace={handleJumpToSection}
          />

          {/* 4. Institutional Multi-Agent & 3D World Architecture Bento */}
          <LandingCapabilitiesSection
            onRequestWorkspace={(sectionId, ticker) => {
              if (ticker) setSelectedTicker(ticker);
              handleJumpToSection(sectionId);
            }}
            onInspectSymbol={handleSelectHeroTicker}
          />

          {/* 4. Authenticated Frontend & 3D World Entry Gate */}
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

      {/* Bottom Rocket Launch Horizon & LOOK FIRST / THEN LEAP. Footer */}
      <RocketFooterSection
        activeRegion={activeRegion}
        onToggleRegion={handleToggleRegion}
        onJumpToSection={handleJumpToSection}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Non-blocking Triggered Alert Banner */}
      {triggeredBanner && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-40 max-w-sm rounded-xl bg-[#131722] text-white p-4 shadow-2xl border border-white/15 flex items-start gap-3"
        >
          <Bell className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
          <div className="text-xs flex-1">
            <div className="font-bold">
              Price Alert Triggered · {triggeredBanner.ticker}
            </div>
            <div className="text-[#CBD5E1] mt-0.5 tabular-nums">
              Crossed {triggeredBanner.condition}{' '}
              {(stocks.find((s) => s.ticker === triggeredBanner.ticker)?.currencyUnit || 'INR') === 'USD'
                ? '$'
                : '₹'}
              {triggeredBanner.targetPrice.toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTriggeredBanner(null)}
            aria-label="Dismiss triggered alert notification"
            className="text-[#94A3B8] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
        alertTarget={alertTarget}
        onOpenAlertTarget={setAlertTarget}
        alerts={alerts}
        onSaveAlert={handleSaveAlert}
        onDeleteAlert={handleDeleteAlert}
        onToggleAlertNotification={handleToggleAlertNotification}
        shortcutsOpen={shortcutsOpen}
        onCloseShortcuts={() => setShortcutsOpen(false)}
        onTriggerShortcut={executeShortcutAction}
      />
    </div>
  );
}
