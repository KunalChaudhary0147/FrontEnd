import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | null;
  icon: LucideIcon;
  hint?: string;
  tone?: 'default' | 'danger';
}

export function StatCard({ label, value, icon: Icon, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg bg-accent',
            tone === 'danger' ? 'text-rose-300' : 'text-primary'
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      {value === null ? (
        <div className="space-y-1">
          <p className="text-lg font-medium text-muted-foreground">Not connected</p>
          <p className="text-xs text-muted-foreground">Connect the backend to see this number.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      )}
    </div>
  );
}
