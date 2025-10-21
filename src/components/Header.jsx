import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SearchForm from "../features/SearchForm.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Header({ chips, onBuscar, onLimpiar }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const hideSearch = pathname === "/preferencias" || isAuthPage;

  const doLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
            🔍 Buscador de proyectos SECOP II
          </h1>

          {!isAuthPage && (
            <div className="flex items-center gap-3">
              {user && (
                <span className="text-sm text-gray-700">
                  {user.name ? `${user.name} · ` : ""}{user.email}
                </span>
              )}

              {pathname !== "/preferencias" ? (
                <Link
                  to="/preferencias"
                  className="px-3 py-1.5 rounded border hover:bg-gray-100 transition text-sm"
                >
                  Preferencias
                </Link>
              ) : (
                <Link
                  to="/"
                  className="px-3 py-1.5 rounded border hover:bg-gray-100 transition text-sm"
                >
                  Volver
                </Link>
              )}

              <button
                onClick={doLogout}
                className="px-3 py-1.5 rounded border hover:bg-gray-100 transition text-sm"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {!hideSearch && (
          <>
            <div className="mt-4">
              <SearchForm onBuscar={onBuscar} onClear={onLimpiar} />
            </div>

            {chips?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map(({ key, label, value }) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-2 text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full"
                  >
                    {label}: <span className="font-medium">{value}</span>
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
