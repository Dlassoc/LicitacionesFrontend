import { useMemo, useState, useCallback, useEffect } from "react";
import { API_ENDPOINTS } from "../config/api.js";
import { getFinalDateRange } from "../utils/dateHelpers.js";

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
 * Ahora con persistencia en localStorage para mantener resultados al recargar.
 */
export function useSearchResults(initialLimit = 21) {
  // Flag para saber si los resultados vienen del localStorage (no de una búsqueda nueva)
  const [isFromCache, setIsFromCache] = useState(() => {
    try {
      const savedResults = localStorage.getItem(STORAGE_KEYS.RESULTS);
      const savedQuery = localStorage.getItem(STORAGE_KEYS.QUERY);
      return !!(savedResults && savedQuery); // true si hay datos guardados
    } catch {
      return false;
    }
  });

  // Inicializar estados desde localStorage si existen
  const [resultados, setResultados] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESULTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [total, setTotal] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TOTAL);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  
  const [limit, setLimit] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LIMIT);
      return saved ? parseInt(saved, 10) : initialLimit;
    } catch {
      return initialLimit;
    }
  });
  
  const [offset, setOffset] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OFFSET);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  
  const [lastQuery, setLastQuery] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUERY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

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
        const res = await fetch(`${API_ENDPOINTS.SEARCH}?${params.toString()}`);

        if (!res.ok) throw new Error(`Error ${res.status}: no se pudo conectar al servidor`);

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setResultados(data.resultados || []);
        setTotal(data.total || 0);
        setLimit(data.limit || paramsObj.limit || initialLimit);
        setOffset(data.offset || 0);
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
   * Ejecuta una nueva búsqueda con los filtros dados
   */
  const buscar = useCallback(
    async (termino, fechaPubDesde, fechaPubHasta, fechaRecDesde, fechaRecHasta, ciudad, departamento, fase, estado) => {
      // Validación del término
      if (!termino || !termino.trim()) {
        console.warn("El término de búsqueda es requerido");
        return;
      }

      // Fecha obligatoria: "Presentación de Ofertas" mes actual (BD actualizada)
      const { finalFechaRecDesde, finalFechaRecHasta } = getFinalDateRange(fechaRecDesde, fechaRecHasta);

      const baseParams = {
        palabras_clave: termino.trim(),
        limit: initialLimit,
        offset: 0,
      };

      if (fechaPubDesde) baseParams.fecha_pub_desde = fechaPubDesde;
      if (fechaPubHasta) baseParams.fecha_pub_hasta = fechaPubHasta;
      if (finalFechaRecDesde) baseParams.fecha_rec_desde = finalFechaRecDesde;
      if (finalFechaRecHasta) baseParams.fecha_rec_hasta = finalFechaRecHasta;
      if (departamento) baseParams.departamento = departamento;
      if (ciudad) baseParams.ciudad = ciudad;
      if (fase) baseParams.fase = fase;
      if (estado) baseParams.estado = estado;

      setLastQuery(baseParams);
      setIsFromCache(false); // Marcar que ahora tenemos una búsqueda nueva, no del cache
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
        const p = { ...lastQuery, offset: newOffset, limit };
        const params = new URLSearchParams(p);
        const res = await fetch(`${API_ENDPOINTS.SEARCH}?${params.toString()}`);

        if (!res.ok) throw new Error(`Error ${res.status}: no se pudo conectar al servidor`);

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setResultados(data.resultados || []);
        setTotal(data.total || 0);
        setOffset(newOffset);
        setLimit(data.limit || limit);
      } catch (err) {
        console.error("Error en goPage:", err);
        setError(err.message || "Error al cargar la página");
        setResultados([]);
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
    limpiar,
    goPage,
  };
}
