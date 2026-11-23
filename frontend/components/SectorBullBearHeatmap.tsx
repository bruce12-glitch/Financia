import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { Grid3X3, TrendingDown, TrendingUp } from 'lucide-react';
import { SectorHeatmapItem } from '../utils/fundIntelligenceEngine';
import {
  buildBullBearSectorTreemapData,
  SectorBullBearStance,
  SectorTreemapNode,
} from '../utils/sectorHeatmapEngine';

interface SectorBullBearHeatmapProps {
  symbol: string;
  sectors: SectorHeatmapItem[];
}

interface CustomCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  weightPct?: number;
  change1MPct?: number;
  stance?: SectorBullBearStance;
  fill?: string;
  stroke?: string;
  textColor?: string;
  subTextColor?: string;
  selectedSector: string | null;
  onSelectSector: (name: string) => void;
}

const TreemapSectorCell: React.FC<CustomCellProps> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = '',
  weightPct = 0,
  change1MPct = 0,
  stance = 'Neutral',
  fill = '#475569',
  stroke = '#334155',
  textColor = '#ffffff',
  subTextColor = '#e2e8f0',
  selectedSector,
  onSelectSector,
}) => {
  if (width < 4 || height < 4) return null;
  const isSelected = selectedSector === name;
  const innerX = x + 2;
  const innerY = y + 2;
  const innerW = Math.max(0, width - 4);
  const innerH = Math.max(0, height - 4);
  const clipId = `sector-tile-clip-${Math.round(x)}-${Math.round(y)}-${Math.round(width)}`;

  const showTitle = innerW >= 62 && innerH >= 34;
  const showWeight = innerW >= 54 && innerH >= 48;
  const showStanceLine = innerW >= 86 && innerH >= 74;

  const maxChars = Math.max(6, Math.floor((innerW - 18) / 7.2));
  const truncatedName = name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name;
  const stanceLabel =
    innerW >= 140
      ? `${stance} · ${change1MPct >= 0 ? '+' : ''}${change1MPct.toFixed(1)}% 1M`
      : `${change1MPct >= 0 ? '+' : ''}${change1MPct.toFixed(1)}% 1M`;

  return (
    <g
      onClick={() => onSelectSector(name)}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      aria-label={`${name} ${weightPct.toFixed(1)}% weight, ${stance}, ${change1MPct >= 0 ? '+' : ''}${change1MPct.toFixed(1)}% 1M`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectSector(name);
        }
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={innerX + 2} y={innerY + 2} width={Math.max(0, innerW - 4)} height={Math.max(0, innerH - 4)} rx={6} ry={6} />
        </clipPath>
      </defs>
      <rect
        x={innerX}
        y={innerY}
        width={innerW}
        height={innerH}
        rx={7}
        ry={7}
        fill={fill}
        stroke={isSelected ? '#0f172a' : stroke}
        strokeWidth={isSelected ? 2 : 1}
        opacity={isSelected ? 1 : 0.94}
      />
      <g clipPath={`url(#${clipId})`} style={{ pointerEvents: 'none' }}>
        {showTitle && (
          <text
            x={innerX + 10}
            y={innerY + 20}
            fill={textColor}
            stroke="none"
            fontSize={innerW >= 130 ? 12.5 : 11}
            fontWeight={600}
            fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
          >
            {truncatedName}
          </text>
        )}
        {showWeight && (
          <text
            x={innerX + 10}
            y={innerY + (showTitle ? 40 : 24)}
            fill={textColor}
            stroke="none"
            fontSize={innerW >= 130 ? 16 : 13.5}
            fontWeight={700}
            fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
          >
            {weightPct.toFixed(1)}%
          </text>
        )}
        {showStanceLine && (
          <text
            x={innerX + 10}
            y={innerY + 58}
            fill={subTextColor}
            stroke="none"
            fontSize={10.5}
            fontWeight={500}
            fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
          >
            {stanceLabel}
          </text>
        )}
      </g>
    </g>
  );
};

interface TreemapTooltipPayload {
  payload?: SectorTreemapNode;
}

const SectorTooltipContent: React.FC<{ active?: boolean; payload?: TreemapTooltipPayload[] }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || !payload[0]?.payload) return null;
  const node = payload[0].payload;
  return (
    <div className="rounded-[9px] border border-[#cbd5e1] bg-white/95 backdrop-blur-sm shadow-lg px-3.5 py-2.5 text-[12px] text-[#0f172a] max-w-[240px]">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-semibold text-[#0f172a]">{node.name}</span>
        <span
          className={`font-mono text-[11px] font-bold ${
            node.stance === 'Bullish'
              ? 'text-[#059669]'
              : node.stance === 'Bearish'
                ? 'text-[#dc2626]'
                : 'text-[#475569]'
          }`}
        >
          {node.stance}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px] pt-1 border-t border-[#f1f5f9]">
        <span className="text-[#64748b]">Portfolio Weight</span>
        <span className="text-right font-mono font-bold tabular-nums">{node.weightPct.toFixed(1)}%</span>
        <span className="text-[#64748b]">1M Momentum</span>
        <span
          className={`text-right font-mono font-semibold tabular-nums ${
            node.change1MPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
          }`}
        >
          {node.change1MPct >= 0 ? '+' : ''}
          {node.change1MPct.toFixed(1)}%
        </span>
        <span className="text-[#64748b]">Bull / Bear Tilt</span>
        <span className="text-right font-mono tabular-nums">
          {node.bullContributionPct.toFixed(1)}% / {node.bearContributionPct.toFixed(1)}%
        </span>
        <span className="text-[#64748b]">Top Holding</span>
        <span className="text-right font-medium truncate">{node.topHolding}</span>
      </div>
    </div>
  );
};

