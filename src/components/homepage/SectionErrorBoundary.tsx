import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Wraps a homepage section so a runtime error inside it renders a small fallback
 * instead of crashing the whole page to a black screen. The error message is
 * shown (compact) so issues are visible rather than silent.
 */
interface Props {
  name: string;
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it in the console for diagnosis.
    // eslint-disable-next-line no-console
    console.error(`[${this.props.name}] crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-400/25 bg-rose-500/[0.06] p-5 text-center text-sm text-white/70">
          <div className="font-black uppercase tracking-wide text-rose-200">This section hit a snag</div>
          <p className="mt-1 text-white/55">We're on it — the rest of the page still works.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
