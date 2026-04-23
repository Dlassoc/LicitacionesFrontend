// src/config/httpClient.js
import API_BASE_URL from './api.js';

/**
 * Cliente HTTP centralizado.
 * Wrapper sobre fetch() con credentials, headers y error handling consistentes.
 */

const inFlightGetRequests = new Map();

async function request(
  path,
  { method = 'GET', body, headers = {}, raw = false, credentials, dedupe = true, ...rest } = {}
) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const normalizedMethod = String(method || 'GET').toUpperCase();

  // Para endpoints externos absolutos, evitar enviar cookies por defecto.
  const isAbsolute = /^https?:\/\//i.test(path);
  const defaultCredentials = isAbsolute ? 'same-origin' : 'include';
  const resolvedCredentials = credentials ?? defaultCredentials;

  const isFormData = body instanceof FormData;
  const hasJsonBody = body != null && !isFormData;
  const defaultHeaders = hasJsonBody ? { 'Content-Type': 'application/json' } : {};

  const shouldDedupeGet =
    dedupe &&
    normalizedMethod === 'GET' &&
    !raw &&
    !rest.signal;
  const dedupeKey = `${normalizedMethod} ${url} ${resolvedCredentials}`;

  if (shouldDedupeGet) {
    const existingRequest = inFlightGetRequests.get(dedupeKey);
    if (existingRequest) {
      return existingRequest;
    }
  }

  const performRequest = async () => {
    const response = await fetch(url, {
      method: normalizedMethod,
      credentials: resolvedCredentials,
      headers: { ...defaultHeaders, ...headers },
      body: isFormData ? body : (body != null ? JSON.stringify(body) : undefined),
      ...rest,
    });

    if (raw) return response;

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        errorMsg = errData.detail || errData.error || errData.message || errorMsg;
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
  };

  const promise = performRequest();

  if (shouldDedupeGet) {
    inFlightGetRequests.set(dedupeKey, promise);
    promise.finally(() => {
      inFlightGetRequests.delete(dedupeKey);
    });
  }

  return promise;
}

export const apiGet = (path, opts) => request(path, { method: 'GET', ...opts });
export const apiPost = (path, body, opts) => request(path, { method: 'POST', body, ...opts });
export const apiPut = (path, body, opts) => request(path, { method: 'PUT', body, ...opts });
export const apiDelete = (path, opts) => request(path, { method: 'DELETE', ...opts });

export default request;
