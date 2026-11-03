import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CONFIG, type AnomalyConfig, type SavedConfiguration } from '@/types/domain';

function parseConfig(raw: unknown): AnomalyConfig {
  const partial = (raw && typeof raw === 'object' ? raw : {}) as Partial<AnomalyConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...partial,
    metricThresholds: Array.isArray(partial.metricThresholds) ? partial.metricThresholds : [],
    severityBoundaries: { ...DEFAULT_CONFIG.severityBoundaries, ...partial.severityBoundaries },
  };
}

export async function listConfigurations(): Promise<SavedConfiguration[]> {
  const { data, error } = await supabase
    .from('anomaly_configurations')
    .select('id, name, config, updated_at')
    .order('name');
  if (error) throw new Error('Could not load saved configurations.');
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    config: parseConfig(row.config),
    updated_at: row.updated_at as string,
  }));
}

export async function saveConfiguration(name: string, config: AnomalyConfig) {
  const { error } = await supabase.from('anomaly_configurations').upsert(
    { name, config, updated_at: new Date().toISOString() },
    { onConflict: 'name' }
  );
  if (error) throw new Error('Could not save the configuration. Please try again.');
}

export async function deleteConfiguration(id: string) {
  const { error } = await supabase.from('anomaly_configurations').delete().eq('id', id);
  if (error) throw new Error('Could not delete the configuration. Please try again.');
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
        setError(err instanceof Error ? err.message : 'Could not load saved configurations.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { configs, loading, error, reload };
}
