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
import { SCREENER_FUNDS } from '../utils/screenerEngine';
import { buildTerminalQuoteFromScreenerFund } from '../utils/fundIntelligenceEngine';

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

  // Hydrate externally persisted comparison tickers directly from the 20-fund Screener catalog first
  useEffect(() => {
    if (!comparisonTickers) return;
    const desired = comparisonTickers.map((t) => t.toUpperCase());
    setCustomSecondaryQuotes((prev) => {
      const map = new Map(prev.map((q) => [q.ticker.toUpperCase(), q]));
      return desired.map((sym) => {
        const existing = map.get(sym);
        if (existing) return existing;
        const screenerHit = SCREENER_FUNDS.find(
          (f) => f.symbol.toUpperCase() === sym || f.id.toUpperCase() === sym
        );
        if (screenerHit) return buildTerminalQuoteFromScreenerFund(screenerHit);
        return synthesizeCustomTickerReport(sym, stocks);
      });
    });
    desired.forEach((sym) => {
      const isCatalogFund = SCREENER_FUNDS.some(
        (f) => f.symbol.toUpperCase() === sym || f.id.toUpperCase() === sym
      );
      if (isCatalogFund) return;
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

    const screenerHit = SCREENER_FUNDS.find(
      (f) => f.symbol.toUpperCase() === sym || f.id.toUpperCase() === sym
    );
    const quote = screenerHit
      ? buildTerminalQuoteFromScreenerFund(screenerHit)
      : synthesizeCustomTickerReport(sym, stocks);
    const nextList = [
      ...customSecondaryQuotes.filter((item) => item.ticker.toUpperCase() !== sym),
      quote,
    ];
    setCustomSecondaryQuotes(nextList);
    onComparisonTickersChange?.(nextList.map((q) => q.ticker.toUpperCase()));
    setCompareInput('');
    setCompareError(null);

    if (!screenerHit) {
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
    }
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
      className="glass-card-light rounded-[12px] border border-[#e3e8ee] p-6"
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
                  className="glass-card-light absolute right-0 top-full mt-2 z-30 w-80 rounded-[12px] border border-[#e3e8ee] p-4 text-left"
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
                          role="switch"
                          aria-checked={showBollinger}
                          onClick={() => setShowBollinger((prev) => !prev)}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                            showBollinger ? 'bg-[#D97706]' : 'bg-[#D1D5DB]'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              showBollinger ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Secondary Ticker Comparison Bar */}
      <div className="mb-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Active Series Chips & Live Comparison Readout */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-[#4B5563] mr-1">
              Compare:
            </span>

            {/* Primary ticker legend chip */}
            {primaryComparison && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#D1D5DB] text-xs font-mono text-[#131722] whitespace-nowrap shrink-0"
                data-testid={`compare-legend-${primaryComparison.ticker}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: primaryComparison.color }}
                />
                <span className="font-bold">{primaryComparison.ticker}</span>
                {isComparing && (
                  <span
                    className={`tabular-nums font-semibold ${
                      (primaryComparison.points[activeIdx]?.pctReturn ?? 0) >= 0
                        ? 'text-[#089981]'
                        : 'text-[#F23645]'
                    }`}
                  >
                    {(primaryComparison.points[activeIdx]?.pctReturn ?? 0) >= 0 ? '+' : ''}
                    {(primaryComparison.points[activeIdx]?.pctReturn ?? 0).toFixed(2)}%
                  </span>
                )}
              </span>
            )}

            {/* Added secondary ticker chips with remove control */}
            {comparisonData.tickers.slice(1).map((sec) => {
              const hoveredPt = sec.points[activeIdx] || sec.points[sec.points.length - 1];
              const pctVal = hoveredPt?.pctReturn ?? sec.periodReturnPct;
              const secRsi = sec.rsiSeries[activeIdx];
              const secQuote = activeSecondaryStocks.find(
                (q) => q.ticker.toUpperCase() === sec.ticker.toUpperCase()
              );
              return (
                <span
                  key={sec.ticker}
                  data-testid={`compare-legend-${sec.ticker}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#D1D5DB] text-xs font-mono text-[#131722] whitespace-nowrap shrink-0"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: sec.color }}
                  />
                  <span className="font-bold">{sec.ticker}</span>
                  <span className="text-[#6B7280] tabular-nums">
                    {formatCurrency(
                      hoveredPt?.price ?? sec.spotPrice,
                      2,
                      secQuote?.currencyUnit || 'USD'
                    )}
                  </span>
                  <span
                    className={`tabular-nums font-semibold ${
                      pctVal >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                    }`}
                  >
                    {pctVal >= 0 ? '+' : ''}
                    {pctVal.toFixed(2)}%
                  </span>
                  {showRSI && secRsi !== null && (
                    <span className="text-[11px] text-[#6B7280] tabular-nums">
                      · RSI {secRsi.toFixed(0)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSecondaryTicker(sec.ticker)}
                    aria-label={`Remove ${sec.ticker} from comparison`}
                    data-testid={`remove-compare-${sec.ticker}`}
                    className="ml-0.5 p-0.5 rounded text-[#6B7280] hover:text-[#131722] hover:bg-[#F3F4F6] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {/* Quick preset suggestions */}
            {quickCompareOptions.length > 0 &&
              activeSecondaryStocks.length < MAX_SECONDARY_TICKERS && (
                <div className="flex flex-wrap items-center gap-1.5 pl-1">
                  {quickCompareOptions.slice(0, 3).map((peer) => (
                    <button
                      key={peer.ticker}
                      type="button"
                      data-testid={`quick-compare-${peer.ticker}`}
                      onClick={() => addSecondaryTicker(peer.ticker)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-[#EFF6FF] border border-dashed border-[#D1D5DB] hover:border-[#2962FF] text-[11px] font-mono text-[#374151] hover:text-[#2962FF] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{peer.ticker}</span>
                    </button>
                  ))}
                </div>
              )}
          </div>

          {/* Add Custom Ticker Form */}
          <form onSubmit={handleCompareSubmit} className="flex items-center gap-1.5 shrink-0">
            <label htmlFor="compare-ticker-input" className="sr-only">
              Add secondary ticker to compare
            </label>
            <input
              id="compare-ticker-input"
              data-testid="compare-ticker-input"
              type="text"
              value={compareInput}
              onChange={(e) => {
                setCompareInput(e.target.value);
                if (compareError) setCompareError(null);
              }}
              placeholder="Add symbol (e.g. SBIGILT)"
              className="w-44 px-2.5 py-1 rounded-md bg-white border border-[#D1D5DB] focus:border-[#2962FF] text-xs font-mono uppercase placeholder:normal-case placeholder:font-sans placeholder:text-[#6B7280] focus:outline-none"
            />
            <button
              type="submit"
              data-testid="compare-ticker-add"
              className="px-2.5 py-1 rounded-md bg-[#131722] hover:bg-[#1F2937] text-white text-xs font-mono font-medium inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>Compare</span>
            </button>
          </form>
        </div>

        {compareError && (
          <div role="alert" className="mt-2 text-[11px] font-mono text-[#DC2626]">
            {compareError}
          </div>
        )}
      </div>

      {/* Interactive SVG Price / Side-by-Side Comparison + Optional RSI Overlay */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full select-none overflow-visible"
          style={{ height: showRSI ? '320px' : '256px' }}
          role="img"
          data-testid="terminal-main-chart-svg"
          aria-label={
            isComparing
              ? `Side-by-side performance comparison for ${comparisonData.tickers
                  .map((t) => t.ticker)
                  .join(', ')}`
              : `${activeStock.ticker} interactive NAV/spot price and technical overlay chart`
          }
        >
          <defs>
            <linearGradient id="financiaAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2962FF" stopOpacity="0.18" />
              <stop offset="75%" stopColor="#2962FF" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#2962FF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Y-Axis Gridlines (NAV/Spot Price in single mode, % Return in comparison mode) */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = padTop + ratio * pricePlotH;
            const currencyPrefix = activeStock.currencyUnit === 'INR' ? '₹' : '$';
            const labelText = isComparing
              ? `${
                  comparisonData.maxPct -
                    ratio * (comparisonData.maxPct - comparisonData.minPct) >=
                  0
                    ? '+'
                    : ''
                }${(
                  comparisonData.maxPct -
                  ratio * (comparisonData.maxPct - comparisonData.minPct)
                ).toFixed(1)}%`
              : `${currencyPrefix}${(maxPrice - ratio * (maxPrice - minPrice)).toFixed(0)}`;
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#6B7280] text-[10px] font-mono tabular-nums"
                >
                  {labelText}
                </text>
              </g>
            );
          })}

          {/* Single-Ticker Mode: Volume Bars, Area, Bollinger, SMA, Primary Line */}
          {!isComparing && (
            <>
              {chartSeries.map((pt, i) => {
                const x = getX(i);
                const vHeight = (pt.volume / maxVol) * (pricePlotH * 0.24);
                const y = padTop + pricePlotH - vHeight;
                return (
                  <rect
                    key={`vol-${i}`}
                    x={x - 6}
                    y={y}
                    width={12}
                    height={vHeight}
                    rx={2}
                    fill="rgba(41, 98, 255, 0.14)"
                  />
                );
              })}

              <path d={areaPath} fill="url(#financiaAreaGrad)" />

              {showBollinger && bollingerUpperPath && (
                <>
                  <path
                    d={bollingerUpperPath}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth={1.25}
                    strokeDasharray="4 3"
                  />
                  <path
                    d={bollingerLowerPath}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth={1.25}
                    strokeDasharray="4 3"
                  />
                </>
              )}

              {showSMA && smaPath && (
                <path
                  d={smaPath}
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              )}

              <path
                d={linePath}
                fill="none"
                stroke="#2962FF"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Side-by-Side Comparison Mode: 0% Baseline + Multiple Ticker Curves */}
          {isComparing && (
            <>
              {comparisonData.minPct <= 0 && comparisonData.maxPct >= 0 && (
                <line
                  x1={padLeft}
                  y1={getPctY(0)}
                  x2={svgWidth - padRight}
                  y2={getPctY(0)}
                  stroke="#9CA3AF"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              )}
              {comparisonData.tickers.map((series) => {
                const pathD = series.points
                  .map(
                    (pt, idx) =>
                      `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getPctY(
                        pt.pctReturn
                      ).toFixed(1)}`
                  )
                  .join(' ');
                const lastPt = series.points[series.points.length - 1];
                const lastX = getX(series.points.length - 1);
                const lastY = lastPt ? getPctY(lastPt.pctReturn) : padTop;
                return (
                  <g key={`cmp-${series.ticker}`} data-testid={`compare-series-${series.ticker}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={series.color}
                      strokeWidth={series.isPrimary ? 2.6 : 2.1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {series.points.map((pt, ptIdx) => (
                      <circle
                        key={`cmp-dot-${series.ticker}-${ptIdx}`}
                        cx={getX(ptIdx)}
                        cy={getPctY(pt.pctReturn)}
                        r={hoveredPointIdx === ptIdx ? 4.8 : 2.8}
                        fill={hoveredPointIdx === ptIdx ? '#131722' : series.color}
                        stroke="#FFFFFF"
                        strokeWidth={1.2}
                      />
                    ))}
                    {!showRSI && lastPt && (
                      <text
                        x={lastX + 6}
                        y={lastY + 3}
                        className="text-[10px] font-mono font-bold"
                        fill={series.color}
                      >
                        {series.ticker}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* Optional Relative Strength Index (RSI) Synchronized Overlay Band */}
          {showRSI && (
            <g data-testid="rsi-overlay-pane">
              {/* Separator line between Price/Comparison and RSI pane */}
              <line
                x1={padLeft}
                y1={rsiTop - 10}
                x2={svgWidth - padRight}
                y2={rsiTop - 10}
                stroke="#E5E7EB"
              />

              {/* Overbought (70–100) and Oversold (0–30) subtle bands */}
              <rect
                x={padLeft}
                y={getRsiY(100)}
                width={plotW}
                height={getRsiY(70) - getRsiY(100)}
                fill="rgba(220, 38, 38, 0.045)"
              />
              <rect
                x={padLeft}
                y={getRsiY(30)}
                width={plotW}
                height={getRsiY(0) - getRsiY(30)}
                fill="rgba(8, 153, 129, 0.045)"
              />

              {/* RSI Threshold Reference Lines: 70, 50, 30 */}
              {[
                { level: 70, color: '#EF4444', dash: '3 3' },
                { level: 50, color: '#D1D5DB', dash: '2 4' },
                { level: 30, color: '#089981', dash: '3 3' },
              ].map((ref) => {
                const ry = getRsiY(ref.level);
                return (
                  <g key={`rsi-ref-${ref.level}`}>
                    <line
                      x1={padLeft}
                      y1={ry}
                      x2={svgWidth - padRight}
                      y2={ry}
                      stroke={ref.color}
                      strokeWidth={1}
                      strokeDasharray={ref.dash}
                      opacity={0.7}
                    />
                    <text
                      x={svgWidth - padRight + 6}
                      y={ry + 3}
                      textAnchor="start"
                      className="text-[9px] font-mono tabular-nums"
                      fill={ref.level === 50 ? '#6B7280' : ref.color}
                    >
                      {ref.level}
                    </text>
                  </g>
                );
              })}

              {/* Left-side 100 / 0 bounds + RSI header label */}
              <text
                x={padLeft - 8}
                y={getRsiY(70) + 3}
                textAnchor="end"
                className="fill-[#6B7280] text-[9px] font-mono tabular-nums"
              >
                70
              </text>
              <text
                x={padLeft - 8}
                y={getRsiY(30) + 3}
                textAnchor="end"
                className="fill-[#6B7280] text-[9px] font-mono tabular-nums"
              >
                30
              </text>
              <text
                x={padLeft + 4}
                y={rsiTop + 10}
                className="text-[10px] font-mono font-semibold"
                fill="#4B5563"
              >
                RSI ({comparisonData.effectiveRsiPeriod}) ·{' '}
                <tspan fill={rsiSummary.color}>
                  {activeRsiValue !== null ? `${activeRsiValue.toFixed(1)} ${rsiSummary.label}` : 'Warm-up'}
                </tspan>
              </text>

              {/* Plot RSI Curve(s) */}
              {comparisonData.tickers.map((series, sIdx) => {
                const rsiPts: string[] = [];
                series.rsiSeries.forEach((val, idx) => {
                  if (val !== null) {
                    rsiPts.push(
                      `${rsiPts.length === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getRsiY(val).toFixed(1)}`
                    );
                  }
                });
                const rsiStroke = isComparing ? series.color : '#7C3AED';
                const pathD = rsiPts.join(' ');
                if (!pathD) return null;
                return (
                  <g key={`rsi-line-${series.ticker}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={rsiStroke}
                      strokeWidth={sIdx === 0 ? 2 : 1.5}
                      strokeDasharray={sIdx === 0 ? undefined : '4 2'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {series.rsiSeries.map((val, idx) => {
                      if (val === null) return null;
                      const isPointHovered = hoveredPointIdx === idx;
                      if (!isPointHovered && sIdx > 0) return null;
                      return (
                        <circle
                          key={`rsi-dot-${series.ticker}-${idx}`}
                          cx={getX(idx)}
                          cy={getRsiY(val)}
                          r={isPointHovered ? 4 : 2.3}
                          fill={isPointHovered ? '#131722' : rsiStroke}
                          stroke="#FFFFFF"
                          strokeWidth={1}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </g>
          )}

          {/* Shared Hover Crosshair, Primary Single-Mode Markers, X-Axis Labels & Hit Targets */}
          {comparisonData.dates.map((dateLabel, i) => {
            const cx = getX(i);
            const pt = chartSeries[i];
            const cy = pt ? getPriceY(pt.price) : padTop;
            const isHovered = hoveredPointIdx === i;
            const crosshairBottom = showRSI ? rsiTop + rsiPlotH : padTop + pricePlotH;
            return (
              <g
                key={`pt-${i}`}
                onMouseEnter={() => setHoveredPointIdx(i)}
                onMouseLeave={() => setHoveredPointIdx(null)}
                className="cursor-pointer"
              >
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padTop}
                    x2={cx}
                    y2={crosshairBottom}
                    stroke="rgba(41, 98, 255, 0.45)"
                    strokeWidth={1}
                  />
                )}
                {!isComparing && pt && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5.5 : 3.5}
                    fill={isHovered ? '#131722' : '#2962FF'}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                )}
                {(i % 2 === 0 || i === comparisonData.dates.length - 1) && (
                  <text
                    x={cx}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    className="fill-[#6B7280] text-[10px] font-mono"
                  >
                    {dateLabel}
                  </text>
                )}
                <rect
                  x={cx - 16}
                  y={padTop}
                  width={32}
                  height={crosshairBottom - padTop}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Key Quantitative Telemetry Strip below chart */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 pt-4 mt-4 border-t border-[#F3F4F6]">
        <div>
          <div className="text-[11px] text-[#6B7280]">Scheme AUM</div>
          <div className="text-sm font-mono font-semibold text-[#131722] tabular-nums mt-0.5">
            {activeStock.aum || activeStock.marketCap}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[#6B7280]">Expense Ratio</div>
          <div className="text-sm font-mono font-semibold text-[#131722] tabular-nums mt-0.5">
            {activeStock.expenseRatio || `${activeStock.peRatio}% TER`}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[#6B7280]">14D RSI</div>
          <div className="text-sm font-mono font-semibold text-[#2962FF] tabular-nums mt-0.5">
            {activeStock.rsi14}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[#6B7280]">YTM / 3Y CAGR</div>
          <div className="text-sm font-mono font-semibold text-[#131722] tabular-nums mt-0.5">
            {activeStock.ytmOrCagr || `${activeStock.ivRank}%`}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[#6B7280]">Duration / Tracking</div>
          <div className="text-sm font-mono font-semibold text-[#131722] tabular-nums mt-0.5">
            {activeStock.modifiedDuration || activeStock.institutionalOwnership}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[#6B7280]">Next Disclosure</div>
          <div className="text-sm font-mono font-semibold text-[#131722] tabular-nums mt-0.5">
            {activeStock.nextEarnings}
          </div>
        </div>
      </div>
    </div>
  );
};
