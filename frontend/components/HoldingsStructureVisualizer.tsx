import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CircleDot,
  Database,
  LayoutGrid,
  Loader2,
  RotateCcw,
  Search,
  StickyNote,
} from 'lucide-react';
import {
  buildHoldingsHierarchy,
  computeD3SunburstLayout,
  computeD3TreemapLayout,
  DbHoldingFundMeta,
  DbHoldingRow,
  DbHoldingsFiltersPayload,
  DbHoldingsResponse,
  formatMarketValueCr,
} from '../utils/holdingsHierarchyEngine';
import { loadStoredAuthSession } from '../utils/authEngine';
import {
  buildHoldingNoteKey,
  formatNoteTimestamp,
  HOLDING_NOTE_STANCE_META,
  HoldingNoteRecord,
  HoldingNoteStance,
  indexNotesByHoldingKey,
  removeHoldingNoteFromList,
  upsertHoldingNoteInList,
} from '../utils/holdingNotesEngine';
import { HoldingNoteComposer, HoldingNoteEditorTarget } from './HoldingNoteComposer';

interface HoldingsStructureVisualizerProps {
  onJumpToAnalysis?: (ticker: string) => void;
}

interface ActiveInspectionTarget {
  name: string;
  shortLabel: string;
  assetGroup: string;
  assetSubgroup: string;
  weightPct: number;
  marketValueLakh: number;
  isin: string | null;
  nseSymbol: string | null;
  constituentCount: number;
}

const TREEMAP_WIDTH = 720;
const TREEMAP_HEIGHT = 400;
const SUNBURST_SIZE = 436;
const SUNBURST_RADIUS = 196;

