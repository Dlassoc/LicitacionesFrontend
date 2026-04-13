import { useMemo, useState, useCallback, useEffect } from "react";
import API_BASE_URL, { API_ENDPOINTS } from "../config/api.js";
import { getFinalDateRange } from "../utils/dateHelpers.js";

const API_BASE = API_BASE_URL;

// Claves para localStorage
const STORAGE_KEYS = {
  RESULTS: 'secop_search_results',
  QUERY: 'secop_last_query',
  TOTAL: 'secop_total',
  OFFSET: 'secop_offset',
  LIMIT: 'secop_limit'
};

/**
 * Hook de búsqueda para la API SECOP (Procesos)
 * Maneja paginación, filtros y chips de etiquetas activas.
 * IMPORTANTE: NO carga datos guardados en localStorage al iniciar (búsqueda siempre fresca)
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

  // Guardar en localStorage cuando cambien los estados
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(resultados));
    } catch (e) {
      console.warn('Error guardando resultados:', e);
    }
  }, [resultados]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TOTAL, total.toString());
    } catch (e) {
      console.warn('Error guardando total:', e);
    }
  }, [total]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LIMIT, limit.toString());
    } catch (e) {
      console.warn('Error guardando limit:', e);
    }
  }, [limit]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFSET, offset.toString());
    } catch (e) {
      console.warn('Error guardando offset:', e);
    }
  }, [offset]);

  useEffect(() => {
    try {
      if (lastQuery) {
        localStorage.setItem(STORAGE_KEYS.QUERY, JSON.stringify(lastQuery));
      } else {
        localStorage.removeItem(STORAGE_KEYS.QUERY);
      }
    } catch (e) {
      console.warn('Error guardando query:', e);
    }
  }, [lastQuery]);

  /**
   * Llama al backend /secop/buscar con los parámetros dados
   */
  const fetchBuscar = useCallback(
    async (paramsObj) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams(paramsObj);
        const res = await fetch(`${API_ENDPOINTS.SEARCH}?${params.toString()}`, {
          credentials: 'include',
        });

        if (!res.ok) throw new Error(`Error ${res.status}: no se pudo conectar al servidor`);

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setResultados(data.resultados || []);
        setTotal(data.total || 0);
        setLimit(data.limit || paramsObj.limit || initialLimit);
        setOffset(data.offset || 0);
        
        console.log(`[SEARCH] Búsqueda completada:`, {
          total: data.total,
          smart_search: data.smart_search,
          analyzed_count: data.analyzed_count,
          pending_count: data.pending_count,
          resultados: data.resultados?.length
        });
        
        // 🆕 Si es búsqueda inteligente, mostrar resumen y no cargar análisis por separado
        if (data.smart_search) {
          console.log(`
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
                const existingRes = await fetch(`${API_ENDPOINTS.BASE_URL}/analysis/batch/existing`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ ids })
                });
                
                if (existingRes.ok) {
                  const existingData = await existingRes.json();
                  console.log('[SEARCH] Análisis existentes cargados:', Object.keys(existingData.data || {}).length);
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
      const res = await fetch(`${API_BASE}/secop/mis-licitaciones?limit=50`, {
        credentials: 'include'
      });

      if (!res.ok) throw new Error(`Error ${res.status}: no se pudo conectar al servidor`);

      const data = await res.json();
      setResultados(data.resultados || []);
      setTotal(data.total || 0);
      setLimit(data.limit || 20);
      setOffset(data.offset || 0);
      
      console.log('[HOOKS] Mis licitaciones cargadas:', data.total);
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
   * Ejecuta una nueva búsqueda con los filtros dados
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
      console.log("[BUSCAR] 🔄 Limpiando resultados previos, iniciando búsqueda nueva...");

      // Fecha obligatoria: "Presentación de Ofertas" mes actual (BD actualizada)
      const { finalFechaRecDesde, finalFechaRecHasta } = getFinalDateRange(fechaRecDesde, fechaRecHasta);

      const baseParams = {
        palabras_clave: termino.trim(),
        limit: initialLimit,
        offset: 0,
      };

      if (fechaPubDesde) baseParams.fecha_pub_desde = fechaPubDesde;
      if (fechaPubHasta) baseParams.fecha_pub_hasta = fechaPubHasta;
      if (fechaManifDesde) baseParams.fecha_manif_desde = fechaManifDesde;
      if (fechaManifHasta) baseParams.fecha_manif_hasta = fechaManifHasta;
      if (finalFechaRecDesde) baseParams.fecha_rec_desde = finalFechaRecDesde;
      if (finalFechaRecHasta) baseParams.fecha_rec_hasta = finalFechaRecHasta;
      if (departamento) baseParams.departamento = departamento;
      if (ciudad) baseParams.ciudad = ciudad;
      if (fase) baseParams.fase = fase;
      if (estado) baseParams.estado = estado;

      setLastQuery(baseParams);
      setIsFromCache(false); // Marcar que ahora tenemos una búsqueda nueva, no del cache
      console.log("[BUSCAR] Buscando desde BD o SECOP según disponibilidad");
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
      localStorage.removeItem(STORAGE_KEYS.RESULTS);
      localStorage.removeItem(STORAGE_KEYS.TOTAL);
      localStorage.removeItem(STORAGE_KEYS.OFFSET);
      localStorage.removeItem(STORAGE_KEYS.LIMIT);
      localStorage.removeItem(STORAGE_KEYS.QUERY);
    } catch (e) {
      console.warn('Error limpiando localStorage:', e);
    }
  }, []);

  /**
   * Paginación: avanza a un nuevo offset conservando filtros anteriores
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
        const res = await fetch(`${API_ENDPOINTS.SEARCH}?${params.toString()}`, {
          credentials: 'include',
        });

        if (!res.ok) throw new Error(`Error ${res.status}: no se pudo conectar al servidor`);

        const data = await res.json();
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
            const fallbackRes = await fetch(`${API_ENDPOINTS.SEARCH}?${fallbackParams.toString()}`, {
              credentials: 'include',
            });

            if (!fallbackRes.ok) {
              throw new Error(`Error ${fallbackRes.status}: no se pudo cargar la última página válida`);
            }

            const fallbackData = await fallbackRes.json();
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
        console.log(`[SEARCH] 📄 Página ${Math.floor(newOffset / limit) + 1}: ${newResultados.length} licitaciones`);
        
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
  const chips = useMemo(() => {
    if (!lastQuery) return [];
    
    // Procesar palabras clave: si hay múltiples separadas por comas, mostrar cada una
    let palabrasClave = [];
    if (lastQuery.palabras_clave) {
      palabrasClave = lastQuery.palabras_clave
        .split(",")
        .map(p => p.trim())
        .filter(p => p);
    }
    
    const map = {
      ...(palabrasClave.length > 0 && { 
        palabras_clave: ["Busqueda", lastQuery.palabras_clave] 
      }),
      fecha_pub_desde: ["Pub. Desde", lastQuery.fecha_pub_desde],
      fecha_pub_hasta: ["Pub. Hasta", lastQuery.fecha_pub_hasta],
      fecha_rec_desde: ["Presentación Desde", lastQuery.fecha_rec_desde],
      fecha_rec_hasta: ["Presentación Hasta", lastQuery.fecha_rec_hasta],
      departamento: ["Depto", lastQuery.departamento],
      ciudad: ["Ciudad", lastQuery.ciudad],
    };

    return Object.entries(map)
      .filter(([k, [, v]]) => v) // solo valores definidos/no vacíos
      .map(([k, [label, v]]) => ({ key: k, label, value: v }));
  }, [lastQuery]);

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
