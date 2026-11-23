export interface RuntimeErrorDescriptor {
  message?: string;
  filename?: string;
  stack?: string;
}

const EXTENSION_SCHEME_RE = /(?:chrome|moz|safari|edge)-extension:\/\//i;

/**
 * Returns true ONLY when a runtime error originates exclusively from an
 * external third-party browser extension (e.g. VPN/ad-blocker request
 * interceptors injecting into the page and failing on a read-only `window.fetch`
 * getter). Application errors are NEVER suppressed.
 */
export function isThirdPartyExtensionError(
  info: RuntimeErrorDescriptor
): boolean {
  const filename = (info.filename || '').trim();
  const stack = (info.stack || '').trim();

  if (EXTENSION_SCHEME_RE.test(filename)) {
    return true;
  }

  if (stack && EXTENSION_SCHEME_RE.test(stack)) {
    const stackLines = stack
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('at ') || line.includes('@'));

    // Suppress only if every stack frame belongs to a browser extension
    if (
      stackLines.length > 0 &&
      stackLines.every((line) => EXTENSION_SCHEME_RE.test(line))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Installs capture-phase listeners that isolate third-party browser extension
 * crashes (such as `Cannot set property fetch of #<Window> which has only a getter`
 * from injected `chrome-extension://` scripts) so they do not disrupt the app.
 */
export function installThirdPartyExtensionErrorGuard(
  target: Pick<Window, 'addEventListener'> = window
): void {
  target.addEventListener(
    'error',
    (event: Event) => {
      const errEvent = event as ErrorEvent;
      if (
        isThirdPartyExtensionError({
          message: errEvent.message || errEvent.error?.message,
          filename: errEvent.filename,
          stack: errEvent.error?.stack,
        })
      ) {
        errEvent.preventDefault();
        if (typeof errEvent.stopImmediatePropagation === 'function') {
          errEvent.stopImmediatePropagation();
        }
      }
    },
    true
  );

  target.addEventListener(
    'unhandledrejection',
    (event: Event) => {
      const rejEvent = event as PromiseRejectionEvent;
      const reason = rejEvent.reason as { message?: string; stack?: string } | undefined;
      if (
        isThirdPartyExtensionError({
          message: reason?.message || String(reason || ''),
          stack: reason?.stack,
        })
      ) {
        rejEvent.preventDefault();
        if (typeof rejEvent.stopImmediatePropagation === 'function') {
          rejEvent.stopImmediatePropagation();
        }
      }
    },
    true
  );
}
