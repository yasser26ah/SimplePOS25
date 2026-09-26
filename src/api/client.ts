// Cliente HTTP para el backend SimplePOS.
// Maneja tokens JWT (access + refresh), refresco automático y errores normalizados.

export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const tokens = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  save(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

let refreshPromise: Promise<boolean> | null = null;

/** Intenta renovar el access token. Devuelve true si tuvo éxito. */
async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokens.refresh;
  if (!refreshToken) return false;

  // Evita varias renovaciones en paralelo.
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const json = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
        tokens.save(json.data.accessToken, json.data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!skipAuth && tokens.access) {
    headers.set('Authorization', `Bearer ${tokens.access}`);
  }

  const doFetch = () => fetch(`${API_URL}${path}`, { ...init, headers });
  let res = await doFetch();

  // 401 → intentar refrescar y reintentar una vez.
  if (res.status === 401 && !skipAuth && tokens.refresh) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${tokens.access}`);
      res = await doFetch();
    } else {
      tokens.clear();
      window.dispatchEvent(new Event('simplepos:logout'));
      throw new ApiError('Sesión expirada. Inicia sesión de nuevo.', 401);
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const json = isJson ? ((await res.json()) as ApiEnvelope<T>) : undefined;

  if (!res.ok) {
    const message = json?.message || `Error ${res.status}`;
    if (res.status === 401) {
      tokens.clear();
      window.dispatchEvent(new Event('simplepos:logout'));
    }
    throw new ApiError(message, res.status);
  }

  if (!json) {
    throw new ApiError('Respuesta inválida del servidor', res.status);
  }
  return json.data;
}

export const apiGet = <T,>(path: string): Promise<T> => apiFetch<T>(path, { method: 'GET' });
export const apiPost = <T,>(path: string, body?: unknown): Promise<T> =>
  apiFetch<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPut = <T,>(path: string, body: unknown): Promise<T> =>
  apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiDelete = <T,>(path: string): Promise<T> => apiFetch<T>(path, { method: 'DELETE' });
