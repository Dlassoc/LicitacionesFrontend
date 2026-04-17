import { normalizeCumpleValue } from '../../utils/commonHelpers.js';

export const hasFinancialIndicators = (requisitos = {}) => {
  const indicadoresFin = requisitos.indicadores_financieros;
  const matrices = requisitos.matrices || indicadoresFin?.matrices;

  if (matrices && typeof matrices === 'object' && Object.keys(matrices).length > 0) {
    return true;
  }

  if (indicadoresFin && typeof indicadoresFin === 'object') {
    const keys = Object.keys(indicadoresFin).filter((k) => k !== 'matrices');
    return keys.length > 0;
  }

  return false;
};

export const hasExperienceEvidence = (requisitos = {}) => {
  const experiencia = requisitos.experiencia_requerida;
  if (!experiencia) return false;

  if (typeof experiencia === 'string') {
    return experiencia.trim().length > 0;
  }

  if (typeof experiencia === 'object') {
    const texto = experiencia.experiencia_requerida || experiencia.texto || experiencia.descripcion;
    if (typeof texto === 'string' && texto.trim().length > 0) {
      return true;
    }
    return Object.keys(experiencia).length > 0;
  }

  return Boolean(experiencia);
};

export const hasUNSPSCCodes = (requisitos = {}) => {
  return Array.isArray(requisitos?.codigos_unspsc) && requisitos.codigos_unspsc.length > 0;
};

export const isBasePropiaByExperience = (status) => {
  if (!status || typeof status !== 'object') return false;

  const requisitos = status.requisitos && typeof status.requisitos === 'object' ? status.requisitos : {};
  const detalles = status.detalles && typeof status.detalles === 'object' ? status.detalles : {};

  if (detalles.regla === 'base_propia_experiencia') {
    return true;
  }

  const hasExp = hasExperienceEvidence(requisitos);
  const hasIndicators = hasFinancialIndicators(requisitos);
  const hasUnspsc = hasUNSPSCCodes(requisitos);

  return (hasExp || hasUnspsc) && !hasIndicators;
};

export const getStatusForItem = (idPortafolio, item, analysisStatus) => {
  if (item._analysisStatus) {
    return item._analysisStatus;
  }

  if (item.cumple !== undefined) {
    return {
      estado: 'completado',
      cumple: normalizeCumpleValue(item.cumple),
      porcentaje: item.porcentaje_cumplimiento || 0,
      requisitos: item.requisitos_extraidos || {},
    };
  }

  const pollingStatus = analysisStatus[idPortafolio];
  if (pollingStatus) {
    return pollingStatus;
  }

  return null;
};

export const categorizeResultados = ({ resultados, analysisStatus, isDiscarded, debugLog }) => {
  const cumple = [];
  const noCumple = [];
  const sinDocumentos = [];
  const sinAnalizar = [];
  const sinRequisitos = [];

  resultados?.forEach((item, itemIdx) => {
    const idPortafolio = item.ID_Portafolio || item.id_del_portafolio || item.referencia;
    debugLog(
      `[RESULTS_PANEL] [${itemIdx}] ${idPortafolio} | from_cache=${item.from_cache} | _fromMatched=${item._fromMatched} | _fromAnalyzed=${item._fromAnalyzed}`
    );

    if (isDiscarded && typeof isDiscarded === 'function' && isDiscarded(idPortafolio)) {
      debugLog('[RESULTS_PANEL]  DESCARTADA');
      return;
    }

    const status = getStatusForItem(idPortafolio, item, analysisStatus);

    if (status) {
      const cumpleValue = normalizeCumpleValue(status.cumple);

      if (cumpleValue === true) {
        debugLog(`[RESULTS_PANEL] ✅ CUMPLE | ${status.porcentaje || 0}%`);
        cumple.push(item);
      } else if (cumpleValue === false) {
        debugLog(`[RESULTS_PANEL]  NO CUMPLE | ${status.porcentaje || 0}%`);
        noCumple.push(item);
      } else if (status.estado === 'sin_documentos') {
        debugLog('[RESULTS_PANEL] 📄 SIN DOCUMENTOS');
        sinDocumentos.push(item);
      } else if (status.estado === 'completado') {
        const requisitos = status.requisitos && typeof status.requisitos === 'object' ? status.requisitos : {};
        const hasIndicators = hasFinancialIndicators(requisitos);

        if (hasIndicators) {
          if (cumpleValue === true) {
            debugLog('[RESULTS_PANEL] ✅ CUMPLE (indicadores concuerdan con usuario)');
            cumple.push(item);
          } else if (cumpleValue === false) {
            debugLog('[RESULTS_PANEL]  NO CUMPLE (indicadores NO concuerdan)');
            noCumple.push(item);
          } else {
            debugLog('[RESULTS_PANEL]  NO CUMPLE (indicadores sin evaluación claro)');
            noCumple.push(item);
          }
        } else if (isBasePropiaByExperience(status)) {
          debugLog('[RESULTS_PANEL] ✅ CUMPLE (base propia experiencia)');
          cumple.push(item);
        } else {
          debugLog('[RESULTS_PANEL] ℹ️ COMPLETADO SIN VEREDICTO FINANCIERO');
          sinRequisitos.push(item);
        }
      } else {
        debugLog(`[RESULTS_PANEL] ⏳ EN ANÁLISIS (estado=${status.estado})`);
        sinAnalizar.push(item);
      }
    } else {
      debugLog('[RESULTS_PANEL] ⏳ SIN ANALIZAR');
      sinAnalizar.push(item);
    }
  });

  return { cumple, noCumple, sinDocumentos, sinAnalizar, sinRequisitos };
};

export const matchesPreferredKeywords = (item, preferredKeywords) => {
  if (!preferredKeywords || preferredKeywords.length === 0) return false;

  const descripcion = (item.DESCRIPCION_DEL_PROCESO || '').toLowerCase();
  const objeto = (item.OBJETO_A_CONTRATAR || '').toLowerCase();
  const ramoFuncional = (item.RAMO_FUNCIONAL || '').toLowerCase();

  return preferredKeywords.some((keyword) => {
    const kw = keyword.toLowerCase();
    return descripcion.includes(kw) || objeto.includes(kw) || ramoFuncional.includes(kw);
  });
};
