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
   * termino → palabra clave obligatoria
   * fechaDesde / fechaHasta → YYYY-MM-DD
   * ciudad / departamento → opcionales
   */
  const buscar = useCallback(
    async (termino, fechaDesde, fechaHasta, ciudad, departamento) => {
      if (!termino || !termino.trim()) return;

      const baseParams = {
        palabras_clave: termino.trim(),
        limit,
        offset: 0, // siempre reset de página
      };

      if (fechaDesde) baseParams.fecha_pub_desde = fechaDesde;
      if (fechaHasta) baseParams.fecha_pub_hasta = fechaHasta;
      if (departamento) baseParams.departamento = departamento;
      if (ciudad) baseParams.ciudad = ciudad;

      setLastQuery(baseParams);
      await fetchBuscar(baseParams);
    },
    [fetchBuscar, limit]
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
      if (!lastQuery) return;
      const p = { ...lastQuery, offset: newOffset, limit };
      await fetchBuscar(p);
    },
    [lastQuery, limit, fetchBuscar]
  );

  /**
   * Chips de etiquetas activas (para mostrar los filtros usados)
   */
  const chips = useMemo(() => {
    if (!lastQuery) return [];
    const map = {
      palabras_clave: ["Término", lastQuery.palabras_clave],
      fecha_pub_desde: ["Desde", lastQuery.fecha_pub_desde],
      fecha_pub_hasta: ["Hasta", lastQuery.fecha_pub_hasta],
      departamento: ["Departamento", lastQuery.departamento],
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
