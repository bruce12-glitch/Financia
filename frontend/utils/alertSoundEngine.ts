export type AlertPriority = 'low' | 'medium' | 'high';

export type AlertSoundProfile =
  | 'glass_pulse'
  | 'marimba_fifth'
  | 'vault_chime'
  | 'sonar_ping'
  | 'muted';

export interface PrioritySoundRule {
  enabled: boolean;
  sound: AlertSoundProfile;
}

export interface AlertAudioPreferences {
  masterEnabled: boolean;
  volume: number; // 0.05 to 1.0 (institutional subtle scaling applied inside synth)
  priorities: Record<AlertPriority, PrioritySoundRule>;
}

export interface AcousticNoteSpec {
  frequencyHz: number;
  delaySec: number;
  durationSec: number;
  gain: number;
  type: OscillatorType;
  harmonicRatio?: number;
  harmonicGain?: number;
}

export interface AlertSoundCatalogEntry {
  id: AlertSoundProfile;
  label: string;
  character: string;
  notes: AcousticNoteSpec[];
}

export const ALERT_AUDIO_STORAGE_KEY = 'financia_alert_audio_prefs_v1';

export const ALERT_PRIORITY_META: Record<
  AlertPriority,
  {
    label: string;
    shortLabel: string;
    description: string;
    accentHex: string;
    borderClass: string;
    textClass: string;
    bgClass: string;
  }
> = {
  low: {
    label: 'Advisory',
    shortLabel: 'Advisory',
    description: 'Soft ambient pulse for passive NAV drift or rebalancing levels',
    accentHex: '#38BDF8',
    borderClass: 'border-sky-400/40',
    textClass: 'text-sky-600',
    bgClass: 'bg-sky-500/10',
  },
  medium: {
    label: 'Watchlist',
    shortLabel: 'Watchlist',
    description: 'Warm dual-note harmonic for active target entries and spread triggers',
    accentHex: '#F59E0B',
    borderClass: 'border-amber-400/45',
    textClass: 'text-amber-600',
    bgClass: 'bg-amber-500/10',
  },
  high: {
    label: 'Desk Critical',
    shortLabel: 'Critical',
    description: 'Crisp three-tone resonant chime for stop-loss, breakout, or bullion alerts',
    accentHex: '#F43F5E',
    borderClass: 'border-rose-400/50',
    textClass: 'text-rose-600',
    bgClass: 'bg-rose-500/10',
  },
};

/**
 * Subtle, institutional-grade studio acoustic envelopes synthesized via Web Audio API.
 * Designed around musical fifths and soft sine/triangle envelopes — never harsh square alarms.
 */
export const ALERT_SOUND_CATALOG: Record<AlertSoundProfile, AlertSoundCatalogEntry> = {
  glass_pulse: {
    id: 'glass_pulse',
    label: 'Glass Pulse',
    character: 'Single muted crystal sine tone (528 Hz)',
    notes: [
      {
        frequencyHz: 528,
        delaySec: 0,
        durationSec: 0.28,
        gain: 0.16,
        type: 'sine',
        harmonicRatio: 2,
        harmonicGain: 0.03,
      },
    ],
  },
  marimba_fifth: {
    id: 'marimba_fifth',
    label: 'Marimba Fifth',
    character: 'Warm ascending perfect fifth (D5 → A5)',
    notes: [
      {
        frequencyHz: 587.33,
        delaySec: 0,
        durationSec: 0.22,
        gain: 0.18,
        type: 'triangle',
        harmonicRatio: 2,
        harmonicGain: 0.035,
      },
      {
        frequencyHz: 880.0,
        delaySec: 0.11,
        durationSec: 0.34,
        gain: 0.2,
        type: 'sine',
        harmonicRatio: 1.5,
        harmonicGain: 0.03,
      },
    ],
  },
  vault_chime: {
    id: 'vault_chime',
    label: 'Vault Chime',
    character: 'Institutional three-note triad (E5 → B5 → E6)',
    notes: [
      {
        frequencyHz: 659.25,
        delaySec: 0,
        durationSec: 0.2,
        gain: 0.19,
        type: 'sine',
        harmonicRatio: 2,
        harmonicGain: 0.04,
      },
      {
        frequencyHz: 987.77,
        delaySec: 0.1,
        durationSec: 0.24,
        gain: 0.21,
        type: 'sine',
        harmonicRatio: 2,
        harmonicGain: 0.035,
      },
      {
        frequencyHz: 1318.51,
        delaySec: 0.21,
        durationSec: 0.44,
        gain: 0.22,
        type: 'triangle',
        harmonicRatio: 1.5,
        harmonicGain: 0.025,
      },
    ],
  },
  sonar_ping: {
    id: 'sonar_ping',
    label: 'Sonar Ping',
    character: 'Low-profile desk ping with gentle echo (740 Hz)',
    notes: [
      {
        frequencyHz: 739.99,
        delaySec: 0,
        durationSec: 0.22,
        gain: 0.17,
        type: 'sine',
      },
      {
        frequencyHz: 739.99,
        delaySec: 0.24,
        durationSec: 0.3,
        gain: 0.09,
        type: 'sine',
      },
    ],
  },
  muted: {
    id: 'muted',
    label: 'Silent',
    character: 'Visual toast banner only — no acoustic cue',
    notes: [],
  },
};

