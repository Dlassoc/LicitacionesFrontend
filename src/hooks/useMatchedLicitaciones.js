// src/hooks/useMatchedLicitaciones.js
import { useState, useCallback } from 'react';
import { apiGet } from '../config/httpClient.js';

/**
 * Hook para cargar y gestionar licitaciones aptas (que cumplen requisitos).
 */
export function useMatchedLicitaciones() {
  const [matchedLicitaciones, setMatchedLicitaciones] = useState([]);
  const [loadingMatched, setLoadingMatched] = useState(false);
  const [errorMatched, setErrorMatched] = useState(null);

  /**
   * Carga las licitaciones aptas del usuario desde el backend
   * @param {string} searchQuery - Palabra clave opcional para filtrar
   */
  const loadMatched = useCallback(async (searchQuery = null) => {
    try {
      setLoadingMatched(true);
      setErrorMatched(null);

      const queryStr = searchQuery ? `?search_query=${encodeURIComponent(searchQuery)}` : '';
      const data = await apiGet(`/saved/matched${queryStr}`);

      // Si el filtro por palabra clave no encontró aptas, reintentar sin filtro
      if (searchQuery && data.ok && Array.isArray(data.licitaciones) && data.licitaciones.length === 0) {
        console.log(`[MATCHED] Sin resultados para '${searchQuery}', reintentando sin filtro...`);
        const fallbackData = await apiGet('/saved/matched');
        if (fallbackData.ok && Array.isArray(fallbackData.licitaciones)) {
          setMatchedLicitaciones(fallbackData.licitaciones);
          return fallbackData.licitaciones;
        }
      }

      if (data.ok && Array.isArray(data.licitaciones)) {
        console.log(`[MATCHED] ${data.licitaciones.length} licitaciones aptas cargadas`);
        setMatchedLicitaciones(data.licitaciones);
        return data.licitaciones;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('[MATCHED] Error cargando licitaciones aptas:', error);
      setErrorMatched(error.message);
      setMatchedLicitaciones([]);
      return [];
    } finally {
      setLoadingMatched(false);
    }
  }, []);

  /**
   * Limpia el estado de licitaciones aptas
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
