import React, { useState, useCallback, useEffect } from "react";
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
  const handleBuscar = async (...args) => {
    setSearching(true);
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
  
  // Cargar savedIds al iniciar
  useEffect(() => {
    if (ready && user) {
      loadSaved();
    }
  }, [ready, user, loadSaved]);
  
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
        isFromCache={isFromCache}
        savedIds={savedIds}
        onPage={goPage}
        onItemClick={abrirModal}
        onToggleSave={handleToggleSave}
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
