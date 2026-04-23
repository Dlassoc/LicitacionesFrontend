import React, { useEffect, useMemo, useState } from "react";

const LEVEL_OPTIONS = ["", "ERROR", "WARNING", "INFO", "DEBUG"];

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function levelClass(level) {
  const normalized = String(level || "").toLowerCase();
  if (normalized === "error") return "error";
  if (normalized === "warning") return "warning";
  if (normalized === "info") return "info";
  return "neutral";
}

export default function LogsView({
  items,
  loading,
  error,
  filters,
  stats,
  page,
  totalPages,
  onApplyFilters,
  onRefresh,
  onPageChange,
}) {
  const [draftLevel, setDraftLevel] = useState(filters?.level || "");
  const [draftModule, setDraftModule] = useState(filters?.module || "");
  const [draftQuery, setDraftQuery] = useState(filters?.q || "");

  useEffect(() => {
    setDraftLevel(filters?.level || "");
    setDraftModule(filters?.module || "");
    setDraftQuery(filters?.q || "");
  }, [filters]);

  const [selectedLogId, setSelectedLogId] = useState("");

  useEffect(() => {
    if (!items?.length) {
      setSelectedLogId("");
      return;
    }
    if (!items.some((row) => row.id === selectedLogId)) {
      setSelectedLogId(items[0].id);
    }
  }, [items, selectedLogId]);

  const selectedLog = useMemo(
    () => items.find((row) => row.id === selectedLogId) || null,
    [items, selectedLogId]
  );

  return (
    <div className="admin-view admin-logs-view">
      <div className="admin-view-header">
        <h2>Logs del Sistema</h2>
        <p className="admin-view-description">
          Monitoreo de eventos para diagnosticar fallos por modulo, nivel y mensaje.
        </p>
      </div>

      <section className="admin-logs-summary-row">
        <div className="admin-stat-card">
          <div className="label">Total filtrado</div>
          <div className="value">{stats?.total || 0}</div>
          <div className="sub">Eventos en la consulta actual</div>
        </div>

        <div className="admin-stat-card">
          <div className="label">Errores</div>
          <div className="value">{stats?.levelCounts?.ERROR || 0}</div>
          <div className="sub">Nivel ERROR en el filtro</div>
        </div>

        <div className="admin-stat-card">
          <div className="label">Warnings</div>
          <div className="value">{stats?.levelCounts?.WARNING || 0}</div>
          <div className="sub">Nivel WARNING en el filtro</div>
        </div>
      </section>

      <section className="admin-main-grid admin-logs-grid">
        <div className="admin-main-column">
          <div className="admin-toolbar admin-logs-toolbar">
            <select
              className="admin-logs-select"
              value={draftLevel}
              onChange={(event) => setDraftLevel(event.target.value)}
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "Todos los niveles"}
                </option>
              ))}
            </select>

            <input
              type="text"
              className="admin-logs-input"
              placeholder="Filtrar por modulo (ej: jobs.scheduler)"
              value={draftModule}
              onChange={(event) => setDraftModule(event.target.value)}
            />

            <input
              type="text"
              className="admin-logs-input"
              placeholder="Buscar en mensaje o exception"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
            />

            <button
              type="button"
              className="admin-btn-primary"
              onClick={() => {
                onApplyFilters({ level: draftLevel, module: draftModule, q: draftQuery });
              }}
            >
              Aplicar
            </button>

            <button type="button" className="admin-btn-secondary" onClick={onRefresh}>
              Actualizar
            </button>
          </div>

          {error ? <div className="admin-inline-error">{error}</div> : null}

          <div className="admin-table-wrapper">
            <table className="admin-table admin-logs-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Nivel</th>
                  <th>Modulo</th>
                  <th>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="admin-empty-row">Cargando logs...</td>
                  </tr>
                ) : null}

                {!loading && items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-empty-row">
                      No hay eventos para los filtros actuales.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? items.map((row) => (
                      <tr
                        key={row.id}
                        className={selectedLogId === row.id ? "is-selected" : ""}
                        onClick={() => setSelectedLogId(row.id)}
                      >
                        <td>{formatDate(row.created_at)}</td>
                        <td>
                          <span className={`admin-log-level ${levelClass(row.level)}`}>{row.level}</span>
                        </td>
                        <td>{row.logger}</td>
                        <td className="admin-log-message-cell">{row.message}</td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <div className="info">Pagina {page} de {totalPages}</div>
            <div className="admin-page-btns">
              <button
                type="button"
                className="admin-page-btn"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
              >
                &lsaquo;
              </button>
              <span className="admin-page-pill">{page}</span>
              <button
                type="button"
                className="admin-page-btn"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
              >
                &rsaquo;
              </button>
            </div>
          </div>
        </div>

        <aside className="admin-side-panel admin-log-detail-panel">
          <div className="admin-side-header">
            <h3>Detalle del evento</h3>
            <p>Selecciona una fila para ver contexto tecnico completo.</p>
          </div>

          {!selectedLog ? (
            <div className="admin-side-placeholder">No hay evento seleccionado.</div>
          ) : (
            <div className="admin-log-detail-body">
              <dl className="admin-health-metrics admin-log-detail-metrics">
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatDate(selectedLog.created_at)}</dd>
                </div>
                <div>
                  <dt>Nivel</dt>
                  <dd>{selectedLog.level}</dd>
                </div>
                <div>
                  <dt>Logger</dt>
                  <dd>{selectedLog.logger || "-"}</dd>
                </div>
                <div>
                  <dt>Funcion</dt>
                  <dd>
                    {selectedLog.function || "-"}
                    {selectedLog.line ? `:${selectedLog.line}` : ""}
                  </dd>
                </div>
              </dl>

              <div className="admin-log-detail-block">
                <h4>Mensaje</h4>
                <pre>{selectedLog.message || "-"}</pre>
              </div>

              <div className="admin-log-detail-block">
                <h4>Exception / Stack</h4>
                <pre>{selectedLog.exception || "Sin traceback."}</pre>
              </div>

              <div className="admin-log-detail-block">
                <h4>Path</h4>
                <pre>{selectedLog.pathname || "-"}</pre>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
