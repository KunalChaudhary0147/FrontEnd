import { useCallback, useEffect, useState } from 'react';
import { apiRequest, buildPath, describeError, isBackendConfigured } from '@/lib/api';

export type BackendQueryState<T> =
  | { status: 'disconnected' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

type QueryValue = string | number | boolean | null | undefined;

export function useBackendQuery<T>(path: string, params?: Record<string, QueryValue>) {
  const key = buildPath(path, params);
  const [state, setState] = useState<BackendQueryState<T>>(
    isBackendConfigured ? { status: 'loading' } : { status: 'disconnected' }
  );
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!isBackendConfigured) {
      setState({ status: 'disconnected' });
      return;
    }
    let active = true;
    setState({ status: 'loading' });
    apiRequest<T>(key)
      .then((data) => {
        if (active) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: describeError(error) });
      });
    return () => {
      active = false;
    };
  }, [key, reloadToken]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { state, refetch };
}
