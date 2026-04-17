import API_BASE_URL from '../../config/api.js';
import { apiGet, apiPost } from '../../config/httpClient.js';
import { devLog } from '../../utils/devLog.js';

const API_BASE = API_BASE_URL;

export async function saveAnalyzedLicitacion(licitacion, analysisData) {
  try {
    const idPortafolio = licitacion.ID_Portafolio || licitacion.id_del_portafolio;
    const percentage = typeof analysisData.porcentaje_cumplimiento === 'number' ? analysisData.porcentaje_cumplimiento : 0;

    const payload = {
      id_portafolio: idPortafolio,
      referencia: licitacion.Referencia || licitacion.referencia_del_proceso || `[${idPortafolio}]`,
      entidad: licitacion.Entidad || licitacion.entidad || '',
      objeto_contratar: licitacion.Nombre || licitacion.nombre_del_procedimiento || '',
      cuantia: licitacion.Cuantia || licitacion.cuantia || '',
      departamento: licitacion.Departamento || licitacion.departamento || '',
      ciudad: licitacion.Ciudad || licitacion.ciudad || '',
      estado_licitacion: licitacion.Estado || licitacion.estado_del_procedimiento || '',
      estado_analisis: analysisData?.estado_analisis || analysisData?.estado || 'completado',
      fecha_publicacion: licitacion.Fecha_publicacion || licitacion.fecha_de_publicacion_del || '',
      enlace: licitacion.URL_Proceso || licitacion.enlace || '',
      porcentaje_cumplimiento: percentage,
      cumple: analysisData.cumple !== null && analysisData.cumple !== undefined ? analysisData.cumple : null,
      detalles: analysisData.detalles || {},
      requisitos_extraidos: analysisData.requisitos_extraidos || analysisData.requisitos || {}
    };

    devLog(
      `[AUTO_ANALYSIS] 💾 Guardando en licitaciones_analisis: ${idPortafolio}, estado=${payload.estado_analisis}, cumple=${payload.cumple}`
    );

    const result = await apiPost('/saved/analyzed', payload);
    if (result?.ok) {
      devLog(`[AUTO_ANALYSIS] ✅ Guardado en BD: ${idPortafolio}`);
      return true;
    }
    console.warn(`[AUTO_ANALYSIS] ⚠️ Error del backend:`, result.error || result.message);
    return false;
  } catch (error) {
    console.warn(`[AUTO_ANALYSIS] ⚠️ Error guardando análisis:`, error.message);
  }
  return false;
}

