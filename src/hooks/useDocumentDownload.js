/**
 * Hook para descargar documentos automáticamente y analizarlos con el backend
 * - Descarga PDFs
 * - Guarda en IndexedDB
 * - Envía al backend para análisis de indicadores financieros
 * - Retorna el documento más probable con indicadores
 */

import { useEffect, useState, useCallback } from 'react';
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
const downloadFile = async (url, filename) => {
  try {
    if (!url) {
      throw new Error('URL no disponible');
    }

    // Usar proxy del backend si es URL de SECOP
    const downloadUrl = buildDownloadUrl(url);
    
    console.log(`📥 Descargando desde: ${downloadUrl}`);

    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
      credentials: 'include',
    });

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
const analyzeDocument = async (file) => {
  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch(`${API_BASE}/extract_ia/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
};

// Hook principal - Simplificado para un solo documento
export const useDocumentDownload = (documento, proceso) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(null); // Preview del documento
  const [error, setError] = useState(null);

  const analyze = useCallback(async () => {
    if (!documento) {
      setError('No hay documento para analizar');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalyzed(null);

    try {
      console.log(`📥 Leyendo documento: ${documento.titulo}`);
      console.log(`🔗 URL del documento: ${documento.url}`);
      
      // Descargar el archivo
      const downloaded = await downloadFile(documento.url, documento.titulo);

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

      const analysisResult = await fetch(`${API_BASE}/extract_ia/analyze`, {
        method: 'POST',
        body: formData,
      }).then((res) => res.json());

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

          console.log('💰 Indicadores extraídos:', indicators);
          console.log('📊 Confianza:', confidence);

          setAnalyzed({
            nombre: documento.titulo,
            archivo: analysisItem.archivo,
            paginasIndicadores: analysisItem.paginas_indicadores || [],
            paginasTotales: analysisItem.paginas_totales || 0,
            textPreview: analysisItem.context_snippet || '',
            indicadores: indicators,
            confianza: confidence,
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
      console.error(`❌ Error: ${err.message}`);
      setError(err.message || 'Error al procesar el documento');
    } finally {
      setAnalyzing(false);
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

      setAnalyzing(true);
      setError(null);
      setAnalyzed(null);

      try {
        // Ordenar por tamaño (menor primero)
        const sortedDocs = [...docs].sort((a, b) => {
          const sizeA = parseInt(a.tamanio) || Infinity;
          const sizeB = parseInt(b.tamanio) || Infinity;
          return sizeA - sizeB;
        });

        console.log(`📋 Analizando ${sortedDocs.length} documentos ordenados por tamaño...`);

        // Analizar uno por uno hasta encontrar indicadores
        for (let i = 0; i < sortedDocs.length; i++) {
          const doc = sortedDocs[i];
          console.log(`\n📄 [${i + 1}/${sortedDocs.length}] Analizando: ${doc.titulo}`);
          
          try {
            const downloaded = await downloadFile(doc.url, doc.titulo);
            console.log(`✅ Descargado: ${downloaded.size} bytes`);

            const formData = new FormData();
            formData.append('files', new File([downloaded.blob], downloaded.filename, { type: downloaded.type }));

            const analysisResult = await fetch(`${API_BASE}/extract_ia/analyze`, {
              method: 'POST',
              body: formData,
            }).then((res) => res.json());

            if (analysisResult.ok && analysisResult.items && analysisResult.items[0]) {
              const analysisItem = analysisResult.items[0];

              if (analysisItem.ok) {
                const indicators = analysisItem.resultado?.indicadores_financieros || {};
                const hasIndicators = Object.keys(indicators).length > 0;

                console.log(`💰 Indicadores encontrados: ${hasIndicators ? Object.keys(indicators).length : 0}`);

                // Si encontró indicadores, parar aquí
                if (hasIndicators) {
                  console.log(`🎉 ¡Indicadores encontrados en: ${doc.titulo}!`);
                  
                  setAnalyzed({
                    nombre: doc.titulo,
                    archivo: analysisItem.archivo,
                    paginasIndicadores: analysisItem.paginas_indicadores || [],
                    paginasTotales: analysisItem.paginas_totales || 0,
                    textPreview: analysisItem.context_snippet || '',
                    indicadores: indicators,
                    confianza: analysisItem.resultado?.indicadores_confianza || 0,
                    notas: analysisItem.resultado?.indicadores_notas || '',
                    completo: analysisItem.resultado,
                    ok: true,
                  });
                  setAnalyzing(false);
                  return; // Parar el análisis
                }
              }
            }
          } catch (err) {
            console.warn(`⚠️ Error analizando ${doc.titulo}: ${err.message}`);
            continue; // Continuar con el siguiente
          }
        }

        // Si llegó aquí, no encontró indicadores en ninguno
        // En lugar de error, mostrar como "analyzed" pero sin indicadores
        setAnalyzed({
          nombre: 'Análisis completado',
          archivo: '',
          paginasIndicadores: [],
          paginasTotales: 0,
          textPreview: '',
          indicadores: {}, // vacío
          confianza: 0,
          notas: 'No se encontraron indicadores financieros relevantes en ninguno de los documentos analizados. Los indicadores financieros pueden no ser relevantes para esta postulación.',
          completo: {},
          ok: true,
          noIndicatorsFound: true, // Flag para identificar este estado
        });
        setAnalyzing(false);
      } catch (err) {
        console.error(`❌ Error en análisis múltiple: ${err.message}`);
        setError(err.message || 'Error al procesar documentos');
        setAnalyzing(false);
      }
    }, []),
  };
};
