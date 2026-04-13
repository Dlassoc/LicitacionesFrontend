import { useState, useCallback, useRef } from 'react';
import { apiGet, apiPost } from '../config/httpClient.js';

/**
 * Hook para cargar licitaciones ya analizadas desde BD local.
 * Carga resultados instantáneamente sin consultar la API de SECOP.
 */
export const useAnalyzedLicitaciones = () => {
  const [analyzedLicitaciones, setAnalyzedLicitaciones] = useState([]);
  const [loadingAnalyzed, setLoadingAnalyzed] = useState(false);
  const [errorAnalyzed, setErrorAnalyzed] = useState(null);
  const latestRequestRef = useRef(0);

  const loadAnalyzed = useCallback(async (onlyAptas = false, searchQueryOrIds = null) => {
    const requestId = ++latestRequestRef.current;

    try {
      setLoadingAnalyzed(true);
      setErrorAnalyzed(null);

      let ids = [];
      let searchQuery = null;

      if (Array.isArray(searchQueryOrIds)) {
        ids = searchQueryOrIds;
      } else if (typeof searchQueryOrIds === 'string' && searchQueryOrIds.trim()) {
        searchQuery = searchQueryOrIds.trim();
      }

      if (ids.length === 0 && !searchQuery) {
        console.log(`[ANALYZED] Sin IDs ni palabra clave - no cargando licitaciones guardadas`);
        if (requestId === latestRequestRef.current) {
          setAnalyzedLicitaciones([]);
          setLoadingAnalyzed(false);
        }
        return;
      }

      let data;
      if (ids.length > 0) {
        data = await apiPost('/saved/analyzed', {
          ids,
          search_query: searchQuery,
          limit: 100,
          offset: 0,
          only_aptas: onlyAptas
        });
      } else {
        const params = new URLSearchParams({
          search_query: searchQuery,
          limit: 100,
          offset: 0,
          ...(onlyAptas && { only_aptas: 'true' })
        });
        data = await apiGet(`/saved/analyzed?${params.toString()}`);
      }

      if (data.ok && Array.isArray(data.licitaciones)) {
        if (requestId !== latestRequestRef.current) {
          console.log(`[ANALYZED] Respuesta obsoleta ignorada (requestId=${requestId})`);
          return [];
        }

        const hasPersistedEvidence = (lic) => {
          const requisitos = lic?.requisitos_extraidos;
          const detalles = lic?.detalles;
          const hasRequisitos =
            requisitos && typeof requisitos === 'object' && Object.keys(requisitos).length > 0;
          const hasDetalles =
            detalles && typeof detalles === 'object' && Object.keys(detalles).length > 0;
          const hasCumple = lic?.cumple !== undefined && lic?.cumple !== null;
          const hasScore = lic?.porcentaje !== undefined && lic?.porcentaje !== null;
          return hasRequisitos || hasDetalles || hasCumple || hasScore;
        };

        const terminalStates = new Set(['completado', 'sin_documentos', 'error']);

        const analyzedRows = data.licitaciones.filter((lic) => {
          const estado = String(lic?.estado || '').toLowerCase();
          return terminalStates.has(estado) || hasPersistedEvidence(lic);
        });

        const normalized = analyzedRows.map(lic => {
          let cumple_normalized = lic.cumple;
          const estado = String(lic?.estado || '').toLowerCase();
          const normalizedEstado = terminalStates.has(estado)
            ? estado
            : (hasPersistedEvidence(lic) ? 'completado' : estado || 'no_iniciado');

          if (typeof cumple_normalized === 'number') {
            cumple_normalized = cumple_normalized > 0;
          }

          return {
            ...lic,
            estado: normalizedEstado,
            _estado_original: lic?.estado,
            cumple: cumple_normalized
          };
        });

        console.log(`[ANALYZED] ${normalized.length} licitaciones analizadas cargadas de BD local`);

        const cumplen = normalized.filter(l => l.cumple === true).length;
        const noCumplen = normalized.filter(l => l.cumple === false).length;
        console.log(`[ANALYZED] Cumplen: ${cumplen} | No cumplen: ${noCumplen} | Otros: ${normalized.length - cumplen - noCumplen}`);

        setAnalyzedLicitaciones(normalized);
        return normalized;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      if (requestId !== latestRequestRef.current) {
        console.log(`[ANALYZED] Error obsoleto ignorado (requestId=${requestId}):`, error.message);
        return [];
      }

      console.error('[ANALYZED] Error cargando licitaciones analizadas:', error);
      setErrorAnalyzed(error.message);
      setAnalyzedLicitaciones([]);
      return [];
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoadingAnalyzed(false);
      }
    }
  }, []);

  const clearAnalyzed = useCallback(() => {
    setAnalyzedLicitaciones([]);
    setErrorAnalyzed(null);
  }, []);

  return {
    analyzedLicitaciones,
    loadingAnalyzed,
    errorAnalyzed,
    loadAnalyzed,
    clearAnalyzed
  };
};
