// src/hooks/useDiscardedLicitaciones.js
import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

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
      const response = await fetch(`${API_BASE}/saved/discarded`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.status === 401) {
        setError('Debes iniciar sesión');
        setDiscarded([]);
        setDiscardedIds(new Set());
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.ok) {
        setDiscarded(data.licitaciones || []);
        setDiscardedIds(new Set(data.licitaciones.map(l => l.id_portafolio)));
        console.log(`[DISCARDED] 🗑️  ${data.licitaciones.length} licitaciones descartadas cargadas`);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('[DISCARDED]  Error cargando descartadas:', err);
      setError(err.message);
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
      
      console.log(`[DISCARDED] 🗑️  Descartando: ${idPortafolio}`);
      
      const response = await fetch(`${API_BASE}/saved/discarded`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_portafolio: idPortafolio,
          referencia: licitacion.Referencia || licitacion.referencia_del_proceso || idPortafolio,
          entidad: licitacion.Entidad || licitacion.entidad || '',
          objeto_contratar: licitacion.Nombre || licitacion.nombre_del_procedimiento || '',
          razon: 'Descartada por usuario'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      if (result.ok) {
        // Actualizar estado local
        setDiscardedIds(prev => new Set([...prev, idPortafolio]));
        setDiscarded(prev => [...prev, {
          id_portafolio: idPortafolio,
          referencia: licitacion.Referencia || licitacion.referencia_del_proceso,
          entidad: licitacion.Entidad || licitacion.entidad,
          objeto_contratar: licitacion.Nombre || licitacion.nombre_del_procedimiento,
          razon_descarte: 'Descartada por usuario',
          created_at: new Date().toISOString()
        }]);
        
        console.log(`[DISCARDED] ✅ Licitación descartada: ${idPortafolio}`);
        return true;
      }
    } catch (err) {
      console.error('[DISCARDED]  Error descartando:', err);
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
      console.log(`[DISCARDED] 🔄 Restaurando: ${idPortafolio}`);
      
      const response = await fetch(`${API_BASE}/saved/discarded/${encodeURIComponent(idPortafolio)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      if (result.ok) {
        // Actualizar estado local
        setDiscardedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(idPortafolio);
          return newSet;
        });
        setDiscarded(prev => prev.filter(l => l.id_portafolio !== idPortafolio));
        
        console.log(`[DISCARDED] ✅ Licitación restaurada: ${idPortafolio}`);
        return true;
      }
    } catch (err) {
      console.error('[DISCARDED]  Error restaurando:', err);
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
