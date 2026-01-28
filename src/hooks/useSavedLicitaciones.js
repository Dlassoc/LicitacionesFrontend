// src/hooks/useSavedLicitaciones.js
import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

/**
 * Hook para gestionar licitaciones guardadas (favoritos).
 * 
 * @returns {Object} { saved, loading, error, saveLicitacion, unsaveLicitacion, checkIfSaved, loadSaved }
 */
export function useSavedLicitaciones() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());

  /**
   * Carga todas las licitaciones guardadas del usuario
   */
  const loadSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/saved`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.status === 401) {
        setError('Debes iniciar sesión para ver tus licitaciones guardadas');
        setSaved([]);
        setSavedIds(new Set());
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.ok) {
        setSaved(data.licitaciones || []);
        // Actualizar Set de IDs para búsquedas rápidas
        setSavedIds(new Set(data.licitaciones.map(l => l.id_portafolio)));
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      setError(err.message);
      setSaved([]);
      setSavedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Guarda una licitación
   */
  const saveLicitacion = useCallback(async (licitacion) => {
    setError(null);
    
    try {
      const payload = {
        id_portafolio: licitacion.id_portafolio || licitacion.ID_Portafolio,
        nombre: licitacion.nombre || licitacion.Nombre_del_Proceso || licitacion.nombre_del_proceso,
        entidad: licitacion.entidad || licitacion.Entidad,
        fase: licitacion.fase || licitacion.Fase || licitacion.Estado,
        precio: licitacion.precio || licitacion.Precio_base || licitacion.precio_base,
        departamento: licitacion.departamento || licitacion.Departamento_de_la_entidad,
        ciudad: licitacion.ciudad || licitacion.Ciudad_entidad,
        url: licitacion.url || licitacion.urlproceso?.url || licitacion.URL_Proceso,
        metadata: licitacion
      };
      
      const response = await fetch(`${API_BASE}/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error guardando licitación');
      }
      
      const data = await response.json();
      
      if (data.ok) {
        // Actualizar estado local
        const id = licitacion.id_portafolio || licitacion.ID_Portafolio;
        setSavedIds(prev => new Set([...prev, id]));
        return true;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Elimina una licitación guardada
   */
  const unsaveLicitacion = useCallback(async (idPortafolio) => {
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/saved/${encodeURIComponent(idPortafolio)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error eliminando licitación');
      }
      
      const data = await response.json();
      
      if (data.ok) {
        // Actualizar estado local
        setSaved(prev => prev.filter(l => l.id_portafolio !== idPortafolio));
        setSavedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(idPortafolio);
          return newSet;
        });
        return true;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Verifica si una licitación está guardada (usa caché local)
   */
  const checkIfSaved = useCallback((idPortafolio) => {
    return savedIds.has(idPortafolio);
  }, [savedIds]);
  
  /**
   * Actualiza optimísticamente el estado de guardado antes de la llamada al servidor
   */
  const toggleSavedIdOptimistic = useCallback((idPortafolio, shouldSave) => {
    setSavedIds(prev => {
      const newSet = new Set(prev);
      if (shouldSave) {
        newSet.add(idPortafolio);
      } else {
        newSet.delete(idPortafolio);
      }
      return newSet;
    });
  }, []);

  return {
    saved,
    loading,
    error,
    saveLicitacion,
    unsaveLicitacion,
    checkIfSaved,
    loadSaved,
    savedIds,
    toggleSavedIdOptimistic
  };
}
