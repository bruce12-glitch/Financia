import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveDisplayNameAndInitials,
  evaluatePasswordStrength,
  isValidEmail,
  normalizeEmail,
  validateAuthCredentials,
} from './authEngine';

test('normalizeEmail and isValidEmail validate cleanly', () => {
  assert.equal(normalizeEmail('  Trader@Financia.IO  '), 'trader@financia.io');
  assert.equal(isValidEmail('analyst@domain.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('user@localhost'), false);
});

test('deriveDisplayNameAndInitials builds clean name and initials from full name or email', () => {
  assert.deepEqual(deriveDisplayNameAndInitials('alex mercer', 'a@b.com'), {
    displayName: 'Alex Mercer',
    initials: 'AM',
  });
  assert.deepEqual(deriveDisplayNameAndInitials('', 'maya.lin@financia.io'), {
    displayName: 'Maya Lin',
    initials: 'ML',
  });
  assert.deepEqual(deriveDisplayNameAndInitials('', 'quant@financia.io'), {
    displayName: 'Quant',
    initials: 'QU',
  });
});

test('evaluatePasswordStrength scores short, weak, fair, and strong passwords', () => {
  assert.equal(evaluatePasswordStrength('').score, 0);
  assert.equal(evaluatePasswordStrength('abc123').label, 'Too short');
  assert.equal(evaluatePasswordStrength('password12').label, 'Weak');
  assert.equal(evaluatePasswordStrength('Password12').label, 'Fair');
  assert.equal(evaluatePasswordStrength('Financia#2026!').label, 'Strong');
});

test('validateAuthCredentials enforces email format and minimum password length', () => {
  const invalid = validateAuthCredentials({
    mode: 'signup',
    email: 'bad-email',
    password: 'short',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.fieldErrors.email);
  assert.ok(invalid.fieldErrors.password);

  const valid = validateAuthCredentials({
    mode: 'login',
    email: 'demo@financia.io',
    password: 'DemoPass2026!',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.fieldErrors, {});
});