export const HoldingsStructureVisualizer: React.FC<HoldingsStructureVisualizerProps> = ({
  onJumpToAnalysis,
}) => {
  const [chartType, setChartType] = useState<'treemap' | 'sunburst'>('treemap');
  const [filters, setFilters] = useState<DbHoldingsFiltersPayload | null>(null);
  const [selectedFundCode, setSelectedFundCode] = useState<string>('PPFASFLEXICAP');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [focusAssetGroup, setFocusAssetGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [rows, setRows] = useState<DbHoldingRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState<boolean>(true);
  const [loadingHoldings, setLoadingHoldings] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ActiveInspectionTarget | null>(null);

  // Per-holding custom research notes state (synced with /api/holding-notes)
  const [notes, setNotes] = useState<HoldingNoteRecord[]>([]);
  const [notedOnly, setNotedOnly] = useState<boolean>(false);
  const [editingTarget, setEditingTarget] = useState<HoldingNoteEditorTarget | null>(null);
  const [savingNote, setSavingNote] = useState<boolean>(false);
  const [noteServerError, setNoteServerError] = useState<string | null>(null);

  // 1. Load available funds, snapshots, and asset groups from /api/db/holdings/filters
  useEffect(() => {
    const controller = new AbortController();
    setLoadingFilters(true);
    fetch('/api/db/holdings/filters', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load portfolio holdings filters');
        return (await res.json()) as DbHoldingsFiltersPayload;
      })
      .then((payload) => {
        setFilters(payload);
        if (payload.funds.length > 0) {
          const preferred =
            payload.funds.find((f) => f.fund_code === 'PPFASFLEXICAP') || payload.funds[0];
          setSelectedFundCode(preferred.fund_code);
          setSelectedMonth(preferred.latest_month || payload.months[0] || '');
        }
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          setErrorMsg('Could not reach /api/db/holdings/filters.');
        }
      })
      .finally(() => {
        setLoadingFilters(false);
      });

    return () => controller.abort();
  }, []);

  // 2. Fetch portfolio holdings for the selected fund & month from /api/db/holdings
  useEffect(() => {
    if (!selectedFundCode) return;
    const controller = new AbortController();
    setLoadingHoldings(true);
    setErrorMsg(null);
    setHoveredNode(null);

    const sp = new URLSearchParams({
      fundCode: selectedFundCode,
      aggregated: 'true',
      limit: '250',
    });
    if (selectedMonth) {
      sp.set('monthEnd', selectedMonth);
    }

    fetch(`/api/db/holdings?${sp.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to fetch portfolio holdings');
        return (await res.json()) as DbHoldingsResponse;
      })
      .then((payload) => {
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          setErrorMsg('Failed to load portfolio holdings from /api/db/holdings.');
          setRows([]);
        }
      })
      .finally(() => {
        setLoadingHoldings(false);
      });

    return () => controller.abort();
  }, [selectedFundCode, selectedMonth]);

  // 3. Load user's saved holding notes for the active fund from /api/holding-notes
  useEffect(() => {
    if (!selectedFundCode) return;
    const controller = new AbortController();
    const session = loadStoredAuthSession();
    const headers: Record<string, string> = {};
    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    fetch(`/api/holding-notes?fundCode=${encodeURIComponent(selectedFundCode)}`, {
      signal: controller.signal,
      credentials: 'same-origin',
      headers,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { notes?: HoldingNoteRecord[] };
      })
      .then((payload) => {
        if (payload && Array.isArray(payload.notes)) {
          setNotes(payload.notes);
        }
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          // Keep existing in-memory notes safely if network briefly fails
        }
      });

    return () => controller.abort();
  }, [selectedFundCode]);

  const notesByKey = useMemo(() => indexNotesByHoldingKey(notes), [notes]);

  const handleOpenNoteEditor = useCallback(
    (holding: { securityName: string; isin: string | null; nseSymbol: string | null }) => {
      const fundCode = selectedFundCode || 'PPFASFLEXICAP';
      const holdingKey = buildHoldingNoteKey(fundCode, holding.isin, holding.securityName);
      setNoteServerError(null);
      setEditingTarget({
        fundCode,
        holdingKey,
        securityName: holding.securityName,
        isin: holding.isin,
        nseSymbol: holding.nseSymbol,
      });
    },
    [selectedFundCode]
  );

  const handleSaveHoldingNote = useCallback(
    async (draft: { noteText: string; stance: HoldingNoteStance }) => {
      if (!editingTarget) return;
      setSavingNote(true);
      setNoteServerError(null);
      try {
        const session = loadStoredAuthSession();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (session?.token) {
          headers.Authorization = `Bearer ${session.token}`;
        }

        const res = await fetch('/api/holding-notes', {
          method: 'PUT',
          credentials: 'same-origin',
          headers,
          body: JSON.stringify({
            fundCode: editingTarget.fundCode,
            holdingKey: editingTarget.holdingKey,
            securityName: editingTarget.securityName,
            isin: editingTarget.isin,
            nseSymbol: editingTarget.nseSymbol,
            noteText: draft.noteText,
            stance: draft.stance,
          }),
        });

        const payload = (await res.json()) as {
          note?: HoldingNoteRecord;
          error?: string;
        };

        if (!res.ok || !payload.note) {
          setNoteServerError(
            payload.error ||
              (res.status === 401
                ? 'Please sign in to save custom holding notes.'
                : 'Unable to save holding note.')
          );
          return;
        }

        setNotes((prev) => upsertHoldingNoteInList(prev, payload.note!));
        setEditingTarget(null);
      } catch {
        setNoteServerError('Network error while saving note. Please retry.');
      } finally {
        setSavingNote(false);
      }
    },
    [editingTarget]
  );

  const handleDeleteHoldingNote = useCallback(async (noteId: string) => {
    setSavingNote(true);
    setNoteServerError(null);
    try {
      const session = loadStoredAuthSession();
      const headers: Record<string, string> = {};
      if (session?.token) {
        headers.Authorization = `Bearer ${session.token}`;
      }
      const res = await fetch(`/api/holding-notes/${encodeURIComponent(noteId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setNoteServerError(payload.error || 'Unable to delete holding note.');
        return;
      }
      setNotes((prev) => removeHoldingNoteFromList(prev, noteId));
      setEditingTarget(null);
    } catch {
      setNoteServerError('Network error while deleting note.');
    } finally {
      setSavingNote(false);
    }
  }, []);

  const selectedFundMeta: DbHoldingFundMeta | null = useMemo(() => {
    if (!filters) return null;
    return filters.funds.find((f) => f.fund_code === selectedFundCode) || null;
  }, [filters, selectedFundCode]);

  const analysis = useMemo(
    () =>
      buildHoldingsHierarchy(rows, {
        focusAssetGroup,
        maxLeafNodesPerSubgroup: focusAssetGroup ? 28 : 16,
        minLeafWeightPct: focusAssetGroup ? 0.15 : 0.35,
      }),
    [rows, focusAssetGroup]
  );

  const treemapLayout = useMemo(
    () => computeD3TreemapLayout(analysis.root, TREEMAP_WIDTH, TREEMAP_HEIGHT),
    [analysis.root]
  );

  const sunburstLayout = useMemo(
    () => computeD3SunburstLayout(analysis.root, SUNBURST_RADIUS),
    [analysis.root]
  );

  const filteredLedgerRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const activeFund = selectedFundCode || analysis.fundCode;
    return analysis.topHoldings.filter((r) => {
      if (focusAssetGroup && r.asset_group !== focusAssetGroup) return false;
      const noteKey = buildHoldingNoteKey(activeFund, r.isin, r.security_name);
      const attachedNote = notesByKey[noteKey];
      if (notedOnly && !attachedNote) return false;
      if (!q) return true;
      return (
        r.security_name.toLowerCase().includes(q) ||
        (r.nse_symbol && r.nse_symbol.toLowerCase().includes(q)) ||
        (r.isin && r.isin.toLowerCase().includes(q)) ||
        (r.asset_subgroup && r.asset_subgroup.toLowerCase().includes(q)) ||
        (attachedNote && attachedNote.noteText.toLowerCase().includes(q))
      );
    });
  }, [analysis.topHoldings, analysis.fundCode, selectedFundCode, focusAssetGroup, searchTerm, notedOnly, notesByKey]);

  const fundNotedCount = useMemo(() => {
    const activeFund = selectedFundCode || analysis.fundCode;
    return analysis.topHoldings.reduce((count, r) => {
      const k = buildHoldingNoteKey(activeFund, r.isin, r.security_name);
      return count + (notesByKey[k] ? 1 : 0);
    }, 0);
  }, [analysis.topHoldings, analysis.fundCode, selectedFundCode, notesByKey]);

  const activeInspection: ActiveInspectionTarget = hoveredNode || {
    name: focusAssetGroup ? `${analysis.fundName} · ${focusAssetGroup}` : analysis.fundName,
    shortLabel: focusAssetGroup || analysis.fundCode,
    assetGroup: focusAssetGroup || 'All Asset Classes',
    assetSubgroup: `${analysis.root.constituentCount} disclosed constituents`,
    weightPct:
      chartType === 'treemap' ? treemapLayout.totalValue : sunburstLayout.totalValue,
    marketValueLakh: analysis.root.marketValueLakh,
    isin: null,
    nseSymbol: null,
    constituentCount: analysis.root.constituentCount,
  };

  const handleToggleGroupFocus = (groupName: string) => {
    setFocusAssetGroup((prev) => (prev === groupName ? null : groupName));
    setHoveredNode(null);
  };

  const isLoading = loadingFilters || loadingHoldings;

  return (
    <div data-testid="holdings-structure-panel" className="space-y-5">
      {/* Top Filter & Visualization Controls Bar */}
      <div className="rounded-[12px] bg-[#f8fafc] border border-[#e2e8f0] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="flex flex-col gap-1 min-w-[240px] flex-1 max-w-[360px]">
            <label
              htmlFor="holdings-fund-select"
              className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748b] font-semibold"
            >
              Mutual Fund Portfolio ({filters?.funds.length ?? 0} Disclosed)
            </label>
            <select
              id="holdings-fund-select"
              data-testid="holdings-fund-select"
              value={selectedFundCode}
              onChange={(e) => {
                const nextCode = e.target.value;
                setSelectedFundCode(nextCode);
                setFocusAssetGroup(null);
                setEditingTarget(null);
                setNotedOnly(false);
                const meta = filters?.funds.find((f) => f.fund_code === nextCode);
                if (meta?.latest_month) setSelectedMonth(meta.latest_month);
              }}
              className="h-9 px-3 rounded-[8px] border border-[#cbd5e1] bg-white text-xs font-semibold text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer"
            >
              {(filters?.funds || []).map((f) => (
                <option key={f.fund_code} value={f.fund_code}>
                  {f.fund_name} ({f.fund_category})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[148px]">
            <label
              htmlFor="holdings-month-select"
              className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748b] font-semibold"
            >
              Disclosure Snapshot
            </label>
            <select
              id="holdings-month-select"
              data-testid="holdings-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 px-2.5 rounded-[8px] border border-[#cbd5e1] bg-white font-mono text-xs font-semibold text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer"
            >
              {(filters?.months || []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {focusAssetGroup && (
            <div className="flex flex-col gap-1 self-end">
              <button
                type="button"
                data-testid="holdings-reset-zoom"
                onClick={() => setFocusAssetGroup(null)}
                className="h-9 px-3 rounded-[8px] border border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] text-xs font-semibold text-[#1d4ed8] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>All Groups ({focusAssetGroup})</span>
              </button>
            </div>
          )}
        </div>

        {/* D3 Visualization Mode Switcher: Treemap vs Sunburst */}
        <div className="flex items-center gap-2 shrink-0 self-start lg:self-end">
          <div
            role="group"
            aria-label="D3 holdings visualization layout"
            className="inline-flex items-center p-1 rounded-[9px] bg-white border border-[#cbd5e1]"
          >
            <button
              type="button"
              data-testid="holdings-view-treemap"
              aria-pressed={chartType === 'treemap'}
              onClick={() => setChartType('treemap')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                chartType === 'treemap'
                  ? 'bg-[#0f172a] text-white'
                  : 'text-[#475569] hover:text-[#0f172a]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>D3 Treemap</span>
            </button>
            <button
              type="button"
              data-testid="holdings-view-sunburst"
              aria-pressed={chartType === 'sunburst'}
              onClick={() => setChartType('sunburst')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                chartType === 'sunburst'
                  ? 'bg-[#0f172a] text-white'
                  : 'text-[#475569] hover:text-[#0f172a]'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5" />
              <span>D3 Sunburst</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 12-Column Split: Left 7 Cols D3 Canvas, Right 5 Cols Structure Telemetry & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Dark Institutional D3 Visualization Stage */}
        <div className="lg:col-span-7 rounded-[12px] bg-[#070d1c] text-white border border-white/[0.1] p-4 sm:p-5 flex flex-col justify-start gap-3.5 self-start">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/[0.08]">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#38bdf8] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>
                  SQLite Portfolio Holdings · {selectedMonth || analysis.monthEnd || 'Latest'}
                </span>
              </div>
              <h3 className="font-display font-bold text-lg text-white truncate mt-0.5">
                {analysis.fundName}
                {focusAssetGroup ? ` · ${focusAssetGroup}` : ''}
              </h3>
              <p className="text-[11.5px] text-[#94a3b8] mt-0.5 truncate">
                {chartType === 'treemap'
                  ? 'Click any group or tile to drill down · Hover a security for exact weight & ₹ Cr value.'
                  : 'Inner: Asset Group · Middle: Subgroup · Outer: Securities · Click any arc to drill down.'}
              </p>
            </div>

            <div className="text-right font-mono tabular-nums shrink-0 pl-2">
              <div className="text-[10.5px] text-[#94a3b8] uppercase">Fund AUM</div>
              <div className="text-base font-bold text-white whitespace-nowrap">
                {selectedFundMeta?.fund_aum_cr
                  ? `₹${Math.round(selectedFundMeta.fund_aum_cr).toLocaleString('en-IN')} Cr`
                  : formatMarketValueCr(analysis.totalMarketValueLakh)}
              </div>
              {selectedFundMeta?.ter_direct !== null && selectedFundMeta?.ter_direct !== undefined && (
                <div className="text-[10.5px] text-[#34d399] whitespace-nowrap">
                  TER {selectedFundMeta.ter_direct.toFixed(2)}% Dir
                </div>
              )}
            </div>
          </div>

          {/* Interactive Active Node Readout Strip */}
          <div
            data-testid="holdings-active-readout"
            className="rounded-[9px] bg-white/[0.04] border border-white/[0.09] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate">{activeInspection.name}</span>
                {activeInspection.constituentCount === 1 &&
                  (() => {
                    const key = buildHoldingNoteKey(
                      selectedFundCode || analysis.fundCode,
                      activeInspection.isin,
                      activeInspection.name
                    );
                    const activeNote = notesByKey[key];
                    if (!activeNote) return null;
                    return (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f59e0b]/20 border border-[#f59e0b]/40 text-[#fcd34d] text-[10px] font-mono shrink-0">
                        <StickyNote className="w-2.5 h-2.5" />
                        <span>Noted</span>
                      </span>
                    );
                  })()}
              </div>
              <div className="text-[11px] font-mono text-[#94a3b8] truncate">
                {activeInspection.assetGroup} · {activeInspection.assetSubgroup}
                {activeInspection.isin ? ` · ${activeInspection.isin}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-4 font-mono tabular-nums shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-[#94a3b8] uppercase">Weight</div>
                <div className="text-sm font-bold text-[#38bdf8]">
                  {activeInspection.weightPct.toFixed(2)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#94a3b8] uppercase">Value</div>
                <div className="text-sm font-bold text-[#34d399]">
                  {formatMarketValueCr(activeInspection.marketValueLakh)}
                </div>
              </div>
            </div>
          </div>

          {/* D3 SVG Canvas */}
          <div className="relative rounded-[10px] bg-[#040711] border border-white/[0.08] overflow-hidden min-h-[395px] flex items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 text-xs font-mono text-[#94a3b8] py-16">
                <Loader2 className="w-5 h-5 text-[#38bdf8] animate-spin" />
                <span>Loading portfolio holdings from /api/db/holdings...</span>
              </div>
            ) : errorMsg ? (
              <div className="px-6 py-12 text-center text-xs text-[#fca5a5]">{errorMsg}</div>
            ) : rows.length === 0 ? (
              <div className="px-6 py-12 text-center text-xs text-[#94a3b8]">
                No holdings records returned for {selectedFundCode} ({selectedMonth}).
              </div>
            ) : chartType === 'treemap' ? (
              <svg
                data-testid="d3-holdings-treemap-svg"
                viewBox={`0 0 ${TREEMAP_WIDTH} ${TREEMAP_HEIGHT}`}
                className="w-full h-auto block select-none"
                role="img"
                aria-label={`D3 portfolio holdings treemap for ${analysis.fundName}`}
              >
                {/* Asset Group Containers */}
                {treemapLayout.groups.map((grp) => {
                  const gw = grp.x1 - grp.x0;
                  const gh = grp.y1 - grp.y0;
                  return (
                    <g key={grp.id}>
                      <rect
                        x={grp.x0}
                        y={grp.y0}
                        width={Math.max(0, gw)}
                        height={Math.max(0, gh)}
                        rx={6}
                        fill="#0B1325"
                        stroke={grp.color}
                        strokeOpacity={0.55}
                        strokeWidth={1}
                      />
                      {gw >= 68 && (
                        <g
                          className="cursor-pointer"
                          onClick={() => handleToggleGroupFocus(grp.name)}
                        >
                          <rect
                            x={grp.x0 + 1}
                            y={grp.y0 + 1}
                            width={Math.max(0, gw - 2)}
                            height={18}
                            rx={4}
                            fill={grp.color}
                            fillOpacity={0.22}
                          />
                          <text
                            x={grp.x0 + 7}
                            y={grp.y0 + 13}
                            fill="#E2E8F0"
                            fontSize={10.5}
                            fontWeight={700}
                            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          >
                            {gw >= 140
                              ? `${grp.name} · ${grp.weightPct.toFixed(1)}%`
                              : `${grp.name.slice(0, 10)} ${grp.weightPct.toFixed(0)}%`}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Individual Security / Tail Leaf Rectangles */}
                {treemapLayout.leaves.map((leaf) => {
                  const w = leaf.x1 - leaf.x0;
                  const h = leaf.y1 - leaf.y0;
                  const isHovered = hoveredNode?.name === leaf.name;
                  const leafNoteKey = buildHoldingNoteKey(
                    selectedFundCode || analysis.fundCode,
                    leaf.isin,
                    leaf.name
                  );
                  const leafNote = leaf.kind === 'security' ? notesByKey[leafNoteKey] : undefined;
                  const fillOpacity =
                    leaf.kind === 'tail_bucket'
                      ? 0.34
                      : Math.min(0.92, Math.max(0.45, 0.42 + leaf.weightPct * 0.065));
                  const canShowTitle = w >= 48 && h >= 26;
                  const canShowPct = w >= 44 && h >= 40;

                  return (
                    <g
                      key={leaf.id}
                      data-testid="d3-treemap-tile"
                      data-noted={leafNote ? 'true' : 'false'}
                      className="cursor-pointer transition-opacity"
                      onMouseEnter={() =>
                        setHoveredNode({
                          name: leaf.name,
                          shortLabel: leaf.shortLabel,
                          assetGroup: leaf.assetGroup,
                          assetSubgroup: leaf.assetSubgroup,
                          weightPct: leaf.weightPct,
                          marketValueLakh: leaf.marketValueLakh,
                          isin: leaf.isin,
                          nseSymbol: leaf.nseSymbol,
                          constituentCount: leaf.constituentCount,
                        })
                      }
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => handleToggleGroupFocus(leaf.assetGroup)}
                    >
                      <rect
                        x={leaf.x0}
                        y={leaf.y0}
                        width={w}
                        height={h}
                        rx={3}
                        fill={leaf.color}
                        fillOpacity={isHovered ? 1 : fillOpacity}
                        stroke={isHovered ? '#FFFFFF' : leafNote ? '#F59E0B' : '#040711'}
                        strokeWidth={isHovered ? 1.6 : leafNote ? 1.4 : 1}
                      >
                        <title>
                          {`${leaf.name} (${leaf.assetGroup}) — ${leaf.weightPct.toFixed(2)}% · ${formatMarketValueCr(leaf.marketValueLakh)}${leafNote ? ` · Note: ${leafNote.noteText}` : ''}`}
                        </title>
                      </rect>
                      {leafNote && w >= 18 && h >= 18 && (
                        <circle
                          data-testid="d3-treemap-note-marker"
                          cx={leaf.x1 - 7}
                          cy={leaf.y0 + 7}
                          r={3.5}
                          fill="#F59E0B"
                          stroke="#040711"
                          strokeWidth={1}
                          pointerEvents="none"
                        />
                      )}
                      {canShowTitle && (
                        <text
                          x={leaf.x0 + 6}
                          y={leaf.y0 + 15}
                          fill="#FFFFFF"
                          fontSize={w >= 96 ? 11 : 9.5}
                          fontWeight={700}
                          pointerEvents="none"
                        >
                          {leaf.shortLabel.slice(0, Math.max(4, Math.floor((w - 14) / 6.5)))}
                        </text>
                      )}
                      {canShowPct && (
                        <text
                          x={leaf.x0 + 6}
                          y={leaf.y0 + 29}
                          fill="#E2E8F0"
                          fontSize={10}
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          pointerEvents="none"
                        >
                          {leaf.weightPct.toFixed(2)}%
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : (
              /* D3 Radial Partition Sunburst Chart */
              <svg
                data-testid="d3-holdings-sunburst-svg"
                viewBox={`${-SUNBURST_SIZE / 2} ${-SUNBURST_SIZE / 2} ${SUNBURST_SIZE} ${SUNBURST_SIZE}`}
                className="w-full max-w-[408px] h-auto block select-none py-1"
                role="img"
                aria-label={`D3 portfolio holdings sunburst for ${analysis.fundName}`}
              >
                {sunburstLayout.arcs.map((arc) => {
                  const isHovered = hoveredNode?.name === arc.name;
                  const depthOpacity =
                    arc.depth === 1 ? 0.92 : arc.depth === 2 ? 0.72 : 0.56;
                  return (
                    <g
                      key={arc.id}
                      data-testid="d3-sunburst-arc"
                      className="cursor-pointer"
                      onMouseEnter={() =>
                        setHoveredNode({
                          name: arc.name,
                          shortLabel: arc.shortLabel,
                          assetGroup: arc.assetGroup,
                          assetSubgroup: arc.assetSubgroup,
                          weightPct: arc.weightPct,
                          marketValueLakh: arc.marketValueLakh,
                          isin: arc.isin,
                          nseSymbol: arc.nseSymbol,
                          constituentCount: arc.constituentCount,
                        })
                      }
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => handleToggleGroupFocus(arc.assetGroup)}
                    >
                      <path
                        d={arc.pathD}
                        fill={arc.color}
                        fillOpacity={isHovered ? 1 : depthOpacity}
                        stroke={isHovered ? '#FFFFFF' : '#040711'}
                        strokeWidth={isHovered ? 1.5 : 0.8}
                      >
                        <title>
                          {`${arc.name} (${arc.assetGroup}) — ${arc.weightPct.toFixed(2)}%`}
                        </title>
                      </path>
                      {arc.showLabel && (
                        <text
                          transform={`translate(${arc.labelX.toFixed(1)},${arc.labelY.toFixed(1)}) rotate(${arc.labelAngleDeg.toFixed(1)})`}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FFFFFF"
                          fontSize={arc.depth === 1 ? 9.5 : arc.depth === 2 ? 8.5 : 7.5}
                          fontWeight={arc.depth === 1 ? 700 : 600}
                          pointerEvents="none"
                        >
                          {arc.shortLabel}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Interactive Center Hub */}
                <g
                  className="cursor-pointer"
                  onClick={() => {
                    if (focusAssetGroup) setFocusAssetGroup(null);
                  }}
                >
                  <circle
                    r={sunburstLayout.innerHoleRadius - 2}
                    fill="#0B1325"
                    stroke="rgba(148,163,184,0.28)"
                    strokeWidth={1.2}
                  />
                  <text
                    y={-12}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize={9}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {focusAssetGroup ? 'CLICK TO RESET' : 'WEIGHT'}
                  </text>
                  <text
                    y={8}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={16}
                    fontWeight={700}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {activeInspection.weightPct.toFixed(1)}%
                  </text>
                  <text
                    y={24}
                    textAnchor="middle"
                    fill="#38BDF8"
                    fontSize={9.5}
                    fontWeight={600}
                  >
                    {activeInspection.shortLabel.slice(0, 14)}
                  </text>
                </g>
              </svg>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#94a3b8] pt-1">
            <span>
              Source: SQLite `portfolio_holdings` via `/api/db/holdings` ({analysis.securityCount}{' '}
              constituents)
            </span>
            {onJumpToAnalysis && selectedFundMeta?.amfi_ssd_fund_id && (
              <button
                type="button"
                onClick={() => onJumpToAnalysis(analysis.fundName)}
                className="inline-flex items-center gap-1 text-[#38bdf8] hover:text-white cursor-pointer"
              >
                <span>Open in Fund Terminal</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Portfolio Structure KPIs, Interactive Asset Group Legend & Security Ledger */}
        <div className="lg:col-span-5 rounded-[12px] bg-[#f8fafc] border border-[#e2e8f0] p-5 flex flex-col justify-start gap-4">
          {/* Concentration KPI Strip */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[9px] bg-white border border-[#e2e8f0] p-3">
              <div className="text-[10.5px] font-mono uppercase text-[#64748b]">Top 10 Weight</div>
              <div className="text-lg font-mono font-bold text-[#0f172a] tabular-nums mt-0.5">
                {analysis.top10WeightPct.toFixed(1)}%
              </div>
              <div className="text-[10.5px] text-[#64748b] font-mono">
                Top 5: {analysis.top5WeightPct.toFixed(1)}%
              </div>
            </div>
            <div className="rounded-[9px] bg-white border border-[#e2e8f0] p-3">
              <div className="text-[10.5px] font-mono uppercase text-[#64748b]">
                Effective Holdings
              </div>
              <div className="text-lg font-mono font-bold text-[#2563eb] tabular-nums mt-0.5">
                {analysis.effectiveHoldings.toFixed(1)}
              </div>
              <div className="text-[10.5px] text-[#64748b] font-mono">
                HHI {analysis.hhiIndex.toFixed(0)} · {analysis.securityCount} total
              </div>
            </div>
          </div>

          {/* Clickable Asset Group Breakdown Filter */}
          <div className="rounded-[10px] bg-white border border-[#e2e8f0] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0f172a]">Asset Class Hierarchy</span>
              <span className="text-[10.5px] font-mono text-[#64748b]">Click to drill down</span>
            </div>
            <div className="space-y-1.5">
              {analysis.assetGroupBreakdown.map((item) => {
                const isFocused = focusAssetGroup === item.assetGroup;
                return (
                  <button
                    key={item.assetGroup}
                    type="button"
                    data-testid={`holdings-group-btn-${item.assetGroup.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => handleToggleGroupFocus(item.assetGroup)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-[7px] border transition-colors cursor-pointer ${
                      isFocused
                        ? 'bg-[#eff6ff] border-[#2563eb]'
                        : 'bg-[#f8fafc] border-transparent hover:border-[#cbd5e1]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2 font-medium text-[#0f172a] truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.assetGroup}</span>
                        <span className="text-[10.5px] font-mono text-[#64748b]">
                          ({item.securityCount})
                        </span>
                      </span>
                      <span className="font-mono font-semibold text-[#0f172a] tabular-nums shrink-0">
                        {item.weightPct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(2, item.weightPct))}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inline Custom Note Editor (when a holding is selected for annotation) */}
          {editingTarget && (
            <HoldingNoteComposer
              target={editingTarget}
              existingNote={notesByKey[editingTarget.holdingKey] || null}
              isSaving={savingNote}
              serverError={noteServerError}
              onSave={handleSaveHoldingNote}
              onDelete={handleDeleteHoldingNote}
              onClose={() => {
                setEditingTarget(null);
                setNoteServerError(null);
              }}
            />
          )}

          {/* Searchable Underlying Constituents Table with Per-Holding Custom Notes */}
          <div className="rounded-[10px] bg-white border border-[#e2e8f0] p-3.5 flex flex-col gap-2.5 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#0f172a]">
                  Disclosed Constituents ({filteredLedgerRows.length})
                </span>
                <button
                  type="button"
                  data-testid="holdings-noted-only-toggle"
                  aria-pressed={notedOnly}
                  onClick={() => setNotedOnly((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] border text-[10.5px] font-mono font-semibold transition-colors cursor-pointer ${
                    notedOnly
                      ? 'bg-[#fffbeb] border-[#f59e0b] text-[#b45309]'
                      : 'bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0f172a]'
                  }`}
                >
                  <StickyNote className="w-3 h-3" />
                  <span>Noted ({fundNotedCount})</span>
                </button>
              </div>
              <div className="relative w-40">
                <Search className="w-3 h-3 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  data-testid="holdings-search-input"
                  aria-label="Filter disclosed portfolio holdings"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter security / note..."
                  className="w-full h-7 pl-7 pr-2 rounded-[6px] border border-[#cbd5e1] bg-[#f8fafc] text-[11px] text-[#0f172a] focus:outline-none focus:border-[#2563eb] focus:bg-white"
                />
              </div>
            </div>

            <div className="max-h-[240px] overflow-y-auto divide-y divide-[#f1f5f9] pr-1">
              {filteredLedgerRows.slice(0, 40).map((row, idx) => {
                const activeFund = selectedFundCode || analysis.fundCode;
                const rowKey = buildHoldingNoteKey(activeFund, row.isin, row.security_name);
                const attachedNote = notesByKey[rowKey];
                const isEditingRow = editingTarget?.holdingKey === rowKey;
                const stanceMeta = attachedNote
                  ? HOLDING_NOTE_STANCE_META[attachedNote.stance]
                  : null;

                return (
                  <div
                    key={`${row.isin || row.security_name}-${idx}`}
                    data-testid="holdings-ledger-row"
                    onMouseEnter={() =>
                      setHoveredNode({
                        name: row.security_name,
                        shortLabel: row.nse_symbol || row.security_name.slice(0, 14),
                        assetGroup: row.asset_group,
                        assetSubgroup: row.asset_subgroup || row.asset_group,
                        weightPct: row.pct_of_fund,
                        marketValueLakh: row.market_value_lakh,
                        isin: row.isin,
                        nseSymbol: row.nse_symbol,
                        constituentCount: 1,
                      })
                    }
                    onMouseLeave={() => setHoveredNode(null)}
                    className={`py-2 px-1.5 rounded transition-colors ${
                      isEditingRow ? 'bg-[#eff6ff]' : 'hover:bg-[#f8fafc]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[#0f172a] truncate">
                          {row.security_name}
                        </div>
                        <div className="text-[10.5px] font-mono text-[#64748b] truncate">
                          {row.asset_group}
                          {row.isin ? ` · ${row.isin}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right font-mono tabular-nums">
                          <div className="font-semibold text-[#0f172a]">
                            {row.pct_of_fund.toFixed(2)}%
                          </div>
                          <div className="text-[10px] text-[#64748b]">
                            {formatMarketValueCr(row.market_value_lakh)}
                          </div>
                        </div>
                        <button
                          type="button"
                          data-testid="holding-note-trigger"
                          aria-label={
                            attachedNote
                              ? `Edit note for ${row.security_name}`
                              : `Add note for ${row.security_name}`
                          }
                          title={attachedNote ? 'Edit holding note' : 'Attach custom note'}
                          onClick={() =>
                            handleOpenNoteEditor({
                              securityName: row.security_name,
                              isin: row.isin,
                              nseSymbol: row.nse_symbol,
                            })
                          }
                          className={`p-1.5 rounded-[6px] border transition-colors cursor-pointer ${
                            attachedNote
                              ? 'bg-[#fffbeb] border-[#f59e0b] text-[#b45309] hover:bg-[#fef3c7]'
                              : 'bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#2563eb] hover:text-[#2563eb]'
                          }`}
                        >
                          <StickyNote className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Attached Note Preview */}
                    {attachedNote && (
                      <div
                        data-testid="holding-note-preview"
                        className="mt-1.5 rounded-[6px] bg-[#fffbeb]/80 border border-[#fde68a] px-2 py-1.5 text-[11px] text-[#334155]"
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          {stanceMeta && (
                            <span
                              style={{
                                backgroundColor: stanceMeta.bg,
                                color: stanceMeta.text,
                                borderColor: stanceMeta.border,
                              }}
                              className="inline-flex items-center px-1.5 py-0.2 rounded border text-[9.5px] font-mono font-semibold uppercase"
                            >
                              {stanceMeta.label}
                            </span>
                          )}
                          <span className="text-[9.5px] font-mono text-[#64748b]">
                            {formatNoteTimestamp(attachedNote.updatedAt)}
                          </span>
                        </div>
                        <p className="leading-snug whitespace-pre-wrap break-words">
                          {attachedNote.noteText}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredLedgerRows.length === 0 && (
                <div className="py-6 text-center text-xs text-[#64748b]">
                  {notedOnly
                    ? 'No holdings in this fund have attached notes yet. Click any note icon to add one.'
                    : 'No constituents match the current filter.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
