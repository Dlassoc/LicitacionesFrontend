import { normalizeCumpleValue } from '../../utils/commonHelpers.js';

export function hasMeaningfulAnalysisEvidence(data) {
  if (!data || typeof data !== 'object') return false;

  const requisitos = data.requisitos_extraidos && typeof data.requisitos_extraidos === 'object'
    ? data.requisitos_extraidos
    : (data.requisitos && typeof data.requisitos === 'object' ? data.requisitos : {});
  const detalles = data.detalles && typeof data.detalles === 'object' ? data.detalles : {};

  const hasCumple = data.cumple !== undefined && data.cumple !== null;
  const hasDetalles = Object.keys(detalles).length > 0;

  const hasMatrices = requisitos.matrices && Object.keys(requisitos.matrices).length > 0;
  const hasIndicadores =
    requisitos.indicadores_financieros &&
    typeof requisitos.indicadores_financieros === 'object' &&
    Object.keys(requisitos.indicadores_financieros).length > 0;
  const hasUNSPSC = Array.isArray(requisitos.codigos_unspsc) && requisitos.codigos_unspsc.length > 0;
  const experienciaTexto = requisitos.experiencia_requerida?.experiencia_requerida;
  const hasExperiencia = typeof experienciaTexto === 'string' && experienciaTexto.trim().length > 0;

  return hasCumple || hasDetalles || hasMatrices || hasIndicadores || hasUNSPSC || hasExperiencia;
}

export function prepararDocumentos(licitacion) {
  const documentoFields = [
    licitacion.documentos || [],
    licitacion.Documentos || [],
    licitacion.archivos || [],
    licitacion.Archivos || [],
    (licitacion.URL_Pliego ? [{ titulo: 'Pliego', url: licitacion.URL_Pliego }] : []),
    (licitacion.url_pliego ? [{ titulo: 'Pliego', url: licitacion.url_pliego }] : [])
  ];

  const todosDocumentos = documentoFields
    .flat()
    .filter(doc => doc && (doc.url || doc.URL || doc.enlace || doc.Enlace));

  if (todosDocumentos.length === 0) {
    return [];
  }

  const pliegos = [];
  const otros = [];

  for (const doc of todosDocumentos) {
    const titulo = (doc.titulo || doc.Titulo || doc.nombre || doc.Nombre || '').toLowerCase();
    const url = (doc.url || doc.URL || doc.enlace || doc.Enlace || '').toLowerCase();

    const keywordsDescartar = ['rfp', 'analisis financiero', 'evaluacion', 'acta de', 'respuesta', 'observaciones'];
    const deberiaDescartar = keywordsDescartar.some(kw => titulo.includes(kw) || url.includes(kw));

    if (deberiaDescartar) {
      continue;
    }

    const keywordsPliegoDefinitivo = ['pliego definitivo', 'pliego de', 'definitivo', 'pliego de condiciones'];
    const esPliegoDefinitivo = keywordsPliegoDefinitivo.some(kw =>
      titulo.includes(kw) || url.includes(kw)
    );

    if (esPliegoDefinitivo) {
      pliegos.unshift({
        titulo: doc.titulo || doc.Titulo || 'Pliego Definitivo',
        url: doc.url || doc.URL || doc.enlace || doc.Enlace,
        prioritario: true
      });
    } else {
      otros.push({
        titulo: doc.titulo || doc.Titulo || 'Documento',
        url: doc.url || doc.URL || doc.enlace || doc.Enlace,
        prioritario: false
      });
    }
  }

  return [...pliegos, ...otros].slice(0, 5);
}

export function getAnalysisFingerprint(status) {
  const normalized = {
    estado: status?.estado || null,
    cumple: normalizeCumpleValue(status?.cumple),
    porcentaje_cumplimiento:
      typeof status?.porcentaje_cumplimiento === 'number' ? status.porcentaje_cumplimiento : null,
    detalles: status?.detalles || {},
    requisitos_extraidos: status?.requisitos_extraidos || status?.requisitos || {},
  };
  return JSON.stringify(normalized);
}

export function hasStatusEvidence(status) {
  if (!status || typeof status !== 'object') return false;
  const hasCumple = status.cumple !== undefined && status.cumple !== null;
  const hasRequisitos =
    status.requisitos &&
    typeof status.requisitos === 'object' &&
    Object.keys(status.requisitos).length > 0;
  const hasDetalles =
    status.detalles &&
    typeof status.detalles === 'object' &&
    Object.keys(status.detalles).length > 0;
  return hasCumple || hasRequisitos || hasDetalles;
}
