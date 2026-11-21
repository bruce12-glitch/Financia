import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { Activity, Grid3X3, Plus, ShieldCheck, X } from 'lucide-react';
import { StockQuote } from '../types/financia';
import { SCREENER_FUNDS } from '../utils/screenerEngine';
import {
  build90DayCorrelationMatrix,
  buildRollingPairCorrelationSeries90d,
  CorrelationMatrixCell90d,
} from '../utils/correlation90dEngine';

export interface TerminalCorrelationMatrix90dProps {
  primarySymbol: string;
  comparisonTickers: string[];
  stocks: StockQuote[];
  onChangeComparisonTickers?: (nextTickers: string[]) => void;
}

const CORR_PRESETS: Array<{ label: string; peers: string[] }> = [
  { label: 'Multi-Asset Hedge', peers: ['NIFTYBEES', 'GOLDBEES', 'SBIGILT'] },
  { label: 'US Equity + Macro', peers: ['SPY', 'GLD', 'TLT'] },
  { label: 'India Equity Core', peers: ['PPFAS', 'HDFCMID', 'QUANTSC'] },
];

interface MatrixTileShapeProps {
  cx?: number;
  cy?: number;
  payload?: CorrelationMatrixCell90d;
  tileSize: number;
  selectedPairKey: string;
  onSelectCell: (cell: CorrelationMatrixCell90d) => void;
}

const CorrelationTileShape: React.FC<MatrixTileShapeProps> = ({
  cx = 0,
  cy = 0,
  payload,
  tileSize,
  selectedPairKey,
  onSelectCell,
}) => {
  if (!payload) return null;
  const pairKey = `${payload.ySymbol}|${payload.xSymbol}`;
  const reverseKey = `${payload.xSymbol}|${payload.ySymbol}`;
  const isSelected = pairKey === selectedPairKey || reverseKey === selectedPairKey;
  const half = tileSize / 2;

  return (
    <g
      data-testid={`corr90d-tile-${payload.ySymbol}-${payload.xSymbol}`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelectCell(payload)}
      role="button"
      tabIndex={0}
      aria-label={`Correlation between ${payload.ySymbol} and ${payload.xSymbol}: ${payload.r.toFixed(2)}`}
    >
      <rect
        x={cx - half}
        y={cy - half}
        width={tileSize}
        height={tileSize}
        rx={8}
        ry={8}
        fill={payload.fillHex}
        stroke={isSelected ? '#0f172a' : '#ffffff'}
        strokeWidth={isSelected ? 2.5 : 2}
      />
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={payload.textHex}
        fontSize={tileSize >= 64 ? 13 : 11.5}
        fontWeight={700}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {payload.r > 0 && !payload.isDiagonal ? `+${payload.r.toFixed(2)}` : payload.r.toFixed(2)}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={payload.textHex}
        opacity={0.82}
        fontSize={9.5}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {payload.isDiagonal ? 'SELF' : `R² ${(payload.rSquared * 100).toFixed(0)}%`}
      </text>
    </g>
  );
};

export const TerminalCorrelationMatrix90d: React.FC<
  TerminalCorrelationMatrix90dProps
