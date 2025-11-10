/**
 * AnalysisSection - Sección de análisis de indicadores financieros
 * Muestra botón para leer, preview de texto e indicadores encontrados
 */

import { useCallback } from "react";
import "../../styles/components/analysis-section.css";

export default function AnalysisSection({
  docWithIndicators,
  analyzing,
  analyzed,
  analysisError,
  analyze,
}) {
  if (!docWithIndicators) return null;

  const handleAnalyze = useCallback(() => {
    analyze();
  }, [analyze]);

  return (
    <div className="analysis-section-container">
      <div className="analysis-section-header">
        <h4 className="analysis-section-title">📊 Análisis de indicadores financieros</h4>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="analysis-section-button"
        >
          {analyzing ? "Leyendo..." : "Leer documento"}
        </button>
      </div>

      {analyzing && (
        <div className="analysis-section-analyzing">
          <div className="analysis-section-analyzing-spinner" />
          <span className="analysis-section-analyzing-text">Descargando y analizando documento(s)...</span>
        </div>
      )}

      {analysisError && (
        <div className="analysis-section-error">
          <p className="analysis-section-error-text">❌ {analysisError}</p>
        </div>
      )}

      {!analyzing && analyzed && (
        <div className={`analysis-section-success ${analyzed.noIndicatorsFound ? 'analysis-section-success-no-indicators' : ''}`}>
          {analyzed.noIndicatorsFound ? (
            <div className="analysis-section-success-header">
              <h5 className="analysis-section-success-title">
                ✓ Análisis completado
              </h5>
              <p className="analysis-section-success-pages">
                Se analizaron todos los documentos disponibles
              </p>
            </div>
          ) : (
            <div className="analysis-section-success-header">
              <h5 className="analysis-section-success-title">
                ✓ Documento analizado: {analyzed.nombre}
              </h5>
              <p className="analysis-section-success-pages">
                Páginas encontradas: <strong>{analyzed.paginasIndicadores.join(", ") || "—"}</strong> de{" "}
                <strong>{analyzed.paginasTotales}</strong>
              </p>
            </div>
          )}

          {/* Indicadores encontrados */}
          {analyzed.indicadores && Object.keys(analyzed.indicadores).length > 0 ? (
            <div className="analysis-section-indicators-group">
              <p className="analysis-section-indicators-label">💰 Indicadores financieros encontrados:</p>
              <div className="analysis-section-indicators-box">
                <ul className="analysis-section-indicators-list">
                  {Object.entries(analyzed.indicadores).map(([key, val]) => (
                    <li key={key} className="analysis-section-indicators-item">
                      <strong>{key}:</strong> {val}
                    </li>
                  ))}
                </ul>
              </div>
              {analyzed.notas && (
                <p className="analysis-section-notes">
                  <strong>Notas:</strong> {analyzed.notas}
                </p>
              )}
              {analyzed.confianza !== undefined && (
                <p className="analysis-section-confidence">
                  Confianza del análisis: <strong>{(analyzed.confianza * 100).toFixed(0)}%</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="analysis-section-no-indicators">
              <p className="analysis-section-no-indicators-title">
                ⓘ No se encontraron indicadores financieros relevantes
              </p>
              <p className="analysis-section-no-indicators-description">
                {analyzed.notas || "Este documento no contiene información sobre indicadores financieros que sean relevantes para esta postulación."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
