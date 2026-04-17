/**
 * Hook para consultar el estado de análisis batch de una licitación específica.
 * Permite cargar análisis ya completados sin necesidad de re-analizarlos.
 */

import { useState, useEffect } from 'react';
import { apiGet } from '../config/httpClient.js';
import API_BASE_URL from '../config/api.js';
import { devLog } from '../utils/devLog.js';

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
        const data = await apiGet(
          `/analysis/batch/status/${encodeURIComponent(idPortafolio)}`,
          { headers: { 'Accept': 'application/json' } }
        );

        devLog(`[BATCH-STATUS] Estado para ${idPortafolio}:`, data);
        setStatus(data);
      } catch (err) {
        console.error(`[BATCH-STATUS] Error consultando estado para ${idPortafolio}:`, err);
        let errorMsg = err.message;
        if (err.message.includes('Failed to fetch')) {
          errorMsg = `Conexión rechazada. Backend en ${API_BASE_URL} no responde.`;
        }
        setError(errorMsg);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [idPortafolio]);

  return { status, loading, error };
};
