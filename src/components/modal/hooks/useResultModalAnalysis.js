import { useEffect, useMemo } from 'react';
import { useBatchAnalysisStatus } from '../../../hooks/useBatchAnalysisStatus.js';
import { devLog } from '../../../utils/devLog.js';

export function useResultModalAnalysis({ open, idPortafolio, analysisStatus }) {
  const previousAnalysis = useMemo(() => {
    if (!analysisStatus || !idPortafolio) return null;

    const status = analysisStatus[idPortafolio];
    if (status && status.estado === 'completado') {
      // Hook state persists requirements under `requisitos`.
      const requisitosData = status.requisitos || status.requisitos_extraidos || {};
      const hasData = Object.keys(requisitosData).length > 0;

      if (!hasData) {
        console.warn(`[RESULT_MODAL] ⚠️ previousAnalysis tiene requisitosData VACÍA para ${idPortafolio}:`, {
          tiene_requisitos: !!status.requisitos,
          tiene_requisitos_extraidos: !!status.requisitos_extraidos,
          requisitos_keys: status.requisitos ? Object.keys(status.requisitos) : [],
          requisitos_extraidos_keys: status.requisitos_extraidos ? Object.keys(status.requisitos_extraidos) : [],
          status_keys: Object.keys(status),
        });
      }

      return {
        cumple: status.cumple,
        porcentaje_cumplimiento: status.porcentaje_cumplimiento || 0,
        detalles: status.detalles,
        requisitos_extraidos: requisitosData,
        hasRealData: hasData,
      };
    }

    return null;
  }, [analysisStatus, idPortafolio]);

  useEffect(() => {
    if (open && idPortafolio && analysisStatus) {
      const status = analysisStatus[idPortafolio];
      devLog(
        `[RESULT_MODAL] 🔍 idPortafolio=${idPortafolio}, status exists=${!!status}, estado=${status?.estado}, requisitos keys=${status?.requisitos ? Object.keys(status.requisitos) : 'none'}`
      );
      if (!status) {
        devLog('[RESULT_MODAL] ⚠️ ID not found in analysisStatus. Available keys:', Object.keys(analysisStatus).slice(0, 10));
      }
    }
  }, [open, idPortafolio, analysisStatus]);

  const { status: batchStatus } = useBatchAnalysisStatus(idPortafolio);

  const isBatchProcessing = batchStatus?.estado === 'pendiente' || batchStatus?.estado === 'procesando';
  const batchCompleted = batchStatus?.estado === 'completado';
  const batchErrored = batchStatus?.estado === 'error';

  const analyzing = previousAnalysis?.hasRealData ? false : isBatchProcessing;
  const analyzed = previousAnalysis?.hasRealData ? true : batchCompleted;
  const analysisError = previousAnalysis?.hasRealData ? null : (batchErrored ? batchStatus.error_message : null);
  const analysisResults = previousAnalysis || (batchCompleted ? batchStatus : null);

  return {
    previousAnalysis,
    analyzing,
    analyzed,
    analysisError,
    analysisResults,
  };
}
