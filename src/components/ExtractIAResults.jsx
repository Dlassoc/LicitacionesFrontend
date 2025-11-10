import React, { useState } from "react";
import ExtractIAResultCard from "./ExtractIAResultCard.jsx";
import "../styles/components/extract-ia-results.css";

export default function ExtractIAResults({ data, onReset }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const items = data.items || [];
  const successCount = items.filter((i) => i.ok).length;
  const errorCount = items.filter((i) => !i.ok).length;

  return (
    <div className="extract-ia-results-container">
      {/* Resumen */}
      <div className="extract-ia-results-grid">
        <div className="extract-ia-results-stat-success">
          <p className="extract-ia-results-stat-label">Exitosos</p>
          <p className="extract-ia-results-stat-value">{successCount}</p>
        </div>
        {errorCount > 0 && (
          <div className="extract-ia-results-stat-error">
            <p className="extract-ia-results-stat-label">Errores</p>
            <p className="extract-ia-results-stat-value">{errorCount}</p>
          </div>
        )}
        <div className="extract-ia-results-stat-info">
          <p className="extract-ia-results-stat-label">Total</p>
          <p className="extract-ia-results-stat-value">{items.length}</p>
        </div>
      </div>

      {/* Lista de resultados con scrollbar */}
      <div className="extract-ia-results-list-wrapper">
        {items.map((item, idx) => (
          <ExtractIAResultCard
            key={idx}
            item={item}
            isExpanded={expandedIndex === idx}
            onToggle={() =>
              setExpandedIndex(expandedIndex === idx ? null : idx)
            }
          />
        ))}
      </div>

      {/* Botón para procesar más */}
      <button
        onClick={onReset}
        className="extract-ia-results-reset-button"
      >
        ↻ Procesar más archivos
      </button>
    </div>
  );
}
