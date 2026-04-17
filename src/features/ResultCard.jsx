import React, { useMemo, memo, useState } from "react";
import { normalizeCumpleValue } from "../utils/commonHelpers.js";
import { canon, buildIndex } from "../utils/documentHelpers.js";
import { devLog } from "../utils/devLog.js";
import {
  buildIndicatorComparisons,
  findAllIndicators,
  formatCOP,
  getFromIndex,
  getUrlProceso,
} from "./resultCard/helpers.js";
import "../styles/features/result-card.css";

// 🔧 RE-HABILITADO: memo() con comparador manual para props correcamente
const ResultCard = memo(function ResultCard({ item = {}, onClick, analysisStatus, onDiscard }) {
  const [isHiding, setIsHiding] = useState(false);
  const idx = useMemo(() => buildIndex(item), [item]);

  const urlResuelto = getUrlProceso(item);

  const titulo = getFromIndex(item, idx, ["Entidad", "nombre_entidad", "entidad", "nombreEntidad"], "Entidad no especificada");
  const fase = getFromIndex(item, idx, ["Fase", "Estado", "fase", "estado"], "No disponible");
  const ref = getFromIndex(item, idx, ["Referencia_del_proceso", "Referencia_del_contrato", "Proceso_de_compra", "ID_contrato", "referencia", "id_contrato"], "No disponible");
  const dpto = getFromIndex(item, idx, ["Departamento_de_la_entidad", "Departamento", "departamento_de_la_entidad", "departamento"], "Departamento N/D");
  const ciudad = getFromIndex(item, idx, ["Ciudad_entidad", "Ciudad", "ciudad_entidad", "ciudad"], "Ciudad N/D");
  const precioVal = getFromIndex(item, idx, ["Precio_base", "precio_base", "cuantia", "valor", "valor_contrato", "valor_estimado"], null);
  const precio = precioVal ? formatCOP(precioVal) : "Cuantía no especificada";
  const descripcion = getFromIndex(item, idx, ["Descripcion", "descripcion"], "");
  const codigoUnsp = getFromIndex(item, idx, ["Codigo_categoria", "codigo_categoria", "codCategoria"], "");
  const fechaPublicacion = getFromIndex(item, idx, ["Fecha_publicacion", "fecha_publicacion"], "");
  const fechaManifestacion = getFromIndex(item, idx, ["Fecha_manifestacion_interes"], "");
  const fechaRecepcion = getFromIndex(item, idx, ["Fecha_recepcion_respuestas", "fecha_recepcion_respuestas"], "");

  // 🔧 Log para debug cuando analysisStatus cambia
  if (analysisStatus && analysisStatus.estado === 'completado') {
    devLog(`[RESULT_CARD] ${ref} - Estado actualizado: cumple=${analysisStatus.cumple}, porcentaje=${analysisStatus.porcentaje}`);
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
        const cumpleBool = normalizeCumpleValue(analysisStatus.cumple);
        
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
          
          // 🔧 Buscar indicadores en ambas ubicaciones (matrices e indicadores_financieros)
          const matricesObj = requisitos.matrices || requisitos.indicadores_financieros || {};
          const hasMatrices = Object.keys(matricesObj).length > 0;
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
          <span 
            className="result-card-badge-analysis result-card-badge-error"
            onClick={(e) => {
              e.stopPropagation();
              // Reintentar análisis automáticamente (no requiere click)
              if (onClick) onClick();
            }}
            title="Reintentando automáticamente..."
            style={{ cursor: 'pointer' }}
          >
            Error
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
                <span className="result-card-date-label"> Publicación:</span>
                <span className="result-card-date-value">{fechaPublicacion}</span>
              </div>
            )}
            {fechaManifestacion && (
              <div className="result-card-date-item">
                <span className="result-card-date-label">Manifestación:</span>
                <span className="result-card-date-value">{fechaManifestacion}</span>
              </div>
            )}
            {fechaRecepcion && (
              <div className="result-card-date-item">
                <span className="result-card-date-label"> Recepción:</span>
                <span className="result-card-date-value">{fechaRecepcion}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Detalles del análisis - Mostrar indicadores encontrados */}
      {analysisStatus?.estado === 'completado' && (analysisStatus?.requisitos || item?.requisitos_extraidos) && (
        <section className="result-card-analysis-details">
          {/* Mostrar matrices con indicadores financieros - AGRUPADOS HORIZONTALES */}
          {/* 🔧 Buscar en TODAS las posibles ubicaciones de indicadores - desde analysisStatus O directamente del item */}
          {(() => {
            let matricesData = null;

            // Opción A: Desde analysisStatus.requisitos
            const req = analysisStatus?.requisitos || {};
            matricesData = findAllIndicators(req);
            
            // Opción B: Si no encontramos en analysisStatus, buscar en item.requisitos_extraidos (datos crudos)
            if ((!matricesData || Object.keys(matricesData).length === 0) && item?.requisitos_extraidos) {
              matricesData = findAllIndicators(item.requisitos_extraidos);
            }
            
            devLog('[ResultCard] 🔍 Búsqueda exhaustiva de indicadores:', { 
              matricesData, 
              hasReq: !!req, 
              hasRawReq: !!item?.requisitos_extraidos,
              rawReqKeys: item?.requisitos_extraidos ? Object.keys(item.requisitos_extraidos) : [],
              razonField: item?.requisitos_extraidos?.razon,
              razonKeys: item?.requisitos_extraidos?.razon ? Object.keys(item.requisitos_extraidos.razon) : []
            });
            
            return matricesData && Object.keys(matricesData).length > 0 ? (
              <div className="result-card-analysis-section">
                <h4 className="result-card-analysis-title">Indicadores Financieros:</h4>
                <div className="result-card-analysis-indicators">
                  {(() => {
                    const comparisons = buildIndicatorComparisons(matricesData, analysisStatus?.detalles);

                    return comparisons.map(({ nombre, requeridoText, userVal, cumple }, idx) => {
                      
                      return (
                        <span
                          key={idx}
                          className={`result-card-indicator-badge ${cumple ? 'result-card-indicator-badge-match' : 'result-card-indicator-badge-no-match'}`}
                          title={`${nombre}: requerido ${requeridoText} | perfil ${userVal}`}
                        >
                          {nombre.replace(/_/g, ' ')}: <strong>{requeridoText}</strong>  
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : null;
          })()}

          {/* Mostrar códigos UNSPSC */}
          {analysisStatus.requisitos.codigos_unspsc && analysisStatus.requisitos.codigos_unspsc.length > 0 && (
            <div className="result-card-analysis-section">
              <h4 className="result-card-analysis-title">Códigos UNSPSC:</h4>
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
  // IMPORTANTE: cuando cambia analysisStatus, aunque cumpla/estado sean iguales,
  // pueden haber llegado requisitos/detalles nuevos (indicadores) y hay que re-renderizar.
  if (prevProps.analysisStatus !== nextProps.analysisStatus) return false;
  return true;
});

export default ResultCard;
