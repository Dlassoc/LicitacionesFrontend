import React from "react";

const ADMIN_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: "chart" },
  { id: "logs", label: "Logs", icon: "logs" },
  { id: "usuarios", label: "Usuarios", icon: "users" },
];

function renderIcon(iconType) {
  switch (iconType) {
    case "chart":
      return (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 3v18h18" />
          <path d="M18 17V9M13 17v-5M8 17v-3" />
        </svg>
      );
    case "users":
      return (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case "logs":
      return (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h10" />
          <circle cx="19" cy="18" r="2" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AdminSidebar({ activeView, onViewChange, collapsed, onToggleCollapse }) {
  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        className="admin-sidebar-toggle-mobile"
        onClick={onToggleCollapse}
        aria-label="Toggle sidebar"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="admin-sidebar-header">
          <h3>Menú Admin</h3>
          <button
            type="button"
            className="admin-sidebar-close-mobile"
            onClick={onToggleCollapse}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {ADMIN_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`admin-sidebar-item ${activeView === section.id ? "active" : ""}`}
              onClick={() => {
                onViewChange(section.id);
              }}
            >
              <span className="icon">{renderIcon(section.icon)}</span>
              <span className="label">{section.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="admin-sidebar-overlay"
          onClick={onToggleCollapse}
          role="presentation"
        />
      )}
    </>
  );
}
