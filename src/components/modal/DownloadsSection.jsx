import API_BASE_URL from "../../config/api.js";
import "../../styles/components/downloads-section.css";

export default function DownloadsSection({ docs, docsLoading, docsErr, debugQuery, analyzing, analyzed }) {
  // No mostrar nada mientras se está analizando
  if (analyzing) {
    return null;
  }

  // Mostrar documentos SOLO si el análisis terminó sin encontrar indicadores
  if (analyzed && analyzed.noIndicatorsFound) {
    // Mostrar lista de documentos como último recurso
    if (docs.length === 0) {
      return (
        <div className="downloads-section-empty">
          <p className="downloads-section-empty-text">
            No se encontraron documentos para este portafolio.
          </p>
        </div>
      );
    }

    // Mostrar todos los documentos
    const docsWithIndicators = docs.filter((d) => d.es_documento_indicadores === true);
    const docsWithoutIndicators = docs.filter((d) => d.es_documento_indicadores !== true);
    const orderedDocs = [...docsWithIndicators, ...docsWithoutIndicators];

    return (
      <div className="downloads-section-container">
        <p className="downloads-section-fallback-message">
          Estos son los documentos disponibles si deseas revisarlos manualmente:
        </p>
        <ul className="downloads-section-list">
          {orderedDocs.map((d, i) => (
            <li
              key={i}
              className="downloads-section-item downloads-section-ring"
            >
              <div className="downloads-section-item-content">
                <div className="downloads-section-item-header">
                  <div className="downloads-section-item-title">{d.titulo || "Documento"}</div>
                </div>
                <div className="downloads-section-item-meta">
                  {d.tipo ? `Tipo: ${d.tipo} • ` : ""}
                  {d.fecha ? `Fecha: ${d.fecha}` : ""}
                  {d.tamanio ? ` • Tamaño: ${d.tamanio}` : ""}
                </div>
              </div>
              {d.url ? (
                (() => {
                  let href = d.url;
                  try {
                    const u = new URL(d.url);
                    const isSecop = /secop|colombiacompra\.gov\.co/i.test(u.host);
                    if (isSecop) {
                      const q = u.searchParams.toString();
                      href = `${API_BASE_URL}/secop/download${q ? `?${q}` : ""}`;
                    }
                  } catch (e) {
                    // no-op
                  }

                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="downloads-section-item-link"
                      title={href}
                      onClick={(e) => e.stopPropagation()}
                    >
                      ↓
                    </a>
                  );
                })()
              ) : (
                <span className="downloads-section-item-no-url">Sin URL</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Si no está analizando, no terminó, o encontró indicadores: no mostrar nada
  return null;
}
