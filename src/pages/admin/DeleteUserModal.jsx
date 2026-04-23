import React from "react";

export default function DeleteUserModal({ open, user, onClose, onConfirm, loading, error }) {
  if (!open || !user) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Eliminar Usuario</h2>
        <p className="admin-modal-subtitle">Esta accion no se puede deshacer</p>

        <p className="admin-delete-email">{user.email}</p>

        <div className="admin-delete-warning">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <p>
            Se eliminaran permanentemente las suscripciones, palabras clave, licitaciones
            guardadas y analisis asociados a este usuario.
          </p>
        </div>

        {error ? <p className="admin-form-error">{error}</p> : null}

        <div className="admin-modal-actions">
          <button type="button" className="admin-btn-cancel" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="admin-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Eliminando..." : "Eliminar Usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}
