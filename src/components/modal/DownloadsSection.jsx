import API_BASE_URL from "../../config/api.js";
import "../../styles/components/downloads-section.css";

export default function DownloadsSection({ docs, docsLoading, docsErr, debugQuery }) {
  if (docsLoading) {
    return (
      <div className="downloads-section-loading">
        <div className="downloads-section-loading-spinner" />
        <p className="downloads-section-loading-text">Buscando documentos asociados…</p>
      </div>
    );
  }

  if (docsErr) {
    return <p className="downloads-section-error">{docsErr}</p>;
  }

  if (docs.length === 0) {
    return (
      <div className="downloads-section-empty">
        <p className="downloads-section-empty-text">
          No se encontraron documentos para este portafolio.
        </p>
        {debugQuery && (
          <pre className="downloads-section-debug">
            {JSON.stringify(debugQuery, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  // Mostrar solo documentos con indicadores detectados por nombre
  const docsWithIndicators = docs.filter((d) => d.es_documento_indicadores === true);

  if (docsWithIndicators.length === 0) {
    return (
      <div className="downloads-section-empty-message">
        <p className="downloads-section-empty-message-text">
          No se encontraron documentos que probablemente contengan indicadores financieros.
        </p>
      </div>
    );
  }

  return (
    <ul className="downloads-section-list">
      {docsWithIndicators.map((d, i) => (
        <li
          key={i}
          className="downloads-section-item downloads-section-ring"
        >
          <div className="downloads-section-item-content">
            <div className="downloads-section-item-header">
              <div className="downloads-section-item-title">{d.titulo || "Documento"}</div>
              <span className="downloads-section-item-badge">
                Posibles indicadores financieros
              </span>
            </div>
            <div className="downloads-section-item-meta">
              {d.tipo ? `Tipo: ${d.tipo} • ` : ""}
              {d.fecha ? `Fecha: ${d.fecha}` : ""}
              {d.tamanio ? ` • Tamaño: ${d.tamanio}` : ""}
            </div>
            {d.razon && (
              <div className="downloads-section-item-reason">
                💡 {d.razon}
              </div>
            )}
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
  );
}
