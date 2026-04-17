import React from "react";

function buildHeaderText({ loading, resultados, lastQuery, total, loadedCount, offset, limit, hasResults }) {
  if (loading && (!resultados || resultados.length === 0)) {
    return "Buscando resultados…";
  }

  if (loading && resultados && resultados.length > 0) {
    return `Cargando… • Mostrando ${resultados.length} de la base de datos`;
  }

  if (lastQuery) {
    return `Total: ${total.toLocaleString("es-CO")} • Cargadas: ${loadedCount.toLocaleString("es-CO")} • Página ${Math.floor(offset / limit) + 1}`;
  }

  if (hasResults) {
    return `${resultados.length} licitaciones encontradas en la base de datos`;
  }

  return "Sin resultados";
}

export default function ResultsPanelHeader({ loading, resultados, lastQuery, total, loadedCount, offset, limit, hasResults }) {
  return (
    <div className="rp-header">
      <div className="rp-header-text">
        {buildHeaderText({ loading, resultados, lastQuery, total, loadedCount, offset, limit, hasResults })}
      </div>

      {/* 🔧 DESACTIVADO: Información de análisis automático - Ya no se muestra */}
      {/* {isPolling && (
        <div className="rp-analysis-info">
          ... (removido)
        </div>
      )} */}
    </div>
  );
}
