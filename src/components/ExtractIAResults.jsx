import React from "react";
import { ResultsRenderer } from "./ResultsRenderer";
import "../styles/components/extract-ia-results.css";

/**
 * ExtractIAResults
 * Envoltorio que usa el nuevo ResultsRenderer para mostrar resultados
 */
export default function ExtractIAResults({ data, onReset }) {
  return (
    <div className="extract-ia-results-wrapper">
      <ResultsRenderer results={data} onBack={onReset} />
    </div>
  );
}

