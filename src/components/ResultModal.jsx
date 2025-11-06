// src/components/ResultModal.jsx
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
  const titulo =
    doc?.nombre_documento ??
    doc?.nombre_do ??
    doc?.nombre_del_documento ??
    doc?.documento ??
    doc?.titulo ??
    doc?.nombre_archivo ??
    doc?.descripcion ??
    "Documento";

  const tipo =
    doc?.tipo_de_documento ??
    doc?.tipo_documento ??
    doc?.extension ??
    doc?.tipo ??
    null;

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

  return {
    titulo,
    tipo,
    fecha,
    tamanio,
    proceso,
    url,
    es_documento_indicadores: false,
    razon: null,
  };
};

/* ========= Deduplicación de documentos (evita duplicados del dataset) ========= */
const normWs = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

/* Huella canónica de URL SECOP: extrae DocumentId o DocUniqueIdentifier.
   Si no hay, normaliza host/path/query en minúsculas pero conservando el valor. */
function secopFingerprint(u) {
  if (!u) return "";
  let raw = String(u).trim();
  try {
    const url = new URL(raw);
    const host = url.host.toLowerCase();
    const path = url.pathname.toLowerCase();

    // Normaliza distintos hosts de SECOP a 'secop'
    const isSecop = /secop|colombiacompra\.gov\.co/i.test(host);
    const qp = new URLSearchParams(url.search);

    // Intenta por parámetros más distintivos
    const docId = qp.get("DocumentId") || qp.get("documentid");
    const uniq  = qp.get("DocUniqueIdentifier") || qp.get("docuniqueidentifier");

    if (isSecop && (docId || uniq)) {
      return `secop:${(docId || "").toLowerCase()}:${(uniq || "").toLowerCase()}`;
    }

    // A veces la URL viene sin query pero con nombre de archivo estable
    const fileName = path.split("/").pop() || "";
    if (isSecop && fileName) {
      return `secopfile:${fileName}`;
    }

    // Fallback: normalización general
    return `${url.protocol.toLowerCase()}//${host}${path}?${[...qp.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k.toLowerCase()}=${String(v).toLowerCase()}`)
      .join("&")}`;
  } catch {
    return raw.toLowerCase();
  }
}

const docKey = (d) => {
  const fp = secopFingerprint(d?.url);
  if (fp) return `fp:${fp}`;
  const t = normWs(d?.titulo);
  const f = normWs(d?.fecha);
  const z = normWs(d?.tamanio);
  return `tf:${t}|${f}|${z}`;
};

const filledScore = (d) => {
  let s = 0;
  if (d?.tipo) s += 1;
  if (d?.fecha) s += 1;
  if (d?.tamanio) s += 1;
  if (d?.proceso) s += 1;
  s += Math.min(3, (d?.titulo || "").length / 20);
  return s;
};

function dedupeDocs(docs) {
  const seen = new Map();
  const out = [];
  for (const d of docs || []) {
    const k = docKey(d);
    const prev = seen.get(k);
    if (!prev) {
      seen.set(k, d);
      out.push(d);
    } else {
      const best = filledScore(d) > filledScore(prev) ? d : prev;
      seen.set(k, best);
      const idx = out.findIndex((x) => docKey(x) === k);
      if (idx !== -1) out[idx] = best;
    }
  }
  return out;
}

/* ========= Reglas para detectar el documento candidato y resaltarlo ========= */
const norm = (s) =>
  String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const FIN_RULES = [
  // Altísima probabilidad
  { re: /\bcertificado\s+de\s+capacidad\s+financiera\s+y\s+organizacional\b/, score: 130, label: "certificado de capacidad financiera y organizacional" },
  { re: /\bdocumento\s+de\s+requisitos?\s+habi[l|]itantes?\s+financieros?\b/, score: 128, label: "documento de requisitos habilitantes financieros" },
  { re: /\brequisitos?\s+habi[l|]itantes?:?\s*capacidad\s+financiera\b/,     score: 126, label: "requisitos habilitantes: capacidad financiera" },
  { re: /\bformato\s+de\s+indicadores\s+de\s+entidades?\s+sin\s+an[ií]mo\s+de\s+lucro\b/, score: 124, label: "formato indicadores ESAL" },
  { re: /\bc[aá]lculo\s+de\s+indicadores?\s+financieros?\b/,                 score: 122, label: "cálculo de indicadores financieros" },
  { re: /\bevaluaci[oó]n\s+financiera\b/,                                    score: 120, label: "evaluación financiera" },
  { re: /\bindicadores?\s+financieros?\s+y\s+organizacionales?\b/,           score: 120, label: "indicadores financieros y organizacionales" },
  { re: /\bcapacidad\s+financiera\b/,                                        score: 118, label: "capacidad financiera" },
  { re: /\bformato\s*4\b/,                                                   score: 116, label: "formato 4 (indicadores)" },
  { re: /\bindicadores?\b/,                                                  score: 112, label: "indicadores" },
  { re: /\banexo(\s*#?\s*\d+)?\s*-\s*financiero\b/,                          score: 110, label: "anexo financiero" },
  { re: /\b-?\s*indicadores?\b/,                                             score: 110, label: "archivo con 'indicadores' en el nombre" },

  // Soportes financieros
  { re: /\bestados?\s+financieros?\s+(auditados?\s*)?(\d{4})?\b/,            score: 105, label: "estados financieros (auditados)" },
  { re: /\bnotas?\s+a\s+los?\s+estados?\s+financieros?\b/,                   score: 96,  label: "notas a los estados financieros" },
  { re: /\bcertificado\s+de\s+(contador\s+p[uú]blico|revisor\s+fiscal)\b/,   score: 100, label: "certificado de contador/revisor fiscal" },
  { re: /\bconstancia\s+de\s+persona\s+natural\s+no\s+obligada\s+a\s+contabilidad\b/, score: 95, label: "constancia PN no obligada a contabilidad" },

  // Documentos del proceso (backup)
  { re: /\bestudios?\s+previo[s]?\b/,                                        score: 80,  label: "estudios previos" },
  { re: /\bpliego(s)?\s+de\s+condiciones\s+definitivo\b/,                    score: 78,  label: "pliego de condiciones definitivo" },
  { re: /\bpliego(s)?\s+de\s+condiciones\b/,                                 score: 72,  label: "pliego de condiciones" },
  { re: /\bcondiciones\s+generales\b/,                                       score: 60,  label: "condiciones generales" },
  { re: /\baviso\s+de\s+convocatoria\b/,                                     score: 30,  label: "aviso de convocatoria" },
];

function tagFinancialIndicatorDocs(docs) {
  if (!Array.isArray(docs) || docs.length === 0) return [];

  let bestIdx = -1;
  let bestScore = -1;
  let bestReason = "";

  const scored = docs.map((d, i) => {
    const t  = norm(d.titulo);
    const tp = norm(d.tipo);
    let score = 0;
    let reason = "";

    for (const r of FIN_RULES) {
      const hit = (t && r.re.test(t)) || (tp && r.re.test(tp));
      if (hit && r.score > score) {
        score = r.score;
      }
    }

    if (/\bestados?\s+financieros?\s+(auditados?\s*)?\d{4}\b/.test(t || "")) {
      score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
      bestReason = reason;
    }
    return { ...d, _score: score, _reason: reason };
  });

  const tagged = scored.map((d, i) => ({
    ...d,
    es_documento_indicadores: i === bestIdx && bestScore > 0,
    razon: i === bestIdx && bestScore > 0 ? bestReason : (d.razon || null),
  }));

  tagged.sort((a, b) => {
    if (a.es_documento_indicadores !== b.es_documento_indicadores) {
      return a.es_documento_indicadores ? -1 : 1;
    }
    return (b._score || 0) - (a._score || 0);
  });

  return tagged.map(({ _score, _reason, ...rest }) => rest);
}

/* =============================== Componente =============================== */

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

  // Descargas por 'proceso' (id_del_portafolio)
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsErr, setDocsErr] = useState("");
  const [debugQuery, setDebugQuery] = useState(null);

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

        // IMPORTANTE: igualdad exacta, sin LIKE, para no traer extras
        const where = `upper(trim(proceso)) = upper('${clean}')`;

        const params = new URLSearchParams();
        params.set("$where", where);
        params.set("$limit", "500"); // por si hay varios adjuntos

        const url = `${DMGG_API}?${params.toString()}`;
        setDebugQuery({ DMGG_API, params: Object.fromEntries(params.entries()) });

        const res = await fetch(url, { method: "GET" });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Socrata respondió ${res.status}: ${txt || "error"}`);
        }
        const raw = await res.json();

        // 1) Mapeo
        const mapped = Array.isArray(raw) ? raw.map(mapDoc) : [];
        // 2) Deduplicación (huella por DocumentId/DocUniqueIdentifier)
        const deduped = dedupeDocs(mapped);
        // 3) Mostrar sólo los que tienen URL descargable
        const withUrl = deduped.filter((d) => !!d.url);
        // 4) Etiquetado y orden
        const tagged = tagFinancialIndicatorDocs(withUrl);

        if (!abort) setDocs(tagged);
      } catch (e) {
        if (!abort) setDocsErr(e.message || "Error al cargar descargas");
      } finally {
        if (!abort) setDocsLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [idPortafolio]);

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
              <p className="mt-2 text-sm text-black">Cargando documentos…</p>
            ) : docsErr ? (
              <p className="mt-2 text-sm text-red-600">{docsErr}</p>
            ) : docs.length === 0 ? (
              <div className="mt-2">
                <p className="text-sm text-black">
                  No se encontraron documentos para este portafolio.
                </p>
                {debugQuery && (
                  <pre className="mt-2 text-[11px] text-gray-400 whitespace-pre-wrap">
                    {JSON.stringify(debugQuery, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {docs.map((d, i) => {
                  const isIndicador = d.es_documento_indicadores === true;
                  return (
                    <li
                      key={i}
                      className={`border rounded p-3 flex items-start justify-between gap-3 transition ${
                        isIndicador
                          ? "border-yellow-500 bg-yellow-50/60 ring-2 ring-yellow-300"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-black">{d.titulo || "Documento"}</div>
                          {isIndicador && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">
                              ⭐ Posibles indicadores financieros
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {d.tipo ? `Tipo: ${d.tipo} • ` : ""}
                          {d.fecha ? `Fecha: ${d.fecha}` : ""}
                          {d.tamanio ? ` • Tamaño: ${d.tamanio}` : ""}
                        </div>
                        {isIndicador && d.razon && (
                          <div className="text-xs text-yellow-700 mt-1">
                            💡 {d.razon}
                          </div>
                        )}
                      </div>
                      {d.url ? (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm underline shrink-0 transition ${
                            isIndicador
                              ? "text-yellow-700 font-semibold hover:text-yellow-900"
                              : "text-blue-700 hover:text-blue-900"
                          }`}
                          title={d.url}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Descargar
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">Sin URL</span>
                      )}
                    </li>
                  );
                })}
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
