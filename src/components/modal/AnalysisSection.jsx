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
  isBatchAnalysis = false,
  skipDownload = false,
}) {
  if (!docWithIndicators) return null;

  // Disparar análisis automáticamente cuando el componente se monta
  // PERO saltarlo si skipDownload es true (análisis previo ya existe)
  useEffect(() => {
    if (!skipDownload && !analyzing && !analyzed && !analysisError) {
      analyze();
    }
  }, [docWithIndicators, skipDownload, analyzing, analyzed, analysisError, analyze]);

  //  NUEVO: Usar analysisResults (nuevo formato) si existen, sino analyzed (formato antiguo)
  const results = analysisResults || analyzed;
  
  // ✅ NUEVO: Adaptar formato de análisis batch al formato esperado
  let adaptedResults = results;
  if (isBatchAnalysis && results) {
    // 🔧 Obtener datos de requisitos desde múltiples posibles ubicaciones
    const requisitos = results.requisitos_extraidos || results.requisitos || results || {};
    
    adaptedResults = {
      ...results,
      // Extraer matrices de múltiples posibles ubicaciones
      matrices: (requisitos?.matrices || results?.matrices || {}),
      // Extraer indicadores financieros
      indicadores: (requisitos?.indicadores_financieros || results?.indicadores || requisitos?.indicadores || {}),
      // Extraer códigos UNSPSC
      codigos_unspsc: (requisitos?.codigos_unspsc || results?.codigos_unspsc || []),
      // Extraer experiencia requerida  
      experiencia_requerida: (requisitos?.experiencia_requerida || results?.experiencia_requerida || {}),
      // Flag para análisis batch
      documentos_analizados: 'Análisis batch',
    };
  }
  
  //  DEBUG: Log para verificar qué datos llegan al componente
  console.log("🔍 [AnalysisSection] Props recibidas:", {
    isBatchAnalysis,
    analysisResults,
    analyzed,
    adaptedResults,
    codigos_unspsc: adaptedResults?.codigos_unspsc,
    experiencia: adaptedResults?.experiencia_requerida,
    matrices: adaptedResults?.matrices ? Object.keys(adaptedResults.matrices) : null,
    indicadores: adaptedResults?.indicadores ? Object.keys(adaptedResults.indicadores) : null
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

      {/* Mostrar errores SOLO si no hay resultados exitosos */}
      {analysisError && !hasAnalyzed && !adaptedResults && (
        <div className="analysis-section-error">
          <p className="analysis-section-error-text"> {analysisError}</p>
        </div>
      )}

      {/*  MODIFICADO: Mostrar resultados si tenemos datos (sin importar si analyzing) */}
      {hasAnalyzed && adaptedResults && (
        <div className={`analysis-section-success ${!adaptedResults.indicadores && !adaptedResults.indicadores_financieros && !adaptedResults.matrices ? 'analysis-section-success-no-indicators' : ''}`}>
          <div className="analysis-section-success-header">
            <h5 className="analysis-section-success-title">
               Análisis completado {isBatchAnalysis ? '(Batch)' : `(${adaptedResults.documentos_analizados || 0} documentos)`}
            </h5>
            {isBatchAnalysis && adaptedResults.cumple !== undefined && (
              <div className="analysis-section-batch-result">
                {adaptedResults.cumple ? (
                  <span className="analysis-section-batch-badge analysis-section-batch-badge-match">
                    ✅ CUMPLE ({adaptedResults.porcentaje_cumplimiento?.toFixed(0)}%)
                  </span>
                ) : adaptedResults.cumple === false ? (
                  <span className="analysis-section-batch-badge analysis-section-batch-badge-no-match">
                    ❌ NO CUMPLE
                  </span>
                ) : (
                  <span className="analysis-section-batch-badge analysis-section-batch-badge-neutral">
                    ℹ️ Sin evaluación
                  </span>
                )}
              </div>
            )}
          </div>

          {/*  NUEVO: Mostrar múltiples matrices (MIPYME y No-MIPYME) */}
          {adaptedResults.matrices && Object.keys(adaptedResults.matrices).length > 0 && (
            <div className="analysis-section-matrices-group">
              <p className="analysis-section-matrices-label"> Indicadores Financieros (Múltiples Matrices):</p>
              <div className="analysis-section-matrices-container">
                {Object.entries(adaptedResults.matrices).map(([matrizName, matrizData]) => (
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
          {adaptedResults.indicadores && Object.keys(adaptedResults.indicadores).length > 0 && (
            <div className="analysis-section-indicators-group">
              <p className="analysis-section-indicators-label"> Indicadores financieros requeridos:</p>
              <div className="analysis-section-indicators-box">
                {/* Verificar si tiene estructura NORMAL/MIPYME o plana */}
                {adaptedResults.indicadores.normal || adaptedResults.indicadores.mipyme || adaptedResults.indicadores.emprendimientos || adaptedResults.indicadores.individuales ? (
                  // Estructura categorizada (NORMAL/MIPYME/etc + individuales)
                  <div className="analysis-section-categories">
                    {Object.entries(adaptedResults.indicadores).map(([categoryName, categoryData], idx) => {
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
                    {Object.entries(adaptedResults.indicadores).map(([key, val]) => (
                      <li key={key} className="analysis-section-indicators-item">
                        <span><strong>{key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : val}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/*  NUEVO: Mostrar indicadores organizacionales si existen */}
              {adaptedResults.indicadores_organizacionales && Object.keys(adaptedResults.indicadores_organizacionales).length > 0 && (
                <div className="analysis-section-indicators-org-group">
                  <p className="analysis-section-indicators-org-label"> Indicadores Organizacionales ({Object.keys(adaptedResults.indicadores_organizacionales).length}):</p>
                  <div className="analysis-section-indicators-org-box">
                    {/* Verificar si tiene estructura NORMAL/MIPYME o plana */}
                    {adaptedResults.indicadores_organizacionales.normal || adaptedResults.indicadores_organizacionales.mipyme ? (
                      // Estructura categorizada
                      <div className="analysis-section-org-categories">
                        {Object.entries(adaptedResults.indicadores_organizacionales).map(([categoryName, categoryData], idx) => {
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
                        {Object.entries(adaptedResults.indicadores_organizacionales).map(([key, val]) => (
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
              {adaptedResults.codigos_unspsc && adaptedResults.codigos_unspsc.length > 0 && (
                <div className="analysis-section-unspsc-group">
                  <p className="analysis-section-unspsc-label">� Códigos UNSPSC ({adaptedResults.codigos_unspsc.length}):</p>
                  <div className="analysis-section-unspsc-codes">
                    {adaptedResults.codigos_unspsc.map((codigo, idx) => (
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
              {adaptedResults.experiencia_requerida && Object.keys(adaptedResults.experiencia_requerida).length > 0 && (
                <div className="analysis-section-experience-group">
                  <p className="analysis-section-experience-label"> Experiencia Requerida:</p>
                  <div className="analysis-section-experience-box">
                    {Object.entries(adaptedResults.experiencia_requerida).map(([key, val]) => (
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
          {adaptedResults.codigos_unspsc && Array.isArray(adaptedResults.codigos_unspsc) && adaptedResults.codigos_unspsc.length > 0 && (
            <div className="analysis-section-unspsc-group">
              <p className="analysis-section-unspsc-label"> Códigos UNSPSC ({adaptedResults.codigos_unspsc.length}):</p>
              <div className="analysis-section-unspsc-codes">
                {adaptedResults.codigos_unspsc.map((codigo, idx) => (
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
          {adaptedResults.experiencia_requerida && 
           typeof adaptedResults.experiencia_requerida === 'object' && 
           Object.keys(adaptedResults.experiencia_requerida).length > 0 &&
           Object.values(adaptedResults.experiencia_requerida).some(val => val !== null && val !== undefined && val !== '') && (
            <div className="analysis-section-experience-group">
              <p className="analysis-section-experience-label"> Experiencia Requerida:</p>
              <div className="analysis-section-experience-box">
                {Object.entries(adaptedResults.experiencia_requerida)
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
          {!adaptedResults.matrices && (!adaptedResults.indicadores || Object.keys(adaptedResults.indicadores).length === 0) && (
            <div className="analysis-section-no-indicators">
              <p className="analysis-section-no-indicators-title">
                ⓘ {adaptedResults.mensaje || "No se encontraron indicadores financieros"}
              </p>
              
              {/* Mostrar resumen del análisis */}
              <div className="analysis-section-no-indicators-summary">
                <p className="analysis-section-no-indicators-stat">
                   <strong>Documentos analizados:</strong> {adaptedResults.documentos_analizados || 0}
                </p>
                {adaptedResults.documentos_descartados > 0 && (
                  <p className="analysis-section-no-indicators-stat">
                     <strong>Documentos descartados:</strong> {adaptedResults.documentos_descartados} (administrativos)
                  </p>
                )}
                
                {/*  NUEVO: Mostrar conteo de qué se encontró */}
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
