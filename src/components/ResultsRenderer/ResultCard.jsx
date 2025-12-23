import React from "react";

/**
 * Componente ResultCard
 * Renderiza una tarjeta individual con el resultado de extracción de un archivo
 */
export default function ResultCard({ item, isExpanded, onToggle }) {
  if (!item.ok) {
    if (item.motivo === "Documento descartado automáticamente") {
      return (
        <div className="result-card result-card-skipped">
          <div className="result-card-header result-card-header-skipped" onClick={onToggle}>
            <div className="result-card-title-section">
              <div className="result-card-icon"></div>
              <div>
                <div className="result-card-filename">{item.archivo}</div>
                <div className="result-card-meta">Documento descartado automáticamente</div>
              </div>
            </div>
            <div className="result-card-badge result-card-badge-skipped">DESCARTADO</div>
          </div>
          {isExpanded && (
            <div className="result-card-content">
              <div className="result-card-section">
                <h4 className="result-card-section-title">Razón</h4>
                <p className="result-card-reason">{item.razon || "Sin especificar"}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="result-card result-card-error">
        <div className="result-card-header result-card-header-error" onClick={onToggle}>
          <div className="result-card-title-section">
            <div className="result-card-icon"></div>
            <div>
              <div className="result-card-filename">{item.archivo}</div>
              <div className="result-card-error-message">{item.error}</div>
            </div>
          </div>
          <div className="result-card-badge result-card-badge-error">ERROR</div>
        </div>
      </div>
    );
  }

  // Archivo procesado correctamente
  const resultado = item.resultado || {};
  const indicadores = resultado.indicadores_financieros || {};
  const matrices = resultado.matrices || null;  // Para documentos con múltiples matrices
  const unspsc = resultado.codigos_unspsc || [];
  const experiencia = resultado.experiencia_requerida || {};
  const ocr_usado = item.ocr_usado || false;

  // Debug: verificar qué datos llegan
  console.log("📊 [ResultCard] Datos recibidos:", {
    archivo: item.archivo,
    tiene_matrices: !!matrices,
    unspsc_length: unspsc.length,
    unspsc: unspsc,
    experiencia_texto: experiencia?.experiencia_requerida,
    experiencia_completo: experiencia,
    resultado_completo: resultado
  });

  return (
    <div className="result-card result-card-success">
      <div className="result-card-header result-card-header-success" onClick={onToggle}>
        <div className="result-card-title-section">
          <div className="result-card-icon"></div>
          <div>
            <div className="result-card-filename">{item.archivo}</div>
            <div className="result-card-meta">
              {item.tipo || "DESCONOCIDO"} • {item.paginas_totales || 0} páginas
              {ocr_usado && <span className="result-card-ocr-badge">OCR</span>}
            </div>
          </div>
        </div>
        <div className="result-card-badges">
          <div className="result-card-badge">PROCESADO</div>
        </div>
      </div>

      {isExpanded && (
        <div className="result-card-content">
          {/* Advertencia OCR si aplica */}
          {ocr_usado && (
            <div className="result-card-ocr-warning">
              <div className="result-card-ocr-warning-icon"></div>
              <div>
                <strong>Documento procesado con OCR</strong>
                <p>Este documento contiene imágenes. Los valores pueden ser ambiguos. Por favor, verifica los indicadores manualmente.</p>
              </div>
            </div>
          )}

          {/* Indicadores Financieros o Múltiples Matrices */}
          {matrices ? (
            // Mostrar múltiples matrices (Mipyme y No-Mipyme)
            <div className="result-card-matrices">
              {Object.entries(matrices).map(([matrizNombre, matrizIndicadores]) => (
                <div key={matrizNombre} className="result-card-matriz">
                  <h4 className="result-card-section-title">
                     Matriz {matrizNombre === "mipyme" ? "MIPYME" : "No-MIPYME"}
                  </h4>
                  <div className="result-card-indicators">
                    {Object.entries(matrizIndicadores).map(([nombre, valor]) => (
                      <div key={nombre} className="result-card-indicator-item">
                        <div className="result-card-indicator-name">{nombre}</div>
                        <div className="result-card-indicator-value">{valor}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Mostrar indicadores tradicionales
            <div className="result-card-section">
              <h4 className="result-card-section-title"> Indicadores Financieros</h4>
              {Object.keys(indicadores).length > 0 ? (
                <div className="result-card-indicators">
                  {Object.entries(indicadores).map(([nombre, valor]) => (
                    <div key={nombre} className="result-card-indicator-item">
                      <div className="result-card-indicator-name">{nombre}</div>
                      <div className="result-card-indicator-value">{valor}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="result-card-no-data">No se encontraron indicadores financieros</p>
              )}
            </div>
          )}

          {/* Códigos UNSPSC */}
          <div className="result-card-section">
            <h4 className="result-card-section-title"> Códigos UNSPSC</h4>
            {unspsc.length > 0 ? (
              <div className="result-card-unspsc-codes">
                {unspsc.map((code) => (
                  <span key={code} className="result-card-unspsc-badge">
                    {code}
                  </span>
                ))}
              </div>
            ) : (
              <p className="result-card-no-data">No se encontraron códigos UNSPSC</p>
            )}
          </div>

          {/* Experiencia Requerida */}
          {experiencia && experiencia.experiencia_requerida && (
            <div className="result-card-section">
              <h4 className="result-card-section-title"> Experiencia Requerida</h4>
              <div className="result-card-experience-box">
                <p className="result-card-experience-summary">{experiencia.experiencia_requerida}</p>
              </div>
            </div>
          )}

          {/* Metadatos */}
          <div className="result-card-metadata">
            <div className="result-card-metadata-item">
              <span className="result-card-metadata-label">Método:</span>
              <span className="result-card-metadata-value">{resultado.metodo || "extraccion_local"}</span>
            </div>
            <div className="result-card-metadata-item">
              <span className="result-card-metadata-label">Items encontrados:</span>
              <span className="result-card-metadata-value">{resultado.items_encontrados || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Toggle indicator */}
      <div className="result-card-toggle">
        <span className={`result-card-toggle-icon ${isExpanded ? "expanded" : ""}`}>▼</span>
      </div>
    </div>
  );
}
