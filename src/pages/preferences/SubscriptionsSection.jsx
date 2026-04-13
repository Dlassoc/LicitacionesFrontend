import React from "react";

export default function SubscriptionsSection({
  subs, loadingSubs, isActive, deactivate,
}) {
  return (
    <div className="preferences-sub-list">
      <h4 className="preferences-sub-title">Tus suscripciones</h4>

      {loadingSubs ? (
        <p className="preferences-loading-text">Cargando suscripciones…</p>
      ) : subs.length === 0 ? (
        <p className="preferences-loading-text">
          No tienes suscripciones activas. Guarda preferencias de búsqueda para crear una.
        </p>
      ) : (
        <ul>
          {subs.map((s) => (
            <li key={s.id} className="preferences-sub-item">
              <div>
                <div className="preferences-sub-item-name">
                  {s.palabras_clave}{" "}
                  {s.departamento ? `• ${s.departamento}` : ""}{" "}
                  {s.ciudad ? `• ${s.ciudad}` : ""}
                </div>
                <div className="preferences-sub-item-meta">
                  Último envío: {s.last_notified_at || "—"} • Activa:{" "}
                  {s.is_active ? "Sí" : "No"}
                </div>
              </div>
              {s.is_active ? (
                <button
                  onClick={() => deactivate(s.id)}
                  className="preferences-sub-item-button"
                  disabled={!isActive}
                >
                  Desactivar
                </button>
              ) : (
                <span className="preferences-sub-item-meta">Inactiva</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
