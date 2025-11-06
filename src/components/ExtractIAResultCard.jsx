import React from "react";

export default function ExtractIAResultCard({ item, isExpanded, onToggle }) {
  const { archivo, ok, error, paginas_totales, paginas_indicadores, resultado } = item;

  if (!ok) {
    return (
      <div className="border border-red-300 rounded-lg p-4 bg-red-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-medium text-red-900">{archivo}</p>
            <p className="text-xs text-red-700 mt-1">❌ {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border rounded-lg transition ${
        isExpanded
          ? "border-blue-400 bg-blue-50"
          : "border-gray-300 bg-white hover:border-gray-400"
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-100/50 transition"
      >
        <div className="flex-1">
          <p className="font-medium text-gray-900">{archivo}</p>
          <p className="text-xs text-gray-600 mt-1">
            📄 {paginas_totales} página{paginas_totales !== 1 ? "s" : ""} •
            ⭐ Indicadores en página{paginas_indicadores?.length !== 1 ? "s" : ""}{" "}
            {paginas_indicadores?.join(", ")}
          </p>
        </div>
        <div className={`text-xl transition ${isExpanded ? "rotate-180" : ""}`}>
          ▼
        </div>
      </button>

      {/* Contenido expandido */}
      {isExpanded && resultado && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="space-y-4">
            {/* Requisitos Habilitantes */}
            {resultado.requisitos_habilitantes && resultado.requisitos_habilitantes.length > 0 && (
              <section>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">
                  📋 Requisitos Habilitantes
                </h4>
                <ul className="space-y-1">
                  {resultado.requisitos_habilitantes.map((req, idx) => (
                    <li key={idx} className="text-sm text-gray-700 ml-4">
                      • {req}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Documentos Requeridos */}
            {resultado.documentos_requeridos && resultado.documentos_requeridos.length > 0 && (
              <section>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">
                  📄 Documentos Requeridos
                </h4>
                <ul className="space-y-1">
                  {resultado.documentos_requeridos.map((doc, idx) => (
                    <li key={idx} className="text-sm text-gray-700 ml-4">
                      • {doc}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Condiciones Adicionales */}
            {resultado.condiciones_adicionales && resultado.condiciones_adicionales.length > 0 && (
              <section>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">
                  ⚙️ Condiciones Adicionales
                </h4>
                <ul className="space-y-1">
                  {resultado.condiciones_adicionales.map((cond, idx) => (
                    <li key={idx} className="text-sm text-gray-700 ml-4">
                      • {cond}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Indicadores Financieros */}
            {resultado.indicadores_financieros && Object.keys(resultado.indicadores_financieros).length > 0 && (
              <section className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-3 border border-yellow-200">
                <h4 className="font-semibold text-sm text-yellow-900 mb-2">
                  💰 Indicadores Financieros Encontrados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(resultado.indicadores_financieros).map(([key, value], idx) => (
                    <div key={idx} className="bg-white rounded p-2 border border-yellow-100">
                      <p className="text-xs font-medium text-yellow-800">{key}</p>
                      <p className="text-sm font-bold text-yellow-900 mt-1">
                        {typeof value === 'number' ? value.toFixed(2) : value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* JSON Raw (para debugging) */}
            <details className="mt-4 p-2 bg-gray-100 rounded border border-gray-300">
              <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900">
                📊 Ver JSON completo (debugging)
              </summary>
              <pre className="mt-2 text-xs bg-gray-900 text-green-400 p-2 rounded overflow-auto max-h-60">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </details>

            {/* Confianza */}
            {resultado.confianza !== undefined && (
              <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Nivel de confianza</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all"
                      style={{ width: `${resultado.confianza * 100}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 min-w-fit">
                    {(resultado.confianza * 100).toFixed(0)}%
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
