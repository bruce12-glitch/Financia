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
