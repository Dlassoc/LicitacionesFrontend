import React from "react";
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
import { useMergedResults } from "./hooks/useResultNormalization.js";
import { useAppViewState } from "./hooks/useAppViewState.js";
import { useAppLifecycle } from "./hooks/useAppLifecycle.js";

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

  const {
    modalOpen,
    selectedItem,
    toast,
    searching,
    fromAutoPreferences,
    preferredKeywords,
    queryStringRef,
    setToast,
    setSearching,
    setFromAutoPreferences,
    setPreferredKeywords,
    hasInitialized,
    lastAnalyzedIdsKeyRef,
    handleBuscar,
    abrirModal,
    cerrarModal,
  } = useAppViewState({ buscar });

  // Resultados combinados y deduplicados (SECOP + BD)
  const memoizedResults = useMergedResults({
    resultados, allResultados,
    matchedLicitaciones, analyzedLicitaciones,
    discardedIds, isDiscarded
  });

  useAppLifecycle({
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
  });

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
