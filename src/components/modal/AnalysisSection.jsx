/**
 * AnalysisSection - Sección de análisis de indicadores financieros
 * Muestra preview de texto e indicadores encontrados (proceso automático)
 */

import { useEffect } from "react";
import "../../styles/components/analysis-section.css";

export default function AnalysisSection({
  docWithIndicators,
  analyzing,
  analyzed,
  analysisError,
  analysisResults,
  analyze,
}) {
  if (!docWithIndicators) return null;

  //  Disparar análisis automáticamente cuando el componente se monta
  useEffect(() => {
    if (!analyzing && !analyzed && !analysisError) {
      analyze();
    }
  }, [docWithIndicators]);

  //  NUEVO: Usar analysisResults (nuevo formato) si existen, sino analyzed (formato antiguo)
  const results = analysisResults || analyzed;
  
  //  DEBUG: Log para verificar qué datos llegan al componente
  console.log("🔍 [AnalysisSection] Props recibidas:", {
    analysisResults,
    analyzed,
    results,
    codigos_unspsc: results?.codigos_unspsc,
    experiencia: results?.experiencia_requerida,
    matrices: results?.matrices ? Object.keys(results.matrices) : null,
    indicadores: results?.indicadores ? Object.keys(results.indicadores) : null
  });
  
  //  NUEVO: Si analyzed es solo boolean true (flag de completado), considerar que tenemos datos
  const hasAnalyzed = typeof analyzed === 'boolean' ? analyzed : !!analyzed;

  return (
    <div className="analysis-section-container">
      <div className="analysis-section-header">
        <h4 className="analysis-section-title"> Análisis de indicadores financieros</h4>
      </div>

      {/*  NUEVO: Mostrar análisis en progreso SOLO si realmente está analizando y no hay datos */}
      {analyzing && !analyzed && (
        <div className="analysis-section-analyzing">
          <div className="analysis-section-analyzing-spinner" />
          <span className="analysis-section-analyzing-text">Descargando y analizando documento(s)...</span>
        </div>
      )}

      {/* Mostrar errores */}
      {analysisError && (
        <div className="analysis-section-error">
          <p className="analysis-section-error-text"> {analysisError}</p>
        </div>
      )}

      {/*  MODIFICADO: Mostrar resultados si tenemos datos (sin importar si analyzing) */}
      {hasAnalyzed && results && (
        <div className={`analysis-section-success ${!results.indicadores && !results.indicadores_financieros && !results.matrices ? 'analysis-section-success-no-indicators' : ''}`}>
          <div className="analysis-section-success-header">
            <h5 className="analysis-section-success-title">
               Análisis completado ({results.documentos_analizados || 0} documentos)
            </h5>
          </div>

          {/*  NUEVO: Mostrar múltiples matrices (MIPYME y No-MIPYME) */}
          {results.matrices && Object.keys(results.matrices).length > 0 && (
            <div className="analysis-section-matrices-group">
              <p className="analysis-section-matrices-label"> Indicadores Financieros (Múltiples Matrices):</p>
              <div className="analysis-section-matrices-container">
                {Object.entries(results.matrices).map(([matrizName, matrizData]) => (
                  <div key={matrizName} className={`analysis-section-matriz-box ${matrizName === 'mipyme' ? 'mipyme' : 'no-mipyme'}`}>
                    <h5 className="analysis-section-matriz-title">
                      {matrizName === 'mipyme' ? ' MIPYME' : ' No-MIPYME'}
                    </h5>
                    <ul className="analysis-section-indicators-list">
                      {Object.entries(matrizData).map(([key, val]) => (
                        <li key={key} className="analysis-section-indicators-item">
                          <span><strong>{key}:</strong> {val}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/*  NUEVO: Mostrar indicadores (formato antiguo o alternativo) */}
          {results.indicadores && Object.keys(results.indicadores).length > 0 && (
            <div className="analysis-section-indicators-group">
              <p className="analysis-section-indicators-label"> Indicadores financieros requeridos:</p>
              <div className="analysis-section-indicators-box">
                {/* Verificar si tiene estructura NORMAL/MIPYME o plana */}
                {results.indicadores.normal || results.indicadores.mipyme || results.indicadores.emprendimientos || results.indicadores.individuales ? (
                  // Estructura categorizada (NORMAL/MIPYME/etc + individuales)
                  <div className="analysis-section-categories">
                    {Object.entries(results.indicadores).map(([categoryName, categoryData], idx) => {
                      // Saltar si es un diccionario vacío
                      if (typeof categoryData !== 'object' || Object.keys(categoryData).length === 0) {
                        return null;
                      }
                      
                      // Para 'individuales', mostrar un título especial
                      const displayTitle = categoryName === 'individuales' 
                        ? 'Indicadores Encontrados' 
                        : categoryName.toUpperCase();
                      
                      return (
                        <div key={idx} className={`analysis-section-category ${categoryName === 'individuales' ? 'individual' : ''}`}>
                          <h5 className="analysis-section-category-title">{displayTitle}</h5>
                          <ul className="analysis-section-indicators-list">
                            {Object.entries(categoryData).map(([key, val]) => (
                              <li key={key} className="analysis-section-indicators-item">
                                <span><strong>{key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : val}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Estructura plana
                  <ul className="analysis-section-indicators-list">
                    {Object.entries(results.indicadores).map(([key, val]) => (
                      <li key={key} className="analysis-section-indicators-item">
                        <span><strong>{key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : val}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/*  NUEVO: Mostrar indicadores organizacionales si existen */}
              {results.indicadores_organizacionales && Object.keys(results.indicadores_organizacionales).length > 0 && (
                <div className="analysis-section-indicators-org-group">
                  <p className="analysis-section-indicators-org-label"> Indicadores Organizacionales ({Object.keys(results.indicadores_organizacionales).length}):</p>
                  <div className="analysis-section-indicators-org-box">
                    {/* Verificar si tiene estructura NORMAL/MIPYME o plana */}
                    {results.indicadores_organizacionales.normal || results.indicadores_organizacionales.mipyme ? (
                      // Estructura categorizada
                      <div className="analysis-section-org-categories">
                        {Object.entries(results.indicadores_organizacionales).map(([categoryName, categoryData], idx) => {
                          if (typeof categoryData !== 'object' || Object.keys(categoryData).length === 0) {
                            return null;
                          }
                          
                          return (
                            <div key={idx} className="analysis-section-org-category">
                              <h5 className="analysis-section-org-category-title">{categoryName.toUpperCase()}</h5>
                              <ul className="analysis-section-indicators-org-list">
                                {Object.entries(categoryData).map(([key, val]) => (
                                  <li key={key} className="analysis-section-indicators-org-item">
                                    <span><strong>{key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : val}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Estructura plana
                      <ul className="analysis-section-indicators-org-list">
                        {Object.entries(results.indicadores_organizacionales).map(([key, val]) => (
                          <li key={key} className="analysis-section-indicators-org-item">
                            <span><strong>{key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : val}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              
              {/*  NUEVO: Mostrar códigos UNSPSC si existen */}
              {results.codigos_unspsc && results.codigos_unspsc.length > 0 && (
                <div className="analysis-section-unspsc-group">
                  <p className="analysis-section-unspsc-label">� Códigos UNSPSC ({results.codigos_unspsc.length}):</p>
                  <div className="analysis-section-unspsc-codes">
                    {results.codigos_unspsc.map((codigo, idx) => (
                      <span
                        key={`${codigo}-${idx}`}
                        className="analysis-section-unspsc-code"
                      >
                        {codigo}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/*  NUEVO: Mostrar experiencia requerida si existe */}
              {results.experiencia_requerida && Object.keys(results.experiencia_requerida).length > 0 && (
                <div className="analysis-section-experience-group">
                  <p className="analysis-section-experience-label"> Experiencia Requerida:</p>
                  <div className="analysis-section-experience-box">
                    {Object.entries(results.experiencia_requerida).map(([key, val]) => (
                      <p key={key} className="analysis-section-experience-text">
                        <strong>{key}:</strong> {val}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/*  NUEVO: Mostrar códigos UNSPSC si existen (SIEMPRE, independiente de indicadores/matrices) */}
          {results.codigos_unspsc && Array.isArray(results.codigos_unspsc) && results.codigos_unspsc.length > 0 && (
            <div className="analysis-section-unspsc-group">
              <p className="analysis-section-unspsc-label"> Códigos UNSPSC ({results.codigos_unspsc.length}):</p>
              <div className="analysis-section-unspsc-codes">
                {results.codigos_unspsc.map((codigo, idx) => (
                  <span
                    key={`${codigo}-${idx}`}
                    className="analysis-section-unspsc-code"
                  >
                    {codigo}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/*  NUEVO: Mostrar experiencia requerida si existe (SIEMPRE, independiente de indicadores/matrices) */}
          {results.experiencia_requerida && 
           typeof results.experiencia_requerida === 'object' && 
           Object.keys(results.experiencia_requerida).length > 0 &&
           Object.values(results.experiencia_requerida).some(val => val !== null && val !== undefined && val !== '') && (
            <div className="analysis-section-experience-group">
              <p className="analysis-section-experience-label"> Experiencia Requerida:</p>
              <div className="analysis-section-experience-box">
                {Object.entries(results.experiencia_requerida)
                  .filter(([key, val]) => val !== null && val !== undefined && val !== '')
                  .map(([key, val]) => (
                    <p key={key} className="analysis-section-experience-text">
                      <strong>{key}:</strong> {val}
                    </p>
                  ))}
              </div>
            </div>
          )}
          
          {/*  NUEVO: Mostrar cuando no hay indicadores pero puede haber otros datos */}
          {!results.matrices && (!results.indicadores || Object.keys(results.indicadores).length === 0) && (
            <div className="analysis-section-no-indicators">
              <p className="analysis-section-no-indicators-title">
                ⓘ {results.mensaje || "No se encontraron indicadores financieros"}
              </p>
              
              {/* Mostrar resumen del análisis */}
              <div className="analysis-section-no-indicators-summary">
                <p className="analysis-section-no-indicators-stat">
                   <strong>Documentos analizados:</strong> {results.documentos_analizados || 0}
                </p>
                {results.documentos_descartados > 0 && (
                  <p className="analysis-section-no-indicators-stat">
                     <strong>Documentos descartados:</strong> {results.documentos_descartados} (administrativos)
                  </p>
                )}
                
                {/*  NUEVO: Mostrar conteo de qué se encontró */}
                {results.indicadores_organizacionales && Object.keys(results.indicadores_organizacionales).length > 0 && (
                  <p className="analysis-section-no-indicators-stat">
                     <strong>Indicadores organizacionales encontrados:</strong> {Object.keys(results.indicadores_organizacionales).length}
                  </p>
                )}
                {results.codigos_unspsc && results.codigos_unspsc.length > 0 && (
                  <p className="analysis-section-no-indicators-stat">
                     <strong>Códigos UNSPSC encontrados:</strong> {results.codigos_unspsc.length}
                  </p>
                )}
                {results.experiencia_requerida && Object.keys(results.experiencia_requerida).length > 0 && (
                  <p className="analysis-section-no-indicators-stat">
                     <strong>Requisitos de experiencia encontrados:</strong> {Object.keys(results.experiencia_requerida).length}
                  </p>
                )}
                
                <p className="analysis-section-no-indicators-description">
                  Los documentos analizados no contienen indicadores financieros relevantes. Esto puede significar que son documentos técnicos, administrativos o no relacionados con la evaluación financiera.
                </p>
              </div>
              
              {/*  NUEVO: Mostrar indicadores organizacionales si existen (incluso sin indicadores financieros) */}
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
          )}
        </div>
      )}
    </div>
  );
}
