// src/pages/SavedLicitacionesPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useSavedLicitaciones } from "../hooks/useSavedLicitaciones.js";
import ResultCard from "../features/ResultCard.jsx";
import ResultModal from "../components/ResultModal.jsx";
import "../styles/pages/saved-licitaciones.css";

export default function SavedLicitacionesPage() {
  const { saved, loading, error, loadSaved, unsaveLicitacion } = useSavedLicitaciones();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const handleToggleSave = async (item) => {
    const idPortafolio = item.id_portafolio || item.ID_Portafolio;
    const success = await unsaveLicitacion(idPortafolio);
    if (success) {
      await loadSaved();
    }
  };

  const handleItemClick = useCallback((item) => {
    setSelectedItem(item);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedItem(null);
  }, []);

  if (loading && saved.length === 0) {
    return (
      <div className="saved-page">
        <div className="saved-page-container">
          <div className="saved-page-loading">
            <div className="saved-page-spinner"></div>
            <p>Cargando licitaciones guardadas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-page">
      <div className="saved-page-container">
        <header className="saved-page-header">
          <div className="saved-page-header-content">
            <h1 className="saved-page-title">
              ⭐ Licitaciones Guardadas
            </h1>
            <p className="saved-page-subtitle">
              {saved.length === 0 
                ? "No tienes licitaciones guardadas aún"
                : `${saved.length} licitación${saved.length !== 1 ? 'es' : ''} guardada${saved.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          {saved.length > 0 && (
            <button 
              className="saved-page-refresh-btn"
              onClick={loadSaved}
              disabled={loading}
            >
              🔄 Actualizar
            </button>
          )}
        </header>

        {error && (
          <div className="saved-page-error">
            <span className="saved-page-error-icon">
              {error.includes('iniciar sesión') ? '🔒' : '⚠️'}
            </span>
            <span>{error}</span>
            {error.includes('iniciar sesión') && (
              <button 
                onClick={() => window.location.href = '/login'} 
                className="saved-page-login-btn"
                style={{ marginLeft: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        )}

        {saved.length === 0 && !loading && (
          <div className="saved-page-empty">
            <div className="saved-page-empty-icon">📋</div>
            <h2 className="saved-page-empty-title">No hay licitaciones guardadas</h2>
            <p className="saved-page-empty-text">
              Cuando encuentres licitaciones de interés, haz clic en la estrella (☆) para guardarlas aquí.
            </p>
          </div>
        )}

        {saved.length > 0 && (
          <div className="saved-page-grid">
            {saved.map((lic) => {
              // Convertir formato de guardadas a formato de ResultCard
              // La metadata contiene el objeto completo original con todos los datos
              const item = {
                // IDs
                ID_Portafolio: lic.id_portafolio,
                id_del_portafolio: lic.id_portafolio,
                
                // Datos básicos
                Entidad: lic.entidad,
                nombre_entidad: lic.entidad,
                Nombre_del_Proceso: lic.nombre,
                nombre_del_proceso: lic.nombre,
                Fase: lic.fase,
                Estado: lic.fase,
                Referencia_del_proceso: lic.id_portafolio,
                Departamento_de_la_entidad: lic.departamento,
                departamento: lic.departamento,
                Ciudad_entidad: lic.ciudad,
                ciudad: lic.ciudad,
                Precio_base: lic.precio,
                precio_base: lic.precio,
                urlproceso: { url: lic.url },
                URL_Proceso: lic.url,
                
                // IMPORTANTE: Incluir toda la metadata que contiene indicadores financieros y otros datos
                ...lic.metadata
              };

              return (
                <ResultCard
                  key={lic.id}
                  item={item}
                  isSaved={true}
                  onToggleSave={handleToggleSave}
                  onClick={() => handleItemClick(item)}
                />
              );
            })}
          </div>
        )}

        <ResultModal
          key={selectedItem?.ID_Portafolio || selectedItem?.id_portafolio || 'no-item'}
          open={modalOpen}
          item={selectedItem}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
}
