import React from "react";

export default function OperacionesSection({ dashboard }) {
  if (!dashboard) return null;

  const backend = dashboard.performance?.backend || {};
  const notifications = dashboard.notifications || {};
  const cache = dashboard.secop_cache || {};

  const dbMs = backend.db_queries_ms || 0;
  const cacheMs = backend.secop_cache_ms || 0;
  const totalMs = backend.total_compute_ms || 0;

  const totalAptas = notifications.total_aptas || 0;
  const notified = notifications.notified || 0;
  const pendingNotify = notifications.pending_notify || 0;
  const recent24h = notifications.recent_24h || 0;

  const cacheValid = cache.valid_entries || 0;
  const cacheExpired = cache.expired_entries || 0;
  const cacheTotal = cache.total_entries || 0;
  const validRatio = cache.valid_ratio_percent || 0;

  // Evaluar salud del caché
  const cacheHealth = validRatio >= 80 ? "green" : validRatio >= 50 ? "yellow" : "red";
  const cacheHealthLabel =
    cacheHealth === "green" ? "Óptimo" : cacheHealth === "yellow" ? "Degradado" : "Crítico";

  return (
    <div className="admin-section">
      <div className="section-title">
        <h3>Operaciones del Sistema</h3>
        <p>Latencias, caché y estado de servicios dependientes</p>
      </div>

      {/* KPIs principales */}
      <div className="cards-grid">
        <div className="card">
          <div className="card-label">Latencia BD</div>
          <div className="card-value">{dbMs.toFixed(0)}ms</div>
          <div className="card-sub">Consultas DB</div>
        </div>

        <div className="card">
          <div className="card-label">Latencia Caché SECOP</div>
          <div className="card-value">{cacheMs.toFixed(0)}ms</div>
          <div className="card-sub">Operaciones caché</div>
        </div>

        <div className="card highlight">
          <div className="card-label">Total Dashboard</div>
          <div className="card-value">{totalMs.toFixed(0)}ms</div>
          <div className="card-sub">Tiempo de cálculo</div>
        </div>

        <div className="card">
          <div className="card-label">Alertas Pendientes</div>
          <div className="card-value">{pendingNotify}</div>
          <div className="card-sub">Por enviar</div>
        </div>
      </div>

      {/* Estado de Caché */}
      <div className="widget">
        <h3>Estado del Caché SECOP</h3>
        <p className="widget-sub">Validez y cobertura de los términos en caché</p>
        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>Salud del Caché</div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "700",
                color:
                  cacheHealth === "green"
                    ? "#10b981"
                    : cacheHealth === "yellow"
                    ? "#f59e0b"
                    : "#ef4444",
              }}
            >
              {cacheHealthLabel}
            </div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              {validRatio.toFixed(1)}% válido
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>Distribución</div>
            <div style={{ fontSize: "14px", marginTop: "8px" }}>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ fontWeight: "600", color: "#10b981" }}>Válido:</span> {cacheValid} ({validRatio.toFixed(1)}%)
              </div>
              <div>
                <span style={{ fontWeight: "600", color: "#ef4444" }}>Expirado:</span> {cacheExpired} ({((cacheExpired / cacheTotal) * 100).toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="widget">
        <h3>Notificaciones a Usuarios</h3>
        <p className="widget-sub">Estado de alertas enviadas</p>
        <div style={{ marginTop: "16px" }}>
          {[
            { label: "Total de Licitaciones Aptas", value: totalAptas, color: "#6b7280" },
            { label: "Notificadas", value: notified, color: "#10b981" },
            { label: "Pendientes de Envío", value: pendingNotify, color: "#f59e0b" },
            { label: "Últimas 24h", value: recent24h, color: "#3b82f6" },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: idx < 3 ? "1px solid #f1f5f9" : "none",
              }}
            >
              <span style={{ color: "#475569" }}>{item.label}</span>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: item.color,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota de rendimiento */}
      <div style={{ marginTop: "16px", padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px" }}>
        <div style={{ fontSize: "12px", color: "#78350f", fontWeight: "600", marginBottom: "4px" }}>
          ℹ️ Información de Rendimiento
        </div>
        <div style={{ fontSize: "12px", color: "#78350f", lineHeight: "1.6" }}>
          El dashboard se carga y cálcula en <strong>{totalMs.toFixed(0)}ms</strong>. Las consultas a base de datos toman{" "}
          <strong>{dbMs.toFixed(0)}ms</strong>, el caché SECOP <strong>{cacheMs.toFixed(0)}ms</strong>.
        </div>
      </div>
    </div>
  );
}
