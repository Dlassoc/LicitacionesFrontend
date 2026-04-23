import React from "react";

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

export default function UserTable({
  users,
  loading,
  onViewKeywords,
  onDeleteUser,
  selectedEmail,
}) {
  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>MiPyme</th>
            <th>Rol</th>
            <th>Fecha de registro</th>
            <th>Keywords</th>
            <th className="right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="6" className="admin-empty-row">
                Cargando usuarios...
              </td>
            </tr>
          ) : null}

          {!loading && users.length === 0 ? (
            <tr>
              <td colSpan="6" className="admin-empty-row">
                No hay usuarios para mostrar.
              </td>
            </tr>
          ) : null}

          {!loading &&
            users.map((user) => {
              const initial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();

              return (
                <tr key={user.email} className={selectedEmail === user.email ? "is-selected" : ""}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar">{initial}</div>
                      <div>
                        <div className="admin-user-name">{user.name || "Sin nombre"}</div>
                        <div className="admin-user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className={`admin-badge ${user.is_mypyme ? "teal" : "gray"}`}>
                      {user.is_mypyme ? "Si" : "No"}
                    </span>
                  </td>

                  <td>
                    <span className={`admin-badge ${user.is_superadmin ? "orange" : "gray"}`}>
                      {user.is_superadmin ? "Superadmin" : "Usuario"}
                    </span>
                  </td>

                  <td>{formatDate(user.created_at)}</td>

                  <td>
                    <span className="admin-badge teal">{user.keyword_count || 0} keywords</span>
                  </td>

                  <td>
                    <div className="admin-actions right">
                      <button
                        type="button"
                        className="admin-icon-btn"
                        title="Ver keywords"
                        onClick={() => onViewKeywords(user)}
                      >
                        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="admin-icon-btn danger"
                        title="Eliminar usuario"
                        onClick={() => onDeleteUser(user)}
                      >
                        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
