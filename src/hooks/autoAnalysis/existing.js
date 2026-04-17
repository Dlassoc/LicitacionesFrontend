import { normalizeCumpleValue } from '../../utils/commonHelpers.js';
import { devLog } from '../../utils/devLog.js';

export function mergeExistingAnalysis({
  existingData,
  setAnalysisStatus,
  analysisStatusRef,
  noDocsBlockedIdsRef,
}) {
  const completedIds = [];
  const aptasIds = [];
  const normalizedEntries = [];

  Object.entries(existingData || {}).forEach(([id, analysis]) => {
    const estado = String(analysis?.estado || '').toLowerCase();
    const hasRequisitos =
      analysis?.requisitos &&
      typeof analysis.requisitos === 'object' &&
      Object.keys(analysis.requisitos).length > 0;
    const hasDetalles =
      analysis?.detalles &&
      typeof analysis.detalles === 'object' &&
      Object.keys(analysis.detalles).length > 0;
    const hasEvidence = hasRequisitos || hasDetalles || (analysis?.cumple !== undefined && analysis?.cumple !== null);
    const isTerminal = ['completado', 'sin_documentos', 'error'].includes(estado);

    if (!analysis || (!isTerminal && !hasEvidence)) {
      return;
    }

    const normalized = {
      estado: isTerminal ? estado : 'completado',
      cumple: normalizeCumpleValue(analysis.cumple),
      porcentaje_cumplimiento: analysis.porcentaje || 0,
      detalles: analysis.detalles,
      requisitos_extraidos: analysis.requisitos,
    };

    normalizedEntries.push([id, normalized]);
    completedIds.push(id);

    if (estado === 'sin_documentos') {
      noDocsBlockedIdsRef.current.add(id);
    }
    if (analysis.cumple === true || (typeof analysis.cumple === 'number' && analysis.cumple > 0)) {
      aptasIds.push(id);
    }

    devLog(`[AUTO_ANALYSIS] 📦 Pre-cargado: ${id} - cumple=${analysis.cumple}`);
  });

  if (normalizedEntries.length > 0) {
    setAnalysisStatus(prev => {
      const updated = { ...prev };
      normalizedEntries.forEach(([id, normalized]) => {
        updated[id] = normalized;
      });
      if (analysisStatusRef && analysisStatusRef.current) {
        analysisStatusRef.current = updated;
      }
      devLog(
        `[AUTO_ANALYSIS] ✅ Estado actualizado con ${normalizedEntries.length} análisis pre-cargados. Total en analysisStatus: ${Object.keys(updated).length}`
      );
      return updated;
    });
  }

  return { completedIds, aptasIds };
}
