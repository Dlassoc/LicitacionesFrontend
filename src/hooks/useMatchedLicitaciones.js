// src/hooks/useMatchedLicitaciones.js
/**
 * 🆕 Hook para cargar y gestionar licitaciones aptas (que cumplen requisitos).
 * Automaticamente carga las licitaciones guardadas como "aptas" cuando el usuario inicia sesión.
 * 
 * Retorna:
 * - matchedLicitaciones: Array de licitaciones aptas guardadas
 * - loadingMatched: Boolean indicando si se están cargando
 * - errorMatched: String con mensaje de error (si aplica)
 * - loadMatched: Función para recargar las licitaciones aptas
 * - clearMatched: Función para limpiar el estado
 */

import { useState, useCallback, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export function useMatchedLicitaciones() {
  const [matchedLicitaciones, setMatchedLicitaciones] = useState([]);
  const [loadingMatched, setLoadingMatched] = useState(false);
  const [errorMatched, setErrorMatched] = useState(null);

  /**
   * 🆕 Carga las licitaciones aptas del usuario desde el backend
   * @param {string} searchQuery - Palabra clave opcional para filtrar
   */
  const loadMatched = useCallback(async (searchQuery = null) => {
    try {
      setLoadingMatched(true);
      setErrorMatched(null);

      console.log(`
╔════════════════════════════════════════════════════════════╗
║ 📥 CARGANDO LICITACIONES APTAS QUE CUMPLEN REQUISITOS
╚════════════════════════════════════════════════════════════╝
      `);

      // 🆕 Construir URL con parámetro search_query si existe
      const url = new URL(`${API_BASE}/saved/matched`);
      if (searchQuery) {
        url.searchParams.append('search_query', searchQuery);
        console.log(`[MATCHED] Filtrando por palabra clave: ${searchQuery}`);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      const data = await response.json();

      if (data.ok && Array.isArray(data.licitaciones)) {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║ ✅ LICITACIONES APTAS CARGADAS EXITOSAMENTE
╠════════════════════════════════════════════════════════════╣
║ 📊 Total: ${data.licitaciones.length} licitaciones que CUMPLEN
║ 💰 Indicadores guardados: SÍ (en requisitos_extraidos)
║ 📈 Listas para mostrar con scores
╚════════════════════════════════════════════════════════════╝
        `);
        
        // Log detallado de cada licitación
        data.licitaciones.forEach((lic, idx) => {
          console.log(`[MATCHED] [${idx + 1}] ${lic.referencia || lic.id_portafolio} - Score: ${lic.score}%`);
        });
        
        setMatchedLicitaciones(data.licitaciones);
        return data.licitaciones;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error(`
╔════════════════════════════════════════════════════════════╗
║ ❌ ERROR CARGANDO LICITACIONES APTAS
╠════════════════════════════════════════════════════════════╣
║ Error: ${error.message}
╚════════════════════════════════════════════════════════════╝
      `, error);
      setErrorMatched(error.message);
      setMatchedLicitaciones([]);
      return [];
    } finally {
      setLoadingMatched(false);
    }
  }, []);

  /**
   * 🆕 Limpia el estado de licitaciones aptas
   */
  const clearMatched = useCallback(() => {
    setMatchedLicitaciones([]);
    setErrorMatched(null);
  }, []);

  return {
    matchedLicitaciones,
    loadingMatched,
    errorMatched,
    loadMatched,
    clearMatched
  };
}
