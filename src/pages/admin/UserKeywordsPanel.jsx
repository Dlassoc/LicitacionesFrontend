import React from "react";

function splitKeywords(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function makeActionKey(subscriptionId, keyword) {
  return `${subscriptionId}:${String(keyword || "").trim().toLowerCase()}`;
}

export default function UserKeywordsPanel({
  user,
  subscriptions,
  loading,
  error,
  onRemoveKeyword,
  removingKeywordKey,
}) {
  const title = user ? `Suscripciones de ${user.name || user.email}` : "Panel de keywords";

  return (
    <aside className="admin-side-panel">
      <div className="admin-side-header">
        <h3>{title}</h3>
        <p>
          {user
            ? "Gestiona keywords por suscripcion."
            : "Selecciona un usuario para revisar y editar sus keywords."}
        </p>
      </div>

      {!user ? <div className="admin-side-placeholder">No hay usuario seleccionado.</div> : null}
      {user && loading ? <div className="admin-side-placeholder">Cargando suscripciones...</div> : null}
      {user && !loading && error ? <div className="admin-side-error">{error}</div> : null}

      {user && !loading && !error && subscriptions.length === 0 ? (
        <div className="admin-side-placeholder">Este usuario no tiene suscripciones.</div>
      ) : null}

      {user && !loading && !error
        ? subscriptions.map((sub) => {
            const keywords = Array.isArray(sub.keywords)
              ? sub.keywords
              : splitKeywords(sub.palabras_clave);

            return (
              <div className={`admin-subscription-card ${sub.is_active ? "" : "inactive"}`} key={sub.id}>
                <div className="admin-sub-header">
                  <span className="admin-sub-title">Suscripcion #{sub.id}</span>
                  <span className={`admin-sub-status ${sub.is_active ? "active" : "inactive"}`}>
                    {sub.is_active ? "Activa" : "Inactiva"}
                  </span>
                </div>

                <div className="admin-sub-meta">
                  <span>
                    <strong>Ubicacion:</strong> {sub.ciudad || "-"}, {sub.departamento || "-"}
                  </span>
                  <span>
                    <strong>Desde:</strong> {formatDate(sub.fecha_inicio)}
                  </span>
                  <span>
                    <strong>Hasta:</strong> {formatDate(sub.fecha_fin)}
                  </span>
                </div>

                {keywords.length === 0 ? (
                  <p className="admin-no-keywords">Sin keywords configuradas.</p>
                ) : (
                  <div className="admin-keywords-list">
                    {keywords.map((keyword) => {
                      const actionKey = makeActionKey(sub.id, keyword);
                      const isRemoving = removingKeywordKey === actionKey;

                      return (
                        <span className="admin-keyword-pill" key={actionKey}>
                          {keyword}
                          <button
                            type="button"
                            className="admin-keyword-remove"
                            title="Eliminar keyword"
                            onClick={() => onRemoveKeyword(sub.id, keyword)}
                            disabled={isRemoving}
                          >
                            {isRemoving ? "..." : "x"}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        : null}
    </aside>
  );
}
