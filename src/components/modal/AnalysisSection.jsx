/**
 * AnalysisSection - Sección de análisis de indicadores financieros
 * Muestra preview de texto e indicadores encontrados (proceso automático)
 */

import { useEffect } from "react";
import { devLog } from "../../utils/devLog.js";
import { buildAnalysisSectionView } from "./analysisSection/analysisSectionView.js";
import { ExperienceBlock, UnspscCodesBlock } from "./analysisSection/SharedBlocks.jsx";
import { NoIndicatorsSummaryBlock, OrganizationalIndicatorsBlock } from "./analysisSection/OrganizationalBlocks.jsx";
import FinancialIndicatorsBlock from "./analysisSection/FinancialIndicatorsBlock.jsx";
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

  const { results, adaptedResults, hasAnalyzed } = buildAnalysisSectionView({
    analysisResults,
    analyzed,
    isBatchAnalysis,
  });
  
  //  DEBUG: Log para verificar qué datos llegan al componente
  devLog("🔍 [AnalysisSection] Props recibidas:", {
    isBatchAnalysis,
    analysisResults,
    analyzed,
    adaptedResults,
    codigos_unspsc: adaptedResults?.codigos_unspsc,
    experiencia: adaptedResults?.experiencia_requerida,
    matrices: adaptedResults?.matrices ? Object.keys(adaptedResults.matrices) : null,
    indicadores: adaptedResults?.indicadores ? Object.keys(adaptedResults.indicadores) : null
  });
  
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
                    CUMPLE ({(Number(adaptedResults.porcentaje_cumplimiento) || 0).toFixed(0)}%)
                  </span>
                ) : adaptedResults.cumple === false ? (
                  <span className="analysis-section-batch-badge analysis-section-batch-badge-no-match">
                    NO CUMPLE
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
            <>
              <FinancialIndicatorsBlock indicadores={adaptedResults.indicadores} />
              <OrganizationalIndicatorsBlock indicadores={adaptedResults.indicadores_organizacionales} />
              
              {/*  NUEVO: Mostrar códigos UNSPSC si existen */}
              <UnspscCodesBlock codigos={adaptedResults.codigos_unspsc} />
              
              {/*  NUEVO: Mostrar experiencia requerida si existe */}
              <ExperienceBlock experiencia={adaptedResults.experiencia_requerida} />
            </>
          )}
          
          {/*  NUEVO: Mostrar códigos UNSPSC si existen (SIEMPRE, independiente de indicadores/matrices) */}
          <UnspscCodesBlock codigos={adaptedResults.codigos_unspsc} />
          
          {/*  NUEVO: Mostrar experiencia requerida si existe (SIEMPRE, independiente de indicadores/matrices) */}
          <ExperienceBlock experiencia={adaptedResults.experiencia_requerida} filterEmpty />
          
          <NoIndicatorsSummaryBlock adaptedResults={adaptedResults} results={results} />
        </div>
      )}
    </div>
  );
}
