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
    getAccount(email: string): StoredAccountRecord | undefined {
      return state.accounts[email];
    },
    hasAccount(email: string): boolean {
      return Object.prototype.hasOwnProperty.call(state.accounts, email);
    },
    setAccount(email: string, record: StoredAccountRecord): void {
      state.accounts[email] = record;
      flushToDisk();
    },
    listAccountCount(): number {
      return Object.keys(state.accounts).length;
    },

    // Price Alerts
    getUserAlerts(userId: string): PriceAlert[] {
      return [...(state.alertsByUser[userId] || [])];
    },
    addUserAlert(userId: string, alert: PriceAlert): PriceAlert[] {
      const existing = state.alertsByUser[userId] || [];
      const next = [alert, ...existing];
      state.alertsByUser[userId] = next;
      flushToDisk();
      return [...next];
    },
    updateUserAlert(
      userId: string,
      alertId: string,
      patch: Partial<
        Pick<PriceAlert, 'notificationsEnabled' | 'triggered' | 'targetPrice' | 'note' | 'priority'>
      >
    ): PriceAlert | null {
      const existing = state.alertsByUser[userId] || [];
      const idx = existing.findIndex((a) => a.id === alertId);
      if (idx === -1) return null;
      const updated: PriceAlert = { ...existing[idx], ...patch };
      state.alertsByUser[userId] = existing.map((item, i) => (i === idx ? updated : item));
      flushToDisk();
      return updated;
    },
    deleteUserAlert(userId: string, alertId: string): boolean {
      const existing = state.alertsByUser[userId] || [];
      const next = existing.filter((a) => a.id !== alertId);
      if (next.length === existing.length) return false;
      state.alertsByUser[userId] = next;
      flushToDisk();
      return true;
    },

    // Watchlists & Comparisons
    getUserWatchlist(userId: string): UserWatchlistState {
      const existing = state.watchlistsByUser[userId];
      if (existing) return { ...existing };
      return {
        primaryTicker: 'GOLDBEES',
        watchlistTickers: [...DEFAULT_WATCHLIST_TICKERS],
        comparisonTickers: [],
        updatedAt: new Date().toISOString(),
      };
    },
    setUserWatchlist(
      userId: string,
      input: Partial<Pick<UserWatchlistState, 'primaryTicker' | 'watchlistTickers' | 'comparisonTickers'>>
    ): UserWatchlistState {
      const current = this.getUserWatchlist(userId);
      const next: UserWatchlistState = {
        primaryTicker: (input.primaryTicker || current.primaryTicker).trim().toUpperCase() || 'GOLDBEES',
        watchlistTickers: Array.isArray(input.watchlistTickers)
          ? Array.from(
              new Set(
                input.watchlistTickers
                  .map((t) => String(t).trim().toUpperCase())
                  .filter((t) => /^[A-Z0-9.^]{1,12}$/.test(t))
              )
            ).slice(0, 12)
          : current.watchlistTickers,
        comparisonTickers: Array.isArray(input.comparisonTickers)
          ? Array.from(
              new Set(
                input.comparisonTickers
                  .map((t) => String(t).trim().toUpperCase())
                  .filter((t) => /^[A-Z0-9.^]{1,12}$/.test(t))
              )
            ).slice(0, 4)
          : current.comparisonTickers,
        updatedAt: new Date().toISOString(),
      };
      state.watchlistsByUser[userId] = next;
      flushToDisk();
      return { ...next };
    },

    // Research Inquiries
    addInquiry(inquiry: ResearchInquiry): ResearchInquiry {
      state.inquiries = [inquiry, ...state.inquiries].slice(0, 500);
      flushToDisk();
      return inquiry;
    },
    listUserInquiries(userId: string): ResearchInquiry[] {
      return state.inquiries.filter((item) => item.userId === userId);
    },
  };
}

export type PersistenceStore = ReturnType<typeof createPersistenceStore>;
export const financiaStore = createPersistenceStore(DEFAULT_STORE_PATH);
