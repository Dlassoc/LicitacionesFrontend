// src/components/ResultModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import ModalHeader from "./modal/ModalHeader.jsx";
import DocumentMetadata from "./modal/DocumentMetadata.jsx";
import DescriptionSection from "./modal/DescriptionSection.jsx";
import CategoriesSection from "./modal/CategoriesSection.jsx";
import DownloadsSection from "./modal/DownloadsSection.jsx";
import AnalysisSection from "./modal/AnalysisSection.jsx";
import { useResultModalAnalysis } from "./modal/hooks/useResultModalAnalysis.js";
import { useResultModalDocs } from "./modal/hooks/useResultModalDocs.js";
import { isDescriptionKey } from "../utils/commonHelpers.js";
import { buildIndex, get, OMIT_FIELDS } from "../utils/documentHelpers.js";
import "../styles/components/result-modal.css";

/* =============================== Componente =============================== */

export default function ResultModal({ open, item, onClose, analysisStatus = {} }) {
  // Inicializar el hook ANTES del early return
  // para que el cleanup siempre se ejecute
  const [descExpanded, setDescExpanded] = useState(false);

  // Obtener idPortafolio ANTES de usarlo en el hook
  const idx = useMemo(() => buildIndex(item), [item]);
  const idPortafolio = useMemo(
    () => get(item, idx, ["ID_Portafolio", "id_del_portafolio", "idPortafolio", "id_portafolio"], null),
    [idx]
  );

  const {
    previousAnalysis,
    analyzing,
    analyzed,
    analysisError,
    analysisResults,
  } = useResultModalAnalysis({
    open,
    idPortafolio,
    analysisStatus,
  });

  const {
    docs,
    docsLoading,
    docsErr,
    debugQuery,
  } = useResultModalDocs({
    open,
    idPortafolio,
  });

  // Bloquear scroll y ESC cuando el modal está abierto
  useEffect(() => {
    if (!open) return; // Solo si el modal está abierto

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Early return DESPUÉS de declarar TODOS los hooks
  if (!open || !item) return null;

  const title = item.Entidad || "Proyecto sin nombre";
  const urlProceso = item.URL_Proceso || item.Enlace_oficial || null;

  const entries = Object.entries(item).filter(([key]) => !OMIT_FIELDS.has(key));
  const descEntries = entries.filter(([key]) => isDescriptionKey(key));
  const chipEntries = entries.filter(([key]) => !isDescriptionKey(key));

  return (
    <div 
      className="result-modal-overlay"
      onClick={onClose}
    >
      <div
        className="result-modal-backdrop"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="result-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
          <button
            onClick={onClose}
            className="result-modal-close-btn"
            aria-label="Cerrar"
          >
            ×
          </button>

          {/* Header */}
          <ModalHeader title={title} />

          {/* Enlace al proceso */}
          {urlProceso && (
            <div className="result-modal-process-link">
              <a
                href={urlProceso}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir enlace del proceso"
                onClick={(e) => e.stopPropagation()}
              >
                🔗 Abrir enlace del proceso
              </a>
            </div>
          )}

          {/* Chips de metadatos */}
          <DocumentMetadata entries={chipEntries} />

          {/* Descripción */}
          <DescriptionSection descEntries={descEntries} descExpanded={descExpanded} setDescExpanded={setDescExpanded} />

          {/* Categorías */}
          <CategoriesSection 
            codigoPrincipal={item.Codigo_categoria} 
            categoriasAdicionales={item.Categorias_adicionales}
          />

          {/* ====== Descargas asociadas (dmgg-8hin) ====== */}
          {/*  CAMBIO: Usar docs (ahora serán analizados localmente) */}
          <DownloadsSection 
            docs={docs}
            docsLoading={docsLoading} 
            docsErr={docsErr} 
            idPortafolio={idPortafolio}
            debugQuery={debugQuery}
            analyzing={analyzing}
            analyzed={analyzed}
          />

          {/* Análisis de indicadores financieros (LOCAL) */}
          {/* Si ya existe análisis previo, usarlo directamente sin re-analizar */}
          <AnalysisSection 
            docWithIndicators={docs.length > 0 || previousAnalysis !== null}
            analyzing={analyzing}
            analyzed={analyzed}
            analysisError={analysisError}
            analysisResults={analysisResults}
            analyze={() => {}}
            isBatchAnalysis={previousAnalysis?.hasRealData ? true : batchCompleted}
            skipDownload={true}
          />

          {/* Footer */}
          <div className="result-modal-footer">
            <div className="result-modal-divider" />
          </div>
        </div>
    </div>
  );
}
