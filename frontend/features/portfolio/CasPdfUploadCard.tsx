import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { LedgerTransaction } from './portfolioLedgerEngine';

export interface CasApiStatementMetadata {
  provider: 'NSDL_CAS' | 'CDSL_CAS' | 'CAMS_KFINTECH_CAS' | 'GENERIC_CAS';
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

export interface CasApiFolioReconciliation {
  folioMasked: string;
  amc: string;
  isin: string;
  symbol: string;
  schemeName: string;
  assetClass: LedgerTransaction['assetClass'];
  openingUnits: string | null;
  computedClosingUnits: string;
  statementClosingUnits: string | null;
  unitDrift: string | null;
  status: 'MATCHED' | 'DRIFT' | 'UNVERIFIED';
  transactionCount: number;
}

export interface CasApiParseResponse {
  statementMeta: CasApiStatementMetadata;
  transactions: LedgerTransaction[];
  reconciliation: {
    totalFolios: number;
    matchedFolios: number;
    driftFolios: number;
    unverifiedFolios: number;
    stampDutyTotal: string;
    sttTotal: string;
    folios: CasApiFolioReconciliation[];
  };
  warnings: Array<{ page: number; line: string; reason: string }>;
  skippedAdminRows: number;
  parsedAtUtc: string;
}

interface CasPdfUploadCardProps {
  existingKeys: Set<string>;
  syncingCloud: boolean;
  isCloudSignedIn: boolean;
  onCommitTransactions: (transactions: LedgerTransaction[]) => Promise<{ added: number; duplicates: number }>;
}

const PROVIDER_LABELS: Record<CasApiStatementMetadata['provider'], string> = {
  NSDL_CAS: 'NSDL CAS Statement',
  CDSL_CAS: 'CDSL CAS Statement',
  CAMS_KFINTECH_CAS: 'CAMS / KFintech CAS',
  GENERIC_CAS: 'Consolidated Account Statement',
};

function formatInr(value: string | number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `cas-${crypto.randomUUID()}`;
  }
  return `cas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const CasPdfUploadCard: React.FC<CasPdfUploadCardProps> = ({
  existingKeys,
  syncingCloud,
  isCloudSignedIn,
  onCommitTransactions,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>('');
  const [needsPassword, setNeedsPassword] = useState<boolean>(false);
  const [parsing, setParsing] = useState<boolean>(false);
  const [committing, setCommitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<CasApiParseResponse | null>(null);
  const [commitBanner, setCommitBanner] = useState<{ added: number; duplicates: number } | null>(null);

  const newTransactions = useMemo(() => {
    if (!parsedResult) return [];
    return parsedResult.transactions.filter((tx) => !existingKeys.has(tx.idempotencyKey));
  }, [parsedResult, existingKeys]);

  const duplicateCount = parsedResult
    ? parsedResult.transactions.length - newTransactions.length
    : 0;

  const submitPdfFile = async (file: File, pwd: string) => {
    setParsing(true);
    setErrorMessage(null);
    setCommitBanner(null);

    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      if (pwd.trim()) {
        formData.append('password', pwd.trim());
      }

      const response = await fetch('/api/portfolio/cas/parse-pdf', {
        method: 'POST',
        headers: {
          'Idempotency-Key': generateIdempotencyKey(),
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: formData,
      });

      const payload = (await response.json()) as CasApiParseResponse & {
        code?: string;
        error?: string;
      };

      if (!response.ok) {
        if (payload.code === 'PASSWORD_REQUIRED' || payload.code === 'INCORRECT_PASSWORD') {
          setNeedsPassword(true);
        }
        setParsedResult(null);
        setErrorMessage(payload.error || 'Failed to parse CAS PDF statement.');
        return;
      }

      setNeedsPassword(false);
      setPassword('');
      setParsedResult(payload);
    } catch {
      setErrorMessage('Network error while uploading CAS PDF to the backend parser.');
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Selected CAS PDF exceeds the 10 MB safety limit.');
      return;
    }
    setSelectedFile(file);
    void submitPdfFile(file, password);
  };

  const handleSamplePdfParse = async (provider: 'nsdl' | 'cdsl') => {
    setParsing(true);
    setErrorMessage(null);
    setCommitBanner(null);
    try {
      const res = await fetch(`/api/portfolio/cas/sample-pdf?provider=${provider}`);
      if (!res.ok) {
        setErrorMessage('Unable to fetch sample CAS PDF from backend.');
        setParsing(false);
        return;
      }
      const blob = await res.blob();
      const sampleFile = new File(
        [blob],
        provider === 'cdsl' ? 'sample-cdsl-cas.pdf' : 'sample-nsdl-cas.pdf',
        { type: 'application/pdf' }
      );
      setSelectedFile(sampleFile);
      await submitPdfFile(sampleFile, '');
    } catch {
      setErrorMessage('Failed to load sample CAS PDF.');
      setParsing(false);
    }
  };

  const handleCommit = async () => {
    if (!parsedResult || newTransactions.length === 0) return;
    setCommitting(true);
    try {
      const summary = await onCommitTransactions(newTransactions);
      setCommitBanner(summary);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div
      data-testid="cas-pdf-parser-card"
      className="rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 font-display font-semibold text-base text-[#090e1a] dark:text-white">
            <FileText className="w-4 h-4 text-[#2563eb] dark:text-[#60a5fa]" />
            NSDL / CDSL CAS PDF Statement Parser
          </div>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
            In-memory backend PDF extraction with password decryption, PII masking, Decimal.js
            opening/closing unit reconciliation, and idempotent Firestore ledger sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={parsing}
            onClick={() => void handleSamplePdfParse('nsdl')}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a] text-[#090e1a] dark:text-[#f8fafc] px-3 py-1.5 text-xs font-medium hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition disabled:opacity-50 cursor-pointer"
          >
            Parse Sample NSDL CAS PDF
          </button>
          <button
            type="button"
            disabled={parsing}
            onClick={() => void handleSamplePdfParse('cdsl')}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a] text-[#090e1a] dark:text-[#f8fafc] px-3 py-1.5 text-xs font-medium hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition disabled:opacity-50 cursor-pointer"
          >
            Parse Sample CDSL CAS PDF
          </button>
          <a
            href="/api/portfolio/cas/sample-pdf?provider=nsdl"
            download="financia-sample-nsdl-cas.pdf"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2563eb] dark:text-[#60a5fa] hover:underline px-1.5 py-1"
          >
            <Download className="w-3.5 h-3.5" />
            Sample .pdf
          </a>
        </div>
      </div>

      {/* Upload Dropzone & Optional Password Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
        <label className="lg:col-span-2 flex flex-col items-center justify-center border border-dashed border-[#cbd5e1] dark:border-[#334155] rounded-[10px] p-5 text-center cursor-pointer hover:bg-[#f8fafc] dark:hover:bg-[#1e293b]/50 transition">
          {parsing ? (
            <Loader2 className="w-5 h-5 text-[#2563eb] animate-spin mb-2" />
          ) : (
            <Upload className="w-5 h-5 text-[#2563eb] dark:text-[#60a5fa] mb-2" />
          )}
          <span className="text-xs font-semibold text-[#090e1a] dark:text-white">
            {parsing
              ? 'Extracting & Reconciling CAS PDF…'
              : selectedFile
                ? `Selected: ${selectedFile.name}`
                : 'Upload NSDL, CDSL, or CAMS/KFintech CAS PDF (max 10 MB)'}
          </span>
          <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
            Processed strictly in volatile memory · Zero disk storage · PAN &amp; Folios auto-masked
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload NSDL or CDSL CAS PDF file"
          />
        </label>

        <div
          className={`rounded-[10px] border p-4 flex flex-col justify-between ${
            needsPassword
              ? 'border-[#f59e0b] bg-[#fffbeb] dark:bg-[#451a03]/30'
              : 'border-[#e2e8f0] dark:border-[#1f2937] bg-[#f8fafc] dark:bg-[#0f172a]'
          }`}
        >
          <div>
            <label
              htmlFor="cas-pdf-password"
              className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#475569] dark:text-[#94a3b8] mb-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              CAS PDF Password (Optional)
            </label>
            <input
              id="cas-pdf-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PAN (uppercase) or DDMMYYYY"
              autoComplete="off"
              className="w-full rounded-[8px] border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#090d16] px-3 py-2 text-xs font-mono text-[#090e1a] dark:text-white focus:outline-none focus:border-[#2563eb]"
            />
          </div>
          <div className="flex items-center justify-between gap-2 mt-3">
            <span className="inline-flex items-center gap-1 text-[10.5px] text-[#64748b] dark:text-[#94a3b8]">
              <Lock className="w-3 h-3" />
              Never logged or saved
            </span>
            {selectedFile && (
              <button
                type="button"
                disabled={parsing}
                onClick={() => void submitPdfFile(selectedFile, password)}
                className="rounded-[6px] bg-[#090e1a] dark:bg-white text-white dark:text-[#090e1a] px-2.5 py-1 text-[11px] font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                Re-Parse PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-[8px] bg-[#fef2f2] dark:bg-[#450a0a]/50 border border-[#fecaca] dark:border-[#7f1d1d] p-3 text-xs text-[#b91c1c] dark:text-[#fca5a5]"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Commit Confirmation Banner */}
      {commitBanner && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-[8px] bg-[#f0fdf4] dark:bg-[#052e16]/50 border border-[#bbf7d0] dark:border-[#065f46] p-3 text-xs text-[#15803d] dark:text-[#34d399]"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Committed <strong>{commitBanner.added}</strong> CAS transactions to the immutable
            portfolio ledger
            {isCloudSignedIn ? ' and synced to Firestore' : ''} ({commitBanner.duplicates}{' '}
            duplicates skipped).
          </span>
        </div>
      )}

      {/* Structured Pre-Commit Reconciliation Preview */}
      {parsedResult && (
        <div
          data-testid="cas-parse-preview"
          className="mt-5 rounded-[10px] border border-[#e2e8f0] dark:border-[#1f2937] bg-[#f8fafc] dark:bg-[#0b1120] p-4"
        >
          {/* Metadata & Audit Summary Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e2e8f0] dark:border-[#1f2937]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#dbeafe] dark:bg-[#1e3a8a]/50 text-[#1d4ed8] dark:text-[#93c5fd] px-2.5 py-1 font-mono font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                {PROVIDER_LABELS[parsedResult.statementMeta.provider]}
              </span>
              {parsedResult.statementMeta.statementPeriod.from &&
                parsedResult.statementMeta.statementPeriod.to && (
                  <span className="font-mono text-[#475569] dark:text-[#94a3b8]">
                    {parsedResult.statementMeta.statementPeriod.from} →{' '}
                    {parsedResult.statementMeta.statementPeriod.to}
                  </span>
                )}
              {parsedResult.statementMeta.maskedPan && (
                <span className="font-mono text-[#475569] dark:text-[#94a3b8]">
                  PAN {parsedResult.statementMeta.maskedPan}
                </span>
              )}
              {parsedResult.statementMeta.maskedAccountId && (
                <span className="font-mono text-[#475569] dark:text-[#94a3b8]">
                  ID {parsedResult.statementMeta.maskedAccountId}
                </span>
              )}
              <span className="font-mono text-[#64748b] dark:text-[#94a3b8]">
                {parsedResult.statementMeta.pageCount}p · Stamp Duty{' '}
                {formatInr(parsedResult.reconciliation.stampDutyTotal)} · STT{' '}
                {formatInr(parsedResult.reconciliation.sttTotal)}
              </span>
            </div>

            <button
              type="button"
              disabled={committing || syncingCloud || newTransactions.length === 0}
              onClick={() => void handleCommit()}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#059669] hover:bg-[#047857] text-white px-4 py-2 text-xs font-semibold transition disabled:opacity-45 cursor-pointer"
            >
              {committing || syncingCloud ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {newTransactions.length > 0
                ? `Commit ${newTransactions.length} New Transactions to Portfolio`
                : 'All Extracted Transactions Already in Ledger'}
            </button>
          </div>

          {/* Per-Folio Decimal Balance Reconciliation Grid */}
          {parsedResult.reconciliation.folios.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8] mb-2">
                Folio Unit Reconciliation ({parsedResult.reconciliation.matchedFolios}/
                {parsedResult.reconciliation.totalFolios} Matched ·{' '}
                {parsedResult.reconciliation.driftFolios} Drift)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {parsedResult.reconciliation.folios.map((folio, idx) => (
                  <div
                    key={`${folio.isin}-${folio.folioMasked}-${idx}`}
                    className="rounded-[8px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#090e1a] dark:text-white truncate">
                        {folio.symbol}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          folio.status === 'MATCHED'
                            ? 'bg-[#dcfce7] text-[#15803d] dark:bg-[#052e16] dark:text-[#34d399]'
                            : folio.status === 'DRIFT'
                              ? 'bg-[#fef2f2] text-[#b91c1c] dark:bg-[#450a0a] dark:text-[#fca5a5]'
                              : 'bg-[#f1f5f9] text-[#475569] dark:bg-[#1e293b] dark:text-[#94a3b8]'
                        }`}
                      >
                        {folio.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] truncate mt-0.5">
                      {folio.schemeName}
                    </div>
                    <div className="mt-2 flex items-center justify-between font-mono text-[10.5px] text-[#475569] dark:text-[#94a3b8]">
                      <span>Folio {folio.folioMasked}</span>
                      <span>{folio.transactionCount} tx</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between font-mono text-[10.5px] text-[#090e1a] dark:text-[#e2e8f0]">
                      <span>Closing {folio.computedClosingUnits} u</span>
                      {folio.unitDrift && (
                        <span className="text-[#64748b] dark:text-[#94a3b8]">
                          Δ {folio.unitDrift}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Transaction Table Preview */}
          <div className="mt-4 overflow-x-auto rounded-[8px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] dark:border-[#1f2937] bg-[#f8fafc] dark:bg-[#0f172a] text-[10.5px] font-mono uppercase text-[#64748b] dark:text-[#94a3b8]">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Symbol / ISIN</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3 text-right">Units</th>
                  <th className="py-2 px-3 text-right">NAV</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#1f2937] font-mono tabular-nums">
                {parsedResult.transactions.slice(0, 20).map((tx) => {
                  const alreadyExists = existingKeys.has(tx.idempotencyKey);
                  return (
                    <tr key={tx.idempotencyKey}>
                      <td className="py-2 px-3 text-[#475569] dark:text-[#94a3b8]">{tx.tradeDate}</td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-[#090e1a] dark:text-white">
                          {tx.symbol}
                        </span>
                        {tx.isin && (
                          <span className="ml-1.5 text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                            {tx.isin}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-[#f1f5f9] dark:bg-[#1e293b] text-[10px] text-[#334155] dark:text-[#cbd5e1]">
                          {tx.txType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-[#334155] dark:text-[#cbd5e1]">
                        {tx.units}
                      </td>
                      <td className="py-2 px-3 text-right text-[#334155] dark:text-[#cbd5e1]">
                        ₹{tx.price}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-[#090e1a] dark:text-white">
                        {formatInr(tx.amount)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {alreadyExists ? (
                          <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                            Duplicate
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-[#059669] dark:text-[#10b981]">
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {parsedResult.transactions.length > 20 && (
              <div className="px-3 py-2 text-[11px] font-mono text-[#64748b] dark:text-[#94a3b8] border-t border-[#e2e8f0] dark:border-[#1f2937]">
                Showing first 20 of {parsedResult.transactions.length} extracted transactions (
                {duplicateCount} duplicates skipped).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
