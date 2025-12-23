/**
 * Hook para descargar documentos automáticamente y analizarlos LOCALMENTE
 * - Descarga PDFs, DOCX, XLSX y ZIP (que contienen documentos financieros)
 * - Guarda en IndexedDB (caché local)
 * - Envía al backend endpoint /analyze-local para análisis SIN IA
 * - Salta documentos administrativos (pólizas, cotizaciones, etc.)
 * -  Soporta cancelación cuando el componente se desmonta o el usuario sale
 * -  MUCHO MÁS RÁPIDO que análisis con IA (resultado instantáneo)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import API_BASE from '../config/api.js';
import {
  isPriorityDocument,
  shouldSkipDocument,
  downloadFile,
  analyzeDocument,
  saveDocumentToDB,
  initIndexedDB,
  downloadMultipleDocuments,
} from './utils/documentUtils.js';

//  Limpiar caché de una licitación específica
const clearCacheForPortfolio = async (portfolioId) => {
  try {
    const STORE_NAME = 'documentosAnalisis';
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const range = IDBKeyRange.bound(`${portfolioId}:`, `${portfolioId}:\uffff`);
      const req = store.delete(range);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        console.log(` [CACHE] Caché limpiado para portafolio: ${portfolioId}`);
        resolve();
      };
    });
  } catch (e) {
    console.warn(` [CACHE] Error limpiando caché: ${e.message}`);
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

  //  NUEVO: Resetear análisis cuando cambia idPortafolio (nueva licitación)
  useEffect(() => {
    // Si no hay idPortafolio, no hacer nada
    if (!idPortafolio) {
      return;
    }

    console.log(` [HOOK] Verificando cambio de portafolio: "${previousPortfolioRef.current}" vs "${idPortafolio}"`);
    
    if (idPortafolio !== previousPortfolioRef.current) {
      console.log(` [ANALYZE_LOCAL] Cambio de licitación detectado: "${previousPortfolioRef.current}" → "${idPortafolio}"`);
      console.log(' [ANALYZE_LOCAL] Reseteando estado del análisis anterior...');
      
      // Limpiar caché del portafolio anterior
      if (previousPortfolioRef.current) {
        clearCacheForPortfolio(previousPortfolioRef.current);
      }
      
      // Cancelar análisis en progreso
      if (abortControllerRef.current) {
        console.log(' [ANALYZE_LOCAL] Abortando AbortController');
        abortControllerRef.current.abort();
      }
      if (analyzeTimeoutRef.current) {
        console.log(' [ANALYZE_LOCAL] Limpiando timeout');
        clearTimeout(analyzeTimeoutRef.current);
      }
      
      // Resetear todos los estados
      console.log(' [ANALYZE_LOCAL] Reseteando estados...');
      setAnalyzing(false);
      setAnalyzed(false);
      setResults(null);
      setError(null);
      setProgress({ completed: 0, total: 0 });
      
      // Actualizar referencia
      previousPortfolioRef.current = idPortafolio;
      console.log(` [ANALYZE_LOCAL] previousPortfolioRef actualizado a: "${idPortafolio}"`);
    }
  }, [idPortafolio]);

  const analyzeDocuments = useCallback(async (documentsToAnalyze) => {
    if (!documentsToAnalyze || documentsToAnalyze.length === 0) {
      console.log(' [ANALYZE_LOCAL] No hay documentos para analizar');
      return;
    }

    console.log(` [ANALYZE_LOCAL] Iniciando análisis local de ${documentsToAnalyze.length} documentos...`);
    
    abortControllerRef.current = new AbortController();
    setAnalyzing(true);
    setError(null);
    setProgress({ completed: 0, total: documentsToAnalyze.length });

    try {
      // 1) Separar documentos por prioridad
      const priorityDocs = [];
      const otherDocs = [];
      
      //  GUARD: Detectar si hay documentos duplicados ANTES de procesarlos
      const titleMap = new Map();
      for (const doc of documentsToAnalyze) {
        const normalizedTitle = (doc.titulo || "").trim().toLowerCase();
        if (titleMap.has(normalizedTitle)) {
          console.warn(` [DEDUP] Documento duplicado detectado: "${doc.titulo}" (se ignorará)`);
          continue; // Saltar duplicado
        }
        titleMap.set(normalizedTitle, true);
        
        const shouldSkip = shouldSkipDocument(doc.titulo);
        const isPriority = isPriorityDocument(doc.titulo);
        
        //  DEBUG: Mostrar evaluación de CADA documento
        console.log(` [DEBUG] "${doc.titulo}" | Skip: ${shouldSkip} | Priority: ${isPriority}`);
        
        if (shouldSkip) {
          console.log(`  Saltando: ${doc.titulo} (administrativo)`);
        } else if (isPriority) {
          priorityDocs.push(doc);
          console.log(` Prioridad: ${doc.titulo}`);
        } else {
          otherDocs.push(doc);
        }
      }

      // 2) Priorizar: análisis solo con documentos prioritarios
      let docsToProcess = priorityDocs.length > 0 ? priorityDocs : otherDocs;
      const descartados = documentsToAnalyze.length - docsToProcess.length;
      
      console.log(` [ANALYZE_LOCAL] ${docsToProcess.length} documentos prioritarios a procesar (${descartados} descartados)`);

      if (docsToProcess.length === 0) {
        console.log(' [ANALYZE_LOCAL] Todos los documentos fueron descartados (administrativos)');
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
      
      const filesToAnalyze = await downloadMultipleDocuments(
        docsToProcess,
        abortControllerRef.current.signal,
        (completed, total) => setProgress({ completed, total })
      );

      if (filesToAnalyze.length === 0) {
        throw new Error('No se pudo descargar ningún documento');
      }

      console.log(` [ANALYZE_LOCAL] ${filesToAnalyze.length} documentos descargados (máximo optimizado)`);

      // 4) Enviar al backend para análisis local
      console.log(` [ANALYZE_LOCAL] Enviando ${filesToAnalyze.length} documentos al backend para análisis...`);
      
      const formData = new FormData();
      filesToAnalyze.forEach((file) => {
        formData.append('files', file, file.name);
      });

      const response = await fetch(`${API_BASE}/analysis/analyze-local`, {
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
      
      console.log(` [ANALYZE_LOCAL] Análisis completado:`, analysisResults);
      
      // 5) Procesar resultados: combinar todos los items en un resultado consolidado
      let consolidatedResults = {
        ok: true,
        documentos_analizados: 0,
        documentos_descartados: descartados,
        indicadores: {},
        indicadores_organizacionales: {},
        matrices: {},
        codigos_unspsc: [],
        experiencia_requerida: {},
        confianza: 0,
        mensaje: '',
        items: analysisResults.items || []
      };

      // Si hay items, consolidar indicadores
      if (analysisResults.items && analysisResults.items.length > 0) {
        console.log(` [DEBUG] analysisResults.items.length: ${analysisResults.items.length}`);
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
        console.log(` [DEBUG] successItems.length after filter: ${successItems.length}`);
        
        if (successItems.length > 0) {
          consolidatedResults.documentos_analizados = successItems.length;
          
          // Combinar indicadores de todos los documentos
          const allFinancial = {};
          const allOrganizational = {};
          const allMatrices = {};
          const allUnspsc = [];
          const allExperience = {};
          let totalConfidence = 0;
          
          successItems.forEach(item => {
            const res = item.resultado;
            
            //  NUEVO: Combinar matrices (si existen)
            if (res.matrices && typeof res.matrices === 'object' && Object.keys(res.matrices).length > 0) {
              Object.assign(allMatrices, res.matrices);
              console.log(`   Matrices encontradas:`, res.matrices);
            }
            
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
          
          consolidatedResults.matrices = allMatrices;
          consolidatedResults.indicadores = allFinancial;
          consolidatedResults.indicadores_organizacionales = allOrganizational;
          consolidatedResults.codigos_unspsc = allUnspsc;
          consolidatedResults.experiencia_requerida = allExperience;
          consolidatedResults.confianza = successItems.length > 0 ? totalConfidence / successItems.length : 0;
          
          // Si hay indicadores, mostrar mensaje de éxito
          const totalIndicators = Object.keys(allFinancial).length + Object.keys(allOrganizational).length + allUnspsc.length + Object.keys(allExperience).length + Object.keys(allMatrices).length;
          if (totalIndicators > 0) {
            consolidatedResults.mensaje = ` Se encontraron ${totalIndicators} indicadores y requisitos relevantes`;
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

      console.log(` [ANALYZE_LOCAL] Resultados consolidados:`, consolidatedResults);
      
      //  Si encontramos indicadores O matrices, paramos aquí (no continuamos analizando más)
      if (Object.keys(consolidatedResults.indicadores).length > 0 || Object.keys(consolidatedResults.indicadores_organizacionales).length > 0 || Object.keys(consolidatedResults.matrices).length > 0) {
        console.log(` [ANALYZE_LOCAL] Indicadores encontrados, parando búsqueda`);
      }
      
      setResults(consolidatedResults);
      setAnalyzed(true);
    } catch (e) {
      if (e.name === 'AbortError' || e.message === 'Análisis cancelado por el usuario') {
        console.log(' [ANALYZE_LOCAL] Análisis cancelado');
        setError(null);
      } else {
        console.error(` [ANALYZE_LOCAL] Error: ${e.message}`);
        setError(e.message || 'Error durante el análisis');
      }
    } finally {
      setAnalyzing(false);
    }
  }, []);  //  VACIO: No depende de ningún state porque useCallback maneja todo internamente

  // Cancelar análisis
  const cancel = useCallback(() => {
    console.log(' Cancelando análisis local...');
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

  //  NUEVO: Memoizar la función analyze para evitar ciclos infinitos
  const analyze = useCallback(() => {
    analyzeDocuments(docs);
  }, [docs, analyzeDocuments]);

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
    analyze,
    cancel,
  };
};

export default useLocalDocumentAnalysis;
