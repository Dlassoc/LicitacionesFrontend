// src/hooks/useAutoAnalysis.js
import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

/**
 * Hook para análisis automático de licitaciones en background.
 * 
 * Uso:
 * const { analysisStatus, triggerAnalysis } = useAutoAnalysis(licitaciones);
 * 
 * @param {Array} licitaciones - Array de objetos con ID_Portafolio
 * @returns {Object} { analysisStatus, triggerAnalysis, isPolling }
 */
export function useAutoAnalysis(licitaciones = []) {
  const [analysisStatus, setAnalysisStatus] = useState({});
  const [triggerSent, setTriggerSent] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);
  const pollingCountRef = useRef(0);
  const MAX_POLLING_ATTEMPTS = 40; // 40 * 5s = 3.3 minutos máximo
  const POLLING_INTERVAL = 5000; // 5 segundos entre consultas

  // 1. Trigger análisis batch cuando lleguen resultados nuevos
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0) {
      setTriggerSent(false);
      return;
    }

    if (triggerSent) return;

    // Preparar datos con documentos - TODAS las licitaciones
    const licitacionesConDocs = licitaciones
      .map(lic => ({
        id: lic.ID_Portafolio || lic.id_del_portafolio,
        nombre: lic.nombre_del_proceso || lic.Nombre_del_Proceso || 'Sin nombre',
        documentos: []  // Por ahora vacío, se obtendrán en backend si es necesario
      }))
      .filter(lic => lic.id);
    
    if (licitacionesConDocs.length > 0) {
      console.log('[AUTO-ANALYSIS] Analizando automáticamente todas las licitaciones:', licitacionesConDocs.length);
      triggerBatchAnalysis(licitacionesConDocs);
      setTriggerSent(true);
    }
  }, [licitaciones, triggerSent]);

  // 2. Polling para consultar estado del batch y actualizar resultados
  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0 || !triggerSent) {
      return;
    }

    console.log('[AUTO-ANALYSIS] ✅ Batch trigger enviado. Iniciando polling cada 10s...');
    
    setIsPolling(true);
    pollingCountRef.current = 0;

    const checkBatchStatus = async () => {
      // Máximo 60 intentos (10 minutos)
      if (pollingCountRef.current >= 60) {
        console.log('[AUTO-ANALYSIS] ⏱️ Tiempo máximo de espera alcanzado');
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        return;
      }

      pollingCountRef.current++;
      console.log(`[AUTO-ANALYSIS] 🔄 Polling #${pollingCountRef.current} - Consultando estado de ${licitaciones.length} licitaciones...`);

      // Consultar estado de todas las licitaciones (batch de 5)
      const ids = licitaciones.map(l => l.ID_Portafolio).filter(Boolean);
      const batchSize = 5;
      let completados = 0;
      let procesando = 0;
      let errores = 0;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await Promise.all(batch.map(async (id) => {
          try {
            const response = await fetch(
              `${API_BASE}/analysis/status/${encodeURIComponent(id)}`,
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
              
              // Actualizar estado
              setAnalysisStatus(prev => ({
                ...prev,
                [id]: newStatus
              }));

              // Contar estados
              if (data.estado === 'completado') completados++;
              else if (data.estado === 'procesando') procesando++;
              else if (data.estado === 'error') errores++;
            }
          } catch (error) {
            console.error(`[AUTO-ANALYSIS] Error checking ${id}:`, error);
          }
        }));
      }

      console.log(`[AUTO-ANALYSIS] 📊 Estado: ${completados} completados, ${procesando} procesando, ${errores} errores`);

      // Si todas terminaron, detener polling
      if (procesando === 0 && (completados + errores) === ids.length) {
        console.log('[AUTO-ANALYSIS] ✅ Todos los análisis completados');
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    };

    // Primera consulta después de 15 segundos (dar tiempo al backend)
    console.log('[AUTO-ANALYSIS] ⏱️ Esperando 15s antes de iniciar polling...');
    const initialTimeout = setTimeout(checkBatchStatus, 15000);

    // Luego cada 10 segundos
    intervalRef.current = setInterval(checkBatchStatus, 10000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [licitaciones, triggerSent]);

  const triggerBatchAnalysis = async (licitacionesConDocs) => {
    try {
      console.log('[AUTO-ANALYSIS] Triggering batch for:', licitacionesConDocs.length, 'licitaciones');
      console.log('[AUTO-ANALYSIS] API URL:', `${API_BASE}/analysis/trigger-batch`);
      console.log('[AUTO-ANALYSIS] Payload:', { licitaciones: licitacionesConDocs });
      
      const response = await fetch(`${API_BASE}/analysis/trigger-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ licitaciones: licitacionesConDocs })
      });
      
      console.log('[AUTO-ANALYSIS] Response status:', response.status);
      const data = await response.json();
      console.log('[AUTO-ANALYSIS] Batch triggered:', data);

      // Marcar todas como pendientes inicialmente
      const initialStatus = {};
      licitacionesConDocs.forEach(lic => {
        initialStatus[lic.id] = { estado: 'pendiente' };
      });
      setAnalysisStatus(prev => ({ ...prev, ...initialStatus }));

    } catch (error) {
      console.error('[AUTO-ANALYSIS] Error triggering batch:', error);
    }
  };

  const checkAnalysisStatus = async (idPortafolio) => {
    try {
      const response = await fetch(
        `${API_BASE}/analysis/status/${encodeURIComponent(idPortafolio)}`,
        { credentials: 'include' }
      );
      
      const data = await response.json();
      
      console.log(`[AUTO-ANALYSIS] Status for ${idPortafolio}:`, data);
      
      if (data.ok) {
        const newStatus = {
          estado: data.estado,
          cumple: data.cumple,
          porcentaje: data.porcentaje,
          detalles: data.detalles,
          requisitos: data.requisitos_extraidos,
          error_message: data.error_message
        };
        
        console.log(`[AUTO-ANALYSIS] Updating status for ${idPortafolio}:`, newStatus);
        
        setAnalysisStatus(prev => ({
          ...prev,
          [idPortafolio]: newStatus
        }));
      }
    } catch (error) {
      console.error(`[AUTO-ANALYSIS] Error checking ${idPortafolio}:`, error);
    }
  };

  const manualTrigger = useCallback((ids) => {
    setTriggerSent(false);
    setTimeout(() => {
      triggerBatchAnalysis(ids);
      setTriggerSent(true);
    }, 100);
  }, []);

  return { 
    analysisStatus, 
    triggerAnalysis: manualTrigger,
    isPolling 
  };
}
