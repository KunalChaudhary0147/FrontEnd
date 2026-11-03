import type {
  Alert,
  AlertListResponse,
  Catalog,
  Dataset,
  DatasetListResponse,
  DatasetPreviewResponse,
  DatasetStatsResponse,
  DataQuality,
  DetectionResult,
  GenericDetectionResult,
  GenericDetectionResultsResponse,
  IngestionSummary,
  OverviewData,
  TelemetryPoint,
  TelemetryResponse,
} from '@/types/domain';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim().replace(/\/$/, '') ?? '';
export const BACKEND_DATA_CHANGED_EVENT = 'anomaly-monitor-backend-data-changed';

export const isBackendConfigured = BACKEND_URL.length > 0;

export function notifyBackendDataChanged() {
  window.dispatchEvent(new CustomEvent(BACKEND_DATA_CHANGED_EVENT));
}

export class ApiError extends Error {
  status: number | null;
  kind: 'unreachable' | 'http' | 'response';

  constructor(message: string, status: number | null, kind: ApiError['kind']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
  }
}

export class BackendNotConfiguredError extends Error {
  constructor() {
    super('Backend URL is not configured.');
    this.name = 'BackendNotConfiguredError';
  }
}

function invalidResponse(message: string): ApiError {
  return new ApiError(`Backend API error: ${message}`, null, 'response');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw invalidResponse(`missing or invalid "${field}".`);
  return value;
}

function numberValue(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw invalidResponse(`missing or invalid "${field}".`);
  return value;
}

function arrayValue(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw invalidResponse(`missing or invalid "${field}".`);
  return value;
}

export function normalizeIngestionSummary(value: unknown, filename?: string): IngestionSummary {
  if (!isRecord(value)) throw invalidResponse('ingestion response is not an object.');
  return {
    records_ingested: numberValue(value.records_ingested ?? value.records, 'records'),
    dataset_id: typeof value.dataset_id === 'string' ? value.dataset_id : null,
    filename: filename ?? (typeof value.filename === 'string' ? value.filename : null),
    metrics: Array.isArray(value.metrics)
      ? value.metrics.map((item) => requiredString(item, 'metric'))
      : [],
    entities: Array.isArray(value.entities)
      ? value.entities.map((item) => requiredString(item, 'entity'))
      : [],
    source_type: typeof value.source_type === 'string' ? value.source_type : null,
    date_range: isRecord(value.date_range)
      && typeof value.date_range.start === 'string'
      && typeof value.date_range.end === 'string'
      ? { start: value.date_range.start, end: value.date_range.end }
      : null,
    errors: Array.isArray(value.errors)
      ? value.errors.filter((item): item is string => typeof item === 'string')
      : null,
  };
}

function normalizeTelemetryPoint(value: unknown): TelemetryPoint {
  if (!isRecord(value)) throw invalidResponse('telemetry record is not an object.');
  return {
    timestamp: requiredString(value.timestamp, 'timestamp'),
    entity: requiredString(value.entity ?? value.entity_id ?? '', 'entity'),
    metric: requiredString(value.metric ?? value.metric_name, 'metric'),
    value: numberValue(value.value ?? value.metric_value, 'value'),
    unit: typeof value.unit === 'string' ? value.unit : typeof value.metric_unit === 'string' ? value.metric_unit : null,
    source_type: typeof value.source_type === 'string' ? value.source_type : null,
    is_anomaly: typeof value.is_anomaly === 'boolean' ? value.is_anomaly : undefined,
  };
}

