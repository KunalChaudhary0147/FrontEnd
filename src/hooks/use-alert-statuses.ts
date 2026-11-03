import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AlertStatus } from '@/types/domain';

export type AlertStatusMap = Record<string, AlertStatus>;

export function useAlertStatuses() {
  const [statuses, setStatuses] = useState<AlertStatusMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from('alert_status_overrides')
      .select('alert_id, status')
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) {
          setError('Could not load saved alert statuses.');
        } else {
          const map: AlertStatusMap = {};
          (data ?? []).forEach((row) => {
            map[row.alert_id as string] = row.status as AlertStatus;
          });
          setStatuses(map);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateStatus = useCallback(async (alertId: string, status: AlertStatus) => {
    const previous = statuses[alertId];
    setStatuses((current) => ({ ...current, [alertId]: status }));
    const { error: writeError } = await supabase.from('alert_status_overrides').upsert(
      { alert_id: alertId, status, updated_at: new Date().toISOString() },
      { onConflict: 'alert_id' }
    );
    if (writeError) {
      setStatuses((current) => {
        const next = { ...current };
        if (previous) next[alertId] = previous;
        else delete next[alertId];
        return next;
      });
      return false;
    }
    return true;
  }, [statuses]);

  return { statuses, loading, error, updateStatus };
}
