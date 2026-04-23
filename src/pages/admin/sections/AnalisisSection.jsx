import React from "react";

export default function AnalisisSection({ dashboard }) {
  if (!dashboard) return null;

  const errors = dashboard.errors?.recent || [];
  const cache = dashboard.analysis_cache || {};
  const performance = dashboard.performance?.analysis || {};

  const totalAnalisis = cache.total_analisis || 0;
  const completados = cache.completados || 0;
  const sinDocs = cache.sin_documentos || 0;
  const errores = cache.errores || 0;

  const successRate = performance.success_rate_percent || 0;
  const errorRate = performance.error_rate_percent || 0;

  return (
    <div className="admin-section">
      <div className="section-title">
        <h3>Análisis de Licitaciones</h3>
        <p>Estado del caché de análisis y tendencias de rendimiento</p>
      </div>

      {/* KPIs principales */}
      <div className="cards-grid">
        <div className="card">
          <div className="card-label">Total Analizado</div>
          <div className="card-value">{totalAnalisis}</div>
          <div className="card-sub">Licitaciones en el sistema</div>
        </div>

        <div className="card highlight">
          <div className="card-label">Tasa de Éxito</div>
          <div className="card-value">{successRate.toFixed(1)}%</div>
          <div className="card-sub">Completados vs Total</div>
        </div>

        <div className="card">
          <div className="card-label">Tasa de Error</div>
          <div className="card-value" style={{ color: errorRate > 5 ? "#dc2626" : "#27c5ce" }}>
            {errorRate.toFixed(2)}%
          </div>
          <div className="card-sub">Fallos en análisis</div>
        </div>

        <div className="card">
          <div className="card-label">Sin Documentos</div>
          <div className="card-value">{sinDocs}</div>
          <div className="card-sub">Licitaciones sin doc</div>
        </div>
      </div>

      {/* Distribución de resultados */}
      <div className="widget">
        <h3>Distribución de Resultados</h3>
        <p className="widget-sub">Breakdown de estados de análisis</p>
        <div style={{ marginTop: "16px" }}>
          {[
            { label: "Completado", count: completados, color: "#10b981" },
            { label: "Sin Documentos", count: sinDocs, color: "#f59e0b" },
            { label: "Error", count: errores, color: "#ef4444" },
          ].map((item, idx) => {
            const percent = totalAnalisis > 0 ? ((item.count / totalAnalisis) * 100).toFixed(1) : 0;
            return (
              <div key={idx} className="bar-row" style={{ marginBottom: "12px" }}>
                <div className="bar-label">{item.label}</div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${percent}%`, background: item.color }}
                  />
                </div>
                <div className="bar-count">
                  {item.count} ({percent}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Últimos errores */}
      {errors.length > 0 && (
        <div className="widget">
          <h3>Últimos Errores ({errors.length})</h3>
          <p className="widget-sub">Detalle de los fallos más recientes</p>
          <table style={{ marginTop: "12px" }}>
            <thead>
              <tr>
                <th>ID Análisis</th>
                <th>Licitación</th>
                <th>Error</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {errors.slice(0, 10).map((err, idx) => {
                const timestamp = new Date(err.timestamp);
                const timeStr = timestamp.toLocaleTimeString("es-CO");
                return (
                  <tr key={idx}>
                    <td>{err.id}</td>
                    <td>{err.licitacion_id}</td>
                    <td style={{ fontSize: "12px", color: "#666" }}>{err.error}</td>
                    <td>{timeStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
