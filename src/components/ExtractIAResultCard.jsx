import React from "react";
import "../styles/components/extract-ia-result-card.css";
import { getIndicatorDisplayName } from "../config/indicatorNames";

export default function ExtractIAResultCard({ item, isExpanded, onToggle }) {
  const { archivo, ok, error, paginas_totales, paginas_indicadores, resultado } = item;

  if (!ok) {
    return (
      <div className="extract-ia-result-card-error">
        <div className="extract-ia-result-card-error-content">
          <div className="extract-ia-result-card-error-flex">
            <p className="extract-ia-result-card-error-title">{archivo}</p>
            <p className="extract-ia-result-card-error-message"> {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`extract-ia-result-card-wrapper ${isExpanded ? "expanded" : ""}`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="extract-ia-result-card-header-button"
      >
        <div className="extract-ia-result-card-header-content">
          <p className="extract-ia-result-card-header-title">{archivo}</p>
          <p className="extract-ia-result-card-header-meta">
            📄 {paginas_totales} página{paginas_totales !== 1 ? "s" : ""} •
            ⭐ Indicadores en página{paginas_indicadores?.length !== 1 ? "s" : ""}{" "}
            {paginas_indicadores?.join(", ")}
          </p>
        </div>
        <div className={`extract-ia-result-card-header-toggle ${isExpanded ? "rotated" : ""}`}>
          ▼
        </div>
      </button>

      {/* Contenido expandido */}
      {isExpanded && resultado && (
        <div className="extract-ia-result-card-body">
          <div className="extract-ia-result-card-sections">
            {/* Requisitos Habilitantes */}
            {resultado.requisitos_habilitantes && resultado.requisitos_habilitantes.length > 0 && (
              <section className="extract-ia-result-card-section">
                <h4 className="extract-ia-result-card-section-title">
                  📋 Requisitos Habilitantes
                </h4>
                <ul className="extract-ia-result-card-list">
                  {resultado.requisitos_habilitantes.map((req, idx) => (
                    <li key={idx} className="extract-ia-result-card-list-item">
                      • {req}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Documentos Requeridos */}
            {resultado.documentos_requeridos && resultado.documentos_requeridos.length > 0 && (
              <section className="extract-ia-result-card-section">
                <h4 className="extract-ia-result-card-section-title">
                  📄 Documentos Requeridos
                </h4>
                <ul className="extract-ia-result-card-list">
                  {resultado.documentos_requeridos.map((doc, idx) => (
                    <li key={idx} className="extract-ia-result-card-list-item">
                      • {doc}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Condiciones Adicionales */}
            {resultado.condiciones_adicionales && resultado.condiciones_adicionales.length > 0 && (
              <section className="extract-ia-result-card-section">
                <h4 className="extract-ia-result-card-section-title">
                  ⚙️ Condiciones Adicionales
                </h4>
                <ul className="extract-ia-result-card-list">
                  {resultado.condiciones_adicionales.map((cond, idx) => (
                    <li key={idx} className="extract-ia-result-card-list-item">
                      • {cond}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Indicadores Financieros */}
            {resultado.indicadores_financieros && Object.keys(resultado.indicadores_financieros).length > 0 && (
              <section className="extract-ia-result-card-financials-section">
                <h4 className="extract-ia-result-card-financials-title">
                  💰 Indicadores Financieros Encontrados
                </h4>
                
                {/* Verificar si tiene estructura NORMAL/MIPYME/individuales o estructura plana */}
                {resultado.indicadores_financieros.normal || resultado.indicadores_financieros.mipyme || resultado.indicadores_financieros.emprendimientos || resultado.indicadores_financieros.individuales ? (
                  // Estructura con categorías (NORMAL/MIPYME/etc)
                  <div className="extract-ia-result-card-financials-categories">
                    {Object.entries(resultado.indicadores_financieros).map(([categoryName, categoryData], idx) => {
                      // Saltar si es un diccionario vacío
                      if (typeof categoryData !== 'object' || Object.keys(categoryData).length === 0) {
                        return null;
                      }
                      
                      return (
                        <div key={idx} className="extract-ia-result-card-category-block">
                          <h5 className="extract-ia-result-card-category-title">
                            {categoryName === 'individuales' ? 'Indicadores Encontrados' : categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
                          </h5>
                          <div className="extract-ia-result-card-financials-grid">
                            {Object.entries(categoryData).map(([key, value], itemIdx) => (
                              <div key={itemIdx} className="extract-ia-result-card-financial-item">
                                <p className="extract-ia-result-card-financial-key">{getIndicatorDisplayName(key)}</p>
                                <p className="extract-ia-result-card-financial-value">
                                  {typeof value === 'number' ? value.toFixed(2) : value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Estructura plana (indicadores individuales)
                  <div className="extract-ia-result-card-financials-grid">
                    {Object.entries(resultado.indicadores_financieros).map(([key, value], idx) => (
                      <div key={idx} className="extract-ia-result-card-financial-item">
                        <p className="extract-ia-result-card-financial-key">{getIndicatorDisplayName(key)}</p>
                        <p className="extract-ia-result-card-financial-value">
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Indicadores Organizacionales */}
            {resultado.indicadores_organizacionales && Object.keys(resultado.indicadores_organizacionales).length > 0 && (
              <section className="extract-ia-result-card-organizational-section">
                <h4 className="extract-ia-result-card-organizational-title">
                  🏢 Indicadores Organizacionales Encontrados
                </h4>
                
                {/* Verificar si tiene estructura NORMAL/MIPYME/individuales o estructura plana */}
                {resultado.indicadores_organizacionales.normal || resultado.indicadores_organizacionales.mipyme || resultado.indicadores_organizacionales.emprendimientos || resultado.indicadores_organizacionales.individuales ? (
                  // Estructura con categorías (NORMAL/MIPYME/etc)
                  <div className="extract-ia-result-card-financials-categories">
                    {Object.entries(resultado.indicadores_organizacionales).map(([categoryName, categoryData], idx) => {
                      // Saltar si es un diccionario vacío
                      if (typeof categoryData !== 'object' || Object.keys(categoryData).length === 0) {
                        return null;
                      }
                      
                      return (
                        <div key={idx} className="extract-ia-result-card-category-block">
                          <h5 className="extract-ia-result-card-category-title">
                            {categoryName === 'individuales' ? 'Indicadores Encontrados' : categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
                          </h5>
                          <div className="extract-ia-result-card-financials-grid">
                            {Object.entries(categoryData).map(([key, value], itemIdx) => (
                              <div key={itemIdx} className="extract-ia-result-card-financial-item">
                                <p className="extract-ia-result-card-financial-key">{getIndicatorDisplayName(key)}</p>
                                <p className="extract-ia-result-card-financial-value">
                                  {typeof value === 'number' ? value.toFixed(2) : value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Estructura plana (indicadores individuales)
                  <div className="extract-ia-result-card-financials-grid">
                    {Object.entries(resultado.indicadores_organizacionales).map(([key, value], idx) => (
                      <div key={idx} className="extract-ia-result-card-financial-item">
                        <p className="extract-ia-result-card-financial-key">{getIndicatorDisplayName(key)}</p>
                        <p className="extract-ia-result-card-financial-value">
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* JSON Raw (para debugging) */}
            <details className="extract-ia-result-card-debug">
              <summary className="extract-ia-result-card-debug-summary">
                📊 Ver JSON completo (debugging)
              </summary>
              <pre className="extract-ia-result-card-debug-code">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </details>

            {/* Confianza */}
            {resultado.confianza !== undefined && (
              <section className="extract-ia-result-card-confidence">
                <p className="extract-ia-result-card-confidence-label">Nivel de confianza</p>
                <div className="extract-ia-result-card-confidence-bar-wrapper">
                  <div className="extract-ia-result-card-confidence-bar-bg">
                    <div
                      className="extract-ia-result-card-confidence-bar-fill"
                      style={{ width: `${resultado.confianza * 100}%` }}
                    />
                  </div>
                  <p className="extract-ia-result-card-confidence-percent">
                    {(resultado.confianza * 100).toFixed(0)}%
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
