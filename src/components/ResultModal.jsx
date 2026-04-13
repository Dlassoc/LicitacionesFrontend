// src/components/ResultModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useBatchAnalysisStatus } from "../hooks/useBatchAnalysisStatus.js";
import API_BASE_URL from "../config/api.js";
import ModalHeader from "./modal/ModalHeader.jsx";
import DocumentMetadata from "./modal/DocumentMetadata.jsx";
import DescriptionSection from "./modal/DescriptionSection.jsx";
import CategoriesSection from "./modal/CategoriesSection.jsx";
import DownloadsSection from "./modal/DownloadsSection.jsx";
import AnalysisSection from "./modal/AnalysisSection.jsx";
import { isDescriptionKey } from "../utils/commonHelpers.js";
import { buildIndex, get, mapDoc, dedupeDocs, tagFinancialIndicatorDocs, OMIT_FIELDS } from "../utils/documentHelpers.js";
import "../styles/components/result-modal.css";

// -------- Socrata: endpoint público --------
const DMGG_API = "https://www.datos.gov.co/resource/dmgg-8hin.json";

/* =============================== Componente =============================== */

export default function ResultModal({ open, item, onClose, analysisStatus = {} }) {
  // Inicializar el hook ANTES del early return
  // para que el cleanup siempre se ejecute
  const [descExpanded, setDescExpanded] = useState(false);

  // Descargas por 'proceso' (id_del_portafolio)
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsErr, setDocsErr] = useState("");
  const [debugQuery, setDebugQuery] = useState(null);

  // Obtener idPortafolio ANTES de usarlo en el hook
  const idx = useMemo(() => buildIndex(item), [item]);
  const idPortafolio = useMemo(
    () => get(item, idx, ["ID_Portafolio", "id_del_portafolio", "idPortafolio", "id_portafolio"], null),
    [idx]
  );

  // Verificar si ya existe análisis previo completado
  const previousAnalysis = useMemo(() => {
    if (!analysisStatus || !idPortafolio) return null;
    const status = analysisStatus[idPortafolio];
    if (status && status.estado === 'completado') {
      // 🔧 IMPORTANTE: Hook guarda como 'requisitos' (no 'requisitos_extraidos')
      // Backend devuelve 'requisitos_extraidos' pero hook renombra a 'requisitos' en analysisStatus
      const requisitosData = status.requisitos || status.requisitos_extraidos || {};
      
      // 🔍 Agregar logs para debuggear datos vacíos
      const hasData = Object.keys(requisitosData).length > 0;
      if (!hasData) {
        console.warn(`[RESULT_MODAL] ⚠️ previousAnalysis tiene requisitosData VACÍA para ${idPortafolio}:`, {
          tiene_requisitos: !!status.requisitos,
          tiene_requisitos_extraidos: !!status.requisitos_extraidos,
          requisitos_keys: status.requisitos ? Object.keys(status.requisitos) : [],
          requisitos_extraidos_keys: status.requisitos_extraidos ? Object.keys(status.requisitos_extraidos) : [],
          status_keys: Object.keys(status)
        });
      }
      
      return {
        cumple: status.cumple,
        porcentaje_cumplimiento: status.porcentaje_cumplimiento || 0,
        detalles: status.detalles,
        requisitos_extraidos: requisitosData,
        hasRealData: hasData  // Flag para detectar si realmente tenemos datos
      };
    }
    return null;
  }, [analysisStatus, idPortafolio]);

  // DEBUG: Add comprehensive logging
  useEffect(() => {
    if (open && idPortafolio && analysisStatus) {
      const status = analysisStatus[idPortafolio];
      console.log(`[RESULT_MODAL] 🔍 idPortafolio=${idPortafolio}, status exists=${!!status}, estado=${status?.estado}, requisitos keys=${status?.requisitos ? Object.keys(status.requisitos) : 'none'}`);
      if (!status) {
        console.log(`[RESULT_MODAL] ⚠️ ID not found in analysisStatus. Available keys:`, Object.keys(analysisStatus).slice(0, 10));
      }
    }
  }, [open, idPortafolio, analysisStatus]);

  // Consultar si ya existe análisis batch completado
  const { status: batchStatus } = useBatchAnalysisStatus(idPortafolio);

  const isBatchProcessing = batchStatus?.estado === "pendiente" || batchStatus?.estado === "procesando";
  const batchCompleted = batchStatus?.estado === "completado";
  const batchErrored = batchStatus?.estado === "error";

  const analyzing = previousAnalysis?.hasRealData ? false : isBatchProcessing;
  const analyzed = previousAnalysis?.hasRealData ? true : batchCompleted;
  const analysisError = previousAnalysis?.hasRealData ? null : (batchErrored ? batchStatus.error_message : null);
  const analysisResults = previousAnalysis || (batchCompleted ? batchStatus : null);

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

  //  OPTIMIZADO: Cargar documentos de Socrata INMEDIATAMENTE al abrir modal
  useEffect(() => {
    if (!open || !idPortafolio) {
      return; // No cargar si modal está cerrado o no hay idPortafolio
    }
    
    let abort = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    const loadDocs = async () => {
      setDocsErr("");
      setDocs([]);
      setDebugQuery(null);


      setDocsLoading(true);
      const startTime = performance.now();
      
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
        const elapsed = (performance.now() - startTime).toFixed(0);
        
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          
          // Si es 503, reintentar después de un tiempo
          if (res.status === 503 && retryCount < maxRetries) {

            retryCount++;
            if (!abort) {
              setTimeout(() => {
                if (!abort) loadDocs();
              }, 2000);
            }
            return;
          }
          
          throw new Error(`Socrata respondió ${res.status}: ${txt || "error"}`);
        }
        
        const raw = await res.json();


        // 1) Mapeo
        const mapped = Array.isArray(raw) ? raw.map(mapDoc) : [];

        mapped.slice(0, 5).forEach((d, i) => console.log(`   [${i}] ${d.titulo} | URL: ${d.url?.substring(0, 80)}`));
        
        // 2) Deduplicación (huella por DocumentId/DocUniqueIdentifier)
        const deduped = dedupeDocs(mapped);

        deduped.slice(0, 5).forEach((d, i) => console.log(`   [${i}] ${d.titulo} | URL: ${d.url?.substring(0, 80)}`));
        
        // 3) Mostrar sólo los que tienen URL descargable
        const withUrl = deduped.filter((d) => !!d.url);
        
        //  DEBUG: Mostrar qué documentos se perdieron por falta de URL
        const sinUrl = deduped.filter((d) => !d.url);
        if (sinUrl.length > 0) {

          sinUrl.forEach((d, i) => console.log(`   [${i}] ${d.titulo}`));
        }
        
        // 4) Etiquetado y orden
        const tagged = tagFinancialIndicatorDocs(withUrl);

        //  CAMBIO: Mensaje claro - estos son PRE-filtrados (el selector IA filtrará después)

        if (!abort) {
          setDocs(tagged);
          setDocsLoading(false);
        }
      } catch (e) {

        if (!abort) {
          setDocsErr(e.message || "Error al cargar descargas");
          setDocsLoading(false);
        }
      }
    };
    
    loadDocs();
    return () => { abort = true; };
  }, [open, idPortafolio]);

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
