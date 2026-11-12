import { getApiBaseUrl } from './config';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function mobileApiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<T> {
  const base = await getApiBaseUrl();
  const url = `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      let errDetails: any = null;

      try {
        const errJson = await response.json();
        errDetails = errJson;
        if (errJson.detail) {
          if (Array.isArray(errJson.detail)) {
            errorMessage = errJson.detail
              .map((d: any) => `${d.loc?.slice(-1)[0] || 'Field'}: ${d.msg}`)
              .join('; ');
          } else if (typeof errJson.detail === 'string') {
            errorMessage = errJson.detail;
          }
        }
      } catch {
        errorMessage = `HTTP ${response.status} ${response.statusText}`;
      }

      throw new ApiError(errorMessage, response.status, errDetails);
    }

    return await response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your server connection.', 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network connection failed. Verify host PC is reachable.', 0);
  }
}

export async function checkServerHealth(): Promise<{ online: boolean; message: string; version?: string }> {
  try {
    const res = await mobileApiRequest('/health', { method: 'GET' }, 4000);
    return {
      online: true,
      message: res.status || 'Connected',
      version: res.version,
    };
  } catch (err: any) {
    return {
      online: false,
      message: err.message || 'Offline',
    };
  }
}
