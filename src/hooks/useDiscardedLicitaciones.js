// src/hooks/useDiscardedLicitaciones.js
import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../config/httpClient.js';

/**
 * Hook para gestionar licitaciones descartadas (no interesa).
 */
export function useDiscardedLicitaciones() {
  const [discarded, setDiscarded] = useState([]);
  const [discardedIds, setDiscardedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carga todas las licitaciones descartadas del usuario
   */
  const loadDiscarded = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiGet('/saved/discarded');

      if (data.ok) {
        setDiscarded(data.licitaciones || []);
        setDiscardedIds(new Set(data.licitaciones.map(l => l.id_portafolio)));
        console.log(`[DISCARDED] ${data.licitaciones.length} licitaciones descartadas cargadas`);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('[DISCARDED] Error cargando descartadas:', err);
      if (err.status === 401) {
        setError('Debes iniciar sesión');
        setDiscarded([]);
        setDiscardedIds(new Set());
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Descarta una licitación (la marca como no interesa)
   */
  const discardLicitacion = useCallback(async (licitacion) => {
    try {
      const idPortafolio = licitacion.ID_Portafolio || licitacion.id_del_portafolio;

      console.log(`[DISCARDED] Descartando: ${idPortafolio}`);

      const result = await apiPost('/saved/discarded', {
        id_portafolio: idPortafolio,
        referencia: licitacion.Referencia || licitacion.referencia_del_proceso || idPortafolio,
        entidad: licitacion.Entidad || licitacion.entidad || '',
        objeto_contratar: licitacion.Nombre || licitacion.nombre_del_procedimiento || '',
        razon: 'Descartada por usuario'
      });

      if (result.ok) {
        setDiscardedIds(prev => new Set([...prev, idPortafolio]));
        setDiscarded(prev => [...prev, {
          id_portafolio: idPortafolio,
          referencia: licitacion.Referencia || licitacion.referencia_del_proceso,
          entidad: licitacion.Entidad || licitacion.entidad,
          objeto_contratar: licitacion.Nombre || licitacion.nombre_del_procedimiento,
          razon_descarte: 'Descartada por usuario',
          created_at: new Date().toISOString()
        }]);

        console.log(`[DISCARDED] Licitación descartada: ${idPortafolio}`);
        return true;
      }
    } catch (err) {
      console.error('[DISCARDED] Error descartando:', err);
    }
    return false;
  }, []);

  /**
   * Verifica si una licitación fue descartada
   */
  const isDiscarded = useCallback((licitacionId) => {
    return discardedIds.has(licitacionId);
  }, [discardedIds]);

  /**
   * Restaura una licitación descartada
   */
  const restoreDiscarded = useCallback(async (idPortafolio) => {
    try {
      console.log(`[DISCARDED] Restaurando: ${idPortafolio}`);

      const result = await apiDelete(`/saved/discarded/${encodeURIComponent(idPortafolio)}`);

      if (result.ok) {
        setDiscardedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(idPortafolio);
          return newSet;
        });
        setDiscarded(prev => prev.filter(l => l.id_portafolio !== idPortafolio));

        console.log(`[DISCARDED] Licitación restaurada: ${idPortafolio}`);
        return true;
      }
    } catch (err) {
      console.error('[DISCARDED] Error restaurando:', err);
    }
    return false;
  }, []);

  return {
    discarded,
    discardedIds,
    loading,
    error,
    loadDiscarded,
    discardLicitacion,
    restoreDiscarded,
    isDiscarded
  };
}
