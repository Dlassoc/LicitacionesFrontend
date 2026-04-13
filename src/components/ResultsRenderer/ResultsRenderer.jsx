import React, { useState } from "react";
import ResultCard from "./ExtractionResultCard.jsx";
import "./results-renderer.css";

/**
 * Componente ResultsRenderer
 * Renderiza resultados de extracción con diseño profesional y bonito
 * Reemplaza la salida HTML simple por componentes React reutilizables
 */
export default function ResultsRenderer({ results, onBack }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!results || !results.items) {
    return <div className="results-renderer-error">No hay resultados para mostrar</div>;
  }

  const items = results.items || [];
  const successCount = items.filter((i) => i.ok).length;
  const errorCount = items.filter((i) => !i.ok).length;
  const skippedCount = items.filter((i) => i.motivo === "Documento descartado automáticamente").length;
  const ocrUsed = items.some((i) => i.ocr_usado);

  return (
    <div className="results-renderer-container">
      {/* OCR Warning Banner */}
      {ocrUsed && (
        <div className="results-renderer-ocr-warning">
          <div className="results-renderer-ocr-warning-content">
            <span className="results-renderer-ocr-warning-icon"></span>
            <div>
              <strong>Procesamiento con OCR</strong>
              <p>Este documento fue procesado con reconocimiento óptico de caracteres. Algunos valores pueden ser aproximados. Se recomienda verificar manualmente los indicadores importantes.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="results-renderer-header">
        <div>
          <h1 className="results-renderer-title"> Resultados de Análisis</h1>
          <p className="results-renderer-subtitle">
            Extracción de indicadores financieros, códigos UNSPSC y requisitos de experiencia
          </p>
        </div>
        {onBack && (
          <button onClick={onBack} className="results-renderer-back-button">
            ← Volver a Analizar
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="results-renderer-stats">
        <div className="results-renderer-stat">
          <div className="results-renderer-stat-number">{successCount}</div>
          <div className="results-renderer-stat-label">Exitosos</div>
        </div>
        {errorCount > 0 && (
          <div className="results-renderer-stat results-renderer-stat-error">
            <div className="results-renderer-stat-number">{errorCount}</div>
            <div className="results-renderer-stat-label">Errores</div>
          </div>
        )}
        {skippedCount > 0 && (
          <div className="results-renderer-stat results-renderer-stat-skipped">
            <div className="results-renderer-stat-number">{skippedCount}</div>
            <div className="results-renderer-stat-label">Descartados</div>
          </div>
        )}
        <div className="results-renderer-stat results-renderer-stat-info">
          <div className="results-renderer-stat-number">{items.length}</div>
          <div className="results-renderer-stat-label">Total</div>
        </div>
      </div>

      {/* Results */}
      <div className="results-renderer-list">
        {items.map((item, idx) => {
          // DEBUG: Verificar qué datos tiene cada item
          console.log(`🔍 [ResultsRenderer] Item ${idx}:`, {
            archivo: item.archivo,
            tiene_resultado: !!item.resultado,
            codigos_unspsc: item.resultado?.codigos_unspsc,
            experiencia: item.resultado?.experiencia_requerida
          });
          
          return (
            <ResultCard
              key={idx}
              item={item}
              isExpanded={expandedIndex === idx}
              onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
            />
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="results-renderer-footer">
        {onBack && (
          <button onClick={onBack} className="results-renderer-action-button">
            ↻ Procesar más archivos
          </button>
        )}
      </div>
    </div>
  );
}
