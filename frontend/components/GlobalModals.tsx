import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
import {
  ALL_SEARCHABLE_SYMBOLS,
  FOREX_PERFORMANCE_PAIRS,
} from '../data/tradingViewData';
import {
  buildSvgAreaPath,
  buildSvgPolylinePath,
  filterSymbolsByQuery,
  formatSignedPercent,
} from '../utils/marketCalculations';
import { parseFormattedPrice, PriceAlert } from '../utils/alertEngine';
import { AuthMode, AuthSession } from '../utils/authEngine';
import { CommunityIdeaItem, MarketSymbolRow, WireNewsItem } from '../types/markets';
import { ShortcutAction } from '../utils/keyboardShortcuts';
import { AlertTargetAsset, SetAlertModal } from './SetAlertModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { AuthPageModal } from '../../landing/AuthPageModal';

interface GlobalModalsProps {
  searchOpen: boolean;
  onCloseSearch: () => void;
  signupOpen: boolean;
  authInitialMode?: AuthMode;
  onCloseSignup: () => void;
  onAuthenticated?: (session: AuthSession) => void;
  fxRatesOpen: boolean;
  onCloseFxRates: () => void;
  selectedSymbol: MarketSymbolRow | null;
  onSelectSymbol: (row: MarketSymbolRow | null) => void;
  selectedNews: WireNewsItem | null;
  onSelectNews: (item: WireNewsItem | null) => void;
  selectedIdea: CommunityIdeaItem | null;
  onSelectIdea: (idea: CommunityIdeaItem | null) => void;
  onOpenInTerminal?: (ticker: string) => void;
  alertTarget?: AlertTargetAsset | null;
  onOpenAlertTarget?: (target: AlertTargetAsset | null) => void;
  alerts?: PriceAlert[];
  onSaveAlert?: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
  onDeleteAlert?: (id: string) => void;
  onToggleAlertNotification?: (id: string) => void;
  shortcutsOpen?: boolean;
  onCloseShortcuts?: () => void;
  onTriggerShortcut?: (action: ShortcutAction) => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({
  searchOpen,
  onCloseSearch,
  signupOpen,
  authInitialMode = 'signup',
  onCloseSignup,
  onAuthenticated,
  fxRatesOpen,
  onCloseFxRates,
  selectedSymbol,
  onSelectSymbol,
  selectedNews,
  onSelectNews,
  selectedIdea,
  onSelectIdea,
  onOpenInTerminal,
  alertTarget = null,
  onOpenAlertTarget,
  alerts = [],
  onSaveAlert,
  onDeleteAlert,
  onToggleAlertNotification,
  shortcutsOpen = false,
  onCloseShortcuts,
  onTriggerShortcut,
}) => {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<'all' | MarketSymbolRow['category']>('all');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseSearch();
        onCloseSignup();
        onCloseFxRates();
        onCloseShortcuts?.();
        onOpenAlertTarget?.(null);
        onSelectSymbol(null);
        onSelectNews(null);
        onSelectIdea(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    onCloseSearch,
    onCloseSignup,
    onCloseFxRates,
    onCloseShortcuts,
    onOpenAlertTarget,
    onSelectSymbol,
    onSelectNews,
    onSelectIdea,
  ]);

  const filteredSymbols = useMemo(() => {
    return filterSymbolsByQuery(
      ALL_SEARCHABLE_SYMBOLS,
      query,
      catFilter === 'all' ? undefined : catFilter
    ).slice(0, 14);
  }, [query, catFilter]);

