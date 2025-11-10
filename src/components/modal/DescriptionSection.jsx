/**
 * DescriptionSection - Sección de descripción expandible
 * Muestra la descripción del procedimiento con opción de expandir
 */

import { useMemo, useCallback } from "react";
import "../../styles/components/description-section.css";

// Funciones helper (fuera del componente para estabilidad)
const renderVal = (v) => {
  if (v === null || v === undefined || v === "") return "No disponible";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "No disponible";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const previewText = (txt, maxChars = 420) =>
  txt.length > maxChars ? txt.slice(0, maxChars).trim() + "…" : txt;

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
