import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Play,
  RotateCcw,
  Sliders,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AlertCondition,
  computeTargetPercentDelta,
  PriceAlert,
  validatePriceAlertInput,
} from '../utils/alertEngine';
import {
  ALERT_PRIORITY_META,
  ALERT_SOUND_CATALOG,
  AlertAudioPreferences,
  AlertPriority,
  AlertSoundProfile,
  DEFAULT_ALERT_AUDIO_PREFS,
  normalizeAlertPriority,
  playAlertSoundProfile,
  resolveSoundForPriority,
} from '../utils/alertSoundEngine';
import { formatSignedPercent } from '../utils/marketCalculations';

export interface AlertTargetAsset {
  ticker: string;
  name: string;
  currentPrice: number;
  unit?: string;
  initialTab?: 'alert' | 'audio';
}

interface SetAlertModalProps {
  target: AlertTargetAsset | null;
  alerts: PriceAlert[];
  audioPrefs: AlertAudioPreferences;
  onUpdateAudioPrefs: (next: AlertAudioPreferences) => void;
  onClose: () => void;
  onSaveAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlertNotification: (id: string) => void;
}

const PRIORITY_LEVELS: AlertPriority[] = ['low', 'medium', 'high'];
const SOUND_PROFILE_LIST: AlertSoundProfile[] = [
  'glass_pulse',
  'marimba_fifth',
  'vault_chime',
  'sonar_ping',
  'muted',
];

