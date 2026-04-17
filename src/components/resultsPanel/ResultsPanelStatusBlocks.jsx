import React from "react";
import SkeletonCard from "../../features/SkeletonCard.jsx";

export function PollingIndicator({ isPolling }) {
  if (!isPolling) return null;

  return (
    <div className="rp-analyzing-indicator">
      <span className="rp-analyzing-spinner"></span>
      <span className="rp-analyzing-text">Analizando licitaciones en background...</span>
    </div>
  );
}

export function ResultsPanelStatusBlocks({
  showingMatched,
  resultados,
  preferredKeywords,
  showOnlyMatching,
  isFromCache,
  hasResults,
  error,
  loading,
  lastQuery,
  showResults,
}) {
  return (
    <>
      {showingMatched && (
        <div className="rp-info-banner rp-info-banner-matched">
          <span className="rp-info-text">
            ✅ Mostrando <strong>{resultados.length} licitaciones</strong> que detectamos como aptas para ti. Realiza una búsqueda para ver más opciones.
          </span>
        </div>
      )}

      {preferredKeywords && preferredKeywords.length > 0 && !showOnlyMatching && (
        <div className="rp-info-banner">
          <span className="rp-info-text">
            📌 Mostrando licitaciones ordenadas por relevancia a tus palabras clave: <strong>{preferredKeywords.join(", ")}</strong>
          </span>
        </div>
      )}

      {isFromCache && hasResults && (
        <div className="rp-info-banner">
          <span className="rp-info-text">
            Mostrando tu última búsqueda guardada. Puedes hacer una nueva búsqueda o continuar navegando estos resultados.
          </span>
        </div>
      )}

      {error && <p className="rp-error">{error}</p>}

      {loading && (!resultados || resultados.length === 0) && (
        <div className="rp-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {loading && resultados && resultados.length > 0 && (
        <div className="rp-loading-inline">
          <span className="rp-analyzing-spinner rp-analyzing-spinner-sm"></span>
          Buscando más licitaciones en SECOP… Mostrando {resultados.length} de la base de datos.
        </div>
      )}

      {!loading && (!resultados || resultados.length === 0) && (lastQuery || showResults) && (
        <div className="rp-empty">
          No se encontraron resultados con los filtros actuales.
          <div className="mt-3">Prueba cambiando el término o ampliando el rango de fechas.</div>
        </div>
      )}
    </>
  );
}
