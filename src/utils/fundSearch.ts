import type { TerminalFundSummary } from '../types/db';

export type LocalInstrumentScope = 'ALL' | 'ETF' | 'MUTUAL_FUND' | 'INDEX_FUND' | 'FOF';

export interface LocalSchemeFilterOptions {
  instrumentScope?: LocalInstrumentScope;
  activeOnly?: boolean;
  limit?: number;
}

export interface LocalSchemeFilterResult {
  suggestions: TerminalFundSummary[];
  totalMatches: number;
}

interface ScoredItem {
  item: TerminalFundSummary;
  score: number;
  planRank: number;
  aum: number;
  nameLen: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPlanPreferenceRank(item: TerminalFundSummary): number {
  if (item.instrument_type === 'ETF') return 0;
  if (item.plan_type === 'Direct' && item.option_type === 'Growth') return 1;
  if (item.option_type === 'Growth') return 2;
  if (item.plan_type === 'Direct') return 3;
  return 4;
}

/**
 * Computes a deterministic relevance tier for cross-referencing user input
 * against AMFI scheme names (and scheme code / ISIN / AMC / sub-category fallbacks).
 * Returns -1 when the item does not match.
 */
function scoreSchemeMatch(
  item: TerminalFundSummary,
  normalizedQuery: string,
  tokens: string[],
  wordBoundaryRegex: RegExp | null
): number {
  if (!normalizedQuery) {
    return 0;
  }

  const nameLower = item.scheme_name.toLowerCase();
  const codeLower = item.scheme_code.toLowerCase();
  const isinLower = (item.isin || '').toLowerCase();

  // Tier 0: Exact scheme code or ISIN match
  if (codeLower === normalizedQuery || (isinLower && isinLower === normalizedQuery)) {
    return 0;
  }

  // Tier 1: Exact scheme name match
  if (nameLower === normalizedQuery) {
    return 1;
  }

  // Tier 2: Scheme name starts with query
  if (nameLower.startsWith(normalizedQuery)) {
    return 2;
  }

  // Tier 3: Word-boundary match inside scheme name (e.g. "Gold BeES" in "Nippon India ETF Gold BeES")
  if (wordBoundaryRegex && wordBoundaryRegex.test(nameLower)) {
    return 3;
  }

  // Tier 4: Contiguous phrase match inside scheme name
  if (nameLower.includes(normalizedQuery)) {
    return 4;
  }

  // Tier 5: All query tokens appear inside scheme name (in any order)
  if (tokens.length > 1 && tokens.every((tok) => nameLower.includes(tok))) {
    return 5;
  }

  // Tier 6: Cross-field token match across scheme_name, AMC, sub_category, scheme_code, and ISIN
  const searchable = `${nameLower} ${item.amc.toLowerCase()} ${item.sub_category.toLowerCase()} ${codeLower} ${isinLower}`;
  if (tokens.every((tok) => searchable.includes(tok))) {
    return 6;
  }

  return -1;
}

/**
 * Local client-side filtering function for FundTerminal's search input.
 * Cross-references user input against AMFI dataset scheme names (with code/ISIN/AMC fallback)
 * and returns the top N (default 5) ranked suggestions plus total match count.
 */
export function filterAmfiSchemesLocally(
  dataset: readonly TerminalFundSummary[],
  rawQuery: string,
  options: LocalSchemeFilterOptions = {}
): LocalSchemeFilterResult {
  const { instrumentScope = 'ALL', activeOnly = false, limit = 5 } = options;
  const cappedLimit = Math.max(1, Math.min(25, Math.floor(limit)));
  const normalizedQuery = rawQuery.trim().toLowerCase().replace(/\s+/g, ' ');
  const tokens = normalizedQuery ? normalizedQuery.split(' ').filter(Boolean).slice(0, 6) : [];
  const wordBoundaryRegex = normalizedQuery
    ? new RegExp(`(?:^|[\\s\\-/(])${escapeRegExp(normalizedQuery)}`, 'i')
    : null;

  const scored: ScoredItem[] = [];

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];

    if (activeOnly && item.is_active !== 1) continue;
    if (instrumentScope !== 'ALL' && item.instrument_type !== instrumentScope) continue;

    const score = scoreSchemeMatch(item, normalizedQuery, tokens, wordBoundaryRegex);
    if (score < 0) continue;

    scored.push({
      item,
      score,
      planRank: getPlanPreferenceRank(item),
      aum: item.fund_aum_cr ?? 0,
      nameLen: item.scheme_name.length,
    });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.item.is_active !== b.item.is_active) return b.item.is_active - a.item.is_active;
    if (a.item.is_segregated !== b.item.is_segregated) return a.item.is_segregated - b.item.is_segregated;
    if (a.planRank !== b.planRank) return a.planRank - b.planRank;
    if (a.aum !== b.aum) return b.aum - a.aum;
    if (a.nameLen !== b.nameLen) return a.nameLen - b.nameLen;
    return a.item.scheme_name.localeCompare(b.item.scheme_name);
  });

  return {
    suggestions: scored.slice(0, cappedLimit).map((s) => s.item),
    totalMatches: scored.length,
  };
}

/**
 * Convenience wrapper returning strictly the top 5 matching AMFI scheme suggestions.
 */
export function getTop5SchemeSuggestions(
  dataset: readonly TerminalFundSummary[],
  rawQuery: string,
  options: Omit<LocalSchemeFilterOptions, 'limit'> = {}
): TerminalFundSummary[] {
  return filterAmfiSchemesLocally(dataset, rawQuery, { ...options, limit: 5 }).suggestions;
}

/**
 * Splits a scheme name into plain/matched text segments for safe React highlighting
 * without raw HTML injection.
 */
export function highlightMatchedTokens(
  text: string,
  rawQuery: string
): Array<{ text: string; matched: boolean }> {
  const tokens = rawQuery
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 6);

  if (tokens.length === 0 || !text) {
    return [{ text, matched: false }];
  }

  // Sort longest tokens first so overlapping substrings match cleanly
  const uniqueSorted = Array.from(new Set(tokens.map((t) => t.toLowerCase()))).sort(
    (a, b) => b.length - a.length
  );
  const regex = new RegExp(`(${uniqueSorted.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(regex).filter((p) => p.length > 0);

  return parts.map((part) => {
    const lower = part.toLowerCase();
    const matched = uniqueSorted.some((tok) => tok === lower);
    return { text: part, matched };
  });
}