export const SetAlertModal: React.FC<SetAlertModalProps> = ({
  target,
  alerts,
  audioPrefs,
  onUpdateAudioPrefs,
  onClose,
  onSaveAlert,
  onDeleteAlert,
  onToggleAlertNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'alert' | 'audio'>('alert');
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [priority, setPriority] = useState<AlertPriority>('medium');
  const [thresholdInput, setThresholdInput] = useState<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [playingProfileId, setPlayingProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    const defaultTarget = (target.currentPrice * 1.05).toFixed(2);
    setActiveTab(target.initialTab || 'alert');
    setCondition('above');
    setPriority('medium');
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

  const currencyPrefix = target.unit?.includes('INR')
    ? '₹'
    : target.unit && target.unit !== 'USD'
      ? `${target.unit} `
      : '$';
  const parsedVal = Number(thresholdInput.replace(/,/g, ''));
  const liveDeltaPct =
    Number.isFinite(parsedVal) && parsedVal > 0
      ? computeTargetPercentDelta(target.currentPrice, parsedVal)
      : null;

  const triggerPreviewTone = (profile: AlertSoundProfile, key: string) => {
    if (profile === 'muted') return;
    playAlertSoundProfile(profile, audioPrefs.volume);
    setPlayingProfileId(key);
    window.setTimeout(() => {
      setPlayingProfileId((curr) => (curr === key ? null : curr));
    }, 520);
  };

  const applyPercentOffset = (pct: number) => {
    const nextPrice = (target.currentPrice * (1 + pct / 100)).toFixed(2);
    setThresholdInput(nextPrice);
    setCondition(pct >= 0 ? 'above' : 'below');
    setError(null);
    setSavedNotice(null);
  };

  const updatePriorityRule = (
    level: AlertPriority,
    patch: Partial<{ enabled: boolean; sound: AlertSoundProfile }>
  ) => {
    onUpdateAudioPrefs({
      ...audioPrefs,
      priorities: {
        ...audioPrefs.priorities,
        [level]: {
          ...audioPrefs.priorities[level],
          ...patch,
        },
      },
    });
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
      priority,
      notificationsEnabled,
      note: note.trim() || undefined,
    });

    const routeDecision = resolveSoundForPriority(priority, audioPrefs);
    if (notificationsEnabled && routeDecision.shouldPlay) {
      playAlertSoundProfile(routeDecision.profile, routeDecision.effectiveVolume);
    }

    const priorityLabel = ALERT_PRIORITY_META[priority].label;
    setSavedNotice(
      `${priorityLabel} alert armed for ${target.ticker} ${condition === 'above' ? 'above' : 'below'} ${currencyPrefix}${validation.parsedPrice.toFixed(2)}`
    );
    setNote('');
  };

  const selectedRoute = resolveSoundForPriority(priority, audioPrefs);
  const selectedSoundEntry = ALERT_SOUND_CATALOG[selectedRoute.profile];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Price alert and acoustic routing for ${target.ticker}`}
      data-testid="set-alert-modal"
      className="fixed inset-0 z-50 bg-[#040711]/75 backdrop-blur-md flex items-center justify-center px-4 py-6"
    >
      <div className="w-full max-w-xl rounded-[14px] bg-white text-[#0f172a] shadow-2xl border border-[#cbd5e1] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Obsidian Institutional Header */}
        <div className="bg-[#050914] text-white px-6 py-4 border-b border-white/[0.1] shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-[10px] bg-white/[0.08] border border-white/[0.12] text-[#38bdf8] flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#93c5fd] uppercase tracking-wider">
                  <span>Desk Alert Engine</span>
                  <span aria-hidden="true">·</span>
                  <span>{audioPrefs.masterEnabled ? 'Acoustic Active' : 'Audio Muted'}</span>
                </div>
                <h3 className="text-[17px] font-display font-semibold text-white truncate">
                  {target.ticker} · {target.name}
                </h3>
                <p className="text-xs text-[#94a3b8] tabular-nums mt-0.5">
                  Reference spot{' '}
                  <span className="font-mono font-semibold text-white">
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
              className="p-1.5 rounded-lg hover:bg-white/[0.1] text-[#94a3b8] hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Modal Tabs: Create Alert vs Priority Audio Routing */}
          <div
            role="tablist"
            aria-label="Alert configuration panels"
            className="mt-4 grid grid-cols-2 gap-1.5 p-1 rounded-[10px] bg-white/[0.06] border border-white/[0.08]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'alert'}
              data-testid="alert-tab-create"
              onClick={() => setActiveTab('alert')}
              className={`py-2 px-3 rounded-[7px] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'alert'
                  ? 'bg-[#2563eb] text-white font-semibold'
                  : 'text-[#cbd5e1] hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Arm Price Alert</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'audio'}
              data-testid="alert-tab-audio"
              onClick={() => setActiveTab('audio')}
              className={`py-2 px-3 rounded-[7px] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'audio'
                  ? 'bg-[#2563eb] text-white font-semibold'
                  : 'text-[#cbd5e1] hover:text-white'
              }`}
            >
              {audioPrefs.masterEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span>Priority Audio Routing</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'alert' ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Condition Segmented Toggle */}
                <div>
                  <span className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                    Trigger condition
                  </span>
                  <div
                    role="group"
                    aria-label="Alert trigger condition"
                    className="grid grid-cols-2 gap-1.5 p-1 rounded-[10px] bg-[#f1f5f9] border border-[#e2e8f0]"
                  >
                    {(['above', 'below'] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setCondition(dir)}
                        className={`py-2 px-3 rounded-[7px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          condition === dir
                            ? 'bg-[#050914] text-white'
                            : 'text-[#475569] hover:text-[#0f172a]'
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
                    <label
                      htmlFor="alert-threshold-input"
                      className="text-xs font-semibold text-[#0f172a]"
                    >
                      Target threshold
                    </label>
                    {liveDeltaPct !== null && (
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold ${
                          liveDeltaPct >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                        }`}
                      >
                        {formatSignedPercent(liveDeltaPct)} from spot
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-sm font-mono text-[#64748b] select-none">
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
                      className="w-full pl-9 pr-4 py-2.5 rounded-[10px] border border-[#cbd5e1] font-mono text-sm text-[#0f172a] tabular-nums focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  {/* Quick Percentage Offset Buttons */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[#64748b] mr-1">Quick offset:</span>
                    {[-5, -2, 2, 5, 10].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyPercentOffset(pct)}
                        className="px-2.5 py-1 rounded-[6px] bg-[#f8fafc] hover:bg-[#e2e8f0] border border-[#e2e8f0] text-xs font-mono font-medium text-[#0f172a] transition-colors cursor-pointer"
                      >
                        {pct > 0 ? `+${pct}%` : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alert Priority Selector + Acoustic Preview */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-[#0f172a]">
                      Alert priority &amp; acoustic tier
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('audio')}
                      className="text-[11px] font-medium text-[#2563eb] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Configure sounds</span>
                    </button>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Alert priority tier"
                    className="grid grid-cols-3 gap-2"
                  >
                    {PRIORITY_LEVELS.map((level) => {
                      const meta = ALERT_PRIORITY_META[level];
                      const routed = resolveSoundForPriority(level, audioPrefs);
                      const soundLabel = ALERT_SOUND_CATALOG[routed.profile].label;
                      const isSelected = priority === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          data-testid={`alert-priority-${level}`}
                          onClick={() => setPriority(level)}
                          className={`p-3 rounded-[10px] border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#050914] text-white border-[#050914] shadow-sm'
                              : 'bg-[#f8fafc] text-[#0f172a] border-[#e2e8f0] hover:border-[#94a3b8]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: meta.accentHex }}
                            />
                            <span
                              className={`text-[10px] font-mono ${
                                isSelected ? 'text-[#93c5fd]' : 'text-[#64748b]'
                              }`}
                            >
                              {routed.shouldPlay ? soundLabel : 'Silent'}
                            </span>
                          </div>
                          <div className="text-xs font-semibold leading-tight">{meta.label}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Acoustic Cue Readout + Inline Preview */}
                  <div className="mt-2 px-3 py-2 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between gap-3">
                    <div className="text-[11px] text-[#475569] min-w-0 truncate">
                      <span className="font-semibold text-[#0f172a]">
                        {ALERT_PRIORITY_META[priority].label} cue:
                      </span>{' '}
                      {selectedRoute.shouldPlay
                        ? `${selectedSoundEntry.label} — ${selectedSoundEntry.character}`
                        : 'Visual banner only (acoustic cue muted for this tier)'}
                    </div>
                    <button
                      type="button"
                      disabled={!selectedRoute.shouldPlay}
                      onClick={() =>
                        triggerPreviewTone(selectedRoute.profile, `selected-${priority}`)
                      }
                      className="px-2.5 py-1 rounded-[6px] bg-white hover:bg-[#eff6ff] disabled:opacity-45 border border-[#cbd5e1] text-[11px] font-mono font-semibold text-[#0f172a] inline-flex items-center gap-1 shrink-0 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    >
                      <Play className="w-3 h-3 text-[#2563eb]" />
                      <span>
                        {playingProfileId === `selected-${priority}` ? 'Playing' : 'Preview'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Notification Toggle Switch */}
                <div className="flex items-center justify-between gap-4 py-3 border-y border-[#e2e8f0]">
                  <div>
                    <div className="text-xs font-semibold text-[#0f172a]">
                      Real-time banner &amp; acoustic trigger
                    </div>
                    <div className="text-xs text-[#64748b] mt-0.5">
                      {notificationsEnabled
                        ? 'Emit desk toast and priority tone when threshold crosses'
                        : 'Silently log trigger without banner or acoustic cue'}
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={notificationsEnabled}
                    aria-label="Enable alert notifications"
                    onClick={() => setNotificationsEnabled((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      notificationsEnabled ? 'bg-[#2563eb]' : 'bg-[#cbd5e1]'
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
                  <label
                    htmlFor="alert-note-input"
                    className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                  >
                    Desk memo (optional)
                  </label>
                  <input
                    id="alert-note-input"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g., Rebalance Direct Flexi Cap SIP or hedge spot gold breakout"
                    className="w-full px-3.5 py-2 rounded-[10px] border border-[#cbd5e1] text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb]"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-xs font-medium text-[#dc2626]">
                    {error}
                  </p>
                )}

                {savedNotice && (
                  <div
                    role="status"
                    className="flex items-center gap-2 text-xs font-medium text-[#059669]"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{savedNotice}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-[8px] border border-[#cbd5e1] text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Arm Price Alert
                  </button>
                </div>
              </form>

              {/* Active Alerts List for this Ticker */}
              {tickerAlerts.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[#e2e8f0]">
                  <div className="text-xs font-semibold text-[#0f172a] mb-2.5">
                    Armed alerts for {target.ticker} ({tickerAlerts.length})
                  </div>
                  <div className="divide-y divide-[#f1f5f9]">
                    {tickerAlerts.map((item) => {
                      const level = normalizeAlertPriority(item.priority);
                      const pMeta = ALERT_PRIORITY_META[level];
                      return (
                        <div
                          key={item.id}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5 font-mono font-semibold text-[#0f172a] tabular-nums">
                              <span>
                                {item.condition === 'above' ? 'Above' : 'Below'} {currencyPrefix}
                                {item.targetPrice.toFixed(2)}
                              </span>
                              <span className="text-[#cbd5e1]">·</span>
                              <span
                                className="font-sans text-[11px] font-semibold"
                                style={{ color: pMeta.accentHex }}
                              >
                                {pMeta.label}
                              </span>
                              {item.triggered && (
                                <>
                                  <span className="text-[#cbd5e1]">·</span>
                                  <span className="text-[#059669] font-sans">Triggered</span>
                                </>
                              )}
                            </div>
                            {item.note && (
                              <div className="text-[#64748b] truncate mt-0.5">{item.note}</div>
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
                                  ? 'text-[#2563eb] bg-[#eff6ff]'
                                  : 'text-[#64748b] bg-[#f1f5f9]'
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
                              className="p-1.5 rounded-md text-[#64748b] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Priority Acoustic Notification Studio Panel */
            <div className="space-y-5" data-testid="audio-routing-panel">
              {/* Master Audio Switch + Desk Gain Control */}
              <div className="rounded-[12px] bg-[#050914] text-white p-4 border border-white/[0.08]">
                <div className="flex items-center justify-between gap-4 pb-3.5 border-b border-white/[0.1]">
                  <div>
                    <div className="text-sm font-display font-semibold text-white">
                      Institutional Acoustic Synthesis
                    </div>
                    <div className="text-xs text-[#94a3b8] mt-0.5">
                      Low-pass filtered Web Audio harmonics — engineered for quiet desk focus.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={audioPrefs.masterEnabled}
                    aria-label="Master price alert audio toggle"
                    data-testid="audio-master-toggle"
                    onClick={() =>
                      onUpdateAudioPrefs({
                        ...audioPrefs,
                        masterEnabled: !audioPrefs.masterEnabled,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      audioPrefs.masterEnabled ? 'bg-[#38bdf8]' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        audioPrefs.masterEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Subtle Gain Slider */}
                <div className="pt-3.5 flex items-center gap-4">
                  <label
                    htmlFor="desk-audio-volume"
                    className="text-xs font-mono text-[#cbd5e1] whitespace-nowrap shrink-0"
                  >
                    Desk gain
                  </label>
                  <input
                    id="desk-audio-volume"
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    disabled={!audioPrefs.masterEnabled}
                    value={audioPrefs.volume}
                    onChange={(e) =>
                      onUpdateAudioPrefs({
                        ...audioPrefs,
                        volume: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-[#38bdf8] cursor-pointer disabled:opacity-40"
                  />
                  <span className="text-xs font-mono font-semibold text-white tabular-nums w-10 text-right">
                    {Math.round(audioPrefs.volume * 100)}%
                  </span>
                </div>
              </div>

              {/* Per-Priority Acoustic Routing Rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0f172a]">
                    Sound signature per alert priority
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateAudioPrefs(DEFAULT_ALERT_AUDIO_PREFS)}
                    className="text-[11px] font-medium text-[#64748b] hover:text-[#0f172a] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset defaults</span>
                  </button>
                </div>

                {PRIORITY_LEVELS.map((level) => {
                  const meta = ALERT_PRIORITY_META[level];
                  const rule = audioPrefs.priorities[level];
                  const activeSound = ALERT_SOUND_CATALOG[rule.sound];
                  const effectivelyActive =
                    audioPrefs.masterEnabled && rule.enabled && rule.sound !== 'muted';

                  return (
                    <div
                      key={level}
                      data-testid={`audio-priority-row-${level}`}
                      className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: meta.accentHex }}
                            />
                            <span className="text-sm font-display font-semibold text-[#0f172a]">
                              {meta.label}
                            </span>
                            <span className="text-[11px] font-mono text-[#64748b]">
                              · {effectivelyActive ? activeSound.label : 'Muted'}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-[#64748b] mt-0.5 leading-snug">
                            {meta.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={rule.enabled}
                          aria-label={`Toggle ${meta.label} priority audio`}
                          data-testid={`audio-toggle-${level}`}
                          disabled={!audioPrefs.masterEnabled}
                          onClick={() => updatePriorityRule(level, { enabled: !rule.enabled })}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                            rule.enabled && audioPrefs.masterEnabled ? 'bg-[#050914]' : 'bg-[#cbd5e1]'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                              rule.enabled && audioPrefs.masterEnabled
                                ? 'translate-x-[18px]'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Sound Profile Selector + Live Preview */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {SOUND_PROFILE_LIST.map((profileId) => {
                            const entry = ALERT_SOUND_CATALOG[profileId];
                            const selected = rule.sound === profileId;
                            return (
                              <button
                                key={profileId}
                                type="button"
                                disabled={!audioPrefs.masterEnabled || !rule.enabled}
                                onClick={() => {
                                  updatePriorityRule(level, { sound: profileId });
                                  if (profileId !== 'muted') {
                                    triggerPreviewTone(profileId, `${level}-${profileId}`);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-[7px] text-[11px] font-medium border transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap ${
                                  selected
                                    ? 'bg-[#2563eb] text-white border-[#2563eb]'
                                    : 'bg-white text-[#334155] border-[#cbd5e1] hover:border-[#64748b]'
                                }`}
                              >
                                {entry.label}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          disabled={!effectivelyActive}
                          onClick={() => triggerPreviewTone(rule.sound, `row-${level}`)}
                          data-testid={`audio-preview-${level}`}
                          className="px-2.5 py-1 rounded-[7px] bg-[#050914] hover:bg-[#1e293b] disabled:opacity-40 text-white text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0 transition-colors"
                        >
                          <Play className="w-3 h-3 text-[#38bdf8]" />
                          <span>{playingProfileId === `row-${level}` ? 'Playing' : 'Test'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setActiveTab('alert')}
                  className="px-4 py-2 rounded-[8px] border border-[#cbd5e1] text-xs font-semibold text-[#0f172a] hover:bg-[#f8fafc] cursor-pointer"
                >
                  Back to Alert Form
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-[8px] bg-[#050914] hover:bg-[#1e293b] text-white text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
