// src/hooks/useMatchedLicitaciones.js
import { useCallback } from 'react';
import { apiGet } from '../config/httpClient.js';
import { devLog } from '../utils/devLog.js';
import { useFetchResource } from './useFetchResource.js';

/**
 * Hook para cargar y gestionar licitaciones aptas (que cumplen requisitos).
 */
export function useMatchedLicitaciones() {
  const {
    data: matchedLicitaciones,
    loading: loadingMatched,
    error: errorMatched,
    load,
    clear,
  } = useFetchResource({ initialData: [] });

  /**
   * Carga las licitaciones aptas del usuario desde el backend
   * @param {string} searchQuery - Palabra clave opcional para filtrar
   */
  const loadMatched = useCallback(async (searchQuery = null) => {
    try {
      return await load(async () => {
        const queryStr = searchQuery ? `?search_query=${encodeURIComponent(searchQuery)}` : '';
        const data = await apiGet(`/saved/matched${queryStr}`);

        // Si el filtro por palabra clave no encontró aptas, reintentar sin filtro
        if (searchQuery && data.ok && Array.isArray(data.licitaciones) && data.licitaciones.length === 0) {
          devLog(`[MATCHED] Sin resultados para '${searchQuery}', reintentando sin filtro...`);
          const fallbackData = await apiGet('/saved/matched');
          if (fallbackData.ok && Array.isArray(fallbackData.licitaciones)) {
            devLog(`[MATCHED] ${fallbackData.licitaciones.length} licitaciones aptas cargadas`);
            return fallbackData.licitaciones;
          }
        }

        if (data.ok && Array.isArray(data.licitaciones)) {
          devLog(`[MATCHED] ${data.licitaciones.length} licitaciones aptas cargadas`);
          return data.licitaciones;
        }

        throw new Error(data.error || 'Error desconocido');
      });
    } catch (error) {
      console.error('[MATCHED] Error cargando licitaciones aptas:', error);
      return [];
    }
  }, [load]);

  /**
   * Limpia el estado de licitaciones aptas
   */
  const clearMatched = useCallback(() => {
    clear();
  }, [clear]);

  return {
    matchedLicitaciones,
    loadingMatched,
    errorMatched,
    loadMatched,
    clearMatched
  };
}
