import { useEffect, useMemo, useRef, useState } from 'react';
import { categorizeResultados, matchesPreferredKeywords } from './classification.js';

export function useResultsPanelState({
  resultados,
  analysisStatus,
  discardedIds,
  isDiscarded,
  preferredKeywords,
  debugLog,
}) {
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  const [filterCategory, setFilterCategory] = useState('all');
  const [showOnlyMatching, setShowOnlyMatching] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    cumple: true,
    noCumple: true,
    sinDocumentos: true,
    sinAnalizar: true,
    sinRequisitos: true,
  });

  const [stableAnalysisStatus, setStableAnalysisStatus] = useState(analysisStatus);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (resultados && resultados.length > 0) {
      setForceUpdateKey((prev) => prev + 1);
      debugLog('[RESULTS_PANEL] 🔄 NUEVA DATA DETECTADA - Forzando re-categorización, items:', resultados.length);
    }
  }, [resultados?.length]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setStableAnalysisStatus(analysisStatus);
      debugLog('[RESULTS_PANEL] 🔄 analysisStatus actualizado (debounced 100ms)');
    }, 100);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [analysisStatus]);

  const categorized = useMemo(() => {
    debugLog(`[RESULTS_PANEL] Categorizando ${resultados?.length || 0} resultados... (key: ${forceUpdateKey})`);
    const next = categorizeResultados({
      resultados,
      analysisStatus: stableAnalysisStatus,
      isDiscarded,
      debugLog,
    });

    debugLog(
      `[RESULTS_PANEL] 📊 FINAL: cumple=${next.cumple.length}, noCumple=${next.noCumple.length}, sinDocumentos=${next.sinDocumentos.length}, sinAnalizar=${next.sinAnalizar.length}, sinRequisitos=${next.sinRequisitos.length}`
    );
    return next;
  }, [resultados, stableAnalysisStatus, discardedIds, isDiscarded, forceUpdateKey, debugLog]);

  const resultadosFiltrados = useMemo(() => {
    const { cumple, noCumple, sinDocumentos } = categorized;

    let items = [];
    switch (filterCategory) {
      case 'cumple':
        items = cumple;
        break;
      case 'no-cumple':
        items = noCumple;
        break;
      case 'sin-documentos':
        items = sinDocumentos;
        break;
      default:
        items = resultados || [];
    }

    if (showOnlyMatching && preferredKeywords && preferredKeywords.length > 0) {
      items = items.filter((item) => matchesPreferredKeywords(item, preferredKeywords));
    } else if (preferredKeywords && preferredKeywords.length > 0) {
      items = [...items].sort((a, b) => {
        const aMatches = matchesPreferredKeywords(a, preferredKeywords) ? 1 : 0;
        const bMatches = matchesPreferredKeywords(b, preferredKeywords) ? 1 : 0;
        return bMatches - aMatches;
      });
    }

    return items;
  }, [filterCategory, categorized, resultados, showOnlyMatching, preferredKeywords]);

  return {
    filterCategory,
    setFilterCategory,
    showOnlyMatching,
    setShowOnlyMatching,
    expandedSections,
    setExpandedSections,
    stableAnalysisStatus,
    categorized,
    resultadosFiltrados,
  };
}
