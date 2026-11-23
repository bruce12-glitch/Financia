import React from 'react';
import { ArrowDown, ArrowUp, Check, LayoutGrid, RotateCcw, X } from 'lucide-react';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import {
  DashboardWidgetId,
  useWorkspaceStore,
  WIDGET_CATALOG,
} from '../store/useWorkspaceStore';

export const ModularLayoutDrawer: React.FC = () => {
  const open = useWorkspaceStore((s) => s.customizeLayoutOpen);
  const setOpen = useWorkspaceStore((s) => s.setCustomizeLayoutOpen);
  const pinnedWidgets = useWorkspaceStore((s) => s.pinnedWidgets);
  const toggleWidget = useWorkspaceStore((s) => s.toggleWidget);
  const moveWidget = useWorkspaceStore((s) => s.moveWidget);
  const resetDefaultWidgets = useWorkspaceStore((s) => s.resetDefaultWidgets);
  const { syncWorkspacePreferencesToCloud } = useFirebaseAuth();

  if (!open) return null;

  const handleToggle = (id: DashboardWidgetId) => {
    toggleWidget(id);
    const next = useWorkspaceStore.getState().pinnedWidgets;
    void syncWorkspacePreferencesToCloud({ pinnedWidgets: next });
  };

  const handleMove = (id: DashboardWidgetId, dir: 'up' | 'down') => {
    moveWidget(id, dir);
    const next = useWorkspaceStore.getState().pinnedWidgets;
    void syncWorkspacePreferencesToCloud({ pinnedWidgets: next });
  };

  const handleReset = () => {
    resetDefaultWidgets();
    const next = useWorkspaceStore.getState().pinnedWidgets;
    void syncWorkspacePreferencesToCloud({ pinnedWidgets: next });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Customize Modular Dashboard Layout"
      className="fixed inset-0 z-50 bg-[#040711]/50 backdrop-blur-xs flex justify-end"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md h-full bg-white dark:bg-[#0f172a] border-l border-[#e2e8f0] dark:border-[#1f2937] p-6 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] dark:border-[#1f2937]">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[#0d9488]" />
            <h2 className="font-display font-semibold text-base text-[#090e1a] dark:text-white">
              Customize Modular Dashboard
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[#64748b] hover:text-[#090e1a] dark:hover:text-white cursor-pointer"
            aria-label="Close layout customizer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-3 mb-4">
          Pin, toggle, and reorder analytical modules on your Modular Desk. Changes automatically
          sync to your cloud profile when signed in.
        </p>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {WIDGET_CATALOG.map((widget) => {
            const idx = pinnedWidgets.indexOf(widget.id);
            const active = idx !== -1;
            return (
              <div
                key={widget.id}
                className={`rounded-[10px] border p-3.5 transition ${
                  active
                    ? 'border-[#2563eb]/50 bg-[#eff6ff]/40 dark:bg-[#1e3a8a]/20'
                    : 'border-[#e2e8f0] dark:border-[#1f2937] bg-[#f8fafc] dark:bg-[#111827]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(widget.id)}
                    className="flex items-start gap-2.5 text-left flex-1 cursor-pointer"
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        active
                          ? 'bg-[#2563eb] border-[#2563eb] text-white'
                          : 'border-[#cbd5e1] dark:border-[#475569]'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-[#090e1a] dark:text-white">
                        {widget.label}
                      </div>
                      <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                        {widget.description}
                      </div>
                    </div>
                  </button>

                  {active && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(widget.id, 'up')}
                        className="p-1 rounded border border-[#cbd5e1] dark:border-[#334155] disabled:opacity-30 text-[#475569] dark:text-[#cbd5e1] cursor-pointer"
                        aria-label={`Move ${widget.label} up`}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === pinnedWidgets.length - 1}
                        onClick={() => handleMove(widget.id, 'down')}
                        className="p-1 rounded border border-[#cbd5e1] dark:border-[#334155] disabled:opacity-30 text-[#475569] dark:text-[#cbd5e1] cursor-pointer"
                        aria-label={`Move ${widget.label} down`}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-[#e2e8f0] dark:border-[#1f2937] flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748b] hover:text-[#090e1a] dark:hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default Order
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-[8px] bg-[#090e1a] dark:bg-white text-white dark:text-[#090e1a] px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
