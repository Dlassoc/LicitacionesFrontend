/**
 * DescriptionSection - Sección de descripción expandible
 * Muestra la descripción del procedimiento con opción de expandir
 */

import { useMemo, useCallback } from "react";
import { renderVal, previewText } from "../../utils/commonHelpers.js";
import "../../styles/components/description-section.css";

export default function DescriptionSection({ descEntries, descExpanded, setDescExpanded }) {
  if (descEntries.length === 0) return null;

  const { full, isLong } = useMemo(() => {
    const [, value] = descEntries[0];
    const fullText = renderVal(value);
    return {
      full: fullText,
      isLong: fullText && fullText.length > 420,
    };
  }, [descEntries]);

  const handleToggleExpanded = useCallback(() => {
    setDescExpanded((v) => !v);
  }, [setDescExpanded]);

  return (
    <div className="description-section-container">
      <div className="description-section-badge">
        Descripción del procedimiento
      </div>

      <div className="description-section-content">
        <div className="description-section-box">
          <div className="description-section-quote">
            &ldquo;
          </div>

          <p className="description-section-text">
            {descExpanded ? full : previewText(full, 420)}
          </p>

          {!descExpanded && (
            <div className="description-section-fade" />
          )}
        </div>

        {isLong && (
          <button
            className="description-section-toggle"
            onClick={handleToggleExpanded}
          >
            {descExpanded ? "Ver menos" : "Ver más"}
          </button>
        )}
      </div>
    </div>
  );
}
