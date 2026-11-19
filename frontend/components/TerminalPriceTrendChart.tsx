import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { StockQuote } from '../types/financia';
import {
  ThirtyDayPricePoint,
  buildThirtyDayPerformanceSeries,
  formatCurrency,
  summarizeThirtyDayPerformance,
} from '../utils/stockEngine';

export type PriceTrendChartType = 'area' | 'line';

interface TerminalPriceTrendChartProps {
  stock: StockQuote;
}

interface CustomTooltipPayloadItem {
  payload?: ThirtyDayPricePoint;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  currency?: 'USD' | 'INR';
}

const TrendChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, currency = 'USD' }) => {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) {
    return null;
  }

  const pt = payload[0].payload;
  const isPosFromStart = pt.changePctFromStart >= 0;
  const isPosDay = pt.dailyChangePct >= 0;

  return (
    <div className="rounded-lg bg-white border border-[#D1D5DB] shadow-md px-3.5 py-2.5 text-xs min-w-[196px]">
      <div className="flex items-center justify-between gap-4 pb-1.5 mb-1.5 border-b border-[#F3F4F6]">
        <span className="font-mono font-semibold text-[#131722]">{pt.dateLabel}</span>
        <span className="font-mono text-[11px] text-[#6B7280]">{pt.isoDate}</span>
      </div>

      <div className="flex items-baseline justify-between gap-4 mb-1.5">
        <span className="text-[#6B7280]">Close NAV / Spot</span>
        <span className="font-mono font-bold text-sm text-[#131722] tabular-nums">
          {formatCurrency(pt.price, 2, currency)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums">
        <span className="text-[#6B7280]">30D Return</span>
        <span className={`text-right font-semibold ${isPosFromStart ? 'text-[#089981]' : 'text-[#F23645]'}`}>
          {isPosFromStart ? '+' : ''}
          {pt.changePctFromStart.toFixed(2)}%
        </span>

        <span className="text-[#6B7280]">Day Delta</span>
        <span className={`text-right font-medium ${isPosDay ? 'text-[#089981]' : 'text-[#F23645]'}`}>
          {isPosDay ? '+' : ''}
          {pt.dailyChangePct.toFixed(2)}%
        </span>

        <span className="text-[#6B7280]">Range</span>
        <span className="text-right text-[#131722]">
          {formatCurrency(pt.low, 2, currency)} – {formatCurrency(pt.high, 2, currency)}
        </span>

        <span className="text-[#6B7280]">Volume</span>
        <span className="text-right text-[#131722]">{pt.volume}M</span>
      </div>
    </div>
  );
};

export const TerminalPriceTrendChart: React.FC<TerminalPriceTrendChartProps> = ({ stock }) => {
  const [chartType, setChartType] = useState<PriceTrendChartType>('area');
  const currency: 'USD' | 'INR' = stock.currencyUnit || 'USD';
  const symbolPrefix = currency === 'INR' ? '₹' : '$';

  const series = useMemo(
    () =>
      buildThirtyDayPerformanceSeries(
        stock.report.financial_charts.stock_price_4m,
        stock.price,
        stock.ticker
      ),
    [stock.report.financial_charts.stock_price_4m, stock.price, stock.ticker]
  );

  const summary = useMemo(() => summarizeThirtyDayPerformance(series), [series]);
  const isPositiveReturn = summary.returnPct >= 0;
  const strokeColor = isPositiveReturn ? '#089981' : '#F23645';
  const gradientId = `financia-30d-grad-${stock.ticker.replace(/[^A-Za-z0-9]/g, '')}`;

  const yDomain = useMemo<[number, number]>(() => {
    if (series.length === 0) return [0, 100];
    const prices = series.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pad = Math.max((maxP - minP) * 0.14, maxP * 0.012);
    return [Number((minP - pad).toFixed(2)), Number((maxP + pad).toFixed(2))];
  }, [series]);

  return (
    <div
      data-testid="terminal-30d-chart-card"
      data-chart-type={chartType}
      data-ticker={stock.ticker}
      className="rounded-xl bg-white border border-[#E5E7EB] p-6"
    >
      {/* Header Row: Title, 30D Return KPI, Line / Area Graph Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-[#F3F4F6]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-display font-semibold text-[#131722]">
              {stock.ticker} · 30-Day NAV / Spot Trend
            </h3>
            <span
              data-testid="terminal-30d-return"
              className={`inline-flex items-center gap-1 text-xs font-mono font-semibold tabular-nums ${
                isPositiveReturn ? 'text-[#089981]' : 'text-[#F23645]'
              }`}
            >
              {isPositiveReturn ? (
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {isPositiveReturn ? '+' : ''}
              {summary.returnPct.toFixed(2)}% (30D)
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Daily closing performance across the trailing 30 sessions anchored to {stock.ticker} spot price
          </p>
        </div>

        {/* Interactive Graph Type Toggle: Area vs Line */}
        <div
          role="group"
          aria-label="30-Day Chart Graph Type"
          className="inline-flex items-center p-1 rounded-lg bg-[#F4F5F7] border border-[#E5E7EB] shrink-0 self-start sm:self-auto"
        >
          <button
            type="button"
            data-testid="trend-mode-area"
            aria-pressed={chartType === 'area'}
            onClick={() => setChartType('area')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              chartType === 'area'
                ? 'bg-[#131722] text-white font-semibold'
                : 'text-[#4B5563] hover:text-[#131722]'
            }`}
          >
            Area
          </button>
          <button
            type="button"
            data-testid="trend-mode-line"
            aria-pressed={chartType === 'line'}
            onClick={() => setChartType('line')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              chartType === 'line'
                ? 'bg-[#131722] text-white font-semibold'
                : 'text-[#4B5563] hover:text-[#131722]'
            }`}
          >
            Line
          </button>
        </div>
      </div>

      {/* Explicit non-zero dimensions container for Recharts ResponsiveContainer */}
      <div className="w-full h-[280px]" aria-label={`${stock.ticker} 30-day ${chartType} price chart`}>
        <ResponsiveContainer width="100%" height={280}>
          {chartType === 'area' ? (
            <AreaChart data={series} margin={{ top: 10, right: 26, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.24} />
                  <stop offset="80%" stopColor={strokeColor} stopOpacity={0.04} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
                minTickGap={28}
              />
