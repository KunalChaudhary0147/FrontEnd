import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { navigateTo } from '@/lib/navigation';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Unhandled page error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-card p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-rose-300" aria-hidden="true" />
        <div>
          <h1 className="text-lg font-semibold">This page could not be displayed</h1>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">{this.state.error.message}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => this.setState({ error: null })}>Try again</Button>
          <Button onClick={() => navigateTo('overview')}>Go to Overview</Button>
        </div>
      </div>
    );
  }
}
