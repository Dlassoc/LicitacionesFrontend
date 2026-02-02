// src/hooks/useAutoAnalysis.js
import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

/**
 * 🆕 Guarda una licitación como apta cuando el análisis determina que cumple requisitos.
 */
async function saveMatchedLicitacion(licitacion, analysisData) {
  try {
    const idPortafolio = licitacion.ID_Portafolio || licitacion.id_del_portafolio;
    
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
      score: typeof analysisData.porcentaje === 'number' ? analysisData.porcentaje : 0,
      razon: analysisData.detalles || 'Cumple requisitos',
      requisitos_extraidos: analysisData.requisitos || {}
    };
    
    const response = await fetch(`${API_BASE}/saved/matched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log(`[AUTO_ANALYSIS] ✅ Guardada como apta: ${idPortafolio}`);
      return true;
    }
  } catch (error) {
    console.error(`[AUTO_ANALYSIS] ❌ Error guardando:`, error);
  }
  return false;
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
 */
export function useAutoAnalysis(licitaciones = [], paginationInfo = {}) {
  const [analysisStatus, setAnalysisStatus] = useState({});
  const [isPolling, setIsPolling] = useState(false);
  const [allResultados, setAllResultados] = useState([]);
  
  const intervalRef = useRef(null);
  const pollingStartTimeRef = useRef(null);
  const lastLicitacionIdsRef = useRef([]);
  const lastTriggerRef = useRef([]); // 🆕 Track qué IDs ya fueron triggereados
  const lastQueryRef = useRef(null);
  const triggerFailedRef = useRef(false); // Evitar spam de errores de trigger
  const MAX_POLLING_TIME = 10 * 60 * 1000; // 🆕 Aumentado a 10 minutos (análisis puede tardar)
  const POLLING_INTERVAL = 5000; // 🆕 Reducido a 5 segundos para mayor frecuencia

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
  }, [paginationInfo?.lastQuery, paginationInfo?.total, paginationInfo?.offset, paginationInfo?.limit]);

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
  }, [licitaciones]);

  // 🆕 TRIGGER: Disparar análisis batch para licitaciones nuevas
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0 || triggerFailedRef.current) {
      return;
    }

    const ids = licitaciones
      .map(l => l.ID_Portafolio || l.id_del_portafolio)
      .filter(Boolean);

    if (ids.length === 0) return;

    // Detectar IDs nuevos (aún no trigereados)
    const newIds = ids.filter(id => !lastTriggerRef.current.includes(id));
    if (newIds.length === 0) return;

    // Limitar a máximo 50 licitaciones por batch
    const batch = licitaciones.slice(0, Math.min(50, licitaciones.length));
    
    // 🆕 Log mejorado con información de página
    const paginaActual = Math.floor((paginationInfo?.offset || 0) / (paginationInfo?.limit || 21)) + 1;
    const totalPaginas = Math.ceil((paginationInfo?.total || 0) / (paginationInfo?.limit || 21));
    
    console.log(`[AUTO_ANALYSIS] 🚀 TRIGGER: Disparando análisis para ${batch.length} licitaciones (${newIds.length} nuevas)`);
    console.log(`    📄 Página: ${paginaActual}/${totalPaginas}`);
    console.log(`    📍 Offset: ${paginationInfo?.offset || 0}, Limit: ${paginationInfo?.limit || 21}`);
    console.log(`    🏷️ Query: ${paginationInfo?.lastQuery || 'automática'}`);

    // Preparar payload
    const payload = batch.map(lic => ({
      id: lic.ID_Portafolio || lic.id_del_portafolio,
      nombre: lic.Nombre || lic.nombre_del_procedimiento || 'Sin nombre',
      documentos: prepararDocumentos(lic)
    }));

    // Disparar trigger
    triggerBatchAnalysis(payload)
      .then(result => {
        if (result.ok) {
          console.log(`[AUTO_ANALYSIS] ✅ Trigger exitoso: ${result.total} licitaciones (${result.ya_analizados} ya analizadas, ${result.nuevos} nuevas)`);
          // Marcar como trigereados
          lastTriggerRef.current = ids;
          triggerFailedRef.current = false;
        }
      })
      .catch(error => {
        console.warn(`[AUTO_ANALYSIS] ⚠️ Trigger fallido, continuando con polling:`, error.message);
        triggerFailedRef.current = true;
      });
  }, [licitaciones, paginationInfo?.offset, paginationInfo?.limit]);

  // Polling para chequear estado del análisis
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0) return;

    const ids = licitaciones
      .map(l => l.ID_Portafolio || l.id_del_portafolio)
      .filter(Boolean);

    if (ids.length === 0) return;
    
    // Si no hemos chequeado estos IDs antes, iniciar polling
    const newIds = ids.filter(id => !lastLicitacionIdsRef.current.includes(id));
    if (newIds.length === 0) return;

    lastLicitacionIdsRef.current = ids;
    
    console.log(`[AUTO_ANALYSIS] 📊 POLLING: Iniciando para ${ids.length} licitaciones`);
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
          const response = await fetch(
            `${API_BASE}/analysis/batch/status/${encodeURIComponent(id)}`,
            { credentials: 'include' }
          );

          if (!response.ok) {
            console.warn(`[AUTO_ANALYSIS] ⚠️ Status ${response.status} para ${id}`);
            continue;
          }
          
          const data = await response.json();

          if (data.ok) {
            const estado = data.estado;
            
            // 🆕 Logging más detallado para debug
            if (estado === 'completado') {
              completedCount++;
            } else if (estado === 'en_proceso' || estado === 'procesando') {
              processingCount++;
            } else if (estado === 'no_iniciado') {
              notInitiatedCount++;
            }

            setAnalysisStatus(prev => ({
              ...prev,
              [id]: {
                estado: data.estado,
                cumple: data.cumple,
                porcentaje: data.porcentaje,
                detalles: data.detalles,
                requisitos: data.requisitos_extraidos
              }
            }));

            // Si cumple, guardar como apta
            if ((data.cumple === true || (typeof data.cumple === 'number' && data.cumple > 0)) && data.estado === 'completado') {
              const licitacion = licitaciones.find(l => (l.ID_Portafolio || l.id_del_portafolio) === id);
              if (licitacion) {
                saveMatchedLicitacion(licitacion, data).catch(() => {});
              }
            }

            // Si NO está completado, seguir polling
            if (data.estado !== 'completado') {
              allCompleted = false;
            }
          }
        } catch (error) {
          console.warn(`[AUTO_ANALYSIS] Error chequeando ${id}:`, error.message);
          allCompleted = false;
        }
      }

      // 🆕 Log de progreso
      console.log(`[AUTO_ANALYSIS] 📈 Progreso: ${completedCount} completados, ${processingCount} en proceso, ${notInitiatedCount} no iniciados`);

      // Si todos completaron, parar
      if (allCompleted) {
        console.log('[AUTO_ANALYSIS] ✅ Todos los análisis completados');
        setIsPolling(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    // Chequear inmediatamente
    checkStatus();

    // Luego chequear cada 8 segundos
    intervalRef.current = setInterval(checkStatus, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [licitaciones]);

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
    }
  };
}
