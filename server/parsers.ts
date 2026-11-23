const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

export interface ParsedAmfiNavRecord {
  scheme_code: string;
  isin_div_payout_growth: string | null;
  isin_div_reinvestment: string | null;
  invalid_isin_note?: string | null;
  scheme_name: string;
  plan: string | null;
  option_name: string | null;
  nav: number;
  nav_date: string;
  amc: string;
  scheme_category_header: string;
  source: string;
}

export interface AmfiParseResult {
  records: ParsedAmfiNavRecord[];
  skippedLines: Array<{ lineNumber: number; raw: string; reason: string }>;
  detectedAmcs: string[];
  detectedCategories: string[];
  mojibakeFixedCount: number;
  invalidIsinCount: number;
  inferredAmcCount: number;
  ignoredNoiseLines: Array<{ lineNumber: number; raw: string }>;
}

export type InstrumentType = 'ETF' | 'INDEX_FUND' | 'FOF' | 'MUTUAL_FUND';
export type StructureType = 'Open Ended' | 'Close Ended' | 'Interval';
export type AssetClassType =
  | 'Equity'
  | 'Debt'
  | 'Hybrid'
  | 'Commodity'
  | 'Solution Oriented'
  | 'Life Cycle'
  | 'Other';
export type PlanType = 'Direct' | 'Regular' | 'Unspecified';
export type OptionType = 'Growth' | 'IDCW' | 'Bonus' | 'Unclaimed' | 'Unspecified';

export interface EnrichedAmfiCatalogRecord {
  scheme_code: string;
  isin: string | null;
  isin2: string | null;
  invalid_isin_note: string | null;
  scheme_name: string;
  amc: string;
  raw_category: string;
  structure: StructureType;
  instrument_type: InstrumentType;
  asset_class: AssetClassType;
  sub_category: string;
  plan_raw: string | null;
  option_raw: string | null;
  plan_type: PlanType;
  option_type: OptionType;
  nav: number;
  nav_date: string;
  is_active: number;
  is_segregated: number;
  is_zero_nav: number;
  is_redeemed_flag: number;
  fund_family_key: string;
}

const MOJIBAKE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  [/â€“/g, '-'],
  [/â€”/g, '-'],
  [/â€œ/g, '"'],
  [/â€\u009d/g, '"'],
  [/â€ /g, '"'],
  [/Â\u00a0/g, ' '],
  [/Â /g, ' '],
  [/Â/g, ''],
];

/**
 * Repairs Windows-1252/UTF-8 mojibake, collapses repeated whitespace,
 * and cleans orphaned trailing separators from AMFI scheme and category strings.
 */
export function sanitizeAmfiText(raw: string): { value: string; hadMojibake: boolean } {
  let value = raw;
  let hadMojibake = false;

  for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
    if (pattern.test(value)) {
      hadMojibake = true;
      value = value.replace(pattern, replacement);
    }
  }

  value = value
    .replace(/\u00a0/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\.{2,}$/g, '')
    .replace(/\s*-\s*$/g, '')
    .trim();

  return { value, hadMojibake };
}

/**
 * Validates standard 12-character ISIN strings (e.g. INF879O01027).
 * Non-ISIN placeholders like "Redeemed" or ticker strings are flagged rather than stored as ISINs.
 */
export function validateIsin(raw: string | null): { isin: string | null; invalidRaw: string | null } {
  if (!raw) return { isin: null, invalidRaw: null };
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned || cleaned === '-' || cleaned === 'N.A.' || cleaned === 'NA' || cleaned === 'NIL') {
    return { isin: null, invalidRaw: null };
  }
  if (/^IN[A-Z0-9]{10}$/.test(cleaned)) {
    return { isin: cleaned, invalidRaw: null };
  }
  return { isin: null, invalidRaw: raw.trim() };
}

