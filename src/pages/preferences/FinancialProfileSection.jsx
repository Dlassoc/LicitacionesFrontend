import React from "react";

const FIELDS = [
  { key: "indicador_liquidez", label: "Indicador de liquidez", placeholder: "ej. 5.13", title: "Capacidad de pagar obligaciones a corto plazo" },
  { key: "nivel_endeudamiento", label: "Nivel de endeudamiento", placeholder: "ej. 0.42", title: "Proporción de deuda respecto al patrimonio" },
  { key: "razon_cobertura_intereses", label: "Razón de cobertura de intereses", placeholder: "ej. 16.26", title: "Capacidad de pagar intereses" },
  { key: "rentabilidad_patrimonio", label: "ROE - Rentabilidad patrimonio", placeholder: "ej. 0.14", title: "Rentabilidad del capital invertido" },
  { key: "rentabilidad_activo", label: "ROA - Rentabilidad activo", placeholder: "ej. 0.08", title: "Rentabilidad de los activos totales" },
  { key: "capacidad_deudas_corto_plazo", label: "Cap. de deudas corto plazo", placeholder: "ej. 1.50", title: "Límite de capacidad de deuda a corto plazo" },
  { key: "porcentaje_acreedores", label: "Porcentaje de acreedores", placeholder: "ej. 0.60", title: "Proporción máxima de acreedores" },
  { key: "retribucion_riesgo_propiedad", label: "Retribución riesgo propiedad", placeholder: "ej. 0.10", title: "Retorno mínimo esperado del riesgo" },
  { key: "capacidad_generar_ganancias", label: "Capacidad de generar ganancias", placeholder: "ej. 0.05", title: "Capacidad mínima de generar ganancias", fullWidth: true },
];

export default function FinancialProfileSection({
  indicators, setIndicator,
  isActive, email,
  savingFin, msgFin, saveFin,
}) {
  return (
    <>
      <div className="preferences-section-divider preferences-grid-full" />

      <div className="preferences-grid-full" style={{ marginTop: "1rem" }}>
        <h4 className="preferences-section-title">Indicadores Financieros (opcional)</h4>
        <p className="preferences-section-description">
          Ingresa solo valores numéricos. Estos datos se usarán para evaluar si cumples
          requisitos en las licitaciones.
        </p>

        <div className="preferences-financial-grid">
          {FIELDS.map((f) => (
            <div
              key={f.key}
              className={`preferences-financial-item${f.fullWidth ? " preferences-financial-full" : ""}`}
            >
              <label className="preferences-financial-label">{f.label}</label>
              <input
                type="number"
                step="any"
                className="preferences-input"
                placeholder={f.placeholder}
                value={indicators[f.key]}
                onChange={(e) => setIndicator(f.key, e.target.value)}
                disabled={!isActive || savingFin}
                title={f.title}
              />
            </div>
          ))}
        </div>

        <div className="preferences-button-group preferences-grid-full">
          <button
            onClick={saveFin}
            className="preferences-button preferences-button-primary"
            disabled={!isActive || !email || savingFin}
          >
            {savingFin ? "Guardando…" : "Guardar Indicadores Financieros"}
          </button>
        </div>

        {msgFin && (
          <p className={`preferences-status-message preferences-grid-full ${msgFin.includes("Error") ? "preferences-status-error" : "preferences-status-success"}`}>
            {msgFin}
          </p>
        )}
      </div>
    </>
  );
}
