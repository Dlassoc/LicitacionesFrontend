// src/config/api.js
/**
 * Configuración de URLs de la API
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const API_ENDPOINTS = {
  // Auth
  AUTH_ME: `${API_BASE_URL}/auth/me`,
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,

  // SECOP
  SEARCH: `${API_BASE_URL}/secop/buscar`,

  // Extract IA
  EXTRACT_ANALYZE: `${API_BASE_URL}/extract_ia/analyze`,

  // Analysis
  ANALYZE_LOCAL: `${API_BASE_URL}/analysis/analyze-local`,

  // Subscriptions
  SUBS_CREATE: `${API_BASE_URL}/subs/crear`,
};

export default API_BASE_URL;
