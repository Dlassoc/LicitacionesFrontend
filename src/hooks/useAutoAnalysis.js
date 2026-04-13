// src/hooks/useAutoAnalysis.js
import { useState, useEffect, useRef, useMemo } from 'react';
import { normalizeCumpleValue, normalizeLicitacionId } from '../utils/commonHelpers.js';
import API_BASE_URL from '../config/api.js';

const API_BASE = API_BASE_URL;
const LIVE_AUTO_ANALYSIS_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  String(import.meta.env.VITE_ENABLE_LIVE_AUTO_ANALYSIS ?? 'true').toLowerCase()
);

function hasMeaningfulAnalysisEvidence(data) {
  if (!data || typeof data !== 'object') return false;

  const requisitos = data.requisitos_extraidos && typeof data.requisitos_extraidos === 'object'
    ? data.requisitos_extraidos
    : (data.requisitos && typeof data.requisitos === 'object' ? data.requisitos : {});
  const detalles = data.detalles && typeof data.detalles === 'object' ? data.detalles : {};

  const hasCumple = data.cumple !== undefined && data.cumple !== null;
  const hasDetalles = Object.keys(detalles).length > 0;

  const hasMatrices = requisitos.matrices && Object.keys(requisitos.matrices).length > 0;
  const hasIndicadores =
    requisitos.indicadores_financieros &&
    typeof requisitos.indicadores_financieros === 'object' &&
    Object.keys(requisitos.indicadores_financieros).length > 0;
  const hasUNSPSC = Array.isArray(requisitos.codigos_unspsc) && requisitos.codigos_unspsc.length > 0;
  const experienciaTexto = requisitos.experiencia_requerida?.experiencia_requerida;
  const hasExperiencia = typeof experienciaTexto === 'string' && experienciaTexto.trim().length > 0;

  return hasCumple || hasDetalles || hasMatrices || hasIndicadores || hasUNSPSC || hasExperiencia;
}

/**
 * 🔧 NUEVO: Guarda TODOS los análisis completados (independientemente de si cumplen o no)
 * Esto permite cargar análisis previos sin re-analizar
 */
