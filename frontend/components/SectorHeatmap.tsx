import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Database,
  Pause,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  amfiSchemesToHeatmapTiles,
  applyHeatmapTick,
  buildCustomHeatmapTiles,
  buildSectorGroups,
  calculateRealizedVolatility,
  classifyAmfiSchemeToSector,
  computeD3TreemapLayout,
  CustomHeatmapEntry,
  filterHeatmapTilesByQuery,
  getHeatmapTileStyle,
  getVolatilityTileStyle,
  HEATMAP_STOCKS,
  HeatmapColorMode,
  HeatmapScope,
  HeatmapSizingMode,
  HeatmapStockTile,
  heatmapTileToMarketSymbolRow,
  loadCustomHeatmapEntries,
  NavMasterSchemeRow,
  persistCustomHeatmapEntries,
} from '../utils/heatmapEngine';
import { formatSignedPercent } from '../utils/marketCalculations';
import { MarketSymbolRow } from '../types/markets';

interface SectorHeatmapProps {
  onSelectSymbol: (row: MarketSymbolRow) => void;
  liveFeedActive?: boolean;
}

const TREEMAP_WIDTH = 1180;
const TREEMAP_HEIGHT = 560;

function getSectorAccentHex(sector: string): string {
  const lower = sector.toLowerCase();
  if (lower.includes('gold') || lower.includes('bullion') || lower.includes('commodit')) return '#F59E0B';
  if (lower.includes('gilt') || lower.includes('debt') || lower.includes('bond') || lower.includes('fixed income') || lower.includes('treasury')) {
    return '#38BDF8';
  }
  if (lower.includes('liquid') || lower.includes('overnight')) return '#94A3B8';
  if (lower.includes('hybrid') || lower.includes('multi-asset')) return '#A78BFA';
  if (lower.includes('index') || lower.includes('broad') || lower.includes('international')) return '#34D399';
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
  const padX = Math.min(10, width * 0.1);
  const usableW = width - padX * 2;
  const sparkH = Math.min(22, Math.max(12, height * 0.2));
  const bottomY = y0 + height - 6;
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
  const [scope, setScope] = useState<HeatmapScope>('india');
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [colorMode, setColorMode] = useState<HeatmapColorMode>('performance');
  const [sizingMode, setSizingMode] = useState<HeatmapSizingMode>('aum');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [liveTiles, setLiveTiles] = useState<HeatmapStockTile[]>(() => HEATMAP_STOCKS);
  const [amfiTiles, setAmfiTiles] = useState<HeatmapStockTile[]>([]);
  const [amfiTotalCount, setAmfiTotalCount] = useState<number>(0);
  const [amfiLimit, setAmfiLimit] = useState<number>(80);
  const [amfiLoading, setAmfiLoading] = useState<boolean>(false);

  // User-defined custom map state (persisted in localStorage)
  const [customEntries, setCustomEntries] = useState<CustomHeatmapEntry[]>(() =>
    loadCustomHeatmapEntries()
  );
  const [showCustomizeDrawer, setShowCustomizeDrawer] = useState<boolean>(false);
  const [pickerQuery, setPickerQuery] = useState<string>('');
  const [pickerBucket, setPickerBucket] = useState<string>('Auto Category');
  const [amfiSearchResults, setAmfiSearchResults] = useState<NavMasterSchemeRow[]>([]);
  const [amfiSearching, setAmfiSearching] = useState<boolean>(false);

  const [isStreaming, setIsStreaming] = useState<boolean>(liveFeedActive);
  const [tickCount, setTickCount] = useState<number>(0);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsStreaming(liveFeedActive);
  }, [liveFeedActive]);

  useEffect(() => {
    persistCustomHeatmapEntries(customEntries);
  }, [customEntries]);

  // Load live AMFI database schemes when Live AMFI DB scope is selected or expanded
  useEffect(() => {
    if (scope !== 'amfi' && amfiTiles.length > 0) return;
    let active = true;
    setAmfiLoading(true);
    fetch(`/api/nav-master/schemes?limit=${amfiLimit}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.schemes)) return;
        setAmfiTiles(amfiSchemesToHeatmapTiles(data.schemes));
        if (typeof data.totalSchemes === 'number') {
          setAmfiTotalCount(data.totalSchemes);
        }
      })
      .catch(() => {
        // Non-fatal fallback
      })
      .finally(() => {
        if (active) setAmfiLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scope, amfiLimit]);

  // Debounced live search across 14,481+ AMFI schemes inside the Custom Map builder
  useEffect(() => {
    if (!showCustomizeDrawer) return;
    const trimmed = pickerQuery.trim();
    if (trimmed.length < 2) {
      setAmfiSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setAmfiSearching(true);
      fetch(`/api/nav-master/search?q=${encodeURIComponent(trimmed)}&limit=18`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.results)) {
            setAmfiSearchResults(data.results);
          }
        })
        .catch(() => {
          setAmfiSearchResults([]);
        })
        .finally(() => setAmfiSearching(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [pickerQuery, showCustomizeDrawer]);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = window.setInterval(() => {
      setTickCount((prevTick) => {
        const nextTick = prevTick + 1;
        setLiveTiles((prevTiles) => applyHeatmapTick(prevTiles, nextTick));
        return nextTick;
      });
    }, 2600);
    return () => window.clearInterval(interval);
  }, [isStreaming]);

  const combinedReferencePool = useMemo(
    () => [...liveTiles, ...amfiTiles],
    [liveTiles, amfiTiles]
  );

  const activePool = useMemo(() => {
    if (scope === 'amfi') {
      return amfiTiles.length > 0 ? amfiTiles : liveTiles.filter((t) => t.market === 'india');
    }
    if (scope === 'custom') {
      return buildCustomHeatmapTiles(customEntries, combinedReferencePool);
    }
    if (scope === 'all') {
      return liveTiles;
    }
    return liveTiles.filter((t) => t.market === scope);
  }, [scope, amfiTiles, liveTiles, customEntries, combinedReferencePool]);

  const searchedPool = useMemo(
    () => filterHeatmapTilesByQuery(activePool, searchQuery),
    [activePool, searchQuery]
  );

  const availableSectors = useMemo(() => {
    const sectors = new Set(searchedPool.map((s) => s.sector));
    return ['All', ...Array.from(sectors)];
  }, [searchedPool]);

  const effectiveSectorFilter = availableSectors.includes(sectorFilter) ? sectorFilter : 'All';

  const groups = useMemo(() => {
    return buildSectorGroups(searchedPool, 'all', effectiveSectorFilter);
  }, [searchedPool, effectiveSectorFilter]);

  const treemapLayout = useMemo(() => {
    return computeD3TreemapLayout(groups, TREEMAP_WIDTH, TREEMAP_HEIGHT, sizingMode);
  }, [groups, sizingMode]);

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

  const customSymbolSet = useMemo(
    () => new Set(customEntries.map((e) => e.symbol.toUpperCase())),
    [customEntries]
  );

  const pickerCuratedMatches = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return q
      ? HEATMAP_STOCKS.filter(
          (f) =>
            f.symbol.toLowerCase().includes(q) ||
            f.name.toLowerCase().includes(q) ||
            f.sector.toLowerCase().includes(q)
        )
      : HEATMAP_STOCKS;
  }, [pickerQuery]);

  const handleScopeSwitch = (next: HeatmapScope) => {
    setScope(next);
    setSectorFilter('All');
    setHoveredSymbol(null);
    setPointerPos(null);
  };

  const handleToggleCustomFund = (tile: HeatmapStockTile) => {
    const key = tile.symbol.toUpperCase();
    if (customSymbolSet.has(key)) {
      setCustomEntries((prev) => prev.filter((e) => e.symbol.toUpperCase() !== key));
      return;
    }
    const chosenSector =
      pickerBucket === 'Auto Category' ? tile.sector : pickerBucket.trim() || tile.sector;
    setCustomEntries((prev) => [
      {
        symbol: tile.symbol,
        name: tile.name,
        sector: chosenSector,
        market: tile.market,
        price: tile.price,
        unit: tile.unit,
        marketCapB: tile.marketCapB,
        changePercent: tile.changePercent,
        sparkline: tile.sparkline,
        source: tile.source,
        amfiCode: tile.amfiCode,
      },
      ...prev,
    ]);
  };

  const handleAddAmfiRowToCustom = (row: NavMasterSchemeRow) => {
    const converted = amfiSchemesToHeatmapTiles([row])[0];
    if (!converted) return;
    handleToggleCustomFund(converted);
  };

  const handleAddCategoryToCustom = (categoryName: string) => {
    const matching = HEATMAP_STOCKS.filter((t) => t.sector === categoryName);
    setCustomEntries((prev) => {
      const existing = new Set(prev.map((e) => e.symbol.toUpperCase()));
      const additions: CustomHeatmapEntry[] = matching
        .filter((m) => !existing.has(m.symbol.toUpperCase()))
        .map((m) => ({
          symbol: m.symbol,
          name: m.name,
          sector: pickerBucket === 'Auto Category' ? m.sector : pickerBucket,
          market: m.market,
          price: m.price,
          unit: m.unit,
          marketCapB: m.marketCapB,
          changePercent: m.changePercent,
          sparkline: m.sparkline,
          source: m.source,
        }));
      return [...additions, ...prev];
    });
  };

  const handleMouseMoveContainer = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    setPointerPos({
      x: e.clientX - box.left,
      y: e.clientY - box.top,
    });
  };

  const indiaCount = HEATMAP_STOCKS.filter((t) => t.market === 'india').length;
  const globalCount = HEATMAP_STOCKS.filter((t) => t.market === 'global').length;

  return (
    <div
      data-testid="sector-heatmap"
      data-market={scope}
      data-sector={effectiveSectorFilter}
      data-color-mode={colorMode}
      data-sizing-mode={sizingMode}
      data-tick-count={tickCount}
      className="rounded-[14px] bg-[#070d1c] border border-white/[0.1] text-white p-5 md:p-6 overflow-hidden"
    >
      {/* Header Row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-[19px] md:text-[22px] font-display font-semibold tracking-[-0.02em] text-white">
            Asset Class Performance Map
          </h2>
          <p className="text-[12.5px] text-[#94a3b8] mt-1 flex flex-wrap items-center gap-2 tabular-nums">
            <span className="text-white font-mono font-medium">
              {totals.count} funds plotted
            </span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="text-[#34d399] font-mono font-medium">
              ▲ {totals.advancers} up
            </span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="text-[#fb7185] font-mono font-medium">
              ▼ {totals.decliners} down
            </span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span
              className={`font-mono font-semibold ${
                totals.weightedAvg >= 0 ? 'text-[#34d399]' : 'text-[#fb7185]'
              }`}
            >
              Avg {formatSignedPercent(totals.weightedAvg)}
            </span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="font-mono text-[#cbd5e1]">
              Mean σ {totals.weightedVolatility.toFixed(1)}%
            </span>
          </p>
        </div>

        {/* Universe Scope Tabs + Customize Map CTA */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Performance map fund universe"
            className="inline-flex flex-wrap items-center p-1 rounded-[9px] bg-[#0e172a] border border-white/[0.08] gap-1"
          >
            {(
              [
                { id: 'india', label: `India (${indiaCount})` },
                { id: 'global', label: `Global (${globalCount})` },
                { id: 'all', label: `All (${HEATMAP_STOCKS.length})` },
                {
                  id: 'amfi',
                  label: `Live AMFI DB (${amfiTiles.length || amfiLimit})`,
                },
                { id: 'custom', label: `My Map (${customEntries.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                data-testid={`heatmap-scope-${tab.id}`}
                aria-selected={scope === tab.id}
                onClick={() => handleScopeSwitch(tab.id)}
                className={`px-2.5 py-1.5 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  scope === tab.id
                    ? 'bg-[#2563eb] text-white'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="heatmap-customize-btn"
            onClick={() => setShowCustomizeDrawer((prev) => !prev)}
            className={`h-9 px-3 rounded-[8px] border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showCustomizeDrawer
                ? 'bg-white text-[#040711] border-white'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.16] text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Define Your Map</span>
          </button>
        </div>
      </div>

      {/* User-Defined Custom Map Builder Drawer */}
      {showCustomizeDrawer && (
        <div
          data-testid="heatmap-customize-drawer"
          className="my-4 rounded-[12px] border border-[#38bdf8]/35 bg-[#0b1326] p-4 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div>
              <div className="text-sm font-semibold text-white">
                Define Your Own Fund Map
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Search across {HEATMAP_STOCKS.length} multi-AMC funds &amp; ETFs plus{' '}
                {amfiTotalCount > 0 ? `${amfiTotalCount.toLocaleString()} live SQLite` : 'live AMFI SQLite'} schemes. Assign any fund to your own category bucket.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {customEntries.length > 0 && (
                <button
                  type="button"
                  data-testid="heatmap-view-custom-btn"
                  onClick={() => {
                    setScope('custom');
                    setSectorFilter('All');
                  }}
                  className="h-8 px-3 rounded-[7px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  View My Map ({customEntries.length})
                </button>
              )}
              {customEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCustomEntries([])}
                  className="h-8 px-2.5 rounded-[7px] border border-white/[0.12] text-[#fb7185] hover:bg-[#fb7185]/10 text-xs font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCustomizeDrawer(false)}
                aria-label="Close custom map builder"
                className="h-8 w-8 rounded-[7px] border border-white/[0.12] text-[#94a3b8] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search + Bucket Assignment Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-7 relative">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                data-testid="heatmap-picker-search"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Search any mutual fund, AMC, ETF, or AMFI code (e.g., HDFC, SBI, Motilal, Vanguard, 122639)..."
                className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[#060b18] border border-white/[0.14] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
              />
            </div>
            <div className="md:col-span-5 flex items-center gap-2">
              <label htmlFor="heatmap-bucket-select" className="text-xs text-[#94a3b8] whitespace-nowrap">
                Assign Group:
              </label>
              <select
                id="heatmap-bucket-select"
                data-testid="heatmap-bucket-select"
                value={pickerBucket}
                onChange={(e) => setPickerBucket(e.target.value)}
                className="flex-1 h-9 px-2.5 rounded-[8px] bg-[#060b18] border border-white/[0.14] text-xs text-white focus:outline-none focus:border-[#38bdf8]"
              >
                <option value="Auto Category">Native Fund Category</option>
                <option value="Core Portfolio">Core Portfolio</option>
                <option value="High Conviction">High Conviction</option>
                <option value="Debt & Cash">Debt &amp; Cash</option>
                <option value="Global Allocation">Global Allocation</option>
                <option value="Satellite Ideas">Satellite Ideas</option>
              </select>
            </div>
          </div>

          {/* Quick Bulk Add Category Strip */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-[#94a3b8] mr-1">Add full category:</span>
            {[
              'Large & Flexi Cap',
              'Mid & Multi Cap',
              'Small Cap & Value',
              'Index & Factor ETFs',
              'Hybrid & Multi-Asset',
              'Gilt & Corporate Debt',
              'US Broad Market',
              'International & EM',
            ].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleAddCategoryToCustom(cat)}
                className="px-2.5 py-1 rounded-[6px] bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.1] text-[#cbd5e1] hover:text-white inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3 h-3 text-[#38bdf8]" />
                <span>{cat}</span>
              </button>
            ))}
          </div>

          {/* Two-Column Picker Results: Curated Universe + Live AMFI SQLite Matches */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-[10px] border border-white/[0.08] bg-[#060b18] p-3">
              <div className="text-[11px] font-mono text-[#94a3b8] mb-2">
                Curated Multi-AMC &amp; Global Universe ({pickerCuratedMatches.length} shown)
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {pickerCuratedMatches.map((fund) => {
                  const selected = customSymbolSet.has(fund.symbol.toUpperCase());
                  return (
                    <button
                      key={fund.symbol}
                      type="button"
                      data-testid={`picker-toggle-${fund.symbol}`}
                      onClick={() => handleToggleCustomFund(fund)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[7px] text-left text-xs transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#2563eb]/20 border border-[#38bdf8]/40 text-white'
                          : 'hover:bg-white/[0.05] border border-transparent text-[#cbd5e1]'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-white">{fund.symbol}</span>
                        <span className="text-[#94a3b8] mx-1.5">·</span>
                        <span className="truncate">{fund.name}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono shrink-0">
                        <span className="text-[#64748b] hidden sm:inline">{fund.sector}</span>
                        {selected ? (
                          <Check className="w-3.5 h-3.5 text-[#34d399]" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-[#38bdf8]" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[10px] border border-white/[0.08] bg-[#060b18] p-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94a3b8] mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-[#38bdf8]" />
                  <span>
                    Live AMFI SQLite Search (
                    {amfiTotalCount > 0 ? `${amfiTotalCount.toLocaleString()} Schemes` : 'Connected DB'})
                  </span>
                </span>
                {amfiSearching && <span className="text-[#38bdf8]">Searching...</span>}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {pickerQuery.trim().length < 2 ? (
                  <div className="text-xs text-[#64748b] py-6 text-center">
                    Type at least 2 characters above (e.g. &ldquo;Parag&rdquo;, &ldquo;HDFC Mid&rdquo;, &ldquo;Motilal&rdquo;, &ldquo;Gilt&rdquo;) to pull any live AMFI scheme into your map.
                  </div>
                ) : amfiSearchResults.length === 0 && !amfiSearching ? (
                  <div className="text-xs text-[#64748b] py-6 text-center">
                    No AMFI schemes matched &ldquo;{pickerQuery}&rdquo;.
                  </div>
                ) : (
                  amfiSearchResults.map((row) => {
                    const code = String(row.scheme_code);
                    const selected = customSymbolSet.has(code.toUpperCase());
                    return (
                      <button
                        key={code}
                        type="button"
                        data-testid={`picker-amfi-${code}`}
                        onClick={() => handleAddAmfiRowToCustom(row)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[7px] text-left text-xs transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#059669]/20 border border-[#34d399]/40 text-white'
                            : 'hover:bg-white/[0.05] border border-transparent text-[#cbd5e1]'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-[#38bdf8] font-semibold">#{code}</span>
                          <span className="text-[#64748b] mx-1.5">·</span>
                          <span className="truncate">{row.scheme_name}</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono shrink-0">
                          <span className="text-[#94a3b8]">₹{Number(row.latest_nav).toFixed(2)}</span>
                          {selected ? (
                            <Check className="w-3.5 h-3.5 text-[#34d399]" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-[#34d399]" />
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Controls Row: Inline Search, Tile Sizing, Color Metric, AMFI Load Limit, Stream Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              data-testid="heatmap-filter-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter visible funds..."
              className="w-48 h-8 pl-8 pr-7 rounded-[7px] bg-[#0e172a] border border-white/[0.1] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear fund filter"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {scope === 'amfi' && amfiTotalCount > 50 && (
            <div className="inline-flex items-center gap-1 p-0.5 rounded-[7px] bg-[#0e172a] border border-white/[0.08] text-[11px]">
              {[50, 80, 120].map((lim) => (
                <button
                  key={lim}
                  type="button"
                  onClick={() => setAmfiLimit(lim)}
                  className={`px-2 py-1 rounded-[5px] font-mono cursor-pointer whitespace-nowrap ${
                    amfiLimit === lim
                      ? 'bg-[#38bdf8] text-[#040711] font-semibold'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {lim} funds
                </button>
              ))}
            </div>
          )}

          {/* Tile Sizing Selector */}
          <div
            role="group"
            aria-label="Treemap tile sizing"
            className="inline-flex items-center p-0.5 rounded-[8px] bg-[#0e172a] border border-white/[0.08] gap-0.5"
          >
            {(
              [
                { id: 'aum', label: 'Size: AUM' },
                { id: 'equal', label: 'Equal' },
                { id: 'move', label: 'By Move' },
              ] as const
            ).map((sz) => (
              <button
                key={sz.id}
                type="button"
                data-testid={`heatmap-size-${sz.id}`}
                onClick={() => setSizingMode(sz.id)}
                className={`px-2.5 py-1 rounded-[6px] text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  sizingMode === sz.id
                    ? 'bg-white/[0.14] text-white font-semibold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>

          {/* Color Metric Selector */}
          <div
            role="group"
            aria-label="Heatmap color metric"
            className="inline-flex items-center p-0.5 rounded-[8px] bg-[#0e172a] border border-white/[0.08] gap-0.5"
          >
            {(
              [
                { id: 'performance', label: 'Return %' },
                { id: 'volatility', label: 'Volatility σ' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                data-testid={`heatmap-mode-${mode.id}`}
                aria-pressed={colorMode === mode.id}
                onClick={() => setColorMode(mode.id)}
                className={`px-2.5 py-1 rounded-[6px] text-[11.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  colorMode === mode.id
                    ? 'bg-white text-[#040711]'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Scale Legend */}
          {colorMode === 'volatility' ? (
            <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-[#94a3b8] tabular-nums">
              <span>Calm</span>
              <span className="inline-flex h-2 w-24 rounded-full overflow-hidden border border-white/15">
                <span className="flex-1 bg-[#0F4C5C]" />
                <span className="flex-1 bg-[#1D4ED8]" />
                <span className="flex-1 bg-[#B45309]" />
                <span className="flex-1 bg-[#BE123C]" />
              </span>
              <span>High σ</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-[#94a3b8] tabular-nums">
              <span>−1.5%</span>
              <span className="inline-flex h-2 w-24 rounded-full overflow-hidden border border-white/15">
                <span className="flex-1 bg-[#991B1B]" />
                <span className="flex-1 bg-[#1E293B]" />
                <span className="flex-1 bg-[#1D4ED8]" />
                <span className="flex-1 bg-[#0D9488]" />
                <span className="flex-1 bg-[#059669]" />
              </span>
              <span>+1.5%</span>
            </div>
          )}

          <button
            type="button"
            data-testid="heatmap-stream-toggle"
            onClick={() => setIsStreaming((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isStreaming
                ? 'border-[#34d399]/35 bg-[#34d399]/10 text-[#34d399]'
                : 'border-white/[0.14] bg-white/[0.05] text-[#cbd5e1]'
            }`}
          >
            {isStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isStreaming ? 'Live' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Strip */}
      {availableSectors.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 py-3">
          {availableSectors.map((sector) => {
            const countInCat =
              sector === 'All'
                ? searchedPool.length
                : searchedPool.filter((t) => t.sector === sector).length;
            return (
              <button
                key={sector}
                type="button"
                onClick={() => setSectorFilter(sector)}
                className={`px-2.5 py-1 rounded-[7px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                  effectiveSectorFilter === sector
                    ? 'bg-white text-[#040711] border-white font-semibold'
                    : 'bg-white/[0.04] text-[#cbd5e1] border-white/[0.08] hover:bg-white/[0.09] hover:text-white'
                }`}
              >
                {sector}{' '}
                <span className="opacity-65 font-mono text-[10.5px]">({countInCat})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State for Custom Map or No Matches */}
      {treemapLayout.tiles.length === 0 ? (
        <div
          data-testid="heatmap-empty-state"
          className="rounded-[12px] border border-white/[0.1] bg-[#040711] px-6 py-16 text-center space-y-3"
        >
          {amfiLoading ? (
            <p className="text-sm text-[#94a3b8]">Loading live AMFI database schemes...</p>
          ) : scope === 'custom' ? (
            <>
              <div className="text-base font-semibold text-white">
                Your custom performance map is empty
              </div>
              <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
                Pick any mutual funds, ETFs, or live AMFI schemes and group them into your own categories.
              </p>
              <button
                type="button"
                onClick={() => setShowCustomizeDrawer(true)}
                className="h-9 px-4 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Funds to My Map</span>
              </button>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-white">
                No funds matched &ldquo;{searchQuery}&rdquo;
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSectorFilter('All');
                }}
                className="text-xs font-semibold text-[#38bdf8] hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </>
          )}
        </div>
      ) : (
        /* Obsidian D3.js Squarified Treemap Canvas */
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
            aria-label="Interactive multi-fund asset class performance and volatility treemap"
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
                      height={24}
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
                      <stop offset="0%" stopColor={style.sparkColor} stopOpacity="0.26" />
                      <stop offset="100%" stopColor={style.sparkColor} stopOpacity="0" />
                    </linearGradient>
                    <clipPath id={`clip-tile-${safeId}`}>
                      <rect
                        x={leaf.x0}
                        y={leaf.y0}
                        width={Math.max(0, leaf.x1 - leaf.x0)}
                        height={Math.max(0, leaf.y1 - leaf.y0)}
                        rx={6}
                      />
                    </clipPath>
                  </React.Fragment>
                );
              })}
            </defs>

            {/* Sector Containers */}
            {treemapLayout.sectors.map((sec) => {
              const secWidth = Math.max(0, sec.x1 - sec.x0);
              const secHeight = Math.max(0, sec.y1 - sec.y0);
              const secId = sec.sector.replace(/[^a-zA-Z0-9]/g, '_');
              const showFullHeader = secWidth >= 230;
              const showMediumHeader = secWidth >= 150;
              const sectorAccent = getSectorAccentHex(sec.sector);

              return (
                <g key={sec.sector} className="d3-treemap-sector">
                  <rect
                    x={sec.x0}
                    y={sec.y0}
                    width={secWidth}
                    height={secHeight}
                    rx={8}
                    fill="#0a1020"
                    stroke="rgba(148, 163, 184, 0.16)"
                    strokeWidth={1}
                  />
                  <line
                    x1={sec.x0 + 8}
                    y1={sec.y0 + 1}
                    x2={sec.x0 + Math.min(48, Math.max(10, secWidth - 8))}
                    y2={sec.y0 + 1}
                    stroke={sectorAccent}
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                  <g clipPath={`url(#clip-sec-${secId})`}>
                    <text
                      x={sec.x0 + 9}
                      y={sec.y0 + 16}
                      fill="#E2E8F0"
                      fontSize={10.5}
                      fontWeight={600}
                      fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                    >
                      {sec.sector}
                      {showFullHeader
                        ? ` · ${formatSignedPercent(sec.avgChangePercent)} · σ ${sec.volatilityPct.toFixed(1)}%`
                        : showMediumHeader
                          ? ` · ${formatSignedPercent(sec.avgChangePercent)}`
                          : ''}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Fund Tiles */}
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

              const showSparkline = width >= 108 && height >= 98;
              const spark = showSparkline
                ? buildInlineTileSparkline(tile.sparkline, leaf.x0, leaf.y0, width, height)
                : null;

              const amfiOptionTag =
                tile.source === 'amfi-db'
                  ? /idcw/i.test(tile.name)
                    ? 'IDCW'
                    : /regular/i.test(tile.name)
                      ? 'Reg'
                      : /direct/i.test(tile.name)
                        ? 'Dir'
                        : `#${tile.symbol.slice(-3)}`
                  : '';
              const labelText =
                tile.source === 'amfi-db'
                  ? `${tile.name.replace(/(Direct|Regular|Plan|Growth|Option|IDCW|Payout|Reinvestment|-)/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 10)} ${amfiOptionTag}`.trim() || tile.symbol
                  : tile.symbol;

              const canShowFull = width >= 84 && height >= 60;
              const canShowCompact = width >= 34 && height >= 28;
              const symbolFontSize =
                width >= 165 && height >= 100
                  ? 15
                  : width >= 105
                    ? 12
                    : width >= 68
                      ? 10
                      : 8.5;
              const maxCharsForWidth = Math.max(4, Math.floor((width - 8) / (symbolFontSize * 0.6)));
              const displayLabel =
                labelText.length > maxCharsForWidth
                  ? `${labelText.slice(0, Math.max(3, maxCharsForWidth - 1))}…`
                  : labelText;

              const textCenterY = spark ? cy - 11 : cy;

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
                    opacity: isDimmed ? 0.55 : 1,
                    transition: 'opacity 160ms ease',
                  }}
                >
                  <rect
                    x={leaf.x0}
                    y={leaf.y0}
                    width={width}
                    height={height}
                    rx={6}
                    fill={`url(#tile-grad-${safeId})`}
                    stroke={isHovered ? '#38BDF8' : style.border}
                    strokeWidth={isHovered ? 2 : 0.9}
                  />

                  <g clipPath={`url(#clip-tile-${safeId})`} pointerEvents="none">
                    {spark && (
                      <>
                        <path d={spark.areaPath} fill={`url(#spark-grad-${safeId})`} />
                        <path
                          d={spark.linePath}
                          fill="none"
                          stroke={style.sparkColor}
                          strokeWidth={1.3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.75}
                        />
                      </>
                    )}

                    {canShowCompact && (
                      <>
                        <text
                          x={cx}
                          y={canShowFull ? textCenterY - 5 : textCenterY - 1}
                          textAnchor="middle"
                          fill={style.text}
                          fontSize={symbolFontSize}
                          fontWeight={700}
                          letterSpacing="-0.015em"
                          fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                        >
                          {displayLabel}
                        </text>

                        {canShowFull ? (
                          <>
                            <text
                              x={cx}
                              y={textCenterY + 11}
                              textAnchor="middle"
                              fill={style.text}
                              fontSize={11.5}
                              fontWeight={600}
                              fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                            >
                              {colorMode === 'volatility'
                                ? `σ ${leaf.volatilityPct.toFixed(1)}%`
                                : formatSignedPercent(tile.changePercent)}
                            </text>
                            <text
                              x={cx}
                              y={textCenterY + 24}
                              textAnchor="middle"
                              fill={style.subText}
                              fontSize={9.5}
                              fontWeight={500}
                              fontFamily="sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif"
                              opacity={0.85}
                            >
                              {tile.unit === 'INR' ? '₹' : '$'}
                              {tile.price}
                            </text>
                          </>
                        ) : (
                          <text
                            x={cx}
                            y={textCenterY + 11}
                            textAnchor="middle"
                            fill={style.subText}
                            fontSize={9}
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

          {/* Floating Tooltip */}
          {hoveredTileRect && pointerPos && (
            <div
              data-testid="d3-treemap-tooltip"
              className="pointer-events-none absolute z-20 w-68 rounded-[10px] bg-[#040711]/96 backdrop-blur-xl border border-white/[0.16] shadow-[0_18px_42px_rgba(0,0,0,0.65)] px-3.5 py-3 text-xs text-white"
              style={{
                left: Math.min(
                  Math.max(12, pointerPos.x + 16),
                  Math.max(12, (containerRef.current?.clientWidth || 700) - 280)
                ),
                top: Math.max(12, pointerPos.y - 96),
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[13px] font-bold text-white">
                  {hoveredTileRect.tile.symbol}
                </span>
                <span className="text-[11px] font-mono text-[#38bdf8] truncate">
                  {hoveredTileRect.tile.sector}
                </span>
              </div>
              <div className="text-[11.5px] text-[#cbd5e1] mt-0.5 line-clamp-2">
                {hoveredTileRect.tile.name}
              </div>
              <div className="mt-2 pt-2 border-t border-white/[0.1] grid grid-cols-2 gap-y-1 font-mono tabular-nums text-[11.5px]">
                <span className="text-[#94a3b8]">NAV / Price</span>
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
                  {formatSignedPercent(hoveredTileRect.tile.changePercent)}
                </span>
                <span className="text-[#94a3b8]">Volatility (σ)</span>
                <span className="text-right font-semibold text-[#fbbf24]">
                  {hoveredTileRect.volatilityPct.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Inspected Tile Summary */}
      {inspectedTile && (
        <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="font-mono font-semibold text-white">
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
            <span className="font-mono text-[#38bdf8]">
              σ {inspectedVolatility.toFixed(1)}%
            </span>
          </div>
          <span className="text-[#94a3b8] text-[11px]">
            Click any tile to inspect in Fund Terminal · Use &ldquo;Define Your Map&rdquo; to customize
          </span>
        </div>
      )}
    </div>
  );
};
