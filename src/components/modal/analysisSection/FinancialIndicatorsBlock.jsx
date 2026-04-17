import React from "react";

export default function FinancialIndicatorsBlock({ indicadores }) {
  if (!indicadores || Object.keys(indicadores).length === 0) return null;

  const hasCategorizedStructure =
    indicadores.normal ||
    indicadores.mipyme ||
    indicadores.emprendimientos ||
    indicadores.individuales;

  return (
    <div className="analysis-section-indicators-group">
      <p className="analysis-section-indicators-label"> Indicadores financieros requeridos:</p>
      <div className="analysis-section-indicators-box">
        {hasCategorizedStructure ? (
          <div className="analysis-section-categories">
            {Object.entries(indicadores).map(([categoryName, categoryData], idx) => {
              if (typeof categoryData !== "object" || Object.keys(categoryData).length === 0) {
                return null;
              }

              const displayTitle = categoryName === "individuales"
                ? "Indicadores Encontrados"
                : categoryName.toUpperCase();

              return (
                <div key={idx} className={`analysis-section-category ${categoryName === "individuales" ? "individual" : ""}`}>
                  <h5 className="analysis-section-category-title">{displayTitle}</h5>
                  <ul className="analysis-section-indicators-list">
                    {Object.entries(categoryData).map(([key, val]) => (
                      <li key={key} className="analysis-section-indicators-item">
                        <span><strong>{key}:</strong> {typeof val === "object" ? JSON.stringify(val) : val}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="analysis-section-indicators-list">
            {Object.entries(indicadores).map(([key, val]) => (
              <li key={key} className="analysis-section-indicators-item">
                <span><strong>{key}:</strong> {typeof val === "object" ? JSON.stringify(val) : val}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
