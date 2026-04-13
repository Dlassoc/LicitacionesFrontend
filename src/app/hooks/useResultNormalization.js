import { useMemo } from 'react';
import { normalizeCumpleValue } from '../../utils/commonHelpers.js';

/**
 * Normaliza estructura de requisitos extraídos.
 * Unifica indicadores_financieros/matrices en un formato consistente.
 */
export const normalizeRequisitos = (requisitos) => {
  if (!requisitos || typeof requisitos !== 'object') return {};

  const normalized = { ...requisitos };
  let foundIndicators = null;

  if (requisitos.indicadores_financieros?.matrices && typeof requisitos.indicadores_financieros.matrices === 'object') {
    foundIndicators = requisitos.indicadores_financieros.matrices;
  }

  if (!foundIndicators && requisitos.indicadores_financieros && typeof requisitos.indicadores_financieros === 'object') {
    const indFin = requisitos.indicadores_financieros;
    if (!indFin.id_portafolio && !indFin.created_at) {
      foundIndicators = indFin;
    }
  }

  if (!foundIndicators && requisitos.matrices && typeof requisitos.matrices === 'object') {
    foundIndicators = requisitos.matrices;
  }

  if (foundIndicators && Object.keys(foundIndicators).length > 0) {
    normalized.matrices = foundIndicators;
  }

  return normalized;
};

/**
 * Crea un analysisStatus normalizado a partir de un item de BD.
 */
export const createAnalysisStatus = (item, isMatched, isAnalyzed) => {
  const estado = String(item?.estado || '').toLowerCase();
  const requisitos = item?.requisitos_extraidos;
  const detalles = item?.detalles;
  const hasRequisitos = requisitos && typeof requisitos === 'object' && Object.keys(requisitos).length > 0;
  const hasDetalles = detalles && typeof detalles === 'object' && Object.keys(detalles).length > 0;
  const hasEvidence = hasRequisitos || hasDetalles || item?.cumple !== undefined;
  const terminalStates = new Set(['completado', 'sin_documentos', 'error']);
  const isFinalLike = terminalStates.has(estado) || (isAnalyzed && hasEvidence);

  if (isAnalyzed && isFinalLike) {
    return {
      estado: terminalStates.has(estado) ? estado : 'completado',
      cumple: normalizeCumpleValue(item.cumple),
      porcentaje: item.porcentaje_cumplimiento || 0,
      requisitos: normalizeRequisitos(item.requisitos_extraidos || {}),
      detalles: item.detalles || {}
    };
  }

  if (isMatched) {
    return {
      estado: 'completado',
      cumple: true,
      porcentaje: item.score || 0,
      requisitos: normalizeRequisitos(item.requisitos_extraidos || {})
    };
  }

  if (item.from_cache && isFinalLike) {
    return {
      estado: terminalStates.has(estado) ? estado : 'completado',
      cumple: normalizeCumpleValue(item.cumple),
      porcentaje: item.porcentaje_cumplimiento || 0,
      requisitos: normalizeRequisitos(item.requisitos_extraidos || {}),
      detalles: item.detalles || {}
    };
  }

  return null;
};

/**
 * Normaliza un item de BD (matched/analyzed) al formato esperado por los componentes.
 */
export const normalizeFromDB = (item, sourceTag = 'UNKNOWN') => {
  if (!item) return item;
  const isMatched = sourceTag === 'MATCHED';
  const estado = String(item?.estado || '').toLowerCase();
  const requisitos = item?.requisitos_extraidos;
  const detalles = item?.detalles;
  const hasRequisitos = requisitos && typeof requisitos === 'object' && Object.keys(requisitos).length > 0;
  const hasDetalles = detalles && typeof detalles === 'object' && Object.keys(detalles).length > 0;
  const hasEvidence = hasRequisitos || hasDetalles || item?.cumple !== undefined;
  const terminalStates = new Set(['completado', 'sin_documentos', 'error']);
  const isAnalyzed = sourceTag === 'ANALYZED' || (
    (item.id_portafolio || item.ID_Portafolio) &&
    (terminalStates.has(estado) || hasEvidence)
  );
  const id_portafolio = item.id_portafolio || item.ID_Portafolio || (isMatched ? item.referencia : item.id);
  let referencia = id_portafolio;
  try {
    if (item.detalles && typeof item.detalles === 'object') {
      const refs = Object.values(item.detalles).filter(v => typeof v === 'string' && v.length > 0);
      if (refs.length > 0) referencia = refs[0];
    }
  } catch (e) {
    if (isMatched && item.referencia) referencia = item.referencia;
  }
  return {
    ...item,
    ID_Portafolio: id_portafolio, id_del_portafolio: id_portafolio, id_portafolio: id_portafolio,
    Referencia_del_proceso: item.referencia || referencia || item.Referencia_del_proceso,
    Entidad: item.entidad || item.Entidad || 'Entidad no disponible',
    Descripcion: item.objeto_contratar || item.Descripcion || item.descripcion || '',
    OBJETO_A_CONTRATAR: item.objeto_contratar || item.OBJETO_A_CONTRATAR || '',
    DESCRIPCION_DEL_PROCESO: item.objeto_contratar || item.DESCRIPCION_DEL_PROCESO || '',
    Precio_base: item.precio || item.cuantia || item.Precio_base,
    Departamento_de_la_entidad: item.departamento || item.Departamento_de_la_entidad || '',
    Ciudad_entidad: item.ciudad || item.Ciudad_entidad || '',
    Fecha_publicacion: item.fecha_publicacion || item.Fecha_publicacion || '',
    Fase: isAnalyzed ? (item.Fase || item.fase || 'Analizado') : (item.estado || item.Fase || item.fase || ''),
    URL_Proceso: item.enlace || item.url || item.URL_Proceso || '#',
    score: item.porcentaje ?? item.porcentaje_cumplimiento ?? item.score ?? 0,
    requisitos_extraidos: item.requisitos_extraidos || item.requisitos || {},
    _fromMatched: isMatched, _fromAnalyzed: isAnalyzed,
    _analysisStatus: createAnalysisStatus(item, isMatched, isAnalyzed)
  };
};

