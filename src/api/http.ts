import { translate, translateServerMessage } from '../i18n';

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

let unauthorizedHandler: (() => void) | null = null;

/** Called whenever the server says the session is missing or expired. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, translate('err.network'));
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (response.status === 401 && !path.startsWith('/auth/')) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const payload = (data ?? {}) as { message?: string; errors?: Record<string, string> };
    // The server speaks English; show its known messages in the person's language.
    const fieldErrors = Object.fromEntries(
      Object.entries(payload.errors ?? {}).map(([field, message]) => [field, translateServerMessage(message)]),
    );
    throw new ApiError(
      response.status,
      payload.message ? translateServerMessage(payload.message) : translate('err.requestFailed', { status: response.status }),
      fieldErrors,
    );
  }

  return data as T;
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
};

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : translate('err.generic'));
