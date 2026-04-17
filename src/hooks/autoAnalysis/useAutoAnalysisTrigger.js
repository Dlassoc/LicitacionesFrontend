import { useEffect } from 'react';
import { normalizeLicitacionId } from '../../utils/commonHelpers.js';
import { devLog } from '../../utils/devLog.js';
import { triggerBatchAnalysis } from './services.js';
import { buildTriggerPayload, getTriggerableIds } from './trigger.js';

export function useAutoAnalysisTrigger({
  enabled,
  licitaciones,
  licitacionIdsStr,
  isLoadingExisting,
  existingLoadStateRef,
  isLoadingExistingRef,
  analysisStatusRef,
  terminalStates,
  lastTriggerRef,
  noDocsBlockedIdsRef,
  paginationInfo,
  prepararDocumentos,
  triggerFailedRef,
}) {
  useEffect(() => {
    if (!enabled) {
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
      devLog('[AUTO_ANALYSIS] ⏳ Esperando a que carguen análisis previos antes de disparar trigger');
      return;
    }

    const ids = licitaciones
      .map(l => normalizeLicitacionId(l.ID_Portafolio || l.id_del_portafolio))
      .filter(Boolean);

    if (ids.length === 0) return;

    const newIds = getTriggerableIds({
      ids,
      analysisStatusRef,
      terminalStates,
      lastTriggerIds: lastTriggerRef.current,
      noDocsBlockedIds: noDocsBlockedIdsRef.current,
    });

    if (newIds.length === 0) {
      devLog('[AUTO_ANALYSIS] ✅ Todos los IDs ya tienen análisis o fueron triggereados');
      return;
    }

    const MAX_TRIGGER_PER_RUN = 12;
    const idsToTrigger = newIds.slice(0, MAX_TRIGGER_PER_RUN);

    const payload = buildTriggerPayload({
      idsToTrigger,
      licitaciones,
      prepararDocumentos,
    });

    if (payload.length === 0) return;

    devLog(`[AUTO_ANALYSIS] Disparando analisis para ${payload.length} licitaciones nuevas`);

    triggerBatchAnalysis(payload)
      .then(result => {
        if (result.ok) {
          if (result.timeout) {
            devLog(`[AUTO_ANALYSIS] ⏳ Trigger sin confirmacion HTTP (timeout local). Se mantiene polling para ${payload.length} licitaciones`);
          } else {
            devLog(`[AUTO_ANALYSIS] Trigger exitoso para ${payload.length} licitaciones`);
          }
          lastTriggerRef.current = [...lastTriggerRef.current, ...payload.map(p => p.id)];
          triggerFailedRef.current = false;
        }
      })
      .catch(error => {
        console.warn('[AUTO_ANALYSIS] Trigger fallido:', error.message);
        triggerFailedRef.current = true;
      });
  }, [
    enabled,
    licitacionIdsStr,
    isLoadingExisting,
    terminalStates,
    paginationInfo?.offset,
    paginationInfo?.limit,
    analysisStatusRef,
    existingLoadStateRef,
    isLoadingExistingRef,
    lastTriggerRef,
    licitaciones,
    noDocsBlockedIdsRef,
    prepararDocumentos,
    triggerFailedRef,
  ]);
}
