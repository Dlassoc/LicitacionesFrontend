// src/hooks/useAutoAnalysis.js
import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

/**
 * Hook para análisis automático de licitaciones en background.
 * Analiza secuencialmente: página 1 → página 2 → página 3
 * 
 * @param {Array} licitaciones - Array de objetos con ID_Portafolio (página actual)
 * @param {Object} paginationInfo - Info de paginación {lastQuery, offset, limit, total}
 * @returns {Object} { analysisStatus, isPolling }
 */
export function useAutoAnalysis(licitaciones = [], paginationInfo = {}) {
  const [analysisStatus, setAnalysisStatus] = useState({});
  const [isPolling, setIsPolling] = useState(false);
  const [pageIndex, setPageIndex] = useState(0); // 0=página 1, 1=página 2, 2=página 3
  const intervalRef = useRef(null);
  const pollingCountRef = useRef(0);
  const triggerSentRef = useRef(false);
  const previousIdsRef = useRef([]);
  const lastQueryRef = useRef(null);
  const cachedIdsRef = useRef(new Set()); // Track IDs that are already cached

  const { lastQuery, offset, limit, total } = paginationInfo;

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
            
            if (data.ok && data.estado === 'completado') {
              newCachedIds.add(id);
              const newStatus = {
                estado: data.estado,
                cumple: data.cumple,
                porcentaje: data.porcentaje,
                detalles: data.detalles,
                requisitos: data.requisitos_extraidos,
                error_message: data.error_message
              };
              
              console.log(`[AUTO_ANALYSIS] CACHÉ ENCONTRADO para ${id}:`, data.estado);
              
              setAnalysisStatus(prev => ({
                ...prev,
                [id]: newStatus
              }));
            }
          } catch (error) {
            // Silenciar errores
          }
        }));
      }

      cachedIdsRef.current = newCachedIds;
      console.log(`[AUTO_ANALYSIS] Caché cargado: ${newCachedIds.size} de ${ids.length} licitaciones ya analizadas`);
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
      console.log('[ANÁLISIS_SEQ] Nueva búsqueda detectada, iniciando análisis secuencial');
      lastQueryRef.current = JSON.stringify(lastQuery);
      setPageIndex(0); // Resetear a página 1
      triggerSentRef.current = false;
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
        if (pageIndex < 2) {
          triggerSentRef.current = false;
          setPageIndex(prev => prev + 1);
        }
      }, 1000);
    }
  }, [licitaciones, lastQuery, pageIndex]);

  // 1.5. Cargar caché inicial
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0) return;

    const ids = licitaciones
      .map(lic => lic.ID_Portafolio || lic.id_del_portafolio)
      .filter(Boolean);

    if (ids.length === 0) return;

    const checkCachedStatus = async () => {
      const batchSize = 5;
      for (let i = 0; i < Math.min(ids.length, 10); i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await Promise.all(batch.map(async (id) => {
          try {
            const response = await fetch(
              `${API_BASE}/analysis/batch/status/${encodeURIComponent(id)}`,
              { credentials: 'include' }
            );
            
            const data = await response.json();
            
            if (data.ok && data.estado === 'completado') {
              const newStatus = {
                estado: data.estado,
                cumple: data.cumple,
                porcentaje: data.porcentaje,
                detalles: data.detalles,
                requisitos: data.requisitos_extraidos,
                error_message: data.error_message
              };
              
              setAnalysisStatus(prev => ({
                ...prev,
                [id]: newStatus
              }));
            }
          } catch (error) {
            // Silenciar errores
          }
        }));
      }
    };

    checkCachedStatus();
  }, [licitaciones]);

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
          if (prev < 2) {
            console.log(`[ANÁLISIS_SEQ] Página ${prev + 1} completada, preparando página ${prev + 2}`);
            setTimeout(() => {
              triggerSentRef.current = false;
            }, 100);
          }
          return prev + 1;
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
          if (prev < 2) {
            setTimeout(() => {
              triggerSentRef.current = false;
            }, 100);
          }
          return prev + 1;
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
    pageIndex
  };
}
