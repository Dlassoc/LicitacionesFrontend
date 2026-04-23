import React from "react";

function formatDuration(seconds) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default function SyncSecopySection({ dashboard }) {
  if (!dashboard) return null;

  const sync = dashboard.sync || {};
  const lastRun = sync.last_run;
  const recentRuns = sync.recent_runs || [];
  const stats24h = sync.stats_24h || {};

  const totalRuns24h = stats24h.total_runs || 0;
  const successRuns24h = stats24h.success_runs || 0;
  const successRate24h = stats24h.success_rate_percent || 0;
  const itemsTotal24h = stats24h.items_upserted_total || 0;
  const minutesSinceLastRun = sync.minutes_since_last_run;

  return (
    <div className="admin-section">
      <div className="section-title">
        <h3>Sincronización SECOP</h3>
        <p>Importación de licitaciones nuevas y actualizaciones</p>
      </div>

      {/* KPIs principales */}
      <div className="cards-grid">
        <div className="card">
          <div className="card-label">Sincronizaciones (24h)</div>
          <div className="card-value">{totalRuns24h}</div>
          <div className="card-sub">Corridas completadas</div>
        </div>

        <div className="card highlight">
          <div className="card-label">Tasa de Éxito (24h)</div>
          <div className="card-value">{successRate24h.toFixed(1)}%</div>
          <div className="card-sub">
            {successRuns24h} / {totalRuns24h} exitosas
          </div>
        </div>

        <div className="card">
          <div className="card-label">Items Procesados (24h)</div>
          <div className="card-value">{itemsTotal24h}</div>
          <div className="card-sub">Nuevos + Actualizados</div>
        </div>

        <div className="card">
          <div className="card-label">Última Sincronización</div>
          <div className="card-value">
            {minutesSinceLastRun != null
              ? minutesSinceLastRun === 0
                ? "Ahora"
                : minutesSinceLastRun < 60
                ? `${minutesSinceLastRun}m`
                : `${Math.floor(minutesSinceLastRun / 60)}h`
              : "—"}
          </div>
          <div className="card-sub">Tiempo desde último run</div>
        </div>
      </div>

      {/* Última corrida */}
      {lastRun && (
        <div className="widget">
          <h3>Última Sincronización</h3>
          <p className="widget-sub">Detalles de la corrida más reciente</p>
          <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#666" }}>Estado</div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: lastRun.status === "success" ? "#10b981" : "#ef4444",
                  marginTop: "4px",
                }}
              >
                {lastRun.status === "success" ? "✓ Éxito" : "✗ Error"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#666" }}>Duración</div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#27c5ce", marginTop: "4px" }}>
                {formatDuration(lastRun.duration_seconds)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#666" }}>Items Procesados</div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#27c5ce", marginTop: "4px" }}>
                {lastRun.items_upserted}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#666" }}>Velocidad</div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#27c5ce", marginTop: "4px" }}>
                {(lastRun.items_per_minute || 0).toFixed(1)} items/min
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de corridas */}
      {recentRuns.length > 0 && (
        <div className="widget">
          <h3>Histórico de Sincronizaciones</h3>
          <p className="widget-sub">Últimas {Math.min(recentRuns.length, 8)} corridas</p>
          <table style={{ marginTop: "12px" }}>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Hora</th>
                <th>Duración</th>
                <th>Items</th>
                <th>Velocidad</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run, idx) => {
                const startTime = new Date(run.started_at);
                const timeStr = startTime.toLocaleTimeString("es-CO");
                const statusColor = run.status === "success" ? "#10b981" : "#ef4444";
                return (
                  <tr key={idx}>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: statusColor,
                          marginRight: "6px",
                        }}
                      />
                      {run.status === "success" ? "Éxito" : "Error"}
                    </td>
                    <td>{timeStr}</td>
                    <td>{formatDuration(run.duration_seconds)}</td>
                    <td>{run.items_upserted}</td>
                    <td>{(run.items_per_minute || 0).toFixed(1)} items/min</td>
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
