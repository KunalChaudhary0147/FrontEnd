import { useCallback, useEffect, useState } from 'react';
import { apiRequest, describeError, postJson } from '@/lib/api';
import { DEFAULT_CONFIG, type AnomalyConfig, type SavedConfiguration } from '@/types/domain';

function parseConfig(raw: unknown): AnomalyConfig {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const thresholds = source.thresholds && typeof source.thresholds === 'object'
    ? Object.entries(source.thresholds as Record<string, { lower?: number; upper?: number }>).map(([metric, value]) => ({
      metric, min: value.lower ?? null, max: value.upper ?? null,
    }))
    : [];
  const severity = source.severity_policy && typeof source.severity_policy === 'object'
    ? source.severity_policy as Partial<Record<string, number>>
    : {};
  const partial = {
    metricThresholds: thresholds,
    zScoreSensitivity: source.z_score_sensitivity,
    rollingWindowSize: source.rolling_window_size,
    multivariateSensitivity: source.multivariate_sensitivity,
    severityBoundaries: {
      low: severity.low ?? DEFAULT_CONFIG.severityBoundaries.low,
      medium: severity.medium_score ?? DEFAULT_CONFIG.severityBoundaries.medium,
      high: severity.high_score ?? DEFAULT_CONFIG.severityBoundaries.high,
      critical: severity.critical_score ?? DEFAULT_CONFIG.severityBoundaries.critical,
    },
  } as Partial<AnomalyConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...partial,
    metricThresholds: Array.isArray(partial.metricThresholds) ? partial.metricThresholds : [],
    severityBoundaries: { ...DEFAULT_CONFIG.severityBoundaries, ...partial.severityBoundaries },
  };
}

export async function listConfigurations(): Promise<SavedConfiguration[]> {
  const data = await apiRequest<unknown[]>('/api/v1/configurations');
  if (!Array.isArray(data)) throw new Error('Backend API error: invalid configurations response.');
  return data.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id ?? item.name),
      name: String(item.name),
      config: parseConfig(item),
      updated_at: String(item.updated_at ?? ''),
    };
  });
}

export async function saveConfiguration(name: string, config: AnomalyConfig) {
  await postJson('/api/v1/configurations', {
    name,
    thresholds: Object.fromEntries(config.metricThresholds
      .filter((threshold) => threshold.metric.trim() && threshold.min !== null && threshold.max !== null)
      .map((threshold) => [threshold.metric, { lower: threshold.min, upper: threshold.max }])),
    z_score_sensitivity: config.zScoreSensitivity,
    rolling_window_size: config.rollingWindowSize,
    multivariate_sensitivity: config.multivariateSensitivity,
    medium_score: config.severityBoundaries.medium,
    high_score: config.severityBoundaries.high,
    critical_score: config.severityBoundaries.critical,
  });
}

export async function deleteConfiguration(id: string) {
  await apiRequest(`/api/v1/configurations/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function useSavedConfigurations() {
  const [configs, setConfigs] = useState<SavedConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    return listConfigurations()
      .then((rows) => {
        setConfigs(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(describeError(err));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { configs, loading, error, reload };
}
