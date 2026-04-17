import { useEffect } from 'react';
import { normalizeLicitacionId } from '../../utils/commonHelpers.js';
import { devLog } from '../../utils/devLog.js';
import { loadExistingAnalysis } from './services.js';
import { mergeExistingAnalysis } from './existing.js';

export function useAutoAnalysisBootstrap({
  licitaciones,
  licitacionIdsStr,
  paginationInfo,
  setAllResultados,
  setAnalysisStatus,
  setIsLoadingExisting,
  setIsPolling,
  refs,
}) {
  const {
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
  } = refs;

  useEffect(() => {
    const currentQuery = paginationInfo?.lastQuery;
    const currentQueryKey = currentQuery ? JSON.stringify(currentQuery) : '';

    if (lastQueryRef.current !== currentQueryKey) {
      lastQueryRef.current = currentQueryKey;
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

      if (currentQuery) {
        const totalPaginas = Math.ceil((paginationInfo?.total || 0) / (paginationInfo?.limit || 21));
        devLog('[AUTO_ANALYSIS] 📋 Nueva búsqueda:');
        devLog(`    📊 Total resultados: ${paginationInfo?.total || 0}`);
        devLog(`    📄 Páginas totales: ${totalPaginas}`);
        devLog(`    🔍 Query: ${JSON.stringify(currentQuery)}`);
        devLog(`    📍 Parámetros: offset=${paginationInfo?.offset || 0}, limit=${paginationInfo?.limit || 21}`);
      }
    }
  }, [
    paginationInfo?.lastQuery,
    paginationInfo?.limit,
    paginationInfo?.offset,
    paginationInfo?.total,
    existingLoadStateRef,
    isLoadingExistingRef,
    lastLicitacionIdsRef,
    lastQueryRef,
    lastTriggerRef,
    noDocsBlockedIdsRef,
    savedAnalyzedRef,
    savedAptasRef,
    setAllResultados,
    setAnalysisStatus,
    triggerFailedRef,
  ]);

  useEffect(() => {
    if (!licitaciones || licitaciones.length === 0) return;

    const ids = licitaciones
      .map(l => normalizeLicitacionId(l.ID_Portafolio || l.id_del_portafolio))
      .filter(id => id && id.length > 0);

    if (ids.length === 0) return;

    existingLoadStateRef.current = { key: licitacionIdsStr, done: false };
    isLoadingExistingRef.current = true;
    setIsLoadingExisting(true);
    devLog(
      `[AUTO_ANALYSIS] 🔍 Solicitando análisis previos para ${ids.length} licitaciones:`,
      ids.slice(0, 3).join(', '),
      '...'
    );

    loadExistingAnalysis(ids)
      .then(existingData => {
        if (Object.keys(existingData).length > 0) {
          devLog(`[AUTO_ANALYSIS] 🎯 ✅ Encontrados ${Object.keys(existingData).length} análisis previos en BD`);
          const { completedIds, aptasIds } = mergeExistingAnalysis({
            existingData,
            setAnalysisStatus,
            analysisStatusRef,
            noDocsBlockedIdsRef,
          });

          if (completedIds.length > 0) {
            lastTriggerRef.current = Array.from(new Set([...lastTriggerRef.current, ...completedIds]));
          }
          if (aptasIds.length > 0) {
            aptasIds.forEach(id => savedAptasRef.current.add(id));
          }
        } else {
          devLog('[AUTO_ANALYSIS] ℹ️ No se encontraron análisis previos en BD para estos IDs');
        }
      })
      .catch(err => {
        console.error('[AUTO_ANALYSIS] ⚠️ Error cargando análisis previos:', err.message);
      })
      .finally(() => {
        existingLoadStateRef.current = { key: licitacionIdsStr, done: true };
        isLoadingExistingRef.current = false;
        setIsLoadingExisting(false);
        devLog('[AUTO_ANALYSIS] 🔓 Carga de análisis existentes completada - trigger desbloqueado');
      });
  }, [
    licitacionIdsStr,
    licitaciones,
    existingLoadStateRef,
    isLoadingExistingRef,
    lastTriggerRef,
    noDocsBlockedIdsRef,
    savedAptasRef,
    setAnalysisStatus,
    setIsLoadingExisting,
  ]);

  useEffect(() => {
    if (licitaciones && licitaciones.length > 0) {
      setAllResultados(prev => {
        const existingIds = new Set(prev.map(l => l.ID_Portafolio || l.id_del_portafolio));
        const newLicitaciones = licitaciones.filter(
          l => !existingIds.has(l.ID_Portafolio || l.id_del_portafolio)
        );
        return [...prev, ...newLicitaciones];
      });
    }
  }, [licitacionIdsStr, licitaciones, setAllResultados]);

  useEffect(() => {
    devLog(`[AUTO_ANALYSIS] 📄 Offset cambió a: ${paginationInfo?.offset || 0} - Limpiando trigger cache para nueva página`);
    lastTriggerRef.current = [];
    setIsPolling(false);
  }, [lastTriggerRef, paginationInfo?.offset, setIsPolling]);
}
