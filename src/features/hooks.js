import { useMemo, useState, useCallback, useEffect } from "react";
import { devLog } from "../utils/devLog.js";
import { apiGet, apiPost } from "../config/httpClient.js";
import { SEARCH_STORAGE_KEYS } from "./searchResults/storage.js";
import { useSearchResultsPersistence } from "./searchResults/useSearchResultsPersistence.js";
import { buildSearchChips, buildSearchParams } from "./searchResults/queryHelpers.js";

/**
 * Hook de búsqueda para la API SECOP (Procesos).
 * Maneja estado de resultados, filtros, paginación y chips de filtros activos.
 * No hidrata resultados desde localStorage al iniciar para evitar datos stale.
 *
 * @param {number} [initialLimit=21] Tamaño de página inicial.
 * @returns {{
 *   resultados: Array,
 *   loading: boolean,
 *   error: string | null,
 *   total: number,
 *   limit: number,
 *   offset: number,
 *   lastQuery: Record<string, string> | null,
 *   isFromCache: boolean,
 *   chips: Array,
 *   setLimit: import("react").Dispatch<import("react").SetStateAction<number>>,
 *   buscar: Function,
 *   cargarMisLicitaciones: Function,
 *   limpiar: Function,
 *   goPage: Function,
 * }} API del hook para componentes de vista.
 */
