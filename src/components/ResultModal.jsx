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
import { renderVal, previewText, isDescriptionKey, normWs, norm, prettyKey } from "../utils/commonHelpers.js";
import "../styles/components/result-modal.css";

/* ==== Helpers para hallar ID_Portafolio de forma robusta ==== */
const canon = (k) =>
  String(k || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

const buildIndex = (obj) => {
  const idx = new Map();
  for (const [k, v] of Object.entries(obj || {})) idx.set(canon(k), v);
  return idx;
};

const get = (item, idx, keys, fallback = null) => {
  for (const k of keys) {
    const v = idx.get(canon(k));
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

// -------- Socrata: endpoint público --------
const DMGG_API = "https://www.datos.gov.co/resource/dmgg-8hin.json";

/** Devuelve la primera URL válida (string o {url: "..."}) */
const firstUrl = (...vals) => {
  for (const v of vals) {
    if (v && typeof v === "object" && typeof v.url === "string" && v.url.startsWith("http")) {
      return v.url.trim();
    }
    if (typeof v === "string" && v.trim().startsWith("http")) {
      return v.trim();
    }
  }
  return null;
};

/** Toma un registro de dmgg-8hin y arma un objeto amigable para UI. */
const mapDoc = (doc) => {
  const titulo =
    doc?.nombre_documento ??
    doc?.nombre_do ??
    doc?.nombre_del_documento ??
    doc?.documento ??
    doc?.titulo ??
    doc?.nombre_archivo ??
    doc?.descripcion ??
    "Documento";

  const tipo =
    doc?.tipo_de_documento ??
    doc?.tipo_documento ??
    doc?.extension ??
    doc?.tipo ??
    null;

  const fecha =
    doc?.fecha_publicacion_documento ??
    doc?.fecha_carga ??
    doc?.fecha ??
    doc?.fecha_publicacion ??
    null;

  const tamanio =
    doc?.tamano ??
    doc?.tamanio ??
    doc?.tamano_documento ??
    doc?.size_bytes ??
    null;

  const proceso = doc?.proceso ?? null;

  const url = firstUrl(
    doc?.url_descarga_documento,
    doc?.url,
    doc?.enlace,
    doc?.link,
    doc?.url_descarga,
    doc?.archivo,
    doc?.archivo_url,
    doc?.ruta
  );

  return {
    titulo,
    tipo,
    fecha,
    tamanio,
    proceso,
    url,
    es_documento_indicadores: false,
    razon: null,
  };
};

/* ========= Deduplicación de documentos (evita duplicados del dataset) ========= */
/* Huella canónica de URL SECOP: extrae DocumentId o DocUniqueIdentifier.
   Si no hay, normaliza host/path/query en minúsculas pero conservando el valor. */
function secopFingerprint(u) {
  if (!u) return "";
  let raw = String(u).trim();
  try {
    const url = new URL(raw);
    const host = url.host.toLowerCase();
    const path = url.pathname.toLowerCase();

    // Normaliza distintos hosts de SECOP a 'secop'
    const isSecop = /secop|colombiacompra\.gov\.co/i.test(host);
    const qp = new URLSearchParams(url.search);

    // Intenta por parámetros más distintivos
    const docId = qp.get("DocumentId") || qp.get("documentid");
    const uniq  = qp.get("DocUniqueIdentifier") || qp.get("docuniqueidentifier");

    if (isSecop && (docId || uniq)) {
      return `secop:${(docId || "").toLowerCase()}:${(uniq || "").toLowerCase()}`;
    }

    // A veces la URL viene sin query pero con nombre de archivo estable
    const fileName = path.split("/").pop() || "";
    if (isSecop && fileName) {
      return `secopfile:${fileName}`;
    }

    // Fallback: normalización general
    return `${url.protocol.toLowerCase()}//${host}${path}?${[...qp.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k.toLowerCase()}=${String(v).toLowerCase()}`)
      .join("&")}`;
  } catch {
    return raw.toLowerCase();
  }
}

const docKey = (d) => {
  //  PRIORIDAD: El TITULO es el identificador más confiable
  // Si dos registros tienen el mismo título normalizador, son el MISMO documento
  const t = normWs(d?.titulo);
  if (t) return `titulo:${t}`;
  
  const fp = secopFingerprint(d?.url);
  if (fp) return `fp:${fp}`;
  
  const f = normWs(d?.fecha);
  const z = normWs(d?.tamanio);
  return `tf:${t}|${f}|${z}`;
};

const filledScore = (d) => {
  let s = 0;
  if (d?.tipo) s += 1;
  if (d?.fecha) s += 1;
  if (d?.tamanio) s += 1;
  if (d?.proceso) s += 1;
  s += Math.min(3, (d?.titulo || "").length / 20);
  return s;
};

function dedupeDocs(docs) {
  const seen = new Map();
  const out = [];
  for (const d of docs || []) {
    const k = docKey(d);
    const prev = seen.get(k);
    if (!prev) {
      seen.set(k, d);
      out.push(d);
    } else {
      const best = filledScore(d) > filledScore(prev) ? d : prev;
      seen.set(k, best);
      const idx = out.findIndex((x) => docKey(x) === k);
      if (idx !== -1) out[idx] = best;
    }
  }
  return out;
}

/* ========= Reglas para detectar el documento candidato y resaltarlo ========= */
const normalizeForMatching = (s) =>
  String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const FIN_RULES = [
  // Altísima probabilidad
  { re: /\bcertificado\s+de\s+capacidad\s+financiera\s+y\s+organizacional\b/, score: 130, label: "certificado de capacidad financiera y organizacional" },
  { re: /\bdocumento\s+de\s+requisitos?\s+habi[l|]itantes?\s+financieros?\b/, score: 128, label: "documento de requisitos habilitantes financieros" },
  { re: /\brequisitos?\s+habi[l|]itantes?:?\s*capacidad\s+financiera\b/,     score: 126, label: "requisitos habilitantes: capacidad financiera" },
  { re: /\bformato\s+de\s+indicadores\s+de\s+entidades?\s+sin\s+an[ií]mo\s+de\s+lucro\b/, score: 124, label: "formato indicadores ESAL" },
  { re: /\bc[aá]lculo\s+de\s+indicadores?\s+financieros?\b/,                 score: 122, label: "cálculo de indicadores financieros" },
  { re: /\bevaluaci[oó]n\s+financiera\b/,                                    score: 120, label: "evaluación financiera" },
  { re: /\bindicadores?\s+financieros?\s+y\s+organizacionales?\b/,           score: 120, label: "indicadores financieros y organizacionales" },
  { re: /\bcapacidad\s+financiera\b/,                                        score: 118, label: "capacidad financiera" },
  { re: /\bformato\s*4\b/,                                                   score: 116, label: "formato 4 (indicadores)" },
  { re: /\bindicadores?\b/,                                                  score: 112, label: "indicadores" },
  { re: /\banexo(\s*#?\s*\d+)?\s*-\s*financiero\b/,                          score: 110, label: "anexo financiero" },
  { re: /\b-?\s*indicadores?\b/,                                             score: 110, label: "archivo con 'indicadores' en el nombre" },

  // Soportes financieros
  { re: /\bestados?\s+financieros?\s+(auditados?\s*)?(\d{4})?\b/,            score: 105, label: "estados financieros (auditados)" },
  { re: /\bnotas?\s+a\s+los?\s+estados?\s+financieros?\b/,                   score: 96,  label: "notas a los estados financieros" },
  { re: /\bcertificado\s+de\s+(contador\s+p[uú]blico|revisor\s+fiscal)\b/,   score: 100, label: "certificado de contador/revisor fiscal" },
  { re: /\bconstancia\s+de\s+persona\s+natural\s+no\s+obligada\s+a\s+contabilidad\b/, score: 95, label: "constancia PN no obligada a contabilidad" },

  // Documentos del proceso (backup)
  { re: /\bestudios?\s+previo[s]?\b/,                                        score: 80,  label: "estudios previos" },
  { re: /\b_?est_?prev\b/i,                                                  score: 78,  label: "estudio previo (abreviado)" },
  { re: /\best\.?\s*prev\b/i,                                                score: 76,  label: "est. prev (forma corta)" },
  { re: /\bpliego(s)?\s+de\s+condiciones\s+definitivo\b/,                    score: 78,  label: "pliego de condiciones definitivo" },
  { re: /\bpliego(s)?\s+definitivo(s)?\b/,                                   score: 78,  label: "pliegos definitivos" },
  { re: /\bpliego(s)?\s+de\s+condiciones\b/,                                 score: 72,  label: "pliego de condiciones" },
  { re: /\bcondiciones\s+generales\b/,                                       score: 60,  label: "condiciones generales" },
  { re: /\baviso\s+de\s+convocatoria\b/,                                     score: 30,  label: "aviso de convocatoria" },
];

function tagFinancialIndicatorDocs(docs) {
  if (!Array.isArray(docs) || docs.length === 0) return [];

  let bestIdx = -1;
  let bestScore = -1;
  let bestReason = "";

  const scored = docs.map((d, i) => {
    const t  = normalizeForMatching(d.titulo);
    const tp = normalizeForMatching(d.tipo);
    let score = 0;
    let reason = "";

    for (const r of FIN_RULES) {
      const hit = (t && r.re.test(t)) || (tp && r.re.test(tp));
      if (hit && r.score > score) {
        score = r.score;
      }
    }

    if (/\bestados?\s+financieros?\s+(auditados?\s*)?\d{4}\b/.test(t || "")) {
      score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
      bestReason = reason;
    }
    return { ...d, _score: score, _reason: reason };
  });

  const tagged = scored.map((d, i) => ({
    ...d,
    es_documento_indicadores: i === bestIdx && bestScore > 0,
    razon: i === bestIdx && bestScore > 0 ? bestReason : (d.razon || null),
  }));

  tagged.sort((a, b) => {
    if (a.es_documento_indicadores !== b.es_documento_indicadores) {
      return a.es_documento_indicadores ? -1 : 1;
    }
    return (b._score || 0) - (a._score || 0);
  });

  return tagged.map(({ _score, _reason, ...rest }) => rest);
}

const OMIT_FIELDS = new Set(["Enlace_oficial", "Documentos", "URL_Proceso", "ID_Portafolio", "id_del_portafolio", "Codigo_categoria", "Categorias_adicionales"]);

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
