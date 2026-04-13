import React from "react";
import "../styles/components/preferences.css";
import usePreferencesForm from "./preferences/usePreferencesForm.js";
import AlertPreferencesSection from "./preferences/AlertPreferencesSection.jsx";
import FinancialProfileSection from "./preferences/FinancialProfileSection.jsx";
import SubscriptionsSection from "./preferences/SubscriptionsSection.jsx";

export default function Preferences({ unlocked = true }) {
  const form = usePreferencesForm(unlocked);

  return (
    <div className="preferences-container">
      {!form.isActive && (
        <div className="preferences-overlay">
          <div className="preferences-overlay-content">
            <p className="preferences-overlay-title">
              Para configurar tus preferencias, realiza primero una búsqueda.
            </p>
            <p className="preferences-overlay-subtitle">
              Si ya tienes suscripciones guardadas, esta sección se activará automáticamente.
            </p>
          </div>
        </div>
      )}

      {form.loadingSession && (
        <p className="preferences-loading-text">Cargando sesión…</p>
      )}

      {form.msg && !form.email && (
        <p className="preferences-error-text">{form.msg}</p>
      )}

      <div className="preferences-grid">
        {/* Identity */}
        <div className="preferences-field-group">
          <label className="preferences-field-label">Nombre</label>
          <input
            className="preferences-input"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
            onBlur={form.saveName}
            disabled={!form.isActive}
          />
        </div>
        <div className="preferences-field-group">
          <label className="preferences-field-label">Correo</label>
          <input
            className="preferences-input"
            placeholder="Correo"
            value={form.email}
            disabled={true}
            title="Este correo proviene de tu sesión"
          />
        </div>

        <AlertPreferencesSection
          palabras={form.palabras} setPalabras={form.setPalabras}
          departamento={form.departamento} setDepartamento={form.setDepartamento}
          ciudad={form.ciudad} setCiudad={form.setCiudad}
          isActive={form.isActive} email={form.email}
          savingPrefs={form.savingPrefs} running={form.running} msgPrefs={form.msgPrefs}
          savePrefs={form.savePrefs} runNow={form.runNow}
        />

        <FinancialProfileSection
          indicators={form.indicators} setIndicator={form.setIndicator}
          isActive={form.isActive} email={form.email}
          savingFin={form.savingFin} msgFin={form.msgFin} saveFin={form.saveFin}
        />
      </div>

      {/* Cache stats - dev only */}
      {form.email && process.env.NODE_ENV === "development" && (
        <div className="preferences-section">
          <h3 className="preferences-section-title">Cache de Analisis</h3>
          <div className="preferences-form">
            {form.loadingCache ? (
              <p className="preferences-loading-text preferences-grid-full">Cargando estadísticas...</p>
            ) : form.cacheStats ? (
              <>
                <div className="preferences-cache-stats">
                  <div className="preferences-cache-stat-item">
                    <span className="preferences-cache-stat-label">Total de análisis:</span>
                    <span className="preferences-cache-stat-value">{form.cacheStats.total_analisis || 0}</span>
                  </div>
                  <div className="preferences-cache-stat-item">
                    <span className="preferences-cache-stat-label">Completados:</span>
                    <span className="preferences-cache-stat-value preferences-cache-stat-success">{form.cacheStats.completados || 0}</span>
                  </div>
                  <div className="preferences-cache-stat-item">
                    <span className="preferences-cache-stat-label">Con errores:</span>
                    <span className="preferences-cache-stat-value preferences-cache-stat-error">{form.cacheStats.errores || 0}</span>
                  </div>
                  <div className="preferences-cache-stat-item">
                    <span className="preferences-cache-stat-label">Recientes (24h):</span>
                    <span className="preferences-cache-stat-value preferences-cache-stat-recent">{form.cacheStats.recientes_24h || 0}</span>
                  </div>
                </div>
                <p className="preferences-helper-text preferences-grid-full">
                  Los análisis se guardan por 1 hora. Limpiar el caché forzará el re-análisis de todas las licitaciones.
                </p>
                <div className="preferences-button-group preferences-grid-full">
                  <button
                    onClick={form.clearAnalysisCache}
                    className="preferences-button preferences-button-secondary"
                    disabled={form.clearingCache || form.cacheStats.total_analisis === 0}
                  >
                    {form.clearingCache ? "Limpiando..." : "Limpiar Cache"}
                  </button>
                  <button
                    onClick={form.loadCacheStats}
                    className="preferences-button preferences-button-secondary"
                    disabled={form.loadingCache}
                  >
                    Actualizar
                  </button>
                </div>
                {form.msgCache && (
                  <p className={`preferences-status-message preferences-grid-full ${form.msgCache.includes("Error") ? "preferences-status-error" : "preferences-status-success"}`}>
                    {form.msgCache}
                  </p>
                )}
              </>
            ) : (
              <p className="preferences-helper-text preferences-grid-full">
                No se pudieron cargar las estadísticas de caché.
              </p>
            )}
          </div>
        </div>
      )}

      <SubscriptionsSection
        subs={form.subs}
        loadingSubs={form.loadingSubs}
        isActive={form.isActive}
        deactivate={form.deactivate}
      />
    </div>
  );
}
