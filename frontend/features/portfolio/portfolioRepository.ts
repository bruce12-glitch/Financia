import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  clampString,
  db,
  handleFirestoreError,
  OperationType,
  sanitizeBlueprintId,
} from '../../lib/firebase';
import {
  LedgerTransaction,
  TargetAllocationPolicy,
} from './portfolioLedgerEngine';

export const DEFAULT_PORTFOLIO_ID = 'core_wealth_ledger';

export interface CloudPortfolioMeta extends TargetAllocationPolicy {
  id: string;
  name: string;
  currency: 'INR' | 'USD';
}

export async function ensureCloudPortfolio(
  userId: string,
  emailVerified: boolean,
  portfolioId = DEFAULT_PORTFOLIO_ID
): Promise<CloudPortfolioMeta> {
  const safeUid = sanitizeBlueprintId(userId);
  const safePid = sanitizeBlueprintId(portfolioId, DEFAULT_PORTFOLIO_ID);
  const docPath = `users/${safeUid}/portfolios/${safePid}`;
  const ref = doc(db, 'users', safeUid, 'portfolios', safePid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data() as Partial<CloudPortfolioMeta>;
      return {
        id: safePid,
        name: d.name || 'Core Wealth Portfolio',
        currency: d.currency === 'USD' ? 'USD' : 'INR',
        targetEquityPct: typeof d.targetEquityPct === 'number' ? d.targetEquityPct : 65,
        targetDebtPct: typeof d.targetDebtPct === 'number' ? d.targetDebtPct : 20,
        targetGoldPct: typeof d.targetGoldPct === 'number' ? d.targetGoldPct : 15,
        driftThresholdPct: typeof d.driftThresholdPct === 'number' ? d.driftThresholdPct : 5,
      };
    }

    const defaultMeta: CloudPortfolioMeta = {
      id: safePid,
      name: 'Core Wealth Portfolio',
      currency: 'INR',
      targetEquityPct: 65,
      targetDebtPct: 20,
      targetGoldPct: 15,
      driftThresholdPct: 5,
    };

    if (emailVerified) {
      await setDoc(ref, {
        ownerId: safeUid,
        name: defaultMeta.name,
        currency: defaultMeta.currency,
        targetEquityPct: defaultMeta.targetEquityPct,
        targetDebtPct: defaultMeta.targetDebtPct,
        targetGoldPct: defaultMeta.targetGoldPct,
        driftThresholdPct: defaultMeta.driftThresholdPct,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return defaultMeta;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function updateCloudPortfolioPolicy(
  userId: string,
  policy: TargetAllocationPolicy,
  portfolioId = DEFAULT_PORTFOLIO_ID
): Promise<void> {
  const safeUid = sanitizeBlueprintId(userId);
  const safePid = sanitizeBlueprintId(portfolioId, DEFAULT_PORTFOLIO_ID);
  const docPath = `users/${safeUid}/portfolios/${safePid}`;
  const ref = doc(db, 'users', safeUid, 'portfolios', safePid);

  try {
    await updateDoc(ref, {
      targetEquityPct: Math.max(0, Math.min(100, Number(policy.targetEquityPct))),
      targetDebtPct: Math.max(0, Math.min(100, Number(policy.targetDebtPct))),
      targetGoldPct: Math.max(0, Math.min(100, Number(policy.targetGoldPct))),
      driftThresholdPct: Math.max(1, Math.min(50, Number(policy.driftThresholdPct))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export function subscribeCloudTransactions(
  userId: string,
  portfolioId: string,
  onChange: (rows: LedgerTransaction[]) => void
): () => void {
  const safeUid = sanitizeBlueprintId(userId);
  const safePid = sanitizeBlueprintId(portfolioId, DEFAULT_PORTFOLIO_ID);
  const colPath = `users/${safeUid}/portfolios/${safePid}/transactions`;
  const colRef = collection(db, 'users', safeUid, 'portfolios', safePid, 'transactions');

  // Pillar 8 compliant: explicitly filter by ownerId and portfolioId
  const q = query(
    colRef,
    where('ownerId', '==', safeUid),
    where('portfolioId', '==', safePid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows: LedgerTransaction[] = snapshot.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          symbol: String(raw.symbol || ''),
          schemeName: String(raw.schemeName || ''),
          isin: String(raw.isin || ''),
          assetClass: (raw.assetClass as LedgerTransaction['assetClass']) || 'Equity',
          txType: (raw.txType as LedgerTransaction['txType']) || 'BUY',
          tradeDate: String(raw.tradeDate || ''),
          units: String(raw.units || '0'),
          price: String(raw.price || '0'),
          amount: String(raw.amount || '0'),
          currency: raw.currency === 'USD' ? 'USD' : 'INR',
          source: (raw.source as LedgerTransaction['source']) || 'MANUAL',
          idempotencyKey: String(raw.idempotencyKey || d.id),
        };
      });
      onChange(rows);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  );
}

export async function appendCloudTransactions(
  userId: string,
  transactions: LedgerTransaction[],
  portfolioId = DEFAULT_PORTFOLIO_ID
): Promise<number> {
  if (transactions.length === 0) return 0;
  const safeUid = sanitizeBlueprintId(userId);
  const safePid = sanitizeBlueprintId(portfolioId, DEFAULT_PORTFOLIO_ID);
  const colPath = `users/${safeUid}/portfolios/${safePid}/transactions`;

  // Ensure parent exists first to satisfy Master Gate rule
  await ensureCloudPortfolio(safeUid, true, safePid);

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const tx of transactions.slice(0, 200)) {
      const txDocId = sanitizeBlueprintId(tx.idempotencyKey, `tx_${Date.now()}_${count}`);
      const ref = doc(db, 'users', safeUid, 'portfolios', safePid, 'transactions', txDocId);
      batch.set(ref, {
        ownerId: safeUid,
        portfolioId: safePid,
        symbol: clampString(tx.symbol.toUpperCase(), 32),
        schemeName: clampString(tx.schemeName, 160),
        isin: clampString(tx.isin || '', 24),
        assetClass: tx.assetClass,
        txType: tx.txType,
        tradeDate: tx.tradeDate,
        units: tx.units,
        price: tx.price,
        amount: tx.amount,
        currency: tx.currency,
        source: tx.source,
        idempotencyKey: txDocId.slice(0, 64),
        createdAt: serverTimestamp(),
      });
      count += 1;
    }

    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
  }
}

export async function removeCloudTransaction(
  userId: string,
  transactionId: string,
  portfolioId = DEFAULT_PORTFOLIO_ID
): Promise<void> {
  const safeUid = sanitizeBlueprintId(userId);
  const safePid = sanitizeBlueprintId(portfolioId, DEFAULT_PORTFOLIO_ID);
  const safeTxId = sanitizeBlueprintId(transactionId);
  const docPath = `users/${safeUid}/portfolios/${safePid}/transactions/${safeTxId}`;

  try {
    await deleteDoc(doc(db, 'users', safeUid, 'portfolios', safePid, 'transactions', safeTxId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
