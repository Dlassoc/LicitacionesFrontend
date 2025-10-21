import { useMemo, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export function useSearchResults(initialLimit = 21) {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const [total, setTotal]       = useState(0);
  const [limit, setLimit]       = useState(initialLimit);
  const [offset, setOffset]     = useState(0);
  const [lastQuery, setLastQuery] = useState(null);

  const fetchBuscar = useCallback(async (paramsObj) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(paramsObj);
      const res = await fetch(`${API_BASE}/secop/buscar?${params.toString()}`);
      if (!res.ok) throw new Error("Error al conectar con el servidor");
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResultados(data.resultados || []);
      setTotal(data.total || 0);
      setLimit(data.limit || paramsObj.limit || initialLimit);
      setOffset(data.offset || 0);
    } catch (err) {
      setError(err.message);
      setResultados([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [initialLimit]);

  const buscar = useCallback(async (termino, fechaInicio, fechaFin, ciudad, departamento) => {
    if (!termino.trim()) return;
    const baseParams = {
      palabras_clave: termino.trim(),
      limit,
      offset: 0,
    };
    if (fechaInicio)   baseParams.fecha_inicio = fechaInicio;
    if (fechaFin)      baseParams.fecha_fin    = fechaFin;
    if (departamento)  baseParams.departamento = departamento;
    if (ciudad)        baseParams.ciudad       = ciudad;

    setLastQuery(baseParams);
    await fetchBuscar(baseParams);
  }, [fetchBuscar, limit]);

  const limpiar = useCallback(() => {
    setResultados([]);
    setTotal(0);
    setOffset(0);
    setLastQuery(null);
    setError(null);
  }, []);

  const goPage = useCallback(async (newOffset) => {
    if (!lastQuery) return;
    const p = { ...lastQuery, offset: newOffset, limit };
    await fetchBuscar(p);
  }, [lastQuery, limit, fetchBuscar]);

  const chips = useMemo(() => {
    if (!lastQuery) return [];
    const map = {
      palabras_clave: ["Término", lastQuery.palabras_clave],
      fecha_inicio:   ["Desde",   lastQuery.fecha_inicio],
      fecha_fin:      ["Hasta",   lastQuery.fecha_fin],
      departamento:   ["Departamento", lastQuery.departamento],
      ciudad:         ["Ciudad",       lastQuery.ciudad],
    };
    return Object.entries(map)
      .filter(([k, [, v]]) => lastQuery[k])
      .map(([k, [label, v]]) => ({ key: k, label, value: v }));
  }, [lastQuery]);

  return {
    resultados, loading, error,
    total, limit, offset, lastQuery,
    chips,
    setLimit, buscar, limpiar, goPage
  };
}