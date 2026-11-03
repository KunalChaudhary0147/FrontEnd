import { useCallback, useState } from 'react';
import { describeError, postJson } from '@/lib/api';

export type MutationState<T> =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

export function useBackendMutation<TBody, TResponse>(path: string) {
  const [state, setState] = useState<MutationState<TResponse>>({ status: 'idle' });

  const run = useCallback(
    async (body: TBody) => {
      setState({ status: 'running' });
      try {
        const data = await postJson<TResponse>(path, body);
        setState({ status: 'success', data });
        return data;
      } catch (error) {
        setState({ status: 'error', message: describeError(error) });
        return null;
      }
    },
    [path]
  );

  return { state, run };
}
