import React, { useEffect } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext.jsx";
import logo from "../../assets/logo_emergente.png";
import "../../styles/pages/admin-panel.css";

export default function AdminLayout({ children }) {
  const { user } = useAuth();

  useEffect(() => {
    const prevTheme = document.documentElement.getAttribute("data-theme");
    const prevColorScheme = document.documentElement.style.colorScheme;

    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.style.colorScheme = "light";

    return () => {
      if (prevTheme) {
        document.documentElement.setAttribute("data-theme", prevTheme);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      document.documentElement.style.colorScheme = prevColorScheme || "light";
    };
  }, []);

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <img src={logo} alt="Emergente" className="admin-topbar-logo" />
          <div>
            <h1 className="admin-title">
              Panel de <span>Administracion</span>
            </h1>
            <p className="admin-subtitle">{user?.name || user?.email || "Superadmin"}</p>
          </div>
        </div>

        <Link to="/app" className="admin-btn-back">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Volver a la app
        </Link>
      </header>

      <main className="admin-content">{children}</main>
    </div>
  );
}
