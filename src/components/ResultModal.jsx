import React, { useEffect, useState } from "react";

export default function ResultModal({ open, item, onClose }) {
  if (!open || !item) return null;

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

  const title = item.Entidad || "Proyecto sin nombre";
  const enlace = item.Enlace_oficial || null;
  const urlProceso = item.URL_Proceso || null; // Extraer el URL del proceso

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

  const OMIT = new Set(["Enlace_oficial", "Documentos", "URL_Proceso"]);
  const isDescriptionKey = (k) => /descripci[oó]n/i.test(k);

  const entries = Object.entries(item).filter(([key]) => !OMIT.has(key));
  const descEntries = entries.filter(([key]) => isDescriptionKey(key));
  const chipEntries = entries.filter(([key]) => !isDescriptionKey(key));

  // Utilidad para partir en vista previa (sin plugins line-clamp)
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

          {/* Mostrar URL del proceso */}
          {urlProceso && (
            <div className="mt-6 flex items-center justify-center">
              <a
                href={urlProceso}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-[14px] text-blue-700 shadow-sm transition hover:bg-blue-50"
                title="Abrir enlace del proceso"
              >
                🔗 Abrir enlace del proceso
              </a>
            </div>
          )}

          {/* Chips para todos los campos excepto la descripción */}
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

          {/* Descripción centrada y “bonita” */}
          {descEntries.length > 0 && (
            <div className="mt-8 mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center justify-center rounded-full bg-gray-100 px-3 py-1 text-[12px] text-gray-600">
                Descripción del procedimiento
              </div>

              <div className="mt-3 mx-auto max-w-prose">
                <div className="relative rounded-2xl border border-gray-100 bg-gray-50/70 p-5 text-left shadow-sm">
                  {/* Comilla decorativa */}
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

                  {/* Gradiente de desvanecido cuando está colapsado */}
                  {!descExpanded && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-2xl bg-gradient-to-t from-gray-50/90 to-transparent" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-9 flex justify-center">
            <div className="h-1 w-16 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
