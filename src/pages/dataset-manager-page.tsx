import { useMemo, useState } from 'react';
import {
  CheckCheck,
  Database,
  Eye,
  FileText,
  Gauge,
  GitCompare,
  Layers,
  RefreshCw,
  Search,
  Trash2,
  Waypoints,
  X,
} from 'lucide-react';
import { PageHeader, Panel } from '@/components/common/page-layout';
import { ActiveDatasetIndicator } from '@/components/common/active-dataset-indicator';
import { StatCard } from '@/components/common/stat-card';
import { QueryContent } from '@/components/common/state-panels';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBackendQuery } from '@/hooks/use-backend-query';
import { useActiveDatasets } from '@/hooks/use-active-datasets';
import { toast } from '@/hooks/use-toast';
import { apiRequest, isBackendConfigured } from '@/lib/api';
import { formatDateTime, formatNumber } from '@/lib/format';
import type {
  DataQuality,
  Dataset,
  DatasetDeleteResponse,
  DatasetListResponse,
  DatasetPreviewResponse,
  DatasetStatsResponse,
} from '@/types/domain';

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'most-records' | 'fewest-records' | 'most-entities' | 'fewest-entities';
type DateFilter = 'all' | 'today' | '7days' | '30days' | 'custom';
type StatusFilter = 'all' | 'ready' | 'processing' | 'failed';
type SizeFilter = 'all' | 'small' | 'medium' | 'large';

const PAGE_SIZE = 10;

const SIZE_RANGES: Record<Exclude<SizeFilter, 'all'>, [number, number]> = {
  small: [0, 999],
  medium: [1000, 9999],
  large: [10000, Infinity],
};

function statusBadgeClass(status: string): string {
  if (status === 'ready') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
  if (status === 'processing') return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-rose-400/30 bg-rose-400/10 text-rose-300';
}

