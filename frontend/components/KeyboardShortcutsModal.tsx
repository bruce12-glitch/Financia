import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { SHORTCUT_GROUPS, ShortcutAction } from '../utils/keyboardShortcuts';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
  onTriggerShortcut?: (action: ShortcutAction) => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  open,
  onClose,
  onTriggerShortcut,
}) => {
  if (!open) return null;

  const mapEntryToAction = (id: string, sectionId?: string): ShortcutAction | null => {
    if (id === 'search-ctrl-k' || id === 'search-slash') return { type: 'open-search' };
    if (id === 'help-question' || id === 'close-esc') return { type: 'close-modals' };
    if (id === 'toggle-stream') return { type: 'toggle-live-feed' };
    if (sectionId) return { type: 'jump-section', sectionId };
    return null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      data-testid="keyboard-shortcuts-modal"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white text-[#131722] shadow-2xl border border-[#E0E3EB] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E0E3EB] flex items-center justify-between gap-4 bg-[#F8F9FD]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#2962FF]/10 text-[#2962FF] flex items-center justify-center shrink-0">
              <Keyboard className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-display font-bold text-[#131722] leading-tight">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-[#787B86]">
                Navigate charts, run search triggers, and control live telemetry faster
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="p-1.5 rounded-lg hover:bg-[#E0E3EB]/60 text-[#787B86] hover:text-[#131722] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcut Groups */}
        <div className="px-6 py-4 max-h-[78vh] overflow-y-auto space-y-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category}>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#787B86] mb-1.5">
                {group.title}
              </h4>
              <div className="rounded-xl border border-[#E0E3EB] divide-y divide-[#F0F3FA] overflow-hidden">
                {group.items.map((item) => {
                  const action = mapEntryToAction(item.id, item.sectionId);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (action && onTriggerShortcut) {
                          onClose();
                          onTriggerShortcut(action);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between gap-4 text-left hover:bg-[#F8F9FD] transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#131722] leading-snug">
                          {item.label}
                        </div>
                        <div className="text-xs text-[#787B86] truncate">
                          {item.description}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((keyLabel, idx) => (
                          <React.Fragment key={`${item.id}-${keyLabel}`}>
                            <kbd className="min-w-[26px] h-6 px-2 inline-flex items-center justify-center rounded-md border border-[#D1D5DB] bg-[#F8F9FD] shadow-[0_1px_0_#D1D5DB] font-mono text-xs font-bold text-[#131722]">
                              {keyLabel}
                            </kbd>
                            {idx < item.keys.length - 1 && (
                              <span className="text-xs text-[#9598A1] font-mono">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Tip */}
        <div className="px-6 py-3 border-t border-[#E0E3EB] bg-[#F8F9FD] flex items-center justify-between text-xs text-[#787B86]">
          <span>
            Press <kbd className="px-1.5 py-0.5 rounded border border-[#D1D5DB] bg-white font-mono text-[11px] font-bold text-[#131722]">?</kbd> anytime outside text fields to toggle
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-[#131722] text-white font-semibold hover:bg-[#2A2E39] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
