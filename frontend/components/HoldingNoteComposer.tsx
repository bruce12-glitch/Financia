import React, { useEffect, useState } from 'react';
import { Loader2, Save, StickyNote, Trash2, X } from 'lucide-react';
import {
  formatNoteTimestamp,
  HOLDING_NOTE_STANCE_META,
  HoldingNoteRecord,
  HoldingNoteStance,
  MAX_HOLDING_NOTE_LENGTH,
  validateHoldingNoteInput,
} from '../utils/holdingNotesEngine';

export interface HoldingNoteEditorTarget {
  fundCode: string;
  holdingKey: string;
  securityName: string;
  isin: string | null;
  nseSymbol: string | null;
}

interface HoldingNoteComposerProps {
  target: HoldingNoteEditorTarget;
  existingNote: HoldingNoteRecord | null;
  isSaving: boolean;
  serverError: string | null;
  onSave: (draft: { noteText: string; stance: HoldingNoteStance }) => void;
  onDelete: (noteId: string) => void;
  onClose: () => void;
}

const STANCE_ORDER: HoldingNoteStance[] = ['research', 'core', 'watch', 'trim'];

export const HoldingNoteComposer: React.FC<HoldingNoteComposerProps> = ({
  target,
  existingNote,
  isSaving,
  serverError,
  onSave,
  onDelete,
  onClose,
}) => {
  const [noteText, setNoteText] = useState<string>(existingNote?.noteText || '');
  const [stance, setStance] = useState<HoldingNoteStance>(existingNote?.stance || 'research');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setNoteText(existingNote?.noteText || '');
    setStance(existingNote?.stance || 'research');
    setLocalError(null);
  }, [target.holdingKey, existingNote]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateHoldingNoteInput({
      fundCode: target.fundCode,
      holdingKey: target.holdingKey,
      securityName: target.securityName,
      isin: target.isin,
      nseSymbol: target.nseSymbol,
      noteText,
      stance,
    });
    if (!validation.valid || !validation.sanitized) {
      setLocalError(validation.error || 'Please enter a valid note.');
      return;
    }
    setLocalError(null);
    onSave({
      noteText: validation.sanitized.noteText,
      stance: validation.sanitized.stance,
    });
  };

  const displayError = localError || serverError;
  const remaining = MAX_HOLDING_NOTE_LENGTH - noteText.length;

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="holding-note-composer"
      className="rounded-[10px] bg-white border border-[#93c5fd] shadow-sm p-3.5 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-wider text-[#1d4ed8] font-semibold">
            <StickyNote className="w-3.5 h-3.5 shrink-0" />
            <span>{existingNote ? 'Edit Holding Note' : 'Attach Holding Note'}</span>
          </div>
          <div className="text-xs font-semibold text-[#0f172a] truncate mt-0.5">
            {target.securityName}
          </div>
          <div className="text-[10.5px] font-mono text-[#64748b] truncate">
            {target.fundCode}
            {target.isin ? ` · ${target.isin}` : ''}
            {existingNote?.updatedAt ? ` · Saved ${formatNoteTimestamp(existingNote.updatedAt)}` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close holding note editor"
          className="p-1 rounded-[6px] text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stance Tag Selector */}
      <div role="group" aria-label="Holding stance" className="flex flex-wrap items-center gap-1.5">
        {STANCE_ORDER.map((item) => {
          const meta = HOLDING_NOTE_STANCE_META[item];
          const active = stance === item;
          return (
            <button
              key={item}
              type="button"
              data-testid={`holding-note-stance-${item}`}
              aria-pressed={active}
              onClick={() => setStance(item)}
              style={
                active
                  ? { backgroundColor: meta.bg, color: meta.text, borderColor: meta.border }
                  : undefined
              }
              className={`px-2 py-0.5 rounded-[5px] border text-[11px] font-semibold transition-colors cursor-pointer ${
                active
                  ? ''
                  : 'bg-[#f8fafc] border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1] hover:text-[#0f172a]'
              }`}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Note Textarea */}
      <div>
        <label htmlFor="holding-note-input" className="sr-only">
          Custom note for {target.securityName}
        </label>
        <textarea
          id="holding-note-input"
          data-testid="holding-note-textarea"
          rows={3}
          maxLength={MAX_HOLDING_NOTE_LENGTH}
          value={noteText}
          onChange={(e) => {
            setNoteText(e.target.value);
            if (localError) setLocalError(null);
          }}
          placeholder="Record investment thesis, valuation targets, earnings watch items, or rebalance reminders..."
          className="w-full rounded-[7px] border border-[#cbd5e1] bg-[#f8fafc] focus:bg-white focus:border-[#2563eb] focus:outline-none p-2.5 text-xs text-[#0f172a] leading-relaxed resize-y"
        />
        <div className="flex items-center justify-between text-[10.5px] font-mono mt-1">
          <span className={displayError ? 'text-[#dc2626] font-semibold' : 'text-[#64748b]'}>
            {displayError || 'Synced privately to your account'}
          </span>
          <span className={remaining < 100 ? 'text-[#b45309]' : 'text-[#64748b]'}>
            {noteText.length}/{MAX_HOLDING_NOTE_LENGTH}
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div>
          {existingNote && (
            <button
              type="button"
              data-testid="holding-note-delete-btn"
              disabled={isSaving}
              onClick={() => onDelete(existingNote.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] border border-[#fecaca] bg-[#fef2f2] hover:bg-[#fee2e2] text-[11px] font-semibold text-[#b91c1c] disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-2.5 py-1.5 rounded-[7px] border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-[11px] font-semibold text-[#475569] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="holding-note-save-btn"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#0f172a] hover:bg-[#1e293b] text-[11px] font-semibold text-white disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span>{existingNote ? 'Update Note' : 'Save Note'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
