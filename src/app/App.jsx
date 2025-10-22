import React, { useState } from "react";
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

  const abrirModal = (item) => { setSelectedItem(item); setModalOpen(true); };
  const cerrarModal = () => { setModalOpen(false); setSelectedItem(null); };

  // 1) Splash a pantalla completa mientras el contexto Auth se inicializa
  if (!ready) return <SplashScreen text="Validando sesión…" />;

  // 2) Overlay de splash solo en la PRIMERA carga (evita tapar UI en paginaciones)
  const showInitialSplash =
    loading && lastQuery && (!resultados || resultados.length === 0) && offset === 0;

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {showInitialSplash && <SplashScreen text="Cargando resultados…" />}

      <Header chips={chips} onBuscar={buscar} onLimpiar={limpiar} />

      {/* 3) Toast de bienvenida — aparece un momento y se va solo */}
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