export const DEFAULT_ALERT_AUDIO_PREFS: AlertAudioPreferences = {
  masterEnabled: true,
  volume: 0.65,
  priorities: {
    low: { enabled: true, sound: 'glass_pulse' },
    medium: { enabled: true, sound: 'marimba_fifth' },
    high: { enabled: true, sound: 'vault_chime' },
  },
};

export function normalizeAlertPriority(raw: unknown): AlertPriority {
  if (raw === 'low' || raw === 'medium' || raw === 'high') {
    return raw;
  }
  return 'medium';
}

export function normalizeSoundProfile(raw: unknown, fallback: AlertSoundProfile): AlertSoundProfile {
  if (
    raw === 'glass_pulse' ||
    raw === 'marimba_fifth' ||
    raw === 'vault_chime' ||
    raw === 'sonar_ping' ||
    raw === 'muted'
  ) {
    return raw;
  }
  return fallback;
}

export function sanitizeAudioPreferences(raw: unknown): AlertAudioPreferences {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_ALERT_AUDIO_PREFS,
      priorities: {
        low: { ...DEFAULT_ALERT_AUDIO_PREFS.priorities.low },
        medium: { ...DEFAULT_ALERT_AUDIO_PREFS.priorities.medium },
        high: { ...DEFAULT_ALERT_AUDIO_PREFS.priorities.high },
      },
    };
  }
  const obj = raw as Record<string, unknown>;
  const masterEnabled = typeof obj.masterEnabled === 'boolean' ? obj.masterEnabled : true;
  const rawVol = Number(obj.volume);
  const volume = Number.isFinite(rawVol) ? Math.min(1, Math.max(0.05, Number(rawVol.toFixed(2)))) : 0.65;
  const rawPriorities = (obj.priorities && typeof obj.priorities === 'object'
    ? obj.priorities
    : {}) as Record<string, Record<string, unknown> | undefined>;

  const resolveRule = (level: AlertPriority): PrioritySoundRule => {
    const def = DEFAULT_ALERT_AUDIO_PREFS.priorities[level];
    const candidate = rawPriorities[level];
    return {
      enabled: typeof candidate?.enabled === 'boolean' ? candidate.enabled : def.enabled,
      sound: normalizeSoundProfile(candidate?.sound, def.sound),
    };
  };

  return {
    masterEnabled,
    volume,
    priorities: {
      low: resolveRule('low'),
      medium: resolveRule('medium'),
      high: resolveRule('high'),
    },
  };
}

/**
 * Resolves the exact acoustic profile and effective gain to play for a given alert priority.
 */
