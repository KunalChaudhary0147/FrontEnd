import { useCallback, useEffect, useState } from 'react';
import {
  apiRequest,
  BACKEND_DATA_CHANGED_EVENT,
  buildPath,
  describeError,
  isBackendConfigured,
  type QueryValue,
} from '@/lib/api';

export type BackendQueryState<T> =
  | { status: 'disconnected' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

export function useBackendQuery<T>(
  path: string,
  params?: Record<string, QueryValue>,
  normalize?: (value: unknown) => T,
  enabled = true
) {
  const key = buildPath(path, params);
  const [state, setState] = useState<BackendQueryState<T>>(
    isBackendConfigured ? { status: 'loading' } : { status: 'disconnected' }
  );
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (!isBackendConfigured) {
      setState({ status: 'disconnected' });
      return;
    }
    let active = true;
    setState({ status: 'loading' });
    apiRequest<unknown>(key)
      .then((data) => (normalize ? normalize(data) : (data as T)))
      .then((data) => {
        if (active) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: describeError(error) });
      });
    const refresh = () => setReloadToken((token) => token + 1);
    window.addEventListener(BACKEND_DATA_CHANGED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(BACKEND_DATA_CHANGED_EVENT, refresh);
    };
  }, [enabled, key, reloadToken, normalize]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { state, refetch };
}
