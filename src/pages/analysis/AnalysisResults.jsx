import React, { useState } from 'react';
import '../../styles/analysis/results.css';

/**
 * Componente para mostrar los resultados del análisis
 * 
 * Props:
 * - outputs: Array de resultados
 * - onBack: Función para volver al formulario
 */
export function AnalysisResults({ outputs = [], onBack }) {
  if (!outputs || outputs.length === 0) {
    return (
      <div className="container">
        <a onClick={onBack} className="back-button">← Volver a Analizar</a>
        <div className="header">
          <h1>📊 Resultados de Análisis</h1>
          <p>No hay resultados para mostrar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <a onClick={onBack} className="back-button">← Volver a Analizar</a>

      <div className="header">
        <h1>📊 Resultados de Análisis</h1>
        <p>Extracción de indicadores financieros, códigos UNSPSC y requisitos de experiencia</p>
      </div>

      {outputs.map((item, idx) => (
        <div key={idx}>
          {!item.ok ? (
            <ResultError item={item} />
          ) : (
            <ResultSuccess item={item} />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Componente para mostrar error o documento descartado
 */
function ResultError({ item }) {
  const isSkipped = item.motivo === 'Documento descartado automáticamente';

  return (
    <div className="file-result">
      <div className={`file-header ${isSkipped ? 'error' : ''}`}>
        <div>
          <div className="file-name">
            {isSkipped ? '⏭️' : '❌'} {item.archivo}
          </div>
        </div>
        <div className="file-badge">
          {isSkipped ? 'DESCARTADO' : 'ERROR'}
        </div>
      </div>
      <div className="file-content">
        {isSkipped ? (
          <div className="skipped-file">
            <div className="skipped-file-name">Razón:</div>
            <div className="skipped-reason">{item.razon || 'Sin especificar'}</div>
          </div>
        ) : (
          <div className="error-message">Error: {item.error || 'Error desconocido'}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Componente para mostrar resultado exitoso
 */
function ResultSuccess({ item }) {
  const resultado = item.resultado || {};
  const indicatorsRaw = resultado.indicadores_financieros || {};
  
  let indicadores = [];
  if (typeof indicatorsRaw === 'object' && !Array.isArray(indicatorsRaw)) {
    indicadores = Object.entries(indicatorsRaw).map(([key, value]) => ({
      nombre: key,
      valor_calculado: value
    }));
  } else if (Array.isArray(indicatorsRaw)) {
    indicadores = indicatorsRaw;
  }

  const unspscRaw = resultado.unspsc_validados || resultado.codigos_unspsc || [];
  const unspsc = Array.isArray(unspscRaw) && unspscRaw.length > 0 && typeof unspscRaw[0] === 'object'
    ? unspscRaw.map(item => item.codigo || item.codigo_unspsc || '')
    : unspscRaw;

  const confInd = resultado.indicadores_confianza || 0;
  const confClass = confInd >= 0.8 ? 'high' : (confInd >= 0.5 ? 'medium' : 'low');
  const expEncontrada = resultado.experiencia_encontrada || false;

  return (
    <div className="file-result">
      <div className="file-header">
        <div>
          <div className="file-name">✅ {item.archivo}</div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>
            {item.tipo || 'DESCONOCIDO'} • {item.paginas_totales || 0} páginas
          </div>
        </div>
        <div className="file-badge">PROCESADO</div>
      </div>

      <div className="file-content">
        {/* Vista previa del texto */}
        <div className="section">
          <div className="section-title">📄 Vista Previa del Texto Extraído</div>
          <div className="text-preview-label">Primeros caracteres del documento:</div>
          <div className="text-preview">
            {item.context_snippet || 'No hay fragmento disponible'}
          </div>
          <div className="text-preview-truncated">
            ... [fragmento de {(item.context_snippet || '').length} caracteres]
          </div>
        </div>

        {/* Indicadores Financieros */}
        <div className="section">
          <div className="section-title">
            💰 Indicadores Financieros
            <span className={`confidence ${confClass}`}>
              {Math.round(confInd * 100)}%
            </span>
          </div>

          {indicadores.length > 0 ? (
            indicadores.map((ind, idx) => (
              <div key={idx} className="indicator-item">
                <div className="indicator-name">{ind.nombre}</div>
                <div className="indicator-field">
                  <div>
                    <label>Fórmula:</label>
                    <span>{ind.formula_o_descripcion || 'Calculado del documento'}</span>
                  </div>
                  <div>
                    <label>Valor:</label>
                    <span>{ind.valor_calculado || 'N/A'}</span>
                  </div>
                </div>
                <div className="indicator-field">
                  <div>
                    <label>Margen:</label>
                    <span>{ind.margen_solicitado || 'N/A'}</span>
                  </div>
                  <div>
                    <label>Página:</label>
                    <span>{ind.pagina_referencia || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">No se encontraron indicadores financieros</div>
          )}
        </div>

        {/* Códigos UNSPSC */}
        <div className="section">
          <div className="section-title">🏷️ Códigos UNSPSC</div>
          {unspsc.length > 0 ? (
            <div className="unspsc-codes">
              {unspsc.map((code, idx) => (
                <div key={idx} className="unspsc-badge">{code}</div>
              ))}
            </div>
          ) : (
            <div className="no-data">No se encontraron códigos UNSPSC</div>
          )}
        </div>

        {/* Experiencia Requerida */}
        {expEncontrada && (
          <div className="section">
            <div className="section-title">
              👨‍💼 Requisitos de Experiencia
              <span className={`confidence ${resultado.experiencia_confianza >= 0.8 ? 'high' : 'medium'}`}>
                {Math.round((resultado.experiencia_confianza || 0) * 100)}%
              </span>
            </div>
            <div className="experience-section">
              <div className="experience-title">Descripción:</div>
              <div className="experience-text">
                {resultado.experiencia_requerida || 'No especificada'}
              </div>

              <div className="experience-fields">
                {resultado.experiencia_anos_minimos && (
                  <div className="experience-field">
                    <label>Años de Experiencia</label>
                    <span>{resultado.experiencia_anos_minimos}</span>
                  </div>
                )}

                {resultado.experiencia_certificaciones_requeridas && (
                  <div className="experience-field">
                    <label>Certificaciones</label>
                    <span>{resultado.experiencia_certificaciones_requeridas}</span>
                  </div>
                )}

                {resultado.experiencia_valor_minimo_smmlv && (
                  <div className="experience-field">
                    <label>Valor Mínimo (SMMLV)</label>
                    <span>{resultado.experiencia_valor_minimo_smmlv}</span>
                  </div>
                )}

                {resultado.experiencia_tipos_proyectos && (
                  <div className="experience-field">
                    <label>Tipos de Proyectos</label>
                    <span>{resultado.experiencia_tipos_proyectos}</span>
                  </div>
                )}

                {resultado.experiencia_sector && (
                  <div className="experience-field">
                    <label>Sector</label>
                    <span>{resultado.experiencia_sector}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
