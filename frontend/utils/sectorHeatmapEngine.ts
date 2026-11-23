import { SectorHeatmapItem } from './fundIntelligenceEngine';

export type SectorBullBearStance = 'Bullish' | 'Neutral' | 'Bearish';

export interface SectorTreemapNode {
  name: string;
  size: number;
  weightPct: number;
  change1MPct: number;
  topHolding: string;
  peMultiple: number | null;
  stance: SectorBullBearStance;
  bullContributionPct: number;
  bearContributionPct: number;
  fill: string;
  stroke: string;
  textColor: string;
  subTextColor: string;
}

export interface BullBearSectorSummary {
  nodes: SectorTreemapNode[];
  bullWeightPct: number;
  neutralWeightPct: number;
  bearWeightPct: number;
  netTiltPct: number; // bullWeightPct - bearWeightPct
  dominantStance: SectorBullBearStance;
  strongestBull: SectorTreemapNode | null;
  strongestBear: SectorTreemapNode | null;
}

/**
 * Classifies a sector allocation slice into Bullish, Neutral, or Bearish
 * based on trailing 1-month momentum and derives high-contrast treemap colors.
 */
export function classifySectorStance(change1MPct: number): {
  stance: SectorBullBearStance;
  fill: string;
  stroke: string;
  textColor: string;
  subTextColor: string;
} {
  if (change1MPct >= 2.2) {
    return {
      stance: 'Bullish',
      fill: '#047857',
      stroke: '#065f46',
      textColor: '#ffffff',
      subTextColor: '#d1fae5',
    };
  }
  if (change1MPct >= 0.4) {
    return {
      stance: 'Bullish',
      fill: '#10b981',
      stroke: '#059669',
      textColor: '#ffffff',
      subTextColor: '#ecfdf5',
    };
  }
  if (change1MPct <= -1.8) {
    return {
      stance: 'Bearish',
      fill: '#be123c',
      stroke: '#9f1239',
      textColor: '#ffffff',
      subTextColor: '#ffe4e6',
    };
  }
  if (change1MPct <= -0.4) {
    return {
      stance: 'Bearish',
      fill: '#e11d48',
      stroke: '#be123c',
      textColor: '#ffffff',
      subTextColor: '#fff1f2',
    };
  }
  return {
    stance: 'Neutral',
    fill: '#475569',
    stroke: '#334155',
    textColor: '#ffffff',
    subTextColor: '#e2e8f0',
  };
}

/**
 * Builds deterministic Recharts Treemap nodes and portfolio-level Bull vs Bear
 * weighting totals for any Mutual Fund or ETF sector allocation array.
 */
export function buildBullBearSectorTreemapData(
  items: SectorHeatmapItem[],
  stanceFilter: 'ALL' | SectorBullBearStance = 'ALL'
): BullBearSectorSummary {
  const validItems = items
    .filter((item) => Number.isFinite(item.weightPct) && item.weightPct > 0)
    .sort((a, b) => b.weightPct - a.weightPct);

  let bullWeightPct = 0;
  let neutralWeightPct = 0;
  let bearWeightPct = 0;

  const allNodes: SectorTreemapNode[] = validItems.map((item) => {
    const style = classifySectorStance(item.change1MPct);
    const weight = Number(item.weightPct.toFixed(1));

    if (style.stance === 'Bullish') bullWeightPct += weight;
    else if (style.stance === 'Bearish') bearWeightPct += weight;
    else neutralWeightPct += weight;

    // Fractional bull/bear weighting contribution inside each sector
    const clampedSignal = Math.max(-4, Math.min(4, item.change1MPct));
    const bullShare = 0.5 + clampedSignal / 8; // 0..1
    const bullContributionPct = Number((weight * bullShare).toFixed(1));
    const bearContributionPct = Number((weight * (1 - bullShare)).toFixed(1));

    return {
      name: item.sector,
      size: Math.max(weight, 1),
      weightPct: weight,
      change1MPct: Number(item.change1MPct.toFixed(2)),
      topHolding: item.topHolding,
      peMultiple: item.peMultiple,
      stance: style.stance,
      bullContributionPct,
      bearContributionPct,
      fill: style.fill,
      stroke: style.stroke,
      textColor: style.textColor,
      subTextColor: style.subTextColor,
    };
  });

  bullWeightPct = Number(bullWeightPct.toFixed(1));
  neutralWeightPct = Number(neutralWeightPct.toFixed(1));
  bearWeightPct = Number(bearWeightPct.toFixed(1));
  const netTiltPct = Number((bullWeightPct - bearWeightPct).toFixed(1));

  const dominantStance: SectorBullBearStance =
    netTiltPct >= 10 ? 'Bullish' : netTiltPct <= -10 ? 'Bearish' : 'Neutral';

  const bullNodes = allNodes.filter((n) => n.stance === 'Bullish');
  const bearNodes = allNodes.filter((n) => n.stance === 'Bearish');

  const strongestBull =
    bullNodes.length > 0
      ? bullNodes.reduce((best, curr) => (curr.change1MPct > best.change1MPct ? curr : best))
      : null;

  const strongestBear =
    bearNodes.length > 0
      ? bearNodes.reduce((worst, curr) => (curr.change1MPct < worst.change1MPct ? curr : worst))
      : null;

  const filteredNodes =
    stanceFilter === 'ALL' ? allNodes : allNodes.filter((n) => n.stance === stanceFilter);

  return {
    nodes: filteredNodes.length > 0 ? filteredNodes : allNodes,
    bullWeightPct,
    neutralWeightPct,
    bearWeightPct,
    netTiltPct,
    dominantStance,
    strongestBull,
    strongestBear,
  };
}
