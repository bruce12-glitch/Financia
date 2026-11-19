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

