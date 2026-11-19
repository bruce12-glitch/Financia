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
                { id: 'global', label: 'Global ETFs & Gold' },
                { id: 'india', label: 'India Funds & Debt' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={market === tab.id}
                onClick={() => handleMarketSwitch(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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

      {/* Filter + Scale Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-[#F0F3FA]">
        <div
          role="group"
          aria-label="Filter heatmap by sector"
          className="flex flex-wrap items-center gap-1.5"
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

        {/* Dynamic Scale Legend */}
        {colorMode === 'volatility' ? (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#787B86] tabular-nums">
            <span>Calm &lt;19%</span>
            <span className="inline-flex h-2.5 w-24 rounded overflow-hidden">
              <span className="flex-1 bg-[#0F766E]" />
              <span className="flex-1 bg-[#D97706]" />
              <span className="flex-1 bg-[#DC2626]" />
              <span className="flex-1 bg-[#991B1B]" />
            </span>
            <span>Extreme ≥38%</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#787B86] tabular-nums">
            <span>−3%</span>
            <span className="inline-flex h-2.5 w-24 rounded overflow-hidden">
              <span className="flex-1 bg-[#B91C1C]" />
              <span className="flex-1 bg-[#F23645]" />
              <span className="flex-1 bg-[#E2E8F0]" />
              <span className="flex-1 bg-[#089981]" />
              <span className="flex-1 bg-[#057A55]" />
            </span>
            <span>+3%</span>
          </div>
        )}
      </div>

      {/* Sector Volatility Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 py-3">
        {groups.map((grp) => {
          const isSelected = sectorFilter === grp.sector;
          const volStyle = getVolatilityTileStyle(grp.volatilityPct);
          return (
            <button
              key={grp.sector}
              type="button"
              onClick={() => setSectorFilter(isSelected ? 'All' : grp.sector)}
              className={`rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'border-[#131722] bg-[#F8FAFC]'
                  : 'border-[#E0E3EB] bg-white hover:border-[#94A3B8]'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <span className="font-semibold text-[#131722] truncate">{grp.sector}</span>
                <span
                  className="font-mono font-bold tabular-nums shrink-0"
                  style={{ color: volStyle.bg }}
                >
                  σ {grp.volatilityPct.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-0.5 text-[11px] font-mono tabular-nums text-[#787B86]">
                <span className={grp.avgChangePercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}>
                  {formatSignedPercent(grp.avgChangePercent)}
                </span>
                <span>Spread {grp.dispersionPct.toFixed(1)}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* D3.js Squarified Treemap Canvas */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMoveContainer}
        onMouseLeave={() => {
          setHoveredSymbol(null);
          setPointerPos(null);
        }}
        className="relative rounded-xl border border-[#E0E3EB] bg-[#F8FAFC] overflow-hidden"
      >
        <svg
          data-testid="d3-treemap-svg"
          viewBox={`0 0 ${TREEMAP_WIDTH} ${TREEMAP_HEIGHT}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label="D3.js sector-wide performance volatility treemap"
        >
          <defs>
            {treemapLayout.sectors.map((sec) => {
              const secId = sec.sector.replace(/[^a-zA-Z0-9]/g, '_');
              return (
                <clipPath key={`clip-sec-${secId}`} id={`clip-sec-${secId}`}>
                  <rect
                    x={sec.x0 + 2}
                    y={sec.y0}
                    width={Math.max(0, sec.x1 - sec.x0 - 4)}
                    height={24}
                  />
                </clipPath>
              );
            })}
            {treemapLayout.tiles.map((leaf) => (
              <clipPath key={`clip-tile-${leaf.tile.symbol}`} id={`clip-tile-${leaf.tile.symbol}`}>
                <rect
                  x={leaf.x0}
                  y={leaf.y0}
                  width={Math.max(0, leaf.x1 - leaf.x0)}
                  height={Math.max(0, leaf.y1 - leaf.y0)}
                  rx={4}
                />
              </clipPath>
            ))}
          </defs>

          {/* Sector Container Regions */}
          {treemapLayout.sectors.map((sec) => {
            const secWidth = Math.max(0, sec.x1 - sec.x0);
            const secHeight = Math.max(0, sec.y1 - sec.y0);
            const secId = sec.sector.replace(/[^a-zA-Z0-9]/g, '_');
            const showFullHeader = secWidth >= 195;
            const showMediumHeader = secWidth >= 115;

            return (
              <g key={sec.sector} className="d3-treemap-sector">
                <rect
                  x={sec.x0}
                  y={sec.y0}
                  width={secWidth}
                  height={secHeight}
                  rx={6}
                  fill="#FFFFFF"
                  stroke="#E2E8F0"
                  strokeWidth={1}
                />
                <g clipPath={`url(#clip-sec-${secId})`}>
                  <text
                    x={sec.x0 + 8}
                    y={sec.y0 + 16}
                    fill="#131722"
                    fontSize={11.5}
                    fontWeight={700}
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {sec.sector}
                    {showFullHeader
                      ? ` · ${formatSignedPercent(sec.avgChangePercent)} · σ ${sec.volatilityPct.toFixed(1)}%`
                      : showMediumHeader
                        ? ` · σ ${sec.volatilityPct.toFixed(1)}%`
                        : ''}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Stock Leaf Rectangles */}
          {treemapLayout.tiles.map((leaf) => {
            const tile = leaf.tile;
            const width = Math.max(0, leaf.x1 - leaf.x0);
            const height = Math.max(0, leaf.y1 - leaf.y0);
            const cx = leaf.x0 + width / 2;
            const cy = leaf.y0 + height / 2;
            const isHovered = hoveredSymbol === tile.symbol;

            const style =
              colorMode === 'volatility'
                ? getVolatilityTileStyle(leaf.volatilityPct)
                : getHeatmapTileStyle(tile.changePercent);

            const minWidthForSymbol = Math.max(54, tile.symbol.length * 7.5 + 10);
            const canShowFull = width >= Math.max(96, tile.symbol.length * 8 + 16) && height >= 64;
            const canShowCompact = width >= minWidthForSymbol && height >= 40;
            const symbolFontSize =
              width >= 180 && height >= 110
                ? 17
                : width >= 115
                  ? 13
                  : tile.symbol.length >= 7
                    ? 10
                    : 11;

            return (
              <g
                key={tile.symbol}
                className="d3-treemap-tile cursor-pointer focus:outline-none"
                data-symbol={tile.symbol}
                role="button"
                tabIndex={0}
                aria-label={`${tile.symbol} (${tile.name}) return ${formatSignedPercent(
                  tile.changePercent
                )}, volatility ${leaf.volatilityPct.toFixed(1)} percent in ${tile.sector}`}
                onMouseEnter={() => setHoveredSymbol(tile.symbol)}
                onFocus={() => setHoveredSymbol(tile.symbol)}
                onBlur={() => setHoveredSymbol((prev) => (prev === tile.symbol ? null : prev))}
                onClick={() => onSelectSymbol(heatmapTileToMarketSymbolRow(tile))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSymbol(heatmapTileToMarketSymbolRow(tile));
                  }
                }}
              >
                <rect
                  x={leaf.x0}
                  y={leaf.y0}
                  width={width}
                  height={height}
                  rx={4}
                  fill={style.bg}
                  stroke={isHovered ? '#131722' : '#FFFFFF'}
                  strokeWidth={isHovered ? 2.2 : 1.2}
                  style={{ transition: 'fill 260ms ease, stroke 120ms ease' }}
                />

                {canShowCompact && (
                  <g clipPath={`url(#clip-tile-${tile.symbol})`} pointerEvents="none">
                    <text
                      x={cx}
                      y={canShowFull ? cy - 8 : cy - 2}
                      textAnchor="middle"
                      fill={style.text}
                      fontSize={symbolFontSize}
                      fontWeight={700}
                      fontFamily="'JetBrains Mono', ui-monospace, monospace"
                    >
                      {tile.symbol}
                    </text>

                    {canShowFull ? (
                      <>
                        <text
                          x={cx}
                          y={cy + 9}
                          textAnchor="middle"
                          fill={style.subText}
                          fontSize={12}
                          fontWeight={600}
                          fontFamily="'JetBrains Mono', ui-monospace, monospace"
                        >
                          {colorMode === 'volatility'
                            ? `σ ${leaf.volatilityPct.toFixed(1)}%`
                            : formatSignedPercent(tile.changePercent)}
                        </text>
                        <text
                          x={cx}
                          y={cy + 25}
                          textAnchor="middle"
                          fill={style.subText}
                          fontSize={10.5}
                          fontWeight={500}
                          fontFamily="'JetBrains Mono', ui-monospace, monospace"
                          opacity={0.92}
                        >
                          {colorMode === 'volatility'
                            ? formatSignedPercent(tile.changePercent)
                            : `σ ${leaf.volatilityPct.toFixed(1)}%`}
                        </text>
                      </>
                    ) : (
                      <text
                        x={cx}
                        y={cy + 12}
                        textAnchor="middle"
                        fill={style.subText}
                        fontSize={10}
                        fontWeight={600}
                        fontFamily="'JetBrains Mono', ui-monospace, monospace"
                      >
                        {colorMode === 'volatility'
                          ? `${leaf.volatilityPct.toFixed(0)}%σ`
                          : formatSignedPercent(tile.changePercent)}
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Interactive Hover Tooltip */}
        {hoveredTileRect && pointerPos && (
          <div
            data-testid="d3-treemap-tooltip"
            className="pointer-events-none absolute z-20 w-64 rounded-xl border border-[#1E293B] bg-[#0F172A] px-3.5 py-2.5 text-xs text-white shadow-lg"
            style={{
              left: Math.min(
                Math.max(10, pointerPos.x + 14),
                Math.max(10, (containerRef.current?.clientWidth || 700) - 268)
              ),
              top: Math.max(10, pointerPos.y - 82),
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-white">
                {hoveredTileRect.tile.symbol}
              </span>
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {hoveredTileRect.tile.sector}
              </span>
            </div>
            <div className="text-[11px] text-[#CBD5E1] truncate mt-0.5">
              {hoveredTileRect.tile.name}
            </div>
            <div className="mt-2 pt-2 border-t border-[#1E293B] grid grid-cols-2 gap-y-1 font-mono tabular-nums text-[11px]">
              <span className="text-[#94A3B8]">Spot</span>
              <span className="text-right font-semibold text-white">
                {hoveredTileRect.tile.price} {hoveredTileRect.tile.unit}
              </span>
              <span className="text-[#94A3B8]">Return</span>
              <span
                className={`text-right font-semibold ${
                  hoveredTileRect.tile.changePercent >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
                }`}
              >
                {formatSignedPercent(hoveredTileRect.tile.changePercent)}
              </span>
              <span className="text-[#94A3B8]">Volatility (σ)</span>
              <span className="text-right font-semibold text-[#FBBF24] whitespace-nowrap">
                {hoveredTileRect.volatilityPct.toFixed(1)}% · {getVolatilityTileStyle(hoveredTileRect.volatilityPct).tier}
              </span>
              <span className="text-[#94A3B8]">Fund AUM</span>
              <span className="text-right text-[#E2E8F0]">
                ${hoveredTileRect.tile.marketCapB.toLocaleString()}B
              </span>
            </div>
          </div>
        )}
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
            <span aria-hidden="true" className="text-[#D1D5DB]">
              ·
            </span>
            <span className="font-mono font-semibold text-[#131722]">
              σ {inspectedVolatility.toFixed(1)}%
            </span>
          </div>
          <span className="text-[#787B86]">
            AUM ~${inspectedTile.marketCapB.toLocaleString()}B · Area weighted by AUM · Click tile to inspect
          </span>
        </div>
      )}
    </div>
  );
};
