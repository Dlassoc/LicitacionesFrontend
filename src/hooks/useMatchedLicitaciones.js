// src/hooks/useMatchedLicitaciones.js
/**
 * 🆕 Hook para cargar y gestionar licitaciones aptas (que cumplen requisitos).
 * Automaticamente carga las licitaciones guardadas como "aptas" cuando el usuario inicia sesión.
 * 
 * Retorna:
 * - matchedLicitaciones: Array de licitaciones aptas guardadas
 * - loadingMatched: Boolean indicando si se están cargando
 * - errorMatched: String con mensaje de error (si aplica)
 * - loadMatched: Función para recargar las licitaciones aptas
 * - clearMatched: Función para limpiar el estado
 */

import { useState, useCallback, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export function useMatchedLicitaciones() {
  const [matchedLicitaciones, setMatchedLicitaciones] = useState([]);
  const [loadingMatched, setLoadingMatched] = useState(false);
  const [errorMatched, setErrorMatched] = useState(null);

  /**
   * 🆕 Carga las licitaciones aptas del usuario desde el backend
   */
  const loadMatched = useCallback(async () => {
    try {
      setLoadingMatched(true);
      setErrorMatched(null);

      console.log('[MATCHED_LICITACIONES] 📥 Cargando licitaciones aptas...');

      const response = await fetch(`${API_BASE}/saved/matched`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      const data = await response.json();

      if (data.ok && Array.isArray(data.licitaciones)) {
        console.log(`[MATCHED_LICITACIONES] ✅ Se cargaron ${data.licitaciones.length} licitaciones aptas`);
        setMatchedLicitaciones(data.licitaciones);
        return data.licitaciones;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('[MATCHED_LICITACIONES] ❌ Error al cargar licitaciones aptas:', error);
      setErrorMatched(error.message);
      setMatchedLicitaciones([]);
      return [];
    } finally {
      setLoadingMatched(false);
    }
  }, []);

  /**
   * 🆕 Limpia el estado de licitaciones aptas
   */
  const clearMatched = useCallback(() => {
    setMatchedLicitaciones([]);
    setErrorMatched(null);
  }, []);

  return {
    matchedLicitaciones,
    loadingMatched,
    errorMatched,
    loadMatched,
    clearMatched
  };
}
