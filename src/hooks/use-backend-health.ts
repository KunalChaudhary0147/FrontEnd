import { useEffect, useState } from 'react';
import { apiRequest, isBackendConfigured } from '@/lib/api';

export type BackendHealth = 'checking' | 'connected' | 'unreachable' | 'not-configured';

const HEALTH_INTERVAL_MS = 30000;

export function useBackendHealth() {
  const [health, setHealth] = useState<BackendHealth>(
    isBackendConfigured ? 'checking' : 'not-configured'
  );

  useEffect(() => {
    if (!isBackendConfigured) return;
    let active = true;

    const check = () => {
      apiRequest<unknown>('/health')
        .then(() => {
          if (active) setHealth('connected');
        })
        .catch(() => {
          if (active) setHealth('unreachable');
        });
    };

    check();
    const timer = window.setInterval(check, HEALTH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return health;
}
