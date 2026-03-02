import React, { useMemo, memo, useState } from "react";
import "../styles/features/result-card.css";

/* ========== Helpers de normalización ========== */
const canon = (k) =>
  String(k || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

const buildIndex = (obj) => {
  const idx = new Map();
  for (const [k, v] of Object.entries(obj || {})) idx.set(canon(k), v);
  return idx;
};

/* ========== Resolución robusta del URL del proceso ========== */
const getUrlProceso = (item) => {
  if (!item) return "#";

  // 1) Preferir anidado: urlproceso.url
  if (item.urlproceso && item.urlproceso.url) {
    return item.urlproceso.url; // Usamos la URL de "urlproceso.url"
  }

  // 2) Variantes planas conocidas
  const flat =
    (item["URL_Proceso"] || item["url_proceso"] || item["url"] || item["link"]);

  // 3) Si ya es un detalle público, usarlo
  if (typeof flat === "string" && /OpportunityDetail|noticeUID|isFromPublicArea/i.test(flat)) {
    return flat;
  }

  return flat || "#";
};

const get = (item, idx, keys, fallback = null) => {
  for (const k of keys) {
    // acceso por rutas anidadas
    if (k.includes(".")) {
      const v2 = getByPath(item, k);
      if (v2 !== undefined && v2 !== null && String(v2).trim() !== "") return v2;
    }
    const val = idx.get(canon(k));
    if (val !== undefined && val !== null && String(val).trim() !== "") return val;
  }
  return fallback;
};

const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = String(path).split(".");
  let cur = obj;
  for (const seg of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    const target = Object.keys(cur).find((k) => canon(k) === canon(seg));
    if (!target) return undefined;
    cur = cur[target];
  }
  return cur;
};

const formatCOP = (val) => {
  if (val === null || val === undefined) return "No disponible";
  const only = String(val).replace(/[^\d.,-]/g, "");
  const num = Number(only.replace(/\./g, "").replace(/,/g, "."));
  if (!isFinite(num) || isNaN(num) || num === 0) return "Cuantía no especificada";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(num);
};