export const SectorBullBearHeatmap: React.FC<SectorBullBearHeatmapProps> = ({
  symbol,
  sectors,
}) => {
  const [stanceFilter, setStanceFilter] = useState<'ALL' | SectorBullBearStance>('ALL');
  const [selectedSectorName, setSelectedSectorName] = useState<string | null>(null);

  const summary = useMemo(
    () => buildBullBearSectorTreemapData(sectors, stanceFilter),
    [sectors, stanceFilter]
  );

  const activeNode =
    summary.nodes.find((n) => n.name === selectedSectorName) || summary.nodes[0] || null;

  return (
    <div
      data-testid="recharts-sector-bull-bear-heatmap"
      className="rounded-[12px] border border-[#e5e9f0] bg-white p-4 space-y-4"
    >
      {/* Header & Stance Filters */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-[16px] font-display font-bold text-[#0f172a] tracking-tight flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-[#2563eb]" />
            Sector Distribution &amp; Bull / Bear Weighting Heatmap
          </h4>
          <p className="text-[12px] text-[#64748b] mt-0.5">
            Proportional holdings treemap for {symbol} colored by bullish and bearish sector momentum
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter sector heatmap by bull or bear stance"
          className="inline-flex items-center p-0.5 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0]"
        >
          {(
            [
              { id: 'ALL', label: 'All Sectors' },
              { id: 'Bullish', label: `Bullish (${summary.bullWeightPct.toFixed(0)}%)` },
              { id: 'Bearish', label: `Bearish (${summary.bearWeightPct.toFixed(0)}%)` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={stanceFilter === tab.id}
              onClick={() => setStanceFilter(tab.id)}
              className={`px-2.5 py-1 rounded-[6px] text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                stanceFilter === tab.id
                  ? 'bg-[#0f172a] text-white'
                  : 'text-[#475569] hover:text-[#0f172a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bull vs Neutral vs Bear Weighting Meter */}
      <div className="rounded-[9px] bg-[#f8fafc] border border-[#eef2f6] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] mb-2">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#047857]">
              <TrendingUp className="w-3.5 h-3.5" />
              Bull Weight: <span className="font-mono tabular-nums">{summary.bullWeightPct.toFixed(1)}%</span>
            </span>
            {summary.neutralWeightPct > 0 && (
              <span className="text-[#475569] font-medium">
                Neutral: <span className="font-mono tabular-nums">{summary.neutralWeightPct.toFixed(1)}%</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#be123c]">
              <TrendingDown className="w-3.5 h-3.5" />
              Bear Weight: <span className="font-mono tabular-nums">{summary.bearWeightPct.toFixed(1)}%</span>
            </span>
          </div>
          <span className="font-mono text-[11.5px] font-semibold text-[#0f172a] tabular-nums">
            Net Tilt: {summary.netTiltPct >= 0 ? '+' : ''}
            {summary.netTiltPct.toFixed(1)}% ({summary.dominantStance})
          </span>
        </div>

        <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-[#e2e8f0]">
          {summary.bullWeightPct > 0 && (
            <div
              style={{ width: `${Math.min(100, summary.bullWeightPct)}%` }}
              className="h-full bg-[#059669] transition-all"
              title={`Bullish Weight: ${summary.bullWeightPct.toFixed(1)}%`}
            />
          )}
          {summary.neutralWeightPct > 0 && (
            <div
              style={{ width: `${Math.min(100, summary.neutralWeightPct)}%` }}
              className="h-full bg-[#64748b] transition-all"
              title={`Neutral Weight: ${summary.neutralWeightPct.toFixed(1)}%`}
            />
          )}
          {summary.bearWeightPct > 0 && (
            <div
              style={{ width: `${Math.min(100, summary.bearWeightPct)}%` }}
              className="h-full bg-[#e11d48] transition-all"
              title={`Bearish Weight: ${summary.bearWeightPct.toFixed(1)}%`}
            />
          )}
        </div>
      </div>

      {/* Recharts Interactive Treemap */}
      <div className="w-full h-[240px]" data-testid="recharts-treemap-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={summary.nodes as unknown as Array<Record<string, unknown>>}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#ffffff"
            isAnimationActive={false}
            content={
              <TreemapSectorCell
                selectedSector={activeNode?.name || null}
                onSelectSector={setSelectedSectorName}
              />
            }
          >
            <Tooltip content={<SectorTooltipContent />} />
          </Treemap>
        </ResponsiveContainer>
      </div>

      {/* Active Sector Detail Strip */}
      {activeNode && (
        <div className="rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-[#0f172a]">{activeNode.name}</span>
            <span className="font-mono font-bold text-[#0f172a] tabular-nums">
              {activeNode.weightPct.toFixed(1)}% weight
            </span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                activeNode.change1MPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
              }`}
            >
              {activeNode.stance} ({activeNode.change1MPct >= 0 ? '+' : ''}
              {activeNode.change1MPct.toFixed(1)}% 1M)
            </span>
          </div>
          <div className="text-[#475569] font-mono text-[11.5px] tabular-nums">
            Anchor: <strong className="font-sans text-[#0f172a]">{activeNode.topHolding}</strong>
            {activeNode.peMultiple !== null ? ` · ${activeNode.peMultiple.toFixed(1)}x P/E` : ''}
          </div>
        </div>
      )}
    </div>
  );
};
