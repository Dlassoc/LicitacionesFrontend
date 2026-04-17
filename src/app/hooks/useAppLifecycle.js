import { useEffect, useCallback } from 'react';
import { apiGet } from '../../config/httpClient.js';

export function useAppLifecycle({
  ready,
  user,
  location,
  lastQuery,
  resultados,
  allResultados,
  matchedLicitaciones,
  analyzedLicitaciones,
  buscar,
  goPage,
  limpiar,
  cargarMisLicitaciones,
  loadDiscarded,
  loadMatched,
  loadAnalyzed,
  hasInitialized,
  queryStringRef,
  lastAnalyzedIdsKeyRef,
  setPreferredKeywords,
  setFromAutoPreferences,
  setSearching,
}) {
  useEffect(() => {
    if (lastQuery && typeof lastQuery === 'object') {
      queryStringRef.current = JSON.stringify(lastQuery);
      lastAnalyzedIdsKeyRef.current = '';
    }
  }, [lastQuery, analyzedLicitaciones, matchedLicitaciones, queryStringRef, lastAnalyzedIdsKeyRef]);

  const cargarPreferenciasYBuscar = useCallback(async () => {
    try {
      limpiar();
      const data = await apiGet('/subscriptions/me/preferences');

      if (data.ok && data.palabras_clave) {
        const palabrasArray = data.palabras_clave.split(',').map(p => p.trim()).filter(p => p);
        setPreferredKeywords(palabrasArray);
        setFromAutoPreferences(true);
        setSearching(true);
        await buscar(
          data.palabras_clave,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          data.ciudad,
          data.departamento,
          undefined,
          undefined
        );
        setSearching(false);
      }
    } catch (error) {
      console.error('[APP] Error cargando preferencias:', error);
    }
  }, [limpiar, buscar, setPreferredKeywords, setFromAutoPreferences, setSearching]);

  useEffect(() => {
    if (ready && user) loadDiscarded();
  }, [ready, user, loadDiscarded]);

  useEffect(() => {
    if (ready && user) loadMatched();
  }, [ready, user, loadMatched]);

  useEffect(() => {
    const baseSecopResults = allResultados && allResultados.length > 0 ? allResultados : resultados;

    if (!baseSecopResults || baseSecopResults.length === 0) {
      lastAnalyzedIdsKeyRef.current = '';
      return;
    }

    if (ready && user && baseSecopResults.length > 0) {
      const ids = baseSecopResults
        .map(r => r.ID_Portafolio || r.id_del_portafolio)
        .filter(Boolean);

      if (ids.length > 0) {
        const idsKey = Array.from(new Set(ids)).sort().join(',');
        if (lastAnalyzedIdsKeyRef.current === idsKey) return;
        lastAnalyzedIdsKeyRef.current = idsKey;
        loadAnalyzed(false, ids);
      }
    }
  }, [resultados, allResultados, ready, user, loadAnalyzed, lastAnalyzedIdsKeyRef]);

  useEffect(() => {
    if (ready && user && lastQuery && lastQuery.palabras_clave) {
      loadMatched(lastQuery.palabras_clave);
    }
  }, [ready, user, lastQuery, loadMatched]);

  useEffect(() => {
    if (!ready || !user || hasInitialized.current) return;
    hasInitialized.current = true;

    const searchParams = new URLSearchParams(location.search);
    const q = searchParams.get('q');
    const departamento = searchParams.get('departamento');
    const ciudad = searchParams.get('ciudad');

    if (q) {
      limpiar();
      const palabrasArray = q.split(',').map(p => p.trim()).filter(p => p);
      setPreferredKeywords(palabrasArray);
      setFromAutoPreferences(true);
      setSearching(true);
      buscar(
        q,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ciudad,
        departamento,
        undefined,
        undefined
      ).finally(() => setSearching(false));
      window.history.replaceState({}, document.title, '/app');
    } else {
      cargarPreferenciasYBuscar();
    }
  }, [
    ready,
    user,
    buscar,
    cargarMisLicitaciones,
    limpiar,
    location.search,
    hasInitialized,
    cargarPreferenciasYBuscar,
    setPreferredKeywords,
    setFromAutoPreferences,
    setSearching,
    goPage,
  ]);
}
