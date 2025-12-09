/**
 * Hook para descargar documentos automáticamente y analizarlos LOCALMENTE
 * - Descarga PDFs, DOCX, XLSX y ZIP (que contienen documentos financieros)
 * - Guarda en IndexedDB (caché local)
 * - Envía al backend endpoint /analyze-local para análisis SIN IA
 * - Salta documentos administrativos (pólizas, cotizaciones, etc.)
 * - ✅ Soporta cancelación cuando el componente se desmonta o el usuario sale
 * - ⚡ MUCHO MÁS RÁPIDO que análisis con IA (resultado instantáneo)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import API_BASE from '../config/api.js';

const DB_NAME = 'LicitacionesDB';
const STORE_NAME = 'documentos';

// ✅ PATRONES DE DOCUMENTOS A PRIORIZAR (los que SÍ queremos)
const DOCUMENTS_TO_PRIORITIZE_PATTERNS = [
  /estudio.*previo/i,
  /estados?\s+financieros?/i,
  /indicadores?\s+financieros?/i,
  /indicadores?\s+organizacionales?/i,
  /requisitos?\s+habilitantes?\s+financieros?/i,
  /capacidad\s+financiera/i,
  /balance\s+general/i,
  /estados?\s+de\s+resultados?/i,
  /estado\s+de\s+flujo\s+de\s+caja/i,
  // ✅ NUEVO: Pliego de Condiciones TAMBIÉN contiene indicadores (fallback multi-documento)
  /pliego\s+de\s+condiciones?/i,
  // ✅ NUEVO: Solo ZIP que sean explícitamente FINANCIEROS
  /(?=.*\.zip)(?=.*estudio\s+financiero)/i,  // ZIP + "Estudio Financiero"
  /(?=.*\.zip)(?=.*estados?\s+financieros?)/i, // ZIP + "Estados Financieros"
  /(?=.*\.zip)(?=.*balance\s+general)/i,      // ZIP + "Balance General"
  /(?=.*\.zip)(?=.*indicadores?\s+financieros?)/i, // ZIP + "Indicadores Financieros"
];

// ⚠️ PATRONES DE DOCUMENTOS A DESCARTAR (no tienen indicadores)
const DOCUMENTS_TO_SKIP_PATTERNS = [
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
  /aviso\s+de\s+convocatoria/i,  // ⭐ Avisos no tienen indicadores
  /anexo\s+tecnico/i,            // ⭐ Técnicos no tienen financiero
  /ficha\s+condiciones\s+tecnicas/i, // ⭐ Técnicos no tienen financiero
  /estudio\s+del\s+sector\s+economico/i, // ⭐ Económico ≠ Indicadores financieros
  /estudio\s+de\s+mercado/i,     // ⭐ Mercado no tiene fin
  // ✅ REMOVIDO: /pliego\s+de\s+condiciones/i - Ahora se procesa como fallback del backend
];

// ✅ Función para verificar si un documento es prioritario
const isPriorityDocument = (filename) => {
  if (!filename) return false;
  const filenameLower = filename.toLowerCase();
  return DOCUMENTS_TO_PRIORITIZE_PATTERNS.some(pattern => pattern.test(filenameLower));
};

// ⚠️ Función para verificar si un documento debe saltarse
const shouldSkipDocument = (filename) => {
  if (!filename) return false;
  const filenameLower = filename.toLowerCase();
  return DOCUMENTS_TO_SKIP_PATTERNS.some(pattern => pattern.test(filenameLower));
};

// Inicializar IndexedDB
const initIndexedDB = () => {
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

// Guardar documento en IndexedDB
const saveDocumentToDB = async (doc) => {
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

// ✅ NUEVO: Limpiar caché de una licitación específica
const clearCacheForPortfolio = async (portfolioId) => {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const range = IDBKeyRange.bound(`${portfolioId}:`, `${portfolioId}:\uffff`);
      const req = store.delete(range);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        console.log(`🗑️ [CACHE] Caché limpiado para portafolio: ${portfolioId}`);
        resolve();
      };
    });
  } catch (e) {
    console.warn(`⚠️ [CACHE] Error limpiando caché: ${e.message}`);
  }
};

// Construir URL de descarga (usa proxy del backend para URLs de SECOP)
const buildDownloadUrl = (url) => {
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
      return `${API_BASE}/secop/download${q ? `?${q}` : ""}`;
    }
  } catch (e) {
    console.error(`❌ [BUILD_URL] Error parseando URL: ${e.message}`);
  }
  return url;
};

// Descargar archivo desde URL
const downloadFile = async (url, filename, signal = null) => {
  try {
    if (!url) {
      throw new Error('URL no disponible');
    }

    const downloadUrl = buildDownloadUrl(url);
    
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fetchOptions = {
          method: 'GET',
          headers: {
            'Accept': 'application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/zip, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          credentials: 'include',
        };
        
        if (signal) {
          fetchOptions.signal = signal;
        }

        const response = await fetch(downloadUrl, fetchOptions);

        if (!response.ok) {
          const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
          
          if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.warn(`⚠️ [DOWNLOAD] Error ${response.status}. Reintentando en ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          throw new Error(errorMsg);
        }
        
        const blob = await response.blob();
        const extension = response.headers.get('content-disposition')
          ? /filename="(.+)"/.exec(response.headers.get('content-disposition'))?.[1] || filename
          : filename;
        
        return new File([blob], extension, { type: blob.type });
      } catch (e) {
        lastError = e;
        if (e.name === 'AbortError') {
          throw new Error('Descarga cancelada');
        }
      }
    }
    
    throw lastError || new Error('No se pudo descargar el archivo');
  } catch (e) {
    console.error(`❌ [DOWNLOAD] Error: ${e.message}`);
    throw e;
  }
};

export const useLocalDocumentAnalysis = (docs, idPortafolio) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  
  const abortControllerRef = useRef(null);
  const analyzeTimeoutRef = useRef(null);
  const previousPortfolioRef = useRef(idPortafolio);

  // ✅ NUEVO: Resetear análisis cuando cambia idPortafolio (nueva licitación)
  useEffect(() => {
    // Si no hay idPortafolio, no hacer nada
    if (!idPortafolio) {
      return;
    }

    console.log(`🔍 [HOOK] Verificando cambio de portafolio: "${previousPortfolioRef.current}" vs "${idPortafolio}"`);
    
    if (idPortafolio !== previousPortfolioRef.current) {
      console.log(`🔄 [ANALYZE_LOCAL] Cambio de licitación detectado: "${previousPortfolioRef.current}" → "${idPortafolio}"`);
      console.log('🛑 [ANALYZE_LOCAL] Reseteando estado del análisis anterior...');
      
      // Limpiar caché del portafolio anterior
      if (previousPortfolioRef.current) {
        clearCacheForPortfolio(previousPortfolioRef.current);
      }
      
      // Cancelar análisis en progreso
      if (abortControllerRef.current) {
        console.log('⏹️ [ANALYZE_LOCAL] Abortando AbortController');
        abortControllerRef.current.abort();
      }
      if (analyzeTimeoutRef.current) {
        console.log('⏹️ [ANALYZE_LOCAL] Limpiando timeout');
        clearTimeout(analyzeTimeoutRef.current);
      }
      
      // Resetear todos los estados
      console.log('🔄 [ANALYZE_LOCAL] Reseteando estados...');
      setAnalyzing(false);
      setAnalyzed(false);
      setResults(null);
      setError(null);
      setProgress({ completed: 0, total: 0 });
      
      // Actualizar referencia
      previousPortfolioRef.current = idPortafolio;
      console.log(`✅ [ANALYZE_LOCAL] previousPortfolioRef actualizado a: "${idPortafolio}"`);
    }
  }, [idPortafolio]);

  const analyzeDocuments = useCallback(async (documentsToAnalyze) => {
    if (!documentsToAnalyze || documentsToAnalyze.length === 0) {
      console.log('⚠️ [ANALYZE_LOCAL] No hay documentos para analizar');
      return;
    }

    // Cancelar si ya hay un análisis en progreso
    if (analyzing) {
      console.log('⚠️ [ANALYZE_LOCAL] Análisis ya en progreso, ignorando nueva solicitud');
      return;
    }

    console.log(`🔄 [ANALYZE_LOCAL] Iniciando análisis local de ${documentsToAnalyze.length} documentos...`);
    
    abortControllerRef.current = new AbortController();
    setAnalyzing(true);
    setError(null);
    setProgress({ completed: 0, total: documentsToAnalyze.length });

    try {
      // 1) Separar documentos por prioridad
      const priorityDocs = [];
      const otherDocs = [];
      
      // ✅ GUARD: Detectar si hay documentos duplicados ANTES de procesarlos
      const titleMap = new Map();
      for (const doc of documentsToAnalyze) {
        const normalizedTitle = (doc.titulo || "").trim().toLowerCase();
        if (titleMap.has(normalizedTitle)) {
          console.warn(`⚠️ [DEDUP] Documento duplicado detectado: "${doc.titulo}" (se ignorará)`);
          continue; // Saltar duplicado
        }
        titleMap.set(normalizedTitle, true);
        
        const shouldSkip = shouldSkipDocument(doc.titulo);
        const isPriority = isPriorityDocument(doc.titulo);
        
        if (shouldSkip) {
          console.log(`⏭️  Saltando: ${doc.titulo} (administrativo)`);
        } else if (isPriority) {
          priorityDocs.push(doc);
          console.log(`⭐ Prioridad: ${doc.titulo}`);
        } else {
          otherDocs.push(doc);
        }
      }

      // 2) Priorizar: análisis solo con documentos prioritarios
      let docsToProcess = priorityDocs.length > 0 ? priorityDocs : otherDocs;
      const descartados = documentsToAnalyze.length - docsToProcess.length;
      
      console.log(`📄 [ANALYZE_LOCAL] ${docsToProcess.length} documentos prioritarios a procesar (${descartados} descartados)`);

      if (docsToProcess.length === 0) {
        console.log('⚠️ [ANALYZE_LOCAL] Todos los documentos fueron descartados (administrativos)');
        setResults({
          documentos_analizados: 0,
          documentos_descartados: documentsToAnalyze.length,
          indicadores: [],
          mensaje: 'Todos los documentos encontrados son administrativos (pólizas, cotizaciones, etc.) y no contienen indicadores financieros.',
        });
        setAnalyzed(true);
        setAnalyzing(false);
        return;
      }

      // 3) Descargar solo documentos prioritarios (máximo 5 para no sobrecargar)
      const maxDocs = 5;
      docsToProcess = docsToProcess.slice(0, maxDocs);
      
      const filesToAnalyze = [];
      
      for (let i = 0; i < docsToProcess.length; i++) {
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Análisis cancelado por el usuario');
        }

        const doc = docsToProcess[i];
        try {
          console.log(`📥 [${i + 1}/${docsToProcess.length}] Descargando: ${doc.titulo}`);
          const file = await downloadFile(doc.url, doc.titulo, abortControllerRef.current.signal);
          
          // Guardar en caché
          await saveDocumentToDB({ ...doc, file });
          
          filesToAnalyze.push(file);
          setProgress({ completed: i + 1, total: docsToProcess.length });
        } catch (e) {
          console.warn(`⚠️ Error descargando ${doc.titulo}: ${e.message}`);
          // Continuar con el siguiente documento
        }
      }

      if (filesToAnalyze.length === 0) {
        throw new Error('No se pudo descargar ningún documento');
      }

      console.log(`✅ [ANALYZE_LOCAL] ${filesToAnalyze.length} documentos descargados (máximo optimizado)`);

      // 4) Enviar al backend para análisis local
      console.log(`🚀 [ANALYZE_LOCAL] Enviando ${filesToAnalyze.length} documentos al backend para análisis...`);
      
      const formData = new FormData();
      filesToAnalyze.forEach((file, idx) => {
        formData.append('files', file, file.name);
      });

      const response = await fetch(`${API_BASE}/extract_ia/analyze-local`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP ${response.status}`);
      }

      const analysisResults = await response.json();
      
      console.log(`✨ [ANALYZE_LOCAL] Análisis completado:`, analysisResults);
      
      // 5) Procesar resultados: combinar todos los items en un resultado consolidado
      let consolidatedResults = {
        ok: true,
        documentos_analizados: 0,
        documentos_descartados: descartados,
        indicadores: {},
        indicadores_organizacionales: {},
        codigos_unspsc: [],
        experiencia_requerida: {},
        confianza: 0,
        mensaje: '',
        items: analysisResults.items || []
      };

      // Si hay items, consolidar indicadores
      if (analysisResults.items && analysisResults.items.length > 0) {
        console.log(`🔍 [DEBUG] analysisResults.items.length: ${analysisResults.items.length}`);
        analysisResults.items.forEach((item, idx) => {
          console.log(`  [Item ${idx}]:`);
          console.log(`    - ok: ${item.ok} (type: ${typeof item.ok})`);
          console.log(`    - resultado exists: ${item.resultado !== undefined}`);
          console.log(`    - resultado is object: ${typeof item.resultado === 'object'}`);
          console.log(`    - resultado is truthy: ${!!item.resultado}`);
          if (item.resultado) {
            console.log(`    - resultado keys: ${Object.keys(item.resultado).length}`);
          }
          console.log(`    - PASSES FILTER (ok && resultado): ${item.ok && item.resultado}`);
        });
        
        const successItems = analysisResults.items.filter(item => {
          const passes = item.ok && item.resultado;
          console.log(`    Filter check: item.ok=${item.ok}, item.resultado=${!!item.resultado}, passes=${passes}`);
          return passes;
        });
        console.log(`✅ [DEBUG] successItems.length after filter: ${successItems.length}`);
        
        if (successItems.length > 0) {
          consolidatedResults.documentos_analizados = successItems.length;
          
          // Combinar indicadores de todos los documentos
          const allFinancial = {};
          const allOrganizational = {};
          const allUnspsc = [];
          const allExperience = {};
          let totalConfidence = 0;
          
          successItems.forEach(item => {
            const res = item.resultado;
            
            // Combinar indicadores financieros
            if (res.indicadores_financieros && Object.keys(res.indicadores_financieros).length > 0) {
              Object.assign(allFinancial, res.indicadores_financieros);
            }
            
            // Combinar indicadores organizacionales
            if (res.indicadores_organizacionales && Object.keys(res.indicadores_organizacionales).length > 0) {
              Object.assign(allOrganizational, res.indicadores_organizacionales);
            }
            
            // Combinar códigos UNSPSC (evitar duplicados)
            if (res.codigos_unspsc && Array.isArray(res.codigos_unspsc)) {
              res.codigos_unspsc.forEach(code => {
                if (!allUnspsc.includes(code)) {
                  allUnspsc.push(code);
                }
              });
            }
            
            // Combinar experiencia requerida
            if (res.experiencia_requerida && Object.keys(res.experiencia_requerida).length > 0) {
              Object.assign(allExperience, res.experiencia_requerida);
            }
            
            // Acumular confianza
            totalConfidence += res.confianza || 0;
          });
          
          consolidatedResults.indicadores = allFinancial;
          consolidatedResults.indicadores_organizacionales = allOrganizational;
          consolidatedResults.codigos_unspsc = allUnspsc;
          consolidatedResults.experiencia_requerida = allExperience;
          consolidatedResults.confianza = successItems.length > 0 ? totalConfidence / successItems.length : 0;
          
          // Si hay indicadores, mostrar mensaje de éxito
          const totalIndicators = Object.keys(allFinancial).length + Object.keys(allOrganizational).length + allUnspsc.length + Object.keys(allExperience).length;
          if (totalIndicators > 0) {
            consolidatedResults.mensaje = `✓ Se encontraron ${totalIndicators} indicadores y requisitos relevantes`;
          } else {
            consolidatedResults.mensaje = 'Los documentos analizados no contienen indicadores financieros o requisitos.';
          }
        } else {
          consolidatedResults.mensaje = 'Error: No se pudieron procesar los documentos.';
        }
      } else {
        consolidatedResults.documentos_analizados = 0;
        consolidatedResults.mensaje = 'No se pudieron analizar los documentos.';
      }

      console.log(`📊 [ANALYZE_LOCAL] Resultados consolidados:`, consolidatedResults);
      
      // ✅ Si encontramos indicadores, paramos aquí (no continuamos analizando más)
      if (Object.keys(consolidatedResults.indicadores).length > 0 || Object.keys(consolidatedResults.indicadores_organizacionales).length > 0) {
        console.log(`🎯 [ANALYZE_LOCAL] ${Object.keys(consolidatedResults.indicadores).length + Object.keys(consolidatedResults.indicadores_organizacionales).length} indicadores encontrados, parando búsqueda`);
      }
      
      setResults(consolidatedResults);
      setAnalyzed(true);
    } catch (e) {
      if (e.name === 'AbortError' || e.message === 'Análisis cancelado por el usuario') {
        console.log('🛑 [ANALYZE_LOCAL] Análisis cancelado');
        setError(null);
      } else {
        console.error(`❌ [ANALYZE_LOCAL] Error: ${e.message}`);
        setError(e.message || 'Error durante el análisis');
      }
    } finally {
      setAnalyzing(false);
    }
  }, []);  // ✅ VACIO: No depende de ningún state porque useCallback maneja todo internamente

  // Cancelar análisis
  const cancel = useCallback(() => {
    console.log('🛑 Cancelando análisis local...');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current);
    }
    // Resetear todos los estados al cancelar
    setAnalyzing(false);
    setAnalyzed(false);
    setResults(null);
    setError(null);
    setProgress({ completed: 0, total: 0 });
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    analyzing,
    analyzed,
    results,
    error,
    progress,
    analyze: () => analyzeDocuments(docs),
    cancel,
  };
};

export default useLocalDocumentAnalysis;
