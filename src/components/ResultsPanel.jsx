import React, { useState, useMemo } from "react";
import ResultCard from "../features/ResultCard.jsx";
import SkeletonCard from "../features/SkeletonCard.jsx";
import { useAutoAnalysis } from "../hooks/useAutoAnalysis.js";
import "../styles/components/results-panel.css";

export default function ResultsPanel({
  resultados, loading, error,
  total, limit, offset, lastQuery, isFromCache, savedIds,
  onPage,
  onItemClick,
  onToggleSave
}) {
  const [filterCategory, setFilterCategory] = useState('all'); // 'all', 'cumple', 'no-cumple'
  
  // Hook para análisis automático en background
  const { analysisStatus, isPolling, pageIndex } = useAutoAnalysis(resultados, {
    lastQuery,
    offset,
    limit,
    total
  });

  // Categorizar resultados por cumplimiento
  const { cumple, noCumple, sinAnalizar } = useMemo(() => {
    const c = [];
    const nc = [];
    const sa = [];

    resultados?.forEach((item) => {
      const idPortafolio = item.ID_Portafolio || item.id_del_portafolio;
      const status = analysisStatus[idPortafolio];

      if (!status || status.estado !== 'completado') {
        sa.push(item);
      } else if (status.cumple === true) {
        c.push(item);
      } else if (status.cumple === false) {
        nc.push(item);
      } else {
        // cumple === null (análisis sin resultado binario)
        sa.push(item);
      }
    });

    return { cumple: c, noCumple: nc, sinAnalizar: sa };
  }, [resultados, analysisStatus]);

  // Filtrar según categoría seleccionada
  const resultadosFiltrados = useMemo(() => {
    switch (filterCategory) {
      case 'cumple':
        return cumple;
      case 'no-cumple':
        return noCumple;
      default:
        return resultados || [];
    }
  }, [filterCategory, cumple, noCumple, resultados]);

  // Determinar si hay resultados guardados
  const hasResults = resultados && resultados.length > 0;
  const showResults = hasResults || lastQuery;

  // Componente para renderizar una sección de resultados
  const renderResultadosSeccion = (items, titulo, contador) => {
    if (items.length === 0) return null;

    return (
      <div className="rp-category-section">
        <h3 className="rp-category-title">{titulo} ({contador})</h3>
        <div className="rp-grid">
          {items.map((item, idx) => {
            const idPortafolio = item.ID_Portafolio || item.id_del_portafolio;
            const isSaved = savedIds && savedIds.has(idPortafolio);
            
            return (
              <ResultCard
                key={`${item.Referencia_del_proceso || "ref"}-${idx}`}
                item={item}
                onClick={() => onItemClick(item)}
                analysisStatus={analysisStatus[idPortafolio]}
                isSaved={isSaved}
                onToggleSave={onToggleSave}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="rp">
      <div className="rp-box">
        <div className="rp-header">
          <div className="rp-header-text">
            {loading
              ? "Buscando resultados…"
              : lastQuery
              ? `Total: ${total.toLocaleString("es-CO")} • Mostrando ${Math.min(
                  limit,
                  Math.max(0, total - offset)
                )} • Desde ${total === 0 ? 0 : offset + 1}`
              : hasResults
              ? `Última búsqueda guardada • ${total.toLocaleString("es-CO")} resultados • Desde ${total === 0 ? 0 : offset + 1}`
              : "Realiza una búsqueda para ver resultados"}
          </div>
          {/* Indicador de análisis en progreso */}
          {isPolling && (
            <div className="rp-analyzing-indicator">
              <span className="rp-analyzing-spinner"></span>
              <span className="rp-analyzing-text">Analizando página {pageIndex + 1}/3...</span>
            </div>
          )}
        </div>

        {showResults && (
          <div className="rp-body">
            {/* Banner informativo cuando se muestran resultados del caché */}
            {isFromCache && hasResults && (
              <div className="rp-info-banner">
                <span className="rp-info-text">
                  Mostrando tu última búsqueda guardada. Puedes hacer una nueva búsqueda o continuar navegando estos resultados.
                </span>
              </div>
            )}

            {error && (
              <p className="rp-error">{error}</p>
            )}

            {loading && (
              <div className="rp-grid">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {!loading && (!resultados || resultados.length === 0) && (lastQuery || showResults) && (
              <div className="rp-empty">
                No se encontraron resultados con los filtros actuales.
                <div className="mt-3">Prueba cambiando el término o ampliando el rango de fechas.</div>
              </div>
            )}

            {!loading && resultados && resultados.length > 0 && (
              <>
                {/* Filtros de categoría */}
                <div className="rp-category-filters">
                  <button
                    className={`rp-filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterCategory('all')}
                  >
                    <span className="rp-filter-icon">📊</span> Todos ({resultados.length})
                  </button>
                  <button
                    className={`rp-filter-btn ${filterCategory === 'cumple' ? 'active' : ''}`}
                    onClick={() => setFilterCategory('cumple')}
                  >
                    <span className="rp-filter-icon">✅</span> Cumple ({cumple.length})
                  </button>
                  <button
                    className={`rp-filter-btn ${filterCategory === 'no-cumple' ? 'active' : ''}`}
                    onClick={() => setFilterCategory('no-cumple')}
                  >
                    <span className="rp-filter-icon">❌</span> No Cumple ({noCumple.length})
                  </button>
                </div>

                {/* Mostrar resultados organizados */}
                {filterCategory === 'all' && (
                  <div className="rp-all-categories">
                    {renderResultadosSeccion(cumple, '✅ CUMPLE REQUISITOS', cumple.length)}
                    {renderResultadosSeccion(noCumple, '❌ NO CUMPLE REQUISITOS', noCumple.length)}
                    {renderResultadosSeccion(sinAnalizar, '⏳ SIN ANALIZAR', sinAnalizar.length)}
                  </div>
                )}

                {filterCategory === 'cumple' && (
                  <div className="rp-grid">
                    {cumple.length > 0 ? (
                      cumple.map((item, idx) => {
                        const idPortafolio = item.ID_Portafolio || item.id_del_portafolio;
                        const isSaved = savedIds && savedIds.has(idPortafolio);
                        
                        return (
                          <ResultCard
                            key={`${item.Referencia_del_proceso || "ref"}-${idx}`}
                            item={item}
                            onClick={() => onItemClick(item)}
                            analysisStatus={analysisStatus[idPortafolio]}
                            isSaved={isSaved}
                            onToggleSave={onToggleSave}
                          />
                        );
                      })
                    ) : (
                      <div className="rp-empty" style={{ gridColumn: '1 / -1' }}>
                        No hay licitaciones que cumplan los requisitos en esta página.
                      </div>
                    )}
                  </div>
                )}

                {filterCategory === 'no-cumple' && (
                  <div className="rp-grid">
                    {noCumple.length > 0 ? (
                      noCumple.map((item, idx) => {
                        const idPortafolio = item.ID_Portafolio || item.id_del_portafolio;
                        const isSaved = savedIds && savedIds.has(idPortafolio);
                        
                        return (
                          <ResultCard
                            key={`${item.Referencia_del_proceso || "ref"}-${idx}`}
                            item={item}
                            onClick={() => onItemClick(item)}
                            analysisStatus={analysisStatus[idPortafolio]}
                            isSaved={isSaved}
                            onToggleSave={onToggleSave}
                          />
                        );
                      })
                    ) : (
                      <div className="rp-empty" style={{ gridColumn: '1 / -1' }}>
                        No hay licitaciones que no cumplan los requisitos en esta página.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!loading && resultados && resultados.length > 0 && (
          <div className="rp-footer">
            <div className="rp-footer-text">
              Página {Math.floor(offset / limit) + 1} de {Math.max(1, Math.ceil(total / limit))}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => onPage(Math.max(offset - limit, 0))}
                className="rp-btn"
                disabled={offset === 0}
              >
                ← Anterior
              </button>
              <button
                onClick={() => onPage(offset + limit)}
                className="rp-btn"
                disabled={offset + limit >= total}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
