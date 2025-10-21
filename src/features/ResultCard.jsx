import React from "react";

export default function ResultCard({ item, onClick }) {
  // Helper: toma la primera clave existente con valor "truthy"
  const v = (keys, fallback = null) => {
    for (const k of keys) {
      const val = item?.[k];
      if (val !== undefined && val !== null && String(val).trim() !== "") return val;
    }
    return fallback;
  };
  const urlProceso = v(["URL_Proceso"], "URL no disponible");

  // Compatibilidad p6dx-8zbt (Procesos) vs jbjy-vk9h (Contratos)
  const titulo = v(["Entidad", "nombre_entidad"], "Entidad no especificada");

  // Fase (Procesos) vs Estado (Contratos)
  const faseOestado = v(["Fase", "Estado"], "No disponible");

  // Cuantía (Procesos) vs Valor_contrato (Contratos)
  console.log(item); // Verifica los datos

// Aquí se asume que ya estás recibiendo precio_base en los datos del backend
const precio_base = v(["Precio_base"], "Cuantía no especificada");

  // Referencia del proceso vs contrato; si nada, usa Proceso_de_compra o ID_contrato
  const referencia = v(
    ["Referencia_del_proceso", "Referencia_del_contrato", "Proceso_de_compra", "ID_contrato"],
    "No disponible"
  );

  // Fecha publicación (Procesos) vs fecha de firma/inicio (Contratos)
  const fecha = v(["Fecha_publicacion", "Fecha_firma", "Fecha_inicio"], "No disponible");

  // Ubicación: claves distintas entre datasets
  const dpto = v(["Departamento_de_la_entidad", "Departamento"], "Departamento N/D");
  const ciudad = v(["Ciudad_entidad", "Ciudad"], "Ciudad N/D");

  const formatPrecio = (precio) => {
    if (precio && !isNaN(precio)) {
      return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
      }).format(Number(precio)); // Asegúrate de convertir a número
    }
    return precio;
  };

return (
  <button
    onClick={onClick}
    className="group relative w-full text-left rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
  >
    {/* Borde lateral con gradiente */}
    <span className="pointer-events-none absolute left-0 top-0 h-full w-[5px] rounded-l-2xl bg-gradient-to-b from-blue-600 via-sky-500 to-cyan-400 opacity-90" />

    <div className="pl-2">
      <h3 className="text-base font-semibold text-blue-800 line-clamp-2 group-hover:text-blue-900">
        {titulo}
      </h3>

      {/* Meta principal */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700">
          Ref: <span className="ml-1 font-mono">{referencia}</span>
        </span>
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
          {faseOestado}
        </span>
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
          {fecha}
        </span>
      </div>

      {/* Cuantía (Precio Base) */}
      <div className="mt-2 text-blue-700 font-semibold">💰 {formatPrecio(precio_base)}</div>

      {/* Mostrar el URL */}
      <div className="mt-2">
        <a href={urlProceso} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          Ver detalles del proceso
        </a>
      </div>

      {/* Ubicación */}
      <div className="mt-2 text-xs text-gray-500">
        {dpto} • {ciudad}
      </div>
    </div>
  </button>
  );
}
