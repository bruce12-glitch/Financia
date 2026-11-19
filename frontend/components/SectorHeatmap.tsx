import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import {
  applyHeatmapTick,
  buildSectorGroups,
  calculateRealizedVolatility,
  computeD3TreemapLayout,
  getHeatmapTileStyle,
  getVolatilityTileStyle,
  HEATMAP_STOCKS,
  HeatmapColorMode,
  HeatmapMarket,
  HeatmapStockTile,
  heatmapTileToMarketSymbolRow,
} from '../utils/heatmapEngine';
import { formatSignedPercent } from '../utils/marketCalculations';
import { MarketSymbolRow } from '../types/markets';

interface SectorHeatmapProps {
  onSelectSymbol: (row: MarketSymbolRow) => void;
  liveFeedActive?: boolean;
}

const TREEMAP_WIDTH = 1160;
const TREEMAP_HEIGHT = 490;

export const SectorHeatmap: React.FC<SectorHeatmapProps> = ({
  onSelectSymbol,
  liveFeedActive = true,
}) => {
  const [market, setMarket] = useState<HeatmapMarket>('global');
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [colorMode, setColorMode] = useState<HeatmapColorMode>('volatility');
  const [liveTiles, setLiveTiles] = useState<HeatmapStockTile[]>(() => HEATMAP_STOCKS);
  const [isStreaming, setIsStreaming] = useState<boolean>(liveFeedActive);
  const [tickCount, setTickCount] = useState<number>(0);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsStreaming(liveFeedActive);
  }, [liveFeedActive]);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = window.setInterval(() => {
      setTickCount((prevTick) => {
        const nextTick = prevTick + 1;
        setLiveTiles((prevTiles) => applyHeatmapTick(prevTiles, nextTick));
        return nextTick;
      });
    }, 2200);
    return () => window.clearInterval(interval);
  }, [isStreaming]);

  const availableSectors = useMemo(() => {
    const sectors = new Set(
      liveTiles.filter((s) => s.market === market).map((s) => s.sector)
    );
    return ['All', ...Array.from(sectors)];
  }, [liveTiles, market]);

  const groups = useMemo(() => {
    return buildSectorGroups(liveTiles, market, sectorFilter);
  }, [liveTiles, market, sectorFilter]);

  const treemapLayout = useMemo(() => {
    return computeD3TreemapLayout(groups, TREEMAP_WIDTH, TREEMAP_HEIGHT);
  }, [groups]);

  const totals = useMemo(() => {
    const allTiles = groups.flatMap((g) => g.tiles);
    const totalCap = allTiles.reduce((s, t) => s + t.marketCapB, 0);
    const weightedReturn = allTiles.reduce((s, t) => s + t.changePercent * t.marketCapB, 0);
    const weightedVol = allTiles.reduce(
      (s, t) => s + calculateRealizedVolatility(t.sparkline, t.changePercent) * t.marketCapB,
      0
    );
    return {
      count: allTiles.length,
      advancers: allTiles.filter((t) => t.changePercent > 0).length,
      decliners: allTiles.filter((t) => t.changePercent < 0).length,
      weightedAvg: totalCap > 0 ? Number((weightedReturn / totalCap).toFixed(2)) : 0,
      weightedVolatility: totalCap > 0 ? Number((weightedVol / totalCap).toFixed(1)) : 0,
      defaultHighlight: allTiles[0] || null,
    };
  }, [groups]);

  const hoveredTileRect = useMemo(() => {
    if (!hoveredSymbol) return null;
    return treemapLayout.tiles.find((item) => item.tile.symbol === hoveredSymbol) || null;
  }, [hoveredSymbol, treemapLayout.tiles]);

  const inspectedTile = useMemo(() => {
    if (hoveredTileRect) return hoveredTileRect.tile;
    return totals.defaultHighlight;
  }, [hoveredTileRect, totals.defaultHighlight]);

  const inspectedVolatility = useMemo(() => {
    if (!inspectedTile) return 0;
    return calculateRealizedVolatility(inspectedTile.sparkline, inspectedTile.changePercent);
  }, [inspectedTile]);

  const handleMarketSwitch = (next: HeatmapMarket) => {
    setMarket(next);
    setSectorFilter('All');
    setHoveredSymbol(null);
    setPointerPos(null);
  };

  const handleMouseMoveContainer = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    setPointerPos({
      x: e.clientX - box.left,
      y: e.clientY - box.top,
    });
  };

  return (
    <div
      data-testid="sector-heatmap"
      data-market={market}
      data-sector={sectorFilter}
      data-color-mode={colorMode}
      data-tick-count={tickCount}
      className="rounded-2xl border border-[#E0E3EB] bg-white p-5 md:p-6 mt-5"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#F0F3FA]">
        <div>
          <h3 className="text-base md:text-lg font-display font-bold text-[#131722]">
            Real-time 4-pillar volatility heatmap
          </h3>
          <p className="text-xs text-[#787B86] mt-1 flex flex-wrap items-center gap-1.5 tabular-nums">
            <span>D3 squarified treemap</span>
            <span aria-hidden="true">·</span>
            <span>{totals.advancers} gainers</span>
            <span aria-hidden="true">·</span>
            <span>{totals.decliners} decliners</span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-semibold ${
                totals.weightedAvg >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
              }`}
            >
              AUM-weighted {formatSignedPercent(totals.weightedAvg)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#131722]">
              Mean σ {totals.weightedVolatility.toFixed(1)}%
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[#787B86]">Tick #{tickCount}</span>
          </p>
        </div>

        {/* Stream Control, Color Scale, Mode Switcher, Market Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            data-testid="heatmap-stream-toggle"
            onClick={() => setIsStreaming((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isStreaming
                ? 'border-[#0F766E]/30 bg-[#ECFDF5] text-[#0F766E]'
                : 'border-[#E0E3EB] bg-[#F8F9FD] text-[#434651]'
            }`}
            title={isStreaming ? 'Pause real-time volatility ticks' : 'Resume real-time volatility ticks'}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'Live feed' : 'Paused'}</span>
          </button>

          {/* Color Mode Switcher */}
          <div
            role="group"
            aria-label="Heatmap color metric"
            className="inline-flex items-center p-1 rounded-lg bg-[#F0F3FA] gap-1"
          >
            {(
              [
                { id: 'volatility', label: 'Volatility (σ)' },
                { id: 'performance', label: 'Return (%)' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                data-testid={`heatmap-mode-${mode.id}`}
                aria-pressed={colorMode === mode.id}
                onClick={() => setColorMode(mode.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  colorMode === mode.id
                    ? 'bg-[#131722] text-white'
                    : 'text-[#434651] hover:text-[#131722]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Market Switcher */}
          <div
            role="tablist"
            aria-label="Heatmap market scope"
            className="inline-flex items-center p-1 rounded-lg bg-[#F0F3FA] gap-1"
          >
            {(
              [
                { id: 'global', label: 'Global Equities' },
                { id: 'india', label: 'India NSE' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={market === tab.id}
                onClick={() => handleMarketSwitch(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  market === tab.id
                    ? 'bg-[#131722] text-white'
                    : 'text-[#434651] hover:text-[#131722]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sector Filter Controls */}
      <div
        role="group"
        aria-label="Filter heatmap by sector"
        className="flex flex-wrap items-center gap-1.5 py-3 border-b border-[#F0F3FA]"
      >
        {availableSectors.map((sector) => (
          <button
            key={sector}
            type="button"
            onClick={() => setSectorFilter(sector)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              sectorFilter === sector
                ? 'bg-[#131722] text-white font-semibold'
                : 'bg-[#F8F9FD] text-[#434651] hover:bg-[#F0F3FA]'
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      {/* Color-Coded Sector Treemap Grid */}
      <div
        className={`grid gap-4 pt-4 ${
          groups.length === 1
            ? 'grid-cols-1 max-w-2xl'
            : groups.length <= 3
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {groups.map((group) => (
          <div key={group.sector} className="flex flex-col">
            {/* Sector Heading */}
            <div className="flex items-center justify-between text-xs pb-2">
              <span className="font-bold text-[#131722]">{group.sector}</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  group.avgChangePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                }`}
              >
                {formatSignedPercent(group.avgChangePercent)}
              </span>
            </div>

            {/* Color-coded Stock Squares (gap-free 4-column rectangle packing) */}
            <div className="grid grid-cols-4 auto-rows-fr gap-1.5 flex-1 min-h-[176px]">
              {group.tiles.map((tile, idx) => {
                const style = getHeatmapTileStyle(tile.changePercent);
                const spanClasses = getHeatmapTileSpan(idx, group.tiles.length);

                return (
                  <button
                    key={tile.symbol}
                    type="button"
                    data-symbol={tile.symbol}
                    onMouseEnter={() => setHoveredTile(tile)}
                    onFocus={() => setHoveredTile(tile)}
                    onClick={() => onSelectSymbol(heatmapTileToMarketSymbolRow(tile))}
                    style={{ backgroundColor: style.bg, color: style.text }}
                    aria-label={`${tile.symbol} (${tile.name}) ${formatSignedPercent(tile.changePercent)} in ${tile.sector}`}
                    className={`${spanClasses} rounded-lg px-2 py-2.5 flex flex-col items-center justify-center text-center transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2962FF] cursor-pointer overflow-hidden`}
                  >
                    <span className="font-mono font-bold text-xs md:text-[13px] tracking-tight leading-tight truncate max-w-full">
                      {tile.symbol}
                    </span>
                    <span
                      className="font-mono text-[11px] font-semibold tabular-nums mt-0.5 leading-tight"
                      style={{ color: style.subText }}
                    >
                      {formatSignedPercent(tile.changePercent)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Hover / Focused Tile Readout Bar */}
      {inspectedTile && (
        <div className="mt-4 pt-3.5 border-t border-[#F0F3FA] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="font-mono font-bold text-[#131722]">{inspectedTile.symbol}</span>
            <span aria-hidden="true" className="text-[#D1D5DB]">
              ·
            </span>
            <span className="font-medium text-[#434651]">{inspectedTile.name}</span>
            <span aria-hidden="true" className="text-[#D1D5DB]">
              ·
            </span>
            <span className="text-[#787B86]">{inspectedTile.sector}</span>
            <span aria-hidden="true" className="text-[#D1D5DB]">
              ·
            </span>
            <span className="font-mono text-[#131722]">
              {inspectedTile.price} {inspectedTile.unit}
            </span>
            <span
              className={`font-mono font-semibold ${
                inspectedTile.changePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
              }`}
            >
              {formatSignedPercent(inspectedTile.changePercent)}
            </span>
          </div>
          <span className="text-[#787B86]">
            Cap ~${inspectedTile.marketCapB.toLocaleString()}B · Click any square to inspect quote
          </span>
        </div>
      )}
    </div>
  );
};
