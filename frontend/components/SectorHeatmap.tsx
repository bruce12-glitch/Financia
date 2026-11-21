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

const TREEMAP_WIDTH = 1180;
const TREEMAP_HEIGHT = 515;

function getSectorAccentHex(sector: string): string {
  const lower = sector.toLowerCase();
  if (lower.includes('gold') || lower.includes('metal') || lower.includes('sgb')) return '#F59E0B';
  if (lower.includes('gilt') || lower.includes('debt') || lower.includes('bond') || lower.includes('treasury')) {
    return '#38BDF8';
  }
  if (lower.includes('liquid')) return '#94A3B8';
  if (lower.includes('index') || lower.includes('nifty') || lower.includes('global')) return '#34D399';
  return '#60A5FA';
}

function buildInlineTileSparkline(
  values: number[],
  x0: number,
  y0: number,
  width: number,
  height: number
): { linePath: string; areaPath: string } | null {
  if (!Array.isArray(values) || values.length < 2) return null;
  const padX = Math.min(12, width * 0.1);
  const usableW = width - padX * 2;
  const sparkH = Math.min(26, Math.max(14, height * 0.22));
  const bottomY = y0 + height - 7;
  const topY = bottomY - sparkH;
  if (usableW < 28 || sparkH < 10) return null;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = maxVal - minVal || 1;

  const coords = values.map((v, i) => {
    const px = x0 + padX + (i / (values.length - 1)) * usableW;
    const py = bottomY - ((v - minVal) / span) * sparkH;
    return [Number(px.toFixed(1)), Number(py.toFixed(1))] as const;
  });

  const linePath = coords.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const first = coords[0];
  const last = coords[coords.length - 1];
  const areaPath = `${linePath} L${last[0]},${bottomY.toFixed(1)} L${first[0]},${bottomY.toFixed(1)} Z`;

  return { linePath, areaPath };
}

