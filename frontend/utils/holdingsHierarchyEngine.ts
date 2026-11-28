import * as d3 from 'd3';

export interface DbHoldingRow {
  fund_code: string;
  fund_name: string;
  fund_category: string;
  month_end: string;
  isin: string | null;
  security_name: string;
  nse_symbol: string | null;
  market_value_lakh: number;
  quantity: number;
  pct_of_fund: number;
  asset_group: string;
  asset_subgroup: string | null;
  mapping_category: string | null;
  isin_type: string | null;
  line_count: number;
  amfi_ssd_fund_id: string | null;
  amc: string | null;
  fund_aum_cr: number | null;
  riskometer: string | null;
  ter_direct: number | null;
  ter_regular: number | null;
}

export interface DbHoldingFundMeta {
  fund_code: string;
  fund_name: string;
  fund_category: string;
  amfi_ssd_fund_id: string | null;
  months_available: number;
  latest_month: string;
  fund_aum_cr: number | null;
  ter_direct: number | null;
  ter_regular: number | null;
}

export interface DbHoldingsFiltersPayload {
  funds: DbHoldingFundMeta[];
  categories: string[];
  months: string[];
  assetGroups: string[];
}

export interface DbHoldingsResponse {
  total: number;
  limit: number;
  offset: number;
  aggregated: boolean;
  rows: DbHoldingRow[];
}

export type HoldingsNodeKind = 'root' | 'asset_group' | 'asset_subgroup' | 'security' | 'tail_bucket';

export interface HoldingsTreeNode {
  id: string;
  name: string;
  shortLabel: string;
  kind: HoldingsNodeKind;
  assetGroup: string;
  assetSubgroup?: string;
  isin?: string | null;
  nseSymbol?: string | null;
  /** Value only set on leaf nodes so d3.hierarchy().sum() never double-counts */
  value?: number;
  marketValueLakh: number;
  quantity?: number;
  constituentCount: number;
  color: string;
  children?: HoldingsTreeNode[];
}

export interface AssetGroupSummaryItem {
  assetGroup: string;
  weightPct: number;
  marketValueLakh: number;
  securityCount: number;
  color: string;
}

export interface HoldingsStructureAnalysis {
  fundCode: string;
  fundName: string;
  amc: string;
  monthEnd: string;
  fundAumCr: number | null;
  terDirect: number | null;
  terRegular: number | null;
  riskometer: string | null;
  totalWeightPct: number;
  totalMarketValueLakh: number;
  securityCount: number;
  top5WeightPct: number;
  top10WeightPct: number;
  hhiIndex: number;
  effectiveHoldings: number;
  assetGroupBreakdown: AssetGroupSummaryItem[];
  topHoldings: DbHoldingRow[];
  root: HoldingsTreeNode;
}