function normalizeDataset(value: unknown): Dataset {
  if (!isRecord(value)) throw invalidResponse('dataset is not an object.');
  const dateStart = typeof value.start_timestamp_utc === 'string' ? value.start_timestamp_utc : null;
  const dateEnd = typeof value.end_timestamp_utc === 'string' ? value.end_timestamp_utc : null;
  return {
    id: requiredString(value.id ?? value.dataset_id, 'dataset id'),
    name: requiredString(value.name ?? value.filename, 'dataset name'),
    records: numberValue(value.records ?? value.record_count, 'dataset records'),
    entities: numberValue(value.entities ?? value.entity_count, 'dataset entities'),
    metrics: Array.isArray(value.metrics) ? value.metrics.map((item) => requiredString(item, 'dataset metric')) : [],
    upload_date: requiredString(value.upload_date ?? value.upload_timestamp_utc, 'dataset upload date'),
    source_type: requiredString(value.source_type, 'dataset source type'),
    status: value.status === 'ready' || value.status === 'processing' || value.status === 'failed' ? value.status : 'ready',
    file_hash: typeof value.file_hash === 'string' ? value.file_hash : typeof value.content_hash === 'string' ? value.content_hash : null,
    date_range: dateStart && dateEnd ? { start: dateStart, end: dateEnd } : null,
  };
}

export function normalizeTelemetryResponse(value: unknown): TelemetryResponse {
  const records = Array.isArray(value)
    ? value
    : isRecord(value)
      ? arrayValue(value.records, 'records')
      : [];
  return {
    records: records.map(normalizeTelemetryPoint),
    total: isRecord(value) && typeof value.total === 'number' ? value.total : records.length,
  };
}

export function normalizeCatalog(value: unknown): Catalog {
  if (!isRecord(value)) throw invalidResponse('catalog response is not an object.');
  return {
    metrics: arrayValue(value.metrics, 'metrics').map((item) => requiredString(item, 'metric')),
    entities: arrayValue(value.entities, 'entities').map((item) => requiredString(item, 'entity')),
  };
}

function normalizeDetectionResult(value: unknown, advanced: boolean): DetectionResult | GenericDetectionResult {
  if (!isRecord(value)) throw invalidResponse('detection result is not an object.');
  const record = isRecord(value.record) ? value.record : value;
  const prediction = Boolean(value.prediction ?? value.predicted_is_anomaly ?? value.is_anomaly);
  if (!advanced) {
    return {
      timestamp: requiredString(value.timestamp ?? record.timestamp, 'timestamp'),
      entity: requiredString(value.entity ?? record.entity_id ?? '', 'entity'),
      metric: requiredString(value.metric ?? record.metric_name, 'metric'),
      observed_value: numberValue(value.observed_value ?? record.metric_value, 'observed_value'),
      is_anomaly: prediction,
      explanation: requiredString(value.explanation, 'explanation'),
    };
  }
  return {
    timestamp: requiredString(value.timestamp ?? record.timestamp, 'timestamp'),
    entity: requiredString(value.entity ?? record.entity_id ?? '', 'entity'),
    metric: requiredString(value.metric ?? record.metric_name, 'metric'),
    observed_value: numberValue(value.observed_value ?? record.metric_value, 'observed_value'),
    reference_value: value.reference_value === null || typeof value.reference_value === 'number' ? value.reference_value : null,
    score: typeof value.score === 'number' ? value.score : typeof value.statistical_score === 'number' ? value.statistical_score : 0,
    method: requiredString(value.method ?? value.detection_method, 'method'),
    prediction,
    severity: value.severity === 'normal' || value.severity === 'low' || value.severity === 'medium' || value.severity === 'high' || value.severity === 'critical'
      ? value.severity
      : prediction ? 'low' : 'normal',
    explanation: requiredString(value.explanation, 'explanation'),
  };
}

export function normalizeGenericDetectionResults(value: unknown): GenericDetectionResultsResponse {
  const results = Array.isArray(value) ? value : isRecord(value) ? arrayValue(value.results, 'results') : [];
  return { results: results.map((item) => normalizeDetectionResult(item, false) as GenericDetectionResult) };
}

export function normalizeAdvancedDetectionResults(value: unknown): { results: DetectionResult[] } {
  const results = Array.isArray(value) ? value : isRecord(value) ? arrayValue(value.results, 'results') : [];
  return { results: results.map((item) => normalizeDetectionResult(item, true) as DetectionResult) };
}