const AMC_PREFIX_RULES: Array<[RegExp, string]> = [
  [/^(?:franklin\s+india|templeton\s+india)/i, 'Franklin Templeton Mutual Fund'],
  [/^icici\s+prudential/i, 'ICICI Prudential Mutual Fund'],
  [/^uti[\s-]/i, 'UTI Mutual Fund'],
  [/^hdfc\b/i, 'HDFC Mutual Fund'],
  [/^sbi\b/i, 'SBI Mutual Fund'],
  [/^(?:nippon\s+india|reliance\b)/i, 'Nippon India Mutual Fund'],
  [/^kotak\b/i, 'Kotak Mahindra Mutual Fund'],
  [/^(?:aditya\s+birla|absl\b|birla\s+sun)/i, 'Aditya Birla Sun Life Mutual Fund'],
  [/^axis\b/i, 'Axis Mutual Fund'],
  [/^(?:bandhan|idfc)\b/i, 'Bandhan Mutual Fund'],
  [/^(?:parag\s+parikh|ppfas)\b/i, 'PPFAS Mutual Fund'],
  [/^mirae\s+asset/i, 'Mirae Asset Mutual Fund'],
  [/^dsp\b/i, 'DSP Mutual Fund'],
  [/^tata\b/i, 'Tata Mutual Fund'],
  [/^canara\s+robeco/i, 'Canara Robeco Mutual Fund'],
  [/^hsbc\b/i, 'HSBC Mutual Fund'],
  [/^invesco\b/i, 'Invesco Mutual Fund'],
  [/^sundaram\b/i, 'Sundaram Mutual Fund'],
  [/^edelweiss\b/i, 'Edelweiss Mutual Fund'],
  [/^motilal\s+oswal/i, 'Motilal Oswal Mutual Fund'],
  [/^quant\b/i, 'quant Mutual Fund'],
  [/^quantum\b/i, 'Quantum Mutual Fund'],
  [/^mahindra\s+manulife/i, 'Mahindra Manulife Mutual Fund'],
  [/^pgim\s+india/i, 'PGIM India Mutual Fund'],
  [/^baroda\s+bnp/i, 'Baroda BNP Paribas Mutual Fund'],
  [/^union\b/i, 'Union Mutual Fund'],
  [/^lic\s+mf/i, 'LIC Mutual Fund'],
  [/^jm\b/i, 'JM Financial Mutual Fund'],
  [/^navi\b/i, 'Navi Mutual Fund'],
  [/^(?:360\s+one|iifl)\b/i, '360 ONE Mutual Fund'],
  [/^whiteoak/i, 'WhiteOak Capital Mutual Fund'],
  [/^groww\b/i, 'Groww Mutual Fund'],
  [/^zerodha\b/i, 'Zerodha Mutual Fund'],
  [/^bajaj\s+finserv/i, 'Bajaj Finserv Mutual Fund'],
  [/^helios\b/i, 'Helios Mutual Fund'],
  [/^old\s+bridge/i, 'Old Bridge Mutual Fund'],
  [/^samco\b/i, 'Samco Mutual Fund'],
  [/^shriram\b/i, 'Shriram Mutual Fund'],
  [/^taurus\b/i, 'Taurus Mutual Fund'],
  [/^trustmf\b/i, 'Trust Mutual Fund'],
  [/^nj\b/i, 'NJ Mutual Fund'],
  [/^iti\b/i, 'ITI Mutual Fund'],
  [/^bank\s+of\s+india/i, 'Bank of India Mutual Fund'],
  [/^il&fs/i, 'IL&FS Mutual Fund (IDF)'],
  [/^jio\s*blackrock/i, 'JioBlackRock Mutual Fund'],
  [/^unifi\b/i, 'Unifi Mutual Fund'],
  [/^angel\s+one/i, 'Angel One Mutual Fund'],
  [/^abakkus\b/i, 'Abakkus Mutual Fund'],
  [/^capitalmind\b/i, 'Capitalmind Mutual Fund'],
];

/**
 * Infers AMC name from scheme prefix when an AMFI file omits an explicit AMC header
 * directly after a scheme category header.
 */
export function inferAmcFromSchemeName(schemeName: string): string | null {
  const cleaned = schemeName.trim();
  for (const [pattern, amc] of AMC_PREFIX_RULES) {
    if (pattern.test(cleaned)) {
      return amc;
    }
  }
  return null;
}

