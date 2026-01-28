// src/hooks/useAutoAnalysis.js
import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

/**
 * Hook para análisis automático de licitaciones en background.
 * Analiza SOLO las páginas que realmente existen en los resultados.
 * No intenta analizar páginas que no existen.
 * 
 * @param {Array} licitaciones - Array de objetos con ID_Portafolio (página actual)
 * @param {Object} paginationInfo - Info de paginación {lastQuery, offset, limit, total}
 * @returns {Object} { analysisStatus, isPolling }
 */
export function useAutoAnalysis(licitaciones = [], paginationInfo = {}) {
  const [analysisStatus, setAnalysisStatus] = useState({});
  const [isPolling, setIsPolling] = useState(false);
  const [pageIndex, setPageIndex] = useState(0); // 0=página 1, 1=página 2, 2=página 3
  const [allResultados, setAllResultados] = useState([]); // Acumular resultados de TODAS las páginas
  const intervalRef = useRef(null);
  const pollingCountRef = useRef(0);
  const triggerSentRef = useRef(false);
  const previousIdsRef = useRef([]);
  const lastQueryRef = useRef(null);
  const cachedIdsRef = useRef(new Set()); // Track IDs that are already cached

  const { lastQuery, offset, limit, total } = paginationInfo;

  // Calcular total de páginas que realmente existen
  // ⚠️ PRUEBA: Limitar a máximo 1 página para testing rápido (sin OCR latency)
  const MAX_PAGES_FOR_TESTING = 1;
  const calculatedTotalPages = limit && total ? Math.ceil(total / limit) : 1;
  const totalPages = Math.min(calculatedTotalPages, MAX_PAGES_FOR_TESTING);
  
  if (calculatedTotalPages !== totalPages) {
    console.log(`[AUTO_ANALYSIS] 🧪 MODO TEST: Limitando análisis de ${calculatedTotalPages} a ${MAX_PAGES_FOR_TESTING} página(s)`);
  }

  // 1. Cargar caché inicial para las licitaciones actuales
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0) return;

    const ids = licitaciones
      .map(lic => lic.ID_Portafolio || lic.id_del_portafolio)
      .filter(Boolean);

    if (ids.length === 0) return;

    console.log('[AUTO_ANALYSIS] Cargando caché para IDs:', ids);

    const checkCachedStatus = async () => {
      const batchSize = 5;
      const newCachedIds = new Set();

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await Promise.all(batch.map(async (id) => {
          try {
            const response = await fetch(
              `${API_BASE}/analysis/batch/status/${encodeURIComponent(id)}`,
              { credentials: 'include' }
            );
            
            const data = await response.json();
            
            console.log(`[AUTO_ANALYSIS] Respuesta para ${id}:`, {
              ok: data.ok,
              estado: data.estado,
              cumple: data.cumple,
              porcentaje: data.porcentaje
            });
            
            if (data.ok) {
              const newStatus = {
                estado: data.estado,
                cumple: data.cumple,
                porcentaje: data.porcentaje,
                detalles: data.detalles,
                requisitos: data.requisitos_extraidos,
                error_message: data.error_message
              };
              
              if (data.estado === 'completado') {
                newCachedIds.add(id);
                console.log(`[AUTO_ANALYSIS] ✅ CACHÉ ENCONTRADO para ${id}: cumple=${data.cumple}`);
              } else {
                console.log(`[AUTO_ANALYSIS] ⏳ No completado para ${id}: estado=${data.estado}`);
              }
              
              setAnalysisStatus(prev => ({
                ...prev,
                [id]: newStatus
              }));
            } else {
              console.log(`[AUTO_ANALYSIS] ❌ No OK para ${id}`);
            }
          } catch (error) {
            console.error(`[AUTO_ANALYSIS] Error fetching ${id}:`, error);
          }
        }));
      }

      cachedIdsRef.current = newCachedIds;
      console.log(`[AUTO_ANALYSIS] Caché cargado: ${newCachedIds.size} de ${ids.length} licitaciones completadas`);
    };

    checkCachedStatus();
  }, [licitaciones]);

  // 2. Detectar nueva búsqueda y disparar análisis SOLO para IDs no cacheados
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0 || !lastQuery) {
      triggerSentRef.current = false;
      previousIdsRef.current = [];
      return;
    }

    // Obtener IDs actuales
    const currentIds = licitaciones
      .map(lic => lic.ID_Portafolio || lic.id_del_portafolio)
      .filter(Boolean);

    // Detectar si es nueva búsqueda comparando lastQuery
    const isNewSearch = lastQueryRef.current !== JSON.stringify(lastQuery);
    
    if (isNewSearch) {
      console.log('[ANÁLISIS_SEQ] 🆕 NUEVA BÚSQUEDA DETECTADA - Cancelando análisis anterior...');
      
      // NOTIFICAR AL BACKEND para cancelar análisis en progreso
      fetch(`${API_BASE}/analysis/batch/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
        .then(r => r.json())
        .then(data => {
          if (data.ok) {
            console.log('[ANÁLISIS_SEQ] ✅ Backend canceló análisis anterior');
          }
        })
        .catch(err => console.error('[ANÁLISIS_SEQ] Error cancelando:', err));
      
      // CANCELAR polling anterior
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Resetear estado
      lastQueryRef.current = JSON.stringify(lastQuery);
      setPageIndex(0); // Resetear a página 1
      triggerSentRef.current = false;
      pollingCountRef.current = 0;
      setIsPolling(false); // Detener indicador de análisis
      setAllResultados([]); // Limpiar resultados acumulados
      setAnalysisStatus({}); // Limpiar estado de análisis anterior
      cachedIdsRef.current = new Set(); // Resetear caché
      
      console.log('[ANÁLISIS_SEQ] ✅ Estado limpiado. Preparado para nueva búsqueda');
    }

    // Si es la misma búsqueda y ya se envió, no hacer nada
    if (!isNewSearch && triggerSentRef.current) {
      return;
    }

    previousIdsRef.current = currentIds;

    // Preparar datos de la página actual - SOLO IDs no cacheados
    const licitacionesConDocs = licitaciones
      .map(lic => ({
        id: lic.ID_Portafolio || lic.id_del_portafolio,
        nombre: lic.nombre_del_proceso || lic.Nombre_del_Proceso || 'Sin nombre',
        documentos: []
      }))
      .filter(lic => lic.id && !cachedIdsRef.current.has(lic.id)); // Filtrar IDs cacheados
    
    if (licitacionesConDocs.length > 0 && !triggerSentRef.current) {
      console.log(`[ANÁLISIS_SEQ] Página ${pageIndex + 1}: Disparando análisis para ${licitacionesConDocs.length} licitaciones (${cachedIdsRef.current.size} ya en caché)`);
      triggerSentRef.current = true;
      
      setTimeout(() => {
        triggerBatchAnalysis(licitacionesConDocs);
      }, 500);
    } else if (licitacionesConDocs.length === 0 && !triggerSentRef.current) {
      console.log(`[ANÁLISIS_SEQ] Página ${pageIndex + 1}: TODAS las licitaciones están en caché, pasando a siguiente página...`);
      triggerSentRef.current = true;
      setTimeout(() => {
        // Solo pasar a siguiente página si existe
        if (pageIndex < totalPages - 1) {
          triggerSentRef.current = false;
          setPageIndex(prev => prev + 1);
        } else {
          console.log(`[ANÁLISIS_SEQ] ✅ NO HAY MÁS PÁGINAS (total: ${totalPages}). Análisis completado.`);
        }
      }, 1000);
    }
  }, [licitaciones, lastQuery, pageIndex]);

  // 2.5. Acumular resultados de cada página (sin limpiar al cambiar búsqueda)
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0) return;
    
    // Solo acumular si NO es una nueva búsqueda
    const currentQueryStr = JSON.stringify(lastQuery);
    if (lastQueryRef.current === currentQueryStr) {
      // Misma búsqueda, acumular resultados
      if (pageIndex === 0) {
        // Primera página: reemplazar
        setAllResultados(licitaciones);
      } else {
        // Siguientes páginas: agregar sin duplicados
        setAllResultados(prev => {
          const existingIds = new Set(prev.map(l => l.ID_Portafolio || l.id_del_portafolio));
          const newItems = licitaciones.filter(l => {
            const id = l.ID_Portafolio || l.id_del_portafolio;
            return !existingIds.has(id);
          });
          console.log(`[ANÁLISIS_SEQ] Acumulando página ${pageIndex + 1}: ${newItems.length} items nuevos`);
          return [...prev, ...newItems];
        });
      }
    }
  }, [pageIndex, licitaciones]);

  // 3. Polling para consultar estado del batch - IMPORTANTE: NO incluir pageIndex en dependencias
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0 || !triggerSentRef.current) {
      return;
    }
    
    setIsPolling(true);
    pollingCountRef.current = 0;

    const checkBatchStatus = async () => {
      if (pollingCountRef.current >= 60) {
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        // Disparar análisis de siguiente página después de terminar
        setPageIndex(prev => {
          const nextPage = prev + 1;
          // Solo pasar a siguiente página si existe
          if (nextPage < totalPages) {
            console.log(`[ANÁLISIS_SEQ] Página ${prev + 1} completada, preparando página ${nextPage + 1} (total: ${totalPages})`);
            setTimeout(() => {
              triggerSentRef.current = false;
            }, 100);
            return nextPage;
          } else {
            console.log(`[ANÁLISIS_SEQ] ✅ Página ${prev + 1} completada. NO HAY MÁS PÁGINAS (total: ${totalPages}). Análisis completado.`);
            return prev;
          }
        });
        return;
      }

      pollingCountRef.current++;

      const ids = licitaciones.map(l => l.ID_Portafolio || l.id_del_portafolio).filter(Boolean);
      const batchSize = 5;
      let completados = 0;
      let procesando = 0;
      let errores = 0;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await Promise.all(batch.map(async (id) => {
          try {
            const response = await fetch(
              `${API_BASE}/analysis/batch/status/${encodeURIComponent(id)}`,
              { credentials: 'include' }
            );
            
            const data = await response.json();
            
            if (data.ok) {
              const newStatus = {
                estado: data.estado,
                cumple: data.cumple,
                porcentaje: data.porcentaje,
                detalles: data.detalles,
                requisitos: data.requisitos_extraidos,
                error_message: data.error_message
              };
              
              console.log(`[ANÁLISIS_SEQ] Status de ${id}:`, newStatus.estado);
              
              setAnalysisStatus(prev => ({
                ...prev,
                [id]: newStatus
              }));

              if (data.estado === 'completado') completados++;
              else if (data.estado === 'procesando') procesando++;
              else if (data.estado === 'error') errores++;
            }
          } catch (error) {
            // Silenciar errores
          }
        }));
      }

      // Si todos terminaron, pasar a siguiente página
      if (procesando === 0 && (completados + errores) === ids.length) {
        console.log(`[ANÁLISIS_SEQ] Página actual COMPLETADA`);
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Disparar siguiente página después de corto delay
        setPageIndex(prev => {
          const nextPage = prev + 1;
          // Solo pasar a siguiente página si existe
          if (nextPage < totalPages) {
            setTimeout(() => {
              triggerSentRef.current = false;
            }, 100);
            return nextPage;
          } else {
            console.log(`[ANÁLISIS_SEQ] ✅ Todas las páginas analizadas (total: ${totalPages})`);
            return prev;
          }
        });
      }
    };

    const initialTimeout = setTimeout(checkBatchStatus, 15000);
    intervalRef.current = setInterval(checkBatchStatus, 10000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [licitaciones]); // Removido pageIndex de las dependencias

  const triggerBatchAnalysis = async (licitacionesConDocs) => {
    try {
      console.log(`[ANÁLISIS_SEQ] Enviando trigger a backend para ${licitacionesConDocs.length} licitaciones`);
      const response = await fetch(`${API_BASE}/analysis/batch/trigger-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ licitaciones: licitacionesConDocs })
      });
      
      if (!response.ok) {
        console.error(`[ANÁLISIS_SEQ] Error al disparar análisis: HTTP ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log(`[ANÁLISIS_SEQ] Backend respondió:`, data);

      const initialStatus = {};
      licitacionesConDocs.forEach(lic => {
        initialStatus[lic.id] = { estado: 'pendiente' };
      });
      setAnalysisStatus(prev => ({ ...prev, ...initialStatus }));

    } catch (error) {
      console.error(`[ANÁLISIS_SEQ] Error disparando análisis:`, error);
    }
  };

  return { 
    analysisStatus, 
    isPolling,
    pageIndex,
    allResultados  // Retornar todos los resultados de todas las páginas
  };
}
