// ─── Error boundary (catches render errors, keeps the app alive) ─────────
import { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[fuel] render error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-navy p-6 text-center">
          <p className="text-lg font-bold text-white">Something went wrong</p>
          <p className="max-w-sm text-sm text-slate-400">Tap below to reload — your settings are saved.</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
