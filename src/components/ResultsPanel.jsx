import React, { useState, useMemo } from "react";
import ResultCard from "../features/ResultCard.jsx";
import SkeletonCard from "../features/SkeletonCard.jsx";
import { useAutoAnalysis } from "../hooks/useAutoAnalysis.js";  // ✅ RESTAURADO - Ahora sin loops infinitos
import "../styles/components/results-panel.css";

export default function ResultsPanel({
  resultados, loading, error,
  total, limit, offset, lastQuery, isFromCache, savedIds,
  onPage,
  onItemClick,
  onToggleSave,
  preferredKeywords,
  showingMatched = false // 🆕 Flag para indicar si estamos mostrando licitaciones aptas
}) {
  const [filterCategory, setFilterCategory] = useState('cumple'); // 🆕 Por defecto mostrar solo las que CUMPLEN
  const [showOnlyMatching, setShowOnlyMatching] = useState(false); // 🆕 Mostrar solo coincidencias (desactivado por defecto)
  const [expandedSections, setExpandedSections] = useState({
    cumple: true,       // 🆕 VISIBLE por defecto - Licitaciones que el usuario PUEDE aplicar
    noCumple: false,    // 🆕 OCULTO por defecto - Licitaciones que el usuario NO puede aplicar
    sinAnalizar: false  // Oculto por defecto
  });
  
  // ✅ RESTAURADO - Hook para análisis automático en background (corregido para no causar loops infinitos)
  const { analysisStatus, isPolling, pageIndex, allResultados, resumen } = useAutoAnalysis(resultados, {
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
              : "Sin resultados"
            }
          </div>
          
          {/* 🆕 Información de análisis automático */}
          {isPolling && (
            <div className="rp-analysis-info" style={{
              fontSize: '0.85rem',
              color: '#666',
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              borderLeft: '3px solid #0066cc'
            }}>
              <div>🔍 <strong>Análisis en progreso:</strong></div>
              <div>
                • Total a analizar: <strong>{allResultados.length}</strong> licitaciones
              </div>
              <div>
                • Páginas: <strong>{Math.ceil((total || 0) / (limit || 21))}</strong> página{Math.ceil((total || 0) / (limit || 21)) !== 1 ? 's' : ''}
              </div>
              <div>
                • Query: <strong>{typeof lastQuery === 'string' ? lastQuery : lastQuery?.termino || 'automática'}</strong>
              </div>
              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #ddd' }}>
                ✅ {resumen?.completados || 0} • 🔄 {resumen?.enProceso || 0} • ⏳ {resumen?.noIniciados || 0} • 💾 {resumen?.cumpliendo || 0} guardadas
              </div>
            </div>
          )}
        </div>
        
        {/* Indicador de análisis en progreso */}
        {isPolling && (
          <div className="rp-analyzing-indicator">
            <span className="rp-analyzing-spinner"></span>
            <span className="rp-analyzing-text">Analizando licitaciones en background...</span>
          </div>
        )}

        {showResults && (
          <div className="rp-body">
            {/* 🆕 Banner cuando estamos mostrando licitaciones aptas guardadas */}
            {showingMatched && (
              <div className="rp-info-banner" style={{backgroundColor: '#e8f5e9', borderColor: '#4caf50'}}>
                <span className="rp-info-text">
                  ✅ Mostrando <strong>{resultados.length} licitaciones</strong> que detectamos como aptas para ti. Realiza una búsqueda para ver más opciones.
                </span>
              </div>
            )}
            
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
