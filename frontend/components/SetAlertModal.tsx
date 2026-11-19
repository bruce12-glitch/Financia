import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Trash2, X } from 'lucide-react';
import {
  AlertCondition,
  computeTargetPercentDelta,
  PriceAlert,
  validatePriceAlertInput,
} from '../utils/alertEngine';
import { formatSignedPercent } from '../utils/marketCalculations';

export interface AlertTargetAsset {
  ticker: string;
  name: string;
  currentPrice: number;
  unit?: string;
}

interface SetAlertModalProps {
  target: AlertTargetAsset | null;
  alerts: PriceAlert[];
  onClose: () => void;
  onSaveAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlertNotification: (id: string) => void;
}

export const SetAlertModal: React.FC<SetAlertModalProps> = ({
  target,
  alerts,
  onClose,
  onSaveAlert,
  onDeleteAlert,
  onToggleAlertNotification,
}) => {
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [thresholdInput, setThresholdInput] = useState<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    const defaultTarget = (target.currentPrice * 1.05).toFixed(2);
    setCondition('above');
    setThresholdInput(defaultTarget);
    setNotificationsEnabled(true);
    setNote('');
    setError(null);
    setSavedNotice(null);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  const tickerAlerts = useMemo(() => {
    if (!target) return [];
    return alerts.filter((a) => a.ticker === target.ticker);
  }, [alerts, target]);

  if (!target) return null;

  const currencyPrefix = target.unit?.includes('INR') ? '₹' : target.unit && target.unit !== 'USD' ? `${target.unit} ` : '$';
  const parsedVal = Number(thresholdInput.replace(/,/g, ''));
  const liveDeltaPct =
    Number.isFinite(parsedVal) && parsedVal > 0
      ? computeTargetPercentDelta(target.currentPrice, parsedVal)
      : null;

  const applyPercentOffset = (pct: number) => {
    const nextPrice = (target.currentPrice * (1 + pct / 100)).toFixed(2);
    setThresholdInput(nextPrice);
    setCondition(pct >= 0 ? 'above' : 'below');
    setError(null);
    setSavedNotice(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePriceAlertInput({
      targetPriceRaw: thresholdInput,
      currentPrice: target.currentPrice,
    });

    if (!validation.valid || validation.parsedPrice === undefined) {
      setError(validation.error || 'Enter a valid positive target price.');
      setSavedNotice(null);
      return;
    }

    setError(null);
    onSaveAlert({
      ticker: target.ticker,
      companyName: target.name,
      currentPriceAtSet: target.currentPrice,
      targetPrice: validation.parsedPrice,
      condition,
      notificationsEnabled,
      note: note.trim() || undefined,
    });

    setSavedNotice(
      `Alert armed for ${target.ticker} ${condition === 'above' ? 'above' : 'below'} ${currencyPrefix}${validation.parsedPrice.toFixed(2)}`
    );
    setNote('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Set price alert for ${target.ticker}`}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-6"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white text-[#131722] p-6 shadow-2xl border border-[#E0E3EB] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#F0F3FA]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#2962FF] flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-display font-bold text-[#131722]">
                Set price alert · {target.ticker}
              </h3>
              <p className="text-xs text-[#787B86] tabular-nums">
                {target.name} · Current spot{' '}
                <span className="font-mono font-semibold text-[#131722]">
                  {currencyPrefix}
                  {target.currentPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert modal"
            className="p-1.5 rounded-lg hover:bg-[#F0F3FA] text-[#787B86] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
          {/* Condition Segmented Toggle */}
          <div>
            <span className="block text-xs font-semibold text-[#131722] mb-1.5">
              Trigger condition
            </span>
            <div
              role="group"
              aria-label="Alert trigger condition"
              className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#F0F3FA]"
            >
              {(['above', 'below'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setCondition(dir)}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    condition === dir
                      ? 'bg-[#131722] text-white'
                      : 'text-[#434651] hover:text-[#131722]'
                  }`}
                >
                  {dir === 'above' ? 'Crosses Above' : 'Crosses Below'}
                </button>
              ))}
            </div>
          </div>

          {/* Target Price Threshold Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="alert-threshold-input" className="text-xs font-semibold text-[#131722]">
                Target price threshold
              </label>
              {liveDeltaPct !== null && (
                <span
                  className={`text-xs font-mono tabular-nums font-semibold ${
                    liveDeltaPct >= 0 ? 'text-[#089981]' : 'text-[#F23645]'
                  }`}
                >
                  {formatSignedPercent(liveDeltaPct)} from spot
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-mono text-[#787B86] select-none">
                {currencyPrefix.trim()}
              </span>
              <input
                id="alert-threshold-input"
                type="number"
                step="any"
                min="0"
                value={thresholdInput}
                onChange={(e) => {
                  setThresholdInput(e.target.value);
                  if (error) setError(null);
                  if (savedNotice) setSavedNotice(null);
                }}
                placeholder="Enter target price..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E0E3EB] font-mono text-sm text-[#131722] tabular-nums focus:outline-none focus:border-[#2962FF]"
              />
            </div>

            {/* Quick Percentage Offset Buttons */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[#787B86] mr-1">Quick offset:</span>
              {[-5, -2, 2, 5, 10].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyPercentOffset(pct)}
                  className="px-2.5 py-1 rounded-md bg-[#F0F3FA] hover:bg-[#E0E3EB] text-xs font-mono font-medium text-[#131722] transition-colors cursor-pointer"
                >
                  {pct > 0 ? `+${pct}%` : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Toggle Switch */}
          <div className="flex items-center justify-between gap-4 py-3 border-y border-[#F0F3FA]">
            <div>
              <div className="text-xs font-semibold text-[#131722]">
                Instant alert notifications
              </div>
              <div className="text-xs text-[#787B86] mt-0.5">
                {notificationsEnabled
                  ? 'Show real-time in-app banner when threshold is reached'
                  : 'Notifications muted — alert saved silently'}
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              aria-label="Enable alert notifications"
              onClick={() => setNotificationsEnabled((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                notificationsEnabled ? 'bg-[#2962FF]' : 'bg-[#D1D5DB]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="alert-note-input" className="block text-xs font-semibold text-[#131722] mb-1.5">
              Alert note (optional)
            </label>
            <input
              id="alert-note-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Gold BeES breakout or Gilt yield support"
              className="w-full px-3.5 py-2 rounded-lg border border-[#E0E3EB] text-xs text-[#131722] placeholder-[#9598A1] focus:outline-none focus:border-[#2962FF]"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-[#F23645]">
              {error}
            </p>
          )}

          {savedNotice && (
            <div
              role="status"
              className="flex items-center gap-2 text-xs font-medium text-[#089981]"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#E0E3EB] text-xs font-semibold text-[#434651] hover:bg-[#F8F9FD] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#2962FF] hover:bg-[#1E53E5] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Create Price Alert
            </button>
          </div>
        </form>

        {/* Active Alerts List for this Ticker */}
        {tickerAlerts.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#F0F3FA]">
            <div className="text-xs font-semibold text-[#131722] mb-2.5">
              Active alerts for {target.ticker} ({tickerAlerts.length})
            </div>
            <div className="divide-y divide-[#F0F3FA]">
              {tickerAlerts.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-[#131722] tabular-nums">
                      {item.condition === 'above' ? 'Above' : 'Below'} {currencyPrefix}
                      {item.targetPrice.toFixed(2)}
                      {item.triggered && (
                        <span className="ml-2 text-[#089981] font-sans">· Triggered</span>
                      )}
                    </div>
                    {item.note && (
                      <div className="text-[#787B86] truncate mt-0.5">{item.note}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleAlertNotification(item.id)}
                      aria-label={
                        item.notificationsEnabled
                          ? `Mute alert for ${item.ticker} at ${item.targetPrice}`
                          : `Enable notifications for ${item.ticker} at ${item.targetPrice}`
                      }
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        item.notificationsEnabled
                          ? 'text-[#2962FF] bg-[#EEF2FF]'
                          : 'text-[#787B86] bg-[#F0F3FA]'
                      }`}
                    >
                      {item.notificationsEnabled ? (
                        <Bell className="w-3.5 h-3.5" />
                      ) : (
                        <BellOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteAlert(item.id)}
                      aria-label={`Delete alert for ${item.ticker} at ${item.targetPrice}`}
                      className="p-1.5 rounded-md text-[#787B86] hover:text-[#F23645] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
