import test from 'node:test';
import assert from 'node:assert/strict';
import { isThirdPartyExtensionError } from './extensionErrorGuard';

test('isThirdPartyExtensionError detects injected chrome-extension fetch getter crash', () => {
  const stack = [
    'TypeError: Cannot set property fetch of #<Window> which has only a getter',
    '    at _._$initInterceptor (chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/libs/requests.js:1:3574)',
    '    at new _ (chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/libs/requests.js:1:2864)',
    '    at chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/libs/requests.js:1:5000',
  ].join('\n');

  assert.equal(
    isThirdPartyExtensionError({
      message: 'TypeError: Cannot set property fetch of #<Window> which has only a getter',
      filename: 'chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/libs/requests.js',
      stack,
    }),
    true
  );

  // Also matches when filename is omitted and only extension stack frames are present
  assert.equal(
    isThirdPartyExtensionError({
      message: 'TypeError: Cannot set property fetch of #<Window> which has only a getter',
      stack,
    }),
    true
  );
});

test('isThirdPartyExtensionError never suppresses genuine application errors', () => {
  assert.equal(
    isThirdPartyExtensionError({
      message: 'TypeError: Cannot read properties of undefined',
      filename: 'https://ais-dev.run.app/frontend/components/LiveStockTerminal.tsx',
      stack:
        'TypeError: Cannot read properties of undefined\n    at LiveStockTerminal (https://ais-dev.run.app/assets/index.js:42:11)',
    }),
    false
  );

  // Mixed stack (app code calling something that touches extension) is NOT suppressed
  assert.equal(
    isThirdPartyExtensionError({
      message: 'TypeError: failed',
      stack: [
        'TypeError: failed',
        '    at handleClick (http://localhost:3000/frontend/App.tsx:100:5)',
        '    at chrome-extension://abcdef/hook.js:1:10',
      ].join('\n'),
    }),
    false
  );
});
