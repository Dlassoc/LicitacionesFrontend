/**
 * Hook para descargar documentos automáticamente y analizarlos con el backend
 * - Descarga PDFs
 * - Guarda en IndexedDB
 * - Envía al backend para análisis de indicadores financieros
 * - Retorna el documento más probable con indicadores
 * - ✅ NUEVO: Soporta cancelación cuando el componente se desmonta o el usuario sale
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import API_BASE from '../config/api.js';

const DB_NAME = 'LicitacionesDB';
const STORE_NAME = 'documentos';

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

// Construir URL de descarga (usa proxy del backend para URLs de SECOP)
const buildDownloadUrl = (url) => {
  try {
    const u = new URL(url);
    const isSecop = /secop|colombiacompra\.gov\.co/i.test(u.host);
    if (isSecop) {
      const q = u.searchParams.toString();
      return `${API_BASE}/secop/download${q ? `?${q}` : ""}`;
    }
  } catch (e) {
    // no-op, usar url tal cual si no es URL válida
  }
  return url;
};

// Descargar archivo desde URL
const downloadFile = async (url, filename, signal = null) => {
  try {
    if (!url) {
      throw new Error('URL no disponible');
    }

    // Usar proxy del backend si es URL de SECOP
    const downloadUrl = buildDownloadUrl(url);
    
    console.log(`📥 Descargando desde: ${downloadUrl}`);

    const fetchOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
      credentials: 'include',
    };
    
    // ✅ NUEVO: Agregar signal para poder cancelar
    if (signal) {
      fetchOptions.signal = signal;
    }

    const response = await fetch(downloadUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    if (blob.size === 0) {
      throw new Error('Archivo descargado está vacío');
    }

    return {
      filename,
      blob,
      size: blob.size,
      type: blob.type,
    };
  } catch (error) {
    throw new Error(`Error descargando ${filename}: ${error.message}`);
  }
};

// Enviar archivo al backend para análisis
const analyzeDocument = async (file, signal = null) => {
  const formData = new FormData();
  formData.append('files', file);

  const fetchOptions = {
    method: 'POST',
    body: formData,
  };
  
  // ✅ NUEVO: Agregar signal para poder cancelar
  if (signal) {
    fetchOptions.signal = signal;
  }

  console.log(`🚀 [ANALYZE_DOC] Iniciando fetch a ${API_BASE}/extract_ia/analyze`);
  const response = await fetch(`${API_BASE}/extract_ia/analyze`, fetchOptions);
  console.log(`📥 [ANALYZE_DOC] Respuesta recibida con status: ${response.status}`);

  if (!response.ok) {
    throw new Error(`Backend error: ${response.statusText}`);
  }

  console.log(`📖 [ANALYZE_DOC] Parseando JSON...`);
  const result = await response.json();
  console.log(`✅ [ANALYZE_DOC] JSON parseado:`, result);
  return result;
};

// Hook principal - Simplificado para un solo documento
export const useDocumentDownload = (documento, proceso) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(null); // Preview del documento
  const [error, setError] = useState(null);
  
  // ✅ NUEVO: References para cancelación
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const analysisCancelledRef = useRef(false); // ✅ NUEVO: Flag para rastrear si fue cancelado manualmente

  // ✅ NUEVO: Limpiar estado cuando cambia el documento o proceso (nueva licitación)
  useEffect(() => {
    console.log('🔄 [HOOK] Limpiando estado - nuevo documento o proceso detectado');
    setAnalyzed(null);
    setError(null);
    setAnalyzing(false);
    analysisCancelledRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [documento?.url, proceso]); // Se ejecuta si cambia la URL del documento o el proceso

  // ✅ NUEVO: Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancelar cualquier análisis en progreso
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('🛑 Análisis cancelado - componente desmontado');
      }
    };
  }, []);

  // Función para cancelar manualmente el análisis
  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('🛑 [CANCEL] Abortando requests en progreso...');
      abortControllerRef.current.abort();
      analysisCancelledRef.current = true; // ✅ NUEVO: Marcar como cancelado
      setAnalyzing(false);
      console.log('✅ [CANCEL] Análisis detenido y estado limpiado');
    } else {
      console.log('⚠️ [CANCEL] No hay AbortController activo');
    }
  }, []);

  const analyze = useCallback(async () => {
    if (!documento) {
      setError('No hay documento para analizar');
      return;
    }

    // ✅ NUEVO: Crear nuevo AbortController para este análisis
    abortControllerRef.current = new AbortController();
    analysisCancelledRef.current = false; // ✅ NUEVO: Reset del flag de cancelación

    setAnalyzing(true);
    setError(null);
    setAnalyzed(null);

    try {
      console.log(`📥 Leyendo documento: ${documento.titulo}`);
      console.log(`🔗 URL del documento: ${documento.url}`);
      
      // ✅ NUEVO: Pasar el signal al download
      const downloaded = await downloadFile(
        documento.url,
        documento.titulo,
        abortControllerRef.current.signal
      );

      // ✅ NUEVO: Verificar si fue cancelado
      if (analysisCancelledRef.current) {
        console.log('🛑 [ANALYZE] Cancelado durante descarga - abortando');
        return;
      }

      console.log(`✅ Archivo descargado: ${downloaded.size} bytes`);

      // Guardar en IndexedDB
      await saveDocumentToDB({
        titulo: documento.titulo,
        tipo: documento.tipo,
        fecha: documento.fecha,
        tamanio: documento.tamanio,
        proceso: proceso || 'unknown',
        url: documento.url,
        descargado: true,
      });

      // Enviar al backend para análisis
      const formData = new FormData();
      formData.append('files', new File([downloaded.blob], downloaded.filename, { type: downloaded.type }));

      console.log(`📤 Enviando al backend para análisis...`);

      // ✅ NUEVO: Pasar el signal al análisis
      const analysisResult = await analyzeDocument(
        new File([downloaded.blob], downloaded.filename, { type: downloaded.type }),
        abortControllerRef.current.signal
      );

      // ✅ NUEVO: Verificar si fue cancelado
      if (analysisCancelledRef.current) {
        console.log('🛑 Análisis cancelado durante procesamiento');
        return;
      }

      console.log('📊 Respuesta del backend:', analysisResult);

      if (analysisResult.ok && analysisResult.items && analysisResult.items[0]) {
        const analysisItem = analysisResult.items[0];
        
        console.log('📋 Item analizado:', analysisItem);

        if (analysisItem.ok) {
          // Mostrar snippet de contexto en consola para verificar lectura
          if (analysisItem.context_snippet) {
            console.log(`📝 Preview de texto (${documento.titulo}):\n${analysisItem.context_snippet}`);
          }

          console.log('🎯 Resultado completo:', analysisItem.resultado);

          const indicators = analysisItem.resultado?.indicadores_financieros || {};
          const confidence = analysisItem.resultado?.indicadores_confianza || 0;
          const unspsc = analysisItem.resultado?.codigos_unspsc || [];  // ✅ NUEVO: Capturar UNSPSC

          console.log('💰 Indicadores extraídos:', indicators);
          console.log('📊 Confianza:', confidence);
          console.log('📋 Códigos UNSPSC encontrados:', unspsc);  // ✅ NUEVO: Log de UNSPSC

          setAnalyzed({
            nombre: documento.titulo,
            archivo: analysisItem.archivo,
            paginasIndicadores: analysisItem.paginas_indicadores || [],
            paginasTotales: analysisItem.paginas_totales || 0,
            textPreview: analysisItem.context_snippet || '',
            indicadores: indicators,
            confianza: confidence,
            codigos_unspsc: unspsc,  // ✅ NUEVO: Pasar UNSPSC
            notas: analysisItem.resultado?.indicadores_notas || '',
            completo: analysisItem.resultado,
            ok: true,
          });
        } else {
          setError(analysisItem.error || 'Error al analizar el documento');
        }
      } else {
        setError('Respuesta inesperada del backend');
      }
    } catch (err) {
      // ✅ NUEVO: Ignorar errores si fue cancelado
      if (err.name === 'AbortError') {
        console.log('✅ [ANALYZE] AbortError capturado - análisis fue cancelado correctamente');
        return;
      }
      console.error(`❌ Error: ${err.message}`);
      setError(err.message || 'Error al procesar el documento');
    } finally {
      if (isMountedRef.current) {
        setAnalyzing(false);
      }
    }
  }, [documento, proceso]);

  return {
    analyzing,
    analyzed,
    error,
    analyze,
    analyzeMultipleDocs: useCallback(async (docs) => {
      if (!docs || docs.length === 0) {
        setError('No hay documentos para analizar');
        return;
      }

      // ✅ NUEVO: Crear nuevo AbortController para este análisis
      abortControllerRef.current = new AbortController();
      analysisCancelledRef.current = false; // ✅ NUEVO: Reset del flag de cancelación

      setAnalyzing(true);
      setError(null);
      setAnalyzed(null);

      try {
        // Ordenar documentos por probabilidad de contener indicadores
        // Prioridad: Estados Financieros > Balance > Indicadores > Otros
        const priorityKeywords = {
          'estados financieros': 3,
          'balance general': 3,
          'estado de resultados': 3,
          'estado financiero': 3,
          'indicadores': 2,
          'capacidad financiera': 2,
          'formato': 1,
          'anexo': 1,
          'estudio previo': 0, // Baja prioridad, no contiene indicadores financieros
        };

        const sortedDocs = [...docs].sort((a, b) => {
          // Calcular score por nombre/tipo
          const scoreA = Math.max(
            ...Object.entries(priorityKeywords).map(([keyword, score]) =>
              (a.titulo?.toLowerCase().includes(keyword) || a.tipo?.toLowerCase().includes(keyword)) ? score : 0
            )
          );
          const scoreB = Math.max(
            ...Object.entries(priorityKeywords).map(([keyword, score]) =>
              (b.titulo?.toLowerCase().includes(keyword) || b.tipo?.toLowerCase().includes(keyword)) ? score : 0
            )
          );
          
          // Si mismo score, ordenar por tamaño (documentos más grandes primero)
          if (scoreB !== scoreA) return scoreB - scoreA;
          const sizeA = parseInt(a.tamanio) || 0;
          const sizeB = parseInt(b.tamanio) || 0;
          return sizeB - sizeA;
        });

        console.log(`📋 Analizando ${sortedDocs.length} documentos (priorizando Estados Financieros)...`);
        console.log(`📄 Orden: ${sortedDocs.map(d => `${d.titulo} (score: ${Math.max(...Object.entries(priorityKeywords).map(([keyword, score]) => (d.titulo?.toLowerCase().includes(keyword) || d.tipo?.toLowerCase().includes(keyword)) ? score : 0))})`).join(' → ')}`);

        // Analizar UNO POR UNO todos los documentos
        let anyWithIndicators = false;
        
        for (let i = 0; i < sortedDocs.length; i++) {
          const doc = sortedDocs[i];
          console.log(`\n📄 [${i + 1}/${sortedDocs.length}] Analizando: ${doc.titulo}`);
          console.log(`   📊 Tamaño: ${doc.tamanio} bytes`);
          
          // ✅ NUEVO: Verificar si fue cancelado antes de procesar el siguiente doc
          if (analysisCancelledRef.current) {
            console.log('🛑 Análisis múltiple cancelado');
            return;
          }
          
          try {
            // ✅ NUEVO: Pasar el signal al download
            const downloaded = await downloadFile(
              doc.url,
              doc.titulo,
              abortControllerRef.current.signal
            );
            console.log(`✅ Descargado: ${downloaded.size} bytes (tipo: ${downloaded.type})`);

            const formData = new FormData();
            formData.append('files', new File([downloaded.blob], downloaded.filename, { type: downloaded.type }));

            console.log(`📤 Enviando al backend para extracción de indicadores...`);
            
            // ✅ NUEVO: Pasar el signal al análisis
            const analysisResult = await analyzeDocument(
              new File([downloaded.blob], downloaded.filename, { type: downloaded.type }),
              abortControllerRef.current.signal
            );

            console.log(`📊 Respuesta del backend:`, analysisResult);
            console.log(`   ✓ Estructura: ok=${analysisResult?.ok}, items=${analysisResult?.items?.length}`);

            if (analysisResult.ok && analysisResult.items && analysisResult.items[0]) {
              const analysisItem = analysisResult.items[0];
              console.log(`   ✓ Item analizado:`, analysisItem);

              if (analysisItem.ok) {
                const indicators = analysisItem.resultado?.indicadores_financieros || {};
                const confidence = analysisItem.resultado?.indicadores_confianza || 0;
                const unspsc = analysisItem.resultado?.codigos_unspsc || [];  // ✅ NUEVO: Capturar UNSPSC
                const hasIndicators = Object.keys(indicators).length > 0 && confidence > 0.5;

                console.log(`   💰 Indicadores encontrados: ${Object.keys(indicators).length}`);
                console.log(`   📊 Confianza: ${confidence.toFixed(2)}`);
                console.log(`   📋 Códigos UNSPSC encontrados: ${unspsc.length}`);  // ✅ NUEVO: Log de UNSPSC
                console.log(`   🔍 Contiene indicadores reales: ${hasIndicators}`);

                // Si encontró indicadores con confianza > 50%, usar este y PARAR
                if (hasIndicators) {
                  console.log(`\n🎉 ¡Indicadores reales encontrados en: ${doc.titulo}!`);
                  console.log(`✅ Análisis completado exitosamente (después de ${i + 1}/${sortedDocs.length} documentos)`);
                  
                  setAnalyzed({
                    nombre: doc.titulo,
                    archivo: analysisItem.archivo,
                    paginasIndicadores: analysisItem.paginas_indicadores || [],
                    paginasTotales: analysisItem.paginas_totales || 0,
                    textPreview: analysisItem.context_snippet || '',
                    indicadores: indicators,
                    confianza: confidence,
                    codigos_unspsc: unspsc,  // ✅ NUEVO: Pasar UNSPSC
                    notas: analysisItem.resultado?.indicadores_notas || '',
                    completo: analysisItem.resultado,
                    ok: true,
                  });
                  anyWithIndicators = true;
                  if (isMountedRef.current) {
                    setAnalyzing(false);
                  }
                  return; // PARAR después de encontrar el primero con indicadores reales
                } else {
                  console.log(`⚠️ Sin indicadores financieros relevantes en este documento - continuando...`);
                  // Continuar con el siguiente
                }
              } else {
                console.warn(`   ⚠️ Error procesando item:`, analysisItem.error || analysisItem);
              }
            } else {
              console.warn(`   ⚠️ Respuesta inesperada:`, {
                ok: analysisResult.ok,
                items: analysisResult.items ? `${analysisResult.items.length} items` : 'sin items',
                response: analysisResult
              });
            }
          } catch (err) {
            // ✅ NUEVO: Ignorar errores si fue cancelado
            if (err.name === 'AbortError') {
              console.log('✅ [MULTI-ANALYZE] AbortError capturado - análisis múltiple fue cancelado correctamente');
              return;
            }
            console.warn(`⚠️ Error analizando ${doc.titulo}: ${err.message}`);
            continue; // Continuar con el siguiente
          }
        }

        // Si llegó aquí, analizó TODOS y NO encontró indicadores reales
        console.log(`\n❌ Se analizaron todos los ${sortedDocs.length} documentos sin encontrar indicadores financieros reales`);
        
        if (isMountedRef.current) {
          setAnalyzed({
            nombre: 'Análisis completado sin indicadores',
            archivo: '',
            paginasIndicadores: [],
            paginasTotales: 0,
            textPreview: '',
            indicadores: {}, // vacío
            confianza: 0,
            notas: `Se analizaron ${sortedDocs.length} documento(s) pero no se encontraron indicadores financieros reales. Los documentos pueden no contener estados financieros o información de capacidad financiera.`,
            completo: {},
            ok: true,
            noIndicatorsFound: true, // Flag para identificar este estado
          });
          setAnalyzing(false);
        }
      } catch (err) {
        // ✅ NUEVO: Ignorar errores si fue cancelado
        if (err.name === 'AbortError') {
          console.log('✅ [MULTI-ANALYZE] Análisis múltiple fue cancelado (AbortError capturado en nivel superior)');
          return;
        }
        console.error(`❌ Error en análisis múltiple: ${err.message}`);
        if (isMountedRef.current) {
          setError(err.message || 'Error al procesar documentos');
          setAnalyzing(false);
        }
      }
    }, []),
  };

  return {
    analyzing,
    analyzed,
    error,
    analyze,
    analyzeMultipleDocs,
    cancel: cancelAnalysis, // ✅ NUEVO: Exponer función para cancelar análisis
  };
};