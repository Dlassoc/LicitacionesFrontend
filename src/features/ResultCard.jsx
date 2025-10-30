import React, { useMemo } from "react";

/* ========== Helpers de normalización ========== */
const canon = (k) =>
  String(k || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

const buildIndex = (obj) => {
  const idx = new Map();
  for (const [k, v] of Object.entries(obj || {})) idx.set(canon(k), v);
  return idx;
};

/* ========== Resolución robusta del URL del proceso ========== */
const getUrlProceso = (item) => {
  if (!item) return "#";

  // 1) Preferir anidado: urlproceso.url
  if (item.urlproceso && item.urlproceso.url) {
    return item.urlproceso.url; // Usamos la URL de "urlproceso.url"
  }

  // 2) Variantes planas conocidas
  const flat =
    (item["URL_Proceso"] || item["url_proceso"] || item["url"] || item["link"]);

  // 3) Si ya es un detalle público, usarlo
  if (typeof flat === "string" && /OpportunityDetail|noticeUID|isFromPublicArea/i.test(flat)) {
    return flat;
  }

  return flat || "#";
};

const get = (item, idx, keys, fallback = null) => {
  for (const k of keys) {
    // acceso por rutas anidadas
    if (k.includes(".")) {
      const v2 = getByPath(item, k);
      if (v2 !== undefined && v2 !== null && String(v2).trim() !== "") return v2;
    }
    const val = idx.get(canon(k));
    if (val !== undefined && val !== null && String(val).trim() !== "") return val;
  }
  return fallback;
};

const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = String(path).split(".");
  let cur = obj;
  for (const seg of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    const target = Object.keys(cur).find((k) => canon(k) === canon(seg));
    if (!target) return undefined;
    cur = cur[target];
  }
  return cur;
};

const formatCOP = (val) => {
  if (val === null || val === undefined) return "No disponible";
  const only = String(val).replace(/[^\d.,-]/g, "");
  const num = Number(only.replace(/\./g, "").replace(/,/g, "."));
  if (!isFinite(num) || isNaN(num) || num === 0) return "Cuantía no especificada";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(num);
};

export default function ResultCard({ item = {}, onClick }) {
  const idx = useMemo(() => buildIndex(item), [item]);

  const urlResuelto = getUrlProceso(item);

  const titulo = get(item, idx, ["Entidad", "nombre_entidad", "entidad", "nombreEntidad"], "Entidad no especificada");
  const fase   = get(item, idx, ["Fase", "Estado", "fase", "estado"], "No disponible");
  const ref    = get(item, idx, ["Referencia_del_proceso", "Referencia_del_contrato", "Proceso_de_compra", "ID_contrato", "referencia", "id_contrato"], "No disponible");
  const dpto   = get(item, idx, ["Departamento_de_la_entidad", "Departamento", "departamento_de_la_entidad", "departamento"], "Departamento N/D");
  const ciudad = get(item, idx, ["Ciudad_entidad", "Ciudad", "ciudad_entidad", "ciudad"], "Ciudad N/D");
  const precioVal = get(item, idx, ["Precio_base", "precio_base", "cuantia", "valor", "valor_contrato", "valor_estimado"], null);
  const precio = precioVal ? formatCOP(precioVal) : "Cuantía no especificada";
  const descripcion = get(item, idx, ["Descripcion", "descripcion"], "");

  return (
    <article
      onClick={onClick}
      className="group relative w-full text-left rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-blue-300 transition font-proxima"
    >
      <span className="pointer-events-none absolute left-0 top-0 h-full w-[6px] rounded-l-2xl bg-gradient-to-b from-blue-600 via-sky-500 to-cyan-400 opacity-80" />

      <header className="pl-4">
        <h3 className="font-redring text-[1.15rem] leading-snug text-blue-800 group-hover:text-blue-900">
          {titulo}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-blue-700">
            Ref: <span className="ml-1 font-mono">{ref}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-700">
            {fase}
          </span>
          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-700">
            {dpto} • {ciudad}
          </span>
        </div>
      </header>

      {descripcion ? (
        <section className="mt-4 pl-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
            <p className="text-[13px] leading-relaxed text-blue-900">
              {descripcion}
            </p>
          </div>
        </section>
      ) : null}

      <footer className="mt-5 pl-4 pt-3 border-t border-gray-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-blue-700 font-semibold">💰 {precio}</div>
        <a
          href={typeof urlResuelto === "string" ? urlResuelto : "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
        >
          Ver detalles del proceso
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </footer>
    </article>
  );
}
