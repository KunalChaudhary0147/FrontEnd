import { useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader, Panel } from '@/components/common/page-layout';
import { QueryContent } from '@/components/common/state-panels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBackendQuery } from '@/hooks/use-backend-query';
import { toast } from '@/hooks/use-toast';
import { downloadFromBackend, describeError } from '@/lib/api';
import { CHART_AXIS_TICK, CHART_COLORS, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '@/lib/chart-theme';
import { formatDateTime, formatDecimal, formatNumber } from '@/lib/format';
import type { Catalog, TelemetryPoint, TelemetryResponse } from '@/types/domain';

const PAGE_SIZE = 25;
const AXIS_PROPS = { tick: CHART_AXIS_TICK, axisLine: false, tickLine: false } as const;

export function TelemetryPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [metric, setMetric] = useState('__all__');
  const [entity, setEntity] = useState('__all__');
  const [sourceType, setSourceType] = useState('__all__');
  const [anomalyStatus, setAnomalyStatus] = useState('__all__');
  const [chartMetric, setChartMetric] = useState('__all__');
  const [chartEntity, setChartEntity] = useState('__all__');
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  const catalogQuery = useBackendQuery<Catalog>('/api/v1/catalog');
  const catalog = catalogQuery.state.status === 'ready' ? catalogQuery.state.data : null;

  const params = {
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    metric: metric !== '__all__' ? metric : undefined,
    entity: entity !== '__all__' ? entity : undefined,
    source_type: sourceType !== '__all__' ? sourceType : undefined,
    is_anomaly: anomalyStatus === 'anomaly' ? 'true' : anomalyStatus === 'normal' ? 'false' : undefined,
    limit: 1000,
  };

  const telemetryQuery = useBackendQuery<TelemetryResponse>('/api/v1/telemetry', params);
  const records = telemetryQuery.state.status === 'ready' ? telemetryQuery.state.data.records : [];
  const total = telemetryQuery.state.status === 'ready' ? telemetryQuery.state.data.total : 0;

  const chartData = useMemo(() => {
    return records
      .filter((r) => (chartMetric === '__all__' || r.metric === chartMetric) && (chartEntity === '__all__' || r.entity === chartEntity))
      .map((r) => ({ timestamp: r.timestamp, value: r.value, is_anomaly: r.is_anomaly ?? false }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [records, chartMetric, chartEntity]);

  const anomalies = chartData.filter((d) => d.is_anomaly);

  const pagedRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  }, [records, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFromBackend('/api/v1/export/telemetry', params, 'telemetry.csv');
      toast({ title: 'Export ready', description: 'Telemetry CSV downloaded.' });
    } catch (err) {
      toast({ title: 'Export failed', description: describeError(err), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Telemetry Explorer"
        description="Browse ingested telemetry records, filter by time and attribute, and plot metric values over time."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => telemetryQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </div>
        }
      />

      <Panel title="Filters" description="Narrow the records by date range, metric, entity, source, and anomaly status.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input type="datetime-local" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input type="datetime-local" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} />
          </div>
          <FilterSelect label="Metric" value={metric} onChange={(v) => { setMetric(v); setPage(0); }} options={catalog?.metrics ?? []} />
          <FilterSelect label="Entity" value={entity} onChange={(v) => { setEntity(v); setPage(0); }} options={catalog?.entities ?? []} />
          <FilterSelect label="Source type" value={sourceType} onChange={(v) => { setSourceType(v); setPage(0); }} options={['csv', 'api', 'synthetic']} />
          <div className="space-y-2">
            <Label>Anomaly status</Label>
            <Select value={anomalyStatus} onValueChange={(v) => { setAnomalyStatus(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="anomaly">Anomalous only</SelectItem>
                <SelectItem value="normal">Normal only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      <Panel title="Metric time series" description="Plot a single metric and entity over time. Anomalous points are highlighted in red.">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FilterSelect label="Chart metric" value={chartMetric} onChange={setChartMetric} options={catalog?.metrics ?? []} />
          <FilterSelect label="Chart entity" value={chartEntity} onChange={setChartEntity} options={catalog?.entities ?? []} />
        </div>
        <QueryContent
          state={telemetryQuery.state}
          onRetry={telemetryQuery.refetch}
          isEmpty={(d) => d.records.length === 0}
          emptyTitle="No telemetry records"
          emptyDescription="Upload a CSV file on the Data Ingestion page to populate telemetry."
        >
          {() => chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data matches the selected chart metric and entity.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis dataKey="timestamp" tickFormatter={formatDateTime} {...AXIS_PROPS} minTickGap={48} />
                  <YAxis {...AXIS_PROPS} width={56} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={(v) => formatDateTime(String(v))} formatter={(v: number) => formatDecimal(v)} />
                  <Line type="monotone" dataKey="value" name="Value" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
                  {anomalies.map((point) => (
                    <ReferenceDot key={point.timestamp} x={point.timestamp} y={point.value} r={4} fill={CHART_COLORS.danger} stroke={CHART_COLORS.danger} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </QueryContent>
      </Panel>

      <Panel title="Telemetry records" description={`${formatNumber(total)} records`}>
        <QueryContent
          state={telemetryQuery.state}
          onRetry={telemetryQuery.refetch}
          isEmpty={(d) => d.records.length === 0}
          emptyTitle="No telemetry records"
          emptyDescription="Upload a CSV file on the Data Ingestion page to populate telemetry."
        >
          {() => (
            <div className="-mx-5 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Timestamp</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="pr-5">Label</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRecords.map((record, index) => (
                    <TelemetryRow key={`${record.timestamp}-${index}`} record={record} />
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
    </div>
  );
}

function TelemetryRow({ record }: { record: TelemetryPoint }) {
  return (
    <TableRow>
      <TableCell className="pl-5 text-muted-foreground">{formatDateTime(record.timestamp)}</TableCell>
      <TableCell className="font-medium">{record.entity}</TableCell>
      <TableCell>{record.metric}</TableCell>
      <TableCell>{formatDecimal(record.value)}</TableCell>
      <TableCell className="text-muted-foreground">{record.unit ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{record.source_type ?? '—'}</TableCell>
      <TableCell className="pr-5">
        {record.is_anomaly === undefined ? (
          <span className="text-muted-foreground">—</span>
        ) : record.is_anomaly ? (
          <span className="font-medium text-rose-300">Anomaly</span>
        ) : (
          <span className="text-muted-foreground">Normal</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
