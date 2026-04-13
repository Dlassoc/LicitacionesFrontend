// app/auth/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../config/httpClient.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Hidratar sesión (cookie)
  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet('/auth/me');
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Registro de usuario
  async function register({ email, name, password, is_mypyme }) {
    await apiPost('/auth/register', { email, name, password, is_mypyme });
    const me = await apiGet('/auth/me');
    setUser(me);
  }

  // Inicio de sesión
  async function login({ email, password }) {
    await apiPost('/auth/login', { email, password });
    const me = await apiGet('/auth/me');
    setUser(me);
  }

  // Cierre de sesión
  async function logout() {
    await apiPost('/auth/logout');
    setUser(null);
  }

  // Actualizar usuario
  async function updateUser(updatedUser) {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  }

  // Contexto global
  const value = useMemo(() => ({
    user,
    ready,
    register,
    login,
    logout,
    updateUser,
  }), [user, ready]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
