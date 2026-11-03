import { useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader, Panel } from '@/components/common/page-layout';
import { ActiveDatasetIndicator } from '@/components/common/active-dataset-indicator';
import { QueryContent } from '@/components/common/state-panels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBackendQuery } from '@/hooks/use-backend-query';
import { useActiveDatasets } from '@/hooks/use-active-datasets';
import { toast } from '@/hooks/use-toast';
import {
  describeError,
  downloadFromBackend,
  normalizeAdvancedDetectionResults,
  normalizeCatalog,
  normalizeGenericDetectionResults,
  normalizeTelemetryResponse,
} from '@/lib/api';
import type { QueryValue } from '@/lib/api';
import { formatDateTime, formatDecimal } from '@/lib/format';
import type {
  AdvancedDetectionResultsResponse,
  Catalog,
  GenericDetectionResultsResponse,
  TelemetryResponse,
} from '@/types/domain';

export function HistoricalPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Historical Analysis"
        description="Investigate past telemetry records and detection results, and export them for further review."
        actions={<ActiveDatasetIndicator />}
      />
      <Tabs defaultValue="telemetry">
        <TabsList>
          <TabsTrigger value="telemetry">Telemetry History</TabsTrigger>
          <TabsTrigger value="generic">Generic Detection History</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Detection History</TabsTrigger>
        </TabsList>
        <TabsContent value="telemetry"><TelemetryHistoryTab /></TabsContent>
        <TabsContent value="generic"><GenericHistoryTab /></TabsContent>
        <TabsContent value="advanced"><AdvancedHistoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function useExportButton(endpoint: string, filename: string, params: Record<string, QueryValue>) {
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFromBackend(endpoint, params, filename);
      toast({ title: 'Export ready', description: `${filename} downloaded.` });
    } catch (err) {
      toast({ title: 'Export failed', description: describeError(err), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };
  return { exporting, handleExport };
}

function TelemetryHistoryTab() {
  const { activeIds } = useActiveDatasets();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [metric, setMetric] = useState('__all__');
  const [entity, setEntity] = useState('__all__');
  const [anomalyStatus, setAnomalyStatus] = useState('__all__');

  const catalogQuery = useBackendQuery<Catalog>('/api/v1/catalog', { dataset_ids: activeIds === null ? undefined : activeIds }, normalizeCatalog);
  const catalog = catalogQuery.state.status === 'ready' ? catalogQuery.state.data : null;

  const params = {
    start: startDate || undefined,
    end: endDate || undefined,
    metric_name: metric !== '__all__' ? metric : undefined,
    entity_id: entity !== '__all__' ? entity : undefined,
    anomaly: anomalyStatus === 'anomaly' ? 'true' : anomalyStatus === 'normal' ? 'false' : undefined,
    dataset_ids: activeIds === null ? undefined : activeIds,
  };
  const query = useBackendQuery<TelemetryResponse>('/api/v1/telemetry', params, normalizeTelemetryResponse);
  const { exporting, handleExport } = useExportButton('/api/v1/export/telemetry', 'telemetry_history.csv', params);

  return (
    <Panel
      title="Telemetry history"
      description="Historical telemetry records with date, metric, entity, and anomaly filters."
      actions={
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Start date</Label>
          <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <FilterSelect label="Metric" value={metric} onChange={setMetric} options={catalog?.metrics ?? []} />
        <div className="space-y-2">
          <Label>Anomaly</Label>
          <Select value={anomalyStatus} onValueChange={setAnomalyStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="anomaly">Anomalous</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FilterSelect label="Entity" value={entity} onChange={setEntity} options={catalog?.entities ?? []} />
      </div>

      <QueryContent state={query.state} onRetry={query.refetch} isEmpty={(d) => d.records.length === 0} emptyTitle="No telemetry records" emptyDescription="Ingest data to see historical telemetry.">
        {(data) => (
          <div className="-mx-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Timestamp</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="pr-5">Label</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-5 text-muted-foreground">{formatDateTime(r.timestamp)}</TableCell>
                    <TableCell className="font-medium">{r.entity}</TableCell>
                    <TableCell>{r.metric}</TableCell>
                    <TableCell>{formatDecimal(r.value)}</TableCell>
                    <TableCell className="pr-5">{r.is_anomaly ? <span className="text-rose-300">Anomaly</span> : <span className="text-muted-foreground">Normal</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryContent>
    </Panel>
  );
}

function GenericHistoryTab() {
  const { activeIds } = useActiveDatasets();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [metric, setMetric] = useState('__all__');
  const [entity, setEntity] = useState('__all__');

  const catalogQuery = useBackendQuery<Catalog>('/api/v1/catalog', { dataset_ids: activeIds === null ? undefined : activeIds }, normalizeCatalog);
  const catalog = catalogQuery.state.status === 'ready' ? catalogQuery.state.data : null;

  const params = {
    start: startDate || undefined,
    end: endDate || undefined,
    metric_name: metric !== '__all__' ? metric : undefined,
    entity_id: entity !== '__all__' ? entity : undefined,
    dataset_ids: activeIds === null ? undefined : activeIds,
  };
  const query = useBackendQuery<GenericDetectionResultsResponse>('/api/v1/detection/generic/results', params, normalizeGenericDetectionResults);
  const { exporting, handleExport } = useExportButton('/api/v1/export/detection/generic', 'generic_detection_history.csv', params);

  return (
    <Panel
      title="Generic detection history"
      description="Past threshold-based detection results with observed values and explanations."
      actions={
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Start date</Label>
          <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <FilterSelect label="Metric" value={metric} onChange={setMetric} options={catalog?.metrics ?? []} />
        <FilterSelect label="Entity" value={entity} onChange={setEntity} options={catalog?.entities ?? []} />
      </div>

      <QueryContent state={query.state} onRetry={query.refetch} isEmpty={(d) => d.results.length === 0} emptyTitle="No generic detection results" emptyDescription="Run a generic detection to see results here.">
        {(data) => (
          <div className="-mx-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Timestamp</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Observed</TableHead>
                  <TableHead>Prediction</TableHead>
                  <TableHead className="pr-5">Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-5 text-muted-foreground">{formatDateTime(r.timestamp)}</TableCell>
                    <TableCell className="font-medium">{r.entity}</TableCell>
                    <TableCell>{r.metric}</TableCell>
                    <TableCell>{formatDecimal(r.observed_value)}</TableCell>
                    <TableCell>{r.is_anomaly ? <span className="text-rose-300">Anomaly</span> : <span className="text-muted-foreground">Normal</span>}</TableCell>
                    <TableCell className="max-w-xs truncate pr-5 text-muted-foreground" title={r.explanation}>{r.explanation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryContent>
    </Panel>
  );
}

function AdvancedHistoryTab() {
  const { activeIds } = useActiveDatasets();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [metric, setMetric] = useState('__all__');
  const [entity, setEntity] = useState('__all__');
  const [method, setMethod] = useState('__all__');

  const catalogQuery = useBackendQuery<Catalog>('/api/v1/catalog', { dataset_ids: activeIds === null ? undefined : activeIds }, normalizeCatalog);
  const catalog = catalogQuery.state.status === 'ready' ? catalogQuery.state.data : null;

  const params = {
    start: startDate || undefined,
    end: endDate || undefined,
    metric_name: metric !== '__all__' ? metric : undefined,
    entity_id: entity !== '__all__' ? entity : undefined,
    detection_method: method !== '__all__' ? method : undefined,
    dataset_ids: activeIds === null ? undefined : activeIds,
  };
  const query = useBackendQuery<AdvancedDetectionResultsResponse>('/api/v1/detection/advanced/results', params, normalizeAdvancedDetectionResults);
  const { exporting, handleExport } = useExportButton('/api/v1/export/detection/advanced', 'advanced_detection_history.csv', params);

  return (
    <Panel
      title="Advanced detection history"
      description="Past statistical detection results with scores, reference values, and method."
      actions={
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label>Start date</Label>
          <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <FilterSelect label="Metric" value={metric} onChange={setMetric} options={catalog?.metrics ?? []} />
        <FilterSelect label="Entity" value={entity} onChange={setEntity} options={catalog?.entities ?? []} />
        <div className="space-y-2">
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="zscore">Z-score</SelectItem>
              <SelectItem value="rolling_zscore">Rolling z-score</SelectItem>
              <SelectItem value="multivariate">Multivariate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <QueryContent state={query.state} onRetry={query.refetch} isEmpty={(d) => d.results.length === 0} emptyTitle="No advanced detection results" emptyDescription="Run an advanced detection to see results here.">
        {(data) => (
          <div className="-mx-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Timestamp</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Observed</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5">Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-5 text-muted-foreground">{formatDateTime(r.timestamp)}</TableCell>
                    <TableCell className="font-medium">{r.entity}</TableCell>
                    <TableCell>{r.metric}</TableCell>
                    <TableCell className="text-muted-foreground">{r.method}</TableCell>
                    <TableCell>{formatDecimal(r.observed_value)}</TableCell>
                    <TableCell>{formatDecimal(r.reference_value)}</TableCell>
                    <TableCell>{formatDecimal(r.score)}</TableCell>
                    <TableCell>{r.prediction ? <span className="text-rose-300">Anomaly</span> : <span className="text-muted-foreground">Normal</span>}</TableCell>
                    <TableCell className="max-w-xs truncate pr-5 text-muted-foreground" title={r.explanation}>{r.explanation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryContent>
    </Panel>
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
        <SelectTrigger><SelectValue /></SelectTrigger>
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