export function useSearchResults(initialLimit = 21) {
  // NO cargar datos del caché - siempre empezar vacío
  const [isFromCache, setIsFromCache] = useState(false);

  // Inicializar siempre vacío - sin cargar de localStorage
  const [resultados, setResultados] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [total, setTotal] = useState(0);
  
  const [limit, setLimit] = useState(initialLimit);
  
  const [offset, setOffset] = useState(0);
  
  const [lastQuery, setLastQuery] = useState(null);

  useSearchResultsPersistence({ resultados, total, limit, offset, lastQuery });

  /**
   * Llama al backend /secop/buscar con los parámetros dados
   */
  const fetchBuscar = useCallback(
    async (paramsObj) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams(paramsObj);
        const data = await apiGet(`/secop/buscar?${params.toString()}`);
        if (data.error) throw new Error(data.error);

        setResultados(data.resultados || []);
        setTotal(data.total || 0);
        setLimit(data.limit || paramsObj.limit || initialLimit);
        setOffset(data.offset || 0);
        
        devLog(`[SEARCH] Búsqueda completada:`, {
          total: data.total,
          smart_search: data.smart_search,
          analyzed_count: data.analyzed_count,
          pending_count: data.pending_count,
          resultados: data.resultados?.length
        });
        
        // 🆕 Si es búsqueda inteligente, mostrar resumen y no cargar análisis por separado
        if (data.smart_search) {
          devLog(`
╔════════════════════════════════════════════════════════════╗
║ 🔍 BÚSQUEDA INTELIGENTE - RESUMEN
╠════════════════════════════════════════════════════════════╣
║ ✅ Analizadas anteriormente: ${data.analyzed_count || 0}
║ ⏳ Nuevas siendo analizadas: ${data.pending_count || 0}
║ 📊 Total en resultados: ${data.resultados?.length || 0}
╚════════════════════════════════════════════════════════════╝
          `);
        } else {
          // 🆕 Cargar análisis existentes en la BD para los resultados encontrados
          if (data.resultados && data.resultados.length > 0) {
            try {
              const ids = data.resultados
                .map(r => r.ID_Portafolio || r.id_del_portafolio)
                .filter(Boolean);
              
              if (ids.length > 0) {
                const existingData = await apiPost('/analysis/batch/existing', { ids });
                if (existingData?.ok) {
                  devLog('[SEARCH] Análisis existentes cargados:', Object.keys(existingData.data || {}).length);
                  // El hook useAutoAnalysis usará esta información
                }
              }
            } catch (err) {
              console.warn('[SEARCH] Error cargando análisis existentes:', err.message);
              // No es crítico si falla
            }
          }
        }
      } catch (err) {
        console.error("Error en fetchBuscar:", err);
        setError(err.message || "Error desconocido");
        setResultados([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [initialLimit]
  );

  /**
   * 🆕 Carga las licitaciones analizadas del usuario (sin búsqueda)
   */
  const cargarMisLicitaciones = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiGet('/secop/mis-licitaciones?limit=50');
      setResultados(data.resultados || []);
      setTotal(data.total || 0);
      setLimit(data.limit || 20);
      setOffset(data.offset || 0);
      
      devLog('[HOOKS] Mis licitaciones cargadas:', data.total);
    } catch (err) {
      console.error("[HOOKS] Error en cargarMisLicitaciones:", err);
      setError(err.message || "Error desconocido");
      setResultados([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
    * Ejecuta una búsqueda nueva y reinicia paginación.
   */
  const buscar = useCallback(
    async (termino, fechaPubDesde, fechaPubHasta, fechaManifDesde, fechaManifHasta, fechaRecDesde, fechaRecHasta, ciudad, departamento, fase, estado) => {
      // Validación del término
      if (!termino || !termino.trim()) {
        console.warn("El término de búsqueda es requerido");
        return;
      }

      // 🔧 LIMPIAR resultados previos cuando inicia búsqueda nueva
      setResultados([]);
      setOffset(0);
      devLog("[BUSCAR] 🔄 Limpiando resultados previos, iniciando búsqueda nueva...");

      const baseParams = buildSearchParams({
        termino,
        fechaPubDesde,
        fechaPubHasta,
        fechaManifDesde,
        fechaManifHasta,
        fechaRecDesde,
        fechaRecHasta,
        ciudad,
        departamento,
        fase,
        estado,
        initialLimit,
      });

      setLastQuery(baseParams);
      setIsFromCache(false); // Marcar que ahora tenemos una búsqueda nueva, no del cache
      devLog("[BUSCAR] Buscando desde BD o SECOP según disponibilidad");
      await fetchBuscar(baseParams);
    },
    [fetchBuscar, initialLimit]
  );

  /**
   * Limpia resultados y errores (incluyendo localStorage)
   */
  const limpiar = useCallback(() => {
    setResultados([]);
    setTotal(0);
    setOffset(0);
    setLastQuery(null);
    setIsFromCache(false);
    setError(null);
    
    // Limpiar también del localStorage
    try {
      localStorage.removeItem(SEARCH_STORAGE_KEYS.RESULTS);
      localStorage.removeItem(SEARCH_STORAGE_KEYS.TOTAL);
      localStorage.removeItem(SEARCH_STORAGE_KEYS.OFFSET);
      localStorage.removeItem(SEARCH_STORAGE_KEYS.LIMIT);
      localStorage.removeItem(SEARCH_STORAGE_KEYS.QUERY);
    } catch (e) {
      console.warn('Error limpiando localStorage:', e);
    }
  }, []);

  /**
    * Cambia de página conservando los filtros de la última búsqueda.
    * @param {number} newOffset Offset de inicio para la página objetivo.
   */
  const goPage = useCallback(
    async (newOffset) => {
      if (!lastQuery) {
        console.warn("No hay última búsqueda para paginar");
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Paginación conserva los mismos filtros
        const p = { ...lastQuery, offset: newOffset, limit };
        const params = new URLSearchParams(p);
        const data = await apiGet(`/secop/buscar?${params.toString()}`);
        if (data.error) throw new Error(data.error);

        // Fallback visual: si el offset solicitado cae en pagina vacia,
        // volver automaticamente a la ultima pagina valida.
        const pageResults = data.resultados || [];
        const backendTotal = Number(data.total || 0);
        const backendLimit = Number(data.limit || limit || initialLimit);
        if (pageResults.length === 0 && backendTotal > 0 && newOffset > 0 && backendLimit > 0) {
          const maxValidOffset = Math.floor((backendTotal - 1) / backendLimit) * backendLimit;
          if (newOffset !== maxValidOffset) {
            console.warn(
              `[SEARCH] Offset fuera de rango (${newOffset}). ` +
              `Redirigiendo a última página válida (${maxValidOffset}).`
            );

            const fallbackParams = new URLSearchParams({
              ...lastQuery,
              offset: String(maxValidOffset),
              limit: String(backendLimit),
            });
            const fallbackData = await apiGet(`/secop/buscar?${fallbackParams.toString()}`);
            if (fallbackData.error) throw new Error(fallbackData.error);

            const fallbackResultados = fallbackData.resultados || [];
            setResultados(fallbackResultados);
            setTotal(fallbackData.total || backendTotal);
            setOffset(maxValidOffset);
            setLimit(fallbackData.limit || backendLimit);
            return;
          }
        }

        // Mostrar la página actual sin arrastrar resultados anteriores.
        // useAutoAnalysis ya acumula internamente allResultados para métricas/progreso.
        const newResultados = pageResults;
        setResultados(newResultados);
        devLog(`[SEARCH] 📄 Página ${Math.floor(newOffset / limit) + 1}: ${newResultados.length} licitaciones`);
        
        setTotal(data.total || 0);
        setOffset(newOffset);
        setLimit(data.limit || limit);
      } catch (err) {
        console.error("Error en goPage:", err);
        setError(err.message || "Error al cargar la página");
        // 🔧 NO limpiar resultados en error, mantener los que ya tenemos
      } finally {
        setLoading(false);
      }
    },
    [lastQuery, limit]
  );

  /**
   * Chips de etiquetas activas (para mostrar los filtros usados)
   */
  const chips = useMemo(() => buildSearchChips(lastQuery), [lastQuery]);

  return {
    resultados,
    loading,
    error,
    total,
    limit,
    offset,
    lastQuery,
    isFromCache,
    chips,
    setLimit,
    buscar,
    cargarMisLicitaciones,  // 🆕 Nueva función para cargar licitaciones del usuario
    limpiar,
    goPage,
  };
}
