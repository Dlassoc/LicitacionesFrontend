import React from "react";

export default function AlertPreferencesSection({
  palabras, setPalabras,
  departamento, setDepartamento,
  ciudad, setCiudad,
  isActive, email,
  savingPrefs, running, msgPrefs,
  savePrefs, runNow,
}) {
  return (
    <>
      <div className="preferences-section-divider preferences-grid-full" />

      <div className="preferences-grid-full">
        <h4 className="preferences-section-title">Preferencias de Alertas por Correo</h4>
        <p className="preferences-section-description">
          Configura las palabras clave (separadas por comas) y filtros para recibir alertas
          automáticas de nuevas licitaciones cada 6 horas. El sistema buscará licitaciones que
          contengan <strong>cualquiera</strong> de las palabras indicadas (búsqueda OR).
        </p>
      </div>

      <input
        className="preferences-input preferences-grid-full"
        placeholder="Palabras clave separadas por comas (ej. alcaldia, paneles) - Busca cualquiera"
        value={palabras}
        onChange={(e) => setPalabras(e.target.value)}
        disabled={!isActive}
      />
      <input
        className="preferences-input"
        placeholder="Departamento (opcional)"
        value={departamento}
        onChange={(e) => setDepartamento(e.target.value)}
        disabled={!isActive}
      />
      <input
        className="preferences-input"
        placeholder="Ciudad (opcional)"
        value={ciudad}
        onChange={(e) => setCiudad(e.target.value)}
        disabled={!isActive}
      />

      <div className="preferences-button-group preferences-grid-full">
        <button
          onClick={savePrefs}
          className="preferences-button preferences-button-primary"
          disabled={!isActive || !email || savingPrefs}
        >
          {savingPrefs ? "Guardando…" : "Guardar Preferencias"}
        </button>
        <button
          onClick={runNow}
          className="preferences-button preferences-button-secondary"
          disabled={!isActive || !email || running || savingPrefs}
          title="Busca licitaciones de los últimos 30 días y envía un correo de prueba"
        >
          {running ? "Enviando…" : "Enviar Correo de Prueba"}
        </button>
      </div>

      {msgPrefs && (
        <p className={`preferences-status-message preferences-grid-full ${msgPrefs.includes("Error") ? "preferences-status-error" : "preferences-status-success"}`}>
          {msgPrefs}
        </p>
      )}
    </>
  );
}