export function resolveSoundForPriority(
  priority: AlertPriority,
  prefs: AlertAudioPreferences
): { shouldPlay: boolean; profile: AlertSoundProfile; effectiveVolume: number } {
  const safePriority = normalizeAlertPriority(priority);
  const rule = prefs.priorities[safePriority] || DEFAULT_ALERT_AUDIO_PREFS.priorities[safePriority];
  if (!prefs.masterEnabled || !rule.enabled || rule.sound === 'muted') {
    return { shouldPlay: false, profile: 'muted', effectiveVolume: 0 };
  }
  const effectiveVolume = Math.min(1, Math.max(0.05, prefs.volume));
  return {
    shouldPlay: ALERT_SOUND_CATALOG[rule.sound].notes.length > 0,
    profile: rule.sound,
    effectiveVolume,
  };
}

export function loadAlertAudioPreferences(): AlertAudioPreferences {
  if (typeof window === 'undefined' || !window.localStorage) {
    return sanitizeAudioPreferences(null);
  }
  try {
    const raw = window.localStorage.getItem(ALERT_AUDIO_STORAGE_KEY);
    if (!raw) return sanitizeAudioPreferences(null);
    return sanitizeAudioPreferences(JSON.parse(raw));
  } catch {
    return sanitizeAudioPreferences(null);
  }
}

export function persistAlertAudioPreferences(prefs: AlertAudioPreferences): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(ALERT_AUDIO_STORAGE_KEY, JSON.stringify(sanitizeAudioPreferences(prefs)));
  } catch {
    // Ignore storage quota errors silently
  }
}

let sharedAudioContext: AudioContext | null = null;

function getBrowserAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      void sharedAudioContext.resume().catch(() => {
        // Autoplay policies may block until first user gesture
      });
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Synthesizes an institutional-grade acoustic notification directly via Web Audio API.
 * Uses soft 12ms attack ramps, low-pass filtering, and exponential tails so tones feel
 * refined and unobtrusive on a professional trading/research desk.
 */
export function playAlertSoundProfile(profile: AlertSoundProfile, volume = 0.65): boolean {
  const entry = ALERT_SOUND_CATALOG[profile];
  if (!entry || entry.notes.length === 0) return false;

  const ctx = getBrowserAudioContext();
  if (!ctx) return false;

  const safeVol = Math.min(1, Math.max(0.05, volume));
  const now = ctx.currentTime + 0.015;

  // Soft studio low-pass filter to remove brittle high frequencies
  const masterFilter = ctx.createBiquadFilter();
  masterFilter.type = 'lowpass';
  masterFilter.frequency.setValueAtTime(3400, now);
  masterFilter.Q.setValueAtTime(0.7, now);
  masterFilter.connect(ctx.destination);

  for (const note of entry.notes) {
    const startTime = now + note.delaySec;
    const stopTime = startTime + note.durationSec;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.frequencyHz, startTime);

    const peakGain = Math.max(0.002, note.gain * safeVol);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.014);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc.connect(gainNode);
    gainNode.connect(masterFilter);

    osc.start(startTime);
    osc.stop(stopTime + 0.03);

    // Subtle upper harmonic shimmer for acoustic warmth
    if (note.harmonicRatio && note.harmonicGain) {
      const harmOsc = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harmOsc.type = 'sine';
      harmOsc.frequency.setValueAtTime(note.frequencyHz * note.harmonicRatio, startTime);

      const harmPeak = Math.max(0.001, note.harmonicGain * safeVol);
      harmGain.gain.setValueAtTime(0.0001, startTime);
      harmGain.gain.linearRampToValueAtTime(harmPeak, startTime + 0.012);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, startTime + note.durationSec * 0.72);

      harmOsc.connect(harmGain);
      harmGain.connect(masterFilter);
      harmOsc.start(startTime);
      harmOsc.stop(stopTime + 0.02);
    }
  }

  return true;
}

export function playPriorityAlertTone(
  priority: AlertPriority,
  prefs: AlertAudioPreferences
): { played: boolean; profile: AlertSoundProfile } {
  const decision = resolveSoundForPriority(priority, prefs);
  if (!decision.shouldPlay) {
    return { played: false, profile: 'muted' };
  }
  const played = playAlertSoundProfile(decision.profile, decision.effectiveVolume);
  return { played, profile: decision.profile };
}
