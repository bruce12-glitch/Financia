import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'An unexpected workspace error occurred.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
      if (parsed?.error) {
        readable = `Workspace sync error (${parsed.operationType || 'read'}): ${parsed.error}`;
      }
    } catch {
      // plain string error
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error): void {
    console.error('[Financia ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#090d16] text-[#090e1a] dark:text-[#f8fafc] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-[12px] border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-6 shadow-sm">
            <div className="flex items-center gap-2.5 text-[#dc2626] dark:text-[#f43f5e] mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-display font-semibold text-base">Workspace Recovery</h2>
            </div>
            <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-5">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#090e1a] dark:bg-white text-white dark:text-[#090e1a] px-4 py-2 text-sm font-medium cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
