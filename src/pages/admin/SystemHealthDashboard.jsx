import React, { useMemo, useState } from "react";
import ColaSection from "./sections/ColaSection.jsx";
import AnalisisSection from "./sections/AnalisisSection.jsx";
import SyncSecopySection from "./sections/SyncSecopySection.jsx";
import OperacionesSection from "./sections/OperacionesSection.jsx";

const SECTION_ITEMS = [
  { id: "overview", label: "Resumen" },
  { id: "queue", label: "Cola" },
  { id: "analysis", label: "Analisis" },
  { id: "sync", label: "Sync SECOP" },
  { id: "operations", label: "Operaciones" },
];

const QUEUE_ORDER = [
  "pendiente",
  "no_iniciado",
  "procesando",
  "completado",
  "sin_documentos",
  "error",
];

const QUEUE_LABELS = {
  pendiente: "Pendiente",
  no_iniciado: "No iniciado",
  procesando: "Procesando",
  completado: "Completado",
  sin_documentos: "Sin documentos",
  error: "Error",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value) {
  return toNumber(value, 0).toLocaleString("es-CO");
}

function formatPercent(value, decimals = 2) {
  if (value == null) return "-";
  return `${toNumber(value, 0).toFixed(decimals)}%`;
}

function formatSeconds(value) {
  if (value == null) return "-";
  const seconds = Math.max(0, Math.round(toNumber(value, 0)));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem > 0 ? `${minutes}m ${rem}s` : `${minutes}m`;
}