export const SectorHeatmap: React.FC<SectorHeatmapProps> = ({
  onSelectSymbol,
  liveFeedActive = true,
}) => {
  const [market, setMarket] = useState<HeatmapMarket>('india');
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [colorMode, setColorMode] = useState<HeatmapColorMode>('performance');
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
      className="rounded-[16px] bg-[#070d1c] border border-white/[0.1] text-white shadow-[0_24px_60px_rgba(4,7,17,0.42)] p-5 md:p-6 mt-6 overflow-hidden"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h3 className="text-[18px] md:text-[20px] font-display font-semibold tracking-[-0.02em] text-white">
            Asset Class Performance Map
          </h3>
          <p className="text-[12.5px] text-[#94a3b8] mt-1 flex flex-wrap items-center gap-2 tabular-nums">
            <span>AUM-weighted D3 treemap</span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="text-[#34d399] font-mono font-medium">
              ▲ {totals.advancers} gainers
            </span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="text-[#fb7185] font-mono font-medium">
              ▼ {totals.decliners} decliners
            </span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span
              className={`font-mono font-semibold ${
                totals.weightedAvg >= 0 ? 'text-[#34d399]' : 'text-[#fb7185]'
              }`}
            >
              Weighted {formatSignedPercent(totals.weightedAvg)}
            </span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="font-mono text-[#e2e8f0]">
              Mean σ {totals.weightedVolatility.toFixed(1)}%
            </span>
          </p>
        </div>

        {/* Stream Control, Color Mode Switcher, Market Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            data-testid="heatmap-stream-toggle"
            onClick={() => setIsStreaming((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isStreaming
                ? 'border-[#34d399]/35 bg-[#34d399]/10 text-[#34d399]'
                : 'border-white/[0.14] bg-white/[0.05] text-[#cbd5e1]'
            }`}
            title={isStreaming ? 'Pause real-time ticks' : 'Resume real-time ticks'}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'Live feed' : 'Paused'}</span>
          </button>

          {/* Color Mode Switcher */}
          <div
            role="group"
            aria-label="Heatmap color metric"
            className="inline-flex items-center p-1 rounded-[9px] bg-[#0e172a] border border-white/[0.08] gap-1"
          >
            {(
              [
                { id: 'performance', label: 'Return (%)' },
                { id: 'volatility', label: 'Volatility (σ)' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                data-testid={`heatmap-mode-${mode.id}`}
                aria-pressed={colorMode === mode.id}
                onClick={() => setColorMode(mode.id)}
                className={`px-2.5 py-1 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  colorMode === mode.id
                    ? 'bg-white text-[#040711]'
                    : 'text-[#94a3b8] hover:text-white'
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
            className="inline-flex items-center p-1 rounded-[9px] bg-[#0e172a] border border-white/[0.08] gap-1"
          >
            {(
              [
                { id: 'india', label: 'India Funds & Debt' },
                { id: 'global', label: 'Global ETFs & Gold' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={market === tab.id}
                onClick={() => handleMarketSwitch(tab.id)}
                className={`px-3 py-1 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  market === tab.id
                    ? 'bg-[#2563eb] text-white'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter + Scale Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3.5 border-b border-white/[0.08]">
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
              className={`px-3 py-1.5 rounded-[7px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                sectorFilter === sector
                  ? 'bg-white text-[#040711] border-white font-semibold'
                  : 'bg-white/[0.04] text-[#cbd5e1] border-white/[0.08] hover:bg-white/[0.09] hover:text-white'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>

        {/* Rich Multi-Stop Scale Legend */}
        {colorMode === 'volatility' ? (
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#94a3b8] tabular-nums">
            <span>Calm 8.5%</span>
            <span className="inline-flex h-2.5 w-32 rounded-full overflow-hidden border border-white/15">
              <span className="flex-1 bg-[#163252]" />
              <span className="flex-1 bg-[#0D5E56]" />
              <span className="flex-1 bg-[#854D0E]" />
              <span className="flex-1 bg-[#B45309]" />
              <span className="flex-1 bg-[#C2410C]" />
              <span className="flex-1 bg-[#991B1B]" />
            </span>
            <span>Extreme ≥38%</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#94a3b8] tabular-nums">
            <span>−1.5%</span>
            <span className="inline-flex h-2.5 w-32 rounded-full overflow-hidden border border-white/15">
              <span className="flex-1 bg-[#991B1B]" />
              <span className="flex-1 bg-[#5B1F30]" />
              <span className="flex-1 bg-[#1E293B]" />
              <span className="flex-1 bg-[#143D59]" />
              <span className="flex-1 bg-[#0F6B5C]" />
              <span className="flex-1 bg-[#047857]" />
            </span>
            <span>+1.5%</span>
          </div>
        )}
      </div>

      {/* Sector Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 py-3.5">
        {groups.map((grp) => {
          const isSelected = sectorFilter === grp.sector;
          const accent = getSectorAccentHex(grp.sector);
          return (
            <button
              key={grp.sector}
              type="button"
              onClick={() => setSectorFilter(isSelected ? 'All' : grp.sector)}
              className={`rounded-[10px] border px-3 py-2.5 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#38bdf8] bg-[#0e1b33]'
                  : 'border-white/[0.08] bg-[#0b1224] hover:border-white/[0.22]'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 text-[11.5px]">
                <span className="font-semibold text-white truncate">{grp.sector}</span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1.5 text-[11.5px] font-mono tabular-nums">
                <span
                  className={`font-semibold ${
                    grp.avgChangePercent >= 0 ? 'text-[#34d399]' : 'text-[#fb7185]'
                  }`}
                >
                  {formatSignedPercent(grp.avgChangePercent)}
                </span>
                <span style={{ color: accent }} className="font-medium">
                  σ {grp.volatilityPct.toFixed(1)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Obsidian D3.js Squarified Treemap Canvas with Gradient Glass Tiles & Embedded Sparklines */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMoveContainer}
        onMouseLeave={() => {
          setHoveredSymbol(null);
          setPointerPos(null);
        }}
        className="relative rounded-[12px] border border-white/[0.1] bg-[#040711] p-1.5 overflow-hidden"
      >
        <svg
          data-testid="d3-treemap-svg"
          viewBox={`0 0 ${TREEMAP_WIDTH} ${TREEMAP_HEIGHT}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label="D3.js sector-wide performance and volatility treemap"
        >
          <defs>
            {treemapLayout.sectors.map((sec) => {
              const secId = sec.sector.replace(/[^a-zA-Z0-9]/g, '_');
              return (
                <clipPath key={`clip-sec-${secId}`} id={`clip-sec-${secId}`}>
                  <rect
                    x={sec.x0 + 4}
                    y={sec.y0}
                    width={Math.max(0, sec.x1 - sec.x0 - 8)}
                    height={26}
                  />
                </clipPath>
              );
            })}
            {treemapLayout.tiles.map((leaf) => {
              const style =
                colorMode === 'volatility'
                  ? getVolatilityTileStyle(leaf.volatilityPct)
                  : getHeatmapTileStyle(leaf.tile.changePercent);
              const safeId = leaf.tile.symbol.replace(/[^a-zA-Z0-9]/g, '_');
              return (
                <React.Fragment key={`defs-${safeId}`}>
                  <linearGradient id={`tile-grad-${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={style.bg} />
                    <stop offset="100%" stopColor={style.bgEnd} />
                  </linearGradient>
                  <linearGradient id={`spark-grad-${safeId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={style.sparkColor} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={style.sparkColor} stopOpacity="0" />
                  </linearGradient>
                  <clipPath id={`clip-tile-${safeId}`}>
                    <rect
                      x={leaf.x0}
                      y={leaf.y0}
                      width={Math.max(0, leaf.x1 - leaf.x0)}
                      height={Math.max(0, leaf.y1 - leaf.y0)}
                      rx={7}
                    />
                  </clipPath>
                </React.Fragment>
              );
            })}
          </defs>

          {/* Sector Obsidian Frames */}
          {treemapLayout.sectors.map((sec) => {
            const secWidth = Math.max(0, sec.x1 - sec.x0);
            const secHeight = Math.max(0, sec.y1 - sec.y0);
            const secId = sec.sector.replace(/[^a-zA-Z0-9]/g, '_');
            const showFullHeader = secWidth >= 260;
            const showMediumHeader = secWidth >= 195;
            const sectorAccent = getSectorAccentHex(sec.sector);

            return (
              <g key={sec.sector} className="d3-treemap-sector">
                <rect
                  x={sec.x0}
                  y={sec.y0}
                  width={secWidth}
                  height={secHeight}
                  rx={9}
                  fill="#0a1020"
                  stroke="rgba(148, 163, 184, 0.16)"
                  strokeWidth={1}
                />
                {/* Precision top accent hairline inside sector container */}
                <line
                  x1={sec.x0 + 10}
                  y1={sec.y0 + 1}
                  x2={sec.x0 + Math.min(54, Math.max(12, secWidth - 10))}
                  y2={sec.y0 + 1}
                  stroke={sectorAccent}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.85}
                />
                <g clipPath={`url(#clip-sec-${secId})`}>
                  <text
                    x={sec.x0 + 10}
                    y={sec.y0 + 17}
                    fill="#E2E8F0"
                    fontSize={11}
                    fontWeight={600}
                    fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                    letterSpacing="-0.01em"
                  >
                    {sec.sector}
                    {showFullHeader
                      ? `  ·  ${formatSignedPercent(sec.avgChangePercent)}  ·  σ ${sec.volatilityPct.toFixed(1)}%`
                      : showMediumHeader
                        ? ` · ${formatSignedPercent(sec.avgChangePercent)}`
                        : ''}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Metallic Gradient Tiles with Micro-Sparklines & Spotlight Focus */}
          {treemapLayout.tiles.map((leaf) => {
            const tile = leaf.tile;
            const width = Math.max(0, leaf.x1 - leaf.x0);
            const height = Math.max(0, leaf.y1 - leaf.y0);
            const cx = leaf.x0 + width / 2;
            const cy = leaf.y0 + height / 2;
            const safeId = tile.symbol.replace(/[^a-zA-Z0-9]/g, '_');
            const isHovered = hoveredSymbol === tile.symbol;
            const isDimmed = hoveredSymbol !== null && !isHovered;

            const style =
              colorMode === 'volatility'
                ? getVolatilityTileStyle(leaf.volatilityPct)
                : getHeatmapTileStyle(tile.changePercent);

            const showSparkline = width >= 106 && height >= 106;
            const spark = showSparkline
              ? buildInlineTileSparkline(tile.sparkline, leaf.x0, leaf.y0, width, height)
              : null;

            const canShowFull = width >= Math.max(96, tile.symbol.length * 7.6 + 16) && height >= 68;
            const canShowCompact = width >= 40 && height >= 36;
            const symbolFontSize =
              width >= 190 && height >= 115
                ? 19
                : width >= 120
                  ? 14
                  : width >= 72
                    ? tile.symbol.length >= 8
                      ? 10
                      : 11.5
                    : 9;
            const maxCharsForWidth = Math.max(4, Math.floor((width - 8) / (symbolFontSize * 0.62)));
            const displaySymbol =
              tile.symbol.length > maxCharsForWidth
                ? `${tile.symbol.slice(0, Math.max(3, maxCharsForWidth - 1))}…`
                : tile.symbol;

            const textCenterY = spark ? cy - 13 : cy;

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
                style={{
                  opacity: isDimmed ? 0.52 : 1,
                  transition: 'opacity 180ms ease',
                }}
              >
                {/* Gradient Metallic Surface */}
                <rect
                  x={leaf.x0}
                  y={leaf.y0}
                  width={width}
                  height={height}
                  rx={7}
                  fill={`url(#tile-grad-${safeId})`}
                  stroke={isHovered ? '#38BDF8' : style.border}
                  strokeWidth={isHovered ? 2.2 : 1}
                />

                {/* Top Specular Edge Sheen */}
                {width > 24 && (
                  <line
                    x1={leaf.x0 + 6}
                    y1={leaf.y0 + 1}
                    x2={leaf.x1 - 6}
                    y2={leaf.y0 + 1}
                    stroke="rgba(255, 255, 255, 0.22)"
                    strokeWidth={1}
                    pointerEvents="none"
                  />
                )}

                <g clipPath={`url(#clip-tile-${safeId})`} pointerEvents="none">
                  {/* Subtle Live Rolling Micro-Sparkline */}
                  {spark && (
                    <>
                      <path d={spark.areaPath} fill={`url(#spark-grad-${safeId})`} />
                      <path
                        d={spark.linePath}
                        fill="none"
                        stroke={style.sparkColor}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.78}
                      />
                    </>
                  )}

                  {canShowCompact && (
                    <>
                      <text
                        x={cx}
                        y={canShowFull ? textCenterY - 6 : textCenterY - 2}
                        textAnchor="middle"
                        fill={style.text}
                        fontSize={symbolFontSize}
                        fontWeight={700}
                        letterSpacing="-0.02em"
                        fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                      >
                        {displaySymbol}
                      </text>

                      {canShowFull ? (
                        <>
                          <text
                            x={cx}
                            y={textCenterY + 12}
                            textAnchor="middle"
                            fill={style.text}
                            fontSize={12.5}
                            fontWeight={600}
                            fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                          >
                            {colorMode === 'volatility'
                              ? `σ ${leaf.volatilityPct.toFixed(1)}%`
                              : formatSignedPercent(tile.changePercent)}
                          </text>
                          <text
                            x={cx}
                            y={textCenterY + 27}
                            textAnchor="middle"
                            fill={style.subText}
                            fontSize={10.5}
                            fontWeight={500}
                            fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                            opacity={0.88}
                          >
                            {colorMode === 'volatility'
                              ? `${formatSignedPercent(tile.changePercent)} · ${tile.unit === 'INR' ? '₹' : '$'}${tile.price}`
                              : `σ ${leaf.volatilityPct.toFixed(1)}% · ${tile.unit === 'INR' ? '₹' : '$'}${tile.price}`}
                          </text>
                        </>
                      ) : (
                        <text
                          x={cx}
                          y={textCenterY + 12}
                          textAnchor="middle"
                          fill={style.subText}
                          fontSize={10}
                          fontWeight={600}
                          fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                        >
                          {colorMode === 'volatility'
                            ? `${leaf.volatilityPct.toFixed(0)}%σ`
                            : formatSignedPercent(tile.changePercent)}
                        </text>
                      )}
                    </>
                  )}
                </g>
              </g>
            );
          })}
        </svg>

        {/* Floating Interactive Obsidian Glass Tooltip */}
        {hoveredTileRect && pointerPos && (
          <div
            data-testid="d3-treemap-tooltip"
            className="pointer-events-none absolute z-20 w-64 rounded-[12px] bg-[#040711]/95 backdrop-blur-xl border border-white/[0.16] shadow-[0_18px_42px_rgba(0,0,0,0.65)] px-4 py-3 text-xs text-white"
            style={{
              left: Math.min(
                Math.max(12, pointerPos.x + 16),
                Math.max(12, (containerRef.current?.clientWidth || 700) - 270)
              ),
              top: Math.max(12, pointerPos.y - 96),
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-[14px] font-semibold text-white">
                {hoveredTileRect.tile.symbol}
              </span>
              <span className="text-[11px] font-mono text-[#38bdf8]">
                {hoveredTileRect.tile.sector}
              </span>
            </div>
            <div className="text-[11.5px] text-[#94a3b8] truncate mt-0.5">
              {hoveredTileRect.tile.name}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.1] grid grid-cols-2 gap-y-1.5 font-mono tabular-nums text-[11.5px]">
              <span className="text-[#94a3b8]">Spot / NAV</span>
              <span className="text-right font-semibold text-white">
                {hoveredTileRect.tile.unit === 'INR' ? '₹' : '$'}
                {hoveredTileRect.tile.price}
              </span>
              <span className="text-[#94a3b8]">Session Return</span>
              <span
                className={`text-right font-semibold ${
                  hoveredTileRect.tile.changePercent >= 0 ? 'text-[#34d399]' : 'text-[#fb7185]'
                }`}
              >
                {hoveredTileRect.tile.changePercent >= 0 ? '▲' : '▼'}{' '}
                {formatSignedPercent(hoveredTileRect.tile.changePercent)}
              </span>
              <span className="text-[#94a3b8]">Volatility (σ)</span>
              <span className="text-right font-semibold text-[#fbbf24] whitespace-nowrap">
                {hoveredTileRect.volatilityPct.toFixed(1)}% ·{' '}
                {getVolatilityTileStyle(hoveredTileRect.volatilityPct).tier}
              </span>
              <span className="text-[#94a3b8]">AUM Weight</span>
              <span className="text-right text-[#e2e8f0]">
                ${hoveredTileRect.tile.marketCapB.toLocaleString()}B
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Inspected Tile Telemetry Bar */}
      {inspectedTile && (
        <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="font-display font-semibold text-white text-[13px]">
              {inspectedTile.symbol}
            </span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="font-medium text-[#cbd5e1]">{inspectedTile.name}</span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="text-[#94a3b8]">{inspectedTile.sector}</span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="font-mono text-white">
              {inspectedTile.unit === 'INR' ? '₹' : '$'}
              {inspectedTile.price}
            </span>
            <span
              className={`font-mono font-semibold ${
                inspectedTile.changePercent >= 0 ? 'text-[#34d399]' : 'text-[#fb7185]'
              }`}
            >
              {formatSignedPercent(inspectedTile.changePercent)}
            </span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="font-mono font-semibold text-[#38bdf8]">
              σ {inspectedVolatility.toFixed(1)}%
            </span>
          </div>
          <span className="text-[#94a3b8] font-mono text-[11px]">
            AUM ~${inspectedTile.marketCapB.toLocaleString()}B · Click any tile for full quote dossier
          </span>
        </div>
      )}
    </div>
  );
};
