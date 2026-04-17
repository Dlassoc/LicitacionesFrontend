import React from "react";

export default function ResultsPagination({ resultados, offset, limit, total, onPage }) {
  if (!resultados || resultados.length === 0) return null;

  return (
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
  );
}
