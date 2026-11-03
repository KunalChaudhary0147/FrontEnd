import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, FileUp, RotateCcw, UploadCloud, X } from 'lucide-react';
import { PageHeader, Panel } from '@/components/common/page-layout';
import { NotConnectedState } from '@/components/common/state-panels';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { describeError, isBackendConfigured, uploadToBackend } from '@/lib/api';
import { parseCsv, type ParsedCsv } from '@/lib/csv';
import { formatNumber } from '@/lib/format';
import type { IngestionSummary } from '@/types/domain';

const PREVIEW_ROWS = 10;

interface ColumnMapping {
  timestamp: string | null;
  metricColumns: string[];
  entity: string | null;
  label: string | null;
}

const EMPTY_MAPPING: ColumnMapping = { timestamp: null, metricColumns: [], entity: null, label: null };

function guessColumn(headers: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const match = headers.find((h) => h.toLowerCase() === candidate);
    if (match) return match;
  }
  for (const candidate of candidates) {
    const match = headers.find((h) => h.toLowerCase().includes(candidate));
    if (match) return match;
  }
  return null;
}

function parseFile(selected: File): Promise<ParsedCsv> {
  return selected.text().then((text) => parseCsv(text));
}

export function IngestionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<IngestionSummary | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setParsed(null);
    setMapping(EMPTY_MAPPING);
    setError(null);
    setProgress(0);
    setUploading(false);
    setSummary(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const loadFile = useCallback((selected: File) => {
    setError(null);
    setSummary(null);
    setProgress(0);
    setFile(selected);
    parseFile(selected)
      .then(({ headers, rows }) => {
        if (headers.length === 0) {
          setError('This file has no header row. Add a header row with column names and try again.');
          setParsed(null);
          return;
        }
        if (rows.length === 0) {
          setError('This file contains a header row but no data rows.');
        }
        setParsed({ headers, rows });
        setMapping({
          timestamp: guessColumn(headers, ['timestamp', 'time', 'date', 'datetime']),
          metricColumns: headers.filter((h) => {
            const lower = h.toLowerCase();
            return lower.includes('metric') || lower.includes('value') || lower.includes('measurement');
          }).slice(0, 1),
          entity: guessColumn(headers, ['entity', 'entity_id', 'id', 'device', 'host']),
          label: guessColumn(headers, ['label', 'anomaly', 'is_anomaly', 'ground_truth', 'truth']),
        });
      })
      .catch(() => {
        setError('Could not read this file. Make sure it is a valid CSV and try again.');
        setParsed(null);
      });
  }, []);

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) loadFile(selected);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      if (!dropped.name.toLowerCase().endsWith('.csv')) {
        setError('Only CSV files are supported.');
        return;
      }
      loadFile(dropped);
    }
  };

  const updateSingle = (role: 'timestamp' | 'entity' | 'label', value: string) => {
    setMapping((current) => ({ ...current, [role]: value === '__none__' ? null : value }));
  };

  const toggleMetricColumn = (header: string) => {
    setMapping((current) => {
      const exists = current.metricColumns.includes(header);
      return {
        ...current,
        metricColumns: exists
          ? current.metricColumns.filter((h) => h !== header)
          : [...current.metricColumns, header],
      };
    });
  };

  const canUpload =
    isBackendConfigured &&
    !!file &&
    !!mapping.timestamp &&
    mapping.metricColumns.length > 0 &&
    !!mapping.entity &&
    !uploading;

  const handleUpload = async () => {
    if (!file || !mapping.timestamp || mapping.metricColumns.length === 0 || !mapping.entity) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const fields: Record<string, Blob | string | string[]> = { file };
      fields.timestamp_column = mapping.timestamp;
      fields.entity_column = mapping.entity;
      fields.metric_columns = mapping.metricColumns;
      if (mapping.label) fields.label_column = mapping.label;

      const result = await uploadToBackend<IngestionSummary>('/api/v1/ingestion/csv', fields, setProgress);
      setSummary(result);
      toast({ title: 'Ingestion complete', description: `${formatNumber(result.records_ingested)} records were imported.` });
    } catch (err) {
      setError(describeError(err));
      toast({ title: 'Ingestion failed', description: describeError(err), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (!isBackendConfigured) {
    return (
      <div className="space-y-8">
        <PageHeader title="Data Ingestion" description="Upload CSV telemetry files for anomaly monitoring." />
        <Panel>
          <NotConnectedState />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Data Ingestion"
        description="Upload a CSV file of telemetry observations, map its columns, and send it to the analysis backend."
        actions={
          (file || summary) && (
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" /> Start over
            </Button>
          )
        }
      />

      {summary && (
        <Panel title="Ingestion summary" description={`Imported from ${file?.name}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryStat label="Records ingested" value={formatNumber(summary.records_ingested)} />
            <SummaryStat label="Metrics" value={summary.metrics.length ? summary.metrics.join(', ') : '—'} />
            <SummaryStat label="Entities" value={summary.entities.length ? summary.entities.join(', ') : '—'} />
          </div>
          {summary.date_range && (
            <p className="mt-4 text-sm text-muted-foreground">
              Date range: {summary.date_range.start} → {summary.date_range.end}
            </p>
          )}
          {summary.errors && summary.errors.length > 0 && (
            <div className="mt-4 space-y-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3">
              <p className="text-sm font-medium text-amber-300">Warnings</p>
              <ul className="list-inside list-disc text-xs text-amber-300/80">
                {summary.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </Panel>
      )}

      {!summary && (
        <Panel title="Upload file" description="Drag and drop a CSV file, or browse to select one.">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Drop a CSV file here</p>
              <p className="text-xs text-muted-foreground">or click browse to select one from your device</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <FileUp className="mr-2 h-4 w-4" /> Browse files
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatNumber(file.size)} bytes</p>
              </div>
              <Button variant="ghost" size="icon" onClick={reset} aria-label="Remove file">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </Panel>
      )}

      {!summary && parsed && parsed.headers.length > 0 && (
        <>
          <Panel title="File information" description="Summary of the parsed CSV file.">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryStat label="File name" value={file?.name ?? '—'} />
              <SummaryStat label="Total columns" value={formatNumber(parsed.headers.length)} />
              <SummaryStat label="Total rows" value={formatNumber(parsed.rows.length)} />
              <SummaryStat label="Preview rows" value={formatNumber(Math.min(parsed.rows.length, PREVIEW_ROWS))} />
            </div>
          </Panel>

          <Panel title="Preview" description={`First ${Math.min(parsed.rows.length, PREVIEW_ROWS)} rows of the selected file`}>
            <div className="-mx-5 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {parsed.headers.map((header) => (
                      <TableHead key={header} className="pl-5 first:pl-5 last:pr-5">{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.rows.slice(0, PREVIEW_ROWS).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {parsed.headers.map((header, colIndex) => (
                        <TableCell key={header} className="pl-5 first:pl-5 last:pr-5 text-muted-foreground">
                          {row[colIndex] ?? '—'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>

          <Panel title="Column mapping" description="Select the timestamp column, one or more metric columns, the entity ID column, and an optional ground-truth label column.">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <MappingSelect label="Timestamp column" value={mapping.timestamp} headers={parsed.headers} onChange={(v) => updateSingle('timestamp', v)} required />
              <MappingSelect label="Entity ID column" value={mapping.entity} headers={parsed.headers} onChange={(v) => updateSingle('entity', v)} required />
              <MappingSelect label="Ground-truth label (optional)" value={mapping.label} headers={parsed.headers} onChange={(v) => updateSingle('label', v)} />
            </div>

            <div className="mt-6 space-y-3">
              <Label>Metric columns <span className="ml-1 text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">Select one or more columns that contain metric values to be analyzed.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {parsed.headers.map((header) => (
                  <label key={header} className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent">
                    <Checkbox
                      checked={mapping.metricColumns.includes(header)}
                      onCheckedChange={() => toggleMetricColumn(header)}
                    />
                    <span className="text-sm">{header}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress * 100} />
                  <p className="text-xs text-muted-foreground">Uploading… {Math.round(progress * 100)}%</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleUpload} disabled={!canUpload}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Upload and ingest
                </Button>
                {!mapping.timestamp || mapping.metricColumns.length === 0 || !mapping.entity ? (
                  <span className="text-xs text-muted-foreground">Select timestamp, at least one metric, and entity columns to enable upload.</span>
                ) : null}
              </div>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-lg border bg-muted/30 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function MappingSelect({
  label,
  value,
  headers,
  onChange,
  required,
}: {
  label: string;
  value: string | null;
  headers: string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Select value={value ?? '__none__'} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a column" />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value="__none__">None</SelectItem>}
          {headers.map((header) => (
            <SelectItem key={header} value={header}>
              {header}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