async function saveAnalyzedLicitacion(licitacion, analysisData) {
  try {
    const idPortafolio = licitacion.ID_Portafolio || licitacion.id_del_portafolio;
    const percentage = typeof analysisData.porcentaje_cumplimiento === 'number' ? analysisData.porcentaje_cumplimiento : 0;
    
    const payload = {
      id_portafolio: idPortafolio,
      referencia: licitacion.Referencia || licitacion.referencia_del_proceso || `[${idPortafolio}]`,
      entidad: licitacion.Entidad || licitacion.entidad || '',
      objeto_contratar: licitacion.Nombre || licitacion.nombre_del_procedimiento || '',
      cuantia: licitacion.Cuantia || licitacion.cuantia || '',
      departamento: licitacion.Departamento || licitacion.departamento || '',
      ciudad: licitacion.Ciudad || licitacion.ciudad || '',
      estado_licitacion: licitacion.Estado || licitacion.estado_del_procedimiento || '',
      estado_analisis: analysisData?.estado_analisis || analysisData?.estado || 'completado',
      fecha_publicacion: licitacion.Fecha_publicacion || licitacion.fecha_de_publicacion_del || '',
      enlace: licitacion.URL_Proceso || licitacion.enlace || '',
      porcentaje_cumplimiento: percentage,
      cumple: analysisData.cumple !== null && analysisData.cumple !== undefined ? analysisData.cumple : null,
      detalles: analysisData.detalles || {},
      requisitos_extraidos: analysisData.requisitos_extraidos || analysisData.requisitos || {}
    };

    console.log(
      `[AUTO_ANALYSIS] 💾 Guardando en licitaciones_analisis: ${idPortafolio}, estado=${payload.estado_analisis}, cumple=${payload.cumple}`
    );
    
    const response = await fetch(`${API_BASE}/saved/analyzed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (response.ok && result.ok) {
      console.log(`[AUTO_ANALYSIS] ✅ Guardado en BD: ${idPortafolio}`);
      return true;
    } else {
      console.warn(`[AUTO_ANALYSIS] ⚠️ Error del backend:`, result.error || result.message);
      return false;
    }
  } catch (error) {
    console.warn(`[AUTO_ANALYSIS] ⚠️ Error guardando análisis:`, error.message);
  }
  return false;
}

/**
 * 🆕 Guarda una licitación como apta cuando el análisis determina que cumple requisitos.
 */
async function saveMatchedLicitacion(licitacion, analysisData) {
  try {
    const idPortafolio = licitacion.ID_Portafolio || licitacion.id_del_portafolio;
    const percentage = typeof analysisData.porcentaje_cumplimiento === 'number' ? analysisData.porcentaje_cumplimiento : 0;
    
    // 🆕 Extraer indicadores financieros si existen
    const indicadoresFinancieros = analysisData.requisitos_extraidos?.indicadores_financieros || 
                                    analysisData.requisitos?.indicadores_financieros || {};
    const matricesExtraidas = analysisData.requisitos_extraidos?.matrices || 
                             analysisData.requisitos?.matrices || {};
    
    const payload = {
      id_portafolio: idPortafolio,
      referencia: licitacion.Referencia || licitacion.referencia_del_proceso || `[${idPortafolio}]`,
      entidad: licitacion.Entidad || licitacion.entidad || '',
      objeto_contratar: licitacion.Nombre || licitacion.nombre_del_procedimiento || '',
      cuantia: licitacion.Cuantia || licitacion.cuantia || '',
      departamento: licitacion.Departamento || licitacion.departamento || '',
      ciudad: licitacion.Ciudad || licitacion.ciudad || '',
      estado: licitacion.Estado || licitacion.estado_del_procedimiento || '',
      fecha_publicacion: licitacion.Fecha_publicacion || licitacion.fecha_de_publicacion_del || '',
      enlace: licitacion.URL_Proceso || licitacion.enlace || '',
      score: percentage,
      razon: analysisData.detalles?.resumen || analysisData.detalles || 'Cumple requisitos',
      // 🆕 Guardar TODA la información extraída: indicadores, matrices, y detalles
      requisitos_extraidos: {
        indicadores_financieros: indicadoresFinancieros,
        matrices: matricesExtraidas,
        detalles: analysisData.detalles,
        // Mantener toda la estructura original también
        ...analysisData.requisitos_extraidos
      }
    };
    
    // 🆕 Log detallado de qué se está guardando
    console.log(`
╔════════════════════════════════════════════════════════════╗
║ 💾 GUARDANDO LICITACIÓN APTA EN BD
╠════════════════════════════════════════════════════════════╣
║ 🆔 ID: ${idPortafolio}
║ 📄 Referencia: ${payload.referencia}
║ 📊 Score: ${percentage}%
║ 🏢 Entidad: ${payload.entidad.substring(0, 40)}${payload.entidad.length > 40 ? '...' : ''}
║ 💰 Indicadores Financieros: ${Object.keys(indicadoresFinancieros).length} extraídos
║ 📋 Matrices: ${Object.keys(matricesExtraidas).length} encontradas
║ ⏰ ${new Date().toLocaleTimeString()}
╚════════════════════════════════════════════════════════════╝
    `);
    
    const response = await fetch(`${API_BASE}/saved/matched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║ ✅ GUARDADA EXITOSAMENTE EN BD
╠════════════════════════════════════════════════════════════╣
║ 🎯 Tabla: licitaciones_aptas
║ 📄 Referencia: ${payload.referencia}
║ 📊 Score: ${percentage}%
║ 💰 Indicadores guardados: ${Object.keys(indicadoresFinancieros).length}
║ 📋 Matrices guardadas: ${Object.keys(matricesExtraidas).length}
║ 💬 ${result.message}
║ ⏰ ${new Date().toLocaleTimeString()}
╚════════════════════════════════════════════════════════════╝
      `);
      return true;
    } else {
      console.warn(`
╔════════════════════════════════════════════════════════════╗
║ ⚠️  ERROR EN RESPUESTA DEL BACKEND
╠════════════════════════════════════════════════════════════╣
║ 🆔 ID: ${idPortafolio}
║ ⚠️  Error: ${result.error || result.message}
║ ⏰ ${new Date().toLocaleTimeString()}
╚════════════════════════════════════════════════════════════╝
      `);
    }
  } catch (error) {
    console.error(`
╔════════════════════════════════════════════════════════════╗
║  ERROR GUARDANDO LICITACIÓN EN BD
╠════════════════════════════════════════════════════════════╣
║ 🆔 ID: ${licitacion?.ID_Portafolio || licitacion?.id_del_portafolio}
║ ⚠️  Error: ${error.message}
║ 🔍 Detalles: ${error.stack?.split('\n')[0]}
║ ⏰ ${new Date().toLocaleTimeString()}
╚════════════════════════════════════════════════════════════╝
    `, error);
  }
  return false;
}

/**
 * 🆕 Carga análisis existentes desde la BD para un conjunto de IDs
 */
async function loadExistingAnalysis(ids) {
  try {
    if (!ids || ids.length === 0) return {};
    
    const response = await fetch(`${API_BASE}/analysis/batch/existing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids })
    });
    
    if (!response.ok) {
      console.warn(`[AUTO_ANALYSIS] ⚠️ Error cargando análisis existentes: ${response.status}`);
      return {};
    }
    
    const data = await response.json();
    if (data.ok) {
      console.log(`[AUTO_ANALYSIS] 📦 Análisis existentes cargados: ${Object.keys(data.data || {}).length}`);
      return data.data || {};
    }
  } catch (error) {
    console.warn(`[AUTO_ANALYSIS] ⚠️ Error en loadExistingAnalysis:`, error.message);
  }
  return {};
}

/**
 * 🆕 Extrae y prioriza documentos (PLIEGO DEFINITIVO primero)
 */
function prepararDocumentos(licitacion) {
  const documentoFields = [
    licitacion.documentos || [],
    licitacion.Documentos || [],
    licitacion.archivos || [],
    licitacion.Archivos || [],
    (licitacion.URL_Pliego ? [{ titulo: 'Pliego', url: licitacion.URL_Pliego }] : []),
    (licitacion.url_pliego ? [{ titulo: 'Pliego', url: licitacion.url_pliego }] : [])
  ];

  const todosDocumentos = documentoFields
    .flat()
    .filter(doc => doc && (doc.url || doc.URL || doc.enlace || doc.Enlace));

  if (todosDocumentos.length === 0) {
    return [];
  }

  // 🆕 PRIORIZACIÓN: Pliego definitivo primero
  const pliegos = [];
  const otros = [];

  for (const doc of todosDocumentos) {
    const titulo = (doc.titulo || doc.Titulo || doc.nombre || doc.Nombre || '').toLowerCase();
    const url = (doc.url || doc.URL || doc.enlace || doc.Enlace || '').toLowerCase();
    
    // Palabras clave para descartar
    const keywords_descartar = ['rfp', 'análisis financiero', 'evaluación', 'acta de', 'respuesta', 'observaciones'];
    const debería_descartar = keywords_descartar.some(kw => titulo.includes(kw) || url.includes(kw));
    
    if (debería_descartar) {
      continue;
    }

    // 🆕 PRIORIZAR: Detectar "pliego definitivo" en nombre o URL
    const keywords_pliego_definitivo = ['pliego definitivo', 'pliego de', 'definitivo', 'pliego de condiciones'];
    const es_pliego_definitivo = keywords_pliego_definitivo.some(kw => 
      titulo.includes(kw) || url.includes(kw)
    );

    if (es_pliego_definitivo) {
      pliegos.unshift({
        titulo: doc.titulo || doc.Titulo || 'Pliego Definitivo',
        url: doc.url || doc.URL || doc.enlace || doc.Enlace,
        prioritario: true
      });
    } else {
      otros.push({
        titulo: doc.titulo || doc.Titulo || 'Documento',
        url: doc.url || doc.URL || doc.enlace || doc.Enlace,
        prioritario: false
      });
    }
  }

  return [...pliegos, ...otros].slice(0, 5); // Máximo 5 documentos
}

