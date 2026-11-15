import { config } from './config.js';
import { session } from './session.js';

export interface RequestOptions {
  authenticated?: boolean;
  allowRetry?: boolean;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public responseBody?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function authenticateWithApiKey(apiKey: string): Promise<any> {
  const url = `${config.apiBaseUrl.replace(/\/+$/, '')}/api/auth/api-key`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!response.ok) {
    const msg = (json && (json.error || json.message)) || `API key authentication failed (${response.status})`;
    throw new ApiError(response.status, msg, json);
  }

  session.saveTokens(json.accessToken, undefined, json.user);
  return json;
}

export async function requestRaw(
  baseUrl: string,
  path: string,
  method: string = 'GET',
  body?: any,
  options: RequestOptions = {}
): Promise<any> {
  const { authenticated = true, allowRetry = true, headers = {} } = options;

  const url = `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (authenticated) {
    let token = session.getAccessToken();

    // Auto-authenticate with API key if access token is not present
    if (!token && session.getApiKey()) {
      try {
        const authResult = await authenticateWithApiKey(session.getApiKey()!);
        token = authResult.accessToken;
      } catch (err) {
        console.error('[technical-heist-mcp-server] Failed to authenticate with TECHNICALHEIST_API_KEY:', err);
      }
    }

    if (!token) {
      throw new ApiError(
        401,
        'Not authenticated. Please configure TECHNICALHEIST_API_KEY in your MCP environment or invoke the "login" tool.'
      );
    }
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: reqHeaders,
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const text = await response.text();
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  // Handle automatic token refresh if token expired
  if (response.status === 401 && authenticated && allowRetry) {
    // 1. Try API key re-exchange first if available
    if (session.getApiKey()) {
      try {
        await authenticateWithApiKey(session.getApiKey()!);
        return requestRaw(baseUrl, path, method, body, {
          ...options,
          allowRetry: false,
        });
      } catch {
        // Fall back to refresh token
      }
    }

    // 2. Try refresh token
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return requestRaw(baseUrl, path, method, body, {
        ...options,
        allowRetry: false,
      });
    } else {
      session.clearSession();
      throw new ApiError(
        401,
        'Session expired and refresh failed. Please re-authenticate using the "login" tool or check your TECHNICALHEIST_API_KEY.'
      );
    }
  }

  if (!response.ok) {
    const errorMsg =
      (typeof json === 'object' && json !== null && (json.error || json.message)) ||
      (typeof json === 'string' ? json : null) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorMsg, json);
  }

  return json;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = session.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${config.authBaseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken?: string };
    session.saveTokens(data.accessToken, data.refreshToken || refreshToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: (path: string, options?: RequestOptions) =>
    requestRaw(config.apiBaseUrl, path, 'GET', undefined, options),
  post: (path: string, body?: any, options?: RequestOptions) =>
    requestRaw(config.apiBaseUrl, path, 'POST', body, options),
  put: (path: string, body?: any, options?: RequestOptions) =>
    requestRaw(config.apiBaseUrl, path, 'PUT', body, options),
  delete: (path: string, options?: RequestOptions) =>
    requestRaw(config.apiBaseUrl, path, 'DELETE', undefined, options),
  authPost: (path: string, body?: any, options?: RequestOptions) =>
    requestRaw(config.authBaseUrl, path, 'POST', body, { ...options, authenticated: false }),
};
