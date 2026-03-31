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

const normalizeCumpleValue = (raw) => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw > 0;
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    if (['1', 'true', 't', 'yes', 'y', 'si', 's'].includes(v)) return true;
    if (['0', 'false', 'f', 'no', 'n'].includes(v)) return false;
    if (!v) return null;
  }
  return null;
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
            
            // 🔧 Función recursiva para buscar todos los indicadores en la estructura JSON
            const findAllIndicators = (obj, depth = 0) => {
              if (depth > 10) return {}; // Prevenir infinite loops
              if (!obj || typeof obj !== 'object') return {};
              
              let found = {};
              
              // Buscar en propiedades conocidas
              const indicatorKeys = ['matrices', 'indicadores_financieros', 'razon', 'detalles'];
              
              for (const key of indicatorKeys) {
                if (obj[key]) {
                  const val = obj[key];
                  
                  // Si es un objeto con indicadores, extraer directamente
                  if ((key === 'indicadores_financieros' || key === 'matrices') && typeof val === 'object') {
                    Object.assign(found, val);
                  }
                  
                  // Si tiene una propiedad .matrices dentro
                  else if (val.matrices && typeof val.matrices === 'object') {
                    const matrices = val.matrices;
                    Object.assign(found, matrices);
                  }
                  
                  // Si es un objeto con propiedades que contienen indicadores (como razon)
                  else if (typeof val === 'object' && Object.keys(val).length > 0) {
                    // Detectar si este objeto contiene indicadores
                    const indicatorEntries = Object.entries(val).filter(([k, v]) => {
                      // Un indicador es un objeto con 'requerido', 'cumple' o valores numéricos
                      return typeof v === 'object' && v !== null && 
                             (v.requerido !== undefined || v.cumple !== undefined || v.usuario !== undefined);
                    });
                    
                    if (indicatorEntries.length > 0) {
                      // Este objeto contiene indicadores, agregarlos a found
                      indicatorEntries.forEach(([name, indicator]) => {
                        found[name] = indicator;
                      });
                    } else {
                      // Si no son indicadores directos, verificar si es un contenedor
                      const isIndicator = Object.values(val).some(v => 
                        (typeof v === 'object' && (v.requerido !== undefined || v.cumple !== undefined)) ||
                        /^[0-9\.,\s><=]+/.test(String(v))
                      );
                      if (isIndicator) {
                        Object.assign(found, val);
                      }
                    }
                  }
                }
              }
              
              // Si no encontramos nada, buscar recursivamente en sub-objetos
              if (Object.keys(found).length === 0) {
                for (const [k, v] of Object.entries(obj)) {
                  if (typeof v === 'object' && v !== null && k !== '_analysisStatus') {
                    const recursive = findAllIndicators(v, depth + 1);
                    if (Object.keys(recursive).length > 0) {
                      Object.assign(found, recursive);
                      break; // Tomar el primer conjunto encontrado
                    }
                  }
                }
              }
              
              return found;
            };
            
            // Opción A: Desde analysisStatus.requisitos
            const req = analysisStatus?.requisitos || {};
            matricesData = findAllIndicators(req);
            
            // Opción B: Si no encontramos en analysisStatus, buscar en item.requisitos_extraidos (datos crudos)
            if ((!matricesData || Object.keys(matricesData).length === 0) && item?.requisitos_extraidos) {
              matricesData = findAllIndicators(item.requisitos_extraidos);
            }
            
            console.log('[ResultCard] 🔍 Búsqueda exhaustiva de indicadores:', { 
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
                    const allComparisons = [];
                    Object.entries(matricesData).forEach(([nombre, valor]) => {
                      let requerido = null;
                      if (typeof valor === 'object' && valor !== null && valor.requerido !== undefined) {
                        requerido = valor.requerido;
                      } else if (typeof valor !== 'object') {
                        requerido = valor;
                      }
                      
                      allComparisons.push({ nombre, requerido });
                    });
                    
                    // Buscar valores del usuario en detalles (con matching canonico)
                    const userValues = {};
                    if (analysisStatus?.detalles) {
                      const detalles = typeof analysisStatus.detalles === 'string' 
                        ? JSON.parse(analysisStatus.detalles) 
                        : analysisStatus.detalles;
                      
                      Object.entries(detalles).forEach(([key, val]) => {
                        if (typeof val === 'object' && val.usuario !== undefined) {
                          userValues[key] = val.usuario;
                        }
                      });
                    }

                    const userValuesIndex = buildIndex(userValues);

                    const compareUserVsRequired = (userRaw, reqRaw) => {
                      if (userRaw === 'N/D' || userRaw === null || userRaw === undefined) return false;

                      const userNum = parseFloat(String(userRaw).replace(',', '.'));
                      if (Number.isNaN(userNum)) return false;

                      const reqText = String(reqRaw ?? '').trim();
                      const match = reqText.match(/(>=|≤|<=|≥|>|<|=)?\s*(-?\d+(?:[.,]\d+)?)/);
                      if (!match) return false;

                      const op = match[1] || '>=';
                      const reqNum = parseFloat(match[2].replace(',', '.'));
                      if (Number.isNaN(reqNum)) return false;

                      if (op === '>=' || op === '≥') return userNum >= reqNum - 0.001;
                      if (op === '>') return userNum > reqNum - 0.001;
                      if (op === '<=' || op === '≤') return userNum <= reqNum + 0.001;
                      if (op === '<') return userNum < reqNum + 0.001;
                      if (op === '=') return Math.abs(userNum - reqNum) <= 0.001;
                      return false;
                    };
                    
                    return allComparisons.map(({ nombre, requerido }, idx) => {
                      const userVal = userValues[nombre] ?? userValuesIndex.get(canon(nombre)) ?? 'N/D';
                      const cumple = compareUserVsRequired(userVal, requerido);
                      const requeridoText = requerido === null || requerido === undefined ? 'N/D' : String(requerido);
                      
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

          {/* Mostrar comparación con perfil si cumple es true/false */}
          {normalizeCumpleValue(analysisStatus.cumple) !== null && analysisStatus.detalles && (
            <div className="result-card-analysis-section">
              <h4 className="result-card-analysis-title">
                {analysisStatus.cumple ? ' Cumplimiento del perfil:' : 'Requisitos no cumplidos:'}
              </h4>
              <div className="result-card-analysis-items">
                {Object.entries(
                  typeof analysisStatus.detalles === 'string' 
                    ? JSON.parse(analysisStatus.detalles) 
                    : analysisStatus.detalles
                )
                  .filter(([key]) => {
                    // 🔧 Filtrar para NO mostrar claves que ya se mostraron en secciones anteriores
                    const lowerKey = key.toLowerCase();
                    // Excluir indicadores financieros (ya están en sección anterior)
                    const isIndicador = lowerKey.includes('cobertura') || 
                                        lowerKey.includes('endeudamiento') ||
                                        lowerKey.includes('liquidez') ||
                                        lowerKey.includes('rentabilidad') ||
                                        lowerKey.includes('matriculado') ||
                                        lowerKey.includes('experiencia');
                    // Excluir UNSPSC (ya están en sección anterior)
                    const isUnspsc = lowerKey.includes('unspsc') || lowerKey.includes('categoria');
                    // Excluir campos innecesarios
                    const isUnnecessary = lowerKey === 'mensaje' || lowerKey === 'regla';
                    return !isIndicador && !isUnspsc && !isUnnecessary;
                  })
                  .slice(0, 4)
                  .map(([key, val]) => (
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
