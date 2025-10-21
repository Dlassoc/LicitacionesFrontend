import React from "react";
import ResultCard from "../features/ResultCard.jsx";
import SkeletonCard from "../features/SkeletonCard.jsx";

export default function ResultsPanel({
  resultados, loading, error,
  total, limit, offset, lastQuery,
  onPage,
  onItemClick
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="relative bg-white/0 rounded-lg border border-transparent">
        <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur rounded-t-lg border-b border-gray-200 px-3 py-2 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {loading
              ? "Buscando resultados…"
              : lastQuery
              ? `Total: ${total.toLocaleString("es-CO")} • Mostrando ${Math.min(limit, Math.max(0, total - offset))} • Desde ${total === 0 ? 0 : offset + 1}`
              : "Realiza una búsqueda para ver resultados"}
          </div>
        </div>

        <div className="
            max-h-[70vh]
            overflow-y-auto
            overscroll-contain
            p-3
            bg-white
            rounded-b-lg
            border border-gray-200
            shadow-sm
          ">
          {error && (
            <p className="text-center mt-4 text-red-600 font-medium">{error}</p>
          )}

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && (!resultados || resultados.length === 0) && lastQuery && (
            <div className="p-8 text-center text-gray-500">
              No se encontraron resultados con los filtros actuales.
              <div className="mt-3">Prueba cambiando el término o ampliando el rango de fechas.</div>
            </div>
          )}

          {!loading && resultados && resultados.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="sticky bottom-0 mt-4 bg-white py-2 -mx-3 px-3 border-t border-gray-200 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Página {Math.floor(offset / limit) + 1} de {Math.max(1, Math.ceil(total / limit))}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => onPage(Math.max(offset - limit, 0))}
                  className="px-3 py-1 rounded border text-blue-700 disabled:opacity-50"
                  disabled={offset === 0}
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => onPage(offset + limit)}
                  className="px-3 py-1 rounded border text-blue-700 disabled:opacity-50"
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
