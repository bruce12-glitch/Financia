import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AuthUser } from '../../frontend/utils/authEngine.ts';
import { PriceAlert } from '../../frontend/utils/alertEngine.ts';

export interface StoredAccountRecord {
  user: AuthUser;
  salt: string;
  passwordHash: string;
}

export interface UserWatchlistState {
  primaryTicker: string;
  watchlistTickers: string[];
  comparisonTickers: string[];
  updatedAt: string;
}

export interface ResearchInquiry {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'received' | 'queued';
  createdAt: string;
}

export interface FinanciaDatabaseSchema {
  version: number;
  accounts: Record<string, StoredAccountRecord>;
  alertsByUser: Record<string, PriceAlert[]>;
  watchlistsByUser: Record<string, UserWatchlistState>;
  inquiries: ResearchInquiry[];
}

const DEFAULT_WATCHLIST_TICKERS = ['GOLDBEES', 'PPFAS', 'NIFTYBEES', 'SBIGILT', 'HDFCCORP', 'LIQUIDBEES'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DEFAULT_STORE_PATH =
  process.env.FINANCIA_DB_PATH ||
  path.resolve(__dirname, '..', 'data', 'financia-db.json');

function createEmptyDb(): FinanciaDatabaseSchema {
  return {
    version: 1,
    accounts: {},
    alertsByUser: {},
    watchlistsByUser: {},
    inquiries: [],
  };
}

export function createPersistenceStore(filePath: string = DEFAULT_STORE_PATH) {
  let state: FinanciaDatabaseSchema = loadFromDisk(filePath);

  function loadFromDisk(targetPath: string): FinanciaDatabaseSchema {
    try {
      if (!fs.existsSync(targetPath)) {
        return createEmptyDb();
      }
      const raw = fs.readFileSync(targetPath, 'utf8');
      if (!raw.trim()) return createEmptyDb();
      const parsed = JSON.parse(raw) as Partial<FinanciaDatabaseSchema>;
      return {
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        accounts: parsed.accounts && typeof parsed.accounts === 'object' ? parsed.accounts : {},
        alertsByUser:
          parsed.alertsByUser && typeof parsed.alertsByUser === 'object' ? parsed.alertsByUser : {},
        watchlistsByUser:
          parsed.watchlistsByUser && typeof parsed.watchlistsByUser === 'object'
            ? parsed.watchlistsByUser
            : {},
        inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
      };
    } catch {
      return createEmptyDb();
    }
  }

  function flushToDisk(): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${filePath}.${process.pid}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
      fs.renameSync(tmpPath, filePath);
    } catch {
      // Non-fatal in read-only environments; in-memory state stays intact
    }
  }

  return {
    filePath,
    reload(): FinanciaDatabaseSchema {
      state = loadFromDisk(filePath);
      return state;
    },

    // Accounts
