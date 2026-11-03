export const SEVERITY_LEVELS = ['normal', 'low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

export const ALERT_STATUSES = ['open', 'acknowledged', 'resolved'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const ADVANCED_METHODS = [
  { value: 'zscore', label: 'Z-score' },
  { value: 'rolling_zscore', label: 'Rolling z-score' },
  { value: 'multivariate', label: 'Multivariate' },
] as const;
export type AdvancedMethod = (typeof ADVANCED_METHODS)[number]['value'];

export interface MetricThreshold {
  metric: string;
  min: number | null;
  max: number | null;
}

export interface SeverityBoundaries {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface AnomalyConfig {
  metricThresholds: MetricThreshold[];
  zScoreSensitivity: number;
  rollingWindowSize: number;
  multivariateSensitivity: number;
  severityBoundaries: SeverityBoundaries;
}

export const DEFAULT_CONFIG: AnomalyConfig = {
  metricThresholds: [],
  zScoreSensitivity: 3,
  rollingWindowSize: 20,
  multivariateSensitivity: 0.9,
  severityBoundaries: { low: 2, medium: 3, high: 4, critical: 5 },
};

export interface SavedConfiguration {
  id: string;
  name: string;
  config: AnomalyConfig;
  updated_at: string;
}

export interface Alert {
  id: string;
  metric: string;
  entity: string;
  severity: Severity;
  status: AlertStatus;
  timestamp: string;
  explanation: string;
  observed_value: number | null;
  reference_value: number | null;
}

export interface TelemetryPoint {
  timestamp: string;
  entity: string;
  metric: string;
  value: number;
  unit?: string | null;
  source_type?: string | null;
  is_anomaly?: boolean;
}

export interface TelemetryResponse {
  records: TelemetryPoint[];
  total: number;
}

export interface IngestionSummary {
  records_ingested: number;
  metrics: string[];
  entities: string[];
  date_range?: { start: string; end: string } | null;
  errors?: string[] | null;
}

export interface GenericDetectionResult {
  timestamp: string;
  entity: string;
  metric: string;
  observed_value: number;
  is_anomaly: boolean;
  explanation: string;
}

export interface GenericDetectionResultsResponse {
  results: GenericDetectionResult[];
}

export interface AdvancedDetectionResultsResponse {
  results: DetectionResult[];
}

export interface AlertListResponse {
  alerts: Alert[];
}

export interface ConfigurationResponse {
  name: string;
  config: AnomalyConfig;
}

export interface DetectionResult {
  timestamp: string;
  metric: string;
  entity: string;
  observed_value: number;
  reference_value: number | null;
  score: number;
  method: string;
  prediction: boolean;
  severity: Severity;
  explanation: string;
}

export interface EvaluationResult {
  confusion_matrix: { tp: number; fp: number; tn: number; fn: number };
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
}

export interface DetectionResponse {
  results: DetectionResult[];
  evaluation: EvaluationResult | null;
}

export interface Catalog {
  metrics: string[];
  entities: string[];
}

export interface OverviewData {
  totals: {
    telemetry_records: number;
    anomalies: number;
    active_alerts: number;
    critical_alerts: number;
    monitored_entities: number;
  };
  metric_activity: { date: string; observations: number }[];
  observation_split: { date: string; normal: number; anomalous: number }[];
  severity_distribution: { severity: Severity; count: number }[];
  detection_activity: { date: string; detections: number }[];
  recent_alerts: Alert[];
  recent_detections: DetectionResult[];
}
