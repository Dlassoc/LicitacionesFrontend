/**
 * DocumentMetadata - Chips de metadatos del documento
 * Muestra información como estado, departamento, etc
 */

import { prettyKey, renderVal } from "../../utils/commonHelpers.js";
import "../../styles/components/document-metadata.css";

export default function DocumentMetadata({ entries }) {
  if (!entries || entries.length === 0) return null;

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

