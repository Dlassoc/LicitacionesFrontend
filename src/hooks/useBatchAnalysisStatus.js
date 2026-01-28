/**
 * Hook para consultar el estado de análisis batch de una licitación específica.
 * Permite cargar análisis ya completados sin necesidad de re-analizarlos.
 */

import { useState, useEffect } from 'react';
import API_BASE from '../config/api.js';

export const useBatchAnalysisStatus = (idPortafolio) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!idPortafolio) {
      setStatus(null);
      return;
    }

    const fetchStatus = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE}/analysis/batch/status/${idPortafolio}`,
          {
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        console.log(`[BATCH-STATUS] Estado para ${idPortafolio}:`, data);
        
        setStatus(data);
      } catch (err) {
        console.error(`[BATCH-STATUS] Error consultando estado:`, err);
        setError(err.message);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [idPortafolio]);

  return { status, loading, error };
};
