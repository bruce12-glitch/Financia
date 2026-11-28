import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHoldingNoteKey,
  indexNotesByHoldingKey,
  MAX_HOLDING_NOTE_LENGTH,
  normalizeHoldingNoteStance,
  removeHoldingNoteFromList,
  sanitizeNoteText,
  upsertHoldingNoteInList,
  validateHoldingNoteInput,
  type HoldingNoteRecord,
} from './holdingNotesEngine';

test('buildHoldingNoteKey generates deterministic ISIN-first keys and falls back to normalized name', () => {
  assert.equal(
    buildHoldingNoteKey('ppfasflexicap', 'ine040a01034', 'HDFC BANK LIMITED'),
    'PPFASFLEXICAP::INE040A01034'
  );
  assert.equal(
    buildHoldingNoteKey('PPFASFLEXICAP', null, '  Alphabet   Inc.  '),
    'PPFASFLEXICAP::ALPHABET INC.'
  );
  assert.equal(
    buildHoldingNoteKey('HDFCFLEXICAP', '   ', 'TREPS Reverse Repo'),
    'HDFCFLEXICAP::TREPS REVERSE REPO'
  );
});

test('validateHoldingNoteInput enforces strict boundaries and strips unsafe control chars', () => {
  const emptyNote = validateHoldingNoteInput({
    fundCode: 'PPFASFLEXICAP',
    securityName: 'HDFC BANK LIMITED',
    isin: 'INE040A01034',
    noteText: '   \n\t  ',
  });
  assert.equal(emptyNote.valid, false);
  assert.match(emptyNote.error || '', /Enter a note/i);

  const invalidFund = validateHoldingNoteInput({
    fundCode: '../bad fund!',
    securityName: 'HDFC BANK LIMITED',
    noteText: 'Monitor NIM expansion',
  });
  assert.equal(invalidFund.valid, false);

  const tooLong = validateHoldingNoteInput({
    fundCode: 'PPFASFLEXICAP',
    securityName: 'HDFC BANK LIMITED',
    noteText: 'A'.repeat(MAX_HOLDING_NOTE_LENGTH + 1),
  });
  assert.equal(tooLong.valid, false);

  const valid = validateHoldingNoteInput({
    fundCode: 'ppfasflexicap',
    securityName: 'HDFC BANK LIMITED',
    isin: 'ine040a01034',
    nseSymbol: 'hdfcbank',
    noteText: '  Core banking anchor.\u0000\r\nWatch deposit growth.  ',
    stance: 'CORE',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.sanitized?.fundCode, 'PPFASFLEXICAP');
  assert.equal(valid.sanitized?.holdingKey, 'PPFASFLEXICAP::INE040A01034');
  assert.equal(valid.sanitized?.isin, 'INE040A01034');
  assert.equal(valid.sanitized?.nseSymbol, 'HDFCBANK');
  assert.equal(valid.sanitized?.stance, 'core');
  assert.equal(valid.sanitized?.noteText, 'Core banking anchor.\nWatch deposit growth.');
});

test('normalizeHoldingNoteStance and sanitizeNoteText enforce safe defaults', () => {
  assert.equal(normalizeHoldingNoteStance('watch'), 'watch');
  assert.equal(normalizeHoldingNoteStance('TRIM'), 'trim');
  assert.equal(normalizeHoldingNoteStance('unknown_tag'), 'research');
  assert.equal(sanitizeNoteText('hello\u0007\u001F world'), 'hello world');
});

test('upsert, index, and remove holding notes operate immutably without duplicates', () => {
  const n1: HoldingNoteRecord = {
    id: 'hnote_1',
    fundCode: 'PPFASFLEXICAP',
    holdingKey: 'PPFASFLEXICAP::INE040A01034',
    securityName: 'HDFC BANK LIMITED',
    isin: 'INE040A01034',
    nseSymbol: 'HDFCBANK',
    noteText: 'Initial thesis',
    stance: 'core',
    createdAt: '2026-11-27T10:00:00.000Z',
    updatedAt: '2026-11-27T10:00:00.000Z',
  };

  const n1Updated: HoldingNoteRecord = {
    ...n1,
    noteText: 'Updated thesis after Q2 results',
    updatedAt: '2026-11-27T11:00:00.000Z',
  };

  const n2: HoldingNoteRecord = {
    id: 'hnote_2',
    fundCode: 'PPFASFLEXICAP',
    holdingKey: 'PPFASFLEXICAP::INE154A01025',
    securityName: 'ITC LIMITED',
    isin: 'INE154A01025',
    nseSymbol: 'ITC',
    noteText: 'Cash-generative FMCG anchor',
    stance: 'research',
    createdAt: '2026-11-27T10:30:00.000Z',
    updatedAt: '2026-11-27T10:30:00.000Z',
  };

  const list1 = upsertHoldingNoteInList([n1, n2], n1Updated);
  assert.equal(list1.length, 2);
  assert.equal(list1[0].noteText, 'Updated thesis after Q2 results');

  const indexed = indexNotesByHoldingKey(list1);
  assert.equal(indexed['PPFASFLEXICAP::INE040A01034']?.id, 'hnote_1');
  assert.equal(indexed['PPFASFLEXICAP::INE154A01025']?.id, 'hnote_2');

  const afterRemove = removeHoldingNoteFromList(list1, 'hnote_1');
  assert.equal(afterRemove.length, 1);
  assert.equal(afterRemove[0].id, 'hnote_2');
});
