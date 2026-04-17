// src/hooks/useDiscardedLicitaciones.js
import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../config/httpClient.js';
import { devLog } from '../utils/devLog.js';
import { useFetchResource } from './useFetchResource.js';

/**
 * Hook para gestionar licitaciones descartadas (no interesa).
 */
export function useDiscardedLicitaciones() {
  const {
    data: discarded,
    setData: setDiscarded,
    loading,
    error,
    setError,
    load,
  } = useFetchResource({ initialData: [] });
  const [discardedIds, setDiscardedIds] = useState(new Set());

  /**
   * Carga todas las licitaciones descartadas del usuario
   */
  const loadDiscarded = useCallback(async () => {
    try {
      await load(async () => {
        const data = await apiGet('/saved/discarded');

        if (!data.ok) {
          throw new Error(data.error || 'Error desconocido');
        }

        const licitaciones = data.licitaciones || [];
        setDiscardedIds(new Set(licitaciones.map(l => l.id_portafolio)));
        devLog(`[DISCARDED] ${licitaciones.length} licitaciones descartadas cargadas`);
        return licitaciones;
      });
    } catch (err) {
      console.error('[DISCARDED] Error cargando descartadas:', err);
      if (err.status === 401) {
        setError('Debes iniciar sesión');
        setDiscarded([]);
        setDiscardedIds(new Set());
      } else {
        setError(err.message || 'Error desconocido');
      }
      return [];
    }
  }, [load, setDiscarded, setError]);

  /**
   * Descarta una licitación (la marca como no interesa)
   */
  const discardLicitacion = useCallback(async (licitacion) => {
    try {
      const idPortafolio = licitacion.ID_Portafolio || licitacion.id_del_portafolio;

      devLog(`[DISCARDED] Descartando: ${idPortafolio}`);

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

        devLog(`[DISCARDED] Licitación descartada: ${idPortafolio}`);
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
      devLog(`[DISCARDED] Restaurando: ${idPortafolio}`);

      const result = await apiDelete(`/saved/discarded/${encodeURIComponent(idPortafolio)}`);

      if (result.ok) {
        setDiscardedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(idPortafolio);
          return newSet;
        });
        setDiscarded(prev => prev.filter(l => l.id_portafolio !== idPortafolio));

        devLog(`[DISCARDED] Licitación restaurada: ${idPortafolio}`);
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