/**
 * Converts AMFI dates such as "17-Apr-2019", "20-Nov-2026", or ISO "2026-11-20"
 * into normalized ISO YYYY-MM-DD strings.
 */
export function parseAmfiDateToIso(rawDate: string): string | null {
  const cleaned = rawDate.trim();
  if (!cleaned) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const m = cleaned.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{4})$/);
  if (!m) return null;

  const day = m[1].padStart(2, '0');
  const month = MONTH_MAP[m[2].toLowerCase()];
  const year = m[3];
  if (!month) return null;

  const dayNum = Number(day);
  if (dayNum < 1 || dayNum > 31) return null;

  return `${year}-${month}-${day}`;
}

function cleanOptionalField(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-' || trimmed === 'N.A.' || trimmed === 'NA') {
    return null;
  }
  return trimmed;
}

/**
 * Parses AMFI semicolon-delimited NAV text feeds.
 * Supports both 6-column classic AMFI format:
 *   Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
 * and 8-column extended AMFI format:
 *   Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date
 * Tracks stateful Category headers (e.g. "Interval Fund Schemes(Income)") and AMC headers,
 * repairs mojibake, validates ISINs, filters trailing UI noise, and infers missing AMC headers.
 */
export function parseAmfiNavText(rawText: string, source = 'AMFI_FEED'): AmfiParseResult {
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const records: ParsedAmfiNavRecord[] = [];
  const skippedLines: Array<{ lineNumber: number; raw: string; reason: string }> = [];
  const ignoredNoiseLines: Array<{ lineNumber: number; raw: string }> = [];
  const amcSet = new Set<string>();
  const categorySet = new Set<string>();

  let currentCategory = 'Uncategorized Schemes';
  let currentAmc = 'Unknown Mutual Fund';
  let amcSeenSinceCategory = false;
  let mojibakeFixedCount = 0;
  let invalidIsinCount = 0;
  let inferredAmcCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Skip header row
    if (rawLine.toLowerCase().startsWith('scheme code;')) {
      continue;
    }

    if (!rawLine.includes(';')) {
      // Ignore obvious non-header noise such as trailing UI artifacts (e.g. "✕Merlin")
      if (!/^[A-Za-z0-9]/.test(rawLine) || rawLine.length < 3) {
        ignoredNoiseLines.push({ lineNumber, raw: rawLine.slice(0, 80) });
        continue;
      }

      const sanitized = sanitizeAmfiText(rawLine);
      if (sanitized.hadMojibake) mojibakeFixedCount++;
      const line = sanitized.value;

      // Distinguish between Category/Scheme-Type header vs AMC header
      if (
        /\bschemes?\b/i.test(line) ||
        /\bopen ended\b/i.test(line) ||
        /\bclose ended\b/i.test(line) ||
        /\binterval fund\b/i.test(line)
      ) {
        currentCategory = line;
        amcSeenSinceCategory = false;
        categorySet.add(currentCategory);
      } else {
        currentAmc = line;
        amcSeenSinceCategory = true;
        amcSet.add(currentAmc);
      }
      continue;
    }

    const parts = rawLine.split(';');
    let schemeCode = '';
    let isin1Raw = '';
    let isin2Raw = '';
    let schemeName = '';
    let planRaw = '';
    let optionRaw = '';
    let navRaw = '';
    let dateRaw = '';

    if (parts.length >= 8) {
      [schemeCode, isin1Raw, isin2Raw, schemeName, planRaw, optionRaw, navRaw, dateRaw] = parts;
    } else if (parts.length === 6) {
      [schemeCode, isin1Raw, isin2Raw, schemeName, navRaw, dateRaw] = parts;
    } else {
      skippedLines.push({
        lineNumber,
        raw: rawLine.slice(0, 120),
        reason: `Expected 6 or 8 semicolon columns, found ${parts.length}`,
      });
      continue;
    }

    const normalizedCode = schemeCode.trim();
    const cleanedNameObj = sanitizeAmfiText(schemeName);
    if (cleanedNameObj.hadMojibake) mojibakeFixedCount++;
    const normalizedName = cleanedNameObj.value;
    const parsedNav = Number(navRaw.trim());
    const isoDate = parseAmfiDateToIso(dateRaw);

    if (!/^[A-Za-z0-9:_-]{1,32}$/.test(normalizedCode)) {
      skippedLines.push({ lineNumber, raw: rawLine.slice(0, 120), reason: 'Invalid scheme code' });
      continue;
    }
    if (!normalizedName) {
      skippedLines.push({ lineNumber, raw: rawLine.slice(0, 120), reason: 'Missing scheme name' });
      continue;
    }
    if (!Number.isFinite(parsedNav) || parsedNav < 0) {
      skippedLines.push({ lineNumber, raw: rawLine.slice(0, 120), reason: `Invalid NAV value "${navRaw.trim()}"` });
      continue;
    }
    if (!isoDate) {
      skippedLines.push({ lineNumber, raw: rawLine.slice(0, 120), reason: `Invalid date "${dateRaw.trim()}"` });
      continue;
    }

    let resolvedAmc = currentAmc;
    if (!amcSeenSinceCategory) {
      const inferred = inferAmcFromSchemeName(normalizedName);
      if (inferred) {
        resolvedAmc = inferred;
        inferredAmcCount++;
      }
    }

    const isin1Check = validateIsin(cleanOptionalField(isin1Raw));
    const isin2Check = validateIsin(cleanOptionalField(isin2Raw));
    const invalidNotes: string[] = [];
    if (isin1Check.invalidRaw) {
      invalidIsinCount++;
      invalidNotes.push(`ISIN1:${isin1Check.invalidRaw}`);
    }
    if (isin2Check.invalidRaw) {
      invalidIsinCount++;
      invalidNotes.push(`ISIN2:${isin2Check.invalidRaw}`);
    }

    amcSet.add(resolvedAmc);
    categorySet.add(currentCategory);

    records.push({
      scheme_code: normalizedCode,
      isin_div_payout_growth: isin1Check.isin,
      isin_div_reinvestment: isin2Check.isin,
      invalid_isin_note: invalidNotes.length > 0 ? invalidNotes.join('; ') : null,
      scheme_name: normalizedName,
      plan: cleanOptionalField(planRaw),
      option_name: cleanOptionalField(optionRaw),
      nav: parsedNav,
      nav_date: isoDate,
      amc: resolvedAmc,
      scheme_category_header: currentCategory,
      source,
    });
  }

  return {
    records,
    skippedLines,
    detectedAmcs: Array.from(amcSet),
    detectedCategories: Array.from(categorySet),
    mojibakeFixedCount,
    invalidIsinCount,
    inferredAmcCount,
    ignoredNoiseLines,
  };
}

