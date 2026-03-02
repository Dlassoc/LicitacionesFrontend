// src/hooks/useAutoAnalysis.js
import { useState, useEffect, useRef, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

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
      fecha_publicacion: licitacion.Fecha_publicacion || licitacion.fecha_de_publicacion_del || '',
      enlace: licitacion.URL_Proceso || licitacion.enlace || '',
      porcentaje_cumplimiento: percentage,
      cumple: analysisData.cumple !== null && analysisData.cumple !== undefined ? analysisData.cumple : null,
      detalles: analysisData.detalles || {},
      requisitos_extraidos: analysisData.requisitos_extraidos || analysisData.requisitos || {}
    };

    console.log(`[AUTO_ANALYSIS] 💾 Guardando en licitaciones_analisis: ${idPortafolio}, cumple=${payload.cumple}`);
    
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
║ ❌ ERROR GUARDANDO LICITACIÓN EN BD
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
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 🆕 Aumentado a 30 segundos

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
      userMessage = 'Timeout: Backend tardó más de 30 segundos (aún procesando)';
    } else if (error.message.includes('Failed to fetch')) {
      userMessage = `No se puede conectar con ${API_BASE}. ¿Está ejecutándose?`;
    }
    
    console.warn(`[AUTO_ANALYSIS] ⚠️ No se pudo disparar trigger:`, userMessage);
    throw new Error(userMessage);
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
  const analysisStatusRef = useRef({}); // 🆕 Consulta estable dentro de effects
  const MAX_POLLING_TIME = 10 * 60 * 1000; // 🆕 Aumentado a 10 minutos (análisis puede tardar)
  const POLLING_INTERVAL = 10000; // 🔧 10 segundos - balance entre responsividad y flickering (WAS 5000/2000)

  // 🔧 CRÍTICO: Crear una dependencia estable basada en IDs en lugar del array completo
  // Esto evita que el polling se limpie y reinicie cada vez que resultados cambia de referencia
  const licitacionIdsStr = useMemo(() => {
    if (!licitaciones || licitaciones.length === 0) return '';
    return licitaciones
      .map(l => {
        const id = l.ID_Portafolio || l.id_del_portafolio;
        // Asegurar que es string válido
        return typeof id === 'string' ? id.trim() : String(id).trim();
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
        return typeof id === 'string' ? id.trim() : String(id).trim();
      })
      .filter(id => id && id.length > 0);
    
    if (ids.length === 0) return;

    // 🔧 Usar ESTADO (no ref) para bloquear trigger - garantiza re-render
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
              if (analysis && analysis.estado === 'completado') {
                updated[id] = {
                  estado: analysis.estado,
                  cumple: analysis.cumple,
                  porcentaje_cumplimiento: analysis.porcentaje || 0,
                  detalles: analysis.detalles,
                  requisitos_extraidos: analysis.requisitos
                };
                completedIds.push(id);
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
        // 🔧 Usar ESTADO para desbloquear trigger
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
    // ❌ NO resetear analysisStatus - acumular análisis de todas las páginas
    // ❌ NO resetear allResultados - acumular resultados de todas las páginas
    setIsPolling(false);           // Detener polling anterior (reiniciará si hay nuevos IDs)
  }, [paginationInfo?.offset]);

  // 🆕 TRIGGER: Disparar análisis batch para licitaciones nuevas
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0 || triggerFailedRef.current) {
      return;
    }

    // 🔧 CRÍTICO: Esperar a que termine la carga de análisis existentes (usar ESTADO)
    if (isLoadingExisting) {
      console.log('[AUTO_ANALYSIS] ⏳ Esperando a que carguen análisis previos antes de disparar trigger');
      return;
    }

    const ids = licitaciones
      .map(l => l.ID_Portafolio || l.id_del_portafolio)
      .filter(Boolean);

    if (ids.length === 0) return;

    // Detectar IDs nuevos (aun no trigereados Y sin status final en BD)
    const newIds = ids.filter(id => {
      const status = analysisStatusRef.current[id];
      const hasFinalStatus = status && status.estado === 'completado';
      const alreadyTriggered = lastTriggerRef.current.includes(id);
      if (hasFinalStatus) {
        console.log(`[AUTO_ANALYSIS] ⏭️ Saltando ${id} - ya tiene análisis completado`);
      }
      return !alreadyTriggered && !hasFinalStatus;
    });
    
    if (newIds.length === 0) {
      console.log('[AUTO_ANALYSIS] ✅ Todos los IDs ya tienen análisis o fueron triggereados');
      return;
    }

    // OPTIMIZACION PARA CPANEL: Procesar UNA licitacion a la vez en lugar de batch
    // Esto reduce carga en el servidor
    const primeraNuevaLicitacion = licitaciones.find(lic => 
      newIds.includes(lic.ID_Portafolio || lic.id_del_portafolio)
    );
    
    if (!primeraNuevaLicitacion) return;
    
    console.log(`[AUTO_ANALYSIS] Disparando analisis individual para 1 licitacion`);

    // Preparar payload con 1 SOLA licitacion (individual mode)
    const payload = [{
      id: primeraNuevaLicitacion.ID_Portafolio || primeraNuevaLicitacion.id_del_portafolio,
      nombre: primeraNuevaLicitacion.Nombre || primeraNuevaLicitacion.nombre_del_procedimiento || 'Sin nombre',
      documentos: prepararDocumentos(primeraNuevaLicitacion)
    }];

    // Disparar trigger para 1 sola licitacion
    triggerBatchAnalysis(payload)
      .then(result => {
        if (result.ok) {
          console.log(`[AUTO_ANALYSIS] Trigger exitoso para 1 licitacion`);
          // Marcar como trigereada
          lastTriggerRef.current = [...lastTriggerRef.current, payload[0].id];
          triggerFailedRef.current = false;
        }
      })
      .catch(error => {
        console.warn(`[AUTO_ANALYSIS] Trigger fallido:`, error.message);
        triggerFailedRef.current = true;
      });
  }, [licitacionIdsStr, paginationInfo?.offset, paginationInfo?.limit, isLoadingExisting]); // 🔧 Añadido isLoadingExisting como dependencia

  // Polling para chequear estado del análisis
  useEffect(() => {
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
      // Si pasaron 5 minutos, detener
      if (Date.now() - pollingStartTimeRef.current > MAX_POLLING_TIME) {
        console.log('[AUTO_ANALYSIS] ⏱️ Timeout de 5 minutos alcanzado, deteniendo polling');
        setIsPolling(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      let allCompleted = true;
      let completedCount = 0;
      let processingCount = 0;
      let notInitiatedCount = 0;

      // Chequear estado de cada ID
      for (const id of ids) {
        try {
          if (!id) {
            console.warn(`[AUTO_ANALYSIS] ⚠️ ID inválido (vacío o null)`);
            continue;
          }

          const encodedId = encodeURIComponent(String(id).trim());
          const url = `${API_BASE}/analysis/batch/status/${encodedId}`;
          
          const response = await fetch(url, { credentials: 'include' });

          if (!response.ok) {
            console.warn(`[AUTO_ANALYSIS] ⚠️ Status ${response.status} para ${id} - URL: ${url}`);
            continue;
          }
          
          const data = await response.json();

          if (data.ok) {
            const estado = data.estado;
            
            // 🆕 Logging más detallado para debug
            if (estado === 'completado') {
              completedCount++;
              console.log(`[AUTO_ANALYSIS] ✅ COMPLETADO: ${id} - cumple=${data.cumple}, porcentaje_cumplimiento=${data.porcentaje_cumplimiento}%`);
            } else if (estado === 'en_proceso' || estado === 'procesando') {
              processingCount++;
              console.log(`[AUTO_ANALYSIS] 🔄 EN PROCESO: ${id}`);
            } else if (estado === 'no_iniciado') {
              notInitiatedCount++;
              console.log(`[AUTO_ANALYSIS] ⏳ NO INICIADO: ${id}`);
            }

            setAnalysisStatus(prev => {
              const prevStatus = prev[id];
              const prevIsFinal = prevStatus && prevStatus.estado === 'completado' && typeof prevStatus.cumple === 'boolean';
              const newIsFinal = data.estado === 'completado' && (typeof data.cumple === 'boolean' || typeof data.cumple === 'number');

              // No sobre-escribir un resultado final con uno parcial
              if (prevIsFinal && !newIsFinal) {
                return prev;
              }

              const updated = {
                ...prev,
                [id]: {
                  estado: data.estado,
                  cumple: data.cumple,
                  porcentaje_cumplimiento: data.porcentaje_cumplimiento,
                  detalles: data.detalles,
                  requisitos: data.requisitos_extraidos
                }
              };
              console.log(`[AUTO_ANALYSIS] Estado actualizado para ${id}:`, updated[id]);
              return updated;
            });

            // 🔧 NUEVO: Guardar TODOS los análisis completados (no solo los aptos)
            // Esto permite cargar análisis previos sin re-analizar
            if (data.estado === 'completado') {
              const licitacion = licitaciones.find(l => (l.ID_Portafolio || l.id_del_portafolio) === id);
              if (licitacion) {
                // Guardar en tabla de análisis (todos)
                saveAnalyzedLicitacion(licitacion, data).catch(() => {
                  console.warn(`[AUTO_ANALYSIS] ⚠️ Error guardando análisis para ${id}`);
                });

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

            // Si NO está completado, seguir polling
            if (data.estado !== 'completado') {
              allCompleted = false;
            }
          }
        } catch (error) {
          allCompleted = false;
          
          // Diferencia entre tipos de errores
          if (error.message.includes('Failed to fetch')) {
            console.error(`[AUTO_ANALYSIS] ❌ Error de red para ${id}: Backend en ${API_BASE} no responde. ¿Está ejecutándose?`, error);
          } else if (error instanceof SyntaxError) {
            console.error(`[AUTO_ANALYSIS] ❌ Respuesta JSON inválida para ${id}:`, error.message);
          } else {
            console.error(`[AUTO_ANALYSIS] ❌ Error chequeando ${id}:`, error.message);
          }
        }
      }

      // 🆕 Log de progreso
      console.log(`[AUTO_ANALYSIS] 📈 Progreso: ${completedCount} completados, ${processingCount} en proceso, ${notInitiatedCount} no iniciados`);

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
          // setAnalysisStatus({});  // ❌ REMOVIDO - causaba que volviera a página 1
          // setAllResultados([]);   // ❌ REMOVIDO - causaba que volviera a página 1
          setIsPolling(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
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
    isPolling,
    pageIndex: 0,
    allResultados,
    // 🆕 Información adicional para debugging
    resumen: {
      totalAnalizando: allResultados.length,
      completados: Object.values(analysisStatus).filter(s => s.estado === 'completado').length,
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