export function normalizeAlerts(value: unknown): AlertListResponse {
  const alerts = Array.isArray(value) ? value : isRecord(value) ? arrayValue(value.alerts, 'alerts') : [];
  return {
    alerts: alerts.map((item) => {
      if (!isRecord(item)) throw invalidResponse('alert is not an object.');
      const severity = String(item.severity ?? '').toLowerCase();
      const rawStatus = String(item.status ?? '').toLowerCase();
      if (!['low', 'medium', 'high', 'critical'].includes(severity)) throw invalidResponse('alert severity is invalid.');
      const status = rawStatus === 'new' ? 'open' : rawStatus;
      if (!['open', 'acknowledged', 'resolved'].includes(status)) throw invalidResponse('alert status is invalid.');
      return {
        id: requiredString(item.id ?? item.alert_id, 'alert id'),
        metric: requiredString(item.metric ?? item.metric_name, 'alert metric'),
        entity: typeof item.entity === 'string' ? item.entity : typeof item.entity_id === 'string' ? item.entity_id : '',
        severity: severity as Alert['severity'],
        status: status as Alert['status'],
        timestamp: requiredString(item.timestamp ?? item.created_at_utc, 'alert timestamp'),
        explanation: requiredString(item.explanation, 'alert explanation'),
        observed_value: item.observed_value === null || typeof item.observed_value === 'number' ? item.observed_value : null,
        reference_value: item.reference_value === null || typeof item.reference_value === 'number' ? item.reference_value : null,
      };
    }),
  };
}

export function normalizeOverview(value: unknown): OverviewData {
  if (!isRecord(value) || !isRecord(value.totals)) throw invalidResponse('overview response has an invalid shape.');
  const totals = value.totals;
  const requiredTotals = ['telemetry_records', 'anomalies', 'normal_observations', 'anomalous_observations', 'total_metrics', 'active_alerts', 'critical_alerts', 'monitored_entities'];
  requiredTotals.forEach((field) => numberValue(totals[field], `totals.${field}`));
  const metricActivity = arrayValue(value.metric_activity, 'metric_activity').map((item) => {
    if (!isRecord(item)) throw invalidResponse('metric activity entry is invalid.');
    return { date: requiredString(item.date, 'metric activity date'), observations: numberValue(item.observations, 'observations') };
  });
  const observationSplit = arrayValue(value.observation_split, 'observation_split').map((item) => {
    if (!isRecord(item)) throw invalidResponse('observation split entry is invalid.');
    return {
      date: requiredString(item.date, 'observation split date'),
      normal: numberValue(item.normal, 'normal'),
      anomalous: numberValue(item.anomalous, 'anomalous'),
    };
  });
  const severityDistribution = arrayValue(value.severity_distribution, 'severity_distribution').map((item) => {
    if (!isRecord(item) || !['low', 'medium', 'high', 'critical'].includes(String(item.severity))) {
      throw invalidResponse('severity distribution entry is invalid.');
    }
    return { severity: item.severity as Alert['severity'], count: numberValue(item.count, 'severity count') };
  });
  const detections = normalizeAdvancedDetectionResults(value.recent_detections).results;
  return {
    totals: totals as OverviewData['totals'],
    metric_activity: metricActivity,
    observation_split: observationSplit,
    severity_distribution: severityDistribution,
    detection_activity: arrayValue(value.detection_activity, 'detection_activity').map((item) => {
      if (!isRecord(item)) throw invalidResponse('detection activity entry is invalid.');
      return { date: requiredString(item.date, 'detection activity date'), detections: numberValue(item.detections, 'detections') };
    }),
    recent_alerts: normalizeAlerts(value.recent_alerts).alerts,
    recent_detections: detections,
  };
}

export function normalizeDatasetList(value: unknown): DatasetListResponse {
  const datasets = Array.isArray(value) ? value : isRecord(value) ? arrayValue(value.datasets, 'datasets') : [];
  return { datasets: datasets.map(normalizeDataset) };
}

export function normalizeDatasetStats(value: unknown): DatasetStatsResponse {
  if (!isRecord(value)) throw invalidResponse('dataset stats response is not an object.');
  return {
    total_datasets: numberValue(value.total_datasets, 'total_datasets'),
    total_records: numberValue(value.total_records, 'total_records'),
    total_entities: numberValue(value.total_entities, 'total_entities'),
    total_metrics: numberValue(value.total_metrics, 'total_metrics'),
  };
}

