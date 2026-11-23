import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALERT_SOUND_CATALOG,
  DEFAULT_ALERT_AUDIO_PREFS,
  normalizeAlertPriority,
  resolveSoundForPriority,
  sanitizeAudioPreferences,
} from './alertSoundEngine';

test('normalizeAlertPriority defaults invalid inputs to medium cleanly', () => {
  assert.equal(normalizeAlertPriority('high'), 'high');
  assert.equal(normalizeAlertPriority('low'), 'low');
  assert.equal(normalizeAlertPriority('medium'), 'medium');
  assert.equal(normalizeAlertPriority('urgent'), 'medium');
  assert.equal(normalizeAlertPriority(undefined), 'medium');
});

test('sanitizeAudioPreferences clamps volume and restores invalid sound profiles to defaults', () => {
  const sanitized = sanitizeAudioPreferences({
    masterEnabled: true,
    volume: 4.5,
    priorities: {
      low: { enabled: false, sound: 'sonar_ping' },
      medium: { enabled: true, sound: 'invalid_sound' },
      high: { enabled: true, sound: 'vault_chime' },
    },
  });

  assert.equal(sanitized.volume, 1);
  assert.equal(sanitized.priorities.low.enabled, false);
  assert.equal(sanitized.priorities.low.sound, 'sonar_ping');
  assert.equal(sanitized.priorities.medium.sound, DEFAULT_ALERT_AUDIO_PREFS.priorities.medium.sound);
  assert.equal(sanitized.priorities.high.sound, 'vault_chime');
});

test('resolveSoundForPriority honors master mute, per-priority enable toggle, and muted profile', () => {
  const activeHigh = resolveSoundForPriority('high', DEFAULT_ALERT_AUDIO_PREFS);
  assert.equal(activeHigh.shouldPlay, true);
  assert.equal(activeHigh.profile, 'vault_chime');
  assert.ok(ALERT_SOUND_CATALOG[activeHigh.profile].notes.length === 3);

  const mutedMaster = resolveSoundForPriority('high', {
    ...DEFAULT_ALERT_AUDIO_PREFS,
    masterEnabled: false,
  });
  assert.equal(mutedMaster.shouldPlay, false);
  assert.equal(mutedMaster.profile, 'muted');

  const disabledMedium = resolveSoundForPriority('medium', {
    ...DEFAULT_ALERT_AUDIO_PREFS,
    priorities: {
      ...DEFAULT_ALERT_AUDIO_PREFS.priorities,
      medium: { enabled: false, sound: 'marimba_fifth' },
    },
  });
  assert.equal(disabledMedium.shouldPlay, false);

  const silentLow = resolveSoundForPriority('low', {
    ...DEFAULT_ALERT_AUDIO_PREFS,
    priorities: {
      ...DEFAULT_ALERT_AUDIO_PREFS.priorities,
      low: { enabled: true, sound: 'muted' },
    },
  });
  assert.equal(silentLow.shouldPlay, false);
});
