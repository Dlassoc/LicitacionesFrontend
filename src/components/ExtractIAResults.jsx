import React, { useState } from "react";
import ExtractIAResultCard from "./ExtractIAResultCard.jsx";

export default function ExtractIAResults({ data, onReset }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const items = data.items || [];
  const successCount = items.filter((i) => i.ok).length;
  const errorCount = items.filter((i) => !i.ok).length;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-600">Exitosos</p>
          <p className="text-2xl font-bold text-green-700">{successCount}</p>
        </div>
        {errorCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-600">Errores</p>
            <p className="text-2xl font-bold text-red-700">{errorCount}</p>
          </div>
        )}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600">Total</p>
          <p className="text-2xl font-bold text-blue-700">{items.length}</p>
        </div>
      </div>

      {/* Lista de resultados con scrollbar */}
      <div className="max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3 scrollbar-thin">
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
        className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
      >
        ↻ Procesar más archivos
      </button>
    </div>
  );
}