function formatMinutes(value) {
  if (value == null) return "-";
  const minutes = Math.max(0, Math.round(toNumber(value, 0)));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function healthLabel(status) {
  if (status === "green") return "Estable";
  if (status === "red") return "Critico";
  return "Atencion";
}

function healthClassName(status) {
  if (status === "green") return "ok";
  if (status === "red") return "critical";
  return "warning";
}

function runStatusClass(status) {
  if (status === "success") return "ok";
  if (status === "error") return "critical";
  if (status === "running") return "warning";
  return "neutral";
}

function runStatusLabel(status) {
  if (status === "success") return "Exito";
  if (status === "error") return "Error";
  if (status === "running") return "Ejecutando";
  return "Sin dato";
}

function defaultChartFormatter(value) {
  return formatNumber(value);
}

function MetricItem({ label, value, meta }) {
  return (
    <div className="admin-health-kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-meta">{meta}</div>
    </div>
  );
}

function QueueRow({ label, value, total }) {
  const safeTotal = toNumber(total, 0);
  const safeValue = toNumber(value, 0);
  const width = safeTotal > 0 ? Math.max((safeValue / safeTotal) * 100, safeValue > 0 ? 2 : 0) : 0;

  return (
    <div className="admin-health-queue-row">
      <div className="queue-label">{label}</div>
      <div className="queue-bar-wrap">
        <div className="queue-bar" style={{ width: `${Math.min(width, 100)}%` }} />
      </div>
      <div className="queue-value">{formatNumber(safeValue)}</div>
    </div>
  );
}

function SimpleBarsChart({ items, maxValue, formatter = defaultChartFormatter }) {
  const safeMax = Math.max(toNumber(maxValue, 0), 1);

  return (
    <div className="admin-health-bars-chart">
      {items.map((item) => {
        const value = toNumber(item.value, 0);
        const width = clamp((value / safeMax) * 100, 0, 100);

        return (
          <div className="admin-health-bar-row" key={item.key || item.label}>
            <div className="bar-label">{item.label}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.max(width, value > 0 ? 2 : 0)}%` }} />
            </div>
            <div className="bar-value">{formatter(value)}</div>
          </div>
        );
      })}
    </div>
  );
}

function SparklineChart({ values, color = "#27c5ce" }) {
  const safeValues = Array.isArray(values) ? values.map((value) => toNumber(value, 0)) : [];

  if (safeValues.length === 0) {
    return <div className="admin-sparkline-empty">Sin datos para graficar.</div>;
  }

  const width = 240;
  const height = 74;
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const span = Math.max(max - min, 1);

  const points = safeValues.map((value, index) => {
    const x = safeValues.length === 1 ? width / 2 : (index * width) / (safeValues.length - 1);
    const y = height - ((value - min) / span) * height;
    return `${x},${y}`;
  });

  const lastPoint = points[points.length - 1].split(",");
  const cx = Number(lastPoint[0]);
  const cy = Number(lastPoint[1]);

  return (
    <div className="admin-health-sparkline-wrap">
      <svg
        className="admin-health-sparkline"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Tendencia"
      >
        <polyline fill="none" stroke={color} strokeWidth="3" points={points.join(" ")} />
        <circle cx={cx} cy={cy} r="4" fill={color} />
      </svg>
    </div>
  );
}

function GaugeMeter({ label, value, tone = "teal", suffix = "%", decimals = 1 }) {
  const safeValue = clamp(toNumber(value, 0), 0, 100);

  return (
    <div className="admin-health-gauge-row">
      <div className="admin-health-gauge-head">
        <span>{label}</span>
        <strong>
          {safeValue.toFixed(decimals)}
          {suffix}
        </strong>
      </div>
      <div className="admin-health-gauge-track">
        <div className={`admin-health-gauge-fill ${tone}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export default function SystemHealthDashboard({
  dashboard,
  loading,
  refreshing,
  error,
  onRefresh,
}) {
  const [activeSection, setActiveSection] = useState("overview");

  const health = dashboard?.health || {};
  const queue = dashboard?.queue || {};
  const performance = dashboard?.performance || {};
  const analysisPerformance = performance?.analysis || {};
  const syncPerformance = performance?.sync || {};
  const backendPerformance = performance?.backend || {};
  const secopCache = dashboard?.secop_cache || {};
  const analysisCache = dashboard?.analysis_cache || {};
  const sync = dashboard?.sync || {};
  const subscriptions = dashboard?.subscriptions || {};
  const notifications = dashboard?.notifications || {};

  const queueCounts = useMemo(() => {
    const rawCounts = queue?.counts || {};
    const known = QUEUE_ORDER.map((state) => ({
      state,
      label: QUEUE_LABELS[state],
      value: toNumber(rawCounts[state], 0),
    }));

    const extras = Object.keys(rawCounts)
      .filter((key) => !QUEUE_ORDER.includes(key))
      .map((state) => ({
        state,
        label: state,
        value: toNumber(rawCounts[state], 0),
      }));

    return [...known, ...extras];
  }, [queue]);

  const healthReasons = Array.isArray(health?.reasons) ? health.reasons : [];
  const healthWarnings = Array.isArray(health?.warnings) ? health.warnings : [];

  const lastRun = sync?.last_run || null;
  const lastRunStatus = lastRun?.status || "unknown";
  const lastSyncAge = sync?.minutes_since_last_run;
  const recentRuns = Array.isArray(sync?.recent_runs) ? sync.recent_runs : [];

  const queueChartItems = useMemo(
    () =>
      queueCounts.map((item) => ({
        key: item.state,
        label: item.label,
        value: item.value,
      })),
    [queueCounts]
  );

  const queueChartMax = useMemo(
    () => Math.max(...queueChartItems.map((item) => toNumber(item.value, 0)), 1),
    [queueChartItems]
  );

  const syncRunsChronological = useMemo(() => [...recentRuns].reverse(), [recentRuns]);

  const syncUpsertValues = useMemo(
    () => syncRunsChronological.map((run) => toNumber(run.items_upserted, 0)),
    [syncRunsChronological]
  );

  const syncDurationValues = useMemo(
    () => syncRunsChronological.map((run) => toNumber(run.duration_seconds, 0)),
    [syncRunsChronological]
  );

  const analysisDistributionItems = [
    { key: "completed", label: "Completados", value: analysisCache?.completados || 0 },
    { key: "no_docs", label: "Sin documentos", value: analysisCache?.sin_documentos || 0 },
    { key: "errors", label: "Errores", value: analysisCache?.errores || 0 },
  ];

  const analysisDistributionMax = Math.max(
    ...analysisDistributionItems.map((item) => toNumber(item.value, 0)),
    1
  );

  const cacheDistributionItems = [
    { key: "cache_valid", label: "Cache valido", value: secopCache?.valid_entries || 0 },
    { key: "cache_expired", label: "Cache expirado", value: secopCache?.expired_entries || 0 },
  ];

  const cacheDistributionMax = Math.max(...cacheDistributionItems.map((item) => toNumber(item.value, 0)), 1);

  const notificationsItems = [
    { key: "notified", label: "Aptas notificadas", value: notifications?.notified || 0 },
    { key: "pending", label: "Aptas por notificar", value: notifications?.pending_notify || 0 },
    { key: "recent", label: "Aptas 24h", value: notifications?.recent_24h || 0 },
  ];

  const notificationsMax = Math.max(...notificationsItems.map((item) => toNumber(item.value, 0)), 1);

  return (
    <section className="admin-health-section">
      <div className="admin-health-header">
        <div>
          <h2>Salud y rendimiento del sistema</h2>
          <p>Monitoreo de cola, sincronizacion SECOP, cache y throughput operativo.</p>
        </div>

        <div className="admin-health-actions">
          <span className={`admin-health-pill ${healthClassName(health?.status)}`}>
            {healthLabel(health?.status)}
          </span>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={onRefresh}
            disabled={refreshing || loading}
          >
            {refreshing || loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      <nav className="admin-health-menu" aria-label="Apartados del dashboard">
        {SECTION_ITEMS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`admin-health-menu-btn ${activeSection === section.id ? "active" : ""}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className="admin-health-meta-row">
        <span>Ultima lectura: {formatDateTime(dashboard?.generated_at)}</span>
        <span>Ultimo sync: {lastSyncAge == null ? "sin ejecucion" : `hace ${formatMinutes(lastSyncAge)}`}</span>
        <span className={`admin-inline-pill ${runStatusClass(lastRunStatus)}`}>
          Sync: {runStatusLabel(lastRunStatus)}
        </span>
      </div>

      {error ? <div className="admin-health-inline-error">{error}</div> : null}

      {loading && !dashboard ? <div className="admin-health-loading">Cargando metricas...</div> : null}

      {dashboard ? (
        <>
          {activeSection === "overview" ? (
            <>
              <div className="admin-health-kpi-grid">
                <MetricItem
                  label="Cola total"
                  value={formatNumber(queue?.total)}
                  meta={`${formatNumber(queue?.pending_total)} pendientes`}
                />
                <MetricItem
                  label="Error analisis"
                  value={formatPercent(analysisPerformance?.error_rate_percent, 1)}
                  meta={`24h: ${formatPercent(analysisPerformance?.error_rate_24h_percent, 1)}`}
                />
                <MetricItem
                  label="Throughput terminal"
                  value={`${toNumber(analysisPerformance?.throughput_terminal_per_hour, 0).toFixed(2)}/h`}
                  meta="Promedio ultimas 24h"
                />
                <MetricItem
                  label="Sync SECOP exito"
                  value={formatPercent(syncPerformance?.success_rate_24h_percent, 1)}
                  meta={`${formatNumber(syncPerformance?.total_runs_24h)} corridas en 24h`}
                />
              </div>

              <div className="admin-health-grid">
                <article className="admin-health-card">
                  <h3>Grafica de estados de cola</h3>
                  <p className="sub">Visual rapido de la carga por estado.</p>
                  <SimpleBarsChart items={queueChartItems} maxValue={queueChartMax} />
                  <div className="admin-health-card-foot">
                    Pendiente mas antiguo: {formatMinutes(queue?.oldest_pending_minutes)}
                  </div>
                </article>

                <article className="admin-health-card">
                  <h3>Tendencia de upserts SECOP</h3>
                  <p className="sub">Ultimas corridas de sincronizacion (orden cronologico).</p>
                  <SparklineChart values={syncUpsertValues} color="#27c5ce" />
                  <div className="admin-health-inline-stats">
                    <div className="admin-health-inline-stat">
                      <span>Ultimo run</span>
                      <strong>{formatNumber(lastRun?.items_upserted)}</strong>
                    </div>
                    <div className="admin-health-inline-stat">
                      <span>Duracion</span>
                      <strong>{formatSeconds(lastRun?.duration_seconds)}</strong>
                    </div>
                    <div className="admin-health-inline-stat">
                      <span>Items/min</span>
                      <strong>
                        {syncPerformance?.last_items_per_minute == null
                          ? "-"
                          : toNumber(syncPerformance?.last_items_per_minute, 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </article>
              </div>
            </>
          ) : null}

          {activeSection === "queue" ? (
            <div className="admin-health-grid">
              <article className="admin-health-card">
                <h3>Distribucion de cola</h3>
                <p className="sub">Carga por estado de procesamiento.</p>
                <SimpleBarsChart items={queueChartItems} maxValue={queueChartMax} />
                <div className="admin-health-queue-list">
                  {queueCounts.map((item) => (
                    <QueueRow
                      key={item.state}
                      label={item.label}
                      value={item.value}
                      total={queue?.total}
                    />
                  ))}
                </div>
              </article>

              <article className="admin-health-card">
                <h3>Indicadores de presion</h3>
                <p className="sub">Semaforos de saturacion y latencia.</p>
                <div className="admin-health-gauges">
                  <GaugeMeter
                    label="Queue pressure"
                    value={analysisPerformance?.queue_pressure_percent}
                    tone="teal"
                  />
                  <GaugeMeter
                    label="Share procesando"
                    value={analysisPerformance?.processing_share_percent}
                    tone="blue"
                  />
                  <GaugeMeter
                    label="Error rate"
                    value={analysisPerformance?.error_rate_percent}
                    tone="red"
                  />
                </div>
                <div className="admin-health-card-foot">
                  Pendiente mas antiguo: {formatMinutes(queue?.oldest_pending_minutes)}
                </div>
              </article>
            </div>
          ) : null}

          {activeSection === "analysis" ? (
            <AnalisisSection dashboard={dashboard} />
          ) : null}

          {activeSection === "sync" ? (
            <SyncSecopySection dashboard={dashboard} />
          ) : null}

          {activeSection === "operations" ? (
            <OperacionesSection dashboard={dashboard} />
          ) : null}

          {healthReasons.length > 0 ? (
            <div className="admin-health-notes">
              <h4>Resumen de salud</h4>
              <ul>
                {healthReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {healthWarnings.length > 0 ? (
            <div className="admin-health-notes warning">
              <h4>Advertencias de lectura</h4>
              <ul>
                {healthWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
