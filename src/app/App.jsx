import React, { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header.jsx";
import ResultsPanel from "../components/ResultsPanel.jsx";
import ResultModal from "../components/ResultModal.jsx";
import { useSearchResults } from "../features/hooks.js";
import { useDiscardedLicitaciones } from "../hooks/useDiscardedLicitaciones.js";
import { useMatchedLicitaciones } from "../hooks/useMatchedLicitaciones.js";
import { useAnalyzedLicitaciones } from "../hooks/useAnalyzedLicitaciones.js";
import { useAutoAnalysis } from "../hooks/useAutoAnalysis.js";
import { useAuth } from "../auth/AuthContext.jsx";
import SplashScreen from "../components/SplashScreen.jsx";
import WelcomeToast from "../components/WelcomeToast.jsx";
import Toast from "../components/Toast.jsx";
import { apiGet } from "../config/httpClient.js";
import { useMergedResults } from "./hooks/useResultNormalization.js";

export default function App() {
  const { ready, user } = useAuth();
  const location = useLocation();

  const {
    resultados, loading, error,
    total, limit, offset, lastQuery, isFromCache, chips,
    buscar, cargarMisLicitaciones, limpiar, goPage
  } = useSearchResults(21);

  const { discarded, discardedIds, loadDiscarded, discardLicitacion, restoreDiscarded, isDiscarded } = useDiscardedLicitaciones();
  const { matchedLicitaciones, loadingMatched, errorMatched, loadMatched, clearMatched } = useMatchedLicitaciones();
  const { analyzedLicitaciones, loadingAnalyzed, errorAnalyzed, loadAnalyzed, clearAnalyzed } = useAnalyzedLicitaciones();
  const { analysisStatus, isPolling, allResultados, resumen, paginationStatus } = useAutoAnalysis(resultados, { lastQuery, total, limit, offset }, goPage);

  // Resultados combinados y deduplicados (SECOP + BD)
  const memoizedResults = useMergedResults({
    resultados, allResultados,
    matchedLicitaciones, analyzedLicitaciones,
    discardedIds, isDiscarded
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [searching, setSearching] = useState(false);
  const [fromAutoPreferences, setFromAutoPreferences] = useState(false);
  const [preferredKeywords, setPreferredKeywords] = useState(null);
  const [showingMatched, setShowingMatched] = useState(false);
  const hasInitialized = useRef(false);
  const queryStringRef = useRef("");
  const lastAnalyzedIdsKeyRef = useRef("");

  // Actualizar queryStringRef cuando lastQuery cambia
  useEffect(() => {
    if (lastQuery && typeof lastQuery === 'object') {
      queryStringRef.current = JSON.stringify(lastQuery);
      lastAnalyzedIdsKeyRef.current = "";
    }
  }, [lastQuery, analyzedLicitaciones, matchedLicitaciones]);

  const handleBuscar = async (...args) => {
    setSearching(true);
    setFromAutoPreferences(false);
    const termino = typeof args[0] === 'string' ? args[0].trim() : '';
    setPreferredKeywords(termino ? termino.split(',').map(p => p.trim()).filter(Boolean) : null);
    try {
      await buscar(...args);
    } finally {
      setSearching(false);
    }
  };

  const abrirModal = useCallback((item) => {
    setSelectedItem(item);
    setModalOpen(true);
  }, []);

  const cerrarModal = useCallback(() => {
    setModalOpen(false);
    setSelectedItem(null);
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Cargar preferencias y buscar automáticamente
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
          data.palabras_clave, undefined, undefined, undefined, undefined,
          undefined, undefined, data.ciudad, data.departamento, undefined, undefined
        );
        setSearching(false);
      }
    } catch (error) {
      console.error('[APP] Error cargando preferencias:', error);
    }
  }, [limpiar, buscar]);

  // Cargar descartadas al iniciar
  useEffect(() => {
    if (ready && user) loadDiscarded();
  }, [ready, user]);

  // Cargar matched al iniciar
  useEffect(() => {
    if (ready && user) loadMatched();
  }, [ready, user]);

  // Cargar análisis previos cuando hay resultados de SECOP
  useEffect(() => {
    const baseSecopResults = allResultados && allResultados.length > 0 ? allResultados : resultados;

    if (!baseSecopResults || baseSecopResults.length === 0) {
      lastAnalyzedIdsKeyRef.current = "";
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
  }, [resultados, allResultados, ready, user, loadAnalyzed]);

  // Cargar matched filtrando por palabra clave activa
  useEffect(() => {
    if (ready && user && lastQuery && lastQuery.palabras_clave) {
      loadMatched(lastQuery.palabras_clave);
    }
  }, [ready, user, lastQuery, loadMatched]);

  // Auto-búsqueda: ejecutar UNA vez al montar
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
        q, undefined, undefined, undefined, undefined,
        undefined, undefined, ciudad, departamento, undefined, undefined
      ).finally(() => setSearching(false));
      window.history.replaceState({}, document.title, '/app');
    } else {
      cargarPreferenciasYBuscar();
    }
  }, [ready, user, buscar, cargarMisLicitaciones, limpiar]);

  // Splash mientras Auth se inicializa
  if (!ready) return <SplashScreen text="Validando sesión…" />;

  const showSplash = loading && searching && memoizedResults.length === 0;

  return (
    <div className="min-h-screen main-bg relative">
      {showSplash && <SplashScreen text={lastQuery ? `Buscando proyectos…` : "Cargando resultados…"} />}

      <Header chips={chips} onBuscar={handleBuscar} onLimpiar={limpiar} />

      {ready && user && (
        <WelcomeToast text={`Bienvenido de nuevo, ${user.name || user.email} `} />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ResultsPanel
        resultados={memoizedResults && memoizedResults.length > 0 ? memoizedResults : []}
        loading={loading}
        error={error || errorAnalyzed || errorMatched}
        total={Math.max(0, (total || analyzedLicitaciones.length || matchedLicitaciones.length) - discardedIds.size)}
        limit={limit}
        offset={offset}
        lastQuery={queryStringRef.current}
        isFromCache={!resultados || resultados.length === 0 ? true : (isFromCache && !fromAutoPreferences)}
        onPage={goPage}
        onItemClick={abrirModal}
        onDiscard={discardLicitacion}
        discardedIds={discardedIds}
        isDiscarded={isDiscarded}
        preferredKeywords={preferredKeywords}
        showingMatched={!resultados || resultados.length === 0}
        analysisStatus={analysisStatus}
        isPolling={isPolling}
        allResultados={allResultados}
        resumen={resumen}
        paginationStatus={paginationStatus}
      />

      <ResultModal
        key={selectedItem?.ID_Portafolio || selectedItem?.id_del_portafolio || 'no-item'}
        open={modalOpen}
        item={selectedItem}
        onClose={cerrarModal}
        analysisStatus={analysisStatus}
      />
    </div>
  );
}
