import { normalizeLicitacionId } from '../../utils/commonHelpers.js';
import { devLog } from '../../utils/devLog.js';

export function getTriggerableIds({
  ids,
  analysisStatusRef,
  terminalStates,
  lastTriggerIds,
  noDocsBlockedIds,
}) {
  return ids.filter(id => {
    const status = analysisStatusRef.current[id];
    const estado = String(status?.estado || '').toLowerCase();
    const isRetryableError = estado === 'error' || estado === 'pendiente_reintento';
    const hasKnownStatus = Boolean(status && estado);
    const hasFinalStatus = terminalStates.has(estado) && !isRetryableError;
    const alreadyTriggered = lastTriggerIds.includes(id);
    const effectiveTriggered = isRetryableError ? false : alreadyTriggered;
    const noDocsBlocked = noDocsBlockedIds.has(id);

    if (noDocsBlocked) {
      devLog(`[AUTO_ANALYSIS] ⏭️ Saltando ${id} - bloqueado por estado sin_documentos`);
      return false;
    }

    if (hasKnownStatus && estado !== 'no_iniciado' && !isRetryableError) {
      devLog(`[AUTO_ANALYSIS] ⏭️ Saltando ${id} - estado existente en BD/polling: ${estado}`);
      return false;
    }

    if (hasFinalStatus) {
      devLog(`[AUTO_ANALYSIS] ⏭️ Saltando ${id} - ya tiene estado terminal: ${estado}`);
    }

    return !effectiveTriggered && !hasFinalStatus;
  });
}

export function buildTriggerPayload({ idsToTrigger, licitaciones, prepararDocumentos }) {
  return idsToTrigger
    .map((id) => {
      if (!licitaciones || !Array.isArray(licitaciones)) {
        console.warn('[AUTO_ANALYSIS] ⚠️ licitaciones no es array válido:', licitaciones);
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
          documentos: prepararDocumentos(lic),
        };
      } catch (error) {
        console.error(`[AUTO_ANALYSIS]  Error preparando payload para ${id}:`, error);
        return null;
      }
    })
    .filter(Boolean);
}