// 🔧 RE-HABILITADO: memo() con comparador manual para props correcamente
const ResultCard = memo(function ResultCard({ item = {}, onClick, analysisStatus, onDiscard }) {
  const [isHiding, setIsHiding] = useState(false);
  const idx = useMemo(() => buildIndex(item), [item]);

  const urlResuelto = getUrlProceso(item);

  const titulo = get(item, idx, ["Entidad", "nombre_entidad", "entidad", "nombreEntidad"], "Entidad no especificada");
  const fase   = get(item, idx, ["Fase", "Estado", "fase", "estado"], "No disponible");
  const ref    = get(item, idx, ["Referencia_del_proceso", "Referencia_del_contrato", "Proceso_de_compra", "ID_contrato", "referencia", "id_contrato"], "No disponible");
  const dpto   = get(item, idx, ["Departamento_de_la_entidad", "Departamento", "departamento_de_la_entidad", "departamento"], "Departamento N/D");
  const ciudad = get(item, idx, ["Ciudad_entidad", "Ciudad", "ciudad_entidad", "ciudad"], "Ciudad N/D");
  const precioVal = get(item, idx, ["Precio_base", "precio_base", "cuantia", "valor", "valor_contrato", "valor_estimado"], null);
  const precio = precioVal ? formatCOP(precioVal) : "Cuantía no especificada";
  const descripcion = get(item, idx, ["Descripcion", "descripcion"], "");
  const codigoUnsp = get(item, idx, ["Codigo_categoria", "codigo_categoria", "codCategoria"], "");
  const fechaPublicacion = get(item, idx, ["Fecha_publicacion", "fecha_publicacion"], "");
  const fechaManifestacion = get(item, idx, ["Fecha_manifestacion_interes"], "");
  const fechaRecepcion = get(item, idx, ["Fecha_recepcion_respuestas", "fecha_recepcion_respuestas"], "");

  // 🔧 Log para debug cuando analysisStatus cambia
  if (analysisStatus && analysisStatus.estado === 'completado') {
    console.log(`[RESULT_CARD] ${ref} - Estado actualizado: cumple=${analysisStatus.cumple}, porcentaje=${analysisStatus.porcentaje}`);
  }

  const getSourceText = () => (item.from_cache ? 'Base propia' : 'SECOP');

  // Renderizar badge de análisis automático
  const renderAnalysisBadge = () => {
    if (!analysisStatus) {
      return null; // No mostrar nada si no hay análisis iniciado
    }

    switch (analysisStatus.estado) {
      case 'pendiente_analisis':
      case 'pendiente':
        return (
          <span className="result-card-badge-analysis result-card-badge-pending">
            ⏳ Analizando...
          </span>
        );
      
      case 'procesando':
        return (
          <span className="result-card-badge-analysis result-card-badge-processing">
            🔄 Procesando...
          </span>
        );
      
      case 'completado':
        // 🔧 Normalizar cumple: puede ser boolean o número
        const cumpleBool = typeof analysisStatus.cumple === 'number' 
          ? analysisStatus.cumple > 0  // Si es número: true si > 0
          : analysisStatus.cumple;      // Si es boolean: usa directo
        
        const porcentaje = analysisStatus.porcentaje || 0;
        
        if (cumpleBool === true) {
          return (
            <span className="result-card-badge-analysis result-card-badge-match">
              APTO ({getSourceText()})
            </span>
          );
        } else if (cumpleBool === false) {
          return (
            <span className="result-card-badge-analysis result-card-badge-no-match">
              NO APTO ({getSourceText()})
            </span>
          );
        } else {
          // cumple es null - verificar si hay requisitos extraídos (matrices, UNSPSC, experiencia)
          const requisitos = analysisStatus.requisitos || {};
          const source = getSourceText();
          
          const hasMatrices = requisitos.matrices && Object.keys(requisitos.matrices).length > 0;
          const hasIndicadores = requisitos.indicadores_financieros && Object.keys(requisitos.indicadores_financieros).length > 0;
          const hasUNSPSC = requisitos.codigos_unspsc && requisitos.codigos_unspsc.length > 0;
          const hasExperiencia = requisitos.experiencia_requerida && requisitos.experiencia_requerida.experiencia_requerida;
          
          const hasAnyRequisitos = hasMatrices || hasIndicadores || hasUNSPSC || hasExperiencia;
          
          if (hasAnyRequisitos) {
            // Construir texto descriptivo de lo que se encontró
            const items = [];
            if (hasMatrices || hasIndicadores) items.push('Indicadores');
            if (hasUNSPSC) items.push(`${requisitos.codigos_unspsc.length} UNSPSC`);
            if (hasExperiencia) items.push('Experiencia');
            
            return (
              <span className="result-card-badge-analysis result-card-badge-info" title={items.join(' • ')}>
                📊 Con requisitos ({source})
              </span>
            );
          } else {
            return (
              <span className="result-card-badge-analysis result-card-badge-neutral">
                ℹ️ Sin requisitos ({source})
              </span>
            );
          }
        }
      
      case 'error':
        return (
          <span className="result-card-badge-analysis result-card-badge-error">
            ⚠️ Error
          </span>
        );
      
      default:
        return null;
    }
  };

  return (
    <article
      onClick={onClick}
      className={`result-card-container ${isHiding ? 'result-card-hiding' : ''}`}
    >
      <span className="result-card-accent-bar" />
      
      {/* 🗑️ NUEVO: Botón para descartar licitación */}
      <button
        className="result-card-discard-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (onDiscard && !isHiding) {
            // Iniciar animación de fade-out
            setIsHiding(true);
            // Después de la animación (300ms), ejecutar el descarte
            setTimeout(() => {
              onDiscard(item);
            }, 300);
          }
        }}
        title="Descartar licitación (no se mostrará de nuevo)"
        aria-label="Descartar licitación"
      >
        ✕
      </button>

      <header className="result-card-header">
        <h3 className="result-card-title">
          {titulo}
        </h3>

        <div className="result-card-badges">
          {renderAnalysisBadge()}
          <span className="result-card-badge-ref">
            Ref: <span className="result-card-badge-ref-value">{ref}</span>
          </span>
          <span className="result-card-badge-phase">
            {fase}
          </span>
          <span className="result-card-badge-location">
            {dpto} • {ciudad}
          </span>
          {codigoUnsp && (
            <span className="result-card-badge-unsp">
              {codigoUnsp}
            </span>
          )}
        </div>
      </header>

      {descripcion ? (
        <section className="result-card-description">
          <div className="result-card-description-box">
            <p className="result-card-description-text">
              {descripcion}
            </p>
          </div>
        </section>
      ) : null}

      {/* 🗓️ Sección de fechas importantes */}
      {(fechaPublicacion || fechaManifestacion || fechaRecepcion) && (
        <section className="result-card-dates">
          <div className="result-card-dates-grid">
            {fechaPublicacion && (
              <div className="result-card-date-item">
                <span className="result-card-date-label">📅 Publicación:</span>
                <span className="result-card-date-value">{fechaPublicacion}</span>
              </div>
            )}
            {fechaManifestacion && (
              <div className="result-card-date-item">
                <span className="result-card-date-label">📢 Manifestación:</span>
                <span className="result-card-date-value">{fechaManifestacion}</span>
              </div>
            )}
            {fechaRecepcion && (
              <div className="result-card-date-item">
                <span className="result-card-date-label">📬 Recepción:</span>
                <span className="result-card-date-value">{fechaRecepcion}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Detalles del análisis - Mostrar indicadores encontrados */}
      {analysisStatus?.estado === 'completado' && analysisStatus?.requisitos && (
        <section className="result-card-analysis-details">
          {/* Mostrar matrices con indicadores financieros - SIEMPRE visible si existen */}
          {analysisStatus.requisitos.matrices && Object.keys(analysisStatus.requisitos.matrices).length > 0 && (
            <div className="result-card-analysis-section">
              <h4 className="result-card-analysis-title">💰 Indicadores Financieros Encontrados:</h4>
              <div className="result-card-analysis-indicators">
                {Object.entries(analysisStatus.requisitos.matrices).map(([matrizTipo, indicadores]) => (
                  <div key={matrizTipo} className="result-card-matriz-group">
                    {matrizTipo !== 'general' && (
                      <span className="result-card-matriz-label">{matrizTipo}:</span>
                    )}
                    {Object.entries(indicadores).map(([nombre, valor]) => (
                      <span key={nombre} className="result-card-indicator-badge" title={`${nombre}: ${valor}`}>
                        {nombre.replace(/_/g, ' ')}: <strong>{valor}</strong>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mostrar códigos UNSPSC */}
          {analysisStatus.requisitos.codigos_unspsc && analysisStatus.requisitos.codigos_unspsc.length > 0 && (
            <div className="result-card-analysis-section">
              <h4 className="result-card-analysis-title">🏷️ Códigos UNSPSC:</h4>
              <div className="result-card-unspsc-list">
                {analysisStatus.requisitos.codigos_unspsc.slice(0, 5).map((codigo, idx) => (
                  <span key={idx} className="result-card-unspsc-badge">{codigo}</span>
                ))}
                {analysisStatus.requisitos.codigos_unspsc.length > 5 && (
                  <span className="result-card-unspsc-more">
                    +{analysisStatus.requisitos.codigos_unspsc.length - 5} más
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Mostrar experiencia requerida */}
          {analysisStatus.requisitos.experiencia_requerida?.experiencia_requerida && (
            <div className="result-card-analysis-section">
              <h4 className="result-card-analysis-title">👔 Experiencia:</h4>
              <p className="result-card-experience-text">
                {analysisStatus.requisitos.experiencia_requerida.experiencia_requerida}
              </p>
            </div>
          )}

          {/* Mostrar comparación con perfil si cumple es true/false */}
          {analysisStatus.cumple !== null && analysisStatus.detalles && (
            <div className="result-card-analysis-section">
              <h4 className="result-card-analysis-title">
                {analysisStatus.cumple ? '✅ Cumplimiento del perfil:' : '❌ Requisitos no cumplidos:'}
              </h4>
              <div className="result-card-analysis-items">
                {Object.entries(
                  typeof analysisStatus.detalles === 'string' 
                    ? JSON.parse(analysisStatus.detalles) 
                    : analysisStatus.detalles
                ).slice(0, 4).map(([key, val]) => (
                  <div key={key} className="result-card-analysis-item">
                    <span className={`result-card-analysis-icon ${val.cumple ? 'match' : 'no-match'}`}>
                      {val.cumple ? '✓' : '✗'}
                    </span>
                    <span className="result-card-analysis-label">{key}:</span>
                    <span className="result-card-analysis-value">
                      {val.usuario !== null ? val.usuario : 'N/D'} vs {val.requerido}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="result-card-footer">
        <div className="result-card-price"> {precio} Pesos</div>
      </footer>
    </article>
  );
}, (prevProps, nextProps) => {
  // Comparador manual: re-render solo si item o analysisStatus cambian significativamente
  if (prevProps.item?.ID_Portafolio !== nextProps.item?.ID_Portafolio) return false;
  if (prevProps.item?.id_del_portafolio !== nextProps.item?.id_del_portafolio) return false;
  // Comparar analysisStatus por referencia (si cambió, es un nuevo objeto)
  if (prevProps.analysisStatus !== nextProps.analysisStatus) {
    // Pero las properties internas son las mismas
    if (prevProps.analysisStatus?.cumple === nextProps.analysisStatus?.cumple &&
        prevProps.analysisStatus?.estado === nextProps.analysisStatus?.estado) {
      return true; // Props iguales, no renderizar
    }
    return false; // Props distintas, sí renderizar
  }
  return true; // Props iguales, no renderizar
});

export default ResultCard;
