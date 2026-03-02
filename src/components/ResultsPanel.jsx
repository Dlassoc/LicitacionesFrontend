import React, { useState, useMemo, useEffect, useRef } from "react";
import ResultCard from "../features/ResultCard.jsx";
import SkeletonCard from "../features/SkeletonCard.jsx";
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
  console.log('[RESULTS_PANEL] 📥 PROPS RECIBIDAS - resultados:', resultados?.length || 0, 'items');
  console.log('[RESULTS_PANEL] 📥 tipos:', typeof resultados, Array.isArray(resultados) ? 'es array' : 'NO es array');
  console.log('[RESULTS_PANEL] 📥 loading:', loading, 'error:', !!error);
  
  // 🔧 FUERZA RE-RENDER cuando llegan nuevos resultados
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  useEffect(() => {
    if (resultados && resultados.length > 0) {
      setForceUpdateKey(prev => prev + 1);
      console.log('[RESULTS_PANEL] 🔄 NUEVA DATA DETECTADA - Forzando re-categorización, items:', resultados.length);
    }
  }, [resultados?.length]); // Solo trigger cuando cantidad cambia
  
  const [filterCategory, setFilterCategory] = useState('all'); // 🆕 Por defecto mostrar TODAS (incluyendo las que se están analizando)
  const [showOnlyMatching, setShowOnlyMatching] = useState(false); // 🆕 Mostrar solo coincidencias (desactivado por defecto)
  const [expandedSections, setExpandedSections] = useState({
    cumple: true,       // 🆕 VISIBLE por defecto - Licitaciones que el usuario PUEDE aplicar
    noCumple: false,    // 🆕 OCULTO por defecto - Licitaciones que el usuario NO puede aplicar
    sinAnalizar: true   // 🆕 VISIBLE por defecto - Licitaciones en análisis (mientras se procesan)
  });

  // 🔧 DEBOUNCE analysisStatus: evitar que se recategoritce en cada polling (cada 10 segundos)
  // Usar una versión "estabilizada" que solo cambie cuando sea importante
  const [stableAnalysisStatus, setStableAnalysisStatus] = useState(analysisStatus);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    // Limpiar timeout anterior si existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 🔧 IMPORTANTE: Usar debounce más corto (100ms) para análisis completados
    // Esto evita flickering pero mantiene responsividad cuando se guardan análisis
    // El debounce agrupa múltiples cambios rápidos en una sola actualización
    // pero no ralentiza licitaciones que se completan esporádicamente
    debounceTimerRef.current = setTimeout(() => {
      setStableAnalysisStatus(analysisStatus);
      console.log('[RESULTS_PANEL] 🔄 analysisStatus actualizado (debounced 100ms)');
    }, 100);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [analysisStatus]);

  const hasFinalVerdict = (status) =>
    status && (typeof status.cumple === 'boolean' || status.estado === 'completado');

  // 🔧 REFACTORIZADO: Obtener status para un item, priorizando datos de BD si vienen
  const getStatusForItem = (idPortafolio, item) => {
    // Prioridad 1: Si el item tiene _analysisStatus (datos de BD normalizados), usarlo
    if (item._analysisStatus) {
      return item._analysisStatus;
    }

    // Prioridad 2: Si item tiene cumple directo (caché antiguo), crear analysis normal
    if (item.cumple !== undefined) {
      return {
        estado: 'completado',
        cumple: item.cumple,
        porcentaje: item.porcentaje_cumplimiento || 0,
        requisitos: item.requisitos_extraidos || {}
      };
    }

    // Prioridad 3: Si hay polling activo, buscar en analysisStatus
    const pollingStatus = analysisStatus[idPortafolio];
    if (pollingStatus) {
      return pollingStatus;
    }

    // Sin status
    return null;
  };

  // Categorizar resultados por cumplimiento
  const { cumple, noCumple, sinAnalizar } = useMemo(() => {
    console.log(`[RESULTS_PANEL] Categorizando ${resultados?.length || 0} resultados... (key: ${forceUpdateKey})`);
    
    const c = [];
    const nc = [];
    const sa = [];

    resultados?.forEach((item, itemIdx) => {
      const idPortafolio = item.ID_Portafolio || item.id_del_portafolio || item.referencia;
      console.log(`[RESULTS_PANEL] [${itemIdx}] ${idPortafolio} | from_cache=${item.from_cache} | _fromMatched=${item._fromMatched} | _fromAnalyzed=${item._fromAnalyzed}`);
      
      // Saltar descartados
      if (isDiscarded && typeof isDiscarded === 'function' && isDiscarded(idPortafolio)) {
        console.log(`[RESULTS_PANEL] ❌ DESCARTADA`);
        return;
      }
      
      // Obtener status del item (desde BD o desde polling)
      const status = getStatusForItem(idPortafolio, item);
      
      // Categorizar basado en:
      // 1. Si es MATCHED → CUMPLE (por definición)
      // 2. Si es ANALYZED/CACHE → usar su cumple
      // 3. Si está en polling → usar status actual
      
      if (item._fromMatched === true) {
        console.log(`[RESULTS_PANEL] ✅ MATCHED → CUMPLE`);
        c.push(item);
        return;
      }

      if (status) {
        if (status.cumple === true) {
          console.log(`[RESULTS_PANEL] ✅ CUMPLE | ${status.porcentaje || 0}%`);
          c.push(item);
        } else if (status.cumple === false) {
          console.log(`[RESULTS_PANEL] ❌ NO CUMPLE | ${status.porcentaje || 0}%`);
          nc.push(item);
        } else if (status.estado === 'completado') {
          // Completado pero cumple=null → no encontró requisitos
          console.log(`[RESULTS_PANEL] ❌ COMPLETADO SIN REQUISITOS → NO CUMPLE`);
          nc.push(item);
        } else {
          // En proceso
          console.log(`[RESULTS_PANEL] ⏳ EN ANÁLISIS (estado=${status.estado})`);
          sa.push(item);
        }
      } else {
        // Sin status → sin analizar
        console.log(`[RESULTS_PANEL] ⏳ SIN ANALIZAR`);
        sa.push(item);
      }
    });

    console.log(`[RESULTS_PANEL] 📊 FINAL: cumple=${c.length}, noCumple=${nc.length}, sinAnalizar=${sa.length}`);
    return { cumple: c, noCumple: nc, sinAnalizar: sa };
  }, [resultados, analysisStatus, discardedIds, isDiscarded, forceUpdateKey]);

  // Función helper para verificar si un item coincide con palabras clave
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
        items = resultados || [];  // Usar resultados en lugar de allResultados
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
  }, [filterCategory, cumple, noCumple, resultados, showOnlyMatching, preferredKeywords]);

  // 🆕 ARREGLO: Mostrar si hay resultados categorizados O si hay datos crudos, NO solo si hay lastQuery
  const hasResults = resultados && resultados.length > 0;
  const hasCategorizedResults = cumple.length > 0 || noCumple.length > 0 || sinAnalizar.length > 0;
  const showResults = hasResults || hasCategorizedResults || lastQuery;

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
              const idPortafolio = item.ID_Portafolio || item.id_del_portafolio || item.referencia;
              
              // Obtener status del item (ya debe estar normalizado desde App.jsx)
              const itemAnalysisStatus = getStatusForItem(idPortafolio, item);
              
              return (
                <ResultCard
                  key={`${item.Referencia_del_proceso || item.referencia || "ref"}-${idx}`}
                  item={item}
                  onClick={() => onItemClick(item)}
                  analysisStatus={itemAnalysisStatus}
                  onDiscard={onDiscard}
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
            {loading && (!resultados || resultados.length === 0)
              ? "Buscando resultados…"
              : loading && resultados && resultados.length > 0
              ? `Cargando… • Mostrando ${resultados.length} de la base de datos`
              : lastQuery
              ? `Total: ${total.toLocaleString("es-CO")} • Mostrando ${Math.min(
                  limit,
                  Math.max(0, total - offset)
                )} • Desde ${total === 0 ? 0 : offset + 1}`
              : hasResults
              ? `${resultados.length} licitaciones encontradas en la base de datos`
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
                • Página <strong>{paginationStatus?.currentPage || 1}/{paginationStatus?.totalPages || 1}</strong>
              </div>
              <div>
                • Query: <strong>{typeof lastQuery === 'string' ? lastQuery : lastQuery?.termino || 'automática'}</strong>
              </div>
              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #ddd' }}>
                ✅ {resumen?.completados || 0} • 🔄 {resumen?.enProceso || 0} • ⏳ {resumen?.noIniciados || 0} • 💾 {resumen?.cumpliendo || 0} guardadas
              </div>
              {paginationStatus?.esUltimaPagina && (
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #ddd', color: '#d32f2f', fontWeight: 'bold' }}>
                  🏁 Última página - El análisis se detendrá cuando todos completen
                </div>
              )}
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
              <div className="rp-info-banner">
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

            {/* 🆕 Skeletons SOLO cuando loading Y no hay items de BD */}
            {loading && (!resultados || resultados.length === 0) && (
              <div className="rp-grid">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* 🆕 Indicador de carga cuando ya hay items de BD pero SECOP sigue buscando */}
            {loading && resultados && resultados.length > 0 && (
              <div className="rp-loading-inline" style={{
                padding: '10px 16px',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.9rem',
                color: '#1565c0',
                borderLeft: '3px solid #1976d2'
              }}>
                <span className="rp-analyzing-spinner" style={{ width: '16px', height: '16px' }}></span>
                Buscando más licitaciones en SECOP… Mostrando {resultados.length} de la base de datos.
              </div>
            )}

            {!loading && (!resultados || resultados.length === 0) && (lastQuery || showResults) && (
              <div className="rp-empty">
                No se encontraron resultados con los filtros actuales.
                <div className="mt-3">Prueba cambiando el término o ampliando el rango de fechas.</div>
              </div>
            )}

            {/* 🆕 Mostrar items SIEMPRE que existan, incluso durante loading */}
            {resultados && resultados.length > 0 && (
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
                    {renderResultadosSeccion(cumple, 'CUMPLE REQUISITOS', cumple.length, 'cumple')}
                    {renderResultadosSeccion(noCumple, 'NO CUMPLE REQUISITOS', noCumple.length, 'noCumple')}
                    {renderResultadosSeccion(sinAnalizar, 'Sin requisitos', sinAnalizar.length, 'sinAnalizar')}
                  </div>
                )}

                {filterCategory === 'cumple' && (
                  <div className="rp-grid">
                    {cumple.length > 0 ? (
                      cumple.map((item, idx) => {
                        const idPortafolio = item.ID_Portafolio || item.id_del_portafolio;
                        const itemAnalysisStatus = getStatusForItem(idPortafolio, item);
                        
                        return (
                          <ResultCard
                            key={`${item.Referencia_del_proceso || "ref"}-${idx}`}
                            item={item}
                            onClick={() => onItemClick(item)}
                            analysisStatus={itemAnalysisStatus}
                            onDiscard={onDiscard}  // 🗑️ NUEVO
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
                        const itemAnalysisStatus = getStatusForItem(idPortafolio, item);
                        
                        return (
                          <ResultCard
                            key={`${item.Referencia_del_proceso || "ref"}-${idx}`}
                            item={item}
                            onClick={() => onItemClick(item)}
                            analysisStatus={itemAnalysisStatus}
                            onDiscard={onDiscard}
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

        {resultados && resultados.length > 0 && (
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