export function normalizeDatasetPreview(value: unknown): DatasetPreviewResponse {
  const rows = Array.isArray(value) ? value : isRecord(value) ? arrayValue(value.records, 'records') : [];
  const records = rows.map(normalizeTelemetryPoint);
  return {
    columns: ['timestamp', 'entity', 'metric', 'value'],
    column_types: { timestamp: 'datetime', entity: 'string', metric: 'string', value: 'number' },
    records,
    first_timestamp: records[0]?.timestamp ?? null,
    last_timestamp: records.at(-1)?.timestamp ?? null,
  };
}

export function normalizeDataQuality(value: unknown): DataQuality {
  if (!isRecord(value)) throw invalidResponse('dataset quality response is not an object.');
  return {
    total_records: numberValue(value.total_records, 'total_records'),
    missing_timestamps: numberValue(value.missing_timestamps ?? 0, 'missing_timestamps'),
    missing_metric_values: numberValue(value.missing_metric_values ?? 0, 'missing_metric_values'),
    invalid_timestamps: numberValue(value.invalid_timestamps ?? 0, 'invalid_timestamps'),
    invalid_numerical_values: numberValue(value.invalid_numerical_values ?? 0, 'invalid_numerical_values'),
    duplicate_records: numberValue(value.duplicate_records ?? 0, 'duplicate_records'),
    unique_entities: numberValue(value.unique_entities ?? value.entity_count ?? 0, 'unique_entities'),
    available_metrics: Array.isArray(value.available_metrics)
      ? value.available_metrics.map((item) => requiredString(item, 'available metric'))
      : [],
  };
}

export type QueryValue = string | number | boolean | string[] | null | undefined;

export function buildPath(path: string, params?: Record<string, QueryValue>) {
  if (!params) return path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 0) search.append(key, '__none__');
      else value.forEach((item) => search.append(key, item));
    } else if (value !== null && value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function describeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { detail?: unknown; message?: unknown };
    if (typeof body.detail === 'string') return body.detail;
    if (typeof body.message === 'string') return body.message;
  } catch {
    // Non-JSON error bodies fall through to the generic message below.
  }
  return `Request failed (${response.status})`;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isBackendConfigured) throw new BackendNotConfiguredError();

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('Backend is unreachable. Check that the FastAPI server is running.', null, 'unreachable');
  }

  if (!response.ok) {
    throw new ApiError(`Backend API error (${response.status}): ${await readErrorMessage(response)}`, response.status, 'http');
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('Backend API error: the backend returned an unreadable response.', response.status, 'response');
  }
}

export function postJson<T>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function downloadFromBackend(path: string, params: Record<string, QueryValue>, filename: string) {
  if (!isBackendConfigured) throw new BackendNotConfiguredError();

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${buildPath(path, params)}`);
  } catch {
    throw new ApiError('Backend is unreachable. Check that the FastAPI server is running.', null, 'unreachable');
  }
  if (!response.ok) {
    throw new ApiError(`Backend API error (${response.status}): ${await readErrorMessage(response)}`, response.status, 'http');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function uploadToBackend<T>(
  path: string,
  fields: Record<string, Blob | string | string[]>,
  onProgress: (fraction: number) => void
): Promise<T> {
  if (!isBackendConfigured) return Promise.reject(new BackendNotConfiguredError());

  return new Promise<T>((resolve, reject) => {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => form.append(key, item));
      } else {
        form.append(key, value);
      }
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}${path}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onerror = () =>
      reject(new ApiError('Backend is unreachable. Check that the FastAPI server is running.', null, 'unreachable'));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText) as { detail?: unknown };
          if (typeof body.detail === 'string') message = body.detail;
        } catch {
          // Keep the generic message when the error body is not JSON.
        }
        reject(new ApiError(`Backend API error (${xhr.status}): ${message}`, xhr.status, 'http'));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as T);
      } catch {
        reject(new ApiError('Backend API error: the backend returned an unreadable response.', xhr.status, 'response'));
      }
    };
    xhr.send(form);
  });
}