export async function saveMatchedLicitacion(licitacion, analysisData) {
  try {
    const idPortafolio = licitacion.ID_Portafolio || licitacion.id_del_portafolio;
    const percentage = typeof analysisData.porcentaje_cumplimiento === 'number' ? analysisData.porcentaje_cumplimiento : 0;

    const indicadoresFinancieros = analysisData.requisitos_extraidos?.indicadores_financieros ||
      analysisData.requisitos?.indicadores_financieros || {};
    const matricesExtraidas = analysisData.requisitos_extraidos?.matrices ||
      analysisData.requisitos?.matrices || {};

    const payload = {
      id_portafolio: idPortafolio,
      referencia: licitacion.Referencia || licitacion.referencia_del_proceso || `[${idPortafolio}]`,
      entidad: licitacion.Entidad || licitacion.entidad || '',
      objeto_contratar: licitacion.Nombre || licitacion.nombre_del_procedimiento || '',
      cuantia: licitacion.Cuantia || licitacion.cuantia || '',
      departamento: licitacion.Departamento || licitacion.departamento || '',
      ciudad: licitacion.Ciudad || licitacion.ciudad || '',
      estado: licitacion.Estado || licitacion.estado_del_procedimiento || '',
      fecha_publicacion: licitacion.Fecha_publicacion || licitacion.fecha_de_publicacion_del || '',
      enlace: licitacion.URL_Proceso || licitacion.enlace || '',
      score: percentage,
      razon: analysisData.detalles?.resumen || analysisData.detalles || 'Cumple requisitos',
      requisitos_extraidos: {
        indicadores_financieros: indicadoresFinancieros,
        matrices: matricesExtraidas,
        detalles: analysisData.detalles,
        ...analysisData.requisitos_extraidos
      }
    };

    devLog(`
╔════════════════════════════════════════════════════════════╗
║ 💾 GUARDANDO LICITACIÓN APTA EN BD
╠════════════════════════════════════════════════════════════╣
║ 🆔 ID: ${idPortafolio}
║ 📄 Referencia: ${payload.referencia}
║ 📊 Score: ${percentage}%
║ 🏢 Entidad: ${payload.entidad.substring(0, 40)}${payload.entidad.length > 40 ? '...' : ''}
║ 💰 Indicadores Financieros: ${Object.keys(indicadoresFinancieros).length} extraídos
║ 📋 Matrices: ${Object.keys(matricesExtraidas).length} encontradas
║ ⏰ ${new Date().toLocaleTimeString()}
╚════════════════════════════════════════════════════════════╝
    `);

    const result = await apiPost('/saved/matched', payload);
    if (result.ok) {
      devLog(`
╔════════════════════════════════════════════════════════════╗
║ ✅ GUARDADA EXITOSAMENTE EN BD
╠════════════════════════════════════════════════════════════╣
║ 🎯 Tabla: licitaciones_aptas
║ 📄 Referencia: ${payload.referencia}
║ 📊 Score: ${percentage}%
║ 💰 Indicadores guardados: ${Object.keys(indicadoresFinancieros).length}
║ 📋 Matrices guardadas: ${Object.keys(matricesExtraidas).length}
║ 💬 ${result.message}
║ ⏰ ${new Date().toLocaleTimeString()}
╚════════════════════════════════════════════════════════════╝
      `);
      return true;
    }

    console.warn(`
╔════════════════════════════════════════════════════════════╗
║ ⚠️  ERROR EN RESPUESTA DEL BACKEND
╠════════════════════════════════════════════════════════════╣
║ 🆔 ID: ${idPortafolio}
║ ⚠️  Error: ${result.error || result.message}
║ ⏰ ${new Date().toLocaleTimeString()}
╚════════════════════════════════════════════════════════════╝
      `);
  } catch (error) {
    console.error(`
╔════════════════════════════════════════════════════════════╗
║  ERROR GUARDANDO LICITACIÓN EN BD
╠════════════════════════════════════════════════════════════╣
║ 🆔 ID: ${licitacion?.ID_Portafolio || licitacion?.id_del_portafolio}
║ ⚠️  Error: ${error.message}
║ 🔍 Detalles: ${error.stack?.split('\n')[0]}
║ ⏰ ${new Date().toLocaleTimeString()}
╚════════════════════════════════════════════════════════════╝
    `, error);
  }
  return false;
}

export async function loadExistingAnalysis(ids) {
  try {
    if (!ids || ids.length === 0) return {};

    const data = await apiPost('/analysis/batch/existing', { ids });
    if (data.ok) {
      devLog(`[AUTO_ANALYSIS] 📦 Análisis existentes cargados: ${Object.keys(data.data || {}).length}`);
      return data.data || {};
    }
  } catch (error) {
    console.warn(`[AUTO_ANALYSIS] ⚠️ Error en loadExistingAnalysis:`, error.message);
  }
  return {};
}

export async function triggerBatchAnalysis(payload) {
  try {
    const controller = new AbortController();
    const TRIGGER_TIMEOUT_MS = 45000;
    const timeoutId = setTimeout(() => controller.abort(), TRIGGER_TIMEOUT_MS);

    const result = await apiPost(
      '/analysis/batch/trigger-batch',
      { licitaciones: payload },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    let userMessage = error.message;
    if (error.name === 'AbortError') {
      userMessage = 'Timeout del trigger: el backend puede seguir procesando en segundo plano';
      console.info('[AUTO_ANALYSIS] ℹ️ Trigger con timeout local, continuando con polling:', userMessage);
      return {
        ok: true,
        timeout: true,
        message: userMessage,
      };
    }
    if (error.message.includes('Failed to fetch')) {
      userMessage = `No se puede conectar con ${API_BASE}. ¿Está ejecutándose?`;
    }

    console.warn('[AUTO_ANALYSIS] ⚠️ No se pudo disparar trigger:', userMessage);
    throw new Error(userMessage);
  }
}

export async function fetchQueueSummary(sampleLimit = 5) {
  try {
    const data = await apiGet(`/analysis/batch/queue/summary?sample_limit=${sampleLimit}`);
    return data?.ok ? data : null;
  } catch {
    return null;
  }
}
