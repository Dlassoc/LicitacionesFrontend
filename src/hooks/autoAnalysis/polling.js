import { normalizeCumpleValue } from '../../utils/commonHelpers.js';
import { apiGet } from '../../config/httpClient.js';
import { devLog } from '../../utils/devLog.js';
import {
  fetchQueueSummary,
  saveAnalyzedLicitacion,
  saveMatchedLicitacion,
  triggerBatchAnalysis,
} from './services.js';
import {
  getAnalysisFingerprint,
  hasMeaningfulAnalysisEvidence,
  prepararDocumentos,
} from './helpers.js';

const TERMINAL_STATES = new Set(['completado', 'sin_documentos', 'error']);

export async function runPollingTick({
  ids,
  licitaciones,
  analysisStatusRef,
  setAnalysisStatus,
  noDocsBlockedIdsRef,
  savedAnalyzedRef,
  savedAptasRef,
  pollingTickRef,
  pollingStartTimeRef,
  maxPollingTime,
  paginationInfo,
  onPageComplete,
  intervalRef,
  setIsPolling,
  lastNoIniciadoRetryRef,
}) {
  pollingTickRef.current += 1;

  if (Date.now() - pollingStartTimeRef.current > maxPollingTime) {
    devLog('[AUTO_ANALYSIS] ⏱️ Watchdog 5m alcanzado; se mantiene polling para evitar atasco visual');
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

  for (const id of ids) {
    try {
      const knownStatus = analysisStatusRef.current[id];
      const knownEstado = knownStatus?.estado;
      if (knownStatus && TERMINAL_STATES.has(knownEstado)) {
        if (knownStatus.estado === 'completado') completedCount++;
        if (knownStatus.estado === 'sin_documentos') terminalNoDocsCount++;
        if (knownStatus.estado === 'error') terminalErrorCount++;
        continue;
      }

      if (knownStatus && !TERMINAL_STATES.has(knownEstado)) {
        allCompleted = false;
      }

      const licitacionLocal = licitaciones.find(
        (item) => (item.ID_Portafolio || item.id_del_portafolio) === id
      );
      const localFinalStatus = licitacionLocal?._analysisStatus;
      if (localFinalStatus && TERMINAL_STATES.has(localFinalStatus.estado)) {
        if (localFinalStatus.estado === 'completado') completedCount++;
        if (localFinalStatus.estado === 'sin_documentos') terminalNoDocsCount++;
        if (localFinalStatus.estado === 'error') terminalErrorCount++;
        continue;
      }

      if (!id) {
        console.warn('[AUTO_ANALYSIS] ⚠️ ID inválido (vacío o null)');
        continue;
      }

      const encodedId = encodeURIComponent(String(id).trim());
      const data = await apiGet(`/analysis/batch/status/${encodedId}`);

      if (data.ok) {
        const hasPersistedEvidence = hasMeaningfulAnalysisEvidence(data);

        const rawEstado = data.estado;
        const estado =
          ['pendiente', 'no_iniciado', 'procesando'].includes(rawEstado) && hasPersistedEvidence
            ? 'completado'
            : rawEstado;

        if (estado === 'completado') {
          completedCount++;
          devLog(`[AUTO_ANALYSIS] ✅ COMPLETADO: ${id} - cumple=${data.cumple}, porcentaje_cumplimiento=${data.porcentaje_cumplimiento}%`);
        } else if (estado === 'en_proceso' || estado === 'procesando') {
          processingCount++;
          devLog(`[AUTO_ANALYSIS] 🔄 EN PROCESO: ${id}`);
        } else if (estado === 'pendiente') {
          pendingCount++;
          pendingRetryIds.push(id);
          devLog(`[AUTO_ANALYSIS] 🕒 PENDIENTE: ${id}`);
        } else if (estado === 'no_iniciado') {
          notInitiatedCount++;
          noIniciadoIds.push(id);
          devLog(`[AUTO_ANALYSIS] ⏳ NO INICIADO: ${id}`);
        } else if (estado === 'sin_documentos') {
          terminalNoDocsCount++;
          noDocsBlockedIdsRef.current.add(id);
          devLog(`[AUTO_ANALYSIS] 📭 SIN DOCUMENTOS: ${id}`);
        } else if (estado === 'error') {
          terminalErrorCount++;
          devLog(`[AUTO_ANALYSIS]  ERROR: ${id} - ${data.error_message || 'sin detalle'}`);
        }

        setAnalysisStatus(prev => {
          const prevStatus = prev[id];
          const prevIsFinal = prevStatus && prevStatus.estado === 'completado' && typeof prevStatus.cumple === 'boolean';
          const newIsFinal = estado === 'completado' && (typeof data.cumple === 'boolean' || typeof data.cumple === 'number' || hasPersistedEvidence);

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
          devLog(`[AUTO_ANALYSIS] Estado actualizado para ${id}:`, updated[id]);
          return updated;
        });

        if (TERMINAL_STATES.has(estado)) {
          const licitacion = licitacionLocal || licitaciones.find(l => (l.ID_Portafolio || l.id_del_portafolio) === id);
          if (licitacion) {
            const savePayload = {
              ...data,
              estado,
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

            const cumpleVerdadero = data.cumple === true || (typeof data.cumple === 'number' && data.cumple > 0);
            if (cumpleVerdadero && !savedAptasRef.current.has(id)) {
              savedAptasRef.current.add(id);
              saveMatchedLicitacion(licitacion, data).catch(() => {
                savedAptasRef.current.delete(id);
              });
            }
          }
        }

        if (!TERMINAL_STATES.has(estado)) {
          allCompleted = false;
        }
      }
    } catch (error) {
      allCompleted = false;

      if (error.message.includes('Failed to fetch')) {
        console.error(`[AUTO_ANALYSIS]  Error de red para ${id}: backend no responde. ¿Está ejecutándose?`, error);
      } else if (error instanceof SyntaxError) {
        console.error(`[AUTO_ANALYSIS]  Respuesta JSON inválida para ${id}:`, error.message);
      } else {
        console.error(`[AUTO_ANALYSIS]  Error chequeando ${id}:`, error.message);
      }
    }
  }

  devLog(
    `[AUTO_ANALYSIS] 📈 Progreso: ${completedCount} completados, ` +
    `${terminalNoDocsCount} sin_documentos, ${terminalErrorCount} error, ` +
    `${processingCount} en proceso, ${pendingCount} pendientes, ${notInitiatedCount} no iniciados`
  );

  if (pollingTickRef.current % 4 === 0) {
    const queueSummary = await fetchQueueSummary(5);
    if (queueSummary) {
      const counts = queueSummary.counts || {};
      const pendientes = counts.pendiente ?? 0;
      const procesando = counts.procesando ?? 0;
      const completado = counts.completado ?? 0;
      const sinDocumentos = counts.sin_documentos ?? 0;
      const error = counts.error ?? 0;
      devLog(
        `[AUTO_ANALYSIS] 🧭 Cola backend: ` +
          `pendiente=${pendientes}, procesando=${procesando}, completado=${completado}, ` +
          `sin_documentos=${sinDocumentos}, error=${error}, oldest_pending_minutes=${queueSummary.oldest_pending_minutes}`
      );
    }
  }

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
        devLog(
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

  if (allCompleted) {
    devLog('[AUTO_ANALYSIS] ✅ Todos los análisis de esta página completados');

    const { offset = 0, limit = 21, total = 0 } = paginationInfo;
    const esUltimaPagina = offset + limit >= total;

    if (esUltimaPagina) {
      devLog('[AUTO_ANALYSIS] 🏁 ÚLTIMA PÁGINA ANALIZADA - Deteniendo análisis completamente');
      setIsPolling(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else if (onPageComplete && typeof onPageComplete === 'function') {
      devLog(`
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

      setIsPolling(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }
}