export interface TreemapLeafRect {
  id: string;
  name: string;
  shortLabel: string;
  kind: HoldingsNodeKind;
  assetGroup: string;
  assetSubgroup: string;
  isin: string | null;
  nseSymbol: string | null;
  weightPct: number;
  marketValueLakh: number;
  constituentCount: number;
  color: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TreemapGroupBox {
  id: string;
  name: string;
  weightPct: number;
  color: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface SunburstArcDatum {
  id: string;
  name: string;
  shortLabel: string;
  kind: HoldingsNodeKind;
  depth: number;
  assetGroup: string;
  assetSubgroup: string;
  isin: string | null;
  nseSymbol: string | null;
  weightPct: number;
  marketValueLakh: number;
  constituentCount: number;
  color: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  pathD: string;
  labelX: number;
  labelY: number;
  labelAngleDeg: number;
  showLabel: boolean;
}

const ASSET_GROUP_PALETTE: Record<string, string> = {
  Equity: '#2563EB',
  'Foreign stocks': '#7C3AED',
  Debt: '#059669',
  'REITs and InvITs': '#0891B2',
  'Money market': '#D97706',
  Cash: '#475569',
  'Mutual fund units': '#0D9488',
  Others: '#64748B',
};

/** Banker's rounding (Round Half to Even) for deterministic financial display precision */
export function roundHalfEven(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  const scaled = value * factor;
  const floored = Math.floor(scaled);
  const diff = scaled - floored;
  const eps = 1e-10;
  if (Math.abs(diff - 0.5) < eps) {
    return (floored % 2 === 0 ? floored : floored + 1) / factor;
  }
  return Math.round(scaled) / factor;
}

export function getAssetGroupColor(groupName: string): string {
  const normalized = (groupName || '').trim();
  if (ASSET_GROUP_PALETTE[normalized]) {
    return ASSET_GROUP_PALETTE[normalized];
  }
  const lower = normalized.toLowerCase();
  if (lower.includes('equity')) return '#2563EB';
  if (lower.includes('foreign') || lower.includes('global')) return '#7C3AED';
  if (lower.includes('debt') || lower.includes('bond') || lower.includes('g-sec')) return '#059669';
  if (lower.includes('reit') || lower.includes('invit')) return '#0891B2';
  if (lower.includes('money')) return '#D97706';
  if (lower.includes('cash') || lower.includes('treps')) return '#475569';
  if (lower.includes('mutual') || lower.includes('etf')) return '#0D9488';
  return '#64748B';
}

export function formatSecurityShortLabel(name: string, nseSymbol?: string | null): string {
  const cleanSym = (nseSymbol || '').trim();
  if (cleanSym && cleanSym.length <= 12) {
    return cleanSym;
  }
  const stripped = (name || 'Holding')
    .replace(
      /\b(LIMITED|LTD\.?|INC\.?|INCORPORATED|PLC|EQ|NEW|FV|F\.V\.|RE\.?|RS\.?|INR|OF|THE|INDIA|CORPORATION|CORP\.?|CLASS\s+[A-Z]|COMMON\s+STOCK|SHARES?|ADR|GDR)\b/gi,
      ' '
    )
    .replace(/[.,()]+/g, ' ')
    .replace(/[0-9]+\/?-?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return (name || 'Holding').slice(0, 14);
  const words = stripped.split(' ').slice(0, 2).join(' ');
  return words.length > 16 ? `${words.slice(0, 15)}…` : words;
}

export function formatMarketValueCr(marketValueLakh: number): string {
  if (!Number.isFinite(marketValueLakh) || marketValueLakh <= 0) return '₹0.0 Cr';
  const cr = marketValueLakh / 100;
  if (cr >= 1000) {
    return `₹${roundHalfEven(cr, 0).toLocaleString('en-IN')} Cr`;
  }
  if (cr >= 10) {
    return `₹${roundHalfEven(cr, 1).toLocaleString('en-IN')} Cr`;
  }
  return `₹${roundHalfEven(cr, 2).toFixed(2)} Cr`;
}

/**
 * Builds a clean 3-tier hierarchy (Root -> Asset Group -> Asset Subgroup -> Securities)
 * and computes institutional concentration telemetry from raw `/api/db/holdings` rows.
 */
export function buildHoldingsHierarchy(
  rawRows: DbHoldingRow[],
  options?: {
    maxLeafNodesPerSubgroup?: number;
    minLeafWeightPct?: number;
    focusAssetGroup?: string | null;
  }
): HoldingsStructureAnalysis {
  const maxLeafNodesPerSubgroup = options?.maxLeafNodesPerSubgroup ?? 20;
  const minLeafWeightPct = options?.minLeafWeightPct ?? 0.3;
  const focusAssetGroup = options?.focusAssetGroup ? options.focusAssetGroup.trim() : null;

  // Deduplicate by (ISIN || normalized name) keeping positive weights only
  const dedupedMap = new Map<string, DbHoldingRow>();
  for (const row of rawRows) {
    const pct = Number(row.pct_of_fund);
    if (!Number.isFinite(pct) || pct <= 0) continue;
    const key = (row.isin?.trim() || row.security_name.trim()).toUpperCase();
    const existing = dedupedMap.get(key);
    if (!existing || pct > existing.pct_of_fund) {
      dedupedMap.set(key, {
        ...row,
        pct_of_fund: pct,
        market_value_lakh: Number.isFinite(Number(row.market_value_lakh))
          ? Math.max(0, Number(row.market_value_lakh))
          : 0,
        asset_group: (row.asset_group || 'Others').trim() || 'Others',
        asset_subgroup: (row.asset_subgroup || row.asset_group || 'General').trim() || 'General',
      });
    }
  }

  const allValidRows = Array.from(dedupedMap.values()).sort(
    (a, b) => b.pct_of_fund - a.pct_of_fund
  );

  const first = allValidRows[0] || rawRows[0];
  const fundCode = first?.fund_code || 'PORTFOLIO';
  const fundName = first?.fund_name || 'Selected Mutual Fund';
  const amc = first?.amc || 'AMFI Registered AMC';
  const monthEnd = first?.month_end || '';
  const fundAumCr = first?.fund_aum_cr ?? null;
  const terDirect = first?.ter_direct ?? null;
  const terRegular = first?.ter_regular ?? null;
  const riskometer = first?.riskometer ?? null;

  // Compute full-portfolio stats BEFORE optional asset group zoom
  let totalWeightBps = 0;
  let totalMarketValueLakh = 0;
  let hhiSum = 0;
  const groupTotals = new Map<
    string,
    { weightBps: number; mvLakh: number; count: number }
  >();

  for (const r of allValidRows) {
    const bps = Math.round(r.pct_of_fund * 100);
    totalWeightBps += bps;
    totalMarketValueLakh += r.market_value_lakh;
    hhiSum += r.pct_of_fund * r.pct_of_fund;
    const g = groupTotals.get(r.asset_group) || { weightBps: 0, mvLakh: 0, count: 0 };
    g.weightBps += bps;
    g.mvLakh += r.market_value_lakh;
    g.count += 1;
    groupTotals.set(r.asset_group, g);
  }

  const top5WeightPct = roundHalfEven(
    allValidRows.slice(0, 5).reduce((s, r) => s + r.pct_of_fund, 0),
    2
  );
  const top10WeightPct = roundHalfEven(
    allValidRows.slice(0, 10).reduce((s, r) => s + r.pct_of_fund, 0),
    2
  );
  const hhiIndex = roundHalfEven(hhiSum, 1);
  const effectiveHoldings = hhiSum > 0 ? roundHalfEven(10000 / hhiSum, 1) : 0;

  const assetGroupBreakdown: AssetGroupSummaryItem[] = Array.from(groupTotals.entries())
    .map(([assetGroup, info]) => ({
      assetGroup,
      weightPct: roundHalfEven(info.weightBps / 100, 2),
      marketValueLakh: roundHalfEven(info.mvLakh, 2),
      securityCount: info.count,
      color: getAssetGroupColor(assetGroup),
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  // Scope tree rows if focused on a single asset group
  const treeRows = focusAssetGroup
    ? allValidRows.filter((r) => r.asset_group === focusAssetGroup)
    : allValidRows;

  const byGroup = new Map<string, Map<string, DbHoldingRow[]>>();
  for (const row of treeRows) {
    let subMap = byGroup.get(row.asset_group);
    if (!subMap) {
      subMap = new Map<string, DbHoldingRow[]>();
      byGroup.set(row.asset_group, subMap);
    }
    const subKey = row.asset_subgroup || row.asset_group;
    const arr = subMap.get(subKey) || [];
    arr.push(row);
    subMap.set(subKey, arr);
  }

  const groupNodes: HoldingsTreeNode[] = [];
  for (const [groupName, subMap] of byGroup.entries()) {
    const groupColor = getAssetGroupColor(groupName);
    const subgroupNodes: HoldingsTreeNode[] = [];
    let groupMvLakh = 0;
    let groupCount = 0;

    for (const [subName, items] of subMap.entries()) {
      const sorted = [...items].sort((a, b) => b.pct_of_fund - a.pct_of_fund);
      const leafNodes: HoldingsTreeNode[] = [];
      let tailPct = 0;
      let tailMv = 0;
      let tailCount = 0;

      sorted.forEach((item, idx) => {
        const shouldFoldIntoTail =
          sorted.length > 5 &&
          (idx >= maxLeafNodesPerSubgroup || (idx >= 8 && item.pct_of_fund < minLeafWeightPct));
        if (shouldFoldIntoTail) {
          tailPct += item.pct_of_fund;
          tailMv += item.market_value_lakh;
          tailCount += 1;
        } else {
          leafNodes.push({
            id: `sec:${item.isin || item.security_name}:${idx}`,
            name: item.security_name,
            shortLabel: formatSecurityShortLabel(item.security_name, item.nse_symbol),
            kind: 'security',
            assetGroup: groupName,
            assetSubgroup: subName,
            isin: item.isin,
            nseSymbol: item.nse_symbol,
            value: roundHalfEven(item.pct_of_fund, 4),
            marketValueLakh: item.market_value_lakh,
            quantity: item.quantity,
            constituentCount: 1,
            color: groupColor,
          });
        }
      });

      if (tailCount > 0 && tailPct > 0) {
        leafNodes.push({
          id: `tail:${groupName}:${subName}`,
          name: `Other ${tailCount} ${subName}`,
          shortLabel: `+${tailCount} others`,
          kind: 'tail_bucket',
          assetGroup: groupName,
          assetSubgroup: subName,
          isin: null,
          nseSymbol: null,
          value: roundHalfEven(tailPct, 4),
          marketValueLakh: tailMv,
          constituentCount: tailCount,
          color: groupColor,
        });
      }

      const subMv = sorted.reduce((s, x) => s + x.market_value_lakh, 0);
      groupMvLakh += subMv;
      groupCount += sorted.length;

      subgroupNodes.push({
        id: `sub:${groupName}:${subName}`,
        name: subName,
        shortLabel: subName.length > 18 ? `${subName.slice(0, 17)}…` : subName,
        kind: 'asset_subgroup',
        assetGroup: groupName,
        assetSubgroup: subName,
        marketValueLakh: subMv,
        constituentCount: sorted.length,
        color: groupColor,
        children: leafNodes,
      });
    }

    groupNodes.push({
      id: `grp:${groupName}`,
      name: groupName,
      shortLabel: groupName,
      kind: 'asset_group',
      assetGroup: groupName,
      marketValueLakh: groupMvLakh,
      constituentCount: groupCount,
      color: groupColor,
      children: subgroupNodes,
    });
  }

  const root: HoldingsTreeNode = {
    id: `root:${fundCode}`,
    name: focusAssetGroup ? `${fundName} · ${focusAssetGroup}` : fundName,
    shortLabel: focusAssetGroup || fundCode,
    kind: 'root',
    assetGroup: focusAssetGroup || 'Portfolio',
    marketValueLakh: treeRows.reduce((s, r) => s + r.market_value_lakh, 0),
    constituentCount: treeRows.length,
    color: '#0F172A',
    children: groupNodes,
  };

  return {
    fundCode,
    fundName,
    amc,
    monthEnd,
    fundAumCr,
    terDirect,
    terRegular,
    riskometer,
    totalWeightPct: roundHalfEven(totalWeightBps / 100, 2),
    totalMarketValueLakh: roundHalfEven(totalMarketValueLakh, 2),
    securityCount: allValidRows.length,
    top5WeightPct,
    top10WeightPct,
    hhiIndex,
    effectiveHoldings,
    assetGroupBreakdown,
    topHoldings: allValidRows,
    root,
  };
}

/**
 * Computes a D3 squarified treemap layout (group bounding boxes + individual security leaf rects).
 */
export function computeD3TreemapLayout(
  rootNode: HoldingsTreeNode,
  width: number,
  height: number
): { groups: TreemapGroupBox[]; leaves: TreemapLeafRect[]; totalValue: number } {
  if (!rootNode.children || rootNode.children.length === 0 || width <= 0 || height <= 0) {
    return { groups: [], leaves: [], totalValue: 0 };
  }

  const hierarchy = d3
    .hierarchy<HoldingsTreeNode>(rootNode)
    .sum((d) => (typeof d.value === 'number' && d.value > 0 ? d.value : 0))
    .sort((a, b) => {
      const aTail = a.data.kind === 'tail_bucket' ? 1 : 0;
      const bTail = b.data.kind === 'tail_bucket' ? 1 : 0;
      if (aTail !== bTail) return aTail - bTail;
      return (b.value || 0) - (a.value || 0);
    });

  const treemapLayout = d3
    .treemap<HoldingsTreeNode>()
    .tile(d3.treemapSquarify.ratio(1.35))
    .size([width, height])
    .paddingOuter(4)
    .paddingTop((node) => (node.depth === 1 ? 20 : 2))
    .paddingInner(2)
    .round(true);

  const laidOut = treemapLayout(hierarchy);
  const totalValue = laidOut.value || 0;

  const groups: TreemapGroupBox[] = (laidOut.children || []).map((g) => ({
    id: g.data.id,
    name: g.data.name,
    weightPct: roundHalfEven(g.value || 0, 2),
    color: g.data.color,
    x0: g.x0,
    y0: g.y0,
    x1: g.x1,
    y1: g.y1,
  }));

  const leaves: TreemapLeafRect[] = laidOut
    .leaves()
    .filter((leaf) => leaf.x1 > leaf.x0 && leaf.y1 > leaf.y0)
    .map((leaf) => ({
      id: leaf.data.id,
      name: leaf.data.name,
      shortLabel: leaf.data.shortLabel,
      kind: leaf.data.kind,
      assetGroup: leaf.data.assetGroup,
      assetSubgroup: leaf.data.assetSubgroup || leaf.data.assetGroup,
      isin: leaf.data.isin ?? null,
      nseSymbol: leaf.data.nseSymbol ?? null,
      weightPct: roundHalfEven(leaf.value || 0, 2),
      marketValueLakh: leaf.data.marketValueLakh,
      constituentCount: leaf.data.constituentCount,
      color: leaf.data.color,
      x0: leaf.x0,
      y0: leaf.y0,
      x1: leaf.x1,
      y1: leaf.y1,
    }));

  return { groups, leaves, totalValue: roundHalfEven(totalValue, 2) };
}

/**
 * Computes a D3 radial partition sunburst layout (Ring 1: Asset Group, Ring 2: Subgroup, Ring 3: Securities).
 */
export function computeD3SunburstLayout(
  rootNode: HoldingsTreeNode,
  outerRadius: number
): { arcs: SunburstArcDatum[]; totalValue: number; innerHoleRadius: number } {
  const innerHoleRadius = Math.max(44, Math.round(outerRadius * 0.28));
  if (!rootNode.children || rootNode.children.length === 0 || outerRadius <= 60) {
    return { arcs: [], totalValue: 0, innerHoleRadius };
  }

  const hierarchy = d3
    .hierarchy<HoldingsTreeNode>(rootNode)
    .sum((d) => (typeof d.value === 'number' && d.value > 0 ? d.value : 0))
    .sort((a, b) => {
      const aTail = a.data.kind === 'tail_bucket' ? 1 : 0;
      const bTail = b.data.kind === 'tail_bucket' ? 1 : 0;
      if (aTail !== bTail) return aTail - bTail;
      return (b.value || 0) - (a.value || 0);
    });

  const partitionLayout = d3
    .partition<HoldingsTreeNode>()
    .size([2 * Math.PI, outerRadius - innerHoleRadius]);

  const partitioned = partitionLayout(hierarchy);
  const totalValue = partitioned.value || 0;

  const arcGenerator = d3
    .arc<d3.HierarchyRectangularNode<HoldingsTreeNode>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.008))
    .padRadius(outerRadius / 2)
    .innerRadius((d) => innerHoleRadius + d.y0 + 1.5)
    .outerRadius((d) => Math.max(innerHoleRadius + d.y0 + 2, innerHoleRadius + d.y1 - 1.5))
    .cornerRadius(2);

  const arcs: SunburstArcDatum[] = [];

  for (const node of partitioned.descendants()) {
    if (node.depth === 0) continue;
    const span = node.x1 - node.x0;
    if (span < 0.004) continue;

    const pathD = arcGenerator(node) || '';
    const midAngle = (node.x0 + node.x1) / 2;
    const radialThickness = node.y1 - node.y0;
    const midRadius = innerHoleRadius + (node.y0 + node.y1) / 2;
    const labelX = Math.sin(midAngle) * midRadius;
    const labelY = -Math.cos(midAngle) * midRadius;
    const arcLen = span * midRadius;

    // Inner & middle rings use tangential orientation along the arc; outer ring uses radial orientation
    const isOuterRing = node.depth >= 3;
    let labelAngleDeg: number;
    let showLabel: boolean;
    let displayLabel = node.data.shortLabel;

    if (!isOuterRing) {
      const tangentDeg = (midAngle * 180) / Math.PI;
      labelAngleDeg = midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2
        ? tangentDeg + 180
        : tangentDeg;
      showLabel = arcLen >= 46 && radialThickness >= 22;
      const maxTangentialChars = Math.max(5, Math.min(14, Math.floor((arcLen - 12) / 5.8)));
      if (displayLabel.length > maxTangentialChars) {
        displayLabel = `${displayLabel.slice(0, maxTangentialChars - 1)}…`;
      }
    } else {
      const radialDeg = (midAngle * 180) / Math.PI - 90;
      labelAngleDeg = midAngle > Math.PI ? radialDeg + 180 : radialDeg;
      showLabel = arcLen >= 16 && radialThickness >= 34 && span >= 0.08;
      const maxRadialChars = Math.max(4, Math.min(8, Math.floor((radialThickness - 10) / 5.2)));
      if (displayLabel.length > maxRadialChars) {
        displayLabel = displayLabel.slice(0, maxRadialChars);
      }
    }

    arcs.push({
      id: node.data.id,
      name: node.data.name,
      shortLabel: displayLabel,
      kind: node.data.kind,
      depth: node.depth,
      assetGroup: node.data.assetGroup,
      assetSubgroup: node.data.assetSubgroup || node.data.assetGroup,
      isin: node.data.isin ?? null,
      nseSymbol: node.data.nseSymbol ?? null,
      weightPct: roundHalfEven(node.value || 0, 2),
      marketValueLakh: node.data.marketValueLakh,
      constituentCount: node.data.constituentCount,
      color: node.data.color,
      x0: node.x0,
      x1: node.x1,
      y0: node.y0,
      y1: node.y1,
      pathD,
      labelX,
      labelY,
      labelAngleDeg,
      showLabel,
    });
  }

  return {
    arcs,
    totalValue: roundHalfEven(totalValue, 2),
    innerHoleRadius,
  };
}
