/**
 * DocumentMetadata - Chips de metadatos del documento
 * Muestra información como estado, departamento, etc
 */

import "../../styles/components/document-metadata.css";

export default function DocumentMetadata({ entries }) {
  if (!entries || entries.length === 0) return null;

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

  return (
    <div className="document-metadata-container">
      <div className="document-metadata-chips">
        {entries.map(([key, value]) => (
          <span
            key={key}
            className="document-metadata-chip"
            title={`${prettyKey(key)}: ${renderVal(value)}`}
          >
            <span className="document-metadata-chip-label">{prettyKey(key)}:</span>
            <span className="document-metadata-chip-value">{renderVal(value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
