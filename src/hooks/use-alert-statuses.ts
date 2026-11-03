import { useCallback, useState } from 'react';
import type { AlertStatus } from '@/types/domain';

export type AlertStatusMap = Record<string, AlertStatus>;

export function useAlertStatuses() {
  const [statuses, setStatuses] = useState<AlertStatusMap>({});

  const updateStatus = useCallback(async (alertId: string, status: AlertStatus) => {
    setStatuses((current) => ({ ...current, [alertId]: status }));
    return true;
  }, []);

  return { statuses, updateStatus };
}
