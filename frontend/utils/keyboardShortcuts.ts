export type ShortcutCategory = 'search' | 'navigation' | 'research';

export interface KeyboardShortcutEntry {
  id: string;
  keys: string[];
  label: string;
  description: string;
  category: ShortcutCategory;
  sectionId?: string;
}

export type ShortcutAction =
  | { type: 'open-search' }
  | { type: 'toggle-help' }
  | { type: 'close-modals' }
  | { type: 'jump-section'; sectionId: string }
  | { type: 'toggle-live-feed' };

export const SHORTCUT_GROUPS: Array<{
  category: ShortcutCategory;
  title: string;
  items: KeyboardShortcutEntry[];
}> = [
  {
    category: 'search',
    title: 'Search & Overlays',
    items: [
      {
        id: 'search-ctrl-k',
        keys: ['Ctrl', 'K'],
        label: 'Global Symbol Search',
        description: 'Open search across equities, indices, FX, crypto & futures',
        category: 'search',
      },
      {
        id: 'search-slash',
        keys: ['/'],
        label: 'Quick Ticker Lookup',
        description: 'Open symbol search directly from anywhere on the page',
        category: 'search',
      },
      {
        id: 'help-question',
        keys: ['?'],
        label: 'Keyboard Shortcuts',
        description: 'Open or close this keyboard shortcuts reference modal',
        category: 'search',
      },
      {
        id: 'close-esc',
        keys: ['Esc'],
        label: 'Dismiss Active Modal',
        description: 'Close open search, quote, alert, or shortcuts dialogs',
        category: 'search',
      },
    ],
  },
  {
    category: 'navigation',
    title: 'Section Navigation',
    items: [
      {
        id: 'nav-supercharts',
        keys: ['C'],
        label: 'Supercharged Supercharts',
        description: 'Scroll to multi-pane candlestick & TPO profile charts',
        category: 'navigation',
        sectionId: 'supercharts-section',
      },
      {
        id: 'nav-analysis',
        keys: ['A'],
        label: 'Stock Analysis Terminal',
        description: 'Jump to live SEC filing synthesis & valuation modeling',
        category: 'navigation',
        sectionId: 'live-terminal',
      },
      {
        id: 'nav-summary',
        keys: ['M'],
        label: 'Market Summary & Sentiment',
        description: 'Jump to Fear & Greed gauge, D3 trend & sector heatmap',
        category: 'navigation',
        sectionId: 'market-summary',
      },
      {
        id: 'nav-markets',
        keys: ['E'],
        label: 'Markets & Earnings Calendar',
        description: 'Jump to Indian NSE equities, FX & quarterly earnings',
        category: 'navigation',
        sectionId: 'markets',
      },
    ],
  },
  {
    category: 'research',
    title: 'Live Telemetry Controls',
    items: [
      {
        id: 'toggle-stream',
        keys: ['T'],
        label: 'Toggle Live Tick Stream',
        description: 'Pause or resume real-time price tick simulation',
        category: 'research',
      },
    ],
  },
];

export interface MinimalKeyboardEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  target?:
    | EventTarget
    | {
        tagName?: string;
        isContentEditable?: boolean;
      }
    | null;
}

export function isEditableTarget(
  target: MinimalKeyboardEventLike['target'] | undefined
): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as { tagName?: string; isContentEditable?: boolean };
  if (el.isContentEditable) return true;
  const tag = (el.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function resolveKeyboardShortcutAction(
  event: MinimalKeyboardEventLike
): ShortcutAction | null {
  const key = event.key || '';
  const lower = key.toLowerCase();
  const hasCtrlOrMeta = Boolean(event.ctrlKey || event.metaKey);

  // Ctrl+K / Cmd+K always opens global symbol search
  if (hasCtrlOrMeta && lower === 'k') {
    return { type: 'open-search' };
  }

  // Escape always closes active modals
  if (key === 'Escape') {
    return { type: 'close-modals' };
  }

  // Ignore remaining single-key hotkeys while typing in inputs or with Ctrl/Alt/Meta modifiers
  if (isEditableTarget(event.target) || hasCtrlOrMeta || event.altKey) {
    return null;
  }

  if (key === '?' || (event.shiftKey && key === '/')) {
    return { type: 'toggle-help' };
  }

  if (key === '/') {
    return { type: 'open-search' };
  }

  switch (lower) {
    case 'c':
      return { type: 'jump-section', sectionId: 'supercharts-section' };
    case 'a':
      return { type: 'jump-section', sectionId: 'live-terminal' };
    case 'm':
      return { type: 'jump-section', sectionId: 'market-summary' };
    case 'e':
      return { type: 'jump-section', sectionId: 'markets' };
    case 't':
      return { type: 'toggle-live-feed' };
    default:
      return null;
  }
}