> = ({ primarySymbol, comparisonTickers, stocks, onChangeComparisonTickers }) => {
  const [addTicker, setAddTicker] = useState<string>('');
  const [selectedPair, setSelectedPair] = useState<[string, string] | null>(null);

  // Build deduplicated active symbols list (Primary + Comparison tickers, minimum 2 for meaningful pairwise stats)
  const activeSymbols = useMemo(() => {
    const ordered = [primarySymbol, ...comparisonTickers]
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const unique = Array.from(new Set(ordered)).slice(0, 6);
    if (unique.length < 2) {
      const fallbackPeer = unique[0] === 'GOLDBEES' ? 'PPFAS' : 'GOLDBEES';
      return [...unique, fallbackPeer];
    }
    return unique;
  }, [primarySymbol, comparisonTickers]);

  const matrixResult = useMemo(
    () =>
      build90DayCorrelationMatrix({
        symbols: activeSymbols,
        stocks,
      }),
    [activeSymbols, stocks]
  );

  // Default focused pair = best diversifier pair (most insightful) or first two active symbols
  const focusedPair: [string, string] = useMemo(() => {
    if (
      selectedPair &&
      matrixResult.symbols.includes(selectedPair[0]) &&
      matrixResult.symbols.includes(selectedPair[1])
    ) {
      return selectedPair;
    }
    if (matrixResult.bestDiversifierPair) {
      return [
        matrixResult.bestDiversifierPair.symbolA,
        matrixResult.bestDiversifierPair.symbolB,
      ];
    }
    return [matrixResult.symbols[0], matrixResult.symbols[1] || matrixResult.symbols[0]];
  }, [selectedPair, matrixResult]);

  const focusedCell = useMemo(() => {
    return (
      matrixResult.cells.find(
        (c) => c.ySymbol === focusedPair[0] && c.xSymbol === focusedPair[1]
      ) || matrixResult.cells[0]
    );
  }, [matrixResult.cells, focusedPair]);

  const rollingSeries = useMemo(
    () =>
      buildRollingPairCorrelationSeries90d(
        matrixResult,
        focusedPair[0],
        focusedPair[1],
        21
      ),
    [matrixResult, focusedPair]
  );

  const availableToAdd = useMemo(() => {
    const taken = new Set(activeSymbols);
    return SCREENER_FUNDS.filter((f) => !taken.has(f.symbol));
  }, [activeSymbols]);

  const handleAddTicker = (sym: string) => {
    if (!sym || !onChangeComparisonTickers) return;
    const nextPeers = Array.from(
      new Set([...comparisonTickers, sym].filter((s) => s !== primarySymbol))
    ).slice(0, 5);
    onChangeComparisonTickers(nextPeers);
    setAddTicker('');
  };

  const handleRemoveTicker = (sym: string) => {
    if (!onChangeComparisonTickers || sym === primarySymbol) return;
    const nextPeers = comparisonTickers.filter((s) => s !== sym);
    onChangeComparisonTickers(nextPeers);
  };

  const handleApplyPreset = (peers: string[]) => {
    if (!onChangeComparisonTickers) return;
    const cleaned = peers.filter((s) => s !== primarySymbol).slice(0, 5);
    onChangeComparisonTickers(cleaned);
    setSelectedPair(null);
  };

  const n = matrixResult.symbols.length;
  const tileSize = n <= 3 ? 82 : n === 4 ? 68 : n === 5 ? 58 : 50;
  const chartHeight = Math.max(290, n * (tileSize + 10) + 64);

  return (
    <section
      id="correlation-matrix-90d"
      data-testid="terminal-correlation-matrix-90d"
      aria-label="90-Day Comparison Tickers Correlation Matrix"
      className="scroll-mt-24 rounded-[14px] bg-white border border-[#e2e8f0] overflow-hidden shadow-xs"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#2563eb] font-semibold flex items-center gap-1.5">
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>90-Day Statistical Correlation Matrix · Recharts Analytics</span>
          </div>
          <h3 className="text-lg font-display font-bold text-[#0f172a] mt-0.5">
            Pairwise Daily Return Correlation ({matrixResult.symbols.length} Tickers · Last 90 Days)
          </h3>
          <p className="text-xs text-[#64748b] mt-0.5">
            Pearson correlation (<span className="font-mono">r</span>) and variance explained (<span className="font-mono">R²</span>) across trailing 90-day daily returns. Click any tile to inspect its 21-day rolling correlation regime.
          </p>
        </div>

        {/* Diversification Score Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3.5 py-2 text-right">
            <div className="text-[10px] font-mono uppercase text-[#1d4ed8] font-semibold">
              Diversification Score
            </div>
            <div
              data-testid="corr90d-diversification-score"
              className="text-base font-mono font-bold text-[#0f172a] tabular-nums"
            >
              {matrixResult.diversificationScore}/100{' '}
              <span className="text-[11px] font-sans font-semibold text-[#1d4ed8]">
                · {matrixResult.diversificationTier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ticker Basket Controls + Cross-Asset Presets */}
      <div className="px-5 py-3 border-b border-[#e2e8f0] bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-[#64748b] mr-1">Matrix Tickers:</span>
          {matrixResult.symbols.map((sym) => {
            const isPrimary = sym === primarySymbol.toUpperCase();
            return (
              <span
                key={sym}
                data-testid={`corr90d-chip-${sym}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] border text-xs font-mono ${
                  isPrimary
                    ? 'bg-[#0f172a] text-white border-[#0f172a] font-bold'
                    : 'bg-[#f8fafc] text-[#0f172a] border-[#cbd5e1] font-semibold'
                }`}
              >
                <span>{sym}</span>
                <span className={`text-[10px] ${isPrimary ? 'text-[#38bdf8]' : 'text-[#64748b]'}`}>
                  {matrixResult.return90dBySymbol[sym] >= 0 ? '+' : ''}
                  {matrixResult.return90dBySymbol[sym].toFixed(1)}%
                </span>
                {!isPrimary && onChangeComparisonTickers && comparisonTickers.includes(sym) && (
                  <button
                    type="button"
                    aria-label={`Remove ${sym} from correlation matrix`}
                    onClick={() => handleRemoveTicker(sym)}
                    className="text-[#94a3b8] hover:text-[#dc2626] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}

          {onChangeComparisonTickers && activeSymbols.length < 6 && (
            <div className="inline-flex items-center gap-1 ml-1">
              <Plus className="w-3.5 h-3.5 text-[#2563eb]" />
              <select
                aria-label="Add comparison ticker to 90-day correlation matrix"
                data-testid="corr90d-add-ticker-select"
                value={addTicker}
                onChange={(e) => handleAddTicker(e.target.value)}
                className="h-7 rounded-[7px] border border-[#cbd5e1] bg-white px-2 text-xs text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer"
              >
                <option value="">Add ticker ({activeSymbols.length}/6)...</option>
                {availableToAdd.map((f) => (
                  <option key={f.symbol} value={f.symbol}>
                    {f.symbol} — {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {onChangeComparisonTickers && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#64748b]">Presets:</span>
            {CORR_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPreset(p.peers)}
                className="px-2.5 py-1 rounded-[7px] border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eff6ff] hover:border-[#bfdbfe] text-[11px] font-medium text-[#334155] cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Split: Left Recharts Scatter Heatmap Matrix (7 cols) + Right Pair Drilldown & Rolling 21D Curve (5 cols) */}
      <div className="p-5 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT 7 COLS: RECHARTS CORRELATION MATRIX SCATTERCHART */}
        <div className="xl:col-span-7 space-y-3">
          <div
            data-testid="corr90d-recharts-matrix"
            className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc]/50 p-3"
          >
            <div style={{ width: '100%', height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 26, bottom: 24, left: 26 }}>
                  <XAxis
                    type="number"
                    dataKey="xIndex"
                    domain={[-0.6, n - 0.4]}
                    ticks={matrixResult.symbols.map((_, i) => i)}
                    tickFormatter={(idx: number) => matrixResult.symbols[idx] || ''}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11.5, fontWeight: 700, fill: '#0f172a', fontFamily: 'ui-monospace, monospace' }}
                    orientation="top"
                  />
                  <YAxis
                    type="number"
                    dataKey="yIndex"
                    domain={[-0.6, n - 0.4]}
                    ticks={matrixResult.symbols.map((_, i) => i)}
                    tickFormatter={(yIdx: number) => matrixResult.symbols[n - 1 - yIdx] || ''}
                    axisLine={false}
                    tickLine={false}
                    width={78}
                    tick={{ fontSize: 11.5, fontWeight: 700, fill: '#0f172a', fontFamily: 'ui-monospace, monospace' }}
                  />
                  <ZAxis type="number" dataKey="absR" range={[tileSize * tileSize, tileSize * tileSize]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload[0]) return null;
                      const cell = payload[0].payload as CorrelationMatrixCell90d;
                      return (
                        <div className="rounded-[9px] bg-[#0f172a] border border-[#334155] px-3.5 py-2.5 text-xs text-white shadow-xl space-y-1">
                          <div className="font-mono font-bold text-[#38bdf8]">
                            {cell.ySymbol} vs {cell.xSymbol} (90D)
                          </div>
                          <div className="text-[11px] text-[#cbd5e1]">
                            {cell.yName} × {cell.xName}
                          </div>
                          <div className="pt-1 border-t border-white/10 flex items-center justify-between gap-4 font-mono">
                            <span className="text-[#94a3b8]">Pearson r:</span>
                            <span className="font-bold text-white">
                              {cell.r > 0 ? `+${cell.r.toFixed(3)}` : cell.r.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 font-mono">
                            <span className="text-[#94a3b8]">R² Explained:</span>
                            <span className="font-bold text-white">
                              {(cell.rSquared * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-[10.5px] font-semibold text-[#34d399] pt-0.5">
                            {cell.relationshipLabel}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    name="90D Correlation"
                    data={matrixResult.cells}
                    isAnimationActive={false}
                    shape={(props: unknown) => {
                      const p = props as { cx?: number; cy?: number; payload?: CorrelationMatrixCell90d };
                      return (
                        <CorrelationTileShape
                          cx={p.cx}
                          cy={p.cy}
                          payload={p.payload}
                          tileSize={tileSize}
                          selectedPairKey={`${focusedPair[0]}|${focusedPair[1]}`}
                          onSelectCell={(cell) => {
                            if (!cell.isDiagonal) {
                              setSelectedPair([cell.ySymbol, cell.xSymbol]);
                            }
                          }}
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Diverging Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-mono text-[#475569]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-[3px] bg-[#dc2626]" />
                Strong Inverse (≤ -0.55)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-[3px] bg-[#fca5a5]" />
                Moderate Inverse
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-[3px] bg-[#e2e8f0] border border-[#cbd5e1]" />
                Uncorrelated (~0.0)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-[3px] bg-[#60a5fa]" />
                Moderate Positive
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-[3px] bg-[#1d4ed8]" />
                Strong Positive (≥ +0.65)
              </span>
            </div>
            <span className="text-[#64748b]">Avg Pairwise r: {matrixResult.averageOffDiagonalR.toFixed(2)}</span>
          </div>
        </div>

        {/* RIGHT 5 COLS: STATISTICAL SUMMARY + 21D ROLLING CORRELATION CHART FOR CLICKED PAIR */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Top Pair Insights */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[10px] border border-[#a7f3d0] bg-[#ecfdf5]/60 p-3">
              <div className="text-[10px] font-mono uppercase text-[#047857] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Best Diversifier Pair</span>
              </div>
              {matrixResult.bestDiversifierPair ? (
                <>
                  <div
                    data-testid="corr90d-best-diversifier"
                    className="text-sm font-mono font-bold text-[#0f172a] mt-1"
                  >
                    {matrixResult.bestDiversifierPair.symbolA} / {matrixResult.bestDiversifierPair.symbolB}
                  </div>
                  <div className="text-xs font-mono font-bold text-[#047857] tabular-nums">
                    r = {matrixResult.bestDiversifierPair.r > 0 ? '+' : ''}
                    {matrixResult.bestDiversifierPair.r.toFixed(2)} · {matrixResult.bestDiversifierPair.relationshipLabel}
                  </div>
                </>
              ) : (
                <div className="text-xs text-[#64748b] mt-1">Select 2+ tickers</div>
              )}
            </div>

            <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff]/60 p-3">
              <div className="text-[10px] font-mono uppercase text-[#1d4ed8] font-semibold flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>Highest Co-Movement</span>
              </div>
              {matrixResult.strongestPositivePair ? (
                <>
                  <div
                    data-testid="corr90d-strongest-pair"
                    className="text-sm font-mono font-bold text-[#0f172a] mt-1"
                  >
                    {matrixResult.strongestPositivePair.symbolA} / {matrixResult.strongestPositivePair.symbolB}
                  </div>
                  <div className="text-xs font-mono font-bold text-[#1d4ed8] tabular-nums">
                    r = {matrixResult.strongestPositivePair.r > 0 ? '+' : ''}
                    {matrixResult.strongestPositivePair.r.toFixed(2)} · R²{' '}
                    {(matrixResult.strongestPositivePair.rSquared * 100).toFixed(0)}%
                  </div>
                </>
              ) : (
                <div className="text-xs text-[#64748b] mt-1">Select 2+ tickers</div>
              )}
            </div>
          </div>

          {/* Focused Pair Rolling 21-Day Correlation Curve (Recharts AreaChart) */}
          <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc]/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10.5px] font-mono uppercase text-[#2563eb] font-semibold">
                  Selected Pair Regime · 21D Rolling Correlation
                </div>
                <h4
                  data-testid="corr90d-focused-pair-heading"
                  className="text-sm font-display font-bold text-[#0f172a]"
                >
                  {focusedPair[0]} vs {focusedPair[1]}{' '}
                  <span className="font-mono text-xs text-[#475569]">
                    (90D r = {focusedCell ? `${focusedCell.r > 0 ? '+' : ''}${focusedCell.r.toFixed(2)}` : '—'})
                  </span>
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded bg-white border border-[#cbd5e1] text-[10.5px] font-mono font-semibold text-[#334155]">
                {focusedCell?.relationshipLabel}
              </span>
            </div>

            <div
              data-testid="corr90d-rolling-chart"
              className="h-[190px] w-full bg-white rounded-[9px] border border-[#e2e8f0] p-2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={rollingSeries}
                  margin={{ top: 8, right: 12, bottom: 2, left: -10 }}
                >
                  <defs>
                    <linearGradient id="rollingCorrFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    minTickGap={22}
                  />
                  <YAxis
                    domain={[-1, 1]}
                    ticks={[-1, -0.5, 0, 0.5, 1]}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Tooltip
                    formatter={(v: unknown) => [Number(v).toFixed(3), '21D Rolling r']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      color: '#ffffff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rollingCorrelation"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#rollingCorrFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pair 90-Day Volatility & Return Footer */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="rounded-[8px] bg-white border border-[#e2e8f0] px-2.5 py-1.5 flex items-center justify-between">
                <span className="font-bold text-[#0f172a]">{focusedPair[0]}</span>
                <span className="text-[#475569]">
                  Vol {matrixResult.volatility90dBySymbol[focusedPair[0]]?.toFixed(1)}% · 90D{' '}
                  {matrixResult.return90dBySymbol[focusedPair[0]] >= 0 ? '+' : ''}
                  {matrixResult.return90dBySymbol[focusedPair[0]]?.toFixed(1)}%
                </span>
              </div>
              <div className="rounded-[8px] bg-white border border-[#e2e8f0] px-2.5 py-1.5 flex items-center justify-between">
                <span className="font-bold text-[#0f172a]">{focusedPair[1]}</span>
                <span className="text-[#475569]">
                  Vol {matrixResult.volatility90dBySymbol[focusedPair[1]]?.toFixed(1)}% · 90D{' '}
                  {matrixResult.return90dBySymbol[focusedPair[1]] >= 0 ? '+' : ''}
                  {matrixResult.return90dBySymbol[focusedPair[1]]?.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