function detectStructure(rawCategory: string): StructureType {
  if (/close\s+ended/i.test(rawCategory)) return 'Close Ended';
  if (/interval/i.test(rawCategory)) return 'Interval';
  return 'Open Ended';
}

function detectInstrumentType(rawCategory: string, schemeName: string): InstrumentType {
  const combined = `${rawCategory} ${schemeName}`;
  const isFof = /\b(fof|fofs|fund\s+of\s+funds?)\b/i.test(combined);
  if (isFof) return 'FOF';

  const isEtf =
    /\b(etf|etfs)\b/i.test(combined) ||
    /exchange\s+traded\s+fund/i.test(combined) ||
    /\bbees\b/i.test(schemeName);
  if (isEtf) return 'ETF';

  if (/\bindex\s+funds?\b/i.test(combined) || /\bindex\s+schemes?\b/i.test(combined)) {
    return 'INDEX_FUND';
  }

  return 'MUTUAL_FUND';
}

function detectAssetClass(rawCategory: string, schemeName: string, instrumentType: InstrumentType): AssetClassType {
  const cat = rawCategory.toLowerCase();
  const name = schemeName.toLowerCase();
  const combined = `${cat} ${name}`;

  if (/\blife\s*cycle\b/i.test(combined)) return 'Life Cycle';
  if (/\bsolution\s+oriented\b|\bchildren'?s?\s+fund\b|\bretirement\b/i.test(combined)) {
    return 'Solution Oriented';
  }
  if (
    (instrumentType === 'ETF' || instrumentType === 'FOF') &&
    /\b(gold|silver|commodit)/i.test(combined)
  ) {
    return 'Commodity';
  }
  if (/\bgold\s+etf\b|\bsilver\s+etf\b|\bcommodity\b/i.test(combined)) {
    return 'Commodity';
  }
  if (
    /\bhybrid\b|\bbalanced\b|\barbitrage\b|\bequity\s+savings\b|\bmulti\s+asset\b|\bdual\s+advantage\b|\bcapital\s+protection\b|\bdynamic\s+asset\s+allocation\b/i.test(
      combined
    )
  ) {
    return 'Hybrid';
  }
  if (
    /\bdebt\b|\bincome\b|\bgilt\b|\bliquid\b|\bovernight\b|\bmoney\s+market\b|\bbond\b|\bcredit\s+risk\b|\bfloater\b|\bfloating\s+rate\b|\binterval\b|\bfmp\b|\bfixed\s+term\b|\bfixed\s+maturity\b|\btarget\s+maturity\b|\bshort\s+duration\b|\bmedium\s+duration\b|\blong\s+duration\b|\blow\s+duration\b|\bultra\s+short\b|\bbanking\s*(?:&|and)\s*psu\b|\btreasury\b|\bsdl\b|\bg-sec\b|\bconstant\s+maturity\b|\b1d\s+rate\b/i.test(
      combined
    )
  ) {
    return 'Debt';
  }
  if (
    /\bequity\b|\belss\b|\blarge\s+cap\b|\bmid\s+cap\b|\bsmall\s+cap\b|\bflexi\s+cap\b|\bmulti\s+cap\b|\bfocused\b|\bvalue\b|\bcontra\b|\bdividend\s+yield\b|\bsectoral\b|\bthematic\b|\bgrowth\b|\bnifty\b|\bsensex\b|\bbse\b|\bnasdaq\b|\bfang\b|\bs&p\s*500\b|\bhang\s+seng\b|\bmsci\b|\boverseas\b|\bglobal\b|\binternational\b|\bindex\b/i.test(
      combined
    )
  ) {
    return 'Equity';
  }
  return 'Other';
}

