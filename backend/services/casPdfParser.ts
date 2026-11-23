import crypto from 'crypto';
import Decimal from 'decimal.js';
import {
  AssetClassBucket,
  LedgerTransaction,
  LedgerTransactionSchema,
  LedgerTxType,
} from '../../frontend/features/portfolio/portfolioLedgerEngine.ts';
import { SCREENER_FUNDS } from '../../frontend/utils/screenerEngine.ts';

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export type CasDepositoryProvider =
  | 'NSDL_CAS'
  | 'CDSL_CAS'
  | 'CAMS_KFINTECH_CAS'
  | 'GENERIC_CAS';

export interface CasSchemeResolverMatch {
  symbol: string;
  schemeName: string;
  assetClass: AssetClassBucket;
  currency?: 'INR' | 'USD';
}

export type CasSchemeResolver = (
  isin: string | null,
  rawSchemeName: string
) => CasSchemeResolverMatch | null;

export interface CasStatementMetadata {
  provider: CasDepositoryProvider;
  statementPeriod: {
    from: string | null;
    to: string | null;
  };
  investorName: string | null;
  maskedPan: string | null;
  maskedAccountId: string | null;
  pageCount: number;
  fileSha256: string;
}

export interface CasFolioReconciliation {
  folioMasked: string;
  amc: string;
  isin: string;
  symbol: string;
  schemeName: string;
  assetClass: AssetClassBucket;
  openingUnits: string | null;
  computedClosingUnits: string;
  statementClosingUnits: string | null;
  unitDrift: string | null;
  status: 'MATCHED' | 'DRIFT' | 'UNVERIFIED';
  transactionCount: number;
}

export interface CasParseWarning {
  page: number;
  line: string;
  reason: string;
}

export interface CasParseResult {
  statementMeta: CasStatementMetadata;
  transactions: LedgerTransaction[];
  reconciliation: {
    totalFolios: number;
    matchedFolios: number;
    driftFolios: number;
    unverifiedFolios: number;
    stampDutyTotal: string;
    sttTotal: string;
    folios: CasFolioReconciliation[];
  };
  warnings: CasParseWarning[];
  skippedAdminRows: number;
  parsedAtUtc: string;
}

export class CasPdfPasswordError extends Error {
  public readonly code: 'PASSWORD_REQUIRED' | 'INCORRECT_PASSWORD';

  constructor(code: 'PASSWORD_REQUIRED' | 'INCORRECT_PASSWORD', message: string) {
    super(message);
    this.name = 'CasPdfPasswordError';
    this.code = code;
  }
}

export class CasPdfFormatError extends Error {
  public readonly code: 'INVALID_PDF' | 'FILE_TOO_LARGE' | 'NO_TEXT_CONTENT';

  constructor(code: 'INVALID_PDF' | 'FILE_TOO_LARGE' | 'NO_TEXT_CONTENT', message: string) {
    super(message);
    this.name = 'CasPdfFormatError';
    this.code = code;
  }
}

export interface ExtractedPdfPage {
  pageNumber: number;
  lines: string[];
}

export const MAX_CAS_PDF_BYTES = 10 * 1024 * 1024; // 10 MB hard cap

const PDF_MAGIC_BYTES = Buffer.from('%PDF-', 'ascii');

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
  sept: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/**
 * Curated canonical Indian AMFI & Exchange ISIN map for instant, deterministic
 * symbol resolution even before consulting the dynamic SQLite catalog.
 */
const CANONICAL_ISIN_CATALOG: Record<string, CasSchemeResolverMatch> = {
  INF879O01027: {
    symbol: 'PPFAS',
    schemeName: 'Parag Parikh Flexi Cap Fund Direct Growth',
    assetClass: 'Equity',
  },
  INF879O01019: {
    symbol: 'PPFAS',
    schemeName: 'Parag Parikh Flexi Cap Fund Regular Growth',
    assetClass: 'Equity',
  },
  INF179K01XQ0: {
    symbol: 'HDFCMID',
    schemeName: 'HDFC Mid-Cap Opportunities Fund Direct Growth',
    assetClass: 'Equity',
  },
  INF179K01CR2: {
    symbol: 'HDFCMID',
    schemeName: 'HDFC Mid-Cap Opportunities Fund Regular Growth',
    assetClass: 'Equity',
  },
  INF966L01689: {
    symbol: 'QUANTSC',
    schemeName: 'Quant Small Cap Fund Direct Growth',
    assetClass: 'Equity',
  },
  INF789F01XA0: {
    symbol: 'UTI50',
    schemeName: 'UTI Nifty 50 Index Fund Direct Growth',
    assetClass: 'Equity',
  },
  INF204KB14I2: {
    symbol: 'NIFTYBEES',
    schemeName: 'Nippon India ETF Nifty 50 BeES',
    assetClass: 'Equity',
  },
  INF204KB17I5: {
    symbol: 'GOLDBEES',
    schemeName: 'Nippon India ETF Gold BeES',
    assetClass: 'Gold',
  },
  INF204KB15I9: {
    symbol: 'JUNIORBEES',
    schemeName: 'Nippon India ETF Nifty Next 50 Junior BeES',
    assetClass: 'Equity',
  },
  INF204KB16I7: {
    symbol: 'BANKBEES',
    schemeName: 'Nippon India ETF Nifty Bank BeES',
    assetClass: 'Equity',
  },
  INF179KB1HU9: {
    symbol: 'HDFCLIQ',
    schemeName: 'HDFC Liquid Fund Direct Growth',
    assetClass: 'Debt',
  },
  INF200K01UT4: {
    symbol: 'SBIGILT',
    schemeName: 'SBI Magnum Gilt Fund Direct Growth',
    assetClass: 'Debt',
  },
  INF109K01Z48: {
    symbol: 'ICICIBAF',
    schemeName: 'ICICI Prudential Balanced Advantage Fund Direct Growth',
    assetClass: 'Hybrid',
  },
  INF209K01UN8: {
    symbol: 'ABSLCORP',
    schemeName: 'Aditya Birla Sun Life Corporate Bond Fund Direct Growth',
    assetClass: 'Debt',
  },
  INF846K01DP8: {
    symbol: 'AXISBLUE',
    schemeName: 'Axis Bluechip Fund Direct Growth',
    assetClass: 'Equity',
  },
  INF769K01EI1: {
    symbol: 'MIRAELC',
    schemeName: 'Mirae Asset Large Cap Fund Direct Growth',
    assetClass: 'Equity',
  },
  INF174K01LS2: {
    symbol: 'KOTAKFLEX',
    schemeName: 'Kotak Flexicap Fund Direct Growth',
    assetClass: 'Equity',
  },
  INF200KA1FS1: {
    symbol: 'SBICONTR',
    schemeName: 'SBI Contra Fund Direct Growth',
    assetClass: 'Equity',
  },
  INF204K01UN9: {
    symbol: 'NIPSMALL',
    schemeName: 'Nippon India Small Cap Fund Direct Growth',
    assetClass: 'Equity',
  },
};

