// src/hooks/useAutoAnalysis.js
import { useState, useEffect, useRef, useMemo } from 'react';
import { normalizeLicitacionId } from '../utils/commonHelpers.js';
import { devLog } from '../utils/devLog.js';
import {
  prepararDocumentos,
} from './autoAnalysis/helpers.js';
import { runPollingTick } from './autoAnalysis/polling.js';
import { useAutoAnalysisBootstrap } from './autoAnalysis/useAutoAnalysisBootstrap.js';
import { useAutoAnalysisTrigger } from './autoAnalysis/useAutoAnalysisTrigger.js';

const LIVE_AUTO_ANALYSIS_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  String(import.meta.env.VITE_ENABLE_LIVE_AUTO_ANALYSIS ?? 'true').toLowerCase()
);

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

  // Mantener ref sincronizada en cada render evita carreras entre bootstrap/trigger.
  analysisStatusRef.current = analysisStatus;

  useAutoAnalysisBootstrap({
    licitaciones,
    licitacionIdsStr,
    paginationInfo,
    setAllResultados,
    setAnalysisStatus,
    setIsLoadingExisting,
    setIsPolling,
    refs: {
      lastLicitacionIdsRef,
      lastTriggerRef,
      lastQueryRef,
      triggerFailedRef,
      savedAptasRef,
      savedAnalyzedRef,
      noDocsBlockedIdsRef,
      analysisStatusRef,
      isLoadingExistingRef,
      existingLoadStateRef,
    },
  });

  useAutoAnalysisTrigger({
    enabled: LIVE_AUTO_ANALYSIS_ENABLED,
    licitaciones,
    licitacionIdsStr,
    isLoadingExisting,
    existingLoadStateRef,
    isLoadingExistingRef,
    analysisStatusRef,
    terminalStates: TERMINAL_STATES,
    lastTriggerRef,
    noDocsBlockedIdsRef,
    paginationInfo,
    prepararDocumentos,
    triggerFailedRef,
  });

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
    
    devLog(`[AUTO_ANALYSIS] 📊 POLLING: Iniciando para ${ids.length} licitaciones`);
    devLog(`    📄 Página: ${Math.floor(offset / limit) + 1} de ${Math.ceil(total / limit)}`);
    
    setIsPolling(true);
    pollingStartTimeRef.current = Date.now();

    const checkStatus = async () => {
      if (isCheckStatusRunningRef.current) {
        devLog('[AUTO_ANALYSIS] ⏭️ Polling anterior aun en curso; se omite este tick para evitar solape');
        return;
      }

      isCheckStatusRunningRef.current = true;

      try {
        await runPollingTick({
          ids,
          licitaciones,
          analysisStatusRef,
          setAnalysisStatus,
          noDocsBlockedIdsRef,
          savedAnalyzedRef,
          savedAptasRef,
          pollingTickRef,
          pollingStartTimeRef,
          maxPollingTime: MAX_POLLING_TIME,
          paginationInfo,
          onPageComplete,
          intervalRef,
          setIsPolling,
          lastNoIniciadoRetryRef,
        });
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
