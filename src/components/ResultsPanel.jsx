import React from "react";
import ResultCard from "../features/ResultCard.jsx";
import SkeletonCard from "../features/SkeletonCard.jsx";
import "../styles/results-panel.css";
import "../styles/results-panel.css";

export default function ResultsPanel({
  resultados, loading, error,
  total, limit, offset, lastQuery,
  onPage,
  onItemClick
}) {
  return (
    <div className="rp">
      <div className="rp-box">
        <div className="rp-header">
          <div className="rp-header-text">
            {loading
              ? "Buscando resultados…"
              : lastQuery
              ? `Total: ${total.toLocaleString("es-CO")} • Mostrando ${Math.min(
                  limit,
                  Math.max(0, total - offset)
                )} • Desde ${total === 0 ? 0 : offset + 1}`
              : "Realiza una búsqueda para ver resultados"}
          </div>
        </div>

        <div className="rp-body">
          {error && (
            <p className="rp-error">{error}</p>
          )}

          {loading && (
            <div className="rp-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && (!resultados || resultados.length === 0) && lastQuery && (
            <div className="rp-empty">
              No se encontraron resultados con los filtros actuales.
              <div className="mt-3">Prueba cambiando el término o ampliando el rango de fechas.</div>
            </div>
          )}

          {!loading && resultados && resultados.length > 0 && (
            <div className="rp-grid">
              {resultados.map((item, idx) => (
                <ResultCard
                  key={`${item.Referencia_del_proceso || "ref"}-${idx}`}
                  item={item}
                  onClick={() => onItemClick(item)}
                />
              ))}
            </div>
          )}

          {!loading && resultados && resultados.length > 0 && (
            <div className="rp-footer">
              <div className="rp-footer-text">
                Página {Math.floor(offset / limit) + 1} de {Math.max(1, Math.ceil(total / limit))}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => onPage(Math.max(offset - limit, 0))}
                  className="rp-btn"
                  disabled={offset === 0}
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => onPage(offset + limit)}
                  className="rp-btn"
                  disabled={offset + limit >= total}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