export function maskPan(rawPan: string): string {
  const clean = rawPan.trim().toUpperCase();
  if (clean.length < 4) return '******';
  return `${'*'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

export function maskIdentifier(rawId: string): string {
  const clean = rawId.replace(/\s+/g, '').trim();
  if (clean.length <= 4) return '****';
  return `${'*'.repeat(Math.min(8, clean.length - 4))}${clean.slice(-4)}`;
}

/**
 * Parses Indian & ISO date formats into canonical YYYY-MM-DD.
 * Supports: DD-MMM-YYYY (15-Jan-2025), DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY.
 */
export function parseCasDateToIso(raw: string): string | null {
  const trimmed = raw.trim();

  // YYYY-MM-DD
  const iso = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return validateCalendarIso(Number(y), Number(m), Number(d));
  }

  // DD-MMM-YYYY or DD MMM YYYY (standard NSDL / CDSL / CAMS format)
  const dmyAlpha = trimmed.match(/^(\d{1,2})[-\s/]([A-Za-z]{3,4})[-\s/](\d{2,4})$/);
  if (dmyAlpha) {
    const day = Number(dmyAlpha[1]);
    const monthStr = MONTH_MAP[dmyAlpha[2].toLowerCase()];
    const rawYear = Number(dmyAlpha[3]);
    const year = rawYear < 100 ? (rawYear >= 70 ? 1900 + rawYear : 2000 + rawYear) : rawYear;
    if (!monthStr) return null;
    return validateCalendarIso(year, Number(monthStr), day);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyNum = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyNum) {
    const [, d, m, y] = dmyNum;
    return validateCalendarIso(Number(y), Number(m), Number(d));
  }

  return null;
}

function validateCalendarIso(year: number, month: number, day: number): string | null {
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parses Indian lakh-comma or standard decimal numbers, including parenthesized
 * negatives like `(15,000.00)` or `(120.5000)`, strictly into Decimal.js.
 */
export function parseCasDecimalToken(rawToken: string): Decimal | null {
  const trimmed = rawToken.trim();
  if (!trimmed) return null;

  let isNegative = false;
  let body = trimmed;

  if (body.startsWith('(') && body.endsWith(')')) {
    isNegative = true;
    body = body.slice(1, -1).trim();
  }
  if (body.startsWith('-')) {
    isNegative = true;
    body = body.slice(1).trim();
  } else if (body.startsWith('+')) {
    body = body.slice(1).trim();
  }

  // Strip currency glyphs (₹, Rs., INR) and thousand/lakh commas
  body = body.replace(/^(?:₹|Rs\.?|INR)\s*/i, '').replace(/,/g, '');

  if (!/^\d+(?:\.\d+)?$/.test(body)) {
    return null;
  }

  try {
    const d = new Decimal(body);
    return isNegative ? d.negated() : d;
  } catch {
    return null;
  }
}

export function inferAssetClassFromScheme(schemeName: string, isin: string | null): AssetClassBucket {
  const lower = schemeName.toLowerCase();
  if (
    lower.includes('nasdaq') ||
    lower.includes('s&p 500') ||
    lower.includes('spdr') ||
    lower.includes('global') ||
    lower.includes('international') ||
    lower.includes('us equity') ||
    lower.includes('fang+')
  ) {
    return 'Global ETF';
  }
  if (
    lower.includes('gold') ||
    lower.includes('silver') ||
    lower.includes('bullion') ||
    lower.includes('sovereign gold') ||
    lower.includes('sgb')
  ) {
    return 'Gold';
  }
  if (
    lower.includes('liquid') ||
    lower.includes('overnight') ||
    lower.includes('gilt') ||
    lower.includes('bond') ||
    lower.includes('debt') ||
    lower.includes('money market') ||
    lower.includes('short duration') ||
    lower.includes('ultra short') ||
    lower.includes('floater') ||
    lower.includes('treasury') ||
    lower.includes('banking & psu') ||
    lower.includes('credit risk') ||
    (isin && isin.startsWith('IN00'))
  ) {
    return 'Debt';
  }
  if (
    lower.includes('hybrid') ||
    lower.includes('balanced') ||
    lower.includes('multi asset') ||
    lower.includes('arbitrage') ||
    lower.includes('equity savings') ||
    lower.includes('dynamic asset')
  ) {
    return 'Hybrid';
  }
  return 'Equity';
}

function buildCompactSymbol(schemeName: string, isin: string | null): string {
  const cleanWords = schemeName
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 0 &&
        ![
          'fund',
          'direct',
          'regular',
          'plan',
          'growth',
          'option',
          'mutual',
          'scheme',
          'idcw',
          'reinvestment',
          'payout',
          'the',
          'of',
          'and',
          'for',
        ].includes(w.toLowerCase())
    );

  if (cleanWords.length >= 2) {
    const derived = cleanWords
      .slice(0, 3)
      .map((w) => w.slice(0, 4).toUpperCase())
      .join('')
      .slice(0, 12);
    if (/^[A-Za-z0-9._\-^]{2,32}$/.test(derived)) {
      return derived;
    }
  }
  if (isin && /^[A-Z0-9]{12}$/.test(isin)) {
    return isin;
  }
  const fallback = schemeName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
  return fallback || 'MFHOLDING';
}

function resolveSchemeIdentity(
  isin: string | null,
  rawSchemeName: string,
  externalResolver?: CasSchemeResolver
): CasSchemeResolverMatch {
  const normalizedIsin = isin ? isin.trim().toUpperCase() : null;
  if (normalizedIsin && CANONICAL_ISIN_CATALOG[normalizedIsin]) {
    return CANONICAL_ISIN_CATALOG[normalizedIsin];
  }

  if (externalResolver) {
    const ext = externalResolver(normalizedIsin, rawSchemeName);
    if (ext) return ext;
  }

  // Secondary match against curated Screener Universe by name tokens
  const lowerScheme = rawSchemeName.toLowerCase();
  const matchedScreener = SCREENER_FUNDS.find((f) => {
    const target = f.name.toLowerCase();
    return (
      lowerScheme.includes(target.slice(0, Math.min(20, target.length))) ||
      target.includes(lowerScheme.slice(0, Math.min(20, lowerScheme.length)))
    );
  });
  if (matchedScreener) {
    return {
      symbol: matchedScreener.symbol.toUpperCase(),
      schemeName: rawSchemeName.trim() || matchedScreener.name,
      assetClass: inferAssetClassFromScheme(rawSchemeName || matchedScreener.name, normalizedIsin),
      currency: matchedScreener.currency === 'USD' ? 'USD' : 'INR',
    };
  }

  const cleanName = rawSchemeName.trim().slice(0, 160) || normalizedIsin || 'Mutual Fund Scheme';
  return {
    symbol: buildCompactSymbol(cleanName, normalizedIsin),
    schemeName: cleanName,
    assetClass: inferAssetClassFromScheme(cleanName, normalizedIsin),
    currency: 'INR',
  };
}

function classifyCasDescription(
  description: string,
  signedUnits: Decimal,
  signedAmount: Decimal
): {
  kind: 'TX' | 'STAMP_DUTY' | 'STT' | 'ADMIN';
  txType?: LedgerTxType;
} {
  const lower = description.toLowerCase();

  if (lower.includes('stamp duty') || lower.includes('stampduty')) {
    return { kind: 'STAMP_DUTY' };
  }
  if (
    lower.includes('stt paid') ||
    lower.includes('securities transaction tax') ||
    /\bstt\b/.test(lower)
  ) {
    return { kind: 'STT' };
  }
  if (
    lower.includes('opening balance') ||
    lower.includes('opening unit balance') ||
    lower.includes('closing balance') ||
    lower.includes('closing unit balance') ||
    lower.includes('address updated') ||
    lower.includes('nominee') ||
    lower.includes('kyc') ||
    lower.includes('bank mandate') ||
    lower.includes('registration of') ||
    lower.includes('tax deducted') ||
    lower.includes('tds') ||
    lower.includes('exit load') ||
    lower.includes('gross dividend') ||
    lower.includes('change of') ||
    lower.includes('pledge') ||
    lower.includes('unpledge') ||
    lower.includes('freeze') ||
    lower.includes('total')
  ) {
    return { kind: 'ADMIN' };
  }

  if (
    lower.includes('switch in') ||
    lower.includes('switch-in') ||
    lower.includes('stp in') ||
    lower.includes('stp-in') ||
    lower.includes('systematic transfer in')
  ) {
    return { kind: 'TX', txType: 'SWITCH_IN' };
  }

  if (
    lower.includes('switch out') ||
    lower.includes('switch-out') ||
    lower.includes('stp out') ||
    lower.includes('stp-out') ||
    lower.includes('systematic transfer out')
  ) {
    return { kind: 'TX', txType: 'SWITCH_OUT' };
  }

  if (
    lower.includes('sip') ||
    lower.includes('systematic investment') ||
    lower.includes('auto debit')
  ) {
    return { kind: 'TX', txType: 'SIP' };
  }

  if (
    lower.includes('idcw') ||
    lower.includes('dividend') ||
    lower.includes('reinvestment')
  ) {
    return { kind: 'TX', txType: 'DIVIDEND' };
  }

  if (
    lower.includes('redemption') ||
    lower.includes('redeem') ||
    lower.includes('swp') ||
    lower.includes('systematic withdrawal') ||
    lower.includes('sell') ||
    lower.includes('debit') ||
    lower.includes('lateral shift out') ||
    lower.includes('merger out') ||
    signedUnits.isNegative() ||
    signedAmount.isNegative()
  ) {
    return { kind: 'TX', txType: 'SELL' };
  }

  if (
    lower.includes('purchase') ||
    lower.includes('buy') ||
    lower.includes('allotment') ||
    lower.includes('nfo') ||
    lower.includes('credit') ||
    lower.includes('bonus') ||
    lower.includes('merger in') ||
    lower.includes('lateral shift in') ||
    signedUnits.gt(0)
  ) {
    return { kind: 'TX', txType: 'BUY' };
  }

  return { kind: 'ADMIN' };
}

function detectDepositoryProvider(fullText: string): CasDepositoryProvider {
  const upper = fullText.toUpperCase();
  if (
    upper.includes('NATIONAL SECURITIES DEPOSITORY') ||
    upper.includes('NSDL CONSOLIDATED ACCOUNT STATEMENT') ||
    upper.includes('NSDL CAS') ||
    (upper.includes('DP ID') && upper.includes('CLIENT ID'))
  ) {
    return 'NSDL_CAS';
  }
  if (
    upper.includes('CENTRAL DEPOSITORY SERVICES') ||
    upper.includes('CDSL CONSOLIDATED ACCOUNT STATEMENT') ||
    upper.includes('CDSL CAS') ||
    upper.includes('BO ID')
  ) {
    return 'CDSL_CAS';
  }
  if (
    upper.includes('CAMS') ||
    upper.includes('KFINTECH') ||
    upper.includes('MFCENTRAL') ||
    upper.includes('CONSOLIDATED ACCOUNT SUMMARY')
  ) {
    return 'CAMS_KFINTECH_CAS';
  }
  return 'GENERIC_CAS';
}

/**
 * Validates PDF header bytes and extracts coordinate-reconstructed text lines
 * from every page using pdfjs-dist (supports password-protected CAS PDFs).
 */
export async function extractPdfPagesFromBuffer(
  pdfBuffer: Buffer,
  password?: string
): Promise<ExtractedPdfPage[]> {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 8) {
    throw new CasPdfFormatError('INVALID_PDF', 'Uploaded file is empty or not a valid PDF.');
  }
  if (pdfBuffer.length > MAX_CAS_PDF_BYTES) {
    throw new CasPdfFormatError(
      'FILE_TOO_LARGE',
      'CAS PDF exceeds the 10 MB maximum file size limit.'
    );
  }

  // Some PDFs have minor leading whitespace/BOM before %PDF-; scan first 1024 bytes
  const headerSlice = pdfBuffer.subarray(0, Math.min(1024, pdfBuffer.length));
  if (headerSlice.indexOf(PDF_MAGIC_BYTES) === -1) {
    throw new CasPdfFormatError(
      'INVALID_PDF',
      'File signature does not match a valid PDF document (%PDF-).'
    );
  }

  // Lazy-import pdfjs legacy build for pure Node.js compatibility without DOM Canvas
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const uint8 = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);
  const loadingTask = pdfjs.getDocument({
    data: uint8,
    password: password || undefined,
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
  });

  let pdfDoc: Awaited<typeof loadingTask.promise>;
  try {
    pdfDoc = await loadingTask.promise;
  } catch (err: unknown) {
    const errObj = err as { name?: string; code?: number; message?: string };
    if (errObj?.name === 'PasswordException') {
      // pdfjs PasswordResponses: NEED_PASSWORD = 1, INCORRECT_PASSWORD = 2
      if (errObj.code === 2) {
        throw new CasPdfPasswordError(
          'INCORRECT_PASSWORD',
          'Incorrect CAS PDF password. Check your PAN (uppercase) or DOB format and try again.'
        );
      }
      throw new CasPdfPasswordError(
        'PASSWORD_REQUIRED',
        'This NSDL/CDSL CAS PDF is password-protected. Enter your CAS password (typically PAN in uppercase or DDMMYYYY).'
      );
    }
    throw new CasPdfFormatError(
      'INVALID_PDF',
      'Unable to decode PDF structure. Please upload an official NSDL, CDSL, or CAMS/KFintech CAS PDF.'
    );
  }

  const pages: ExtractedPdfPage[] = [];

  try {
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum += 1) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      interface PositionedToken {
        str: string;
        x: number;
        y: number;
        width: number;
      }

      const tokens: PositionedToken[] = [];
      for (const rawItem of textContent.items) {
        if (!('str' in rawItem) || typeof rawItem.str !== 'string') continue;
        const text = rawItem.str;
        if (!text.trim()) continue;
        const transform = Array.isArray(rawItem.transform) ? rawItem.transform : [1, 0, 0, 1, 0, 0];
        tokens.push({
          str: text,
          x: Number(transform[4] ?? 0),
          y: Number(transform[5] ?? 0),
          width: Number((rawItem as { width?: number }).width ?? 0),
        });
      }

      // Sort top-to-bottom (descending Y in PDF coordinate space), then left-to-right (ascending X)
      tokens.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 2.5) return b.y - a.y;
        return a.x - b.x;
      });

      const rows: PositionedToken[][] = [];
      for (const token of tokens) {
        const lastRow = rows[rows.length - 1];
        if (lastRow && Math.abs(lastRow[0].y - token.y) <= 2.5) {
          lastRow.push(token);
        } else {
          rows.push([token]);
        }
      }

      const reconstructedLines: string[] = [];
      for (const row of rows) {
        row.sort((a, b) => a.x - b.x);
        let line = '';
        let prevEndX = -Infinity;

        for (const item of row) {
          const piece = item.str.trim();
          if (!piece) continue;
          if (!line) {
            line = piece;
          } else {
            const gap = item.x - prevEndX;
            // Preserve tabular columns with double-space / tab separator when gap is wide
            if (gap > 12) {
              line += `  ${piece}`;
            } else {
              line += ` ${piece}`;
            }
          }
          prevEndX = item.x + Math.max(item.width, piece.length * 4);
        }

        if (line.trim()) {
          reconstructedLines.push(line.trim());
        }
      }

      pages.push({ pageNumber: pageNum, lines: reconstructedLines });
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  const totalLineCount = pages.reduce((acc, p) => acc + p.lines.length, 0);
  if (totalLineCount === 0) {
    throw new CasPdfFormatError(
      'NO_TEXT_CONTENT',
      'No extractable text layer found in this PDF. Scanned image-only PDFs are not supported; please upload the digital CAS PDF issued by NSDL, CDSL, or MFCentral.'
    );
  }

  return pages;
}

interface ActiveFolioContext {
  amc: string;
  folioMasked: string;
  folioDigest: string;
  isin: string;
  symbol: string;
  schemeName: string;
  assetClass: AssetClassBucket;
  currency: 'INR' | 'USD';
  openingUnits: Decimal | null;
  statementClosingUnits: Decimal | null;
  netUnitDelta: Decimal;
  txCount: number;
  columnOrder: 'AMOUNT_NAV_UNITS' | 'AMOUNT_UNITS_NAV';
}

const DATE_START_REGEX =
  /^(\d{1,2}[-\s/][A-Za-z]{3,4}[-\s/]\d{2,4}|\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}-\d{2}-\d{2})\s+(.+)$/;

const NUMERIC_TOKEN_REGEX = /\(?-?(?:₹|Rs\.?|INR)?\s*\d{1,3}(?:,\d{2,3})*(?:\.\d+)?\)?|\(?-?\d+(?:\.\d+)?\)?/g;

function extractTrailingNumbers(restOfLine: string): {
  description: string;
  numbers: Decimal[];
} {
  // Find all numeric tokens near the end of the row (after description)
  const matches = Array.from(restOfLine.matchAll(NUMERIC_TOKEN_REGEX));
  if (matches.length === 0) {
    return { description: restOfLine.trim(), numbers: [] };
  }

  // Walk backwards from the end collecting contiguous trailing financial columns
  // separated only by whitespace (stop as soon as alphabetic description text is hit)
  const selectedMatches: RegExpMatchArray[] = [];
  let cursor = restOfLine.length;

  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const m = matches[i];
    const startIdx = m.index ?? 0;
    const endIdx = startIdx + m[0].length;
    const between = restOfLine.slice(endIdx, cursor);

    if (between.trim().length > 0) {
      // Non-whitespace text between this token and the trailing numeric block
      break;
    }

    const parsed = parseCasDecimalToken(m[0]);
    if (!parsed) break;

    selectedMatches.unshift(m);
    cursor = startIdx;

    if (selectedMatches.length >= 4) break;
  }

  if (selectedMatches.length === 0) {
    return { description: restOfLine.trim(), numbers: [] };
  }

  const firstNumIdx = selectedMatches[0].index ?? restOfLine.length;
  const description = restOfLine.slice(0, firstNumIdx).trim();
  const numbers = selectedMatches
    .map((m) => parseCasDecimalToken(m[0]))
    .filter((d): d is Decimal => d !== null);

  return { description, numbers };
}

/**
 * Resolves Amount, NAV/Price, and Units from the 2-4 trailing numeric columns
 * in an NSDL / CDSL / CAMS CAS transaction row using exact Decimal arithmetic.
 */
function resolveTransactionColumns(
  numbers: Decimal[],
  preferredOrder: 'AMOUNT_NAV_UNITS' | 'AMOUNT_UNITS_NAV',
  runningBalance: Decimal | null
): {
  amount: Decimal;
  price: Decimal;
  units: Decimal;
  balance: Decimal | null;
} | null {
  if (numbers.length === 0) return null;

  // 4-column standard CAS row: [Amount, Units, Price, Balance] OR [Amount, Price, Units, Balance]
  if (numbers.length >= 4) {
    const [col0, col1, col2, col3] = numbers;
    const abs0 = col0.abs();
    const abs1 = col1.abs();
    const abs2 = col2.abs();

    // Verify mathematical consistency: abs0 ≈ abs1 * abs2
    const prod = abs1.times(abs2);
    const fitsProduct = abs0.gt(0) && prod.gt(0) && abs0.minus(prod).abs().div(abs0).lte(new Decimal('0.03'));

    if (fitsProduct) {
      // Disambiguate which of (col1, col2) is Units vs Price using runningBalance when available!
      if (runningBalance !== null) {
        const errIfCol1IsUnits = runningBalance.plus(col1).minus(col3).abs();
        const errIfCol2IsUnits = runningBalance.plus(col2).minus(col3).abs();
        if (errIfCol1IsUnits.lte(new Decimal('0.02')) && errIfCol2IsUnits.gt(new Decimal('0.02'))) {
          return { amount: col0, units: col1, price: col2, balance: col3 };
        }
        if (errIfCol2IsUnits.lte(new Decimal('0.02')) && errIfCol1IsUnits.gt(new Decimal('0.02'))) {
          return { amount: col0, price: col1, units: col2, balance: col3 };
        }
      }

      if (preferredOrder === 'AMOUNT_NAV_UNITS') {
        return { amount: col0, price: col1, units: col2, balance: col3 };
      }
      return { amount: col0, units: col1, price: col2, balance: col3 };
    }

    // Fallback to declared column order
    return preferredOrder === 'AMOUNT_NAV_UNITS'
      ? { amount: col0, price: col1, units: col2, balance: col3 }
      : { amount: col0, units: col1, price: col2, balance: col3 };
  }

  // 3-column CAS row (no running balance column): [Amount, Price, Units] or [Amount, Units, Price]
  if (numbers.length === 3) {
    const [col0, col1, col2] = numbers;
    return preferredOrder === 'AMOUNT_NAV_UNITS'
      ? { amount: col0, price: col1, units: col2, balance: null }
      : { amount: col0, units: col1, price: col2, balance: null };
  }

  // 2-column row (e.g., Demat Credit/Debit with Units & Price, or Amount & Units)
  if (numbers.length === 2) {
    const [col0, col1] = numbers;
    if (col0.isZero() || col1.isZero()) return null;
    // Heuristic: larger value is typically INR amount, smaller is units or price
    const amount = col0.abs().gte(col1.abs()) ? col0 : col0.times(col1);
    const units = col0.abs().gte(col1.abs()) ? col1 : col0;
    const price = units.isZero() ? new Decimal(0) : amount.abs().div(units.abs());
    return { amount, price, units, balance: null };
  }

  return null;
}

/**
 * Pure domain parser: converts extracted PDF pages into validated, PII-masked
 * structured CAS transactions + per-folio Decimal balance reconciliation.
 */
export function parseCasStatementPages(
  pages: ExtractedPdfPage[],
  options: {
    fileSha256: string;
    schemeResolver?: CasSchemeResolver;
  }
): CasParseResult {
  const allLines = pages.flatMap((p) => p.lines);
  const joinedSample = allLines.slice(0, 80).join('\n');

  const provider = detectDepositoryProvider(joinedSample);

  // Extract & mask statement metadata
  let maskedPan: string | null = null;
  let maskedAccountId: string | null = null;
  let investorName: string | null = null;
  let periodFrom: string | null = null;
  let periodTo: string | null = null;

  for (const line of allLines.slice(0, 60)) {
    if (!maskedPan) {
      const panMatch = line.match(/\bPAN\s*[:\-]?\s*([A-Z]{5}\d{4}[A-Z])\b/i);
      if (panMatch) maskedPan = maskPan(panMatch[1]);
    }
    if (!maskedAccountId) {
      const boMatch = line.match(
        /\b(?:BO\s*ID|DP\s*ID|Client\s*ID|CAS\s*ID)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{5,20})\b/i
      );
      if (boMatch) maskedAccountId = maskIdentifier(boMatch[1]);
    }
    if (!investorName) {
      const nameMatch = line.match(/\b(?:Investor\s*Name|Holder\s*Name|Name)\s*[:\-]\s*([A-Za-z][A-Za-z.\s]{2,50})$/i);
      if (nameMatch) investorName = nameMatch[1].trim();
    }
    if (!periodFrom || !periodTo) {
      const periodMatch = line.match(
        /(?:from|period)\s*[:\-]?\s*(\d{1,2}[-\s/][A-Za-z0-9]{2,4}[-\s/]\d{2,4})\s*(?:to|[-–])\s*(\d{1,2}[-\s/][A-Za-z0-9]{2,4}[-\s/]\d{2,4})/i
      );
      if (periodMatch) {
        periodFrom = parseCasDateToIso(periodMatch[1]);
        periodTo = parseCasDateToIso(periodMatch[2]);
      }
    }
  }

  let currentAmc = 'AMFI Registered AMC';
  let currentColumnOrder: 'AMOUNT_NAV_UNITS' | 'AMOUNT_UNITS_NAV' =
    provider === 'NSDL_CAS' ? 'AMOUNT_NAV_UNITS' : 'AMOUNT_UNITS_NAV';

  const folioContexts: ActiveFolioContext[] = [];
  let activeFolio: ActiveFolioContext | null = null;
  let runningBalance: Decimal | null = null;

  const transactions: LedgerTransaction[] = [];
  const warnings: CasParseWarning[] = [];
  const seenIdempotencyKeys = new Set<string>();
  const rowOccurrenceCounter = new Map<string, number>();

  let stampDutyTotal = new Decimal(0);
  let sttTotal = new Decimal(0);
  let skippedAdminRows = 0;

  const startNewFolio = (params: {
    rawFolio?: string;
    isin?: string | null;
    rawSchemeName?: string;
  }): ActiveFolioContext => {
    const rawFolio = (params.rawFolio || activeFolio?.folioMasked || 'DEMAT').trim();
    const folioMasked = rawFolio.includes('*') ? rawFolio : maskIdentifier(rawFolio);
    const folioDigest = crypto
      .createHash('sha256')
      .update(rawFolio.toUpperCase())
      .digest('hex')
      .slice(0, 10);

    const resolved = resolveSchemeIdentity(
      params.isin || null,
      params.rawSchemeName || '',
      options.schemeResolver
    );

    const nextFolio: ActiveFolioContext = {
      amc: currentAmc,
      folioMasked,
      folioDigest,
      isin: (params.isin || '').trim().toUpperCase(),
      symbol: resolved.symbol,
      schemeName: resolved.schemeName,
      assetClass: resolved.assetClass,
      currency: resolved.currency || 'INR',
      openingUnits: null,
      statementClosingUnits: null,
      netUnitDelta: new Decimal(0),
      txCount: 0,
      columnOrder: currentColumnOrder,
    };

    folioContexts.push(nextFolio);
    runningBalance = null;
    return nextFolio;
  };

  for (const page of pages) {
    for (let i = 0; i < page.lines.length; i += 1) {
      const line = page.lines[i];

      // 1. Detect table column header order dynamically
      if (
        /\bdate\b/i.test(line) &&
        /\bamount\b/i.test(line) &&
        (/\bunits?\b/i.test(line) || /\bnav\b|\bprice\b/i.test(line))
      ) {
        const navIdx = Math.min(
          line.toLowerCase().indexOf('nav') >= 0 ? line.toLowerCase().indexOf('nav') : 9999,
          line.toLowerCase().indexOf('price') >= 0 ? line.toLowerCase().indexOf('price') : 9999
        );
        const unitsIdx = line.toLowerCase().indexOf('unit');
        if (navIdx < 9999 && unitsIdx >= 0) {
          currentColumnOrder = navIdx < unitsIdx ? 'AMOUNT_NAV_UNITS' : 'AMOUNT_UNITS_NAV';
          if (activeFolio) {
            activeFolio.columnOrder = currentColumnOrder;
          }
        }
        continue;
      }

      // 2. Detect AMC Section Header
      const amcMatch = line.match(
        /^([A-Za-z][A-Za-z0-9\s&.-]{2,60}\s+(?:Mutual\s+Fund|Asset\s+Management(?:\s+Company)?|AMC))\b/i
      );
      if (amcMatch && !DATE_START_REGEX.test(line) && !/ISIN\s*[:\-]/i.test(line)) {
        currentAmc = amcMatch[1].trim();
        continue;
      }

      // 3. Detect Folio + Scheme + ISIN header (single line or paired lines)
      const folioMatch = line.match(
        /\bFolio\s*(?:No\.?|Number)?\s*[:\-]\s*([0-9][0-9A-Z\-]{2,18}(?:\s*\/\s*[0-9A-Z]{1,6})?|[A-Z]{1,4}[0-9]{4,16}(?:\s*\/\s*[0-9A-Z]{1,6})?)/i
      );
      const isinMatch = line.match(/\b(IN[EF0][A-Z0-9]{9})\b/);

      if (folioMatch && isinMatch) {
        const rawFolio = folioMatch[1].replace(/\s+/g, '').trim();
        const isin = isinMatch[1].toUpperCase();
        const schemePart = line
          .replace(folioMatch[0], '')
          .replace(/ISIN\s*[:\-]?\s*IN[EF0][A-Z0-9]{9}/i, '')
          .replace(isin, '')
          .replace(/Registrar\s*[:\-]\s*[A-Za-z]+/i, '')
          .replace(/^\s*[-:|]\s*/, '')
          .trim();

        activeFolio = startNewFolio({ rawFolio, isin, rawSchemeName: schemePart });
        continue;
      }

      if (folioMatch && !isinMatch) {
        const rawFolio = folioMatch[1].replace(/\s+/g, '').trim();
        // Peek next line for ISIN & scheme name (common in CAMS/KFintech & NSDL CAS)
        const nextLine = page.lines[i + 1] || '';
        const nextIsinMatch = nextLine.match(/\b(IN[EF0][A-Z0-9]{9})\b/);
        if (nextIsinMatch) {
          const isin = nextIsinMatch[1].toUpperCase();
          const schemePart = nextLine
            .replace(/ISIN\s*[:\-]?\s*IN[EF0][A-Z0-9]{9}/i, '')
            .replace(isin, '')
            .replace(/Registrar\s*[:\-]\s*[A-Za-z]+/i, '')
            .replace(/^\s*[-:|]\s*/, '')
            .replace(/\s*[-:|]\s*$/, '')
            .trim();
          activeFolio = startNewFolio({ rawFolio, isin, rawSchemeName: schemePart });
          i += 1;
        } else {
          activeFolio = startNewFolio({ rawFolio, isin: null, rawSchemeName: '' });
        }
        continue;
      }

      if (isinMatch && !DATE_START_REGEX.test(line)) {
        const isin = isinMatch[1].toUpperCase();
        const schemePart = line
          .replace(/ISIN\s*[:\-]?\s*IN[EF0][A-Z0-9]{9}/i, '')
          .replace(isin, '')
          .replace(/Registrar\s*[:\-]\s*[A-Za-z]+/i, '')
          .replace(/^\s*[-:|]\s*/, '')
          .replace(/\s*[-:|]\s*$/, '')
          .trim();

        // If active folio was just created without an ISIN, enrich it; otherwise start a new scheme block
        if (activeFolio && !activeFolio.isin && activeFolio.txCount === 0) {
          const resolved = resolveSchemeIdentity(isin, schemePart, options.schemeResolver);
          activeFolio.isin = isin;
          activeFolio.symbol = resolved.symbol;
          activeFolio.schemeName = resolved.schemeName;
          activeFolio.assetClass = resolved.assetClass;
          activeFolio.currency = resolved.currency || 'INR';
        } else {
          activeFolio = startNewFolio({
            rawFolio: activeFolio?.folioMasked || 'DEMAT',
            isin,
            rawSchemeName: schemePart,
          });
        }
        continue;
      }

      // 4. Detect Opening / Closing Unit Balance rows
      const openBalMatch = line.match(
        /\bOpening\s+(?:Unit\s+)?Balance\s*[:\-]?\s*(\(?-?[\d,]+(?:\.\d+)?\)?)/i
      );
      if (openBalMatch && activeFolio) {
        const parsed = parseCasDecimalToken(openBalMatch[1]);
        if (parsed) {
          activeFolio.openingUnits = parsed;
          runningBalance = parsed;
        }
        skippedAdminRows += 1;
        continue;
      }

      const closeBalMatch = line.match(
        /\bClosing\s+(?:Unit\s+)?Balance\s*[:\-]?\s*(\(?-?[\d,]+(?:\.\d+)?\)?)/i
      );
      if (closeBalMatch && activeFolio) {
        const parsed = parseCasDecimalToken(closeBalMatch[1]);
        if (parsed) {
          activeFolio.statementClosingUnits = parsed;
        }
        skippedAdminRows += 1;
        continue;
      }

      // 5. Parse Date-Prefixed Transaction Lines
      const dateMatch = line.match(DATE_START_REGEX);
      if (!dateMatch) continue;

      const isoDate = parseCasDateToIso(dateMatch[1]);
      if (!isoDate) continue;

      const restOfLine = dateMatch[2].trim();
      const { description, numbers } = extractTrailingNumbers(restOfLine);

      if (numbers.length === 0) {
        skippedAdminRows += 1;
        continue;
      }

      // Detect Stamp Duty / STT rows (usually single amount column)
      const preliminaryKind = classifyCasDescription(
        description,
        numbers[numbers.length - 1] || new Decimal(0),
        numbers[0] || new Decimal(0)
      );

      if (preliminaryKind.kind === 'STAMP_DUTY') {
        stampDutyTotal = stampDutyTotal.plus(numbers[0].abs());
        skippedAdminRows += 1;
        continue;
      }
      if (preliminaryKind.kind === 'STT') {
        sttTotal = sttTotal.plus(numbers[0].abs());
        skippedAdminRows += 1;
        continue;
      }
      if (preliminaryKind.kind === 'ADMIN') {
        skippedAdminRows += 1;
        continue;
      }

      if (!activeFolio) {
        warnings.push({
          page: page.pageNumber,
          line: line.slice(0, 120),
          reason: 'Transaction row encountered before any ISIN/Folio header; skipped.',
        });
        continue;
      }

      const cols = resolveTransactionColumns(numbers, activeFolio.columnOrder, runningBalance);
      if (!cols) {
        warnings.push({
          page: page.pageNumber,
          line: line.slice(0, 120),
          reason: 'Insufficient numeric columns to determine units, NAV, and amount.',
        });
        continue;
      }

      const classified = classifyCasDescription(description, cols.units, cols.amount);
      if (classified.kind !== 'TX' || !classified.txType) {
        skippedAdminRows += 1;
        continue;
      }

      const absUnits = cols.units.abs();
      let absPrice = cols.price.abs();
      let absAmount = cols.amount.abs();

      if (absUnits.lte(0)) {
        warnings.push({
          page: page.pageNumber,
          line: line.slice(0, 120),
          reason: 'Zero-unit transaction row skipped.',
        });
        continue;
      }

      if (absPrice.lte(0) && absAmount.gt(0)) {
        absPrice = absAmount.div(absUnits);
      } else if (absAmount.lte(0) && absPrice.gt(0)) {
        absAmount = absUnits.times(absPrice);
      }

      if (absPrice.lte(0) || absAmount.lte(0)) {
        warnings.push({
          page: page.pageNumber,
          line: line.slice(0, 120),
          reason: 'Zero amount/NAV transaction row skipped.',
        });
        continue;
      }

      // Deterministic idempotency key that survives re-uploading overlapping CAS months
      // while distinguishing legitimate duplicate SIPs on the same day via occurrence index
      const baseFingerprint = [
        activeFolio.isin || activeFolio.symbol,
        activeFolio.folioDigest,
        isoDate,
        classified.txType,
        absUnits.toFixed(4),
        absAmount.toFixed(2),
      ].join('|');

      const occurrence = rowOccurrenceCounter.get(baseFingerprint) ?? 0;
      rowOccurrenceCounter.set(baseFingerprint, occurrence + 1);

      const idempHash = crypto
        .createHash('sha256')
        .update(`${baseFingerprint}|${occurrence}`)
        .digest('hex')
        .slice(0, 20);
      const idempotencyKey = `cas_${idempHash}`;

      if (seenIdempotencyKeys.has(idempotencyKey)) {
        continue;
      }

      const candidateTx = {
        id: idempotencyKey,
        symbol: activeFolio.symbol.slice(0, 32),
        schemeName: activeFolio.schemeName.slice(0, 160),
        isin: activeFolio.isin.slice(0, 24),
        assetClass: activeFolio.assetClass,
        txType: classified.txType,
        tradeDate: isoDate,
        units: absUnits.toFixed(4),
        price: absPrice.toFixed(4),
        amount: absAmount.toFixed(2),
        currency: activeFolio.currency,
        source: 'CAS' as const,
        idempotencyKey,
      };

      const validated = LedgerTransactionSchema.safeParse(candidateTx);
      if (!validated.success) {
        warnings.push({
          page: page.pageNumber,
          line: line.slice(0, 120),
          reason: `Schema validation failed: ${validated.error.issues[0]?.message || 'invalid field'}`,
        });
        continue;
      }

      seenIdempotencyKeys.add(idempotencyKey);
      transactions.push(validated.data);

      // Update folio balance reconciliation tracker
      const isOutflow = classified.txType === 'SELL' || classified.txType === 'SWITCH_OUT';
      const signedDelta = isOutflow ? absUnits.negated() : absUnits;
      activeFolio.netUnitDelta = activeFolio.netUnitDelta.plus(signedDelta);
      activeFolio.txCount += 1;

      if (cols.balance !== null) {
        runningBalance = cols.balance;
      } else if (runningBalance !== null) {
        runningBalance = runningBalance.plus(signedDelta);
      }
    }
  }

  // Build per-folio reconciliation report
  let matchedFolios = 0;
  let driftFolios = 0;
  let unverifiedFolios = 0;

  const folios: CasFolioReconciliation[] = folioContexts
    .filter((f) => f.txCount > 0 || f.openingUnits !== null || f.statementClosingUnits !== null)
    .map((f) => {
      const opening = f.openingUnits ?? new Decimal(0);
      const computedClosing = opening.plus(f.netUnitDelta);

      let status: 'MATCHED' | 'DRIFT' | 'UNVERIFIED' = 'UNVERIFIED';
      let unitDrift: string | null = null;

      if (f.statementClosingUnits !== null) {
        const diff = computedClosing.minus(f.statementClosingUnits);
        unitDrift = diff.toFixed(4);
        if (diff.abs().lte(new Decimal('0.005'))) {
          status = 'MATCHED';
          matchedFolios += 1;
        } else {
          status = 'DRIFT';
          driftFolios += 1;
        }
      } else {
        unverifiedFolios += 1;
      }

      return {
        folioMasked: f.folioMasked,
        amc: f.amc,
        isin: f.isin,
        symbol: f.symbol,
        schemeName: f.schemeName,
        assetClass: f.assetClass,
        openingUnits: f.openingUnits ? f.openingUnits.toFixed(4) : null,
        computedClosingUnits: computedClosing.toFixed(4),
        statementClosingUnits: f.statementClosingUnits ? f.statementClosingUnits.toFixed(4) : null,
        unitDrift,
        status,
        transactionCount: f.txCount,
      };
    });

  // Sort chronologically for deterministic FIFO ingestion
  transactions.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));

  return {
    statementMeta: {
      provider,
      statementPeriod: {
        from: periodFrom,
        to: periodTo,
      },
      investorName,
      maskedPan,
      maskedAccountId,
      pageCount: pages.length,
      fileSha256: options.fileSha256,
    },
    transactions,
    reconciliation: {
      totalFolios: folios.length,
      matchedFolios,
      driftFolios,
      unverifiedFolios,
      stampDutyTotal: stampDutyTotal.toFixed(2),
      sttTotal: sttTotal.toFixed(2),
      folios,
    },
    warnings,
    skippedAdminRows,
    parsedAtUtc: new Date().toISOString(),
  };
}

/**
 * End-to-end backend CAS PDF parser entrypoint:
 * 1) Validates PDF signature & size
 * 2) Decrypts & extracts positioned text lines via pdfjs-dist
 * 3) Runs the NSDL/CDSL/CAMS state machine with Decimal.js math & PII masking
 */
export async function parseCasPdfBuffer(
  pdfBuffer: Buffer,
  options: {
    password?: string;
    schemeResolver?: CasSchemeResolver;
  } = {}
): Promise<CasParseResult> {
  const fileSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  const pages = await extractPdfPagesFromBuffer(pdfBuffer, options.password);
  return parseCasStatementPages(pages, {
    fileSha256,
    schemeResolver: options.schemeResolver,
  });
}
