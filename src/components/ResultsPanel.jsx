import React, { useCallback } from "react";
import ResultsCategoryContent from "./resultsPanel/ResultsCategoryContent.jsx";
import { PollingIndicator, ResultsPanelStatusBlocks } from "./resultsPanel/ResultsPanelStatusBlocks.jsx";
import ResultsPanelHeader from "./resultsPanel/ResultsPanelHeader.jsx";
import ResultsPagination from "./resultsPanel/ResultsPagination.jsx";
import { useResultsPanelState } from "./resultsPanel/useResultsPanelState.js";
import "../styles/components/results-panel.css";

export default function ResultsPanel({
  resultados, loading, error,
  total, limit, offset, lastQuery, isFromCache,
  onPage,
  onItemClick,
  onDiscard,  // 🗑️ NUEVO: Handler para descartar
  discardedIds,  // 🗑️ NUEVO: Set de IDs descartadas
  isDiscarded,  // 🗑️ NUEVO: Función para verificar descarte
  preferredKeywords,
  showingMatched = false, // 🆕 Flag para indicar si estamos mostrando licitaciones aptas
  analysisStatus = {},  // 🆕 Recibir analysisStatus desde App
  isPolling = false,  // 🆕 Recibir isPolling desde App
  allResultados = [],  // 🆕 Recibir allResultados desde App (total de licitaciones a analizar)
  resumen = {},  // 🆕 Recibir resumen con contadores
  paginationStatus = {}  // 🆕 Recibir información de paginación
}) {
  const DEBUG_RESULTS_PANEL = ['1', 'true', 'yes', 'on'].includes(
    String(import.meta.env.VITE_DEBUG_RESULTS_PANEL ?? 'false').toLowerCase()
  );
  const debugLog = useCallback((...args) => {
    if (DEBUG_RESULTS_PANEL) console.log(...args);
  }, [DEBUG_RESULTS_PANEL]);

  debugLog('[RESULTS_PANEL] 📥 PROPS RECIBIDAS - resultados:', resultados?.length || 0, 'items');
  debugLog('[RESULTS_PANEL] 📥 tipos:', typeof resultados, Array.isArray(resultados) ? 'es array' : 'NO es array');
  debugLog('[RESULTS_PANEL] 📥 loading:', loading, 'error:', !!error);
  const {
    filterCategory,
    setFilterCategory,
    showOnlyMatching,
    setShowOnlyMatching,
    expandedSections,
    setExpandedSections,
    stableAnalysisStatus,
    categorized,
    resultadosFiltrados,
  } = useResultsPanelState({
    resultados,
    analysisStatus,
    discardedIds,
    isDiscarded,
    preferredKeywords,
    debugLog,
  });

  const { cumple, noCumple, sinDocumentos, sinAnalizar, sinRequisitos } = categorized;

  // 🆕 ARREGLO: Mostrar si hay resultados categorizados O si hay datos crudos, NO solo si hay lastQuery
  const hasResults = resultados && resultados.length > 0;
  const hasCategorizedResults = cumple.length > 0 || noCumple.length > 0 || sinDocumentos.length > 0 || sinAnalizar.length > 0 || sinRequisitos.length > 0;
  const showResults = hasResults || hasCategorizedResults || lastQuery;
  const loadedCount = Array.isArray(resultados) ? resultados.length : 0;

  return (
    <div className="rp">
      <div className="rp-box">
        <ResultsPanelHeader
          loading={loading}
          resultados={resultados}
          lastQuery={lastQuery}
          total={total}
          loadedCount={loadedCount}
          offset={offset}
          limit={limit}
          hasResults={hasResults}
        />
        
        <PollingIndicator isPolling={isPolling} />

        {showResults && (
          <div className="rp-body">
            <ResultsPanelStatusBlocks
              showingMatched={showingMatched}
              resultados={resultados}
              preferredKeywords={preferredKeywords}
              showOnlyMatching={showOnlyMatching}
              isFromCache={isFromCache}
              hasResults={hasResults}
              error={error}
              loading={loading}
              lastQuery={lastQuery}
              showResults={showResults}
            />

            {/* 🆕 Mostrar items SIEMPRE que existan, incluso durante loading */}
            {resultados && resultados.length > 0 && (
              <>
                <ResultsCategoryContent
                  preferredKeywords={preferredKeywords}
                  showOnlyMatching={showOnlyMatching}
                  setShowOnlyMatching={setShowOnlyMatching}
                  resultadosFiltrados={resultadosFiltrados}
                  filterCategory={filterCategory}
                  setFilterCategory={setFilterCategory}
                  allResultados={allResultados}
                  cumple={cumple}
                  noCumple={noCumple}
                  sinDocumentos={sinDocumentos}
                  sinRequisitos={sinRequisitos}
                  sinAnalizar={sinAnalizar}
                  expandedSections={expandedSections}
                  setExpandedSections={setExpandedSections}
                  onItemClick={onItemClick}
                  onDiscard={onDiscard}
                  analysisStatus={stableAnalysisStatus}
                />
              </>
            )}
          </div>
        )}

        <ResultsPagination
          resultados={resultados}
          offset={offset}
          limit={limit}
          total={total}
          onPage={onPage}
        />
      </div>
    </div>
  );
}
