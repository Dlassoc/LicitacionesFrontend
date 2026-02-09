// src/components/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SearchForm from "../features/SearchForm.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import logo from "../assets/logo_emergente.png";
import "../styles/global/header.css";

export default function Header({ chips, onBuscar, onLimpiar }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const hideSearch = pathname.startsWith("/app/preferences") || isAuthPage;
  const isPreferencesPage = pathname.startsWith("/app/preferences");

  // mostrar "Inicio" en el menú solo si NO estamos en /app
  const showMenuHome = pathname !== "/app";

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpenMenu(false);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const doLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const initial = (user?.name || user?.email || "U").trim()[0]?.toUpperCase();

  return (
    <div className="header-bar">
      <div className="header-inner">
        <div className="header-row">
          {/* Logo marca */}
          <Link to={isAuthPage ? "/login" : "/app"} className="brand-wrap" aria-label="Inicio">
            <img src={logo} alt="Emergente" className="brand-logo" />
          </Link>

          {/* Acciones (no visibles en login/register) */}
          {!isAuthPage && (
            <div className="header-actions">
              <ThemeToggle />

              {user && <span className="user-chip">{user.name ? user.name : user.email}</span>}

              {/* Avatar + menú tipo YouTube */}
              <div className="user-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="avatar-btn"
                  aria-haspopup="menu"
                  aria-expanded={openMenu}
                  onClick={() => setOpenMenu((v) => !v)}
                >
                  <span aria-hidden="true">{initial}</span>
                </button>

                {openMenu && (
                  <div className="user-menu" role="menu" aria-label="Menú de usuario">
                    <ul className="menu-list">
                      {!isPreferencesPage && (
                        <li>
                          <Link
                            to="/app/preferences"
                            className="menu-item"
                            role="menuitem"
                            onClick={() => setOpenMenu(false)}
                          >
                            Preferencias
                          </Link>
                        </li>
                      )}

                      {showMenuHome && (
                        <li>
                          <Link
                            to="/app"
                            className="menu-item"
                            role="menuitem"
                            onClick={() => setOpenMenu(false)}
                          >
                            Inicio
                          </Link>
                        </li>
                      )}

                      <li>
                        <Link
                          to="/app/saved"
                          className="menu-item"
                          role="menuitem"
                          onClick={() => setOpenMenu(false)}
                        >
                            Excluidas
                        </Link>
                      </li>

                      <li className="menu-sep" role="separator" />

                      <li>
                        <button
                          type="button"
                          className="menu-item danger"
                          role="menuitem"
                          onClick={doLogout}
                        >
                          Cerrar sesión
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Buscador y chips (ocultos en preferencias y auth) */}
        {!hideSearch && (
          <>
            <div className="search-section">
              <div className="search-wrap-container collapsed">
                <div className="search-trigger">
                  <span className="search-arrow">∨</span> Mostrar búsqueda
                </div>
                <div className="search-wrap">
                  <SearchForm onBuscar={onBuscar} onClear={onLimpiar} />
                </div>
              </div>
            </div>

            {chips?.length > 0 && (
              <div className="chips-wrap">
                {chips.map(({ key, label, value }) => (
                  <span key={key} className="chip">
                    {label}: <span className="chip-value">{value}</span>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
