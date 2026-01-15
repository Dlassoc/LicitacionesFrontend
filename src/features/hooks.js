import { useMemo, useState, useCallback } from "react";
import { API_ENDPOINTS } from "../config/api.js";

/**
 * Hook de búsqueda para la API SECOP (Procesos)
 * Maneja paginación, filtros y chips de etiquetas activas.
 */
export function useSearchResults(initialLimit = 21) {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(initialLimit);
  const [offset, setOffset] = useState(0);
  const [lastQuery, setLastQuery] = useState(null);

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
    async (termino, fechaPubDesde, fechaPubHasta, fechaRecDesde, fechaRecHasta, ciudad, departamento) => {
      // Validación del término
      if (!termino || !termino.trim()) {
        console.warn("El término de búsqueda es requerido");
        return;
      }

      // Fecha obligatoria: "Presentación de Ofertas" enero 2025 (BD no actualizada con 2026)
      let finalFechaRecDesde = fechaRecDesde;
      let finalFechaRecHasta = fechaRecHasta;
      
      if (!finalFechaRecDesde) {
        finalFechaRecDesde = "2025-01-01"; // Desde inicio de enero 2025
      }
      if (!finalFechaRecHasta) {
        finalFechaRecHasta = "2025-01-31"; // Hasta fin de enero 2025
      }

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

      setLastQuery(baseParams);
      await fetchBuscar(baseParams);
    },
    [fetchBuscar, initialLimit]
  );

  /**
   * Limpia resultados y errores
   */
  const limpiar = useCallback(() => {
    setResultados([]);
    setTotal(0);
    setOffset(0);
    setLastQuery(null);
    setError(null);
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
    chips,
    setLimit,
    buscar,
    limpiar,
    goPage,
  };
}
