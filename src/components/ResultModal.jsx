import React, { useEffect, useMemo, useState } from "react";

/* ==== Helpers para hallar ID_Portafolio de forma robusta ==== */
const canon = (k) =>
  String(k || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

const buildIndex = (obj) => {
  const idx = new Map();
  for (const [k, v] of Object.entries(obj || {})) idx.set(canon(k), v);
  return idx;
};

const get = (item, idx, keys, fallback = null) => {
  for (const k of keys) {
    const v = idx.get(canon(k));
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

// -------- Socrata: endpoint público --------
const DMGG_API = "https://www.datos.gov.co/resource/dmgg-8hin.json";

/** Devuelve la primera URL válida (string o {url: "..."}) */
const firstUrl = (...vals) => {
  for (const v of vals) {
    if (v && typeof v === "object" && typeof v.url === "string" && v.url.startsWith("http")) {
      return v.url.trim();
    }
    if (typeof v === "string" && v.trim().startsWith("http")) {
      return v.trim();
    }
  }
  return null;
};

/** Toma un registro de dmgg-8hin y arma un objeto amigable para UI. */
const mapDoc = (doc) => {
  // Título: probar varias variantes comunes
  const titulo =
    doc?.nombre_documento ??
    doc?.nombre_do ??                  // por si viene truncado en UI
    doc?.nombre_del_documento ??
    doc?.documento ??
    doc?.titulo ??
    doc?.nombre_archivo ??
    doc?.descripcion ??                // fallback razonable
    "Documento";

  // Tipo/extensión
  const tipo =
    doc?.tipo_de_documento ??
    doc?.tipo_documento ??
    doc?.extension ??
    doc?.tipo ??
    null;

  // Fecha (en el dataset suele ser "fecha_carga" o algo similar)
  const fecha =
    doc?.fecha_publicacion_documento ??
    doc?.fecha_carga ??
    doc?.fecha ??
    doc?.fecha_publicacion ??
    null;

  const tamanio =
    doc?.tamano ??
    doc?.tamanio ??
    doc?.tamano_documento ??
    doc?.size_bytes ??
    null;

  const proceso = doc?.proceso ?? null;

  // URL de descarga (caso típico: url_descarga_documento: {url: "..."} )
  const url = firstUrl(
    doc?.url_descarga_documento,
    doc?.url,
    doc?.enlace,
    doc?.link,
    doc?.url_descarga,
    doc?.archivo,
    doc?.archivo_url,
    doc?.ruta
  );

  return { titulo, tipo, fecha, tamanio, proceso, url };
};

export default function ResultModal({ open, item, onClose }) {
  if (!open || !item) return null;

  // Bloquear scroll y ESC
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const [descExpanded, setDescExpanded] = useState(false);

  // ==== Descargas por 'proceso' (equivale a id_del_portafolio) ====
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsErr, setDocsErr] = useState("");
  const [debugQuery, setDebugQuery] = useState(null); // opcional

  const idx = useMemo(() => buildIndex(item), [item]);
  const idPortafolio = useMemo(
    () => get(item, idx, ["ID_Portafolio", "id_del_portafolio", "idPortafolio", "id_portafolio"], null),
    [item, idx]
  );

  useEffect(() => {
    let abort = false;
    (async () => {
      setDocsErr("");
      setDocs([]);
      setDebugQuery(null);

      if (!idPortafolio) return;

      setDocsLoading(true);
      try {
        const clean = idPortafolio.trim();

        // WHERE robusto sin $select para evitar "no-such-column"
        const where = `(upper(trim(proceso)) = upper('${clean}') OR proceso LIKE '${clean}%')`;

        const params = new URLSearchParams();
        params.set("$where", where);
        params.set("$limit", "200");
        // Nota: evitamos $order para no depender del nombre exacto de la fecha

        const url = `${DMGG_API}?${params.toString()}`;
        setDebugQuery({ DMGG_API, params: Object.fromEntries(params.entries()) });

        const res = await fetch(url, { method: "GET" });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Socrata respondió ${res.status}: ${txt || "error"}`);
        }
        const raw = await res.json();
        // Mapeamos y nos quedamos con los que efectivamente tienen URL descargable
        const mapped = Array.isArray(raw) ? raw.map(mapDoc).filter(d => !!d.url) : [];
        if (!abort) setDocs(mapped);
      } catch (e) {
        if (!abort) setDocsErr(e.message || "Error al cargar descargas");
      } finally {
        if (!abort) setDocsLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [idPortafolio]);

  // ==== Metadatos ya existentes del modal ====
  const title = item.Entidad || "Proyecto sin nombre";
  const urlProceso = item.URL_Proceso || item.Enlace_oficial || null;

  const prettyKey = (k) =>
    k.replace(/_/g, " ")
     .replace(/([A-Z])/g, " $1")
     .replace(/\s+/g, " ")
     .trim();

  const renderVal = (v) => {
    if (v === null || v === undefined || v === "") return "No disponible";
    if (Array.isArray(v)) return v.length ? v.join(", ") : "No disponible";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const OMIT = new Set(["Enlace_oficial", "Documentos", "URL_Proceso", "ID_Portafolio", "id_del_portafolio"]);
  const isDescriptionKey = (k) => /descripci[oó]n/i.test(k);

  const entries = Object.entries(item).filter(([key]) => !OMIT.has(key));
  const descEntries = entries.filter(([key]) => isDescriptionKey(key));
  const chipEntries = entries.filter(([key]) => !isDescriptionKey(key));

  const previewText = (txt, maxChars = 320) =>
    txt.length > maxChars ? txt.slice(0, maxChars).trim() + "…" : txt;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-10 shadow-2xl ring-1 ring-black/5 text-[15px] leading-relaxed"
          style={{ fontFamily: "Arial, Helvetica, ui-sans-serif, system-ui" }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 rounded-full px-2 text-3xl leading-none text-gray-500 hover:text-gray-700"
            aria-label="Cerrar"
          >
            ×
          </button>

          {/* Header */}
          <div className="text-center">
            <h2
              id="modal-title"
              className="text-[30px] md:text-[34px] leading-tight font-semibold tracking-tight"
            >
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
                {title}
              </span>
            </h2>

            <div className="mx-auto mt-5 h-px w-28 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          </div>

          {/* Enlace al proceso */}
          {urlProceso && (
            <div className="mt-6 flex items-center justify-center">
              <a
                href={urlProceso}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-[14px] text-blue-700 shadow-sm transition hover:bg-blue-50"
                title="Abrir enlace del proceso"
                onClick={(e) => e.stopPropagation()}
              >
                🔗 Abrir enlace del proceso
              </a>
            </div>
          )}

          {/* Chips de metadatos */}
          {chipEntries.length > 0 && (
            <div className="mt-7 mx-auto max-w-2xl">
              <div className="flex flex-wrap justify-center gap-2">
                {chipEntries.map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-gray-800 shadow-sm"
                    title={`${prettyKey(key)}: ${renderVal(value)}`}
                  >
                    <span className="mr-1 text-gray-500">{prettyKey(key)}:</span>
                    <span className="font-semibold">{renderVal(value)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          {descEntries.length > 0 && (
            <div className="mt-8 mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center justify-center rounded-full bg-gray-100 px-3 py-1 text-[12px] text-gray-600">
                Descripción del procedimiento
              </div>

              <div className="mt-3 mx-auto max-w-prose">
                <div className="relative rounded-2xl border border-gray-100 bg-gray-50/70 p-5 text-left shadow-sm">
                  <div className="pointer-events-none absolute -top-3 left-5 select-none text-3xl text-gray-200">
                    &ldquo;
                  </div>

                  <p className="relative z-10 text-[15px] text-gray-800 whitespace-pre-wrap">
                    {(() => {
                      const [, value] = descEntries[0];
                      const full = renderVal(value);
                      return descExpanded ? full : previewText(full, 420);
                    })()}
                  </p>

                  {!descExpanded && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-2xl bg-gradient-to-t from-gray-50/90 to-transparent" />
                  )}
                </div>

                {/* Botón expandir/colapsar */}
                {(() => {
                  const [, value] = descEntries[0];
                  const full = renderVal(value);
                  const isLong = full && full.length > 420;
                  if (!isLong) return null;
                  return (
                    <button
                      className="mt-3 text-sm text-blue-700 underline"
                      onClick={() => setDescExpanded((v) => !v)}
                    >
                      {descExpanded ? "Ver menos" : "Ver más"}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ====== Descargas asociadas (dmgg-8hin) ====== */}
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-black">Descargas asociadas</h4>
              <div className="text-xs text-gray-500">
                ID Portafolio: {idPortafolio || "—"}
              </div>
            </div>

            {docsLoading ? (
              <p className="mt-2 text-sm text-gray-500">Cargando documentos…</p>
            ) : docsErr ? (
              <p className="mt-2 text-sm text-red-600">{docsErr}</p>
            ) : docs.length === 0 ? (
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  No se encontraron documentos para este portafolio.
                </p>
                {/* Debug opcional: muestra la consulta construida */}
                {debugQuery && (
                  <pre className="mt-2 text-[11px] text-gray-400 whitespace-pre-wrap">
                    {JSON.stringify(debugQuery, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {docs.map((d, i) => (
                  <li key={i} className="border rounded p-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-black">{d.titulo || "Documento"}</div>
                      <div className="text-xs text-gray-500">
                        {d.tipo ? `Tipo: ${d.tipo} • ` : ""}
                        {d.fecha ? `Fecha: ${d.fecha}` : ""}
                        {d.tamanio ? ` • Tamaño: ${d.tamanio}` : ""}
                      </div>
                    </div>
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 text-sm underline shrink-0"
                        title={d.url}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Descargar
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Sin URL</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="mt-9 flex justify-center">
            <div className="h-1 w-16 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
