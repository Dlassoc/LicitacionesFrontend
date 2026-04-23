import React, { useEffect, useState } from "react";

import { isValidEmail } from "../../utils/commonHelpers.js";

function validateForm({ email, name, password }) {
  if (!isValidEmail(email)) return "El correo no es valido.";
  if (!String(name || "").trim()) return "El nombre es obligatorio.";
  if (String(password || "").length < 8) return "La contrasena debe tener al menos 8 caracteres.";
  return null;
}

export default function CreateUserModal({ open, onClose, onSubmit, loading, error }) {
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    is_mypyme: false,
    is_superadmin: false,
  });
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        email: "",
        name: "",
        password: "",
        is_mypyme: false,
        is_superadmin: false,
      });
      setLocalError("");
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLocalError("");

    const validationError = validateForm(form);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    await onSubmit({
      email: String(form.email || "").trim().toLowerCase(),
      name: String(form.name || "").trim(),
      password: form.password,
      is_mypyme: !!form.is_mypyme,
      is_superadmin: !!form.is_superadmin,
    });
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Crear Usuario</h2>
        <p className="admin-modal-subtitle">Agrega un nuevo usuario a la plataforma</p>

        <form onSubmit={submit}>
          <div className="admin-form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="usuario@ejemplo.com"
            />
          </div>

          <div className="admin-form-group">
            <label>Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre completo"
            />
          </div>

          <div className="admin-form-group">
            <label>Contrasena</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Minimo 8 caracteres"
            />
          </div>

          <div className="admin-form-toggle-row">
            <span>Es MiPyme?</span>
            <button
              type="button"
              className={`admin-toggle ${form.is_mypyme ? "active" : ""}`}
              onClick={() => setForm((prev) => ({ ...prev, is_mypyme: !prev.is_mypyme }))}
              aria-label="Toggle MiPyme"
            />
          </div>

          <div className="admin-form-toggle-row">
            <span>Conceder rol de superadmin?</span>
            <button
              type="button"
              className={`admin-toggle ${form.is_superadmin ? "active" : ""}`}
              onClick={() => setForm((prev) => ({ ...prev, is_superadmin: !prev.is_superadmin }))}
              aria-label="Toggle superadmin"
            />
          </div>

          {localError ? <p className="admin-form-error">{localError}</p> : null}
          {!localError && error ? <p className="admin-form-error">{error}</p> : null}

          <div className="admin-modal-actions">
            <button type="button" className="admin-btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn-primary" disabled={loading}>
              {loading ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
