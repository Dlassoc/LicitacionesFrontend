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

  // ✅ NUEVO: Log para debugging
  if (analyzed) {
    console.log('🔍 [AnalysisSection] Datos recibidos:', {
      nombre: analyzed.nombre,
      indicadores: analyzed.indicadores,
      codigos_unspsc: analyzed.codigos_unspsc,
      experiencia_anos: analyzed.experiencia_anos,
      completo_keys: Object.keys(analyzed.completo || {}),
    });
  }

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

      {/* ✅ NUEVO: Mostrar análisis en progreso SOLO si realmente está analizando y no hay datos */}
      {analyzing && !analyzed && (
        <div className="analysis-section-analyzing">
          <div className="analysis-section-analyzing-spinner" />
          <span className="analysis-section-analyzing-text">Descargando y analizando documento(s)...</span>
        </div>
      )}

      {/* Mostrar errores */}
      {analysisError && (
        <div className="analysis-section-error">
          <p className="analysis-section-error-text">❌ {analysisError}</p>
        </div>
      )}

      {/* ✅ MODIFICADO: Mostrar resultados si tenemos datos (sin importar si analyzing) */}
      {analyzed && (
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
              <p className="analysis-section-indicators-label">💰 Indicadores financieros requeridos:</p>
              <div className="analysis-section-indicators-box">
                <ul className="analysis-section-indicators-list">
                  {Object.entries(analyzed.indicadores).map(([key, val]) => (
                    <li key={key} className="analysis-section-indicators-item">
                      <span><strong>{key}:</strong> {val}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* ✅ NUEVO: Mostrar códigos UNSPSC si existen */}
              {analyzed.codigos_unspsc && analyzed.codigos_unspsc.length > 0 && (
                <div className="analysis-section-unspsc-group">
                  <p className="analysis-section-unspsc-label">📋 Códigos UNSPSC encontrados:</p>
                  <div className="analysis-section-unspsc-codes">
                    {analyzed.codigos_unspsc.map((item) => {
                      // Manejar tanto strings como objetos {codigo, descripcion, ...}
                      const codigo = typeof item === 'string' ? item : item?.codigo;
                      const descripcion = typeof item === 'string' ? null : item?.descripcion;
                      return (
                        <span
                          key={codigo}
                          className="analysis-section-unspsc-code"
                          title={descripcion || ''}
                        >
                          {codigo}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ✅ NUEVO: Mostrar experiencia requerida si existe */}
              {analyzed.experiencia_encontrada && (
                <div className="analysis-section-experience-group">
                  <p className="analysis-section-experience-label">👨‍💼 Requisitos de experiencia:</p>
                  <div className="analysis-section-experience-box">
                    {analyzed.experiencia_anos && (
                      <p className="analysis-section-experience-years">
                        <strong>Años requeridos:</strong> <span style={{fontSize: '0.9em', fontWeight: '600', color: '#059669'}}>{analyzed.experiencia_anos}</span>
                      </p>
                    )}
                    {analyzed.experiencia_sector && (
                      <p className="analysis-section-experience-sector">
                        <strong>Sector:</strong> {analyzed.experiencia_sector}
                      </p>
                    )}
                    {analyzed.experiencia_certificaciones && (
                      <p className="analysis-section-experience-certs">
                        <strong>Certificaciones:</strong> {analyzed.experiencia_certificaciones}
                      </p>
                    )}
                    {analyzed.experiencia_valor_smmlv && (
                      <p className="analysis-section-experience-smmlv">
                        <strong>Valor mínimo:</strong> {analyzed.experiencia_valor_smmlv}
                      </p>
                    )}
                    {analyzed.experiencia_tipos && analyzed.experiencia_tipos.length > 0 && (
                      <div className="analysis-section-experience-types">
                        <strong>Tipos de proyectos:</strong>
                        <ul className="analysis-section-experience-types-list">
                          {analyzed.experiencia_tipos.map((tipo, idx) => (
                            <li key={idx}>{tipo}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
