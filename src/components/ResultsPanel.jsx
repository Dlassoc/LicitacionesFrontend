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
  onToggleSave,
  preferredKeywords
}) {
  const [filterCategory, setFilterCategory] = useState('all'); // 'all', 'cumple', 'no-cumple'
  const [showOnlyMatching, setShowOnlyMatching] = useState(false); // 🆕 Mostrar solo coincidencias (desactivado por defecto)
  const [expandedSections, setExpandedSections] = useState({
    cumple: false,      // Oculto por defecto
    noCumple: true,     // Visible por defecto
    sinAnalizar: false  // Oculto por defecto
  });
  
  // Hook para análisis automático en background
  const { analysisStatus, isPolling, pageIndex, allResultados } = useAutoAnalysis(resultados, {
    lastQuery,
    offset,
    limit,
    total
  });

  // Categorizar resultados por cumplimiento - USAR allResultados para mostrar de TODAS las páginas
  const { cumple, noCumple, sinAnalizar, conIndicadores } = useMemo(() => {
    const c = [];
    const nc = [];
    const sa = [];
    const ci = []; // Con indicadores (tiene requisitos_extraidos)

    // Usar allResultados que acumula de todas las páginas
    allResultados?.forEach((item) => {
      const idPortafolio = item.ID_Portafolio || item.id_del_portafolio;
      const status = analysisStatus[idPortafolio];

      console.log(`[FILTER_DEBUG] ${idPortafolio}: cumple=${status?.cumple}, tiene_requisitos=${!!status?.requisitos}`);

      if (!status || status.estado !== 'completado') {
        // No analizado o en proceso
        sa.push(item);
      } else if (status.cumple === null || status.cumple === undefined) {
        // Análisis completado pero sin resultado binario (sin requisitos)
        sa.push(item);
      } else if (typeof status.cumple === 'number') {
        // cumple es un número (cantidad de requisitos cumplidos)
        // Si es > 0, significa que cumple algo
        if (status.cumple > 0) {
          c.push(item);
          if (status.requisitos) ci.push(item); // Tiene indicadores
        } else {
          // cumple === 0 significa que no cumple ninguno
          nc.push(item);
          if (status.requisitos) ci.push(item); // Tiene indicadores
        }
      } else if (status.cumple === true) {
        // Cumple (true)
        c.push(item);
        if (status.requisitos) ci.push(item);
      } else if (status.cumple === false) {
        // No cumple (false)
        nc.push(item);
        if (status.requisitos) ci.push(item);
      } else {
        // Cualquier otro caso
        sa.push(item);
      }
    });

    console.log(`[FILTER_DEBUG] Categorización: Cumple=${c.length}, NoCumple=${nc.length}, SinAnalizar=${sa.length}, ConIndicadores=${ci.length}`);
    return { cumple: c, noCumple: nc, sinAnalizar: sa, conIndicadores: ci };
  }, [allResultados, analysisStatus]);

  // 🆕 Función helper para verificar si un item coincide con palabras clave
  const matchesPreferredKeywords = (item) => {
    if (!preferredKeywords || preferredKeywords.length === 0) return false;
    
    const descripcion = (item.DESCRIPCION_DEL_PROCESO || '').toLowerCase();
    const objeto = (item.OBJETO_A_CONTRATAR || '').toLowerCase();
    const ramoFuncional = (item.RAMO_FUNCIONAL || '').toLowerCase();
    
    return preferredKeywords.some(keyword => {
      const kw = keyword.toLowerCase();
      return descripcion.includes(kw) || objeto.includes(kw) || ramoFuncional.includes(kw);
    });
  };

  // Filtrar según categoría seleccionada
  const resultadosFiltrados = useMemo(() => {
    let items = [];
    switch (filterCategory) {
      case 'cumple':
        items = cumple;
        break;
      case 'no-cumple':
        items = noCumple;
        break;
      default:
        items = allResultados || []; // Usar allResultados en lugar de resultados
    }
    
    // 🆕 Aplicar filtro de palabras clave preferidas si está activado
    if (showOnlyMatching && preferredKeywords && preferredKeywords.length > 0) {
      items = items.filter(matchesPreferredKeywords);
    } else if (preferredKeywords && preferredKeywords.length > 0) {
      // 🆕 Si NO filtra pero tiene palabras clave, ORDENA para mostrar coincidencias primero
      items = [...items].sort((a, b) => {
        const aMatches = matchesPreferredKeywords(a) ? 1 : 0;
        const bMatches = matchesPreferredKeywords(b) ? 1 : 0;
        return bMatches - aMatches; // Descendente: coincidencias primero
      });
    }
    
    return items;
  }, [filterCategory, cumple, noCumple, allResultados, showOnlyMatching, preferredKeywords]);

  // Determinar si hay resultados guardados
  const hasResults = resultados && resultados.length > 0;
  const showResults = hasResults || lastQuery;

  // Componente para renderizar una sección de resultados COLAPSABLE
  const renderResultadosSeccion = (items, titulo, contador, sectionKey) => {
    if (items.length === 0) return null;

    const isExpanded = expandedSections[sectionKey];

    return (
      <div className="rp-category-section">
        <h3 
          className="rp-category-title rp-category-title-collapsible"
          onClick={() => setExpandedSections(prev => ({
            ...prev,
            [sectionKey]: !prev[sectionKey]
          }))}
          style={{ cursor: 'pointer' }}
        >
          <span className="rp-collapse-icon">{isExpanded ? '▼' : '▶'}</span>
          {titulo} ({contador})
        </h3>
        {isExpanded && (
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
        )}
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
            {/* 🆕 Banner cuando hay palabras clave preferidas */}
            {preferredKeywords && preferredKeywords.length > 0 && !showOnlyMatching && (
              <div className="rp-info-banner" style={{backgroundColor: '#e8f4f8', borderColor: '#4db8d4'}}>
                <span className="rp-info-text">
                  📌 Mostrando licitaciones ordenadas por relevancia a tus palabras clave: <strong>{preferredKeywords.join(', ')}</strong>
                </span>
              </div>
            )}
            
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
                  {/* 🆕 Toggle para mostrar solo licitaciones que coincidan con preferencias */}
                  {preferredKeywords && preferredKeywords.length > 0 && (
                    <button
                      className={`rp-filter-btn ${showOnlyMatching ? 'active' : ''}`}
                      onClick={() => setShowOnlyMatching(!showOnlyMatching)}
                      title={showOnlyMatching ? "Mostrando solo coincidencias" : "Mostrar solo coincidencias con tus palabras clave"}
                    >
                      <span className="rp-filter-icon">✓</span> 
                      {showOnlyMatching ? `Coincidencias (${resultadosFiltrados.length})` : `Ver coincidencias (${resultadosFiltrados.length})`}
                    </button>
                  )}
                  
                  <button
                    className={`rp-filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterCategory('all')}
                  >
                    <span className="rp-filter-icon">📊</span> Todos ({allResultados.length})
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

                {/* Mostrar resultados organizados - Solo items CON indicadores */}
                {filterCategory === 'all' && (
                  <div className="rp-all-categories">
                    {renderResultadosSeccion(cumple, '✅ CUMPLE REQUISITOS', cumple.length, 'cumple')}
                    {renderResultadosSeccion(noCumple, '❌ NO CUMPLE REQUISITOS', noCumple.length, 'noCumple')}
                    {renderResultadosSeccion(sinAnalizar, '⏳ SIN ANALIZAR', sinAnalizar.length, 'sinAnalizar')}
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
                        No hay licitaciones que cumplan los requisitos.
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
