import { useState, useCallback, useRef } from 'react';
import API_BASE_URL from '../config/api';

/**
 * 🆕 Hook para cargar licitaciones ya analizadas desde BD local
 * 
 * Optimización: En lugar de consultar la API de SECOP nuevamente,
 * cargamos las licitaciones que ya analizamos y guardamos en BD.
 * 
 * Esto es útil para:
 * - Cargar resultados instantáneamente al iniciar la aplicación
 * - Evitar consultas innecesarias a la API
 * - Mostrar análisis previos sin esperar
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

      // 🆕 Aceptar array de IDs o string de palabra clave
      let ids = [];
      let searchQuery = null;
      
      if (Array.isArray(searchQueryOrIds)) {
        ids = searchQueryOrIds;
      } else if (typeof searchQueryOrIds === 'string' && searchQueryOrIds.trim()) {
        searchQuery = searchQueryOrIds.trim();
      }
      
      // 🆕 Si no hay IDs ni palabra clave, no cargar
      if (ids.length === 0 && !searchQuery) {
        console.log(`[ANALYZED] ℹ️ Sin IDs ni palabra clave - no cargando licitaciones guardadas`);
        if (requestId === latestRequestRef.current) {
          setAnalyzedLicitaciones([]);
          setLoadingAnalyzed(false);
        }
        return;
      }

      if (searchQuery) {
        console.log(`[ANALYZED] 📦 Cargando análisis previos para: "${searchQuery}"`);
      } else {
        console.log(`[ANALYZED] 📦 Cargando análisis previos para ${ids.length} IDs específicos`);
      }

      // 🆕 ENVIAR IDs como POST si los hay, o usar GET con palabra clave
      let response;
      if (ids.length > 0) {
        // POST con IDs específicos
        response = await fetch(`${API_BASE_URL}/saved/analyzed`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ids,
            search_query: searchQuery,
            limit: 100,
            offset: 0,
            only_aptas: onlyAptas
          })
        });
      } else {
        // GET con palabra clave
        const params = new URLSearchParams();
        params.append('search_query', searchQuery);
        params.append('limit', 100);
        params.append('offset', 0);
        if (onlyAptas) params.append('only_aptas', 'true');
        
        response = await fetch(`${API_BASE_URL}/saved/analyzed?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      const data = await response.json();

      if (data.ok && Array.isArray(data.licitaciones)) {
        if (requestId !== latestRequestRef.current) {
          console.log(`[ANALYZED] ⏭️ Respuesta obsoleta ignorada (requestId=${requestId})`);
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
          const hasScore =
            lic?.porcentaje !== undefined && lic?.porcentaje !== null;

          return hasRequisitos || hasDetalles || hasCumple || hasScore;
        };

        const terminalStates = new Set(['completado', 'sin_documentos', 'error']);

        // Incluir terminales y también registros con evidencia persistida (compatibilidad con datos legacy).
        const analyzedRows = data.licitaciones.filter((lic) => {
          const estado = String(lic?.estado || '').toLowerCase();
          return terminalStates.has(estado) || hasPersistedEvidence(lic);
        });

        // 🆕 Normalizar datos: convertir cumple a booleano/null
        const normalized = analyzedRows.map(lic => {
          let cumple_normalized = lic.cumple;
          const estado = String(lic?.estado || '').toLowerCase();
          const normalizedEstado = terminalStates.has(estado)
            ? estado
            : (hasPersistedEvidence(lic) ? 'completado' : estado || 'no_iniciado');
          
          // Si cumple es un número, convertir a booleano.
          // En MySQL TINYINT(1): 1=true y 0=false (no debe tratarse como null).
          if (typeof cumple_normalized === 'number') {
            if (cumple_normalized > 0) {
              cumple_normalized = true;
            } else {
              cumple_normalized = false;
            }
          }
          
          return {
            ...lic,
            estado: normalizedEstado,
            _estado_original: lic?.estado,
            cumple: cumple_normalized
          };
        });

        console.log(`
╔════════════════════════════════════════════════════════════╗
║ ✅ LICITACIONES ANALIZADAS CARGADAS DE BD LOCAL
╠════════════════════════════════════════════════════════════╣
║ 📊 Total encontradas: ${normalized.length}
║ 💾 Origen: Tabla licitaciones_analisis (BD propia)
║ ⚡ Velocidad: Instantáneo (sin API)
╠════════════════════════════════════════════════════════════╣
        `);

        // Mostrar desglose
        const cumplen = normalized.filter(l => l.cumple === true).length;
        const noCumplen = normalized.filter(l => l.cumple === false).length;
        const sinAnalizar = normalized.filter(l => l.cumple === null).length;

        console.log(`║ ✅ Cumplen requisitos: ${cumplen}`);
        console.log(`║  No cumplen: ${noCumplen}`);
        console.log(`║ ⏳ Sin analizar: ${sinAnalizar}`);
        console.log(`╚════════════════════════════════════════════════════════════╝
        `);

        // Log detallado
        normalized.forEach((lic, idx) => {
          const status = lic.cumple === true ? '✅' : lic.cumple === false ? '' : '⏳';
          const porcentaje = lic.porcentaje ? ` (${lic.porcentaje.toFixed(0)}%)` : '';
          const id = lic.id_portafolio || lic.id || '';
          console.log(`[ANALYZED] [${idx + 1}] ${status} ${id}${porcentaje}`);
        });

        setAnalyzedLicitaciones(normalized);
        return normalized;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      if (requestId !== latestRequestRef.current) {
        console.log(`[ANALYZED] ⏭️ Error obsoleto ignorado (requestId=${requestId}):`, error.message);
        return [];
      }

      console.error(`
╔════════════════════════════════════════════════════════════╗
║  ERROR CARGANDO LICITACIONES ANALIZADAS
╠════════════════════════════════════════════════════════════╣
║ Error: ${error.message}
╚════════════════════════════════════════════════════════════╝
      `, error);
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
