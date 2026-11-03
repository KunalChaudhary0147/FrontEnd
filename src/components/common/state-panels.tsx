import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, Unplug } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BackendQueryState } from '@/hooks/use-backend-query';

interface StatePanelProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'neutral' | 'danger';
}

export function StatePanel({ icon: Icon, title, description, action, tone = 'neutral' }: StatePanelProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div
        className={
          tone === 'danger'
            ? 'flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-rose-300'
            : 'flex h-12 w-12 items-center justify-center rounded-full bg-accent text-muted-foreground'
        }
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = 'Loading data' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-12 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      {label}
    </div>
  );
}

export function NotConnectedState({ description }: { description?: string }) {
  return (
    <StatePanel
      icon={Unplug}
      title="Backend not connected"
      description={
        description ??
        'This section will fill with data once the analysis backend is connected. See the setup notes in the project README.'
      }
    />
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <StatePanel
      icon={AlertTriangle}
      tone="danger"
      title="Something went wrong"
      description={message}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <StatePanel icon={Inbox} title={title} description={description} />;
}

interface QueryContentProps<T> {
  state: BackendQueryState<T>;
  onRetry?: () => void;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: (data: T) => ReactNode;
}

export function QueryContent<T>({
  state,
  onRetry,
  isEmpty,
  emptyTitle = 'No data yet',
  emptyDescription,
  children,
}: QueryContentProps<T>) {
  switch (state.status) {
    case 'disconnected':
      return <NotConnectedState />;
    case 'loading':
      return <LoadingState />;
    case 'error':
      return <ErrorState message={state.message} onRetry={onRetry} />;
    case 'ready':
      if (isEmpty?.(state.data)) {
        return <EmptyState title={emptyTitle} description={emptyDescription} />;
      }
      return <>{children(state.data)}</>;
  }
}