function canonicalizeSubCategory(
  rawCategory: string,
  schemeName: string,
  instrumentType: InstrumentType,
  structure: StructureType
): string {
  const innerMatch = rawCategory.match(/\((.*)\)/);
  const inner = (innerMatch ? innerMatch[1] : rawCategory).trim();
  const combined = `${inner} ${schemeName}`.toLowerCase();

  if (instrumentType === 'ETF') {
    if (/\bgold\b/.test(combined)) return 'Gold ETF';
    if (/\bsilver\b/.test(combined)) return 'Silver ETF';
    if (/\b(gilt|liquid|1d\s+rate|bond|sdl|g-sec|debt|overnight|money\s+market)\b/.test(combined)) {
      return 'Debt / Liquid ETF';
    }
    if (/\b(nasdaq|fang|s&p\s*500|hang\s+seng|global|overseas|international|msci)\b/.test(combined)) {
      return 'International ETF';
    }
    return 'Equity ETF';
  }

  if (instrumentType === 'FOF') {
    if (/\b(gold|silver)\b/.test(combined)) return 'Gold / Silver FoF';
    if (/\b(overseas|global|international|us\b|nasdaq|europe|china|japan|world|emerging|feeder)\b/.test(combined)) {
      return 'Overseas FoF';
    }
    return 'Domestic FoF';
  }

  if (instrumentType === 'INDEX_FUND') {
    if (/\b(sdl|g-sec|gilt|crisil|ibx|bond|debt|target\s+maturity)\b/.test(combined)) {
      return 'Target Maturity / Debt Index Fund';
    }
    return 'Equity Index Fund';
  }

  const dashSplit = inner.split(/\s+-\s+/);
  const tail = (dashSplit.length > 1 ? dashSplit[dashSplit.length - 1] : inner).trim();
  const tailLower = tail.toLowerCase();

  if (/flexi\s*cap/.test(tailLower)) return 'Flexi Cap Fund';
  if (/large\s*(?:&|and)\s*mid\s*cap/.test(tailLower)) return 'Large & Mid Cap Fund';
  if (/large\s*cap/.test(tailLower)) return 'Large Cap Fund';
  if (/mid\s*cap/.test(tailLower)) return 'Mid Cap Fund';
  if (/small\s*cap/.test(tailLower)) return 'Small Cap Fund';
  if (/multi\s*cap/.test(tailLower)) return 'Multi Cap Fund';
  if (/focused/.test(tailLower)) return 'Focused Fund';
  if (/elss/.test(tailLower)) return 'ELSS (Tax Saver)';
  if (/value|contra/.test(tailLower)) return 'Value / Contra Fund';
  if (/dividend\s+yield/.test(tailLower)) return 'Dividend Yield Fund';
  if (/sectoral|thematic/.test(tailLower)) return 'Sectoral / Thematic';

  if (/overnight/.test(tailLower)) return 'Overnight Fund';
  if (/liquid/.test(tailLower)) return 'Liquid Fund';
  if (/ultra\s*short/.test(tailLower)) return 'Ultra Short Duration';
  if (/low\s*duration/.test(tailLower)) return 'Low Duration';
  if (/money\s*market/.test(tailLower)) return 'Money Market Fund';
  if (/short\s*duration/.test(tailLower)) return 'Short Duration';
  if (/medium\s+to\s+long/.test(tailLower)) return 'Medium to Long Duration';
  if (/medium\s*duration/.test(tailLower)) return 'Medium Duration';
  if (/long\s*duration/.test(tailLower)) return 'Long Duration';
  if (/dynamic\s*bond/.test(tailLower)) return 'Dynamic Bond Fund';
  if (/corporate\s*bond/.test(tailLower)) return 'Corporate Bond Fund';
  if (/credit\s*risk/.test(tailLower)) return 'Credit Risk Fund';
  if (/banking\s*(?:&|and)\s*psu/.test(tailLower)) return 'Banking & PSU Fund';
  if (/10\s*year\s*constant\s*maturity/.test(tailLower)) return 'Gilt (10Y Constant Maturity)';
  if (/gilt/.test(tailLower)) return 'Gilt Fund';
  if (/floater|floating/.test(tailLower)) return 'Floater Fund';

  if (/aggressive\s+hybrid/.test(tailLower)) return 'Aggressive Hybrid Fund';
  if (/conservative\s+hybrid/.test(tailLower)) return 'Conservative Hybrid Fund';
  if (/balanced\s+advantage|dynamic\s+asset/.test(tailLower)) return 'Balanced Advantage Fund';
  if (/balanced\s+hybrid/.test(tailLower)) return 'Balanced Hybrid Fund';
  if (/multi\s+asset/.test(tailLower)) return 'Multi Asset Allocation';
  if (/arbitrage/.test(tailLower)) return 'Arbitrage Fund';
  if (/equity\s+savings/.test(tailLower)) return 'Equity Savings Fund';

  if (/children/.test(tailLower)) return "Children's Fund";
  if (/retirement/.test(tailLower)) return 'Retirement Fund';
  if (/life\s*cycle/.test(tailLower)) return 'Life Cycle Fund';

  if (structure === 'Interval') return 'Interval Debt Scheme';
  if (structure === 'Close Ended') {
    if (/income|debt/.test(tailLower) || /\bfmp\b|\bfixed\s+term\b/i.test(schemeName)) {
      return 'Close-Ended Debt / FMP';
    }
    if (/equity|growth|elss/.test(tailLower)) {
      return 'Close-Ended Equity';
    }
  }

  return tail || 'Other Mutual Fund';
}