/**
 * 🆕 Dispara el análisis batch en el backend
 */
async function triggerBatchAnalysis(payload) {
  try {
    const controller = new AbortController();
    const TRIGGER_TIMEOUT_MS = 45000; // Backend valida/siembra en BD; en lotes grandes puede tardar >30s
    const timeoutId = setTimeout(() => controller.abort(), TRIGGER_TIMEOUT_MS);

    const response = await fetch(`${API_BASE}/analysis/batch/trigger-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ licitaciones: payload }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorData = await response.json();
        errorDetail = errorData.error || errorData.detail || `HTTP ${response.status}`;
      } catch {
        errorDetail = `HTTP ${response.status} ${response.statusText}`;
      }
      throw new Error(`Backend error: ${errorDetail}`);
    }

    return await response.json();
  } catch (error) {
    let userMessage = error.message;
    if (error.name === 'AbortError') {
      // Si el cliente corta por timeout, el backend pudo haber recibido el trigger.
      // No tratamos esto como fallo duro para permitir que el polling continue.
      userMessage = 'Timeout del trigger: el backend puede seguir procesando en segundo plano';
      console.info(`[AUTO_ANALYSIS] ℹ️ Trigger con timeout local, continuando con polling:` , userMessage);
      return {
        ok: true,
        timeout: true,
        message: userMessage,
      };
    } else if (error.message.includes('Failed to fetch')) {
      userMessage = `No se puede conectar con ${API_BASE}. ¿Está ejecutándose?`;
    }
    
    console.warn(`[AUTO_ANALYSIS] ⚠️ No se pudo disparar trigger:`, userMessage);
    throw new Error(userMessage);
  }
}

async function fetchQueueSummary(sampleLimit = 5) {
  try {
    const response = await fetch(
      `${API_BASE}/analysis/batch/queue/summary?sample_limit=${sampleLimit}`,
      {
        method: 'GET',
        credentials: 'include'
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.ok ? data : null;
  } catch {
    return null;
  }
}

/**
 * Hook para análisis automático mejorado
 * 
 * Ahora hace:
 * 1. Detecta licitaciones nuevas
 * 2. DISPARA /analysis/trigger-batch (prioriza pliegos definitivos)
 * 3. LUEGO hace polling para chequear estado
 * 4. Máximo 5 minutos de polling
 * 5. Guarda como aptas las que cumplen
 * 6. 🆕 AUTO-PAGINA cuando página actual completada (si no es última)
 */
export function useAutoAnalysis(licitaciones = [], paginationInfo = {}, onPageComplete = null) {
  const TERMINAL_STATES = useMemo(() => new Set(['completado', 'sin_documentos', 'error']), []);

  const [analysisStatus, setAnalysisStatus] = useState({});
  const [isPolling, setIsPolling] = useState(false);
  const [allResultados, setAllResultados] = useState([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false); // 🆕 Estado para bloquear trigger
  
  const intervalRef = useRef(null);
  const pollingStartTimeRef = useRef(null);
  const lastLicitacionIdsRef = useRef([]);
  const lastTriggerRef = useRef([]); // 🆕 Track qué IDs ya fueron triggereados
  const lastQueryRef = useRef(null);
  const triggerFailedRef = useRef(false); // Evitar spam de errores de trigger
  const savedAptasRef = useRef(new Set()); // 🆕 Evita guardar la misma licitación varias veces
  const savedAnalyzedRef = useRef(new Map()); // Evita re-guardar el mismo resultado analizado
  const noDocsBlockedIdsRef = useRef(new Set()); // IDs sin_documentos no deben relanzar autoanalisis
  const analysisStatusRef = useRef({}); // 🆕 Consulta estable dentro de effects
  const isLoadingExistingRef = useRef(false); // Bloqueo sincrono para evitar carrera entre effects
  const existingLoadStateRef = useRef({ key: '', done: false });
  const pollingTickRef = useRef(0);
  const lastNoIniciadoRetryRef = useRef({ at: 0, key: '' });
  const isCheckStatusRunningRef = useRef(false); // Evita solapes de polling
  const MAX_POLLING_TIME = 5 * 60 * 1000; // Ciclo de watchdog (no detiene polling de forma permanente)
  const POLLING_INTERVAL = 8000; // Menos carga: polling estable cada 8s

  // 🔧 CRÍTICO: Crear una dependencia estable basada en IDs en lugar del array completo
  // Esto evita que el polling se limpie y reinicie cada vez que resultados cambia de referencia
  const licitacionIdsStr = useMemo(() => {
    if (!licitaciones || licitaciones.length === 0) return '';
    return licitaciones
      .map(l => {
        const id = l.ID_Portafolio || l.id_del_portafolio;
        return normalizeLicitacionId(id);
      })
      .filter(id => id && id.length > 0)  // Solo strings no vacíos
      .sort()
      .join(',');
  }, [licitaciones]);

  // 🆕 Resetear cuando cambia la búsqueda
  useEffect(() => {
    const currentQuery = paginationInfo?.lastQuery;
    
    if (lastQueryRef.current !== currentQuery) {
      lastQueryRef.current = currentQuery;
      setAllResultados([]);
      setAnalysisStatus({});
      lastLicitacionIdsRef.current = [];
      lastTriggerRef.current = [];
      triggerFailedRef.current = false;
      savedAptasRef.current = new Set();
      savedAnalyzedRef.current = new Map();
      noDocsBlockedIdsRef.current = new Set();
      isLoadingExistingRef.current = false;
      existingLoadStateRef.current = { key: '', done: false };
      
      // 🆕 Log de nueva búsqueda con parámetros
      if (currentQuery) {
        const totalPaginas = Math.ceil((paginationInfo?.total || 0) / (paginationInfo?.limit || 21));
        console.log(`[AUTO_ANALYSIS] 📋 Nueva búsqueda:`);
        console.log(`    📊 Total resultados: ${paginationInfo?.total || 0}`);
        console.log(`    📄 Páginas totales: ${totalPaginas}`);
        console.log(`    🔍 Query: ${JSON.stringify(currentQuery)}`);
        console.log(`    📍 Parámetros: offset=${paginationInfo?.offset || 0}, limit=${paginationInfo?.limit || 21}`);
      }
    }
  }, [paginationInfo?.lastQuery]); // 🔧 CRÍTICO: Solo resetear cuando cambia la BÚSQUEDA, no cuando cambia offset/limit (paginación)

  // 🆕 Cargar análisis existentes de la BD cuando llegan nuevas licitaciones
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0) return;
    
    const ids = licitaciones
      .map(l => {
        const id = l.ID_Portafolio || l.id_del_portafolio;
        return normalizeLicitacionId(id);
      })
      .filter(id => id && id.length > 0);
    
    if (ids.length === 0) return;

    existingLoadStateRef.current = { key: licitacionIdsStr, done: false };
    isLoadingExistingRef.current = true;
    // Estado visible para UI/logs
    setIsLoadingExisting(true);
    console.log(`[AUTO_ANALYSIS] 🔍 Solicitando análisis previos para ${ids.length} licitaciones:`, ids.slice(0, 3).join(', '), '...');
    
    // Cargar análisis existentes
    loadExistingAnalysis(ids)
      .then(existingData => {
        if (Object.keys(existingData).length > 0) {
          console.log(`[AUTO_ANALYSIS] 🎯 ✅ Encontrados ${Object.keys(existingData).length} análisis previos en BD`);
          const completedIds = [];
          const aptasIds = [];
          
          // ✅ ACUMULAR: No reemplazar, sino agregar a los existentes
          setAnalysisStatus(prev => {
            const updated = { ...prev };
            Object.entries(existingData).forEach(([id, analysis]) => {
              const estado = String(analysis?.estado || '').toLowerCase();
              const hasRequisitos = analysis?.requisitos && typeof analysis.requisitos === 'object' && Object.keys(analysis.requisitos).length > 0;
              const hasDetalles = analysis?.detalles && typeof analysis.detalles === 'object' && Object.keys(analysis.detalles).length > 0;
              const hasEvidence = hasRequisitos || hasDetalles || analysis?.cumple !== undefined && analysis?.cumple !== null;
              const isTerminal = ['completado', 'sin_documentos', 'error'].includes(estado);

              if (analysis && (isTerminal || hasEvidence)) {
                updated[id] = {
                  estado: isTerminal ? estado : 'completado',
                  cumple: normalizeCumpleValue(analysis.cumple),
                  porcentaje_cumplimiento: analysis.porcentaje || 0,
                  detalles: analysis.detalles,
                  requisitos_extraidos: analysis.requisitos
                };
                completedIds.push(id);
                if (estado === 'sin_documentos') {
                  noDocsBlockedIdsRef.current.add(id);
                }
                if (analysis.cumple === true || (typeof analysis.cumple === 'number' && analysis.cumple > 0)) {
                  aptasIds.push(id);
                }
                console.log(`[AUTO_ANALYSIS] 📦 Pre-cargado: ${id} - cumple=${analysis.cumple}`);
              }
            });
            console.log(`[AUTO_ANALYSIS] ✅ Estado actualizado con ${Object.keys(existingData).length} análisis pre-cargados. Total en analysisStatus: ${Object.keys(updated).length}`);
            return updated;
          });

          if (completedIds.length > 0) {
            lastTriggerRef.current = Array.from(new Set([...lastTriggerRef.current, ...completedIds]));
          }
          if (aptasIds.length > 0) {
            aptasIds.forEach(id => savedAptasRef.current.add(id));
          }
        } else {
          console.log(`[AUTO_ANALYSIS] ℹ️ No se encontraron análisis previos en BD para estos IDs`);
        }
      })
      .catch(err => {
        console.error(`[AUTO_ANALYSIS] ⚠️ Error cargando análisis previos:`, err.message);
      })
      .finally(() => {
        existingLoadStateRef.current = { key: licitacionIdsStr, done: true };
        isLoadingExistingRef.current = false;
        setIsLoadingExisting(false);
        console.log(`[AUTO_ANALYSIS] 🔓 Carga de análisis existentes completada - trigger desbloqueado`);
      });
  }, [licitacionIdsStr]);

  // Actualizar resultados acumulados
  useEffect(() => {
    if (licitaciones && licitaciones.length > 0) {
      setAllResultados(prev => {
        const existingIds = new Set(prev.map(l => l.ID_Portafolio || l.id_del_portafolio));
        const newLicitaciones = licitaciones.filter(l => 
          !existingIds.has(l.ID_Portafolio || l.id_del_portafolio)
        );
        return [...prev, ...newLicitaciones];
      });
    }
  }, [licitacionIdsStr]);

  // 🆕 RESET cuando cambia página (offset) - SOLO resetear trigger cache, NO los análisis
  useEffect(() => {
    console.log(`[AUTO_ANALYSIS] 📄 Offset cambió a: ${paginationInfo?.offset || 0} - Limpiando trigger cache para nueva página`);
    lastTriggerRef.current = [];  // ✅ Resetear para que dispare trigger en nueva página
    //  NO resetear analysisStatus - acumular análisis de todas las páginas
    //  NO resetear allResultados - acumular resultados de todas las páginas
    setIsPolling(false);           // Detener polling anterior (reiniciará si hay nuevos IDs)
  }, [paginationInfo?.offset]);

  // 🆕 TRIGGER: Disparar análisis batch para licitaciones nuevas
  useEffect(() => {
    if (!LIVE_AUTO_ANALYSIS_ENABLED) {
      return;
    }

    if (!licitaciones || licitaciones.length === 0) {
      return;
    }

    const existingState = existingLoadStateRef.current;
    const waitingExisting =
      isLoadingExisting ||
      isLoadingExistingRef.current ||
      existingState.key !== licitacionIdsStr ||
      !existingState.done;

    if (waitingExisting) {
      console.log('[AUTO_ANALYSIS] ⏳ Esperando a que carguen análisis previos antes de disparar trigger');
      return;
    }

    const ids = licitaciones
      .map(l => normalizeLicitacionId(l.ID_Portafolio || l.id_del_portafolio))
      .filter(Boolean);

    if (ids.length === 0) return;

    // Detectar IDs nuevos (aun no triggereados y sin estado persistido final).
    const newIds = ids.filter(id => {
      const status = analysisStatusRef.current[id];
      const estado = String(status?.estado || '').toLowerCase();
      const isRetryableError = estado === 'error' || estado === 'pendiente_reintento';
      const hasKnownStatus = Boolean(status && estado);
      const hasFinalStatus = TERMINAL_STATES.has(estado) && !isRetryableError;
      const alreadyTriggered = lastTriggerRef.current.includes(id);
      const effectiveTriggered = isRetryableError ? false : alreadyTriggered;
      const noDocsBlocked = noDocsBlockedIdsRef.current.has(id);

      if (noDocsBlocked) {
        console.log(`[AUTO_ANALYSIS] ⏭️ Saltando ${id} - bloqueado por estado sin_documentos`);
        return false;
      }

      // Si ya tenemos estado persistido para ese ID, no volver a sembrar trigger al recargar sesión.
      if (hasKnownStatus && estado !== 'no_iniciado' && !isRetryableError) {
        console.log(`[AUTO_ANALYSIS] ⏭️ Saltando ${id} - estado existente en BD/polling: ${estado}`);
        return false;
      }

      if (hasFinalStatus) {
        console.log(`[AUTO_ANALYSIS] ⏭️ Saltando ${id} - ya tiene estado terminal: ${estado}`);
      }

      return !effectiveTriggered && !hasFinalStatus;
    });
    
    if (newIds.length === 0) {
      console.log('[AUTO_ANALYSIS] ✅ Todos los IDs ya tienen análisis o fueron triggereados');
      return;
    }

    // Procesar lote acotado para no saturar el backend y evitar dejar IDs sin iniciar.
    const MAX_TRIGGER_PER_RUN = 12;
    const idsToTrigger = newIds.slice(0, MAX_TRIGGER_PER_RUN);

    const payload = idsToTrigger
      .map((id) => {
        // 🔒 Protección: asegurar que licitaciones existe y es array
        if (!licitaciones || !Array.isArray(licitaciones)) {
          console.warn(`[AUTO_ANALYSIS] ⚠️ licitaciones no es array válido:`, licitaciones);
          return null;
        }
        
        const lic = licitaciones.find(
          item => normalizeLicitacionId(item.ID_Portafolio || item.id_del_portafolio) === id
        );
        if (!lic) {
          console.warn(`[AUTO_ANALYSIS] ⚠️ No encontrada licitación ${id}`);
          return null;
        }
        
        try {
          return {
            id,
            nombre: lic.Nombre || lic.nombre_del_procedimiento || 'Sin nombre',
            documentos: prepararDocumentos(lic)
          };
        } catch (error) {
          console.error(`[AUTO_ANALYSIS]  Error preparando payload para ${id}:`, error);
          return null;
        }
      })
      .filter(Boolean);

    if (payload.length === 0) return;

    console.log(`[AUTO_ANALYSIS] Disparando analisis para ${payload.length} licitaciones nuevas`);

    // Disparar trigger para 1 sola licitacion
    triggerBatchAnalysis(payload)
      .then(result => {
        if (result.ok) {
          if (result.timeout) {
            console.log(`[AUTO_ANALYSIS] ⏳ Trigger sin confirmacion HTTP (timeout local). Se mantiene polling para ${payload.length} licitaciones`);
          } else {
            console.log(`[AUTO_ANALYSIS] Trigger exitoso para ${payload.length} licitaciones`);
          }
          // Marcar todas como triggereadas
          lastTriggerRef.current = [...lastTriggerRef.current, ...payload.map(p => p.id)];
          triggerFailedRef.current = false;
        }
      })
      .catch(error => {
        console.warn(`[AUTO_ANALYSIS] Trigger fallido:`, error.message);
        triggerFailedRef.current = true;
      });
  }, [licitacionIdsStr, paginationInfo?.offset, paginationInfo?.limit, isLoadingExisting, TERMINAL_STATES]);

  // Polling para chequear estado del análisis
  useEffect(() => {
    if (!LIVE_AUTO_ANALYSIS_ENABLED) {
      setIsPolling(false);
      return;
    }

    if (!licitaciones || licitaciones.length === 0) return;

    const ids = licitaciones
      .map(l => {
        const id = l.ID_Portafolio || l.id_del_portafolio;
        // Asegurar que es string, no objeto ni null
        return typeof id === 'string' ? id.trim() : String(id).trim();
      })
      .filter(id => id && id.length > 0);  // Filtro mejorado: solo strings no vacíos

    if (ids.length === 0) return;
    
    // Si no hemos chequeado estos IDs antes, iniciar polling
    const newIds = ids.filter(id => !lastLicitacionIdsRef.current.includes(id));
    if (newIds.length === 0) return;

    lastLicitacionIdsRef.current = ids;
    
    // 🆕 Calcular información de paginación una sola vez (se reutiliza en todo el useEffect)
    const offset = paginationInfo?.offset || 0;
    const limit = paginationInfo?.limit || 21;
    const total = paginationInfo?.total || 0;
    const esUltimaPagina = offset + limit >= total;
    
    console.log(`[AUTO_ANALYSIS] 📊 POLLING: Iniciando para ${ids.length} licitaciones`);
    console.log(`    📄 Página: ${Math.floor(offset / limit) + 1} de ${Math.ceil(total / limit)}`);
    
    setIsPolling(true);
    pollingStartTimeRef.current = Date.now();

    const checkStatus = async () => {
      if (isCheckStatusRunningRef.current) {
        console.log('[AUTO_ANALYSIS] ⏭️ Polling anterior aun en curso; se omite este tick para evitar solape');
        return;
      }

      isCheckStatusRunningRef.current = true;

      try {
      pollingTickRef.current += 1;

      const hasStatusEvidence = (status) => {
        if (!status || typeof status !== 'object') return false;
        const hasCumple = status.cumple !== undefined && status.cumple !== null;
        const hasRequisitos =
          status.requisitos &&
          typeof status.requisitos === 'object' &&
          Object.keys(status.requisitos).length > 0;
        const hasDetalles =
          status.detalles &&
          typeof status.detalles === 'object' &&
          Object.keys(status.detalles).length > 0;
        return hasCumple || hasRequisitos || hasDetalles;
      };

      const getAnalysisFingerprint = (status) => {
        const normalized = {
          estado: status?.estado || null,
          cumple: normalizeCumpleValue(status?.cumple),
          porcentaje_cumplimiento:
            typeof status?.porcentaje_cumplimiento === 'number' ? status.porcentaje_cumplimiento : null,
          detalles: status?.detalles || {},
          requisitos_extraidos: status?.requisitos_extraidos || status?.requisitos || {},
        };
        return JSON.stringify(normalized);
      };

      // Soft-timeout: si pasaron 5 minutos y aun hay no terminales,
      // reinicia la ventana de watchdog pero NO detiene el polling.
      if (Date.now() - pollingStartTimeRef.current > MAX_POLLING_TIME) {
        console.log('[AUTO_ANALYSIS] ⏱️ Watchdog 5m alcanzado; se mantiene polling para evitar atasco visual');
        pollingStartTimeRef.current = Date.now();
      }

      let allCompleted = true;
      let completedCount = 0;
      let processingCount = 0;
      let pendingCount = 0;
      let notInitiatedCount = 0;
      let terminalNoDocsCount = 0;
      let terminalErrorCount = 0;
      const pendingRetryIds = [];
      const noIniciadoIds = [];
      const terminalStates = new Set(['completado', 'sin_documentos', 'error']);

      // Chequear estado de cada ID
      for (const id of ids) {
        try {
          const knownStatus = analysisStatusRef.current[id];
          const knownEstado = knownStatus?.estado;
          if (knownStatus && terminalStates.has(knownEstado)) {
            if (knownStatus.estado === 'completado') completedCount++;
            if (knownStatus.estado === 'sin_documentos') terminalNoDocsCount++;
            if (knownStatus.estado === 'error') terminalErrorCount++;
            continue;
          }

          if (knownStatus && !terminalStates.has(knownEstado)) {
            // Mantener polling para estados no terminales aunque ya tengan datos parciales.
            allCompleted = false;
          }

          // Si el item ya viene desde BD como final, no volver a consultar status en backend.
          const licitacionLocal = licitaciones.find(
            (item) => (item.ID_Portafolio || item.id_del_portafolio) === id
          );
          const localFinalStatus = licitacionLocal?._analysisStatus;
          if (localFinalStatus && terminalStates.has(localFinalStatus.estado)) {
            if (localFinalStatus.estado === 'completado') completedCount++;
            if (localFinalStatus.estado === 'sin_documentos') terminalNoDocsCount++;
            if (localFinalStatus.estado === 'error') terminalErrorCount++;
            continue;
          }

          if (!id) {
            console.warn(`[AUTO_ANALYSIS] ⚠️ ID inválido (vacío o null)`);
            continue;
          }

          const encodedId = encodeURIComponent(String(id).trim());
          const url = `${API_BASE}/analysis/batch/status/${encodedId}`;
          
          const response = await fetch(url, { credentials: 'include' });

          if (!response.ok) {
            allCompleted = false;
            console.warn(`[AUTO_ANALYSIS] ⚠️ Status ${response.status} para ${id} - URL: ${url}`);
            continue;
          }
          
          const data = await response.json();

          if (data.ok) {
            const hasPersistedEvidence = hasMeaningfulAnalysisEvidence(data);

            const rawEstado = data.estado;
            const estado =
              ['pendiente', 'no_iniciado', 'procesando'].includes(rawEstado) && hasPersistedEvidence
                ? 'completado'
                : rawEstado;
            
            // 🆕 Logging más detallado para debug
            if (estado === 'completado') {
              completedCount++;
              console.log(`[AUTO_ANALYSIS] ✅ COMPLETADO: ${id} - cumple=${data.cumple}, porcentaje_cumplimiento=${data.porcentaje_cumplimiento}%`);
            } else if (estado === 'en_proceso' || estado === 'procesando') {
              processingCount++;
              console.log(`[AUTO_ANALYSIS] 🔄 EN PROCESO: ${id}`);
            } else if (estado === 'pendiente') {
              pendingCount++;
              pendingRetryIds.push(id);
              console.log(`[AUTO_ANALYSIS] 🕒 PENDIENTE: ${id}`);
            } else if (estado === 'no_iniciado') {
              notInitiatedCount++;
              noIniciadoIds.push(id);
              console.log(`[AUTO_ANALYSIS] ⏳ NO INICIADO: ${id}`);
            } else if (estado === 'sin_documentos') {
              terminalNoDocsCount++;
              noDocsBlockedIdsRef.current.add(id);
              console.log(`[AUTO_ANALYSIS] 📭 SIN DOCUMENTOS: ${id}`);
            } else if (estado === 'error') {
              terminalErrorCount++;
              console.log(`[AUTO_ANALYSIS]  ERROR: ${id} - ${data.error_message || 'sin detalle'}`);
            }

            setAnalysisStatus(prev => {
              const prevStatus = prev[id];
              const prevIsFinal = prevStatus && prevStatus.estado === 'completado' && typeof prevStatus.cumple === 'boolean';
              const newIsFinal = estado === 'completado' && (typeof data.cumple === 'boolean' || typeof data.cumple === 'number' || hasPersistedEvidence);

              // No sobre-escribir un resultado final con uno parcial
              if (prevIsFinal && !newIsFinal) {
                return prev;
              }

              const updated = {
                ...prev,
                [id]: {
                  estado,
                  estado_original: rawEstado,
                  cumple: normalizeCumpleValue(data.cumple),
                  porcentaje_cumplimiento: data.porcentaje_cumplimiento,
                  detalles: data.detalles,
                  requisitos: data.requisitos_extraidos
                }
              };
              console.log(`[AUTO_ANALYSIS] Estado actualizado para ${id}:`, updated[id]);
              return updated;
            });

            // Guardar estados terminales para que no se pierdan al paginar.
            if (terminalStates.has(estado)) {
              const licitacion = licitacionLocal || licitaciones.find(l => (l.ID_Portafolio || l.id_del_portafolio) === id);
              if (licitacion) {
                const savePayload = {
                  ...data,
                  estado: estado,
                  estado_analisis: estado,
                  requisitos_extraidos: data.requisitos_extraidos || {},
                  detalles: data.detalles || {}
                };
                const fingerprint = getAnalysisFingerprint(savePayload);
                const previousFingerprint = savedAnalyzedRef.current.get(id);

                if (previousFingerprint !== fingerprint) {
                  savedAnalyzedRef.current.set(id, fingerprint);
                  saveAnalyzedLicitacion(licitacion, savePayload).catch(() => {
                    savedAnalyzedRef.current.delete(id);
                    console.warn(`[AUTO_ANALYSIS] ⚠️ Error guardando análisis para ${id}`);
                  });
                }

                // Si cumple, TAMBIÉN guardar como apta
                const cumpleVerdadero = data.cumple === true || (typeof data.cumple === 'number' && data.cumple > 0);
                if (cumpleVerdadero && !savedAptasRef.current.has(id)) {
                  savedAptasRef.current.add(id);
                  saveMatchedLicitacion(licitacion, data).catch(() => {
                    savedAptasRef.current.delete(id);
                  });
                }
              }
            }

            // Solo seguir polling para estados no terminales.
            if (!terminalStates.has(estado)) {
              allCompleted = false;
            }
          }
        } catch (error) {
          allCompleted = false;
          
          // Diferencia entre tipos de errores
          if (error.message.includes('Failed to fetch')) {
            console.error(`[AUTO_ANALYSIS]  Error de red para ${id}: Backend en ${API_BASE} no responde. ¿Está ejecutándose?`, error);
          } else if (error instanceof SyntaxError) {
            console.error(`[AUTO_ANALYSIS]  Respuesta JSON inválida para ${id}:`, error.message);
          } else {
            console.error(`[AUTO_ANALYSIS]  Error chequeando ${id}:`, error.message);
          }
        }
      }

      // 🆕 Log de progreso
      console.log(
        `[AUTO_ANALYSIS] 📈 Progreso: ${completedCount} completados, ` +
        `${terminalNoDocsCount} sin_documentos, ${terminalErrorCount} error, ` +
        `${processingCount} en proceso, ${pendingCount} pendientes, ${notInitiatedCount} no iniciados`
      );

      // Diagnóstico ligero de cola para detectar atascos en backend.
      if (pollingTickRef.current % 4 === 0) {
        const queueSummary = await fetchQueueSummary(5);
        if (queueSummary) {
          const counts = queueSummary.counts || {};
          const pendientes = counts.pendiente ?? 0;
          const procesando = counts.procesando ?? 0;
          const completado = counts.completado ?? 0;
          const sinDocumentos = counts.sin_documentos ?? 0;
          const error = counts.error ?? 0;
          console.log(
            `[AUTO_ANALYSIS] 🧭 Cola backend: ` +
              `pendiente=${pendientes}, procesando=${procesando}, completado=${completado}, ` +
              `sin_documentos=${sinDocumentos}, error=${error}, oldest_pending_minutes=${queueSummary.oldest_pending_minutes}`
          );
        }
      }

      // Watchdog: si hay IDs en no_iniciado por varios ciclos, reintentar trigger-batch.
      const retryCandidates = [...pendingRetryIds, ...noIniciadoIds].filter(
        (id) => !noDocsBlockedIdsRef.current.has(id)
      );
      if (retryCandidates.length > 0) {
        const retryKey = [...retryCandidates].sort().join(',');
        const now = Date.now();
        const MIN_RETRY_INTERVAL_MS = 45000;
        const canRetryNow =
          pollingTickRef.current >= 3 &&
          (now - lastNoIniciadoRetryRef.current.at > MIN_RETRY_INTERVAL_MS ||
            lastNoIniciadoRetryRef.current.key !== retryKey);

        if (canRetryNow) {
          const retryIds = retryCandidates.slice(0, 10);
          const retryPayload = retryIds
            .map((id) => {
              const lic = licitaciones.find(
                (item) => (item.ID_Portafolio || item.id_del_portafolio) === id
              );
              if (!lic) return null;
              return {
                id,
                nombre: lic.Nombre || lic.nombre_del_procedimiento || 'Sin nombre',
                documentos: prepararDocumentos(lic),
              };
            })
            .filter(Boolean);

          if (retryPayload.length > 0) {
            console.log(
              `[AUTO_ANALYSIS] ♻️ Reintentando trigger para ${retryPayload.length} IDs pendientes/no_iniciado: ${retryIds.join(', ')}`
            );
            try {
              await triggerBatchAnalysis(retryPayload);
              lastNoIniciadoRetryRef.current = { at: now, key: retryKey };
            } catch (retryErr) {
              console.warn(
                `[AUTO_ANALYSIS] ⚠️ Reintento de trigger falló para pendientes/no_iniciado: ${retryErr.message}`
              );
            }
          }
        }
      }

      // Si todos completaron, parar
      if (allCompleted) {
        console.log('[AUTO_ANALYSIS] ✅ Todos los análisis de esta página completados');
        
        const { offset = 0, limit = 21, total = 0 } = paginationInfo;
        const esUltimaPagina = offset + limit >= total;
        
        // 🆕 Si además es la ÚLTIMA página, detener polling completamente
        if (esUltimaPagina) {
          console.log('[AUTO_ANALYSIS] 🏁 ÚLTIMA PÁGINA ANALIZADA - Deteniendo análisis completamente');
          setIsPolling(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else if (onPageComplete && typeof onPageComplete === 'function') {
          // 🚀 AUTO-PAGINAR a la siguiente página
          console.log(`
╔════════════════════════════════════════════════════════════╗
║ 🚀 AUTO-PAGINACIÓN ACTIVADA
╠════════════════════════════════════════════════════════════╣
║ ✅ Página actual completada
║ 📄 Offset: ${offset}, Limit: ${limit}
║ 📊 Total: ${total}
║ 👉 Saltando a próxima página...
║ ⏰ ${new Date().toLocaleTimeString()}
╚════════════════════════════════════════════════════════════╝
          `);
          
          const nextOffset = offset + limit;
          onPageComplete(nextOffset);
          
          // 🆕 NO resetear estado aquí - dejar que la siguiente página cargue naturalmente
          // El hook detectará nuevas licitaciones y disparará nuevo trigger
          // setAnalysisStatus({});  //  REMOVIDO - causaba que volviera a página 1
          // setAllResultados([]);   //  REMOVIDO - causaba que volviera a página 1
          setIsPolling(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }
      } finally {
        isCheckStatusRunningRef.current = false;
      }
    };

    // Chequear inmediatamente
    checkStatus();

    // Luego chequear cada 8 segundos
    intervalRef.current = setInterval(checkStatus, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [licitacionIdsStr]);

  // 🆕 Calcular si estamos en la última página
  const offset = paginationInfo?.offset || 0;
  const limit = paginationInfo?.limit || 21;
  const total = paginationInfo?.total || 0;
  const esUltimaPagina = offset + limit >= total;
  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.ceil((offset + 1) / limit) || 1;

  useEffect(() => {
    analysisStatusRef.current = analysisStatus;
  }, [analysisStatus]);

  return {
    analysisStatus,
    isPolling: LIVE_AUTO_ANALYSIS_ENABLED ? isPolling : false,
    pageIndex: 0,
    allResultados,
    // 🆕 Información adicional para debugging
    resumen: {
      totalAnalizando: allResultados.length,
      completados: Object.values(analysisStatus).filter(s => s.estado === 'completado').length,
      sinDocumentos: Object.values(analysisStatus).filter(s => s.estado === 'sin_documentos').length,
      conError: Object.values(analysisStatus).filter(s => s.estado === 'error').length,
      enProceso: Object.values(analysisStatus).filter(s => s.estado === 'en_proceso' || s.estado === 'procesando').length,
      noIniciados: Object.values(analysisStatus).filter(s => s.estado === 'no_iniciado').length,
      cumpliendo: Object.values(analysisStatus).filter(s => s.cumple === true || (typeof s.cumple === 'number' && s.cumple > 0)).length
    },
    // 🆕 Información de paginación
    paginationStatus: {
      currentPage,
      totalPages,
      esUltimaPagina,
      offset,
      limit,
      total
    }
  };
}
