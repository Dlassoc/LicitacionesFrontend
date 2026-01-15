/**
 * Utilidades compartidas para análisis de documentos
 * - Patrones de filtrado
 * - Funciones de validación
 * - Descarga de archivos
 * - Análisis de documentos
 * - IndexedDB storage
 * 
 *  SINCRONIZAR CON: app/extract_ia/document_skip_patterns.py
 */

import API_BASE from '../../config/api.js';

// ============================================================================
// PATRONES DE DOCUMENTOS
// ============================================================================

//  ÚNICA FUENTE DE VERDAD: app/extract_ia/document_skip_patterns.py
// Mantener sincronizado manualmente con el backend

export const DOCUMENTS_TO_PRIORITIZE_PATTERNS = [
  /estudio.*previo/i,
  /estados?\s+financieros?/i,
  /indicadores?\s+financieros?/i,
  /indicadores?\s+organizacionales?/i,
  /requisitos?\s+habilitantes?\s+financieros?/i,
  /capacidad\s+financiera/i,
  /balance\s+general/i,
  /estados?\s+de\s+resultados?/i,
  /estado\s+de\s+flujo\s+de\s+caja/i,
  /pliego.*condiciones/i,
  /pliegos?.*definitiv/i,
  /definitiv.*pliegos?/i,
];

export const DOCUMENTS_TO_SKIP_PATTERNS = [
  /aprobaci[óo]n/i,
  /aprobado/i,
  /p[óo]liza/i,
  /p[óo]lizas/i,
  /matriz.*riesgo/i,
  /riesgo/i,
  /cotizaci[óo]n/i,
  /cotizaciones/i,
  /cotizado/i,
  /\bcdp\b/i,
  /certificado.*disponibilidad.*presupuestal/i,
  /registro.*presupuestal/i,
  /presupuestal/i,
  /aprobaci[óo]n.*garant[ií]/i,
  /garant[ií]/i,
  /t[ée]rminos.*referencia/i,
  /tr\b/i,
  /planeaci[óo]n/i,
  /presupuesto.*interno/i,
  /\bacta\b/i,
  /resoluci[óo]n/i,
  /acuerdo/i,
  /decreto/i,
  /orden/i,
];

// ============================================================================
// FUNCIONES DE FILTRADO
// ============================================================================

export const isPriorityDocument = (filename) => {
  if (!filename) return false;
  const filenameLower = filename.toLowerCase();
  return DOCUMENTS_TO_PRIORITIZE_PATTERNS.some(pattern => pattern.test(filenameLower));
};

export const shouldSkipDocument = (filename) => {
  if (!filename) return false;
  const filenameLower = filename.toLowerCase();
  return DOCUMENTS_TO_SKIP_PATTERNS.some(pattern => pattern.test(filenameLower));
};

// ============================================================================
// INDEXED DB
// ============================================================================

const DB_NAME = 'LicitacionesDB';
const STORE_NAME = 'documentos';

export const initIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveDocumentToDB = async (doc) => {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const docData = {
      id: `${doc.proceso || 'default'}:${doc.titulo}`,
      ...doc,
      savedAt: new Date().toISOString(),
    };
    const req = store.put(docData);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(docData);
  });
};

// ============================================================================
// DESCARGA DE ARCHIVOS
// ============================================================================

export const buildDownloadUrl = (url) => {
  try {
    const u = new URL(url);
    const isSecop = /secop|colombiacompra\.gov\.co/i.test(u.host);
    if (isSecop) {
      const params = new URLSearchParams();
      for (const [key, value] of u.searchParams) {
        if (value && value.trim() !== '') {
          params.append(key, value);
        }
      }
      const q = params.toString();
      console.log(`🔗 [BUILD_URL] Parámetros limpios: ${q || '(ninguno)'}`);
      return `${API_BASE}/secop/download${q ? `?${q}` : ""}`;
    }
  } catch (e) {
    console.error(`❌ [BUILD_URL] Error parseando URL: ${e.message}`);
  }
  return url;
};