export function DatasetManagerPage() {
  const { setAll, setSelected } = useActiveDatasets();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [metricFilter, setMetricFilter] = useState('__all__');
  const [sourceFilter, setSourceFilter] = useState('__all__');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [page, setPage] = useState(0);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [detailDataset, setDetailDataset] = useState<Dataset | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Dataset[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const statsQuery = useBackendQuery<DatasetStatsResponse>('/api/v1/datasets/stats');
  const listQuery = useBackendQuery<DatasetListResponse>('/api/v1/datasets');

  const datasets = listQuery.state.status === 'ready' ? listQuery.state.data.datasets : [];

  const allMetrics = useMemo(() => {
    const set = new Set<string>();
    datasets.forEach((d) => d.metrics.forEach((m) => set.add(m)));
    return [...set].sort();
  }, [datasets]);

  const allSources = useMemo(() => {
    const set = new Set<string>();
    datasets.forEach((d) => set.add(d.source_type));
    return [...set].sort();
  }, [datasets]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFilter !== 'all') count += 1;
    if (statusFilter !== 'all') count += 1;
    if (sizeFilter !== 'all') count += 1;
    if (metricFilter !== '__all__') count += 1;
    if (sourceFilter !== '__all__') count += 1;
    return count;
  }, [dateFilter, statusFilter, sizeFilter, metricFilter, sourceFilter]);

  const filteredDatasets = useMemo(() => {
    let result = datasets;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((d) => {
        return (
          d.name.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.source_type.toLowerCase().includes(q) ||
          d.metrics.some((m) => m.toLowerCase().includes(q)) ||
          String(d.entities).includes(q)
        );
      });
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter((d) => {
        const uploaded = new Date(d.upload_date);
        if (dateFilter === 'today') return (now.getTime() - uploaded.getTime()) < 86400000;
        if (dateFilter === '7days') return (now.getTime() - uploaded.getTime()) < 7 * 86400000;
        if (dateFilter === '30days') return (now.getTime() - uploaded.getTime()) < 30 * 86400000;
        if (dateFilter === 'custom') {
          if (customStart && uploaded < new Date(customStart)) return false;
          if (customEnd && uploaded > new Date(customEnd)) return false;
          return true;
        }
        return true;
      });
    }
    if (statusFilter !== 'all') result = result.filter((d) => d.status === statusFilter);
    if (sizeFilter !== 'all') {
      const [min, max] = SIZE_RANGES[sizeFilter];
      result = result.filter((d) => d.records >= min && d.records <= max);
    }
    if (metricFilter !== '__all__') result = result.filter((d) => d.metrics.includes(metricFilter));
    if (sourceFilter !== '__all__') result = result.filter((d) => d.source_type === sourceFilter);

    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
        case 'oldest': return new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'most-records': return b.records - a.records;
        case 'fewest-records': return a.records - b.records;
        case 'most-entities': return b.entities - a.entities;
        case 'fewest-entities': return a.entities - b.entities;
        default: return 0;
      }
    });
    return sorted;
  }, [datasets, search, dateFilter, customStart, customEnd, statusFilter, sizeFilter, metricFilter, sourceFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDatasets.length / PAGE_SIZE));
  const pagedDatasets = filteredDatasets.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const allChecked = pagedDatasets.length > 0 && pagedDatasets.every((d) => checkedIds.has(d.id));
  const someChecked = pagedDatasets.some((d) => checkedIds.has(d.id));

  const toggleRow = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        pagedDatasets.forEach((d) => next.delete(d.id));
      } else {
        pagedDatasets.forEach((d) => next.add(d.id));
      }
      return next;
    });
  };

  const selectAllDatasets = () => {
    setCheckedIds(new Set(filteredDatasets.map((d) => d.id)));
  };

  const clearSelection = () => setCheckedIds(new Set());

  const clearAllFilters = () => {
    setSearch('');
    setDateFilter('all');
    setCustomStart('');
    setCustomEnd('');
    setStatusFilter('all');
    setSizeFilter('all');
    setMetricFilter('__all__');
    setSourceFilter('__all__');
    setSortBy('newest');
  };

  const useSelectedForAnalysis = () => {
    if (checkedIds.size === 0) {
      toast({ title: 'No datasets selected', description: 'Select at least one dataset to use for analysis.', variant: 'destructive' });
      return;
    }
    setSelected([...checkedIds]);
    toast({ title: 'Datasets activated', description: `${checkedIds.size} dataset(s) are now active across the application.` });
  };

  const useAllForAnalysis = () => {
    setAll();
    toast({ title: 'All datasets active', description: 'All datasets will be used for analysis.' });
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteTarget.length === 0) return;
    setDeleting(true);
    try {
      const ids = deleteTarget.map((d) => d.id);
      if (ids.length === 1) {
        await apiRequest<DatasetDeleteResponse>(`/api/v1/datasets/${ids[0]}`, { method: 'DELETE' });
      } else {
        await apiRequest<DatasetDeleteResponse>('/api/v1/datasets/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset_ids: ids }),
        });
      }
      toast({ title: 'Datasets deleted', description: `${ids.length} dataset(s) and their associated data were removed.` });
      setCheckedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      listQuery.refetch();
      statsQuery.refetch();
    } catch (err) {
      toast({ title: 'Deletion failed', description: err instanceof Error ? err.message : 'Could not delete datasets.', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const compareDatasets = useMemo(() => {
    return filteredDatasets.filter((d) => checkedIds.has(d.id));
  }, [filteredDatasets, checkedIds]);

  const statValue = (pick: (d: DatasetStatsResponse) => number): string | null => {
    if (statsQuery.state.status === 'ready') return formatNumber(pick(statsQuery.state.data));
    if (statsQuery.state.status === 'loading') return '…';
    if (statsQuery.state.status === 'error') return '—';
    return null;
  };

  if (!isBackendConfigured) {
    return (
      <div className="space-y-8">
        <PageHeader title="Dataset Manager" description="Manage uploaded datasets, inspect data quality, select datasets for analysis, and organize your infrastructure telemetry." />
        <Panel>
          <QueryContent state={listQuery.state}>{() => null}</QueryContent>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dataset Manager"
        description="Manage uploaded datasets, inspect data quality, select datasets for analysis, and organize your infrastructure telemetry."
        actions={
          <div className="flex items-center gap-2">
            <ActiveDatasetIndicator />
            <Button variant="outline" size="sm" onClick={() => { listQuery.refetch(); statsQuery.refetch(); }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total datasets" value={statValue((d) => d.total_datasets)} icon={Database} />
        <StatCard label="Total records" value={statValue((d) => d.total_records)} icon={FileText} />
        <StatCard label="Total entities" value={statValue((d) => d.total_entities)} icon={Waypoints} />
        <StatCard label="Total metrics" value={statValue((d) => d.total_metrics)} icon={Gauge} />
      </div>

      <Panel title="Dataset selection" description="Select datasets to use across the application for analysis, detection, and exports.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAllDatasets}>
              <CheckCheck className="mr-2 h-4 w-4" /> Select all
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection} disabled={checkedIds.size === 0}>
              <X className="mr-2 h-4 w-4" /> Clear selection
            </Button>
            <span className="text-sm text-muted-foreground">
              {checkedIds.size} of {datasets.length} datasets selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={useSelectedForAnalysis} disabled={checkedIds.size === 0}>
              <Layers className="mr-2 h-4 w-4" /> Use selected for analysis
            </Button>
            <Button variant="outline" size="sm" onClick={useAllForAnalysis}>
              Use all
            </Button>
          </div>
        </div>
      </Panel>

      {checkedIds.size > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">{checkedIds.size} datasets selected</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={useSelectedForAnalysis}>
              <Layers className="mr-2 h-4 w-4" /> Use for analysis
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCompareOpen(true)} disabled={checkedIds.size < 2}>
              <GitCompare className="mr-2 h-4 w-4" /> Compare
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(filteredDatasets.filter((d) => checkedIds.has(d.id)))}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete selected
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
          </div>
        </div>
      )}

      <Panel
        title="Uploaded datasets"
        description={`${filteredDatasets.length} dataset(s) match the current search and filters`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? 'Hide' : 'Show'} filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        }
      >
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search datasets by name, ID, metric or entity..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
            {search && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="most-records">Most records</SelectItem>
              <SelectItem value="fewest-records">Fewest records</SelectItem>
              <SelectItem value="most-entities">Most entities</SelectItem>
              <SelectItem value="fewest-entities">Fewest entities</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showFilters && (
          <div className="mb-4 space-y-4 rounded-lg border bg-muted/20 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Source type</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {allSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Upload date</Label>
                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dateFilter === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End date</Label>
                    <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Record count</Label>
                <Select value={sizeFilter} onValueChange={(v) => setSizeFilter(v as SizeFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="small">Small (under 1K)</SelectItem>
                    <SelectItem value="medium">Medium (1K-10K)</SelectItem>
                    <SelectItem value="large">Large (10K+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={metricFilter} onValueChange={setMetricFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {allMetrics.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear all filters</Button>
            )}
          </div>
        )}

        <QueryContent
          state={listQuery.state}
          onRetry={listQuery.refetch}
          isEmpty={(d) => d.datasets.length === 0}
          emptyTitle="No datasets uploaded"
          emptyDescription="Upload a CSV file on the Data Ingestion page to see datasets here."
        >
          {() => filteredDatasets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No datasets match the current search and filters.</p>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-5">
                      <Checkbox checked={allChecked ? true : someChecked ? 'indeterminate' : false} onCheckedChange={toggleAllOnPage} />
                    </TableHead>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Entities</TableHead>
                    <TableHead>Metrics</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedDatasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell className="pl-5">
                        <Checkbox checked={checkedIds.has(dataset.id)} onCheckedChange={() => toggleRow(dataset.id)} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{dataset.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{dataset.id}</p>
                      </TableCell>
                      <TableCell>{formatNumber(dataset.records)}</TableCell>
                      <TableCell>{formatNumber(dataset.entities)}</TableCell>
                      <TableCell className="text-muted-foreground">{dataset.metrics.join(', ') || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(dataset.upload_date)}</TableCell>
                      <TableCell className="text-muted-foreground">{dataset.source_type}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(dataset.status)}`}>
                          {dataset.status}
                        </span>
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="View details" onClick={() => setDetailDataset(dataset)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleteTarget([dataset])}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 text-sm text-muted-foreground">
                  <span>Page {page + 1} of {totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </QueryContent>
      </Panel>

      <DatasetDetailSheet dataset={detailDataset} onClose={() => setDetailDataset(null)} />

      <DatasetComparisonSheet open={compareOpen} onOpenChange={setCompareOpen} datasets={compareDatasets} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.length ?? 0} dataset(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes dataset metadata, associated telemetry records, detection results, and alerts for:{' '}
              {deleteTarget?.map((d) => d.name).join(', ')}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DatasetDetailSheet({ dataset, onClose }: { dataset: Dataset | null; onClose: () => void }) {
  const previewQuery = useBackendQuery<DatasetPreviewResponse>(
    dataset ? `/api/v1/datasets/${dataset.id}/preview` : '/api/v1/datasets/_none/preview'
  );
  const qualityQuery = useBackendQuery<DataQuality>(
    dataset ? `/api/v1/datasets/${dataset.id}/quality` : '/api/v1/datasets/_none/quality'
  );

  const preview = previewQuery.state.status === 'ready' ? previewQuery.state.data : null;
  const quality = qualityQuery.state.status === 'ready' ? qualityQuery.state.data : null;

  return (
    <Sheet open={!!dataset} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {dataset && (
          <>
            <SheetHeader>
              <SheetTitle>{dataset.name}</SheetTitle>
              <SheetDescription>
                Dataset ID: <span className="font-mono">{dataset.id}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium">Dataset information</h3>
                <div className="space-y-2 text-sm">
                  <DetailRow label="Upload date" value={formatDateTime(dataset.upload_date)} />
                  <DetailRow label="Records" value={formatNumber(dataset.records)} />
                  <DetailRow label="Unique entities" value={formatNumber(dataset.entities)} />
                  <DetailRow label="Metrics" value={dataset.metrics.join(', ') || '—'} />
                  <DetailRow label="Source type" value={dataset.source_type} />
                  {dataset.date_range && (
                    <>
                      <DetailRow label="Earliest timestamp" value={formatDateTime(dataset.date_range.start)} />
                      <DetailRow label="Latest timestamp" value={formatDateTime(dataset.date_range.end)} />
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium">Data preview</h3>
                <QueryContent
                  state={previewQuery.state}
                  onRetry={previewQuery.refetch}
                  isEmpty={(d) => d.records.length === 0}
                  emptyTitle="No records to preview"
                >
                  {(data) => (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Timestamp</th>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Entity</th>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Metric</th>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.records.slice(0, 10).map((r, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="px-2 py-1.5 text-muted-foreground">{formatDateTime(r.timestamp)}</td>
                              <td className="px-2 py-1.5">{r.entity}</td>
                              <td className="px-2 py-1.5">{r.metric}</td>
                              <td className="px-2 py-1.5">{r.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </QueryContent>
                {preview?.columns && preview.columns.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">Available columns: {preview.columns.join(', ')}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium">Data quality</h3>
                <QueryContent
                  state={qualityQuery.state}
                  onRetry={qualityQuery.refetch}
                >
                  {(q) => (
                    <div className="space-y-2">
                      <QualityRow label="Total records" value={formatNumber(q.total_records)} tone="info" />
                      <QualityRow label="Missing timestamps" value={formatNumber(q.missing_timestamps)} tone={q.missing_timestamps === 0 ? 'pass' : q.missing_timestamps < 10 ? 'warning' : 'fail'} />
                      <QualityRow label="Missing metric values" value={formatNumber(q.missing_metric_values)} tone={q.missing_metric_values === 0 ? 'pass' : q.missing_metric_values < 10 ? 'warning' : 'fail'} />
                      <QualityRow label="Invalid timestamps" value={formatNumber(q.invalid_timestamps)} tone={q.invalid_timestamps === 0 ? 'pass' : 'fail'} />
                      <QualityRow label="Invalid numerical values" value={formatNumber(q.invalid_numerical_values)} tone={q.invalid_numerical_values === 0 ? 'pass' : 'fail'} />
                      <QualityRow label="Duplicate records" value={formatNumber(q.duplicate_records)} tone={q.duplicate_records === 0 ? 'pass' : 'warning'} />
                      <QualityRow label="Unique entities" value={formatNumber(q.unique_entities)} tone="info" />
                      <QualityRow label="Available metrics" value={q.available_metrics.join(', ') || '—'} tone="info" />
                    </div>
                  )}
                </QueryContent>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DatasetComparisonSheet({ open, onOpenChange, datasets }: { open: boolean; onOpenChange: (open: boolean) => void; datasets: Dataset[] }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Compare datasets</SheetTitle>
          <SheetDescription>Side-by-side metadata comparison of {datasets.length} datasets.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Property</th>
                {datasets.map((d) => (
                  <th key={d.id} className="px-3 py-2 text-left font-medium">{d.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Records" datasets={datasets} render={(d) => formatNumber(d.records)} />
              <CompareRow label="Entities" datasets={datasets} render={(d) => formatNumber(d.entities)} />
              <CompareRow label="Metrics" datasets={datasets} render={(d) => d.metrics.join(', ') || '—'} />
              <CompareRow label="Upload date" datasets={datasets} render={(d) => formatDateTime(d.upload_date)} />
              <CompareRow label="Source" datasets={datasets} render={(d) => d.source_type} />
              <CompareRow label="Status" datasets={datasets} render={(d) => d.status} />
              <CompareRow label="Date range" datasets={datasets} render={(d) => d.date_range ? `${formatDateTime(d.date_range.start)} → ${formatDateTime(d.date_range.end)}` : '—'} />
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CompareRow({ label, datasets, render }: { label: string; datasets: Dataset[]; render: (d: Dataset) => string }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2 font-medium text-muted-foreground">{label}</td>
      {datasets.map((d) => (
        <td key={d.id} className="px-3 py-2">{render(d)}</td>
      ))}
    </tr>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function QualityRow({ label, value, tone }: { label: string; value: string; tone: 'pass' | 'warning' | 'fail' | 'info' }) {
  const colors = {
    pass: 'border-l-emerald-400',
    warning: 'border-l-amber-400',
    fail: 'border-l-rose-400',
    info: 'border-l-primary',
  };
  const valueColors = {
    pass: 'text-emerald-300',
    warning: 'text-amber-300',
    fail: 'text-rose-300',
    info: 'text-foreground',
  };
  return (
    <div className={`flex items-center justify-between gap-4 border-l-2 bg-muted/20 px-3 py-2 ${colors[tone]}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${valueColors[tone]}`}>{value}</span>
    </div>
  );
}
