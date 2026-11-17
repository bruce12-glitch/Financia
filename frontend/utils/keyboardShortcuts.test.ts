import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isEditableTarget,
  resolveKeyboardShortcutAction,
  SHORTCUT_GROUPS,
} from './keyboardShortcuts.ts';

test('SHORTCUT_GROUPS exposes navigation, search, and research hotkeys', () => {
  const ids = SHORTCUT_GROUPS.flatMap((g) => g.items.map((item) => item.id));
  assert.ok(ids.includes('search-ctrl-k'));
  assert.ok(ids.includes('help-question'));
  assert.ok(ids.includes('nav-analysis'));
  assert.ok(ids.includes('nav-markets'));
  assert.ok(ids.includes('toggle-stream'));
});

test('resolveKeyboardShortcutAction triggers toggle-help on ? key outside inputs', () => {
  const action = resolveKeyboardShortcutAction({ key: '?', shiftKey: true, target: { tagName: 'BODY' } });
  assert.deepEqual(action, { type: 'toggle-help' });

  const shiftSlash = resolveKeyboardShortcutAction({ key: '/', shiftKey: true, target: { tagName: 'BODY' } });
  assert.deepEqual(shiftSlash, { type: 'toggle-help' });

  const insideInput = resolveKeyboardShortcutAction({
    key: '?',
    shiftKey: true,
    target: { tagName: 'INPUT' },
  });
  assert.equal(insideInput, null);
});

test('resolveKeyboardShortcutAction resolves search, escape, and navigation triggers', () => {
  assert.deepEqual(
    resolveKeyboardShortcutAction({ key: 'k', ctrlKey: true, target: { tagName: 'INPUT' } }),
    { type: 'open-search' }
  );
  assert.deepEqual(
    resolveKeyboardShortcutAction({ key: '/', target: { tagName: 'DIV' } }),
    { type: 'open-search' }
  );
  assert.deepEqual(
    resolveKeyboardShortcutAction({ key: 'Escape', target: { tagName: 'INPUT' } }),
    { type: 'close-modals' }
  );
  assert.deepEqual(
    resolveKeyboardShortcutAction({ key: 'a', target: { tagName: 'BODY' } }),
    { type: 'jump-section', sectionId: 'live-terminal' }
  );
  assert.deepEqual(
    resolveKeyboardShortcutAction({ key: 'e', target: { tagName: 'BODY' } }),
    { type: 'jump-section', sectionId: 'markets' }
  );
  assert.deepEqual(
    resolveKeyboardShortcutAction({ key: 't', target: { tagName: 'BODY' } }),
    { type: 'toggle-live-feed' }
  );
});

test('isEditableTarget accurately detects form controls and contenteditable elements', () => {
  assert.equal(isEditableTarget({ tagName: 'INPUT' }), true);
  assert.equal(isEditableTarget({ tagName: 'textarea' }), true);
  assert.equal(isEditableTarget({ tagName: 'SELECT' }), true);
  assert.equal(isEditableTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: 'BUTTON' }), false);
  assert.equal(isEditableTarget(null), false);
});
