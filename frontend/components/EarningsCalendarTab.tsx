import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronRight, RefreshCw, Search } from 'lucide-react';
import {
  buildUpcomingEarningsCalendar,
  computeCountdownParts,
  EarningsCalendarEvent,
  EarningsMarketScope,
  filterEarningsEvents,
} from '../utils/earningsEngine';

interface EarningsCalendarTabProps {
  onAnalyzeTicker?: (ticker: string) => void;
}

const MARKET_FILTERS: Array<{ id: EarningsMarketScope; label: string }> = [
  { id: 'all', label: 'All 4 Pillars' },
  { id: 'us', label: 'Global ETFs & Fed' },
  { id: 'india', label: 'India AMFI & RBI' },
];

export const EarningsCalendarTab: React.FC<EarningsCalendarTabProps> = ({
  onAnalyzeTicker,
}) => {
  const [events, setEvents] = useState<EarningsCalendarEvent[]>(() =>
    buildUpcomingEarningsCalendar()
  );
  const [sourceLabel, setSourceLabel] = useState<string>('Consensus Schedule');
  const [marketScope, setMarketScope] = useState<EarningsMarketScope>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const fetchEarnings = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const url = forceRefresh
        ? '/api/policy-calendar?refresh=1'
        : '/api/policy-calendar';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        source?: string;
        events?: EarningsCalendarEvent[];
      };
      if (Array.isArray(data.events) && data.events.length > 0) {
        setEvents(data.events);
        setSourceLabel(
          data.source === 'finnhub-etf-calendar'
            ? 'Live ETF & Policy Feed'
            : 'Financia 4-Pillar Policy Schedule'
        );
      }
    } catch {
      setErrorMsg('Live policy calendar endpoint unavailable — showing cached 4-pillar schedule.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings(false);
  }, [fetchEarnings]);

  // Real-time 1-second countdown ticker
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredEvents = useMemo(
    () => filterEarningsEvents(events, marketScope, searchQuery),
    [events, marketScope, searchQuery]
  );

  return (
    <section
      id="earnings-calendar-panel"
      data-testid="earnings-calendar-tab-panel"
      aria-label="Upcoming NFO, SGB & Policy Calendar"
      className="rounded-2xl border border-[#E0E3EB] bg-white p-5 md:p-6"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#F0F3FA]">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-[#2962FF]" aria-hidden="true" />
            <h2 className="text-xl md:text-2xl font-display font-bold text-[#131722]">
              NFO, SGB &amp; Policy Calendar
            </h2>
          </div>
          <p className="text-xs text-[#787B86] mt-1 flex flex-wrap items-center gap-1.5 tabular-nums">
            <span>{filteredEvents.length} upcoming releases</span>
            <span aria-hidden="true">·</span>
            <span>{sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Live release countdowns</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter earnings by market"
            className="inline-flex items-center p-1 rounded-lg bg-[#F0F3FA] gap-1"
          >
            {MARKET_FILTERS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={marketScope === opt.id}
                onClick={() => setMarketScope(opt.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  marketScope === opt.id
                    ? 'bg-[#131722] text-white'
                    : 'text-[#434651] hover:text-[#131722]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchEarnings(true)}
            disabled={isLoading}
            aria-label="Refresh earnings schedule"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E0E3EB] text-xs font-semibold text-[#131722] hover:bg-[#F8F9FD] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Input Row */}
      <div className="py-3 border-b border-[#F0F3FA] flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search
            className="w-4 h-4 text-[#787B86] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by ticker or company (e.g., NVDA, TCS)..."
            aria-label="Search upcoming earnings"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E0E3EB] bg-[#F8F9FD] text-xs text-[#131722] placeholder:text-[#787B86] focus:outline-none focus:border-[#2962FF]"
          />
        </div>

        <div className="text-[11px] text-[#787B86] tabular-nums">
          BMO = Before Market Open · AMC = After Market Close
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 text-xs text-[#D97706]" role="status">
          {errorMsg}
        </div>
      )}

      {/* Loading State */}
      {isLoading && events.length === 0 ? (
        <div className="py-6 space-y-3" aria-busy="true">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="h-12 rounded-lg bg-[#F0F3FA] animate-pulse" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        /* Empty Search State */
        <div className="py-12 text-center">
          <p className="text-sm font-semibold text-[#131722]">
            No upcoming earnings match &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="text-xs text-[#787B86] mt-1">
            Try clearing the filter or switching back to All Markets.
          </p>
          <button
            type="button"
            onClick={() => {
              setMarketScope('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-[#131722] text-white text-xs font-semibold hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Data Table */
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E0E3EB] text-[11px] font-semibold text-[#787B86] uppercase tracking-wide">
                <th className="py-3 pr-4">Ticker &amp; Quarter</th>
                <th className="py-3 px-4">Release Window</th>
                <th className="py-3 px-4">Countdown</th>
                <th className="py-3 px-4 text-right">EPS Est. / Prior</th>
                <th className="py-3 px-4 text-right">Revenue Est.</th>
                <th className="py-3 pl-4 text-right">Research</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F3FA] text-sm tabular-nums">
              {filteredEvents.map((ev) => {
                const cd = computeCountdownParts(ev.reportDateIso, nowMs);
                return (
                  <tr
                    key={ev.id}
                    data-ticker={ev.ticker}
                    className="hover:bg-[#F8F9FD] transition-colors"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-9 h-9 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: ev.badgeColor }}
                        >
                          {ev.ticker.slice(0, 3)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-[#131722] flex items-center gap-1.5">
                            <span>{ev.ticker}</span>
                            <span className="text-[11px] font-mono font-normal text-[#787B86]">
                              {ev.exchange} · {ev.fiscalQuarter}
                            </span>
                          </div>
                          <div className="text-xs text-[#434651] truncate max-w-[220px]">
                            {ev.companyName}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-[#131722]">{ev.dateLabel}</div>
                      <div className="text-[11px] font-mono text-[#787B86]">
                        {ev.session === 'BMO' ? 'Before Open (BMO)' : 'After Close (AMC)'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div
                        data-testid={`countdown-${ev.ticker}`}
                        className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold ${
                          cd.isDue
                            ? 'text-[#089981]'
                            : cd.isSoon
                              ? 'text-[#D97706]'
                              : 'text-[#131722]'
                        }`}
                      >
                        <span>{cd.formatted}</span>
                        {cd.isSoon && !cd.isDue && (
                          <span className="font-sans text-[11px] font-medium text-[#D97706]">
                            · Soon
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                      <div className="text-xs font-semibold text-[#131722]">{ev.epsEstimate}</div>
                      <div className="text-[11px] text-[#787B86]">Prior {ev.priorEps}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-[#131722] whitespace-nowrap">
                      {ev.revenueEstimate}
                    </td>

                    <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onAnalyzeTicker?.(ev.ticker)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F0F3FA] hover:bg-[#131722] text-[#131722] hover:text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>Analyze</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
