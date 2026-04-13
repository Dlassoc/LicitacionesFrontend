// src/config/httpClient.js
import API_BASE_URL from './api.js';

/**
 * Cliente HTTP centralizado.
 * Wrapper sobre fetch() con credentials, headers y error handling consistentes.
 */

async function request(path, { method = 'GET', body, headers = {}, raw = false, ...rest } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const isFormData = body instanceof FormData;
  const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };

  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: { ...defaultHeaders, ...headers },
    body: isFormData ? body : (body != null ? JSON.stringify(body) : undefined),
    ...rest,
  });

  if (raw) return response;

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch { /* response sin JSON */ }
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export const apiGet = (path, opts) => request(path, { method: 'GET', ...opts });
export const apiPost = (path, body, opts) => request(path, { method: 'POST', body, ...opts });
export const apiPut = (path, body, opts) => request(path, { method: 'PUT', body, ...opts });
export const apiDelete = (path, opts) => request(path, { method: 'DELETE', ...opts });

export default request;
