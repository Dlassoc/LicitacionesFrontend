import React from "react";

function toHoursMinutes(minutes) {
  if (minutes == null) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export default function ColaSection({ dashboard }) {
  if (!dashboard) return null;

  const queue = dashboard.queue || {};
  const errors = dashboard.errors || {};
  const counts = queue.counts || {};

  const totalQueue = queue.total || 0;
  const pendingTotal = queue.pending_total || 0;
  const processingTotal = queue.processing_total || 0;
  const oldestMinutes = queue.oldest_pending_minutes;

  const errorBreakdown = errors.breakdown || {};
  const totalErrors = errors.breakdown ? Object.values(errors.breakdown).reduce((a, b) => a + b, 0) : 0;

  // Calcula velocidad promedio: items completados en 24h / 24 horas
  const analysis = dashboard.performance?.analysis || {};
  const throughputPerHour = analysis.throughput_terminal_per_hour || 0;

  return (
    <div className="admin-section">
      <div className="section-title">
        <h3>Detalles de la Cola de Procesamiento</h3>
        <p>Estado actual y tendencias de velocidad</p>
      </div>

      {/* KPIs principales */}
      <div className="cards-grid">
        <div className="card">
          <div className="card-label">Items en Cola</div>
          <div className="card-value">{totalQueue}</div>
          <div className="card-sub">Total en el sistema</div>
        </div>

        <div className="card highlight">
          <div className="card-label">Pendientes</div>
          <div className="card-value">{pendingTotal}</div>
          <div className="card-sub">Esperando procesamiento</div>
        </div>

        <div className="card">
          <div className="card-label">Procesando</div>
          <div className="card-value">{processingTotal}</div>
          <div className="card-sub">En ejecución ahora</div>
        </div>

        <div className="card">
          <div className="card-label">Velocidad</div>
          <div className="card-value">{throughputPerHour.toFixed(1)}</div>
          <div className="card-sub">items/hora (24h)</div>
        </div>
      </div>

      {/* Item más antiguo */}
      <div className="widget">
        <h3>Item Más Antiguo en Espera</h3>
        <p className="widget-sub">Tiempo que lleva el item más antiguo sin procesar</p>
        <div style={{ fontSize: "32px", fontWeight: "700", color: oldestMinutes >= 45 ? "#dc2626" : "#27c5ce", marginTop: "12px" }}>
          {toHoursMinutes(oldestMinutes)}
        </div>
      </div>

      {/* Breakdown de estados */}
      <div className="widget">
        <h3>Distribución de Estados</h3>
        <p className="widget-sub">Desglose de items por estado actual</p>
        <div style={{ marginTop: "16px" }}>
          {[
            { key: "completado", label: "Completado", color: "#10b981" },
            { key: "sin_documentos", label: "Sin Documentos", color: "#f59e0b" },
            { key: "procesando", label: "Procesando", color: "#3b82f6" },
            { key: "pendiente", label: "Pendiente", color: "#6b7280" },
            { key: "no_iniciado", label: "No Iniciado", color: "#d1d5db" },
            { key: "error", label: "Error", color: "#ef4444" },
          ].map((item) => {
            const count = counts[item.key] || 0;
            const percent = totalQueue > 0 ? ((count / totalQueue) * 100).toFixed(1) : 0;
            return (
              <div key={item.key} className="bar-row" style={{ marginBottom: "12px" }}>
                <div className="bar-label">{item.label}</div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${percent}%`, background: item.color }}
                  />
                </div>
                <div className="bar-count">
                  {count} ({percent}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desglose de errores */}
      {totalErrors > 0 && (
        <div className="widget">
          <h3>Tipos de Errores</h3>
          <p className="widget-sub">Categorización de fallos en el procesamiento</p>
          <div style={{ marginTop: "16px" }}>
            {Object.entries(errorBreakdown).map(([type, count]) => {
              const percent = totalErrors > 0 ? ((count / totalErrors) * 100).toFixed(1) : 0;
              const labels = {
                timeout: "Timeout",
                parsing: "Error de Parsing",
                api_externa: "API Externa",
                database: "Base de Datos",
                connection: "Conexión",
                otro: "Otro",
              };
              return (
                <div key={type} className="bar-row" style={{ marginBottom: "12px" }}>
                  <div className="bar-label">{labels[type] || type}</div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${percent}%`,
                        background: "#ef4444",
                      }}
                    />
                  </div>
                  <div className="bar-count">
                    {count} ({percent}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