/**
 * Hook que combina y deduplica resultados de SECOP + BD (matched + analyzed).
 * Retorna el array combinado memoizado.
 */
export function useMergedResults({
  resultados,
  allResultados,
  matchedLicitaciones,
  analyzedLicitaciones,
  discardedIds,
  isDiscarded
}) {
  return useMemo(() => {
    const baseSecopResults = allResultados && allResultados.length > 0 ? allResultados : resultados;
    let combined = [];
    const seenIds = new Set();

    const mergeCacheData = (existingItem, cacheItem, sourceTag) => {
      const merged = { ...existingItem };
      merged.from_cache = true;
      merged._fromMatched = existingItem._fromMatched || cacheItem._fromMatched;
      merged._fromAnalyzed = existingItem._fromAnalyzed || cacheItem._fromAnalyzed;

      if (sourceTag === 'ANALYZED' && normalizeCumpleValue(cacheItem.cumple) === false) {
        merged._fromMatched = false;
      }

      if (cacheItem.requisitos_extraidos && Object.keys(cacheItem.requisitos_extraidos).length > 0) {
        merged.requisitos_extraidos = cacheItem.requisitos_extraidos;
      }

      if (cacheItem._analysisStatus) {
        merged._analysisStatus = cacheItem._analysisStatus;
      } else if (cacheItem.cumple !== undefined) {
        merged._analysisStatus = createAnalysisStatus(cacheItem, false, true);
      }

      if (cacheItem.score !== undefined && cacheItem.score !== null) {
        merged.score = cacheItem.score;
      }
      if (cacheItem.porcentaje_cumplimiento !== undefined) {
        merged.porcentaje_cumplimiento = cacheItem.porcentaje_cumplimiento;
      }
      if (cacheItem.cumple !== undefined) {
        merged.cumple = cacheItem.cumple;
      }

      return merged;
    };

    const addOrMergeFromDB = (item, sourceTag) => {
      const normalized = normalizeFromDB(item, sourceTag);
      if (!normalized) return false;

      normalized.from_cache = true;
      const id = normalized.ID_Portafolio || normalized.id_del_portafolio;
      if (!id || isDiscarded(id)) return false;

      const existingIndex = combined.findIndex(existing => {
        const existingId = existing.ID_Portafolio || existing.id_del_portafolio;
        return existingId === id;
      });

      if (existingIndex >= 0) {
        combined[existingIndex] = mergeCacheData(combined[existingIndex], normalized, sourceTag);
        return false;
      }

      combined.push(normalized);
      seenIds.add(id);
      return true;
    };

    // PASO 1: Resultados de SECOP normalizados
    if (baseSecopResults && Array.isArray(baseSecopResults) && baseSecopResults.length > 0) {
      baseSecopResults.forEach(r => {
        const id = r.ID_Portafolio || r.id_del_portafolio || r.id_portafolio;
        if (!isDiscarded(id)) {
          combined.push({
            ...r,
            ID_Portafolio: id,
            id_del_portafolio: id,
            id_portafolio: id
          });
          seenIds.add(id);
        }
      });
    }

    // PASO 2: MATCHED de BD
    if (matchedLicitaciones && matchedLicitaciones.length > 0) {
      matchedLicitaciones.forEach(m => {
        const id = m.id_portafolio || m.ID_Portafolio || m.referencia || m.id;
        if (!isDiscarded(id)) {
          addOrMergeFromDB(m, 'MATCHED');
        }
      });
    }

    // PASO 3: ANALYZED de BD
    if (analyzedLicitaciones && analyzedLicitaciones.length > 0) {
      analyzedLicitaciones.forEach(a => {
        const id = a.id_portafolio || a.ID_Portafolio;
        if (!isDiscarded(id)) {
          addOrMergeFromDB(a, 'ANALYZED');
        }
      });
    }

    return combined;
  }, [resultados, allResultados, matchedLicitaciones, analyzedLicitaciones, discardedIds]);
}
