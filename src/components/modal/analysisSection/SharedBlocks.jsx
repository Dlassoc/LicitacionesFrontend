import React from "react";

export function UnspscCodesBlock({ codigos }) {
  if (!Array.isArray(codigos) || codigos.length === 0) return null;

  return (
    <div className="analysis-section-unspsc-group">
      <p className="analysis-section-unspsc-label">Codigos UNSPSC ({codigos.length}):</p>
      <div className="analysis-section-unspsc-codes">
        {codigos.map((codigo, idx) => (
          <span
            key={`${codigo}-${idx}`}
            className="analysis-section-unspsc-code"
          >
            {codigo}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ExperienceBlock({ experiencia, filterEmpty = false }) {
  if (!experiencia || typeof experiencia !== "object") return null;

  const entries = Object.entries(experiencia).filter(([, val]) => {
    if (!filterEmpty) return true;
    return val !== null && val !== undefined && val !== "";
  });

  if (entries.length === 0) return null;

  return (
    <div className="analysis-section-experience-group">
      <p className="analysis-section-experience-label">Experiencia Requerida:</p>
      <div className="analysis-section-experience-box">
        {entries.map(([key, val]) => (
          <p key={key} className="analysis-section-experience-text">
            <strong>{key}:</strong> {val}
          </p>
        ))}
      </div>
    </div>
  );
}
