export type HoldingNoteStance = 'research' | 'core' | 'watch' | 'trim';

export interface HoldingNoteRecord {
  id: string;
  fundCode: string;
  holdingKey: string;
  securityName: string;
  isin: string | null;
  nseSymbol: string | null;
  noteText: string;
  stance: HoldingNoteStance;
  createdAt: string;
  updatedAt: string;
}

export interface HoldingNoteDraftInput {
  fundCode: string;
  holdingKey?: string;
  securityName: string;
  isin?: string | null;
  nseSymbol?: string | null;
  noteText: string;
  stance?: string;
}

export interface HoldingNoteValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: {
    fundCode: string;
    holdingKey: string;
    securityName: string;
    isin: string | null;
    nseSymbol: string | null;
    noteText: string;
    stance: HoldingNoteStance;
  };
}

export const MAX_HOLDING_NOTE_LENGTH = 1000;

export const HOLDING_NOTE_STANCE_META: Record<
  HoldingNoteStance,
  { label: string; bg: string; text: string; border: string }
> = {
  research: {
    label: 'Research',
    bg: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
  },
  core: {
    label: 'Core Hold',
    bg: '#ecfdf5',
    text: '#047857',
    border: '#a7f3d0',
  },
  watch: {
    label: 'Watchlist',
    bg: '#fffbeb',
    text: '#b45309',
    border: '#fde68a',
  },
  trim: {
    label: 'Trim / Review',
    bg: '#fef2f2',
    text: '#b91c1c',
    border: '#fecaca',
  },
};

const VALID_STANCES = new Set<HoldingNoteStance>(['research', 'core', 'watch', 'trim']);

/** Strips unsafe ASCII control characters (preserving newlines/tabs) and trims whitespace. */
export function sanitizeNoteText(raw: string): string {
  return String(raw || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

export function normalizeHoldingNoteStance(raw?: string | null): HoldingNoteStance {
  const normalized = String(raw || '').trim().toLowerCase() as HoldingNoteStance;
  return VALID_STANCES.has(normalized) ? normalized : 'research';
}

/**
 * Builds a deterministic, collision-resistant holding key scoped to (fundCode, ISIN || securityName).
 */
export function buildHoldingNoteKey(
  fundCode: string,
  isin?: string | null,
  securityName?: string | null
): string {
  const cleanFund = String(fundCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9._-]/g, '');
  const cleanIsin = String(isin || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (cleanIsin.length >= 6) {
    return `${cleanFund || 'FUND'}::${cleanIsin}`.slice(0, 140);
  }
  const cleanName = String(securityName || '')
    .trim()
    .toUpperCase()
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ');
  return `${cleanFund || 'FUND'}::${cleanName || 'HOLDING'}`.slice(0, 140);
}

/**
 * Strict boundary validator used identically on client and server for custom holding notes.
 */
export function validateHoldingNoteInput(input: HoldingNoteDraftInput): HoldingNoteValidationResult {
  const fundCode = String(input.fundCode || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9._-]{2,40}$/.test(fundCode)) {
    return { valid: false, error: 'A valid fund code is required.' };
  }

  const securityName = sanitizeNoteText(input.securityName || '')
    .replace(/\n+/g, ' ')
    .slice(0, 160);
  if (securityName.length === 0) {
    return { valid: false, error: 'Security name is required for a holding note.' };
  }

  const rawIsin = String(input.isin || '')
    .trim()
    .toUpperCase();
  const isin = rawIsin && /^[A-Z0-9]{6,20}$/.test(rawIsin) ? rawIsin : null;

  const rawSymbol = String(input.nseSymbol || '')
    .trim()
    .toUpperCase();
  const nseSymbol = rawSymbol && /^[A-Z0-9.&_-]{1,24}$/.test(rawSymbol) ? rawSymbol : null;

  const noteText = sanitizeNoteText(input.noteText || '');
  if (noteText.length === 0) {
    return { valid: false, error: 'Enter a note before saving.' };
  }
  if (noteText.length > MAX_HOLDING_NOTE_LENGTH) {
    return {
      valid: false,
      error: `Note cannot exceed ${MAX_HOLDING_NOTE_LENGTH} characters.`,
    };
  }

  const canonicalKey = input.holdingKey
    ? sanitizeNoteText(input.holdingKey).toUpperCase().slice(0, 140)
    : buildHoldingNoteKey(fundCode, isin, securityName);

  const holdingKey =
    canonicalKey.startsWith(`${fundCode}::`) && canonicalKey.length > fundCode.length + 2
      ? canonicalKey
      : buildHoldingNoteKey(fundCode, isin, securityName);

  const stance = normalizeHoldingNoteStance(input.stance);

  return {
    valid: true,
    sanitized: {
      fundCode,
      holdingKey,
      securityName,
      isin,
      nseSymbol,
      noteText,
      stance,
    },
  };
}

export function upsertHoldingNoteInList(
  notes: HoldingNoteRecord[],
  incoming: HoldingNoteRecord
): HoldingNoteRecord[] {
  const filtered = notes.filter(
    (item) => item.id !== incoming.id && item.holdingKey !== incoming.holdingKey
  );
  return [incoming, ...filtered];
}

export function removeHoldingNoteFromList(
  notes: HoldingNoteRecord[],
  noteId: string
): HoldingNoteRecord[] {
  return notes.filter((item) => item.id !== noteId);
}

export function indexNotesByHoldingKey(
  notes: HoldingNoteRecord[]
): Record<string, HoldingNoteRecord> {
  const map: Record<string, HoldingNoteRecord> = {};
  for (const note of notes) {
    map[note.holdingKey] = note;
  }
  return map;
}

export function formatNoteTimestamp(isoUtc: string): string {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
