import { Database } from 'lucide-react';
import { useActiveDatasets } from '@/hooks/use-active-datasets';

export function ActiveDatasetIndicator() {
  const { label } = useActiveDatasets();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <Database className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      Active Datasets: <span className="text-foreground">{label}</span>
    </span>
  );
}
