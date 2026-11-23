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
        label: 'Global Fund & Asset Search',
        description: 'Open search across mutual funds, gold, debt funds, ETFs & FX',
        category: 'search',
      },
      {
        id: 'search-slash',
        keys: ['/'],
        label: 'Quick Fund / ETF Lookup',
        description: 'Open instrument search directly from anywhere on the page',
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
        id: 'nav-research',
        keys: ['C'],
        label: 'Live AMFI Fund Screener',
        description: 'Scroll to the live AMFI mutual fund screener and peer benchmark chart',
        category: 'navigation',
        sectionId: 'live-nav-explorer',
      },
      {
        id: 'nav-analysis',
        keys: ['A'],
        label: 'Fund & ETF Analysis Terminal',
        description: 'Jump to live AMFI NAV, factsheet & debt yield modeling',
        category: 'navigation',
        sectionId: 'live-terminal',
      },
      {
        id: 'nav-summary',
        keys: ['M'],
        label: 'Market Summary & Sentiment',
        description: 'Jump to sentiment gauge, D3 trend & 4-pillar asset heatmap',
        category: 'navigation',
        sectionId: 'market-summary',
      },
      {
        id: 'nav-markets',
        keys: ['E'],
        label: 'Funds, Gold, Debt & Policy Calendar',
        description: 'Jump to Mutual Funds, Bullion ETFs, Debt Yields & NFO/RBI calendar',
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
      return { type: 'jump-section', sectionId: 'live-nav-explorer' };
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
