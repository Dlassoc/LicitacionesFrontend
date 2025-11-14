// app/auth/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "../config/api.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // ============================
  //   Hidratar sesión (cookie)
  // ============================
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_ENDPOINTS.AUTH_ME, { credentials: "include" });
        if (res.ok) setUser(await res.json());
        else setUser(null);
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // ============================
  //   Registro de usuario
  // ============================
  async function register({ email, name, password }) {
    const res = await fetch(API_ENDPOINTS.REGISTER, {
      method: "POST",
      credentials: "include", // importante para usar cookies HttpOnly
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    if (!res.ok) throw new Error("No se pudo registrar");

    // Obtener sesión actual
    const me = await (await fetch(API_ENDPOINTS.AUTH_ME, { credentials: "include" })).json();
    setUser(me);
  }

  // ============================
  //   Inicio de sesión
  // ============================
  async function login({ email, password }) {
    const res = await fetch(API_ENDPOINTS.LOGIN, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("No se pudo iniciar sesión");

    const me = await (await fetch(API_ENDPOINTS.AUTH_ME, { credentials: "include" })).json();
    setUser(me);
  }

  // ============================
  //   Cierre de sesión
  // ============================
  async function logout() {
    await fetch(API_ENDPOINTS.LOGOUT, { method: "POST", credentials: "include" });
    setUser(null);
  }

  // ============================
  //   Contexto global
  // ============================
  const value = useMemo(() => ({
    user,
    ready,
    register,
    login,
    logout,
  }), [user, ready]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
