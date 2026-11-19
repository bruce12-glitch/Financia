import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Plus, Settings, SlidersHorizontal, X } from 'lucide-react';
import { StockQuote } from '../types/financia';
import { PriceAlert } from '../utils/alertEngine';
import {
  buildMultiTickerComparisonSeries,
  calculateBollingerBands,
  calculateSMA,
  formatCurrency,
  getSeriesForTimeframe,
  summarizeRSIZone,
  synthesizeCustomTickerReport,
  validateTickerInput,
} from '../utils/stockEngine';

interface TerminalMainChartCardProps {
  activeStock: StockQuote;
  stocks: StockQuote[];
  alerts: PriceAlert[];
  comparisonTickers?: string[];
  onComparisonTickersChange?: (nextTickers: string[]) => void;
  onOpenSetAlert?: (stock: StockQuote) => void;
}

const MAX_SECONDARY_TICKERS = 4;

export const TerminalMainChartCard: React.FC<TerminalMainChartCardProps> = ({
  activeStock,
  stocks,
  alerts,
  comparisonTickers,
  onComparisonTickersChange,
  onOpenSetAlert,
}) => {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '4M' | '1Y'>('4M');
  const [showSMA, setShowSMA] = useState<boolean>(true);
  const [showBollinger, setShowBollinger] = useState<boolean>(false);
  const [showRSI, setShowRSI] = useState<boolean>(true);
  const [rsiPeriod, setRsiPeriod] = useState<4 | 6 | 14>(4);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // Secondary tickers added for side-by-side comparison (enriched by /api/funds/analyze)
  const [customSecondaryQuotes, setCustomSecondaryQuotes] = useState<StockQuote[]>([]);
  const [compareInput, setCompareInput] = useState<string>('');
  const [compareError, setCompareError] = useState<string | null>(null);

  const settingsPopoverRef = useRef<HTMLDivElement | null>(null);

  // Hydrate externally persisted comparison tickers (e.g. from /api/watchlist on reload)
  useEffect(() => {
    if (!comparisonTickers) return;
    const desired = comparisonTickers.map((t) => t.toUpperCase());
    setCustomSecondaryQuotes((prev) => {
      const map = new Map(prev.map((q) => [q.ticker.toUpperCase(), q]));
      return desired.map((sym) => map.get(sym) || synthesizeCustomTickerReport(sym, stocks));
    });
    desired.forEach((sym) => {
      fetch(`/api/funds/analyze?ticker=${encodeURIComponent(sym)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { stock?: StockQuote } | null) => {
          if (!data?.stock) return;
          setCustomSecondaryQuotes((prev) =>
            prev.map((q) => (q.ticker.toUpperCase() === sym ? data.stock! : q))
          );
        })
        .catch(() => {
          // Keep synthetic baseline silently
        });
    });
  }, [comparisonTickers, stocks]);

  // Close settings popover on outside click or Escape key
  useEffect(() => {
    if (!settingsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        settingsPopoverRef.current &&
        !settingsPopoverRef.current.contains(event.target as Node)
      ) {
        setSettingsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsOpen]);

  // Keep secondary comparisons synced with live watchlist ticks and never duplicate primary
  const activeSecondaryStocks = useMemo(() => {
    const primaryUpper = activeStock.ticker.toUpperCase();
    return customSecondaryQuotes
      .filter((item) => item.ticker.toUpperCase() !== primaryUpper)
      .map((item) => {
        const liveMatch = stocks.find(
          (s) => s.ticker.toUpperCase() === item.ticker.toUpperCase()
        );
        return liveMatch || item;
      });
  }, [customSecondaryQuotes, stocks, activeStock.ticker]);

  const isComparing = activeSecondaryStocks.length > 0;

  const report = activeStock.report;
  const chartSeries = useMemo(() => {
    return getSeriesForTimeframe(report.financial_charts.stock_price_4m, timeframe);
  }, [report.financial_charts.stock_price_4m, timeframe]);

  const pricesOnly = useMemo(() => chartSeries.map((d) => d.price), [chartSeries]);
  const smaSeries = useMemo(() => calculateSMA(pricesOnly, 4), [pricesOnly]);
  const bollingerSeries = useMemo(
    () => calculateBollingerBands(pricesOnly, 4, 1.8),
    [pricesOnly]
  );

  // Unified multi-ticker & RSI comparison dataset
  const comparisonData = useMemo(() => {
    return buildMultiTickerComparisonSeries(
      activeStock,
      activeSecondaryStocks,
      timeframe,
      rsiPeriod
    );
  }, [activeStock, activeSecondaryStocks, timeframe, rsiPeriod]);

  const primaryComparison = comparisonData.tickers[0];
  const primaryRsiSeries = primaryComparison?.rsiSeries || [];

  // Quick-add watchlist suggestions excluding primary and already added tickers
  const quickCompareOptions = useMemo(() => {
    const taken = new Set<string>([
      activeStock.ticker.toUpperCase(),
      ...activeSecondaryStocks.map((s) => s.ticker.toUpperCase()),
    ]);
    return stocks.filter((s) => !taken.has(s.ticker.toUpperCase())).slice(0, 4);
  }, [stocks, activeStock.ticker, activeSecondaryStocks]);

  const addSecondaryTicker = (rawSymbol: string) => {
    const validation = validateTickerInput(rawSymbol);
    if (!validation.valid) {
      setCompareError(validation.error || 'Enter a valid ticker symbol.');
      return;
    }
    const sym = validation.normalized;
    if (sym === activeStock.ticker.toUpperCase()) {
      setCompareError(`${sym} is already the primary chart ticker.`);
      return;
    }
    if (activeSecondaryStocks.some((s) => s.ticker.toUpperCase() === sym)) {
      setCompareError(`${sym} is already plotted in comparison.`);
      return;
    }
    if (activeSecondaryStocks.length >= MAX_SECONDARY_TICKERS) {
      setCompareError(`Up to ${MAX_SECONDARY_TICKERS} secondary tickers can be compared at once.`);
      return;
    }

    const quote = synthesizeCustomTickerReport(sym, stocks);
    const nextList = [
      ...customSecondaryQuotes.filter((item) => item.ticker.toUpperCase() !== sym),
      quote,
    ];
    setCustomSecondaryQuotes(nextList);
    onComparisonTickersChange?.(nextList.map((q) => q.ticker.toUpperCase()));
    setCompareInput('');
    setCompareError(null);

    fetch(`/api/funds/analyze?ticker=${encodeURIComponent(sym)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stock?: StockQuote } | null) => {
        if (!data?.stock) return;
        setCustomSecondaryQuotes((prev) =>
          prev.map((item) => (item.ticker.toUpperCase() === sym ? data.stock! : item))
        );
      })
      .catch(() => {
        // Keep synthesized comparison curve seamlessly
      });
  };

  const removeSecondaryTicker = (ticker: string) => {
    const target = ticker.toUpperCase();
    const nextList = customSecondaryQuotes.filter((item) => item.ticker.toUpperCase() !== target);
    setCustomSecondaryQuotes(nextList);
    onComparisonTickersChange?.(nextList.map((q) => q.ticker.toUpperCase()));
    setCompareError(null);
  };

  const handleCompareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSecondaryTicker(compareInput);
  };

  // SVG Chart Geometry Calculations
  const svgWidth = 760;
  const svgHeight = showRSI ? 346 : 270;
  const padLeft = 56;
  const padRight = showRSI ? 44 : 20;
  const padTop = 20;
  const pricePlotH = showRSI ? 176 : 212;
  const rsiTop = 222;
  const rsiPlotH = 82;
  const plotW = svgWidth - padLeft - padRight;

  const minPrice = useMemo(() => {
    const lows = chartSeries.map((c) => c.low);
    const bLows = showBollinger
      ? bollingerSeries.map((b) => b.lower).filter((v): v is number => v !== null)
      : [];
    return Math.min(...lows, ...(bLows.length ? bLows : lows)) * 0.985;
  }, [chartSeries, bollingerSeries, showBollinger]);

  const maxPrice = useMemo(() => {
    const highs = chartSeries.map((c) => c.high);
    const bHighs = showBollinger
      ? bollingerSeries.map((b) => b.upper).filter((v): v is number => v !== null)
      : [];
    return Math.max(...highs, ...(bHighs.length ? bHighs : highs)) * 1.015;
  }, [chartSeries, bollingerSeries, showBollinger]);

  const maxVol = useMemo(() => {
    return Math.max(...chartSeries.map((c) => c.volume), 1);
  }, [chartSeries]);

  const pointCount = Math.max(chartSeries.length, comparisonData.dates.length);

  const getX = (index: number) => {
    if (pointCount <= 1) return padLeft;
    return padLeft + (index / (pointCount - 1)) * plotW;
  };

  const getPriceY = (price: number) => {
    const range = Math.max(maxPrice - minPrice, 0.01);
    return padTop + pricePlotH - ((price - minPrice) / range) * pricePlotH;
  };

  const getPctY = (pct: number) => {
    const range = Math.max(comparisonData.maxPct - comparisonData.minPct, 0.01);
    return padTop + pricePlotH - ((pct - comparisonData.minPct) / range) * pricePlotH;
  };

  const getRsiY = (rsi: number) => {
    const clamped = Math.max(0, Math.min(100, rsi));
    return rsiTop + rsiPlotH - (clamped / 100) * rsiPlotH;
  };

  // Single-ticker paths
  const linePath = useMemo(() => {
    if (chartSeries.length === 0) return '';
    return chartSeries
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getPriceY(pt.price).toFixed(1)}`)
      .join(' ');
  }, [chartSeries, minPrice, maxPrice, pricePlotH, padRight]);

  const areaPath = useMemo(() => {
    if (!linePath || chartSeries.length === 0) return '';
    const lastX = getX(chartSeries.length - 1).toFixed(1);
    const firstX = getX(0).toFixed(1);
    const bottomY = (padTop + pricePlotH).toFixed(1);
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, chartSeries, pricePlotH, padRight]);

  const smaPath = useMemo(() => {
    const validPoints: string[] = [];
    smaSeries.forEach((val, idx) => {
      if (val !== null) {
        validPoints.push(
          `${validPoints.length === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getPriceY(val).toFixed(1)}`
        );
      }
    });
    return validPoints.join(' ');
  }, [smaSeries, minPrice, maxPrice, pricePlotH, padRight]);

  const bollingerUpperPath = useMemo(() => {
    const pts: string[] = [];
    bollingerSeries.forEach((b, idx) => {
      if (b.upper !== null) {
        pts.push(
          `${pts.length === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getPriceY(b.upper).toFixed(1)}`
        );
      }
    });
    return pts.join(' ');
  }, [bollingerSeries, minPrice, maxPrice, pricePlotH, padRight]);

  const bollingerLowerPath = useMemo(() => {
    const pts: string[] = [];
    bollingerSeries.forEach((b, idx) => {
      if (b.lower !== null) {
        pts.push(
          `${pts.length === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getPriceY(b.lower).toFixed(1)}`
        );
      }
    });
    return pts.join(' ');
  }, [bollingerSeries, minPrice, maxPrice, pricePlotH, padRight]);

  const activeIdx =
    hoveredPointIdx !== null && hoveredPointIdx < pointCount
      ? hoveredPointIdx
      : Math.max(0, pointCount - 1);

  const activePoint = chartSeries[activeIdx] || chartSeries[chartSeries.length - 1];
  const activeRsiValue =
    primaryRsiSeries[activeIdx] ??
    [...primaryRsiSeries].reverse().find((v) => v !== null) ??
    null;
  const rsiSummary = summarizeRSIZone(activeRsiValue);

  const activeAlertCount = alerts.filter((a) => a.ticker === activeStock.ticker).length;

  return (
    <div
      className="rounded-xl bg-white border border-[#E5E7EB] p-6"
      data-testid="terminal-main-chart-card"
    >
      {/* Top Header & Controls */}
      <div className="flex flex-col gap-4 pb-4 mb-4 border-b border-[#F3F4F6]">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h3 className="text-xl font-display font-bold text-[#131722] leading-snug break-words">
                {activeStock.name} ({activeStock.ticker})
              </h3>
              <span className="text-xs text-[#6B7280] whitespace-nowrap shrink-0">
                · {activeStock.sector}
              </span>
              {activeStock.dataSource && (
                <span className="text-[11px] font-mono text-[#2962FF] whitespace-nowrap shrink-0">
                  · {activeStock.dataSource}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1.5">
              <span className="text-3xl font-mono font-bold text-[#131722] tabular-nums whitespace-nowrap">
                {formatCurrency(
                  activePoint ? activePoint.price : activeStock.price,
                  2,
                  activeStock.currencyUnit || 'USD'
                )}
              </span>
              <span
                className={`text-sm font-mono font-medium tabular-nums whitespace-nowrap ${
                  activeStock.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                }`}
              >
                {activeStock.change >= 0 ? '+' : ''}
                {activeStock.change.toFixed(2)} ({activeStock.changePercent >= 0 ? '+' : ''}
                {activeStock.changePercent.toFixed(2)}%)
              </span>
              {activePoint && (
                <span className="text-xs font-mono text-[#6B7280] tabular-nums whitespace-nowrap">
                  · {activePoint.date} · Vol {activePoint.volume}M
                </span>
              )}
              {showRSI && (
                <span
                  className="text-xs font-mono font-semibold tabular-nums whitespace-nowrap"
                  style={{ color: rsiSummary.color }}
                  data-testid="header-rsi-readout"
                >
                  · RSI({comparisonData.effectiveRsiPeriod}){' '}
                  {activeRsiValue !== null ? activeRsiValue.toFixed(1) : '--'} ({rsiSummary.label})
                </span>
              )}
            </div>
          </div>

          {onOpenSetAlert && (
            <button
              type="button"
              onClick={() => onOpenSetAlert(activeStock)}
              className="self-start px-3 py-1.5 rounded-lg bg-[#2962FF] hover:bg-[#1E53E5] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{activeAlertCount > 0 ? `Set Alert (${activeAlertCount})` : 'Set Alert'}</span>
            </button>
          )}
        </div>

        {/* Single-Row Toolbar: Timeframes + Indicator Toggles + Anchored Settings */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Chart Timeframe"
            className="inline-flex items-center p-1 rounded-lg bg-[#F4F5F7] border border-[#E5E7EB]"
          >
            {(['1D', '1W', '1M', '4M', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  setTimeframe(tf);
                  setHoveredPointIdx(null);
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  timeframe === tf
                    ? 'bg-[#131722] text-white font-semibold'
                    : 'text-[#4B5563] hover:text-[#131722]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSMA((prev) => !prev)}
              disabled={isComparing}
              aria-pressed={showSMA && !isComparing}
              title={
                isComparing
                  ? 'Price SMA applies to single-asset view'
                  : 'Toggle 4-period Simple Moving Average'
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
                isComparing
                  ? 'bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB] cursor-not-allowed'
                  : showSMA
                  ? 'bg-[#2962FF]/10 text-[#2962FF] border-[#2962FF]/40 font-semibold cursor-pointer'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB] cursor-pointer hover:text-[#131722]'
              }`}
            >
              SMA (4)
            </button>

            <button
              type="button"
              onClick={() => setShowBollinger((prev) => !prev)}
              disabled={isComparing}
              aria-pressed={showBollinger && !isComparing}
              title={
                isComparing
                  ? 'Bollinger Bands apply to single-asset view'
                  : 'Toggle Bollinger Bands'
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
                isComparing
                  ? 'bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB] cursor-not-allowed'
                  : showBollinger
                  ? 'bg-[#D97706]/10 text-[#B45309] border-[#D97706]/40 font-semibold cursor-pointer'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB] cursor-pointer hover:text-[#131722]'
              }`}
            >
              Bollinger
            </button>

            {/* Anchored Settings Button + Popover */}
            <div className="relative" ref={settingsPopoverRef}>
              <button
                type="button"
                data-testid="chart-settings-button"
                aria-expanded={settingsOpen}
                aria-controls="terminal-chart-settings-panel"
                onClick={() => setSettingsOpen((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  settingsOpen
                    ? 'bg-[#131722] text-white border-[#131722] font-semibold'
                    : showRSI
                    ? 'bg-[#7C3AED]/10 text-[#6D28D9] border-[#7C3AED]/35 font-semibold hover:bg-[#7C3AED]/15'
                    : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#9CA3AF]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>

              {settingsOpen && (
                <div
                  id="terminal-chart-settings-panel"
                  data-testid="chart-settings-panel"
                  role="region"
                  aria-label="Chart Indicator Settings"
                  className="absolute right-0 top-full mt-2 z-30 w-80 rounded-xl bg-white border border-[#D1D5DB] shadow-lg p-4 text-left"
                >
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#F3F4F6]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#131722]">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#2962FF]" />
                      <span>Chart Overlay Settings</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      aria-label="Close chart settings"
                      className="p-1 rounded text-[#6B7280] hover:text-[#131722] hover:bg-[#F3F4F6] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* RSI Overlay Toggle */}
                  <div className="flex items-start justify-between gap-3 py-2">
                    <div>
                      <div className="text-xs font-semibold text-[#131722]">
                        Relative Strength Index (RSI)
                      </div>
                      <div className="text-[11px] text-[#6B7280] leading-snug mt-0.5">
                        0–100 momentum overlay with 70 Overbought / 30 Oversold bands
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showRSI}
                      aria-label="Toggle Relative Strength Index overlay"
                      data-testid="toggle-rsi-overlay"
                      onClick={() => setShowRSI((prev) => !prev)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2962FF]/40 ${
                        showRSI ? 'bg-[#7C3AED]' : 'bg-[#D1D5DB]'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          showRSI ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* RSI Period Selection */}
                  <div className="pt-2.5 mt-2 border-t border-[#F3F4F6]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-[#374151]">
                        RSI Lookback Window
                      </span>
                      <span className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                        Active: {comparisonData.effectiveRsiPeriod} bars
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([4, 6, 14] as const).map((periodOpt) => (
                        <button
                          key={periodOpt}
                          type="button"
                          disabled={!showRSI}
                          onClick={() => setRsiPeriod(periodOpt)}
                          className={`py-1 rounded-md text-xs font-mono border transition-colors ${
                            !showRSI
                              ? 'bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB] cursor-not-allowed'
                              : rsiPeriod === periodOpt
                              ? 'bg-[#7C3AED] text-white border-[#7C3AED] font-semibold cursor-pointer'
                              : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#9CA3AF] cursor-pointer'
                          }`}
                        >
                          RSI ({periodOpt})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Band Toggles */}
                  {!isComparing && (
                    <div className="pt-2.5 mt-3 border-t border-[#F3F4F6] space-y-2">
                      <div className="text-[11px] font-medium text-[#374151]">Price Overlays</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#4B5563]">Simple Moving Average (SMA 4)</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={showSMA}
                          onClick={() => setShowSMA((prev) => !prev)}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                            showSMA ? 'bg-[#2962FF]' : 'bg-[#D1D5DB]'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              showSMA ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#4B5563]">Bollinger Bands (1.8σ)</span>
                        <button
                          type="button"
