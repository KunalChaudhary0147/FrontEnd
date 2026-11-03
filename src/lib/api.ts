const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim().replace(/\/$/, '') ?? '';

export const isBackendConfigured = BACKEND_URL.length > 0;

export class ApiError extends Error {
  status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class BackendNotConfiguredError extends Error {
  constructor() {
    super('Backend not connected');
    this.name = 'BackendNotConfiguredError';
  }
}

type QueryValue = string | number | boolean | null | undefined;

export function buildPath(path: string, params?: Record<string, QueryValue>) {
  if (!params) return path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
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
    throw new ApiError('Could not reach the backend.', null);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('The backend returned an unreadable response.', response.status);
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
    throw new ApiError('Could not reach the backend.', null);
  }
  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
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
    xhr.onerror = () => reject(new ApiError('Could not reach the backend.', null));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText) as { detail?: unknown };
          if (typeof body.detail === 'string') message = body.detail;
        } catch {
          // Keep the generic message when the error body is not JSON.
        }
        reject(new ApiError(message, xhr.status));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as T);
      } catch {
        reject(new ApiError('The backend returned an unreadable response.', xhr.status));
      }
    };
    xhr.send(form);
  });
}