  return (
    <>
      {/* 1. Ctrl+K Global Symbol Search Modal */}
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Global Market Symbol Search"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white text-[#131722] shadow-2xl border border-[#E0E3EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E0E3EB] flex items-center gap-3">
              <Search className="w-5 h-5 text-[#787B86] shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search symbol, company, FX pair, crypto, or commodity (e.g. NIFTY, EURUSD, CL1!)..."
                className="flex-1 text-sm text-[#131722] placeholder-[#9598A1] focus:outline-none"
              />
              <button
                type="button"
                onClick={onCloseSearch}
                aria-label="Close search"
                className="p-1.5 rounded-lg hover:bg-[#F0F3FA] text-[#787B86] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-2 border-b border-[#F0F3FA] flex flex-wrap gap-1.5 bg-[#F8F9FD]">
              {(['all', 'indices', 'indian_stocks', 'forex', 'crypto', 'futures'] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      catFilter === cat
                        ? 'bg-[#131722] text-white'
                        : 'text-[#434651] hover:bg-[#E0E3EB]'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                )
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[#F0F3FA]">
              {filteredSymbols.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#787B86]">
                  No symbols matched &ldquo;{query}&rdquo;. Try NIFTY, SENSEX, CL1!, or BTCUSD.
                </div>
              ) : (
                filteredSymbols.map((row) => (
                  <button
                    key={`${row.category}-${row.symbol}`}
                    type="button"
                    onClick={() => {
                      onSelectSymbol(row);
                      onCloseSearch();
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#F8F9FD] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: row.badgeColor }}
                      >
                        {row.badgeText}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-[#131722]">{row.symbol}</div>
                        <div className="text-xs text-[#787B86]">{row.name}</div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div className="text-sm font-semibold text-[#131722]">{row.price}</div>
                      <div
                        className={`text-xs font-semibold ${
                          row.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                        }`}
                      >
                        {formatSignedPercent(row.changePercent)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Symbol Quote Inspector Modal */}
      {selectedSymbol && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedSymbol.symbol} Quote Summary`}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white text-[#131722] p-6 shadow-2xl border border-[#E0E3EB]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-full text-white text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: selectedSymbol.badgeColor }}
                >
                  {selectedSymbol.badgeText}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#131722]">
                    {selectedSymbol.name} ({selectedSymbol.symbol})
                  </h3>
                  <div className="text-xs text-[#787B86] uppercase">{selectedSymbol.category.replace('_', ' ')}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectSymbol(null)}
                aria-label="Close quote modal"
                className="p-1.5 rounded-lg hover:bg-[#F0F3FA] text-[#787B86] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-baseline gap-2 mb-4 tabular-nums">
              <span className="text-3xl font-bold text-[#131722]">{selectedSymbol.price}</span>
              <span className="text-xs text-[#787B86]">{selectedSymbol.unit}</span>
              <span
                className={`text-sm font-bold ${
                  selectedSymbol.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                }`}
              >
                {formatSignedPercent(selectedSymbol.changePercent)}
              </span>
            </div>

            <svg viewBox="0 0 420 120" className="w-full h-28 mb-4 bg-[#F8F9FD] rounded-xl p-2">
              <path
                d={buildSvgAreaPath(selectedSymbol.sparkline, 410, 108, 8)}
                fill={selectedSymbol.changePercent >= 0 ? 'rgba(8, 153, 129, 0.16)' : 'rgba(242, 54, 69, 0.16)'}
              />
              <path
                d={buildSvgPolylinePath(selectedSymbol.sparkline, 410, 108, 8)}
                fill="none"
                stroke={selectedSymbol.changePercent >= 0 ? '#089981' : '#F23645'}
                strokeWidth="2.2"
              />
            </svg>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {onOpenAlertTarget && (
                <button
                  type="button"
                  onClick={() => {
                    const sym = selectedSymbol;
                    onSelectSymbol(null);
                    onOpenAlertTarget({
                      ticker: sym.symbol,
                      name: sym.name,
                      currentPrice: parseFormattedPrice(sym.price),
                      unit: sym.unit,
                    });
                  }}
                  className="px-4 py-2 rounded-lg border border-[#E0E3EB] text-[#131722] text-xs font-semibold hover:bg-[#F8F9FD] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-[#2962FF]" />
                  <span>Set Alert</span>
                </button>
              )}
              {onOpenInTerminal && (
                <button
                  type="button"
                  onClick={() => {
                    const sym = selectedSymbol.symbol;
                    onSelectSymbol(null);
                    onOpenInTerminal(sym);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#2962FF] text-white text-xs font-semibold hover:bg-[#1E53E5] cursor-pointer"
                >
                  Run Full Stock Analysis
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectSymbol(null)}
                className="px-4 py-2 rounded-lg bg-[#131722] text-white text-xs font-semibold hover:bg-[#2A2E39] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Wire News Reader Modal */}
      {selectedNews && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Market News Briefing"
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white text-[#131722] p-6 shadow-2xl border border-[#E0E3EB]">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="text-xs font-medium text-[#787B86]">
                {selectedNews.timeAgo} · {selectedNews.source}
              </div>
              <button
                type="button"
                onClick={() => onSelectNews(null)}
                aria-label="Close news modal"
                className="p-1.5 rounded-lg hover:bg-[#F0F3FA] text-[#787B86] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-[#131722] mb-3 leading-snug">
              {selectedNews.headline}
            </h3>
            <p className="text-sm text-[#434651] leading-relaxed mb-4">{selectedNews.summary}</p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {selectedNews.tickers.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded bg-[#F0F3FA] text-xs font-mono font-semibold text-[#131722]"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onSelectNews(null)}
                className="px-4 py-2 rounded-lg bg-[#2962FF] text-white text-xs font-semibold hover:bg-[#1E53E5] cursor-pointer"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Community Idea Detail Modal */}
      {selectedIdea && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Community Trade Idea"
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white text-[#131722] p-6 shadow-2xl border border-[#E0E3EB]">
            <div className="flex items-start justify-between gap-4 mb-2">
              <span className="text-xs font-mono font-bold text-[#2962FF]">{selectedIdea.symbol}</span>
              <button
                type="button"
                onClick={() => onSelectIdea(null)}
                aria-label="Close idea modal"
                className="p-1.5 rounded-lg hover:bg-[#F0F3FA] text-[#787B86] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-[#131722] mb-2">{selectedIdea.title}</h3>
            <p className="text-sm text-[#434651] leading-relaxed mb-4">{selectedIdea.description}</p>
            <div className="text-xs text-[#787B86] flex items-center justify-between pt-3 border-t border-[#F0F3FA]">
              <span>Author: {selectedIdea.author} · {selectedIdea.timeLabel}</span>
              <button
                type="button"
                onClick={() => onSelectIdea(null)}
                className="px-4 py-1.5 rounded-lg bg-[#131722] text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Full Forex Rates Modal ("See all rates >") */}
      {fxRatesOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All Major Forex Spot Rates"
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <div className="w-full max-w-xl rounded-2xl bg-white text-[#131722] p-6 shadow-2xl border border-[#E0E3EB]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#131722]">Global Forex Spot Rates</h3>
              <button
                type="button"
                onClick={onCloseFxRates}
                aria-label="Close forex rates modal"
                className="p-1.5 rounded-lg hover:bg-[#F0F3FA] text-[#787B86] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-[#F0F3FA] text-sm tabular-nums">
              {FOREX_PERFORMANCE_PAIRS.map((fx) => (
                <div key={fx.pair} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span>
                      {fx.baseFlag}
                      {fx.quoteFlag}
                    </span>
                    <span className="font-mono font-bold text-[#131722]">{fx.pair}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-mono text-[#131722]">{fx.spotRate}</span>
                    <span
                      className={`font-mono font-semibold w-16 text-right ${
                        fx.returns['1D'] >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                      }`}
                    >
                      {formatSignedPercent(fx.returns['1D'])}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Split-Pane Authentication Page (Sign up / Log in) */}
      <AuthPageModal
        open={signupOpen}
        initialMode={authInitialMode}
        onClose={onCloseSignup}
        onAuthenticated={(session) => onAuthenticated?.(session)}
      />

      {/* 7. Target Price Set Alert Modal */}
      {onOpenAlertTarget && onSaveAlert && onDeleteAlert && onToggleAlertNotification && (
        <SetAlertModal
          target={alertTarget}
          alerts={alerts}
          onClose={() => onOpenAlertTarget(null)}
          onSaveAlert={onSaveAlert}
          onDeleteAlert={onDeleteAlert}
          onToggleAlertNotification={onToggleAlertNotification}
        />
      )}

      {/* 8. Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => onCloseShortcuts?.()}
        onTriggerShortcut={onTriggerShortcut}
      />
    </>
  );
};
