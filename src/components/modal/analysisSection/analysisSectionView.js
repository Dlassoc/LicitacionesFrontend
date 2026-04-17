export function buildAnalysisSectionView({ analysisResults, analyzed, isBatchAnalysis }) {
  const results = analysisResults || analyzed;
  let adaptedResults = results;

  if (isBatchAnalysis && results) {
    const requisitos = results.requisitos_extraidos || results.requisitos || results || {};

    adaptedResults = {
      ...results,
      matrices: requisitos?.matrices || results?.matrices || {},
      indicadores: requisitos?.indicadores_financieros || results?.indicadores || requisitos?.indicadores || {},
      codigos_unspsc: requisitos?.codigos_unspsc || results?.codigos_unspsc || [],
      experiencia_requerida: requisitos?.experiencia_requerida || results?.experiencia_requerida || {},
      documentos_analizados: "Analisis batch",
    };
  }

  const hasAnalyzed = typeof analyzed === "boolean" ? analyzed : !!analyzed;

  return {
    results,
    adaptedResults,
    hasAnalyzed,
  };
}
