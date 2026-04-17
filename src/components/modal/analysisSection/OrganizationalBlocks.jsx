import React from "react";

export function OrganizationalIndicatorsBlock({ indicadores }) {
  if (!indicadores || Object.keys(indicadores).length === 0) return null;

  return (
    <div className="analysis-section-indicators-org-group">
      <p className="analysis-section-indicators-org-label"> Indicadores Organizacionales ({Object.keys(indicadores).length}):</p>
      <div className="analysis-section-indicators-org-box">
        {indicadores.normal || indicadores.mipyme ? (
          <div className="analysis-section-org-categories">
            {Object.entries(indicadores).map(([categoryName, categoryData], idx) => {
              if (typeof categoryData !== "object" || Object.keys(categoryData).length === 0) {
                return null;
              }

              return (
                <div key={idx} className="analysis-section-org-category">
                  <h5 className="analysis-section-org-category-title">{categoryName.toUpperCase()}</h5>
                  <ul className="analysis-section-indicators-org-list">
                    {Object.entries(categoryData).map(([key, val]) => (
                      <li key={key} className="analysis-section-indicators-org-item">
                        <span><strong>{key}:</strong> {typeof val === "object" ? JSON.stringify(val) : val}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="analysis-section-indicators-org-list">
            {Object.entries(indicadores).map(([key, val]) => (
              <li key={key} className="analysis-section-indicators-org-item">
                <span><strong>{key}:</strong> {typeof val === "object" ? JSON.stringify(val) : val}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function NoIndicatorsSummaryBlock({ adaptedResults, results }) {
  if (adaptedResults.matrices || (adaptedResults.indicadores && Object.keys(adaptedResults.indicadores).length > 0)) {
    return null;
  }

  return (
    <div className="analysis-section-no-indicators">
      <p className="analysis-section-no-indicators-title">
        ⓘ {adaptedResults.mensaje || "No se encontraron indicadores financieros"}
      </p>

      <div className="analysis-section-no-indicators-summary">
        <p className="analysis-section-no-indicators-stat">
          <strong>Documentos analizados:</strong> {adaptedResults.documentos_analizados || 0}
        </p>
        {adaptedResults.documentos_descartados > 0 && (
          <p className="analysis-section-no-indicators-stat">
            <strong>Documentos descartados:</strong> {adaptedResults.documentos_descartados} (administrativos)
          </p>
        )}

        {adaptedResults.indicadores_organizacionales && Object.keys(adaptedResults.indicadores_organizacionales).length > 0 && (
          <p className="analysis-section-no-indicators-stat">
            <strong>Indicadores organizacionales encontrados:</strong> {Object.keys(adaptedResults.indicadores_organizacionales).length}
          </p>
        )}
        {adaptedResults.codigos_unspsc && adaptedResults.codigos_unspsc.length > 0 && (
          <p className="analysis-section-no-indicators-stat">
            <strong>Códigos UNSPSC encontrados:</strong> {adaptedResults.codigos_unspsc.length}
          </p>
        )}
        {adaptedResults.experiencia_requerida && Object.keys(adaptedResults.experiencia_requerida).length > 0 && (
          <p className="analysis-section-no-indicators-stat">
            <strong>Requisitos de experiencia encontrados:</strong> {Object.keys(adaptedResults.experiencia_requerida).length}
          </p>
        )}

        <p className="analysis-section-no-indicators-description">
          Los documentos analizados no contienen indicadores financieros relevantes. Esto puede significar que son documentos técnicos, administrativos o no relacionados con la evaluación financiera.
        </p>
      </div>

      {results.indicadores_organizacionales && Object.keys(results.indicadores_organizacionales).length > 0 && (
        <div className="analysis-section-indicators-org-group">
          <p className="analysis-section-indicators-org-label"> Indicadores Organizacionales ({Object.keys(results.indicadores_organizacionales).length}):</p>
          <div className="analysis-section-indicators-org-box">
            <ul className="analysis-section-indicators-org-list">
              {Object.entries(results.indicadores_organizacionales).map(([key, val]) => (
                <li key={key} className="analysis-section-indicators-org-item">
                  <span><strong>{key}:</strong> {val}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