function detectPlanType(planRaw: string | null, optionRaw: string | null, schemeName: string): PlanType {
  const joined = `${planRaw || ''} ${optionRaw || ''} ${schemeName}`;
  if (/\bdirect\b/i.test(joined)) return 'Direct';
  if (/\bregular\b/i.test(joined)) return 'Regular';
  return 'Unspecified';
}

function detectOptionType(optionRaw: string | null, schemeName: string): OptionType {
  const joined = `${optionRaw || ''} ${schemeName}`;
  if (/\bunclaimed\b/i.test(joined)) return 'Unclaimed';
  if (/\bbonus\b/i.test(joined)) return 'Bonus';
  if (/\b(idcw|dividend|payout|reinvest|income\s+distribution)\b/i.test(joined)) return 'IDCW';
  if (/\b(growth|cumulative)\b/i.test(joined)) return 'Growth';
  return 'Unspecified';
}

/**
 * Computes a stable canonical fund-family key so all share classes (Direct Growth,
 * Regular Growth, Monthly/Annual IDCW, Bonus, etc.) of the same scheme group together.
 */
export function normalizeFundFamilyKey(amc: string, schemeName: string): string {
  let base = schemeName
    .replace(/\((?:erstwhile|formerly|no\.?\s*of\s*segregated)[^)]*\)/gi, ' ')
    .replace(/\b(?:direct|regular|retail|institutional|wholesale|super\s+institutional)\s*plan\b/gi, ' ')
    .replace(/\b(?:direct|regular)\b(?=\s*[-–/]|$)/gi, ' ')
    .replace(
      /\b(?:monthly|quarterly|half[\s-]*yearly|semi[\s-]*annual|annual|weekly|daily|fortnightly|adhoc)?\s*(?:idcw|dividend|income\s+distribution(?:\s+cum\s+capital\s+withdrawal)?)\s*(?:payout|reinvestment|transfer|option|plan|sub[\s-]*option)*\b/gi,
      ' '
    )
    .replace(/\b(?:growth|cumulative|bonus)\s*(?:option|plan)?\b/gi, ' ')
    .replace(/\b(?:payout|reinvestment)\s*(?:option|of\s+idcw)?\b/gi, ' ')
    .replace(/\b(?:option|plan)\b\s*$/gi, ' ')
    .replace(/[-–/|,:]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toLowerCase();

  if (!base) {
    base = schemeName.trim().toLowerCase();
  }

  const normAmc = amc
    .toLowerCase()
    .replace(/\bmutual\s+fund\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return `${normAmc}::${base}`;
}

/**
 * Classifies a parsed AMFI record into a normalized Fund Terminal catalog row
 * with instrument type, asset class, canonical SEBI sub-category, plan/option,
 * active/segregated/zero-NAV flags, and fund family grouping key.
 */
export function classifyAmfiRecord(
  record: ParsedAmfiNavRecord,
  activeCutoffDate = '2026-11-01'
): EnrichedAmfiCatalogRecord {
  const structure = detectStructure(record.scheme_category_header);
  const instrumentType = detectInstrumentType(record.scheme_category_header, record.scheme_name);
  const assetClass = detectAssetClass(record.scheme_category_header, record.scheme_name, instrumentType);
  const subCategory = canonicalizeSubCategory(
    record.scheme_category_header,
    record.scheme_name,
    instrumentType,
    structure
  );
  const planType = detectPlanType(record.plan, record.option_name, record.scheme_name);
  const optionType = detectOptionType(record.option_name, record.scheme_name);
  const isSegregated = /segregated/i.test(record.scheme_name) ? 1 : 0;
  const isRedeemedFlag =
    record.invalid_isin_note && /redeemed/i.test(record.invalid_isin_note) ? 1 : 0;
  const isZeroNav = record.nav <= 0 ? 1 : 0;
  const isActive =
    record.nav_date >= activeCutoffDate && record.nav > 0 && isRedeemedFlag === 0 ? 1 : 0;
  const fundFamilyKey = normalizeFundFamilyKey(record.amc, record.scheme_name);

  return {
    scheme_code: record.scheme_code,
    isin: record.isin_div_payout_growth,
    isin2: record.isin_div_reinvestment,
    invalid_isin_note: record.invalid_isin_note ?? null,
    scheme_name: record.scheme_name,
    amc: record.amc,
    raw_category: record.scheme_category_header,
    structure,
    instrument_type: instrumentType,
    asset_class: assetClass,
    sub_category: subCategory,
    plan_raw: record.plan,
    option_raw: record.option_name,
    plan_type: planType,
    option_type: optionType,
    nav: record.nav,
    nav_date: record.nav_date,
    is_active: isActive,
    is_segregated: isSegregated,
    is_zero_nav: isZeroNav,
    is_redeemed_flag: isRedeemedFlag,
    fund_family_key: fundFamilyKey,
  };
}

/**
 * RFC-4180 compliant CSV parser that safely handles multi-line quoted fields,
 * escaped quotes (""), and UTF-8 BOM headers.
 */
export function parseCsvRows(rawCsv: string): { headers: string[]; rows: string[][] } {
  const input = rawCsv.charCodeAt(0) === 0xfeff ? rawCsv.slice(1) : rawCsv;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (ch === '\r') {
      if (i + 1 < input.length && input[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.length > 1 || currentRow[0] !== '') {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField);
      if (currentRow.length > 1 || currentRow[0] !== '') {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || currentRow[0] !== '') {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  return { headers, rows: rows.slice(1) };
}

export function parseNullableFloat(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function parseNullableInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number.parseInt(trimmed, 10);
  return Number.isFinite(num) ? num : null;
}

export function parseBoolFlag(raw: string | undefined): number {
  if (!raw) return 0;
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' ? 1 : 0;
}

const FORBIDDEN_SQL_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE|ATTACH|DETACH|VACUUM|REINDEX|PRAGMA|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|LOAD_EXTENSION)\b/i,
];

/**
 * Validates that a user-submitted SQL query is strictly a single read-only
 * SELECT / WITH / EXPLAIN query safe for execution on a read-only SQLite handle.
 */
export function validateReadOnlySql(rawSql: string): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = rawSql.trim();
  if (!trimmed) {
    return { valid: false, error: 'SQL query cannot be empty.' };
  }
  if (trimmed.length > 12000) {
    return { valid: false, error: 'SQL query exceeds maximum allowed length (12,000 characters).' };
  }

  // Strip SQL comments for inspection
  const withoutBlockComments = trimmed.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const withoutLineComments = withoutBlockComments.replace(/--[^\n]*/g, ' ').trim();

  if (!withoutLineComments) {
    return { valid: false, error: 'SQL query contains only comments.' };
  }

  // Remove a single optional trailing semicolon
  const withoutTrailingSemi = withoutLineComments.replace(/;\s*$/, '').trim();

  // Reject multiple statements (any remaining semicolon outside single quotes)
  const strippedStrings = withoutTrailingSemi.replace(/'(?:''|[^'])*'/g, "''");
  if (strippedStrings.includes(';')) {
    return { valid: false, error: 'Only a single SQL statement is permitted per execution.' };
  }

  if (!/^(SELECT|WITH|EXPLAIN)\b/i.test(strippedStrings)) {
    return {
      valid: false,
      error: 'Only read-only SELECT, WITH (CTE), or EXPLAIN queries are permitted in SQL Workbench.',
    };
  }

  for (const pattern of FORBIDDEN_SQL_PATTERNS) {
    if (pattern.test(strippedStrings)) {
      const match = strippedStrings.match(pattern);
      return {
        valid: false,
        error: `Keyword "${match?.[0]?.toUpperCase()}" is blocked in read-only SQL Workbench.`,
      };
    }
  }

  return { valid: true, normalized: trimmed.replace(/;\s*$/, '') };
}

export function formatCsvExport(columns: string[], rows: Record<string, unknown>[]): string {
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerLine = columns.map(escapeCell).join(',');
  const dataLines = rows.map((row) => columns.map((col) => escapeCell(row[col])).join(','));
  return [headerLine, ...dataLines].join('\n');
}
