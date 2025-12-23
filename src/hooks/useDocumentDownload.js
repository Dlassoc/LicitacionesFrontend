/**
 * Hook para descargar documentos automáticamente y analizarlos con el backend
 * - Descarga PDFs
 * - Guarda en IndexedDB
 * - Envía al backend para análisis de indicadores financieros
 * - Retorna el documento con indicadores
 * -  Soporta cancelación cuando el componente se desmonta o el usuario sale
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  downloadFile,
  analyzeDocument,
  saveDocumentToDB,
  extractIndicatorsFromAnalysisItem,
} from './utils/documentUtils.js';

// Hook principal - Simplificado para un solo documento
export const useDocumentDownload = (documento, proceso) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(null); // Preview del documento
  const [error, setError] = useState(null);
  
  //  NUEVO: References para cancelación
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const analysisCancelledRef = useRef(false); //  NUEVO: Flag para rastrear si fue cancelado manualmente

  //  NUEVO: Limpiar estado cuando cambia el documento o proceso (nueva licitación)
  useEffect(() => {
    console.log(' [HOOK] Limpiando estado - nuevo documento o proceso detectado');
    setAnalyzed(null);
    setError(null);
    setAnalyzing(false);
    analysisCancelledRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [documento?.url, proceso]); // Se ejecuta si cambia la URL del documento o el proceso

  //  NUEVO: Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancelar cualquier análisis en progreso
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log(' Análisis cancelado - componente desmontado');
      }
    };
  }, []);

  // Función para cancelar manualmente el análisis
  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      console.log(' [CANCEL] Abortando requests en progreso...');
      abortControllerRef.current.abort();
      analysisCancelledRef.current = true; //  NUEVO: Marcar como cancelado
      setAnalyzing(false);
      console.log(' [CANCEL] Análisis detenido y estado limpiado');
    } else {
      console.log(' [CANCEL] No hay AbortController activo');
    }
  }, []);

  const analyze = useCallback(async () => {
    if (!documento) {
      setError('No hay documento para analizar');
      return;
    }

    //  NUEVO: Crear nuevo AbortController para este análisis
    abortControllerRef.current = new AbortController();
    analysisCancelledRef.current = false; //  NUEVO: Reset del flag de cancelación

    setAnalyzing(true);
    setError(null);
    setAnalyzed(null);

    try {
      console.log(` Leyendo documento: ${documento.titulo}`);
      console.log(` URL del documento: ${documento.url}`);
      
      //  NUEVO: Pasar el signal al download
      const downloaded = await downloadFile(
        documento.url,
        documento.titulo,
        abortControllerRef.current.signal
      );

      //  NUEVO: Verificar si fue cancelado
      if (analysisCancelledRef.current) {
        console.log(' [ANALYZE] Cancelado durante descarga - abortando');
        return;
      }

      console.log(` Archivo descargado: ${downloaded.size} bytes`);

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
      formData.append('files', downloaded);

      console.log(` Enviando al backend para análisis...`);

      //  NUEVO: Pasar el signal al análisis
      const analysisResult = await analyzeDocument(
        downloaded,
        abortControllerRef.current.signal
      );

      //  NUEVO: Verificar si fue cancelado
      if (analysisCancelledRef.current) {
        console.log(' Análisis cancelado durante procesamiento');
        return;
      }

      console.log(' Respuesta del backend:', analysisResult);

      if (analysisResult.ok && analysisResult.items && analysisResult.items[0]) {
        const analysisItem = analysisResult.items[0];
        
        console.log(' Item analizado:', analysisItem);

        if (analysisItem.ok) {
          // Mostrar snippet de contexto en consola para verificar lectura
          if (analysisItem.context_snippet) {
            console.log(` Preview de texto (${documento.titulo}):\n${analysisItem.context_snippet}`);
          }

          console.log(' Resultado completo:', analysisItem.resultado);

          // Extraer todos los indicadores usando función compartida
          const analyzed = extractIndicatorsFromAnalysisItem(analysisItem);
          analyzed.nombre = documento.titulo; // Usar título original del documento

          console.log(' Indicadores financieros extraídos:', analyzed.indicadores);
          console.log(' Indicadores organizacionales extraídos:', analyzed.indicadoresOrganizacionales);
          console.log(' Confianza:', analyzed.confianza);
          console.log(' Códigos UNSPSC encontrados:', analyzed.codigos_unspsc);
          console.log(' Experiencia encontrada:', analyzed.experiencia_encontrada);

          setAnalyzed(analyzed);
        } else {
          setError(analysisItem.error || 'Error al analizar el documento');
        }
      } else {
        setError('Respuesta inesperada del backend');
      }
    } catch (err) {
      //  NUEVO: Ignorar errores si fue cancelado
      if (err.name === 'AbortError') {
        console.log(' [ANALYZE] AbortError capturado - análisis fue cancelado correctamente');
        return;
      }
      console.error(` Error: ${err.message}`);
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
    cancel: cancelAnalysis,
  };
};

