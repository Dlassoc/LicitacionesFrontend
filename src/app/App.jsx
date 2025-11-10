import React, { useState, useCallback } from "react";
import Header from "../components/Header.jsx";
import ResultsPanel from "../components/ResultsPanel.jsx";
import ResultModal from "../components/ResultModal.jsx";
import { useSearchResults } from "../features/hooks.js";
import { useAuth } from "../auth/AuthContext.jsx";
import SplashScreen from "../components/SplashScreen.jsx";
import WelcomeToast from "../components/WelcomeToast.jsx";

export default function App() {
  const { ready, user } = useAuth();

  const {
    resultados, loading, error,
    total, limit, offset, lastQuery, chips,
    buscar, limpiar, goPage
  } = useSearchResults(21);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

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

      <ResultsPanel
        resultados={resultados}
        loading={loading}
        error={error}
        total={total}
        limit={limit}
        offset={offset}
        lastQuery={lastQuery}
        onPage={goPage}
        onItemClick={abrirModal}
      />

      <ResultModal open={modalOpen} item={selectedItem} onClose={cerrarModal} />
    </div>
  );
}
