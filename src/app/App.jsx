import React, { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header.jsx";
import ResultsPanel from "../components/ResultsPanel.jsx";
import ResultModal from "../components/ResultModal.jsx";
import { useSearchResults } from "../features/hooks.js";
import { useSavedLicitaciones } from "../hooks/useSavedLicitaciones.js";
import { useAuth } from "../auth/AuthContext.jsx";
import SplashScreen from "../components/SplashScreen.jsx";
import WelcomeToast from "../components/WelcomeToast.jsx";
import Toast from "../components/Toast.jsx";

export default function App() {
  const { ready, user } = useAuth();
  const location = useLocation();

  const {
    resultados, loading, error,
    total, limit, offset, lastQuery, isFromCache, chips,
    buscar, limpiar, goPage
  } = useSearchResults(21);
  
  const { saveLicitacion, unsaveLicitacion, checkIfSaved, loadSaved, savedIds, toggleSavedIdOptimistic } = useSavedLicitaciones();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState(null);

  // NEW: flag para saber si el loading fue disparado por "buscar" (no por paginación)
  const [searching, setSearching] = useState(false);
  const [fromAutoPreferences, setFromAutoPreferences] = useState(false); // 🆕 Marca si la búsqueda es desde preferencias automáticas
  const [preferredKeywords, setPreferredKeywords] = useState(null); // 🆕 Palabras clave preferidas del usuario
  const hasInitialized = useRef(false); // 🆕 Flag para ejecutar auto-búsqueda solo UNA VEZ
  
  const handleBuscar = async (...args) => {
    setSearching(true);
    setFromAutoPreferences(false); // Limpiar flag cuando busca manualmente
    try {
      await buscar(...args);
    } finally {
      setSearching(false);
    }
  };

  const abrirModal = useCallback((item) => { 
    setSelectedItem(item); 
    setModalOpen(true); 
  }, []);

  const cerrarModal = useCallback(() => { 
    setModalOpen(false); 
    setSelectedItem(null); 
  }, []);
  
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  // 🆕 Cargar preferencias guardadas y buscar automáticamente (DEFINIDO ANTES de usarlo)
  const cargarPreferenciasYBuscar = useCallback(async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
      
      console.log('[APP] 1️⃣ Intentando cargar preferencias desde:', `${API_BASE}/subscriptions/me/preferences`);
      
      // IMPORTANTE: Limpiar el caché primero para NO mostrar última búsqueda
      console.log('[APP] 2️⃣ Limpiando caché de búsqueda anterior...');
      limpiar();
      
      const response = await fetch(`${API_BASE}/subscriptions/me/preferences`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('[APP] 3️⃣ Respuesta del servidor:', response.status);
      
      if (!response.ok) {
        console.warn('[APP] ⚠️ Error en la respuesta:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('[APP] 4️⃣ Datos recibidos:', data);
      
      if (data.ok && data.palabras_clave) {
        // Dividir palabras clave y mostrar
        const palabrasArray = data.palabras_clave.split(',').map(p => p.trim()).filter(p => p);
        console.log('[APP] ✅ Preferencias encontradas:', {
          total: palabrasArray.length,
          palabras: palabrasArray
        });
        
        if (palabrasArray.length > 1) {
          console.log(`[APP] Buscando automáticamente licitaciones en ${palabrasArray.length} categorías: ${palabrasArray.join(', ')}`);
        } else {
          console.log(`[APP] Buscando automáticamente licitaciones con: ${data.palabras_clave}`);
        }
        
        // 🆕 Guardar palabras clave preferidas para filtrar resultados después
        setPreferredKeywords(palabrasArray);
        
        // Marcar que es una búsqueda automática desde preferencias
        setFromAutoPreferences(true);
        
        // Disparar búsqueda automática
        // buscar() espera: (termino, fechaPubDesde, fechaPubHasta, fechaRecDesde, fechaRecHasta, ciudad, departamento)
        setSearching(true);
        await buscar(
          data.palabras_clave,  // termino
          undefined,            // fechaPubDesde
          undefined,            // fechaPubHasta
          undefined,            // fechaRecDesde
          undefined,            // fechaRecHasta
          data.ciudad,          // ciudad
          data.departamento     // departamento
        );
        setSearching(false);
      } else {
        console.log('[APP] ❌ No hay preferencias guardadas. Mostrando pantalla vacía.');
      }
    } catch (error) {
      console.error('[APP] ❌ Error cargando preferencias:', error);
    }
  }, [limpiar, buscar]);

  // Cargar savedIds al iniciar
  useEffect(() => {
    if (ready && user) {
      loadSaved();
    }
  }, [ready, user, loadSaved]);
  
  // 🆕 AUTO-BUSCAR: Ejecutar UNA SOLA VEZ al montar el componente
  useEffect(() => {
    if (!ready || !user || hasInitialized.current) return;
    
    hasInitialized.current = true; // ✅ Marca que ya se ejecutó
    
    const searchParams = new URLSearchParams(location.search);
    const q = searchParams.get('q');
    const departamento = searchParams.get('departamento');
    const ciudad = searchParams.get('ciudad');
    
    console.log('[APP] ⚡ Iniciando App.jsx - checking URL params:', { q, departamento, ciudad });
    
    if (q) {
      // ✅ Si hay parámetros en URL, es que viene desde guardar preferencias
      console.log('[APP] ✅ Auto-búsqueda desde preferencias guardadas:', { q, departamento, ciudad });
      
      // IMPORTANTE: Limpiar el caché primero para NO mostrar última búsqueda
      console.log('[APP] Limpiando caché de búsqueda anterior...');
      limpiar();
      
      // Construir objeto de búsqueda
      const searchQuery = {
        q: q,
        departamento: departamento || undefined,
        ciudad: ciudad || undefined
      };
      console.log('[APP] ✅ Parámetros de búsqueda:', searchQuery);
      
      // 🆕 Guardar palabras clave preferidas para filtrar resultados después
      const palabrasArray = q.split(',').map(p => p.trim()).filter(p => p);
      setPreferredKeywords(palabrasArray);
      
      // Marcar que es una búsqueda automática desde preferencias
      setFromAutoPreferences(true);
      
      // Disparar búsqueda automática
      // buscar() espera: (termino, fechaPubDesde, fechaPubHasta, fechaRecDesde, fechaRecHasta, ciudad, departamento)
      setSearching(true);
      buscar(
        q,                  // termino (palabras clave)
        undefined,          // fechaPubDesde
        undefined,          // fechaPubHasta
        undefined,          // fechaRecDesde
        undefined,          // fechaRecHasta
        ciudad,             // ciudad
        departamento        // departamento
      ).finally(() => setSearching(false));
      
      // Limpiar parámetros de URL para evitar búsquedas repetidas
      window.history.replaceState({}, document.title, '/app');
    } else {
      // Si NO hay parámetros, cargar preferencias guardadas del usuario
      console.log('[APP] ℹ️ Sin parámetros en URL. Cargando preferencias guardadas...');
      cargarPreferenciasYBuscar();
    }
  }, [ready, user, buscar, limpiar, cargarPreferenciasYBuscar]);
  
  
  const handleToggleSave = useCallback(async (item) => {
    const idPortafolio = item.ID_Portafolio || item.id_del_portafolio;
    const isSaved = checkIfSaved(idPortafolio);
    
    // Actualización optimista: cambiar UI inmediatamente
    toggleSavedIdOptimistic(idPortafolio, !isSaved);
    
    if (isSaved) {
      const success = await unsaveLicitacion(idPortafolio);
      
      if (success) {
        showToast('★ Licitación eliminada de guardadas', 'info');
      } else {
        // Si falla, revertir el cambio optimista
        toggleSavedIdOptimistic(idPortafolio, true);
        showToast('✗ Error al eliminar licitación', 'error');
      }
    } else {
      const success = await saveLicitacion(item);
      
      if (success) {
        showToast('★ Licitación guardada exitosamente', 'success');
      } else {
        // Si falla, revertir el cambio optimista
        toggleSavedIdOptimistic(idPortafolio, false);
        showToast('✗ Error al guardar licitación', 'error');
      }
    }
  }, [checkIfSaved, saveLicitacion, unsaveLicitacion, toggleSavedIdOptimistic, showToast]);

  // 1) Splash a pantalla completa mientras el contexto Auth se inicializa
  if (!ready) return <SplashScreen text="Validando sesión…" />;

  // 2) Splash visible cada vez que comienza una búsqueda (sin limpiar filtros)
  //    - Solo se activa cuando el loading viene de handleBuscar (no de goPage)
  const showSplash = loading && searching;

  return (
    <div className="min-h-screen main-bg relative">
      {showSplash && <SplashScreen text={lastQuery ? `Buscando proyectos…` : "Cargando resultados…"} />}

      <Header chips={chips} onBuscar={handleBuscar} onLimpiar={limpiar} />

      {ready && user && (
        <WelcomeToast text={`Bienvenido de nuevo, ${user.name || user.email} 👋`} />
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ResultsPanel
        resultados={resultados}
        loading={loading}
        error={error}
        total={total}
        limit={limit}
        offset={offset}
        lastQuery={lastQuery}
        isFromCache={isFromCache && !fromAutoPreferences}
        savedIds={savedIds}
        onPage={goPage}
        onItemClick={abrirModal}
        onToggleSave={handleToggleSave}
        preferredKeywords={preferredKeywords}
      />

      <ResultModal 
        key={selectedItem?.ID_Portafolio || selectedItem?.id_del_portafolio || 'no-item'} 
        open={modalOpen} 
        item={selectedItem} 
        onClose={cerrarModal} 
      />
    </div>
  );
}