export const downloadFile = async (url, filename, signal = null) => {
  try {
    if (!url) {
      throw new Error('URL no disponible');
    }

    const downloadUrl = buildDownloadUrl(url);
    console.log(`📥 Descargando desde: ${downloadUrl}`);

    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fetchOptions = {
          method: 'GET',
          headers: {
            'Accept': 'application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/zip, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          // NO usar credentials: 'include' para descargas públicas
          // credentials: 'include',
        };

        if (signal) {
          fetchOptions.signal = signal;
        }

        const response = await fetch(downloadUrl, fetchOptions);

        if (!response.ok) {
          const errorMsg = `HTTP ${response.status}: ${response.statusText}`;

          if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.warn(`⚠️ [DOWNLOAD] Error ${response.status}. Reintentando en ${waitTime}ms... (intento ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          throw new Error(errorMsg);
        }

        // Verificar que la respuesta tiene contenido antes de convertir a blob
        const contentLength = response.headers.get('Content-Length');
        if (contentLength && parseInt(contentLength) === 0) {
          throw new Error('El servidor devolvió un archivo vacío (Content-Length: 0)');
        }

        let blob;
        try {
          blob = await response.blob();
        } catch (blobError) {
          // Error típico: archivo muy grande o conexión cerrada por el navegador
          // No loguear stack trace completo para no ensuciar la consola
          if (attempt >= maxRetries) {
            console.warn(`⚠️ Archivo muy grande (${filename}), omitiendo descarga`);
          }
          throw new Error(`Error procesando archivo: ${blobError.message}`);
        }

        if (blob.size === 0) {
          throw new Error('Archivo descargado está vacío');
        }

        console.log(`✅ Descargado exitosamente: ${blob.size} bytes (tipo: ${blob.type})`);

        return new File([blob], filename, { type: blob.type });
      } catch (error) {
        lastError = error;
        if (error.name === 'AbortError') {
          throw error;
        }

        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          // Solo mostrar advertencia en el último intento para no ensuciar consola
          if (attempt === maxRetries - 1) {
            console.warn(`⚠️ [DOWNLOAD] Último intento fallido para ${filename}: ${error.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error(`Error descargando ${filename} después de ${maxRetries} intentos`);
  } catch (e) {
    console.error(`❌ [DOWNLOAD] Error: ${e.message}`);
    throw e;
  }
};

// ============================================================================
// ANÁLISIS DE DOCUMENTOS
// ============================================================================

export const analyzeDocument = async (file, signal = null, retries = 3) => {
  const formData = new FormData();
  formData.append('files', file);

  const fetchOptions = {
    method: 'POST',
    body: formData,
  };

  if (signal) {
    fetchOptions.signal = signal;
  }

  console.log(`🚀 [ANALYZE_DOC] Iniciando fetch a ${API_BASE}/extract_ia/analyze`);

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}/extract_ia/analyze`, fetchOptions);
      console.log(`📥 [ANALYZE_DOC] Respuesta recibida con status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 503 && attempt < retries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(`⚠️ [ANALYZE_DOC] Error 503 (sin recursos). Reintentando en ${waitTime}ms... (intento ${attempt}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(`Backend error: ${response.statusText} (status ${response.status})`);
      }

      console.log(`📖 [ANALYZE_DOC] Parseando JSON...`);
      const result = await response.json();
      console.log(`✅ [ANALYZE_DOC] JSON parseado:`, result);
      return result;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') {
        console.log('✅ [ANALYZE_DOC] Análisis cancelado por el usuario');
        throw err;
      }
      if (attempt < retries && err.message.includes('503')) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.warn(`⚠️ [ANALYZE_DOC] Error en intento ${attempt}. Esperando ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw err;
      }
    }
  }

  throw lastError || new Error('Error en análisis después de reintentos');
};

// ============================================================================
// EXTRACCIÓN DE INDICADORES DESDE RESPUESTA DEL BACKEND
// ============================================================================

/**
 * Extrae y normaliza todos los indicadores de un item de análisis
 * Función compartida para evitar duplicación entre hooks
 */
export const extractIndicatorsFromAnalysisItem = (analysisItem) => {
  const resultado = analysisItem.resultado || {};
  
  return {
    nombre: analysisItem.archivo || '',
    archivo: analysisItem.archivo || '',
    paginasIndicadores: analysisItem.paginas_indicadores || [],
    paginasTotales: analysisItem.paginas_totales || 0,
    textPreview: analysisItem.context_snippet || '',
    indicadores: resultado.indicadores_financieros || {},
    indicadoresOrganizacionales: resultado.indicadores_organizacionales || {},
    confianza: resultado.indicadores_confianza || 0,
    codigos_unspsc: resultado.codigos_unspsc || [],
    experiencia_encontrada: resultado.experiencia_encontrada || false,
    experiencia_requerida: resultado.experiencia_requerida || null,
    experiencia_anos: resultado.experiencia_anos || null,
    experiencia_certificaciones: resultado.experiencia_certificaciones || null,
    experiencia_valor_smmlv: resultado.experiencia_valor_smmlv || null,
    experiencia_tipos: resultado.experiencia_tipos_proyectos || [],
    experiencia_sector: resultado.experiencia_sector || null,
    notas: resultado.indicadores_notas || '',
    completo: resultado,
    ok: true,
  };
};

// ============================================================================
// DESCARGA MÚLTIPLE DE DOCUMENTOS CON CACHÉ
// ============================================================================

/**
 * Descarga múltiples documentos secuencialmente con manejo de errores
 * Guarda cada uno en IndexedDB y retorna los archivos descargados
 * 
 * @param {Array} documents - Array de { url, titulo }
 * @param {AbortSignal} signal - Señal para cancelación
 * @param {Function} onProgress - Callback para actualizar progreso (i, total)
 * @returns {Array} Array de File objects descargados
 */
export const downloadMultipleDocuments = async (documents, signal, onProgress) => {
  const filesToAnalyze = [];
  
  for (let i = 0; i < documents.length; i++) {
    if (signal && signal.aborted) {
      throw new Error('Descarga cancelada por el usuario');
    }

    const doc = documents[i];
    try {
      console.log(`📥 [${i + 1}/${documents.length}] Descargando: ${doc.titulo}`);
      const file = await downloadFile(doc.url, doc.titulo, signal);
      
      // Guardar en caché
      await saveDocumentToDB({ ...doc, file });
      
      filesToAnalyze.push(file);
      
      if (onProgress) {
        onProgress(i + 1, documents.length);
      }
    } catch (e) {
      // Solo mostrar mensaje si NO es archivo grande (para no confundir al usuario)
      if (!e.message.includes('Failed to fetch')) {
        console.warn(`⚠️ Error descargando ${doc.titulo}: ${e.message}`);
      } else {
        console.log(`⏩ Omitiendo ${doc.titulo} (archivo muy grande, se analizarán otros)`);
      }
      // Continuar con el siguiente documento
    }
  }
  
  return filesToAnalyze;
};
