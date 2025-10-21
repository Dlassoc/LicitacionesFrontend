import React, { useState } from "react";
import Header from "../components/Header.jsx";
import ResultsPanel from "../components/ResultsPanel.jsx";
import ResultModal from "../components/ResultModal.jsx";
import { useSearchResults } from "../features/hooks.js";

export default function App() {
  const {
    resultados, loading, error,
    total, limit, offset, lastQuery, chips,
    buscar, limpiar, goPage
  } = useSearchResults(21);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const abrirModal = (item) => { setSelectedItem(item); setModalOpen(true); };
  const cerrarModal = () => { setModalOpen(false); setSelectedItem(null); };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header chips={chips} onBuscar={buscar} onLimpiar={limpiar} />

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
