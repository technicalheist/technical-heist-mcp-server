import { config } from './config.js';
import { session } from './session.js';
export class ApiError extends Error {
    statusCode;
    responseBody;
    constructor(statusCode, message, responseBody) {
        super(message);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
        this.name = 'ApiError';
    }
}
export async function requestRaw(baseUrl, path, method = 'GET', body, options = {}) {
    const { authenticated = true, allowRetry = true, headers = {} } = options;
    const url = `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
    const reqHeaders = {
        'Content-Type': 'application/json',
        ...headers,
    };
    if (authenticated) {
        const token = session.getAccessToken();
        if (!token) {
            throw new ApiError(401, 'Not authenticated. Please invoke the "login" tool first with your email and password, or supply TECHNICALHEIST_ACCESS_TOKEN.');
        }
        reqHeaders['Authorization'] = `Bearer ${token}`;
    }
    const fetchOptions = {
        method,
        headers: reqHeaders,
    };
    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const response = await fetch(url, fetchOptions);
    const text = await response.text();
    let json = null;
    if (text) {
        try {
            json = JSON.parse(text);
        }
        catch {
            json = text;
        }
    }
    // Handle automatic token refresh if token expired
    if (response.status === 401 && authenticated && allowRetry) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            return requestRaw(baseUrl, path, method, body, {
                ...options,
                allowRetry: false,
            });
        }
        else {
            session.clearSession();
            throw new ApiError(401, 'Session expired and refresh failed. Please re-authenticate using the "login" tool.');
        }
    }
    if (!response.ok) {
        const errorMsg = (typeof json === 'object' && json !== null && (json.error || json.message)) ||
            (typeof json === 'string' ? json : null) ||
            `Request failed with status ${response.status}`;
        throw new ApiError(response.status, errorMsg, json);
    }
    return json;
}
async function tryRefreshToken() {
    const refreshToken = session.getRefreshToken();
    if (!refreshToken)
        return false;
    try {
        const res = await fetch(`${config.authBaseUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok)
            return false;
        const data = (await res.json());
        session.saveTokens(data.accessToken, data.refreshToken || refreshToken);
        return true;
    }
    catch {
        return false;
    }
}
export const api = {
    get: (path, options) => requestRaw(config.apiBaseUrl, path, 'GET', undefined, options),
    post: (path, body, options) => requestRaw(config.apiBaseUrl, path, 'POST', body, options),
    put: (path, body, options) => requestRaw(config.apiBaseUrl, path, 'PUT', body, options),
    delete: (path, options) => requestRaw(config.apiBaseUrl, path, 'DELETE', undefined, options),
    authPost: (path, body, options) => requestRaw(config.authBaseUrl, path, 'POST', body, { ...options, authenticated: false }),
};
