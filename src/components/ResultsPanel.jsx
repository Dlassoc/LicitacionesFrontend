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
  const DEBUG_RESULTS_PANEL = ['1', 'true', 'yes', 'on'].includes(
    String(import.meta.env.VITE_DEBUG_RESULTS_PANEL ?? 'false').toLowerCase()
  );
  const debugLog = (...args) => {
    if (DEBUG_RESULTS_PANEL) console.log(...args);
  };

  const normalizeCumpleValue = (raw) => {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw > 0;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      if (['1', 'true', 't', 'yes', 'y', 'si', 's'].includes(v)) return true;
      if (['0', 'false', 'f', 'no', 'n'].includes(v)) return false;
      if (!v) return null;
    }
    return null;
  };

  const hasFinancialIndicators = (requisitos = {}) => {
    const indicadoresFin = requisitos.indicadores_financieros;
    const matrices = requisitos.matrices || indicadoresFin?.matrices;

    if (matrices && typeof matrices === 'object' && Object.keys(matrices).length > 0) {
      return true;
    }

    if (indicadoresFin && typeof indicadoresFin === 'object') {
      const keys = Object.keys(indicadoresFin).filter((k) => k !== 'matrices');
      return keys.length > 0;
    }

    return false;
  };

  const hasExperienceEvidence = (requisitos = {}) => {
    const experiencia = requisitos.experiencia_requerida;
    if (!experiencia) return false;

    if (typeof experiencia === 'string') {
      return experiencia.trim().length > 0;
    }

    if (typeof experiencia === 'object') {
      const texto = experiencia.experiencia_requerida || experiencia.texto || experiencia.descripcion;
      if (typeof texto === 'string' && texto.trim().length > 0) {
        return true;
      }
      return Object.keys(experiencia).length > 0;
    }

    return Boolean(experiencia);
  };

  const hasUNSPSCCodes = (requisitos = {}) => {
    return Array.isArray(requisitos?.codigos_unspsc) && requisitos.codigos_unspsc.length > 0;
  };

  const hasNonFinancialEvidence = (requisitos = {}) => {
    const hasUnspsc = hasUNSPSCCodes(requisitos);
    const hasAnyTextualDetails =
      typeof requisitos?.descripcion === 'string' ||
      typeof requisitos?.observaciones === 'string';
    return hasUnspsc || hasAnyTextualDetails;
  };

  const isBasePropiaByExperience = (status) => {
    if (!status || typeof status !== 'object') return false;

    const requisitos = status.requisitos && typeof status.requisitos === 'object' ? status.requisitos : {};
    const detalles = status.detalles && typeof status.detalles === 'object' ? status.detalles : {};

    if (detalles.regla === 'base_propia_experiencia') {
      return true;
    }

    const hasExp = hasExperienceEvidence(requisitos);
    const hasIndicators = hasFinancialIndicators(requisitos);
    const hasUnspsc = hasUNSPSCCodes(requisitos);
    
    // 🔧 CRÍTICO: Si tiene UNSPSC O experiencia (sin indicadores financieros), contar como CUMPLE
    return (hasExp || hasUnspsc) && !hasIndicators;
  };

  debugLog('[RESULTS_PANEL] 📥 PROPS RECIBIDAS - resultados:', resultados?.length || 0, 'items');
  debugLog('[RESULTS_PANEL] 📥 tipos:', typeof resultados, Array.isArray(resultados) ? 'es array' : 'NO es array');
  debugLog('[RESULTS_PANEL] 📥 loading:', loading, 'error:', !!error);
  
  // 🔧 FUERZA RE-RENDER cuando llegan nuevos resultados
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  useEffect(() => {
    if (resultados && resultados.length > 0) {
      setForceUpdateKey(prev => prev + 1);
      debugLog('[RESULTS_PANEL] 🔄 NUEVA DATA DETECTADA - Forzando re-categorización, items:', resultados.length);
    }
  }, [resultados?.length]); // Solo trigger cuando cantidad cambia
  
  const [filterCategory, setFilterCategory] = useState('all'); // 🆕 Por defecto mostrar TODAS (incluyendo las que se están analizando)
  const [showOnlyMatching, setShowOnlyMatching] = useState(false); // 🆕 Mostrar solo coincidencias (desactivado por defecto)
  const [expandedSections, setExpandedSections] = useState({
    cumple: true,       // 🆕 VISIBLE por defecto - Licitaciones que el usuario PUEDE aplicar
    noCumple: true,     // 🆕 VISIBLE por defecto - Licitaciones que el usuario NO puede aplicar
    sinDocumentos: true, // 🆕 VISIBLE por defecto - licitaciones sin documentos para evaluar
    sinAnalizar: true,  // 🆕 VISIBLE por defecto - Licitaciones en análisis (mientras se procesan)
    sinRequisitos: true // 🆕 NEUTRAL visible - evita sensación de "no clasificada"
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
      debugLog('[RESULTS_PANEL] 🔄 analysisStatus actualizado (debounced 100ms)');
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
        cumple: normalizeCumpleValue(item.cumple),
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
  const { cumple, noCumple, sinDocumentos, sinAnalizar, sinRequisitos } = useMemo(() => {
    debugLog(`[RESULTS_PANEL] Categorizando ${resultados?.length || 0} resultados... (key: ${forceUpdateKey})`);
    
    const c = [];
    const nc = [];
    const sd = [];
    const sa = [];
    const sr = [];

    resultados?.forEach((item, itemIdx) => {
      const idPortafolio = item.ID_Portafolio || item.id_del_portafolio || item.referencia;
      debugLog(`[RESULTS_PANEL] [${itemIdx}] ${idPortafolio} | from_cache=${item.from_cache} | _fromMatched=${item._fromMatched} | _fromAnalyzed=${item._fromAnalyzed}`);
      
      // Saltar descartados
      if (isDiscarded && typeof isDiscarded === 'function' && isDiscarded(idPortafolio)) {
        debugLog(`[RESULTS_PANEL]  DESCARTADA`);
        return;
      }
      
      // Obtener status del item (desde BD o desde polling)
      const status = getStatusForItem(idPortafolio, item);
      
      // Categorizar basado en status consolidado (BD/polling). Evita que
      // un match histórico pise un veredicto más reciente de no-cumple.

      if (status) {
        const cumpleValue = normalizeCumpleValue(status.cumple);

        if (cumpleValue === true) {
          debugLog(`[RESULTS_PANEL] ✅ CUMPLE | ${status.porcentaje || 0}%`);
          c.push(item);
        } else if (cumpleValue === false) {
          debugLog(`[RESULTS_PANEL]  NO CUMPLE | ${status.porcentaje || 0}%`);
          nc.push(item);
        } else if (status.estado === 'sin_documentos') {
          debugLog(`[RESULTS_PANEL] 📄 SIN DOCUMENTOS`);
          sd.push(item);
        } else if (status.estado === 'completado') {
          const requisitos = status.requisitos && typeof status.requisitos === 'object' ? status.requisitos : {};
          const hasIndicators = hasFinancialIndicators(requisitos);

          if (hasIndicators) {
            // Hay indicadores financieros → el backend evalúa si concuerdan con usuario
            if (cumpleValue === true) {
              debugLog(`[RESULTS_PANEL] ✅ CUMPLE (indicadores concuerdan con usuario)`);
              c.push(item);
            } else if (cumpleValue === false) {
              debugLog(`[RESULTS_PANEL]  NO CUMPLE (indicadores NO concuerdan)`);
              nc.push(item);
            } else {
              // Tiene indicadores pero cumple está en null → tratar como NO CUMPLE
              debugLog(`[RESULTS_PANEL]  NO CUMPLE (indicadores sin evaluación claro)`);
              nc.push(item);
            }
          } else if (isBasePropiaByExperience(status)) {
            debugLog(`[RESULTS_PANEL] ✅ CUMPLE (base propia experiencia)`);
            c.push(item);
          } else {
            // Completado pero sin veredicto financiero explícito
            debugLog(`[RESULTS_PANEL] ℹ️ COMPLETADO SIN VEREDICTO FINANCIERO`);
            sr.push(item);
          }
        } else {
          // En proceso
          debugLog(`[RESULTS_PANEL] ⏳ EN ANÁLISIS (estado=${status.estado})`);
          sa.push(item);
        }
      } else {
        // Sin status → sin analizar
        debugLog(`[RESULTS_PANEL] ⏳ SIN ANALIZAR`);
        sa.push(item);
      }
    });

    debugLog(`[RESULTS_PANEL] 📊 FINAL: cumple=${c.length}, noCumple=${nc.length}, sinDocumentos=${sd.length}, sinAnalizar=${sa.length}, sinRequisitos=${sr.length}`);
    return { cumple: c, noCumple: nc, sinDocumentos: sd, sinAnalizar: sa, sinRequisitos: sr };
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
      case 'sin-documentos':
        items = sinDocumentos;
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
  }, [filterCategory, cumple, noCumple, sinDocumentos, resultados, showOnlyMatching, preferredKeywords]);

  // 🆕 ARREGLO: Mostrar si hay resultados categorizados O si hay datos crudos, NO solo si hay lastQuery
  const hasResults = resultados && resultados.length > 0;
  const hasCategorizedResults = cumple.length > 0 || noCumple.length > 0 || sinDocumentos.length > 0 || sinAnalizar.length > 0 || sinRequisitos.length > 0;
  const showResults = hasResults || hasCategorizedResults || lastQuery;
  const loadedCount = Array.isArray(resultados) ? resultados.length : 0;

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
              ? `Total: ${total.toLocaleString("es-CO")} • Cargadas: ${loadedCount.toLocaleString("es-CO")} • Página ${Math.floor(offset / limit) + 1}`
              : hasResults
              ? `${resultados.length} licitaciones encontradas en la base de datos`
              : "Sin resultados"
            }
          </div>

          
          {/* 🔧 DESACTIVADO: Información de análisis automático - Ya no se muestra */}
          {/* {isPolling && (
            <div className="rp-analysis-info">
              ... (removido)
            </div>
          )} */}
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
              <div className="rp-info-banner rp-info-banner-matched">
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
                    Todos ({allResultados.length})
                  </button>
                  <button
                    className={`rp-filter-btn ${filterCategory === 'cumple' ? 'active' : ''}`}
                    onClick={() => setFilterCategory('cumple')}
                  >
                    Cumple ({cumple.length})
                  </button>
                  <button
                    className={`rp-filter-btn ${filterCategory === 'no-cumple' ? 'active' : ''}`}
                    onClick={() => setFilterCategory('no-cumple')}
                  >
                    No Cumple ({noCumple.length})
                  </button>
                  <button
                    className={`rp-filter-btn ${filterCategory === 'sin-documentos' ? 'active' : ''}`}
                    onClick={() => setFilterCategory('sin-documentos')}
                  >
                    Sin documentos ({sinDocumentos.length})
                  </button>
                </div>

                {/* Mostrar resultados organizados - Solo items CON indicadores */}
                {filterCategory === 'all' && (
                  <div className="rp-all-categories">
                    {renderResultadosSeccion(cumple, 'CUMPLE REQUISITOS', cumple.length, 'cumple')}
                    {renderResultadosSeccion(noCumple, 'NO CUMPLE REQUISITOS', noCumple.length, 'noCumple')}
                    {renderResultadosSeccion(sinDocumentos, 'SIN DOCUMENTOS', sinDocumentos.length, 'sinDocumentos')}
                    {renderResultadosSeccion(sinRequisitos, 'ANÁLISIS SIN REQUISITOS', sinRequisitos.length, 'sinRequisitos')}
                    {renderResultadosSeccion(sinAnalizar, 'EN ANÁLISIS', sinAnalizar.length, 'sinAnalizar')}
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

                {filterCategory === 'sin-documentos' && (
                  <div className="rp-grid">
                    {sinDocumentos.length > 0 ? (
                      sinDocumentos.map((item, idx) => {
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
                        No hay licitaciones sin documentos en esta página.
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
