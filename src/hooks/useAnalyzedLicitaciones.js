import { useState, useCallback } from 'react';
import API_BASE_URL from '../config/api';

/**
 * 🆕 Hook para cargar licitaciones ya analizadas desde BD local
 * 
 * Optimización: En lugar de consultar la API de SECOP nuevamente,
 * cargamos las licitaciones que ya analizamos y guardamos en BD.
 * 
 * Esto es útil para:
 * - Cargar resultados instantáneamente al iniciar la aplicación
 * - Evitar consultas innecesarias a la API
 * - Mostrar análisis previos sin esperar
 */
export const useAnalyzedLicitaciones = () => {
  const [analyzedLicitaciones, setAnalyzedLicitaciones] = useState([]);
  const [loadingAnalyzed, setLoadingAnalyzed] = useState(false);
  const [errorAnalyzed, setErrorAnalyzed] = useState(null);

  const loadAnalyzed = useCallback(async (onlyAptas = false) => {
    try {
      setLoadingAnalyzed(true);
      setErrorAnalyzed(null);

      console.log(`
╔════════════════════════════════════════════════════════════╗
║ 📦 CARGANDO LICITACIONES ANALIZADAS DESDE BD LOCAL
║ (Sin consultar API de SECOP)
╠════════════════════════════════════════════════════════════╣
║ Buscando en: licitaciones_analisis
║ Solo aptas: ${onlyAptas ? 'SÍ' : 'NO'}
╚════════════════════════════════════════════════════════════╝
      `);

      const params = new URLSearchParams();
      params.append('limit', 100);
      params.append('offset', 0);
      if (onlyAptas) params.append('only_aptas', 'true');

      const response = await fetch(`${API_BASE_URL}/saved/analyzed?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      const data = await response.json();

      if (data.ok && Array.isArray(data.licitaciones)) {
        // 🆕 Normalizar datos: convertir cumple a booleano/null
        const normalized = data.licitaciones.map(lic => {
          let cumple_normalized = lic.cumple;
          
          // Si cumple es un número, convertir a booleano
          if (typeof cumple_normalized === 'number') {
            if (cumple_normalized > 0) {
              cumple_normalized = true;
            } else if (cumple_normalized === 0) {
              cumple_normalized = null; // 0 = sin analizar
            } else {
              cumple_normalized = false;
            }
          }
          
          return {
            ...lic,
            cumple: cumple_normalized
          };
        });

        console.log(`
╔════════════════════════════════════════════════════════════╗
║ ✅ LICITACIONES ANALIZADAS CARGADAS DE BD LOCAL
╠════════════════════════════════════════════════════════════╣
║ 📊 Total encontradas: ${normalized.length}
║ 💾 Origen: Tabla licitaciones_analisis (BD propia)
║ ⚡ Velocidad: Instantáneo (sin API)
╠════════════════════════════════════════════════════════════╣
        `);

        // Mostrar desglose
        const cumplen = normalized.filter(l => l.cumple === true).length;
        const noCumplen = normalized.filter(l => l.cumple === false).length;
        const sinAnalizar = normalized.filter(l => l.cumple === null).length;

        console.log(`║ ✅ Cumplen requisitos: ${cumplen}`);
        console.log(`║ ❌ No cumplen: ${noCumplen}`);
        console.log(`║ ⏳ Sin analizar: ${sinAnalizar}`);
        console.log(`╚════════════════════════════════════════════════════════════╝
        `);

        // Log detallado
        normalized.forEach((lic, idx) => {
          const status = lic.cumple === true ? '✅' : lic.cumple === false ? '❌' : '⏳';
          const porcentaje = lic.porcentaje ? ` (${lic.porcentaje.toFixed(0)}%)` : '';
          const id = lic.id_portafolio || lic.id || '';
          console.log(`[ANALYZED] [${idx + 1}] ${status} ${id}${porcentaje}`);
        });

        setAnalyzedLicitaciones(normalized);
        return normalized;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error(`
╔════════════════════════════════════════════════════════════╗
║ ❌ ERROR CARGANDO LICITACIONES ANALIZADAS
╠════════════════════════════════════════════════════════════╣
║ Error: ${error.message}
╚════════════════════════════════════════════════════════════╝
      `, error);
      setErrorAnalyzed(error.message);
      setAnalyzedLicitaciones([]);
      return [];
    } finally {
      setLoadingAnalyzed(false);
    }
  }, []);

  const clearAnalyzed = useCallback(() => {
    setAnalyzedLicitaciones([]);
    setErrorAnalyzed(null);
  }, []);

  return {
    analyzedLicitaciones,
    loadingAnalyzed,
    errorAnalyzed,
    loadAnalyzed,
    clearAnalyzed
  };
};
