import React from "react";
import UserTable from "./UserTable.jsx";
import UserKeywordsPanel from "./UserKeywordsPanel.jsx";

export default function UsersView({
  users,
  loading,
  error,
  search,
  onSearchChange,
  pagedUsers,
  currentPage,
  totalPages,
  onPageChange,
  onViewKeywords,
  selectedUser,
  subscriptions,
  subscriptionsLoading,
  subscriptionsError,
  onRemoveKeyword,
  removingKeywordKey,
  onCreateClick,
  onDeleteClick,
}) {
  return (
    <div className="admin-view admin-users-view">
      <div className="admin-view-header">
        <h2>Gestión de Usuarios</h2>
        <p className="admin-view-description">Administración de cuentas y suscripciones</p>
      </div>

      <section className="admin-main-grid">
        <div className="admin-main-column">
          <div className="admin-toolbar">
            <div className="admin-search-box">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por email o nombre..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            <button type="button" className="admin-btn-primary" onClick={onCreateClick}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Crear Usuario
            </button>
          </div>

          {error ? <div className="admin-inline-error">{error}</div> : null}

          <UserTable
            users={pagedUsers}
            loading={loading}
            onViewKeywords={onViewKeywords}
            onDeleteUser={onDeleteClick}
            selectedEmail={selectedUser?.email}
          />

          <div className="admin-pagination">
            <div className="info">
              Mostrando {users.length === 0 ? 0 : (currentPage - 1) * 8 + 1} -
              {" "}
              {Math.min(currentPage * 8, users.length)} de {users.length} usuarios
            </div>

            <div className="admin-page-btns">
              <button
                type="button"
                className="admin-page-btn"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                &lsaquo;
              </button>

              <span className="admin-page-pill">{currentPage}</span>

              <button
                type="button"
                className="admin-page-btn"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                &rsaquo;
              </button>
            </div>
          </div>
        </div>

        <UserKeywordsPanel
          user={selectedUser}
          subscriptions={subscriptions}
          loading={subscriptionsLoading}
          error={subscriptionsError}
          onRemoveKeyword={onRemoveKeyword}
          removingKeywordKey={removingKeywordKey}
        />
      </section>
    </div>
  );
}
